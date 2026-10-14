import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Usage } from '../types'
import { IDLE_HINT, formatClock, sentAt } from '../hooks/chat'
import { bar, formatDuration, formatElapsed, formatReset, formatTokens, prettyModel } from '../hooks/format'
import { MAX_LEVEL, barPills, barWidth, fitPills, headerFor } from '../hooks/hud'
import type { BarInput } from '../hooks/hud'
import { SKIN_IDS, SKINS, pick } from '../hooks/skins'
import { hotkeyFor, hotkeyRange } from '../hooks/picker'
import { modelLabel } from '../hooks/panels'
import { alertsFor } from '../hooks/alerts'
import { DEFAULT_PREFS, readPrefs } from '../hooks/prefs'
import { findTurnStat, turnStatText } from '../hooks/turns'
import { finishedText, soundFor } from '../hooks/sounds'
import { sparkline, turnTotals } from '../hooks/dashboard'
import { ACCENTS, buildSkin, parseRecipe, slugFor } from '../hooks/custom'
import { contrast } from '../hooks/color'
import { parseStatus } from '../hooks/git'
import { cleanLine, displayWidth, stripControls, truncateCells } from '../hooks/text'
import { todosOf } from '../hooks/chat'

const MINUTE = 60_000
const at = (ms: number) => new Date(ms).toISOString()

const USAGE: Usage = {
  model: 'claude-opus-5-5',
  contextPercent: 34,
  contextTokens: 68_000,
  startedAt: -12 * MINUTE,
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
    expect(prettyModel('opus')).toBe('Opus 5.5')
    expect(prettyModel('fable[1m]')).toBe('Fable 5.1')
    expect(prettyModel('gpt-x')).toBe('gpt-x')
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

  test('session time and tokens read short', () => {
    expect(formatElapsed(0, 45_000)).toBe('45s')
    expect(formatElapsed(0, 12 * MINUTE)).toBe('12m')
    expect(formatElapsed(0, 65 * MINUTE)).toBe('1h 05m')
    expect(formatTokens(850)).toBe('850')
    expect(formatTokens(8_400)).toBe('8.4k')
    expect(formatTokens(68_000)).toBe('68k')
    expect(formatTokens(1_200_000)).toBe('1.2M')
  })

  test('a word holds for one seed', () => {
    const words = SKINS.ring.spinner.words
    expect(pick(words, 'Baking')).toBe(pick(words, 'Baking'))
    expect(words).toContain(pick(words, 'Baking'))
  })
})

const RING: BarInput = {
  skin: SKINS.ring,
  usage: USAGE,
  branch: 'main',
  now: 0,
  glyphs: 'nerd',
  isWorking: false,
  frame: 0,
  hidden: [],
  effort: null,
  compactAt: null,
}

describe('powerline bar', () => {
  test('wide shows every block, meters and countdowns', () => {
    const pills = fitPills(RING, 200)
    expect(pills.map(p => p.key)).toEqual(['skin', 'model', 'branch', 'context', 'limit-five_hour', 'limit-seven_day', 'cost'])
    expect(pills.find(p => p.key === 'branch')?.text).toBe('\ue0a0 main')
    expect(pills.find(p => p.key === 'skin')?.text).toBe('\uf255 RING')
    expect(pills.find(p => p.key === 'context')?.text).toBe('\uf1c0 ■■□□□ 34%')
    expect(pills.find(p => p.key === 'limit-five_hour')?.text).toContain('\uf021 2h13m')
  })

  test('blocks follow the gradient, and turn warn and danger colors as they fill', () => {
    const pills = fitPills(RING, 200)
    const { blocks, warn, danger } = SKINS.ring.colors
    expect(pills.map(p => p.key === 'limit-five_hour' || p.key === 'limit-seven_day' ? null : p.paint)).toEqual([
      blocks[0],
      blocks[1],
      blocks[2],
      blocks[3],
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

  test('the bar sheds detail until it fits, and below its least width keeps its least', () => {
    const coarsest = barPills(RING, MAX_LEVEL)
    const least = barWidth(coarsest, 'nerd')
    for (let columns = least; columns <= 200; columns++) {
      expect(barWidth(fitPills(RING, columns), 'nerd')).toBeLessThanOrEqual(columns)
    }
    for (const columns of [least - 1, 10, 1]) {
      expect(fitPills(RING, columns)).toEqual(coarsest)
    }
    expect(fitPills(RING, 30).map(p => p.key)).toEqual(['skin', 'model', 'context'])
  })

  test('widths count terminal cells: wide characters two, combining marks none', () => {
    expect(displayWidth('main')).toBe(4)
    expect(displayWidth('功能分支')).toBe(8)
    expect(displayWidth('e\u0301te\u0301')).toBe(3)
    expect(displayWidth('🚀 go')).toBe(5)
    expect(displayWidth('\uf255')).toBe(1)
    const wide = { ...RING, branch: '功能/新しい機能' }
    for (let columns = 30; columns <= 200; columns += 7) {
      const pills = fitPills(wide, columns)
      if (barWidth(pills, 'nerd') > columns) {
        expect(pills).toEqual(barPills(wide, MAX_LEVEL))
      }
    }
    const branch = barPills(wide, 0).find(p => p.key === 'branch')
    expect(barWidth(branch === undefined ? [] : [branch], 'plain')).toBe(displayWidth(` ${branch?.text ?? ''} `))
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
    const empty: Usage = {
      model: null,
      contextPercent: null,
      contextTokens: null,
      rateLimits: [],
      costUsd: null,
      startedAt: null,
    }
    expect(fitPills({ ...RING, usage: empty, branch: null }, 200).map(p => p.text)).toEqual(['\uf255 RING', '\uf1c0 –'])
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
      expect(await band.find({ type: 'Text', text: /\uf021 2h13m/ })).toBeDefined()
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

    await runSkin($, 'show skinName')
    const before = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await before.find({ type: 'Text', text: /MIDNIGHT/ })).toBeDefined()
    await before.unmount()

    expect((await runSkin($, 'hud off')).text).toBe('Usage HUD hidden.')
    const after = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await after.find({ type: 'Text', text: /MIDNIGHT/ })).toBeUndefined()
    await after.unmount()
  })
})

describe('glyphs', () => {
  test('/skin glyphs plain drops the powerline characters', async ($, on) => {
    mock.store(on)
    await runSkin($, 'show skinName')
    expect((await runSkin($, 'glyphs plain')).text).toContain('plain')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /✻ MIDNIGHT/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /\ue0b0|\ue0b4|\ue0b6/ })).toBeUndefined()
    await band.unmount()
  })

  test('/skin glyphs with no choice explains itself', async ($, on) => {
    mock.store(on)
    expect((await runSkin($, 'glyphs')).text).toContain('nerd|powerline|plain')
  })
})

describe('turns', () => {
  test('a running turn animates the bar, and its end stops it', async ($, on) => {
    mock.store(on)
    const clock = mock.clock(on, { now: 0 })
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))

    await runSkin($, 'show skinName')
    await $.turn.start({ text: 'count to 5', turnId: 't1' })
    await clock.advance(150)
    const working = { ...bandProps(140), isWorking: true }
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: working })
    expect(await band.find({ type: 'Text', text: /MIDNIGHT ⠙/ })).toBeDefined()
    await band.unmount()

    await $.turn.complete({ turnId: 't1', reason: 'answer', answer: '', durationMs: 1_000, isAborted: false })
    await clock.advance(600)
    const idle = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: working })
    expect(await idle.find({ type: 'Text', text: /MIDNIGHT ⠋/ })).toBeDefined()
    await idle.unmount()
  })

  test('the turn line is a ring pill', async ($, on) => {
    mock.store(on)
    await runSkin($, 'ring')
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

const MIDNIGHT: BarInput = { ...RING, skin: SKINS.midnight }

describe('header bar', () => {
  test('wide shows who, the session figures and the limit badges', () => {
    const header = headerFor(MIDNIGHT, 200)
    expect(header.brand.map(i => i.text)).toEqual(['\uf186 CLAUDE', 'Opus 5.5'])
    expect(header.stats.map(i => i.text)).toEqual(['● Session 12m', '\ue0a0 main', '\uf1c0 34% · 68k', '$1.24'])
    expect(header.badges.map(i => i.text)).toEqual(['● 5h 72%', '● 7d 91%'])
    expect(header.badges[1]?.color).toBe(SKINS.midnight.colors.danger.bg)
  })

  test('narrow sheds cost, the 7-day badge and the session time first', () => {
    const header = headerFor(MIDNIGHT, 60)
    expect(header.stats.map(i => i.key)).not.toContain('cost')
    expect(header.badges.map(i => i.key)).not.toContain('limit-seven_day')
    expect(header.brand[0]?.text).toContain('CLAUDE')
  })

  test('working shows a spinning badge', () => {
    const header = headerFor({ ...MIDNIGHT, isWorking: true, frame: 1 }, 200)
    expect(header.badges[0]?.text).toBe('⠙ working')
  })

  test('/skin bar header draws the header above the prompt', async ($, on) => {
    mock.store(on)
    expect((await runSkin($, 'bar header')).text).toContain('header')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /CLAUDE/ })).toBeDefined()
    await band.unmount()
  })
})

