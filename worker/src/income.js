// 📒 Книга доходів (етап 3): дохід за датою, коли надійшли гроші. Право `tax` (адмін). Каса → ⚙️ Налаштування → 📒, бот «книга» / «дохід 5000 оренда».
// Джерела дня: 🧾 чеки (без чайових; безготівка, онлайн і агрегатори — у день продажу, виписка їх удруге не додає)
//   · 🎁 продаж сертифікатів (рух каси inc:'cert'; старі записи — за приміткою «🎁 Сертифікат») · 💰 передоплати броней (рух inc:'dep')
//   · 💼 інший дохід: inc:<YYYY-MM> → [{ id, d, sum, cat, note, by, ts, bank? }] — вручну або з виписки (🏦 «це дохід»).
// Не дохід: чайові, внесення готівки, власні перекази, позики — їх у книгу не пишемо.
// Підсумок минулого місяця кешується (incm:<YYYY-MM>, 3 дні) — рік і ковзні 12 міс. без перечитування всіх днів.
// ⚠️ Поріг ПДВ (1 млн ₴ за 12 міс.) і ліміт групи ЄП — підказка в книзі й раз на тиждень у Telegram (80 / 95 / 100 %).
import { L, dayKey, isDay, money, notify } from './ops.js';

export const CATS = { b2b: '🏢 Банкет / кейтеринг компанії', rent: '🏠 Оренда / суборенда', svc: '🤝 Послуги (реклама, доставка для інших)', other: '💼 Інший дохід' };
export const PDV_LIM = 1e6;
const r2 = n => Math.round((+n || 0) * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const isM = m => /^\d{4}-\d{2}$/.test(String(m || ''));
const shift = (m, n) => { const [y, mm] = m.split('-').map(Number), t = y * 12 + mm - 1 + n; return `${Math.floor(t / 12)}-${pad(t % 12 + 1)}`; };
const daysOf = m => { const out = [], last = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate(), today = dayKey(); for (let d = 1; d <= last; d++) { const k = `${m}-${pad(d)}`; if (k > today) break; out.push(k); } return out; };
const CERT = /^🎁 Сертифікат/;
export const incOf = x => x.inc || (CERT.test(x.note || '') && (x.type === 'in' || x.type === 'kin') ? 'cert' : ''); // рух каси, що є доходом
const getInc = async (env, m) => (await env.DB.get('inc:' + m, 'json')) || [];

// 📋 місяць по днях: sale (чеки без чайових), card (з них безготівка), cert, dep, oth, tot
export async function incMonth(env, m) {
  const ds = daysOf(m), [cl, mv, inc, bk] = await Promise.all([ds.length ? env.DB.getMany(ds.map(d => 'closed:' + d), 'json') : [], ds.length ? env.DB.getMany(ds.map(d => 'mov:' + d), 'json') : [], getInc(env, m), env.DB.get('bank:' + m, 'json')]);
  const by = {}, row = d => by[d] || (by[d] = { d, sale: 0, card: 0, cert: 0, dep: 0, oth: 0, n: 0 });
  ds.forEach((d, i) => {
    for (const x of cl[i] || []) { if (x.del || x.rm) continue; const tip = +x.tip || 0, net = (+x.sum || 0) - tip; if (!net) continue; const r = row(d); r.n++; r.sale += net; r.card += x.sum ? (+x.card || 0) * net / x.sum : 0; }
    for (const x of mv[i] || []) { if (x.del) continue; const k = incOf(x); if (k === 'cert' || k === 'dep') row(d)[k] += +x.sum || 0; }
  });
  const other = inc.filter(x => !x.del && x.d.startsWith(m)); for (const x of other) row(x.d).oth += x.sum;
  const days = Object.values(by).sort((a, b) => (a.d < b.d ? -1 : 1)).map(r => { for (const k of ['sale', 'card', 'cert', 'dep', 'oth']) r[k] = r2(r[k]); r.tot = r2(r.sale + r.cert + r.dep + r.oth); return r; });
  const t = { n: 0, sale: 0, card: 0, cert: 0, dep: 0, oth: 0, tot: 0 }; for (const r of days) for (const k of Object.keys(t)) t[k] += r[k]; for (const k of Object.keys(t)) t[k] = r2(t[k]);
  const q = (bk || []).filter(x => x.st === 'q' && x.sum > 0); // 🏦 надходження на рахунок, які ще ніхто не розібрав: може бути дохід
  return { m, days, t, other: other.sort((a, b) => (a.d < b.d ? 1 : -1)), bankQ: { n: q.length, sum: r2(q.reduce((a, x) => a + x.sum, 0)) } };
}
// разом за місяць: минулі — з кешу (3 дні), поточний — завжди наново
async function monthTot(env, m) {
  if (m >= dayKey().slice(0, 7)) return (await incMonth(env, m)).t.tot;
  const c = await env.DB.get('incm:' + m, 'json'); if (c) return c.tot;
  const tot = (await incMonth(env, m)).t.tot; await env.DB.put('incm:' + m, JSON.stringify({ tot }), { expirationTtl: 3 * 86400 }); return tot;
}
const drop = (env, m) => m < dayKey().slice(0, 7) ? env.DB.delete('incm:' + m) : null;
// 📊 з початку року (ліміт групи ЄП) і ковзні 12 міс. (поріг ПДВ)
export async function incSums(env, cur) {
  const now = dayKey().slice(0, 7), ms = []; for (let i = 0; i < 12; i++) ms.push(shift(now, -i));
  const tots = {}; for (const m of ms) tots[m] = m === now && cur ? cur.t.tot : await monthTot(env, m);
  const { getTax } = await import('./tax.js'), { LIM } = await import('./fiscal.js'), tax = await getTax(env), g = +tax.kind?.match(/^fop(\d)$/)?.[1] || 0;
  const ytd = r2(ms.filter(m => m.startsWith(now.slice(0, 4))).reduce((a, m) => a + tots[m], 0)), roll = r2(ms.reduce((a, m) => a + tots[m], 0)), lim = +tax.limEp > 0 ? +tax.limEp : LIM[g] || 0;
  return { y: now.slice(0, 4), ytd, roll, from: ms[11], kind: tax.kind || '', pdv: tax.pdv ? 1 : 0, lim, limPct: lim ? Math.round(ytd / lim * 1000) / 10 : 0, pdvLim: PDV_LIM, pdvPct: Math.round(roll / PDV_LIM * 1000) / 10, months: ms.map(m => [m, r2(tots[m])]).reverse() };
}
export async function incomeView(env, m) {
  if (!isM(m) || m > dayKey().slice(0, 7)) m = dayKey().slice(0, 7);
  const cur = await incMonth(env, m), now = dayKey().slice(0, 7);
  return { ...cur, sum: await incSums(env, m === now ? cur : null), cats: CATS };
}

// ➕ інший дохід (вручну або з виписки)
export async function incAdd(env, b, who = '') {
  const d = isDay(b.d) ? b.d : dayKey(), sum = r2(b.sum), cat = CATS[b.cat] ? b.cat : 'other', note = String(b.note ?? '').replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!(sum > 0 && sum <= 1e8)) return { error: 'Сума від 0,01 до 100 млн ₴' }; if (d > dayKey()) return { error: 'Дохід записують у день, коли гроші вже надійшли' }; if (d < '2020-01-01') return { error: 'Надто давня дата' };
  const m = d.slice(0, 7), x = { id: m.slice(2, 4) + m.slice(5) + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), d, sum, cat, note, by: who, ts: Date.now(), ...(b.bank ? { bank: String(b.bank) } : {}) };
  await L(env, 'inc:' + m, async () => { const l = await getInc(env, m); if (l.filter(y => !y.del).length >= 500) throw new Error('Забагато записів за місяць'); l.push(x); await env.DB.put('inc:' + m, JSON.stringify(l)); });
  await drop(env, m); return { x };
}
// ✕ прибрати (з виписки — лише через «↩️ Скасувати» у банку, щоб рядок не завис як «зіставлений»)
export async function incDel(env, id, { bank } = {}) {
  id = String(id || ''); const m = /^\d{4}/.test(id) ? `20${id.slice(0, 2)}-${id.slice(2, 4)}` : ''; if (!m) return { error: 'Немає такого запису' };
  const r = await L(env, 'inc:' + m, async () => { const l = await getInc(env, m), i = l.findIndex(y => y.id === id); if (i < 0) return { error: 'Немає такого запису' };
    if (l[i].bank && !bank) return { error: 'Цей дохід з банківської виписки — скасуйте його в 🏦 Банк' }; const [x] = l.splice(i, 1); await env.DB.put('inc:' + m, JSON.stringify(l)); return { x }; });
  if (!r.error) await drop(env, m); return r;
}

