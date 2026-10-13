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

/** What the bar can show; each is the person's to turn off in the bar's settings. */
export type BarItem =
  | 'skinName'
  | 'model'
  | 'effort'
  | 'branch'
  | 'context'
  | 'fiveHour'
  | 'sevenDay'
  | 'cost'
  | 'meters'
  | 'resets'
  | 'gear'

/**
 * The model choices the `/config` Model row offers, the one set, and the
 * model each alias is known to name (the running one, and those picks showed).
 */
export type ModelChoice = { value: string; options: string[]; resolved: Record<string, string> }

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
      /** What the person turned off in the bar. */
      hidden: BarItem[]
      /** The main thread's effort as its last request asked it; null until one did. */
      effort: string | null
      /** The Model row, read as the model picker opens and after a pick. */
      modelChoice: ModelChoice
      now: number
      frame: number
    }
  }
}
