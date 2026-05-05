import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
    .select('id, url, user_id, user_profile!inner(interests, threshold, locale)')
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

  const upserted = await Promise.all(
    items.map((item) =>
      service
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
        .select('id, ai_processed, title, description, url')
        .single()
        .then((r) => r.data)
    )
  )

  type ProfileRow = { interests: string; threshold?: number; locale?: string }
  const rawProfile = feed.user_profile
  const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as ProfileRow | null
  const interests = profile?.interests?.trim() ?? ''
  const locale = profile?.locale ?? 'es'

  const toScore = upserted.filter((a) => a && !a.ai_processed)
  let scored = 0

  for (let i = 0; i < toScore.length; i += 10) {
    const batch = toScore.slice(i, i + 10)
    await Promise.all(
      batch.map(async (article) => {
        if (!article) return
        if (!interests) {
          await service.from('articles').update({ ai_processed: true }).eq('id', article.id)
          return
        }
        const { score, summary, tags } = await scoreArticle(article, interests, locale)
        await service
          .from('articles')
          .update({ relevance_score: score, ai_summary: summary, tags, ai_processed: true })
          .eq('id', article.id)
        scored++
      })
    )
  }

  await service
    .from('feeds')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', feed.id)

  return Response.json({ ok: true, total: items.length, inserted: upserted.filter(Boolean).length, scored })
}
