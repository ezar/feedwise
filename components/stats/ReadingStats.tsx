'use client'

import { useEffect, useState } from 'react'
import { Flame, BookOpen, BarChart3, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DayCount { day: string; count: number }
interface FeedCount { title: string; count: number }
interface StatsData {
  dailyReads: DayCount[]
  topFeeds: FeedCount[]
  streak: number
  totalRead: number
}

function DayLabel({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + 'T12:00:00')
  return <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const maxCount = Math.max(...data.dailyReads.map((d) => d.count), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs">{t('streak')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">{data.streak}</p>
          <p className="text-xs text-muted-foreground">{t('streakDays')}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="text-xs">{t('totalRead')}</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">{data.totalRead}</p>
          <p className="text-xs text-muted-foreground">{t('articles')}</p>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">{t('last7days')}</p>
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {data.dailyReads.map(({ day, count }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                <div
                  className="w-full rounded-t bg-primary transition-all"
                  style={{ height: count === 0 ? '2px' : `${Math.max((count / maxCount) * 72, 4)}px`, opacity: count === 0 ? 0.2 : 1 }}
                  title={`${count}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                <DayLabel dateStr={day} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top sources */}
      {data.topFeeds.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium mb-3">{t('topSources')}</p>
          <div className="flex flex-col gap-2">
            {data.topFeeds.map(({ title, count }, i) => {
              const pct = Math.round((count / data.topFeeds[0].count) * 100)
              return (
                <div key={title} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-medium truncate">{title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
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
