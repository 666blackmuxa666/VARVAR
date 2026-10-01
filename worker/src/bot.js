// Telegram-бот закладу: режим офіціанта (столи, закриття, стоп-лист) і режим адміністратора
// за паролем (звіти, видалення столів, меню, Wi‑Fi, пароль).
import { getMenu, handleMenuText, handleMenuPhoto, HELP as MENU_HELP } from './menu.js';
import { parseWaiterOrder, draftText } from './waiter.js';
import { tablePick, catsView, obCallback, getOb, putOb } from './orderui.js';
import { queuePrint, kitchenTicket, receipt, printStatus } from './print.js';

export const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const TZ = 'Europe/Kyiv';
export const hhmm = (t = Date.now()) => new Date(t).toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD
const money = n => `${Math.round(n).toLocaleString('uk-UA')} грн`;
const YEAR = 400 * 86400, ADMIN_TTL = 12 * 3600;

// ---------- клавіатури ----------
const W = { order: '➕ Замовлення', tables: '📋 Столи', close: '🧾 Закрити стіл', stop: '⛔ Стоп-лист', help: '❓ Допомога', admin: '🔐 Адмін' };
const A = { cash: '💰 Каса', expense: '💸 Витрата', reports: '📊 Звіти', closed: '📜 Закриті сьогодні', top: '🏆 Топ страв', del: '🗑 Видалити стіл', menu: '📖 Редагувати меню', wifi: '📶 Wi‑Fi', pass: '🔑 Змінити пароль', waiter: '⬅️ Режим офіціанта', logout: '🚪 Вийти',
  delClosed: '🧹 Видалити закритий', reset: '♻️ Обнулити все' }; // ТЕСТ: delClosed і reset прибрати перед запуском
const kb = rows => ({ keyboard: rows.map(r => r.map(text => ({ text }))), resize_keyboard: true, is_persistent: true });
export const KEYBOARD = kb([[W.order], [W.tables, W.close], [W.stop, W.help], [W.admin]]);
const ADMIN_KB = kb([[W.order], [A.cash, A.expense], [A.reports, A.closed], [A.top, A.del], [W.tables, W.stop], [A.menu, A.wifi], [A.delClosed, A.reset], [A.pass, A.waiter, A.logout]]);

export const COMMANDS = [
  ['tables', 'Відкриті столи і рахунки'], ['table', 'Деталі столу: /table 5'], ['close', 'Закрити рахунок столу'],
  ['stoplist', 'Стоп-лист (чого немає)'], ['admin', 'Режим адміністратора (пароль)'], ['help', 'Допомога'],
].map(([command, description]) => ({ command, description }));

const HELP = `<b>VARVAR — бот закладу</b>

${W.order} — записати замовлення кнопками: стіл → категорія → страва → кількість
${W.tables} — відкриті столи і суми
${W.close} — закрити рахунок (гість розрахувався)
${W.stop} — чого немає / повернути в меню
${W.admin} — режим адміністратора (за паролем)
<code>принтер</code> — стан принтера і тестовий друк

<b>Записати замовлення за стіл</b> — просто напишіть:
<code>1
гранд 2
мумо 3
пепсі 0.5 4</code>
Перший рядок — номер столу, далі «страва кількість». Помилки в назвах — не страшно, бот покаже, що зрозумів, і попросить підтвердити.

<b>Текстом:</b> <code>стіл 5</code> · <code>закрити 5</code> · <code>стоп мєско</code> · <code>повернути мєско</code>

<b>Під кожним замовленням:</b>
✅ Прийняв — гість побачить, що замовлення прийняте
🧾 Закрити стіл — коли гість розрахувався`;

const ADMIN_HELP = `🔐 <b>Режим адміністратора</b>

${A.cash} — каса на сьогодні: розмін + готівка − витрати = має бути в касі
${A.expense} — записати витрату (покупки), з каси або з карти
${A.reports} — виручка (💵/💳), витрати, чистими: сьогодні … минулий місяць
${A.closed} — усі закриті й видалені рахунки за день
${A.top} — що найбільше замовляють цього місяця
${A.del} — прибрати помилковий/тестовий стіл (не йде у виручку)
${A.menu} — ціни, склад, нові страви, фото
${A.wifi} — мережі закладу для замовлень
${A.delClosed} — прибрати закритий рахунок з виручки (тест)
${A.reset} — стерти всю статистику й столи (тест)
${A.pass} — новий пароль адміністратора
${A.waiter} — звичайні кнопки (вхід зберігається)
${A.logout} — вийти з режиму адміністратора

Вхід діє 12 годин, потім пароль треба ввести знову.`;

// ---------- дані ----------
export const getBill = async (env, t) => (await env.DB.get('bill:' + t, 'json')) || { total: 0, orders: 0, log: [] };
async function openTables(env) {
  const keys = (await env.DB.list({ prefix: 'bill:' })).keys;
  const rows = await Promise.all(keys.map(async k => ({ t: +k.name.slice(5), b: await env.DB.get(k.name, 'json') })));
  return rows.filter(r => r.b && r.b.total > 0).sort((a, b) => a.t - b.t);
}
async function bump(env, key, fn) { const d = (await env.DB.get(key, 'json')) || {}; fn(d); await env.DB.put(key, JSON.stringify(d), { expirationTtl: YEAR }); }
export const addStat = (env, field, n) => bump(env, 'day:' + dayKey(), d => { d[field] = (d[field] || 0) + n; });
// продажі страв за місяць: { назва: [кількість, сума] }
export const addDishes = (env, items) => bump(env, 'dish:' + dayKey().slice(0, 7), d => { for (const { n, q, sum } of items) { const x = d[n] || [0, 0]; d[n] = [x[0] + q, x[1] + sum]; } });
async function logClosed(env, rec) {
  const k = 'closed:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  list.push(rec); await env.DB.put(k, JSON.stringify(list.slice(-300)), { expirationTtl: YEAR });
}
// pay: 'cash' | 'card'
async function closeTable(env, t, who, pay = 'cash', print = true) {
  const bill = await getBill(env, t);
  if (!bill.total) return `Стіл ${t} вже закритий.`;
  const card = pay === 'card' ? bill.total : 0, cash = bill.total - card;
  if (print) await queuePrint(env, 'receipt', await receipt(env, { table: t, bill, final: true, pay, by: who })); // фінальний чек
  await env.DB.delete('bill:' + t);
  await bump(env, 'day:' + dayKey(), d => { d.closed = (d.closed || 0) + bill.total; d.tables = (d.tables || 0) + 1; d.cash = (d.cash || 0) + cash; d.card = (d.card || 0) + card; });
  // страви рахунку — щоб при видаленні закритого рахунку відняти їх і з «топ страв»
  const dishes = []; for (const o of bill.log || []) for (const l of o.lines) { const x = l.match(LINE); if (x) dishes.push([x[2], +x[1], +x[3]]); }
  await logClosed(env, { id: crypto.randomUUID().slice(0, 8), t, sum: bill.total, cash, card, at: hhmm(), by: who || '', orders: bill.orders || 0, dishes });
  return `✅ <b>Стіл ${t} закрито</b> — ${money(bill.total)} · ${payLabel(cash, card)}${who ? `\n${esc(who)}, ${hhmm()}` : ''}`;
}
const payLabel = (cash, card) => card ? '💳 карта' : '💵 готівка';
const PAY_PICK = { cash: '💵 готівка', card: '💳 карта' };
const payButtons = t => ({ inline_keyboard: [[{ text: '💵 Готівка + 🖨 чек', callback_data: `clsok:${t}:cash` }, { text: '💳 Карта + 🖨 чек', callback_data: `clsok:${t}:card` }],
  [{ text: '💵 Готівка, без чека', callback_data: `clsok:${t}:cash:np` }, { text: '💳 Карта, без чека', callback_data: `clsok:${t}:card:np` }], [{ text: '🖨 Пречек', callback_data: 'pre:' + t }, { text: 'Скасувати', callback_data: 'no' }]] });
