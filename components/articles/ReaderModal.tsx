'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ExternalLink, Loader2, BookOpen, AlertCircle, Highlighter, Trash2, Bookmark, BookmarkCheck, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { ShareButton } from './ShareButton'

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
  articleId: string
  fallbackSummary?: string | null
  isSaved?: boolean
  onSaveToggle?: (id: string, saved: boolean) => void
  onClose: () => void
}

interface Highlight {
  id: string
  text: string
  created_at: string
}

function readingTime(chars: number) {
  const mins = Math.max(1, Math.round(chars / 5 / 200))
  return `~${mins} min`
}

type FontSize = 'sm' | 'base' | 'lg' | 'xl'
const FONT_SIZES: FontSize[] = ['sm', 'base', 'lg', 'xl']
const FONT_SIZE_PX: Record<FontSize, string> = {
  sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
}

export function ReaderModal({ url, title, articleId, fallbackSummary, isSaved = false, onSaveToggle, onClose }: ReaderModalProps) {
  const t = useTranslations('article')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [content, setContent] = useState<ReaderContent | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [fontSize, setFontSize] = useState<FontSize>(() =>
    (typeof window !== 'undefined' ? (localStorage.getItem('feedwise-reader-font') as FontSize | null) : null) ?? 'base'
  )
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [showHighlights, setShowHighlights] = useState(false)
  const [saved, setSaved] = useState(isSaved)
  const [aiSummary, setAiSummary] = useState<string | null>(fallbackSummary ?? null)
  const [showSummary, setShowSummary] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLDivElement>(null)

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
        const msg = e instanceof Error ? e.message : 'Error'
        // Hide internal JSDOM/parser errors from users
        const isInternalError = msg.includes('pattern') || msg.includes('jsdom') || msg.includes('Parse error')
        setErrorMsg(isInternalError ? t('loadError') : msg)
        setState('error')
      }
    }
    void fetchContent()
  }, [url, t])

  useEffect(() => {
    fetch(`/api/articles/${articleId}/highlights`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { highlights?: Highlight[] }) => setHighlights(d.highlights ?? []))
      .catch(() => {})
  }, [articleId])

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!text || text.length < 5 || !articleRef.current) {
      setTooltip(null)
      return
    }
    const range = selection!.getRangeAt(0)
    if (!articleRef.current.contains(range.commonAncestorContainer)) {
      setTooltip(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const modalRect = articleRef.current.closest('.reader-scroll')?.getBoundingClientRect()
    if (!modalRect) return
    setTooltip({
      x: rect.left + rect.width / 2 - modalRect.left,
      y: rect.top - modalRect.top - 8,
      text,
    })
  }, [])

  const saveHighlight = useCallback(async () => {
    if (!tooltip) return
    const text = tooltip.text
    setTooltip(null)
    window.getSelection()?.removeAllRanges()
    const res = await fetch(`/api/articles/${articleId}/highlights`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (res.ok) {
      const d = await res.json() as { highlight: Highlight }
      setHighlights((prev) => [...prev, d.highlight])
      setShowHighlights(true)
    }
  }, [tooltip, articleId])

  const deleteHighlight = useCallback(async (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
    await fetch(`/api/articles/${articleId}/highlights?highlight_id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
  }, [articleId])

  const handleSave = useCallback(() => {
    const next = !saved
    setSaved(next)
    onSaveToggle?.(articleId, next)
    fetch(`/api/articles/${articleId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_saved: next }),
    })
  }, [saved, articleId, onSaveToggle])

  const handleSummary = useCallback(async () => {
    if (aiSummary) {
      setShowSummary((v) => !v)
      return
    }
    setLoadingSummary(true)
    setShowSummary(true)
    try {
      const res = await fetch(`/api/articles/${articleId}/summarize`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json() as { summary?: string }
        if (data.summary) setAiSummary(data.summary)
      }
    } catch { /* silent */ } finally {
      setLoadingSummary(false)
    }
  }, [aiSummary, articleId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tooltip) { setTooltip(null); return }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, tooltip])

  useEffect(() => {
    if (!tooltip) return
    const dismiss = () => setTooltip(null)
    window.addEventListener('mousedown', dismiss)
    return () => window.removeEventListener('mousedown', dismiss)
  }, [tooltip])

  const hostname = (() => { try { return new URL(url).hostname } catch { return '' } })()

  const modal = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="bg-background flex flex-col w-full max-w-2xl rounded-t-2xl sm:rounded-xl shadow-2xl"
        style={{ height: 'min(92vh, 820px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0">
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
            {highlights.length > 0 && (
              <button
                onClick={() => setShowHighlights((v) => !v)}
                className={cn(
                  'p-1.5 rounded-md transition-colors relative',
                  showHighlights
                    ? 'text-yellow-500 bg-yellow-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                title="Highlights"
              >
                <Highlighter className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 text-[9px] bg-yellow-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                  {highlights.length}
                </span>
              </button>
            )}
            <button
              onClick={() => changeFontSize(-1)}
              disabled={fontSize === 'sm'}
              className="px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >A-</button>
            <button
              onClick={() => changeFontSize(1)}
              disabled={fontSize === 'xl'}
              className="px-1.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >A+</button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Highlights panel */}
        {showHighlights && highlights.length > 0 && (
          <div className="border-b px-6 py-3 bg-yellow-50/50 dark:bg-yellow-950/20 flex flex-col gap-2 max-h-48 overflow-y-auto shrink-0">
            <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
              {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
            </p>
            {highlights.map((h) => (
              <div key={h.id} className="flex items-start gap-2 group">
                <span className="flex-1 text-xs leading-relaxed border-l-2 border-yellow-400 pl-2 text-foreground/80 italic">
                  {h.text}
                </span>
                <button
                  onClick={() => void deleteHighlight(h.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* AI summary panel */}
        {showSummary && (
          <div className="border-b px-6 py-3 bg-primary/5 flex flex-col gap-2 max-h-48 overflow-y-auto shrink-0">
            <p className="text-xs font-semibold text-primary flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t('summaryTitle')}
            </p>
            {loadingSummary
              ? <div className="flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="h-3 w-3 animate-spin" />{t('summarizing')}</div>
              : <p className="text-sm leading-relaxed text-foreground/80">{aiSummary}</p>
            }
          </div>
        )}

        {/* Scrollable body */}
        <div className="reader-scroll flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 relative min-h-0" onMouseUp={handleMouseUp}>
          {tooltip && (
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-full"
              style={{ left: tooltip.x, top: tooltip.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => void saveHighlight()}
                className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-lg transition-colors whitespace-nowrap"
              >
                <Highlighter className="h-3 w-3" />
                {t('saveHighlight')}
              </button>
              <div className="w-2 h-2 bg-yellow-400 rotate-45 mx-auto -mt-1" />
            </div>
          )}

          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">{t('loading')}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 text-muted-foreground bg-muted/50 rounded-lg p-4">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t('loadError')}</p>
                  <p className="text-xs mt-0.5 opacity-70">{errorMsg}</p>
                </div>
              </div>
              {fallbackSummary && (
                <div>
                  <h2 className="font-semibold text-lg leading-snug mb-3">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{fallbackSummary}</p>
                </div>
              )}
            </div>
          )}

          {state === 'ok' && content && (
            <article ref={articleRef}>
              <h1 className="font-bold text-xl sm:text-2xl leading-snug mb-2">
                {content.title || title}
              </h1>
              {content.byline && (
                <p className="text-sm text-muted-foreground mb-5">{content.byline}</p>
              )}
              <div
                style={{ fontSize: FONT_SIZE_PX[fontSize] }}
                className={cn(
                  'prose dark:prose-invert max-w-none',
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

        {/* Bottom bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                saved
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span className="hidden sm:inline">{saved ? t('saved') : t('save')}</span>
            </button>
            <button
              onClick={() => void handleSummary()}
              disabled={loadingSummary}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                showSummary
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {loadingSummary
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />
              }
              <span className="hidden sm:inline">{t('summarize')}</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <ShareButton articleId={articleId} title={content?.title ?? title} url={url} summary={aiSummary} />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">{t('openOriginal')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
