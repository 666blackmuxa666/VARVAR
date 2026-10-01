// Telegram-бот для офіціантів і адміністратора: кнопки українською, столи, виручка, стоп-лист, Wi‑Fi.
import { getMenu, handleMenuText, handleMenuPhoto, HELP as MENU_HELP } from './menu.js';

export const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const TZ = 'Europe/Kyiv';
export const hhmm = (t = Date.now()) => new Date(t).toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD
const money = n => `${n.toLocaleString('uk-UA')} грн`;

// постійна клавіатура під полем вводу
const B = { tables: '📋 Столи', close: '🧾 Закрити стіл', revenue: '📊 Виручка', stop: '⛔ Стоп-лист', menu: '📖 Меню', wifi: '📶 Wi‑Fi', help: '❓ Допомога' };
export const KEYBOARD = { keyboard: [[{ text: B.tables }, { text: B.close }], [{ text: B.revenue }, { text: B.stop }], [{ text: B.menu }, { text: B.wifi }, { text: B.help }]], resize_keyboard: true, is_persistent: true };

// команди в меню «/» (назви — лише латиниця, описи — українською)
export const COMMANDS = [
  ['tables', 'Відкриті столи і рахунки'], ['table', 'Деталі столу: /table 5'], ['close', 'Закрити рахунок столу'],
  ['revenue', 'Виручка: сьогодні, вчора, тиждень'], ['stoplist', 'Стоп-лист (чого немає)'], ['menu', 'Як змінювати меню'],
  ['wifi', 'Мережі Wi‑Fi закладу'], ['help', 'Допомога'],
].map(([command, description]) => ({ command, description }));

const HELP = `<b>VARVAR — бот закладу</b>

<b>Кнопки внизу:</b>
${B.tables} — відкриті столи і суми
${B.close} — закрити рахунок (стіл розрахувався)
${B.revenue} — виручка за сьогодні / вчора / тиждень
${B.stop} — чого немає, повернути в меню
${B.menu} — як змінювати ціни, страви, фото
${B.wifi} — мережі закладу для замовлень

<b>Можна писати текстом:</b>
<code>стіл 5</code> — що замовив стіл
<code>закрити 5</code> — закрити рахунок
<code>стоп мєско</code> / <code>повернути мєско</code>
<code>мєско ціна 400</code> — змінити ціну

<b>Під кожним замовленням:</b>
✅ Прийняв — видно, хто з офіціантів взяв замовлення
🧾 Закрити стіл — коли гість розрахувався`;

// ---------- дані ----------
export const getBill = async (env, t) => (await env.DB.get('bill:' + t, 'json')) || { total: 0, orders: 0, log: [] };
async function openTables(env) {
  const keys = (await env.DB.list({ prefix: 'bill:' })).keys;
  const rows = await Promise.all(keys.map(async k => ({ t: +k.name.slice(5), b: await env.DB.get(k.name, 'json') })));
  return rows.filter(r => r.b && r.b.total > 0).sort((a, b) => a.t - b.t);
}
export async function addStat(env, field, n) {
  const k = 'day:' + dayKey(); const d = (await env.DB.get(k, 'json')) || {};
  d[field] = (d[field] || 0) + n;
  await env.DB.put(k, JSON.stringify(d), { expirationTtl: 40 * 86400 });
}
async function closeTable(env, t, who) {
  const bill = await getBill(env, t);
  if (!bill.total) return `Стіл ${t} вже закритий.`;
  await env.DB.delete('bill:' + t);
  await addStat(env, 'closed', bill.total); await addStat(env, 'tables', 1);
  return `✅ <b>Стіл ${t} закрито</b> — ${money(bill.total)}${who ? ` (${esc(who)}, ${hhmm()})` : ''}`;
}

