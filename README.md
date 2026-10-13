# cc-skins

Skins for [Claude Code](https://code.claude.com) in the terminal. One plugin, twenty looks, eight of them dark: chat messages as cards, and a usage bar above the prompt that's always in view.

```
 RING   Opus 5.5   ■■□□□ 34%   ■■■■□ 72% ↻2h13m   ■■■■■ 91% ↻3d4h  $1.24 
╭──────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

Every block has its own color: in a Nerd Font they join with powerline arrows, p10k style.

Each skin changes:

- **Chat**: your messages and Claude's replies become framed cards with icon badges, names and send times; Claude's text hangs off an accent line; todo lists become a plan card with green ticks; tool calls and command output sit in cards; the prompt's hint and mode labels get a cleaner look.
- **Colors**: a full Claude Code color theme (accents, prompt border, diffs, plan/auto modes, message backgrounds).
- **Spinner**: its own words while Claude works (`Jabbing…`, `Hacking ⟡`, `Compiling▌`).
- **Turn line**: its own closing line, with what the turn cost (`◆ KO in 12s · $0.04 · 3 tools`). Cost, tokens and tool calls each turn on or off in the settings' Turn line tab.
- **Alerts**: a toast as the context or a limit window reaches 80 % (or 70, 90, or off), once more at 95 %. When the context is that full, a **compact** button in the bar compacts the conversation with one click.
- **Sound and notification** (off until you turn them on): when a turn of 30 s or more ends, the skin's own sound (the ring skin rings a boxing bell; others chime, beep, blip, gong or pop) and a notification with the answer's first line. Sound, loudness, notification and the minimum length are yours to set in the Sound tab.
- **Usage bar**: model and effort, git branch, context window, 5-hour and 7-day limits with time to reset, and session cost, as colored powerline blocks. A block turns warning-colored at 60 % and alarm-colored at 85 %. While Claude works, the skin's block pulses and spins. Narrow terminals shed detail block by block. Click the skin's icon to switch skins, the model to switch model or effort, the ⚙ to choose what the bar shows (the skin's name is off by default).

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
| `/skin` | Opens the skin picker: ↑↓ previews, Enter or 1–9, 0, a–j picks, Esc closes. A click on the bar's first block opens it too |
| `/skin list` | Lists the skins as text, marks the current one |
| `/skin model` | Opens the model and effort picker (or click the model in the bar). A model pick is saved as your default, as `/model` does; effort holds for the session, as `/effort` does |
| `/skin bar` | Opens the settings (or click the ⚙ at the bar's end), in tabs: **Bar** (each piece on or off), **Look** (style, icons, chat cards), **Alerts** (when to warn, the compact button), **Turn line** (cost, tokens, tool calls), **Sound** (sound, loudness, notification) |
| `/skin alerts` | Opens the settings on the Alerts tab |
| `/skin usage` | Opens the usage dashboard: the context with its trend and a /context-style breakdown, the limit windows, the cost overall and per turn, the session's totals, with Refresh and Compact buttons |
| `/skin show <item>` / `/skin hide <item>` | Shows or hides one piece: `skinName`, `model`, `effort`, `branch`, `context`, `fiveHour`, `sevenDay`, `cost`, `meters`, `resets`, `gear` |
| `/skin <name>` | Switches the spinner, turn line and HUD, and names the matching color theme |
| `/skin next` | Cycles to the next skin |
| `/skin bar powerline` / `/skin bar header` | Colored powerline blocks, or a quiet header line (session time, context, cost, limit badges) |
| `/skin chat off` / `/skin chat on` | Turns the chat cards off or on |
| `/skin hud off` / `/skin hud on` | Hides or shows the usage bar |
| `/skin glyphs nerd` / `/skin glyphs plain` | Powerline arrows and icons (needs a [Nerd Font](https://www.nerdfonts.com)), or plain blocks for any font |

Your choice is remembered across sessions. Colors are picked in `/theme` (look for `cc-skins · …`): Claude Code keeps the theme yours to choose, so a plugin can't switch it for you. Skins and themes mix freely. The bar collapses with the `[-]` at its right edge.

If you see boxes or question marks in the bar, your font has no powerline glyphs: run `/skin glyphs plain`, or install a Nerd Font (the MesloLGS NF that Powerlevel10k uses works).

The 5h and 7d meters show up on Pro and Max plans once the first response of a session arrives. With an API key you see context and cost.

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

## License

[MIT](LICENSE)
