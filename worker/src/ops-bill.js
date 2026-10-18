// 🍽 Стіл: замовлення (гість/офіціант), прийняти/відхилити, скасування страв, закриття й оплата, знижка, чайові, перенесення, розділення, видалення
// (частина ops.js — інші файли імпортують з ops.js, як і раніше)
import { courNotify } from './courier.js';
import { cliClose, goButtons, goGone } from './delivery.js';
import { getMenu } from './menu.js';
import { BILL_TTL, L, LINE, addDishes, addStat, billItems, bump, dayKey, discAmt, editEv, esc, getBill, getCfg, hhmm, kqMut, logClosed, logEvent, notify, openTables, payable, pct, putBill, tg } from './ops-core.js';
import { addKitchen, kitchenCancel, kitchenClosed } from './ops-kitchen.js';
import { getMov } from './ops-money.js';
import { getStaff } from './ops-staff.js';
import { queueKitchen, queuePrint, receipt } from './print.js';
import { promoClose, promoFill } from './promo.js';
import { reviewQueue } from './site.js';
import { wasteDish } from './stock.js';
import { tn } from './tn.js';

// ✅ Прийняв: статус для гостя + подія + (з POS) оновлення повідомлення в Telegram
async function _acceptOrder(env, oid, who, { editTg = true } = {}) {
  if (!/^[a-z0-9]{6,12}$/.test(oid || '')) return false;
  const o = (await env.DB.get('ord:' + oid, 'json')) || {};
  if (o.s === 'acc') return false;
  if (o.s === 'rej') return false;
  // стіл могли перенести / закрити / замовлення прибрали з рахунку — шукаємо, де воно зараз
  if (o.lines?.length && o.t) {
    let t = null; if ((await getBill(env, o.t)).log?.some(x => x.oid === oid)) t = o.t; else for (const r of await openTables(env)) if ((r.b.log || []).some(x => x.oid === oid)) { t = r.t; break; }
    if (t == null) { await env.DB.put('ord:' + oid, JSON.stringify({ ...o, s: 'rej', by: who, at: hhmm(), ...(o.go ? { g: 'rej' } : {}) }), { expirationTtl: BILL_TTL }); await editEv(env, list => { for (const e of list) if (e.oid === oid) e.s = 'rej'; }); return false; }
    o.t = t;
  }
  await env.DB.put('ord:' + oid, JSON.stringify({ ...o, s: 'acc', by: who, at: hhmm(), ...(o.go ? { g: 'acc' } : {}) }), { expirationTtl: BILL_TTL });
  if (o.lines?.length) { // замовлення гостя підтверджене → на кухню: бігунок + екран кухні
    await queueKitchen(env, { table: o.t, kind: o.kind || 'ЗАМОВЛЕННЯ ГОСТЯ', lines: o.lines, comment: o.comment, by: `гість · прийняв ${who}` });
    await addKitchen(env, { t: o.t, by: 'гість', src: 'гість', comment: o.comment, lines: o.lines });
  }
  await editEv(env, list => { for (const e of list) if (e.oid === oid) { e.s = 'acc'; e.accBy = who; } });
  if (editTg && o.mid && o.html) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: o.mid, text: `${o.html}\n\n✅ Прийняв: <b>${esc(who)}</b> о ${hhmm()}`, parse_mode: 'HTML',
    reply_markup: { inline_keyboard: o.go ? goButtons({ ...((await getBill(env, o.t)).go || {}), t: o.t }) : [[{ text: '🧾 Закрити стіл ' + tn(o.t), callback_data: 'cls:' + o.t }]] } });
  return true;
}

