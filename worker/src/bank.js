// 🏦 Банк (етап 2): імпорт виписок і автозвірка. Модуль `bank`, право `cash`. Каса → 🏦 Банк і бот (файл виписки / «банк»).
// Формати: 1CClientBankExchange (txt, зазвичай Windows-1251 — вивантажують майже всі банки й BAS) і CSV/TSV будь-якого банку (колонки вгадуємо за заголовками).
// Рядок: { id, d, sum (+ надійшло / − списано), who, code, iban, pur, no, st, m?, why? }
//   st: 'ok' зіставлено (m — з чим) · 'q' на підтвердження (h — підказка) · 'x' пропущено (why: own|tax|sal|other)
//   m: { k:'acq', days, gross, fee, fe? } еквайринг ↔ безготівка днів (комісія — витрата з картки fe) · { k:'inv', ids, new? } оплата накладних
//      { k:'exp', d, i, new? } витрата з картки · { k:'mov', d, i, new? } внесення / вилучення з картки
// Ключі: bank:<YYYY-MM> → [рядки] · bank:own → [наші IBAN] · bank:last → { ts, n, add, name, by }
// Повторний імпорт тієї ж виписки не дублює: id = місяць + хеш (дата, сума, №, код, призначення). Гроші в касі змінює лише
// оплата накладної, комісія еквайрингу та явна дія людини; «↩️ Скасувати» прибирає те, що створила звірка.
import { L, dayKey, isDay, esc, money, notify } from './ops.js';
import { aggOn, aggRx, agTotal } from './agg.js';

const MAXL = 3000, MAXT = 2.5e6, WIN = 6, BACK = 30; // рядків за раз · символів файлу · днів довкола дати для пошуку пари
const r2 = n => Math.round((+n || 0) * 100) / 100;
const T = (v, n = 160) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const num = v => { let t = String(v ?? '').replace(/[\s ']/g, ''); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, ''); t = t.replace(/[^\d.-]/g, ''); return t === '' || t === '-' || isNaN(+t) ? null : +t; };
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const pad = x => String(x).padStart(2, '0');
// 01.10.2026 · 01.10.26 · 2026-10-01 (з часом або без) → 2026-10-01
const dayOf = v => { const s = T(v, 30); let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; } m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : ''; };
const iban = v => String(v || '').toUpperCase().replace(/\s/g, '').match(/UA\d{27}/)?.[0] || '';
const addDays = (d, n) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

// Windows-1251 → текст (бот отримує файл байтами; каса декодує сама в браузері)
const CP = 'ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏђ‘’“”•–—�™љ›њќћџ ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї°±Ііґµ¶·ё№є»јЅѕї';
export function decode(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); } catch {}
  let s = ''; for (const b of buf) s += b < 0x80 ? String.fromCharCode(b) : b < 0xc0 ? CP[b - 0x80] : String.fromCharCode(0x410 + b - 0xc0); return s;
}

// ---------- читання ----------
// 1CClientBankExchange: шапка (РасчСчет — наші рахунки) + СекцияДокумент … КонецДокумента. Ключі рос. (як у 1С/BAS) і укр.
const K1C = { no: ['Номер'], d: ['Дата'], sum: ['Сумма', 'Сума'], pay: ['ПлательщикСчет', 'ПлательщикРасчСчет', 'ПлатникРахунок'], payN: ['Плательщик1', 'Плательщик', 'Платник'], payC: ['ПлательщикИНН', 'ПлательщикОКПО', 'ПлатникКод', 'ПлатникЄДРПОУ'],
  rec: ['ПолучательСчет', 'ПолучательРасчСчет', 'ОтримувачРахунок'], recN: ['Получатель1', 'Получатель', 'Отримувач'], recC: ['ПолучательИНН', 'ПолучательОКПО', 'ОтримувачКод', 'ОтримувачЄДРПОУ'],
  pur: ['НазначениеПлатежа', 'ПризначенняПлатежу', 'Призначення'], out: ['ДатаСписано', 'ДатаСписання'], inn: ['ДатаПоступило', 'ДатаНадходження'] };
