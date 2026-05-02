import { createClient } from '@/lib/supabase/server'
import { extractTopics } from '@/lib/ai/topic-extractor'
import { buildGoogleNewsUrl, buildGoogleNewsFeedTitle } from '@/lib/rss/google-news'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { text?: string }
  const { text } = body
  if (!text) return Response.json({ error: 'text required' }, { status: 400 })

  const queries = await extractTopics(text)

  const preview = queries.map((query) => ({
    query,
    url: buildGoogleNewsUrl(query),
    title: buildGoogleNewsFeedTitle(query),
  }))

  return Response.json({ queries, preview })
}
