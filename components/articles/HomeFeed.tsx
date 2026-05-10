'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Newspaper, CheckCheck, ArrowDown, LayoutList, LayoutGrid, Copy, ChevronUp, Search, X, Zap, List } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ArticleCard } from './ArticleCard'
import { ArticleRow } from './ArticleRow'
import { ReaderModal } from './ReaderModal'
import { SwipeableArticle } from './SwipeableArticle'
import { ShortcutsModal } from './ShortcutsModal'
import { ArticleActionSheet } from './ArticleActionSheet'
import { groupDuplicates } from '@/lib/dedup'
import { TrendingTopics } from './TrendingTopics'
import { cn } from '@/lib/utils'

type ViewMode = 'card' | 'compact' | 'titles'
type DateBucket = 'today' | 'yesterday' | 'thisWeek' | 'older'
type DateFilter = 'all' | 'today' | 'week'

function getDateBucket(dateStr: string | null | undefined): DateBucket {
  if (!dateStr) return 'older'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const articleDay = new Date(dateStr)
  articleDay.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - articleDay.getTime()) / 86_400_000)
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'thisWeek'
  return 'older'
}

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
  tags?: string[] | null
  feeds?: { title?: string | null } | null
}

interface HomeFeedProps {
  initialArticles: Article[]
  feedId?: string
}

const INITIAL_SIZE = 100
const PULL_THRESHOLD = 72   // px to trigger refresh
const STALE_MS = 5 * 60 * 1000 // auto-refresh after 5 min hidden

