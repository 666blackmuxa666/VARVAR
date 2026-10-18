// 🔎 Сервер, файли-частини (ops-*.js, bot-*.js — розбиті tools/split.mjs): назва верхнього рівня чи імпорт сусідньої частини використана там, де її не оголошено й не імпортовано.
// Ловить «забули import» (після перенесення коду) — інакше ReferenceError лише на живому запиті. node tools/undef.mjs → код 1, якщо знайдено.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url)), D = R + 'worker/src/';
const files = readdirSync(D).filter(f => f.endsWith('.js')), src = Object.fromEntries(files.map(f => [f, readFileSync(D + f, 'utf8')]));
// код без рядків/коментарів/регулярних виразів; вирази всередині `${…}` лишаються
function strip(s) {
  let i = 0, o = ''; const n = s.length;
  const reOk = () => { const t = o.replace(/\s+$/, ''); if (!t) return true; return '(,=:[!&|?{};+-*%<>~^'.includes(t[t.length - 1]) || /\b(return|typeof|case|in|of|else|void|yield|await)$/.test(t); };
  function code(untilBrace) {
    let d = 0;
    while (i < n) {
      const c = s[i], c2 = s[i + 1];
      if (c === '/' && c2 === '/') { while (i < n && s[i] !== '\n') i++; continue; }
      if (c === '/' && c2 === '*') { const j = s.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; o += ' '; continue; }
      if (c === "'" || c === '"') { i++; while (i < n && s[i] !== c && s[i] !== '\n') { if (s[i] === '\\') i++; i++; } i++; o += '""'; continue; }
      if (c === '`') { i++; o += '"'; while (i < n && s[i] !== '`') { if (s[i] === '\\') { i += 2; continue; } if (s[i] === '$' && s[i + 1] === '{') { i += 2; o += ' ('; code(true); o += ') '; continue; } if (s[i] === '\n') o += '\n'; i++; } i++; o += '"'; continue; }
      if (c === '/' && reOk()) { i++; let cls = false; while (i < n && s[i] !== '\n') { const x = s[i]; if (x === '\\') { i += 2; continue; } if (x === '[') cls = true; else if (x === ']') cls = false; else if (x === '/' && !cls) break; i++; } i++; while (/[a-z]/.test(s[i] || '')) i++; o += '0'; continue; }
      if (untilBrace) { if (c === '{') d++; else if (c === '}') { if (!d) { i++; return; } d--; } }
      o += c; i++;
    }
  }
  code(false); return o;
}
const top = {}, G = {}, fam = f => (f.match(/^([a-z]+)-/) || [])[1]; // сімʼя частин → назви верхнього рівня й імпорти всіх частин
for (const f of files) {
  const s = src[f].replace(/^export \{[^}]*\} from .*$/gm, ''), t = strip(s), mine = new Set(), g = fam(f) ? (G[fam(f)] ||= new Set()) : new Set();
  for (const m of s.matchAll(/^(?:export )?(?:async )?(?:function\*?|const|let|var|class) ([A-Za-z_$][\w$]*)/gm)) g.add(m[1]);
  for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from/g)) for (const x of m[1].split(',')) { const n = x.split(' as ').pop().trim(); if (n) { mine.add(n); g.add(n); } }
  for (const m of s.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) mine.add(m[1]);
  for (const m of t.matchAll(/\b(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) mine.add(m[1]);
  // const a = 1, b = 2 / деструктуризація / параметри: усе в {…} [..] (…) після const/let або перед =>, і function f(…)
  for (const m of t.matchAll(/\b(?:const|let|var)\s+([^=;]+?)=/g)) for (const x of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) mine.add(x[0]);
  for (const m of t.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=(?!=|>)/g)) mine.add(m[1]);
  for (const m of t.matchAll(/\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>|function\*?\s*[\w$]*\s*\(([^()]*)\)|catch\s*\(([^()]*)\)/g)) for (const x of (m[1] ?? m[2] ?? m[3] ?? m[4] ?? '').matchAll(/[A-Za-z_$][\w$]*/g)) mine.add(x[0]);
  top[f] = { t, mine };
}
// + усі експорти сервера (забутий import з будь-якого файлу)
const EX = new Set(files.flatMap(f => [...src[f].matchAll(/^export (?:async )?(?:function\*?|const|let|class) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1])));
for (const k in G) for (const n of EX) G[k].add(n);
const out = [];
for (const f of files.filter(fam)) {
  const { t, mine } = top[f], seen = new Set(), g = G[fam(f)];
  for (const m of t.matchAll(/(?<![\w$])(?<!(?<!\.\.)\.)([A-Za-z_$][\w$]*)(?!\s*:(?!:))/g)) {
    const n = m[1];
    if (!g.has(n) || mine.has(n) || seen.has(n) || n in globalThis) continue;
    seen.add(n); out.push(`🔎 ${f}:${t.slice(0, m.index).split('\n').length}: «${n}» — не оголошено й не імпортовано в цьому файлі`);
  }
}
console.log(out.length ? out.join('\n') + `\n\n⚠️ Знайдено: ${out.length}` : `✅ Неімпортованих назв не знайдено (${files.length} файлів сервера)`);
process.exit(out.length ? 1 : 0);
