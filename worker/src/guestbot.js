// 🤖 Бот гостей (@…GUEST_BOT_TOKEN): меню, статус замовлення, бонуси, день народження, сертифікати,
// чат з адміністратором, розсилки акцій, повернення «сплячих» гостей. Гість = телефон (cli:<тел>), прив'язка chat → gch:<chat>.
import { tg, esc, L, notify, logEvent, money, dayKey, TZ } from './ops.js';
import { fmtPhone, getCli, cliTouch } from './delivery.js';
import { getLoy, cliLevel, cliEdit, allCli, bdText } from './promo.js';
import { tn } from './tn.js';

const gtg = (env, m, b) => tg({ ...env, BOT_TOKEN: env.GUEST_BOT_TOKEN || env.BOT_TOKEN }, m, b);
const SITE = 'https://666blackmuxa666.github.io/VARVAR/';
const say = (env, chat, text, markup) => gtg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }).catch(() => {});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- ⚙️ налаштування (каса → Гості й акції → 🤖 Бот гостей) ----------
export const GB_DEF = {
  stat: 1, bon: 1, chat: 1, // статус замовлення · «+N бонусів» · чат з адміністратором
  bd: 1, bdText: '🎂 З днем народження! Команда Varvar бажає смачного року — чекаємо вас у гості 🧡',
  sleep: 0, sleepDays: 30, sleepBon: 100, sleepText: '👋 Давно вас не бачили! Тримайте подарунок — бонуси на наступне замовлення.',
  gap: 24, // годин між розсилками
};
export const getGb = async env => ({ ...GB_DEF, ...((await env.DB.get('gbot', 'json')) || {}) });
export async function setGb(env, f) {
  return L(env, 'gbot', async () => {
    const c = await getGb(env);
    for (const k of ['stat', 'bon', 'chat', 'bd', 'sleep']) if (f[k] != null) c[k] = f[k] ? 1 : 0;
    for (const [k, a, b] of [['sleepDays', 7, 365], ['sleepBon', 0, 5000], ['gap', 0, 720]]) if (f[k] != null) { const v = Math.round(+f[k]); if (!(v >= a && v <= b)) return { error: `${k}: від ${a} до ${b}` }; c[k] = v; }
    for (const k of ['bdText', 'sleepText']) if (f[k] != null) { const v = String(f[k]).trim().slice(0, 600); if (!v) return { error: 'Текст порожній' }; c[k] = v; }
    await env.DB.put('gbot', JSON.stringify(c)); return c;
  });
}

