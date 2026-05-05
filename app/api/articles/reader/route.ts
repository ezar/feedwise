import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export const dynamic = 'force-dynamic'

// Strip anything dangerous before sending HTML to the client
function sanitize(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, '')
    .replace(/\s(on\w+)="[^"]*"/gi, '')
    .replace(/\s(on\w+)='[^']*'/gi, '')
    .replace(/javascript:/gi, 'blocked:')
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return Response.json({ error: 'url required' }, { status: 400 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; feedwise-reader/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es,en;q=0.9',
      },
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      return Response.json({ error: `Fetch failed: ${res.status}` }, { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('html')) {
      return Response.json({ error: 'Not an HTML page' }, { status: 422 })
    }

    const html = await res.text()
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      return Response.json({ error: 'Could not extract content' }, { status: 422 })
    }

    return Response.json({
      title: article.title,
      byline: article.byline,
      siteName: article.siteName,
      excerpt: article.excerpt,
      content: sanitize(article.content ?? ''),
      textLength: article.textContent?.length ?? 0,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 502 })
  }
}
