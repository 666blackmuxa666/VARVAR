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
export const getEvents = async (env, day = dayKey()) => {
  const l = (await env.DB.get('ev:' + day, 'json')) || [];
  if (day === dayKey() && !(await env.DB.get('bfprev:' + day))) { await env.DB.put('bfprev:' + day, '1', { expirationTtl: 2 * 86400 }); await backfillPrev(env, day, l); }
  return l;
};
// старі події дня без «вже на столі»: відтворюємо стіл з попередніх подій (закриття/видалення — обнуляють, перенос — переносить)
async function backfillPrev(env, day, l) {
  const T = {}, add = (t, lines) => { const m = (T[t] ||= new Map()); for (const s of lines || []) { const x = s.match(LINE); if (x) m.set(x[2], (m.get(x[2]) || 0) + +x[1]); } };
  let ch = false;
  for (const e of l) {
    const t = +e.t;
    if ((e.k === 'waiter' || e.k === 'guest') && e.lines?.length) {
      if (!e.prev && T[t]?.size) { e.prev = [...T[t]].filter(([, q]) => q > 0).map(([n, q]) => `${q}× ${n}`); ch = true; }
      add(t, e.lines);
    } else if (e.k === 'close' || e.k === 'del') delete T[t];
    else if (e.k === 'move' && e.from) { const a = T[+e.from]; delete T[+e.from]; if (a) { const m = (T[t] ||= new Map()); for (const [n, q] of a) m.set(n, (m.get(n) || 0) + q); } }
  }
  if (ch) await env.DB.put('ev:' + day, JSON.stringify(l), { expirationTtl: 3 * 86400 });
}

