// 👨‍🍳 Бот кухні (KITCHEN_BOT_TOKEN, вебхук /tg4): кухарі отримують нові замовлення на телефон,
// «🔥 Почав», «✅ Готово» (по страві або все), повідомлення в зал, стоп-лист. Вхід — PIN кухаря/адміна з каси.
// Повідомлення з карткою (kbm:<id> → {chat: msg}) оновлюються, коли статус змінюють з /k або каси.
import { tg, esc, dayKey, L, getStaff, getKq, pinHash, kitchenDone, kitchenStart, kitchenMsg, setHidden, logEvent, groupOf } from './ops.js';
import { getAtt } from './pay.js';
import { getMenu } from './menu.js';
import { tn } from './tn.js';
import { stockCmd, invPhoto, invLink, stockCallback, stockCallbackW, stockCallbackX, stockState } from './stockbot.js';

const ktg = (env, m, b) => tg({ ...env, BOT_TOKEN: env.KITCHEN_BOT_TOKEN }, m, b).then(r => r.json()).catch(() => null);
const getLinks = async env => (await env.DB.get('kittg', 'json')) || {}; // { chat_id: staff id }
const KB = { keyboard: [[{ text: '📋 Черга' }, { text: '⛔ Стоп-лист' }], [{ text: '🧮 Склад' }, { text: '🗑 Списання' }], [{ text: '🚪 Вийти' }]], resize_keyboard: true, is_persistent: true };
const HALL = ['⏳ Затримка 5–10 хв', '❌ Закінчилась страва', '🙋 Заберіть замовлення', '❓ Уточніть замовлення'];

export async function kitHook(env) {
  if (!env.KITCHEN_BOT_TOKEN || (await env.DB.get('g4hook2')) === env.SELF_URL) return;
  const r = await ktg(env, 'setWebhook', { url: env.SELF_URL + '/tg4', secret_token: env.TG_SECRET, allowed_updates: ['message', 'callback_query'] });
  if (r?.ok) await env.DB.put('g4hook2', env.SELF_URL);
}
// хто отримує: кухарі на зміні; нікого на зміні — усі підключені
async function targets(env) {
  const links = await getLinks(env), st = await getStaff(env), att = (await getAtt(env))[dayKey()] || {};
  const all = Object.entries(links).map(([chat, id]) => [chat, st.find(s => s.id === id)]).filter(([, s]) => s);
  const on = all.filter(([, s]) => att[s.name]?.in && !att[s.name]?.out);
  return (on.length ? on : all).map(([c]) => +c);
}
function card(e) {
  const st = e.cancelled ? '🚫 <b>СКАСОВАНО</b>' : e.done ? '✅ <b>ВИДАНО</b>' : e.start ? '🔥 готується' : '🆕 нове';
  return [`${e.urgent ? '‼️ ' : ''}<b>${tn(e.t)}</b>${e.tw ? ' · 🥡 З СОБОЮ' : ''} · ${e.at}${e.by ? ' · ' + esc(e.by) : ''}\n${st}`,
    e.items.map(x => `${x.cancel ? '🚫 <s>' : x.done ? '✅ ' : '▫️ '}${x.q}× ${esc(x.n)}${x.cancel ? '</s>' : ''}${x.canc ? ` (−${x.canc} скас.)` : ''}`).join('\n'),
    e.comment ? `💬 ${esc(e.comment)}` : '', ...(e.msgs || []).map(m => `📣 ${m.at} ${esc(m.text)}`)].filter(Boolean).join('\n');
}
function kb(e) {
  if (e.done) return { inline_keyboard: [] };
  const live = e.items.map((x, i) => [x, i]).filter(([x]) => !x.cancel);
  return { inline_keyboard: [
    ...(e.start ? [] : [[{ text: '🔥 Почав готувати', callback_data: `ks:${e.id}` }]]),
    ...(live.length > 1 ? live.map(([x, i]) => [{ text: `${x.done ? '↩️' : '✅'} ${x.q}× ${x.n}`.slice(0, 60), callback_data: `kd:${e.id}:${i}` }]) : []),
    [{ text: '✅ Усе готово', callback_data: `kd:${e.id}` }, { text: '📣 В зал', callback_data: `km:${e.id}` }]] };
}
const send = (env, chat, e) => ktg(env, 'sendMessage', { chat_id: chat, text: card(e), parse_mode: 'HTML', reply_markup: kb(e) });

