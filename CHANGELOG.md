# Changelog

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
