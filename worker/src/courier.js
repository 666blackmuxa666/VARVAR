// 🛵 Кур'єри: окремий Telegram-бот (сповіщення про доставки, «Беру», «Поїхав», «Видано», проблеми, фото),
// прив'язка Telegram до працівника з каси, готівка на руках, нагадування, коли ніхто не взяв.
import { tg, esc, hhmm, dayKey, L, logEvent, notify, getBill, putBill, getStaff, openTables, getClosed, getKq } from './ops.js';
import { getAtt } from './pay.js';
import { tn, isGo } from './tn.js';
import { fmtPhone, goSet, getGoCfg } from './delivery.js';
import { getSite } from './site.js';

const ctg = (env, m, b) => tg({ ...env, BOT_TOKEN: env.COURIER_BOT_TOKEN || env.BOT_TOKEN }, m, b);
const mapsUrl = a => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a + ', Поляниця')}&travelmode=driving`;
export const getLinks = async env => (await env.DB.get('courtg', 'json')) || {}; // { ім'я: chat_id }

// ---------- прив'язка Telegram (з каси) ----------
export async function courBot(env) {
  if (env.COURIER_BOT_TOKEN && (await env.DB.get('g3hook')) !== env.SELF_URL) {
    const r = await ctg(env, 'setWebhook', { url: env.SELF_URL + '/tg3', secret_token: env.TG_SECRET, allowed_updates: ['message', 'callback_query'] }).then(r => r.json()).catch(() => null);
    if (r?.ok) await env.DB.put('g3hook', env.SELF_URL);
  }
  let n = await env.DB.get('cbotname'); if (!n) { const r = await ctg(env, 'getMe', {}).then(r => r.json()).catch(() => null); n = r?.result?.username || ''; if (n) await env.DB.put('cbotname', n, { expirationTtl: 7 * 86400 }); }
  return n;
}
export async function courLinkUrl(env, name) {
  const n = crypto.randomUUID().replace(/-/g, '').slice(0, 16); await env.DB.put('ctl:' + n, name, { expirationTtl: 900 });
  return { url: `https://t.me/${await courBot(env)}?start=c_${n}`, linked: !!(await getLinks(env))[name] };
}

// ---------- кому слати: кур'єри на зміні; нікого — усім підключеним ----------
async function targets(env) {
  const links = await getLinks(env), st = await getStaff(env), att = (await getAtt(env))[dayKey()] || {};
  const cours = st.filter(s => s.role === 'courier' && links[s.name]).map(s => s.name);
  const on = cours.filter(n => att[n]?.in && !att[n]?.out);
  return (on.length ? on : cours).map(n => [n, links[n]]);
}
const items = b => (b.log || []).flatMap(o => o.lines).filter(l => !l.includes('🛵 Доставка')).map(l => l.replace(/ — \d+$/, ''));
const pay2 = b => Math.max(0, (b.total || 0) - (b.discSum ?? Math.round((b.total || 0) * (b.disc || 0) / 100)) - (b.bonus || 0));
function card(t, b) {
  const g = b.go;
  return [`🛵 <b>${tn(t)}</b> · ${g.when ? `<b>на ${g.when}</b>` : 'якнайшвидше'}${g.st === 'ready' ? ' · 🍽 <b>ГОТОВО</b>' : g.st === 'cook' ? ' · 🔥 готується' : ''}`,
    `👤 ${esc(g.name || '')} · ${fmtPhone(g.phone)}`, `📍 ${esc(g.addr || '')}${g.ent ? ` (${esc(g.ent)})` : ''}`,
    `🍽 ${items(b).map(esc).join(', ')}${g.cut ? ` · 🍴${g.cut}` : ''}`,
    g.paid ? '💳 <b>оплачено онлайн</b>' : `${g.pay === 'card' ? '💳 термінал' : '💵 готівка'} · до сплати <b>${pay2(b)} ₴</b>${g.change ? ` · решта з <b>${g.change}</b>` : ''}`,
    g.note ? `💬 ${esc(g.note)}` : ''].filter(Boolean).join('\n');
}
const kbNew = (t, b) => ({ inline_keyboard: [[{ text: '✋ Беру', callback_data: `cb:${t}:take` }, { text: '🗺 Маршрут', url: mapsUrl(b.go.addr) }]] });
const kbMine = (t, b) => ({ inline_keyboard: [
  ...(b.go.st !== 'road' ? [[{ text: '🛵 Поїхав', callback_data: `cb:${t}:road` }]] : [[5, 10, 15, 20].map(m => ({ text: `⏱ ${m} хв`, callback_data: `cb:${t}:eta:${m}` }))]),
  [{ text: '🤝 Видано 💵', callback_data: `cb:${t}:done:cash` }, { text: '🤝 Видано 💳', callback_data: `cb:${t}:done:card` }],
  [{ text: '🗺 Маршрут', url: mapsUrl(b.go.addr) }, { text: '⚠️ Проблема', callback_data: `cb:${t}:prob` }],
  [{ text: '💬 Кухні: буду за 5 хв', callback_data: `cb:${t}:km:soon` }, { text: '💬 Я на місці', callback_data: `cb:${t}:km:here` }]] });