// ---------- відповіді ----------
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
    markup: { inline_keyboard: [[{ text: '🧾 Закрити стіл', callback_data: 'cls:' + t }]] },
  };
}
async function closePicker(env) {
  const rows = await openTables(env);
  if (!rows.length) return { text: 'Відкритих столів немає' };
  return { text: '🧾 Який стіл закрити?', markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${r.t} · ${r.b.total}`, callback_data: 'cls:' + r.t })), 2) } };
}
async function revenueView(env) {
  const days = await Promise.all([...Array(7)].map(async (_, i) => { const k = dayKey(Date.now() - i * 86400e3); return { k, d: (await env.DB.get('day:' + k, 'json')) || {} }; }));
  const open = (await openTables(env)).reduce((s, r) => s + r.b.total, 0);
  const line = (label, d) => `${label}: <b>${money(d.closed || 0)}</b> закрито · столів ${d.tables || 0} · замовлень ${d.orders || 0}`;
  const week = days.reduce((a, { d }) => ({ closed: (a.closed || 0) + (d.closed || 0), tables: (a.tables || 0) + (d.tables || 0), orders: (a.orders || 0) + (d.orders || 0) }), {});
  return { text: `📊 <b>Виручка</b>\n${line('Сьогодні', days[0].d)}\nЩе відкрито в залі: <b>${money(open)}</b>\n\n${line('Вчора', days[1].d)}\n${line('7 днів', week)}\n\n<i>«Закрито» — рахунки, закриті кнопкою «Закрити стіл».</i>` };
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
async function wifiView(env, adminUrl) {
  const list = (await env.DB.get('venue_ips', 'json')) || [];
  return {
    text: `📶 <b>Мережі закладу</b> (звідси приймаються замовлення):\n` + (list.length ? list.map(x => `• ${x.k} — додано ${new Date(x.at).toLocaleDateString('uk-UA', { timeZone: TZ })}`).join('\n') : 'немає — замовлення не прийматимуться!') +
      `\n\nДодати мережу: з телефону в Wi‑Fi закладу відкрийте ${adminUrl} → PIN → «Це наша мережа».`,
    markup: list.length ? { inline_keyboard: [[{ text: '🗑 Скинути всі мережі', callback_data: 'wifiask' }]] } : undefined,
  };
}
const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);

// ---------- обробка ----------
export async function handleUpdate(u, env) {
  if (u.callback_query) return handleCallback(u.callback_query, env);
  const m = u.message; if (!m || String(m.chat.id) !== String(env.CHAT_ID)) return;
  const send = (v) => tg(env, 'sendMessage', { chat_id: m.chat.id, text: v.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: v.markup || KEYBOARD });
  const adminUrl = (env.SITE_URL || '') + 'admin.html';
  if (m.photo) return send({ text: await handleMenuPhoto(m, env, tg) });
  const text = (m.text || '').trim(); if (!text) return;
  const low = text.toLowerCase().replace(/@\S+/, '');
  let x;
  if (low === '/start' || low === '/help' || text === B.help || low === 'допомога' || low === 'help') return send({ text: HELP });
  if (low === '/tables' || text === B.tables || low === 'столи') return send(await tablesView(env));
  if ((x = low.match(/^(?:\/table|стіл|стол)\s+(\d+)$/))) return send(await tableView(env, +x[1]));
  if ((x = low.match(/^(?:\/close|закрити|закрий)\s+(\d+)$/))) return send({ text: await closeTable(env, +x[1], m.from?.first_name) });
  if (low === '/close' || text === B.close) return send(await closePicker(env));
  if (low === '/revenue' || text === B.revenue || low === 'виручка' || low === 'каса') return send(await revenueView(env));
  if (low === '/stoplist' || text === B.stop || low === 'стоп-лист' || low === 'стоп лист') return send(await stopView(env));
  if (low === '/wifi' || text === B.wifi || low === 'wi-fi' || low === 'wifi' || low === 'вайфай') return send(await wifiView(env, adminUrl));
  if (low === '/menu' || text === B.menu) return send({ text: MENU_HELP });
  const r = await handleMenuText(text, env);
  return send({ text: r || 'Не зрозумів 🤔 Скористайтесь кнопками внизу або натисніть «❓ Допомога».' });
}

async function handleCallback(q, env) {
  const chat = q.message?.chat?.id, mid = q.message?.message_id;
  const answer = (text) => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text });
  if (String(chat) !== String(env.CHAT_ID)) return answer('Немає доступу');
  const edit = (text, markup) => tg(env, 'editMessageText', { chat_id: chat, message_id: mid, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: markup || { inline_keyboard: [] } });
  const send = (v) => tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', reply_markup: v.markup || KEYBOARD });
  const [act, arg, oid] = (q.data || '').split(':');
  const who = q.from?.first_name || '';

  if (act === 'acc') { // ✅ Прийняв — дописуємо, хто взяв, лишаємо кнопку закриття
    const html = q.message.text ? esc(q.message.text) : '';
    if (oid && /^[a-z0-9]+$/.test(oid)) await env.DB.put('ord:' + oid, JSON.stringify({ s: 'acc', t: +arg, by: who, at: hhmm() }), { expirationTtl: 12 * 3600 });
    await edit(`${html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, { inline_keyboard: [[{ text: '🧾 Закрити стіл ' + arg, callback_data: 'cls:' + arg }]] });
    return answer('Прийнято');
  }
  if (act === 'cls') { // підтвердження закриття
    const b = await getBill(env, arg);
    if (!b.total) { await answer(`Стіл ${arg} вже закритий`); return; }
    await send({ text: `🧾 Закрити <b>стіл ${arg}</b> на ${money(b.total)}?`, markup: { inline_keyboard: [[{ text: '✅ Так, закрити', callback_data: 'clsok:' + arg }, { text: 'Ні', callback_data: 'no' }]] } });
    return answer('');
  }
  if (act === 'clsok') { await edit(await closeTable(env, +arg, who)); return answer('Закрито'); }
  if (act === 'tbl') { const v = await tableView(env, +arg); await send(v); return answer(''); }
  if (act === 'back') {
    const menu = await getMenu(env); const it = menu.categories.flatMap(c => c.items).find(i => i.id === arg);
    if (it) { delete it.hidden; const prev = await env.DB.get('menu'); if (prev) await env.DB.put('menu_prev', prev); await env.DB.put('menu', JSON.stringify(menu)); }
    const v = await stopView(env); await edit(v.text, v.markup); return answer(it ? `${it.name.uk} знову в меню` : 'Не знайдено');
  }
  if (act === 'wifiask') { await send({ text: '🗑 Скинути всі мережі? Замовлення не прийматимуться, поки не додасте мережу знову через admin.html.', markup: { inline_keyboard: [[{ text: 'Так, скинути', callback_data: 'wifiok' }, { text: 'Ні', callback_data: 'no' }]] } }); return answer(''); }
  if (act === 'wifiok') { await env.DB.put('venue_ips', '[]'); await edit('📶 Усі мережі скинуто. Додайте мережу закладу через admin.html.'); return answer('Скинуто'); }
  if (act === 'no') { await edit('Скасовано.'); return answer(''); }
  return answer('');
}
