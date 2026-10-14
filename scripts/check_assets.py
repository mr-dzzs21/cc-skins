"""Checks what the plugin ships besides its code, with Python alone (CI runs it on every push).

- every JSON file parses: the manifests and the themes, each theme with a name, a base and overrides
- every iTerm2 scheme is a well-formed property list
- every Python script compiles
- every built-in skin has its theme, its Ghostty scheme and its iTerm2 scheme
- the README's pictures exist, and the skin gallery has every built-in skin (scripts/render_previews.ts
  draws the gallery and the banner, scripts/screens/ records the screenshots)
- every relative link and picture in the README, the guides and docs/ points at a file
- the manifest's version is the changelog's newest and hooks/doctor.ts's
- the marketplace points at a release tag (scripts/release.py moves it), not ahead of the code

    python3 scripts/check_assets.py
"""
import glob, json, os, plistlib, py_compile, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
problems = []

def check(condition, problem):
    if not condition:
        problems.append(problem)

os.chdir(ROOT)

for path in sorted(glob.glob('.claude-plugin/*.json') + glob.glob('themes/*.json')):
    try:
        data = json.load(open(path, encoding='utf-8'))
    except ValueError as error:
        problems.append(f'{path}: not JSON ({error})')
        continue
    if path.startswith('themes/'):
        check(isinstance(data.get('name'), str), f'{path}: no name')
        check(data.get('base') in ('dark', 'light'), f'{path}: base is not dark or light')
        overrides = data.get('overrides')
        check(isinstance(overrides, dict) and overrides, f'{path}: no overrides')
        for token, color in (overrides or {}).items():
            check(re.fullmatch(r'#[0-9a-fA-F]{6}', str(color)) is not None, f'{path}: {token} is not #rrggbb')

for path in sorted(glob.glob('extras/terminal/iterm2/*.itermcolors')):
    try:
        plistlib.load(open(path, 'rb'))
    except Exception as error:
        problems.append(f'{path}: not a property list ({error})')

for path in sorted(glob.glob('scripts/**/*.py', recursive=True)):
    try:
        py_compile.compile(path, doraise=True)
    except py_compile.PyCompileError as error:
        problems.append(f'{path}: does not compile ({error.msg})')

table = open('hooks/skins.ts', encoding='utf-8').read().split('export const SKINS', 1)[-1]
skins = re.findall(r"""^  ['"]?([a-z][a-z0-9-]*)['"]?: \{$""", table, re.M)
check(len(skins) >= 20, f'hooks/skins.ts: found {len(skins)} skins, expected the built-ins')
for skin in skins:
    for path in (f'themes/{skin}.json', f'extras/terminal/ghostty/cc-skins-{skin}', f'extras/terminal/iterm2/cc-skins-{skin}.itermcolors'):
        check(os.path.isfile(path), f'{skin}: {path} is missing')

gallery = open('docs/skins.svg', encoding='utf-8').read() if os.path.isfile('docs/skins.svg') else ''
for picture in ['banner.svg', 'hero.svg', 'social-preview.png'] + [f'screens/{name}.svg' for name in
                ('picker', 'model', 'settings', 'alerts', 'dashboard', 'builder', 'builder-colors', 'changes', 'bar-header', 'bar-alerts', 'bar-extras')]:
    check(os.path.isfile(f'docs/{picture}'), f'docs/{picture} is missing: see scripts/screens/README.md')
for skin in skins:
    check(f'data-skin="{skin}"' in gallery, f'{skin}: not in docs/skins.svg, run scripts/render_previews.ts')

# every relative link and picture in the Markdown resolves to a file (pages moved into docs/ keep working)
for page in ['README.md', 'CONTRIBUTING.md', 'SECURITY.md'] + sorted(glob.glob('docs/*.md')):
    text = open(page, encoding='utf-8').read()
    for target in re.findall(r'\]\(([^)\s]+)\)|src="([^"]+)"', text):
        target = next(t for t in target if t)
        if re.match(r'(https?:|mailto:|#)', target):
            continue
        path = os.path.normpath(os.path.join(os.path.dirname(page), target.split('#')[0]))
        check(os.path.exists(path), f'{page}: links to {target}, which is not there')

version = json.load(open('.claude-plugin/plugin.json', encoding='utf-8')).get('version')
newest = re.search(r'^## (\S+)', open('CHANGELOG.md', encoding='utf-8').read(), re.M)
check(newest is not None and newest.group(1) == version, f'plugin.json says {version}, CHANGELOG.md says {newest and newest.group(1)}')
doctor = re.search(r"CC_SKINS_VERSION = '([^']+)'", open('hooks/doctor.ts', encoding='utf-8').read())
check(doctor is not None and doctor.group(1) == version, f'plugin.json says {version}, hooks/doctor.ts says {doctor and doctor.group(1)}')

# people get a release, not main: the marketplace points at a release tag, never one ahead of the code
semver = lambda text: tuple(int(n) for n in text.split('.'))
entry = next((one for one in json.load(open('.claude-plugin/marketplace.json', encoding='utf-8')).get('plugins', []) if one.get('name') == 'cc-skins'), {})
source = entry.get('source') if isinstance(entry.get('source'), dict) else {}
pinned = re.fullmatch(r'cc-skins--v(\d+\.\d+\.\d+)', str(source.get('ref', '')))
check(source.get('source') == 'github' and source.get('repo') == 'mr-dzzs21/cc-skins' and pinned is not None,
      'marketplace.json: cc-skins must come from github mr-dzzs21/cc-skins at a cc-skins--v<version> tag (scripts/release.py sets it)')
check(pinned is None or re.fullmatch(r'\d+\.\d+\.\d+', str(version)) is None or semver(pinned.group(1)) <= semver(version),
      f'marketplace.json points at {pinned and pinned.group(1)}, ahead of plugin.json {version}')

for problem in problems:
    print(f'✘ {problem}')
print(f'{len(skins)} skins, {len(glob.glob("themes/*.json"))} themes: ' + ('all good' if not problems else f'{len(problems)} problems'))
sys.exit(1 if problems else 0)
