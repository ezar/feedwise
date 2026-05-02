'use client'

import { useState, useCallback } from 'react'
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
}

export function ArticleList({ initialArticles }: ArticleListProps) {
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
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No hay artículos todavía</p>
        <p className="text-sm mt-1">Añade feeds y configura tus intereses para ver artículos relevantes.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
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
