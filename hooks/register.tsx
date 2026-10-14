import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage, Timer, UiOpenResult } from 'claude-code'

import type {
  BarItem,
  BarStyle,
  BuilderTab,
  ColorPart,
  ContextBreakdown,
  Glyphs,
  ModelChoice,
  Prefs,
  SentPrompt,
  SettingsTab,
  CustomSkin,
  GitChanges,
  SkinId,
  SoundName,
  TurnStat,
  Usage,
  UsagePoint,
} from '../types'
import {
  IDLE_HINT,
  drawAssistantBlock,
  drawCard,
  drawModeBadges,
  drawPlanCard,
  drawUserCard,
  sentAt,
  todosOf,
} from './chat'
import { formatDuration, prettyModel } from './format'
import { drawBar, drawPowerline, turnPills } from './hud'
import type { BarPress } from './hud'
import {
  BAR_ITEMS,
  DEFAULT_HIDDEN,
  MODEL_PANE,
  SETTINGS_PANE,
  barItemNamed,
  drawModelPicker,
  hiddenFrom,
  isBarItem,
  modelLabel,
  modelPaneRows,
} from './panels'
import type { EffortChoice } from './panels'
import { alertsFor, compactAt } from './alerts'
import { DEFAULT_PREFS, readPrefs } from './prefs'
import { SETTINGS_ROWS, drawSettings, isSettingsTab } from './settings'
import { MAX_TURN_STATS, findTurnStat, turnStatText } from './turns'
import { isStale, mergeLimits, parseUsageText } from './limits'
import type { LimitReading } from './limits'
import { finishedText, isSoundName, soundAsset, soundFor } from './sounds'
import { DASHBOARD, DASHBOARD_COLUMNS, DASHBOARD_ROWS, MAX_HISTORY, drawDashboard } from './dashboard'
import { GIT_PANE, GIT_ROWS, GIT_SHORTSTAT, GIT_STATUS, drawChanges, isBranchName, parseStatus } from './git'
import { PICKER, PICKER_COLUMNS, drawPicker, pickerRowOf, pickerRows } from './picker'
import { BUILDER, BUILDER_COLUMNS, BUILDER_ROWS, drawBuilder } from './builder'
import { COLOR_PARTS, MAX_CUSTOM_SKINS, colorPartNamed, isKnownSkin, parseRecipe, resolveSkin, skinEntries, slugFor, themeName } from './custom'
import { parseColor } from './color'
import { MIN_CLAUDE_CODE, ISSUES, doctorReport, isOlder, tooOldText } from './doctor'
import type { DoctorFacts } from './doctor'
import { cleanLine, stripControls } from './text'
import { DEFAULT_SKIN, SKINS, isSkinId, pick } from './skins'

const EMPTY_USAGE: Usage = {
  model: null,
  contextPercent: null,
  contextTokens: null,
  rateLimits: [],
  costUsd: null,
  startedAt: null,
}
const NO_PROMPTS: SentPrompt[] = []

const skinAtom = atom({ plugin: 'cc-skins', key: 'skin' } as const, DEFAULT_SKIN as string)
/** The skins the person built, and the one the builder holds while open. */
const customSkinsAtom = atom({ plugin: 'cc-skins', key: 'customSkins' } as const, [] as CustomSkin[])
const draftAtom = atom({ plugin: 'cc-skins', key: 'draft' } as const, null as CustomSkin | null)
const builderTabAtom = atom({ plugin: 'cc-skins', key: 'builderTab' } as const, 'basics' as BuilderTab)
const glyphsAtom = atom({ plugin: 'cc-skins', key: 'glyphs' } as const, 'nerd' as Glyphs)
const barStyleAtom = atom({ plugin: 'cc-skins', key: 'barStyle' } as const, 'powerline' as BarStyle)
/** The skin the picker's focus rests on; the bar draws it until the picker closes. */
const previewAtom = atom({ plugin: 'cc-skins', key: 'preview' } as const, null as string | null)
/** The skin a first press armed; a second press of it picks it. */
const armedAtom = atom({ plugin: 'cc-skins', key: 'armed' } as const, null as string | null)
const isChatStyledAtom = atom({ plugin: 'cc-skins', key: 'isChatStyled' } as const, true)
/** The prompts sent this session, newest last, so a card can say when. */
const promptsAtom = atom({ plugin: 'cc-skins', key: 'prompts' } as const, NO_PROMPTS)
const sentByIdAtom = atom({ plugin: 'cc-skins', key: 'sentById' } as const, {} as Record<string, number>)
const branchAtom = atom({ plugin: 'cc-skins', key: 'branch' } as const, null as string | null)
const usageAtom = atom({ plugin: 'cc-skins', key: 'usage' } as const, EMPTY_USAGE)
const isHudHiddenAtom = atom({ plugin: 'cc-skins', key: 'isHudHidden' } as const, false)
/** What the person turned off in the bar. */
const hiddenAtom = atom({ plugin: 'cc-skins', key: 'hidden' } as const, [...DEFAULT_HIDDEN] as BarItem[])
/** The main thread's effort, as its last request asked it. */
const effortAtom = atom({ plugin: 'cc-skins', key: 'effort' } as const, null as string | null)
/** The person's choices beyond the bar's items, the settings tab open, the alerts already raised. */
const prefsAtom = atom({ plugin: 'cc-skins', key: 'prefs' } as const, DEFAULT_PREFS)
const settingsTabAtom = atom({ plugin: 'cc-skins', key: 'settingsTab' } as const, 'bar' as SettingsTab)
const alertedAtom = atom({ plugin: 'cc-skins', key: 'alerted' } as const, {} as Record<string, number>)
const turnStatsAtom = atom({ plugin: 'cc-skins', key: 'turnStats' } as const, [] as TurnStat[])
const historyAtom = atom({ plugin: 'cc-skins', key: 'history' } as const, [] as UsagePoint[])
const breakdownAtom = atom({ plugin: 'cc-skins', key: 'breakdown' } as const, null as ContextBreakdown | null)
const busyAtom = atom({ plugin: 'cc-skins', key: 'isBusy' } as const, false)
const limitsAtAtom = atom({ plugin: 'cc-skins', key: 'limitsAt' } as const, null as number | null)
const gitChangesAtom = atom({ plugin: 'cc-skins', key: 'gitChanges' } as const, null as GitChanges | null)
const versionAtom = atom({ plugin: 'cc-skins', key: 'version' } as const, null as string | null)
const gitErrorAtom = atom({ plugin: 'cc-skins', key: 'gitError' } as const, null as string | null)
/** The Model row, as the model picker shows it. */
const modelChoiceAtom = atom(
  { plugin: 'cc-skins', key: 'modelChoice' } as const,
  { value: '', options: [], resolved: {} } as ModelChoice,
)
/** The clock the HUD's reset countdowns read; ticked once a minute. */
const nowAtom = atom({ plugin: 'cc-skins', key: 'now' } as const, 0)
/** The bar's animation frame, advanced while a turn runs. */
const frameAtom = atom({ plugin: 'cc-skins', key: 'frame' } as const, 0)

/** `$.store` keys: what outlives the session. */
const STORE = {
  skin: 'skin',
  glyphs: 'glyphs',
  barStyle: 'barStyle',
  isChatStyled: 'isChatStyled',
  isHudHidden: 'isHudHidden',
  hidden: 'barHidden',
  /** The bar items there were when `hidden` was saved, so an item added since keeps its default. */
  known: 'barItemsKnown',
  models: 'aliasModels',
  prefs: 'prefs',
  limits: 'limitReading',
  customSkins: 'customSkins',
  hasWelcomed: 'hasWelcomed',
} as const

const COMMAND = 'skin'