// головна точка: подія доставки → кур'єрам
export async function courNotify(env, t, kind, extra = '') {
  if (!isGo(t) || +t > 2000 || !env.COURIER_BOT_TOKEN) return; // лише доставки
  const b = await getBill(env, t); if (!b.go) return;
  const mk = 'cmsg:' + t, msgs = (await env.DB.get(mk, 'json')) || {};
  const save = () => env.DB.put(mk, JSON.stringify(msgs), { expirationTtl: 2 * 86400 });
  if (kind === 'new' || kind === 'remind') {
    if (b.go.cour) return;
    for (const [n, chat] of await targets(env)) {
      const r = await ctg(env, 'sendMessage', { chat_id: chat, text: `${kind === 'remind' ? '⏰ <b>Ніхто ще не взяв!</b>\n' : '🆕 '}${card(t, b)}`, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kbNew(t, b) }).then(r => r.json()).catch(() => null);
      if (r?.result?.message_id) { if (msgs[n] && kind === 'remind') await ctg(env, 'deleteMessage', { chat_id: chat, message_id: msgs[n] }).catch(() => {}); msgs[n] = r.result.message_id; }
    }
    return save();
  }
  const links = await getLinks(env), me = b.go.cour;
  if (kind === 'taken') { // іншим — «узяв», тому, хто взяв, — пульт
    for (const [n, mid] of Object.entries(msgs)) if (links[n]) await ctg(env, 'editMessageText', { chat_id: links[n], message_id: mid, text: `${card(t, b)}\n\n${n === me ? '✋ <b>Ваша доставка</b>' : `✋ Узяв <b>${esc(me)}</b>`}`, parse_mode: 'HTML', disable_web_page_preview: true, ...(n === me ? { reply_markup: kbMine(t, b) } : {}) }).catch(() => {});
    if (me && links[me] && !msgs[me]) { const r = await ctg(env, 'sendMessage', { chat_id: links[me], text: `${card(t, b)}\n\n✋ <b>Ваша доставка</b>`, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kbMine(t, b) }).then(r => r.json()).catch(() => null); if (r?.result) msgs[me] = r.result.message_id; }
    return save();
  }
  if (!me || !links[me]) return;
  if (kind === 'refresh' && msgs[me]) return ctg(env, 'editMessageText', { chat_id: links[me], message_id: msgs[me], text: `${card(t, b)}\n\n✋ <b>Ваша доставка</b>${extra ? '\n' + extra : ''}`, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kbMine(t, b) }).catch(() => {});
  const txt = { ready: `🍽 <b>${tn(t)} ГОТОВО — забирай!</b>`, msg: `👨‍🍳 Кухня → ${tn(t)}: <b>${esc(extra)}</b>`, upd: `✏️ ${tn(t)} змінено: ${esc(extra)}`, gone: `❌ ${tn(t)} скасовано адміністратором` }[kind];
  if (txt) await ctg(env, 'sendMessage', { chat_id: links[me], text: txt, parse_mode: 'HTML' }).catch(() => {});
}

