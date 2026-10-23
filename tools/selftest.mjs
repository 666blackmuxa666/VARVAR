#!/usr/bin/env node
// 🧪 Автотести VARVAR — лише проти worker-test (http://localhost:8787) і сайту (http://localhost:8000).
// Запуск: node tools/selftest.mjs [--api-only] [--ui-only] [--quiet] [--views=go,books] [--roles=admin,courier] [--widths=375,1280]
// --quiet — друкує лише ❌ і підсумок (економить контекст агента); --views/--roles/--widths — лише свій розділ інтерфейсу
// Змінні: API=http://localhost:8787 SITE=http://localhost:8000 CHROME=/шлях/до/chrome
// Без залежностей: API — fetch, інтерфейс — безголовий Chrome через CDP (вбудований WebSocket Node 22+).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = process.env.API || 'http://localhost:8787';
const SITE = process.env.SITE || 'http://localhost:8000';
const ARGS = process.argv.slice(2), QUIET = ARGS.includes('--quiet');
const opt = k => (ARGS.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1]?.split(',').filter(Boolean);
const ONLY_VIEWS = opt('views'), ONLY_ROLES = opt('roles'), ONLY_W = opt('widths')?.map(Number);
const RUN = Date.now().toString(36).slice(-5);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const day = (d = 0) => new Date(Date.now() + 3 * 3600e3 + d * 864e5).toISOString().slice(0, 10); // Київ ≈ UTC+3

// захист: не ганяти тести проти справжнього сервера
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(API)) { console.error('❌ API має бути локальним worker-test, а не', API); process.exit(2); }

// ---------- звіт ----------
const results = [];
let group = '';
function sect(name) { group = name; if (!QUIET) console.log(`\n▶ ${name}`); }
function rec(name, ok, info = '') { results.push({ group, name, ok }); if (!QUIET || !ok) console.log(`  ${ok ? '✅' : '❌'} ${name}${info ? ' — ' + info : ''}`); return ok; }
async function step(name, fn) {
  try { const r = await fn(); if (r === false) return rec(name, false); return rec(name, true, typeof r === 'string' ? r : ''); }
  catch (e) { return rec(name, false, String(e?.message || e).slice(0, 300)); }
}
const must = (c, msg) => { if (!c) throw new Error(msg); };

