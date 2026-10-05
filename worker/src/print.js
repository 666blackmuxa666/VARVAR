// Черга друку для принтера в закладі (XP-80C через програму printer/varvar-print.ps1 на Windows).
// Завдання = список рядків: [стиль, текст, текст-праворуч?]
//   стилі: logo · big (великий жирний по центру) · c (по центру) · b (жирний) · l (звичайний) · lr (ліворуч + праворуч) · hr (риска) · gap
import { hhmm, dayKey, discAmt } from './ops.js';
import { tn } from './tn.js';


// черга живе в Durable Object: програма друку чекає на /pull (long-poll), і чек віддається миттєво
const q = env => env.PRINTQ.get(env.PRINTQ.idFromName('main'));
const qcall = (env, path, body) => q(env).fetch('https://q' + path, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
export async function queuePrint(env, kind, lines) {
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  await qcall(env, '/push', { id, kind, lines });
  return id;
}
export const printStatus = async env => (await qcall(env, '/status')).json();

export class PrintQ {
  constructor(state) { this.st = state.storage; this.wait = []; }
  async jobs() { return [...(await this.st.list({ prefix: 'j:', limit: 10 })).values()]; }
  wake() { const w = this.wait; this.wait = []; w.forEach(f => f()); }
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/push') { const j = await req.json(); await this.st.put('j:' + j.id, j); this.wake(); return new Response('ok'); }
    if (u.pathname === '/status') return Response.json({ seen: (await this.st.get('seen')) || 0, q: (await this.st.list({ prefix: 'j:' })).size });
    if (u.pathname === '/ack') { const { ids } = await req.json(); await this.st.delete(ids.filter(id => /^[\w-]+$/.test(id)).map(id => 'j:' + id)); return new Response('ok'); }
    if (u.pathname === '/pull') {
      await this.st.put('seen', Date.now());
      let jobs = await this.jobs();
      const wait = Math.min(+u.searchParams.get('wait') || 0, 25);
      if (!jobs.length && wait) {
        await new Promise(r => { const t = setTimeout(r, wait * 1000); this.wait.push(() => { clearTimeout(t); r(); }); });
        jobs = await this.jobs();
      }
      return Response.json({ jobs });
    }
    return new Response('not found', { status: 404 });
  }
}

// бігунок на кухню/бар — без цін, стіл на чорній плашці
export function kitchenTicket({ table, kind, lines, comment, by, urgent }) {
  return [
    ...(urgent ? [['invb', '!!! ТЕРМІНОВО !!!']] : []),
    ['invb', +table > 1000 ? `${+table > 2000 ? 'САМОВИВІЗ' : 'ДОСТАВКА'} ${tn(table)}` : `СТІЛ ${table}`],
    ['c', `${kind}  ·  ${hhmm()}`],
    ...(by ? [['c', `Замовив: ${by}`]] : []),
    ['dbl'],
    ...lines.map(l => { const m = l.match(/^(\d+)× (.+?) — \d+$/); return ['k', m ? `${m[1]} × ${m[2]}` : l]; }),
    // «з собою» — окремою чорною плашкою, решта коментаря звичайним шрифтом з переносом
    ...(/^З СОБОЮ/.test(comment || '') ? [['dbl'], ['inv', 'З СОБОЮ']] : []),
    ...(comment && comment.replace(/^З СОБОЮ\s*·?\s*/, '') ? [['dbl'], ['b', `>> ${comment.replace(/^З СОБОЮ\s*·?\s*/, '')}`]] : []),
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
    ['lr', +table > 2000 ? 'Самовивіз' : +table > 1000 ? 'Доставка' : 'Стіл', String(tn(table))],
    ...(bill.opened ? [['lr', 'Відкрито', fmt(bill.opened)]] : []),
    ['lr', final ? 'Закрито' : 'Надруковано', fmt(Date.now())],
    ['dbl'],
    ...[...agg].flatMap(([name, a]) => [['item', name, `${a.sum}`], ['sub', `${a.q} × ${Math.round(a.sum / a.q)} грн`]]),
    ['dbl'],
    ['lr', 'Позицій', String(count)],
    ...(bill.disc ? [['lr', 'Сума', `${bill.total} грн`], ['lr', `Знижка ${bill.disc}%`, `−${discAmt(bill)} грн`]] : []),
    ['total', final ? 'СПЛАЧЕНО' : 'ДО СПЛАТИ', `${bill.total - discAmt(bill)} грн`],
    ...(bill.tip ? [['lr', 'Чайові', `${bill.tip} грн`]] : []), ...(bill.ktip ? [['lr', 'Подяка кухні', `${bill.ktip} грн`]] : []),
    ...(bill.tip || bill.ktip ? [['lr', 'Разом з чайовими', `${bill.total - discAmt(bill) + (bill.tip || 0) + (bill.ktip || 0)} грн`]] : []),
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
  await env.DB.put(k, String(n));
  const [y, m, d] = dayKey().split('-'); // ДДММРР-номер, напр. 021026-002
  return `${d}${m}${y.slice(2)}-${String(n).padStart(3, '0')}`;
}

// API для програми друку: GET /api/print/pull?key=… → завдання; POST /api/print/ack {key, ids}
export async function printApi(req, env, url) {
  const key = url.searchParams.get('key') || (req.method === 'POST' ? (await req.clone().json().catch(() => ({}))).key : '');
  if (!env.PRINT_KEY || key !== env.PRINT_KEY) return new Response('forbidden', { status: 403 });
  if (url.pathname === '/api/print/pull') {
    const r = await qcall(env, '/pull?wait=' + (+url.searchParams.get('wait') || 0));
    return new Response(await r.text(), { headers: { 'content-type': 'application/json; charset=utf-8' } }); // charset — інакше PowerShell ламає кирилицю
  }
  if (url.pathname === '/api/print/ack') {
    // GET ?ids=a,b (старі Windows) або POST {ids}
    const ids = req.method === 'POST' ? [].concat((await req.json().catch(() => ({}))).ids || []) : (url.searchParams.get('ids') || '').split(',');
    await qcall(env, '/ack', { ids: ids.filter(Boolean) });
    return Response.json({ ok: true });
  }
  return new Response('not found', { status: 404 });
}