function parse1C(t) {
  const own = new Set(), out = [], lines = t.split(/\r?\n/); let doc = null;
  const g = (o, ks) => { for (const k of ks) if (o[k]) return o[k]; return ''; };
  for (const l of lines) {
    const i = l.indexOf('='), k = (i > 0 ? l.slice(0, i) : l).trim(), v = i > 0 ? l.slice(i + 1).trim() : '';
    if (k === 'СекцияДокумент' || k === 'СекціяДокумент') { doc = {}; continue; }
    if (k === 'КонецДокумента' || k === 'КінецьДокумента') { if (doc) out.push(doc); doc = null; continue; }
    if (doc) { if (i > 0 && !(k in doc)) doc[k] = v; } else if (/^(РасчСчет|Рахунок)$/.test(k) && iban(v)) own.add(iban(v));
  }
  const rows = out.map(o => {
    const s = num(g(o, K1C.sum)), pay = iban(g(o, K1C.pay)), rec = iban(g(o, K1C.rec));
    const isOut = own.has(pay) ? true : own.has(rec) ? false : !!g(o, K1C.out) && !g(o, K1C.inn);
    return { d: dayOf(g(o, isOut ? K1C.out : K1C.inn) || g(o, K1C.d)), sum: s == null ? null : isOut ? -Math.abs(s) : Math.abs(s), no: T(g(o, K1C.no), 30),
      who: T(g(o, isOut ? K1C.recN : K1C.payN), 80), code: T(g(o, isOut ? K1C.recC : K1C.payC), 12).replace(/\D/g, ''), iban: isOut ? rec : pay, pur: T(g(o, K1C.pur), 300) };
  });
  return { rows, own: [...own], fmt: '1c' };
}
function parseCSV(t) {
  const first = t.split(/\r?\n/).find(l => l.trim()) || '', sep = first.includes('\t') ? '\t' : first.split(';').length >= first.split(',').length ? ';' : ',';
  const out = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; continue; }
    if (ch === '"' && !cell) q = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); out.push(row); row = []; cell = ''; } else cell += ch; }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out.map(r => r.map(x => String(x).trim())).filter(r => r.some(Boolean));
}
// заголовки банківських CSV (Приват, mono, ПУМБ, Ощад, А-Банк, Райф…): поле → як його називають
const HINT = { d: /^дата( і час)?( операц\w*| проводк\w*| документ\w*)?$|^date|^дата$|дата і час/, sum: /^сума( в валюті (картки|рахунку).*| операц\w*| uah| грн)?$|^amount|^сумма$/, cr: /кредит|надходж|зарахув|поступл|приход|credit/, db: /дебет|списан|витрат|расход|debit/,
  who: /контрагент|кореспондент|корреспондент|отримувач|получател|платник|плательщ|назва|наимен/, code: /єдрпоу|едрпоу|іпн|инн|окпо|рнокпп|код контрагент|код кореспондент/, iban: /рахунок (контрагент|кореспондент)|счет (контрагент|корреспондент)|iban/,
  pur: /призначен|назначен|деталі|детали|опис|описание|коментар|purpose|description/, no: /^№|номер( документ\w*)?$|^no\.?$/ };
function mapCSV(rows) {
  let hi = -1, best = 0; rows.slice(0, 25).forEach((r, i) => { const sc = Object.values(HINT).filter(re => r.some(x => x && x.length < 60 && re.test(x.toLowerCase()))).length; if (sc > best) { best = sc; hi = i; } });
  if (hi < 0 || best < 2) return { error: 'Не впізнав колонки виписки — потрібні щонайменше «Дата» і «Сума» (або «Дебет» / «Кредит»)' };
  const h = rows[hi].map(x => x.toLowerCase()), used = new Set(), c = {};
  for (const f of ['d', 'cr', 'db', 'sum', 'code', 'iban', 'pur', 'no', 'who']) { const j = h.findIndex((x, k) => !used.has(k) && x && HINT[f].test(x)); if (j >= 0) { c[f] = j; used.add(j); } }
  if (!(c.d >= 0) || !(c.sum >= 0 || c.cr >= 0 || c.db >= 0)) return { error: 'У виписці немає колонок «Дата» і «Сума» (або «Дебет» / «Кредит»)' };
  const v = (r, f) => c[f] >= 0 ? r[c[f]] ?? '' : '';
  const out = rows.slice(hi + 1).map(r => {
    const cr = num(v(r, 'cr')), db = num(v(r, 'db')), s = c.sum >= 0 ? num(v(r, 'sum')) : null;
    const sum = cr ? Math.abs(cr) : db ? -Math.abs(db) : s;
    return { d: dayOf(v(r, 'd')), sum, no: T(v(r, 'no'), 30), who: T(v(r, 'who'), 80), code: T(v(r, 'code'), 12).replace(/\D/g, ''), iban: iban(v(r, 'iban')), pur: T(v(r, 'pur'), 300) };
  });
  return { rows: out, own: [], fmt: 'csv' };
}
export function parseStatement(text) {
  const t = String(text || '').replace(/^﻿/, ''); if (!t.trim()) return { error: 'Порожній файл' }; if (t.length > MAXT) return { error: 'Файл завеликий — розбийте виписку на місяці' };
  const p = /^\s*1CClientBankExchange/.test(t) ? parse1C(t) : mapCSV(parseCSV(t)); if (p.error) return p;
  const errs = [], rows = [];
  p.rows.forEach((r, i) => { if (!r.d && r.sum == null) return; if (!isDay(r.d)) return errs.push(`рядок ${i + 1}: немає дати`); if (!r.sum) return errs.push(`рядок ${i + 1}: немає суми`);
    r.sum = r2(r.sum); r.id = r.d.slice(2, 4) + r.d.slice(5, 7) + hash([r.d, r.sum, r.no, r.code, r.iban, r.pur].join('|')); rows.push(r); });
  if (rows.length > MAXL) return { error: `Забагато рядків (${rows.length}) — не більше ${MAXL} за раз` };
  return { rows, own: p.own, fmt: p.fmt, errs: errs.slice(0, 20), bad: errs.length };
}

