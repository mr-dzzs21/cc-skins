"""Records the README's screenshots from a real Claude Code session with cc-skins.

It makes a small demo repository, starts `claude` in a pseudo-terminal there
(twice: 150 columns for the panes and the extras, 110 for the chat in ten skins), asks one
short question so the context, cost and turn line have real figures, and
saves each screen as JSON. build.py turns them into the pictures in docs/.

    python3 -m venv .work/venv && .work/venv/bin/pip install pyte==0.8.2
    .work/venv/bin/python scripts/screens/capture.py .work/shots [panes|frames]
    python3 scripts/screens/build.py .work/shots

Needs a logged-in Claude Code with cc-skins installed; the two questions use a
little of your plan. Your cc-skins settings are backed up first and put back
after: the pictures need the Arrows-only icons (no Nerd Font in a browser),
and the limit windows show calm sample figures (42 % and 23 %, then 72 % and
91 % for the warning colors) in place of yours.
"""
import glob, json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.work/shots')
ONLY = sys.argv[2:]  # run names to record again (panes, frames); none: both
STORES = glob.glob(os.path.expanduser('~/.claude/plugins/store/cc-skins_*.json'))
STORE = next((path for path in STORES if 'inline' not in path), None)
if STORE is None:
    sys.exit('No cc-skins store in ~/.claude/plugins/store: install cc-skins and run it once.')

QUESTION = 'Read src/greet.js and README.md, then tell me in one sentence what this project is.'
CALM = {'limitReading': {'rateLimits': [
    {'kind': 'five_hour', 'percentUsed': 42, 'resetsInHours': 2.22},
    {'kind': 'seven_day', 'percentUsed': 23, 'resetsInHours': 76.1}]}}
HOT = {'limitReading': {'rateLimits': [
    {'kind': 'five_hour', 'percentUsed': 72, 'resetsInHours': 0.8},
    {'kind': 'seven_day', 'percentUsed': 91, 'resetsInHours': 30.5}]}}
EXTRAS = ['gitStatus', 'contextTokens', 'burnRate', 'session', 'clock', 'version']
# the picker's keys for the skins the hero shows
FRAMES = [('synthwave', '6'), ('nebula', 'i'), ('midnight', '1'), ('abyss', 'e'), ('sakura', '8'),
          ('emerald', 'f'), ('neon', '3'), ('ocean', '7'), ('ring', '5')]


def command(text, settle=2.5):
    return [['send', text], ['wait', 1], ['key', 'enter'], ['wait', settle]]


def ask():
    """Past the trust prompt a new folder raises, the question, the wait for its turn line, then calm limits (taken at the next tick, within a minute)."""
    trust = ['if', 'trust this folder', [['key', 'down'], ['wait', 0.5], ['key', 'enter'], ['wait', 9]]]
    return [['wait', 9], trust, ['send', QUESTION], ['wait', 0.5], ['key', 'enter'],
            ['until_re', r'in \d+s', 150], ['wait', 3], ['seed', STORE, CALM], ['wait', 66]]


def panes():
    steps = ask() + command('/skin', 2) + [['key', 'down'], ['wait', 1], ['key', 'down'], ['wait', 1],
                                            ['key', 'down'], ['wait', 2], ['shot', 'picker'], ['key', 'esc'], ['wait', 1.5]]
    for name, text in [('model', '/skin model'), ('settings', '/skin bar'), ('alerts', '/skin alerts'),
                       ('dashboard', '/skin usage'), ('builder', '/skin create')]:
        steps += command(text, 3) + [['shot', name], ['key', 'esc'], ['wait', 1.5]]
    # every extra on (the reset countdowns off, for room), once the session is past the cost per hour's five minutes
    for text in ['/skin hide resets'] + [f'/skin show {item}' for item in EXTRAS]:
        steps += command(text, 2)
    return steps + [['wait', 200], ['shot', 'extras']]


def frames():
    steps = ask() + [['shot', 'frame-ring']]
    for skin, key in FRAMES:
        steps += command('/skin', 2) + [['send', key], ['wait', 1.2], ['send', key], ['wait', 6], ['shot', f'frame-{skin}']]
    steps += command('/skin changes', 3) + [['shot', 'changes'], ['key', 'esc'], ['wait', 1.5]]
    steps += command('/skin bar header', 2) + [['wait', 5], ['shot', 'header']] + command('/skin bar powerline', 2)
    return steps + [['seed', STORE, HOT], ['wait', 66], ['shot', 'hot']]


def demo_repo(root):
    repo = os.path.join(root, 'acme-web')
    os.makedirs(os.path.join(repo, 'src'))
    git = lambda *args: subprocess.run(['git', *args], cwd=repo, check=True, capture_output=True)
    write = lambda name, text: open(os.path.join(repo, name), 'w').write(text)
    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 'demo@example.com'); git('config', 'user.name', 'demo')
    write('README.md', '# acme-web\n\nA small web app.\n')
    write('src/greet.js', 'export const greet = (name) => `Hello, ${name}`\n')
    git('add', '-A'); git('commit', '-q', '-m', 'init')
    write('src/greet.js', 'export const greet = (name) => `Hello, ${name}!`\nexport const bye = (name) => `Bye, ${name}`\n')
    write('README.md', '# acme-web\n\nA small web app.\n\nRun it with `npm start`.\n')
    write('src/app.css', 'body { margin: 0 }\n')
    git('add', 'README.md')
    return repo


def run(repo, cols, rows, steps, name):
    path = os.path.join(OUT, f'{name}.steps.json')
    json.dump(steps, open(path, 'w'))
    subprocess.run([sys.executable, os.path.join(HERE, 'drive.py'), str(cols), str(rows), repo, path,
                    os.path.join(OUT, name), '--', 'claude', '--model', 'opus'], check=True)


os.makedirs(OUT, exist_ok=True)
backup = os.path.join(OUT, 'store-backup.json')
shutil.copyfile(STORE, backup)
root = tempfile.mkdtemp(prefix='cc-skins-demo-')
try:
    repo = demo_repo(root)
    for skin, cols, rows, steps, name in [('nebula', 150, 46, panes(), 'panes'), ('ring', 110, 32, frames(), 'frames')]:
        if ONLY and name not in ONLY:
            continue
        data = json.load(open(backup))  # each run starts from your settings, not the last run's
        data.update(skin=skin, glyphs='powerline')
        json.dump(data, open(STORE, 'w'))
        run(repo, cols, rows, steps, name)
finally:
    shutil.copyfile(backup, STORE)
    shutil.rmtree(root, ignore_errors=True)
    print('cc-skins settings put back from', backup)
