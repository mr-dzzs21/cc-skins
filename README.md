<p align="center"><img src="docs/banner.svg" alt="cc-skins" width="100%"></p>

<p align="center">
  <a href="https://github.com/mr-dzzs21/cc-skins/actions/workflows/ci.yml"><img src="https://github.com/mr-dzzs21/cc-skins/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Claude_Code-2.1.296%2B-d97757.svg" alt="Claude Code 2.1.296 or newer">
  <img src="https://img.shields.io/badge/skins-26-b5179e.svg" alt="26 skins">
  <img src="https://img.shields.io/badge/network-none-2ea043.svg" alt="No network">
</p>

<p align="center"><b>Skins and a clickable usage bar for <a href="https://code.claude.com">Claude Code</a>.</b><br>
Your chat as cards, a bar that keeps model, context, limits and cost in view, one click to change what you see.</p>

<p align="center"><img src="docs/hero.svg" alt="A real Claude Code session with cc-skins: your message and Claude's reply as framed cards, the turn line with its cost, and the usage bar above the prompt, fading through nine skins" width="100%"></p>
<p align="center"><sub>A real session, recorded in nine of the 26 skins.</sub></p>

<p align="center">
  <a href="#install-in-30-seconds"><b>Install</b></a> ·
  <a href="#a-quick-tour"><b>Tour</b></a> ·
  <a href="#skins"><b>Skins</b></a> ·
  <a href="#commands"><b>Commands</b></a> ·
  <a href="#questions-and-fixes"><b>Questions and fixes</b></a>
</p>

## Install in 30 seconds

1. Open Claude Code, version 2.1.296 or newer (`claude --version` tells; `claude update` updates).
2. Type:
   ```
   /plugin install cc-skins --marketplace mr-dzzs21/cc-skins
   ```
3. Answer `y` to add the marketplace, and pick the **user** scope, so every project gets it.
4. That's it: the bar shows above the prompt. Type `/skin` to pick a look: ↑↓ previews each skin as you land on it, Enter picks.

Or from a terminal, the same on macOS, Linux and Windows:

```sh
claude plugin marketplace add mr-dzzs21/cc-skins
claude plugin install cc-skins@cc-skins
```

