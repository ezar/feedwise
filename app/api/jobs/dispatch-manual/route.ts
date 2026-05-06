import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { publishFeedsBatch } from '@/lib/qstash/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH_SIZE = 5

// Supabase-auth version of dispatch — no QStash signature required.
// Used by the diagnostics panel "Force sync" button to verify the pipeline works
// and to trigger an immediate out-of-schedule sync.
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: feeds } = await service.from('feeds').select('id')

  if (!feeds?.length) return Response.json({ ok: true, dispatched: 0, total: 0 })

  const feedIds = feeds.map((f) => f.id as string)
  const batches: string[][] = []
  for (let i = 0; i < feedIds.length; i += BATCH_SIZE) {
    batches.push(feedIds.slice(i, i + BATCH_SIZE))
  }

  const results = await Promise.allSettled(
    batches.map((batch, i) => publishFeedsBatch(batch, i * 5))
  )

  const dispatched = results.filter((r) => r.status === 'fulfilled').length
  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason instanceof Error
      ? (r as PromiseRejectedResult).reason.message
      : String((r as PromiseRejectedResult).reason)
    )

  return Response.json({ ok: dispatched > 0, dispatched: dispatched * BATCH_SIZE, total: feeds.length, errors })
}