/** What `/skin` answers when something in it failed: the engine has skipped it, so say so plainly. */
const COMMAND_FAILED = `Something went wrong in cc-skins. /${COMMAND} doctor shows what it sees; if it keeps happening, please report it: ${ISSUES}`

/** An environment variable's value as read, or null where it is unset or unreadable. */
const envValue = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null)

/** What `/skin doctor` reports, read fresh. */
const readDoctorFacts = async ($: EngineInterface): Promise<DoctorFacts> => {
  const usage = await read($, usageAtom)
  const limitsAt = await read($, limitsAtAtom)
  const now = await $.clock.now().catch(() => Date.now())
  const hidden = await read($, hiddenAtom)
  const skin = await read($, skinAtom)
  const isStoreOk = await $.store.get(STORE.skin).then(
    () => true,
    () => false,
  )
  // each variable named as it is, so the validator lists what the plugin reads
  const os = await $.env.get('OS').then(envValue, () => null)
  const termProgram = await $.env.get('TERM_PROGRAM').then(envValue, () => null)
  const windowsTerminal = (await $.env.get('WT_SESSION').then(envValue, () => null)) === null ? null : 'Windows Terminal'
  const colorTerm = await $.env.get('COLORTERM').then(envValue, () => null)

  return {
    claudeCode: await read($, versionAtom),
    os: os === 'Windows_NT' ? 'Windows' : null,
    terminal: termProgram ?? windowsTerminal,
    colorTerm,
    skin,
    isOwnSkin: !isSkinId(skin),
    glyphs: await read($, glyphsAtom),
    barStyle: await read($, barStyleAtom),
    isChatStyled: await read($, isChatStyledAtom),
    isHudHidden: await read($, isHudHiddenAtom),
    hidden,
    model: usage.model === null ? null : prettyModel(usage.model),
    contextPercent: usage.contextPercent,
    limitsAgeMin: limitsAt === null ? null : Math.max(0, Math.round((now - limitsAt) / 60_000)),
    costUsd: usage.costUsd,
    branch: await read($, branchAtom),
    isGitStatusOn: !hidden.includes('gitStatus'),
    gitError: await read($, gitErrorAtom),
    isStoreOk,
  }
}

/** A stored choice, or undefined where the store would not answer: the defaults then stand. */
const recall = async ($: EngineInterface, key: string): Promise<unknown> => {
  try {
    return await $.store.get(key)
  } catch {
    return undefined
  }
}

/** Keeps a choice; where the store would not take it, the choice still holds for this session. */
const keep = async ($: EngineInterface, key: string, value: Parameters<EngineInterface['store']['set']>[1]) => {
  try {
    await $.store.set(key, value)
  } catch {
    // Nothing to undo: the session goes on with it, the next one starts from what was kept.
  }
}


/** What a command answers when its pane could not show: nothing once it shows, else why not and what does the same. */
const unplaced = (opened: UiOpenResult, what: string, instead = ''): { text?: string } => {
  if (opened.isPlaced) {
    return {}
  }
  const why = /no.surface/i.test(opened.reason) ? 'opens in the interactive terminal' : 'needs a wider terminal'

  return { text: `${what} ${why}${instead === '' ? '.' : `: ${instead}`}` }
}
const TICK_MS = 60_000
const FRAME_MS = 150
const MAX_PROMPTS = 200

const isGlyphs = (value: unknown): value is Glyphs => value === 'nerd' || value === 'powerline' || value === 'plain'
const isBarStyle = (value: unknown): value is BarStyle => value === 'powerline' || value === 'header'

/** The figures a measurement carries; `startedAt` only `$.session.usage()` has, so it stays otherwise. */
const toUsage = (
  model: string | null,
  usage: Omit<SessionUsage, 'startedAt'> & { startedAt?: number },
  previous: Usage,
): Usage => ({
  model,
  contextPercent: usage.context.percent ?? null,
  contextTokens: usage.context.tokens ?? null,
  rateLimits: usage.rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt })),
  costUsd: usage.cost?.usd ?? null,
  startedAt: usage.startedAt ?? previous.startedAt,
})

const readModel = async ($: EngineInterface): Promise<string | null> => {
  try {
    return await $.session.model()
  } catch {
    return null
  }
}

const HEAD_REF = 'ref: refs/heads/'

/** The most a `.git` pointer or a HEAD may weigh; a real one is a line. */
const MAX_POINTER_BYTES = 512

/**
 * The checked-out branch, read from the repository's HEAD (a worktree's `.git`
 * file points at its own); a detached HEAD reads as its short hash.
 */
const readBranch = async ($: EngineInterface): Promise<string | null> => {
  try {
    const repo = await $.session.repo()
    if (repo === null) {
      return null
    }
    let gitDir = `${repo.root}/.git`
    const dotGit = await $.fs.stat(gitDir)
    if (dotGit.isLink || (dotGit.kind !== 'file' && dotGit.kind !== 'dir')) {
      return null
    }
    if (dotGit.kind === 'file') {
      if (dotGit.size > MAX_POINTER_BYTES) {
        return null
      }
      const pointer = /^gitdir: (.+)$/.exec(((await $.fs.read(gitDir)).split('\n')[0] ?? '').trim())?.[1]?.trim()
      if (pointer === undefined || pointer === '') {
        return null
      }
      gitDir = /^([A-Za-z]:)?[\\/]/.test(pointer) ? pointer : `${repo.root}/${pointer}`
    }
    const headPath = `${gitDir}/HEAD`
    const head = await $.fs.stat(headPath)
    if (head.kind !== 'file' || head.isLink || head.size > MAX_POINTER_BYTES) {
      return null
    }
    const line = ((await $.fs.read(headPath)).split('\n')[0] ?? '').trim()
    if (line.startsWith(HEAD_REF)) {
      const name = line.slice(HEAD_REF.length)

      return isBranchName(name) ? name : null
    }

    return /^[0-9a-f]{7,64}$/.test(line) ? line.slice(0, 7) : null
  } catch {
    return null
  }
}

const refreshBranch = async ($: EngineInterface) => {
  const branch = await readBranch($)
  await update($, branchAtom, () => branch)
}

/** Moves the HUD's clock to now, so its reset countdowns redraw, and takes a fresher limit reading another session left. */
const tick = async ($: EngineInterface) => {
  const now = await $.clock.now()
  await update($, nowAtom, () => now)
  await adoptSharedLimits($)
}

/** Keeps a fresh limit reading, for this session's bar and for the other sessions on this machine. */
const keepLimits = async ($: EngineInterface, reading: LimitReading) => {
  await update($, usageAtom, usage => ({ ...usage, rateLimits: mergeLimits(usage.rateLimits, reading.rateLimits) }))
  await update($, limitsAtAtom, () => reading.at)
  await keep($, STORE.limits, reading)
}

/** Takes the limit reading another session on this machine stored, where it is newer than this one's. */
const adoptSharedLimits = async ($: EngineInterface) => {
  try {
    const shared = (await recall($, STORE.limits)) as LimitReading | undefined
    if (shared === undefined || !Array.isArray(shared.rateLimits) || typeof shared.at !== 'number') {
      return
    }
    if (shared.at > ((await read($, limitsAtAtom)) ?? 0)) {
      await update($, usageAtom, usage => ({ ...usage, rateLimits: mergeLimits(usage.rateLimits, shared.rateLimits) }))
      await update($, limitsAtAtom, () => shared.at)
    }
  } catch {
    // The next tick tries again.
  }
}

/**
 * Reads the limits live, as /usage reads them from the server (its answer
 * shows in the transcript too), and puts them in the bar. Run apart from the
 * hook that asked, which a command may not wait on.
 */
