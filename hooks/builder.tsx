import type { ElementConstructor, InputProps } from 'claude-code'

import type { CustomSkin, SkinId } from '../types'
import { isHex } from './color'
import { ACCENTS, buildSkin } from './custom'
import { drawHeading } from './panels'
import type { Elements } from './panels'
import { drawPreview } from './picker'
import type { PreviewSample } from './picker'
import { SKIN_IDS, SKINS } from './skins'
import type { Skin } from './skins'

/** The pane `/skin create` and `/skin edit` open. */
export const BUILDER = 'skin-builder'
export const BUILDER_ROWS = 34
export const BUILDER_COLUMNS = 64

export type BuilderActions = {
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
 * The skin builder: a name, the built-in skin it starts from, an accent (a
 * swatch or any `#rrggbb`) and a style; the skin they make previews below as
 * it would draw, and Save keeps it among the person's own.
 */
export const drawBuilder = (
  elements: BuilderElements,
  chrome: Skin,
  draft: CustomSkin,
  sample: PreviewSample,
  act: BuilderActions,
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

  return (
    <Box flexDirection="column">
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
        ],
        draft.style,
        act.style,
      )}

      {drawPreview(elements, buildSkin(draft), sample)}

      <Box key="builder-actions" flexDirection="row" columnGap={1} marginTop={1}>
        <Button key="builder-save" label="Save" variant="primary" onPress={act.save} />
        <Button key="builder-cancel" label="Cancel" onPress={act.cancel} />
        {act.remove !== undefined && <Button key="builder-delete" label="Delete" onPress={act.remove} />}
      </Box>
      <Text key="hint" color={chrome.chat.muted} wrap="truncate-end">
        {'Tab moves · Enter picks · Esc closes · /skin export shares it'}
      </Text>
    </Box>
  )
}
