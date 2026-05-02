'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
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

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setPreviews([])
    try {
      const res = await fetch('/api/feeds/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json() as { preview?: TopicPreview[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error generando temas')
      setPreviews(data.preview ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm(previews)
      setText('')
      setPreviews([])
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Quiero noticias de IA aplicada a productividad, sin fundraising..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <Button onClick={handleGenerate} disabled={loading || !text.trim()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Generar feeds
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {previews.length > 0 && (
        <div className="flex flex-col gap-2 border rounded-md p-3">
          <p className="text-sm font-medium">Feeds a crear:</p>
          {previews.map((p) => (
            <div key={p.url} className="flex items-center gap-2">
              <Badge variant="outline">{p.query}</Badge>
              <span className="text-xs text-muted-foreground truncate">{p.url}</span>
            </div>
          ))}
          <Button onClick={handleConfirm} disabled={confirming} size="sm" className="mt-1">
            {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmar y guardar
          </Button>
        </div>
      )}
    </div>
  )
}
