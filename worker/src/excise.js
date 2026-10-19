// 🍾 Акциз: марки пляшок на складі → продаж порціями → марка у фіскальному чеку при першій порції з пляшки.
// Прихід: марки сканують після накладної (або в картці продукту). Продаж (consume) бере обʼєм з відкритої пляшки, закінчилась — відкриває наступну.
// Замовити більше, ніж є за марками, не можна (exCheck — каса, бот, сайт). Пляшки й черга марок — exmark.js (ключ exm, замок «ing»).
import { L, getCfg, logEvent, dayKey, esc, notify, tg } from './ops.js';
import { getMenu } from './menu.js';
import { getIng, getCards, cardResolver, cardFor, grpPick, fq, adjust, r3 } from './stock.js';
import { getExm, putExm, exP, exCap, exCode, exOpenOne, exSum, exTail, exVol, exSame, exFind, exIsE } from './exmark.js';

const lk = (env, fn) => L(env, 'ing', fn);
async function ctxOf(env) {
  const [menu, cards, ing, cfg] = await Promise.all([getMenu(env), getCards(env), getIng(env), getCfg(env)]);
  return { res: cardResolver(menu), cards, im: new Map(ing.map(x => [x.id, x])), calc: cfg.semiCalc ?? 1 };
}
// страва × q → акцизні продукти з кількістю (як consume: техкарта, заготовки, групи — без запису)
function walk(c, n, q, add) {
  const f = cardFor(c.cards, c.res(n)); if (!f || f.card.draft || !q) return;
  const eat = (id, qq, depth = 0) => {
    let x = c.im.get(id); if (x?.grp) x = grpPick(x, 'b', c.im, 0); if (!x) return;
    const sc = x.semi && c.calc && depth < 3 && c.cards['semi:' + x.id];
    if (sc && sc.yield > 0 && sc.items?.length) { for (const z of sc.items) eat(z.id, r3((+z.q || 0) * qq / sc.yield), depth + 1); return; }
    if (x.ex) add(x, qq);
  };
  for (const ln of f.card.items || []) eat(ln.id, r3((+ln.q || 0) * f.k * q));
}

// 🚫 перед замовленням: чи вистачає марок (items: [{ n | name, q }]) → текст помилки або null
export async function exCheck(env, items) {
  if (!items?.length) return null;
  const m = await getExm(env); if (!Object.keys(m).length) return null; // акцизних продуктів немає — без зайвих читань
  const c = await ctxOf(env), need = new Map();
  for (const it of items) { const q = +it.q || 0; if (q > 0) walk(c, it.n ?? it.name, q, (x, qq) => need.set(x.id, r3((need.get(x.id) || 0) + qq))); }
  const bad = [];
  for (const [id, q] of need) { const x = c.im.get(id), cap = exCap(m, id); if (q > cap + 1e-9) bad.push(`${x.n} — ${cap > 0 ? `за марками лишилось ${fq(cap, x.u)}` : 'немає марок'}`); }
  if (bad.length) return `🍾 Не вистачає акцизних марок: ${bad.join('; ')}. Додайте марки пляшок: 🧮 Розрахунок → 🍾 Акциз`;
  const le = need.size ? licErr(await getLic(env)) : ''; // 📜 ліцензія — лише коли в замовленні є акцизне
  return le ? `📜 Алкоголь не продається: ${le}. Оновіть: 🧮 Розрахунок → 🍾 Акциз → 📜 Ліцензія` : null;
}

