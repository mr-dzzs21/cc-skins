import type { ContextBreakdown, Glyphs, TurnStat, Usage, UsagePoint, WarnColors } from '../types'
import { bar, formatCost, formatDuration, formatElapsed, formatPercent, formatReset, formatTokens, prettyModel } from './format'
import { alertFor } from './hud'
import { isStale } from './limits'
import { formatClock } from './chat'
import type { Elements } from './panels'
import type { Skin } from './skins'

/** The pane `/skin usage` opens. */
export const DASHBOARD = 'usage-dashboard'

/** What the dashboard asks for: room for its sections docked, fewer rows inline. */
export const DASHBOARD_COLUMNS = 72
export const DASHBOARD_ROWS = 26

/** How many measurements to keep for the trends. */
export const MAX_HISTORY = 240

/** How many of the breakdown's rows to list, the largest first. */
const BREAKDOWN_ROWS = 6

const LEVELS = '▁▂▃▄▅▆▇█'

/**
 * A sparkline of the newest `width` values, scaled to `ceiling` (or to the
 * largest of them): one block per value, empty where there is none yet.
 */
export const sparkline = (values: readonly number[], width: number, ceiling?: number): string => {
  const shown = values.slice(-Math.max(1, width))
  const top = ceiling ?? Math.max(0, ...shown)
  if (shown.length === 0) {
    return ''
  }

  return shown
    .map(value => {
      const ratio = top <= 0 ? 0 : Math.min(1, Math.max(0, value / top))

      return LEVELS[Math.min(LEVELS.length - 1, Math.round(ratio * (LEVELS.length - 1)))] ?? LEVELS[0]
    })
    .join('')
}

export type DashboardView = {
  usage: Usage
  effort: string | null
  branch: string | null
  now: number
  glyphs: Glyphs
  history: readonly UsagePoint[]
  turns: readonly TurnStat[]
  breakdown: ContextBreakdown | null
  columns: number
  isWorking: boolean
  /** When the limit windows were last read; null before any. */
  limitsAt: number | null
  warnColors?: WarnColors
}

export type DashboardActions = { refresh: () => void; compact: () => void; liveLimits: () => void }

const LIMIT_NAMES: Record<string, string> = { five_hour: '5-hour', seven_day: '7-day', spend_limit: 'Spend' }

/** The session's totals over its finished turns. */
export const turnTotals = (turns: readonly TurnStat[]) => {
  const costs = turns.map(turn => turn.costUsd).filter((cost): cost is number => cost !== null)

  return {
    count: turns.length,
    tools: turns.reduce((sum, turn) => sum + turn.tools, 0),
    tokens: turns.reduce((sum, turn) => sum + (turn.tokens ?? 0), 0),
    costs,
    average: costs.length === 0 ? null : costs.reduce((sum, cost) => sum + cost, 0) / costs.length,
    priciest: costs.length === 0 ? null : Math.max(...costs),
  }
}

/**
 * The usage dashboard: the context with its trend and breakdown, the limit
 * windows, the cost and its trend per turn, the session's totals, then a
 * refresh and a compact button.
 */
