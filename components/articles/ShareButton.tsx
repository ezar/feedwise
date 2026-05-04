'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Copy, Check, MessageCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface ShareButtonProps {
  title: string
  url: string
  summary?: string | null
}

export function ShareButton({ title, url, summary }: ShareButtonProps) {
  const t = useTranslations('share')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'link' | 'text' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const shareText = summary ? `${title}\n\n${summary}\n\n${url}` : `${title}\n\n${url}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied('link')
    setTimeout(() => { setCopied(null); setOpen(false) }, 1500)
  }

  const copyText = async () => {
    await navigator.clipboard.writeText(shareText)
    setCopied('text')
    setTimeout(() => { setCopied(null); setOpen(false) }, 1500)
  }

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener')
    setOpen(false)
  }

  const openLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener')
    setOpen(false)
  }

  const nativeShare = async () => {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text: summary ?? undefined, url })
      setOpen(false)
    }
  }

  const hasNativeShare = typeof window !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setOpen((v) => !v)}
        title={t('button')}
      >
        <Share2 className="h-4 w-4 text-muted-foreground" />
      </Button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border bg-background shadow-lg py-1 text-sm">
          {hasNativeShare && (
            <button
              onClick={nativeShare}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
            >
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              {t('button')}
            </button>
          )}
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
          >
            {copied === 'link' ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            {copied === 'link' ? t('copied') : t('copy')}
          </button>
          <button
            onClick={copyText}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
          >
            {copied === 'text' ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            {copied === 'text' ? t('copied') : t('copyText')}
          </button>
          <div className="h-px bg-border mx-3 my-1" />
          <button
            onClick={openWhatsApp}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 text-green-600" />
            {t('whatsapp')}
          </button>
          <button
            onClick={openLinkedIn}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
            {t('linkedin')}
          </button>
        </div>
      )}
    </div>
  )
}
