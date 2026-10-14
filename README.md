# cc-skins

Skins, a usage bar and quick controls for [Claude Code](https://code.claude.com) in the terminal. Twenty-six looks (eight dark, six for light terminals) plus any you build; a bar above the prompt that keeps model, context, limits and cost in view and opens what you need with a click.

```
 ◆  Opus 5.5 · xhigh   main   ■■□□□ 34%   ■■■■□ 72% ↻2h13m   ■■■■■ 91% ↻3d4h  $1.24  ⚙
╭──────────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                    │
╰──────────────────────────────────────────────────────────────────────────────────────╯
```

Every block has its own color: in a Nerd Font they join with powerline arrows, p10k style.

### What changes, and where

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
- **Usage bar**: model and effort, git branch, context window, 5-hour and 7-day limits with time to reset, and session cost, as colored powerline blocks. A block turns warning-colored at 60 % and alarm-colored at 85 %. While Claude works, the skin's block pulses and spins. Narrow terminals shed detail block by block. Click the skin's icon to switch skins, the model to switch model or effort, the context, a limit or the cost for the usage dashboard, the branch for its changed files, the ⚙ to choose what the bar shows (the skin's name is off by default). The Look tab's Clickable bar switch turns the pieces' clicks off; the ⚙ stays clickable so the settings stay in reach (`/skin hide gear` hides it, `/skin bar` opens the settings either way).

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

## Install

In Claude Code, type:

```
/plugin install cc-skins --marketplace mr-dzzs21/cc-skins
```

Answer `y` to add the marketplace and pick the user scope. Then type `/skin` (or click the first block of the bar). Move through the skins with ↑↓: each one previews as you land on it, in the picker and in the real bar. Pick with Enter or its hotkey; Esc goes back to the one you had. For the matching colors everywhere else, open `/theme` and pick `cc-skins · <skin>`.

Requires Claude Code 2.1.296 or newer (function-hook plugins and custom themes). The navy background comes from your terminal: [`extras/terminal`](extras/terminal) has a matching color scheme for each skin.

## Usage

| Command | Does |
|---|---|
| `/skin` | Opens the skin picker: ↑↓ previews, Enter or 1–9, 0, a–p picks, Esc closes. A click on the bar's first block opens it too |
| `/skin list` | Lists the skins as text, marks the current one |
| `/skin model` | Opens the model and effort picker (or click the model in the bar). A model pick is saved as your default, as `/model` does; effort holds for the session, as `/effort` does |
| `/skin bar` | Opens the settings (or click the ⚙ at the bar's end), in tabs: **Bar** (each piece on or off), **Look** (style, icons, chat cards), **Alerts** (when to warn, the compact button), **Turn line** (cost, tokens, tool calls), **Sound** (sound, loudness, notification) |
| `/skin alerts` | Opens the settings on the Alerts tab |
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
| `/skin glyphs nerd` / `powerline` / `plain` | Powerline arrows and icons (needs a [Nerd Font](https://www.nerdfonts.com)); arrows with short words for the icons (fonts with Powerline symbols, such as Cascadia Code on Windows); or plain blocks for any font |

Your choice is remembered across sessions. Colors are picked in `/theme` (look for `cc-skins · …`): Claude Code keeps the theme yours to choose, so a plugin can't switch it for you. Skins and themes mix freely. The bar collapses with the `[-]` at its right edge.

If the bar shows boxes, `◆` or question marks where icons should be, your font has the powerline arrows but no Nerd Font icons: run `/skin glyphs powerline` (or `plain` for no arrows either), or install a Nerd Font (MesloLGS NF, which Powerlevel10k uses, or CaskaydiaCove Nerd Font on Windows).

The 5h and 7d meters show up on Pro and Max plans once the first response of a session arrives. With an API key you see context and cost.

## Privacy and safety

cc-skins runs inside Claude Code on your machine and keeps to what it needs:

- **No network.** It makes no requests of its own and sends nothing anywhere.
- **Reads:** the session's usage figures, model and effort (from Claude Code), your repository's current branch (`.git/HEAD`, a small plain file only), and, when you click the branch or run `/skin changes`, `git status` and `git diff --shortstat` (run without a shell, without optional locks, fsmonitor, external diff or textconv).
- **Writes:** nothing to your files or projects. Your choices and your own skins are kept through Claude Code's local plugin store on your machine.
- **Acts only when you ask:** a model pick (saved as your default, as `/model` does), an effort pick (`/effort`), a compact, a copy on `/skin export`. Unasked, it shows a welcome toast and the usage alerts.
- **Sound and notifications are off** until you turn them on. A notification says how long a turn took; the answer's first line goes along only if you turn that on, cleaned of control characters.
- **Shared skins are data, not code.** `/skin import` takes a name, a built-in base, a `#rrggbb` accent and a style; the name loses every control character, the id must be lowercase words and dashes.

## Fonts and terminal colors

Claude Code can't change your font: the terminal app draws it. [`extras/terminal`](extras/terminal) has matching Ghostty and iTerm2 color schemes for each skin, plus font suggestions.

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
claude --plugin-dir .          # run Claude Code with the plugin loaded; edits hot-reload
claude plugin validate .       # check manifest, hooks and state contract
claude plugin test .           # run tests/*.test.tsx against the engine
```

Once Claude Code has loaded the folder, it writes the API types to `.claude-plugin/types/` and a `tsconfig.json`, so `tsc -p .` type-checks the plugin.

Contributions are welcome, especially new skins.

The sounds in `sounds/` are synthesized by `scripts/make_sounds.py` (`python3 scripts/make_sounds.py sounds`), so they carry the project's license.

New built-in skins go through `scripts/add_skins.py <skins.json>`: it writes the skin, its `/theme` theme, its terminal schemes and the README rows, and refuses a block whose text would not read.

## License

[MIT](LICENSE)