async function closeAsk(env, t) {
  const b = await getBill(env, t);
  if (!b.total) return { text: `Стіл ${t} вже закритий.` };
  return { text: `🧾 Закрити <b>стіл ${t}</b> на <b>${money(b.total)}</b>?${b.pay ? `\nГість хоче платити: ${PAY_PICK[b.pay]}` : ''}\n\nЯк оплатили?`, markup: payButtons(t) };
}

// ---------- фінанси: витрати, розмін, каса ----------
const getExp = async (env, day = dayKey()) => (await env.DB.get('exp:' + day, 'json')) || [];
async function addExpense(env, e) { const k = 'exp:' + dayKey(); const l = await getExp(env); l.push(e); await env.DB.put(k, JSON.stringify(l), { expirationTtl: YEAR }); }
async function cashView(env) {
  const d = (await env.DB.get('day:' + dayKey(), 'json')) || {};
  const ex = (await getExp(env)).filter(e => !e.del);
  const exCash = ex.filter(e => e.src === 'cash').reduce((s, e) => s + e.sum, 0), exCard = ex.filter(e => e.src === 'card').reduce((s, e) => s + e.sum, 0);
  const float = d.float || 0, cash = d.cash || 0, card = d.card || 0;
  const open = (await openTables(env)).reduce((s, r) => s + r.b.total, 0);
  return {
    text: [`💰 <b>Каса за ${dayKey()}</b>`, '',
      `Розмін на початок: ${money(float)}`, `+ 💵 Готівка від гостей: ${money(cash)}`, `− 💸 Витрати готівкою: ${money(exCash)}`,
      `= <b>Має бути в касі: ${money(float + cash - exCash)}</b>`, '',
      `💳 Карта: ${money(card)}${exCard ? ` · витрати з карти: ${money(exCard)}` : ''}`,
      `📈 Виручка за день: <b>${money(cash + card)}</b> · витрати: ${money(exCash + exCard)} · чистими: <b>${money(cash + card - exCash - exCard)}</b>`,
      open ? `\n⏳ Ще відкрито в залі: ${money(open)} (не враховано)` : ''].filter(x => x !== '').join('\n'),
    markup: { inline_keyboard: [[{ text: '🏦 Вказати розмін', callback_data: 'float' }, { text: '💸 Витрати сьогодні', callback_data: 'exlist' }]] },
  };
}
async function expListView(env) {
  const l = await getExp(env);
  if (!l.length) return { text: '💸 Сьогодні витрат немає.\n\nЩоб додати — кнопка «💸 Витрата».' };
  const ok = l.filter(e => !e.del);
  return {
    text: `💸 <b>Витрати за ${dayKey()}</b>\n` + l.map(e => `${e.del ? '🗑 <s>' : ''}${e.at} · ${money(e.sum)} · ${e.src === 'card' ? '💳' : '💵'} ${esc(e.note || '')}${e.by ? ` · ${esc(e.by)}` : ''}${e.del ? '</s>' : ''}`).join('\n') +
      `\n\nРазом: <b>${money(ok.reduce((s, e) => s + e.sum, 0))}</b>`,
    markup: ok.length ? { inline_keyboard: chunk(l.map((e, i) => ({ e, i })).filter(x => !x.e.del).map(({ e, i }) => ({ text: `🗑 ${e.sum} ${e.note || ''}`.slice(0, 40), callback_data: 'exdel:' + i })), 2) } : undefined,
  };
}
async function deleteTable(env, t, who) {
  const bill = await getBill(env, t);
  if (!bill.total) return `Стіл ${t} вже порожній.`;
  await env.DB.delete('bill:' + t);
  await logClosed(env, { t, sum: bill.total, at: hhmm(), by: who || '', del: 1 });
  return `🗑 <b>Стіл ${t} видалено</b> (${money(bill.total)}) — у виручку не піде.`;
}

// замовлення від офіціанта → до рахунку столу (як замовлення гостя з сайту)
async function addWaiterOrder(env, d, who, comment = '') {
  const ok = d.items.filter(i => !i.hidden);
  if (!ok.length) return null;
  const lines = ok.map(i => `${i.q}× ${i.name} — ${i.price * i.q}`), sum = ok.reduce((s, i) => s + i.price * i.q, 0);
  const bill = await getBill(env, d.table);
  bill.total += sum; bill.orders++; bill.opened = bill.opened || Date.now();
  bill.log = [...(bill.log || []), { at: hhmm(), kind: `від офіціанта (${who})`, lines, ...(comment ? { comment } : {}) }].slice(-40);
  await env.DB.put('bill:' + d.table, JSON.stringify(bill), { expirationTtl: 12 * 3600 });
  await addStat(env, 'orders', 1);
  await addDishes(env, ok.map(i => ({ n: i.name, q: i.q, sum: i.price * i.q })));
  await queuePrint(env, 'kitchen', kitchenTicket({ table: d.table, kind: 'ВІД ОФІЦІАНТА', lines, comment, by: who }));
  return { sum, total: bill.total, lines };
}

