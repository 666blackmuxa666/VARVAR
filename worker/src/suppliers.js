// 🏭 Постачальники: профіль (реквізити з накладної, контакти, відстрочка), борг і накладні, ціни, замовлення, акт звірки, нагадування.
// sup:<id> — профіль; supl — індекс [{ id, n, code }]. Накладні знають постачальника за назвою (inv.sup) і sid.
// Борг рахується з накладних (pay:'debt' && !paid && !del) — одне джерело правди; старий лічильник sups лишається для сумісності.
import { L, dayKey, esc, money, notify } from './ops.js';

const r2 = n => Math.round((+n || 0) * 100) / 100;
const S = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
export const nrmSup = s => S(s, 80).toLowerCase().replace(/[«»"'ʼ’`.,]/g, '').replace(/\b(фоп|тов|пп|ооо|тзов|фізична особа[- ]підприємець)\b/g, '').replace(/\s+/g, ' ').trim();
const uidS = () => 's' + crypto.randomUUID().replace(/-/g, '').slice(0, 7);
const getL = async env => (await env.DB.get('supl', 'json')) || [];
export const supGetOne = async (env, id) => env.DB.get('sup:' + id, 'json');
const FIELDS = { n: 80, code: 12, iban: 34, phone: 40, addr: 200, mgr: 80, msg: 200, days: 60, note: 600, legal: 120 };
function clean(b, cur = {}) {
  const x = { ...cur };
  for (const [k, n] of Object.entries(FIELDS)) if (b[k] != null) x[k] = S(b[k], n);
  if (x.code) x.code = x.code.replace(/\D/g, '').slice(0, 10);
  if (x.iban) x.iban = x.iban.replace(/\s/g, '').toUpperCase(); if (x.iban && !/^UA\d{27}$/.test(x.iban)) x.iban = cur.iban && /^UA\d{27}$/.test(cur.iban) ? cur.iban : '';
  if (b.term != null) x.term = Math.max(0, Math.min(120, Math.round(+b.term || 0)));
  return x;
}
// знайти або створити профіль за назвою / ЄДРПОУ; req — реквізити з накладної (ШІ) — доповнюють порожні поля
export async function supEnsure(env, name, req = {}) {
  name = S(name, 80); if (!name) return null;
  return L(env, 'supl', async () => {
    const l = await getL(env), nn = nrmSup(name), code = String(req.code || '').replace(/\D/g, '');
    let e = (code && l.find(x => x.code && x.code === code)) || l.find(x => nrmSup(x.n) === nn || (x.al || []).includes(nn));
    let p = e ? await supGetOne(env, e.id) : null;
    if (!p) { p = clean({ n: name, ...req }, { id: uidS(), at: Date.now(), term: 0, al: [] }); l.push({ id: p.id, n: p.n, code: p.code || '', al: [] }); }
    else { const add = {}; for (const k of ['code', 'iban', 'phone', 'addr', 'legal']) if (req[k] && !p[k]) add[k] = req[k]; Object.assign(p, clean(add, p)); if (nn !== nrmSup(p.n) && !(p.al || []).includes(nn)) { p.al = [...(p.al || []), nn].slice(-10); const ie = l.find(x => x.id === p.id); if (ie) ie.al = p.al; } }
    const ie = l.find(x => x.id === p.id); if (ie) { ie.n = p.n; ie.code = p.code || ''; }
    await env.DB.put('sup:' + p.id, JSON.stringify(p)); await env.DB.put('supl', JSON.stringify(l)); return p;
  });
}
const months = (n = 12) => { const now = new Date(Date.now() + 3 * 3600e3); return [...Array(n)].map((_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15)).toISOString().slice(0, 7)); };
const invIdx = async (env, n = 12) => (await env.DB.getMany(months(n).map(m => 'invl:' + m), 'json')).flatMap(x => x || []).filter(x => !x.del);
const mine = (p, x) => x.sid ? x.sid === p.id : (nrmSup(x.sup) === nrmSup(p.n) || (p.al || []).includes(nrmSup(x.sup)));
const ageDays = d => Math.floor((Date.now() - Date.parse(d + 'T12:00:00Z')) / 864e5);
// список: борг, прострочено, куплено за 30 днів і за рік, остання поставка
export async function supList(env) {
  const [l, inv] = await Promise.all([getL(env), invIdx(env)]), ps = l.length ? await env.DB.getMany(l.map(x => 'sup:' + x.id), 'json') : [], m30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const out = ps.filter(Boolean).map(p => { const my = inv.filter(x => mine(p, x)), un = my.filter(x => x.pay === 'debt' && !x.paid);
    return { id: p.id, n: p.n, phone: p.phone || '', term: p.term || 0, debt: r2(un.reduce((a, x) => a + (x.total || 0), 0)), over: r2(un.filter(x => p.term && ageDays(x.day) > p.term).reduce((a, x) => a + (x.total || 0), 0)), n30: r2(my.filter(x => x.day >= m30).reduce((a, x) => a + (x.total || 0), 0)), year: r2(my.reduce((a, x) => a + (x.total || 0), 0)), cnt: my.length, last: my.reduce((a, x) => Math.max(a, x.ts || 0), 0) }; });
  // накладні без профілю (старі) — показати, щоб створити профіль одним натиском
  const loose = [...new Set(inv.filter(x => !out.some(p => mine(ps.find(q => q?.id === p.id), x))).map(x => x.sup))].filter(Boolean);
  return { list: out.sort((a, b) => b.debt - a.debt || b.last - a.last), loose };
}
// картка: профіль, накладні, що возить і почому, підсумки
export async function supCard(env, id) {
  const p = await supGetOne(env, id); if (!p) return null;
  const inv = (await invIdx(env)).filter(x => mine(p, x)).sort((a, b) => b.ts - a.ts);
  const docs = inv.length ? (await env.DB.getMany(inv.slice(0, 40).map(x => 'inv:' + x.id), 'json')).filter(Boolean) : [], prod = {};
  for (const d of docs.slice().reverse()) for (const ln of d.lines || []) { if (!ln.bq) continue; const up = r2(ln.sum / ln.bq), e = prod[ln.id] ||= { id: ln.id, n: ln.n, u: ln.u, q: 0, sum: 0, first: up }; e.q = r2(e.q + ln.bq); e.sum = r2(e.sum + ln.sum); e.prev = e.last; e.last = up; e.day = d.day; }
  const un = inv.filter(x => x.pay === 'debt' && !x.paid);
  return { p, inv: inv.map(x => ({ id: x.id, day: x.day, no: x.no, total: x.total, pay: x.pay, paid: !!x.paid, n: x.n, age: ageDays(x.day), due: p.term ? p.term - ageDays(x.day) : null })), prod: Object.values(prod).sort((a, b) => b.sum - a.sum),
    debt: r2(un.reduce((a, x) => a + (x.total || 0), 0)), year: r2(inv.reduce((a, x) => a + (x.total || 0), 0)), avg: inv.length ? r2(inv.reduce((a, x) => a + (x.total || 0), 0) / inv.length) : 0 };
}
export async function supSave(env, b) {
  if (!b.id) { const p = await supEnsure(env, b.n, b); return p ? { p } : { error: 'Назва?' }; }
  return L(env, ['supl', 'sup:' + b.id], async () => {
    const cur = await supGetOne(env, b.id); if (!cur) return { error: 'Не знайдено' }; const p = clean(b, cur);
    const l = await getL(env), e = l.find(x => x.id === p.id); if (e) { e.n = p.n; e.code = p.code || ''; }
    await env.DB.put('sup:' + p.id, JSON.stringify(p)); await env.DB.put('supl', JSON.stringify(l)); return { p };
  });
}
// обʼєднати дублікати: from → to (назви стають псевдонімами, накладні переходять)
export async function supMerge(env, to, from) {
  if (!to || !from || to === from) return { error: 'Оберіть два різні профілі' };
  return L(env, ['supl', 'sup:' + to, 'sup:' + from], async () => {
    const [a, b] = await Promise.all([supGetOne(env, to), supGetOne(env, from)]); if (!a || !b) return { error: 'Не знайдено' };
    a.al = [...new Set([...(a.al || []), nrmSup(b.n), ...(b.al || [])])].slice(-20); for (const k of Object.keys(FIELDS)) if (!a[k] && b[k]) a[k] = b[k];
    for (const m of months()) await L(env, 'invl:' + m, async () => { const il = (await env.DB.get('invl:' + m, 'json')) || []; let ch = 0; for (const x of il) if (x.sid === from) { x.sid = to; ch = 1; } if (ch) await env.DB.put('invl:' + m, JSON.stringify(il)); });
    const l = (await getL(env)).filter(x => x.id !== from), e = l.find(x => x.id === to); if (e) e.al = a.al;
    await env.DB.put('sup:' + to, JSON.stringify(a)); await env.DB.delete('sup:' + from); await env.DB.put('supl', JSON.stringify(l)); return { p: a };
  });
}
// 🛒 замовлення: що закінчується з товарів цього постачальника → текст для Viber / Telegram
export async function supOrder(env, id, purchaseList) {
  const p = await supGetOne(env, id); if (!p) return null;
  const g = (await purchaseList(env)).filter(x => nrmSup(x.sup) === nrmSup(p.n) || (p.al || []).includes(nrmSup(x.sup))).flatMap(x => x.items);
  const fq = (q, u) => `${Math.round(q * 1000) / 1000} ${u}`;
  return { items: g, text: g.length ? `Добрий день! Замовлення${p.mgr ? ' для ' + p.mgr : ''}:\n${g.map(i => `• ${i.n} — ${fq(i.need, i.u)}`).join('\n')}\nДякуємо!` : '' };
}
// 📄 акт звірки за період: накладні (+) і оплати (−), сальдо
export async function supAct(env, id, from, to) {
  const c = await supCard(env, id); if (!c) return null;
  const docs = c.inv.filter(x => x.day >= from && x.day <= to), full = docs.length ? (await env.DB.getMany(docs.map(x => 'inv:' + x.id), 'json')).filter(Boolean) : [];
  const rows = []; for (const d of full) { rows.push({ d: d.day, t: `Накладна${d.no ? ' №' + d.no : ''}`, plus: d.total }); if (d.pay !== 'debt') rows.push({ d: d.day, t: `Оплата ${d.pay === 'card' ? 'карткою' : 'готівкою'}`, minus: d.total }); else if (d.paid) rows.push({ d: new Date(d.paid.ts + 3 * 3600e3).toISOString().slice(0, 10), t: `Оплата ${d.paid.src === 'card' ? 'карткою' : 'готівкою'}${d.no ? ' (№' + d.no + ')' : ''}`, minus: d.total }); }
  rows.sort((a, b) => a.d.localeCompare(b.d)); const plus = r2(rows.reduce((a, x) => a + (x.plus || 0), 0)), minus = r2(rows.reduce((a, x) => a + (x.minus || 0), 0));
  return { p: c.p, from, to, rows, plus, minus, saldo: r2(plus - minus) };
}
// ⚖️ порівняння цін: продукт → остання ціна в кожного постачальника (з накладних за рік)
export async function supPrices(env) {
  const inv = (await invIdx(env)).sort((a, b) => a.ts - b.ts), docs = inv.length ? (await env.DB.getMany(inv.slice(-150).map(x => 'inv:' + x.id), 'json')).filter(Boolean) : [], m = {};
  for (const d of docs) for (const ln of d.lines || []) { if (!ln.bq || !ln.sum) continue; const e = m[ln.id] ||= { id: ln.id, n: ln.n, u: ln.u, by: {} }; e.by[d.sup] = { p: r2(ln.sum / ln.bq), day: d.day }; }
  return Object.values(m).filter(e => Object.keys(e.by).length > 1).map(e => { const l = Object.entries(e.by).map(([s, v]) => ({ s, ...v })).sort((a, b) => a.p - b.p); return { ...e, by: l, save: r2(l[l.length - 1].p - l[0].p) }; }).sort((a, b) => b.save - a.save);
}
// ⏰ щодня: нагадати про оплату, коли до кінця відстрочки ≤ 1 день (один раз на накладну)
export async function supDaily(env) {
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false }); if (h < 10) return;
  const k = 'supRem:' + dayKey(); if (await env.DB.get(k)) return; await env.DB.put(k, '1', { expirationTtl: 2 * 86400 });
  const l = await getL(env); if (!l.length) return; const ps = (await env.DB.getMany(l.map(x => 'sup:' + x.id), 'json')).filter(p => p?.term > 0); if (!ps.length) return;
  const inv = (await invIdx(env, 4)).filter(x => x.pay === 'debt' && !x.paid), out = [];
  for (const p of ps) for (const x of inv.filter(x => mine(p, x))) { const left = p.term - ageDays(x.day); if (left <= 1) out.push(`• <b>${esc(p.n)}</b>${x.no ? ' №' + esc(x.no) : ''} — ${money(x.total)} · ${left < 0 ? `прострочено ${-left} дн.` : left === 0 ? 'сьогодні' : 'завтра'}`); }
  if (out.length) await notify(env, `⏰ <b>Оплата постачальникам</b>\n${out.join('\n')}`);
}
