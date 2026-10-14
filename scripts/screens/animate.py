"""Builds an animated SVG from several captured screens: each shows for a few
seconds and fades into the next, the first one standing in where animation is
off (reduced motion, or a viewer without CSS animation).

    python3 scripts/screens/animate.py <out.svg> <seconds> <shot.json>:<skin>... [--rows A:B] [--drop N,M] [--title T]

The title may hold {skin}, filled with each frame's skin.
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from to_svg import render

parser = argparse.ArgumentParser()
parser.add_argument('out'); parser.add_argument('seconds', type=float); parser.add_argument('frames', nargs='+')
parser.add_argument('--rows'); parser.add_argument('--cols'); parser.add_argument('--drop', default=''); parser.add_argument('--title', default='')
a = parser.parse_args()
span = lambda s: tuple(int(v) for v in s.split(':')) if s else None
drop = {int(v) for v in a.drop.split(',') if v}

bodies, size = [], None
for index, frame in enumerate(a.frames):
    path, skin = frame.rsplit(':', 1)
    svg = render(json.load(open(path, encoding='utf-8')), skin, span(a.rows), span(a.cols), drop, a.title.replace('{skin}', skin))
    size = size or re.search(r'width="(\d+)" height="(\d+)"', svg).groups()
    body = svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
    bodies.append(f'<g class="frame{" first" if index == 0 else ""}" style="animation-delay:{index * a.seconds:g}s">{body}</g>')

count = len(bodies)
cycle = count * a.seconds
share = 100 / count
width, height = size
print(f'{a.out}: {count} frames, {cycle:g}s')
open(a.out, 'w', encoding='utf-8').write('\n'.join([
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
    f'font-family="\'JetBrains Mono\',\'SF Mono\',\'Cascadia Code\',Menlo,Consolas,\'DejaVu Sans Mono\',monospace" font-size="14" '
    f'role="img" aria-label="{a.title.replace("{skin}", "").strip(" ·")}">',
    '<style>',
    f'.frame{{opacity:0;animation:show {cycle:g}s infinite backwards}}',
    '.first{opacity:1}',
    # each frame stays in until the next has faded in over it, so nothing shows through
    f'@keyframes show{{0%{{opacity:0}}1%{{opacity:1}}{share + 1:.2f}%{{opacity:1}}{share + 1.5:.2f}%{{opacity:0}}100%{{opacity:0}}}}',
    '@media (prefers-reduced-motion:reduce){.frame{animation:none}}',
    '</style>',
    *bodies,
    '</svg>',
    '',
]))
