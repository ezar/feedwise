import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { getTranslations } from 'next-intl/server'

export default async function ChatPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('chat')

  const { data: feeds } = await supabase
    .from('feeds')
    .select('id, title, url, folder')
    .eq('user_id', user.id)
    .order('title')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 max-w-3xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Chat</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
      </div>
      <div className="flex-1 min-h-0">
        <ChatInterface feeds={feeds ?? []} />
      </div>
    </div>
  )
}
