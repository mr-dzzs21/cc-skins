import type { ElementConstructor, InputProps } from 'claude-code'

import type { BuilderTab, ColorPart, CustomSkin, SkinId } from '../types'
import { isHex } from './color'
import { ACCENTS, COLOR_PARTS, buildSkin } from './custom'
import { blockPaint } from './hud'
import { drawHeading } from './panels'
import type { Elements } from './panels'
import { drawPreview } from './picker'
import type { PreviewSample } from './picker'
import { SKIN_IDS, SKINS } from './skins'
import type { Skin } from './skins'

/** The pane `/skin create` and `/skin edit` open. */
export const BUILDER = 'skin-builder'
export const BUILDER_ROWS = 36
export const BUILDER_COLUMNS = 64

/** The builder's tabs, as its tab row lists them. */
export const BUILDER_TABS: readonly { tab: BuilderTab; label: string }[] = [
  { tab: 'basics', label: 'Basics' },
  { tab: 'bar', label: 'Bar colors' },
  { tab: 'chat', label: 'Turn line and chat' },
]

export const isBuilderTab = (value: unknown): value is BuilderTab => BUILDER_TABS.some(({ tab }) => tab === value)

/** What each piece's row shows of it, in its own colors. */
const SAMPLES: Readonly<Record<ColorPart, (skin: Skin) => string>> = {
  skin: skin => skin.glyph,
  model: () => 'Opus 5.5',
  branch: () => '⎇ main',
  context: () => 'ctx 34%',
  fiveHour: () => '5h 42%',
  sevenDay: () => '7d 23%',
  cost: () => '$1.24',
  session: () => '◷ 12m',
  clock: () => '14:23',
  version: () => 'v2.1.299',
  warn: () => 'ctx 72%',
  danger: () => '5h 91%',
  turnWord: skin => `${skin.glyph} ${skin.turn.words[0] ?? 'Done'}`,
  turnTime: skin => `${skin.turn.joiner} 12s`,
  turnStats: () => '$0.04',
  frame: () => '╭────╮',
  you: () => '❯ You',
  claude: skin => `${skin.glyph} CLAUDE`,
  quiet: () => '14:23',
  done: () => '✓ done',
}

/** The pieces drawn as text in their color, not as a block. */
const CHAT_PARTS: readonly ColorPart[] = ['frame', 'you', 'claude', 'quiet', 'done']

/** The color the chat's piece has in a skin. */
const chatColor = (skin: Skin, part: ColorPart): string =>
  ({ frame: skin.chat.border, you: skin.chat.user, claude: skin.chat.assistant, quiet: skin.chat.muted, done: skin.chat.success })[
    part as 'frame'
  ] ?? skin.chat.muted

export type BuilderActions = {
  /** Moves to a tab. */
  tab: (tab: BuilderTab) => void
  /** Colors one piece: a name or `#rrggbb` as typed; empty gives it back to the style. */
  color: (part: ColorPart, typed: string) => void
  /** Gives every piece of the tab back to the style. */
  resetColors: (tab: Exclude<BuilderTab, 'basics'>) => void
  label: (label: string) => void
  base: (base: SkinId) => void
  accent: (accent: string) => void
  style: (style: CustomSkin['style']) => void
  save: () => void
  cancel: () => void
  /** Deletes the skin being edited; absent while building a new one. */
  remove?: () => void
}

type BuilderElements = Elements & { Markdown: Parameters<typeof drawPreview>[0]['Markdown']; Input?: ElementConstructor<InputProps> }

/**
 * The skin builder, in tabs. Basics: a name, the built-in skin it starts
 * from, an accent (a swatch or any `#rrggbb`) and a style. Bar colors, and
 * Turn line and chat: every piece in a row, drawn in its colors, with a field
 * for its own (a name such as `red` or `blau`, or `#rrggbb`). The skin they
 * make previews below as it would draw, and Save keeps it among the person's
 * own.
 */
