import type { CustomSkin, SkinId } from '../types'
import { isHex, mix, readableBlock, readableOn, turnHue } from './color'
import { DEFAULT_SKIN, SKIN_IDS, SKINS, isSkinId } from './skins'
import type { Paint, Skin } from './skins'

/** The accents the builder offers as swatches; any `#rrggbb` goes too. */
export const ACCENTS: readonly string[] = [
  '#e63946', '#ff6b35', '#f4a261', '#e9c46a', '#a7c957', '#2a9d8f', '#00b4d8', '#4361ee',
  '#7209b7', '#b5179e', '#f72585', '#ff99c8', '#8d99ae', '#c0c0c0', '#d4a373', '#06d6a0',
]

/** The ground the chat's colors must read on: a dark terminal's. */
const DARK_GROUND = '#111116'

/** The block colors a recipe's style makes from its accent: six, left to right. */
const blocksFor = (accent: string, style: CustomSkin['style']): Paint[] =>
  Array.from({ length: 6 }, (_, index) =>
    readableBlock(
      style === 'dark'
        ? index === 0
          ? accent
          : mix(accent, '#0b0b10', 0.5 + index * 0.08)
        : mix(turnHue(accent, index * 14), index < 3 ? '#ffffff' : '#000000', index < 3 ? index * 0.1 : (index - 2) * 0.14),
    ),
  )

/**
 * The whole skin a recipe makes: the base skin's words, icon, glyph and
 * sound; blocks, pulse, alerts and chat colors from the accent, every text
 * readable on its ground.
 */
export const buildSkin = (recipe: CustomSkin): Skin => {
  const base = SKINS[recipe.base]
  const accent = isHex(recipe.accent) ? recipe.accent : base.colors.blocks[0]?.bg ?? '#7aa2f7'

  return {
    ...base,
    id: recipe.base,
    label: recipe.label,
    description: `Yours · ${accent} · ${recipe.style}, from ${base.label}`,
    isDark: recipe.style === 'dark' ? true : undefined,
    colors: {
      blocks: blocksFor(accent, recipe.style),
      pulse: mix(accent, '#ffffff', 0.35),
      warn: readableBlock('#d29922'),
      danger: readableBlock('#e5484d'),
    },
    chat: {
      border: mix(accent, '#0b0b10', 0.7),
      user: readableOn(turnHue(accent, 180), DARK_GROUND),
      assistant: readableOn(accent, DARK_GROUND),
      muted: readableOn(mix('#8b8b99', accent, 0.15), DARK_GROUND),
      success: '#4ade80',
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
  const { id, label, base, accent, style } = value as Record<string, unknown>
  if (
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    !isSkinId(base) ||
    typeof accent !== 'string' ||
    !isHex(accent) ||
    (style !== 'dark' && style !== 'vivid')
  ) {
    return undefined
  }

  return { id, label: label.slice(0, 32), base, accent: accent.toLowerCase(), style }
}

/** Every skin as the picker lists it: the bright built-ins, the dark ones, then the person's own. */
export type SkinEntry = { id: string; skin: Skin; group: 'bright' | 'dark' | 'yours' }

export const skinEntries = (customs: readonly CustomSkin[]): SkinEntry[] => [
  ...SKIN_IDS.map(id => ({ id, skin: SKINS[id], group: SKINS[id].isDark === true ? ('dark' as const) : ('bright' as const) })),
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
