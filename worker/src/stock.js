// 🧮 Розрахунок: склад (Кухня / Бар), техкарти й собівартість, заготовки, накладні, інвентаризація.
// Спільне для каси (POS) і бота. Усі зміни складу — під замком «ing» (порядок замків: bills → ing, ніколи навпаки).
import { getMenu } from './menu.js';
import { L, dayKey, hhmm, esc, money, notify, groupOf, getCfg, addExpense, delExpense, restoreExpense, reportRange, isDay } from './ops.js';

export const WH = { k: '🍳 Кухня', b: '🍹 Бар' };
export const UNITS = ['кг', 'л', 'шт'];
export const ING_CATS = ["М'ясо", 'Риба', 'Овочі й фрукти', 'Молочне', 'Бакалія', 'Соуси й спеції', 'Хліб', 'Напої', 'Алкоголь', 'Пиво', 'Кальян', 'Упаковка', 'Заготовки', 'Інше'];
export const OFF_R = ['Зіпсувалось', 'Впало / брак', 'Персоналу', 'Комплімент гостю', 'Проба / дегустація', 'Інше'];
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
export const r3 = x => Math.round((+x || 0) * 1000) / 1000;
const r2 = x => Math.round((+x || 0) * 100) / 100;
const tot = x => r3((x.st?.k || 0) + (x.st?.b || 0));
// кількість для людей: 0.25 кг → «250 г», 2 л → «2 л»
export const fq = (q, u) => { q = r3(q); if ((u === 'кг' || u === 'л') && q && Math.abs(q) < 1) return `${Math.round(q * 1000)} ${u === 'кг' ? 'г' : 'мл'}`; return `${String(q).replace('.', ',')} ${u}`; };
export const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[ʼ'’`"«»().,;:!?*_/\\+-]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- дані ----------
export const getIng = async env => (await env.DB.get('ing', 'json')) || [];
const putIng = (env, l) => env.DB.put('ing', JSON.stringify(l));
export const getCards = async env => (await env.DB.get('cards', 'json')) || {};
const putCards = (env, c) => env.DB.put('cards', JSON.stringify(c));
const lk = (env, fn) => L(env, 'ing', fn); // 🔒 один замок на весь склад
// журнал рухів за день (продажі — окремо агрегатом use:day, щоб не роздувати ключі)
async function jr(env, rows) { if (!rows.length) return; const k = 'stk:' + dayKey(), l = (await env.DB.get(k, 'json')) || []; l.push(...rows); await env.DB.put(k, JSON.stringify(l.slice(-3000))); }
const row = (t, x, wh, q, by, note = '', ref = '') => ({ ts: Date.now(), at: hhmm(), t, id: x.id, n: x.n, u: x.u, wh, q: r3(q), sum: Math.round(q * (x.cost || 0) * 100) / 100, by: by || '', ...(note ? { note } : {}), ...(ref ? { ref } : {}) });
// кухар не бачить грошей
export const forCook = l => l.map(({ cost, lp, ...x }) => x);

// ⚠️ нижче мінімуму — одне сповіщення, поки не поповнять
function lowCheck(l, ids) {
  const out = [];
  for (const x of l) {
    if (ids && !ids.has(x.id)) continue;
    if (!(x.min > 0) || x.off) { delete x.low; continue; }
    const t = tot(x);
    if (t < x.min && !x.low) { x.low = 1; out.push(x); } else if (t >= x.min && x.low) delete x.low;
  }
  return out;
}
async function sendLow(env, low) {
  if (!low?.length) return;
  await notify(env, `⚠️ <b>Закінчується:</b>\n${low.map(x => `• ${esc(x.n)} — ${fq(tot(x), x.u)} (мін. ${fq(x.min, x.u)})`).join('\n')}\n\n🛒 Список закупівлі — «🧮 Розрахунок».`).catch(() => {});
}

// ---------- довідник продуктів ----------
export async function ingSave(env, d, who) {
  const n = String(d.n || '').trim().slice(0, 60); if (!n) return { error: 'Потрібна назва' };
  const u = UNITS.includes(d.u) ? d.u : 'кг';
  return lk(env, async () => {
    const l = await getIng(env);
    if (l.some(x => x.id !== d.id && !x.off && norm(x.n) === norm(n))) return { error: 'Такий продукт уже є' };
    let x = d.id && l.find(y => y.id === d.id);
    if (d.id && !x) return { error: 'Продукт не знайдено' };
    if (!x) { x = { id: uid(), st: { k: 0, b: 0 }, cost: 0 }; l.push(x); }
    Object.assign(x, { n, u, cat: String(d.cat || x.cat || 'Інше').slice(0, 30), home: d.home === 'b' ? 'b' : 'k',
      min: Math.max(0, r3(d.min)), par: Math.max(0, r3(d.par)), loss: Math.max(0, Math.min(90, Math.round(+d.loss || 0))) });
    if (Array.isArray(d.bc)) x.bc = [...new Set(d.bc.map(s => String(s).replace(/\D/g, '')).filter(s => s.length >= 6))].slice(0, 10);
    if (Array.isArray(d.pk)) x.pk = d.pk.map(p => ({ n: String(p.n || '').trim().slice(0, 20), f: r3(p.f) })).filter(p => p.n && p.f > 0).slice(0, 5);
    if (d.semi != null) { if (d.semi) x.semi = 1; else delete x.semi; }
    if (d.cost != null && who && d.setCost) x.cost = Math.max(0, r2(d.cost)); // ручна ціна (поки не було накладних)
    lowCheck(l, new Set([x.id]));
    await putIng(env, l); return { x };
  });
}
export async function ingDel(env, id, back = false) {
  return lk(env, async () => { const l = await getIng(env), x = l.find(y => y.id === id); if (!x) return null; if (back) delete x.off; else x.off = 1; await putIng(env, l); return x; });
}
// ➕ оприбуткувати / ➖ списати (q > 0 — додати, q < 0 — списати) з причиною
export async function adjust(env, { id, wh, q, note }, who) {
  q = r3(q); if (!q) return { error: 'Вкажіть кількість' };
  wh = wh === 'b' ? 'b' : wh === 'k' ? 'k' : null;
  const r = await lk(env, async () => {
    const l = await getIng(env), x = l.find(y => y.id === id); if (!x) return { error: 'Продукт не знайдено' };
    const w = wh || x.home || 'k';
    x.st[w] = r3((x.st[w] || 0) + q);
    await jr(env, [row(q > 0 ? 'add' : 'off', x, w, q, who, String(note || '').slice(0, 80))]);
    const low = lowCheck(l, new Set([id])); await putIng(env, l); return { x, low };
  });
  await sendLow(env, r.low); return r;
}
// ⇄ перемістити між складами
export async function transfer(env, { id, from, q }, who) {
  q = r3(q); if (!(q > 0)) return { error: 'Вкажіть кількість' };
  from = from === 'b' ? 'b' : 'k'; const to = from === 'k' ? 'b' : 'k';
  return lk(env, async () => {
    const l = await getIng(env), x = l.find(y => y.id === id); if (!x) return { error: 'Продукт не знайдено' };
    x.st[from] = r3((x.st[from] || 0) - q); x.st[to] = r3((x.st[to] || 0) + q);
    await jr(env, [row('mv', x, from, -q, who, `→ ${WH[to]}`), row('mv', x, to, q, who, `← ${WH[from]}`)]);
    await putIng(env, l); return { x };
  });
}
// 🛒 що докупити: нижче мінімуму → до норми (або 2× мінімум), по постачальниках
export async function purchaseList(env) {
  const l = (await getIng(env)).filter(x => !x.off && x.min > 0 && tot(x) < x.min);
  const by = {};
  for (const x of l) { const need = r3(Math.max(0, (x.par > x.min ? x.par : x.min * 2) - tot(x))), price = x.lp || x.cost || 0; (by[x.sup || 'Без постачальника'] ||= []).push({ id: x.id, n: x.n, u: x.u, have: tot(x), min: x.min, need, price, sum: Math.round(need * price) }); }
  return Object.entries(by).map(([sup, items]) => ({ sup, items, sum: items.reduce((a, i) => a + i.sum, 0) }));
}
export const purchaseText = list => list.length ? list.map(g => `<b>${esc(g.sup)}</b>\n${g.items.map(i => `• ${esc(i.n)} — ${fq(i.need, i.u)}${i.price ? ` (~${money(i.sum)})` : ''}`).join('\n')}`).join('\n\n') : '✅ Усього вистачає (нічого не нижче мінімуму)';
export async function journal(env, day = dayKey()) { return (await env.DB.get('stk:' + (isDay(day) ? day : dayKey()), 'json')) || []; }

// ---------- техкарти й собівартість ----------
// назва з рахунку («Pepsi 0.5 л») → ключ техкарти («pepsi|0.5») + група меню
export function cardResolver(menu) {
  const m = new Map(), all = [];
  for (const c of menu.categories) for (const it of c.items) {
    if (it.variants) for (const v of it.variants) { const n = `${it.name.uk} ${v.v} ${it.size || 'л'}`.trimEnd(); m.set(n, { key: it.id + '|' + v.v, id: it.id, v: v.v, cat: c.id, price: v.p, name: n }); }
    const n = it.name.uk; if (!m.has(n)) m.set(n, { key: it.id, id: it.id, cat: c.id, price: it.price, name: n }); all.push([n, it.id, c.id]);
  }
  all.sort((a, b) => b[0].length - a[0].length);
  return name => m.get(name) || (() => { const f = all.find(([n]) => name.startsWith(n + ' ')); return f ? { key: f[1], id: f[1], cat: f[2], name } : null; })();
}
const whOfCat = cat => ['bar', 'hookah'].includes(groupOf(cat)) ? 'b' : 'k';
// ціна одиниці продукту: заготовка з техкартою — за техкартою (актуально), інакше — середня з накладних
export function unitCost(id, im, cards, depth = 0) {
  const x = im.get(id); if (!x) return 0;
  const sc = x.semi && cards['semi:' + id];
  if (sc && depth < 3 && sc.yield > 0) { const c = cardCost(sc, im, cards, depth + 1); if (c > 0) return c / sc.yield; }
  return x.cost || 0;
}
export const cardCost = (card, im, cards, depth = 0) => (card?.items || []).reduce((a, l) => a + (+l.q || 0) * unitCost(l.id, im, cards, depth), 0);
// техкарта для позиції: власна, або «на 1 л» × обʼєм варіанта (розливне)
export function cardFor(cards, r) {
  if (!r) return null;
  const c = cards[r.key]; if (c) return { card: c, k: 1 };
  if (r.v && cards[r.id]?.perL) return { card: cards[r.id], k: parseFloat(r.v) || 1 };
  return null;
}

// 🔻 продаж списує продукти за техкартою (q < 0 — повернення). Пише теоретичну витрату use:day.
export async function consume(env, items) {
  const cards = await getCards(env); if (!Object.keys(cards).length) return;
  const res = cardResolver(await getMenu(env));
  const todo = [];
  for (const { n, q } of items) { const r = res(n), f = cardFor(cards, r); if (f && !f.card.draft && q) todo.push({ r, card: f.card, k: f.k * q }); }
  if (!todo.length) return;
  const low = await lk(env, async () => {
    const l = await getIng(env), im = new Map(l.map(x => [x.id, x])), uk = 'use:' + dayKey(), use = (await env.DB.get(uk, 'json')) || {}, ch = new Set();
    for (const { r, card, k } of todo) {
      const dw = card.wh || whOfCat(r.cat);
      for (const ln of card.items || []) {
        const x = im.get(ln.id); if (!x) continue;
        const w = ln.wh || dw, qq = r3((+ln.q || 0) * k), c = unitCost(x.id, im, cards);
        x.st[w] = r3((x.st[w] || 0) - qq); ch.add(x.id);
        const key = x.id + '@' + w, a = use[key] || [0, 0]; use[key] = [r3(a[0] + qq), r2(a[1] + qq * c)];
      }
    }
    const low = lowCheck(l, ch);
    await Promise.all([putIng(env, l), env.DB.put(uk, JSON.stringify(use), { expirationTtl: 400 * 86400 })]);
    return low;
  });
  await sendLow(env, low);
}
// 🗑 скасували вже приготовану страву: продукти не повертаються — списання «брак» з причиною
export async function wasteDish(env, items, reason, who) {
  const cards = await getCards(env); if (!Object.keys(cards).length) return;
  const res = cardResolver(await getMenu(env));
  await lk(env, async () => {
    const l = await getIng(env), im = new Map(l.map(x => [x.id, x])), rows = [];
    for (const { n, q } of items) {
      const r = res(n), f = cardFor(cards, r); if (!f || f.card.draft) continue;
      for (const ln of f.card.items || []) { const x = im.get(ln.id); if (!x) continue; const w = ln.wh || f.card.wh || whOfCat(r.cat), qq = r3((+ln.q || 0) * f.k * q); x.st[w] = r3((x.st[w] || 0) - qq); rows.push(row('off', x, w, -qq, who, `скасовано: ${n} · ${String(reason || '').slice(0, 50)}`)); }
    }
    if (rows.length) { await jr(env, rows); await putIng(env, l); }
  });
}
// техкарта: { out, wh?, perL?, yield? (заготовка), draft?, items: [{ id, q (брутто), loss }] }
export async function cardSave(env, key, d) {
  key = String(key || ''); if (!/^(semi:)?[\w-]+(\|[^|:]{1,20})?$/.test(key)) return { error: 'Невірна страва' };
  return lk(env, async () => {
    const cards = await getCards(env), ids = new Set((await getIng(env)).map(x => x.id));
    if (d == null) { delete cards[key]; await putCards(env, cards); return { ok: 1 }; }
    const items = (Array.isArray(d.items) ? d.items : []).filter(l => ids.has(l.id) && +l.q > 0).slice(0, 40).map(l => ({ id: l.id, q: r3(l.q), ...(+l.loss ? { loss: Math.min(90, Math.max(0, Math.round(+l.loss))) } : {}), ...(l.wh === 'k' || l.wh === 'b' ? { wh: l.wh } : {}) }));
    const c = { items, ...(+d.out > 0 ? { out: Math.round(+d.out) } : {}), ...(d.wh === 'k' || d.wh === 'b' ? { wh: d.wh } : {}), ...(d.perL ? { perL: 1 } : {}), ...(+d.yield > 0 ? { yield: r3(d.yield) } : {}), ...(d.draft ? { draft: 1 } : {}), ...(d.note ? { note: String(d.note).slice(0, 400) } : {}) };
    cards[key] = c; await putCards(env, cards); return { card: c };
  });
}
// 🍳 заготовка: зварили N одиниць напівфабрикату → сировина списується за його техкартою, заготовка — на склад
export async function produce(env, { id, q, wh }, who) {
  q = r3(q); if (!(q > 0)) return { error: 'Вкажіть кількість' };
  const r = await lk(env, async () => {
    const l = await getIng(env), im = new Map(l.map(x => [x.id, x])), cards = await getCards(env), x = im.get(id), sc = cards['semi:' + id];
    if (!x || !x.semi) return { error: 'Це не заготовка' };
    if (!sc?.items?.length || !(sc.yield > 0)) return { error: 'Спершу заповніть техкарту заготовки (склад і вихід)' };
    const w = wh === 'b' ? 'b' : wh === 'k' ? 'k' : x.home || 'k', k = q / sc.yield, rows = [], ch = new Set([id]);
    let cost = 0;
    for (const ln of sc.items) { const y = im.get(ln.id); if (!y) continue; const qq = r3(ln.q * k), lw = ln.wh || w; cost += qq * unitCost(y.id, im, cards); y.st[lw] = r3((y.st[lw] || 0) - qq); ch.add(y.id); rows.push(row('prod', y, lw, -qq, who, `на заготовку ${x.n}`)); }
    const old = Math.max(0, tot(x)); x.cost = old + q > 0 ? r2((old * (x.cost || 0) + cost) / (old + q)) : r2(cost / q);
    x.st[w] = r3((x.st[w] || 0) + q); rows.push(row('prod', x, w, q, who, 'заготовка'));
    await jr(env, rows); const low = lowCheck(l, ch); await putIng(env, l); return { x, cost: Math.round(cost), low };
  });
  await sendLow(env, r.low); return r;
}
// список страв меню з собівартістю (для каси / бота)
export async function costList(env) {
  const [menu, cards, l, cfg] = await Promise.all([getMenu(env), getCards(env), getIng(env), getCfg(env)]);
  const im = new Map(l.map(x => [x.id, x])), out = [];
  for (const c of menu.categories) for (const it of c.items) {
    const keys = it.variants ? it.variants.map(v => ({ key: it.id + '|' + v.v, v: v.v, price: v.p, name: `${it.name.uk} ${v.v} ${it.size || 'л'}` })) : [{ key: it.id, price: it.price, name: it.name.uk }];
    for (const k of keys) {
      const f = cardFor(cards, { key: k.key, id: it.id, v: k.v }), cost = f ? cardCost(f.card, im, cards) * f.k : null;
      const miss = f ? f.card.items.filter(ln => !(unitCost(ln.id, im, cards) > 0)).map(ln => im.get(ln.id)?.n).filter(Boolean) : [];
      out.push({ key: k.key, id: it.id, v: k.v || null, name: k.name, cat: c.id, cname: c.name.uk, tech: !!c.tech, price: k.price, cost: cost == null ? null : r2(cost), fc: cost != null && k.price ? Math.round(cost / k.price * 1000) / 10 : null,
        rec: cost ? Math.ceil(cost / (cfg.foodCost / 100) / 5) * 5 : null, draft: !!f?.card.draft, perL: !!(f && f.k !== 1), miss });
    }
  }
  return out;
}
// які страви використовують продукт (для «подорожчало»)
export async function dishesUsing(env, ids) {
  const [menu, cards, l] = await Promise.all([getMenu(env), getCards(env), getIng(env)]);
  const im = new Map(l.map(x => [x.id, x])), names = {};
  for (const c of menu.categories) for (const it of c.items) {
    const ks = it.variants ? it.variants.map(v => [it.id + '|' + v.v, `${it.name.uk} ${v.v}`, v.p]) : [[it.id, it.name.uk, it.price]];
    for (const [k, n, p] of ks) { const card = cards[k]; if (!card || !card.items.some(ln => ids.includes(ln.id) || (im.get(ln.id)?.semi && cards['semi:' + ln.id]?.items.some(z => ids.includes(z.id))))) continue; const cost = cardCost(card, im, cards); names[n] = { cost: Math.round(cost), price: p, fc: p ? Math.round(cost / p * 100) : 0 }; }
  }
  return names;
}

// ---------- 🧾 накладні ----------
// d: { sup, no, date, pay: cash|card|debt, lines: [{ id?, n, q, price?, sum, f? (одиниць складу в 1 од. накладної), wh?, src? (назва з накладної), add?: { n, u, home, cat } }] }
export async function invoiceSave(env, d, who) {
  const sup = String(d.sup || '').trim().slice(0, 60) || 'Без постачальника', pay = ['cash', 'card', 'debt'].includes(d.pay) ? d.pay : 'debt';
  const cfg = await getCfg(env);
  const r = await lk(env, async () => {
    const l = await getIng(env), im = new Map(l.map(x => [x.id, x])), al = (await env.DB.get('al', 'json')) || {};
    const lines = [], rows = [], alerts = [], ch = new Set();
    for (const ln of (Array.isArray(d.lines) ? d.lines : []).slice(0, 120)) {
      const q = r3(ln.q), f = r3(ln.f) || 1, sum = r2(ln.sum != null && ln.sum !== '' ? ln.sum : (+ln.price || 0) * q);
      if (!(q > 0)) continue;
      let x = ln.id && im.get(ln.id);
      if (!x && ln.add?.n) { // новий продукт з накладної
        const n = String(ln.add.n).trim().slice(0, 60), same = l.find(y => !y.off && norm(y.n) === norm(n));
        x = same || { id: uid(), n, u: UNITS.includes(ln.add.u) ? ln.add.u : 'кг', cat: String(ln.add.cat || 'Інше').slice(0, 30), home: ln.add.home === 'b' ? 'b' : 'k', st: { k: 0, b: 0 }, cost: 0, min: 0, par: 0, loss: 0 };
        if (!same) { l.push(x); im.set(x.id, x); }
      }
      if (!x) continue;
      const bq = r3(q * f), w = ln.wh === 'b' || ln.wh === 'k' ? ln.wh : x.home || 'k', up = bq ? sum / bq : 0;
      if (x.lp && up > x.lp * (1 + cfg.priceAlert / 100)) alerts.push({ id: x.id, n: x.n, u: x.u, from: x.lp, to: r2(up), pct: Math.round((up / x.lp - 1) * 100) });
      const old = Math.max(0, tot(x));
      x.cost = old + bq > 0 ? r2((old * (x.cost || 0) + sum) / (old + bq)) : r2(up);
      if (up > 0) x.lp = r2(up); x.sup = sup; x.st[w] = r3((x.st[w] || 0) + bq); ch.add(x.id);
      if (ln.src && norm(ln.src) !== norm(x.n)) al[norm(sup) + '|' + norm(ln.src)] = { id: x.id, f };
      lines.push({ id: x.id, n: x.n, u: x.u, q, f, bq, sum, wh: w, ...(ln.src ? { src: String(ln.src).slice(0, 80) } : {}) });
      rows.push(row('in', x, w, bq, who, `${sup}${d.no ? ' №' + d.no : ''}`));
    }
    if (!lines.length) return { error: 'Немає жодного рядка з кількістю' };
    const id = uid(), total = r2(lines.reduce((a, x) => a + x.sum, 0));
    rows.forEach(x => { x.ref = id; });
    const inv = { id, ts: Date.now(), at: hhmm(), day: dayKey(), sup, no: String(d.no || '').slice(0, 30), date: String(d.date || '').slice(0, 20), pay, by: who || '', src: ['photo', 'code', 'hand'].includes(d.src) ? d.src : 'hand', lines, total };
    await jr(env, rows);
    const low = lowCheck(l, ch);
    await Promise.all([putIng(env, l), env.DB.put('al', JSON.stringify(al)), env.DB.put('inv:' + id, JSON.stringify(inv))]);
    const ik = 'invl:' + dayKey().slice(0, 7), il = (await env.DB.get(ik, 'json')) || []; il.push({ id, ts: inv.ts, day: inv.day, sup, no: inv.no, total, pay, by: inv.by, n: lines.length }); await env.DB.put(ik, JSON.stringify(il));
    if (pay === 'debt') await supDebt(env, sup, total);
    return { inv, alerts, low };
  });
  if (r.error) return r;
  if (pay !== 'debt') await payExpense(env, r.inv, pay, who);
  await sendLow(env, r.low);
  if (r.alerts.length) await priceAlert(env, r.inv, r.alerts);
  return r;
}
async function supDebt(env, sup, d) { const s = (await env.DB.get('sups', 'json')) || {}; const x = s[sup] ||= { debt: 0 }; x.debt = r2(Math.max(0, (x.debt || 0) + d)); x.last = Date.now(); await env.DB.put('sups', JSON.stringify(s)); }
// оплата накладної → витрата в Касі (з посиланням на накладну)
async function payExpense(env, inv, src, who) {
  const i = await addExpense(env, { sum: Math.round(inv.total), src: src === 'card' ? 'card' : 'cash', note: `🧾 ${inv.sup}${inv.no ? ' №' + inv.no : ''}`, by: who || '', inv: inv.id });
  await setInv(env, inv.id, x => { x.paid = { src, ts: Date.now(), by: who || '', exp: { d: dayKey(), i } }; });
}
async function setInv(env, id, fn) { const x = await env.DB.get('inv:' + id, 'json'); if (!x) return null; fn(x); await env.DB.put('inv:' + id, JSON.stringify(x)); await idxSet(env, x); return x; }
async function idxSet(env, x) { const k = 'invl:' + x.day.slice(0, 7), l = (await env.DB.get(k, 'json')) || [], e = l.find(y => y.id === x.id); if (!e) return; e.del = x.del ? 1 : 0; e.pay = x.pay; e.paid = x.paid ? 1 : 0; await env.DB.put(k, JSON.stringify(l)); }
async function priceAlert(env, inv, alerts) {
  const used = await dishesUsing(env, alerts.map(a => a.id)), dn = Object.entries(used).slice(0, 8);
  await notify(env, `🔺 <b>Подорожчання</b> (${esc(inv.sup)}${inv.no ? ' №' + esc(inv.no) : ''}):\n${alerts.map(a => `• ${esc(a.n)}: ${money(a.from)} → <b>${money(a.to)}</b>/${a.u} (+${a.pct}%)`).join('\n')}${dn.length ? `\n\nЗачіпає страви (собівартість · фудкост):\n${dn.map(([n, v]) => `• ${esc(n)} — ${money(v.cost)} · ${v.fc}%`).join('\n')}` : ''}`).catch(() => {});
}
export async function invPay(env, id, src, who) {
  const inv = await env.DB.get('inv:' + id, 'json'); if (!inv || inv.del || inv.paid || inv.pay !== 'debt') return null;
  await L(env, 'ing', () => supDebt(env, inv.sup, -inv.total));
  await payExpense(env, inv, src, who); return inv;
}
// 🗑 / ↩️ накладна: склад і витрата повертаються як було
export async function invoiceDel(env, id, back, who) {
  const r = await lk(env, async () => {
    const inv = await env.DB.get('inv:' + id, 'json'); if (!inv || !!inv.del === !back) return null;
    const l = await getIng(env), im = new Map(l.map(x => [x.id, x])), rows = [], s = back ? 1 : -1;
    for (const ln of inv.lines) {
      const x = im.get(ln.id); if (!x) continue;
      const before = Math.max(0, tot(x)), after = before + s * ln.bq;
      if (after > 0) { const c = (before * (x.cost || 0) + s * ln.sum) / after; if (c > 0 && isFinite(c)) x.cost = r2(c); }
      x.st[ln.wh] = r3((x.st[ln.wh] || 0) + s * ln.bq);
      rows.push(row('in', x, ln.wh, s * ln.bq, who, `${back ? '↩️ повернуто' : '🗑 видалено'}: ${inv.sup}${inv.no ? ' №' + inv.no : ''}`, inv.id));
    }
    if (back) delete inv.del; else inv.del = 1;
    await jr(env, rows); await putIng(env, l); await env.DB.put('inv:' + id, JSON.stringify(inv)); await idxSet(env, inv);
    if (inv.pay === 'debt' && !inv.paid) await supDebt(env, inv.sup, s * inv.total);
    return inv;
  });
  if (r?.paid?.exp) await (back ? restoreExpense : delExpense)(env, r.paid.exp.i, r.paid.exp.d);
  return r;
}
export async function invList(env, months = 2) {
  const now = new Date(Date.now() - 3 * 3600e3), ks = [...Array(months)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - i, 15); return 'invl:' + d.toISOString().slice(0, 7); });
  const ll = await env.DB.getMany(ks, 'json');
  return { list: ll.flatMap(l => l || []).sort((a, b) => b.ts - a.ts), sups: (await env.DB.get('sups', 'json')) || {} };
}
export const invGet = async (env, id) => env.DB.get('inv:' + id, 'json');
// рядок з накладної → продукт: памʼять зіставлень, точна назва, збіг слів
export async function matchLines(env, sup, lines) {
  const l = (await getIng(env)).filter(x => !x.off), al = (await env.DB.get('al', 'json')) || {}, sk = norm(sup) + '|';
  const words = s => new Set(norm(s).split(' ').filter(w => w.length > 2 && !/^\d/.test(w)));
  return lines.map(ln => {
    const nn = norm(ln.n), m = al[sk + nn] || Object.entries(al).find(([k]) => k.endsWith('|' + nn))?.[1];
    if (m && l.some(x => x.id === m.id)) return { ...ln, id: m.id, f: m.f, ok: 'mem' };
    const ex = l.find(x => norm(x.n) === nn); if (ex) return { ...ln, id: ex.id, f: 1, ok: 'name' };
    const w = words(ln.n); let best = null, bs = 0;
    for (const x of l) { const xw = words(x.n); if (!xw.size) continue; let c = 0; xw.forEach(z => { if ([...w].some(y => y.startsWith(z.slice(0, 5)) || z.startsWith(y.slice(0, 5)))) c++; }); const s = c / xw.size; if (s > bs) { bs = s; best = x; } }
    if (bs >= 0.5) return { ...ln, id: best.id, f: 1, ok: 'guess' };
    // новий продукт — реєструється сам при записі накладної (назва, одиниця, категорія, склад — від Gemini)
    const n = ln.p || ln.n, same = l.find(x => norm(x.n) === norm(n)); if (same) return { ...ln, id: same.id, f: ln.pq || 1, ok: 'name' };
    const u = ln.pu || (/^(л|мл)/i.test(ln.u || '') ? 'л' : /^(шт|уп|ящ|пач|пл|бут|бан)/i.test(ln.u || '') ? 'шт' : 'кг');
    return { ...ln, id: null, ok: '', f: ln.pq || (u === 'кг' && /^г/i.test(ln.u || '') ? 0.001 : u === 'л' && /^мл/i.test(ln.u || '') ? 0.001 : 1), add: { n: n.slice(0, 60), u, cat: ING_CATS.includes(ln.cat) ? ln.cat : 'Інше', home: ln.bar ? 'b' : 'k' } };
  });
}

