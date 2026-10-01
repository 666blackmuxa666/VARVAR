// Telegram-бот закладу: режим офіціанта (столи, закриття, стоп-лист) і режим адміністратора
// за паролем (звіти, видалення столів, меню, Wi‑Fi, пароль).
import { getMenu, handleMenuText, handleMenuPhoto, HELP as MENU_HELP } from './menu.js';

export const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const TZ = 'Europe/Kyiv';
export const hhmm = (t = Date.now()) => new Date(t).toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD
const money = n => `${Math.round(n).toLocaleString('uk-UA')} грн`;
const YEAR = 400 * 86400, ADMIN_TTL = 12 * 3600;

// ---------- клавіатури ----------
const W = { tables: '📋 Столи', close: '🧾 Закрити стіл', stop: '⛔ Стоп-лист', help: '❓ Допомога', admin: '🔐 Адмін' };
const A = { reports: '📊 Звіти', closed: '📜 Закриті сьогодні', top: '🏆 Топ страв', del: '🗑 Видалити стіл', menu: '📖 Редагувати меню', wifi: '📶 Wi‑Fi', pass: '🔑 Змінити пароль', waiter: '⬅️ Режим офіціанта', logout: '🚪 Вийти' };
const kb = rows => ({ keyboard: rows.map(r => r.map(text => ({ text }))), resize_keyboard: true, is_persistent: true });
export const KEYBOARD = kb([[W.tables, W.close], [W.stop, W.help], [W.admin]]);
const ADMIN_KB = kb([[A.reports, A.closed], [A.top, A.del], [W.tables, W.stop], [A.menu, A.wifi], [A.pass, A.waiter, A.logout]]);

export const COMMANDS = [
  ['tables', 'Відкриті столи і рахунки'], ['table', 'Деталі столу: /table 5'], ['close', 'Закрити рахунок столу'],
  ['stoplist', 'Стоп-лист (чого немає)'], ['admin', 'Режим адміністратора (пароль)'], ['help', 'Допомога'],
].map(([command, description]) => ({ command, description }));

const HELP = `<b>VARVAR — бот закладу</b>

${W.tables} — відкриті столи і суми
${W.close} — закрити рахунок (гість розрахувався)
${W.stop} — чого немає / повернути в меню
${W.admin} — режим адміністратора (за паролем)

<b>Текстом:</b> <code>стіл 5</code> · <code>закрити 5</code> · <code>стоп мєско</code> · <code>повернути мєско</code>

<b>Під кожним замовленням:</b>
✅ Прийняв — гість побачить, що замовлення прийняте
🧾 Закрити стіл — коли гість розрахувався`;