describe('chat cards', () => {
  test('a prompt gets its own time: by its row id, else by a text only one prompt had', () => {
    const prompts = [
      { text: 'weiter', at: 900 },
      { text: 'other', at: 950 },
      { text: 'weiter ', at: 1000 },
    ]
    const byId = { 'row-1': 900, 'row-3': 1000 }
    expect(sentAt(prompts, 'weiter', byId, 'row-1')).toBe(900)
    expect(sentAt(prompts, 'weiter', byId, 'row-3')).toBe(1000)
    expect(sentAt(prompts, 'weiter')).toBeUndefined()
    expect(sentAt(prompts, 'other')).toBe(950)
    expect(sentAt(prompts, 'never sent')).toBeUndefined()
  })

  test('two prompts alike each show their own time once the session reported their rows', async ($, on) => {
    mock.store(on)
    const start = Date.UTC(2026, 9, 13, 9, 0)
    const clock = mock.clock(on, { now: start })
    const append = (uuid: string) =>
      $.session.append({
        message: { type: 'user', role: 'user', content: [{ type: 'text', text: 'weiter' }] },
        door: 'prompt',
        origin: { kind: 'composer' },
        uuid,
      } as never)
    await append('row-1')
    await clock.advance(10 * 60_000)
    await append('row-2')

    for (const [requestId, at] of [['row-1', start], ['row-2', start + 10 * 60_000]] as const) {
      const time = formatClock(at)
      const card = await $.ui.mount({
        plugin: 'cc-skins',
        surface: 'terminal',
        component: 'UserMessage',
        requestId,
        props: { text: 'weiter', origin: { kind: 'composer' }, isExpanded: false },
      })
      expect(await card.find({ type: 'Text', text: new RegExp(time) })).toBeDefined()
      await card.unmount()
    }
  })

  test('your message is a card with your name and when you sent it', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: Date.UTC(2026, 9, 13, 12, 23) })
    on('prompt.submit', ($, e) => ({ text: e.text }))
    await $.prompt.submit({ text: 'zähl bis 5', wait: false, origin: { kind: 'composer' } })

    const card = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'UserMessage',
      props: { text: 'zähl bis 5', origin: { kind: 'composer' }, isExpanded: false },
    })
    expect(await card.find({ type: 'Text', text: ' ❯ ' })).toBeDefined()
    expect(await card.find({ type: 'Text', text: ' You' })).toBeDefined()
    expect(await card.find({ type: 'Text', text: /^ {2}\d\d:\d\d$/ })).toBeDefined()
    expect(await card.find({ type: 'Text', text: 'zähl bis 5' })).toBeDefined()
    expect(await card.drawn()).toMatchObject({ props: { borderStyle: 'round' } })
    await card.unmount()
  })

  test("Claude's reply opens with a header and hangs off an accent line", async ($, on) => {
    mock.store(on)
    const block = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'AssistantMessage',
      props: { text: '1… 2… 3', isFirstOfReply: true },
    })
    expect(await block.find({ type: 'Text', text: ' CLAUDE' })).toBeDefined()
    expect(await block.find({ type: 'Text', text: ' ✻ ' })).toBeDefined()
    expect(await block.find({ type: 'Markdown' })).toBeDefined()
    expect(await block.drawn()).toMatchObject({ props: { borderStyle: 'round' } })
    await block.unmount()
  })

  test("a tool call keeps the engine's drawing, framed as a card", async ($, on) => {
    mock.store(on)
    on('ui.render', { component: 'ToolUse' }, ($, e) => {
      const { Text } = $.ui.resolve(e)

      return <Text>Bash ls</Text>
    })
    const row = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'ToolUse',
      props: {
        tool_use_id: 'toolu_1',
        tool: 'Bash',
        input: { command: 'ls' },
        isRunning: false,
        isErrored: false,
        isInterrupted: false,
      },
    })
    expect(await row.drawn()).toMatchObject({ props: { borderStyle: 'round' } })
    expect(await row.find({ type: 'Text', text: 'Bash ls' })).toBeDefined()
    await row.unmount()
  })

  test('a todo list becomes a plan card with ticks', async ($, on) => {
    mock.store(on)
    const plan = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'ToolUse',
      props: {
        tool_use_id: 'toolu_2',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Theme-Konzept erstellen', status: 'completed', activeForm: 'Erstelle Theme-Konzept' },
            { content: 'Header bauen', status: 'in_progress', activeForm: 'Baue Header' },
            { content: 'Testen', status: 'pending', activeForm: 'Teste' },
          ],
        },
        isRunning: false,
        isErrored: false,
        isInterrupted: false,
      },
    })
    expect(await plan.find({ type: 'Text', text: ' Plan' })).toBeDefined()
    expect(await plan.find({ type: 'Text', text: '  1/3 done' })).toBeDefined()
    expect(await plan.find({ type: 'Text', text: '✓  ' })).toBeDefined()
    expect(await plan.find({ type: 'Text', text: 'Baue Header' })).toBeDefined()
    expect(await plan.find({ type: 'Text', text: 'Testen' })).toBeDefined()
    await plan.unmount()
  })

  test('the idle hint names what the prompt takes; others stay', async ($, on) => {
    mock.store(on)
    const hints: string[] = []
    on('ui.render', { component: 'PromptHint' }, ($, e) => {
      hints.push(e.props.hint)
      const { Text } = $.ui.resolve(e)

      return <Text>{e.props.hint}</Text>
    })
    for (const hint of ['? for shortcuts', 'esc to interrupt']) {
      const line = await $.ui.mount({
        plugin: 'cc-skins',
        surface: 'terminal',
        component: 'PromptHint',
        props: { isDraft: false, isWorking: hint !== '? for shortcuts', hint },
      })
      await line.unmount()
    }
    expect(hints).toEqual([IDLE_HINT, 'esc to interrupt'])
  })

  test('modes become badges', async ($, on) => {
    mock.store(on)
    const footer = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'SessionMode',
      props: { modes: ['auto mode', 'focus'] },
    })
    expect(await footer.find({ type: 'Text', text: ' auto mode ' })).toBeDefined()
    await footer.unmount()
  })

  test('/skin chat off hands the chat back to the engine', async ($, on) => {
    mock.store(on)
    on('ui.render', { component: 'UserMessage' }, ($, e) => {
      const { Text } = $.ui.resolve(e)

      return <Text>engine</Text>
    })
    expect((await runSkin($, 'chat off')).text).toContain('off')
    const card = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'UserMessage',
      props: { text: 'hi', origin: { kind: 'composer' }, isExpanded: false },
    })
    expect(await card.find({ type: 'Text', text: 'engine' })).toBeDefined()
    await card.unmount()
  })
})

const PANE_PROPS = {
  title: 'Pick a skin',
  isFocused: true,
  bodyColumns: 80,
  placement: 'inline' as const,
  scroll: SCROLL,
  view: {},
}

