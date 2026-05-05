'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedForm } from '@/components/feeds/FeedForm'
import { FeedList } from '@/components/feeds/FeedList'
import { FeedListSkeleton } from '@/components/feeds/FeedSkeleton'
import { TopicInput } from '@/components/feeds/TopicInput'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Feed {
  id: string
  title?: string | null
  url: string
  feed_type: 'manual' | 'topic'
  topic_query?: string | null
  last_fetched_at?: string | null
  folder?: string | null
}

interface TopicPreview {
  query: string
  url: string
  title: string
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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
  const filtered = q
    ? feeds.filter((f) =>
        (f.title ?? f.url).toLowerCase().includes(q) ||
        f.topic_query?.toLowerCase().includes(q)
      )
    : feeds

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">Gestión de feeds</h2>
      <Tabs defaultValue="topic">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="topic" className="flex-1">Por tema</TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="topic">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Describe qué quieres leer</CardTitle>
              <CardDescription>Claude extrae las queries y crea feeds de Google News automáticamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <TopicInput onConfirm={handleTopicConfirm} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Añadir feed RSS</CardTitle>
              <CardDescription>Pega la URL de cualquier feed RSS o Atom.</CardDescription>
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
            Feeds activos {!loading && `(${feeds.length})`}
          </h3>
        </div>

        {!loading && feeds.length > 5 && (
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar feeds…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        )}

        {loading ? (
          <FeedListSkeleton />
        ) : (
          <FeedList
            feeds={filtered}
            onDeleted={(id) => setFeeds((f) => f.filter((x) => x.id !== id))}
          />
        )}

        {!loading && q && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay feeds que coincidan con &ldquo;{search}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
