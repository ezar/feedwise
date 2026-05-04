'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Article {
  id: string
  title: string
  url: string
  published_at?: string | null
  relevance_score?: number | null
  is_read: boolean
  is_saved: boolean
  feeds?: { title?: string | null } | null
}

interface ArticleRowProps {
  article: Article
  onSaveToggle?: (id: string, saved: boolean) => void
  onMarkRead?: (id: string) => void
  onExpand?: () => void
}

function scoreBadgeClass(score: number) {
  if (score >= 75) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
  return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
}

export function ArticleRow({ article, onSaveToggle, onMarkRead, onExpand }: ArticleRowProps) {
  const [saved, setSaved] = useState(article.is_saved)
  const t = useTranslations('article')

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !saved
    setSaved(next)
    onSaveToggle?.(article.id, next)
    fetch(`/api/articles/${article.id}`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_saved: next }),
    })
  }

  const handleLinkClick = () => {
    if (!article.is_read) {
      onMarkRead?.(article.id)
      fetch(`/api/articles/${article.id}`, {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
    }
  }

  const pubDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : null

  const score = article.relevance_score

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 transition-colors group',
        onExpand ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50',
        article.is_read && 'opacity-50'
      )}
      onClick={onExpand}
    >
      {score != null && (
        <span className={cn('text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded shrink-0', scoreBadgeClass(score))}>
          {score}
        </span>
      )}

      {/* Title: link when no onExpand, plain text when expand mode */}
      {onExpand ? (
        <span className="flex-1 min-w-0 text-sm leading-snug truncate">
          {article.title}
        </span>
      ) : (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleLinkClick}
          className="flex-1 min-w-0 text-sm leading-snug truncate hover:text-primary transition-colors"
        >
          {article.title}
        </a>
      )}

      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
        {article.feeds?.title && (
          <span className="hidden sm:inline truncate max-w-[120px]">{article.feeds.title}</span>
        )}
        {pubDate && <span>{pubDate}</span>}
        <button
          onClick={handleSave}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title={saved ? t('unsave') : t('save')}
        >
          {saved
            ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>
        {onExpand && (
          <ChevronDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />
        )}
      </div>
    </div>
  )
}
