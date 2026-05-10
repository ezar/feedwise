'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, ExternalLink, Bookmark, BookmarkCheck, CheckCheck } from 'lucide-react'
import { ShareButton } from './ShareButton'

interface Article {
  id: string
  title: string
  url: string
  ai_summary?: string | null
  is_read: boolean
  is_saved: boolean
}

interface ArticleActionSheetProps {
  article: Article
  onClose: () => void
  onOpenReader: () => void
  onSaveToggle: (id: string, saved: boolean) => void
  onMarkRead: (id: string) => void
}

export function ArticleActionSheet({ article, onClose, onOpenReader, onSaveToggle, onMarkRead }: ArticleActionSheetProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleSave = () => {
    const next = !article.is_saved
    onSaveToggle(article.id, next)
    fetch(`/api/articles/${article.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_saved: next }),
    }).catch(() => {})
    onClose()
  }

  const handleMarkRead = () => {
    onMarkRead(article.id)
    fetch(`/api/articles/${article.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    }).catch(() => {})
    onClose()
  }

  const sheet = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="bg-background w-full rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <p className="px-5 py-2 text-sm font-medium line-clamp-2 text-foreground/70 leading-snug">{article.title}</p>
        <div className="h-px bg-border" />
        <div className="py-1">
          <button
            onClick={() => { onOpenReader(); onClose() }}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted transition-colors text-sm"
          >
            <BookOpen className="h-5 w-5 text-muted-foreground shrink-0" />
            Abrir en lector
          </button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted transition-colors text-sm"
          >
            <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
            Abrir original
          </a>
          <button
            onClick={handleSave}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted transition-colors text-sm"
          >
            {article.is_saved
              ? <BookmarkCheck className="h-5 w-5 text-primary shrink-0" />
              : <Bookmark className="h-5 w-5 text-muted-foreground shrink-0" />
            }
            {article.is_saved ? 'Quitar de guardados' : 'Guardar artículo'}
          </button>
          {!article.is_read && (
            <button
              onClick={handleMarkRead}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted transition-colors text-sm"
            >
              <CheckCheck className="h-5 w-5 text-green-600 shrink-0" />
              Marcar como leído
            </button>
          )}
          <div className="flex items-center gap-3 px-5 py-3.5">
            <ShareButton articleId={article.id} title={article.title} url={article.url} summary={article.ai_summary} />
            <span className="text-sm text-muted-foreground">Compartir</span>
          </div>
        </div>
        <div className="h-px bg-border" />
        <button
          onClick={onClose}
          className="w-full py-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
