"""Adds skins described in a JSON file to cc-skins.

Each entry gives an id, label, description, glyph, Nerd Font icon, meter cells, sound, tone (bright,
dark or light), six bar blocks as [bg, fg], pulse, warn and danger, spinner and turn words, chat colors
and the terminal colors it is made for. The script writes the skin into hooks/skins.ts and
types/index.d.ts, its /theme theme into themes/, its Ghostty and iTerm2 schemes into extras/terminal/,
and its rows into both READMEs. Quiet chat text is lifted until it reads on the terminal's background.

    python3 scripts/add_skins.py my-skins.json
"""
import json, re, sys

def rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def hx(c): return '#' + ''.join(f'{max(0, min(255, round(v))):02x}' for v in c)
def mix(a, b, t): return hx([x + (y - x) * t for x, y in zip(rgb(a), rgb(b))])
def lum(h):
    o = []
    for v in rgb(h):
        c = v / 255; o.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * o[0] + 0.7152 * o[1] + 0.0722 * o[2]
def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x + 0.05) / (y + 0.05)
def readable(color, bg):
    toward = '#ffffff' if lum(bg) < 0.5 else '#000000'
    t = 0.0
    while cr(mix(color, toward, t), bg) < 4.5 and t < 1: t += 0.02
    return mix(color, toward, t)
q = lambda v: "'" + v.replace("'", "\\'") + "'"

NEW = json.load(open(sys.argv[1]))
for s in NEW:
    for key in ('user', 'assistant', 'muted', 'success'):
        s['chat'][key] = readable(s['chat'][key], s['term']['bg'])
    for i, (bg, fg) in enumerate(s['blocks'] + [s['warn'], s['danger']]):
        assert cr(bg, fg) >= 4.5, f"{s['id']}: block {i} {bg}/{fg} reads at {cr(bg, fg):.2f}, under 4.5"

out = []
for s in NEW:
    tone = s.get('tone', 'bright')
    flag = '    isDark: true,\n' if tone == 'dark' else '    isLight: true,\n' if tone == 'light' else ''
    blocks = '\n'.join(f"        {{ bg: '{bg}', fg: '{fg}' }}," for bg, fg in s['blocks'])
    suffix = f"\n      suffix: {q(s['suffix'])}," if s.get('suffix') else ''
    c = s['chat']
    out.append(f"""  {s['id']}: {{
    id: '{s['id']}',
{flag}    sound: '{s['sound']}',
    label: '{s['label']}',
    description: {q(s['desc'])},
    glyph: '{s['glyph']}',
    icon: '{s['icon']}',
    meter: {{ fill: '{s['meter'][0]}', empty: '{s['meter'][1]}' }},
    colors: {{
      blocks: [
{blocks}
      ],
      pulse: '{s['pulse']}',
      warn: {{ bg: '{s['warn'][0]}', fg: '{s['warn'][1]}' }},
      danger: {{ bg: '{s['danger'][0]}', fg: '{s['danger'][1]}' }},
    }},
    spinner: {{
      words: [{', '.join(q(w) for w in s['words'])}],
      byMode: {{ thinking: {q(s['thinking'])} }},{suffix}
    }},
    turn: {{ words: [{', '.join(q(w) for w in s['turn'])}], joiner: '{s['joiner']}' }},
    chat: {{ border: '{c['border']}', user: '{c['user']}', assistant: '{c['assistant']}', muted: '{c['muted']}', success: '{c['success']}' }},
  }},""")
src = open('hooks/skins.ts').read()
marker = "\n}\n\nexport const SKIN_IDS"
assert src.count(marker) == 1
open('hooks/skins.ts', 'w').write(src.replace(marker, "\n" + "\n".join(out) + marker))

t = open('types/index.d.ts').read()
m = re.search(r"export type SkinId =\n((?:  \| '[a-z]+'\n)+)", t)
open('types/index.d.ts', 'w').write(t.replace(m.group(0), m.group(0) + ''.join(f"  | '{s['id']}'\n" for s in NEW)))

