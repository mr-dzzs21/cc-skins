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
  | 'paper'
  | 'latte'
  | 'sky'
  | 'mint'
  | 'peach'
  | 'snow'

/**
 * `nerd`: powerline arrows and icons (a Nerd Font); `powerline`: the arrows
 * and the branch mark with short words for the icons (a font with Powerline
 * symbols, as Cascadia Code has); `plain`: any monospace font.
 */
export type Glyphs = 'nerd' | 'powerline' | 'plain'

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
  /** Whether the bar's pieces open what they show (the ⚙ always does). */
  clickable: boolean
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
  /** Whether it carries the answer's first line (cleaned); off, only how long the turn took. */
  notifyPreview: boolean
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

/**
 * A skin the person built: a name, a built-in skin it starts from (its words,
 * icon and sound), an accent color and a style. The rest is computed from
 * these, so a recipe is all that is kept and shared.
 */
export type CustomSkin = {
  id: string
  label: string
  base: SkinId
  accent: string
  style: 'dark' | 'vivid' | 'light'
}

/** One changed file, as `git status --porcelain` lists it: its two-letter code and its path. */
export type ChangedFile = { code: string; path: string }

/** The repository's state as the changes pane shows it. */
export type GitChanges = {
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  files: ChangedFile[]
  added: number
  removed: number
}

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
      /** A built-in skin's id or one the person built. */
      skin: string
      glyphs: Glyphs
      barStyle: BarStyle
      /** The skin under the picker's focus ring, drawn in place of `skin` while the picker is open. */
      preview: string | null
      /** The skin a first press in the picker armed: a second press of it picks it. */
      armed: string | null
      isChatStyled: boolean
      usage: Usage
      /** The checked-out branch of the session's repository; null outside one. */
      branch: string | null
      prompts: SentPrompt[]
      /** When each prompt row was kept, by the row's id. */
      sentById: Record<string, number>
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
      /** The skins the person built, in the order they were made. */
      customSkins: CustomSkin[]
      /** The skin the builder holds while it is open. */
      draft: CustomSkin | null
      /** The repository's changes as the changes pane last read them, or why it could not. */
      gitChanges: GitChanges | null
      gitError: string | null
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
