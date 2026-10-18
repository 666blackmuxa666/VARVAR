// 🧱 Ядро закладу: дата/робочий день, гроші, рахунки столів (get/put), замки L(), стрічка подій, статистика, налаштування, зали й схема, групи меню, обрані, стоп-лист
// (частина ops.js — інші файли імпортують з ops.js, як і раніше)
import { getMenu, menuLock, saveMenu } from './menu.js';
import { getKq, putKq } from './ops-kitchen.js';
import { consume } from './stock.js';
import { ALS, cur } from './venue.js';

export const tg = (env, method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => new Response('{"ok":false}', { status: 502 })); // збій мережі до Telegram не валить дію каси (дія вже виконана)
export const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export const TZ = 'Europe/Kyiv';
export const hhmm = (t = Date.now()) => new Date(t).toLocaleTimeString('uk-UA', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
// робочий день закладу: з 03:00 до 03:00 (нічні продажі після півночі — у вчорашню виручку)
// ⚙️ о котрій закінчується робочий день (Налаштування → «🌙 День і Z-звіт»; ставиться на початку кожного запиту з cfg.dayH)
// межа робочого дня — своя в кожного закладу: зберігається в контексті запиту (venue.js), не в глобальній змінній
export const dayH = () => cur().dayH ?? 3;
export const setDayH = h => { if (h >= 0 && h <= 8) { const s = cur(); if (ALS.getStore()) s.dayH = h; } };
export const dayKey = (t = Date.now()) => new Date(t - dayH() * 3600e3).toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD
export const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));
export const money = n => `${Math.round(n).toLocaleString('uk-UA')} грн`;
export const YEAR = 400 * 86400, BILL_TTL = 12 * 3600;
export const LINE = /^(\d+)× (.+?) — (\d+)$/;
export const tablesCount = env => +env.TABLES || 15;

// повідомлення в чат персоналу (дії з POS дублюються в Telegram)
export const notify = (env, text, markup) => { if (env.INSTORE && /^\s*🖥/.test(text)) alog(env, text).catch(() => {}); return tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }); };
// 📜 журнал дій закладу: усі зміни з каси («🖥 … — хто») — по місяцях, без окремих запитів (запис усередині Store)
async function alog(env, text) {
  const t = String(text).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/^\s*🖥\s*/, '').slice(0, 400), k = 'alog:' + dayKey().slice(0, 7);
  await L(env, k, async () => { const l = (await env.DB.get(k, 'json')) || []; l.push({ at: Date.now(), t }); await env.DB.put(k, JSON.stringify(l.slice(-3000))); });
}
export const alogGet = async (env, m) => ((await env.DB.get('alog:' + (/^\d{4}-\d{2}$/.test(m || '') ? m : dayKey().slice(0, 7)), 'json')) || []).reverse();

// ---------- рахунки ----------
export const getBill = async (env, t) => (await env.DB.get('bill:' + t, 'json')) || { total: 0, orders: 0, log: [] };
export const putBill = (env, t, b) => b.total > 0 ? env.DB.put('bill:' + t, JSON.stringify(b), { expirationTtl: BILL_TTL }) : env.DB.delete('bill:' + t);
// discSum — знижка фіксованою сумою (після об'єднання столів з різними знижками); інакше — відсоток від суми
export const discAmt = b => b.discSum != null ? Math.max(0, Math.min(b.total || 0, b.discSum)) : Math.round((b.total || 0) * (b.disc || 0) / 100);
export const payable = b => Math.max(0, (b.total || 0) - discAmt(b) - (b.bonus || 0) - (b.promo?.sum || 0)); // 🎁 bonus — списані бонуси клієнта; promo — акції/рівень (promo.js)
export async function openTables(env) {
  const keys = (await env.DB.list({ prefix: 'bill:' })).keys.map(k => k.name);
  const bills = keys.length ? await env.DB.getMany(keys, 'json') : [];
  return keys.map((k, i) => ({ t: +k.slice(5), b: bills[i] })).filter(r => r.b && r.b.total > 0).sort((a, b) => a.t - b.t);
}
export function billItems(b) {
  const m = new Map();
  for (const o of b.log || []) for (const l of o.lines) { const x = l.match(LINE); if (!x) continue; const a = m.get(x[2]) || { q: 0, sum: 0 }; a.q += +x[1]; a.sum += +x[3]; m.set(x[2], a); }
  return [...m].map(([name, a]) => ({ name, ...a }));
}