// ---------- 📜 ліцензія на роздрібний продаж алкоголю: { no, till: 'РРРР-ММ-ДД', ok: каса вписана в ліцензію } ----------
// Не вказано — не блокуємо (заклад ще не налаштував), але каса показує попередження. Вказано і каса не вписана / строк минув — алкоголь не продається (каса, бот, сайт).
export const getLic = async env => (await env.DB.get('alcLic', 'json')) || null;
export const licLeft = (lic, today = dayKey()) => lic?.till ? Math.round((Date.parse(lic.till) - Date.parse(today)) / 864e5) : null;
export const licErr = (lic, today = dayKey()) => !lic ? '' : !lic.ok ? 'касу не вписано в ліцензію' : lic.till < today ? `ліцензія закінчилась ${lic.till.split('-').reverse().join('.')}` : '';
export async function exLicSet(env, b, who) {
  if (b.off) { await env.DB.delete('alcLic'); return { lic: null }; }
  const no = String(b.no ?? '').trim().slice(0, 40), till = String(b.till ?? '');
  if (!no || !/^\d{4}-\d{2}-\d{2}$/.test(till) || !Date.parse(till)) return { error: 'Вкажіть номер ліцензії й дату, до якої вона дійсна' };
  const lic = { no, till, ok: b.ok ? 1 : 0, at: Date.now(), ...(who ? { by: String(who).slice(0, 40) } : {}) };
  await env.DB.put('alcLic', JSON.stringify(lic)); return { lic, left: licLeft(lic), err: licErr(lic) };
}
// ⏰ нагадування власнику: за 30 і 7 днів, напередодні, в день закінчення і після (раз на день, 10:00–21:00)
export async function exDaily(env) {
  const lic = await getLic(env), left = licLeft(lic); if (left == null || ![30, 7, 1, 0, -1].includes(left)) return;
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false }) % 24; if (h < 10 || h >= 21) return;
  const flag = `alcRem:${lic.till}:${left}`; if (await env.DB.get(flag)) return; await env.DB.put(flag, '1', { expirationTtl: 3 * 86400 });
  const d = lic.till.split('-').reverse().join('.'), text = left > 0 ? `📜 Ліцензія на алкоголь № ${esc(lic.no)} закінчується через <b>${left} дн.</b> (${d}). Продовжте її і сплатіть, потім оновіть дату в касі: 🧮 Розрахунок → 🍾 Акциз → 📜 Ліцензія.`
    : left === 0 ? `📜 Ліцензія на алкоголь № ${esc(lic.no)} закінчується <b>сьогодні</b>. Завтра каса не продаватиме алкоголь, доки не оновите дату.` : `⛔ Ліцензія на алкоголь № ${esc(lic.no)} закінчилась ${d} — продаж алкоголю заблоковано. Оновіть дату після продовження.`;
  const chat = await env.DB.get('digchat');
  if (chat && env.BOT_TOKEN) await tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML' }).catch(() => {}); else await notify(env, text).catch(() => {});
}
// 🍾 сповіщення в стрічку каси: відкрито нову пляшку (щоб бармен узяв саме її)
export const exOpened = (env, l) => Promise.all((l || []).map(({ x, y }) => logEvent(env, { k: 'shift', by: 'склад', text: `🍾 Нова пляшка: ${x.n} — марка ${exTail(y.c)}` }).catch(() => {})));

// 🧾 для фіскального чека: страва → { uk?, c: [[продукт, марка, електронна 0|1]] }.
// prev — що вже було в цьому чеку (правка / повтор не губить марки). send — забрати з черги нові марки (лише коли чек справді відправляємо).
export async function exReceipt(env, day, x, prev = {}, send = false) {
  const m0 = await getExm(env); if (!Object.keys(m0).length && !Object.keys(prev).length) return {};
  const c = await ctxOf(env), use = {};
  for (const [n, q] of x.dishes || []) if (q > 0) walk(c, n, q, y => { const s = use[n] ||= []; if (!s.includes(y.id)) s.push(y.id); });
  const ex = {}, back = [];
  for (const [n, ids] of Object.entries(use)) { const uk = ids.map(id => c.im.get(id)?.uk).find(Boolean); ex[n] = { ...(uk ? { uk } : {}), c: [] }; }
  for (const [n, e] of Object.entries(prev)) for (const z of e.c || []) (use[n]?.includes(z[0]) ? ex[n].c : back).push(z); // страву прибрали з чека — марка повертається в чергу
  if (send) await lk(env, async () => {
    const m = await getExm(env); let ch = back.length > 0;
    for (const z of back) { const p = exP(m, z[0]); if (!p.q.includes(z[1])) p.q.unshift(z[1]); const y = p.b.find(b => b.c === z[1]); if (y) delete y.fr; }
    for (const [n, ids] of Object.entries(use)) for (const id of ids) { const p = m[id]; if (!p?.q?.length) continue; ch = true; for (const code of p.q.splice(0)) { const y = p.b.find(b => b.c === code); ex[n].c.push([id, code, y?.e ? 1 : 0]); if (y) y.fr = `${day}/${x.id}`; } }
    if (ch) await putExm(env, m);
  });
  for (const n of Object.keys(ex)) if (!ex[n].uk && !ex[n].c.length) delete ex[n];
  return ex;
}
// ↩️ чек повернули повністю — його марки знову чекають на наступний продаж з цих пляшок
export async function exBack(env, prev) {
  const all = Object.values(prev || {}).flatMap(e => e.c || []); if (!all.length) return;
  await lk(env, async () => { const m = await getExm(env); for (const z of all) { const p = exP(m, z[0]); if (!p.q.includes(z[1])) p.q.unshift(z[1]); const y = p.b.find(b => b.c === z[1]); if (y) delete y.fr; } await putExm(env, m); });
}

