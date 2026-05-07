'use client'

import { useEffect, useState, useMemo } from 'react'
import { Flame, BookOpen, BarChart3, Loader2, Bookmark, Star, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FeedCount { title: string; count: number; avgScore: number | null }
interface ScoreBucket { label: string; count: number }
interface StatsData {
  readTimestamps: string[]
  topFeeds: FeedCount[]
  totalSaved: number
  avgScore: number | null
  scoreDistribution: ScoreBucket[]
}

function toLocalDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayLocal() {
  return toLocalDate(new Date().toISOString())
}

function localDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function scoreColor(score: number | null) {
  if (score === null) return 'text-muted-foreground'
  if (score >= 75) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  if (score >= 25) return 'text-orange-500'
  return 'text-red-500'
}

export function ReadingStats() {
  const t = useTranslations('stats')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: StatsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const { dailyReads, streak, thisWeek, todayCount, avgPerDay } = useMemo(() => {
    if (!data) return { dailyReads: [], streak: 0, thisWeek: 0, todayCount: 0, avgPerDay: 0 }

    const today = new Date()
    const dayMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dayMap.set(toLocalDate(d.toISOString()), 0)
    }

    const readDaySet = new Set<string>()
    let thisWeekCount = 0
    let todayCount = 0
    const todayStr = todayLocal()

    for (const ts of data.readTimestamps) {
      const day = toLocalDate(ts)
      readDaySet.add(day)
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
        thisWeekCount++
      }
      if (day === todayStr) todayCount++
    }

    const dailyReads = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))

    // Streak: consecutive days with reads ending today or yesterday
    let streakCount = 0
    const cur = new Date()
    cur.setHours(0, 0, 0, 0)
    if (!readDaySet.has(todayStr)) cur.setDate(cur.getDate() - 1)
    while (readDaySet.has(toLocalDate(cur.toISOString()))) {
      streakCount++
      cur.setDate(cur.getDate() - 1)
    }

    const avgPerDay = thisWeekCount / 7

    return { dailyReads, streak: streakCount, thisWeek: thisWeekCount, todayCount, avgPerDay }
  }, [data])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const maxCount = Math.max(...dailyReads.map((d) => d.count), 1)
  const scoreMax = Math.max(...(data.scoreDistribution.map((b) => b.count)), 1)
  const estimatedMinutes = Math.round(thisWeek * 3.5)

  return (
    <div className="flex flex-col gap-4">
      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs">{t('streak')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{streak}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('streakDays')}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="text-xs">{t('today')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{todayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('articles')}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <span className="text-xs">{t('thisWeek')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{thisWeek}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ~{avgPerDay < 1 ? avgPerDay.toFixed(1) : Math.round(avgPerDay)}{t('perDay')} · ~{estimatedMinutes}{t('minutes')}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Bookmark className="h-4 w-4 text-yellow-500" />
            <span className="text-xs">{t('saved')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{data.totalSaved.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('articles')}</p>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{t('last7days')}</p>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {dailyReads.map(({ day, count }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '84px' }}>
                {count > 0 && (
                  <span className="text-[9px] text-muted-foreground tabular-nums mb-0.5">{count}</span>
                )}
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: count === 0 ? '2px' : `${Math.max((count / maxCount) * 72, 6)}px`,
                    backgroundColor: count === 0 ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                    opacity: count === 0 ? 0.3 : 1,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{localDayLabel(day)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Score quality */}
      {data.avgScore !== null && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('aiQuality')}</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold tabular-nums ${scoreColor(data.avgScore)}`}>
                {data.avgScore}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('aiQualityHint')}</p>
          <div className="flex items-end gap-2 h-12">
            {data.scoreDistribution.map((bucket) => (
              <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '36px' }}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: bucket.count === 0 ? '2px' : `${Math.max((bucket.count / scoreMax) * 32, 4)}px`,
                      backgroundColor: bucket.count === 0 ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                      opacity: bucket.count === 0 ? 0.3 : 0.8,
                    }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground leading-none">{bucket.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top sources */}
      {data.topFeeds.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">{t('topSources')}</p>
            <span className="text-xs text-muted-foreground">{t('last90days')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('topSourcesHint')}</p>
          <div className="flex flex-col gap-3">
            {data.topFeeds.map(({ title, count, avgScore: feedScore }, i) => {
              const pct = Math.round((count / data.topFeeds[0].count) * 100)
              return (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate">{title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {feedScore !== null && (
                          <span className={`text-[10px] tabular-nums ${scoreColor(feedScore)}`}>
                            ★{feedScore}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data.readTimestamps.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('noData')}</p>
        </div>
      )}
    </div>
  )
}
