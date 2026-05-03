'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedForm } from '@/components/feeds/FeedForm'
import { FeedList } from '@/components/feeds/FeedList'
import { TopicInput } from '@/components/feeds/TopicInput'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Feed {
  id: string
  title?: string | null
  url: string
  feed_type: 'manual' | 'topic'
  topic_query?: string | null
  last_fetched_at?: string | null
}

interface TopicPreview {
  query: string
  url: string
  title: string
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])

  const loadFeeds = useCallback(async () => {
    const res = await fetch('/api/feeds', { credentials: 'include' })
    const data = await res.json() as { feeds?: Feed[] }
    setFeeds(data.feeds ?? [])
  }, [])

  useEffect(() => { void loadFeeds() }, [loadFeeds])

  const handleTopicConfirm = async (previews: TopicPreview[]) => {
    await Promise.all(
      previews.map((p) =>
        fetch('/api/feeds', { credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: p.url, title: p.title, feed_type: 'topic', topic_query: p.query }),
        })
      )
    )
    await loadFeeds()
  }

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
        <h3 className="text-base font-medium mb-3">Feeds activos ({feeds.length})</h3>
        <FeedList feeds={feeds} onDeleted={(id) => setFeeds((f) => f.filter((x) => x.id !== id))} />
      </div>
    </div>
  )
}
