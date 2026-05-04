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
    system: `You are a summarizer for a news reader app. Always output only the summary — never ask questions, never add labels or explanations. Write in ${lang}. If the content is limited, infer from the title alone.`,
    messages: [
      {
        role: 'user',
        content: `Write a 2-3 sentence summary in ${lang} of the following article, suitable for sharing on social media:

Title: ${article.title}${description ? `\nContent: ${description}` : ''}`,
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
  interests: string,
  locale: string = 'es'
): Promise<ScoredArticle> {
  const description = article.description?.slice(0, 400) ?? ''
  const lang = locale === 'en' ? 'English' : 'Spanish'
  const summaryInstruction = locale === 'en'
    ? 'Write a 1-sentence summary in English.'
    : 'Escribe un resumen de 1 frase en español.'

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    system: 'Respond only with valid JSON. No markdown, no code blocks, no explanations.',
    messages: [
      {
        role: 'user',
        content: `User interests: ${interests}

Article:
Title: ${article.title}
Description: ${description}

Score 0-100 the relevance of this article for the user.
0 = completely irrelevant. 100 = exactly what they want.
${summaryInstruction}

Reply ONLY with valid JSON, no markdown:
{"score": number, "summary": "string in ${lang}"}`,
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