// ---------- замовлення персоналу (бот кнопками/текстом і POS) ----------
async function _addWaiterOrder(env, d, who, comment = '', src = 'бот', urgent = false) {
  const ok = d.items.filter(i => !i.hidden);
  if (!ok.length) return null;
  const lines = ok.map(i => `${i.q}× ${i.name} — ${i.price * i.q}`), sum = ok.reduce((s, i) => s + i.price * i.q, 0);
  const bill = await getBill(env, d.table);
  const prev = billItems(bill).map(x => `${x.q}× ${x.name}`); // що вже було на столі — у стрічці видно окремо від дозамовлення
  bill.total += sum; bill.orders = (bill.orders || 0) + 1; bill.opened = bill.opened || Date.now();
  if (!bill.waiter && who) bill.waiter = who; // хто обслуговує стіл — йому чайові
  bill.log = [...(bill.log || []), { at: hhmm(), kind: `від офіціанта (${who})`, lines, ...(comment ? { comment } : {}) }].slice(-40);
  await putBill(env, d.table, bill);
  // різні ключі — паралельно (менше часу під замком «bills», швидше бачать інші екрани)
  await Promise.all([
    addStat(env, 'orders', 1),
    addDishes(env, ok.map(i => ({ n: i.name, q: i.q, sum: i.price * i.q }))),
    queueKitchen(env, { table: d.table, kind: 'ВІД ОФІЦІАНТА', lines, comment, by: who, urgent }),
    addKitchen(env, { t: d.table, by: who, src: 'офіціант', comment, lines, urgent }),
    logEvent(env, { k: 'waiter', t: d.table, by: who, src, lines, comment, sum, ...(prev.length ? { prev } : {}) }),
  ]);
  return { sum, total: bill.total, lines, prev };
}
// позиції з меню за id → рядки замовлення (ціни — лише з меню)
export async function itemsFromMenu(env, list) {
  const menu = await getMenu(env); const by = {};
  menu.categories.forEach(c => c.items.forEach(it => { by[it.id] = it; }));
  const out = [];
  for (const x of (Array.isArray(list) ? list : []).slice(0, 80)) {
    const it = by[x.id]; const q = Math.min(50, Math.max(0, parseInt(x.q, 10) || 0));
    if (!it || !q) continue;
    const v = it.variants ? it.variants.find(z => z.v === x.v) || it.variants[0] : null;
    out.push({ name: it.name.uk + (v ? ` ${v.v} ${it.size || 'л'}`.trimEnd() : ''), price: v ? v.p : it.price, q, hidden: !!it.hidden });
  }
  return out;
}

// ❌ відхилити замовлення гостя (ще не прийняте): прибрати з рахунку і статистики, гість бачить «відхилено»
async function _rejectOrder(env, oid, who, { editTg = true } = {}) {
  if (!/^[a-z0-9]{6,12}$/.test(oid || '')) return null;
  const o = (await env.DB.get('ord:' + oid, 'json')) || {};
  if (o.s !== 'new' || !o.lines?.length) return null;
  await env.DB.put('ord:' + oid, JSON.stringify({ ...o, s: 'rej', by: who, at: hhmm(), ...(o.go ? { g: 'rej' } : {}) }), { expirationTtl: BILL_TTL });
  // стіл могли перенести/об'єднати — шукаємо замовлення на всіх відкритих столах, починаючи з o.t
  let t = o.t, b = await getBill(env, t), i = (b.log || []).findIndex(x => x.oid === oid);
  if (i < 0) for (const r of await openTables(env)) { const j = (r.b.log || []).findIndex(x => x.oid === oid); if (j >= 0) { t = r.t; b = r.b; i = j; break; } }
  if (i >= 0) { // ще на рахунку — прибрати і з рахунку, і зі статистики
    // віднімаємо те, що лишилось від замовлення (частину могли вже скасувати через «−1» — вона вже віднята)
    const left = b.log[i].lines.filter(l => !l.includes('🛵 Доставка')).map(l => l.match(LINE)).filter(Boolean);
    const fee = b.log[i].lines.some(l => l.includes('🛵 Доставка')) ? b.go?.fee || 0 : 0; if (b.go && b.log.length === 1) b.total = fee; // доставка відхилена повністю — віртуальний стіл зникає
    b.log.splice(i, 1); b.total = Math.max(0, (b.total || 0) - fee - left.reduce((a, x) => a + +x[3], 0)); b.orders = Math.max(0, (b.orders || 1) - 1); await putBill(env, t, b);
    if (left.length) await addDishes(env, left.map(x => ({ n: x[2], q: -x[1], sum: -x[3] })));
    await addStat(env, 'orders', -1);
  }
  await editEv(env, list => { for (const e of list) if (e.oid === oid) { e.s = 'rej'; e.accBy = who; } });
  if (editTg && o.mid && o.html) await tg(env, 'editMessageText', { chat_id: env.CHAT_ID, message_id: o.mid, text: `${o.html}\n\n❌ Відхилив: <b>${esc(who)}</b> о ${hhmm()}`, parse_mode: 'HTML' });
  return o;
}

