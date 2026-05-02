export function buildGoogleNewsUrl(
  query: string,
  lang = 'es',
  country = 'ES'
): string {
  const encoded = encodeURIComponent(query)
  return `https://news.google.com/rss/search?q=${encoded}&hl=${lang}&gl=${country}&ceid=${country}:${lang}`
}

export function buildGoogleNewsFeedTitle(query: string): string {
  return `Google News: ${query}`
}
