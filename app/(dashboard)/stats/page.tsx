import { getTranslations } from 'next-intl/server'
import { ReadingStats } from '@/components/stats/ReadingStats'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const t = await getTranslations('stats')
  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t('title')}</h2>
      <ReadingStats />
    </div>
  )
}