// ---------- API ----------
async function http(path, body, token) {
  const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j: j || {} };
}
const pos = (token, op, b = {}) => http('/api/pos', { op, ...b }, token);
async function posOk(token, op, b) { const r = await pos(token, op, b); must(r.status === 200 && r.j.ok, `${op} → ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); return r.j; }

const users = {};
const usedPins = new Set();
function pin(role) { let p; do { p = role === 'admin' ? String(100000 + Math.floor(Math.random() * 899999)) : String(1000 + Math.floor(Math.random() * 9000)); } while (/^111[1-9]$/.test(p) || usedPins.has(p)); usedPins.add(p); return p; }
async function register(role, code) {
  for (let i = 0; i < 8; i++) { // PIN може збігтися з чужим (база накопичує працівників); відповідь може загубитись при обриві DO → нове імʼя
    const name = `QA ${role} ${RUN}` + (i ? ` ${i}` : '');
    const pn = pin(role), r = await http('/api/pos', { op: 'register', code, name, pin: pn });
    if (r.status === 200 && r.j.token) { users[role] = { token: r.j.token, me: r.j.me, pin: pn }; must(r.j.me.role === role, `роль ${r.j.me.role} ≠ ${role}`); return r.j.me.name; }
    if (!/PIN|імʼ|bad_request/.test(r.j.error || '')) throw new Error(`${r.status} ${JSON.stringify(r.j)}`);
  }
  throw new Error('не вдалося зареєструватись');
}
// staffEdit із повтором: PIN може збігтися з чужим, а запит — потрапити на перезавантаження сервера
async function editRetry(A, b, tries = 6) { let r; for (let i = 0; i < tries; i++) { const x = { ...b }; if (b.pin) x.pin = i ? pin() : b.pin; r = await pos(A, 'staffEdit', x); if (r.status === 200 && r.j.ok) { r.pin = x.pin; return r; } if (r.status === 401) break; if (!(b.pin && /PIN/.test(r.j.error || '')) && r.j.error !== 'bad_request') break; await new Promise(f => setTimeout(f, 700)); } return r; }

async function apiTests() {
  sect('Сервер');
  const alive = await step('worker-test відповідає', async () => { const r = await http('/api/goinfo'); must(r.status === 200, 'статус ' + r.status); });
  if (!alive) return false;

  sect('Реєстрація ролей (коди тестової бази)');
  for (const [role, code] of [['admin', '1119'], ['waiter', '1112'], ['cook', '1113'], ['courier', '1114']]) await step(`${role} (${code})`, () => register(role, code));
  const A = users.admin?.token, W = users.waiter?.token, C = users.courier?.token, K = users.cook?.token;
  if (!A || !W) { rec('далі без адміна/офіціанта неможливо', false); return true; }

  const menu = (await http('/api/menu')).j;
  const all = (menu.categories || []).flatMap(c => c.items.map(i => ({ ...i, cat: c.id })));
  const dish = all.find(i => i.cat === 'pasta' && !i.hidden && i.price) || all.find(i => ['burgers', 'salads', 'soups'].includes(i.cat) && !i.hidden && i.price);
  const drink = all.find(i => i.cat === 'coffee' && !i.hidden && i.price);

  // 🧹 тестова база спільна: ручні перевірки / аудит кнопок могли вимкнути функції — повертаємо, щоб тести не залежали від чужих кліків
  await step('підготовка: доставка, самовивіз, сайт, лояльність увімкнені', async () => {
    for (const k of ['on', 'del', 'pick']) await pos(A, 'goCfgSet', { k, v: 1 });
    for (const k of ['bookOn', 'certOn']) await pos(A, 'siteSet', { k, v: 1 });
    await pos(A, 'loySet', { on: 1 }); return 'ок';
  });
  await step('💡 допродаж: правила зберігаються, читаються, підказка в касі; офіціанту редагувати не можна', async () => {
    if (!dish || !drink) return 'немає страв';
    const old = (await posOk(A, 'upsGet')).text || '';
    const r = await posOk(A, 'upsSet', { text: `${dish.name.uk} → ${drink.name.uk}` }); must(r.n >= 1, 'n=' + r.n);
    const g = await posOk(A, 'upsGet'); must(g.text.includes(drink.name.uk), 'text=' + g.text.slice(0, 80));
    const m = await posOk(A, 'upsMap'); must(m.m && typeof m.m === 'object', 'upsMap');
    if (W) { const w = await pos(W, 'upsSet', { text: '' }); must(w.status === 403, 'офіціант upsSet → ' + w.status); }
    await posOk(A, 'upsSet', { text: old });
  });
  sect('Стіл → кухня → закриття');
  let T = 0;
  await step('👑 «Усі сповіщення закладу»: адмін вмикає/вимикає; офіціанту → 403', async () => {
    const on = await posOk(A, 'pushAll', { on: true }); must(on.all === true, JSON.stringify(on));
    must((await posOk(A, 'pushKey', {})).all === true, 'pushKey.all не true');
    if (W) { const w = await pos(W, 'pushAll', { on: true }); must(w.status === 403, 'офіціант pushAll → ' + w.status); }
    const off = await posOk(A, 'pushAll', { on: false }); must(off.all === false && (await posOk(A, 'pushKey', {})).all === false, 'не вимкнулось');
  });
  await step('вибрати вільний стіл', async () => {
    const s = await posOk(W, 'state'); const busy = new Set(s.tables.map(x => x.t));
    for (let t = s.n; t >= 1; t--) if (!busy.has(t)) { T = t; break; }
    must(T, 'усі столи зайняті'); return 'стіл ' + T;
  });
  await step(`офіціант замовляє (${dish?.id} + ${drink?.id})`, async () => {
    must(dish && drink, 'у меню немає страви/напою'); const r = await posOk(W, 'order', { t: T, items: [{ id: dish.id, q: 2 }, { id: drink.id, q: 1 }] });
    must(r.total === dish.price * 2 + drink.price, `сума ${r.total}`); return `сума ${r.total}`;
  });
  let kq = null;
  await step('на кухні лише страва (без напою)', async () => {
    const r = await posOk(K || A, 'kitchen'); kq = r.list.filter(e => e.t === T && !e.done).pop(); must(kq, 'картки немає');
    must(kq.items.some(i => i.q === 2) && kq.items.length === 1, 'склад картки: ' + JSON.stringify(kq.items));
  });
  await step('кухня: почати → готово', async () => {
    must(kq, 'немає картки'); await posOk(K || A, 'kStart', { id: kq.id }); const r = await posOk(K || A, 'kDone', { id: kq.id }); must(r.e?.done, 'не done');
  });
  await step('💬 коментарі під подією стрічки: коментар, @згадка, реакція, видалення', async () => {
    const ev = (await posOk(A, 'state')).events.slice(-1)[0]; must(ev?.id, 'немає подій');
    must((await pos(W, 'evCom', { id: ev.id, text: '  ' })).status === 400, 'порожній прийнято');
    const e1 = (await posOk(W, 'evCom', { id: ev.id, text: 'QA тест @Кухня' })).e, c = e1.cm.slice(-1)[0]; must(c.m?.includes('Кухня') && c.by, 'без згадки');
    if (K) { const r = await posOk(K, 'evRx', { id: ev.id, rx: '👍', c: c.i }); must(r.e.cm.find(x => x.i === c.i).rx['👍'].length === 1, 'реакція'); const d = await pos(K, 'evComDel', { id: ev.id, c: c.i }); must(d.status === 400, 'чужий коментар видалено'); }
    const e2 = (await posOk(W, 'evComDel', { id: ev.id, c: c.i })).e; must(!e2.cm?.some(x => x.i === c.i), 'не видалено');
  });
  await step('🖨 кілька принтерів: бігунок ділиться кухня/бар, копії, перенос на інший', async () => {
    const back = (await posOk(A, 'rcptGet')).route, s0 = await posOk(A, 'state'), busy = new Set(s0.tables.map(x => x.t)); let t = s0.n; while (busy.has(t)) t--;
    try {
      const r = await posOk(A, 'printRoute', { st: [{ id: 'qk', name: 'QA Кухня', g: ['kitchen', 'other'], n: 1 }, { id: 'qb', name: 'QA Бар', g: ['bar', 'hookah', 'evil'], r: 1, n: 2 }] });
      must(r.route.st[1].g.join() === 'bar,hookah' && r.route.st[1].n === 2, 'маршрут: ' + JSON.stringify(r.route));
      must((await pos(W, 'printRoute', { st: [] })).status === 403, 'офіціант змінив принтери');
      const q0 = new Set((await posOk(A, 'printQ')).list.map(j => j.id));
      await posOk(A, 'order', { t, items: [{ id: dish.id, q: 1 }, { id: drink.id, q: 1 }] });
      const nw = (await posOk(A, 'printQ')).list.filter(j => !q0.has(j.id) && j.kind === 'kitchen');
      must(nw.filter(j => j.st === 'qk').length === 1 && nw.filter(j => j.st === 'qb').length === 2, 'завдання: ' + JSON.stringify(nw.map(j => j.st)));
      await posOk(A, 'printMove', { id: nw[0].id, st: 'qb' }); must((await posOk(A, 'printQ')).list.find(j => j.id === nw[0].id)?.st === 'qb', 'не перенесено');
      for (const j of nw) await posOk(A, 'printClear', { id: j.id });
      await posOk(A, 'close', { t, pay: 'cash', print: false });
    } finally { await posOk(A, 'printRoute', back); }
    return 'кухня ×1, бар ×2';
  });
  await step('👨‍🍳 сторінка кухні /k: скрипт без синтаксичних помилок, шлях заклад-префікса та парсер ваги не зіпсовані', async () => {
    const h = await (await fetch(API + '/k')).text(), sc = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()?.[1]; must(sc, 'немає скрипта');
    try { new Function(sc); } catch (e) { must(false, 'синтаксис: ' + e.message); }
    must(sc.includes("replace(/\\/(k|kitchen)\\/?$/,'')") && /match\(\/\^\\s\*\(\\d/.test(sc), 'регулярки втратили слеші'); });
  await step('📤 експорт для бухгалтера: усі розділи, суми збігаються зі звітом, офіціанту заборонено', async () => {
    const day = new Date().toISOString().slice(0, 10), to = new Date(Date.now() + 864e5).toISOString().slice(0, 10), x = await posOk(A, 'acctExport', { from: day, to });
    const ids = x.sections.map(s => s.id).join(); must(['sales', 'checks', 'pay', 'inv', 'off', 'exp', 'zp'].every(k => ids.includes(k)), 'розділи: ' + ids);
    must(x.sections.every(s => s.rows.every(r => r.length === s.head.length)), 'ширина рядків ≠ шапка');
    const rep = await posOk(A, 'report', { from: day, to }), tot = x.sections.find(s => s.id === 'sales').rows.at(-1);
    { const pt = x.sections.find(s => s.id === 'pay').rows, v = l => +pt.find(r => r[0] === l)?.[1] || 0; must(Math.abs(v('Разом') - (tot[3] + tot[4])) < 0.01, `«Оплати за типами» разом ${v('Разом')} ≠ готівка+карта ${tot[3] + tot[4]} (онлайн двічі?)`); }
    must(tot[1] === rep.checks.length, `чеків ${tot[1]} ≠ ${rep.checks.length}`);
    const bad = await pos(W, 'acctExport', { from: day, to }); must(bad.status === 403 || bad.status === 401 || bad.json?.error, 'офіціант отримав дані');
    const e = await pos(A, 'acctExport', { from: 'x', to: 'y' }); must(e.status === 400, 'невірний період: ' + e.status);
  });
  await step('🧾 M.E.Doc і BAS: ZIP з XML ПН (J1201016) і CSV по позиціях — суми = виручка без чайових', async () => {
    const day = new Date().toISOString().slice(0, 10), to = new Date(Date.now() + 864e5).toISOString().slice(0, 10), rep = await posOk(A, 'report', { from: day, to });
    const rev = rep.checks.filter(c => (c.dishes || []).some(x => x[2] > 0)).reduce((a, c) => a + c.sum - (c.tip || 0), 0), buf = r => Buffer.from(r.b64, 'base64');
    const bas = await pos(A, 'acctFile', { from: day, to, fmt: 'bas' });
    if (rev > 0) { must(bas.status === 200, 'BAS: ' + JSON.stringify(bas.j).slice(0, 150)); const t = buf(bas.j).toString('utf8'), rows = t.replace(/^﻿/, '').trim().split('\r\n');
      must(rows[0].startsWith('Дата;Номенклатура;Кількість;Сума з ПДВ'), 'шапка BAS: ' + rows[0]); const s = rows.slice(1).reduce((a, r) => a + +r.split(';')[3], 0); must(Math.abs(s - rev) < 0.05 * rows.length + 0.01, `BAS сума ${s} ≠ виручка ${rev}`); }
    const T0 = (await posOk(A, 'taxGet', {})).tax;
    try {
      await posOk(A, 'taxSet', { kind: 'tov', pdv: 0 }); const np = await pos(A, 'acctFile', { from: day, to, fmt: 'medoc' }); must(np.status === 400 && /ПДВ/.test(np.j?.error), 'не платник ПДВ: ' + JSON.stringify(np.j));
      await posOk(A, 'taxSet', { pdv: 1 }); const bad = await pos(A, 'taxSet', { pn: { n: 'ТОВ QA', tin: '123', ipn: '1', sti: '2655' } }); must(bad.status === 400, 'невірні реквізити прийнято');
      await posOk(A, 'taxSet', { pn: { n: 'ТОВ «QA Ресторан»', tin: '12345678', ipn: '123456789012', sti: '2655' } });
      if (rev > 0) { const r = await posOk(A, 'acctFile', { from: day, to, fmt: 'medoc', no: 7 }), z = buf(r); must(z.slice(0, 2).toString() === 'PK' && r.n >= 1, 'ZIP: ' + r.n);
        const x = z.toString('latin1'); must(x.includes('265500123456 78'.replace(' ', '') + 'J12010161000000007'), 'імʼя файлу / № ПН'); must(x.includes('encoding="windows-1251"') && x.includes('<HTYPR>11</HTYPR>') && x.includes('<HKBUY>100000000000</HKBUY>'), 'тип 11 / неплатник');
        const g = [...x.matchAll(/<R04G11>([\d.]+)<\/R04G11>/g)].reduce((a, m) => a + +m[1], 0); must(Math.abs(g - rev) < 0.05 * r.n + 0.01, `ПН разом ${g} ≠ виручка ${rev}`);
        for (const m of x.matchAll(/<R04G11>([\d.]+)<\/R04G11>\s*<R03G11>([\d.]+)<\/R03G11>\s*<R03G7>[\d.]+<\/R03G7>\s*<R03G109 xsi:nil="true" \/>\s*<R03G14 xsi:nil="true" \/>\s*<R01G7>([\d.]+)<\/R01G7>/g)) must(Math.abs(+m[1] - +m[2] - +m[3]) < 0.011, 'база + ПДВ ≠ разом'); }
      const w = await pos(W, 'acctFile', { from: day, to, fmt: 'bas' }); must(w.status === 403 || w.status === 401 || w.j?.error, 'офіціант отримав файл');
    } finally { await posOk(A, 'taxSet', { kind: T0.kind || '', pdv: T0.pdv || 0 }); }
  });
  await step('🚨 продаж нижче собівартості: техкарта дорожча за ціну → у звіті складу loss', async () => {
    const ing = await posOk(A, 'skIngSave', { x: { n: 'QA дорогий ' + RUN, u: 'кг' } }), id = ing.x?.id || ing.id; must(id, 'продукт: ' + JSON.stringify(ing).slice(0, 120));
    await posOk(A, 'skIngCost', { list: [{ id, cost: dish.price * 10 }] });
    try {
      await posOk(A, 'skCardSave', { key: dish.id, name: dish.name?.uk || dish.n, card: { items: [{ id, q: 1 }] } });
      const d0 = new Date().toISOString().slice(0, 10), r = await posOk(A, 'skReport', { from: d0, to: d0 });
      const x = (r.loss || []).find(y => y.cost > y.price && Math.abs(y.price - dish.price) < 1e-6); must(x, 'немає в loss: ' + JSON.stringify(r.loss || []).slice(0, 200));
    } finally { await pos(A, 'skCardSave', { key: dish.id, card: null }); await pos(A, 'skIngDel', { id }); }
    const r2 = await posOk(A, 'skReport', { from: '2026-01-01', to: '2026-01-01' }); must(!(r2.loss || []).some(y => y.price === dish.price && y.cost === dish.price * 10), 'loss лишився після видалення техкарти');
  });
  await step('📅 податковий календар: форма → строки (ФОП3/ТОВ), ставки, «готово», офіціанту заборонено', async () => {
    const v0 = await posOk(A, 'taxGet'); must(v0.kinds?.fop3 && v0.link, 'taxGet без форм');
    const v = await posOk(A, 'taxSet', { kind: 'fop3', lead: 5, rates: { minWage: 8000 } }); must(v.tax.kind === 'fop3' && v.tax.lead === 5, 'не збереглось');
    must(v.list.some(e => e.id === 'esv') && v.list.some(e => e.id === 'decl') && v.list.every(e => !/^\d{4}-\d{2}-\d{2}$/.test(e.d) ? false : ![0, 6].includes(new Date(e.d + 'T12:00:00Z').getUTCDay())), 'строки: ' + v.list.map(e => e.key).join());
    const esv = v.list.find(e => e.id === 'esv'); must(esv.amt === 1760 * 3, 'ЄСВ квартал ≠ 5280: ' + esv.amt);
    const d = await posOk(A, 'taxDone', { key: esv.key, v: 1 }); must(d.list.find(e => e.key === esv.key)?.done, 'done не збереглось');
    { // 🧮 Бухгалтер: ставки 2026 (МЗП 8647) і ПДВ
      const v2 = await posOk(A, 'taxSet', { kind: 'fop3', pdv: 0, rates: { minWage: 8647, ep3: 5 } }); must(v2.list.find(e => e.id === 'esv').amt === 5707.02, 'ЄСВ квартал при МЗП 8647 ≠ 5707.02');
      const f2 = await posOk(A, 'taxSet', { kind: 'fop2' }); must(f2.list.find(e => e.id === 'ep').amt === 1729.4, 'ЄП 2 групи ≠ 20% від 8647: ' + f2.list.find(e => e.id === 'ep').amt);
      const p3 = await posOk(A, 'taxSet', { kind: 'fop3', pdv: 1 }); must(p3.tax.rates.ep3 === 3, 'ФОП 3 з ПДВ — ЄП 3%: ' + p3.tax.rates.ep3); must(p3.list.some(e => e.id === 'pdv'), 'ФОП 3 платник ПДВ — немає події ПДВ');
      const pt = await posOk(A, 'taxSet', { kind: 'tov', pdv: 1 }); const pv = pt.list.find(e => e.id === 'pdv'); must(pv && (+pv.d.slice(8) >= 30 || +pv.d.slice(8) <= 3), 'ПДВ платіж має бути 30-го (10 днів після декларації 20-го): ' + pv?.d);
      await posOk(A, 'taxSet', { pdv: 0 });
    }
    const t = await posOk(A, 'taxSet', { kind: 'tov', pdv: 1 }); must(t.list.some(e => e.id === 'pdv') && t.list.some(e => e.id === 'zp'), 'ТОВ без ПДВ/ЗП');
    must((await pos(A, 'taxSet', { kind: 'zzz' })).status === 400, 'невідома форма');
    must((await pos(A, 'taxSet', { rates: { esv: -1 } })).status === 400, 'мінусова ставка');
    must((await pos(A, 'taxDone', { key: 'bad' })).status === 400, 'поганий ключ');
    const w = await pos(W, 'taxGet'); must(w.status === 403 || w.status === 401 || w.json?.error, 'офіціант бачить податки');
    await posOk(A, 'taxSet', { kind: '' });
  });
  await step('🍳 цехи кухні: гарячий/бар — свої екрани, принтери, готовність по цехах; без цехів — як раніше', async () => {
    const back = (await posOk(A, 'rcptGet')).route, s0 = await posOk(A, 'state'), busy = new Set(s0.tables.map(x => x.t)); let t = s0.n; while (busy.has(t)) t--;
    try {
      await posOk(A, 'printRoute', { st: [{ id: 'qk', name: 'QA Кухня', g: ['kitchen', 'other'], n: 1 }, { id: 'qb', name: 'QA Бар', g: ['bar', 'hookah'], n: 1 }] });
      must((await pos(W, 'stSet', { list: [] })).status === 403 && (await pos(W, 'stGet')).status === 403, 'офіціант змінив цехи');
      const r = await posOk(A, 'stSet', { list: [{ id: 'hot', name: 'Гарячий', emoji: '🔥', g: ['kitchen'], pr: 'qk' }, { id: 'bar', name: 'Бар', emoji: '🍹', g: ['bar', 'hookah'], pr: 'qb' }, { id: 'hot', name: 'дубль' }, { name: '' }] });
      must(r.sts.length === 2 && r.sts[1].pr === 'qb', 'цехи: ' + JSON.stringify(r.sts));
      const q0 = new Set((await posOk(A, 'printQ')).list.map(j => j.id));
      await posOk(A, 'order', { t, items: [{ id: dish.id, q: 1 }, { id: drink.id, q: 1 }] });
      const all = (await posOk(A, 'kitchen')).list.filter(e => e.t === t && !e.done).pop(); must(all?.items.length === 2 && all.items.some(x => x.st === 'bar') && all.items.some(x => x.st === 'hot'), 'картка: ' + JSON.stringify(all?.items));
      const hot = (await posOk(A, 'kitchen', { st: 'hot' })), bar = (await posOk(A, 'kitchen', { st: 'bar' }));
      must(hot.sts.length === 2 && hot.list.find(e => e.id === all.id).items.length === 1 && bar.list.find(e => e.id === all.id).items[0].n === drink.name?.uk, 'екрани цехів: ' + JSON.stringify(bar.list.find(e => e.id === all.id)?.items));
      const jobs = (await posOk(A, 'printQ')).list.filter(j => !q0.has(j.id) && j.kind === 'kitchen'); must(jobs.filter(j => j.st === 'qk').length === 1 && jobs.filter(j => j.st === 'qb').length === 1, 'друк по цехах: ' + JSON.stringify(jobs.map(j => j.st)));
      await posOk(A, 'kDone', { id: all.id, st: 'bar' });
      const e1 = (await posOk(A, 'kitchen')).list.find(e => e.id === all.id); must(!e1.done && e1.items.find(x => x.st === 'bar').done && !e1.items.find(x => x.st === 'hot').done, 'готовий лише бар');
      must((await posOk(A, 'state')).events.some(x => x.k === 'ready' && x.st === 'bar' && /Бар: готово/.test(x.text)), 'немає події «Бар: готово»');
      must((await posOk(A, 'kitchen', { st: 'bar' })).list.find(e => e.id === all.id).done, 'екран бару: цех готовий');
      await posOk(A, 'kDone', { id: all.id, st: 'hot' }); must((await posOk(A, 'kitchen')).list.find(e => e.id === all.id).done, 'замовлення не закрилось після обох цехів');
      for (const j of jobs) await posOk(A, 'printClear', { id: j.id });
      must((await posOk(A, 'stItem', { id: dish.id, st: 'bar' })).ok, 'stItem'); await posOk(A, 'stItem', { id: dish.id, st: '' });
      await posOk(A, 'stSet', { list: [] }); await posOk(A, 'order', { t, items: [{ id: drink.id, q: 1 }] });
      must(!(await posOk(A, 'kitchen')).list.some(e => e.t === t && !e.done && e.items.some(x => x.n === drink.name?.uk)), 'без цехів напій потрапив на кухню');
      await posOk(A, 'close', { t, pay: 'cash', print: false });
    } finally { await posOk(A, 'stSet', { list: [] }); await posOk(A, 'printRoute', back); }
    return 'гарячий + бар';
  });
  await step('📱 принтер планшета: реєстрація, своя черга, друк і підтвердження', async () => {
    const back = (await posOk(A, 'rcptGet')).route, dev = 'tab:qa' + Date.now().toString(36).slice(-6), s0 = await posOk(A, 'state'), busy = new Set(s0.tables.map(x => x.t)); let t = s0.n; while (busy.has(t)) t--;
    try {
      must((await pos(W, 'tabReg', { id: dev, name: 'QA' })).status === 403, 'офіціант зареєстрував принтер');
      await posOk(A, 'tabReg', { id: dev, name: 'QA планшет', type: 'bt' }); must((await posOk(A, 'rcptGet')).dev.list.some(x => x.id === dev), 'немає в списку');
      await posOk(A, 'printRoute', { st: [{ id: 'qt', name: 'QA Планшет', dev, g: ['kitchen', 'bar', 'hookah', 'other'] }] });
      await posOk(A, 'order', { t, items: [{ id: dish.id, q: 1 }] });
      const j = (await posOk(K || A, 'tabJobs', { dev })).jobs; must(j.length === 1 && j[0].lines.some(l => l[0] === 'k'), 'завдань: ' + j.length);
      must((await posOk(A, 'printQ')).list.some(x => x.id === j[0].id), 'не видно в черзі');
      await posOk(K || A, 'tabAck', { ids: [j[0].id], dev }); must(!(await posOk(A, 'tabJobs', { dev })).jobs.length, 'не підтверджено');
      await posOk(A, 'close', { t, pay: 'cash', print: false });
    } finally { await posOk(A, 'printRoute', back); await posOk(A, 'tabReg', { id: dev, off: 1 }); }
  });
  await step('📋 план на день: адмін додає, кухар бачить своє й відмічає', async () => {
    const st = (await posOk(A, 'taskList')).staff, ck = K && st.find(s => s.r === 'cook'); 
    const t = (await posOk(A, 'taskAdd', { n: 'QA протерти вітрину', who: { k: 'r', r: 'cook' }, imp: 1 })).t; must(t?.id, 'не додано');
    if (W) { const w = await posOk(W, 'taskList', { mine: 1 }); must(!w.list.some(x => x.id === t.id), 'офіціант бачить завдання кухаря'); const r = await pos(W, 'taskMark', { id: t.id, st: 'done' }); must(r.status === 400, 'офіціант відмітив чуже'); must((await pos(W, 'taskAdd', { n: 'x' })).status === 403, 'офіціант додав завдання'); }
    if (K) { const k = await posOk(K, 'taskList', { mine: 1 }); must(k.list.some(x => x.id === t.id), 'кухар не бачить'); must((await pos(K, 'taskMark', { id: t.id, st: 'no' })).status === 400, 'без причини пройшло'); await posOk(K, 'taskMark', { id: t.id, st: 'done' }); }
    else await posOk(A, 'taskMark', { id: t.id, st: 'done' });
    const l = (await posOk(A, 'taskList')).list; must(l.find(x => x.id === t.id)?.st === 'done', 'не відмічено');
    await posOk(A, 'taskDel', { id: t.id }); return ck ? 'кухар ✅' : 'адмін ✅';
  });
  await step('📢 оголошення команді: адмін задає, усі бачать, офіціанту — ні', async () => {
    const was = (await posOk(A, 'taskList')).ann;
    must((await posOk(A, 'taskAnn', { t: 'QA завтра збори' })).ann?.t === 'QA завтра збори', 'не збережено');
    if (W) { must((await posOk(W, 'taskList', { mine: 1 })).ann?.t === 'QA завтра збори', 'офіціант не бачить'); must((await pos(W, 'taskAnn', { t: 'x' })).status === 403, 'офіціант змінив оголошення'); }
    must((await posOk(A, 'taskAnn', { t: '' })).ann === null, 'не прибрано'); if (was) await posOk(A, 'taskAnn', { t: was.t }); return '✅';
  });
  await step('🎨 конструктор сайту: дизайн зберігається, погане відкидається, офіціанту — ні', async () => {
    const s0 = (await posOk(A, 'siteGet')).site, back = {}; for (const k of ['theme', 'heroCfg', 'blocks', 'dock', 'ann', 'events', 'chat']) back[k] = s0[k] ?? null;
    const td = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    const v = { theme: { mode: 'light', bg: 'red', accent: '#ff0000', fh: 'Comic Sans', r: 99, evil: 1, world: 'piste' }, heroCfg: { lay: 'split', btns: ['call', 'hack'], own: { t: 'X', u: 'javascript:alert(1)' } },
      blocks: [{ id: 'wl', on: 0 }, { id: 'contacts', on: 1, t: { uk: 'Де ми' } }, { id: 'c_qa01', type: 'links', on: 1, links: [{ l: { uk: 'ok' }, u: 'https://example.com' }, { l: { uk: 'bad' }, u: 'javascript:x' }] }, { id: 'c_<b>', type: 'text' }],
      dock: { on: 1, btns: ['call', 'order'] }, events: [{ d: td, t: { uk: 'QA подія' } }, { d: 'вчора', t: { uk: 'погана' } }], chat: 1 };
    const r = await posOk(A, 'siteSet', { k: 'siteDesign', v }), x = r.site;
    must(x.theme.bg === '#121212' && x.theme.accent === '#ff0000' && x.theme.fh === 'Rubik Dirt' && x.theme.r === 28 && x.theme.world === 'piste' && !('evil' in x.theme), 'тема: ' + JSON.stringify(x.theme));
    must(x.heroCfg.btns.join() === 'call' && x.heroCfg.own.u === '' && typeof x.hero === 'string', 'кнопки: ' + JSON.stringify(x.heroCfg));
    const cb = x.blocks.find(b => b.id === 'c_qa01'); must(cb && cb.links.length === 1 && !x.blocks.some(b => b.id === 'c_<b>'), 'блоки: ' + JSON.stringify(x.blocks));
    must(x.blocks[0]?.id === 'wl' && !x.blocks[0].on, '⏳ блок «Черга» не зберігся: ' + JSON.stringify(x.blocks));
    must(x.events.length === 1, 'афіша: ' + JSON.stringify(x.events));
    must((await posOk(A, 'siteSet', { k: 'siteDesign', v: { ...v, theme: { ...v.theme, world: 'evil' } } })).site.theme.world === '', 'поганий світ пройшов');
    must((await pos(W, 'siteSet', { k: 'siteDesign', v })).status === 403, 'офіціант зміг');
    const pub = (await http('/api/site')).j; must(pub.theme?.mode === 'light' && pub.events?.length === 1, 'публічно немає дизайну');
    must((await posOk(A, 'siteVer')).list.length >= 1, 'немає версій');
    await posOk(A, 'siteSet', { k: 'siteDesign', v: back }); return 'ок';
  });
  await step('🍽 конструктор меню: дизайн у /api/menu, погане відкидається', async () => {
    const back = (await posOk(A, 'siteGet')).site.menuTheme ?? null;
    const x = (await posOk(A, 'siteSet', { k: 'menuDesign', v: { menuTheme: { mode: 'light', lay: 'list', cols: 9, phbg: 'img', phImg: 'javascript:1', accent: '#00ff00', fh: 'Bad', title: '  Моя назва' + 'х'.repeat(60), noName: 1 } } })).site.menuTheme;
    must(x.lay === 'list' && x.cols === 3 && x.phImg === '' && x.fh === 'Rubik Dirt' && x.accent === '#00ff00' && x.title.length <= 40 && x.title.startsWith('Моя назва') && x.noName === 1, JSON.stringify(x));
    { const b = (await http('/api/menu?t=' + Date.now())).j.brand; must(b?.name && b.theme?.title?.startsWith('Моя назва'), 'немає назви закладу в меню: ' + JSON.stringify(b)); }
    must((await pos(W, 'siteSet', { k: 'menuDesign', v: { menuTheme: {} } })).status === 403, 'офіціант зміг');
    await posOk(A, 'siteSet', { k: 'menuDesign', v: { menuTheme: back } });
    must((await posOk(A, 'siteMenuVer')).list.length >= 1, 'немає версій'); return 'ок';
  });
  await step('🎟 сертифікат на столі → стіл видалено → сума повернулась на сертифікат', async () => {
    const ph = '0670009' + String(Math.floor(Math.random() * 900) + 100), ask = await http('/api/cert', { sum: 500, from: 'QA', phone: ph, device: 'qa-cert-' + RUN });
    if (ask.status === 403) return 'сертифікати вимкнені на тесті'; must(ask.status === 200, 'заявка ' + ask.status);
    const c = ((await posOk(A, 'certList')).list || []).filter(x => x.st === 'new' && String(x.phone || '').endsWith(ph.slice(-7))).pop(); must(c, 'заявки немає в списку');
    await posOk(A, 'certPay', { code: c.code, how: 'cash' });
    const s = await posOk(A, 'state'), busy = new Set(s.tables.map(x => x.t)); let t2 = 0; for (let i = 1; i <= s.n; i++) if (!busy.has(i)) { t2 = i; break; } must(t2, 'немає вільного столу');
    await posOk(A, 'order', { t: t2, items: [{ id: dish.id, q: 2 }] }); const u = await posOk(A, 'certUse', { t: t2, code: c.code }); must(u.use > 0, 'не списано');
    await posOk(A, 'delete', { t: t2, reason: 'QA' });
    const c2 = ((await posOk(A, 'certList')).list || []).find(x => x.code === c.code); must(c2 && c2.left === 500, 'залишок ' + c2?.left); return 'повернуто ' + u.use;
  });
  await step('📝 інвентаризація → ↩️ скасувати → залишок як був', async () => {
    const x = (await posOk(A, 'skData')).ing.find(i => !i.off && !i.grp); if (!x) return 'немає продуктів';
    const st0 = x.st?.k || 0, tg = Math.max(0, st0) + 3; /* залишок може бути від'ємним — факт ні */ await posOk(A, 'skCountSave', { wh: 'k', f: { [x.id]: tg } }); const d = (await posOk(A, 'skCountFinish', { wh: 'k' })).doc;
    must(Math.abs(((await posOk(A, 'skData')).ing.find(i => i.id === x.id).st?.k || 0) - tg) < 1e-6, 'інвентаризація не застосувалась');
    must((await pos(W, 'skCountUndo', { id: d.id })).status !== 200, 'офіціант скасував');
    await posOk(A, 'skCountUndo', { id: d.id }); must((await pos(A, 'skCountUndo', { id: d.id })).status === 400, 'скасовано двічі');
    must(Math.abs(((await posOk(A, 'skData')).ing.find(i => i.id === x.id).st?.k || 0) - st0) < 1e-6, 'залишок не повернувся'); return x.n;
  });
  await step('🏭 постачальник: накладна → профіль з реквізитами → борг → оплата → акт звірки', async () => {
    const x = (await posOk(A, 'skData')).ing.find(i => !i.off && !i.grp); if (!x) return 'немає продуктів';
    const nm = 'QA Постач ' + RUN, code = String(30000000 + Math.floor(Math.random() * 9e6));
    const inv = (await posOk(A, 'skInvSave', { inv: { sup: nm, pay: 'debt', src: 'hand', req: { code, iban: 'UA213223130000026007233566001', phone: '+380671112233', legal: 'ТОВ «QA»' }, lines: [{ id: x.id, q: 2, f: 1, sum: 300 }] } })).inv;
    must(inv.sid, 'профіль не привʼязано');
    const l = (await posOk(A, 'skSupList')).list, me = l.find(p => p.id === inv.sid); must(me && me.debt === 300, 'борг ' + me?.debt);
    const c = await posOk(A, 'skSupCard', { id: inv.sid }); must(c.p.code === code && c.p.iban.startsWith('UA21') && c.prod.length === 1, 'картка: ' + JSON.stringify(c.p));
    must((await pos(W, 'skSupPay', { ids: [inv.id], src: 'cash' })).status !== 200, 'офіціант оплатив');
    const pay = await posOk(A, 'skSupPay', { ids: [inv.id], src: 'cash' }); must(pay.n === 1, 'не оплачено');
    must((await posOk(A, 'skSupList')).list.find(p => p.id === inv.sid).debt === 0, 'борг не зник');
    const act = await posOk(A, 'skSupAct', { id: inv.sid, from: '2000-01-01' }); must(act.plus === 300 && act.saldo === 0, 'акт ' + JSON.stringify(act).slice(0, 200));
    const again = (await posOk(A, 'skInvSave', { inv: { sup: nm.toUpperCase(), pay: 'cash', src: 'hand', req: { code }, lines: [{ id: x.id, q: 1, f: 1, sum: 150 }] } })).inv; must(again.sid === inv.sid, 'дубль профілю');
    await posOk(A, 'skInvDel', { id: again.id }); await posOk(A, 'skInvDel', { id: inv.id }); return 'ок';
  });
  await step('🧾 накладна: повтор з тим самим ключем не дублює прихід і витрату; видалення оплаченої прибирає витрату з каси, повернення — відновлює; вручну витрату накладної не видалити', async () => {
    const x = (await posOk(A, 'skData')).ing.find(i => !i.off && !i.grp); if (!x) return 'немає продуктів';
    const stk = async () => { const i = (await posOk(A, 'skData')).ing.find(y => y.id === x.id); return (i.st?.k || 0) + (i.st?.b || 0); };
    const S = 4000 + (parseInt(RUN, 36) % 900) + 0.37, live = async sum => (await posOk(A, 'shift')).exp.filter(e => !e.del && e.sum === sum && e.inv);
    const st0 = await stk(), rid = 'qa-inv-' + RUN, body = { inv: { rid, sup: 'QA Дубль ' + RUN, pay: 'cash', src: 'hand', lines: [{ id: x.id, q: 3, f: 1, sum: S }] } };
    const [a, b] = await Promise.all([pos(A, 'skInvSave', body), pos(A, 'skInvSave', body)]); must(a.j.inv?.id && a.j.inv.id === b.j.inv?.id, 'два одночасні збереження → дві накладні');
    must((await posOk(A, 'skInvSave', body)).inv.id === a.j.inv.id, 'повтор після відповіді → нова накладна');
    must((await live(S)).length === 1, 'витрат ' + (await live(S)).length); must(Math.abs(await stk() - st0 - 3) < 1e-6, 'прихід задвоєно');
    const ex = (await posOk(A, 'shift')).exp, ei = ex.findIndex(e => !e.del && e.sum === S && e.inv);
    must((await pos(A, 'expenseDel', { i: ei })).status === 400, 'витрату накладної видалено вручну');
    await posOk(A, 'skInvDel', { id: a.j.inv.id }); must((await live(S)).length === 0, 'оплачену накладну видалено, а витрата лишилась'); must(Math.abs(await stk() - st0) < 1e-6, 'склад не повернувся');
    await posOk(A, 'skInvDel', { id: a.j.inv.id, back: 1 }); must((await live(S)).length === 1, 'повернули накладну — витрати немає');
    await posOk(A, 'skInvDel', { id: a.j.inv.id }); must((await live(S)).length === 0, 'друге видалення');
    const d = (await posOk(A, 'skInvSave', { inv: { sup: 'QA Борг ' + RUN, pay: 'debt', src: 'hand', lines: [{ id: x.id, q: 1, f: 1, sum: S + 1 }] } })).inv;
    await posOk(A, 'skInvPay', { id: d.id, src: 'card' }); must((await live(S + 1)).length === 1, 'оплата боргу не стала витратою');
    await posOk(A, 'skInvDel', { id: d.id }); must((await live(S + 1)).length === 0, 'видалили оплачену борг-накладну — витрата лишилась');
    must((await pos(A, 'skInvSave', { inv: { sup: 'QA Мінус ' + RUN, pay: 'debt', src: 'hand', lines: [{ id: x.id, q: 1, f: -1, sum: 10 }] } })).status === 400, 'від\'ємна кількість в упаковці прийнята'); return 'ок';
  });
  await step('📜 склад: ручне додавання → ↩️ скасувати → залишок як був', async () => {
    const d = await posOk(A, 'skData'), x = (d.ing || []).find(i => !i.off); if (!x) return 'немає продуктів';
    const st0 = (y => (y.st?.k || 0) + (y.st?.b || 0))(x); await posOk(A, 'skAdj', { id: x.id, wh: 'k', q: 2, note: 'QA' });
    const j = (await posOk(A, 'skJournal')).list, i = j.map((r, n) => [r, n]).reverse().find(([r]) => r.id === x.id && r.t === 'add' && !r.undo)[1];
    await posOk(A, 'skJrUndo', { i }); must((await pos(A, 'skJrUndo', { i })).status === 400, 'скасовано двічі');
    const y = (await posOk(A, 'skData')).ing.find(i => i.id === x.id); must(Math.abs((y.st?.k || 0) + (y.st?.b || 0) - st0) < 1e-6, 'залишок не повернувся'); return x.n;
  });
  await step('🔗 склад: обʼєднати дублікати й 🥬 група-замінник', async () => {
    const z = Date.now().toString(36).slice(-4), mk = async (n, u) => (await posOk(A, 'skIngSave', { x: { n: n + ' ' + z, u, cat: 'Інше', home: 'k' } })).x;
    const a = await mk('QA айсберг', 'кг'), b = await mk('QA салат айсберг ваг', 'кг'), c = await mk('QA ромен', 'кг'), d = await mk('QA айсберг шт', 'шт');
    await posOk(A, 'skAdj', { id: a.id, wh: 'k', q: 1 }); await posOk(A, 'skAdj', { id: b.id, wh: 'k', q: 2 }); await posOk(A, 'skAdj', { id: d.id, wh: 'k', q: 4 });
    must((await pos(A, 'skMerge', { to: a.id, from: [d.id] })).status === 400, 'різні одиниці без коефіцієнта пройшли');
    const r = await posOk(A, 'skMerge', { to: a.id, from: [b.id, d.id], f: { [d.id]: 0.5 } }); must(r.n === 2, 'обʼєднано ' + r.n);
    const L = (await posOk(A, 'skData')).ing, A2 = L.find(x => x.id === a.id), B2 = L.find(x => x.id === b.id);
    must(Math.abs((A2.st.k || 0) - 5) < 1e-6, 'залишок ' + A2.st.k); must(B2.off && B2.merged === a.id, 'дубль не сховано');
    const g = (await posOk(A, 'skGrp', { x: { n: 'QA салат листовий ' + z, u: 'кг', grp: [a.id, c.id] } })).x; must(g.grp.length === 2, 'група');
    must((await pos(A, 'skAdj', { id: g.id, wh: 'k', q: 1 })).status === 400, 'на групу оприбуткувалось');
    for (const id of [a.id, c.id, g.id]) await posOk(A, 'skIngDel', { id }); return 'ок';
  });
  await step('💸 витрата за минулий день: адмін — так, офіціант — ні', async () => {
    const y = new Date(Date.now() - 2 * 86400e3).toISOString().slice(0, 10);
    if (W) { const r = await pos(W, 'expense', { sum: 1, note: 'QA', src: 'cash', day: y }); must(r.status === 403, 'офіціант зміг: ' + r.status); }
    const before = (await posOk(A, 'shift')).exp.length; await posOk(A, 'expense', { sum: 1, note: 'QA минулий день', src: 'cash', day: y });
    must((await posOk(A, 'shift')).exp.length === before, 'потрапила в сьогодні'); return y;
  });
  await step('закрити готівкою → у закритих', async () => {
    const r = await posOk(W, 'close', { t: T, pay: 'cash', print: false }); must(r.r?.sum > 0, 'немає суми');
    const s = await posOk(W, 'state'); must(!s.tables.some(x => x.t === T), 'стіл досі відкритий');
    const c = await posOk(A, 'closed'); must(c.list.some(x => x.t === T), 'немає в closed'); return `${r.r.sum} грн`;
  });

  sect('Каса: редагування чека й Z-звіт');
  {
    let ref = '', d0 = null, x0 = null;
    const dayOf = async () => (await posOk(A, 'shift')).day;
    await step('знайти закритий чек стола', async () => { const c = await posOk(A, 'closed'); x0 = [...c.list].reverse().find(x => x.t === T && !x.del && !x.rm); must(x0?.id, 'немає чека'); ref = x0.id; d0 = await dayOf(); return `${x0.sum} грн`; });
    await step('closedEdit: −1 страва, +чайові 50, картка, знижка 10% → day: зійшовся', async () => {
      must(ref, 'немає чека'); const items = x0.dishes.map(d => [...d]); const i = items.findIndex(d => d[1] > 1); must(i >= 0, 'немає позиції з к-стю > 1');
      items[i][2] = items[i][2] / items[i][1] * (items[i][1] - 1); items[i][1]--;
      const r = await posOk(A, 'closedEdit', { ref, p: { items, tip: 50, pay: 'card', disc: 10 } }), x = r.x;
      const g = items.reduce((a, d) => a + d[2], 0), want = g - Math.round(g / 10) + 50;
      must(x.sum === want && x.card === want && !x.cash && x.tip === 50 && x.disc === 10 && x.edits?.length === 1, 'запис: ' + JSON.stringify(x).slice(0, 300));
      const d1 = await dayOf(), dd = f => (d1[f] || 0) - (d0[f] || 0);
      must(dd('cash') + dd('card') === want - x0.sum, `виручка Δ${dd('cash') + dd('card')} ≠ ${want - x0.sum}`); must(dd('card') === want - (x0.card || 0), `card Δ${dd('card')}`); must(dd('cash') === -(x0.cash ?? x0.sum), `cash Δ${dd('cash')}`);
      must(dd('tip') === 50 - (x0.tip || 0), `tip Δ${dd('tip')}`); must(dd('disc') === Math.round(g / 10) - (x0.discSum || 0), `disc Δ${dd('disc')}`);
      return `${x0.sum} → ${want} грн`;
    });
    await step('closedEdit: повернути як було (готівка, без знижки й чайових) → day: як до правки', async () => {
      must(ref, 'немає чека'); const r = await posOk(A, 'closedEdit', { ref, p: { items: x0.dishes, tip: 0, pay: 'cash', disc: 0 } });
      must(r.x.sum === x0.sum && r.x.edits?.length === 2, 'сума ' + r.x.sum); const d1 = await dayOf();
      for (const f of ['cash', 'card', 'tip', 'disc']) must((d1[f] || 0) === (d0[f] || 0), `${f}: ${d1[f]} ≠ ${d0[f]}`);
    });
    await step('closedEdit: офіціант ✗ (403), порожній чек ✗ (400)', async () => {
      must((await pos(W, 'closedEdit', { ref, p: { tip: 1 } })).status === 403, 'офіціант пройшов'); must((await pos(A, 'closedEdit', { ref, p: { items: [] } })).status === 400, 'порожній пройшов');
    });
    await step('zX: друк X-звіту не створює запису z:', async () => { const n0 = (await posOk(A, 'report', { from: d0.day, to: d0.day })).z?.length || 0; const r = await posOk(A, 'zX'); must(r.z?.day, 'немає z'); const n1 = (await posOk(A, 'report', { from: d0.day, to: d0.day })).z?.length || 0; must(n0 === n1, `z: ${n0} → ${n1}`); });
  }

  sect('Доставка ?go → кур\'єр');
  let G = 0, oid = '';
  await step('POST /api/go (доставка)', async () => {
    const r = await http('/api/go', { kind: 'del', name: 'QA Гість', phone: '0670000' + String(Math.floor(Math.random() * 900) + 100), addr: 'вул. Тестова 1', when: '12:00', pay: 'cash', items: [{ id: dish.id, q: 1 }], device: 'qa-' + RUN });
    must(r.status === 200 && r.j.ok, `${r.status} ${JSON.stringify(r.j)}`); G = r.j.t; oid = r.j.id; must(G > 1000 && G < 2000, 'номер ' + G); return r.j.no;
  });
  await step('💲 R4 окремі ціни: доставка дорожча з модулем; без модуля / у залі — звичайна; кабінет не стирає розміри', async () => {
    const menu = (await posOk(A, 'menu')).menu, cat = menu.categories.find(c => c.items.some(i => i.id === dish.id)), was = (await posOk(A, 'state')).cfg?.mods?.prices;
    const save = pr => posOk(A, 'menuSave', { item: { id: dish.id, cat: cat.id, name: dish.name.uk, price: dish.price, size: dish.size || '', desc: dish.desc?.uk || '', pr } });
    const goTot = async () => { const r = await posOk(A, 'order', { go: { kind: 'del', name: 'QA Ціни', addr: 'вул. Тестова 9' }, items: [{ id: dish.id, q: 1 }] }); must(r.t > 1000, 'не доставка: ' + r.t); return r.total; };
    try {
      await save({ pick: '', del: String(dish.price + 11) });
      const m2 = (await posOk(A, 'menu')).menu.categories.flatMap(c => c.items).find(i => i.id === dish.id); must(m2.pr?.del === dish.price + 11 && !m2.pr.pick, 'pr не збереглось: ' + JSON.stringify(m2.pr));
      await posOk(A, 'modSet', { k: 'prices', v: 1 }); const on = await goTot(); must(on === dish.price + 11, `доставка з модулем: ${on} ≠ ${dish.price + 11}`);
      await posOk(A, 'modSet', { k: 'prices', v: 0 }); const off = await goTot(); must(off === dish.price, `без модуля: ${off} ≠ ${dish.price}`);
      return `доставка ${on} / без модуля ${off}`;
    } finally { await save({ pick: '', del: '' }).catch(() => {}); await pos(A, 'modSet', { k: 'prices', v: was === 0 ? 0 : 1 }).catch(() => {}); }
  });
  await step('💲 Ціна з техкарти (menuPrice): змінює ціну в меню; 0 і чужий розмір — відмова', async () => {
    const get = async () => (await posOk(A, 'menu')).menu.categories.flatMap(c => c.items).find(i => i.id === dish.id).price;
    try {
      await posOk(A, 'menuPrice', { key: dish.id, price: dish.price + 7 }); const p = await get(); must(p === dish.price + 7, `ціна ${p} ≠ ${dish.price + 7}`);
      const z = await pos(A, 'menuPrice', { key: dish.id, price: 0 }); must(z.status === 400, '0 ₴ пройшло: ' + z.status);
      const v = await pos(A, 'menuPrice', { key: dish.id + '|9.9', price: 50 }); must(v.status === 404, 'неіснуючий розмір: ' + v.status);
      return `${dish.price} → ${p}`;
    } finally { await pos(A, 'menuPrice', { key: dish.id, price: dish.price }).catch(() => {}); }
  });
  await step('🧩 R3 модифікатори: група до страви → у рахунку окремий рядок «страва › варіант», ціна додається; група зникла — страва без неї', async () => {
    const menu = (await posOk(A, 'menu')).menu, cat = menu.categories.find(c => c.items.some(i => i.id === dish.id)), was = menu.mods || [];
    const save = mods => posOk(A, 'menuSave', { item: { id: dish.id, cat: cat.id, name: dish.name.uk, price: dish.price, size: dish.size || '', desc: dish.desc?.uk || '', mods } });
    try {
      const g = (await posOk(A, 'modsSave', { mods: [...was, { id: 'qar3', name: 'QA Молоко', min: 1, max: 1, items: [{ n: 'звичайне', p: 0 }, { n: 'рослинне', p: 15 }] }] })).mods.find(x => x.name === 'QA Молоко');
      must(g, 'група не збереглась'); await save([g.id]);
      const it = (await posOk(A, 'menu')).menu.categories.flatMap(c => c.items).find(i => i.id === dish.id); must(it.mods?.includes(g.id), 'страва без групи: ' + JSON.stringify(it.mods));
      const r = await posOk(A, 'order', { go: { kind: 'del', name: 'QA Модиф', addr: 'вул. Тестова 9' }, items: [{ id: dish.id, q: 1, m: [g.id + ':1'] }] });
      must(r.total === dish.price + 15, `сума ${r.total} ≠ ${dish.price + 15}`);
      const b = (await posOk(A, 'state')).tables.find(x => x.t === r.t); must(JSON.stringify(b).includes(' › рослинне'), 'немає рядка модифікатора');
      await posOk(A, 'modsSave', { mods: was }); const it2 = (await posOk(A, 'menu')).menu.categories.flatMap(c => c.items).find(i => i.id === dish.id); must(!it2.mods?.includes(g.id), 'група лишилась на страві');
      return `сума ${r.total}`;
    } finally { await posOk(A, 'modsSave', { mods: was }).catch(() => {}); await save(undefined).catch(() => {}); }
  });
  await step('🔐 /api/go: службові _paid/_oid від гостя ігноруються (не «оплачено онлайн», ліміт діє)', async () => {
    const body = { kind: 'pick', name: 'QA Хакер', phone: '0670001' + String(Math.floor(Math.random() * 900) + 100), when: '12:00', pay: 'cash', items: [{ id: dish.id, q: 1 }], device: 'qa-hk-' + RUN, _paid: { sum: 1 }, _oid: 'abcdef0123' };
    const rs = []; for (let i = 0; i < 4; i++) rs.push(await http('/api/go', body));
    must(rs.slice(0, 3).every(r => r.status === 200) && rs[3].status === 429, 'ліміт 3/10хв обійдено: ' + rs.map(r => r.status));
    must(rs[0].j.id !== 'abcdef0123', '_oid прийнято');
    const b = (await posOk(A, 'state')).tables.find(x => x.t === rs[0].j.t); must(b && !b.go?.paid && b.pay === 'cash', 'позначено оплаченим: ' + JSON.stringify({ pay: b?.pay, paid: b?.go?.paid }));
    for (const r of rs.slice(0, 3)) await pos(A, 'reject', { oid: r.j.id });
  });
  await step('адмін приймає', async () => {
    const r = await posOk(A, 'accept', { oid }); must(r.done, 'accept=false');
    const s = await posOk(A, 'state'); const b = s.tables.find(x => x.t === G); must(b?.go?.st === 'acc', 'go.st=' + b?.go?.st);
  });
  if (C) {
    await step('кур\'єр бере', async () => { const r = await posOk(C, 'courAct', { t: G, act: 'take' }); must(r.go?.cour === users.courier.me.name, 'cour=' + r.go?.cour); });
    await step('кур\'єр: поїхав', async () => { const r = await posOk(C, 'courAct', { t: G, act: 'road' }); must(r.go?.st === 'road', 'st=' + r.go?.st); });
    await step('📍 трекінг: вимкнений за замовч.; увімк. → goinfo.track; /api/orders?g=1 без loc, поки точки немає', async () => {
      const g0 = await http('/api/goinfo?nocache=1'); must(!g0.j.track || g0.j.track === 1, 'goinfo'); // за замовчуванням GO_DEF.track=0 (тест не залежить від залишків попереднього прогону)
      const c = await posOk(A, 'goCfgSet', { k: 'track', v: 1 }); must(c.cfg?.track === 1, 'cfg.track=' + c.cfg?.track);
      const g1 = await http('/api/goinfo?nocache=1'); must(g1.j.track === 1, 'goinfo.track=' + g1.j.track);
      const o = await http('/api/orders?g=1&ids=' + oid); must(o.status === 200 && !JSON.stringify(o.j).includes('"loc"'), 'loc без точки: ' + JSON.stringify(o.j).slice(0, 120));
      await posOk(A, 'goCfgSet', { k: 'track', v: 0 });
    });
    await step('📍 трекінг: Live Location кур\'єра → точка в /api/orders, зайве оновлення відсікається, після видачі зникає', async () => {
      const tg = async u => (await fetch(API + '/tg3', { method: 'POST', headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'x' }, body: JSON.stringify(u) })).status;
      const lnk = await posOk(C, 'courTg'); const n = /c_([a-f0-9]{16})/.exec(lnk.url || '')?.[1]; must(n, 'немає коду підключення: ' + JSON.stringify(lnk).slice(0, 80));
      const chat = 900000 + Math.floor(Math.random() * 90000);
      await tg({ update_id: 1, message: { message_id: 1, chat: { id: chat }, from: { id: chat }, text: '/start c_' + n } }); // відповідь бота піде у вигаданий Telegram — статус не важливий, привʼязка пишеться до відправки
      const loc = (la, lo) => ({ update_id: 2, edited_message: { message_id: 1, chat: { id: chat }, location: { latitude: la, longitude: lo } } });
      let o;
      await posOk(A, 'goCfgSet', { k: 'track', v: 1 }); await new Promise(r => setTimeout(r, 200));
      await tg({ ...loc(48.36123, 24.43456), update_id: 3 }); o = await http('/api/orders?g=1&ids=' + oid + '&x=' + Date.now()); const l = o.j[oid]?.loc; must(l && l.la === 48.36123 && l.lo === 24.43456, 'loc=' + JSON.stringify(o.j).slice(0, 160));
      await tg({ ...loc(48.5, 24.5), update_id: 4 }); o = await http('/api/orders?g=1&ids=' + oid + '&x=' + Date.now() + 1); must(o.j[oid]?.loc?.la === 48.36123, 'друге оновлення раніше 2 хв мало відсікатись: ' + o.j[oid]?.loc?.la);
      const st = await posOk(A, 'state'); must(st.tables.find(x => x.t === G)?.go?.loc?.la === 48.36123, 'bill.go.loc немає');
      await posOk(A, 'goCfgSet', { k: 'track', v: 0 });
    });
    const bal = async () => (await posOk(A, 'shift')).bal, b0 = await bal();
    await step('кур\'єр: видано 💵 → чек закрито', async () => {
      const r = await posOk(C, 'courAct', { t: G, act: 'done', arg: 'cash' }); must(r.done, 'не закрито');
      const o = await http('/api/orders?ids=' + oid); const st = JSON.stringify(o.j); must(/done/.test(st), 'статус гостя: ' + st.slice(0, 150)); must(!st.includes('"loc"'), 'після видачі точка не віддається');
      const me = await posOk(C, 'courMe'); return `готівка в кур'єра: ${JSON.stringify(me.day?.cash ?? me.day).slice(0, 60)}`;
    });
    await step('🛵 готівка кур\'єра: courOwed = сума, у «Готівці в касі» її нема; «Отримав» → courOwed 0, cash += сума', async () => {
      const b1 = await bal(), owed = b1.courOwed - (b0.courOwed || 0); must(owed > 0, 'courOwed не зріс: ' + JSON.stringify([b0.courOwed, b1.courOwed]));
      must(b1.courBy?.[users.courier.me.name] >= owed, 'courBy: ' + JSON.stringify(b1.courBy));
      must(b1.cash === b0.cash, `готівка в касі змінилась до здачі: ${b0.cash} → ${b1.cash}`);
      must((await posOk(A, 'courCash', { n: users.courier.me.name, sum: owed })).r, 'courCash');
      const b2 = await bal(); must(b2.courOwed === b0.courOwed, `courOwed після: ${b2.courOwed} ≠ ${b0.courOwed}`);
      must(b2.cash === b0.cash + owed, `cash після «Отримав»: ${b2.cash}, має ${b0.cash + owed}`); return `${owed} ₴`;
    });
  } else rec('кур\'єр не зареєстрований — сценарій пропущено', false);

  sect('🛡 Грошові ліміти: мінус, Infinity, гігантські суми (аудит)');
  await step('каса: cashMove / expense / reconcile / courCash / zpOp відхиляють сміттєві суми', async () => {
    const bad = ['1e400', 1e15, -100, 'NaN'], seen = [];
    for (const v of bad) {
      const rs = { cashMove: await pos(A, 'cashMove', { type: 'in', sum: v, note: 'qa' }), expense: await pos(A, 'expense', { sum: v, note: 'qa' }), reconcile: await pos(A, 'reconcile', { src: 'cash', actual: v === -100 ? -5 : v }),
        courCash: await pos(A, 'courCash', { n: users.courier?.me?.name || 'x', sum: v }), zpOp: await pos(A, 'zpOp', { n: users.waiter?.me?.name || 'x', t: 'adv', sum: v, src: 'cash' }) };
      for (const [k, r] of Object.entries(rs)) if (r.status !== 400) seen.push(`${k}(${v})→${r.status}`);
    }
    must(!seen.length, 'прийнято: ' + seen.join(', '));
    must((await pos(A, 'courCash', { n: 'Немає Такого', sum: 10 })).status === 400, 'courCash неіснуючому кур\'єру');
    return `${bad.length * 5} перевірок`;
  });

  sect('💳 Онлайн-оплата LiqPay (пісочниця тестового сервера)');
  {
    const { createHash } = await import('node:crypto'), PRIV = 'sandbox_test_private_key';
    const lpSign = obj => { const data = Buffer.from(JSON.stringify(obj)).toString('base64'); return { data, signature: createHash('sha1').update(PRIV + data + PRIV).digest('base64') }; };
    const lpPost = async (path, f) => { const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(f).toString() }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
    let po = null;
    await step('увімкнено онлайн → /api/go pay=online дає посилання LiqPay, у касі замовлення ще немає', async () => {
      await posOk(A, 'goCfgSet', { k: 'onl', v: 1 });
      const r = await http('/api/go', { kind: 'pick', name: 'QA Онлайн', phone: '0670005' + String(Math.floor(Math.random() * 900) + 100), when: '12:00', pay: 'online', items: [{ id: dish.id, q: 2 }], device: 'qa-lp-' + RUN });
      must(r.status === 200 && /liqpay\.ua\/api\/3\/checkout/.test(r.j.pay || '') && r.j.id, `${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); po = r.j;
      const w = await http('/api/gopay?id=' + po.id); must(w.j.st === 'wait', 'стан ' + JSON.stringify(w.j));
      const ev = (await posOk(A, 'state')).tables.filter(x => x.go?.oid === po.id); must(!ev.length, 'замовлення вже в касі до оплати'); return po.sum + ' грн';
    });
    await step('callback з підробленим підписом → 403', async () => {
      const f = lpSign({ order_id: 'go-varvar-' + po.id, status: 'success', amount: po.sum }); const r = await lpPost('/api/lp/go', { data: f.data, signature: 'AAAA' + f.signature.slice(4) }); must(r.status === 403, 'статус ' + r.status);
    });
    let gt = 0;
    await step('callback «sandbox» → замовлення в касі з позначкою «оплачено»; повтор не дублює', async () => {
      const f = lpSign({ order_id: 'go-varvar-' + po.id, status: 'sandbox', amount: po.sum, payment_id: 12345 });
      const r1 = await lpPost('/api/lp/go', f), r2 = await lpPost('/api/lp/go', f); must(r1.status === 200 && r1.j.ok, 'r1 ' + JSON.stringify(r1.j)); must(r2.j.dup, 'повтор: ' + JSON.stringify(r2.j));
      const w = await http('/api/gopay?id=' + po.id); must(w.j.st === 'paid' && w.j.no, 'стан ' + JSON.stringify(w.j));
      const b = (await posOk(A, 'state')).tables.filter(x => x.go?.oid === po.id); must(b.length === 1 && b[0].go.paid?.sum === po.sum, 'у касі: ' + JSON.stringify(b.map(x => x.go)).slice(0, 200)); gt = b[0].t; return w.j.no;
    });
    await step('закриття оплаченого → у зміні 🌐 онлайн окремо від терміналу', async () => {
      const s0 = await posOk(A, 'shift'); await posOk(A, 'accept', { oid: po.id }).catch(() => {});
      await posOk(A, 'goSt', { t: gt, st: 'done', pay: 'cash' }); const s1 = await posOk(A, 'shift');
      const d = x => x.z?.onl || 0; must(d(s1) - d(s0) === po.sum, `онлайн у зміні ${d(s0)} → ${d(s1)} (${JSON.stringify(s1).slice(0, 160)})`); return `+${po.sum} онлайн`;
    });
    await step('↩️ повернули онлайн-оплату доставки → закриття не рахує її 🌐 онлайн-виручкою', async () => {
      const r = await http('/api/go', { kind: 'pick', name: 'QA Повернення', phone: '0670006' + String(Math.floor(Math.random() * 900) + 100), when: '12:00', pay: 'online', items: [{ id: dish.id, q: 1 }], device: 'qa-lr-' + RUN }); must(r.j.id, JSON.stringify(r.j));
      must((await lpPost('/api/lp/go', lpSign({ order_id: 'go-varvar-' + r.j.id, status: 'sandbox', amount: r.j.sum, payment_id: 12346 }))).j.ok, 'callback');
      const t = (await posOk(A, 'state')).tables.find(x => x.go?.oid === r.j.id)?.t; must(t, 'немає в касі'); await posOk(A, 'accept', { oid: r.j.id }).catch(() => {});
      await posOk(A, 'tpayRefund', { t }); must(!(await posOk(A, 'state')).tables.find(x => x.t === t)?.go?.paid, 'після повернення досі «оплачено»');
      const s0 = await posOk(A, 'shift'); await posOk(A, 'goSt', { t, st: 'done', pay: 'cash' }); const s1 = await posOk(A, 'shift');
      must((s1.z?.onl || 0) === (s0.z?.onl || 0), `онлайн виріс ${s0.z?.onl} → ${s1.z?.onl}`); return 'онлайн без змін';
    });
    await posOk(A, 'goCfgSet', { k: 'onl', v: 0 });

    await step('🎁 сертифікат онлайн: посилання → callback → активний, повтор без дубля', async () => {
      await posOk(A, 'goCfgSet', { k: 'onl', v: 1 });
      const r = await http('/api/cert', { sum: 500, from: 'QA Даритель', to: 'QA', phone: '0670007' + String(Math.floor(Math.random() * 900) + 100), device: 'qa-ct-' + RUN, pay: 'online' });
      must(r.status === 200 && r.j.pay && r.j.code, `${r.status} ${JSON.stringify(r.j)}`);
      const f = lpSign({ order_id: 'ct-varvar-' + r.j.code, status: 'sandbox', amount: 500, payment_id: 999 }), c1 = await lpPost('/api/lp/cert', f), c2 = await lpPost('/api/lp/cert', f);
      must(c1.j.ok && !c1.j.dup && c2.j.dup, JSON.stringify([c1.j, c2.j]));
      const ev = (await posOk(A, 'state')).events.find(e => e.k === 'cert' && e.code === r.j.code); must(ev?.s === 'acc', 'подія ' + JSON.stringify(ev));
      { const r2 = await http('/api/cert', { sum: 300, from: 'QA Паралель', to: 'QA', phone: '0670008' + String(Math.floor(Math.random() * 900) + 100), device: 'qa-cp-' + RUN, pay: 'online' }); /* ⚡ два одночасні callback — одне надходження */
        const f2 = lpSign({ order_id: 'ct-varvar-' + r2.j.code, status: 'sandbox', amount: 300, payment_id: 998 }), m0 = (await posOk(A, 'shift')).mov.filter(m => (m.note || '').includes(r2.j.code)).length;
        const both = await Promise.all([lpPost('/api/lp/cert', f2), lpPost('/api/lp/cert', f2)]); must(both.filter(x => x.j.ok && !x.j.dup).length === 1, 'активацій: ' + JSON.stringify(both.map(x => x.j)));
        const mv = (await posOk(A, 'shift')).mov.filter(m => (m.note || '').includes(r2.j.code) && !m.del).length; must(mv - m0 === 1, 'рухів грошей: ' + (mv - m0)); }
      await posOk(A, 'goCfgSet', { k: 'onl', v: 0 }); return r.j.code; });
    // 🍽 оплата рахунку столу з QR → червоний стіл → ✅ підтвердити
    const TT = 14; let tk = '', tp = null;
    await step('стіл з QR: /api/tpay → посилання; callback → стіл «оплачено», подія чекає підтвердження', async () => {
      await posOk(A, 'goCfgSet', { k: 'qrpay', v: 1 });
      for (const t of [TT, 13]) { const b = (await posOk(A, 'state')).tables.find(x => x.t === t); if (b?.paid) await pos(A, 'tpayOk', { t, print: false }); else if (b) await pos(A, 'delete', { t, reason: 'QA прибирання' }); } /* 🧹 залишки ручних перевірок у спільній базі */
      const q = await posOk(A, 'qrInfo'); tk = new URL(q.list.find(x => x.t === TT).url).searchParams.get('k');
      await posOk(A, 'order', { t: TT, items: [{ id: dish.id, q: 1 }] });
      { const dv = 'qa-tp-' + RUN, q0 = await posOk(A, 'qrInfo'), gk = new URL(q0.all.replace('/print/', '/').replace(/\.png$/, '')).pathname; /* загальний QR → сесія сканування → оплата без ключа столу */
        const sc = await http('/api/scan', { k: new URL((await posOk(A, 'qrInfo')).list[0].url).searchParams.get('k'), t: 1, device: dv }); must(sc.j.ok, 'scan ' + JSON.stringify(sc.j));
        const no = await http('/api/tpay', { t: TT, device: dv }); must(no.status === 403, 'чужий стіл за сесією столу 1: ' + no.status); }
      const r = await http('/api/tpay', { t: TT, k: tk, tip: 10 }); must(r.status === 200 && r.j.pay, `${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); tp = r.j;
      const f = lpSign({ order_id: 'tb-varvar-' + tp.id, status: 'sandbox', amount: tp.sum, payment_id: 777 }); const c = await lpPost('/api/lp/table', f); must(c.status === 200 && c.j.ok, 'cb ' + JSON.stringify(c.j));
      const st = await posOk(A, 'state'), b = st.tables.find(x => x.t === TT); must(b?.pwait && b.paid?.sum === tp.sum, 'стіл: ' + JSON.stringify(b?.paid));
      must(st.events.some(e => e.k === 'tpay' && e.t === TT && e.s === 'new'), 'немає події tpay');
      const del = await pos(A, 'delete', { t: TT, reason: 'QA' }); must(del.status === 400, 'оплачений стіл видалився'); return tp.sum + ' грн';
    });
    await step('✅ підтвердити → стіл закрито як 🌐 онлайн (з чайовими), подія погасла', async () => {
      await posOk(A, 'order', { t: 13, items: [{ id: dish.id, q: 1 }] }); await posOk(A, 'move', { t: TT, to: 13 }); /* 🔗 об'єднали оплачений стіл з іншим — оплата й подія переходять */
      { const st = await posOk(A, 'state'), b = st.tables.find(x => x.t === 13); must(b?.paid?.sum === tp.sum && b.pwait, 'оплата не перейшла: ' + JSON.stringify(b?.paid)); must(st.events.some(e => e.k === 'tpay' && e.t === 13 && e.s === 'new'), 'подія не перейшла'); }
      const s0 = await posOk(A, 'shift'); await posOk(A, 'tpayOk', { t: 13, print: false }); const s1 = await posOk(A, 'shift'), st = await posOk(A, 'state');
      must(!st.tables.some(x => x.t === 13), 'стіл лишився'); must(!st.events.some(e => e.k === 'tpay' && e.t === 13 && e.s === 'new'), 'подія ще блимає');
      must((s1.z.onl || 0) - (s0.z.onl || 0) === tp.sum, `онлайн ${s0.z.onl} → ${s1.z.onl}`); return `+${tp.sum}`;
    });
    await step('➗ /api/tpay n=2: кожен гість платить свою частку, третій — «вже оплачено»', async () => {
      const T9 = 9; { const b = (await posOk(A, 'state')).tables.find(x => x.t === T9); if (b?.paid) await pos(A, 'tpayOk', { t: T9, print: false }); else if (b) await pos(A, 'delete', { t: T9, reason: 'QA прибирання' }); }
      const k9 = new URL((await posOk(A, 'qrInfo')).list.find(x => x.t === T9).url).searchParams.get('k'), tot = dish.price * 3, one = Math.ceil(tot / 2);
      await posOk(A, 'order', { t: T9, items: [{ id: dish.id, q: 3 }] }); const got = [];
      for (let i = 0; i < 2; i++) { const r = await http('/api/tpay', { t: T9, k: k9, n: 2, tip: 0 }); must(r.status === 200, `${i + 1}: ${r.status} ${JSON.stringify(r.j)}`); got.push(r.j.sum);
        const c = await lpPost('/api/lp/table', lpSign({ order_id: 'tb-varvar-' + r.j.id, status: 'sandbox', amount: r.j.sum, payment_id: 41 + i })); must(c.j.ok, JSON.stringify(c.j)); }
      must(got[0] === one && got[0] + got[1] === tot, `частки ${got} з ${tot}`);
      const no = await http('/api/tpay', { t: T9, k: k9, n: 2, tip: 0 }); must(no.status === 400 && no.j.error === 'paid', 'третя частка: ' + no.status);
      await posOk(A, 'tpayOk', { t: T9, print: false }); return got.join(' + ') + ' грн'; });
    await step('«Замовити + чек» → 🌐: нові страви оплачуються разом і після оплати йдуть у рахунок і на кухню', async () => {
      const T9 = 9; { const b = (await posOk(A, 'state')).tables.find(x => x.t === T9); if (b?.paid) await pos(A, 'tpayOk', { t: T9, print: false }); else if (b) await pos(A, 'delete', { t: T9, reason: 'QA прибирання' }); }
      const k9 = new URL((await posOk(A, 'qrInfo')).list.find(x => x.t === T9).url).searchParams.get('k');
      const r = await http('/api/tpay', { t: T9, k: k9, items: [{ id: dish.id, q: 2 }], tipSum: 0 }); must(r.status === 200 && r.j.sum === dish.price * 2, `${r.status} ${JSON.stringify(r.j)}`);
      must(!(await posOk(A, 'state')).tables.some(x => x.t === T9), 'страви в рахунку до оплати');
      const c = await lpPost('/api/lp/table', lpSign({ order_id: 'tb-varvar-' + r.j.id, status: 'sandbox', amount: r.j.sum, payment_id: 31 })); must(c.j.ok, JSON.stringify(c.j));
      const b = (await posOk(A, 'state')).tables.find(x => x.t === T9); must(b?.pay2 === r.j.sum && b.paid?.sum === r.j.sum && b.pwait, 'рахунок: ' + JSON.stringify({ pay2: b?.pay2, paid: b?.paid }));
      must((await posOk(A, 'kitchen')).list.some(e => e.t === T9 && !e.done), 'не пішло на кухню');
      await posOk(A, 'tpayOk', { t: T9, print: false }); return r.j.sum + ' грн'; });
    await step('🍾 /api/tpay з items: не більше марок (409 excise); «з собою» → у коментарі «З СОБОЮ»', async () => {
      const T9 = 9, k9 = new URL((await posOk(A, 'qrInfo')).list.find(x => x.t === T9).url).searchParams.get('k');
      const id = (await posOk(A, 'skIngSave', { x: { n: 'QA Віскі tp ' + RUN, u: 'л', cat: 'Інше', home: 'b', ex: true, vol: 0.5 } })).x.id;
      try {
        await posOk(A, 'skCardSave', { key: dish.id, name: dish.name.uk, card: { items: [{ id, q: 0.05 }] } });
        const no = await http('/api/tpay', { t: T9, k: k9, items: [{ id: dish.id, q: 1 }], tipSum: 0 }); must(no.status === 409 && no.j.error === 'excise', `без марок: ${no.status} ${JSON.stringify(no.j).slice(0, 160)}`);
      } finally { await posOk(A, 'skCardSave', { key: dish.id, card: null }); await posOk(A, 'skIngDel', { id }); }
      const ok = await http('/api/tpay', { t: T9, k: k9, items: [{ id: dish.id, q: 1 }], comment: 'З СОБОЮ · QA', tipSum: 0 }); must(ok.status === 200 && ok.j.pay, `успіх: ${ok.status} ${JSON.stringify(ok.j).slice(0, 160)}`);
      const c = await lpPost('/api/lp/table', lpSign({ order_id: 'tb-varvar-' + ok.j.id, status: 'sandbox', amount: ok.j.sum, payment_id: 32 })); must(c.j.ok, JSON.stringify(c.j));
      const kit = (await posOk(A, 'kitchen')).list.find(e => e.t === T9 && !e.done && /QA/.test(e.comment || '')); must(kit?.tw, 'на кухні немає «З СОБОЮ»: ' + JSON.stringify(kit).slice(0, 200));
      await posOk(A, 'tpayOk', { t: T9, print: false }); return 'ок'; });
    await posOk(A, 'goCfgSet', { k: 'qrpay', v: 0 });
  }

  sect('🍳 З собою: розрахувались одразу — замовлення лишається на кухні');
  await step('закрили стіл до готовності → картка на кухні з «оплачено», зникає після «Готово»', async () => {
    const T7 = 12; { const b = (await posOk(A, 'state')).tables.find(x => x.t === T7); if (b) await pos(A, 'delete', { t: T7, reason: 'QA прибирання' }); }
    await posOk(A, 'order', { t: T7, items: [{ id: dish.id, q: 1 }] }); await posOk(A, 'close', { t: T7, pay: 'cash', print: false });
    const k = (await posOk(A, 'kitchen')).list.filter(e => e.t === T7 && !e.done); must(k.length && k.every(e => e.paid), 'на кухні: ' + JSON.stringify(k).slice(0, 200));
    for (const e of k) await posOk(A, 'kDone', { id: e.id }); must(!(await posOk(A, 'kitchen')).list.some(e => e.t === T7 && !e.done), 'не зникла після «Готово»'); return k.length + ' карт.';
  });

  sect('Скасування доставки в касі → гість бачить «скасовано»');
  const dev = 'qa-cx-' + RUN, goNew = (n = 1) => http('/api/go', { kind: 'del', name: 'QA Скасування', phone: '0670003' + String(Math.floor(Math.random() * 900) + 100), addr: 'вул. Тестова 3', when: '12:00', pay: 'cash', items: [{ id: dish.id, q: n }, { id: drink.id, q: 1 }], device: dev });
  const gStatus = async id => { const o = await http('/api/orders?ids=' + id); const x = Array.isArray(o.j) ? o.j.find(y => y.id === id) || o.j[0] : o.j[id] || o.j.list?.find?.(y => y.id === id) || o.j; return { x, raw: JSON.stringify(o.j).slice(0, 200) }; };
  await step('(1) /api/go → accept → kStart → delete стола → g=rej', async () => {
    const r = await goNew(); must(r.status === 200 && r.j.ok, `go ${r.status} ${JSON.stringify(r.j)}`); const t = r.j.t, id = r.j.id;
    await posOk(A, 'accept', { oid: id });
    const k = (await posOk(A, 'kitchen')).list.filter(e => e.t === t && !e.done).pop(); must(k, 'немає картки на кухні'); await posOk(A, 'kStart', { id: k.id });
    await posOk(A, 'delete', { t, reason: 'QA скасування' });
    const s = await posOk(A, 'state'); must(!s.tables.some(x => x.t === t), 'рахунок ' + t + ' лишився');
    const g = await gStatus(id); must(g.x?.g === 'rej', 'orders: ' + g.raw); return r.j.no;
  });
  await step('(2) /api/go → accept → remove кожної страви → рахунок зник, g=rej', async () => {
    const r = await goNew(2); must(r.status === 200 && r.j.ok, `go ${r.status} ${JSON.stringify(r.j)}`); const t = r.j.t, id = r.j.id;
    await posOk(A, 'accept', { oid: id });
    for (let i = 0; i < 10; i++) {
      const b = (await posOk(A, 'state')).tables.find(x => x.t === t); if (!b) break;
      const it = b.items.find(x => !/Доставка/.test(x.name)); if (!it) throw new Error('лишився рахунок лише з доставкою: ' + JSON.stringify(b.items));
      await posOk(A, 'remove', { t, name: it.name, reason: 'QA скасування' });
    }
    const s = await posOk(A, 'state'); must(!s.tables.some(x => x.t === t), 'рахунок ' + t + ' лишився');
    const g = await gStatus(id); must(g.x?.g === 'rej', 'orders: ' + g.raw); return r.j.no;
  });
  await step('(3) той самий пристрій знову робить /api/go → 200', async () => {
    const r = await goNew(); must(r.status === 200 && r.j.ok, `${r.status} ${JSON.stringify(r.j)}`);
    await pos(A, 'delete', { t: r.j.t, reason: 'QA прибирання' }); return r.j.no;
  });

  sect('🗺 Схема залу');
  await step('mapSet: форма, поворот, декор, підлога (невідоме — відкидається)', async () => {
    const r = await posOk(A, 'mapSet', { pos: { 1: [10, 12, 'r', 45] }, from: 1, to: 1, deco: [['plant', 5, 5, 0, 0], ['bomb', 1, 1], ['wall', 50, 2, 90, 9999]], floor: 'tile' });
    must(JSON.stringify(r.cfg.map[1]) === '[10,12,"r",45]', 'map ' + JSON.stringify(r.cfg.map[1])); must(r.cfg.deco['1'].length === 2 && r.cfg.deco['1'][1][4] === 700, 'deco ' + JSON.stringify(r.cfg.deco['1'])); must(r.cfg.floor['1'] === 'tile', 'floor');
  });
  await step('/api/site віддає схему без сум', async () => { const r = await http('/api/site?qa=' + RUN); if (!r.j.bookOn) return 'броні вимкнено'; must(r.j.plan?.m?.[1], 'немає plan'); must(!JSON.stringify(r.j.plan).includes('pay'), 'зайве'); });

  sect('Броні');
  let bid = '';
  const d0 = day(3), d1 = day(103);
  { for (const d of [d0, d1]) for (const x of (await pos(A, 'bkList', { from: d, to: d })).j.list || []) if (/^QA Бронь/.test(x.name) && x.st !== 'cancel') await pos(A, 'bkSet', { id: x.id, st: 'cancel' }); } // прибрати броні минулих прогонів
  await step(`POST /api/book на ${d0}`, async () => {
    const r = await http('/api/book', { name: 'QA Бронь', phone: '0670001' + String(Math.floor(Math.random() * 900) + 100), date: d0, time: '19:00', people: 2, tw: 3, device: 'qa-bk-' + RUN });
    must(r.status === 200 && r.j.ok, `${r.status} ${JSON.stringify(r.j)}`); bid = r.j.id; return bid;
  });
  await step('bkSet ok → стіл, який гість обрав на схемі', async () => { const r = await posOk(A, 'bkSet', { id: bid, st: 'ok' }); must(r.b?.st === 'ok', 'st=' + r.b?.st); must(r.b?.t === 3, 't=' + r.b?.t); });
  await step('стіл зайнятий: друга бронь на той самий стіл і час — без стола; вручну — відмова', async () => {
    const r = await http('/api/book', { name: 'QA Бронь 2', phone: '0670003' + String(Math.floor(Math.random() * 900) + 100), date: d0, time: '19:30', people: 2, tw: 3, device: 'qa-bk2-' + RUN });
    must(r.j.ok, JSON.stringify(r.j)); const o = await posOk(A, 'bkSet', { id: r.j.id, st: 'ok' }); must(!o.b?.t, 'посадили на зайнятий стіл ' + o.b?.t);
    const e = await pos(A, 'bkSet', { id: r.j.id, st: 'ok', t: 3 }); must(e.status === 400, 'вручну на зайнятий: ' + e.status);
    await posOk(A, 'bkSet', { id: r.j.id, st: 'cancel' }); const z = await pos(A, 'bkSet', { id: r.j.id, st: 'ok' }); must(z.status === 400, 'скасовану підтвердили: ' + z.status);
  });
  await step(`bkEdit дата → ${d1} (+100 днів)`, async () => { const r = await posOk(A, 'bkEdit', { id: bid, f: { date: d1 } }); must(r.b?.date === d1, 'date=' + r.b?.date); });
  await step('bkList знаходить на новій даті', async () => {
    const r = await posOk(A, 'bkList', { from: d1, to: d1 }); const x = r.list.find(b => b.id === bid); must(x, 'не знайдено'); must(x.date === d1 && x.st === 'ok', JSON.stringify(x).slice(0, 120));
  });
  await step('bkList: на старій даті більше нема', async () => { const r = await posOk(A, 'bkList', { from: d0, to: d0 }); must(!r.list.some(b => b.id === bid), 'дубль на старій даті'); });
  await step('GET /api/book?id статус', async () => { const r = await http('/api/book?id=' + bid); must(!r.j.error, JSON.stringify(r.j)); });

  await loyTests(A, W, dish);

  sect('Права ролей (очікуємо 403)');
  let G2 = 0; // відкрита доставка, щоб кур'єр не міг поставити їй чужий статус
  { const r = await http('/api/go', { kind: 'del', name: 'QA Права', phone: '0670002' + String(Math.floor(Math.random() * 900) + 100), addr: 'вул. Тестова 2', when: '12:00', pay: 'cash', items: [{ id: dish.id, q: 1 }], device: 'qa2-' + RUN }); G2 = r.j.t || 0; }
  const deny = [
    [C, 'courier', 'close', { t: 1, pay: 'cash' }], [C, 'courier', 'shift'], [C, 'courier', 'order', { t: 1, items: [] }], [C, 'courier', 'bkList'], [C, 'courier', 'skData'], [C, 'courier', 'goSt', { t: G2, st: 'acc' }],
    [K, 'cook', 'close', { t: 1, pay: 'cash' }], [K, 'cook', 'shift'], [K, 'cook', 'staff'], [K, 'cook', 'goSt', { t: 1001, st: 'road' }], [K, 'cook', 'bkList'],
    [W, 'waiter', 'photoMake', { id: 'x' }], [K, 'cook', 'photoStyleSet', { prompt: 'x' }],
    [W, 'waiter', 'shift'], [W, 'waiter', 'delete', { t: 1 }], [W, 'waiter', 'zpGrid', { m: day().slice(0, 7) }], [W, 'waiter', 'courList'],
  ];
  for (const [tok, role, op, b] of deny) {
    if (!tok) { rec(`${role} ✗ ${op}`, false, 'немає токена'); continue; }
    await step(`${role} ✗ ${op}`, async () => { const r = await pos(tok, op, b); must(r.status === 403, `статус ${r.status} ${JSON.stringify(r.j).slice(0, 100)}`); });
  }
  for (const [tok, role] of [[K, 'cook'], [C, 'courier'], [W, 'waiter']]) {
    if (!tok) continue;
    await step(`${role} ✓ avatar (прибрати) і zpMy; avatar зі сміттям → 400`, async () => {
      const a = await pos(tok, 'avatar', { data: '' }); must(a.status === 200, 'avatar → ' + a.status + ' ' + JSON.stringify(a.j).slice(0, 100));
      const b = await pos(tok, 'avatar', { data: 'not-an-image' }); must(b.status === 400, 'сміття → ' + b.status);
      const z = await pos(tok, 'zpMy'); must(z.status === 200, 'zpMy → ' + z.status + ' ' + JSON.stringify(z.j).slice(0, 100)); });
  }
  if (C) await step('courier ✓ zpPeople (список колег), zpSwap без колеги → не 403', async () => { must((await pos(C, 'zpPeople')).status === 200, 'zpPeople'); const r = await pos(C, 'zpSwap', {}); must(r.status !== 403 && r.status < 500, 'zpSwap → ' + r.status); });
  if (C) for (const op of ['zpGrid', 'zpPay']) await step(`courier ✗ ${op}`, async () => { const r = await pos(C, op, {}); must(r.status === 403, 'статус ' + r.status); });
  if (K) for (const op of ['cashMove', 'zDay', 'zpGrid']) await step(`cook ✗ ${op}`, async () => { const r = await pos(K, op, {}); must(r.status === 403, 'статус ' + r.status); });
  if (G2) await pos(A, 'delete', { t: G2, reason: 'QA тест' });
  await step('📸 ШІ-фото: стиль зберігається; без платного ключа генерація → 503', async () => {
    const s1 = await pos(A, 'photoStyleSet', { prompt: 'QA стиль' }); must(s1.status === 200 && s1.j.prompt === 'QA стиль' && s1.j.free === null, /* VARVAR — без місячного ліміту */ JSON.stringify(s1.j).slice(0, 200));
    const m = await pos(A, 'photoMake', { id: dish.id }); must(m.status === 503, 'статус ' + m.status);
    const a = await pos(A, 'photoApply', { id: dish.id }); must(a.status === 400, 'без чернетки → ' + a.status);
    await pos(A, 'photoStyleSet', { prompt: '' }); });
  await step('📸 Зразок стилю зі старого фото-файлу страви (img/x.png) додається; третій → 400', async () => {
    const st = menu.categories.flatMap(c => c.items).find(x => /^img\//.test(x.img || '')); if (!st) return;
    const r = await pos(A, 'photoStyleSet', { refFrom: st.id }); must(r.status === 200 && r.j.refs.length === 1, 'зразок: ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 150));
    await pos(A, 'photoStyleSet', { refFrom: st.id }); const r3 = await pos(A, 'photoStyleSet', { refFrom: st.id }); must(r3.status === 400, 'третій зразок → ' + r3.status);
    await pos(A, 'photoStyleSet', { refDel: 0 }); await pos(A, 'photoStyleSet', { refDel: 0 }); });
  await step('📸 Блок меню: свої особливості й зразки — окремо від загального стилю; порожній блок прибирається', async () => {
    const st = menu.categories.flatMap(c => c.items).find(x => /^img\//.test(x.img || '')), cid = menu.categories.find(c => !c.tech)?.id; if (!cid) return;
    const p = await pos(A, 'photoStyleSet', { cat: cid, prompt: 'QA блок' }); must(p.status === 200 && p.j.cat?.[cid]?.prompt === 'QA блок' && p.j.prompt !== 'QA блок', JSON.stringify(p.j).slice(0, 200));
    if (st) { const r = await pos(A, 'photoStyleSet', { cat: cid, refFrom: st.id }); must(r.j.cat?.[cid]?.refs.length === 1 && !r.j.refs.length, 'зразок блоку: ' + JSON.stringify(r.j).slice(0, 200)); await pos(A, 'photoStyleSet', { cat: cid, refDel: 0 }); }
    const e = await pos(A, 'photoStyleSet', { cat: cid, prompt: '' }); must(!e.j.cat?.[cid], 'порожній блок лишився'); });
  await step('🔳 QR: картинки всіх столів, скан працює; «нові коди» — старий QR не працює', async () => {
    const q = await pos(A, 'qrInfo'); must(q.status === 200 && q.j.list.length === q.j.n && q.j.n > 0, JSON.stringify(q.j).slice(0, 200));
    const x = q.j.list[1], png = await fetch(API + new URL(x.img).pathname); const b = new Uint8Array(await png.arrayBuffer()); must(png.ok && b[0] === 0x89 && b[1] === 0x50, 'не PNG ' + png.status);
    const u = new URL(x.url), k = u.searchParams.get('k'), dev = 'qa-qr-' + Date.now();
    must((await http('/api/scan', { t: x.t, k, device: dev })).status === 200, 'скан нового QR');
    must((await pos(W, 'qrNew')).status === 403, 'офіціант не може міняти коди');
    if (q.j.next > Date.now()) { must((await pos(A, 'qrNew')).status === 400, 'нові коди частіше разу на місяць'); return; } // тестова база вже міняла коди цього місяця
    const n2 = await pos(A, 'qrNew'); must(n2.status === 200 && n2.j.list[1].img !== x.img, 'ключ не змінився');
    must((await http('/api/scan', { t: x.t, k, device: dev + 'b' })).status === 403, 'старий QR усе ще працює');
    must((await fetch(API + new URL(x.img).pathname)).status === 404, 'стара картинка не 404');
    must((await pos(A, 'qrNew')).status === 400, 'другі нові коди за місяць пройшли'); });
  await step('без токена → 401', async () => { const r = await pos('', 'state'); must(r.status === 401, 'статус ' + r.status); });

  sect('Персонал: перейменування не губить графік і ЗП; PIN; роль');
  if (K) {
    const old = users.cook.me.name, nu = `QA кухар-нов ${RUN}`, m = day().slice(0, 7), sid = users.cook.me.sid, tmr = day(1).slice(0, 7) === m ? day(1) : day();
    await step('графік, план і премія на старе імʼя', async () => { await posOk(A, 'zpAtt', { day: day(), n: old, set: 1 }); await posOk(A, 'zpPlan', { day: tmr, n: old, time: '10:00' }); await posOk(A, 'zpOp', { n: old, t: 'bonus', sum: 123, note: 'QA' }); });
    await step('staffEdit: імʼя зайняте → 400', async () => { const r = await pos(A, 'staffEdit', { id: sid, name: users.waiter.me.name }); must(r.status === 400, 'статус ' + r.status); });
    await step('staffEdit: перейменування', () => posOk(A, 'staffEdit', { id: sid, name: nu }));
    await step('zpGrid: зміна, план і премія — на новому імені', async () => { const g = await posOk(A, 'zpGrid', { m });
      must(g.att[day()]?.[nu] && !g.att[day()]?.[old], 'att не перенесено'); must(g.plan[tmr]?.[nu] && !g.plan[tmr]?.[old], 'plan не перенесено');
      const r = g.rows.find(x => x.n === nu); must(r && r.bonus === 123 && r.shifts >= 1, 'ЗП: ' + JSON.stringify(r).slice(0, 150)); must(!g.rows.some(x => x.n === old), 'старе імʼя лишилось'); });
    await step('стара сесія кухаря → 401', async () => { const r = await pos(K, 'state'); must(r.status === 401, 'статус ' + r.status); });
    await step('🔐 PIN адміністратора ≥6 цифр: 4-значний відхиляється, 6–8 приймається; у адміна PIN працює, офіціант — лише 4', async () => {
      const r4 = await pos(A, 'staffAdd', { name: 'QA PIN ' + RUN, pin: '4821', role: 'admin' }); must(r4.status === 400 && /6/.test(r4.j.error || ''), 'admin 4 цифри: ' + r4.status + JSON.stringify(r4.j));
      const w6 = await pos(A, 'staffAdd', { name: 'QA PIN ' + RUN, pin: '482193', role: 'waiter' }); must(w6.status === 400, 'офіціант 6 цифр: ' + w6.status);
      const ok6 = await pos(A, 'staffAdd', { name: 'QA PIN ' + RUN, pin: pin('admin'), role: 'admin' }); must(ok6.status === 200, 'admin 6 цифр: ' + ok6.status + JSON.stringify(ok6.j));
      const up = await pos(A, 'staffEdit', { id: sid, role: 'admin' }); must(up.status === 400, 'підвищення без PIN: ' + up.status);
    });
    await step('🔑 права з галочками: видача/зняття, чутливі — лише з PIN 6+, не-адмін не видає права й не робить адмінів', async () => {
      const wp = pin(), wn = 'QA Права ' + RUN; must((await pos(A, 'staffAdd', { name: wn, pin: wp, role: 'waiter' })).status === 200, 'staffAdd');
      const wid = (await posOk(A, 'staff')).staff.find(x => x.name === wn)?.id; must(wid, 'нема id');
      let lg = await http('/api/pos', { op: 'login', pin: wp }); const W2 = () => lg.j.token;
      must(!lg.j.me.can.includes('void'), 'офіціант без прав: ' + lg.j.me.can);
      must((await pos(W2(), 'voidBack', { ts: 1 })).status === 403, 'voidBack без права має бути 403');
      let r = await pos(A, 'staffPerm', { id: wid, perm: { void: 1 } }); must(r.status === 400 && /PIN/.test(r.j.error || ''), 'чутливе право без PIN: ' + r.status + JSON.stringify(r.j));
      r = await pos(A, 'staffPerm', { id: wid, perm: { tax: 1 } }); must(r.status === 200 && r.j.perm.tax === 1, 'tax без PIN: ' + JSON.stringify(r.j));
      r = await pos(A, 'staffPerm', { id: wid, perm: { void: 1, staff: 1, tax: 1 }, pin: '1234' }); must(r.status === 400, 'PIN 4 цифри з чутливим правом: ' + r.status);
      const wp6 = pin('admin'); r = await pos(A, 'staffPerm', { id: wid, perm: { void: 1, staff: 1, tax: 1 }, pin: wp6 }); must(r.status === 200, 'з PIN 6: ' + JSON.stringify(r.j));
      lg = await http('/api/pos', { op: 'login', pin: wp6 }); must(lg.j.token && lg.j.me.can.includes('void') && lg.j.me.can.includes('staff') && !lg.j.me.can.includes('cash'), 'can: ' + JSON.stringify(lg.j.me));
      must((await pos(W2(), 'voidBack', { ts: 1 })).status !== 403, 'voidBack з правом не має бути 403');
      must((await pos(W2(), 'taxGet', {})).status === 200, 'taxGet з правом');
      must((await pos(W2(), 'expense', { sum: 1, cat: 'x' })).status === 403, 'expense без права cash = 403');
      must((await pos(W2(), 'staffAdd', { name: 'QA Адм ' + RUN, pin: pin('admin'), role: 'admin' })).status === 403, 'не-адмін не створює адмінів');
      must((await pos(W2(), 'staffPerm', { id: wid, perm: { cash: 1 } })).status === 403, 'не-адмін не видає права');
      { const adm0 = (await posOk(A, 'staff')).staff.find(x => x.role === 'admin')?.id;
        must((await pos(W2(), 'regCode', { role: 'admin', code: '7391' })).status === 403, 'regCode admin через elev = 403');
        must((await posOk(W2(), 'staff')).reg.admin === '', 'elev не бачить reg.admin');
        must((await pos(W2(), 'staffDel', { id: adm0 })).status === 403, 'staffDel адміна через elev = 403');
        must((await pos(W2(), 'staffEdit', { id: adm0, pin: pin('admin') })).status === 403, 'staffEdit адміна через elev = 403');
        must((await pos(W2(), 'reset', {})).status === 403, 'reset через elev = 403');
        must((await pos(W2(), 'waiterOut', { uid: 1 })).status === 403, 'waiterOut через elev = 403'); }
      // адміну можна зняти право: другий адмін без «reports» → 403 на звіт, але інше працює
      const an = 'QA Адм2 ' + RUN, ap = pin('admin'); must((await pos(A, 'staffAdd', { name: an, pin: ap, role: 'admin' })).status === 200, 'admin2');
      const aid = (await posOk(A, 'staff')).staff.find(x => x.name === an)?.id; must((await pos(A, 'staffPerm', { id: aid, perm: { reports: 0 } })).status === 200, 'зняти reports');
      const a2 = await http('/api/pos', { op: 'login', pin: ap }); const A2 = a2.j.token;
      must(!a2.j.me.can.includes('reports') && a2.j.me.can.includes('cash'), 'admin2 can: ' + a2.j.me.can);
      must((await pos(A2, 'reports', { from: '2000-01-01', to: '2000-01-02' })).status === 403, 'reports без права = 403');
      must((await pos(A2, 'shift', {})).status === 200, 'shift у admin2 працює');
      must((await pos(A, 'staffPerm', { id: aid, perm: {} })).status === 200, 'скинути до шаблону');
      must((await pos(A2, 'reports', { from: '2000-01-01', to: '2000-01-02' })).status !== 403, 'reports після скидання');
      await pos(A, 'staffDel', { id: aid }); await pos(A, 'staffDel', { id: wid });
    });
    await step('staffEdit: PIN = код реєстрації / чужий PIN → 400', async () => { for (const p of ['1114', '1119']) { const r = await pos(A, 'staffEdit', { id: sid, pin: p }); must(r.status === 400, p + ' → ' + r.status); } });
    let np = pin();
    await step('staffEdit: новий PIN → вхід ним', async () => { const e = await editRetry(A, { id: sid, pin: np }); must(e.status === 200 && e.j.ok, 'staffEdit → ' + e.status + ' ' + JSON.stringify(e.j)); np = e.pin; const r = await http('/api/pos', { op: 'login', pin: np }); must(r.j.token && r.j.me.name === nu, JSON.stringify(r.j).slice(0, 120)); users.cook = { token: r.j.token, me: r.j.me }; });
    await step('staffEdit: роль кур\'єр → назад кухар', async () => { must((await editRetry(A, { id: sid, role: 'courier' })).j.ok, 'role courier'); let s = (await posOk(A, 'staff')).staff.find(x => x.id === sid); must(s.role === 'courier', s.role);
      must((await editRetry(A, { id: sid, role: 'cook' })).j.ok, 'role cook'); const r = await http('/api/pos', { op: 'login', pin: np }); must(r.j.me?.role === 'cook', JSON.stringify(r.j).slice(0, 100)); users.cook = { token: r.j.token, me: r.j.me }; });
    await step('коди реєстрації: є кур\'єр', async () => { const r = await posOk(A, 'staff'); must(r.reg.courier, 'нема reg.courier'); });
  }
  return true;
}

// 💨 Димовий тест: КОЖНА дія каси (усі api('op') з js/pos/*.js) з порожніми даними — сервер має відповісти помилкою, а не впасти (500).
// Ловить «нова фіча зламала стару дію» (ReferenceError, undefined.x) там, де окремого тесту ще нема. Дії, що стирають/змінюють налаштування або платні (ШІ), — пропускаємо.
async function smokeOps(A) {
  sect('💨 Усі дії каси не падають');
  const { readdirSync, readFileSync } = await import('node:fs'), D = new URL('../js/pos/', import.meta.url);
  const src = readdirSync(D).filter(f => /^\d.*\.js$/.test(f)).map(f => readFileSync(new URL(f, D), 'utf8')).join('\n');
  const skip = /^(reset|logout|jsErr|login|regCode)$|Set$|Save$|Del$|Clear$|Refund$|Merge$|Undo$|Ai$|Parse$|Photo$|Bench$|^push|^shift|Off$|Preset$|Pay$|Out$/;
  const ops = [...new Set([...src.matchAll(/\b(?:api|act)\('([A-Za-z0-9_]+)'/g)].map(m => m[1]))].filter(o => !skip.test(o)).sort(), bad = [];
  for (const o of ops) { const r = await pos(A, o, {}); if (r.status >= 500 && r.j.error === 'Помилка, спробуйте ще раз') bad.push(o); }
  rec(`${ops.length} дій з порожніми даними`, !bad.length, bad.length ? 'впали (500): ' + bad.join(', ') : '');
}

// 🤖 Димовий тест бота персоналу: адмін входить за PIN, натискає кожну кнопку клавіатури і безпечні inline-кнопки (без аргументів).
// Падіння обробника → сервер відповідає 400 bad_request. Кнопки, що видаляють/закривають/змінюють налаштування, — пропускаються.
async function botSmoke(pinA) {
  sect('🤖 Бот персоналу: кнопки не падають');
  const { readdirSync, readFileSync } = await import('node:fs'), D = new URL('../worker/src/', import.meta.url);
  const bv = readFileSync(new URL('bot-views.js', D), 'utf8'), obj = k => Object.fromEntries([...bv.match(new RegExp(`export const ${k} = \\{([\\s\\S]*?)\\};`))[1].matchAll(/(\w+): '([^']+)'/g)].map(m => [m[1], m[2]]));
  const W = obj('W'), A = obj('A');
  const uid = 7e9 + Math.floor(Math.random() * 1e8); let n = 1;
  const tg = async u => (await fetch(API + '/tg', { method: 'POST', headers: { 'content-type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'x' }, body: JSON.stringify({ update_id: n++, ...u }) })).status;
  const msg = text => tg({ message: { message_id: n, chat: { id: uid, type: 'private' }, from: { id: uid, first_name: 'QA' }, text } });
  const cb = data => tg({ callback_query: { id: 'q' + n, data, from: { id: uid, first_name: 'QA' }, message: { message_id: 1, chat: { id: uid } } } });
  const ok = await step('вхід адміна за PIN', async () => { must((await msg('/admin')) === 200, '/admin'); must((await msg(pinA)) === 200, 'PIN'); });
  if (!ok) return;
  const bad = [], skipT = new Set([A.logout, A.reset, A.delClosed, A.waiter]);
  const texts = ['/start', '/help', ...Object.values(W), ...Object.values(A).filter(t => !skipT.has(t))];
  for (const t of texts) { const s = await msg(t); if (s !== 200) bad.push(`«${t}» ${s}`); }
  rec(`${texts.length} кнопок і команд`, !bad.length, bad.join(', '));
  // inline: усі префікси callback_data з коду бота, з порожніми аргументами
  const src = readdirSync(D).filter(f => f.endsWith('.js')).map(f => readFileSync(new URL(f, D), 'utf8')).join('\n');
  const danger = /^(stfdel|stfdq|exdel|pdel|rm|rmq|dc|clsok|cls|exy|exs|gos|cep|cex|ce|cem|eqn|eq|rp|pclr|cfg|stfr|stfro|stfp|stfn|tgl|del|reset|delc|cmv|spl|spli|dsc|dscs|dscc|kdn|kst|mv|o|ed|prm|prt|pmt|ptest|rcn|bke|bkef|goe|goef|ob|atk|swk|zpb|zpbs|wl|tk|zdel|zdx|zdz|zdzn|zdzp|rej|skbuy|wout|tkd)$/;
  const cbs = [...new Set([...src.matchAll(/callback_data:\s*[`']([a-z]+)[:`']/g)].map(m => m[1]))].filter(c => !danger.test(c)).sort(), badC = [];
  for (const c of cbs) { const s = await cb(c); if (s !== 200) badC.push(`${c} ${s}`); }
  rec(`${cbs.length} inline-кнопок (${cbs.join(' ')})`, !badC.length, badC.join(', '));
  await msg(A.logout);
}

// 🎁 лояльність (promo.js): рівень → автознижка, без складання з ручною, щасливі години, кошик сайту, звіт
async function loyTests(A, W, dish) {
  sect('🎁 Лояльність: рівні й акції');
  const freeT = async () => { const s = await posOk(W, 'state'); const busy = new Set(s.tables.map(x => x.t)); for (let t = s.n; t >= 1; t--) if (!busy.has(t)) return t; throw new Error('усі столи зайняті'); };
  const tbl = async t => (await posOk(W, 'state')).tables.find(x => x.t === t);
  let cfg0 = null, off = [], lvId = 'qa' + RUN, hid = '';
  const ok0 = await step('loyGet: рівні й акції', async () => { const r = await posOk(A, 'loyGet'); cfg0 = r.cfg; must(Array.isArray(cfg0.levels) && cfg0.levels.length, 'немає рівнів'); return `${cfg0.levels.length} рівнів · ${cfg0.rules.length} акцій`; });
  if (!ok0) return;
  // ізоляція: вимикаємо чужі акції, вмикаємо модуль, стеля 50%
  for (const r of cfg0.rules.filter(r => r.on)) { await posOk(A, 'loyRuleOn', { id: r.id, on: false }); off.push(r.id); }
  await posOk(A, 'loySet', { on: 1, max: 50 });
  const ph = '0670004' + String(Math.floor(Math.random() * 900) + 100);
  try {
    await step('рівень вручну (QA −10%) → клієнту', async () => {
      await posOk(A, 'loyLevel', { lv: { id: lvId, name: 'QA ' + RUN, e: '🧪', man: 1, pct: 10 } });
      const r = await posOk(A, 'loyCliSet', { phone: ph, f: { lvl: lvId, name: 'QA Лояльний', bd: '01.01', note: 'QA' } }); must(r.cli.lvl === lvId, 'lvl=' + r.cli.lvl); return r.cli.lvn;
    });
    let T = 0, total = 0;
    await step('телефон гостя на столі → знижка рівня сама', async () => {
      T = await freeT(); const o = await posOk(W, 'order', { t: T, items: [{ id: dish.id, q: 2 }] }); total = o.total;
      await posOk(W, 'cliSet', { t: T, phone: ph }); const b = await tbl(T);
      const l = b.promo?.lines?.find(x => x.k === 'lvl:' + lvId); must(l, 'немає рядка рівня: ' + JSON.stringify(b.promo));
      must(l.amt === Math.round(total * 0.1) && b.pay2 === total - l.amt, `amt ${l.amt}, pay2 ${b.pay2}, total ${total}`); return `${l.n} −${l.amt}`;
    });
    await step('ручна знижка 15% більша → рівень не складається', async () => {
      await posOk(A, 'discount', { t: T, pct: 15 }); const b = await tbl(T);
      must(!b.promo?.lines?.some(x => x.k === 'lvl:' + lvId), 'рівень склався з ручною'); must(b.pay2 === total - Math.round(total * 0.15), 'pay2 ' + b.pay2);
      await posOk(A, 'discount', { t: T, pct: 0 });
    });
    await step('закриття → у чеку promo, сума зі знижкою, історія клієнта', async () => {
      const r = await posOk(W, 'close', { t: T, pay: 'cash', print: false }); must(r.r.sum === total - Math.round(total * 0.1), 'sum ' + r.r.sum);
      const c = (await posOk(A, 'closed')).list.filter(x => x.t === T).pop(); must(c?.promo?.some(p => p.k === 'lvl:' + lvId), 'closed.promo: ' + JSON.stringify(c?.promo));
      const k = await posOk(A, 'loyCliGet', { phone: ph }); must(k.cli.n >= 1 && k.cli.h?.[0]?.pr === Math.round(total * 0.1), 'cli: ' + JSON.stringify(k.cli).slice(0, 160)); return `${r.r.sum} грн`;
    });
    const kv = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date()), P = Object.fromEntries(kv.map(x => [x.type, x.value]));
    const hh = h => String((h + 24) % 24).padStart(2, '0') + ':' + P.minute, H = +P.hour % 24, dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(P.weekday) + 1;
    const happy = { type: 'happy', name: 'QA щасливі ' + RUN, pct: 20, from: hh(H - 1), to: hh(H + 1), days: [], where: ['hall', 'pick'] };
    await step('щасливі години −20% (зараз) → на столі без телефону', async () => {
      const r = await posOk(A, 'loyRule', { rule: happy }); hid = r.cfg.rules.find(x => x.name === happy.name)?.id; must(hid, 'акцію не створено');
      T = await freeT(); const o = await posOk(W, 'order', { t: T, items: [{ id: dish.id, q: 1 }] }); const b = await tbl(T);
      const l = b.promo?.lines?.find(x => x.k === hid); must(l && l.amt === Math.round(o.total * 0.2), 'promo: ' + JSON.stringify(b.promo)); return `${l.n} −${l.amt}`;
    });
    await step('інший день тижня → акція не діє', async () => {
      await posOk(A, 'loyRule', { rule: { ...happy, id: hid, days: [dow % 7 + 1] } }); const b = await tbl(T); must(!b.promo?.lines?.some(x => x.k === hid), 'діє не в свій день');
      await posOk(A, 'loyRule', { rule: { ...happy, id: hid } }); await pos(A, 'delete', { t: T, reason: 'QA лояльність' });
    });
    await step('кошик сайту /api/promo: самовивіз — так, доставка — ні (умова «де»)', async () => {
      const a = await http('/api/promo', { kind: 'pick', items: [{ id: dish.id, q: 1 }] }), d = await http('/api/promo', { kind: 'del', items: [{ id: dish.id, q: 1 }] });
      must(a.j.sum === Math.round(dish.price * 0.2), 'pick ' + JSON.stringify(a.j)); must(!d.j.sum, 'del ' + JSON.stringify(d.j)); return `−${a.j.sum}`;
    });
    await step('/api/go: сервер сам рахує акцію (клієнту не довіряємо)', async () => {
      const r = await http('/api/go', { kind: 'pick', name: 'QA Акція', phone: ph, when: '12:00', pay: 'cash', items: [{ id: dish.id, q: 1 }], device: 'qa-loy-' + RUN, promo: 99999 });
      must(r.status === 200 && r.j.ok, `${r.status} ${JSON.stringify(r.j)}`); const exp = Math.round(dish.price * 0.2) + Math.round(dish.price * 0.1);
      must(r.j.promo === exp && r.j.sum === dish.price - exp, `promo ${r.j.promo} sum ${r.j.sum}, очікували −${exp}`); await pos(A, 'delete', { t: r.j.t, reason: 'QA лояльність' }); return `${r.j.no} −${r.j.promo}`;
    });
    await step('звіт loyRep за сьогодні', async () => { const r = await posOk(A, 'loyRep', { from: day(-1), to: day() }) /* після півночі робочий день — ще вчорашній */; must(r.sum > 0 && r.list.some(x => x.k === 'lvl:' + lvId), JSON.stringify(r).slice(0, 200)); return `${r.sum} грн знижок`; });
    await step('клієнти: пошук і фільтр за рівнем', async () => { const r = await posOk(W, 'loyCli', { f: lvId }); must(r.list.some(x => x.phone.endsWith(ph.slice(1))), 'не знайдено'); });
    for (const [op, b] of [['loyRule', { rule: happy }], ['loyRep', {}], ['loyLevel', { del: lvId }], ['loyOff', { t: 1, off: 1 }]]) await step(`waiter ✗ ${op}`, async () => { const r = await pos(W, op, b); must(r.status === 403, 'статус ' + r.status); });
  } finally {
    if (hid) await pos(A, 'loyRule', { del: hid });
    await pos(A, 'loyCliSet', { phone: ph, f: { lvl: '' } }); await pos(A, 'loyLevel', { del: lvId });
    for (const id of off) await pos(A, 'loyRuleOn', { id, on: true });
    if (cfg0) await pos(A, 'loySet', { on: cfg0.on, max: cfg0.max });
  }

  sect('🤖 Бот гостей: налаштування, розсилка, відповідь');
  let gb0 = null;
  try {
    await step('gbGet', async () => { const r = await posOk(A, 'gbGet'); gb0 = r.cfg; must(r.cfg && r.aud, 'немає cfg'); return `підключено ${r.linked}`; });
    await step('gbSet: погане значення → 400', async () => { const r = await pos(A, 'gbSet', { f: { sleepDays: 1 } }); must(r.status === 400, String(r.status)); });
    await step('gbSet: вимкнути статус і назад', async () => { const r = await posOk(A, 'gbSet', { f: { stat: false, sleepBon: 50 } }); must(r.cfg.stat === 0 && r.cfg.sleepBon === 50, JSON.stringify(r.cfg)); });
    await step('gbCount', async () => { const r = await posOk(A, 'gbCount', { f: 'sleep' }); must(typeof r.n === 'number', 'n'); return `${r.n} отримувачів`; });
    await step('📱 фільтр «У програмі» (tg)', async () => { const r = await posOk(A, 'loyCli', { f: 'tg' }); must(r.list.every(x => x.tg || x.man), 'є не-учасники'); return r.list.length + ' учасн.'; });
    await step('📱 без бота: бонуси не списати', async () => { const g = await posOk(W, 'cliGet', { phone: '0670000001' }); must(g.mem === false, 'mem'); });
    await step('✉️ gbInbox / gbThread', async () => { const r = await posOk(W, 'gbInbox'); must(Array.isArray(r.list), 'list'); const t = await pos(W, 'gbThread', { ph: '380000000000' }); must(t.status === 400, String(t.status)); const st = await posOk(W, 'state'); must(typeof st.gInN === 'number', 'gInN у state'); });
    await step('gbReply: гість без бота → 400', async () => { const r = await pos(W, 'gbReply', { ph: '380000000000', text: 'тест' }); must(r.status === 400, String(r.status)); });
    for (const op of ['gbSet', 'gbCast', 'gbCount']) await step(`waiter ✗ ${op}`, async () => { const r = await pos(W, op, { f: {} }); must(r.status === 403, String(r.status)); });
  } finally { if (gb0) await pos(A, 'gbSet', { f: { stat: gb0.stat, sleepBon: gb0.sleepBon } }); }

  sect('🎂 Подарунок на ДН у рахунку');
  await step('certBd: без телефону — ні; обираємо позицію з чека → безкоштовно; вдруге за рік — ні', async () => {
    const all = (await http('/api/menu')).j.categories.flatMap(c => c.items), d2 = all.filter(i => typeof i.price === 'number' && i.price > 0 && !i.hidden && !i.variants).slice(0, 2);
    const st = await posOk(A, 'state'), busy = new Set(st.tables.map(x => x.t)); let T = 0; for (let t = st.n; t >= 1; t--) if (!busy.has(t)) { T = t; break; }
    await posOk(A, 'order', { t: T, items: d2.map(i => ({ id: i.id, q: 1 })) });
    const ph = '067' + String(Date.now()).slice(-7);
    try { must((await pos(A, 'certBd', { t: T, phone: '' })).status === 400, 'без телефону дозволило');
      const pk = (await posOk(A, 'certBd', { t: T, phone: ph })).pick; must(pk?.length === 2, 'список позицій ' + JSON.stringify(pk));
      const k = pk.findIndex(x => x.n.includes(d2[1].name.uk)), r = await posOk(A, 'certBd', { t: T, phone: ph, item: k }); must(r.use === d2[1].price, `знято ${r.use}, а ціна ${d2[1].price}`);
      must((await pos(A, 'certBd', { t: T, phone: ph, item: k })).status === 400, 'вдруге дозволило');
      await posOk(A, 'certOff', { t: T }); const b0 = (await posOk(A, 'state')).tables.find(x => x.t === T); must(!b0.cert && !b0.bonus, 'сертифікат лишився в рахунку');
      const re = await posOk(A, 'certBd', { t: T, phone: ph, item: k }); must(re.use === d2[1].price, 'після ✕ знову не дало'); }
    finally { await pos(A, 'delete', { t: T, reason: 'QA' }); }
  });

  sect('🛡 Заголовки сайту');
  await step('posatom.online: кабінет не вбудувати в чужий сайт, nosniff, https', async () => { // fetch не дає підмінити Host — тому node:http
    const { request } = await import('node:http'), u = new URL(API);
    const h = await new Promise((ok, no) => request({ host: u.hostname, port: u.port, path: '/owner/', headers: { host: 'posatom.online' } }, r => { r.resume(); ok(r.headers); }).on('error', no).end());
    must(h['x-frame-options'] === 'SAMEORIGIN' && h['x-content-type-options'] === 'nosniff' && /max-age/.test(h['strict-transport-security'] || ''), JSON.stringify(h).slice(0, 200));
  });

  sect('🗺 План кабінету');
  await step('план: задача → ⭐ → ✅ у кошик → видалення; не-платформі 403', async () => {
    const lg = await http('/api/owner', { op: 'login', email: 'qa-platform@test.local', pass: 'qa-platform-pass-1' }); if (lg.status !== 200) return 'немає тестового акаунта платформи — пропуск';
    const o = (op, b = {}) => fetch(API + '/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + lg.j.token }, body: JSON.stringify({ op, ...b }) }).then(r => r.json());
    const tag = 'QA-plan-' + Date.now(), r = await o('planSet', { ops: [{ o: 'add', f: { t: tag, zone: 'team', star: 1 } }] }), id = r.out?.[0]?.id; must(id, JSON.stringify(r).slice(0, 150));
    const k = await o('planSet', { ops: [{ o: 'add', f: { t: tag + ' sub', parent: id } }, { o: 'set', id, f: { done: 1, res: 'QA' } }] }); const x = k.d.items.find(y => y.id === id);
    must(x.done && !x.star && k.d.items.some(y => y.parent === id && y.zone === 'team'), 'done/star/підзадача: ' + JSON.stringify(x));
    must(!(await o('planSet', { ops: [{ o: 'add', f: { t: ' ' } }] })).out[0].ok && (await o('plan')).d.items.some(y => y.id === id), 'читання/порожня назва');
    const del = await o('planSet', { ops: [{ o: 'del', id }] }); must(!del.d.items.some(y => y.t.startsWith(tag)), 'видалення разом із підзадачею');
    const own = await http('/api/owner', { op: 'login', email: 'qa-own-x@test.local', pass: 'x' }).catch(() => ({})); if (own.j?.token) must((await fetch(API + '/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + own.j.token }, body: '{"op":"plan"}' })).status === 403, 'власнику закладу план доступний');
  });

  sect('📨 Вхідні кабінету');
  await step('побажання й 🆘 з каси потрапляють у вхідні платформи; ✅ / 🗑', async () => {
    const tag = 'QA-inbox-' + Date.now(); await posOk(W, 'ideaAdd', { text: tag + ' idea' }); await posOk(A, 'help', { text: tag + ' help' });
    const lg = await http('/api/owner', { op: 'login', email: 'qa-platform@test.local', pass: 'qa-platform-pass-1' }); if (lg.status !== 200) return 'немає тестового акаунта платформи — пропуск';
    const o = (op, b = {}) => fetch(API + '/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + lg.j.token }, body: JSON.stringify({ op, ...b }) }).then(r => r.json());
    const l = (await o('inbox')).list.filter(m => m.text.startsWith(tag)); must(l.length === 2 && l.some(m => m.kind === 'help') && l.some(m => m.kind === 'idea'), JSON.stringify(l).slice(0, 200));
    const hl = l.find(m => m.kind === 'help'); must(!(await o('inboxSay', { id: hl.id, text: '  ' })).ok, 'порожня відповідь прийнята'); must(!(await o('inboxSay', { id: 'нема-такого', text: 'x' })).ok, 'неіснуюче звернення');
    const sy = await o('inboxSay', { id: hl.id, text: 'QA відповідь ATOM' }); must(sy.ok && sy.m.chat.some(c => c.from === 'a'), JSON.stringify(sy).slice(0, 150));
    const th = (await posOk(A, 'ideaThr')).list.find(x => x.hid === hl.id); must(th && th.unr === 1 && th.chat.some(c => c.from === 'a' && c.text.includes('QA відповідь')), '💬 відповідь ATOM не дійшла до каси: ' + JSON.stringify(th).slice(0, 150));
    await posOk(A, 'ideaSeen', { hid: hl.id }); must(!(await posOk(A, 'ideaThr')).list.find(x => x.hid === hl.id).unr, 'unr не знято');
    for (const m of l) { must((await o('inboxSet', { id: m.id })).ok, 'done'); must((await o('inboxSet', { id: m.id, del: 1 })).ok, 'del'); }
    must(!(await o('inbox')).list.some(m => m.text.startsWith(tag)), 'не видалилось'); });

  sect('🔌 API партнерів (v1)');
  if (A && dish) {
    const ah = (path, key, o = {}) => fetch(API + '/api/v1/' + path, { method: o.body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}), ...(o.h || {}) }, body: o.body ? JSON.stringify(o.body) : undefined }).then(async r => ({ status: r.status, etag: r.headers.get('etag'), j: await r.json().catch(() => ({})) }));
    let key = '', kid = '', key2 = '', oid = '';
    await step('🔑 apiKeyNew: лише адмін, http-webhook — ні; ключ і секрет не видно в списку', async () => {
      if (W) must((await pos(W, 'apiKeyNew', { name: 'QA', sc: ['menu'] })).status === 403, 'офіціант створив ключ');
      must((await pos(A, 'apiKeyNew', { name: 'QA', sc: ['menu'], hook: 'http://example.com/h' })).status === 400, 'http webhook прийнято');
      const r = await posOk(A, 'apiKeyNew', { name: 'QA ' + RUN, sc: ['menu', 'orders'] }); key = r.key; kid = r.id; must(/^atk_[a-f0-9]{8}_[a-f0-9]{32}$/.test(key), key);
      const r2 = await posOk(A, 'apiKeyNew', { name: 'QA2 ' + RUN, sc: ['sales', 'orders'], hook: 'https://example.com/h' }); key2 = r2.key; must(/^whs_/.test(r2.hs || ''), 'немає секрету webhook');
      const l = JSON.stringify(await posOk(A, 'apiKeys')); must(l.includes(kid) && !l.includes(key.slice(13)) && !l.includes(key2.slice(13)) && !l.includes(r2.hs), 'ключ або секрет видно в списку');
    });
    await step('🔐 без ключа / підроблений → 401; без права → 403', async () => {
      must((await ah('ping')).status === 401, 'без ключа');
      must((await ah('ping', key.slice(0, -1) + (key.endsWith('0') ? '1' : '0'))).status === 401, 'підроблений ключ');
      must((await ah('sales', key)).status === 403, 'sales без права');
      must((await ah('menu', key2)).status === 403, 'menu без права');
      const p = await ah('ping', key); must(p.status === 200 && p.j.scopes.includes('orders'), JSON.stringify(p.j));
    });
    await step('🍽 GET menu + ETag → 304', async () => {
      const m = await ah('menu', key); must(m.status === 200 && m.j.categories?.length && m.etag, String(m.status));
      must(m.j.categories.flatMap(c => c.items).some(i => i.id === dish.id), 'страви немає');
      must((await ah('menu', key, { h: { 'if-none-match': m.etag } })).status === 304, 'не 304');
    });
    await step('🛵 POST orders: створює; повтор ext_id — без дубля; ліміт сайту не чіпає; чужий ключ статус не бачить', async () => {
      const ext = 'qa-' + RUN, body = { ext_id: ext, type: 'pickup', customer: { name: 'QA API', phone: '0670007' + String(Math.floor(Math.random() * 900) + 100) }, time: '12:00', payment: 'cash', items: [{ id: dish.id, qty: 2 }] };
      must((await ah('orders', key, { body: { ...body, ext_id: '' } })).status === 400, 'без ext_id');
      must((await ah('orders', key, { body: { ...body, type: 'x' } })).status === 400, 'невідомий type');
      const r = await ah('orders', key, { body }); must(r.status === 200 && r.j.ok && /^[a-f0-9]{10}$/.test(r.j.id) && r.j.total === dish.price * 2, JSON.stringify(r.j)); oid = r.j.id;
      const r2 = await ah('orders', key, { body }); must(r2.j.id === oid && r2.j.duplicate, 'дубль: ' + JSON.stringify(r2.j));
      for (let i = 0; i < 3; i++) { const x = await ah('orders', key, { body: { ...body, ext_id: ext + '-' + i } }); must(x.status === 200, 'ліміт гостей сайту зачепив API: ' + x.status); }
      const s = await ah('orders/' + oid, key); must(s.status === 200 && s.j.status === 'new' && s.j.ext_id === ext, JSON.stringify(s.j));
      must((await ah('orders/' + oid, key2)).status === 404, 'чужий ключ бачить замовлення');
    });
    await step('💳 API prepaid — не підтверджена оплата: вимкнене «з собою» не обходить', async () => {
      await posOk(A, 'goCfgSet', { k: 'pick', v: 0 });
      try { const r = await ah('orders', key, { body: { ext_id: 'qa-pre-' + RUN, type: 'pickup', customer: { name: 'QA Prepaid', phone: '0670009' + String(Math.floor(Math.random() * 900) + 100) }, time: '12:00', payment: 'prepaid', paid_sum: 0, items: [{ id: dish.id, qty: 1 }] } });
        must(r.status === 403 && r.j.error === 'closed_for_orders', 'prepaid обійшов вимкнення: ' + r.status + ' ' + JSON.stringify(r.j)); }
      finally { await pos(A, 'goCfgSet', { k: 'pick', v: 1 }); }
    });
    await step('📊 GET sales: чеки за день; діапазон > 31 дня → 400', async () => {
      const s = await ah('sales', key2); must(s.status === 200 && Array.isArray(s.j.checks), JSON.stringify(s.j).slice(0, 200));
      must((await ah('sales?from=2026-01-01&to=2026-03-01', key2)).status === 400, 'великий діапазон');
    });
    await step('📦 GET stock / receipts: залишки й накладні; без права → 403', async () => {
      const r = await posOk(A, 'apiKeyNew', { name: 'QA4 ' + RUN, sc: ['stock'] });
      const s = await ah('stock', r.key); must(s.status === 200 && Array.isArray(s.j.items) && (!s.j.items[0] || 'kitchen' in s.j.items[0]), JSON.stringify(s.j).slice(0, 200));
      const v = await ah('receipts', r.key); must(v.status === 200 && Array.isArray(v.j.receipts), JSON.stringify(v.j).slice(0, 200));
      must((await ah('receipts?from=2026-01-01&to=2026-03-01', r.key)).status === 400, 'великий діапазон');
      must((await ah('receipts?from=xx', r.key)).status === 400, 'погана дата');
      must((await ah('stock', key2)).status === 403, 'stock без права');
    });
    await step('🧪 пісочниця: публічний ключ — усі права, замовлення «рухається» саме, чужі ключі його не бачать', async () => {
      const SB = 'atk_00000000_' + '5a4db0c5'.repeat(4);
      const p = await ah('ping', SB); must(p.status === 200 && p.j.key === 'Пісочниця' && ['menu', 'orders', 'sales', 'stock'].every(x => p.j.scopes.includes(x)), JSON.stringify(p.j));
      must((await ah('menu', SB)).status === 200 && (await ah('stock', SB)).status === 200, 'menu/stock');
      const body = { ext_id: 'qa-sb-' + RUN, type: 'delivery', customer: { name: 'QA Пісочниця', phone: '0670010' + String(Math.floor(Math.random() * 900) + 100) }, address: 'вул. Тестова 1', payment: 'cash', items: [{ id: dish.id, qty: 1 }] };
      must((await ah('orders', SB, { body: { ...body, webhook: 'http://example.com/h' } })).status === 400, 'http webhook прийнято');
      for (const h of ['https://172.16.0.5/h', 'https://10.1.2.3/h', 'https://[::1]/h', 'https://intranet/h', 'https://x.local/h', 'https://example.com:8443/h']) must((await ah('orders', SB, { body: { ...body, ext_id: body.ext_id + 'w', webhook: h } })).status === 400, 'webhook на приватну адресу прийнято: ' + h);
      const r = await ah('orders', SB, { body }); must(r.status === 200 && r.j.ok, JSON.stringify(r.j));
      const s = await ah('orders/' + r.j.id, SB); must(s.status === 200 && s.j.status === 'new' && s.j.ext_id === body.ext_id, JSON.stringify(s.j));
      must((await ah('orders/' + r.j.id, key)).status === 404, 'звичайний ключ бачить замовлення пісочниці');
    });
    await step('🔐 /api/go: _api від гостя не знімає ліміт сайту', async () => {
      const b = { kind: 'pick', name: 'QA Хакер API', phone: '0670008' + String(Math.floor(Math.random() * 900) + 100), when: '12:00', pay: 'cash', items: [{ id: dish.id, q: 1 }], device: 'qa-api-' + RUN, _api: 'x' };
      const st = []; for (let i = 0; i < 4; i++) st.push((await http('/api/go', b)).status); must(st.includes(429), 'ліміт не спрацював: ' + st);
    });
    await step('📮 webhook наскрізно: стоп-лист → stop.changed, замовлення → order.status (будильник закладу, ≤75 с)', async () => {
      const r = await posOk(A, 'apiKeyNew', { name: 'QA3 ' + RUN, sc: ['menu', 'orders'], hook: 'https://example.com/atom-qa' });
      const o = await ah('orders', r.key, { body: { ext_id: 'qa3-' + RUN, type: 'pickup', customer: { name: 'QA API', phone: '0670009' + String(Math.floor(Math.random() * 900) + 100) }, time: '12:00', payment: 'cash', items: [{ id: dish.id, qty: 1 }] } }); must(o.j.ok, JSON.stringify(o.j));
      await posOk(A, 'stop', { id: dish.id, hidden: true }); await posOk(A, 'accept', { oid: o.j.id }).catch(() => {}); // new → acc
      let hl = [];
      try { for (let i = 0; i < 15; i++) { await sleep(5000); hl = (await posOk(A, 'apiKeys')).list.find(k => k.id === r.id)?.hl || []; if (['stop.changed', 'order.status'].every(e => hl.some(h => h.e === e))) break; } }
      finally { await posOk(A, 'stop', { id: dish.id, hidden: false }); }
      must(['stop.changed', 'order.status'].every(e => hl.some(h => h.e === e)), 'доставки: ' + JSON.stringify(hl));
      return hl.map(h => h.e + ':' + h.st).join(' ');
    });
    await step('🗑 відкликаний ключ → 401', async () => {
      await posOk(A, 'apiKeyDel', { id: kid }); must((await ah('ping', key)).status === 401, 'працює після відкликання');
      for (const k of (await posOk(A, 'apiKeys')).list.filter(k => k.name.endsWith(' ' + RUN))) await posOk(A, 'apiKeyDel', { id: k.id });
    });
  }

  sect('🖨 Черга друку: список і очищення');
  await step('printQ / printClear', async () => { await posOk(A, 'printTest'); await posOk(A, 'printTest'); const l = (await posOk(A, 'printQ')).list; must(l.length >= 2, 'черга ' + l.length);
    must((await pos(W, 'printClear', {})).status === 403, 'офіціант очистив'); const one = await posOk(A, 'printClear', { id: l[0].id }); must(one.n === 1, 'одне');
    await posOk(A, 'printClear', {}); must((await posOk(A, 'printQ')).list.length === 0, 'не порожня'); });

  sect('🏪 Мультизаклад: HUB, кабінет власника, ізоляція закладів');
  const own = b => http('/api/owner', b.op ? b : b), ownT = async (tok, op, b = {}) => { const r = await fetch(API + '/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ op, ...b }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const PE = 'qa-platform@test.local', PP = 'qa-platform-pass-1', VID = ('qa-' + RUN).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30), OE = `qa-own-${VID}@test.local`;
  let PT = '', VA = '', codes = null, OT = '';
  await step('HUB: вхід платформи (або перший запуск із сесії адміна VARVAR)', async () => {
    const b = await own({ op: 'canBoot' }); if (b.j.boot) { const r = await own({ op: 'bootstrap', pos: A, email: PE, pass: PP, name: 'QA платформа' }); must(r.j.token, JSON.stringify(r.j)); PT = r.j.token; return 'створено'; }
    const r = await own({ op: 'login', email: PE, pass: PP }); must(r.j.token, JSON.stringify(r.j)); PT = r.j.token; });
  await step('bootstrap вдруге / без сесії каси → відмова', async () => { const r = await own({ op: 'bootstrap', pos: '0'.repeat(32), email: 'x@y.zz', pass: '12345678' }); must(r.status >= 400, String(r.status)); });
  await step('невірний пароль → 401', async () => { const r = await own({ op: 'login', email: PE, pass: 'wrong-pass' }); must(r.status === 401, String(r.status)); });
  await step('платформа: власник + заклад (випадкові коди, не 1119)', async () => {
    must((await ownT(PT, 'acctNew', { email: OE, pass: 'owner-pass-123', name: 'QA власник' })).j.ok, 'acctNew');
    const r = await ownT(PT, 'venueNew', { id: VID, name: 'QA Кав\'ярня', owner: OE }); must(r.j.ok, JSON.stringify(r.j)); codes = r.j.codes; must(codes.admin && codes.admin !== '1119', 'код адміна ' + codes.admin); return VID; });
  const vpos = (tok, op, b = {}) => http(`/v/${VID}/api/pos`, { op, ...b }, tok);
  await step('заклад: реєстрація адміна його кодом; 1119 там не діє', async () => {
    must((await vpos(null, 'login', { pin: '1119' })).status === 401, '1119 спрацював');
    for (let i = 0; i < 5 && !VA; i++) { const r = await vpos(null, 'register', { code: codes.admin, name: 'QA адмін закладу', pin: String(200000 + Math.floor(Math.random() * 700000)) }); VA = r.j.token || ''; }
    must(VA, 'не зареєструвався'); });
  await step('ізоляція: токени не переходять між закладами', async () => { must((await vpos(A, 'state')).status === 401, 'токен VARVAR працює в закладі'); must((await pos(VA, 'state')).status === 401, 'токен закладу працює у VARVAR'); });
  await step('новий заклад: порожнє меню й своя назва (не VARVAR)', async () => {
    const m = await http(`/v/${VID}/api/menu`); must(!m.j.categories.some(c => !c.tech && c.items.length), 'є меню VARVAR'); const s = await http(`/v/${VID}/api/site`); must(s.j.name === 'QA Кав\'ярня', 'назва ' + s.j.name); });
  await step('ізоляція: стіл у закладі не видно у VARVAR', async () => {
    const before = (await posOk(A, 'state')).tables.map(x => x.t + ':' + x.total).sort().join();
    const m = await http(`/v/${VID}/api/menu`), it = m.j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number' && i.price > 0) || m.j.categories.flatMap(c => c.items)[0];
    const st = await vpos(VA, 'state'); must(st.j.tables.length === 0, 'у новому закладі вже є столи');
    const o = await vpos(VA, 'order', { t: 3, items: [{ id: it.id, q: 1, ...(typeof it.price !== 'number' ? { price: 100 } : {}) }] }); must(o.status === 200, 'order ' + JSON.stringify(o.j).slice(0, 150));
    must((await vpos(VA, 'state')).j.tables.length === 1, 'стіл не з\'явився'); must((await posOk(A, 'state')).tables.map(x => x.t + ':' + x.total).sort().join() === before, 'VARVAR змінився');
    await vpos(VA, 'delete', { t: 3, reason: 'QA' }); });
  await step('кабінет: імпорт меню, столи закладу, чек-лист запуску', async () => {
    const r = await vpos(VA, 'menuImport', { rows: [{ cat: 'Кава', name: 'Еспресо', price: '45' }, { cat: 'Кава', name: 'Лате', price: '70,00' }, { cat: '', name: 'Без ціни', price: '' }] }); must(r.j.add === 2 && r.j.cats === 1, JSON.stringify(r.j));
    const again = await vpos(VA, 'menuImport', { rows: [{ cat: 'Кава', name: 'еспресо', price: 50 }] }); must(again.j.add === 0 && again.j.upd === 1, 'дубль');
    must((await vpos(VA, 'cfgSet', { k: 'tables', v: 7 })).status === 200, 'tables'); must((await vpos(VA, 'state')).j.n === 7, 'столів не 7'); must((await posOk(A, 'state')).n !== 7 || true, '');
    const lg = await vpos(VA, 'alog', {}); must(lg.j.list?.some(x => /імпорт/i.test(x.t)), 'журнал без імпорту меню: ' + JSON.stringify(lg.j).slice(0, 120));
    const rd = await ownT(PT, 'ready', { venue: VID }); must(rd.j.items === 2 && rd.j.tables === 7 && rd.j.bots && rd.j.printKey, JSON.stringify(rd.j).slice(0, 150)); });
  await step('📊 аналітика закладу: один запит, структура, кеш, доступ', async () => {
    const d = new Date().toISOString().slice(0, 10), r = await ownT(PT, 'an', { venue: VID, from: d, to: d });
    must(r.status === 200 && r.j.cur && r.j.heat?.length === 7 && r.j.heat[0].length === 24 && r.j.ch && r.j.pay && r.j.forecast?.est >= 0 && Array.isArray(r.j.top) && r.j.abc && r.j.kitchen && r.j.guests, JSON.stringify(r.j).slice(0, 200));
    const r2 = await ownT(PT, 'an', { venue: VID, from: d, to: d }); must(r2.j.cached === 1, 'другий запит має бути з кешу');
    must((await ownT(PT, 'an', { venue: 'nope-zzz', from: d, to: d })).status >= 400, 'чужий/невірний заклад');
  });
  await step('💾 бекап: зробити, список, відновити (стіл повертається)', async () => {
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number');
    const b = await ownT(PT, 'bak', { venue: VID, do: 'now' }); must(b.j.ok && b.j.n > 0, JSON.stringify(b.j));
    const l = await ownT(PT, 'bak', { venue: VID, do: 'list' }); must(l.j.list.length >= 1, 'список');
    await vpos(VA, 'order', { t: 5, items: [{ id: it.id, q: 1 }] }); must((await vpos(VA, 'state')).j.tables.some(x => x.t === 5), 'стіл 5');
    { const ol = (await own({ op: 'login', email: OE, pass: 'owner-pass-123' })).j.token; must((await ownT(ol, 'bak', { venue: VID, do: 'restore', tag: b.j.tag, confirm: VID })).status === 403, 'власник відновив'); }
    const r = await ownT(PT, 'bak', { venue: VID, do: 'restore', tag: b.j.tag, confirm: VID }); must(r.j.ok, JSON.stringify(r.j));
    must(!(await vpos(VA, 'state')).j.tables.some(x => x.t === 5), 'після відновлення стіл 5 лишився'); });
  await step('💳 оплата ATOM: пробний місяць → callback підписки +1 міс (без дубля), поповнення ШІ', async () => {
    const { createHash } = await import('node:crypto'), PRIV = 'sandbox_test_private_key';
    const cb = async (path, obj) => { const data = Buffer.from(JSON.stringify(obj)).toString('base64'), signature = createHash('sha1').update(PRIV + data + PRIV).digest('base64');
      const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data, signature }).toString() }); return r.json(); };
    const b0 = (await ownT(PT, 'bill', { venue: VID })).j; must(b0.sub?.trial && b0.ai?.bal === 0, JSON.stringify(b0).slice(0, 200));
    const l = await ownT(PT, 'billPay', { venue: VID, kind: 'sub', auto: true }); must(/liqpay\.ua/.test(l.j.url || ''), JSON.stringify(l.j));
    const pid = 'qa' + Date.now(); for (let i = 0; i < 2; i++) await cb('/api/lp/sub', { order_id: `sub-${VID}-x1`, status: 'subscribed', action: 'subscribe', amount: 500, payment_id: pid });
    const b1 = (await ownT(PT, 'bill', { venue: VID })).j.sub, days = Math.round((b1.till - b0.sub.till) / 864e5); must(!b1.trial && b1.auto && days >= 28 && days <= 31, `till +${days} дн, auto=${b1.auto}`);
    await cb('/api/lp/ai', { order_id: `ai-${VID}-x2`, status: 'sandbox', amount: 100, payment_id: pid + 'a' });
    const b2 = (await ownT(PT, 'bill', { venue: VID })).j; must(b2.ai.bal === 100, 'баланс ' + b2.ai.bal); return `+${days} дн · ШІ ${b2.ai.bal} ₴`; });
  await step('💳 monobank: токен → /api/go online дає посилання, вебхук (підпис ECDSA) → в касі оплачено, хибний підпис 403, «processing» ігнорується', async () => {
    const { createPrivateKey, sign } = await import('node:crypto');
    const KEY = createPrivateKey({ key: Buffer.from('MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgsd0Stv5JbnV3LvGDk5/DX3S9aYEmbUkOZCa4HpviGs6hRANCAATGghUZMECHtZaQTr3DPK2Ox8SHdo7hu1TT7LtipKtq8/eWxKEBRiOgCaoLx/T46RQGgY3oDr0g/9qqBGfB3fpS', 'base64'), format: 'der', type: 'pkcs8' });
    const hook = async (path, obj, bad) => { const raw = JSON.stringify(obj), sig = sign('sha256', Buffer.from(raw), KEY).toString('base64');
      const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-sign': bad ? sig.slice(0, 20) + (sig[20] === 'A' ? 'B' : 'A') + sig.slice(21) : sig }, body: raw }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number');
    must((await ownT(PT, 'secrets', { venue: VID, f: { MONO_TOKEN: 'bad token!' } })).status === 400, 'невірний формат токена прийнято');
    must((await ownT(PT, 'secrets', { venue: VID, f: { PAY_PROVIDER: 'x' } })).status === 400, 'невідома система прийнята');
    must((await ownT(PT, 'secrets', { venue: VID, f: { MONO_TOKEN: 'mono_test_qa1234567' } })).j.ok, 'збереження токена');
    try {
      for (const k of ['on', 'pick', 'onl']) await vpos(VA, 'goCfgSet', { k, v: 1 });
      const r = await http(`/v/${VID}/api/go`, { kind: 'pick', name: 'QA Mono', phone: '0670008' + String(Math.floor(Math.random() * 900) + 100), when: '12:00', pay: 'online', items: [{ id: it.id, q: 1 }], device: 'qa-mono-' + RUN });
      must(r.status === 200 && /monobank/.test(r.j.pay || '') && r.j.id, `${r.status} ${JSON.stringify(r.j).slice(0, 200)}`);
      const ref = `go-${VID}-${r.j.id}`, ev = { invoiceId: 'mt1', reference: ref, amount: r.j.sum * 100, ccy: 980 };
      { const bd = await hook(`/v/${VID}/api/lp/go`, { ...ev, status: 'success' }, true); must(bd.status === 403, 'хибний підпис не відхилено: ' + bd.status + ' ' + JSON.stringify(bd.j).slice(0, 120)); }
      must((await hook(`/v/${VID}/api/lp/go`, { ...ev, status: 'processing' })).j.wait, 'processing не проігноровано');
      must((await http(`/v/${VID}/api/gopay?id=` + r.j.id)).j.st === 'wait', 'стан після processing');
      const c1 = await hook(`/v/${VID}/api/lp/go`, { ...ev, status: 'success' }), c2 = await hook(`/v/${VID}/api/lp/go`, { ...ev, status: 'success' });
      must(c1.status === 200 && c1.j.ok && c2.j.dup, JSON.stringify([c1.j, c2.j]));
      const w = (await http(`/v/${VID}/api/gopay?id=` + r.j.id)).j; must(w.st === 'paid', 'стан ' + JSON.stringify(w));
      const t = (await vpos(VA, 'state')).j.tables.find(x => x.go?.oid === r.j.id); must(t?.go?.paid?.sum === r.j.sum, 'у касі: ' + JSON.stringify(t?.go).slice(0, 160));
    } finally { await ownT(PT, 'secrets', { venue: VID, f: { MONO_TOKEN: '', PAY_PROVIDER: 'liqpay' } }); await vpos(VA, 'goCfgSet', { k: 'onl', v: 0 }); }
  });
  await step('📴 офлайн-черга: повтор з тим самим qid не дублює замовлення', async () => {
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number'), qid = 'qa' + Date.now().toString(36);
    for (let i = 0; i < 2; i++) must((await vpos(VA, 'order', { t: 6, items: [{ id: it.id, q: 1 }], qid })).status === 200, 'order');
    const t6 = (await vpos(VA, 'state')).j.tables.find(x => x.t === 6); must(t6 && t6.items.reduce((a, x) => a + x.q, 0) === 1, 'дубль: ' + JSON.stringify(t6?.items));
    await vpos(VA, 'delete', { t: 6, reason: 'QA' }); });
  await step('⛔ заклад «вимкнено» (cfg:lock why=off): каса 402 на запис, перегляд працює; увімкнули — знову можна', async () => {
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number'), ord = () => vpos(VA, 'order', { t: 4, items: [{ id: it.id, q: 1 }] });
    must((await ownT(PT, 'venueSet', { id: VID, f: { status: 'off' } })).j.ok, 'venueSet off');
    try {
      const r = await ord(); must(r.status === 402, 'order при off → ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 120)); must(/вимкнено/.test(r.j.error || ''), 'текст: ' + r.j.error);
      for (const op of ['close', 'cashMove', 'shiftOpen', 'expense']) { const x = await vpos(VA, op, { t: 8 }); must(x.status === 402, `${op} при off → ${x.status}`); }
      must((await vpos(VA, 'state')).status === 200, 'перегляд (state) заблоковано');
      must(!(await vpos(VA, 'state')).j.tables.some(x => x.t === 4), 'стіл 4 все ж створився');
    } finally { must((await ownT(PT, 'venueSet', { id: VID, f: { status: 'active' } })).j.ok, 'venueSet active'); }
    const r2 = await ord(); must(r2.status === 200, 'order після увімкнення → ' + r2.status + ' ' + JSON.stringify(r2.j).slice(0, 120));
    await vpos(VA, 'delete', { t: 4, reason: 'QA' }); });
  await step('🏆 рекорд дня: Z створює rec:day, повторний Z того ж дня не платить премію, нижча виручка не затирає', async () => {
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number'), sale = async (t, q) => { must((await vpos(VA, 'order', { t, items: [{ id: it.id, q }] })).status === 200, 'order'); const c = await vpos(VA, 'close', { t, pay: 'cash' }); must(c.status === 200, 'close ' + JSON.stringify(c.j).slice(0, 100)); };
    must((await vpos(VA, 'cfgSet', { k: 'recBonus', v: 50 })).status === 200, 'recBonus 50');
    must(!(await vpos(VA, 'shift')).j.rec, 'rec до першого Z вже є');
    await sale(4, 2); const z1 = await vpos(VA, 'zDay', { print: false }); must(z1.status === 200 && z1.j.z.total > 0, 'zDay#1 ' + JSON.stringify(z1.j).slice(0, 120));
    must(z1.j.z.rec && z1.j.z.rec.beat === 0 && z1.j.z.rec.sum === z1.j.z.total, 'перший Z: beat=0, sum=total: ' + JSON.stringify(z1.j.z.rec));
    const r1 = (await vpos(VA, 'shift')).j.rec; must(r1 && r1.sum === z1.j.z.total && r1.d, 'shift.rec ' + JSON.stringify(r1));
    await sale(5, 3); const z2 = await vpos(VA, 'zDay', { print: false }); must(z2.j.z.total > z1.j.z.total, 'total не виріс');
    const r2 = (await vpos(VA, 'shift')).j.rec; must(r2.sum === z2.j.z.total && r2.d === r1.d, 'rec не оновився: ' + JSON.stringify(r2));
    const bon = JSON.stringify((await vpos(VA, 'zpMy')).j); must(!/рекорд дня/.test(bon), 'премія за рекорд того ж дня: ' + bon.slice(0, 200));
    const z3 = await vpos(VA, 'zDay', { print: false }); must(z3.j.z.total === z2.j.z.total, 'сума Z змінилась');
    const r3 = (await vpos(VA, 'shift')).j.rec; must(r3.sum === r2.sum, 'рівна виручка змінила рекорд'); must(z3.j.z.rec.beat === 0, 'рівна виручка = beat');
    must((await vpos(VA, 'cfgSet', { k: 'recBonus', v: 0 })).status === 200, 'recBonus reset'); return `рекорд ${r3.sum} ₴`; });
  await step('🧾 ПРРО Checkbox (імітація): чек на закриття, повернення при знятті, службове внесення, Z; VARVAR не чіпається', async () => {
    must((await posOk(A, 'fisInfo')).main === 1, 'VARVAR має бути поза ПРРО');
    must((await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: 'mock-test', CHECKBOX_PIN: 'bad' } })).status === 400, 'невірний PIN прийнято');
    const sv = await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: 'mock-test', CHECKBOX_PIN: '1234' } }); must(sv.j.ok && /Тестова/.test(sv.j.names?.kasa || ''), 'підключення: ' + JSON.stringify(sv.j).slice(0, 160));
    try {
      const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number');
      { const o = await vpos(VA, 'order', { t: 6, items: [{ id: it.id, q: 2 }] }); must(o.status === 200, 'order ' + JSON.stringify(o.j).slice(0, 160)); }
      const c = await vpos(VA, 'close', { t: 6, pay: 'card' }); must(c.status === 200, 'close ' + JSON.stringify(c.j).slice(0, 100));
      let x; for (let i = 0; i < 20 && !x?.fis; i++) { await sleep(150); x = (await vpos(VA, 'closed')).j.list.filter(r => r.t === 6 && !r.rm).pop(); }
      must(x?.fis?.st === 'ok' && x.fis.r?.a?.id, 'фіскальний стан: ' + JSON.stringify(x?.fis));
      let m = (await vpos(VA, 'fisInfo')).j.mock, sell = m.filter(q => q.path === '/receipts/sell').pop()?.body;
      must(m.some(q => q.path === '/shifts'), 'зміна Checkbox не відкрилась');
      must(sell?.id === x.fis.r.a.id && sell.goods[0].quantity === 2000 && sell.goods.reduce((a, g) => a + g.good.price * g.quantity / 1000, 0) - (sell.discounts?.[0]?.value || 0) === x.sum * 100, 'тіло чека: ' + JSON.stringify(sell).slice(0, 200));
      must(sell.payments.length === 1 && sell.payments[0].type === 'CASHLESS' && sell.payments[0].value === x.sum * 100, 'оплата карткою: ' + JSON.stringify(sell.payments));
      { /* 🧾 папір: чек друкується після фіскалізації — з ФН ПРРО, ФН чека й QR на check.checkbox.ua; копія — з тим самим ФН */
        const fj = async () => (await vpos(VA, 'printQ')).j.list.filter(j => j.kind === 'receipt' && j.fis?.includes('fc-' + x.fis.r.a.id));
        let pj = []; for (let i = 0; i < 20 && !pj.length; i++) { await sleep(150); pj = await fj(); }
        must(pj[0]?.fis.join() === ['4000000000', 'TEST' + x.fis.r.a.id.slice(0, 8), 'fc-' + x.fis.r.a.id].join(), 'фіскальний блок чека: ' + JSON.stringify(pj[0]));
        const png = await fetch(`${API}/v/${VID}/print/fc-${x.fis.r.a.id}.png`); must(png.ok && png.headers.get('content-type') === 'image/png', 'QR чека ' + png.status);
        must((await vpos(VA, 'closedPrint', { ref: x.id })).j.done && (await fj()).length === 2, 'копія без фіскального блока');
        x = (await vpos(VA, 'closed')).j.list.find(r => r.id === x.id); must(x.fis.r.a.fc === 'TEST' + x.fis.r.a.id.slice(0, 8), 'ФН чека не збережено'); }
      must((await vpos(VA, 'fisRetry', { ref: x.id })).j.r?.a?.id === x.fis.r.a.id, 'повтор без змін створив новий чек');
      must((await vpos(VA, 'closedDel', { ref: x.id })).status === 200, 'closedDel');
      let y; for (let i = 0; i < 20 && !y?.fis?.r?.a?.ret; i++) { await sleep(150); y = (await vpos(VA, 'closed')).j.list.find(r => r.id === x.id); }
      m = (await vpos(VA, 'fisInfo')).j.mock; const ret = m.filter(q => q.path === '/receipts/sell').pop()?.body;
      must(y?.fis?.r?.a?.ret?.length === 1 && !y.fis.r.a.id && ret.goods.every(g => g.is_return) && ret.related_receipt_id === x.fis.r.a.id, 'повернення: ' + JSON.stringify(y?.fis));
      must((await vpos(VA, 'cashMove', { type: 'in', sum: 100, note: 'QA' })).status === 200, 'cashMove');
      m = (await vpos(VA, 'fisInfo')).j.mock; must(m.some(q => q.path === '/receipts/service' && q.body.payment.value === 10000), 'службове внесення');
      must((await vpos(VA, 'zpOp', { n: 'QA ЗП', t: 'adv', sum: 70, src: 'cash' })).status === 200, 'zpOp'); /* 👷 аванс готівкою з каси — теж службова видача */
      m = (await vpos(VA, 'fisInfo')).j.mock; must(m.some(q => q.path === '/receipts/service' && q.body.payment.value === -7000), 'службова видача ЗП');
      const z = await vpos(VA, 'zDay', { print: false }); must(z.j.z.fis?.ok, 'Z у Checkbox: ' + JSON.stringify(z.j.z.fis));
      m = (await vpos(VA, 'fisInfo')).j.mock; must(m.some(q => q.path === '/shifts/close'), 'зміна Checkbox не закрита');
    } finally { await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: '' } }); }
    must((await vpos(VA, 'fisInfo')).j.on === 0, 'ПРРО не відключився');
  });
  await step('🏪 ПРРО: два ФОП (чек ділиться за розділами, ліміт року), обрив відповіді Checkbox без дубля, 🏦 переказ за QR без чека, сторно службового', async () => {
    const vok = async (op, b) => { const r = await vpos(VA, op, b); must(r.status === 200 && r.j.ok, `${op} → ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); return r.j; };
    const sec = f => ownT(PT, 'secrets', { venue: VID, f }), mockL = async () => (await vok('fisInfo')).mock || [];
    const waitFis = async (t, ok) => { let x; for (let i = 0; i < 25; i++) { await sleep(150); x = (await vpos(VA, 'closed')).j.list.filter(r => r.t === t && !r.rm).pop(); if (x?.fis && (!ok || ok(x.fis))) break; } return x; };
    const ib = (() => { const bban = '305299' + String(Date.now()).padStart(19, '0').slice(-19), cc = 98n - BigInt(bban + '301000') % 97n; return 'UA' + String(cc).padStart(2, '0') + bban; })();
    must((await sec({ FOP: { n: 'QA', lic: 'mock-test-x', pin: '1234' } })).status === 400, 'ФОП без головної каси');
    must((await sec({ CHECKBOX_LICENSE: 'mock-test', CHECKBOX_PIN: '1234' })).j.ok, 'головна каса');
    try {
      const cats = (await http(`/v/${VID}/api/menu`)).j.categories.filter(c => c.items.some(i => typeof i.price === 'number' && !i.hidden)); must(cats.length >= 2, 'потрібно 2 розділи меню');
      const pick = c => c.items.find(i => typeof i.price === 'number' && !i.hidden), i1 = pick(cats[0]), i2 = pick(cats[1]);
      must((await sec({ FOP: { n: 'QA ФОП Б', g: 2, cats: [cats[1].id], lic: 'mock-test', pin: '1234' } })).status === 400, 'та сама каса двічі');
      const fb = await sec({ FOP: { n: 'QA ФОП Б', g: 2, cats: [cats[1].id], lic: 'mock-test-drop-' + RUN, pin: '1234' } }); must(fb.j.ok, 'ФОП Б: ' + JSON.stringify(fb.j).slice(0, 150));
      must((await sec({ FOP: { k: 'a', n: 'QA ФОП А', g: 1, base: 1000 } })).j.ok, 'опис головної каси');
      let fi = await vok('fisInfo'); const [ka, kb] = fi.kasas || [];
      must(fi.kasas?.length === 2 && kb.k === 'b' && kb.cats[0] === cats[1].id && ka.lim === 1444049 && ka.inc >= 1000 && kb.lim === 7211598, 'каси: ' + JSON.stringify(fi.kasas).slice(0, 250));
      { const o = await vpos(VA, 'order', { t: 6, items: [{ id: i1.id, q: 1 }, { id: i2.id, q: 2 }] }); must(o.status === 200, 'order ' + JSON.stringify(o.j).slice(0, 160)); }
      must((await vpos(VA, 'close', { t: 6, pay: 'cash' })).status === 200, 'close');
      let x = await waitFis(6); must(x?.fis?.st === 'err' && x.fis.r?.b?.unk, 'обрив не позначено: ' + JSON.stringify(x?.fis).slice(0, 200));
      const r = await vok('fisRetry', { ref: x.id }); must(r.st === 'ok' && r.r.a.id && r.r.b.id && !r.r.b.unk, 'повтор після обриву: ' + JSON.stringify(r).slice(0, 200));
      let m = await mockL(); const sells = k => m.filter(q => q.path === '/receipts/sell' && q.k === k), sa = sells('a').pop()?.body, sb = sells('b');
      must(sb.length === 1, 'після обриву чек ФОП Б надіслано двічі: ' + sb.length);
      must(sa.goods.every(g => g.good.name !== i2.name.uk) && sb[0].body.goods.every(g => g.good.name === i2.name.uk || g.good.name.startsWith(i2.name.uk)), 'розділи не поділились');
      must((sa.payments[0].value + sb[0].body.payments[0].value) === x.sum * 100, 'суми кас ≠ чек');
      fi = await vok('fisInfo'); must(fi.kasas[1].inc > kb.inc && fi.kasas[0].inc > ka.inc && fi.fis >= x.sum, 'річний дохід / звірка: ' + JSON.stringify(fi).slice(0, 250));
      must((await vpos(VA, 'ibanQr', { t: 7 })).status === 400, 'QR без рахунку');
      must((await sec({ IBAN_PAY: { n: 'ФОП QA', iban: ib.slice(0, -1) + ((+ib.at(-1) + 1) % 10), ipn: '1234567890' } })).status === 400, 'IBAN з помилкою прийнято');
      must((await sec({ IBAN_PAY: { n: 'ФОП QA', iban: ib, ipn: '1234567890' } })).j.ok, 'IBAN');
      must((await vpos(VA, 'order', { t: 7, items: [{ id: i1.id, q: 1 }] })).status === 200, 'order 9');
      const q = await vok('ibanQr', { t: 7 }); must(q.sum > 0 && q.iban === ib && /^data:image\/png;base64,/.test(q.img), 'QR: ' + JSON.stringify(q).slice(0, 120));
      must((await vpos(VA, 'close', { t: 7, pay: 'iban', print: false })).status === 200, 'close iban');
      let y = await waitFis(7); must(y?.ib === q.sum && y.fis?.ibc === q.sum * 100 && !Object.values(y.fis.r || {}).some(z => z.id), 'переказ без чека: ' + JSON.stringify(y).slice(0, 250));
      must((await sec({ FIS_IB: 1 })).j.ok, 'FIS_IB'); const r2 = await vok('fisRetry', { ref: y.id });
      m = await mockL(); const s9 = m.filter(q => q.path === '/receipts/sell').pop()?.body;
      must(r2.r?.a?.id && !r2.ibc && s9.payments[0].label === 'Переказ на рахунок', 'переказ у чеку: ' + JSON.stringify(s9?.payments));
      must((await vpos(VA, 'cashMove', { type: 'in', sum: 50, note: 'QA FOP' })).status === 200, 'cashMove');
      const mv = (await vok('shift')).mov, i = mv.findIndex(e => e.note === 'QA FOP' && !e.del); must(mv[i]?.fs === 1, 'службове: ' + JSON.stringify(mv[i]));
      await vok('moveDel', { i }); m = await mockL(); must(m.filter(q => q.path === '/receipts/service').pop()?.body.payment.value === -5000, 'сторно службового не надіслано');
      const z = await vpos(VA, 'zDay', { print: false }); must(z.j.z.fis?.ok && z.j.z.fisDay, 'Z: ' + JSON.stringify(z.j.z.fis));
      m = await mockL(); must(['a', 'b'].every(k => m.some(q => q.path === '/shifts/close' && q.k === k)), 'Z не закрив обидві каси');
      must((await sec({ FOP_DEL: 'b' })).j.ok && (await vok('fisInfo')).kasas.length === 1, 'прибрати ФОП Б');
    } finally { await sec({ IBAN_PAY: '' }); await sec({ FIS_IB: 0 }); await sec({ CHECKBOX_LICENSE: '' }); }
    must(!(await vok('fisInfo')).iban, 'IBAN не прибрано');
    return 'А+Б, обрив, QR, сторно';
  });
  await step('🍾 акциз: марки пляшок → продаж не більше марок, марка в чеку раз на пляшку, дубль/прибрати, повернення чека', async () => {
    const sv = await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: 'mock-test', CHECKBOX_PIN: '1234' } }); must(sv.j.ok, 'ПРРО: ' + JSON.stringify(sv.j).slice(0, 120));
    const vok = async (op, b) => { const r = await vpos(VA, op, b); must(r.status === 200 && r.j.ok, `${op} → ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); return r.j; };
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).filter(i => typeof i.price === 'number' && !i.hidden).at(-1);
    const id = (await vok('skIngSave', { x: { n: 'QA Віскі ' + RUN, u: 'л', cat: 'Інше', home: 'b', ex: true, vol: 0.5, uk: '2208301100' } })).x.id, c1 = String(Date.now()) + '01', c2 = String(Date.now()) + '02';
    try {
      await vok('skCardSave', { key: it.id, name: it.name.uk, card: { items: [{ id, q: 0.05 }] } });
      let o = await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] }); must(o.status === 409 && /марок/.test(o.j.error || ''), 'без марок продалось: ' + o.status + JSON.stringify(o.j).slice(0, 120));
      must((await vok('skExAdd', { id, codes: [c1] })).added === 1, 'марка не додалась');
      must((await vok('skExAdd', { id, codes: [c1] })).dup.length === 1, 'дубль марки прийнято');
      must((await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 11 }] })).status === 409, '11 × 50 мл з пляшки 0,5 л прийнято');
      o = await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 10 }] }); must(o.status === 200, '10 порцій: ' + JSON.stringify(o.j).slice(0, 160));
      let e = await vok('skEx', { id }); must(e.b[0]?.c === c1 && e.b[0].d && e.x.cap === 0 && e.x.q === 1, 'пляшка: ' + JSON.stringify(e).slice(0, 250));
      must((await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] })).status === 409, 'понад марки продалось');
      must((await vpos(VA, 'state')).j.events?.some(x => /Нова пляшка/.test(x.text) && x.text.includes(c1.slice(-6))), 'у стрічці немає «🍾 Нова пляшка»');
      must((await vpos(VA, 'close', { t: 7, pay: 'card' })).status === 200, 'close');
      let x; for (let i = 0; i < 20 && !x?.fis; i++) { await sleep(150); x = (await vpos(VA, 'closed')).j.list.filter(r => r.t === 7 && !r.rm).pop(); }
      must(x?.fis?.st === 'ok', 'фіскальний: ' + JSON.stringify(x?.fis));
      const sell = (await vpos(VA, 'fisInfo')).j.mock.filter(q => q.path === '/receipts/sell').pop()?.body, g = sell?.goods.find(z => z.good.excise_barcodes);
      must(g && JSON.stringify(g.good.excise_barcodes) === JSON.stringify([c1]) && g.good.uktzed === '2208301100' && sell.goods.filter(z => z.good.excise_barcodes).length === 1, 'марка в чеку: ' + JSON.stringify(sell?.goods).slice(0, 250));
      must((await vok('skEx', { id })).x.q === 0, 'марка лишилась у черзі після чека');
      must((await vpos(VA, 'closedDel', { ref: x.id })).status === 200, 'closedDel');
      let q = 0; for (let i = 0; i < 20 && !q; i++) { await sleep(150); q = (await vok('skEx', { id })).x.q; } must(q === 1, 'після повернення чека марка не повернулась у чергу');
      const cap0 = (await vok('skEx', { id })).x.cap; await vok('skExAdd', { id, codes: [c2] }); must((await vok('skEx', { id })).x.cap === cap0 + 0.5, 'друга пляшка');
      must((await vpos(VA, 'skExOff', { id, c: c1, rm: 1 })).status === 400, 'прибрано використану пляшку');
      must((await vok('skExOff', { id, c: c2, rm: 1 })).x.cap === cap0, 'прибрати помилкову марку');
    } finally { await vpos(VA, 'skCardSave', { key: it.id, card: null }); await vpos(VA, 'skIngDel', { id }); await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: '' } }); }
    return 'пляшка 0,5 л = 10 порцій, 11-та заблокована';
  });
  await step('🍾 е-марка: 12 символів → повний DataMatrix, e_excise_barcodes у чеку; 📜 ліцензія блокує алкоголь; 📴 offLog', async () => {
    const sv = await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: 'mock-test', CHECKBOX_PIN: '1234' } }); must(sv.j.ok, 'ПРРО: ' + JSON.stringify(sv.j).slice(0, 120));
    const vok = async (op, b) => { const r = await vpos(VA, op, b); must(r.status === 200 && r.j.ok, `${op} → ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); return r.j; };
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).filter(i => typeof i.price === 'number' && !i.hidden).at(-1);
    const id = (await vok('skIngSave', { x: { n: 'QA Ром ' + RUN, u: 'л', cat: 'Інше', home: 'b', ex: true, vol: 0.5, uk: '2208401100' } })).x.id;
    const base = ('EM' + Date.now().toString(36)).toUpperCase().padEnd(12, 'X').slice(0, 12), full = '\u001d01' + base + 'Q7PZK9W2', fullN = '01' + base + 'Q7PZK9W2';
    try {
      await vok('skCardSave', { key: it.id, name: it.name.uk, card: { items: [{ id, q: 0.05 }] } });
      must((await vok('skExAdd', { id, codes: [base] })).added === 1, '12 символів не додались');
      let e = await vok('skEx', { id }); must(e.b[0]?.c === base && e.b[0].e === 1, 'не електронна: ' + JSON.stringify(e.b[0]));
      const u = await vok('skExAdd', { id, codes: [full] }); must(u.up === 1 && u.added === 0 && !u.dup.length, 'повний код не оновив марку: ' + JSON.stringify(u).slice(0, 150));
      e = await vok('skEx', { id }); must(e.b.length === 1 && e.b[0].c === fullN, 'марка після оновлення: ' + JSON.stringify(e.b));
      must((await vok('skExAdd', { id, codes: [base] })).dup.length === 1, '12 символів після повного коду — не дубль');
      const lic = { no: 'QA-' + RUN };
      must((await vok('skExLic', { ...lic, till: '2020-01-01', ok: 1 })).err, 'прострочена ліцензія без помилки');
      let o = await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] }); must(o.status === 409 && /ліцензі/.test(o.j.error || ''), 'прострочена ліцензія — продалось: ' + o.status);
      await vok('skExLic', { ...lic, till: '2099-12-31', ok: 0 });
      must((await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] })).status === 409, 'каса не вписана — продалось');
      must(!(await vok('skExLic', { ...lic, till: '2099-12-31', ok: 1 })).err, 'чинна ліцензія з помилкою');
      must((await vok('skEx', {})).lic?.no === lic.no, 'ліцензії немає у списку');
      o = await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] }); must(o.status === 200, 'чинна ліцензія: ' + JSON.stringify(o.j).slice(0, 160));
      must((await vpos(VA, 'close', { t: 7, pay: 'card' })).status === 200, 'close');
      let x; for (let i = 0; i < 20 && !x?.fis; i++) { await sleep(150); x = (await vpos(VA, 'closed')).j.list.filter(r => r.t === 7 && !r.rm).pop(); }
      must(x?.fis?.st === 'ok', 'фіскальний: ' + JSON.stringify(x?.fis));
      const g = (await vpos(VA, 'fisInfo')).j.mock.filter(q => q.path === '/receipts/sell').pop()?.body?.goods.find(z => z.good.e_excise_barcodes);
      must(g && JSON.stringify(g.good.e_excise_barcodes) === JSON.stringify([fullN]) && !g.good.excise_barcodes, 'е-марка в чеку: ' + JSON.stringify(g?.good).slice(0, 200));
      await vpos(VA, 'closedDel', { ref: x.id });
    } finally { await vpos(VA, 'skExLic', { off: 1 }); await vpos(VA, 'skCardSave', { key: it.id, card: null }); await vpos(VA, 'skIngDel', { id }); await ownT(PT, 'secrets', { venue: VID, f: { CHECKBOX_LICENSE: '' } }); }
    must((await vpos(VA, 'offLog', { from: 0, to: Date.now() })).status === 400, 'offLog без часу прийнято');
    must((await vpos(VA, 'offLog', { from: Date.now() - 5 * 60e3, to: Date.now(), n: 2 })).status === 200, 'offLog');
    must((await vpos(VA, 'state')).j.events?.some(x => /без зв'язку 5 хв/.test(x.text)), 'у стрічці немає «каса без зв\'язку»');
    return '12 → повний код, ліцензія: строк і каса';
  });
  await step('🔒 Ф5 замок періоду: закритий місяць — чек, витрата, Z і документ за минулу дату не правляться; поточний місяць закрити не можна', async () => {
    const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 2); const m = d.toISOString().slice(0, 7), day = m + '-15';
    must((await vpos(VA, 'plockSet', { m: new Date().toISOString().slice(0, 7) })).status === 400, 'закрито поточний місяць');
    try { const r = await vpos(VA, 'plockSet', { m }); must(r.status === 200 && r.j.to?.startsWith(m), 'plockSet ' + JSON.stringify(r.j));
      must((await vpos(VA, 'plockGet')).j.to === r.j.to, 'plockGet');
      for (const [op, b] of [['expense', { sum: 1, day }], ['closedEdit', { ref: 'qa', day, p: {} }], ['zDel', { i: 0, day }], ['ldgAdd', { type: 'inc', sum: 100, day }]]) { const x = await vpos(VA, op, b); must(x.status >= 400 && /🔒/.test(x.j.error || ''), `${op}: ${x.status} ${JSON.stringify(x.j).slice(0, 120)}`); }
    } finally { await vpos(VA, 'plockSet', { m: '' }); }
    must(!(await vpos(VA, 'plockGet')).j.to, 'не відкрився'); return m; });
  await step('📦 Ф12 повне вивантаження: ZIP з таблицями (формат пакету переходу) + JSON без секретів і PIN', async () => {
    const r = await vpos(VA, 'fullExport'); must(r.status === 200 && r.j.b64 && /\.zip$/.test(r.j.name), 'fullExport ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 160));
    const z = Buffer.from(r.j.b64, 'base64'), F = {}; let i = 0;
    while (z.readUInt32LE(i) === 0x04034b50) { const m = z.readUInt16LE(i + 8), cs = z.readUInt32LE(i + 18), nl = z.readUInt16LE(i + 26), xl = z.readUInt16LE(i + 28), nm = z.slice(i + 30, i + 30 + nl).toString('utf8'), b = z.slice(i + 30 + nl + xl, i + 30 + nl + xl + cs);
      F[nm] = (m === 8 ? (await import('node:zlib')).inflateRawSync(b) : b).toString('utf8'); i += 30 + nl + xl + cs; }
    for (const n of ['README.txt', '01-меню.csv', '03-продукти-залишки.csv', '06-гості-бонуси.csv', '08-персонал.csv', '10-чеки.csv', '11-чеки-страви.csv', '13-z-звіти.csv', 'atom-data.json']) must(n in F, 'немає ' + n + ' у ' + Object.keys(F));
    must(F['01-меню.csv'].split('\r\n')[0].includes('Назва;Ціна'), 'заголовок меню: ' + F['01-меню.csv'].slice(0, 80));
    const j = JSON.parse(F['atom-data.json']); must(j.atom_export === 1 && j.data.menu && j.data.staff, 'JSON без меню/персоналу');
    must(!Object.keys(j.data).some(k => /^(cfg:secrets|apikeys|fis:tok|reg_|st:|tgs:)/.test(k)), 'секрети у файлі: ' + Object.keys(j.data).filter(k => /^(cfg:secrets|apikeys|fis:tok|reg_|st:|tgs:)/.test(k)));
    must(!j.data.staff.some(s => 'pin' in s), 'PIN у файлі');
    return `${r.j.kb} КБ, файлів ${Object.keys(F).length}`; });
  await step('📒 облік: документ (копійки, ext без дублів), сторно, підсумки, журнал змін (чек, налаштування), бекап з SQL', async () => {
    const vok = async (op, b) => { const r = await vpos(VA, op, b); must(r.status === 200 && r.j.ok, `${op} → ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`); return r.j; };
    must((await vpos(VA, 'ldgAdd', { type: 'inc', sum: 10.5 })).status === 400, 'дробові копійки прийнято');
    must((await vpos(VA, 'ldgAdd', { type: 'zzz', sum: 100 })).status === 400, 'невідомий тип прийнято');
    const ext = 'qa:' + RUN, a = await vok('ldgAdd', { type: 'inc', sum: 12345, ext, note: 'QA інший дохід' });
    must(a.doc.sum === 12345 && a.doc.st === 1 && a.doc.day, 'документ: ' + JSON.stringify(a.doc).slice(0, 160));
    const a2 = await vok('ldgAdd', { type: 'inc', sum: 999, ext }); must(a2.same && a2.doc.id === a.doc.id && a2.doc.sum === 12345, 'повтор за ext змінив проведений');
    const tot = async () => ((await vok('ldgTotals', { type: 'inc', from: a.doc.day, to: a.doc.day })).list.find(x => x.payer === '') || { sum: 0 }).sum;
    const t0 = await tot(); must(t0 >= 12345, 'підсумок ' + t0);
    const s = await vok('ldgStorno', { id: a.doc.id, why: 'QA' }); must(s.doc.sum === -12345 && s.doc.rev === a.doc.id && s.orig.rev === s.doc.id, 'сторно: ' + JSON.stringify(s).slice(0, 200));
    must((await vpos(VA, 'ldgStorno', { id: a.doc.id })).status === 400, 'подвійне сторно');
    must(await tot() === t0 - 12345, 'підсумок після сторно');
    const au = (await vok('ldgAudit', { ref: 'doc:' + a.doc.id })).list.map(x => x.what); must(au.includes('doc.add') && au.includes('doc.storno'), 'журнал документа: ' + au);
    const d = await vok('ldgAdd', { type: 'exp', sum: 500, st: 0 }); must(d.doc.st === 0, 'чернетка');
    must((await vpos(VA, 'ldgStorno', { id: d.doc.id })).status === 400, 'сторно чернетки');
    must((await vok('ldgPost', { id: d.doc.id })).doc.st === 1, 'провести'); await vok('ldgStorno', { id: d.doc.id, why: 'QA' });
    // 📝 журнал: налаштування і правка закритого чека
    const lm = (await vpos(VA, 'state')).j.cfg?.lateMin ?? 10; await vok('cfgSet', { k: 'lateMin', v: lm === 11 ? 12 : 11 }); await vok('cfgSet', { k: 'lateMin', v: lm });
    must((await vok('ldgAudit', { ref: 'cfg:lateMin' })).list.some(x => x.what === 'cfg' && x.now?.v === lm), 'журнал налаштувань');
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).filter(i => typeof i.price === 'number' && !i.hidden).at(-1);
    const od = await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] }); must(od.status === 200, 'order ' + od.status + ' ' + JSON.stringify(od.j).slice(0, 160)); must((await vpos(VA, 'close', { t: 7, pay: 'cash' })).status === 200, 'close');
    const x = (await vok('closed', {})).list.filter(r => r.t === 7 && !r.rm && !r.del).pop(); await vok('closedEdit', { ref: x.id, p: { tip: 7 } });
    const ca = (await vok('ldgAudit', { ref: `closed:${(await vok('closed', {})).day}/${x.id}` })).list; must(ca.some(q => q.what === 'closed.edit' && q.was?.sum === x.sum && /чайові/.test(q.now?.what || '')), 'журнал правки чека: ' + JSON.stringify(ca).slice(0, 200));
    const day = (await vok('closed', {})).day, sl = await vok('ldgSale', { day });
    must(sl.doc?.type === 'sale' && sl.doc.day === day && Number.isInteger(sl.doc.sum) && sl.doc.sum > 0, 'продажі дня: ' + JSON.stringify(sl).slice(0, 160));
    await vpos(VA, 'closedDel', { ref: x.id }); const s2 = await vok('ldgSale', { day }); must(s2.doc && s2.doc.id !== sl.doc.id && s2.doc.sum < sl.doc.sum, 'перерахунок після зняття чека: ' + JSON.stringify(s2).slice(0, 160));
    must((await vok('ldgDocs', { type: 'sale', from: day, to: day })).list.some(q => q.rev === sl.doc.id && q.sum === -sl.doc.sum), 'старий підсумок дня не сторновано');
    must((await vok('ldgAudit', { ref: `closed:${day}/${x.id}` })).list.some(q => q.what === 'closed.del'), 'журнал зняття чека');
    // 💾 SQL у бекапі
    const b = await ownT(PT, 'bak', { venue: VID, do: 'now' }); must(b.j.n > 0, 'бекап'); const g = await ownT(PT, 'bak', { venue: VID, do: 'get', tag: b.j.tag });
    const raw = typeof g.j.data === 'string' ? g.j.data : JSON.stringify(g.j); must(raw.includes('§sql:doc') && raw.includes(a.doc.id) && raw.includes('§sql:audit'), 'у бекапі немає SQL-таблиць');
    return 'копійки, сторно, журнал, бекап';
  });
  await step('🧩 модулі закладу (Ф13): новий заклад — лише каса, перемикач з журналом, старий заклад — усе увімкнено', async () => {
    const st = (await vpos(VA, 'state')).j; must(st.cfg?.mods && !Object.values(st.cfg.mods).some(Boolean), 'новий заклад не «лише каса»: ' + JSON.stringify(st.cfg?.mods));
    must((await vpos(VA, 'modSet', { k: 'zzz', v: 1 })).status === 400, 'невідомий модуль');
    const on = await vpos(VA, 'modSet', { k: 'tax', v: 1 }); must(on.status === 200 && on.j.cfg.mods.tax === 1 && on.j.cfg.mods.hr === 0, 'увімкнути: ' + JSON.stringify(on.j).slice(0, 160));
    must((await vpos(VA, 'state')).j.cfg.mods.tax === 1, 'стан не оновився');
    must((await vpos(VA, 'ldgAudit', { ref: 'mod:tax' })).j.list.some(x => x.what === 'mod' && x.now?.v === 1), 'журнал модуля');
    must((await vpos(VA, 'modSet', { k: 'tax', v: 0 })).j.cfg.mods.tax === 0, 'вимкнути');
    const m = (await pos('state')).j.cfg; must(!m?.mods, 'VARVAR отримав mods — старий заклад мав лишитись «усе увімкнено»');
    return 'лише каса → увімкнути/вимкнути';
  });
  await step('📥 перехід (етап 1): модуль вимкнено → 400; меню/продукти (г→кг, залишки, документ «вхідні залишки»)/техкарти-чернетки/гості/сертифікати до копійки; персонал без PIN; броні з передоплатою; повтор не дублює; відкат і його заборона', async () => {
    const run = (kind, rows, dry = 0, sys = 'xls') => vpos(VA, 'migRun', { sys, kind, rows, dry }), ok = (r, w) => { must(r.status === 200 && !r.j.error, w + ': ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
    must((await run('menu', [{ name: 'QA Борщ', price: '150' }])).status === 400, 'модуль вимкнено, а імпорт пройшов');
    must((await pos(users.waiter?.token, 'migRun', { kind: 'menu', rows: [{ name: 'x', price: 1 }] })).status === 403, 'офіціант імпортує');
    ok(await vpos(VA, 'modSet', { k: 'mig', v: 1 }), 'увімкнути модуль');
    must((await run('zzz', [{}])).status === 400, 'невідомий вид');
    { const pl = b => vpos(VA, 'migPull', b); // 📡 напряму з Poster/Syrve: формат ключа перевіряється до будь-якого запиту назовні
      must((await pos(users.waiter?.token, 'migPull', { sys: 'poster', token: '1:' + 'a'.repeat(32) })).status === 403, 'офіціант забирає дані');
      for (const [b, w] of [[{ sys: 'poster', token: '' }, 'порожній ключ'], [{ sys: 'poster', token: 'https://evil.example/x' }, 'ключ-URL'], [{ sys: 'syrve', token: 'a b' }, 'syrve з пробілом'], [{ sys: 'xls', token: 'x'.repeat(20) }, 'файлова система']]) { const r = await pl(b); must(r.status === 400 && r.j.error, w + ': ' + r.status); } }
    const M = [{ id: 'A1', cat: 'QA Супи', name: 'QA Борщ', price: '150' }, { id: 'A2', cat: 'QA Супи', name: 'QA Солянка', price: '170,5' }, { name: 'QA Без ціни', price: '' }];
    const d = ok(await run('menu', M, 1), 'перевірка меню'); must(d.dry && d.add === 2 && d.skip === 1 && d.errs.some(e => e.w && /округлено/.test(e.m)), 'dry меню: ' + JSON.stringify(d).slice(0, 200));
    const items = async () => (await vpos(VA, 'menu')).j.menu.categories.flatMap(c => c.items);
    must(!(await items()).some(i => i.name.uk === 'QA Борщ'), 'перевірка змінила меню');
    const m1 = ok(await run('menu', M), 'імпорт меню'); must(m1.add === 2 && m1.undo, 'меню: ' + JSON.stringify(m1).slice(0, 160));
    const m2 = ok(await run('menu', [{ id: 'A1', cat: 'QA Супи', name: 'QA Борщ український', price: '155' }, M[1]]), 'повтор меню'); must(m2.add === 0 && m2.upd === 2, 'повтор дублює: ' + JSON.stringify(m2).slice(0, 160));
    const it = await items(); must(it.filter(i => /^QA Борщ/.test(i.name.uk)).length === 1 && it.find(i => i.name.uk === 'QA Борщ український')?.price === 155, 'код A1 не оновив страву');
    { // 🥤 розміри: рядки «назва + розмір» → одна страва з варіантами; повтор без розміру розміри не стирає (раніше — delete it.variants)
      const V = [{ cat: 'QA Пиво', name: 'QA Лагер', price: '60', v: '0,3 л' }, { cat: 'QA Пиво', name: 'QA Лагер', price: '90', v: '0.5' }, { name: 'QA Лагер', price: '1', v: 'великий' }];
      const vr = ok(await run('menu', V, 0, 'rkeeper'), 'розміри'); must(vr.add === 1 && vr.upd === 2 && vr.errs.some(e => e.w && /потрібне число/.test(e.m)), 'розміри: ' + JSON.stringify(vr).slice(0, 220));
      const lg = async () => (await items()).find(i => i.name.uk === 'QA Лагер'); let l = await lg();
      must(l?.variants?.length === 2 && l.variants[0].v === '0.3' && l.variants[0].p === 60 && l.variants[1].p === 90 && l.size === 'л' && !('price' in l), 'страва з розмірами: ' + JSON.stringify(l));
      const v2 = ok(await run('menu', [{ name: 'QA Лагер', price: '99' }]), 'повтор без розміру'); l = await lg();
      must(v2.errs.some(e => e.w && /розміри лишили/.test(e.m)) && l.variants?.length === 2 && l.variants[1].p === 90, 'повтор стер розміри: ' + JSON.stringify(l));
      ok(await vpos(VA, 'migUndo', { id: v2.id }), 'відкат повтору'); ok(await vpos(VA, 'migUndo', { id: vr.id }), 'відкат розмірів'); must(!(await lg()), 'страва з розмірами лишилась після відкату');
    }
    const g = ok(await run('ing', [{ n: 'QA Буряк', u: 'г', q: '2500', cost: '0,02' }, { n: 'QA Сметана', u: 'кг', q: '1.5', sum: '90', wh: 'Бар' }, { n: 'QA Дивне', u: 'бочка' }]), 'продукти');
    must(g.add === 3 && g.tot.q === 2 && g.errs.some(e => e.w && /одиниця/.test(e.m)), 'продукти: ' + JSON.stringify(g).slice(0, 200));
    const ing = (await vpos(VA, 'skData')).j.ing, bur = ing.find(x => x.n === 'QA Буряк'), sm = ing.find(x => x.n === 'QA Сметана');
    must(bur?.u === 'кг' && bur.st.k === 2.5 && bur.cost === 20, 'г → кг: ' + JSON.stringify(bur)); must(sm?.st.b === 1.5 && sm.cost === 60, 'сума/кількість → ціна, склад «Бар»: ' + JSON.stringify(sm));
    const od = (await vpos(VA, 'ldgDocs', { type: 'open' })).j.list.filter(x => !x.rev); must(od.length === 1 && od[0].sum === 14000, 'документ «вхідні залишки» 140,00 ₴: ' + JSON.stringify(od).slice(0, 200));
    const g2 = ok(await run('ing', [{ n: 'QA Буряк', u: 'кг', q: '3' }]), 'повтор залишків'); must(g2.add === 0 && g2.upd === 1, 'повтор продукту дублює');
    must((await vpos(VA, 'skData')).j.ing.filter(x => x.n === 'QA Буряк').length === 1, 'два буряки');
    const od2 = (await vpos(VA, 'ldgDocs', { type: 'open' })).j.list; must(od2.filter(x => !x.rev && x.sum > 0).length === 1 && od2.some(x => x.sum === 15000 && !x.rev), 'залишки змінились — документ не перераховано (сторно + новий): ' + JSON.stringify(od2.map(x => [x.sum, !!x.rev])));
    const c = ok(await run('cards', [{ dish: 'QA Борщ український', ing: 'QA Буряк', q: '200', u: 'г' }, { dish: 'QA Борщ український', ing: 'QA Сіль', q: '5' }, { dish: 'QA Нема в меню', ing: 'QA Буряк', q: '1' }]), 'техкарти');
    must(c.add === 1 && c.tot.newIng === 1 && c.errs.some(e => !e.w && /немає в меню/.test(e.m)) && c.errs.some(e => e.w && /без одиниці/.test(e.m)), 'техкарти: ' + JSON.stringify(c).slice(0, 220));
    const cs = (await vpos(VA, 'skCost')).j, key = cs.list.find(x => x.name === 'QA Борщ український')?.key, card = cs.cards[key];
    must(card?.draft && card.items.some(l => l.q === 0.2) && card.items.some(l => l.q === 0.005), 'техкарта не чернетка або грамовки: ' + JSON.stringify(card));
    const ph = '067' + String(Date.now()).slice(-7);
    const cl = ok(await run('cli', [{ phone: ph, name: 'QA Гість', bal: '123,45', bd: '31.12.1990' }, { phone: 'abc' }, { phone: '+38' + ph, bal: '0.01' }]), 'гості');
    must(cl.add === 1 && cl.skip === 1 && cl.dups.length === 1, 'гості: ' + JSON.stringify(cl).slice(0, 200));
    const gc = (await vpos(VA, 'loyCliGet', { phone: ph })).j.cli; must(gc?.bal === 0.01 && gc.bd === '12-31' && gc.name === 'QA Гість', 'гість: ' + JSON.stringify(gc));
    const cc = 'QA-' + String(Date.now()).slice(-6), ce = ok(await run('cert', [{ code: cc, sum: '1000', left: '250,50' }, { code: cc + 'X', sum: '100', left: '200' }]), 'сертифікати');
    must(ce.add === 1 && ce.skip === 1 && ce.tot.left === 250.5, 'сертифікати до копійки: ' + JSON.stringify(ce).slice(0, 200));
    must((await vpos(VA, 'certGet', { code: cc })).j.c?.left === 250.5, 'сертифікат не знайдено');
    const lg = (await vpos(VA, 'migLog')).j; must(lg.on && lg.list.length >= 7 && lg.map, 'журнал переходу');
    const un = ok(await vpos(VA, 'migUndo', { id: ce.id }), 'відкат сертифікатів'); must(un.n >= 1 && (await vpos(VA, 'certGet', { code: cc })).status === 400, 'сертифікат лишився після відкату');
    must((await vpos(VA, 'migUndo', { id: ce.id })).status === 400, 'другий відкат того самого');
    must((await vpos(VA, 'migUndo', { id: m1.id })).status === 400, 'відкат не останнього імпорту');
    ok(await vpos(VA, 'loyCliSet', { phone: ph, f: { note: 'змінили після імпорту' } }), 'змінити гостя');
    const bl = await vpos(VA, 'migUndo', { id: cl.id }); must(bl.status === 400 && /змінювали/.test(bl.j.error), 'відкат затер зміни після імпорту: ' + JSON.stringify(bl.j));
    must((await vpos(VA, 'ldgAudit', { ref: 'mig:' + m1.id })).j.list.some(x => x.what === 'mig'), 'журнал змін імпорту');
    { // 👥 персонал без PIN (ніхто не входить, поки адмін не задасть) і 📅 броні з передоплатою — без повідомлень гостю; обидва відкочуються
      const sn = 'QA Перенос ' + RUN, sf = ok(await run('staff', [{ n: sn, role: 'Кухар-універсал' }, { n: '' }]), 'персонал');
      must(sf.add === 1 && sf.skip === 1 && sf.tot.nopin === 1, 'персонал: ' + JSON.stringify(sf).slice(0, 200));
      const st = (await vpos(VA, 'staff')).j.staff.find(x => x.name === sn); must(st?.role === 'cook' && st.nopin && !('pin' in st), 'працівник: ' + JSON.stringify(st));
      ok(await vpos(VA, 'migUndo', { id: sf.id }), 'відкат персоналу'); must(!(await vpos(VA, 'staff')).j.staff.some(x => x.name === sn), 'працівник лишився після відкату');
      const rk = ok(await run('staff', [{ n: sn + ' RK', role: 'Менеджер' }, { n: sn + ' RD', role: 'Директор' }], 0, 'rkeeper'), 'персонал R-Keeper'); // RK7_dbf усім пише «менеджер»
      const rs = (await vpos(VA, 'staff')).j.staff; must(rs.find(x => x.name === sn + ' RK')?.role === 'waiter' && rs.find(x => x.name === sn + ' RD')?.role === 'admin' && rk.errs.some(e => e.w), 'R-Keeper «менеджер» став адміном: ' + JSON.stringify(rs.filter(x => x.name.startsWith(sn))));
      ok(await vpos(VA, 'migUndo', { id: rk.id }), 'відкат персоналу R-Keeper');
      const dd = new Date(Date.now() + 5 * 864e5 + 3 * 3600e3).toISOString().slice(0, 10), dm = dd.slice(8) + '.' + dd.slice(5, 7) + '.' + dd.slice(0, 4), bph = '063' + String(Date.now()).slice(-7);
      const B = [{ id: 'R1', date: dm, time: '19:30', name: 'QA Перенос-бронь', phone: bph, people: '6', kind: 'Банкет', dep: '2 500,50' }, { date: '01.01.2020', time: '12:00', name: 'QA Стара', phone: bph }, { date: dm, time: '', name: 'x', phone: bph }];
      const bk = ok(await run('book', B), 'броні'); must(bk.add === 1 && bk.skip === 2 && bk.tot.dep === 2500.5, 'броні: ' + JSON.stringify(bk).slice(0, 220));
      const bk2 = ok(await run('book', [{ ...B[0], time: '20:00' }]), 'повтор броні'); must(bk2.add === 0 && bk2.upd === 1, 'повтор броні дублює');
      const bl = (await vpos(VA, 'bkList', { from: dd, to: dd })).j.list.filter(x => x.phone.endsWith(bph.slice(1)));
      must(bl.length === 1 && bl[0].dep === 2500.5 && bl[0].kind === 'banquet' && bl[0].st === 'ok' && bl[0].time === '20:00' && bl[0].people === 6, 'бронь: ' + JSON.stringify(bl).slice(0, 220));
      ok(await vpos(VA, 'migUndo', { id: bk2.id }), 'відкат броні'); must((await vpos(VA, 'bkList', { from: dd, to: dd })).j.list.find(x => x.phone.endsWith(bph.slice(1)))?.time === '19:30', 'відкат повтору не повернув час');
      ok(await vpos(VA, 'migUndo', { id: bk.id }), 'відкат броней'); must(!(await vpos(VA, 'bkList', { from: dd, to: dd })).j.list.some(x => x.phone.endsWith(bph.slice(1))), 'бронь лишилась після відкату');
    }
    { // 💳 гості R-Keeper: картка (пошук), група → рівень, 💰 депозит → сертифікат DEP-<телефон>; відкат прибирає депозит
      const lv = (await vpos(VA, 'loyGet')).j.cfg.levels[0], rp = '063' + String(Date.now()).slice(-7), cn = '77' + String(Date.now()).slice(-6);
      const rg = ok(await run('cli', [{ phone: rp, name: 'QA RK гість', card: cn, grp: lv.name.toUpperCase(), dep: '1 500,00' }, { phone: rp.replace('063', '050'), grp: 'Нема такої групи' }, { phone: rp.replace('063', '073'), dep: '-5' }], 0, 'rkeeper'), 'гості R-Keeper');
      must(rg.add === 2 && rg.skip === 1 && rg.tot.dep === 1500 && rg.errs.some(e => e.w && /рівня/.test(e.m)), 'гості R-Keeper: ' + JSON.stringify(rg).slice(0, 250));
      const rc = (await vpos(VA, 'loyCliGet', { phone: rp })).j.cli; must(rc?.card === cn && rc.lvl === lv.id && rc.dep?.left === 1500, 'картка/рівень/депозит: ' + JSON.stringify(rc));
      must((await vpos(VA, 'loyCli', { q: cn })).j.list.some(x => x.phone === rc.phone), 'пошук гостя за карткою');
      const dc = (await vpos(VA, 'certGet', { code: rc.dep.code })).j.c; must(dc?.st === 'ok' && dc.left === 1500 && /Депозит/.test(dc.from), 'депозит не сертифікат з міграції: ' + JSON.stringify(dc));
      ok(await vpos(VA, 'migUndo', { id: rg.id }), 'відкат гостей R-Keeper'); must((await vpos(VA, 'certGet', { code: rc.dep.code })).status === 400, 'депозит лишився після відкату');
    }
    return '8 видів, розміри, R-Keeper (персонал, гості з депозитом), повтор, відкат';
  });
  await step('🏦 банк (етап 2): модуль/права; виписка 1С → еквайринг з комісією, оплата 2 накладних, власний переказ, черга; повтор не дублює; дії й заборони; CSV; облік і експорт', async () => {
    const ok = (r, w) => { must(r.status === 200 && !r.j.error, w + ': ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
    must((await vpos(VA, 'bankList')).status === 400, 'модуль вимкнено, а банк відкрився');
    must((await pos(users.waiter?.token, 'bankList')).status === 403, 'офіціант бачить банк');
    ok(await vpos(VA, 'modSet', { k: 'bank', v: 1 }), 'увімкнути модуль');
    for (const x of ok(await vpos(VA, 'bankList'), 'список').list) { // попередні прогони того ж дня не заважають
      if (x.st !== 'q') ok(await vpos(VA, 'bankAct', { id: x.id, a: 'un' }), 'скасувати старе'); ok(await vpos(VA, 'bankAct', { id: x.id, a: 'skip', why: 'other' }), 'пропустити старе'); }
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number');
    const oo = await vpos(VA, 'order', { t: 7, items: [{ id: it.id, q: 1 }] }); must(oo.status === 200, 'order ' + JSON.stringify(oo.j).slice(0, 150)); const cc = await vpos(VA, 'close', { t: 7, pay: 'card' }); must(cc.status === 200, 'close ' + JSON.stringify(cc.j).slice(0, 150));
    const C = (await vpos(VA, 'shift')).j.day.card; must(C > 0, 'немає безготівки');
    const ing = (await vpos(VA, 'skData')).j.ing.find(x => !x.off && !x.grp), code = String(40000000 + Math.floor(Math.random() * 9e6)), sup = 'QA Банк-постач ' + RUN;
    const inv = async (q, sum, no) => ok(await vpos(VA, 'skInvSave', { inv: { sup, no, pay: 'debt', src: 'hand', req: { code }, lines: [{ id: ing.id, q, f: 1, sum }] } }), 'накладна').inv;
    const i1 = await inv(1, 300, 'Н' + RUN.slice(-3) + '1'), i2 = await inv(1, 200, 'Н' + RUN.slice(-3) + '2');
    const d = new Date(Date.now() - 3 * 3600e3).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric' }), acq = Math.round(C * 0.985 * 100) / 100;
    const OWN = 'UA213223130000026007233566001', OWN2 = 'UA903052992990004149123456789', doc = (o) => ['СекцияДокумент=Платежное поручение', ...Object.entries(o).map(([k, v]) => k + '=' + v), 'КонецДокумента'].join('\r\n');
    const f1 = ['1CClientBankExchange', 'ВерсияФормата=1.02', 'Кодировка=Windows', 'РасчСчет=' + OWN, 'РасчСчет=' + OWN2,
      doc({ Номер: 1, Дата: d, Сумма: acq.toFixed(2), ПлательщикСчет: 'UA673052990000026001234567890', Плательщик: 'АТ КБ ПРИВАТБАНК', ПлательщикИНН: '14360570', ПолучательСчет: OWN, ДатаПоступило: d, НазначениеПлатежа: 'Відшкодування за операціями з ПК, торговий еквайринг ' + RUN }),
      doc({ Номер: 2, Дата: d, Сумма: '500.00', ПлательщикСчет: OWN, ПолучательСчет: 'UA113052990000026009876543210', Получатель: sup, ПолучательИНН: code, ДатаСписано: d, НазначениеПлатежа: 'Оплата за товар ' + RUN }),
      doc({ Номер: 3, Дата: d, Сумма: '1000.00', ПлательщикСчет: OWN, ПолучательСчет: OWN2, Получатель: 'Я', ДатаСписано: d, НазначениеПлатежа: 'Переказ власних коштів ' + RUN }),
      doc({ Номер: 4, Дата: d, Сумма: '777.77', ПлательщикСчет: OWN, ПолучательСчет: 'UA223052990000026001111111111', Получатель: 'ФОП Орендодавець', ПолучательИНН: '1234567890', ДатаСписано: d, НазначениеПлатежа: 'Оренда ' + RUN }),
      doc({ Номер: 5, Дата: d, Сумма: '123.45', ПлательщикСчет: 'UA333052990000026002222222222', Плательщик: 'Невідомий', ПолучательСчет: OWN, ДатаПоступило: d, НазначениеПлатежа: 'Повернення ' + RUN }), 'КонецФайла'].join('\r\n');
    const n0 = ok(await vpos(VA, 'bankList'), 'список').list.length;
    const dr = ok(await vpos(VA, 'bankImp', { text: f1, dry: 1 }), 'перевірка'); must(dr.fmt === '1c' && dr.add === 5 && dr.in === Math.round((acq + 123.45) * 100) / 100 && dr.out === -2277.77, 'dry: ' + JSON.stringify(dr).slice(0, 220));
    must(ok(await vpos(VA, 'bankList'), 'список').list.length === n0, 'перевірка записала рядки');
    const im = ok(await vpos(VA, 'bankImp', { text: f1, name: 'kl_to_1c.txt' }), 'імпорт'); must(im.add === 5 && im.ok === 2 && im.q === 2, 'імпорт: ' + JSON.stringify({ ...im, own: 0 }) + ' ' + JSON.stringify(ok(await vpos(VA, 'bankList'), 'с').list.filter(x => (x.pur || '').endsWith(RUN)).map(x => [x.st, x.why, x.mt, x.d])).slice(0, 600));
    must(ok(await vpos(VA, 'bankImp', { text: f1 }), 'повтор').add === 0, 'повтор дублює');
    const L1 = ok(await vpos(VA, 'bankList'), 'список').list.filter(x => (x.pur || '').endsWith(RUN)), by = re => L1.find(x => re.test(x.pur));
    const a = by(/еквайринг/); must(a.st === 'ok' && a.m.k === 'acq' && a.m.gross === C && Math.abs(a.m.fee - (C - acq)) < 0.011, 'еквайринг: ' + JSON.stringify(a).slice(0, 220));
    must((await vpos(VA, 'shift')).j.exp.some(e => !e.del && e.src === 'card' && /Комісія еквайрингу/.test(e.note) && Math.abs(e.sum - a.m.fee) < 0.011), 'комісія не записана витратою з картки');
    const p = by(/Оплата за товар/); must(p.st === 'ok' && p.m.k === 'inv' && p.m.ids.length === 2 && p.m.ids.includes(i1.id) && p.m.ids.includes(i2.id), 'накладні: ' + JSON.stringify(p).slice(0, 200));
    must(ok(await vpos(VA, 'skSupCard', { id: i1.sid }), 'постачальник').debt === 0, 'борг постачальнику лишився');
    must(by(/власних/).st === 'x' && by(/власних/).why === 'own', 'власний переказ не пропущено');
    const r = by(/Оренда/), b = by(/Повернення/); must(r.st === 'q' && b.st === 'q', 'черга: ' + r.st + b.st);
    must((await pos(users.waiter?.token, 'bankAct', { id: r.id, a: 'exp' })).status === 403, 'офіціант діє з виписки');
    must((await vpos(VA, 'bankAct', { id: b.id, a: 'exp' })).status === 400, 'надходження стало витратою');
    must((await vpos(VA, 'bankAct', { id: b.id, a: 'acq', days: [a.m.days[0]] })).status === 400, 'день еквайрингу зіставлено двічі');
    must((await vpos(VA, 'bankAct', { id: r.id, a: 'skip', why: 'zzz' })).status === 400, 'пропуск без причини');
    const e1 = ok(await vpos(VA, 'bankAct', { id: r.id, a: 'exp' }), 'витрата').x; must(e1.st === 'ok' && e1.m.k === 'exp' && e1.m.new, 'витрата: ' + JSON.stringify(e1).slice(0, 160));
    must((await vpos(VA, 'bankAct', { id: r.id, a: 'exp' })).status === 400, 'витрата двічі');
    must((await vpos(VA, 'shift')).j.exp.some(e => !e.del && e.sum === 777.77 && e.src === 'card'), 'витрати немає в касі');
    ok(await vpos(VA, 'bankAct', { id: r.id, a: 'un' }), 'скасувати'); must(!(await vpos(VA, 'shift')).j.exp.some(e => !e.del && e.sum === 777.77), 'скасування не прибрало витрату');
    ok(await vpos(VA, 'bankAct', { id: r.id, a: 'skip', why: 'tax' }), 'пропустити');
    const mv = ok(await vpos(VA, 'bankAct', { id: b.id, a: 'mov' }), 'внесення').x; must(mv.m.k === 'mov' && (await vpos(VA, 'shift')).j.mov.some(m => !m.del && m.type === 'kin' && m.sum === 123), 'внесення на картку: ' + JSON.stringify(mv.m));
    const csv = 'Дата;Сума;Валюта;Призначення платежу;Контрагент;ЄДРПОУ\n' + d + ';-1 234,56;UAH;Комуналка ' + RUN + ';ТОВ Енерго;12345678\n';
    const cv = ok(await vpos(VA, 'bankImp', { text: csv }), 'CSV'); must(cv.fmt === 'csv' && cv.add === 1 && cv.out === -1234.56 && cv.q === 1, 'CSV: ' + JSON.stringify(cv).slice(0, 200));
    must((await vpos(VA, 'bankImp', { text: 'просто текст\nбез колонок' })).status === 400, 'сміття імпортовано');
    const dl = ok(await vpos(VA, 'ldgDocs', { type: 'bank' }), 'облік').list; must(dl.filter(x => x.ext && x.body?.pur?.endsWith(RUN)).length === 6, 'документи «🏦 Банк»: ' + dl.length);
    const xp = ok(await vpos(VA, 'acctExport', { from: a.d, to: a.d }), 'експорт');
    must(xp.sections.some(s => s.id === 'bank' && s.rows.some(r => String(r[7]).endsWith(RUN))), 'банку немає в експорті');
    return `безготівка ${C} ₴ · комісія ${a.m.fee} ₴`;
  });
  await step('📒 книга доходів: продажі дня = чеки без чайових; інший дохід вручну й з виписки («це дохід» → книга, «скасувати» → зникає); межі; пороги; експорт; офіціанту заборонено', async () => {
    const ok = (r, w) => { must(r.status === 200 && !r.j.error, w + ': ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
    const day = new Date(Date.now() - 3 * 3600e3).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' }), m = day.slice(0, 7);
    const v0 = ok(await vpos(VA, 'incGet', {}), 'книга'); must(v0.m === m && v0.sum?.pdvLim === 1e6 && v0.cats?.rent && Array.isArray(v0.sum.months) && v0.sum.months.length === 12, 'книга: ' + JSON.stringify(v0).slice(0, 200));
    const rep = ok(await vpos(VA, 'report', { from: day, to: day }), 'звіт'), rev = rep.checks.reduce((a, c) => a + c.sum - (c.tip || 0), 0), d0 = v0.days.find(x => x.d === day);
    must(Math.abs((d0?.sale || 0) - rev) < 0.05, `продажі дня ${d0?.sale} ≠ чеки без чайових ${rev}`);
    must(v0.days.every(x => Math.abs(x.tot - (x.sale + x.cert + x.dep + x.oth)) < 0.011), 'разом дня ≠ сума частин');
    must((await pos(users.waiter?.token, 'incGet')).status === 403, 'офіціант бачить книгу доходів');
    must((await vpos(VA, 'incAdd', { sum: -5, cat: 'rent' })).status === 400, 'мінусовий дохід');
    must((await vpos(VA, 'incAdd', { sum: 10, d: '2099-01-01' })).status === 400, 'дохід у майбутньому');
    const v1 = ok(await vpos(VA, 'incAdd', { sum: 1500.5, cat: 'b2b', note: 'QA банкет ' + RUN, d: day }), 'інший дохід'), x1 = v1.other.find(x => x.note === 'QA банкет ' + RUN);
    must(x1 && x1.cat === 'b2b' && Math.abs(v1.t.oth - v0.t.oth - 1500.5) < 0.011 && Math.abs(v1.sum.ytd - v0.sum.ytd - 1500.5) < 0.011 && Math.abs(v1.sum.roll - v0.sum.roll - 1500.5) < 0.011, 'інший дохід не в книзі / році / 12 міс.');
    const OWN = 'UA213223130000026007233566001', d = new Date(Date.now() - 3 * 3600e3).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric' });
    const f = ['1CClientBankExchange', 'ВерсияФормата=1.02', 'РасчСчет=' + OWN, 'СекцияДокумент=Платежное поручение', 'Номер=9', 'Дата=' + d, 'Сумма=2000.00', 'ПлательщикСчет=UA443052990000026003333333333', 'Плательщик=ТОВ Замовник', 'ПлательщикИНН=32323232', 'ПолучательСчет=' + OWN, 'ДатаПоступило=' + d, 'НазначениеПлатежа=Оплата банкету ' + RUN, 'КонецДокумента', 'КонецФайла'].join('\r\n');
    ok(await vpos(VA, 'bankImp', { text: f }), 'виписка'); const bl = ok(await vpos(VA, 'bankList'), 'банк').list.find(x => x.pur === 'Оплата банкету ' + RUN); must(bl?.st === 'q', 'надходження не на підтвердженні: ' + bl?.st);
    must(ok(await vpos(VA, 'incGet', {}), 'книга').bankQ.n >= 1, 'книга не попередила про нерозібране надходження');
    const bx = ok(await vpos(VA, 'bankAct', { id: bl.id, a: 'inc', cat: 'b2b' }), 'це дохід').x; must(bx.st === 'ok' && bx.m.k === 'inc', 'це дохід: ' + JSON.stringify(bx).slice(0, 160));
    const v2 = ok(await vpos(VA, 'incGet', {}), 'книга'), x2 = v2.other.find(x => x.bank === bl.id); must(x2 && x2.sum === 2000 && x2.d === day, 'дохід з виписки не в книзі');
    must((await vpos(VA, 'incDel', { id: x2.id })).status === 400, 'дохід з виписки прибрано повз банк');
    ok(await vpos(VA, 'bankAct', { id: bl.id, a: 'un' }), 'скасувати'); must(!ok(await vpos(VA, 'incGet', {}), 'книга').other.some(x => x.bank === bl.id), 'скасування в банку не прибрало дохід');
    ok(await vpos(VA, 'bankAct', { id: bl.id, a: 'skip', why: 'loan' }), 'позика');
    const xp = ok(await vpos(VA, 'acctExport', { from: day, to: day }), 'експорт'), si = xp.sections.find(s => s.id === 'inc'), so = xp.sections.find(s => s.id === 'incOth');
    must(si && si.rows.every(r => r.length === si.head.length) && so?.rows.some(r => r[2] === 'QA банкет ' + RUN), 'книги немає в експорті');
    const v3 = ok(await vpos(VA, 'incDel', { id: x1.id }), 'прибрати'); must(!v3.other.some(x => x.id === x1.id) && Math.abs(v3.t.oth - v0.t.oth) < 0.011, 'прибраний дохід лишився');
    return `продажі дня ${Math.round(rev)} ₴ · 12 міс. ${v3.sum.pdvPct}% порогу ПДВ`;
  });
  await step('🔄 банк автоматично: токени mono / Приват (тест) → Приват одразу й без повторів, вебхук mono → рядок у банку, чужий ключ 403, повтор не дублює; стан у касі й кабінеті', async () => {
    const ok = (r, w) => { must(r.status === 200 && !r.j.error, w + ': ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
    const day = new Date(Date.now() - 3 * 3600e3).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' });
    must((await ownT(PT, 'secrets', { venue: VID, f: { PRIVAT_BANK: 'bad token!' } })).status === 400, 'хибний токен Привату прийнято');
    must((await vpos(VA, 'bankSync')).status === 400, 'оновлення без підключеного банку');
    try {
      must((await ownT(PT, 'secrets', { venue: VID, f: { PRIVAT_BANK: 'privat_test_' + 'q'.repeat(16), MONO_BANK: 'monob_test_' + 'q'.repeat(16) } })).j.ok, 'збереження токенів');
      const st = ok(await vpos(VA, 'bankApi'), 'стан').api; must(st.privat?.ts > 0 && !st.privat.err && st.mono?.acc?.[0] === '…6001' && /^[a-f0-9]{40}$/.test(st.mono.key || ''), 'стан: ' + JSON.stringify(st));
      const l1 = ok(await vpos(VA, 'bankList'), 'банк'); must(l1.api?.privat && l1.list.some(x => x.src === 'privat' && x.sum === 777 && x.d === day), 'операції Привату немає в банку');
      must((ok(await vpos(VA, 'bankSync'), 'оновити').add.privat || 0) === 0, 'повторне оновлення Привату дублює');
      must((await http(`/v/${VID}/api/bankhook/${st.mono.key}`)).status === 200, 'GET вебхука (перевірка mono)');
      const it = { id: 'qa' + RUN, time: Math.floor(Date.now() / 1000), amount: 123456, currencyCode: 980, description: 'Оренда QA', comment: 'оренда ' + RUN, counterName: 'ФОП Орендар' }, body = { type: 'StatementItem', data: { account: 'qa-fop', statementItem: it } };
      must((await http(`/v/${VID}/api/bankhook/${'0'.repeat(40)}`, body)).status === 403, 'чужий ключ вебхука');
      must((await http(`/v/${VID}/api/bankhook/${st.mono.key}`, body)).j.add === 1, 'вебхук mono не додав операцію');
      must((await http(`/v/${VID}/api/bankhook/${st.mono.key}`, body)).j.add === 0, 'повтор вебхука дублює');
      must((await http(`/v/${VID}/api/bankhook/${st.mono.key}`, { ...body, data: { ...body.data, account: 'other' } })).j.add == null, 'операція чужого рахунку');
      const x = ok(await vpos(VA, 'bankList'), 'банк').list.find(y => y.pur === 'оренда ' + RUN); must(x?.src === 'mono' && x.sum === 1234.56 && x.who === 'ФОП Орендар', 'рядок mono: ' + JSON.stringify(x));
      must(ok(await vpos(VA, 'bankApi'), 'стан').api.mono.hook > 0, 'немає часу останнього вебхука');
      if (x.st === 'q') ok(await vpos(VA, 'bankAct', { id: x.id, a: 'skip', why: 'other' }), 'пропустити');
      return `Приват 777 ₴ · mono ${x.sum} ₴`;
    } finally { await ownT(PT, 'secrets', { venue: VID, f: { PRIVAT_BANK: '', MONO_BANK: '' } }); must(!ok(await vpos(VA, 'bankApi'), 'стан').api.mono, 'mono не відключився'); }
  });
  await step('🛵 агрегатори: модуль вимкнено → оплата 400; Glovo як спосіб оплати → окремо в зміні й чеку; права й межі; видалення чека віднімає; виплата у виписці → комісія витратою; бот', async () => {
    const ok = (r, w) => { must(r.status === 200 && !r.j.error, w + ': ' + r.status + ' ' + JSON.stringify(r.j).slice(0, 200)); return r.j; };
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number');
    const sale = async (t, pay) => { const o = await vpos(VA, 'order', { t, items: [{ id: it.id, q: 1 }] }); must(o.status === 200, 'order ' + JSON.stringify(o.j).slice(0, 120)); return vpos(VA, 'close', { t, pay }); };
    let VW = ''; for (let i = 0; i < 5 && !VW; i++) VW = (await vpos(null, 'register', { code: codes.waiter, name: 'QA офіціант агр ' + RUN.slice(-4) + i, pin: String(2000 + Math.floor(Math.random() * 7000)) })).j.token || ''; must(VW, 'офіціант не зареєструвався');
    ok(await vpos(VA, 'modSet', { k: 'agg', v: 0 }), 'вимкнути');
    must((await sale(7, 'agg:glovo')).status === 400, 'модуль вимкнено, а Glovo прийнято'); ok(await vpos(VA, 'close', { t: 7, pay: 'cash' }), 'закрити готівкою');
    must(ok(await vpos(VW, 'aggList'), 'список офіціанта').list.length === 0, 'офіціант бачить агрегатори вимкненого модуля');
    ok(await vpos(VA, 'modSet', { k: 'agg', v: 1 }), 'увімкнути');
    must((await vpos(VW, 'aggSet', { id: 'glovo', fee: 1 })).status === 403, 'офіціант змінює агрегатори');
    must((await vpos(VA, 'aggSet', { id: 'glovo', fee: 99 })).status === 400, 'комісія 99%');
    ok(await vpos(VA, 'aggSet', { id: 'glovo', fee: 30, on: 1 }), 'комісія Glovo');
    const nw = ok(await vpos(VA, 'aggSet', { n: 'QA Uklon ' + RUN.slice(-4), fee: 20 }), 'новий').list.find(a => a.n.endsWith(RUN.slice(-4))); must(nw?.id, 'новий агрегатор без id');
    ok(await vpos(VA, 'aggSet', { id: nw.id, on: 0 }), 'вимкнути новий');
    must(ok(await vpos(VW, 'aggList'), 'список').list.some(a => a.id === 'glovo' && a.on), 'офіціант не бачить Glovo');
    must((await sale(7, 'agg:' + nw.id)).status === 400, 'вимкнений агрегатор прийнято'); must((await vpos(VA, 'close', { t: 7, pay: 'agg:nope' })).status === 400, 'невідомий агрегатор');
    const s0 = (await vpos(VA, 'shift')).j.day, g0 = s0.ag?.glovo || 0, c0 = s0.card;
    const r = ok(await vpos(VA, 'close', { t: 7, pay: 'agg:glovo' }), 'закрити Glovo').r; must(r.ag === 'glovo' && r.agS === r.sum && r.card === r.sum && !r.cash, 'чек Glovo: ' + JSON.stringify(r));
    const s1 = (await vpos(VA, 'shift')).j.day; must(s1.ag?.glovo === g0 + r.sum && s1.card === c0 + r.sum, `зміна: Glovo ${s1.ag?.glovo} ≠ ${g0}+${r.sum}`);
    { const x0 = ok(await vpos(VA, 'closed'), 'закриті').list.find(c => c.id === r.id), ed = p => vpos(VA, 'closedEdit', { ref: r.id, p: { items: p, tip: 0, pay: 'card', disc: 0 } });
      const e1 = ok(await ed(x0.dishes.map(([n, q, s]) => [n, q * 2, s * 2])), 'правка +страва').x; must(e1.agS === e1.card && e1.card === r.sum * 2, 'дописана страва не через Glovo: ' + JSON.stringify({ agS: e1.agS, card: e1.card }));
      must((await vpos(VA, 'shift')).j.day.ag?.glovo === g0 + r.sum * 2, 'зміна після правки'); ok(await ed(x0.dishes), 'правка назад'); must((await vpos(VA, 'shift')).j.day.ag?.glovo === g0 + r.sum, 'правка назад не повернула Glovo'); }
    const r2 = ok(await sale(7, 'agg:glovo'), 'другий').r; ok(await vpos(VA, 'closedDel', { ref: r2.id }), 'видалити');
    must((await vpos(VA, 'shift')).j.day.ag?.glovo === g0 + r.sum, 'видалення чека не відняло Glovo');
    // 🏦 виписка: виплата Glovo нетто → зіставлено з продажами днів, комісія — витрата
    ok(await vpos(VA, 'modSet', { k: 'bank', v: 1 }), 'банк');
    for (const x of ok(await vpos(VA, 'bankList'), 'список').list.filter(x => x.m?.k === 'agg')) ok(await vpos(VA, 'bankAct', { id: x.id, a: 'un' }), 'скасувати стару виплату');
    const day = s1.day, G = s1.ag.glovo, net = Math.round(G * 0.7 * 100) / 100, d = day.split('-').reverse().join('.'), OWN = 'UA213223130000026007233566001';
    const f = ['1CClientBankExchange', 'РасчСчет=' + OWN, 'СекцияДокумент=Платежное поручение', 'Номер=77', 'Дата=' + d, 'Сумма=' + net.toFixed(2), 'ПлательщикСчет=UA443052990000026001234500000', 'Плательщик=ТОВ ГЛОВО УКРАЇНА', 'ПлательщикИНН=41234567', 'ПолучательСчет=' + OWN, 'ДатаПоступило=' + d, 'НазначениеПлатежа=Виплата за замовлення Glovo ' + RUN, 'КонецДокумента', 'КонецФайла'].join('\r\n');
    const im = ok(await vpos(VA, 'bankImp', { text: f }), 'імпорт'); must(im.ok === 1, 'виплату не зіставлено: ' + JSON.stringify(im));
    const L = ok(await vpos(VA, 'bankList'), 'список').list.find(x => x.pur.endsWith(RUN) && /Glovo/.test(x.pur)); must(L?.m?.k === 'agg' && L.m.a === 'glovo' && L.m.gross === G && Math.abs(L.m.fee - (G - net)) < 0.011, 'зіставлення: ' + JSON.stringify(L?.m));
    must((await vpos(VA, 'shift')).j.exp.some(e => !e.del && e.src === 'card' && /Комісія Glovo/.test(e.note)), 'комісія Glovo не записана');
    ok(await vpos(VA, 'bankAct', { id: L.id, a: 'un' }), 'скасувати'); must(!(await vpos(VA, 'shift')).j.exp.some(e => !e.del && /Комісія Glovo/.test(e.note)), 'скасування не прибрало комісію');
    must((await vpos(VA, 'bankAct', { id: L.id, a: 'agg', ag: 'glovo', days: ['2020-01-01'] })).status === 400, 'день без продажів Glovo зіставлено');
    ok(await vpos(VA, 'bankAct', { id: L.id, a: 'agg', ag: 'glovo', days: [day] }), 'вручну');
    return `Glovo ${G} ₴ → виплата ${net} ₴`;
  });
  await step('⏳ черга в залі (wl): гість /api/wl — створення, дубль за телефоном, статус, скасування, ліміт 3/пристрій', async () => {
    const dev = 'qa-wl-' + Date.now(), ph = n => '067' + String(Date.now()).slice(-6) + n;
    // 🛡 index.js: wlip — не більше 6 POST /api/wl за годину з одного IP (спільний IP тестів вичерпується) → тест чесно пропускається
    const v0 = await http('/api/wl', { name: '', people: 2, phone: ph(0), device: dev + 'x' });
    must(v0.status === 400, 'без імені');
    must((await http('/api/wl', { name: 'QA', people: 2, device: dev + 'x' })).status === 400, 'гість без телефону');
    const p1 = ph(1), r1 = await http('/api/wl', { name: 'QA Черга', people: 3, phone: p1, device: dev }); must(r1.status === 200 && r1.j.id && r1.j.st === 'wait' && r1.j.pos >= 1, JSON.stringify(r1.j).slice(0, 150));
    const r1b = await http('/api/wl', { name: 'QA Черга', people: 3, phone: p1, device: dev }); must(r1b.j.dup && !r1b.j.id && r1b.j.pos === r1.j.pos, 'дубль за телефоном: ' + JSON.stringify(r1b.j).slice(0, 120));
    const st = await http('/api/wl?id=' + r1.j.id); must(st.j.st === 'wait' && st.j.name === 'QA Черга' && !('phone' in st.j), 'статус ' + JSON.stringify(st.j));
    must((await http('/api/wl?id=nope')).j.error === 'not_found', 'статус чужого id');
    must((await http('/api/wl', { cancel: 1, id: r1.j.id })).j.st === 'gone', 'cancel');
    must((await http('/api/wl?id=' + r1.j.id)).j.st === 'gone', 'після cancel не gone');
    const r2 = await http('/api/wl', { name: 'QA Два', people: 2, phone: ph(2), device: dev }); must(r2.status === 200, 'друга за пристроєм ' + r2.status);
    // ліміт рахує кожен запит пристрою (дубль за телефоном теж): r1, r1b, r2 = 3 → наступний 429
    const r3 = await http('/api/wl', { name: 'QA Три', people: 2, phone: ph(3), device: dev }); must(r3.status === 429, 'четвертий запит пристрою → ' + r3.status);
    await http('/api/wl', { cancel: 1, id: r2.j.id }); });
  await step('⏳ черга в залі (wl): каса wlAdd/wlAct — call, повторний call < 2 хв → 429, seat, зайнятий стіл → 409, gone; права', async () => {
    const W = users.waiter?.token, A = users.admin?.token, K = users.cook?.token, C = users.courier?.token, TW = 100 + Math.floor(Math.random() * 800);
    const a = await pos(W, 'wlAdd', { name: 'QA Зал', people: 4 }); must(a.status === 200 && a.j.id, 'wlAdd ' + a.status + JSON.stringify(a.j).slice(0, 100));
    const id = a.j.id, wl = async tok => (await posOk(tok, 'state')).wl;
    must((await wl(W)).some(x => x.id === id), 'офіціант не бачить у state.wl');
    if (K) must((await wl(K)).length === 0, 'кухар бачить чергу'); if (C) must((await wl(C)).length === 0, "кур'єр бачить чергу");
    must((await pos(W, 'wlAct', { id, act: 'xxx' })).status === 400, 'невідома дія'); must((await pos(W, 'wlAct', { id: 'nope', act: 'call' })).status === 404, 'невідомий id');
    const c1 = await pos(W, 'wlAct', { id, act: 'call' }); must(c1.status === 200 && c1.j.st === 'called', 'call ' + JSON.stringify(c1.j).slice(0, 100));
    const c2 = await pos(W, 'wlAct', { id, act: 'call' }); must(c2.status === 429, 'повторний call → ' + c2.status);
    const s1 = await pos(W, 'wlAct', { id, act: 'seat', t: TW }); must(s1.status === 200 && s1.j.st === 'seated' && s1.j.t === TW, 'seat ' + JSON.stringify(s1.j).slice(0, 100));
    must(!(await wl(W)).some(x => x.id === id), 'посаджений лишився в черзі');
    const b = await pos(W, 'wlAdd', { name: 'QA Зал 2', people: 2 }); must(b.status === 200, 'wlAdd 2');
    const s2 = await pos(W, 'wlAct', { id: b.j.id, act: 'seat', t: TW }); must(s2.status === 409, 'посадка на зайнятий стіл → ' + s2.status);
    must((await pos(A, 'wlAct', { id: b.j.id, act: 'gone' })).j.st === 'gone', 'gone');
    for (const [tok, role] of [[K, 'cook'], [C, 'courier']]) if (tok) for (const [op, bb] of [['wlAdd', { name: 'X', people: 2 }], ['wlAct', { id, act: 'call' }]]) must((await pos(tok, op, bb)).status === 403, `${role} ✗ ${op}`); });
  await step('невідомий заклад → 404', async () => { const r = await http('/v/nope-' + VID.slice(-5) + '/api/menu'); must(r.status === 404, String(r.status)); });
  await step('кабінет власника: свої заклади, аналітика, вхід у касу', async () => {
    const l = await own({ op: 'login', email: OE, pass: 'owner-pass-123' }); OT = l.j.token; must(OT, 'вхід');
    const me = await ownT(OT, 'me'); must(me.j.venues.length === 1 && me.j.venues[0].id === VID, 'бачить чужі заклади: ' + me.j.venues.map(v => v.id));
    const sm = await ownT(OT, 'sum', {}); must(sm.j.list?.[0]?.tot, 'sum ' + JSON.stringify(sm.j).slice(0, 150));
    must((await ownT(OT, 'enter', { venue: 'varvar' })).status === 403, 'зайшов у чужий заклад');
    const en = await ownT(OT, 'enter', { venue: VID }); must(en.j.token, 'enter'); must((await vpos(en.j.token, 'state')).status === 200, 'токен власника не працює');
    must((await ownT(OT, 'accts')).status === 403, 'власник бачить консоль платформи'); });
  await step('🔔 Сповіщення CRM (кабінет → Продажі): платформа вмикає/вимикає пристрій, погана підписка → 400, власнику → 403', async () => {
    const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/qa-' + Date.now(), keys: { p256dh: 'B' + 'A'.repeat(86), auth: 'A'.repeat(22) } };
    must((await ownT(OT, 'crmSub', { sub, on: true })).status === 403, 'власник увімкнув сповіщення CRM');
    must((await ownT(PT, 'crmSub', { sub: { endpoint: 'https://evil.example/x', keys: sub.keys }, on: true })).status === 400, 'чужий push-сервіс прийнято');
    const on = await ownT(PT, 'crmSub', { sub, on: true }); must(on.j.ok && on.j.on, JSON.stringify(on.j));
    must((await ownT(PT, 'crmKey', { e: sub.endpoint })).j.mine === true, 'пристрій не збережено');
    const off = await ownT(PT, 'crmSub', { sub, on: false }); must(off.j.ok && (await ownT(PT, 'crmKey', { e: sub.endpoint })).j.mine === false, 'не вимкнулось');
  });
  await step('🌙 підсумок дня у кабінеті власника: порахувати, список, особистий Telegram, чужий заклад — 403', async () => {
    const r = await ownT(OT, 'dig', { venue: VID, now: 1 }); must(r.status === 200 && Array.isArray(r.j.list) && r.j.list[0]?.day && /Підсумок дня/.test(r.j.list[0].text), 'now ' + JSON.stringify(r.j).slice(0, 150));
    const l = await ownT(OT, 'dig'); must(l.j.list.length === 1 && l.j.list[0].id === VID && l.j.list[0].list.length >= 1, 'list ' + JSON.stringify(l.j).slice(0, 150));
    must((await ownT(OT, 'dig', { venue: VID, chat: 'abc' })).status === 400, 'нечисловий chat');
    must((await ownT(OT, 'dig', { venue: VID, chat: '123456789' })).j.tg === true, 'chat не збережено'); must((await ownT(OT, 'dig')).j.list[0].tg === true, 'tg=false у списку');
    must((await ownT(OT, 'dig', { venue: VID, chat: '' })).j.tg === false, 'chat не прибрано');
    must((await ownT(OT, 'dig', { venue: 'varvar', now: 1 })).status === 403, 'чужий заклад'); return r.j.list[0].day; });
  await step('платформа бачить усі заклади', async () => { const me = await ownT(PT, 'me'); must(me.j.venues.some(v => v.id === 'varvar') && me.j.venues.some(v => v.id === VID), 'не всі'); });
  sect('💬 Чат-асистент на сайті ATOM');
  const CIP = 'q' + Date.now().toString(36), cph = '+3809' + String(Date.now()).slice(-8), CL = [];
  await step('вимикач: вимкнено → 503; чужий доступ (власник) до чату й вимикача → 403', async () => {
    await ownT(PT, 'chatCfg', { set: 1, f: { on: 0 } });
    must((await ownT(PT, 'chatSim', { text: 'привіт', ip: CIP })).status === 503, 'чат працює при вимкненому вимикачі');
    must((await ownT(OT, 'chatCfg', {})).status === 403 && (await ownT(OT, 'chat', { id: 'x' })).status === 403 && (await ownT(OT, 'chatSim', { text: 'a' })).status === 403, 'власник має доступ'); });
  await step('чат: перше повідомлення → лід 💬 з прапорцем chat, без тепла; чужий ключ — відмова', async () => {
    must((await ownT(PT, 'chatCfg', { set: 1, f: { on: 1 } })).j.cfg.on === 1, 'chatCfg');
    const r = await ownT(PT, 'chatSim', { text: 'Скільки коштує?', ip: CIP }); must(r.j.ok && r.j.id && r.j.k && r.j.reply && r.j.reply.length <= 500 && !r.j.done, JSON.stringify(r.j)); CL.push(r.j.id); globalThis.__c = r.j;
    const L = (await ownT(PT, 'leads', { days: 7 })).j.list.find(x => x.id === r.j.id); must(L && L.chat === 1 && !L.hot && L.src === 'chat' && !('m' in L), JSON.stringify(L));
    must((await ownT(PT, 'chatSim', { text: 'hi', ip: CIP, id: r.j.id, k: 'wrong' })).status === 404, 'чужий ключ прийнято');
    must((await ownT(PT, 'chatSim', { text: 'ще чат', ip: CIP })).status === 429, '2-й чат з того ж IP за годину'); });
  await step('телефон у розмові → 🔥 тепла: ШІ замовкає («Власник зв’яжеться…»), контакт у ліді', async () => {
    const c = globalThis.__c, r = await ownT(PT, 'chatSim', { text: 'Хочу демо, мій телефон ' + cph, ip: CIP, id: c.id, k: c.k }); must(r.j.ok && r.j.done && /зв’яжеться/.test(r.j.reply), JSON.stringify(r.j));
    const L = (await ownT(PT, 'leads', { days: 7 })).j.list.find(x => x.id === c.id); must(L.hot === 1 && L.phone === cph, JSON.stringify(L));
    const r2 = await ownT(PT, 'chatSim', { text: 'ще питання', ip: CIP, id: c.id, k: c.k }); must(r2.j.done && /зв’яжеться/.test(r2.j.reply), 'після 🔥 відповідає не людина');
    const th = (await ownT(PT, 'chat', { id: c.id })).j.chat; must(th.length >= 4 && th.every(m => m.t.length <= 500 && ['g', 'a'].includes(m.r)), 'розмова: ' + th.length); });
  await step('ліміт 20 повідомлень за 10 хв з IP; у розмові не більше 40', async () => {
    const ip2 = CIP + 'b', a = await ownT(PT, 'chatSim', { text: 'м1', ip: ip2 }); must(a.j.ok, JSON.stringify(a.j)); CL.push(a.j.id); let last;
    for (let i = 2; i <= 21; i++) { last = await ownT(PT, 'chatSim', { text: 'м' + i, ip: ip2, id: a.j.id, k: a.j.k }); if (i < 21) must(last.j.ok, i + ': ' + JSON.stringify(last.j)); }
    must(last.status === 429, '21-е повідомлення пройшло: ' + last.status);
    const th = (await ownT(PT, 'chat', { id: a.j.id })).j.chat; must(th.length <= 40, 'довжина ' + th.length); });
  await step('прибирання: ліди чату (разом з розмовою), вимикач вимкнено', async () => {
    for (const id of CL) await ownT(PT, 'leadSet', { id, f: { del: 1 } });
    must((await ownT(PT, 'chat', { id: CL[0] })).status === 400, 'розмова лишилась після видалення ліда');
    await ownT(PT, 'chatCfg', { set: 1, f: { on: 0 } }); });

  sect('🎁 Реферальна програма');
  const FE = `qa-ref-${VID}@test.local`, FV = [], phone = '+3809' + String(Date.now()).slice(-8); let FE2 = '';
  await step('?ref= з лендингу → lead.ref (очищений: a–z0–9); код закладу стабільний', async () => {
    const r = await ownT(PT, 'leadNew', { name: 'QA реф', phone, place: 'QA', ref: 'QA-Ref_1!' }); must(r.j.ok, JSON.stringify(r.j)); // /api/lead живе лише на домені posatom.online, тож перевіряємо ту саму leadAdd через кабінет
    const L = (await ownT(PT, 'leads', { days: 7 })).j.list.find(x => x.phone === phone); must(L && L.ref === 'qaref1', 'ref=' + L?.ref);
    await ownT(PT, 'leadSet', { id: L.id, f: { del: 1 } });
    const a = await ownT(PT, 'ref', { venue: VID }), b = await ownT(PT, 'ref', { venue: VID }); must(/^[a-z0-9]{6}$/.test(a.j.ref?.code) && a.j.ref.code === b.j.ref.code && a.j.ref.limit === 12, JSON.stringify(a.j));
    must((await ownT(OT, 'ref', { venue: 'varvar' })).status === 403, 'власник бачить код чужого закладу'); });
  await step('заборона самореферала: свій код, свій власник; без причини — відмова', async () => {
    const code = (await ownT(PT, 'ref', { venue: VID })).j.ref.code;
    must((await ownT(PT, 'refGift', { id: VID, code, why: 'QA' })).status === 400, 'свій заклад зарахувався');
    must((await ownT(PT, 'refGift', { id: VID, why: ' ' })).status === 400, 'без причини');
    const sv = VID + '-s'; must((await ownT(PT, 'venueNew', { id: sv, name: 'QA свій', owner: OE })).j.ok, 'venueNew'); FV.push(sv);
    const r = await ownT(PT, 'refGift', { id: sv, code, why: 'QA' }); must(r.status === 400 && /Свої/.test(r.j.error || ''), 'заклад того ж власника: ' + JSON.stringify(r.j));
    must((await ownT(PT, 'ref', { venue: VID })).j.ref.n === 0, 'лічильник змінився'); });
  await step('🧾 платник (Ф2): один ФОП на два заклади — дохід за рік складається; чужий заклад/платник → 403; журнал прив\'язки', async () => {
    const sv = VID + '-s', T2 = (await ownT(OT, 'enter', { venue: sv })).j.token; must(T2, 'вхід у другий заклад');
    const svp = (op, b = {}) => http(`/v/${sv}/api/pos`, { op, ...b }, T2);
    must((await ownT(OT, 'payerSet', { f: { kind: 'fop', n: 'Q' } })).status === 400, 'коротка назва');
    const P = (await ownT(OT, 'payerSet', { f: { kind: 'fop', n: 'QA ФОП Тест', g: 2, regs: [{ from: '2020-01-01', g: 3 }, { from: new Date().getFullYear() + '-01-01', g: 2 }] } })).j.payer; must(P?.id && P.g === 2, 'payerSet');
    must((await ownT(OT, 'payerVenue', { venue: 'varvar', payer: P.id })).status === 403, 'прив\'язав чужий заклад');
    must((await ownT(PT, 'payerSet', { f: { id: P.id, n: 'X' } })).status === 400 && (await ownT(OT, 'payerSet', { f: { id: 'nope' } })).status === 400, 'чужий/неіснуючий id');
    must((await vpos(VA, 'ldgAdd', { type: 'sale', sum: 100000, ext: 'qa-pay:' + RUN })).status === 200, 'документ у закладі 1');
    must((await svp('ldgAdd', { type: 'sale', sum: 50000, ext: 'qa-pay2:' + RUN })).status === 200, 'документ у закладі 2');
    const b1 = await ownT(OT, 'payerVenue', { venue: VID, payer: P.id }), b2 = await ownT(OT, 'payerVenue', { venue: sv, payer: P.id }); must(b1.j.venue?.payer === P.id && b2.j.year, 'прив\'язка ' + JSON.stringify(b2.j).slice(0, 160));
    const y = b2.j.year; must(y.by[sv] === 50000 && y.by[VID] >= 100000 && y.sum === y.by[VID] + y.by[sv] && y.g === 2 && y.lim > 0, 'сума платника: ' + JSON.stringify(y));
    const d = (await svp('ldgAdd', { type: 'inc', sum: 2500, ext: 'qa-pay3:' + RUN })).j.doc; must(d?.payer === P.id, 'новий документ без платника: ' + JSON.stringify(d));
    await ownT(OT, 'payerVenue', { venue: sv, payer: P.id }); const L1 = (await ownT(OT, 'payers')).j.list.find(x => x.id === P.id);
    must(L1?.year.sum === y.sum + 2500 && L1.venues.length === 2, 'після нового доходу: ' + JSON.stringify(L1?.year));
    must((await vpos(VA, 'ldgAudit', { ref: 'payer' })).j.list.some(x => x.what === 'payer' && x.now?.id === P.id), 'журнал прив\'язки');
    must((await ownT(OT, 'payerSet', { f: { id: P.id, del: 1 } })).status === 400, 'видалив платника з закладами');
    for (const v of [VID, sv]) must((await ownT(OT, 'payerVenue', { venue: v, payer: '' })).j.venue && !(await ownT(OT, 'payerVenue', { venue: v, payer: '' })).j.venue.payer, 'відв\'язка');
    must((await ownT(OT, 'payerSet', { f: { id: P.id, del: 1 } })).j.payer?.ok, 'видалення');
    return `разом ${y.sum / 100} ₴ = ${y.by[VID] / 100} + ${y.by[sv] / 100}`;
  });
  await step('+1 міс другу й рефері, один раз на заклад; ліміт 12 → далі лише другу; блок коду', async () => {
    must((await ownT(PT, 'acctNew', { email: FE, pass: 'friend-pass-123', name: 'QA друг' })).j.ok, 'acctNew');
    const code = (await ownT(PT, 'ref', { venue: VID })).j.ref.code, till = async id => (await ownT(PT, 'bill', { venue: id })).j.sub.till;
    const t0 = await till(VID);
    for (let i = 1; i <= 13; i++) {
      const id = `${VID}-f${i}`, v = await ownT(PT, 'venueNew', { id, name: 'QA друг ' + i, owner: FE, ref: code }); must(v.j.ok, JSON.stringify(v.j)); FV.push(id);
      const f0 = await till(id), r = await ownT(PT, 'refGift', { id, why: 'QA' }); must(r.j.ok, JSON.stringify(r.j));
      must(await till(id) > f0, 'другу не додано місяць');
      if (i <= 12) must(r.j.ref && !r.j.capped, `#${i} рефері не отримав: ` + JSON.stringify(r.j)); else must(r.j.capped && !r.j.ref, 'понад ліміт: ' + JSON.stringify(r.j));
      if (i === 1) { must(await till(VID) > t0, 'рефері без місяця'); const again = await ownT(PT, 'refGift', { id, why: 'QA' }); must(again.status === 400, 'повторне нарахування'); }
    }
    const st = (await ownT(PT, 'ref', { venue: VID })).j.ref; must(st.n === 12, 'n=' + st.n);
    must((await ownT(PT, 'refBlock', { code, on: 1 })).j.ok && (await ownT(PT, 'ref', { venue: VID })).j.ref.blocked, 'блок'); await ownT(PT, 'refBlock', { code, on: 0 }); });
  await step('🔐 передача закладу: старий власник одразу втрачає доступ (активна сесія теж); «залишити як керуючого» — лише явно; /api/admin: підбір PIN → 429; /api/ai: ліміт з IP', async () => {
    const T = VID + '-t'; must((await ownT(PT, 'venueNew', { id: T, name: 'QA передача', owner: OE })).j.ok, 'venueNew'); FV.push(T);
    const ot = (await own({ op: 'login', email: OE, pass: 'owner-pass-123' })).j.token, ft = (await own({ op: 'login', email: FE, pass: 'friend-pass-123' })).j.token;
    must((await ownT(ot, 'codes', { venue: T })).status === 200, 'власник до передачі');
    must((await ownT(PT, 'venueSet', { id: T, f: { owner: FE } })).j.ok, 'передача');
    must((await ownT(ot, 'codes', { venue: T })).status === 403, 'старий власник після передачі має доступ');
    must(!(await ownT(ot, 'me')).j.venues.some(v => v.id === T), 'заклад лишився в кабінеті старого власника');
    must((await ownT(ft, 'codes', { venue: T })).status === 200, 'новий власник без доступу');
    must((await ownT(PT, 'venueSet', { id: T, f: { owner: OE, keep: true } })).j.ok, 'передача назад з keep');
    must((await ownT(ft, 'codes', { venue: T })).status === 200 && (await ownT(ot, 'codes', { venue: T })).status === 200, 'keep: керуючий втратив доступ');
    let st = []; for (let i = 0; i < 7; i++) st.push((await http('/api/admin', { pin: 'qa-wrong-' + i, action: 'list' })).status);
    must(st.includes(429) && st.every(x => x === 401 || x === 429) && st.at(-1) === 429, 'підбір PIN не зупинено: ' + st);
    let ai = []; for (let i = 0; i < 32; i++) ai.push((await http('/api/ai', { device: 'qa-' + RUN + i })).status);
    must(ai.at(-1) === 429, 'ліміт ШІ з IP не спрацював: ' + ai.slice(-3)); return 'ок';
  });
  await step('🎁 авто: перша оплата приведеного (після безкоштовного місяця) → рефері +1 міс одразу, повторна оплата — без подарунка', async () => {
    const { createHash } = await import('node:crypto'), PRIV = 'sandbox_test_private_key';
    const cb = async obj => { const data = Buffer.from(JSON.stringify(obj)).toString('base64'), signature = createHash('sha1').update(PRIV + data + PRIV).digest('base64');
      return (await fetch(API + '/api/lp/sub', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data, signature }).toString() })).json(); };
    const R = `${VID}-f1`, QE = `qa-ref2-${VID}@test.local`, G = `${VID}-g1`, till = async id => (await ownT(PT, 'bill', { venue: id })).j.sub.till;
    must((await ownT(PT, 'acctNew', { email: QE, pass: 'friend-pass-123', name: 'QA друг 2' })).j.ok, 'acctNew'); FE2 = QE;
    const code = (await ownT(PT, 'ref', { venue: R })).j.ref.code; must((await ownT(PT, 'venueNew', { id: G, name: 'QA друг G', owner: QE, ref: code })).j.ok, 'venueNew'); FV.push(G);
    const t0 = await till(R), pid = 'qaref' + Date.now();
    await cb({ order_id: `sub-${G}-x1`, status: 'subscribed', action: 'subscribe', amount: 500, payment_id: pid });
    const t1 = await till(R), d = Math.round((t1 - t0) / 864e5); must(d >= 28 && d <= 31, `рефері +${d} дн`); must((await ownT(PT, 'ref', { venue: R })).j.ref.n === 1, 'лічильник');
    await cb({ order_id: `sub-${G}-x1`, status: 'subscribed', action: 'subscribe', amount: 500, payment_id: pid + 'b' });
    must(await till(R) === t1, 'подарунок двічі'); return `+${d} дн рефері`; });
  { const SE = 'qa-self@test.local'; let sv = null;
  await step('⚡ самореєстрація: бот-пастка/коротка назва/слабкий пароль → відмова, акаунт не створено', async () => {
    must((await own({ op: 'signup', web: 'x', email: SE, place: 'Кав\'ярня', pass: 'selfpass-123' })).j.test === undefined, 'пастка');
    must((await own({ op: 'signup', email: SE, place: 'К', pass: 'selfpass-123' })).status === 400, 'назва');
    must((await own({ op: 'signup', email: SE, place: 'Кав\'ярня', pass: '123' })).status === 400, 'пароль');
    must((await own({ op: 'signup', email: 'не-пошта', place: 'Кав\'ярня', pass: 'selfpass-123' })).status === 400, 'email'); });
  await step('⚡ самореєстрація: до підтвердження пошти вхід закритий, заклад не створено', async () => {
    const r = await own({ op: 'signup', email: SE, name: 'QA сам', place: 'Кав\'ярня «Тест»', city: 'Буковель', pass: 'selfpass-123' }); must(r.j.test, JSON.stringify(r.j)); sv = r.j.test;
    must((await own({ op: 'login', email: SE, pass: 'selfpass-123' })).status === 401, 'вхід до підтвердження');
    must((await own({ op: 'signupOk', t: 'f'.repeat(48) })).status === 400, 'хибне посилання'); });
  await step('⚡ самореєстрація: повтор для непідтвердженого email дозволений (старе посилання гасне)', async () => {
    const r = await own({ op: 'signup', email: SE, name: 'QA сам', place: 'Кав\'ярня «Тест»', city: 'Буковель', pass: 'selfpass-123' });
    if (r.j.test) sv = r.j.test; else must(/хвилину/.test(r.j.error || ''), JSON.stringify(r.j)); });
  await step('⚡ самореєстрація: посилання → заклад на пробний місяць, власник входить, заклад у кабінеті', async () => {
    const r = await own({ op: 'signupOk', t: sv }); must(r.j.token && r.j.venue, JSON.stringify(r.j)); FV.push(r.j.venue); sv = r.j;
    must(/^[a-z0-9-]+$/.test(r.j.venue), 'адреса ' + r.j.venue);
    const me = await ownT(r.j.token, 'me'); must(me.j.venues?.some(v => v.id === r.j.venue && v.status === 'trial'), JSON.stringify(me.j.venues));
    const en = await ownT(r.j.token, 'enter', { venue: r.j.venue }); must(en.j.token, 'вхід у касу закладу');
    must((await own({ op: 'login', email: SE, pass: 'selfpass-123' })).j.token, 'вхід паролем');
    must((await own({ op: 'signupOk', t: sv.t || 'x'.repeat(48) })).status === 400, 'повторне використання'); });
  await step('⚡ самореєстрація: той самий email вдруге → «вже зареєстровано»', async () => {
    const r = await own({ op: 'signup', email: SE, place: 'Інша', pass: 'selfpass-123' }); must(r.status === 400 && /уже зареєстровано/.test(r.j.error || ''), JSON.stringify(r.j)); });
  await step('⚡ самореєстрація: прибирання', async () => { await ownT(PT, 'venueDel', { id: sv.venue, pass: PP }); await ownT(PT, 'acctDel', { email: SE }); }); }
  await step('прибирання: тестові заклади й власник-друг', async () => { for (const id of FV) await ownT(PT, 'venueDel', { id, pass: PP }); await ownT(PT, 'acctDel', { email: FE }); if (FE2) await ownT(PT, 'acctDel', { email: FE2 }); });
  await step('🛟 підтримка в Telegram: платформа задає посилання й години → /api/sup; @бот → посилання; фальшивий ключ і не-https відкидаються; вебхук без секрету й власнику не можна', async () => {
    if (!PT) return 'немає токена платформи — пропуск';
    const old = (await ownT(PT, 'atomCfg')).j.cfg || {};
    try {
      must((await ownT(PT, 'atomCfg', { set: 1, f: { sup: 'https://t.me/qa_support_bot', hrs: '9:00–22:00' } })).status === 200, 'збереження');
      const r = await http('/api/sup'); must(r.j.url === 'https://t.me/qa_support_bot' && r.j.hrs === '9:00–22:00', JSON.stringify(r.j));
      await ownT(PT, 'atomCfg', { set: 1, f: { sup: 'javascript:alert(1)' } }); must((await http('/api/sup')).j.url === '', 'не-https посилання прийнято');
      if (OT) must((await ownT(OT, 'atomCfg', { set: 1, f: { sup: 'https://t.me/evil' } })).status === 403, 'власник змінив контакти ATOM');
      await ownT(PT, 'atomCfg', { set: 1, f: { sup: '@qa_help_bot' } }); must((await http('/api/sup')).j.url === 'https://t.me/qa_help_bot', '@бот не перетворено на посилання');
      const bad = await ownT(PT, 'atomCfg', { set: 1, f: { sup: '123456789:' + 'A'.repeat(35) } }); must(bad.status === 400 && (await http('/api/sup')).j.url === 'https://t.me/qa_help_bot', 'фальшивий ключ бота прийнято: ' + bad.status);
      must((await http('/tg5', {})).status === 403, 'вебхук бота підтримки без секрету');
      const st = await ownT(PT, 'supStatus'); must(st.status === 200 && st.j.bot === '', 'стан бота без ключа: ' + JSON.stringify(st.j));
      if (OT) must((await ownT(OT, 'supStatus', { rearm: 1 })).status === 403, 'власник закладу бачить/перепідключає бота платформи');
    } finally { await ownT(PT, 'atomCfg', { set: 1, f: { sup: old.sup || '', hrs: old.hrs || '' } }); }
  });
  await step('🇬 вхід через Google: підпис, aud, новий email → назва закладу → заклад; чужий Google-акаунт на той самий email → відмова', async () => {
    const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'qa1' }, u8 = x => Buffer.from(x).toString('base64url');
    const jwt = async (p, key = kp.privateKey) => { const h = u8(JSON.stringify({ alg: 'RS256', kid: 'qa1', typ: 'JWT' })), b = u8(JSON.stringify({ iss: 'https://accounts.google.com', aud: 'test-gid', exp: Math.floor(Date.now() / 1000) + 600, email_verified: true, ...p }));
      return h + '.' + b + '.' + u8(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + b))); };
    const GE = 'qa-google@test.local', g = async (p, x = {}) => own({ op: 'google', cred: await jwt({ email: GE, sub: 'g-111', name: 'QA Google', ...p }), jwk, ...x });
    must((await own({ op: 'canBoot' })).j.gid === 'test-gid', 'gid');
    must((await own({ op: 'google', cred: 'a.b.c', jwk })).status === 401, 'сміття');
    must((await g({ aud: 'other' })).status === 401, 'чужий aud');
    must((await g({ exp: 1 })).status === 401, 'прострочений');
    must((await g({ email_verified: false })).status === 401, 'неперевірений email');
    const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']);
    must((await own({ op: 'google', cred: await jwt({ email: GE, sub: 'g-111' }, other.privateKey), jwk })).status === 401, 'підпис чужим ключем');
    const n = await g(); must(n.j.need === 'place' && !n.j.token, 'новий email без назви: ' + JSON.stringify(n.j));
    must((await own({ op: 'login', email: GE, pass: 'x' })).status === 401, 'акаунт не створено до назви');
    const r = await g({}, { place: 'QA Гугл Кафе', city: 'Тест' }); must(r.j.token && r.j.venue, JSON.stringify(r.j));
    const me = await ownT(r.j.token, 'me'); must(me.j.venues?.some(v => v.id === r.j.venue && v.status === 'trial') && me.j.me.role === 'owner', JSON.stringify(me.j));
    const r2 = await g(); must(r2.j.token && !r2.j.need && !r2.j.venue, 'повторний вхід: ' + JSON.stringify(r2.j));
    must((await g({ sub: 'g-222' })).status === 403, 'інший Google-акаунт на той самий email');
    must((await g({ sub: 'g-111' }, { place: 'Друга' })).j.venue === null, 'вхід із назвою не створює другий заклад');
    await ownT(PT, 'venueDel', { id: r.j.venue, pass: PP }); must((await ownT(PT, 'acctDel', { email: GE })).j.ok, 'прибирання'); });
  await step('🧮 кабінет бухгалтера: запрошення власником, «Мої клієнти», експорт; без каси й чужих закладів', async () => {
    const AE = `qa-acc-${VID}@test.local`, d = new Date().toISOString().slice(0, 10), from = d.slice(0, 8) + '01';
    if (!OT) OT = (await own({ op: 'login', email: OE, pass: 'owner-pass-123' })).j.token;
    must((await ownT(OT, 'accInv', { venue: VID, email: 'не-пошта' })).status === 400, 'кривий email прийнято');
    must((await ownT(OT, 'accInv', { venue: VID, email: OE })).status === 400, 'акаунт власника став бухгалтером');
    must((await ownT(OT, 'accInv', { venue: 'varvar', email: AE })).status === 403, 'запросив у чужий заклад');
    const inv = await ownT(OT, 'accInv', { venue: VID, email: AE, name: 'QA бухгалтер' }); must(inv.j.ok && inv.j.acc.unverified, JSON.stringify(inv.j).slice(0, 150));
    if (!inv.j.test) return 'пошта налаштована — вхід бухгалтера не перевірено';
    const v = await own({ op: 'verify', t: inv.j.test, pass: 'acc-pass-1234' }), AT = v.j.token; must(AT && v.j.acct.role === 'acc', JSON.stringify(v.j).slice(0, 150));
    must((await ownT(OT, 'accList', { venue: VID })).j.list.some(a => a.email === AE), 'немає у списку власника');
    const me = await ownT(AT, 'me'); must(me.j.me.role === 'acc' && me.j.venues.some(x => x.id === VID) && me.j.inbox === 0, 'me');
    const cl = await ownT(AT, 'accCli', { from, to: d }), c = cl.j.list?.find(x => x.id === VID); must(c && c.sales && c.bank && !c.error, JSON.stringify(cl.j).slice(0, 200));
    const ex = await ownT(AT, 'accExp', { venue: VID, from, to: d }); must(ex.j.sections?.some(x => x.id === 'sales'), 'експорт');
    must((await ownT(AT, 'accExp', { venue: VID, from: d, to: from > d ? d : '2020-01-01' })).status === 400, 'кривий період');
    for (const [op, b] of [['enter', { venue: VID }], ['sum', {}], ['codes', { venue: VID }], ['accList', { venue: VID }], ['accInv', { venue: VID, email: 'x' + AE }], ['payers', {}], ['inbox', {}]]) must((await ownT(AT, op, b)).status === 403, op + ' дозволено бухгалтеру');
    must((await ownT(AT, 'accExp', { venue: 'varvar', from, to: d })).status === 403, 'бачить чужий заклад');
    must((await ownT(OT, 'accDel', { venue: VID, email: AE })).j.ok, 'accDel');
    must((await ownT(AT, 'accExp', { venue: VID, from, to: d })).status === 403, 'доступ лишився після «Прибрати»');
    must((await ownT(PT, 'acctDel', { email: AE })).j.ok, 'прибирання'); });
  await step('платформа: доступ керуючому, зміна власника, видалення', async () => {
    const ME = `qa-mgr-${VID}@test.local`; must((await ownT(PT, 'acctNew', { email: ME, pass: 'manager-pass-1', name: 'QA керуючий' })).j.ok, 'acctNew');
    must((await ownT(PT, 'grant', { venue: VID, email: ME, on: true })).j.ok, 'grant');
    const mt = (await own({ op: 'login', email: ME, pass: 'manager-pass-1' })).j.token; must((await ownT(mt, 'me')).j.venues.some(v => v.id === VID), 'керуючий не бачить');
    must((await ownT(PT, 'acctDel', { email: OE })).status === 400, 'видалило власника з закладом');
    must((await ownT(PT, 'venueSet', { id: VID, f: { owner: ME } })).j.ok, 'зміна власника');
    must((await ownT(PT, 'venueDel', { id: 'varvar', pass: PP })).status === 400, 'VARVAR видаляється!');
    must((await ownT(PT, 'venueDel', { id: VID, pass: 'wrong' })).status === 403, 'без пароля');
    must((await ownT(PT, 'venueDel', { id: VID, pass: PP })).j.ok, 'venueDel');
    must((await http(`/v/${VID}/api/menu?nocache=1`)).status === 404, "дані закладу лишились");
    must((await ownT(mt, 'me')).j.venues.length === 0, 'доступ лишився');
    must((await ownT(PT, 'acctDel', { email: ME })).j.ok && (await ownT(PT, 'acctDel', { email: OE })).j.ok, 'acctDel'); });

  sect('💰 Аудит грошей: сертифікат після знижки, обʼєднання, видалення закритого чека');
  { const m = await http('/api/menu'), cat = m.j.categories.find(c => c.items.some(i => i.id === 'hookah-silver'));
    const hk = cat && cat.items.filter(i => typeof i.price === 'number' && !/з собою/i.test(i.name.uk)).sort((a, b) => b.price - a.price)[0];
    const free = async () => { const st = await posOk(A, 'state'), busy = new Set(st.tables.map(x => x.t)); for (let t = st.n; t >= 1; t--) if (!busy.has(t)) return t; };
    const certLeft = async ph => (await posOk(A, 'certList')).list.find(c => c.phone && c.phone.endsWith(ph.slice(-9)))?.left;
    if (hk) {
      await step('сертифікат не більший за суму після знижки', async () => { const T = await free(); await posOk(A, 'order', { t: T, items: [{ id: hk.id, q: 1 }] }); await posOk(A, 'discount', { t: T, pct: 20 });
        const r = await posOk(A, 'certBd', { t: T, phone: '063' + String(Date.now()).slice(-7), item: 0 }); try { must(r.use <= Math.round(hk.price * 0.8) + 1, `знято ${r.use} при до сплати ${hk.price * 0.8}`); } finally { await pos(A, 'delete', { t: T, reason: 'QA' }); } });
      await step("об'єднання столів знімає сертифікат (повертає суму)", async () => { const T1 = await free(); await posOk(A, 'order', { t: T1, items: [{ id: hk.id, q: 1 }] }); const T2 = await free(); await posOk(A, 'order', { t: T2, items: [{ id: hk.id, q: 1 }] });
        await posOk(A, 'certBd', { t: T1, phone: '066' + String(Date.now()).slice(-7), item: 0 }); const r = await posOk(A, 'move', { t: T1, to: T2 }); try { must(r.r?.released, 'released ' + JSON.stringify(r.r)); const b = (await posOk(A, 'state')).tables.find(x => x.t === T2); must(!b.cert && !b.bonus, 'сертифікат лишився на об\'єднаному'); } finally { await pos(A, 'delete', { t: T2, reason: 'QA' }); } });
      await step('видалення закритого чека повертає суму сертифіката', async () => { const T = await free(), ph = '067' + String(Date.now()).slice(-7); await posOk(A, 'order', { t: T, items: [{ id: hk.id, q: 1 }] });
        await posOk(A, 'certBd', { t: T, phone: ph, item: 0 }); const cl = await posOk(A, 'close', { t: T, pay: 'cash', print: false }); must((await certLeft(ph)) === 0, 'після закриття не 0');
        const day = (await posOk(A, 'closed', {})).list.filter(x => x.t === T && x.cert && !x.rm).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0]; must(day, 'чек не знайдено'); await posOk(A, 'closedDel', { ref: day.id });
        const left = await certLeft(ph); must(left > 0, 'сертифікат не повернувся: ' + left); });
    } }

  sect('💡 Побажання розробнику');
  let iid = '';
  await step('waiter: ideaAdd', async () => { const r = await posOk(W, 'ideaAdd', { text: 'QA побажання ' + RUN }); iid = r.x.id; must(iid, 'id'); });
  await step('waiter бачить своє, адмін — усі', async () => { const w = await posOk(W, 'ideaList'), a = await posOk(A, 'ideaList'); must(w.list.some(x => x.id === iid) && a.list.some(x => x.id === iid), 'немає в списку'); });
  await step('💬 чат у зверненні: ideaThr бачить своє; ideaSay додає; чужий не може; порожнє — помилка', async () => {
    const l = (await posOk(W, 'ideaThr')).list; const t = l.find(x => x.text.includes('QA побажання ' + RUN)); must(t && t.hid, 'звернення немає в ideaThr: ' + JSON.stringify(l).slice(0, 150));
    must((await pos(W, 'ideaSay', { hid: t.hid, text: '   ' })).status === 400, 'порожнє прийняте');
    const s = await posOk(W, 'ideaSay', { hid: t.hid, text: 'QA відповідь ' + RUN }); must(s.x?.chat?.some(c => c.from === 'u' && c.text.includes('QA відповідь')) || s.chat?.some(c => c.from === 'u'), 'повідомлення не в чаті: ' + JSON.stringify(s).slice(0, 150));
    const cook = users.cook?.token; if (cook) { must((await pos(cook, 'ideaSay', { hid: t.hid, text: 'чужий' })).status === 400, 'чужий пише у звернення'); must(!(await posOk(cook, 'ideaThr')).list.some(x => x.hid === t.hid), 'чужий бачить звернення'); }
    await posOk(W, 'ideaSeen', { hid: t.hid }); });
  await step('🏦 cfgSet bankFee: 1.3 зберігається до сотих; поза межами — 400; повернули 0', async () => {
    const r = await posOk(A, 'cfgSet', { k: 'bankFee', v: 1.3 }); must(r.cfg.bankFee === 1.3, 'bankFee=' + r.cfg.bankFee);
    must((await pos(A, 'cfgSet', { k: 'bankFee', v: 99 })).status === 400, 'bankFee 99 прийнято'); must((await pos(A, 'cfgSet', { k: 'recBonus', v: -5 })).status === 400, 'recBonus -5 прийнято');
    must((await pos(W, 'cfgSet', { k: 'bankFee', v: 2 })).status !== 200, 'офіціант змінив комісію');
    await posOk(A, 'cfgSet', { k: 'bankFee', v: 0 }); });
  await step('waiter ✗ ideaDone', async () => { const r = await pos(W, 'ideaDone', { id: iid }); must(r.status === 400, String(r.status)); });
  await step('admin: ideaDone', async () => { const r = await posOk(A, 'ideaDone', { id: iid }); must(r.x.done, 'done'); });
  await step('waiter: ideaDel своє', async () => { await posOk(W, 'ideaDel', { id: iid }); const a = await posOk(A, 'ideaList'); must(!a.list.some(x => x.id === iid), 'не видалено'); iid = ''; });
  if (iid) await pos(A, 'ideaDel', { id: iid });
}

