import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RegisterForm from './RegisterForm'

export default async function RegisterPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">feedwise</h1>
          <p className="text-muted-foreground mt-1 text-sm">Crea tu cuenta</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground mt-4">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
