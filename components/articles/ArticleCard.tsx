'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RelevanceBar } from './RelevanceBar'
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

export function ArticleCard({ article, onSaveToggle, onMarkRead }: ArticleCardProps) {
  const [saved, setSaved] = useState(article.is_saved)
  const [read, setRead] = useState(article.is_read)
  const { toast } = useToast()

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next = !saved
    setSaved(next)
    onSaveToggle?.(article.id, next)
    const res = await fetch(`/api/articles/${article.id}`, { credentials: 'include',
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
      fetch(`/api/articles/${article.id}`, { credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
    }
  }

  const pubDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      read && 'opacity-60'
    )}>
      <CardContent className="p-4 flex flex-col gap-2.5">
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

        {article.ai_summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 italic">
            {article.ai_summary}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {article.relevance_score != null && (
            <RelevanceBar score={article.relevance_score} />
          )}
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
