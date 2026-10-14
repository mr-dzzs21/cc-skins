import type { BuilderTab, ColorPart, CustomSkin, SkinId } from '../types'
import { isHex, mix, readableBlock, readableOn, turnHue } from './color'
import { DEFAULT_SKIN, SKIN_IDS, SKINS, isSkinId } from './skins'
import { cleanLine } from './text'
import type { Paint, Skin } from './skins'

/** How many skins of their own a person keeps at most. */
export const MAX_CUSTOM_SKINS = 50

/** What a built skin's id may be: lowercase words joined by dashes, as `slugFor` makes them. */
const CUSTOM_ID = /^[a-z0-9][a-z0-9-]{0,31}$/

/** The accents the builder offers as swatches; any `#rrggbb` goes too. */
export const ACCENTS: readonly string[] = [
  '#e63946', '#ff6b35', '#f4a261', '#e9c46a', '#a7c957', '#2a9d8f', '#00b4d8', '#4361ee',
  '#7209b7', '#b5179e', '#f72585', '#ff99c8', '#8d99ae', '#c0c0c0', '#d4a373', '#06d6a0',
]

/** The pieces a skin of one's own colors one by one, with the builder tab each is on, in the order listed. */
export const COLOR_PARTS: readonly { part: ColorPart; label: string; tab: Exclude<BuilderTab, 'basics'> }[] = [
  { part: 'skin', label: 'Skin block', tab: 'bar' },
  { part: 'model', label: 'Model', tab: 'bar' },
  { part: 'branch', label: 'Branch', tab: 'bar' },
  { part: 'context', label: 'Context', tab: 'bar' },
  { part: 'fiveHour', label: '5-hour limit', tab: 'bar' },
  { part: 'sevenDay', label: '7-day limit', tab: 'bar' },
  { part: 'cost', label: 'Cost', tab: 'bar' },
  { part: 'session', label: 'Session time', tab: 'bar' },
  { part: 'clock', label: 'Clock', tab: 'bar' },
  { part: 'version', label: 'Version', tab: 'bar' },
  { part: 'warn', label: 'Warning, 60 %', tab: 'bar' },
  { part: 'danger', label: 'Alarm, 85 %', tab: 'bar' },
  { part: 'turnWord', label: 'Turn word', tab: 'chat' },
  { part: 'turnTime', label: 'Turn time', tab: 'chat' },
  { part: 'turnStats', label: 'Turn cost', tab: 'chat' },
  { part: 'frame', label: 'Card frames', tab: 'chat' },
  { part: 'you', label: 'You', tab: 'chat' },
  { part: 'claude', label: 'Claude', tab: 'chat' },
  { part: 'quiet', label: 'Quiet text', tab: 'chat' },
  { part: 'done', label: 'Done ticks', tab: 'chat' },
]

export const isColorPart = (value: unknown): value is ColorPart => COLOR_PARTS.some(({ part }) => part === value)

/** What `/skin color <name>` takes: a part's key or its label, any case, spaces and dashes aside. */
export const colorPartNamed = (name: string): ColorPart | undefined => {
  const squash = (text: string) => text.toLowerCase().replace(/[\s,%-]+/g, '')
  const wanted = squash(name)

  return COLOR_PARTS.find(({ part, label }) => squash(part) === wanted || squash(label) === wanted)?.part
}

/** The grounds the chat's colors must read on: a dark terminal's, and a light one's for the light style. */
const DARK_GROUND = '#111116'
const LIGHT_GROUND = '#f6efe6'

/** The block colors a recipe's style makes from its accent: six, left to right. */
const blocksFor = (accent: string, style: CustomSkin['style']): Paint[] =>
  Array.from({ length: 6 }, (_, index) =>
    readableBlock(
      index === 0 && style !== 'vivid'
        ? accent
        : style === 'dark'
          ? mix(accent, '#0b0b10', 0.5 + index * 0.08)
          : style === 'light'
            ? mix(accent, '#ffffff', 0.62 + index * 0.06)
            : mix(turnHue(accent, index * 14), index < 3 ? '#ffffff' : '#000000', index < 3 ? index * 0.1 : (index - 2) * 0.14),
    ),
  )

/** The bar's and turn line's pieces a recipe colors one by one, as the blocks they paint. */
const BLOCK_PARTS: readonly ColorPart[] = [
  'skin', 'model', 'branch', 'context', 'fiveHour', 'sevenDay', 'cost', 'session', 'clock', 'version', 'turnWord', 'turnTime', 'turnStats',
]

/** The skin a recipe's style makes, before any piece is colored one by one. */
const styled = (recipe: CustomSkin): Skin => {
  const base = SKINS[recipe.base]
  if (recipe.style === 'base') {
    return { ...base, label: recipe.label, description: `Yours · ${base.label}'s colors` }
  }
  const accent = isHex(recipe.accent) ? recipe.accent : base.colors.blocks[0]?.bg ?? '#7aa2f7'
  const isLight = recipe.style === 'light'
  const ground = isLight ? LIGHT_GROUND : DARK_GROUND

  return {
    ...base,
    label: recipe.label,
    description: `Yours · ${accent} · ${recipe.style}, from ${base.label}`,
    isDark: recipe.style === 'dark' ? true : undefined,
    isLight: isLight ? true : undefined,
    colors: {
      blocks: blocksFor(accent, recipe.style),
      pulse: mix(accent, '#ffffff', 0.35),
      warn: readableBlock('#d29922'),
      danger: readableBlock('#e5484d'),
    },
    chat: {
      border: isLight ? mix(accent, '#ffffff', 0.7) : mix(accent, '#0b0b10', 0.7),
      user: readableOn(turnHue(accent, 180), ground),
      assistant: readableOn(accent, ground),
      muted: readableOn(mix(isLight ? '#6b6b78' : '#8b8b99', accent, 0.15), ground),
      success: readableOn(isLight ? '#15803d' : '#4ade80', ground),
    },
  }
}

