import { Receiver } from '@upstash/qstash'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseRSSFeed } from '@/lib/rss/parser'
import { scoreArticle } from '@/lib/ai/scorer'

export const dynamic = 'force-dynamic'

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
    .select('*, user_profile!inner(interests, threshold)')
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
        .select('id, ai_processed, title, description')
        .single()
        .then((r) => r.data)
    )
  )

  const profile = feed.user_profile as { interests: string } | null
  const interests = profile?.interests?.trim() ?? ''

  // Score unprocessed articles in parallel (cap at 10 concurrent AI calls)
  const toScore = upserted.filter((a) => a && !a.ai_processed)
  let processed = 0

  for (let i = 0; i < toScore.length; i += 10) {
    const batch = toScore.slice(i, i + 10)
    await Promise.all(
      batch.map(async (article) => {
        if (!article) return
        if (!interests) {
          await supabase.from('articles').update({ ai_processed: true }).eq('id', article.id)
          return
        }
        const { score, summary } = await scoreArticle(article, interests)
        await supabase
          .from('articles')
          .update({ relevance_score: score, ai_summary: summary, ai_processed: true })
          .eq('id', article.id)
        processed++
      })
    )
  }

  await supabase
    .from('feeds')
    .update({ last_fetched_at: new Date().toISOString() })
    .eq('id', feedId)

  return Response.json({ ok: true, feedId, processed })
}
