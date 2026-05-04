import { createClient } from '@/lib/supabase/server'
import { HomeFeed } from '@/components/articles/HomeFeed'
import { RefreshButton } from '@/components/layout/RefreshButton'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('home')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('threshold, interests')
    .eq('id', user!.id)
    .single()

  const threshold = profile?.threshold ?? 50
  const hasInterests = !!(profile?.interests?.trim())

  const { data: articles } = await supabase
    .from('articles')
    .select('*, feeds(title)')
    .or(`relevance_score.gte.${threshold},relevance_score.is.null`)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(40)

  const count = articles?.length ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('threshold', { value: threshold })} · {t('articles', { count })}
          </p>
        </div>
        <RefreshButton />
      </div>

      {!hasInterests && (
        <Link href="/settings" className="flex items-start gap-3 mb-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100 transition-colors dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{t('interestsBanner')}</p>
            <p className="text-xs mt-0.5 opacity-80">{t('interestsBannerHint')}</p>
          </div>
        </Link>
      )}

      <HomeFeed initialArticles={articles ?? []} threshold={threshold} hasInterests={hasInterests} />
    </div>
  )
}
