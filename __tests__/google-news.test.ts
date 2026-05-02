import { describe, it, expect } from 'vitest'
import { buildGoogleNewsUrl, buildGoogleNewsFeedTitle } from '@/lib/rss/google-news'

describe('buildGoogleNewsUrl', () => {
  it('construye URL correcta para query en español', () => {
    const url = buildGoogleNewsUrl('inteligencia artificial')
    expect(url).toContain('news.google.com/rss/search')
    expect(url).toContain('hl=es')
    expect(url).toContain('gl=ES')
  })

  it('encodea caracteres especiales', () => {
    const url = buildGoogleNewsUrl('energía solar')
    expect(url).toContain('energ%C3%ADa')
  })

  it('incluye la query en la URL', () => {
    const url = buildGoogleNewsUrl('AI productivity')
    expect(url).toContain('AI')
  })

  it('permite cambiar idioma y país', () => {
    const url = buildGoogleNewsUrl('artificial intelligence', 'en', 'US')
    expect(url).toContain('hl=en')
    expect(url).toContain('gl=US')
    expect(url).toContain('ceid=US:en')
  })
})

describe('buildGoogleNewsFeedTitle', () => {
  it('genera título con el formato correcto', () => {
    const title = buildGoogleNewsFeedTitle('AI tools')
    expect(title).toBe('Google News: AI tools')
  })
})