// прибрати 1 шт позиції (за назвою) з останнього замовлення, де вона є
async function _removeOne(env, t, name, who = '', reason = '') {
  reason = String(reason || '').trim().slice(0, 120);
  if (!reason) return { error: 'Вкажіть причину скасування' };
  const b = await getBill(env, t);
  for (let i = (b.log || []).length - 1; i >= 0; i--) {
    const o = b.log[i]; const j = o.lines.findIndex(l => (l.match(LINE) || [])[2] === name);
    if (j < 0) continue;
    const [, q, , sum] = o.lines[j].match(LINE); const unit = Math.round(+sum / +q);
    if (+q > 1) o.lines[j] = `${+q - 1}× ${name} — ${+sum - unit}`; else o.lines.splice(j, 1);
    if (!o.lines.length) b.log.splice(i, 1);
    b.total = Math.max(0, b.total - unit);
    const v = { ts: Date.now(), at: hhmm(), t: +t, by: who || '', name, sum: unit, reason };
    (b.voids = b.voids || []).push(v);
    await putBill(env, t, b);
    if (!(b.total > 0)) await logClosed(env, { ts: Date.now(), t: +t, sum: 0, at: hhmm(), by: who || '', del: 1, voids: b.voids }); // стіл спорожнів — скасування лишаються в історії
    // уже готували (кухня: «Готую»/«Готово») або причина «не сподобалось / брак» → продукти списуються як брак, інакше повертаються на склад
    const kc = await kitchenCancel(env, +t, name, b.opened), cooked = kc.length ? kc[0].cooked : WASTE_R.test(reason);
    if (cooked) v.w = 1;
    await addDishes(env, [{ n: name, q: -1, sum: -unit }]);
    if (cooked) await wasteDish(env, [{ n: name, q: 1 }], reason, who).catch(() => {});
    await addVoid(env, v);
    await logEvent(env, { k: 'rm', t, by: who, text: `−1× ${name} (−${unit}) · ${reason}` });
    return { name, unit, reason };
  }
  return null;
}

// ↩️ повернути скасовану страву (сьогодні): назад на стіл (відкритий — додається; закритий — новий рахунок), прибирається з журналу скасувань
async function _restoreVoid(env, ts, who) {
  const k = 'void:' + dayKey(), l = await getVoids(env), i = l.findIndex(v => v.ts === +ts && !v.table);
  if (i < 0) return null;
  const v = l[i]; l.splice(i, 1); await env.DB.put(k, JSON.stringify(l));
  const b = await getBill(env, v.t), line = `1× ${v.name} — ${v.sum}`;
  b.total = (b.total || 0) + v.sum; b.orders = (b.orders || 0) + 1; b.opened = b.opened || Date.now();
  b.log = [...(b.log || []), { at: hhmm(), kind: `↩️ повернуто після скасування (${who})`, lines: [line] }].slice(-60);
  if (b.voids) { const j = b.voids.findIndex(x => x.ts === v.ts); if (j >= 0) b.voids.splice(j, 1); }
  await putBill(env, v.t, b);
  await addDishes(env, [{ n: v.name, q: 1, sum: v.sum }], dayKey(), { stock: !v.w }); // брак уже списано — вдруге не списуємо
  await logEvent(env, { k: 'shift', t: v.t, by: who, text: `↩️ Стіл ${tn(v.t)}: повернуто ${v.name} (${v.sum} грн), скасоване о ${v.at}` });
  return v;
}

const WASTE_R = /не сподоб|брак|зіпсов|розбил|впал/i;
// 🕵️ журнал скасувань за день (для контролю): { ts, at, t, by, name, sum, reason }
export const getVoids = async (env, day = dayKey()) => (await env.DB.get('void:' + day, 'json')) || [];
async function _addVoid(env, v) { const k = 'void:' + dayKey(), l = await getVoids(env); l.push(v); await env.DB.put(k, JSON.stringify(l.slice(-1000))); }

