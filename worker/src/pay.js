// 👷 Графік змін і зарплата: прихід «Почати зміну» → адмін підтверджує → ✅ у графіку; ставка за зміну + % від виручки + бонус за план;
// премії / штрафи / аванси / виплати (з каси або картки → рух грошей). Спільне для каси й бота.
import { L, dayKey, hhmm, esc, money, notify, getStaff, getCfg, logEvent, editEv, reportRange, groupOf, dishResolver, tipBalances, delMove, restoreMove, TZ, isDay } from './ops.js';
import { getMenu } from './menu.js';
import { getGoCfg } from './delivery.js';

const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const mon = (d = dayKey()) => d.slice(0, 7);
const r0 = x => Math.round(+x || 0);
export const BASES = { all: 'усієї виручки дня', own: 'своїх чеків', kitchen: 'продажів кухні' };
export const OPS = { bonus: '➕ Премія', fine: '➖ Штраф', adv: '💵 Аванс', paid: '💸 Виплата' };
const getJ = async (env, k, d) => (await env.DB.get(k, 'json')) || d;
export const getAtt = (env, m = mon()) => getJ(env, 'att:' + m, {});
export const getPlan = (env, m = mon()) => getJ(env, 'plan:' + m, {});
export const getOps = (env, m = mon()) => getJ(env, 'pay:' + m, []);
const daysOf = m => { const [y, mo] = m.split('-').map(Number), n = new Date(Date.UTC(y, mo, 0)).getUTCDate(); return [...Array(n)].map((_, i) => `${m}-${String(i + 1).padStart(2, '0')}`); };
// «10:00» дня d → мітка часу (Київ); години 00–02 — це вже наступна календарна доба робочого дня
const kyivOff = t => { const p = new Date(t).toLocaleString('en-US', { timeZone: TZ, hour12: false, timeZoneName: 'shortOffset' }).match(/GMT([+-]\d+)/); return (p ? +p[1] : 2) * 3600e3; };
const at = (d, hm) => { const [h, mi] = String(hm).split(':').map(Number), base = Date.parse(d + 'T00:00:00Z') + ((h < 3 ? h + 24 : h) * 60 + (mi || 0)) * 60e3; return base - kyivOff(base); };
const staffBy = async env => { const l = await getStaff(env); return { l, byName: new Map(l.map(s => [s.name, s])), byId: new Map(l.map(s => [s.id, s])) }; };