export const drawDashboard = (elements: Elements, skin: Skin, view: DashboardView, act: DashboardActions) => {
  const { Box, Text, Button } = elements
  const { usage, now } = view
  const { chat } = skin
  const label = (text: string) => <Text color={chat.muted}>{text.padEnd(10)}</Text>
  const meterWidth = Math.max(10, Math.min(30, view.columns - 34))
  const sparkWidth = Math.max(8, view.columns - 14)
  const levelColor = (percent: number) => {
    const alert = alertFor(percent, view.warnColors)

    return alert === undefined ? chat.assistant : skin.colors[alert].bg
  }
  const section = (key: string, title: string) => (
    <Text key={key} color={chat.assistant} bold>
      {title}
    </Text>
  )
  const totals = turnTotals(view.turns)
  const header = [
    usage.model === null ? 'Usage' : prettyModel(usage.model),
    view.effort ?? undefined,
    view.branch ?? undefined,
  ].filter(part => part !== undefined)

  return (
    <Box flexDirection="column">
      <Text key="title" bold>
        <Text color={chat.assistant}>{`${view.glyphs === 'nerd' ? skin.icon : skin.glyph} `}</Text>
        {header.join(' · ')}
      </Text>

      {section('context-title', 'Context')}
      <Text key="context-meter">
        {label('used')}
        {usage.contextPercent === null ? (
          <Text color={chat.muted}>no reading yet</Text>
        ) : (
          <Text color={levelColor(usage.contextPercent)}>
            {`${bar(usage.contextPercent, meterWidth, skin.meter.fill, skin.meter.empty)} ${formatPercent(usage.contextPercent)}`}
          </Text>
        )}
        {usage.contextTokens !== null && <Text color={chat.muted}>{`  ${formatTokens(usage.contextTokens)}`}</Text>}
      </Text>
      <Text key="context-trend">
        {label('trend')}
        <Text color={chat.user}>
          {sparkline(
            view.history.map(point => point.contextPercent ?? 0),
            sparkWidth,
            100,
          ) || '–'}
        </Text>
      </Text>
      {view.breakdown !== null &&
        [...view.breakdown.rows]
          .sort((a, b) => b.tokens - a.tokens)
          .slice(0, BREAKDOWN_ROWS)
          .map(row => {
            const share = view.breakdown === null || view.breakdown.maxTokens === 0 ? 0 : (row.tokens / view.breakdown.maxTokens) * 100

            return (
              <Text key={`row-${row.name}`} wrap="truncate-end">
                <Text color={chat.muted}>{`  ${row.name.slice(0, 22).padEnd(22)} `}</Text>
                <Text color={row.color}>{bar(share, 10, '■', ' ')}</Text>
                <Text color={chat.muted}>{` ${formatTokens(row.tokens).padStart(5)}`}</Text>
              </Text>
            )
          })}

      {usage.rateLimits.length > 0 && section('limits-title', 'Limits')}
      {usage.rateLimits.length > 0 && (
        <Text key="limits-age" color={isStale(view.limitsAt, now) ? skin.colors.warn.bg : chat.muted} wrap="truncate-end">
          {view.limitsAt === null
            ? 'not read this session yet: Live limits reads them now'
            : `as of ${formatClock(view.limitsAt)}${isStale(view.limitsAt, now) ? ', may be behind: Live limits reads them now' : ''}`}
        </Text>
      )}
      {usage.rateLimits.map(limit => {
        const reset = formatReset(limit.resetsAt, now)

        return (
          <Text key={`limit-${limit.kind}`}>
            {label(LIMIT_NAMES[limit.kind] ?? limit.kind)}
            <Text color={levelColor(limit.percentUsed)}>
              {`${bar(limit.percentUsed, meterWidth, skin.meter.fill, skin.meter.empty)} ${formatPercent(limit.percentUsed)}`}
            </Text>
            {reset !== '' && <Text color={chat.muted}>{`  resets in ${reset}`}</Text>}
          </Text>
        )
      })}

      {section('cost-title', 'Cost')}
      <Text key="cost-total">
        {label('session')}
        <Text color={chat.success} bold>
          {usage.costUsd === null ? '–' : formatCost(usage.costUsd)}
        </Text>
        {totals.average !== null && <Text color={chat.muted}>{`  ⌀ ${formatCost(totals.average)} per turn`}</Text>}
        {totals.priciest !== null && <Text color={chat.muted}>{`  max ${formatCost(totals.priciest)}`}</Text>}
      </Text>
      <Text key="cost-trend">
        {label('per turn')}
        <Text color={chat.success}>{sparkline(totals.costs, sparkWidth) || '–'}</Text>
      </Text>

      {section('session-title', 'Session')}
      <Text key="session-totals" color={chat.muted} wrap="truncate-end">
        {[
          usage.startedAt === null ? undefined : `${formatElapsed(usage.startedAt, now)} running`,
          `${totals.count} ${totals.count === 1 ? 'turn' : 'turns'}`,
          `${totals.tools} tool calls`,
          totals.tokens === 0 ? undefined : `${formatTokens(totals.tokens)} tokens`,
          totals.count === 0 ? undefined : `last ${formatDuration(view.turns.at(-1)?.durationMs ?? 0)}`,
        ]
          .filter(part => part !== undefined)
          .join(' · ')}
      </Text>

      <Box key="actions" flexDirection="row" columnGap={1} marginTop={1}>
        <Button key="dashboard-refresh" label="Refresh" onPress={act.refresh} />
        <Button key="dashboard-limits" label="Live limits" onPress={act.liveLimits} />
        {!view.isWorking && usage.contextPercent !== null && <Button key="dashboard-compact" label="Compact" onPress={act.compact} />}
      </Box>
      <Text key="hint" color={chat.muted}>
        {'Esc closes · /skin usage opens it again'}
      </Text>
    </Box>
  )
}
