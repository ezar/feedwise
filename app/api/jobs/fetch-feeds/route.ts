import { Receiver } from '@upstash/qstash'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseRSSFeed } from '@/lib/rss/parser'
import { scoreArticle } from '@/lib/ai/scorer'
import { sendPushNotification } from '@/lib/push/sender'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  const rawBody = await req.text()
  const signature = req.headers.get('upstash-signature') ?? ''

  const isValid = await receiver.verify({ signature, body: rawBody }).catch(() => false)
  if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const { feedId } = JSON.parse(rawBody) as { feedId?: string }
  if (!feedId) return Response.json({ error: 'feedId required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: feed, error } = await supabase
    .from('feeds')
    .select('*, user_profile!inner(interests, threshold, locale)')
    .eq('id', feedId)
    .single()

  if (error || !feed) return Response.json({ error: 'Feed not found' }, { status: 404 })

  let items
  try {
    items = await parseRSSFeed(feed.url as string)
    await supabase.from('feeds').update({ last_error: null }).eq('id', feedId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('feeds')
      .update({ last_fetched_at: new Date().toISOString(), last_error: msg })
      .eq('id', feedId)
    return Response.json({ error: msg, feedId }, { status: 422 })
  }

  // Upsert all articles in parallel
  const upserted = await Promise.all(
    items.map((item) =>
      supabase
        .from('articles')
        .upsert(
          {
            feed_id: feedId,
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

  const profile = feed.user_profile as { interests: string; locale?: string } | null
  const interests = profile?.interests?.trim() ?? ''
  const locale = profile?.locale ?? 'es'

  // Score unprocessed articles in parallel (cap at 10 concurrent AI calls)
  const toScore = upserted.filter((a) => a && !a.ai_processed)
  let processed = 0
  const highScoreArticles: Array<{ title: string; url: string }> = []

  const threshold = (feed.user_profile as { threshold?: number } | null)?.threshold ?? 50

  for (let i = 0; i < toScore.length; i += 10) {
    const batch = toScore.slice(i, i + 10)
    await Promise.all(
      batch.map(async (article) => {
        if (!article) return
        if (!interests) {
          await supabase.from('articles').update({ ai_processed: true }).eq('id', article.id)
          return
        }
        const { score, summary, tags } = await scoreArticle(article, interests, locale)
        await supabase
          .from('articles')
          .update({ relevance_score: score, ai_summary: summary, tags, ai_processed: true })
          .eq('id', article.id)
        processed++
        if (score >= threshold) highScoreArticles.push({ title: article.title, url: article.url ?? '' })
      })
    )
  }

  // Send push notifications for high-score new articles
  if (highScoreArticles.length > 0) {
    const userId = feed.user_id as string
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (subs && subs.length > 0) {
      const payload = highScoreArticles.length === 1
        ? { title: 'feedwise', body: highScoreArticles[0].title, url: highScoreArticles[0].url }
        : { title: 'feedwise', body: `${highScoreArticles.length} new relevant articles`, url: '/' }

      await Promise.allSettled(
        subs.map((sub) => sendPushNotification(sub as { endpoint: string; p256dh: string; auth: string }, payload))
      )
    }
  }

  await supabase
    .from('feeds')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', feedId)

  return Response.json({ ok: true, feedId, processed })
}
