import type { BarItem, BarStyle, Glyphs, Prefs, SettingsTab, SoundName } from '../types'
import { BAR_ITEMS, drawHeading } from './panels'
import type { Elements } from './panels'
import { ALERT_LEVELS, NOTIFY_AFTER, SOUND_GAINS } from './prefs'
import { SOUNDS } from './sounds'
import type { Skin } from './skins'

/** The settings pane's tabs, in order, as its tab row names them. */
export const SETTINGS_TABS: readonly { tab: SettingsTab; label: string }[] = [
  { tab: 'bar', label: 'Bar' },
  { tab: 'look', label: 'Look' },
  { tab: 'alerts', label: 'Alerts' },
  { tab: 'turn', label: 'Turn line' },
  { tab: 'sound', label: 'Sound' },
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
  /** Plays a sound once, as a pick of it previews it. */
  play: (name: SoundName | 'skin', gain: number) => void
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
  drawHeading(elements, skin, 'clickable-heading', 'Clickable bar', 'the model, context, limits, cost and branch open more'),
  drawOnOff(elements, 'clickable', view.prefs.clickable, clickable => act.pref({ clickable })),
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

/** The turn-line tab: what the line closing each turn adds after its duration. */
const drawTurnTab = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => [
  drawHeading(elements, skin, 'turn-cost-heading', 'Cost', 'what the turn cost'),
  drawOnOff(elements, 'turn-cost', view.prefs.turnCost, turnCost => act.pref({ turnCost })),
  drawHeading(elements, skin, 'turn-tokens-heading', 'Tokens', 'read and written, the cache included'),
  drawOnOff(elements, 'turn-tokens', view.prefs.turnTokens, turnTokens => act.pref({ turnTokens })),
  drawHeading(elements, skin, 'turn-tools-heading', 'Tool calls'),
  drawOnOff(elements, 'turn-tools', view.prefs.turnTools, turnTools => act.pref({ turnTools })),
]

const GAIN_LABELS = ['Quiet', 'Normal', 'Loud'] as const

/**
 * The sound tab: a sound and a notification when a turn ends, both off until
 * turned on, for turns longer than the person says. A pick of a sound or its
 * loudness plays it once.
 */
const drawSoundTab = (elements: Elements, skin: Skin, view: SettingsView, act: SettingsActions) => {
  const { prefs } = view
  const pickSound = (soundName: SoundName | 'skin') => {
    act.pref({ soundName })
    act.play(soundName, prefs.soundGain)
  }

  return [
    drawHeading(elements, skin, 'sound-heading', 'Sound', 'when Claude is done'),
    drawOnOff(elements, 'sound', prefs.sound, sound => act.pref({ sound })),
    drawHeading(elements, skin, 'sound-name-heading', 'Which', 'a pick plays it'),
    drawChoice(
      elements,
      'sound-name',
      [{ value: 'skin' as const, label: `Skin's own (${skin.sound})` }, ...SOUNDS.map(({ name, label }) => ({ value: name, label }))],
      prefs.soundName === 'skin' || SOUNDS.some(({ name }) => name === prefs.soundName) ? (prefs.soundName as SoundName | 'skin') : 'skin',
      pickSound,
    ),
    drawHeading(elements, skin, 'gain-heading', 'Loudness'),
    drawChoice(
      elements,
      'gain',
      SOUND_GAINS.map((gain, index) => ({ value: gain, label: GAIN_LABELS[index] ?? String(gain) })),
      prefs.soundGain,
      soundGain => {
        act.pref({ soundGain })
        act.play(prefs.soundName as SoundName | 'skin', soundGain)
      },
    ),
    drawHeading(elements, skin, 'notify-heading', 'Notification', 'through your terminal'),
    drawOnOff(elements, 'notify', prefs.notify, notify => act.pref({ notify })),
    drawHeading(elements, skin, 'after-heading', 'Only after turns of'),
    drawChoice(
      elements,
      'after',
      NOTIFY_AFTER.map(seconds => ({ value: seconds, label: seconds === 0 ? 'Any length' : `${seconds} s+` })),
      prefs.notifyAfterSec,
      notifyAfterSec => act.pref({ notifyAfterSec }),
    ),
  ]
}

const TAB_DRAWERS: Record<SettingsTab, typeof drawBarTab> = {
  bar: drawBarTab,
  look: drawLookTab,
  alerts: drawAlertsTab,
  turn: drawTurnTab,
  sound: drawSoundTab,
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
