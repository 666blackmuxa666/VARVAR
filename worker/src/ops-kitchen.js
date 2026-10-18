// 👨‍🍳 Кухня: цехи (станції), черга кухонного екрана, готовність, статистика кухні
// (частина ops.js — інші файли імпортують з ops.js, як і раніше)
import { courNotify } from './courier.js';
import { goKitchen } from './delivery.js';
import { getMenu, menuLock, saveMenu } from './menu.js';
import { L, LINE, dayKey, dishResolver, editEv, groupOf, hhmm, logEvent } from './ops-core.js';
import { dayList } from './ops-money.js';

// ---------- 🍳 цехи кухні (cfg.stations; порожньо = як раніше: одна кухня за групами) ----------
// станція: { id, name, emoji, g:[групи меню, що йдуть сюди за замовчуванням], pr: id принтера, scr: 0 — без екрана }
const ST_GROUPS = ['kitchen', 'bar', 'hookah', 'other'];
export function cleanStations(v) {
  const out = [], ids = new Set();
  for (const x of [].concat(v || []).slice(0, 8)) {
    const id = String(x?.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 12), name = String(x?.name || '').trim().slice(0, 20);
    if (!id || !name || ids.has(id)) continue; ids.add(id);
    out.push({ id, name, emoji: String(x.emoji || '').trim().slice(0, 4), g: ST_GROUPS.filter(g => [].concat(x.g || []).includes(g)), pr: String(x.pr || '').replace(/[^\w-]/g, '').slice(0, 12), scr: x.scr === 0 || x.scr === false ? 0 : 1 });
  }
  return out;
}
export const getStations = async env => cleanStations(((await env.DB.get('cfg', 'json')) || {}).stations);
// цех страви: перевизначення на позиції → цех категорії → цех за групою → перший
export function stationOf(d, sts) {
  if (!sts.length) return null; const id = d?.st || d?.cst;
  return (id && sts.find(x => x.id === id)) || sts.find(x => x.g.includes(groupOf(d?.cat))) || sts[0];
}
export const stLabel = (sts, id) => { const s = sts.find(x => x.id === id); return s ? (s.emoji ? s.emoji + ' ' : '') + s.name : ''; };
export async function setStations(env, list, cats) {
  const sts = cleanStations(list);
  await L(env, 'cfg', async () => { const c = (await env.DB.get('cfg', 'json')) || {}; if (sts.length) c.stations = sts; else delete c.stations; await env.DB.put('cfg', JSON.stringify(c)); });
  if (cats && typeof cats === 'object') await menuLock(env, async () => { const m = await getMenu(env); let ch = false;
    for (const c of m.categories) if (c.id in cats) { const v = sts.some(x => x.id === cats[c.id]) ? cats[c.id] : ''; if ((c.st || '') !== v) { if (v) c.st = v; else delete c.st; ch = true; } }
    if (ch) await saveMenu(env, m); });
  return sts;
}
export async function setItemStation(env, id, st) {
  const sts = await getStations(env); return menuLock(env, async () => { const m = await getMenu(env), it = m.categories.flatMap(c => c.items).find(i => i.id === id); if (!it) return null;
    if (st && sts.some(x => x.id === st)) it.st = st; else delete it.st; await saveMenu(env, m); return it; });
}
// вигляд черги для цеху: лише позиції цеху (індекси — у межах цеху), «готово» — коли готовий цех
export function kqView(list, st) {
  if (!st) return list;
  return list.map(e => { const items = e.items.filter(x => x.st === st); if (!items.length) return null; const done = items.every(x => x.done || x.cancel) ? 1 : 0; return { ...e, items, done: e.done || done, ...(done && !e.doneAt ? { doneAt: Date.now() } : {}) }; }).filter(Boolean);
}

