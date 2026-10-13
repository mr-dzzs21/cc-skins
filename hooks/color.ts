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