// ---------- 📱 головне меню ----------
const B = { order: '🍔 Замовити', book: '📅 Забронювати', bon: '🎁 Мої бонуси', rep: '🔁 Повторити', cert: '🎟 Сертифікати', bd: '🎂 День народження', chat: '💬 Написати нам', info: '📍 Контакти' };
const KB = { keyboard: [[B.order, B.book], [B.bon, B.rep], [B.cert, B.bd], [B.chat, B.info]].map(r => r.map(text => ({ text }))), resize_keyboard: true, is_persistent: true };
const ASK_PHONE = { keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
const url = (text, u) => ({ inline_keyboard: [[{ text, url: u }]] });
export const phoneOf = async (env, chat) => env.DB.get('gch:' + chat);
export async function linkChat(env, chat, ph) { await env.DB.put('gch:' + chat, ph); }

export async function showMenu(env, chat, hello) {
  const ph = await phoneOf(env, chat);
  if (!ph) return say(env, chat, `👋 Вітаємо у <b>Varvar Food Bar</b>!\nПоділіться номером — і тут будуть ваші бонуси, замовлення, броні й сертифікати.`, ASK_PHONE);
  return say(env, chat, hello || '👇 Оберіть, що потрібно:', KB);
}

// повідомлення гостя (не вхід на сайт). true — оброблено
export async function guestMenu(m, env) {
  const chat = m.chat.id, text = (m.text || '').trim(), ph = await phoneOf(env, chat);
  if (/^\/start( |$)/.test(text) || text === '/menu' || text === 'Меню') { await env.DB.delete('gst:' + chat); return showMenu(env, chat), true; }
  const btn = Object.entries(B).find(([, v]) => v === text)?.[0];
  if (!ph) { await showMenu(env, chat); return true; }
  if (btn) await env.DB.delete('gst:' + chat);
  const { getSite } = await import('./site.js'), s = await getSite(env), gb = await getGb(env);
  if (!btn) { // стан: чекаємо дату ДН або текст для адміністратора
    const st = await env.DB.get('gst:' + chat);
    if (st === 'bd') {
      const r = await cliEdit(env, ph, { bd: text }, false);
      if (r.error) return say(env, chat, '📅 Напишіть дату так: <b>25.12</b>'), true;
      await env.DB.delete('gst:' + chat); await say(env, chat, `🎂 Записали: <b>${bdText(r.bd)}</b>. У цей день чекайте на привітання!`, KB); return true;
    }
    if (st === 'chat' && gb.chat && text) { await chatIn(env, ph, m.from?.first_name || '', text); await say(env, chat, '✅ Передали адміністратору — відповідь прийде сюди.'); return true; }
    return false;
  }
  if (btn === 'order') return say(env, chat, '🍔 Меню з собою та доставка — оберіть страви:', url('🍔 Відкрити меню', SITE + 'index.html?go')), true;
  if (btn === 'book') return say(env, chat, '📅 Бронювання столика чи банкету:', url('📅 Забронювати', SITE + 'about.html#book')), true;
  if (btn === 'info') return say(env, chat, `📍 <b>${esc(s.name)}</b>\n${esc(s.addr)}\n🕐 ${esc(s.from)}–${esc(s.to)}\n📞 ${esc(s.phone)}`, { inline_keyboard: [[{ text: '🗺 Маршрут', url: s.gmaps }, { text: '🌐 Сайт', url: SITE + 'about.html' }]] }), true;
  const c = (await getCli(env, ph)) || {};
  if (btn === 'bon') {
    const lv = cliLevel(await getLoy(env), c);
    return say(env, chat, [`🎁 Бонусів на рахунку: <b>${money(c.bal || 0)}</b>`, lv ? `🏅 Рівень: ${esc(lv.e + ' ' + lv.name)}${lv.pct ? ` (−${lv.pct}%)` : ''}` : '', `🧾 Візитів: ${c.n || 0}`, '', '<i>Бонусами можна оплатити частину замовлення на сайті або на касі.</i>'].filter(x => x !== '').join('\n')), true;
  }
  if (btn === 'rep') {
    const g = c.lastGo; if (!g?.items?.length) return say(env, chat, '🔁 Ще немає замовлень з собою / доставки. Почніть тут:', url('🍔 Відкрити меню', SITE + 'index.html?go')), true;
    const rep = g.items.map(x => `${x.id}${x.v ? '|' + x.v : ''}*${x.q}`).join(',');
    return say(env, chat, `🔁 Минуле замовлення:\n${g.lines.slice(0, 15).map(esc).join('\n')}`, url('🔁 Повторити', `${SITE}index.html?go&rep=${encodeURIComponent(rep)}`)), true;
  }
  if (btn === 'cert') {
    const { certList } = await import('./site.js'), l = (await certList(env)).filter(x => x.phone === ph && x.st === 'ok');
    return say(env, chat, l.length ? '🎟 <b>Ваші сертифікати</b>\n' + l.map(x => `<code>${x.code}</code> · ${money(x.sum)}${x.left !== x.sum ? ` · залишок ${money(x.left)}` : ''}${x.to ? ` · для ${esc(x.to)}` : ''}`).join('\n') : '🎟 Сертифікатів поки немає. Найкращий подарунок — смачний вечір у Varvar:', s.certOn ? url('🎁 Купити сертифікат', SITE + 'about.html#cert') : undefined), true;
  }
  if (btn === 'bd') {
    if (c.bd) return say(env, chat, `🎂 Ваш день народження: <b>${bdText(c.bd)}</b>.\nЩоб змінити — напишіть нам «💬 Написати нам».`), true;
    await env.DB.put('gst:' + chat, 'bd', { expirationTtl: 3600 }); return say(env, chat, '🎂 Коли ваш день народження? Напишіть дату, напр. <b>25.12</b>'), true;
  }
  if (btn === 'chat') {
    if (!gb.chat) return say(env, chat, `📞 Зателефонуйте нам: ${esc(s.phone)}`), true;
    await env.DB.put('gst:' + chat, 'chat', { expirationTtl: 3 * 3600 }); return say(env, chat, '💬 Напишіть повідомлення — передамо адміністратору, відповідь прийде сюди.'), true;
  }
  return false;
}

// ---------- ✉️ вхідні: листування з гостями (ключ gin: { тел: { ph, name, last, open, msgs[] } }) ----------
// open — гість чекає відповіді (✉️ червоний у касі). k: 'msg' | 'rev' (відгук / низька оцінка)
const inGet = async env => (await env.DB.get('gin', 'json')) || {};
export async function inAdd(env, ph, name, m, open) {
  return L(env, 'gin', async () => {
    const all = await inGet(env), x = all[ph] ||= { ph, name: '', msgs: [] };
    if (name) x.name = name; x.msgs.push({ at: Date.now(), ...m }); x.msgs = x.msgs.slice(-40); x.last = Date.now(); x.open = open ? 1 : 0;
    const keys = Object.keys(all); if (keys.length > 300) keys.sort((a, b) => all[a].last - all[b].last).slice(0, keys.length - 300).forEach(k => delete all[k]);
    await env.DB.put('gin', JSON.stringify(all));
  });
}
export const inOpenN = async env => Object.values(await inGet(env)).filter(x => x.open).length;
async function inClose(env, ph, who) { return L(env, 'gin', async () => { const all = await inGet(env), x = all[ph]; if (!x) return false; x.open = 0; x.msgs.push({ at: Date.now(), f: 's', by: who, text: '✔️ закрито без відповіді', sys: 1 }); await env.DB.put('gin', JSON.stringify(all)); return true; }); }

// 🤖 бот персоналу: «вхідні» — кожна невідписана розмова окремим повідомленням; «Відповісти» на нього → гостю
export async function inboxBot(env, chat) {
  const l = Object.values(await inGet(env)).filter(x => x.open).sort((a, b) => a.last - b.last);
  if (!l.length) { await tg(env, 'sendMessage', { chat_id: chat, text: '✉️ Невідписаних повідомлень гостей немає 👌' }); return; }
  for (const x of l.slice(0, 15)) {
    const r = await tg(env, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text: `✉️ <b>${esc(x.name || '—')}</b> · ${fmtPhone(x.ph)}\n${x.msgs.slice(-4).map(m => `${m.f === 'g' ? '👤' : '↩️'} ${esc(m.text.slice(0, 400))}`).join('\n')}\n\n<i>↩️ «Відповісти» на це повідомлення — текст піде гостю</i>`, reply_markup: { inline_keyboard: [[{ text: '✔️ Закрити без відповіді', callback_data: 'gic:' + x.ph }]] } }).catch(() => null);
    const mid = r && await r.json().then(j => j.result?.message_id).catch(() => null); if (mid) await env.DB.put('gchm:' + mid, x.ph, { expirationTtl: 7 * 86400 });
  }
}
export const inboxClose = (env, ph, who) => inClose(env, ph, who);

