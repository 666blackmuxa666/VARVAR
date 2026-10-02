// Спільна логіка закладу для Telegram-бота і касової програми (POS).
// Усе, що змінює столи/звіти/касу, — тут, щоб бот і POS завжди робили одне й те саме.
import { getMenu, saveMenu } from './menu.js';
import { queuePrint, kitchenTicket, receipt } from './print.js';

export const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const TZ = 'Europe/Kyiv';
export const hhmm = (t = Date.now()) => new Date(t).toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD
export const money = n => `${Math.round(n).toLocaleString('uk-UA')} грн`;
export const YEAR = 400 * 86400, BILL_TTL = 12 * 3600;
export const LINE = /^(\d+)× (.+?) — (\d+)$/;
export const tablesCount = env => +env.TABLES || 15;

// повідомлення в чат персоналу (дії з POS дублюються в Telegram)
export const notify = (env, text, markup) => tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) });

// ---------- рахунки ----------
export const getBill = async (env, t) => (await env.DB.get('bill:' + t, 'json')) || { total: 0, orders: 0, log: [] };
export const putBill = (env, t, b) => b.total > 0 ? env.DB.put('bill:' + t, JSON.stringify(b), { expirationTtl: BILL_TTL }) : env.DB.delete('bill:' + t);
export const discAmt = b => Math.round((b.total || 0) * (b.disc || 0) / 100);
export const payable = b => (b.total || 0) - discAmt(b);
export async function openTables(env) {
  const keys = (await env.DB.list({ prefix: 'bill:' })).keys.map(k => k.name);
  const bills = keys.length ? await env.DB.getMany(keys, 'json') : [];
  return keys.map((k, i) => ({ t: +k.slice(5), b: bills[i] })).filter(r => r.b && r.b.total > 0).sort((a, b) => a.t - b.t);
}
export function billItems(b) {
  const m = new Map();
  for (const o of b.log || []) for (const l of o.lines) { const x = l.match(LINE); if (!x) continue; const a = m.get(x[2]) || { q: 0, sum: 0 }; a.q += +x[1]; a.sum += +x[3]; m.set(x[2], a); }
  return [...m].map(([name, a]) => ({ name, ...a }));
}

// ---------- статистика ----------
// історія (day: closed: exp: dish: z:) зберігається безстроково — роки звітів
export async function bump(env, key, fn) { const d = (await env.DB.get(key, 'json')) || {}; fn(d); await env.DB.put(key, JSON.stringify(d)); }
export const addStat = (env, field, n) => bump(env, 'day:' + dayKey(), d => { d[field] = (d[field] || 0) + n; });
// продажі страв за місяць: { назва: [кількість, сума] }
export const addDishes = (env, items) => bump(env, 'dish:' + dayKey().slice(0, 7), d => { for (const { n, q, sum } of items) { const x = d[n] || [0, 0]; d[n] = [x[0] + q, x[1] + sum]; } });
async function logClosed(env, rec) {
  const k = 'closed:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  list.push(rec); await env.DB.put(k, JSON.stringify(list.slice(-500)));
}

// ---------- стрічка подій (панель POS) ----------
// kind: guest · check · waiter · acc · close · del · move · disc · rm · pre
export async function logEvent(env, ev) {
  const k = 'ev:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  const e = { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), at: hhmm(), ...ev };
  list.push(e); await env.DB.put(k, JSON.stringify(list.slice(-200)), { expirationTtl: 3 * 86400 });
  return e;
}
export const getEvents = async (env, day = dayKey()) => (await env.DB.get('ev:' + day, 'json')) || [];

