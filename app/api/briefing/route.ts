import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const ai = new Anthropic()

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { locale = 'es' } = await req.json() as { locale?: string }
  const lang = locale === 'en' ? 'English' : 'Spanish'

  // Top 20 articles from the last 48h ordered by score
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: articles, error } = await supabase
    .from('articles')
    .select('title, description, ai_summary, relevance_score, feeds(title)')
    .gte('published_at', since)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(20)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!articles?.length) return Response.json({ error: 'no_articles' }, { status: 404 })

  const lines = articles.map((a, i) => {
    const source = (a.feeds as { title?: string } | null)?.title ?? ''
    const snippet = a.ai_summary ?? a.description?.replace(/<[^>]*>/g, '').slice(0, 200) ?? ''
    return `${i + 1}. [${source}] ${a.title}${snippet ? ` — ${snippet}` : ''}`
  })

  const prompt = `You are a concise news briefing assistant. Below are today's top articles from the user's feeds.

Write a structured daily briefing in ${lang}. Group related articles under 2-5 topic headings. For each topic write 2-4 sentences synthesizing what happened, referencing sources in parentheses. Be factual and concise. End with one sentence on anything else notable.

Articles:
${lines.join('\n')}

Output only the briefing text — no intro, no "Here is your briefing", no markdown headers (use plain text topic titles in bold-style using UPPERCASE). Write in ${lang}.`

  try {
    const message = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You are a news briefing assistant. Output only the briefing — no preamble, no labels. Write in ${lang}.`,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return Response.json({ briefing: text, articleCount: articles.length })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'AI error' }, { status: 500 })
  }
}
