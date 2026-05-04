import { qstash } from './client'

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  throw new Error('NEXT_PUBLIC_APP_URL is not set. QStash requires a public URL.')
}

// Single master schedule — calls /api/jobs/dispatch which fans out to all feeds
export async function createDispatchSchedule(): Promise<string> {
  const appUrl = getAppUrl()
  const schedule = await qstash.schedules.create({
    destination: `${appUrl}/api/jobs/dispatch`,
    cron: '0 * * * *',
    retries: 2,
  })
  return schedule.scheduleId
}

// Publish a one-time message to fetch a single feed (cheap, not a schedule)
export async function publishFeedJob(feedId: string, delaySec = 0): Promise<void> {
  const appUrl = getAppUrl()
  await qstash.publishJSON({
    url: `${appUrl}/api/jobs/fetch-feeds`,
    body: { feedId },
    retries: 3,
    ...(delaySec > 0 ? { delay: delaySec } : {}),
  })
}

// Check if a dispatch schedule already exists
export async function getDispatchScheduleId(): Promise<string | null> {
  const appUrl = getAppUrl().replace(/\/$/, '')
  const schedules = await qstash.schedules.list()
  const found = schedules.find((s) =>
    typeof s.destination === 'string' && s.destination === `${appUrl}/api/jobs/dispatch`
  )
  return found?.scheduleId ?? null
}

// Legacy: kept for feeds that still have individual qstash_schedule_id
export async function removeSchedule(scheduleId: string): Promise<void> {
  await qstash.schedules.delete(scheduleId).catch(() => {})
}
