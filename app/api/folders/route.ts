import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('feeds')
    .select('folder')
    .eq('user_id', user.id)
    .not('folder', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const seen = new Set<string>()
  const folders: string[] = []
  for (const f of data ?? []) {
    const folder = f.folder as string
    if (!seen.has(folder)) { seen.add(folder); folders.push(folder) }
  }
  folders.sort()
  return Response.json({ folders })
}