// ---------- прихід / вихід ----------
export async function shiftIn(env, name) {
  const d = dayKey(), m = mon(d), cfg = await getCfg(env), plan = (await getPlan(env, m))[d]?.[name];
  const r = await L(env, 'att:' + m, async () => {
    const a = await getAtt(env, m), x = a[d]?.[name];
    if (x && x.in && !x.out) return { error: 'Ви вже на зміні' };
    if (x?.ok === 1 && x.out) { delete x.out; delete x.auto; await env.DB.put('att:' + m, JSON.stringify(a)); return { x, again: 1 }; } // повернувся в той самий день
    const now = Date.now(), late = /^\d{1,2}:\d{2}$/.test(plan || '') ? Math.round((now - at(d, plan)) / 60000) : 0;
    const rec = { in: now, ok: 0, ...(plan ? { plan } : {}), ...(late > (cfg.lateMin ?? 10) ? { late } : {}) };
    (a[d] ||= {})[name] = rec; await env.DB.put('att:' + m, JSON.stringify(a)); return { x: rec };
  });
  if (r.error || r.again) return r;
  const s = (await staffBy(env)).byName.get(name), fine = cfg.lateFine || 0, late = r.x.late;
  const txt = `🟢 <b>${esc(name)}</b> на зміні з ${hhmm(r.x.in)}${r.x.plan ? ` (план ${r.x.plan})` : ''}${late ? `\n⏰ Запізнення ${late} хв` : ''}`;
  const kb = { inline_keyboard: [[{ text: '✅ Підтвердити', callback_data: `atk:${d}:${s?.id}:o` }, ...(late && fine ? [{ text: `✅ + штраф ${fine}`, callback_data: `atk:${d}:${s?.id}:f` }] : []), { text: '❌ Ні', callback_data: `atk:${d}:${s?.id}:n` }]] };
  await notify(env, txt, kb).catch(() => {});
  await logEvent(env, { k: 'att', n: name, sid: s?.id, day: d, s: 'new', ...(late ? { late } : {}), text: `${name} на зміні` });
  return r;
}
export async function shiftOut(env, name) {
  const d = dayKey(), m = mon(d);
  return L(env, 'att:' + m, async () => {
    const a = await getAtt(env, m), x = a[d]?.[name];
    if (!x?.in || x.out) return { error: 'Ви не на зміні' };
    x.out = Date.now(); await env.DB.put('att:' + m, JSON.stringify(a)); return { x };
  });
}
// ✅ / ❌ адміна (fine — ще й штраф за запізнення)
export async function attConfirm(env, day, name, how, by) {
  if (!isDay(day)) return null; const m = mon(day), cfg = await getCfg(env);
  const x = await L(env, 'att:' + m, async () => {
    const a = await getAtt(env, m), x = a[day]?.[name]; if (!x) return null;
    x.ok = how === 'n' ? -1 : 1; x.by = by || ''; await env.DB.put('att:' + m, JSON.stringify(a)); return x;
  });
  if (!x) return null;
  if (how === 'f' && cfg.lateFine) await payOp(env, { n: name, t: 'fine', sum: cfg.lateFine, note: `запізнення ${x.late || ''} хв (${day.slice(8)}.${day.slice(5, 7)})` }, by);
  await editEv(env, l => { for (const e of l) if (e.k === 'att' && e.n === name && e.day === day) { e.s = how === 'n' ? 'rej' : 'acc'; e.accBy = by; } }).catch(() => {});
  return x;
}
// ручна відмітка адміна в графіку: none → ✅, ✅ → прибрати; ok:0 → ✅
export async function attToggle(env, day, name, by, set) {
  if (!isDay(day)) return null; const m = mon(day);
  return L(env, 'att:' + m, async () => {
    const a = await getAtt(env, m), x = a[day]?.[name];
    if (set === 'del' || (set == null && x?.ok === 1)) { if (a[day]) delete a[day][name]; }
    else (a[day] ||= {})[name] = { ...(x || {}), ok: set === 'n' ? -1 : 1, by: by || '', ...(x?.in ? {} : { man: 1 }) };
    await env.DB.put('att:' + m, JSON.stringify(a)); return a[day]?.[name] || { removed: 1 };
  });
}
// 🌙 забули закінчити зміну — закриваємо минулі дні (раз на день, при першому запиті)
export async function closeStale(env) {
  const d = dayKey(), fk = 'attchk'; if ((await env.DB.get(fk)) === d) return; await env.DB.put(fk, d);
  const out = [];
  for (const m of [...new Set([mon(), mon(dayKey(Date.now() - 86400e3))])]) await L(env, 'att:' + m, async () => {
    const a = await getAtt(env, m); let ch = false;
    for (const [day, ppl] of Object.entries(a)) if (day < d) for (const [n, x] of Object.entries(ppl)) if (x.in && !x.out) { x.out = Math.min(x.in + 12 * 3600e3, at(day, '03:00') + 24 * 3600e3 - 60e3); x.auto = 1; ch = true; out.push(`${n} (${day.slice(8)}.${day.slice(5, 7)})`); }
    if (ch) await env.DB.put('att:' + m, JSON.stringify(a));
  });
  if (out.length) await notify(env, `🌙 Не закінчили зміну: ${out.map(esc).join(', ')} — закрито автоматично (перевірте години в графіку)`).catch(() => {});
}

// ---------- 📅 план ----------
export async function planSet(env, day, name, time) {
  if (!isDay(day)) return null; const m = mon(day);
  return L(env, 'plan:' + m, async () => {
    const p = await getPlan(env, m);
    if (time && /^\d{1,2}:\d{2}$/.test(time)) (p[day] ||= {})[name] = time.padStart(5, '0'); else if (time === '+') (p[day] ||= {})[name] = '+'; /* у графіку без часу */ else if (p[day]) { delete p[day][name]; if (!Object.keys(p[day]).length) delete p[day]; }
    await env.DB.put('plan:' + m, JSON.stringify(p)); return p[day] || {};
  });
}
// копія плану тижня: from (понеділок) → to (понеділок)
export async function planCopyWeek(env, from, to) {
  if (!isDay(from) || !isDay(to)) return null;
  const add = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  let n = 0;
  for (let i = 0; i < 7; i++) { const s = add(from, i), t = add(to, i), src = (await getPlan(env, mon(s)))[s] || {};
    for (const [nm, tm] of Object.entries(src)) { await planSet(env, t, nm, tm); n++; } }
  return { n };
}

