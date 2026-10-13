export type SkinId = 'retro' | 'neon' | 'minimal' | 'ring'

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
      usage: Usage
      isHudHidden: boolean
      now: number
    }
  }
}