// ✅ Прийняв: статус для гостя + подія + (з POS) оновлення повідомлення в Telegram
export async function acceptOrder(env, oid, who, { editTg = true } = {}) {
  if (!/^[a-z0-9]{6,12}$/.test(oid || '')) return false;
  const o = (await env.DB.get('ord:' + oid, 'json')) || {};
  if (o.s === 'acc') return false;
  if (o.s === 'rej') return false;
  await env.DB.put('ord:' + oid, JSON.stringify({ ...o, s: 'acc', by: who, at: hhmm() }), { expirationTtl: BILL_TTL });
  if (o.lines?.length) { // замовлення гостя підтверджене → на кухню: бігунок + екран кухні
    await queuePrint(env, 'kitchen', kitchenTicket({ table: o.t, kind: o.kind || 'ЗАМОВЛЕННЯ ГОСТЯ', lines: o.lines, comment: o.comment, by: `гість · прийняв ${who}` }));
    await addKitchen(env, { t: o.t, by: 'гість', src: 'гість', comment: o.comment, lines: o.lines });
  }
  const k = 'ev:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  for (const e of list) if (e.oid === oid) { e.s = 'acc'; e.accBy = who; }
  await env.DB.put(k, JSON.stringify(list), { expirationTtl: 3 * 86400 });
  if (editTg && o.mid && o.html) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: o.mid, text: `${o.html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: [[{ text: '🧾 Закрити стіл ' + o.t, callback_data: 'cls:' + o.t }]] } });
  return true;
}

// ---------- замовлення персоналу (бот кнопками/текстом і POS) ----------
export async function addWaiterOrder(env, d, who, comment = '', src = 'бот', urgent = false) {
  const ok = d.items.filter(i => !i.hidden);
  if (!ok.length) return null;
  const lines = ok.map(i => `${i.q}× ${i.name} — ${i.price * i.q}`), sum = ok.reduce((s, i) => s + i.price * i.q, 0);
  const bill = await getBill(env, d.table);
  const prev = billItems(bill).map(x => `${x.q}× ${x.name}`); // що вже було на столі — у стрічці видно окремо від дозамовлення
  bill.total += sum; bill.orders = (bill.orders || 0) + 1; bill.opened = bill.opened || Date.now();
  bill.log = [...(bill.log || []), { at: hhmm(), kind: `від офіціанта (${who})`, lines, ...(comment ? { comment } : {}) }].slice(-40);
  await putBill(env, d.table, bill);
  await addStat(env, 'orders', 1);
  await addDishes(env, ok.map(i => ({ n: i.name, q: i.q, sum: i.price * i.q })));
  await queuePrint(env, 'kitchen', kitchenTicket({ table: d.table, kind: 'ВІД ОФІЦІАНТА', lines, comment, by: who, urgent }));
  await addKitchen(env, { t: d.table, by: who, src: 'офіціант', comment, lines, urgent });
  await logEvent(env, { k: 'waiter', t: d.table, by: who, src, lines, comment, sum, ...(prev.length ? { prev } : {}) });
  return { sum, total: bill.total, lines, prev };
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

// ❌ відхилити замовлення гостя (ще не прийняте): прибрати з рахунку і статистики, гість бачить «відхилено»
export async function rejectOrder(env, oid, who, { editTg = true } = {}) {
  if (!/^[a-z0-9]{6,12}$/.test(oid || '')) return null;
  const o = (await env.DB.get('ord:' + oid, 'json')) || {};
  if (o.s !== 'new' || !o.lines?.length) return null;
  await env.DB.put('ord:' + oid, JSON.stringify({ ...o, s: 'rej', by: who, at: hhmm() }), { expirationTtl: BILL_TTL });
  const b = await getBill(env, o.t), i = (b.log || []).findIndex(x => x.oid === oid);
  if (i >= 0) { // ще на рахунку — прибрати і з рахунку, і зі статистики
    b.log.splice(i, 1); b.total = Math.max(0, (b.total || 0) - (o.sum || 0)); b.orders = Math.max(0, (b.orders || 1) - 1); await putBill(env, o.t, b);
    if (o.sold?.length) await addDishes(env, o.sold.map(x => ({ n: x.n, q: -x.q, sum: -x.sum })));
    await addStat(env, 'orders', -1);
  }
  const k = 'ev:' + dayKey(), list = (await env.DB.get(k, 'json')) || [];
  for (const e of list) if (e.oid === oid) { e.s = 'rej'; e.accBy = who; }
  await env.DB.put(k, JSON.stringify(list), { expirationTtl: 3 * 86400 });
  if (editTg && o.mid && o.html) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: o.mid, text: `${o.html}\n\n❌ Відхилив: <b>${esc(who)}</b> о ${hhmm()}`, parse_mode: 'HTML' });
  return o;
}

// прибрати 1 шт позиції (за назвою) з останнього замовлення, де вона є
export async function removeOne(env, t, name, who = '', reason = '') {
  reason = String(reason || '').trim().slice(0, 120);
  if (!reason) return { error: 'Вкажіть причину скасування' };
  const b = await getBill(env, t);
  for (let i = (b.log || []).length - 1; i >= 0; i--) {
    const o = b.log[i]; const j = o.lines.findIndex(l => (l.match(LINE) || [])[2] === name);
    if (j < 0) continue;
    const [, q, , sum] = o.lines[j].match(LINE); const unit = Math.round(+sum / +q);
    if (+q > 1) o.lines[j] = `${+q - 1}× ${name} — ${+sum - unit}`; else o.lines.splice(j, 1);
    if (!o.lines.length) b.log.splice(i, 1);
    b.total = Math.max(0, b.total - unit);
    const v = { ts: Date.now(), at: hhmm(), t: +t, by: who || '', name, sum: unit, reason };
    (b.voids = b.voids || []).push(v);
    await putBill(env, t, b);
    if (!(b.total > 0)) await logClosed(env, { ts: Date.now(), t: +t, sum: 0, at: hhmm(), by: who || '', del: 1, voids: b.voids }); // стіл спорожнів — скасування лишаються в історії
    await addDishes(env, [{ n: name, q: -1, sum: -unit }]);
    await addVoid(env, v);
    await kitchenCancel(env, +t, name);
    await logEvent(env, { k: 'rm', t, by: who, text: `−1× ${name} (−${unit}) · ${reason}` });
    return { name, unit, reason };
  }
  return null;
}

// 🕵️ журнал скасувань за день (для контролю): { ts, at, t, by, name, sum, reason }
export const getVoids = async (env, day = dayKey()) => (await env.DB.get('void:' + day, 'json')) || [];
async function addVoid(env, v) { const k = 'void:' + dayKey(), l = await getVoids(env); l.push(v); await env.DB.put(k, JSON.stringify(l.slice(-1000))); }
// максимальна знижка для офіціанта (адмін — будь-яка)
export const WAITER_DISC_MAX = 20;

// pay: 'cash' | 'card'; print — друкувати фінальний чек
export async function closeTable(env, t, who, pay = 'cash', print = true) {
  const bill = await getBill(env, t);
  if (!bill.total) return null;
  // чайові входять у виручку тим способом, яким заплатив гість; при видачі списуються з готівки або картки
  const tip = (bill.tip || 0) + (bill.ktip || 0), sum = payable(bill) + tip, disc = discAmt(bill);
  const card = pay === 'card' ? sum : 0, cash = sum - card;
  if (print) await queuePrint(env, 'receipt', await receipt(env, { table: t, bill, final: true, pay, by: who }));
  await env.DB.delete('bill:' + t);
  await bump(env, 'day:' + dayKey(), d => { d.closed = (d.closed || 0) + sum; d.tables = (d.tables || 0) + 1; d.cash = (d.cash || 0) + cash; d.card = (d.card || 0) + card; if (disc) d.disc = (d.disc || 0) + disc; if (tip) d.tip = (d.tip || 0) + tip; });
  // страви рахунку — щоб при видаленні закритого рахунку відняти їх і з «топ страв»
  const dishes = []; for (const o of bill.log || []) for (const l of o.lines) { const x = l.match(LINE); if (x) dishes.push([x[2], +x[1], +x[3]]); }
  const tipSplit = tip ? await splitTip(env, who, bill.tip || 0, bill.ktip || 0) : null;
  if (tipSplit) for (const [n, v] of Object.entries(tipSplit)) await addTipBal(env, n, v);
  await logClosed(env, { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), t, sum, cash, card, at: hhmm(), by: who || '', orders: bill.orders || 0, dishes, ...(tip ? { tip, tipSplit, ...(bill.ktip ? { ktip: bill.ktip } : {}) } : {}), ...(bill.voids?.length ? { voids: bill.voids } : {}), ...(disc ? { gross: bill.total, disc: bill.disc, discSum: disc } : {}) });
  await logEvent(env, { k: 'close', t, by: who, sum, pay, print });
  return { t, sum, cash, card, disc, tip };
}
export const payLabel = (cash, card) => card ? '💳 карта' : '💵 готівка';

export async function precheck(env, t, who) {
  const b = await getBill(env, t); if (!b.total) return false;
  await queuePrint(env, 'precheck', await receipt(env, { table: +t, bill: b, final: false, by: who }));
  await logEvent(env, { k: 'pre', t, by: who });
  return true;
}

export async function setDiscount(env, t, pct, who, admin = true) {
  const b = await getBill(env, t); if (!b.total) return null;
  pct = Math.max(0, Math.min(100, Math.round(+pct || 0)));
  if (!admin && pct > WAITER_DISC_MAX) return { error: `Офіціант може дати знижку до ${WAITER_DISC_MAX}%. Більше — лише адміністратор.` };
  if (pct) b.discBy = who || ''; else delete b.discBy;
  if (pct) b.disc = pct; else delete b.disc;
  await putBill(env, t, b);
  await logEvent(env, { k: 'disc', t, by: who, text: pct ? `знижка ${pct}% (−${discAmt(b)})` : 'знижку прибрано' });
  return b;
}

// 💝 чайові (від гостя з сайту або вручну) — входять у виручку, окремий рядок у чеку; офіціанту накопичуються на рахунку
export async function setTip(env, t, sum, who) {
  const b = await getBill(env, t); if (!b.total) return null;
  sum = Math.max(0, Math.min(10000, Math.round(+sum || 0)));
  if (sum) b.tip = sum; else delete b.tip;
  await putBill(env, t, b);
  await logEvent(env, { k: 'disc', t, by: who, text: sum ? `чайові ${sum} грн` : 'чайові прибрано' });
  return b;
}
// 👨‍🍳 чайові кухні: частка % від чайових офіціанта + «подяка кухні» від гостя — порівну між кухарями, що сьогодні працюють
export const kitchenPct = async env => { const v = await env.DB.get('kitchen_pct'); return v == null ? 20 : +v; };
export const KITCHEN_POOL = '👨‍🍳 Кухня';
export async function markCook(env, name) { const k = 'cooks:' + dayKey(), l = (await env.DB.get(k, 'json')) || []; if (!l.includes(name)) { l.push(name); await env.DB.put(k, JSON.stringify(l), { expirationTtl: 3 * 86400 }); } }
export async function splitTip(env, waiter, tipW, ktip) {
  const out = {}, add = (n, v) => { if (v) out[n || '—'] = (out[n || '—'] || 0) + v; };
  const kpart = Math.round(tipW * (await kitchenPct(env)) / 100), kitchen = kpart + ktip;
  add(waiter, tipW - kpart);
  const names = new Set((await getStaff(env)).map(s => s.name)), cooks = ((await env.DB.get('cooks:' + dayKey(), 'json')) || []).filter(n => names.has(n)); // лише ті, хто ще в персоналі
  if (kitchen) { if (!cooks.length) add(KITCHEN_POOL, kitchen); else { const each = Math.floor(kitchen / cooks.length); cooks.forEach((c, i) => add(c, each + (i === 0 ? kitchen - each * cooks.length : 0))); } }
  return out;
}
export const tipSplitOf = x => x.tipSplit || (x.tip ? { [x.by || '—']: x.tip } : {});
// ---------- рахунок чайових офіціанта: накопичуються, поки адмін не натисне «Видано» ----------
export async function tipBalances(env) {
  let b = await env.DB.get('tipbal', 'json');
  if (!b) { // перший раз — рахуємо з усіх закритих рахунків
    b = {}; const keys = (await env.DB.list({ prefix: 'closed:' })).keys.map(k => k.name);
    const lists = keys.length ? await env.DB.getMany(keys, 'json') : [];
    lists.forEach(l => (l || []).forEach(x => { if (x.tip && !x.del && !x.rm) b[x.by || '—'] = (b[x.by || '—'] || 0) + x.tip; }));
    await env.DB.put('tipbal', JSON.stringify(b));
  }
  return b;
}
export async function addTipBal(env, name, n) { if (!n) return; const b = await tipBalances(env); const k = name || '—'; b[k] = Math.max(0, (b[k] || 0) + n); if (!b[k]) delete b[k]; await env.DB.put('tipbal', JSON.stringify(b)); }
// src: cash | card — звідки видали: сума списується з готівки або з картки (як рух коштів)
export async function payTips(env, name, who, src = 'cash') {
  const b = await tipBalances(env), sum = b[name] || 0; if (!sum) return null;
  src = src === 'card' ? 'card' : 'cash';
  delete b[name]; await env.DB.put('tipbal', JSON.stringify(b));
  const k = 'tippay:' + dayKey(), l = (await env.DB.get(k, 'json')) || []; l.push({ ts: Date.now(), at: hhmm(), name, sum, src, by: who || '' }); await env.DB.put(k, JSON.stringify(l));
  const mk = 'mov:' + dayKey(), ml = await getMov(env); ml.push({ ts: Date.now(), at: hhmm(), type: src === 'card' ? 'tipk' : 'tipc', sum, note: name, by: who || '' }); await env.DB.put(mk, JSON.stringify(ml));
  await logEvent(env, { k: 'shift', by: who, text: `💝 Видано чайові: ${name} — ${sum} грн (${src === 'card' ? 'з картки' : 'готівкою'})` });
  return sum;
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
    B.check = B.check || A.check; if (!B.disc && A.disc) B.disc = A.disc; if (A.voids) B.voids = [...(B.voids || []), ...A.voids]; if (!B.tip && A.tip) B.tip = A.tip; if (!B.ktip && A.ktip) B.ktip = A.ktip;
    await putBill(env, b, B);
  } else await putBill(env, b, A);
  await env.DB.delete('bill:' + a);
  // статуси замовлень гостей переходять на новий стіл
  await logEvent(env, { k: 'move', t: b, from: a, by: who, text: merged ? `стіл ${a} об'єднано зі столом ${b}` : `стіл ${a} → ${b}` });
  return { merged };
}

