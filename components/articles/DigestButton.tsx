'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DigestButtonProps {
  feedId: string
}

export function DigestButton({ feedId }: DigestButtonProps) {
  const [loading, setLoading] = useState(false)
  const [digest, setDigest] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/feeds/${feedId}/digest`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json() as { digest?: string | null; count?: number; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al generar el digest')
        return
      }
      if (!data.digest) {
        setDigest(null)
        setCount(0)
        setOpen(true)
        return
      }
      setDigest(data.digest)
      setCount(data.count ?? 0)
      setOpen(true)
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {digest ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Digest IA
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={generate}
            disabled={loading}
            className="gap-1.5"
          >
            {loading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? 'Generando…' : 'Digest IA'}
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {open && (
        <div className="rounded-lg border bg-muted/40 p-4">
          {digest ? (
            <>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                Resumen de {count} artículo{count !== 1 ? 's' : ''} no leídos
              </p>
              <div
                className={cn('prose prose-sm dark:prose-invert max-w-none text-sm')}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(digest) }}
              />
              <button
                onClick={() => { setDigest(null); setOpen(false) }}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
              >
                Regenerar
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hay artículos no leídos en este feed.</p>
          )}
        </div>
      )}
    </div>
  )
}

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ol>${m}</ol>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hol])(.+)$/gm, (m) => m.startsWith('<') ? m : m)
    .replace(/^(.+)$(?!\n)/gm, (m) => (m.startsWith('<') ? m : `<p>${m}</p>`))
    .replace(/<p><\/p>/g, '')
}
