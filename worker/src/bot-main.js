// 🤖 Бот персоналу — обробка повідомлень (handleUpdate) і натискань кнопок (handleCallback)
// (частина bot.js — інші файли імпортують з bot.js, як і раніше)
import { A, ADMIN_HELP, ADMIN_KB, ADMIN_TTL, BK_ASK, BK_F, BK_NEW_HELP, BOT_PERM, CFG_NAME, GO_ASK, GO_F, HELP, KEYBOARD, POS_URL, QR_PRINT, ROLE_ONE, TEST_PRINT, VOID_R, W, bkLine, bookEditText, bookNew, booksSend, cashView, cb64, ceView, chunk, closeAsk, closedOne, closedText, closedView, dm, editView, expListView, getZs, helpFor, kb, kitchenView, meStaff, movView, msgId, parseDay, payButtons, permView, pickMeView, pickTable, purgeAdminChat, remember, repView, reportsView, roleOf, shiftToggle, staffEdited, staffOne, staffView, stopView, tableView, tablesGrid, tablesView, tgLogin, topView, wifiView, zListView } from './bot-views.js';
import { courCashGive } from './courier.js';
import { fmtPhone, goApi, goAttach, goButtons, goEdit, goFromPos, goList, goSet, goStLabel, goText, normPhone, setGoCfg } from './delivery.js';
import { HELP as MENU_HELP, getMenu, handleMenuPhoto, handleMenuText } from './menu.js';
import { CFG_LIM, L, MOVE, MOVE_ALL, acceptOrder, addExpense, addMove, addStaff, addWaiterOrder, balances, billItems, closeShift, closeTable, closedRec, dayKey, dayX, dayZ, dayZData, delClosed, delExpense, delMove, delStaff, delZ, deleteTable, editClosed, editStaff, esc, getBill, getCfg, getEvents, getShift, getStaff, hhmm, isAdmin, isDay, isWaiter, kitchenDone, kitchenPct, kitchenStart, lastZ, logEvent, money, moveTable, notify, openShift, openTables, payTips, payable, pinFind, pinIs, precheck, reconcile, regRole, rejectOrder, removeOne, reopenClosed, reprintClosed, resetAll, restoreClosed, restoreExpense, restoreMove, restoreTable, restoreVoid, restoreZ, setCfg, setDiscount, setFloat, setHidden, setPerm, setTip, shiftData, splitTable, tablesCount, tg, tipBalances, zDayText, zText } from './ops.js';
import { catsView, getOb, obCallback, putOb, tablePick } from './orderui.js';
import { attConfirm, payOp, payText, payroll, swapStep } from './pay.js';
import { PERM_KEYS, SENSITIVE, can } from './perm.js';
import { getRoute, printClear, printList, printMove, printStatus, queuePrint } from './print.js';
import { loyBotCb, loyBotText } from './promo.js';
import { bkLabel, bookGet, bookSet, certPay, getSite, setSite } from './site.js';
import { calcView, invLink, invPhoto, stockCallback, stockCallbackW, stockCallbackX, stockCmd, stockState } from './stockbot.js';
import { exCheck } from './excise.js';
import { isGo, tn } from './tn.js';
import { siteLink } from './venue.js';
import { draftText, parseWaiterOrder } from './waiter.js';

