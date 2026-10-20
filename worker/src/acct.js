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
