'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/ToastProvider'
import { cn } from '@/lib/utils'

export function SyncAllButton() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/feeds/fetch-all', { method: 'POST' })
      const data = await res.json() as { triggered?: number; total?: number; error?: string }
      if (!res.ok) throw new Error(data.error)
      toast({
        title: 'Sincronización iniciada',
        description: `Actualizando ${data.triggered} de ${data.total} feeds en segundo plano`,
      })
    } catch (err) {
      toast({
        title: 'Error al sincronizar',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleSync} disabled={loading} variant="outline">
      <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
      {loading ? 'Sincronizando…' : 'Sincronizar todos los feeds ahora'}
    </Button>
  )
}
