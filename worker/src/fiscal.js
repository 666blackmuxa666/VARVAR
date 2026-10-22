// 🧾 ПРРО Checkbox: фіскальний чек на кожен закритий рахунок, повернення, службові внесення/видачі, Z.
// Лише для закладів платформи з ключами в кабінеті — VARVAR не чіпаємо (свій РРО).
// 🏪 Кілька ФОП: каса «a» — CHECKBOX_LICENSE/PIN; інші — CHECKBOX_MORE { k: { lic, pin } }; опис FOPS { k: { n, g, lim, base, cats[] }, ib }.
//    Страви розділів cats[] ідуть у чек своєї каси, решта (і чайові) — у «a»; оплата ділиться пропорційно сумам чеків.
// Чек звіряється з записом «closed:»: fisSync приводить фіскальний стан (x.fis.r[каса]) до запису (продаж / повернення / новий продаж після правки).
// Ідемпотентність: id чека Checkbox — похідний від заклад+рахунок+каса+версія, тож повтор не створить дубль; обрив зв'язку → перевірка, чи чек дійшов.
import { MAIN, seal, unseal } from './venue.js';
import { L, dayKey, notify } from './ops-core.js';
import { exReceipt, exBack } from './excise.js';

const API = 'https://api.checkbox.ua/api/v1';
const J = s => { try { return (typeof s === 'string' ? JSON.parse(s || '{}') : s) || {}; } catch { return {}; } };
export const fisOn = env => !env.NOFIS && env.VENUE && env.VENUE !== MAIN && !!(env.CHECKBOX_LICENSE && env.CHECKBOX_PIN);
export const fopMeta = env => J(env.FOPS);
// каси закладу: [{ k, lic, pin, n, g, lim, base, cats }] — «a» завжди перша
export function kasas(env) {
  if (!fisOn(env)) return [];
  const meta = fopMeta(env), more = J(env.CHECKBOX_MORE);
  return [{ k: 'a', lic: env.CHECKBOX_LICENSE, pin: env.CHECKBOX_PIN, ...(meta.a || {}), cats: [] },
    ...Object.entries(more).filter(([k, c]) => k !== 'a' && c?.lic && c?.pin).map(([k, c]) => ({ k, lic: c.lic, pin: c.pin, ...(meta[k] || {}), cats: meta[k]?.cats || [] }))];
}
// 📊 ліміти єдиного податку 2026 (МЗП 8647 ₴): 1 гр. — 167 МЗП, 2 гр. — 834, 3 гр. — 1167. Власник може вказати свій.
export const LIM = { 1: 1444049, 2: 7211598, 3: 10091049 };
const limOf = c => +c.lim > 0 ? +c.lim : LIM[c.g] || 0;
const isMock = (env, c) => /^mock-test/.test(c.lic) && (env.PLATFORM_BOT || env.BOT_TOKEN) === 'local-test'; // 🧪 лише тестовий сервер

