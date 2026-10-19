// 📒 Облік закладу (фундамент Ф1/Ф3/Ф4/Ф6/Ф7): документи і журнал змін у SQL-таблицях Store (ledgerdb.js).
// Документ { id, type, payer, day, no, st, sum, src, ext, who, ts, upd, rev, body } — sum у копійках, day — облікова дата.
// st: 0 чернетка → 1 проведено; проведений не змінюється й не видаляється — виправлення = сторно (документ з −sum, rev ↔ rev).
// ext — зовнішній ключ («1c:<GUID>», «sale:<день>»): повторний імпорт оновлює чернетку / повертає наявний, а не дублює.
import { dayKey, isDay, L } from './ops.js';

export const DOC_TYPES = {
  sale: '🧾 Продажі за день', inv: '📥 Прихідна накладна', wo: '🗑 Списання', pko: '💵 Прибутковий касовий ордер', vko: '💸 Видатковий касовий ордер',
  pay: '👥 Зарплата', inc: '➕ Інший дохід', exp: '➖ Витрата', xfer: '🔁 Передача між платниками', bank: '🏦 Банк', ret: '↩️ Повернення',
};
export const DOC_SRC = ['pos', 'bot', 'import', 'bank', 'edo', 'auto', 'cab'];
// Ф3: гроші в обліку — цілі копійки
export const kop = uah => Math.round((+uah || 0) * 100);
export const uah = k => Math.round(+k || 0) / 100;
// Ф4: облікова дата = операційний день закладу (Київ з літнім часом + межа дня з налаштувань, dayH)
export const acctDay = (t = Date.now()) => dayKey(t);

const has = env => typeof env.DB.sql === 'function';
const sql = (env, ...stmts) => env.DB.sql(stmts);
const row = r => r && { ...r, body: (() => { try { return JSON.parse(r.body || '{}'); } catch { return {}; } })() };
const cut = (s, n) => String(s ?? '').slice(0, n);
const J = v => v == null ? null : JSON.stringify(v).slice(0, 8000);

// 📝 Ф6: журнал змін — лише дописування. was/now — що було й що стало (обрізаємо до 8 КБ)
export async function audit(env, who, what, ref = '', was = null, now = null) {
  if (!has(env)) return;
  try { await sql(env, ['INSERT INTO audit (ts, who, what, ref, was, now) VALUES (?, ?, ?, ?, ?, ?)', Date.now(), cut(who, 60), cut(what, 60), cut(ref, 120), J(was), J(now)]); } catch (e) { console.log('audit', e.message); }
}
export async function auditList(env, { ref, from, to, limit = 100 } = {}) {
  if (!has(env)) return [];
  const w = [], a = []; if (ref) { w.push('ref = ?'); a.push(cut(ref, 120)); } if (+from) { w.push('ts >= ?'); a.push(+from); } if (+to) { w.push('ts < ?'); a.push(+to); }
  const [r] = await sql(env, [`SELECT * FROM audit ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY n DESC LIMIT ?`, ...a, Math.min(500, Math.max(1, +limit || 100))]);
  return r.map(x => ({ ...x, was: x.was ? JSON.parse(x.was) : null, now: x.now ? JSON.parse(x.now) : null }));
}
// 🔐 журнал доступу до персональних даних
export async function pdLog(env, who, what, ref = '') { if (has(env)) try { await sql(env, ['INSERT INTO pdlog (ts, who, what, ref) VALUES (?, ?, ?, ?)', Date.now(), cut(who, 60), cut(what, 60), cut(ref, 120)]); } catch {} }

function clean(d) {
  const type = String(d.type || ''); if (!DOC_TYPES[type]) return { error: 'Невідомий тип документа' };
  const day = d.day || acctDay(); if (!isDay(day)) return { error: 'Дата — РРРР-ММ-ДД' };
  const sum = +d.sum; if (!Number.isInteger(sum) || Math.abs(sum) > 1e13) return { error: 'Сума — ціле число копійок' };
  const src = DOC_SRC.includes(d.src) ? d.src : 'pos', st = d.st === 0 ? 0 : 1;
  const ext = d.ext ? cut(d.ext, 120) : null, body = d.body && typeof d.body === 'object' ? d.body : {};
  const bs = JSON.stringify(body); if (bs.length > 200e3) return { error: 'Документ завеликий' };
  return { type, day, sum, src, st, ext, body: bs, payer: cut(d.payer, 40), no: cut(d.no, 40) };
}
export const docGet = async (env, id) => has(env) ? row((await sql(env, ['SELECT * FROM doc WHERE id = ?', String(id)]))[0][0]) : null;
const byExt = async (env, ext) => row((await sql(env, ['SELECT * FROM doc WHERE ext = ?', ext]))[0][0]);