// нове замовлення на кухню → кухарям (викликає ops.addKitchen)
export async function kitNotify(env, e) {
  if (!env.KITCHEN_BOT_TOKEN || !e) return;
  const msgs = {};
  for (const chat of await targets(env)) { const r = await send(env, chat, e); if (r?.ok) msgs[chat] = r.result.message_id; }
  if (Object.keys(msgs).length) await env.DB.put('kbm:' + e.id, JSON.stringify(msgs), { expirationTtl: 86400 });
}
// статус змінився (бот, /k, каса, скасування) → оновити картки в усіх кухарів
export async function kitSync(env, e) {
  if (!env.KITCHEN_BOT_TOKEN || !e) return;
  const msgs = await env.DB.get('kbm:' + e.id, 'json'); if (!msgs) return;
  for (const [chat, mid] of Object.entries(msgs)) await ktg(env, 'editMessageText', { chat_id: +chat, message_id: mid, text: card(e), parse_mode: 'HTML', reply_markup: kb(e) });
  if (e.done) await env.DB.delete('kbm:' + e.id);
}
export async function kitSyncTable(env, t) {
  if (!env.KITCHEN_BOT_TOKEN) return;
  for (const e of (await getKq(env)).filter(x => x.t === +t && (!x.done || x.cancelled))) await kitSync(env, e);
}

async function stopCats(env) {
  const m = await getMenu(env);
  return m.categories.filter(c => groupOf(c.id) === 'kitchen' && c.items.length);
}

