import { createClient } from '@/lib/supabase/server'
import { publishFeedJob } from '@/lib/qstash/scheduler'
import { detectFeedUrl } from '@/lib/rss/detect'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data, error }, { data: unreadRows }] = await Promise.all([
    supabase
      .from('feeds')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('articles')
      .select('feed_id')
      .eq('is_read', false),
  ])

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Count unread per feed client-side (one query, no N+1)
  const unreadMap = new Map<string, number>()
  for (const row of unreadRows ?? []) {
    const id = row.feed_id as string
    unreadMap.set(id, (unreadMap.get(id) ?? 0) + 1)
  }

  const feeds = (data ?? []).map((f) => ({ ...f, unread_count: unreadMap.get(f.id as string) ?? 0 }))

  return Response.json({ feeds })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    url: string
    title?: string
    feed_type?: string
    topic_query?: string
  }
  const { title, feed_type = 'manual', topic_query } = body
  let { url } = body

  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  // Auto-detect RSS URL if user pasted a website URL instead of a feed URL
  try {
    url = await detectFeedUrl(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 422 })
  }

  const { data: feed, error } = await supabase
    .from('feeds')
    .insert({ user_id: user.id, url, title, feed_type, topic_query })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  publishFeedJob(feed.id as string).catch((err) =>
    console.error('Failed to publish feed job:', err)
  )

  return Response.json({ feed }, { status: 201 })
}
