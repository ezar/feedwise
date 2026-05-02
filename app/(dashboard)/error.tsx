'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center max-w-sm mx-auto">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div>
        <p className="font-medium">Algo salió mal</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        Reintentar
      </Button>
    </div>
  )
}
