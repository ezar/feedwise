import { createClient } from '@/lib/supabase/server'
import { InterestsForm } from '@/components/settings/InterestsForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">Configuración</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intereses y umbral de relevancia</CardTitle>
        </CardHeader>
        <CardContent>
          <InterestsForm
            initialInterests={profile?.interests ?? ''}
            initialThreshold={profile?.threshold ?? 50}
          />
        </CardContent>
      </Card>
    </div>
  )
}