// ---------- 📝 інвентаризація ----------
// чернетка: cnt:open:<wh> = { wh, ts, by, f: { id: факт } }; wh: k | b
export async function countGet(env, wh) { wh = wh === 'b' ? 'b' : 'k'; return (await env.DB.get('cnt:open:' + wh, 'json')) || { wh, f: {} }; }
export async function countSave(env, wh, f, who) {
  wh = wh === 'b' ? 'b' : 'k';
  return L(env, 'cnt:open:' + wh, async () => {
    const d = await countGet(env, wh); d.ts = d.ts || Date.now(); d.by = who || d.by || '';
    for (const [id, v] of Object.entries(f || {})) { if (v === '' || v == null) delete d.f[id]; else if (+v >= 0) d.f[id] = r3(v); }
    await env.DB.put('cnt:open:' + wh, JSON.stringify(d), { expirationTtl: 14 * 86400 }); return d;
  });
}
export async function countFinish(env, wh, who) {
  wh = wh === 'b' ? 'b' : 'k';
  const r = await lk(env, async () => {
    const d = await countGet(env, wh); if (!Object.keys(d.f).length) return { error: 'Не внесено жодного факту' };
    const l = await getIng(env), im = new Map(l.map(x => [x.id, x])), cards = await getCards(env), rows = [], lines = [], id = uid();
    for (const [iid, fact] of Object.entries(d.f)) {
      const x = im.get(iid); if (!x) continue;
      const sys = r3(x.st[wh] || 0), diff = r3(fact - sys), c = unitCost(x.id, im, cards);
      lines.push({ id: x.id, n: x.n, u: x.u, sys, fact, diff, sum: r2(diff * c) });
      if (diff) { x.st[wh] = fact; rows.push({ ...row('cnt', x, wh, diff, who, 'інвентаризація', id), sum: r2(diff * c) }); }
    }
    const short = r2(lines.filter(x => x.sum < 0).reduce((a, x) => a + x.sum, 0)), over = r2(lines.filter(x => x.sum > 0).reduce((a, x) => a + x.sum, 0));
    const doc = { id, ts: Date.now(), day: dayKey(), wh, by: who || '', lines: lines.sort((a, b) => a.sum - b.sum), short, over };
    await jr(env, rows); const low = lowCheck(l, new Set(lines.map(x => x.id))); await putIng(env, l);
    await env.DB.put('cnt:' + id, JSON.stringify(doc)); const cl = (await env.DB.get('cntl', 'json')) || []; cl.push({ id, ts: doc.ts, day: doc.day, wh, by: doc.by, short, over, n: lines.length }); await env.DB.put('cntl', JSON.stringify(cl.slice(-300)));
    await env.DB.delete('cnt:open:' + wh);
    return { doc, low };
  });
  if (r.error) return r;
  await sendLow(env, r.low);
  const top = r.doc.lines.filter(x => x.diff).slice(0, 8);
  await notify(env, `📝 <b>Інвентаризація · ${WH[wh]}</b> (${esc(who || '')})\nПораховано позицій: ${r.doc.lines.length}\n🔻 Нестача: <b>${money(-r.doc.short)}</b> · 🔺 Надлишок: <b>${money(r.doc.over)}</b>${top.length ? '\n\n' + top.map(x => `${x.diff < 0 ? '🔻' : '🔺'} ${esc(x.n)}: ${x.diff > 0 ? '+' : ''}${fq(x.diff, x.u)} (${x.sum > 0 ? '+' : ''}${money(x.sum)})`).join('\n') : ''}`).catch(() => {});
  return r;
}
export const countList = async env => ((await env.DB.get('cntl', 'json')) || []).slice().reverse();
export const countDoc = async (env, id) => env.DB.get('cnt:' + id, 'json');