export const drawBuilder = (
  elements: BuilderElements,
  chrome: Skin,
  draft: CustomSkin,
  sample: PreviewSample,
  act: BuilderActions,
  tab: BuilderTab = 'basics',
) => {
  const { Box, Text, Button, Input } = elements
  const choice = <T extends string>(key: string, options: readonly { value: T; label: string }[], current: T, pick: (value: T) => void) => (
    <Box key={key} flexDirection="row" flexWrap="wrap" columnGap={1}>
      {options.map(option => (
        <Button
          key={`${key}-${option.value}`}
          label={option.label}
          variant={option.value === current ? 'primary' : undefined}
          onPress={() => pick(option.value)}
        />
      ))}
    </Box>
  )

  const built = buildSkin(draft)
  const tabs = (
    <Box key="builder-tabs" flexDirection="row" columnGap={1}>
      {BUILDER_TABS.map(one => (
        <Button
          key={`builder-tab-${one.tab}`}
          label={one.label}
          variant={one.tab === tab ? 'primary' : undefined}
          onPress={() => act.tab(one.tab)}
        />
      ))}
    </Box>
  )
  const footer = [
    drawPreview(elements, built, sample),
    <Box key="builder-actions" flexDirection="row" columnGap={1} marginTop={1}>
      <Button key="builder-save" label="Save" variant="primary" onPress={act.save} />
      <Button key="builder-cancel" label="Cancel" onPress={act.cancel} />
      {act.remove !== undefined && <Button key="builder-delete" label="Delete" onPress={act.remove} />}
    </Box>,
    <Text key="hint" color={chrome.chat.muted} wrap="truncate-end">
      {'Tab moves · Enter picks · Esc closes · /skin export shares it'}
    </Text>,
  ]

  if (tab !== 'basics') {
    const parts = COLOR_PARTS.filter(one => one.tab === tab)

    return (
      <Box flexDirection="column">
        {tabs}
        {drawHeading(elements, chrome, 'parts-heading', 'Each piece', 'a name (red, blau) or #rrggbb · empty: the style\'s')}
        {parts.map(({ part, label }) => {
          const own = draft.colors?.[part]
          const isChat = CHAT_PARTS.includes(part)
          const paint = isChat ? undefined : blockPaint(built, part)
          const text = ` ${SAMPLES[part](built)} `.padEnd(16)

          return (
            <Box key={`part-${part}`} flexDirection="row" columnGap={1}>
              <Text key="label" color={own === undefined ? chrome.chat.muted : undefined}>
                {`${own === undefined ? ' ' : '●'} ${label}`.padEnd(16)}
              </Text>
              {paint === undefined ? (
                <Text key="sample" color={chatColor(built, part)} bold>
                  {text}
                </Text>
              ) : (
                <Text key="sample" backgroundColor={paint.bg} color={paint.fg} bold>
                  {text}
                </Text>
              )}
              {Input === undefined ? (
                <Text key="value" color={chrome.chat.muted}>
                  {own ?? (paint?.bg ?? chatColor(built, part))}
                </Text>
              ) : (
                <Input
                  key={`color-${part}`}
                  value={own ?? ''}
                  placeholder={paint?.bg ?? chatColor(built, part)}
                  submitLabel="set"
                  onSubmit={value => act.color(part, value)}
                />
              )}
            </Box>
          )
        })}
        <Box key="parts-actions" flexDirection="row" columnGap={1}>
          <Button key="parts-reset" label="All back to the style" onPress={() => act.resetColors(tab)} />
        </Box>
        {footer}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {tabs}
      {drawHeading(elements, chrome, 'model-heading', 'Name')}
      {Input === undefined ? (
        <Text key="name">{draft.label}</Text>
      ) : (
        <Input
          key="name"
          value={draft.label}
          placeholder="My skin"
          autoFocus
          onInput={value => act.label(value)}
          onSubmit={value => act.label(value)}
        />
      )}

      {drawHeading(elements, chrome, 'base-heading', 'Starts from', 'its words, icon and sound')}
      {choice(
        'base',
        SKIN_IDS.map(id => ({ value: id, label: SKINS[id].label })),
        draft.base,
        act.base,
      )}

      {drawHeading(elements, chrome, 'accent-heading', 'Accent', 'a swatch, or type #rrggbb')}
      <Box key="swatches" flexDirection="row" flexWrap="wrap" columnGap={1}>
        {ACCENTS.map(accent => (
          <Button key={`accent-${accent.slice(1)}`} label={accent} plain onPress={() => act.accent(accent)}>
            <Text backgroundColor={accent}>{accent === draft.accent ? ' ✓ ' : '   '}</Text>
          </Button>
        ))}
      </Box>
      {Input !== undefined && (
        <Input
          key="hex"
          label="Hex"
          placeholder="#rrggbb"
          value={draft.accent}
          onSubmit={value => {
            const hex = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`
            if (isHex(hex)) {
              act.accent(hex.toLowerCase())
            }
          }}
        />
      )}

      {drawHeading(elements, chrome, 'style-heading', 'Style')}
      {choice(
        'build-style',
        [
          { value: 'dark', label: 'Dark: the accent fading into black' },
          { value: 'vivid', label: 'Vivid: the accent across nearby hues' },
          { value: 'light', label: 'Light: the accent on a pale ground, for light terminals' },
          { value: 'base', label: `As it is: ${SKINS[draft.base].label}'s own colors` },
        ],
        draft.style,
        act.style,
      )}

      {footer}
    </Box>
  )
}