describe('skin picker', () => {
  test('/skin opens the picker with the keyboard in it', async ($, on) => {
    mock.store(on)
    const opened: { id: string; focus?: true }[] = []
    on('ui.open', ($, e) => {
      opened.push({ id: e.id, focus: e.focus })

      return { value: { isPlaced: true as const } }
    })

    const result = await runSkin($, '')
    expect(result.text).toBeUndefined()
    expect(opened).toEqual([{ id: 'skin-picker', focus: true }])
  })

  test('/skin falls back to the list where no pane can show', async ($, on) => {
    mock.store(on)
    on('ui.open', () => ({ value: { isPlaced: false as const, reason: 'narrow' as const } }))

    expect((await runSkin($, '')).text).toContain(`${SKIN_IDS.length} skins · current:`)
  })

  test('a pick switches the skin, closes the picker and says so', async ($, on) => {
    mock.store(on)
    const closed: string[] = []
    const toasts: string[] = []
    on('ui.close', ($, e) => {
      closed.push(e.id)

      return { value: undefined }
    })
    on('ui.toast', ($, e) => {
      toasts.push(e.text)

      return { value: undefined }
    })

    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: PANE_PROPS,
    })
    expect(await picker.findAll({ type: 'Button' })).toHaveLength(SKIN_IDS.length)
    await picker.press({ key: 'retro' })
    expect(closed).toEqual([])
    await picker.press({ key: 'retro' })
    await picker.unmount()

    expect(closed).toEqual(['skin-picker'])
    expect(toasts.at(-1)).toContain('Skin → Retro')
    expect((await runSkin($, 'list')).text).toContain('current: retro')
  })

  test('a click on the bar opens the picker', async ($, on) => {
    mock.store(on)
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })

    for (const style of ['powerline', 'header'] as const) {
      await runSkin($, `bar ${style}`)
      const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
      await band.press({ key: 'skin-button' })
      await band.unmount()
    }
    expect(opened).toEqual(['skin-picker', 'skin-picker'])
  })
})

const pickerProps = (placement: 'dock' | 'inline') => ({ ...PANE_PROPS, placement, bodyColumns: 64 })

/** Moves the picker's focus ring onto a skin's row, as the person's arrow keys do. */
const focusRow = ($: Engine, element: string) =>
  $.ui.focus({ component: 'Pane', requestId: 'skin-picker', plugin: 'cc-skins', element, origin: { kind: 'person' } })

describe('preview', () => {
  test('every skin has a hotkey, read back in the hint', () => {
    expect(SKIN_IDS.every((id, index) => hotkeyFor(index) !== undefined)).toBe(true)
    expect(hotkeyRange(5)).toBe('1–5')
    expect(hotkeyRange(10)).toBe('1–9, 0')
    expect(hotkeyRange(11)).toBe('1–9, 0, a')
    expect(hotkeyRange(12)).toBe('1–9, 0, a–b')
  })

  test('docked, the picker previews the current skin with sample cards', async ($, on) => {
    mock.store(on)
    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: pickerProps('dock'),
    })
    expect(await picker.find({ type: 'Text', text: /Preview · Midnight/ })).toBeDefined()
    expect(await picker.find({ type: 'Text', text: /count slowly to 5/ })).toBeDefined()
    expect(await picker.find({ type: 'Text', text: /CLAUDE/ })).toBeDefined()
    expect(await picker.find({ type: 'Text', text: /── Dark ──/ })).toBeDefined()
    expect(await picker.find({ type: 'Text', text: /── Light ──/ })).toBeDefined()
    await picker.unmount()
  })

  test('inline, the preview stays short', async ($, on) => {
    mock.store(on)
    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: pickerProps('inline'),
    })
    expect(await picker.find({ type: 'Text', text: /Preview · Midnight/ })).toBeDefined()
    expect(await picker.find({ type: 'Text', text: /count slowly to 5/ })).toBeUndefined()
    await picker.unmount()
  })

  test('moving the focus previews that skin in the picker and the bar; a pick ends it', async ($, on) => {
    mock.store(on)
    on('ui.focus', () => ({}))
    on('ui.close', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))

    await runSkin($, 'show skinName')
    await focusRow($, 'lava')
    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: pickerProps('dock'),
    })
    expect(await picker.find({ type: 'Text', text: /Preview · Lava/ })).toBeDefined()

    const previewing = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await previewing.find({ type: 'Text', text: /LAVA/ })).toBeDefined()
    await previewing.unmount()
    expect((await runSkin($, 'list')).text).toContain('current: midnight')

    await picker.press({ key: 'forest' })
    await picker.press({ key: 'forest' })
    await picker.unmount()
    const after = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await after.find({ type: 'Text', text: /FOREST/ })).toBeDefined()
    expect(await after.find({ type: 'Text', text: /LAVA/ })).toBeUndefined()
    await after.unmount()
  })

  test('the focus on something else leaves the preview as it was', async ($, on) => {
    mock.store(on)
    on('ui.focus', () => ({}))

    await runSkin($, 'show skinName')
    await focusRow($, 'ocean')
    await focusRow($, 'not-a-skin')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /OCEAN/ })).toBeDefined()
    await band.unmount()
  })
})

describe('session switches', () => {
  test('after a resume, the plugin sets itself up again in the next session', async ($, on) => {
    mock.store(on, { skin: 'lava' })
    const clock = mock.clock(on, { now: 0 })
    let sessionId = 'old'
    const registered: string[] = []
    on('session.id', () => ({ value: sessionId }))
    on('command.register', ($, e) => {
      registered.push(e.name)

      return { value: { command: e.name } }
    })
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))

    await $.session.end({ reason: 'resume', sessionId: 'old', resume: { id: 'old' } })
    await clock.advance(200)
    expect(registered).toEqual([])

    sessionId = 'new'
    await clock.advance(200)
    expect(registered).toEqual(['skin'])
    expect((await runSkin($, 'list')).text).toContain('current: lava')
  })

  test('an exit sets nothing up again', async ($, on) => {
    mock.store(on)
    const clock = mock.clock(on, { now: 0 })
    const registered: string[] = []
    on('session.id', () => ({ value: 'other' }))
    on('command.register', ($, e) => {
      registered.push(e.name)

      return { value: { command: e.name } }
    })
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))

    await $.session.end({ reason: 'prompt_input_exit', sessionId: 'old', resume: { id: 'old' } })
    await clock.advance(1_000)
    expect(registered).toEqual([])
  })
})

describe('dark skins', () => {
  test('dark skins keep their bar dark: no block brighter than a mid tone', () => {
    const luminance = (hex: string) => {
      const [r = 0, g = 0, b = 0] = [1, 3, 5].map(i => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255

        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })

      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const dark = SKIN_IDS.filter(id => SKINS[id].isDark === true)
    expect(dark.length).toBeGreaterThanOrEqual(8)
    for (const id of dark) {
      for (const block of SKINS[id].colors.blocks) {
        expect(luminance(block.bg)).toBeLessThan(0.2)
      }
    }
  })
})

const MODEL_ROW = {
  key: 'model',
  label: 'Model',
  kind: 'choice' as const,
  value: 'opus',
  options: ['default', 'sonnet', 'opus', 'opus[1m]'],
  provider: { plugin: 'engine', tier: 'core' as const },
  isLocked: false,
}

