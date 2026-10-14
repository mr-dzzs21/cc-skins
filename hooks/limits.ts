import type { RateLimit } from '../types'

/** A limit reading older than this may be behind: the bar marks it with `~`. */
export const STALE_AFTER_MS = 10 * 60_000

/** One reading of the limit windows, and when it was taken. */
export type LimitReading = { rateLimits: RateLimit[]; at: number }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * A reset as `/usage` words it (`resets Oct 14 at 12:39pm`), as an ISO time in
 * this machine's zone: this year's date, or next year's where that one has
 * passed by more than a day. Undefined where the words are not that shape.
 */
const resetAt = (words: string, now: number): string | undefined => {
  const match = /resets (\w{3})\w* (\d{1,2})(?:,? at (\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i.exec(words)
  const month = match === null ? -1 : MONTHS.indexOf((match[1] ?? '').toLowerCase())
  if (match === null || month < 0) {
    return undefined
  }
  const hours12 = Number(match[3] ?? 0) % 12
  const hours = (match[5] ?? '').toLowerCase() === 'pm' ? hours12 + 12 : hours12
  const year = new Date(now).getFullYear()
  const at = (y: number) => new Date(y, month, Number(match[2]), hours, Number(match[4] ?? 0)).getTime()
  const thisYear = at(year)

  return new Date(thisYear < now - 24 * 3_600_000 ? at(year + 1) : thisYear).toISOString()
}

/**
 * The limit windows `/usage` reports, read from its text: the current
 * session's (the 5-hour window) and the current week's across all models.
 * Empty where the text holds neither, as from a plan without limits.
 */
export const parseUsageText = (text: string, now: number): RateLimit[] => {
  const windows: RateLimit[] = []
  for (const [kind, pattern] of [
    ['five_hour', /Current session:\s*(\d+(?:\.\d+)?)%\s*used([^\n]*)/i],
    ['seven_day', /Current week \(all models\):\s*(\d+(?:\.\d+)?)%\s*used([^\n]*)/i],
  ] as const) {
    const match = pattern.exec(text)
    if (match !== null) {
      windows.push({ kind, percentUsed: Number(match[1]), resetsAt: resetAt(match[2] ?? '', now) })
    }
  }

  return windows
}

/**
 * The windows with a newer reading laid over them, window by window; a
 * reset the newer reading lacks is kept from the older.
 */
export const mergeLimits = (older: readonly RateLimit[], newer: readonly RateLimit[]): RateLimit[] => {
  const merged = older.map(limit => {
    const fresh = newer.find(one => one.kind === limit.kind)

    return fresh === undefined ? limit : { ...fresh, resetsAt: fresh.resetsAt ?? limit.resetsAt }
  })

  return [...merged, ...newer.filter(fresh => !older.some(limit => limit.kind === fresh.kind))]
}

/** Whether a reading taken at `at` may be behind now; never taken counts as behind. */
export const isStale = (at: number | null, now: number): boolean => at === null || now - at > STALE_AFTER_MS
