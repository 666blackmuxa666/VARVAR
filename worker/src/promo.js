// 🎁 Лояльність: рівні постійних клієнтів (знижка / кешбек) і акції-правила (категорія, щасливі години, N-та в подарунок,
// від суми, день народження). Рахує лише сервер: promoCalc — чиста функція, promoFill — підставляє bill.promo перед показом / чеком / закриттям.
// Ключі: loy → {on, max, levels[], rules[]}; cli:<телефон> + {lvl (ручний), bd 'MM-DD', note, nth{ruleId: шт}, h[≤30]}.
import { L, TZ, esc, money, dayKey, isDay, billItems, getBill, putBill, notify } from './ops.js';
import { getMenu, priceMap } from './menu.js';
import { getCli, cliTouch, normPhone, fmtPhone } from './delivery.js';

export const LOY_DEF = {
  on: 1, max: 50, // max — не більше N% від суми страв за всіма акціями разом
  levels: [
    { id: 'new', name: 'Новий', e: '🙂', n: 0, sum: 0, pct: 0, cash: 0 },
    { id: 'reg', name: 'Постійний', e: '⭐', n: 5, sum: 3000, pct: 5, cash: 0 },
    { id: 'vip', name: 'VIP', e: '💎', n: 15, sum: 0, pct: 10, cash: 0 },
    { id: 'staff', name: 'Персонал', e: '👷', man: 1, pct: 20, cash: 0 },
  ],
  rules: [],
};
export const RULE_T = { cat: '🏷 % на категорію / страву', happy: '🕐 Щасливі години', nth: '☕ N-та в подарунок', sum: '💰 Від суми', bday: '🎂 День народження' };
export const WHERE = { hall: '🪑 зал', pick: '🥡 з собою', del: '🛵 доставка' };
const DAYS = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export const getLoy = async env => { const c = (await env.DB.get('loy', 'json')) || {}; return { ...LOY_DEF, ...c, levels: c.levels || LOY_DEF.levels, rules: c.rules || [] }; };
const putLoy = (env, fn) => L(env, 'loy', async () => { const c = await getLoy(env); const r = fn(c); if (r?.error) return r; await env.DB.put('loy', JSON.stringify(c)); return c; });

// рівень клієнта: ручний (cli.lvl) або найвищий, якого досяг (візити АБО сума); man — лише вручну
export function cliLevel(cfg, c) {
  if (!c) return null; const lv = cfg.levels;
  if (c.lvl) { const m = lv.find(x => x.id === c.lvl); if (m) return { ...m, manual: 1 }; }
  let best = null; for (const x of lv) { if (x.man) continue; const ok = (!x.n && !x.sum) || (x.n && (c.n || 0) >= x.n) || (x.sum && (c.sum || 0) >= x.sum); if (ok) best = x; }
  return best;
}
// Київський час: день тижня 1..7 (Пн..Нд), хвилини від півночі, 'MM-DD'
function kyiv(now) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit', year: 'numeric', hour12: false }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return { dow: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1, min: (+p.hour % 24) * 60 + +p.minute, md: `${p.month}-${p.day}`, y: +p.year, iso: `${p.year}-${p.month}-${p.day}` };
}
const mins = s => { const [h, m] = String(s || '').split(':').map(Number); return h * 60 + (m || 0); };
const inTime = (r, n) => { if (!r.from || !r.to) return true; const a = mins(r.from), b = mins(r.to); return a <= b ? n >= a && n < b : n >= a || n < b; };
// днів між сьогодні і днем народження (через Новий рік теж)
function bdDiff(bd, k) { const m = String(bd || '').match(/(\d{2})-(\d{2})$/); if (!m) return 99; const d = y => Date.UTC(y, +m[1] - 1, +m[2]), t = Date.parse(k.iso + 'T00:00:00Z'); return Math.min(...[k.y - 1, k.y, k.y + 1].map(y => Math.abs(d(y) - t) / 864e5)); }
export const ruleLabel = r => r.name || ({ cat: `−${r.pct}%`, happy: `Щасливі години −${r.pct}%`, nth: `Кожна ${r.n}-та в подарунок`, sum: r.gift ? `Від ${r.min} ₴ — подарунок` : `Від ${r.min} ₴ −${r.pct}%`, bday: `День народження −${r.pct}%` }[r.type] || 'Акція');

