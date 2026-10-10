// 👑 Кабінет власника мережі й консоль платформи: /api/owner (поза закладом) + внутрішні виклики закладів /__int/* (всередині Store).
// Власник бачить лише свої заклади (acct.venues); роль platform — усі. Цифри рахує кожен заклад сам (venueSum) — завжди точні.
import { hub } from './hub.js';
import { MAIN, doName, isVenueId, saveSecrets } from './venue.js';
import { tg } from './ops.js';
import { mailOn, sendMail, ownerLink } from './mail.js';
import { reportRange, openTables, dayKey, getCfg, payable } from './ops.js';
import { getAtt } from './pay.js';
import { printStatus } from './print.js';

const enc = new TextEncoder();
export async function intSecret(env) { // секрет внутрішніх викликів «кабінет → заклад»
  const k = await crypto.subtle.importKey('raw', enc.encode(env.MASTER_KEY || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode('int')))].map(x => x.toString(16).padStart(2, '0')).join('');
}
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

// виклик закладу зсередини воркера
async function callVenue(env, venue, path, body, init) {
  const h = { 'content-type': 'application/json', 'x-int': await intSecret(env), ...(venue === MAIN ? {} : { 'x-venue': venue }), ...(init ? { 'x-venue-init': '1' } : {}) };
  const r = await env.STORE.get(env.STORE.idFromName(doName(venue))).fetch(new Request('https://in' + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) }));
  return r.json();
}

// 📱 демо ATOM: адмін-сесія без PIN; заклад atom-demo щоночі повертається до еталону (save — зберегти еталон, reset — повернути)
export const demoLogin = (env, id) => callVenue(env, id, '/__int/login', { name: 'Гість демо' });
export const demoSnap = (env, id, op) => callVenue(env, id, '/__int/demosnap', { do: op }).catch(e => ({ error: e.message }));