// ---------- 💸 операції: премія / штраф / аванс / виплата ----------
export async function payOp(env, { n, t, sum, src, note }, by) {
  sum = r0(sum); if (!OPS[t] || !(sum > 0) || !n) return { error: 'Потрібні людина, тип і сума' };
  const d = dayKey(), m = mon(d), money_ = t === 'adv' || t === 'paid';
  src = src === 'card' ? 'card' : 'cash';
  // рух грошей і операція ЗП — під одним замком на обидва ключі; спершу читаємо обидва списки, потім пишемо підряд
  const op = await L(env, ['mov:' + d, 'pay:' + m], async () => {
    const k = 'mov:' + d, ml = money_ ? (await env.DB.get(k, 'json')) || [] : null, l = await getOps(env, m);
    let mov = null;
    if (money_) { ml.push({ ts: Date.now(), at: hhmm(), type: src === 'card' ? 'salk' : 'salc', sum, note: `${n} · ${OPS[t].slice(2).toLowerCase()}${note ? ' · ' + note : ''}`, by: by || '' }); mov = { d, i: ml.length - 1 }; }
    const op = { id: uid(), ts: Date.now(), day: d, n, t, sum, ...(money_ ? { src, mov } : {}), note: String(note || '').slice(0, 100), by: by || '' };
    if (money_) await env.DB.put(k, JSON.stringify(ml));
    l.push(op); await env.DB.put('pay:' + m, JSON.stringify(l)); return op;
  });
  await logEvent(env, { k: 'shift', by, text: `${OPS[t]}: ${n} — ${sum} грн${money_ ? (src === 'card' ? ' (з картки)' : ' (з каси)') : ''}${note ? ' · ' + note : ''}` });
  return { op };
}
export async function payOpDel(env, month, id, back) {
  const op = await L(env, 'pay:' + month, async () => { const l = await getOps(env, month), x = l.find(o => o.id === id); if (!x || !!x.del === !back) return null; if (back) delete x.del; else x.del = 1; await env.DB.put('pay:' + month, JSON.stringify(l)); return x; });
  if (op?.mov) await (back ? restoreMove : delMove)(env, op.mov.i, op.mov.d);
  return op;
}
export async function setStaffPay(env, id, p) {
  return L(env, 'staff', async () => {
    const l = await getStaff(env), s = l.find(x => x.id === id); if (!s) return null;
    const num = v => Math.max(0, r0(v)), pf = v => Math.max(0, Math.min(100, Math.round((+v || 0) * 10) / 10));
    s.pay = { rate: num(p.rate), pct: pf(p.pct), base: BASES[p.base] ? p.base : 'all', dayRev: num(p.dayRev), dayBonus: num(p.dayBonus), monRev: num(p.monRev), monBonus: num(p.monBonus), ...(p.dlv !== undefined && p.dlv !== '' ? { dlv: num(p.dlv) } : {}) };
    await env.DB.put('staff', JSON.stringify(l)); return s;
  });
}

