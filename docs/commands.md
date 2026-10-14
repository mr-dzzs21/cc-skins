# Commands

[← cc-skins](../README.md) · [All docs](README.md)

| Command | Does |
|---|---|
| `/skin` | Opens the skin picker: ↑↓ previews and Enter picks; a key (1–9, 0, a–p) or a click previews and the same again picks; Esc closes. A click on the bar's first block opens it too (then click into the picker once, so it has the keys) |
| `/skin list` | Lists the skins as text, marks the current one |
| `/skin model` | Opens the model and effort picker (or click the model in the bar). A model pick is saved as your default, as `/model` does; effort holds for the session, as `/effort` does |
| `/skin bar` | Opens the settings (or click the ⚙ at the bar's end), in tabs: **Bar** (each piece on or off), **Look** (style, icons, chat cards), **Alerts** (when to warn, the compact button, warning colors), **Turn line** (cost, tokens, tool calls), **Sound** (sound, loudness, notification) |
| `/skin alerts` | Opens the settings on the Alerts tab |
| `/skin limits` | Reads the 5-hour and 7-day limits live, as `/usage` does (its answer shows in the chat too), and puts them in the bar. A click on a limit in the bar does the same |
| `/skin changes` | Opens the changed files of the repository (or click the branch): the branch and how it stands to its upstream, the line totals, each changed file, read with `git status` |
| `/skin create [name]` | Opens the skin builder, starting from the skin you wear. **Basics:** a name, the skin it starts from (words, icon, sound), an accent (a swatch or any `#rrggbb`) and a style: dark, vivid or light (every color from the accent), or as it is (the base skin's own colors). **Bar colors** and **Turn line and chat:** every piece its own color. A live preview throughout; your skins list under **Yours** in the picker |
| `/skin color` | Opens the builder on the bar colors for the skin you wear (a built-in skin: a copy of it, saved when you save) |
| `/skin color <piece> <color>` | Colors one piece at once, as `/skin color clock red` or `/skin color model #0090ff`; `reset` gives it back. A name (`red`, `blau`, `grün`…) or `#rrggbb`. On a built-in skin this makes your own copy first, `My <Skin>`, and wears it |
| `/skin edit <skin>` / `/skin delete <skin>` | Changes or deletes one of your own skins |
| `/skin export [skin]` / `/skin import <json>` | Shares a skin as one line of JSON (copied to the clipboard); anyone with cc-skins wears it after importing |
| `/skin usage` | Opens the usage dashboard: the context with its trend and a /context-style breakdown, the limit windows, the cost overall and per turn, the session's totals, with Refresh and Compact buttons |
| `/skin show <item>` / `/skin hide <item>` | Shows or hides one piece: `skinName`, `model`, `effort`, `branch`, `context`, `fiveHour`, `sevenDay`, `cost`, `meters`, `resets`, `gear`, and the extras, off until you turn them on: `gitStatus`, `contextTokens`, `burnRate`, `session`, `clock`, `version` |
| `/skin <name>` | Switches the spinner, turn line and HUD, and names the matching color theme |
| `/skin next` | Cycles to the next skin |
| `/skin bar powerline` / `/skin bar header` | Colored powerline blocks, or a quiet header line (session time, context, cost, limit badges) |
| `/skin chat off` / `/skin chat on` | Turns the chat cards off or on |
| `/skin hud off` / `/skin hud on` | Hides or shows the usage bar |
| `/skin glyphs nerd` / `powerline` / `plain` | Powerline arrows and icons (needs a [Nerd Font](https://www.nerdfonts.com)); arrows with short words for the icons and resets in brackets (fonts with Powerline symbols, such as Cascadia Code: the default on Windows until you pick); or plain blocks for any font |

Your choice is remembered across sessions. Colors are picked in `/theme` (look for `cc-skins · …`): Claude Code keeps the theme yours to choose, so a plugin can't switch it for you. Skins and themes mix freely. The bar collapses with the `[-]` at its right edge.
