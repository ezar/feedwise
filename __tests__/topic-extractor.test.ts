import { describe, it, expect, vi } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: 'text',
      text: '{"queries": ["AI productivity tools", "inteligencia artificial trabajo"]}',
    },
  ],
})

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } }
  }),
}))

describe('extractTopics', () => {
  it('extrae queries del texto del usuario', async () => {
    const { extractTopics } = await import('@/lib/ai/topic-extractor')
    const queries = await extractTopics(
      'Quiero noticias de IA aplicada a productividad, sin fundraising'
    )
    expect(queries).toHaveLength(2)
    expect(queries).toContain('AI productivity tools')
    expect(queries).toContain('inteligencia artificial trabajo')
  })

  it('devuelve array vacío si el JSON no es válido', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json' }],
    })
    const { extractTopics } = await import('@/lib/ai/topic-extractor')
    const queries = await extractTopics('test')
    expect(queries).toEqual([])
  })
})