// ---------- 💬 чат гість ⇄ адміністратор ----------
async function chatIn(env, ph, nm, text) {
  const c = await getCli(env, ph), name = c?.name || nm;
  const r = await notify(env, `💬 <b>Гість пише</b> · ${esc(name)} · ${fmtPhone(ph)}\n${esc(text.slice(0, 1500))}\n\n<i>↩️ Відповісти — «Відповісти» на це повідомлення</i>`).catch(() => null);
  const mid = r && await r.json().then(j => j.result?.message_id).catch(() => null);
  if (mid) await env.DB.put('gchm:' + mid, ph, { expirationTtl: 7 * 86400 });
  await inAdd(env, ph, name, { f: 'g', text: text.slice(0, 1500) }, true);
  await logEvent(env, { k: 'gchat', ph, text: `💬 ${name} (${fmtPhone(ph)}): ${text.slice(0, 300)}` });
}
// відповідь з каси або з групи персоналу (reply на повідомлення гостя)
export async function chatReply(env, ph, text, who) {
  const c = await getCli(env, ph); if (!c?.chat) return false;
  await say(env, c.chat, `💬 <b>Varvar:</b> ${esc(text.slice(0, 1500))}`);
  await inAdd(env, ph, c.name || '', { f: 's', by: who, text: text.slice(0, 1500) }, false);
  await env.DB.put('gst:' + c.chat, 'chat', { expirationTtl: 3 * 3600 }); // гість може відповісти одразу
  await logEvent(env, { k: 'gchat', ph, out: 1, text: `↩️ ${who} → ${c.name || fmtPhone(ph)}: ${text.slice(0, 300)}` });
  return true;
}
export async function staffReply(m, env, who) { // група персоналу: reply на «Гість пише»
  const mid = m.reply_to_message?.message_id; if (!mid || !m.text) return false;
  const ph = await env.DB.get('gchm:' + mid); if (!ph) return false;
  const ok = await chatReply(env, ph, m.text, who);
  await tg(env, 'sendMessage', { chat_id: m.chat.id, reply_to_message_id: m.message_id, text: ok ? '✅ Надіслано гостю' : '⚠️ Гість відключив бота' }).catch(() => {});
  return true;
}