describe('bar contents', () => {
  test('the skin name is off by default: the skin block is its icon alone', () => {
    const pills = barPills({ ...RING, hidden: ['skinName'] }, 0)
    expect(pills[0]?.text).toBe('\uf255')
    expect(pills[0]?.press).toBe('skin')
  })

  test('hidden items leave the bar; the effort rides on the model', () => {
    const keys = barPills({ ...RING, hidden: ['cost', 'branch', 'sevenDay'] }, 0).map(p => p.key)
    expect(keys).toEqual(['skin', 'model', 'context', 'limit-five_hour'])

    const model = barPills({ ...RING, effort: 'xhigh' }, 0).find(p => p.key === 'model')
    expect(model?.text).toBe('\uf2db Opus 5.5 · xhigh')
    expect(model?.press).toBe('model')

    const effortAlone = barPills({ ...RING, effort: 'high', hidden: ['model'] }, 0).find(p => p.key === 'model')
    expect(effortAlone?.text).toBe('\uf2db high')
    expect(barPills({ ...RING, hidden: ['model', 'effort'] }, 0).some(p => p.key === 'model')).toBe(false)
  })

  test('/skin hide and show change the bar and say so', async ($, on) => {
    mock.store(on)
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({
      context: { window: 200_000, tokens: 68_000, percent: 34 },
      rateLimits: USAGE.rateLimits,
      cost: { usd: 1.237 },
      changed: ['context', 'rateLimits', 'cost'],
    })

    expect((await runSkin($, 'hide cost')).text).toBe('Hiding cost in the bar.')
    expect((await runSkin($, 'hide Model')).text).toBe('Hiding model in the bar.')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /\$1\.24/ })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /Opus 5\.5/ })).toBeUndefined()
    expect(await band.find({ type: 'Text', text: /34%/ })).toBeDefined()
    await band.unmount()
    expect((await runSkin($, 'hide nonsense')).text).toContain('Usage: /skin hide')
  })
})

describe('model and effort', () => {
  test('a press on the model opens the model picker; a pick sets the model, saved as /config does', async ($, on) => {
    mock.store(on)
    const opened: string[] = []
    const set: unknown[] = []
    const toasts: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })
    on('config.list', () => ({ value: [MODEL_ROW] }))
    on('config.set', ($, e) => {
      set.push(e.value)

      return { value: e.value }
    })
    on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
    on('ui.toast', ($, e) => {
      toasts.push(e.text)

      return { value: undefined }
    })

    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    await band.press({ key: 'skin-button' })
    expect(opened).toEqual(['skin-picker'])
    await band.unmount()

    expect(await runSkin($, 'model')).toEqual({})
    expect(opened).toEqual(['skin-picker', 'model-picker'])

    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'model-picker',
      props: { ...PANE_PROPS, title: 'Model and effort' },
    })
    expect(await picker.find({ type: 'Button', text: /Opus 5\.5 · 1M context/ })).toBeDefined()
    expect(await picker.find({ type: 'Button', text: /Sonnet 5\.5/ })).toBeDefined()
    expect(await picker.findAll({ type: 'Button' })).toHaveLength(MODEL_ROW.options.length + 6)
    await picker.press({ key: 'model-sonnet' })
    await picker.unmount()

    expect(set).toEqual(['sonnet'])
    expect(toasts.at(-1)).toBe('Model → Sonnet 5.5')
  })

  test('an effort pick runs /effort and shows on the model', async ($, on) => {
    mock.store(on)
    const ran: string[] = []
    on('command.run', { command: 'effort' }, ($, e) => {
      ran.push(e.args)

      return { text: '' }
    })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })

    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'model-picker',
      props: { ...PANE_PROPS, title: 'Model and effort' },
    })
    await picker.press({ key: 'effort-high' })
    await picker.unmount()
    expect(ran).toEqual(['high'])

    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /Opus 5\.5 · high/ })).toBeDefined()
    await band.unmount()
  })
})

describe('bar settings', () => {
  test('the ⚙ opens the settings; a press there turns an item off and the style over', async ($, on) => {
    mock.store(on)
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({ context: { window: 200_000 }, rateLimits: [], cost: { usd: 1.237 }, changed: ['cost'] })

    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    await band.press({ key: 'settings-button' })
    await band.unmount()
    expect(opened).toEqual(['bar-settings'])

    const settings = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'bar-settings',
      props: { ...PANE_PROPS, title: 'Bar settings' },
    })
    expect(await settings.find({ type: 'Text', text: /\[ \] / })).toBeDefined()
    await settings.press({ key: 'item-cost' })
    await settings.press({ key: 'tab-look' })
    await settings.press({ key: 'style-header' })
    await settings.unmount()

    const after = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await after.find({ type: 'Text', text: /\$1\.24/ })).toBeUndefined()
    expect(await after.find({ type: 'Text', text: /CLAUDE/ })).toBeDefined()
    await after.unmount()
  })

  test('with the ⚙ turned off, /skin bar still opens the settings', async ($, on) => {
    mock.store(on)
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })
    await runSkin($, 'hide gear')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ key: 'settings-button' })).toBeUndefined()
    await band.unmount()
    expect(await runSkin($, 'bar')).toEqual({})
    expect(opened).toEqual(['bar-settings'])
  })
})

describe('model names', () => {
  test('every alias reads with its version', () => {
    expect(modelLabel('opus')).toBe('Opus 5.5')
    expect(modelLabel('opus[1m]')).toBe('Opus 5.5 · 1M context')
    expect(modelLabel('opusplan')).toBe('Opus 5.5 plan mode')
    expect(modelLabel('default')).toBe('Default')
    expect(modelLabel('default', 'claude-opus-5-5')).toBe('Default · Opus 5.5')
    expect(modelLabel('sonnet', 'claude-sonnet-5-6')).toBe('Sonnet 5.6')
  })
})

describe('alerts', () => {
  test('each unit alerts once at the threshold, once more at 95, and again only after dropping back', () => {
    const at = (contextPercent: number) => ({ ...USAGE, rateLimits: [], contextPercent })
    const first = alertsFor(at(82), 80, {}, 0)
    expect(first.alerts.map(a => a.text)).toEqual(['Context 82% full · compact from the bar, or /compact'])
    expect(alertsFor(at(84), 80, first.alerted, 0).alerts).toEqual([])
    const urgent = alertsFor(at(96), 80, first.alerted, 0)
    expect(urgent.alerts.map(a => a.level)).toEqual([95])
    const dropped = alertsFor(at(40), 80, urgent.alerted, 0)
    expect(dropped.alerted.context).toBe(0)
    expect(alertsFor(at(81), 80, dropped.alerted, 0).alerts).toHaveLength(1)
  })

  test('limits name their window and reset; off means none', () => {
    const { alerts } = alertsFor(USAGE, 70, {}, 0)
    expect(alerts.map(a => a.text)).toEqual(['5-hour limit at 72% · resets in 2h13m', '7-day limit at 91% · resets in 3d4h'])
    expect(alertsFor(USAGE, 0, {}, 0).alerts).toEqual([])
  })

  test('stored prefs keep only fields of the right kind', () => {
    expect(readPrefs({ alertAt: 90, sound: 'loud', bogus: 1 })).toEqual({ ...DEFAULT_PREFS, alertAt: 90 })
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS)
  })

  test('the compact block shows between turns once the context is that full', () => {
    const full = { ...RING, usage: { ...USAGE, contextPercent: 88 }, compactAt: 80 }
    expect(barPills(full, 0).find(p => p.key === 'compact')?.press).toBe('compact')
    expect(barPills({ ...full, isWorking: true }, 0).some(p => p.key === 'compact')).toBe(false)
    expect(barPills({ ...full, compactAt: null }, 0).some(p => p.key === 'compact')).toBe(false)
    expect(barPills({ ...full, compactAt: 90 }, 0).some(p => p.key === 'compact')).toBe(false)
  })

  test('a measurement past the threshold toasts; the compact button compacts', async ($, on) => {
    mock.store(on)
    const toasts: string[] = []
    let compacted = 0
    on('ui.toast', ($, e) => {
      toasts.push(e.text)

      return { value: undefined }
    })
    mock.clock(on, { now: 0 })
    on('session.compact', () => {
      compacted += 1

      return { skip: 'kept in this test' }
    })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({ context: { window: 200_000, tokens: 170_000, percent: 85 }, rateLimits: [], changed: ['context'] })
    expect(toasts).toEqual(['Context 85% full · compact from the bar, or /compact'])

    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    await band.press({ key: 'compact-button' })
    await band.unmount()
    expect(compacted).toBe(1)
  })

  test('the alerts tab sets the threshold and the compact button', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    const settings = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'bar-settings',
      props: { ...PANE_PROPS, title: 'Settings' },
    })
    await settings.press({ key: 'tab-alerts' })
    expect(await settings.find({ key: 'alert-80' })).toBeDefined()
    await settings.press({ key: 'alert-90' })
    await settings.press({ key: 'compact-off' })
    await settings.unmount()

    await $.session.measure({ context: { window: 200_000, tokens: 176_000, percent: 88 }, rateLimits: [], changed: ['context'] })
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ key: 'compact-button' })).toBeUndefined()
    await band.unmount()
  })
})

