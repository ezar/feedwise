'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/ToastProvider'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Feed {
  id: string
  title?: string | null
  url: string
}

interface SyncState {
  current: number
  total: number
  name: string
  inserted: number
  errors: number
}

export function SyncAllButton() {
  const [sync, setSync] = useState<SyncState | null>(null)
  const [done, setDone] = useState<{ inserted: number; errors: number } | null>(null)
  const { toast } = useToast()
  const t = useTranslations('sync')

  const handleSync = async () => {
    setDone(null)

    const res = await fetch('/api/feeds', { credentials: 'include' })
    const data = await res.json() as { feeds?: Feed[] }
    const feeds = data.feeds ?? []

    if (!feeds.length) {
      toast({ title: t('noFeeds') })
      return
    }

    let inserted = 0
    let errors = 0

    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i]
      setSync({ current: i + 1, total: feeds.length, name: feed.title ?? feed.url, inserted, errors })

      try {
        const r = await fetch(`/api/feeds/${feed.id}/fetch`, { method: 'POST', credentials: 'include' })
        const d = await r.json() as { inserted?: number; error?: string }
        if (r.ok) {
          inserted += d.inserted ?? 0
        } else {
          errors++
        }
      } catch {
        errors++
      }
    }

    setSync(null)
    setDone({ inserted, errors })
    toast({
      title: t('done'),
      description: t('doneSummary', { count: inserted, errors }),
      variant: errors > 0 ? 'destructive' : undefined,
    })
  }

  const loading = sync !== null
  const pct = sync ? Math.round((sync.current / sync.total) * 100) : 0

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSync} disabled={loading} variant="outline" className="w-full justify-start">
        <RefreshCw className={cn('h-4 w-4 shrink-0', loading && 'animate-spin')} />
        {loading ? t('currentFeed', { current: sync!.current, total: sync!.total }) : t('button')}
      </Button>

      {loading && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground truncate">{sync!.name}</p>
        </div>
      )}

      {done && !loading && (
        <p className="text-xs flex items-center gap-1.5">
          {done.errors === 0
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {t('newArticles', { count: done.inserted })}</>
            : <><XCircle className="h-3.5 w-3.5 text-destructive" /> {t('withErrors', { count: done.inserted, errors: done.errors })}</>
          }
        </p>
      )}
    </div>
  )
}
