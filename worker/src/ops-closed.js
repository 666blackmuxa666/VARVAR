// 🧾 Закриті рахунки: список, видалення/повернення, редагування, повторне відкриття, відновлення стола, передрук
// (частина ops.js — інші файли імпортують з ops.js, як і раніше)
import { cliTouch } from './delivery.js';
import { fisSafe } from './fiscal.js';
import { addTipBal, getVoids, splitTip, tipSplitOf } from './ops-bill.js';
import { L, addDishes, addStat, bump, cDay, dayKey, getBill, hhmm, logEvent, pct, putBill } from './ops-core.js';
import { queuePrint, receipt } from './print.js';
import { tn } from './tn.js';

// ---------- закриті рахунки ----------
export const getClosed = async (env, day = dayKey()) => (await env.DB.get('closed:' + day, 'json')) || [];
const findClosed = (list, ref) => list.find(e => e.id === ref) || (/^\d+$/.test(String(ref)) ? list[+ref] : null);
export async function closedRec(env, ref, day = dayKey()) { return findClosed(await getClosed(env, day), ref); }
// day — робочий день рахунку (можна виправляти й минулі дні: виручка/страви змінюються саме того дня)
async function _delClosed(env, ref, day = dayKey()) {
  const k = 'closed:' + day; const list = await getClosed(env, day);
  const x = findClosed(list, ref);
  if (!x || x.del || x.rm) return null;
  x.rm = 1; await env.DB.put(k, JSON.stringify(list)); // rm — прибраний з виручки (del — стіл видалений до закриття)
  await bump(env, 'day:' + day, d => { d.closed = Math.max(0, (d.closed || 0) - x.sum); d.tables = Math.max(0, (d.tables || 0) - 1);
    d.cash = Math.max(0, (d.cash || 0) - (x.cash ?? x.sum)); d.card = Math.max(0, (d.card || 0) - (x.card || 0)); if (x.onl) d.onl = Math.max(0, (d.onl || 0) - x.onl); d.orders = Math.max(0, (d.orders || 0) - (x.orders || 0));
    if (x.discSum) d.disc = Math.max(0, (d.disc || 0) - x.discSum); if (x.tip) d.tip = Math.max(0, (d.tip || 0) - x.tip); });
  if (x.dishes?.length) await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q: -q, sum: -sum })), day, { stock: false }); // страву віддали — продукти витрачені
  for (const [n, v] of Object.entries(tipSplitOf(x))) await addTipBal(env, n, -v);
  await cliUndo(env, x, -1); // 🎁 бонуси, кешбек, сертифікат — назад
  return x;
}
// 🎁 закритий чек прибрано (−1) / повернуто (+1): баланс бонусів гостя, кешбек, візити й залишок сертифіката
async function cliUndo(env, x, dir) {
  if (x.cli && (x.cb != null || x.used != null)) await cliTouch(env, x.cli, c => { const paid = (x.sum || 0) - (x.tip || 0); if (dir < 0) { c.bal = Math.max(0, (c.bal || 0) - (x.cb || 0) + (x.used || 0)); c.n = Math.max(0, (c.n || 0) - 1); c.sum = Math.max(0, (c.sum || 0) - paid); for (const [id, u] of Object.entries(x.nth || {})) if (c.nth?.[id]) c.nth[id] = Math.max(0, c.nth[id] - u); } else { c.bal = Math.max(0, (c.bal || 0) - (x.used || 0) + (x.cb || 0)); c.n = (c.n || 0) + 1; c.sum = (c.sum || 0) + paid; if (x.nth) { c.nth ||= {}; for (const [id, u] of Object.entries(x.nth)) c.nth[id] = (c.nth[id] || 0) + u; } } }).catch(() => {});
  if (x.cert?.code) { const { getCert } = await import('./site.js'), k = 'cert:' + x.cert.code; await L(env, k, async () => { const c = await getCert(env, x.cert.code); if (!c) return; c.left = Math.max(0, Math.min(c.sum, c.left + dir * -1 * x.cert.sum)); await env.DB.put(k, JSON.stringify(c)); }).catch(() => {}); }
}
// ✏️ редагування закритого чека адміном: позиції, знижка, чайові, оплата, офіціант, стіл — day:/dish:/tipbal/склад коригуються різницею
// p: { items?: [[назва, к-сть, сума]], disc?: %, tip?: грн, pay?: cash|card|mix, cash?: грн (для mix), w?: офіціант, t?: стіл }
async function _editClosed(env, ref, p, who, day = dayKey()) {
  const k = 'closed:' + day, list = await getClosed(env, day), x = findClosed(list, ref);
  if (!x) return { error: 'Чек не знайдено' };
  if (x.del || x.rm) return { error: 'Чек знято з виручки — спершу поверніть' };
  const sumS = l => l.reduce((a, d) => a + d[2], 0), old = { ...x, dishes: x.dishes || [] }, what = [];
  const oTip = x.tip || 0, oNet = x.sum - oTip, oCard = x.card || 0, oCash = x.cash ?? x.sum - oCard;
  const oGross = old.dishes.length ? sumS(old.dishes) : (x.gross ?? oNet + (x.discSum || 0));
  const other = Math.max(0, oGross - (x.discSum || 0) - oNet); // 🎁 бонуси / сертифікат — лишаються як були
  let dishes = old.dishes;
  if (Array.isArray(p.items)) {
    dishes = p.items.slice(0, 200).map(d => [String(d[0] || '').trim().slice(0, 80), Math.round(+d[1] || 0), Math.round(+d[2] || 0)]).filter(d => d[0] && d[1] > 0 && d[2] >= 0);
    if (!dishes.length) return { error: 'У чеку має лишитись хоч одна позиція (або видаліть чек з виручки)' };
  }
  const gross = dishes.length ? sumS(dishes) : oGross;
  const pct = p.disc != null ? Math.max(0, Math.min(100, Math.round(+p.disc || 0))) : (x.disc || 0);
  const discSum = !pct ? 0 : pct === (x.disc || 0) && gross === oGross && x.discSum != null ? x.discSum : Math.round(gross * pct / 100);
  const pS = x.promoSum || 0, pNew = pS && gross !== oGross && oGross ? Math.round(pS * gross / oGross) : pS; // 🎁 знижка рівня / акції — у відсотках, тож рахується від нових страв
  if (pNew !== pS) { x.promoSum = pNew; what.push(`акція ${pS}→${pNew}`); }
  const net = Math.max(0, gross - discSum - (other - Math.min(other, pS) + pNew));
  const tip = p.tip != null ? Math.max(0, Math.min(10000, Math.round(+p.tip || 0))) : oTip, sum = net + tip;
  const pay = ['cash', 'card', 'mix'].includes(p.pay) ? p.pay : oCard && oCash ? 'mix' : oCard ? 'card' : 'cash';
  const cash = pay === 'cash' ? sum : pay === 'card' ? 0 : Math.max(0, Math.min(sum, Math.round(p.cash != null ? +p.cash || 0 : oCash))), card = sum - cash;
  const w = p.w != null && String(p.w).trim() ? String(p.w).trim().slice(0, 40) : x.w || x.by || '';
  const t = p.t != null && +p.t > 0 && +p.t < 100000 ? Math.round(+p.t) : x.t;
  // що змінилось у стравах (для журналу, dish: і складу)
  const agg = l => { const m = new Map(); for (const [n, q, s] of l) { const a = m.get(n) || [0, 0]; m.set(n, [a[0] + q, a[1] + s]); } return m; };
  const A0 = agg(old.dishes), A1 = agg(dishes), dd = [];
  for (const n of new Set([...A0.keys(), ...A1.keys()])) { const a = A0.get(n) || [0, 0], b = A1.get(n) || [0, 0]; if (a[0] !== b[0] || a[1] !== b[1]) dd.push({ n, q: b[0] - a[0], sum: b[1] - a[1] }); }
  dd.forEach(d => what.push(d.q > 0 ? `+${d.q}× ${d.n}` : d.q < 0 ? `${d.q}× ${d.n}` : `${d.n}: сума ${d.sum > 0 ? '+' : ''}${d.sum}`));
  if (pct !== (x.disc || 0)) what.push(pct ? `знижка ${pct}%` : 'знижку прибрано');
  if (tip !== oTip) what.push(`чайові ${oTip} → ${tip}`);
  if (cash !== oCash || card !== oCard) what.push(pay === 'mix' ? `оплата: 💵 ${cash} + 💳 ${card}` : pay === 'card' ? 'оплата: 💳 картка' : 'оплата: 💵 готівка');
  if (w !== (x.w || x.by || '')) what.push(`офіціант: ${w}`);
  if (t !== x.t) what.push(`стіл ${x.t} → ${t}`);
  if (!what.length) return { x, what: [] };
  // чайові: перерахувати розподіл, якщо змінились сума чи офіціант
  const oSplit = tipSplitOf(x); let split = oSplit;
  if (tip !== oTip || w !== (x.w || x.by || '')) { const kt = Math.min(x.ktip || 0, tip); split = tip ? await splitTip(env, w, tip - kt, kt) : {}; }
  const oOnl = x.onl || 0, onl = Math.min(oOnl, card); /* 🌐 онлайн не може бути більшим за безготівку */
  Object.assign(x, { t, w, sum, cash, card, dishes }); if (onl) x.onl = onl; else delete x.onl;
  if (pct) Object.assign(x, { disc: pct, discSum, gross }); else { delete x.disc; delete x.discSum; delete x.gross; }
  if (tip) Object.assign(x, { tip, tipSplit: split }); else { delete x.tip; delete x.tipSplit; delete x.ktip; }
  if (x.ktip && x.ktip > tip) x.ktip = tip;
  (x.edits = x.edits || []).push({ at: hhmm(), ts: Date.now(), by: who || '', what: what.join(', ') });
  await env.DB.put(k, JSON.stringify(list));
  await bump(env, 'day:' + day, d => { d.closed = (d.closed || 0) + sum - old.sum; d.cash = (d.cash || 0) + cash - oCash; d.card = (d.card || 0) + card - oCard; if (onl !== oOnl) d.onl = Math.max(0, (d.onl || 0) + onl - oOnl);
    d.disc = Math.max(0, (d.disc || 0) + discSum - (old.discSum || 0)); d.tip = Math.max(0, (d.tip || 0) + tip - oTip); });
  if (dd.length) await addDishes(env, dd, day); // топ страв того дня + склад: додане списується, прибране повертається
  if (split !== oSplit) { for (const [n, v] of Object.entries(oSplit)) await addTipBal(env, n, -v); for (const [n, v] of Object.entries(split)) await addTipBal(env, n, v); }
  await logEvent(env, { k: 'shift', by: who, text: `✏️ Чек стола ${tn(x.t)} (${x.at}${day !== dayKey() ? ', ' + day : ''}): ${what.join(', ')} · було ${old.sum} → ${sum} грн` });
  return { x, what, was: old.sum };
}
// ↩️ повернути закритий рахунок у виручку (скасувати «видалити з виручки»)
async function _restoreClosed(env, ref, who, day = dayKey()) {
  const k = 'closed:' + day, list = await getClosed(env, day), x = findClosed(list, ref);
  if (!x || !x.rm || x.reopen || x.del) return null;
  delete x.rm; await env.DB.put(k, JSON.stringify(list));
  await bump(env, 'day:' + day, d => { d.closed = (d.closed || 0) + x.sum; d.tables = (d.tables || 0) + 1;
    d.cash = (d.cash || 0) + (x.cash ?? x.sum); d.card = (d.card || 0) + (x.card || 0); if (x.onl) d.onl = (d.onl || 0) + x.onl; d.orders = (d.orders || 0) + (x.orders || 0);
    if (x.discSum) d.disc = (d.disc || 0) + x.discSum; if (x.tip) d.tip = (d.tip || 0) + x.tip; });
  if (x.dishes?.length) await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q, sum })), day, { stock: false });
  for (const [n, v] of Object.entries(tipSplitOf(x))) await addTipBal(env, n, v);
  await cliUndo(env, x, 1);
  await logEvent(env, { k: 'shift', by: who, text: `↩️ Рахунок стола ${tn(x.t)} (${x.sum} грн${day !== dayKey() ? ', ' + day : ''}) повернуто у виручку` });
  return x;
}
// відновити страви на стіл (якщо стіл зайнятий — додаються до його рахунку)
async function _billBack(env, t, x, kind) {
  const lines = (x.dishes || []).map(([n, q, sum]) => `${q}× ${n} — ${sum}`); if (!lines.length) return false;
  const b = await getBill(env, t), sum = x.dishes.reduce((a, d) => a + d[2], 0);
  b.total = (b.total || 0) + sum; b.orders = (b.orders || 0) + 1; b.opened = b.opened || Date.now();
  b.log = [...(b.log || []), { at: hhmm(), kind, lines }].slice(-60);
  if (x.disc && !b.disc) { b.disc = x.disc; if (x.discSum != null && x.gross && x.discSum !== Math.round(x.gross * x.disc / 100)) b.discSum = x.discSum; } if (x.tip) b.tip = (b.tip || 0) + x.tip - (x.ktip || 0); if (x.ktip) b.ktip = (b.ktip || 0) + x.ktip; /* на зайнятий стіл — додаються, а не губляться */ if (x.voids?.length) b.voids = [...(b.voids || []), ...x.voids]; if (x.w && !b.waiter) b.waiter = x.w; if (x.cli && !b.cli) b.cli = x.cli; /* 🎁 гість — назад на рахунок: при повторному закритті візит, кешбек і рівень нараховуються знову */
  if (x.onl && x.lpo?.length) { const tp = Math.min(x.tip || 0, x.onl); b.paid = { sum: (b.paid?.sum || 0) + x.onl, net: (b.paid?.net || 0) + x.onl - tp, list: [...(b.paid?.list || []), ...x.lpo.map(p => ({ order: p.o, amt: p.a }))] }; b.check = true; b.pay = 'online'; } /* 💳 гість уже заплатив онлайн — при повторному закритті лише доплата */
  await putBill(env, t, b); return true;
}
// ↩️ відкрити закритий рахунок знову: знімається з виручки і повертається на стіл (щоб виправити й закрити заново)
async function _reopenClosed(env, ref, who, day = dayKey()) {
  const x0 = await closedRec(env, ref, day); if (!x0 || x0.del || x0.reopen || !x0.dishes?.length) return null;
  if (!x0.rm) await delClosed(env, ref, day);
  const k = 'closed:' + day, list = await getClosed(env, day), x = findClosed(list, ref);
  x.rm = 1; x.reopen = 1; await env.DB.put(k, JSON.stringify(list));
  if (x.orders) await bump(env, 'day:' + day, d => { d.orders = (d.orders || 0) + x.orders; }); // замовлення не скасовані — лише рахунок відкрито знову
  await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q, sum })), dayKey(), { stock: false }); // страви знову на столі — у продажі сьогоднішнього дня (закриють заново сьогодні) (продажі страв рахуються при замовленні, delClosed їх відняв)
  await billBack(env, x.t, x, `↩️ відкрито знову (${who})`);
  await logEvent(env, { k: 'shift', t: x.t, by: who, text: `↩️ Стіл ${tn(x.t)}: закритий рахунок відкрито знову (${x.sum} грн)` });
  return x;
}
// ↩️ відновити видалений стіл (сьогоднішній)
async function _restoreTable(env, ref, who, day = dayKey()) {
  const k = 'closed:' + day, list = await getClosed(env, day), x = findClosed(list, ref);
  if (!x || !x.del || x.restored || !(x.dishes?.length || x.voids?.length)) return null;
  if (!x.dishes?.length) { // стіл спорожнів через «−1» — повертаємо скасовані страви
    x.dishes = x.voids.map(v => [v.name, 1, v.sum]); x.sum = x.dishes.reduce((a, d) => a + d[2], 0); x.vback = 1;
    await L(env, 'void:' + day, async () => { const vl = await getVoids(env, day), ts = new Set(x.voids.map(v => v.ts)); await env.DB.put('void:' + day, JSON.stringify(vl.filter(v => !ts.has(v.ts)))); });
    delete x.voids;
  }
  x.restored = 1; await env.DB.put(k, JSON.stringify(list));
  await billBack(env, x.t, x, `↩️ відновлено (${who})`);
  await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q, sum }))); if (x.orders) await addStat(env, 'orders', x.orders); // знову на столі — знову в продажах
  const vk = 'void:' + day, vl = await getVoids(env, day); const vi = vl.findLastIndex(v => v.table && v.t === +x.t && v.sum === x.sum);
  if (vi >= 0) { vl.splice(vi, 1); await env.DB.put(vk, JSON.stringify(vl)); }
  await logEvent(env, { k: 'shift', t: x.t, by: who, text: `↩️ Стіл ${tn(x.t)} відновлено (${x.sum} грн)` });
  return x;
}
export async function reprintClosed(env, ref, who, day = dayKey()) {
  const x = await closedRec(env, ref, day);
  if (!x?.dishes?.length) return false;
  const bill = { total: x.gross || x.dishes.reduce((a, d) => a + (+d[2] || 0), 0) || (x.sum - (x.tip || 0)), /* сума страв до бонусів — щоб «сплачено» на копії = як у касі */ ...(x.promo ? { promo: { lines: x.promo, sum: x.promoSum || 0 } } : {}), ...(x.bonus ? { bonus: x.bonus } : {}), disc: x.disc, ...(x.discSum != null ? { discSum: x.discSum } : {}), tip: (x.tip || 0) - (x.ktip || 0), ktip: x.ktip, log: [{ lines: x.dishes.map(([n, q, sum]) => `${q}× ${n} — ${sum}`) }] };
  await queuePrint(env, 'receipt', await receipt(env, { table: x.t, bill, final: true, pay: x.card && x.cash ? 'mix' : x.onl ? 'online' : x.card ? 'card' : 'cash', by: who }));
  return true;
}
async function billBack(env, ...a) { return L(env, 'bills', () => _billBack(env, ...a)); }
export async function delClosed(env, ref, day) { day = cDay(day); const r = await L(env, 'closed:' + day, () => _delClosed(env, ref, day)); fisSafe(env, day, (r?.x || r)?.id || (typeof ref === 'string' && !/^\d+$/.test(ref) ? ref : '')); return r; }
export async function editClosed(env, ref, p, who, day) { day = cDay(day); const r = await L(env, 'closed:' + day, () => _editClosed(env, ref, p || {}, who, day)); fisSafe(env, day, (r?.x || r)?.id || (typeof ref === 'string' && !/^\d+$/.test(ref) ? ref : '')); return r; }
export async function restoreClosed(env, ref, who, day) { day = cDay(day); const r = await L(env, 'closed:' + day, () => _restoreClosed(env, ref, who, day)); fisSafe(env, day, (r?.x || r)?.id || (typeof ref === 'string' && !/^\d+$/.test(ref) ? ref : '')); return r; }
export async function reopenClosed(env, ref, who, day) { day = cDay(day); const r = await L(env, ['bills', 'closed:' + day], () => _reopenClosed(env, ref, who, day)); fisSafe(env, day, (r?.x || r)?.id || (typeof ref === 'string' && !/^\d+$/.test(ref) ? ref : '')); return r; }
export async function restoreTable(env, ref, who, day) { day = cDay(day); const r = await L(env, ['bills', 'closed:' + day, 'void:' + day], () => _restoreTable(env, ref, who, day)); fisSafe(env, day, (r?.x || r)?.id || (typeof ref === 'string' && !/^\d+$/.test(ref) ? ref : '')); return r; }