describe('turn stats', () => {
  const stat = (durationMs: number, costUsd: number | null = 0.04) => ({
    durationMs,
    tokens: 12_400,
    tools: 3,
    costUsd,
    costAtStart: 1,
  })

  test('a closing line finds its turn by duration, exactly or the nearest within two seconds', () => {
    const stats = [stat(4_000), stat(64_000), stat(12_000)]
    expect(findTurnStat(stats, 64_000)).toBe(stats[1])
    expect(findTurnStat(stats, 12_900)).toBe(stats[2])
    expect(findTurnStat(stats, 30_000)).toBeUndefined()
  })

  test('the text holds what the person chose', () => {
    expect(turnStatText(stat(1), DEFAULT_PREFS)).toBe('$0.04 · 3 tools')
    expect(turnStatText(stat(1), { ...DEFAULT_PREFS, turnTokens: true })).toBe('$0.04 · 12k tok · 3 tools')
    expect(turnStatText(stat(1, null), DEFAULT_PREFS)).toBe('3 tools')
    expect(turnStatText(stat(1), { ...DEFAULT_PREFS, turnCost: false, turnTools: false })).toBe('')
  })

  test('a turn counts its own tool calls, and its cost once measured', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('tool.call', () => ({ result: 'done' }) as never)
    on('turn.complete', () => ({ text: '' }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))

    await $.session.measure({ context: { window: 200_000 }, rateLimits: [], cost: { usd: 1 }, changed: ['cost'] })
    await $.turn.start({ text: 'go', turnId: 't1' })
    await $.tool.call({ tool: 'Bash', command: 'true', description: 'one' } as never)
    await $.tool.call({ tool: 'Bash', command: 'true', description: 'two' } as never)
    await $.tool.call({ tool: 'Bash', command: 'true', description: 'a subagent', agentId: 'sub' } as never)
    await $.turn.complete({
      turnId: 't1',
      reason: 'answer',
      answer: 'done',
      durationMs: 64_000,
      isAborted: false,
      usage: { input_tokens: 400, cache_read_input_tokens: 10_000, cache_creation_input_tokens: 0, output_tokens: 2_000, model: 'claude-opus-5-5' },
    })
    await $.session.measure({ context: { window: 200_000 }, rateLimits: [], cost: { usd: 1.25 }, changed: ['cost'] })

    const line = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'TurnDuration',
      props: { word: 'Baked', durationMs: 64_000 },
    })
    expect(await line.find({ type: 'Text', text: /\$0\.25 · 2 tools/ })).toBeDefined()
    await line.unmount()
  })
})

describe('sound and notification', () => {
  test('the skin picks the sound unless the person picked one', () => {
    expect(soundFor(SKINS.ring, DEFAULT_PREFS)).toBe('bell')
    expect(soundFor(SKINS.ring, { ...DEFAULT_PREFS, soundName: 'pop' })).toBe('pop')
    expect(soundFor(SKINS.lava, { ...DEFAULT_PREFS, soundName: 'nonsense' })).toBe('gong')
    expect(SKIN_IDS.every(id => SKINS[id].sound !== undefined)).toBe(true)
  })

  test('a notification says how long and what the answer begins with', () => {
    expect(finishedText('KO', '1m 4s', '\nAll tests pass.\nMore below')).toBe('KO in 1m 4s')
    expect(finishedText('KO', '1m 4s', '\nAll tests pass.\nMore below', true)).toBe('KO in 1m 4s · All tests pass.')
    expect(finishedText('Done', '3s', '', true)).toBe('Done in 3s')
    expect(finishedText('Done', '3s', 'x'.repeat(200), true).length).toBeLessThan(110)
  })

  const finish = ($: Engine, durationMs: number) =>
    $.turn.complete({ turnId: 't', reason: 'answer', answer: 'All done.', durationMs, isAborted: false })

  test('off by default: a long turn plays and notifies nothing', async ($, on) => {
    mock.store(on)
    const played: unknown[] = []
    on('audio.play', ($, e) => (played.push(e), { value: undefined }))
    on('ui.notify', ($, e) => (played.push(e), { value: { isSent: true as const, channel: 'test' } }) as never)
    on('turn.complete', () => ({ text: '' }))
    await finish($, 120_000)
    expect(played).toEqual([])
  })

  test('turned on: a long turn plays the skin sound and notifies; a short one does neither', async ($, on) => {
    mock.store(on)
    const played: string[] = []
    const notified: string[] = []
    on('audio.play', ($, e) => {
      played.push(JSON.stringify(e))

      return { value: undefined }
    })
    on('ui.notify', ($, e) => {
      notified.push(e.text)

      return { value: { isSent: true as const, channel: 'test' } } as never
    })
    on('turn.complete', () => ({ text: '' }))

    await runSkin($, 'ring')
    const settings = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'bar-settings',
      props: { ...PANE_PROPS, title: 'Settings' },
    })
    await settings.press({ key: 'tab-sound' })
    await settings.press({ key: 'sound-on' })
    await settings.press({ key: 'notify-on' })
    await settings.unmount()

    await finish($, 5_000)
    expect(played).toEqual([])
    await finish($, 64_000)
    expect(played).toHaveLength(1)
    expect(played[0]).toContain('sounds/bell.wav')
    expect(notified).toEqual(['KO in 1m 4s'])
  })

  test('picking a sound in the settings plays it once', async ($, on) => {
    mock.store(on)
    const played: string[] = []
    on('audio.play', ($, e) => {
      played.push(JSON.stringify(e))

      return { value: undefined }
    })
    const settings = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'bar-settings',
      props: { ...PANE_PROPS, title: 'Settings' },
    })
    await settings.press({ key: 'tab-sound' })
    await settings.press({ key: 'sound-name-gong' })
    await settings.unmount()
    expect(played).toHaveLength(1)
    expect(played[0]).toContain('sounds/gong.wav')
  })
})

describe('usage dashboard', () => {
  test('a sparkline scales to its ceiling, or its largest value, and keeps the newest', () => {
    expect(sparkline([0, 50, 100], 10, 100)).toBe('▁▅█')
    expect(sparkline([1, 2, 4], 10)).toBe('▃▅█')
    expect(sparkline([1, 2, 3, 4, 5], 2)).toBe('▇█')
    expect(sparkline([], 5)).toBe('')
  })

  test('totals add the finished turns up', () => {
    const turn = (costUsd: number | null, tools: number) => ({ durationMs: 1, tokens: 1000, tools, costUsd, costAtStart: 0 })
    const totals = turnTotals([turn(0.1, 2), turn(0.3, 1), turn(null, 0)])
    expect(totals).toMatchObject({ count: 3, tools: 3, tokens: 3000, costs: [0.1, 0.3], priciest: 0.3 })
    expect(Math.round((totals.average ?? 0) * 1000)).toBe(200)
  })

  test('/skin usage opens it with the breakdown; it draws the context, limits, cost and breakdown', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    on('session.usage', () => ({
      value: {
        startedAt: 0,
        rateLimits: [],
        context: {
          window: 200_000,
          breakdown: {
            categories: [
              { name: 'Messages', tokens: 40_000, color: 'claude', isDeferred: false, kind: 'messages' },
              { name: 'System tools', tokens: 12_000, color: 'inactive', isDeferred: false, kind: 'tools' },
              { name: 'Deferred', tokens: 9_000, color: 'inactive', isDeferred: true, kind: 'tools' },
            ],
            totalTokens: 52_000,
            maxTokens: 200_000,
          },
        },
      } as never,
    }))
    await $.session.measure({
      context: { window: 200_000, tokens: 68_000, percent: 34 },
      rateLimits: USAGE.rateLimits,
      cost: { usd: 1.237 },
      changed: ['context', 'rateLimits', 'cost'],
    })

    expect(await runSkin($, 'usage')).toEqual({})
    expect(opened).toEqual(['usage-dashboard'])
    const dashboard = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'usage-dashboard',
      props: { ...PANE_PROPS, title: 'Usage', bodyColumns: 72, placement: 'dock' as const },
    })
    expect(await dashboard.find({ type: 'Text', text: /Opus 5\.5/ })).toBeDefined()
    expect(await dashboard.find({ type: 'Text', text: /34%/ })).toBeDefined()
    expect(await dashboard.find({ type: 'Text', text: /resets in 2h13m/ })).toBeDefined()
    expect(await dashboard.find({ type: 'Text', text: /\$1\.24/ })).toBeDefined()
    expect(await dashboard.find({ type: 'Text', text: /Messages/ })).toBeDefined()
    expect(await dashboard.find({ type: 'Text', text: /Deferred/ })).toBeUndefined()
    expect(await dashboard.find({ key: 'dashboard-refresh' })).toBeDefined()
    await dashboard.unmount()
  })
})

