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
| synthwave | `ghostty/cc-skins-synthwave` | `iterm2/cc-skins-synthwave.itermcolors` | Space Mono or Monaspace Radon |
| ocean | `ghostty/cc-skins-ocean` | `iterm2/cc-skins-ocean.itermcolors` | JetBrains Mono or Fira Code |
| sakura | `ghostty/cc-skins-sakura` | `iterm2/cc-skins-sakura.itermcolors` | Victor Mono or Recursive Mono |
| forest | `ghostty/cc-skins-forest` | `iterm2/cc-skins-forest.itermcolors` | IBM Plex Mono or Iosevka |
| arctic | `ghostty/cc-skins-arctic` | `iterm2/cc-skins-arctic.itermcolors` | JetBrains Mono or Geist Mono |
| lava | `ghostty/cc-skins-lava` | `iterm2/cc-skins-lava.itermcolors` | Iosevka or Fira Code |
| candy | `ghostty/cc-skins-candy` | `iterm2/cc-skins-candy.itermcolors` | Comic Mono or Recursive Mono |
| obsidian | `ghostty/cc-skins-obsidian` | `iterm2/cc-skins-obsidian.itermcolors` | JetBrains Mono or Geist Mono |
| vampire | `ghostty/cc-skins-vampire` | `iterm2/cc-skins-vampire.itermcolors` | Victor Mono or IBM Plex Mono |
| abyss | `ghostty/cc-skins-abyss` | `iterm2/cc-skins-abyss.itermcolors` | JetBrains Mono or Fira Code |
| emerald | `ghostty/cc-skins-emerald` | `iterm2/cc-skins-emerald.itermcolors` | IBM Plex Mono or Iosevka |
| noir | `ghostty/cc-skins-noir` | `iterm2/cc-skins-noir.itermcolors` | Courier Prime or IBM Plex Mono |
| ember | `ghostty/cc-skins-ember` | `iterm2/cc-skins-ember.itermcolors` | Iosevka or Fira Code |
| nebula | `ghostty/cc-skins-nebula` | `iterm2/cc-skins-nebula.itermcolors` | Space Mono or Monaspace Radon |
| aurora | `ghostty/cc-skins-aurora` | `iterm2/cc-skins-aurora.itermcolors` | JetBrains Mono or Recursive Mono |

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
