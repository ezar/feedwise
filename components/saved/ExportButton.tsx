'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Article {
  title: string
  url: string
  published_at?: string | null
  feeds?: { title?: string | null } | null
}

interface ExportButtonProps {
  articles: Article[]
}

function toCSV(articles: Article[]): string {
  const header = 'Title,URL,Source,Date'
  const rows = articles.map((a) => {
    const date = a.published_at ? new Date(a.published_at).toISOString().slice(0, 10) : ''
    const source = a.feeds?.title ?? ''
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`
    return [escape(a.title), escape(a.url), escape(source), date].join(',')
  })
  return [header, ...rows].join('\n')
}

function toMarkdown(articles: Article[]): string {
  return articles
    .map((a) => {
      const date = a.published_at ? new Date(a.published_at).toISOString().slice(0, 10) : ''
      const source = a.feeds?.title ? ` · ${a.feeds.title}` : ''
      return `- [${a.title}](${a.url})${source ? ` *(${source})* ` : ' '}${date}`
    })
    .join('\n')
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({ articles }: ExportButtonProps) {
  const [open, setOpen] = useState(false)

  if (!articles.length) return null

  const date = new Date().toISOString().slice(0, 10)

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-popover border rounded-md shadow-md py-1 min-w-[140px]">
            <button
              onClick={() => {
                download(toCSV(articles), `saved-${date}.csv`, 'text/csv')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              CSV
            </button>
            <button
              onClick={() => {
                download(toMarkdown(articles), `saved-${date}.md`, 'text/markdown')
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              Markdown
            </button>
          </div>
        </>
      )}
    </div>
  )
}
