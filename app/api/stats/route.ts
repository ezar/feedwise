import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: readArticles },
    { count: totalSaved },
    { data: topFeedsRaw },
  ] = await Promise.all([
    // All reads in last 90 days with timestamp + score (for all client-side computations)
    supabase
      .from('articles')
      .select('read_at, relevance_score')
      .eq('is_read', true)
      .not('read_at', 'is', null)
      .gte('read_at', ninetyDaysAgo)
      .order('read_at', { ascending: false }),
    // Total saved
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_saved', true),
    // Top feeds by reads in last 90 days
    supabase
      .from('articles')
      .select('relevance_score, feeds!inner(title)')
      .eq('is_read', true)
      .not('read_at', 'is', null)
      .gte('read_at', ninetyDaysAgo),
  ])

  const reads = readArticles ?? []

  // Score distribution buckets (only scored articles)
  const scored = reads.filter((a) => a.relevance_score !== null)
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, a) => s + (a.relevance_score as number), 0) / scored.length)
    : null
  const scoreDistribution = [
    { label: '0–24', count: scored.filter((a) => (a.relevance_score as number) < 25).length },
    { label: '25–49', count: scored.filter((a) => (a.relevance_score as number) >= 25 && (a.relevance_score as number) < 50).length },
    { label: '50–74', count: scored.filter((a) => (a.relevance_score as number) >= 50 && (a.relevance_score as number) < 75).length },
    { label: '75–100', count: scored.filter((a) => (a.relevance_score as number) >= 75).length },
  ]

  // Top feeds: aggregate reads + avg score
  const feedMap = new Map<string, { count: number; scoreSum: number; scoreCount: number }>()
  for (const a of topFeedsRaw ?? []) {
    const title = (a.feeds as { title?: string | null } | null)?.title ?? 'Unknown'
    const entry = feedMap.get(title) ?? { count: 0, scoreSum: 0, scoreCount: 0 }
    entry.count++
    if (a.relevance_score !== null) {
      entry.scoreSum += a.relevance_score as number
      entry.scoreCount++
    }
    feedMap.set(title, entry)
  }
  const topFeeds = Array.from(feedMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([title, { count, scoreSum, scoreCount }]) => ({
      title,
      count,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
    }))

  // Return raw timestamps for client-side streak + chart bucketing
  const readTimestamps = reads.map((a) => a.read_at as string)

  return Response.json({
    readTimestamps,
    topFeeds,
    totalSaved: totalSaved ?? 0,
    avgScore,
    scoreDistribution,
  })
}
