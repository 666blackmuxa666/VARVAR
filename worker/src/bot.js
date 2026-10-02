// Telegram-бот закладу. Вхід: пароль офіціанта (столи, замовлення, закриття, стоп-лист)
// і окремо пароль адміністратора (звіти, каса, видалення, меню, Wi‑Fi, персонал, паролі).
// Уся логіка — у ops.js (та сама, що в касовій програмі POS).
import { getMenu, handleMenuText, handleMenuPhoto, HELP as MENU_HELP } from './menu.js';
import { parseWaiterOrder, draftText } from './waiter.js';
import { tablePick, catsView, obCallback, getOb, putOb } from './orderui.js';
import { queuePrint, printStatus } from './print.js';
import {
  tg, esc, hhmm, dayKey, money, TZ, tablesCount, getBill, openTables, billItems, payable, discAmt, addWaiterOrder, removeOne, closeTable, payLabel,
  precheck, setDiscount, moveTable, deleteTable, getClosed, closedRec, delClosed, reprintClosed, getExp, addExpense, delExpense, setFloat, cashData,
  reportsData, topData, setHidden, getShift, shiftData, openShift, closeShift, zText, reportBreakdown, samePass, adminPass, waiterPass, isAdmin, isWaiter, getStaff, addStaff, delStaff, loggedWaiters, resetAll, acceptOrder, logEvent,
} from './ops.js';
export { tg, esc, hhmm, getBill } from './ops.js';
export { addStat, addDishes } from './ops.js';

const ADMIN_TTL = 12 * 3600;

// ---------- клавіатури ----------
const W = { order: '➕ Замовлення', tables: '📋 Столи', close: '🧾 Закрити стіл', stop: '⛔ Стоп-лист', help: '❓ Допомога', admin: '🔐 Адмін' };
const A = { cash: '💰 Каса', expense: '💸 Витрата', reports: '📊 Звіти', closed: '📜 Закриті сьогодні', top: '🏆 Топ страв', del: '🗑 Видалити стіл', menu: '📖 Редагувати меню', wifi: '📶 Wi‑Fi',
  staff: '👥 Персонал', pass: '🔑 Змінити пароль', wpass: '🔑 Пароль офіціанта', waiter: '⬅️ Режим офіціанта', logout: '🚪 Вийти',
  delClosed: '🧹 Видалити закритий', reset: '♻️ Обнулити все' }; // ТЕСТ: delClosed і reset — прибрати, коли скаже власник
const kb = rows => ({ keyboard: rows.map(r => r.map(text => ({ text }))), resize_keyboard: true, is_persistent: true });
export const KEYBOARD = kb([[W.order], [W.tables, W.close], [W.stop, W.help], [W.admin]]);
const ADMIN_KB = kb([[W.order], [A.cash, A.expense], [A.reports, A.closed], [A.top, A.del], [W.tables, W.stop], [A.menu, A.wifi], [A.staff, A.wpass], [A.delClosed, A.reset], [A.pass, A.waiter, A.logout]]);

export const COMMANDS = [
  ['tables', 'Відкриті столи і рахунки'], ['table', 'Деталі столу: /table 5'], ['close', 'Закрити рахунок столу'],
  ['stoplist', 'Стоп-лист (чого немає)'], ['admin', 'Режим адміністратора (пароль)'], ['help', 'Допомога'],
].map(([command, description]) => ({ command, description }));

const POS_URL = env => (env.SITE_URL || '') + 'pos.html';
const HELP = env => `<b>VARVAR — бот закладу</b>

${W.order} — записати замовлення кнопками: стіл → категорія → страва → кількість
${W.tables} — відкриті столи і суми (у столі: пречек, знижка, перенос, редагування)
${W.close} — закрити рахунок (гість розрахувався)
${W.stop} — чого немає / повернути в меню
${W.admin} — режим адміністратора (за паролем)
<code>принтер</code> — стан принтера, тестовий друк, QR

<b>Записати замовлення текстом:</b>
<code>1
гранд 2
мумо 3
пепсі 0.5 4</code>
Перший рядок — номер столу, далі «страва кількість».

<b>Текстом:</b> <code>стіл 5</code> · <code>закрити 5</code> · <code>стоп мєско</code> · <code>повернути мєско</code>

🖥 Касова програма (планшет/комп'ютер): ${POS_URL(env)}`;

const ADMIN_HELP = env => `🔐 <b>Режим адміністратора</b>

${A.cash} — каса на сьогодні: розмін + готівка − витрати = має бути в касі
${A.expense} — записати витрату (покупки), з каси або з карти
${A.reports} — виручка (💵/💳), знижки, витрати, чистими
${A.closed} — закриті рахунки: деталі, повторний друк, видалення з виручки
${A.top} — що найбільше замовляють цього місяця
${A.del} — прибрати помилковий/тестовий стіл (не йде у виручку)
${A.menu} — ціни, склад, нові страви, фото
${A.wifi} — мережі закладу для замовлень
${A.staff} — PIN-коди працівників для касової програми, хто увійшов у бот
${A.wpass} — пароль для входу офіціантів у бот
${A.delClosed} / ${A.reset} — тестові
${A.pass} — новий пароль адміністратора
${A.waiter} — звичайні кнопки (вхід зберігається)
${A.logout} — вийти з режиму адміністратора

Вхід діє 12 годин. 🖥 Каса: ${POS_URL(env)}`;

// ---------- адмін-сесія: прибирання переписки ----------
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
const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);

