import { aiHelp } from './ai.js';
import { tn } from './tn.js';
import { goOrder, goInfo, reco } from './delivery.js';
// VARVAR — Cloudflare Worker: прийом замовлень, перевірка Wi‑Fi закладу, Telegram.
// Secrets: BOT_TOKEN, CHAT_ID, ADMIN_PIN, TG_SECRET   Vars: ALLOWED_ORIGIN, TABLES, SELF_URL   KV: DB
import { getMenu, priceMap } from './menu.js';
import { handleUpdate } from './bot.js';
import { KITCHEN_HTML } from './kitchen.js';
import { tg, esc, getBill, putBill, addStat, addDishes, hhmm, logEvent, billItems, payable, addKitchen, getCfg } from './ops.js';
import { posApi, posLive } from './pos.js';
import { queuePrint, kitchenTicket, printApi } from './print.js';
export { PrintQ } from './print.js';
export { Store } from './store.js';
import { storeDB } from './store.js';

const TYPES = { order: 'НОВЕ ЗАМОВЛЕННЯ', order_check: 'НОВЕ ЗАМОВЛЕННЯ', reorder: 'ДОЗАМОВЛЕННЯ', check: 'ПРОСЯТЬ ЧЕК' };
const MAX_ORDER = 30000, RATE_MS = 15000, BILL_TTL = 12 * 3600;

