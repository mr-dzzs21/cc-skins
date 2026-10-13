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
  /** The chat's cards: their frame (and the icon badges' ground), your color, Claude's, quiet text, done. */
  chat: { border: string; user: string; assistant: string; muted: string; success: string }
}

export const SKINS: Record<SkinId, Skin> = {
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep navy cards, Claude in orange, you in blue',
    glyph: '✻',
    icon: '\uf186',
    meter: { fill: '━', empty: '─' },
    colors: {
      blocks: [
        { bg: '#f0883e', fg: '#0b1220' },
        { bg: '#2f4468', fg: '#e6edf3' },
        { bg: '#26385a', fg: '#e6edf3' },
        { bg: '#1f2d4a', fg: '#c9d1d9' },
        { bg: '#19253d', fg: '#c9d1d9' },
        { bg: '#141e33', fg: '#3fb950' },
      ],
      pulse: '#ffb27a',
      warn: { bg: '#d29922', fg: '#0b1220' },
      danger: { bg: '#f85149', fg: '#0b1220' },
    },
    spinner: {
      words: ['Thinking', 'Composing', 'Weaving', 'Sketching', 'Tinkering', 'Untangling', 'Polishing', 'Charting'],
      byMode: { thinking: 'Pondering', 'tool-use': 'Working' },
    },
    turn: { words: ['Done', 'Finished', 'Wrapped up'], joiner: 'in' },
    chat: { border: '#24324d', user: '#6ea8fe', assistant: '#f0883e', muted: '#8b949e', success: '#3fb950' },
  },
  retro: {
    id: 'retro',
    label: 'Retro',
    description: 'Phosphor green and amber, CRT vibes',
    glyph: '▌',
    icon: '\uf11b',
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
    chat: { border: '#16823a', user: '#ffb000', assistant: '#39ff14', muted: '#5a8a66', success: '#39ff14' },
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    description: 'Magenta and cyan, cyberpunk',
    glyph: '⟡',
    icon: '\uf0e7',
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
    chat: { border: '#3f37c9', user: '#4cc9f0', assistant: '#f72585', muted: '#7d70a3', success: '#39ff14' },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Muted grey with one calm accent, no gimmicks',
    glyph: '·',
    icon: '\uf10c',
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
    chat: { border: '#394260', user: '#a3aed2', assistant: '#769ff0', muted: '#565f89', success: '#9ece6a' },
  },
  ring: {
    id: 'ring',
    label: 'Ring',
    description: 'Red and gold, boxing ring',
    glyph: '◆',
    icon: '\uf255',
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
    chat: { border: '#7a1f2b', user: '#ffd166', assistant: '#e5604d', muted: '#8a7f6e', success: '#52b788' },
  },
  synthwave: {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Sunset gold to violet, 80s outrun',
    glyph: '◢',
    icon: '\uf185',
    meter: { fill: '▰', empty: '▱' },
    colors: {
      blocks: [
        { bg: '#fede5d', fg: '#241b2f' },
        { bg: '#ff9e64', fg: '#241b2f' },
        { bg: '#ff6ac1', fg: '#241b2f' },
        { bg: '#a83cc9', fg: '#ffffff' },
        { bg: '#6e3fa3', fg: '#ffffff' },
        { bg: '#2a1b3d', fg: '#fede5d' },
      ],
      pulse: '#fff3a8',
      warn: { bg: '#ffe066', fg: '#241b2f' },
      danger: { bg: '#ff3864', fg: '#1a0509' },
    },
    spinner: {
      words: ['Cruising', 'Rewinding', 'Synthesizing', 'Arpeggiating', 'Drifting', 'Overdriving', 'Pulsing', 'Fading in'],
      byMode: { thinking: 'Dreaming in neon' },
      suffix: ' ◢',
    },
    turn: { words: ['Fade out', 'Credits rolled', 'Wrapped'], joiner: 'in' },
    chat: { border: '#3b2a52', user: '#36f9f6', assistant: '#ff6ac1', muted: '#8b7ca6', success: '#72f1b8' },
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep sea blues with a coral spark',
    glyph: '≈',
    icon: '\uf13d',
    meter: { fill: '▮', empty: '▯' },
    colors: {
      blocks: [
        { bg: '#ff8c69', fg: '#1a0b05' },
        { bg: '#90e0ef', fg: '#03045e' },
        { bg: '#48cae4', fg: '#03045e' },
        { bg: '#0077b6', fg: '#ffffff' },
        { bg: '#023e8a', fg: '#caf0f8' },
        { bg: '#03045e', fg: '#90e0ef' },
      ],
      pulse: '#ffc2ad',
      warn: { bg: '#ffd166', fg: '#1a1305' },
      danger: { bg: '#ff4d6d', fg: '#1a0509' },
    },
    spinner: {
      words: ['Diving', 'Surfing', 'Drifting', 'Charting', 'Snorkeling', 'Riding the wave', 'Paddling', 'Sailing'],
      byMode: { thinking: 'Sounding the depths' },
    },
    turn: { words: ['Surfaced', 'Docked', 'Landed'], joiner: 'in' },
    chat: { border: '#023e8a', user: '#90e0ef', assistant: '#ff8c69', muted: '#6c8ea0', success: '#52d1a4' },
  },
  sakura: {
    id: 'sakura',
    label: 'Sakura',
    description: 'Cherry blossom pink and soft plum',
    glyph: '❀',
    icon: '\uf004',
    meter: { fill: '●', empty: '○' },
    colors: {
      blocks: [
        { bg: '#ffd6e5', fg: '#4a1f33' },
        { bg: '#ffb3cc', fg: '#4a1f33' },
        { bg: '#f28ab2', fg: '#2b0f1d' },
        { bg: '#b04a7a', fg: '#ffffff' },
        { bg: '#7a4161', fg: '#ffe4ef' },
        { bg: '#3d2433', fg: '#ffb3cc' },
      ],
      pulse: '#fff0f5',
      warn: { bg: '#ffe29a', fg: '#3d2433' },
      danger: { bg: '#ff5c7a', fg: '#1a0509' },
    },
    spinner: {
      words: ['Blossoming', 'Drifting', 'Steeping tea', 'Daydreaming', 'Fluttering', 'Unfolding', 'Gardening', 'Humming'],
      byMode: { thinking: 'Meditating' },
      suffix: ' ❀',
    },
    turn: { words: ['Bloomed', 'Petals fell', 'Done'], joiner: 'in' },
    chat: { border: '#7a4161', user: '#bde0fe', assistant: '#ffb3cc', muted: '#9a8c98', success: '#b9fbc0' },
  },
  forest: {
    id: 'forest',
    label: 'Forest',
    description: 'Moss green and bark brown, woodland',
    glyph: '♣',
    icon: '\uf1bb',
    meter: { fill: '■', empty: '□' },
    colors: {
      blocks: [
        { bg: '#c5e17a', fg: '#1b2a12' },
        { bg: '#8fbc5a', fg: '#14200c' },
        { bg: '#4f7942', fg: '#ffffff' },
        { bg: '#6b4f3a', fg: '#f2e8cf' },
        { bg: '#4a3528', fg: '#e9d8a6' },
        { bg: '#2b1f17', fg: '#a7c957' },
      ],
      pulse: '#e6f5b8',
      warn: { bg: '#e9c46a', fg: '#2b1f17' },
      danger: { bg: '#e76f51', fg: '#1b0a05' },
    },
    spinner: {
      words: ['Growing', 'Rooting', 'Branching', 'Sprouting', 'Foraging', 'Rustling', 'Composting', 'Wandering'],
      byMode: { thinking: 'Taking root' },
    },
    turn: { words: ['Grown', 'Harvested', 'Rooted'], joiner: 'in' },
    chat: { border: '#4f7942', user: '#e9d8a6', assistant: '#c5e17a', muted: '#8a8a6e', success: '#a7c957' },
  },
  arctic: {
    id: 'arctic',
    label: 'Arctic',
    description: 'Ice blue and frost, calm and cold',
    glyph: '❄',
    icon: '\uf2dc',
    meter: { fill: '━', empty: '─' },
    colors: {
      blocks: [
        { bg: '#88c0d0', fg: '#2e3440' },
        { bg: '#81a1c1', fg: '#2e3440' },
        { bg: '#4e6f9a', fg: '#ffffff' },
        { bg: '#4c566a', fg: '#eceff4' },
        { bg: '#434c5e', fg: '#d8dee9' },
        { bg: '#3b4252', fg: '#a3be8c' },
      ],
      pulse: '#c8e6ef',
      warn: { bg: '#ebcb8b', fg: '#2e3440' },
      danger: { bg: '#ef8a92', fg: '#2e3440' },
    },
    spinner: {
      words: ['Freezing', 'Drifting', 'Crystallizing', 'Gliding', 'Frosting', 'Sledding', 'Thawing', 'Snowing'],
      byMode: { thinking: 'Contemplating' },
      suffix: ' ❄',
    },
    turn: { words: ['Frozen', 'Settled', 'Chilled'], joiner: 'in' },
    chat: { border: '#4c566a', user: '#a3be8c', assistant: '#88c0d0', muted: '#7b88a1', success: '#a3be8c' },
  },
  lava: {
    id: 'lava',
    label: 'Lava',
    description: 'Molten orange on black rock, volcanic',
    glyph: '▲',
    icon: '\uf06d',
    meter: { fill: '█', empty: '░' },
    colors: {
      blocks: [
        { bg: '#ffea00', fg: '#1a0a00' },
        { bg: '#ffb703', fg: '#1a0a00' },
        { bg: '#fb8500', fg: '#1a0a00' },
        { bg: '#d00000', fg: '#ffffff' },
        { bg: '#6a040f', fg: '#ffd6a5' },
        { bg: '#1c1c1c', fg: '#fb8500' },
      ],
      pulse: '#fff59d',
      warn: { bg: '#fff3b0', fg: '#6a040f' },
      danger: { bg: '#ffffff', fg: '#d00000' },
    },
    spinner: {
      words: ['Erupting', 'Smelting', 'Forging', 'Melting', 'Rumbling', 'Igniting', 'Scorching', 'Bubbling'],
      byMode: { thinking: 'Simmering' },
      suffix: ' ▲',
    },
    turn: { words: ['Erupted', 'Forged', 'Cooled'], joiner: 'in' },
    chat: { border: '#6a040f', user: '#ffb703', assistant: '#fb8500', muted: '#8d7b6a', success: '#95d5b2' },
  },
  candy: {
    id: 'candy',
    label: 'Candy',
    description: 'Pastel rainbow, sweet and playful',
    glyph: '✿',
    icon: '\uf1fd',
    meter: { fill: '●', empty: '○' },
    colors: {
      blocks: [
        { bg: '#ff99c8', fg: '#2b0f1d' },
        { bg: '#fcf6bd', fg: '#3a3510' },
        { bg: '#d0f4de', fg: '#0f2b1a' },
        { bg: '#a9def9', fg: '#0f1f2b' },
        { bg: '#e4c1f9', fg: '#2a0f3a' },
        { bg: '#3a2e4d', fg: '#ff99c8' },
      ],
      pulse: '#ffd6ea',
      warn: { bg: '#ffd166', fg: '#2b1d0e' },
      danger: { bg: '#ff595e', fg: '#1a0505' },
    },
    spinner: {
      words: ['Sprinkling', 'Swirling', 'Frosting', 'Baking', 'Bubbling', 'Fizzing', 'Twirling', 'Unwrapping'],
      byMode: { thinking: 'Daydreaming' },
      suffix: ' ✿',
    },
    turn: { words: ['Sweet', 'Served', 'Sprinkled'], joiner: 'in' },
    chat: { border: '#6b5b8a', user: '#a9def9', assistant: '#ff99c8', muted: '#9a8cb0', success: '#b9fbc0' },
  },
}

export const SKIN_IDS = Object.keys(SKINS) as SkinId[]

export const DEFAULT_SKIN: SkinId = 'midnight'

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
