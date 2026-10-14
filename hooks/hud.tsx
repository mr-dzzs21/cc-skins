import type { BoxProps, ButtonProps, ElementConstructor, RenderElement, TextProps } from 'claude-code'

import type { BarItem, BarStyle, Glyphs, Usage, WarnColors } from '../types'
import { bar, formatCost, formatDuration, formatElapsed, formatPercent, formatReset, formatTokens, prettyModel } from './format'
import type { Paint, Skin } from './skins'
import { displayWidth } from './text'

/** Powerline separators (Nerd Fonts and Powerline-patched fonts). */
const POWERLINE = { open: '\ue0b6', arrow: '\ue0b0', close: '\ue0b4' }

/** Font Awesome icons, at the same code points in every Nerd Font. */
const ICONS = {
  branch: '\ue0a0',
  model: '\uf2db',
  context: '\uf1c0',
  five_hour: '\uf252',
  seven_day: '\uf073',
  spend_limit: '\uf155',
  gear: '\uf013',
  compact: '\uf066',
  reset: '\uf021',
} as const

/** What a press on the bar opens: the skin picker, the model and effort picker, the bar's settings. */
export type BarPress = 'skin' | 'model' | 'settings' | 'compact' | 'usage' | 'branch' | 'limits'

const PRESS_LABELS: Record<BarPress, string> = {
  skin: 'Pick a skin',
  model: 'Model and effort',
  settings: 'Bar settings',
  compact: 'Compact the conversation',
  usage: 'Usage dashboard',
  branch: 'Changed files',
  limits: 'Live limits (runs /usage)',
}

/** The ⚙ after the bar, with the space before it. */
const GEAR_CELLS = 2

/** The bar items a rate-limit window answers to; a window with none always shows. */
const LIMIT_ITEMS: Record<string, BarItem | undefined> = { five_hour: 'fiveHour', seven_day: 'sevenDay' }

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const METER_WIDTH = 5

/** How many times coarser the bar can get; the richest that fits is drawn. */
export const MAX_LEVEL = 7

export type Pill = { key: string; text: string; paint: Paint; isBold?: boolean; press?: BarPress }

export type BarInput = {
  skin: Skin
  usage: Usage
  /** The repository's checked-out branch; null outside one. */
  branch: string | null
  now: number
  glyphs: Glyphs
  isWorking: boolean
  /** Advances while a turn runs: the spinner frame and the pulse read it. */
  frame: number
  /** What the person turned off. */
  hidden: readonly BarItem[]
  /** The main thread's effort; null until a request has said. */
  effort: string | null
  /** The context percent from which a compact button shows between turns; null for none. */
  compactAt: number | null
  /** Whether the limit windows' reading may be behind (none this session, or older than ten minutes). */
  limitsStale?: boolean
  /** When the context and limit blocks turn a warning color; left out, yellow and red. */
  warnColors?: WarnColors
}

const LIMIT_LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

type Alert = 'warn' | 'danger'

/** The warning a fill level calls for, as the person set the warning colors: none while calm, or with them off. */
export const alertFor = (percent: number, mode: WarnColors = 'all'): Alert | undefined =>
  mode === 'off' ? undefined : percent >= 85 ? 'danger' : percent >= 60 && mode !== 'danger' ? 'warn' : undefined

/** A block before its color: the bar paints by place in the gradient, an alert over it. */
type Block = { key: string; text: string; isBold?: boolean; alert?: Alert; press?: BarPress }

/** The gradient's step for a block's place; past its end, the last step. */
const gradientAt = (skin: Skin, index: number): Paint => {
  const { blocks } = skin.colors

  return blocks[Math.min(index, blocks.length - 1)] ?? { bg: '#444444', fg: '#ffffff' }
}

/**
 * The bar's blocks at one level of detail: 0 is everything the person kept,
 * and each level up drops one thing, in this order: meters, reset countdowns,
 * cost, the 7-day window, the branch, the skin's name and the effort, the
 * 5-hour window. The skin's block always stays: it opens the skin picker.
 */
