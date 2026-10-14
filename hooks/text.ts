/**
 * Text from outside the plugin (a shared skin, a repository, the model's
 * answer) loses every control and format character before it is drawn or
 * sent on: ESC, BEL, C1 controls, bidi overrides, zero-width marks. A
 * terminal or a notification hook then gets plain characters only.
 */
const CONTROLS = /[\p{Cc}\p{Cf}]/gu

/** Code points a terminal draws two cells wide: East Asian wide and fullwidth forms, and emoji pictographs. */
const WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f], [0x231a, 0x231b], [0x2329, 0x232a], [0x23e9, 0x23ec], [0x23f0, 0x23f0], [0x23f3, 0x23f3],
  [0x25fd, 0x25fe], [0x2614, 0x2615], [0x2648, 0x2653], [0x267f, 0x267f], [0x2693, 0x2693], [0x26a1, 0x26a1],
  [0x26aa, 0x26ab], [0x26bd, 0x26be], [0x26c4, 0x26c5], [0x26ce, 0x26ce], [0x26d4, 0x26d4], [0x26ea, 0x26ea],
  [0x26f2, 0x26f3], [0x26f5, 0x26f5], [0x26fa, 0x26fa], [0x26fd, 0x26fd], [0x2705, 0x2705], [0x270a, 0x270b],
  [0x2728, 0x2728], [0x274c, 0x274c], [0x274e, 0x274e], [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797],
  [0x27b0, 0x27b0], [0x27bf, 0x27bf], [0x2b1b, 0x2b1c], [0x2b50, 0x2b50], [0x2b55, 0x2b55], [0x2e80, 0x303e],
  [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xa960, 0xa97f], [0xac00, 0xd7a3],
  [0xf900, 0xfaff], [0xfe10, 0xfe19], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x16fe0, 0x18aff],
  [0x1b000, 0x1b2ff], [0x1f004, 0x1f004], [0x1f0cf, 0x1f0cf], [0x1f18e, 0x1f18e], [0x1f191, 0x1f19a],
  [0x1f200, 0x1f251], [0x1f300, 0x1f64f], [0x1f680, 0x1f6ff], [0x1f7e0, 0x1f7eb], [0x1f90c, 0x1f9ff],
  [0x1fa70, 0x1faff], [0x20000, 0x3fffd],
]

const isWide = (code: number) => WIDE.some(([from, to]) => code >= from && code <= to)

/** Marks drawn on the character before them, joiners and selectors: no cell of their own. */
const ZERO_WIDTH = /[\p{M}\p{Cf}\u200b\ufe00-\ufe0f]/u

/** Splits text into what a reader sees as single characters (grapheme clusters), where the runtime can. */
const SEGMENTER =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined

export const graphemes = (text: string): string[] =>
  SEGMENTER === undefined ? Array.from(text) : Array.from(SEGMENTER.segment(text), part => part.segment)

/**
 * A cluster a terminal draws as one emoji, two cells: a ZWJ sequence (a
 * family), an emoji presentation selector (`©️`), a keycap (`1️⃣`), a skin
 * tone, a flag's pair of regional indicators.
 */
const EMOJI_SEQUENCE = /\u200d|\ufe0f|\u20e3|[\u{1f3fb}-\u{1f3ff}]|[\u{1f1e6}-\u{1f1ff}]{2}/u

/** The cells one cluster takes: an emoji sequence two, else as its first visible code point. */
const clusterWidth = (cluster: string): number => {
  if (EMOJI_SEQUENCE.test(cluster)) {
    return 2
  }
  for (const char of cluster) {
    if (!ZERO_WIDTH.test(char)) {
      return isWide(char.codePointAt(0) ?? 0) ? 2 : 1
    }
  }

  return 0
}

/**
 * The cells a text takes in a terminal, cluster by cluster as a terminal
 * draws them: a wide character or an emoji sequence two, a combining mark or
 * a joiner on its own none, anything else one.
 */
export const displayWidth = (text: string): number =>
  graphemes(text).reduce((width, cluster) => width + clusterWidth(cluster), 0)

/** The text cut to at most `cells` terminal cells, an ellipsis where it was cut. */
export const truncateCells = (text: string, cells: number): string => {
  if (displayWidth(text) <= cells) {
    return text
  }
  let out = ''
  let width = 0
  for (const cluster of graphemes(text)) {
    const next = clusterWidth(cluster)
    if (width + next > cells - 1) {
      break
    }
    out += cluster
    width += next
  }

  return cells <= 0 ? '' : `${out}…`
}

/** The text with its control and format characters taken out, nothing else changed (for text being typed). */
export const stripControls = (text: string): string => text.replace(CONTROLS, '')

/** The text as one clean line: controls out, runs of whitespace one space, ends trimmed. */
export const cleanLine = (text: string): string => text.replace(CONTROLS, ' ').replace(/\s+/g, ' ').trim()
