import { Receiver } from '@upstash/qstash'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { publishFeedJob } from '@/lib/qstash/scheduler'

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

  const supabase = createServiceClient()
  const { data: feeds } = await supabase.from('feeds').select('id')

  if (!feeds?.length) return Response.json({ ok: true, dispatched: 0 })

  // Publish all messages in parallel — delay param handles staggering on QStash side
  // Sequential was timing out on Vercel Hobby (10s limit) with 100+ feeds
  const results = await Promise.allSettled(
    feeds.map((feed, i) => publishFeedJob(feed.id as string, i * 3))
  )
  const dispatched = results.filter((r) => r.status === 'fulfilled').length

  return Response.json({ ok: true, dispatched, total: feeds.length })
}
