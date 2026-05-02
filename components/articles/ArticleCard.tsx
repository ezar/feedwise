'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RelevanceBar } from './RelevanceBar'
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

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    const next = !saved
    setSaved(next)
    onSaveToggle?.(article.id, next)
    await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_saved: next }),
    })
  }

  const handleClick = () => {
    if (!article.is_read) {
      onMarkRead?.(article.id)
      fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
    }
  }

  const pubDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Card className={cn('transition-opacity', article.is_read && 'opacity-60')}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm hover:underline line-clamp-2 flex-1"
            onClick={handleClick}
          >
            {article.title}
            <ExternalLink className="inline ml-1 h-3 w-3 opacity-50" />
          </a>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSave}>
            {saved ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>

        {article.ai_summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{article.ai_summary}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {article.relevance_score != null && (
            <RelevanceBar score={article.relevance_score} />
          )}
          {article.feeds?.title && (
            <Badge variant="secondary" className="text-xs">
              {article.feeds.title}
            </Badge>
          )}
          {pubDate && <span className="text-xs text-muted-foreground ml-auto">{pubDate}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
