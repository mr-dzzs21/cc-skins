import type { Prefs } from '../types'

/** What each feature does until the person changes it: sound and notifications stay off. */
export const DEFAULT_PREFS: Prefs = {
  alertAt: 80,
  compactButton: true,
  clickable: true,
  warnColors: 'all',
  turnCost: true,
  turnTokens: false,
  turnTools: true,
  sound: false,
  soundName: 'skin',
  soundGain: 1,
  notify: false,
  notifyPreview: false,
  notifyAfterSec: 30,
}

/** The thresholds the settings offer for alerts; 0 is off. */
export const ALERT_LEVELS = [0, 70, 80, 90] as const

/** The loudness the settings offer: quiet, normal, loud. */
export const SOUND_GAINS = [0.5, 1, 1.8] as const

/** How long a turn must run before it sounds or notifies, as the settings offer it. */
export const NOTIFY_AFTER = [0, 10, 30, 60] as const

/** The stored prefs over the defaults, each field kept only where it has the right kind. */
export const readPrefs = (stored: unknown): Prefs => {
  const prefs: Prefs = { ...DEFAULT_PREFS }
  if (typeof stored !== 'object' || stored === null) {
    return prefs
  }
  const record = stored as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) {
    const value = record[key]
    if (typeof value === typeof DEFAULT_PREFS[key]) {
      ;(prefs as Record<keyof Prefs, unknown>)[key] = value
    }
  }

  return prefs
}
