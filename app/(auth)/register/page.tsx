import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import RegisterForm from './RegisterForm'

export default async function RegisterPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">feedwise</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('signUpTitle')}</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('hasAccount')}{' '}
          <a href="/login" className="underline">
            {t('login')}
          </a>
        </p>
      </div>
    </div>
  )
}
