# cc-skins

Skins for [Claude Code](https://code.claude.com) in the terminal. One plugin, four looks, and a powerline usage bar that sits above the prompt, always in view.

```
 RING   Opus 5.5   ■■□□□ 34%   ■■■■□ 72% ↻2h13m   ■■■■■ 91% ↻3d4h  $1.24 
╭──────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

Every block has its own color: in a Nerd Font they join with powerline arrows, p10k style.

Each skin changes:

- **Colors**: a full Claude Code color theme (accents, prompt border, diffs, plan/auto modes, message backgrounds).
- **Spinner**: its own words while Claude works (`Jabbing…`, `Hacking ⟡`, `Compiling▌`).
- **Turn line**: its own closing line (`◆ KO in 12s`, `⟡ Jacked in for 3s`).
- **Usage bar**: model, context window, 5-hour and 7-day limits with time to reset, and session cost, as colored powerline blocks. A block turns warning-colored at 60 % and alarm-colored at 85 %. While Claude works, the skin's block pulses and spins. Narrow terminals shed detail block by block.

| Skin | Look | Spinner | Turn line |
|---|---|---|---|
| `retro` | Phosphor green and amber | `Compiling▌` | `▌ Done in 3s` |
| `neon` | Magenta and cyan | `Hacking ⟡` | `⟡ Jacked in for 3s` |
| `minimal` | Muted grey, one calm accent | `Thinking…`, `Writing…` | `· Done in 3s` |
| `ring` | Red and gold, boxing ring | `Jabbing…`, `Slipping…` | `◆ KO in 3s` |

## Install

In Claude Code, type:

```
/plugin install cc-skins --marketplace mr-dzzs21/cc-skins
```

Answer `y` to add the marketplace and pick the user scope. Then:

```
/skin ring
/theme          # pick "cc-skins · Ring" for the matching colors
```

Requires Claude Code 2.1.296 or newer (function-hook plugins and custom themes).

## Usage

| Command | Does |
|---|---|
| `/skin` | Lists the skins, marks the current one |
| `/skin <name>` | Switches the spinner, turn line and HUD, and names the matching color theme |
| `/skin next` | Cycles to the next skin |
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
- `hooks/hud.tsx`: the powerline bar: which blocks show at which width, their colors, and how they're drawn.
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

## License

[MIT](LICENSE)
