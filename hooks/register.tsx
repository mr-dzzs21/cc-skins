import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage, Timer } from 'claude-code'

import type { BarItem, BarStyle, Glyphs, ModelChoice, Prefs, SentPrompt, SettingsTab, SkinId, Usage } from '../types'
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
import { prettyModel } from './format'
import { drawBar, drawPowerline, turnPills } from './hud'
import type { BarPress } from './hud'
import {
  DEFAULT_HIDDEN,
  MODEL_PANE,
  SETTINGS_PANE,
  barItemNamed,
  drawModelPicker,
  isBarItem,
  modelLabel,
  modelPaneRows,
} from './panels'
import type { EffortChoice } from './panels'
import { alertsFor, compactAt } from './alerts'
import { DEFAULT_PREFS, readPrefs } from './prefs'
import { SETTINGS_ROWS, drawSettings, isSettingsTab } from './settings'
import { PICKER, PICKER_COLUMNS, PICKER_ROWS, drawPicker } from './picker'
import { DEFAULT_SKIN, SKIN_IDS, SKINS, isSkinId, pick, themeName } from './skins'

const EMPTY_USAGE: Usage = {
  model: null,
  contextPercent: null,
  contextTokens: null,
  rateLimits: [],
  costUsd: null,
  startedAt: null,
}
const NO_PROMPTS: SentPrompt[] = []

const skinAtom = atom({ plugin: 'cc-skins', key: 'skin' } as const, DEFAULT_SKIN)
const glyphsAtom = atom({ plugin: 'cc-skins', key: 'glyphs' } as const, 'nerd' as Glyphs)
const barStyleAtom = atom({ plugin: 'cc-skins', key: 'barStyle' } as const, 'powerline' as BarStyle)
/** The skin the picker's focus rests on; the bar draws it until the picker closes. */
const previewAtom = atom({ plugin: 'cc-skins', key: 'preview' } as const, null as SkinId | null)
const isChatStyledAtom = atom({ plugin: 'cc-skins', key: 'isChatStyled' } as const, true)
/** The prompts sent this session, newest last, so a card can say when. */
const promptsAtom = atom({ plugin: 'cc-skins', key: 'prompts' } as const, NO_PROMPTS)
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
  models: 'aliasModels',
  prefs: 'prefs',
  hasWelcomed: 'hasWelcomed',
} as const

const COMMAND = 'skin'
const TICK_MS = 60_000
const FRAME_MS = 150
const MAX_PROMPTS = 200

const isGlyphs = (value: unknown): value is Glyphs => value === 'nerd' || value === 'plain'
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
    if ((await $.fs.stat(gitDir)).kind === 'file') {
      gitDir = (await $.fs.read(gitDir)).replace(/^gitdir: /, '').trim()
    }
    const head = (await $.fs.read(`${gitDir}/HEAD`)).trim()

    return head.startsWith(HEAD_REF) ? head.slice(HEAD_REF.length) : head.slice(0, 7)
  } catch {
    return null
  }
}

const refreshBranch = async ($: EngineInterface) => {
  const branch = await readBranch($)
  await update($, branchAtom, () => branch)
}

/** Moves the HUD's clock to now, so its reset countdowns redraw. */
const tick = async ($: EngineInterface) => {
  const now = await $.clock.now()
  await update($, nowAtom, () => now)
}

/**
 * Switches the skin and keeps it for later sessions. The color theme is the
 * person's to pick: the theme row takes only presets from a plugin, so /theme
 * is named instead.
 */
const applySkin = async ($: EngineInterface, id: SkinId): Promise<string> => {
  await update($, skinAtom, () => id)
  await $.store.set(STORE.skin, id)
  const skin = SKINS[id]

  return [
    `Skin → ${skin.label}: ${skin.description}.`,
    `Colors: run /theme and pick "${themeName(id)}".`,
  ].join('\n')
}

