// Черга друку для принтера в закладі (XP-80C через програму printer/varvar-print.ps1 на Windows).
// Завдання = список рядків: [стиль, текст, текст-праворуч?]
//   стилі: logo · big (великий жирний по центру) · c (по центру) · b (жирний) · l (звичайний) · lr (ліворуч + праворуч) · hr (риска) · gap
import { hhmm, dayKey, discAmt, payable } from './ops.js';
import { tn } from './tn.js';
import { doName, venueId } from './venue.js';


// черга живе в Durable Object: програма друку чекає на /pull (long-poll), і чек віддається миттєво
const q = env => env.PRINTQ.get(env.PRINTQ.idFromName(doName(venueId()))); // 🏪 своя черга друку в кожного закладу
const qcall = (env, path, body) => q(env).fetch('https://q' + path, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
// 🧾 конструктор чека (кабінет власника → Принтер): ширина паперу, масштаб, логотип, тексти, що показувати
export const RCPT_DEF = { w: 80, scale: 100, logo: 1, logoW: 120, sub: 'FOOD & BAR', head: [], title: 'ЧЕК', pre: 'ПРЕЧЕК', preNote: 'не є фіскальним чеком', opened: 1, count: 1, itemSub: 1, pay: 1, tips: 1, waiter: 0,
  foot: ['Дякуємо, що завітали!', 'Чекаємо на вас знову ♥'], footS: 'Меню і замовлення — QR-код на столі', qr: 0, qrText: 'Меню й замовлення онлайн', kBig: 1, kWaiter: 1, kTime: 1, feed: 1 };
export const getRcpt = async env => ({ ...RCPT_DEF, ...((await env.DB.get('rcpt', 'json')) || {}) });
const S = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
export function cleanRcpt(b) {
  const r = { ...RCPT_DEF }, B = x => (x ? 1 : 0), N = (v, a, z, d) => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(z, Math.max(a, v)) : d; };
  r.w = [58, 80].includes(+b.w) ? +b.w : 80; r.scale = N(b.scale, 70, 140, 100); r.logoW = N(b.logoW, 40, 260, 120); r.feed = N(b.feed, 0, 4, 1);
  for (const k of ['logo', 'opened', 'count', 'itemSub', 'pay', 'tips', 'waiter', 'qr', 'kBig', 'kWaiter', 'kTime']) r[k] = B(b[k]);
  for (const [k, n] of [['sub', 60], ['title', 30], ['pre', 30], ['preNote', 60], ['footS', 120], ['qrText', 60]]) r[k] = S(b[k], n);
  r.head = [].concat(b.head || []).map(x => S(x, 60)).filter(Boolean).slice(0, 5); r.foot = [].concat(b.foot || []).map(x => S(x, 60)).filter(Boolean).slice(0, 5);
  if (/^img:[a-z0-9-]{4,40}$/.test(b.logoImg || '')) r.logoImg = b.logoImg;
  return r;
}
// 🖨 кілька принтерів: route = { st: [{ id, name, dev, g: ['kitchen','bar','hookah','other'], r: чеки 0/1, n: копій 1–3 }] }
// стара форма { receipt, kitchen } → 2 принтери (так працює VARVAR до першого збереження)
const PG = ['kitchen', 'bar', 'hookah', 'other'];
export function cleanRoute(b) {
  if (!Array.isArray(b?.st)) { const st = []; if (b?.receipt || b?.kitchen) { if (b.kitchen && b.kitchen !== b.receipt) st.push({ id: 'k', name: 'Кухня', dev: b.kitchen, g: [...PG], r: 0, n: 1 }, { id: 'r', name: 'Каса', dev: b.receipt || '', g: [], r: 1, n: 1 }); else st.push({ id: 'r', name: 'Принтер', dev: b.receipt || b.kitchen, g: [...PG], r: 1, n: 1 }); } return { st }; }
  const st = b.st.slice(0, 6).map((x, i) => ({ id: /^[\w-]{1,12}$/.test(x.id || '') ? x.id : 'p' + i, name: S(x.name, 30) || `Принтер ${i + 1}`, dev: S(x.dev, 200), g: PG.filter(g => [].concat(x.g || []).includes(g)), r: x.r ? 1 : 0, n: Math.min(3, Math.max(1, Math.round(+x.n) || 1)) }));
  return { st };
}
export const getRoute = async env => cleanRoute((await env.DB.get('print_route', 'json')) || {});
// для старої програми друку (до 2.1): куди чеки й куди бігунки
const legacy = r => ({ receipt: (r.st.find(x => x.r) || {}).dev || '', kitchen: (r.st.find(x => x.g.includes('kitchen')) || r.st.find(x => x.g.length) || {}).dev || '' });
async function push(env, kind, lines, rc, extra = {}) {
  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
  lines = [['cfg', rc.w, rc.scale, rc.logoW], ...lines, ...Array.from({ length: rc.feed }, () => ['gap'])]; /* ширина паперу й масштаб — для програми друку */
  if (/^tab:/.test(extra.dev || '')) await tabPut(env, l => [...l, { id, kind, lines, ...extra }].slice(-40)); // 📱 принтер планшета — своя черга в базі закладу: запис сам будить касу через WebSocket (ключ tpq)
  else await qcall(env, '/push', { id, kind, lines, ...extra });
  return id;
}
// 📱 черга принтерів, підключених до планшета (Bluetooth / USB / Epson Wi-Fi) — друкує сама каса
const tabPut = async (env, fn) => { const { L } = await import('./ops.js'); return L(env, ['tpq'], async () => { const l = (await env.DB.get('tpq', 'json')) || [], n = fn(l); if (JSON.stringify(n) !== JSON.stringify(l)) await env.DB.put('tpq', JSON.stringify(n), { expirationTtl: 86400 }); return n; }); };
// принтери для вибору: знайдені програмою на компʼютері + підключені до планшетів (📱)
export async function allDev(env) { const d = (await env.DB.get('print_dev', 'json')) || null, t = (await env.DB.get('print_tab', 'json')) || []; if (!d && !t.length) return null; return { ...(d || {}), list: [...(d?.list || []), ...t.map(x => ({ id: x.id, name: '📱 ' + x.name, type: x.type }))] }; }
export const tabJobs = async (env, dev) => ((await env.DB.get('tpq', 'json')) || []).filter(j => j.dev === dev && Date.now() - (+String(j.id).split('-')[0] || Date.now()) < 6 * 3600e3); // старші 6 год — не друкувати
export const tabAck = (env, ids, dev) => tabPut(env, l => l.filter(j => !ids.includes(j.id) || (dev && j.dev !== dev))); // з планшета — лише свої завдання
export async function tabReg(env, d) { // планшет повідомляє свій принтер → зʼявляється у списку «що на який принтер»
  const id = /^tab:[a-z0-9]{4,16}$/.test(d.id || '') ? d.id : null; if (!id) return { error: 'id' };
  const l = ((await env.DB.get('print_tab', 'json')) || []).filter(x => x.id !== id);
  if (!d.off) l.push({ id, name: S(d.name, 60) || 'Принтер планшета', type: ['bt', 'usb', 'epos'].includes(d.type) ? d.type : 'bt', at: Date.now() });
  await env.DB.put('print_tab', JSON.stringify(l.slice(-10))); return { ok: 1 };
}
export async function queuePrint(env, kind, lines) {
  const rc = await getRcpt(env);
  if (kind === 'kitchen') return push(env, kind, lines, rc);
  const st = (await getRoute(env)).st.find(x => x.r); if (!st) return push(env, kind, lines, rc); // чеки, Z, QR, тест — на принтер з 🧾
  const n = ['receipt', 'precheck'].includes(kind) ? st.n : 1; let id;
  for (let i = 0; i < n; i++) id = await push(env, kind, lines, rc, { st: st.id, sn: st.name, dev: st.dev });
  return id;
}
// 👨‍🍳 бігунок ділиться між принтерами за групами страв (кухня / бар / кальян / інше); без налаштувань — один бігунок, як раніше
export async function queueKitchen(env, t) {
  const [rc, { st }] = await Promise.all([getRcpt(env), getRoute(env)]), ks = st.filter(x => x.g.length);
  if (!ks.length) return push(env, 'kitchen', kitchenTicket(t, rc), rc);
  const { getMenu } = await import('./menu.js'), { dishResolver, groupOf } = await import('./ops.js'), res = dishResolver(await getMenu(env));
  const by = new Map();
  for (const l of t.lines) { const m = l.match(/^\d+× (.+?) — \d+$/), g = groupOf(res(m ? m[1] : l)?.cat); const s = ks.find(x => x.g.includes(g)) || ks.find(x => x.g.includes('kitchen')) || ks[0]; by.set(s, [...(by.get(s) || []), l]); }
  const parts = [...by], N = parts.length;
  for (const [i, [s, lines]] of parts.entries()) for (let c = 0; c < s.n; c++) await push(env, 'kitchen', kitchenTicket({ ...t, lines, kind: N > 1 ? `${t.kind} · ${s.name} ${i + 1}/${N}` : t.kind }, rc), rc, { st: s.id, sn: s.name, dev: s.dev });
}
// 🔁 завдання з черги — на інший принтер (якщо той зламався)
export async function printMove(env, id, sid) {
  const s = (await getRoute(env)).st.find(x => x.id === sid); if (!s) return { error: 'Принтер не знайдено' };
  const tj = ((await env.DB.get('tpq', 'json')) || []).find(j => j.id === id), toTab = /^tab:/.test(s.dev || '');
  if (!tj && !toTab) return (await qcall(env, '/move', { id, st: s.id, sn: s.name, dev: s.dev })).json();
  const j = tj || (await (await qcall(env, '/get', { id })).json()).j; if (!j) return { error: 'Завдання вже надруковано' }; // між компʼютером і планшетом — забрати й поставити заново
  if (tj) await tabAck(env, [id]); else await qcall(env, '/clear', { id });
  const n = { ...j, st: s.id, sn: s.name, dev: s.dev };
  if (toTab) await tabPut(env, l => [...l, n].slice(-40)); else await qcall(env, '/push', n);
  return { ok: 1 };
}
export const printStatus = async env => (await qcall(env, '/status')).json();
// 🗑 черга: список завдань (для каси) і очищення — уся або одне (id)
const tabTxt = j => ({ id: j.id, kind: j.kind, st: j.st || '', sn: j.sn || '', at: +String(j.id).split('-')[0] || 0, txt: (j.lines || []).filter(x => ['big', 'b', 'c', 'l', 'inv', 'invb'].includes(x[0]) && x[1]).slice(0, 2).map(x => x[1]).join(' · ').slice(0, 80) });
export const printList = async env => [...(await (await qcall(env, '/list')).json()), ...((await env.DB.get('tpq', 'json')) || []).map(tabTxt)];
export async function printClear(env, id) {
  const t = ((await env.DB.get('tpq', 'json')) || []).filter(j => !id || j.id === id).map(j => j.id); if (t.length) await tabAck(env, t);
  const r = await (await qcall(env, '/clear', { id: id || '' })).json(); return { n: r.n + t.length };
}

