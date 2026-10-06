// 🔍 Статичний аудит (без сервера, ~1 с): «обірвані ланцюжки» в коді.
//  1) кнопки каси data-a="X" без обробника (case 'X' / a === 'X');
//  2) кнопки ботів callback_data "X:…" без обробника (act === 'X' / includes(['X',…]));
//  3) запити каси api('op') / act('op') без серверного case 'op' (або маршруту за префіксом).
// node tools/audit-static.mjs   → код виходу 1, якщо щось знайдено. Евристика: перед виправленням — перевірити очима.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url));
const read = d => readdirSync(R + d).filter(f => f.endsWith('.js')).map(f => [d + f, readFileSync(R + d + f, 'utf8')]);
const pos = read('js/pos/'), srv = read('worker/src/'), all = s => s.map(x => x[1]).join('\n');
const P = all(pos), S = all(srv), out = [];
const uniq = (re, txt) => [...new Set([...txt.matchAll(re)].map(m => m[1]))];

// 1) кнопки каси
const acts = uniq(/data-a="([A-Za-z0-9_]+)"/g, P), handled = new Set([...uniq(/case '([A-Za-z0-9_]+)'/g, P), ...uniq(/a === '([A-Za-z0-9_]+)'/g, P), ...uniq(/dataset\??\.a !== '([A-Za-z0-9_]+)'/g, P), ...uniq(/\[([^\]]*)\]\.includes\(a\)/g, P).flatMap(l => uniq(/'([A-Za-z0-9_]+)'/g, l))]);
for (const a of acts) if (!handled.has(a)) out.push(`🖱 каса: кнопка data-a="${a}" — не знайдено обробника`);

// 2) кнопки ботів
const cbs = uniq(/callback_data:\s*[`']([a-z]+)[:`']/g, S), cbH = new Set([...uniq(/act === '([a-z]+)'/g, S), ...uniq(/\[([^\]]*)\]\.includes\(act\)/g, S).flatMap(l => uniq(/'([a-z]+)'/g, l)), ...uniq(/data === '([a-z]+)'/g, S), ...uniq(/\ba === '([a-z]+)'/g, S), ...uniq(/startsWith\('([a-z]+):?'\)/g, S)]);
for (const c of cbs) if (!cbH.has(c)) out.push(`🤖 бот: callback_data «${c}:…» — не знайдено обробника`);

// 3) API каси
const ops = uniq(/\b(?:api|act)\('([A-Za-z0-9_]+)'/g, P), cases = new Set([...uniq(/case '([A-Za-z0-9_]+)'/g, S), ...uniq(/b\.op === '([A-Za-z0-9_]+)'/g, S)]), pref = uniq(/\/\^([a-z]+)(?:\[A-Z\])?\/\.test\(b\.op/g, S);
for (const o of ops) if (!cases.has(o) && !pref.some(p => o.startsWith(p))) out.push(`🔌 каса → сервер: op «${o}» — немає case на сервері`);

console.log(out.length ? out.join('\n') + `\n\n⚠️ Знайдено: ${out.length}` : `✅ Обірваних ланцюжків не знайдено (кнопок каси ${acts.length}, кнопок ботів ${cbs.length}, запитів ${ops.length})`);
process.exit(out.length ? 1 : 0);
