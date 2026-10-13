# Changelog

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
