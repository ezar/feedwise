import { createClient } from '@/lib/supabase/server'
import { ArticleList } from '@/components/articles/ArticleList'
import { ExportButton } from '@/components/saved/ExportButton'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function SavedPage() {
  const supabase = createClient()
  const t = await getTranslations('saved')

  const { data: articles } = await supabase
    .from('articles')
    .select('*, feeds(title)')
    .eq('is_saved', true)
    .order('published_at', { ascending: false })
    .limit(100)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <ExportButton articles={articles ?? []} />
      </div>
      <ArticleList
        initialArticles={articles ?? []}
        emptyMessage={t('empty')}
        emptyHint={t('emptyHint')}
      />
    </div>
  )
}
