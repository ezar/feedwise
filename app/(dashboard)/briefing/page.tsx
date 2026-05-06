'use client'

import { useState, useEffect } from 'react'
import { Loader2, Sparkles, RefreshCw, Newspaper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations, useLocale } from 'next-intl'

interface CachedBriefing {
  text: string
  date: string
  articleCount: number
}

const CACHE_KEY = 'feedwise-briefing'

export default function BriefingPage() {
  const t = useTranslations('briefing')
  const locale = useLocale()

  const [briefing, setBriefing] = useState<CachedBriefing | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as CachedBriefing
        if (parsed.date === today) setBriefing(parsed)
      }
    } catch { /* ignore */ }
  }, [today])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      const json = await res.json() as { briefing?: string; articleCount?: number; error?: string }
      if (!res.ok || !json.briefing) {
        setError(json.error === 'no_articles' ? t('noArticles') : (json.error ?? t('error')))
        return
      }
      const cached: CachedBriefing = { text: json.briefing, date: today, articleCount: json.articleCount ?? 0 }
      setBriefing(cached)
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('title')}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
        </div>
        {briefing && (
          <Button variant="outline" size="sm" onClick={() => void generate()} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t('regenerate')}
          </Button>
        )}
      </div>

      {!briefing && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-5">
            <Newspaper className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-medium">{t('cta')}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">{t('ctaHint')}</p>
          </div>
          <Button onClick={() => void generate()}>
            <Sparkles className="h-4 w-4" />
            {t('generate')}
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">{t('generating')}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 text-destructive p-4 text-sm">
          {error}
        </div>
      )}

      {briefing && !loading && (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-xs text-muted-foreground mb-4">
            {t('basedOn', { count: briefing.articleCount })}
          </p>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {briefing.text.split('\n').filter(Boolean).map((paragraph, i) => {
              const isHeading = paragraph === paragraph.toUpperCase() && paragraph.length < 60
              return isHeading
                ? <p key={i} className="font-semibold text-sm uppercase tracking-wide text-primary mt-5 mb-1 first:mt-0">{paragraph}</p>
                : <p key={i} className="text-sm leading-relaxed text-foreground/90 mb-2">{paragraph}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}
