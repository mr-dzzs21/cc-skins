/** This release of cc-skins; check_assets.py checks it is the manifest's version. */
export const CC_SKINS_VERSION = '0.19.0'

/** The oldest Claude Code cc-skins works on: the tests pass from here (CI runs them on it and on the newest). */
export const MIN_CLAUDE_CODE = '2.1.295'

/** Where a bug report goes. */
export const ISSUES = 'https://github.com/mr-dzzs21/cc-skins/issues/new?template=bug_report.yml'

/** A version's numbers (`2.1.299-dev.2026…` reads as 2, 1, 299); empty where it has none. */
const numbers = (version: string): number[] =>
  (/^(\d+)\.(\d+)\.(\d+)/.exec(version.trim())?.slice(1) ?? []).map(Number)

/** Whether `version` is older than `min`; a version that doesn't read as one is not called older. */
export const isOlder = (version: string, min: string): boolean => {
  const [a, b] = [numbers(version), numbers(min)]
  if (a.length === 0 || b.length === 0) {
    return false
  }
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) < (b[i] ?? 0)
    }
  }

  return false
}

/** What to tell someone whose Claude Code is too old for cc-skins. */
export const tooOldText = (version: string): string =>
  `cc-skins needs Claude Code ${MIN_CLAUDE_CODE} or newer, and this is ${version}: run \`claude install latest\`, or wait until your update channel reaches it`

/** Everything `/skin doctor` looks at, read by the hooks; null where it could not be read. */
export type DoctorFacts = {
  claudeCode: string | null
  os: string | null
  terminal: string | null
  colorTerm: string | null
  skin: string
  isOwnSkin: boolean
  glyphs: string
  barStyle: string
  isChatStyled: boolean
  isHudHidden: boolean
  hidden: readonly string[]
  model: string | null
  contextPercent: number | null
  limitsAgeMin: number | null
  costUsd: number | null
  branch: string | null
  isGitStatusOn: boolean
  gitError: string | null
  isStoreOk: boolean
}

/** What a reading of `facts` suggests doing, most pressing first. */
export const doctorHints = (facts: DoctorFacts): string[] => {
  const hints: string[] = []
  if (facts.claudeCode !== null && isOlder(facts.claudeCode, MIN_CLAUDE_CODE)) {
    hints.push(`${tooOldText(facts.claudeCode)}.`)
  }
  if (!facts.isStoreOk) {
    hints.push('Claude Code would not read the plugin store: your choices hold for this session only.')
  }
  if (facts.isHudHidden) {
    hints.push('The bar is hidden: /skin hud on shows it.')
  }
  if (facts.glyphs === 'nerd' && facts.os === 'Windows') {
    hints.push('Icons need a Nerd Font set in the terminal; boxes or question marks in the bar: /skin glyphs powerline.')
  }
  if (facts.colorTerm === null) {
    hints.push('The terminal does not say it draws 24-bit color (COLORTERM): colors may come out close but not exact.')
  }
  if (facts.isGitStatusOn && facts.gitError !== null) {
    hints.push(`Git status is on but git did not answer: ${facts.gitError}`)
  }
  if (facts.limitsAgeMin === null) {
    hints.push('No limit reading yet this session: they show with the next reply, or at once with /skin limits.')
  }

  return hints
}

const pad = (label: string) => label.padEnd(13)

/** `/skin doctor`'s answer: what cc-skins sees, what it suggests, and where to report what is still wrong. */
export const doctorReport = (facts: DoctorFacts): string => {
  const claudeCode =
    facts.claudeCode === null
      ? `unknown (${MIN_CLAUDE_CODE} or newer needed)`
      : `${facts.claudeCode} ${isOlder(facts.claudeCode, MIN_CLAUDE_CODE) ? `✗ too old, ${MIN_CLAUDE_CODE} or newer needed` : '✓'}`
  const system = [facts.os ?? 'macOS or Linux', facts.terminal, facts.colorTerm].filter(part => part !== null).join(' · ')
  const look = [
    `${facts.skin} (${facts.isOwnSkin ? 'yours' : 'built in'})`,
    `icons ${facts.glyphs}`,
    `bar ${facts.barStyle}${facts.isHudHidden ? ', hidden' : ''}`,
    `chat cards ${facts.isChatStyled ? 'on' : 'off'}`,
  ].join(' · ')
  const session = [
    facts.model ?? 'model unknown',
    facts.contextPercent === null ? 'context –' : `context ${Math.round(facts.contextPercent)}%`,
    facts.limitsAgeMin === null ? 'limits not read yet' : `limits read ${facts.limitsAgeMin}m ago`,
    facts.costUsd === null ? 'cost –' : `cost $${facts.costUsd.toFixed(2)}`,
  ].join(' · ')
  const repository = facts.branch === null ? 'none' : `${facts.branch} · git status ${facts.isGitStatusOn ? 'on' : 'off'}`
  const hints = doctorHints(facts)

  return [
    'cc-skins doctor',
    '',
    `${pad('cc-skins')}${CC_SKINS_VERSION}`,
    `${pad('Claude Code')}${claudeCode}`,
    `${pad('System')}${system}`,
    `${pad('Skin')}${look}`,
    `${pad('Hidden')}${facts.hidden.length === 0 ? 'nothing' : facts.hidden.join(', ')}`,
    `${pad('Session')}${session}`,
    `${pad('Repository')}${repository}`,
    `${pad('Store')}${facts.isStoreOk ? 'ok' : 'not answering'}`,
    '',
    hints.length === 0 ? 'Everything looks right.' : ['Worth a look:', ...hints.map(hint => `- ${hint}`)].join('\n'),
    '',
    `Still something wrong? Paste this into a report: ${ISSUES}`,
  ].join('\n')
}
