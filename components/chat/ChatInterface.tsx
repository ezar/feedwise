'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, MessageSquare, ChevronDown, PenSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface Feed { id: string; title: string | null; url: string; folder?: string | null }

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ScopeOption {
  label: string
  scope: 'general' | 'feed' | 'folder'
  feedId?: string
  folder?: string
}

const SUGGESTIONS_ES = [
  '¿Qué novedades hay esta semana?',
  '¿Cuáles son los artículos más relevantes de hoy?',
  '¿Hay algo sobre inteligencia artificial?',
  '¿Qué tendencias destacan en mis feeds?',
]

const SUGGESTIONS_EN = [
  "What's new this week?",
  "What are the most relevant articles today?",
  "Is there anything about artificial intelligence?",
  "What trends stand out in my feeds?",
]

function MarkdownText({ text }: { text: string }) {
  // Minimal markdown: bold, inline code, line breaks
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="bg-muted px-1 rounded text-xs font-mono">{part.slice(1, -1)}</code>
        if (part === '\n') return <br key={i} />
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export function ChatInterface({ feeds }: { feeds: Feed[] }) {
  const t = useTranslations('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(false)
  const [selectedScope, setSelectedScope] = useState<ScopeOption>({ label: t('scopeAll'), scope: 'general' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Build scope options from feeds
  const folders = Array.from(new Set(feeds.map((f) => f.folder).filter(Boolean))) as string[]
  const scopeOptions: ScopeOption[] = [
    { label: t('scopeAll'), scope: 'general' },
    ...folders.map((folder) => ({ label: `📁 ${folder}`, scope: 'folder' as const, folder })),
    ...feeds.map((f) => ({ label: f.title ?? f.url, scope: 'feed' as const, feedId: f.id })),
  ]

  const suggestions = t('locale') === 'en' ? SUGGESTIONS_EN : SUGGESTIONS_ES

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return
    setInput('')
    const userMsg = { role: 'user' as const, content: question }
    const nextMessages = [...messages, userMsg]
    setMessages([...nextMessages, { role: 'assistant' as const, content: '' }])
    setStreaming(true)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: nextMessages,
          scope: selectedScope.scope,
          feedId: selectedScope.feedId,
          folder: selectedScope.folder,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: full },
        ])
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: t('error') },
        ])
      }
    } finally {
      setStreaming(false)
    }
  }, [streaming, selectedScope, t])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send(input)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Scope selector + new chat */}
      <div className="flex items-center gap-2 mb-4">
      <div className="relative flex-1">
        <button
          onClick={() => setScopeOpen((v) => !v)}
          className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 bg-background hover:bg-muted transition-colors w-full"
        >
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium truncate max-w-[200px]">{selectedScope.label}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 transition-transform', scopeOpen && 'rotate-180')} />
        </button>
        {scopeOpen && (
          <div className="absolute z-20 top-full mt-1 left-0 bg-background border rounded-lg shadow-lg py-1 min-w-[220px] max-h-64 overflow-y-auto">
            {scopeOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => { setSelectedScope(opt); setScopeOpen(false) }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors truncate',
                  opt.scope === selectedScope.scope &&
                    opt.feedId === selectedScope.feedId &&
                    opt.folder === selectedScope.folder
                    ? 'text-primary font-medium'
                    : 'text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {messages.length > 0 && (
        <button
          onClick={() => { abortRef.current?.abort(); setMessages([]); setStreaming(false) }}
          title="Nueva conversación"
          className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg border bg-background hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <PenSquare className="h-4 w-4" />
        </button>
      )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{t('emptyTitle')}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t('emptyHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'rounded-2xl px-4 py-2.5 max-w-[85%] text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            )}>
              {msg.role === 'assistant' && !msg.content && streaming ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <MarkdownText text={msg.content} />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('placeholder')}
          rows={1}
          disabled={streaming}
          className="flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 disabled:opacity-50"
          style={{ maxHeight: 120, overflowY: 'auto' }}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || streaming} className="shrink-0 rounded-xl h-10 w-10">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}
