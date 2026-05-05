import { createClient } from '@/lib/supabase/server'

const COLS = 'id,title,url,description,published_at,relevance_score,ai_summary,is_read,is_saved,tags,note,feed_id,feeds(title)'
const PAGE_SIZE = 100

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const savedOnly = searchParams.get('saved') === 'true'
  const unreadOnly = searchParams.get('unread') === 'true'
  const feedId = searchParams.get('feed_id')
  const offset = parseInt(searchParams.get('offset') ?? '0')

  let query = supabase.from('articles').select(COLS)

  if (feedId) {
    query = query.eq('feed_id', feedId).order('published_at', { ascending: false })
  } else {
    query = query
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false })
  }

  if (savedOnly) query = query.eq('is_saved', true)
  if (unreadOnly) query = query.eq('is_read', false)

  query = query.range(offset, offset + PAGE_SIZE - 1)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ articles: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE })
}
