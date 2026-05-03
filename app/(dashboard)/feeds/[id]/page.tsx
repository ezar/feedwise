import { notFound } from 'next/navigation'
import { ArrowLeft, Rss, Sparkles, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ArticleList } from '@/components/articles/ArticleList'

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
    .select('*, feeds!inner(user_id, title)')
    .eq('feed_id', params.id)
    .order('published_at', { ascending: false })
    .limit(100)

  const total = articles?.length ?? 0
  const scored = articles?.filter((a) => a.ai_processed).length ?? 0
  const pending = total - scored

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
              <a
                href={feed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
              >
                <ExternalLink className="h-3 w-3" />
                Ver fuente
              </a>
            </div>
          </div>
        </div>
      </div>

      <ArticleList
        initialArticles={articles ?? []}
        emptyMessage="Sin artículos todavía"
        emptyHint="QStash aún no ha procesado este feed. Se actualizará en la próxima hora."
      />
    </div>
  )
}