// ---------- 🧮 відомість за місяць ----------
export async function payroll(env, m = mon()) {
  const days = daysOf(m), [st, att, plan, ops, menu, tb] = await Promise.all([getStaff(env), getAtt(env, m), getPlan(env, m), getOps(env, m), getMenu(env), tipBalances(env)]);
  const r = await reportRange(env, days[0], days[days.length - 1]), res = dishResolver(menu), gc = await getGoCfg(env);
  const rev = {}; // rev[day] = { all, own: {name}, kitchen }
  for (const c of r.checks) { const x = rev[c.d] ||= { all: 0, own: {}, kitchen: 0 }, v = c.sum - (c.tip || 0); x.all += v; const w = c.w || c.by || ''; x.own[w] = (x.own[w] || 0) + v;
    for (const [n, , s] of c.dishes) if (groupOf(res(n)?.cat) === 'kitchen' || res(n)?.cat === 'inshe-food') x.kitchen += s; }
  const people = st; // увесь персонал — новий працівник одразу в графіку
  const rows = people.map(s => {
    const p = s.pay || {}, base = p.base || 'all', mine = days.filter(d => att[d]?.[s.name]?.ok === 1);
    const baseOf = d => { const x = rev[d]; if (!x) return 0; return base === 'own' ? x.own[s.name] || 0 : base === 'kitchen' ? x.kitchen : x.all; };
    const baseSum = mine.reduce((a, d) => a + baseOf(d), 0);
    const hours = Math.round(mine.reduce((a, d) => { const x = att[d][s.name]; return a + (x.in && x.out ? (x.out - x.in) / 3600e3 : 0); }, 0) * 10) / 10;
    const dayB = p.dayRev && p.dayBonus ? mine.filter(d => baseOf(d) >= p.dayRev).length * p.dayBonus : 0, monB = p.monRev && p.monBonus && baseSum >= p.monRev ? p.monBonus : 0;
    const my = ops.filter(o => o.n === s.name && !o.del), sum = t => my.filter(o => o.t === t).reduce((a, o) => a + o.sum, 0);
    const shifts = mine.length, rate = shifts * (p.rate || 0), pct = r0(baseSum * (p.pct || 0) / 100);
    const dlvN = r.checks.filter(c => c.go === 'del' && c.cour === s.name).length, dlv = dlvN * (p.dlv ?? gc.cpay); // 🛵 оплата кур'єру за доставку
    const earned = rate + pct + dayB + monB + dlv + sum('bonus') - sum('fine');
    return { id: s.id, n: s.name, role: s.role, pay: p, dlvN, dlv, shifts, hours, late: mine.filter(d => att[d][s.name].late).length, absent: days.filter(d => plan[d]?.[s.name] && d < dayKey() && !(att[d]?.[s.name]?.ok === 1)).length,
      pending: days.filter(d => att[d]?.[s.name]?.ok === 0).length, baseSum: r0(baseSum), rate, pct, dayB, monB, bonus: sum('bonus'), fine: sum('fine'), adv: sum('adv'), paid: sum('paid'), earned, due: earned - sum('adv') - sum('paid'),
      tips: tb[s.name] || 0, toMon: p.monRev && p.monBonus && baseSum < p.monRev ? r0(p.monRev - baseSum) : 0, revPerShift: shifts ? r0(mine.reduce((a, d) => a + (rev[d]?.all || 0), 0) / shifts) : 0, revPerHour: hours ? r0(mine.reduce((a, d) => a + (rev[d]?.all || 0), 0) / hours) : 0 };
  });
  const revenue = r0(Object.values(rev).reduce((a, x) => a + x.all, 0)), fund = rows.reduce((a, x) => a + x.earned, 0);
  const gx = (await env.DB.get('gridx:' + m, 'json')) || { add: [], hide: [] }, worked = new Set(Object.values(rev).flatMap(x => Object.keys(x.own || {})).filter(Boolean)); for (const d of days) for (const n of (await env.DB.get('cooks:' + d, 'json')) || []) worked.add(typeof n === 'string' ? n : n?.n || ''); // 🧾 хто закривав чеки (і в боті) або стояв на кухні — сам потрапляє в графік
  const seen = [...new Set([...((await env.DB.get('seen:' + m, 'json')) || []), ...gx.add, ...worked])].filter(n => !gx.hide.includes(n));
  return { m, days, att, plan, seen, hide: gx.hide, ops: ops.slice().reverse(), rows, revenue, fund, fundPct: revenue ? Math.round(fund / revenue * 1000) / 10 : 0, cfg: await getCfg(env) };
}
// особистий кабінет — лише свої цифри
export async function myPay(env, name, m = mon()) {
  const p = await payroll(env, m), row = p.rows.find(r => r.n === name) || null, days = p.days.map(d => ({ d, plan: p.plan[d]?.[name] || '', att: p.att[d]?.[name] || null })).filter(x => x.plan || x.att);
  const swaps = ((await env.DB.get('swaps', 'json')) || []).filter(s => (s.from === name || s.to === name) && s.st !== 'done' && s.st !== 'no');
  // спільний графік (без грошей): хто коли запланований і був
  const names = (await getStaff(env)).filter(s => s.role !== 'courier' && !p.hide.includes(s.name) && (s.pay?.rate || s.pay?.pct || p.seen.includes(s.name) || p.days.some(d => p.att[d]?.[s.name] || p.plan[d]?.[s.name]))).map(s => s.name);
  const att = {}; for (const d of p.days) for (const [n, x] of Object.entries(p.att[d] || {})) (att[d] ||= {})[n] = { ok: x.ok, late: x.late ? 1 : 0, auto: x.auto ? 1 : 0, in: x.in, out: x.out };
  return { m, row, days, ops: p.ops.filter(o => o.n === name), swaps, grid: { days: p.days, att, plan: p.plan, people: names } };
}