describe('your own skins', () => {
  const recipe = { id: 'night-owl', label: 'Night Owl', base: 'ring' as const, accent: '#4361ee', style: 'dark' as const }

  test('every swatch, in either style, makes a skin whose every text reads', () => {
    for (const accent of [...ACCENTS, '#000000', '#ffffff', '#777777']) {
      for (const style of ['dark', 'vivid', 'light'] as const) {
        const skin = buildSkin({ ...recipe, accent, style })
        for (const paint of [...skin.colors.blocks, skin.colors.warn, skin.colors.danger]) {
          expect(contrast(paint.bg, paint.fg)).toBeGreaterThanOrEqual(4.5)
        }
        const ground = style === 'light' ? '#f6efe6' : '#111116'
        for (const color of [skin.chat.user, skin.chat.assistant, skin.chat.muted, skin.chat.success]) {
          expect(contrast(color, ground)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
  })

  test('a built skin keeps the words and sound of its base', () => {
    const skin = buildSkin(recipe)
    expect(skin.label).toBe('Night Owl')
    expect(skin.spinner.words).toEqual(SKINS.ring.spinner.words)
    expect(skin.sound).toBe('bell')
    expect(skin.isDark).toBe(true)
  })

  test('names make ids that never clash', () => {
    expect(slugFor('Night Owl!', [])).toBe('night-owl')
    expect(slugFor('Night Owl', ['night-owl'])).toBe('night-owl-2')
    expect(slugFor('Ring', [])).toBe('ring-2')
    expect(slugFor('  ', [])).toBe('my-skin')
  })

  test('a recipe is kept only when whole', () => {
    expect(parseRecipe(recipe)).toEqual(recipe)
    expect(parseRecipe({ ...recipe, accent: 'blue' })).toBeUndefined()
    expect(parseRecipe({ ...recipe, base: 'nope' })).toBeUndefined()
    expect(parseRecipe({ ...recipe, style: 'loud' })).toBeUndefined()
    expect(parseRecipe('x')).toBeUndefined()
  })

  test('/skin create builds one in the builder, saves it, wears it, and lists it under Yours', async ($, on) => {
    mock.store(on)
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })
    on('ui.close', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))

    expect(await runSkin($, 'create Night Owl')).toEqual({})
    expect(opened).toEqual(['skin-builder'])
    const builder = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-builder',
      props: { ...PANE_PROPS, title: 'Build a skin', bodyColumns: 64, placement: 'dock' as const },
    })
    expect(await builder.find({ type: 'Text', text: /Preview · Night Owl/ })).toBeDefined()
    await builder.press({ key: 'accent-4361ee' })
    await builder.press({ key: 'base-ring' })
    await builder.press({ key: 'build-style-vivid' })
    await builder.press({ key: 'builder-save' })
    await builder.unmount()

    const list = (await runSkin($, 'list')).text ?? ''
    expect(list).toContain('current: night-owl')
    expect(list).toContain('Yours · #4361ee · vivid, from Ring')

    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: pickerProps('dock'),
    })
    expect(await picker.find({ type: 'Text', text: /── Yours ──/ })).toBeDefined()
    expect(await picker.find({ key: 'night-owl' })).toBeDefined()
    await picker.unmount()
  })

  test('a skin exports as one line, imports under a free id, and deletes', async ($, on) => {
    mock.store(on, { customSkins: [recipe] })
    on('ui.copy', () => ({ value: undefined }) as never)
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    on('session.id', () => ({ value: 'new' }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    const clock = mock.clock(on, { now: 0 })
    await $.session.end({ reason: 'resume', sessionId: 'old', resume: { id: 'old' } })
    await clock.advance(200)

    const exported = (await runSkin($, 'export night-owl')).text ?? ''
    const line = exported.split('\n')[0] ?? ''
    expect(JSON.parse(line)).toEqual(recipe)
    expect((await runSkin($, `import ${line}`)).text).toContain('Skin → Night Owl')
    expect((await runSkin($, 'list')).text).toContain('current: night-owl-2')
    expect((await runSkin($, 'delete night-owl-2')).text).toBe('Deleted night-owl-2.')
    expect((await runSkin($, 'list')).text).toContain('current: midnight')
    expect((await runSkin($, 'export ring')).text).toContain('Export takes one of your own skins')
  })
})

describe('clickable bar', () => {
  test('git status reads into branch, tracking, files and totals', () => {
    const changes = parseStatus(
      '## release/1.2...origin/release/1.2 [ahead 1, behind 2]\0 M hooks/a.ts\0A  new.ts\0R  renamed.ts\0old.ts\0?? notes.txt\0',
      ' 3 files changed, 10 insertions(+), 3 deletions(-)\n',
    )
    expect(changes).toEqual({
      branch: 'release/1.2',
      upstream: 'origin/release/1.2',
      ahead: 1,
      behind: 2,
      files: [
        { code: 'M', path: 'hooks/a.ts' },
        { code: 'A', path: 'new.ts' },
        { code: 'R', path: 'renamed.ts' },
        { code: '??', path: 'notes.txt' },
      ],
      added: 10,
      removed: 3,
    })
    expect(parseStatus('## No commits yet on main\0').branch).toBe('main')
    expect(parseStatus('## HEAD (no branch)\0').branch).toBeNull()
    expect(parseStatus('## main\0')).toMatchObject({ branch: 'main', upstream: null, ahead: 0, behind: 0, files: [] })
  })

  test('odd file names stay whole: arrows, spaces, quotes, unicode, a rename of one', () => {
    const odd = ['notes -> draft.md', 'my file.txt', 'say "hi".md', 'ünïcödé/日本.ts']
    const changes = parseStatus(`## main\0${odd.map(name => ` M ${name}`).join('\0')}\0R  a -> b.md\0old -> name.md\0`)
    expect(changes.files.map(file => file.path)).toEqual([...odd, 'a -> b.md'])
    expect(changes.files.at(-1)?.code).toBe('R')
  })

  test('a click on the context or the cost opens the dashboard; on the branch, the changes', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    const opened: string[] = []
    on('ui.open', ($, e) => {
      opened.push(e.id)

      return { value: { isPlaced: true as const } }
    })
    on('session.repo', () => ({ value: { root: '/repo', remote: null, internal: false, name: 'repo' } }) as never)
    on('fs.stat', ($, e) =>
      ({ value: { kind: e.path.endsWith('/HEAD') ? 'file' : 'dir', size: 21, mtimeMs: 0, isLink: false } }) as never)
    on('fs.read', () => ({ value: 'ref: refs/heads/main\n' }) as never)
    on('ui.toast', () => ({ value: undefined }))
    on('process.run', ($, e) => ({
      value: e.argv.includes('status')
        ? { exitCode: 0, stdout: '## main...origin/main [ahead 1]\0 M a.ts\0?? b.ts\0', stderr: '', isStdoutTruncated: false, isStderrTruncated: false }
        : { exitCode: 0, stdout: ' 2 files changed, 10 insertions(+), 3 deletions(-)\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({
      context: { window: 200_000, tokens: 68_000, percent: 34 },
      rateLimits: USAGE.rateLimits,
      cost: { usd: 1.237 },
      changed: ['context', 'rateLimits', 'cost'],
    })

    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(160) })
    await band.press({ key: 'context-button' })
    await band.press({ key: 'cost-button' })
    await band.press({ key: 'limit-five_hour-button' })
    await band.press({ key: 'branch-button' })
    await band.unmount()
    expect(opened).toEqual(['usage-dashboard', 'usage-dashboard', 'usage-dashboard', 'git-changes'])

    const changes = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'git-changes',
      props: { ...PANE_PROPS, title: 'Changes' },
    })
    expect(await changes.find({ type: 'Text', text: /⎇ main/ })).toBeDefined()
    expect(await changes.find({ type: 'Text', text: /↑1/ })).toBeDefined()
    expect(await changes.find({ type: 'Text', text: /2 files changed/ })).toBeDefined()
    expect(await changes.find({ type: 'Text', text: /\+10/ })).toBeDefined()
    expect(await changes.find({ type: 'Text', text: /b\.ts/ })).toBeDefined()
    await changes.unmount()
  })

  test('outside a repository the changes pane says why', async ($, on) => {
    mock.store(on)
    on('ui.open', () => ({ value: { isPlaced: true as const } }))
    on('process.run', () => ({
      value: { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository\n', isStdoutTruncated: false, isStderrTruncated: false },
    }))
    expect(await runSkin($, 'changes')).toEqual({})
    const changes = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'git-changes',
      props: { ...PANE_PROPS, title: 'Changes' },
    })
    expect(await changes.find({ type: 'Text', text: /not a git repository/ })).toBeDefined()
    await changes.unmount()
  })

  test('with the clickable bar off, only the ⚙ stays a button', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({ context: { window: 200_000, tokens: 68_000, percent: 34 }, rateLimits: [], cost: { usd: 1 }, changed: ['context'] })
    const settings = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'bar-settings',
      props: { ...PANE_PROPS, title: 'Settings' },
    })
    await settings.press({ key: 'tab-look' })
    await settings.press({ key: 'clickable-off' })
    await settings.unmount()

    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(160) })
    expect(await band.find({ key: 'context-button' })).toBeUndefined()
    expect(await band.find({ key: 'skin-button' })).toBeUndefined()
    expect(await band.find({ key: 'settings-button' })).toBeDefined()
    await band.unmount()
  })
})