// ---------- 📊 плюси / мінуси ----------
// фудкост, прибуток по стравах, меню-інженерія (Kasavana–Smith), списання за причинами, підсумки інвентаризацій
export async function costReport(env, from, to) {
  const r = await reportRange(env, from, to); if (!r) return null;
  const [menu, cards, l, cfg] = await Promise.all([getMenu(env), getCards(env), getIng(env), getCfg(env)]);
  const res = cardResolver(menu), im = new Map(l.map(x => [x.id, x])), by = new Map();
  for (const c of r.checks) for (const [n, q, s] of c.dishes) { const a = by.get(n) || { n, q: 0, rev: 0 }; a.q += q; a.rev += s; by.set(n, a); }
  const rows = [...by.values()].filter(a => a.q > 0).map(a => {
    const rr = res(a.n), f = cardFor(cards, rr), unit = f ? cardCost(f.card, im, cards) * f.k : null, price = a.rev / a.q;
    return { ...a, cat: rr?.cat || '', price: Math.round(price), unit: unit == null ? null : r2(unit), cost: unit == null ? null : Math.round(unit * a.q), cm: unit == null ? null : r2(price - unit), fc: unit == null || !price ? null : Math.round(unit / price * 1000) / 10, rec: unit ? Math.ceil(unit / (cfg.foodCost / 100) / 5) * 5 : null };
  });
  const known = rows.filter(x => x.unit != null && !groupOf(x.cat).startsWith('other')), N = known.length, Q = known.reduce((a, x) => a + x.q, 0);
  const avgCm = Q ? known.reduce((a, x) => a + x.cm * x.q, 0) / Q : 0, popMin = N ? 0.7 / N : 0;
  for (const x of known) { const hiP = Q && x.q / Q >= popMin, hiM = x.cm >= avgCm; x.me = hiP && hiM ? 'star' : hiP ? 'horse' : hiM ? 'puzzle' : 'dog'; }
  // собівартість проданого — по тих самих закритих чеках, що й виручка (страви з техкартами, за поточними цінами)
  const days = []; for (let t = Date.parse(from + 'T12:00:00Z'); days.length < 400; t += 86400e3) { const d = new Date(t).toISOString().slice(0, 10); days.push(d); if (d >= to) break; }
  const jrs = await env.DB.getMany(days.map(d => 'stk:' + d), 'json');
  const withCost = rows.filter(x => x.cost != null), cogs = withCost.reduce((a, x) => a + x.cost, 0);
  const revenue = r.checks.reduce((a, c) => a + c.sum - c.tip, 0), revKnown = withCost.reduce((a, x) => a + x.rev, 0);
  const off = {}, offIng = {};
  for (const j of jrs) for (const x of j || []) if (x.t === 'off') { const k = (x.note || 'Інше').replace(/^скасовано: .*· /, 'Скасовано: ').split(' · ')[0]; off[k] = r2((off[k] || 0) - x.sum); offIng[x.n] = r2((offIng[x.n] || 0) - x.sum); }
  const cnts = ((await env.DB.get('cntl', 'json')) || []).filter(c => c.day >= from && c.day <= to);
  return { from, to, foodCost: cfg.foodCost, revenue, cogs, fc: revenue ? Math.round(cogs / revenue * 1000) / 10 : null, revKnown, rows: rows.sort((a, b) => b.rev - a.rev), avgCm: r2(avgCm), noCard: rows.filter(x => x.unit == null).length,
    off: Object.entries(off).sort((a, b) => b[1] - a[1]), offIng: Object.entries(offIng).sort((a, b) => b[1] - a[1]).slice(0, 15), offSum: r2(Object.values(off).reduce((a, v) => a + v, 0)),
    cnt: { n: cnts.length, short: r2(cnts.reduce((a, c) => a + c.short, 0)), over: r2(cnts.reduce((a, c) => a + c.over, 0)) } };
}

