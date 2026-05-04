'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function setLocale(locale: string) {
  const valid = ['es', 'en'].includes(locale) ? locale : 'es'
  cookies().set('NEXT_LOCALE', valid, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profile').update({ locale: valid }).eq('id', user.id)
    }
  } catch {
    // Best-effort DB sync; cookie is the source of truth
  }
}