// ---------- усередині закладу ----------
export async function intApi(req, env, path) {
  if (!env.INSTORE || !env.MASTER_KEY || req.headers.get('x-int') !== await intSecret(env)) return [{ error: 'no' }, 403];
  const b = await req.json().catch(() => ({}));
  if (path === '/__int/init') { // новий заклад: позначка + випадкові коди реєстрації (не 1119!)
    if (await env.DB.get('cfg:venue')) return [{ error: 'Заклад уже створено' }, 400];
    const codes = {}; for (const r of ['admin', 'waiter', 'cook', 'courier']) { let c; do c = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)); while (Object.values(codes).includes(c)); codes[r] = c; await env.DB.put('reg_' + r, c); }
    await env.DB.put('cfg:venue', JSON.stringify({ id: env.VENUE, name: String(b.name || ''), at: Date.now() }));
    await env.DB.put('menu', JSON.stringify({ categories: [] })); // не меню VARVAR за замовчуванням
    await saveSecrets(env, { PRINT_KEY: rnd(16) }); // свій ключ програми друку
    await (await import('./backup.js')).backupNow(env).catch(() => {}); // 💾 перша копія одразу
    await env.DB.put('site', JSON.stringify({ name: String(b.name || 'Новий заклад'), tagline: '', about: '', phone: '', addr: '', from: '10:00', to: '22:00', insta: '', tg: '', gmaps: '', geo: null, rating: 0, ratingN: 0, reviewsUrl: '', quotes: [], promos: [], photos: [], hero: '' }));
    return [{ ok: true, codes }, 200];
  }
  if (path === '/__int/login') { // власник заходить у касу закладу без PIN — сесія адміна «👑 Ім'я»
    const token = rnd(16), me = { name: '👑 ' + String(b.name || 'Власник').slice(0, 40), role: 'admin', owner: String(b.email || '') };
    await env.DB.put('pos:' + token, JSON.stringify({ ...me, at: Date.now() }), { expirationTtl: 12 * 3600 });
    return [{ ok: true, token, me }, 200];
  }
  if (path === '/__int/demosnap' && env.VENUE === 'atom-demo') { const B = await import('./backup.js');
    if (b.do === 'save') return [await B.backupNow(env, 'demo'), 200];
    if (b.do === 'reset') return [await B.backupRestore(env, 'demo', 'нічне скидання демо'), 200];
    return [{ error: 'unknown' }, 400]; }
  if (path === '/__int/whoami') { const s = /^[a-f0-9]{32}$/.test(b.token || '') ? await env.DB.get('pos:' + b.token, 'json') : null; return [{ admin: s?.role === 'admin', name: s?.name || '' }, 200]; }
  if (path === '/__int/secrets') { // 🤖 токени ботів закладу → перевірка getMe, збереження, вебхуки
    if (env.VENUE === MAIN) return [{ error: 'VARVAR — секрети через wrangler' }, 400];
    const f = {}, names = {};
    for (const [k, nm] of [['BOT_TOKEN', 'staff'], ['GUEST_BOT_TOKEN', 'guest'], ['COURIER_BOT_TOKEN', 'courier']]) {
      const v = b[k]; if (v == null) continue; if (v === '') { f[k] = ''; continue; }
      if (!/^\d{6,12}:[\w-]{30,60}$/.test(String(v).trim())) return [{ error: `Токен ${nm}: невірний формат` }, 400];
      const me = await fetch(`https://api.telegram.org/bot${String(v).trim()}/getMe`).then(r => r.json()).catch(() => null);
      if (!me?.ok) return [{ error: `Токен ${nm}: Telegram не приймає` }, 400]; f[k] = String(v).trim(); names[nm] = me.result.username;
    }
    if (b.CHAT_ID != null) f.CHAT_ID = String(b.CHAT_ID);
    if (b.LIQPAY_PUBLIC != null || b.LIQPAY_PRIVATE != null) { // 💳 ключі LiqPay закладу: перевіряємо запитом статусу (неіснуючий order_id → відповідь з підписом прийнята)
      const pub = String(b.LIQPAY_PUBLIC || '').trim(), priv = String(b.LIQPAY_PRIVATE || '').trim();
      if (!/^(sandbox_)?i\d{6,20}$/.test(pub) || !/^(sandbox_)?[\w]{20,80}$/.test(priv)) return [{ error: 'Ключі LiqPay: невірний формат (public_key починається з i… або sandbox_i…)' }, 400];
      const r = await (await import('./liqpay.js')).lpApi({ pub, priv }, { action: 'status', order_id: 'check-' + Date.now() }).catch(() => null);
      if (r?.err_code === 'invalid_signature' || /public_key/i.test(r?.err_description || '')) return [{ error: 'LiqPay не приймає ці ключі' }, 400];
      f.LIQPAY_PUBLIC = pub; f.LIQPAY_PRIVATE = priv; }
    const has = await saveSecrets(env, f);
    if (f.BOT_TOKEN) await fetch(`https://api.telegram.org/bot${f.BOT_TOKEN}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: env.SELF_URL + '/tg', secret_token: env.TG_SECRET, allowed_updates: ['message', 'callback_query', 'my_chat_member'] }) }).catch(() => {});
    if (f.GUEST_BOT_TOKEN) await env.DB.delete('g2hook'); if (f.COURIER_BOT_TOKEN) await env.DB.delete('g3hook'); // вебхуки гостей/кур'єрів поставляться самі з новим env
    const { venueEnv } = await import('./venue.js'), e2 = { ...(await venueEnv(env, env.VENUE, env.DB)), DB: env.DB }; const br = await (await import('./brand.js')).brandVenue(e2).catch(() => null); // 🎨 одразу оформити нових ботів
    if (f.GUEST_BOT_TOKEN) await (await import('./site.js')).botName(e2).catch(() => {}); if (f.COURIER_BOT_TOKEN) await (await import('./courier.js')).courBot?.(e2).catch(() => {});
    return [{ ok: true, has, names, brand: br?.out }, 200];
  }
  if (path === '/__int/bots') { /* 🤖 справжній стан ботів: питаємо сам Telegram (getMe, getWebhookInfo, getChat) */
    const { getSecrets } = await import('./venue.js'), sec = env.VENUE === MAIN ? env : { ...env, ...(await getSecrets(env)) };
    const call = async (tok, m, q = {}) => { if (!tok) return null; try { const r = await fetch(`https://api.telegram.org/bot${tok}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q), signal: AbortSignal.timeout(6000) }); return await r.json(); } catch (e) { return { ok: false, description: e.message }; } };
    const one = async tok => { if (!tok) return { on: 0 }; const [me, wh] = await Promise.all([call(tok, 'getMe'), call(tok, 'getWebhookInfo')]); if (!me?.ok) return { on: 1, ok: 0, err: me?.description || 'не відповідає' };
      const w = wh?.result || {}; return { on: 1, ok: 1, user: me.result.username, name: me.result.first_name, hook: !!w.url, pending: w.pending_update_count || 0, lastErr: w.last_error_date && Date.now() / 1000 - w.last_error_date < 86400 ? w.last_error_message : '' }; };
    const [staff, guest, courier] = await Promise.all([one(sec.BOT_TOKEN), one(sec.GUEST_BOT_TOKEN), one(sec.COURIER_BOT_TOKEN)]);
    let group = { on: sec.CHAT_ID ? 1 : 0 };
    if (sec.CHAT_ID && sec.BOT_TOKEN) { const g = await call(sec.BOT_TOKEN, 'getChat', { chat_id: sec.CHAT_ID }); group = g?.ok ? { on: 1, ok: 1, title: g.result.title || g.result.first_name || '' } : { on: 1, ok: 0, err: g?.description || 'бот не бачить групу' }; }
    if (b.test && sec.CHAT_ID && sec.BOT_TOKEN) { const t = await call(sec.BOT_TOKEN, 'sendMessage', { chat_id: sec.CHAT_ID, text: '✅ Тест з кабінету власника — бот персоналу пише в цю групу.' }); return [{ sent: !!t?.ok, err: t?.ok ? '' : t?.description }, 200]; }
    return [{ staff, guest, courier, group }, 200];
  }
  if (path === '/__int/ready') { // 🚀 чек-лист запуску закладу
    const { getSecrets } = await import('./venue.js'), sec = env.VENUE === MAIN ? { BOT_TOKEN: env.BOT_TOKEN, GUEST_BOT_TOKEN: env.GUEST_BOT_TOKEN, COURIER_BOT_TOKEN: env.COURIER_BOT_TOKEN, CHAT_ID: env.CHAT_ID } : await getSecrets(env);
    const { getMenu } = await import('./menu.js'), { getSite } = await import('./site.js'), { getGoCfg } = await import('./delivery.js'), { getStaff } = await import('./ops.js');
    const m = await getMenu(env), s = await getSite(env), st = await getStaff(env), pr = await printStatus(env).catch(() => ({})), g = await getGoCfg(env), c = await getCfg(env);
    return [{ name: s.name, logo: !!s.logo, contacts: !!(s.phone && s.addr), items: m.categories.filter(x => !x.tech).reduce((a, x) => a + x.items.length, 0), cats: m.categories.filter(x => !x.tech).length, tables: c.tables || +env.TABLES || 15,
      staff: st.length, bots: { staff: !!sec.BOT_TOKEN, guest: !!sec.GUEST_BOT_TOKEN, courier: !!sec.COURIER_BOT_TOKEN, group: !!sec.CHAT_ID }, printer: pr.seen ? Date.now() - pr.seen < 120e3 ? 1 : 0.5 : 0, printKey: env.VENUE === MAIN ? '' : sec.PRINT_KEY || '', go: g.on ? 1 : 0, site: !!(s.about || s.hero) }, 200];
  }
  if (path === '/__int/brand') { if (env.VENUE === MAIN) return [{ error: 'VARVAR — окреме оформлення' }, 400]; return [await (await import('./brand.js')).brandVenue(env), 200]; }
  if (path === '/__int/bak') { const B = await import('./backup.js'); // 💾
    if (b.do === 'list') return [{ list: await B.backupList(env) }, 200];
    if (b.do === 'now') return [await B.backupNow(env, 'вручну-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')), 200];
    if (b.do === 'get') { const t = await B.backupGet(env, String(b.tag)); return t ? [{ data: t }, 200] : [{ error: 'Не знайдено' }, 404]; }
    if (b.do === 'restore') return [await B.backupRestore(env, String(b.tag), String(b.who || '')), 200];
    return [{ error: 'unknown' }, 400]; }
  if (path === '/__int/sum') { const r = await venueSum(env, b.from, b.to); if (b.pnl) r.pnl = await pnl(env, r).catch(e => ({ error: e.message })); return [r, 200]; }
  if (path === '/__int/codes') return [{ codes: Object.fromEntries(await Promise.all(['admin', 'waiter', 'cook', 'courier'].map(async r => [r, await env.DB.get('reg_' + r)]))) }, 200];
  return [{ error: 'unknown' }, 404];
}
// 📊 цифри закладу за період + «зараз»
async function venueSum(env, from, to) {
  const today = dayKey(); from = isDay(from) ? from : today; to = isDay(to) ? to : from;
  const R = await reportRange(env, from, to) || { checks: [], voids: [], removed: [], exp: [], z: [] };
  const days = {};
  for (const c of R.checks) { const d = days[c.d] ||= { rev: 0, n: 0, cash: 0, card: 0, onl: 0, tip: 0, disc: 0, go: 0, goRev: 0 }; d.rev += c.sum; d.n++; d.cash += c.cash; d.card += c.card; d.onl += c.onl || 0; d.tip += c.tip; d.disc += c.disc; if (c.go) { d.go++; d.goRev += c.sum; } }
  const tot = Object.values(days).reduce((a, d) => { for (const k in d) a[k] = (a[k] || 0) + d[k]; return a; }, { rev: 0, n: 0, cash: 0, card: 0, onl: 0, tip: 0, disc: 0, go: 0, goRev: 0 });
  tot.avg = tot.n ? Math.round(tot.rev / tot.n) : 0;
  tot.voids = R.voids.length; tot.voidSum = R.voids.reduce((a, v) => a + (v.sum || 0), 0);
  tot.removed = R.removed.length; tot.removedSum = R.removed.reduce((a, v) => a + (v.sum || 0), 0);
  tot.exp = R.exp.reduce((a, v) => a + (v.sum || 0), 0);
  { const T = await import('./tasks.js'); tot.plan = { n: 0, ok: 0 }; for (let d = from, i = 0; d <= to && i < 62; d = new Date(Date.parse(d + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10), i++) { const x = await T.taskSum(env, d); tot.plan.n += x.n; tot.plan.ok += x.ok; } } // 📋 виконання плану
  // зараз
  const open = await openTables(env), att = await getAtt(env, today.slice(0, 7)), onShift = Object.entries(att[today] || {}).filter(([, x]) => x && !x.out && x.ok !== -1).map(([n]) => n);
  const pr = await printStatus(env).catch(() => ({})), gin = await env.DB.get('gin', 'json') || {};
  const supD = Object.values((await env.DB.get('sups', 'json')) || {}).reduce((a, x) => a + (x.debt || 0), 0); /* 🏭 борг постачальникам */
  const now = { supDebt: Math.round(supD), tables: open.filter(r => r.t < 1000).length, go: open.filter(r => r.t > 1000).length, openSum: open.reduce((a, r) => a + payable(r.b), 0), onShift, printer: pr.seen && Date.now() - pr.seen < 120e3 ? 1 : 0, printQ: pr.q || 0, inbox: Object.values(gin).filter(x => x.open).length, zToday: R.z.some(z => z.d === today) };
  return { from, to, days, tot, now, risk: risks(R), name: (await env.DB.get('cfg:venue', 'json'))?.name || '' };
}
// 🚨 тривоги про втрати й крадіжки за період — згруповано «хто, скільки, на яку суму»
function risks(R) {
  const out = [], by = (l, key) => Object.entries(l.reduce((a, x) => { const k = key(x) || '—'; (a[k] ||= { n: 0, sum: 0 }); a[k].n++; a[k].sum += Math.abs(x.sum || 0); return a; }, {})).sort((a, b) => b[1].sum - a[1].sum);
  const fmt = l => l.slice(0, 4).map(([w, x]) => `${w}: ${x.n} на ${Math.round(x.sum)} ₴`).join(' · ');
  const cooked = R.voids.filter(v => v.w && !v.table); if (cooked.length) out.push({ lvl: 'red', k: 'cooked', text: `🍳 Прибрано вже приготовані страви — ${fmt(by(cooked, v => v.by))}` });
  const tbl = R.voids.filter(v => v.table); if (tbl.length) out.push({ lvl: 'red', k: 'table', text: `🗑 Видалено цілі столи — ${fmt(by(tbl, v => v.by))}` });
  const rm = R.removed.filter(x => !x.reopen), ro = R.removed.filter(x => x.reopen);
  if (rm.length) out.push({ lvl: 'red', k: 'removed', text: `🧾 Видалено закриті чеки — ${fmt(by(rm, x => x.by))}` });
  if (ro.length) out.push({ lvl: '', k: 'reopen', text: `↩️ Перевідкрито закриті чеки — ${fmt(by(ro, x => x.by))}` });
  const big = R.checks.filter(c => c.pct >= 50 || (c.disc && c.sum && c.disc >= c.sum)); if (big.length) out.push({ lvl: 'red', k: 'disc', text: `% Знижки 50% і більше — ${fmt(by(big.map(c => ({ ...c, sum: c.disc })), c => c.w))}` });
  const minus = (R.mov || []).filter(m => m.type === 'adjc' && m.sum < 0); if (minus.length) out.push({ lvl: 'red', k: 'cash', text: `💵 Нестача готівки при звірці — ${fmt(by(minus, m => m.by))}` });
  const many = by(R.voids.filter(v => !v.w && !v.table), v => v.by).filter(([, x]) => x.n >= 5); if (many.length) out.push({ lvl: '', k: 'voids', text: `✏️ Часто прибирають позиції з рахунку — ${fmt(many)}` });
  return out;
}

// 💰 P&L: виручка − собівартість (техкарти) − зарплата (≈ пропорційно дням) − витрати з каси = прибуток
async function pnl(env, S) {
  const { getMenu } = await import('./menu.js'), st = await import('./stock.js'), { payroll } = await import('./pay.js');
  const R = await reportRange(env, S.from, S.to), [menu, cards, ing] = await Promise.all([getMenu(env), st.getCards(env), st.getIng(env)]);
  const res = st.cardResolver(menu), im = new Map(ing.map(x => [x.id, x])), memo = new Map();
  let cogs = 0, noCard = 0; const top = {};
  for (const c of R.checks) for (const [n, q, sum] of c.dishes || []) {
    if (!memo.has(n)) { const f = st.cardFor(cards, res(n)); memo.set(n, f ? st.cardCost(f.card, im, cards) * f.k : null); }
    const u = memo.get(n); if (u == null || !(u > 0)) { noCard += sum || 0; continue; }
    cogs += u * q; const t = top[n] ||= { n, q: 0, rev: 0, cost: 0 }; t.q += q; t.rev += sum || 0; t.cost += u * q;
  }
  // зарплата: фонд місяця × частка днів періоду
  let pay = 0; const months = []; for (let d = new Date(S.from.slice(0, 7) + '-15'); d.toISOString().slice(0, 7) <= S.to.slice(0, 7) && months.length < 24; d.setMonth(d.getMonth() + 1)) months.push(d.toISOString().slice(0, 7)); // усі місяці періоду
  for (const m of months) {
    const p = await payroll(env, m).catch(() => null); if (!p) continue;
    const dim = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(), a = S.from > m + '-01' ? +S.from.slice(8) : 1, z = S.to < m + '-' + dim ? +S.to.slice(8) : dim, today = dayKey(), elapsed = today.slice(0, 7) === m ? +today.slice(8) : dim;
    pay += p.fund * Math.max(0, Math.min(z, elapsed) - a + 1) / Math.max(1, elapsed);
  }
  const rev = S.tot.rev || 0, exp = S.tot.exp || 0, profit = rev - cogs - pay - exp, r = x => Math.round(x);
  return { rev, cogs: r(cogs), noCard: r(noCard), fc: rev ? Math.round(cogs / (rev - noCard || 1) * 1000) / 10 : 0, pay: r(pay), payPct: rev ? Math.round(pay / rev * 1000) / 10 : 0, exp: r(exp), profit: r(profit), margin: rev ? Math.round(profit / rev * 1000) / 10 : 0,
    top: Object.values(top).map(t => ({ ...t, cost: r(t.cost), m: r(t.rev - t.cost) })).sort((a, b) => b.m - a.m).slice(0, 10) };
}

const sendVerify = (env, x) => sendMail(env, x.email, 'Підтвердіть пошту — кабінет власника', 'Вітаємо в кабінеті власника', `${x.name}, для вас створено кабінет власника закладу. Підтвердіть пошту й задайте свій пароль. Посилання діє 7 днів.`, '✅ Підтвердити й задати пароль', ownerLink('verify', x.t));

// ---------- /api/owner (поза закладом) ----------
export async function ownerApi(req, env) {
  if (!env.HUB) return [{ error: 'HUB не підключено' }, 500];
  const b = await req.json().catch(() => ({})), H = hub(env), tok = (req.headers.get('authorization') || '').slice(7);
  const ok = (x = {}) => [{ ok: true, ...x }, 200], bad = (e, s = 400) => [{ error: e }, s];
  if (b.op === 'login') { const r = await H.login(b.email, b.pass); return r.error ? bad(r.error, 401) : ok(r); }
  if (b.op === 'bootstrap') { // 1-й акаунт платформи — лише коли акаунтів ще немає І є чинна сесія адміна каси VARVAR
    if ((await H.acctList()).length) return bad('Акаунт платформи вже створено — увійдіть');
    const s = /^[a-f0-9]{32}$/.test(b.pos || '') ? await callVenue(env, MAIN, '/__int/whoami', { token: b.pos }) : null;
    if (!s?.admin) return bad('Відкрийте кабінет з каси VARVAR (Налаштування → 👑 Кабінет власника)', 403);
    const a = await H.acctCreate({ email: b.email, name: b.name || s.name, pass: b.pass, role: 'platform' }); if (a.error) return bad(a.error);
    await H.venueCreate({ id: MAIN, name: 'Varvar Food Bar', owner: a.email, status: 'active', city: 'Буковель' });
    return ok(await H.login(b.email, b.pass));
  }
  if (b.op === 'forgot') { // 🔑 завжди «ok» — не підказуємо, чи є такий email
    const x = await H.mailToken(b.email, 'reset'); if (x?.error) return bad(x.error);
    if (x) { const r = await sendMail(env, x.email, 'Відновлення пароля', 'Новий пароль', `${x.name}, натисніть кнопку, щоб задати новий пароль до кабінету власника. Посилання діє 1 годину.`, '🔑 Задати пароль', ownerLink('reset', x.t)); if (r.error) return bad(r.error); }
    return ok({ mail: mailOn(env) });
  }
  if (b.op === 'reset' || b.op === 'verify') { const r = await H.useToken(b.t, b.op, b.pass ?? null); return r.error ? bad(r.error) : ok(r); }
  if (b.op === 'resend') { const x = await H.mailToken(b.email, 'verify'); if (x?.error) return bad(x.error); if (x && (await H.acctGet(x.email))?.unverified) await sendVerify(env, x); return ok(); }
  if (b.op === 'canBoot') return ok({ boot: !(await H.acctList()).length });
  const me = await H.session(tok); if (!me) return bad('auth', 401);
  const plat = me.role === 'platform', mine = async () => plat ? await H.venueList() : (await Promise.all(me.venues.map(id => H.venueGet(id)))).filter(Boolean);
  const may = async id => plat || me.venues.includes(id);
  switch (b.op) {
    case 'logout': await H.logout(tok); return ok();
    case 'me': return ok({ me, venues: await mine(), seen: await H.seenAll(), inbox: (await H.msgList(plat ? null : me.venues)).filter(m => !m.done).length });
    case 'sum': { // аналітика: кожен заклад рахує сам, паралельно
      const vs = (await mine()).filter(v => v.status !== 'off' && v.id !== 'atom-demo' && (!b.venues?.length || b.venues.includes(v.id))); // ⛔ вимкнені — не в аналітиці
      const out = await Promise.all(vs.map(async v => ({ ...(await callVenue(env, v.id, '/__int/sum', { from: b.from, to: b.to, pnl: !!b.pnl }).catch(e => ({ error: e.message }))), id: v.id, name: v.name, status: v.status })));
      return ok({ list: out });
    }
    case 'enter': { if (!isVenueId(b.venue) || !(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/login', { name: me.name, email: me.email }); await H.seen(b.venue); return r.token ? ok({ token: r.token, me: r.me, venue: b.venue }) : bad(r.error || 'Не вдалось'); }
    case 'brand': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/brand', {}); return r.error ? bad(r.error) : ok(r); }
    case 'bots': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/bots', { test: !!b.test })); }
    case 'ready': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/ready', {})); }
    case 'codes': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/codes', {})); }
    case 'secrets': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/secrets', b.f || {}); return r.error ? bad(r.error) : ok(r); }
    case 'help': { const text = String(b.text || '').trim().slice(0, 1500); if (text.length < 3) return bad('Опишіть питання');
      await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text: `🆘 <b>Допомога з кабінету</b>\n👤 ${me.name} · ${me.email}\n🏪 ${me.venues.join(', ') || '—'}\n\n${text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}` }).catch(() => {});
      await H.msgAdd({ kind: 'help', venue: me.venues[0] || '', vname: '👑 кабінет', by: me.name + ' · ' + me.email, role: me.role, text }); return ok(); }
    case 'inbox': return ok({ list: await H.msgList(plat ? null : me.venues) });
    case 'inboxSet': { const r = await H.msgSet(String(b.id), { del: !!b.del }, plat ? null : me.venues); return r.error ? bad(r.error) : ok(); }
    case 'ask': { // 🧠 «Запитай у даних»: цифри закладів за цей і минулий місяць → ШІ відповідає лише з них
      const q = String(b.q || '').trim().slice(0, 500); if (q.length < 3) return bad('Напишіть питання');
      const t = new Date(), m0 = t.toLocaleDateString('sv-SE').slice(0, 7), pm = new Date(t.getFullYear(), t.getMonth(), 0).toLocaleDateString('sv-SE'), from = pm.slice(0, 7) + '-01', to = t.toLocaleDateString('sv-SE');
      const vs = (await mine()).filter(v => v.status !== 'off'), data = await Promise.all(vs.map(async v => { const r = await callVenue(env, v.id, '/__int/sum', { from, to, pnl: true }).catch(() => null); return r && { заклад: v.name, дні: r.days, разом: r.tot, прибуток: r.pnl && { собівартість: r.pnl.cogs, зарплата: r.pnl.pay, витрати: r.pnl.exp, прибуток: r.pnl.profit, топ_страв: r.pnl.top }, ризики: (r.risk || []).map(x => x.text) }; }));
      const prompt = `Ти — фінансовий аналітик мережі закладів харчування. Сьогодні ${to}. Дані (дні у форматі РРРР-ММ-ДД, суми в гривнях; rev — виручка, n — чеки, tip — чайові, disc — знижки, go/goRev — доставки/з собою, exp — витрати з каси) за період ${from} — ${to}:
${JSON.stringify(data.filter(Boolean))}

Питання власника: «${q}»

Відповідай українською, коротко (до 8 речень), з конкретними цифрами лише з цих даних. Якщо даних не вистачає — так і скажи й порадь, що заповнити (техкарти, витрати тощо).`;
      try { const r = await (await import('./ai.js')).aiAnswer(env, prompt); return ok({ answer: String(r.answer || '').slice(0, 3000) }); } catch (e) { return bad('ШІ зараз недоступний, спробуйте за хвилину'); } }
    case 'bak': { // 💾 бекапи: список / зробити зараз / завантажити — власник; відновити — лише платформа
      if (!(await may(b.venue))) return bad('Немає доступу', 403); const op = String(b.do || 'list');
      if (op === 'restore' && (!plat || b.confirm !== b.venue)) return bad(plat ? 'Для підтвердження введіть адресу закладу' : 'Відновлення — лише через розробника (🆘 Допомога)', 403);
      const r = await callVenue(env, b.venue, '/__int/bak', { do: op, tag: b.tag, who: me.name }); return r.error ? bad(r.error) : ok(r); }
    case 'pass': { const r = await H.acctPass(me.email, b.pass); return r.error ? bad(r.error) : ok(); }
  }
  // ---- консоль платформи ----
  if (!plat) return bad('Лише для платформи', 403);
  switch (b.op) {
    case 'accts': return ok({ list: await H.acctList(), venues: await H.venueList() });
    case 'acctNew': { // з поштою: власник сам підтверджує email і задає пароль за посиланням з листа
      const m = mailOn(env), pass = String(b.pass || '').trim() || (m ? rnd(16) : '');
      const a = await H.acctCreate({ email: b.email, name: b.name, pass, verify: m }); if (a.error) return bad(a.error);
      if (m) { const x = await H.mailToken(a.email, 'verify'); const r = x && await sendVerify(env, x); if (r?.error) return ok({ acct: a, warn: r.error }); }
      return ok({ acct: a, mailed: m });
    }
    case 'acctResend': { const x = await H.mailToken(b.email, 'verify'); if (!x) return bad('Немає акаунта'); if (x.error) return bad(x.error); const r = await sendVerify(env, x); return r.error ? bad(r.error) : ok(); }
    case 'acctPass': { const r = await H.acctPass(b.email, b.pass); return r.error ? bad(r.error) : ok(); }
    case 'venueNew': {
      const v = await H.venueCreate({ id: b.id, name: b.name, owner: b.owner, city: b.city }); if (v.error) return bad(v.error);
      const r = await callVenue(env, v.id, '/__int/init', { name: v.name }, true); if (r.error) return bad(r.error);
      return ok({ venue: v, codes: r.codes });
    }
    case 'acctSet': { const a = await H.acctSet(b.email, b.f || {}); return a.error ? bad(a.error) : ok({ acct: a }); }
    case 'acctDel': { const r = await H.acctDel(b.email); return r.error ? bad(r.error) : ok(); }
    case 'grant': { const r = await H.grant(String(b.venue), b.email, !!b.on); return r.error ? bad(r.error) : ok({ acct: r }); }
    case 'venueDel': { // 🗑 назавжди: запис у HUB + усі дані закладу (підтвердження — точна адреса закладу)
      if (b.confirm !== b.id) return bad('Для підтвердження введіть адресу закладу'); const r = await H.venueDel(String(b.id)); if (r.error) return bad(r.error);
      await env.STORE.get(env.STORE.idFromName(doName(String(b.id)))).wipe().catch(() => {});
      if (env.DB.kv) { const l = await env.DB.kv.list({ prefix: 'bak:' + String(b.id) + ':' }); for (const x of l.keys) await env.DB.kv.delete(x.name); } // 💾 бекапи теж — щоб новий заклад з тією ж адресою їх не побачив
      return ok(); }
    case 'leads': { const days = Math.min(90, +b.days || 30); return ok({ list: await H.leadList(), hits: await H.hitStats(days), demo: !!(await H.venueGet('atom-demo')) }); } // 🚀 CRM «Продажі»
    case 'leadNew': { const r = await H.leadAdd({ ...b, src: 'вручну' }, 'own:' + Date.now()); return r.error ? bad(r.error) : ok({ lead: r }); }
    case 'leadSet': { const r = await H.leadSet(String(b.id), b.f || {}); return r.error ? bad(r.error) : ok({ lead: r }); }
    case 'demo': { // 📱 демо-каса: створити (власник — платформа) / зберегти поточний стан як еталон для нічного скидання
      if (b.do === 'create') { if (await H.venueGet('atom-demo')) return bad('Демо вже є'); const v = await H.venueCreate({ id: 'atom-demo', name: 'ATOM Демо-кавʼярня', owner: me.email, city: 'Демо' }); if (v.error) return bad(v.error); const r = await callVenue(env, v.id, '/__int/init', { name: v.name }, true); return r.error ? bad(r.error) : ok(); }
      if (b.do === 'save') { const r = await demoSnap(env, 'atom-demo', 'save'); return r.error ? bad(r.error) : ok(r); }
      return bad('unknown'); }
    case 'venueSet': { const v = await H.venueSet(String(b.id), b.f || {}); return v.error ? bad(v.error) : ok({ venue: v }); }
  }
  return bad('unknown');
}
