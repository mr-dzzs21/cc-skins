# cc-skins

Skins for [Claude Code](https://code.claude.com) in the terminal. One plugin, four looks, and a live usage HUD above the prompt.

```
◆ ring │ Opus 5.5 │ ctx ■■■□□□□□ 34% │ 5h ■■■■■■□□ 72% ↻2h13m │ 7d ■■■■■■■□ 91% ↻3d4h │ $1.24
╭──────────────────────────────────────────────────────────────────────────────────────────╮
│ >                                                                                        │
╰──────────────────────────────────────────────────────────────────────────────────────────╯
```

Each skin changes:

- **Colors**: a full Claude Code color theme (accents, prompt border, diffs, plan/auto modes, message backgrounds).
- **Spinner**: its own words while Claude works (`Jabbing…`, `Hacking ⟡`, `Compiling▌`).
- **Turn line**: its own closing line (`◆ KO in 12s`, `⟡ Jacked in for 3s`).
- **HUD**: model, context window, 5-hour and 7-day limits with time to reset, and session cost. The meters turn yellow at 60 % and red at 85 %. Narrow terminals get a compact version.

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
| `/skin hud off` / `/skin hud on` | Hides or shows the usage HUD |

Your choice is remembered across sessions. Colors are picked in `/theme` (look for `cc-skins · …`): Claude Code keeps the theme yours to choose, so a plugin can't switch it for you. Skins and themes mix freely. The HUD collapses with the `[-]` at its right edge.

The 5h and 7d meters show up on Pro and Max plans once the first response of a session arrives. With an API key you see context and cost.

## Fonts and terminal colors

Claude Code can't change your font: the terminal app draws it. [`extras/terminal`](extras/terminal) has matching Ghostty and iTerm2 color schemes for each skin, plus font suggestions.

## How it works

cc-skins is a Claude Code plugin made of:

- `themes/*.json`: color themes in Claude Code's custom-theme format (`name`, `base`, `overrides`).
- `hooks/register.tsx`: function hooks that redraw the `AbovePrompt` band (HUD), rewrite the `Spinner` words, draw the `TurnDuration` line, and serve `/skin`. Usage figures come from the `session.measure` event, pushed after each turn, so nothing polls.
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
