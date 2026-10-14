import type { GitChanges } from '../types'
import type { Elements } from './panels'
import type { Skin } from './skins'
import { cleanLine, displayWidth } from './text'

/** The pane a press on the bar's branch opens. */
export const GIT_PANE = 'git-changes'
export const GIT_ROWS = 18

/** How many changed files the pane lists before saying how many more. */
const MAX_FILES = 12

/** What the commands behind the pane run: read-only, as the person's own git would. */
const QUIET_GIT = ['git', '--no-optional-locks', '-c', 'core.fsmonitor=false'] as const
export const GIT_STATUS = [...QUIET_GIT, 'status', '--porcelain=v1', '-z', '--branch'] as const
export const GIT_SHORTSTAT = [...QUIET_GIT, 'diff', '--no-ext-diff', '--no-textconv', '--shortstat', 'HEAD'] as const

/**
 * `git status --porcelain=v1 -z --branch`, read: entries end in NUL, the
 * branch entry first (`## main...origin/main [ahead 1, behind 2]`), then
 * `XY path` per file, a rename or copy (`R`, `C`) followed by its original
 * path as an entry of its own. Paths come raw: no quoting, ` -> ` just text.
 */
export const parseStatus = (status: string, shortstat = ''): GitChanges => {
  const entries = status.split('\0').filter(entry => entry !== '')
  const lines: string[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i] ?? ''
    lines.push(entry)
    if (!entry.startsWith('## ') && /[RC]/.test(entry.slice(0, 2))) {
      i += 1
    }
  }
  const head = lines[0]?.startsWith('## ') ? lines[0].slice(3) : ''
  const bracket = head.indexOf(' [')
  const refs = (bracket >= 0 ? head.slice(0, bracket) : head).replace(/^No commits yet on /, '')
  const tracking = bracket >= 0 ? head.slice(bracket + 2, -1) : ''
  const [branch = '', upstream] = refs.split('...')
  const files = lines
    .filter(line => !line.startsWith('## '))
    .map(line => ({ code: cleanLine(line.slice(0, 2)) || '?', path: cleanLine(line.slice(3)) }))

  return {
    branch: branch === '' || branch.startsWith('HEAD') ? null : cleanLine(branch).slice(0, 100),
    upstream: upstream === undefined ? null : cleanLine(upstream).slice(0, 100),
    ahead: Number(/ahead (\d+)/.exec(tracking)?.[1] ?? 0),
    behind: Number(/behind (\d+)/.exec(tracking)?.[1] ?? 0),
    files,
    added: Number(/(\d+) insertions?/.exec(shortstat)?.[1] ?? 0),
    removed: Number(/(\d+) deletions?/.exec(shortstat)?.[1] ?? 0),
  }
}

/**
 * Whether a branch name is one git takes and the bar may show: any script,
 * but no control, format or space character, none of git's forbidden
 * `~ ^ : ? * [ \\`, no `..`, `@{`, `//` or component starting with `.`, not
 * starting or ending with `/` or `.`, not ending in `.lock`, at most 100 cells.
 */
export const isBranchName = (name: string): boolean =>
  name !== '' &&
  name !== '@' &&
  displayWidth(name) <= 100 &&
  !/[\p{Cc}\p{Cf}\s~^:?*[\\]/u.test(name) &&
  !/\.\.|@\{|\/\/|\/\.|^[/.]|[/.]$|\.lock$/.test(name)

/** The color a change's code reads in: added green, deleted red, modified amber, untracked quiet. */
const codeColor = (skin: Skin, code: string): string =>
  code.includes('A')
    ? skin.chat.success
    : code.includes('D')
      ? skin.colors.danger.bg
      : code.includes('?')
        ? skin.chat.muted
        : code.includes('R')
          ? skin.chat.user
          : skin.colors.warn.bg

/** How many of the changes are files git does not track yet (`??`). */
const untrackedCount = (changes: GitChanges) => changes.files.filter(file => file.code === '??').length

/** The changes pane: the branch and how it stands to its upstream, the line totals, the changed files. */
export const drawChanges = (
  elements: Elements,
  skin: Skin,
  changes: GitChanges | null,
  error: string | null,
  refresh: () => void,
) => {
  const { Box, Text, Button } = elements
  if (changes === null) {
    return (
      <Box flexDirection="column">
        <Text color={skin.chat.muted}>{error ?? 'Reading git status…'}</Text>
        <Button key="git-refresh" label="Refresh" onPress={refresh} />
      </Box>
    )
  }
  const tracking = [changes.ahead > 0 ? `↑${changes.ahead}` : '', changes.behind > 0 ? `↓${changes.behind}` : '']
    .filter(part => part !== '')
    .join(' ')

  return (
    <Box flexDirection="column">
      <Text key="branch" bold>
        <Text color={skin.chat.assistant}>{`⎇ ${changes.branch ?? 'detached HEAD'}`}</Text>
        {tracking !== '' && <Text color={skin.chat.user}>{`  ${tracking}`}</Text>}
        {changes.upstream !== null && <Text color={skin.chat.muted}>{`  ${changes.upstream}`}</Text>}
      </Text>
      <Text key="totals" color={skin.chat.muted}>
        {changes.files.length === 0
          ? 'Nothing changed: the working tree is clean.'
          : `${changes.files.length} ${changes.files.length === 1 ? 'file' : 'files'} changed`}
        {changes.added + changes.removed > 0 && (
          <Text>
            {' · tracked '}
            <Text color={skin.chat.success}>{`+${changes.added}`}</Text> <Text color={skin.colors.danger.bg}>{`−${changes.removed}`}</Text>
          </Text>
        )}
        {untrackedCount(changes) > 0 && <Text>{` · ${untrackedCount(changes)} untracked, not in the line count`}</Text>}
      </Text>
      {changes.files.slice(0, MAX_FILES).map(file => (
        <Text key={`file-${file.path}`} wrap="truncate-middle">
          <Text color={codeColor(skin, file.code)}>{` ${file.code.padEnd(2)} `}</Text>
          {file.path}
        </Text>
      ))}
      {changes.files.length > MAX_FILES && (
        <Text key="more" color={skin.chat.muted}>{`  … ${changes.files.length - MAX_FILES} more`}</Text>
      )}
      <Box key="git-actions" flexDirection="row" marginTop={1}>
        <Button key="git-refresh" label="Refresh" onPress={refresh} />
      </Box>
      <Text key="hint" color={skin.chat.muted}>
        {'Esc closes · read with git status, nothing changed'}
      </Text>
    </Box>
  )
}
