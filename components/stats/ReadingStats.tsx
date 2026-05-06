'use client'

import { useEffect, useState, useMemo } from 'react'
import { Flame, BookOpen, BarChart3, Loader2, Bookmark, Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FeedCount { title: string; count: number }
interface StatsData {
  readTimestamps: string[]
  topFeeds: FeedCount[]
  totalRead: number
  totalUnread: number
  totalSaved: number
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

  const { dailyReads, streak, thisWeek, avgPerDay } = useMemo(() => {
    if (!data) return { dailyReads: [], streak: 0, thisWeek: 0, avgPerDay: 0 }

    // Build last 7 days map using local dates
    const dayMap = new Map<string, number>()
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      dayMap.set(toLocalDate(d.toISOString()), 0)
    }

    const readDaySet = new Set<string>()
    let thisWeekCount = 0

    for (const ts of data.readTimestamps) {
      const day = toLocalDate(ts)
      readDaySet.add(day)
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
        thisWeekCount++
      }
    }

    const dailyReads = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))

    // Streak: consecutive days ending today or yesterday (local time)
    let streakCount = 0
    const cur = new Date()
    cur.setHours(0, 0, 0, 0)
    if (!readDaySet.has(todayLocal())) cur.setDate(cur.getDate() - 1)
    while (readDaySet.has(toLocalDate(cur.toISOString()))) {
      streakCount++
      cur.setDate(cur.getDate() - 1)
    }

    // Avg per day = this week total ÷ 7 calendar days
    const avgPerDay = Math.round(thisWeekCount / 7)

    return { dailyReads, streak: streakCount, thisWeek: thisWeekCount, avgPerDay }
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

  return (
    <div className="flex flex-col gap-4">
      {/* Top metrics grid */}
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
            <span className="text-xs">{t('totalRead')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{data.totalRead.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('articles')}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Inbox className="h-4 w-4 text-violet-500" />
            <span className="text-xs">Sin leer</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{data.totalUnread.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">artículos</p>
        </div>
        <div className="rounded-xl border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Bookmark className="h-4 w-4 text-yellow-500" />
            <span className="text-xs">Guardados</span>
          </div>
          <p className="text-3xl font-bold tabular-nums leading-none">{data.totalSaved.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">artículos</p>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{t('last7days')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Esta semana</p>
            <p className="text-sm font-semibold tabular-nums">{thisWeek} · ~{avgPerDay}/día</p>
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
              <span className="text-[10px] text-muted-foreground">
                {localDayLabel(day)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top sources */}
      {data.topFeeds.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">{t('topSources')}</p>
          <p className="text-xs text-muted-foreground mb-3">Últimos 90 días</p>
          <div className="flex flex-col gap-3">
            {data.topFeeds.map(({ title, count }, i) => {
              const pct = Math.round((count / data.topFeeds[0].count) * 100)
              return (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium truncate">{title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}</span>
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
    </div>
  )
}
