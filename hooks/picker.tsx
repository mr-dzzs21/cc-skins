import type { BoxProps, ButtonProps, ElementConstructor, MarkdownProps, TextProps } from 'claude-code'

import type { BarStyle } from '../types'
import { drawAssistantBlock, drawUserCard } from './chat'
import { prettyModel } from './format'
import { drawBar, drawPowerline, turnPills } from './hud'
import type { BarInput } from './hud'
import type { SkinEntry } from './custom'
import type { Skin } from './skins'
import { displayWidth, truncateCells } from './text'

/** The pane `/skin` and a click on the bar open. */
export const PICKER = 'skin-picker'

/** The keys that pick a skin straight away, in list order. */
const HOTKEYS = '1234567890abcdefghijklmnopqrstuvwxyz'

/** How many of a skin's bar colors its row shows. */
const SWATCH = 4

/** The preview's sample exchange. */
const SAMPLE = { prompt: 'count slowly to 5', reply: '1… 2… 3… 4… 5.', durationMs: 4_000 }

/** A row's cells besides its description: hotkey, swatch, name and the tick. */
const LABEL_CELLS = 10
const ROW_CELLS = 3 + SWATCH * 2 + 1 + LABEL_CELLS + 1 + 2 + 1

const padCells = (text: string, cells: number) => `${text}${' '.repeat(Math.max(0, cells - displayWidth(text)))}`

const GROUP_HEADINGS: Record<SkinEntry['group'], string | undefined> = {
  bright: undefined,
  dark: '── Dark ──',
  light: '── Light ──',
  yours: '── Yours ──',
}

/** Rows the picker asks for inline: the list and its headings, its hint, and the short preview (title, bar, spinner). */
export const pickerRows = (entries: readonly SkinEntry[]) =>
  entries.length + new Set(entries.map(entry => entry.group).filter(group => group !== 'bright')).size + 1 + 4

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

/** What a preview draws besides its skin: the bar as it draws now, and where. */
export type PreviewSample = {
  /** The bar as it draws now, its skin swapped for the previewed one. */
  bar: Omit<BarInput, 'skin'>
  barStyle: BarStyle
  columns: number
  /** Docked beside the transcript there's room for the sample cards; inline the preview stays short. */
  isRoomy: boolean
  /** When the sample prompt was sent: now. */
  now: number
}

export type PickerView = PreviewSample & {
  /** Every skin, as the list shows them. */
  entries: readonly SkinEntry[]
  /** The skin in use. */
  current: string
  /** The skin under the focus ring, the one the preview shows. */
  previewed: string
}

/**
 * The skin under the focus as it would draw: the usage bar with this
 * session's figures, then (where there's room) a sample prompt and reply as
 * cards, and the spinner and turn line.
 */
export const drawPreview = (elements: Elements, skin: Skin, view: PreviewSample) => {
  const { Box, Text } = elements
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
export const drawPicker = (elements: Elements, view: PickerView, choose: (id: string) => void) => {
  const { Box, Text, Button } = elements
  const previewed = view.entries.find(entry => entry.id === view.previewed) ?? view.entries.find(entry => entry.id === view.current)

  return (
    <Box flexDirection="column">
      {view.entries.flatMap(({ id, skin, group }, index) => {
        const isCurrent = id === view.current
        const title = GROUP_HEADINGS[group]
        const heading =
          title !== undefined && view.entries[index - 1]?.group !== group
            ? [
                <Text key={`${group}-heading`} dimColor bold>
                  {title}
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
              {` ${padCells(truncateCells(skin.label, LABEL_CELLS), LABEL_CELLS)} `}
            </Text>
            <Text dimColor>{truncateCells(skin.description, Math.max(8, view.columns - ROW_CELLS))}</Text>
            {isCurrent && <Text color={skin.chat.success}> ✓</Text>}
          </Button>,
        ]
      })}
      <Text key="hint" dimColor wrap="truncate-end">
        {`↑↓ preview · Enter or ${hotkeyRange(view.entries.length)} picks · Esc closes · /skin create builds your own`}
      </Text>
      {previewed !== undefined && drawPreview(elements, previewed.skin, view)}
    </Box>
  )
}
