// 📦 Ф12 Повне вивантаження закладу одним ZIP: «дані клієнта — у клієнта». Лише читання.
// Довідники — CSV з колонками «пакету переходу» (KINDS у mig.js): той самий файл заливається назад майстром переходу.
// Історія — CSV за весь час (чеки й страви, витрати, Z, рух каси, накладні). atom-data.json — усе сховище без секретів, PIN і сесій.
import { KINDS } from './mig.js';
import { getMenu } from './menu.js';
import { getIng, getCards } from './stock.js';
import { getStaff } from './ops-staff.js';
import { getLoy } from './promo.js';
import { crc32, b64 } from './acct.js';
import { venueId } from './venue.js';

// 🔐 у файл не йдуть: ключі й токени (зашифровані секрети, ПРРО, API), коди реєстрації, сесії й стани бота, лічильники лімітів
const SECRET = /^(cfg:secrets|apikeys|bkapi|qr_key|reg_|fis:tok|st:|tgs:|wlog:|push:|__)|^(pos|gs|gl|glu|qid|ipdev|prl|prfail|jserr|gorl|wlrl|lrl|gchrl|callrl|fail|bakwarn|bakday):/;
const ROLE = { admin: 'Адміністратор', waiter: 'Офіціант', cook: 'Кухар', courier: 'Курʼєр', acc: 'Бухгалтер' };
const r2 = n => Math.round((+n || 0) * 100) / 100;
const csv = (head, rows) => new TextEncoder().encode('﻿' + [head, ...rows].map(x => x.map(v => { const t = String(v ?? ''); return /[;"\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(';')).join('\r\n') + '\r\n');
const kindCsv = (kind, rows) => csv(Object.values(KINDS[kind].f).map(l => l.replace('*', '')), rows.map(r => Object.keys(KINDS[kind].f).map(k => r[k] ?? '')));
const dmy = d => d ? d.split('-').reverse().join('.') : '';
const hm = ts => ts ? new Date(ts + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '';

// ZIP зі стисненням deflate (CompressionStream 'deflate-raw'); дрібні файли — без стиснення
async function zip(files) {
  const parts = [], cen = []; let off = 0;
  const h = (n, ...v) => { const b = new Uint8Array(n), d = new DataView(b.buffer); let i = 0; for (const [sz, x] of v) { sz === 2 ? d.setUint16(i, x, true) : d.setUint32(i, x, true); i += sz; } return b; };
  for (const f of files) {
    const nm = new TextEncoder().encode(f.name), crc = crc32(f.data), L = f.data.length;
    let body = f.data, m = 0;
    if (L > 512) { const z = new Uint8Array(await new Response(new Blob([f.data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); if (z.length < L) { body = z; m = 8; } }
    parts.push(h(30, [4, 0x04034b50], [2, 20], [2, 0x800], [2, m], [2, 0], [2, 0x21], [4, crc], [4, body.length], [4, L], [2, nm.length], [2, 0]), nm, body); // 0x800 — імена файлів у UTF-8
    cen.push(h(46, [4, 0x02014b50], [2, 20], [2, 20], [2, 0x800], [2, m], [2, 0], [2, 0x21], [4, crc], [4, body.length], [4, L], [2, nm.length], [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, off]), nm);
    off += 30 + nm.length + body.length;
  }
  const csz = cen.reduce((a, b) => a + b.length, 0), all = [...parts, ...cen, h(22, [4, 0x06054b50], [2, 0], [2, 0], [2, files.length], [2, files.length], [4, csz], [4, off], [2, 0])];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let i = 0; for (const b of all) { out.set(b, i); i += b.length; } return out;
}
// усі записи з префіксом (closed:<день> тощо) → [[ключ, значення]], за датою
async function byPrefix(env, p) {
  const ks = (await env.DB.list({ prefix: p })).keys.map(k => k.name).filter(k => /^\d{4}-\d\d(-\d\d)?$/.test(k.slice(p.length))).sort();
  const vs = await env.DB.getMany(ks, 'json'); return ks.map((k, i) => [k.slice(p.length), vs[i] || []]);
}

export async function fullExport(env) {
  const [menu, ing, cards, staff, loy, supl, certs] = await Promise.all([getMenu(env), getIng(env), getCards(env), getStaff(env), getLoy(env), env.DB.get('supl', 'json'), env.DB.get('certs', 'json')]);
  const files = [], cnt = {}, add = (name, data, n) => { files.push({ name, data }); if (n != null) cnt[name] = n; };
  // 🍽 меню (розміри — окремими рядками, як вміє імпорт)
  const items = menu.categories.flatMap(c => c.items.map(it => ({ c, it }))), byId = new Map(items.map(x => [x.it.id, x.it]));
  const mrows = items.flatMap(({ c, it }) => { const b = { id: it.id, cat: c.tech ? '' : c.name?.uk || '', name: it.name?.uk || '', desc: it.desc?.uk || '' };
    return it.variants?.length ? it.variants.map(v => ({ ...b, price: v.p, pick: v.pr?.pick || '', del: v.pr?.del || '', v: v.v + (it.size ? ' ' + it.size : '') })) : [{ ...b, price: it.price ?? '', pick: it.pr?.pick || '', del: it.pr?.del || '', size: it.size || '' }]; });
  add('01-меню.csv', kindCsv('menu', mrows), mrows.length);
  const mods = (menu.mods || []).flatMap(g => g.items.map(o => ({ grp: g.name, n: o.n, p: o.p || 0, min: g.min ?? 0, max: g.max ?? 1, dish: items.filter(x => (x.it.mods || []).includes(g.id)).map(x => x.it.name?.uk).join('; ') })));
  if (mods.length) add('02-модифікатори.csv', kindCsv('mods', mods), mods.length);
  // 📦 продукти й залишки (кухня й бар — окремими рядками)
  const live = ing.filter(z => !z.off && !z.grp), irows = live.flatMap(z => { const b = { id: z.id, n: z.n, u: z.u, cat: z.cat || '', cost: z.cost || 0, bc: (z.bc || []).join(' ') };
    const w = [['k', 'Кухня'], ['b', 'Бар']].filter(([k]) => z.st?.[k]); return w.length ? w.map(([k, t]) => ({ ...b, q: z.st[k], wh: t, sum: r2(z.st[k] * (z.cost || 0)) })) : [{ ...b, q: 0, wh: '', sum: 0 }]; });
  add('03-продукти-залишки.csv', kindCsv('ing', irows), live.length);
  const iById = new Map(ing.map(z => [z.id, z])), crows = Object.entries(cards).flatMap(([id, c]) => { const d = byId.get(id)?.name?.uk; return d ? (c.items || []).map(l => ({ dish: d, ing: iById.get(l.id)?.n || l.id, q: l.q, u: iById.get(l.id)?.u || '', loss: l.loss || '', out: c.out || '' })) : []; });
  add('04-техкарти.csv', kindCsv('cards', crows), crows.length);
  const sups = (await env.DB.getMany((supl || []).map(x => 'sup:' + x.id), 'json')).map((p, i) => p || supl[i]);
  add('05-постачальники.csv', kindCsv('sup', sups.map(p => ({ n: p.n, code: p.code || '', iban: p.iban || '', phone: p.phone || '', addr: p.addr || '' }))), sups.length);
  // 👤 гості й бонуси (депозити гостей — у сертифікатах DEP-…)
  const cks = (await env.DB.list({ prefix: 'cli:' })).keys.map(k => k.name).filter(k => /^cli:\+?\d{9,15}$/.test(k)), cl = await env.DB.getMany(cks, 'json'), lv = new Map(loy.levels.map(l => [l.id, l.name]));
  const clrows = cks.map((k, i) => { const c = cl[i] || {}; return { phone: k.slice(4), name: c.name || '', bal: c.bal || 0, bd: c.bd ? c.bd.split('-').reverse().join('.') : '', note: c.note || '', card: c.card || '', grp: lv.get(c.lvl) || '', dep: '' }; });
  add('06-гості-бонуси.csv', kindCsv('cli', clrows), clrows.length);
  const cs = (await env.DB.getMany((certs || []).map(c => 'cert:' + c), 'json')).filter(Boolean);
  add('07-сертифікати.csv', kindCsv('cert', cs.map(c => ({ code: c.code, sum: c.sum, left: c.left ?? c.sum, phone: c.phone || '', to: c.to || '', exp: c.exp ? new Date(c.exp).toISOString().slice(0, 10).split('-').reverse().join('.') : '' }))), cs.length);
  add('08-персонал.csv', kindCsv('staff', staff.map(s => ({ n: s.name, role: ROLE[s.role] || s.role || '' }))), staff.length);
  // 🧾 історія за весь час
  const [cl2, ex, zz, mv, inv] = await Promise.all(['closed:', 'exp:', 'z:', 'mov:', 'invl:'].map(p => byPrefix(env, p)));
  const chk = cl2.flatMap(([d, l]) => l.filter(x => !x.del && !x.rm).map(x => ({ d, ...x })));
  add('10-чеки.csv', csv(['Дата', 'Час', '№', 'Стіл / тип', 'Сума', 'Готівка', 'Карта (з онлайном)', 'з них онлайн', 'Чайові', 'Знижка', 'Офіціант', 'Гість (телефон)'],
    chk.map(x => [dmy(x.d), x.at || '', x.id, x.go ? ({ pick: 'з собою', del: 'доставка' }[x.go] || x.go) : x.t ?? '', r2(x.sum), r2(x.cash ?? x.sum), r2(x.card), r2(x.onl), r2(x.tip), r2(x.discSum), x.w || x.by || '', x.cli || ''])), chk.length);
  const dl = chk.flatMap(x => (x.dishes || []).map(([n, q, s]) => [dmy(x.d), x.id, n, q, r2(s)]));
  add('11-чеки-страви.csv', csv(['Дата', '№ чека', 'Страва', 'Кількість', 'Сума'], dl), dl.length);
  const exr = ex.flatMap(([d, l]) => l.filter(x => !x.del).map(x => [dmy(d), x.at || '', r2(x.sum), x.src || '', x.note || '', x.by || '']));
  add('12-витрати.csv', csv(['Дата', 'Час', 'Сума', 'Звідки', 'Примітка', 'Хто'], exr), exr.length);
  const zr = zz.flatMap(([d, l]) => l.filter(x => !x.del).map(x => [dmy(d), hm(x.opened), hm(x.closed), x.closedBy || '', x.checks || 0, r2(x.cash), r2(x.card), r2(x.tip), r2(x.total), r2(x.exCash), r2(x.inBox), x.counted ?? '', x.diff ?? '']));
  add('13-z-звіти.csv', csv(['Дата', 'Відкрито', 'Закрито', 'Хто закрив', 'Чеків', 'Готівка', 'Карта', 'Чайові', 'Виручка', 'Витрати з каси', 'Мало бути в касі', 'Пораховано', 'Різниця'], zr), zr.length);
  const mr = mv.flatMap(([d, l]) => l.filter(x => !x.del).map(x => [dmy(d), x.at || '', x.type || '', r2(x.sum), x.note || '', x.by || '']));
  add('14-рух-каси.csv', csv(['Дата', 'Час', 'Тип', 'Сума', 'Примітка', 'Хто'], mr), mr.length);
  const ir = inv.flatMap(([, l]) => l.filter(x => !x.del).map(x => [dmy(x.day), x.sup || '', x.no || '', x.n || 0, r2(x.total), x.pay || '', x.paid ? 'так' : 'ні']));
  add('15-накладні.csv', csv(['Дата', 'Постачальник', '№ накладної', 'Позицій', 'Сума', 'Оплата', 'Сплачено'], ir), ir.length);
  // 🗄 усе сховище (машиночитано) — без секретів; у персоналу без PIN
  const raw = env.DB.dump ? await env.DB.dump() : [], all = {};
  for (const [k, r] of raw) { if (SECRET.test(k)) continue; let v = r?.v ?? r; try { v = typeof v === 'string' ? JSON.parse(v) : v; } catch {} if (k === 'staff' && Array.isArray(v)) v = v.map(({ pin, ...s }) => s); all[k] = v; }
  const at = Date.now(), venue = venueId();
  add('atom-data.json', new TextEncoder().encode(JSON.stringify({ atom_export: 1, venue, at, keys: Object.keys(all).length, data: all })), Object.keys(all).length);
  const readme = `ATOM — повне вивантаження даних закладу «${venue}»
Створено: ${hm(at)} (Київ)

Ці дані — ваші. Файли відкриваються в Excel / Google Таблицях (роздільник «;», кодування UTF-8).

01–08 — довідники в форматі «пакету переходу»: меню, модифікатори, продукти й залишки, техкарти,
        постачальники, гості й бонуси, сертифікати (і депозити гостей DEP-…), персонал.
        Цей самий файл можна залити назад: Кабінет → 📥 Перехід → Excel / CSV.
10–15 — історія за весь час: чеки, страви в чеках, витрати, Z-звіти, рух каси, накладні.
atom-data.json — усі дані закладу в машиночитаному вигляді (для переносу в іншу систему).

Не входять: паролі, PIN працівників, ключі ПРРО / банку / оплат, токени ботів, сесії входу.
Повну копію для відновлення в ATOM дає Кабінет → 💾 Копії.

Записів: ${Object.entries(cnt).map(([k, v]) => `${k} — ${v}`).join('; ')}
`;
  files.unshift({ name: 'README.txt', data: new TextEncoder().encode(readme) });
  const z = await zip(files);
  return { name: `atom-${venue}-${new Date(at + 3 * 3600e3).toISOString().slice(0, 10)}.zip`, kb: Math.round(z.length / 1024), n: cnt, bytes: z };
}
export async function fullExportB64(env) { const { bytes, ...r } = await fullExport(env); return { ...r, b64: b64(bytes) }; }
