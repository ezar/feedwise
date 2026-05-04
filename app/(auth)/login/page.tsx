import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">feedwise</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('signInTitle')}</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('noAccount')}{' '}
          <a href="/register" className="underline">
            {t('register')}
          </a>
        </p>
      </div>
    </div>
  )
}