export async function deleteTable(env, t, who, reason = '') {
  const bill = await getBill(env, t);
  if (!bill.total) return null;
  await env.DB.delete('bill:' + t);
  await kitchenCancel(env, +t, null);
  const dishes = []; for (const o of bill.log || []) for (const l of o.lines) { const x = l.match(LINE); if (x) dishes.push([x[2], +x[1], +x[3]]); }
  await addVoid(env, { ts: Date.now(), at: hhmm(), t: +t, by: who || '', name: `🗑 Весь стіл (${dishes.length} поз.)`, sum: bill.total, reason: String(reason || 'стіл видалено').slice(0, 120), table: 1 });
  await logClosed(env, { ts: Date.now(), t, sum: bill.total, at: hhmm(), by: who || '', del: 1, dishes, ...(bill.voids?.length ? { voids: bill.voids } : {}) });
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
    if (x.discSum) d.disc = Math.max(0, (d.disc || 0) - x.discSum); if (x.tip) d.tip = Math.max(0, (d.tip || 0) - x.tip); });
  if (x.dishes?.length) await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q: -q, sum: -sum })));
  for (const [n, v] of Object.entries(tipSplitOf(x))) await addTipBal(env, n, -v);
  return x;
}
// ↩️ повернути закритий рахунок у виручку (скасувати «видалити з виручки»)
export async function restoreClosed(env, ref, who) {
  const k = 'closed:' + dayKey(), list = await getClosed(env), x = findClosed(list, ref);
  if (!x || !x.rm || x.reopen || x.del) return null;
  delete x.rm; await env.DB.put(k, JSON.stringify(list));
  await bump(env, 'day:' + dayKey(), d => { d.closed = (d.closed || 0) + x.sum; d.tables = (d.tables || 0) + 1;
    d.cash = (d.cash || 0) + (x.cash ?? x.sum); d.card = (d.card || 0) + (x.card || 0); d.orders = (d.orders || 0) + (x.orders || 0);
    if (x.discSum) d.disc = (d.disc || 0) + x.discSum; if (x.tip) d.tip = (d.tip || 0) + x.tip; });
  if (x.dishes?.length) await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q, sum })));
  for (const [n, v] of Object.entries(tipSplitOf(x))) await addTipBal(env, n, v);
  await logEvent(env, { k: 'shift', by: who, text: `↩️ Рахунок стола ${x.t} (${x.sum} грн) повернуто у виручку` });
  return x;
}
// відновити страви на стіл (якщо стіл зайнятий — додаються до його рахунку)
async function billBack(env, t, x, kind) {
  const lines = (x.dishes || []).map(([n, q, sum]) => `${q}× ${n} — ${sum}`); if (!lines.length) return false;
  const b = await getBill(env, t), sum = x.dishes.reduce((a, d) => a + d[2], 0);
  b.total = (b.total || 0) + sum; b.orders = (b.orders || 0) + 1; b.opened = b.opened || Date.now();
  b.log = [...(b.log || []), { at: hhmm(), kind, lines }].slice(-60);
  if (x.disc && !b.disc) b.disc = x.disc; if (x.tip && !b.tip) b.tip = x.tip - (x.ktip || 0); if (x.ktip && !b.ktip) b.ktip = x.ktip; if (x.voids?.length) b.voids = [...(b.voids || []), ...x.voids];
  await putBill(env, t, b); return true;
}
// ↩️ відкрити закритий рахунок знову: знімається з виручки і повертається на стіл (щоб виправити й закрити заново)
export async function reopenClosed(env, ref, who) {
  const x0 = await closedRec(env, ref); if (!x0 || x0.del || x0.reopen || !x0.dishes?.length) return null;
  if (!x0.rm) await delClosed(env, ref);
  const k = 'closed:' + dayKey(), list = await getClosed(env), x = findClosed(list, ref);
  x.rm = 1; x.reopen = 1; await env.DB.put(k, JSON.stringify(list));
  await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q, sum }))); // страви знову на столі (продажі страв рахуються при замовленні, delClosed їх відняв)
  await billBack(env, x.t, x, `↩️ відкрито знову (${who})`);
  await logEvent(env, { k: 'shift', t: x.t, by: who, text: `↩️ Стіл ${x.t}: закритий рахунок відкрито знову (${x.sum} грн)` });
  return x;
}
// ↩️ відновити видалений стіл (сьогоднішній)
export async function restoreTable(env, ref, who) {
  const k = 'closed:' + dayKey(), list = await getClosed(env), x = findClosed(list, ref);
  if (!x || !x.del || x.restored || !x.dishes?.length) return null;
  x.restored = 1; await env.DB.put(k, JSON.stringify(list));
  await billBack(env, x.t, x, `↩️ відновлено (${who})`);
  const vk = 'void:' + dayKey(), vl = await getVoids(env); const vi = vl.findLastIndex(v => v.table && v.t === +x.t && v.sum === x.sum);
  if (vi >= 0) { vl.splice(vi, 1); await env.DB.put(vk, JSON.stringify(vl)); }
  await logEvent(env, { k: 'shift', t: x.t, by: who, text: `↩️ Стіл ${x.t} відновлено (${x.sum} грн)` });
  return x;
}
export async function reprintClosed(env, ref, who) {
  const x = await closedRec(env, ref);
  if (!x?.dishes?.length) return false;
  const bill = { total: x.gross || (x.sum - (x.tip || 0)), disc: x.disc, tip: (x.tip || 0) - (x.ktip || 0), ktip: x.ktip, log: [{ lines: x.dishes.map(([n, q, sum]) => `${q}× ${n} — ${sum}`) }] };
  await queuePrint(env, 'receipt', await receipt(env, { table: x.t, bill, final: true, pay: x.card ? 'card' : 'cash', by: who }));
  return true;
}

