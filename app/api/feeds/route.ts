import { createClient } from '@/lib/supabase/server'
import { scheduleHourlyFetch } from '@/lib/qstash/scheduler'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ feeds: data })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    url: string
    title?: string
    feed_type?: string
    topic_query?: string
  }
  const { url, title, feed_type = 'manual', topic_query } = body

  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  const { data: feed, error } = await supabase
    .from('feeds')
    .insert({ user_id: user.id, url, title, feed_type, topic_query })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  let scheduleWarning: string | undefined
  try {
    const scheduleId = await scheduleHourlyFetch(feed.id)
    await supabase
      .from('feeds')
      .update({ qstash_schedule_id: scheduleId })
      .eq('id', feed.id)
    feed.qstash_schedule_id = scheduleId
  } catch (err) {
    console.error('Failed to schedule QStash job:', err)
    scheduleWarning = 'Feed guardado pero no se pudo programar la actualización automática. Comprueba la configuración de QStash.'
  }

  return Response.json({ feed, warning: scheduleWarning }, { status: 201 })
}
