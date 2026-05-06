import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const anthropic = new Anthropic()

type Scope =
  | { type: 'general' }
  | { type: 'feed'; feedId: string }
  | { type: 'folder'; folder: string }

async function fetchArticles(supabase: ReturnType<typeof createClient>, scope: Scope) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  if (scope.type === 'feed') {
    const { data } = await supabase
      .from('articles')
      .select('title, ai_summary, description, published_at, tags, relevance_score')
      .eq('feed_id', scope.feedId)
      .gte('published_at', since)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(100)
    return data ?? []
  }

  if (scope.type === 'folder') {
    // Get feed IDs in this folder first
    const { data: feeds } = await supabase
      .from('feeds')
      .select('id')
      .eq('folder', scope.folder)
    const feedIds = (feeds ?? []).map((f) => f.id as string)
    if (!feedIds.length) return []

    const { data } = await supabase
      .from('articles')
      .select('title, ai_summary, description, published_at, tags, relevance_score, feeds!inner(title)')
      .in('feed_id', feedIds)
      .gte('published_at', since)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(100)
    return data ?? []
  }

  // General — all user's recent articles via feeds join
  const { data } = await supabase
    .from('articles')
    .select('title, ai_summary, description, published_at, tags, relevance_score, feeds!inner(title, user_id)')
    .gte('published_at', since)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .limit(100)
  return data ?? []
}

function buildContext(articles: ReturnType<typeof Array.prototype.map>) {
  if (!articles.length) return 'No hay artículos recientes disponibles.'

  return articles.map((a, i) => {
    type ArticleRow = {
      title: string
      ai_summary?: string | null
      description?: string | null
      published_at?: string | null
      tags?: string[] | null
      relevance_score?: number | null
      feeds?: { title?: string | null } | { title?: string | null }[] | null
    }
    const art = a as ArticleRow
    const feedTitle = Array.isArray(art.feeds)
      ? (art.feeds[0] as { title?: string | null } | undefined)?.title
      : (art.feeds as { title?: string | null } | null)?.title
    const summary = art.ai_summary
      ?? art.description?.replace(/<[^>]*>/g, '').trim().slice(0, 200)
      ?? ''
    const pub = art.published_at
      ? new Date(art.published_at).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
      : ''
    const tags = (art.tags as string[] | null)?.join(', ') ?? ''
    return [
      `[${i + 1}] ${art.title}`,
      feedTitle ? `    Fuente: ${feedTitle}` : '',
      pub ? `    Fecha: ${pub}` : '',
      tags ? `    Tags: ${tags}` : '',
      summary ? `    Resumen: ${summary}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    question: string
    scope: 'general' | 'feed' | 'folder'
    feedId?: string
    folder?: string
  }
  const { question, scope, feedId, folder } = body
  if (!question?.trim()) return Response.json({ error: 'question required' }, { status: 400 })

  const scopeObj: Scope =
    scope === 'feed' && feedId ? { type: 'feed', feedId } :
    scope === 'folder' && folder ? { type: 'folder', folder } :
    { type: 'general' }

  const articles = await fetchArticles(supabase, scopeObj)
  const context = buildContext(articles)

  const system = `Eres un asistente de lectura de noticias inteligente. \
El usuario tiene acceso a ${articles.length} artículos de sus feeds de los últimos 14 días. \
Responde siempre en el mismo idioma que la pregunta del usuario. \
Sé conciso y útil. Cita los títulos de los artículos relevantes cuando corresponda. \
Si la información no está en los artículos proporcionados, dilo claramente.

ARTÍCULOS DISPONIBLES:
${context}`

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system,
          messages: [{ role: 'user', content: question }],
        })
        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
