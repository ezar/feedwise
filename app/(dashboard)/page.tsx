import { createClient } from '@/lib/supabase/server'
import { HomeFeed } from '@/components/articles/HomeFeed'
import { TopPicks } from '@/components/articles/TopPicks'
import { RefreshButton } from '@/components/layout/RefreshButton'
import { AlertTriangle, Folder } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }: { searchParams: { folder?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('home')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('interests')
    .eq('id', user!.id)
    .single()

  const hasInterests = !!(profile?.interests?.trim())
  const folder = searchParams.folder?.trim() || null

  let query = supabase
    .from('articles')
    .select('*, feeds(title)')
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(40)

  if (folder) {
    const { data: folderFeeds } = await supabase
      .from('feeds')
      .select('id')
      .eq('user_id', user!.id)
      .eq('folder', folder)

    const feedIds = (folderFeeds ?? []).map((f) => f.id as string)
    if (feedIds.length === 0) {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000') // returns nothing
    } else {
      query = query.in('feed_id', feedIds)
    }
  }

  const { data: articles } = await query
  const count = articles?.length ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{folder ? folder : t('title')}</h2>
            {folder && (
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Folder className="h-3 w-3" />
                ×
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('articles', { count })}
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

      {!folder && <TopPicks />}

      <HomeFeed initialArticles={articles ?? []} />
    </div>
  )
}
