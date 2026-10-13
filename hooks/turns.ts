import type { Prefs, TurnStat } from '../types'
import { formatCost, formatTokens } from './format'

/** How many finished turns to keep, for the lines still on screen. */
export const MAX_TURN_STATS = 200

/** How far a line's duration may lie from its turn's and still be that turn's. */
const MATCH_WINDOW_MS = 2_000

/**
 * The turn a closing line belongs to, by its duration: the same one exactly,
 * else the newest within two seconds of it.
 */
export const findTurnStat = (stats: readonly TurnStat[], durationMs: number): TurnStat | undefined => {
  let nearest: TurnStat | undefined
  for (let i = stats.length - 1; i >= 0; i--) {
    const stat = stats[i]
    if (stat === undefined) {
      continue
    }
    if (stat.durationMs === durationMs) {
      return stat
    }
    const distance = Math.abs(stat.durationMs - durationMs)
    if (distance <= MATCH_WINDOW_MS && (nearest === undefined || distance < Math.abs(nearest.durationMs - durationMs))) {
      nearest = stat
    }
  }

  return nearest
}

/** What the closing line adds, as the person chose: `$0.04 · 12k tok · 3 tools`; empty for nothing. */
export const turnStatText = (stat: TurnStat | undefined, prefs: Prefs): string => {
  if (stat === undefined) {
    return ''
  }
  const parts: string[] = []
  if (prefs.turnCost && stat.costUsd !== null) {
    parts.push(formatCost(stat.costUsd))
  }
  if (prefs.turnTokens && stat.tokens !== null) {
    parts.push(`${formatTokens(stat.tokens)} tok`)
  }
  if (prefs.turnTools && stat.tools > 0) {
    parts.push(`${stat.tools} ${stat.tools === 1 ? 'tool' : 'tools'}`)
  }

  return parts.join(' · ')
}
