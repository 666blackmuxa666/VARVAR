// 📅 Податковий календар: власник обирає ФОП (1/2/3 група) або ТОВ → дати звітів і платежів + нагадування в Telegram.
// Без КЕП і без доступу до рахунків: лише дати, орієнтовні суми й посилання на кабінет платника. Усі ставки — з налаштувань, «звірте з бухгалтером».
import { dayKey, esc, money, notify, tg, L } from './ops.js';

export const TAX_LINK = 'https://cabinet.tax.gov.ua/';
export const KINDS = { fop1: 'ФОП 1 група', fop2: 'ФОП 2 група', fop3: 'ФОП 3 група', tov: 'ТОВ (загальна система)' };
export const RATES = { minWage: 8647, living: 3328, esv: 22, ep3: 5, vz: 1, pdfo: 18, vzZp: 5 }; // 2026; змінюються власником
const r2 = n => Math.round((+n || 0) * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10); // m/d можуть «переливатись» (m=14 → наступний рік)
const workday = s => { const t = new Date(s + 'T12:00:00Z'), w = t.getUTCDay(); if (w === 6) t.setUTCDate(t.getUTCDate() + 2); else if (w === 0) t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); }; // вихідний → наступний робочий
const plus = (s, n) => { const t = new Date(s + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const diff = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400e3);
const qEnd = (y, q) => iso(y, q * 3 + 1, 0); // останній день кварталу q (1..4)
const qName = (y, q) => `${q} кв. ${y}`;
const mName = (y, m) => `${pad(((m - 1) % 12 + 12) % 12 + 1)}.${y + Math.floor((m - 1) / 12)}`;

export const getTax = async env => ({ kind: '', pdv: 0, on: 1, lead: 3, rates: {}, done: {}, ...((await env.DB.get('tax', 'json')) || {}) });
export const rateOf = tax => ({ ...RATES, ...(tax.pdv ? { ep3: 3 } : {}), ...(tax.rates || {}) }); // ФОП 3 групи: 5 % (без ПДВ) або 3 % (платник ПДВ)

// усі події року Y (дата, ключ, назва); per — період, за який рахується орієнтовна сума
function yearEvents(tax, Y) {
  const k = tax.kind, ev = [], add = (d, id, t, title, extra = {}) => { d = workday(d); ev.push({ key: id + ':' + d, d, id, t, title, ...extra }); };
  if (!KINDS[k]) return ev;
  if (k === 'fop3') {
    for (const [q, y] of [[4, Y - 1], [1, Y], [2, Y], [3, Y]]) {
      const per = [iso(y, q * 3 - 2, 1), qEnd(y, q)], dl = plus(per[1], 40);
      add(dl, 'decl', 'decl', `📄 Декларація платника ЄП за ${qName(y, q)}`);
      add(plus(dl, 10), 'ep', 'pay', `💰 Єдиний податок за ${qName(y, q)}`, { per, calc: 'ep3' });
      add(plus(dl, 10), 'vz', 'pay', `💰 Військовий збір за ${qName(y, q)}`, { per, calc: 'vz' });
      add(iso(y, q * 3 + 1, 20), 'esv', 'pay', `💰 ЄСВ за себе за ${qName(y, q)}`, { calc: 'esvQ' });
      if (tax.pdv) { add(dl, 'pdvDecl', 'decl', `📄 Декларація з ПДВ за ${qName(y, q)}`); add(plus(dl, 10), 'pdv', 'pay', `💰 ПДВ за ${qName(y, q)}`); } // платник ЄП-ПДВ: податковий період — квартал
    }
  } else if (k === 'fop1' || k === 'fop2') {
    for (let m = 1; m <= 12; m++) {
      add(iso(Y, m, 20), 'ep', 'pay', `💰 Єдиний податок за ${mName(Y, m)}`, { calc: k });
      add(iso(Y, m, 20), 'esv', 'pay', `💰 ЄСВ за себе за ${mName(Y, m - 1)}`, { calc: 'esvM' });
    }
    add(iso(Y, 3, 1), 'decl', 'decl', `📄 Річна декларація платника ЄП за ${Y - 1}`);
  } else { // ТОВ
    for (let m = 1; m <= 12; m++) {
      add(iso(Y, m, 20), 'zp', 'pay', `💰 ЄСВ, ПДФО та військовий збір із зарплати за ${mName(Y, m - 1)}`, { calc: 'zp', mon: iso(Y, m - 1, 1).slice(0, 7) });
      if (tax.pdv) { add(iso(Y, m, 20), 'pdvDecl', 'decl', `📄 Декларація з ПДВ за ${mName(Y, m - 1)}`); add(iso(Y, m, 30), 'pdv', 'pay', `💰 ПДВ за ${mName(Y, m - 1)}`); }
    }
    for (const [q, y] of [[4, Y - 1], [1, Y], [2, Y], [3, Y]]) { add(plus(qEnd(y, q), 40), 'f1', 'decl', `📄 Звіт з ПДФО (1ДФ) і декларація з прибутку за ${qName(y, q)}`); }
  }
  return ev;
}
// найближчі події: від (сьогодні − back) на days вперед; без дублювання ключів
export function taxEvents(tax, today = dayKey(), back = 10, days = 120) {
  const y = +today.slice(0, 4), from = plus(today, -back), to = plus(today, days), seen = new Set();
  return [y - 1, y, y + 1].flatMap(Y => yearEvents(tax, Y)).filter(e => e.d >= from && e.d <= to && !seen.has(e.key) && seen.add(e.key)).sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.key < b.key ? -1 : 1))
    .map(e => ({ ...e, left: diff(e.d, today), done: !!tax.done?.[e.key] }));
}
// орієнтовна сума (₴) — або null, якщо порахувати нема з чого
export async function taxAmount(env, tax, e) {
  const R = rateOf(tax), c = e.calc; if (!c) return null;
  if (c === 'fop1') return r2(R.living * 0.1);
  if (c === 'fop2') return r2(R.minWage * 0.2);
  if (c === 'esvM') return r2(R.minWage * R.esv / 100);
  if (c === 'esvQ') return r2(R.minWage * R.esv / 100 * 3);
  if (c === 'ep3' || c === 'vz') {
    const { incMonth } = await import('./income.js'), a = e.per[0].slice(0, 7), b = e.per[1].slice(0, 7); let rev = 0; // дохід — як у 📒 книзі доходів (чеки без чайових + сертифікати, передоплати, інший дохід)
    for (let m = a, i = 0; m <= b && i < 12; i++) { rev += (await incMonth(env, m)).t.tot; const t = +m.slice(0, 4) * 12 + +m.slice(5, 7); m = `${Math.floor(t / 12)}-${pad(t % 12 + 1)}`; }
    return r2(rev * (c === 'ep3' ? R.ep3 : R.vz) / 100);
  }
  if (c === 'zp') { const p = await (await import('./pay.js')).payroll(env, e.mon).catch(() => null); return p ? r2(p.fund * (R.esv + R.pdfo + R.vzZp) / 100) : null; }
  return null;
}
const fmt = d => d.split('-').reverse().join('.');

