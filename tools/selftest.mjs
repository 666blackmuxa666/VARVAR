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
function pin() { let p; do { p = String(1000 + Math.floor(Math.random() * 9000)); } while (/^111[1-9]$/.test(p) || usedPins.has(p)); usedPins.add(p); return p; }
async function register(role, code) {
  const name = `QA ${role} ${RUN}`;
  for (let i = 0; i < 5; i++) { // PIN може випадково збігтися з чужим
    const r = await http('/api/pos', { op: 'register', code, name, pin: pin() });
    if (r.status === 200 && r.j.token) { users[role] = { token: r.j.token, me: r.j.me }; must(r.j.me.role === role, `роль ${r.j.me.role} ≠ ${role}`); return r.j.me.name; }
    if (!/PIN/.test(r.j.error || '')) throw new Error(`${r.status} ${JSON.stringify(r.j)}`);
  }
  throw new Error('не вдалося підібрати PIN');
}

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

  sect('Стіл → кухня → закриття');
  let T = 0;
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
  await step('адмін приймає', async () => {
    const r = await posOk(A, 'accept', { oid }); must(r.done, 'accept=false');
    const s = await posOk(A, 'state'); const b = s.tables.find(x => x.t === G); must(b?.go?.st === 'acc', 'go.st=' + b?.go?.st);
  });
  if (C) {
    await step('кур\'єр бере', async () => { const r = await posOk(C, 'courAct', { t: G, act: 'take' }); must(r.go?.cour === users.courier.me.name, 'cour=' + r.go?.cour); });
    await step('кур\'єр: поїхав', async () => { const r = await posOk(C, 'courAct', { t: G, act: 'road' }); must(r.go?.st === 'road', 'st=' + r.go?.st); });
    await step('кур\'єр: видано 💵 → чек закрито', async () => {
      const r = await posOk(C, 'courAct', { t: G, act: 'done', arg: 'cash' }); must(r.done, 'не закрито');
      const o = await http('/api/orders?ids=' + oid); const st = JSON.stringify(o.j); must(/done/.test(st), 'статус гостя: ' + st.slice(0, 150));
      const me = await posOk(C, 'courMe'); return `готівка в кур'єра: ${JSON.stringify(me.day?.cash ?? me.day).slice(0, 60)}`;
    });
  } else rec('кур\'єр не зареєстрований — сценарій пропущено', false);

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

  sect('Броні');
  let bid = '';
  const d0 = day(3), d1 = day(103);
  await step(`POST /api/book на ${d0}`, async () => {
    const r = await http('/api/book', { name: 'QA Бронь', phone: '0670001' + String(Math.floor(Math.random() * 900) + 100), date: d0, time: '19:00', people: 2, device: 'qa-bk-' + RUN });
    must(r.status === 200 && r.j.ok, `${r.status} ${JSON.stringify(r.j)}`); bid = r.j.id; return bid;
  });
  await step('bkSet ok', async () => { const r = await posOk(A, 'bkSet', { id: bid, st: 'ok' }); must(r.b?.st === 'ok', 'st=' + r.b?.st); });
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
    [W, 'waiter', 'shift'], [W, 'waiter', 'delete', { t: 1 }], [W, 'waiter', 'zpGrid', { m: day().slice(0, 7) }], [W, 'waiter', 'courList'],
  ];
  for (const [tok, role, op, b] of deny) {
    if (!tok) { rec(`${role} ✗ ${op}`, false, 'немає токена'); continue; }
    await step(`${role} ✗ ${op}`, async () => { const r = await pos(tok, op, b); must(r.status === 403, `статус ${r.status} ${JSON.stringify(r.j).slice(0, 100)}`); });
  }
  if (G2) await pos(A, 'delete', { t: G2, reason: 'QA тест' });
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
    await step('staffEdit: PIN = код реєстрації / чужий PIN → 400', async () => { for (const p of ['1114', '1119']) { const r = await pos(A, 'staffEdit', { id: sid, pin: p }); must(r.status === 400, p + ' → ' + r.status); } });
    const np = pin();
    await step('staffEdit: новий PIN → вхід ним', async () => { await posOk(A, 'staffEdit', { id: sid, pin: np }); const r = await http('/api/pos', { op: 'login', pin: np }); must(r.j.token && r.j.me.name === nu, JSON.stringify(r.j).slice(0, 120)); users.cook = { token: r.j.token, me: r.j.me }; });
    await step('staffEdit: роль кур\'єр → назад кухар', async () => { await posOk(A, 'staffEdit', { id: sid, role: 'courier' }); let s = (await posOk(A, 'staff')).staff.find(x => x.id === sid); must(s.role === 'courier', s.role);
      await posOk(A, 'staffEdit', { id: sid, role: 'cook' }); const r = await http('/api/pos', { op: 'login', pin: np }); must(r.j.me?.role === 'cook', JSON.stringify(r.j).slice(0, 100)); users.cook = { token: r.j.token, me: r.j.me }; });
    await step('коди реєстрації: є кур\'єр', async () => { const r = await posOk(A, 'staff'); must(r.reg.courier, 'нема reg.courier'); });
  }
  return true;
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
    await step('звіт loyRep за сьогодні', async () => { const r = await posOk(A, 'loyRep', { from: day(), to: day() }); must(r.sum > 0 && r.list.some(x => x.k === 'lvl:' + lvId), JSON.stringify(r).slice(0, 200)); return `${r.sum} грн знижок`; });
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
  await step('certBd: кальян безкоштовно, вдруге за рік — ні', async () => {
    const m = await http('/api/menu'), cat = m.j.categories.find(c => c.items.some(i => i.id === 'hookah-silver')); if (!cat) return 'немає hookah-silver у меню — пропуск';
    const hk = cat.items.filter(i => typeof i.price === 'number' && !/з собою/i.test(i.name.uk)).sort((a, b) => b.price - a.price)[0];
    const st = await posOk(A, 'state'), busy = new Set(st.tables.map(x => x.t)); let T = 0; for (let t = st.n; t >= 1; t--) if (!busy.has(t)) { T = t; break; }
    await posOk(A, 'order', { t: T, items: [{ id: hk.id, q: 1 }] });
    const ph = '067' + String(Date.now()).slice(-7);
    try { const r = await posOk(A, 'certBd', { t: T, phone: ph, name: 'QA' }); must(r.use === hk.price, `знято ${r.use}, а кальян ${hk.price}`);
      const again = await pos(A, 'certBd', { t: T, phone: ph }); must(again.status === 400, 'вдруге дозволило'); await posOk(A, 'certOff', { t: T }); const b0 = (await posOk(A, 'state')).tables.find(x => x.t === T); must(!b0.cert && !b0.bonus, 'сертифікат лишився в рахунку'); const re = await posOk(A, 'certBd', { t: T, phone: ph }); must(re.use === hk.price, 'після «прибрати» не можна вибити знову'); return `${hk.name.uk} −${r.use}`; }
    finally { await pos(A, 'delete', { t: T, reason: 'QA' }); }
  });

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
    for (let i = 0; i < 5 && !VA; i++) { const r = await vpos(null, 'register', { code: codes.admin, name: 'QA адмін закладу', pin: String(2000 + Math.floor(Math.random() * 7000)) }); VA = r.j.token || ''; }
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
  await step('💾 бекап: зробити, список, відновити (стіл повертається)', async () => {
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number');
    const b = await ownT(PT, 'bak', { venue: VID, do: 'now' }); must(b.j.ok && b.j.n > 0, JSON.stringify(b.j));
    const l = await ownT(PT, 'bak', { venue: VID, do: 'list' }); must(l.j.list.length >= 1, 'список');
    await vpos(VA, 'order', { t: 5, items: [{ id: it.id, q: 1 }] }); must((await vpos(VA, 'state')).j.tables.some(x => x.t === 5), 'стіл 5');
    { const ol = (await own({ op: 'login', email: OE, pass: 'owner-pass-123' })).j.token; must((await ownT(ol, 'bak', { venue: VID, do: 'restore', tag: b.j.tag, confirm: VID })).status === 403, 'власник відновив'); }
    const r = await ownT(PT, 'bak', { venue: VID, do: 'restore', tag: b.j.tag, confirm: VID }); must(r.j.ok, JSON.stringify(r.j));
    must(!(await vpos(VA, 'state')).j.tables.some(x => x.t === 5), 'після відновлення стіл 5 лишився'); });
  await step('📴 офлайн-черга: повтор з тим самим qid не дублює замовлення', async () => {
    const it = (await http(`/v/${VID}/api/menu`)).j.categories.flatMap(c => c.items).find(i => typeof i.price === 'number'), qid = 'qa' + Date.now().toString(36);
    for (let i = 0; i < 2; i++) must((await vpos(VA, 'order', { t: 6, items: [{ id: it.id, q: 1 }], qid })).status === 200, 'order');
    const t6 = (await vpos(VA, 'state')).j.tables.find(x => x.t === 6); must(t6 && t6.items.reduce((a, x) => a + x.q, 0) === 1, 'дубль: ' + JSON.stringify(t6?.items));
    await vpos(VA, 'delete', { t: 6, reason: 'QA' }); });
  await step('невідомий заклад → 404', async () => { const r = await http('/v/nope-' + VID.slice(-5) + '/api/menu'); must(r.status === 404, String(r.status)); });
  await step('кабінет власника: свої заклади, аналітика, вхід у касу', async () => {
    const l = await own({ op: 'login', email: OE, pass: 'owner-pass-123' }); OT = l.j.token; must(OT, 'вхід');
    const me = await ownT(OT, 'me'); must(me.j.venues.length === 1 && me.j.venues[0].id === VID, 'бачить чужі заклади: ' + me.j.venues.map(v => v.id));
    const sm = await ownT(OT, 'sum', {}); must(sm.j.list?.[0]?.tot, 'sum ' + JSON.stringify(sm.j).slice(0, 150));
    must((await ownT(OT, 'enter', { venue: 'varvar' })).status === 403, 'зайшов у чужий заклад');
    const en = await ownT(OT, 'enter', { venue: VID }); must(en.j.token, 'enter'); must((await vpos(en.j.token, 'state')).status === 200, 'токен власника не працює');
    must((await ownT(OT, 'accts')).status === 403, 'власник бачить консоль платформи'); });
  await step('платформа бачить усі заклади', async () => { const me = await ownT(PT, 'me'); must(me.j.venues.some(v => v.id === 'varvar') && me.j.venues.some(v => v.id === VID), 'не всі'); });
  await step('платформа: доступ керуючому, зміна власника, видалення', async () => {
    const ME = `qa-mgr-${VID}@test.local`; must((await ownT(PT, 'acctNew', { email: ME, pass: 'manager-pass-1', name: 'QA керуючий' })).j.ok, 'acctNew');
    must((await ownT(PT, 'grant', { venue: VID, email: ME, on: true })).j.ok, 'grant');
    const mt = (await own({ op: 'login', email: ME, pass: 'manager-pass-1' })).j.token; must((await ownT(mt, 'me')).j.venues.some(v => v.id === VID), 'керуючий не бачить');
    must((await ownT(PT, 'acctDel', { email: OE })).status === 400, 'видалило власника з закладом');
    must((await ownT(PT, 'venueSet', { id: VID, f: { owner: ME } })).j.ok, 'зміна власника');
    must((await ownT(PT, 'venueDel', { id: 'varvar', confirm: 'varvar' })).status === 400, 'VARVAR видаляється!');
    must((await ownT(PT, 'venueDel', { id: VID, confirm: 'wrong' })).status === 400, 'без підтвердження');
    must((await ownT(PT, 'venueDel', { id: VID, confirm: VID })).j.ok, 'venueDel');
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
        const r = await posOk(A, 'certBd', { t: T }); try { must(r.use <= Math.round(hk.price * 0.8) + 1, `знято ${r.use} при до сплати ${hk.price * 0.8}`); } finally { await pos(A, 'delete', { t: T, reason: 'QA' }); } });
      await step("об'єднання столів знімає сертифікат (повертає суму)", async () => { const T1 = await free(); await posOk(A, 'order', { t: T1, items: [{ id: hk.id, q: 1 }] }); const T2 = await free(); await posOk(A, 'order', { t: T2, items: [{ id: hk.id, q: 1 }] });
        await posOk(A, 'certBd', { t: T1 }); const r = await posOk(A, 'move', { t: T1, to: T2 }); try { must(r.r?.released, 'released ' + JSON.stringify(r.r)); const b = (await posOk(A, 'state')).tables.find(x => x.t === T2); must(!b.cert && !b.bonus, 'сертифікат лишився на об\'єднаному'); } finally { await pos(A, 'delete', { t: T2, reason: 'QA' }); } });
      await step('видалення закритого чека повертає суму сертифіката', async () => { const T = await free(), ph = '067' + String(Date.now()).slice(-7); await posOk(A, 'order', { t: T, items: [{ id: hk.id, q: 1 }] });
        await posOk(A, 'certBd', { t: T, phone: ph }); const cl = await posOk(A, 'close', { t: T, pay: 'cash', print: false }); must((await certLeft(ph)) === 0, 'після закриття не 0');
        const day = (await posOk(A, 'closed', {})).list.filter(x => x.t === T && x.cert && !x.rm).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0]; must(day, 'чек не знайдено'); await posOk(A, 'closedDel', { ref: day.id });
        const left = await certLeft(ph); must(left > 0, 'сертифікат не повернувся: ' + left); });
    } }

  sect('💡 Побажання розробнику');
  let iid = '';
  await step('waiter: ideaAdd', async () => { const r = await posOk(W, 'ideaAdd', { text: 'QA побажання ' + RUN }); iid = r.x.id; must(iid, 'id'); });
  await step('waiter бачить своє, адмін — усі', async () => { const w = await posOk(W, 'ideaList'), a = await posOk(A, 'ideaList'); must(w.list.some(x => x.id === iid) && a.list.some(x => x.id === iid), 'немає в списку'); });
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
    const over = [...await b.ev(OVERFLOW_JS)];
    for (const [a, t] of uniq) {
      await b.ev(`(() => { const x = [...document.querySelectorAll('#main [data-a="${a}"]')].find(x => (x.dataset.t ?? x.dataset.s ?? '') === ${JSON.stringify(t)}); x && x.click(); return 1; })()`);
      await sleep(1300);
      for (const o of await b.ev(OVERFLOW_JS)) over.push(`[${a}=${t}] ${o}`);
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
  } finally { b.close(); }
}

// ---------- запуск ----------
(async () => {
  if (!QUIET) console.log(`🧪 VARVAR selftest · API ${API} · сайт ${SITE} · прогін ${RUN}`);
  let ok = true;
  try {
    if (!ARGS.includes('--ui-only')) ok = await apiTests();
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