// ✅ Прийняв: статус для гостя + подія + (з POS) оновлення повідомлення в Telegram
export async function acceptOrder(env, oid, who, { editTg = true } = {}) {
  if (!/^[a-z0-9]{6,12}$/.test(oid || '')) return false;
  const o = (await env.DB.get('ord:' + oid, 'json')) || {};
  if (o.s === 'acc') return false;
  await env.DB.put('ord:' + oid, JSON.stringify({ ...o, s: 'acc', by: who, at: hhmm() }), { expirationTtl: BILL_TTL });
  const k = 'ev:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  for (const e of list) if (e.oid === oid) { e.s = 'acc'; e.accBy = who; }
  await env.DB.put(k, JSON.stringify(list), { expirationTtl: 3 * 86400 });
  if (editTg && o.mid && o.html) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: o.mid, text: `${o.html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🧾 Закрити стіл ' + o.t, callback_data: 'cls:' + o.t }]] } });
  return true;
}

// ---------- замовлення персоналу (бот кнопками/текстом і POS) ----------
export async function addWaiterOrder(env, d, who, comment = '', src = 'бот') {
  const ok = d.items.filter(i => !i.hidden);
  if (!ok.length) return null;
  const lines = ok.map(i => `${i.q}× ${i.name} — ${i.price * i.q}`), sum = ok.reduce((s, i) => s + i.price * i.q, 0);
  const bill = await getBill(env, d.table);
  bill.total += sum; bill.orders = (bill.orders || 0) + 1; bill.opened = bill.opened || Date.now();
  bill.log = [...(bill.log || []), { at: hhmm(), kind: `від офіціанта (${who})`, lines, ...(comment ? { comment } : {}) }].slice(-40);
  await putBill(env, d.table, bill);
  await addStat(env, 'orders', 1);
  await addDishes(env, ok.map(i => ({ n: i.name, q: i.q, sum: i.price * i.q })));
  await queuePrint(env, 'kitchen', kitchenTicket({ table: d.table, kind: 'ВІД ОФІЦІАНТА', lines, comment, by: who }));
  await logEvent(env, { k: 'waiter', t: d.table, by: who, src, lines, comment, sum });
  return { sum, total: bill.total, lines };
}
// позиції з меню за id → рядки замовлення (ціни — лише з меню)
export async function itemsFromMenu(env, list) {
  const menu = await getMenu(env); const by = {};
  menu.categories.forEach(c => c.items.forEach(it => { by[it.id] = it; }));
  const out = [];
  for (const x of (Array.isArray(list) ? list : []).slice(0, 80)) {
    const it = by[x.id]; const q = Math.min(50, Math.max(0, parseInt(x.q, 10) || 0));
    if (!it || !q) continue;
    const v = it.variants ? it.variants.find(z => z.v === x.v) || it.variants[0] : null;
    out.push({ name: it.name.uk + (v ? ` ${v.v} ${it.size || 'л'}`.trimEnd() : ''), price: v ? v.p : it.price, q, hidden: !!it.hidden });
  }
  return out;
}

// прибрати 1 шт позиції (за назвою) з останнього замовлення, де вона є
export async function removeOne(env, t, name, who = '') {
  const b = await getBill(env, t);
  for (let i = (b.log || []).length - 1; i >= 0; i--) {
    const o = b.log[i]; const j = o.lines.findIndex(l => (l.match(LINE) || [])[2] === name);
    if (j < 0) continue;
    const [, q, , sum] = o.lines[j].match(LINE); const unit = Math.round(+sum / +q);
    if (+q > 1) o.lines[j] = `${+q - 1}× ${name} — ${+sum - unit}`; else o.lines.splice(j, 1);
    if (!o.lines.length) b.log.splice(i, 1);
    b.total = Math.max(0, b.total - unit);
    await putBill(env, t, b);
    await addDishes(env, [{ n: name, q: -1, sum: -unit }]);
    await logEvent(env, { k: 'rm', t, by: who, text: `−1× ${name} (−${unit})` });
    return { name, unit };
  }
  return null;
}

// pay: 'cash' | 'card'; print — друкувати фінальний чек
export async function closeTable(env, t, who, pay = 'cash', print = true) {
  const bill = await getBill(env, t);
  if (!bill.total) return null;
  const sum = payable(bill), disc = discAmt(bill);
  const card = pay === 'card' ? sum : 0, cash = sum - card;
  if (print) await queuePrint(env, 'receipt', await receipt(env, { table: t, bill, final: true, pay, by: who }));
  await env.DB.delete('bill:' + t);
  await bump(env, 'day:' + dayKey(), d => { d.closed = (d.closed || 0) + sum; d.tables = (d.tables || 0) + 1; d.cash = (d.cash || 0) + cash; d.card = (d.card || 0) + card; if (disc) d.disc = (d.disc || 0) + disc; });
  // страви рахунку — щоб при видаленні закритого рахунку відняти їх і з «топ страв»
  const dishes = []; for (const o of bill.log || []) for (const l of o.lines) { const x = l.match(LINE); if (x) dishes.push([x[2], +x[1], +x[3]]); }
  await logClosed(env, { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), t, sum, cash, card, at: hhmm(), by: who || '', orders: bill.orders || 0, dishes, ...(disc ? { gross: bill.total, disc: bill.disc, discSum: disc } : {}) });
  await logEvent(env, { k: 'close', t, by: who, sum, pay, print });
  return { t, sum, cash, card, disc };
}
export const payLabel = (cash, card) => card ? '💳 карта' : '💵 готівка';

export async function precheck(env, t, who) {
  const b = await getBill(env, t); if (!b.total) return false;
  await queuePrint(env, 'precheck', await receipt(env, { table: +t, bill: b, final: false, by: who }));
  await logEvent(env, { k: 'pre', t, by: who });
  return true;
}

export async function setDiscount(env, t, pct, who) {
  const b = await getBill(env, t); if (!b.total) return null;
  pct = Math.max(0, Math.min(100, Math.round(+pct || 0)));
  if (pct) b.disc = pct; else delete b.disc;
  await putBill(env, t, b);
  await logEvent(env, { k: 'disc', t, by: who, text: pct ? `знижка ${pct}% (−${discAmt(b)})` : 'знижку прибрано' });
  return b;
}

// перенос: стіл a → b. Якщо b зайнятий — об'єднання (рахунок a додається до b)
export async function moveTable(env, a, b, who) {
  a = +a; b = +b; if (!a || !b || a === b) return null;
  const A = await getBill(env, a); if (!A.total) return null;
  const B = await getBill(env, b);
  let merged = false;
  if (B.total) {
    merged = true;
    B.total += A.total; B.orders = (B.orders || 0) + (A.orders || 0);
    B.opened = Math.min(B.opened || Date.now(), A.opened || Date.now());
    B.log = [...(B.log || []), ...(A.log || []).map(o => ({ ...o, kind: `${o.kind} (зі столу ${a})` }))].slice(-60);
    B.check = B.check || A.check; if (!B.disc && A.disc) B.disc = A.disc;
    await putBill(env, b, B);
  } else await putBill(env, b, A);
  await env.DB.delete('bill:' + a);
  // статуси замовлень гостей переходять на новий стіл
  await logEvent(env, { k: 'move', t: b, from: a, by: who, text: merged ? `стіл ${a} об'єднано зі столом ${b}` : `стіл ${a} → ${b}` });
  return { merged };
}

