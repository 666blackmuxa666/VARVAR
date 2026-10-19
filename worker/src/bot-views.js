// 🤖 Бот персоналу — екрани й клавіатури: столи, рахунок, каса, звіти, кухня, закриті, стоп-лист, Wi‑Fi, персонал, броні, рух грошей, Z
import { fisIds, fisRets } from './fiscal.js';
// (частина bot.js — інші файли імпортують з bot.js, як і раніше)
import { fmtPhone } from './delivery.js';
import { getMenu } from './menu.js';
import { L, MOVE_ALL, TZ, balances, billItems, closedRec, dayKey, dayZData, delClosed, discAmt, esc, getBill, getCfg, getClosed, getExp, getKq, getMov, getStaff, getVoids, hhmm, isDay, kitchenPct, kitchenStats, loggedWaiters, money, openTables, payLabel, payable, reportBreakdown, reportsData, tablesCount, tg, tipBalances, topData } from './ops.js';
import { getAtt, shiftIn, shiftOut } from './pay.js';
import { PERMS, SENSITIVE } from './perm.js';
import { promoFill, promoFillMany } from './promo.js';
import { bkButtons, bkLabel, bookEditFields, bookList, bookManual } from './site.js';
import { tn } from './tn.js';
import { siteLink } from './venue.js';

export const ADMIN_TTL = 12 * 3600;

// ---------- клавіатури ----------
export const W = { loy: '🎁 Гості й акції', order: '➕ Замовлення', kitchen: '👨‍🍳 Кухня', tables: '📋 Столи', close: '🧾 Закрити стіл', stop: '⛔ Стоп-лист', help: '❓ Допомога', plan: '📋 Мій план', admin: '🔐 Адмін', go: '🛵 Доставка', book: '📅 Броні', learn: '🎓 Навчання' };
export const A = { cash: '💰 Каса', expense: '💸 Витрата', reports: '📊 Звіти', closed: '📜 Закриті сьогодні', top: '🏆 Топ страв', del: '🗑 Видалити стіл', menu: '📖 Редагувати меню', wifi: '📶 Wi‑Fi',
  staff: '👥 Персонал', waiter: '⬅️ Режим офіціанта', logout: '🚪 Вийти',
  calc: '🧮 Розрахунок', pay: '👷 Зарплата', delClosed: '🧹 Видалити закритий', reset: '♻️ Обнулити все' }; // ТЕСТ: delClosed і reset — прибрати, коли скаже власник
export const kb = rows => ({ keyboard: rows.map(r => r.map(text => ({ text }))), resize_keyboard: true, is_persistent: true });
export const KEYBOARD = kb([[W.order], [W.tables, W.close], [W.kitchen, W.go], [W.stop, W.book], [W.loy, W.plan], [W.help, W.admin], [W.learn]]);
export const ADMIN_KB = kb([[W.order], [A.cash, A.expense], [A.reports, A.closed], [A.calc, A.pay], [A.top, A.del], [W.tables, W.stop], [W.kitchen, W.go], [W.book, W.loy], [A.menu, A.wifi], [A.staff, W.plan], [A.delClosed, A.reset], [A.waiter, A.logout]]);

export const COMMANDS = [
  ['tables', 'Відкриті столи і рахунки'], ['table', 'Деталі столу: /table 5'], ['close', 'Закрити рахунок столу'],
  ['stoplist', 'Стоп-лист (чого немає)'], ['admin', 'Режим адміністратора (пароль)'], ['help', 'Допомога'],
].map(([command, description]) => ({ command, description }));

export const POS_URL = env => siteLink('pos.html'); /* 🌐 свій заклад: posatom.online/<заклад>/pos.html */
export const HELP = env => `<b>Бот закладу</b>

${W.order} — записати замовлення кнопками: стіл → категорія → страва → кількість
${W.tables} — відкриті столи і суми (у столі: пречек, знижка, перенос, редагування)
${W.close} — закрити рахунок (гість розрахувався)
${W.stop} — чого немає / повернути в меню
${W.loy} — рівні й акції; <code>клієнт 0501234567</code> — картка гостя
<code>гість 5 0501234567</code> — телефон гостя на рахунок (кешбек); <code>бонус 5 50</code> — списати бонуси
${W.admin} — режим адміністратора (для ролі «адмін»)
<code>принтер</code> — стан принтера, тестовий друк, QR

<b>Записати замовлення текстом:</b>
<code>1
гранд 2
мумо 3
пепсі 0.5 4</code>
Перший рядок — номер столу, далі «страва кількість».

<b>Текстом:</b> <code>стіл 5</code> · <code>закрити 5</code> · <code>стоп мєско</code> · <code>повернути мєско</code>

🖥 Касова програма (планшет/комп'ютер): ${POS_URL(env)}`;

export const ADMIN_HELP = env => `🔐 <b>Режим адміністратора</b>

${A.cash} — каса на сьогодні: на початок + готівка − витрати = має бути в касі
${A.expense} — записати витрату (покупки), з каси або з карти
${A.reports} — виручка (💵/💳), знижки, витрати, чистими
${A.closed} — закриті рахунки: деталі, повторний друк, видалення з виручки
${A.top} — що найбільше замовляють цього місяця
${A.del} — прибрати помилковий/тестовий стіл (не йде у виручку)
${A.menu} — ціни, склад, нові страви, фото
${A.wifi} — мережі закладу для замовлень
${A.staff} — PIN-коди працівників для касової програми, хто увійшов у бот
${A.delClosed} / ${A.reset} — тестові
${A.waiter} — звичайні кнопки (вхід зберігається)
${A.logout} — вийти з режиму адміністратора

Вхід діє 12 годин. 🖥 Каса: ${POS_URL(env)}`;

// ---------- адмін-сесія: прибирання переписки ----------
// Telegram: callback_data до 64 БАЙТІВ (кирилиця — 2 байти на літеру)
export const cb64 = s => { const e = new TextEncoder(); while (e.encode(s).length > 64) s = s.slice(0, -1); return s; };
export async function remember(env, uid, chat, ids) {
  const k = 'admmsg:' + uid; return L(env, k, async () => { const d = (await env.DB.get(k, 'json')) || { chat, ids: [] };
  d.chat = chat; d.ids = [...d.ids, ...ids.filter(Boolean)].slice(-1000);
  await env.DB.put(k, JSON.stringify(d), { expirationTtl: 2 * 86400 }); });
}
export async function purgeAdminChat(env, uid) {
  const d = await env.DB.get('admmsg:' + uid, 'json'); await env.DB.delete('admmsg:' + uid);
  if (!d?.ids?.length) return;
  const ids = [...new Set(d.ids)];
  for (let i = 0; i < ids.length; i += 100) await tg(env, 'deleteMessages', { chat_id: d.chat, message_ids: ids.slice(i, i + 100) });
}
export const msgId = async r => { try { return (await r.json()).result?.message_id; } catch { return null; } };
export const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);