// 🧮 чиста функція: items [{name,q,sum}] (без доставки), kind hall|pick|del, cli (може бути null), manual — ручна знижка офіціанта %
export function promoCalc(cfg, { items, kind, cli, ph, now = Date.now(), manual = 0, catOf = {} }) {
  if (!cfg.on) return null;
  items = items.filter(i => i.q > 0 && i.sum > 0 && !/Доставка/.test(i.name)); const base = items.reduce((s, i) => s + i.sum, 0); if (!base) return null;
  const k = kyiv(now), lines = [], nth = {};
  const lv = cliLevel(cfg, cli);
  // рівень і ручна знижка не складаються: діє більша (офіціантова — у bill.disc, тоді рівень мовчить)
  if (lv?.pct && !(manual >= lv.pct)) lines.push({ k: 'lvl:' + lv.id, n: `${lv.e} ${lv.name} −${lv.pct}%`, amt: Math.round(base * lv.pct / 100) });
  for (const r of cfg.rules) {
    if (!r.on || (r.where?.length && !r.where.includes(kind)) || (r.d1 && k.iso < r.d1) || (r.d2 && k.iso > r.d2)) continue;
    const any = !(r.cats?.length || r.dishes?.length), hit = items.filter(i => any || r.cats?.includes(catOf[i.name]) || r.dishes?.includes(i.name)), hs = hit.reduce((s, i) => s + i.sum, 0);
    let amt = 0, n = ruleLabel(r);
    if (r.type === 'cat') amt = Math.round(hs * r.pct / 100);
    else if (r.type === 'happy') { if ((r.days?.length && !r.days.includes(k.dow)) || !inTime(r, k.min)) continue; amt = Math.round(hs * r.pct / 100); }
    else if (r.type === 'nth') { // з телефоном — накопичувальна «картка» через візити; без — у межах чека
      const u = hit.reduce((s, i) => s + i.q, 0); if (!u || !(r.n >= 2)) continue; const prev = ph ? cli?.nth?.[r.id] || 0 : 0;
      const free = Math.floor((prev + u) / r.n) - Math.floor(prev / r.n); nth[r.id] = u;
      if (!free) { if (ph) lines.push({ k: r.id, n: `${n} · ${(prev + u) % r.n}/${r.n}`, amt: 0, info: 1 }); continue; }
      amt = free * Math.min(...hit.map(i => i.sum / i.q)); amt = Math.round(amt);
    }
    else if (r.type === 'sum') { if (base < (r.min || 0)) continue;
      if (r.gift) { const g = items.find(i => i.name === r.gift); amt = g ? Math.round(g.sum / g.q) : 0; n = `🎁 ${r.name || 'Подарунок'}: ${r.gift}${g ? '' : ' (додайте в рахунок)'}`; }
      else amt = Math.round(base * r.pct / 100); }
    else if (r.type === 'bday') { if (!cli?.bd || bdDiff(cli.bd, k) > (r.bdays ?? 3)) continue; amt = Math.round(base * r.pct / 100); }
    else continue;
    if (amt > 0 || r.type === 'sum') lines.push({ k: r.id, n, amt: Math.max(0, amt) });
  }
  // стеля: усі акції разом — не більше max% від суми страв
  const cap = Math.floor(base * (cfg.max ?? 50) / 100); let left = cap;
  for (const l of lines) { l.amt = Math.min(l.amt, left); left -= l.amt; }
  const sum = lines.reduce((s, l) => s + l.amt, 0);
  if (!lines.length && !lv) return null;
  return { lines, sum, lvl: lv?.id || '', lvn: lv ? `${lv.e} ${lv.name}` : '', cash: lv?.cash || 0, nth };
}

