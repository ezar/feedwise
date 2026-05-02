'use client'

import { useState } from 'react'
import { Trash2, Rss, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Feed {
  id: string
  title?: string | null
  url: string
  feed_type: 'manual' | 'topic'
  topic_query?: string | null
  last_fetched_at?: string | null
}

interface FeedListProps {
  feeds: Feed[]
  onDeleted: (id: string) => void
}

export function FeedList({ feeds, onDeleted }: FeedListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/feeds/${id}`, { method: 'DELETE' })
      onDeleted(id)
    } finally {
      setDeleting(null)
    }
  }

  if (feeds.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No tienes feeds todavía.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {feeds.map((feed) => (
        <li key={feed.id} className="flex items-center gap-3 p-3 border rounded-md">
          <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{feed.title ?? feed.url}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs">
                {feed.feed_type === 'topic' ? 'Tema' : 'Manual'}
              </Badge>
              {feed.last_fetched_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(feed.last_fetched_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => handleDelete(feed.id)}
            disabled={deleting === feed.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
