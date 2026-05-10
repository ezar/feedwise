'use client'

import { useState } from 'react'
import { Trash2, Rss, Clock, Sparkles, ChevronRight, AlertCircle, FolderPlus, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/providers/ToastProvider'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SwipeableArticle } from '@/components/articles/SwipeableArticle'

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

interface FeedListProps {
  feeds: Feed[]
  onDeleted: (id: string) => void
}

function FolderEditor({ feedId, initial }: { feedId: string; initial: string | null | undefined }) {
  const [editing, setEditing] = useState(false)
  const [folder, setFolder] = useState(initial ?? '')
  const [saving, setSaving] = useState(false)

  const save = async (value: string) => {
    setSaving(true)
    await fetch(`/api/feeds/${feedId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: value || null }),
    })
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => { e.preventDefault(); void save(folder) }}
      >
        <input
          autoFocus
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="Carpeta…"
          className="text-xs border rounded px-1.5 py-0.5 w-28 outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
        />
        <button type="submit" disabled={saving} className="text-xs text-primary hover:underline">OK</button>
        <button type="button" onClick={() => setEditing(false)}><X className="h-3 w-3 text-muted-foreground" /></button>
      </form>
    )
  }

  return folder ? (
    <button
      onClick={() => setEditing(true)}
      className="text-[10px] px-1.5 py-0.5 rounded border border-dashed text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
    >
      {folder}
    </button>
  ) : (
    <button
      onClick={() => setEditing(true)}
      title="Asignar carpeta"
      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
    >
      <FolderPlus className="h-3.5 w-3.5" />
    </button>
  )
}

export function FeedList({ feeds, onDeleted }: FeedListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(feeds.map((f) => [f.id, f.unread_count ?? 0]))
  )
  const { toast } = useToast()
  const t = useTranslations('feeds')

  const handleMarkFeedRead = async (feedId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [feedId]: 0 }))
    await fetch(`/api/articles/read-all?feed_id=${feedId}`, { method: 'POST', credentials: 'include' })
  }

  const handleDelete = async (feed: Feed) => {
    setDeleting(feed.id)
    try {
      const res = await fetch(`/api/feeds/${feed.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error()
      onDeleted(feed.id)
      toast({ title: t('deleted'), description: feed.title ?? feed.url })
    } catch {
      toast({ title: t('deleteError'), variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border rounded-lg border-dashed">
        <Rss className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {feeds.map((feed) => (
        <li key={feed.id} className="rounded-lg overflow-hidden">
          <SwipeableArticle
            onSwipeRight={unreadCounts[feed.id] ? () => handleMarkFeedRead(feed.id) : undefined}
          >
          <div
            className={cn(
              'flex items-center gap-3 p-3 border rounded-lg transition-opacity bg-background',
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
                    {feed.feed_type === 'topic' ? t('topicBadge') : t('manualBadge')}
                  </Badge>
                  {feed.topic_query && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {feed.topic_query}
                    </span>
                  )}
                  {feed.last_fetched_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(feed.last_fetched_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  )}
                </>
              )}
            </div>
          </Link>
          <div onClick={(e) => e.preventDefault()}>
            <FolderEditor feedId={feed.id} initial={feed.folder} />
          </div>
          {(unreadCounts[feed.id] ?? 0) > 0 && (
            <span className="text-xs font-medium tabular-nums bg-primary/10 text-primary rounded-full px-2 py-0.5 shrink-0">
              {unreadCounts[feed.id]}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(feed)}
            disabled={deleting === feed.id}
            title={t('deleteTitle')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          </div>
          </SwipeableArticle>
        </li>
      ))}
    </ul>
  )
}
