'use client'

import { useState, useEffect } from 'react'
import { Sparkles, MessageSquare } from 'lucide-react'
import { BriefingPanel } from '@/components/briefing/BriefingPanel'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { cn } from '@/lib/utils'

type Tab = 'briefing' | 'chat'

interface Feed { id: string; title: string | null; url: string; folder?: string | null }

export default function IAPage() {
  const [tab, setTab] = useState<Tab>('briefing')
  const [feeds, setFeeds] = useState<Feed[]>([])

  useEffect(() => {
    fetch('/api/feeds', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { feeds?: Feed[] }) => setFeeds(d.feeds ?? []))
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-2xl mx-auto flex flex-col">
      {/* Tab switcher */}
      <div className="flex rounded-lg border overflow-hidden mb-6 shrink-0">
        <button
          onClick={() => setTab('briefing')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors',
            tab === 'briefing' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Sparkles className="h-4 w-4" />
          Briefing
        </button>
        <button
          onClick={() => setTab('chat')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors border-l',
            tab === 'chat' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
      </div>

      {tab === 'briefing' && <BriefingPanel />}

      {tab === 'chat' && (
        <div className="flex flex-col h-[calc(100vh-12rem)] min-h-0">
          <ChatInterface feeds={feeds} />
        </div>
      )}
    </div>
  )
}
