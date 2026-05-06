import { createClient } from '@/lib/supabase/server'
import { publishFeedJob } from '@/lib/qstash/scheduler'

interface OpmlFeed {
  title: string
  url: string
}

function parseOpml(xmlText: string): OpmlFeed[] {
  const feeds: OpmlFeed[] = []
  const regex = /<outline[^>]+xmlUrl="([^"]+)"[^>]*(?:title|text)="([^"]+)"/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(xmlText)) !== null) {
    feeds.push({ url: match[1], title: match[2] })
  }

  const regex2 = /<outline[^>]+(?:title|text)="([^"]+)"[^>]+xmlUrl="([^"]+)"/gi
  while ((match = regex2.exec(xmlText)) !== null) {
    const url = match[2]
    if (!feeds.some((f) => f.url === url)) {
      feeds.push({ url, title: match[1] })
    }
  }

  return feeds
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'file required' }, { status: 400 })

  const text = await file.text()
  const feeds = parseOpml(text)

  if (feeds.length === 0) {
    return Response.json({ error: 'No feeds found in OPML' }, { status: 400 })
  }

  const inserted: string[] = []
  const skipped: string[] = []

  for (const feed of feeds) {
    const { data, error } = await supabase
      .from('feeds')
      .insert({
        user_id: user.id,
        url: feed.url,
        title: feed.title,
        feed_type: 'manual',
      })
      .select('id')
      .single()

    if (error) {
      skipped.push(feed.url)
      continue
    }

    inserted.push(feed.url)
    publishFeedJob(data.id as string).catch((err) =>
      console.error('Failed to publish feed job:', err)
    )
  }

  return Response.json({ inserted: inserted.length, skipped: skipped.length })
}
