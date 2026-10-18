// ✂️ Кнопки каси з великого switch у 00-core.js → у розділи, яким вони належать: on('кнопка', async (el, e, a, t) => {…}).
// Розділ обирається за функціями, які кнопка викликає (чиїх функцій більше — туди). Лише ядро → лишається в switch.
// break рівня case → return. Кнопки з циклами/вкладеним switch не чіпаємо (там break значить інше).
// node tools/split-clicks.mjs [--dry]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url)), D = R + 'js/pos/', DRY = process.argv.includes('--dry');
const parts = readdirSync(D).filter(f => /^\d.*\.js$/.test(f)).sort(), src = Object.fromEntries(parts.map(f => [f, readFileSync(D + f, 'utf8')]));
// назви функцій/констант верхнього рівня розділу → розділ
const owner = {};
for (const f of parts) for (const m of src[f].matchAll(/^ {2}(?:async )?(?:function\*? |const |let )([A-Za-z_$][\w$]*)/gm)) owner[m[1]] ||= f;
// код без рядків/коментарів/регулярних виразів, ТІЄЇ Ж довжини (позиції збігаються)
function mask(s) {
  let i = 0, o = ''; const n = s.length, sp = t => t.replace(/[^\n]/g, ' ');
  const reOk = () => { const t = o.replace(/\s+$/, ''); if (!t) return true; return '(,=:[!&|?{};+-*%<>~^'.includes(t[t.length - 1]) || /\b(return|typeof|case|in|of|else|void|await)$/.test(t); };
  function code(untilBrace) {
    let d = 0;
    while (i < n) {
      const c = s[i], c2 = s[i + 1], st = i;
      if (c === '/' && c2 === '/') { while (i < n && s[i] !== '\n') i++; o += sp(s.slice(st, i)); continue; }
      if (c === '/' && c2 === '*') { const j = s.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; o += sp(s.slice(st, i)); continue; }
      if (c === "'" || c === '"') { i++; while (i < n && s[i] !== c && s[i] !== '\n') { if (s[i] === '\\') i++; i++; } i++; o += c + sp(s.slice(st + 1, i - 1)) + c; continue; }
      if (c === '`') { i++; o += '`'; let a = i; while (i < n && s[i] !== '`') { if (s[i] === '\\') { i += 2; continue; } if (s[i] === '$' && s[i + 1] === '{') { o += sp(s.slice(a, i)) + '${'; i += 2; code(true); o += '}'; a = i; continue; } i++; } o += sp(s.slice(a, i)) + '`'; i++; continue; }
      if (c === '/' && reOk()) { i++; let cls = false; while (i < n && s[i] !== '\n') { const x = s[i]; if (x === '\\') { i += 2; continue; } if (x === '[') cls = true; else if (x === ']') cls = false; else if (x === '/' && !cls) break; i++; } i++; while (/[a-z]/.test(s[i] || '')) i++; o += s.slice(st, i).replace(/[^\n]/g, '0'); continue; }
      if (untilBrace) { if (c === '{') d++; else if (c === '}') { if (!d) { i++; return; } d--; } }
      o += c; i++;
    }
  }
  code(false); return o.slice(0, n).padEnd(n);
}
const core = '00-core.js', C = src[core], M = mask(C);
const sw = M.indexOf('switch (a) {', M.indexOf("document.addEventListener('click', async e =>"));
// кінець switch — парна дужка
let d = 0, end = -1; for (let i = M.indexOf('{', sw); i < M.length; i++) { if (M[i] === '{') d++; else if (M[i] === '}' && !--d) { end = i; break; } }
const inner0 = M.indexOf('{', sw) + 1, body = C.slice(inner0, end), mb = M.slice(inner0, end);
// мітки case на глибині 0 всередині switch
const labels = []; d = 0;
for (let i = 0; i < mb.length; i++) { const c = mb[i]; if ('({['.includes(c)) d++; else if (')}]'.includes(c)) d--; else if (!d && /^(case '|default:)/.test(mb.slice(i, i + 6)) && /[\s:;{}]/.test(mb[i - 1] || ' ')) { const m = body.slice(i).match(/^(?:case '([^']*)'|default)\s*:/); labels.push({ i, end: i + m[0].length, name: m[1] ?? null }); i += m[0].length - 1; } }
// групи: мітки підряд без тіла — одна група
const groups = [];
for (let k = 0; k < labels.length; k++) {
  const l = labels[k], next = labels[k + 1]?.i ?? body.length, txt = body.slice(l.end, next);
  const g = groups[groups.length - 1];
  if (g && !g.bodyText.trim()) { g.names.push(l.name); g.bodyStart = l.end; g.bodyEnd = next; g.bodyText = txt; continue; }
  groups.push({ start: l.i, names: [l.name], bodyStart: l.end, bodyEnd: next, bodyText: txt });
}
const plan = {}, keep = [], moved = [];
for (const g of groups) {
  const mt = mb.slice(g.bodyStart, g.bodyEnd);
  if (g.names.includes(null) || /\b(for|while|do|switch)\b\s*[({]/.test(mt) || /\bcontinue\b/.test(mt)) { keep.push(g.names.join('/')); continue; }
  const cnt = {}; for (const m of mt.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)/g)) { const f = owner[m[1]]; if (f && f !== core) cnt[f] = (cnt[f] || 0) + 1; }
  // спершу — розділ, де намальована сама кнопка (data-a="X"); інакше — чиїх функцій кнопка викликає більше
  const home = [...new Set(g.names.flatMap(x => parts.filter(f => f !== core && (src[f].includes(`data-a="${x}"`) || src[f].includes(`a = '${x}'`) || src[f].includes(`.a = '${x}'`)))))];
  if (g.names.some(x => C.includes(`data-a="${x}"`))) { keep.push(g.names.join('/')); continue; } // кнопка ядра (меню, каркас) — лишається в ядрі
  const best = home.length === 1 ? [home[0]] : Object.entries(cnt).sort((x, y) => y[1] - x[1])[0];
  if (!best) { keep.push(g.names.join('/')); continue; }
  // break рівня case → return
  let t = g.bodyText; const re = /\bbreak\b/g; let m, out = '', last = 0;
  while ((m = re.exec(mt))) { out += t.slice(last, m.index) + 'return'; last = m.index + 5; }
  t = (out + t.slice(last)).replace(/\s+$/, '');
  (plan[best[0]] ||= []).push(`  on(${g.names.length > 1 ? '[' + g.names.map(x => `'${x}'`).join(', ') + ']' : `'${g.names[0]}'`}, async (el, e, a, t) => {${t.startsWith('\n') ? '' : ' '}${t.replace(/^ +/, '')}${t.includes('\n') ? '\n  ' : ' '}});`);
  moved.push(g);
}
console.log('перенесено:', moved.length, 'груп →', Object.entries(plan).map(([f, l]) => `${f}:${l.length}`).join(' '));
console.log('лишились у ядрі:', keep.length, keep.join(' '));
if (DRY) process.exit(0);
// ядро: вирізати перенесені групи (з кінця), додати реєстр і виклик
let nb = body; for (const g of [...moved].reverse()) nb = nb.slice(0, g.start) + nb.slice(g.bodyEnd).replace(/^[ \t]*/, '');
let nc = C.slice(0, inner0) + nb + C.slice(end);
nc = nc.replace("    switch (a) {", "    if (ACT[a]) return ACT[a](el, e, a, t); // кнопки розділів (on(…) у js/pos/NN-*.js)\n    switch (a) {");
nc = nc.replace("  // ---------- кліки ----------\n", "  // ---------- кліки ----------\n  // 🖱 кнопки data-a: розділ реєструє свої через on('назва', async (el, e, a, t) => {…}) — поряд зі своїм кодом, ядро не чіпати\n  const ACT = {};\n  function on(names, fn) { for (const x of [].concat(names)) { if (ACT[x]) console.error('🖱 дубль обробника кнопки', x); ACT[x] = fn; } }\n");
writeFileSync(D + core, nc);
for (const [f, l] of Object.entries(plan)) writeFileSync(D + f, src[f].replace(/\s*$/, '') + `\n\n  // ---------- 🖱 кнопки розділу (data-a) ----------\n${l.join('\n')}\n`);