// ---------- API каси: op «sk…» (кухарю — лише позначене в COOK) ----------
const COOK = new Set(['skData', 'skAdj', 'skMove', 'skProduce', 'skInvParse', 'skInvSave', 'skInvList', 'skInvGet', 'skCount', 'skCountSave', 'skCountFinish', 'skCountList', 'skCountDoc', 'skCard', 'skTech', 'skJournal']);
export async function stockApi(b, env, me, ai) {
  const admin = me.role === 'admin', cook = me.role === 'cook', who = me.name;
  if (!admin && !(cook && COOK.has(b.op))) return [{ error: cook ? 'Кухарю це недоступно' : 'admin' }, 403];
  const ok = (x = {}) => [{ ok: true, ...x }, 200], bad = e => [{ error: e }, 400], R = r => r?.error ? bad(r.error) : r ? ok(r) : bad('Не знайдено');
  const hide = l => admin ? l : forCook(l);
  switch (b.op) {
    case 'skData': { const l = await getIng(env); return ok({ ing: hide(l), wh: WH, cats: ING_CATS, offR: OFF_R, units: UNITS, cfg: await getCfg(env) }); }
    case 'skIngSave': return R(await ingSave(env, b.x || {}, who));
    case 'skIngDel': return R(await ingDel(env, String(b.id), !!b.back));
    case 'skAdj': { if (cook && !(+b.q < 0)) return bad('Кухар може лише списувати'); const r = await adjust(env, b, who); if (r?.x && +b.q < 0 && !admin) await notify(env, `🗑 Списання (${esc(who)}): ${esc(r.x.n)} ${fq(-b.q, r.x.u)} — ${esc(b.note || '')}`).catch(() => {}); return R(r); }
    case 'skMove': return R(await transfer(env, b, who));
    case 'skBuy': { const list = await purchaseList(env); return ok({ list, text: purchaseText(list).replace(/<\/?b>/g, '') }); }
    case 'skJournal': { const l = await journal(env, b.day); return ok({ list: admin ? l : l.map(({ sum, ...x }) => x) }); }
    // техкарти
    case 'skCost': return ok({ list: await costList(env), cards: await getCards(env), cfg: await getCfg(env) });
    case 'skCardSave': { const r = await cardSave(env, String(b.key), b.card); if ((r?.card || r?.ok) && !b.card?.draft) await notify(env, `🖥 📋 Техкарта: <b>${esc(String(b.name || b.key))}</b> ${b.card ? 'збережено' : 'видалено'} — ${esc(who)}`).catch(() => {}); return R(r); }
    case 'skCardAi': { if (!ai) return bad('AI вимкнено'); const r = await ai.card(env, b); return R(r); }
    case 'skTech': { // 📋 техкарти для кухні: склад і грамовки без грошей
      const [cards, l, menu] = await Promise.all([getCards(env), getIng(env), getMenu(env)]), im = new Map(l.map(x => [x.id, x])), res = cardResolver(menu);
      const pick = b.name ? [res(String(b.name))?.key].filter(Boolean) : Object.keys(cards);
      const out = pick.map(k => { const c = cards[k] || (k.includes('|') && cards[k.split('|')[0]]?.perL ? cards[k.split('|')[0]] : null); if (!c) return null; const it = menu.categories.flatMap(z => z.items).find(i => i.id === k.replace(/^semi:/, '').split('|')[0]);
        return { key: k, name: k.startsWith('semi:') ? (im.get(k.slice(5))?.n || k) : (it?.name.uk || k) + (k.includes('|') ? ' ' + k.split('|')[1] : ''), img: it?.img || '', desc: it?.desc?.uk || '', size: it?.size || '', out: c.out, yield: c.yield, note: c.note || '', draft: !!c.draft,
          items: c.items.map(ln => { const x = im.get(ln.id); return x ? { n: x.n, u: x.u, q: ln.q, loss: ln.loss ?? x.loss ?? 0 } : null; }).filter(Boolean) }; }).filter(Boolean);
      return ok({ list: out });
    }
    case 'skProduce': return R(await produce(env, b, who));
    // накладні
    case 'skInvParse': {
      if (!ai) return bad('AI вимкнено');
      const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 3).map(s => String(s).replace(/^data:image\/\w+;base64,/, '')).filter(s => s.length > 1000 && s.length < 6e6);
      const text = String(b.text || '').slice(0, 4000);
      if (!imgs.length && !text) return bad('Додайте фото або код');
      const r = await ai.invoice(env, { images: imgs, text }); if (r.error) return bad(r.error);
      return ok({ ...r, lines: await matchLines(env, r.sup, r.lines || []) });
    }
    case 'skInvSave': { const d = { ...(b.inv || {}) }; if (cook) d.pay = 'debt'; const r = await invoiceSave(env, d, who);
      if (r?.inv) await notify(env, `🧾 <b>Накладна</b> ${esc(r.inv.sup)}${r.inv.no ? ' №' + esc(r.inv.no) : ''} — ${money(r.inv.total)} · ${r.inv.lines.length} поз. · ${{ cash: '💵 оплачено з каси', card: '💳 оплачено з картки', debt: '⏳ не оплачено' }[r.inv.pay]} (${esc(who)})`).catch(() => {});
      return R(r); }
    case 'skInvList': { const r = await invList(env, +b.months || 2); if (!admin) { r.list = r.list.map(({ total, ...x }) => x); r.sups = {}; } return ok(r); }
    case 'skInvGet': { const x = await invGet(env, String(b.id)); if (x && !admin) x.lines = x.lines.map(({ sum, ...l }) => l), delete x.total; return R(x && { inv: x }); }
    case 'skInvDel': { const r = await invoiceDel(env, String(b.id), !!b.back, who); if (r) await notify(env, `🖥 🧾 Накладна ${esc(r.sup)}${r.no ? ' №' + esc(r.no) : ''} (${money(r.total)}) ${b.back ? '↩️ повернуто' : '🗑 видалено'} — ${esc(who)}`).catch(() => {}); return R(r && { inv: r }); }
    case 'skInvPay': { const r = await invPay(env, String(b.id), b.src === 'card' ? 'card' : 'cash', who); if (r) await notify(env, `💸 Оплачено накладну ${esc(r.sup)}${r.no ? ' №' + esc(r.no) : ''}: ${money(r.total)} ${b.src === 'card' ? 'з картки' : 'з каси'} — ${esc(who)}`).catch(() => {}); return R(r && { inv: r }); }
    // інвентаризація
    case 'skCount': { const wh = cook ? 'k' : b.wh, [d, l] = await Promise.all([countGet(env, wh), getIng(env)]); return ok({ draft: d, ing: hide(l) }); }
    case 'skCountSave': return R(await countSave(env, cook ? 'k' : b.wh, b.f, who));
    case 'skCountFinish': { const r = await countFinish(env, cook ? 'k' : b.wh, who); if (r?.doc && !admin) r.doc = { ...r.doc, short: undefined, over: undefined, lines: r.doc.lines.map(({ sum, ...x }) => x) }; return R(r); }
    case 'skCountList': { const l = await countList(env); return ok({ list: admin ? l : l.map(({ short, over, ...x }) => x) }); }
    case 'skCountDoc': { const d = await countDoc(env, String(b.id)); if (d && !admin) { delete d.short; delete d.over; d.lines = d.lines.map(({ sum, ...x }) => x); } return R(d && { doc: d }); }
    // плюси / мінуси
    case 'skReport': { if (!isDay(b.from) || !isDay(b.to)) return bad('Невірний період'); return R(await costReport(env, b.from, b.to)); }
  }
  return [{ error: 'unknown_op' }, 400];
}
