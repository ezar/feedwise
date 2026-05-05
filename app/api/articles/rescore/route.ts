import { createClient } from '@/lib/supabase/server'
import { scoreArticle } from '@/lib/ai/scorer'

export const dynamic = 'force-dynamic'

const LIMIT = 50
const BATCH = 10

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profile')
    .select('interests, locale')
    .eq('id', user.id)
    .single()

  const interests = profile?.interests?.trim()
  if (!interests) return Response.json({ error: 'no_interests' }, { status: 400 })
  const locale = profile?.locale ?? 'es'

  // Count total unread so we can tell the user how many are pending
  const { count: totalUnread } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)

  // Fetch the articles to re-score (most recent first, unread only)
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, description')
    .eq('is_read', false)
    .order('published_at', { ascending: false })
    .limit(LIMIT)

  if (!articles?.length) return Response.json({ scored: 0, total: 0, remaining: 0 })

  let scored = 0
  for (let i = 0; i < articles.length; i += BATCH) {
    const batch = articles.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (article) => {
        try {
          const { score, summary, tags } = await scoreArticle(article, interests, locale)
          await supabase
            .from('articles')
            .update({ relevance_score: score, ai_summary: summary, tags, ai_processed: true })
            .eq('id', article.id)
          scored++
        } catch {
          // Skip individual failures; don't abort the whole batch
        }
      })
    )
  }

  const remaining = Math.max(0, (totalUnread ?? 0) - articles.length)
  return Response.json({ scored, total: articles.length, remaining })
}
