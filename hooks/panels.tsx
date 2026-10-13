import type { BoxProps, ButtonProps, ElementConstructor, TextProps } from 'claude-code'

import type { BarItem, BarStyle, Glyphs, ModelChoice } from '../types'
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
  { item: 'context', label: 'Context window' },
  { item: 'fiveHour', label: '5-hour limit' },
  { item: 'sevenDay', label: '7-day limit' },
  { item: 'cost', label: 'Cost' },
  { item: 'meters', label: 'Meters' },
  { item: 'resets', label: 'Reset countdowns' },
  { item: 'gear', label: 'Settings button ⚙' },
]

/** Off until the person turns it on: the skin's icon says which skin it is. */
export const DEFAULT_HIDDEN: readonly BarItem[] = ['skinName']

export const isBarItem = (value: unknown): value is BarItem => BAR_ITEMS.some(({ item }) => item === value)

/** What `/skin show|hide <name>` takes: an item's key, any case. */
export const barItemNamed = (name: string): BarItem | undefined =>
  BAR_ITEMS.find(({ item }) => item.toLowerCase() === name.toLowerCase())?.item

const MODEL_LABELS: Record<string, string> = {
  default: 'Default',
  best: 'Best available',
  opusplan: 'Opus plan mode',
}

/** `opus[1m]` → `Opus · 1M context`; the Model row's other aliases as words. */
export const modelLabel = (alias: string): string => {
  const named = MODEL_LABELS[alias]
  if (named !== undefined) {
    return named
  }
  const base = alias.replace(/\[1m\]$/i, '')
  const word = base.charAt(0).toUpperCase() + base.slice(1)

  return alias === base ? word : `${word} · 1M context`
}

const HOTKEYS = '1234567890'

type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
}

const drawHeading = ({ Box, Text }: Elements, skin: Skin, key: string, title: string, note?: string) => (
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
        const label = modelLabel(value)

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
              {label.padEnd(22)}
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

export type SettingsView = {
  hidden: readonly BarItem[]
  barStyle: BarStyle
  glyphs: Glyphs
  isChatStyled: boolean
}

export type SettingsActions = {
  toggle: (item: BarItem) => void
  style: (style: BarStyle) => void
  glyphs: (glyphs: Glyphs) => void
  chat: (isOn: boolean) => void
}

/** Rows the settings pane asks for: the items, three option rows, their headings, the hint. */
export const SETTINGS_ROWS = BAR_ITEMS.length + 1 + 3 * 2 + 1 + 3

/**
 * The bar's settings: a check per item, each a press that turns it on or
 * off, then the bar's style, its icons and the chat cards as pairs of
 * choices. The bar above the prompt redraws as they change.
 */
export const drawSettings = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => {
  const { Box, Text, Button } = elements
  const choice = <T extends string>(key: string, options: readonly { value: T; label: string }[], current: T, pick: (value: T) => void) => (
    <Box key={key} flexDirection="row" columnGap={1}>
      {options.map(option => (
        <Button
          key={`${key}-${option.value}`}
          label={`${option.value === current ? '●' : '○'} ${option.label}`}
          variant={option.value === current ? 'primary' : undefined}
          onPress={() => pick(option.value)}
        />
      ))}
    </Box>
  )

  return (
    <Box flexDirection="column">
      {drawHeading(elements, skin, 'items-heading', 'Show in the bar', 'Enter turns one on or off')}
      {BAR_ITEMS.map(({ item, label }, index) => {
        const isOn = !view.hidden.includes(item)

        return (
          <Button
            key={`item-${item}`}
            label={label}
            plain
            autoFocus={index === 0 ? true : undefined}
            onPress={() => act.toggle(item)}
          >
            <Text color={isOn ? skin.chat.success : skin.chat.muted}>{isOn ? '[✓] ' : '[ ] '}</Text>
            <Text color={isOn ? undefined : skin.chat.muted}>{label}</Text>
          </Button>
        )
      })}
      {drawHeading(elements, skin, 'style-heading', 'Style')}
      {choice(
        'style',
        [
          { value: 'powerline', label: 'Powerline blocks' },
          { value: 'header', label: 'Quiet header' },
        ],
        view.barStyle,
        act.style,
      )}
      {drawHeading(elements, skin, 'glyphs-heading', 'Icons', 'powerline arrows need a Nerd Font')}
      {choice(
        'glyphs',
        [
          { value: 'nerd', label: 'Nerd Font' },
          { value: 'plain', label: 'Plain' },
        ],
        view.glyphs,
        act.glyphs,
      )}
      {drawHeading(elements, skin, 'chat-heading', 'Chat cards')}
      {choice(
        'chat',
        [
          { value: 'on', label: 'On' },
          { value: 'off', label: 'Off' },
        ],
        view.isChatStyled ? 'on' : 'off',
        value => act.chat(value === 'on'),
      )}
      <Text key="hint" color={skin.chat.muted} wrap="truncate-end">
        {'↑↓ Tab · Enter · Esc closes · also /skin show|hide <item>'}
      </Text>
    </Box>
  )
}