const ADMIN_HELP = `🔐 <b>Режим адміністратора</b>

${A.reports} — виручка: сьогодні, вчора, тиждень, місяць, минулий місяць, середній чек
${A.closed} — усі закриті й видалені рахунки за день
${A.top} — що найбільше замовляють цього місяця
${A.del} — прибрати помилковий/тестовий стіл (не йде у виручку)
${A.menu} — ціни, склад, нові страви, фото
${A.wifi} — мережі закладу для замовлень
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
async function closeTable(env, t, who) {
  const bill = await getBill(env, t);
  if (!bill.total) return `Стіл ${t} вже закритий.`;
  await env.DB.delete('bill:' + t);
  await addStat(env, 'closed', bill.total); await addStat(env, 'tables', 1);
  await logClosed(env, { t, sum: bill.total, at: hhmm(), by: who || '' });
  return `✅ <b>Стіл ${t} закрито</b> — ${money(bill.total)}${who ? ` (${esc(who)}, ${hhmm()})` : ''}`;
}
async function deleteTable(env, t, who) {
  const bill = await getBill(env, t);
  if (!bill.total) return `Стіл ${t} вже порожній.`;
  await env.DB.delete('bill:' + t);
  await logClosed(env, { t, sum: bill.total, at: hhmm(), by: who || '', del: 1 });
  return `🗑 <b>Стіл ${t} видалено</b> (${money(bill.total)}) — у виручку не піде.`;
}

// ---------- адміністратор ----------
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
    markup: { inline_keyboard: [[{ text: '🧾 Закрити стіл', callback_data: 'cls:' + t }]] },
  };
}
async function pickTable(env, title, act) {
  const rows = await openTables(env);
  if (!rows.length) return { text: 'Відкритих столів немає' };
  return { text: title, markup: { inline_keyboard: chunk(rows.map(r => ({ text: `Стіл ${r.t} · ${r.b.total}`, callback_data: `${act}:${r.t}` })), 2) } };
}
async function sumDays(env, keys) {
  const ds = await Promise.all(keys.map(async k => (await env.DB.get('day:' + k, 'json')) || {}));
  return ds.reduce((a, d) => ({ closed: a.closed + (d.closed || 0), tables: a.tables + (d.tables || 0), orders: a.orders + (d.orders || 0) }), { closed: 0, tables: 0, orders: 0 });
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
  const line = (label, d) => `<b>${label}:</b> ${money(d.closed)} · столів ${d.tables} · замовлень ${d.orders}${d.tables ? ` · сер. чек ${money(d.closed / d.tables)}` : ''}`;
  return { text: [`📊 <b>Звіти</b>`, line('Сьогодні', d0), `У залі ще відкрито: <b>${money(open)}</b>`, '', line('Вчора', d1), line('7 днів', wk),
    line(`Місяць (${mname(now)})`, mon), line(`Минулий місяць (${mname(new Date(y, mo - 2, 15))})`, prev), '',
    `<i>Виручка — рахунки, закриті кнопкою «Закрити стіл». Видалені столи не враховуються.</i>`].join('\n') };
}
async function closedView(env, day = dayKey()) {
  const list = (await env.DB.get('closed:' + day, 'json')) || [];
  if (!list.length) return { text: `📜 За ${day} закритих рахунків ще немає.` };
  const ok = list.filter(x => !x.del), sum = ok.reduce((s, x) => s + x.sum, 0);
  return { text: `📜 <b>Закриті рахунки за ${day}</b>\n` + list.map(x => `${x.del ? '🗑' : '✅'} ${x.at} · стіл ${x.t} · ${money(x.sum)}${x.by ? ` · ${esc(x.by)}` : ''}${x.del ? ' (видалено)' : ''}`).join('\n') + `\n\nРазом: <b>${money(sum)}</b> · рахунків ${ok.length}` };
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

// ---------- повідомлення ----------
export async function handleUpdate(u, env) {
  if (u.callback_query) return handleCallback(u.callback_query, env);
  const m = u.message; if (!m) return;
  const uid = m.from?.id, chat = m.chat.id, who = m.from?.first_name || '';
  const staff = String(chat) === String(env.CHAT_ID);
  const admin = await isAdmin(env, uid);
  const waiterView = admin && !!(await env.DB.get('kbw:' + uid)); // адмін перемкнувся на кнопки офіціанта
  const send = (v, keyboard) => tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: v.markup || keyboard || (admin && !waiterView ? ADMIN_KB : KEYBOARD) });
  const text = (m.text || '').trim(), low = text.toLowerCase().replace(/@\S+/, '');

  // очікуємо пароль (вхід) або новий пароль (зміна)
  const state = uid && await env.DB.get('st:' + uid);
  if (state && text && !text.startsWith('/') && !Object.values(W).concat(Object.values(A)).includes(text)) {
    await env.DB.delete('st:' + uid);
    await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id }); // прибираємо пароль з чату
    if (state === 'login') {
      const fails = +(await env.DB.get('fail:' + uid) || 0);
      if (fails >= 5) return send({ text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' });
      if (text.toLowerCase() !== (await adminPass(env)).toLowerCase()) {
        await env.DB.put('fail:' + uid, String(fails + 1), { expirationTtl: 900 });
        return send({ text: `❌ Невірний пароль (спроба ${fails + 1} з 5). Натисніть «${W.admin}», щоб спробувати ще.` }, KEYBOARD);
      }
      await env.DB.delete('fail:' + uid);
      await env.DB.put('adm:' + uid, JSON.stringify({ name: who, at: Date.now() }), { expirationTtl: ADMIN_TTL });
      return send({ text: `✅ Вітаю, ${esc(who)}! Ви в режимі адміністратора.\n\n` + ADMIN_HELP }, ADMIN_KB);
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
    return send({ text: '🔐 Введіть пароль адміністратора (повідомлення одразу видалиться):' }, { remove_keyboard: true });
  }
  if (!staff && !admin) return send({ text: '⛔ Цей бот — для персоналу VARVAR. Адміністратор може увійти командою /admin.' }, { remove_keyboard: true });

  if (m.photo) return send({ text: admin ? await handleMenuPhoto(m, env, tg) : '🔐 Змінювати фото може лише адміністратор.' });
  if (!text) return;
  let x;
  // --- офіціант ---
  if (low === '/start' || low === '/help' || text === W.help || low === 'допомога' || low === 'help') return send({ text: admin ? ADMIN_HELP : HELP });
  if (low === '/tables' || text === W.tables || low === 'столи') return send(await tablesView(env));
  if ((x = low.match(/^(?:\/table|стіл|стол)\s+(\d+)$/))) return send(await tableView(env, +x[1]));
  if ((x = low.match(/^(?:\/close|закрити|закрий)\s+(\d+)$/))) return send({ text: await closeTable(env, +x[1], who) });
  if (low === '/close' || text === W.close) return send(await pickTable(env, '🧾 Який стіл закрити?', 'cls'));
  if (low === '/stoplist' || text === W.stop || low === 'стоп-лист' || low === 'стоп лист') return send(await stopView(env));

  // --- адміністратор ---
  const ADM = [A.reports, A.closed, A.top, A.del, A.menu, A.wifi, A.pass, A.waiter, A.logout];
  const admOnly = ADM.includes(text) || /^(\/revenue|\/wifi|\/menu|виручка|каса|звіти|видалити стіл)/.test(low);
  if (admOnly && !admin) return send({ text: `🔐 Це доступно лише адміністратору. Натисніть «${W.admin}».` });
  if (text === A.reports || low === '/revenue' || low === 'виручка' || low === 'каса' || low === 'звіти') return send(await reportsView(env));
  if (text === A.closed) return send(await closedView(env));
  if (text === A.top) return send(await topView(env));
  if (text === A.del) return send(await pickTable(env, '🗑 Який стіл видалити? (помилковий або тестовий — у виручку не піде)', 'del'));
  if (text === A.menu || low === '/menu') return send({ text: MENU_HELP });
  if (text === A.wifi || low === '/wifi') return send(await wifiView(env));
  if (text === A.pass) { await env.DB.put('st:' + uid, 'newpass', { expirationTtl: 300 }); return send({ text: '🔑 Напишіть новий пароль (мінімум 4 символи). Повідомлення одразу видалиться.' }); }
  if (text === A.waiter) await env.DB.put('kbw:' + uid, '1', { expirationTtl: ADMIN_TTL });
  if (text === A.waiter) return send({ text: `Звичайні кнопки. Вхід адміністратора зберігається — «${W.admin}», щоб повернутись.` }, KEYBOARD);
  if (text === A.logout) { await env.DB.delete('adm:' + uid); await env.DB.delete('kbw:' + uid); return send({ text: '🚪 Ви вийшли з режиму адміністратора.' }, KEYBOARD); }

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
  const send = (v) => tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', reply_markup: v.markup || (admin ? ADMIN_KB : KEYBOARD) });
  const [act, arg, oid] = (q.data || '').split(':');
  const who = q.from?.first_name || '';
  const confirm = (text, yes) => send({ text, markup: { inline_keyboard: [[{ text: '✅ Так', callback_data: yes }, { text: 'Ні', callback_data: 'no' }]] } });

  if (act === 'acc') { // ✅ Прийняв — дописуємо, хто взяв; гість бачить статус на сайті
    const html = q.message.text ? esc(q.message.text) : '';
    if (oid && /^[a-z0-9]+$/.test(oid)) await env.DB.put('ord:' + oid, JSON.stringify({ s: 'acc', t: +arg, by: who, at: hhmm() }), { expirationTtl: 12 * 3600 });
    await edit(`${html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, { inline_keyboard: [[{ text: '🧾 Закрити стіл ' + arg, callback_data: 'cls:' + arg }]] });
    return answer('Прийнято');
  }
  if (act === 'cls') {
    const b = await getBill(env, arg);
    if (!b.total) return answer(`Стіл ${arg} вже закритий`);
    await confirm(`🧾 Закрити <b>стіл ${arg}</b> на ${money(b.total)}?`, 'clsok:' + arg); return answer('');
  }
  if (act === 'clsok') { await edit(await closeTable(env, +arg, who)); return answer('Закрито'); }
  if (act === 'tbl') { await send(await tableView(env, +arg)); return answer(''); }
  if (act === 'back') {
    const menu = await getMenu(env); const it = menu.categories.flatMap(c => c.items).find(i => i.id === arg);
    if (it) { delete it.hidden; const prev = await env.DB.get('menu'); if (prev) await env.DB.put('menu_prev', prev); await env.DB.put('menu', JSON.stringify(menu)); }
    const v = await stopView(env); await edit(v.text, v.markup); return answer(it ? `${it.name.uk} знову в меню` : 'Не знайдено');
  }
  // лише адміністратор
  if (['del', 'delok', 'wifiask', 'wifiok'].includes(act) && !admin) return answer('🔐 Лише для адміністратора');
  if (act === 'del') {
    const b = await getBill(env, arg);
    if (!b.total) return answer(`Стіл ${arg} вже порожній`);
    await confirm(`🗑 Видалити <b>стіл ${arg}</b> (${money(b.total)})? Сума НЕ піде у виручку.`, 'delok:' + arg); return answer('');
  }
  if (act === 'delok') { await edit(await deleteTable(env, +arg, who)); return answer('Видалено'); }
  if (act === 'wifiask') { await confirm('🗑 Скинути всі мережі? Замовлення не прийматимуться, поки не додасте мережу знову через admin.html.', 'wifiok'); return answer(''); }
  if (act === 'wifiok') { await env.DB.put('venue_ips', '[]'); await edit('📶 Усі мережі скинуто. Додайте мережу закладу через admin.html.'); return answer('Скинуто'); }
  if (act === 'no') { await edit('Скасовано.'); return answer(''); }
  return answer('');
}