// ---------- статистика ----------
// історія (day: closed: exp: dish: z:) зберігається безстроково — роки звітів
async function _bump(env, key, fn) { const d = (await env.DB.get(key, 'json')) || {}; fn(d); await env.DB.put(key, JSON.stringify(d)); }
export const addStat = (env, field, n) => bump(env, 'day:' + dayKey(), d => { d[field] = (d[field] || 0) + n; });
// продажі страв за місяць: { назва: [кількість, сума] }
// продажі страв за місяць + 🧮 склад: списання продуктів за техкартами (stock: false — склад не чіпаємо: чек знято/повернуто у виручку)
export async function addDishes(env, items, day = dayKey(), { stock = true } = {}) {
  await bump(env, 'dish:' + day.slice(0, 7), d => { for (const { n, q, sum } of items) { const x = d[n] || [0, 0]; d[n] = [x[0] + q, x[1] + sum]; } });
  if (stock) await consume(env, items).catch(e => console.log('stock', e.message)); // склад не має ламати замовлення
}
async function _logClosed(env, rec) {
  const k = 'closed:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  list.push(rec); let j = JSON.stringify(list);
  // 🧾 без ліміту кількості: якщо день наближається до межі запису (2 МБ), у найстаріших чеків прибираємо деталі (страви, хронологію), гроші й оплати LiqPay лишаються — Z і звіти точні
  for (let i = 0; j.length > 1.8e6 && i < list.length - 1; i++) { const x = list[i]; if (x.slim) continue; delete x.dishes; delete x.voids; delete x.gt; delete x.promo; x.slim = 1; if (i % 50 === 49) j = JSON.stringify(list); }
  if (j.length > 1.8e6) j = JSON.stringify(list);
  await env.DB.put(k, j);
}

// ---------- 🔒 замки: «прочитав → змінив → записав» з різних запитів не губить зміни одне одного ----------
export const L = (env, keys, fn) => env.DB.locked ? env.DB.locked(keys, fn) : fn();
export const editEv = (env, fn) => L(env, 'ev:' + dayKey(), async () => { const k = 'ev:' + dayKey(), l = (await env.DB.get(k, 'json')) || []; fn(l); await env.DB.put(k, JSON.stringify(l), { expirationTtl: 3 * 86400 }); });
export const kqMut = (env, fn) => L(env, 'kq:' + dayKey(), async () => { const l = await getKq(env); const r = await fn(l); if (r !== false) await putKq(env, l); return r; });

