import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: readArticles },
    { count: totalRead },
    { count: totalUnread },
    { count: totalSaved },
    { data: topFeedsRaw },
  ] = await Promise.all([
    // All reads in last 90 days with timestamp (for streak + chart, client will bucket by local date)
    supabase
      .from('articles')
      .select('read_at')
      .eq('is_read', true)
      .not('read_at', 'is', null)
      .gte('read_at', ninetyDaysAgo)
      .order('read_at', { ascending: false }),
    // Total ever read
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', true),
    // Total unread
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false),
    // Total saved
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_saved', true),
    // Top feeds by reads (last 90 days)
    supabase
      .from('articles')
      .select('feeds!inner(title)')
      .eq('is_read', true)
      .not('read_at', 'is', null)
      .gte('read_at', ninetyDaysAgo),
  ])

  // Aggregate top feeds server-side
  const feedMap = new Map<string, number>()
  for (const a of topFeedsRaw ?? []) {
    const title = (a.feeds as { title?: string | null } | null)?.title ?? 'Unknown'
    feedMap.set(title, (feedMap.get(title) ?? 0) + 1)
  }
  const topFeeds = Array.from(feedMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }))

  // Return raw timestamps — client will group by local date
  const readTimestamps = (readArticles ?? []).map((a) => a.read_at as string)

  return Response.json({
    readTimestamps,
    topFeeds,
    totalRead: totalRead ?? 0,
    totalUnread: totalUnread ?? 0,
    totalSaved: totalSaved ?? 0,
  })
}
