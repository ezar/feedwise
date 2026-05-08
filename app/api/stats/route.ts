import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: readArticles },
    { count: totalSaved },
  ] = await Promise.all([
    // All reads in last 90 days — full engagement data
    supabase
      .from('articles')
      .select('read_at, relevance_score, is_saved, reader_opened_at, feeds!inner(title)')
      .eq('is_read', true)
      .not('read_at', 'is', null)
      .gte('read_at', ninetyDaysAgo)
      .order('read_at', { ascending: false }),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('is_saved', true),
  ])

  const reads = readArticles ?? []

  // --- Score stats ---
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

  // --- Hourly reading pattern (local hour of user doesn't matter here — use UTC) ---
  const hourlyPattern = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: reads.filter((a) => new Date(a.read_at as string).getUTCHours() === h).length,
  }))

  // --- Per-feed engagement stats ---
  interface FeedEntry { reads: number; readerOpens: number; saves: number; scoreSum: number; scoreCount: number }
  const feedMap = new Map<string, FeedEntry>()
  for (const a of reads) {
    const title = (a.feeds as { title?: string | null } | null)?.title ?? 'Unknown'
    const entry = feedMap.get(title) ?? { reads: 0, readerOpens: 0, saves: 0, scoreSum: 0, scoreCount: 0 }
    entry.reads++
    if (a.reader_opened_at) entry.readerOpens++
    if (a.is_saved) entry.saves++
    if (a.relevance_score !== null) { entry.scoreSum += a.relevance_score as number; entry.scoreCount++ }
    feedMap.set(title, entry)
  }

  const feedStats = Array.from(feedMap.entries())
    .map(([title, { reads: r, readerOpens, saves, scoreSum, scoreCount }]) => ({
      title,
      reads: r,
      readerOpens,
      saves,
      engagementScore: readerOpens * 2 + saves * 3,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore || b.reads - a.reads)
    .slice(0, 8)

  // Raw timestamps for client-side 7-day chart + streak
  const readTimestamps = reads.map((a) => a.read_at as string)

  return Response.json({
    readTimestamps,
    totalSaved: totalSaved ?? 0,
    avgScore,
    scoreDistribution,
    hourlyPattern,
    feedStats,
  })
}
