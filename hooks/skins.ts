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
    /**
     * The bar's blocks, left to right: a gradient, so the bar reads as one
     * piece whichever blocks show. The skin's own block takes the first.
     */
    blocks: readonly Paint[]
    /** The shade the skin's block pulses to while Claude works. */
    pulse: string
    /** A context or limit block at 60 % and up, then 85 % and up. */
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
      blocks: [
        { bg: '#39ff14', fg: '#04140a' },
        { bg: '#2bd92b', fg: '#04140a' },
        { bg: '#1fae3b', fg: '#04140a' },
        { bg: '#16823a', fg: '#e6ffe6' },
        { bg: '#0f5a2e', fg: '#d6ffd6' },
        { bg: '#0a3d22', fg: '#39ff14' },
      ],
      pulse: '#b6ff9e',
      warn: { bg: '#ffb000', fg: '#1a0f00' },
      danger: { bg: '#ff3b30', fg: '#1a0000' },
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
      blocks: [
        { bg: '#f72585', fg: '#0b0221' },
        { bg: '#b5179e', fg: '#ffffff' },
        { bg: '#7209b7', fg: '#ffffff' },
        { bg: '#3f37c9', fg: '#ffffff' },
        { bg: '#4895ef', fg: '#0b0221' },
        { bg: '#4cc9f0', fg: '#0b0221' },
      ],
      pulse: '#ff8fab',
      warn: { bg: '#ffea00', fg: '#0b0221' },
      danger: { bg: '#ff0a54', fg: '#0b0221' },
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
      blocks: [
        { bg: '#a3aed2', fg: '#090c0c' },
        { bg: '#769ff0', fg: '#090c0c' },
        { bg: '#394260', fg: '#e3e5e5' },
        { bg: '#2c3149', fg: '#e3e5e5' },
        { bg: '#212736', fg: '#a0a9cb' },
        { bg: '#1d2230', fg: '#9ece6a' },
      ],
      pulse: '#c0caf5',
      warn: { bg: '#e0af68', fg: '#1a1b26' },
      danger: { bg: '#f7768e', fg: '#1a1b26' },
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
      blocks: [
        { bg: '#ffd166', fg: '#2b1d0e' },
        { bg: '#f4a259', fg: '#2b1d0e' },
        { bg: '#e5604d', fg: '#1f0a05' },
        { bg: '#b8323f', fg: '#fff5eb' },
        { bg: '#7a1f2b', fg: '#fff5eb' },
        { bg: '#4a1520', fg: '#ffd166' },
      ],
      pulse: '#fff3b0',
      warn: { bg: '#ffe45e', fg: '#2b1d0e' },
      danger: { bg: '#ffffff', fg: '#c1121f' },
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
