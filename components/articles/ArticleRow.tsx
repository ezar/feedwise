'use client'

import { BookOpen, ChevronDown } from 'lucide-react'
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
  onOpenReader?: () => void
}

function scoreBadgeClass(score: number) {
  if (score >= 75) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
  return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
}

export function ArticleRow({ article, onMarkRead, onExpand, onOpenReader }: ArticleRowProps) {
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

  const handleOpenReader = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenReader?.()
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
        <button
          onClick={handleOpenReader}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          title="Modo lector"
        >
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        {onExpand && (
          <ChevronDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />
        )}
      </div>
    </div>
  )
}