export class PrintQ {
  constructor(state) { this.st = state.storage; this.wait = []; }
  async jobs() { return [...(await this.st.list({ prefix: 'j:', limit: 10 })).values()]; }
  wake() { const w = this.wait; this.wait = []; w.forEach(f => f()); }
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/push') { const j = await req.json(); await this.st.put('j:' + j.id, j); this.wake(); return new Response('ok'); }
    if (u.pathname === '/status') return Response.json({ seen: (await this.st.get('seen')) || 0, q: (await this.st.list({ prefix: 'j:' })).size });
    if (u.pathname === '/get') { const { id } = await req.json(); return Response.json({ j: /^[\w-]+$/.test(id) ? (await this.st.get('j:' + id)) || null : null }); }
    if (u.pathname === '/move') { const b = await req.json(), j = /^[\w-]+$/.test(b.id) && await this.st.get('j:' + b.id); if (!j) return Response.json({ error: 'Завдання вже надруковано' }); await this.st.put('j:' + j.id, { ...j, st: b.st, sn: b.sn, dev: b.dev }); this.wake(); return Response.json({ ok: 1 }); }
    if (u.pathname === '/list') { const l = [...(await this.st.list({ prefix: 'j:', limit: 100 })).values()]; return Response.json(l.map(j => ({ id: j.id, kind: j.kind, st: j.st || '', sn: j.sn || '', at: +String(j.id).split('-')[0] || 0, txt: (j.lines || []).filter(x => ['big', 'b', 'c', 'l'].includes(x[0]) && x[1]).slice(0, 2).map(x => x[1]).join(' · ').slice(0, 80) }))); }
    if (u.pathname === '/clear') { const { id } = await req.json(); const keys = id ? (/^[\w-]+$/.test(id) ? ['j:' + id] : []) : [...(await this.st.list({ prefix: 'j:' })).keys()]; if (keys.length) await this.st.delete(keys); return Response.json({ n: keys.length }); }
    if (u.pathname === '/ack') { const { ids } = await req.json(); await this.st.delete(ids.filter(id => /^[\w-]+$/.test(id)).map(id => 'j:' + id)); return new Response('ok'); }
    if (u.pathname === '/pull') {
      await this.st.put('seen', Date.now());
      let jobs = await this.jobs();
      const old = jobs.filter(j => Date.now() - (+String(j.id).split('-')[0] || Date.now()) > 6 * 3600e3); // 🗑 бігунки старші 6 год — не друкувати після ремонту принтера
      if (old.length) { await this.st.delete(old.map(j => 'j:' + j.id)); jobs = jobs.filter(j => !old.includes(j)); }
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
export function kitchenTicket({ table, kind, lines, comment, by, urgent }, rc = RCPT_DEF) {
  return [
    ...(urgent ? [['invb', '!!! ТЕРМІНОВО !!!']] : []),
    [rc.kBig ? 'invb' : 'inv', +table > 1000 ? `${+table > 2000 ? 'САМОВИВІЗ' : 'ДОСТАВКА'} ${tn(table)}` : `СТІЛ ${table}`],
    ['c', rc.kTime ? `${kind}  ·  ${hhmm()}` : kind],
    ...(by && rc.kWaiter ? [['c', `Замовив: ${by}`]] : []),
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
  const pr = (bill.promo?.lines || []).filter(l => l.amt || (!final && / \(додайте в рахунок\)$/.test(l.n))).map(l => final ? { ...l, n: l.n.replace(/ \(додайте в рахунок\)$/, '') } : l); // 🎁 підказка «додайте» — лише на пречеку
  const rc = await getRcpt(env), qrn = rc.qr ? await (await import('./qr.js')).qrImg(env, 0) : '';
  return [
    ...(rc.logo ? [['logo']] : []),
    ...(rc.sub ? [['s', rc.sub]] : []), ...rc.head.map(h => ['c', h]),
    ['inv', final ? `${rc.title || 'ЧЕК'} № ${no}` : rc.pre || 'ПРЕЧЕК'],
    ...(final || !rc.preNote ? [] : [['s', rc.preNote]]),
    ['gap'],
    ['lr', +table > 2000 ? 'Самовивіз' : +table > 1000 ? 'Доставка' : 'Стіл', String(tn(table))],
    ...(bill.opened && rc.opened ? [['lr', 'Відкрито', fmt(bill.opened)]] : []),
    ...(by && rc.waiter ? [['lr', 'Обслуговував', String(by)]] : []),
    ['lr', final ? 'Закрито' : 'Надруковано', fmt(Date.now())],
    ['dbl'],
    ...[...agg].flatMap(([name, a]) => [['item', name, `${a.sum}`], ...(rc.itemSub ? [['sub', `${a.q} × ${Math.round(a.sum / a.q)} грн`]] : [])]),
    ['dbl'],
    ...(rc.count ? [['lr', 'Позицій', String(count)]] : []),
    ...(bill.disc || pr.length || bill.bonus ? [['lr', 'Сума', `${bill.total} грн`]] : []), ...(bill.disc ? [['lr', `Знижка ${bill.disc}%`, `−${discAmt(bill)} грн`]] : []),
    ...pr.map(l => ['lr', l.n, l.amt ? `−${l.amt} грн` : '']), ...(bill.bonus ? [['lr', bill.cert ? 'Сертифікат / бонуси' : 'Бонуси', `−${bill.bonus} грн`]] : []), // 🎁 акції й рівень (promo.js)
    ['total', final ? 'СПЛАЧЕНО' : 'ДО СПЛАТИ', `${payable(bill)} грн`],
    ...(bill.tip && rc.tips ? [['lr', 'Чайові', `${bill.tip} грн`]] : []), ...(bill.ktip && rc.tips ? [['lr', 'Подяка кухні', `${bill.ktip} грн`]] : []),
    ...((bill.tip || bill.ktip) && rc.tips ? [['lr', 'Разом з чайовими', `${payable(bill) + (bill.tip || 0) + (bill.ktip || 0)} грн`]] : []),
    ...(final && pay && rc.pay ? [['lr', 'Оплата', pay === 'online' ? 'Онлайн (LiqPay)' : pay === 'card' ? 'Картка' : pay === 'mix' ? 'Готівка + картка' : 'Готівка']] : []),
    ['gap'],
    ...rc.foot.map(f => ['c', f]),
    ...(qrn ? [['gap'], ['img', qrn, 130], ['s', rc.qrText]] : []),
    ...(rc.footS ? [['s', rc.footS]] : []),
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
  if (url.pathname === '/api/print/hello' && req.method === 'POST') { /* 🔎 програма друку повідомляє, які принтери знайшла; у відповідь — куди що друкувати (вибір у кабінеті) */
    const b = await req.json().catch(() => ({})), dev = [].concat(b.devices || []).slice(0, 30).map(d => ({ id: String(d.id || '').slice(0, 200), name: String(d.name || '').slice(0, 120), type: String(d.type || '').slice(0, 20) })).filter(d => d.id);
    await env.DB.put('print_dev', JSON.stringify({ at: Date.now(), pc: String(b.pc || '').slice(0, 60), ver: String(b.ver || '').slice(0, 20), using: String(b.using || '').slice(0, 200), list: dev }));
    const r = await getRoute(env); return Response.json({ route: { ...legacy(r), st: r.st } }, { headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
  if (url.pathname === '/api/print/ack') {
    // GET ?ids=a,b (старі Windows) або POST {ids}
    const ids = req.method === 'POST' ? [].concat((await req.json().catch(() => ({}))).ids || []) : (url.searchParams.get('ids') || '').split(',');
    await qcall(env, '/ack', { ids: ids.filter(Boolean) });
    return Response.json({ ok: true });
  }
  return new Response('not found', { status: 404 });
}