// ---------- зіставлення ----------
const ACQ = /еквайр|екваїр|эквайр|відшкод|возмещ|acquir|торгов\w* (операц|еквайр)|операц\w* (з|по) (плат\w* )?карт|за операц\w* з пк|пк\b|птк|pos[- ]?термінал|термінал/i;
const monthOf = d => d.slice(0, 7);
const prevMonth = m => { const [y, mm] = m.split('-').map(Number); return mm === 1 ? `${y - 1}-12` : `${y}-${pad(mm - 1)}`; };
const getM = async (env, m) => (await env.DB.get('bank:' + m, 'json')) || [];
// що вже зайнято іншими рядками (щоб одну витрату / день не зіставити двічі)
const refs = l => { const s = new Set(); for (const x of l) { const m = x.m; if (!m || x.st !== 'ok') continue;
  if (m.k === 'acq') m.days.forEach(d => s.add('a:' + d)); if (m.k === 'inv') m.ids.forEach(i => s.add('i:' + i)); if (m.k === 'exp') s.add(`e:${m.d}:${m.i}`); if (m.k === 'mov') s.add(`m:${m.d}:${m.i}`); if (m.k === 'agg') m.days.forEach(d => s.add(`g:${m.a}:${d}`)); if (m.fe) s.add(`e:${m.fe.d}:${m.fe.i}`); } return s; };

