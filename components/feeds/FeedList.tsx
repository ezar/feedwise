'use client'

import { useState } from 'react'
import { Trash2, Rss, Clock, Sparkles, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/providers/ToastProvider'
import { cn } from '@/lib/utils'

interface Feed {
  id: string
  title?: string | null
  url: string
  feed_type: 'manual' | 'topic'
  topic_query?: string | null
  last_fetched_at?: string | null
  last_error?: string | null
}

interface FeedListProps {
  feeds: Feed[]
  onDeleted: (id: string) => void
}

export function FeedList({ feeds, onDeleted }: FeedListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDelete = async (feed: Feed) => {
    setDeleting(feed.id)
    try {
      const res = await fetch(`/api/feeds/${feed.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      onDeleted(feed.id)
      toast({ title: 'Feed eliminado', description: feed.title ?? feed.url })
    } catch {
      toast({ title: 'Error al eliminar el feed', variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border rounded-lg border-dashed">
        <Rss className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No tienes feeds todavía</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {feeds.map((feed) => (
        <li
          key={feed.id}
          className={cn(
            'flex items-center gap-3 p-3 border rounded-lg transition-opacity',
            feed.last_error && 'border-destructive/40 bg-destructive/5',
            deleting === feed.id && 'opacity-40 pointer-events-none'
          )}
        >
          {feed.last_error
            ? <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            : feed.feed_type === 'topic'
              ? <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              : <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
          }
          <Link href={`/feeds/${feed.id}`} className="flex-1 min-w-0 group">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {feed.title ?? feed.url}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {feed.last_error ? (
                <span className="text-xs text-destructive truncate max-w-[260px]">
                  {feed.last_error}
                </span>
              ) : (
                <>
                  <Badge variant={feed.feed_type === 'topic' ? 'default' : 'outline'} className="text-xs">
                    {feed.feed_type === 'topic' ? 'Tema IA' : 'Manual'}
                  </Badge>
                  {feed.topic_query && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {feed.topic_query}
                    </span>
                  )}
                  {feed.last_fetched_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(feed.last_fetched_at).toLocaleString('es-ES', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </>
              )}
            </div>
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(feed)}
            disabled={deleting === feed.id}
            title="Eliminar feed"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
