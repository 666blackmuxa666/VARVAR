// 👑 Кабінет власника мережі й консоль платформи: /api/owner (поза закладом) + внутрішні виклики закладів /__int/* (всередині Store).
// Власник бачить лише свої заклади (acct.venues); роль platform — усі. Цифри рахує кожен заклад сам (venueSum) — завжди точні.
import { hub } from './hub.js';
import { MAIN, doName, isVenueId, saveSecrets } from './venue.js';
import { tg } from './ops.js';
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
    await env.DB.put('site', JSON.stringify({ name: String(b.name || 'Новий заклад'), tagline: '', about: '', phone: '', addr: '', from: '10:00', to: '22:00', insta: '', tg: '', gmaps: '', geo: null, rating: 0, ratingN: 0, reviewsUrl: '', quotes: [], promos: [], photos: [], hero: '' }));
    return [{ ok: true, codes }, 200];
  }
  if (path === '/__int/login') { // власник заходить у касу закладу без PIN — сесія адміна «👑 Ім'я»
    const token = rnd(16), me = { name: '👑 ' + String(b.name || 'Власник').slice(0, 40), role: 'admin', owner: String(b.email || '') };
    await env.DB.put('pos:' + token, JSON.stringify({ ...me, at: Date.now() }), { expirationTtl: 12 * 3600 });
    return [{ ok: true, token, me }, 200];
  }
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
    const has = await saveSecrets(env, f);
    if (f.BOT_TOKEN) await fetch(`https://api.telegram.org/bot${f.BOT_TOKEN}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: env.SELF_URL + '/tg', secret_token: env.TG_SECRET, allowed_updates: ['message', 'callback_query', 'my_chat_member'] }) }).catch(() => {});
    if (f.GUEST_BOT_TOKEN) await env.DB.delete('g2hook'); if (f.COURIER_BOT_TOKEN) await env.DB.delete('g3hook'); // вебхуки гостей/кур'єрів поставляться самі з новим env
    const { venueEnv } = await import('./venue.js'), e2 = { ...(await venueEnv(env, env.VENUE, env.DB)), DB: env.DB }; const br = await (await import('./brand.js')).brandVenue(e2).catch(() => null); // 🎨 одразу оформити нових ботів
    if (f.GUEST_BOT_TOKEN) await (await import('./site.js')).botName(e2).catch(() => {}); if (f.COURIER_BOT_TOKEN) await (await import('./courier.js')).courBot?.(e2).catch(() => {});
    return [{ ok: true, has, names, brand: br?.out }, 200];
  }
  if (path === '/__int/ready') { // 🚀 чек-лист запуску закладу
    const { getSecrets } = await import('./venue.js'), sec = env.VENUE === MAIN ? { BOT_TOKEN: env.BOT_TOKEN, GUEST_BOT_TOKEN: env.GUEST_BOT_TOKEN, COURIER_BOT_TOKEN: env.COURIER_BOT_TOKEN, CHAT_ID: env.CHAT_ID } : await getSecrets(env);
    const { getMenu } = await import('./menu.js'), { getSite } = await import('./site.js'), { getGoCfg } = await import('./delivery.js'), { getStaff } = await import('./ops.js');
    const m = await getMenu(env), s = await getSite(env), st = await getStaff(env), pr = await printStatus(env).catch(() => ({})), g = await getGoCfg(env), c = await getCfg(env);
    return [{ name: s.name, logo: !!s.logo, contacts: !!(s.phone && s.addr), items: m.categories.filter(x => !x.tech).reduce((a, x) => a + x.items.length, 0), cats: m.categories.filter(x => !x.tech).length, tables: c.tables || +env.TABLES || 15,
      staff: st.length, bots: { staff: !!sec.BOT_TOKEN, guest: !!sec.GUEST_BOT_TOKEN, courier: !!sec.COURIER_BOT_TOKEN, group: !!sec.CHAT_ID }, printer: pr.seen ? Date.now() - pr.seen < 120e3 ? 1 : 0.5 : 0, printKey: env.VENUE === MAIN ? '' : sec.PRINT_KEY || '', go: g.on ? 1 : 0, site: !!(s.about || s.hero) }, 200];
  }
  if (path === '/__int/brand') { if (env.VENUE === MAIN) return [{ error: 'VARVAR — окреме оформлення' }, 400]; return [await (await import('./brand.js')).brandVenue(env), 200]; }
  if (path === '/__int/sum') { const r = await venueSum(env, b.from, b.to); if (b.pnl) r.pnl = await pnl(env, r).catch(e => ({ error: e.message })); return [r, 200]; }
  if (path === '/__int/codes') return [{ codes: Object.fromEntries(await Promise.all(['admin', 'waiter', 'cook', 'courier'].map(async r => [r, await env.DB.get('reg_' + r)]))) }, 200];
  return [{ error: 'unknown' }, 404];
}
// 📊 цифри закладу за період + «зараз»
async function venueSum(env, from, to) {
  const today = dayKey(); from = isDay(from) ? from : today; to = isDay(to) ? to : from;
  const R = await reportRange(env, from, to) || { checks: [], voids: [], removed: [], exp: [], z: [] };
  const days = {};
  for (const c of R.checks) { const d = days[c.d] ||= { rev: 0, n: 0, cash: 0, card: 0, tip: 0, disc: 0, go: 0, goRev: 0 }; d.rev += c.sum; d.n++; d.cash += c.cash; d.card += c.card; d.tip += c.tip; d.disc += c.disc; if (c.go) { d.go++; d.goRev += c.sum; } }
  const tot = Object.values(days).reduce((a, d) => { for (const k in d) a[k] = (a[k] || 0) + d[k]; return a; }, { rev: 0, n: 0, cash: 0, card: 0, tip: 0, disc: 0, go: 0, goRev: 0 });
  tot.avg = tot.n ? Math.round(tot.rev / tot.n) : 0;
  tot.voids = R.voids.length; tot.voidSum = R.voids.reduce((a, v) => a + (v.sum || 0), 0);
  tot.removed = R.removed.length; tot.removedSum = R.removed.reduce((a, v) => a + (v.sum || 0), 0);
  tot.exp = R.exp.reduce((a, v) => a + (v.sum || 0), 0);
  // зараз
  const open = await openTables(env), att = await getAtt(env, today.slice(0, 7)), onShift = Object.entries(att[today] || {}).filter(([, x]) => x && !x.out && x.ok !== -1).map(([n]) => n);
  const pr = await printStatus(env).catch(() => ({})), gin = await env.DB.get('gin', 'json') || {};
  const now = { tables: open.filter(r => r.t < 1000).length, go: open.filter(r => r.t > 1000).length, openSum: open.reduce((a, r) => a + payable(r.b), 0), onShift, printer: pr.seen && Date.now() - pr.seen < 120e3 ? 1 : 0, printQ: pr.q || 0, inbox: Object.values(gin).filter(x => x.open).length, zToday: R.z.some(z => z.d === today) };
  return { from, to, days, tot, now, name: (await env.DB.get('cfg:venue', 'json'))?.name || '' };
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
  let pay = 0; const months = [...new Set([S.from.slice(0, 7), S.to.slice(0, 7)])];
  for (const m of months) {
    const p = await payroll(env, m).catch(() => null); if (!p) continue;
    const dim = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(), a = S.from > m + '-01' ? +S.from.slice(8) : 1, z = S.to < m + '-' + dim ? +S.to.slice(8) : dim, today = dayKey(), elapsed = today.slice(0, 7) === m ? +today.slice(8) : dim;
    pay += p.fund * Math.max(0, Math.min(z, elapsed) - a + 1) / Math.max(1, elapsed);
  }
  const rev = S.tot.rev || 0, exp = S.tot.exp || 0, profit = rev - cogs - pay - exp, r = x => Math.round(x);
  return { rev, cogs: r(cogs), noCard: r(noCard), fc: rev ? Math.round(cogs / (rev - noCard || 1) * 1000) / 10 : 0, pay: r(pay), payPct: rev ? Math.round(pay / rev * 1000) / 10 : 0, exp: r(exp), profit: r(profit), margin: rev ? Math.round(profit / rev * 1000) / 10 : 0,
    top: Object.values(top).map(t => ({ ...t, cost: r(t.cost), m: r(t.rev - t.cost) })).sort((a, b) => b.m - a.m).slice(0, 10) };
}

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
  if (b.op === 'canBoot') return ok({ boot: !(await H.acctList()).length });
  const me = await H.session(tok); if (!me) return bad('auth', 401);
  const plat = me.role === 'platform', mine = async () => plat ? await H.venueList() : (await Promise.all(me.venues.map(id => H.venueGet(id)))).filter(Boolean);
  const may = async id => plat || me.venues.includes(id);
  switch (b.op) {
    case 'logout': await H.logout(tok); return ok();
    case 'me': return ok({ me, venues: await mine(), seen: await H.seenAll() });
    case 'sum': { // аналітика: кожен заклад рахує сам, паралельно
      const vs = (await mine()).filter(v => v.status !== 'off' && (!b.venues?.length || b.venues.includes(v.id))); // ⛔ вимкнені — не в аналітиці
      const out = await Promise.all(vs.map(async v => ({ ...(await callVenue(env, v.id, '/__int/sum', { from: b.from, to: b.to, pnl: !!b.pnl }).catch(e => ({ error: e.message }))), id: v.id, name: v.name, status: v.status })));
      return ok({ list: out });
    }
    case 'enter': { if (!isVenueId(b.venue) || !(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/login', { name: me.name, email: me.email }); await H.seen(b.venue); return r.token ? ok({ token: r.token, me: r.me, venue: b.venue }) : bad(r.error || 'Не вдалось'); }
    case 'brand': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/brand', {}); return r.error ? bad(r.error) : ok(r); }
    case 'ready': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/ready', {})); }
    case 'codes': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/codes', {})); }
    case 'secrets': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/secrets', b.f || {}); return r.error ? bad(r.error) : ok(r); }
    case 'help': { const text = String(b.text || '').trim().slice(0, 1500); if (text.length < 3) return bad('Опишіть питання');
      await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text: `🆘 <b>Допомога з кабінету</b>\n👤 ${me.name} · ${me.email}\n🏪 ${me.venues.join(', ') || '—'}\n\n${text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}` }).catch(() => {}); return ok(); }
    case 'pass': { const r = await H.acctPass(me.email, b.pass); return r.error ? bad(r.error) : ok(); }
  }
  // ---- консоль платформи ----
  if (!plat) return bad('Лише для платформи', 403);
  switch (b.op) {
    case 'accts': return ok({ list: await H.acctList(), venues: await H.venueList() });
    case 'acctNew': { const a = await H.acctCreate({ email: b.email, name: b.name, pass: b.pass }); return a.error ? bad(a.error) : ok({ acct: a }); }
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
      await env.STORE.get(env.STORE.idFromName(doName(String(b.id)))).wipe().catch(() => {}); return ok(); }
    case 'venueSet': { const v = await H.venueSet(String(b.id), b.f || {}); return v.error ? bad(v.error) : ok({ venue: v }); }
  }
  return bad('unknown');
}
