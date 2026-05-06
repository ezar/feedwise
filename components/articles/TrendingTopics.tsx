'use client'

import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface TrendingItem {
  tag: string
  count: number
}

interface TrendingTopicsProps {
  onTagClick: (tag: string) => void
  activeTag: string | null
}

export function TrendingTopics({ onTagClick, activeTag }: TrendingTopicsProps) {
  const t = useTranslations('trending')
  const [items, setItems] = useState<TrendingItem[]>([])
  const [open, setOpen] = useState(true)

  useEffect(() => {
    fetch('/api/trending', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { trending?: TrendingItem[] }) => setItems(d.trending ?? []))
      .catch(() => {})
  }, [])

  if (!items.length) return null

  const max = items[0].count

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        {t('title')}
        <span className="ml-auto text-muted-foreground/50">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-1">
          {items.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className={cn(
                'group flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors',
                activeTag === tag ? 'bg-primary/10' : 'hover:bg-muted'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn(
                    'text-xs font-medium truncate',
                    activeTag === tag ? 'text-primary' : 'text-foreground'
                  )}>
                    {tag}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums ml-2 shrink-0">
                    {count}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      activeTag === tag ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                    )}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
