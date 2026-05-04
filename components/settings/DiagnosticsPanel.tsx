'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface DiagData {
  lastCron: string | null
  totalArticles: number
  scoredArticles: number
  hasInterests: boolean
}

interface TestResult {
  ok: boolean
  score?: number
  summary?: string
  error?: string
  ms?: number
}

export function DiagnosticsPanel() {
  const [data, setData] = useState<DiagData | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const t = useTranslations('diagnostics')

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return t('lessThan1min')
    if (m < 60) return t('minutes', { m })
    const h = Math.floor(m / 60)
    if (h < 24) return t('hours', { h })
    return t('days', { d: Math.floor(h / 24) })
  }

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/diagnostics', { credentials: 'include' })
    if (res.ok) setData(await res.json() as DiagData)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/diagnostics', { method: 'POST', credentials: 'include' })
    setTestResult(await res.json() as TestResult)
    setTesting(false)
  }

  const cronOk = data?.lastCron
    ? (Date.now() - new Date(data.lastCron).getTime()) < 2 * 60 * 60 * 1000
    : false

  const pendingArticles = (data?.totalArticles ?? 0) - (data?.scoredArticles ?? 0)

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('loading')}
        </div>
      ) : data ? (
        <div className="flex flex-col gap-3">
          <Row
            icon={cronOk ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            label={t('lastCron')}
            value={data.lastCron ? timeAgo(data.lastCron) : t('never')}
            sub={data.lastCron
              ? new Date(data.lastCron).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : t('cronNeverHint')}
          />

          <Row
            icon={data.hasInterests
              ? <Sparkles className="h-4 w-4 text-primary" />
              : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            label={t('scoredArticles')}
            value={`${data.scoredArticles} / ${data.totalArticles}`}
            sub={!data.hasInterests
              ? t('noInterestsHint')
              : pendingArticles > 0
                ? t('pendingHint', { count: pendingArticles })
                : t('allScored')}
          />

          <Button variant="ghost" size="sm" className="self-start -ml-2 text-muted-foreground" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('refresh')}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('loadFailed')}</p>
      )}

      <div className="border-t pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t('aiTestTitle')}</p>
          <Button size="sm" variant="outline" onClick={runTest} disabled={testing || !data?.hasInterests}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {testing ? t('testing') : t('testButton')}
          </Button>
        </div>

        {!data?.hasInterests && (
          <p className="text-xs text-muted-foreground">{t('needsInterests')}</p>
        )}

        {testResult && (
          <div className={cn(
            'rounded-lg p-3 text-sm flex flex-col gap-1',
            testResult.ok ? 'bg-green-50 text-green-900' : 'bg-destructive/10 text-destructive'
          )}>
            {testResult.ok ? (
              <>
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('aiOk', { ms: testResult.ms ?? 0 })}
                </div>
                <p className="text-xs">{t('score', { score: testResult.score ?? 0 })}</p>
                {testResult.summary && <p className="text-xs italic">{testResult.summary}</p>}
              </>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t('aiError')}</p>
                  <p className="text-xs mt-0.5">{testResult.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium tabular-nums">{value}</span>
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
