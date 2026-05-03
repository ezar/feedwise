import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function extractTopics(userText: string): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `Eres un asistente que extrae queries de búsqueda para Google News.

A partir del texto del usuario, extrae entre 2 y 5 queries de búsqueda.
Cada query debe ser:
- Concisa: 2-4 palabras
- En el idioma más apropiado para encontrar los mejores resultados
- Específica para el tema principal
- Excluyendo los temas que el usuario NO quiere

Texto del usuario: "${userText}"

Responde ÚNICAMENTE con JSON válido, sin markdown ni explicaciones:
{"queries": ["query1", "query2", "query3"]}`,
      },
    ],
    system: 'Respond only with valid JSON. No markdown, no code blocks, no explanations.',
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
  // Strip markdown code fences if present
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    const parsed = JSON.parse(text) as { queries?: string[] }
    return Array.isArray(parsed.queries) ? parsed.queries.filter(Boolean) : []
  } catch {
    console.error('Error parsing topic extractor response:', text)
    return []
  }
}
