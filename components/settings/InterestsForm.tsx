'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/providers/ToastProvider'
import { cn } from '@/lib/utils'

interface InterestsFormProps {
  initialInterests: string
  initialThreshold: number
}

const THRESHOLD_LABELS: Record<number, string> = {
  0: 'Todo',
  25: 'Poco filtrado',
  50: 'Equilibrado',
  75: 'Estricto',
  100: 'Máximo',
}

function getThresholdLabel(value: number): string {
  const closest = Object.keys(THRESHOLD_LABELS)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev))
  return THRESHOLD_LABELS[closest]
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
  const { toast } = useToast()

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
      toast({ title: 'Configuración guardada' })
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="interests">Mis intereses</Label>
        <Textarea
          id="interests"
          rows={4}
          placeholder="Me interesa la IA, el desarrollo de software, diseño de producto, startups..."
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Describe en lenguaje natural qué quieres leer. Claude usará esto para puntuar cada artículo del 0 al 100.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="threshold">Umbral de relevancia</Label>
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
          <span>0 · Todo</span>
          <span>50 · Equilibrado</span>
          <span>100 · Solo lo mejor</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Solo verás artículos con puntuación ≥ {threshold}. Más alto = menos artículos, más relevantes.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar configuración
      </Button>
    </form>
  )
}
