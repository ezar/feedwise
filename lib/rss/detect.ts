// Attempts to resolve a user-provided URL to an actual RSS/Atom feed URL.
// If the URL already points to a feed, returns it unchanged.
// If it points to a webpage, looks for <link rel="alternate"> tags.
export async function detectFeedUrl(inputUrl: string): Promise<string> {
  let url: URL
  try {
    url = new URL(inputUrl)
  } catch {
    throw new Error('Invalid URL')
  }

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; feedwise/1.0; +https://feedwise.app)',
      Accept: 'application/rss+xml, application/atom+xml, text/xml, application/xml, text/html, */*',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const contentType = res.headers.get('content-type') ?? ''

  // Already a feed
  if (
    contentType.includes('rss') ||
    contentType.includes('atom') ||
    contentType.includes('xml')
  ) {
    return res.url // use final URL after redirects
  }

  // HTML page — look for <link rel="alternate">
  if (contentType.includes('html')) {
    const html = await res.text()
    // Match both attribute orders: href before type and type before href
    const patterns = [
      /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi,
      /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+rel=["']alternate["']/gi,
      /<link[^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi,
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(html)
      if (match) {
        // Last capture group is always the href value
        const href = match[match.length - 1]
        return new URL(href, res.url).toString()
      }
    }

    throw new Error('No RSS or Atom feed found at this URL. Try pasting the direct feed URL.')
  }

  // Unknown content type — return as-is and let the RSS parser complain
  return res.url
}