/** Opens the skin picker with the keyboard in it: ↑↓ previews, Enter or a hotkey picks, Escape closes. */
const openPicker = ($: EngineInterface) =>
  $.ui.open({
    id: PICKER,
    title: 'Pick a skin',
    focus: true,
    closeOnEscape: true,
    rows: PICKER_ROWS,
    columns: PICKER_COLUMNS,
  })

/** A pick in the picker: switch, close it, and say so in a toast, since no command line shows it. */
const chooseSkin = async ($: EngineInterface, id: SkinId) => {
  await applySkin($, id)
  await update($, previewAtom, () => null)
  await $.ui.close({ id: PICKER })
  $.ui.toast(`Skin → ${SKINS[id].label} · matching colors: /theme → "${themeName(id)}"`)
}

/** Keeps the bar's style, its icons, the chat cards: in this session's state and for the next. */
const applyBarStyle = async ($: EngineInterface, style: BarStyle) => {
  await update($, barStyleAtom, () => style)
  await $.store.set(STORE.barStyle, style)
}

const applyGlyphs = async ($: EngineInterface, glyphs: Glyphs) => {
  await update($, glyphsAtom, () => glyphs)
  await $.store.set(STORE.glyphs, glyphs)
}

const applyChat = async ($: EngineInterface, isOn: boolean) => {
  await update($, isChatStyledAtom, () => isOn)
  await $.store.set(STORE.isChatStyled, isOn)
}

/** Shows or hides one thing in the bar, and keeps the choice. */
const showItem = async ($: EngineInterface, item: BarItem, isShown: boolean) => {
  const hidden = (await read($, hiddenAtom)).filter(one => one !== item)
  const next = isShown ? hidden : [...hidden, item]
  await update($, hiddenAtom, () => next)
  await $.store.set(STORE.hidden, next)
}

const toggleItem = async ($: EngineInterface, item: BarItem) =>
  showItem($, item, (await read($, hiddenAtom)).includes(item))

