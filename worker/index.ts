/// <reference lib="WebWorker" />

export type {};
declare const self: ServiceWorkerGlobalScope;

// App Badge API is available in SW via self.navigator in supporting browsers
const nav = self.navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }

interface PushData {
  title: string
  body: string
  url: string
  unread?: number
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as PushData
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: { url: data.url },
        tag: 'feedwise-article',
      }),
      data.unread != null
        ? nav.setAppBadge?.(data.unread) ?? Promise.resolve()
        : nav.setAppBadge?.() ?? Promise.resolve(),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/'
  event.waitUntil(
    Promise.all([
      nav.clearAppBadge?.() ?? Promise.resolve(),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          const existing = clients.find((c) => c.url.includes(self.location.origin))
          if (existing) return existing.focus()
          return self.clients.openWindow(url)
        }),
    ])
  )
})