// ---------- 🧮 склад: перегляд, прихід марок, відкрити / списати / прибрати пляшку ----------
const exOf = (l, id) => l.find(y => y.id === id && y.ex && !y.off);
const tot = x => r3((x.st?.k || 0) + (x.st?.b || 0));
export async function exList(env, id) {
  const [l, m, lic] = await Promise.all([getIng(env), getExm(env), getLic(env)]), list = l.filter(x => x.ex && !x.off).map(x => ({ ...exSum(m, x), st: tot(x) }));
  if (!id) return { list, lic, licLeft: licLeft(lic), licErr: licErr(lic) };
  const x = exOf(l, id); if (!x) return { error: 'Продукт не акцизний' };
  const b = (m[id]?.b || []).slice().reverse().slice(0, 60).map(y => ({ c: y.c, e: y.e || 0, left: y.left, add: y.add, o: y.o || 0, d: y.d || 0, w: y.w || '', fr: y.fr || '', inv: y.inv || '' }));
  return { list, x: { ...exSum(m, x), st: tot(x) }, b, q: m[id]?.q || [] };
}
// ➕ марки нових пляшок (сканер / камера); дубль будь-якого продукту — відхиляємо
export async function exAdd(env, id, codes, inv, who) {
  const cs = [...new Set((Array.isArray(codes) ? codes : [codes]).map(exCode).filter(Boolean))].slice(0, 200);
  if (!cs.length) return { error: 'Немає марок' };
  return lk(env, async () => {
    const l = await getIng(env), x = exOf(l, id); if (!x) return { error: 'Продукт не акцизний — увімкніть «🍾 Акцизний» у картці продукту' };
    const m = await getExm(env), all = []; for (const [pid, p] of Object.entries(m)) for (const y of p.b) all.push({ y, pid });
    const p = exP(m, id), vol = exVol(x), add = [], dup = [], up = [];
    for (const c of cs) {
      const h = all.find(o => exSame(o.y.c, c));
      // 12 символів, введених очима, тепер відскановано повністю (DataMatrix) — оновлюємо марку, щоб у чек пішов повний код
      if (h && h.pid === id && c.length > h.y.c.length) { const old = h.y.c, k = p.q.indexOf(old); h.y.c = c; h.y.e = 1; if (k >= 0) p.q[k] = c; up.push(c); continue; }
      if (h) { dup.push({ c, n: l.find(y => y.id === h.pid)?.n || '' }); continue; }
      const y = { c, ...(exIsE(c) ? { e: 1 } : {}), left: vol, add: Date.now(), ...(inv ? { inv: String(inv).slice(0, 20) } : {}), ...(who ? { by: String(who).slice(0, 40) } : {}) };
      p.b.push(y); all.push({ y, pid: id }); add.push(c);
    }
    if (add.length || up.length) await putExm(env, m);
    return { added: add.length, dup, up: up.length, x: { ...exSum(m, x), st: tot(x) } };
  });
}
// 🍾 бармен відкрив іншу пляшку — скануємо її марку: вона стає відкритою (марка піде в наступний чек)
export async function exOpen(env, id, code) {
  code = exCode(code); if (!code) return { error: 'Відскануйте марку' };
  const r = await lk(env, async () => {
    const l = await getIng(env), x = exOf(l, id); if (!x) return { error: 'Продукт не акцизний' };
    const m = await getExm(env), o = exOpenOne(m, x, code); if (!o) return { error: exFind(m[id]?.b || [], code) >= 0 ? 'Ця пляшка вже закінчилась' : 'Такої марки немає серед пляшок цього продукту' };
    await putExm(env, m); return { x: { ...exSum(m, x), st: tot(x) }, fresh: o.fresh, xx: x, y: o.y };
  });
  if (r.fresh) await exOpened(env, [{ x: r.xx, y: r.y }]);
  if (r.error) return r; return { x: r.x, fresh: r.fresh };
}
// 🗑 пляшка розбилась / зіпсувалась: залишок списується зі складу; помилково відскановану нову — просто прибрати (rm)
export async function exOff(env, id, code, note, who, rm = false) {
  code = exCode(code); if (!code) return { error: 'Вкажіть марку' };
  const r = await lk(env, async () => {
    const l = await getIng(env), x = exOf(l, id); if (!x) return { error: 'Продукт не акцизний' };
    const m = await getExm(env), p = exP(m, id), i = exFind(p.b, code); if (i < 0) return { error: 'Марку не знайдено' };
    const y = p.b[i]; if (y.d) return { error: 'Ця пляшка вже закінчилась' };
    if (rm) { if (y.o) return { error: 'Відкриту пляшку можна лише списати' }; p.b.splice(i, 1); await putExm(env, m); return { x: { ...exSum(m, x), st: tot(x) } }; }
    const left = y.left; y.left = 0; y.d = Date.now(); y.w = String(note || 'списано').slice(0, 60);
    await putExm(env, m); return { x: { ...exSum(m, x), st: tot(x) }, left, xx: x, c: y.c };
  });
  if (r.left > 0) await adjust(env, { id, wh: r.xx.home || 'b', q: -r.left, note: `🍾 пляшка ${exTail(r.c)}: ${String(note || 'списано').slice(0, 50)}`, noEx: 1 }, who);
  if (r.error) return r; return { x: r.x };
}
