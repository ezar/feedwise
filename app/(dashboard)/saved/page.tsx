import { createClient } from '@/lib/supabase/server'
import { ArticleList } from '@/components/articles/ArticleList'

export const dynamic = 'force-dynamic'

export default async function SavedPage() {
  const supabase = createClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('*, feeds(title)')
    .eq('is_saved', true)
    .order('published_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">Artículos guardados</h2>
      <ArticleList
        initialArticles={articles ?? []}
        emptyMessage="No tienes artículos guardados"
        emptyHint="Toca el icono de marcador en cualquier artículo para guardarlo aquí."
      />
    </div>
  )
}
