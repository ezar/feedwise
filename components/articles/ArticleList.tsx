'use client'

import { useState, useCallback } from 'react'
import { Newspaper } from 'lucide-react'
import { ArticleCard } from './ArticleCard'

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

interface ArticleListProps {
  initialArticles: Article[]
  emptyMessage?: string
  emptyHint?: string
}

export function ArticleList({
  initialArticles,
  emptyMessage = 'No hay artículos todavía',
  emptyHint = 'Añade feeds y configura tus intereses para ver artículos relevantes.',
}: ArticleListProps) {
  const [articles, setArticles] = useState(initialArticles)

  const handleSaveToggle = useCallback((id: string, saved: boolean) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_saved: saved } : a))
    )
  }, [])

  const handleMarkRead = useCallback((id: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    )
  }, [])

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{emptyHint}</p>
      </div>
    )
  }

  const unreadCount = articles.filter((a) => !a.is_read).length

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unreadCount} sin leer · {articles.length} total
        </p>
      )}
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onSaveToggle={handleSaveToggle}
          onMarkRead={handleMarkRead}
        />
      ))}
    </div>
  )
}
