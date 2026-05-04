'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Rss, Bookmark, Settings, LayoutDashboard, BarChart3, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: t('feed'), icon: LayoutDashboard },
    { href: '/briefing', label: t('briefing'), icon: Sparkles },
    { href: '/feeds', label: t('feeds'), icon: Rss },
    { href: '/saved', label: t('saved'), icon: Bookmark },
    { href: '/stats', label: t('stats'), icon: BarChart3 },
    { href: '/settings', label: t('settings'), icon: Settings },
  ]

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-card h-screen sticky top-0 p-4 gap-1">
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
              pathname === href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