export async function taxView(env) {
  const tax = await getTax(env), list = taxEvents(tax);
  for (const e of list.slice(0, 14)) e.amt = await taxAmount(env, tax, e).catch(() => null);
  return { tax: { kind: tax.kind, pdv: tax.pdv, on: tax.on, lead: tax.lead, rates: rateOf(tax), pn: tax.pn || null }, kinds: KINDS, def: RATES, list: list.slice(0, 30), link: TAX_LINK };
}
export async function taxSet(env, b) {
  if (b.kind && !KINDS[b.kind]) return { error: 'Невідомий тип' };
  return L(env, 'tax', async () => {
    const t = await getTax(env);
    if ('kind' in b) t.kind = b.kind || '';
    if ('pdv' in b) { const p = b.pdv ? 1 : 0; if (p !== t.pdv && t.rates) delete t.rates.ep3; t.pdv = p; } // ставка ЄП залежить від ПДВ — скидаємо на типову
    if ('on' in b) t.on = b.on ? 1 : 0;
    if ('lead' in b) { const n = Math.round(+b.lead); if (!(n >= 0 && n <= 30)) return { error: 'Нагадувати за 0–30 днів' }; t.lead = n; }
    if (b.pn && typeof b.pn === 'object') { // 🧾 реквізити продавця для ПН (M.E.Doc): ЄДРПОУ/РНОКПП, ІПН платника ПДВ, код ДПІ, назва, посадова особа
      const d = k => String(b.pn[k] ?? '').replace(/\D/g, ''), s = k => String(b.pn[k] ?? '').replace(/\s+/g, ' ').trim(), p = { tin: d('tin'), ipn: d('ipn'), sti: d('sti'), n: s('n').slice(0, 200), boss: s('boss').slice(0, 100), bossN: d('bossN') };
      if (!/^(\d{8}|\d{10})$/.test(p.tin)) return { error: 'ЄДРПОУ (8 цифр) або РНОКПП (10 цифр)' }; if (!/^\d{12}$/.test(p.ipn)) return { error: 'ІПН платника ПДВ — 12 цифр' };
      if (!/^\d{4}$/.test(p.sti)) return { error: 'Код податкової (ДПІ) — 4 цифри' }; if (p.n.length < 3) return { error: 'Назва продавця' }; if (p.bossN && !/^\d{10}$/.test(p.bossN)) return { error: 'РНОКПП посадової особи — 10 цифр' };
      t.pn = p; }
    if (b.rates && typeof b.rates === 'object') { t.rates = t.rates || {}; for (const k of Object.keys(RATES)) if (k in b.rates) { const v = +b.rates[k]; if (!(v >= 0 && v <= 1e6)) return { error: 'Невірна ставка: ' + k }; t.rates[k] = v; } }
    await env.DB.put('tax', JSON.stringify(t)); return {};
  });
}
export async function taxDone(env, key, v) {
  return L(env, 'tax', async () => { const t = await getTax(env); t.done = t.done || {}; if (v) t.done[key] = 1; else delete t.done[key]; const old = dayKey(Date.now() - 400 * 86400e3); for (const k of Object.keys(t.done)) if (k.split(':')[1] < old) delete t.done[k]; await env.DB.put('tax', JSON.stringify(t)); return {}; });
}
// ⏰ щодня о 9:00+ (Київ): за lead днів, у день і наступного дня після строку (якщо не позначено «зроблено»)
export async function taxDaily(env) {
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false }) % 24; if (h < 9 || h >= 22) return;
  const tax = await getTax(env); if (!tax.kind || !tax.on) return;
  const flag = 'taxRem:' + dayKey(); if (await env.DB.get(flag)) return; await env.DB.put(flag, '1', { expirationTtl: 2 * 86400 });
  await (await import('./income.js')).incWatch(env, tax).catch(e => console.log('incWatch', e.message)); // 📒 пороги ПДВ / групи — по понеділках
  const due = taxEvents(tax, dayKey(), 1, tax.lead).filter(e => !e.done && (e.left === 0 || e.left === -1 || e.left === tax.lead));
  if (!due.length) return;
  const chat = await env.DB.get('digchat'), lines = [];
  for (const e of due) {
    const amt = chat ? await taxAmount(env, tax, e).catch(() => null) : null, when = e.left > 0 ? `через ${e.left} дн. (${fmt(e.d)})` : e.left === 0 ? '<b>сьогодні</b>' : `<b>прострочено</b> (${fmt(e.d)})`;
    lines.push(`• ${esc(e.title)} — ${when}${amt ? ` · ≈ ${money(amt)}` : ''}`);
  }
  const text = `📅 <b>Податковий календар</b> · ${KINDS[tax.kind]}\n${lines.join('\n')}\n\n🔗 <a href="${TAX_LINK}">Кабінет платника податків</a> — подати звіт / сплатити.\n<i>Дати й суми орієнтовні — звірте з бухгалтером.</i>`;
  const markup = { inline_keyboard: due.map(e => [{ text: '✅ Сплачено/подано: ' + e.title.slice(0, 30), callback_data: 'txd:' + e.key }]) }; // key = «вид:дата» → txd:вид:дата
  if (chat && env.BOT_TOKEN) await tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: markup }).catch(() => {});
  else await notify(env, text.replace(/ · ≈ [^\n]*/g, ''), markup).catch(() => {}); // без особистого чату власника — у робочу групу, без сум
}
