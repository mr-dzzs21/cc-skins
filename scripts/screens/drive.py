"""Drives an interactive program in a pseudo-terminal and keeps its screen with
pyte (a terminal emulator in Python), saving screens as JSON cells.

    drive.py <cols> <rows> <cwd> <steps.json> <outdir> -- <argv...>

steps: ["wait", secs] | ["until", text, secs] | ["until_re", regex, secs] |
       ["send", text] | ["key", name] | ["seed", store, {key: value}] | ["shot", name]

`seed` merges keys into a plugin's store file, as another session on this
machine would; a `limitReading` gets `at` = now, and each window's
`resetsInHours` becomes its `resetsAt`.
"""
import fcntl, json, os, pty, re, select, struct, sys, termios, time
import pyte

KEYS = {'enter': '\r', 'esc': '\x1b', 'down': '\x1b[B', 'up': '\x1b[A', 'right': '\x1b[C', 'left': '\x1b[D',
        'tab': '\t', 'btab': '\x1b[Z', 'ctrl-c': '\x03', 'space': ' ', 'backspace': '\x7f'}

cols, rows, cwd, steps_path, outdir = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
argv = sys.argv[sys.argv.index('--') + 1:]
steps = json.load(open(steps_path))
os.makedirs(outdir, exist_ok=True)

env = {k: v for k, v in os.environ.items() if not k.startswith('CLAUDE') and k not in ('TERMINFO',)}
env.update(TERM='xterm-256color', COLORTERM='truecolor', COLUMNS=str(cols), LINES=str(rows))

pid, fd = pty.fork()
if pid == 0:
    os.chdir(cwd)
    os.execvpe(argv[0], argv, env)

fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
screen = pyte.Screen(cols, rows)
stream = pyte.ByteStream(screen)
raw = open(os.path.join(outdir, 'raw.log'), 'wb')

def pump(secs):
    end = time.time() + secs
    while True:
        left = end - time.time()
        if left <= 0:
            return
        r, _, _ = select.select([fd], [], [], min(left, 0.1))
        if r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                return
            raw.write(data)
            stream.feed(data)
            # answer the queries a terminal would: cursor position, device attributes
            if b'\x1b[6n' in data:
                os.write(fd, f'\x1b[{screen.cursor.y + 1};{screen.cursor.x + 1}R'.encode())
            if b'\x1b[c' in data or b'\x1b[0c' in data:
                os.write(fd, b'\x1b[?62;22c')

def text():
    return '\n'.join(screen.display)

def shot(name):
    cells = []
    for y in range(rows):
        line = screen.buffer[y]
        row = []
        for x in range(cols):
            c = line[x]
            row.append([c.data, c.fg, c.bg, c.bold, c.reverse, c.italics, c.underscore])
        cells.append(row)
    json.dump({'cols': cols, 'rows': rows, 'cells': cells}, open(os.path.join(outdir, f'{name}.json'), 'w'))
    open(os.path.join(outdir, f'{name}.txt'), 'w').write(text())

for step in steps:
    kind = step[0]
    if kind == 'wait':
        pump(step[1])
    elif kind == 'until':
        end = time.time() + step[2]
        while step[1] not in text() and time.time() < end:
            pump(0.3)
        print(('found ' if step[1] in text() else 'MISSING ') + repr(step[1]), flush=True)
    elif kind == 'send':
        for ch in step[1]:
            os.write(fd, ch.encode()); pump(0.02)
    elif kind == 'key':
        os.write(fd, KEYS[step[1]].encode())
    elif kind == 'until_re':
        end = time.time() + step[2]
        while not re.search(step[1], text()) and time.time() < end:
            pump(0.3)
        print(('found ' if re.search(step[1], text()) else 'MISSING ') + repr(step[1]), flush=True)
    elif kind == 'seed':
        # merges keys into the plugin's store file, as another session on this machine would
        path = step[1]
        data = json.load(open(path))
        now_ms = time.time() * 1000
        for key, value in step[2].items():
            data[key] = json.loads(json.dumps(value))
        reading = data.get('limitReading')
        if isinstance(reading, dict):
            reading['at'] = now_ms
            for limit in reading.get('rateLimits', []):
                hours = limit.pop('resetsInHours', None)
                if hours is not None:
                    limit['resetsAt'] = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(time.time() + hours * 3600))
        tmp = path + '.tmp'
        json.dump(data, open(tmp, 'w')); os.replace(tmp, path)
        print('seeded', list(step[2]), flush=True)
    elif kind == 'shot':
        pump(0.5); shot(step[1]); print('shot', step[1], flush=True)

try:
    os.kill(pid, 9)
except ProcessLookupError:
    pass
