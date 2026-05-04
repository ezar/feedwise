'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, Newspaper } from 'lucide-react'
import { ArticleCard } from './ArticleCard'
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

interface HomeFeedProps {
  initialArticles: Article[]
  threshold: number
  hasInterests: boolean
  feedId?: string
}

const PAGE_SIZE = 40

export function HomeFeed({ initialArticles, threshold, hasInterests, feedId }: HomeFeedProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  // Snapshot of unread IDs at the moment the filter was activated.
  // Keeps the list stable while scrolling marks articles as read.
  const [unreadSnapshot, setUnreadSnapshot] = useState<Set<string>>(new Set())

  const sentinelRef = useRef<HTMLDivElement>(null)
  // All pagination/loading state kept in refs for synchronous guard checks
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(initialArticles.length === PAGE_SIZE)
  const pageRef = useRef(1)

  const readObserver = useRef<IntersectionObserver | null>(null)
  const articleEls = useRef<Map<string, Element>>(new Map())

  // Mark-as-read: fires when element leaves viewport above the screen
  useEffect(() => {
    readObserver.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) return
        // Only mark read if scrolled ABOVE viewport (not below)
        if (entry.boundingClientRect.top >= 0) return
        const id = (entry.target as HTMLElement).dataset.id
        if (!id) return
        setArticles((prev) =>
          prev.map((a) => (a.id === id && !a.is_read ? { ...a, is_read: true } : a))
        )
        fetch(`/api/articles/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true }),
        })
      })
    }, { threshold: 0 })

    articleEls.current.forEach((el) => readObserver.current!.observe(el))
    return () => readObserver.current?.disconnect()
  }, [])

  const attachReadRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if (el) {
      articleEls.current.set(id, el)
      readObserver.current?.observe(el)
    } else {
      const prev = articleEls.current.get(id)
      if (prev) readObserver.current?.unobserve(prev)
      articleEls.current.delete(id)
    }
  }, [])

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const nextPage = pageRef.current + 1
      const feedParam = feedId ? `&feed_id=${feedId}` : ''
      const res = await fetch(`/api/articles?page=${nextPage}${feedParam}`, { credentials: 'include' })
      if (!res.ok) {
        hasMoreRef.current = false
        setHasMore(false)
        return
      }
      const data = await res.json() as { articles?: Article[] }
      const next = data.articles ?? []
      setArticles((prev) => [...prev, ...next])
      pageRef.current = nextPage
      const more = next.length === PAGE_SIZE
      hasMoreRef.current = more
      setHasMore(more)
    } catch {
      hasMoreRef.current = false
      setHasMore(false)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [feedId])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) void loadMore() },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const handleSaveToggle = useCallback((id: string, saved: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_saved: saved } : a)))
  }, [])

  const handleMarkRead = useCallback((id: string) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
  }, [])

  const unreadCount = articles.filter((a) => !a.is_read).length
  const visible = filter === 'unread'
    ? articles.filter((a) => unreadSnapshot.has(a.id))
    : articles

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium">
          {hasInterests ? 'Nada relevante por ahora' : 'Sin artículos todavía'}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          {hasInterests
            ? `Aún no hay artículos con puntuación ≥ ${threshold}. Prueba a bajar el umbral en Ajustes.`
            : 'Añade feeds y actualízalos para empezar a ver artículos.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo leído'}
          {' · '}{articles.length} cargados
        </p>
        <div className="flex rounded-md border overflow-hidden text-xs">
          <button
            onClick={() => { setFilter('all'); setUnreadSnapshot(new Set()) }}
            className={cn(
              'px-3 py-1 transition-colors',
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            Todos
          </button>
          <button
            onClick={() => {
              setFilter('unread')
              setUnreadSnapshot(new Set(articles.filter((a) => !a.is_read).map((a) => a.id)))
            }}
            className={cn(
              'px-3 py-1 transition-colors border-l',
              filter === 'unread' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            )}
          >
            No leídos {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* Article list */}
      {visible.map((article) => (
        <div
          key={article.id}
          data-id={article.id}
          ref={(el) => attachReadRef(el, article.id)}
        >
          <ArticleCard
            article={article}
            onSaveToggle={handleSaveToggle}
            onMarkRead={handleMarkRead}
          />
        </div>
      ))}

      {filter === 'unread' && unreadSnapshot.size === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <Newspaper className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">Todo leído</p>
          <p className="text-xs text-muted-foreground">Cambia a «Todos» para ver el historial.</p>
        </div>
      )}

      {/* Sentinel must be before the spinner so it stays visible while loading */}
      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && articles.length > PAGE_SIZE && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Has llegado al final · {articles.length} artículos
        </p>
      )}
    </div>
  )
}
