/// <reference lib="WebWorker" />

export type {};
declare const self: ServiceWorkerGlobalScope;

interface PushData {
  title: string
  body: string
  url: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as PushData
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url },
      tag: 'feedwise-article',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
