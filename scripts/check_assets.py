"""Checks what the plugin ships besides its code, with Python alone (CI runs it on every push).

- every JSON file parses: the manifests and the themes, each theme with a name, a base and overrides
- every iTerm2 scheme is a well-formed property list
- every Python script compiles
- every built-in skin has its theme, its Ghostty scheme and its iTerm2 scheme
- the manifest's version is the changelog's newest

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

for path in sorted(glob.glob('scripts/*.py')):
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

version = json.load(open('.claude-plugin/plugin.json', encoding='utf-8')).get('version')
newest = re.search(r'^## (\S+)', open('CHANGELOG.md', encoding='utf-8').read(), re.M)
check(newest is not None and newest.group(1) == version, f'plugin.json says {version}, CHANGELOG.md says {newest and newest.group(1)}')

for problem in problems:
    print(f'✘ {problem}')
print(f'{len(skins)} skins, {len(glob.glob("themes/*.json"))} themes: ' + ('all good' if not problems else f'{len(problems)} problems'))
sys.exit(1 if problems else 0)