// ---------- стрічка подій (панель POS) ----------
// kind: guest · check · waiter · acc · close · del · move · disc · rm · pre
async function _logEvent(env, ev) {
  const k = 'ev:' + dayKey(); const list = (await env.DB.get(k, 'json')) || [];
  const e = { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), at: hhmm(), ...ev };
  list.push(e); await env.DB.put(k, JSON.stringify(list.slice(-200)), { expirationTtl: 3 * 86400 });
  return e;
}
export const getEvents = async (env, day = dayKey()) => {
  const l = (await env.DB.get('ev:' + day, 'json')) || [];
  if (day === dayKey() && !(await env.DB.get('bfprev:' + day))) { await env.DB.put('bfprev:' + day, '1', { expirationTtl: 2 * 86400 }); await backfillPrev(env, day, l); }
  return l;
};
// старі події дня без «вже на столі»: відтворюємо стіл з попередніх подій (закриття/видалення — обнуляють, перенос — переносить)
async function backfillPrev(env, day, l) {
  const T = {}, add = (t, lines) => { const m = (T[t] ||= new Map()); for (const s of lines || []) { const x = s.match(LINE); if (x) m.set(x[2], (m.get(x[2]) || 0) + +x[1]); } };
  let ch = false;
  for (const e of l) {
    const t = +e.t;
    if ((e.k === 'waiter' || e.k === 'guest') && e.lines?.length) {
      if (!e.prev && T[t]?.size) { e.prev = [...T[t]].filter(([, q]) => q > 0).map(([n, q]) => `${q}× ${n}`); ch = true; }
      add(t, e.lines);
    } else if (e.k === 'close' || e.k === 'del') delete T[t];
    else if (e.k === 'move' && e.from) { const a = T[+e.from]; delete T[+e.from]; if (a) { const m = (T[t] ||= new Map()); for (const [n, q] of a) m.set(n, (m.get(n) || 0) + q); } }
  }
  if (ch) await env.DB.put('ev:' + day, JSON.stringify(l), { expirationTtl: 3 * 86400 });
}
// максимальна знижка для офіціанта (адмін — будь-яка)
export const WAITER_DISC_MAX = 20;
// ⚙️ налаштування системи (змінюються в касі «Налаштування» і в боті)
export const CFG_DEF = { tables: 0, discMax: WAITER_DISC_MAX, scanMin: 60, foodCost: 30, priceAlert: 5, lateMin: 10, lateFine: 0, dayH: 3, autoZ: 0, zPrint: 1, zTg: 1, zRemind: 1, semiCalc: 1, bankFee: 0, recBonus: 0 };
export const CFG_LIM = { tables: [0, 200], discMax: [0, 100], scanMin: [10, 600], foodCost: [5, 90], priceAlert: [1, 100], lateMin: [0, 120], lateFine: [0, 5000], dayH: [0, 8], autoZ: [0, 1], zPrint: [0, 1], zTg: [0, 1], zRemind: [0, 1], semiCalc: [0, 1], bankFee: [0, 10], recBonus: [0, 10000] };
export const getCfg = async env => ({ ...CFG_DEF, ...((await env.DB.get('cfg', 'json')) || {}) });
// 🏛 зали: [{ n: назва, ic: емодзі, c: столів }] — столи нумеруються підряд (Зал 1: 1–15, Тераса: 16–25…), тож старі номери й QR не ламаються
export const hallsOf = c => (c.halls?.length ? c.halls : [{ n: 'Зал', ic: '🪑', c: c.tables || 0 }]);
export async function setHalls(env, halls, go) {
  const IC = ['🪑', '🌿', '🍸', '🛋', '🎉', '☀️', '🏠', '🌙'];
  const l = (Array.isArray(halls) ? halls : []).slice(0, 12).map(h => ({ n: String(h.n || '').trim().slice(0, 24) || 'Зал', ic: IC.includes(h.ic) ? h.ic : '🪑', c: Math.round(+h.c) }));
  if (l.some(h => !(h.c >= 1 && h.c <= 100))) return { error: 'У залі від 1 до 100 столів' };
  const tot = l.reduce((a, h) => a + h.c, 0); if (tot > 200) return { error: 'Разом до 200 столів' };
  // 🛡 не зменшувати кількість столів, поки за «зниклим» столом відкритий рахунок (гроші зависли б поза залом)
  if (l.length) { const n0 = (await getCfg(env)).tables || 0; if (tot < n0) for (const k of (await env.DB.list({ prefix: 'bill:' })).keys.map(x => +x.name.slice(5))) if (k > tot && k <= n0) { const x = await env.DB.get('bill:' + k, 'json'); if (x?.items?.length || x?.total > 0) return { error: `Стіл ${k} відкритий — спершу закрийте його` }; } }
  return L(env, 'cfg', async () => { const c = await getCfg(env); if (l.length) { c.halls = l; c.tables = tot; } else delete c.halls;
    { const st = new Set(); let f = 1; for (const h of hallsOf(c)) { st.add(String(f)); f += h.c; } for (const o of ['deco', 'floor']) if (c[o]) for (const k of Object.keys(c[o])) if (!st.has(k)) delete c[o][k]; } /* 🗺 декор і підлога залів, яких більше нема */ c.goTabs = [0, 1, 2].includes(+go) ? +go : 0; await env.DB.put('cfg', JSON.stringify(c)); return c; });
}
// 🗺 схема залу: { стіл: [x, y] } у відсотках площі залу; надсилається вся схема одного залу (from..to)
// 🗺 схема залу: місця столів {t:[x%,y%,форма,поворот]} + декор і підлога залу (ключ — перший стіл залу)
const MAP_SH = ['s', 'r', 'l', 'b', 't'], MAP_K = ['wall', 'win', 'door', 'col', 'bar', 'sofa', 'plant', 'tree', 'umb', 'rug', 'stage', 'stairs'], MAP_FL = ['wood', 'herring', 'tile', 'stone', 'concrete', 'grass'];
export const pct = v => Math.round(Math.min(100, Math.max(0, +v || 0)) * 2) / 2, deg = v => ((Math.round((+v || 0) / 15) * 15) % 360 + 360) % 360;
export async function setMap(env, pos, from, to, deco, floor) {
  return L(env, 'cfg', async () => { const c = await getCfg(env), n = c.tables || 200, m = { ...(c.map || {}) }; if (!(+from >= 1 && +to >= +from)) return c; from = Math.min(n, Math.max(1, +from)); to = Math.min(n, +to);
    for (const t of Object.keys(m)) if (+t >= from && +t <= to || +t > n) delete m[t];
    for (const [t, p] of Object.entries(pos || {})) { const k = +t; if (!(k >= from && k <= to) || !Array.isArray(p)) continue; const v = [pct(p[0]), pct(p[1])], sh = MAP_SH.includes(p[2]) ? p[2] : 's', r = deg(p[3]); if (sh !== 's' || r) v.push(sh, r); m[k] = v; }
    c.map = m;
    if (Array.isArray(deco)) { c.deco = { ...(c.deco || {}) }; const l = deco.filter(x => Array.isArray(x) && MAP_K.includes(x[0]) && isFinite(x[1]) && isFinite(x[2]) && x[1] !== '' && x[2] !== '').slice(0, 150).map(x => [x[0], pct(x[1]), pct(x[2]), deg(x[3]), Math.max(0, Math.min(700, Math.round(+x[4] || 0)))]); if (l.length) c.deco[from] = l; else delete c.deco[from]; }
    if (MAP_FL.includes(floor)) c.floor = { ...(c.floor || {}), [from]: floor };
    await env.DB.put('cfg', JSON.stringify(c)); return c; });
}
export async function setCfg(env, k, v) {
  if (!CFG_LIM[k]) return { error: 'Невідоме налаштування' };
  v = k === 'bankFee' ? Math.round(+v * 100) / 100 : Math.round(+v); const [lo, hi] = CFG_LIM[k]; /* комісія банку — до сотих: 1.3 */ if (!(v >= lo && v <= hi)) return { error: `Від ${lo} до ${hi}` };
  return L(env, 'cfg', async () => { const c = await getCfg(env); c[k] = v; await env.DB.put('cfg', JSON.stringify(c)); return c; });
}

