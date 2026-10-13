import type { SkinId } from '../types'

export type SpinnerMode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

export type Skin = {
  id: SkinId
  label: string
  description: string
  /** Leads the HUD and the turn line. */
  glyph: string
  /** Between HUD segments. */
  separator: string
  bar: { fill: string; empty: string }
  spinner: {
    words: readonly string[]
    /** A fixed word for a mode, in place of a sampled one. */
    byMode?: Partial<Record<SpinnerMode, string>>
    /** Drawn after the word; left out, the engine's ellipsis. */
    suffix?: string
  }
  /** The line that closes a turn: `<word> <joiner> 3s`. */
  turn: { words: readonly string[]; joiner: string }
}

export const SKINS: Record<SkinId, Skin> = {
  retro: {
    id: 'retro',
    label: 'Retro',
    description: 'Phosphor green and amber, CRT vibes',
    glyph: '▌',
    separator: ' │ ',
    bar: { fill: '█', empty: '░' },
    spinner: {
      words: ['Compiling', 'Linking', 'Booting', 'Assembling', 'Defragging', 'Spooling', 'Buffering', 'Polling'],
      byMode: { thinking: 'Computing' },
      suffix: '▌',
    },
    turn: { words: ['Done', 'Halted', 'Exited 0'], joiner: 'in' },
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    description: 'Magenta and cyan, cyberpunk',
    glyph: '⟡',
    separator: ' ⋮ ',
    bar: { fill: '▰', empty: '▱' },
    spinner: {
      words: ['Hacking', 'Decrypting', 'Overclocking', 'Rerouting', 'Glitching', 'Uplinking', 'Splicing', 'Jacking in'],
      byMode: { thinking: 'Neural-linking' },
      suffix: ' ⟡',
    },
    turn: { words: ['Jacked in', 'Uplinked', 'Synced'], joiner: 'for' },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Muted grey with one calm accent, no gimmicks',
    glyph: '·',
    separator: ' · ',
    bar: { fill: '━', empty: '─' },
    spinner: {
      words: ['Working'],
      byMode: {
        requesting: 'Waiting',
        thinking: 'Thinking',
        responding: 'Writing',
        'tool-input': 'Preparing',
        'tool-use': 'Running',
      },
    },
    turn: { words: ['Done'], joiner: 'in' },
  },
  ring: {
    id: 'ring',
    label: 'Ring',
    description: 'Red and gold, boxing ring',
    glyph: '◆',
    separator: ' │ ',
    bar: { fill: '■', empty: '□' },
    spinner: {
      words: ['Jabbing', 'Slipping', 'Bobbing', 'Weaving', 'Countering', 'Feinting', 'Shadowboxing', 'Uppercutting'],
      byMode: { thinking: 'Reading the opponent' },
    },
    turn: { words: ['KO', 'TKO', 'Split decision'], joiner: 'in' },
  },
}

export const SKIN_IDS = Object.keys(SKINS) as SkinId[]

export const DEFAULT_SKIN: SkinId = 'minimal'

export const isSkinId = (value: unknown): value is SkinId =>
  typeof value === 'string' && value in SKINS

/** The name `/theme` lists a skin's color theme under (themes/<id>.json). */
export const themeName = (id: SkinId) => `cc-skins · ${SKINS[id].label}`

/**
 * Picks from `words` by a stable hash of `seed`, so a redraw keeps the word
 * while a new seed (the engine samples one per turn) brings another.
 */
export const pick = (words: readonly string[], seed: string): string => {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }

  return words[Math.abs(hash) % words.length] ?? words[0] ?? ''
}