// ---------- ТЕСТ: видалення закритих рахунків і повне обнулення (прибрати перед запуском) ----------
async function delClosedPicker(env) {
  const list = (await env.DB.get('closed:' + dayKey(), 'json')) || [];
  const ok = list.map((x, i) => ({ ...x, i })).filter(x => !x.del && !x.rm);
  if (!ok.length) return { text: '🧹 Сьогодні закритих рахунків немає.' };
  return { text: '🧹 Який закритий рахунок видалити? (сума відніметься з виручки)', markup: { inline_keyboard: chunk(ok.map(x => ({ text: `${x.at} · стіл ${x.t} · ${x.sum}`, callback_data: 'dc:' + (x.id || x.i) })), 1) } };
}
async function delClosed(env, ref) {
  const k = 'closed:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  const x = list.find(e => e.id === ref) || (/^\d+$/.test(ref) ? list[+ref] : null);
  if (!x || x.del || x.rm) return 'Цей рахунок уже видалено.';
  x.rm = 1; await env.DB.put(k, JSON.stringify(list), { expirationTtl: YEAR }); // rm — прибраний з виручки (del — стіл видалений до закриття)
  await bump(env, 'day:' + dayKey(), d => { d.closed = Math.max(0, (d.closed || 0) - x.sum); d.tables = Math.max(0, (d.tables || 0) - 1);
    d.cash = Math.max(0, (d.cash || 0) - (x.cash ?? x.sum)); d.card = Math.max(0, (d.card || 0) - (x.card || 0)); d.orders = Math.max(0, (d.orders || 0) - (x.orders || 0)); });
  if (x.dishes?.length) await addDishes(env, x.dishes.map(([n, q, sum]) => ({ n, q: -q, sum: -sum })));
  return `🧹 Рахунок стола ${x.t} (${money(x.sum)}, ${x.at}) видалено з виручки.`;
}
async function resetAll(env) {
  let n = 0;
  for (const prefix of ['day:', 'closed:', 'dish:', 'bill:', 'ord:', 'rl:', 'exp:']) {
    const keys = (await env.DB.list({ prefix })).keys.map(k => k.name);
    await env.DB.deleteMany(keys); n += keys.length;
  }
  return `♻️ <b>Усе обнулено</b> (${n} записів): звіти, каса, витрати, закриті рахунки, топ страв, відкриті столи.
Меню, Wi‑Fi і пароль не чіпались.`;
}

// ---------- адміністратор ----------
// усі повідомлення адмін-сесії (свої і бота) — щоб стерти їх з чату при виході
async function remember(env, uid, chat, ids) {
  const k = 'admmsg:' + uid; const d = (await env.DB.get(k, 'json')) || { chat, ids: [] };
  d.chat = chat; d.ids = [...d.ids, ...ids.filter(Boolean)].slice(-1000);
  await env.DB.put(k, JSON.stringify(d), { expirationTtl: 2 * 86400 });
}
async function purgeAdminChat(env, uid) {
  const d = await env.DB.get('admmsg:' + uid, 'json'); await env.DB.delete('admmsg:' + uid);
  if (!d?.ids?.length) return;
  const ids = [...new Set(d.ids)];
  for (let i = 0; i < ids.length; i += 100) await tg(env, 'deleteMessages', { chat_id: d.chat, message_ids: ids.slice(i, i + 100) });
}
const msgId = async r => { try { return (await r.json()).result?.message_id; } catch { return null; } };
const isAdmin = async (env, uid) => !!uid && !!(await env.DB.get('adm:' + uid));
const adminPass = async env => (await env.DB.get('admin_pass')) || env.ADMIN_PIN || '';