// pay: 'cash' | 'card'; print — друкувати фінальний чек
async function _closeTable(env, t, who, pay = 'cash', print = true) {
  const bill = await getBill(env, t);
  if (!bill.total) return null;
  await promoFill(env, bill).catch(() => {}); // 🎁 акції й рівень — рахуються наново саме зараз (promo.js)
  { /* 🎁 бонуси + сертифікат не більші за суму після знижки й акцій: зайве — спершу бонуси лишаються на рахунку гостя, потім повертається на сертифікат */
    const room = Math.max(0, bill.total - discAmt(bill) - (bill.promo?.sum || 0)), cs = bill.cert?.sum || 0;
    if ((bill.bonus || 0) > room) { const cli = Math.max(0, (bill.bonus || 0) - cs); bill.bonus = Math.max(0, Math.min(cli, room - cs)) + cs; if (!bill.bonus) delete bill.bonus;
      if ((bill.bonus || 0) > room && bill.cert) { await putBill(env, t, bill); await (await import('./site.js')).certUse(env, t, bill.cert.code, who || '').catch(() => {}); const b2 = await getBill(env, t); if (b2.bonus) bill.bonus = b2.bonus; else delete bill.bonus; bill.cert = b2.cert; } } }
  // чайові входять у виручку тим способом, яким заплатив гість; при видачі списуються з готівки або картки
  const tip = (bill.tip || 0) + (bill.ktip || 0), sum = payable(bill) + tip, disc = discAmt(bill);
  /* 🌐 онлайн (LiqPay) — безготівка, але окремо від терміналу (onl ⊂ card). Оплачене гостем наперед (go.paid / paid з QR) — завжди онлайн; доплату — тим способом, що обрали на касі */
  const pre = Math.round(bill.go?.paid?.sum || bill.paid?.sum || 0), onl = pay === 'online' ? sum : Math.min(pre, sum), rest = sum - onl;
  const card = onl + (pay === 'card' ? rest : 0), cash = sum - card; if (onl && !rest) pay = 'online';
  if (pre > sum + 1) notify(env, `⚠️ Стіл ${tn(t)}: гість оплатив онлайн ${pre} грн, а рахунок ${sum} грн — переплата ${pre - sum} грн. Поверніть різницю в кабінеті LiqPay.`).catch(() => {}); /* 💳 зменшили рахунок після оплати */
  if (print) await queuePrint(env, 'receipt', await receipt(env, { table: t, bill, final: true, pay, by: who }));
  await env.DB.delete('bill:' + t);
  const kq = kitchenClosed(env, [+t]); // стіл закрили — замовлення лишаються на кухні з позначкою «оплачено» (паралельно з виручкою)
  await bump(env, 'day:' + dayKey(), d => { d.closed = (d.closed || 0) + sum; d.tables = (d.tables || 0) + 1; d.cash = (d.cash || 0) + cash; d.card = (d.card || 0) + card; if (onl) d.onl = (d.onl || 0) + onl; if (disc) d.disc = (d.disc || 0) + disc; if (tip) d.tip = (d.tip || 0) + tip; });
  // страви рахунку — щоб при видаленні закритого рахунку відняти їх і з «топ страв»
  const dishes = []; for (const o of bill.log || []) for (const l of o.lines) { const x = l.match(LINE); if (x) dishes.push([x[2], +x[1], +x[3]]); }
  const waiter = bill.waiter || who || ''; // чайові — офіціанту стола (хто першим вибив/прийняв), а не тому, хто закрив
  const tipSplit = tip ? await splitTip(env, waiter, bill.tip || 0, bill.ktip || 0) : null;
  const cbGot = bill.cli ? ((await cliClose(env, bill.cli, sum - tip, (bill.bonus || 0) - (bill.cert?.sum || 0), bill.go?.name, bill.promo?.cash).catch(() => null))?.lastAdd || 0) : 0; // 🎁 бонуси гостя — до запису чека (cb/used — для відкату)
  await Promise.all([
    kq,
    (async () => { if (tipSplit) for (const [n, v] of Object.entries(tipSplit)) await addTipBal(env, n, v); })(), // один ключ — по черзі
    (async () => { if (bill.cli) { await promoClose(env, bill, sum - tip).catch(() => {}); await reviewQueue(env, bill.cli, sum).catch(() => {}); } })(),
    logClosed(env, { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), t, sum, cash, card, ...(onl ? { onl, lpo: bill.paid?.list?.length ? bill.paid.list.map(p => ({ o: p.order, a: p.amt })) : bill.go?.paid ? [{ o: `go-${env.VENUE || 'varvar'}-${bill.go.oid}`, a: bill.go.paid.sum }] : [] } : {}), /* 🌐 платежі LiqPay — для повернення з «Закритих» */ ...(bill.cli ? { used: Math.max(0, (bill.bonus || 0) - (bill.cert?.sum || 0)), cb: cbGot } : {}), ...(bill.go ? { go: bill.go.kind, ...(bill.go.cour ? { cour: bill.go.cour } : {}), ...(bill.go.fee ? { fee: bill.go.fee } : {}), gt: { at: bill.go.at, acc: bill.go.accAt, take: bill.go.takeAt, road: bill.go.roadAt, done: Date.now(), when: bill.go.when || '', prob: bill.go.prob?.k || '' } } : {}), ...(bill.bonus ? { bonus: bill.bonus } : {}), ...(bill.cert ? { cert: bill.cert } : {}), ...(bill.cli ? { cli: bill.cli, ...(bill.promo?.nth && Object.keys(bill.promo.nth).length ? { nth: bill.promo.nth } : {}) } : {}), ...(bill.promo?.sum ? { promo: bill.promo.lines.filter(l => l.amt).map(({ k, n, amt }) => ({ k, n, amt })), promoSum: bill.promo.sum } : {}), at: hhmm(), by: who || '', w: waiter, orders: bill.orders || 0, dishes, ...(tip ? { tip, tipSplit, ...(bill.ktip ? { ktip: bill.ktip } : {}) } : {}), ...(bill.voids?.length ? { voids: bill.voids } : {}), ...(bill.promo?.sum && !disc ? { gross: bill.total } : {}), ...(disc ? { gross: bill.total, disc: bill.disc, discSum: disc } : {}) }),
    logEvent(env, { k: 'close', t, by: who, sum, pay, print }),
    bill.paid ? editEv(env, l => { for (const e of l) if (e.k === 'tpay' && +e.t === +t && e.s === 'new') { e.s = 'acc'; e.accBy = who || ''; } }) : null, // 💳 оплачено з QR — подія гасне
  ]);
  return { t, sum, cash, card, disc, tip };
}
export const payLabel = (cash, card) => card && cash ? '💵+💳 змішано' : card ? '💳 карта' : '💵 готівка';

