import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn().mockResolvedValue({
  content: [{ type: 'text', text: '{"score": 85, "summary": "Artículo sobre IA y productividad"}' }],
})

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } }
  }),
}))

describe('scoreArticle', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"score": 85, "summary": "Artículo sobre IA y productividad"}' }],
    })
  })

  it('devuelve score y summary del modelo', async () => {
    const { scoreArticle } = await import('@/lib/ai/scorer')
    const result = await scoreArticle(
      { title: 'AI boosts productivity by 40%', description: 'New study shows...' },
      'IA, productividad, software'
    )
    expect(result.score).toBe(85)
    expect(result.summary).toBe('Artículo sobre IA y productividad')
  })

  it('limita score entre 0 y 100', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"score": 150, "summary": "test"}' }],
    })
    const { scoreArticle } = await import('@/lib/ai/scorer')
    const result = await scoreArticle({ title: 'test' }, 'test')
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('devuelve score 0 si el JSON no es válido', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'invalid json' }],
    })
    const { scoreArticle } = await import('@/lib/ai/scorer')
    const result = await scoreArticle({ title: 'test' }, 'test')
    expect(result.score).toBe(0)
  })
})
