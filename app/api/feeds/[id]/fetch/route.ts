import { createClient } from '@/lib/supabase/server'
import { parseRSSFeed } from '@/lib/rss/parser'
import { scoreArticle } from '@/lib/ai/scorer'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: feed, error } = await supabase
    .from('feeds')
    .select('*, user_profile!inner(interests)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !feed) return Response.json({ error: 'Feed not found' }, { status: 404 })

  const items = await parseRSSFeed(feed.url as string)
  let processed = 0

  for (const item of items) {
    const { data: article } = await supabase
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
      .select('id, ai_processed')
      .single()

    if (!article || article.ai_processed) continue

    const profile = feed.user_profile as { interests: string } | null
    const interests = profile?.interests ?? ''
    if (!interests) continue

    const { score, summary } = await scoreArticle(item, interests)
    await supabase
      .from('articles')
      .update({ relevance_score: score, ai_summary: summary, ai_processed: true })
      .eq('id', article.id)

    processed++
  }

  await supabase
    .from('feeds')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', feed.id)

  return Response.json({ ok: true, total: items.length, processed })
}
