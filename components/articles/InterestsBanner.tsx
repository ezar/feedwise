'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

const DISMISS_KEY = 'feedwise-interests-banner-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export function InterestsBanner() {
  const t = useTranslations('home')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ts = localStorage.getItem(DISMISS_KEY)
    if (!ts || Date.now() - Number(ts) > DISMISS_DURATION_MS) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  return (
    <div className="relative flex items-start gap-3 mb-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
      <Link href="/settings" className="flex items-start gap-3 flex-1 hover:opacity-90 transition-opacity">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">{t('interestsBanner')}</p>
          <p className="text-xs mt-0.5 opacity-80">{t('interestsBannerHint')}</p>
        </div>
      </Link>
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
        title="Cerrar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
