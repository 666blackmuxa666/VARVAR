// 💰 Гроші й звіти: витрати, рух коштів, залишки, звірка, зміна, Z/X-звіти, рекорд дня, звіти за період
// (частина ops.js — інші файли імпортують з ops.js, як і раніше)
import { agSum, agLine, agRows, agTotal } from './agg.js';
import { fisOn, fisRetry, fisMov, fisZ, fisDay } from './fiscal.js';
import { courOwed } from './courier.js';
import { getMenu } from './menu.js';
import { tipSplitOf } from './ops-bill.js';
import { getClosed } from './ops-closed.js';
import { GROUPS, L, TZ, bump, cDay, dayH, dayKey, dishResolver, esc, getCfg, groupOf, hhmm, logEvent, money, notify, openTables, payable, pct } from './ops-core.js';
import { queuePrint } from './print.js';

// ---------- фінанси ----------
export const getExp = async (env, day = dayKey()) => (await env.DB.get('exp:' + day, 'json')) || [];
async function _addExpense(env, e, day = dayKey()) { const k = 'exp:' + day; const l = await getExp(env, day); l.push({ ts: Date.now(), at: hhmm(), ...e }); await env.DB.put(k, JSON.stringify(l)); return l.length - 1; }
// 🗑/↩️ запис дня (витрата / рух коштів / Z-звіт): прапорець del, будь-який день
async function _flagRec(env, pfx, day, i, del, force) { const k = pfx + day, l = (await env.DB.get(k, 'json')) || []; const x = l[+i]; if (!x || !!x.del === del) return false; if (del && x.inv && !force) return 'inv'; /* 🧾 оплата накладної — скасовується лише через накладну, інакше борг зникне */ if (del) x.del = 1; else delete x.del; await env.DB.put(k, JSON.stringify(l)); return true; }
// ---------- рух коштів (не витрати): внесення / вилучення готівки, обмін картка ↔ готівка ----------
// type: in (+готівка) · out (−готівка) · k2c (з картки в готівку) · c2k (з готівки на картку) · kin (+картка) · kout (−картка)
export const MOVE = { in: '➕ Внесення готівки', out: '➖ Вилучення готівки', k2c: '🔁 Картка → готівка', c2k: '🔁 Готівка → картка', kin: '➕ Внесення на картку', kout: '➖ Вилучення з картки' };
// службові рухи (не вводяться вручну): видача чайових
export const MOVE_ALL = { ...MOVE, tipc: '💝 Чайові видано готівкою', tipk: '💝 Чайові видано з картки', adjc: '✏️ Звірка готівки', adjk: '✏️ Звірка картки', salc: '👷 Зарплата готівкою', salk: '👷 Зарплата з картки' };
export const moveCash = m => m.del ? 0 : ({ in: 1, out: -1, k2c: 1, c2k: -1, tipc: -1, adjc: 1, salc: -1 }[m.type] || 0) * m.sum;
export const moveCard = m => m.del ? 0 : ({ k2c: -1, c2k: 1, kin: 1, tipk: -1, kout: -1, adjk: 1, salk: -1 }[m.type] || 0) * m.sum;
export const getMov = async (env, day = dayKey()) => (await env.DB.get('mov:' + day, 'json')) || [];
export const SUM_MAX = 1e6; // 🛡 стеля однієї грошової операції в касі (грн): відсікає Infinity/1e15/сміття
async function _addMove(env, m) {
  if (!MOVE[m.type] || !(m.sum > 0 && m.sum <= SUM_MAX)) return null;
  const k = 'mov:' + dayKey(), l = await getMov(env); const e = { ts: Date.now(), at: hhmm(), type: m.type, sum: Math.round(m.sum), note: String(m.note || '').slice(0, 100), by: m.by || '' };
  l.push(e); await env.DB.put(k, JSON.stringify(l));
  /* у стрічку не пишемо — рухи грошей видно лише в касі */
  return e;
}
// 💰 залишки за весь час (змін немає — усе переходить з дня в день):
// готівка = продажі готівкою + рух готівки − витрати з каси; картка = продажі карткою + рух картки − витрати з картки
export async function balances(env) {
  const [dk, ek, mk] = await Promise.all(['day:', 'exp:', 'mov:'].map(p => env.DB.list({ prefix: p })));
  const names = l => l.keys.map(k => k.name), get = async n => n.length ? env.DB.getMany(n, 'json') : [];
  const [dd, ee, mm] = await Promise.all([get(names(dk)), get(names(ek)), get(names(mk))]);
  const r = { saleCash: 0, saleCard: 0, exCash: 0, exCard: 0, mvCash: 0, mvCard: 0, tipCash: 0, tipCard: 0, adjCash: 0, adjCard: 0 };
  dd.forEach(d => { if (!d) return; r.saleCash += d.cash ?? d.closed ?? 0; r.saleCard += d.card || 0; });
  ee.forEach(l => (l || []).forEach(e => { if (e.del) return; if (e.src === 'card') r.exCard += e.sum; else r.exCash += e.sum; }));
  mm.forEach(l => (l || []).forEach(m => { if (m.del) return;
    if (m.type === 'tipc') r.tipCash += m.sum; else if (m.type === 'tipk') r.tipCard += m.sum;
    else if (m.type === 'adjc') r.adjCash += m.sum; else if (m.type === 'adjk') r.adjCard += m.sum;
    else { r.mvCash += moveCash(m); r.mvCard += moveCard(m); } }));
  r.cash = r.saleCash + r.mvCash - r.exCash - r.tipCash + r.adjCash;
  { const o = await courOwed(env).catch(() => ({ sum: 0, by: {} })); r.courOwed = o.sum; r.courBy = o.by; r.cash -= o.sum; } // 🛵 ще в кур'єрів
  r.card = r.saleCard + r.mvCard - r.exCard - r.tipCard + r.adjCard;
  r.total = r.cash + r.card;
  r.tipOwed = Object.values((await env.DB.get('tipbal', 'json')) || {}).reduce((a, v) => a + (v > 0 ? v : 0), 0); // ще не видані чайові — гроші персоналу
  r.free = r.total - r.tipOwed; r.from = names(dk).map(k => k.slice(4)).sort()[0] || '';
  return r;
}
// ✏️ звірка: вписали фактичний залишок — різниця записується коригуванням
async function _reconcile(env, src, actual, who) {
  actual = Math.round(+actual); if (!(actual >= 0 && actual <= 1e8)) return null;
  const b = await balances(env), was = src === 'card' ? b.card : b.cash, diff = actual - was;
  if (!diff) return { diff: 0, was, actual };
  const k = 'mov:' + dayKey(), l = await getMov(env);
  l.push({ ts: Date.now(), at: hhmm(), type: src === 'card' ? 'adjk' : 'adjc', sum: diff, note: `було ${was}, факт ${actual}`, by: who || '' }); await env.DB.put(k, JSON.stringify(l));
  await logEvent(env, { k: 'shift', by: who, text: `✏️ Звірка ${src === 'card' ? 'картки' : 'готівки'}: факт ${actual} грн (${diff > 0 ? '+' : ''}${diff})` });
  return { diff, was, actual };
}
export const setFloat = (env, n) => bump(env, 'day:' + dayKey(), d => { n = Math.round(+n); d.float = n >= 0 && n <= SUM_MAX ? n : 0; });
export async function cashData(env) {
  const d = (await env.DB.get('day:' + dayKey(), 'json')) || {};
  const exp = await getExp(env); const ex = exp.filter(e => !e.del);
  const exCash = ex.filter(e => e.src === 'cash').reduce((s, e) => s + e.sum, 0), exCard = ex.filter(e => e.src === 'card').reduce((s, e) => s + e.sum, 0);
  const open = (await openTables(env)).reduce((s, r) => s + payable(r.b), 0);
  const mov = await getMov(env), mvCash = mov.reduce((a, m) => a + moveCash(m), 0), mvCard = mov.reduce((a, m) => a + moveCard(m), 0);
  const tipOut = mov.filter(m => !m.del && (m.type === 'tipc' || m.type === 'tipk')).reduce((a, m) => a + m.sum, 0);
  const salOut = mov.filter(m => !m.del && (m.type === 'salc' || m.type === 'salk')).reduce((a, m) => a + m.sum, 0); // 👷 зарплата — теж витрата
  return { day: dayKey(), float: d.float || 0, cash: d.cash || 0, card: d.card || 0, onl: d.onl || 0, ...(d.ag ? { ag: d.ag } : {}), disc: d.disc || 0, tip: d.tip || 0, exCash, exCard, mvCash, mvCard, tipOut, salOut, net: (d.cash || 0) + (d.card || 0) - (d.tip || 0) - exCash - exCard - salOut, open, exp, mov }; // як у Z-звіті: без чайових
}
export async function sumDays(env, keys) {
  const days = await env.DB.getMany(keys.map(k => 'day:' + k), 'json'), exps = await env.DB.getMany(keys.map(k => 'exp:' + k), 'json');
  return keys.reduce((a, _, i) => {
    const d = days[i] || {}, e = (exps[i] || []).filter(x => !x.del).reduce((s, x) => s + x.sum, 0);
    return { closed: a.closed + (d.closed || 0) - (d.tip || 0), tip: a.tip + (d.tip || 0), tables: a.tables + (d.tables || 0), orders: a.orders + (d.orders || 0),
      cash: a.cash + (d.cash ?? d.closed ?? 0), card: a.card + (d.card || 0), onl: (a.onl || 0) + (d.onl || 0), disc: a.disc + (d.disc || 0), exp: a.exp + e };
  }, { closed: 0, tip: 0, tables: 0, orders: 0, cash: 0, card: 0, disc: 0, exp: 0 });
}
const daysOfMonth = (ym, upto) => [...Array(upto)].map((_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
export async function reportsData(env) {
  const now = Date.now(), today = dayKey(), ym = today.slice(0, 7);
  const [y, mo] = ym.split('-').map(Number);
  const prevYm = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`;
  const prevLen = new Date(y, mo - 1, 0).getDate();
  const mname = t => new Date(t).toLocaleDateString('uk-UA', { timeZone: TZ, month: 'long' });
  const [d0, d1, wk, mon, prev] = await Promise.all([
    sumDays(env, [today]), sumDays(env, [dayKey(now - 86400e3)]), sumDays(env, [...Array(7)].map((_, i) => dayKey(now - i * 86400e3))),
    sumDays(env, daysOfMonth(ym, +today.slice(8))), sumDays(env, daysOfMonth(prevYm, prevLen)),
  ]);
  const open = (await openTables(env)).reduce((s, r) => s + payable(r.b), 0);
  return { open, rows: [['Сьогодні', d0], ['Вчора', d1], ['7 днів', wk], [`Місяць (${mname(now)})`, mon], [`Минулий місяць (${mname(new Date(y, mo - 2, 15))})`, prev]] };
}
export async function topData(env) {
  const d = (await env.DB.get('dish:' + dayKey().slice(0, 7), 'json')) || {};
  return Object.entries(d).filter(([, [q]]) => q > 0).sort((a, b) => b[1][0] - a[1][0]).slice(0, 30).map(([n, [q, s]]) => ({ n, q, s }));
}

// ---------- зміна (відкрити / закрити касу) ----------
const midnight = t => { const [h, m, x] = new Date(t).toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false }).split(':').map(Number); return t - ((h % 24) * 3600 + m * 60 + x) * 1000 - (t % 1000); };
// початок робочого дня (03:00), до якого належить момент t
const dayStart = (t = Date.now()) => midnight(t - dayH() * 3600e3) + dayH() * 3600e3;
export const getShift = async env => env.DB.get('shift', 'json');
export const dayList = (from, to) => { const out = []; for (let t = Date.parse(from + 'T12:00:00Z'); out.length < 5000; t += 86400e3) { const d = new Date(t).toISOString().slice(0, 10); out.push(d); if (d >= to) break; } return out; };
// підсумок з моменту відкриття зміни (або з початку дня, якщо зміна не відкрита)
export async function shiftData(env) {
  const s = await getShift(env), now = Date.now();
  const from = s?.opened || dayStart();
  const days = dayList(dayKey(from), dayKey(now));
  const [cl, ex, mv] = await Promise.all([env.DB.getMany(days.map(d => 'closed:' + d), 'json'), env.DB.getMany(days.map(d => 'exp:' + d), 'json'), env.DB.getMany(days.map(d => 'mov:' + d), 'json')]);
  // старі записи без ts: час «00:30» робочого дня d — це вже наступна календарна доба
  const tsOf = (x, d) => { if (x.ts) return x.ts; if (!/^\d\d:\d\d$/.test(x.at || '')) return 0; const h = +x.at.slice(0, 2), mins = (h < dayH() ? h + 24 : h) * 60 + +x.at.slice(3); return midnight(Date.parse(d + 'T12:00:00Z')) + mins * 60e3; };
  const inShift = (x, d) => tsOf(x, d) >= from;
  const recs = days.flatMap((d, i) => (cl[i] || []).filter(x => !x.del && !x.rm && inShift(x, d)));
  const exps = days.flatMap((d, i) => (ex[i] || []).filter(x => !x.del && inShift(x, d)));
  const movs = days.flatMap((d, i) => (mv[i] || []).filter(x => !x.del && inShift(x, d)));
  const mvCash = movs.reduce((a, m) => a + moveCash(m), 0), mvCard = movs.reduce((a, m) => a + moveCard(m), 0);
  const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
  const cash = sum(recs, x => x.cash ?? x.sum), card = sum(recs, x => x.card), exCash = sum(exps.filter(e => e.src !== 'card'), e => e.sum), exCard = sum(exps.filter(e => e.src === 'card'), e => e.sum);
  const float = s ? s.float : ((await env.DB.get('day:' + dayKey(), 'json')) || {}).float || 0;
  const open = await openTables(env);
  // чайові — не виручка закладу (як у dayZData): total без них, показуються окремо; inBox — фізична готівка, чайові в ній є, поки не видані (рух tipc)
  const ow = (await courOwed(env).catch(() => ({ sum: 0 }))).sum; // 🛵 готівка ще в кур'єрів — не в шухляді
  const tip = sum(recs, x => x.tip), tipBy = {}; recs.forEach(x => Object.entries(tipSplitOf(x)).forEach(([n, v]) => { tipBy[n] = (tipBy[n] || 0) + v; }));
  return { lastZ: s ? null : await lastZrec(env), open: !!s, id: s?.id, opened: s?.opened || 0, by: s?.by || '', float, checks: recs.length, cash, card, onl: sum(recs, x => x.onl), ag: agSum(recs), gross: cash + card, total: cash + card - tip, tip, tipBy, disc: sum(recs, x => x.discSum),
    exCash, exCard, mvCash, mvCard, courOwed: ow, inBox: float + cash - exCash + mvCash - ow, openTables: open.length, openSum: open.reduce((a, r) => a + payable(r.b), 0) };
}
// «Загальна сума» для відкриття каси: уся готівка за весь час (готівка від гостей − витрати готівкою)
export async function lastZ(env) {
  const [dk, ek] = await Promise.all([env.DB.list({ prefix: 'day:' }), env.DB.list({ prefix: 'exp:' })]);
  const dn = dk.keys.map(k => k.name), en = ek.keys.map(k => k.name);
  const [dd, ee] = await Promise.all([dn.length ? env.DB.getMany(dn, 'json') : [], en.length ? env.DB.getMany(en, 'json') : []]);
  const cash = dd.reduce((a, d) => a + ((d && (d.cash ?? d.closed)) || 0), 0);
  const ex = ee.reduce((a, l) => a + (l || []).filter(e => !e.del && e.src !== 'card').reduce((b, e) => b + e.sum, 0), 0);
  const from = dn.map(k => k.slice(4)).sort()[0];
  // сума на кнопці = уся готівка від гостей за весь час + рух коштів (внесення, обмін, видача чайових, звірка) − витрати готівкою
  // (раніше витрати не віднімались — кнопка «Відкрити» показувала більше, ніж «Залишки» → готівка)
  const mk = (await env.DB.list({ prefix: 'mov:' })).keys.map(k => k.name);
  const mv = (mk.length ? await env.DB.getMany(mk, 'json') : []).reduce((a, l) => a + (l || []).reduce((b, m) => b + moveCash(m), 0), 0);
  return { sum: Math.max(0, cash + mv - ex), cash, mv, ex, from };
}
export async function lastZrec(env) {
  const days = [...Array(30)].map((_, i) => dayKey(Date.now() - i * 86400e3));
  const l = (await env.DB.getMany(days.map(d => 'z:' + d), 'json')).find(x => x?.length);
  return l ? l[l.length - 1] : null;
}
export async function openShift(env, float, who) {
  if (await getShift(env)) return { error: 'Зміна вже відкрита' };
  const s = { id: crypto.randomUUID().slice(0, 8), opened: Date.now(), by: who || '', float: Math.min(SUM_MAX, Math.max(0, Math.round(+float || 0))) };
  await env.DB.put('shift', JSON.stringify(s)); await setFloat(env, s.float);
  await logEvent(env, { k: 'shift', by: who, text: `🔓 Касу відкрито · на початок ${s.float} грн` });
  return { s };
}
export async function closeShift(env, counted, who, print = true) {
  if (!(await getShift(env))) return { error: 'Зміна не відкрита' };
  const d = await shiftData(env);
  if (counted != null && counted !== '' && !(Math.abs(+counted) <= 1e8)) return { error: 'Некоректна сума' };
  const z = { ...d, closed: Date.now(), closedBy: who || '', counted: counted == null || counted === '' ? null : Math.round(+counted) };
  z.diff = z.counted == null ? null : z.counted - z.inBox;
  const k = 'z:' + dayKey(); const l = (await env.DB.get(k, 'json')) || []; l.push(z); await env.DB.put(k, JSON.stringify(l));
  await env.DB.delete('shift');
  if (fisOn(env)) { await fisRetry(env).catch(() => {}); z.fis = await fisZ(env); z.fisDay = await fisDayOf(env, dayKey()); await L(env, k, async () => { const l2 = (await env.DB.get(k, 'json')) || [], y = l2.find(q => q.closed === z.closed); if (y) { y.fis = z.fis; y.fisDay = z.fisDay; await env.DB.put(k, JSON.stringify(l2)); } }); } // 🧾 Z у Checkbox (спершу — досилаємо невідправлені чеки)
  if (print) await queuePrint(env, 'z', zTicket(z));
  await logEvent(env, { k: 'shift', by: who, text: `🔒 Касу закрито · ${z.total} грн · в касі ${z.inBox} грн${z.diff ? ` · різниця ${z.diff > 0 ? '+' : ''}${z.diff}` : ''}` });
  return { z };
}
const fisDayOf = async (env, day) => { const [c, m] = await Promise.all([env.DB.get('closed:' + day, 'json'), env.DB.get('mov:' + day, 'json')]); return fisDay(c || [], m || []); };
// 🧾 рядок ПРРО у Z (каса, бот, друк)
export const fisZLine = z => !z.fis ? '' : `🧾 ПРРО: у чеках ${money(z.fisDay?.fis ?? 0)}${z.fisDay?.ib ? ` · 🏦 переказом ${money(z.fisDay.ib)}` : ''}${z.fisDay?.gap ? ` · ⚠️ без чека ${money(z.fisDay.gap)}` : ''}${z.fis.error ? ` · ⚠️ Z: ${z.fis.error}` : ' · Z ✅'}`;
const fmtDT = t => new Date(t).toLocaleString('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
export const zText = z => [`🔒 <b>Касу закрито</b> (${fmtDT(z.opened)} — ${fmtDT(z.closed)})`, '',
  `Чеків: ${z.checks} · виручка <b>${money(z.total)}</b>`, `💵 ${money(z.cash)} · 💳 ${money(z.card)}${z.onl ? ` (🌐 ${money(z.onl)})` : ''}${agLine(z.ag)}${z.disc ? ` · знижки ${money(z.disc)}` : ''}`, z.tip ? `💝 Чайові (не виручка, персоналу): ${money(z.tip)}` : '', '',
  `На початок ${money(z.float)} + готівка ${money(z.cash)} − витрати ${money(z.exCash)}${z.mvCash ? ` ${z.mvCash > 0 ? '+' : '−'} рух коштів ${money(Math.abs(z.mvCash))}` : ''}`, `= <b>має бути в касі ${money(z.inBox)}</b>`,
  z.counted != null ? `Пораховано: ${money(z.counted)} · ${z.diff ? `<b>різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}</b>` : 'збігається ✅'}` : '',
  fisZLine(z),
  z.openTables ? `\n⚠️ Ще відкрито столів: ${z.openTables} (${money(z.openSum)})` : ''].filter(x => x !== '').join('\n');
function zTicket(z) {
  return [['invb', 'Z-ЗВІТ'], ['c', 'Закриття каси'], ['gap'],
    ['lr', 'Відкрито', fmtDT(z.opened)], ['lr', 'Закрито', fmtDT(z.closed)], ['lr', 'Відкрив', z.by || '—'], ['lr', 'Закрив', z.closedBy || '—'], ['dbl'],
    ['lr', 'Чеків', String(z.checks)], ['lr', 'Готівка', `${z.cash} грн`], ['lr', 'Картка', `${z.card} грн`], ...(z.onl ? [['lr', ' з них онлайн', `${z.onl} грн`]] : []), ...agRows(z.ag), ...(z.disc ? [['lr', 'Знижки', `${z.disc} грн`]] : []), ...(z.tip ? [['lr', '− Чайові (персоналу)', `${z.tip} грн`], ...Object.entries(z.tipBy || {}).map(([n, s]) => ['lr', `  ${n}`, `${s} грн`])] : []),
    ['total', 'ВИРУЧКА', `${z.total} грн`], ['dbl'],
    ['lr', 'На початок', `${z.float} грн`], ['lr', '+ Готівка', `${z.cash} грн`], ['lr', '− Витрати (готівка)', `${z.exCash} грн`], ...(z.mvCash ? [['lr', 'Рух коштів (готівка)', `${z.mvCash > 0 ? '+' : ''}${z.mvCash} грн`]] : []), ...(z.exCard ? [['lr', 'Витрати з картки', `${z.exCard} грн`]] : []),
    ['total', 'В КАСІ', `${z.inBox} грн`],
    ...(z.counted != null ? [['lr', 'Пораховано', `${z.counted} грн`], ['lr', 'Різниця', `${z.diff > 0 ? '+' : ''}${z.diff} грн`]] : []),
    ...(z.openTables ? [['dbl'], ['b', `Увага: відкрито столів ${z.openTables} на ${z.openSum} грн`]] : []), ['gap']];
}

// ---------- Z-звіт за день (без відкриття/закриття каси) ----------
export async function dayZData(env, day = dayKey()) {
  const [cl, ex, mv, d] = await Promise.all([getClosed(env, day), getExp(env, day), getMov(env, day), env.DB.get('day:' + day, 'json')]);
  const recs = cl.filter(x => !x.del && !x.rm), exps = ex.filter(e => !e.del), movs = mv.filter(m => !m.del);
  const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
  const cash = sum(recs, x => x.cash ?? x.sum), card = sum(recs, x => x.card);
  const exCash = sum(exps.filter(e => e.src !== 'card'), e => e.sum), exCard = sum(exps.filter(e => e.src === 'card'), e => e.sum);
  const mvCash = sum(movs, moveCash), mvCard = sum(movs, moveCard);
  const open = day === dayKey() ? await openTables(env) : [];
  const tipBy = {}; recs.forEach(x => Object.entries(tipSplitOf(x)).forEach(([n, v]) => { tipBy[n] = (tipBy[n] || 0) + v; }));
  // виручка — без чайових (чайові — гроші персоналу); готівка/картка — фактично отримані (з чайовими)
  const tip = sum(recs, x => x.tip);
  return { day, tipBy, checks: recs.length, cash, card, onl: sum(recs, x => x.onl), ag: agSum(recs), gross: cash + card, total: cash + card - tip, disc: sum(recs, x => x.discSum), tip, exCash, exCard, mvCash, mvCard,
    tipOut: sum(movs.filter(m => m.type === 'tipc' || m.type === 'tipk'), m => m.sum),
    salOut: sum(movs.filter(m => m.type === 'salc' || m.type === 'salk'), m => m.sum),
    net: cash + card - tip - exCash - exCard - sum(movs.filter(m => m.type === 'salc' || m.type === 'salk'), m => m.sum), orders: (d || {}).orders || 0, dels: cl.filter(x => x.del || x.rm).length,
    openTables: open.length, openSum: open.reduce((a, r) => a + payable(r.b), 0) };
}
export async function dayZ(env, who, print = true, day = dayKey()) {
  const z = { ...(await dayZData(env, day)), opened: dayStart(Date.parse(day + 'T12:00:00Z')), closed: Date.now(), closedBy: who || '', kind: 'day' };
  if (fisOn(env)) { await fisRetry(env, day).catch(() => {}); z.fis = await fisZ(env); z.fisDay = await fisDayOf(env, day); } // 🧾 Z у Checkbox (спершу — досилаємо невідправлені чеки)
  const k = 'z:' + day, l = (await env.DB.get(k, 'json')) || []; l.push(z); await env.DB.put(k, JSON.stringify(l));
  if (print) await queuePrint(env, 'z', zDayTicket(z));
  try { z.rec = await dayRecord(env, day, z.total, who); } catch {} // 🏆 рекорд закладу за день
  await logEvent(env, { k: 'shift', by: who, text: `🧾 Z-звіт за ${day}: ${z.total} грн · чеків ${z.checks}` });
  try { const t = await (await import('./tasks.js')).taskSumText(env, day); if (t) await notify(env, t); } catch {} // 📋 підсумок плану на день
  return z;
}
// 🏆 рекорд виручки за день: оновлюється при закритті дня; при побитті — премія кожному, хто був на зміні (cfg.recBonus ₴), один раз за день
export async function dayRecord(env, day, total, who) {
  return L(env, 'rec:day', async () => {
    const r = (await env.DB.get('rec:day', 'json')) || null; if (r && !(total > r.sum)) return { ...r, beat: 0 };
    const again = r?.d === day, prev = again ? r.prev : r?.sum || 0, nr = { sum: total, d: day, prev, at: Date.now() };
    await env.DB.put('rec:day', JSON.stringify(nr));
    const bonus = (await getCfg(env)).recBonus || 0, P = await import('./pay.js');
    const paidK = 'rec:paid:' + day, paid = await env.DB.get(paidK); // один раз за день: повторний Z після рекорду наступного дня премію вдруге не платить
    if (r && !again && !paid && prev > 0 && bonus > 0) { const att = (await P.getAtt(env, day.slice(0, 7)))[day] || {}; await env.DB.put(paidK, '1', { expirationTtl: 40 * 86400 });
      for (const n of Object.keys(att).filter(n => att[n]?.in && att[n].ok !== -1)) await P.payOp(env, { n, t: 'bonus', sum: bonus, note: `🏆 рекорд дня ${total} грн`, day }, who || 'система').catch(() => {}); }
    if (r && !again) await notify(env, `🏆 <b>Новий рекорд закладу за день: ${money(total)}</b> (було ${money(prev)})${bonus > 0 ? `\n➕ Премія ${money(bonus)} кожному на зміні` : ''}`).catch(() => {});
    return { ...nr, beat: r ? 1 : 0 };
  });
}
// 🖨 X-звіт: друк поточного Z за день без закриття (запис z: не створюється)
export async function dayX(env, who, day = dayKey()) {
  const z = { ...(await dayZData(env, day)), closed: Date.now(), closedBy: who || '' };
  await queuePrint(env, 'z', zDayTicket(z, true));
  await logEvent(env, { k: 'shift', by: who, text: `🖨 X-звіт за ${day}: ${z.total} грн · чеків ${z.checks}` });
  return z;
}
const dm = d => d.split('-').reverse().join('.');
export const zDayText = z => [`🧾 <b>Z-звіт за ${dm(z.day)}</b>`, '',
  z.fis ? fisZLine(z) + '\n' : '',
  `Чеків: ${z.checks} · виручка <b>${money(z.total)}</b>`, `💵 Готівка: ${money(z.cash)}`, `💳 Картка: ${money(z.card)}${z.onl || agTotal(z) ? ` (термінал ${money(z.card - (z.onl || 0) - agTotal(z))}${z.onl ? ` · 🌐 онлайн ${money(z.onl)}` : ''})` : ''}${agLine(z.ag)}`,
  z.disc ? `🏷 Знижки: ${money(z.disc)}` : '', z.tip ? `💝 Чайові (не виручка, персоналу): ${money(z.tip)}${Object.keys(z.tipBy || {}).length ? '\n' + Object.entries(z.tipBy).map(([n, s]) => `   👤 ${esc(n)}: ${money(s)}`).join('\n') : ''}` : '', `💸 Витрати: ${money(z.exCash + z.exCard)}${z.exCard ? ` (з картки ${money(z.exCard)})` : ''}`,
  z.mvCash || z.mvCard ? `🔁 Рух коштів: готівка ${z.mvCash >= 0 ? '+' : ''}${money(z.mvCash)}${z.mvCard ? `, картка ${z.mvCard >= 0 ? '+' : ''}${money(z.mvCard)}` : ''}` : '',
  `📈 Чистими: <b>${money(z.net)}</b>`, z.rec?.beat ? `🏆 Новий рекорд закладу за день!` : z.rec?.sum ? `🏆 Рекорд: ${money(z.rec.sum)} (${dm(z.rec.d)})` : '', z.openTables ? `\n⚠️ Ще відкрито столів: ${z.openTables} (${money(z.openSum)})` : ''].filter(x => x !== '').join('\n');
function zDayTicket(z, x) {
  return [['invb', x ? 'X-ЗВІТ' : 'Z-ЗВІТ'], ['c', dm(z.day)], ['gap'], ['lr', 'Надруковано', fmtDT(z.closed)], ['lr', 'Хто', z.closedBy || '—'], ['dbl'],
    ['lr', 'Чеків', String(z.checks)], ['lr', 'Готівка', `${z.cash} грн`], ['lr', 'Картка', `${z.card} грн`], ...(z.onl ? [['lr', ' з них онлайн', `${z.onl} грн`]] : []), ...agRows(z.ag), ...(z.disc ? [['lr', 'Знижки', `${z.disc} грн`]] : []), ...(z.tip ? [['lr', '− Чайові (персоналу)', `${z.tip} грн`]] : []),
    ['total', 'ВИРУЧКА', `${z.total} грн`], ['dbl'],
    ['lr', 'Витрати (готівка)', `${z.exCash} грн`], ...(z.exCard ? [['lr', 'Витрати (картка)', `${z.exCard} грн`]] : []),
    ...(z.mvCash ? [['lr', 'Рух коштів (готівка)', `${z.mvCash > 0 ? '+' : ''}${z.mvCash} грн`]] : []), ...(z.mvCard ? [['lr', 'Рух коштів (картка)', `${z.mvCard > 0 ? '+' : ''}${z.mvCard} грн`]] : []),
    ['total', 'ЧИСТИМИ', `${z.net} грн`], ...(z.openTables ? [['dbl'], ['b', `Увага: відкрито столів ${z.openTables} на ${z.openSum} грн`]] : []), ['gap']];
}

// ---------- звіт за довільний період (сирі дані — фільтри рахує POS, підсумки — бот) ----------
export async function reportRange(env, from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return null;
  const days = dayList(from, to).slice(0, 5000);
  const [cl, ex, zz, mm, vv] = await Promise.all(['closed:', 'exp:', 'z:', 'mov:', 'void:'].map(p => env.DB.getMany(days.map(d => p + d), 'json')));
  return {
    from, to,
    checks: days.flatMap((d, i) => (cl[i] || []).filter(x => !x.del && !x.rm).map(x => ({ d, id: x.id, at: x.at, t: x.t, sum: x.sum, cash: x.cash ?? x.sum, card: x.card || 0, onl: x.onl || 0, by: x.by || '', w: x.w || x.by || '', disc: x.discSum || 0, pct: x.disc || 0, tip: x.tip || 0, tipSplit: tipSplitOf(x), dishes: x.dishes || [], voids: x.voids || [], ...(x.go ? { go: x.go, cour: x.cour || '', fee: x.fee || 0 } : {}), ...(x.bonus ? { bonus: x.bonus } : {}), ...(x.cli ? { cli: x.cli } : {}) }))),
    voids: days.flatMap((d, i) => (vv[i] || []).map(x => ({ d, ...x }))),
    removed: days.flatMap((d, i) => (cl[i] || []).filter(x => x.rm).map(x => ({ d, id: x.id, at: x.at, t: x.t, sum: x.sum, by: x.by || '', reopen: !!x.reopen }))),
    exp: days.flatMap((d, i) => (ex[i] || []).map((x, j) => ({ d, i: j, del: !!x.del, at: x.at, sum: x.sum, src: x.src, note: x.note || '', by: x.by || '' })).filter(x => !x.del)),
    expDel: days.flatMap((d, i) => (ex[i] || []).map((x, j) => ({ d, i: j, at: x.at, sum: x.sum, src: x.src, note: x.note || '', by: x.by || '', del: 1 })).filter((x, j) => (ex[i] || [])[j].del)),
    z: days.flatMap((d, i) => (zz[i] || []).map((x, j) => ({ ...x, d, i: j })).filter(x => !x.del)),
    zDel: days.flatMap((d, i) => (zz[i] || []).map((x, j) => ({ ...x, d, i: j })).filter(x => x.del)),
    mov: days.flatMap((d, i) => (mm[i] || []).map((x, j) => ({ d, i: j, ...x })).filter(x => !x.del)),
    movDel: days.flatMap((d, i) => (mm[i] || []).map((x, j) => ({ d, i: j, ...x })).filter(x => x.del)),
  };
}
// підсумки для бота: by = waiter | group | cat | hour | table
export async function reportBreakdown(env, from, to, by) {
  const r = await reportRange(env, from, to); if (!r) return null;
  const res = dishResolver(await getMenu(env)), m = new Map();
  const add = (k, q, s) => { const a = m.get(k) || [0, 0]; a[0] += q; a[1] += s; m.set(k, a); };
  for (const c of r.checks) {
    if (by === 'ctrl') continue;
    if (by === 'waiter') add(c.w || c.by || '—', 1, c.sum - c.tip);
    else if (by === 'tips') { for (const [n, v] of Object.entries(c.tipSplit || {})) add(n, 1, v); }
    else if (by === 'table') add('Стіл ' + c.t, 1, c.sum - c.tip);
    else for (const [n, q, s] of c.dishes) { const x = res(n); add(by === 'group' ? (GROUPS.find(g => g.id === groupOf(x?.cat)) || {}).name : (x?.cname || 'Інше'), q, s); }
  }
  const total = r.checks.reduce((a, c) => a + c.sum - c.tip, 0); // виручка без чайових
  if (by === 'ctrl') return { r, ctrl: controlData(r), rows: [], total };
  const rows = [...m].sort((a, b) => b[1][1] - a[1][1]);
  return { r, rows, total };
}

// 🕵️ контроль по офіціантах: чеки, виручка, скасування, знижки, чайові
export function controlData(r) {
  const m = {}, W = n => m[n || '—'] = m[n || '—'] || { name: n || '—', checks: 0, sum: 0, voidN: 0, voidSum: 0, discN: 0, discSum: 0, discMax: 0, tip: 0, tipN: 0, tables: 0, tableSum: 0 };
  for (const c of r.checks) { const w = W(c.by); w.checks++; w.sum += c.sum; if (c.disc) { w.discN++; w.discSum += c.disc; w.discMax = Math.max(w.discMax, c.pct || 0); } { const wn = c.w || c.by, v = (c.tipSplit || {})[wn || '—'] || 0; if (v) { const ww = W(wn); ww.tip += v; ww.tipN++; } } }
  for (const v of r.voids || []) { const w = W(v.by); if (v.table) { w.tables++; w.tableSum += v.sum; } else { w.voidN++; w.voidSum += v.sum; } }
  return Object.values(m).map(w => ({ ...w, voidPct: w.sum ? Math.round(w.voidSum / (w.sum + w.voidSum) * 1000) / 10 : 0 })).sort((a, b) => b.voidSum + b.discSum - a.voidSum - a.discSum);
}
export async function addExpense(env, e, day) { day = cDay(day); return L(env, 'exp:' + day, () => _addExpense(env, e, day)); } // 📅 за будь-який минулий день
export async function delExpense(env, i, day, inv) { day = cDay(day); return L(env, 'exp:' + day, () => _flagRec(env, 'exp:', day, i, true, inv)); } // inv — видалення самою накладною (stock.js)
export async function restoreExpense(env, i, day) { day = cDay(day); return L(env, 'exp:' + day, () => _flagRec(env, 'exp:', day, i, false)); }
export async function delZ(env, i, day) { day = cDay(day); return L(env, 'z:' + day, () => _flagRec(env, 'z:', day, i, true)); }
export async function restoreZ(env, i, day) { day = cDay(day); return L(env, 'z:' + day, () => _flagRec(env, 'z:', day, i, false)); }
export async function addMove(env, ...a) {
  const e = await L(env, 'mov:' + dayKey(), () => _addMove(env, ...a));
  if (e && fisOn(env)) { const r = await fisMov(env, dayKey(), e.ts, true); if (r?.fisErr) e.fisErr = r.fisErr; } // 🧾 готівка зайшла/вийшла з каси → службовий чек Checkbox
  return e;
}
const movFis = async (env, day, i) => { if (!fisOn(env)) return; const e = ((await env.DB.get('mov:' + day, 'json')) || [])[+i]; if (e) await fisMov(env, day, e.ts); }; // 🧾 скасували/відновили рух → зворотний службовий чек
export async function delMove(env, i, day, pay = true) { day = cDay(day); const r = await L(env, 'mov:' + day, () => _flagRec(env, 'mov:', day, i, true)); if (r && pay) await movPay(env, day, +i, true); if (r) await movFis(env, day, i); return r; }
export async function restoreMove(env, i, day, pay = true) { day = cDay(day); const r = await L(env, 'mov:' + day, () => _flagRec(env, 'mov:', day, i, false)); if (r && pay) await movPay(env, day, +i, false); if (r) await movFis(env, day, i); return r; }
// 💵 аванс / виплату видалили в «Русі грошей» (каса чи бот) — та сама операція ЗП теж видаляється (і повертається), інакше лишається в профілі людини
async function movPay(env, day, i, del) { const k = 'pay:' + day.slice(0, 7); await L(env, k, async () => { const l = (await env.DB.get(k, 'json')) || [], x = l.find(o => o.mov && o.mov.d === day && o.mov.i === i); if (!x || !!x.del === del) return; if (del) x.del = 1; else delete x.del; await env.DB.put(k, JSON.stringify(l)); }); }
export async function reconcile(env, ...a) { return L(env, 'mov:' + dayKey(), () => _reconcile(env, ...a)); }
