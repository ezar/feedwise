import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: feeds } = await supabase
    .from('feeds')
    .select('id')
    .eq('user_id', user.id)

  if (!feeds?.length) return Response.json({ ok: true, triggered: 0 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`

  // Fire-and-forget each feed fetch in parallel (non-blocking)
  const results = await Promise.allSettled(
    feeds.map((f) =>
      fetch(`${appUrl}/api/feeds/${f.id}/fetch`, { method: 'POST' })
    )
  )

  const triggered = results.filter((r) => r.status === 'fulfilled').length

  return Response.json({ ok: true, triggered, total: feeds.length })
}
