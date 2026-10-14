# Changelog

## 0.17.0

- Six extras for the bar, off until you turn them on (the ⚙'s Bar tab, or `/skin show <item>`), the first to go when the bar runs out of room:
  - `gitStatus`: the branch's state, `main ●3 ↑1 ↓2` (files changed, commits ahead and behind) or `main ✓`; it runs `git status` after each reply, read-only as the changes pane does.
  - `contextTokens`: the context's tokens beside its percent, `34% · 68k`.
  - `burnRate`: what the session costs an hour, `$1.24 · $0.62/h`, from its fifth minute.
  - `session`, `clock`, `version`: an info block with how long the session has run, the time and the Claude Code version.
- A bar you set up before keeps its look: items added since your last change stay off until you turn them on.

## 0.16.2

- The dashboard counts "1 tool call", not "1 tool calls".
- A new README: a banner, real screenshots (an animated session in nine skins, every pane, both bar styles, the warning colors), an install guide with update, turn-off and uninstall, and answers to the usual questions. The screenshots are recorded from a real session by the tools in `scripts/screens/`.
- Issue forms for bugs, skin ideas and feature ideas, and a contributing guide.

## 0.16.1

- Warning colors are yours to set in the Alerts tab: yellow at 60 % and red at 85 % (as before), red at 85 % only, or off, the context and limit blocks then keeping the skin's colors. The bar, the header and the dashboard follow it.

## 0.16.0

- Limits that stay current: a reading that may be behind (none from this session yet, or older than ten minutes) is marked `~49%`; a click on a limit, `/skin limits` or the dashboard's Live limits button reads them live, as `/usage` does, and puts them in the bar at once; sessions on the same machine share their freshest reading within a minute. The dashboard says when the limits were read.

## 0.15.7

- A branch name is checked part by part between its slashes, as git checks it: a part ending in `.lock` (`feature.lock/test`), starting with `.` or empty is refused anywhere in the name, not only at its end.

## 0.15.6

After a second review:

- A subagent's turn no longer resets the main turn's tool count and cost, and one still running after the main turn ended no longer leaves the bar animating: Claude Code 2.1.299 raises `turn.start` for subagents too, with an `agentId` its declared input does not name yet (seen in a run with a real subagent).
- Branch names in any script show (`feature/über`, `修正/ui`); what git forbids in a name still does not.
- Widths count grapheme clusters: a family, a keycap, `©️`, a flag or a skin tone takes the two cells a terminal draws, and text is never cut inside one.
- The picker's key hint stops at its 36 keys and points to the arrows for the rest.
- The changes pane says its line totals count tracked files, and names the untracked ones apart.
- A `.git` that is a link, or a `.git` file without a `gitdir:` line, is not followed.

## 0.15.5

- A limit's reset reads with the Nerd Font refresh icon in `nerd` glyphs, and in brackets in `powerline` and `plain` (`49% (2h11m)`): the ↻ arrow drew as an odd glyph in some fonts, as Cascadia Code.
- On Windows, cc-skins starts with `powerline` glyphs until you pick: Windows Terminal's font has the arrows but no Nerd Font icons, which drew as question marks.

## 0.15.4

- In the skin picker the arrow keys walk the skins (they used to scroll the pane, or the screen), each one previewing in the picker and the real bar; Enter picks it. Pages, Home and End still scroll, and the window follows the row walked onto.
- A skin's key or a click previews first and picks on the second press: the terminal reports no mouse hover to plugins, so a click stands in for it.
- The picker's hint says so; it no longer claims the arrows preview while they scrolled.

## 0.15.3

- A third glyph mode, `powerline`: the arrows and the branch mark stay, short words (`ctx`, `5h`, `7d`) take the icons' place. For fonts with Powerline symbols but no Nerd Font icons, as Windows Terminal's Cascadia Code. In `/skin glyphs` and the Look tab (Arrows only).
- The skin picker cuts names and descriptions to the pane's width, counted in terminal cells, instead of wrapping them onto the next row.
- The plugin's description (as `/plugin install` shows it) says what it does now.

## 0.15.2

After a review:

- The bar measures terminal cells, not code points: a wide character (CJK, emoji) takes two, a combining mark none, so a branch or skin name in any script no longer overflows the bar or sheds detail early.
- Two prompts alike show their own send times: each prompt row's time is kept by its id as the session stores it; where no id is known, a time shows only for a text one prompt had, never a wrong one.
- The changes pane reads `git status -z`: file names with ` -> `, quotes, spaces or any script stay whole, and a rename shows its new name.
- Tests hold the bar to fitting at every width from its least, and to its least below that.
- README: what changes where (skin, `/theme`, terminal), the ⚙ staying clickable, notifications and storage worded exactly.

## 0.15.1

Hardening before going public, after an audit:

- Notifications say only how long a turn took; the answer's first line is a separate switch (off), and loses every control character.
- Text from outside (imported skin names, git branch and file names, the answer) loses control and format characters (ESC, BEL, C1, bidi, zero-width) before it is drawn or sent. Imported skins need a lowercase id; at most 50 skins of your own.
- The branch is read only from a small plain `HEAD` (no links, no pipes, nothing large), a relative `gitdir:` resolved against the repository, the name checked.
- `git status` and `git diff` run without optional locks, fsmonitor, external diff or textconv.
- `scripts/add_skins.py` holds contributed JSON to exact shapes and writes every string as an escaped literal.
- A todo whose `activeForm` is no string no longer breaks the plan card.
- README: Privacy and safety.

## 0.15.0

- Six skins for light terminals: paper, latte, sky, mint, peach and snow, listed under Light in the picker. Each bar opens on one accent block and fades into pale ones; every text reads on a light terminal (checked against the darkest of their grounds). Each has a light `/theme` theme and light Ghostty and iTerm2 schemes.
- The skin builder makes light skins too: the accent on a pale ground, the chat's colors read on a light terminal.
- `scripts/add_skins.py` adds skins from a JSON file: the skin, its theme, its terminal schemes, the README rows; it refuses unreadable blocks.

## 0.14.0

- More of the bar opens something: the context, a limit or the cost opens the usage dashboard, the branch opens a pane of the repository's changes (`/skin changes`: branch, ahead and behind, line totals, each changed file, read with `git status`). Both bar styles; a Clickable bar switch in the Look tab turns it off (the ⚙ stays).
- A pane that cannot show says why: no interactive terminal (as under `claude -p` since Claude Code 2.1.299) or too narrow, and what does the same.

## 0.13.0

- Build your own skins: `/skin create` opens a builder with a name, the built-in skin to start from (its words, icon and sound), an accent (16 swatches or any `#rrggbb`) and a style (dark: the accent fading into black; vivid: the accent across nearby hues), previewed live. Every color follows from the accent with every text kept readable (contrast of at least 4.5, checked for every swatch in both styles).
- Your skins list under Yours in the picker and work everywhere a skin does (`/skin <id>`, `/skin next`). `/skin edit`, `/skin delete`, and `/skin export` / `/skin import` to share one as a line of JSON.

## 0.12.0

- Usage dashboard (`/skin usage`): the context as a meter with its trend over the session and its largest parts as /context counts them, the limit windows with their resets, the cost overall and per turn (trend, average, priciest), and the session's time, turns, tool calls and tokens. Refresh and Compact buttons.

## 0.11.0

- Sound and notification when a turn ends, both off until turned on in the new Sound tab: each skin has its own sound (ring rings a boxing bell; others chime, beep, blip, gong or pop), or pick one; three loudness levels; a pick plays it once. The notification says how long the turn took and how the answer begins. Both only for turns of 30 s or more, or 10, 60, or any length.
- The six sounds are synthesized by `scripts/make_sounds.py`.

## 0.10.0

- The line closing a turn tells what the turn cost: `KO in 1m 4s · $0.25 · 2 tools`. Cost (the session's cost after the turn less before it), tokens (read and written, the cache included; off by default) and tool calls of the main thread each turn on or off in the new Turn line tab.

## 0.9.0

- Alerts: a toast as the context or a limit window reaches the threshold (80 % by default; 70, 90 or off), once more at 95 %, and again only after it drops back.
- A compact button joins the bar once the context is that full, between turns: one click compacts the conversation, as /compact does.
- The settings come in tabs: Bar, Look, Alerts. `/skin alerts` opens the Alerts tab.

## 0.8.1

- Models read with their version everywhere: the model picker lists `Opus 5.5`, `Opus 5.5 · 1M context`, `Sonnet 5.5`, `Opus 5.5 plan mode` instead of bare aliases. The running model, and every model a pick has shown an alias to name, take precedence over this build's defaults.
- The bar follows a model switched outside it (`/model`), from the next request on.

## 0.8.0

- The bar is yours to arrange: the ⚙ at its end (or `/skin bar`) opens settings where each piece turns on or off (skin name, model, effort, branch, context, 5-hour and 7-day limits, cost, meters, reset countdowns, the ⚙ itself), with the style, icons and chat cards beside them. `/skin show|hide <item>` does the same from the prompt.
- The skin's name is off by default; its icon stays and still opens the skin picker.
- The model block shows the effort (`Opus 5.5 · xhigh`) and opens a model and effort picker: a model pick goes through the Model row (saved as your default, as `/model` does), an effort pick runs `/effort` for the session.

## 0.7.0

- Eight new dark skins: obsidian, vampire, abyss, emerald, noir, ember, nebula and aurora. Each bar opens on one deep jewel-tone block and darkens from there, with light text on every block (contrast of at least 4.5) and quiet text kept readable on the terminal's background. Each comes with a `/theme` theme and Ghostty and iTerm2 schemes.
- The picker lists them together under a Dark heading.

## 0.6.1

- Fix: after resuming another chat (or a /clear), cc-skins sets itself up again in the new session, so `/skin`, your skin and the bar stay. Before, they were gone until Claude Code restarted.

## 0.6.0

- Seven new skins: synthwave, ocean, sakura, forest, arctic, lava and candy, each with its bar colors, chat colors, spinner and turn words, a `/theme` theme, and Ghostty and iTerm2 color schemes. Every bar block keeps a text contrast of at least 4.5.
- Live preview in the picker: the skin under the focus shows in the picker (the bar with this session's figures, a sample prompt and reply as cards, the spinner and turn line) and in the real bar above the prompt. Esc goes back to the skin you had.
- The picker opens on the current skin and asks for room for the preview; hotkeys run 1–9, 0, a, b.

## 0.5.0

- Skin picker: `/skin` opens a list of the skins, each with a strip of its colors; ↑↓ Enter or a digit picks, Esc closes. A click on the bar's first block (or the header's brand) opens it too. `/skin list` keeps the text list.

## 0.4.0

- Claude's replies sit in cards too, opened by a head with an icon badge (` ✻  CLAUDE  Opus 5.5`); your cards get the same badge (` ❯  You  14:23`).
- Todo lists become a plan card: `☰ Plan  1/3 done`, done items ticked in green, the running one in Claude's color.
- The git branch shows in both bar styles.

## 0.3.0

- Chat cards: your messages are framed cards with your name and send time; Claude's replies open with a header (`✻ CLAUDE  Opus 5.5`) and an accent line; tool calls and command output sit in cards around Claude Code's own drawing. `/skin chat off` turns them off.
- A second bar style, `/skin bar header`: brand and model, session time, context with tokens, cost, and limit badges in one quiet line.
- The idle prompt hint reads `/ commands · @ files · ! shell · ↵ send`; mode labels become badges.
- New skin `midnight`, now the default: deep navy, Claude in orange, you in blue, with a matching theme and terminal colors.

## 0.2.1

- New colors: each skin's bar is now a gradient (ring: gold to crimson, neon: pink to cyan, retro: phosphor greens, minimal: Tokyo Night blues), every block checked for readable contrast. The `/theme` themes follow the same colors.

## 0.2.0

- The usage bar is now a powerline: colored blocks joined by arrows, with Nerd Font icons. Blocks turn warning- and alarm-colored as limits fill.
- The skin's block pulses and spins while Claude works.
- The bar sheds detail block by block on narrow terminals.
- The turn line is a pair of colored blocks (`KO` `in 4s`).
- `/skin glyphs nerd|plain` for terminals without a Nerd Font.
- Default skin is now `ring`.

## 0.1.0

- Four skins: retro, neon, minimal, ring. Each brings a color theme, spinner words and a turn line.
- Usage HUD above the prompt: model, context, 5h and 7d limits with reset countdown, session cost.
- `/skin` command: list, switch, `next`, `hud on|off`. The choice persists across sessions; colors are picked in `/theme`.
- Ghostty and iTerm2 color schemes with font suggestions.
