import { createClient } from '@/lib/supabase/server'
import { InterestsForm } from '@/components/settings/InterestsForm'
import { OPMLImport } from '@/components/feeds/OPMLImport'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('interests, threshold')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <h2 className="text-xl font-semibold">Configuración</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intereses y umbral de relevancia</CardTitle>
          <CardDescription>Claude usa esto para puntuar cada artículo del 0 al 100.</CardDescription>
        </CardHeader>
        <CardContent>
          <InterestsForm
            initialInterests={profile?.interests ?? ''}
            initialThreshold={profile?.threshold ?? 50}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importar feeds</CardTitle>
          <CardDescription>Importa tus suscripciones desde Feedly u otro lector vía OPML.</CardDescription>
        </CardHeader>
        <CardContent>
          <OPMLImport onImported={() => {}} />
        </CardContent>
      </Card>
    </div>
  )
}