export const barPills = (input: BarInput, level: number): Pill[] => {
  const { skin, usage, branch, now, glyphs, isWorking, frame, hidden, effort, compactAt } = input
  const isNerd = glyphs === 'nerd'
  const shows = (item: BarItem) => !hidden.includes(item)
  const hasMeters = level < 1 && shows('meters')
  const hasResets = level < 2 && shows('resets')
  const hasCost = level < 3 && shows('cost')
  const hasSevenDay = level < 4
  const hasBranch = level < 5 && shows('branch')
  const hasSkinName = level < 6 && shows('skinName')
  const hasEffort = level < 6 && shows('effort') && effort !== null
  const hasLimits = level < 7
  const pills: Block[] = []

  const skinText = [
    isNerd ? skin.icon : skin.glyph,
    hasSkinName ? skin.label.toUpperCase() : undefined,
    isWorking ? FRAMES[frame % FRAMES.length] : undefined,
  ]
  pills.push({ key: 'skin', text: skinText.filter(part => part !== undefined).join(' '), isBold: true, press: 'skin' })

  const modelName = usage.model !== null && shows('model') ? prettyModel(usage.model) : undefined
  const modelParts = [modelName, hasEffort ? effort : undefined].filter(part => part !== undefined)
  if (modelParts.length > 0) {
    const text = modelParts.join(' · ')
    pills.push({ key: 'model', text: isNerd ? `${ICONS.model} ${text}` : text, isBold: true, press: 'model' })
  }
  if (branch !== null && hasBranch) {
    pills.push({ key: 'branch', text: `${glyphs === 'plain' ? '⎇' : ICONS.branch} ${branch}`, press: 'branch' })
  }

  const meter = (percent: number) =>
    hasMeters ? `${bar(percent, METER_WIDTH, skin.meter.fill, skin.meter.empty)} ` : ''

  const context = usage.contextPercent
  if (shows('context')) {
    pills.push({
      key: 'context',
      text: `${isNerd ? ICONS.context : 'ctx'} ${context === null ? '–' : meter(context) + formatPercent(context)}`,
      alert: context === null ? undefined : alertFor(context, input.warnColors),
      press: 'usage',
    })
  }
  if (isCompactDue(input)) {
    pills.push({
      key: 'compact',
      text: `${isNerd ? ICONS.compact : '⇣'} compact`,
      alert: (context ?? 0) >= 95 ? 'danger' : 'warn',
      isBold: true,
      press: 'compact',
    })
  }

  usage.rateLimits.forEach(limit => {
    const isFiveHour = limit.kind === 'five_hour'
    const item = LIMIT_ITEMS[limit.kind]
    if (!hasLimits || (!isFiveHour && !hasSevenDay) || (item !== undefined && !shows(item))) {
      return
    }
    const icon = ICONS[limit.kind as keyof typeof ICONS]
    const label = isNerd && icon !== undefined ? icon : LIMIT_LABELS[limit.kind] ?? limit.kind
    const reset = hasResets ? formatReset(limit.resetsAt, now) : ''
    pills.push({
      key: `limit-${limit.kind}`,
      text: `${label} ${meter(limit.percentUsed)}${input.limitsStale === true ? '~' : ''}${formatPercent(limit.percentUsed)}${reset === '' ? '' : isNerd ? ` ${ICONS.reset} ${reset}` : ` (${reset})`}`,
      alert: alertFor(limit.percentUsed, input.warnColors),
      press: 'limits',
    })
  })

  if (usage.costUsd !== null && hasCost) {
    pills.push({ key: 'cost', text: formatCost(usage.costUsd), isBold: true, press: 'usage' })
  }

  const isPulsing = isWorking && Math.floor(frame / 4) % 2 === 1

  return pills.map(({ alert, ...block }, index) => {
    const step = gradientAt(skin, index)
    const paint =
      alert !== undefined ? skin.colors[alert] : index === 0 && isPulsing ? { ...step, bg: skin.colors.pulse } : step

    return { ...block, paint }
  })
}

