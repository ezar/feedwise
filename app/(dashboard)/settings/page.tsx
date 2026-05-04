import { createClient } from '@/lib/supabase/server'
import { InterestsForm } from '@/components/settings/InterestsForm'
import { OPMLImport } from '@/components/feeds/OPMLImport'
import { SyncAllButton } from '@/components/settings/SyncAllButton'
import { DiagnosticsPanel } from '@/components/settings/DiagnosticsPanel'
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
          <CardTitle className="text-base">Sincronización</CardTitle>
          <CardDescription>
            Los feeds se actualizan automáticamente cada hora vía QStash. Puedes forzarlo manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SyncAllButton />
          <p className="text-xs text-muted-foreground">
            Proceso en segundo plano — puede tardar varios minutos con muchos feeds.
            También puedes actualizar feeds individuales desde su página de detalle.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnóstico</CardTitle>
          <CardDescription>Estado del cron de QStash y del scoring de IA.</CardDescription>
        </CardHeader>
        <CardContent>
          <DiagnosticsPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importar feeds</CardTitle>
          <CardDescription>Importa tus suscripciones desde Feedly u otro lector vía OPML.</CardDescription>
        </CardHeader>
        <CardContent>
          <OPMLImport />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center pb-2">
        v{buildVersion()}
      </p>
    </div>
  )
}

function buildVersion(): string {
  const raw = process.env.NEXT_PUBLIC_BUILD_TIME
  if (!raw) return 'dev'
  const d = new Date(raw)
  const yy = String(d.getUTCFullYear()).slice(2)
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd}.${hh}${min}`
}
