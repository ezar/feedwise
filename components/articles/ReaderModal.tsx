'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const mins = Math.max(1, Math.round(chars / 5 / 200))
  return `~${mins} min`
}

type FontSize = 'sm' | 'base' | 'lg' | 'xl'
const FONT_SIZES: FontSize[] = ['sm', 'base', 'lg', 'xl']
const FONT_PROSE: Record<FontSize, string> = {
  sm: 'prose-sm', base: 'prose-base', lg: 'prose-lg', xl: 'prose-xl',
}

export function ReaderModal({ url, title, fallbackSummary, onClose }: ReaderModalProps) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [content, setContent] = useState<ReaderContent | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [fontSize, setFontSize] = useState<FontSize>(() =>
    (typeof window !== 'undefined' ? (localStorage.getItem('feedwise-reader-font') as FontSize | null) : null) ?? 'base'
  )
  const backdropRef = useRef<HTMLDivElement>(null)

  const changeFontSize = (dir: 1 | -1) => {
    setFontSize((prev) => {
      const idx = Math.max(0, Math.min(FONT_SIZES.length - 1, FONT_SIZES.indexOf(prev) + dir))
      const next = FONT_SIZES[idx]
      localStorage.setItem('feedwise-reader-font', next)
      return next
    })
  }

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Prevent body scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const hostname = (() => { try { return new URL(url).hostname } catch { return '' } })()

  const modal = (
    // Backdrop
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      {/* Modal box — fixed size so internal scroll works */}
      <div
        className="bg-background rounded-xl shadow-2xl flex flex-col w-full max-w-2xl"
        style={{ height: 'min(90vh, 800px)' }}
      >
        {/* Header — never scrolls */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0 rounded-t-xl">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground truncate">
              {content?.siteName ?? hostname}
            </span>
            {content && content.textLength > 0 && (
              <span className="text-xs text-muted-foreground/60 shrink-0">
                · {readingTime(content.textLength)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => changeFontSize(-1)}
              disabled={fontSize === 'sm'}
              className="px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Reducir texto"
            >A-</button>
            <button
              onClick={() => changeFontSize(1)}
              disabled={fontSize === 'xl'}
              className="px-1.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Ampliar texto"
            >A+</button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Abrir original"
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Cargando artículo…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 text-muted-foreground bg-muted/50 rounded-lg p-4">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">No se pudo cargar el contenido completo</p>
                  <p className="text-xs mt-0.5 opacity-70">{errorMsg}</p>
                </div>
              </div>
              {fallbackSummary && (
                <div>
                  <h2 className="font-semibold text-lg leading-snug mb-3">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{fallbackSummary}</p>
                </div>
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir artículo original
              </a>
            </div>
          )}

          {state === 'ok' && content && (
            <article>
              <h1 className="font-bold text-xl sm:text-2xl leading-snug mb-2">
                {content.title || title}
              </h1>
              {content.byline && (
                <p className="text-sm text-muted-foreground mb-5">{content.byline}</p>
              )}
              <div
                className={cn(
                  'prose dark:prose-invert max-w-none', FONT_PROSE[fontSize],
                  'prose-headings:font-semibold prose-headings:leading-snug',
                  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
                  'prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto',
                  'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
                  'prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
                  'prose-pre:bg-muted prose-pre:text-xs',
                  'prose-figure:my-4',
                )}
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            </article>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
