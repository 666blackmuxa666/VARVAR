// 🌐 Сайт-візитка: дані закладу, бронювання (+ передзамовлення), подарункові сертифікати, кабінет гостя (вхід через Telegram),
// відгук після візиту, нагадування (Cron). Гість ідентифікується телефоном — той самий cli:<телефон>, що й бонуси (delivery.js).
import { getMenu, priceMap } from './menu.js';
import { tg, esc, hhmm, dayKey, L, logEvent, editEv, notify, addWaiterOrder, getBill, putBill, money, TZ, addMove, discAmt } from './ops.js';
import { normPhone, fmtPhone, getCli, cliTouch } from './delivery.js';
import { siteLink, venueId, MAIN } from './venue.js';
import { cleanDesign, cleanExtra, cleanBlocks, dayHours, safeUrl, cleanMenuTheme } from './sitedesign.js';

// бот для гостей (окремий від бота персоналу): вхід у кабінет, нагадування, відгуки
const gtg = (env, m, b) => tg({ ...env, BOT_TOKEN: env.GUEST_BOT_TOKEN || env.BOT_TOKEN }, m, b);

// ---------- дані візитки ----------
// 🧱 блоки сайту-візитки (порядок і показ задає власник у кабінеті)
export const BLOCKS = ['about', 'promos', 'menu', 'events', 'gallery', 'hookah', 'banquet', 'book', 'cert', 'reviews', 'contacts'];
export const SITE_DEF = {
  name: 'Varvar Food Bar', tagline: 'Смачна їжа, кальяни й затишок у серці Буковелю',
  about: 'Varvar — фуд-бар у Поляниці, поруч із трасами Буковелю. Готуємо ситні мінімакс-тарілки, пасти, бургери й страви за власними рецептами, змішуємо коктейлі та забиваємо кальяни. Після катання — найкраще місце зігрітись і поїсти.',
  phone: '+380689781642', addr: 'вул. Карпатська, 310, Поляниця (Буковель)', from: '11:00', to: '23:00',
  insta: '', tg: '', gmaps: 'https://maps.app.goo.gl/zJfweYo56wX1aRHW7', geo: [48.3545862, 24.4224854],
  rating: 0, ratingN: 0, reviewsUrl: 'https://maps.app.goo.gl/zJfweYo56wX1aRHW7', quotes: [],
  hits: [], promos: [], photos: [], hero: '',
  banquet: 'Два банкетні зали — до 20 гостей кожен. Дні народження, корпоративи, зустрічі після катання. Кейтеринг з їжею та кальянами.',
  hookah: '4 види кальянів і понад 50 смаків тютюну. Кальянщик підбере міцність і смак.',
  preMin: 20, certOn: 1, bookOn: 1,
};
const IMG_OK = u => /^(https:\/\/[^\s"'<>()]+|img\/[a-z0-9/_.-]+)$/i.test(u) && u.length <= 300;
const TXT = ['name', 'tagline', 'about', 'phone', 'addr', 'insta', 'tg', 'gmaps', 'reviewsUrl', 'banquet', 'hookah', 'hero', 'logo'];
export const getSite = async env => ({ ...SITE_DEF, ...((await env.DB.get('site', 'json')) || {}) });
export async function setSite(env, k, v) {
  return L(env, 'site', async () => {
    const s = await getSite(env);
    if (['insta', 'tg', 'gmaps', 'reviewsUrl'].includes(k)) { const u = String(v ?? '').trim(); if (u && !safeUrl(u)) return { error: 'Посилання має починатися з https://' }; s[k] = safeUrl(u); } /* 🛡 лише https / tel: — ніякого javascript: на візитці */
    else if (['hero', 'logo'].includes(k)) { const u = String(v ?? '').trim(); if (u && !IMG_OK(u)) return { error: 'Невірна адреса картинки' }; s[k] = u; }
    else if (TXT.includes(k)) s[k] = String(v ?? '').trim().slice(0, k === 'about' || k === 'banquet' ? 1500 : 300);
    else if (k === 'from' || k === 'to') { v = String(v).trim(); if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) return { error: 'Формат часу: 11:00' }; s[k] = v.padStart(5, '0'); }
    else if (['rating'].includes(k)) { v = Math.round(+v * 10) / 10; if (!(v >= 0 && v <= 5)) return { error: 'Від 0 до 5' }; s[k] = v; }
    else if (['ratingN', 'preMin', 'certOn', 'bookOn'].includes(k)) { v = Math.max(0, Math.round(+v || 0)); s[k] = v; }
    else if (k === 'hits') s.hits = [].concat(v || []).map(String).slice(0, 4);
    else if (k === 'promoAdd') { const p = { id: crypto.randomUUID().slice(0, 6), t: String(v.t || '').slice(0, 80), d: String(v.d || '').slice(0, 300), img: IMG_OK(String(v.img || '')) ? String(v.img) : '' }; if (!p.t) return { error: 'Назва акції?' }; s.promos = [...s.promos, p].slice(-10); }
    else if (k === 'promoDel') s.promos = s.promos.filter(p => p.id !== v);
    else if (k === 'quoteAdd') { const q = { t: String(v.t || '').slice(0, 300), a: String(v.a || '').slice(0, 40) }; if (!q.t) return { error: 'Текст?' }; s.quotes = [...s.quotes, q].slice(-6); }
    else if (k === 'quoteDel') s.quotes = s.quotes.filter((_, i) => i !== +v);
    else if (k === 'photoAdd') { if (!IMG_OK(String(v))) return { error: 'Невірна адреса картинки' }; s.photos = [...s.photos, String(v)].slice(-12); }
    else if (k === 'photoDel') s.photos = s.photos.filter(p => p !== v);
    else if (k === 'blocks') s.blocks = cleanBlocks(v, BLOCKS); /* 🧱 конструктор сайту */
    else if (k === 'siteDesign') { /* 🎨 усе з конструктора за раз; попередні 5 версій — для «↩️ Повернути» */
      const d = cleanDesign(v, BLOCKS), keys = ['theme', 'heroCfg', 'blocks', 'dock', 'ann', 'hours', 'seo', 'soc', 'season', 'addrs', 'events', 'langs', 'chat'];
      if (s.hero && typeof s.hero !== 'string') s.hero = ''; /* стара помилка: обʼєкт у полі фото */
      const prev = {}; for (const x of keys) if (s[x] !== undefined) prev[x] = s[x];
      if (Object.keys(prev).length) { const h = (await env.DB.get('site_ver', 'json')) || []; h.unshift({ at: Date.now(), d: prev }); await env.DB.put('site_ver', JSON.stringify(h.slice(0, 5))); }
      for (const x of keys) { if (d[x] === undefined) continue; if (d[x] === null) delete s[x]; else s[x] = d[x]; }
    }
    else if (k === 'menuDesign') { /* 🍽 дизайн меню; попередні 5 — для «↩️ Повернути» */
      if (s.menuTheme !== undefined) { const h = (await env.DB.get('menu_ver', 'json')) || []; h.unshift({ at: Date.now(), d: { menuTheme: s.menuTheme } }); await env.DB.put('menu_ver', JSON.stringify(h.slice(0, 5))); }
      const m = cleanMenuTheme(v?.menuTheme); if (m) s.menuTheme = m; else delete s.menuTheme;
    }
    else if (['dock', 'ann', 'hours', 'seo', 'soc', 'season', 'addrs', 'events', 'langs', 'chat', 'legal'].includes(k)) { const d = cleanExtra({ [k]: v }); if (d[k] == null) delete s[k]; else s[k] = d[k]; }
    else return { error: 'Невідоме поле' };
    await env.DB.put('site', JSON.stringify(s)); return s;
  });
}
// відчинено зараз?
export function openNow(s, at = hhmm()) { const h = dayHours(s, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(new Date().toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short' }))); if (!h) return false; const m = x => +x.slice(0, 2) * 60 + +x.slice(3), n = m(at), a = m(h.from), b = m(h.to); return a <= b ? n >= a && n < b : n >= a || n < b; }
// публічно для візитки: дані + хіти з меню (фото, ціни)
export async function sitePublic(env) {
  const s = await getSite(env), menu = await getMenu(env), all = menu.categories.flatMap(c => c.items.filter(i => !i.hidden).map(i => ({ ...i, cat: c.id })));
  let hits = s.hits.map(id => all.find(i => i.id === id)).filter(Boolean).slice(0, 4); /* 🍽 на візитці — 4 страви, як у меню */
  if (!hits.length) { const ph = all.filter(i => i.img); hits = (ph.filter(i => ['minimax', 'burgers', 'pasta', 'pans', 'salads'].includes(i.cat)).length ? ph.filter(i => ['minimax', 'burgers', 'pasta', 'pans', 'salads'].includes(i.cat)) : ph).slice(0, 4); }
  const td = new Date().toLocaleDateString('sv-SE', { timeZone: TZ }); /* минулі події й прострочене оголошення / сезон — не віддаємо */
  if (s.events) s.events = s.events.filter(e => e.d >= td).sort((a, b) => (a.d + a.tm).localeCompare(b.d + b.tm));
  if (s.ann?.till && s.ann.till < td) s.ann = { ...s.ann, on: 0 }; if (s.season?.till && s.season.till < td) s.season = { k: '' };
  const onl = !!((await (await import('./delivery.js')).getGoCfg(env)).onl && (await import('./liqpay.js')).lpKeys(env)); /* 💳 сертифікат онлайн — той самий перемикач, що й замовлення */
  return { ...s, certOnl: s.certOn && onl ? 1 : 0, open: openNow(s), hits: hits.map(i => ({ id: i.id, n: i.name, d: i.desc, p: i.price ?? i.variants?.[0]?.p, img: i.img, size: i.size })) };
}

// ---------- 📅 бронювання ----------
const bkMon = id => `${id.slice(0, 4)}-${id.slice(4, 6)}`;
const getBk = async (env, m) => (await env.DB.get('book:' + m, 'json')) || [];
// індекс bkm:<id> → місяць ключа, де лежить запис (після переносу дати). Без індексу — місяць з id (старі записи)
const bkLoc = async (env, id) => (await env.DB.get('bkm:' + id)) || bkMon(id);
const bkFind = async (env, id) => { const m = await bkLoc(env, id); let x = (await getBk(env, m)).find(b => b.id === id); if (!x && m !== bkMon(id)) x = (await getBk(env, bkMon(id))).find(b => b.id === id); return x; };
// nm — місяць, у який запис може переїхати (нова дата); тоді замикаємо обидва ключі
async function bkEdit(env, id, fn, nm) {
  const m0 = await bkLoc(env, id), keys = ['book:' + m0, 'book:' + bkMon(id)]; if (nm) keys.push('book:' + nm);
  return L(env, keys, async () => {
    let m = (await env.DB.get('bkm:' + id)) || bkMon(id), l = await getBk(env, m), x = l.find(b => b.id === id);
    if (!x && m !== bkMon(id)) { m = bkMon(id); l = await getBk(env, m); x = l.find(b => b.id === id); }
    if (!x) return null; const r = fn(x, l); if (r === false) return null;
    const to = x.date.slice(0, 7);
    if (to !== m && keys.includes('book:' + to)) { // перенос у ключ нового місяця
      const l2 = (await getBk(env, to)).filter(b => b.id !== id); l2.push(x);
      await env.DB.put('book:' + to, JSON.stringify(l2)); await env.DB.put('book:' + m, JSON.stringify(l.filter(b => b.id !== id)));
      if (to === bkMon(id)) await env.DB.delete('bkm:' + id); else await env.DB.put('bkm:' + id, to);
    } else await env.DB.put('book:' + m, JSON.stringify(l));
    return x;
  });
}
const BST = { new: '🆕 нова', ok: '✅ підтверджено', no: '❌ відхилено', came: '🪑 прийшли', noshow: '🚫 не прийшли', cancel: '↩️ скасовано гостем' };
export const bkLabel = s => BST[s] || s;
const bkText = b => `${b.kind === 'banquet' ? '🎉 <b>БАНКЕТ</b>' : '📅 <b>БРОНЬ</b>'} · <b>${b.date.slice(8)}.${b.date.slice(5, 7)} о ${b.time}</b> · ${b.people} гост.\n👤 ${esc(b.name)} · <a href="tel:+${b.phone}">${fmtPhone(b.phone)}</a>${b.comment ? `\n💬 ${esc(b.comment)}` : ''}${b.pre?.length ? `\n🍽 Передзамовлення:\n${b.pre.map(esc).join('\n')}` : ''}${b.t ? `\n🪑 Стіл ${b.t}` : ''}`;
export const bkButtons = b => b.st === 'new' ? [[{ text: '✅ Підтвердити', callback_data: `bk:${b.id}:ok` }, { text: '❌ Відхилити', callback_data: `bk:${b.id}:no` }]]
  : b.st === 'ok' ? [[{ text: '🪑 Прийшли', callback_data: `bk:${b.id}:came` }, { text: '🚫 Не прийшли', callback_data: `bk:${b.id}:noshow` }], ...(b.pre?.length && !b.preSent ? [[{ text: '🔥 Передзамовлення на кухню', callback_data: `bk:${b.id}:kit` }]] : [])] : [];
export async function bookCreate(b, ip, env) {
  const s = await getSite(env); if (!s.bookOn) return [{ error: 'off' }, 403];
  const phone = normPhone(b.phone), name = String(b.name || '').trim().slice(0, 40);
  if (!phone || !name) return [{ error: 'contact' }, 400];
  const date = String(b.date || ''), time = String(b.time || '').padStart(5, '0'), people = Math.max(1, Math.min(60, parseInt(b.people, 10) || 0));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return [{ error: 'date' }, 400];
  const today = dayKey(), max = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  if (date < today || date > max || (date === today && time < hhmm())) return [{ error: 'date' }, 400];
  const rk = 'bkrl:' + String(b.device || ip).slice(0, 64), rn = +(await env.DB.get(rk)) || 0; if (rn >= 3) return [{ error: 'rate' }, 429];
  const x = { id: date.replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 6), kind: b.kind === 'banquet' ? 'banquet' : 'table', name, phone, date, time, people, comment: String(b.comment || '').trim().slice(0, 300), st: 'new', at: Date.now() };
  await L(env, 'book:' + date.slice(0, 7), async () => { const l = await getBk(env, date.slice(0, 7)); l.push(x); await env.DB.put('book:' + date.slice(0, 7), JSON.stringify(l)); });
  await env.DB.put(rk, String(rn + 1), { expirationTtl: 3600 });
  await cliTouch(env, phone, c => { c.name = name; });
  await logEvent(env, { k: 'book', bid: x.id, s: 'new', text: `${x.kind === 'banquet' ? '🎉 Банкет' : '📅 Бронь'} ${date.slice(8)}.${date.slice(5, 7)} о ${time} · ${people} гост. · ${name} ${fmtPhone(phone)}${x.comment ? ' · ' + x.comment : ''}` });
  const r = await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: bkText(x), parse_mode: 'HTML', reply_markup: { inline_keyboard: bkButtons(x) } }).catch(() => null);
  const mid = r && await r.json().then(j => j.result?.message_id).catch(() => null); if (mid) await bkEdit(env, x.id, y => { y.mid = mid; });
  await guestMsg(env, phone, `📅 Ми отримали вашу заявку на ${date.slice(8)}.${date.slice(5, 7)} о ${time} (${people} гост.). Підтвердимо найближчим часом.`);
  return [{ ok: true, id: x.id }, 200];
}
// передзамовлення до броні (без оплати): ціни — з меню на сервері
export async function bookPre(b, env) {
  const id = String(b.id || ''); if (!/^\d{8}[a-f0-9]{6}$/.test(id)) return [{ error: 'bad' }, 400];
  const P = priceMap(await getMenu(env)), lines = [];
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 40)) { const p = P[it.id], q = Math.min(30, Math.max(0, parseInt(it.q, 10) || 0)); if (!p || !q) continue;
    const price = typeof p.p === 'number' ? p.p : Object.hasOwn(p.p, String(it.v)) ? p.p[it.v] : 0; if (!(price > 0)) continue; lines.push(`${q}× ${p.n}${typeof p.p === 'number' ? '' : ` ${it.v} ${p.s || 'л'}`} — ${price * q}`); }
  const ph = normPhone(b.phone);
  let sent = false; const x = await bkEdit(env, id, y => { if (y.phone !== ph || ['no', 'came', 'noshow', 'cancel'].includes(y.st)) return false; if (y.preSent) { sent = true; return false; } y.pre = lines; y.preIds = b.items.slice(0, 40); });
  if (sent) return [{ error: 'sent' }, 409]; /* уже на кухні — змінити можна лише через заклад */
  if (!x) return [{ error: 'bad' }, 400];
  await notify(env, `🍽 Передзамовлення до броні ${x.date.slice(8)}.${x.date.slice(5, 7)} о ${x.time} · ${esc(x.name)}:\n${lines.map(esc).join('\n')}`, { inline_keyboard: bkButtons(x) });
  return [{ ok: true, n: lines.length }, 200];
}
// пошук броні за id (з індексом bkm:) — для бота, без обмеження «14 днів»
export const bookGet = (env, id) => /^\d{8}[a-f0-9]{6}$/.test(id || '') ? bkFind(env, id) : null;
export async function bookStatus(env, id) {
  if (!/^\d{8}[a-f0-9]{6}$/.test(id || '')) return null; const x = await bkFind(env, id);
  return x && { st: x.st, date: x.date, time: x.time, people: x.people, kind: x.kind, pre: x.pre || [] };
}
// зміна статусу (каса / бот). kit — передзамовлення на кухню (потрібен стіл)
export async function bookSet(env, id, st, who, { t } = {}) {
  if (st === 'kit') {
    // атомарно: під замком перевірити й позначити «відправляється», потім кухня; при збої — зняти позначку
    let err = null;
    const b0 = await bkEdit(env, id, y => { if (!y.pre?.length) { err = 'Немає передзамовлення'; return false; } if (y.preSent) { err = 'Вже відправлено'; return false; }
      if (!(+t || y.t)) { err = 'Вкажіть стіл'; return false; } y.preSent = 'sending'; y.t = +t || y.t; });
    if (!b0) return { error: err || 'Не знайдено' };
    const items = b0.pre.map(l => l.match(/^(\d+)× (.+) — (\d+)$/)).filter(Boolean).map(m => ({ name: m[2], q: +m[1], price: +m[3] / +m[1] }));
    const r = await addWaiterOrder(env, { table: b0.t, items }, who, `📅 передзамовлення · ${b0.name}`, 'бронь').catch(() => null);
    if (!r) { await bkEdit(env, id, y => { if (y.preSent === 'sending') delete y.preSent; }); return { error: 'Не вдалось' }; }
    return bkEdit(env, id, y => { y.preSent = Date.now(); });
  }
  if (!BST[st]) return { error: 'Невідомий статус' };
  let same = false; const x = await bkEdit(env, id, y => { same = y.st === st; y.st = st; y.by = who; if (t) y.t = +t; });
  if (!x) return null; if (same) return x; /* повторне натискання (каса + Telegram) — без дубля гостю */
  await editEv(env, l => { for (const e of l) if (e.bid === id) { e.s = st === 'no' || st === 'noshow' ? 'rej' : 'acc'; e.accBy = who; } }).catch(() => {});
  if (x.mid) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: x.mid, text: `${bkText(x)}\n\n${bkLabel(st)} — <b>${esc(who)}</b>`, parse_mode: 'HTML', reply_markup: { inline_keyboard: bkButtons(x) } }).catch(() => {});
  if (st === 'ok') await guestMsg(env, x.phone, `✅ Вашу бронь підтверджено: ${x.date.slice(8)}.${x.date.slice(5, 7)} о ${x.time}, ${x.people} гост. Чекаємо!`);
  if (st === 'no') await guestMsg(env, x.phone, `😔 На жаль, ${x.date.slice(8)}.${x.date.slice(5, 7)} о ${x.time} ми не можемо прийняти бронь. Зателефонуйте нам — підберемо інший час.`);
  return x;
}
// список для каси: сьогодні + 14 днів
// список за датами. Запис живе в місяці своєї дати (при зміні дати переноситься, індекс bkm:<id>); старі записи — у місяці id, тому скануємо ще 62 дні назад
const monRange = (a, b) => { const out = []; const d = new Date(a.slice(0, 7) + '-01T12:00:00Z'), e = b.slice(0, 7); while (out.length < 24) { const m = d.toISOString().slice(0, 7); out.push(m); if (m >= e) break; d.setUTCMonth(d.getUTCMonth() + 1); } return out; };
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export async function bookList(env, from = dayKey(), to = addDays(dayKey(), 14), all = false) {
  const ms = monRange(addDays(from, -62), to);
  return (await Promise.all(ms.map(m => getBk(env, m)))).flat().filter(b => b.date >= from && b.date <= to && (all || b.st !== 'cancel')).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
// ✏️ редагування з каси (будь-які поля) і ➕ бронь по телефону
const vDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || ''), vTime = t => /^\d{1,2}:\d{2}$/.test(t || '');
export async function bookEditFields(env, id, f, who) {
  const ph = f.phone != null ? normPhone(f.phone) : undefined; if (f.phone != null && !ph) return { error: 'Невірний телефон' };
  if (f.date != null && !vDate(f.date)) return { error: 'Невірна дата' }; if (f.time != null && !vTime(f.time)) return { error: 'Невірний час' };
  const x = await bkEdit(env, id, y => {
    if (f.name != null) y.name = String(f.name).trim().slice(0, 40) || y.name; if (ph) y.phone = ph; if (f.date) y.date = f.date; if (f.time) y.time = f.time.padStart(5, '0');
    if (f.people != null) y.people = Math.max(1, Math.min(60, parseInt(f.people, 10) || y.people)); if (f.comment != null) y.comment = String(f.comment).trim().slice(0, 300);
    if (f.kind) y.kind = f.kind === 'banquet' ? 'banquet' : 'table'; if (f.t != null) y.t = +f.t || 0; if (f.note != null) y.note = String(f.note).trim().slice(0, 300);
    if (f.date || f.time) { delete y.remA; delete y.remG; } y.edBy = who; y.edAt = Date.now();
  }, f.date ? f.date.slice(0, 7) : undefined);
  if (!x) return { error: 'Не знайдено' };
  if (x.mid) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: x.mid, text: `${bkText(x)}\n\n✏️ змінено — <b>${esc(who)}</b>`, parse_mode: 'HTML', reply_markup: { inline_keyboard: bkButtons(x) } }).catch(() => {});
  if (f.date || f.time) await guestMsg(env, x.phone, `✏️ Вашу бронь змінено: <b>${x.date.slice(8)}.${x.date.slice(5, 7)} о ${x.time}</b>, ${x.people} гост.`);
  return x;
}
export async function bookManual(env, f, who) {
  const phone = normPhone(f.phone), name = String(f.name || '').trim().slice(0, 40);
  if (!phone || !name) return { error: "Вкажіть ім'я і телефон" }; if (!vDate(f.date) || !vTime(f.time)) return { error: 'Вкажіть дату й час' };
  const x = { id: f.date.replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 6), kind: f.kind === 'banquet' ? 'banquet' : 'table', name, phone, date: f.date, time: f.time.padStart(5, '0'), people: Math.max(1, Math.min(60, parseInt(f.people, 10) || 2)), comment: String(f.comment || '').trim().slice(0, 300), note: String(f.note || '').trim().slice(0, 300), t: +f.t || 0, st: 'ok', at: Date.now(), src: 'каса', by: who };
  await L(env, 'book:' + f.date.slice(0, 7), async () => { const l = await getBk(env, f.date.slice(0, 7)); l.push(x); await env.DB.put('book:' + f.date.slice(0, 7), JSON.stringify(l)); });
  await cliTouch(env, phone, c => { if (!c.name) c.name = name; });
  await notify(env, `📅 Нова бронь (каса, ${esc(who)}): <b>${x.date.slice(8)}.${x.date.slice(5, 7)} ${x.time}</b> · ${x.people} гост. · ${esc(name)} ${fmtPhone(phone)}${x.t ? ` · стіл ${x.t}` : ''}`);
  await guestMsg(env, phone, `✅ Вас забронювано: ${x.date.slice(8)}.${x.date.slice(5, 7)} о ${x.time}, ${x.people} гост. Чекаємо!`);
  return x;
}