// ---------- фінанси ----------
export const getExp = async (env, day = dayKey()) => (await env.DB.get('exp:' + day, 'json')) || [];
export async function addExpense(env, e) { const k = 'exp:' + dayKey(); const l = await getExp(env); l.push({ ts: Date.now(), ...e }); await env.DB.put(k, JSON.stringify(l)); }
export async function delExpense(env, i) { const k = 'exp:' + dayKey(); const l = await getExp(env); if (!l[+i]) return false; l[+i].del = 1; await env.DB.put(k, JSON.stringify(l)); return true; }
export async function restoreExpense(env, i) { const k = 'exp:' + dayKey(); const l = await getExp(env); if (!l[+i]?.del) return false; delete l[+i].del; await env.DB.put(k, JSON.stringify(l)); return true; }
// ---------- рух коштів (не витрати): внесення / вилучення готівки, обмін картка ↔ готівка ----------
// type: in (+готівка) · out (−готівка) · k2c (з картки в готівку) · c2k (з готівки на картку)
export const MOVE = { in: '➕ Внесення готівки', out: '➖ Вилучення готівки', k2c: '🔁 Картка → готівка', c2k: '🔁 Готівка → картка', kout: '➖ Вилучення з картки' };
// службові рухи (не вводяться вручну): видача чайових
export const MOVE_ALL = { ...MOVE, tipc: '💝 Чайові видано готівкою', tipk: '💝 Чайові видано з картки', adjc: '✏️ Звірка готівки', adjk: '✏️ Звірка картки' };
export const moveCash = m => m.del ? 0 : ({ in: 1, out: -1, k2c: 1, c2k: -1, tipc: -1, adjc: 1 }[m.type] || 0) * m.sum;
export const moveCard = m => m.del ? 0 : ({ k2c: -1, c2k: 1, tipk: -1, kout: -1, adjk: 1 }[m.type] || 0) * m.sum;
export const getMov = async (env, day = dayKey()) => (await env.DB.get('mov:' + day, 'json')) || [];
export async function addMove(env, m) {
  if (!MOVE[m.type] || !(m.sum > 0)) return null;
  const k = 'mov:' + dayKey(), l = await getMov(env); const e = { ts: Date.now(), at: hhmm(), type: m.type, sum: Math.round(m.sum), note: String(m.note || '').slice(0, 100), by: m.by || '' };
  l.push(e); await env.DB.put(k, JSON.stringify(l));
  await logEvent(env, { k: 'shift', by: e.by, text: `${MOVE[e.type]} ${e.sum} грн${e.note ? ' · ' + e.note : ''}` });
  return e;
}
// 💰 залишки за весь час (змін немає — усе переходить з дня в день):
// готівка = продажі готівкою + рух готівки − витрати з каси; картка = продажі карткою + рух картки − витрати з картки
export async function balances(env) {
  const [dk, ek, mk] = await Promise.all(['day:', 'exp:', 'mov:'].map(p => env.DB.list({ prefix: p })));
  const names = l => l.keys.map(k => k.name), get = async n => n.length ? env.DB.getMany(n, 'json') : [];
  const [dd, ee, mm] = await Promise.all([get(names(dk)), get(names(ek)), get(names(mk))]);
  const r = { saleCash: 0, saleCard: 0, exCash: 0, exCard: 0, mvCash: 0, mvCard: 0, tipCash: 0, tipCard: 0, adjCash: 0, adjCard: 0 };
  dd.forEach(d => { if (!d) return; r.saleCash += d.cash ?? d.closed ?? 0; r.saleCard += d.card || 0; });
  ee.forEach(l => (l || []).forEach(e => { if (e.del) return; if (e.src === 'card') r.exCard += e.sum; else r.exCash += e.sum; }));
  mm.forEach(l => (l || []).forEach(m => { if (m.del) return;
    if (m.type === 'tipc') r.tipCash += m.sum; else if (m.type === 'tipk') r.tipCard += m.sum;
    else if (m.type === 'adjc') r.adjCash += m.sum; else if (m.type === 'adjk') r.adjCard += m.sum;
    else { r.mvCash += moveCash(m); r.mvCard += moveCard(m); } }));
  r.cash = r.saleCash + r.mvCash - r.exCash - r.tipCash + r.adjCash;
  r.card = r.saleCard + r.mvCard - r.exCard - r.tipCard + r.adjCard;
  r.total = r.cash + r.card; r.from = names(dk).map(k => k.slice(4)).sort()[0] || '';
  return r;
}
// ✏️ звірка: вписали фактичний залишок — різниця записується коригуванням
export async function reconcile(env, src, actual, who) {
  actual = Math.round(+actual); if (!(actual >= 0)) return null;
  const b = await balances(env), was = src === 'card' ? b.card : b.cash, diff = actual - was;
  if (!diff) return { diff: 0, was, actual };
  const k = 'mov:' + dayKey(), l = await getMov(env);
  l.push({ ts: Date.now(), at: hhmm(), type: src === 'card' ? 'adjk' : 'adjc', sum: diff, note: `було ${was}, факт ${actual}`, by: who || '' }); await env.DB.put(k, JSON.stringify(l));
  await logEvent(env, { k: 'shift', by: who, text: `✏️ Звірка ${src === 'card' ? 'картки' : 'готівки'}: факт ${actual} грн (${diff > 0 ? '+' : ''}${diff})` });
  return { diff, was, actual };
}
export async function restoreMove(env, i) { const k = 'mov:' + dayKey(); const l = await getMov(env); if (!l[+i]?.del) return false; delete l[+i].del; await env.DB.put(k, JSON.stringify(l)); return true; }
export async function delMove(env, i) { const k = 'mov:' + dayKey(); const l = await getMov(env); if (!l[+i] || l[+i].del) return false; l[+i].del = 1; await env.DB.put(k, JSON.stringify(l)); return true; }
export const setFloat = (env, n) => bump(env, 'day:' + dayKey(), d => { d.float = Math.round(n); });
export async function cashData(env) {
  const d = (await env.DB.get('day:' + dayKey(), 'json')) || {};
  const exp = await getExp(env); const ex = exp.filter(e => !e.del);
  const exCash = ex.filter(e => e.src === 'cash').reduce((s, e) => s + e.sum, 0), exCard = ex.filter(e => e.src === 'card').reduce((s, e) => s + e.sum, 0);
  const open = (await openTables(env)).reduce((s, r) => s + payable(r.b), 0);
  const mov = await getMov(env), mvCash = mov.reduce((a, m) => a + moveCash(m), 0), mvCard = mov.reduce((a, m) => a + moveCard(m), 0);
  return { day: dayKey(), float: d.float || 0, cash: d.cash || 0, card: d.card || 0, disc: d.disc || 0, exCash, exCard, mvCash, mvCard, net: (d.cash || 0) + (d.card || 0) - exCash - exCard, open, exp, mov };
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
const KITCHEN = ['minimax', 'pasta', 'burgers', 'salads', 'snacks', 'soups', 'pans', 'extras'];
// 🧩 Інше — технічні позиції лише для каси/бота (гості їх не бачать): бій посуду, упаковка, позиції поза меню
export const TECH = ['inshe-food', 'inshe-posud', 'inshe-serv', 'inshe', 'upakuvannia'];
export const GROUPS = [{ id: 'kitchen', name: '🍳 Кухня' }, { id: 'bar', name: '🍹 Бар' }, { id: 'hookah', name: '💨 Кальян' }, { id: 'other', name: '🧩 Інше' }];
export const groupOf = cat => TECH.includes(cat) || String(cat).startsWith('inshe') ? 'other' : cat === 'hookah' ? 'hookah' : KITCHEN.includes(cat) ? 'kitchen' : 'bar';
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
  const [cl, ex, mv] = await Promise.all([env.DB.getMany(days.map(d => 'closed:' + d), 'json'), env.DB.getMany(days.map(d => 'exp:' + d), 'json'), env.DB.getMany(days.map(d => 'mov:' + d), 'json')]);
  const tsOf = (x, d) => x.ts || (/^\d\d:\d\d$/.test(x.at || '') ? dayStart(Date.parse(d + 'T12:00:00Z')) + (+x.at.slice(0, 2) * 60 + +x.at.slice(3)) * 60e3 : 0);
  const inShift = (x, d) => tsOf(x, d) >= from;
  const recs = days.flatMap((d, i) => (cl[i] || []).filter(x => !x.del && !x.rm && inShift(x, d)));
  const exps = days.flatMap((d, i) => (ex[i] || []).filter(x => !x.del && inShift(x, d)));
  const movs = days.flatMap((d, i) => (mv[i] || []).filter(x => !x.del && inShift(x, d)));
  const mvCash = movs.reduce((a, m) => a + moveCash(m), 0), mvCard = movs.reduce((a, m) => a + moveCard(m), 0);
  const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
  const cash = sum(recs, x => x.cash ?? x.sum), card = sum(recs, x => x.card), exCash = sum(exps.filter(e => e.src !== 'card'), e => e.sum), exCard = sum(exps.filter(e => e.src === 'card'), e => e.sum);
  const float = s ? s.float : ((await env.DB.get('day:' + dayKey(), 'json')) || {}).float || 0;
  const open = await openTables(env);
  return { lastZ: s ? null : await lastZrec(env), open: !!s, id: s?.id, opened: s?.opened || 0, by: s?.by || '', float, checks: recs.length, cash, card, total: cash + card, disc: sum(recs, x => x.discSum),
    exCash, exCard, mvCash, mvCard, inBox: float + cash - exCash + mvCash, openTables: open.length, openSum: open.reduce((a, r) => a + payable(r.b), 0) };
}
// «Загальна сума» для відкриття каси: уся готівка за весь час (готівка від гостей − витрати готівкою)
export async function lastZ(env) {
  const [dk, ek] = await Promise.all([env.DB.list({ prefix: 'day:' }), env.DB.list({ prefix: 'exp:' })]);
  const dn = dk.keys.map(k => k.name), en = ek.keys.map(k => k.name);
  const [dd, ee] = await Promise.all([dn.length ? env.DB.getMany(dn, 'json') : [], en.length ? env.DB.getMany(en, 'json') : []]);
  const cash = dd.reduce((a, d) => a + ((d && (d.cash ?? d.closed)) || 0), 0);
  const ex = ee.reduce((a, l) => a + (l || []).filter(e => !e.del && e.src !== 'card').reduce((b, e) => b + e.sum, 0), 0);
  const from = dn.map(k => k.slice(4)).sort()[0];
  // сума на кнопці = уся готівка від гостей за весь час + рух коштів (внесення, обмін)
  const mk = (await env.DB.list({ prefix: 'mov:' })).keys.map(k => k.name);
  const mv = (mk.length ? await env.DB.getMany(mk, 'json') : []).reduce((a, l) => a + (l || []).reduce((b, m) => b + moveCash(m), 0), 0);
  return { sum: Math.max(0, cash + mv), cash, mv, ex, from };
}
export async function lastZrec(env) {
  const days = [...Array(30)].map((_, i) => dayKey(Date.now() - i * 86400e3));
  const l = (await env.DB.getMany(days.map(d => 'z:' + d), 'json')).find(x => x?.length);
  return l ? l[l.length - 1] : null;
}
export async function openShift(env, float, who) {
  if (await getShift(env)) return { error: 'Зміна вже відкрита' };
  const s = { id: crypto.randomUUID().slice(0, 8), opened: Date.now(), by: who || '', float: Math.max(0, Math.round(+float || 0)) };
  await env.DB.put('shift', JSON.stringify(s)); await setFloat(env, s.float);
  await logEvent(env, { k: 'shift', by: who, text: `🔓 Касу відкрито · на початок ${s.float} грн` });
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
  `На початок ${money(z.float)} + готівка ${money(z.cash)} − витрати ${money(z.exCash)}${z.mvCash ? ` ${z.mvCash > 0 ? '+' : '−'} рух коштів ${money(Math.abs(z.mvCash))}` : ''}`, `= <b>має бути в касі ${money(z.inBox)}</b>`,
  z.counted != null ? `Пораховано: ${money(z.counted)} · ${z.diff ? `<b>різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}</b>` : 'збігається ✅'}` : '',
  z.openTables ? `\n⚠️ Ще відкрито столів: ${z.openTables} (${money(z.openSum)})` : ''].filter(x => x !== '').join('\n');
