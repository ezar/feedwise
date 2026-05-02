import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function extractTopics(userText: string): Promise<string[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
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
  })

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '{}'

  try {
    const parsed = JSON.parse(text) as { queries?: string[] }
    return parsed.queries ?? []
  } catch {
    console.error('Error parsing topic extractor response:', text)
    return []
  }
}