// ---------- 🎁 сертифікати ----------
const certCode = () => 'VV-' + Array.from(crypto.getRandomValues(new Uint8Array(5)), x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
export async function certAsk(b, ip, env) {
  const s = await getSite(env); if (!s.certOn) return [{ error: 'off' }, 403];
  const phone = normPhone(b.phone), sum = Math.round(+b.sum || 0), from = String(b.from || '').trim().slice(0, 40), to = String(b.to || '').trim().slice(0, 40);
  if (!phone || !from || !(sum >= 100 && sum <= 50000)) return [{ error: 'bad' }, 400];
  const rk = 'ctrl:' + String(b.device || ip).slice(0, 64), rn = +(await env.DB.get(rk)) || 0; if (rn >= 3) return [{ error: 'rate' }, 429];
  const code = certCode(), c = { code, sum, left: sum, from, to, phone, note: String(b.note || '').slice(0, 200), st: 'new', at: Date.now(), uses: [] };
  if (b.pay === 'online') { // 💳 онлайн: сертифікат активується лише після оплати (callback /api/lp/cert)
    const LP = await import('./liqpay.js'), k = LP.lpKeys(env); if (!k || !(await (await import('./delivery.js')).getGoCfg(env)).onl) return [{ error: 'off' }, 403];
    await env.DB.put('cert:' + code, JSON.stringify({ ...c, onl: 1 }), { expirationTtl: 3 * 86400 }); await env.DB.put(rk, String(rn + 1), { expirationTtl: 3600 });
    const f = await LP.lpForm(k, { order_id: `ct-${env.VENUE || 'varvar'}-${code}`, amount: sum, description: `Подарунковий сертифікат ${sum} грн`, result_url: siteLink('about.html#cert=' + code), server_url: env.SELF_URL + '/api/lp/cert' });
    return [{ ok: true, pay: f.url, code }, 200];
  }
  await env.DB.put('cert:' + code, JSON.stringify(c)); await env.DB.put(rk, String(rn + 1), { expirationTtl: 3600 });
  await L(env, 'certs', async () => { const l = (await env.DB.get('certs', 'json')) || []; l.push(code); await env.DB.put('certs', JSON.stringify(l.slice(-500))); });
  await logEvent(env, { k: 'cert', code, s: 'new', text: `🎁 Сертифікат ${money(sum)} · від ${from}${to ? ' для ' + to : ''} · ${fmtPhone(phone)} — чекає оплати` });
  await notify(env, `🎁 <b>Заявка на сертифікат</b> ${money(sum)}\nвід <b>${esc(from)}</b>${to ? ` для <b>${esc(to)}</b>` : ''}\n📞 <a href="tel:+${phone}">${fmtPhone(phone)}</a>${c.note ? `\n💬 ${esc(c.note)}` : ''}\n\nПісля оплати — підтвердьте:`, { inline_keyboard: [[{ text: '💵 Оплачено готівкою', callback_data: `ct:${code}:cash` }, { text: '💳 Карткою', callback_data: `ct:${code}:card` }], [{ text: '❌ Скасувати', callback_data: `ct:${code}:no` }]] });
  await guestMsg(env, phone, `🎁 Заявку на сертифікат ${money(sum)} отримали. Адміністратор зв'яжеться щодо оплати.`);
  return [{ ok: true }, 200];
}
// 💳 callback LiqPay: сертифікат оплачено онлайн → активний (у список, стрічка, гостю код)
export async function certPaid(env, x) {
  const pre = `ct-${env.VENUE || 'varvar'}-`, oid = String(x.order_id || ''); if (!oid.startsWith(pre)) return { error: 'order' }; const code = oid.slice(pre.length); const c0 = await getCert(env, code);
  const { lpOk: ok0 } = await import('./liqpay.js'), late = why => ok0(x) ? notify(env, `⚠️ Сертифікат ${esc(code)}: онлайн-оплата ${Math.round(+x.amount || 0)} грн прийшла, але ${why}. Активуйте вручну або поверніть гроші в LiqPay.`).catch(() => {}) : null;
  if (!c0) { await late('заявка вже протермінована'); return { error: 'expired' }; }
  if (c0.st !== 'new') { if (c0.st === 'no' || !c0.lp) await late(c0.st === 'no' ? 'заявку відхилено' : 'сертифікат уже оплачено раніше'); return { ok: true, dup: 1 }; }
  const { lpOk } = await import('./liqpay.js'); if (!lpOk(x)) return { ok: true, fail: 1 };
  if (Math.round(+x.amount || 0) + 1 < c0.sum) { await late(`сума ${Math.round(+x.amount || 0)} грн менша за сертифікат ${c0.sum} грн — не активовано`); return { ok: true, fail: 1 }; } /* 💳 недоплата — не активуємо */
  await env.DB.put('cert:' + code, JSON.stringify({ ...c0, lp: String(x.payment_id || '') })); /* без терміну: тепер справжній сертифікат */
  await L(env, 'certs', async () => { const l = (await env.DB.get('certs', 'json')) || []; if (!l.includes(code)) l.push(code); await env.DB.put('certs', JSON.stringify(l.slice(-500))); });
  const c = await certPay(env, code, 'online', '🌐 LiqPay'); if (!c) return { error: 'state' };
  await logEvent(env, { k: 'cert', code, s: 'acc', accBy: '🌐 онлайн', text: `🎁 Сертифікат ${money(c.sum)} · від ${c.from}${c.to ? ' для ' + c.to : ''} — 💳 оплачено онлайн${x.status === 'sandbox' ? ' · 🧪 тест' : ''}` });
  await notify(env, `🎁 <b>Сертифікат оплачено онлайн</b> ${money(c.sum)} · код <b>${code}</b>\nвід ${esc(c.from)}${c.to ? ` для ${esc(c.to)}` : ''}`).catch(() => {});
  return { ok: true };
}
export const getCert = async (env, code) => (await env.DB.get('cert:' + String(code || '').toUpperCase().trim(), 'json')) || null;
// оплачено → активний (надходження в касу як рух грошей), або скасовано
export async function certPay(env, code, how, who) {
  const c = await L(env, 'cert:' + code, async () => { const c = await getCert(env, code); if (!c || c.st !== 'new') return null; c.st = how === 'no' ? 'no' : 'ok'; c.paid = how; c.paidAt = Date.now(); c.by = who; await env.DB.put('cert:' + code, JSON.stringify(c)); return c; });
  if (!c) return null;
  if (c.st === 'ok') await addMove(env, { type: how === 'card' || how === 'online' ? 'kin' : 'in', sum: c.sum, note: `🎁 Сертифікат ${code} (${c.from})${how === 'online' ? ' · 🌐 онлайн' : ''}`, by: who }).catch(() => {}); // гроші за сертифікат — у касу / на картку
  await editEv(env, l => { for (const e of l) if (e.code === code) { e.s = c.st === 'ok' ? 'acc' : 'rej'; e.accBy = who; } }).catch(() => {});
  if (c.st === 'ok') await guestMsg(env, c.phone, `🎁 Сертифікат ${money(c.sum)} активовано!\nКод: <b>${code}</b>\nСторінка для подарунку: ${siteLink('about.html#cert=' + code)}`);
  return c;
}
// списати сертифікат у рахунок стола (як бонус)
export async function certUse(env, t, code, who) {
  code = String(code || '').toUpperCase().trim();
  return L(env, ['bills', 'cert:' + code], async () => {
    const c = await getCert(env, code), b = await getBill(env, t);
    if (!c || c.st !== 'ok') return { error: 'Сертифікат не знайдено або не оплачено' }; if (!c.left) return { error: 'Сертифікат уже використано' }; if (!b.total) return { error: 'Стіл порожній' };
    if (c.exp && Date.now() > c.exp) return { error: `Подарунок діяв до ${new Date(c.exp).toLocaleDateString('uk-UA', { timeZone: TZ })}` };
    let cap = Infinity; // 🎂 подарунок (кальян): лише на цю позицію в рахунку, не більше її ціни
    if (c.items?.length) { const { billItems } = await import('./ops.js'), it = billItems(b).filter(x => c.items.includes(x.name)).sort((a, z) => z.sum / z.q - a.sum / a.q)[0]; if (!it) return { error: `Спершу додайте в рахунок: ${c.gift}` }; cap = Math.round(it.sum / it.q); }
    const already = b.cert?.code === code ? b.cert.sum : 0, use = Math.max(0, Math.min(c.left + already, cap, b.total - discAmt(b) - (b.promo?.sum || 0) - (b.bonus || 0) + already)); // до сплати — після знижки й акцій
    b.bonus = (b.bonus || 0) - already + use; b.cert = { code, sum: use }; c.left = c.left + already - use;
    c.uses = [...(c.uses || []).filter(u => u.t !== t || u.d !== dayKey()), { t, d: dayKey(), sum: use, by: who }];
    await putBill(env, t, b); await env.DB.put('cert:' + code, JSON.stringify(c)); return { use, left: c.left };
  });
}
// 🎂 подарунковий сертифікат на ДН (бот гостей): позиція з меню, діє N днів, оплачено «подарунок»
export async function certGift(env, { phone, name, gift, items, sum, days, here }) {
  const code = certCode(), c = { ...(here ? { here: 1 } : {}), code, sum, left: sum, from: (await getSite(env)).name + ' 🎂', to: name || '', phone, note: '', st: 'ok', paid: 'gift', gift, items, at: Date.now(), exp: Date.now() + days * 864e5, uses: [] };
  await env.DB.put('cert:' + code, JSON.stringify(c));
  await L(env, 'certs', async () => { const l = (await env.DB.get('certs', 'json')) || []; l.push(code); await env.DB.put('certs', JSON.stringify(l.slice(-500))); });
  return c;
}
// ✕ прибрати сертифікат з рахунку (передумали): сума повертається на сертифікат; подарунок ДН, вибитий у рахунку, — зникає, і гість знову може його отримати
export async function certOff(env, t, who) {
  const r = await L(env, 'bills', async () => {
    const b = await getBill(env, t); if (!b.cert) return null; const { code, sum } = b.cert;
    b.bonus = Math.max(0, (b.bonus || 0) - sum); if (!b.bonus) delete b.bonus; delete b.cert; await putBill(env, t, b);
    const c = await L(env, 'cert:' + code, async () => { const c = await getCert(env, code); if (!c) return null; c.left = Math.min(c.sum, c.left + sum); c.uses = (c.uses || []).filter(u => !(u.t === t && u.d === dayKey())); await env.DB.put('cert:' + code, JSON.stringify(c)); return c; });
    return { code, sum, c };
  });
  if (!r) return null;
  if (r.c?.here && r.c.left === r.c.sum) { await certDel(env, r.code); if (r.c.phone) await cliTouch(env, r.c.phone, x => { delete x.bdY; }); }
  await logEvent(env, { k: 'cert', code: r.code, s: 'ok', t, text: `↩️ ${r.c?.gift ? '🎂 Подарунок на ДН' : '🎟 Сертифікат ' + r.code} прибрано з рахунку стола ${t} (+${r.sum} ₴ назад) — ${who}` });
  return r;
}
export async function certDel(env, code) {
  code = String(code || '').toUpperCase().trim();
  if (!(await getCert(env, code))) return false;
  await env.DB.delete('cert:' + code);
  await L(env, 'certs', async () => { const l = (await env.DB.get('certs', 'json')) || []; await env.DB.put('certs', JSON.stringify(l.filter(x => x !== code))); });
  return true;
}
export async function certList(env) { const l = (await env.DB.get('certs', 'json')) || []; return (await env.DB.getMany(l.slice(-60).map(c => 'cert:' + c), 'json')).filter(Boolean).reverse(); }
export const certPublic = async (env, code) => { const c = await getCert(env, code); return c && c.st === 'ok' ? { code: c.code, sum: c.sum, left: c.left, from: c.from, to: c.to } : null; };

// ---------- 👤 кабінет гостя: вхід через Telegram (номер підтверджує сам Telegram — без SMS) ----------
export async function botName(env) {
  if (env.GUEST_BOT_TOKEN && (await env.DB.get('g2hook')) !== env.SELF_URL) { // вебхук бота гостей — один раз, з сервера (секрет не виходить назовні)
    const r = await gtg(env, 'setWebhook', { url: env.SELF_URL + '/tg2', secret_token: env.TG_SECRET, allowed_updates: ['message', 'callback_query'] }).then(r => r.json()).catch(() => null);
    if (r?.ok) await env.DB.put('g2hook', env.SELF_URL); else env.__hookErr = r?.description || 'fetch failed';
  }
  let n = await env.DB.get('gbotname'); if (!n) { const r = await gtg(env, 'getMe', {}).then(r => r.json()).catch(() => null); n = r?.result?.username || ''; if (n) await env.DB.put('gbotname', n, { expirationTtl: 7 * 86400 }); } return n; }
export async function meStart(env) { const n = crypto.randomUUID().replace(/-/g, '').slice(0, 16); await env.DB.put('gl:' + n, JSON.stringify({ at: Date.now() }), { expirationTtl: 900 }); const bot = await botName(env); return { nonce: n, bot, ...(env.__hookErr ? { hookErr: env.__hookErr } : {}) }; }
export async function mePoll(env, n) { if (!/^[a-f0-9]{16}$/.test(n || '')) return null; const x = await env.DB.get('gl:' + n, 'json'); if (!x?.token) return { wait: 1 }; await env.DB.delete('gl:' + n); return { token: x.token }; }
const meSess = async (env, tok) => /^[a-f0-9]{32}$/.test(tok || '') ? env.DB.get('gs:' + tok) : null;
export async function meData(env, tok) {
  const ph = await meSess(env, tok); if (!ph) return null;
  const c = (await getCli(env, ph)) || { n: 0, sum: 0, bal: 0 };
  // через bookList: він сканує місяці дат + запас назад (старі записи), тож перенесені броні теж знайдуться
  const books = (await bookList(env, dayKey(), addDays(dayKey(), 365), true)).filter(b => b.phone === ph && !['no', 'cancel', 'noshow'].includes(b.st)).map(b => ({ id: b.id, date: b.date, time: b.time, people: b.people, st: b.st, kind: b.kind, pre: b.pre || [] }));
  // історія: закриті чеки з цим телефоном за 90 днів
  const days = Array.from({ length: 90 }, (_, i) => new Date(Date.now() - i * 864e5).toLocaleDateString('sv-SE', { timeZone: TZ }));
  const cl = await env.DB.getMany(days.map(d => 'closed:' + d), 'json'), hist = [];
  cl.forEach((l, i) => (l || []).forEach(x => { if (x.cli === ph && !x.del) hist.push({ d: days[i], at: x.at, sum: x.sum, go: x.go || '', dishes: (x.dishes || []).map(([n, q]) => [n, q]) }); }));
  const certs = (await certList(env)).filter(x => x.phone === ph && x.st === 'ok' && (x.left ?? x.sum) > 0).map(x => ({ code: x.code, sum: x.sum, left: x.left, to: x.to }));
  return { phone: ph, name: c.name || '', bal: c.bal || 0, n: c.n || 0, sum: c.sum || 0, books, hist: hist.slice(0, 30), certs, tg: !!c.chat };
}
export async function meLogout(env, tok) { if (/^[a-f0-9]{32}$/.test(tok || '')) await env.DB.delete('gs:' + tok); }
// повідомлення гостю в Telegram (якщо підключив)
export async function guestMsg(env, ph, text, markup) { const c = await getCli(env, ph); if (!c?.chat) return; await gtg(env, 'sendMessage', { chat_id: c.chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }).catch(() => {}); }

// бот: гість (не персонал) — /start login_<nonce> → «поділитись номером» → прив'язка chat_id до телефону
export async function guestBot(m, env) {
  const uid = m.from?.id, chat = m.chat.id, text = (m.text || '').trim();
  const lg = text.match(/^\/start (?:login_)?([a-f0-9]{16})$/);
  if (lg) {
    if (!(await env.DB.get('gl:' + lg[1]))) { await gtg(env, 'sendMessage', { chat_id: chat, text: '⌛ Посилання застаріло — натисніть «Увійти» на сайті ще раз.' }); return true; }
    await env.DB.put('glu:' + uid, lg[1], { expirationTtl: 900 });
    await gtg(env, 'sendMessage', { chat_id: chat, text: `👋 Щоб увійти в кабінет гостя ${(await getSite(env)).name}, поділіться своїм номером (кнопка нижче). Так ми бачимо ваші бонуси, броні й замовлення.`, reply_markup: { keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
    return true;
  }
  if (m.contact) {
    if (m.contact.user_id !== uid) { await gtg(env, 'sendMessage', { chat_id: chat, text: 'Потрібен саме ваш номер — натисніть кнопку «📱 Поділитися номером».' }); return true; }
    const ph = normPhone(m.contact.phone_number); if (!ph) { await gtg(env, 'sendMessage', { chat_id: chat, text: 'Підтримуються українські номери (+380).', reply_markup: { remove_keyboard: true } }); return true; }
    const was = (await getCli(env, ph))?.chat; const cc = await cliTouch(env, ph, c => { c.chat = chat; if (!c.name) c.name = m.from?.first_name || ''; if (!c.joined) c.joined = Date.now(); });
    const gbm = await import('./guestbot.js'); await gbm.linkChat(env, chat, ph);
    const n = await env.DB.get('glu:' + uid);
    if (n && await env.DB.get('gl:' + n)) { const tok = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join(''); await env.DB.put('gs:' + tok, ph, { expirationTtl: 30 * 86400 }); await env.DB.put('gl:' + n, JSON.stringify({ token: tok }), { expirationTtl: 300 }); }
    await gbm.showMenu(env, chat, `✅ Готово! Номер ${fmtPhone(ph)} підключено.${!was ? `\n🎁 Ви в програмі лояльності ${(await getSite(env)).name}: бонуси з кожного замовлення, знижки постійним гостям, а на день народження — 🎁 кальян у подарунок (вкажіть дату: «🎂 День народження»).${cc.n ? ` Уже враховано візитів: ${cc.n}.` : ''}${cc.bal ? ` На рахунку ${cc.bal} бонусів.` : ''}` : ''}${n ? '\nПоверніться на сайт — кабінет відкриється сам.' : ''}\nТут — ваші бонуси, замовлення, броні й сертифікати 👇`);
    return true;
  }
  return false;
}

// ---------- ⭐ відгук після візиту + ⏰ нагадування (Cron, кожні 5 хв) ----------
export async function reviewQueue(env, ph, sum) { if (!ph) return; const c = await getCli(env, ph); if (!c?.chat) return; await L(env, 'revq', async () => { const q = (await env.DB.get('revq', 'json')) || []; if (q.some(x => x.ph === ph && Date.now() - x.at < 864e5)) return; q.push({ id: crypto.randomUUID().slice(0, 8), ph, at: Date.now() + 3600e3, sum }); await env.DB.put('revq', JSON.stringify(q.slice(-300))); }); }
export async function cron(env) {
  const now = Date.now(), out = [];
  await (await import('./courier.js')).courWatch(env).catch(() => {}); // 🛵 ніхто не взяв доставку
  await autoDay(env).catch(e => console.log('autoZ', e.message)); // 🌙 автоматичний Z за минулий день
  await (await import('./brand.js')).brandBots(env).catch(e => console.log('brand', e.message)); // 🎨 аватари й описи ботів (раз на версію)
  await (await import('./backup.js')).backupDaily(env).catch(e => console.log('backup', e.message)); // 💾 щоночі
  await (await import('./guestbot.js')).gbDaily(env).catch(e => console.log('gbDaily', e.message)); // 🎂 ДН + 👋 «сплячі»
  await (await import('./suppliers.js')).supDaily(env).catch(e => console.log('supDaily', e.message)); // ⏰ оплата постачальникам
  // відгуки
  const due = await L(env, 'revq', async () => { const q = (await env.DB.get('revq', 'json')) || [], d = q.filter(x => x.at <= now); if (d.length) await env.DB.put('revq', JSON.stringify(q.filter(x => x.at > now))); return d; });
  for (const r of due) { await guestMsg(env, r.ph, `🙏 Дякуємо, що завітали у ${(await getSite(env)).name}! Як вам усе сподобалось?`, { inline_keyboard: [[1, 2, 3, 4, 5].map(n => ({ text: '⭐'.repeat(n === 5 ? 1 : 0) + n, callback_data: `rv:${r.id}:${n}` }))] }); await env.DB.put('rvph:' + r.id, r.ph, { expirationTtl: 7 * 86400 }); out.push('rv'); }
  // нагадування про броні
  for (const b of await bookList(env)) {
    if (b.st !== 'ok') continue; const at = Date.parse(`${b.date}T${b.time}:00+03:00`) - (isDST(b.date) ? 0 : 3600e3), left = at - now; // Київ: +03 влітку, +02 взимку
    if (left <= 3600e3 && left > -600e3 && !b.remA) { await notify(env, `⏰ За годину бронь: <b>${b.time}</b> · ${b.people} гост. · ${esc(b.name)} ${fmtPhone(b.phone)}${b.t ? ` · стіл ${b.t}` : ''}${b.pre?.length ? '\n🍽 є передзамовлення' : ''}`, { inline_keyboard: bkButtons(b) }); await bkEdit(env, b.id, y => { y.remA = 1; }); out.push('remA'); }
    if (left <= 2 * 3600e3 && left > 3600e3 && !b.remG) { await guestMsg(env, b.phone, `⏰ Нагадуємо: сьогодні о <b>${b.time}</b> чекаємо вас у ${(await getSite(env)).name} (${b.people} гост.).`, { inline_keyboard: [[{ text: '✅ Будемо', callback_data: `bkg:${b.id}:yes` }, { text: '❌ Скасувати', callback_data: `bkg:${b.id}:no` }]] }); await bkEdit(env, b.id, y => { y.remG = 1; }); out.push('remG'); }
  }
  return out;
}
const isDST = d => { const y = +d.slice(0, 4), last = m => { const x = new Date(Date.UTC(y, m, 31)); x.setUTCDate(31 - x.getUTCDay()); return x.toISOString().slice(0, 10); }; return d >= last(2) && d < last(9); };
// гість натиснув кнопку (відгук / нагадування) — до перевірки персоналу
export async function guestCallback(q, env) {
  const [act, id, v] = (q.data || '').split(':'), chat = q.message?.chat.id, answer = t => gtg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: t || '' });
  const edit = (text, markup) => gtg(env, 'editMessageText', { chat_id: chat, message_id: q.message.message_id, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) });
  if (act === 'rv') {
    const ph = await env.DB.get('rvph:' + id); if (!ph) { await answer('Дякуємо!'); return true; }
    const n = Math.max(1, Math.min(5, +v || 0)), s = await getSite(env), m = dayKey().slice(0, 7);
    await L(env, 'rate:' + m, async () => { const l = (await env.DB.get('rate:' + m, 'json')) || []; l.push({ d: dayKey(), n, ph }); await env.DB.put('rate:' + m, JSON.stringify(l)); });
    await env.DB.delete('rvph:' + id);
    if (n >= 5) await edit(`⭐ Дякуємо за 5! Будемо дуже вдячні за відгук у Google — це допомагає нам рости 🙏`, { inline_keyboard: [[{ text: '✍️ Залишити відгук', url: s.reviewsUrl || s.gmaps }]] });
    else if (n >= 4) await edit('Дякуємо за оцінку! Чекаємо знову 🧡');
    else { await edit('😔 Шкода, що не все сподобалось. Напишіть, будь ласка, що покращити — передамо власнику.'); await env.DB.put('rvtxt:' + q.from.id, ph, { expirationTtl: 86400 }); await notify(env, `⭐ Оцінка ${n}/5 від ${fmtPhone(ph)} — гість може дописати, що не так.`); await (await import('./guestbot.js')).inAdd(env, ph, '', { f: 'g', k: 'rev', text: `⭐ Оцінка ${n}/5 після візиту` }, true); }
    await answer(''); return true;
  }
  if (act === 'bkg') {
    const x = await bkEdit(env, id, y => { if (v === 'no') y.st = 'cancel'; else y.sure = 1; });
    await edit(x ? (v === 'no' ? '↩️ Бронь скасовано. Чекаємо іншим разом!' : '✅ Чудово, чекаємо!') : 'Бронь не знайдено');
    if (x) await notify(env, `${v === 'no' ? '↩️ Гість СКАСУВАВ' : '✅ Гість підтвердив'} бронь ${x.time} · ${esc(x.name)}`);
    await answer(''); return true;
  }
  return false;
}
// текст після низької оцінки
export async function guestText(m, env) {
  const ph = await env.DB.get('rvtxt:' + m.from?.id); if (!ph || !m.text || m.text.startsWith('/')) return false;
  await env.DB.delete('rvtxt:' + m.from.id);
  await notify(env, `📝 Відгук гостя ${fmtPhone(ph)}:\n<i>${esc(m.text.slice(0, 800))}</i>`); await (await import('./guestbot.js')).inAdd(env, ph, '', { f: 'g', k: 'rev', text: '📝 ' + m.text.slice(0, 1500) }, true); await logEvent(env, { k: 'shift', text: `📝 Відгук гостя: ${m.text.slice(0, 200)}` });
  await gtg(env, 'sendMessage', { chat_id: m.chat.id, text: '🙏 Дякуємо! Передали власнику.' }); return true;
}
export async function ratings(env, from, to) { const ms = [...new Set([from.slice(0, 7), to.slice(0, 7)])]; const l = (await Promise.all(ms.map(m => env.DB.get('rate:' + m, 'json')))).flat().filter(x => x && x.d >= from && x.d <= to); return { n: l.length, avg: l.length ? Math.round(l.reduce((a, x) => a + x.n, 0) / l.length * 10) / 10 : 0 }; }

// будь-яке інше повідомлення гостя — коротка довідка
export async function guestHello(m, env) {
  const s = await getSite(env);
  await gtg(env, 'sendMessage', { chat_id: m.chat.id, text: `👋 Це бот гостей <b>${esc(s.name)}</b>.\nТут приходять підтвердження броні, нагадування й бонуси.\n\n🌐 Сайт: https://666blackmuxa666.github.io/VARVAR/about.html\n📞 ${esc(s.phone)}`, parse_mode: 'HTML', disable_web_page_preview: true });
}

// 🌙 минув робочий день: автоматичний Z (якщо увімкнено) або нагадування адміну (якщо Z не закрили)
async function autoDay(env) {
  const o = await import('./ops.js'), c = await o.getCfg(env), prev = o.dayKey(Date.now() - 864e5), flag = 'autoz:' + prev;
  if (await env.DB.get(flag)) return; const d = await env.DB.get('day:' + prev, 'json'); if (!d || !d.tables) { await env.DB.put(flag, '-', { expirationTtl: 3 * 86400 }); return; }
  if ((await env.DB.get('z:' + prev, 'json'))?.length) { await env.DB.put(flag, 'had', { expirationTtl: 3 * 86400 }); return; }
  await env.DB.put(flag, '1', { expirationTtl: 3 * 86400 });
  if (c.autoZ) { const z = await o.dayZ(env, '🌙 авто', !!c.zPrint, prev); if (c.zTg) await notify(env, `🌙 <b>Автоматичний Z-звіт</b>\n${o.zDayText ? o.zDayText(z) : `${prev}: ${z.total} грн · чеків ${z.checks}`}`); }
  else if (c.zRemind) await notify(env, `🌙 День ${prev.slice(8)}.${prev.slice(5, 7)} закінчився, а Z-звіт не закрито. Каса → «🧾 Z-звіт», або увімкніть автоматичний Z у Налаштуваннях.`);
}

// ---------- 💬 «Написати нам» з сайту → стрічка каси + група (як чат бота гостей) ----------
export async function siteMsg(b, ip, env) {
  const s = await getSite(env); if (!s.chat) return [{ error: 'off' }, 403];
  const name = String(b.name || '').trim().slice(0, 40), phone = normPhone(b.phone), text = String(b.text || '').trim().slice(0, 1000);
  if (!name || !phone || text.length < 2) return [{ error: 'fields' }, 400];
  for (const rk of ['smrl:' + String(b.device || ip).slice(0, 64), 'smri:' + String(ip).slice(0, 64)]) { const rn = +(await env.DB.get(rk)) || 0; if (rn >= (rk.startsWith('smri') ? 15 : 5)) return [{ error: 'rate' }, 429]; await env.DB.put(rk, String(rn + 1), { expirationTtl: 3600 }); } /* 🛡 і за пристроєм, і за IP */
  await (await import('./guestbot.js')).chatIn(env, phone, name, '🌐 з сайту: ' + text);
  return [{ ok: 1 }, 200];
}
// ---------- 📊 відвідування сайту: перегляд і натискання (браузер шле раз за сесію на подію) ----------
const HIT = { v: 1, order: 1, call: 1, book: 1, route: 1 };
const HITS = new Map(); // 🛡 у памʼяті: не більше 20 подій за 10 хв з одного IP
export async function siteHit(b, env, ip = '') {
  const e = String(b.e || ''); if (!HIT[e]) return [{ error: 'e' }, 400];
  const now = Date.now(), h = HITS.get(ip) || { n: 0, t: now }; if (now - h.t > 600e3) { h.n = 0; h.t = now; } if (++h.n > 20) return [{ ok: 1 }, 200]; HITS.set(ip, h); if (HITS.size > 5000) HITS.clear();
  const d = dayKey(), k = 'sv:' + d.slice(0, 7);
  await L(env, k, async () => { const m = (await env.DB.get(k, 'json')) || {}; const x = m[d] ||= {}; x[e] = (x[e] || 0) + 1; await env.DB.put(k, JSON.stringify(m)); });
  return [{ ok: 1 }, 200];
}
export async function siteStats(env, from, to) {
  const ms = [...new Set([from.slice(0, 7), to.slice(0, 7)])], all = Object.assign({}, ...(await Promise.all(ms.map(m => env.DB.get('sv:' + m, 'json')))).filter(Boolean)), r = { v: 0, order: 0, call: 0, book: 0, route: 0, days: {} };
  for (const [d, x] of Object.entries(all)) if (d >= from && d <= to) { r.days[d] = x.v || 0; for (const k of Object.keys(HIT)) r[k] += x[k] || 0; }
  return r;
}
