import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface DayCount { day: string; count: number }
interface FeedCount { title: string; count: number }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: articles }, { count: totalRead }] = await Promise.all([
    supabase
      .from('articles')
      .select('read_at, fetched_at, feeds!inner(title)')
      .eq('is_read', true)
      .gte('fetched_at', thirtyDaysAgo)
      .order('read_at', { ascending: false }),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', true),
  ])

  const rows = articles ?? []

  // Build 7-day map (today back to day-6)
  const dayMap = new Map<string, number>()
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dayMap.set(d.toISOString().slice(0, 10), 0)
  }

  const feedMap = new Map<string, number>()

  for (const a of rows) {
    const dateStr = ((a.read_at ?? a.fetched_at) as string | null)?.slice(0, 10) ?? ''
    if (dayMap.has(dateStr)) dayMap.set(dateStr, (dayMap.get(dateStr) ?? 0) + 1)
    const feedTitle = (a.feeds as { title?: string | null } | null)?.title ?? 'Unknown'
    feedMap.set(feedTitle, (feedMap.get(feedTitle) ?? 0) + 1)
  }

  const dailyReads: DayCount[] = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))

  const topFeeds: FeedCount[] = Array.from(feedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }))

  // Streak: consecutive days ending today
  const readDaySet = new Set(rows.map((a) => ((a.read_at ?? a.fetched_at) as string | null)?.slice(0, 10)))
  let streak = 0
  const cur = new Date(today)
  cur.setHours(0, 0, 0, 0)
  while (readDaySet.has(cur.toISOString().slice(0, 10))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }

  return Response.json({ dailyReads, topFeeds, streak, totalRead: totalRead ?? 0 })
}
