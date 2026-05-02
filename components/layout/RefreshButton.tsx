'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 800)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh}>
      <RefreshCw className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} />
      Actualizar
    </Button>
  )
}