// ---------- 👨‍🍳 кухонний екран: черга замовлень кухні ----------
// kq:день = [{ id, ts, at, t, by, src, tw, urgent, comment, items:[{n,q,done,cancel}], start, done, doneAt, msgs:[{at,text}] }]
const KQ_CATS = c => groupOf(c) === 'kitchen' || c === 'inshe-food';
export const getKq = async (env, day = dayKey()) => (await env.DB.get('kq:' + day, 'json')) || [];
export const putKq = (env, l, day = dayKey()) => env.DB.put('kq:' + day, JSON.stringify(l.slice(-400)));
async function _addKitchen(env, { t, by, src, comment = '', lines, urgent = false }) {
  const res = dishResolver(await getMenu(env)), sts = await getStations(env), items = [];
  for (const l of lines || []) { const x = l.match(LINE); if (!x) continue; const d = res(x[2]);
    if (!d) continue; if (sts.length) { const z = stationOf(d, sts); if (z.scr) items.push({ n: x[2], q: +x[1], st: z.id, sl: z.emoji || z.name }); } else if (KQ_CATS(d.cat)) items.push({ n: x[2], q: +x[1] }); }
  if (!items.length) return null;
  const l = await getKq(env), e = { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), at: hhmm(), t: +t, by: by || '', src, tw: /З СОБОЮ/.test(comment || ''), urgent: !!urgent, comment: String(comment || '').replace(/З СОБОЮ\s*·?\s*/, '').trim(), items };
  l.push(e); await putKq(env, l); return e;
}
async function _kqEdit(env, id, fn) { const l = await getKq(env), e = l.find(x => x.id === id); if (!e) return null; const r = fn(e); await putKq(env, l); return r === false ? null : e; }
// i — номер страви або null (усе замовлення)
export async function kitchenDone(env, id, i, who, st) {
  const sts = await getStations(env); let full = [];
  const stDone = e => { const m = {}; for (const x of e.items) if (x.st) m[x.st] = (m[x.st] ?? true) && !!(x.done || x.cancel); return new Set(Object.keys(m).filter(k => m[k])); }; // цехи, де все готове
  const e = await kqEdit(env, id, e => { if (e.done) return false; const pool = st ? e.items.filter(x => x.st === st) : e.items; // цех бачить лише свої позиції — індекс у межах цеху
    if (st && !pool.length) return false; const pre = stDone(e);
    if (i == null) pool.forEach(x => { if (!x.cancel) x.done = 1; }); else if (pool[+i]) pool[+i].done = pool[+i].done ? 0 : 1; else return false;
    full = [...stDone(e)].filter(k => !pre.has(k));
    if (e.items.every(x => x.done || x.cancel)) { e.done = 1; e.doneAt = Date.now(); } });
  if (e && !e.done) for (const z of full) await logEvent(env, { k: 'ready', part: 1, kid: e.id, st: z, t: e.t, by: who, text: `${stLabel(sts, z)}: готово` }); // 🍳 цех віддав усе своє
  const it = i != null && (st ? e?.items.filter(x => x.st === st) : e?.items)[+i];
  if (it && it.done && !e.done) await logEvent(env, { k: 'ready', part: 1, kid: e.id, ki: e.items.indexOf(it), t: e.t, by: who, text: `${it.q}× ${it.n}` }); // одна страва готова
  if (it && !it.done) await dropEvents(env, x => x.k === 'ready' && x.kid === e.id && x.ki === e.items.indexOf(it)); // випадково натиснув — прибрати «готово» зі стрічки
  if (e?.done) await goKitchen(env, e.t, 'ready').catch(() => {});
  if (e?.done) await logEvent(env, { k: 'ready', kid: e.id, t: e.t, by: who, text: e.items.filter(x => !x.cancel).map(x => `${x.q}× ${x.n}`).join(', '), mins: Math.round((e.doneAt - e.ts) / 60000) });
  return e;
}
export const kitchenStart = (env, id, who) => kqEdit(env, id, e => { if (e.done || e.start) return false; e.start = Date.now(); }).then(async e => { if (e) { await logEvent(env, { k: 'cooking', t: e.t, by: who }); await goKitchen(env, e.t, 'cook').catch(() => {}); } return e; });
export const kitchenUndo = (env, id) => kqEdit(env, id, e => { if (!e.done || Date.now() - e.doneAt > 30 * 60e3) return false; e.done = 0; delete e.doneAt; e.items.forEach(x => { x.done = 0; }); })
  .then(async e => { if (e) await dropEvents(env, x => x.k === 'ready' && x.kid === id); return e; });
