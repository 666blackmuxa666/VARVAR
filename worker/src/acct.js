// 📤 Експорт для бухгалтера: таблиці за період (продажі, оплати, приходи складу, списання, ЗП). Лише читання.
import { reportRange } from './ops.js';
import { costReport } from './stock.js';
import { payroll } from './pay.js';

const r2 = n => Math.round((+n || 0) * 100) / 100;
const months = (from, to) => { const out = []; let y = +from.slice(0, 4), m = +from.slice(5, 7); const e = to.slice(0, 7); for (let i = 0; i < 60; i++) { const k = y + '-' + String(m).padStart(2, '0'); out.push(k); if (k >= e) break; if (++m > 12) { m = 1; y++; } } return out; };

export async function acctExport(env, from, to) {
  const r = await reportRange(env, from, to); if (!r) return null;
  const mm = months(from, to), sections = [];
  const by = {}, pay = { cash: 0, card: 0, onl: 0, tip: 0, disc: 0, sum: 0 };
  for (const c of r.checks) {
    const a = by[c.d] || (by[c.d] = { n: 0, sum: 0, cash: 0, card: 0, onl: 0, tip: 0, disc: 0 });
    a.n++; a.sum += c.sum; a.cash += c.cash; a.card += c.card; a.onl += c.onl; a.tip += c.tip; a.disc += c.disc;
    for (const k of ['sum', 'cash', 'card', 'onl', 'tip', 'disc']) pay[k] += c[k];
  }
  sections.push({ id: 'sales', title: 'Продажі по днях', head: ['Дата', 'Чеків', 'Сума', 'Готівка', 'Карта (з онлайном)', 'з них онлайн', 'Чайові', 'Знижки'],
    rows: [...Object.keys(by).sort().map(d => { const a = by[d]; return [d, a.n, r2(a.sum), r2(a.cash), r2(a.card), r2(a.onl), r2(a.tip), r2(a.disc)]; }), ['Разом', r.checks.length, r2(pay.sum), r2(pay.cash), r2(pay.card), r2(pay.onl), r2(pay.tip), r2(pay.disc)]] });
  sections.push({ id: 'checks', title: 'Чеки', head: ['Дата', 'Час', '№', 'Тип', 'Сума', 'Готівка', 'Карта (з онлайном)', 'з них онлайн', 'Чайові', 'Знижка', 'Офіціант'],
    rows: r.checks.map(c => [c.d, c.at || '', c.id, c.t || '', r2(c.sum), r2(c.cash), r2(c.card), r2(c.onl), r2(c.tip), r2(c.disc), c.w || '']) });
  sections.push({ id: 'pay', title: 'Оплати за типами', head: ['Тип оплати', 'Сума'], rows: [['💵 Готівка', r2(pay.cash)], ['💳 Карта — термінал і переказ', r2(pay.card - pay.onl)], ['🌐 Онлайн', r2(pay.onl)], ['Разом', r2(pay.cash + pay.card)], ['з них чайові', r2(pay.tip)]] }); // онлайн уже входить у card
  const invs = (await env.DB.getMany(mm.map(m => 'invl:' + m), 'json')).flatMap(l => l || []).filter(x => !x.del && x.day >= from && x.day <= to).sort((a, b) => (a.day < b.day ? -1 : 1));
  sections.push({ id: 'inv', title: 'Приходи складу (накладні)', head: ['Дата', 'Постачальник', '№ накладної', 'Позицій', 'Сума', 'Оплата', 'Сплачено'],
    rows: [...invs.map(x => [x.day, x.sup || '', x.no || '', x.n || 0, r2(x.total), x.pay || '', x.paid ? 'так' : 'ні']), ['Разом', '', '', '', r2(invs.reduce((a, x) => a + (+x.total || 0), 0)), '', '']] });
  const cr = await costReport(env, from, to);
  sections.push({ id: 'off', title: 'Списання (за причинами)', head: ['Причина', 'Сума'], rows: [...(cr?.off || []).map(([k, v]) => [k, r2(v)]), ['Разом', r2(cr?.offSum || 0)]] });
  sections.push({ id: 'offIng', title: 'Списання (топ продуктів)', head: ['Продукт', 'Сума'], rows: (cr?.offIng || []).map(([k, v]) => [k, r2(v)]) });
  const exp = r.exp || [];
  sections.push({ id: 'exp', title: 'Витрати з каси', head: ['Дата', 'Час', 'Сума', 'Джерело', 'Примітка'], rows: [...exp.map(x => [x.d, x.at || '', r2(x.sum), x.src || '', x.note || '']), ['Разом', '', r2(exp.reduce((a, x) => a + (+x.sum || 0), 0)), '', '']] });
  const zp = [];
  for (const m of mm) { const p = await payroll(env, m); for (const x of p.rows) if (x.shifts || x.earned || x.paid || x.adv) zp.push([m, x.n, x.role || '', x.shifts, x.hours, r2(x.earned), r2(x.adv), r2(x.paid), r2(x.due)]); }
  sections.push({ id: 'zp', title: 'Зарплата (по місяцях)', head: ['Місяць', 'Працівник', 'Роль', 'Змін', 'Годин', 'Нараховано', 'Аванс', 'Виплачено', 'Залишок'],
    rows: [...zp, ['Разом', '', '', '', '', r2(zp.reduce((a, x) => a + x[5], 0)), r2(zp.reduce((a, x) => a + x[6], 0)), r2(zp.reduce((a, x) => a + x[7], 0)), r2(zp.reduce((a, x) => a + x[8], 0))]] });
  const bk = (await env.DB.getMany(mm.map(m => 'bank:' + m), 'json')).flatMap(l => l || []).filter(x => x.d >= from && x.d <= to).sort((a, b) => (a.d < b.d ? -1 : 1)); // 🏦 виписки (етап 2)
  if (bk.length) { const { matchText } = await import('./bank.js');
    sections.push({ id: 'bank', title: 'Банк (виписка)', head: ['Дата', '№', 'Надійшло', 'Списано', 'Контрагент', 'ЄДРПОУ / ІПН', 'Рахунок', 'Призначення', 'Звірка'],
      rows: [...bk.map(x => [x.d, x.no || '', x.sum > 0 ? r2(x.sum) : '', x.sum < 0 ? r2(-x.sum) : '', x.who || '', x.code || '', x.iban || '', x.pur || '', ({ ok: '✅ ', q: '⚠️ на підтвердження', x: '' }[x.st] || '') + matchText(x)]),
        ['Разом', '', r2(bk.reduce((a, x) => a + (x.sum > 0 ? x.sum : 0), 0)), r2(-bk.reduce((a, x) => a + (x.sum < 0 ? x.sum : 0), 0)), '', '', '', '', '']] }); }
  return { from, to, sections };
}