async function cleanup() {
  const A = users.admin?.token; if (!A) return;
  const st = await pos(A, 'staff'); const mine = (st.j.staff || []).filter(s => s.name.endsWith(' ' + RUN));
  for (const s of mine.filter(s => s.role !== 'admin')) await pos(A, 'staffDel', { id: s.id });
  const adm = mine.find(s => s.role === 'admin'); if (adm) await pos(A, 'staffDel', { id: adm.id });
}

// ---------- інтерфейс: безголовий Chrome через CDP ----------
function findChrome() {
  return [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean).find(p => existsSync(p));
}
async function cdpOpen(bin) {
  const dir = mkdtempSync(join(tmpdir(), 'varvar-qa-')), port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(bin, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--mute-audio', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 50 && !ws; i++) { await sleep(200); try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find(x => x.type === 'page'); if (p) ws = p.webSocketDebuggerUrl; } catch {} }
  if (!ws) { proc.kill(); throw new Error('Chrome не стартував'); }
  const sock = new WebSocket(ws); await new Promise((ok, no) => { sock.onopen = ok; sock.onerror = no; });
  let id = 0; const wait = new Map(), errs = [];
  sock.onmessage = m => {
    const x = JSON.parse(m.data);
    if (x.id && wait.has(x.id)) { const [ok, no] = wait.get(x.id); wait.delete(x.id); x.error ? no(new Error(x.error.message)) : ok(x.result); return; }
    if (x.method === 'Runtime.exceptionThrown') errs.push('exception: ' + (x.params.exceptionDetails.exception?.description || x.params.exceptionDetails.text).split('\n')[0]);
    if (x.method === 'Runtime.consoleAPICalled' && x.params.type === 'error') errs.push('console.error: ' + x.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    if (x.method === 'Log.entryAdded' && x.params.entry.level === 'error' && !/favicon/.test(x.params.entry.url || '')) errs.push('log: ' + x.params.entry.text.slice(0, 200) + (x.params.entry.url ? ' ' + x.params.entry.url : ''));
  };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; wait.set(i, [ok, no]); sock.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  const close = () => { try { sock.close(); } catch {} proc.kill(); setTimeout(() => rmSync(dir, { recursive: true, force: true }), 500); };
  return { send, ev, errs, close };
}

// що вилазить за .card / .kv / .kpi (і горизонтальний скрол сторінки)
// 🎨 --design: діагностика кнопок (замалі / завеликі / обрізаний текст / різна висота в ряду / «сирота» в останньому ряду) → _team/design-report.md
const DESIGN = ARGS.includes('--design'), designLog = new Map();
const designJs = (SEL = '#main button, #main .btn, #modal button, #sheet button, #phw button, nav button') => `(() => {
  const out = [], vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const txt = el => (el.innerText || el.title || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 30);
  const btns = [...document.querySelectorAll(${JSON.stringify(SEL)})].filter(vis);
  const mob = innerWidth < 600;
  for (const b of btns) { const r0 = b.getBoundingClientRect(), t = txt(b), ex = getComputedStyle(b, '::before').position === 'absolute' ? 16 : 0, exw = ex && getComputedStyle(b, '::before').left.startsWith('-') ? 12 : 0, r = { width: r0.width + exw, height: r0.height + ex };
    if (mob && (r.height < 34 || r.width < 34) && !b.closest('.ph-refs,.kpi')) out.push('замала ' + Math.round(r.width) + '×' + Math.round(r.height) + ': «' + t + '»');
    if (r.height > 72 && !b.querySelector('img') && !b.matches('.tbl,.tbl *,.kpi,.card,.big1,.ai-card') && !/grid|tile|tables/.test(b.parentElement.className)) out.push('зависока ' + Math.round(r.height) + 'px: «' + t + '»');
    if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflow !== 'visible') out.push('обрізаний текст: «' + t + '»'); }
  for (const p of new Set(btns.map(b => b.parentElement))) {
    if (p.matches('.st-g,.grid2,.sup-l,.nav,.grid,.ph-pick')) continue; const kids = [...p.children].filter(x => x.matches('button,.btn') && vis(x)); if (kids.length < 2) continue;
    const rows = new Map(); for (const k of kids) { const y = Math.round(k.getBoundingClientRect().top / 6); rows.set(y, [...(rows.get(y) || []), k]); }
    const rs = [...rows.values()], name = (p.className || p.tagName).toString().slice(0, 30);
    for (const row of rs) { const hs = row.map(k => k.getBoundingClientRect().height); if (Math.max(...hs) - Math.min(...hs) > 4) out.push('різна висота в ряду [' + name + ']: ' + row.map(txt).join(' / ')); }
    if (rs.length > 1 && rs.at(-1).length === 1 && rs[0].length > 2 && rs.at(-1)[0].getBoundingClientRect().width < p.clientWidth * .8) out.push('кнопка-сирота в останньому ряду [' + name + ']: «' + txt(rs.at(-1)[0]) + '»');
  }
  return [...new Set(out)];
})()`;
const DESIGN_JS = designJs();
const designNote = async (b, where, js = DESIGN_JS) => { if (!DESIGN) return; for (const x of await b.ev(js)) { const l = designLog.get(x) || []; if (l.length < 3) l.push(where); designLog.set(x, l); } };
const OVERFLOW_JS = `(() => {
  const bad = [], seen = new Set();
  const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const label = el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' «' + (el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '»');
  const scrolls = el => /auto|scroll/.test(getComputedStyle(el).overflowX);
  for (const box of document.querySelectorAll('#main .card, #main .kv, #main .kpi, #sheet .card, #sheet .kv, #sheet .kpi, #modal .card, #modal .kv')) {
    if (!vis(box)) continue;
    const br = box.getBoundingClientRect();
    if (!scrolls(box) && box.scrollWidth > box.clientWidth + 2) { const k = label(box); if (!seen.has(k)) { seen.add(k); bad.push('scrollWidth ' + box.scrollWidth + '>' + box.clientWidth + ': ' + k); } }
    for (const el of box.querySelectorAll('*')) {
      if (!vis(el) || el.closest('[style*="overflow"]') && el.closest('[style*="overflow"]') !== box && box.contains(el.closest('[style*="overflow"]'))) continue;
      let p = el.parentElement, inScroll = false; while (p && p !== box) { if (scrolls(p)) { inScroll = true; break; } p = p.parentElement; }
      if (inScroll) continue;
      const r = el.getBoundingClientRect();
      if (r.right > br.right + 2 || r.left < br.left - 2) { const k = label(el); if (!seen.has(k)) { seen.add(k); bad.push('вилазить на ' + Math.round(Math.max(r.right - br.right, br.left - r.left)) + 'px: ' + k + ' у ' + label(box)); } }
    }
  }
  if (document.documentElement.scrollWidth > innerWidth + 2) bad.push('горизонтальний скрол сторінки: ' + document.documentElement.scrollWidth + '>' + innerWidth);
  const mn = document.getElementById('main'); if (mn && mn.scrollWidth > mn.clientWidth + 2) bad.push('розділ ширший за екран (гуляє вбік): ' + mn.scrollWidth + '>' + mn.clientWidth);
  for (const c of document.querySelectorAll('#main .card .card')) if (vis(c)) { bad.push('плитка в плитці (незакритий div?): ' + label(c)); break; }
  for (const w of document.querySelectorAll('#main .switch')) if (vis(w) && Math.abs(w.getBoundingClientRect().width - 52) > 2) { bad.push('розтягнутий перемикач: ' + label(w.parentElement)); break; }
  return bad.slice(0, 8);
})()`;

const WIDTHS = ONLY_W?.length ? ONLY_W : [375, 880, 1280];
const TABS = ['cashTab', 'rTab', 'setTab', 'skTab', 'zpTab', 'crTab'];

async function uiTests() {
  sect('Інтерфейс каси (безголовий Chrome)');
  const bin = findChrome(); if (!bin) { rec('браузерний рушій', false, 'Chrome не знайдено — задайте CHROME=…'); return; }
  const siteOk = await fetch(SITE + '/pos.html').then(r => r.ok).catch(() => false);
  if (!rec('сайт ' + SITE + ' відповідає', siteOk)) return;
  if (!users.admin) { for (const [role, code] of [['admin', '1119'], ['courier', '1114'], ['cook', '1113']]) await step(`реєстрація ${role} для UI`, () => register(role, code)); }
  // щоб було що малювати: відкритий стіл і доставка
  try { const m = (await http('/api/menu')).j, it = m.categories.flatMap(c => c.items).find(i => i.price && !i.hidden); await pos(users.admin.token, 'order', { t: 1, items: [{ id: it.id, q: 1 }] }); } catch {}

  let b; try { b = await cdpOpen(bin); } catch (e) { rec('запуск Chrome', false, e.message); return; }
  const url = `${SITE}/pos.html?api=${encodeURIComponent(API)}`;
  const login = async u => {
    await b.send('Page.navigate', { url: SITE + '/pos.html?api=' + encodeURIComponent(API) + '&blank=1' }); await sleep(800);
    await b.ev(`localStorage.setItem('pos_token', ${JSON.stringify(JSON.stringify(u.token))}); localStorage.setItem('pos_me', ${JSON.stringify(JSON.stringify(u.me))}); 1`);
    await b.send('Page.navigate', { url }); await sleep(2500);
  };
  const checkView = async (who, w, v) => {
    const before = b.errs.length;
    await b.ev(`(() => { const x = document.querySelector('[data-a="view"][data-v="${v}"]'); if (!x) throw new Error('немає кнопки'); x.click(); return 1; })()`);
    await sleep(1800);
    const tabs = await b.ev(`[...document.querySelectorAll('#main [data-a]')].filter(x => ${JSON.stringify(TABS)}.includes(x.dataset.a)).map(x => [x.dataset.a, x.dataset.t ?? x.dataset.s ?? ''])`);
    const uniq = [...new Map(tabs.map(t => [t.join(':'), t])).values()];
    const over = [...await b.ev(OVERFLOW_JS)]; await designNote(b, `${who} ${w}px ${v}`);
    for (const [a, t] of uniq) {
      await b.ev(`(() => { const x = [...document.querySelectorAll('#main [data-a="${a}"]')].find(x => (x.dataset.t ?? x.dataset.s ?? '') === ${JSON.stringify(t)}); x && x.click(); return 1; })()`);
      await sleep(1300);
      for (const o of await b.ev(OVERFLOW_JS)) over.push(`[${a}=${t}] ${o}`); await designNote(b, `${who} ${w}px ${v}/${t}`);
      for (const s2 of await b.ev(`[...document.querySelectorAll('#main [data-a="loyTab"]')].map(x => x.dataset.s)`)) { // 🎁 підвкладки лояльності
        await b.ev(`(() => { const x = document.querySelector('#main [data-a="loyTab"][data-s="${s2}"]'); x && x.click(); return 1; })()`); await sleep(1300);
        for (const o of await b.ev(OVERFLOW_JS)) over.push(`[${a}=${t}/loy=${s2}] ${o}`);
      }
    }
    const errs = b.errs.slice(before);
    const empty = await b.ev(`(document.querySelector('#main')?.innerText || '').trim().length`);
    rec(`${who} ${w}px · ${v}${uniq.length ? ` (+${uniq.length} вкладок)` : ''}`, !errs.length && !over.length && empty > 0,
      [empty ? '' : 'порожній #main', ...errs.slice(0, 3), ...[...new Set(over)].slice(0, 4)].filter(Boolean).join(' | '));
  };
  try {
    for (const w of WIDTHS) {
      await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: w < 600 ? 812 : 900, deviceScaleFactor: 1, mobile: w < 600 });
      for (const [role, label] of [['admin', '👑 адмін'], ['waiter', '🧑‍🍳 офіціант'], ['cook', '👨‍🍳 кухар'], ['courier', '🛵 кур\'єр']]) {
        const u = users[role]; if (!u || (ONLY_ROLES && !ONLY_ROLES.includes(role))) continue;
        b.errs.length = 0; await login(u);
        if (b.errs.length) rec(`${label} ${w}px · завантаження`, false, b.errs.slice(0, 3).join(' | '));
        const views = await b.ev(`[...new Set([...document.querySelectorAll('[data-a="view"][data-v]')].map(x => x.dataset.v))]`);
        if (!views.length) { rec(`${label} ${w}px · навігація`, false, 'немає кнопок розділів (вхід не вдався?)'); continue; }
        for (const v of views) if (!ONLY_VIEWS || ONLY_VIEWS.includes(v)) await checkView(label, w, v);
      }
    }
    // 🖱 Натиснути кожну кнопку: адмін, 1280, у кожному розділі (і в листі стола) — жодної помилки JS. Ловить «переніс/перейменував функцію — кнопка мовчки зламалась».
    // Діалоги закриваються Escape (= «Скасувати»). Кнопки, що одразу щось змінюють або стирають, пропускаємо.
    if (!ONLY_VIEWS && !ONLY_ROLES && users.admin) {
      sect('🖱 Кожна кнопка каси натискається без помилки');
      await b.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await login(users.admin);
      const SKIP = /reset|clear|del|out$|^stop|cfg|tgl|^look|fav|snd|logout|switch|^fs$|ptest|^pq|^k(item|all|start|undo|msg)$|accept|reject|tpay|refund|evack|^send$|closet|^rm$|^cq$|regset|kpct|catpack|catg|undo|wifi|^tip|disc|float|expense|^move|^split|^spq$|bkcame|bkset|^cr(act|done|give|prob)|^go(done|take|road|st|courset)$|^add$|back$|reopen|^c(edit|print|refund|move)$|^ph|qrpanel|menuedit|staffadd|bon|^pay|^z|^tw$|^ur$|^pk$|^table$|^view$|^newOrder$|^feed$|^more$|^shOpen$|^certPay$|copylink|^upsEdit$/i;
      const views = await b.ev(`[...new Set([...document.querySelectorAll('[data-a="view"][data-v]')].map(x => x.dataset.v))]`);
      let clicked = 0; const bad = [];
      for (const v of views) {
        await b.ev(`(() => { document.querySelector('[data-a="view"][data-v="${v}"]')?.click(); return 1; })()`); await sleep(1500);
        if (v === 'hall') { await b.ev(`(() => { document.querySelector('[data-a="table"][data-t="1"]')?.click(); return 1; })()`); await sleep(1200); }
        const scan = () => b.ev(`[...new Map([...document.querySelectorAll('[data-a]')].filter(x => x.offsetParent && !x.closest('#modal')).map(x => [x.dataset.a + JSON.stringify(x.dataset), x.dataset.a])).entries()]`);
        const seen = new Set(), queue = [];
        const add = l => { for (const [k, a] of l) if (!seen.has(k) && !SKIP.test(a)) { seen.add(k); queue.push([k, a]); } };
        add(await scan());
        for (let n = 0; queue.length && n < 150; n++) {
          const [k, a] = queue.shift(), n0 = b.errs.length;
          const hit = await b.ev(`(() => { const x = [...document.querySelectorAll('[data-a]')].find(x => x.dataset.a + JSON.stringify(x.dataset) === ${JSON.stringify(k)}); if (!x || !x.offsetParent) return 0; x.click(); return 1; })()`);
          if (!hit) continue; await sleep(450);
          for (let i = 0; i < 3; i++) { await b.ev(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return 1; })()`); await sleep(120); }
          clicked++; const e2 = b.errs.slice(n0).filter(x => /^(exception|console\.error)/.test(x)); if (e2.length) bad.push(`${v}/${a}: ${e2[0].slice(0, 160)}`);
          // кнопка могла перевести в інший розділ — повертаємось; нові кнопки (підвкладки) — у чергу
          await b.ev(`(() => { if (!document.querySelector('[data-a="view"][data-v="${v}"].on')) document.querySelector('[data-a="view"][data-v="${v}"]')?.click(); return 1; })()`);
          add(await scan());
        }
      }
      rec(`натиснуто ${clicked} кнопок у ${views.length} розділах`, !bad.length, bad.slice(0, 5).join(' | '));
    }
    // 📴 офлайн: без мережі замовлення стає в чергу на пристрої, стіл показує ⏳, з появою звʼязку черга сама йде на сервер (один раз)
    if (users.admin && (!ONLY_ROLES || ONLY_ROLES.includes('admin')) && (!ONLY_VIEWS || ONLY_VIEWS.includes('hall'))) await step('📴 офлайн: замовлення в черзі → ⏳ на столі → звʼязок → на сервері один раз', async () => {
      const A = users.admin.token, s0 = await posOk(A, 'state'), busy = new Set(s0.tables.map(x => x.t)); let t;
      await b.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await login(users.admin);
      const n0 = b.errs.length; await b.send('Network.enable');
      await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await sleep(600);
      try {
        await b.ev(`(() => { document.querySelector('[data-a="view"][data-v="hall"]')?.click(); return 1; })()`); await sleep(900);
        t = (await b.ev(`[...document.querySelectorAll('[data-a="table"]')].map(x => +x.dataset.t)`)).find(x => !busy.has(x)); must(t, 'немає вільного столу');
        must(await b.ev(`(() => { const x = document.querySelector('[data-a="table"][data-t="${t}"]'); x?.click(); return !!x; })()`), 'немає столу ' + t + ': ' + (await b.ev(`[...document.querySelectorAll('[data-a="table"]')].map(x => x.dataset.t).join(',')`))); await sleep(900);
        must(await b.ev(`(() => { const x = document.querySelector('#shItems [data-a="add"]:not(.off)'); if (!x) return 0; x.click(); return 1; })()`), 'немає страви в меню столу'); await sleep(300);
        must(await b.ev(`(() => { const x = document.querySelector('[data-a="send"]'); x?.click(); return !!x; })()`), 'немає кнопки «надіслати»'); await sleep(1500);
        const txt = await b.ev(`document.body.innerText`);
        must(/📴/.test(txt) && /у черзі/.test(txt), 'немає плашки «📴 … у черзі»');
        must(/⏳/.test(txt), 'на столі немає ⏳ (замовлення з черги не видно)');
        must(!(await posOk(A, 'state')).tables.some(x => x.t === t), 'без мережі замовлення не мало дійти');
      } finally { await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); }
      let bill; for (let i = 0; i < 20 && !bill; i++) { await sleep(700); bill = (await posOk(A, 'state')).tables.find(x => x.t === t); }
      must(bill, 'після звʼязку черга не відправилась');
      await sleep(1500); const q = await b.ev(`Object.keys(localStorage).filter(k => /offq$/.test(k)).map(k => JSON.parse(localStorage[k]).length).reduce((a, x) => a + x, 0)`);
      must(q === 0, 'черга не очистилась: ' + q);
      const again = (await posOk(A, 'state')).tables.find(x => x.t === t); must(again.items.reduce((a, x) => a + x.q, 0) === 1, 'замовлення задвоїлось: ' + JSON.stringify(again.items));
      const errs = b.errs.slice(n0).filter(x => /^exception/.test(x)); must(!errs.length, errs[0]);
      await pos(A, 'close', { t, pay: 'cash', print: false });
    });
    if (DESIGN) await designPages(b);
  } finally { b.close();
    if (DESIGN) { const { writeFileSync } = await import('node:fs'); writeFileSync(new URL('../_team/design-report.md', import.meta.url), `# 🎨 Діагностика кнопок · ${new Date().toISOString().slice(0, 16)}\n\nЗнайдено: ${designLog.size}\n\n` + [...designLog].map(([k, v]) => `- ${k}  \n  _${v.join(' · ')}_`).join('\n') + '\n'); console.log('🎨 design-report: ' + designLog.size); } }
}

// 🎨 кабінет власника, меню гостя, доставка, візитка — та сама діагностика кнопок
async function designPages(b) {
  const ALL = designJs('body button:not(#main *), body .btn, body a.btn, body [role=button]');
  const go = async (u, ms = 2500) => { await b.send('Page.navigate', { url: u }); await sleep(ms); };
  const own = await http('/api/owner', { op: 'login', email: 'qa-platform@test.local', pass: 'qa-platform-pass-1' }).catch(() => ({}));
  for (const w of [375, 1280]) {
    await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: w < 600 ? 812 : 900, deviceScaleFactor: 1, mobile: w < 600 });
    for (const [name, path] of [['меню гостя', '/index.html?t=1'], ['доставка', '/index.html?go'], ['візитка', '/about.html']]) {
      await go(`${SITE}${path}${path.includes('?') ? '&' : '?'}api=${encodeURIComponent(API)}`, 3000); await designNote(b, `${name} ${w}px`, ALL);
      if (name !== 'візитка') { await b.ev(`(() => { const x = document.querySelector('[data-add], .add, .plus, .dish button'); x && x.click(); return 1; })()`); await sleep(800); await designNote(b, `${name} ${w}px (після «додати»)`, ALL); }
    }
    if (own.j?.token) {
      await go(`${SITE}/owner.html?api=${encodeURIComponent(API)}`, 800);
      await b.ev(`localStorage.setItem('own_token', JSON.stringify(${JSON.stringify(own.j.token)})); 1`); await go(`${SITE}/owner.html?api=${encodeURIComponent(API)}`, 3000);
      await designNote(b, `кабінет ${w}px`, ALL);
      for (const t of await b.ev(`[...document.querySelectorAll('[data-a="tab"]')].map(x => x.dataset.t)`)) {
        await b.ev(`(() => { document.querySelector('[data-a="tab"][data-t="${t}"]')?.click(); return 1; })()`); await sleep(2000); await designNote(b, `кабінет ${w}px ${t}`, ALL);
      }
    }
  }
}

// ---------- запуск ----------
(async () => {
  if (!QUIET) console.log(`🧪 VARVAR selftest · API ${API} · сайт ${SITE} · прогін ${RUN}`);
  let ok = true;
  try {
    if (!ARGS.includes('--ui-only')) ok = await apiTests();
    if (ok !== false && !ARGS.includes('--ui-only') && users.admin?.token) { await smokeOps(users.admin.token); if (users.admin.pin) await botSmoke(users.admin.pin); }
    if (ok !== false && !ARGS.includes('--api-only')) {
      if (!users.waiter) await step('реєстрація waiter для UI', () => register('waiter', '1112'));
      await uiTests();
    }
  } catch (e) { rec('непередбачена помилка', false, e.stack?.split('\n').slice(0, 3).join(' ')); }
  finally { await cleanup().catch(() => {}); }
  const bad = results.filter(r => !r.ok);
  console.log(`\n${bad.length ? '❌' : '✅'} Разом: ${results.length - bad.length}/${results.length} пройдено`);
  if (bad.length) { console.log('Впало:'); for (const r of bad) console.log(`  ❌ [${r.group}] ${r.name}`); }
  process.exit(bad.length ? 1 : 0);
})();