/** Whether the bar offers to compact: the context is that full, between turns. */
export const isCompactDue = ({ usage, compactAt, isWorking }: BarInput): boolean =>
  compactAt !== null && !isWorking && usage.contextPercent !== null && usage.contextPercent >= compactAt

/** Terminal cells, not code points: a wide character takes two, a combining mark none. */
const cells = (text: string) => displayWidth(text)

/** Cells the bar takes: each block padded by a space a side, plus the caps and arrows (the ⚙ not counted). */
export const barWidth = (pills: Pill[], glyphs: Glyphs): number =>
  pills.reduce((sum, pill) => sum + cells(pill.text) + 2, 0) +
  (glyphs !== 'plain' && pills.length > 0 ? pills.length + 1 : 0)

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

/** The elements every surface's table carries; `Button` where a block is pressable. */
type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button?: ElementConstructor<ButtonProps>
}

/** A bar piece as a button (keyed `<piece>-button`) when it opens something and the surface draws buttons. */
const pressable = (
  Button: Elements['Button'],
  piece: string,
  press: BarPress | undefined,
  onPress: ((press: BarPress) => void) | undefined,
  child: RenderElement,
): RenderElement =>
  press !== undefined && onPress !== undefined && Button !== undefined ? (
    <Button key={`${piece}-button`} label={PRESS_LABELS[press]} plain onPress={() => onPress(press)}>
      {child}
    </Button>
  ) : (
    child
  )

/** The ⚙ after the bar that opens its settings, drawn in `color`. */
const drawGear = ({ Text, Button }: Elements, glyphs: Glyphs, color: string, onPress: (press: BarPress) => void) =>
  pressable(
    Button,
    'settings',
    'settings',
    onPress,
    <Text key="gear" color={color}>
      {` ${glyphs === 'nerd' ? ICONS.gear : '≡'}`}
    </Text>,
  )

/**
 * Draws blocks as a powerline: a round cap, each block on its own background,
 * an arrow in the left block's color over the right one's, a round cap to end.
 * Plain glyphs draw the blocks side by side. With `onPress`, a block that
 * opens something is a button (a click, or Enter while the band holds the
 * focus), and with `gear` a ⚙ in that color closes the bar.
 */
export const drawPowerline = (
  elements: Elements,
  pills: Pill[],
  glyphs: Glyphs,
  onPress?: (press: BarPress) => void,
  gear?: string,
) => {
  const { Box, Text, Button } = elements
  const hasArrows = glyphs !== 'plain'
  const first = pills[0]

  return (
    <Box flexDirection="row" flexWrap="nowrap" overflow="hidden">
      {hasArrows && first !== undefined && (
        <Text key="open" color={first.paint.bg}>
          {POWERLINE.open}
        </Text>
      )}
      {pills.flatMap((pill, index) => {
        const following = pills[index + 1]
        const block = pressable(
          Button,
          pill.key,
          pill.press,
          onPress,
          <Text key={pill.key} backgroundColor={pill.paint.bg} color={pill.paint.fg} bold={pill.isBold}>
            {` ${pill.text} `}
          </Text>,
        )
        if (!hasArrows) {
          return [block]
        }

        return [
          block,
          <Text key={`${pill.key}-edge`} color={pill.paint.bg} backgroundColor={following?.paint.bg}>
            {following === undefined ? POWERLINE.close : POWERLINE.arrow}
          </Text>,
        ]
      })}
      {gear !== undefined && onPress !== undefined && drawGear(elements, glyphs, gear, onPress)}
    </Box>
  )
}

