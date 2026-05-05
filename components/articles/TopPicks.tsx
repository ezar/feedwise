import { createClient } from '@/lib/supabase/server'
import { Flame } from 'lucide-react'

export async function TopPicks() {
  const supabase = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, url, relevance_score, feeds(title)')
    .gte('published_at', since)
    .gte('relevance_score', 70)
    .eq('is_read', false)
    .order('relevance_score', { ascending: false })
    .limit(5)

  if (!articles?.length) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-2">
        <Flame className="h-3.5 w-3.5 text-orange-500" />
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top picks · 24h</p>
      </div>
      <div className="border rounded-lg overflow-hidden divide-y bg-card">
        {articles.map((a, i) => (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors group"
          >
            <span className="text-xs font-bold text-muted-foreground/50 w-4 shrink-0 tabular-nums">{i + 1}</span>
            <span className="flex-1 text-sm leading-snug truncate group-hover:text-primary transition-colors">
              {a.title}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {a.feeds && typeof a.feeds === 'object' && !Array.isArray(a.feeds) && 'title' in a.feeds && (a.feeds as { title?: string | null }).title && (
                <span className="hidden sm:inline text-[10px] text-muted-foreground truncate max-w-[100px]">
                  {(a.feeds as { title: string }).title}
                </span>
              )}
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                {a.relevance_score}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
