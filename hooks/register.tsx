import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage, Timer } from 'claude-code'

import type { Glyphs, SkinId, Usage } from '../types'
import { drawPowerline, fitPills, turnPills } from './hud'
import { DEFAULT_SKIN, SKIN_IDS, SKINS, isSkinId, pick, themeName } from './skins'

const EMPTY_USAGE: Usage = { model: null, contextPercent: null, rateLimits: [], costUsd: null }

const skinAtom = atom({ plugin: 'cc-skins', key: 'skin' } as const, DEFAULT_SKIN)
const glyphsAtom = atom({ plugin: 'cc-skins', key: 'glyphs' } as const, 'nerd' as Glyphs)
const usageAtom = atom({ plugin: 'cc-skins', key: 'usage' } as const, EMPTY_USAGE)
const isHudHiddenAtom = atom({ plugin: 'cc-skins', key: 'isHudHidden' } as const, false)
/** The clock the HUD's reset countdowns read; ticked once a minute. */
const nowAtom = atom({ plugin: 'cc-skins', key: 'now' } as const, 0)
/** The bar's animation frame, advanced while a turn runs. */
const frameAtom = atom({ plugin: 'cc-skins', key: 'frame' } as const, 0)

/** `$.store` keys: what outlives the session. */
const STORE = { skin: 'skin', glyphs: 'glyphs', isHudHidden: 'isHudHidden', hasWelcomed: 'hasWelcomed' } as const

const COMMAND = 'skin'
const TICK_MS = 60_000
const FRAME_MS = 150

const isGlyphs = (value: unknown): value is Glyphs => value === 'nerd' || value === 'plain'

const toUsage = (model: string | null, usage: Omit<SessionUsage, 'startedAt'>): Usage => ({
  model,
  contextPercent: usage.context.percent ?? null,
  rateLimits: usage.rateLimits.map(({ kind, percentUsed, resetsAt }) => ({ kind, percentUsed, resetsAt })),
  costUsd: usage.cost?.usd ?? null,
})

const readModel = async ($: EngineInterface): Promise<string | null> => {
  try {
    return await $.session.model()
  } catch {
    return null
  }
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

const listSkins = (current: SkinId): string =>
  [
    `${SKIN_IDS.length} skins · current: ${current}`,
    ...SKIN_IDS.map(id => `${id === current ? '▸' : ' '} ${id.padEnd(8)} ${SKINS[id].description}`),
    '',
    `/${COMMAND} <name> switches · /${COMMAND} next · /${COMMAND} hud on|off · /${COMMAND} glyphs nerd|plain · colors live in /theme`,
  ].join('\n')

export const register: Register = on => {
  /** Runs the bar's animation while a turn does. */
  let animation: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'skin',
      description: 'Switch the cc-skins skin, its glyphs, or show or hide its usage bar',
      argumentHint: '[retro|neon|minimal|ring|next|hud on|off|glyphs nerd|plain]',
    })

    const storedSkin = await $.store.get(STORE.skin)
    const storedGlyphs = await $.store.get(STORE.glyphs)
    const isHudHidden = (await $.store.get(STORE.isHudHidden)) === true
    await update($, skinAtom, () => (isSkinId(storedSkin) ? storedSkin : DEFAULT_SKIN))
    await update($, glyphsAtom, () => (isGlyphs(storedGlyphs) ? storedGlyphs : 'nerd'))
    await update($, isHudHiddenAtom, () => isHudHidden)
    await tick($)

    const usage = await $.session.usage()
    const model = await readModel($)
    await update($, usageAtom, () => toUsage(model, usage))

    $.clock.every(TICK_MS, () => void tick($))

    if ((await $.store.get(STORE.hasWelcomed)) !== true) {
      await $.store.set(STORE.hasWelcomed, true)
      $.ui.toast(`cc-skins is on · try /${COMMAND} ring or /${COMMAND} neon`)
    }

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
    await update($, usageAtom, () => toUsage(model, e))
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

    if (first === '' || first === 'list') {
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
    const glyphs = await read($, glyphsAtom)
    const pills = fitPills(
      {
        skin: SKINS[await read($, skinAtom)],
        usage: await read($, usageAtom),
        now: await read($, nowAtom),
        glyphs,
        isWorking: e.props.isWorking,
        frame: await read($, frameAtom),
      },
      e.props.bodyColumns,
    )

    return drawPowerline($.ui.resolve(e), pills, glyphs)
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
