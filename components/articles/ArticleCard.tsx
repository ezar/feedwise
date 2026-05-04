'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, ExternalLink, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/ToastProvider'
import { cn } from '@/lib/utils'

interface Article {
  id: string
  title: string
  url: string
  description?: string | null
  published_at?: string | null
  relevance_score?: number | null
  ai_summary?: string | null
  is_read: boolean
  is_saved: boolean
  feeds?: { title?: string | null } | null
}

interface ArticleCardProps {
  article: Article
  onSaveToggle?: (id: string, saved: boolean) => void
  onMarkRead?: (id: string) => void
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

function scoreBarColor(score: number) {
  if (score >= 75) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-500'
  return 'bg-red-400'
}

export function ArticleCard({ article, onSaveToggle, onMarkRead }: ArticleCardProps) {
  const [saved, setSaved] = useState(article.is_saved)
  const [read, setRead] = useState(article.is_read)
  const { toast } = useToast()

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next = !saved
    setSaved(next)
    onSaveToggle?.(article.id, next)
    const res = await fetch(`/api/articles/${article.id}`, {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_saved: next }),
    })
    if (!res.ok) {
      setSaved(!next)
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } else {
      toast({ title: next ? 'Artículo guardado' : 'Eliminado de guardados' })
    }
  }

  const handleClick = () => {
    if (!read) {
      setRead(true)
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
    ? new Date(article.published_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
    : null

  // Prefer AI summary; fall back to feed description (strip HTML tags)
  const snippet = article.ai_summary
    ?? (article.description ? article.description.replace(/<[^>]*>/g, '').trim() : null)

  const score = article.relevance_score

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', read && 'opacity-60')}>
      <CardContent className="p-4 flex flex-col gap-2.5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="font-medium text-sm leading-snug hover:text-primary transition-colors line-clamp-2 flex-1 group"
          >
            {article.title}
            <ExternalLink className="inline ml-1 h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 mt-0.5"
            onClick={handleSave}
            title={saved ? 'Quitar de guardados' : 'Guardar artículo'}
          >
            {saved
              ? <BookmarkCheck className="h-4 w-4 text-primary" />
              : <Bookmark className="h-4 w-4 text-muted-foreground" />
            }
          </Button>
        </div>

        {/* Snippet: AI summary (italic) or feed description */}
        {snippet && (
          <p className={cn(
            'text-xs text-muted-foreground leading-relaxed line-clamp-2',
            article.ai_summary && 'italic'
          )}>
            {snippet}
          </p>
        )}

        {/* AI score bar */}
        {score != null && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="h-1.5 flex-1 max-w-[80px] rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', scoreBarColor(score))}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={cn('text-xs font-medium tabular-nums', scoreColor(score))}>
              {score}/100
            </span>
          </div>
        )}

        {/* Meta: feed name + date */}
        <div className="flex items-center gap-2 flex-wrap">
          {article.feeds?.title && (
            <Badge variant="secondary" className="text-xs font-normal">
              {article.feeds.title}
            </Badge>
          )}
          {pubDate && (
            <span className="text-xs text-muted-foreground ml-auto">{pubDate}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
