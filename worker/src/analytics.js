// 📊 Розширена аналітика закладу (вкладка «Аналітика» кабінету): один запит за період, результат кешується на 5 хв.
// Усе рахується з закритих чеків (reportRange) + журнал кухні (kq:день) + costReport (фудкост, списання) + cli: (гості).
import { reportRange, dayKey, tipSplitOf } from './ops.js';

const TTL = 300, r1 = x => Math.round(x * 10) / 10, r0 = Math.round;
const addD = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const diffD = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const wd = d => (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0=пн
const brief = c => ({ rev: 0, n: 0 });

export async function anData(env, from, to) {
  const len = Math.min(diffD(from, to) + 1, 366), key = `ancache:${from}:${to}`;
  const hit = await env.DB.get(key, 'json').catch(() => null); if (hit && Date.now() - hit.ts < TTL * 1000) return { ...hit.v, cached: 1 };
  const R = await reportRange(env, from, to); if (!R) return { error: 'Невірний період' };
  const pf = addD(from, -len), pt = addD(from, -1), P = await reportRange(env, pf, pt);
  const net = c => c.sum - c.tip, sumR = L => { const rev = L.reduce((a, c) => a + net(c), 0); return { rev: r0(rev), n: L.length, avg: L.length ? r0(rev / L.length) : 0 }; };
  const cur = sumR(R.checks), prev = sumR(P?.checks || []);
  const delta = (a, b) => b ? r1((a - b) / b * 100) : null;
  // 🗓 день × година (виручка й чеки)
  const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)), heatN = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const c of R.checks) { const h = parseInt(c.at, 10); if (h >= 0 && h < 24) { heat[wd(c.d)][h] += net(c); heatN[wd(c.d)][h]++; } }
  for (const row of heat) row.forEach((v, i) => { row[i] = r0(v); });
  // 🍽 страви: топ / антитоп / ABC
  const dm = new Map(); for (const c of R.checks) for (const [n, q, s] of c.dishes) { const a = dm.get(n) || { n, q: 0, rev: 0 }; a.q += q; a.rev += s; dm.set(n, a); }
  const dl = [...dm.values()].filter(x => x.q > 0).map(x => ({ ...x, rev: r0(x.rev) })).sort((a, b) => b.rev - a.rev), totD = dl.reduce((a, x) => a + x.rev, 0) || 1;
  let cum = 0; for (const x of dl) { cum += x.rev; x.abc = cum / totD <= 0.8 || x === dl[0] ? 'A' : cum / totD <= 0.95 ? 'B' : 'C'; }
  const abc = { A: 0, B: 0, C: 0 }; for (const x of dl) abc[x.abc]++;
  const top = dl.slice(0, 10), low = [...dl].sort((a, b) => a.q - b.q || a.rev - b.rev).slice(0, 10);
  // 🛍 канали й оплати
  const ch = { hall: { ...brief() }, del: { ...brief() }, pick: { ...brief() } };
  for (const c of R.checks) { const k = c.go ? (c.go === 'del' ? 'del' : 'pick') : 'hall'; ch[k].rev += net(c); ch[k].n++; }
  for (const k in ch) ch[k].rev = r0(ch[k].rev);
  const pay = R.checks.reduce((a, c) => { a.cash += c.cash || 0; a.card += (c.card || 0) - (c.onl || 0); a.onl += c.onl || 0; return a; }, { cash: 0, card: 0, onl: 0 });
  for (const k in pay) pay[k] = r0(pay[k]);
  // 🧑‍🍳 офіціанти
  const wm = {}; for (const c of R.checks) { const w = c.w || c.by || '—', x = wm[w] ||= { name: w, rev: 0, n: 0, tip: 0 }; x.rev += net(c); x.n++; for (const [nm, v] of Object.entries(tipSplitOf(c))) (wm[nm] ||= { name: nm, rev: 0, n: 0, tip: 0 }).tip += v; }
  const waiters = Object.values(wm).map(x => ({ ...x, rev: r0(x.rev), tip: r0(x.tip), avg: x.n ? r0(x.rev / x.n) : 0 })).sort((a, b) => b.rev - a.rev).slice(0, 20);
  // 👨‍🍳 кухня: середній час від прийняття до «готово» (хв), до 62 днів
  const kd = []; for (let d = from, i = 0; d <= to && i < 62; d = addD(d, 1), i++) kd.push('kq:' + d);
  const kq = await env.DB.getMany(kd, 'json'), mins = [];
  for (const l of kq) for (const e of l || []) if (e.done && e.doneAt && e.ts && e.doneAt > e.ts) mins.push((e.doneAt - e.ts) / 60000);
  mins.sort((a, b) => a - b);
  const kitchen = { n: mins.length, avg: mins.length ? r1(mins.reduce((a, v) => a + v, 0) / mins.length) : 0, p90: mins.length ? r1(mins[Math.floor(mins.length * 0.9)]) : 0 };
  // 📦 склад: фудкост і списання
  let stock = null; try { const { costReport } = await import('./stock.js'), cr = await costReport(env, from, to); stock = cr && { fc: cr.fc, cogs: r0(cr.cogs || 0), offSum: r0(cr.offSum || 0), off: (cr.off || []).slice(0, 6), noCard: cr.noCard || 0 }; } catch { stock = null; }
  // 👥 гості: нові й повторні (за телефоном із чека), лояльність
  const ph = {}; for (const c of R.checks) if (c.cli) ph[c.cli] = (ph[c.cli] || 0) + 1;
  const phones = Object.keys(ph).slice(0, 300), recs = phones.length ? await env.DB.getMany(phones.map(p => 'cli:' + p), 'json') : [];
  let repeat = 0; phones.forEach((p, i) => { if (ph[p] > 1 || (recs[i]?.n || 0) > ph[p]) repeat++; });
  const guests = { known: phones.length, repeat, fresh: phones.length - repeat, noPhone: R.checks.filter(c => !c.cli).length, bonus: R.checks.filter(c => c.bonus).length };
  // 🔮 прогноз на поточний місяць за темпом (від початку місяця до сьогодні)
  const today = dayKey(), m0 = today.slice(0, 7) + '-01', dim = new Date(+today.slice(0, 4), +today.slice(5, 7), 0).getDate(), el = +today.slice(8);
  const M = await reportRange(env, m0, today), mRev = M ? M.checks.reduce((a, c) => a + net(c), 0) : 0;
  const forecast = { month: today.slice(0, 7), done: r0(mRev), days: el, of: dim, est: r0(mRev / Math.max(1, el) * dim) };
  const v = { from, to, pfrom: pf, pto: pt, cur, prev, d: { rev: delta(cur.rev, prev.rev), n: delta(cur.n, prev.n), avg: delta(cur.avg, prev.avg) }, heat, heatN, top, low, abc, abcList: dl.slice(0, 40), ch, pay, waiters, kitchen, stock, guests, forecast, ts: Date.now() };
  await env.DB.put(key, JSON.stringify({ ts: Date.now(), v }), { expirationTtl: TTL * 2 }).catch(() => {});
  return v;
}