function zTicket(z) {
  return [['invb', 'Z-ЗВІТ'], ['c', 'Закриття каси'], ['gap'],
    ['lr', 'Відкрито', fmtDT(z.opened)], ['lr', 'Закрито', fmtDT(z.closed)], ['lr', 'Відкрив', z.by || '—'], ['lr', 'Закрив', z.closedBy || '—'], ['dbl'],
    ['lr', 'Чеків', String(z.checks)], ['lr', 'Готівка', `${z.cash} грн`], ['lr', 'Картка', `${z.card} грн`], ...(z.disc ? [['lr', 'Знижки', `${z.disc} грн`]] : []), ...(z.tip ? [['lr', 'в т.ч. чайові', `${z.tip} грн`], ...Object.entries(z.tipBy || {}).map(([n, s]) => ['lr', `  ${n}`, `${s} грн`])] : []),
    ['total', 'ВИРУЧКА', `${z.total} грн`], ['dbl'],
    ['lr', 'На початок', `${z.float} грн`], ['lr', '+ Готівка', `${z.cash} грн`], ['lr', '− Витрати (готівка)', `${z.exCash} грн`], ...(z.mvCash ? [['lr', 'Рух коштів (готівка)', `${z.mvCash > 0 ? '+' : ''}${z.mvCash} грн`]] : []), ...(z.exCard ? [['lr', 'Витрати з картки', `${z.exCard} грн`]] : []),
    ['total', 'В КАСІ', `${z.inBox} грн`],
    ...(z.counted != null ? [['lr', 'Пораховано', `${z.counted} грн`], ['lr', 'Різниця', `${z.diff > 0 ? '+' : ''}${z.diff} грн`]] : []),
    ...(z.openTables ? [['dbl'], ['b', `Увага: відкрито столів ${z.openTables} на ${z.openSum} грн`]] : []), ['gap']];
}

