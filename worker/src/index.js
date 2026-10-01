// VARVAR — Cloudflare Worker: прийом замовлень, перевірка Wi‑Fi закладу, Telegram.
// Secrets: BOT_TOKEN, CHAT_ID, ADMIN_PIN, TG_SECRET   Vars: ALLOWED_ORIGIN, TABLES, SELF_URL   KV: DB
import { getMenu, priceMap, handleMenuText, handleMenuPhoto, HELP } from './menu.js';

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
      if (url.pathname === '/api/order' && req.method === 'POST') return json(...await order(await req.json(), ip, env));
      if (url.pathname === '/api/admin' && req.method === 'POST') return json(...await admin(await req.json(), ip, env));
      if (url.pathname === '/tg' && req.method === 'POST') {
        if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TG_SECRET) return new Response('no', { status: 403 });
        await telegramUpdate(await req.json(), env);
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

const getBill = async (env, t) => (await env.DB.get('bill:' + t, 'json')) || { total: 0, orders: 0 };

async function order(b, ip, env) {
  const table = tableNum(b.table, env), type = b.type;
  if (!table || !TYPES[type]) return [{ error: 'bad_request' }, 400];
  if (!(await inVenue(env, ip))) { await warnNotInVenue(env, table, ip); return [{ error: 'not_in_venue' }, 403]; }

  const dev = String(b.device || ip).slice(0, 64);
  const last = await env.DB.get('rl:' + dev);
  if (last && Date.now() - +last < RATE_MS) return [{ error: 'rate' }, 429];

  // ціни рахуємо на сервері — клієнту не довіряємо
  const PRICES = priceMap(await getMenu(env));
  const lines = []; let sum = 0;
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 60)) {
    const p = PRICES[it.id], q = Math.min(50, Math.max(0, parseInt(it.q, 10) || 0));
    if (!p || !q) continue;
    const price = typeof p.p === 'number' ? p.p : p.p[it.v];
    if (!price) continue;
    sum += price * q;
    lines.push(`${q}× ${p.n}${typeof p.p === 'number' ? '' : ` ${it.v} л`} — ${price * q}`);
  }
  if (type !== 'check' && !lines.length) return [{ error: 'empty' }, 400];
  if (sum > MAX_ORDER) return [{ error: 'too_big' }, 400];

  const bill = await getBill(env, table);
  if (lines.length) { bill.total += sum; bill.orders++; }
  const wantsCheck = type === 'check' || type === 'order_check';
  const comment = String(b.comment || '').trim().slice(0, 300);

  const msg = [
    `🪑 <b>Стіл ${table}</b> — ${TYPES[type]}`,
    ...lines.map(esc),
    lines.length ? `<b>Сума: ${sum} грн</b>` : '',
    comment ? `💬 ${esc(comment)}` : '',
    `Разом за стіл: <b>${bill.total} грн</b>`,
    wantsCheck ? '🧾 <b>Хоче чек</b>' : '',
  ].filter(Boolean).join('\n');

  await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: msg, parse_mode: 'HTML' });
  await env.DB.put('bill:' + table, JSON.stringify(bill), { expirationTtl: BILL_TTL });
  await env.DB.put('rl:' + dev, String(Date.now()), { expirationTtl: 60 });
  return [{ ok: true, orderTotal: sum, tableTotal: bill.total }, 200];
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

async function telegramUpdate(u, env) {
  const m = u.message; if (!m || String(m.chat.id) !== String(env.CHAT_ID)) return;
  const reply = text => tg(env, 'sendMessage', { chat_id: m.chat.id, text, parse_mode: 'HTML' });
  if (m.photo) return reply(await handleMenuPhoto(m, env, tg));
  const [cmd = '', arg] = (m.text || '').trim().split(/\s+/);
  const c = cmd.replace(/@.*/, '').toLowerCase();
  if (c === '/close') {
    const t = tableNum(arg, env); if (!t) return reply('Формат: /close 5');
    const bill = await getBill(env, t);
    await env.DB.delete('bill:' + t);
    return reply(`✅ Стіл ${t} закрито. Було: ${bill.total} грн.`);
  }
  if (c === '/tables') {
    const keys = (await env.DB.list({ prefix: 'bill:' })).keys;
    const rows = await Promise.all(keys.map(async k => `Стіл ${k.name.slice(5)}: ${(await env.DB.get(k.name, 'json')).total} грн`));
    return reply(rows.length ? rows.join('\n') : 'Відкритих столів немає');
  }
  if (['/help', '/start', 'help', 'допомога', '/menu'].includes(c)) return reply(HELP);
  if (m.text) return reply((await handleMenuText(m.text, env)) || 'Не зрозумів 🤔 Напишіть «help», щоб побачити приклади.');
}

const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
