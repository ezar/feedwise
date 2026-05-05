'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Rss, Bookmark, Settings, LayoutDashboard, Sparkles, Folder } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function Sidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeFolder = searchParams.get('folder')

  const [folders, setFolders] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/folders', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { folders?: string[] }) => setFolders(d.folders ?? []))
      .catch(() => {})
  }, [])

  const navItems = [
    { href: '/', label: t('feed'), icon: LayoutDashboard },
    { href: '/briefing', label: t('briefing'), icon: Sparkles },
    { href: '/feeds', label: t('feeds'), icon: Rss },
    { href: '/saved', label: t('saved'), icon: Bookmark },
    { href: '/settings', label: t('settings'), icon: Settings },
  ]

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-card h-screen sticky top-0 p-4 gap-1 overflow-y-auto">
      <div className="mb-4 px-2">
        <h1 className="text-lg font-bold tracking-tight">feedwise</h1>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === href && !activeFolder
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {folders.length > 0 && (
          <>
            <div className="mt-3 mb-1 px-3">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Carpetas</p>
            </div>
            {folders.map((folder) => (
              <Link
                key={folder}
                href={`/?folder=${encodeURIComponent(folder)}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === '/' && activeFolder === folder
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Folder className="h-4 w-4" />
                {folder}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
