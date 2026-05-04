function normalize(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
}

function similarity(a: string, b: string): number {
  const wa = new Set(normalize(a).split(' '))
  const wb = new Set(normalize(b).split(' '))
  let intersection = 0
  wa.forEach((w) => { if (wb.has(w)) intersection++ })
  const union = wa.size + wb.size - intersection
  return union === 0 ? 1 : intersection / union
}

export interface ArticleGroup<T> {
  main: T
  dupes: T[]
}

export function groupDuplicates<T extends { id: string; title: string; published_at?: string | null }>(
  articles: T[],
  threshold = 0.55
): ArticleGroup<T>[] {
  const assigned = new Set<string>()
  const groups: ArticleGroup<T>[] = []

  for (let i = 0; i < articles.length; i++) {
    if (assigned.has(articles[i].id)) continue
    const main = articles[i]
    const dupes: T[] = []
    const mainDay = main.published_at ? main.published_at.slice(0, 10) : null

    for (let j = i + 1; j < articles.length; j++) {
      if (assigned.has(articles[j].id)) continue
      const candidate = articles[j]
      const candidateDay = candidate.published_at ? candidate.published_at.slice(0, 10) : null
      if (mainDay && candidateDay && mainDay !== candidateDay) continue
      if (similarity(main.title, candidate.title) >= threshold) {
        dupes.push(candidate)
        assigned.add(candidate.id)
      }
    }

    assigned.add(main.id)
    groups.push({ main, dupes })
  }

  return groups
}
