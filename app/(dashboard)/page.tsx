import { createClient } from '@/lib/supabase/server'
import { ArticleList } from '@/components/articles/ArticleList'
import { RefreshButton } from '@/components/layout/RefreshButton'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('threshold')
    .eq('id', user!.id)
    .single()

  const threshold = profile?.threshold ?? 50

  const { data: articles } = await supabase
    .from('articles')
    .select('*, feeds!inner(user_id, title)')
    .eq('feeds.user_id', user!.id)
    .gte('relevance_score', threshold)
    .order('relevance_score', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(40)

  const total = articles?.length ?? 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Tu feed</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Umbral {threshold}+ · {total} artículo{total !== 1 ? 's' : ''}
          </p>
        </div>
        <RefreshButton />
      </div>
      <ArticleList
        initialArticles={articles ?? []}
        emptyMessage="Nada relevante por ahora"
        emptyHint={`Aún no hay artículos con puntuación ≥ ${threshold}. Prueba a bajar el umbral en Configuración o añade más feeds.`}
      />
    </div>
  )
}
