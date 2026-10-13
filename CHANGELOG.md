# Changelog

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
