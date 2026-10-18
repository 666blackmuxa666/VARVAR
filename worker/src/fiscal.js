// 🧾 ПРРО Checkbox: фіскальний чек на кожен закритий рахунок, повернення, службові внесення/видачі, Z.
// Лише для закладів платформи з ключами в кабінеті (CHECKBOX_LICENSE + CHECKBOX_PIN касира) — VARVAR не чіпаємо (свій РРО).
// Чек звіряється з записом «closed:»: fisSync приводить фіскальний стан до запису (продаж / повернення / новий продаж після правки).
// Ідемпотентність: id чека Checkbox — похідний від заклад+рахунок+версія, тож повтор не створить дубль.
import { MAIN, seal, unseal } from './venue.js';
import { L, dayKey } from './ops-core.js';

const API = 'https://api.checkbox.ua/api/v1';
export const fisOn = env => !env.NOFIS && env.VENUE && env.VENUE !== MAIN && !!(env.CHECKBOX_LICENSE && env.CHECKBOX_PIN);
const isMock = env => env.CHECKBOX_LICENSE === 'mock-test' && (env.PLATFORM_BOT || env.BOT_TOKEN) === 'local-test'; // 🧪 лише тестовий сервер

// 🧪 імітація Checkbox для selftest: запити пишуться в fis:mock
async function mock(env, m, path, body) {
  const l = (await env.DB.get('fis:mock', 'json')) || []; l.push({ m, path, body }); await env.DB.put('fis:mock', JSON.stringify(l.slice(-30)));
  if (env.CHECKBOX_PIN === 'bad') return { status: 401, j: { message: 'Невірний PIN' } };
  if (path === '/cashier/signinPinCode') return { status: 200, j: { access_token: 'mock' } };
  if (path === '/cash-registers/info') return { status: 200, j: { title: 'Тестова каса', fiscal_number: '4000000000', is_test: true } };
  if (path === '/cashier/shift') return { status: 200, j: (await env.DB.get('fis:mockShift')) ? { id: 's1', status: 'OPENED' } : null };
  if (path === '/shifts') { await env.DB.put('fis:mockShift', '1'); return { status: 202, j: { id: 's1', status: 'CREATED' } }; }
  if (path === '/shifts/close') { await env.DB.delete('fis:mockShift'); return { status: 202, j: { id: 's1', status: 'CLOSING' } }; }
  if (/^\/receipts\/(sell|service)$/.test(path)) return (await env.DB.get('fis:mockShift')) ? { status: 201, j: { id: body.id, status: 'CREATED' } } : { status: 400, j: { message: 'Зміну не відкрито' } };
  return { status: 404, j: { message: 'mock: ' + path } };
}

async function raw(env, m, path, body, tok) {
  if (isMock(env)) return mock(env, m, path, body);
  const h = { 'X-Client-Name': 'ATOM', 'X-Client-Version': '1', 'X-License-Key': env.CHECKBOX_LICENSE, 'content-type': 'application/json' };
  if (tok) h.Authorization = 'Bearer ' + tok;
  try { const r = await fetch(API + path, { method: m, headers: h, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) }); return { status: r.status, j: await r.json().catch(() => null) }; }
  catch (e) { return { status: 0, j: { message: 'Checkbox не відповідає: ' + e.message } }; }
}
const errOf = r => { const j = r.j || {}; return String(j.message || (Array.isArray(j.detail) ? j.detail.map(d => d.msg).join('; ') : j.detail) || `Checkbox: код ${r.status}`).slice(0, 200); };

// 🔑 токен касира (зашифровано в базі закладу; новий — при 401)
async function token(env, fresh) {
  if (!fresh) { const t = await unseal(env, await env.DB.get('fis:tok')).catch(() => null); if (t?.tok && t.lic === env.CHECKBOX_LICENSE.slice(-6)) return t.tok; }
  const r = await raw(env, 'POST', '/cashier/signinPinCode', { pin_code: env.CHECKBOX_PIN });
  if (!r.j?.access_token) throw new Error(r.status === 401 || r.status === 403 ? 'Checkbox не приймає PIN касира або ключ каси' : errOf(r));
  await env.DB.put('fis:tok', await seal(env, { tok: r.j.access_token, lic: env.CHECKBOX_LICENSE.slice(-6) })); return r.j.access_token;
}
async function call(env, m, path, body) {
  let r = await raw(env, m, path, body, await token(env));
  if (r.status === 401) r = await raw(env, m, path, body, await token(env, true));
  return r;
}

