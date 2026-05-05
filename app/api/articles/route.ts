import { createClient } from '@/lib/supabase/server'

const COLS = 'id,title,url,description,published_at,relevance_score,ai_summary,is_read,is_saved,tags,note,feed_id,feeds(title)'
const PAGE_SIZE = 40

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const savedOnly = searchParams.get('saved') === 'true'
  const feedId = searchParams.get('feed_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const offset = (page - 1) * PAGE_SIZE

  // Pre-fetch user's feed IDs so Postgres can use the index instead of applying RLS row-by-row
  let feedIds: string[] = []
  if (!feedId) {
    const { data: feeds } = await supabase.from('feeds').select('id').eq('user_id', user.id)
    feedIds = (feeds ?? []).map((f) => f.id as string)
    if (!feedIds.length) return Response.json({ articles: [], page })
  }

  let query = supabase.from('articles').select(COLS)

  if (feedId) {
    query = query.eq('feed_id', feedId).order('published_at', { ascending: false })
  } else if (savedOnly) {
    query = query.in('feed_id', feedIds).eq('is_saved', true)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false })
  } else {
    query = query.in('feed_id', feedIds)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('published_at', { ascending: false })
  }

  query = query.range(offset, offset + PAGE_SIZE - 1)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ articles: data, page })
}
