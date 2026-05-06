export function timeAgo(dateStr: string | null | undefined, locale?: string): string | null {
  if (!dateStr) return null
  const diffSec = (new Date(dateStr).getTime() - Date.now()) / 1000
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat(locale ?? 'es', { numeric: 'auto' })
  if (abs < 60)   return rtf.format(Math.round(diffSec), 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), 'day')
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 604800), 'week')
  return new Date(dateStr).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}