// зміна: відкрита → нічого; ні → відкриваємо й чекаємо OPENED (підпис КЕП у ДПС — кілька секунд)
async function ensureShift(env) {
  let r = await call(env, 'GET', '/cashier/shift');
  if (r.j?.status === 'OPENED') return;
  if (!r.j || r.j.status === 'CLOSED') { let o = await call(env, 'POST', '/shifts', { auto_close_at: new Date(Date.now() + 23.5 * 3600e3).toISOString() }); if (o.status === 422 || o.status === 400) o = await call(env, 'POST', '/shifts', {}); /* ⏰ ліміт зміни 24 год — Checkbox закриє сам, якщо забули Z */ if (o.status >= 300) throw new Error('Зміна Checkbox не відкрилась: ' + errOf(o)); }
  for (let i = 0; i < 4; i++) { r = await call(env, 'GET', '/cashier/shift'); if (r.j?.status === 'OPENED') return; await new Promise(f => setTimeout(f, 1500)); }
  throw new Error('Зміна Checkbox ще відкривається — повторіть за хвилину');
}

async function uuid(s) { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].slice(0, 16); h[6] = (h[6] & 15) | 64; h[8] = (h[8] & 63) | 128; const x = h.map(b => b.toString(16).padStart(2, '0')).join(''); return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`; }
const code = n => 'a' + [...n].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
const K = g => Math.round(g * 100); // грн → копійки

// запис «closed:» → тіло чека: страви, чайові окремим рядком (так радить Checkbox), знижки/бонуси — знижкою на чек, оплати готівка+картка
export function receiptOf(x) {
  const goods = [], m = new Map();
  for (const [n, q, s] of x.dishes || []) { const a = m.get(n) || [0, 0]; m.set(n, [a[0] + q, a[1] + s]); }
  if (!m.size && x.sum - (x.tip || 0) > 0) m.set('Замовлення', [1, (x.gross ?? x.sum - (x.tip || 0))]); // старий/«схудлий» запис без страв
  for (const [n, [q, s]] of m) if (q > 0 && s >= 0) goods.push(K(s) % q ? { good: { code: code(n), name: `${q}× ${n}`.slice(0, 120), price: K(s) }, quantity: 1000 } : { good: { code: code(n), name: n.slice(0, 120), price: K(s) / q }, quantity: q * 1000 });
  if (x.tip) goods.push({ good: { code: 'tip', name: 'Чайові', price: K(x.tip) }, quantity: 1000 });
  const total = goods.reduce((a, g) => a + g.good.price * g.quantity / 1000, 0), paid = K(x.sum), body = { goods, payments: [] };
  if (total > paid) body.discounts = [{ type: 'DISCOUNT', mode: 'VALUE', value: total - paid, name: 'Знижка' }];
  else if (paid > total) goods.push({ good: { code: 'svc', name: 'Обслуговування', price: paid - total }, quantity: 1000 });
  const card = K(x.card || 0), cash = paid - card;
  if (cash > 0) body.payments.push({ type: 'CASH', value: cash });
  if (card > 0) body.payments.push({ type: 'CASHLESS', value: card, label: x.onl && x.onl >= (x.card || 0) ? 'Онлайн' : 'Картка' });
  return body;
}
const hashOf = x => JSON.stringify(receiptOf(x));

// ⚙️ привести фіскальний стан запису до самого запису (закрили / зняли з виручки / виправили / повернули)
export async function fisSync(env, day, id) {
  if (!fisOn(env) || !id) return null;
  return L(env, 'fis:' + day, async () => { // один чек за раз — без дублів при подвійному натисканні
    const get = async () => ((await env.DB.get('closed:' + day, 'json')) || []).find(c => c.id === id);
    const x = await get(); if (!x) return null;
    const f = x.fis || {}, want = x.rm || x.del || !(x.sum > 0) ? '' : hashOf(x);
    if ((f.h || '') === want && f.st !== 'err') return f;
    const nf = { ...f, at: Date.now() };
    try {
      await ensureShift(env);
      if (f.id && f.h && f.h !== want) { // ↩️ попередній чек більше не відповідає — повернення
        const b = JSON.parse(f.h), rid = await uuid(`${env.VENUE}:${id}:ret:${f.id}`);
        const r = await call(env, 'POST', '/receipts/sell', { id: rid, goods: b.goods.map(g => ({ ...g, is_return: true })), payments: b.payments, ...(b.discounts ? { discounts: b.discounts } : {}), related_receipt_id: f.id });
        if (r.status >= 300 && !/вже існує|already exists/i.test(errOf(r))) throw new Error('Повернення: ' + errOf(r));
        nf.ret = [...(f.ret || []), rid]; delete nf.id; nf.h = '';
      }
      if (want) {
        const v = (f.v || 0) + (nf.h === '' && f.id ? 1 : 0), rid = await uuid(`${env.VENUE}:${id}:sell:${v}`);
        const r = await call(env, 'POST', '/receipts/sell', { id: rid, ...JSON.parse(want), ...(x.by ? { cashier_name: String(x.by).slice(0, 60) } : {}) });
        if (r.status >= 300 && !/вже існує|already exists/i.test(errOf(r))) throw new Error(errOf(r));
        nf.id = rid; nf.h = want; nf.v = v;
      }
      nf.st = 'ok'; delete nf.err;
    } catch (e) { nf.st = 'err'; nf.err = String(e.message).slice(0, 200); }
    await L(env, 'closed:' + day, async () => { const l = (await env.DB.get('closed:' + day, 'json')) || [], y = l.find(c => c.id === id); if (y) { y.fis = nf; await env.DB.put('closed:' + day, JSON.stringify(l)); } });
    return nf;
  });
}
// не ламати касу: помилка Checkbox лишається в записі (🧾 ⚠️ + «Повторити»)
export const fisSafe = (env, day, id) => fisSync(env, day || dayKey(), id).catch(e => console.log('fis', e.message));

// 💵 службове внесення (+) / видача (−) готівки
export async function fisService(env, sum) {
  if (!fisOn(env) || !Math.round(sum)) return null;
  try { await ensureShift(env); const r = await call(env, 'POST', '/receipts/service', { id: crypto.randomUUID(), payment: { type: 'CASH', value: K(sum) } }); return r.status >= 300 ? { error: errOf(r) } : { ok: true }; }
  catch (e) { return { error: e.message }; }
}
// 🔒 Z-звіт: закрити фіскальну зміну (якщо відкрита)
export async function fisZ(env) {
  if (!fisOn(env)) return null;
  try { const s = await call(env, 'GET', '/cashier/shift'); if (s.j?.status !== 'OPENED') return { ok: true, none: 1 }; const r = await call(env, 'POST', '/shifts/close', {}); return r.status >= 300 ? { error: errOf(r) } : { ok: true }; }
  catch (e) { return { error: e.message }; }
}
// ℹ️ стан для кабінету/каси: каса Checkbox, зміна, нефіскалізовані чеки сьогодні
export async function fisInfo(env, check) {
  if (env.VENUE === MAIN) return { main: 1 };
  if (!fisOn(env)) return { on: 0 };
  const list = (await env.DB.get('closed:' + dayKey(), 'json')) || [], bad = list.filter(x => !x.del && x.fis?.st === 'err').length, wait = list.filter(x => !x.del && !x.rm && x.sum > 0 && !x.fis).length;
  const o = { on: 1, bad, wait };
  if (check) try { const i = await call(env, 'GET', '/cash-registers/info'); if (i.status >= 300) throw new Error(errOf(i)); o.kasa = { title: i.j.title || '', fn: i.j.fiscal_number || '', test: !!i.j.is_test }; o.shift = (await call(env, 'GET', '/cashier/shift')).j?.status || 'немає'; } catch (e) { o.err = e.message; }
  if (isMock(env)) o.mock = (await env.DB.get('fis:mock', 'json')) || [];
  return o;
}
// 🔁 повторити всі невдалі/невідправлені чеки дня
export async function fisRetry(env, day = dayKey()) {
  if (!fisOn(env)) return { n: 0 };
  const list = (await env.DB.get('closed:' + day, 'json')) || []; let n = 0, bad = 0;
  for (const x of list) if (!x.del && x.id && (x.fis?.st === 'err' || (!x.fis && !x.rm && x.sum > 0))) { const r = await fisSync(env, day, x.id); n++; if (r?.st === 'err') bad++; }
  return { n, bad };
}
// перевірка ключів з кабінету (до збереження)
export async function fisCheck(env, lic, pin) {
  const e = { ...env, CHECKBOX_LICENSE: lic, CHECKBOX_PIN: pin };
  const s = await raw(e, 'POST', '/cashier/signinPinCode', { pin_code: pin });
  if (!s.j?.access_token) return { error: 'Checkbox: ' + (s.j?.message || (s.status === 422 ? 'невірний формат PIN' : errOf(s))) };
  const i = await raw(e, 'GET', '/cash-registers/info', null, s.j.access_token);
  return i.status >= 300 ? { error: 'Ключ каси: ' + errOf(i) } : { title: i.j?.title || '', test: !!i.j?.is_test };
}
