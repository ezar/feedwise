import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('articles')
    .select('tags')
    .gte('published_at', since)
    .not('tags', 'eq', '{}')

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[] | null) ?? []) {
      if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  const trending = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => ({ tag, count }))

  return Response.json({ trending })
}