export async function deleteTable(env, t, who) {
  const bill = await getBill(env, t);
  if (!bill.total) return null;
  await env.DB.delete('bill:' + t);
  await logClosed(env, { ts: Date.now(), t, sum: bill.total, at: hhmm(), by: who || '', del: 1 });
  await logEvent(env, { k: 'del', t, by: who, sum: bill.total });
  return { sum: bill.total };
}

// ---------- закриті рахунки ----------
export const getClosed = async (env, day = dayKey()) => (await env.DB.get('closed:' + day, 'json')) || [];
const findClosed = (list, ref) => list.find(e => e.id === ref) || (/^\d+$/.test(String(ref)) ? list[+ref] : null);
export async function closedRec(env, ref) { return findClosed(await getClosed(env), ref); }
export async function delClosed(env, ref) {
  const k = 'closed:' + dayKey(); const list = await getClosed(env);
  const x = findClosed(list, ref);
  if (!x || x.del || x.rm) return null;
  x.rm = 1; await env.DB.put(k, JSON.stringify(list)); // rm — прибраний з виручки (del — стіл видалений до закриття)
  await bump(env, 'day:' + dayKey(), d => { d.closed = Math.max(0, (d.closed || 0) - x.sum); d.tables = Math.max(0, (d.tables || 0) - 1);
    d.cash = Math.max(0, (d.cash || 0) - (x.cash ?? x.sum)); d.card = Math.max(0, (d.card || 0) - (x.card || 0)); d.orders = Math.max(0, (d.orders || 0) - (x.orders || 0));
    if (x.discSum) d.disc = Math.max(0, (d.disc || 0) - x.discSum); });
  if (x.dishes?.length) await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q: -q, sum: -sum })));
  return x;
}
export async function reprintClosed(env, ref, who) {
  const x = await closedRec(env, ref);
  if (!x?.dishes?.length) return false;
  const bill = { total: x.gross || x.sum, disc: x.disc, log: [{ lines: x.dishes.map(([n, q, sum]) => `${q}× ${n} — ${sum}`) }] };
  await queuePrint(env, 'receipt', await receipt(env, { table: x.t, bill, final: true, pay: x.card ? 'card' : 'cash', by: who }));
  return true;
}

