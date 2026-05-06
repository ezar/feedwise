'use client'

import { useState } from 'react'
import { BarChart3, Settings } from 'lucide-react'
import { ReadingStats } from '@/components/stats/ReadingStats'
import { InterestsForm } from '@/components/settings/InterestsForm'
import { OPMLImport } from '@/components/feeds/OPMLImport'
import { SyncAllButton } from '@/components/settings/SyncAllButton'
import { DiagnosticsPanel } from '@/components/settings/DiagnosticsPanel'
import { LocaleSwitcher } from '@/components/settings/LocaleSwitcher'
import { PushNotifications } from '@/components/settings/PushNotifications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Tab = 'stats' | 'settings'

interface Props {
  initialInterests: string
  initialThreshold: number
  settingsLabels: {
    interestsTitle: string
    interestsDescription: string
    syncTitle: string
    syncDescription: string
    syncHint: string
    diagnosticsTitle: string
    diagnosticsDescription: string
    importTitle: string
    importDescription: string
    pushTitle: string
    pushDescription: string
    languageTitle: string
    languageDescription: string
  }
  buildVersion: string
}

export function PerfilTabs({ initialInterests, initialThreshold, settingsLabels: l, buildVersion }: Props) {
  const [tab, setTab] = useState<Tab>('stats')

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex rounded-lg border overflow-hidden mb-6">
        <button
          onClick={() => setTab('stats')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors',
            tab === 'stats' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Estadísticas
        </button>
        <button
          onClick={() => setTab('settings')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors border-l',
            tab === 'settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          )}
        >
          <Settings className="h-4 w-4" />
          Ajustes
        </button>
      </div>

      {tab === 'stats' && <ReadingStats />}

      {tab === 'settings' && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l.interestsTitle}</CardTitle>
              <CardDescription>{l.interestsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <InterestsForm initialInterests={initialInterests} initialThreshold={initialThreshold} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l.syncTitle}</CardTitle>
              <CardDescription>{l.syncDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SyncAllButton />
              <p className="text-xs text-muted-foreground">{l.syncHint}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l.diagnosticsTitle}</CardTitle>
              <CardDescription>{l.diagnosticsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <DiagnosticsPanel />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l.importTitle}</CardTitle>
              <CardDescription>{l.importDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <OPMLImport />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l.pushTitle}</CardTitle>
              <CardDescription>{l.pushDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <PushNotifications />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{l.languageTitle}</CardTitle>
              <CardDescription>{l.languageDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <LocaleSwitcher />
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center pb-2">{buildVersion}</p>
        </div>
      )}
    </div>
  )
}
