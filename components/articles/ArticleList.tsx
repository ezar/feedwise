'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Newspaper, StickyNote } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ArticleCard } from './ArticleCard'

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

interface ArticleListProps {
  initialArticles: Article[]
  emptyMessage?: string
  emptyHint?: string
  showNotes?: boolean
}

function NoteEditor({ articleId, initialNote }: { articleId: string; initialNote?: string | null }) {
  const t = useTranslations('saved')
  const [open, setOpen] = useState(!!initialNote)
  const [note, setNote] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (value: string) => {
    setSaving(true)
    await fetch(`/api/articles/${articleId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: value || null }),
    })
    setSaving(false)
  }, [articleId])

  const handleChange = (value: string) => {
    setNote(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void save(value), 800)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-4 pb-2 -mt-1"
      >
        <StickyNote className="h-3 w-3" />
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

export function ArticleList({
  initialArticles,
  emptyMessage,
  emptyHint,
  showNotes = false,
}: ArticleListProps) {
  const t = useTranslations('saved')
  const [articles, setArticles] = useState(initialArticles)

  useEffect(() => { setArticles(initialArticles) }, [initialArticles])

  const handleSaveToggle = useCallback((id: string, saved: boolean) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_saved: saved } : a)))
  }, [])

  const handleMarkRead = useCallback((id: string) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
  }, [])

  const resolvedEmptyMessage = emptyMessage ?? t('empty')
  const resolvedEmptyHint = emptyHint ?? t('emptyHint')

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">{resolvedEmptyMessage}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{resolvedEmptyHint}</p>
      </div>
    )
  }

  const unreadCount = articles.filter((a) => !a.is_read).length

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unreadCount} sin leer · {articles.length} total
        </p>
      )}
      {articles.map((article) => (
        <div key={article.id} className="flex flex-col">
          <ArticleCard
            article={article}
            onSaveToggle={handleSaveToggle}
            onMarkRead={handleMarkRead}
          />
          {showNotes && (
            <NoteEditor articleId={article.id} initialNote={article.note} />
          )}
        </div>
      ))}
    </div>
  )
}