// 🧪 імітація Checkbox для selftest: запити пишуться в fis:mock (з касою k)
async function mock(env, c, m, path, body) {
  const l = (await env.DB.get('fis:mock', 'json')) || []; l.push({ k: c.k, m, path, body }); await env.DB.put('fis:mock', JSON.stringify(l.slice(-40)));
  const sk = 'fis:mockShift:' + c.k, rk = 'fis:mockR:' + c.k;
  if (c.pin === 'bad') return { status: 401, j: { message: 'Невірний PIN' } };
  if (path === '/cashier/signinPinCode') return { status: 200, j: { access_token: 'mock' } };
  if (path === '/cash-registers/info') return { status: 200, j: { title: 'Тестова каса ' + c.k, fiscal_number: '4000000000', is_test: true } };
  if (path === '/cashier/shift') return { status: 200, j: (await env.DB.get(sk)) ? { id: 's1', status: 'OPENED' } : null };
  if (path === '/shifts') { await env.DB.put(sk, '1'); return { status: 202, j: { id: 's1', status: 'CREATED' } }; }
  if (path === '/shifts/close') { await env.DB.delete(sk); return { status: 202, j: { id: 's1', status: 'CLOSING' } }; }
  const seen = (await env.DB.get(rk, 'json')) || [];
  if (path.startsWith('/receipts/') && m === 'GET') return seen.includes(path.slice(10)) ? { status: 200, j: { id: path.slice(10) } } : { status: 404, j: { message: 'not found' } };
  if (/^\/receipts\/(sell|service)$/.test(path)) {
    if (!(await env.DB.get(sk))) return { status: 400, j: { message: 'Зміну не відкрито' } };
    if (seen.includes(body.id)) return { status: 400, j: { message: 'Чек з таким id вже існує' } };
    await env.DB.put(rk, JSON.stringify([...seen, body.id].slice(-60)));
    if (/drop/.test(c.lic) && !(await env.DB.get('fis:mockDd:' + c.lic))) { await env.DB.put('fis:mockDd:' + c.lic, '1'); return { status: 0, j: { message: 'Checkbox не відповідає: обрив' } }; } // 🧪 чек дійшов, відповідь — ні
    return { status: 201, j: { id: body.id, status: 'CREATED' } };
  }
  return { status: 404, j: { message: 'mock: ' + path } };
}

async function raw(env, c, m, path, body, tok) {
  if (isMock(env, c)) return mock(env, c, m, path, body);
  const h = { 'X-Client-Name': 'ATOM', 'X-Client-Version': '1', 'X-License-Key': c.lic, 'content-type': 'application/json' };
  if (tok) h.Authorization = 'Bearer ' + tok;
  try { const r = await fetch(API + path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) }); return { status: r.status, j: await r.json().catch(() => null) }; }
  catch (e) { return { status: 0, j: { message: 'Checkbox не відповідає: ' + e.message } }; }
}
const errOf = r => { const j = r.j || {}; return String(j.message || (Array.isArray(j.detail) ? j.detail.map(d => d.msg).join('; ') : j.detail) || `Checkbox: код ${r.status}`).slice(0, 200); };
const dupe = r => r.status < 300 || /вже існує|already exists/i.test(errOf(r)); // повтор того самого id — чек уже є
const lost = r => r.status === 0 || r.status >= 500; // невідомо, чи дійшов

// 🔑 токен касира (зашифровано в базі закладу; новий — при 401)
async function token(env, c, fresh) {
  const key = c.k === 'a' ? 'fis:tok' : 'fis:tok:' + c.k;
  if (!fresh) { const t = await unseal(env, await env.DB.get(key)).catch(() => null); if (t?.tok && t.lic === c.lic.slice(-6)) return t.tok; }
  const r = await raw(env, c, 'POST', '/cashier/signinPinCode', { pin_code: c.pin });
  if (!r.j?.access_token) throw new Error(r.status === 401 || r.status === 403 ? 'Checkbox не приймає PIN касира або ключ каси' : errOf(r));
  await env.DB.put(key, await seal(env, { tok: r.j.access_token, lic: c.lic.slice(-6) })); return r.j.access_token;
}
async function call(env, c, m, path, body) {
  let r = await raw(env, c, m, path, body, await token(env, c));
  if (r.status === 401) r = await raw(env, c, m, path, body, await token(env, c, true));
  return r;
}

// зміна: відкрита → нічого; ні → відкриваємо й чекаємо OPENED (підпис КЕП у ДПС — кілька секунд). ⏰ авто-закриття через 23,5 год, якщо забули Z.
async function ensureShift(env, c) {
  let r = await call(env, c, 'GET', '/cashier/shift');
  if (r.j?.status === 'OPENED') return;
  if (!r.j || r.j.status === 'CLOSED') { let o = await call(env, c, 'POST', '/shifts', { auto_close_at: new Date(Date.now() + 23.5 * 3600e3).toISOString() }); if (o.status === 422 || o.status === 400) o = await call(env, c, 'POST', '/shifts', {}); if (o.status >= 300) throw new Error('Зміна Checkbox не відкрилась: ' + errOf(o)); }
  for (let i = 0; i < 4; i++) { r = await call(env, c, 'GET', '/cashier/shift'); if (r.j?.status === 'OPENED') return; await new Promise(f => setTimeout(f, 1500)); }
  throw new Error('Зміна Checkbox ще відкривається — повторіть за хвилину');
}