// ---------- екрани ----------
async function tablesView(env) {
  const rows = await openTables(env);
  if (!rows.length) return { text: '📋 Відкритих столів немає' };
  const sum = rows.reduce((s, r) => s + r.b.total, 0);
  return {
    text: `📋 <b>Відкриті столи</b>\n` + rows.map(r => `🪑 Стіл ${r.t} — <b>${money(r.b.total)}</b> · замовлень: ${r.b.orders}${r.b.opened ? ` · з ${hhmm(r.b.opened)}` : ''}${r.b.check ? ' · 🧾 чек' : ''}`).join('\n') + `\n\nРазом у залі: <b>${money(sum)}</b>`,
    markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${r.t}`, callback_data: 'tbl:' + r.t })), 4) },
  };
}
async function tableView(env, t) {
  const b = await getBill(env, t);
  if (!b.total) return { text: `🪑 Стіл ${t}: відкритого рахунку немає` };
  const log = (b.log || []).map(o => `<b>${o.at}</b> ${o.kind}\n${o.lines.map(esc).join('\n')}${o.comment ? `\n💬 ${esc(o.comment)}` : ''}`).join('\n\n');
  return {
    text: `🪑 <b>Стіл ${t}</b> — ${money(b.total)}${b.check ? ' · 🧾 просять чек' : ''}\n\n${log || '(деталі недоступні)'}`,
    markup: { inline_keyboard: [[{ text: '🖨 Пречек', callback_data: 'pre:' + t }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + t }], [{ text: '➕ Дозамовити', callback_data: 'o:t:' + t }, { text: '✏️ Редагувати чек', callback_data: 'ed:' + t }]] },
  };
}
// редагування рахунку: позиції зведені по назві, «➖» прибирає 1 шт (з останнього замовлення, де вона є)
const LINE = /^(\d+)× (.+?) — (\d+)$/;
function billItems(b) {
  const m = new Map();
  for (const o of b.log || []) for (const l of o.lines) { const x = l.match(LINE); if (!x) continue; const a = m.get(x[2]) || { q: 0, sum: 0 }; a.q += +x[1]; a.sum += +x[3]; m.set(x[2], a); }
  return [...m].map(([name, a]) => ({ name, ...a }));
}
async function editView(env, t, note = '') {
  const b = await getBill(env, t);
  if (!b.total) return { text: `🪑 Стіл ${t}: відкритого рахунку немає${note ? '\n\n' + note : ''}` };
  const items = billItems(b);
  return {
    text: `✏️ <b>Стіл ${t}</b> — ${money(b.total)}\nНатисніть позицію, щоб прибрати 1 шт.${note ? '\n\n' + note : ''}`,
    markup: { inline_keyboard: [...items.map((it, i) => [{ text: `➖ ${it.name} · ${it.q} шт · ${it.sum}`, callback_data: `rm:${t}:${i}` }]), [{ text: '✅ Готово', callback_data: 'tbl:' + t }]] },
  };
}
async function removeOne(env, t, idx) {
  const b = await getBill(env, t); const it = billItems(b)[idx];
  if (!it) return '';
  for (let i = (b.log || []).length - 1; i >= 0; i--) {
    const o = b.log[i]; const j = o.lines.findIndex(l => (l.match(LINE) || [])[2] === it.name);
    if (j < 0) continue;
    const [, q, , sum] = o.lines[j].match(LINE); const unit = Math.round(+sum / +q);
    if (+q > 1) o.lines[j] = `${+q - 1}× ${it.name} — ${+sum - unit}`; else o.lines.splice(j, 1);
    if (!o.lines.length) b.log.splice(i, 1);
    b.total = Math.max(0, b.total - unit);
    if (b.total) await env.DB.put('bill:' + t, JSON.stringify(b), { expirationTtl: 12 * 3600 }); else await env.DB.delete('bill:' + t);
    await addDishes(env, [{ n: it.name, q: -1, sum: -unit }]);
    return `🗑 Прибрано: 1× ${esc(it.name)} (−${unit} грн)`;
  }
  return '';
}
async function pickTable(env, title, act) {
  const rows = await openTables(env);
  if (!rows.length) return { text: 'Відкритих столів немає' };
  return { text: title, markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${r.t} · ${r.b.total}`, callback_data: `${act}:${r.t}` })), 2) } };
}
async function sumDays(env, keys) {
  const days = await env.DB.getMany(keys.map(k => 'day:' + k), 'json'), exps = await env.DB.getMany(keys.map(k => 'exp:' + k), 'json');
  const ds = keys.map((_, i) => [days[i] || {}, exps[i] || []]);
  return ds.reduce((a, [d, ex]) => {
    const e = ex.filter(x => !x.del).reduce((s, x) => s + x.sum, 0);
    return { closed: a.closed + (d.closed || 0), tables: a.tables + (d.tables || 0), orders: a.orders + (d.orders || 0),
      cash: a.cash + (d.cash ?? d.closed ?? 0), card: a.card + (d.card || 0), exp: a.exp + e };
  }, { closed: 0, tables: 0, orders: 0, cash: 0, card: 0, exp: 0 });
}
const daysOfMonth = (ym, upto) => [...Array(upto)].map((_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
async function reportsView(env) {
  const now = Date.now(), today = dayKey(), ym = today.slice(0, 7);
  const [y, mo] = ym.split('-').map(Number);
  const prevYm = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  const prevLen = new Date(y, mo - 1, 0).getDate();
  const [d0, d1, wk, mon, prev] = await Promise.all([
    sumDays(env, [today]), sumDays(env, [dayKey(now - 86400e3)]), sumDays(env, [...Array(7)].map((_, i) => dayKey(now - i * 86400e3))),
    sumDays(env, daysOfMonth(ym, +today.slice(8))), sumDays(env, daysOfMonth(prevYm, prevLen)),
  ]);
  const open = (await openTables(env)).reduce((s, r) => s + r.b.total, 0);
  const mname = t => new Date(t).toLocaleDateString('uk-UA', { timeZone: TZ, month: 'long' });
  const line = (label, d) => `<b>${label}:</b> ${money(d.closed)} (💵 ${money(d.cash)} · 💳 ${money(d.card)})\n   витрати ${money(d.exp)} · <b>чистими ${money(d.closed - d.exp)}</b> · столів ${d.tables}${d.tables ? ` · сер. чек ${money(d.closed / d.tables)}` : ''}`;
  return { text: [`📊 <b>Звіти</b>`, line('Сьогодні', d0), `У залі ще відкрито: <b>${money(open)}</b>`, '', line('Вчора', d1), line('7 днів', wk),
    line(`Місяць (${mname(now)})`, mon), line(`Минулий місяць (${mname(new Date(y, mo - 2, 15))})`, prev), '',
    `<i>Виручка — закриті рахунки. Чистими = виручка − витрати.</i>`].join('\n') };
}
async function closedView(env, day = dayKey()) {
  const list = (await env.DB.get('closed:' + day, 'json')) || [];
  if (!list.length) return { text: `📜 За ${day} закритих рахунків ще немає.` };
  const ok = list.filter(x => !(x.del || x.rm)), sum = ok.reduce((s, x) => s + x.sum, 0);
  const btns = list.map((x, k) => ({ x, k })).filter(({ x }) => !(x.del || x.rm)).map(({ x, k }) => ({ text: `🧾 ${x.at} · стіл ${x.t} · ${x.sum}`, callback_data: 'cv:' + (x.id || k) }));
  return { markup: btns.length ? { inline_keyboard: chunk(btns, 1) } : undefined, text: `📜 <b>Закриті рахунки за ${day}</b>\n` + list.map(x => `${(x.del || x.rm) ? '🗑' : '✅'} ${x.at} · стіл ${x.t} · ${money(x.sum)}${(x.del || x.rm) ? '' : ' · ' + payLabel(x.cash ?? x.sum, x.card || 0)}${x.by ? ` · ${esc(x.by)}` : ''}${(x.del || x.rm) ? ' (видалено)' : ''}`).join('\n') + `\n\nРазом: <b>${money(sum)}</b> · рахунків ${ok.length}\n💵 ${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))} · 💳 ${money(ok.reduce((s, x) => s + (x.card || 0), 0))}` };
}
// один закритий рахунок: що було, повторний друк чека, видалення з виручки
async function closedOne(env, ref) {
  const list = (await env.DB.get('closed:' + dayKey(), 'json')) || [];
  const x = list.find(e => e.id === ref) || (/^\d+$/.test(ref) ? list[+ref] : null);
  if (!x) return { text: 'Рахунок не знайдено.' };
  const lines = (x.dishes || []).map(([n, q, sum]) => `${q}× ${n} — ${sum}`);
  const gone = x.del || x.rm;
  return {
    text: `🧾 <b>Стіл ${x.t}</b> · закрито о ${x.at}${x.by ? ` · ${esc(x.by)}` : ''}\n\n${lines.length ? lines.map(esc).join('\n') : '<i>(перелік страв не збережено — рахунок закрито до оновлення)</i>'}\n\nРазом: <b>${money(x.sum)}</b> · ${payLabel(x.cash ?? x.sum, x.card || 0)}${gone ? '\n\n🗑 Видалено з виручки' : ''}`,
    markup: { inline_keyboard: [[...(lines.length ? [{ text: '🖨 Друкувати чек', callback_data: 'cvp:' + ref }] : []), ...(gone ? [] : [{ text: '🗑 Видалити з виручки', callback_data: 'dc:' + ref }])], [{ text: '⬅️ Назад', callback_data: 'cvb' }]] },
  };
}
async function reprintClosed(env, ref, who) {
  const list = (await env.DB.get('closed:' + dayKey(), 'json')) || [];
  const x = list.find(e => e.id === ref) || (/^\d+$/.test(ref) ? list[+ref] : null);
  if (!x?.dishes?.length) return false;
  const bill = { total: x.sum, log: [{ lines: x.dishes.map(([n, q, sum]) => `${q}× ${n} — ${sum}`) }] };
  await queuePrint(env, 'receipt', await receipt(env, { table: x.t, bill, final: true, pay: x.card ? 'card' : 'cash', by: who }));
  return true;
}
async function topView(env) {
  const ym = dayKey().slice(0, 7); const d = (await env.DB.get('dish:' + ym, 'json')) || {};
  const rows = Object.entries(d).sort((a, b) => b[1][0] - a[1][0]).slice(0, 20);
  if (!rows.length) return { text: '🏆 Цього місяця ще немає продажів.' };
  return { text: `🏆 <b>Топ страв за ${new Date().toLocaleDateString('uk-UA', { timeZone: TZ, month: 'long' })}</b>\n` + rows.map(([n, [q, s]], i) => `${i + 1}. ${esc(n)} — ${q} шт · ${money(s)}`).join('\n') };
}
async function stopView(env) {
  const menu = await getMenu(env);
  const hidden = menu.categories.flatMap(c => c.items.filter(i => i.hidden));
  if (!hidden.length) return { text: '⛔ Стоп-лист порожній — все є в меню.\n\nЩоб додати: <code>стоп мєско</code>' };
  return {
    text: `⛔ <b>Стоп-лист</b> (не показується гостям):\n` + hidden.map(i => '• ' + esc(i.name.uk)).join('\n') + '\n\nНатисніть, щоб повернути в меню:',
    markup: { inline_keyboard: chunk(hidden.map(i => ({ text: '✅ ' + i.name.uk, callback_data: 'back:' + i.id })), 2) },
  };
}
async function wifiView(env) {
  const list = (await env.DB.get('venue_ips', 'json')) || [];
  return {
    text: `📶 <b>Мережі закладу</b> (звідси приймаються замовлення):\n` + (list.length ? list.map(x => `• ${x.k} — додано ${new Date(x.at).toLocaleDateString('uk-UA', { timeZone: TZ })}`).join('\n') : 'немає — замовлення не прийматимуться!') +
      `\n\nДодати мережу: з телефону в Wi‑Fi закладу відкрийте ${(env.SITE_URL || '') + 'admin.html'} → PIN → «Це наша мережа».`,
    markup: list.length ? { inline_keyboard: [[{ text: '🗑 Скинути всі мережі', callback_data: 'wifiask' }]] } : undefined,
  };
}
const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);

const TEST_PRINT = () => [['logo'], ['big', 'ТЕСТ ДРУКУ'], ['c', 'VARVAR · ' + hhmm()], ['hr'], ['l', 'Українські літери: Іі Її Єє Ґґ'], ['lr', '2 × Мєско', '760'], ['lr2', 'Всього', '760 грн'], ['hr'], ['gap']];

// ---------- повідомлення ----------
export async function handleUpdate(u, env) {
  if (u.callback_query) return handleCallback(u.callback_query, env);
  const m = u.message; if (!m) return;
  const uid = m.from?.id, chat = m.chat.id, who = m.from?.first_name || '';
  const staff = String(chat) === String(env.CHAT_ID);
  const admin = await isAdmin(env, uid);
  // вхід закінчився сам (12 год) — прибираємо, що лишилось від сесії
  if (!admin && uid && await env.DB.get('admmsg:' + uid) && await env.DB.get('st:' + uid) !== 'login') await purgeAdminChat(env, uid);
  let track = admin; // повідомлення цієї взаємодії належать адмін-сесії
  const waiterView = admin && !!(await env.DB.get('kbw:' + uid)); // адмін перемкнувся на кнопки офіціанта
  const send = async (v, keyboard) => {
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: v.markup || keyboard || (admin && !waiterView ? ADMIN_KB : KEYBOARD) });
    if (track) await remember(env, uid, chat, [m.message_id, await msgId(r)]);
    return r;
  };
  const text = (m.text || '').trim(), low = text.toLowerCase().replace(/@\S+/, '');

  // очікуємо пароль (вхід) або новий пароль (зміна)
  const state = uid && await env.DB.get('st:' + uid);
  if (state && text && !text.startsWith('/') && !Object.values(W).concat(Object.values(A)).includes(text)) {
    await env.DB.delete('st:' + uid);
    if (state === 'login' || state === 'newpass') await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id }); // прибираємо пароль з чату
    if (state === 'login') {
      const fails = +(await env.DB.get('fail:' + uid) || 0);
      if (fails >= 5) return send({ text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' });
      if (text.toLowerCase() !== (await adminPass(env)).toLowerCase()) {
        await env.DB.put('fail:' + uid, String(fails + 1), { expirationTtl: 900 });
        return send({ text: `❌ Невірний пароль (спроба ${fails + 1} з 5). Натисніть «${W.admin}», щоб спробувати ще.` }, KEYBOARD);
      }
      await env.DB.delete('fail:' + uid);
      await env.DB.put('adm:' + uid, JSON.stringify({ name: who, at: Date.now() }), { expirationTtl: ADMIN_TTL });
      track = true;
      return send({ text: `✅ Вітаю, ${esc(who)}! Ви в режимі адміністратора.\n\n` + ADMIN_HELP }, ADMIN_KB);
    }
    if (state === 'ocom') { // коментар до замовлення кнопками → оновлюємо те саме повідомлення
      const ob = await getOb(env, uid); await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id });
      if (!ob) return send({ text: '⌛ Замовлення застаріло. Почніть заново: «➕ Замовлення».' });
      ob.com = text.slice(0, 200); await putOb(env, uid, ob);
      const v = await catsView(env, ob);
      return tg(env, 'editMessageText', { chat_id: ob.chat, message_id: ob.mid, text: v.text, parse_mode: 'HTML', reply_markup: v.markup });
    }
    const num = parseFloat(text.replace(',', '.').replace(/\s/g, ''));
    if (state === 'float' && admin) {
      if (!(num >= 0)) return send({ text: 'Потрібне число. Натисніть «🏦 Вказати розмін» ще раз.' });
      await bump(env, 'day:' + dayKey(), d => { d.float = Math.round(num); });
      return send(await cashView(env));
    }
    if (state === 'exp' && admin) {
      const em = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:грн)?\s*[-–—:,]?\s*(.*)$/i) || text.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(?:грн)?$/i);
      if (!em) return send({ text: 'Формат: <code>450 овочі на ринку</code>. Натисніть «💸 Витрата» ще раз.' });
      const [sumS, note] = /^\d/.test(em[1]) ? [em[1], em[2]] : [em[2], em[1]];
      const sum = Math.round(parseFloat(sumS.replace(',', '.')));
      const eid = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      await env.DB.put('expd:' + eid, JSON.stringify({ sum, note: note.trim().slice(0, 100) }), { expirationTtl: 3600 });
      return send({ text: `💸 Витрата <b>${money(sum)}</b>${note.trim() ? ` — ${esc(note.trim())}` : ''}\nЗвідки гроші?`,
        markup: { inline_keyboard: [[{ text: '💵 З каси (готівка)', callback_data: `exs:${eid}:cash` }, { text: '💳 З карти', callback_data: `exs:${eid}:card` }], [{ text: 'Скасувати', callback_data: 'no' }]] } });
    }
    if (state === 'newpass' && admin) {
      if (text.length < 4) return send({ text: 'Пароль закороткий (мінімум 4 символи). Натисніть «🔑 Змінити пароль» ще раз.' });
      await env.DB.put('admin_pass', text);
      return send({ text: '🔑 Пароль змінено. Повідомлення з паролем видалено з чату.' });
    }
  }

  // вхід в адмін-режим доступний з будь-якого чату (напр. особисто з ботом)
  if (low === '/admin' || text === W.admin) {
    if (admin) { await env.DB.delete('kbw:' + uid); return send({ text: ADMIN_HELP }, ADMIN_KB); }
    await env.DB.put('st:' + uid, 'login', { expirationTtl: 300 });
    track = true; // запрошення до входу теж приберемо при виході
    return send({ text: '🔐 Введіть пароль адміністратора (повідомлення одразу видалиться):' }, { remove_keyboard: true });
  }
  if (!staff && !admin) return send({ text: '⛔ Цей бот — для персоналу VARVAR. Адміністратор може увійти командою /admin.' }, { remove_keyboard: true });

  if (m.photo) return send({ text: admin ? await handleMenuPhoto(m, env, tg) : '🔐 Змінювати фото може лише адміністратор.' });
  if (!text) return;
  let x;
  // --- офіціант ---
  if (low === '/start' || low === '/help' || text === W.help || low === 'допомога' || low === 'help') return send({ text: admin ? ADMIN_HELP : HELP });
  if (text === W.order || low === '/order' || low === 'замовлення') return send(await tablePick(env, (await openTables(env)).map(r => r.t), +env.TABLES || 15));
  if (low === '/tables' || text === W.tables || low === 'столи') return send(await tablesView(env));
  if ((x = low.match(/^(?:\/table|стіл|стол)\s+(\d+)$/))) return send(await tableView(env, +x[1]));
  if ((x = low.match(/^(?:\/close|закрити|закрий)\s+(\d+)$/))) return send(await closeAsk(env, +x[1]));
  if (low === '/close' || text === W.close) return send(await pickTable(env, '🧾 Який стіл закрити?', 'cls'));
  if (low === 'принтер' || low === '/printer') {
    const { seen, q } = await printStatus(env);
    const ok = Date.now() - seen < 60e3;
    return send({ text: `🖨 <b>Принтер</b>: ${ok ? '✅ на звʼязку' : seen ? `❌ немає звʼязку з ${hhmm(seen)}` : '❌ програма друку ще не запускалась'}\nУ черзі: ${q}`, markup: { inline_keyboard: [[{ text: '🖨 Тестовий друк', callback_data: 'ptest' }, { text: '🔳 QR меню', callback_data: 'pqr' }]] } });
  }
  if (low === '/stoplist' || text === W.stop || low === 'стоп-лист' || low === 'стоп лист') return send(await stopView(env));

  // --- адміністратор ---
  const ADM = [A.cash, A.expense, A.reports, A.closed, A.top, A.del, A.menu, A.wifi, A.pass, A.waiter, A.logout, A.delClosed, A.reset];
  const admOnly = ADM.includes(text) || /^(\/revenue|\/wifi|\/menu|виручка|каса|звіти|витрата|видалити стіл)/.test(low);
  if (admOnly && !admin) return send({ text: `🔐 Це доступно лише адміністратору. Натисніть «${W.admin}».` });
  if (text === A.cash || low === 'каса') return send(await cashView(env));
  if (text === A.expense || low === 'витрата') { await env.DB.put('st:' + uid, 'exp', { expirationTtl: 600 }); return send({ text: '💸 Напишіть суму і на що, наприклад:\n<code>450 овочі на ринку</code>' }); }
  if (text === A.reports || low === '/revenue' || low === 'виручка' || low === 'звіти') return send(await reportsView(env));
  if (text === A.closed) return send(await closedView(env));
  if (text === A.top) return send(await topView(env));
  if (text === A.del) return send(await pickTable(env, '🗑 Який стіл видалити? (помилковий або тестовий — у виручку не піде)', 'del'));
  if (text === A.delClosed) return send(await delClosedPicker(env));
  if (text === A.reset) return send({ text: '♻️ <b>Обнулити все?</b>\nЗітруться: звіти, виручка, закриті рахунки, топ страв і ВСІ відкриті столи.\nМеню, Wi‑Fi і пароль залишаться.', markup: { inline_keyboard: [[{ text: '⚠️ Так, обнулити', callback_data: 'rst1' }, { text: 'Ні', callback_data: 'no' }]] } });
  if (text === A.menu || low === '/menu') return send({ text: MENU_HELP });
  if (text === A.wifi || low === '/wifi') return send(await wifiView(env));
  if (text === A.pass) { await env.DB.put('st:' + uid, 'newpass', { expirationTtl: 300 }); return send({ text: '🔑 Напишіть новий пароль (мінімум 4 символи). Повідомлення одразу видалиться.' }); }
  if (text === A.waiter) await env.DB.put('kbw:' + uid, '1', { expirationTtl: ADMIN_TTL });
  if (text === A.waiter) return send({ text: `Звичайні кнопки. Вхід адміністратора зберігається — «${W.admin}», щоб повернутись.` }, KEYBOARD);
  if (text === A.logout) {
    await env.DB.delete('adm:' + uid); await env.DB.delete('kbw:' + uid);
    await remember(env, uid, chat, [m.message_id]); await purgeAdminChat(env, uid); track = false;
    return send({ text: '🚪 Ви вийшли з режиму адміністратора. Переписку адмін-режиму видалено з чату.' }, KEYBOARD);
  }

  // --- замовлення від офіціанта: «номер столу» + рядки «страва кількість» ---
  if (text.includes('\n')) {
    const d = parseWaiterOrder(await getMenu(env), text, +(env.TABLES || 50));
    if (d?.error) return send({ text: '⚠️ ' + d.error });
    if (d) {
      const did = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      await env.DB.put('draft:' + did, JSON.stringify(d), { expirationTtl: 3600 });
      const can = d.items.some(i => !i.hidden);
      return send({ text: draftText(d), markup: { inline_keyboard: [can ? [{ text: `✅ Додати до столу ${d.table}`, callback_data: 'wok:' + did }, { text: '❌ Скасувати', callback_data: 'no' }] : [{ text: 'OK', callback_data: 'no' }]] } });
    }
  }

  // --- меню: стоп-лист — усім, решта змін — лише адміністратору ---
  const r = await handleMenuText(text, env, { canEdit: admin });
  return send({ text: r || 'Не зрозумів 🤔 Скористайтесь кнопками внизу або натисніть «❓ Допомога».' });
}

