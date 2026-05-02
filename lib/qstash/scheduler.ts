import { qstash } from './client'

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  // VERCEL_URL is set automatically by Vercel (no protocol)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  throw new Error('NEXT_PUBLIC_APP_URL is not set. QStash requires a public URL.')
}

export async function scheduleHourlyFetch(feedId: string): Promise<string> {
  const appUrl = getAppUrl()
  const schedule = await qstash.schedules.create({
    destination: `${appUrl}/api/jobs/fetch-feeds`,
    cron: '0 * * * *',
    body: JSON.stringify({ feedId }),
    headers: { 'Content-Type': 'application/json' },
    retries: 3,
  })
  return schedule.scheduleId
}

export async function removeSchedule(scheduleId: string): Promise<void> {
  await qstash.schedules.delete(scheduleId)
}