export async function precheck(env, t, who) {
  const b = await getBill(env, t); if (!b.total) return false; await promoFill(env, b).catch(() => {});
  await queuePrint(env, 'precheck', await receipt(env, { table: +t, bill: b, final: false, by: who }));
  await logEvent(env, { k: 'pre', t, by: who });
  return true;
}

async function _setDiscount(env, t, pct, who, admin = true) {
  const b = await getBill(env, t); if (!b.total) return null;
  pct = Math.max(0, Math.min(100, Math.round(+pct || 0)));
  const dmax = typeof admin === 'number' ? admin : (await getCfg(env)).discMax; // число — персональний ліміт (perm.discountMax)
  if (admin !== true && pct > dmax) return { error: `Офіціант може дати знижку до ${dmax}%. Більше — лише адміністратор.`, max: dmax };
  delete b.discSum; // нова знижка — знову відсотком від усього рахунку
  if (pct) b.discBy = who || ''; else delete b.discBy;
  if (pct) b.disc = pct; else delete b.disc;
  await putBill(env, t, b);
  await logEvent(env, { k: 'disc', t, by: who, text: pct ? `знижка ${pct}% (−${discAmt(b)})` : 'знижку прибрано' });
  return b;
}

// 💝 чайові (від гостя з сайту або вручну) — входять у виручку, окремий рядок у чеку; офіціанту накопичуються на рахунку
async function _setTip(env, t, sum, who) {
  const b = await getBill(env, t); if (!b.total) return null;
  sum = Math.max(0, Math.min(10000, Math.round(+sum || 0)));
  if (sum) b.tip = sum; else delete b.tip;
  await putBill(env, t, b);
  await logEvent(env, { k: 'disc', t, by: who, text: sum ? `чайові ${sum} грн` : 'чайові прибрано' });
  return b;
}
// 👨‍🍳 чайові кухні: частка % від чайових офіціанта + «подяка кухні» від гостя — порівну між кухарями, що сьогодні працюють
export const kitchenPct = async env => { const v = await env.DB.get('kitchen_pct'); return v == null ? 20 : +v; };
export const KITCHEN_POOL = '👨‍🍳 Кухня';
async function _markCook(env, name) { const k = 'cooks:' + dayKey(), l = (await env.DB.get(k, 'json')) || []; if (!l.includes(name)) { l.push(name); await env.DB.put(k, JSON.stringify(l), { expirationTtl: 3 * 86400 }); } }
export async function splitTip(env, waiter, tipW, ktip) {
  const out = {}, add = (n, v) => { if (v) out[n || '—'] = (out[n || '—'] || 0) + v; };
  const kpart = Math.round(tipW * (await kitchenPct(env)) / 100), kitchen = kpart + ktip;
  add(waiter, tipW - kpart);
  const names = new Set((await getStaff(env)).map(s => s.name)), cooks = ((await env.DB.get('cooks:' + dayKey(), 'json')) || []).filter(n => names.has(n)); // лише ті, хто ще в персоналі
  if (kitchen) { if (!cooks.length) add(KITCHEN_POOL, kitchen); else { const each = Math.floor(kitchen / cooks.length); cooks.forEach((c, i) => add(c, each + (i === 0 ? kitchen - each * cooks.length : 0))); } }
  return out;
}
export const tipSplitOf = x => x.tipSplit || (x.tip ? { [x.by || '—']: x.tip } : {});
// ---------- рахунок чайових офіціанта: накопичуються, поки адмін не натисне «Видано» ----------
async function _tipBalances(env) {
  let b = await env.DB.get('tipbal', 'json');
  if (!b) { // перший раз — рахуємо з усіх закритих рахунків
    b = {}; const keys = (await env.DB.list({ prefix: 'closed:' })).keys.map(k => k.name);
    const lists = keys.length ? await env.DB.getMany(keys, 'json') : [];
    // як у tipSplitOf: частка кухні з tipSplit; старі записи без tipSplit — усе офіціанту
    lists.forEach(l => (l || []).forEach(x => { if (x.tip && !x.del && !x.rm) for (const [n, v] of Object.entries(tipSplitOf(x))) b[n] = (b[n] || 0) + v; }));
    await env.DB.put('tipbal', JSON.stringify(b));
  }
  return b;
}
async function _addTipBal(env, name, n) { if (!n) return; const b = await tipBalances(env); const k = name || '—'; b[k] = Math.round(((b[k] || 0) + n) * 100) / 100; if (!b[k]) delete b[k]; /* мінус = чайові вже видали, а чек потім прибрали — борг, щоб не видати двічі */ await env.DB.put('tipbal', JSON.stringify(b)); }
// src: cash | card — звідки видали: сума списується з готівки або з картки (як рух коштів)
async function _payTips(env, name, who, src = 'cash') {
  const b = await tipBalances(env), sum = b[name] || 0; if (!(sum > 0)) return null;
  src = src === 'card' ? 'card' : 'cash';
  delete b[name]; await env.DB.put('tipbal', JSON.stringify(b));
  const k = 'tippay:' + dayKey(), l = (await env.DB.get(k, 'json')) || []; l.push({ ts: Date.now(), at: hhmm(), name, sum, src, by: who || '' }); await env.DB.put(k, JSON.stringify(l));
  const mk = 'mov:' + dayKey(), ml = await getMov(env); ml.push({ ts: Date.now(), at: hhmm(), type: src === 'card' ? 'tipk' : 'tipc', sum, note: name, by: who || '' }); await env.DB.put(mk, JSON.stringify(ml));
  await logEvent(env, { k: 'shift', by: who, text: `💝 Видано чайові: ${name} — ${sum} грн (${src === 'card' ? 'з картки' : 'готівкою'})` });
  return sum;
}
// перенос: стіл a → b. Якщо b зайнятий — об'єднання (рахунок a додається до b)
// 🎁 бонуси й сертифікат на рахунку стають неправильними після об'єднання / розділення / прибирання страв — знімаємо (сертифікат повертає суму), офіціант застосує знову
async function releaseBon(env, t, who) {
  const x = await getBill(env, t); if (!x.bonus && !x.cert) return false;
  if (x.cert) await (await import('./site.js')).certOff(env, t, who || '').catch(() => {});
  const y = await getBill(env, t); if (y.bonus) { delete y.bonus; await putBill(env, t, y); } return true;
}
async function _moveTable(env, a, b, who) {
  a = +a; b = +b; if (!a || !b || a === b) return null;
  const B = await getBill(env, b), released = B.total ? await releaseBon(env, a, who) : false;
  const A = await getBill(env, a); if (!A.total) return null;
  let merged = false;
  if (B.total) {
    merged = true;
    B.orders = (B.orders || 0) + (A.orders || 0);
    B.opened = Math.min(B.opened || Date.now(), A.opened || Date.now());
    B.log = [...(B.log || []), ...(A.log || []).map(o => ({ ...o, kind: `${o.kind} (зі столу ${tn(a)})` }))].slice(-60);
    B.check = B.check || A.check; B.waiter = B.waiter || A.waiter; if (!B.cli && A.cli) B.cli = A.cli; /* 🎁 гість першого стола — щоб кешбек і візит не загубились */
    // знижка: кожен стіл зберігає свою — у гривнях (раніше знижка A діяла на весь рахунок B або губилась)
    const dA = discAmt(A), dB = discAmt(B), sameP = A.discSum == null && B.discSum == null && (A.disc || 0) === (B.disc || 0);
    B.total += A.total;
    if (!sameP && dA + dB) { B.discSum = dA + dB; B.disc = Math.max(1, Math.round(B.discSum / B.total * 100)); B.discBy = B.discBy || A.discBy; } if (A.voids) B.voids = [...(B.voids || []), ...A.voids];
    if (A.tip) B.tip = (B.tip || 0) + A.tip; if (A.ktip) B.ktip = (B.ktip || 0) + A.ktip; // чайові обох столів сумуються (раніше чайові A губились)
    if (A.paid) { B.paid = { sum: (B.paid?.sum || 0) + A.paid.sum, net: (B.paid?.net || 0) + A.paid.net, list: [...(B.paid?.list || []), ...(A.paid.list || [])] }; B.pwait = B.pwait || A.pwait; B.check = true; B.pay = 'online'; } /* 💳 онлайн-оплата A переходить на B */
    await putBill(env, b, B);
  } else await putBill(env, b, A);
  await env.DB.delete('bill:' + a);
  await kqMut(env, l => { for (const e of l) if (!e.done && e.t === a) e.t = b; }); // кухня бачить новий номер стола
  if (A.paid) await editEv(env, l => { for (const e of l) if (e.k === 'tpay' && +e.t === a) e.t = b; }); // 💳 подія «оплачено» — на новий стіл
  // статуси замовлень гостей переходять на новий стіл
  await logEvent(env, { k: 'move', t: b, from: a, by: who, text: merged ? `стіл ${tn(a)} об'єднано зі столом ${tn(b)}` : `стіл ${tn(a)} → ${tn(b)}` });
  return { merged, released };
}

