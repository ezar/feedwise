import { createClient } from '@/lib/supabase/server'
import { summarizeArticle } from '@/lib/ai/scorer'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Heuristic: detect if a summary is in English or Spanish
function detectLang(text: string): 'en' | 'es' | 'unknown' {
  const esWords = /\b(el|la|los|las|de|en|que|con|por|para|una|este|esta|también|pero|más|sobre)\b/i
  const enWords = /\b(the|this|that|with|from|have|their|which|will|been|are|for|was)\b/i
  const esScore = (text.match(esWords) ?? []).length
  const enScore = (text.match(enWords) ?? []).length
  if (esScore > enScore + 1) return 'es'
  if (enScore > esScore + 1) return 'en'
  return 'unknown'
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('articles')
    .select('ai_summary, title, description, url')
    .eq('id', params.id)
    .single()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const locale = cookies().get('NEXT_LOCALE')?.value ?? 'es'

  // Return cached summary only if language matches user's locale
  if (existing.ai_summary) {
    const summaryLang = detectLang(existing.ai_summary)
    if (summaryLang === locale || summaryLang === 'unknown') {
      return Response.json({ summary: existing.ai_summary })
    }
  }

  const summary = await summarizeArticle(
    { title: existing.title, description: existing.description, url: existing.url },
    locale
  )

  if (summary) {
    await supabase
      .from('articles')
      .update({ ai_summary: summary })
      .eq('id', params.id)
  }

  return Response.json({ summary })
}