// ---------- 💵 готівка на руках і підсумок дня ----------
export async function courDay(env, name) {
  const cl = (await getClosed(env)).filter(c => !c.del && c.cour === name && c.go === 'del'), c = await getGoCfg(env), st = (await getStaff(env)).find(s => s.name === name);
  const cash = cl.reduce((a, x) => a + (x.cash || 0), 0), hand = (await env.DB.get('ccash:' + dayKey(), 'json')) || {};
  const mm = cl.map(x => x.gt?.road && x.gt?.done ? (x.gt.done - x.gt.road) / 60e3 : null).filter(x => x != null);
  return { avg: mm.length ? Math.round(mm.reduce((a, x) => a + x, 0) / mm.length) : null, n: cl.length, cash, given: hand[name]?.sum || 0, left: cash - (hand[name]?.sum || 0), earn: cl.length * (st?.pay?.dlv ?? c.cpay), list: cl.map(x => ({ t: x.t, at: x.at, sum: x.sum, pay: x.card ? 'card' : 'cash', mins: x.gt?.road && x.gt?.done ? Math.round((x.gt.done - x.gt.road) / 60e3) : null })) };
}
export async function courCashGive(env, name, sum, by) { // адмін: «отримав готівку від кур'єра»
  return L(env, 'ccash:' + dayKey(), async () => { const k = 'ccash:' + dayKey(), h = (await env.DB.get(k, 'json')) || {}; h[name] = { sum: (h[name]?.sum || 0) + Math.round(+sum || 0), by, at: hhmm() }; await env.DB.put(k, JSON.stringify(h), { expirationTtl: 40 * 86400 }); return h[name]; });
}
// кінець зміни кур'єра → адміну запит «отримав готівку»
export async function courShiftEnd(env, name) {
  const d = await courDay(env, name); if (!d.n) return d;
  await logEvent(env, { k: 'ccash', n: name, sum: d.left, s: d.left > 0 ? 'new' : 'acc', text: `🛵 ${name} закінчив зміну: ${d.n} доставок · здає готівку ${d.left} ₴ · заробіток ${d.earn} ₴` });
  if (d.left > 0) await notify(env, `🛵 <b>${esc(name)}</b> закінчив зміну\n${d.n} доставок · 💵 здає <b>${d.left} ₴</b>`, { inline_keyboard: [[{ text: `✅ Отримав ${d.left} ₴`, callback_data: `cc:${encodeURIComponent(name).slice(0, 40)}:${d.left}` }]] });
  const ch = (await getLinks(env))[name]; if (ch) await ctg(env, 'sendMessage', { chat_id: ch, text: `🔴 Зміну закінчено\n🛵 Доставок: <b>${d.n}</b>\n💵 Здати в касу: <b>${d.left} ₴</b>\n💰 Заробіток: <b>${d.earn} ₴</b>`, parse_mode: 'HTML' }).catch(() => {});
  return d;
}

// ---------- ⏰ ніхто не взяв: 3 хв — кур'єрам ще раз, 5 хв — адміну ----------
export async function courWatch(env) {
  if (env.COURIER_BOT_TOKEN && (await env.DB.get('g3hook')) !== env.SELF_URL) await courBot(env).catch(() => {}); // вебхук бота кур'єрів — автоматично
  for (const r of await openTables(env)) {
    const g = r.b.go; if (!g || g.kind !== 'del' || g.cour || !['acc', 'cook', 'ready'].includes(g.st) || !g.accAt) continue;
    const m = (Date.now() - g.accAt) / 60e3;
    if (m >= 3 && !g.rem1) { await mark(env, r.t, 'rem1'); await courNotify(env, r.t, 'remind'); }
    if (m >= 5 && !g.rem2) { await mark(env, r.t, 'rem2'); await notify(env, `⏰ <b>${tn(r.t)}</b> — уже ${Math.round(m)} хв жоден кур'єр не взяв доставку!`); await logEvent(env, { k: 'go', t: r.t, s: 'acc', text: `⏰ ${tn(r.t)}: ${Math.round(m)} хв без кур'єра` }); }
  }
}
const mark = (env, t, k, v = 1) => L(env, 'bills', async () => { const b = await getBill(env, t); if (b.go) { b.go[k] = v; await putBill(env, t, b); } return b.go; });

