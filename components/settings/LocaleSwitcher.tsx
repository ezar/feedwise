'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { setLocale } from '@/lib/actions/locale'

export function LocaleSwitcher() {
  const t = useTranslations('language')
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const toggle = (next: string) => {
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t('label')}</p>
      <div className="flex gap-2">
        {(['es', 'en'] as const).map((l) => (
          <button
            key={l}
            disabled={pending}
            onClick={() => toggle(l)}
            className={[
              'px-4 py-2 rounded-md border text-sm font-medium transition-colors',
              locale === l
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {t(l)}
          </button>
        ))}
      </div>
    </div>
  )
}
