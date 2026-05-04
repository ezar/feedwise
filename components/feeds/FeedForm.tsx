'use client'

import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/providers/ToastProvider'
import { useTranslations } from 'next-intl'

interface FeedFormProps {
  onAdded: () => void
}

export function FeedForm({ onAdded }: FeedFormProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const t = useTranslations('feeds')

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
      if (!res.ok) throw new Error(data.error ?? t('addError'))
      setUrl('')
      setTitle('')
      onAdded()
      toast({
        title: t('addSuccess'),
        description: data.warning,
        variant: data.warning ? 'destructive' : undefined,
      })
    } catch (err) {
      toast({
        title: t('addError'),
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
        <Label htmlFor="feed-url">{t('urlLabel')}</Label>
        <Input
          id="feed-url"
          type="url"
          placeholder={t('urlPlaceholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1"
          required
        />
      </div>
      <div>
        <Label htmlFor="feed-title">{t('nameLabel')}</Label>
        <Input
          id="feed-title"
          placeholder={t('namePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={loading || !url.trim()} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {t('addButton')}
      </Button>
    </form>
  )
}
