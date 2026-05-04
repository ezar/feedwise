import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseRSSFeed } from '@/lib/rss/parser'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: feed, error } = await supabase
    .from('feeds')
    .select('id, url, user_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !feed) return Response.json({ error: 'Feed not found' }, { status: 404 })

  const service = createServiceClient()

  let items
  try {
    items = await parseRSSFeed(feed.url as string)
    await service.from('feeds').update({ last_error: null }).eq('id', feed.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await service
      .from('feeds')
      .update({ last_fetched_at: new Date().toISOString(), last_error: msg })
      .eq('id', feed.id)
    return Response.json({ error: msg }, { status: 422 })
  }

  const results = await Promise.all(
    items.map((item) =>
      service.from('articles').upsert(
        {
          feed_id: feed.id,
          guid: item.guid,
          title: item.title,
          url: item.url,
          description: item.description,
          published_at: item.publishedAt,
        },
        { onConflict: 'guid', ignoreDuplicates: true }
      )
    )
  )
  const inserted = results.filter((r) => !r.error).length

  await service
    .from('feeds')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', feed.id)

  return Response.json({ ok: true, total: items.length, inserted })
}