export async function handleUpdate(u, env) {
  if (u.callback_query) return handleCallback(u.callback_query, env);
  const m = u.message; if (!m) return;
  if (m.reply_to_message && m.text && await (await import('./guestbot.js')).staffReply(m, env, m.from?.first_name || '')) return; // 💬 відповідь гостю
  const uid = m.from?.id, chat = m.chat.id, who = m.from?.first_name || '';
  const admin = await isAdmin(env, uid);
  const waiter = admin || await isWaiter(env, uid);
  // вхід закінчився сам (12 год) — прибираємо, що лишилось від сесії
  if (!admin && uid && await env.DB.get('admmsg:' + uid) && await env.DB.get('st:' + uid) !== 'pin') await purgeAdminChat(env, uid);
  let track = admin; // повідомлення цієї взаємодії належать адмін-сесії
  const waiterView = admin && !!(await env.DB.get('kbw:' + uid)); // адмін перемкнувся на кнопки офіціанта
  const send = async (v, keyboard) => {
    const r = await tg(env, 'sendMessage', { chat_id: chat, text: v.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: v.markup || keyboard || (admin && !waiterView ? ADMIN_KB : KEYBOARD) });
    if (track) await remember(env, uid, chat, [m.message_id, await msgId(r)]);
    return r;
  };
  const text = (m.text || '').trim(), low = text.toLowerCase().replace(/@\S+/, '');
  const tooMany = async () => false; // без блокування на 15 хв (просив власник)
  // 🔒 спроба PIN рахується ДО перевірки, під замком (паралельні повідомлення не обходять ліміт); окрім ліміту на акаунт — спільний на заклад (багато нових акаунтів не перебирають PIN)
  const pinTry = () => env.DB.locked('pinrl', async () => {
    const n = +(await env.DB.get('fail:' + uid) || 0), g = +(await env.DB.get('failall') || 0);
    if (n >= 5 || g >= 60) return false;
    await env.DB.put('fail:' + uid, String(n + 1), { expirationTtl: 900 }); await env.DB.put('failall', String(g + 1), { expirationTtl: 900 }); return true;
  });
  const pinOk = () => env.DB.locked('pinrl', async () => { await env.DB.delete('fail:' + uid); const g = +(await env.DB.get('failall') || 0); if (g > 0) await env.DB.put('failall', String(g - 1), { expirationTtl: 900 }); });
  const fail = async () => {}; // лічильник уже збільшено в pinTry

  // очікуємо пароль або інше введення
  const state = uid && await env.DB.get('st:' + uid);
  if (state && text && !text.startsWith('/') && !Object.values(W).concat(Object.values(A)).includes(text)) {
    await env.DB.delete('st:' + uid);
    if (['pin', 'stfadd'].includes(state) || state.startsWith('regp:') || state.startsWith('tgpin:') || state.startsWith('stfp:')) await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id }); // прибираємо паролі/PIN з чату
    if (state.startsWith('tkwhy:')) { const s0 = await meStaff(env, uid); if (!s0) return send({ text: '🔐 Спершу увійдіть своїм PIN' }); const T = await import('./tasks.js'), r = await T.taskMark(env, { name: s0.name, role: s0.role, sid: s0.id }, dayKey(), state.slice(6), 'no', text); if (r.error) return send({ text: '⚠️ ' + r.error }); const v = await T.taskBotView(env, s0); return send({ text: '❌ Записано: ' + esc(text.slice(0, 140)) + '\n\n' + v.text, markup: v.markup }); } // 📋 причина «не зробив»
    if (state === 'pin') { // 🔑 вхід за особистим PIN каси (або код реєстрації нового працівника)
      const keep = async t => { await env.DB.put('st:' + uid, 'pin', { expirationTtl: 3600 }); return send({ text: t }, { remove_keyboard: true }); };
      if (!/^\d{4,8}$/.test(text)) return keep('Введіть свій PIN (4 цифри; адміністратор — 6–8) або код реєстрації:');
      if (!(await pinTry())) return send({ text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' }, { remove_keyboard: true });
      const me = await pinFind(env, await getStaff(env), text); // спершу PIN працівника — код реєстрації не має його перекривати
      const role = !me && await regRole(env, text);
      if (role) { await env.DB.put('st:' + uid, 'regn:' + role, { expirationTtl: 900 }); return send({ text: `🆕 Реєстрація (${ROLE_ONE[role]}). Напишіть своє імʼя:` }, { remove_keyboard: true }); }
      if (!me) { await fail(); return keep('❌ Невірний PIN. Введіть ще раз:'); }
      await pinOk();
      return send({ text: `✅ Вітаю, ${esc(me.name)}! Ви увійшли як ${ROLE_ONE[me.role] || me.role}.\n\n` + await helpFor(env, me.role) }, await tgLogin(env, uid, me, chat));
    }
    if (state.startsWith('regn:')) { const name = text.replace(/:/g, ' ').trim().slice(0, 30); if (!name) return send({ text: 'Напишіть імʼя' }); await env.DB.put('st:' + uid, `regp:${state.slice(5)}:${name}`, { expirationTtl: 900 }); return send({ text: `Привіт, ${esc(name)}! Придумайте свій PIN — 4 цифри (повідомлення одразу видалиться):` }, { remove_keyboard: true }); }
    if (state.startsWith('regp:')) {
      const [, role, ...nm] = state.split(':'), name = nm.join(':');
      if (!/^\d{4,8}$/.test(text)) { await env.DB.put('st:' + uid, state, { expirationTtl: 900 }); return send({ text: role === 'admin' ? 'PIN адміністратора — від 6 до 8 цифр:' : 'PIN — рівно 4 цифри:' }, { remove_keyboard: true }); }
      const r = await addStaff(env, name, text, role); if (r.error) { await env.DB.put('st:' + uid, state, { expirationTtl: 900 }); return send({ text: '⚠️ ' + r.error + '\nВведіть інший PIN:' }, { remove_keyboard: true }); }
      await notify(env, `👥 Новий працівник: <b>${esc(r.s.name)}</b> (${ROLE_ONE[role]}) — зареєструвався в Telegram-боті`).catch(() => {});
      return send({ text: `👋 Вітаю, ${esc(r.s.name)}! PIN збережено — ним же входите в касу.\n\n` + await helpFor(env, role) }, await tgLogin(env, uid, r.s, chat));
    }
    if (state?.startsWith('wls:') && waiter) { const [r] = await (await import('./wl.js')).wlAct(env, state.slice(4), 'seat', +text, who); return send({ text: r.error ? '⚠️ ' + r.error : `🪑 ${esc(r.name)} — стіл ${+text}` }); }
    if (state?.startsWith('bkc:') && waiter) { const r = await bookSet(env, state.slice(4), 'came', who, { t: +text }); return send({ text: r?.error ? '⚠️ ' + r.error : `🪑 Гості прийшли · стіл ${+text}` }); }
    if (state?.startsWith('bkt:') && waiter) { const r = await bookSet(env, state.slice(4), 'kit', who, { t: +text }); return send({ text: r?.error ? '⚠️ ' + r.error : `🔥 Передзамовлення відправлено на кухню · стіл ${+text}` }); }
    if (state.startsWith('goe:') && admin) { // ✏️ доставка: та сама goEdit, що й у касі
      const [, t, f] = state.split(':'), v = text === '-' && (f === 'when' || f === 'note' || f === 'ent') ? '' : text.replace(/^(\d{1,2})\.(\d{2})$/, '$1:$2');
      if (f === 'when' && v && !/^\d{1,2}:\d{2}$/.test(v)) return send({ text: '⚠️ Час у форматі <code>19:30</code> (або <code>-</code> — якнайшвидше)' });
      if (f === 'phone' && !normPhone(v)) return send({ text: '⚠️ Невірний телефон' });
      const r = await goEdit(env, +t, { [f]: f === 'when' && v ? v.padStart(5, '0') : v }, who); if (r.error) return send({ text: '⚠️ ' + r.error });
      return send({ text: r.ch.length ? `✏️ <b>${tn(+t)}</b> змінено: ${r.ch.map(esc).join(' · ')}${(await getBill(env, +t)).go?.cour ? '\n🛵 Курʼєра сповіщено' : ''}` : 'Без змін' });
    }
    if (state === 'bkd' && waiter) { const [a, b] = text.split(/\s*[-–]\s*/).map(parseDay); if (!a || (text.match(/[-–]/) && !b)) return send({ text: '⚠️ Формат: <code>25.10</code> або <code>25.10-30.10</code>' }); return booksSend(env, send, a, b && b > a ? b : a); }
    if (state === 'bkn' && waiter) return send(await bookNew(env, text, who));
    if (state.startsWith('bke:') && waiter) { const [, id, f] = state.split(':'); return send(await bookEditText(env, id, f, text, who)); }
    if (state.startsWith('tgpin:') && waiter) { // 👤 привʼязка до працівника: PIN каси
      const s = (await getStaff(env)).find(z => z.id === state.slice(6)); if (!s) return send({ text: 'Не знайдено' });
      if (!(await pinTry())) return send({ text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' });
      if (!(await pinIs(env, s, text))) { return send({ text: '❌ PIN не підходить. Напишіть «зміна», щоб спробувати ще раз.' }); }
      await pinOk(); await env.DB.put('tgs:' + uid, s.id);
      return send({ text: `✅ Ви — <b>${esc(s.name)}</b>. Тепер «зміна» починає / закінчує вашу зміну.` });
    }
    if (state.startsWith('sk') && admin) { const r = await stockState(state, text, env, uid, who); if (r) return send(r); }
    if (state === 'gocon' && waiter) { // контакти для С‑/Д‑ з бота
      const p = await env.DB.get('gopend:' + uid, 'json'); await env.DB.delete('st:' + uid); if (!p) return send({ text: '⌛ Замовлення застаріло.' });
      // імʼя й телефон необовʼязкові («-» — пропустити); доставці потрібна лише адреса. Одне поле без ком: доставка — адреса, самовивіз — імʼя
      const pr = text.split(',').map(x => x.trim()), one = pr.length === 1, dash = x => x === '-' ? '' : x || '';
      const name = one ? (p.gk === 'del' ? '' : dash(pr[0])) : dash(pr[0]), phone = one ? '' : dash(pr[1]), addr = one ? (p.gk === 'del' ? dash(pr[0]) : '') : pr.slice(2).join(', ');
      if ((phone && !normPhone(phone)) || (p.gk === 'del' && !addr)) { await env.DB.put('st:' + uid, 'gocon', { expirationTtl: 900 }); return send({ text: `⚠️ Формат: <code>Імʼя, телефон${p.gk === 'del' ? ', адреса' : ''}</code> (<code>-</code> — пропустити)${p.gk === 'del' ? ' або лише адреса' : ''}` }); }
      const { t: T, go } = await goFromPos(env, { kind: p.gk, name, phone, addr }, who);
      const res = await addWaiterOrder(env, { table: T, items: p.items }, who, ['З СОБОЮ', p.com || ''].filter(Boolean).join(' · '), 'бот', !!p.ur);
      if (!res) return send({ text: 'Нічого додати.' });
      await goAttach(env, T, go); await env.DB.delete('gopend:' + uid);
      return send({ text: `✅ ${p.gk === 'del' ? '🛵 Доставка' : '🥡 Самовивіз'} <b>${tn(T)}</b> — ${esc(name)} ${fmtPhone(normPhone(phone))}${addr ? `\n📍 ${esc(addr)}` : ''}\n${res.lines.map(esc).join('\n')}\nРазом: <b>${money(res.total + (go.fee || 0))}</b>`, markup: { inline_keyboard: goButtons({ ...go, t: T }) } });
    }
    if (state === 'ocom' && waiter) { // коментар до замовлення кнопками → оновлюємо те саме повідомлення
      const ob = await getOb(env, uid); await tg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id });
      if (!ob) return send({ text: '⌛ Замовлення застаріло. Почніть заново: «➕ Замовлення».' });
      ob.com = text.slice(0, 200); await putOb(env, uid, ob);
      const v = await catsView(env, ob);
      return tg(env, 'editMessageText', { chat_id: ob.chat, message_id: ob.mid, text: v.text, parse_mode: 'HTML', reply_markup: v.markup });
    }
    if (state.startsWith('rmr:') && waiter) { // своя причина скасування
      const [, t, i] = state.split(':'); await env.DB.delete('st:' + uid);
      const it = billItems(await getBill(env, +t))[+i]; if (!it) return send({ text: 'Позицію вже прибрано.' });
      const r = await removeOne(env, +t, it.name, who, text);
      return send(await editView(env, +t, r && !r.error ? `🗑 Скасовано: 1× ${esc(r.name)} (−${r.unit} грн) · ${esc(r.reason)}` : (r?.error || '')));
    }
    if (false) {
      const t = +state.slice(4), n = parseInt(text, 10);
      if (!(n >= 0)) return send({ text: 'Потрібне число, наприклад 100.' });
      await setTip(env, t, n, who); return send(await tableView(env, t));
    }
    if (state.startsWith('dscc:') && waiter) { // свій відсоток знижки
      const t = +state.slice(5), p = parseInt(text, 10);
      if (!(p >= 0 && p <= 100)) return send({ text: 'Потрібне число від 0 до 100.' });
      const r = await setDiscount(env, t, p, who, admin); if (r?.error) return send({ text: '⛔ ' + r.error }); return send(await tableView(env, t));
    }
    const num = parseFloat(text.replace(',', '.').replace(/\s/g, ''));
    if (state.startsWith('cfg:') && admin) { const k = state.slice(4), c = await setCfg(env, k, num); if (c.error) return send({ text: c.error }); await env.DB.delete('st:' + uid); return send({ text: `✅ Збережено: ${CFG_NAME[k]} — <b>${c[k]}</b>` }); }
    if (state === 'kpct' && admin) { if (!(num >= 0 && num <= 100)) return send({ text: 'Число від 0 до 100' }); await env.DB.delete('st:' + uid); await env.DB.put('kitchen_pct', String(Math.round(num))); return send({ text: `✅ Частка кухні: <b>${Math.round(num)}%</b>` }); }
    if (state.startsWith('rcn:') && admin) {
      if (!(num >= 0)) return send({ text: 'Потрібне число, наприклад 5112' });
      await env.DB.delete('st:' + uid); const src = state.slice(4), r = await reconcile(env, src, num, who);
      await send({ text: r.diff ? `✏️ Записано: було ${money(r.was)}, факт <b>${money(r.actual)}</b> (${r.diff > 0 ? '+' : ''}${money(r.diff)})` : '✅ Усе збігається' }); return send(await cashView(env));
    }
    if (state.startsWith('cmv:') && admin) { // рух коштів: «500 коментар»
      const mm = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:грн)?\s*[-–—:,]?\s*(.*)$/i);
      if (!mm) return send({ text: 'Напишіть суму, наприклад: <code>500 з банку</code>' });
      const e = await addMove(env, { type: state.slice(4), sum: parseFloat(mm[1].replace(',', '.')), note: mm[2].trim(), by: who });
      await env.DB.delete('st:' + uid);
      return send(e ? { text: `✅ ${MOVE_ALL[e.type]}: <b>${money(e.sum)}</b>${e.note ? ` — ${esc(e.note)}` : ''}` } : { text: 'Не вдалось записати.' });
    }
    if (state === 'shopen' && admin) {
      if (!(num >= 0)) return send({ text: 'Потрібне число — скільки грошей у касі на початок. Натисніть «🔓 Відкрити касу» ще раз.' });
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
        markup: { inline_keyboard: [[{ text: '💵 З каси (готівка)', callback_data: `exs:${eid}:cash` }, { text: '💳 З карти', callback_data: `exs:${eid}:card` }], [{ text: '📅 Це було вчора', callback_data: `exy:${eid}:1` }, { text: '📅 Позавчора', callback_data: `exy:${eid}:2` }], [{ text: 'Скасувати', callback_data: 'no' }]] } });
    }
    if (state.startsWith('stfp:') && admin) { const r = await editStaff(env, state.slice(5), { pin: text }); await send(staffEdited(r)); return send(await staffOne(env, state.slice(5))); }
    if (state === 'stfadd' && admin) {
      const sm = text.match(/^(.+?)\s+(\d{4,6})(?:\s+(адмін|админ|admin|кухар|повар|cook|кур[ʼ'’]?єр|курьер|courier))?$/i);
      if (!sm) return send({ text: 'Формат: <code>Назар 1234</code> або <code>Назар 1234 адмін</code>. Натисніть «➕ Додати» ще раз.' });
      const rw = (sm[3] || '').toLowerCase(), r = await addStaff(env, sm[1], sm[2], !rw ? 'waiter' : /^(кух|пов|cook)/.test(rw) ? 'cook' : /^(кур|cour)/.test(rw) ? 'courier' : 'admin');
      if (r.error) return send({ text: '⚠️ ' + r.error });
      return send(await staffView(env));
    }
  }

  // вхід адміністратора — з будь-якого чату
  if (low === '/admin' || text === W.admin) {
    if (admin) { await env.DB.delete('kbw:' + uid); return send({ text: ADMIN_HELP(env) }, ADMIN_KB); }
    const me = await meStaff(env, uid);
    if (me?.role === 'admin') { track = true; await tgLogin(env, uid, me, chat); return send({ text: ADMIN_HELP(env) }, ADMIN_KB); }
    if (me) return send({ text: '🔐 Режим адміністратора — лише для працівників з роллю «адмін».' });
    await env.DB.put('st:' + uid, 'pin', { expirationTtl: 3600 });
    return send({ text: '🔑 Введіть свій PIN каси (повідомлення одразу видалиться):' }, { remove_keyboard: true });
  }
  // без входу — лише запит пароля офіціанта
  if (!waiter) {
    await env.DB.put('st:' + uid, 'pin', { expirationTtl: 3600 });
    return send({ text: '🔑 Цей бот — для персоналу закладу.\nВведіть свій PIN каси — той самий, що й для входу в касу (повідомлення одразу видалиться).\nНовий працівник — введіть код реєстрації.' }, { remove_keyboard: true });
  }

  // 🧮 фото накладної → розпізнати (Gemini) → чернетка з кнопками «Записати»
  if (m.photo && admin && /^накладн/i.test((m.caption || '').trim())) { await send({ text: '🔎 Розпізнаю накладну… 10–30 с' }); return send(await invPhoto(m, env, uid)); }
  if (m.photo) return send({ text: admin ? await handleMenuPhoto(m, env, tg) : '🔐 Змінювати фото може лише адміністратор.' });
  if (m.document && admin && /\.(txt|csv|tsv)$/i.test(m.document.file_name || '')) { // 🏦 файл виписки → імпорт і звірка (як Каса → 🏦 Банк)
    if (!(await (await import('./ops.js')).modOn(env, 'bank'))) return send({ text: '🏦 Модуль «Банк і звірка» вимкнено. Увімкнути: напишіть <code>модулі</code>.' });
    if ((m.document.file_size || 0) > 3e6) return send({ text: '⚠️ Файл завеликий — розбийте виписку на місяці' });
    const B = await import('./bank.js'), f = await (await tg(env, 'getFile', { file_id: m.document.file_id })).json();
    const buf = new Uint8Array(await (await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result?.file_path}`)).arrayBuffer());
    const r = await B.bankImport(env, B.decode(buf), { name: m.document.file_name, who }); await send({ text: B.importText(r) }); if (r.error) return;
    await B.bankNotify(env, r, who); const v = await B.bankBotView(env);
    for (const x of v.q) await send({ text: B.lineText(x), markup: { inline_keyboard: B.lineKb(x) } }); return; }
  if (!text) return;
  let x;
  // --- офіціант ---
  const LEARN = { inline_keyboard: [[{ text: '🎓 Навчання: уроки з підказками', url: POS_URL(env) + '#course' }]] }; // 🎓 курс — у касі (уроки візуальні)
  if (/^\/chat(@\w+)?(\s|$)/i.test(text)) { const t = text.replace(/^\/chat(@\w+)?/i, '').trim().slice(0, 500); if (!t) { const l = (await getEvents(env)).filter(e => e.k === 'chat').slice(-15); return send({ text: `💬 <b>Чат закладу</b> (сьогодні)\n${l.map(e => `<b>${esc(e.by || '')}</b> ${e.at || ''}: ${esc(e.text || '')}`).join('\n') || 'Поки тихо'}\n\nНаписати: <code>/chat текст</code>` }); } await logEvent(env, { k: 'chat', by: who, text: t, seen: [who] }); return send({ text: '💬 Надіслано в чат каси' }); }
  if (low === '/learn' || low === 'навчання' || text === W.learn) return send({ text: '🎓 <b>Навчання</b>\nУроки для вашої ролі: що натискати й де — з підсвіткою справжніх кнопок у касі.', markup: LEARN });
  if (low === '/start' || low === '/help' || text === W.help || low === 'допомога' || low === 'help') return send({ text: (admin ? ADMIN_HELP(env) : HELP(env)) + '\n\n🎓 Навчання з підказками в касі — /learn' });
  if (text === W.order || low === '/order' || low === 'замовлення') return send(await tablePick(env, (await openTables(env)).map(r => r.t), tablesCount(env)));
  if (low === '/wl' || low === 'черга' || text === '⏳ Черга') { const Wl = await import('./wl.js'), l = await Wl.wlList(env); return send({ text: Wl.wlText(l) + '\n\nДодати гостя: <code>/wl Імʼя 4</code>', markup: Wl.wlKb(l) }); }
  if (low.startsWith('/wl ')) { const m = text.slice(4).trim().match(/^(.+?)\s+(\d{1,2})$/); if (!m) return send({ text: 'Формат: <code>/wl Імʼя 4</code>' }); const [r] = await (await import('./wl.js')).wlAdd(env, { name: m[1], people: m[2] }, who); return send({ text: r.error ? '⚠️ ' + r.error : `⏳ ${esc(r.name)} у черзі — №${r.pos}` }); }
  if (low === '/tables' || text === W.tables || low === 'столи') return send(await tablesView(env));
  if ((x = low.match(/^(?:\/table|стіл|стол)\s+(\d+)$/))) return send(await tableView(env, +x[1]));
  if ((x = low.match(/^(?:\/close|закрити|закрий)\s+(\d+)$/))) return send(await closeAsk(env, +x[1]));
  if (low === '/close' || text === W.close) return send(await pickTable(env, '🧾 Який стіл закрити?', 'cls'));
  if (low === 'принтер' || low === '/printer') {
    const { seen, q } = await printStatus(env);
    const ok = Date.now() - seen < 60e3;
    const { st } = await (await import('./print.js')).getRoute(env), GE = { kitchen: '🍳', bar: '🍹', hookah: '💨', other: '🧩' };
    return send({ text: `🖨 <b>Принтер</b>: ${ok ? '✅ на звʼязку' : seen ? `❌ немає звʼязку з ${hhmm(seen)}` : '❌ програма друку ще не запускалась'}\nУ черзі: ${q}${st.length ? '\n\n' + st.map(x => `• <b>${esc(x.name)}</b>: ${x.g.map(g => GE[g]).join('')}${x.r ? '🧾' : ''}${x.n > 1 ? ` ×${x.n}` : ''}`).join('\n') + '\n<i>Розподіл — у касі: Налаштування → 🖨 Принтер</i>' : ''}`, markup: { inline_keyboard: [[{ text: '🖨 Тестовий друк', callback_data: 'ptest' }, { text: '🔳 QR меню', callback_data: 'pqr' }], ...(q && admin ? [[{ text: `📋 Черга (${q})`, callback_data: 'pql' }, { text: `🗑 Очистити все`, callback_data: 'pclr' }]] : [])] } });
  }
  if (text === W.kitchen || low === '/kitchen') return send(await kitchenView(env));
  if (text === W.book || low === '/book' || low === 'броні') return booksSend(env, send);
  if ((x = text.match(/^броні\s+(\S+?)(?:\s*[-–]\s*(\S+))?$/i))) { const a = parseDay(x[1]), b = x[2] ? parseDay(x[2]) : a; if (!a || !b) return send({ text: '⚠️ Формат: <code>броні 25.10</code> або <code>броні 25.10-30.10</code>' }); return booksSend(env, send, a, b > a ? b : a); }
  if ((x = text.match(/^бронь\s+([\s\S]+)$/i))) return send(await bookNew(env, x[1], who));
  { const m = text.match(/^(закрити|відкрити)\s+період(?:\s+(\d{1,2})[./](\d{4}))?$|^період$/i); if (m && admin) { // 🔒 Ф5 замок періоду (паритет з касою: Звіти → 🔒): закрити період 09.2026 · відкрити період · період
    const P = await import('./plock.js');
    if (!m[1]) { const to = await P.plockTo(env); return send({ text: to ? `🔒 Закрито по ${to.split('-').reverse().join('.')}\nВідкрити: <code>відкрити період</code>` : '🔓 Період не закрито\nЗакрити: <code>закрити період 09.2026</code>' }); }
    if (/^з/i.test(m[1]) && !m[2]) return send({ text: '⚠️ Формат: <code>закрити період 09.2026</code>' });
    const r = await P.plockSet(env, /^з/i.test(m[1]) ? `${m[3]}-${m[2].padStart(2, '0')}` : '', who + ' · бот'); if (r.error) return send({ text: '⚠️ ' + r.error });
    await notify(env, r.to ? `🤖 🔒 Період до ${r.to.split('-').reverse().join('.')} закрито — ${esc(who)}` : `🤖 🔓 Період відкрито — ${esc(who)}`); return send({ text: r.to ? `🔒 Закрито по ${r.to.split('-').reverse().join('.')}: минулі чеки, витрати й Z-звіти більше не правляться` : '🔓 Період відкрито' }); } }
  { const m2 = text.match(/^сайт(?:\s+(\S+)\s*([\s\S]*))?$/i); if (m2 && admin) { // 🌐 сайт телефон … · сайт години 11:00-23:00 · сайт акція Назва — опис · сайт акція видалити N
    const k = (m2[1] || '').toLowerCase(), v = (m2[2] || '').trim(), s0 = await getSite(env);
    if (!k) return send({ text: `🌐 <b>Сайт-візитка</b>\n${esc(s0.name)} · ${esc(s0.phone)} · ${s0.from}–${s0.to}\n📍 ${esc(s0.addr)}\n⭐ ${s0.rating || '—'} (${s0.ratingN})\nАкції: ${s0.promos.map((p, i) => `${i + 1}) ${esc(p.t)}`).join('; ') || '—'}\n\nКоманди: <code>сайт телефон …</code>, <code>сайт адреса …</code>, <code>сайт години 11:00-23:00</code>, <code>сайт опис …</code>, <code>сайт рейтинг 4.8 120</code>, <code>сайт інстаграм …</code>, <code>сайт акція Назва — опис</code>, <code>сайт акція видалити 1</code>\n${siteLink('about.html')}` });
    let r;
    if (k === 'години') { const [a, b2] = v.split(/[-–]/).map(x => x.trim()); r = await setSite(env, 'from', a); if (!r.error) r = await setSite(env, 'to', b2); }
    else if (k === 'рейтинг') { const [a, n] = v.split(/\s+/); r = await setSite(env, 'rating', a); if (!r.error && n) r = await setSite(env, 'ratingN', n); }
    else if (k === 'акція') { const dm = v.match(/^видалити\s+(\d+)$/i); r = dm ? (s0.promos?.[+dm[1] - 1] ? await setSite(env, 'promoDel', s0.promos[+dm[1] - 1].id) : { error: 'Акції з таким номером немає' }) : await setSite(env, 'promoAdd', { t: v.split(/\s+[—-]\s+/)[0], d: v.split(/\s+[—-]\s+/).slice(1).join(' — ') }); }
    else { const K = { 'телефон': 'phone', 'адреса': 'addr', 'опис': 'about', 'слоган': 'tagline', 'назва': 'name', 'інстаграм': 'insta', 'телеграм': 'tg', 'банкети': 'banquet', 'кальяни': 'hookah', 'відгуки': 'reviewsUrl' }[k]; if (!K) return send({ text: '⚠️ Невідоме поле. Напишіть «сайт» — список команд.' }); r = await setSite(env, K, v); }
    return send({ text: r.error ? '⚠️ ' + r.error : '✅ Збережено — уже на сайті' }); } }
  if (/^(вхідні|✉️|\/inbox)$/i.test(text.trim())) { if (!waiter) return send({ text: '🔐 Спершу увійдіть своїм PIN' }); await (await import('./guestbot.js')).inboxBot(env, chat); return; } // ✉️ невідписані повідомлення гостей
  if (text === W.plan || /^(\/plan|план)$/i.test(text)) { const s0 = await meStaff(env, uid); if (!s0) return send({ text: '🔐 Спершу увійдіть своїм PIN' }); const v = await (await import('./tasks.js')).taskBotView(env, s0); return send(v); } // 📋 план на день
  { const m = text.match(/^(?:📢\s*)?(?:оголошення|\/ann)(?:\s+([\s\S]+))?$/i); if (m) { // 📢 оголошення для команди (паритет з касою: Персонал → 📋 План)
    const T = await import('./tasks.js'), v = (m[1] || '').trim();
    if (!v || !admin) { const a = await T.getAnn(env); return send({ text: (a ? `📢 <b>${esc(a.t)}</b>\n<i>— ${esc(a.by)}</i>` : '📢 Оголошень немає.') + (admin ? '\n\nЗадати: <code>оголошення Завтра о 10:00 генералка</code>\nПрибрати: <code>оголошення прибрати</code>' : '') }); }
    const s0 = await meStaff(env, uid), r = await T.setAnn(env, /^(прибрати|вимкнути|видалити|-)$/i.test(v) ? '' : v, s0?.name || 'адмін');
    return send({ text: r.ann ? '📢 Оголошення бачать усі — у касі (👤 кабінет) і в «📋 Мій план».' : '🗑 Оголошення прибрано.' }); } }
  if (/^(побажання|\/idea)/i.test(text)) { const r = await (await import('./ideas.js')).ideaBot(env, text, await meStaff(env, uid), admin); if (r) return send(r); } // 💡 побажання розробнику
  { const m = text.match(/^(гість|бонус)\s+(\d+)\s+(\S+)\s*$/i); if (m && waiter) { // 🎁 паритет з касою: телефон гостя на рахунок (кешбек) / списати бонуси
    const t = +m[2], bill = await getBill(env, t); if (!bill.total) return send({ text: `⚠️ Стіл ${tn(t)} порожній` });
    const me = { name: who, role: admin ? 'admin' : 'waiter' };
    if (/^гість$/i.test(m[1])) { const ph = /^(0|-|—|скинути)$/i.test(m[3]) ? '' : m[3]; const [r] = await goApi({ op: 'cliSet', phone: ph }, env, me, t); return send({ text: r.error ? '⚠️ ' + r.error : ph ? `✅ ${tn(t)}: гість ${fmtPhone(normPhone(ph))} — кешбек нарахується при закритті` : `✅ ${tn(t)}: гостя знято` }); }
    const [r] = await goApi({ op: 'cliBonus', sum: m[3] }, env, me, t); return send({ text: r.error ? '⚠️ ' + r.error : `✅ ${tn(t)}: списано бонусами ${r.bonus} грн` }); } }
  { const r = await loyBotText(env, text === W.loy ? 'акції' : text, admin); if (r) return send(r); } // 🎁 клієнт 050… / клієнт Іван / акції (promo.js)
  if (text === W.go || low === '/go' || low === 'доставка') { const l = await goList(env, await openTables(env)); await send({ text: goText(l) }); for (const g of l) await send({ text: `<b>${tn(g.t)}</b> · ${esc(g.name)} · ${goStLabel(g.st)}`, markup: { inline_keyboard: [...goButtons(g), ...(admin ? [[{ text: '✏️ Змінити', callback_data: 'goe:' + g.t }]] : [])] } }); return; }
  { const m = text.match(/^доставка\s+(\S+)\s+(.+)$/i); if (m && admin) { // ⚙️ доставка мін 300 · доставка з 10:00 · доставка вимк
    const K = { 'увімк': ['on', 1], 'вимк': ['on', 0], 'з': 'from', 'до': 'to', 'мін': 'min', 'ціна': 'fee', 'безкоштовно': 'free', 'час': 'prep', 'телефон': 'phone', 'зона': 'zone', 'кешбек': 'cash', 'трекінг': 'track', 'бонуси': 'bmax', 'курєр': 'cpay', "кур'єр": 'cpay' }[m[1].toLowerCase()];
    if (K) { const c = await setGoCfg(env, Array.isArray(K) ? K[0] : K, Array.isArray(K) ? K[1] : m[2]); return send({ text: c.error ? '⚠️ ' + c.error : `✅ Доставка: прийом ${c.on ? 'увімкнено' : 'вимкнено'} · ${c.from}–${c.to} · мін. ${c.min} грн · доставка ${c.fee} грн (безкоштовно від ${c.free}) · готуємо ~${c.prep} хв · кешбек ${c.cash}% · бонусами до ${c.bmax}% · кур'єру ${c.cpay} грн` }); } } }
  if (low === '/stoplist' || text === W.stop || low === 'стоп-лист' || low === 'стоп лист') return send(await stopView(env));

  // --- адміністратор ---
  const ADM = [A.calc, A.pay, A.cash, A.expense, A.reports, A.closed, A.top, A.del, A.menu, A.wifi, A.staff, A.waiter, A.logout, A.delClosed, A.reset];
  const admOnly = ADM.includes(text) || /^(\/revenue|\/wifi|\/menu|виручка|каса|звіти|витрата|видалити стіл|зарплата)/.test(low);
  if (admOnly && !admin) return send({ text: `🔐 Це доступно лише адміністратору. Натисніть «${W.admin}».` });
  if (text === A.cash || low === 'каса') return send(await cashView(env));
  if (admin && (low === 'модулі' || low === '/mods')) return send(await (await import('./bot-views.js')).modsView(env)); // 🧩 Ф13
  if (admin && (low === 'перехід' || low === '📥 перехід' || low === '/mig')) { // 📥 етап 1: статус імпортів + де майстер
    if (!(await (await import('./ops.js')).modOn(env, 'mig'))) return send({ text: '📥 Модуль «Перехід з іншої системи» вимкнено. Увімкнути: напишіть <code>модулі</code>.' });
    return send({ text: await (await import('./mig.js')).migBotText(env, 'https://posatom.online/owner/') }); }
  if (admin && (low === 'агрегатори' || low === '🛵 агрегатори' || /^агрегатор\s/.test(low))) { // 🛵 Glovo / Bolt: список, увімкнути, «агрегатор Glovo 28» — комісія
    if (!(await (await import('./ops.js')).modOn(env, 'agg'))) return send({ text: '🛵 Модуль «Агрегатори доставки» вимкнено. Увімкнути: напишіть <code>модулі</code>.' });
    const A = await import('./agg.js'), m = low.match(/^агрегатор\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*%?$/);
    if (m) { const l = await A.aggList(env), x = l.find(a => a.n.toLowerCase() === m[1].trim()); const r = await A.aggSet(env, x ? { id: x.id, fee: m[2].replace(',', '.') } : { n: text.trim().replace(/^агрегатор\s+/i, '').replace(/\s+\d+(?:[.,]\d+)?\s*%?$/, ''), fee: m[2].replace(',', '.') }); if (r.error) return send({ text: '⚠️ ' + r.error }); }
    return send(await A.aggBotView(env)); }
  if (admin && (low === 'книга' || low === '📒 книга' || low === 'книга доходів' || low === '/income' || /^дохід\s+\d/.test(low))) { // 📒 етап 3: книга доходів — та сама, що в касі (⚙️ Налаштування → 📒)
    const I = await import('./income.js');
    if (low.startsWith('дохід')) { const p = I.incParse(text.trim().replace(/^дохід\s+/i, '')); if (!p) return send({ text: 'Напишіть: <code>дохід 5000 оренда</code>' });
      const r = await I.incAdd(env, p, who); if (r.error) return send({ text: '⚠️ ' + r.error }); await notify(env, `🤖 📒 Інший дохід ${money(r.x.sum)} · ${I.CATS[r.x.cat]}${r.x.note ? ' · ' + esc(r.x.note) : ''} — ${esc(who)}`).catch(() => {}); }
    return send({ text: await I.incBotText(env) }); }
  if (admin && low === 'банк оновити') { // 🔄 mono / Приват — забрати операції зараз (як кнопка в касі)
    if (!(await (await import('./ops.js')).modOn(env, 'bank'))) return send({ text: '🏦 Модуль «Банк і звірка» вимкнено. Увімкнути: напишіть <code>модулі</code>.' });
    const A = await import('./bankapi.js'), x = await A.bankApiSync(env, { force: 1 }); if (!x) return send({ text: '🔄 Банк не підключено — токен додає власник у кабінеті (💳 Оплати → 🔄 Банк автоматично).' });
    return send({ text: `🔄 Нових операцій: <b>${(x.mono || 0) + (x.privat || 0)}</b>\n${A.apiText(await A.bankApiState(env))}\n\nЧерга — <code>банк</code>` }); }
  if (admin && (low === 'банк' || low === '🏦 банк' || low === '/bank')) { // 🏦 етап 2: місяць, дні без еквайрингу, черга «на підтвердження»
    if (!(await (await import('./ops.js')).modOn(env, 'bank'))) return send({ text: '🏦 Модуль «Банк і звірка» вимкнено. Увімкнути: напишіть <code>модулі</code>.' });
    const B = await import('./bank.js'), v = await B.bankBotView(env); await send({ text: v.text });
    for (const x of v.q) await send({ text: B.lineText(x), markup: { inline_keyboard: B.lineKb(x) } }); return; }
  if (admin && (low === 'постачальники' || low === 'борги' || low === '/sup')) { /* 🏭 борги постачальникам — як у касі (Склад → Постачальники) */
    const r = await (await import('./suppliers.js')).supList(env), l = r.list.filter(x => x.debt > 0), tot = l.reduce((a, x) => a + x.debt, 0);
    return send({ text: l.length ? `🏭 <b>Борги постачальникам: ${money(tot)}</b>\n${l.map(x => `• ${esc(x.n)} — <b>${money(x.debt)}</b>${x.over ? ` · ⏰ прострочено ${money(x.over)}` : ''}${x.phone ? ` · ${esc(x.phone)}` : ''}`).join('\n')}\n\nОплатити й переглянути накладні — у касі: Склад → 🏭 Постачальники.` : '✅ Боргів постачальникам немає.' });
  }
  if (text === A.expense || low === 'витрата') { await env.DB.put('st:' + uid, 'exp', { expirationTtl: 600 }); return send({ text: '💸 Напишіть суму і на що, наприклад:\n<code>450 овочі на ринку</code>' }); }
  if (text === A.reports || low === '/revenue' || low === 'виручка' || low === 'звіти') return send(await reportsView(env));
  if (text === A.closed || text === A.delClosed) return send(await closedView(env));
  if (text === A.top) return send(await topView(env));
  if (text === A.del) return send(await pickTable(env, '🗑 Який стіл видалити? (помилковий або тестовий — у виручку не піде)', 'del'));
  if (text === A.reset) return send({ text: '♻️ <b>Обнулити все?</b>\nЗітруться: звіти, виручка, закриті рахунки, топ страв, стрічка подій і ВСІ відкриті столи.\nМеню, Wi‑Fi, персонал і паролі залишаться.', markup: { inline_keyboard: [[{ text: '⚠️ Так, обнулити', callback_data: 'rst1' }, { text: 'Ні', callback_data: 'no' }]] } });
  if (text === A.menu || low === '/menu') return send({ text: MENU_HELP });
  if (text === A.wifi || low === '/wifi') return send(await wifiView(env));
  if (text === A.staff) return send(await staffView(env));
  if (text === A.waiter) { await env.DB.put('kbw:' + uid, '1', { expirationTtl: ADMIN_TTL }); return send({ text: `Звичайні кнопки. Вхід адміністратора зберігається — «${W.admin}», щоб повернутись.` }, KEYBOARD); }
  if (text === A.logout) {
    await env.DB.delete('adm:' + uid); await env.DB.delete('kbw:' + uid);
    await remember(env, uid, chat, [m.message_id]); await purgeAdminChat(env, uid); track = false;
    return send({ text: '🚪 Ви вийшли з режиму адміністратора. Переписку адмін-режиму видалено з чату.' }, KEYBOARD);
  }

  // --- 👷 зарплата ---
  if (text === A.pay || low === 'зарплата') {
    if (!(await (await import('./ops.js')).modOn(env, 'hr'))) return send({ text: '👥 Модуль «Кадри й зарплата» вимкнено. Увімкнути: напишіть <code>модулі</code> або в касі ⚙️ Налаштування → 🧩 Модулі.' });
    const p = await payroll(env), st = await getStaff(env);
    return send({ text: payText(p) + '\n\nТекстом: <code>премія Гріша 300 за суботу</code>, <code>штраф Назар 100 запізнення</code>, <code>аванс Назар 1000</code> (або <code>… картка</code>)',
      markup: { inline_keyboard: p.rows.filter(r => r.due > 0).map(r => [{ text: `💸 Видати ${r.n} · ${r.due}`.slice(0, 60), callback_data: 'zpb:' + (st.find(x => x.name === r.n)?.id || '') }]) } });
  }
  if (admin && (x = text.match(/^(премія|штраф|аванс)\s+(.+?)\s+(\d+)\s*(?:грн)?\s*(.*)$/i))) {
    const st = await getStaff(env), n = st.find(z => z.name.toLowerCase() === x[2].toLowerCase())?.name; if (!n) return send({ text: `❓ Немає працівника «${esc(x[2])}»` });
    const t = { премія: 'bonus', штраф: 'fine', аванс: 'adv' }[x[1].toLowerCase()], card = /картк|карт/i.test(x[4]), note = x[4].replace(/з?\s*картк\S*|з?\s*карт\S*/i, '').trim();
    const r = await payOp(env, { n, t, sum: +x[3], src: card ? 'card' : 'cash', note }, who); if (r.error) return send({ text: '⚠️ ' + r.error });
    return send({ text: `✔ ${{ bonus: '➕ Премія', fine: '➖ Штраф', adv: '💵 Аванс' }[t]}: <b>${esc(n)}</b> ${money(r.op.sum)}${t === 'adv' ? (card ? ' з картки' : ' з каси') : ''}${note ? ' · ' + esc(note) : ''}` });
  }
  if (low === '/зміна' || low === 'зміна' || low === '/shift') {
    let me = await meStaff(env, uid);
    if (!me) { const st = await getStaff(env), byName = st.filter(z => z.name.toLowerCase() === who.toLowerCase()); if (byName.length !== 1) return send(await pickMeView(env)); return send({ text: `👤 Ви — <b>${esc(byName[0].name)}</b>? Підтвердіть PIN каси (один раз).`, markup: { inline_keyboard: [[{ text: '✅ Так, це я', callback_data: 'tgl:' + byName[0].id }, { text: 'Ні, інший', callback_data: 'tgw' }]] } }); }
    return send(await shiftToggle(env, me));
  }
  if (low === 'хто я' || low === '/me') { const me = await meStaff(env, uid); return send(me ? { text: `👤 Ви — <b>${esc(me.name)}</b>`, markup: { inline_keyboard: [[{ text: '🔓 Відвʼязати', callback_data: 'tgu' }]] } } : await pickMeView(env)); }


  // --- 🧮 розрахунок: склад, списання, заготовки, інвентаризація, техкарти ---
  if (text === A.calc) return send(await calcView(env));
  if (admin && /^https:\/\/\S+$/.test(text.trim())) { await send({ text: '🔎 Читаю чек за посиланням… 10–30 с' }); return send(await invLink(text.trim(), env, uid)); }
  if (admin) { const r = await stockCmd(text, env, who); if (r) return send(r); }

  // --- замовлення від офіціанта текстом: «номер столу» + рядки «страва кількість» ---
  if (text.includes('\n')) {
    const d = parseWaiterOrder(await getMenu(env), text, tablesCount(env));
    if (d?.error) return send({ text: '⚠️ ' + d.error });
    if (d) {
      const did = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      await env.DB.put('draft:' + did, JSON.stringify(d), { expirationTtl: 3600 });
      const can = d.items.some(i => !i.hidden);
      return send({ text: draftText(d), markup: { inline_keyboard: [can ? [{ text: `✅ Додати до столу ${tn(d.table)}`, callback_data: 'wok:' + did }, { text: '❌ Скасувати', callback_data: 'no' }] : [{ text: 'OK', callback_data: 'no' }]] } });
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
  if ((q.data || '').startsWith('txd:')) { // 📅 «Сплачено» під податковим нагадуванням: адміністратор або власник (особистий чат)
    const owner = String(await env.DB.get('digchat')) === String(uid);
    if (!admin && !owner) return answer('🔐 Лише для адміністратора');
    const key = q.data.slice(4); if (!/^[a-zA-Z0-9]+:\d{4}-\d{2}-\d{2}$/.test(key)) return answer('Невірний ключ');
    const { taxDone } = await import('./tax.js'); await taxDone(env, key, 1);
    const kb = (q.message?.reply_markup?.inline_keyboard || []).filter(r => r[0]?.callback_data !== q.data);
    await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: kb } }).catch(() => {});
    return answer('✅ Позначено як зроблено');
  }
  { const pk = admin && BOT_PERM[(q.data || '').split(':')[0]]; // 🔑 адміну право могли зняти в налаштуваннях прав
    if (pk) { const a = await env.DB.get('adm:' + uid, 'json'), st = (await getStaff(env)).find(x => x.name === a?.name); if (st && !can(st, pk)) return answer('🔐 Для вас вимкнено це право'); } }
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

  if (act === 'mod') { // 🧩 модуль закладу (як у касі)
    if (!admin) return answer('🔐 Лише для адміністратора'); const O = await import('./ops.js'); if (!O.MODS[arg]) return answer('Невідомий модуль');
    const was = (await O.modOn(env, arg)) ? 1 : 0, c = await O.setMod(env, arg, !was);
    await (await import('./ledger.js')).audit(env, who, 'mod', 'mod:' + arg, { v: was }, { v: c.mods[arg] });
    const v = await (await import('./bot-views.js')).modsView(env); await edit(v.text, v.markup); return answer(`${O.MODS[arg]}: ${c.mods[arg] ? 'увімкнено' : 'вимкнено'}`);
  }
  if (act === 'agg') { if (!admin) return answer('🔐 Лише адмін'); const A = await import('./agg.js'), x = (await A.aggList(env)).find(a => a.id === arg); if (!x) return answer('Немає такого');
    await A.aggSet(env, { id: x.id, on: x.on ? 0 : 1 }); const v = await A.aggBotView(env); return edit(v.text, v.markup); }
  if (act === 'bnk') { // 🏦 рядок виписки: витрата / рух / пошук пари / пропустити / скасувати — та сама bankAct, що й у касі
    if (!admin) return answer('🔐 Лише для адміністратора'); if (!(await (await import('./ops.js')).modOn(env, 'bank'))) return answer('Модуль «Банк» вимкнено');
    const B = await import('./bank.js'), r = await B.bankAct(env, oid, arg, { why: opt }, who); if (r.error) return answer('⚠️ ' + r.error);
    await edit(B.lineText(r.x), { inline_keyboard: B.lineKb(r.x) }); return answer(r.warn ? '⚠️ ' + r.warn : '✅ Готово');
  }
  if (act === 'wl') { // ⏳ черга в залі — та сама wlAct, що й у касі
    const W = await import('./wl.js');
    if (arg === 'list') { const l = await W.wlList(env); await edit(W.wlText(l), W.wlKb(l)); return answer(''); }
    if (arg === 'seat') { await env.DB.put('st:' + uid, 'wls:' + oid, { expirationTtl: 600 }); await send({ text: '🪑 За який стіл посадили? Номер:' }); return answer(''); }
    const [r] = await W.wlAct(env, oid, arg, 0, who); if (r.error) return answer('⚠️ ' + r.error);
    const l = await W.wlList(env); await edit(W.wlText(l), W.wlKb(l)); return answer(arg === 'call' ? '🔔 Покликали' : 'Готово');
  }
  if (act === 'atk' || act === 'swk' || act === 'zpb' || act === 'zpbs') { // 👷 зміни й зарплата
    if (!admin) return answer('🔐 Лише для адміністратора');
    if (act === 'atk') { const n = (await getStaff(env)).find(z => z.id === oid)?.name; const x = n && await attConfirm(env, arg, n, opt, who); if (!x) return answer('Не знайдено');
      await edit(`${esc(q.message?.text || '')}\n\n${opt === 'n' ? '❌ Відхилив' : '✅ Підтвердив'}${opt === 'f' ? ' + штраф' : ''}: <b>${esc(who)}</b>`); return answer('Готово'); }
    if (act === 'swk') { const sw = await swapStep(env, arg, oid === 'ok' ? 'ok' : 'no', who); await edit(`${esc(q.message?.text || '')}\n\n${sw ? (sw.st === 'done' ? '✅ Обмін підтверджено' : '❌ Відхилено') : 'Вже оброблено'}`); return answer(''); }
    const n = (await getStaff(env)).find(z => z.id === arg)?.name; if (!n) return answer('Не знайдено');
    if (act === 'zpb') { const r = (await payroll(env)).rows.find(z => z.n === n); await send({ text: `💸 Видати <b>${esc(n)}</b> ${money(r?.due || 0)} — звідки?`, markup: { inline_keyboard: [[{ text: '💵 З каси', callback_data: `zpbs:${arg}:cash` }, { text: '💳 З картки', callback_data: `zpbs:${arg}:card` }]] } }); return answer(''); }
    // «видати все»: сума до виплати рахується й записується під одним замком + запобіжник від повторного натискання (10 с)
    const o = await L(env, 'zpbs:' + arg, async () => {
      const g = await env.DB.get('zpbs:' + arg, 'json'); if (g && Date.now() - g.ts < 10e3) return { dup: 1 };
      const r = (await payroll(env)).rows.find(z => z.n === n); if (!(r?.due > 0)) return { none: 1 };
      await env.DB.put('zpbs:' + arg, JSON.stringify({ ts: Date.now() }), { expirationTtl: 60 });
      return payOp(env, { n, t: 'paid', sum: r.due, src: oid }, who);
    });
    if (o.dup) return answer('⏳ Вже видається'); if (o.none) return answer('Нема що видавати');
    await edit(o.op ? `💸 Видано <b>${esc(n)}</b> ${money(o.op.sum)} ${oid === 'card' ? 'з картки' : 'з каси'}` : '⚠️ ' + o.error); return answer('');
  }
  if (/^sk/.test(act)) { // 🧮 розрахунок
    if (!admin) return answer('🔐 Лише для адміністратора');
    const r = (await stockCallback(act, arg, env, uid, who)) || (await stockCallbackW(act, arg, oid, env, uid, who)) || (await stockCallbackX(act, arg, env, uid, who));
    if (r) { if (['skis', 'skix', 'skipp', 'skim'].includes(act)) await edit(r.text, r.markup); else await send(r); }
    return answer('');
  }
  if (act === 'bk') { // 📅 бронь: ok / no / came / noshow / kit
    if (oid === 'came') { const b0 = await bookGet(env, arg); if (b0 && !b0.t && !b0.tw) { await env.DB.put('st:' + uid, 'bkc:' + arg, { expirationTtl: 600 }); await send({ text: '🪑 За який стіл сіли гості? Номер:' }); return answer(''); } }
    if (oid === 'kit') { const b0 = await bookGet(env, arg); if (b0 && !b0.t) { await env.DB.put('st:' + uid, 'bkt:' + arg, { expirationTtl: 600 }); await send({ text: '🪑 Номер стола для передзамовлення?' }); return answer(''); } }
    const r = await bookSet(env, arg, oid, who); if (!r || r.error) return answer(r?.error || 'Не знайдено');
    return answer(bkLabel(oid === 'kit' ? 'ok' : oid));
  }
  if (act === 'goe' || act === 'goef') { // ✏️ доставка (адмін)
    if (!admin) return answer('🔐 Лише для адміністратора');
    const g = (await getBill(env, +arg)).go; if (!g) return answer('Немає замовлення');
    if (act === 'goe') { await send({ text: `✏️ <b>${tn(+arg)}</b> · ${esc(g.name || '')} ${fmtPhone(g.phone)}${g.addr ? `\n📍 ${esc(g.addr)}` : ''}${g.ent ? `\n🚪 ${esc(g.ent)}` : ''}${g.when ? `\n🕐 ${esc(g.when)}` : ''}${g.note ? `\n💬 ${esc(g.note)}` : ''}\n\nЩо змінити?`,
      markup: { inline_keyboard: chunk(Object.entries(GO_F).filter(([f]) => g.kind === 'del' || !['addr', 'ent'].includes(f)).map(([f, t]) => ({ text: t, callback_data: `goef:${arg}:${f}` })), 3) } }); return answer(''); }
    if (!GO_F[oid]) return answer('');
    await env.DB.put('st:' + uid, `goe:${arg}:${oid}`, { expirationTtl: 600 }); await send({ text: `${GO_F[oid]}: ${GO_ASK[oid]}` }); return answer('');
  }
  // 📋 черга друку по завданнях: 🗑 одне / 🔁 на інший принтер (як у касі)
  if (act === 'pql' || act === 'pdel' || act === 'pmt') {
    if (!admin) return answer('🔐 Лише для адміністратора');
    if (act === 'pdel') { await printClear(env, arg); await notify(env, `🗑 Завдання друку видалено — ${esc(who)}`).catch(() => {}); }
    if (act === 'pmt') { const r = await printMove(env, arg, oid); if (r.error) return answer('⚠️ ' + r.error); }
    const l = (await printList(env)).sort((a, b) => a.at - b.at).slice(0, 8), st = (await getRoute(env)).st;
    if (!l.length) { await edit('🖨 Черга друку порожня'); return answer('✅'); }
    await edit(`📋 <b>Черга друку</b>\n\n${l.map((j, i) => `${i + 1}. ${j.at ? hhmm(j.at) : ''} · ${esc(j.kind)}${j.sn ? ` → <b>${esc(j.sn)}</b>` : ''}\n   <i>${esc(j.txt || '')}</i>`).join('\n')}`, { inline_keyboard: l.map((j, i) => [{ text: `🗑 ${i + 1}`, callback_data: `pdel:${j.id}` }, ...st.filter(x => x.id !== j.st).slice(0, 3).map(x => ({ text: `🔁 ${i + 1} → ${x.name}`.slice(0, 30), callback_data: `pmt:${j.id}:${x.id}` }))]) });
    return answer(act === 'pdel' ? '🗑 Видалено' : act === 'pmt' ? '🔁 Перенесено' : '📋');
  }
  if (act === 'pclr') { if (!admin) return answer('🔐 Лише для адміністратора'); const r = await printClear(env, ''); await notify(env, `🗑 Черга друку очищена (${r.n}) — ${esc(who)}`).catch(() => {}); await edit(`🖨 Черга друку очищена: видалено ${r.n}`); return answer('🗑 Очищено'); }
  if (act === 'gic') { await (await import('./guestbot.js')).inboxClose(env, arg, who); await edit(esc(q.message.text || '') + '\n\n✔️ Закрито — ' + esc(who)); return answer('✔️'); }
  if (act === 'tkd' || act === 'tkn') { const s0 = await meStaff(env, uid); if (!s0) return answer('🔐 Увійдіть PIN');
    if (act === 'tkn') { await env.DB.put('st:' + uid, 'tkwhy:' + arg, { expirationTtl: 900 }); await tg(env, 'sendMessage', { chat_id: chat, text: '❌ Напишіть коротко, чому не зроблено:' }); return answer('Напишіть причину'); }
    const T = await import('./tasks.js'), r = await T.taskMark(env, { name: s0.name, role: s0.role, sid: s0.id }, dayKey(), arg, 'done'); if (r.error) return answer(r.error);
    const v = await T.taskBotView(env, s0); await edit(v.text, v.markup); return answer('✅ Зроблено'); }
  if (act === 'idx' || act === 'idd') { const I = await import('./ideas.js'), me = await meStaff(env, uid); if (!me) return answer('🔐 Увійдіть PIN');
    const r = act === 'idx' ? await I.ideaDel(env, arg, me.name, admin, me.id) : await I.ideaDone(env, arg, admin); if (r.error) return answer(r.error);
    const v = await I.ideaBotList(env, me, admin); await edit(v.text, v.markup); return answer(act === 'idx' ? '🗑 Видалено' : '✅'); }
  if (['lcl', 'llv', 'lro', 'lcs', 'lpr'].includes(act)) { // 🎁 лояльність: картка клієнта, рівень, увімк/вимк акції
    const r = await loyBotCb(env, act, arg, oid, admin, who); if (!r) return answer('');
    if (r.send) await send(r.send); if (r.edit) await edit(r.edit.text, r.edit.markup); return answer(r.answer || '');
  }
  if (act === 'bkd') { if (!isDay(arg)) return answer(''); await booksSend(env, send, arg, arg); return answer(''); }
  if (act === 'bkdd') { await env.DB.put('st:' + uid, 'bkd', { expirationTtl: 600 }); await send({ text: '📆 Яка дата? <code>25.10</code> або період <code>25.10-30.10</code>' }); return answer(''); }
  if (act === 'bkn') { await env.DB.put('st:' + uid, 'bkn', { expirationTtl: 900 }); await send({ text: BK_NEW_HELP }); return answer(''); }
  if (act === 'bke') { const b = await bookGet(env, arg); if (!b) return answer('Не знайдено');
    await send({ text: '✏️ Що змінити?\n' + bkLine(b), markup: { inline_keyboard: chunk(Object.entries(BK_F).map(([f, t]) => ({ text: t, callback_data: `bkef:${b.id}:${f}` })), 3) } }); return answer(''); }
  if (act === 'bkef') { if (!BK_F[oid] || !await bookGet(env, arg)) return answer('Не знайдено'); await env.DB.put('st:' + uid, `bke:${arg}:${oid}`, { expirationTtl: 600 }); await send({ text: `${BK_F[oid]}: ${BK_ASK[oid]}` }); return answer(''); }
  if (act === 'tgl') { const s = (await getStaff(env)).find(z => z.id === arg); if (!s) return answer('Не знайдено'); await env.DB.put('st:' + uid, 'tgpin:' + s.id, { expirationTtl: 300 }); await send({ text: `🔑 <b>${esc(s.name)}</b>: введіть свій PIN каси (повідомлення одразу видалиться)` }); return answer(''); }
  if (act === 'tgw') { await send(await pickMeView(env)); return answer(''); }
  if (act === 'tgu') { await env.DB.delete('tgs:' + uid); await edit('🔓 Відвʼязано. «зміна» — привʼязати знову.'); return answer(''); }
  if (act === 'cc') { // 🛵 адмін отримав готівку від кур'єра
    if (!admin) return answer('🔐 Лише для адміністратора');
    const n = (await getStaff(env)).find(z => z.id === arg)?.name; if (!n) return answer('Не знайдено працівника'); const r = await courCashGive(env, n, +oid, who); if (!r) return answer('Некоректна сума'); await edit(`${q.message?.text ? esc(q.message.text) : ''}\n\n✅ Отримав ${oid} ₴ — <b>${esc(who)}</b>`); return answer(r ? 'Записано' : '');
  }
  if (act === 'ct') { // 🎁 сертифікат оплачено / скасовано
    if (!admin) return answer('🔐 Лише для адміністратора');
    const c = await certPay(env, arg, oid, who); if (!c) return answer('Вже оброблено');
    await edit(`${q.message?.text ? esc(q.message.text) : ''}\n\n${c.st === 'ok' ? `✅ Оплачено (${oid === 'card' ? '💳' : '💵'}) — код <b>${c.code}</b>` : '❌ Скасовано'} · ${esc(who)}`); return answer('');
  }
  if (act === 'gos') { // 🛵 статус доставки
    const g = (await getBill(env, +arg)).go; if (!g) return answer('Вже закрито');
    if (oid === 'done' && g.pay !== 'online' && !opt) { await edit(`${q.message?.text ? esc(q.message.text) : ''}\n\n🤝 ${tn(arg)} — як заплатили?`, { inline_keyboard: [[{ text: '💵 Готівка', callback_data: `gos:${arg}:done:cash` }, { text: '💳 Картка', callback_data: `gos:${arg}:done:card` }]] }); return answer(''); }
    const r = await goSet(env, +arg, oid, who, { pay: opt });
    if (!r) return answer('Не вдалось');
    await edit(`${q.message?.text ? esc(q.message.text) : ''}\n\n${goStLabel(oid)} — <b>${esc(who)}</b> о ${hhmm()}${r.done ? ` · ${money(r.sum)} ${r.card ? '💳' : '💵'}` : ''}`, r.done ? undefined : { inline_keyboard: goButtons({ ...r, t: +arg }) });
    return answer(goStLabel(oid));
  }
  if (act === 'rej') { // ❌ відхилити замовлення гостя
    const o = await rejectOrder(env, oid, who, { editTg: false });
    const html = q.message.text ? esc(q.message.text) : '';
    if (o) await edit(`${html}\n\n❌ Відхилив: <b>${esc(who)}</b> о ${hhmm()}`);
    return answer(o ? 'Відхилено' : 'Вже прийнято');
  }
  if (act === 'acc') { // ✅ Прийняв — гість бачить статус на сайті, POS — у стрічці
    const html = q.message.text ? esc(q.message.text) : '';
    await acceptOrder(env, oid, who, { editTg: false });
    const gb = isGo(arg) ? (await getBill(env, +arg)).go : null;
    await edit(`${html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, { inline_keyboard: gb ? goButtons({ ...gb, t: +arg }) : [[{ text: '🧾 Закрити стіл ' + tn(arg), callback_data: 'cls:' + arg }]] });
    return answer('Прийнято');
  }
  if (act === 'o') { // замовлення кнопками
    const r = await obCallback(env, uid, q.data.split(':').slice(1));
    if (r.expired) { await edit('⌛ Замовлення застаріло. Почніть заново: «➕ Замовлення».'); return answer(''); }
    if (r.cancel) { await edit('✖ Замовлення скасовано.'); return answer(''); }
    if (r.tablePick) { const v = await tablePick(env, (await openTables(env)).map(x => x.t), tablesCount(env), r.hall); await edit(v.text, v.markup); return answer(''); }
    if (r.comment) {
      r.ob.mid = mid; r.ob.chat = chat; await putOb(env, uid, r.ob);
      await env.DB.put('st:' + uid, 'ocom', { expirationTtl: 600 });
      return answer('💬 Напишіть коментар повідомленням (наприклад: без цибулі)');
    }
    if (r.send?.gk) { // 🥡/🛵 з собою — спершу контакти клієнта, потім окремий чек С‑/Д‑
      await env.DB.put('gopend:' + uid, JSON.stringify({ ...r.send, mid: q.message?.message_id }), { expirationTtl: 900 });
      await env.DB.put('st:' + uid, 'gocon', { expirationTtl: 900 });
      await edit(`${r.send.gk === 'del' ? '🛵 <b>Доставка</b>' : '🥡 <b>Самовивіз</b>'} — напишіть одним повідомленням:\n<code>Імʼя, телефон${r.send.gk === 'del' ? ', адреса' : ''}</code>\nнапр. <code>Олег, 0671234567${r.send.gk === 'del' ? ', Карпатська 12' : ''}</code>\nІмʼя й телефон необовʼязкові: <code>-</code> — пропустити${r.send.gk === 'del' ? ', або надішліть лише адресу' : ''}.`);
      return answer('Вкажіть клієнта');
    }
    if (r.send) {
      const com = [r.send.tw ? 'З СОБОЮ' : '', r.send.com || ''].filter(Boolean).join(' · ');
      const res = await addWaiterOrder(env, { table: r.send.table, items: r.send.items }, who, com, 'бот', !!r.send.ur);
      if (!res) { await edit('Нічого додати.'); return answer(''); }
      await edit(`✅ <b>Стіл ${tn(r.send.table)}</b> — ${res.prev?.length ? '<b>➕ ДОЗАМОВЛЕННЯ</b> відправлено' : 'замовлення відправлено'} (${esc(who)}, ${hhmm()})\n${res.lines.map(x => '🟠 ' + esc(x)).join('\n')}${com ? `\n💬 ${esc(com)}` : ''}\nСума: <b>${money(res.sum)}</b>\n\n💰 Разом за стіл: <b>${money(res.total)}</b>`,
        { inline_keyboard: [[{ text: '➕ Дозамовити', callback_data: 'o:t:' + r.send.table }, { text: `🪑 Стіл ${tn(r.send.table)}`, callback_data: 'tbl:' + r.send.table }], [{ text: '🧾 Закрити стіл', callback_data: 'cls:' + r.send.table }]] });
      return answer('🖨 Відправлено на кухню');
    }
    if (r.view) await edit(r.view.text, r.view.markup);
    return answer(r.toast || '');
  }
  if (act === 'kv') { const v = await kitchenView(env); await edit(v.text, v.markup); return answer(''); }
  if (act === 'kst') { const e = await kitchenStart(env, arg, who); const v = await kitchenView(env); await edit(v.text, v.markup); return answer(e ? '🔥 Готується' : ''); }
  if (act === 'kdn') { const e = await kitchenDone(env, arg, null, who); const v = await kitchenView(env, e ? `🍽 Стіл ${tn(e.t)} — готово` : ''); await edit(v.text, v.markup); return answer(e ? 'Готово' : ''); }
  if (act === 'eq') { // ➗ порівну: скільки з кожного (підказка, оплата — одним рахунком)
    await send({ text: `➗ Стіл ${tn(arg)} — на скількох гостей?`, markup: { inline_keyboard: [[2, 3, 4, 5, 6, 8].map(n => ({ text: String(n), callback_data: `eqn:${arg}:${n}` })), [{ text: 'Скасувати', callback_data: 'no' }]] } });
    return answer('');
  }
  if (act === 'eqn') {
    const b = await getBill(env, arg), n = +oid; if (!b.total || !(n >= 2)) return answer('Стіл закритий');
    const tot = payable(b) + (b.tip || 0), one = Math.floor(tot / n), rest = tot - one * n;
    await send({ text: `➗ Стіл ${tn(arg)}: ${money(tot)} на ${n} → з кожного <b>${money(one)}</b>${rest ? ` (один доплачує ${money(one + rest)})` : ''}`, markup: payButtons(arg) });
    return answer('');
  }
  if (act === 'cls') { await send(await closeAsk(env, arg)); return answer(''); }
  if (act === 'wok') { // підтвердження замовлення офіціанта (текстом)
    const d = await env.DB.get('draft:' + arg, 'json');
    if (!d) { await edit('⌛ Чернетка застаріла або вже додана. Надішліть замовлення ще раз.'); return answer(''); }
    const exe = await exCheck(env, d.items); if (exe) { await edit('⚠️ ' + esc(exe)); return answer('🍾 Не вистачає марок'); }
    await env.DB.delete('draft:' + arg);
    const r = await addWaiterOrder(env, d, who);
    if (!r) { await edit('Нічого додати.'); return answer(''); }
    await edit(`✅ <b>${r.prev?.length ? '➕ ДОЗАМОВЛЕННЯ до столу' : 'Додано до столу'} ${d.table}</b> (${esc(who)}, ${hhmm()})\n${r.lines.map(x => '🟠 ' + esc(x)).join('\n')}\nСума: <b>${money(r.sum)}</b>\n\n💰 Разом за стіл: <b>${money(r.total)}</b>`,
      { inline_keyboard: [[{ text: `🪑 Стіл ${tn(d.table)}`, callback_data: 'tbl:' + d.table }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + d.table }]] });
    return answer('Додано');
  }
  if (act === 'tpok' || act === 'tprf') { // 💳 стіл оплачено з QR: ✅ закрити (доплату — готівкою) / ↩️ повернути гроші (лише адмін) — як у касі
    const r = await (await import('./lpay.js')).tpayApi({ op: act === 'tpok' ? 'tpayOk' : 'tpayRefund', t: +arg, pay: 'cash' }, env, { role: admin ? 'admin' : 'waiter', name: who + ' · бот' });
    if (r[0].error) return answer('⚠️ ' + r[0].error);
    await edit(act === 'tpok' ? `✅ Стіл ${tn(arg)}: онлайн-оплату підтверджено, стіл закрито (${esc(who)})` : `↩️ Стіл ${tn(arg)}: гостю повернуто ${money(r[0].sum)} (${esc(who)})`); return answer(act === 'tpok' ? 'Закрито' : 'Повернуто'); }
  if (act === 'ibq') { // 🏦 QR НБУ на переказ → фото в чат, закриття — коли гроші прийшли
    const F = await import('./fiscal.js'), v = await F.ibanGet(env), b = await getBill(env, +arg); if (!v) return answer('Рахунок для переказу не вказано (кабінет → 💳 Оплата)'); if (!b.total) return answer(`Стіл ${tn(arg)} порожній`);
    const sum = payable(b) + (b.tip || 0) + (b.ktip || 0) - Math.round(b.go?.paid?.sum || b.paid?.sum || 0); if (!(sum > 0)) return answer('Усе вже оплачено');
    const fd = new FormData(); fd.append('chat_id', String(chat)); fd.append('parse_mode', 'HTML'); fd.append('caption', `🏦 Стіл ${tn(arg)}: переказ <b>${money(sum)}</b>\n${esc(v.n || '')}\n<code>${esc(v.iban)}</code>\n\nПокажіть QR гостю — він сканує камерою або в застосунку банку.`);
    fd.append('reply_markup', JSON.stringify({ inline_keyboard: [[{ text: '✅ Гроші прийшли — закрити', callback_data: `clsok:${arg}:iban:np` }], [{ text: 'Скасувати', callback_data: 'no' }]] }));
    fd.append('photo', new Blob([await (await import('./qr.js')).qrPng(F.ibanQr(v, sum, `Оплата за замовлення, стіл ${tn(arg)}`), 8)], { type: 'image/png' }), 'qr.png');
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd }).catch(() => {}); return answer(''); }
  if (act === 'clsok') { if (oid === 'iban' && !(await (await import('./fiscal.js')).ibanGet(env))) return answer('Рахунок для переказу не вказано');
    const A = String(oid).startsWith('agg-') ? await import('./agg.js') : null; if (A && (!(await (await import('./ops.js')).modOn(env, 'agg')) || !(await A.aggPay(env, 'agg:' + oid.slice(4))))) return answer('Агрегатор вимкнено');
    const cr = await closeTable(env, +arg, who, A ? 'agg:' + oid.slice(4) : ['card', 'iban'].includes(oid) ? oid : 'cash', opt !== 'np'); if (cr?.ag) cr.agN = A.aggName(await A.aggList(env), cr.ag);
    const txt = closedText(cr);
    const nx = (await (await import('./wl.js')).wlList(env).catch(() => [])).find(x => x.st === 'wait'); // ⏳ у черзі є гість — пропонуємо покликати (без автовідправки)
    if (oid === 'iban') await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: mid, reply_markup: { inline_keyboard: [] } }); // повідомлення з QR — фото, текст не редагується
    await (oid === 'iban' ? (t, m) => send({ text: t, markup: m }) : edit)(nx ? txt + `\n\n⏳ Стіл вільний — у черзі <b>${esc(nx.name)}</b>, ${nx.people} ос.` : txt, nx ? { inline_keyboard: [[{ text: `🔔 Покликати ${nx.name.slice(0, 14)}`, callback_data: 'wl:call:' + nx.id }]] } : undefined); return answer('Закрито'); }
  if (act === 'pre') return answer(await precheck(env, +arg, who) ? '🖨 Пречек відправлено на принтер' : `Стіл ${tn(arg)} порожній`);
  if (act === 'dsc') { // знижка
    const b = await getBill(env, arg); if (!b.total) return answer(`Стіл ${tn(arg)} порожній`);
    await send({ text: `% <b>Знижка для столу ${tn(arg)}</b> (${money(b.total)})${b.disc ? `\nЗараз: ${b.disc}%` : ''}`, markup: { inline_keyboard: [
      [5, 10, 15, 20].map(p => ({ text: p + '%', callback_data: `dscs:${arg}:${p}` })), [25, 30, 50].map(p => ({ text: p + '%', callback_data: `dscs:${arg}:${p}` })).concat([{ text: '✏️ Свій %', callback_data: 'dscc:' + arg }]),
      [{ text: '✖ Без знижки', callback_data: `dscs:${arg}:0` }]] } });
    return answer('');
  }
  if (act === 'dscs') { const b = await setDiscount(env, +arg, +oid, who, admin); if (!b) return answer('Стіл порожній'); if (b.error) return answer(`⛔ Офіціант — до ${b.max}%. Більше — лише адмін`); const v = await tableView(env, +arg); await edit(v.text, v.markup); return answer(+oid ? `Знижка ${oid}%` : 'Знижку прибрано'); }
  // чайові додає лише гість (на сайті); прибрати помилкові — лише адмін
  if (act === 'tipx') { if (!admin) return answer('🔐 Лише адміністратор'); await setTip(env, +arg, 0, who); const v = await tableView(env, +arg); await edit(v.text, v.markup); return answer('Чайові прибрано'); }
  if (act === 'dscc') { await env.DB.put('st:' + uid, 'dscc:' + arg, { expirationTtl: 300 }); return answer('Напишіть відсоток знижки числом'); }
  if (act === 'spl') { // ✂️ розділити: куди → далі тиснемо позиції по 1 шт
    const b = await getBill(env, arg); if (!b.total) return answer(`Стіл ${tn(arg)} порожній`);
    const open = new Set((await openTables(env)).map(r => r.t));
    await send({ text: `✂️ <b>Стіл ${tn(arg)}</b> — на який стіл перенести частину рахунку?\n<i>• — зайнятий стіл: позиції додадуться до нього</i>`, markup: { inline_keyboard: [...tablesGrid(env, 'splt:' + arg, +arg).map(r => r.map(x => { const n = +x.text; return { text: open.has(n) ? `• ${n}` : x.text, callback_data: x.callback_data }; })), [{ text: 'Скасувати', callback_data: 'no' }]] } });
    return answer('');
  }
  if (act === 'splt' || act === 'spli') { // spli:t:to:idx — перенести 1 шт позиції idx
    if (act === 'spli') { const it = billItems(await getBill(env, arg))[+opt]; if (it) { const r = await splitTable(env, +arg, [{ name: it.name, q: 1 }], +oid, who + ' · бот'); if (r?.error) return answer(r.error); if (!r) return answer('Не вдалось'); } }
    const items = billItems(await getBill(env, arg)), to = await getBill(env, oid);
    await edit(`✂️ <b>Стіл ${tn(arg)} → стіл ${tn(oid)}</b>\nНатискайте позиції — кожне натискання переносить 1 шт.\n\nНа столі ${tn(oid)}: <b>${money(to.total || 0)}</b>${(to.log || []).filter(o => o.kind.startsWith('✂️')).flatMap(o => o.lines).map(l => '\n• ' + esc(l)).join('')}`,
      { inline_keyboard: [...items.map((x, i) => [{ text: `➡️ ${x.name} (${x.q} шт)`.slice(0, 60), callback_data: `spli:${arg}:${oid}:${i}` }]), [{ text: '✅ Готово', callback_data: 'tbl:' + oid }]] });
    return answer(act === 'spli' ? '➡️ Перенесено 1 шт' : '');
  }
  if (act === 'mv') { // перенос / об'єднання
    const b = await getBill(env, arg); if (!b.total) return answer(`Стіл ${tn(arg)} порожній`);
    const open = new Set((await openTables(env)).map(r => r.t));
    await send({ text: `↔️ <b>Стіл ${tn(arg)}</b> — куди перенести?\n<i>• — зайнятий стіл: рахунки об'єднаються</i>`, markup: { inline_keyboard: [...tablesGrid(env, 'mvt:' + arg, +arg).map(r => r.map(x => { const n = +x.text; return { text: open.has(n) ? `• ${n}` : x.text, callback_data: x.callback_data }; })), [{ text: 'Скасувати', callback_data: 'no' }]] } });
    return answer('');
  }
  if (act === 'mvt') { const r = await moveTable(env, +arg, +oid, who); if (!r) return answer('Не вдалось'); await edit(r.merged ? `🔗 Стіл ${tn(arg)} об'єднано зі столом ${tn(oid)}.` : `↔️ Стіл ${tn(arg)} перенесено на стіл ${tn(oid)}.`); await send(await tableView(env, +oid)); return answer('Готово'); }
  if (act === 'pqr') { // вибір столу для QR
    await send({ text: '🔳 <b>QR меню</b> — для якого столу?', markup: { inline_keyboard: [...tablesGrid(env, 'pqrt'), [{ text: 'Без столу', callback_data: 'pqrt:0' }]] } });
    return answer('');
  }
  if (act === 'pqrt') { await queuePrint(env, 'qr', QR_PRINT(+arg, await (await import('./qr.js')).qrImg(env, +arg))); return answer(`🖨 QR${+arg ? ' столу ' + arg : ''} відправлено на принтер`); }
  if (act === 'ptest') { await queuePrint(env, 'test', TEST_PRINT()); return answer('🖨 Тест відправлено'); }
  if (act === 'tbl') { await send(await tableView(env, +arg)); return answer(''); }
  if (act === 'ed') { const v = await editView(env, +arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'rm') { // скасування — лише з причиною
    const it = billItems(await getBill(env, +arg))[+oid]; if (!it) return answer('');
    await edit(`✏️ <b>Стіл ${tn(arg)}</b> — скасувати 1× <b>${esc(it.name)}</b> (${Math.round(it.sum / it.q)} грн)?\n\n❓ <b>Чому?</b> Оберіть причину або напишіть свою:`, { inline_keyboard: [
      ...chunk(VOID_R.map((r, k) => ({ text: r, callback_data: `rmq:${arg}:${oid}:${k}` })), 2), [{ text: '⬅️ Назад', callback_data: 'ed:' + arg }]] });
    await env.DB.put('st:' + uid, `rmr:${arg}:${oid}`, { expirationTtl: 300 });
    return answer('Вкажіть причину');
  }
  if (act === 'rmq') {
    const it = billItems(await getBill(env, +arg))[+oid];
    const r = it ? await removeOne(env, +arg, it.name, who, VOID_R[+opt] || 'інше') : null; await env.DB.delete('st:' + uid);
    const v = await editView(env, +arg, r && !r.error ? `🗑 Скасовано: 1× ${esc(r.name)} (−${r.unit} грн) · ${esc(r.reason)}` : ''); await edit(v.text, v.markup); return answer(r && !r.error ? 'Скасовано' : '');
  }
  if (act === 'back') {
    const it = await setHidden(env, arg, false);
    if (it) await logEvent(env, { k: 'shift', by: who, text: `✅ ${it.name.uk} — знову в меню` });
    const v = await stopView(env); await edit(v.text, v.markup); return answer(it ? `${it.name.uk} знову в меню` : 'Не знайдено');
  }
  // лише адміністратор
  if (['del', 'delok', 'wifiask', 'wifiok', 'dc', 'dcok', 'cv', 'cvb', 'cvp', 'rst1', 'rst2', 'exs', 'exdel', 'exdelok', 'float', 'exlist', 'shop', 'shopl', 'shcl', 'cmv', 'cmvx', 'cmvp', 'cmvm', 'zday', 'rcn', 'kpct', 'cfg', 'cvro', 'cvbk', 'vbk', 'tbk', 'exbk', 'tpay', 'tpc', 'tpk', 'rp', 'stfadd', 'stfdel', 'stf', 'stfn', 'stfp', 'stfr', 'stfro', 'stfdq', 'stfbk', 'wout', 'mvl', 'mvdel', 'mvdok', 'mvbk', 'zl', 'zv', 'zdel', 'zdok', 'zbk', 'ce', 'cem', 'cex', 'cep', 'zdx', 'zdz', 'zdzp', 'zdzn'].includes(act) && !admin) return answer('🔐 Лише для адміністратора');
  if (act === 'del') {
    const b = await getBill(env, arg);
    if (!b.total) return answer(`Стіл ${tn(arg)} вже порожній`);
    await confirm(`🗑 Видалити <b>стіл ${tn(arg)}</b> (${money(b.total)})? Сума НЕ піде у виручку.`, 'delok:' + arg); return answer('');
  }
  if (act === 'delok') { const r = await deleteTable(env, +arg, who); await edit(r ? `🗑 <b>Стіл ${tn(arg)} видалено</b> (${money(r.sum)}) — у виручку не піде.` : `Стіл ${tn(arg)} вже порожній.`); return answer('Видалено'); }
  if (act === 'wifiask') { await confirm('🗑 Скинути всі мережі? Замовлення не прийматимуться, поки не додасте мережу знову через admin.html.', 'wifiok'); return answer(''); }
  if (act === 'wifiok') { await env.DB.put('venue_ips', '[]'); await edit('📶 Усі мережі скинуто. Додайте мережу закладу через admin.html.'); return answer('Скинуто'); }
  if (act === 'vbk') { const v = await restoreVoid(env, +arg, who); if (!v) return answer('Вже повернуто'); await send({ text: `↩️ Стіл ${tn(v.t)}: повернуто <b>${esc(v.name)}</b> (${money(v.sum)})` }); return answer('Повернуто'); }
  if (act === 'cv') { const v = await closedOne(env, arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'fsr') { const F = await import('./fiscal.js'), x = await closedRec(env, arg); const r = x?.id && F.fisOn(env) ? await F.fisSync(env, dayKey(), x.id) : null; const v = await closedOne(env, arg); await edit(v.text, v.markup); return answer(!r ? 'ПРРО не підключено' : r.st === 'err' ? '⚠️ Checkbox не прийняв' : '🧾 Фіскалізовано'); } // 🧾 повторити фіскальний чек (паритет з касою)
  if (act === 'cvbk') { const x = await restoreClosed(env, arg, who); await edit(x ? `↩️ Рахунок стола ${tn(x.t)} (${money(x.sum)}, ${x.at}) повернуто у виручку.` : 'Не вдалось — вже повернуто?'); return answer(x ? 'Повернуто' : ''); }
  if (act === 'cvro') { const x = await reopenClosed(env, arg, who); if (!x) return answer('Не вдалось'); await edit(`↩️ Рахунок стола ${tn(x.t)} (${money(x.sum)}) знято з виручки й відкрито знову.`); await send(await tableView(env, x.t)); return answer('Відкрито'); }
  if (act === 'tbk') { const x = await restoreTable(env, arg, who); if (!x) return answer('Не вдалось'); await edit(`↩️ Стіл ${tn(x.t)} відновлено (${money(x.sum)}).`); await send(await tableView(env, x.t)); return answer('Відновлено'); }
  if (act === 'exbk') { await restoreExpense(env, +arg); await edit('↩️ Витрату відновлено.'); return answer(''); }
  if (act === 'cvb') { const v = await closedView(env); await edit(v.text, v.markup); return answer(''); }
  if (act === 'cvp') return answer(await reprintClosed(env, arg, who) ? '🖨 Чек відправлено на принтер' : 'Немає переліку страв');
  if (act === 'dc') { await confirm('🧹 Видалити цей закритий рахунок? Сума відніметься з виручки.', 'dcok:' + arg); return answer(''); }
  if (act === 'dcok') { const x = await delClosed(env, arg, undefined, who); await edit(x ? `🧹 Рахунок стола ${tn(x.t)} (${money(x.sum)}, ${x.at}) видалено з виручки.` : 'Цей рахунок уже видалено.'); return answer('Видалено'); }
  if (act === 'rst1') { await edit('⚠️ Точно? Це не можна скасувати.', { inline_keyboard: [[{ text: '♻️ Так, усе обнулити', callback_data: 'rst2' }, { text: 'Ні', callback_data: 'no' }]] }); return answer(''); }
  if (act === 'rst2') { const n = await resetAll(env); await edit(`♻️ <b>Усе обнулено</b> (${n} записів): звіти, каса, витрати, закриті рахунки, топ страв, стрічка, відкриті столи.\nМеню, Wi‑Fi, персонал і паролі не чіпались.`); return answer('Обнулено'); }
  if (act === 'exy') { /* 📅 витрата за минулий день — як у касі */
    const e = await env.DB.get('expd:' + arg, 'json'); if (!e) { await edit('⌛ Застаріло. Натисніть «💸 Витрата» ще раз.'); return answer(''); }
    const n = Math.min(7, Math.max(1, +oid || 1)), d = new Date(Date.parse(dayKey() + 'T12:00:00Z') - n * 864e5).toISOString().slice(0, 10); e.day = d; await env.DB.put('expd:' + arg, JSON.stringify(e), { expirationTtl: 3600 });
    await edit(`💸 Витрата <b>${money(e.sum)}</b>${e.note ? ` — ${esc(e.note)}` : ''}
📅 за <b>${d.slice(8)}.${d.slice(5, 7)}</b>
Звідки гроші?`, { inline_keyboard: [[{ text: '💵 З каси (готівка)', callback_data: `exs:${arg}:cash` }, { text: '💳 З карти', callback_data: `exs:${arg}:card` }], [{ text: 'Скасувати', callback_data: 'no' }]] }); return answer('');
  }
  if (act === 'exs') {
    const e = await env.DB.get('expd:' + arg, 'json');
    if (!e) { await edit('⌛ Застаріло. Натисніть «💸 Витрата» ще раз.'); return answer(''); }
    await env.DB.delete('expd:' + arg);
    const { day: eday, ...e0 } = e; await addExpense(env, { ...e0, src: oid === 'card' ? 'card' : 'cash', at: hhmm(), by: who, ...(eday ? { late: 1 } : {}) }, eday || undefined);
    await edit(`✅ Витрату записано${eday ? ` за ${eday.slice(8)}.${eday.slice(5, 7)}` : ''}: <b>${money(e.sum)}</b> ${oid === 'card' ? '💳 з карти' : '💵 з каси'}${e.note ? ` — ${esc(e.note)}` : ''}`); return answer('Записано');
  }
  if (act === 'exlist') { await send(await expListView(env)); return answer(''); }
  if (act === 'exdel') { await confirm('🗑 Видалити цю витрату?', 'exdelok:' + arg); return answer(''); }
  if (act === 'exdelok') { await delExpense(env, +arg); await edit('🗑 Витрату видалено.'); return answer(''); }
  if (act === 'tpay') { const b = await tipBalances(env), name = Object.keys(b).find(k => cb64('tpay:' + k) === q.data) || q.data.slice(5); if (!b[name]) return answer('Нема що видавати');
    await send({ text: `💝 Видати чайові <b>${esc(name)}</b> — ${money(b[name])}\nЗвідки списати?`, markup: { inline_keyboard: [[{ text: '💵 Готівкою з каси', callback_data: ('tpc:' + name).slice(0, 60) }, { text: '💳 З картки', callback_data: ('tpk:' + name).slice(0, 60) }], [{ text: 'Скасувати', callback_data: 'no' }]] } }); return answer(''); }
  if (act === 'tpc' || act === 'tpk') { const name = q.data.slice(4); const s = await payTips(env, name, who, act === 'tpk' ? 'card' : 'cash'); if (!s) return answer('Нема що видавати'); await edit(`💝 Видано чайові: <b>${esc(name)}</b> — ${money(s)} ${act === 'tpk' ? '💳 з картки' : '💵 готівкою'}`); return answer('Видано'); }
  if (act === 'mvl' || act === 'zl') { const d = isDay(arg) ? arg : dayKey(), v = act === 'mvl' ? await movView(env, d) : await zListView(env, d); if (arg) await edit(v.text, v.markup); else await send(v); return answer(''); }
  if (act === 'mvdel' || act === 'zdel') { if (!isDay(oid)) return answer(''); await confirm(act === 'mvdel' ? '🗑 Видалити цей запис руху коштів? Залишки перерахуються.' : '🗑 Видалити це закриття каси (Z)?', `${act === 'mvdel' ? 'mvdok' : 'zdok'}:${arg}:${oid}`); return answer(''); }
  if (['mvdok', 'mvbk', 'zdok', 'zbk'].includes(act)) { if (!isDay(oid)) return answer('');
    const ok = await { mvdok: delMove, mvbk: restoreMove, zdok: delZ, zbk: restoreZ }[act](env, +arg, oid);
    const v = act[0] === 'm' ? await movView(env, oid) : await zListView(env, oid); await (act.endsWith('ok') ? send(v) : edit(v.text, v.markup));
    if (act.endsWith('ok')) await edit(ok ? '🗑 Видалено.' : 'Вже видалено.');
    return answer(ok ? (act.endsWith('ok') ? 'Видалено' : 'Повернуто') : 'Без змін'); }
  if (act === 'zv') { const z = isDay(oid) && (await getZs(env, oid))[+arg]; if (!z) return answer('Не знайдено'); await send({ text: (z.del ? '🗑 <b>(видалено)</b>\n' : '') + zText(z) }); return answer(''); }
  if (act === 'zday') { const z = await dayZData(env); await send({ text: zDayText(z).replace('Z-звіт за', 'Z-звіт (поточний) за'), markup: { inline_keyboard: [[{ text: '🖨 Надрукувати', callback_data: 'zdx' }, { text: '🔒 Закрити день', callback_data: 'zdz' }]] } }); return answer(''); }
  if (act === 'zdx') { const z = await dayX(env, who); return answer(`🖨 X-звіт надруковано · ${money(z.total)}`); }
  if (act === 'zdz') { await send({ text: '🔒 Закрити день? Z-звіт запишеться в історію.', markup: { inline_keyboard: [[{ text: '🖨 Закрити й надрукувати', callback_data: 'zdzp' }], [{ text: '📲 Закрити без друку', callback_data: 'zdzn' }, { text: 'Ні', callback_data: 'no' }]] } }); return answer(''); }
  if (act === 'zdzp' || act === 'zdzn') { const z = await dayZ(env, who, act === 'zdzp'); await edit(zDayText(z) + `\n\n🔒 День закрито${act === 'zdzp' ? ' · 🖨 надруковано' : ''}`); return answer('Z-звіт'); }
  if (act === 'ce') { const v = await ceView(env, arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'cem' || act === 'cex' || act === 'cep') {
    const x = await closedRec(env, arg); if (!x) return answer('Не знайдено');
    let p; if (act === 'cep') p = { pay: oid === 'card' ? 'card' : 'cash' };
    else { const items = (x.dishes || []).map(d => [...d]), i = +oid, d = items[i]; if (!d) return answer('');
      if (act === 'cem' && d[1] > 1) { d[2] = Math.round(d[2] / d[1] * (d[1] - 1)); d[1]--; } else items.splice(i, 1); p = { items }; }
    const r = await editClosed(env, arg, p, who); if (r.error) return answer(r.error);
    if (r.what.length) await notify(env, `✏️ <b>Чек стола ${tn(r.x.t)}</b> (${r.x.at}) змінено: ${esc(r.what.join(', '))}\nБуло ${money(r.was)} → <b>${money(r.x.sum)}</b> — ${esc(who)}`);
    const v = await ceView(env, arg, r.what.length ? '✅ ' + esc(r.what.join(', ')) : ''); await edit(v.text, v.markup); return answer(r.what.length ? 'Збережено' : 'Без змін'); }
  if (act === 'cfg' && CFG_NAME[arg]) { await env.DB.put('st:' + uid, 'cfg:' + arg, { expirationTtl: 600 }); await send({ text: `⚙️ ${CFG_NAME[arg]}: зараз <b>${(await getCfg(env))[arg]}</b>\nНапишіть нове значення (${CFG_LIM[arg].join('–')}):` }); return answer(''); }
  if (act === 'kpct') { await env.DB.put('st:' + uid, 'kpct', { expirationTtl: 600 }); await send({ text: `👨‍🍳 Зараз кухні йде <b>${await kitchenPct(env)}%</b> від чайових офіціанта (+ «подяка кухні» від гостя), порівну між кухарями на зміні.\nНапишіть новий відсоток (0–100):` }); return answer(''); }
  if (act === 'rcn') { await env.DB.put('st:' + uid, 'rcn:' + arg, { expirationTtl: 600 }); const b = await balances(env);
    await send({ text: `✏️ <b>Звірка ${arg === 'card' ? '💳 картки' : '💵 готівки'}</b>\nЗа програмою: <b>${money(arg === 'card' ? b.card : b.cash)}</b>\nНапишіть, скільки є насправді${arg === 'card' ? ' (залишок у Приват24)' : ' (перерахуйте касу)'}:` }); return answer(''); }
  if (act === 'cmvp') { await send({ text: '➕ <b>Внести</b> — куди?', markup: { inline_keyboard: [[{ text: '💵 Готівка в касу', callback_data: 'cmv:in' }, { text: '💳 На картку', callback_data: 'cmv:kin' }]] } }); return answer(''); }
  if (act === 'cmvm') { await send({ text: '➖ <b>Вилучити</b> — звідки?', markup: { inline_keyboard: [[{ text: '💵 З каси', callback_data: 'cmv:out' }, { text: '💳 З картки', callback_data: 'cmv:kout' }]] } }); return answer(''); }
  if (act === 'cmvx') { await send({ text: '🔁 <b>Обмін</b> — звідки куди?', markup: { inline_keyboard: [[{ text: '💳 Картка → 💵 готівка', callback_data: 'cmv:k2c' }], [{ text: '💵 Готівка → 💳 картка', callback_data: 'cmv:c2k' }]] } }); return answer(''); }
  if (act === 'cmv') { if (!MOVE[arg]) return answer(''); await env.DB.put('st:' + uid, 'cmv:' + arg, { expirationTtl: 600 }); await send({ text: `${MOVE[arg]}\nНапишіть суму і коментар, наприклад: <code>500 з банку</code>` }); return answer(''); }
  if (act === 'shop') { if (await getShift(env)) return answer('Зміна вже відкрита'); await env.DB.put('st:' + uid, 'shopen', { expirationTtl: 600 }); const lz = await lastZ(env);
    await send({ text: '🔓 <b>Відкриття каси</b>\nСкільки грошей у касі на початок? Напишіть число' + (lz ? ' або натисніть «Загальна сума» — уся готівка від гостей за весь час:' : ':'), markup: lz ? { inline_keyboard: [[{ text: `💰 Загальна сума · ${money(lz.sum)}`, callback_data: 'shopl' }]] } : undefined }); return answer(''); }
  if (act === 'shopl') {
    const lz = await lastZ(env); if (!lz) return answer('Немає попереднього закриття');
    const r = await openShift(env, lz.sum, who); if (r.error) return answer(r.error);
    await env.DB.delete('st:' + uid); await edit(`🔓 Касу відкрито · на початок ${money(lz.sum)} (уся готівка за весь час)`); await send(await cashView(env)); return answer('Касу відкрито'); }
  if (act === 'shcl') {
    const d = await shiftData(env); if (!d.open) return answer('Каса вже закрита');
    await env.DB.put('st:' + uid, 'shclose', { expirationTtl: 900 });
    await send({ text: `🔒 <b>Закриття каси</b>\nМає бути в касі: <b>${money(d.inBox)}</b>${d.openTables ? `\n⚠️ Ще відкрито столів: ${d.openTables} (${money(d.openSum)})` : ''}\n\nПорахуйте готівку і напишіть суму (або «-», щоб не рахувати):` });
    return answer('');
  }
  if (act === 'rp') { const v = await repView(env, arg, oid || 'x'); await edit(v.text, v.markup); return answer(''); }
  if (act === 'float') { await env.DB.put('st:' + uid, 'float', { expirationTtl: 600 }); await send({ text: '🏦 Скільки грошей у касі на початок дня (розмін)? Напишіть число:' }); return answer(''); }
  if (act === 'stfadd') { await env.DB.put('st:' + uid, 'stfadd', { expirationTtl: 600 }); await send({ text: '👥 Напишіть імʼя і PIN (4–6 цифр):\n<code>Назар 1234</code> — офіціант\n<code>Назар 1234 адмін</code> — адміністратор\n(повідомлення одразу видалиться)' }); return answer(''); }
  if (act === 'stf') { const v = await staffOne(env, arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'prm') { const v = await permView(env, arg); await edit(v.text, v.markup); return answer(''); }
  if (act === 'prt') { // перемикач права: arg = id працівника, oid = ключ
    const s = (await getStaff(env)).find(x => x.id === arg); if (!s || !PERM_KEYS.includes(oid)) return answer('Не знайдено');
    const adm = s.role === 'admin', now = adm ? s.perm?.[oid] !== 0 : s.perm?.[oid] === 1;
    if (!adm && !now && SENSITIVE.includes(oid)) return answer('🔒 Це право видається в касі разом з новим PIN 6–8 цифр');
    const r = await setPerm(env, arg, { ...(s.perm || {}), [oid]: now ? 0 : 1 }, undefined); if (r.error) return answer('⚠️ ' + r.error);
    const v = await permView(env, arg); await edit(v.text, v.markup); return answer(now ? 'Вимкнено' : 'Увімкнено');
  }
  if (act === 'stfbk') { const v = await staffView(env); await edit(v.text, v.markup); return answer(''); }
  if (act === 'stfn' || act === 'stfp') { await env.DB.put('st:' + uid, act + ':' + arg, { expirationTtl: 600 }); await send({ text: act === 'stfn' ? '✏️ Напишіть нове імʼя (графік, зарплата й чайові перейдуть на нього)' : '🔑 Напишіть новий PIN — 4 цифри (повідомлення одразу видалиться)' }); return answer(''); }
  if (act === 'stfr') { const s = (await getStaff(env)).find(x => x.id === arg); if (!s) return answer('Не знайдено'); await edit(`🔄 Нова роль для <b>${esc(s.name)}</b>:`, { inline_keyboard: [...chunk(Object.keys(ROLE_ONE).filter(r => r !== roleOf(s)).map(r => ({ text: ROLE_ONE[r], callback_data: `stfro:${arg}:${r}` })), 2), [{ text: '⬅️ Назад', callback_data: 'stf:' + arg }]] }); return answer(''); }
  if (act === 'stfro') { const r = await editStaff(env, arg, { role: oid }); const v = await staffOne(env, arg); await edit(v.text, v.markup); return answer(r.error || '🔄 Роль змінено'); }
  if (act === 'stfdq') { const s = (await getStaff(env)).find(x => x.id === arg); if (!s) return answer('Не знайдено'); await edit(`🗑 Видалити <b>${esc(s.name)}</b>? Його PIN перестане працювати.`, { inline_keyboard: [[{ text: '🗑 Так, видалити', callback_data: 'stfdel:' + arg }, { text: '⬅️ Ні', callback_data: 'stf:' + arg }]] }); return answer(''); }
  if (act === 'stfdel') { await delStaff(env, arg); const v = await staffView(env); await edit(v.text, v.markup); return answer('Видалено'); }
  if (act === 'wout') { await env.DB.delete('wlog:' + arg); await env.DB.delete('adm:' + arg); const v = await staffView(env); await edit(v.text, v.markup); return answer('Вийшов'); }
  if (act === 'no') { await edit('Скасовано.'); return answer(''); }
  return answer('');
}
