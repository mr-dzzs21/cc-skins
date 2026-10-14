# The bar

[← cc-skins](../README.md) · [All docs](README.md)

<p><img src="hero.svg" alt="The bar above the prompt in a real session" width="100%"></p>

- **Usage bar**: model and effort, git branch, context window, 5-hour and 7-day limits with time to reset, and session cost, as colored powerline blocks. A block turns warning-colored at 60 % and alarm-colored at 85 % (or only at 85 %, or never: the Alerts tab's Warning colors). While Claude works, the skin's block pulses and spins. Narrow terminals shed detail block by block. Click the skin's icon to switch skins, the model to switch model or effort, the context, a limit or the cost for the usage dashboard, the branch for its changed files, the ⚙ to choose what the bar shows (the skin's name is off by default). Extras, off until you turn them on in the ⚙ or with `/skin show`: git status on the branch (`main ●3 ↑1`: files changed, commits ahead and behind; it runs `git status` after each reply), context tokens (`34% · 68k`), cost per hour (`$1.24 · $0.62/h`), and an info block with session time, clock and Claude Code version; they are the first to go when the bar runs out of room. The Look tab's Clickable bar switch turns the pieces' clicks off; the ⚙ stays clickable so the settings stay in reach (`/skin hide gear` hides it, `/skin bar` opens the settings either way).

## In Claude Desktop and VS Code

cc-skins runs wherever Claude Code does, in the terminal and inside Claude Desktop and VS Code. The chat cards, the spinner and the turn line look the same everywhere. The bar is simpler outside the terminal: Desktop and VS Code draw each block as a button with its words (`Opus 5.5 · xhigh`, `ctx 34%`, `5h 42% (2h13m)`, `$1.24`), without the powerline colors, and a click opens what it opens in the terminal.

## The two styles

`/skin bar powerline` draws colored blocks joined by powerline arrows; `/skin bar header` a quiet line with the skin and model at the left, the session time, branch, context and cost in the middle, and the limits as badges at the right.

<p><img src="screens/bar-header.svg" alt="The header style" width="100%"></p>

## Warning colors

A context or limit block turns warning-colored at 60 % and alarm-colored at 85 %. The settings' Alerts tab makes that red at 85 % only, or never.

<p><img src="screens/bar-alerts.svg" alt="The 5-hour limit at 72 percent in yellow, the 7-day limit at 91 percent in red" width="100%"></p>

## Extras

Off until you turn them on, in the ⚙'s Bar tab or with `/skin show <item>`:

| Item | Shows |
|---|---|
| `gitStatus` | The branch's state: `main ●3 ↑1 ↓2` (files changed, commits ahead and behind), or `main ✓`. It runs `git status` after each reply, read-only, only while it is shown |
| `contextTokens` | The context's tokens beside its percent: `34% · 68k` |
| `burnRate` | What the session costs an hour: `$1.24 · $0.62/h`, from its fifth minute |
| `session` | How long the session has run |
| `clock` | The time |
| `version` | The Claude Code version |

The session time, clock and version each have a block of their own; where two neighbors share a color, a thin arrow parts them. The extras are the first thing the bar drops when it runs out of room. A bar you set up before an extra existed keeps its look: new items stay off until you turn them on.

<p><img src="screens/bar-extras.svg" alt="The bar with every extra on" width="100%"></p>

## How current the limits are

The 5h and 7d meters show up on Pro, Max and Team plans. Claude Code learns them with each reply, so they are as current as this session's last reply: usage from another session or device shows up with the next reply, within a minute from another session on the same machine, or at once with a click on a limit (`/skin limits`, which reads them as `/usage` does). A reading that may be behind (none this session yet, or older than ten minutes) is marked `~49%`. With an API key you see context and cost.

## What the cost is

What Claude Code's own ledger says the session cost at API prices, the same figure `/cost` shows. On a Pro, Max or Team plan you don't pay it per token; it shows how much you used.
