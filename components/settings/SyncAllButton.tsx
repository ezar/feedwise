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
      const res = await fetch('/api/feeds/fetch-all', { method: 'POST', credentials: 'include' })
      const data = await res.json() as { total?: number; inserted?: number; error?: string }
      if (!res.ok) throw new Error(data.error)
      toast({
        title: 'Feeds actualizados',
        description: `${data.inserted} artículos nuevos en ${data.total} feeds`,
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
