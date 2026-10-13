export type SkinId = 'retro' | 'neon' | 'minimal' | 'ring'

/** `nerd`: powerline arrows and icons (Nerd Font); `plain`: any monospace font. */
export type Glyphs = 'nerd' | 'plain'

export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }

export type Usage = {
  model: string | null
  contextPercent: number | null
  rateLimits: RateLimit[]
  costUsd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'cc-skins': {
      skin: SkinId
      glyphs: Glyphs
      usage: Usage
      isHudHidden: boolean
      now: number
      frame: number
    }
  }
}
