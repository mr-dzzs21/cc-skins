import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { SkinId, Usage } from '../types'
import { formatDuration } from './format'
import { drawHud, hudSegments, layoutFor } from './hud'
import { DEFAULT_SKIN, SKIN_IDS, SKINS, isSkinId, pick, themeName } from './skins'

const EMPTY_USAGE: Usage = { model: null, contextPercent: null, rateLimits: [], costUsd: null }

const skinAtom = atom({ plugin: 'cc-skins', key: 'skin' } as const, DEFAULT_SKIN)
const usageAtom = atom({ plugin: 'cc-skins', key: 'usage' } as const, EMPTY_USAGE)
const isHudHiddenAtom = atom({ plugin: 'cc-skins', key: 'isHudHidden' } as const, false)
/** The clock the HUD's reset countdowns read; ticked once a minute. */
const nowAtom = atom({ plugin: 'cc-skins', key: 'now' } as const, 0)

/** `$.store` keys: what outlives the session. */
const STORE = { skin: 'skin', isHudHidden: 'isHudHidden', hasWelcomed: 'hasWelcomed' } as const

const COMMAND = 'skin'
const TICK_MS = 60_000

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
    `/${COMMAND} <name> switches · /${COMMAND} next · /${COMMAND} hud on|off · colors live in /theme`,
  ].join('\n')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'skin',
      description: 'Switch the cc-skins skin, or show or hide its usage HUD',
      argumentHint: '[retro|neon|minimal|ring|next|hud on|off]',
    })

    const storedSkin = await $.store.get(STORE.skin)
    const isHudHidden = (await $.store.get(STORE.isHudHidden)) === true
    await update($, skinAtom, () => (isSkinId(storedSkin) ? storedSkin : DEFAULT_SKIN))
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
    const segments = hudSegments(
      skin,
      await read($, usageAtom),
      await read($, nowAtom),
      layoutFor(e.props.bodyColumns),
    )

    return drawHud($.ui.resolve(e), skin, segments)
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
    const word = pick(skin.turn.words, `${e.props.word}:${e.props.durationMs}`)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text color="claude">{skin.glyph} </Text>
        <Text dimColor>
          {word} {skin.turn.joiner} {formatDuration(e.props.durationMs)}
        </Text>
      </Box>
    )
  })
}
