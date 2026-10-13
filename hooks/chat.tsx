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

/** A card's head: an icon on a badge, a bold name, and a quiet note after it. */
const drawCardHead = (
  { Box, Text }: Elements,
  skin: Skin,
  head: { icon: string; name: string; color: string; note?: string },
) => (
  <Box flexDirection="row">
    <Text backgroundColor={skin.chat.border} color={head.color} bold>
      {` ${head.icon} `}
    </Text>
    <Text color={head.color} bold>{` ${head.name}`}</Text>
    {head.note !== undefined && <Text color={skin.chat.muted}>{`  ${head.note}`}</Text>}
  </Box>
)

/** Your message as a card: a framed box headed by who sent it and when. */
export const drawUserCard = (
  elements: Elements,
  skin: Skin,
  message: { text: string; author: string; at?: number },
) => (
  <elements.Box flexDirection="column" borderStyle="round" borderColor={skin.chat.border} paddingX={1}>
    {drawCardHead(elements, skin, {
      icon: '❯',
      name: message.author,
      color: skin.chat.user,
      note: message.at === undefined ? undefined : formatClock(message.at),
    })}
    <elements.Box paddingLeft={4}>
      <elements.Text>{message.text}</elements.Text>
    </elements.Box>
  </elements.Box>
)

/**
 * One block of Claude's reply as a card: the reply's first block opens with
 * Claude's head, and the text hangs off an accent line in Claude's color.
 */
export const drawAssistantBlock = (
  elements: Elements,
  skin: Skin,
  block: { text: string; isFirst: boolean; model?: string },
) => (
  <elements.Box flexDirection="column" borderStyle="round" borderColor={skin.chat.border} paddingX={1}>
    {block.isFirst && drawCardHead(elements, skin, { icon: skin.glyph, name: 'CLAUDE', color: skin.chat.assistant, note: block.model })}
    <elements.Box borderStyle="quote" borderColor={skin.chat.assistant} paddingLeft={1} marginLeft={1}>
      <elements.Markdown text={block.text} />
    </elements.Box>
  </elements.Box>
)

export type Todo = { content: string; status: 'pending' | 'in_progress' | 'completed'; activeForm?: string }

/** The todos a `TodoWrite` call carries, or undefined when its input holds none. */
export const todosOf = (input: unknown): Todo[] | undefined => {
  const todos = (input as { todos?: unknown } | null)?.todos
  if (!Array.isArray(todos)) {
    return undefined
  }

  return todos.filter(
    (todo): todo is Todo =>
      typeof todo === 'object' &&
      todo !== null &&
      typeof (todo as Todo).content === 'string' &&
      ['pending', 'in_progress', 'completed'].includes((todo as Todo).status),
  )
}

/** A todo list as a plan card: done ticked in green, the running one in Claude's color, the rest open. */
export const drawPlanCard = (elements: Elements, skin: Skin, todos: readonly Todo[]) => {
  const { Box, Text } = elements
  const done = todos.filter(todo => todo.status === 'completed').length
  const mark = {
    completed: { icon: '✓', color: skin.chat.success },
    in_progress: { icon: '◐', color: skin.chat.assistant },
    pending: { icon: '○', color: skin.chat.muted },
  } as const

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={skin.chat.border} paddingX={1}>
      {drawCardHead(elements, skin, { icon: '☰', name: 'Plan', color: skin.chat.user, note: `${done}/${todos.length} done` })}
      <Box flexDirection="column" paddingLeft={1} marginTop={1}>
        {todos.map((todo, index) => (
          <Text key={`todo-${index}`}>
            <Text color={mark[todo.status].color} bold>{`${mark[todo.status].icon}  `}</Text>
            <Text
              color={todo.status === 'in_progress' ? skin.chat.assistant : undefined}
              dimColor={todo.status === 'completed'}
              bold={todo.status === 'in_progress'}
            >
              {todo.status === 'in_progress' ? (todo.activeForm ?? todo.content) : todo.content}
            </Text>
          </Text>
        ))}
      </Box>
    </Box>
  )
}

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