// ---------- Z-звіт за день (без відкриття/закриття каси) ----------
export async function dayZData(env, day = dayKey()) {
  const [cl, ex, mv, d] = await Promise.all([getClosed(env, day), getExp(env, day), getMov(env, day), env.DB.get('day:' + day, 'json')]);
  const recs = cl.filter(x => !x.del && !x.rm), exps = ex.filter(e => !e.del), movs = mv.filter(m => !m.del);
  const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
  const cash = sum(recs, x => x.cash ?? x.sum), card = sum(recs, x => x.card);
  const exCash = sum(exps.filter(e => e.src !== 'card'), e => e.sum), exCard = sum(exps.filter(e => e.src === 'card'), e => e.sum);
  const mvCash = sum(movs, moveCash), mvCard = sum(movs, moveCard);
  const open = day === dayKey() ? await openTables(env) : [];
  const tipBy = {}; recs.forEach(x => Object.entries(tipSplitOf(x)).forEach(([n, v]) => { tipBy[n] = (tipBy[n] || 0) + v; }));
  return { day, tipBy, checks: recs.length, cash, card, total: cash + card, disc: sum(recs, x => x.discSum), tip: sum(recs, x => x.tip), exCash, exCard, mvCash, mvCard,
    tipOut: sum(movs.filter(m => m.type === 'tipc' || m.type === 'tipk'), m => m.sum),
    net: cash + card - exCash - exCard - sum(movs.filter(m => m.type === 'tipc' || m.type === 'tipk'), m => m.sum), orders: (d || {}).orders || 0, dels: cl.filter(x => x.del || x.rm).length,
    openTables: open.length, openSum: open.reduce((a, r) => a + payable(r.b), 0) };
}
export async function dayZ(env, who, print = true, day = dayKey()) {
  const z = { ...(await dayZData(env, day)), opened: dayStart(Date.parse(day + 'T12:00:00Z')), closed: Date.now(), closedBy: who || '', kind: 'day' };
  const k = 'z:' + day, l = (await env.DB.get(k, 'json')) || []; l.push(z); await env.DB.put(k, JSON.stringify(l));
  if (print) await queuePrint(env, 'z', zDayTicket(z));
  await logEvent(env, { k: 'shift', by: who, text: `🧾 Z-звіт за ${day}: ${z.total} грн · чеків ${z.checks}` });
  return z;
}
const dm = d => d.split('-').reverse().join('.');
export const zDayText = z => [`🧾 <b>Z-звіт за ${dm(z.day)}</b>`, '',
  `Чеків: ${z.checks} · виручка <b>${money(z.total)}</b>`, `💵 Готівка: ${money(z.cash)}`, `💳 Картка: ${money(z.card)}`,
  z.disc ? `🏷 Знижки: ${money(z.disc)}` : '', z.tip ? `💝 в т.ч. чайові: ${money(z.tip)}${Object.keys(z.tipBy || {}).length ? '\n' + Object.entries(z.tipBy).map(([n, s]) => `   👤 ${esc(n)}: ${money(s)}`).join('\n') : ''}` : '', `💸 Витрати: ${money(z.exCash + z.exCard)}${z.exCard ? ` (з картки ${money(z.exCard)})` : ''}`,
  z.mvCash || z.mvCard ? `🔁 Рух коштів: готівка ${z.mvCash >= 0 ? '+' : ''}${money(z.mvCash)}${z.mvCard ? `, картка ${z.mvCard >= 0 ? '+' : ''}${money(z.mvCard)}` : ''}` : '',
  `📈 Чистими: <b>${money(z.net)}</b>`, z.openTables ? `\n⚠️ Ще відкрито столів: ${z.openTables} (${money(z.openSum)})` : ''].filter(x => x !== '').join('\n');
