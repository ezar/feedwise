'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TopBar() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b flex items-center px-4 justify-between bg-background sticky top-0 z-10">
      <span className="md:hidden font-bold tracking-tight">feedwise</span>
      <div className="flex-1" />
      <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )
}