// ---------- 🔁 обмін змінами: попросив → колега погодився → адмін підтвердив → план змінився ----------
export async function swapAsk(env, from, day, to) {
  if (!isDay(day) || !to || to === from) return { error: 'Оберіть день і колегу' };
  const p = (await getPlan(env, mon(day)))[day] || {}; if (!p[from]) return { error: 'У вас цього дня немає зміни в плані' };
  const s = { id: uid(), ts: Date.now(), day, from, to, time: p[from], st: 'ask' };
  await L(env, 'swaps', async () => { const l = (await env.DB.get('swaps', 'json')) || []; l.push(s); await env.DB.put('swaps', JSON.stringify(l.slice(-100))); });
  await logEvent(env, { k: 'swap', sw: s.id, s: 'ask', n: to, text: `🔁 ${from} просить ${to} вийти за нього ${day.slice(8)}.${day.slice(5, 7)} (${s.time})` });
  return { s };
}
export async function swapStep(env, id, step, by) { // step: agree (колега) | no | ok (адмін)
  const s = await L(env, 'swaps', async () => {
    const l = (await env.DB.get('swaps', 'json')) || [], s = l.find(x => x.id === id); if (!s || s.st === 'done' || s.st === 'no') return null;
    if (step === 'agree' && s.st === 'ask') s.st = 'agreed'; else if (step === 'no') s.st = 'no'; else if (step === 'ok' && s.st === 'agreed') s.st = 'done'; else return null;
    s.by = by; await env.DB.put('swaps', JSON.stringify(l)); return s;
  });
  if (!s) return null;
  if (s.st === 'done') { await planSet(env, s.day, s.from, null); await planSet(env, s.day, s.to, s.time); }
  const d = `${s.day.slice(8)}.${s.day.slice(5, 7)}`;
  if (s.st === 'agreed') { const sid = (await staffBy(env)).byName; await notify(env, `🔁 Обмін змінами ${d}: <b>${esc(s.from)}</b> → <b>${esc(s.to)}</b> (${s.time}). ${esc(s.to)} погодився.`, { inline_keyboard: [[{ text: '✅ Підтвердити обмін', callback_data: 'swk:' + s.id + ':ok' }, { text: '❌', callback_data: 'swk:' + s.id + ':no' }]] }).catch(() => {}); }
  await logEvent(env, { k: 'swap', sw: s.id, s: s.st, n: s.to, text: s.st === 'agreed' ? `🔁 ${s.to} погодився вийти за ${s.from} ${d} — адміне, підтвердіть` : s.st === 'done' ? `🔁 Обмін ${d}: ${s.from} → ${s.to} підтверджено` : `🔁 Обмін ${d} (${s.from} → ${s.to}) відхилено` });
  await editEv(env, l => { for (const e of l) if (e.k === 'swap' && e.sw === s.id && e.s !== s.st) e.old = 1; }).catch(() => {});
  return s;
}

// ---------- текст відомості (бот) ----------
export const payText = p => [`👷 <b>Зарплата · ${p.m}</b>`, `Виручка ${money(p.revenue)} · фонд оплати ${money(p.fund)} (${p.fundPct}%)`, '',
  ...p.rows.map(r => `<b>${esc(r.n)}</b>: змін ${r.shifts}${r.pending ? ` (+${r.pending} чекає ✅)` : ''} · нараховано ${money(r.earned)}${r.adv || r.paid ? ` · видано ${money(r.adv + r.paid)}` : ''} → <b>до виплати ${money(r.due)}</b>${r.tips ? ` · 💝 чайові ${money(r.tips)}` : ''}`)].join('\n');

