import type { BoxProps, ButtonProps, ElementConstructor, TextProps } from 'claude-code'

import type { BarItem, ModelChoice } from '../types'
import { prettyModel } from './format'
import type { Skin } from './skins'

/** The pane a press on the bar's model opens, and the one its ⚙ opens. */
export const MODEL_PANE = 'model-picker'
export const SETTINGS_PANE = 'bar-settings'

/** The levels `/effort` takes; `auto` goes back to the model's own. */
export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'auto'] as const
export type EffortChoice = (typeof EFFORTS)[number]

export const isEffortChoice = (value: unknown): value is EffortChoice =>
  typeof value === 'string' && (EFFORTS as readonly string[]).includes(value)

/** Everything the bar can show, in its order, as the settings list it. */
export const BAR_ITEMS: readonly { item: BarItem; label: string }[] = [
  { item: 'skinName', label: 'Skin name' },
  { item: 'model', label: 'Model' },
  { item: 'effort', label: 'Effort' },
  { item: 'branch', label: 'Git branch' },
  { item: 'gitStatus', label: 'Git status (runs git status after each reply)' },
  { item: 'context', label: 'Context window' },
  { item: 'contextTokens', label: 'Context tokens' },
  { item: 'fiveHour', label: '5-hour limit' },
  { item: 'sevenDay', label: '7-day limit' },
  { item: 'cost', label: 'Cost' },
  { item: 'burnRate', label: 'Cost per hour' },
  { item: 'session', label: 'Session time' },
  { item: 'clock', label: 'Clock' },
  { item: 'version', label: 'Claude Code version' },
  { item: 'meters', label: 'Meters' },
  { item: 'resets', label: 'Reset countdowns' },
  { item: 'gear', label: 'Settings button ⚙' },
]

/** The extras: details the bar adds only when asked, and drops first when narrow. */
export const EXTRA_ITEMS: readonly BarItem[] = ['gitStatus', 'contextTokens', 'burnRate', 'session', 'clock', 'version']

/** Off until the person turns it on: the skin's icon says which skin it is, and the extras are extra. */
export const DEFAULT_HIDDEN: readonly BarItem[] = ['skinName', ...EXTRA_ITEMS]

/** The items there were before the extras: a hidden list saved then knew of these alone. */
const FIRST_ITEMS: readonly BarItem[] = ['skinName', 'model', 'effort', 'branch', 'context', 'fiveHour', 'sevenDay', 'cost', 'meters', 'resets', 'gear']

/**
 * What the bar hides, from what the person saved and the items known when
 * they saved it: an item added since that is off by default stays off, so a
 * new release never adds to someone's bar unasked. Nothing saved: the defaults.
 */
export const hiddenFrom = (stored: unknown, known: unknown): BarItem[] => {
  if (!Array.isArray(stored)) {
    return [...DEFAULT_HIDDEN]
  }
  const hidden = stored.filter(isBarItem)
  const knew = Array.isArray(known) ? known.filter(isBarItem) : FIRST_ITEMS

  return [...hidden, ...DEFAULT_HIDDEN.filter(item => !knew.includes(item) && !hidden.includes(item))]
}

export const isBarItem = (value: unknown): value is BarItem => BAR_ITEMS.some(({ item }) => item === value)

/** What `/skin show|hide <name>` takes: an item's key, any case. */
export const barItemNamed = (name: string): BarItem | undefined =>
  BAR_ITEMS.find(({ item }) => item.toLowerCase() === name.toLowerCase())?.item

/**
 * An alias of the Model row as the model it names, with its version:
 * `opus` → `Opus 5.5`, `opus[1m]` → `Opus 5.5 · 1M context`, `opusplan` →
 * `Opus 5.5 plan mode`; `default` and `best` name theirs where it is known.
 * `resolved` is the model the alias is known to name, where it is.
 */
export const modelLabel = (alias: string, resolved?: string): string => {
  const base = alias.replace(/\[1m\]$/i, '')
  const name = prettyModel(resolved ?? base)
  if (alias === 'default' || alias === 'best') {
    const word = alias === 'default' ? 'Default' : 'Best available'

    return resolved === undefined ? word : `${word} · ${name}`
  }
  if (alias === 'opusplan') {
    return `${prettyModel(resolved ?? 'opus')} plan mode`
  }

  return alias === base ? name : `${name} · 1M context`
}

const HOTKEYS = '1234567890'

export type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
}

export const drawHeading = ({ Box, Text }: Elements, skin: Skin, key: string, title: string, note?: string) => (
  <Box key={key} flexDirection="row" marginTop={key === 'model-heading' || key === 'items-heading' ? 0 : 1}>
    <Text color={skin.chat.assistant} bold>
      {title}
    </Text>
    {note !== undefined && <Text color={skin.chat.muted}>{`  ${note}`}</Text>}
  </Box>
)

/** Rows the model pane asks for: its headings, the models, the effort row, the hint. */
export const modelPaneRows = (choice: ModelChoice) => choice.options.length + 6

/**
 * The model and effort picker: the Model row's choices, the one set ticked,
 * each a press (or its digit); then the effort levels in a row, the one the
 * last request asked for marked.
 */
export const drawModelPicker = (
  elements: Elements,
  skin: Skin,
  view: { choice: ModelChoice; effort: string | null },
  pickModel: (value: string) => void,
  pickEffort: (level: EffortChoice) => void,
) => {
  const { Box, Text, Button } = elements

  return (
    <Box flexDirection="column">
      {drawHeading(elements, skin, 'model-heading', 'Model', 'saved as your default, as /model does')}
      {view.choice.options.map((value, index) => {
        const isCurrent = value === view.choice.value
        const label = modelLabel(value, view.choice.resolved[value])

        return (
          <Button
            key={`model-${value}`}
            label={label}
            hotkey={HOTKEYS[index]}
            plain
            autoFocus={isCurrent ? true : undefined}
            onPress={() => pickModel(value)}
          >
            <Text color={isCurrent ? skin.chat.assistant : undefined} bold={isCurrent}>
              {label.padEnd(24)}
            </Text>
            <Text color={skin.chat.muted}>{value}</Text>
            {isCurrent && <Text color={skin.chat.success}> ✓</Text>}
          </Button>
        )
      })}
      {drawHeading(elements, skin, 'effort-heading', 'Effort', 'this session, as /effort does')}
      <Box key="efforts" flexDirection="row" flexWrap="wrap" columnGap={1}>
        {EFFORTS.map(level => (
          <Button
            key={`effort-${level}`}
            label={level === view.effort ? `${level} ✓` : level}
            variant={level === view.effort ? 'primary' : undefined}
            onPress={() => pickEffort(level)}
          />
        ))}
      </Box>
      <Text key="hint" color={skin.chat.muted} wrap="truncate-end">
        {`↑↓ Tab · Enter picks · 1–${HOTKEYS[Math.min(view.choice.options.length, HOTKEYS.length) - 1] ?? '1'} a model · Esc closes`}
      </Text>
    </Box>
  )
}