describe('panes that cannot show', () => {
  test('a command says why: no terminal, or too narrow, and what does the same', async ($, on) => {
    mock.store(on)
    let reason = 'no-surface: no surface is attached'
    on('ui.open', () => ({ value: { isPlaced: false as const, reason } }))
    on('config.list', () => ({ value: [MODEL_ROW] }))
    expect((await runSkin($, 'usage')).text).toBe('The usage dashboard opens in the interactive terminal: /context and /cost say much of it')
    reason = 'narrow'
    expect((await runSkin($, 'model')).text).toBe('The model picker needs a wider terminal: /model and /effort do the same')
  })
})

describe('light skins', () => {
  test('six light skins: their chat reads on a light terminal, every block reads, their bars stay light', () => {
    const light = SKIN_IDS.filter(id => SKINS[id].isLight === true)
    expect(light).toEqual(['paper', 'latte', 'sky', 'mint', 'peach', 'snow'])
    for (const id of light) {
      const { chat, colors } = SKINS[id]
      for (const color of [chat.user, chat.assistant, chat.muted, chat.success]) {
        expect(contrast(color, '#f6efe6')).toBeGreaterThanOrEqual(4.5)
      }
      for (const paint of [...colors.blocks, colors.warn, colors.danger]) {
        expect(contrast(paint.bg, paint.fg)).toBeGreaterThanOrEqual(4.5)
      }
      expect(colors.blocks.slice(1).every(block => contrast(block.bg, '#ffffff') < 1.5)).toBe(true)
    }
  })

  test('a light recipe makes a light skin', () => {
    const skin = buildSkin({ id: 'day', label: 'Day', base: 'snow', accent: '#0369a1', style: 'light' })
    expect(skin.isLight).toBe(true)
    expect(skin.isDark).toBeUndefined()
  })
})

describe('security', () => {
  const ESC = String.fromCharCode(27)
  const BEL = String.fromCharCode(7)
  const RLO = String.fromCharCode(0x202e)
  const evil = `Pwned${ESC}]0;title${BEL}${RLO}txt.exe${ESC}[31m`

  test('control and format characters never survive into drawn or sent text', () => {
    expect(cleanLine(evil)).toBe('Pwned ]0;title txt.exe [31m')
    expect(cleanLine(evil)).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/)
    expect(stripControls('My  skin')).toBe('My  skin')
  })

  test('an imported skin keeps a clean label, a strict id, and nothing else', () => {
    const recipe = { id: 'nice', label: evil, base: 'ring', accent: '#4361ee', style: 'dark' }
    expect(parseRecipe(recipe)?.label).toBe('Pwned ]0;title txt.exe [31m'.slice(0, 32))
    expect(parseRecipe({ ...recipe, label: `${ESC}${BEL}` })?.label).toBe('My skin')
    for (const id of ['../x', 'Bad ID', 'ring', '', 'a'.repeat(40), `x${ESC}`]) {
      expect(parseRecipe({ ...recipe, id })).toBeUndefined()
    }
  })

  test('the notification never carries control characters, and the answer only when asked', () => {
    const answer = `${evil}\nsecond line`
    expect(finishedText('Done', '3s', answer)).toBe('Done in 3s')
    expect(finishedText('Done', '3s', answer, true)).toBe('Done in 3s · Pwned ]0;title txt.exe [31m')
  })

  test('git output is drawn without control characters', () => {
    const changes = parseStatus(`## ma${ESC}in\0 M a${ESC}[2Jb.ts\0`)
    expect(changes.branch).toBe('ma in')
    expect(changes.files[0]?.path).toBe('a [2Jb.ts')
  })

  test('a todo whose activeForm is no string is left out', () => {
    expect(todosOf({ todos: [{ content: 'a', status: 'pending', activeForm: 3 }, { content: 'b', status: 'pending' }] })).toEqual([
      { content: 'b', status: 'pending' },
    ])
  })

  for (const [name, files, expected] of [
    ['a plain checkout shows its branch', { '/repo/.git': ['dir'], '/repo/.git/HEAD': ['file', 'ref: refs/heads/main\n'] }, true],
    ['a worktree pointer is read relative to the repository', {
      '/repo/.git': ['file', 'gitdir: ../main/.git/worktrees/w\n'],
      '/repo/../main/.git/worktrees/w/HEAD': ['file', 'ref: refs/heads/feature\n'],
    }, true],
    ['a HEAD that is a link is not followed', { '/repo/.git': ['dir'], '/repo/.git/HEAD': ['link', 'ref: refs/heads/main\n'] }, false],
    ['a HEAD that is no file (a pipe) is not read', { '/repo/.git': ['dir'], '/repo/.git/HEAD': ['other', ''] }, false],
    ['a branch name with odd characters is not shown', { '/repo/.git': ['dir'], '/repo/.git/HEAD': ['file', `ref: refs/heads/x${ESC}[2J\n`] }, false],
    ['a huge HEAD is not read', { '/repo/.git': ['dir'], '/repo/.git/HEAD': ['file', 'x'.repeat(5000)] }, false],
  ] as const) {
    test(`branch: ${name}`, async ($, on) => {
      mock.store(on)
      mock.clock(on, { now: 0 })
      const table = files as Record<string, readonly [string, string?]>
      on('session.repo', () => ({ value: { root: '/repo', remote: null, internal: false, name: 'repo' } }) as never)
      /** A path with its `..` segments resolved, as the engine may resolve them first. */
      const normal = (path: string) =>
        path.split('/').reduce<string[]>((parts, part) => (part === '..' ? parts.slice(0, -1) : [...parts, part]), []).join('/')
      const at = (path: string) => Object.entries(table).find(([key]) => normal(key) === normal(path))?.[1]
      on('fs.stat', ($, e) => {
        const entry = at(e.path)
        if (entry === undefined) {
          throw new Error('ENOENT')
        }
        const [kind, content = ''] = entry

        return { value: { kind: kind === 'link' ? 'file' : kind, isLink: kind === 'link', size: content.length, mtimeMs: 0 } } as never
      })
      on('fs.read', ($, e) => ({ value: at(e.path)?.[1] ?? '' }) as never)
      on('session.model', () => ({ value: 'claude-opus-5-5' }))
      on('session.measure', ($, e) => ({ changed: e.changed }))
      await $.session.measure({ context: { window: 200_000 }, rateLimits: [], changed: ['context'] })
      const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(160) })
      expect((await band.find({ key: 'branch-button' })) !== undefined).toBe(expected)
      await band.unmount()
    })
  }
})