const fetchLiveLimits = async ($: EngineInterface) => {
  try {
    const { text = '' } = await $.command.run({ command: 'usage' })
    const now = await $.clock.now()
    const rateLimits = parseUsageText(text, now)
    if (rateLimits.length === 0) {
      $.ui.toast('/usage gave no limit figures: a plan without limits, or its wording changed')

      return
    }
    await keepLimits($, { rateLimits, at: now })
    await raiseAlerts($)
    $.ui.toast(`Live limits: ${rateLimits.map(limit => `${limit.kind === 'five_hour' ? '5h' : '7d'} ${Math.round(limit.percentUsed)}%`).join(' · ')}`)
  } catch {
    $.ui.toast('Live limits need an idle session: try again once Claude is done')
  }
}

const refreshLimits = ($: EngineInterface) => {
  $.clock.after(0, () => void fetchLiveLimits($))
}

/**
 * Switches the skin and keeps it for later sessions. The color theme is the
 * person's to pick: the theme row takes only presets from a plugin, so /theme
 * is named instead.
 */
const applySkin = async ($: EngineInterface, id: string): Promise<string> => {
  await update($, skinAtom, () => id)
  await keep($, STORE.skin, id)
  const skin = resolveSkin(id, await read($, customSkinsAtom))
  const theme = themeName(id)

  return [
    `Skin → ${skin.label}: ${skin.description}.`,
    theme === undefined ? 'Your own skin draws the bar and the chat; /theme keeps its theme.' : `Colors: run /theme and pick "${theme}".`,
  ].join('\n')
}

/** The skin in use, built-in or the person's own. */
const currentSkin = async ($: EngineInterface) => resolveSkin(await read($, skinAtom), await read($, customSkinsAtom))

/** Opens the skin picker with the keyboard in it: ↑↓ previews, Enter or a hotkey picks, Escape closes. */
const openPicker = async ($: EngineInterface) => {
  await update($, armedAtom, () => null)

  return $.ui.open({
    id: PICKER,
    title: 'Pick a skin',
    focus: true,
    closeOnEscape: true,
    rows: pickerRows(skinEntries(await read($, customSkinsAtom))),
    columns: PICKER_COLUMNS,
  })
}

/**
 * A press on a skin's row (a click, its key, Enter): the first previews it
 * and arms it, the next press of the same skin picks it. The mouse has no
 * hover a plugin hears of, so a click is how it previews.
 */
const pressSkin = async ($: EngineInterface, id: string) => {
  if ((await read($, armedAtom)) === id) {
    await update($, armedAtom, () => null)
    await chooseSkin($, id)

    return
  }
  await update($, armedAtom, () => id)
  await update($, previewAtom, () => id)
  await $.ui.focus({ requestId: PICKER, key: id }).catch(() => undefined)
}

/** A pick in the picker: switch, close it, and say so in a toast, since no command line shows it. */
const chooseSkin = async ($: EngineInterface, id: string) => {
  await applySkin($, id)
  await update($, previewAtom, () => null)
  await update($, armedAtom, () => null)
  await $.ui.close({ id: PICKER })
  const theme = themeName(id)
  const label = resolveSkin(id, await read($, customSkinsAtom)).label
  $.ui.toast(theme === undefined ? `Skin → ${label}` : `Skin → ${label} · matching colors: /theme → "${theme}"`)
}

/** What a preview draws besides its skin: this session's bar, sized for the pane. */
const readSample = async ($: EngineInterface, columns: number, isRoomy: boolean) => {
  const now = await read($, nowAtom)

  return {
    bar: {
      usage: await read($, usageAtom),
      branch: await read($, branchAtom),
      now,
      glyphs: await read($, glyphsAtom),
      isWorking: false,
      frame: 0,
      hidden: await read($, hiddenAtom),
      effort: await read($, effortAtom),
      compactAt: null,
      warnColors: (await read($, prefsAtom)).warnColors,
      ...(await readBarExtras($)),
    },
    barStyle: await read($, barStyleAtom),
    columns,
    isRoomy,
    now,
  }
}

/** Keeps the person's own skins. */
const saveCustoms = async ($: EngineInterface, customs: CustomSkin[]) => {
  await update($, customSkinsAtom, () => customs)
  await keep($, STORE.customSkins, customs)
}

/** Opens the builder on a skin, a new one from the current or one of the person's own, at a tab. */
const openBuilder = async ($: EngineInterface, draft: CustomSkin, tab: BuilderTab = 'basics') => {
  await update($, draftAtom, () => draft)
  await update($, builderTabAtom, () => tab)

  return $.ui.open({
    id: BUILDER,
    title: draft.id === '' ? 'Build a skin' : `Edit ${draft.label}`,
    focus: true,
    closeOnEscape: true,
    rows: BUILDER_ROWS,
    columns: BUILDER_COLUMNS,
  })
}

/** A new draft from the skin in use, looking as it does: a built-in one's own colors, or a skin of one's own copied. */
const newDraft = async ($: EngineInterface, label: string): Promise<CustomSkin> => {
  const id = await read($, skinAtom)
  const custom = (await read($, customSkinsAtom)).find(one => one.id === id)
  const base: SkinId = custom?.base ?? (isSkinId(id) ? id : DEFAULT_SKIN)
  const draft: CustomSkin = {
    id: '',
    label: label === '' ? 'My skin' : label.slice(0, 32),
    base,
    accent: custom?.accent ?? SKINS[base].colors.blocks[0]?.bg ?? '#7aa2f7',
    style: custom?.style ?? 'base',
  }

  return custom?.colors === undefined ? draft : { ...draft, colors: { ...custom.colors } }
}

/** A recipe with one piece colored (a color) or given back to its style (none); no piece left, no colors at all. */
const withColor = (recipe: CustomSkin, part: ColorPart, color: string | undefined): CustomSkin => {
  const colors = { ...recipe.colors }
  if (color === undefined) {
    delete colors[part]
  } else {
    colors[part] = color
  }
  const { colors: _, ...rest } = recipe

  return Object.keys(colors).length === 0 ? rest : { ...rest, colors }
}

/** Colors a piece in the builder's draft, as typed: empty gives it back, anything else must be a color. */
const colorDraft = async ($: EngineInterface, part: ColorPart, typed: string) => {
  const color = typed.trim() === '' ? undefined : parseColor(typed)
  if (typed.trim() !== '' && color === undefined) {
    $.ui.toast(`"${cleanLine(typed).slice(0, 24)}" isn't a color I know: a name such as red or blau, or #rrggbb`)

    return
  }
  await update($, draftAtom, draft => (draft === null ? draft : withColor(draft, part, color)))
}

/**
 * `/skin color`: with nothing more, the builder on its Bar colors tab for the
 * skin in use; with a piece and a color, that piece colored at once; with a
 * piece and `reset`, that piece given back to its style. A built-in skin
 * stays as it is: the first color makes a skin of one's own from it, looking
 * the same but for that piece, and wears it.
 */
