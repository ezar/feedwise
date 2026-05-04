import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

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
