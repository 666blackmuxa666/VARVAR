// VARVAR — Cloudflare Worker: прийом замовлень, перевірка Wi‑Fi закладу, Telegram.
// Secrets: BOT_TOKEN, CHAT_ID, ADMIN_PIN, TG_SECRET   Vars: ALLOWED_ORIGIN, TABLES, SELF_URL   KV: DB
import { getMenu, priceMap } from './menu.js';
import { handleUpdate, tg, esc, getBill, addStat, addDishes, hhmm } from './bot.js';
import { queuePrint, kitchenTicket, printApi } from './print.js';
export { PrintQ } from './print.js';

const TYPES = { order: 'НОВЕ ЗАМОВЛЕННЯ', order_check: 'НОВЕ ЗАМОВЛЕННЯ', reorder: 'ДОЗАМОВЛЕННЯ', check: 'ПРОСЯТЬ ЧЕК' };
const MAX_ORDER = 30000, RATE_MS = 15000, BILL_TTL = 12 * 3600;

export default {
  async fetch(req, env) {
    const url = new URL(req.url), cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json' } });
    const ip = req.headers.get('CF-Connecting-IP') || '';
    try {
      if (url.pathname === '/api/status') {
        const table = tableNum(url.searchParams.get('table'), env);
        const bill = table ? await getBill(env, table) : null;
        return json({ inVenue: await inVenue(env, ip), tableTotal: bill ? bill.total : undefined });
      }
      if (url.pathname === '/api/menu') return new Response(JSON.stringify(await getMenu(env)), { headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-cache' } });
      if (url.pathname.startsWith('/img/')) {
        const b = await env.DB.get('img:' + url.pathname.slice(5), 'arrayBuffer');
        return b ? new Response(b, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000' } }) : new Response('', { status: 404 });
      }
      if (url.pathname.startsWith('/api/print/')) return printApi(req, env, url);
      // програма друку і логотип через простий HTTP (Windows 7 не вміє TLS 1.2)
      if (url.pathname === '/print/agent.ps1' || url.pathname === '/print/logo.png') {
        const r = await fetch('https://666blackmuxa666.github.io/VARVAR/printer/' + (url.pathname.endsWith('.png') ? 'logo.png' : 'varvar-print.ps1'), { cf: { cacheTtl: 30 } });
        return new Response(r.body, { headers: { 'content-type': url.pathname.endsWith('.png') ? 'image/png' : 'application/octet-stream' } });
      }
      if (url.pathname === '/api/orders') { // статуси замовлень гостя: ?ids=a,b
        const ids = (url.searchParams.get('ids') || '').split(',').filter(x => /^[a-z0-9]{6,12}$/.test(x)).slice(0, 20);
        const out = {}; for (const id of ids) out[id] = await env.DB.get('ord:' + id, 'json');
        return json(out);
      }
      if (url.pathname === '/api/order' && req.method === 'POST') return json(...await order(await req.json(), ip, env));
      if (url.pathname === '/api/admin' && req.method === 'POST') return json(...await admin(await req.json(), ip, env));
      if (url.pathname === '/tg' && req.method === 'POST') {
        if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TG_SECRET) return new Response('no', { status: 403 });
        await handleUpdate(await req.json(), env);
        return new Response('ok');
      }
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      return json({ error: 'bad_request' }, 400);
    }
  },
};

function corsHeaders(req, env) {
  const o = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim());
  return { 'Access-Control-Allow-Origin': allowed.includes(o) ? o : allowed[0] || '', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', Vary: 'Origin' };
}
const tableNum = (v, env) => { const n = parseInt(v, 10); return n >= 1 && n <= +(env.TABLES || 50) ? n : 0; };

// IPv4 — точний збіг, IPv6 — збіг за префіксом /64 (у телефонів у мережі змінюється хвіст адреси)
const ipKey = ip => ip.includes(':') ? ip.split(':').slice(0, 4).join(':') + '::/64' : ip;
async function venueIps(env) { return (await env.DB.get('venue_ips', 'json')) || []; }
async function inVenue(env, ip) { const k = ipKey(ip); return (await venueIps(env)).some(x => x.k === k); }


async function order(b, ip, env) {
  const table = tableNum(b.table, env), type = b.type;
  if (!table || !TYPES[type]) return [{ error: 'bad_request' }, 400];
  if (!(await inVenue(env, ip))) { await warnNotInVenue(env, table, ip); return [{ error: 'not_in_venue' }, 403]; }

  const dev = String(b.device || ip).slice(0, 64);
  const last = await env.DB.get('rl:' + dev);
  if (last && Date.now() - +last < RATE_MS) return [{ error: 'rate' }, 429];

  // ціни рахуємо на сервері — клієнту не довіряємо
  const PRICES = priceMap(await getMenu(env));
  const lines = [], sold = []; let sum = 0;
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 60)) {
    const p = PRICES[it.id], q = Math.min(50, Math.max(0, parseInt(it.q, 10) || 0));
    if (!p || !q) continue;
    const price = typeof p.p === 'number' ? p.p : p.p[it.v];
    if (!price) continue;
    sum += price * q;
    sold.push({ n: p.n + (typeof p.p === 'number' ? '' : ` ${it.v} л`), q, sum: price * q });
    lines.push(`${q}× ${p.n}${typeof p.p === 'number' ? '' : ` ${it.v} л`} — ${price * q}`);
  }
  if (type !== 'check' && !lines.length) return [{ error: 'empty' }, 400];
  if (sum > MAX_ORDER) return [{ error: 'too_big' }, 400];

  const bill = await getBill(env, table);
  const wantsCheck = type === 'check' || type === 'order_check';
  const comment = String(b.comment || '').trim().slice(0, 300);
  if (lines.length) {
    bill.total += sum; bill.orders++; bill.opened = bill.opened || Date.now();
    bill.log = [...(bill.log || []), { at: hhmm(), kind: TYPES[type].toLowerCase(), lines, comment }].slice(-40);
  }
  const pay = ['cash', 'card'].includes(b.pay) ? b.pay : null;
  if (wantsCheck) { bill.check = true; if (pay) bill.pay = pay; }

  // усе по столу в одному повідомленні: нове зверху, раніше замовлене — нижче
  const prev = (bill.log || []).slice(0, lines.length ? -1 : undefined);
  const prevBlock = prev.length ? ['', '📋 <b>Вже замовлено раніше:</b>', ...prev.flatMap(o => [`<i>${o.at} ${esc(o.kind)}</i>`, ...o.lines.map(esc)])] : [];
  const isMore = prev.length > 0 && lines.length;
  const msg = [
    `🪑 <b>Стіл ${table}</b> — ${TYPES[type]}`,
    lines.length ? (isMore ? '➕ <b>Дозамовили:</b>' : '') : '',
    ...lines.map(l => isMore ? `<b>${esc(l)}</b>` : esc(l)),
    lines.length ? `Сума: <b>${sum} грн</b>` : '',
    comment ? `💬 ${esc(comment)}` : '',
    ...prevBlock,
    '',
    `💰 Разом за стіл: <b>${bill.total} грн</b>`,
    wantsCheck ? `🧾 <b>Хоче чек</b>${pay ? (pay === 'card' ? ' · 💳 <b>карта</b> (несіть термінал)' : ' · 💵 <b>готівка</b>') : ''}` : '',
  ].filter((x, i, arr) => x !== '' || (arr[i - 1] !== '' && i > 0)).join('\n').trim();

  // номер замовлення — за ним гість бачить, чи прийняв офіціант
  const oid = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  await env.DB.put('ord:' + oid, JSON.stringify({ s: 'new', t: table }), { expirationTtl: BILL_TTL });
  await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: msg, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[
    { text: '✅ Прийняв', callback_data: `acc:${table}:${oid}` }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + table }]] } });
  if (lines.length) {
    await addStat(env, 'orders', 1); await addDishes(env, sold);
    await queuePrint(env, 'kitchen', kitchenTicket({ table, kind: TYPES[type], lines, comment, by: 'гість (сайт)' })); // бігунок
  }
  await env.DB.put('bill:' + table, JSON.stringify(bill), { expirationTtl: BILL_TTL });
  await env.DB.put('rl:' + dev, String(Date.now()), { expirationTtl: 60 });
  return [{ ok: true, id: oid, orderTotal: sum, tableTotal: bill.total }, 200];
}

// не частіше ніж раз на 30 хв: підказка персоналу, якщо змінився IP роутера
async function warnNotInVenue(env, table, ip) {
  if (await env.DB.get('warned')) return;
  await env.DB.put('warned', '1', { expirationTtl: 1800 });
  await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: `⚠️ Спроба замовлення (стіл ${table}) не з Wi‑Fi закладу. Якщо гість точно в залі — можливо, змінився IP роутера: відкрийте сторінку admin.html з телефону в Wi‑Fi закладу.` });
}

async function admin(b, ip, env) {
  if (!env.ADMIN_PIN || String(b.pin) !== env.ADMIN_PIN) return [{ error: 'pin' }, 401];
  let list = await venueIps(env);
  if (b.action === 'add') {
    const k = ipKey(ip);
    list = [{ k, at: Date.now() }, ...list.filter(x => x.k !== k)].slice(0, 6);
    await env.DB.put('venue_ips', JSON.stringify(list));
  } else if (b.action === 'clear') { list = []; await env.DB.put('venue_ips', '[]'); }
  return [{ ok: true, current: ipKey(ip), list }, 200];
}
