'use client'

import { useEffect, useState, useRef } from 'react'
import { X, ExternalLink, Loader2, BookOpen, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReaderContent {
  title: string
  byline?: string | null
  siteName?: string | null
  content: string
  textLength: number
}

interface ReaderModalProps {
  url: string
  title: string
  fallbackSummary?: string | null
  onClose: () => void
}

function readingTime(chars: number) {
  const words = Math.round(chars / 5)
  const mins = Math.max(1, Math.round(words / 200))
  return `~${mins} min`
}

export function ReaderModal({ url, title, fallbackSummary, onClose }: ReaderModalProps) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [content, setContent] = useState<ReaderContent | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/articles/reader?url=${encodeURIComponent(url)}`, {
          credentials: 'include',
        })
        const data = await res.json() as ReaderContent & { error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? 'Error')
        setContent(data)
        setState('ok')
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Error loading content')
        setState('error')
      }
    }
    void fetchContent()
  }, [url])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-background w-full sm:max-w-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate text-muted-foreground">
              {content?.siteName ?? new URL(url).hostname}
            </span>
            {content && content.textLength > 0 && (
              <span className="text-xs text-muted-foreground/60 shrink-0">
                · {readingTime(content.textLength)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Open original"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6 sm:px-8">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Cargando artículo…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 text-muted-foreground bg-muted/50 rounded-lg p-4">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">No se pudo cargar el contenido</p>
                  <p className="text-xs mt-0.5 opacity-70">{errorMsg}</p>
                </div>
              </div>
              {fallbackSummary && (
                <div>
                  <h2 className="font-semibold text-lg leading-snug mb-3">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">{fallbackSummary}</p>
                </div>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir artículo original
              </a>
            </div>
          )}

          {state === 'ok' && content && (
            <article>
              <h1 className="font-bold text-xl sm:text-2xl leading-snug mb-3">
                {content.title || title}
              </h1>
              {(content.byline) && (
                <p className="text-sm text-muted-foreground mb-5">{content.byline}</p>
              )}
              <div
                className={cn(
                  'prose prose-sm dark:prose-invert max-w-none',
                  'prose-headings:font-semibold prose-headings:leading-snug',
                  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                  'prose-img:rounded-lg prose-img:max-w-full',
                  'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
                  'prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded',
                  'prose-pre:bg-muted prose-pre:text-xs',
                )}
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