async function ctxOf(env, days) {
  const ds = [...new Set(days)].filter(d => d <= dayKey()), [dd, ee, mm] = await Promise.all(['day:', 'exp:', 'mov:'].map(p => ds.length ? env.DB.getMany(ds.map(d => p + d), 'json') : []));
  const day = {}, exp = [], mov = []; ds.forEach((d, j) => { day[d] = dd[j] || {}; (ee[j] || []).forEach((e, i) => exp.push({ ...e, d, i })); (mm[j] || []).forEach((e, i) => mov.push({ ...e, d, i })); });
  const aggs = (await (await import('./ops.js')).modOn(env, 'agg')) ? await aggOn(env) : [];
  return { day, exp, mov, aggs };
}
const cardOf = x => r2((x?.card || 0) - agTotal(x)); // безготівка дня разом з онлайном (банк відшкодовує одним або кількома платежами), без агрегаторів — їх виплачує агрегатор
// 🛵 виплата агрегатора: суцільний відрізок до 16 днів, що закінчується за 0–10 днів до надходження; комісія 0–45%, ближча до налаштованої — краща
function aggFind(line, ctx, used) {
  const a = ctx.aggs.find(g => aggRx(g).test(line.who + ' ' + line.pur)); if (!a) return null; let best = null;
  for (let e = 0; e <= 10; e++) { const end = addDays(line.d, -e); let gross = 0; const days = [];
    for (let n = 0; n < 16; n++) { const d = addDays(end, -n); if (used.has(`g:${a.id}:${d}`)) break; const g = r2(ctx.day[d]?.ag?.[a.id] || 0); if (!g) { if (n) continue; break; } gross = r2(gross + g); days.unshift(d);
      const f = r2(gross - line.sum); if (f >= -0.005 && f <= gross * 0.45) { const sc = Math.abs(f / gross * 100 - (a.fee || 0)) + e * 0.05; if (!best || sc < best.sc) best = { sc, days: [...days], gross, fee: Math.max(0, f) }; } } }
  return best ? { k: 'agg', a: a.id, n: a.n, days: best.days, gross: best.gross, fee: best.fee } : { hint: 'agg', n: a.n };
}
// еквайринг: суцільний відрізок днів до дати надходження, де безготівка − комісія (0–10%) = сума; ближча комісія до налаштованої — краща
function acqFind(line, ctx, used, fee0) {
  let best = null; const sc = (gross, f, end) => Math.abs(f / gross * 100 - fee0) + (line.d > end ? 0 : 3) + 0.01 * ((Date.parse(line.d) - Date.parse(end)) / 864e5);
  for (let e = 0; e <= WIN; e++) { const end = addDays(line.d, -e); let gross = 0; const days = [];
    for (let n = 0; n < 4; n++) { const d = addDays(end, -n); if (used.has('a:' + d)) break; const g = cardOf(ctx.day[d]); if (!g && n) continue; if (!g) break; gross = r2(gross + g); days.unshift(d);
      const f = r2(gross - line.sum); if (f >= -0.005 && f <= gross * 0.1) { const s = sc(gross, f, end); if (!best || s < best.s) best = { s, days: [...days], gross, fee: Math.max(0, f) }; } } }
  return best && { k: 'acq', days: best.days, gross: best.gross, fee: best.fee };
}
// пара для вже записаної операції: та сама сума ±WIN днів, ще не зіставлена
const near = (line, x) => Math.abs(Date.parse(x.d) - Date.parse(line.d)) <= WIN * 864e5;
function expFind(line, ctx, used) { const s = -line.sum, e = ctx.exp.find(x => !x.del && x.src === 'card' && Math.abs(x.sum - s) < 0.01 && near(line, x) && !used.has(`e:${x.d}:${x.i}`)); return e && { k: 'exp', d: e.d, i: e.i }; }
const MV_IN = ['kin', 'c2k'], MV_OUT = ['kout', 'k2c', 'tipk', 'salk'];
function movFind(line, ctx, used) { const tp = line.sum > 0 ? MV_IN : MV_OUT, s = Math.abs(line.sum), e = ctx.mov.find(x => !x.del && tp.includes(x.type) && Math.abs(x.sum - s) < 0.01 && near(line, x) && !used.has(`m:${x.d}:${x.i}`)); return e && { k: 'mov', d: e.d, i: e.i }; }
// накладні постачальника (за кодом ЄДРПОУ/ІПН або назвою): № у призначенні, одна з точною сумою, або кілька найстаріших разом
async function invFind(env, line, used) {
  const S = await import('./suppliers.js'), sl = (await env.DB.get('supl', 'json')) || [], nm = S.nrmSup(line.who);
  const sup = sl.filter(p => (line.code && p.code && String(p.code).replace(/\D/g, '') === line.code) || (nm && S.nrmSup(p.n) === nm)); if (!sup.length) return null;
  const ms = [monthOf(line.d), prevMonth(monthOf(line.d)), prevMonth(prevMonth(monthOf(line.d))), prevMonth(prevMonth(prevMonth(monthOf(line.d))))];
  const ids = new Set(sup.map(p => p.id)), names = new Set(sup.map(p => S.nrmSup(p.n)));
  const inv = (await env.DB.getMany(ms.map(m => 'invl:' + m), 'json')).flatMap(x => x || []).filter(x => !x.del && x.pay === 'debt' && (x.sid ? ids.has(x.sid) : names.has(S.nrmSup(x.sup))) && x.day <= line.d && !used.has('i:' + x.id)).sort((a, b) => a.ts - b.ts);
  const s = -line.sum, ok = l => l.length && Math.abs(l.reduce((a, x) => a + (+x.total || 0), 0) - s) < 0.01;
  const noOf = x => String(x.no || '').replace(/[^\w]/g, ''), byNo = inv.filter(x => noOf(x).length >= 2 && new RegExp(`(^|\\D)${noOf(x)}(\\D|$)`).test(line.pur)), was = l => l.every(x => x.paid);
  for (const l of [byNo, inv.filter(x => Math.abs(x.total - s) < 0.01).slice(0, 1)]) if (ok(l)) return { k: 'inv', ids: l.map(x => x.id), was: was(l) ? 1 : 0, sup: sup[0].n };
  const un = inv.filter(x => !x.paid); let acc = 0; for (let i = 0; i < un.length && i < 12; i++) { acc = r2(acc + un[i].total); if (Math.abs(acc - s) < 0.01) return { k: 'inv', ids: un.slice(0, i + 1).map(x => x.id), was: 0, sup: sup[0].n }; if (acc > s) break; }
  return { hint: 'sup', sup: sup[0].n, debt: r2(un.reduce((a, x) => a + x.total, 0)) };
}
// застосувати знайдене: накладні — оплата з картки (як у складі), еквайринг — комісія витратою з картки
async function apply(env, x, m, who) {
  if (m.k === 'inv' && !m.was) { const { invPay } = await import('./stock.js'); let n = 0; for (const id of m.ids) if (await invPay(env, id, 'card', who + ' · 🏦')) n++; m.new = n ? 1 : 0; }
  if ((m.k === 'acq' || m.k === 'agg') && m.fee >= 0.01) { const { addExpense } = await import('./ops.js'), d = x.d <= dayKey() ? x.d : dayKey(), dl = m.days.map(z => z.slice(8) + '.' + z.slice(5, 7));
    const i = await addExpense(env, { sum: m.fee, src: 'card', note: m.k === 'agg' ? `🛵 Комісія ${m.n} ${dl[0]}${dl.length > 1 ? '–' + dl[dl.length - 1] : ''}` : `🏦 Комісія еквайрингу ${dl.join(', ')}`, by: who, bank: x.id }, d); m.fe = { d, i }; }
  delete m.was; return m;
}
async function autoMatch(env, x, ctx, used, fee0, who) {
  if (x.st === 'x') return;
  let m = null, h = '';
  if (x.sum > 0) { const g = ctx.aggs?.length ? aggFind(x, ctx, used) : null; if (g?.k) m = g; else if (g?.hint) { h = 'agg'; x.sup = g.n; }
    if (!m && !h && ACQ.test(x.pur + ' ' + x.who)) { m = acqFind(x, ctx, used, fee0); if (!m) h = 'acq'; } if (!m) m = movFind(x, ctx, used); }
  else { const r = await invFind(env, x, used); if (r?.k) m = r; else { if (r?.hint) { h = 'sup'; x.sup = r.sup; } m = expFind(x, ctx, used) || movFind(x, ctx, used); } }
  if (m) { await apply(env, x, m, who); x.m = m; x.st = 'ok'; delete x.h; delete x.sup; for (const r of refs([x])) used.add(r); } else { x.st = 'q'; if (h) x.h = h; }
}

