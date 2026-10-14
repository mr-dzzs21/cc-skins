/**
 * Draws the README's pictures from the plugin's own code, so they show what
 * the bar really draws: `docs/hero.svg` (a terminal cycling through a few
 * skins: a chat, a turn line, the bar, the prompt) and `docs/skins.svg` (every
 * built-in skin's bar). Blocks, colors and text come from `barPills` and
 * `turnPills`; the powerline caps and arrows are drawn as shapes, so the
 * pictures need no Nerd Font.
 *
 *     npx -y tsx@4.19.2 scripts/render_previews.ts
 *
 * Run it again after a skin is added or changed (check_assets.py checks that
 * every skin is in the gallery).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { BarInput, Pill } from '../hooks/hud'
import { barPills, turnPills } from '../hooks/hud'
import type { Skin } from '../hooks/skins'
import { SKINS } from '../hooks/skins'
import { displayWidth } from '../hooks/text'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** One terminal cell: its width, a row's height, the text's size and baseline. */
const CELL = 8.4
const ROW = 22
const FONT = 14
const BASELINE = 15
const FONTS = `'JetBrains Mono','SF Mono','Cascadia Code',Menlo,Consolas,'DejaVu Sans Mono',monospace`

/** The branch mark in a Nerd Font; the pictures use the plain one. */
const NERD_BRANCH = ''

/** A frozen moment: an hour before the 5-hour window resets, three days before the week's. */
const NOW = Date.UTC(2026, 9, 14, 12, 0)
const inHours = (hours: number) => new Date(NOW + hours * 3_600_000).toISOString()

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const px = (n: number) => Number(n.toFixed(2))

/** The terminal's own colors for a skin, from its Ghostty scheme. */
const terminalOf = (skin: Skin): { bg: string; fg: string } => {
  const scheme = readFileSync(join(ROOT, 'extras/terminal/ghostty', `cc-skins-${skin.id}`), 'utf8')
  const color = (key: string) => new RegExp(`^${key} = (#[0-9a-fA-F]{6})$`, 'm').exec(scheme)?.[1]

  return { bg: color('background') ?? '#000000', fg: color('foreground') ?? '#ffffff' }
}

/** Text that takes exactly its cells, whatever font the viewer has. */
const text = (x: number, y: number, content: string, color: string, isBold = false) =>
  content.trim() === ''
    ? ''
    : `<text x="${px(x)}" y="${px(y + BASELINE)}" fill="${color}"${isBold ? ' font-weight="700"' : ''} textLength="${px(displayWidth(content) * CELL)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${escape(content)}</text>`

/**
 * A powerline row at cell `x`: a round cap, each block on its background, an
 * arrow in its color over the next, a round cap to end. Returns the drawing
 * and the cells it took.
 */
const powerline = (pills: readonly Pill[], x0: number, y: number): { svg: string; cells: number } => {
  const parts: string[] = []
  let x = x0
  const first = pills[0]
  if (first === undefined) {
    return { svg: '', cells: 0 }
  }
  parts.push(`<path d="M${px(x + CELL)} ${y}A${CELL} ${ROW / 2} 0 0 0 ${px(x + CELL)} ${y + ROW}Z" fill="${first.paint.bg}"/>`)
  x += CELL
  pills.forEach((pill, index) => {
    const content = ` ${pill.text.replace(NERD_BRANCH, '⎇')} `
    const width = displayWidth(content) * CELL
    parts.push(`<rect x="${px(x)}" y="${y}" width="${px(width + 0.5)}" height="${ROW}" fill="${pill.paint.bg}"/>`)
    parts.push(text(x, y, content, pill.paint.fg, pill.isBold === true))
    x += width
    const following = pills[index + 1]
    if (following === undefined) {
      parts.push(`<path d="M${px(x)} ${y}A${CELL} ${ROW / 2} 0 0 1 ${px(x)} ${y + ROW}Z" fill="${pill.paint.bg}"/>`)
    } else {
      parts.push(`<rect x="${px(x)}" y="${y}" width="${px(CELL + 0.5)}" height="${ROW}" fill="${following.paint.bg}"/>`)
      parts.push(`<path d="M${px(x)} ${y}L${px(x + CELL)} ${y + ROW / 2}L${px(x)} ${y + ROW}Z" fill="${pill.paint.bg}"/>`)
    }
    x += CELL
  })

  return { svg: parts.join(''), cells: (x - x0) / CELL }
}