// ---------- екрани ----------
const billSum = b => b.disc ? `${money(payable(b))} <i>(знижка ${b.disc}%)</i>` : money(b.total);
async function tablesView(env) {
  const rows = await openTables(env);
  if (!rows.length) return { text: '📋 Відкритих столів немає' };
  const sum = rows.reduce((s, r) => s + payable(r.b), 0);
  return {
    text: `📋 <b>Відкриті столи</b>\n` + rows.map(r => `🪑 Стіл ${r.t} — <b>${billSum(r.b)}</b> · замовлень: ${r.b.orders}${r.b.opened ? ` · з ${hhmm(r.b.opened)}` : ''}${r.b.check ? ' · 🧾 чек' : ''}`).join('\n') + `\n\nРазом у залі: <b>${money(sum)}</b>`,
    markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${r.t}`, callback_data: 'tbl:' + r.t })), 4) },
  };
}
async function tableView(env, t) {
  const b = await getBill(env, t);
  if (!b.total) return { text: `🪑 Стіл ${t}: відкритого рахунку немає` };
  const log = (b.log || []).map(o => `<b>${o.at}</b> ${esc(o.kind)}\n${o.lines.map(esc).join('\n')}${o.comment ? `\n💬 ${esc(o.comment)}` : ''}`).join('\n\n');
  return {
    text: `🪑 <b>Стіл ${t}</b> — ${billSum(b)}${b.disc ? `\nСума ${money(b.total)} − знижка ${b.disc}% (${money(discAmt(b))})` : ''}${b.check ? ' · 🧾 просять чек' : ''}\n\n${log || '(деталі недоступні)'}`,
    markup: { inline_keyboard: [
      [{ text: '🖨 Пречек', callback_data: 'pre:' + t }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + t }],
      [{ text: '➕ Дозамовити', callback_data: 'o:t:' + t }, { text: '✏️ Редагувати чек', callback_data: 'ed:' + t }],
      [{ text: '% Знижка', callback_data: 'dsc:' + t }, { text: '↔️ Перенести / об\'єднати', callback_data: 'mv:' + t }]] },
  };
}
async function editView(env, t, note = '') {
  const b = await getBill(env, t);
  if (!b.total) return { text: `🪑 Стіл ${t}: відкритого рахунку немає${note ? '\n\n' + note : ''}` };
  const items = billItems(b);
  return {
    text: `✏️ <b>Стіл ${t}</b> — ${billSum(b)}\nНатисніть позицію, щоб прибрати 1 шт.${note ? '\n\n' + note : ''}`,
    markup: { inline_keyboard: [...items.map((it, i) => [{ text: `➖ ${it.name} · ${it.q} шт · ${it.sum}`, callback_data: `rm:${t}:${i}` }]), [{ text: '✅ Готово', callback_data: 'tbl:' + t }]] },
  };
}
const payButtons = t => ({ inline_keyboard: [[{ text: '💵 Готівка + 🖨 чек', callback_data: `clsok:${t}:cash` }, { text: '💳 Карта + 🖨 чек', callback_data: `clsok:${t}:card` }],
  [{ text: '💵 Готівка, без чека', callback_data: `clsok:${t}:cash:np` }, { text: '💳 Карта, без чека', callback_data: `clsok:${t}:card:np` }], [{ text: '🖨 Пречек', callback_data: 'pre:' + t }, { text: 'Скасувати', callback_data: 'no' }]] });
const PAY_PICK = { cash: '💵 готівка', card: '💳 карта' };
async function closeAsk(env, t) {
  const b = await getBill(env, t);
  if (!b.total) return { text: `Стіл ${t} вже закритий.` };
  return { text: `🧾 Закрити <b>стіл ${t}</b> на <b>${billSum(b)}</b>?${b.pay ? `\nГість хоче платити: ${PAY_PICK[b.pay]}` : ''}\n\nЯк оплатили?`, markup: payButtons(t) };
}
const closedText = r => r ? `✅ <b>Стіл ${r.t} закрито</b> — ${money(r.sum)}${r.disc ? ` (знижка ${money(r.disc)})` : ''} · ${payLabel(r.cash, r.card)}` : 'Стіл вже закритий.';
async function pickTable(env, title, act) {
  const rows = await openTables(env);
  if (!rows.length) return { text: 'Відкритих столів немає' };
  return { text: title, markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${r.t} · ${payable(r.b)}`, callback_data: `${act}:${r.t}` })), 2) } };
}
const fmtT = t => new Date(t).toLocaleString('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
async function cashView(env) {
  const c = await cashData(env), sh = await shiftData(env);
  const shift = sh.open
    ? [`🔓 <b>Зміна відкрита</b> з ${fmtT(sh.opened)}${sh.by ? ` (${esc(sh.by)})` : ''}`, `Чеків ${sh.checks} · ${money(sh.total)} · в касі має бути <b>${money(sh.inBox)}</b>`, '']
    : ['🔒 <b>Каса закрита</b> — відкрийте зміну на початку дня', ''];
  return {
    text: [...shift, `💰 <b>Каса за ${c.day}</b>`, '',
      `Розмін на початок: ${money(c.float)}`, `+ 💵 Готівка від гостей: ${money(c.cash)}`, `− 💸 Витрати готівкою: ${money(c.exCash)}`,
      `= <b>Має бути в касі: ${money(c.inBox)}</b>`, '',
      `💳 Карта: ${money(c.card)}${c.exCard ? ` · витрати з карти: ${money(c.exCard)}` : ''}`,
      `📈 Виручка за день: <b>${money(c.cash + c.card)}</b> · витрати: ${money(c.exCash + c.exCard)} · чистими: <b>${money(c.cash + c.card - c.exCash - c.exCard)}</b>`,
      c.disc ? `🏷 Знижки за день: ${money(c.disc)}` : '',
      c.open ? `\n⏳ Ще відкрито в залі: ${money(c.open)} (не враховано)` : ''].filter(x => x !== '').join('\n'),
    markup: { inline_keyboard: [[sh.open ? { text: '🔒 Закрити касу (Z-звіт)', callback_data: 'shcl' } : { text: '🔓 Відкрити касу', callback_data: 'shop' }], [{ text: '🏦 Вказати розмін', callback_data: 'float' }, { text: '💸 Витрати сьогодні', callback_data: 'exlist' }]] },
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
async function reportsView(env) {
  const r = await reportsData(env);
  const line = (label, d) => `<b>${label}:</b> ${money(d.closed)} (💵 ${money(d.cash)} · 💳 ${money(d.card)})\n   витрати ${money(d.exp)} · <b>чистими ${money(d.closed - d.exp)}</b> · столів ${d.tables}${d.tables ? ` · сер. чек ${money(d.closed / d.tables)}` : ''}${d.disc ? ` · знижки ${money(d.disc)}` : ''}`;
  const [d0, ...rest] = r.rows;
  return { text: [`📊 <b>Звіти</b>`, line(...d0), `У залі ще відкрито: <b>${money(r.open)}</b>`, '', ...rest.map(x => line(...x)), '',
    `<i>Виручка — закриті рахунки (після знижок). Чистими = виручка − витрати.</i>`, '', '🔎 <b>Детальніше</b> — оберіть період і розріз:'].join('\n'), markup: repMarkup('m') };
}
// детальні звіти: період × розріз (ті самі дані, що фільтри в POS)
const REP_P = { d: 'Сьогодні', y: 'Вчора', w: '7 днів', m: 'Цей місяць', pm: 'Минулий місяць', yr: 'Цей рік' };
const REP_BY = { waiter: '👤 Офіціанти', group: '🍳 Кухня/бар', cat: '📂 Категорії', hour: '🕐 Години', table: '🪑 Столи' };
const repMarkup = p => ({ inline_keyboard: [Object.entries(REP_P).slice(0, 3).map(([k, l]) => ({ text: (k === p ? '• ' : '') + l, callback_data: `rp:${k}:x` })), Object.entries(REP_P).slice(3).map(([k, l]) => ({ text: (k === p ? '• ' : '') + l, callback_data: `rp:${k}:x` })),
  ...chunk(Object.entries(REP_BY).map(([k, l]) => ({ text: l, callback_data: `rp:${p}:${k}` })), 3)] });
function repRange(p) {
  const now = Date.now(), today = dayKey(), [y, mo] = today.split('-').map(Number);
  if (p === 'd') return [today, today];
  if (p === 'y') { const d = dayKey(now - 86400e3); return [d, d]; }
  if (p === 'w') return [dayKey(now - 6 * 86400e3), today];
  if (p === 'pm') { const py = mo === 1 ? y - 1 : y, pmo = mo === 1 ? 12 : mo - 1; return [`${py}-${String(pmo).padStart(2, '0')}-01`, `${py}-${String(pmo).padStart(2, '0')}-${new Date(py, pmo, 0).getDate()}`]; }
  if (p === 'yr') return [`${y}-01-01`, today];
  return [today.slice(0, 8) + '01', today];
}
async function repView(env, p, by) {
  const [from, to] = repRange(p);
  if (by === 'x') { const r = await reportBreakdown(env, from, to, 'waiter'); const ex = r.r.exp.reduce((a, e) => a + e.sum, 0), n = r.r.checks.length;
    return { text: `📊 <b>${REP_P[p]}</b> (${from} — ${to})\n\nВиручка: <b>${money(r.total)}</b> · чеків ${n}${n ? ` · сер. чек ${money(r.total / n)}` : ''}\n💵 ${money(r.r.checks.reduce((a, c) => a + c.cash, 0))} · 💳 ${money(r.r.checks.reduce((a, c) => a + c.card, 0))}\nВитрати ${money(ex)} · чистими <b>${money(r.total - ex)}</b>\n\nОберіть розріз:`, markup: repMarkup(p) }; }
  const r = await reportBreakdown(env, from, to, by);
  const unit = ['group', 'cat'].includes(by) ? 'шт' : 'чек.';
  return { text: `📊 <b>${REP_P[p]} · ${REP_BY[by]}</b> (${from} — ${to})\n\n` + (r.rows.length ? r.rows.slice(0, 40).map(([k, [q, sm]]) => `${esc(k)} — <b>${money(sm)}</b> · ${q} ${unit}`).join('\n') : 'Немає даних') + `\n\nВиручка за період: <b>${money(r.total)}</b>`, markup: repMarkup(p) };
}
async function closedView(env, day = dayKey()) {
  const list = await getClosed(env, day);
  if (!list.length) return { text: `📜 За ${day} закритих рахунків ще немає.` };
  const gone = x => x.del || x.rm;
  const ok = list.filter(x => !gone(x)), sum = ok.reduce((s, x) => s + x.sum, 0);
  const btns = list.map((x, k) => ({ x, k })).filter(({ x }) => !gone(x)).map(({ x, k }) => ({ text: `🧾 ${x.at} · стіл ${x.t} · ${x.sum}`, callback_data: 'cv:' + (x.id || k) }));
  return { markup: btns.length ? { inline_keyboard: chunk(btns, 1) } : undefined, text: `📜 <b>Закриті рахунки за ${day}</b>\n` + list.map(x => `${gone(x) ? '🗑' : '✅'} ${x.at} · стіл ${x.t} · ${money(x.sum)}${gone(x) ? '' : ' · ' + payLabel(x.cash ?? x.sum, x.card || 0)}${x.by ? ` · ${esc(x.by)}` : ''}${gone(x) ? ' (видалено)' : ''}`).join('\n') + `\n\nРазом: <b>${money(sum)}</b> · рахунків ${ok.length}\n💵 ${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))} · 💳 ${money(ok.reduce((s, x) => s + (x.card || 0), 0))}` };
}
async function closedOne(env, ref) {
  const x = await closedRec(env, ref);
  if (!x) return { text: 'Рахунок не знайдено.' };
  const lines = (x.dishes || []).map(([n, q, sum]) => `${q}× ${n} — ${sum}`);
  const gone = x.del || x.rm;
  return {
    text: `🧾 <b>Стіл ${x.t}</b> · закрито о ${x.at}${x.by ? ` · ${esc(x.by)}` : ''}\n\n${lines.length ? lines.map(esc).join('\n') : '<i>(перелік страв не збережено — рахунок закрито до оновлення)</i>'}\n\n${x.disc ? `Сума ${money(x.gross)} − знижка ${x.disc}%\n` : ''}Разом: <b>${money(x.sum)}</b> · ${payLabel(x.cash ?? x.sum, x.card || 0)}${gone ? '\n\n🗑 Видалено з виручки' : ''}`,
    markup: { inline_keyboard: [[...(lines.length ? [{ text: '🖨 Друкувати чек', callback_data: 'cvp:' + ref }] : []), ...(gone ? [] : [{ text: '🗑 Видалити з виручки', callback_data: 'dc:' + ref }])], [{ text: '⬅️ Назад', callback_data: 'cvb' }]] },
  };
}
async function topView(env) {
  const rows = (await topData(env)).slice(0, 20);
  if (!rows.length) return { text: '🏆 Цього місяця ще немає продажів.' };
  return { text: `🏆 <b>Топ страв за ${new Date().toLocaleDateString('uk-UA', { timeZone: TZ, month: 'long' })}</b>\n` + rows.map((r, i) => `${i + 1}. ${esc(r.n)} — ${r.q} шт · ${money(r.s)}`).join('\n') };
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
async function staffView(env) {
  const [list, ws] = await Promise.all([getStaff(env), loggedWaiters(env)]);
  return {
    text: `👥 <b>Персонал</b>\n\n<b>PIN-коди для касової програми:</b>\n${list.length ? list.map(s => `• ${esc(s.name)} — ${s.role === 'admin' ? '🔐 адмін' : '🧑‍🍳 офіціант'}`).join('\n') : '<i>ще немає</i>'}\n\n` +
      `<b>Увійшли в бот:</b>\n${ws.length ? ws.map(w => `• ${esc(w.name || w.uid)}`).join('\n') : '<i>нікого</i>'}\n\n` +
      `Додати: натисніть «➕ Додати» і напишіть <code>Назар 1234</code> (офіціант) або <code>Назар 1234 адмін</code>.`,
    markup: { inline_keyboard: [[{ text: '➕ Додати працівника', callback_data: 'stfadd' }],
      ...chunk(list.map(s => ({ text: `🗑 ${s.name}`, callback_data: 'stfdel:' + s.id })), 2),
      ...chunk(ws.map(w => ({ text: `🚪 Вийти: ${w.name || w.uid}`, callback_data: 'wout:' + w.uid })), 2)] },
  };
}
const TEST_PRINT = () => [['logo'], ['big', 'ТЕСТ ДРУКУ'], ['c', 'VARVAR · ' + hhmm()], ['hr'], ['l', 'Українські літери: Іі Її Єє Ґґ'], ['lr', '2 × Мєско', '760'], ['lr2', 'Всього', '760 грн'], ['hr'], ['gap']];
export const QR_PRINT = t => [['logo'], ...(t ? [['invb', `СТІЛ ${t}`]] : []), ['inv', 'МЕНЮ ТА ЗАМОВЛЕННЯ'], ['gap'], ['img', 'qr', 220], ['c', 'Скануйте камерою телефона'], ...(t ? [['b', `При замовленні оберіть стіл ${t}`]] : []), ['s', 'Замовлення — через Wi-Fi VARVAR'], ['gap']];
export const TEST_JOB = TEST_PRINT;
const tablesGrid = (env, act, skip) => chunk(Array.from({ length: tablesCount(env) }, (_, i) => i + 1).filter(n => n !== skip).map(n => ({ text: String(n), callback_data: `${act}:${n}` })), 5);

// ---------- повідомлення ----------
export async function handleUpdate(u, env) {
  if (u.callback_query) return handleCallback(u.callback_query, env);
  const m = u.message; if (!m) return;
  const uid = m.from?.id, chat = m.chat.id, who = m.from?.first_name || '';
  const admin = await isAdmin(env, uid);
  const waiter = admin || await isWaiter(env, uid);
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
  const tooMany = async () => false; // без блокування на 15 хв (просив власник)
  const fail = async () => { const n = +(await env.DB.get('fail:' + uid) || 0) + 1; await env.DB.put('fail:' + uid, String(n), { expirationTtl: 900 }); return n; };

  // очікуємо пароль або інше введення
  const state = uid && await env.DB.get('st:' + uid);
  if (state && text && !text.startsWith('/') && !Object.values(W).concat(Object.values(A)).includes(text)) {
    await env.DB.delete('st:' + uid);
    if (['login', 'newpass', 'wlogin', 'newwpass', 'stfadd'].includes(state)) await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id }); // прибираємо паролі/PIN з чату
    if (state === 'wlogin') {
      if (await tooMany()) return send({ text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' }, { remove_keyboard: true });
      if (!samePass(text, await waiterPass(env)) && !samePass(text, await adminPass(env))) {
        const n = await fail(); await env.DB.put('st:' + uid, 'wlogin', { expirationTtl: 3600 });
        return send({ text: `❌ Невірний пароль Введіть ще раз:` }, { remove_keyboard: true });
      }
      await env.DB.delete('fail:' + uid);
      await env.DB.put('wlog:' + uid, JSON.stringify({ name: who, at: Date.now() }));
      return send({ text: `✅ Вітаю, ${esc(who)}! Ви увійшли як офіціант.\n\n` + HELP(env) }, KEYBOARD);
    }
    if (state === 'login') {
      if (await tooMany()) return send({ text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' });
      if (!samePass(text, await adminPass(env))) {
        const n = await fail();
        return send({ text: `❌ Невірний пароль. Натисніть «${W.admin}», щоб спробувати ще.` }, KEYBOARD);
      }
      await env.DB.delete('fail:' + uid);
      await env.DB.put('adm:' + uid, JSON.stringify({ name: who, at: Date.now() }), { expirationTtl: ADMIN_TTL });
      await env.DB.put('wlog:' + uid, JSON.stringify({ name: who, at: Date.now() }));
      track = true;
      return send({ text: `✅ Вітаю, ${esc(who)}! Ви в режимі адміністратора.\n\n` + ADMIN_HELP(env) }, ADMIN_KB);
    }
    if (state === 'ocom' && waiter) { // коментар до замовлення кнопками → оновлюємо те саме повідомлення
      const ob = await getOb(env, uid); await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id });
      if (!ob) return send({ text: '⌛ Замовлення застаріло. Почніть заново: «➕ Замовлення».' });
      ob.com = text.slice(0, 200); await putOb(env, uid, ob);
      const v = await catsView(env, ob);
      return tg(env, 'editMessageText', { chat_id: ob.chat, message_id: ob.mid, text: v.text, parse_mode: 'HTML', reply_markup: v.markup });
    }
    if (state.startsWith('dscc:') && waiter) { // свій відсоток знижки
      const t = +state.slice(5), p = parseInt(text, 10);
      if (!(p >= 0 && p <= 100)) return send({ text: 'Потрібне число від 0 до 100.' });
      await setDiscount(env, t, p, who); return send(await tableView(env, t));
    }
    const num = parseFloat(text.replace(',', '.').replace(/\s/g, ''));
    if (state === 'shopen' && admin) {
      if (!(num >= 0)) return send({ text: 'Потрібне число — скільки грошей у касі (розмін). Натисніть «🔓 Відкрити касу» ще раз.' });
      const r = await openShift(env, num, who); if (r.error) return send({ text: r.error });
      return send(await cashView(env));
    }
    if (state === 'shclose' && admin) {
      const counted = /^[-–—]$|^без/i.test(text) ? null : num;
      if (counted !== null && !(counted >= 0)) return send({ text: 'Напишіть число (скільки грошей у касі) або «-», щоб не рахувати.' });
      const r = await closeShift(env, counted, who, true); if (r.error) return send({ text: r.error });
      return send({ text: zText(r.z) + '\n\n🖨 Z-звіт надруковано.' });
    }
    if (state === 'float' && admin) {
      if (!(num >= 0)) return send({ text: 'Потрібне число. Натисніть «🏦 Вказати розмін» ще раз.' });
      await setFloat(env, num); return send(await cashView(env));
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
      return send({ text: '🔑 Пароль адміністратора змінено. Повідомлення з паролем видалено з чату.' });
    }
    if (state === 'newwpass' && admin) {
      if (text.length < 3) return send({ text: 'Пароль закороткий (мінімум 3 символи).' });
      await env.DB.put('waiter_pass', text);
      return send({ text: '🔑 Пароль офіціанта змінено. Хто вже увійшов — лишається в системі (вийти їх можна в «👥 Персонал»).' });
    }
    if (state === 'stfadd' && admin) {
      const sm = text.match(/^(.+?)\s+(\d{4,6})(?:\s+(адмін|админ|admin))?$/i);
      if (!sm) return send({ text: 'Формат: <code>Назар 1234</code> або <code>Назар 1234 адмін</code>. Натисніть «➕ Додати» ще раз.' });
      const r = await addStaff(env, sm[1], sm[2], sm[3] ? 'admin' : 'waiter');
      if (r.error) return send({ text: '⚠️ ' + r.error });
      return send(await staffView(env));
    }
  }

  // вхід адміністратора — з будь-якого чату
  if (low === '/admin' || text === W.admin) {
    if (admin) { await env.DB.delete('kbw:' + uid); return send({ text: ADMIN_HELP(env) }, ADMIN_KB); }
    await env.DB.put('st:' + uid, 'login', { expirationTtl: 300 });
    track = true; // запрошення до входу теж приберемо при виході
    return send({ text: '🔐 Введіть пароль адміністратора (повідомлення одразу видалиться):' }, { remove_keyboard: true });
  }
  // без входу — лише запит пароля офіціанта
  if (!waiter) {
    await env.DB.put('st:' + uid, 'wlogin', { expirationTtl: 3600 });
    return send({ text: '🔑 Цей бот — для персоналу VARVAR.\nВведіть пароль офіціанта (повідомлення одразу видалиться):' }, { remove_keyboard: true });
  }

  if (m.photo) return send({ text: admin ? await handleMenuPhoto(m, env, tg) : '🔐 Змінювати фото може лише адміністратор.' });
  if (!text) return;
  let x;
  // --- офіціант ---
  if (low === '/start' || low === '/help' || text === W.help || low === 'допомога' || low === 'help') return send({ text: admin ? ADMIN_HELP(env) : HELP(env) });
  if (text === W.order || low === '/order' || low === 'замовлення') return send(await tablePick(env, (await openTables(env)).map(r => r.t), tablesCount(env)));
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
  const ADM = [A.cash, A.expense, A.reports, A.closed, A.top, A.del, A.menu, A.wifi, A.staff, A.pass, A.wpass, A.waiter, A.logout, A.delClosed, A.reset];
  const admOnly = ADM.includes(text) || /^(\/revenue|\/wifi|\/menu|виручка|каса|звіти|витрата|видалити стіл)/.test(low);
  if (admOnly && !admin) return send({ text: `🔐 Це доступно лише адміністратору. Натисніть «${W.admin}».` });
  if (text === A.cash || low === 'каса') return send(await cashView(env));
  if (text === A.expense || low === 'витрата') { await env.DB.put('st:' + uid, 'exp', { expirationTtl: 600 }); return send({ text: '💸 Напишіть суму і на що, наприклад:\n<code>450 овочі на ринку</code>' }); }
  if (text === A.reports || low === '/revenue' || low === 'виручка' || low === 'звіти') return send(await reportsView(env));
  if (text === A.closed || text === A.delClosed) return send(await closedView(env));
  if (text === A.top) return send(await topView(env));
  if (text === A.del) return send(await pickTable(env, '🗑 Який стіл видалити? (помилковий або тестовий — у виручку не піде)', 'del'));
  if (text === A.reset) return send({ text: '♻️ <b>Обнулити все?</b>\nЗітруться: звіти, виручка, закриті рахунки, топ страв, стрічка подій і ВСІ відкриті столи.\nМеню, Wi‑Fi, персонал і паролі залишаться.', markup: { inline_keyboard: [[{ text: '⚠️ Так, обнулити', callback_data: 'rst1' }, { text: 'Ні', callback_data: 'no' }]] } });
  if (text === A.menu || low === '/menu') return send({ text: MENU_HELP });
  if (text === A.wifi || low === '/wifi') return send(await wifiView(env));
  if (text === A.staff) return send(await staffView(env));
  if (text === A.pass) { await env.DB.put('st:' + uid, 'newpass', { expirationTtl: 300 }); return send({ text: '🔑 Напишіть новий пароль адміністратора (мінімум 4 символи). Повідомлення одразу видалиться.' }); }
  if (text === A.wpass) { await env.DB.put('st:' + uid, 'newwpass', { expirationTtl: 300 }); return send({ text: '🔑 Напишіть новий пароль для офіціантів. Повідомлення одразу видалиться.' }); }
  if (text === A.waiter) { await env.DB.put('kbw:' + uid, '1', { expirationTtl: ADMIN_TTL }); return send({ text: `Звичайні кнопки. Вхід адміністратора зберігається — «${W.admin}», щоб повернутись.` }, KEYBOARD); }
  if (text === A.logout) {
    await env.DB.delete('adm:' + uid); await env.DB.delete('kbw:' + uid);
    await remember(env, uid, chat, [m.message_id]); await purgeAdminChat(env, uid); track = false;
    return send({ text: '🚪 Ви вийшли з режиму адміністратора. Переписку адмін-режиму видалено з чату.' }, KEYBOARD);
  }

  // --- замовлення від офіціанта текстом: «номер столу» + рядки «страва кількість» ---
  if (text.includes('\n')) {
    const d = parseWaiterOrder(await getMenu(env), text, tablesCount(env));
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
  if (!admin && !(await isWaiter(env, uid))) return answer('🔑 Спершу увійдіть: напишіть боту і введіть пароль офіціанта');
  const edit = (text, markup) => tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: markup || { inline_keyboard: [] } });
  const send = async (v) => {
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', reply_markup: v.markup || (admin ? ADMIN_KB : KEYBOARD) });
    if (admin) await remember(env, uid, chat, [await msgId(r)]);
    return r;
  };
  const [act, arg, oid, opt] = (q.data || '').split(':');
  const who = q.from?.first_name || '';
  const confirm = (text, yes) => send({ text, markup: { inline_keyboard: [[{ text: '✅ Так', callback_data: yes }, { text: 'Ні', callback_data: 'no' }]] } });

  if (act === 'acc') { // ✅ Прийняв — гість бачить статус на сайті, POS — у стрічці
    const html = q.message.text ? esc(q.message.text) : '';
    await acceptOrder(env, oid, who, { editTg: false });
    await edit(`${html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, { inline_keyboard: [[{ text: '🧾 Закрити стіл ' + arg, callback_data: 'cls:' + arg }]] });
    return answer('Прийнято');
  }
  if (act === 'o') { // замовлення кнопками
    const r = await obCallback(env, uid, q.data.split(':').slice(1));
    if (r.expired) { await edit('⌛ Замовлення застаріло. Почніть заново: «➕ Замовлення».'); return answer(''); }
    if (r.cancel) { await edit('✖ Замовлення скасовано.'); return answer(''); }
    if (r.tablePick) { const v = await tablePick(env, (await openTables(env)).map(x => x.t), tablesCount(env)); await edit(v.text, v.markup); return answer(''); }
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
  if (act === 'wok') { // підтвердження замовлення офіціанта (текстом)
    const d = await env.DB.get('draft:' + arg, 'json');
    if (!d) { await edit('⌛ Чернетка застаріла або вже додана. Надішліть замовлення ще раз.'); return answer(''); }
    await env.DB.delete('draft:' + arg);
    const r = await addWaiterOrder(env, d, who);
    if (!r) { await edit('Нічого додати.'); return answer(''); }
    await edit(`✅ <b>Додано до столу ${d.table}</b> (${esc(who)}, ${hhmm()})\n${r.lines.map(esc).join('\n')}\nСума: <b>${money(r.sum)}</b>\n\n💰 Разом за стіл: <b>${money(r.total)}</b>`,
      { inline_keyboard: [[{ text: `🪑 Стіл ${d.table}`, callback_data: 'tbl:' + d.table }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + d.table }]] });
    return answer('Додано');
  }
  if (act === 'clsok') { await edit(closedText(await closeTable(env, +arg, who, oid === 'card' ? 'card' : 'cash', opt !== 'np'))); return answer('Закрито'); }
  if (act === 'pre') return answer(await precheck(env, +arg, who) ? '🖨 Пречек відправлено на принтер' : `Стіл ${arg} порожній`);
  if (act === 'dsc') { // знижка
    const b = await getBill(env, arg); if (!b.total) return answer(`Стіл ${arg} порожній`);
    await send({ text: `% <b>Знижка для столу ${arg}</b> (${money(b.total)})${b.disc ? `\nЗараз: ${b.disc}%` : ''}`, markup: { inline_keyboard: [
      [5, 10, 15, 20].map(p => ({ text: p + '%', callback_data: `dscs:${arg}:${p}` })), [25, 30, 50].map(p => ({ text: p + '%', callback_data: `dscs:${arg}:${p}` })).concat([{ text: '✏️ Свій %', callback_data: 'dscc:' + arg }]),
      [{ text: '✖ Без знижки', callback_data: `dscs:${arg}:0` }]] } });
    return answer('');
  }
  if (act === 'dscs') { const b = await setDiscount(env, +arg, +oid, who); if (!b) return answer('Стіл порожній'); const v = await tableView(env, +arg); await edit(v.text, v.markup); return answer(+oid ? `Знижка ${oid}%` : 'Знижку прибрано'); }
  if (act === 'dscc') { await env.DB.put('st:' + uid, 'dscc:' + arg, { expirationTtl: 300 }); return answer('Напишіть відсоток знижки числом'); }
  if (act === 'mv') { // перенос / об'єднання
    const b = await getBill(env, arg); if (!b.total) return answer(`Стіл ${arg} порожній`);
    const open = new Set((await openTables(env)).map(r => r.t));
    await send({ text: `↔️ <b>Стіл ${arg}</b> — куди перенести?\n<i>• — зайнятий стіл: рахунки об'єднаються</i>`, markup: { inline_keyboard: [...tablesGrid(env, 'mvt:' + arg, +arg).map(r => r.map(x => { const n = +x.text; return { text: open.has(n) ? `• ${n}` : x.text, callback_data: x.callback_data }; })), [{ text: 'Скасувати', callback_data: 'no' }]] } });
    return answer('');
  }
  if (act === 'mvt') { const r = await moveTable(env, +arg, +oid, who); if (!r) return answer('Не вдалось'); await edit(r.merged ? `🔗 Стіл ${arg} об'єднано зі столом ${oid}.` : `↔️ Стіл ${arg} перенесено на стіл ${oid}.`); await send(await tableView(env, +oid)); return answer('Готово'); }
  if (act === 'pqr') { // вибір столу для QR
    await send({ text: '🔳 <b>QR меню</b> — для якого столу?', markup: { inline_keyboard: [...tablesGrid(env, 'pqrt'), [{ text: 'Без столу', callback_data: 'pqrt:0' }]] } });
    return answer('');
  }
  if (act === 'pqrt') { await queuePrint(env, 'qr', QR_PRINT(+arg)); return answer(`🖨 QR${+arg ? ' столу ' + arg : ''} відправлено на принтер`); }
  if (act === 'ptest') { await queuePrint(env, 'test', TEST_PRINT()); return answer('🖨 Тест відправлено'); }
  if (act === 'tbl') { await send(await tableView(env, +arg)); return answer(''); }
  if (act === 'ed') { const v = await editView(env, +arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'rm') {
    const it = billItems(await getBill(env, +arg))[+oid];
    const r = it ? await removeOne(env, +arg, it.name, who) : null;
    const v = await editView(env, +arg, r ? `🗑 Прибрано: 1× ${esc(r.name)} (−${r.unit} грн)` : ''); await edit(v.text, v.markup); return answer(r ? 'Прибрано' : '');
  }
  if (act === 'back') {
    const it = await setHidden(env, arg, false);
    const v = await stopView(env); await edit(v.text, v.markup); return answer(it ? `${it.name.uk} знову в меню` : 'Не знайдено');
  }
  // лише адміністратор
  if (['del', 'delok', 'wifiask', 'wifiok', 'dc', 'dcok', 'cv', 'cvb', 'cvp', 'rst1', 'rst2', 'exs', 'exdel', 'exdelok', 'float', 'exlist', 'shop', 'shcl', 'rp', 'stfadd', 'stfdel', 'wout'].includes(act) && !admin) return answer('🔐 Лише для адміністратора');
  if (act === 'del') {
    const b = await getBill(env, arg);
    if (!b.total) return answer(`Стіл ${arg} вже порожній`);
    await confirm(`🗑 Видалити <b>стіл ${arg}</b> (${money(b.total)})? Сума НЕ піде у виручку.`, 'delok:' + arg); return answer('');
  }
  if (act === 'delok') { const r = await deleteTable(env, +arg, who); await edit(r ? `🗑 <b>Стіл ${arg} видалено</b> (${money(r.sum)}) — у виручку не піде.` : `Стіл ${arg} вже порожній.`); return answer('Видалено'); }
  if (act === 'wifiask') { await confirm('🗑 Скинути всі мережі? Замовлення не прийматимуться, поки не додасте мережу знову через admin.html.', 'wifiok'); return answer(''); }
  if (act === 'wifiok') { await env.DB.put('venue_ips', '[]'); await edit('📶 Усі мережі скинуто. Додайте мережу закладу через admin.html.'); return answer('Скинуто'); }
  if (act === 'cv') { const v = await closedOne(env, arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'cvb') { const v = await closedView(env); await edit(v.text, v.markup); return answer(''); }
  if (act === 'cvp') return answer(await reprintClosed(env, arg, who) ? '🖨 Чек відправлено на принтер' : 'Немає переліку страв');
  if (act === 'dc') { await confirm('🧹 Видалити цей закритий рахунок? Сума відніметься з виручки.', 'dcok:' + arg); return answer(''); }
  if (act === 'dcok') { const x = await delClosed(env, arg); await edit(x ? `🧹 Рахунок стола ${x.t} (${money(x.sum)}, ${x.at}) видалено з виручки.` : 'Цей рахунок уже видалено.'); return answer('Видалено'); }
  if (act === 'rst1') { await edit('⚠️ Точно? Це не можна скасувати.', { inline_keyboard: [[{ text: '♻️ Так, усе обнулити', callback_data: 'rst2' }, { text: 'Ні', callback_data: 'no' }]] }); return answer(''); }
  if (act === 'rst2') { const n = await resetAll(env); await edit(`♻️ <b>Усе обнулено</b> (${n} записів): звіти, каса, витрати, закриті рахунки, топ страв, стрічка, відкриті столи.\nМеню, Wi‑Fi, персонал і паролі не чіпались.`); return answer('Обнулено'); }
  if (act === 'exs') {
    const e = await env.DB.get('expd:' + arg, 'json');
    if (!e) { await edit('⌛ Застаріло. Натисніть «💸 Витрата» ще раз.'); return answer(''); }
    await env.DB.delete('expd:' + arg);
    await addExpense(env, { ...e, src: oid === 'card' ? 'card' : 'cash', at: hhmm(), by: who });
    await edit(`✅ Витрату записано: <b>${money(e.sum)}</b> ${oid === 'card' ? '💳 з карти' : '💵 з каси'}${e.note ? ` — ${esc(e.note)}` : ''}`); return answer('Записано');
  }
  if (act === 'exlist') { await send(await expListView(env)); return answer(''); }
  if (act === 'exdel') { await confirm('🗑 Видалити цю витрату?', 'exdelok:' + arg); return answer(''); }
  if (act === 'exdelok') { await delExpense(env, +arg); await edit('🗑 Витрату видалено.'); return answer(''); }
  if (act === 'shop') { if (await getShift(env)) return answer('Зміна вже відкрита'); await env.DB.put('st:' + uid, 'shopen', { expirationTtl: 600 }); await send({ text: '🔓 <b>Відкриття каси</b>\nСкільки грошей у касі на початок (розмін)? Напишіть число:' }); return answer(''); }
  if (act === 'shcl') {
    const d = await shiftData(env); if (!d.open) return answer('Каса вже закрита');
    await env.DB.put('st:' + uid, 'shclose', { expirationTtl: 900 });
    await send({ text: `🔒 <b>Закриття каси</b>\nМає бути в касі: <b>${money(d.inBox)}</b>${d.openTables ? `\n⚠️ Ще відкрито столів: ${d.openTables} (${money(d.openSum)})` : ''}\n\nПорахуйте готівку і напишіть суму (або «-», щоб не рахувати):` });
    return answer('');
  }
  if (act === 'rp') { const v = await repView(env, arg, oid || 'x'); await edit(v.text, v.markup); return answer(''); }
  if (act === 'float') { await env.DB.put('st:' + uid, 'float', { expirationTtl: 600 }); await send({ text: '🏦 Скільки грошей у касі на початок дня (розмін)? Напишіть число:' }); return answer(''); }
  if (act === 'stfadd') { await env.DB.put('st:' + uid, 'stfadd', { expirationTtl: 600 }); await send({ text: '👥 Напишіть імʼя і PIN (4–6 цифр):\n<code>Назар 1234</code> — офіціант\n<code>Назар 1234 адмін</code> — адміністратор\n(повідомлення одразу видалиться)' }); return answer(''); }
  if (act === 'stfdel') { await delStaff(env, arg); const v = await staffView(env); await edit(v.text, v.markup); return answer('Видалено'); }
  if (act === 'wout') { await env.DB.delete('wlog:' + arg); await env.DB.delete('adm:' + arg); const v = await staffView(env); await edit(v.text, v.markup); return answer('Вийшов'); }
  if (act === 'no') { await edit('Скасовано.'); return answer(''); }
  return answer('');
}
