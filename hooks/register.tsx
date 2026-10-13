import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage, Timer } from 'claude-code'

import type { BarStyle, Glyphs, SentPrompt, SkinId, Usage } from '../types'
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
import { drawHeader, drawPowerline, fitPills, headerFor, turnPills } from './hud'
import { PICKER, drawPicker } from './picker'
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
const isChatStyledAtom = atom({ plugin: 'cc-skins', key: 'isChatStyled' } as const, true)
/** The prompts sent this session, newest last, so a card can say when. */
const promptsAtom = atom({ plugin: 'cc-skins', key: 'prompts' } as const, NO_PROMPTS)
const branchAtom = atom({ plugin: 'cc-skins', key: 'branch' } as const, null as string | null)
const usageAtom = atom({ plugin: 'cc-skins', key: 'usage' } as const, EMPTY_USAGE)
const isHudHiddenAtom = atom({ plugin: 'cc-skins', key: 'isHudHidden' } as const, false)
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

/** Opens the skin picker with the keyboard in it: ↑↓ Enter or a digit picks, Escape closes. */
const openPicker = ($: EngineInterface) =>
  $.ui.open({ id: PICKER, title: 'Pick a skin', focus: true, closeOnEscape: true, rows: SKIN_IDS.length + 1 })

/** A pick in the picker: switch, close it, and say so in a toast, since no command line shows it. */
const chooseSkin = async ($: EngineInterface, id: SkinId) => {
  await applySkin($, id)
  await $.ui.close({ id: PICKER })
  $.ui.toast(`Skin → ${SKINS[id].label} · matching colors: /theme → "${themeName(id)}"`)
}

const listSkins = (current: SkinId): string =>
  [
    `${SKIN_IDS.length} skins · current: ${current}`,
    ...SKIN_IDS.map(id => `${id === current ? '▸' : ' '} ${id.padEnd(8)} ${SKINS[id].description}`),
    '',
    `/${COMMAND} opens the picker (or click the bar's first block) · /${COMMAND} <name> · /${COMMAND} next · colors live in /theme`,
    `/${COMMAND} bar powerline|header · /${COMMAND} chat on|off · /${COMMAND} hud on|off · /${COMMAND} glyphs nerd|plain`,
  ].join('\n')

export const register: Register = on => {
  /** Runs the bar's animation while a turn does. */
  let animation: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'skin',
      description: 'Pick a cc-skins skin, or switch its bar, chat cards and glyphs',
      argumentHint: '[list|midnight|ring|neon|retro|minimal|next|bar powerline|header|chat on|off|hud on|off|glyphs nerd|plain]',
    })

    const storedSkin = await $.store.get(STORE.skin)
    const storedGlyphs = await $.store.get(STORE.glyphs)
    const storedBarStyle = await $.store.get(STORE.barStyle)
    const isChatStyled = (await $.store.get(STORE.isChatStyled)) !== false
    const isHudHidden = (await $.store.get(STORE.isHudHidden)) === true
    await update($, skinAtom, () => (isSkinId(storedSkin) ? storedSkin : DEFAULT_SKIN))
    await update($, glyphsAtom, () => (isGlyphs(storedGlyphs) ? storedGlyphs : 'nerd'))
    await update($, barStyleAtom, () => (isBarStyle(storedBarStyle) ? storedBarStyle : 'powerline'))
    await update($, isChatStyledAtom, () => isChatStyled)
    await update($, isHudHiddenAtom, () => isHudHidden)
    await tick($)

    const usage = await $.session.usage()
    const model = await readModel($)
    await update($, usageAtom, previous => toUsage(model, usage, previous))
    await refreshBranch($)

    $.clock.every(TICK_MS, () => void tick($))

    if ((await $.store.get(STORE.hasWelcomed)) !== true) {
      await $.store.set(STORE.hasWelcomed, true)
      $.ui.toast(`cc-skins is on · /${COMMAND} or a click on the bar picks a skin`)
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const at = await $.clock.now()
    await update($, promptsAtom, prompts => [...prompts, { text: e.text, at }].slice(-MAX_PROMPTS))

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    animation?.cancel()
    animation = $.clock.every(FRAME_MS, () => void update($, frameAtom, frame => frame + 1))

    return next(e)
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
    const model = await readModel($)
    await update($, usageAtom, previous => toUsage(model, e, previous))
    await refreshBranch($)
    await tick($)

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
    if (first === 'bar') {
      if (!isBarStyle(second)) {
        return { text: `Usage: /${COMMAND} bar powerline|header` }
      }
      await update($, barStyleAtom, () => second)
      await $.store.set(STORE.barStyle, second)

      return {
        text: second === 'powerline' ? 'Bar → powerline: colored blocks.' : 'Bar → header: a quiet line with session, context, cost and limits.',
      }
    }
    if (first === 'chat') {
      if (second !== 'on' && second !== 'off') {
        return { text: `Usage: /${COMMAND} chat on|off` }
      }
      const isStyled = second === 'on'
      await update($, isChatStyledAtom, () => isStyled)
      await $.store.set(STORE.isChatStyled, isStyled)

      return { text: isStyled ? 'Chat cards on.' : 'Chat cards off: the chat draws as Claude Code does.' }
    }
    if (first === 'glyphs') {
      if (!isGlyphs(second)) {
        return { text: `Usage: /${COMMAND} glyphs nerd|plain (nerd needs a Nerd Font, plain works in any font)` }
      }
      await update($, glyphsAtom, () => second)
      await $.store.set(STORE.glyphs, second)

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
    const skin = SKINS[await read($, skinAtom)]
    const glyphs = await read($, glyphsAtom)
    const input = {
      skin,
      usage: await read($, usageAtom),
      branch: await read($, branchAtom),
      now: await read($, nowAtom),
      glyphs,
      isWorking: e.props.isWorking,
      frame: await read($, frameAtom),
    }
    const elements = $.ui.resolve(e)
    const columns = e.props.bodyColumns
    const openSkinPicker = () => void openPicker($)

    return (await read($, barStyleAtom)) === 'header'
      ? drawHeader(elements, headerFor(input, columns), skin, columns, openSkinPicker)
      : drawPowerline(elements, fitPills(input, columns), glyphs, openSkinPicker)
  })

  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e) =>
    drawPicker($.ui.resolve(e), await read($, skinAtom), id => void chooseSkin($, id)),
  )

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
