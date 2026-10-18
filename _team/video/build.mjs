// Голос → timing.json/timing.js + voice.wav. Рядки: voice/l1..l10.(mp3|wav|m4a|aiff) — перший знайдений формат.
import { execFileSync as X } from 'node:child_process'; import { existsSync, writeFileSync } from 'node:fs';
const F = '/opt/homebrew/bin/'; const dir = process.env.D ? process.env.D.replace(/\/?$/, '/') : (await import('node:path')).dirname((await import('node:url')).fileURLToPath(import.meta.url)) + '/';
const GAP = process.env.D ? [] : [0.45, 0.6, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.5]; // пауза після рядка i (решта — 0.35)
const L = (await import('node:fs')).readFileSync(dir + 'voice.txt', 'utf8').trim().split('\n').length;
const files = []; for (let i = 1; i <= L; i++) { const f = ['mp3', 'wav', 'm4a', 'aiff'].map(e => `${dir}${process.env.VD || 'voice'}/l${i}.${e}`).find(existsSync); if (!f) throw 'нема voice/l' + i; files.push(f); }
const d = files.map(f => +X(F + 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const s = [0.6]; for (let i = 1; i < L; i++) s[i] = +(s[i - 1] + d[i - 1] + (GAP[i - 1] ?? .35)).toFixed(3);
const T = +(s[L - 1] + d[L - 1] + 2.4).toFixed(2); const t = { s, d, T };
writeFileSync(dir + 'timing.json', JSON.stringify(t)); writeFileSync(dir + 'timing.js', 'window.TIMING=' + JSON.stringify(t) + ';');
const args = ['-y', '-v', 'error']; files.forEach(f => args.push('-i', f));
args.push('-filter_complex', files.map((_, i) => `[${i}:a]aresample=48000,pan=mono|c0=c0,adelay=${Math.round(s[i] * 1000)}[a${i}]`).join(';') + ';' + files.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${L}:normalize=0,apad,atrim=0:${T},loudnorm=I=-16:TP=-1.5[o]`, '-map', '[o]', '-ar', '48000', dir + 'voice.wav');
X(F + 'ffmpeg', args); console.log('T=' + T, s.join(' '));