// ---------- API ----------
// 📥 імпорт: dry — лише показати, що буде; інакше записати нові рядки й одразу зіставити
export async function bankImport(env, text, { dry, name = '', who = '' } = {}) {
  const p = parseStatement(text); if (p.error) return p;
  if (!p.rows.length) return { error: 'У файлі не знайдено жодної операції' + (p.errs?.length ? ': ' + p.errs[0] : '') };
  const ms = [...new Set(p.rows.map(r => monthOf(r.d)))].sort(), have = new Set((await Promise.all(ms.map(m => getM(env, m)))).flat().map(x => x.id));
  const fresh = p.rows.filter(r => !have.has(r.id)), sum = s => r2(fresh.filter(r => s > 0 ? r.sum > 0 : r.sum < 0).reduce((a, r) => a + r.sum, 0));
  const info = { fmt: p.fmt, n: p.rows.length, add: fresh.length, dup: p.rows.length - fresh.length, bad: p.bad, errs: p.errs, from: p.rows.reduce((a, r) => r.d < a ? r.d : a, '9'), to: p.rows.reduce((a, r) => r.d > a ? r.d : a, ''), in: sum(1), out: sum(-1), own: p.own };
  if (dry || !fresh.length) return info;
  const own = new Set([...(((await env.DB.get('bank:own', 'json')) || [])), ...p.own]); if (p.own.length) await env.DB.put('bank:own', JSON.stringify([...own].slice(0, 20)));
  const fee0 = +(await (await import('./ops.js')).getCfg(env))?.bankFee || 1.5;
  return L(env, ['bank', ...ms.map(m => 'bank:' + m)], async () => {
    const all = Object.fromEntries(await Promise.all(ms.map(async m => [m, await getM(env, m)]))), ids = new Set(Object.values(all).flat().map(x => x.id));
    const add = fresh.filter(r => !ids.has(r.id)).sort((a, b) => a.d < b.d ? -1 : 1), days = [];
    for (const r of add) for (let i = -BACK; i <= WIN; i++) days.push(addDays(r.d, i));
    const ctx = await ctxOf(env, days), used = refs([...Object.values(all).flat(), ...(await Promise.all(ms.map(m => getM(env, prevMonth(m))))).flat()]);
    let ok = 0, q = 0;
    for (const r of add) { const x = { ...r, ts: Date.now() };
      if (own.has(x.iban)) { x.st = 'x'; x.why = 'own'; } else { await autoMatch(env, x, ctx, used, fee0, who); if (x.st === 'ok') ok++; else if (x.st === 'q') q++; }
      all[monthOf(x.d)].push(x); }
    for (const m of ms) await env.DB.put('bank:' + m, JSON.stringify(all[m]));
    await env.DB.put('bank:last', JSON.stringify({ ts: Date.now(), n: add.length, ok, name: T(name, 60), by: who, from: info.from, to: info.to }));
    await ledgerDocs(env, add, who).catch(e => console.log('bank ledger', e.message));
    return { ...info, add: add.length, ok, q };
  });
}
// 📒 кожна операція виписки — документ «🏦 Банк» в обліку (ext bank:<id>: повторний імпорт не дублює)
async function ledgerDocs(env, rows, who) {
  if (typeof env.DB.sql !== 'function') return; const { docAdd, kop } = await import('./ledger.js');
  for (const r of rows) await docAdd(env, { type: 'bank', ext: 'bank:' + r.id, day: r.d, sum: kop(r.sum), no: r.no, src: 'bank', body: { who: r.who, code: r.code, iban: r.iban, pur: r.pur } }, who);
}

