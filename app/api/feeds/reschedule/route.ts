import { createClient } from '@/lib/supabase/server'
import { createDispatchSchedule, removeSchedule } from '@/lib/qstash/scheduler'
import { qstash } from '@/lib/qstash/client'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Delete ALL existing schedules that point to our dispatch endpoint — regardless of
    // which URL they use. This clears stale schedules left behind by old Vercel deployments.
    const allSchedules = await qstash.schedules.list()
    const dispatchSchedules = allSchedules.filter((s) =>
      typeof s.destination === 'string' && s.destination.includes('/api/jobs/dispatch')
    )
    await Promise.allSettled(dispatchSchedules.map((s) => removeSchedule(s.scheduleId)))

    // Also clean up any legacy per-feed schedules for this user
    const { data: feeds } = await supabase
      .from('feeds')
      .select('id, qstash_schedule_id')
      .eq('user_id', user.id)
      .not('qstash_schedule_id', 'is', null)

    for (const feed of feeds ?? []) {
      if (feed.qstash_schedule_id) {
        await removeSchedule(feed.qstash_schedule_id)
        await supabase.from('feeds').update({ qstash_schedule_id: null }).eq('id', feed.id)
      }
    }

    const scheduleId = await createDispatchSchedule()
    return Response.json({ ok: true, scheduleId, removedStale: dispatchSchedules.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
