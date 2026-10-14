"""Turns the screens capture.py saved into the README's pictures:

- docs/hero.svg: the chat, its turn line and the bar, fading through ten skins
- docs/screens/<pane>.svg: each pane, cut to the pane
- docs/screens/bar-header.svg, bar-alerts.svg, bar-extras.svg: the quiet header, the bar at 72 % and 91 %, every extra on
- docs/social-preview.svg (and .png, where rsvg-convert is installed): GitHub's link preview

    python3 scripts/screens/build.py .work/shots
"""
import json, os, shutil, subprocess, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from to_svg import ROOT, render

SHOTS = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.work/shots')
DOCS = os.path.join(ROOT, 'docs')
HERO = ['ring', 'synthwave', 'nebula', 'midnight', 'abyss', 'sakura', 'emerald', 'neon', 'ocean']
PANES = [('picker', 'panes', 'nebula', '/skin'), ('model', 'panes', 'nebula', '/skin model'),
         ('settings', 'panes', 'nebula', '/skin bar'), ('alerts', 'panes', 'nebula', '/skin alerts'),
         ('dashboard', 'panes', 'nebula', '/skin usage'), ('builder', 'panes', 'nebula', '/skin create'),
         ('builder-colors', 'panes', 'nebula', '/skin color'),
         ('changes', 'frames', 'ring', '/skin changes')]


def load(run, name):
    return json.load(open(os.path.join(SHOTS, run, f'{name}.json'), encoding='utf-8'))


def lines(shot):
    return [''.join(cell[0] for cell in row) for row in shot['cells']]


def pane_left(shot):
    """The column a pane starts at: right of its left edge, the most common │ past the chat's middle."""
    edges = Counter(x for row in shot['cells'] for x, cell in enumerate(row) if cell[0] == '│' and x > 30)
    return edges.most_common(1)[0][0] + 1


def chat_rows(shot):
    """From the first card to the prompt's lower rule: Claude Code's header and footer out, blank runs one row."""
    text = lines(shot)
    first = next(y for y, line in enumerate(text) if line.lstrip().startswith('╭'))
    rules = [y for y, line in enumerate(text) if line.strip() and set(line.strip()) == {'─'}]
    keep, blank = [], False
    for y in range(first, rules[-1] + 1):
        empty = text[y].strip() == '' or "You've used" in text[y]
        if empty and blank:
            continue
        if "You've used" not in text[y]:
            keep.append(y)
        blank = empty
    return keep


def bar_row(shot):
    return max(y for y, line in enumerate(lines(shot)) if '[-]' in line)


def write(path, svg):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(svg)
    print(os.path.relpath(path, ROOT), f'{len(svg) // 1024} KB')


# the hero: every frame cut to the same rows (the chat's own, the same in each skin)
frames = [(load('frames', f'frame-{skin}'), skin) for skin in HERO]
rows = chat_rows(frames[0][0])
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'animate.py'), os.path.join(DOCS, 'hero.svg'), '3',
                *[os.path.join(SHOTS, 'frames', f'frame-{skin}.json') + f':{skin}' for skin in HERO],
                '--rows', f'{rows[0]}:{rows[-1] + 1}',
                '--drop', ','.join(str(y) for y in set(range(rows[0], rows[-1] + 1)) - set(rows)),
                '--title', 'claude · cc-skins · {skin}'], check=True)

for name, run, skin, title in PANES:
    shot = load(run, {'builder-colors': 'colors'}.get(name, name))
    write(os.path.join(DOCS, 'screens', f'{name}.svg'),
          render(shot, skin, None, (pane_left(shot), shot['cols']), (), title, trim=True))

for name, run, shot_name, skin, title in [('bar-header', 'frames', 'header', 'ring', '/skin bar header'),
                                          ('bar-alerts', 'frames', 'hot', 'ring', 'a limit at 72 % and one at 91 %'),
                                          ('bar-extras', 'panes', 'extras', 'nebula', 'every extra on')]:
    shot = load(run, shot_name)
    y = bar_row(shot)
    write(os.path.join(DOCS, 'screens', f'{name}.svg'), render(shot, skin, (y, y + 1), None, (), title))

# the social preview: the banner over Claude's reply, its turn line and the bar
ring = load('frames', 'frame-ring')
reply = next(y for y, line in enumerate(lines(ring)) if 'CLAUDE' in line) - 1
social = [y for y in rows if y >= reply and y <= bar_row(ring)]
svg_path = os.path.join(DOCS, 'social-preview.svg')
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'social.py'),
                os.path.join(SHOTS, 'frames', 'frame-ring.json'), 'ring', svg_path,
                '--rows', f'{social[0]}:{social[-1] + 1}',
                '--drop', ','.join(str(y) for y in set(range(social[0], social[-1] + 1)) - set(social))], check=True)
if shutil.which('rsvg-convert'):
    subprocess.run(['rsvg-convert', svg_path, '-o', os.path.join(DOCS, 'social-preview.png')], check=True)
    print('docs/social-preview.png')