const recolor = async ($: EngineInterface, words: readonly string[]): Promise<{ text?: string }> => {
  const current = await read($, skinAtom)
  const customs = await read($, customSkinsAtom)
  const own = customs.find(one => one.id === current)
  const copyLabel = `My ${resolveSkin(current, customs).label}`.slice(0, 32)
  if (words.length === 0) {
    const opened = await openBuilder($, own ?? (await newDraft($, copyLabel)), 'bar')

    return unplaced(opened, 'The skin builder')
  }
  const pieces = COLOR_PARTS.map(({ part }) => part).join(', ')
  const last = words[words.length - 1] ?? ''
  const isReset = ['reset', 'default', 'none', 'off'].includes(last.toLowerCase())
  const color = isReset ? undefined : parseColor(last)
  const part = colorPartNamed(words.slice(0, -1).join(' '))
  if (part === undefined) {
    return { text: `Which piece? /${COMMAND} color <piece> <color>, as /${COMMAND} color clock red. The pieces: ${pieces}.` }
  }
  if (!isReset && color === undefined) {
    return { text: `"${cleanLine(last).slice(0, 24)}" isn't a color I know: a name such as red or blau, or #rrggbb (reset gives the piece back).` }
  }
  if (own === undefined && customs.length >= MAX_CUSTOM_SKINS) {
    return { text: `You keep ${MAX_CUSTOM_SKINS} skins at most: /${COMMAND} delete one first.` }
  }
  const recipe =
    own ?? { ...(await newDraft($, copyLabel)), id: slugFor(copyLabel, customs.map(one => one.id)), label: copyLabel }
  const next = withColor(recipe, part, color)
  await saveCustoms($, own === undefined ? [...customs, next] : customs.map(one => (one.id === next.id ? next : one)))
  if (own === undefined) {
    await applySkin($, next.id)
  }
  const label = COLOR_PARTS.find(one => one.part === part)?.label ?? part
  const made = own === undefined ? ` Built-in skins stay as they are, so this is ${next.label}, your own copy (/${COMMAND} ${next.id}).` : ''

  return { text: `${next.label}: ${label} ${color === undefined ? 'back to its style' : color}.${made}` }
}

const editDraft = async ($: EngineInterface, patch: Partial<CustomSkin>) =>
  update($, draftAtom, draft => (draft === null ? draft : { ...draft, ...patch }))

/** Saves the builder's skin among the person's own (a new one gets an id from its name), and wears it. */
const saveDraft = async ($: EngineInterface) => {
  const draft = await read($, draftAtom)
  if (draft === null) {
    return
  }
  const customs = await read($, customSkinsAtom)
  const isExisting = customs.some(one => one.id === draft.id)
  if (!isExisting && customs.length >= MAX_CUSTOM_SKINS) {
    $.ui.toast(`You keep ${MAX_CUSTOM_SKINS} skins at most: /skin delete one first`)

    return
  }
  const label = cleanLine(draft.label).slice(0, 32) || 'My skin'
  const recipe: CustomSkin = {
    ...draft,
    label,
    id: isExisting ? draft.id : slugFor(draft.label, customs.map(one => one.id)),
  }
  await saveCustoms($, isExisting ? customs.map(one => (one.id === recipe.id ? recipe : one)) : [...customs, recipe])
  await applySkin($, recipe.id)
  await update($, draftAtom, () => null)
  await $.ui.close({ id: BUILDER })
  $.ui.toast(`Saved ${recipe.label} · /skin ${recipe.id} wears it, /skin export ${recipe.id} shares it`)
}

/** Deletes one of the person's skins; wearing it, they go back to the default. */
const deleteCustom = async ($: EngineInterface, id: string) => {
  const customs = await read($, customSkinsAtom)
  if (!customs.some(one => one.id === id)) {
    return false
  }
  await saveCustoms($, customs.filter(one => one.id !== id))
  if ((await read($, skinAtom)) === id) {
    await applySkin($, DEFAULT_SKIN)
  }

  return true
}

/** Keeps the bar's style, its icons, the chat cards: in this session's state and for the next. */
const applyBarStyle = async ($: EngineInterface, style: BarStyle) => {
  await update($, barStyleAtom, () => style)
  await keep($, STORE.barStyle, style)
}

const applyGlyphs = async ($: EngineInterface, glyphs: Glyphs) => {
  await update($, glyphsAtom, () => glyphs)
  await keep($, STORE.glyphs, glyphs)
}

const applyChat = async ($: EngineInterface, isOn: boolean) => {
  await update($, isChatStyledAtom, () => isOn)
  await keep($, STORE.isChatStyled, isOn)
}

/** Shows or hides one thing in the bar, and keeps the choice. */
const showItem = async ($: EngineInterface, item: BarItem, isShown: boolean) => {
  const hidden = (await read($, hiddenAtom)).filter(one => one !== item)
  const next = isShown ? hidden : [...hidden, item]
  await update($, hiddenAtom, () => next)
  await keep($, STORE.hidden, next)
  await keep($, STORE.known, BAR_ITEMS.map(({ item: one }) => one))
  if (item === 'gitStatus' && isShown) {
    await readChanges($)
  }
}

/** Reads git's state for the bar, where the person shows it: after each reply, and as the session starts. */
const refreshGitStatus = async ($: EngineInterface) => {
  if (!(await read($, hiddenAtom)).includes('gitStatus')) {
    await readChanges($)
  }
}

/** What the bar's extras need beyond the usage: the version, and git's state as last read. */
const readBarExtras = async ($: EngineInterface) => {
  const changes = await read($, gitChangesAtom)

  return {
    version: await read($, versionAtom),
    git: changes === null ? null : { files: changes.files.length, ahead: changes.ahead, behind: changes.behind },
  }
}

const toggleItem = async ($: EngineInterface, item: BarItem) =>
  showItem($, item, (await read($, hiddenAtom)).includes(item))