// назва страви (як у рахунку) → id категорії
export function catMap(menu) { const m = {}; for (const c of menu.categories) for (const it of c.items) { m[it.name.uk] = c.id; for (const v of it.variants || []) m[`${it.name.uk} ${v.v} ${it.size || 'л'}`.trimEnd()] = c.id; } return m; }
const kindOf = b => b.go ? (b.go.kind === 'del' ? 'del' : 'pick') : 'hall';
// підставити bill.promo (у пам'яті; зберігає той, хто викликав). ctx — спільний кеш cfg/menu на кілька рахунків
export async function promoFill(env, bill, ctx = {}) {
  if (!bill?.total) return bill;
  ctx.cfg ||= await getLoy(env); ctx.cat ||= catMap(await getMenu(env));
  const cli = bill.cli ? await getCli(env, bill.cli) : null;
  const p = bill.promoOff ? null : promoCalc(ctx.cfg, { items: billItems(bill), kind: kindOf(bill), cli, ph: bill.cli, manual: bill.disc || 0, catOf: ctx.cat });
  if (p && (p.lines.length || p.lvl)) bill.promo = p; else delete bill.promo;
  return bill;
}
export async function promoFillMany(env, bills) { const ctx = {}; for (const b of bills) await promoFill(env, b, ctx).catch(() => {}); return bills; }
// чек закрито: лічильники «N-та в подарунок» та історія клієнта
export async function promoClose(env, bill, sum) {
  if (!bill.cli) return; const p = bill.promo;
  await cliTouch(env, bill.cli, c => {
    if (p?.nth) { c.nth ||= {}; for (const [id, u] of Object.entries(p.nth)) c.nth[id] = (c.nth[id] || 0) + u; }
    c.h = [{ ts: Date.now(), t: bill.go ? bill.go.kind : 'hall', sum, ...(p?.sum ? { pr: p.sum } : {}) }, ...(c.h || [])].slice(0, 30);
  });
}

// 🛒 сайт ?go: кошик → знижки (ціни з меню, клієнту не довіряємо)
export async function promoQuote(b, env) {
  const menu = await getMenu(env), P = priceMap(menu), items = [];
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 60)) {
    const p = P[it.id], q = Math.min(50, Math.max(0, parseInt(it.q, 10) || 0)); if (!p || !q) continue;
    const price = typeof p.p === 'number' ? p.p : Object.hasOwn(p.p, String(it.v)) ? p.p[it.v] : 0; if (!(price > 0)) continue;
    items.push({ name: p.n + (typeof p.p === 'number' ? '' : ` ${it.v} ${p.s || 'л'}`), q, sum: price * q });
  }
  const ph = normPhone(b.phone), cli = ph ? await getCli(env, ph) : null;
  const r = promoCalc(await getLoy(env), { items, kind: b.kind === 'del' ? 'del' : 'pick', cli, ph, catOf: catMap(menu) });
  return { lines: (r?.lines || []).map(l => ({ n: l.n, amt: l.amt })), sum: r?.sum || 0, lvl: r?.lvn || '' };
}

