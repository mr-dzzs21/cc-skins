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

/** The person's choices beyond what the bar shows; each feature reads its own. */
export type Prefs = {
  /** Toast once a limit window or the context reaches this percent (and again at 95); 0 never. */
  alertAt: number
  /** A compact block in the bar once the context is that full, between turns. */
  compactButton: boolean
  /** What the line closing a turn adds after its duration. */
  turnCost: boolean
  turnTokens: boolean
  turnTools: boolean
  /** A sound when a turn ends, after `notifyAfterSec`. */
  sound: boolean
  /** Which: `skin` for the skin's own, else a sound's name. */
  soundName: string
  /** Its loudness, as `$.audio.play` takes a gain. */
  soundGain: number
  /** A system notification when a turn ends, after `notifyAfterSec`. */
  notify: boolean
  /** How long a turn must run before it sounds or notifies. */
  notifyAfterSec: number
}

/** One finished main-thread turn: what the line closing it may add. */
export type TurnStat = {
  durationMs: number
  /** Every token its requests read and wrote, the cache's included. */
  tokens: number | null
  tools: number
  /** What it cost: the session's cost after it less before it; null until measured. */
  costUsd: number | null
  /** The session's cost as it started, to measure from. */
  costAtStart: number | null
}

/** The sounds cc-skins ships, in `sounds/`. */
export type SoundName = 'bell' | 'chime' | 'beep' | 'blip' | 'gong' | 'pop'

/** One measurement, for the dashboard's trends. */
export type UsagePoint = { at: number; contextPercent: number | null; costUsd: number | null }

/** One row of the context's breakdown, as /context lists it; `color` a theme key. */
export type ContextRow = { name: string; tokens: number; color: string }

export type ContextBreakdown = { rows: ContextRow[]; totalTokens: number; maxTokens: number }

/** The settings pane's tabs. */
export type SettingsTab = 'bar' | 'look' | 'alerts' | 'turn' | 'sound'

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
      prefs: Prefs
      /** The session's finished turns, newest last. */
      turnStats: TurnStat[]
      /** The session's measurements, oldest first, for the dashboard. */
      history: UsagePoint[]
      /** Whether a main-thread turn runs now. */
      isBusy: boolean
      /** The context's breakdown as the dashboard last read it; null until then. */
      breakdown: ContextBreakdown | null
      settingsTab: SettingsTab
      /** The level each unit (context, a limit window) was last alerted at; 0 once it drops back. */
      alerted: Record<string, number>
      now: number
      frame: number
    }
  }
}