// ➕ новий документ (або той самий за ext: чернетку оновлюємо, проведений повертаємо як є — { doc, same: 1 })
export async function docAdd(env, d, who = '') {
  if (!has(env)) return { error: 'Облік недоступний' };
  const c = clean(d || {}); if (c.error) return c; if (!c.payer) c.payer = (await payerOf(env))?.id || '';
  return L(env, 'ledger', async () => {
    if (c.ext) { const o = await byExt(env, c.ext); if (o) {
      if (o.st !== 0) return { doc: o, same: 1 };
      await sql(env, ['UPDATE doc SET type=?, payer=?, day=?, no=?, st=?, sum=?, src=?, body=?, upd=? WHERE id=?', c.type, c.payer, c.day, c.no, c.st, c.sum, c.src, c.body, Date.now(), o.id],
        ['INSERT INTO audit (ts, who, what, ref, was, now) VALUES (?, ?, ?, ?, ?, ?)', Date.now(), cut(who, 60), 'doc.edit', 'doc:' + o.id, J({ sum: o.sum, day: o.day, st: o.st }), J({ sum: c.sum, day: c.day, st: c.st })]);
      return { doc: await docGet(env, o.id) };
    } }
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16), ts = Date.now();
    await sql(env, ['INSERT INTO doc (id, type, payer, day, no, st, sum, src, ext, who, ts, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', id, c.type, c.payer, c.day, c.no, c.st, c.sum, c.src, c.ext, cut(who, 60), ts, c.body],
      ['INSERT INTO audit (ts, who, what, ref, was, now) VALUES (?, ?, ?, ?, ?, ?)', ts, cut(who, 60), 'doc.add', 'doc:' + id, null, J({ type: c.type, sum: c.sum, day: c.day, st: c.st, ext: c.ext })]);
    return { doc: await docGet(env, id) };
  });
}
// ✅ провести чернетку
export async function docPost(env, id, who = '') {
  return L(env, 'ledger', async () => {
    const o = await docGet(env, id); if (!o) return { error: 'Документ не знайдено' }; if (o.st !== 0) return { error: 'Документ уже проведено' };
    await sql(env, ['UPDATE doc SET st=1, upd=? WHERE id=?', Date.now(), o.id], ['INSERT INTO audit (ts, who, what, ref, was, now) VALUES (?, ?, ?, ?, ?, ?)', Date.now(), cut(who, 60), 'doc.post', 'doc:' + o.id, J({ st: 0 }), J({ st: 1 })]);
    return { doc: await docGet(env, o.id) };
  });
}
// ↩️ сторно: новий проведений документ з −sum на облікову дату day (за замовч. сьогодні); оригінал лишається, обидва посилаються один на одного
export async function docStorno(env, id, who = '', why = '', day = acctDay()) {
  if (!isDay(day)) return { error: 'Дата — РРРР-ММ-ДД' };
  return L(env, 'ledger', async () => {
    const o = await docGet(env, id); if (!o) return { error: 'Документ не знайдено' };
    if (o.st !== 1) return { error: 'Чернетку не сторнують — її виправляють' }; if (o.rev) return { error: 'Документ уже сторновано або це сторно' };
    const nid = crypto.randomUUID().replace(/-/g, '').slice(0, 16), ts = Date.now();
    await sql(env, ['INSERT INTO doc (id, type, payer, day, no, st, sum, src, ext, who, ts, rev, body) VALUES (?, ?, ?, ?, ?, 1, ?, ?, NULL, ?, ?, ?, ?)', nid, o.type, o.payer, day, o.no, -o.sum, o.src, cut(who, 60), ts, o.id, JSON.stringify({ storno: 1, why: cut(why, 200) })],
      ['UPDATE doc SET rev=?, upd=? WHERE id=?', nid, ts, o.id],
      ['INSERT INTO audit (ts, who, what, ref, was, now) VALUES (?, ?, ?, ?, ?, ?)', ts, cut(who, 60), 'doc.storno', 'doc:' + o.id, J({ sum: o.sum }), J({ storno: nid, why: cut(why, 200) })]);
    return { doc: await docGet(env, nid), orig: await docGet(env, o.id) };
  });
}
// 🔁 «живий» документ за ext (напр. продажі дня): сума змінилась → сторно старого + новий (історія видна, підсумок правильний)
export async function docSync(env, d, who = 'auto') {
  if (!has(env) || !d.ext) return { error: 'Потрібен ext' };
  return L(env, 'ledger', async () => { // замок той самий, що в docAdd/docStorno (повторний вхід у межах запиту не блокується)
  const o = await byExt(env, d.ext);
  if (o && o.st === 1 && o.sum === d.sum && o.payer === (d.payer || '')) return { doc: o, same: 1 };
  if (o && o.st === 1) { const r = await docStorno(env, o.id, who, 'перераховано', d.day); if (r.error) return r;
    await sql(env, ['UPDATE doc SET ext=NULL WHERE id=?', o.id]); }
  if (!d.sum && !o) return { none: 1 };
  return docAdd(env, d, who);
  });
}
// 📋 список і підсумки (по індексах: дата, платник, тип)
function where({ from, to, type, payer, st }) {
  const w = [], a = [];
  if (isDay(from)) { w.push('day >= ?'); a.push(from); } if (isDay(to)) { w.push('day <= ?'); a.push(to); }
  if (type && DOC_TYPES[type]) { w.push('type = ?'); a.push(type); } if (payer != null && payer !== '*') { w.push('payer = ?'); a.push(cut(payer, 40)); }
  if (st === 0 || st === 1) { w.push('st = ?'); a.push(st); }
  return [w.length ? 'WHERE ' + w.join(' AND ') : '', a];
}
export async function docList(env, f = {}) {
  if (!has(env)) return [];
  const [w, a] = where(f), [r] = await sql(env, [`SELECT * FROM doc ${w} ORDER BY day DESC, ts DESC LIMIT ?`, ...a, Math.min(1000, Math.max(1, +f.limit || 200))]);
  return r.map(row);
}
export async function docTotals(env, f = {}) {
  if (!has(env)) return [];
  const [w, a] = where({ ...f, st: 1 }), [r] = await sql(env, [`SELECT payer, type, COUNT(*) AS n, SUM(sum) AS sum FROM doc ${w} GROUP BY payer, type ORDER BY payer, type`, ...a]);
  return r;
}

