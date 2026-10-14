/**
 * Draws the README's drawn pictures from the plugin's own code:
 * `docs/skins.svg`, every built-in skin's bar from `barPills`, its caps and
 * arrows drawn as shapes so it needs no Nerd Font, and `docs/banner.svg`, the
 * wordmark in the skins' colors. (The screenshots come from a real session:
 * scripts/screens/.)
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
import { barPills } from '../hooks/hud'
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
    } else if (following.paint.bg === pill.paint.bg) {
      // two blocks of one color: a thin arrow in the text's color, as the bar draws it
      parts.push(`<rect x="${px(x)}" y="${y}" width="${px(CELL + 0.5)}" height="${ROW}" fill="${pill.paint.bg}"/>`)
      parts.push(`<path d="M${px(x + 1)} ${y + 2}L${px(x + CELL - 1)} ${y + ROW / 2}L${px(x + 1)} ${y + ROW - 2}" stroke="${pill.paint.fg}" stroke-width="1.2" fill="none"/>`)
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

/** The wordmark's letters, each on a block in a skin's color: Ring's gold to Nebula's violet to Aurora's teal. */
const BANNER_BLOCKS: readonly (readonly [Skin['id'], number])[] = [
  ['ring', 0], ['ring', 1], ['ring', 2], ['neon', 0], ['neon', 1], ['nebula', 0], ['abyss', 0], ['aurora', 0],
]

/**
 * The README's banner: `cc-skins` as a powerline of eight blocks in the
 * skins' own colors, the tagline under it.
 */
const renderBanner = (): string => {
  const width = 960
  const height = 250
  const block = 76
  const arrow = 26
  const tall = 84
  const letters = [...'cc-skins']
  const paints = BANNER_BLOCKS.map(([id, index]) => SKINS[id].colors.blocks[index] ?? { bg: '#444444', fg: '#ffffff' })
  const total = letters.length * block + (letters.length + 1) * arrow
  let x = (width - total) / 2
  const y = 40
  const parts: string[] = []
  const first = paints[0]
  if (first !== undefined) {
    parts.push(`<path d="M${px(x + arrow)} ${y}A${arrow} ${tall / 2} 0 0 0 ${px(x + arrow)} ${y + tall}Z" fill="${first.bg}"/>`)
  }
  x += arrow
  letters.forEach((letter, index) => {
    const paint = paints[index] ?? { bg: '#444444', fg: '#ffffff' }
    const next = paints[index + 1]
    parts.push(`<rect x="${px(x)}" y="${y}" width="${block + 0.5}" height="${tall}" fill="${paint.bg}"/>`)
    parts.push(`<text x="${px(x + block / 2)}" y="${y + 60}" fill="${paint.fg}" font-size="58" font-weight="800" text-anchor="middle">${escape(letter)}</text>`)
    x += block
    parts.push(
      next === undefined
        ? `<path d="M${px(x)} ${y}A${arrow} ${tall / 2} 0 0 1 ${px(x)} ${y + tall}Z" fill="${paint.bg}"/>`
        : `<rect x="${px(x)}" y="${y}" width="${arrow + 0.5}" height="${tall}" fill="${next.bg}"/><path d="M${px(x)} ${y}L${px(x + arrow)} ${y + tall / 2}L${px(x)} ${y + tall}Z" fill="${paint.bg}"/>`,
    )
    x += arrow
  })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONTS}" role="img" aria-label="cc-skins: your limits, your model, your look. A clickable bar and skins for Claude Code">`,
    `<defs><linearGradient id="night" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0f1a"/><stop offset="1" stop-color="#1a0f2e"/></linearGradient></defs>`,
    `<rect width="${width}" height="${height}" rx="18" fill="url(#night)"/>`,
    ...parts,
    `<text x="${width / 2}" y="${y + tall + 54}" fill="#e6edf3" font-size="25" font-weight="700" text-anchor="middle">Your limits, your model, your look</text>`,
    `<text x="${width / 2}" y="${y + tall + 88}" fill="#8b949e" font-size="16" text-anchor="middle">A clickable bar and ${Object.keys(SKINS).length} skins for Claude Code · one command to install · no network</text>`,
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
writeFileSync(join(ROOT, 'docs/banner.svg'), renderBanner())
writeFileSync(join(ROOT, 'docs/skins.svg'), renderGallery())
console.log(`docs/banner.svg · docs/skins.svg: ${Object.keys(SKINS).length} skins`)
