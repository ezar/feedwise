import { createClient } from '@/lib/supabase/server'
import { parseRSSFeed } from '@/lib/rss/parser'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: feeds } = await supabase
    .from('feeds')
    .select('id, url')
    .eq('user_id', user.id)

  if (!feeds?.length) return Response.json({ ok: true, total: 0, inserted: 0 })

  let totalInserted = 0

  await Promise.allSettled(
    feeds.map(async (feed) => {
      const items = await parseRSSFeed(feed.url as string)
      for (const item of items) {
        const { error } = await supabase
          .from('articles')
          .upsert(
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
        if (!error) totalInserted++
      }
      await supabase
        .from('feeds')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', feed.id)
    })
  )

  return Response.json({ ok: true, total: feeds.length, inserted: totalInserted })
}
