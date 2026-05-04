import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const VALID = ['es', 'en'] as const

export default getRequestConfig(async () => {
  const raw = cookies().get('NEXT_LOCALE')?.value ?? 'es'
  const locale = (VALID as readonly string[]).includes(raw) ? raw : 'es'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