// ---------- 🛵 статус замовлення ----------
export async function goStatusMsg(env, t, go, st) {
  if (!go?.phone || !(await getGb(env)).stat) return;
  const del = go.kind === 'del', no = tn(t);
  const text = {
    acc: `✅ Замовлення <b>${no}</b> прийнято${go.when ? ` на <b>${go.when}</b>` : ''}. Готуємо!`,
    cook: `🔥 Замовлення <b>${no}</b> готується`,
    ready: del ? '' : `🍽 Замовлення <b>${no}</b> готове — можна забирати!`,
    road: `🛵 Кур'єр${go.cour ? ' ' + esc(go.cour) : ''} виїхав із замовленням <b>${no}</b>${go.etaC ? ` — буде близько <b>${new Date(go.etaC).toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}</b>` : ''}`,
  }[st];
  if (!text) return;
  const { guestMsg } = await import('./site.js'); await guestMsg(env, go.phone, text);
}
// 🎁 нараховано бонуси (закриття чека)
export async function bonusMsg(env, ph, add, bal) {
  if (!(add > 0) || !(await getGb(env)).bon) return;
  const { guestMsg } = await import('./site.js'); await guestMsg(env, ph, `🎁 +${money(add)} бонусів за візит. На рахунку: <b>${money(bal)}</b>\nДякуємо, що ви з нами!`);
}

// ---------- 📣 розсилка ----------
const AUD = { all: 'усім', sleep: 'хто не був 30+ днів', bal: 'у кого є бонуси', bd: 'у кого ДН ±7 днів' };
async function audience(env, f) {
  const cfg = await getLoy(env), now = Date.now();
  return (await allCli(env)).filter(c => c.chat && !c.noSpam && (f === 'all' || (f === 'sleep' ? c.last && now - c.last > 30 * 864e5 : f === 'bal' ? c.bal > 0 : f === 'bd' ? bdNear(c.bd) : cliLevel(cfg, c)?.id === f)));
}
function bdNear(bd) { if (!bd) return false; const y = new Date().getFullYear(), t = Date.parse(dayKey() + 'T00:00:00Z'); return [y - 1, y, y + 1].some(Y => Math.abs(Date.parse(`${Y}-${bd}T00:00:00Z`) - t) <= 7 * 864e5); }
export async function castCount(env, f) { const gb = await getGb(env), last = +(await env.DB.get('gcastAt')) || 0; return { n: (await audience(env, f)).length, wait: Math.max(0, Math.ceil((last + gb.gap * 3600e3 - Date.now()) / 60e3)) }; }
export async function cast(env, f, text, who) {
  text = String(text || '').trim().slice(0, 1500); if (text.length < 3) return { error: 'Текст порожній' };
  const gb = await getGb(env), last = +(await env.DB.get('gcastAt')) || 0;
  if (Date.now() - last < gb.gap * 3600e3) return { error: `Наступна розсилка — через ${Math.ceil((last + gb.gap * 3600e3 - Date.now()) / 60e3)} хв (не частіше ніж раз на ${gb.gap} год)` };
  const l = (await audience(env, f)).slice(0, 2000); await env.DB.put('gcastAt', String(Date.now()));
  let n = 0; for (const c of l) { const r = await gtg(env, 'sendMessage', { chat_id: c.chat, text: `📣 ${esc(text)}`, parse_mode: 'HTML', reply_markup: url('🍔 Замовити', SITE + 'index.html?go') }).catch(() => null); if (r?.ok) n++; await sleep(40); }
  await logEvent(env, { k: 'shift', text: `📣 Розсилка гостям (${AUD[f] || f}): ${n} з ${l.length} — ${who}` });
  await notify(env, `📣 Розсилка гостям (${AUD[f] || f}) — ${n} з ${l.length} · ${esc(who)}\n<i>${esc(text.slice(0, 300))}</i>`).catch(() => {});
  return { n, of: l.length };
}

