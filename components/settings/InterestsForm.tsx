'use client'

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface InterestsFormProps {
  initialInterests: string
  initialThreshold: number
}

export function InterestsForm({ initialInterests, initialThreshold }: InterestsFormProps) {
  const [interests, setInterests] = useState(initialInterests)
  const [threshold, setThreshold] = useState(initialThreshold)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, threshold }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="interests">Mis intereses</Label>
        <Textarea
          id="interests"
          className="mt-1"
          rows={4}
          placeholder="Me interesa la IA, el desarrollo de software, y el diseño de producto..."
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Describe en lenguaje natural qué quieres leer. Claude usará esto para puntuar artículos.
        </p>
      </div>
      <div>
        <Label htmlFor="threshold">Umbral de relevancia: {threshold}</Label>
        <Input
          id="threshold"
          type="range"
          min={0}
          max={100}
          step={5}
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value))}
          className="mt-1 h-2 cursor-pointer"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Solo verás artículos con puntuación ≥ {threshold}. Valor actual: {threshold}/100.
        </p>
      </div>
      <Button type="submit" disabled={loading} className="self-start">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? '¡Guardado!' : 'Guardar'}
      </Button>
    </form>
  )
}