// ---------- фінанси ----------
export const getExp = async (env, day = dayKey()) => (await env.DB.get('exp:' + day, 'json')) || [];
export async function addExpense(env, e) { const k = 'exp:' + dayKey(); const l = await getExp(env); l.push({ ts: Date.now(), ...e }); await env.DB.put(k, JSON.stringify(l)); }
export async function delExpense(env, i) { const k = 'exp:' + dayKey(); const l = await getExp(env); if (!l[+i]) return false; l[+i].del = 1; await env.DB.put(k, JSON.stringify(l)); return true; }
export const setFloat = (env, n) => bump(env, 'day:' + dayKey(), d => { d.float = Math.round(n); });
export async function cashData(env) {
  const d = (await env.DB.get('day:' + dayKey(), 'json')) || {};
  const exp = await getExp(env); const ex = exp.filter(e => !e.del);
  const exCash = ex.filter(e => e.src === 'cash').reduce((s, e) => s + e.sum, 0), exCard = ex.filter(e => e.src === 'card').reduce((s, e) => s + e.sum, 0);
  const open = (await openTables(env)).reduce((s, r) => s + payable(r.b), 0);
  return { day: dayKey(), float: d.float || 0, cash: d.cash || 0, card: d.card || 0, disc: d.disc || 0, exCash, exCard, inBox: (d.float || 0) + (d.cash || 0) - exCash, open, exp };
}
export async function sumDays(env, keys) {
  const days = await env.DB.getMany(keys.map(k => 'day:' + k), 'json'), exps = await env.DB.getMany(keys.map(k => 'exp:' + k), 'json');
  return keys.reduce((a, _, i) => {
    const d = days[i] || {}, e = (exps[i] || []).filter(x => !x.del).reduce((s, x) => s + x.sum, 0);
    return { closed: a.closed + (d.closed || 0), tables: a.tables + (d.tables || 0), orders: a.orders + (d.orders || 0),
      cash: a.cash + (d.cash ?? d.closed ?? 0), card: a.card + (d.card || 0), disc: a.disc + (d.disc || 0), exp: a.exp + e };
  }, { closed: 0, tables: 0, orders: 0, cash: 0, card: 0, disc: 0, exp: 0 });
}
const daysOfMonth = (ym, upto) => [...Array(upto)].map((_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
export async function reportsData(env) {
  const now = Date.now(), today = dayKey(), ym = today.slice(0, 7);
  const [y, mo] = ym.split('-').map(Number);
  const prevYm = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  const prevLen = new Date(y, mo - 1, 0).getDate();
  const mname = t => new Date(t).toLocaleDateString('uk-UA', { timeZone: TZ, month: 'long' });
  const [d0, d1, wk, mon, prev] = await Promise.all([
    sumDays(env, [today]), sumDays(env, [dayKey(now - 86400e3)]), sumDays(env, [...Array(7)].map((_, i) => dayKey(now - i * 86400e3))),
    sumDays(env, daysOfMonth(ym, +today.slice(8))), sumDays(env, daysOfMonth(prevYm, prevLen)),
  ]);
  const open = (await openTables(env)).reduce((s, r) => s + payable(r.b), 0);
  return { open, rows: [['Сьогодні', d0], ['Вчора', d1], ['7 днів', wk], [`Місяць (${mname(now)})`, mon], [`Минулий місяць (${mname(new Date(y, mo - 2, 15))})`, prev]] };
}
export async function topData(env) {
  const d = (await env.DB.get('dish:' + dayKey().slice(0, 7), 'json')) || {};
  return Object.entries(d).filter(([, [q]]) => q > 0).sort((a, b) => b[1][0] - a[1][0]).slice(0, 30).map(([n, [q, s]]) => ({ n, q, s }));
}

// ---------- групи меню (кухня / бар / кальян) — однаково в боті й POS ----------
const KITCHEN = ['minimax', 'pasta', 'burgers', 'salads', 'snacks', 'soups', 'pans', 'extras', 'upakuvannia'];
export const GROUPS = [{ id: 'kitchen', name: '🍳 Кухня' }, { id: 'bar', name: '🍹 Бар' }, { id: 'hookah', name: '💨 Кальян' }];
export const groupOf = cat => cat === 'hookah' ? 'hookah' : KITCHEN.includes(cat) ? 'kitchen' : 'bar';
// ⭐ обрані страви — спільний список для всіх офіціантів
export const getFav = async env => (await env.DB.get('fav', 'json')) || [];
export async function toggleFav(env, id, on) {
  const l = (await getFav(env)).filter(x => x !== id); if (on) l.push(id);
  await env.DB.put('fav', JSON.stringify(l)); return l;
}
// назва позиції з рахунку («Pepsi 0.5 л») → страва меню (найдовший збіг назви)
export function dishResolver(menu) {
  const all = menu.categories.flatMap(c => c.items.map(it => ({ n: it.name.uk, cat: c.id, cname: c.name.uk }))).sort((a, b) => b.n.length - a.n.length);
  const memo = new Map();
  return name => { if (!memo.has(name)) memo.set(name, all.find(x => name === x.n || name.startsWith(x.n + ' ')) || null); return memo.get(name); };
}

// ---------- зміна (відкрити / закрити касу) ----------
const dayStart = (t = Date.now()) => { const [h, m, x] = new Date(t).toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false }).split(':').map(Number); return t - ((h % 24) * 3600 + m * 60 + x) * 1000 - (t % 1000); };
export const getShift = async env => env.DB.get('shift', 'json');
const dayList = (from, to) => { const out = []; for (let t = Date.parse(from + 'T12:00:00Z'); out.length < 5000; t += 86400e3) { const d = new Date(t).toISOString().slice(0, 10); out.push(d); if (d >= to) break; } return out; };
// підсумок з моменту відкриття зміни (або з початку дня, якщо зміна не відкрита)
export async function shiftData(env) {
  const s = await getShift(env), now = Date.now();
  const from = s?.opened || dayStart();
  const days = dayList(dayKey(from), dayKey(now));
  const [cl, ex] = await Promise.all([env.DB.getMany(days.map(d => 'closed:' + d), 'json'), env.DB.getMany(days.map(d => 'exp:' + d), 'json')]);
  const inShift = (x, d) => x.ts ? x.ts >= from : d >= dayKey(from);
  const recs = days.flatMap((d, i) => (cl[i] || []).filter(x => !x.del && !x.rm && inShift(x, d)));
  const exps = days.flatMap((d, i) => (ex[i] || []).filter(x => !x.del && inShift(x, d)));
  const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
  const cash = sum(recs, x => x.cash ?? x.sum), card = sum(recs, x => x.card), exCash = sum(exps.filter(e => e.src !== 'card'), e => e.sum), exCard = sum(exps.filter(e => e.src === 'card'), e => e.sum);
  const float = s ? s.float : ((await env.DB.get('day:' + dayKey(), 'json')) || {}).float || 0;
  const open = await openTables(env);
  return { open: !!s, id: s?.id, opened: s?.opened || 0, by: s?.by || '', float, checks: recs.length, cash, card, total: cash + card, disc: sum(recs, x => x.discSum),
    exCash, exCard, inBox: float + cash - exCash, openTables: open.length, openSum: open.reduce((a, r) => a + payable(r.b), 0) };
}
// «Загальна сума» для відкриття каси: уся готівка за весь час (готівка від гостей − витрати готівкою)
export async function lastZ(env) {
  const [dk, ek] = await Promise.all([env.DB.list({ prefix: 'day:' }), env.DB.list({ prefix: 'exp:' })]);
  const dn = dk.keys.map(k => k.name), en = ek.keys.map(k => k.name);
  const [dd, ee] = await Promise.all([dn.length ? env.DB.getMany(dn, 'json') : [], en.length ? env.DB.getMany(en, 'json') : []]);
  const cash = dd.reduce((a, d) => a + ((d && (d.cash ?? d.closed)) || 0), 0);
  const ex = ee.reduce((a, l) => a + (l || []).filter(e => !e.del && e.src !== 'card').reduce((b, e) => b + e.sum, 0), 0);
  const from = dn.map(k => k.slice(4)).sort()[0];
  // сума на кнопці = уся готівка від гостей за весь час
  return { sum: cash, cash, ex, from };
}
export async function openShift(env, float, who) {
  if (await getShift(env)) return { error: 'Зміна вже відкрита' };
  const s = { id: crypto.randomUUID().slice(0, 8), opened: Date.now(), by: who || '', float: Math.max(0, Math.round(+float || 0)) };
  await env.DB.put('shift', JSON.stringify(s)); await setFloat(env, s.float);
  await logEvent(env, { k: 'shift', by: who, text: `🔓 Касу відкрито · розмін ${s.float} грн` });
  return { s };
}
export async function closeShift(env, counted, who, print = true) {
  if (!(await getShift(env))) return { error: 'Зміна не відкрита' };
  const d = await shiftData(env);
  const z = { ...d, closed: Date.now(), closedBy: who || '', counted: counted == null || counted === '' ? null : Math.round(+counted) };
  z.diff = z.counted == null ? null : z.counted - z.inBox;
  const k = 'z:' + dayKey(); const l = (await env.DB.get(k, 'json')) || []; l.push(z); await env.DB.put(k, JSON.stringify(l));
  await env.DB.delete('shift');
  if (print) await queuePrint(env, 'z', zTicket(z));
  await logEvent(env, { k: 'shift', by: who, text: `🔒 Касу закрито · ${z.total} грн · в касі ${z.inBox} грн${z.diff ? ` · різниця ${z.diff > 0 ? '+' : ''}${z.diff}` : ''}` });
  return { z };
}
const fmtDT = t => new Date(t).toLocaleString('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
export const zText = z => [`🔒 <b>Касу закрито</b> (${fmtDT(z.opened)} — ${fmtDT(z.closed)})`, '',
  `Чеків: ${z.checks} · виручка <b>${money(z.total)}</b>`, `💵 ${money(z.cash)} · 💳 ${money(z.card)}${z.disc ? ` · знижки ${money(z.disc)}` : ''}`, '',
  `Розмін ${money(z.float)} + готівка ${money(z.cash)} − витрати ${money(z.exCash)}`, `= <b>має бути в касі ${money(z.inBox)}</b>`,
  z.counted != null ? `Пораховано: ${money(z.counted)} · ${z.diff ? `<b>різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}</b>` : 'збігається ✅'}` : '',
  z.openTables ? `\n⚠️ Ще відкрито столів: ${z.openTables} (${money(z.openSum)})` : ''].filter(x => x !== '').join('\n');