for s in NEW:
    sid, T, c = s['id'], s['term'], s['chat']
    light = s.get('tone') == 'light'
    error = T['red'] if s['danger'][0].lower() == '#ffffff' else s['danger'][0]
    toward = '#000000' if light else '#ffffff'
    theme = {'name': f"cc-skins · {s['label']}", 'base': 'light' if light else 'dark', 'overrides': {
        'claude': c['assistant'], 'claudeShimmer': mix(c['assistant'], toward, 0.3), 'text': T['fg'], 'inactive': c['muted'],
        'subtle': c['border'], 'suggestion': c['user'], 'permission': c['user'], 'permissionShimmer': mix(c['user'], toward, 0.35),
        'promptBorder': mix(c['border'], toward, 0.12), 'promptBorderShimmer': mix(c['border'], toward, 0.3),
        'planMode': c['user'], 'autoAccept': c['success'], 'bashBorder': s['warn'][0],
        'success': c['success'], 'error': error, 'warning': s['warn'][0],
        'diffAdded': mix(T['bg'], '#2ea043', 0.30), 'diffRemoved': mix(T['bg'], '#f85149', 0.30),
        'diffAddedDimmed': mix(T['bg'], '#2ea043', 0.15), 'diffRemovedDimmed': mix(T['bg'], '#f85149', 0.15),
        'diffAddedWord': mix(T['bg'], '#2ea043', 0.55), 'diffRemovedWord': mix(T['bg'], '#f85149', 0.55),
        'userMessageBackground': mix(T['bg'], c['border'], 0.6), 'userMessageBackgroundHover': mix(T['bg'], c['border'], 0.9),
        'selectionBg': mix(T['bg'], c['assistant'], 0.25 if light else 0.35),
        'rate_limit_fill': c['assistant'], 'rate_limit_empty': c['border']}}
    open(f'themes/{sid}.json', 'w').write(json.dumps(theme, indent=2, ensure_ascii=False) + '\n')
    colors = [T['red'], c['success'], s['warn'][0], T['blue'], c['assistant'], T['cyan']]
    if light:
        ansi = [T['fg']] + colors + [mix(T['bg'], '#000000', 0.12)]
        ansi += [mix(T['fg'], '#ffffff', 0.35)] + [mix(x, '#000000', 0.2) for x in colors] + [mix(T['bg'], '#000000', 0.04)]
    else:
        ansi = [T['bg']] + colors + [T['fg']]
        ansi += [mix(c['border'], '#ffffff', 0.25)] + [mix(x, '#ffffff', 0.3) for x in colors] + ['#ffffff']
    sel = mix(T['bg'], c['assistant'], 0.25 if light else 0.35); cursor = c['assistant']
    g = [f"# cc-skins · {s['label']} — Ghostty theme", f"background = {T['bg']}", f"foreground = {T['fg']}", f"cursor-color = {cursor}",
         f"selection-background = {sel}", f"selection-foreground = {T['fg']}"] + [f'palette = {i}={x}' for i, x in enumerate(ansi)]
    open(f'extras/terminal/ghostty/cc-skins-{sid}', 'w').write('\n'.join(g) + '\n')
    def entry(name, h):
        r, gg, b = [v / 255 for v in rgb(h)]
        return (f"\t<key>{name}</key>\n\t<dict>\n\t\t<key>Alpha Component</key>\n\t\t<real>1</real>\n"
                f"\t\t<key>Blue Component</key>\n\t\t<real>{b:.6f}</real>\n\t\t<key>Color Space</key>\n\t\t<string>sRGB</string>\n"
                f"\t\t<key>Green Component</key>\n\t\t<real>{gg:.6f}</real>\n\t\t<key>Red Component</key>\n\t\t<real>{r:.6f}</real>\n\t</dict>\n")
    body = ''.join(entry(f'Ansi {i} Color', x) for i, x in enumerate(ansi))
    body += entry('Background Color', T['bg']) + entry('Foreground Color', T['fg']) + entry('Bold Color', T['fg'])
    body += entry('Cursor Color', cursor) + entry('Cursor Text Color', T['bg']) + entry('Selection Color', sel) + entry('Selected Text Color', T['fg'])
    open(f'extras/terminal/iterm2/cc-skins-{sid}.itermcolors', 'w').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
        '<plist version="1.0">\n<dict>\n' + body + '</dict>\n</plist>\n')

r = open('extras/terminal/README.md').read()
last = [l for l in r.splitlines() if l.startswith('| ') and '`ghostty/' in l][-1] + '\n'
open('extras/terminal/README.md', 'w').write(r.replace(last, last + ''.join(
    f"| {s['id']} | `ghostty/cc-skins-{s['id']}` | `iterm2/cc-skins-{s['id']}.itermcolors` | {s['font']} |\n" for s in NEW)))

R = open('README.md').read()
last = [l for l in R.splitlines() if re.match(r"^\| `[a-z]+` \|", l)][-1] + '\n'
def spin(s):
    w = s['words']; suf = s.get('suffix') or '…'
    return f"`{w[0]}{suf}`, `{w[min(3, len(w) - 1)]}{suf}`"
open('README.md', 'w').write(R.replace(last, last + ''.join(
    f"| `{s['id']}` | {s['desc']} | {spin(s)} | `{s['glyph']} {s['turn'][0]} in 3s` |\n" for s in NEW)))
print('added', ', '.join(s['id'] for s in NEW))
