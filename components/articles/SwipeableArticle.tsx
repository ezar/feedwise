'use client'

import { useRef, useState } from 'react'
import { Bookmark, CheckCheck } from 'lucide-react'

interface SwipeableArticleProps {
  onSwipeLeft?: () => void   // save
  onSwipeRight?: () => void  // mark read
  children: React.ReactNode
}

const SWIPE_THRESHOLD = 72

export function SwipeableArticle({ onSwipeLeft, onSwipeRight, children }: SwipeableArticleProps) {
  const startX = useRef(0)
  const [deltaX, setDeltaX] = useState(0)
  const swiping = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    swiping.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return
    const dx = e.touches[0].clientX - startX.current
    setDeltaX(Math.max(-120, Math.min(120, dx)))
  }

  const handleTouchEnd = () => {
    if (!swiping.current) return
    swiping.current = false
    if (deltaX < -SWIPE_THRESHOLD) onSwipeLeft?.()
    else if (deltaX > SWIPE_THRESHOLD) onSwipeRight?.()
    setDeltaX(0)
  }

  const goingLeft = deltaX < -16
  const goingRight = deltaX > 16
  const triggeredLeft = deltaX < -SWIPE_THRESHOLD
  const triggeredRight = deltaX > SWIPE_THRESHOLD

  return (
    <div className="relative overflow-hidden">
      {/* Save indicator (swipe left) */}
      <div
        className="absolute inset-0 flex items-center justify-end px-4 bg-primary/10 transition-opacity"
        style={{ opacity: goingLeft ? Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD) : 0 }}
      >
        <div className={`flex items-center gap-1.5 text-primary transition-transform ${triggeredLeft ? 'scale-110' : ''}`}>
          <Bookmark className="h-4 w-4" />
          <span className="text-xs font-medium">Guardar</span>
        </div>
      </div>
      {/* Read indicator (swipe right) */}
      <div
        className="absolute inset-0 flex items-center justify-start px-4 bg-green-500/10 transition-opacity"
        style={{ opacity: goingRight ? Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD) : 0 }}
      >
        <div className={`flex items-center gap-1.5 text-green-600 dark:text-green-400 transition-transform ${triggeredRight ? 'scale-110' : ''}`}>
          <CheckCheck className="h-4 w-4" />
          <span className="text-xs font-medium">Leído</span>
        </div>
      </div>
      {/* Content */}
      <div
        style={{
          transform: `translateX(${deltaX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.25s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
