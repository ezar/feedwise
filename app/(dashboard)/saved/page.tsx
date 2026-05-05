import { createClient } from '@/lib/supabase/server'
import { SavedFeed } from '@/components/saved/SavedFeed'
import { ExportButton } from '@/components/saved/ExportButton'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function SavedPage() {
  const supabase = createClient()
  const t = await getTranslations('saved')

  const { data: raw } = await supabase
    .from('articles')
    .select('id, title, url, description, published_at, relevance_score, ai_summary, is_read, is_saved, tags, note, feeds(title)')
    .eq('is_saved', true)
    .order('published_at', { ascending: false })
    .limit(40)

  type Row = NonNullable<typeof raw>[number]
  const articles = (raw ?? []).map((a: Row) => ({
    ...a,
    feeds: Array.isArray(a.feeds) ? (a.feeds[0] ?? null) : a.feeds,
  }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
        <ExportButton articles={articles} />
      </div>
      <SavedFeed initialArticles={articles} />
    </div>
  )
}
