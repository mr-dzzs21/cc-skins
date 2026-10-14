import type { Prefs, SoundName } from '../types'
import type { Skin } from './skins'
import { cleanLine } from './text'

/** The sounds in `sounds/`, as the settings list them. */
export const SOUNDS: readonly { name: SoundName; label: string }[] = [
  { name: 'bell', label: 'Bell' },
  { name: 'chime', label: 'Chime' },
  { name: 'beep', label: 'Beep' },
  { name: 'blip', label: 'Blip' },
  { name: 'gong', label: 'Gong' },
  { name: 'pop', label: 'Pop' },
]

export const isSoundName = (value: unknown): value is SoundName => SOUNDS.some(({ name }) => name === value)

/** The plugin's own file for a sound, as `$.audio.play({ asset })` takes it. */
export const soundAsset = (name: SoundName) => `sounds/${name}.wav`

/** The sound a turn plays: the one the person picked, or the skin's own. */
export const soundFor = (skin: Skin, prefs: Prefs): SoundName =>
  isSoundName(prefs.soundName) ? prefs.soundName : skin.sound

/**
 * What a finished turn's notification says: how long it took, and with
 * `withAnswer` the answer's first line, its control characters taken out
 * (the text goes to the person's notification hooks and channel as given).
 */
export const finishedText = (word: string, duration: string, answer: string, withAnswer = false): string => {
  const line = withAnswer ? cleanLine(answer.split('\n').find(one => one.trim() !== '') ?? '') : ''
  const short = line.length > 90 ? `${line.slice(0, 89)}…` : line

  return short === '' ? `${word} in ${duration}` : `${word} in ${duration} · ${short}`
}
