'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ArrowDownUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedForm } from '@/components/feeds/FeedForm'
import { FeedList } from '@/components/feeds/FeedList'
import { FeedListSkeleton } from '@/components/feeds/FeedSkeleton'
import { TopicInput } from '@/components/feeds/TopicInput'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Feed {
  id: string
  title?: string | null
  url: string
  feed_type: 'manual' | 'topic'
  topic_query?: string | null
  last_fetched_at?: string | null
  last_error?: string | null
  folder?: string | null
  unread_count?: number
}

interface TopicPreview {
  query: string
  url: string
  title: string
}

type FeedFilter = 'all' | 'unread' | 'errors' | 'topic' | 'manual'

const FILTERS: FeedFilter[] = ['all', 'unread', 'errors', 'topic', 'manual']

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [sortByUnread, setSortByUnread] = useState(false)
  const t = useTranslations('feeds')

  const loadFeeds = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/feeds', { credentials: 'include' })
    const data = await res.json() as { feeds?: Feed[] }
    setFeeds(data.feeds ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void loadFeeds() }, [loadFeeds])

  const handleTopicConfirm = async (previews: TopicPreview[]) => {
    await Promise.all(
      previews.map((p) =>
        fetch('/api/feeds', {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: p.url, title: p.title, feed_type: 'topic', topic_query: p.query }),
        })
      )
    )
    await loadFeeds()
  }

  const q = search.trim().toLowerCase()

  const filterCounts: Record<FeedFilter, number> = {
    all: feeds.length,
    unread: feeds.filter((f) => (f.unread_count ?? 0) > 0).length,
    errors: feeds.filter((f) => !!f.last_error).length,
    topic: feeds.filter((f) => f.feed_type === 'topic').length,
    manual: feeds.filter((f) => f.feed_type === 'manual').length,
  }

  let filtered = feeds
  if (q) {
    filtered = filtered.filter((f) =>
      (f.title ?? f.url).toLowerCase().includes(q) ||
      f.topic_query?.toLowerCase().includes(q)
    )
  }
  if (filter === 'unread') filtered = filtered.filter((f) => (f.unread_count ?? 0) > 0)
  else if (filter === 'errors') filtered = filtered.filter((f) => !!f.last_error)
  else if (filter === 'topic') filtered = filtered.filter((f) => f.feed_type === 'topic')
  else if (filter === 'manual') filtered = filtered.filter((f) => f.feed_type === 'manual')

  if (sortByUnread) {
    filtered = [...filtered].sort((a, b) => (b.unread_count ?? 0) - (a.unread_count ?? 0))
  }

  const filterLabel = (f: FeedFilter) => {
    const count = filterCounts[f]
    const label = t(`filter_${f}`)
    return count > 0 && f !== 'all' ? `${label} (${count})` : label
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">{t('title')}</h2>
      <Tabs defaultValue="topic">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="topic" className="flex-1">{t('tabTopic')}</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">{t('tabManual')}</TabsTrigger>
        </TabsList>

        <TabsContent value="topic">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('addTopicTitle')}</CardTitle>
              <CardDescription>{t('addTopicDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <TopicInput onConfirm={handleTopicConfirm} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('addManualTitle')}</CardTitle>
              <CardDescription>{t('addManualDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FeedForm onAdded={loadFeeds} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">
            {t('activeFeeds')} {!loading && `(${feeds.length})`}
          </h3>
          {!loading && feeds.some((f) => (f.unread_count ?? 0) > 0) && (
            <button
              onClick={() => setSortByUnread((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
                sortByUnread
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              )}
            >
              <ArrowDownUp className="h-3 w-3" />
              {t('sortByUnread')}
            </button>
          )}
        </div>

        {!loading && feeds.length > 0 && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {FILTERS.filter((f) => f === 'all' || filterCounts[f] > 0).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap',
                    filter === f
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  {filterLabel(f)}
                </button>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <FeedListSkeleton />
        ) : (
          <FeedList
            feeds={filtered}
            onDeleted={(id) => setFeeds((f) => f.filter((x) => x.id !== id))}
          />
        )}

        {!loading && filtered.length === 0 && feeds.length > 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {q ? t('noMatch', { query: search }) : t('noMatchFilter')}
          </p>
        )}
      </div>
    </div>
  )
}
