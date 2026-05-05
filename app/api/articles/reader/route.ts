import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export const dynamic = 'force-dynamic'

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

  // Fetch with timeout
  let res: Response
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    }).finally(() => clearTimeout(timeout))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Fetch error'
    return Response.json({ error: msg }, { status: 502 })
  }

  if (!res.ok) {
    return Response.json({ error: `HTTP ${res.status}` }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('html')) {
    return Response.json({ error: 'Not an HTML page' }, { status: 422 })
  }

  // Use the final URL after redirects (res.url) so jsdom resolves relative links correctly
  const finalUrl = res.url || url
  const html = await res.text()

  // Parse with Readability
  let article: ReturnType<Readability['parse']> = null
  try {
    const dom = new JSDOM(html, { url: finalUrl })
    article = new Readability(dom.window.document).parse()
  } catch (e) {
    // jsdom can throw on malformed HTML or invalid CSS — treat as unextractable
    return Response.json({ error: `Parse error: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 422 })
  }

  if (!article) {
    return Response.json({ error: 'Could not extract content' }, { status: 422 })
  }

  return Response.json({
    title: article.title,
    byline: article.byline,
    siteName: article.siteName,
    content: sanitize(article.content ?? ''),
    textLength: article.textContent?.length ?? 0,
  })
}