/** The models picks have shown aliases to name, kept across sessions. */
const readLearnedModels = async ($: EngineInterface): Promise<Record<string, string>> => {
  const stored = await $.store.get(STORE.models)
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
    await $.store.set(STORE.models, { ...(await readLearnedModels($)), [value]: model })
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
  await $.store.set(STORE.prefs, prefs)
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

/** What a press on the bar opens or does. */
const openFromBar = ($: EngineInterface, press: BarPress) => {
  void (press === 'skin'
    ? openPicker($)
    : press === 'model'
      ? openModelPicker($)
      : press === 'compact'
        ? compactNow($)
        : openSettings($))
}

/** The list's name column: as wide as the longest skin id. */
const NAME_WIDTH = Math.max(...SKIN_IDS.map(id => id.length))

const listSkins = (current: SkinId): string =>
  [
    `${SKIN_IDS.length} skins · current: ${current}`,
    ...SKIN_IDS.map(id => `${id === current ? '▸' : ' '} ${id.padEnd(NAME_WIDTH)} ${SKINS[id].description}`),
    '',
    `/${COMMAND} opens the picker (or click the bar's first block) · /${COMMAND} <name> · /${COMMAND} next · colors live in /theme`,
    `/${COMMAND} model (or click the model) · /${COMMAND} bar (or click ⚙) · /${COMMAND} show|hide <item>`,
    `/${COMMAND} bar powerline|header · /${COMMAND} chat on|off · /${COMMAND} hud on|off · /${COMMAND} glyphs nerd|plain`,
  ].join('\n')

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
  setUpFor = await $.session.id()
  await $.command.register({
    name: 'skin',
    description: 'Pick a cc-skins skin, or switch its bar, chat cards and glyphs',
    argumentHint: '[list|<skin>|next|bar powerline|header|chat on|off|hud on|off|glyphs nerd|plain]',
  })

  const storedSkin = await $.store.get(STORE.skin)
  const storedGlyphs = await $.store.get(STORE.glyphs)
  const storedBarStyle = await $.store.get(STORE.barStyle)
  const isChatStyled = (await $.store.get(STORE.isChatStyled)) !== false
  const isHudHidden = (await $.store.get(STORE.isHudHidden)) === true
  const storedHidden = await $.store.get(STORE.hidden)
  const storedPrefs = await $.store.get(STORE.prefs)
  const hidden = Array.isArray(storedHidden) ? storedHidden.filter(isBarItem) : [...DEFAULT_HIDDEN]
  await update($, skinAtom, () => (isSkinId(storedSkin) ? storedSkin : DEFAULT_SKIN))
  await update($, glyphsAtom, () => (isGlyphs(storedGlyphs) ? storedGlyphs : 'nerd'))
  await update($, barStyleAtom, () => (isBarStyle(storedBarStyle) ? storedBarStyle : 'powerline'))
  await update($, isChatStyledAtom, () => isChatStyled)
  await update($, isHudHiddenAtom, () => isHudHidden)
  await update($, hiddenAtom, () => hidden)
  await update($, prefsAtom, () => readPrefs(storedPrefs))
  await update($, previewAtom, () => null)
  await tick($)

  const usage = await $.session.usage()
  const model = await readModel($)
  await update($, usageAtom, previous => toUsage(model, usage, previous))
  await refreshBranch($)

  ticker?.cancel()
  ticker = $.clock.every(TICK_MS, () => void tick($))
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
    await setUp($)

    if ((await $.store.get(STORE.hasWelcomed)) !== true) {
      await $.store.set(STORE.hasWelcomed, true)
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

  on('prompt.submit', async ($, e, next) => {
    await setUpIfMoved($)
    const at = await $.clock.now()
    await update($, promptsAtom, prompts => [...prompts, { text: e.text, at }].slice(-MAX_PROMPTS))

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async ($, e, next) => {
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

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    animation?.cancel()
    animation = undefined
    await update($, frameAtom, () => 0)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await setUpIfMoved($)
    const model = await readModel($)
    await update($, usageAtom, previous => toUsage(model, e, previous))
    await refreshBranch($)
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
    const current = await read($, skinAtom)

    if (first === '') {
      const opened = await openPicker($)

      return opened.isPlaced ? {} : { text: listSkins(current) }
    }
    if (first === 'list') {
      return { text: listSkins(current) }
    }
    if (first === 'hud') {
      if (second !== 'on' && second !== 'off') {
        return { text: `Usage: /${COMMAND} hud on|off` }
      }
      const isHidden = second === 'off'
      await update($, isHudHiddenAtom, () => isHidden)
      await $.store.set(STORE.isHudHidden, isHidden)

      return { text: isHidden ? 'Usage HUD hidden.' : 'Usage HUD shown.' }
    }
    if (first === 'model') {
      const opened = await openModelPicker($)

      return opened.isPlaced ? {} : { text: 'The model picker needs a wider terminal: /model and /effort do the same.' }
    }
    if ((first === 'bar' && second === '') || first === 'settings' || first === 'alerts') {
      const tab = first === 'alerts' ? 'alerts' : isSettingsTab(second) ? second : undefined
      if (tab !== undefined) {
        await update($, settingsTabAtom, () => tab)
      }
      const opened = await openSettings($)

      return opened.isPlaced ? {} : { text: `The settings need a wider terminal: /${COMMAND} show|hide <item> does the same.` }
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
        return { text: `Usage: /${COMMAND} glyphs nerd|plain (nerd needs a Nerd Font, plain works in any font)` }
      }
      await applyGlyphs($, second)

      return {
        text: second === 'nerd' ? 'Glyphs → nerd: powerline arrows and icons.' : 'Glyphs → plain: no special characters.',
      }
    }
    if (first === 'next') {
      const following = SKIN_IDS[(SKIN_IDS.indexOf(current) + 1) % SKIN_IDS.length] ?? DEFAULT_SKIN

      return { text: await applySkin($, following) }
    }
    if (isSkinId(first)) {
      return { text: await applySkin($, first) }
    }

    return { text: `No skin "${first}".\n\n${listSkins(current)}` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHudHiddenAtom))) {
      return next(e)
    }
    const shown = (await read($, previewAtom)) ?? (await read($, skinAtom))
    const input = {
      skin: SKINS[shown],
      usage: await read($, usageAtom),
      branch: await read($, branchAtom),
      now: await read($, nowAtom),
      glyphs: await read($, glyphsAtom),
      isWorking: e.props.isWorking,
      frame: await read($, frameAtom),
      hidden: await read($, hiddenAtom),
      effort: await read($, effortAtom),
      compactAt: await readCompactAt($),
    }

    return drawBar($.ui.resolve(e), input, await read($, barStyleAtom), e.props.bodyColumns, press => openFromBar($, press))
  })

  on('ui.render', { component: 'Pane', requestId: MODEL_PANE }, async ($, e) =>
    drawModelPicker(
      $.ui.resolve(e),
      SKINS[await read($, skinAtom)],
      { choice: await read($, modelChoiceAtom), effort: await read($, effortAtom) },
      value => void pickModel($, value),
      level => void pickEffort($, level),
    ),
  )

  on('ui.render', { component: 'Pane', requestId: SETTINGS_PANE }, async ($, e) =>
    drawSettings(
      $.ui.resolve(e),
      SKINS[await read($, skinAtom)],
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
        toggle: item => void toggleItem($, item),
        style: style => void applyBarStyle($, style),
        glyphs: glyphs => void applyGlyphs($, glyphs),
        chat: isOn => void applyChat($, isOn),
      },
    ),
  )

  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e) => {
    const current = await read($, skinAtom)
    const now = await read($, nowAtom)

    return drawPicker(
      $.ui.resolve(e),
      {
        current,
        previewed: (await read($, previewAtom)) ?? current,
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
        },
        barStyle: await read($, barStyleAtom),
        columns: e.props.bodyColumns,
        isRoomy: e.props.placement === 'dock',
        now,
      },
      id => void chooseSkin($, id),
    )
  })

  on('ui.focus', { requestId: PICKER }, async ($, e, next) => {
    const element = e.element
    if (isSkinId(element)) {
      await update($, previewAtom, () => element)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.close', { id: PICKER }, async ($, e, next) => {
    const result = await next(e)
    await update($, previewAtom, () => null)

    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom)) || e.props.origin.kind === 'task-notification') {
      return next(e)
    }
    const at = sentAt(await read($, promptsAtom), e.props.text)

    return drawUserCard($.ui.resolve(e), SKINS[await read($, skinAtom)], {
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

    return drawAssistantBlock($.ui.resolve(e), SKINS[await read($, skinAtom)], {
      text: e.props.text,
      isFirst: e.props.isFirstOfReply,
      model: model === null ? undefined : prettyModel(model),
    })
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom))) {
      return next(e)
    }
    const skin = SKINS[await read($, skinAtom)]
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

    return drawCard($.ui.resolve(e), SKINS[await read($, skinAtom)], await next(e))
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (!(await read($, isChatStyledAtom)) || e.props.isExpanded) {
      return next(e)
    }

    return drawCard($.ui.resolve(e), SKINS[await read($, skinAtom)], await next(e))
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

    return drawModeBadges($.ui.resolve(e), SKINS[await read($, skinAtom)], e.props.modes)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const { spinner } = SKINS[await read($, skinAtom)]
    const word = spinner.byMode?.[e.props.mode] ?? pick(spinner.words, e.props.word)

    return next({
      ...e,
      props: { ...e.props, word, suffix: spinner.suffix ?? e.props.suffix },
    })
  })

  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    const skin = SKINS[await read($, skinAtom)]
    const glyphs = await read($, glyphsAtom)
    const word = pick(skin.turn.words, `${e.props.word}:${e.props.durationMs}`)

    return drawPowerline($.ui.resolve(e), turnPills(skin, word, e.props.durationMs, glyphs), glyphs)
  })
}
