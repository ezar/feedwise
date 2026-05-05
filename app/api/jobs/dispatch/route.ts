import { Receiver } from '@upstash/qstash'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { publishFeedsBatch } from '@/lib/qstash/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Group feeds into batches to minimise QStash message consumption.
// With BATCH_SIZE=5 and hourly cron: 100 feeds → 20 msg/h × 24h = 480/day (free plan: 1000/day)
const BATCH_SIZE = 5

export async function POST(req: NextRequest) {
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  const rawBody = await req.text()
  const signature = req.headers.get('upstash-signature') ?? ''
  const isValid = await receiver.verify({ signature, body: rawBody }).catch(() => false)
  if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: feeds } = await supabase.from('feeds').select('id')

  if (!feeds?.length) return Response.json({ ok: true, dispatched: 0, batches: 0 })

  const feedIds = feeds.map((f) => f.id as string)
  const batches: string[][] = []
  for (let i = 0; i < feedIds.length; i += BATCH_SIZE) {
    batches.push(feedIds.slice(i, i + BATCH_SIZE))
  }

  const results = await Promise.allSettled(
    batches.map((batch, i) => publishFeedsBatch(batch, i * 10))
  )
  const dispatched = results.filter((r) => r.status === 'fulfilled').length

  return Response.json({ ok: true, dispatched, batches: batches.length, total: feeds.length })
}