// ---------- дії кур'єра (каса й бот) ----------
const PROB = { noans: '📵 Гість не відповідає', addr: '📍 Невірна адреса', refuse: '🙅 Гість відмовився' };
const KM = { soon: 'Буду за 5 хв — тримайте гарячим', here: 'Я на місці, віддавайте', where: 'Де замовлення?' };
export async function courAct(env, t, name, act, arg) {
  const b = await getBill(env, t); if (!b.go) return { error: 'Доставку вже закрито' };
  if (b.go.cour && b.go.cour !== name && act !== 'take') return { error: 'Це доставка ' + b.go.cour };
  if (act === 'take') {
    const g = await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x.go) return { error: 'Закрито' }; if (x.go.cour && x.go.cour !== name) return { error: 'Вже взяв ' + x.go.cour }; x.go.cour = name; x.go.takeAt = Date.now(); await putBill(env, t, x); return x.go; });
    if (g.error) return g;
    await logEvent(env, { k: 'go', t, by: name, s: 'acc', text: `✋ ${tn(t)} → кур'єр ${name}` }); await courNotify(env, t, 'taken'); return { ok: 1, go: g };
  }
  if (act === 'road') { const g = await goSet(env, t, 'road', name, { cour: name }); await courNotify(env, t, 'refresh'); return { ok: 1, go: g }; }
  if (act === 'done') { const r = await goSet(env, t, 'done', name, { pay: arg === 'card' ? 'card' : 'cash' }); return r ? { ok: 1, done: r } : { error: 'Не вдалось' }; }
  if (act === 'eta') { const m = Math.max(1, Math.min(90, +arg || 10)), at = Date.now() + m * 60e3; await mark(env, t, 'etaC', at);
    await L(env, 'ord:' + b.go.oid, async () => { const o = await env.DB.get('ord:' + b.go.oid, 'json'); if (o) await env.DB.put('ord:' + b.go.oid, JSON.stringify({ ...o, etaC: at }), { expirationTtl: 2 * 86400 }); });
    const { guestMsg } = await import('./site.js'); await guestMsg(env, b.go.phone, `🛵 Кур'єр буде у вас приблизно о <b>${hhmm(at)}</b>`);
    await courNotify(env, t, 'refresh', `⏱ гостю: буду о ${hhmm(at)}`); return { ok: 1, at }; }
  if (act === 'prob') { const txt = PROB[arg] || String(arg || '').slice(0, 120) || 'Проблема'; await mark(env, t, 'prob', { k: arg, text: txt, at: Date.now() });
    await logEvent(env, { k: 'call', t, s: 'new', oid: 'p' + t, text: `⚠️ ${tn(t)} · ${name}: ${txt}` });
    await notify(env, `⚠️ <b>${tn(t)}</b> · ${esc(name)}: <b>${esc(txt)}</b>\n👤 ${esc(b.go.name)} ${fmtPhone(b.go.phone)}\n📍 ${esc(b.go.addr)}`); return { ok: 1 }; }
  if (act === 'km') { const text = '🛵 ' + (KM[arg] || String(arg || '').slice(0, 100));
    await L(env, 'kq:' + dayKey(), async () => { const l = await getKq(env), e = [...l].reverse().find(x => x.t === +t && !x.closed); if (e) { (e.msgs ||= []).push({ at: hhmm(), text }); await env.DB.put('kq:' + dayKey(), JSON.stringify(l.slice(-400))); } });
    await logEvent(env, { k: 'go', t, by: name, s: 'acc', text: `${text} (${tn(t)})` }); return { ok: 1 }; }
  return { error: 'unknown' };
}

