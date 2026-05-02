'use client'

import { useState } from 'react'
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/providers/ToastProvider'

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
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
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
      toast({
        title: 'Error generando temas',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      await onConfirm(previews)
      toast({ title: `${previews.length} feed${previews.length > 1 ? 's' : ''} creados` })
      setText('')
      setPreviews([])
    } catch {
      toast({ title: 'Error creando feeds', variant: 'destructive' })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Ej: quiero noticias de IA aplicada a productividad, sin fundraising ni inversión..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="resize-none"
      />
      <Button
        onClick={handleGenerate}
        disabled={loading || !text.trim()}
        className="self-start"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Sparkles className="h-4 w-4" />
        }
        {loading ? 'Analizando...' : 'Generar con IA'}
      </Button>

      {previews.length > 0 && (
        <div className="flex flex-col gap-3 border rounded-lg p-4 bg-muted/40 mt-1">
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
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            size="sm"
            className="self-start mt-1"
          >
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar y crear feeds
          </Button>
        </div>
      )}
    </div>
  )
}
