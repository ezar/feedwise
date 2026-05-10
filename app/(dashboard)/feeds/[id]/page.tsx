import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Rss, Sparkles, Clock, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { HomeFeed } from '@/components/articles/HomeFeed'
import { DigestButton } from '@/components/articles/DigestButton'
import { FetchButton } from '@/components/feeds/FetchButton'

export const dynamic = 'force-dynamic'

export default async function FeedDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: feed } = await supabase
    .from('feeds')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!feed) notFound()

  // Fetch all feeds in list order to build prev/next navigation
  const sortCookie = cookies().get('feedwise-feeds-sort')?.value ?? 'default'

  const { data: rawFeeds } = await supabase
    .from('feeds')
    .select('id, title, last_fetched_at')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  type RawFeed = { id: string; title: string | null; last_fetched_at: string | null }
  let allFeeds: RawFeed[] = (rawFeeds ?? []) as RawFeed[]

  if (sortCookie === 'alpha') {
    allFeeds = [...allFeeds].sort((a, b) =>
      (a.title ?? '').localeCompare(b.title ?? '')
    )
  } else if (sortCookie === 'recent') {
    allFeeds = [...allFeeds].sort((a, b) => {
      const ta = a.last_fetched_at ? new Date(a.last_fetched_at).getTime() : 0
      const tb = b.last_fetched_at ? new Date(b.last_fetched_at).getTime() : 0
      return tb - ta
    })
  } else if (sortCookie === 'unread') {
    // Fetch unread counts to sort by (same approach as the feeds API)
    const { data: unreadRows } = await supabase
      .from('articles')
      .select('feed_id')
      .eq('is_read', false)
    const unreadMap = new Map<string, number>()
    for (const row of unreadRows ?? []) {
      const fid = row.feed_id as string
      unreadMap.set(fid, (unreadMap.get(fid) ?? 0) + 1)
    }
    allFeeds = [...allFeeds].sort((a, b) =>
      (unreadMap.get(b.id) ?? 0) - (unreadMap.get(a.id) ?? 0)
    )
  }

  const currentIdx = allFeeds.findIndex((f) => f.id === params.id)
  const nextFeed = currentIdx < allFeeds.length - 1 ? allFeeds[currentIdx + 1] : null

  const [{ data: articles }, { count: totalCount }, { count: pendingCount }] = await Promise.all([
    supabase
      .from('articles')
      .select('id,title,url,description,published_at,relevance_score,ai_summary,is_read,is_saved,tags,note,feed_id,feeds(title)')
      .eq('feed_id', params.id)
      .order('published_at', { ascending: false })
      .limit(100),
    supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('feed_id', params.id),
    supabase
      .from('articles')
      .select('*', { count: 'exact', head: true })
      .eq('feed_id', params.id)
      .eq('ai_processed', false),
  ])

  const total = totalCount ?? 0
  const pending = pendingCount ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/feeds"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a feeds
          </Link>
          {nextFeed && (
            <Link
              href={`/feeds/${nextFeed.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={nextFeed.title ?? ''}
            >
              <span className="max-w-[140px] truncate">{nextFeed.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </div>

        <div className="flex items-start gap-3">
          {feed.feed_type === 'topic'
            ? <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            : <Rss className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{feed.title ?? feed.url}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={feed.feed_type === 'topic' ? 'default' : 'outline'} className="text-xs">
                {feed.feed_type === 'topic' ? 'Tema IA' : 'Manual'}
              </Badge>
              <span className="text-xs text-muted-foreground">{total} artículos</span>
              {pending > 0 && (
                <span className="text-xs text-yellow-600 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {pending} pendiente{pending !== 1 ? 's' : ''} de puntuar
                </span>
              )}
              {feed.last_fetched_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(feed.last_fetched_at).toLocaleString('es-ES', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <FetchButton feedId={params.id} />
                <a
                  href={feed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver fuente
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {feed.last_error && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error al sincronizar este feed</p>
            <p className="text-xs mt-0.5 opacity-80">{feed.last_error}</p>
          </div>
        </div>
      )}

      <div className="mb-4">
        <DigestButton feedId={params.id} />
      </div>

      <HomeFeed
        initialArticles={(articles ?? []).map((a) => ({ ...a, feeds: Array.isArray(a.feeds) ? (a.feeds[0] ?? null) : a.feeds }))}
        feedId={params.id}
      />
    </div>
  )
}
