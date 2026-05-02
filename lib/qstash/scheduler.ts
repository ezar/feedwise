import { qstash } from './client'

export async function scheduleHourlyFetch(
  feedId: string,
  appUrl: string
): Promise<string> {
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
