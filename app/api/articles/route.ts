import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const minScore = parseInt(searchParams.get('min_score') ?? '0')
  const savedOnly = searchParams.get('saved') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 40
  const offset = (page - 1) * pageSize

  const { data: profile } = await supabase
    .from('user_profile')
    .select('threshold')
    .eq('id', user.id)
    .single()

  const threshold = profile?.threshold ?? 50
  const scoreFilter = Math.max(minScore, threshold)

  let query = supabase
    .from('articles')
    .select('*, feeds(title)')
    .or(`relevance_score.gte.${scoreFilter},relevance_score.is.null`)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (savedOnly) {
    query = query.eq('is_saved', true)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ articles: data, page, threshold })
}