// ---------- бот кур'єрів (/tg3) ----------
export async function courUpdate(u, env) {
  if (u.callback_query) {
    const q = u.callback_query, chat = q.message?.chat.id, [a, t, act, arg] = (q.data || '').split(':'), ans = text => ctg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: text || '' });
    const name = Object.entries(await getLinks(env)).find(([, c]) => c === chat)?.[0]; if (!name) return ans('Спершу підключіться з каси: «✈️ Telegram»');
    if (a === 'cb' && act === 'prob' && !arg) { await ctg(env, 'sendMessage', { chat_id: chat, text: `⚠️ ${tn(+t)} — що сталось?`, reply_markup: { inline_keyboard: [[{ text: PROB.noans, callback_data: `cb:${t}:prob:noans` }], [{ text: PROB.addr, callback_data: `cb:${t}:prob:addr` }], [{ text: PROB.refuse, callback_data: `cb:${t}:prob:refuse` }]] } }); return ans(''); }
    if (a === 'cb') {
      const r = await courAct(env, +t, name, act, arg);
      if (r.error) return ans(r.error);
      if (act === 'done') { await ctg(env, 'editMessageText', { chat_id: chat, message_id: q.message.message_id, text: `✅ <b>${tn(+t)}</b> видано · ${r.done.sum} ₴ ${r.done.card ? '💳' : '💵'} · ${hhmm()}\n📷 Можете надіслати фото доставки (необовʼязково)`, parse_mode: 'HTML' }); await env.DB.put('cph:' + chat, String(t), { expirationTtl: 600 }); }
      if (act === 'prob') await ctg(env, 'editMessageText', { chat_id: chat, message_id: q.message.message_id, text: `⚠️ Передано адміністратору: ${PROB[arg] || arg}` });
      return ans({ take: '✋ Ваша!', road: '🛵 В дорозі', eta: '⏱ Гостю надіслано', km: '💬 Кухні надіслано', done: '✅ Видано' }[act] || '');
    }
    if (a === 'cash') { const d = await courDay(env, name); await ctg(env, 'sendMessage', { chat_id: chat, text: `💵 Готівка на руках: <b>${d.left} ₴</b>\n🛵 Доставок сьогодні: ${d.n}\n💰 Заробіток: ${d.earn} ₴`, parse_mode: 'HTML' }); return ans(''); }
    return ans('');
  }
  const m = u.message; if (!m) return; const chat = m.chat.id, text = (m.text || '').trim();
  const lk = text.match(/^\/start c_([a-f0-9]{16})$/);
  if (lk) { const name = await env.DB.get('ctl:' + lk[1]); if (!name) return ctg(env, 'sendMessage', { chat_id: chat, text: '⌛ Посилання застаріло — натисніть «✈️ Telegram» у касі ще раз.' });
    await L(env, 'courtg', async () => { const l = await getLinks(env); for (const [n, c] of Object.entries(l)) if (c === chat) delete l[n]; l[name] = chat; await env.DB.put('courtg', JSON.stringify(l)); });
    await env.DB.delete('ctl:' + lk[1]);
    return ctg(env, 'sendMessage', { chat_id: chat, text: `✅ ${esc(name)}, Telegram підключено!\nСюди приходитимуть нові доставки — натискайте «✋ Беру».`, parse_mode: 'HTML', reply_markup: { keyboard: [[{ text: '💵 Моя готівка' }, { text: '🛵 Мої доставки' }]], resize_keyboard: true, is_persistent: true } }); }
  const name = Object.entries(await getLinks(env)).find(([, c]) => c === chat)?.[0];
  if (!name) return ctg(env, 'sendMessage', { chat_id: chat, text: '🛵 Бот кур\'єрів Varvar.\nЩоб отримувати доставки: увійдіть у касу кур\'єрським PIN і натисніть «✈️ Telegram».' });
  if (m.photo?.length) { // 📷 фото доставки → у чат персоналу (на сервері не зберігаємо)
    const t = await env.DB.get('cph:' + chat); if (!t) return;
    const f = await ctg(env, 'getFile', { file_id: m.photo[m.photo.length - 1].file_id }).then(r => r.json()).catch(() => null); if (!f?.result?.file_path) return;
    const img = await fetch(`https://api.telegram.org/file/bot${env.COURIER_BOT_TOKEN}/${f.result.file_path}`).then(r => r.blob());
    const fd = new FormData(); fd.append('chat_id', env.CHAT_ID); fd.append('caption', `📷 ${tn(+t)} видано · ${name}`); fd.append('photo', img, 'd.jpg');
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd }).catch(() => {});
    await env.DB.delete('cph:' + chat); return ctg(env, 'sendMessage', { chat_id: chat, text: '📷 Дякую, фото передано' });
  }
  if (text === '💵 Моя готівка') { const d = await courDay(env, name); return ctg(env, 'sendMessage', { chat_id: chat, text: `💵 Готівка на руках: <b>${d.left} ₴</b>\n🛵 Доставок сьогодні: ${d.n}\n💰 Заробіток: ${d.earn} ₴`, parse_mode: 'HTML' }); }
  if (text === '🛵 Мої доставки') { const mine = (await openTables(env)).filter(r => r.b.go?.cour === name);
    if (!mine.length) return ctg(env, 'sendMessage', { chat_id: chat, text: 'Зараз у вас немає доставок.' });
    for (const r of mine) await ctg(env, 'sendMessage', { chat_id: chat, text: card(r.t, r.b), parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: kbMine(r.t, r.b) }); return; }
}
// маршрут через кілька адрес (Google Maps)
export async function multiRoute(env, name) {
  const s = await getSite(env), mine = (await openTables(env)).filter(r => r.b.go?.cour === name && r.b.go.kind === 'del').sort((a, b) => (a.b.go.takeAt || 0) - (b.b.go.takeAt || 0));
  if (!mine.length) return null; const pts = mine.map(r => encodeURIComponent(r.b.go.addr + ', Поляниця'));
  return `https://www.google.com/maps/dir/?api=1&origin=${s.geo.join(',')}&destination=${pts[pts.length - 1]}${pts.length > 1 ? '&waypoints=' + pts.slice(0, -1).join('%7C') : ''}&travelmode=driving`;
}
