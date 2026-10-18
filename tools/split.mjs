// ✂️ Розбиття великого файлу сервера на модулі без зміни коду: node tools/split.mjs worker/src/<файл>.js <план>.json
// plan: { base, head: N (рядки заголовка з імпортами), mods: {name: опис}, ranges: [[fromLine, mod]], wrap: [from,to] (обгортки — у модуль своєї _функції), extra: {name: mod} }
import { readFileSync, writeFileSync } from 'node:fs';
const [file, planF] = process.argv.slice(2), P = JSON.parse(readFileSync(planF, 'utf8'));
const L = readFileSync(file, 'utf8').split('\n'), dir = file.replace(/[^/]+$/, '');
const head = L.slice(0, P.head);
// імпорти заголовка: name → рядок джерела
const imp = {};
for (const m of head.join('\n').matchAll(/^import \{([^}]+)\} from '([^']+)'/gm)) { if (m) for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) imp[n.split(' as ').pop().trim()] = [n, m[2]]; }
// інструкції верхнього рівня (коментарі/порожні — до наступної)
const st = []; let pend = [], cur = null;
for (let i = P.head; i < L.length; i++) {
  const l = L[i], ln = i + 1;
  if (/^(export |async |function |const |let |class )/.test(l)) { cur = { ln, lines: [...pend, l] }; st.push(cur); pend = []; }
  else if (/^\s*(\/\/.*)?$/.test(l) && !(cur && cur.open)) pend.push(l);
  else if (cur) { cur.lines.push(...pend, l); pend = []; }
  else throw new Error('рядок поза інструкцією ' + ln);
  if (cur) { const t = cur.lines.join('\n'); cur.open = depth(t) > 0; }
}
const tail = pend;
// код без рядків, коментарів і регулярних виразів (вирази всередині `${…}` лишаються — там теж бувають назви)
function strip(src) {
  let i = 0, o = ''; const n = src.length;
  const reOk = () => { const t = o.replace(/\s+$/, ''); if (!t) return true; const ch = t[t.length - 1]; if ('(,=:[!&|?{};+-*%<>~^'.includes(ch)) return true; return /\b(return|typeof|case|in|of|else|void|yield|await)$/.test(t); };
  function code(untilBrace) {
    let d = 0;
    while (i < n) {
      const c = src[i], c2 = src[i + 1];
      if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && c2 === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; o += ' '; continue; }
      if (c === "'" || c === '"') { i++; while (i < n && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') i++; i++; } i++; o += '""'; continue; }
      if (c === '`') { i++; o += '"'; while (i < n && src[i] !== '`') { if (src[i] === '\\') { i += 2; continue; } if (src[i] === '$' && src[i + 1] === '{') { i += 2; o += ' '; code(true); o += ' '; continue; } i++; } i++; o += '"'; continue; }
      if (c === '/' && reOk()) { i++; let cls = false; while (i < n && src[i] !== '\n') { const x = src[i]; if (x === '\\') { i += 2; continue; } if (x === '[') cls = true; else if (x === ']') cls = false; else if (x === '/' && !cls) break; i++; } i++; while (/[a-z]/.test(src[i] || '')) i++; o += '0'; continue; }
      if (untilBrace) { if (c === '{') d++; else if (c === '}') { if (!d) { i++; return; } d--; } }
      o += c; i++;
    }
  }
  code(false); return o;
}
function depth(t) { let d = 0; for (const c of strip(t)) { if ('({['.includes(c)) d++; else if (')}]'.includes(c)) d--; } return d; }
// оголошені назви
for (const s of st) {
  const f = s.lines.find(l => /^(export |async |function |const |let )/.test(l)), m = f.match(/^(?:export )?(?:async )?function\*? ([\w$]+)/);
  if (m) { s.names = [m[1]]; s.fn = true; continue; }
  // const a = …, b = … — назви на глибині 0
  const t = strip(s.lines.join('\n')).replace(/^[\s\S]*?\b(?:const|let) /, ''), names = []; let d = 0, tok = '', expectName = true;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if ('({['.includes(c)) d++; else if (')}]'.includes(c)) d--;
    if (d === 0 && c === ',') expectName = true;
    else if (expectName && /[\w$]/.test(c)) tok += c;
    else if (expectName && tok) { names.push(tok); tok = ''; expectName = false; }
    if (d === 0 && c === ';') break; }
  s.names = names; s.exported = /^export /.test(f);
}
for (const s of st) s.exported = /^export /.test(s.lines.find(l => /^(export |async |function |const |let )/.test(l)));
const owner = {}; // name → statement
for (const s of st) for (const n of s.names) owner[n] = s;
// модулі
const modOf = ln => { let m = null; for (const [from, mod] of P.ranges) if (ln >= from) m = mod; return m; };
for (const s of st) {
  s.mod = P.extra?.[s.names[0]] || modOf(s.ln);
  if (P.wrap && s.ln >= P.wrap[0] && s.ln <= P.wrap[1] && !P.extra?.[s.names[0]]) {
    const inner = (s.lines.join('\n').match(/\b(_[\w$]+)\(/) || [])[1];
    if (inner && owner[inner]) s.wrapOf = inner; else console.warn('⚠️ обгортка без _функції:', s.names, '→', s.mod);
  }
}
for (const s of st) if (s.wrapOf) s.mod = owner[s.wrapOf].mod;
const ids = t => new Set([...strip(t).matchAll(/(?<![\w$])(?<!(?<!\.\.)\.)([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
const mods = Object.keys(P.mods), out = {}, needExport = new Set(), warn = [];
for (const mod of mods) {
  const my = st.filter(s => s.mod === mod), body = my.map(s => s.lines.join('\n')).join('\n'), used = ids(body), local = new Set(my.flatMap(s => s.names));
  const from = {}; // джерело → [назви]
  for (const n of used) {
    if (local.has(n)) continue;
    if (owner[n]) { const m2 = owner[n].mod; (from[`./${P.base}-${m2}.js`] ||= []).push(n); needExport.add(n); }
    else if (imp[n]) (from[imp[n][1]] ||= []).push(imp[n][0]);
  }
  // небезпечне: значення (не функція) верхнього рівня з назвою іншого модуля — під час завантаження може ще не існувати
  for (const s of my) if (!s.fn) { const init = s.lines.join('\n').replace(/^[\s\S]*?=/, ''); if (!/^\s*(async\s*)?(\([^)]*\)|[\w$]+)\s*=>/.test(init)) for (const n of ids(init)) if (owner[n] && owner[n].mod !== mod) warn.push(`${mod}: ${s.names} ← ${n} (${owner[n].mod})`); }
  out[mod] = { my, from };
}
for (const mod of mods) {
  const { my, from } = out[mod];
  const imps = Object.entries(from).sort().map(([src, ns]) => `import { ${[...new Set(ns)].sort().join(', ')} } from '${src}';`);
  const body = my.map(s => { let t = s.lines.join('\n'); if (!s.exported && s.names.some(n => needExport.has(n))) t = t.replace(/^(async |function |const |let )/m, 'export $1'); return t; }).join('\n');
  writeFileSync(`${dir}${P.base}-${mod}.js`, `// ${P.mods[mod]}\n// (частина ${P.base}.js — інші файли імпортують з ${P.base}.js, як і раніше)\n${imps.join('\n')}\n\n${body.replace(/^\n+/, '')}\n`);
}
// фасад: ті самі експорти, що й раніше
const facade = head.join('\n').replace(/^import [^;]+;\n?/gm, '').split('\n');
for (const mod of mods) { const ex = out[mod].my.filter(s => s.exported).flatMap(s => s.names); if (ex.length) facade.push(`export { ${ex.join(', ')} } from './${P.base}-${mod}.js';`); }
writeFileSync(file, facade.join('\n') + '\n' + tail.join('\n'));
console.log('модулі:', mods.map(m => `${m}:${out[m].my.length}`).join(' '), '| інструкцій', st.length);
if (warn.length) console.log('⚠️ значення з іншого модуля під час завантаження:\n' + warn.join('\n'));
