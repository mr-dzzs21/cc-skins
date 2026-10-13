import type { RateLimit } from '../types'

/** `claude-opus-5-5[1m]` → `Opus 5.5`; anything else as given. */
export const prettyModel = (model: string): string => {
  const match = /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?!\d)/i.exec(model)
  if (!match) {
    return model
  }
  const [, family = '', major, minor] = match
  const name = family.charAt(0).toUpperCase() + family.slice(1).toLowerCase()

  return minor === undefined ? `${name} ${major}` : `${name} ${major}.${minor}`
}

/** `3s`, `1m 4s`, `1h 2m`: the engine's own turn-line format. */
export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

/** Time left until `resetsAt`: `42m`, `2h13m`, `3d4h`; empty when unknown or past. */
export const formatReset = (resetsAt: string | undefined, now: number): string => {
  const at = resetsAt === undefined ? NaN : Date.parse(resetsAt)
  const left = at - now
  if (!Number.isFinite(left) || left <= 0) {
    return ''
  }
  const minutes = Math.ceil(left / 60_000)
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h${String(minutes % 60).padStart(2, '0')}m`
  }

  return `${Math.floor(hours / 24)}d${hours % 24}h`
}

export const formatCost = (usd: number): string =>
  usd >= 100 ? `$${Math.round(usd)}` : `$${usd.toFixed(2)}`

export const formatPercent = (percent: number): string => `${Math.round(percent)}%`

/** A text meter of `width` cells, `percent` of them filled (at least one once above 0). */
export const bar = (percent: number, width: number, fill: string, empty: string): string => {
  const clamped = Math.min(100, Math.max(0, percent))
  const filled = clamped > 0 ? Math.max(1, Math.round((clamped / 100) * width)) : 0

  return fill.repeat(filled) + empty.repeat(width - filled)
}

/** The theme key a fill level is drawn in. */
export const levelColor = (percent: number): 'success' | 'warning' | 'error' =>
  percent < 60 ? 'success' : percent < 85 ? 'warning' : 'error'

const LIMIT_LABELS: Record<string, string> = {
  five_hour: '5h',
  seven_day: '7d',
  spend_limit: 'spend',
}

export const limitLabel = (limit: RateLimit): string => LIMIT_LABELS[limit.kind] ?? limit.kind