/** The bar as a session shows it mid-afternoon: Opus at xhigh on main, a third of the context, half the 5-hour window. */
const barInput = (skin: Skin, hidden: BarInput['hidden']): BarInput => ({
  skin,
  usage: {
    model: 'claude-opus-5-5',
    contextPercent: 34,
    contextTokens: 68_000,
    rateLimits: [
      { kind: 'five_hour', percentUsed: 52, resetsAt: inHours(2.2) },
      { kind: 'seven_day', percentUsed: 18, resetsAt: inHours(76) },
    ],
    costUsd: 1.24,
    startedAt: NOW - 3_600_000,
  } as BarInput['usage'],
  branch: 'main',
  now: NOW,
  glyphs: 'powerline',
  isWorking: false,
  frame: 0,
  hidden,
  effort: 'xhigh',
  compactAt: null,
})

/** A rounded card frame `cells` wide and `rows` high, as Ink draws `borderStyle="round"`. */
const card = (x: number, y: number, cells: number, rows: number, color: string) =>
  `<rect x="${px(x + CELL / 2)}" y="${px(y + ROW / 2)}" width="${px((cells - 1) * CELL)}" height="${px((rows - 1) * ROW)}" rx="7" fill="none" stroke="${color}" stroke-width="1.4"/>`

/** A card's head: an icon on a badge, a bold name, a quiet note. */
const cardHead = (x: number, y: number, skin: Skin, head: { icon: string; name: string; color: string; note: string }) => {
  const badge = ` ${head.icon} `
  const badgeWidth = displayWidth(badge) * CELL

  return [
    `<rect x="${px(x)}" y="${y}" width="${px(badgeWidth)}" height="${ROW}" fill="${skin.chat.border}"/>`,
    text(x, y, badge, head.color, true),
    text(x + badgeWidth, y, ` ${head.name}`, head.color, true),
    text(x + badgeWidth + displayWidth(` ${head.name}`) * CELL, y, `  ${head.note}`, skin.chat.muted),
  ].join('')
}

/** One skin's frame of the hero: a short chat, its turn line, the bar, the prompt and its hint. */
const heroFrame = (skin: Skin, columns: number, top: number, left: number): string => {
  const theme = JSON.parse(readFileSync(join(ROOT, 'themes', `${skin.id}.json`), 'utf8')) as { overrides: Record<string, string> }
  const promptBorder = theme.overrides.promptBorder ?? skin.chat.border
  const { fg } = terminalOf(skin)
  const width = columns - 2
  const at = (row: number) => top + row * ROW
  const inner = left + 2 * CELL
  const parts: string[] = []

  parts.push(card(left, at(0), width, 4, skin.chat.border))
  parts.push(cardHead(inner, at(1), skin, { icon: '❯', name: 'You', color: skin.chat.user, note: '14:23' }))
  parts.push(text(inner + 4 * CELL, at(2), 'Add a dark mode switch to the settings page', fg))

  parts.push(card(left, at(4), width, 5, skin.chat.border))
  parts.push(cardHead(inner, at(5), skin, { icon: skin.glyph, name: 'CLAUDE', color: skin.chat.assistant, note: 'Opus 5.5' }))
  parts.push(`<rect x="${px(inner + CELL)}" y="${at(6) + 2}" width="2.5" height="${ROW * 2 - 4}" fill="${skin.chat.assistant}"/>`)
  parts.push(text(inner + 3 * CELL, at(6), 'Added the switch to Settings › Appearance; it follows', fg))
  parts.push(text(inner + 3 * CELL, at(7), 'the system until you pick, and the choice is saved.', fg))

  const word = skin.turn.words[0] ?? 'Done'
  parts.push(powerline(turnPills(skin, word, 12_000, 'powerline', '$0.04 · 3 tools'), left, at(10)).svg)

  parts.push(powerline(barPills(barInput(skin, []), 0), left, at(12)).svg)

  parts.push(card(left, at(13), width, 3, promptBorder))
  parts.push(text(inner, at(14), '>', fg, true))
  parts.push(`<rect x="${px(inner + 2 * CELL)}" y="${at(14) + 3}" width="${px(CELL)}" height="${ROW - 6}" fill="${fg}" opacity=".75"/>`)
  parts.push(text(left + CELL, at(16), '/ commands · @ files · ! shell · ↵ send · ? shortcuts', skin.chat.muted))

  return parts.join('')
}

/** Skins the hero cycles through: a mix of vivid, dark and light. */
const HERO_SKINS = ['ring', 'midnight', 'synthwave', 'nebula', 'paper', 'neon', 'aurora', 'peach'] as const
const HERO_SECONDS = 3
/** The rows a hero frame takes. */
const HERO_ROWS = 17