// 🔔 раз на тиждень (пн, з taxDaily): 80 / 95 / 100 % порогу ПДВ і ліміту групи — кожен крок один раз на рік
export async function incWatch(env, tax) {
  if (new Date().getUTCDay() !== 1 || !tax.kind) return;
  const s = await incSums(env), msg = [], w = tax.incW?.y === s.y ? { ...tax.incW } : { y: s.y };
  const step = p => [100, 95, 80].find(x => p >= x) || 0;
  if (!s.pdv) { const k = step(s.pdvPct); if (k > (w.pdv || 0)) { w.pdv = k; msg.push(`${k >= 100 ? '🛑' : '⚠️'} <b>Поріг ПДВ</b>: за 12 міс. дохід ${money(s.roll)} — ${Math.round(s.pdvPct)}% від 1 000 000 ₴.${k >= 100 ? ' Потрібна реєстрація платником ПДВ — зверніться до бухгалтера.' : ' Після 1 млн за 12 міс. треба реєструватись платником ПДВ.'}`); } }
  if (s.lim) { const k = step(s.limPct); if (k > (w.ep || 0)) { w.ep = k; msg.push(`${k >= 100 ? '🛑' : '⚠️'} <b>Ліміт ${s.kind.slice(3)} групи ЄП</b>: з початку ${s.y} р. ${money(s.ytd)} — ${Math.round(s.limPct)}% з ${money(s.lim)}.${k >= 95 ? ' Поговоріть з бухгалтером про перехід.' : ''}`); } }
  if (!msg.length) return;
  const sent = await notify(env, `📒 <b>Книга доходів</b>\n${msg.join('\n')}\n<i>Орієнтовно за даними каси — звірте з бухгалтером.</i>`).then(r => r.json()).then(d => d.ok, () => false);
  if (sent) await L(env, 'tax', async () => { const t = await (await import('./tax.js')).getTax(env); t.incW = w; await env.DB.put('tax', JSON.stringify(t)); }); // не дійшло — спробуємо наступного понеділка
}

