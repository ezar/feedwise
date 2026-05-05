import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('highlights')
    .select('id, text, created_at')
    .eq('article_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return Response.json({ highlights: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json() as { text?: string }
  if (!text?.trim()) return Response.json({ error: 'text required' }, { status: 400 })

  const { data, error } = await supabase
    .from('highlights')
    .insert({ article_id: params.id, user_id: user.id, text: text.trim() })
    .select('id, text, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ highlight: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const highlightId = searchParams.get('highlight_id')
  if (!highlightId) return Response.json({ error: 'highlight_id required' }, { status: 400 })

  await supabase
    .from('highlights')
    .delete()
    .eq('id', highlightId)
    .eq('article_id', params.id)
    .eq('user_id', user.id)

  return Response.json({ ok: true })
}