function zTicket(z) {
  return [['invb', 'Z-ЗВІТ'], ['c', 'Закриття каси'], ['gap'],
    ['lr', 'Відкрито', fmtDT(z.opened)], ['lr', 'Закрито', fmtDT(z.closed)], ['lr', 'Відкрив', z.by || '—'], ['lr', 'Закрив', z.closedBy || '—'], ['dbl'],
    ['lr', 'Чеків', String(z.checks)], ['lr', 'Готівка', `${z.cash} грн`], ['lr', 'Картка', `${z.card} грн`], ...(z.disc ? [['lr', 'Знижки', `${z.disc} грн`]] : []),
    ['total', 'ВИРУЧКА', `${z.total} грн`], ['dbl'],
    ['lr', 'Розмін', `${z.float} грн`], ['lr', '+ Готівка', `${z.cash} грн`], ['lr', '− Витрати (готівка)', `${z.exCash} грн`], ...(z.exCard ? [['lr', 'Витрати з картки', `${z.exCard} грн`]] : []),
    ['total', 'В КАСІ', `${z.inBox} грн`],
    ...(z.counted != null ? [['lr', 'Пораховано', `${z.counted} грн`], ['lr', 'Різниця', `${z.diff > 0 ? '+' : ''}${z.diff} грн`]] : []),
    ...(z.openTables ? [['dbl'], ['b', `Увага: відкрито столів ${z.openTables} на ${z.openSum} грн`]] : []), ['gap']];
}