export function HomeFeed({ initialArticles, feedId }: HomeFeedProps) {
  const t = useTranslations('feed')
  const router = useRouter()

  const [articles, setArticles] = useState<Article[]>(initialArticles)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialArticles.length >= INITIAL_SIZE)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')
  const initialUnread = initialArticles.filter((a) => !a.is_read)
  const [unreadSnapshot, setUnreadSnapshot] = useState<Set<string>>(
    () => new Set(initialUnread.map((a) => a.id))
  )
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'card'
    return (localStorage.getItem('feedwise-view') as ViewMode) ?? 'card'
  })
  const [dedupEnabled, setDedupEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('feedwise-dedup') !== 'false'
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Article[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [readerOpenId, setReaderOpenId] = useState<string | null>(null)
  const [burstMode, setBurstMode] = useState(false)
  const [actionSheetArticle, setActionSheetArticle] = useState<Article | null>(null)
  const [minScore, setMinScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem('feedwise-score') ?? '0', 10)
  })
  const focusedIdxRef = useRef(-1)
  const searchAbortRef = useRef<AbortController | null>(null)
  const articlesRef = useRef<Article[]>(articles)

  const toggleCard = (id: string) =>
    setExpandedCards((prev) => {
      const next = new Set(Array.from(prev))
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })

  // Debounced DB search
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setSearchResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      searchAbortRef.current?.abort()
      const controller = new AbortController()
      searchAbortRef.current = controller
      try {
        const res = await fetch(`/api/articles/search?q=${encodeURIComponent(q)}`, {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) throw new Error()
        const data = await res.json() as { articles?: Article[] }
        setSearchResults(data.articles ?? [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  // Pull-to-refresh state
  const [pullDist, setPullDist] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(initialArticles.length >= INITIAL_SIZE)
  // Default filter is unread, so initial offset for load-more is the count of unread we already have
  const offsetRef = useRef(initialUnread.length)
  const articleEls = useRef<Map<string, HTMLDivElement>>(new Map())

  // Sync when server refreshes (router.refresh() causes new initialArticles prop)
  useEffect(() => {
    const newUnread = initialArticles.filter((a) => !a.is_read)
    setArticles(initialArticles)
    setRefreshing(false)
    // Always refresh snapshot so new articles after a feed update appear immediately
    setUnreadSnapshot(new Set(newUnread.map((a) => a.id)))
    offsetRef.current = newUnread.length
    hasMoreRef.current = initialArticles.length >= INITIAL_SIZE
    setHasMore(initialArticles.length >= INITIAL_SIZE)
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

  // Mark-as-read: accumulate IDs scrolled past and flush in a single batch request
  const readQueueRef = useRef<Set<string>>(new Set())
  const readFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushReadQueue = useCallback(() => {
    const ids = Array.from(readQueueRef.current)
    if (!ids.length) return
    readQueueRef.current = new Set()
    fetch('/api/articles/mark-read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }, [])

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
          readQueueRef.current.add(id)
          // Debounce: flush 1s after last article scrolled past
          if (readFlushTimer.current) clearTimeout(readFlushTimer.current)
          readFlushTimer.current = setTimeout(flushReadQueue, 1000)
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
      // Flush any pending on unmount
      if (readFlushTimer.current) clearTimeout(readFlushTimer.current)
      flushReadQueue()
    }
  }, [flushReadQueue])

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
      const feedParam = feedId ? `&feed_id=${feedId}` : ''
      const unreadParam = filter === 'unread' ? '&unread=true' : ''
      const res = await fetch(`/api/articles?offset=${offsetRef.current}${feedParam}${unreadParam}`, { credentials: 'include' })
      if (!res.ok) { hasMoreRef.current = false; setHasMore(false); return }
      const data = await res.json() as { articles?: Article[]; hasMore?: boolean }
      const next = data.articles ?? []
      setArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        return [...prev, ...next.filter((a) => !existingIds.has(a.id))]
      })
      // Add newly fetched unread articles to the snapshot so they appear in the filtered view
      if (filter === 'unread') {
        setUnreadSnapshot((prev) => new Set(Array.from(prev).concat(next.map((a) => a.id))))
      }
      offsetRef.current += next.length
      hasMoreRef.current = data.hasMore ?? false
      setHasMore(data.hasMore ?? false)
    } catch {
      hasMoreRef.current = false
      setHasMore(false)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [feedId, filter])

  // Mark all articles still tracked in articleEls (visible, not yet scrolled past) as read
  const markAllVisibleRead = useCallback(() => {
    if (!articleEls.current.size) return
    const ids = Array.from(articleEls.current.keys())
    ids.forEach((id) => articleEls.current.delete(id))
    setArticles((prev) =>
      prev.map((a) => (ids.includes(a.id) && !a.is_read ? { ...a, is_read: true } : a))
    )
    ids.forEach((id) =>
      fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      })
    )
  }, [])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        if (hasMoreRef.current) {
          void loadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, markAllVisibleRead])

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    const feedParam = feedId ? `?feed_id=${feedId}` : ''
    setArticles((prev) => prev.map((a) => ({ ...a, is_read: true })))
    setUnreadSnapshot(new Set())
    await fetch(`/api/articles/read-all${feedParam}`, { method: 'POST', credentials: 'include' })
  }, [feedId])

  const handleSaveToggle = useCallback((id: string, saved: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_saved: saved } : a)))
  }, [])

  const handleMarkRead = useCallback((id: string) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
  }, [])

  const handleReaderClose = useCallback((closedId: string) => {
    setReaderOpenId(null)
    if (burstMode) {
      // Use articlesRef (always current) to find the next unread after the closed article
      const all = articlesRef.current
      const idx = all.findIndex((a) => a.id === closedId)
      const list = idx >= 0 ? all.slice(idx + 1) : all
      const next = list.find((a) => !a.is_read)
      if (next) setTimeout(() => setReaderOpenId(next.id), 250)
    }
  }, [burstMode])

  const unreadCount = articles.filter((a) => !a.is_read).length
  const visible = useMemo(() => {
    let result = filter === 'unread'
      ? articles.filter((a) => unreadSnapshot.has(a.id))
      : articles
    if (dateFilter === 'today') {
      result = result.filter((a) => getDateBucket(a.published_at) === 'today')
    } else if (dateFilter === 'week') {
      result = result.filter((a) => getDateBucket(a.published_at) !== 'older')
    }
    if (minScore > 0) {
      result = result.filter((a) => (a.relevance_score ?? 0) >= minScore)
    }
    return result
  }, [articles, filter, unreadSnapshot, dateFilter, minScore])

  const activeArticles = useMemo(() => {
    let result = searchResults ?? visible
    if (activeTag) result = result.filter((a) => a.tags?.includes(activeTag))
    return result
  }, [searchResults, visible, activeTag])

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of visible) {
      for (const tag of (a.tags ?? [])) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag)
  }, [visible])

  const groups = useMemo(
    () => dedupEnabled
      ? groupDuplicates(activeArticles)
      : activeArticles.map((a) => ({ main: a, dupes: [] as Article[] })),
    [activeArticles, dedupEnabled]
  )

  const dedupedCount = visible.length - groups.filter((g) => g.dupes.length > 0).reduce((acc, g) => acc + g.dupes.length, 0)

  // Flat main articles for keyboard nav
  const mainArticlesRef = useRef<Article[]>([])

  const DATE_BUCKET_ORDER: DateBucket[] = ['today', 'yesterday', 'thisWeek', 'older']
  const dateGrouped = useMemo(() => {
    const map = new Map<DateBucket, typeof groups>()
    for (const group of groups) {
      const bucket = getDateBucket(group.main.published_at)
      if (!map.has(bucket)) map.set(bucket, [])
      map.get(bucket)!.push(group)
    }
    return DATE_BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({ bucket: b, groups: map.get(b)! }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups])

  const flatIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    let i = 0
    for (const { groups: g } of dateGrouped) {
      for (const { main } of g) map.set(main.id, i++)
    }
    return map
  }, [dateGrouped])

  // Keep flat article list + focused index refs in sync
  useEffect(() => {
    mainArticlesRef.current = dateGrouped.flatMap(({ groups: g }) => g.map(({ main }) => main))
  }, [dateGrouped])
  useEffect(() => { articlesRef.current = articles }, [articles])
  useEffect(() => { focusedIdxRef.current = focusedIdx }, [focusedIdx])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const list = mainArticlesRef.current
      const idx = focusedIdxRef.current
      switch (e.key) {
        case '?':
          setShowShortcuts(true)
          break
        case 'j': {
          e.preventDefault()
          const next = Math.min(idx + 1, list.length - 1)
          setFocusedIdx(next)
          const el = articleEls.current.get(list[next]?.id ?? '')
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          break
        }
        case 'k': {
          e.preventDefault()
          const next = Math.max(idx - 1, 0)
          setFocusedIdx(next)
          const el = articleEls.current.get(list[next]?.id ?? '')
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          break
        }
        case 'o':
          if (idx >= 0 && list[idx]) window.open(list[idx].url, '_blank', 'noopener,noreferrer')
          break
        case 's': {
          if (idx >= 0 && list[idx]) {
            const a = list[idx]
            const next = !a.is_saved
            handleSaveToggle(a.id, next)
            fetch(`/api/articles/${a.id}`, {
              method: 'PATCH', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_saved: next }),
            })
          }
          break
        }
        case 'm': {
          if (idx >= 0 && list[idx]) {
            const a = list[idx]
            handleMarkRead(a.id)
            fetch(`/api/articles/${a.id}`, {
              method: 'PATCH', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_read: true }),
            })
          }
          break
        }
        case 'r': {
          if (idx >= 0 && list[idx]) {
            e.preventDefault()
            setReaderOpenId(list[idx].id)
          }
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSaveToggle, handleMarkRead])

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

      {/* Search bar */}
      <div className="relative">
        {searching
          ? <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin pointer-events-none" />
          : <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        }
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full pl-8 pr-8 py-1.5 text-sm bg-muted/50 border rounded-md outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setSearchResults(null) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {searchResults !== null && !searching && (
        <p className="text-xs text-muted-foreground -mt-1 px-0.5">
          {searchResults.length === 0
            ? t('searchNoResults')
            : t('searchResultCount', { count: searchResults.length })}
        </p>
      )}

      {/* Trending topics — only shown on main feed, no search/folder active */}
      {!feedId && !search && (
        <TrendingTopics
          onTagClick={(tag) => setActiveTag(activeTag === tag ? null : tag)}
          activeTag={activeTag}
        />
      )}

      {/* Tag filter chips */}
      {availableTags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap -mt-1">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                activeTag === tag
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Reader modal for compact/titles-view rows (no ArticleCard mounted) */}
      {(viewMode === 'compact' || viewMode === 'titles') && readerOpenId && (() => {
        const art = articles.find((a) => a.id === readerOpenId)
        if (!art) return null
        return (
          <ReaderModal
            url={art.url ?? ''}
            title={art.title ?? ''}
            articleId={art.id}
            fallbackSummary={art.ai_summary ?? art.description ?? undefined}
            onRead={() => handleMarkRead(art.id)}
            onClose={() => handleReaderClose(art.id)}
          />
        )
      })()}

      {/* Date + score filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'today', 'week'] as DateFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              dateFilter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            {t(f === 'all' ? 'dateAll' : f === 'today' ? 'dateToday' : 'dateWeek')}
          </button>
        ))}
        <div className="w-px bg-border self-stretch" />
        {[0, 50, 70, 85].map((score) => (
          <button
            key={score}
            onClick={() => {
              setMinScore(score)
              localStorage.setItem('feedwise-score', String(score))
            }}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              minScore === score
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            {score === 0 ? t('all') : `≥${score}`}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-col shrink-0">
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? t('unread', { count: unreadCount }) : t('allRead')}
            {' · '}{t('loaded', { count: dedupEnabled ? dedupedCount : visible.length })}
          </p>
          {dedupEnabled && visible.length > dedupedCount && (
            <span className="text-xs text-muted-foreground/60">
              ({t('dupeHidden', { count: visible.length - dedupedCount })})
            </span>
          )}
        </div>
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
            onClick={() => setBurstMode((v) => !v)}
            className={cn('transition-colors', burstMode ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
            title={burstMode ? 'Modo ráfaga activado — abre artículos en serie' : 'Modo ráfaga'}
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              const next: ViewMode = viewMode === 'card' ? 'compact' : viewMode === 'compact' ? 'titles' : 'card'
              setViewMode(next)
              localStorage.setItem('feedwise-view', next)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={viewMode === 'card' ? t('viewCompact') : viewMode === 'compact' ? t('viewTitles') : t('viewCard')}
          >
            {viewMode === 'card'
              ? <LayoutList className="h-4 w-4" />
              : viewMode === 'compact'
              ? <List className="h-4 w-4" />
              : <LayoutGrid className="h-4 w-4" />
            }
          </button>
          <div className="flex rounded-md border overflow-hidden text-xs">
            <button
              onClick={() => {
                setFilter('all')
                setUnreadSnapshot(new Set())
                // Offset for "all" = total articles already loaded
                offsetRef.current = articles.length
                hasMoreRef.current = true
                setHasMore(true)
              }}
              className={cn(
                'px-3 py-1 transition-colors',
                filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {t('all')}
            </button>
            <button
              onClick={() => {
                const unread = articles.filter((a) => !a.is_read)
                setFilter('unread')
                setUnreadSnapshot(new Set(unread.map((a) => a.id)))
                // Offset for "unread" = count of unread articles already loaded
                offsetRef.current = unread.length
                hasMoreRef.current = true
                setHasMore(true)
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

      {/* Article list grouped by date */}
      {viewMode === 'compact' && dateGrouped.map(({ bucket, groups: bucketGroups }) => (
        <div key={bucket}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1 pt-2 first:pt-0">
            {t(bucket)}
          </p>
          <div className="border rounded-lg overflow-hidden divide-y">
            {bucketGroups.map(({ main, dupes }) => {
              const isFocused = flatIndexMap.get(main.id) === focusedIdx && focusedIdx >= 0
              return (
                <div key={main.id} className={isFocused ? 'ring-2 ring-inset ring-primary/40' : ''}>
                  <div ref={(el) => attachReadRef(el, main.id)}>
                    {expandedCards.has(main.id) ? (
                      <div>
                        <button
                          onClick={() => toggleCard(main.id)}
                          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-muted/40 transition-colors border-b"
                        >
                          <ChevronUp className="h-3 w-3" />
                          {t('collapse')}
                        </button>
                        <div className="p-2">
                          <ArticleCard article={main} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} openReader={readerOpenId === main.id} onReaderClose={() => handleReaderClose(main.id)} />
                        </div>
                      </div>
                    ) : (
                      <SwipeableArticle
                        onSwipeLeft={() => { handleSaveToggle(main.id, !main.is_saved); fetch(`/api/articles/${main.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_saved: !main.is_saved }) }) }}
                        onSwipeRight={() => { handleMarkRead(main.id); fetch(`/api/articles/${main.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_read: true }) }) }}
                        onTap={() => toggleCard(main.id)}
                        onLongPress={() => setActionSheetArticle(main)}
                      >
                        <ArticleRow article={main} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} onExpand={() => toggleCard(main.id)} onOpenReader={() => setReaderOpenId(main.id)} />
                      </SwipeableArticle>
                    )}
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
                      {expandedCards.has(dupe.id) ? (
                        <div>
                          <button
                            onClick={() => toggleCard(dupe.id)}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground bg-muted/40 transition-colors border-b"
                          >
                            <ChevronUp className="h-3 w-3" />
                            {t('collapse')}
                          </button>
                          <div className="p-2">
                            <ArticleCard article={dupe} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} />
                          </div>
                        </div>
                      ) : (
                        <ArticleRow article={dupe} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} onExpand={() => toggleCard(dupe.id)} onOpenReader={() => setReaderOpenId(dupe.id)} />
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {viewMode === 'titles' && dateGrouped.map(({ bucket, groups: bucketGroups }) => (
        <div key={bucket}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1 pt-2 first:pt-0">
            {t(bucket)}
          </p>
          <div className="border rounded-lg overflow-hidden divide-y">
            {bucketGroups.map(({ main }) => {
              const isFocused = flatIndexMap.get(main.id) === focusedIdx && focusedIdx >= 0
              return (
                <div key={main.id} ref={(el) => attachReadRef(el, main.id)} className={isFocused ? 'ring-2 ring-inset ring-primary/40' : ''}>
                  <SwipeableArticle
                    onSwipeLeft={() => { handleSaveToggle(main.id, !main.is_saved); fetch(`/api/articles/${main.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_saved: !main.is_saved }) }) }}
                    onSwipeRight={() => { handleMarkRead(main.id); fetch(`/api/articles/${main.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_read: true }) }) }}
                    onTap={() => setReaderOpenId(main.id)}
                    onLongPress={() => setActionSheetArticle(main)}
                  >
                    <button
                      className={cn(
                        'w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
                        main.is_read && 'opacity-40'
                      )}
                      onClick={() => setReaderOpenId(main.id)}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', main.is_read ? 'bg-transparent' : 'bg-primary')} />
                      <span className="flex-1 truncate leading-snug">{main.title}</span>
                      {main.relevance_score != null && (
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/50">{main.relevance_score}</span>
                      )}
                    </button>
                  </SwipeableArticle>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {viewMode === 'card' && dateGrouped.map(({ bucket, groups: bucketGroups }) => (
        <div key={bucket}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1 pt-2 first:pt-0">
            {t(bucket)}
          </p>
          {bucketGroups.map(({ main, dupes }) => {
            const isFocused = flatIndexMap.get(main.id) === focusedIdx && focusedIdx >= 0
            return (
              <div key={main.id} className={isFocused ? 'ring-2 ring-primary/40 rounded-xl mb-0.5' : ''}>
                <div ref={(el) => attachReadRef(el, main.id)}>
                  <SwipeableArticle
                    onSwipeLeft={() => { handleSaveToggle(main.id, !main.is_saved); fetch(`/api/articles/${main.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_saved: !main.is_saved }) })  }}
                    onSwipeRight={() => { handleMarkRead(main.id); fetch(`/api/articles/${main.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_read: true }) }) }}
                    onLongPress={() => setActionSheetArticle(main)}
                  >
                    <ArticleCard article={main} onSaveToggle={handleSaveToggle} onMarkRead={handleMarkRead} openReader={readerOpenId === main.id} onReaderClose={() => handleReaderClose(main.id)} />
                  </SwipeableArticle>
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
            )
          })}
        </div>
      ))}

      {actionSheetArticle && (
        <ArticleActionSheet
          article={actionSheetArticle}
          onClose={() => setActionSheetArticle(null)}
          onOpenReader={() => setReaderOpenId(actionSheetArticle.id)}
          onSaveToggle={handleSaveToggle}
          onMarkRead={handleMarkRead}
        />
      )}

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

      {!hasMore && articles.length >= INITIAL_SIZE && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-xs text-muted-foreground text-center">
            {t('reachedEnd', { count: articles.length })}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t('markAllRead')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
