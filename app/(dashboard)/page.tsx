import { createClient } from '@/lib/supabase/server'
import { HomeFeed } from '@/components/articles/HomeFeed'
import { RefreshButton } from '@/components/layout/RefreshButton'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Tu feed</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Umbral {threshold}+ · {articles?.length ?? 0} artículo{(articles?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <RefreshButton />
      </div>

      {!hasInterests && (
        <Link href="/settings" className="flex items-start gap-3 mb-6 p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-900 hover:bg-yellow-100 transition-colors">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Configura tus intereses para activar la IA</p>
            <p className="text-xs mt-0.5 text-yellow-700">Sin intereses, los artículos no se puntúan y no se filtran. Toca aquí para ir a Ajustes.</p>
          </div>
        </Link>
      )}

      <HomeFeed initialArticles={articles ?? []} threshold={threshold} hasInterests={hasInterests} />
    </div>
  )
}