// ---------- екрани ----------
const billSum = b => b.disc || b.promo?.sum ? `${money(payable(b))} <i>(${[b.disc ? `знижка ${b.disc}%` : '', b.promo?.sum ? `🎁 акції −${b.promo.sum}` : ''].filter(Boolean).join(', ')})</i>` : money(b.total);
const promoTxt = b => (b.promo?.lines || []).filter(l => l.amt || !l.info).map(l => `\n🎁 ${esc(l.n)}${l.amt ? ` −${money(l.amt)}` : ''}`).join(''); // акції й рівень (promo.js)
export async function tablesView(env) {
  const rows = await openTables(env);
  if (!rows.length) return { text: '📋 Відкритих столів немає', markup: { inline_keyboard: [[{ text: '⏳ Черга', callback_data: 'wl:list' }]] } };
  await promoFillMany(env, rows.map(r => r.b));
  const sum = rows.reduce((s, r) => s + payable(r.b), 0);
  return {
    text: `📋 <b>Відкриті столи</b>\n` + rows.map(r => `🪑 Стіл ${tn(r.t)} — <b>${billSum(r.b)}</b> · замовлень: ${r.b.orders}${r.b.opened ? ` · з ${hhmm(r.b.opened)}` : ''}${r.b.check ? ' · 🧾 чек' : ''}`).join('\n') + `\n\nРазом у залі: <b>${money(sum)}</b>`,
    markup: { inline_keyboard: [...chunk(rows.map(r => ({ text: `Стіл ${tn(r.t)}`, callback_data: 'tbl:' + r.t })), 4), [{ text: '⏳ Черга', callback_data: 'wl:list' }]] },
  };
}
export async function tableView(env, t) {
  const b = await getBill(env, t);
  if (!b.total) return { text: `🪑 Стіл ${tn(t)}: відкритого рахунку немає` };
  await promoFill(env, b).catch(() => {});
  const log = (b.log || []).map(o => `<b>${o.at}</b> ${esc(o.kind)}\n${o.lines.map(esc).join('\n')}${o.comment ? `\n💬 ${esc(o.comment)}` : ''}`).join('\n\n');
  return {
    text: `🪑 <b>Стіл ${tn(t)}</b> — ${billSum(b)}${b.disc ? `\nСума ${money(b.total)} − знижка ${b.disc}% (${money(discAmt(b))})` : ''}${promoTxt(b)}${b.tip ? `\n💝 Чайові: ${money(b.tip)}` : ''}${b.ktip ? `\n👨‍🍳 Подяка кухні: ${money(b.ktip)}` : ''}${b.tip || b.ktip ? ` (разом ${money(payable(b) + (b.tip || 0) + (b.ktip || 0))})` : ''}${b.check ? ' · 🧾 просять чек' : ''}\n\n${log || '(деталі недоступні)'}`,
    markup: { inline_keyboard: [
      [{ text: '🖨 Пречек', callback_data: 'pre:' + t }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + t }],
      [{ text: '➕ Дозамовити', callback_data: 'o:t:' + t }, { text: '✏️ Редагувати чек', callback_data: 'ed:' + t }],
      [{ text: '% Знижка', callback_data: 'dsc:' + t }, ...(b.tip ? [{ text: '✖ Прибрати чайові', callback_data: 'tipx:' + t }] : [])], [{ text: '↔️ Перенести / об\'єднати', callback_data: 'mv:' + t }, { text: '✂️ Розділити', callback_data: 'spl:' + t }]] },
  };
}
export const VOID_R = ['Гість передумав', 'Помилка офіціанта', 'Довго чекали', 'Не сподобалось', 'Немає продукту', 'Брак / зіпсовано'];
export async function editView(env, t, note = '') {
  const b = await getBill(env, t);
  if (!b.total) return { text: `🪑 Стіл ${tn(t)}: відкритого рахунку немає${note ? '\n\n' + note : ''}` };
  const items = billItems(b);
  return {
    text: `✏️ <b>Стіл ${tn(t)}</b> — ${billSum(b)}\nНатисніть позицію, щоб скасувати 1 шт. (потрібна причина — її видно у звітах)${note ? '\n\n' + note : ''}`,
    markup: { inline_keyboard: [...items.map((it, i) => [{ text: `➖ ${it.name} · ${it.q} шт · ${it.sum}`, callback_data: `rm:${t}:${i}` }]), [{ text: '✅ Готово', callback_data: 'tbl:' + t }]] },
  };
}
export const payButtons = t => ({ inline_keyboard: [[{ text: '💵 Готівка + 🖨 чек', callback_data: `clsok:${t}:cash` }, { text: '💳 Карта + 🖨 чек', callback_data: `clsok:${t}:card` }],
  [{ text: '💵 Готівка, без чека', callback_data: `clsok:${t}:cash:np` }, { text: '💳 Карта, без чека', callback_data: `clsok:${t}:card:np` }], [{ text: '🖨 Пречек', callback_data: 'pre:' + t }, { text: '➗ Порівну', callback_data: 'eq:' + t }, { text: 'Скасувати', callback_data: 'no' }]] });
