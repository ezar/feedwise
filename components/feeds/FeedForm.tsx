'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/providers/ToastProvider'

interface FeedFormProps {
  onAdded: () => void
}

export function FeedForm({ onAdded }: FeedFormProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url, title: title || undefined, feed_type: 'manual' }),
      })
      const data = await res.json() as { error?: string; warning?: string }
      if (!res.ok) throw new Error(data.error ?? 'Error añadiendo feed')
      setUrl('')
      setTitle('')
      onAdded()
      toast({
        title: 'Feed añadido correctamente',
        description: data.warning,
        variant: data.warning ? 'destructive' : undefined,
      })
    } catch (err) {
      toast({
        title: 'Error al añadir feed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="feed-url">URL del feed RSS</Label>
        <Input
          id="feed-url"
          type="url"
          placeholder="https://example.com/feed.xml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1"
          required
        />
      </div>
      <div>
        <Label htmlFor="feed-title">Nombre (opcional)</Label>
        <Input
          id="feed-title"
          placeholder="Mi blog favorito"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={loading || !url.trim()} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Añadir feed
      </Button>
    </form>
  )
}
