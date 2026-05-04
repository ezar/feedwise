'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/providers/ToastProvider'
import { useTranslations } from 'next-intl'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)))
}

export function PushNotifications() {
  const t = useTranslations('push')
  const { toast } = useToast()
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    const ok = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setSupported(ok)
    if (!ok) { setLoading(false); return }
    setPermission(Notification.permission)

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setEnabled(!!sub)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const subscribe = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      toast({ title: t('notConfigured'), variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        toast({ title: t('permissionDenied'), variant: 'destructive' })
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      })

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      if (!res.ok) throw new Error()

      setEnabled(true)
      toast({ title: t('enabled') })
    } catch {
      toast({ title: t('error'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEnabled(false)
      toast({ title: t('disabled') })
    } catch {
      toast({ title: t('error'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return <p className="text-sm text-muted-foreground">{t('notSupported')}</p>
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={enabled ? 'outline' : 'default'}
        size="sm"
        disabled={loading || permission === 'denied'}
        onClick={enabled ? unsubscribe : subscribe}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : enabled
            ? <BellOff className="h-4 w-4" />
            : <Bell className="h-4 w-4" />
        }
        {loading ? t('loading') : enabled ? t('disable') : t('enable')}
      </Button>
      {permission === 'denied' && (
        <p className="text-xs text-muted-foreground">{t('permissionDenied')}</p>
      )}
      {enabled && <span className="text-xs text-green-600">{t('active')}</span>}
    </div>
  )
}