// ---------- звіт за довільний період (сирі дані — фільтри рахує POS, підсумки — бот) ----------
export async function reportRange(env, from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return null;
  const days = dayList(from, to).slice(0, 5000);
  const [cl, ex, zz] = await Promise.all(['closed:', 'exp:', 'z:'].map(p => env.DB.getMany(days.map(d => p + d), 'json')));
  return {
    from, to,
    checks: days.flatMap((d, i) => (cl[i] || []).filter(x => !x.del && !x.rm).map(x => ({ d, at: x.at, t: x.t, sum: x.sum, cash: x.cash ?? x.sum, card: x.card || 0, by: x.by || '', disc: x.discSum || 0, dishes: x.dishes || [] }))),
    exp: days.flatMap((d, i) => (ex[i] || []).filter(x => !x.del).map(x => ({ d, at: x.at, sum: x.sum, src: x.src, note: x.note || '', by: x.by || '' }))),
    z: days.flatMap((d, i) => zz[i] || []),
  };
}
// підсумки для бота: by = waiter | group | cat | hour | table
export async function reportBreakdown(env, from, to, by) {
  const r = await reportRange(env, from, to); if (!r) return null;
  const res = dishResolver(await getMenu(env)), m = new Map();
  const add = (k, q, s) => { const a = m.get(k) || [0, 0]; a[0] += q; a[1] += s; m.set(k, a); };
  for (const c of r.checks) {
    if (by === 'waiter') add(c.by || '—', 1, c.sum);
    else if (by === 'hour') add(String(c.at || '').slice(0, 2) + ':00', 1, c.sum);
    else if (by === 'table') add('Стіл ' + c.t, 1, c.sum);
    else for (const [n, q, s] of c.dishes) { const x = res(n); add(by === 'group' ? (GROUPS.find(g => g.id === groupOf(x?.cat)) || {}).name : (x?.cname || 'Інше'), q, s); }
  }
  const rows = [...m].sort((a, b) => by === 'hour' ? a[0].localeCompare(b[0]) : b[1][1] - a[1][1]);
  return { r, rows, total: r.checks.reduce((a, c) => a + c.sum, 0) };
}