// 📋 місяць: рядки, підсумки й дні, за які безготівка не надійшла (Z ↔ еквайринг)
export async function bankList(env, m = dayKey().slice(0, 7)) {
  if (!/^\d{4}-\d{2}$/.test(m)) m = dayKey().slice(0, 7);
  const [l, nx, last, own] = await Promise.all([getM(env, m), m < dayKey().slice(0, 7) ? getM(env, nextMonth(m)) : [], env.DB.get('bank:last', 'json'), env.DB.get('bank:own', 'json')]);
  l.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.ts - a.ts);
  const t = { in: 0, out: 0, ok: 0, q: 0, x: 0, fee: 0 }; for (const x of l) { t[x.sum > 0 ? 'in' : 'out'] += x.sum; t[x.st]++; if (x.m?.k === 'acq' || x.m?.k === 'agg') t.fee += x.m.fee || 0; }
  for (const k of ['in', 'out', 'fee']) t[k] = r2(t[k]);
  // дні з безготівкою, які не покрило жодне надходження: лише ті, що вже мали надійти (є виписка пізніше ніж на 3 дні)
  const covered = refs([...l, ...nx]), lastD = [...l, ...nx].reduce((a, x) => x.d > a ? x.d : a, '');
  const ds = []; for (let d = m + '-01'; d.startsWith(m) && d <= addDays(lastD || m + '-01', -3); d = addDays(d, 1)) ds.push(d);
  const dd = ds.length ? await env.DB.getMany(ds.map(d => 'day:' + d), 'json') : [];
  const miss = ds.map((d, j) => ({ d, card: cardOf(dd[j]) })).filter(x => x.card > 0 && !covered.has('a:' + x.d) && lastD);
  // 🛵 продажі агрегаторів без виплати: агрегатор платить раз на 1–2 тижні — лише дні, старші за 14 днів від останньої виписки
  const ag = {}; if (lastD) ds.forEach((d, j) => { if (d > addDays(lastD, -14)) return; for (const [a, v] of Object.entries(dd[j]?.ag || {})) if (!covered.has(`g:${a}:${d}`)) { const o = ag[a] || (ag[a] = { a, sum: 0, from: d, to: d }); o.sum = r2(o.sum + v); o.to = d; } });
  const names = Object.keys(ag).length ? Object.fromEntries((await aggOn(env)).map(g => [g.id, g.n])) : {};
  return { m, list: l.map(x => ({ ...x, mt: matchText(x) })), t, miss, missAg: Object.values(ag).map(o => ({ ...o, n: names[o.a] || o.a })), last, own: own || [] };
}
const nextMonth = m => { const [y, mm] = m.split('-').map(Number); return mm === 12 ? `${y + 1}-01` : `${y}-${pad(mm + 1)}`; };

