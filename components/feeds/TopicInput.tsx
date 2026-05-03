'use client'

import { useState } from 'react'
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface TopicPreview {
  query: string
  url: string
  title: string
}

interface TopicInputProps {
  onConfirm: (previews: TopicPreview[]) => Promise<void>
}

export function TopicInput({ onConfirm }: TopicInputProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [previews, setPreviews] = useState<TopicPreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setPreviews([])
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch('/api/feeds/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      })
      const data = await res.json() as { preview?: TopicPreview[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      if (!data.preview?.length) throw new Error('Claude no encontró queries para ese texto')
      setPreviews(data.preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    setError(null)
    try {
      await onConfirm(previews)
      setSuccess(true)
      setText('')
      setPreviews([])
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Error creando los feeds')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Ej: quiero noticias de IA aplicada a productividad, sin fundraising ni inversión..."
        value={text}
        onChange={(e) => { setText(e.target.value); setError(null) }}
        rows={3}
        className="resize-none"
      />

      <Button onClick={handleGenerate} disabled={loading || !text.trim()} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? 'Analizando con Claude…' : 'Generar con IA'}
      </Button>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Feeds creados correctamente
        </div>
      )}

      {previews.length > 0 && (
        <div className="flex flex-col gap-3 border rounded-lg p-4 bg-muted/40">
          <p className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Claude sugiere {previews.length} feed{previews.length > 1 ? 's' : ''}:
          </p>
          <ul className="flex flex-col gap-1.5">
            {previews.map((p) => (
              <li key={p.url} className="flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">{p.query}</Badge>
                <span className="text-xs text-muted-foreground truncate">{p.url}</span>
              </li>
            ))}
          </ul>
          <Button onClick={handleConfirm} disabled={confirming} size="sm" className="self-start mt-1">
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar y crear feeds
          </Button>
        </div>
      )}
    </div>
  )
}
