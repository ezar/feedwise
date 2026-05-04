import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const savedOnly = searchParams.get('saved') === 'true'
  const feedId = searchParams.get('feed_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = 40
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('articles')
    .select('*, feeds(title)')

  if (feedId) {
    // Feed detail: all articles for this feed, ordered by date
    query = query
      .eq('feed_id', feedId)
      .order('published_at', { ascending: false })
  } else {
    // Main feed: all articles, best score first
    query = query
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false })
  }

  query = query.range(offset, offset + pageSize - 1)

  if (savedOnly) {
    query = query.eq('is_saved', true)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ articles: data, page })
}
