import { createClient } from '@/lib/supabase/server'
import { ArticleList } from '@/components/articles/ArticleList'

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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Tu feed</h2>
        <span className="text-xs text-muted-foreground">Umbral: {threshold}+</span>
      </div>
      <ArticleList initialArticles={articles ?? []} />
    </div>
  )
}