/** The line that closes a turn, as blocks: `KO`, `in 4s`, and what it cost where there is any. */
export const turnPills = (skin: Skin, word: string, durationMs: number, glyphs: Glyphs, stats = ''): Pill[] => [
  {
    key: 'word',
    text: `${glyphs === 'nerd' ? skin.icon : skin.glyph} ${word}`,
    paint: gradientAt(skin, 0),
    isBold: true,
  },
  { key: 'duration', text: `${skin.turn.joiner} ${formatDuration(durationMs)}`, paint: gradientAt(skin, 2) },
  ...(stats === '' ? [] : [{ key: 'stats', text: stats, paint: gradientAt(skin, 4) }]),
]

/** One piece of the header line: its text and its color. */
export type HeaderItem = { key: string; text: string; color: string; isBold?: boolean; press?: BarPress }

export type Header = { brand: HeaderItem[]; stats: HeaderItem[]; badges: HeaderItem[] }

const HEADER_SEPARATOR = ' │ '

const headerWidth = ({ brand, stats, badges }: Header): number =>
  brand.reduce((sum, item) => sum + cells(item.text) + 2, 0) +
  stats.reduce((sum, item, index) => sum + cells(item.text) + (index > 0 ? HEADER_SEPARATOR.length : 0), 0) +
  badges.reduce((sum, item) => sum + cells(item.text) + 2, 0) +
  4

/**
 * The quiet header: who and which model at the left, the session's figures in
 * the middle, the limits as badges at the right. Pieces drop from the middle
 * and the right until it fits.
 */
export const headerFor = (input: BarInput, columns: number): Header => {
  const { skin, usage, branch, now, glyphs, isWorking, frame, hidden, effort } = input
  const isNerd = glyphs === 'nerd'
  const shows = (item: BarItem) => !hidden.includes(item)
  const { chat } = skin
  const brand: HeaderItem[] = [
    { key: 'skin', text: `${isNerd ? skin.icon : skin.glyph} CLAUDE`, color: chat.assistant, isBold: true, press: 'skin' },
  ]
  const modelParts = [
    usage.model !== null && shows('model') ? prettyModel(usage.model) : undefined,
    effort !== null && shows('effort') ? effort : undefined,
  ].filter(part => part !== undefined)
  if (modelParts.length > 0) {
    brand.push({ key: 'model', text: modelParts.join(' · '), color: chat.muted, press: 'model' })
  }

  const stats: HeaderItem[] = []
  if (usage.startedAt !== null) {
    stats.push({ key: 'session', text: `● Session ${formatElapsed(usage.startedAt, now)}`, color: chat.user })
  }
  if (branch !== null && shows('branch')) {
    stats.push({ key: 'branch', text: `${glyphs === 'plain' ? '⎇' : ICONS.branch} ${branch}`, color: chat.user, press: 'branch' })
  }
  if (usage.contextPercent !== null && shows('context')) {
    const tokens = usage.contextTokens === null ? '' : ` · ${formatTokens(usage.contextTokens)}`
    stats.push({
      key: 'context',
      text: `${isNerd ? ICONS.context : 'ctx'} ${formatPercent(usage.contextPercent)}${tokens}`,
      color: alertColor(skin, usage.contextPercent, input.warnColors) ?? chat.user,
      press: 'usage',
    })
  }
  if (usage.costUsd !== null && shows('cost')) {
    stats.push({ key: 'cost', text: formatCost(usage.costUsd), color: chat.user, press: 'usage' })
  }

  const badges: HeaderItem[] = usage.rateLimits
    .filter(limit => {
      const item = LIMIT_ITEMS[limit.kind]

      return item === undefined || shows(item)
    })
    .map(limit => ({
      key: `limit-${limit.kind}`,
      text: `● ${LIMIT_LABELS[limit.kind] ?? limit.kind} ${input.limitsStale === true ? '~' : ''}${formatPercent(limit.percentUsed)}`,
      color: alertColor(skin, limit.percentUsed, input.warnColors) ?? chat.muted,
      press: 'limits' as const,
    }))
  if (isCompactDue(input)) {
    badges.unshift({
      key: 'compact',
      text: '⇣ compact',
      color: skin.colors[(usage.contextPercent ?? 0) >= 95 ? 'danger' : 'warn'].bg,
      press: 'compact',
    })
  }
  if (isWorking) {
    badges.unshift({ key: 'working', text: `${FRAMES[frame % FRAMES.length]} working`, color: chat.assistant })
  }

  const header = { brand, stats, badges }
  const shed: Array<() => void> = [
    () => removeKey(stats, 'cost'),
    () => removeKey(badges, 'limit-seven_day'),
    () => removeKey(stats, 'session'),
    () => removeKey(stats, 'branch'),
    () => brand.splice(1),
    () => stats.splice(0),
    () => badges.splice(0),
  ]
  for (const step of shed) {
    if (headerWidth(header) <= columns) {
      break
    }
    step()
  }

  return header
}

