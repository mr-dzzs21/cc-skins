import type { Usage } from '../types'
import { formatPercent, formatReset } from './format'

/** Where the compact block shows while alerts are off. */
const COMPACT_AT_WITHOUT_ALERTS = 80

/** The second, louder level every unit alerts at. */
const URGENT = 95

/** How far a unit must drop below the threshold before it may alert again (a reset, a compact). */
const REARM_MARGIN = 5

/** The context percent at which the bar offers to compact. */
export const compactAt = (alertAt: number) => (alertAt > 0 ? alertAt : COMPACT_AT_WITHOUT_ALERTS)

const LIMIT_NAMES: Record<string, string> = { five_hour: '5-hour', seven_day: '7-day', spend_limit: 'Spend' }

export type Alert = { unit: string; level: number; text: string }

/**
 * The alerts a measurement raises: the context and each limit window once
 * as it reaches `alertAt`, once more at 95 %, and again only after it has
 * dropped back below the threshold. `alerted` is the level each unit last
 * alerted at; the answer carries it on.
 */
export const alertsFor = (
  usage: Usage,
  alertAt: number,
  alerted: Readonly<Record<string, number>>,
  now: number,
): { alerts: Alert[]; alerted: Record<string, number> } => {
  if (alertAt <= 0) {
    return { alerts: [], alerted: { ...alerted } }
  }
  const levels = alertAt < URGENT ? [alertAt, URGENT] : [alertAt]
  const units: { unit: string; percent: number; text: string }[] = []
  if (usage.contextPercent !== null) {
    units.push({
      unit: 'context',
      percent: usage.contextPercent,
      text: `Context ${formatPercent(usage.contextPercent)} full · compact from the bar, or /compact`,
    })
  }
  for (const limit of usage.rateLimits) {
    const reset = formatReset(limit.resetsAt, now)
    units.push({
      unit: limit.kind,
      percent: limit.percentUsed,
      text: `${LIMIT_NAMES[limit.kind] ?? limit.kind} limit at ${formatPercent(limit.percentUsed)}${reset === '' ? '' : ` · resets in ${reset}`}`,
    })
  }

  const next: Record<string, number> = { ...alerted }
  const alerts: Alert[] = []
  for (const { unit, percent, text } of units) {
    const reached = levels.filter(level => percent >= level).at(-1) ?? 0
    const previous = alerted[unit] ?? 0
    if (reached > previous) {
      alerts.push({ unit, level: reached, text })
      next[unit] = reached
    } else if (reached === 0 && percent < alertAt - REARM_MARGIN) {
      next[unit] = 0
    }
  }

  return { alerts, alerted: next }
}