// ✂️ розділити рахунок: обрані позиції (назва + кількість) переходять на стіл «to» (вільний — новий рахунок, зайнятий — додаються)
async function _splitTable(env, t, items, to, who) {
  t = +t; to = +to; if (!t || !to || t === to) return null;
  if ((await getBill(env, t)).paid || (await getBill(env, to)).paid) return { error: 'Стіл оплачено онлайн — спершу ✅ підтвердіть оплату, потім розділяйте' };
  const released = await releaseBon(env, t, who);
  const A = await getBill(env, t); if (!A.total) return null;
  const moved = [];
  for (const { name, q: q0 } of (Array.isArray(items) ? items : []).slice(0, 80)) {
    let q = Math.max(0, parseInt(q0, 10) || 0);
    for (let i = (A.log || []).length - 1; i >= 0 && q > 0; i--) {
      const o = A.log[i];
      for (let j = o.lines.length - 1; j >= 0 && q > 0; j--) {
        const x = o.lines[j].match(LINE); if (!x || x[2] !== name) continue;
        const have = +x[1], unit = Math.round(+x[3] / have), take = Math.min(have, q), s = have === take ? +x[3] : unit * take;
        if (have === take) o.lines.splice(j, 1); else o.lines[j] = `${have - take}× ${name} — ${+x[3] - s}`;
        moved.push([name, take, s]); q -= take;
      }
      if (!o.lines.length) A.log.splice(i, 1);
    }
  }
  if (!moved.length) return null;
  const agg = new Map(); moved.forEach(([n, q, s]) => { const a = agg.get(n) || [0, 0]; agg.set(n, [a[0] + q, a[1] + s]); });
  const lines = [...agg].map(([n, [q, s]]) => `${q}× ${n} — ${s}`), sum = moved.reduce((a, x) => a + x[2], 0);
  A.total = Math.max(0, A.total - sum);
  const B = await getBill(env, to), wasEmpty = !B.total;
  B.total = (B.total || 0) + sum; B.orders = (B.orders || 0) + 1; B.opened = B.opened || Date.now(); B.waiter = B.waiter || A.waiter;
  B.log = [...(B.log || []), { at: hhmm(), kind: `✂️ зі столу ${tn(t)} (${who})`, lines }].slice(-60);
  if (wasEmpty && A.disc && A.discSum == null) { B.disc = A.disc; if (A.discBy) B.discBy = A.discBy; } // той самий відсоток знижки
  if (A.discSum != null) A.discSum = Math.min(A.discSum, A.total);
  if (!(A.total > 0)) { if (A.tip) B.tip = (B.tip || 0) + A.tip; if (A.ktip) B.ktip = (B.ktip || 0) + A.ktip; } // перенесли все — чайові теж
  await putBill(env, t, A); await putBill(env, to, B);
  await logEvent(env, { k: 'move', t: to, from: t, by: who, text: `✂️ стіл ${tn(t)} розділено → стіл ${tn(to)}: ${lines.join(', ')}` });
  return { lines, sum, to, left: A.total, released };
}

