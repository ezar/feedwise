'use client'

import { useState } from 'react'
import { Loader2, Save, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/providers/ToastProvider'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface InterestsFormProps {
  initialInterests: string
  initialThreshold: number
}

function getThresholdColor(value: number): string {
  if (value >= 75) return 'text-green-600'
  if (value >= 50) return 'text-yellow-600'
  return 'text-muted-foreground'
}

export function InterestsForm({ initialInterests, initialThreshold }: InterestsFormProps) {
  const [interests, setInterests] = useState(initialInterests)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [loading, setLoading] = useState(false)
  const [rescoring, setRescoring] = useState(false)
  const [rescoreResult, setRescoreResult] = useState<{ scored: number; remaining: number } | null>(null)
  const { toast } = useToast()
  const t = useTranslations('settings')

  const thresholdLabels: Record<number, string> = {
    0: t('t0'), 25: t('t25'), 50: t('t50'), 75: t('t75'), 100: t('t100'),
  }

  const getThresholdLabel = (value: number): string => {
    const closest = Object.keys(thresholdLabels)
      .map(Number)
      .reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev))
    return thresholdLabels[closest]
  }

  const handleRescore = async () => {
    if (!interests.trim()) {
      toast({ title: t('rescoreNoInterests'), variant: 'destructive' })
      return
    }
    setRescoring(true)
    setRescoreResult(null)
    try {
      const res = await fetch('/api/articles/rescore', { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error()
      const data = await res.json() as { scored: number; remaining: number }
      setRescoreResult(data)
      if (data.scored === 0) {
        toast({ title: t('rescoreNone') })
      } else {
        toast({ title: t('rescoreSuccess', { scored: data.scored }) })
      }
    } catch {
      toast({ title: t('rescoreError'), variant: 'destructive' })
    } finally {
      setRescoring(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, threshold }),
      })
      if (!res.ok) throw new Error()
      toast({ title: t('saveSuccess') })
    } catch {
      toast({ title: t('saveError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="interests">{t('interestsLabel')}</Label>
        <Textarea
          id="interests"
          rows={4}
          placeholder={t('interestsPlaceholder')}
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">{t('interestsHint')}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="threshold">{t('thresholdLabel')}</Label>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold tabular-nums', getThresholdColor(threshold))}>
              {threshold}
            </span>
            <span className="text-xs text-muted-foreground">
              · {getThresholdLabel(threshold)}
            </span>
          </div>
        </div>

        <input
          id="threshold"
          type="range"
          min={0}
          max={100}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
        />

        <div className="flex justify-between text-xs text-muted-foreground px-0.5">
          <span>{t('thresholdAll')}</span>
          <span>{t('thresholdBalanced')}</span>
          <span>{t('thresholdBest')}</span>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('thresholdHint', { threshold })}
        </p>
      </div>

      <Button type="submit" disabled={loading} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t('save')}
      </Button>

      <div className="border-t pt-4 flex flex-col gap-2">
        <p className="text-sm font-medium">{t('rescoreTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('rescoreDescription')}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rescoring || !interests.trim()}
            onClick={handleRescore}
            title={!interests.trim() ? t('rescoreNoInterests') : undefined}
          >
            {rescoring
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Sparkles className="h-3.5 w-3.5" />
            }
            {rescoring ? t('rescoring') : t('rescoreButton')}
          </Button>
          {rescoreResult && rescoreResult.scored > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('rescoreSuccess', { scored: rescoreResult.scored })}
              {rescoreResult.remaining > 0 && t('rescoreRemaining', { remaining: rescoreResult.remaining })}
            </span>
          )}
          {rescoreResult && rescoreResult.scored === 0 && (
            <span className="text-xs text-muted-foreground">{t('rescoreNone')}</span>
          )}
        </div>
      </div>
    </form>
  )
}