// 🤖 бот: місяць, рік, пороги
export async function incBotText(env) {
  const v = await incomeView(env), s = v.sum, mn = new Date(v.m + '-15T12:00:00Z').toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  const bar = p => '▓'.repeat(Math.min(10, Math.round(p / 10))) + '░'.repeat(Math.max(0, 10 - Math.round(p / 10)));
  return `📒 <b>Книга доходів</b> · ${mn}\n🧾 Продажі (без чайових): <b>${money(v.t.sale)}</b>${v.t.card ? ` · з них безготівка ${money(v.t.card)}` : ''}${v.t.cert ? `\n🎁 Сертифікати: ${money(v.t.cert)}` : ''}${v.t.dep ? `\n💰 Передоплати: ${money(v.t.dep)}` : ''}${v.t.oth ? `\n💼 Інший дохід: ${money(v.t.oth)}` : ''}\n<b>Разом: ${money(v.t.tot)}</b>`
    + `\n\n📊 З початку ${s.y} р.: <b>${money(s.ytd)}</b>${s.lim ? `\n${bar(s.limPct)} ${s.limPct}% ліміту ${s.kind.slice(3)} групи (${money(s.lim)})` : ''}`
    + (s.pdv ? '' : `\n12 міс.: <b>${money(s.roll)}</b>\n${bar(s.pdvPct)} ${s.pdvPct}% порогу ПДВ (1 млн ₴)`)
    + (v.bankQ.n ? `\n\n⚠️ На рахунок надійшло ${v.bankQ.n} оп. на ${money(v.bankQ.sum)} — не розібрано: напишіть <code>банк</code>` : '')
    + `\n\nДодати інший дохід: <code>дохід 5000 оренда</code>\n<i>Орієнтовно — звірте з бухгалтером.</i>`;
}
// «дохід 5000 оренда кафе» → категорія за словом
export function incParse(s) {
  const m = String(s).match(/^(\d[\d\s]*(?:[.,]\d{1,2})?)\s*(.*)$/); if (!m) return null;
  const note = m[2].trim(), cat = /оренд/i.test(note) ? 'rent' : /банкет|кейтер|компан|тов\b|b2b/i.test(note) ? 'b2b' : /послуг|реклам|достав/i.test(note) ? 'svc' : 'other';
  return { sum: +m[1].replace(/\s/g, '').replace(',', '.'), cat, note };
}