// ---------- 👥 клієнти ----------
async function allCli(env) {
  const keys = (await env.DB.list({ prefix: 'cli:' })).keys.map(k => k.name), vals = keys.length ? await env.DB.getMany(keys, 'json') : [];
  return keys.map((k, i) => ({ phone: k.slice(4), ...(vals[i] || {}) })).filter(c => c.phone);
}
const cliRow = (cfg, c) => { const lv = cliLevel(cfg, c); return { phone: c.phone, name: c.name || '', n: c.n || 0, sum: c.sum || 0, bal: c.bal || 0, bd: c.bd || '', note: c.note || '', last: c.last || 0, lvl: lv?.id || '', lvn: lv ? `${lv.e} ${lv.name}` : '', man: !!c.lvl }; };
// f: all | <id рівня> | bd (день народження ±7 днів) | sleep (не був 30+ днів) | bal (є бонуси)
export async function cliList(env, q = '', f = 'all') {
  const cfg = await getLoy(env), k = kyiv(Date.now()), qq = String(q).toLowerCase().trim(), qd = qq.replace(/\D/g, '');
  return (await allCli(env)).map(c => cliRow(cfg, c)).filter(c => (!qq || (qd.length >= 3 && c.phone.includes(qd)) || c.name.toLowerCase().includes(qq))
    && (f === 'all' || (f === 'bd' ? bdDiff(c.bd, k) <= 7 : f === 'sleep' ? c.last && Date.now() - c.last > 30 * 864e5 : f === 'bal' ? c.bal > 0 : c.lvl === f)))
    .sort((a, b) => b.sum - a.sum).slice(0, 200);
}
export async function cliCard(env, ph) { const c = await getCli(env, ph); if (!c) return null; const cfg = await getLoy(env); return { ...cliRow(cfg, { phone: ph, ...c }), h: c.h || [], nth: c.nth || {} }; }
export async function cliEdit(env, ph, f, admin) {
  if (f.lvl != null && !admin) return { error: 'Рівень призначає адміністратор' };
  const cfg = await getLoy(env);
  if (f.lvl && !cfg.levels.some(l => l.id === f.lvl)) return { error: 'Немає такого рівня' };
  let bd = f.bd; if (bd != null) { bd = String(bd).trim(); const m = bd.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-]\d{2,4})?$/); if (bd && !m) return { error: 'Дата: 25.12' }; bd = m ? `${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; if (bd && !(+bd.slice(0, 2) <= 12 && +bd.slice(3) <= 31)) return { error: 'Дата: 25.12' }; }
  const c = await cliTouch(env, ph, x => { if (f.lvl != null) { if (f.lvl) x.lvl = f.lvl; else delete x.lvl; } if (bd != null) { if (bd) x.bd = bd; else delete x.bd; } if (f.note != null) x.note = String(f.note).trim().slice(0, 300); if (f.name != null && String(f.name).trim()) x.name = String(f.name).trim().slice(0, 40); });
  return cliRow(cfg, { phone: ph, ...c });
}
export const bdText = bd => bd ? `${bd.slice(3)}.${bd.slice(0, 2)}` : '';

// ---------- ⚙️ налаштування ----------
const num = (v, lo, hi) => { v = Math.round(+v); return v >= lo && v <= hi ? v : null; };
function cleanLevel(x) {
  const l = { id: /^[a-z0-9]{2,12}$/.test(x.id || '') ? x.id : 'l' + Math.random().toString(36).slice(2, 7), name: String(x.name || '').trim().slice(0, 24), e: String(x.e || '🎁').trim().slice(0, 4), n: num(x.n || 0, 0, 10000), sum: num(x.sum || 0, 0, 10000000), pct: num(x.pct || 0, 0, 100), cash: num(x.cash || 0, 0, 50), ...(x.man ? { man: 1 } : {}) };
  if (!l.name) return { error: 'Назва рівня?' }; if ([l.n, l.sum, l.pct, l.cash].includes(null)) return { error: 'Число поза межами' }; return l;
}
function cleanRule(x, cfg) {
  if (!RULE_T[x.type]) return { error: 'Тип акції?' };
  const r = { id: /^r[a-z0-9]{3,10}$/.test(x.id || '') ? x.id : 'r' + Math.random().toString(36).slice(2, 8), type: x.type, name: String(x.name || '').trim().slice(0, 40), on: x.on === 0 || x.on === false ? 0 : 1,
    pct: num(x.pct || 0, 0, 100), where: (Array.isArray(x.where) ? x.where : []).filter(w => WHERE[w]), cats: (Array.isArray(x.cats) ? x.cats : []).map(String).slice(0, 30), dishes: (Array.isArray(x.dishes) ? x.dishes : []).map(s => String(s).slice(0, 80)).slice(0, 30),
    d1: isDay(x.d1) ? x.d1 : '', d2: isDay(x.d2) ? x.d2 : '' };
  if (r.pct === null) return { error: '% від 0 до 100' };
  if (r.type === 'happy') { r.days = (Array.isArray(x.days) ? x.days : []).map(Number).filter(d => d >= 1 && d <= 7); r.from = /^\d{1,2}:\d{2}$/.test(x.from || '') ? x.from.padStart(5, '0') : ''; r.to = /^\d{1,2}:\d{2}$/.test(x.to || '') ? x.to.padStart(5, '0') : ''; if (!r.from || !r.to) return { error: 'Час: 15:00 – 18:00' }; }
  if (r.type === 'nth') { r.n = num(x.n, 2, 50); if (!r.n) return { error: 'N від 2 до 50' }; if (!r.cats.length && !r.dishes.length) return { error: 'Оберіть категорію або страву (напр. кава)' }; }
  if (r.type === 'sum') { r.min = num(x.min, 1, 1000000); r.gift = String(x.gift || '').trim().slice(0, 80); if (!r.min) return { error: 'Сума «від»?' }; if (!r.gift && !r.pct) return { error: 'Знижка % або подарунок' }; }
  if (r.type === 'bday') { r.bdays = num(x.bdays ?? 3, 0, 14); if (r.bdays === null) r.bdays = 3; }
  if (['cat', 'happy', 'bday'].includes(r.type) && !r.pct) return { error: 'Вкажіть % знижки' };
  if (r.type === 'cat' && !r.cats.length && !r.dishes.length) return { error: 'Оберіть категорію або страву' };
  return r;
}
export async function loyRuleOn(env, id, on) { let r = null; const c = await putLoy(env, c => { r = c.rules.find(x => x.id === id); if (!r) return { error: 'Немає акції' }; r.on = on ? 1 : 0; }); return c.error ? c : r; }

// 📊 звіт: знижки за акціями й рівнями з закритих чеків
export async function loyReport(env, from, to) {
  const days = []; for (let d = from; d <= to && days.length < 370; d = new Date(Date.parse(d + 'T12:00:00Z') + 864e5).toISOString().slice(0, 10)) days.push(d);
  const all = await env.DB.getMany(days.map(d => 'closed:' + d), 'json'), m = {}; let checks = 0, sum = 0, gross = 0, cli = 0, manual = 0;
  for (const l of all) for (const x of l || []) { if (x.del || x.rm) continue; if (x.cli) cli++; if (x.discSum) manual += x.discSum;
    if (!x.promo?.length) continue; checks++; gross += x.sum || 0;
    for (const p of x.promo) { if (!p.amt) continue; const key = p.n.replace(/ · \d+\/\d+$/, ''); const a = m[key] ||= { n: key, k: p.k, q: 0, sum: 0 }; a.q++; a.sum += p.amt; sum += p.amt; } }
  return { from, to, checks, sum, gross, cli, manual, list: Object.values(m).sort((a, b) => b.sum - a.sum) };
}

// ---------- 🖥 API каси: loy* ----------
export async function loyApi(b, env, me, t) {
  const admin = me.role === 'admin', who = me.name, ok = (x = {}) => [{ ok: true, ...x }, 200], bad = (e, s = 400) => [{ error: e }, s], needA = () => bad('admin', 403);
  switch (b.op) {
    case 'loyGet': { const menu = await getMenu(env); return ok({ cfg: await getLoy(env), T: RULE_T, cats: menu.categories.filter(c => !c.tech).map(c => ({ id: c.id, n: c.name.uk, items: c.items.map(i => i.name.uk) })) }); }
    case 'loySet': { if (!admin) return needA(); // {on} | {max}
      const c = await putLoy(env, c => { if (b.on != null) c.on = b.on ? 1 : 0; if (b.max != null) { const v = num(b.max, 0, 100); if (v === null) return { error: 'Від 0 до 100' }; c.max = v; } });
      return c.error ? bad(c.error) : ok({ cfg: c }); }
    case 'loyLevel': { if (!admin) return needA(); // {lv} — додати / змінити; {del: id}
      const c = await putLoy(env, c => { if (b.del) { if (c.levels.length < 2) return { error: 'Має лишитись хоча б один рівень' }; c.levels = c.levels.filter(l => l.id !== b.del); return; }
        const l = cleanLevel(b.lv || {}); if (l.error) return l; const i = c.levels.findIndex(x => x.id === l.id); if (i >= 0) c.levels[i] = l; else c.levels.push(l);
        c.levels.sort((a, z) => (a.man || 0) - (z.man || 0) || (a.n || 0) - (z.n || 0) || (a.sum || 0) - (z.sum || 0)); });
      if (c.error) return bad(c.error); await notify(env, `🖥 🎁 Лояльність: рівні змінено — ${esc(who)}`).catch(() => {}); return ok({ cfg: c }); }
    case 'loyRule': { if (!admin) return needA();
      let r; const c = await putLoy(env, c => { if (b.del) { c.rules = c.rules.filter(x => x.id !== b.del); return; } r = cleanRule(b.rule || {}, c); if (r.error) return r; const i = c.rules.findIndex(x => x.id === r.id); if (i >= 0) c.rules[i] = r; else c.rules.push(r); });
      if (c.error) return bad(c.error); await notify(env, `🖥 🎁 Акція ${b.del ? 'видалена' : `«${esc(ruleLabel(r))}» збережена`} — ${esc(who)}`).catch(() => {}); return ok({ cfg: c }); }
    case 'loyRuleOn': { if (!admin) return needA(); const r = await loyRuleOn(env, String(b.id), !!b.on); if (r.error) return bad(r.error); await notify(env, `🖥 🎁 Акція «${esc(ruleLabel(r))}» ${r.on ? '✅ увімкнена' : '⛔ вимкнена'} — ${esc(who)}`).catch(() => {}); return ok({ rule: r }); }
    case 'loyCli': return ok({ list: await cliList(env, b.q || '', String(b.f || 'all')) });
    case 'loyCliGet': { const ph = normPhone(b.phone); if (!ph) return bad('Невірний номер'); const c = await cliCard(env, ph); return c ? ok({ cli: c }) : bad('Клієнта ще немає'); }
    case 'loyCliSet': { const ph = normPhone(b.phone); if (!ph) return bad('Невірний номер'); const r = await cliEdit(env, ph, b.f || {}, admin); if (r.error) return bad(r.error);
      if (b.f?.lvl != null) await notify(env, `🖥 🎁 ${fmtPhone(ph)} ${esc(r.name)}: рівень → ${esc(r.lvn || 'авто')} — ${esc(who)}`).catch(() => {}); return ok({ cli: r }); }
    case 'loyOff': { // без акцій на цьому столі (напр. гість не хоче / помилка)
      if (!admin) return needA();
      const r = await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x.total) return null; if (b.off) x.promoOff = 1; else delete x.promoOff; await putBill(env, t, x); return x; });
      return r ? ok() : bad('Стіл порожній'); }
    case 'loyRep': { if (!admin) return needA(); const from = isDay(b.from) ? b.from : dayKey(), to = isDay(b.to) ? b.to : from; return ok(await loyReport(env, from, to)); }
  }
  return bad('unknown');
}

// ---------- 🤖 бот персоналу (паритет): «клієнт 050…» / «клієнт Іван», «акції» ----------
const kbOf = rows => ({ inline_keyboard: rows });
export async function loyBotText(env, text, admin) {
  let m = text.match(/^(?:клієнт|клиент|гість)\s+(.+)$/i);
  if (m) {
    const ph = normPhone(m[1]);
    if (ph) return cliBotCard(env, ph, admin);
    const l = await cliList(env, m[1]); if (!l.length) return { text: '🔎 Нікого не знайдено' };
    if (l.length === 1) return cliBotCard(env, l[0].phone, admin);
    return { text: `👥 Знайдено ${l.length}:`, markup: kbOf(l.slice(0, 12).map(c => [{ text: `${c.lvn ? c.lvn.split(' ')[0] + ' ' : ''}${c.name || '—'} · ${fmtPhone(c.phone)}`.slice(0, 60), callback_data: 'lcl:' + c.phone }])) };
  }
  if (/^(акції|акции|\/promo|лояльність)$/i.test(text.trim())) return rulesBot(env, admin);
  return null;
}
async function cliBotCard(env, ph, admin) {
  const c = await cliCard(env, ph); if (!c) return { text: `🆕 ${fmtPhone(ph)} — ще не замовляв` };
  const cfg = await getLoy(env);
  return { text: [`👤 <b>${esc(c.name || '—')}</b> · ${fmtPhone(ph)}`, `🏅 ${esc(c.lvn || '—')}${c.man ? ' (вручну)' : ''}`, `🧾 ${c.n} візитів · ${money(c.sum)} · 🎁 бонусів ${money(c.bal)}`,
    c.bd ? `🎂 ${bdText(c.bd)}` : '', c.note ? `📌 ${esc(c.note)}` : '', c.h.length ? '\n<b>Останні:</b>\n' + c.h.slice(0, 8).map(h => `${new Date(h.ts).toLocaleDateString('uk-UA', { timeZone: TZ, day: '2-digit', month: '2-digit' })} · ${h.t === 'hall' ? '🪑' : h.t === 'del' ? '🛵' : '🥡'} ${money(h.sum)}${h.pr ? ` (акції −${h.pr})` : ''}`).join('\n') : ''].filter(Boolean).join('\n'),
    markup: admin ? kbOf([...cfg.levels.reduce((a, l, i) => { if (i % 3 === 0) a.push([]); a[a.length - 1].push({ text: `${c.lvl === l.id ? '✅ ' : ''}${l.e} ${l.name}`.slice(0, 30), callback_data: `llv:${ph}:${l.id}` }); return a; }, []), [{ text: '↺ Рівень авто', callback_data: `llv:${ph}:-` }]]) : undefined };
}
async function rulesBot(env, admin) {
  const c = await getLoy(env);
  return { text: [`🎁 <b>Лояльність</b> ${c.on ? '✅' : '⛔ вимкнено'} · стеля ${c.max}%`, '', '<b>Рівні:</b>', ...c.levels.map(l => `${l.e} ${esc(l.name)} — ${l.man ? 'вручну' : [l.n ? `від ${l.n} візитів` : '', l.sum ? `від ${money(l.sum)}` : ''].filter(Boolean).join(' або ') || 'усі'}${l.pct ? ` · −${l.pct}%` : ''}${l.cash ? ` · кешбек ${l.cash}%` : ''}`),
    '', '<b>Акції:</b>', ...(c.rules.length ? c.rules.map(r => `${r.on ? '✅' : '⛔'} ${esc(ruleLabel(r))} <i>${RULE_T[r.type]}${r.type === 'happy' ? ` · ${(r.days?.length ? r.days.map(d => DAYS[d]).join(',') : 'щодня')} ${r.from}–${r.to}` : ''}</i>`) : ['— ще немає (додати — у касі «⚙️ Налаштування → 🎁 Лояльність»)']),
    '', '🔎 Клієнт: <code>клієнт 0501234567</code> або <code>клієнт Іван</code>'].join('\n'),
    markup: admin && c.rules.length ? kbOf(c.rules.map(r => [{ text: `${r.on ? '⛔ Вимкнути' : '✅ Увімкнути'}: ${ruleLabel(r)}`.slice(0, 60), callback_data: `lro:${r.id}:${r.on ? 0 : 1}` }])) : undefined };
}
// callback: lcl:<тел> — картка; llv:<тел>:<рівень|-> — рівень; lro:<id>:<0|1> — акція
export async function loyBotCb(env, act, arg, opt, admin, who) {
  if (act === 'lcl') return { send: await cliBotCard(env, arg, admin) };
  if (!admin) return { answer: '🔐 Лише для адміністратора' };
  if (act === 'llv') { const r = await cliEdit(env, arg, { lvl: opt === '-' ? '' : opt }, true); if (r.error) return { answer: r.error }; return { edit: await cliBotCard(env, arg, admin), answer: `🏅 ${r.lvn || 'авто'}` }; }
  if (act === 'lro') { const r = await loyRuleOn(env, arg, opt === '1'); if (r.error) return { answer: r.error }; return { edit: await rulesBot(env, admin), answer: r.on ? '✅ Увімкнено' : '⛔ Вимкнено' }; }
  return null;
}
