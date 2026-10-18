// index.html (window.SFX + data-brk) + timing.json → cues.json для synth.mjs. Час: секунди або «40%» від довжини рядка.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = process.env.D.replace(/\/?$/, '/'), html = readFileSync(dir + 'index.html', 'utf8'), { s, d, T } = JSON.parse(readFileSync(dir + 'timing.json'));
const L = s.length, end = l => l + 1 < L ? s[l + 1] : T, tv = (v, l) => { v = String(v); return v.endsWith('%') ? d[l] * parseFloat(v) / 100 : v[0] === 'e' ? end(l) - s[l] + parseFloat(v.slice(1) || 0) : +v; };
const C = JSON.parse((html.match(/window\.SFX=(\[[\s\S]*?\]);/) || [, '[]'])[1]).map(([l, t, k]) => [l, tv(t, l), k]);
const brk = [...html.matchAll(/data-l="(\d+)" data-brk/g)].map(m => +m[1]);
for (let l = 1; l < L; l++) if (!brk.includes(l)) C.push([l, -.25, 'whoosh']);
brk.forEach(l => C.push([l, -1.1, 'rise'], [l, -.4, 'glass'], [l, 0, 'boom'], [l, .9, 'whoosh']));
const P = L - 2; C.push([P, .05, 'boom'], [P, d[P] * .33, 'click'], [P, d[P] * .33 + .05, 'ding'], [P, d[P] * .68, 'swipe'], [L - 1, 0, 'boom'], [L - 1, .9, 'ding']);
writeFileSync(dir + 'cues.json', JSON.stringify(C)); console.log('cues', C.length, 'brk', brk.join(','));