describe('arrows without icons', () => {
  test('powerline glyphs keep the arrows and the branch mark, and use words for the icons', () => {
    const pills = barPills({ ...RING, glyphs: 'powerline' }, 0)
    expect(pills.find(p => p.key === 'skin')?.text).toBe(`${SKINS.ring.glyph} RING`)
    expect(pills.find(p => p.key === 'model')?.text).toBe('Opus 5.5')
    expect(pills.find(p => p.key === 'context')?.text).toBe('ctx ■■□□□ 34%')
    expect(pills.find(p => p.key === 'limit-five_hour')?.text).toBe('5h ■■■■□ 72% (2h13m)')
    expect(pills.find(p => p.key === 'branch')?.text).toBe('\ue0a0 main')
    expect(pills.every(p => !/[\uf000-\uf8ff]/.test(p.text))).toBe(true)
    expect(barWidth(pills, 'powerline')).toBe(barWidth(pills, 'plain') + pills.length + 1)
  })

  test('/skin glyphs powerline draws arrows and words', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.measure', ($, e) => ({ changed: e.changed }))
    await $.session.measure({ context: { window: 200_000, tokens: 68_000, percent: 34 }, rateLimits: [], changed: ['context'] })
    expect((await runSkin($, 'glyphs powerline')).text).toContain('Glyphs → powerline')
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /\ue0b0|\ue0b4/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /ctx/ })).toBeDefined()
    await band.unmount()
  })
})

describe('picker rows', () => {
  test('text is cut to its cells with an ellipsis', () => {
    expect(truncateCells('Deep navy cards', 9)).toBe('Deep nav…')
    expect(truncateCells('short', 9)).toBe('short')
    expect(truncateCells('日本語のテキスト', 7)).toBe('日本語…')
    expect(displayWidth(truncateCells('日本語のテキスト', 7))).toBeLessThanOrEqual(7)
  })

  test('a narrow picker cuts long descriptions instead of wrapping them', async ($, on) => {
    mock.store(on)
    const picker = await $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: { ...PANE_PROPS, bodyColumns: 60, placement: 'dock' as const },
    })
    expect(await picker.find({ type: 'Text', text: /Deep navy cards, Claude in orange…/ })).toBeDefined()
    expect(await picker.find({ type: 'Text', text: /^Deep navy cards, Claude in orange, you in blue$/ })).toBeUndefined()
    await picker.unmount()
  })
})

describe('picker keys and clicks', () => {
  const mountPicker = ($: Engine) =>
    $.ui.mount({
      plugin: 'cc-skins',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'skin-picker',
      props: { ...PANE_PROPS, bodyColumns: 64, placement: 'dock' as const },
    })
  const arrow = ($: Engine, by: number, offset = 0) =>
    $.ui.scroll({ component: 'Pane', requestId: 'skin-picker', offset: offset + by, by, bodyRows: 12, contentRows: 45, origin: { kind: 'person' } })

  test('the arrows walk the skins with a live preview, and Enter picks the one landed on', async ($, on) => {
    mock.store(on)
    const scrolled: number[] = []
    on('ui.scroll', ($, e) => {
      scrolled.push(e.offset)

      return {}
    })
    on('ui.close', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))
    await runSkin($, 'show skinName')

    await arrow($, 1)
    await arrow($, 1)
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /NEON/ })).toBeDefined()
    await band.unmount()
    expect((await runSkin($, 'list')).text).toContain('current: midnight')
    expect(scrolled).toEqual([0, 0])

    const picker = await mountPicker($)
    await picker.press({ key: 'neon' })
    await picker.unmount()
    expect((await runSkin($, 'list')).text).toContain('current: neon')
  })

  test('far down the list the window follows the row walked onto', async ($, on) => {
    mock.store(on)
    const scrolled: number[] = []
    on('ui.scroll', ($, e) => {
      scrolled.push(e.offset)

      return {}
    })
    await runSkin($, 'snow')
    await arrow($, -1, 20)
    expect(scrolled.at(-1)).toBe(20)
    await arrow($, -1, 0)
    expect(scrolled.at(-1)).toBeGreaterThan(12)
  })

  test('pages and wheel bursts still scroll the window', async ($, on) => {
    mock.store(on)
    const scrolled: number[] = []
    on('ui.scroll', ($, e) => {
      scrolled.push(e.offset)

      return {}
    })
    await $.ui.scroll({ component: 'Pane', requestId: 'skin-picker', offset: 12, by: 12, bodyRows: 12, contentRows: 45, origin: { kind: 'person' } })
    expect(scrolled).toEqual([12])
    expect((await runSkin($, 'list')).text).toContain('current: midnight')
  })

  test('a click or a key previews first; the same again picks', async ($, on) => {
    mock.store(on)
    on('ui.close', () => ({ value: undefined }))
    on('ui.toast', () => ({ value: undefined }))
    await runSkin($, 'show skinName')
    const picker = await mountPicker($)
    await picker.press({ key: 'abyss' })
    expect((await runSkin($, 'list')).text).toContain('current: midnight')
    expect(await picker.find({ type: 'Text', text: /Preview · Abyss/ })).toBeDefined()
    await picker.press({ key: 'lava' })
    expect((await runSkin($, 'list')).text).toContain('current: midnight')
    await picker.press({ key: 'lava' })
    await picker.unmount()
    expect((await runSkin($, 'list')).text).toContain('current: lava')
  })
})

describe('glyphs to start with', () => {
  for (const [os, expected] of [['Windows_NT', 'powerline'], [undefined, 'nerd']] as const) {
    test(`with nothing picked, ${os ?? 'macOS and Linux'} starts with ${expected} glyphs`, async ($, on) => {
      mock.store(on)
      mock.env(on, os === undefined ? {} : { OS: os })
      const clock = mock.clock(on, { now: 0 })
      on('session.id', () => ({ value: 'new' }))
      on('command.register', ($, e) => ({ value: { command: e.name } }))
      on('session.end', ($, e) => ({ sessionId: e.sessionId }))
      on('session.model', () => ({ value: 'claude-opus-5-5' }))
      on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { window: 200_000, percent: 34, tokens: 68_000 } } }) as never)
      await $.session.end({ reason: 'resume', sessionId: 'old', resume: { id: 'old' } })
      await clock.advance(200)
      const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
      expect((await band.find({ type: 'Text', text: /ctx/ })) !== undefined).toBe(expected === 'powerline')
      expect((await band.find({ type: 'Text', text: /\ue0b0|\ue0b4/ })) !== undefined).toBe(true)
      await band.unmount()
    })
  }

  test('a pick outlasts the default', async ($, on) => {
    mock.store(on, { glyphs: 'nerd' })
    mock.env(on, { OS: 'Windows_NT' })
    const clock = mock.clock(on, { now: 0 })
    on('session.id', () => ({ value: 'new' }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    on('session.model', () => ({ value: 'claude-opus-5-5' }))
    on('session.usage', () => ({ value: { startedAt: 0, rateLimits: [], context: { window: 200_000, percent: 34, tokens: 68_000 } } }) as never)
    await $.session.end({ reason: 'resume', sessionId: 'old', resume: { id: 'old' } })
    await clock.advance(200)
    const band = await $.ui.mount({ plugin: 'cc-skins', surface: 'terminal', component: 'AbovePrompt', props: bandProps(140) })
    expect(await band.find({ type: 'Text', text: /ctx/ })).toBeUndefined()
    await band.unmount()
  })
})