// ---------- ⏰ щодня (Cron): дні народження + «сплячі» ----------
export async function gbDaily(env) {
  const h = +new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });
  if (h < 11 || h >= 20) return; const flag = 'gbday:' + dayKey(); if (await env.DB.get(flag)) return; await env.DB.put(flag, '1', { expirationTtl: 3 * 86400 });
  const gb = await getGb(env); if (!gb.bd && !gb.sleep) return;
  const md = dayKey().slice(5), now = Date.now(), loy = await getLoy(env), bdRule = loy.on && loy.rules.find(r => r.type === 'bday' && r.on);
  let nb = 0, ns = 0;
  for (const c of await allCli(env)) {
    if (!c.chat) continue;
    if (gb.bd && c.bd === md) { await say(env, c.chat, gb.bdText + (bdRule ? `\n\n🎁 Ваш подарунок: <b>−${bdRule.pct}%</b> на замовлення в ці дні — просто назвіть номер телефону.` : ''), url('🍔 Замовити', SITE + 'index.html?go')); nb++; }
    else if (gb.sleep && c.last && now - c.last > gb.sleepDays * 864e5 && !(c.sleepAt && now - c.sleepAt < Math.max(60, gb.sleepDays * 2) * 864e5)) {
      const x = await cliTouch(env, c.phone, y => { y.sleepAt = now; if (gb.sleepBon) y.bal = (y.bal || 0) + gb.sleepBon; });
      await say(env, c.chat, `${gb.sleepText}${gb.sleepBon ? `\n\n🎁 +${money(gb.sleepBon)} бонусів — на рахунку <b>${money(x.bal)}</b>` : ''}`, url('🍔 Замовити', SITE + 'index.html?go')); ns++;
    }
    if (nb + ns) await sleep(40);
  }
  if (nb + ns) await logEvent(env, { k: 'shift', text: `🤖 Бот гостей: ${nb ? `🎂 привітали ${nb}` : ''}${nb && ns ? ' · ' : ''}${ns ? `👋 нагадали «сплячим» ${ns}${gb.sleepBon ? ` (+${gb.sleepBon} бонусів)` : ''}` : ''}` });
}

// ---------- API каси (op gb*) ----------
export async function gbApi(b, env, me) {
  const admin = me.role === 'admin', ok = (x = {}) => [{ ok: true, ...x }, 200], bad = (e, s = 400) => [{ error: e }, s];
  switch (b.op) {
    case 'gbGet': return ok({ cfg: await getGb(env), linked: (await allCli(env)).filter(c => c.chat).length, aud: AUD });
    case 'gbSet': { if (!admin) return bad('admin', 403); const c = await setGb(env, b.f || {}); return c.error ? bad(c.error) : ok({ cfg: c }); }
    case 'gbCount': { if (!admin) return bad('admin', 403); return ok(await castCount(env, String(b.f || 'all'))); }
    case 'gbCast': { if (!admin) return bad('admin', 403); const r = await cast(env, String(b.f || 'all'), b.text, me.name); return r.error ? bad(r.error) : ok(r); }
    case 'gbInbox': { const all = Object.values(await inGet(env)).sort((a, b) => b.open - a.open || b.last - a.last); return ok({ list: all.slice(0, 100).map(({ msgs, ...x }) => ({ ...x, lastMsg: msgs[msgs.length - 1] })) }); }
    case 'gbThread': { const x = (await inGet(env))[String(b.ph || '')]; if (!x) return bad('Не знайдено'); const c = await getCli(env, x.ph); return ok({ th: x, cli: c ? { n: c.n || 0, sum: c.sum || 0, bal: c.bal || 0, tg: !!c.chat } : null }); }
    case 'gbClose': return (await inClose(env, String(b.ph || ''), me.name)) ? ok() : bad('Не знайдено');
    case 'gbReply': { const r = await chatReply(env, String(b.ph || ''), String(b.text || '').trim(), me.name); return r ? ok() : bad('Гість відключив бота'); }
  }
  return null;
}
