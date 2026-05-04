import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const feedId = searchParams.get('feed_id')

  let query = supabase
    .from('articles')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false)

  // RLS already scopes to user's feeds; optionally narrow to one feed
  if (feedId) query = query.eq('feed_id', feedId)

  const { error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
