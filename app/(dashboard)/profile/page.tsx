import { createClient } from '@/lib/supabase/server'
import { PerfilTabs } from '@/components/settings/PerfilTabs'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

function buildVersion(): string {
  const raw = process.env.NEXT_PUBLIC_BUILD_TIME
  if (!raw) return 'dev'
  const d = new Date(raw)
  const yy = String(d.getUTCFullYear()).slice(2)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `v${yy}.${mm}.${dd}.${hh}${min}`
}

export default async function PerfilPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('settings')
  const tNav = await getTranslations('nav')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('interests, threshold')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{tNav('profile')}</h2>
      <PerfilTabs
        initialInterests={profile?.interests ?? ''}
        initialThreshold={profile?.threshold ?? 50}
        buildVersion={buildVersion()}
        settingsLabels={{
          interestsTitle: t('interestsTitle'),
          interestsDescription: t('interestsDescription'),
          syncTitle: t('syncTitle'),
          syncDescription: t('syncDescription'),
          syncHint: t('syncHint'),
          diagnosticsTitle: t('diagnosticsTitle'),
          diagnosticsDescription: t('diagnosticsDescription'),
          importTitle: t('importTitle'),
          importDescription: t('importDescription'),
          pushTitle: t('pushTitle'),
          pushDescription: t('pushDescription'),
          languageTitle: t('languageTitle'),
          languageDescription: t('languageDescription'),
        }}
      />
    </div>
  )
}