then start Claude Code (in one that's already running, type `/reload-plugins`).

**For the full look** (optional):

- **Claude Code's own colors:** open `/theme` and pick `cc-skins · <your skin>`. Claude Code keeps the theme yours to choose, so a plugin can't switch it for you.
- **The terminal's background:** [`extras/terminal`](extras/terminal) has a matching Ghostty and iTerm2 scheme for each skin.
- **Icons:** with a [Nerd Font](https://www.nerdfonts.com) (MesloLGS NF, or CaskaydiaCove Nerd Font on Windows), `/skin glyphs nerd` adds icons to the bar. Without one, the bar uses arrows and short words (the default on Windows), or `/skin glyphs plain` for any font.

| To | Do |
|---|---|
| Update | `claude plugin marketplace update cc-skins` and `claude plugin update cc-skins@cc-skins`, then restart Claude Code |
| Hide it for a moment | `/skin hud off` (the bar) and `/skin chat off` (the cards); `on` brings them back |
| Turn it off | `claude plugin disable cc-skins@cc-skins` (and `enable` to turn it back on) |
| Uninstall | `claude plugin uninstall cc-skins@cc-skins` |

## Why cc-skins

- **A bar you can click.** Model and effort, branch, context, the 5-hour and 7-day limits, cost: each block opens what it shows. The model opens a model and effort picker, the branch its changed files, the context or cost a usage dashboard, a limit a live reading, the ⚙ the settings.
- **The whole UI, not one line.** A skin restyles the chat into cards, gives the spinner and the turn line their own words, and comes with a `/theme` color theme and terminal schemes.
- **No network, no credentials.** cc-skins makes no requests of its own and reads no login: every figure comes from Claude Code itself.
- **One command, no setup.** It's a plugin: no package to install, no `settings.json` to edit, no script run on every refresh.
- **Yours to shape.** Every block on or off, three icon sets for any font, when and whether blocks turn warning-colored, alerts, a compact button, sound and notifications (off until you turn them on), and your own skins from one accent color, shared as one line of JSON.

## A quick tour

Every picture below is a real Claude Code session, recorded in a terminal ([how](scripts/screens)).

<table>
<tr>
<td width="55%"><img src="docs/screens/picker.svg" alt="The skin picker: every skin with its color swatches, grouped Vivid, Dark and Light, and a live preview of the skin under the cursor" width="100%"></td>
<td>

### Pick a skin

`/skin`, or a click on the bar's first block. ↑↓ previews each skin as you land on it, in the picker and in the real bar; Enter picks. A skin's key or a click previews it too, and the same again picks it. Esc goes back to the one you had.

### Make your own

`/skin create` starts from any skin's words, icon and sound, takes one accent color (a swatch or any `#rrggbb`) and a style, and works out the rest, every text kept readable. `/skin export` shares it as one line of JSON.

</td>
</tr>
</table>

<table>
<tr>
<td width="50%"><b>Model and effort</b>: a click on the model<br><img src="docs/screens/model.svg" alt="The model and effort picker: the models with their aliases, the current one marked, and the effort levels as buttons" width="100%"></td>
<td width="50%"><b>Usage dashboard</b>: a click on the context or cost<br><img src="docs/screens/dashboard.svg" alt="The usage dashboard: the context with its trend and a breakdown, the 5-hour and 7-day limits, the cost per turn, the session's totals" width="100%"></td>
</tr>
<tr>
<td width="50%"><b>Settings</b>: a click on the ⚙, each piece on or off<br><img src="docs/screens/settings.svg" alt="The settings on the Bar tab: a checkbox for each piece of the bar" width="100%"></td>
<td width="50%"><b>Alerts</b>: when to warn, and in which colors<br><img src="docs/screens/alerts.svg" alt="The settings on the Alerts tab: warn at 70, 80 or 90 percent, the compact button, the warning colors" width="100%"></td>
</tr>
<tr>
<td width="50%"><b>Skin builder</b>: <code>/skin create</code><br><img src="docs/screens/builder.svg" alt="The skin builder: a name, the skin to start from, an accent color from swatches, the style, and a live preview" width="100%"></td>
<td width="50%"><b>Changed files</b>: a click on the branch<br><img src="docs/screens/changes.svg" alt="The changed files: the branch, the line totals, each changed file" width="100%"></td>
</tr>
</table>

Two bar styles: colored powerline blocks, or a quiet header line (`/skin bar header`):

<p><img src="docs/screens/bar-header.svg" alt="The header style: the skin and model at the left, the session time, branch, context and cost in the middle, the limits as badges at the right" width="100%"></p>

As a limit or the context fills up, its block turns warning-colored at 60 % and alarm-colored at 85 % (or only at 85 %, or never):

<p><img src="docs/screens/bar-alerts.svg" alt="The bar with the 5-hour limit at 72 percent in yellow and the 7-day limit at 91 percent in red" width="100%"></p>

## Skins

Twenty-six built in: twelve vivid, eight dark, six for light terminals. Here is each one's bar:

<p align="center"><img src="docs/skins.svg" alt="The usage bar in each of the 26 built-in skins: twelve vivid, eight dark, six light" width="100%"></p>

<details>
<summary><b>Every skin's look, spinner and turn line</b></summary>

| Skin | Look | Spinner | Turn line |
|---|---|---|---|
| `midnight` (default) | Deep navy, Claude in orange, you in blue | `Composing…`, `Pondering…` | `✻ Done in 3s` |
| `retro` | Phosphor green and amber | `Compiling▌` | `▌ Done in 3s` |
| `neon` | Magenta and cyan | `Hacking ⟡` | `⟡ Jacked in for 3s` |
| `minimal` | Muted grey, one calm accent | `Thinking…`, `Writing…` | `· Done in 3s` |
| `ring` | Red and gold, boxing ring | `Jabbing…`, `Slipping…` | `◆ KO in 3s` |
| `synthwave` | Sunset gold to violet, 80s outrun | `Cruising ◢`, `Arpeggiating ◢` | `◢ Fade out in 3s` |
| `ocean` | Deep sea blues with a coral spark | `Diving…`, `Riding the wave…` | `≈ Surfaced in 3s` |
| `sakura` | Cherry blossom pink and soft plum | `Blossoming ❀`, `Steeping tea ❀` | `❀ Bloomed in 3s` |
| `forest` | Moss green and bark brown | `Rooting…`, `Foraging…` | `♣ Harvested in 3s` |
| `arctic` | Ice blue and frost | `Crystallizing ❄`, `Gliding ❄` | `❄ Frozen in 3s` |
| `lava` | Molten orange on black rock | `Erupting ▲`, `Forging ▲` | `▲ Erupted in 3s` |
| `candy` | Pastel rainbow, sweet and playful | `Sprinkling ✿`, `Fizzing ✿` | `✿ Sweet in 3s` |
| `obsidian` | Volcanic glass with a violet glint | `Carving ◈`, `Sharpening ◈` | `◈ Cut in 3s` |
| `vampire` | Blood red on midnight black | `Lurking †`, `Gliding †` | `† Risen in 3s` |
| `abyss` | Pitch-black deep sea, bioluminescent teal | `Sinking…`, `Sounding…` | `◉ Resurfaced in 3s` |
| `emerald` | Dark jade with a gold spark | `Mining ❖`, `Refracting ❖` | `❖ Mined in 3s` |
| `noir` | Black and white, film noir | `Investigating…`, `Shadowing…` | `▪ Case closed in 3s` |
| `ember` | Charcoal with glowing orange embers | `Smoldering ✦`, `Crackling ✦` | `✦ Stoked in 3s` |
| `nebula` | Deep space violet with a pink star | `Orbiting ✧`, `Coalescing ✧` | `✧ Landed in 3s` |
| `aurora` | Northern lights over a night sky | `Shimmering ✺`, `Unfurling ✺` | `✺ Faded in 3s` |
| `paper` | Warm paper with ink-blue accents | `Drafting ✎`, `Annotating ✎` | `✎ Signed in 3s` |
| `latte` | Milky coffee and caramel | `Brewing…`, `Grinding…` | `◐ Served in 3s` |
| `sky` | Clear blue sky and white clouds | `Floating…`, `Gliding…` | `○ Landed in 3s` |
| `mint` | Fresh mint and soft sage | `Refreshing ❦`, `Muddling ❦` | `❦ Fresh in 3s` |
| `peach` | Peach sorbet and rosy coral | `Blending ❁`, `Whisking ❁` | `❁ Ripe in 3s` |
| `snow` | Bright white and quiet grey, nothing more | `Working…`, `Reading…` | `◇ Done in 3s` |

</details>

## What a skin changes

| What | Changed by | When |
|---|---|---|
| The bar, chat cards, spinner, turn line, sounds | the skin: `/skin` | at once, with every skin, yours too |
| Claude Code's own colors: accents, prompt border, diffs, message backgrounds | `/theme` → `cc-skins · <Skin>` | when you pick it there: Claude Code keeps the theme yours to choose, and only built-in skins come with one |
| The terminal's background and font | your terminal app | when you set it there: [`extras/terminal`](extras/terminal) has a scheme per skin and font tips |

Each skin changes:

- **Chat**: your messages and Claude's replies become framed cards with icon badges, names and send times; Claude's text hangs off an accent line; todo lists become a plan card with green ticks; tool calls and command output sit in cards; the prompt's hint and mode labels get a cleaner look.
- **Colors**: a matching Claude Code color theme (accents, prompt border, diffs, plan/auto modes, message backgrounds), picked in `/theme`; built-in skins only.
- **Spinner**: its own words while Claude works (`Jabbing…`, `Hacking ⟡`, `Compiling▌`).
- **Turn line**: its own closing line, with what the turn cost (`◆ KO in 12s · $0.04 · 3 tools`). Cost, tokens and tool calls each turn on or off in the settings' Turn line tab.
- **Alerts**: a toast as the context or a limit window reaches 80 % (or 70, 90, or off), once more at 95 %. When the context is that full, a **compact** button in the bar compacts the conversation with one click.
- **Sound and notification** (off until you turn them on): when a turn of 30 s or more ends, the skin's own sound (the ring skin rings a boxing bell; others chime, beep, blip, gong or pop) and a notification saying how long the turn took (with the answer's first line, if you turn that on too). Sound, loudness, notification, its preview and the minimum length are yours to set in the Sound tab.
- **Usage bar**: model and effort, git branch, context window, 5-hour and 7-day limits with time to reset, and session cost, as colored powerline blocks. A block turns warning-colored at 60 % and alarm-colored at 85 % (or only at 85 %, or never: the Alerts tab's Warning colors). While Claude works, the skin's block pulses and spins. Narrow terminals shed detail block by block. Click the skin's icon to switch skins, the model to switch model or effort, the context, a limit or the cost for the usage dashboard, the branch for its changed files, the ⚙ to choose what the bar shows (the skin's name is off by default). The Look tab's Clickable bar switch turns the pieces' clicks off; the ⚙ stays clickable so the settings stay in reach (`/skin hide gear` hides it, `/skin bar` opens the settings either way).

## Commands

| Command | Does |
|---|---|
| `/skin` | Opens the skin picker: ↑↓ previews and Enter picks; a key (1–9, 0, a–p) or a click previews and the same again picks; Esc closes. A click on the bar's first block opens it too (then click into the picker once, so it has the keys) |
| `/skin list` | Lists the skins as text, marks the current one |
| `/skin model` | Opens the model and effort picker (or click the model in the bar). A model pick is saved as your default, as `/model` does; effort holds for the session, as `/effort` does |
| `/skin bar` | Opens the settings (or click the ⚙ at the bar's end), in tabs: **Bar** (each piece on or off), **Look** (style, icons, chat cards), **Alerts** (when to warn, the compact button, warning colors), **Turn line** (cost, tokens, tool calls), **Sound** (sound, loudness, notification) |
| `/skin alerts` | Opens the settings on the Alerts tab |
| `/skin limits` | Reads the 5-hour and 7-day limits live, as `/usage` does (its answer shows in the chat too), and puts them in the bar. A click on a limit in the bar does the same |
| `/skin changes` | Opens the changed files of the repository (or click the branch): the branch and how it stands to its upstream, the line totals, each changed file, read with `git status` |
| `/skin create [name]` | Opens the skin builder: a name, the skin it starts from (words, icon, sound), an accent (a swatch or any `#rrggbb`), dark, vivid or light, with a live preview. The rest of the colors follow from the accent, every text kept readable. Your skins list under **Yours** in the picker |
| `/skin edit <skin>` / `/skin delete <skin>` | Changes or deletes one of your own skins |
| `/skin export [skin]` / `/skin import <json>` | Shares a skin as one line of JSON (copied to the clipboard); anyone with cc-skins wears it after importing |
| `/skin usage` | Opens the usage dashboard: the context with its trend and a /context-style breakdown, the limit windows, the cost overall and per turn, the session's totals, with Refresh and Compact buttons |
| `/skin show <item>` / `/skin hide <item>` | Shows or hides one piece: `skinName`, `model`, `effort`, `branch`, `context`, `fiveHour`, `sevenDay`, `cost`, `meters`, `resets`, `gear` |
| `/skin <name>` | Switches the spinner, turn line and HUD, and names the matching color theme |
| `/skin next` | Cycles to the next skin |
| `/skin bar powerline` / `/skin bar header` | Colored powerline blocks, or a quiet header line (session time, context, cost, limit badges) |
| `/skin chat off` / `/skin chat on` | Turns the chat cards off or on |
| `/skin hud off` / `/skin hud on` | Hides or shows the usage bar |
| `/skin glyphs nerd` / `powerline` / `plain` | Powerline arrows and icons (needs a [Nerd Font](https://www.nerdfonts.com)); arrows with short words for the icons and resets in brackets (fonts with Powerline symbols, such as Cascadia Code: the default on Windows until you pick); or plain blocks for any font |

Your choice is remembered across sessions. Colors are picked in `/theme` (look for `cc-skins · …`): Claude Code keeps the theme yours to choose, so a plugin can't switch it for you. Skins and themes mix freely. The bar collapses with the `[-]` at its right edge.

## cc-skins and status line tools

Claude Code's status line shows the output of a command you configure, below the prompt. Tools such as [ccstatusline](https://github.com/sirmalloc/ccstatusline) build on it, and do it well. cc-skins is a plugin instead, which changes what it can do:

| | cc-skins | A status line tool |
|---|---|---|
| Where | A bar above the prompt, plus the chat, spinner, turn line and theme | One or more lines below the prompt |
| Clicks | Each block opens something inside Claude Code: model and effort picker, usage dashboard, changed files, live limits, settings | Links to open elsewhere, where the tool draws them (ccstatusline has branch, PR and editor links) |
| Look | Skins for the whole UI: 26 built in, your own from one color | Colors, themes and powerline styles for the line |
| Settings | Inside Claude Code: `/skin bar`, in tabs | A config file or the tool's own setup screen |
| Install | `/plugin install`, nothing else | The tool, plus a `statusLine` entry in `settings.json` (some tools write it for you) |
| Network and credentials | None | Depends on the tool: live usage figures may come from Anthropic's API with your stored login |
| What it shows | Model, effort, branch, context, 5h and 7d limits with resets, cost, a compact button | Often much more: ccstatusline alone has dozens of widgets |
| Claude Code | 2.1.296 or newer: function-hook plugins are new and may still change | Any version with a status line |

They don't get in each other's way: keep your status line below the prompt and cc-skins above it.

## Questions and fixes

<details>
<summary><b>The bar doesn't show</b></summary>

Check that the plugin is on: `claude plugin list` should list `cc-skins@cc-skins` as enabled; if not, `claude plugin enable cc-skins@cc-skins`. A Claude Code that was already running when you installed or updated (background sessions too) needs `/reload-plugins`. `/skin hud on` brings back a bar you hid.
</details>

<details>
<summary><b>Boxes or question marks where icons should be</b></summary>

Your font has no Nerd Font icons: `/skin glyphs powerline` keeps the arrows and uses short words for the icons (fonts with Powerline symbols, such as Cascadia Code), `/skin glyphs plain` works with any font. Or install a Nerd Font (MesloLGS NF, or CaskaydiaCove Nerd Font on Windows), set it in your terminal and run `/skin glyphs nerd`.
</details>

<details>
<summary><b>The limits are behind, or show <code>~</code></b></summary>

The 5h and 7d meters show up on Pro, Max and Team plans. Claude Code learns them with each reply, so they are as current as this session's last reply: usage from another session or device shows up with the next reply, within a minute from another session on the same machine, or at once with a click on a limit (`/skin limits`). A reading that may be behind (none this session yet, or older than ten minutes) is marked `~49%`. With an API key you see context and cost.
</details>

<details>
<summary><b>Is the cost what I pay?</b></summary>

It is what Claude Code's own ledger says the session cost at API prices, the same figure `/cost` shows. On a Pro, Max or Team plan you don't pay it per token; it shows how much you used.
</details>

<details>
<summary><b>Claude Code's own colors didn't change</b></summary>

Those come from the color theme, which Claude Code keeps yours to choose: open `/theme` and pick `cc-skins · <your skin>`. Skins and themes mix freely. The terminal's background and font come from your terminal app: [`extras/terminal`](extras/terminal) has a scheme for each skin.
</details>

<details>
<summary><b>Does it slow Claude Code down, or send anything?</b></summary>

No. It makes no network requests, and runs a command only when you ask: `git status` when you open the changed files, `/usage` when you ask for live limits. Its figures come from Claude Code with each reply; the branch is read from `.git/HEAD` at the start and after each turn; once a minute it moves the reset countdowns on. See [Privacy and safety](#privacy-and-safety).
</details>

## Privacy and safety

cc-skins runs inside Claude Code on your machine and keeps to what it needs:

- **No network.** It makes no requests of its own and sends nothing anywhere.
- **Reads:** the session's usage figures, model and effort (from Claude Code), your repository's current branch (`.git/HEAD`, a small plain file only), and, when you click the branch or run `/skin changes`, `git status` and `git diff --shortstat` (run without a shell, without optional locks, fsmonitor, external diff or textconv).
- **Writes:** nothing to your files or projects. Your choices and your own skins are kept through Claude Code's local plugin store on your machine.
- **Acts only when you ask:** a model pick (saved as your default, as `/model` does), an effort pick (`/effort`), a compact, a copy on `/skin export`. Unasked, it shows a welcome toast and the usage alerts.
- **Sound and notifications are off** until you turn them on. A notification says how long a turn took; the answer's first line goes along only if you turn that on, cleaned of control characters.
- **Shared skins are data, not code.** `/skin import` takes a name, a built-in base, a `#rrggbb` accent and a style; the name loses every control character, the id must be lowercase words and dashes.

## How it works

cc-skins is a Claude Code plugin made of:

- `themes/*.json`: color themes in Claude Code's custom-theme format (`name`, `base`, `overrides`).
- `hooks/register.tsx`: function hooks that draw the `AbovePrompt` band (the usage bar), rewrite the `Spinner` words, draw the `TurnDuration` line, and serve `/skin`. Usage figures come from the `session.measure` event, pushed after each turn, so nothing polls.
- `hooks/hud.tsx`: the usage bar in both styles: which pieces show at which width, their colors, and how they're drawn.
- `hooks/chat.tsx`: the chat cards. Tool calls keep Claude Code's own drawing inside the card, so nothing about them is lost.
- `hooks/skins.ts`: the skin definitions. A new skin is one entry there plus one theme file.

## Development

```sh
git clone https://github.com/mr-dzzs21/cc-skins && cd cc-skins
claude --plugin-dir .            # run Claude Code with the plugin loaded; edits hot-reload
claude plugin validate .         # check manifest, hooks and state contract
claude plugin test .             # run tests/*.test.tsx against the engine
python3 scripts/check_assets.py  # JSON, schemes, scripts, one theme and scheme per skin, the pictures, versions
```

CI runs the last three on every push and pull request, with Claude Code pinned, no login and no secrets (nothing calls a model).

Once Claude Code has loaded the folder, it writes the API types to `.claude-plugin/types/` and a `tsconfig.json`, so `tsc -p .` type-checks the plugin.

The pictures: `npx -y tsx@4.19.2 scripts/render_previews.ts` draws the banner and the skin gallery from the skins themselves; [`scripts/screens`](scripts/screens) records the screenshots from a real session and builds them into `docs/`.

New built-in skins go through `scripts/add_skins.py <skins.json>`: it writes the skin, its `/theme` theme, its terminal schemes and the README rows, and refuses a block whose text would not read. Then redraw the gallery.

The sounds in `sounds/` are synthesized by `scripts/make_sounds.py` (`python3 scripts/make_sounds.py sounds`), so they carry the project's license.

Contributions are welcome, especially new skins: see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
