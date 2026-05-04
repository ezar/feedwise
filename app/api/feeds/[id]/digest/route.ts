import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic()

const SYSTEM_PROMPT = `Eres un asistente editorial que redacta resúmenes concisos de noticias en español.
Cuando te pasen una lista de artículos no leídos, escribe un digest de los puntos más destacados.
Estructura la respuesta en markdown: usa un párrafo introductorio breve y luego una lista con los titulares más relevantes y una frase de contexto por cada uno.
Sé conciso: máximo 300 palabras. No incluyas artículos irrelevantes o poco interesantes.`

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify feed belongs to user
  const { data: feed } = await supabase
    .from('feeds')
    .select('id, title')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!feed) return Response.json({ error: 'Feed not found' }, { status: 404 })

  // Fetch unread articles (up to 30, most recent)
  const { data: articles } = await supabase
    .from('articles')
    .select('title, description, ai_summary, url, published_at')
    .eq('feed_id', params.id)
    .eq('is_read', false)
    .order('published_at', { ascending: false })
    .limit(30)

  if (!articles || articles.length === 0) {
    return Response.json({ digest: null, count: 0 })
  }

  const articleList = articles
    .map((a, i) => {
      const snippet = a.ai_summary ?? a.description?.replace(/<[^>]*>/g, '').slice(0, 200) ?? ''
      return `${i + 1}. **${a.title}**${snippet ? `\n   ${snippet}` : ''}`
    })
    .join('\n\n')

  const start = Date.now()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Feed: ${feed.title}\nArtículos no leídos (${articles.length}):\n\n${articleList}\n\nEscribe el digest.`,
      },
    ],
  })

  const digest = response.content[0].type === 'text' ? response.content[0].text : ''

  return Response.json({
    digest,
    count: articles.length,
    ms: Date.now() - start,
  })
}