// 🧮 Кабінет бухгалтера «Мої клієнти»: короткий стан закладу за період — продажі за типами оплат, банк (черга, нестачі), найближчі податкові події. Лише читання.
export async function accSum(env, from, to) {
  const { reportRange: rr, dayKey } = await import('./ops.js'), today = dayKey(), m = to.slice(0, 7);
  const [r, payer, B, T] = await Promise.all([rr(env, from, to), env.DB.get('payer', 'json'), import('./bank.js'), import('./tax.js')]);
  const s = { n: 0, sum: 0, cash: 0, card: 0, onl: 0, tip: 0 }; for (const c of r?.checks || []) { s.n++; for (const k of ['sum', 'cash', 'card', 'onl', 'tip']) s[k] += +c[k] || 0; }
  for (const k of ['sum', 'cash', 'card', 'onl', 'tip']) s[k] = r2(s[k]);
  const bk = await B.bankList(env, m), tax = await T.getTax(env);
  return { from, to, payer: payer ? { n: payer.n || '' } : null, sales: s, exp: r2((r?.exp || []).reduce((a, x) => a + (+x.sum || 0), 0)),
    bank: { m, last: bk.last?.to || null, in: bk.t.in, out: bk.t.out, fee: bk.t.fee, q: bk.t.q, miss: bk.miss.length, missAg: bk.missAg.length },
    tax: { kind: tax.kind || '', next: tax.kind ? T.taxEvents(tax, today, 3, 45).filter(e => !e.done).slice(0, 4).map(e => ({ d: e.d, t: e.title, pay: e.t === 'pay' ? 1 : 0, left: e.left })) : [] } };
}

