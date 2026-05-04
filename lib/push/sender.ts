import webPush from 'web-push'

let initialized = false

function init() {
  if (initialized) return
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) return
  webPush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

interface PushPayload {
  title: string
  body: string
  url: string
}

interface Subscription {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPushNotification(sub: Subscription, payload: PushPayload): Promise<void> {
  init()
  if (!initialized) return
  await webPush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload)
  )
}
