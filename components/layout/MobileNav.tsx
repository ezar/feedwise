'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Rss, Bookmark, User, Bot } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: t('feed'), icon: LayoutDashboard },
    { href: '/ia', label: 'IA', icon: Bot },
    { href: '/feeds', label: t('feeds'), icon: Rss },
    { href: '/saved', label: t('saved'), icon: Bookmark },
    { href: '/profile', label: 'Perfil', icon: User },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-10">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
              pathname === href ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