async function _deleteTable(env, t, who, reason = '') {
  let bill = await getBill(env, t);
  if (!bill.total) return null;
  if (bill.cert) { await (await import('./site.js')).certOff(env, t, who || '').catch(() => {}); bill = await getBill(env, t); } /* 🎟 сертифікат / подарунок ДН повертається, а не згорає */
  await env.DB.delete('bill:' + t);
  const kc = await kitchenCancel(env, +t, null, bill.opened);
  const dishes = []; for (const o of bill.log || []) for (const l of o.lines) { const x = l.match(LINE); if (x) dishes.push([x[2], +x[1], +x[3]]); }
  await addVoid(env, { ts: Date.now(), at: hhmm(), t: +t, by: who || '', name: `🗑 Весь стіл (${dishes.length} поз.)`, sum: bill.total, reason: String(reason || 'стіл видалено').slice(0, 120), table: 1 });
  await logClosed(env, { ts: Date.now(), t, sum: bill.total, at: hhmm(), by: who || '', del: 1, dishes, orders: bill.orders || 0, ...((bill.tip || bill.ktip) ? { tip: (bill.tip || 0) + (bill.ktip || 0), ...(bill.ktip ? { ktip: bill.ktip } : {}) } : {}), ...(bill.disc ? { disc: bill.disc, ...(bill.discSum != null ? { discSum: bill.discSum, gross: bill.total } : {}) } : {}), /* ↩️ щоб «відновити стіл» повернув і чайові, і знижку */ ...(bill.voids?.length ? { voids: bill.voids } : {}) });
  // видалений стіл — не продаж: прибрати його страви з «топ страв» і замовлення з лічильника (↩️ відновлення поверне)
  if (dishes.length) await addDishes(env, dishes.map(([n, q, sum]) => ({ n, q: -q, sum: -sum })));
  const cooked = kc.filter(x => x.cooked); if (cooked.length) await wasteDish(env, cooked, reason || 'стіл видалено', who).catch(() => {}); // уже приготоване — брак
  if (bill.orders) await addStat(env, 'orders', -bill.orders);
  await logEvent(env, { k: 'del', t, by: who, sum: bill.total });
  return { sum: bill.total };
}
export async function acceptOrder(env, ...a) {
  const ok = await L(env, 'ord:' + a[0], () => _acceptOrder(env, ...a));
  // хто прийняв замовлення гостя — офіціант стола (якщо ще не призначений); окремо від замка ord: — без взаємного блокування з rejectOrder
  if (ok && a[1]) { const o = await env.DB.get('ord:' + a[0], 'json'); if (o?.t) await L(env, 'bills', async () => { const b = await getBill(env, o.t); if (b.total > 0 && (!b.waiter || b.go?.st === 'new')) { if (!b.waiter) b.waiter = a[1]; if (b.go?.st === 'new') { b.go.st = 'acc'; b.go.accAt = Date.now(); } await putBill(env, o.t, b); } }); if (o?.go) { await courNotify(env, o.t, 'new').catch(() => {}); const g = (await getBill(env, o.t)).go; if (g) await (await import('./guestbot.js')).goStatusMsg(env, o.t, g, 'acc').catch(() => {}); } }
  return ok;
}
export async function rejectOrder(env, ...a) { // 🛵 доставка зникла — кур'єру «скасовано» (рахунок читаємо до видалення)
  const o0 = /^[a-z0-9]{6,12}$/.test(a[0] || '') ? await env.DB.get('ord:' + a[0], 'json') : null, b0 = o0?.go && o0.t ? await getBill(env, o0.t) : null;
  const o = await L(env, ['ord:' + a[0], 'bills'], () => _rejectOrder(env, ...a));
  if (o && b0?.go && !(await getBill(env, o0.t)).total) { await courNotify(env, o0.t, 'gone', '', b0).catch(() => {}); await goGone(env, b0).catch(() => {}); }
  return o;
}
export async function addWaiterOrder(env, ...a) { return L(env, 'bills', () => _addWaiterOrder(env, ...a)); }
export async function removeOne(env, ...a) {
  const b0 = +a[0] > 1000 ? await getBill(env, a[0]) : null, r = await L(env, 'bills', () => _removeOne(env, ...a));
  if (r && !r.error) await L(env, 'bills', async () => { const b = await getBill(env, a[0]); if (b.total && (b.bonus || 0) > b.total - discAmt(b) - (b.promo?.sum || 0)) await releaseBon(env, a[0], a[2]); }).catch(() => {}); // бонусів більше, ніж до сплати — знімаємо
  if (b0?.go && r && !r.error) { const b1 = await getBill(env, a[0]); if (b1.total && billItems(b1).every(i => i.name.includes('Доставка'))) await L(env, 'bills', () => env.DB.delete('bill:' + a[0])); } // лишилась тільки доставка — чек зникає
  if (b0?.go && r && !r.error && !(await getBill(env, a[0])).total) { await courNotify(env, a[0], 'gone', '', b0).catch(() => {}); await goGone(env, b0).catch(() => {}); } // прибрали все — доставка скасована
  return r;
}
export async function closeTable(env, ...a) { return L(env, 'bills', () => _closeTable(env, ...a)); }
export async function setDiscount(env, ...a) { return L(env, 'bills', () => _setDiscount(env, ...a)); }
export async function setTip(env, ...a) { return L(env, 'bills', () => _setTip(env, ...a)); }
export async function moveTable(env, ...a) { return L(env, 'bills', () => _moveTable(env, ...a)); }
export async function restoreVoid(env, ...a) { return L(env, ['bills', 'void:' + dayKey()], () => _restoreVoid(env, ...a)); }
export async function splitTable(env, ...a) { return L(env, 'bills', () => _splitTable(env, ...a)); }
export async function deleteTable(env, ...a) {
  const b0 = a[0] > 1000 ? await getBill(env, a[0]) : null, r = await L(env, 'bills', () => _deleteTable(env, ...a));
  if (r && b0?.go) { await courNotify(env, a[0], 'gone', '', b0).catch(() => {}); await goGone(env, b0).catch(() => {}); } // 🛵 кур'єру й гостю «скасовано»
  return r;
}
async function addVoid(env, ...a) { return L(env, 'void:' + dayKey(), () => _addVoid(env, ...a)); }
export async function markCook(env, ...a) { return L(env, 'cooks:' + dayKey(), () => _markCook(env, ...a)); }
export async function tipBalances(env, ...a) { const b = await env.DB.get('tipbal', 'json'); return b || L(env, 'tipbal', () => _tipBalances(env, ...a)); } // читання — без черги
export async function addTipBal(env, ...a) { return L(env, 'tipbal', () => _addTipBal(env, ...a)); }
export async function payTips(env, ...a) { return L(env, ['tipbal', 'tippay:' + dayKey(), 'mov:' + dayKey()], () => _payTips(env, ...a)); }
