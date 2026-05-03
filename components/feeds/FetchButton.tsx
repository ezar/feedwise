'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/ToastProvider'
import { cn } from '@/lib/utils'

interface FetchButtonProps {
  feedId: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm'
}

export function FetchButton({ feedId, variant = 'outline', size = 'sm' }: FetchButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleFetch = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feeds/${feedId}/fetch`, { method: 'POST', credentials: 'include' })
      const data = await res.json() as { total?: number; inserted?: number; error?: string }
      if (!res.ok) throw new Error(data.error)
      toast({
        title: 'Feed actualizado',
        description: `${data.total} artículos encontrados · ${data.inserted} nuevos`,
      })
      router.refresh()
    } catch (err) {
      toast({
        title: 'Error al actualizar',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleFetch} disabled={loading}>
      <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
      {loading ? 'Actualizando…' : 'Actualizar ahora'}
    </Button>
  )
}
