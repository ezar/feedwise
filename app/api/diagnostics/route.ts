import { createClient } from '@/lib/supabase/server'
import { scoreArticle } from '@/lib/ai/scorer'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [feedsRes, profileRes, allFeedsRes, totalRes, scoredRes] = await Promise.all([
    supabase
      .from('feeds')
      .select('last_fetched_at')
      .eq('user_id', user.id)
      .not('last_fetched_at', 'is', null)
      .order('last_fetched_at', { ascending: false })
      .limit(1),
    supabase
      .from('user_profile')
      .select('interests')
      .eq('id', user.id)
      .single(),
    supabase
      .from('feeds')
      .select('id, qstash_schedule_id')
      .eq('user_id', user.id),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .not('relevance_score', 'is', null),
  ])

  const allFeeds = allFeedsRes.data ?? []
  const feedsWithSchedule = allFeeds.filter((f) => f.qstash_schedule_id).length

  return Response.json({
    lastCron: feedsRes.data?.[0]?.last_fetched_at ?? null,
    totalArticles: totalRes.count ?? 0,
    scoredArticles: scoredRes.count ?? 0,
    hasInterests: !!(profileRes.data?.interests?.trim()),
    totalFeeds: allFeeds.length,
    feedsWithSchedule,
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