async function uuid(s) { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].slice(0, 16); h[6] = (h[6] & 15) | 64; h[8] = (h[8] & 63) | 128; const x = h.map(b => b.toString(16).padStart(2, '0')).join(''); return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`; }
const code = n => 'a' + [...n].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
const K = g => Math.round(g * 100); // грн → копійки
const sumOf = h => { try { return (JSON.parse(h).payments || []).reduce((a, p) => a + p.value, 0); } catch { return 0; } };
// поділ суми (копійки) пропорційно вагам; залишок округлення — останньому
function share(sum, w) { const ks = Object.keys(w), T = ks.reduce((a, k) => a + w[k], 0), o = {}; let left = sum; ks.forEach((k, i) => { o[k] = i === ks.length - 1 ? left : T ? Math.round(sum * w[k] / T) : 0; left -= o[k]; }); return o; }

// запис «closed:» → чеки по касах: страви, чайові окремим рядком (так радить Checkbox), знижки/бонуси — знижкою на чек, оплати готівка+безготівка
// ex (excise.js): страва → { uk — код УКТ ЗЕД, c — марки пляшок, відкритих цим продажем }; route: назва страви → каса
const exGood = (g, e) => { if (!e) return g; if (e.uk) g.uktzed = e.uk; const b = (e.c || []).filter(z => !z[2]).map(z => z[1]), el = (e.c || []).filter(z => z[2]).map(z => z[1]); if (b.length) g.excise_barcodes = b; if (el.length) g.e_excise_barcodes = el; return g; };
export function receiptsOf(x, ex = {}, route = () => 'a') {
  const per = {};
  for (const [n, q, s] of x.dishes || []) { const m = per[route(n.split(' › ')[0]) || 'a'] ||= new Map(), a = m.get(n) || [0, 0]; m.set(n, [a[0] + q, a[1] + s]); }
  if (!Object.keys(per).length && x.sum - (x.tip || 0) > 0) per.a = new Map([['Замовлення', [1, x.gross ?? x.sum - (x.tip || 0)]]]); // старий/«схудлий» запис без страв
  const goods = {}; // 🧩 безкоштовний модифікатор (прожарка) — не позиція чека
  for (const [k, m] of Object.entries(per)) for (const [n, [q, s]] of m) if (q > 0 && s >= 0 && !(s === 0 && n.includes(' › '))) (goods[k] ||= []).push(K(s) % q ? { good: exGood({ code: code(n), name: `${q}× ${n}`.slice(0, 120), price: K(s) }, ex[n]), quantity: 1000 } : { good: exGood({ code: code(n), name: n.slice(0, 120), price: K(s) / q }, ex[n]), quantity: q * 1000 });
  if (x.tip) (goods.a ||= []).push({ good: { code: 'tip', name: 'Чайові', price: K(x.tip) }, quantity: 1000 });
  const tot = Object.fromEntries(Object.entries(goods).map(([k, g]) => [k, g.reduce((a, y) => a + y.good.price * y.quantity / 1000, 0)]));
  const paid = share(K(x.sum), tot), card = share(Math.min(K(x.card || 0), K(x.sum)), paid), out = {};
  const label = x.ib && x.ib >= (x.card || 0) ? 'Переказ на рахунок' : x.onl && x.onl >= (x.card || 0) ? 'Онлайн' : 'Картка';
  for (const k of Object.keys(goods)) {
    const body = { goods: goods[k], payments: [] }, p = paid[k];
    if (tot[k] > p) body.discounts = [{ type: 'DISCOUNT', mode: 'VALUE', value: tot[k] - p, name: 'Знижка' }];
    else if (p > tot[k]) body.goods.push({ good: { code: 'svc', name: 'Обслуговування', price: p - tot[k] }, quantity: 1000 });
    if (p - card[k] > 0) body.payments.push({ type: 'CASH', value: p - card[k] });
    if (card[k] > 0) body.payments.push({ type: 'CASHLESS', value: card[k], label });
    if (p > 0) out[k] = body;
  }
  return out;
}
export const receiptOf = (x, ex) => receiptsOf(x, ex).a; // одна каса (сумісність)

// страва → каса за розділом меню (лише якщо кас кілька)
async function router(env, ks) {
  if (ks.length < 2) return () => 'a';
  const { getMenu } = await import('./menu.js'), m = await getMenu(env), byCat = new Map(), map = new Map();
  for (const c of ks) for (const id of c.cats || []) byCat.set(id, c.k);
  for (const c of m.categories) { const k = byCat.get(c.id); if (k) for (const i of c.items) map.set(i.name?.uk || i.name, k); }
  return n => map.get(n) || map.get(String(n).replace(/\s*\(.*\)$/, '')) || 'a';
}
// старий формат x.fis { id, h, v, ret } → { r: { a: … } }
const regs = f => f.r || (f.id || f.h || f.ret ? { a: { ...(f.id ? { id: f.id } : {}), h: f.h || '', v: f.v || 0, ...(f.ret ? { ret: f.ret } : {}) } } : {});
export const fisIds = f => Object.values(regs(f || {})).map(r => r.id).filter(Boolean);
export const fisRets = f => Object.values(regs(f || {})).reduce((a, r) => a + (r.ret?.length || 0), 0);

// 📊 дохід ФОП за рік (копійки) — для ліміту єдиного податку; попередження в групу на 80 / 95 / 100 %
async function yrAdd(env, ks, d) {
  if (!Object.values(d).some(Boolean)) return;
  const y = dayKey().slice(0, 4), msg = [];
  await L(env, 'fis:yr', async () => {
    let s = (await env.DB.get('fis:yr', 'json')) || {}; if (s.y !== y) s = { y, s: {}, w: {} };
    for (const [k, v] of Object.entries(d)) { if (!v) continue; s.s[k] = (s.s[k] || 0) + v; const c = ks.find(z => z.k === k), lim = c && limOf(c); if (!lim) continue;
      const pct = ((c.base || 0) + s.s[k] / 100) / lim * 100, step = [100, 95, 80].find(p => pct >= p) || 0;
      if (step > (s.w[k] || 0)) { s.w[k] = step; msg.push(`${step >= 100 ? '🛑' : '⚠️'} <b>${c.n || 'ФОП ' + k.toUpperCase()}</b>: дохід за ${y} рік — ${Math.round(pct)}% ліміту єдиного податку (${Math.round((c.base || 0) + s.s[k] / 100).toLocaleString('uk-UA')} з ${lim.toLocaleString('uk-UA')} ₴).${step >= 95 ? ' Поговоріть з бухгалтером: перехід на іншу групу чи інший ФОП.' : ''}`); } }
    await env.DB.put('fis:yr', JSON.stringify(s));
  });
  for (const t of msg) await notify(env, t).catch(() => {});
}

// ⚙️ привести фіскальний стан запису до самого запису (закрили / зняли з виручки / виправили / повернули)
export async function fisSync(env, day, id) {
  const ks = kasas(env); if (!ks.length || !id) return null;
  return L(env, 'fis:' + day, async () => { // один чек за раз — без дублів при подвійному натисканні
    const x = ((await env.DB.get('closed:' + day, 'json')) || []).find(c => c.id === id); if (!x) return null;
    const f = x.fis || {}, live = !x.rm && !x.del && x.sum > 0, ibOnly = live && x.ib >= x.sum && !fopMeta(env).ib; // 🏦 переказ на рахунок — без чека (якщо власник не ввімкнув «теж у чек»)
    const off = !live || ibOnly, route = off ? null : await router(env, ks), ibc = ibOnly ? K(x.sum) : 0;
    const build = ex => off ? {} : Object.fromEntries(Object.entries(receiptsOf(x, ex, route)).map(([k, b]) => [k, JSON.stringify(b)]));
    let want = build(await exReceipt(env, day, x, f.ex || {}));
    const R = structuredClone(regs(f)), keys = [...new Set([...Object.keys(R), ...Object.keys(want)])];
    if (f.st !== 'err' && (f.ibc || 0) === ibc && keys.every(k => (R[k]?.h || '') === (want[k] || '') && !R[k]?.unk)) return f;
    const nf = { at: Date.now(), r: R, ...(f.ex ? { ex: f.ex } : {}) }, d = { a: ibc - (f.ibc || 0) }; if (ibc) nf.ibc = ibc;
    try {
      for (const [k, r] of Object.entries(R)) {
        const c = ks.find(z => z.k === k); if (!c) continue; // касу відключили — її чеки лишаються як є
        if (r.unk) { const g = await call(env, c, 'GET', '/receipts/' + r.id); if (g.status === 404) { d[k] = (d[k] || 0) - (r.s ?? 0); delete r.id; r.h = ''; r.s = 0; } else if (g.status >= 300) throw new Error(errOf(g)); delete r.unk; } // обрив: чек не дійшов → шлемо знову
        if (r.id && r.h && r.h !== (want[k] || '')) { // ↩️ попередній чек більше не відповідає — повернення
          await ensureShift(env, c); const b = JSON.parse(r.h), rid = await uuid(`${env.VENUE}:${id}:ret:${r.id}`);
          const res = await call(env, c, 'POST', '/receipts/sell', { id: rid, goods: b.goods.map(g => ({ ...g, is_return: true })), payments: b.payments, ...(b.discounts ? { discounts: b.discounts } : {}), related_receipt_id: r.id });
          if (!dupe(res)) throw new Error('Повернення: ' + errOf(res));
          r.ret = [...(r.ret || []), rid]; d[k] = (d[k] || 0) - (r.s ?? sumOf(r.h)); delete r.id; r.h = ''; r.s = 0; r.v = (r.v || 0) + 1;
        }
      }
      if (off && nf.ex) { await exBack(env, nf.ex); delete nf.ex; } // 🍾 марки знятого чека — у наступний продаж з цих пляшок
      if (Object.keys(want).length) {
        const ex = await exReceipt(env, day, x, f.ex || {}, true); nf.ex = ex; want = build(ex); // 🍾 нові марки відкритих пляшок — лише в чек, що справді йде
        for (const [k, h] of Object.entries(want)) {
          const r = R[k] ||= { h: '', v: 0 }; if (r.id && r.h === h) continue;
          const c = ks.find(z => z.k === k); if (!c) throw new Error('Каса ' + k + ' відключена');
          await ensureShift(env, c); const rid = await uuid(`${env.VENUE}:${id}:${k === 'a' ? '' : k + ':'}sell:${r.v || 0}`);
          const res = await call(env, c, 'POST', '/receipts/sell', { id: rid, ...JSON.parse(h), ...(x.by ? { cashier_name: String(x.by).slice(0, 60) } : {}) });
          if (lost(res)) { r.id = rid; r.h = h; r.s = sumOf(h); r.unk = 1; d[k] = (d[k] || 0) + r.s; throw new Error(errOf(res)); }
          if (!dupe(res)) throw new Error(errOf(res));
          r.id = rid; r.h = h; r.s = sumOf(h); d[k] = (d[k] || 0) + r.s;
        }
      }
      nf.st = 'ok';
    } catch (e) { nf.st = 'err'; nf.err = String(e.message).slice(0, 200); }
    await yrAdd(env, ks, d).catch(() => {});
    await L(env, 'closed:' + day, async () => { const l = (await env.DB.get('closed:' + day, 'json')) || [], y = l.find(c => c.id === id); if (y) { y.fis = nf; await env.DB.put('closed:' + day, JSON.stringify(l)); } });
    return nf;
  });
}
// не ламати касу: помилка Checkbox лишається в записі (🧾 ⚠️ + «Повторити»)
export const fisSafe = (env, day, id) => fisSync(env, day || dayKey(), id).catch(e => console.log('fis', e.message));

// 💵 рух готівки → службовий чек каси «a»: внесення (+) / видача (−). Стан у записі mov: fs — скільки зараз «проведено» (0/1), fn — лічильник чеків (id)
export const SVC = { in: 1, out: -1, salc: -1, tipc: -1 };
export async function fisMov(env, day, ts, fresh) {
  const [c] = kasas(env); if (!c || !ts) return null;
  return L(env, 'mov:' + day, async () => {
    const k = 'mov:' + day, l = (await env.DB.get(k, 'json')) || [], e = l.find(m => m.ts === ts), sg = SVC[e?.type];
    if (!sg || (e.fs == null && !e.fisErr && !fresh)) return null; // старий запис без стану — не чіпаємо
    const want = e.del ? 0 : 1, has = e.fs ?? 0; if (want === has) { if (e.fisErr) { delete e.fisErr; await env.DB.put(k, JSON.stringify(l)); } return e; }
    try { await ensureShift(env, c); const n = (e.fn || 0) + 1, r = await call(env, c, 'POST', '/receipts/service', { id: await uuid(`${env.VENUE}:svc:${ts}:${n}`), payment: { type: 'CASH', value: K(sg * (want - has) * e.sum) } });
      if (!dupe(r)) throw new Error(errOf(r)); e.fn = n; e.fs = want; delete e.fisErr; }
    catch (er) { e.fisErr = String(er.message).slice(0, 200); }
    await env.DB.put(k, JSON.stringify(l)); return e;
  });
}
// 🔒 Z-звіт: закрити фіскальні зміни всіх кас (якщо відкриті)
export async function fisZ(env) {
  const ks = kasas(env); if (!ks.length) return null; const err = [];
  for (const c of ks) try { const s = await call(env, c, 'GET', '/cashier/shift'); if (s.j?.status === 'OPENED') { const r = await call(env, c, 'POST', '/shifts/close', {}); if (r.status >= 300) err.push((c.n || c.k) + ': ' + errOf(r)); } }
    catch (e) { err.push((c.n || c.k) + ': ' + e.message); }
  return err.length ? { error: err.join('; ').slice(0, 300) } : { ok: true };
}
// 🧮 звірка дня з самих записів (без запитів до Checkbox): виручка, у чеках, переказом без чека, помилки, ще не надіслані
export function fisDay(list, movs = []) {
  const o = { sales: 0, fis: 0, ib: 0, bad: 0, wait: 0, mov: movs.filter(m => m.fisErr).length };
  for (const x of list) { if (x.del) continue; const f = x.fis;
    if (!x.rm && x.sum > 0) { o.sales += x.sum; if (!f) o.wait++; }
    if (f?.st === 'err') o.bad++;
    if (f) { o.fis += Object.values(regs(f)).reduce((a, r) => a + (r.id ? r.s ?? sumOf(r.h) : 0), 0) / 100; o.ib += (f.ibc || 0) / 100; } }
  o.fis = Math.round(o.fis); o.ib = Math.round(o.ib); o.gap = Math.max(0, o.sales - o.fis - o.ib); return o;
}
// ℹ️ стан для кабінету/каси: каси Checkbox, зміни, ліміти за рік, звірка дня
export async function fisInfo(env, check) {
  const meta = fopMeta(env), iv = await ibanGet(env), base = { ib: meta.ib ? 1 : 0, iban: iv ? { n: iv.n || '', iban: iv.iban, ipn: iv.ipn || '' } : null };
  if (env.VENUE === MAIN) return { main: 1, ...base };
  const ks = kasas(env); if (!ks.length) return { on: 0, ...base };
  const day = dayKey(), [list, movs, yr] = await Promise.all([env.DB.get('closed:' + day, 'json'), env.DB.get('mov:' + day, 'json'), env.DB.get('fis:yr', 'json')]);
  const ys = yr?.y === day.slice(0, 4) ? yr.s || {} : {}, dd = fisDay(list || [], movs || []);
  const o = { on: 1, ...base, ...dd, day: dd, kasas: [] };
  for (const c of ks) { const inc = Math.round((c.base || 0) + (ys[c.k] || 0) / 100), lim = limOf(c), q = { k: c.k, n: c.n || '', g: c.g || 0, lim, lim0: +c.lim || 0, base: c.base || 0, cats: c.cats, inc, pct: lim ? Math.round(inc / lim * 1000) / 10 : 0 };
    if (check) try { const i = await call(env, c, 'GET', '/cash-registers/info'); if (i.status >= 300) throw new Error(errOf(i)); q.kasa = { title: i.j.title || '', fn: i.j.fiscal_number || '', test: !!i.j.is_test }; q.shift = (await call(env, c, 'GET', '/cashier/shift')).j?.status || 'немає'; } catch (e) { q.err = e.message; }
    o.kasas.push(q); }
  const a = o.kasas[0]; o.kasa = a.kasa; o.shift = a.shift; if (a.err) o.err = a.err; // сумісність зі старим кабінетом
  if (ks.some(c => isMock(env, c))) o.mock = (await env.DB.get('fis:mock', 'json')) || [];
  return o;
}
// 🔁 повторити всі невдалі/невідправлені чеки й службові дня
export async function fisRetry(env, day = dayKey()) {
  if (!kasas(env).length) return { n: 0 };
  const [list, movs] = await Promise.all([env.DB.get('closed:' + day, 'json'), env.DB.get('mov:' + day, 'json')]); let n = 0, bad = 0;
  for (const x of list || []) if (!x.del && x.id && (x.fis?.st === 'err' || (!x.fis && !x.rm && x.sum > 0))) { const r = await fisSync(env, day, x.id); n++; if (r?.st === 'err') bad++; }
  for (const m of movs || []) if (m.fisErr) { const r = await fisMov(env, day, m.ts); n++; if (r?.fisErr) bad++; }
  return { n, bad };
}
// перевірка ключів з кабінету (до збереження)
export async function fisCheck(env, lic, pin) {
  const c = { k: 'chk', lic, pin };
  const s = await raw(env, c, 'POST', '/cashier/signinPinCode', { pin_code: pin });
  if (!s.j?.access_token) return { error: 'Checkbox: ' + (s.j?.message || (s.status === 422 ? 'невірний формат PIN' : errOf(s))) };
  const i = await raw(env, c, 'GET', '/cash-registers/info', null, s.j.access_token);
  return i.status >= 300 ? { error: 'Ключ каси: ' + errOf(i) } : { title: i.j?.title || '', test: !!i.j?.is_test };
}

// 🏦 переказ на рахунок закладу (IBAN) — QR НБУ для банківського застосунку гостя
export const ibanOf = env => { const v = J(env.IBAN_PAY); return v.iban ? v : null; };
// VARVAR: секрети не в env (wrangler) — читаємо зі сховища лише коли треба
export const ibanGet = async env => ibanOf(env) || (env.VENUE === MAIN || !env.VENUE ? ibanOf({ IBAN_PAY: (await (await import('./venue.js')).getSecrets(env)).IBAN_PAY }) : null);
export function ibanOk(s) { s = String(s || '').replace(/\s/g, '').toUpperCase(); if (!/^UA\d{27}$/.test(s)) return '';
  const n = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, ch => ch.charCodeAt(0) - 55); let r = 0; for (const ch of n) r = (r * 10 + +ch) % 97; return r === 1 ? s : ''; }
// payload формату НБУ (BCD 002) → https://bank.gov.ua/qr/<base64url>
export function ibanQr(v, sum, purpose) {
  const p = ['BCD', '002', '1', 'UCT', '', String(v.n || '').slice(0, 70), v.iban, 'UAH' + (Math.round(sum * 100) / 100).toFixed(2), String(v.ipn || ''), '', '', String(purpose || '').slice(0, 140), ''].join('\n');
  const b = btoa(String.fromCharCode(...new TextEncoder().encode(p))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'https://bank.gov.ua/qr/' + b;
}
