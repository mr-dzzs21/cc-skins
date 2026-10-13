import type { BarItem, BarStyle, Glyphs, Prefs, SettingsTab } from '../types'
import { BAR_ITEMS, drawHeading } from './panels'
import type { Elements } from './panels'
import { ALERT_LEVELS } from './prefs'
import type { Skin } from './skins'

/** The settings pane's tabs, in order, as its tab row names them. */
export const SETTINGS_TABS: readonly { tab: SettingsTab; label: string }[] = [
  { tab: 'bar', label: 'Bar' },
  { tab: 'look', label: 'Look' },
  { tab: 'alerts', label: 'Alerts' },
]

export const isSettingsTab = (value: unknown): value is SettingsTab => SETTINGS_TABS.some(({ tab }) => tab === value)

/** Rows the settings pane asks for: the tab row, the longest tab (the bar's items), the hint. */
export const SETTINGS_ROWS = 1 + 1 + BAR_ITEMS.length + 1 + 1

export type SettingsView = {
  tab: SettingsTab
  hidden: readonly BarItem[]
  barStyle: BarStyle
  glyphs: Glyphs
  isChatStyled: boolean
  prefs: Prefs
}

export type SettingsActions = {
  tab: (tab: SettingsTab) => void
  toggle: (item: BarItem) => void
  style: (style: BarStyle) => void
  glyphs: (glyphs: Glyphs) => void
  chat: (isOn: boolean) => void
  pref: (patch: Partial<Prefs>) => void
}

/** A row of choices, the current one filled and marked as the primary. */
const drawChoice = <T extends string | number>(
  { Box, Button }: Elements,
  key: string,
  options: readonly { value: T; label: string }[],
  current: T,
  pick: (value: T) => void,
) => (
  <Box key={key} flexDirection="row" flexWrap="wrap" columnGap={1}>
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

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const

const drawOnOff = (elements: Elements, key: string, isOn: boolean, set: (isOn: boolean) => void) =>
  drawChoice(elements, key, ON_OFF, isOn ? 'on' : 'off', value => set(value === 'on'))

/** The bar tab: a check per item, each a press that turns it on or off. */
const drawBarTab = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => {
  const { Text, Button } = elements

  return [
    drawHeading(elements, skin, 'items-heading', 'Show in the bar', 'Enter turns one on or off'),
    ...BAR_ITEMS.map(({ item, label }, index) => {
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
    }),
  ]
}

/** The look tab: the bar's style, its icons, the chat cards. */
const drawLookTab = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => [
  drawHeading(elements, skin, 'style-heading', 'Bar style'),
  drawChoice(
    elements,
    'style',
    [
      { value: 'powerline', label: 'Powerline blocks' },
      { value: 'header', label: 'Quiet header' },
    ],
    view.barStyle,
    act.style,
  ),
  drawHeading(elements, skin, 'glyphs-heading', 'Icons', 'powerline arrows need a Nerd Font'),
  drawChoice(
    elements,
    'glyphs',
    [
      { value: 'nerd', label: 'Nerd Font' },
      { value: 'plain', label: 'Plain' },
    ],
    view.glyphs,
    act.glyphs,
  ),
  drawHeading(elements, skin, 'chat-heading', 'Chat cards'),
  drawOnOff(elements, 'chat', view.isChatStyled, act.chat),
]

/** The alerts tab: when a limit or the context warns, and the bar's compact button. */
const drawAlertsTab = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => [
  drawHeading(elements, skin, 'alert-heading', 'Warn at', 'context and limits, once more at 95 %'),
  drawChoice(
    elements,
    'alert',
    ALERT_LEVELS.map(level => ({ value: level, label: level === 0 ? 'Off' : `${level} %` })),
    view.prefs.alertAt,
    alertAt => act.pref({ alertAt }),
  ),
  drawHeading(elements, skin, 'compact-heading', 'Compact button', 'in the bar once the context is that full'),
  drawOnOff(elements, 'compact', view.prefs.compactButton, compactButton => act.pref({ compactButton })),
]

const TAB_DRAWERS: Record<SettingsTab, typeof drawBarTab> = {
  bar: drawBarTab,
  look: drawLookTab,
  alerts: drawAlertsTab,
  turn: drawBarTab,
  sound: drawBarTab,
}

/**
 * The settings: a row of tabs, then the tab's own choices. Every choice
 * applies at once (the bar above the prompt redraws) and is kept for the
 * next session.
 */
export const drawSettings = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => {
  const { Box, Text, Button } = elements

  return (
    <Box flexDirection="column">
      <Box key="tabs" flexDirection="row" columnGap={1}>
        {SETTINGS_TABS.map(({ tab, label }) => (
          <Button
            key={`tab-${tab}`}
            label={label}
            variant={tab === view.tab ? 'primary' : undefined}
            onPress={() => act.tab(tab)}
          />
        ))}
      </Box>
      {TAB_DRAWERS[view.tab](elements, skin, view, act)}
      <Text key="hint" color={skin.chat.muted} wrap="truncate-end">
        {'↑↓ Tab · Enter · Esc closes · also /skin show|hide <item>'}
      </Text>
    </Box>
  )
}