// 🧾 продажі дня → документ sale (ext sale:<день>), сума = виручка без чайових. Викликається щодня і після міграції.
export async function saleSync(env, day) {
  const { dayZData } = await import('./ops-money.js'), z = await dayZData(env, day);
  if (!z.checks && !(await byExt(env, 'sale:' + day))) return { none: 1 };
  return docSync(env, { type: 'sale', ext: 'sale:' + day, day, sum: kop(z.total), src: 'auto', body: { checks: z.checks, cash: kop(z.cash), card: kop(z.card), tip: kop(z.tip), disc: kop(z.disc) } });
}
// ⏰ щодня (будильник закладу): перерахувати продажі за 3 останні дні (закриті чеки могли виправити)
export async function ledgerDaily(env) {
  if (!has(env)) return; await backfill(env); const f = 'ldg:' + dayKey(); if (await env.DB.get(f)) return;
  await env.DB.put(f, '1', { expirationTtl: 3 * 86400 });
  for (let i = 1; i <= 3; i++) await saleSync(env, dayKey(Date.now() - i * 86400e3)).catch(e => console.log('saleSync', e.message));
  await payerPush(env).catch(e => console.log('payerPush', e.message));
}
// 🧬 перенесення старих даних: продажі всіх днів з минулого 1 січня попереднього року — частинами по 40 днів за прокидання (ключ ldg:bf)
async function backfill(env) {
  let st = await env.DB.get('ldg:bf', 'json'); if (st?.done) return;
  if (!Array.isArray(st?.days)) { const today = dayKey(), from = (+today.slice(0, 4) - 1) + '-01-01';
    st = { days: (await env.DB.list({ prefix: 'closed:' })).keys.map(k => k.name.slice(7)).filter(d => isDay(d) && d >= from && d < today).sort() }; }
  for (const d of st.days.splice(0, 40)) await saleSync(env, d).catch(e => console.log('backfill', d, e.message));
  await env.DB.put('ldg:bf', JSON.stringify(st.days.length ? st : { done: Date.now() }));
}

// 🧾 Ф2: платник закладу { id, n } (задає власник у кабінеті; HUB → /__int/payer). Документи без платника отримують його при прив'язці.
export const payerOf = async env => (await env.DB.get('payer', 'json')) || null;
export async function payerBind(env, p, who = '') {
  const was = await payerOf(env);
  if (!p?.id) { await env.DB.delete('payer'); await audit(env, who, 'payer', 'payer', was, null); return { payer: null }; }
  const v = { id: cut(p.id, 40), n: cut(p.n, 80) }; await env.DB.put('payer', JSON.stringify(v));
  if (has(env)) await sql(env, ["UPDATE doc SET payer=? WHERE payer=''", v.id]);
  await audit(env, who, 'payer', 'payer', was, v); return { payer: v, sent: await payerPush(env) };
}
// 📤 суми доходу за рік по днях (продажі + інший дохід, проведені, зі сторно) → HUB; раз на добу (ledgerDaily) і при прив'язці
export async function payerPush(env) {
  const p = await payerOf(env); if (!p || !has(env) || !env.HUB) return null;
  const y = acctDay().slice(0, 4), [r] = await sql(env, ["SELECT day, SUM(sum) AS s FROM doc WHERE st=1 AND type IN ('sale','inc') AND payer=? AND day >= ? GROUP BY day", p.id, y + '-01-01']);
  const { hub } = await import('./hub.js'), x = await hub(env).payerDays(p.id, env.VENUE || 'varvar', y, Object.fromEntries(r.map(z => [z.day, z.s])));
  if (x?.warn) { const { notify } = await import('./ops.js'); await notify(env, x.warn).catch(() => {}); }
  return x;
}