// ---------- API каси: op «zp…» ----------
const ALL = new Set(['zpIn', 'zpOut', 'zpMy', 'zpSwap', 'zpSwapStep', 'zpPeople']);
export async function payApi(b, env, me) {
  const admin = me.role === 'admin', who = me.name, ok = (x = {}) => [{ ok: true, ...x }, 200], R = r => r?.error ? [{ error: r.error }, 400] : r ? ok(r) : [{ error: 'Не знайдено' }, 400];
  if (!admin && !ALL.has(b.op)) return [{ error: 'admin' }, 403];
  const m = /^\d{4}-\d{2}$/.test(b.m || '') ? b.m : mon();
  switch (b.op) {
    case 'zpIn': return R(await shiftIn(env, who));
    case 'zpOut': { const r = await shiftOut(env, who); if (me.role === 'courier') await (await import('./courier.js')).courShiftEnd(env, who).catch(() => {}); if (r.x) await logEvent(env, { k: 'shift', by: who, text: `🔴 ${who} закінчив зміну (${Math.round((r.x.out - r.x.in) / 360e4 * 10) / 10} год)` }); return R(r); }
    case 'zpMy': return ok(await myPay(env, who, m));
    case 'zpPeople': return ok({ list: (await getStaff(env)).map(s => s.name).filter(n => n !== who) });
    case 'zpSwap': return R(await swapAsk(env, who, b.day, String(b.to || '')));
    case 'zpSwapStep': { const l = (await env.DB.get('swaps', 'json')) || [], s = l.find(x => x.id === b.id); if (!s) return R(null);
      if (b.step === 'ok' && !admin) return [{ error: 'admin' }, 403]; if (b.step === 'agree' && s.to !== who) return [{ error: 'Погодитись може лише колега, якого просили' }, 403];
      if (b.step === 'no' && !admin && s.to !== who && s.from !== who) return [{ error: 'admin' }, 403];
      return R(await swapStep(env, b.id, b.step, who)); }
    case 'zpGrid': return ok({ ...(await payroll(env, m)), swaps: ((await env.DB.get('swaps', 'json')) || []).filter(s => s.st === 'agreed' || s.st === 'ask'), staff: (await getStaff(env)).map(({ pin, ...s }) => s) });
    case 'zpAtt': { const x = b.how === 'o' || b.how === 'f' || b.how === 'n' ? await attConfirm(env, b.day, String(b.n), b.how, who) : await attToggle(env, b.day, String(b.n), who, b.set); return R(x && { x }); }
    case 'zpPlan': return R(await planSet(env, b.day, String(b.n), b.time || null));
    case 'zpPlanCopy': return R(await planCopyWeek(env, b.from, b.to));
    case 'zpOp': { const r = await payOp(env, { n: String(b.n), t: b.t, sum: b.sum, src: b.src, note: b.note }, who); if (r.op && (b.t === 'paid' || b.t === 'adv')) await notify(env, `🖥 ${OPS[b.t]}: <b>${esc(b.n)}</b> — ${money(r.op.sum)} ${r.op.src === 'card' ? 'з картки' : 'з каси'} — ${esc(who)}`).catch(() => {}); return R(r); }
    case 'zpOpDel': return R(await payOpDel(env, m, String(b.id), !!b.back));
    case 'zpGridSet': { // ➕ / ✕ людина в графіку місяця
      const n = String(b.n || ''); if (!n) return R(null);
      await L(env, 'gridx:' + m, async () => { const g = (await env.DB.get('gridx:' + m, 'json')) || { add: [], hide: [] };
        g.add = g.add.filter(x => x !== n); g.hide = g.hide.filter(x => x !== n); (b.show ? g.add : g.hide).push(n);
        await env.DB.put('gridx:' + m, JSON.stringify(g), { expirationTtl: 400 * 86400 }); });
      return ok(); }
    case 'zpStaff': return R(await setStaffPay(env, String(b.id), b.pay || {}));
  }
  return [{ error: 'unknown_op' }, 400];
}
