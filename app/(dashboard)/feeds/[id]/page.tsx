import { notFound } from 'next/navigation'
import { ArrowLeft, Rss, Sparkles, Clock, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
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

  const { data: articles } = await supabase
    .from('articles')
    .select('id,title,url,description,published_at,relevance_score,ai_summary,is_read,is_saved,tags,note,feed_id,feeds(title)')
    .eq('feed_id', params.id)
    .order('published_at', { ascending: false })
    .limit(100)

  const total = articles?.length ?? 0
  const pending = articles?.filter((a) => !a.ai_processed).length ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/feeds"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a feeds
        </Link>

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
        initialArticles={articles ?? []}
        feedId={params.id}
      />
    </div>
  )
}
