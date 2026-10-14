"""Releases the version in .claude-plugin/plugin.json, and only once CI passed for it.

People install cc-skins through the marketplace, which points at a release tag,
not at main: what is pushed reaches nobody until this script moves the pointer.

1. checks the tree is clean, on main, pushed, and its versions agree
   (plugin.json, the newest CHANGELOG heading, CC_SKINS_VERSION in hooks/doctor.ts)
2. waits for CI on that commit and stops unless every job passed
   (macOS, Windows and Linux, the oldest and the newest Claude Code)
3. tags it cc-skins--v<version> and pushes the tag
4. points the marketplace at the tag, commits that and pushes it
5. publishes a GitHub release with the version's CHANGELOG section

    python3 scripts/release.py          # does it
    python3 scripts/release.py --check  # steps 1 and 2 only
"""
import json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = 'mr-dzzs21/cc-skins'
MARKETPLACE = os.path.join(ROOT, '.claude-plugin/marketplace.json')


def run(*args, capture=True):
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=capture)
    if result.returncode != 0:
        sys.exit(f'✘ {" ".join(args)}\n{(result.stderr or result.stdout or "").strip()}')
    return (result.stdout or '').strip()


def stop(problem):
    sys.exit(f'✘ {problem}')


version = json.load(open(os.path.join(ROOT, '.claude-plugin/plugin.json')))['version']
tag = f'cc-skins--v{version}'
changelog = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
newest = re.search(r'^## (\S+)', changelog, re.M)
doctor = re.search(r"CC_SKINS_VERSION = '([^']+)'", open(os.path.join(ROOT, 'hooks/doctor.ts'), encoding='utf-8').read())

# 1. what is released is what is on main, and says one version everywhere
if run('git', 'status', '--porcelain'):
    stop('the tree has changes: commit or stash them first')
if run('git', 'rev-parse', '--abbrev-ref', 'HEAD') != 'main':
    stop('release from main')
run('git', 'fetch', '--quiet', 'origin', 'main', '--tags')
head = run('git', 'rev-parse', 'HEAD')
if head != run('git', 'rev-parse', 'origin/main'):
    stop('main is not pushed (or is behind origin): push or pull first')
if newest is None or newest.group(1) != version:
    stop(f'plugin.json says {version}, CHANGELOG.md says {newest and newest.group(1)}')
if doctor is None or doctor.group(1) != version:
    stop(f'plugin.json says {version}, hooks/doctor.ts says {doctor and doctor.group(1)}')
if run('git', 'tag', '--list', tag):
    stop(f'{tag} exists already: bump the version for a new release')
print(f'✔ {version} at {head[:7]}, versions agree')

# 2. CI passed on this very commit: every job that tests it (the "Released version" jobs test
#    the release people have now, not this one, so they neither block nor pass it)
for attempt in range(90):
    runs = json.loads(run('gh', 'run', 'list', '--repo', REPO, '--workflow', 'ci.yml', '--commit', head,
                          '--event', 'push', '--json', 'databaseId,status,conclusion'))
    if runs and runs[0]['status'] == 'completed':
        jobs = json.loads(run('gh', 'run', 'view', str(runs[0]['databaseId']), '--repo', REPO, '--json', 'jobs'))['jobs']
        own = [job for job in jobs if not job['name'].startswith('Released version')]
        failed = [job['name'] for job in own if job['conclusion'] != 'success']
        if not own or failed:
            stop(f'CI did not pass on {head[:7]}: {", ".join(failed) or "no jobs"} (gh run view {runs[0]["databaseId"]})')
        break
    print('… waiting for CI' if runs else '… waiting for CI to start', flush=True)
    time.sleep(20)
else:
    stop('CI took longer than half an hour: run this again once it is done')
print(f'✔ CI passed on {head[:7]}: {len(own)} jobs on macOS, Windows and Linux')
if '--check' in sys.argv:
    sys.exit(0)

# 3. the tag
run('claude', 'plugin', 'tag', '.', '-m', 'cc-skins %s', '--push', capture=False)

# 4. the marketplace points at it
data = json.load(open(MARKETPLACE, encoding='utf-8'))
for plugin in data['plugins']:
    if plugin['name'] == 'cc-skins':
        plugin['source'] = {'source': 'github', 'repo': REPO, 'ref': tag}
open(MARKETPLACE, 'w', encoding='utf-8').write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
run('git', 'add', MARKETPLACE)
run('git', 'commit', '--quiet', '-m', f'Release {version}: the marketplace points at {tag}')
run('git', 'push', '--quiet', 'origin', 'main')
print(f'✔ the marketplace points at {tag}')

# 5. the GitHub release, its notes the version's CHANGELOG section
section = re.search(rf'^## {re.escape(version)}\n(.*?)(?=^## |\Z)', changelog, re.M | re.S)
notes = (section.group(1).strip() if section else '') + (
    '\n\n## Update\n\n```sh\nclaude plugin marketplace update cc-skins\nclaude plugin update cc-skins@cc-skins\n```\n\n'
    'then restart Claude Code. New here? See [Install](https://github.com/mr-dzzs21/cc-skins#install).')
subprocess.run(['gh', 'release', 'create', tag, '--repo', REPO, '--title', f'cc-skins {version}', '--notes-file', '-', '--latest'],
               cwd=ROOT, text=True, input=notes, check=True)
print(f'✔ released {version}: people get it with the next marketplace update')
