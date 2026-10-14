/**
 * Text from outside the plugin (a shared skin, a repository, the model's
 * answer) loses every control and format character before it is drawn or
 * sent on: ESC, BEL, C1 controls, bidi overrides, zero-width marks. A
 * terminal or a notification hook then gets plain characters only.
 */
const CONTROLS = /[\p{Cc}\p{Cf}]/gu

/** The text with its control and format characters taken out, nothing else changed (for text being typed). */
export const stripControls = (text: string): string => text.replace(CONTROLS, '')

/** The text as one clean line: controls out, runs of whitespace one space, ends trimmed. */
export const cleanLine = (text: string): string => text.replace(CONTROLS, ' ').replace(/\s+/g, ' ').trim()