const renderHero = (): string => {
  const columns = 112
  const pad = 18
  const titleBar = 30
  const width = Math.round(columns * CELL + pad * 2)
  const height = titleBar + 10 + HERO_ROWS * ROW + pad
  const cycle = HERO_SKINS.length * HERO_SECONDS
  /** Each skin's share of the cycle; it stays in until the next has faded in over it, so nothing shows through. */
  const share = 100 / HERO_SKINS.length

  const frames = HERO_SKINS.map((id, index) => {
    const skin = SKINS[id]
    const { bg, fg } = terminalOf(skin)

    return [
      `<g class="frame${index === 0 ? ' first' : ''}" style="animation-delay:${index * HERO_SECONDS}s">`,
      `<rect width="${width}" height="${height}" rx="12" fill="${bg}"/>`,
      `<path d="M0 12a12 12 0 0 1 12-12h${width - 24}a12 12 0 0 1 12 12v${titleBar - 12}H0Z" fill="${fg}" opacity=".08"/>`,
      `<text x="${width / 2}" y="20" fill="${skin.chat.muted}" text-anchor="middle" font-size="12">claude · cc-skins · ${escape(skin.label)}</text>`,
      heroFrame(skin, columns, titleBar + 10, pad),
      `</g>`,
    ].join('')
  })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONTS}" font-size="${FONT}" role="img" aria-label="Claude Code with cc-skins: chat cards, a turn line and the usage bar, in ${HERO_SKINS.length} skins">`,
    `<style>`,
    `.frame{opacity:0;animation:show ${cycle}s infinite backwards}`,
    `.first{opacity:1}`,
    `@keyframes show{0%{opacity:0}1%{opacity:1}${px(share + 1)}%{opacity:1}${px(share + 1.5)}%{opacity:0}100%{opacity:0}}`,
    `@media (prefers-reduced-motion:reduce){.frame{animation:none}}`,
    `</style>`,
    `<clipPath id="window"><rect width="${width}" height="${height}" rx="12"/></clipPath>`,
    `<g clip-path="url(#window)">`,
    ...frames,
    `<circle cx="20" cy="15" r="5.5" fill="#ff5f57"/><circle cx="38" cy="15" r="5.5" fill="#febc2e"/><circle cx="56" cy="15" r="5.5" fill="#28c840"/>`,
    `</g>`,
    `</svg>`,
    '',
  ].join('\n')
}

/** Every built-in skin's bar on its own terminal background, grouped as the picker groups them. */
const renderGallery = (): string => {
  const all = Object.values(SKINS)
  const groups: [string, Skin[]][] = [
    ['Vivid', all.filter(skin => skin.isDark !== true && skin.isLight !== true)],
    ['Dark', all.filter(skin => skin.isDark === true)],
    ['Light', all.filter(skin => skin.isLight === true)],
  ]
  const pad = 14
  const gap = 6
  const heading = 34
  const label = 12
  const rows: string[] = []
  let y = 0
  let widest = 0

  for (const [title, skins] of groups) {
    rows.push(`<text class="heading" x="2" y="${y + 22}" font-size="15" font-weight="700">${title}</text>`)
    y += heading
    for (const skin of skins) {
      const { bg, fg } = terminalOf(skin)
      const height = ROW + pad
      const bar = powerline(barPills(barInput(skin, ['resets']), 0), pad + label * CELL, y + pad / 2)
      const rowWidth = pad * 2 + (label + bar.cells) * CELL
      widest = Math.max(widest, rowWidth)
      rows.push(
        `<g data-skin="${skin.id}"><rect y="${y}" width="ROW_WIDTH" height="${height}" rx="8" fill="${bg}"/>`,
        text(pad, y + pad / 2, `${skin.id}`, fg, true),
        bar.svg,
        `</g>`,
      )
      y += height + gap
    }
    y += gap
  }

  const width = Math.ceil(widest)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.ceil(y)}" viewBox="0 0 ${width} ${Math.ceil(y)}" font-family="${FONTS}" font-size="${FONT}" role="img" aria-label="The usage bar in each of the ${all.length} built-in skins">`,
    `<style>.heading{fill:#57606a}@media (prefers-color-scheme:dark){.heading{fill:#8b949e}}</style>`,
    ...rows.map(row => row.replace('ROW_WIDTH', String(width))),
    `</svg>`,
    '',
  ].join('\n')
}

mkdirSync(join(ROOT, 'docs'), { recursive: true })
writeFileSync(join(ROOT, 'docs/hero.svg'), renderHero())
writeFileSync(join(ROOT, 'docs/skins.svg'), renderGallery())
console.log(`docs/hero.svg: ${HERO_SKINS.length} skins · docs/skins.svg: ${Object.keys(SKINS).length} skins`)
