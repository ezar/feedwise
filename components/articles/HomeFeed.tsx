'use client'

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ArticleCard } from './ArticleCard'
import { Newspaper } from 'lucide-react'

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

interface HomeFeedProps {
  initialArticles: Article[]
  threshold: number
  hasInterests: boolean
}

const PAGE_SIZE = 40

export function HomeFeed({ initialArticles, threshold, hasInterests }: HomeFeedProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE)

  const handleSaveToggle = useCallback((id: string, saved: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_saved: saved } : a)))
  }, [])

  const handleMarkRead = useCallback((id: string) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/articles?page=${nextPage}`, { credentials: 'include' })
      const data = await res.json() as { articles?: Article[] }
      const newArticles = data.articles ?? []
      setArticles((prev) => [...prev, ...newArticles])
      setPage(nextPage)
      setHasMore(newArticles.length === PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">
          {hasInterests ? 'Nada relevante por ahora' : 'Sin artículos todavía'}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {hasInterests
            ? `Aún no hay artículos con puntuación ≥ ${threshold}. Prueba a bajar el umbral en Ajustes o añade más feeds.`
            : 'Añade feeds y actualízalos manualmente para empezar a ver artículos.'}
        </p>
      </div>
    )
  }

  const unreadCount = articles.filter((a) => !a.is_read).length

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unreadCount} sin leer · {articles.length} cargados
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

      {hasMore && (
        <Button
          variant="outline"
          className="mt-2 w-full"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</>
          ) : (
            'Cargar más artículos'
          )}
        </Button>
      )}

      {!hasMore && articles.length > PAGE_SIZE && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Has llegado al final · {articles.length} artículos cargados
        </p>
      )}
    </div>
  )
}