/** The models picks have shown aliases to name, kept across sessions. */
const readLearnedModels = async ($: EngineInterface): Promise<Record<string, string>> => {
  const stored = await recall($, STORE.models)
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

/** The Model row: the aliases it offers, the one set, and the model each is known to name. */
const readModelChoice = async ($: EngineInterface): Promise<ModelChoice> => {
  const row = (await $.config.list()).find(one => one.key === 'model')
  const value = typeof row?.value === 'string' ? row.value : ''
  const running = await readModel($)

  return {
    value,
    options: [...(row?.options ?? [])],
    resolved: { ...(await readLearnedModels($)), ...(running !== null && value !== '' ? { [value]: running } : {}) },
  }
}

/** Opens the model and effort picker on the Model row as it stands. */
const openModelPicker = async ($: EngineInterface) => {
  const choice = await readModelChoice($)
  await update($, modelChoiceAtom, () => choice)

  return $.ui.open({
    id: MODEL_PANE,
    title: 'Model and effort',
    focus: true,
    closeOnEscape: true,
    rows: modelPaneRows(choice),
  })
}

/** Sets the model as the Model row does (saved as the default); the effort shows again with the next request. */
const pickModel = async ($: EngineInterface, value: string) => {
  const { deny } = await $.config.set({ key: 'model', value })
  if (deny !== undefined) {
    $.ui.toast(`Model stays: ${deny}`)

    return
  }
  const model = await readModel($)
  if (model !== null) {
    await keep($, STORE.models, { ...(await readLearnedModels($)), [value]: model })
  }
  await update($, modelChoiceAtom, choice => ({
    ...choice,
    value,
    resolved: model === null ? choice.resolved : { ...choice.resolved, [value]: model },
  }))
  await update($, usageAtom, usage => ({ ...usage, model }))
  await update($, effortAtom, () => null)
  $.ui.toast(`Model → ${modelLabel(value, model ?? undefined)}`)
}

/** Sets this session's effort through `/effort`, which says so in the transcript. */
const pickEffort = async ($: EngineInterface, level: EffortChoice) => {
  try {
    await $.command.run({ command: 'effort', args: level })
  } catch {
    $.ui.toast(`Effort stays: /effort ${level} can't run right now`)

    return
  }
  await update($, effortAtom, () => (level === 'auto' ? null : level))
}

const openSettings = ($: EngineInterface) =>
  $.ui.open({ id: SETTINGS_PANE, title: 'Settings', focus: true, closeOnEscape: true, rows: SETTINGS_ROWS })

/** Changes some of the person's choices, and keeps them. */
const setPrefs = async ($: EngineInterface, patch: Partial<Prefs>) => {
  const prefs = { ...(await read($, prefsAtom)), ...patch }
  await update($, prefsAtom, () => prefs)
  await keep($, STORE.prefs, prefs)
}

/** Where the bar offers to compact, by the person's choices; null with the button off. */
const readCompactAt = async ($: EngineInterface) => {
  const prefs = await read($, prefsAtom)

  return prefs.compactButton ? compactAt(prefs.alertAt) : null
}

/** Compacts the conversation as /compact does (a veto says why in its own line); between turns only. */
const compactNow = async ($: EngineInterface) => {
  try {
    await $.session.compact()
  } catch {
    $.ui.toast('Compacting waits until Claude is done')
  }
}

/** Plays a sound, or the skin's own; a sound that can't play stays quiet. */
const playSound = async ($: EngineInterface, name: SoundName | 'skin', gain: number) => {
  const sound = isSoundName(name) ? name : (await currentSkin($)).sound
  void $.audio.play({ asset: soundAsset(sound) }, { gain }).catch(() => undefined)
}

/** When a long enough turn ends: the sound and the notification the person turned on. */
const announceTurn = async ($: EngineInterface, durationMs: number, answer: string) => {
  const prefs = await read($, prefsAtom)
  if ((!prefs.sound && !prefs.notify) || durationMs < prefs.notifyAfterSec * 1000) {
    return
  }
  const skin = (await currentSkin($))
  if (prefs.sound) {
    void $.audio.play({ asset: soundAsset(soundFor(skin, prefs)) }, { gain: prefs.soundGain }).catch(() => undefined)
  }
  if (prefs.notify) {
    const word = skin.turn.words[0] ?? 'Done'
    void $.ui.notify(finishedText(word, formatDuration(durationMs), answer, prefs.notifyPreview), { title: 'Claude is done' }).catch(() => undefined)
  }
}

/** Reads the context's breakdown as /context counts it (estimated locally, so it costs nothing). */
const readBreakdown = async ($: EngineInterface) => {
  try {
    const { context } = await $.session.usage({ breakdown: 'summary', columns: DASHBOARD_COLUMNS })
    const breakdown = context.breakdown
    if (breakdown === undefined) {
      return
    }
    const next: ContextBreakdown = {
      rows: breakdown.categories
        .filter(category => !category.isDeferred && category.tokens > 0)
        .map(({ name, tokens, color }) => ({ name, tokens, color })),
      totalTokens: breakdown.totalTokens,
      maxTokens: breakdown.maxTokens,
    }
    await update($, breakdownAtom, () => next)
  } catch {
    // The dashboard goes on without the breakdown.
  }
}

/** Opens the usage dashboard, its breakdown read fresh. */
const openDashboard = async ($: EngineInterface) => {
  await readBreakdown($)

  return $.ui.open({
    id: DASHBOARD,
    title: 'Usage',
    focus: true,
    closeOnEscape: true,
    rows: DASHBOARD_ROWS,
    columns: DASHBOARD_COLUMNS,
  })
}

/** Keeps the measurement for the dashboard's trends. */
const recordPoint = async ($: EngineInterface) => {
  const { contextPercent, costUsd } = await read($, usageAtom)
  const at = await $.clock.now()
  await update($, historyAtom, history => [...history, { at, contextPercent, costUsd }].slice(-MAX_HISTORY))
}

/** Gives the newest finished turn its cost, once the session's cost after it is measured. */
const settleTurnCost = async ($: EngineInterface) => {
  const { costUsd } = await read($, usageAtom)
  const stats = await read($, turnStatsAtom)
  const last = stats.at(-1)
  if (costUsd === null || last === undefined || last.costUsd !== null) {
    return
  }
  const cost = Math.max(0, costUsd - (last.costAtStart ?? 0))
  await update($, turnStatsAtom, current =>
    current.map((stat, index) => (index === current.length - 1 && stat.costUsd === null ? { ...stat, costUsd: cost } : stat)),
  )
}

/** Raises the alerts a measurement calls for, once per crossing. */
const raiseAlerts = async ($: EngineInterface) => {
  const { alerts, alerted } = alertsFor(
    await read($, usageAtom),
    (await read($, prefsAtom)).alertAt,
    await read($, alertedAtom),
    await $.clock.now(),
  )
  await update($, alertedAtom, () => alerted)
  for (const alert of alerts) {
    $.ui.toast(alert.text, { timeoutMs: 8000 })
  }
}

/** Reads the repository's changes with git (read-only; repo hooks off), or why it could not. */
const readChanges = async ($: EngineInterface) => {
  try {
    const status = await $.process.run([...GIT_STATUS], { timeoutMs: 10_000 })
    if (status.exitCode !== 0) {
      const reason = status.stderr.trim().split('\n')[0]
      await update($, gitChangesAtom, () => null)
      await update($, gitErrorAtom, () => reason || 'Not inside a git repository.')

      return
    }
    const shortstat = await $.process.run([...GIT_SHORTSTAT], { timeoutMs: 10_000 })
    const changes = parseStatus(status.stdout, shortstat.exitCode === 0 ? shortstat.stdout : '')
    await update($, gitChangesAtom, () => changes)
    await update($, gitErrorAtom, () => null)
  } catch {
    await update($, gitChangesAtom, () => null)
    await update($, gitErrorAtom, () => 'git could not run here.')
  }
}

/** Opens the changed-files pane, read fresh. */
const openChanges = async ($: EngineInterface) => {
  await readChanges($)

  return $.ui.open({ id: GIT_PANE, title: 'Changes', focus: true, closeOnEscape: true, rows: GIT_ROWS })
}

/** What a press on the bar opens or does. */
const openFromBar = ($: EngineInterface, press: BarPress) => {
  const actions: Record<BarPress, () => Promise<unknown>> = {
    skin: () => openPicker($),
    model: () => openModelPicker($),
    compact: () => compactNow($),
    usage: () => openDashboard($),
    branch: () => openChanges($),
    limits: async () => refreshLimits($),
    settings: () => openSettings($),
  }
  void actions[press]()
}

const listSkins = (current: string, customs: readonly CustomSkin[]): string => {
  const entries = skinEntries(customs)
  const width = Math.max(...entries.map(entry => entry.id.length))

  return [
    `${entries.length} skins · current: ${current}`,
    ...entries.map(({ id, skin }) => `${id === current ? '▸' : ' '} ${id.padEnd(width)} ${skin.description}`),
    '',
    `/${COMMAND} opens the picker (or click the bar's first block) · /${COMMAND} <name> · /${COMMAND} next · colors live in /theme`,
    `/${COMMAND} model (or click the model) · /${COMMAND} bar (or click ⚙) · /${COMMAND} usage (or click the context) · /${COMMAND} changes (or click the branch)`,
    `/${COMMAND} show|hide <item>`,
    `/${COMMAND} bar powerline|header · /${COMMAND} chat on|off · /${COMMAND} hud on|off · /${COMMAND} glyphs nerd|powerline|plain`,
    `/${COMMAND} create [name] · /${COMMAND} edit|delete|export <skin> · /${COMMAND} import <json>`,
  ].join('\n')
}

/** The main thread's running turn: its tool calls so far, and the session's cost as it started. */
let toolsThisTurn = 0
let costAtTurnStart: number | null = null

/**
 * The glyphs to start with before the person picks: Windows Terminal's own
 * font has the powerline arrows but no Nerd Font icons, so Windows starts
 * with the arrows and words; elsewhere, with the icons.
 */
const defaultGlyphs = async ($: EngineInterface): Promise<Glyphs> => {
  try {
    return (await $.env.get('OS')) === 'Windows_NT' ? 'powerline' : 'nerd'
  } catch {
    return 'nerd'
  }
}

/** Ticks the HUD's clock once a minute; one at a time, across set-ups. */
let ticker: Timer | undefined
/** The session the plugin last set itself up for. */
let setUpFor: string | undefined

/**
 * Sets the plugin up for the session the process runs now: `/skin`, the
 * person's choices read back from the store, the HUD's figures and clock.
 *
 * `session.start` fires once per process, but a resume, a /clear or a fork
 * moves the process to another session, which keeps none of this: so it
 * runs again then, once `session.end` sees the next session start, and the
 * next prompt or measurement checks too. (`classic.SessionStart` would say
 * so directly, but it never reaches a plugin of the user tier.)
 */
const setUp = async ($: EngineInterface) => {
  // each step on its own: whatever fails, /skin is there and the bar draws with what could be read
  setUpFor = await $.session.id().catch(() => setUpFor)
  await $.command
    .register({
      name: 'skin',
      description: 'Pick a cc-skins skin, or switch its bar, chat cards and glyphs',
      argumentHint: '[list|<skin>|next|color|bar|chat on|off|hud on|off|glyphs nerd|powerline|plain|doctor]',
    })
    .catch(() => undefined)

  const storedSkin = await recall($, STORE.skin)
  const storedCustoms = await recall($, STORE.customSkins)
  const customs = Array.isArray(storedCustoms)
    ? storedCustoms
        .map(parseRecipe)
        .filter((recipe): recipe is CustomSkin => recipe !== undefined)
        .slice(0, MAX_CUSTOM_SKINS)
    : []
  const storedGlyphs = await recall($, STORE.glyphs)
  const storedBarStyle = await recall($, STORE.barStyle)
  const isChatStyled = (await recall($, STORE.isChatStyled)) !== false
  const isHudHidden = (await recall($, STORE.isHudHidden)) === true
  const storedHidden = await recall($, STORE.hidden)
  const storedPrefs = await recall($, STORE.prefs)
  const hidden = hiddenFrom(storedHidden, await recall($, STORE.known))
  const version = await $.session.version().then(
    ({ version: full }) => full,
    () => null,
  )
  await update($, customSkinsAtom, () => customs)
  await update($, skinAtom, () => (isKnownSkin(storedSkin, customs) ? storedSkin : DEFAULT_SKIN))
  const glyphs = isGlyphs(storedGlyphs) ? storedGlyphs : await defaultGlyphs($)
  await update($, glyphsAtom, () => glyphs)
  await update($, barStyleAtom, () => (isBarStyle(storedBarStyle) ? storedBarStyle : 'powerline'))
  await update($, isChatStyledAtom, () => isChatStyled)
  await update($, isHudHiddenAtom, () => isHudHidden)
  await update($, hiddenAtom, () => hidden)
  await update($, versionAtom, () => version)
  await update($, prefsAtom, () => readPrefs(storedPrefs))
  await update($, previewAtom, () => null)
  await tick($).catch(() => undefined)

  const usage = await $.session.usage().catch(() => undefined)
  const model = await readModel($)
  if (usage !== undefined) {
    await update($, usageAtom, previous => toUsage(model, usage, previous))
  }
  await refreshBranch($)
  await refreshGitStatus($)

  try {
    ticker?.cancel()
    ticker = $.clock.every(TICK_MS, () => void tick($).catch(() => undefined))
  } catch {
    // No clock: the countdowns move with each reply instead of each minute.
  }
}

/** How often, and how many times, to look for the next session after one ends. */
const SWITCH_POLL_MS = 200
const SWITCH_TRIES = 50

/**
 * After a session ends with the process going on (a resume, a /clear), waits
 * until the process runs another session, then sets the plugin up there.
 */
const setUpAfterSwitch = ($: EngineInterface, ended: string, triesLeft: number) => {
  $.clock.after(SWITCH_POLL_MS, () => {
    void $.session
      .id()
      .then(id => (id !== ended ? setUp($) : triesLeft > 1 ? setUpAfterSwitch($, ended, triesLeft - 1) : undefined))
      .catch(() => undefined)
  })
}

/**
 * Sets up again where the process has moved to a session this plugin hasn't
 * set up. A check that fails changes nothing: it never holds up what called it.
 */
const setUpIfMoved = async ($: EngineInterface) => {
  try {
    if ((await $.session.id()) !== setUpFor) {
      await setUp($)
    }
  } catch {
    // The next prompt or measurement checks again.
  }
}

export const register: Register = on => {
  /** Runs the bar's animation while a turn does. */
  let animation: Timer | undefined

  on('session.start', async ($, e, next) => {
    await setUp($).catch(() => undefined)
    const version = await read($, versionAtom)
    if (version !== null && isOlder(version, MIN_CLAUDE_CODE)) {
      $.ui.toast(tooOldText(version), { timeoutMs: 15_000 })
    }

    if ((await recall($, STORE.hasWelcomed)) !== true) {
      await keep($, STORE.hasWelcomed, true)
      $.ui.toast(`cc-skins is on · /${COMMAND} or a click on the bar picks a skin`)
    }

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'resume' || e.reason === 'clear') {
      setUpAfterSwitch($, e.sessionId, SWITCH_TRIES)
    }

    return next(e)
  })

  on('session.append', async ($, e, next) => {
    if (e.door === 'prompt' && e.agentId === undefined) {
      const at = await $.clock.now()
      const id = e.uuid
      await update($, sentByIdAtom, byId => Object.fromEntries([...Object.entries(byId), [id, at]].slice(-MAX_PROMPTS)))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    await setUpIfMoved($)
    const at = await $.clock.now()
    await update($, promptsAtom, prompts => [...prompts, { text: e.text, at }].slice(-MAX_PROMPTS))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
    // A subagent's turn starts here too, carrying its `agentId` (Claude Code
    // 2.1.299 sends it, though the declared input does not name it yet). Only
    // the main thread's turn counts, animates and ends the busy state.
    if ((e as { agentId?: string }).agentId !== undefined) {
      return next(e)
    }
    await update($, busyAtom, () => true)
    toolsThisTurn = 0
    costAtTurnStart = (await read($, usageAtom)).costUsd
    animation?.cancel()
    animation = $.clock.every(FRAME_MS, () => void update($, frameAtom, frame => frame + 1))

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    try {
      if (e.agentId === undefined) {
        const effort = typeof e.effort === 'string' ? e.effort : undefined
        if (effort !== undefined && (await read($, effortAtom)) !== effort) {
          await update($, effortAtom, () => effort)
        }
        const model = e.model
        if ((await read($, usageAtom)).model !== model) {
          await update($, usageAtom, usage => ({ ...usage, model }))
        }
      }
    } catch {
      // The bar shows the effort the next request asks for.
    }

    return yield* next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) {
      toolsThisTurn += 1
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    const usage = e.usage
    const stat: TurnStat = {
      durationMs: e.durationMs,
      tokens:
        usage === undefined
          ? null
          : usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens + usage.output_tokens,
      tools: toolsThisTurn,
      costUsd: null,
      costAtStart: costAtTurnStart,
    }
    await update($, turnStatsAtom, stats => [...stats, stat].slice(-MAX_TURN_STATS))
    if (!e.isAborted) {
      await announceTurn($, e.durationMs, e.answer)
    }
    await update($, busyAtom, () => false)
    animation?.cancel()
    animation = undefined
    await update($, frameAtom, () => 0)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await setUpIfMoved($)
    const model = await readModel($)
    await update($, usageAtom, previous => toUsage(model, e, previous))
    if (e.rateLimits.length > 0) {
      await keepLimits($, { rateLimits: e.rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt })), at: await $.clock.now() })
    }
    await settleTurnCost($)
    await recordPoint($)
    await refreshBranch($)
    await refreshGitStatus($)
    await tick($)
    await raiseAlerts($)

    return next(e)
  })

  on('config.set', { key: 'model' }, async ($, e, next) => {
    const result = await next(e)
    const model = await readModel($)
    await update($, usageAtom, current => ({ ...current, model }))

    return result
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'skin' }, async ($, e) => {
    const [first = '', second = ''] = e.args.trim().toLowerCase().split(/\s+/)
    const rest = e.args.trim().replace(/^\S+\s*/, '')
    const current = await read($, skinAtom)
    const customs = await read($, customSkinsAtom)

    if (first === '') {
      const opened = await openPicker($)

      return opened.isPlaced ? {} : { text: listSkins(current, customs) }
    }
    if (first === 'list') {
      return { text: listSkins(current, customs) }
    }
    if (first === 'create' || first === 'new') {
      const opened = await openBuilder($, await newDraft($, rest))

      return unplaced(opened, 'The skin builder')
    }
    if (first === 'doctor') {
      return { text: doctorReport(await readDoctorFacts($)) }
    }
    if (first === 'color' || first === 'colour' || first === 'farbe') {
      return recolor($, rest.split(/\s+/).filter(word => word !== ''))
    }
    if (first === 'edit') {
      const recipe = customs.find(one => one.id === (second || current))
      if (recipe === undefined) {
        return { text: `Only your own skins can be edited: /${COMMAND} create builds one, from the one you wear.` }
      }
      const opened = await openBuilder($, recipe)

      return unplaced(opened, 'The skin builder')
    }
    if (first === 'delete') {
      return { text: (await deleteCustom($, second)) ? `Deleted ${second}.` : `No skin of yours is called "${second}".` }
    }
    if (first === 'export') {
      const recipe = customs.find(one => one.id === (second || current))
      if (recipe === undefined) {
        return { text: `Export takes one of your own skins: ${customs.map(one => one.id).join(', ') || 'none yet, /skin create builds one'}.` }
      }
      const json = JSON.stringify(recipe)
      await $.ui.copy({ text: json }).catch(() => undefined)

      return { text: `${json}\n\nCopied. Anyone with cc-skins wears it after /${COMMAND} import <that line>.` }
    }
    if (first === 'import') {
      let parsed: unknown
      try {
        parsed = JSON.parse(rest)
      } catch {
        parsed = undefined
      }
      if (customs.length >= MAX_CUSTOM_SKINS) {
        return { text: `You keep ${MAX_CUSTOM_SKINS} skins at most: /${COMMAND} delete one first.` }
      }
      const recipe = parseRecipe(parsed)
      if (recipe === undefined) {
        return { text: `Usage: /${COMMAND} import {"id":…,"label":…,"base":…,"accent":"#rrggbb","style":"dark"|"vivid"}` }
      }
      const imported = { ...recipe, id: slugFor(recipe.label, customs.map(one => one.id)) }
      await saveCustoms($, [...customs, imported])

      return { text: await applySkin($, imported.id) }
    }
    if (first === 'hud') {
      if (second !== 'on' && second !== 'off') {
        return { text: `Usage: /${COMMAND} hud on|off` }
      }
      const isHidden = second === 'off'
      await update($, isHudHiddenAtom, () => isHidden)
      await keep($, STORE.isHudHidden, isHidden)

      return { text: isHidden ? 'Usage HUD hidden.' : 'Usage HUD shown.' }
    }
    if (first === 'limits') {
      refreshLimits($)

      return { text: 'Reading the limits live with /usage…' }
    }
    if (first === 'changes' || first === 'git') {
      const opened = await openChanges($)

      return unplaced(opened, 'The changes pane', 'git status says the same')
    }
    if (first === 'usage' || first === 'dashboard') {
      const opened = await openDashboard($)

      return unplaced(opened, 'The usage dashboard', '/context and /cost say much of it')
    }
    if (first === 'model') {
      const opened = await openModelPicker($)

      return unplaced(opened, 'The model picker', '/model and /effort do the same')
    }
    if ((first === 'bar' && second === '') || first === 'settings' || first === 'alerts') {
      const tab = first === 'alerts' ? 'alerts' : isSettingsTab(second) ? second : undefined
      if (tab !== undefined) {
        await update($, settingsTabAtom, () => tab)
      }
      const opened = await openSettings($)

      return unplaced(opened, 'The settings', `/${COMMAND} show|hide <item> does the same`)
    }
    if (first === 'show' || first === 'hide') {
      const item = barItemNamed(second)
      if (item === undefined) {
        return { text: `Usage: /${COMMAND} ${first} skinName|model|effort|branch|context|fiveHour|sevenDay|cost|meters|resets|gear` }
      }
      await showItem($, item, first === 'show')

      return { text: `${first === 'show' ? 'Showing' : 'Hiding'} ${item} in the bar.` }
    }
    if (first === 'bar') {
      if (!isBarStyle(second)) {
        return { text: `Usage: /${COMMAND} bar (settings) or /${COMMAND} bar powerline|header` }
      }
      await applyBarStyle($, second)

      return {
        text: second === 'powerline' ? 'Bar → powerline: colored blocks.' : 'Bar → header: a quiet line with session, context, cost and limits.',
      }
    }
    if (first === 'chat') {
      if (second !== 'on' && second !== 'off') {
        return { text: `Usage: /${COMMAND} chat on|off` }
      }
      const isStyled = second === 'on'
      await applyChat($, isStyled)

      return { text: isStyled ? 'Chat cards on.' : 'Chat cards off: the chat draws as Claude Code does.' }
    }
    if (first === 'glyphs') {
      if (!isGlyphs(second)) {
        return {
          text: `Usage: /${COMMAND} glyphs nerd|powerline|plain (nerd: arrows and icons, needs a Nerd Font; powerline: arrows and words, for fonts with Powerline symbols; plain: any font)`,
        }
      }
      await applyGlyphs($, second)

      return {
        text:
          second === 'nerd'
            ? 'Glyphs → nerd: powerline arrows and icons.'
            : second === 'powerline'
              ? 'Glyphs → powerline: arrows, and short words where the icons were.'
              : 'Glyphs → plain: no special characters.',
      }
    }
    if (first === 'next') {
      const ids = skinEntries(customs).map(entry => entry.id)
      const following = ids[(ids.indexOf(current) + 1) % ids.length] ?? DEFAULT_SKIN

      return { text: await applySkin($, following) }
    }
    if (isKnownSkin(first, customs)) {
      return { text: await applySkin($, first) }
    }

    return { text: `No skin "${first}".\n\n${listSkins(current, customs)}` }
  }).catch(() => ({ text: COMMAND_FAILED }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHudHiddenAtom))) {
      return next(e)
    }
    const shown = (await read($, previewAtom)) ?? (await read($, skinAtom))
    const input = {
      skin: resolveSkin(shown, await read($, customSkinsAtom)),
      usage: await read($, usageAtom),
      branch: await read($, branchAtom),
      now: await read($, nowAtom),
      glyphs: await read($, glyphsAtom),
      isWorking: e.props.isWorking,
      frame: await read($, frameAtom),
      hidden: await read($, hiddenAtom),
      effort: await read($, effortAtom),
      compactAt: await readCompactAt($),
      limitsStale: isStale(await read($, limitsAtAtom), await read($, nowAtom)),
      warnColors: (await read($, prefsAtom)).warnColors,
      ...(await readBarExtras($)),
    }

    return drawBar(
      $.ui.resolve(e),
      input,
      await read($, barStyleAtom),
      e.props.bodyColumns,
      press => openFromBar($, press),
      (await read($, prefsAtom)).clickable,
    )
  })

  on('ui.render', { component: 'Pane', requestId: MODEL_PANE }, async ($, e) =>
    drawModelPicker(
      $.ui.resolve(e),
      (await currentSkin($)),
      { choice: await read($, modelChoiceAtom), effort: await read($, effortAtom) },
      value => void pickModel($, value),
      level => void pickEffort($, level),
    ),
  )

  on('ui.render', { component: 'Pane', requestId: DASHBOARD }, async ($, e) =>
    drawDashboard(
      $.ui.resolve(e),
      (await currentSkin($)),
      {
        usage: await read($, usageAtom),
        effort: await read($, effortAtom),
        branch: await read($, branchAtom),
        now: await read($, nowAtom),
        glyphs: await read($, glyphsAtom),
        history: await read($, historyAtom),
        turns: await read($, turnStatsAtom),
        breakdown: await read($, breakdownAtom),
        columns: e.props.bodyColumns,
        isWorking: await read($, busyAtom),
        limitsAt: await read($, limitsAtAtom),
        warnColors: (await read($, prefsAtom)).warnColors,
      },
      { refresh: () => void readBreakdown($), compact: () => void compactNow($), liveLimits: () => refreshLimits($) },
    ),
  )

  on('ui.render', { component: 'Pane', requestId: GIT_PANE }, async ($, e) =>
    drawChanges(
      $.ui.resolve(e),
      await currentSkin($),
      await read($, gitChangesAtom),
      await read($, gitErrorAtom),
      () => void readChanges($),
    ),
  )

  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) =>
    drawSettings(
      $.ui.resolve(e),
      (await currentSkin($)),
      {
        tab: await read($, settingsTabAtom),
        hidden: await read($, hiddenAtom),
        barStyle: await read($, barStyleAtom),
        glyphs: await read($, glyphsAtom),
        isChatStyled: await read($, isChatStyledAtom),
        prefs: await read($, prefsAtom),
      },
      {
        tab: tab => void update($, settingsTabAtom, () => tab),
        pref: patch => void setPrefs($, patch),
        play: (name, gain) => void playSound($, name, gain),
        toggle: item => void toggleItem($, item),
        style: style => void applyBarStyle($, style),
        glyphs: glyphs => void applyGlyphs($, glyphs),
        chat: isOn => void applyChat($, isOn),
      },
    ),
  )

  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e) => {
    const current = await read($, skinAtom)

    return drawPicker(
      $.ui.resolve(e),
      {
        ...(await readSample($, e.props.bodyColumns, e.props.placement === 'dock')),
        entries: skinEntries(await read($, customSkinsAtom)),
        current,
        previewed: (await read($, previewAtom)) ?? current,
      },
      id => void pressSkin($, id),
    )
  })

  on('ui.scroll', { requestId: PICKER }, async ($, e, next) => {
    // Up and down, a row at a time, walk the skins instead of the window: the
    // one landed on previews and is armed, so Enter picks it. Pages and Home
    // and End still scroll, the window following the row walked onto.
    if (e.origin.kind !== 'person' || Math.abs(e.by) !== 1) {
      return next(e)
    }
    const entries = skinEntries(await read($, customSkinsAtom))
    const ids = entries.map(entry => entry.id)
    const from = Math.max(0, ids.indexOf((await read($, previewAtom)) ?? (await read($, skinAtom))))
    const target = ids[Math.min(ids.length - 1, Math.max(0, from + Math.sign(e.by)))]
    if (target === undefined) {
      return {}
    }
    await update($, previewAtom, () => target)
    await update($, armedAtom, () => target)
    await $.ui.focus({ requestId: PICKER, key: target }).catch(() => undefined)
    const row = pickerRowOf(entries, target)
    const top = Math.max(0, e.offset - e.by)
    const offset = row < top ? row : row >= top + e.bodyRows ? row - e.bodyRows + 1 : top

    return next({ ...e, offset })
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: BUILDER }, async ($, e) => {
    const draft = await read($, draftAtom)
    const elements = $.ui.resolve(e)
    const { Text } = elements
    if (draft === null) {
      return <Text>{`/${COMMAND} create builds a skin.`}</Text>
    }
    const isExisting = (await read($, customSkinsAtom)).some(one => one.id === draft.id)

    return drawBuilder(
      elements,
      await currentSkin($),
      draft,
      await readSample($, e.props.bodyColumns, e.props.placement === 'dock'),
      {
        tab: tab => void update($, builderTabAtom, () => tab),
        color: (part, typed) => void colorDraft($, part, typed),
        resetColors: tab =>
          void update($, draftAtom, current =>
            current === null
              ? current
              : COLOR_PARTS.filter(one => one.tab === tab).reduce((recipe, { part }) => withColor(recipe, part, undefined), current),
          ),
        label: label => void editDraft($, { label: stripControls(label).slice(0, 32) }),
        base: base => void editDraft($, { base }),
        accent: accent => void editDraft($, { accent }),
        style: style => void editDraft($, { style }),
        save: () => void saveDraft($),
        cancel: () => void $.ui.close({ id: BUILDER }),
        remove: isExisting
          ? () =>
              void deleteCustom($, draft.id).then(() => {
                void $.ui.close({ id: BUILDER })
                $.ui.toast(`Deleted ${draft.label}`)
              })
          : undefined,
      },
      await read($, builderTabAtom),
    )
  })

  on('ui.focus', { requestId: PICKER }, async ($, e, next) => {
    const element = e.element
    if (isKnownSkin(element, await read($, customSkinsAtom))) {
      await update($, previewAtom, () => element)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.close', { id: PICKER }, async ($, e, next) => {
    const result = await next(e)
    await update($, previewAtom, () => null)
    await update($, armedAtom, () => null)

    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom)) || e.props.origin.kind === 'task-notification') {
      return next(e)
    }
    const at = sentAt(await read($, promptsAtom), e.props.text, await read($, sentByIdAtom), e.requestId)

    return drawUserCard($.ui.resolve(e), (await currentSkin($)), {
      text: e.props.text,
      author: e.props.from?.name ?? 'You',
      at,
    })
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom)) || e.props.isSummary === true) {
      return next(e)
    }
    const { model } = await read($, usageAtom)

    return drawAssistantBlock($.ui.resolve(e), (await currentSkin($)), {
      text: e.props.text,
      isFirst: e.props.isFirstOfReply,
      model: model === null ? undefined : prettyModel(model),
    })
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom))) {
      return next(e)
    }
    const skin = (await currentSkin($))
    const todos = e.props.tool === 'TodoWrite' ? todosOf(e.props.input) : undefined
    if (todos !== undefined && todos.length > 0) {
      return drawPlanCard($.ui.resolve(e), skin, todos)
    }

    return drawCard($.ui.resolve(e), skin, await next(e))
  })

  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom))) {
      return next(e)
    }

    return drawCard($.ui.resolve(e), (await currentSkin($)), await next(e))
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom)) || e.props.isExpanded) {
      return next(e)
    }

    return drawCard($.ui.resolve(e), (await currentSkin($)), await next(e))
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const isIdle = !e.props.isDraft && !e.props.isWorking && e.props.hint.includes('for shortcuts')
    if (!isIdle || !(await read($, isChatStyledAtom))) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, hint: IDLE_HINT } })
  })

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if (e.props.modes.length === 0 || !(await read($, isChatStyledAtom))) {
      return next(e)
    }

    return drawModeBadges($.ui.resolve(e), (await currentSkin($)), e.props.modes)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const { spinner } = (await currentSkin($))
    const word = spinner.byMode?.[e.props.mode] ?? pick(spinner.words, e.props.word)

    return next({
      ...e,
      props: { ...e.props, word, suffix: spinner.suffix ?? e.props.suffix },
    })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    const skin = (await currentSkin($))
    const glyphs = await read($, glyphsAtom)
    const word = pick(skin.turn.words, `${e.props.word}:${e.props.durationMs}`)
    const stats = turnStatText(findTurnStat(await read($, turnStatsAtom), e.props.durationMs), await read($, prefsAtom))

    return drawPowerline($.ui.resolve(e), turnPills(skin, word, e.props.durationMs, glyphs, stats), glyphs)
  })
}