// ✋ дія з рядком: exp (витрата з картки) · mov (внесення / вилучення з картки) · inv {ids} (оплата накладних) · acq {days} · skip {why} · un (повернути на підтвердження) · auto (спробувати ще раз)
export const WHY = { own: '🔁 Власний переказ', tax: '🏛 Податки / ЄСВ', sal: '👷 Зарплата', loan: '🏦 Кредит / депозит', other: '🙈 Інше' };
export async function bankAct(env, id, a, p = {}, who = '') {
  id = String(id || ''); const m = /^\d{4}/.test(id) ? `20${id.slice(0, 2)}-${id.slice(2, 4)}` : ''; if (!m) return { error: 'Немає такого рядка' };
  const ops = await import('./ops.js');
  return L(env, ['bank', 'bank:' + m], async () => {
    const l = await getM(env, m), x = l.find(y => y.id === id); if (!x) return { error: 'Немає такого рядка' };
    const today = dayKey(), d = x.d <= today ? x.d : today, note = `🏦 ${x.who ? x.who + ': ' : ''}${x.pur || 'банк'}`.slice(0, 100);
    if (a === 'un') {
      if (x.st === 'q') return { error: 'Рядок і так чекає підтвердження' };
      const mm = x.m; if (mm?.new && mm.k === 'exp') await ops.delExpense(env, mm.i, mm.d); if (mm?.new && mm.k === 'mov') await ops.delMove(env, mm.i, mm.d); if (mm?.fe) await ops.delExpense(env, mm.fe.i, mm.fe.d);
      const left = mm?.k === 'inv' && mm.new ? 'оплата накладних лишилась — скасуйте її у Складі, якщо треба' : '';
      delete x.m; delete x.why; x.st = 'q'; await env.DB.put('bank:' + m, JSON.stringify(l)); return { x, ...(left ? { warn: left } : {}) };
    }
    if (x.st !== 'q') return { error: 'Рядок уже розібрано — спершу «↩️ Скасувати»' };
    if (a === 'skip') { if (!WHY[p.why]) return { error: 'Оберіть причину' }; x.st = 'x'; x.why = p.why; }
    else if (a === 'exp') { if (x.sum > 0) return { error: 'Це надходження, а не витрата' }; const i = await ops.addExpense(env, { sum: -x.sum, src: 'card', note, by: who, bank: x.id }, d); x.m = { k: 'exp', d, i, new: 1 }; x.st = 'ok'; }
    else if (a === 'mov') { const e = await ops.addMove(env, { type: x.sum > 0 ? 'kin' : 'kout', sum: Math.abs(x.sum), note, by: who }); if (!e) return { error: 'Сума поза межами' };
      const i = (await ops.getMov(env)).findIndex(y => y.ts === e.ts); x.m = { k: 'mov', d: today, i, new: 1 }; x.st = 'ok'; }
    else if (a === 'inv' || a === 'acq' || a === 'agg' || a === 'auto') {
      const near3 = []; for (let i = -BACK; i <= WIN; i++) near3.push(addDays(x.d, i));
      const used = refs([...l, ...(await getM(env, prevMonth(m))), ...(await getM(env, nextMonth(m)))]), fee0 = +(await ops.getCfg(env))?.bankFee || 1.5;
      if (a === 'auto') { await autoMatch(env, x, await ctxOf(env, near3), used, fee0, who); if (x.st !== 'ok') return { error: 'Пари не знайдено — оберіть дію вручну' }; }
      else if (a === 'agg') { if (x.sum < 0) return { error: 'Виплата агрегатора — це надходження' }; const days = [].concat(p.days || []).filter(isDay).slice(0, 31); if (!days.length) return { error: 'Оберіть дні' };
        const ag = (await aggOn(env)).find(g => g.id === p.ag); if (!ag) return { error: 'Оберіть агрегатор' }; if (days.some(z => used.has(`g:${ag.id}:${z}`))) return { error: 'Цей день уже зіставлено з іншою виплатою' };
        const ctx = await ctxOf(env, days), gross = r2(days.reduce((s, z) => s + (ctx.day[z]?.ag?.[ag.id] || 0), 0)), fee = r2(gross - x.sum);
        if (!gross) return { error: `У ці дні не було продажів через ${ag.n}` }; if (fee < -0.005 || fee > gross * 0.6) return { error: `Не сходиться: продажі ${ag.n} ${money(gross)}, надійшло ${money(x.sum)}` };
        x.m = await apply(env, x, { k: 'agg', a: ag.id, n: ag.n, days, gross, fee: Math.max(0, fee) }, who); x.st = 'ok'; }
      else if (a === 'acq') { if (x.sum < 0) return { error: 'Еквайринг — це надходження' }; const days = [].concat(p.days || []).filter(isDay).slice(0, 7); if (!days.length) return { error: 'Оберіть дні' };
        if (days.some(z => used.has('a:' + z))) return { error: 'Цей день уже зіставлено з іншим надходженням' };
        const ctx = await ctxOf(env, days), gross = r2(days.reduce((s, z) => s + cardOf(ctx.day[z]), 0)), fee = r2(gross - x.sum);
        if (!gross) return { error: 'У ці дні не було безготівки' }; if (fee < -0.005 || fee > gross * 0.2) return { error: `Не сходиться: безготівка ${money(gross)}, надійшло ${money(x.sum)}` };
        x.m = await apply(env, x, { k: 'acq', days, gross, fee: Math.max(0, fee) }, who); x.st = 'ok'; }
      else { if (x.sum > 0) return { error: 'Оплата накладної — це списання' }; const ids = [].concat(p.ids || []).map(String).slice(0, 30); if (!ids.length) return { error: 'Оберіть накладні' };
        if (ids.some(i => used.has('i:' + i))) return { error: 'Накладна вже зіставлена з іншим платежем' };
        const inv = (await env.DB.getMany(ids.map(i => 'inv:' + i), 'json')); if (inv.some(v => !v || v.del || v.pay !== 'debt')) return { error: 'Накладну не знайдено або вона не в борг' };
        const tot = r2(inv.reduce((s, v) => s + (+v.total || 0), 0)); if (Math.abs(tot - -x.sum) >= 0.01) return { error: `Сума накладних ${money(tot)} ≠ платіж ${money(-x.sum)}` };
        x.m = await apply(env, x, { k: 'inv', ids, was: inv.every(v => v.paid) ? 1 : 0 }, who); x.st = 'ok'; }
    } else return { error: 'Невідома дія' };
    delete x.h; delete x.sup; x.by = who; await env.DB.put('bank:' + m, JSON.stringify(l)); return { x };
  });
}
// ⚠️ накладні в борг для ручного вибору (постачальник рядка першим)
export async function bankInvs(env, id) {
  const m = `20${String(id).slice(0, 2)}-${String(id).slice(2, 4)}`, x = (await getM(env, m)).find(y => y.id === id); if (!x) return { error: 'Немає такого рядка' };
  const S = await import('./suppliers.js'), ms = []; let k = monthOf(x.d); for (let i = 0; i < 4; i++) { ms.push(k); k = prevMonth(k); }
  const inv = (await env.DB.getMany(ms.map(z => 'invl:' + z), 'json')).flatMap(z => z || []).filter(v => !v.del && v.pay === 'debt' && !v.paid), nm = S.nrmSup(x.sup || x.who);
  return { list: inv.map(v => ({ id: v.id, day: v.day, sup: v.sup, no: v.no || '', total: v.total, my: nm && S.nrmSup(v.sup) === nm ? 1 : 0 })).sort((a, b) => b.my - a.my || (a.day < b.day ? -1 : 1)).slice(0, 60) };
}

