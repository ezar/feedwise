import { createClient } from '@/lib/supabase/server'
import { createDispatchSchedule, getDispatchScheduleId, removeSchedule } from '@/lib/qstash/scheduler'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Remove existing dispatch schedule if any
    const existingId = await getDispatchScheduleId()
    if (existingId) await removeSchedule(existingId)

    // Also clean up any legacy per-feed schedules
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
    return Response.json({ ok: true, scheduleId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
