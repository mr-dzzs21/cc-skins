import type { BoxProps, ButtonProps, ElementConstructor, TextProps } from 'claude-code'

import type { SkinId } from '../types'
import { SKIN_IDS, SKINS } from './skins'

/** The pane `/skin` and a click on the bar open. */
export const PICKER = 'skin-picker'

/** How many of a skin's bar colors its row shows. */
const SWATCH = 4

type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button: ElementConstructor<ButtonProps>
}

/**
 * One row per skin, each one press: its hotkey, a strip of its bar's colors,
 * its name and look, a tick on the current one. A hint closes the list.
 */
export const drawPicker = ({ Box, Text, Button }: Elements, current: SkinId, choose: (id: SkinId) => void) => (
  <Box flexDirection="column">
    {SKIN_IDS.map((id, index) => {
      const skin = SKINS[id]
      const accent = skin.colors.blocks[0]?.bg

      return (
        <Button key={id} label={skin.label} hotkey={String(index + 1)} plain onPress={() => choose(id)}>
          {skin.colors.blocks.slice(0, SWATCH).map((block, step) => (
            <Text key={`${id}-${step}`} backgroundColor={block.bg}>
              {'  '}
            </Text>
          ))}
          <Text color={accent} bold>
            {` ${skin.label.padEnd(9)}`}
          </Text>
          <Text dimColor>{skin.description}</Text>
          {id === current && <Text color={skin.chat.success}> ✓</Text>}
        </Button>
      )
    })}
    <Text dimColor>{`↑↓ Enter or 1–${SKIN_IDS.length} · Esc closes · colors: /theme`}</Text>
  </Box>
)
