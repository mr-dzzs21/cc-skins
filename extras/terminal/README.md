# Terminal colors and fonts

Claude Code draws characters and colors; the **font** and the terminal's own
background belong to your terminal app. These files match each skin so the
whole window fits, not just Claude Code's parts.

| Skin | Ghostty | iTerm2 | Suggested font |
|---|---|---|---|
| midnight | `ghostty/cc-skins-midnight` | `iterm2/cc-skins-midnight.itermcolors` | JetBrains Mono or Geist Mono |
| retro | `ghostty/cc-skins-retro` | `iterm2/cc-skins-retro.itermcolors` | [VT323](https://fonts.google.com/specimen/VT323) or IBM Plex Mono |
| neon | `ghostty/cc-skins-neon` | `iterm2/cc-skins-neon.itermcolors` | Space Mono or Monaspace Radon |
| minimal | `ghostty/cc-skins-minimal` | `iterm2/cc-skins-minimal.itermcolors` | JetBrains Mono or Geist Mono |
| ring | `ghostty/cc-skins-ring` | `iterm2/cc-skins-ring.itermcolors` | Iosevka or Fira Code |

With `/skin glyphs plain`, cc-skins draws only standard Unicode characters,
so any monospace font works. The default powerline look needs a
[Nerd Font](https://www.nerdfonts.com), such as the MesloLGS NF that
Powerlevel10k installs.

## Ghostty

```sh
mkdir -p ~/.config/ghostty/themes
cp ghostty/cc-skins-* ~/.config/ghostty/themes/
```

Then in `~/.config/ghostty/config`:

```
theme = cc-skins-midnight
font-family = "JetBrainsMono Nerd Font"
```

## iTerm2

Settings → Profiles → Colors → Color Presets… → Import…, pick the
`.itermcolors` file, then choose it from the same menu. The font is under
Settings → Profiles → Text.
