// Синтез власної музики й ефектів → music.wav, sfx.wav (48 кГц моно). Події прив'язані до timing.json (ті самі зсуви, що в promo.html → CUES).
import { readFileSync, writeFileSync } from 'node:fs';
const base = decodeURIComponent(new URL('.', import.meta.url).pathname), dir = process.env.D ? process.env.D.replace(/\/?$/, '/') : base;
const { s, T } = JSON.parse(readFileSync(dir + 'timing.json'));
const CUES = JSON.parse(readFileSync(dir + 'cues.json'));
const R = 48000, N = Math.ceil(T * R);
const wav = (f, a) => { const b = Buffer.alloc(44 + a.length * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + a.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(R, 24); b.writeUInt32LE(R * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(a.length * 2, 40); let p = 0; for (let i = 0; i < a.length; i++) b.writeInt16LE(Math.round(Math.tanh(a[i]) * 32000), 44 + i * 2); writeFileSync(dir + f, b); };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
const hz = m => 440 * 2 ** ((m - 69) / 12);

// ── Музика: 112 BPM, Am–F–C–G, пад + саб + кік + хет + арпеджіо
const M = new Float32Array(N), bpm = 112, beat = 60 / bpm, bar = beat * 4;
const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const add = (t0, dur, fn) => { const a = Math.floor(t0 * R), n = Math.floor(dur * R); for (let i = 0; i < n && a + i < N; i++) if (a + i >= 0) M[a + i] += fn(i / R); };
const intro = process.env.INTRO ? s[+process.env.INTRO] : s[2]; // до логотипу — тихіше й без кіка
for (let b = 0; b * bar < T; b++) {
  const t = b * bar, ch = prog[b % 4], lvl = t < intro ? .55 : 1;
  for (const m of ch) for (const det of [-.07, .07]) { const f = hz(m + det); add(t, bar + .3, x => lvl * .028 * Math.min(1, x / .4) * Math.exp(-Math.max(0, x - bar) * 8) * (2 * ((x * f) % 1) - 1) * (.6 + .4 * Math.sin(x * 3))); }
  const bf = hz(ch[0] - 24); for (let k = 0; k < 8; k++) add(t + k * beat / 2, beat / 2, x => lvl * .16 * Math.exp(-x * 5) * Math.sin(2 * Math.PI * bf * x));
  if (t >= intro - .01) for (let k = 0; k < 4; k++) {
    add(t + k * beat, .35, x => .5 * Math.exp(-x * 14) * Math.sin(2 * Math.PI * (45 + 110 * Math.exp(-x * 30)) * x));
    add(t + k * beat + beat / 2, .06, x => .05 * Math.exp(-x * 70) * rnd());
    for (let j = 0; j < 4; j++) { const m = ch[(j + k) % 3] + 12 + (j > 1 ? 12 : 0); add(t + k * beat + j * beat / 4, .18, x => .03 * Math.exp(-x * 18) * Math.sin(2 * Math.PI * hz(m) * x)); }
  }
}
// плавний кінець
for (let i = 0; i < N; i++) { const t = i / R; M[i] *= Math.min(1, t / 1.2, (T - t) / 2.2); }
// простий лоупас-хвіст
for (let i = 1; i < N; i++) M[i] = M[i] * .6 + M[i - 1] * .4;
wav('music.wav', M);

// ── Ефекти
const X = new Float32Array(N);
const put = (t0, dur, fn) => { const a = Math.floor(t0 * R); for (let i = 0; i < dur * R && a + i < N; i++) if (a + i >= 0) X[a + i] += fn(i / R, i); };
const whoosh = t => { let y = 0; put(t - .35, .7, (x) => { const k = .02 + .25 * Math.sin(Math.PI * x / .7) ** 2; y += k * (rnd() - y); return .55 * Math.sin(Math.PI * x / .7) ** 2 * y; }); };
const click = t => put(t, .05, x => .5 * Math.exp(-x * 120) * (Math.sin(2 * Math.PI * 2400 * x) + .5 * rnd()));
const ding = t => [1, 2.76, 5.4].forEach((h, j) => put(t, 1.6, x => .18 / (j + 1) * Math.exp(-x * (3 + j * 2)) * Math.sin(2 * Math.PI * 1318 * h * x)));
const boom = t => put(t, 1.4, x => .7 * Math.exp(-x * 3) * Math.sin(2 * Math.PI * (38 + 60 * Math.exp(-x * 8)) * x));
const rise = t => { let y = 0; put(t - 1.2, 1.2, x => { const k = .01 + .3 * (x / 1.2) ** 2; y += k * (rnd() - y); return .35 * (x / 1.2) ** 2 * y; }); };
const glass = t => { let p = 0; put(t, .9, (x) => { const n = rnd(), h = n - p; p = n; return .5 * Math.exp(-x * 7) * h + [3100, 4700, 6900, 8300].reduce((a, f, j) => a + .05 * Math.exp(-x * (5 + j)) * Math.sin(2 * Math.PI * f * x), 0); }); };
const heart = t => [0, .24].forEach((o, j) => put(t + o, .25, x => (j ? .45 : .7) * Math.exp(-x * 18) * Math.sin(2 * Math.PI * (48 + 30 * Math.exp(-x * 25)) * x)));
const coin = t => [0, .16, .27, .34].forEach((o, j) => [2637, 3951].forEach(f => put(t + o, .5, x => .14 / (j + 1) * Math.exp(-x * 9) * Math.sin(2 * Math.PI * f * x))));
const buzz = t => put(t, .5, x => .12 * (Math.sin(2 * Math.PI * 170 * x) > 0 ? 1 : -1) * (Math.floor(x * 10) % 2 ? .2 : 1) * Math.exp(-x * 1.5));
const swipe = t => { let y = 0; put(t - .15, .35, (x) => { const k = .05 + .4 * Math.sin(Math.PI * x / .35) ** 2; y += k * (rnd() - y); return .45 * Math.sin(Math.PI * x / .35) ** 2 * y; }); };
const tick = t => put(t, .03, x => .3 * Math.exp(-x * 200) * Math.sin(2 * Math.PI * 1200 * x));
const F = { whoosh, click, ding, boom, rise, glass, heart, coin, buzz, swipe, tick };
for (const [line, off, kind] of CUES) F[kind](s[line] + off);
wav('sfx.wav', X);
console.log('music/sfx ok', T);
