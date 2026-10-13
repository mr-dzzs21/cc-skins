export type SkinId =
  | 'midnight'
  | 'ring'
  | 'neon'
  | 'retro'
  | 'minimal'
  | 'synthwave'
  | 'ocean'
  | 'sakura'
  | 'forest'
  | 'arctic'
  | 'lava'
  | 'candy'
  | 'obsidian'
  | 'vampire'
  | 'abyss'
  | 'emerald'
  | 'noir'
  | 'ember'
  | 'nebula'
  | 'aurora'

/** `nerd`: powerline arrows and icons (Nerd Font); `plain`: any monospace font. */
export type Glyphs = 'nerd' | 'plain'

/** The band above the prompt: colored powerline blocks, or a quiet header line. */
export type BarStyle = 'powerline' | 'header'

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  model: string | null
  contextPercent: number | null
  contextTokens: number | null
  rateLimits: RateLimit[]
  costUsd: number | null
  /** When the session's figures count from, in `$.clock.now()` milliseconds. */
  startedAt: number | null
}

/** A prompt as submitted, so its card can show when. */
export type SentPrompt = { text: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'cc-skins': {
      skin: SkinId
      glyphs: Glyphs
      barStyle: BarStyle
      /** The skin under the picker's focus ring, drawn in place of `skin` while the picker is open. */
      preview: SkinId | null
      isChatStyled: boolean
      usage: Usage
      /** The checked-out branch of the session's repository; null outside one. */
      branch: string | null
      prompts: SentPrompt[]
      isHudHidden: boolean
      now: number
      frame: number
    }
  }
}
