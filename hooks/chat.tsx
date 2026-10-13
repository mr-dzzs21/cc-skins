import type { BoxProps, ElementConstructor, MarkdownProps, RenderElement, TextProps } from 'claude-code'

import type { SentPrompt } from '../types'
import type { Skin } from './skins'

/** The elements every surface's table carries that the chat's cards use. */
type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Markdown: ElementConstructor<MarkdownProps>
}

/** The hint under an empty prompt, in place of the engine's `? for shortcuts`. */
export const IDLE_HINT = '/ commands · @ files · ! shell · ↵ send · ? shortcuts'

const pad = (n: number) => String(n).padStart(2, '0')

/** `14:23`, in the machine's time zone. */
export const formatClock = (at: number): string => {
  const date = new Date(at)

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** When the newest prompt with this text was sent; undefined when this session never saw it sent. */
export const sentAt = (prompts: readonly SentPrompt[], text: string): number | undefined => {
  const wanted = text.trim()
  for (let i = prompts.length - 1; i >= 0; i--) {
    const prompt = prompts[i]
    if (prompt !== undefined && prompt.text.trim() === wanted) {
      return prompt.at
    }
  }

  return undefined
}

/** Your message as a card: a framed box headed by who sent it and when. */
export const drawUserCard = (
  { Box, Text }: Elements,
  skin: Skin,
  message: { text: string; author: string; at?: number },
) => (
  <Box flexDirection="column" borderStyle="round" borderColor={skin.chat.border} paddingX={1}>
    <Box flexDirection="row">
      <Text color={skin.chat.user} bold>
        {`❯ ${message.author}`}
      </Text>
      {message.at !== undefined && <Text color={skin.chat.muted}>{`  ${formatClock(message.at)}`}</Text>}
    </Box>
    <Text>{message.text}</Text>
  </Box>
)

/**
 * One block of Claude's reply: the reply's first block opens with a header,
 * and every block hangs off an accent line in Claude's color.
 */
export const drawAssistantBlock = (
  { Box, Text, Markdown }: Elements,
  skin: Skin,
  block: { text: string; isFirst: boolean; model?: string },
) => (
  <Box flexDirection="column" marginTop={block.isFirst ? 1 : 0}>
    {block.isFirst && (
      <Box flexDirection="row">
        <Text color={skin.chat.assistant} bold>
          {`${skin.glyph} CLAUDE`}
        </Text>
        {block.model !== undefined && <Text color={skin.chat.muted}>{`  ${block.model}`}</Text>}
      </Box>
    )}
    <Box borderStyle="quote" borderColor={skin.chat.assistant} paddingLeft={1}>
      <Markdown text={block.text} />
    </Box>
  </Box>
)

/** The engine's own drawing of a tool call or a command's output, framed as a card. */
export const drawCard = ({ Box }: Elements, skin: Skin, inner: RenderElement) => (
  <Box flexDirection="column" borderStyle="round" borderColor={skin.chat.border} paddingX={1}>
    {inner}
  </Box>
)

/** The footer's mode labels as badges. */
export const drawModeBadges = ({ Box, Text }: Elements, skin: Skin, modes: readonly string[]) => (
  <Box flexDirection="row" gap={1}>
    {modes.map(mode => (
      <Text key={mode} backgroundColor={skin.chat.border} color={skin.chat.user}>
        {` ${mode} `}
      </Text>
    ))}
  </Box>
)
