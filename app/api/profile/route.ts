import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { interests?: string; threshold?: number }
  const updates: { interests?: string; threshold?: number; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (typeof body.interests === 'string') updates.interests = body.interests
  if (typeof body.threshold === 'number') {
    updates.threshold = Math.min(100, Math.max(0, body.threshold))
  }

  const { data, error } = await supabase
    .from('user_profile')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ profile: data })
}
