"""What the screenshots show, shared by capture.py and build.py: which skins, in which order.

The panes are recorded in PANES_SKIN, the hero fades from FRAMES_SKIN through HERO, and the
social preview, the bar styles and the changed files are in FRAMES_SKIN too. The hero changes
skin through the picker's hotkeys (no command line in the chat), so its skins must be among
the first 36 the picker lists.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PANES_SKIN = 'catppuccin-mocha'
FRAMES_SKIN = 'tokyo-night'
HERO = ['tokyo-night', 'catppuccin-mocha', 'dracula', 'ring', 'gruvbox', 'synthwave', 'rose-pine', 'nord', 'nebula']
HOTKEYS = '1234567890abcdefghijklmnopqrstuvwxyz'


def skin_order():
    """The built-in skins as hooks/skins.ts defines them, which is the order the picker lists them in."""
    source = open(os.path.join(ROOT, 'hooks/skins.ts'), encoding='utf-8').read().split('export const SKINS', 1)[-1]
    return re.findall(r"""^  ['"]?([a-z][a-z0-9-]*)['"]?: \{$""", source, re.M)


def hotkey(skin):
    """The picker's key for a skin: 1–9, 0, a–z by its place in the list."""
    place = skin_order().index(skin)
    assert place < len(HOTKEYS), f'{skin} is skin {place + 1} in the picker: past the last hotkey'
    return HOTKEYS[place]
