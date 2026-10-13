export type SkinId = 'midnight' | 'ring' | 'neon' | 'retro' | 'minimal'

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
      isChatStyled: boolean
      usage: Usage
      prompts: SentPrompt[]
      isHudHidden: boolean
      now: number
      frame: number
    }
  }
}
