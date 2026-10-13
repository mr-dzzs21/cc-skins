import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Usage } from '../types'
import { bar, formatDuration, formatReset, levelColor, prettyModel } from '../hooks/format'
import { hudSegments, layoutFor } from '../hooks/hud'
import { SKINS, pick } from '../hooks/skins'

const MINUTE = 60_000
const at = (ms: number) => new Date(ms).toISOString()

const USAGE: Usage = {
  model: 'claude-opus-5-5',
  contextPercent: 34,
  rateLimits: [
    { kind: 'five_hour', percentUsed: 72, resetsAt: at(133 * MINUTE) },
    { kind: 'seven_day', percentUsed: 91, resetsAt: at(76 * 60 * MINUTE) },
  ],
  costUsd: 1.237,
}

const SCROLL = { offset: 0, bodyRows: 4 }

/** Runs `/skin <args>` as the person typing it does. */
const runSkin = ($: Engine, args: string) =>
  $.command.run({
    command: 'skin',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  })

const bandProps = (bodyColumns: number) => ({
  hasSurvey: false,
  isWorking: false,
  maxRows: 6,
  bodyColumns,
  scroll: SCROLL,
  view: {},
})

describe('format', () => {
  test('model ids read as names', () => {
    expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
    expect(prettyModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
    expect(prettyModel('claude-sonnet-4-20250514')).toBe('Sonnet 4')
    expect(prettyModel('opus')).toBe('opus')
  })

  test('durations match the engine', () => {
    expect(formatDuration(3_000)).toBe('3s')
    expect(formatDuration(64_000)).toBe('1m 4s')
    expect(formatDuration(3_723_000)).toBe('1h 2m')
  })

  test('resets count down', () => {
    expect(formatReset(at(42 * MINUTE), 0)).toBe('42m')
    expect(formatReset(at(133 * MINUTE), 0)).toBe('2h13m')
    expect(formatReset(at(76 * 60 * MINUTE), 0)).toBe('3d4h')
    expect(formatReset(at(0), MINUTE)).toBe('')
    expect(formatReset(undefined, 0)).toBe('')
  })

  test('meters fill and color by level', () => {
    expect(bar(0, 8, '█', '░')).toBe('░░░░░░░░')
    expect(bar(1, 8, '█', '░')).toBe('█░░░░░░░')
    expect(bar(50, 8, '█', '░')).toBe('████░░░░')
    expect(bar(140, 8, '█', '░')).toBe('████████')
    expect(levelColor(10)).toBe('success')
    expect(levelColor(72)).toBe('warning')
    expect(levelColor(91)).toBe('error')
  })

  test('a word holds for one seed', () => {
    const words = SKINS.ring.spinner.words
    expect(pick(words, 'Baking')).toBe(pick(words, 'Baking'))
    expect(words).toContain(pick(words, 'Baking'))
  })
})

describe('hud layout', () => {
  test('wide shows meters, the skin and the cost', () => {
    const keys = hudSegments(SKINS.ring, USAGE, 0, layoutFor(140)).map(s => s.key)
    expect(keys).toEqual(['skin', 'model', 'context', 'limit-five_hour', 'limit-seven_day', 'cost'])
    const context = hudSegments(SKINS.ring, USAGE, 0, 'full').find(s => s.key === 'context')
    expect(context?.meter?.text).toBe('■■■□□□□□')
  })

  test('narrow keeps the model, the context and the 5h window', () => {
    const keys = hudSegments(SKINS.ring, USAGE, 0, layoutFor(50)).map(s => s.key)
    expect(keys).toEqual(['model', 'context', 'limit-five_hour'])
  })

  test('no readings yet still draws', () => {
    const empty: Usage = { model: null, contextPercent: null, rateLimits: [], costUsd: null }
    expect(hudSegments(SKINS.minimal, empty, 0, 'compact').map(s => s.value)).toEqual(['–'])
  })
})

describe('engine', () => {
  test('/skin switches the skin, names its theme, and the spinner follows', async ($, on) => {
    mock.store(on)
    const drawn: { word: string; suffix: string }[] = []
    on('ui.render', { component: 'Spinner' }, ($, e) => {
      drawn.push({ word: e.props.word, suffix: e.props.suffix })
      const { Text } = $.ui.resolve(e)

      return <Text>{e.props.word}</Text>
    })

    const { text } = await runSkin($, 'neon')
    expect(text).toContain('Skin → Neon')
    expect(text).toContain('pick "cc-skins · Neon"')

    const spinner = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Spinner',
      props: { word: 'Baking', message: null, suffix: '…', mode: 'responding' },
    })
    expect(SKINS.neon.spinner.words).toContain(drawn.at(-1)?.word)
    expect(drawn.at(-1)?.suffix).toBe(' ⟡')
    await spinner.unmount()
  })

  test('/skin with an unknown name lists the skins', async ($, on) => {
    mock.store(on)
    const { text } = await runSkin($, 'disco')
    expect(text).toContain('No skin "disco"')
    expect(text).toContain('ring')
  })

  test('a measurement reaches the HUD', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))

    await $.session.measure({
      context: { window: 200_000, tokens: 68_000, percent: 34 },
      rateLimits: USAGE.rateLimits,
      cost: { usd: 1.237 },
      changed: ['context', 'rateLimits', 'cost'],
    })

    for (const surface of ['terminal', 'desktop'] as const) {
      const band = await $.ui.mount({ plugin: 'cc-skins', surface, component: 'AbovePrompt', props: bandProps(140) })
      expect(await band.find({ type: 'Text', text: 'Opus 5.5' })).toBeDefined()
      expect(await band.find({ type: 'Text', text: '34%' })).toBeDefined()
      expect(await band.find({ type: 'Text', text: '↻2h13m' })).toBeDefined()
      expect(await band.find({ type: 'Text', text: '$1.24' })).toBeDefined()
      await band.unmount()
    }
  })

  test('/skin hud off hides the HUD', async ($, on) => {
    mock.store(on)
    on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
      const { Box } = $.ui.resolve(e)

      return <Box />
    })

    const before = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await before.find({ type: 'Text', text: 'ctx ' })).toBeDefined()
    await before.unmount()

    expect((await runSkin($, 'hud off')).text).toBe('Usage HUD hidden.')
    const after = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await after.find({ type: 'Text', text: 'ctx ' })).toBeUndefined()
    await after.unmount()
  })
})