const removeKey = (items: HeaderItem[], key: string) => {
  const index = items.findIndex(item => item.key === key)
  if (index >= 0) {
    items.splice(index, 1)
  }
}

/** A fill level's alert color, as text; undefined while calm. */
const alertColor = (skin: Skin, percent: number, mode?: WarnColors): string | undefined => {
  const alert = alertFor(percent, mode)

  return alert === undefined ? undefined : skin.colors[alert].bg
}

/** Draws the header line; with `onPress`, its brand and model are buttons, as the powerline's blocks are. */
export const drawHeader = (
  elements: Elements,
  header: Header,
  skin: Skin,
  columns: number,
  glyphs: Glyphs,
  onPress?: (press: BarPress) => void,
  gear?: string,
) => {
  const { Box, Text, Button } = elements

  return (
  <Box flexDirection="row" justifyContent="space-between" width={columns} overflow="hidden">
    <Box flexDirection="row">
      {header.brand.map((item, index) =>
        pressable(
          Button,
          item.key,
          item.press,
          onPress,
          <Text key={item.key} color={item.color} bold={item.isBold}>
            {index > 0 ? `  ${item.text}` : item.text}
          </Text>,
        ),
      )}
    </Box>
    <Box flexDirection="row">
      {header.stats.map((item, index) => (
        <Box key={item.key} flexDirection="row">
          {index > 0 && <Text color={skin.chat.border}>{HEADER_SEPARATOR}</Text>}
          {pressable(Button, item.key, item.press, onPress, <Text color={item.color}>{item.text}</Text>)}
        </Box>
      ))}
    </Box>
    <Box flexDirection="row" gap={1}>
      {header.badges.map(item =>
        pressable(
          Button,
          item.key,
          item.press,
          onPress,
          <Text key={item.key} color={item.color} bold>
            {item.text}
          </Text>,
        ),
      )}
      {gear !== undefined && onPress !== undefined && drawGear(elements, glyphs, gear, onPress)}
    </Box>
  </Box>
  )
}

/**
 * The bar in the chosen style, sized to `columns`. With `onPress`, its skin
 * and model pieces open their pickers, and a ⚙ (unless turned off) opens its
 * settings.
 */
export const drawBar = (
  elements: Elements,
  input: BarInput,
  style: BarStyle,
  columns: number,
  onPress?: (press: BarPress) => void,
  isClickable = true,
) => {
  const gear = onPress !== undefined && !input.hidden.includes('gear') ? input.skin.chat.muted : undefined
  const room = columns - (gear === undefined ? 0 : GEAR_CELLS)
  const unpress = <T extends { press?: BarPress }>(item: T): T => (isClickable ? item : { ...item, press: undefined })
  if (style === 'header') {
    const header = headerFor(input, room)

    return drawHeader(
      elements,
      { brand: header.brand.map(unpress), stats: header.stats.map(unpress), badges: header.badges.map(unpress) },
      input.skin,
      columns,
      input.glyphs,
      onPress,
      gear,
    )
  }

  return drawPowerline(elements, fitPills(input, room).map(unpress), input.glyphs, onPress, gear)
}
