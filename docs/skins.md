# Skins

[← cc-skins](../README.md) · [All docs](README.md)

<p><img src="skins.svg" alt="The usage bar in each of the 26 built-in skins" width="100%"></p>

Twenty-six built in: twelve vivid, eight dark, six for light terminals. `/skin` opens the picker: ↑↓ previews each skin as you land on it, in the picker and in the real bar; Enter picks. A skin's key or a click previews it too, and the same again picks it (the terminal doesn't tell plugins where the mouse hovers, so a click stands in). Esc goes back to the one you had.

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

## What a skin changes

Each skin changes:

- **Chat**: your messages and Claude's replies become framed cards with icon badges, names and send times; Claude's text hangs off an accent line; todo lists become a plan card with green ticks; tool calls and command output sit in cards; the prompt's hint and mode labels get a cleaner look.
- **Colors**: a matching Claude Code color theme (accents, prompt border, diffs, plan/auto modes, message backgrounds), picked in `/theme`; built-in skins only.
- **Spinner**: its own words while Claude works (`Jabbing…`, `Hacking ⟡`, `Compiling▌`).
- **Turn line**: its own closing line, with what the turn cost (`◆ KO in 12s · $0.04 · 3 tools`). Cost, tokens and tool calls each turn on or off in the settings' Turn line tab.
- **Alerts**: a toast as the context or a limit window reaches 80 % (or 70, 90, or off), once more at 95 %. When the context is that full, a **compact** button in the bar compacts the conversation with one click.
- **Sound and notification** (off until you turn them on): when a turn of 30 s or more ends, the skin's own sound (the ring skin rings a boxing bell; others chime, beep, blip, gong or pop) and a notification saying how long the turn took (with the answer's first line, if you turn that on too). Sound, loudness, notification, its preview and the minimum length are yours to set in the Sound tab.

## What changes, and where

| What | Changed by | When |
|---|---|---|
| The bar, chat cards, spinner, turn line, sounds | the skin: `/skin` | at once, with every skin, yours too |
| Claude Code's own colors: accents, prompt border, diffs, message backgrounds | `/theme` → `cc-skins · <Skin>` | when you pick it there: Claude Code keeps the theme yours to choose, and only built-in skins come with one |
| The terminal's background and font | your terminal app | when you set it there: [`extras/terminal`](../extras/terminal) has a scheme per skin and font tips |

## Your own skins

`/skin create [name]` opens the builder, starting from the skin you wear, in three tabs:

- **Basics:** a name, the skin it starts from (its words, icon and sound), an accent (a swatch or any `#rrggbb`), and a style: dark (the accent fading into black), vivid (the accent across nearby hues), light (for light terminals), or as it is (the base skin's own colors, untouched).
- **Bar colors:** every block of the bar in a row, drawn in its colors, with a field for its own: skin block, model, branch, context, 5-hour and 7-day limits, cost, session time, clock, version, and the warning and alarm colors.
- **Turn line and chat:** the turn line's word, time and cost, the card frames, your name, Claude's, quiet text and done ticks.

Type a color name (`red`, `blue`, `gold`, or in German `rot`, `blau`, `grün`…) or `#rrggbb` and press Enter; an empty field gives the piece back to the style, and *All back to the style* does that for the whole tab. Only the ground is yours to pick for a block: the text on it is chosen to read on it, and a chat color too dark or light for the terminal is lifted just far enough, so every text stays readable.

Quicker, from the prompt: `/skin color clock red` colors one piece of the skin you wear, `/skin color clock reset` gives it back, `/skin color` alone opens the builder on the bar colors. Built-in skins stay as they are: on one, the first color makes your own copy, `My <Skin>`, looking the same but for that piece, and wears it.

Your skins list under **Yours** in the picker; `/skin edit` and `/skin delete` change or remove them.

`/skin export [skin]` copies a skin as one line of JSON; anyone with cc-skins wears it after `/skin import <json>`. A shared skin is data, not code: a name, a built-in base, an accent and a style.

<table>
<tr>
<td width="50%"><img src="screens/builder.svg" alt="The skin builder's basics: a name, the skin to start from, an accent, the style, and a live preview" width="100%"></td>
<td width="50%"><img src="screens/builder-colors.svg" alt="The skin builder's bar colors: every block in a row in its colors, the model set to blue and the clock to red" width="100%"></td>
</tr>
</table>

## Colors and fonts outside the bar

- **Claude Code's own colors** (accents, prompt border, diffs, message backgrounds) come from its color theme: open `/theme` and pick `cc-skins · <skin>`. Claude Code keeps the theme yours to choose, so a plugin can't switch it for you. Skins and themes mix freely; only built-in skins come with a theme.
- **The terminal's background and font** belong to your terminal app: [`extras/terminal`](../extras/terminal) has a Ghostty and an iTerm2 scheme for each skin, plus font suggestions.
