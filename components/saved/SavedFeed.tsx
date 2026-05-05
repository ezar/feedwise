'use client'

import { useState, useCallback } from 'react'
import { Loader2, Newspaper } from 'lucide-react'
import { ArticleCard } from '@/components/articles/ArticleCard'
import { useTranslations } from 'next-intl'

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
  note?: string | null
  feeds?: { title?: string | null } | null
}

interface NoteEditorProps {
  articleId: string
  initialNote?: string | null
}

function NoteEditor({ articleId, initialNote }: NoteEditorProps) {
  const t = useTranslations('saved')
  const [open, setOpen] = useState(!!initialNote)
  const [note, setNote] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null }

  const save = async (value: string) => {
    setSaving(true)
    await fetch(`/api/articles/${articleId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: value || null }),
    })
    setSaving(false)
  }

  const handleChange = (value: string) => {
    setNote(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void save(value), 800)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-4 pb-2 -mt-1"
      >
        {t('addNote')}
      </button>
    )
  }

  return (
    <div className="px-4 pb-3 -mt-1">
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('notePlaceholder')}
        rows={2}
        className="w-full text-xs text-muted-foreground bg-muted/40 border rounded-md px-2.5 py-1.5 resize-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
        autoFocus={!initialNote}
      />
      <p className="text-[10px] text-muted-foreground/40 mt-0.5">
        {saving ? t('noteSaving') : t('noteSaved')}
      </p>
    </div>
  )
}

const PAGE_SIZE = 100

export function SavedFeed({ initialArticles }: { initialArticles: Article[] }) {
  const t = useTranslations('saved')
  const [articles, setArticles] = useState(initialArticles)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialArticles.length === PAGE_SIZE)
  const [loading, setLoading] = useState(false)

  const handleSaveToggle = useCallback((id: string, saved: boolean) => {
    if (!saved) {
      // Remove unsaved articles from the saved list immediately
      setArticles((prev) => prev.filter((a) => a.id !== id))
    } else {
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_saved: true } : a)))
    }
  }, [])

  const handleMarkRead = useCallback((id: string) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
  }, [])

  const loadMore = async () => {
    setLoading(true)
    try {
      const next = page + 1
      const res = await fetch(`/api/articles?saved=true&page=${next}`, { credentials: 'include' })
      if (!res.ok) { setHasMore(false); return }
      const data = await res.json() as { articles?: Article[] }
      const more = data.articles ?? []
      setArticles((prev) => [...prev, ...more])
      setPage(next)
      setHasMore(more.length === PAGE_SIZE)
    } finally {
      setLoading(false)
    }
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium">{t('empty')}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{t('emptyHint')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {articles.map((article) => (
        <div key={article.id} className="flex flex-col">
          <ArticleCard
            article={article}
            onSaveToggle={handleSaveToggle}
            onMarkRead={handleMarkRead}
          />
          <NoteEditor articleId={article.id} initialNote={article.note} />
        </div>
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? t('loadingMore') : t('loadMore')}
        </button>
      )}

      {!hasMore && articles.length >= PAGE_SIZE && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t('allLoaded', { count: articles.length })}
        </p>
      )}
    </div>
  )
}
