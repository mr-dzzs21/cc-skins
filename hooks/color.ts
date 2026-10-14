/** Colors as `#rrggbb`: mixing, hue turns, and the WCAG contrast every skin is held to. */

type Rgb = [number, number, number]

export const isHex = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value)

const toRgb = (hex: string): Rgb => {
  const value = hex.replace('#', '')

  return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16)) as Rgb
}

const toHex = (rgb: Rgb): string =>
  `#${rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`

/** `a` moved toward `b` by `t` (0 is `a`, 1 is `b`). */
export const mix = (a: string, b: string, t: number): string => {
  const [x, y] = [toRgb(a), toRgb(b)]

  return toHex([0, 1, 2].map(i => x[i]! + (y[i]! - x[i]!) * t) as Rgb)
}

export const luminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]

  return (light + 0.05) / (dark + 0.05)
}

/** The least a text and its ground may differ (WCAG AA). */
export const READABLE = 4.5

/** White or near-black, whichever reads better on `bg`. */
export const textOn = (bg: string): string => (contrast(bg, '#ffffff') >= contrast(bg, '#0b0b10') ? '#ffffff' : '#0b0b10')

/**
 * `color` moved toward white (on a dark ground) or black (on a light one)
 * just far enough to read on `ground`.
 */
export const readableOn = (color: string, ground: string): string => {
  const toward = luminance(ground) < 0.5 ? '#ffffff' : '#000000'
  for (let t = 0; t <= 1; t += 0.04) {
    const candidate = mix(color, toward, t)
    if (contrast(candidate, ground) >= READABLE) {
      return candidate
    }
  }

  return toward
}

/** A block whose text reads: the better of white and near-black, the ground darkened or lightened if neither does. */
export const readableBlock = (bg: string): { bg: string; fg: string } => {
  let ground = bg
  for (let step = 0; step < 25 && contrast(ground, textOn(ground)) < READABLE; step++) {
    ground = mix(ground, luminance(ground) < 0.18 ? '#000000' : '#ffffff', 0.08)
  }

  return { bg: ground, fg: textOn(ground) }
}

/** `hex` with its hue turned by `degrees`, saturation and lightness kept. */
export const turnHue = (hex: string, degrees: number): string => {
  const [r, g, b] = toRgb(hex).map(v => v / 255) as Rgb
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) {
    return hex
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  hue = (((hue * 60 + degrees) % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - chroma / 2
  const [r1, g1, b1] =
    hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x]

  return toHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255])
}

/** Color names a person may type for a piece, in English and German, as `#rrggbb`. */
const NAMED: Readonly<Record<string, string>> = {
  red: '#e5484d', rot: '#e5484d',
  orange: '#f76b15',
  yellow: '#f5d90a', gelb: '#f5d90a',
  gold: '#ffc53d',
  lime: '#99d52a',
  green: '#30a46c', grün: '#30a46c', gruen: '#30a46c',
  mint: '#3dd9b4',
  teal: '#12a594', türkis: '#12a594', tuerkis: '#12a594', turquoise: '#12a594',
  cyan: '#00c2d7',
  sky: '#7ce2fe',
  blue: '#0090ff', blau: '#0090ff',
  navy: '#1e3a8a',
  indigo: '#3e63dd',
  purple: '#8e4ec6', lila: '#8e4ec6', violet: '#6e56cf', violett: '#6e56cf',
  magenta: '#d6409f',
  pink: '#e93d82', rosa: '#f4a6c4', rose: '#f4a6c4',
  coral: '#ff7f50', salmon: '#fa8072', lachs: '#fa8072',
  brown: '#a18072', braun: '#a18072',
  white: '#ffffff', weiß: '#ffffff', weiss: '#ffffff',
  black: '#111111', schwarz: '#111111',
  gray: '#8b8d98', grey: '#8b8d98', grau: '#8b8d98',
  silver: '#c0c0c0', silber: '#c0c0c0',
}

/** The color names `parseColor` knows, for a hint. */
export const COLOR_NAMES: readonly string[] = Object.keys(NAMED)

/**
 * A color as typed: `#rrggbb`, `rrggbb`, `#rgb`, or a name (`red`, `blau`);
 * as `#rrggbb`, or undefined for anything else.
 */
export const parseColor = (typed: string): string | undefined => {
  const value = typed.trim().toLowerCase()
  const named = NAMED[value]
  if (named !== undefined) {
    return named
  }
  const hex = value.startsWith('#') ? value.slice(1) : value
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return `#${hex}`
  }
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${[...hex].map(digit => digit + digit).join('')}`
  }

  return undefined
}
