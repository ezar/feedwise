import { createClient } from '@/lib/supabase/server'
import { scoreArticle } from '@/lib/ai/scorer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [feedsRes, , profileRes] = await Promise.all([
    supabase
      .from('feeds')
      .select('last_fetched_at')
      .eq('user_id', user.id)
      .not('last_fetched_at', 'is', null)
      .order('last_fetched_at', { ascending: false })
      .limit(1),
    supabase
      .from('articles')
      .select('ai_processed, relevance_score')
      .eq('feeds.user_id', user.id),
    supabase
      .from('user_profile')
      .select('interests')
      .eq('id', user.id)
      .single(),
  ])

  // Count scored vs total via two fast queries
  const { count: total } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })

  const { count: scored } = await supabase
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .not('relevance_score', 'is', null)

  const lastCron = feedsRes.data?.[0]?.last_fetched_at ?? null
  const hasInterests = !!(profileRes.data?.interests?.trim())

  return Response.json({
    lastCron,
    totalArticles: total ?? 0,
    scoredArticles: scored ?? 0,
    hasInterests,
  })
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profile')
    .select('interests')
    .eq('id', user.id)
    .single()

  const interests = profile?.interests?.trim()
  if (!interests) return Response.json({ error: 'Sin intereses configurados' }, { status: 400 })

  const start = Date.now()
  try {
    const result = await scoreArticle(
      { title: 'Test de diagnóstico feedwise', description: 'Artículo de prueba para verificar que la IA funciona correctamente.' },
      interests
    )
    return Response.json({ ok: true, score: result.score, summary: result.summary, ms: Date.now() - start })
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err), ms: Date.now() - start }, { status: 500 })
  }
}
