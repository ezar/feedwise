import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json({ articles: [] })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('articles')
    .select('*, feeds!inner(title, user_id)')
    .eq('feeds.user_id', user.id)
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(60)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ articles: data ?? [], query: q })
}
