'use client'

import { useEffect, useState, useMemo } from 'react'
import { Flame, BookOpen, BarChart3, Loader2, Bookmark, Star, Clock, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FeedStat {
  title: string
  reads: number
  readerOpens: number
  saves: number
  avgScore: number | null
}
interface HourlyBucket { hour: number; count: number }
interface ScoreBucket { label: string; count: number }
interface StatsData {
  readTimestamps: string[]
  totalSaved: number
  avgScore: number | null
  scoreDistribution: ScoreBucket[]
  hourlyPattern: HourlyBucket[]
  feedStats: FeedStat[]
}

function toLocalDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayLocal() { return toLocalDate(new Date().toISOString()) }
function localDayLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })
}
function scoreColor(score: number | null) {
  if (score === null) return 'text-muted-foreground'
  if (score >= 75) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500'
}

function MiniBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden flex-1">
      <div
        className={`h-full rounded-full transition-all ${className || 'bg-primary'}`}
        style={{ width: max > 0 ? `${Math.max(4, (value / max) * 100)}%` : '0%' }}
      />
    </div>
  )
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
      const d = new Date(today); d.setDate(d.getDate() - i)
      dayMap.set(toLocalDate(d.toISOString()), 0)
    }
    const readDaySet = new Set<string>()
    let thisWeekCount = 0; let todayCount = 0
    const todayStr = todayLocal()
    for (const ts of data.readTimestamps) {
      const day = toLocalDate(ts)
      readDaySet.add(day)
      if (dayMap.has(day)) { dayMap.set(day, (dayMap.get(day) ?? 0) + 1); thisWeekCount++ }
      if (day === todayStr) todayCount++
    }
    const dailyReads = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }))
    let streakCount = 0
    const cur = new Date(); cur.setHours(0, 0, 0, 0)
    if (!readDaySet.has(todayStr)) cur.setDate(cur.getDate() - 1)
    while (readDaySet.has(toLocalDate(cur.toISOString()))) { streakCount++; cur.setDate(cur.getDate() - 1) }
    return { dailyReads, streak: streakCount, thisWeek: thisWeekCount, todayCount, avgPerDay: thisWeekCount / 7 }
  }, [data])

  const peakHour = useMemo(() => {
    if (!data?.hourlyPattern) return null
    const peak = data.hourlyPattern.reduce((best, h) => h.count > best.count ? h : best, { hour: 0, count: 0 })
    return peak.count > 0 ? peak.hour : null
  }, [data])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  if (!data) return null

  const maxDayCount = Math.max(...dailyReads.map((d) => d.count), 1)
  const scoreMax = Math.max(...(data.scoreDistribution.map((b) => b.count)), 1)
  const hourMax = Math.max(...(data.hourlyPattern.map((h) => h.count)), 1)
  const estimatedMinutes = Math.round(thisWeek * 3.5)
  const totalReads90 = data.readTimestamps.length
  const totalReaderOpens = data.feedStats.reduce((s, f) => s + f.readerOpens, 0)
  const totalSaves = data.feedStats.reduce((s, f) => s + f.saves, 0)
  const depthRate = totalReads90 > 0 ? Math.round((totalReaderOpens / totalReads90) * 100) : 0

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
            <BarChart3 className="h-4 w-4 text-violet-500" />
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

      {/* Engagement summary */}
      {totalReads90 > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{t('engagement')}</p>
            <span className="text-xs text-muted-foreground ml-auto">{t('last90days')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalReads90}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('engRead')}</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-primary">{totalReaderOpens}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('engOpened')}</p>
              <p className="text-[10px] text-primary/70">{depthRate}%</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-yellow-600 dark:text-yellow-400">{totalSaves}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('engSaved')}</p>
              <p className="text-[10px] text-yellow-600/70 dark:text-yellow-400/70">
                {totalReads90 > 0 ? Math.round((totalSaves / totalReads90) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7-day bar chart */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium">{t('last7days')}</p>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {dailyReads.map(({ day, count }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end" style={{ height: '84px' }}>
                {count > 0 && <span className="text-[9px] text-muted-foreground tabular-nums mb-0.5">{count}</span>}
                <div className="w-full rounded-t transition-all" style={{
                  height: count === 0 ? '2px' : `${Math.max((count / maxDayCount) * 72, 6)}px`,
                  backgroundColor: count === 0 ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                  opacity: count === 0 ? 0.3 : 1,
                }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{localDayLabel(day)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly reading pattern */}
      {totalReads90 > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('hourlyPattern')}</p>
            </div>
            {peakHour !== null && (
              <span className="text-xs text-muted-foreground">
                {t('peakAt')} {peakHour}:00–{peakHour + 1}:00
              </span>
            )}
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {data.hourlyPattern.map(({ hour, count }) => (
              <div key={hour} className="flex-1 flex flex-col justify-end" style={{ height: '40px' }}>
                <div
                  title={`${hour}:00 — ${count}`}
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: count === 0 ? '2px' : `${Math.max((count / hourMax) * 34, 4)}px`,
                    backgroundColor: hour === peakHour ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.45)',
                    opacity: count === 0 ? 0.15 : 1,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">0h</span>
            <span className="text-[9px] text-muted-foreground">6h</span>
            <span className="text-[9px] text-muted-foreground">12h</span>
            <span className="text-[9px] text-muted-foreground">18h</span>
            <span className="text-[9px] text-muted-foreground">23h</span>
          </div>
        </div>
      )}

      {/* AI Score quality */}
      {data.avgScore !== null && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('aiQuality')}</p>
            </div>
            <div>
              <span className={`text-2xl font-bold tabular-nums ${scoreColor(data.avgScore)}`}>{data.avgScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('aiQualityHint')}</p>
          <div className="flex items-end gap-2 h-12">
            {data.scoreDistribution.map((bucket) => (
              <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '36px' }}>
                  <div className="w-full rounded-t" style={{
                    height: bucket.count === 0 ? '2px' : `${Math.max((bucket.count / scoreMax) * 32, 4)}px`,
                    backgroundColor: bucket.count === 0 ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                    opacity: bucket.count === 0 ? 0.3 : 0.8,
                  }} />
                </div>
                <span className="text-[9px] text-muted-foreground leading-none">{bucket.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed engagement table */}
      {data.feedStats.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">{t('feedEngagement')}</p>
            <span className="text-xs text-muted-foreground">{t('last90days')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t('feedEngagementHint')}</p>
          <div className="flex flex-col gap-4">
            {data.feedStats.map((feed) => {
              const openRate = feed.reads > 0 ? Math.round((feed.readerOpens / feed.reads) * 100) : 0
              const saveRate = feed.reads > 0 ? Math.round((feed.saves / feed.reads) * 100) : 0
              const maxReads = data.feedStats[0].reads
              return (
                <div key={feed.title} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate flex-1">{feed.title}</span>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-muted-foreground">
                      {feed.avgScore !== null && (
                        <span className={scoreColor(feed.avgScore)}>★{feed.avgScore}</span>
                      )}
                      <span>{feed.reads} {t('reads')}</span>
                    </div>
                  </div>
                  <MiniBar value={feed.reads} max={maxReads} />
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70" />
                      {t('opened')} {openRate}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500/70" />
                      {t('savedPct')} {saveRate}%
                    </span>
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