// 💸 запити, що працюють з базою, виконуються всередині Durable Object (store.js → Store.fetch):
// там кожне читання/запис — локальне, а платний «запит до DO» — один на дію, а не 20–50
const IN_STORE = /^\/(api\/(status|scan|menu|orders|pos|call|order|admin|ai|go|goinfo|reco)$|tg$)/;
export default {
  async fetch(req, env) {
    const p = new URL(req.url).pathname;
    if (IN_STORE.test(p) && req.method !== 'OPTIONS') return env.STORE.get(env.STORE.idFromName('main')).fetch(req);
    return handle(req, { ...env, DB: storeDB(env.DB, env.STORE) });
  },
};
export async function handle(req, env) {
  {
    const url = new URL(req.url), cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json' } });
    const ip = req.headers.get('CF-Connecting-IP') || '';
    try {
      if (url.pathname === '/kitchen' || url.pathname === '/k') return new Response(KITCHEN_HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' } }); // 👨‍🍳 старий iPad: http, без https
      if (url.pathname === '/api/status') {
        const table = tableNum(url.searchParams.get('table'), env);
        const bill = table ? await getBill(env, table) : null;
        // bill — актуальний рахунок (з урахуванням змін офіціанта: прибрані позиції, знижка, перенос)
        const si = await scanInfo(env, url.searchParams.get('device')), sc = si?.until || 0;
        return json({ inVenue: sc > Date.now() || await inVenue(env, ip), scanUntil: sc, scanT: sc > Date.now() ? si.t || 0 : 0, tableTotal: bill ? payable(bill) : undefined,
          bill: bill && bill.total ? { items: billItems(bill).map(x => [x.name, x.q, x.sum]), gross: bill.total, disc: bill.disc || 0, pay: payable(bill), tip: bill.tip || 0, ktip: bill.ktip || 0 } : null });
      }
      if (url.pathname === '/api/scan' && req.method === 'POST') { // QR на столі → 1 година на замовлення
        const b = await req.json(); const dev = String(b.device || '').slice(0, 64);
        // QR столу: ?k=<ключ столу>&t=N — стіл закріплений; загальний QR (без столу) — стіл обирає гість
        const t = tableNum(b.t, env), k = String(b.k || '');
        const ok = t ? k === await tableKey(env, t) : k === await qrKey(env);
        if (!dev || !ok) return json({ error: 'bad_qr' }, 403);
        const ms = (await getCfg(env)).scanMin * 60e3, until = Date.now() + ms; await env.DB.put('scan:' + dev, JSON.stringify({ until, t: t || 0 }), { expirationTtl: ms / 1000 + 60 });
        return json({ ok: true, until, t: t || 0 });
      }
      if (url.pathname === '/api/ai' && req.method === 'POST') return json(...await aiHelp(await req.json(), env));
      if (url.pathname === '/api/menu') return new Response(JSON.stringify(await getMenu(env)), { headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-cache' } });
      if (url.pathname.startsWith('/img/')) {
        const b = await env.DB.get('img:' + url.pathname.slice(5), 'arrayBuffer');
        if (b) return new Response(b, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000' } });
        return proxySite(url); // статичні картинки сайту (для каси через запасну адресу)
      }
      if (url.pathname.startsWith('/api/print/')) return printApi(req, env, url);
      // програма друку і логотип через простий HTTP (Windows 7 не вміє TLS 1.2)
      const pf = url.pathname.match(/^\/print\/(agent\.ps1|[a-z0-9-]+\.png)$/);
      if (pf) {
        const r = await fetch('https://666blackmuxa666.github.io/VARVAR/printer/' + (pf[1] === 'agent.ps1' ? 'varvar-print.ps1' : pf[1]), { cf: { cacheTtl: 30 } });
        if (!r.ok) return new Response('not found', { status: 404 });
        return new Response(r.body, { headers: { 'content-type': url.pathname.endsWith('.png') ? 'image/png' : 'application/octet-stream' } });
      }
      if (url.pathname === '/api/orders') { // статуси замовлень гостя: ?ids=a,b
        const ids = (url.searchParams.get('ids') || '').split(',').filter(x => /^[a-z0-9]{6,12}$/.test(x)).slice(0, 20);
        const out = {}, all = ids.length ? await env.DB.getMany(ids.map(id => 'ord:' + id), 'json') : []; // один запит замість N
        ids.forEach((id, i) => { const o = all[i]; out[id] = o && { s: o.s, t: o.t, by: o.by, at: o.at, ...(o.go ? { g: o.g || o.s, no: tn(o.t), eta: o.eta, gAt: o.gAt } : {}) }; });
        return json(out);
      }
      if (url.pathname === '/api/pos/live') return posLive(req, env, url);
      if (url.pathname === '/api/pos' && req.method === 'POST') return json(...await posApi(await req.json(), req, env));
      // 🛵 замовлення за посиланням (самовивіз / доставка)
      if (url.pathname === '/api/go' && req.method === 'POST') return json(...await goOrder(await req.json(), ip, env));
      if (url.pathname === '/api/goinfo') return json(await goInfo(env, url.searchParams.get('ph')));
      if (url.pathname === '/api/reco') return json(await reco(env));
      if (url.pathname === '/go') return Response.redirect((env.SITE_URL || 'https://666blackmuxa666.github.io/VARVAR/') + '?go' + (url.search ? '&' + url.search.slice(1) : ''), 302);
      if (url.pathname === '/api/call' && req.method === 'POST') return json(...await callWaiter(await req.json(), ip, env));
      if (url.pathname === '/api/order' && req.method === 'POST') return json(...await order(await req.json(), ip, env));
      if (url.pathname === '/api/admin' && req.method === 'POST') return json(...await admin(await req.json(), ip, env));
      if (url.pathname === '/tg' && req.method === 'POST') {
        if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TG_SECRET) return new Response('no', { status: 403 });
        await handleUpdate(await req.json(), env);
        return new Response('ok');
      }
      // запасна адреса каси для старих Windows 7 без нових сертифікатів: http://varvar-menu.varvar.workers.dev/pos.html
      if (req.method === 'GET' && /^\/(pos\.html|pos\.webmanifest|css\/|js\/|printer\/logo\.png)/.test(url.pathname)) return proxySite(url);
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: 'bad_request' }, 400);
    }
  }
}

function corsHeaders(req, env) {
  const o = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim());
  return { 'Access-Control-Allow-Origin': allowed.includes(o) ? o : allowed[0] || '', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization', Vary: 'Origin' };
}
const tableNum = (v, env) => { const n = parseInt(v, 10); return n >= 1 && n <= +(env.TABLES || 50) ? n : 0; };

// IPv4 — точний збіг, IPv6 — збіг за префіксом /64 (у телефонів у мережі змінюється хвіст адреси)
const ipKey = ip => ip.includes(':') ? ip.split(':').slice(0, 4).join(':') + '::/64' : ip;
async function venueIps(env) { return (await env.DB.get('venue_ips', 'json')) || []; }
async function inVenue(env, ip) { const k = ipKey(ip); return (await venueIps(env)).some(x => x.k === k); }


// доступ до замовлення: скан QR-коду закладу дає 1 годину (потім — сканувати заново)
const qrKey = async env => (await env.DB.get('qr_key')) || 'f5431c32';
async function scanInfo(env, dev) { dev = String(dev || '').slice(0, 64); if (!dev) return null; const v = await env.DB.get('scan:' + dev); if (!v) return null; try { const o = JSON.parse(v); return typeof o === 'number' ? { until: o, t: 0 } : o; } catch { return null; } }
async function scanUntil(env, dev) { return (await scanInfo(env, dev))?.until || 0; }
// ключ QR конкретного столу (не вгадати, змінивши номер у посиланні)
export async function tableKey(env, t) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${await qrKey(env)}:${t}`));
  return [...new Uint8Array(h)].slice(0, 4).map(x => x.toString(16).padStart(2, '0')).join('');
}

// 🔔 гість кличе офіціанта: стрічка каси + Telegram з кнопкою «✅ Іду»
async function callWaiter(b, ip, env) {
  const table = tableNum(b.table, env); if (!table) return [{ error: 'bad_request' }, 400];
  const sc = await scanInfo(env, b.device);
  if (sc?.t && sc.until > Date.now() && sc.t !== table) return [{ error: 'wrong_table', t: sc.t }, 403];
  if (!(sc?.until > Date.now()) && !(await inVenue(env, ip))) return [{ error: 'not_in_venue' }, 403];
  const rk = 'callrl:' + String(b.device || ip).slice(0, 64); if (await env.DB.get(rk)) return [{ error: 'wait' }, 429];
  await env.DB.put(rk, '1', { expirationTtl: 60 });
  const oid = crypto.randomUUID().replace(/-/g, '').slice(0, 10), html = `🔔🔔 <b>Стіл ${tn(table)} кличе офіціанта</b>`;
  const r = await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: html, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '✅ Іду', callback_data: `acc:${table}:${oid}` }]] } });
  const mid = (await r.json().catch(() => ({})))?.result?.message_id;
  await env.DB.put('ord:' + oid, JSON.stringify({ s: 'new', t: table, mid, html }), { expirationTtl: BILL_TTL });
  await logEvent(env, { k: 'call', t: table, oid, s: 'new' });
  return [{ ok: true, id: oid }, 200];
}

// 🔒 рахунки — по одному; Telegram — вже після замка (повільна мережа не тримає всі столи і не перевищує 8 с запобіжника)
async function order(b, ip, env) {
  const r = await env.DB.locked('bills', () => orderRaw(b, ip, env));
  if (!r.send) return r;
  const { oid, table, msg, lines } = r.send;
  const res = await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: msg, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[
    { text: '✅ Прийняв', callback_data: `acc:${table}:${oid}` }, ...(lines.length ? [{ text: '❌ Відхилити', callback_data: `rej:${table}:${oid}` }] : [])], [{ text: '🧾 Закрити стіл', callback_data: 'cls:' + table }]] } }).catch(() => null);
  const mid = res && await res.json().then(j => j.result?.message_id).catch(() => null);
  // mid — щоб «Прийняв» з каси (POS) оновив і повідомлення в Telegram; статус могли вже змінити — не перезаписуємо
  if (mid) await env.DB.locked('ord:' + oid, async () => { const o = await env.DB.get('ord:' + oid, 'json'); if (o) await env.DB.put('ord:' + oid, JSON.stringify({ ...o, mid }), { expirationTtl: BILL_TTL }); });
  return [r[0], r[1]];
}
async function orderRaw(b, ip, env) {
  const table = tableNum(b.table, env), type = b.type;
  if (!table || !TYPES[type]) return [{ error: 'bad_request' }, 400];
  const sc = await scanInfo(env, b.device);
  if (sc?.t && sc.until > Date.now() && sc.t !== table) return [{ error: 'wrong_table', t: sc.t }, 403]; // стіл закріплений QR-кодом
  if (!(sc?.until > Date.now()) && !(await inVenue(env, ip))) { await warnNotInVenue(env, table, ip, b.device); return [{ error: 'not_in_venue' }, 403]; }

  const dev = String(b.device || ip).slice(0, 64);
  const last = await env.DB.get('rl:' + dev);
  if (last && Date.now() - +last < RATE_MS) return [{ error: 'rate' }, 429];

  // ціни рахуємо на сервері — клієнту не довіряємо
  const PRICES = priceMap(await getMenu(env));
  const lines = [], sold = []; let sum = 0;
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 60)) {
    const p = PRICES[it.id], q = Math.min(50, Math.max(0, parseInt(it.q, 10) || 0));
    if (!p || !q) continue;
    // лише власні ключі: v='toString' тощо давало NaN і обнуляло рахунок столу
    const price = typeof p.p === 'number' ? p.p : Object.hasOwn(p.p, String(it.v)) ? p.p[it.v] : 0;
    if (!(price > 0)) continue;
    const n = p.n + (typeof p.p === 'number' ? '' : ` ${it.v} ${p.s || 'л'}`); // назва як у каси (itemsFromMenu) — один рядок у рахунку
    sum += price * q;
    sold.push({ n, q, sum: price * q });
    lines.push(`${q}× ${n} — ${price * q}`);
  }
  if (type !== 'check' && !lines.length) return [{ error: 'empty' }, 400];
  if (sum > MAX_ORDER) return [{ error: 'too_big' }, 400];

  const bill = await getBill(env, table);
  const prevItems = billItems(bill).map(x => `${x.q}× ${x.name}`);
  const wantsCheck = type === 'check' || type === 'order_check';
  const comment = String(b.comment || '').trim().slice(0, 300);
  const oid = crypto.randomUUID().replace(/-/g, '').slice(0, 10); // номер замовлення — за ним гість бачить, чи прийняв офіціант
  if (lines.length) {
    bill.total += sum; bill.orders++; bill.opened = bill.opened || Date.now();
    bill.log = [...(bill.log || []), { at: hhmm(), kind: TYPES[type].toLowerCase(), lines, comment, oid }].slice(-40);
  }
  const pay = ['cash', 'card'].includes(b.pay) ? b.pay : null;
  const tip = Math.max(0, Math.min(10000, Math.round(+b.tip || 0))), ktip = Math.max(0, Math.min(10000, Math.round(+b.ktip || 0)));
  if (wantsCheck) { bill.check = true; if (pay) bill.pay = pay; if (tip) bill.tip = tip; if (ktip) bill.ktip = ktip; }

  // усе по столу в одному повідомленні: нове зверху, раніше замовлене — нижче
  const prev = (bill.log || []).slice(0, lines.length ? -1 : undefined);
  const prevBlock = prev.length ? ['', '📋 <b>Вже замовлено раніше:</b>', ...prev.flatMap(o => [`<i>${o.at} ${esc(o.kind)}</i>`, ...o.lines.map(esc)])] : [];
  const isMore = prev.length > 0 && lines.length;
  const msg = [
    `🪑 <b>Стіл ${tn(table)}</b> — ${TYPES[type]}`,
    lines.length ? (isMore ? '➕ <b>Дозамовили:</b>' : '') : '',
    ...lines.map(l => isMore ? `<b>${esc(l)}</b>` : esc(l)),
    lines.length ? `Сума: <b>${sum} грн</b>` : '',
    comment ? `💬 ${esc(comment)}` : '',
    ...prevBlock,
    '',
    `💰 Разом за стіл: <b>${bill.total} грн</b>`,
    wantsCheck ? `🧾 <b>Хоче чек</b>${pay ? (pay === 'card' ? ' · 💳 <b>карта</b> (несіть термінал)' : ' · 💵 <b>готівка</b>') : ''}` : '',
    wantsCheck && tip ? `💝 <b>Чайові: ${tip} грн</b>` : '', wantsCheck && ktip ? `👨‍🍳 <b>Подяка кухні: ${ktip} грн</b>` : '',
    wantsCheck && (tip || ktip) ? `→ разом до сплати <b>${payable(bill) + tip + ktip} грн</b>` : '',
  ].filter((x, i, arr) => x !== '' || (arr[i - 1] !== '' && i > 0)).join('\n').trim();

  // html — щоб «Прийняв» оновив повідомлення в Telegram (mid допишемо після відправки)
  // на кухню (екран і бігунок) — лише після «✅ Прийняв» (acceptOrder); sold — щоб «❌ Відхилити» відняв продажі
  await putBill(env, table, bill); // рахунок першим — каса бачить замовлення одразу
  await Promise.all([
    env.DB.put('ord:' + oid, JSON.stringify({ s: 'new', t: table, html: msg, ...(lines.length ? { lines, comment, kind: TYPES[type], sum, sold } : {}) }), { expirationTtl: BILL_TTL }),
    logEvent(env, { k: lines.length ? 'guest' : 'check', t: table, oid, s: 'new', kind: TYPES[type], lines, comment, sum, check: wantsCheck, pay, tip, ...(lines.length && prevItems.length ? { prev: prevItems } : {}) }),
    ...(lines.length ? [addStat(env, 'orders', 1), addDishes(env, sold)] : []),
    env.DB.put('rl:' + dev, String(Date.now()), { expirationTtl: 60 }),
  ]);
  const res = [{ ok: true, id: oid, orderTotal: sum, tableTotal: bill.total }, 200];
  res.send = { oid, table, msg, lines };
  return res;
}

// не частіше ніж раз на 30 хв: підказка персоналу, якщо змінився IP роутера
async function warnNotInVenue(env, table, ip, dev = '') {
  // у стрічку каси — кожна спроба (не частіше 1 разу на 5 хв з одного телефона)
  const dk = 'nv:' + (String(dev).slice(0, 64) || ip);
  if (!(await env.DB.get(dk))) { await env.DB.put(dk, '1', { expirationTtl: 300 }); await logEvent(env, { k: 'noscan', t: table }); }
  if (await env.DB.get('warned')) return;
  await env.DB.put('warned', '1', { expirationTtl: 1800 });
  await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: `🚫📵 Стіл ${tn(table)}: гість пробує замовити, але не відсканував QR-код (або минула година). Підійдіть і підкажіть відсканувати QR на столі 📷` });
}

async function admin(b, ip, env) {
  if (!env.ADMIN_PIN || String(b.pin) !== env.ADMIN_PIN) return [{ error: 'pin' }, 401];
  let list = await venueIps(env);
  if (b.action === 'add') {
    const k = ipKey(ip);
    list = [{ k, at: Date.now() }, ...list.filter(x => x.k !== k)].slice(0, 20);
    await env.DB.put('venue_ips', JSON.stringify(list));
  } else if (b.action === 'clear') { list = []; await env.DB.put('venue_ips', '[]'); }
  return [{ ok: true, current: ipKey(ip), list }, 200];
}

async function proxySite(url) {
  const r = await fetch('https://666blackmuxa666.github.io/VARVAR' + url.pathname + url.search, { cf: { cacheTtl: 30 } });
  return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-cache' } });
}
