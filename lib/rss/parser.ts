import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'feedwise/1.0' },
})

export interface ParsedItem {
  guid: string
  title: string
  url: string
  description: string | null
  publishedAt: string | null
}

export async function parseRSSFeed(url: string): Promise<ParsedItem[]> {
  const feed = await parser.parseURL(url)
  return feed.items.map((item) => ({
    guid: item.guid ?? item.link ?? item.title ?? crypto.randomUUID(),
    title: item.title ?? 'Sin título',
    url: item.link ?? url,
    description: item.contentSnippet ?? item.content ?? null,
    publishedAt: item.pubDate ?? item.isoDate ?? null,
  }))
}
