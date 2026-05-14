import { createClient } from '@/lib/supabase/server'
import { HomeFeed } from '@/components/articles/HomeFeed'
import { TopPicks } from '@/components/articles/TopPicks'
import { InterestsBanner } from '@/components/articles/InterestsBanner'
import { RefreshButton } from '@/components/layout/RefreshButton'
import { Folder } from 'lucide-react'
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

  let feedIds: string[] | null = null
  if (folder) {
    const { data: folderFeeds } = await supabase
      .from('feeds')
      .select('id')
      .eq('user_id', user!.id)
      .eq('folder', folder)
    feedIds = (folderFeeds ?? []).map((f) => f.id as string)
  }

  let articlesQuery = supabase
    .from('articles')
    .select('id,title,url,description,published_at,relevance_score,ai_summary,is_read,is_saved,tags,note,feed_id,feeds(title)')
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(100)

  let countQuery = supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })

  if (feedIds !== null) {
    if (feedIds.length === 0) {
      articlesQuery = articlesQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    } else {
      articlesQuery = articlesQuery.in('feed_id', feedIds)
      countQuery = countQuery.in('feed_id', feedIds)
    }
  }

  const [{ data: articles }, { count: totalCount }] = await Promise.all([articlesQuery, countQuery])
  const count = totalCount ?? 0

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

      {!hasInterests && <InterestsBanner />}

      {!folder && <TopPicks />}

      <HomeFeed initialArticles={(articles ?? []).map((a) => ({ ...a, feeds: Array.isArray(a.feeds) ? (a.feeds[0] ?? null) : a.feeds }))} />
    </div>
  )
}
