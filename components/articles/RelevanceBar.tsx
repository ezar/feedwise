'use client'

import { cn } from '@/lib/utils'

interface RelevanceBarProps {
  score: number
  className?: string
}

export function RelevanceBar({ score, className }: RelevanceBarProps) {
  const color =
    score >= 75
      ? 'bg-green-500'
      : score >= 50
      ? 'bg-yellow-500'
      : 'bg-red-400'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{score}</span>
    </div>
  )
}
