"""Synthesizes cc-skins' sounds (mono, 16-bit, 22.05 kHz WAV), so no clip comes from elsewhere."""
import math, struct, sys, wave

RATE = 22050

def env_exp(t, decay):
    return math.exp(-t / decay)

def write(path, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.7 / peak  # about -3 dBFS
    fade = int(RATE * 0.003)
    out = []
    for i, s in enumerate(samples):
        v = s * gain
        if i < fade:
            v *= i / fade
        if i > len(samples) - fade:
            v *= (len(samples) - i) / fade
        out.append(struct.pack('<h', int(max(-1, min(1, v)) * 32767)))
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b''.join(out))

def tone(duration, fn):
    return [fn(i / RATE) for i in range(int(duration * RATE))]

def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] if i < len(t) else 0 for t in tracks) for i in range(n)]

def delay(track, seconds):
    return [0.0] * int(seconds * RATE) + track

def bell_strike(t):
    f0 = 1046.5
    partials = [(1.0, 1.0, 0.9), (2.76, 0.55, 0.5), (5.40, 0.35, 0.28), (8.93, 0.2, 0.16), (0.5, 0.25, 1.2)]
    return sum(a * math.sin(2 * math.pi * f0 * r * t) * env_exp(t, d) for r, a, d in partials)

def chime_note(f):
    return lambda t: (math.sin(2 * math.pi * f * t) + 0.25 * math.sin(2 * math.pi * f * 2.01 * t)) * env_exp(t, 0.45)

def square(f, t):
    return 1.0 if math.sin(2 * math.pi * f * t) >= 0 else -1.0

def sweep(f_from, f_to, duration):
    def fn(t):
        f = f_from + (f_to - f_from) * (t / duration)
        phase = 2 * math.pi * (f_from * t + (f_to - f_from) * t * t / (2 * duration))
        return math.sin(phase) * env_exp(t, duration * 0.6)
    return fn

out = sys.argv[1]
strike = tone(1.4, bell_strike)
write(f'{out}/bell.wav', mix(strike, delay(strike, 0.32)))
write(f'{out}/chime.wav', mix(tone(1.0, chime_note(1318.5)), delay(tone(1.1, chime_note(1975.5)), 0.16)))
beep = tone(0.11, lambda t: 0.5 * square(880, t))
write(f'{out}/beep.wav', mix(beep, delay(tone(0.11, lambda t: 0.5 * square(1320, t)), 0.16)))
write(f'{out}/blip.wav', mix(tone(0.18, sweep(600, 1400, 0.18)), delay(tone(0.22, sweep(900, 2100, 0.22)), 0.14)))
write(f'{out}/gong.wav', tone(2.2, lambda t: sum(a * math.sin(2 * math.pi * 110 * r * t) * env_exp(t, d)
                                                 for r, a, d in [(1, 1, 1.2), (1.5, 0.5, 0.8), (2.31, 0.35, 0.6), (3.12, 0.2, 0.4), (1.02, 0.5, 1.1)])))
pop = tone(0.12, sweep(380, 900, 0.12))
write(f'{out}/pop.wav', mix(pop, delay(tone(0.12, sweep(500, 1200, 0.12)), 0.11)))
print('ok')
