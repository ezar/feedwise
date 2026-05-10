'use client'

import { useRef, useState } from 'react'
import { Bookmark, CheckCheck } from 'lucide-react'

interface SwipeableArticleProps {
  onSwipeLeft?: () => void   // save
  onSwipeRight?: () => void  // mark read
  onTap?: () => void         // single tap (not a swipe)
  onLongPress?: () => void   // long press (600ms)
  children: React.ReactNode
}

const SWIPE_THRESHOLD = 72

export function SwipeableArticle({ onSwipeLeft, onSwipeRight, onTap, onLongPress, children }: SwipeableArticleProps) {
  const startX = useRef(0)
  const startY = useRef(0)
  const [deltaX, setDeltaX] = useState(0)
  const swiping = useRef(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    swiping.current = true
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null
        swiping.current = false
        setDeltaX(0)
        onLongPress()
      }, 600)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current) return
    const dx = e.touches[0].clientX - startX.current
    const dy = Math.abs(e.touches[0].clientY - startY.current)
    if (longPressTimer.current && (Math.abs(dx) > 10 || dy > 10)) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    // Block swipe in directions that have no handler
    const clamped = Math.max(onSwipeLeft ? -120 : 0, Math.min(onSwipeRight ? 120 : 0, dx))
    setDeltaX(clamped)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (!swiping.current) return
    swiping.current = false
    if (deltaX < -SWIPE_THRESHOLD) {
      onSwipeLeft?.()
    } else if (deltaX > SWIPE_THRESHOLD) {
      onSwipeRight?.()
    } else if (Math.abs(deltaX) < 8) {
      // It's a tap — fire immediately on touchEnd to avoid iOS double-tap delay
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current)
      if (dy < 10) onTap?.()
    }
    setDeltaX(0)
  }

  const goingLeft = deltaX < -16
  const goingRight = deltaX > 16
  const triggeredLeft = deltaX < -SWIPE_THRESHOLD
  const triggeredRight = deltaX > SWIPE_THRESHOLD

  return (
    <div className="relative overflow-hidden">
      {/* Save indicator (swipe left) — only when handler exists */}
      {onSwipeLeft && (
        <div
          className="absolute inset-0 flex items-center justify-end px-4 bg-primary/20 transition-opacity"
          style={{ opacity: goingLeft ? Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD) : 0 }}
        >
          <div className={`flex items-center gap-1.5 text-primary transition-transform ${triggeredLeft ? 'scale-110' : ''}`}>
            <Bookmark className="h-4 w-4" />
            <span className="text-xs font-medium">Guardar</span>
          </div>
        </div>
      )}
      {/* Read indicator (swipe right) — only when handler exists */}
      {onSwipeRight && (
        <div
          className="absolute inset-0 flex items-center justify-start px-4 bg-green-500/20 transition-opacity"
          style={{ opacity: goingRight ? Math.min(1, Math.abs(deltaX) / SWIPE_THRESHOLD) : 0 }}
        >
          <div className={`flex items-center gap-1.5 text-green-600 dark:text-green-400 transition-transform ${triggeredRight ? 'scale-110' : ''}`}>
            <CheckCheck className="h-4 w-4" />
            <span className="text-xs font-medium">Leído</span>
          </div>
        </div>
      )}
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
