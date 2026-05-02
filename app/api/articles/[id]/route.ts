import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { is_read?: boolean; is_saved?: boolean }
  const updates: { is_read?: boolean; is_saved?: boolean } = {}
  if (typeof body.is_read === 'boolean') updates.is_read = body.is_read
  if (typeof body.is_saved === 'boolean') updates.is_saved = body.is_saved

  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('id', params.id)
    .select('*, feeds!inner(user_id)')
    .eq('feeds.user_id', user.id)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ article: data })
}
