import { createClient } from '@/lib/supabase/server'
import { scheduleHourlyFetch, removeSchedule } from '@/lib/qstash/scheduler'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: feeds, error } = await supabase
    .from('feeds')
    .select('id, qstash_schedule_id')
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!feeds?.length) return Response.json({ scheduled: 0, total: 0 })

  let scheduled = 0
  const errors: string[] = []

  for (const feed of feeds) {
    try {
      // Remove old schedule if it exists
      if (feed.qstash_schedule_id) {
        await removeSchedule(feed.qstash_schedule_id).catch(() => {})
      }
      const scheduleId = await scheduleHourlyFetch(feed.id)
      await supabase
        .from('feeds')
        .update({ qstash_schedule_id: scheduleId })
        .eq('id', feed.id)
      scheduled++
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  return Response.json({ scheduled, total: feeds.length, errors })
}
