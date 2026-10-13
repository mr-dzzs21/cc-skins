import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Usage } from '../types'
import { bar, formatDuration, formatReset, prettyModel } from '../hooks/format'
import { MAX_LEVEL, barPills, barWidth, fitPills } from '../hooks/hud'
import type { BarInput } from '../hooks/hud'
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

  test('meters fill', () => {
    expect(bar(0, 8, '█', '░')).toBe('░░░░░░░░')
    expect(bar(1, 8, '█', '░')).toBe('█░░░░░░░')
    expect(bar(50, 8, '█', '░')).toBe('████░░░░')
    expect(bar(140, 8, '█', '░')).toBe('████████')
  })

  test('a word holds for one seed', () => {
    const words = SKINS.ring.spinner.words
    expect(pick(words, 'Baking')).toBe(pick(words, 'Baking'))
    expect(words).toContain(pick(words, 'Baking'))
  })
})

const RING: BarInput = { skin: SKINS.ring, usage: USAGE, now: 0, glyphs: 'nerd', isWorking: false, frame: 0 }

describe('powerline bar', () => {
  test('wide shows every block, meters and countdowns', () => {
    const pills = fitPills(RING, 200)
    expect(pills.map(p => p.key)).toEqual(['skin', 'model', 'context', 'limit-five_hour', 'limit-seven_day', 'cost'])
    expect(pills.find(p => p.key === 'skin')?.text).toBe('\uf255 RING')
    expect(pills.find(p => p.key === 'context')?.text).toBe('\uf1c0 ■■□□□ 34%')
    expect(pills.find(p => p.key === 'limit-five_hour')?.text).toContain('↻2h13m')
  })

  test('blocks follow the gradient, and turn warn and danger colors as they fill', () => {
    const pills = fitPills(RING, 200)
    const { blocks, warn, danger } = SKINS.ring.colors
    expect(pills.map(p => p.key === 'limit-five_hour' || p.key === 'limit-seven_day' ? null : p.paint)).toEqual([
      blocks[0],
      blocks[1],
      blocks[2],
      null,
      null,
      blocks[5],
    ])
    expect(pills.find(p => p.key === 'limit-five_hour')?.paint).toEqual(warn)
    expect(pills.find(p => p.key === 'limit-seven_day')?.paint).toEqual(danger)
  })

  test('every block is readable: text contrast of at least 4.5', () => {
    const luminance = (hex: string) => {
      const [r = 0, g = 0, b = 0] = [1, 3, 5].map(i => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255

        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })

      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contrast = ({ bg, fg }: { bg: string; fg: string }) => {
      const [light, dark] = [luminance(bg), luminance(fg)].sort((x, y) => y - x)

      return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
    }
    for (const skin of Object.values(SKINS)) {
      for (const paint of [...skin.colors.blocks, skin.colors.warn, skin.colors.danger]) {
        expect(contrast(paint)).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  test('the bar sheds detail until it fits', () => {
    for (const columns of [120, 90, 70, 50, 30]) {
      const pills = fitPills(RING, columns)
      const coarsest = barPills(RING, MAX_LEVEL)
      expect(barWidth(pills, 'nerd') <= columns || pills.length === coarsest.length).toBe(true)
    }
    expect(fitPills(RING, 30).map(p => p.key)).toEqual(['skin', 'model', 'context'])
  })

  test('plain glyphs use words and no powerline characters', () => {
    const pills = fitPills({ ...RING, glyphs: 'plain' }, 200)
    expect(pills.find(p => p.key === 'skin')?.text).toBe('◆ RING')
    expect(pills.find(p => p.key === 'context')?.text).toBe('ctx ■■□□□ 34%')
    expect(pills.every(p => !/[\ue000-\uf8ff]/.test(p.text))).toBe(true)
  })

  test('working animates the skin block', () => {
    const still = barPills({ ...RING, isWorking: true, frame: 0 }, 0)[0]
    const later = barPills({ ...RING, isWorking: true, frame: 5 }, 0)[0]
    expect(still?.text).toBe('\uf255 RING ⠋')
    expect(later?.text).toBe('\uf255 RING ⠴')
    expect(later?.paint.bg).toBe(SKINS.ring.colors.pulse)
  })

  test('no readings yet still draws', () => {
    const empty: Usage = { model: null, contextPercent: null, rateLimits: [], costUsd: null }
    expect(fitPills({ ...RING, usage: empty }, 200).map(p => p.text)).toEqual(['\uf255 RING', '\uf1c0 –'])
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
      expect(await band.find({ type: 'Text', text: /Opus 5\.5/ })).toBeDefined()
      expect(await band.find({ type: 'Text', text: /34%/ })).toBeDefined()
      expect(await band.find({ type: 'Text', text: /↻2h13m/ })).toBeDefined()
      expect(await band.find({ type: 'Text', text: /\$1\.24/ })).toBeDefined()
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
    expect(await before.find({ type: 'Text', text: /RING/ })).toBeDefined()
    await before.unmount()

    expect((await runSkin($, 'hud off')).text).toBe('Usage HUD hidden.')
    const after = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await after.find({ type: 'Text', text: /RING/ })).toBeUndefined()
    await after.unmount()
  })
})

describe('glyphs', () => {
  test('/skin glyphs plain drops the powerline characters', async ($, on) => {
    mock.store(on)
    expect((await runSkin($, 'glyphs plain')).text).toContain('plain')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /◆ RING/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /\ue0b0|\ue0b4|\ue0b6/ })).toBeUndefined()
    await band.unmount()
  })

  test('/skin glyphs with no choice explains itself', async ($, on) => {
    mock.store(on)
    expect((await runSkin($, 'glyphs')).text).toContain('nerd|plain')
  })
})

describe('turns', () => {
  test('a running turn animates the bar, and its end stops it', async ($, on) => {
    mock.store(on)
    const clock = mock.clock(on, { now: 0 })
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))

    await $.turn.start({ text: 'count to 5', turnId: 't1' })
    await clock.advance(150)
    const working = { ...bandProps(140), isWorking: true }
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: working })
    expect(await band.find({ type: 'Text', text: /RING ⠙/ })).toBeDefined()
    await band.unmount()

    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1_000, isAborted: false })
    await clock.advance(600)
    const idle = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: working })
    expect(await idle.find({ type: 'Text', text: /RING ⠋/ })).toBeDefined()
    await idle.unmount()
  })

  test('the turn line is a ring pill', async ($, on) => {
    mock.store(on)
    const line = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'TurnDuration',
      props: { word: 'Baked', durationMs: 64_000 },
    })
    expect(await line.find({ type: 'Text', text: /(KO|TKO|Split decision)/ })).toBeDefined()
    expect(await line.find({ type: 'Text', text: /in 1m 4s/ })).toBeDefined()
    await line.unmount()
  })
})
