#!/usr/bin/env node
// 🗺 План для команди й начальника — той самий KV `atom:plan`, що й вкладка «🗺 План» у кабінеті. Читає/пише напряму через wrangler kv (0 запитів до воркера).
//   node tools/plan.mjs next [--role "Розробник-1"] [--n 10]   ⭐ першими, далі відкриті задачі дошки (коротко)
//   node tools/plan.mjs tree                                    увесь план деревом (горизонт → гілка → задача)
//   node tools/plan.mjs show <id>                               повна задача: навіщо, деталі, скріни, підзадачі
//   node tools/plan.mjs take <id> "<роль>"                      «в роботі»
//   node tools/plan.mjs done <id> "що зроблено, 1 рядок"        ✅ → кошик
//   node tools/plan.mjs add "<назва>" [--zone team|plan|bug|wait] [--parent id] [--role X] [--why "…"] [--note "…"] [--star] [--hz 1]
//   node tools/plan.mjs set <id> '<json полів>'                 напр. '{"why":"…","parent":"abc"}'
//   node tools/plan.mjs draft                                   нерозібрані накидки власника (+ URL скрінів)
//   node tools/plan.mjs parsed <draftId> "<куди розібрано>"
//   node tools/plan.mjs apply <file.json>                       пакет ops (масив) — для імпорту/великих змін
// PLAN_LOCAL=1 — локальний worker-test (.varvar-test) замість робочого KV.
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planApply, planEmpty, PLAN_KEY } from '../worker/src/plan.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), NS = '279c013ca4564083a7f56326a2855bbd', LOCAL = !!process.env.PLAN_LOCAL;
const where = LOCAL ? { cwd: join(ROOT, '..', '.varvar-test'), a: ['--binding', 'DB', '--local', '--persist-to', '.state'] } : { cwd: join(ROOT, 'worker'), a: ['--namespace-id', NS, '--remote'] };
const wr = args => execFileSync('npx', ['wrangler', 'kv', 'key', ...args, ...where.a], { cwd: where.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function get() { try { const s = wr(['get', PLAN_KEY]).trim(); return s && !/Value not found/.test(s) ? JSON.parse(s) : planEmpty(); } catch (e) { if (/not found/i.test(String(e.stderr || e.stdout))) return planEmpty(); throw e; } }
function put(d) { const f = join(mkdtempSync(join(tmpdir(), 'plan-')), 'p.json'); writeFileSync(f, JSON.stringify(d)); wr(['put', PLAN_KEY, '--path', f]); }
function run(ops) { const r = planApply(get(), ops, '🤖 команда'); put(r.d); const er = r.out.filter(x => x.error); if (er.length) console.error('⚠️', er.map(x => x.error).join('; ')); return r; }

const [cmd = 'next', ...A] = process.argv.slice(2);
const opt = k => { const i = A.indexOf('--' + k); if (i < 0) return undefined; const v = A[i + 1]; A.splice(i, v && !v.startsWith('--') ? 2 : 1); return v && !v.startsWith('--') ? v : true; };
const ZI = { plan: '🗺', team: '👥', bug: '🐞', wait: '⏸' };
const line = (x, D, pre = '') => { const k = D.items.filter(y => y.parent === x.id), kd = k.filter(y => y.done).length;
  return `${pre}${x.done ? '✅' : x.star ? '⭐' + x.star : x.take ? '⚙️' : '·'} ${x.id} ${ZI[x.zone] || ''} ${x.t}${x.take ? ` [в роботі: ${x.take}]` : x.role ? ` [${x.role}]` : ''}${k.length ? ` (${kd}/${k.length})` : ''}${x.imgs?.length ? ` 📎${x.imgs.length}` : ''}`; };

if (cmd === 'next') {
  const D = get(), role = opt('role'), n = +(opt('n') || 12), L = D.items.filter(x => !x.done && !D.items.some(y => y.parent === x.id && !y.done)); // лише листки: те, що реально робити
  const mine = x => !role || !x.role || x.role.includes(role) || x.take?.includes(role);
  const star = D.items.filter(x => !x.done && x.star).sort((a, b) => a.star - b.star).filter(mine);
  const rest = L.filter(x => !x.star && x.zone !== 'wait' && mine(x)).sort((a, b) => (a.zone === 'bug' ? 0 : a.zone === 'team' ? 1 : 2) - (b.zone === 'bug' ? 0 : b.zone === 'team' ? 1 : 2) || a.at - b.at);
  console.log(`⭐ ПЕРШИМ (${star.length}):`); star.forEach(x => { console.log(line(x, D, '  ')); D.items.filter(y => y.parent === x.id && !y.done).forEach(y => console.log(line(y, D, '      '))); });
  console.log(`\nДалі (${rest.length}, показано ${Math.min(n, rest.length)}):`); rest.slice(0, n).forEach(x => console.log(line(x, D, '  ')));
  const dr = D.draft.filter(x => !x.parsed).length; if (dr) console.log(`\n📝 Нерозібраних накидок власника: ${dr} (node tools/plan.mjs draft)`);
} else if (cmd === 'tree') {
  const D = get(), go = (p, pre) => D.items.filter(x => x.parent === p && !x.done).forEach(x => { console.log(line(x, D, pre)); go(x.id, pre + '   '); });
  for (const z of ['wait', 'bug', 'team']) { const R = D.items.filter(x => x.zone === z && !x.parent && !x.done); if (R.length) { console.log(`\n${ZI[z]} ${z}`); R.forEach(x => { console.log(line(x, D, '  ')); go(x.id, '     '); }); } }
  for (const h of [1, 2, 3]) { const R = D.items.filter(x => x.zone === 'plan' && !x.parent && (x.hz || 1) === h && !x.done); if (R.length) { console.log(`\n🗺 Горизонт ${h}`); R.forEach(x => { console.log(line(x, D, '  ')); go(x.id, '     '); }); } }
  console.log(`\n✅ у кошику: ${D.items.filter(x => x.done).length}`);
} else if (cmd === 'show') {
  const D = get(), x = D.items.find(y => y.id === A[0]); if (!x) { console.error('Немає', A[0]); process.exit(1); }
  console.log(line(x, D)); for (const k of ['why', 'note', 'res']) if (x[k]) console.log(`${k}: ${x[k]}`); (x.imgs || []).forEach(u => console.log('📎', u));
  const p = D.items.find(y => y.id === x.parent); if (p) console.log('↑ у:', p.id, p.t); D.items.filter(y => y.parent === x.id).forEach(y => console.log(line(y, D, '  ')));
} else if (cmd === 'take') run([{ o: 'set', id: A[0], f: { take: A[1] || 'команда' } }]), console.log('⚙️ взято', A[0]);
else if (cmd === 'done') run([{ o: 'set', id: A[0], f: { done: 1, res: A.slice(1).join(' ') } }]), console.log('✅', A[0]);
else if (cmd === 'add') { const f = { zone: opt('zone') || 'team', parent: opt('parent'), role: opt('role'), why: opt('why'), note: opt('note'), hz: opt('hz'), star: opt('star') ? 1 : 0 };
  Object.keys(f).forEach(k => f[k] === undefined && delete f[k]); f.t = A.join(' '); console.log('➕', run([{ o: 'add', f }]).out[0].id); }
else if (cmd === 'set') run([{ o: 'set', id: A[0], f: JSON.parse(A[1] || '{}') }]), console.log('✏️', A[0]);
else if (cmd === 'draft') { const D = get(); D.draft.filter(x => !x.parsed).reverse().forEach(x => { console.log(`— ${x.id} · ${new Date(x.at).toLocaleString('uk-UA')}\n${x.text}`); x.imgs.forEach(u => console.log('📎', u)); }); if (!D.draft.some(x => !x.parsed)) console.log('Нерозібраних накидок немає'); }
else if (cmd === 'parsed') run([{ o: 'draftSet', id: A[0], f: { parsed: A.slice(1).join(' ') } }]), console.log('✅ накидка', A[0]);
else if (cmd === 'init') { // разове перенесення: цілий документ із дерева {t, why, zone, hz, role, note, done, res, kids:[…]}; лише в порожній план (або --force)
  const force = opt('force'), cur = get(); if (cur.items.length && !force) { console.error(`У плані вже ${cur.items.length} задач — додайте --force`); process.exit(1); }
  let d = planEmpty(); const go = (L, parent) => L.forEach(n => { const { kids, ...f } = n; const r = planApply(d, [{ o: 'add', f: { ...f, parent, done: 0 } }], '👑 перенесено'); d = r.d; const id = r.out[0].id;
    if (n.done) d = planApply(d, [{ o: 'set', id, f: { done: 1, res: n.res || '' } }]).d; go(kids || [], id); });
  go(JSON.parse(readFileSync(A[0], 'utf8')), null); put(d); console.log(`✅ перенесено: ${d.items.length} задач (${d.items.filter(x => x.done).length} у кошику)`); }
else if (cmd === 'apply') { const r = run(JSON.parse(readFileSync(A[0], 'utf8'))); console.log(`ops: ${r.out.length}, задач: ${r.d.items.length}`); }
else { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n')); }
