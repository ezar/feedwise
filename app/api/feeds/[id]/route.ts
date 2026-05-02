import { createClient } from '@/lib/supabase/server'
import { removeSchedule } from '@/lib/qstash/scheduler'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: feed } = await supabase
    .from('feeds')
    .select('qstash_schedule_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (feed?.qstash_schedule_id) {
    try {
      await removeSchedule(feed.qstash_schedule_id)
    } catch (err) {
      console.error('Failed to remove QStash schedule:', err)
    }
  }

  const { error } = await supabase
    .from('feeds')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