// 🧾 Файли для програм бухгалтера: M.E.Doc (зведені ПН за щоденними підсумками, XML J1201016, ZIP) і BAS (CSV продажів по позиціях для atom-bas-import.ps1).
// Продажі по позиціях: знижки й доставка розкладаються на страви чека пропорційно, чайові не входять. Лише читання.
const DKPP = '56.10', SVC = 'Послуги з громадського харчування';
async function dayItems(env, r) {
  const { exUkOf } = await import('./excise.js'), uk = await exUkOf(env), by = {};
  for (const c of r.checks) {
    const tot = c.dishes.reduce((a, x) => a + (+x[2] || 0), 0), k = tot > 0 ? (c.sum - c.tip) / tot : 0, m = by[c.d] ||= new Map();
    for (const [n, q, s] of c.dishes) { if (!(q > 0)) continue; const a = m.get(n) || { n, uk: uk(n), q: 0, g: 0 }; a.q += q; a.g += (+s || 0) * k; m.set(n, a); }
  }
  return by;
}
const cpOk = s => String(s ?? '').replace(/[^\x20-\x7EА-яЁёЄєІіЇїҐґ«»№–—’ʼ]/g, '').replace(/ʼ/g, '’').replace(/\s+/g, ' ').trim();
const CP = { 0x401: 0xA8, 0x451: 0xB8, 0x404: 0xAA, 0x454: 0xBA, 0x406: 0xB2, 0x456: 0xB3, 0x407: 0xAF, 0x457: 0xBF, 0x490: 0xA5, 0x491: 0xB4, 0xAB: 0xAB, 0xBB: 0xBB, 0x2116: 0xB9, 0x2013: 0x96, 0x2014: 0x97, 0x2019: 0x92 };
const cp1251 = s => Uint8Array.from([...s], ch => { const c = ch.codePointAt(0); return c < 0x80 ? c : c >= 0x410 && c <= 0x44F ? c - 0x350 : CP[c] || 0x3F; });
const xe = s => cpOk(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) { // без стиснення (store) — M.E.Doc імпортує XML після розпакування
  const parts = [], cen = []; let off = 0;
  const h = (n, ...v) => { const b = new Uint8Array(n), d = new DataView(b.buffer); let i = 0; for (const [sz, x] of v) { sz === 2 ? d.setUint16(i, x, true) : d.setUint32(i, x, true); i += sz; } return b; };
  for (const f of files) {
    const nm = new TextEncoder().encode(f.name), crc = crc32(f.data), L = f.data.length;
    const lh = h(30, [4, 0x04034b50], [2, 20], [2, 0], [2, 0], [2, 0], [2, 0x21], [4, crc], [4, L], [4, L], [2, nm.length], [2, 0]);
    cen.push([h(46, [4, 0x02014b50], [2, 20], [2, 20], [2, 0], [2, 0], [2, 0], [2, 0x21], [4, crc], [4, L], [4, L], [2, nm.length], [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, off]), nm]);
    parts.push(lh, nm, f.data); off += 30 + nm.length + L;
  }
  const cs = cen.flat(), csz = cs.reduce((a, b) => a + b.length, 0);
  const all = [...parts, ...cs, h(22, [4, 0x06054b50], [2, 0], [2, 0], [2, files.length], [2, files.length], [4, csz], [4, off], [2, 0])], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let i = 0; for (const b of all) { out.set(b, i); i += b.length; } return out;
}
const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const f2 = n => r2(n).toFixed(2), fq = n => String(Math.round(n * 1000) / 1000), fp = n => String(Math.round(n * 1e6) / 1e6);
const nil = t => `<${t} xsi:nil="true" />`, tg = (t, v) => v === '' || v == null ? nil(t) : `<${t}>${xe(v)}</${t}>`;
// одна зведена ПН за день (тип причини 11, покупець «Неплатник» 100000000000); ставка 20 % — ціни меню з ПДВ
function pnXml(p, d, num, lines) {
  const [Y, M, D] = d.split('-'), dt = D + M + Y, sti = p.sti, tot = { g: 0, b: 0, v: 0 };
  const rows = lines.map((l, i) => { const k = i + 1, b = r2(l.g / 1.2), v = r2(l.g - b), A = (t, x) => x === '' || x == null ? `<${t} ROWNUM="${k}" xsi:nil="true" />` : `<${t} ROWNUM="${k}">${xe(x)}</${t}>`;
    tot.g += l.g; tot.b += b; tot.v += v;
    return [A('RXXXXG3S', l.svc ? SVC : l.n), A('RXXXXG4', l.uk || ''), A('RXXXXG32', ''), A('RXXXXG33', l.svc ? DKPP : ''), A('RXXXXG4S', l.svc ? 'послуга' : 'шт'), A('RXXXXG105_2S', l.svc ? '' : '2009'),
      A('RXXXXG5', fq(l.svc ? 1 : l.q)), A('RXXXXG6', fp(l.svc ? b : b / l.q)), A('RXXXXG008', '20'), A('RXXXXG009', ''), A('RXXXXG010', f2(b)), A('RXXXXG11_10', f2(v))].join('\n    '); });
  const kind = p.tin.length === 8 ? '1' : '2', body = [nil('R01G1'), nil('R03G10S'), tg('HORIG1', '1'), tg('HTYPR', '11'), tg('HFILL', dt), tg('HNUM', num), nil('HNUM1'),
    tg('HNAMESEL', p.n), tg('HNAMEBUY', 'Неплатник'), tg('HKSEL', p.ipn), nil('HNUM2'), tg('HTINSEL', p.tin), tg('HKS', kind), tg('HKBUY', '100000000000'), nil('HFBUY'), nil('HTINBUY'), nil('HKB'),
    tg('R04G11', f2(tot.g)), tg('R03G11', f2(tot.v)), tg('R03G7', f2(tot.v)), nil('R03G109'), nil('R03G14'), tg('R01G7', f2(tot.b)), nil('R01G109'), nil('R01G14'), nil('R01G9'), nil('R01G8'), nil('R01G10'), nil('R02G11'),
    ...rows, tg('HBOS', p.boss || ''), tg('HKBOS', p.bossN || ''), nil('R003G10S')];
  const head = [tg('TIN', p.tin), tg('C_DOC', 'J12'), tg('C_DOC_SUB', '010'), tg('C_DOC_VER', '16'), tg('C_DOC_TYPE', '0'), tg('C_DOC_CNT', num), tg('C_REG', sti.slice(0, 2)), tg('C_RAJ', sti.slice(2)),
    tg('PERIOD_MONTH', +M), tg('PERIOD_TYPE', '1'), tg('PERIOD_YEAR', Y), tg('C_STI_ORIG', sti), tg('C_DOC_STAN', '1'), nil('LINKED_DOCS'), tg('D_FILL', dt), tg('SOFTWARE', 'ATOM')];
  const xml = `<?xml version="1.0" encoding="windows-1251"?>\n<DECLAR xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="J1201016.XSD">\n  <DECLARHEAD>\n    ${head.join('\n    ')}\n  </DECLARHEAD>\n  <DECLARBODY>\n    ${body.join('\n    ')}\n  </DECLARBODY>\n</DECLAR>\n`;
  return { name: `${sti}${p.tin.padStart(10, '0')}J1201016100${String(num).padStart(7, '0')}1${M}${Y}${sti}.xml`, data: cp1251(xml), g: tot.g };
}
export async function acctFile(env, from, to, fmt, no) {
  const r = await reportRange(env, from, to); if (!r) return { error: 'Невірний період' };
  const { getTax } = await import('./tax.js'), tax = await getTax(env), by = await dayItems(env, r), days = Object.keys(by).sort();
  if (fmt === 'bas') { // CSV для atom-bas-import.ps1 (або ручного завантаження в BAS): одна позиція — один рядок
    const pdv = !!tax.pdv, rows = [['Дата', 'Номенклатура', 'Кількість', 'Сума з ПДВ', 'Ставка ПДВ', 'Сума ПДВ', 'УКТ ЗЕД', 'ДКПП']];
    for (const d of days) for (const a of [...by[d].values()].sort((x, y) => x.n.localeCompare(y.n, 'uk'))) { const g = r2(a.g); if (g <= 0) continue; rows.push([d, a.n, fq(a.q), g.toFixed(2), pdv ? '20' : 'без ПДВ', pdv ? f2(g - g / 1.2) : '', a.uk, a.uk ? '' : DKPP]); }
    if (rows.length < 2) return { error: 'Немає продажів за період' };
    const csv = '﻿' + rows.map(x => x.map(v => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(';')).join('\r\n') + '\r\n';
    return { name: `bas-prodazhi-${from}_${to}.csv`, b64: b64(new TextEncoder().encode(csv)), n: rows.length - 1 };
  }
  if (fmt !== 'medoc') return { error: 'Невідомий формат' };
  const p = tax.pn || {};
  if (!tax.pdv) return { error: 'Податкові накладні — лише для платника ПДВ: увімкніть у ⚙️ «📅 Податковий календар»' };
  if (!p.tin || !p.ipn || !p.sti || !p.n) return { error: 'Заповніть реквізити для податкових накладних: ⚙️ «📅 Податковий календар»' };
  const files = []; let mo = '', num = 0;
  for (const d of days) {
    const ls = [...by[d].values()].filter(a => a.g > 0.004), svc = ls.filter(a => !a.uk).reduce((s, a) => s + a.g, 0);
    const lines = [...(r2(svc) > 0 ? [{ svc: 1, g: r2(svc) }] : []), ...ls.filter(a => a.uk).map(a => ({ n: a.n, uk: a.uk, q: a.q, g: r2(a.g) })).filter(a => a.g > 0)];
    if (!lines.length) continue;
    if (d.slice(0, 7) !== mo) { num = mo ? 1 : Math.max(1, Math.round(+no) || 1); mo = d.slice(0, 7); } else num++; // нумерація ПН щомісяця з 1 (перший місяць — з номера, який вказав бухгалтер)
    files.push(pnXml(p, d, num, lines));
  }
  if (!files.length) return { error: 'Немає продажів за період' };
  return { name: `medoc-PN-${from}_${to}.zip`, b64: b64(zip(files)), n: files.length };
}