/**
 * The whole skin a recipe makes: the base skin's words, icon, glyph and
 * sound; its colors as the style makes them (from the accent, or the base
 * skin's own), then each piece colored one by one over them. A block's text
 * is picked to read on the color given, and a chat color is lifted until it
 * reads on the terminal's ground: every text stays readable.
 */
export const buildSkin = (recipe: CustomSkin): Skin => {
  const skin = styled(recipe)
  const colors = recipe.colors ?? {}
  const ground = skin.isLight === true ? LIGHT_GROUND : DARK_GROUND
  const byPart: Partial<Record<ColorPart, Paint>> = {}
  for (const part of BLOCK_PARTS) {
    const color = colors[part]
    if (color !== undefined && isHex(color)) {
      byPart[part] = readableBlock(color)
    }
  }
  const block = (part: 'warn' | 'danger') => {
    const color = colors[part]

    return color !== undefined && isHex(color) ? readableBlock(color) : skin.colors[part]
  }
  const chat = (part: ColorPart, fallback: string) => {
    const color = colors[part]

    return color !== undefined && isHex(color) ? readableOn(color, ground) : fallback
  }
  const changed = Object.keys(colors).length

  return {
    ...skin,
    id: recipe.base,
    description: changed === 0 ? skin.description : `${skin.description} · ${changed} ${changed === 1 ? 'piece' : 'pieces'} recolored`,
    colors: { ...skin.colors, warn: block('warn'), danger: block('danger'), byPart },
    chat: {
      border: colors.frame !== undefined && isHex(colors.frame) ? colors.frame : skin.chat.border,
      user: chat('you', skin.chat.user),
      assistant: chat('claude', skin.chat.assistant),
      muted: chat('quiet', skin.chat.muted),
      success: chat('done', skin.chat.success),
    },
  }
}

/** A name as an id: lowercase words joined by dashes, never a built-in's, never one already taken. */
export const slugFor = (label: string, taken: readonly string[]): string => {
  const slug =
    label
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'my-skin'
  let id = slug
  for (let n = 2; isSkinId(id) || taken.includes(id); n++) {
    id = `${slug}-${n}`
  }

  return id
}

/** A recipe from anything: kept only where every field has its kind, the style one of the two. */
export const parseRecipe = (value: unknown): CustomSkin | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }
  const { id, label, base, accent, style, colors } = value as Record<string, unknown>
  if (
    typeof id !== 'string' ||
    !CUSTOM_ID.test(id) ||
    isSkinId(id) ||
    typeof label !== 'string' ||
    !isSkinId(base) ||
    typeof accent !== 'string' ||
    !isHex(accent) ||
    (style !== 'dark' && style !== 'vivid' && style !== 'light' && style !== 'base')
  ) {
    return undefined
  }
  const parts =
    typeof colors === 'object' && colors !== null
      ? Object.fromEntries(
          Object.entries(colors as Record<string, unknown>)
            .filter((entry): entry is [ColorPart, string] => isColorPart(entry[0]) && typeof entry[1] === 'string' && isHex(entry[1]))
            .map(([part, color]) => [part, color.toLowerCase()]),
        )
      : {}
  const recipe: CustomSkin = { id, label: cleanLine(label).slice(0, 32) || 'My skin', base, accent: accent.toLowerCase(), style }

  return Object.keys(parts).length === 0 ? recipe : { ...recipe, colors: parts }
}

/** Every skin as the picker lists it: the bright built-ins, the dark ones, the light ones, then the person's own. */
export type SkinEntry = { id: string; skin: Skin; group: 'bright' | 'dark' | 'light' | 'yours' }

const groupOf = (skin: Skin): SkinEntry['group'] =>
  skin.isLight === true ? 'light' : skin.isDark === true ? 'dark' : 'bright'

export const skinEntries = (customs: readonly CustomSkin[]): SkinEntry[] => [
  ...SKIN_IDS.map(id => ({ id, skin: SKINS[id], group: groupOf(SKINS[id]) })),
  ...customs.map(recipe => ({ id: recipe.id, skin: buildSkin(recipe), group: 'yours' as const })),
]

export const isKnownSkin = (id: unknown, customs: readonly CustomSkin[]): id is string =>
  isSkinId(id) || customs.some(recipe => recipe.id === id)

/** The skin under an id: a built-in, one the person built, else the default. */
export const resolveSkin = (id: string, customs: readonly CustomSkin[]): Skin => {
  if (isSkinId(id)) {
    return SKINS[id]
  }
  const recipe = customs.find(one => one.id === id)

  return recipe === undefined ? SKINS[DEFAULT_SKIN] : buildSkin(recipe)
}

/** Where a built-in's colors live in /theme; a built skin's live in the bar and chat alone. */
export const themeName = (id: string): string | undefined => (isSkinId(id) ? `cc-skins · ${SKINS[id as SkinId].label}` : undefined)