export async function kitUpdate(u, env) {
  await kitHook(env);
  const links = await getLinks(env);
  if (u.callback_query) {
    const q = u.callback_query, chat = q.message?.chat.id, mid = q.message?.message_id, [a, id, i] = (q.data || '').split(':');
    const ans = t => ktg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: t || '' });
    const me = (await getStaff(env)).find(s => s.id === links[chat]); if (!me) return ans('Спершу увійдіть своїм PIN');
    const who = me.name + ' · бот';
    if (a === 'ks' || a === 'kd') {
      const e = a === 'ks' ? await kitchenStart(env, id, who) : await kitchenDone(env, id, i === undefined ? null : +i, who);
      if (!e) { const x = (await getKq(env)).find(z => z.id === id); if (x) await kitSync(env, x); return ans('Уже змінено'); }
      return ans(a === 'ks' ? '🔥 Почали' : e.done ? '✅ Видано — офіціанти побачать' : '✅');
    }
    if (a === 'km') { await ktg(env, 'sendMessage', { chat_id: chat, text: '📣 Що передати в зал?', reply_markup: { inline_keyboard: HALL.map((t, k) => [{ text: t, callback_data: `kmt:${id}:${k}` }]) } }); return ans(''); }
    if (a === 'kmt') { const e = await kitchenMsg(env, id, HALL[+i], who); if (e) await ktg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: `📣 Передано: ${HALL[+i]}` }); return ans(e ? '📣 Передано' : 'Не знайдено'); }
    if (a === 'sc') { // розділ стоп-листа
      const c = (await stopCats(env)).find(x => x.id === id); if (!c) return ans('');
      await ktg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: `⛔ <b>${esc(c.name?.uk || c.id)}</b> — натисніть, щоб увімкнути/вимкнути`, parse_mode: 'HTML', reply_markup: { inline_keyboard: [...c.items.map(it => [{ text: `${it.hidden ? '⛔' : '✅'} ${it.name.uk}`.slice(0, 60), callback_data: `si:${c.id}:${it.id}` }]), [{ text: '⬅️ Розділи', callback_data: 'sb' }]] } });
      return ans('');
    }
    if (a === 'si') {
      const c = (await stopCats(env)).find(x => x.id === id), it = c?.items.find(x => x.id === i); if (!it) return ans('');
      const r = await setHidden(env, it.id, !it.hidden);
      if (r) await logEvent(env, { k: 'shift', by: who, text: `${r.hidden ? '⛔' : '✅'} ${r.name.uk} — ${r.hidden ? 'у стоп-листі' : 'знову в меню'}` });
      await kitUpdate({ callback_query: { ...q, data: 'sc:' + id } }, env); return;
    }
    if (/^sk/.test(a)) { // 🧮 склад — ті самі екрани, що в боті команди; кухарю — як у касі (без звітів і штрихкодів)
      if (me.role !== 'admin' && !SK_COOK.has(a)) return ans('🔐 Лише для адміністратора');
      const kenv = { ...env, BOT_TOKEN: env.KITCHEN_BOT_TOKEN }, r = (await stockCallback(a, id, kenv, chat, who)) || (await stockCallbackW(a, id, i, kenv, chat, who)) || (await stockCallbackX(a, id, kenv, chat, who));
      if (r) { if (['skis', 'skix', 'skipp', 'skim'].includes(a)) await ktg(env, 'editMessageText', { chat_id: chat, message_id: mid, text: r.text, parse_mode: 'HTML', reply_markup: r.markup }); else await ktg(env, 'sendMessage', { chat_id: chat, text: r.text, parse_mode: 'HTML', reply_markup: r.markup || KB }); }
      return ans('');
    }
    if (a === 'sb') { await ktg(env, 'editMessageText', { chat_id: chat, message_id: mid, ...(await stopView(env)) }); return ans(''); }
    return ans('');
  }
  const m = u.message; if (!m) return; const chat = m.chat.id, text = (m.text || '').trim();
  const me = (await getStaff(env)).find(s => s.id === links[chat]);
  if (!me) { // 🔑 вхід PIN
    if (!/^\d{4}$/.test(text)) return ktg(env, 'sendMessage', { chat_id: chat, text: '👨‍🍳 Бот кухні.\nВведіть свій PIN з каси (4 цифри) — сюди приходитимуть замовлення кухні.', reply_markup: { remove_keyboard: true } });
    await ktg(env, 'deleteMessage', { chat_id: chat, message_id: m.message_id });
    const fk = 'kfail:' + chat, n = +(await env.DB.get(fk) || 0); if (n >= 5) return ktg(env, 'sendMessage', { chat_id: chat, text: '⛔ Забагато спроб. Спробуйте через 15 хвилин.' });
    const h = await pinHash(text), s = (await getStaff(env)).find(z => z.pin === h);
    if (!s || !['cook', 'admin'].includes(s.role)) { await env.DB.put(fk, String(n + 1), { expirationTtl: 900 }); return ktg(env, 'sendMessage', { chat_id: chat, text: s ? '⛔ Цей бот — для кухні. Офіціанти — у боті команди.' : '❌ Невірний PIN' }); }
    await L(env, 'kittg', async () => { const l = await getLinks(env); l[chat] = s.id; await env.DB.put('kittg', JSON.stringify(l)); });
    await env.DB.delete(fk);
    return ktg(env, 'sendMessage', { chat_id: chat, text: `✅ ${esc(s.name)}, ви на кухні!\nНові замовлення приходитимуть сюди. Кнопки під карткою — «🔥 Почав» і «✅ Готово».`, parse_mode: 'HTML', reply_markup: KB });
  }
  if (text === '🚪 Вийти') { await L(env, 'kittg', async () => { const l = await getLinks(env); delete l[chat]; await env.DB.put('kittg', JSON.stringify(l)); }); return ktg(env, 'sendMessage', { chat_id: chat, text: '🚪 Ви вийшли. Замовлення сюди більше не приходять.', reply_markup: { remove_keyboard: true } }); }
  const kenv = { ...env, BOT_TOKEN: env.KITCHEN_BOT_TOKEN }, who = me.name + ' · бот кухні';
  const say = r => ktg(env, 'sendMessage', { chat_id: chat, text: r.text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: r.markup || KB });
  if (text === '🧮 Склад') { await env.DB.delete('st:' + chat); return say(SK_VIEW); }
  if (text === '🗑 Списання') return say({ text: '🗑 Напишіть: <code>списати сир фета 0.3 зіпсувався</code>\n(продукт, кількість — можна <code>250 г</code>, причина)' });
  const state = text && !text.startsWith('/') && text !== '📋 Черга' && await env.DB.get('st:' + chat);
  if (state && /^sk/.test(state)) { await env.DB.delete('st:' + chat); const r = await stockState(state, text, kenv, chat, who); if (r) return say(r); }
  if (m.photo) { if (!/^накладн/i.test((m.caption || '').trim())) return say({ text: '📷 Щоб записати накладну — надішліть фото з підписом <code>накладна</code>' }); await say({ text: '🔎 Розпізнаю накладну… 10–30 с' }); return say(await invPhoto(m, kenv, chat)); }
  if (/^https:\/\/\S+$/.test(text)) { await say({ text: '🔎 Читаю чек за посиланням… 10–30 с' }); return say(await invLink(text, kenv, chat)); }
  if (text && text !== '📋 Черга') {
    if (me.role !== 'admin' && /^(\+|штрихкод|техкарта)/i.test(text)) return say({ text: '🔐 Оприбуткування, штрихкоди й техкарти — адміністратор' });
    const r = await stockCmd(text, kenv, who); if (r) return say(r);
  }
  if (text === '⛔ Стоп-лист') return ktg(env, 'sendMessage', { chat_id: chat, ...(await stopView(env)) });
  // 📋 черга (і будь-що інше)
  const l = (await getKq(env)).filter(e => !e.done);
  if (!l.length) return ktg(env, 'sendMessage', { chat_id: chat, text: '📋 Черга порожня 🎉', reply_markup: KB });
  const msgs = {};
  for (const e of l.slice(-10)) { const r = await send(env, chat, e); if (r?.ok) msgs[e.id] = r.result.message_id; }
  for (const [id, mid] of Object.entries(msgs)) { const k = 'kbm:' + id, x = (await env.DB.get(k, 'json')) || {}; x[chat] = mid; await env.DB.put(k, JSON.stringify(x), { expirationTtl: 86400 }); }
}
const SK_COOK = new Set(['skst', 'skbuy', 'skinvl', 'skip', 'skipp', 'skis', 'skix', 'skim', 'skcnm', 'skcn', 'skcf', 'skprl', 'skpr']);
const SK_VIEW = { text: `🧮 <b>Склад кухні</b>
📷 Фото з підписом <code>накладна</code> або посилання на онлайн-чек — запишу накладну
<code>списати сир фета 0.3 зіпсувався</code>
<code>перемістити лимон 1 в бар</code>
<code>заготовка соус зелений 3</code>
<code>інв кухня філе 14.5</code> … <code>інв кухня кінець</code>`, markup: { inline_keyboard: [[{ text: '📦 Залишки', callback_data: 'skst' }, { text: '🛒 Закупівля', callback_data: 'skbuy' }], [{ text: '📝 Інвентаризація', callback_data: 'skcnm' }, { text: '🍳 Заготовки', callback_data: 'skprl' }], [{ text: '🧾 Накладні', callback_data: 'skinvl' }]] } };
async function stopView(env) {
  const cs = await stopCats(env), n = cs.reduce((a, c) => a + c.items.filter(i => i.hidden).length, 0);
  return { text: `⛔ <b>Стоп-лист</b>${n ? ` · зараз ${n}` : ''}\nОберіть розділ:`, parse_mode: 'HTML', reply_markup: { inline_keyboard: cs.map(c => [{ text: `${c.name?.uk || c.id}${c.items.some(i => i.hidden) ? ' ⛔' : ''}`, callback_data: 'sc:' + c.id }]) } };
}
