import type { SkinId } from '../types'

export type SpinnerMode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

/** One block of the powerline bar: its background and the text drawn on it. */
export type Paint = { bg: string; fg: string }

export type Skin = {
  id: SkinId
  label: string
  description: string
  /** Leads the bar and the turn line where the font has no icons. */
  glyph: string
  /** Leads the bar and the turn line in a Nerd Font (Font Awesome range, in every Nerd Font). */
  icon: string
  /** The cells of the small meters inside the bar's blocks. */
  meter: { fill: string; empty: string }
  colors: {
    /** The skin's own block, and the shade it pulses to while Claude works. */
    accent: Paint
    pulse: string
    model: Paint
    /** Context and limit blocks alternate between these two while below 60 %. */
    meterA: Paint
    meterB: Paint
    cost: Paint
    /** 60 % and up, then 85 % and up. */
    warn: Paint
    danger: Paint
  }
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
    icon: '',
    meter: { fill: '█', empty: '░' },
    colors: {
      accent: { bg: '#33ff66', fg: '#0a0f0a' },
      pulse: '#a6ffbf',
      model: { bg: '#ffb000', fg: '#0a0f0a' },
      meterA: { bg: '#1f5c33', fg: '#c4f5cf' },
      meterB: { bg: '#2f4d38', fg: '#c4f5cf' },
      cost: { bg: '#0f1f14', fg: '#33ff66' },
      warn: { bg: '#ffb000', fg: '#0a0f0a' },
      danger: { bg: '#ff4d4d', fg: '#0a0f0a' },
    },
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
    icon: '',
    meter: { fill: '▰', empty: '▱' },
    colors: {
      accent: { bg: '#ff2bd6', fg: '#0d0221' },
      pulse: '#00e5ff',
      model: { bg: '#00e5ff', fg: '#0d0221' },
      meterA: { bg: '#4a1f7a', fg: '#e6e6ff' },
      meterB: { bg: '#2d1b54', fg: '#e6e6ff' },
      cost: { bg: '#1a1033', fg: '#39ff14' },
      warn: { bg: '#ffea00', fg: '#0d0221' },
      danger: { bg: '#ff3860', fg: '#ffffff' },
    },
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
    icon: '',
    meter: { fill: '━', empty: '─' },
    colors: {
      accent: { bg: '#7aa2f7', fg: '#1c1c1c' },
      pulse: '#aec5fa',
      model: { bg: '#3a3a3a', fg: '#d4d4d4' },
      meterA: { bg: '#2e2e2e', fg: '#d4d4d4' },
      meterB: { bg: '#262626', fg: '#d4d4d4' },
      cost: { bg: '#1f1f1f', fg: '#9ece6a' },
      warn: { bg: '#d4b26a', fg: '#1c1c1c' },
      danger: { bg: '#e06c75', fg: '#1c1c1c' },
    },
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
    icon: '',
    meter: { fill: '■', empty: '□' },
    colors: {
      accent: { bg: '#e63946', fg: '#ffffff' },
      pulse: '#ff8a93',
      model: { bg: '#f2c94c', fg: '#1a1213' },
      meterA: { bg: '#6a1e25', fg: '#f1e9da' },
      meterB: { bg: '#3d3428', fg: '#f1e9da' },
      cost: { bg: '#2a1a1c', fg: '#f2c94c' },
      warn: { bg: '#f4a261', fg: '#1a1213' },
      danger: { bg: '#9d0208', fg: '#ffffff' },
    },
    spinner: {
      words: ['Jabbing', 'Slipping', 'Bobbing', 'Weaving', 'Countering', 'Feinting', 'Shadowboxing', 'Uppercutting'],
      byMode: { thinking: 'Reading the opponent' },
    },
    turn: { words: ['KO', 'TKO', 'Split decision'], joiner: 'in' },
  },
}

export const SKIN_IDS = Object.keys(SKINS) as SkinId[]

export const DEFAULT_SKIN: SkinId = 'ring'

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
