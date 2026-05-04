'use client'

import { useState } from 'react'
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslations } from 'next-intl'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const t = useTranslations('topic')

  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setPreviews([])
    setSelected(new Set())
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
      if (!data.preview?.length) throw new Error(t('notFound'))
      setPreviews(data.preview)
      setSelected(new Set(data.preview.map((p) => p.url)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createError'))
    } finally {
      setLoading(false)
    }
  }

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) {
        next.delete(url)
      } else {
        next.add(url)
      }
      return next
    })
  }

  const handleConfirm = async () => {
    const chosen = previews.filter((p) => selected.has(p.url))
    if (!chosen.length) return
    setConfirming(true)
    setError(null)
    try {
      await onConfirm(chosen)
      setSuccess(true)
      setText('')
      setPreviews([])
      setSelected(new Set())
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError(t('createError'))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder={t('placeholder')}
        value={text}
        onChange={(e) => { setText(e.target.value); setError(null) }}
        rows={3}
        className="resize-none"
      />

      <Button onClick={handleGenerate} disabled={loading || !text.trim()} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? t('generating') : t('generate')}
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
          {t('createSuccess')}
        </div>
      )}

      {previews.length > 0 && (
        <div className="flex flex-col gap-3 border rounded-lg p-4 bg-muted/40">
          <p className="text-sm font-medium">
            {t('suggests', { count: previews.length })}
          </p>
          <ul className="flex flex-col gap-2">
            {previews.map((p) => (
              <li
                key={p.url}
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => toggle(p.url)}
              >
                <Checkbox
                  checked={selected.has(p.url)}
                  onCheckedChange={() => toggle(p.url)}
                />
                <span className="text-sm font-medium flex-1">{p.query}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={handleConfirm}
            disabled={confirming || selected.size === 0}
            size="sm"
            className="self-start mt-1"
          >
            {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('create', { count: selected.size })}
          </Button>
        </div>
      )}
    </div>
  )
}