// ---------- стоп-лист ----------
export async function setHidden(env, id, hidden) {
  const menu = await getMenu(env); const it = menu.categories.flatMap(c => c.items).find(i => i.id === id);
  if (!it) return null;
  if (hidden) it.hidden = true; else delete it.hidden;
  await saveMenu(env, menu);
  return it;
}

// ---------- доступ: паролі, персонал ----------
// порівняння паролів без різниці в розкладці: «фиц» / «фіц» / латинська i, великі літери, пробіли
export const normPass = s => String(s || '').trim().toLowerCase().replace(/[иiыїі]/g, 'і').replace(/ё/g, 'е').replace(/[.\s]+$/g, '');
export const samePass = (a, b) => !!b && normPass(a) === normPass(b);
export const adminPass = async env => (await env.DB.get('admin_pass')) || env.ADMIN_PIN || '';
export const waiterPass = async env => (await env.DB.get('waiter_pass')) || 'фіц';
export const isAdmin = async (env, uid) => !!uid && !!(await env.DB.get('adm:' + uid));
export const isWaiter = async (env, uid) => !!uid && !!(await env.DB.get('wlog:' + uid));
export async function pinHash(pin) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('varvar:' + pin));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export const getStaff = async env => (await env.DB.get('staff', 'json')) || [];
export async function addStaff(env, name, pin, role = 'waiter') {
  name = String(name || '').trim().slice(0, 30); pin = String(pin || '').trim();
  if (!name || !/^\d{4,6}$/.test(pin)) return { error: 'Потрібні імʼя і PIN з 4–6 цифр.' };
  const list = await getStaff(env), h = await pinHash(pin);
  if (list.some(s => s.pin === h)) return { error: 'Такий PIN уже є — оберіть інший.' };
  const s = { id: crypto.randomUUID().slice(0, 6), name, pin: h, role: role === 'admin' ? 'admin' : 'waiter' };
  list.push(s); await env.DB.put('staff', JSON.stringify(list));
  return { ok: true, s };
}
export async function delStaff(env, id) {
  const list = await getStaff(env); const n = list.filter(s => s.id !== id);
  await env.DB.put('staff', JSON.stringify(n)); return n.length !== list.length;
}
export const loggedWaiters = async env => {
  const keys = (await env.DB.list({ prefix: 'wlog:' })).keys.map(k => k.name);
  const v = keys.length ? await env.DB.getMany(keys, 'json') : [];
  return keys.map((k, i) => ({ uid: k.slice(5), ...(v[i] || {}) }));
};

// ---------- тест (прибрати перед запуском — лише коли скаже власник) ----------
export async function resetAll(env) {
  let n = 0;
  for (const prefix of ['day:', 'closed:', 'dish:', 'bill:', 'ord:', 'rl:', 'exp:', 'ev:', 'z:', 'shift']) {
    const keys = (await env.DB.list({ prefix })).keys.map(k => k.name);
    await env.DB.deleteMany(keys); n += keys.length;
  }
  return n;
}
