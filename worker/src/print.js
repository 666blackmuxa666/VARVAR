// Черга друку для принтера в закладі (XP-80C через програму printer/varvar-print.ps1 на Windows).
// Завдання = список рядків: [стиль, текст, текст-праворуч?]
//   стилі: logo · big (великий жирний по центру) · c (по центру) · b (жирний) · l (звичайний) · lr (ліворуч + праворуч) · hr (риска) · gap
import { hhmm, dayKey } from './bot.js';

const TTL = 2 * 86400;

export async function queuePrint(env, kind, lines) {
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  await env.DB.put('pq:' + id, JSON.stringify({ id, kind, lines }), { expirationTtl: TTL });
  return id;
}

// бігунок на кухню/бар — без цін, стіл на чорній плашці
export function kitchenTicket({ table, kind, lines, comment, by }) {
  return [
    ['invb', `СТІЛ ${table}`],
    ['c', `${kind}${by ? ' · ' + by : ''}  ·  ${hhmm()}`],
    ['dbl'],
    ...lines.map(l => { const m = l.match(/^(\d+)× (.+?) — \d+$/); return ['k', m ? `${m[1]} × ${m[2]}` : l]; }),
    ...(comment ? [['dbl'], ['inv', `!! ${comment}`]] : []),
    ['dbl'], ['gap'],
  ];
}

// рахунок гостю: пречек (до оплати) або фінальний чек (після закриття)
export async function receipt(env, { table, bill, final, pay, by }) {
  // збираємо однакові позиції з усіх замовлень столу
  const agg = new Map();
  for (const o of bill.log || []) for (const l of o.lines) {
    const m = l.match(/^(\d+)× (.+?) — (\d+)$/); if (!m) continue;
    const [q, name, sum] = [+m[1], m[2], +m[3]];
    const a = agg.get(name) || { q: 0, sum: 0 }; a.q += q; a.sum += sum; agg.set(name, a);
  }
  const no = final ? await nextReceiptNo(env) : null;
  const fmt = t => new Date(t).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
  const count = [...agg.values()].reduce((s, a) => s + a.q, 0);
  return [
    ['logo'],
    ['s', 'FOOD & BAR'],
    ['inv', final ? `ЧЕК № ${no}` : 'ПРЕЧЕК'],
    ...(final ? [] : [['s', 'не є фіскальним чеком']]),
    ['gap'],
    ['lr', 'Стіл', String(table)],
    ...(by ? [['lr', 'Офіціант', by]] : []),
    ...(bill.opened ? [['lr', 'Відкрито', fmt(bill.opened)]] : []),
    ['lr', final ? 'Закрито' : 'Надруковано', fmt(Date.now())],
    ['dbl'],
    ...[...agg].flatMap(([name, a]) => [['item', name, `${a.sum}`], ['sub', `${a.q} × ${Math.round(a.sum / a.q)} грн`]]),
    ['dbl'],
    ['lr', 'Позицій', String(count)],
    ['total', final ? 'СПЛАЧЕНО' : 'ДО СПЛАТИ', `${bill.total} грн`],
    ...(final && pay ? [['lr', 'Оплата', pay === 'card' ? 'Картка' : 'Готівка']] : []),
    ['gap'],
    ['c', 'Дякуємо, що завітали!'],
    ['c', 'Чекаємо на вас знову ♥'],
    ['s', 'Меню і замовлення — QR-код на столі'],
    ['gap'],
  ];
}
async function nextReceiptNo(env) {
  const k = 'rcpt:' + dayKey(); const n = +(await env.DB.get(k) || 0) + 1;
  await env.DB.put(k, String(n), { expirationTtl: 400 * 86400 });
  return `${dayKey().slice(2).replace(/-/g, '')}-${String(n).padStart(3, '0')}`;
}

// API для програми друку: GET /api/print/pull?key=… → завдання; POST /api/print/ack {key, ids}
export async function printApi(req, env, url) {
  const key = url.searchParams.get('key') || (req.method === 'POST' ? (await req.clone().json().catch(() => ({}))).key : '');
  if (!env.PRINT_KEY || key !== env.PRINT_KEY) return new Response('forbidden', { status: 403 });
  await env.DB.put('printer_seen', String(Date.now()), { expirationTtl: TTL });
  if (url.pathname === '/api/print/pull') {
    const keys = (await env.DB.list({ prefix: 'pq:' })).keys.slice(0, 10);
    const jobs = (await Promise.all(keys.map(k => env.DB.get(k.name, 'json')))).filter(Boolean);
    return new Response(JSON.stringify({ jobs }), { headers: { 'content-type': 'application/json; charset=utf-8' } }); // charset — інакше PowerShell 5 ламає кирилицю
  }
  if (url.pathname === '/api/print/ack' && req.method === 'POST') {
    const ids = [].concat((await req.json()).ids || []);
    await Promise.all(ids.filter(id => /^[\w-]+$/.test(id)).map(id => env.DB.delete('pq:' + id)));
    return Response.json({ ok: true });
  }
  return new Response('not found', { status: 404 });
}
