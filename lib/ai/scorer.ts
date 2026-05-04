import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function summarizeArticle(
  article: { title: string; description?: string | null; url: string },
  locale: string = 'es'
): Promise<string> {
  const description = article.description?.replace(/<[^>]*>/g, '').trim().slice(0, 800) ?? ''
  const lang = locale === 'en' ? 'English' : 'Spanish'

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Summarize this article in 2-3 sentences in ${lang}, suitable for sharing on social media. Be concise and informative.

Title: ${article.title}
${description ? `Content: ${description}` : ''}

Reply with only the summary text, no quotes, no labels.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  return text
}

export interface ScoredArticle {
  score: number
  summary: string
}

export async function scoreArticle(
  article: { title: string; description?: string | null },
  interests: string
): Promise<ScoredArticle> {
  const description = article.description?.slice(0, 400) ?? ''

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: 'Respond only with valid JSON. No markdown, no code blocks, no explanations.',
    messages: [
      {
        role: 'user',
        content: `Intereses del usuario: ${interests}

Artículo:
Título: ${article.title}
Descripción: ${description}

Puntúa del 0 al 100 la relevancia de este artículo para el usuario.
0 = completamente irrelevante. 100 = exactamente lo que busca.
Escribe un resumen de 1 frase en español.

Responde ÚNICAMENTE con JSON válido sin markdown:
{"score": number, "summary": "string"}`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    const parsed = JSON.parse(text) as Partial<ScoredArticle>
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score ?? 0))),
      summary: parsed.summary ?? '',
    }
  } catch {
    console.error('Error parsing scorer response:', text)
    return { score: 0, summary: '' }
  }
}