function zDayTicket(z) {
  return [['invb', 'Z-ЗВІТ'], ['c', dm(z.day)], ['gap'], ['lr', 'Надруковано', fmtDT(z.closed)], ['lr', 'Хто', z.closedBy || '—'], ['dbl'],
    ['lr', 'Чеків', String(z.checks)], ['lr', 'Готівка', `${z.cash} грн`], ['lr', 'Картка', `${z.card} грн`], ...(z.disc ? [['lr', 'Знижки', `${z.disc} грн`]] : []), ...(z.tip ? [['lr', 'в т.ч. чайові', `${z.tip} грн`]] : []),
    ['total', 'ВИРУЧКА', `${z.total} грн`], ['dbl'],
    ['lr', 'Витрати (готівка)', `${z.exCash} грн`], ...(z.exCard ? [['lr', 'Витрати (картка)', `${z.exCard} грн`]] : []),
    ...(z.mvCash ? [['lr', 'Рух коштів (готівка)', `${z.mvCash > 0 ? '+' : ''}${z.mvCash} грн`]] : []), ...(z.mvCard ? [['lr', 'Рух коштів (картка)', `${z.mvCard > 0 ? '+' : ''}${z.mvCard} грн`]] : []),
    ['total', 'ЧИСТИМИ', `${z.net} грн`], ...(z.openTables ? [['dbl'], ['b', `Увага: відкрито столів ${z.openTables} на ${z.openSum} грн`]] : []), ['gap']];
}

// ---------- звіт за довільний період (сирі дані — фільтри рахує POS, підсумки — бот) ----------
export async function reportRange(env, from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return null;
  const days = dayList(from, to).slice(0, 5000);
  const [cl, ex, zz, mm, vv] = await Promise.all(['closed:', 'exp:', 'z:', 'mov:', 'void:'].map(p => env.DB.getMany(days.map(d => p + d), 'json')));
  return {
    from, to,
    checks: days.flatMap((d, i) => (cl[i] || []).filter(x => !x.del && !x.rm).map(x => ({ d, at: x.at, t: x.t, sum: x.sum, cash: x.cash ?? x.sum, card: x.card || 0, by: x.by || '', disc: x.discSum || 0, pct: x.disc || 0, tip: x.tip || 0, tipSplit: tipSplitOf(x), dishes: x.dishes || [], voids: x.voids || [] }))),
    voids: days.flatMap((d, i) => (vv[i] || []).map(x => ({ d, ...x }))),
    removed: days.flatMap((d, i) => (cl[i] || []).filter(x => x.rm).map(x => ({ d, at: x.at, t: x.t, sum: x.sum, by: x.by || '' }))),
    exp: days.flatMap((d, i) => (ex[i] || []).filter(x => !x.del).map(x => ({ d, at: x.at, sum: x.sum, src: x.src, note: x.note || '', by: x.by || '' }))),
    z: days.flatMap((d, i) => zz[i] || []),
    mov: days.flatMap((d, i) => (mm[i] || []).filter(x => !x.del).map(x => ({ d, ...x }))),
  };
}
// підсумки для бота: by = waiter | group | cat | hour | table
export async function reportBreakdown(env, from, to, by) {
  const r = await reportRange(env, from, to); if (!r) return null;
  const res = dishResolver(await getMenu(env)), m = new Map();
  const add = (k, q, s) => { const a = m.get(k) || [0, 0]; a[0] += q; a[1] += s; m.set(k, a); };
  for (const c of r.checks) {
    if (by === 'ctrl') continue;
    if (by === 'waiter') add(c.by || '—', 1, c.sum);
    else if (by === 'tips') { for (const [n, v] of Object.entries(c.tipSplit || {})) add(n, 1, v); }
    else if (by === 'hour') add(String(c.at || '').slice(0, 2) + ':00', 1, c.sum);
    else if (by === 'table') add('Стіл ' + c.t, 1, c.sum);
    else for (const [n, q, s] of c.dishes) { const x = res(n); add(by === 'group' ? (GROUPS.find(g => g.id === groupOf(x?.cat)) || {}).name : (x?.cname || 'Інше'), q, s); }
  }
  if (by === 'ctrl') return { r, ctrl: controlData(r), rows: [], total: r.checks.reduce((a, c) => a + c.sum, 0) };
  const rows = [...m].sort((a, b) => by === 'hour' ? a[0].localeCompare(b[0]) : b[1][1] - a[1][1]);
  return { r, rows, total: r.checks.reduce((a, c) => a + c.sum, 0) };
}

// 🕵️ контроль по офіціантах: чеки, виручка, скасування, знижки, чайові
export function controlData(r) {
  const m = {}, W = n => m[n || '—'] = m[n || '—'] || { name: n || '—', checks: 0, sum: 0, voidN: 0, voidSum: 0, discN: 0, discSum: 0, discMax: 0, tip: 0, tipN: 0, tables: 0, tableSum: 0 };
  for (const c of r.checks) { const w = W(c.by); w.checks++; w.sum += c.sum; if (c.disc) { w.discN++; w.discSum += c.disc; w.discMax = Math.max(w.discMax, c.pct || 0); } { const v = (c.tipSplit || {})[c.by || '—'] || 0; if (v) { w.tip += v; w.tipN++; } } }
  for (const v of r.voids || []) { const w = W(v.by); if (v.table) { w.tables++; w.tableSum += v.sum; } else { w.voidN++; w.voidSum += v.sum; } }
  return Object.values(m).map(w => ({ ...w, voidPct: w.sum ? Math.round(w.voidSum / (w.sum + w.voidSum) * 1000) / 10 : 0 })).sort((a, b) => b.voidSum + b.discSum - a.voidSum - a.discSum);
}

