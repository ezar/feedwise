import { Receiver } from '@upstash/qstash'
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { publishFeedJob } from '@/lib/qstash/scheduler'

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

  const supabase = createServiceClient()
  const { data: feeds } = await supabase.from('feeds').select('id')

  if (!feeds?.length) return Response.json({ ok: true, dispatched: 0 })

  let dispatched = 0
  for (let i = 0; i < feeds.length; i++) {
    try {
      // Stagger 3s between feeds to avoid bursting the AI API
      await publishFeedJob(feeds[i].id as string, i * 3)
      dispatched++
    } catch { /* continue with other feeds */ }
  }

  return Response.json({ ok: true, dispatched, total: feeds.length })
}