// ---------- групи меню (кухня / бар / кальян) — однаково в боті й POS ----------
const KITCHEN = ['minimax', 'pasta', 'burgers', 'salads', 'snacks', 'soups', 'pans', 'extras'];
// 🧩 Інше — технічні позиції лише для каси/бота (гості їх не бачать): бій посуду, упаковка, позиції поза меню
export const TECH = ['inshe-food', 'inshe-posud', 'inshe-serv', 'inshe', 'upakuvannia'];
export const GROUPS = [{ id: 'kitchen', name: '🍳 Кухня' }, { id: 'bar', name: '🍹 Бар' }, { id: 'hookah', name: '💨 Кальян' }, { id: 'other', name: '🧩 Інше' }];
export const groupOf = cat => cur().cg?.[cat] || (TECH.includes(cat) || String(cat).startsWith('inshe') ? 'other' : cat === 'hookah' ? 'hookah' : KITCHEN.includes(cat) ? 'kitchen' : 'bar');
// ⭐ обрані страви — спільний список для всіх офіціантів
export const getFav = async env => (await env.DB.get('fav', 'json')) || [];
async function _toggleFav(env, id, on) {
  const l = (await getFav(env)).filter(x => x !== id); if (on) l.push(id);
  await env.DB.put('fav', JSON.stringify(l)); return l;
}
// назва позиції з рахунку («Pepsi 0.5 л») → страва меню (найдовший збіг назви)
export function dishResolver(menu) {
  const all = menu.categories.flatMap(c => c.items.map(it => ({ n: it.name.uk, cat: c.id, cname: c.name.uk, ...(it.st ? { st: it.st } : {}), ...(c.st ? { cst: c.st } : {}) }))).sort((a, b) => b.n.length - a.n.length);
  const memo = new Map();
  return name => { if (!memo.has(name)) memo.set(name, all.find(x => name === x.n || name.startsWith(x.n + ' ')) || null); return memo.get(name); };
}

// ---------- стоп-лист ----------
export const setHidden = (env, ...a) => menuLock(env, () => _setHidden(env, ...a));
async function _setHidden(env, id, hidden) {
  const menu = await getMenu(env); const it = menu.categories.flatMap(c => c.items).find(i => i.id === id);
  if (!it) return null;
  if (hidden) it.hidden = true; else delete it.hidden;
  await saveMenu(env, menu);
  return it;
}

// ---------- тест (прибрати перед запуском — лише коли скаже власник) ----------
export async function resetAll(env) {
  let n = 0;
  for (const prefix of ['day:', 'closed:', 'dish:', 'bill:', 'ord:', 'rl:', 'exp:', 'ev:', 'z:', 'shift', 'mov:', 'tipbal', 'tippay:', 'void:', 'kq:']) {
    const keys = (await env.DB.list({ prefix })).keys.map(k => k.name);
    await env.DB.deleteMany(keys); n += keys.length;
  }
  return n;
}

// ---------- обгортки із замками (див. L) ----------
export async function bump(env, ...a) { return L(env, a[0], () => _bump(env, ...a)); }
export async function logClosed(env, ...a) { return L(env, 'closed:' + dayKey(), () => _logClosed(env, ...a)); }
export async function logEvent(env, ...a) { const e = await L(env, 'ev:' + dayKey(), () => _logEvent(env, ...a)); if (env.VAPID_PUB) await (await import('./push.js')).pushEvent(env, e).catch(() => {}); return e; } // 🔔 подія → шторка
export const cDay = d => isDay(d) && d <= dayKey() ? d : dayKey();
export async function toggleFav(env, ...a) { return L(env, 'fav', () => _toggleFav(env, ...a)); }
