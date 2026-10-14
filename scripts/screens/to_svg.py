"""Turns a captured terminal screen (drive.py's JSON) into an SVG terminal window.

Cells keep their colors; the terminal's own colors come from the skin's Ghostty
scheme, as if that scheme were set. Box-drawing borders, the powerline caps and
arrows and the quote bar are drawn as shapes, so the picture needs no Nerd Font
and its frames join up in any browser.

    python3 scripts/screens/to_svg.py <shot.json> <skin> <out.svg> [--rows A:B] [--cols A:B] [--drop N,M] [--title T] [--trim]
"""
import argparse, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CW, RH, FONT, BASE = 8.4, 19, 14, 14
FONTS = "'JetBrains Mono','SF Mono','Cascadia Code',Menlo,Consolas,'DejaVu Sans Mono',monospace"
BRANCH = '\ue0a0'  # the branch mark in a Powerline font
NAMES = ['black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'white']


def scheme(skin):
    text = open(os.path.join(ROOT, 'extras/terminal/ghostty', f'cc-skins-{skin}'), encoding='utf-8').read()
    get = lambda key: re.search(rf'^{key} = (#[0-9a-fA-F]{{6}})$', text, re.M).group(1)
    palette = dict((int(i), c) for i, c in re.findall(r'^palette = (\d+)=(#[0-9a-fA-F]{6})$', text, re.M))
    return get('background'), get('foreground'), palette


def color(value, default, palette):
    if value in (None, 'default'):
        return default
    if re.fullmatch(r'[0-9a-fA-F]{6}', value):
        return '#' + value.lower()
    bright = value.startswith('bright')
    name = value[6:] if bright else value
    if name in NAMES:
        return palette.get(NAMES.index(name) + (8 if bright else 0), default)
    return default


def esc(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def shape(ch, x, y, fg):
    """A cell drawn as a shape: borders, powerline pieces, the quote bar. None for text."""
    mx, my, r = x + CW / 2, y + RH / 2, CW / 2
    stroke = f'stroke="{fg}" stroke-width="1.3" fill="none"'
    if ch == '─':
        return f'<path d="M{x:.1f} {my:.1f}h{CW + 0.2}" {stroke}/>'
    if ch == '│':
        return f'<path d="M{mx:.1f} {y:.1f}v{RH + 0.2}" {stroke}/>'
    if ch == '╭':
        return f'<path d="M{mx:.1f} {y + RH + 0.2:.1f}V{my + r:.1f}a{r} {r} 0 0 1 {r} {-r}H{x + CW + 0.2:.1f}" {stroke}/>'
    if ch == '╮':
        return f'<path d="M{x - 0.2:.1f} {my:.1f}H{mx - r:.1f}a{r} {r} 0 0 1 {r} {r}V{y + RH + 0.2:.1f}" {stroke}/>'
    if ch == '╰':
        return f'<path d="M{mx:.1f} {y - 0.2:.1f}V{my - r:.1f}a{r} {r} 0 0 0 {r} {r}H{x + CW + 0.2:.1f}" {stroke}/>'
    if ch == '╯':
        return f'<path d="M{x - 0.2:.1f} {my:.1f}H{mx - r:.1f}a{r} {r} 0 0 0 {r} {-r}V{y - 0.2:.1f}" {stroke}/>'
    if ch == '▎':
        return f'<rect x="{x + 1:.1f}" y="{y:.1f}" width="2.4" height="{RH + 0.2}" fill="{fg}"/>'
    if ch == '':
        return f'<path d="M{x:.1f} {y:.1f}L{x + CW:.1f} {my:.1f}L{x:.1f} {y + RH:.1f}Z" fill="{fg}"/>'
    if ch == '':
        return f'<path d="M{x + CW:.1f} {y:.1f}L{x:.1f} {my:.1f}L{x + CW:.1f} {y + RH:.1f}Z" fill="{fg}"/>'
    if ch == '':
        return f'<path d="M{x:.1f} {y:.1f}A{CW} {RH / 2} 0 0 1 {x:.1f} {y + RH:.1f}Z" fill="{fg}"/>'
    if ch == '':
        return f'<path d="M{x + CW:.1f} {y:.1f}A{CW} {RH / 2} 0 0 0 {x + CW:.1f} {y + RH:.1f}Z" fill="{fg}"/>'
    return None


def render(shot, skin, rows=None, cols=None, drop=(), title='', trim=False):
    bg0, fg0, palette = scheme(skin)
    cells = shot['cells']
    r0, r1 = rows or (0, shot['rows'])
    c0, c1 = cols or (0, shot['cols'])
    keep = [y for y in range(r0, r1) if y not in drop]
    if trim:  # rows at the end with nothing in the crop but a pane's edge or the prompt's rule
        while keep and all(cells[keep[-1]][x][0] in ' │─' for x in range(c0, c1)):
            keep.pop()
        keep += [y for y in range(keep[-1] + 1, min(keep[-1] + 2, shot['rows']))] if keep else []
    pad, bar = 16, 30
    width = (c1 - c0) * CW + pad * 2
    height = bar + 8 + len(keep) * RH + pad
    out = []
    for line, y in enumerate(keep):
        top = bar + 8 + line * RH
        row = cells[y]
        runs, fills, rules, shapes, x = [], [], [], [], c0
        while x < c1:
            ch, fg, bg, bold, reverse = row[x][0], row[x][1], row[x][2], row[x][3], row[x][4]
            f, b = color(fg, fg0, palette), color(bg, bg0, palette)
            if reverse:
                f, b = b, f
            wide = x + 1 < c1 and row[x + 1][0] == ''
            span = 2 if wide else 1
            left = pad + (x - c0) * CW
            # a run of one background is one rect, a run of ─ in one color one line
            if b != bg0:
                if fills and fills[-1][1] == b and fills[-1][2] == x:
                    fills[-1][2] = x + span
                else:
                    fills.append([x, b, x + span])
            if ch == BRANCH:
                ch = '⎇'
            if ch == '─':
                if rules and rules[-1][1] == f and rules[-1][2] == x:
                    rules[-1][2] = x + span
                else:
                    rules.append([x, f, x + span])
            elif shape(ch, left, top, f) is not None:
                shapes.append(shape(ch, left, top, f))
            elif ch.strip() != '':
                if runs and runs[-1]['f'] == f and runs[-1]['bold'] == bold and runs[-1]['end'] == x:
                    runs[-1]['text'] += ch
                    runs[-1]['end'] = x + span
                    runs[-1]['cells'] += span
                else:
                    runs.append({'x': left, 'f': f, 'bold': bold, 'text': ch, 'end': x + span, 'cells': span})
            elif runs and runs[-1]['end'] == x and runs[-1]['f'] == f and runs[-1]['bold'] == bold:
                runs[-1]['text'] += ' '
                runs[-1]['end'] = x + 1
                runs[-1]['cells'] += 1
            x += span
        at = lambda col: pad + (col - c0) * CW
        out.extend(f'<rect x="{at(a):.1f}" y="{top:.1f}" width="{(z - a) * CW + 0.4:.1f}" height="{RH + 0.4}" fill="{c}"/>' for a, c, z in fills)
        out.extend(f'<path d="M{at(a):.1f} {top + RH / 2:.1f}h{(z - a) * CW + 0.2:.1f}" stroke="{c}" stroke-width="1.3"/>' for a, c, z in rules)
        out.extend(shapes)
        for run in runs:
            text = run['text'].rstrip()
            cells_used = run['cells'] - (len(run['text']) - len(text))
            weight = ' font-weight="700"' if run['bold'] else ''
            out.append(f'<text x="{run["x"]:.1f}" y="{top + BASE:.1f}" fill="{run["f"]}"{weight} textLength="{cells_used * CW:.1f}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">{esc(text)}</text>')
    head = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" viewBox="0 0 {width:.0f} {height:.0f}" font-family="{FONTS}" font-size="{FONT}" role="img" aria-label="{esc(title)}">',
        f'<rect width="{width:.0f}" height="{height:.0f}" rx="12" fill="{bg0}"/>',
        f'<path d="M0 12a12 12 0 0 1 12-12h{width - 24:.0f}a12 12 0 0 1 12 12v{bar - 12}H0Z" fill="{fg0}" opacity=".08"/>',
        '<circle cx="20" cy="15" r="5.5" fill="#ff5f57"/><circle cx="38" cy="15" r="5.5" fill="#febc2e"/><circle cx="56" cy="15" r="5.5" fill="#28c840"/>',
        f'<text x="{width / 2:.0f}" y="20" fill="{fg0}" opacity=".6" text-anchor="middle" font-size="12">{esc(title)}</text>',
    ]
    return '\n'.join(head + out + ['</svg>', ''])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('shot'); parser.add_argument('skin'); parser.add_argument('out')
    parser.add_argument('--rows'); parser.add_argument('--cols'); parser.add_argument('--drop', default='')
    parser.add_argument('--title', default='')
    parser.add_argument('--trim', action='store_true', help='drop the empty rows at the end')
    a = parser.parse_args()
    span = lambda s: tuple(int(v) for v in s.split(':')) if s else None
    shot = json.load(open(a.shot, encoding='utf-8'))
    drop = {int(v) for v in a.drop.split(',') if v}
    open(a.out, 'w', encoding='utf-8').write(render(shot, a.skin, span(a.rows), span(a.cols), drop, a.title, a.trim))