const PAY_PICK = { cash: '💵 готівка', card: '💳 карта' };
export async function closeAsk(env, t) {
  const b = await getBill(env, t);
  if (!b.total) return { text: `Стіл ${tn(t)} вже закритий.` };
  await promoFill(env, b).catch(() => {});
  const m = payButtons(t); if ((await getCfg(env)).iban) m.inline_keyboard.splice(2, 0, [{ text: '🏦 Переказ на рахунок (QR)', callback_data: 'ibq:' + t }]); // 🏦 як у касі
  return { text: `🧾 Закрити <b>стіл ${tn(t)}</b> на <b>${billSum(b)}</b>?${b.pay ? `\nГість хоче платити: ${PAY_PICK[b.pay]}` : ''}${b.tip ? `\n💝 Чайові: <b>${money(b.tip)}</b> → разом ${money(payable(b) + b.tip)}` : ''}\n\nЯк оплатили?`, markup: m };
}
export const closedText = r => r ? `✅ <b>Стіл ${tn(r.t)} закрито</b> — ${money(r.sum)}${r.tip ? ` + 💝 ${money(r.tip)} чайові` : ''}${r.disc ? ` (знижка ${money(r.disc)})` : ''} · ${payLabel(r.cash, r.card, r.ib)}` : 'Стіл вже закритий.';
export async function pickTable(env, title, act) {
  const rows = await openTables(env);
  if (!rows.length) return { text: 'Відкритих столів немає' };
  return { text: title, markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${tn(r.t)} · ${payable(r.b)}`, callback_data: `${act}:${r.t}` })), 2) } };
}
const fmtT = t => new Date(t).toLocaleString('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
export async function cashView(env) {
  const z = await dayZData(env), bal = await balances(env), tb = Object.entries(await tipBalances(env)).filter(([, v]) => v > 0);
  return {
    text: [`💰 <b>Гроші зараз</b>`, `💵 Готівка в касі: <b>${money(bal.cash)}</b>`, `💳 На картці: <b>${money(bal.card)}</b>`, `💰 Разом: <b>${money(bal.total)}</b>`, ...(bal.tipOwed ? [`   з них чайові до видачі ${money(bal.tipOwed)} → вільних <b>${money(bal.free)}</b>`] : []), '', `📅 <b>Сьогодні (${z.day.split('-').reverse().join('.')})</b>`,
      `Виручка: <b>${money(z.total)}</b>${z.tip ? ` (+ чайові ${money(z.tip)})` : ''} · чеків ${z.checks}${z.checks ? ` · сер. чек ${money(z.total / z.checks)}` : ''}`,
      `💵 Готівка: ${money(z.cash)} · 💳 Картка: ${money(z.card)}`,
      z.disc ? `🏷 Знижки: ${money(z.disc)}` : '',
      `💸 Витрати: ${money(z.exCash + z.exCard)} · 📈 чистими: <b>${money(z.net)}</b>`,
      z.mvCash || z.mvCard ? `🔁 Рух коштів: готівка ${money(z.mvCash)}${z.mvCard ? `, картка ${money(z.mvCard)}` : ''}` : '',
      z.openTables ? `⏳ Ще відкрито в залі: ${money(z.openSum)} (${z.openTables} ст.)` : '',
      ...(tb.length ? ['\n💝 <b>Чайові до видачі</b> (не виручка):', ...tb.map(([n, v]) => `👤 ${esc(n)}: ${money(v)}`)] : [])].filter(x => x !== '').join('\n'),
    markup: { inline_keyboard: [[{ text: '🧾 Z-звіт', callback_data: 'zday' }], [{ text: '🔁 Рух коштів', callback_data: 'mvl' }, { text: '🔒 Закриття каси (Z)', callback_data: 'zl' }], [{ text: '💸 Витрати сьогодні', callback_data: 'exlist' }], [{ text: '➕ Внести', callback_data: 'cmvp' }, { text: '➖ Вилучити', callback_data: 'cmvm' }, { text: '🔁 Обмін', callback_data: 'cmvx' }], [{ text: `👨‍🍳 Частка кухні від чайових: ${await kitchenPct(env)}%`, callback_data: 'kpct' }], ...await (async () => { const c = await getCfg(env); return [[{ text: `🏷 Макс. знижка офіціанта: ${c.discMax}%`, callback_data: 'cfg:discMax' }], [{ text: `⏱ Замовлення після QR: ${c.scanMin} хв`, callback_data: 'cfg:scanMin' }], [{ text: `🏦 Комісія банку (карта/онлайн): ${c.bankFee || 0}%`, callback_data: 'cfg:bankFee' }], [{ text: `🏆 Премія за рекорд дня: ${c.recBonus || 0} ₴`, callback_data: 'cfg:recBonus' }]]; })(), [{ text: '✏️ Звірити готівку', callback_data: 'rcn:cash' }, { text: '✏️ Звірити картку', callback_data: 'rcn:card' }], ...tb.map(([n, v]) => [{ text: `💝 Видано: ${n} · ${v}`, callback_data: cb64('tpay:' + n) }])] },
  };
}
export async function expListView(env) {
  const l = await getExp(env);
  if (!l.length) return { text: '💸 Сьогодні витрат немає.\n\nЩоб додати — кнопка «💸 Витрата».' };
  const ok = l.filter(e => !e.del);
  return {
    text: `💸 <b>Витрати за ${dayKey()}</b>\n` + l.map(e => `${e.del ? '🗑 <s>' : ''}${e.at} · ${money(e.sum)} · ${e.src === 'card' ? '💳' : '💵'} ${esc(e.note || '')}${e.by ? ` · ${esc(e.by)}` : ''}${e.del ? '</s>' : ''}`).join('\n') +
      `\n\nРазом: <b>${money(ok.reduce((s, e) => s + e.sum, 0))}</b>`,
    markup: l.length ? { inline_keyboard: chunk(l.map((e, i) => ({ e, i })).map(({ e, i }) => e.del ? { text: `↩️ ${e.sum} ${e.note || ''}`.slice(0, 40), callback_data: 'exbk:' + i } : { text: `🗑 ${e.sum} ${e.note || ''}`.slice(0, 40), callback_data: 'exdel:' + i }), 2) } : undefined,
  };
}
export async function reportsView(env) {
  const r = await reportsData(env);
  const line = (label, d) => `<b>${label}:</b> ${money(d.closed)} (💵 ${money(d.cash)} · 💳 ${money(d.card - (d.onl || 0))}${d.onl ? ` · 🌐 ${money(d.onl)}` : ''})\n   витрати ${money(d.exp)} · <b>чистими ${money(d.closed - d.exp)}</b> · столів ${d.tables}${d.tables ? ` · сер. чек ${money(d.closed / d.tables)}` : ''}${d.disc ? ` · знижки ${money(d.disc)}` : ''}${d.tip ? ` · чайові ${money(d.tip)} (не виручка)` : ''}`;
  const [d0, ...rest] = r.rows;
  return { text: [`📊 <b>Звіти</b>`, line(...d0), `У залі ще відкрито: <b>${money(r.open)}</b>`, '', ...rest.map(x => line(...x)), '',
    `<i>Виручка — закриті рахунки після знижок, без чайових. Чистими = виручка − витрати.</i>`, '', '🔎 <b>Детальніше</b> — оберіть період і розріз:'].join('\n'), markup: repMarkup('m') };
}
// детальні звіти: період × розріз (ті самі дані, що фільтри в POS)
const REP_P = { d: 'Сьогодні', y: 'Вчора', w: '7 днів', m: 'Цей місяць', pm: 'Минулий місяць', yr: 'Цей рік', all: 'За весь час' };
const REP_BY = { waiter: '👤 Офіціанти', tips: '💝 Чайові', group: '🍳 Кухня/бар', cat: '📂 Категорії', table: '🪑 Столи', ctrl: '🕵️ Контроль' };
export const CFG_NAME = { discMax: '🏷 Макс. знижка офіціанта, %', scanMin: '⏱ Скільки хвилин гість може замовляти після QR', bankFee: '🏦 Комісія банку за карту/онлайн, % (напр. 1.3)', recBonus: '🏆 Премія кожному на зміні за рекорд дня, ₴' };
const repMarkup = p => ({ inline_keyboard: [Object.entries(REP_P).slice(0, 3).map(([k, l]) => ({ text: (k === p ? '• ' : '') + l, callback_data: `rp:${k}:x` })), Object.entries(REP_P).slice(3).map(([k, l]) => ({ text: (k === p ? '• ' : '') + l, callback_data: `rp:${k}:x` })),
  ...chunk(Object.entries(REP_BY).map(([k, l]) => ({ text: l, callback_data: `rp:${p}:${k}` })), 3)] });
function repRange(p) {
  const now = Date.now(), today = dayKey(), [y, mo] = today.split('-').map(Number);
  if (p === 'd') return [today, today];
  if (p === 'y') { const d = dayKey(now - 86400e3); return [d, d]; }
  if (p === 'w') return [dayKey(now - 6 * 86400e3), today];
  if (p === 'pm') { const py = mo === 1 ? y - 1 : y, pmo = mo === 1 ? 12 : mo - 1; return [`${py}-${String(pmo).padStart(2, '0')}-01`, `${py}-${String(pmo).padStart(2, '0')}-${new Date(py, pmo, 0).getDate()}`]; }
  if (p === 'yr') return [`${y}-01-01`, today];
  if (p === 'all') return ['2026-09-01', today];
  return [today.slice(0, 8) + '01', today];
}
export async function repView(env, p, by) {
  const [from, to] = repRange(p);
  if (by === 'x') { const r = await reportBreakdown(env, from, to, 'waiter'); const ex = r.r.exp.reduce((a, e) => a + e.sum, 0), n = r.r.checks.length;
    return { text: `📊 <b>${REP_P[p]}</b> (${from} — ${to})\n\nВиручка: <b>${money(r.total)}</b> · чеків ${n}${n ? ` · сер. чек ${money(r.total / n)}` : ''}${(() => { const tp = r.r.checks.reduce((a, c) => a + c.tip, 0); return tp ? ` (+ чайові ${money(tp)})` : ''; })()}\n💵 ${money(r.r.checks.reduce((a, c) => a + c.cash, 0))} · 💳 ${money(r.r.checks.reduce((a, c) => a + c.card, 0))}\nВитрати ${money(ex)} · чистими <b>${money(r.total - ex)}</b>${await (async () => { const k = await kitchenStats(env, from, to); return k.length ? `\n⏱ Кухня: ${k.length} замовл. · сер. час <b>${Math.round(k.reduce((a, x) => a + x.mins, 0) / k.length)} хв</b> · понад 15 хв: ${k.filter(x => x.mins > 15).length}` : ''; })()}\n\nОберіть розріз:`, markup: repMarkup(p) }; }
  const r = await reportBreakdown(env, from, to, by);
  if (by === 'ctrl') { const v = r.r.voids;
    return { text: `🕵️ <b>Контроль · ${REP_P[p]}</b> (${from} — ${to})\n\n` + (r.ctrl.length ? r.ctrl.map(w => `👤 <b>${esc(w.name)}</b> — ${w.checks} чек. · ${money(w.sum)}\n   🚫 скасувань ${w.voidN} на ${money(w.voidSum)}${w.voidPct ? ` (${w.voidPct}%)` : ''}${w.tables ? ` · 🗑 столів ${w.tables} на ${money(w.tableSum)}` : ''}\n   🏷 знижок ${w.discN} на ${money(w.discSum)}${w.discMax ? ` (макс ${w.discMax}%)` : ''} · 💝 ${money(w.tip)}`).join('\n\n') : 'Немає даних') +
      (v.length ? `\n\n<b>Останні скасування:</b>\n` + v.slice(-25).reverse().map(x => `${x.d.slice(5)} ${x.at} · ст.${x.t} · ${esc(x.by)}: −${x.sum} ${esc(x.name)} — <i>${esc(x.reason)}</i>`).join('\n') : '') +
      (r.r.removed.length ? `\n\n🧹 Видалено з виручки: ${r.r.removed.length} на ${money(r.r.removed.reduce((a, x) => a + x.sum, 0))}` : ''), markup: repMarkup(p) }; }
  const unit = ['group', 'cat'].includes(by) ? 'шт' : 'чек.';
  return { text: `📊 <b>${REP_P[p]} · ${REP_BY[by]}</b> (${from} — ${to})\n\n` + (r.rows.length ? r.rows.slice(0, 40).map(([k, [q, sm]]) => `${esc(k)} — <b>${money(sm)}</b> · ${q} ${unit}`).join('\n') : 'Немає даних') + `\n\nВиручка за період: <b>${money(r.total)}</b>`, markup: repMarkup(p) };
}
// 👨‍🍳 черга кухні (те саме, що на планшеті кухні)
export async function kitchenView(env, note = '') {
  const l = (await getKq(env)).filter(e => !e.done);
  if (!l.length) return { text: (note ? note + '\n\n' : '') + '👨‍🍳 <b>Кухня</b>: черга порожня ✅' };
  l.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.ts - b.ts);
  const min = e => Math.round((Date.now() - e.ts) / 60000);
  return { text: (note ? note + '\n\n' : '') + `👨‍🍳 <b>Кухня — у черзі ${l.length}</b>\n\n` + l.map(e => `${e.urgent ? '⚡ ' : ''}<b>Стіл ${tn(e.t)}</b> · ${e.at} · ⏱ ${min(e)} хв${e.start ? ' · 🔥 готується' : ''}${e.tw ? ' · 🥡' : ''} · ${esc(e.by)}\n` +
      e.items.map(x => `${x.cancel ? '❌ <s>' : x.done ? '✅ ' : '▫️ '}${x.q}× ${esc(x.n)}${x.cancel ? '</s> СКАСОВАНО' : ''}`).join('\n') + (e.comment ? `\n💬 ${esc(e.comment)}` : '')).join('\n\n'),
    markup: { inline_keyboard: [...l.slice(0, 12).map(e => [...(e.start ? [] : [{ text: `🔥 Готую ${e.t}`, callback_data: 'kst:' + e.id }]), { text: `✅ Стіл ${tn(e.t)} — все готово`, callback_data: 'kdn:' + e.id }]), [{ text: '🔄 Оновити', callback_data: 'kv' }]] } };
}
export async function closedView(env, day = dayKey()) {
  const list = await getClosed(env, day);
  if (!list.length && !(day === dayKey() && (await getVoids(env)).some(v => !v.table))) return { text: `📜 За ${day} закритих рахунків ще немає.` };
  const gone = x => x.del || x.rm;
  const ok = list.filter(x => !gone(x)), sum = ok.reduce((s, x) => s + x.sum, 0);
  const vb = day === dayKey() ? (await getVoids(env)).filter(v => !v.table).slice(-15).map(v => ({ text: `↩️ ${v.at} стіл ${tn(v.t)}: ${v.name}`.slice(0, 60), callback_data: 'vbk:' + v.ts })) : [];
  const btns = list.map((x, k) => ({ x, k })).filter(({ x }) => !gone(x) || (x.dishes?.length && !x.reopen && !x.restored)).map(({ x, k }) => ({ text: `${gone(x) ? '🗑' : '🧾'} ${x.at} · стіл ${tn(x.t)} · ${x.sum}`, callback_data: 'cv:' + (x.id || k) }));
  btns.push(...vb);
  return { markup: btns.length ? { inline_keyboard: chunk(btns, 1) } : undefined, text: `📜 <b>Закриті рахунки за ${day}</b>\n` + list.map(x => `${gone(x) ? '🗑' : '✅'} ${x.at} · стіл ${tn(x.t)} · ${money(x.sum)}${gone(x) ? '' : ' · ' + payLabel(x.cash ?? x.sum, x.card || 0, x.ib)}${x.by ? ` · ${esc(x.by)}` : ''}${x.reopen ? ' (↩️ відкрито знову)' : x.restored ? ' (↩️ відновлено)' : gone(x) ? ' (видалено)' : ''}`).join('\n') + `\n\nРазом: <b>${money(sum)}</b> · рахунків ${ok.length}\n💵 ${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))} · 💳 ${money(ok.reduce((s, x) => s + (x.card || 0), 0))}` };
}
export async function closedOne(env, ref) {
  const x = await closedRec(env, ref);
  if (!x) return { text: 'Рахунок не знайдено.' };
  const lines = (x.dishes || []).map(([n, q, sum]) => `${q}× ${n} — ${sum}`);
  const gone = x.del || x.rm;
  const fi = fisIds(x.fis), fis = !x.fis ? '' : x.fis.st === 'err' ? `\n\n🧾⚠️ Checkbox: ${esc(x.fis.err || 'помилка')}` : x.fis.ibc ? '\n\n🏦 Переказ на рахунок — без фіскального чека' : fi.length ? '\n\n' + fi.map((id, i) => `🧾 <a href="https://check.checkbox.ua/${id}">Фіскальний чек${fi.length > 1 ? ' ' + (i + 1) : ''}</a>`).join(' · ') : fisRets(x.fis) ? '\n\n🧾 Фіскальний чек повернено' : '';
  return {
    text: `🧾 <b>Стіл ${tn(x.t)}</b> · закрито о ${x.at}${x.by ? ` · ${esc(x.by)}` : ''}\n\n${lines.length ? lines.map(esc).join('\n') : '<i>(перелік страв не збережено — рахунок закрито до оновлення)</i>'}\n\n${x.disc ? `Сума ${money(x.gross)} − знижка ${x.disc}%\n` : ''}Разом: <b>${money(x.sum)}</b>${x.tip ? ` (в т.ч. 💝 чайові ${money(x.tip)})` : ''} · ${payLabel(x.cash ?? x.sum, x.card || 0, x.ib)}${x.voids?.length ? `\n\n🚫 <b>Скасування:</b>\n${x.voids.map(v => `${v.at} −${v.sum} ${esc(v.name)} — <i>${esc(v.reason)}</i> (${esc(v.by)})`).join('\n')}` : ''}${gone ? '\n\n🗑 Видалено з виручки' : ''}${fis}`,
    markup: { inline_keyboard: [[...(lines.length ? [{ text: '🖨 Друкувати чек', callback_data: 'cvp:' + ref }] : []), ...(gone ? [] : [{ text: '🗑 Видалити з виручки', callback_data: 'dc:' + ref }])],
      [...(!x.del && !x.reopen && lines.length ? [{ text: '↩️ Відкрити знову', callback_data: 'cvro:' + ref }] : []), ...(x.rm && !x.reopen && !x.del ? [{ text: '↩️ Повернути у виручку', callback_data: 'cvbk:' + ref }] : []), ...(x.del && !x.restored && lines.length ? [{ text: '↩️ Відновити стіл', callback_data: 'tbk:' + ref }] : [])],
      ...(gone ? [] : [[{ text: '✏️ Редагувати чек', callback_data: 'ce:' + ref }]]),
      ...(x.fis?.st === 'err' ? [[{ text: '🧾 Повторити фіскальний чек', callback_data: 'fsr:' + ref }]] : []),
      [{ text: '⬅️ Назад', callback_data: 'cvb' }]] },
  };
}
// ✏️ редагування закритого чека (паритет з касою): − кількість, ✕ позиція, спосіб оплати
export async function ceView(env, ref, note = '') {
  const x = await closedRec(env, ref); if (!x || x.del || x.rm) return { text: 'Чек не знайдено або знято з виручки.' };
  const d = x.dishes || [];
  return { text: `${note ? note + '\n\n' : ''}✏️ <b>Чек стола ${tn(x.t)}</b> · ${x.at}\n\n${d.map(([n, q, s], i) => `${i + 1}. ${q}× ${esc(n)} — ${s}`).join('\n')}\n\nРазом: <b>${money(x.sum)}</b>${x.tip ? ` (💝 ${money(x.tip)})` : ''} · ${payLabel(x.cash ?? x.sum, x.card || 0, x.ib)}${x.edits?.length ? '\n\n' + x.edits.slice(-5).map(e => `✏️ ${e.at} ${esc(e.by)}: ${esc(e.what)}`).join('\n') : ''}\n\n<i>Додати страву, знижку, чайові, офіціанта, стіл — у касі (Каса → Чеки → ✏️).</i>`,
    markup: { inline_keyboard: [...d.slice(0, 20).map(([n, q], i) => [{ text: `${i + 1}. ${n}`.slice(0, 30), callback_data: 'cv:' + ref }, ...(q > 1 ? [{ text: '➖ 1', callback_data: `cem:${ref}:${i}` }] : []), ...(d.length > 1 ? [{ text: '✕', callback_data: `cex:${ref}:${i}` }] : [])]),
      [{ text: '💵 Готівка', callback_data: `cep:${ref}:cash` }, { text: '💳 Картка', callback_data: `cep:${ref}:card` }], [{ text: '⬅️ До чека', callback_data: 'cv:' + ref }]] } };
}
export async function topView(env) {
  const rows = (await topData(env)).slice(0, 20);
  if (!rows.length) return { text: '🏆 Цього місяця ще немає продажів.' };
  return { text: `🏆 <b>Топ страв за ${new Date().toLocaleDateString('uk-UA', { timeZone: TZ, month: 'long' })}</b>\n` + rows.map((r, i) => `${i + 1}. ${esc(r.n)} — ${r.q} шт · ${money(r.s)}`).join('\n') };
}
export async function stopView(env) {
  const menu = await getMenu(env);
  const hidden = menu.categories.flatMap(c => c.items.filter(i => i.hidden));
  if (!hidden.length) return { text: '⛔ Стоп-лист порожній — все є в меню.\n\nЩоб додати: <code>стоп мєско</code>' };
  return {
    text: `⛔ <b>Стоп-лист</b> (не показується гостям):\n` + hidden.map(i => '• ' + esc(i.name.uk)).join('\n') + '\n\nНатисніть, щоб повернути в меню:',
    markup: { inline_keyboard: chunk(hidden.map(i => ({ text: '✅ ' + i.name.uk, callback_data: 'back:' + i.id })), 2) },
  };
}
export async function wifiView(env) {
  const list = (await env.DB.get('venue_ips', 'json')) || [];
  return {
    text: `📶 <b>Мережі закладу</b> (звідси приймаються замовлення):\n` + (list.length ? list.map(x => `• ${x.k} — додано ${new Date(x.at).toLocaleDateString('uk-UA', { timeZone: TZ })}`).join('\n') : 'немає — замовлення не прийматимуться!') +
      `\n\nДодати мережу: з телефону в Wi‑Fi закладу відкрийте ${siteLink('admin.html')} → PIN → «Це наша мережа».`,
    markup: list.length ? { inline_keyboard: [[{ text: '🗑 Скинути всі мережі', callback_data: 'wifiask' }]] } : undefined,
  };
}
const ROLE_TG = { admin: '🔐 Адміністратори', waiter: '🧑‍🍳 Офіціанти', cook: '👨‍🍳 Кухня', courier: "🛵 Кур'єри" };
export const ROLE_ONE = { admin: '🔐 адмін', waiter: '🧑‍🍳 офіціант', cook: '👨‍🍳 кухар', courier: "🛵 кур'єр" };
export const roleOf = s => ROLE_TG[s.role] ? s.role : 'waiter';
export async function staffView(env) {
  const [list, ws] = await Promise.all([getStaff(env), loggedWaiters(env)]);
  const groups = Object.keys(ROLE_TG).map(r => [r, list.filter(s => roleOf(s) === r)]);
  return {
    text: `👥 <b>Персонал</b>\n` + groups.map(([r, l]) => `\n<b>${ROLE_TG[r]}</b> · ${l.length}\n${l.length ? l.map(s => `• ${esc(s.name)}`).join('\n') : '<i>немає</i>'}`).join('\n') + '\n\n' +
      `<b>Увійшли в бот:</b>\n${ws.length ? ws.map(w => `• ${esc(w.name || w.uid)}`).join('\n') : '<i>нікого</i>'}\n\n` +
      `Натисніть на працівника — ✏️ імʼя, 🔑 PIN, 🔄 роль, 🗑. Додати: «➕ Додати» → <code>Назар 1234</code> (офіціант) або <code>Назар 1234 адмін</code> / <code>кухар</code> / <code>курʼєр</code>.`,
    markup: { inline_keyboard: [[{ text: '➕ Додати працівника', callback_data: 'stfadd' }],
      ...chunk(groups.flatMap(([r, l]) => l.map(s => ({ text: `${ROLE_ONE[r].split(' ')[0]} ${s.name}`, callback_data: 'stf:' + s.id }))), 2),
      ...chunk(ws.map(w => ({ text: `🚪 Вийти: ${w.name || w.uid}`, callback_data: 'wout:' + w.uid })), 2)] },
  };
}
export async function staffOne(env, id) {
  const s = (await getStaff(env)).find(x => x.id === id); if (!s) return staffView(env);
  return { text: `👤 <b>${esc(s.name)}</b> · ${ROLE_ONE[roleOf(s)]}`, markup: { inline_keyboard: [
    [{ text: '✏️ Імʼя', callback_data: 'stfn:' + id }, { text: '🔑 PIN', callback_data: 'stfp:' + id }],
    [{ text: '🔄 Роль', callback_data: 'stfr:' + id }, { text: '🛡 Права', callback_data: 'prm:' + id }, { text: '🗑 Видалити', callback_data: 'stfdq:' + id }],
    [{ text: '⬅️ Усі працівники', callback_data: 'stfbk' }]] } };
}
// 🛡 Права працівника: перемикачі (паритет із касою). Чутливі права для не-адмінів — лише в касі разом із новим PIN 6–8 цифр
export const BOT_PERM = { mvl: 'cash', zl: 'cash', zday: 'cash', rp: 'reports', stf: 'staff', stfn: 'staff', stfp: 'staff', stfr: 'staff', stfro: 'staff', stfdq: 'staff', stfdel: 'staff', stfadd: 'staff', prm: 'staff', prt: 'staff', mod: 'settings' };
export async function permView(env, id) {
  const s = (await getStaff(env)).find(x => x.id === id); if (!s) return staffView(env);
  const adm = s.role === 'admin', on = k => adm ? s.perm?.[k] !== 0 : s.perm?.[k] === 1;
  return { text: `🛡 <b>Права: ${esc(s.name)}</b> · ${ROLE_ONE[roleOf(s)]}\n${adm ? 'Адміністратор має всі права — натисніть, щоб вимкнути.' : 'Роль дає звичні дії; натисніть, щоб додати право.'}\n<i>🔒 — чутливе право: у боті лише для адміністраторів, для інших — у касі з новим PIN 6–8 цифр.</i>`,
    markup: { inline_keyboard: [...PERMS.map(p => [{ text: `${on(p.k) ? '✅' : '▫️'} ${p.e} ${p.n.slice(0, 38)}${SENSITIVE.includes(p.k) && !adm ? ' 🔒' : ''}`, callback_data: `prt:${id}:${p.k}` }]), [{ text: '⬅️ Назад', callback_data: 'stf:' + id }]] } };
}
export const staffEdited = r => r.error ? { text: '⚠️ ' + r.error } : { text: `✅ <b>${esc(r.s.name)}</b> · ${ROLE_ONE[roleOf(r.s)]}${r.old !== r.s.name ? `\n✏️ Було: ${esc(r.old)} — графік, зарплату й чайові перенесено` : ''}\nВхід у касу — заново.` };
export const TEST_PRINT = () => [['logo'], ['big', 'ТЕСТ ДРУКУ'], ['c', hhmm()], ['hr'], ['l', 'Українські літери: Іі Її Єє Ґґ'], ['lr', '2 × Мєско', '760'], ['lr2', 'Всього', '760 грн'], ['hr'], ['gap']];
export const QR_PRINT = (t, img) => [['logo'], ...(t ? [['invb', `СТІЛ ${t}`]] : []), ['inv', 'МЕНЮ ТА ЗАМОВЛЕННЯ'], ['gap'], ['img', img, 220], ['c', 'Скануйте камерою телефона'], ...(t ? [['b', `Замовлення одразу на стіл ${tn(t)}`]] : []), ['s', 'Замовлення доступне 1 годину після сканування'], ['gap']];
export const TEST_JOB = TEST_PRINT;
export const tablesGrid = (env, act, skip) => chunk(Array.from({ length: tablesCount(env) }, (_, i) => i + 1).filter(n => n !== skip).map(n => ({ text: String(n), callback_data: `${act}:${n}` })), 5);

// ---------- повідомлення ----------
// ---------- 📅 броні: дати, ➕ по телефону, ✏️ редагування (ті самі bookManual / bookEditFields, що й у касі) ----------
export const dm = d => `${d.slice(8)}.${d.slice(5, 7)}`;
const addD = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
// «25.10» / «25.10.26» / «2026-10-25» → YYYY-MM-DD; без року — найближча (до місяця назад — цей рік)
export function parseDay(s) {
  s = String(s || '').trim(); if (isDay(s)) return s;
  const m = s.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4}))?$/); if (!m) return null;
  const t = dayKey(), y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : t.slice(0, 4);
  let d = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (!m[3] && d < addD(t, -31)) d = `${+y + 1}${d.slice(4)}`;
  return isDay(d) && new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d ? d : null;
}
export const bkLine = b => `${b.kind === 'banquet' ? '🎉' : '📅'} <b>${dm(b.date)} ${b.time}</b> · ${b.people} гост. · ${esc(b.name)} ${fmtPhone(b.phone)} · ${bkLabel(b.st)}${b.t ? ` · 🪑 стіл ${b.t}` : b.tw ? ` · 🗺 бажає стіл ${b.tw}` : ''}${b.comment ? `\n💬 ${esc(b.comment)}` : ''}${b.note ? `\n📝 ${esc(b.note)}` : ''}${b.pre?.length ? `\n🍽 ${b.pre.map(esc).join(', ')}` : ''}`;
const bkKb = b => ({ inline_keyboard: [...bkButtons(b), [{ text: '✏️ Змінити', callback_data: 'bke:' + b.id }]] });
export async function booksSend(env, send, from = dayKey(), to = addD(dayKey(), 14)) {
  const l = await bookList(env, from, to), one = from === to, title = one ? `📅 Броні на ${dm(from)}` : `📅 Броні ${dm(from)}–${dm(to)}`;
  const nav = { inline_keyboard: [[{ text: '◀️ ' + dm(addD(from, -1)), callback_data: 'bkd:' + addD(from, -1) }, { text: 'Сьогодні', callback_data: 'bkd:' + dayKey() }, { text: dm(addD(to, 1)) + ' ▶️', callback_data: 'bkd:' + addD(to, 1) }],
    [{ text: '📆 Інша дата', callback_data: 'bkdd' }, { text: '➕ Нова бронь', callback_data: 'bkn' }]] };
  for (const b of l.slice(0, 20)) await send({ text: bkLine(b), markup: bkKb(b) });
  return send({ text: `${title}: ${l.length ? l.length + (l.length > 20 ? ' (показано 20)' : '') : 'немає'}\nТекстом: <code>броні 25.10</code> · <code>броні 25.10-30.10</code>`, markup: nav });
}
export const BK_NEW_HELP = '➕ <b>Бронь по телефону</b> — одним рядком:\n<code>25.10 19:30 4 Олена 0671234567</code>\nможна дописати <code>стіл 5</code> і коментар у кінці: <code>… стіл 5 день народження</code>';
export async function bookNew(env, text, who) {
  const m = text.trim().match(/^(\S+)\s+(\d{1,2}[:.]\d{2})\s+(\d{1,2})\s+(.+?)\s+(\+?[\d()-]{9,})(?:\s+(?:стіл|стол)\s*(\d+))?(?:\s+([\s\S]+))?$/i);
  if (!m) return { text: '⚠️ Не зрозумів.\n\n' + BK_NEW_HELP };
  const date = parseDay(m[1]); if (!date) return { text: '⚠️ Невірна дата. Формат: <code>25.10</code>' };
  const x = await bookManual(env, { date, time: m[2].replace('.', ':'), people: m[3], name: m[4], phone: m[5], t: m[6] || 0, comment: m[7] || '' }, who);
  return x.error ? { text: '⚠️ ' + x.error } : { text: '✅ Бронь записано\n' + bkLine(x), markup: bkKb(x) };
}
export const GO_F = { name: "👤 Імʼя", phone: '📞 Телефон', addr: '📍 Адреса', ent: '🚪 Підʼїзд', when: '🕐 Час', note: '💬 Коментар' };
export const GO_ASK = { name: "Нове імʼя клієнта", phone: 'Новий телефон', addr: 'Нова адреса', ent: 'Підʼїзд / поверх / код (<code>-</code> — прибрати)', when: 'На котру? <code>19:30</code> (<code>-</code> — якнайшвидше)', note: 'Коментар (<code>-</code> — прибрати)' };
export const BK_F = { date: '📆 Дата', time: '🕐 Час', people: '👥 Гостей', t: '🪑 Стіл', note: '📝 Нотатка', name: "👤 Імʼя", phone: '📞 Телефон' };
export const BK_ASK = { date: 'Нова дата, напр. <code>25.10</code>', time: 'Новий час, напр. <code>19:30</code>', people: 'Скільки гостей?', t: 'Номер стола (<code>0</code> — без стола)', note: 'Нотатка для персоналу (<code>-</code> — прибрати)', name: "Імʼя гостя", phone: 'Телефон гостя' };
export async function bookEditText(env, id, f, v, who) {
  v = v.trim(); let val = v;
  if (f === 'date') { val = parseDay(v); if (!val) return { text: '⚠️ Невірна дата. Формат: <code>25.10</code>' }; }
  if (f === 'time') val = v.replace('.', ':');
  if (f === 'people' && !(+v > 0)) return { text: '⚠️ Напишіть число гостей' };
  if (f === 't') { if (!/^\d+$/.test(v)) return { text: '⚠️ Напишіть номер стола числом' }; val = +v; }
  if (f === 'note' && v === '-') val = '';
  const x = await bookEditFields(env, id, { [f]: val }, who);
  return x.error ? { text: '⚠️ ' + x.error } : { text: '✏️ Змінено\n' + bkLine(x), markup: bkKb(x) };
}

// ---------- 🔁 рух коштів і 🔒 Z-звіти: перегляд, видалення / повернення (delMove/restoreMove, delZ/restoreZ — як у касі) ----------
const dayNav = (act, day) => [{ text: '◀️ ' + dm(addD(day, -1)), callback_data: `${act}:${addD(day, -1)}` }, ...(day < dayKey() ? [{ text: dm(addD(day, 1)) + ' ▶️', callback_data: `${act}:${addD(day, 1)}` }] : [])];
export async function movView(env, day = dayKey()) {
  const l = await getMov(env, day);
  return { text: `🔁 <b>Рух коштів за ${dm(day)}</b>\n` + (l.length ? l.map(m => `${m.del ? '🗑 <s>' : ''}${m.at} · ${MOVE_ALL[m.type] || m.type} · ${money(m.sum)}${m.note ? ' · ' + esc(m.note) : ''}${m.by ? ' · ' + esc(m.by) : ''}${m.del ? '</s>' : ''}`).join('\n') : 'Записів немає.'),
    markup: { inline_keyboard: [...chunk(l.map((m, i) => ({ text: `${m.del ? '↩️' : '🗑'} ${m.at} ${m.sum}`, callback_data: `${m.del ? 'mvbk' : 'mvdel'}:${i}:${day}` })), 3), dayNav('mvl', day)] } };
}
export const getZs = async (env, day) => (await env.DB.get('z:' + day, 'json')) || [];
export async function zListView(env, day = dayKey()) {
  const l = await getZs(env, day);
  return { text: `🔒 <b>Закриття каси за ${dm(day)}</b>\n` + (l.length ? l.map((z, i) => `${z.del ? '🗑 <s>' : ''}${i + 1}) ${hhmm(z.opened)}–${hhmm(z.closed)} · виручка ${money(z.total)} · в касі ${money(z.inBox)}${z.diff ? ` · різниця ${z.diff > 0 ? '+' : ''}${z.diff}` : ''}${z.closedBy ? ' · ' + esc(z.closedBy) : ''}${z.del ? '</s>' : ''}`).join('\n') : 'Закриттів немає.'),
    markup: { inline_keyboard: [...l.map((z, i) => [{ text: `🧾 ${i + 1}) деталі`, callback_data: `zv:${i}:${day}` }, z.del ? { text: '↩️ Повернути', callback_data: `zbk:${i}:${day}` } : { text: '🗑 Видалити', callback_data: `zdel:${i}:${day}` }]), dayNav('zl', day)] } };
}

// ---------- 👤 Telegram ↔ працівник (tgs:<uid> → id у staff; привʼязка — вибір себе зі списку + свій PIN каси) ----------
export const meStaff = async (env, uid) => { const id = uid && await env.DB.get('tgs:' + uid); return id ? (await getStaff(env)).find(s => s.id === id) || null : null; };
export const pickMeView = async env => { const st = await getStaff(env); return st.length ? { text: '👤 Хто ви? Оберіть себе — далі введіть свій PIN каси (один раз, потім бот вас памʼятає).', markup: { inline_keyboard: chunk(st.map(s => ({ text: s.name, callback_data: 'tgl:' + s.id })), 2) } } : { text: 'Персоналу ще немає — адмін додає в «👥 Персонал».' }; };
export async function shiftToggle(env, s) {
  const a = (await getAtt(env))[dayKey()]?.[s.name], out = a?.in && !a.out;
  const r = out ? await shiftOut(env, s.name) : await shiftIn(env, s.name);
  return { text: r.error ? '⚠️ ' + r.error : out ? `🔴 <b>${esc(s.name)}</b>: зміну закінчено` : `🟢 <b>${esc(s.name)}</b>: зміну почато — адмін підтвердить` };
}

// вхід: привʼязка Telegram → працівник (tgs:), сесія за роллю (admin → ще й режим адміна). Повертає клавіатуру
// 👨‍🍳🛵 кухар і кур'єр працюють у своїх ботах — бот команди їм не відкривається (як у касі: кожна роль бачить своє)
export async function helpFor(env, role) {
  if (role === 'admin') return ADMIN_HELP(env);
  if (role === 'cook') { const r = env.KITCHEN_BOT_TOKEN && await fetch(`https://api.telegram.org/bot${env.KITCHEN_BOT_TOKEN}/getMe`).then(r => r.json()).catch(() => null); return `👨‍🍳 Для кухарів — окремий бот кухні${r?.result?.username ? ' @' + r.result.username : ''}: туди приходять замовлення, там «Готово» і стоп-лист. Увійдіть у нього тим самим PIN.`; }
  if (role === 'courier') { const n = env.COURIER_BOT_TOKEN && await (await import('./courier.js')).courBot(env); return `🛵 Для кур'єрів — бот доставки${n ? ' @' + n : ''}. Підключіть його в касі: «✈️ Telegram».`; }
  return HELP(env);
}
export async function tgLogin(env, uid, s, chat) {
  if (s.role === 'cook' || s.role === 'courier') { await env.DB.delete('wlog:' + uid); return { remove_keyboard: true }; }
  await env.DB.put('tgs:' + uid, s.id); await env.DB.put('wlog:' + uid, JSON.stringify({ name: s.name, role: s.role, at: Date.now() }));
  if (s.role !== 'admin') return KEYBOARD;
  await env.DB.put('adm:' + uid, JSON.stringify({ name: s.name, at: Date.now() }), { expirationTtl: ADMIN_TTL }); await env.DB.delete('kbw:' + uid); return ADMIN_KB;
}

// 🧩 Ф13 модулі закладу (як «⚙️ Налаштування → 🧩 Модулі» у касі)
export async function modsView(env) {
  const { MODS, modsOf, getCfg } = await import('./ops.js'), m = modsOf(await getCfg(env));
  return { text: '🧩 <b>Модулі закладу</b>\nКаса й чеки працюють завжди. Вимкнений модуль не показує вкладок і не шле нагадувань. Натисніть, щоб увімкнути / вимкнути.',
    markup: { inline_keyboard: Object.entries(MODS).map(([k, n]) => [{ text: `${m[k] ? '✅' : '⬜️'} ${n}`, callback_data: 'mod:' + k }]) } };
}
