"""Builds GitHub's social preview (1280x640, what a shared link shows): the
banner over a real screen, a reply, its turn line and the bar.

    python3 scripts/screens/social.py <shot.json> <skin> <out.svg> --rows A:B [--drop N,M]

Then `rsvg-convert out.svg -o out.png`, and upload the PNG under the
repository's Settings → General → Social preview (GitHub takes it only there).
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from to_svg import ROOT, render

parser = argparse.ArgumentParser()
parser.add_argument('shot'); parser.add_argument('skin'); parser.add_argument('out')
parser.add_argument('--rows'); parser.add_argument('--drop', default='')
a = parser.parse_args()
span = lambda s: tuple(int(v) for v in s.split(':')) if s else None

inner = lambda svg: svg.split('>', 1)[1].rsplit('</svg>', 1)[0]
size = lambda svg: tuple(float(v) for v in re.search(r'width="([\d.]+)" height="([\d.]+)"', svg).groups())
banner = open(os.path.join(ROOT, 'docs/banner.svg'), encoding='utf-8').read()
screen = render(json.load(open(a.shot, encoding='utf-8')), a.skin, span(a.rows), None,
                {int(v) for v in a.drop.split(',') if v}, f'claude · cc-skins · {a.skin}')
(bw, bh), (sw, sh) = size(banner), size(screen)
W, H = 1280, 640
scale = min(1.2, (H - bh - 70) / sh, (W - 80) / sw)
font = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace"
open(a.out, 'w', encoding='utf-8').write('\n'.join([
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{font}">',
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0f1a"/><stop offset="1" stop-color="#1a0f2e"/></linearGradient></defs>',
    f'<rect width="{W}" height="{H}" fill="url(#bg)"/>',
    f'<svg x="{(W - bw) / 2:.0f}" y="6" width="{bw:.0f}" height="{bh:.0f}" viewBox="0 0 {bw:.0f} {bh:.0f}">{inner(banner)}</svg>',
    f'<svg x="{(W - sw * scale) / 2:.0f}" y="{bh + 14:.0f}" width="{sw * scale:.0f}" height="{sh * scale:.0f}" viewBox="0 0 {sw:.0f} {sh:.0f}" font-family="{font}" font-size="14">{inner(screen)}</svg>',
    f'<text x="{W / 2:.0f}" y="{H - 18}" fill="#8b949e" font-size="18" text-anchor="middle">github.com/mr-dzzs21/cc-skins</text>',
    '</svg>', '',
]))