// ---------- бот ----------
const ICON = { ok: '✅', q: '⚠️', x: '🙈' };
export const lineText = x => `${ICON[x.st]} ${x.d.slice(8)}.${x.d.slice(5, 7)} <b>${x.sum > 0 ? '+' : '−'}${money(Math.abs(x.sum))}</b> ${esc(x.who || '')}${x.pur ? `\n<i>${esc(x.pur.slice(0, 120))}</i>` : ''}${matchText(x) ? '\n' + matchText(x) : ''}`;
export const matchText = x => { const m = x.m; if (x.st === 'x') return WHY[x.why] || ''; if (!m) return x.h === 'acq' ? '💳 схоже на еквайринг — сума не зійшлась з безготівкою днів' : x.h === 'agg' ? `🛵 ${x.sup || 'агрегатор'}: сума не зійшлась з продажами` : x.h === 'sup' ? `🏭 ${x.sup || 'постачальник'}: сума не збіглась з накладними` : '';
  if (m.k === 'acq') return `💳 еквайринг за ${m.days.map(d => d.slice(8) + '.' + d.slice(5, 7)).join(', ')} · безготівка ${money(m.gross)} · комісія ${money(m.fee)} (${m.gross ? Math.round(m.fee / m.gross * 1000) / 10 : 0}%)`;
  if (m.k === 'agg') return `🛵 ${m.n} за ${m.days[0].slice(8)}.${m.days[0].slice(5, 7)}${m.days.length > 1 ? '–' + m.days[m.days.length - 1].slice(8) + '.' + m.days[m.days.length - 1].slice(5, 7) : ''} · продажі ${money(m.gross)} · комісія ${money(m.fee)} (${m.gross ? Math.round(m.fee / m.gross * 1000) / 10 : 0}%)`;
  if (m.k === 'inv') return `🧾 оплата накладних: ${m.ids.length}${m.new ? ' · позначено оплаченими' : ''}`; if (m.k === 'exp') return `💸 витрата з картки${m.new ? ' (записано звіркою)' : ''}`; if (m.k === 'mov') return `🔁 рух картки${m.new ? ' (записано звіркою)' : ''}`; return ''; };
export const lineKb = x => x.st !== 'q' ? [[{ text: '↩️ Скасувати', callback_data: 'bnk:un:' + x.id }]] : [
  [x.sum < 0 ? { text: '💸 Витрата', callback_data: 'bnk:exp:' + x.id } : { text: '➕ Внесення', callback_data: 'bnk:mov:' + x.id }, x.sum < 0 ? { text: '➖ Вилучення', callback_data: 'bnk:mov:' + x.id } : { text: '🔎 Шукати пару', callback_data: 'bnk:auto:' + x.id }],
  [{ text: '🔁 Власний', callback_data: 'bnk:skip:' + x.id + ':own' }, { text: '🏛 Податки', callback_data: 'bnk:skip:' + x.id + ':tax' }, { text: '🙈 Інше', callback_data: 'bnk:skip:' + x.id + ':other' }]];
export async function bankBotView(env) {
  const r = await bankList(env), L0 = r.last;
  const head = `🏦 <b>Банк · ${r.m.slice(5)}.${r.m.slice(0, 4)}</b>\n➕ надійшло ${money(r.t.in)} · ➖ списано ${money(-r.t.out)}${r.t.fee ? ` · комісія ${money(r.t.fee)}` : ''}\n✅ зіставлено ${r.t.ok} · ⚠️ на підтвердження <b>${r.t.q}</b> · 🙈 пропущено ${r.t.x}`;
  const miss = r.miss.length ? `\n\n💳 <b>Не надійшла безготівка</b> за: ${r.miss.slice(0, 10).map(x => `${x.d.slice(8)}.${x.d.slice(5, 7)} (${money(x.card)})`).join(', ')}` : '';
  const tail = L0 ? `\n\nОстанній імпорт: ${new Date(L0.ts).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' })} · ${L0.n} операцій` : '\n\nВиписок ще немає.';
  return { text: head + miss + tail + '\n\n📎 Надішліть файл виписки (1С .txt або CSV з інтернет-банку) — я його розберу.', q: r.list.filter(x => x.st === 'q').slice(0, 8) };
}
export const importText = r => r.error ? '⚠️ ' + r.error : `🏦 <b>Виписка ${r.from.split('-').reverse().join('.')}–${r.to.split('-').reverse().join('.')}</b> (${r.fmt === '1c' ? '1С' : 'CSV'})\nНових операцій: <b>${r.add}</b>${r.dup ? ` · уже були: ${r.dup}` : ''}${r.bad ? ` · ⚠️ без дати/суми: ${r.bad}` : ''}\n➕ ${money(r.in)} · ➖ ${money(-r.out)}${r.add ? `\n✅ зіставлено автоматично: ${r.ok || 0} · ⚠️ на підтвердження: <b>${r.q || 0}</b>` : ''}`;
export async function bankNotify(env, r, who) { if (r?.add) await notify(env, `🏦 Виписка: ${r.add} операцій, ⚠️ на підтвердження ${r.q} — ${esc(who)}`).catch(() => {}); }