// ---------- 👨‍🍳 кухонний екран: черга замовлень кухні ----------
// kq:день = [{ id, ts, at, t, by, src, tw, urgent, comment, items:[{n,q,done,cancel}], start, done, doneAt, msgs:[{at,text}] }]
const KQ_CATS = c => groupOf(c) === 'kitchen' || c === 'inshe-food';
export const getKq = async (env, day = dayKey()) => (await env.DB.get('kq:' + day, 'json')) || [];
const putKq = (env, l, day = dayKey()) => env.DB.put('kq:' + day, JSON.stringify(l.slice(-400)));
export async function addKitchen(env, { t, by, src, comment = '', lines, urgent = false }) {
  const res = dishResolver(await getMenu(env)), items = [];
  for (const l of lines || []) { const x = l.match(LINE); if (!x) continue; const d = res(x[2]); if (d && KQ_CATS(d.cat)) items.push({ n: x[2], q: +x[1] }); }
  if (!items.length) return null;
  const l = await getKq(env), e = { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), at: hhmm(), t: +t, by: by || '', src, tw: /З СОБОЮ/.test(comment || ''), urgent: !!urgent, comment: String(comment || '').replace(/З СОБОЮ\s*·?\s*/, '').trim(), items };
  l.push(e); await putKq(env, l); return e;
}
async function kqEdit(env, id, fn) { const l = await getKq(env), e = l.find(x => x.id === id); if (!e) return null; const r = fn(e); await putKq(env, l); return r === false ? null : e; }
// i — номер страви або null (усе замовлення)
export async function kitchenDone(env, id, i, who) {
  const e = await kqEdit(env, id, e => { if (e.done) return false; if (i == null) e.items.forEach(x => { x.done = 1; }); else if (e.items[+i]) e.items[+i].done = e.items[+i].done ? 0 : 1; else return false;
    if (e.items.every(x => x.done || x.cancel)) { e.done = 1; e.doneAt = Date.now(); } });
  const it = i != null && e?.items[+i];
  if (it && it.done && !e.done) await logEvent(env, { k: 'ready', part: 1, t: e.t, by: who, text: `${it.q}× ${it.n}` }); // одна страва готова
  if (e?.done) await logEvent(env, { k: 'ready', t: e.t, by: who, text: e.items.filter(x => !x.cancel).map(x => `${x.q}× ${x.n}`).join(', '), mins: Math.round((e.doneAt - e.ts) / 60000) });
  return e;
}
export const kitchenStart = (env, id, who) => kqEdit(env, id, e => { if (e.done || e.start) return false; e.start = Date.now(); }).then(async e => { if (e) await logEvent(env, { k: 'cooking', t: e.t, by: who }); return e; });
export const kitchenUndo = (env, id) => kqEdit(env, id, e => { if (!e.done || Date.now() - e.doneAt > 30 * 60e3) return false; e.done = 0; delete e.doneAt; e.items.forEach(x => { x.done = 0; }); });
export async function kitchenMsg(env, id, text, who) {
  text = String(text || '').trim().slice(0, 120); if (!text) return null;
  const e = await kqEdit(env, id, e => { (e.msgs ||= []).push({ at: hhmm(), text }); });
  if (e) await logEvent(env, { k: 'kmsg', t: e.t, by: who, text });
  return e;
}
// скасування з рахунку → на кухні страва червона «СКАСОВАНО» (name=null — увесь стіл)
async function kitchenCancel(env, t, name) {
  const l = await getKq(env); let ch = false;
  for (let k = l.length - 1; k >= 0; k--) { const e = l[k]; if (e.t !== t || e.done) continue;
    for (const x of e.items) if (!x.cancel && (name == null || x.n === name)) { if (name != null && x.q > 1) { x.q--; x.canc = (x.canc || 0) + 1; } else x.cancel = 1; ch = true; if (name != null) break; }
    if (e.items.every(x => x.done || x.cancel)) { e.done = 1; e.doneAt = Date.now(); e.cancelled = 1; }
    if (ch && name != null) break; }
  if (ch) await putKq(env, l);
}
// ⏱ статистика кухні: час від замовлення до «готово»
export async function kitchenStats(env, from, to) {
  const days = dayList(from, to).slice(0, 400), ll = await env.DB.getMany(days.map(d => 'kq:' + d), 'json');
  return days.flatMap((d, i) => (ll[i] || []).filter(e => e.done && !e.cancelled && e.doneAt).map(e => ({ d, at: e.at, t: e.t, mins: (e.doneAt - e.ts) / 60000, items: e.items.filter(x => !x.cancel).map(x => [x.n, x.q]) })));
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
// коди реєстрації: адмін 1119, офіціант 1112 — ними не входять, а реєструються (імʼя + свій PIN)
export const REG_DEF = { admin: '1119', waiter: '1112', cook: '1113' };
export const regCode = async (env, role) => (await env.DB.get('reg_' + role)) || REG_DEF[role];
export async function regRole(env, code) { code = String(code || ''); for (const r of ['admin', 'waiter', 'cook']) if (code === await regCode(env, r)) return r; return null; }
export const getStaff = async env => (await env.DB.get('staff', 'json')) || [];
export async function addStaff(env, name, pin, role = 'waiter') {
  name = String(name || '').trim().slice(0, 30); pin = String(pin || '').trim();
  if (!name || !/^\d{4}$/.test(pin)) return { error: 'Потрібні імʼя і PIN з 4 цифр.' };
  const list = await getStaff(env), h = await pinHash(pin);
  if (list.some(s => s.pin === h)) return { error: 'Такий PIN уже є — оберіть інший.' };
  if (await regRole(env, pin)) return { error: 'Цей код — для реєстрації. Оберіть інший PIN.' };
  if (list.some(s => s.name.toLowerCase() === name.toLowerCase())) return { error: 'Працівник з таким імʼям уже є — додайте прізвище або букву.' };
  const s = { id: crypto.randomUUID().slice(0, 6), name, pin: h, role: ['admin', 'cook'].includes(role) ? role : 'waiter' };
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
  for (const prefix of ['day:', 'closed:', 'dish:', 'bill:', 'ord:', 'rl:', 'exp:', 'ev:', 'z:', 'shift', 'mov:', 'tipbal', 'tippay:', 'void:', 'kq:']) {
    const keys = (await env.DB.list({ prefix })).keys.map(k => k.name);
    await env.DB.deleteMany(keys); n += keys.length;
  }
  return n;
}
