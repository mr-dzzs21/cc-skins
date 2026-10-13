import type { BoxProps, Color, ElementConstructor, TextProps } from 'claude-code'

import type { Usage } from '../types'
import {
  bar,
  formatCost,
  formatPercent,
  formatReset,
  levelColor,
  limitLabel,
  prettyModel,
} from './format'
import type { Skin } from './skins'

/** Below this many columns the meters go and only the figures stay. */
export const FULL_COLUMNS = 104
/** Below this many columns only the model, context and 5h window stay. */
export const COMPACT_COLUMNS = 60

const BAR_WIDTH = 8

export type Segment = {
  key: string
  label?: string
  meter?: { text: string; color: Color }
  value: string
  color?: Color
  note?: string
  isBold?: boolean
}

type Layout = 'full' | 'compact' | 'tiny'

export const layoutFor = (columns: number): Layout =>
  columns >= FULL_COLUMNS ? 'full' : columns >= COMPACT_COLUMNS ? 'compact' : 'tiny'

/** What the HUD shows, in order: plain data, so the layout is testable apart from drawing. */
export const hudSegments = (skin: Skin, usage: Usage, now: number, layout: Layout): Segment[] => {
  const segments: Segment[] = []
  const meter = (percent: number) =>
    layout === 'full'
      ? { text: bar(percent, BAR_WIDTH, skin.bar.fill, skin.bar.empty), color: levelColor(percent) }
      : undefined

  if (layout === 'full') {
    segments.push({ key: 'skin', value: skin.id, color: 'claude' })
  }
  if (usage.model !== null) {
    segments.push({ key: 'model', value: prettyModel(usage.model), color: 'claude', isBold: true })
  }
  segments.push(
    usage.contextPercent === null
      ? { key: 'context', label: 'ctx', value: '–', color: 'inactive' }
      : {
          key: 'context',
          label: 'ctx',
          meter: meter(usage.contextPercent),
          value: formatPercent(usage.contextPercent),
          color: levelColor(usage.contextPercent),
        },
  )
  for (const limit of usage.rateLimits) {
    if (layout === 'tiny' && limit.kind !== 'five_hour') {
      continue
    }
    const reset = layout === 'tiny' ? '' : formatReset(limit.resetsAt, now)
    segments.push({
      key: `limit-${limit.kind}`,
      label: limitLabel(limit),
      meter: meter(limit.percentUsed),
      value: formatPercent(limit.percentUsed),
      color: levelColor(limit.percentUsed),
      note: reset === '' ? undefined : `↻${reset}`,
    })
  }
  if (usage.costUsd !== null && layout !== 'tiny') {
    segments.push({ key: 'cost', value: formatCost(usage.costUsd), color: 'subtle' })
  }

  return segments
}

/** The two elements every surface's table carries. */
type Elements = { Box: ElementConstructor<BoxProps>; Text: ElementConstructor<TextProps> }

/** Draws the segments as one row, the skin's glyph first and its separator between. */
export const drawHud = ({ Box, Text }: Elements, skin: Skin, segments: Segment[]) => (
  <Box flexDirection="row" flexWrap="nowrap" overflow="hidden">
    <Text color="claude">{skin.glyph} </Text>
    {segments.map((segment, index) => (
      <Text key={segment.key} wrap="truncate-end">
        {index > 0 && <Text dimColor>{skin.separator}</Text>}
        {segment.label !== undefined && <Text dimColor>{segment.label} </Text>}
        {segment.meter !== undefined && <Text color={segment.meter.color}>{segment.meter.text} </Text>}
        <Text color={segment.color} bold={segment.isBold}>
          {segment.value}
        </Text>
        {segment.note !== undefined && <Text dimColor> {segment.note}</Text>}
      </Text>
    ))}
  </Box>
)
