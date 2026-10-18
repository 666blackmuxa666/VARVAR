// 🗺 Карта коду → _team/map.md (генерується, руками не правити). Запускається з tools/check.mjs.
// Відповідає на «де це?»: що робить кожен файл, де обробляється op каси і хто його викликає,
// які функції в якому розділі каси, які файли читають/пишуть кожен ключ бази.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url));
const ls = d => readdirSync(R + d).filter(f => f.endsWith('.js')).sort().map(f => ({ f: d + f, s: readFileSync(R + d + f, 'utf8') }));
const srv = ls('worker/src/'), pos = ls('js/pos/').filter(x => /\/\d/.test(x.f)), front = ls('js/').filter(x => x.f !== 'js/pos.build.js');
const lineOf = (s, i) => s.slice(0, i).split('\n').length, short = f => f.replace(/^(worker\/src|js\/pos|js)\//, '');
const about = s => (s.match(/^\s*\/\/\s*(.+)/) || [, ''])[1].replace(/\s+/g, ' ').slice(0, 140);
const md = ['# 🗺 Карта коду', '', '_Генерується `node tools/map.mjs` (і кожним `tools/test.sh`). Руками не правити._', ''];

md.push('## Сервер — файли', '', '| Файл | Рядків | Що робить |', '|---|---|---|');
for (const x of srv) md.push(`| \`${short(x.f)}\` | ${x.s.split('\n').length} | ${about(x.s).replace(/\|/g, '/')} |`);

md.push('', '## Каса — розділи і функції', '');
for (const x of pos) {
  const fns = [...x.s.matchAll(/^ {2}(?:async )?function ([A-Za-z0-9_$]+)/gm)].map(m => `${m[1]}:${lineOf(x.s, m.index)}`);
  md.push(`- **${short(x.f)}** (${x.s.split('\n').length}) — ${fns.join(', ') || '—'}`);
}

md.push('', '## Op каси → де обробляється → хто викликає', '', '| op | сервер | каса |', '|---|---|---|');
const calls = {};
for (const x of pos) for (const m of x.s.matchAll(/\b(?:api|act)\('([A-Za-z0-9_]+)'/g)) (calls[m[1]] ||= new Set()).add(short(x.f));
const ops = {};
for (const x of srv) for (const m of x.s.matchAll(/(?:case |op === )'([A-Za-z][A-Za-z0-9_]+)'/g)) if (calls[m[1]]) (ops[m[1]] ||= []).push(`${short(x.f)}:${lineOf(x.s, m.index)}`);
for (const o of Object.keys(calls).sort()) md.push(`| ${o} | ${(ops[o] || ['за префіксом op (pos.js)']).join(', ')} | ${[...calls[o]].join(', ')} |`);

md.push('', '## Ключі бази → файли', '', '_Ключ — префікс до «:» (`bill:`, `att:`…)._', '', '| Ключ | Файли |', '|---|---|');
const keys = {};
for (const x of srv) for (const m of x.s.matchAll(/(?:DB\.(?:get|put|delete|list|getMany)\(|prefix:\s*|L\(env,\s*)\[?[`']([a-zA-Z]{2,12}):/g)) (keys[m[1]] ||= new Set()).add(short(x.f));
for (const k of Object.keys(keys).sort()) md.push(`| \`${k}:\` | ${[...keys[k]].join(', ')} |`);

md.push('', '## Фронт (не каса)', '', '| Файл | Що робить |', '|---|---|');
for (const x of front) md.push(`| \`${x.f}\` | ${about(x.s).replace(/\|/g, '/')} |`);

const out = md.join('\n') + '\n', P = R + '_team/map.md';
if (!existsSync(P) || readFileSync(P, 'utf8') !== out) writeFileSync(P, out);
console.log(`🗺 Карта: ${srv.length} файлів сервера, ${pos.length} розділів каси, ${Object.keys(calls).length} op, ${Object.keys(keys).length} ключів`);
