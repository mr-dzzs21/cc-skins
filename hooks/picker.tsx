import type { BoxProps, ButtonProps, ElementConstructor, MarkdownProps, TextProps } from 'claude-code'

import type { BarStyle, SkinId } from '../types'
import { drawAssistantBlock, drawUserCard } from './chat'
import { prettyModel } from './format'
import { drawBar, drawPowerline, turnPills } from './hud'
import type { BarInput } from './hud'
import { SKIN_IDS, SKINS } from './skins'

/** The pane `/skin` and a click on the bar open. */
export const PICKER = 'skin-picker'

/** The keys that pick a skin straight away, in list order. */
const HOTKEYS = '1234567890abcdefghijklmnopqrstuvwxyz'

/** How many of a skin's bar colors its row shows. */
const SWATCH = 4

/** The preview's sample exchange. */
const SAMPLE = { prompt: 'count slowly to 5', reply: '1… 2… 3… 4… 5.', durationMs: 4_000 }

/** Where the dark skins begin: the picker heads them with Dark. */
const FIRST_DARK = SKIN_IDS.findIndex(id => SKINS[id].isDark === true)

/** Rows the picker asks for inline: the list and its Dark heading, its hint, and the short preview (title, bar, spinner). */
export const PICKER_ROWS = SKIN_IDS.length + (FIRST_DARK >= 0 ? 1 : 0) + 1 + 4

/** Columns it asks for docked beside the transcript, so the preview's cards have room. */
export const PICKER_COLUMNS = 64

export const hotkeyFor = (index: number): string | undefined => HOTKEYS[index]

/** The hotkeys of `count` rows as a hint reads them: `1–5`, `1–9, 0`, `1–9, 0, a–b`. */
export const hotkeyRange = (count: number): string => {
  if (count <= 9) {
    return `1–${count}`
  }
  const letters = count - 10

  return letters === 0 ? '1–9, 0' : `1–9, 0, a${letters > 1 ? `–${hotkeyFor(count - 1) ?? ''}` : ''}`
}

type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
  Markdown: ElementConstructor<MarkdownProps>
}

export type PickerView = {
  /** The skin in use. */
  current: SkinId
  /** The skin under the focus ring, the one the preview shows. */
  previewed: SkinId
  /** The bar as it draws now, its skin swapped for the previewed one. */
  bar: Omit<BarInput, 'skin'>
  barStyle: BarStyle
  columns: number
  /** Docked beside the transcript there's room for the sample cards; inline the preview stays short. */
  isRoomy: boolean
  /** When the sample prompt was sent: now. */
  now: number
}

/**
 * The skin under the focus as it would draw: the usage bar with this
 * session's figures, then (where there's room) a sample prompt and reply as
 * cards, and the spinner and turn line.
 */
const drawPreview = (elements: Elements, view: PickerView) => {
  const { Box, Text } = elements
  const skin = SKINS[view.previewed]
  const spinner = `${skin.glyph} ${skin.spinner.words[0] ?? ''}${skin.spinner.suffix ?? '…'}`
  const turnWord = skin.turn.words[0] ?? ''
  const model = view.bar.usage.model === null ? undefined : prettyModel(view.bar.usage.model)

  return (
    <Box key="preview" flexDirection="column" marginTop={1}>
      <Text key="title" color={skin.chat.assistant} bold wrap="truncate-end">
        {`Preview · ${skin.label}`}
        <Text color={skin.chat.muted} bold={false}>{`  ${skin.description}`}</Text>
      </Text>
      {drawBar(elements, { ...view.bar, skin }, view.barStyle, view.columns)}
      {view.isRoomy && drawUserCard(elements, skin, { text: SAMPLE.prompt, author: 'You', at: view.now })}
      {view.isRoomy && drawAssistantBlock(elements, skin, { text: SAMPLE.reply, isFirst: true, model })}
      <Box key="motion" flexDirection="row" gap={2}>
        <Text color={skin.chat.assistant}>{spinner}</Text>
        {drawPowerline(elements, turnPills(skin, turnWord, SAMPLE.durationMs, view.bar.glyphs), view.bar.glyphs)}
      </Box>
    </Box>
  )
}

/**
 * One row per skin, each one press: its hotkey, a strip of its bar's colors,
 * its name and look, a tick on the current one. The focus starts on the
 * current skin; the preview below follows it.
 */
export const drawPicker = (elements: Elements, view: PickerView, choose: (id: SkinId) => void) => {
  const { Box, Text, Button } = elements

  return (
    <Box flexDirection="column">
      {SKIN_IDS.flatMap((id, index) => {
        const skin = SKINS[id]
        const isCurrent = id === view.current
        const heading =
          index === FIRST_DARK && index > 0
            ? [
                <Text key="dark-heading" dimColor bold>
                  {'── Dark ──'}
                </Text>,
              ]
            : []

        return [
          ...heading,
          <Button
            key={id}
            label={skin.label}
            hotkey={hotkeyFor(index)}
            plain
            autoFocus={isCurrent ? true : undefined}
            onPress={() => choose(id)}
          >
            {skin.colors.blocks.slice(0, SWATCH).map((block, step) => (
              <Text key={`${id}-${step}`} backgroundColor={block.bg}>
                {'  '}
              </Text>
            ))}
            <Text color={skin.colors.blocks[0]?.bg} bold>
              {` ${skin.label.padEnd(10)}`}
            </Text>
            <Text dimColor>{skin.description}</Text>
            {isCurrent && <Text color={skin.chat.success}> ✓</Text>}
          </Button>,
        ]
      })}
      <Text key="hint" dimColor wrap="truncate-end">
        {`↑↓ preview · Enter or ${hotkeyRange(SKIN_IDS.length)} picks · Esc closes · colors: /theme`}
      </Text>
      {drawPreview(elements, view)}
    </Box>
  )
}
