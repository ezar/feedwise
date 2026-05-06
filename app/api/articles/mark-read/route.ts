import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids?: string[] }
  if (!ids?.length) return Response.json({ ok: true })

  await supabase
    .from('articles')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in('id', ids)

  return Response.json({ ok: true })
}
