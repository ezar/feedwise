import { createClient } from '@/lib/supabase/server'
import { summarizeArticle } from '@/lib/ai/scorer'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Return cached summary if it already exists
  const { data: existing } = await supabase
    .from('articles')
    .select('ai_summary, title, description, url')
    .eq('id', params.id)
    .single()

  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  if (existing.ai_summary) {
    return Response.json({ summary: existing.ai_summary })
  }

  const locale = cookies().get('NEXT_LOCALE')?.value ?? 'es'

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
