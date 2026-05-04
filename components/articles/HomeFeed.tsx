'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Newspaper, CheckCheck, ArrowDown, LayoutList, LayoutGrid, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ArticleCard } from './ArticleCard'
import { ArticleRow } from './ArticleRow'
import { groupDuplicates } from '@/lib/dedup'
import { cn } from '@/lib/utils'

type ViewMode = 'card' | 'compact'

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
const PULL_THRESHOLD = 72   // px to trigger refresh
const STALE_MS = 5 * 60 * 1000 // auto-refresh after 5 min hidden

export function HomeFeed({ initialArticles, threshold, hasInterests, feedId }: HomeFeedProps) {
  const t = useTranslations('feed')
  const router = useRouter()

  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [unreadSnapshot, setUnreadSnapshot] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'card'
    return (localStorage.getItem('feedwise-view') as ViewMode) ?? 'card'
  })
  const [dedupEnabled, setDedupEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('feedwise-dedup') !== 'false'
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Pull-to-refresh state
  const [pullDist, setPullDist] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(initialArticles.length === PAGE_SIZE)
  const pageRef = useRef(1)
  const articleEls = useRef<Map<string, HTMLDivElement>>(new Map())

  // Sync when server refreshes (router.refresh() causes new initialArticles prop)
  useEffect(() => {
    setArticles(initialArticles)
    setRefreshing(false)
    pageRef.current = 1
    hasMoreRef.current = initialArticles.length === PAGE_SIZE
    setHasMore(initialArticles.length === PAGE_SIZE)
  }, [initialArticles])

  // Auto-refresh: if tab was hidden for 5+ min, refresh on focus
  useEffect(() => {
    let hiddenAt: number | null = null
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
      } else if (hiddenAt !== null && Date.now() - hiddenAt > STALE_MS) {
        hiddenAt = null
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [router])

  // Mark-as-read: scroll event checks which articles passed above viewport
  useEffect(() => {
    let rafId: number | null = null
    const check = () => {
      rafId = null
      articleEls.current.forEach((el, id) => {
        if (el.getBoundingClientRect().bottom < 0) {
          articleEls.current.delete(id)
          setArticles((prev) =>
            prev.map((a) => (a.id === id && !a.is_read ? { ...a, is_read: true } : a))
          )
          fetch(`/api/articles/${id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_read: true }),
          })
        }
      })
    }
    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  const attachReadRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if (el) articleEls.current.set(id, el)
    else articleEls.current.delete(id)
  }, [])

  // Pull-to-refresh touch handlers (attached to window to capture full gesture)
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY
        isPulling.current = true
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return
      const dist = Math.max(0, e.touches[0].clientY - touchStartY.current)
      // Dampen pull distance so it feels elastic
      setPullDist(Math.min(dist * 0.45, PULL_THRESHOLD))
    }
    const onTouchEnd = () => {
      if (!isPulling.current) return
      isPulling.current = false
      if (pullDist >= PULL_THRESHOLD * 0.9) {
        setRefreshing(true)
        router.refresh()
      }
      setPullDist(0)
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDist, router])

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const nextPage = pageRef.current + 1
      const feedParam = feedId ? `&feed_id=${feedId}` : ''
      const res = await fetch(`/api/articles?page=${nextPage}${feedParam}`, { credentials: 'include' })
      if (!res.ok) { hasMoreRef.current = false; setHasMore(false); return }
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

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    const feedParam = feedId ? `?feed_id=${feedId}` : ''
    setArticles((prev) => prev.map((a) => ({ ...a, is_read: true })))
    await fetch(`/api/articles/read-all${feedParam}`, { method: 'POST', credentials: 'include' })
  }, [feedId])

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

  const groups = useMemo(
    () => dedupEnabled ? groupDuplicates(visible) : visible.map((a) => ({ main: a, dupes: [] })),
    [visible, dedupEnabled]
  )

  const dedupedCount = visible.length - groups.filter((g) => g.dupes.length > 0).reduce((acc, g) => acc + g.dupes.length, 0)

  // Pull indicator: show above the feed when user is pulling down
  const showPullIndicator = pullDist > 8 || refreshing
  const pullReady = pullDist >= PULL_THRESHOLD * 0.9

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium">{t('noArticles')}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{t('noArticlesHint')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Pull-to-refresh indicator */}
      {showPullIndicator && (
        <div
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground transition-all"
          style={{ height: refreshing ? 36 : pullDist * 0.8 }}
        >
          {refreshing
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ArrowDown className={cn('h-4 w-4 transition-transform', pullReady && 'rotate-180')} />
          }
          <span>{refreshing ? t('refreshing') : pullReady ? t('pullToRefresh') : t('pulling')}</span>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground shrink-0">
          {unreadCount > 0 ? t('unread', { count: unreadCount }) : t('allRead')}
          {' · '}{t('loaded', { count: dedupEnabled ? dedupedCount : visible.length })}
          {dedupEnabled && visible.length > dedupedCount && (
            <span className="ml-1 text-muted-foreground/60">
              ({t('dupeHidden', { count: visible.length - dedupedCount })})
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={t('markAllRead')}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('markAllRead')}</span>
            </button>
          )}
          <button
            onClick={() => {
              const next = !dedupEnabled
              setDedupEnabled(next)
              localStorage.setItem('feedwise-dedup', String(next))
            }}
            className={cn('transition-colors', dedupEnabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
            title={dedupEnabled ? t('dedupOn') : t('dedupOff')}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              const next: ViewMode = viewMode === 'card' ? 'compact' : 'card'
              setViewMode(next)
              localStorage.setItem('feedwise-view', next)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={viewMode === 'card' ? t('viewCompact') : t('viewCard')}
          >
            {viewMode === 'card'
              ? <LayoutList className="h-4 w-4" />
              : <LayoutGrid className="h-4 w-4" />
            }
          </button>
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button
              onClick={() => { setFilter('all'); setUnreadSnapshot(new Set()) }}
              className={cn(
                'px-3 py-1 transition-colors',
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {t('all')}
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
              {unreadCount > 0 ? t('unreadFilterCount', { count: unreadCount }) : t('unreadFilter')}
            </button>
          </div>
        </div>
      </div>

      {/* Article list */}
      {viewMode === 'compact' && (
        <div className="border rounded-lg overflow-hidden divide-y">
          {groups.map(({ main, dupes }) => (
            <div key={main.id}>
              <div ref={(el) => attachReadRef(el, main.id)}>
                <ArticleRow article={main} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} />
              </div>
              {dupes.length > 0 && !expandedGroups.has(main.id) && (
                <button
                  onClick={() => setExpandedGroups((prev) => new Set(Array.from(prev).concat(main.id)))}
                  className="w-full text-left px-3 py-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground bg-muted/30 transition-colors"
                >
                  {t('dupesCollapsed', { count: dupes.length })}
                </button>
              )}
              {dupes.length > 0 && expandedGroups.has(main.id) && dupes.map((dupe) => (
                <div key={dupe.id} ref={(el) => attachReadRef(el, dupe.id)} className="opacity-60">
                  <ArticleRow article={dupe} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {viewMode === 'card' && groups.map(({ main, dupes }) => (
        <div key={main.id}>
          <div ref={(el) => attachReadRef(el, main.id)}>
            <ArticleCard article={main} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} />
          </div>
          {dupes.length > 0 && !expandedGroups.has(main.id) && (
            <button
              onClick={() => setExpandedGroups((prev) => new Set(Array.from(prev).concat(main.id)))}
              className="ml-4 mb-2 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              {t('dupesCollapsed', { count: dupes.length })}
            </button>
          )}
          {dupes.length > 0 && expandedGroups.has(main.id) && dupes.map((dupe) => (
            <div key={dupe.id} ref={(el) => attachReadRef(el, dupe.id)} className="opacity-60 scale-[0.98] origin-left">
              <ArticleCard article={dupe} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} />
            </div>
          ))}
        </div>
      ))}

      {filter === 'unread' && unreadSnapshot.size === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <Newspaper className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">{t('allReadEmptyTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('allReadEmptyHint')}</p>
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && articles.length >= PAGE_SIZE && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t('reachedEnd', { count: articles.length })}
        </p>
      )}
    </div>
  )
}
