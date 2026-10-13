import type { BoxProps, ElementConstructor, TextProps } from 'claude-code'

import type { Glyphs, Usage } from '../types'
import { bar, formatCost, formatDuration, formatPercent, formatReset, prettyModel } from './format'
import type { Paint, Skin } from './skins'

/** Powerline separators (Nerd Fonts and Powerline-patched fonts). */
const POWERLINE = { open: '', arrow: '', close: '' }

/** Font Awesome icons, at the same code points in every Nerd Font. */
const ICONS = {
  model: '',
  context: '',
  five_hour: '',
  seven_day: '',
  spend_limit: '',
} as const

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const METER_WIDTH = 5

/** How many times coarser the bar can get; the richest that fits is drawn. */
export const MAX_LEVEL = 6

export type Pill = { key: string; text: string; paint: Paint; isBold?: boolean }

export type BarInput = {
  skin: Skin
  usage: Usage
  now: number
  glyphs: Glyphs
  isWorking: boolean
  /** Advances while a turn runs: the spinner frame and the pulse read it. */
  frame: number
}

const LIMIT_LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

type Alert = 'warn' | 'danger'

const alertFor = (percent: number): Alert | undefined =>
  percent >= 85 ? 'danger' : percent >= 60 ? 'warn' : undefined

/** A block before its color: the bar paints by place in the gradient, an alert over it. */
type Block = { key: string; text: string; isBold?: boolean; alert?: Alert }

/** The gradient's step for a block's place; past its end, the last step. */
const gradientAt = (skin: Skin, index: number): Paint => {
  const { blocks } = skin.colors

  return blocks[Math.min(index, blocks.length - 1)] ?? { bg: '#444444', fg: '#ffffff' }
}

/**
 * The bar's blocks at one level of detail: 0 is everything, and each level up
 * drops one thing, in this order: meters, reset countdowns, cost, the 7-day
 * window, the skin's name, the 5-hour window.
 */
export const barPills = (input: BarInput, level: number): Pill[] => {
  const { skin, usage, now, glyphs, isWorking, frame } = input
  const isNerd = glyphs === 'nerd'
  const hasMeters = level < 1
  const hasResets = level < 2
  const hasCost = level < 3
  const hasSevenDay = level < 4
  const hasSkinName = level < 5
  const hasLimits = level < 6
  const pills: Block[] = []

  const skinText = [
    isNerd ? skin.icon : skin.glyph,
    hasSkinName ? skin.label.toUpperCase() : undefined,
    isWorking ? FRAMES[frame % FRAMES.length] : undefined,
  ]
  pills.push({ key: 'skin', text: skinText.filter(part => part !== undefined).join(' '), isBold: true })

  if (usage.model !== null) {
    const name = prettyModel(usage.model)
    pills.push({ key: 'model', text: isNerd ? `${ICONS.model} ${name}` : name, isBold: true })
  }

  const meter = (percent: number) =>
    hasMeters ? `${bar(percent, METER_WIDTH, skin.meter.fill, skin.meter.empty)} ` : ''

  const context = usage.contextPercent
  pills.push({
    key: 'context',
    text: `${isNerd ? ICONS.context : 'ctx'} ${context === null ? '–' : meter(context) + formatPercent(context)}`,
    alert: context === null ? undefined : alertFor(context),
  })

  usage.rateLimits.forEach(limit => {
    const isFiveHour = limit.kind === 'five_hour'
    if (!hasLimits || (!isFiveHour && !hasSevenDay)) {
      return
    }
    const icon = ICONS[limit.kind as keyof typeof ICONS]
    const label = isNerd && icon !== undefined ? icon : LIMIT_LABELS[limit.kind] ?? limit.kind
    const reset = hasResets ? formatReset(limit.resetsAt, now) : ''
    pills.push({
      key: `limit-${limit.kind}`,
      text: `${label} ${meter(limit.percentUsed)}${formatPercent(limit.percentUsed)}${reset === '' ? '' : ` ↻${reset}`}`,
      alert: alertFor(limit.percentUsed),
    })
  })

  if (usage.costUsd !== null && hasCost) {
    pills.push({ key: 'cost', text: formatCost(usage.costUsd), isBold: true })
  }

  const isPulsing = isWorking && Math.floor(frame / 4) % 2 === 1

  return pills.map(({ alert, ...block }, index) => {
    const step = gradientAt(skin, index)
    const paint =
      alert !== undefined ? skin.colors[alert] : index === 0 && isPulsing ? { ...step, bg: skin.colors.pulse } : step

    return { ...block, paint }
  })
}

const cells = (text: string) => [...text].length

/** Cells the bar takes: each block padded by a space a side, plus the caps and arrows. */
export const barWidth = (pills: Pill[], glyphs: Glyphs): number =>
  pills.reduce((sum, pill) => sum + cells(pill.text) + 2, 0) +
  (glyphs === 'nerd' && pills.length > 0 ? pills.length + 1 : 0)

/** The richest blocks that fit in `columns`; the coarsest when none does. */
export const fitPills = (input: BarInput, columns: number): Pill[] => {
  for (let level = 0; level < MAX_LEVEL; level++) {
    const pills = barPills(input, level)
    if (barWidth(pills, input.glyphs) <= columns) {
      return pills
    }
  }

  return barPills(input, MAX_LEVEL)
}

/** The two elements every surface's table carries. */
type Elements = { Box: ElementConstructor<BoxProps>; Text: ElementConstructor<TextProps> }

/**
 * Draws blocks as a powerline: a round cap, each block on its own background,
 * an arrow in the left block's color over the right one's, a round cap to end.
 * Plain glyphs draw the blocks side by side.
 */
export const drawPowerline = ({ Box, Text }: Elements, pills: Pill[], glyphs: Glyphs) => {
  const isNerd = glyphs === 'nerd'
  const first = pills[0]

  return (
    <Box flexDirection="row" flexWrap="nowrap" overflow="hidden">
      {isNerd && first !== undefined && (
        <Text key="open" color={first.paint.bg}>
          {POWERLINE.open}
        </Text>
      )}
      {pills.map((pill, index) => {
        const following = pills[index + 1]

        return (
          <Text key={pill.key} wrap="truncate-end">
            <Text backgroundColor={pill.paint.bg} color={pill.paint.fg} bold={pill.isBold}>
              {` ${pill.text} `}
            </Text>
            {isNerd && (
              <Text color={pill.paint.bg} backgroundColor={following?.paint.bg}>
                {following === undefined ? POWERLINE.close : POWERLINE.arrow}
              </Text>
            )}
          </Text>
        )
      })}
    </Box>
  )
}

/** The line that closes a turn, as two blocks: `KO` and `4s`. */
export const turnPills = (skin: Skin, word: string, durationMs: number, glyphs: Glyphs): Pill[] => [
  {
    key: 'word',
    text: `${glyphs === 'nerd' ? skin.icon : skin.glyph} ${word}`,
    paint: gradientAt(skin, 0),
    isBold: true,
  },
  { key: 'duration', text: `${skin.turn.joiner} ${formatDuration(durationMs)}`, paint: gradientAt(skin, 2) },
]