// ---------- кнопки під повідомленнями ----------
async function handleCallback(q, env) {
  const chat = q.message?.chat?.id, mid = q.message?.message_id, uid = q.from?.id;
  const answer = (text) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text });
  const admin = await isAdmin(env, uid);
  if (String(chat) !== String(env.CHAT_ID) && !admin) return answer('Немає доступу');
  const edit = (text, markup) => tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: markup || { inline_keyboard: [] } });
  const send = async (v) => {
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', reply_markup: v.markup || (admin ? ADMIN_KB : KEYBOARD) });
    if (admin) await remember(env, uid, chat, [await msgId(r)]);
    return r;
  };
  const [act, arg, oid, opt] = (q.data || '').split(':');
  const who = q.from?.first_name || '';
  const confirm = (text, yes) => send({ text, markup: { inline_keyboard: [[{ text: '✅ Так', callback_data: yes }, { text: 'Ні', callback_data: 'no' }]] } });

  if (act === 'acc') { // ✅ Прийняв — дописуємо, хто взяв; гість бачить статус на сайті
    const html = q.message.text ? esc(q.message.text) : '';
    if (oid && /^[a-z0-9]+$/.test(oid)) await env.DB.put('ord:' + oid, JSON.stringify({ s: 'acc', t: +arg, by: who, at: hhmm() }), { expirationTtl: 12 * 3600 });
    await edit(`${html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, { inline_keyboard: [[{ text: '🧾 Закрити стіл ' + arg, callback_data: 'cls:' + arg }]] });
    return answer('Прийнято');
  }
  if (act === 'o') { // замовлення кнопками
    const r = await obCallback(env, uid, q.data.split(':').slice(1));
    if (r.expired) { await edit('⌛ Замовлення застаріло. Почніть заново: «➕ Замовлення».'); return answer(''); }
    if (r.cancel) { await edit('✖ Замовлення скасовано.'); return answer(''); }
    if (r.tablePick) { const v = await tablePick(env, (await openTables(env)).map(x => x.t), +env.TABLES || 15); await edit(v.text, v.markup); return answer(''); }
    if (r.comment) {
      r.ob.mid = mid; r.ob.chat = chat; await putOb(env, uid, r.ob);
      await env.DB.put('st:' + uid, 'ocom', { expirationTtl: 600 });
      return answer('💬 Напишіть коментар повідомленням (наприклад: без цибулі)');
    }
    if (r.send) {
      const res = await addWaiterOrder(env, { table: r.send.table, items: r.send.items }, who, r.send.com || '');
      if (!res) { await edit('Нічого додати.'); return answer(''); }
      await edit(`✅ <b>Стіл ${r.send.table}</b> — замовлення відправлено (${esc(who)}, ${hhmm()})\n${res.lines.map(esc).join('\n')}${r.send.com ? `\n💬 ${esc(r.send.com)}` : ''}\nСума: <b>${money(res.sum)}</b>\n\n💰 Разом за стіл: <b>${money(res.total)}</b>`,
        { inline_keyboard: [[{ text: '➕ Дозамовити', callback_data: 'o:t:' + r.send.table }, { text: `🪑 Стіл ${r.send.table}`, callback_data: 'tbl:' + r.send.table }], [{ text: '🧾 Закрити стіл', callback_data: 'cls:' + r.send.table }]] });
      return answer('🖨 Відправлено на кухню');
    }
    if (r.view) await edit(r.view.text, r.view.markup);
    return answer(r.toast || '');
  }
  if (act === 'cls') { await send(await closeAsk(env, arg)); return answer(''); }
  if (act === 'wok') { // підтвердження замовлення офіціанта
    const d = await env.DB.get('draft:' + arg, 'json');
    if (!d) { await edit('⌛ Чернетка застаріла або вже додана. Надішліть замовлення ще раз.'); return answer(''); }
    await env.DB.delete('draft:' + arg);
    const r = await addWaiterOrder(env, d, who);
    if (!r) { await edit('Нічого додати.'); return answer(''); }
    await edit(`✅ <b>Додано до столу ${d.table}</b> (${esc(who)}, ${hhmm()})\n${r.lines.map(esc).join('\n')}\nСума: <b>${money(r.sum)}</b>\n\n💰 Разом за стіл: <b>${money(r.total)}</b>`,
      { inline_keyboard: [[{ text: `🪑 Стіл ${d.table}`, callback_data: 'tbl:' + d.table }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + d.table }]] });
    return answer('Додано');
  }
  if (act === 'clsok') { await edit(await closeTable(env, +arg, who, oid === 'card' ? 'card' : 'cash', opt !== 'np')); return answer('Закрито'); }
  if (act === 'pre') {
    const b = await getBill(env, arg); if (!b.total) return answer(`Стіл ${arg} порожній`);
    await queuePrint(env, 'precheck', await receipt(env, { table: +arg, bill: b, final: false, by: who }));
    return answer('🖨 Пречек відправлено на принтер');
  }
  if (act === 'pqr') { // вибір столу для QR
    const n = +env.TABLES || 15;
    await send({ text: '🔳 <b>QR меню</b> — для якого столу?\n<i>Гість сканує — і стіл у меню обирається сам.</i>', markup: { inline_keyboard: [...chunk(Array.from({ length: n }, (_, i) => ({ text: String(i + 1), callback_data: 'pqrt:' + (i + 1) })), 5), [{ text: 'Без столу', callback_data: 'pqrt:0' }]] } });
    return answer('');
  }
  if (act === 'pqrt') {
    const t = +arg;
    await queuePrint(env, 'qr', [['logo'], ...(t ? [['invb', `СТІЛ ${t}`]] : []), ['inv', 'МЕНЮ ТА ЗАМОВЛЕННЯ'], ['gap'], ['img', t ? 'qr-' + t : 'qr', 220], ['c', 'Скануйте камерою телефона'], ['s', 'Замовлення — через Wi-Fi VARVAR'], ['gap']]);
    return answer(`🖨 QR${t ? ' столу ' + t : ''} відправлено на принтер`);
  }
  if (act === 'ptest') { await queuePrint(env, 'test', TEST_PRINT()); return answer('🖨 Тест відправлено'); }
  if (act === 'tbl') { await send(await tableView(env, +arg)); return answer(''); }
  if (act === 'ed') { const v = await editView(env, +arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'rm') { const n = await removeOne(env, +arg, +oid); const v = await editView(env, +arg, n); await edit(v.text, v.markup); return answer(n ? 'Прибрано' : ''); }
  if (act === 'back') {
    const menu = await getMenu(env); const it = menu.categories.flatMap(c => c.items).find(i => i.id === arg);
    if (it) { delete it.hidden; const prev = await env.DB.get('menu'); if (prev) await env.DB.put('menu_prev', prev); await env.DB.put('menu', JSON.stringify(menu)); }
    const v = await stopView(env); await edit(v.text, v.markup); return answer(it ? `${it.name.uk} знову в меню` : 'Не знайдено');
  }
  // лише адміністратор
  if (['del', 'delok', 'wifiask', 'wifiok', 'dc', 'dcok', 'cv', 'cvb', 'cvp', 'rst1', 'rst2', 'exs', 'exdel', 'exdelok', 'float', 'exlist'].includes(act) && !admin) return answer('🔐 Лише для адміністратора');
  if (act === 'del') {
    const b = await getBill(env, arg);
    if (!b.total) return answer(`Стіл ${arg} вже порожній`);
    await confirm(`🗑 Видалити <b>стіл ${arg}</b> (${money(b.total)})? Сума НЕ піде у виручку.`, 'delok:' + arg); return answer('');
  }
  if (act === 'delok') { await edit(await deleteTable(env, +arg, who)); return answer('Видалено'); }
  if (act === 'wifiask') { await confirm('🗑 Скинути всі мережі? Замовлення не прийматимуться, поки не додасте мережу знову через admin.html.', 'wifiok'); return answer(''); }
  if (act === 'wifiok') { await env.DB.put('venue_ips', '[]'); await edit('📶 Усі мережі скинуто. Додайте мережу закладу через admin.html.'); return answer('Скинуто'); }
  if (act === 'cv') { const v = await closedOne(env, arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'cvb') { const v = await closedView(env); await edit(v.text, v.markup); return answer(''); }
  if (act === 'cvp') return answer(await reprintClosed(env, arg, who) ? '🖨 Чек відправлено на принтер' : 'Немає переліку страв');
  if (act === 'dc') { await confirm('🧹 Видалити цей закритий рахунок? Сума відніметься з виручки.', 'dcok:' + arg); return answer(''); }
  if (act === 'dcok') { await edit(await delClosed(env, arg)); return answer('Видалено'); }
  if (act === 'rst1') { await edit('⚠️ Точно? Це не можна скасувати.', { inline_keyboard: [[{ text: '♻️ Так, усе обнулити', callback_data: 'rst2' }, { text: 'Ні', callback_data: 'no' }]] }); return answer(''); }
  if (act === 'rst2') { await edit(await resetAll(env)); return answer('Обнулено'); }
  if (act === 'exs') {
    const e = await env.DB.get('expd:' + arg, 'json');
    if (!e) { await edit('⌛ Застаріло. Натисніть «💸 Витрата» ще раз.'); return answer(''); }
    await env.DB.delete('expd:' + arg);
    await addExpense(env, { ...e, src: oid === 'card' ? 'card' : 'cash', at: hhmm(), by: who });
    await edit(`✅ Витрату записано: <b>${money(e.sum)}</b> ${oid === 'card' ? '💳 з карти' : '💵 з каси'}${e.note ? ` — ${esc(e.note)}` : ''}`); return answer('Записано');
  }
  if (act === 'exlist') { await send(await expListView(env)); return answer(''); }
  if (act === 'exdel') { await confirm('🗑 Видалити цю витрату?', 'exdelok:' + arg); return answer(''); }
  if (act === 'exdelok') {
    const k = 'exp:' + dayKey(); const l = await getExp(env); if (l[+arg]) { l[+arg].del = 1; await env.DB.put(k, JSON.stringify(l), { expirationTtl: YEAR }); }
    await edit('🗑 Витрату видалено.'); return answer('');
  }
  if (act === 'float') { await env.DB.put('st:' + uid, 'float', { expirationTtl: 600 }); await send({ text: '🏦 Скільки грошей у касі на початок дня (розмін)? Напишіть число:' }); return answer(''); }
  if (act === 'no') { await edit('Скасовано.'); return answer(''); }
  return answer('');
}