const dropEvents = (env, fn) => editEv(env, l => { const n = l.filter(x => !fn(x)); l.length = 0; l.push(...n); });
export async function kitchenMsg(env, id, text, who) {
  text = String(text || '').trim().slice(0, 120); if (!text) return null;
  const e = await kqEdit(env, id, e => { (e.msgs ||= []).push({ at: hhmm(), text }); });
  if (e) await logEvent(env, { k: 'kmsg', t: e.t, by: who, text });
  if (e && e.t > 1000) await courNotify(env, e.t, 'msg', text).catch(() => {}); // кухня → кур'єру
  return e;
}
// стіл закрито/звільнено — активні картки кухні цих столів знімаються з черги (без «готово» у стрічку)
async function _kitchenClosed(env, tables) {
  const l = await getKq(env); let ch = false;
  for (const e of l) if (!e.done && !e.paid && tables.includes(e.t)) { e.paid = 1; ch = true; } /* 💰 стіл розрахували — страви НЕ зникають з кухні (з собою платять одразу), лише позначка «оплачено»; зникають після «Готово» */
  if (ch) await putKq(env, l);
}
// скасування з рахунку → на кухні страва червона «СКАСОВАНО» (name=null — увесь стіл)
async function _kitchenCancel(env, t, name, since = 0) {
  const l = await getKq(env), out = []; let ch = false;
  for (let k = l.length - 1; k >= 0; k--) { const e = l[k]; if (e.t !== t || e.done) continue;
    for (const x of e.items) if (!x.cancel && (name == null || x.n === name)) {
      const cooked = !!(x.done || e.start); // кухня вже взяла в роботу або зробила
      if (name != null && x.q > 1) { x.q--; x.canc = (x.canc || 0) + 1; out.push({ n: x.n, q: 1, cooked }); } else { out.push({ n: x.n, q: name != null ? 1 : x.q, cooked }); x.cancel = 1; }
      ch = true; if (name != null) break; }
    if (e.items.every(x => x.done || x.cancel)) { e.done = 1; e.doneAt = Date.now(); e.cancelled = 1; }
    if (ch && name != null) break; }
  // уже видані з кухні (картка закрита «готово») цього стола — точно приготовані
  if (since) for (const e of l) if (e.t === t && e.done && !e.closed && !e.cancelled && e.ts >= since) for (const x of e.items) if (!x.cancel && (name == null ? true : x.n === name && !out.length)) out.push({ n: x.n, q: name != null ? 1 : x.q, cooked: true });
  if (ch) await putKq(env, l);
  return out;
}
// ⏱ статистика кухні: час від замовлення до «готово»
export async function kitchenStats(env, from, to) {
  const days = dayList(from, to).slice(0, 400), ll = await env.DB.getMany(days.map(d => 'kq:' + d), 'json');
  return days.flatMap((d, i) => (ll[i] || []).filter(e => e.done && !e.cancelled && !e.closed && e.doneAt).map(e => ({ d, at: e.at, t: e.t, mins: (e.doneAt - e.ts) / 60000, items: e.items.filter(x => !x.cancel).map(x => [x.n, x.q]) })));
}
export async function addKitchen(env, ...a) { const e = await L(env, 'kq:' + dayKey(), () => _addKitchen(env, ...a)); if (e) await (await import('./kitbot.js')).kitNotify(env, e).catch(() => {}); return e; } // 👨‍🍳 → бот кухні
async function kqEdit(env, ...a) { const e = await L(env, 'kq:' + dayKey(), () => _kqEdit(env, ...a)); if (e) await (await import('./kitbot.js')).kitSync(env, e).catch(() => {}); return e; }
export async function kitchenClosed(env, ...a) { return L(env, 'kq:' + dayKey(), () => _kitchenClosed(env, ...a)); }
export async function kitchenCancel(env, t, ...a) { const r = await L(env, 'kq:' + dayKey(), () => _kitchenCancel(env, t, ...a)); if (r?.length) await (await import('./kitbot.js')).kitSyncTable(env, t).catch(() => {}); return r; }
