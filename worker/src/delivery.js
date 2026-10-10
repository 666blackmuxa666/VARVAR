// 🛵 Замовлення за посиланням: самовивіз і доставка. Кожне — «віртуальний стіл» (tn.js): звичайний bill: з полем go,
// тож працюють усі дії столу (дозамовлення, знижка, скасування, кухня, склад, закриття, звіти).
import { getMenu, priceMap } from './menu.js';
import { tg, esc, hhmm, dayKey, getBill, putBill, billItems, payable, discAmt, logEvent, addStat, addDishes, L, editEv, closeTable, notify, openTables } from './ops.js';
import { GO_DEL, GO_PICK, isGo, tn } from './tn.js';
import { courNotify } from './courier.js';
import { getSite } from './site.js';
import { promoFill } from './promo.js';
import { lpKeys, lpForm, lpOk } from './liqpay.js';
import { siteLink } from './venue.js';

const BILL_TTL = 2 * 86400;
// ⚙️ налаштування доставки (окремо від cfg — тут є текст і час)
export const GO_DEF = { on: 1, del: 1, pick: 1, from: '10:00', to: '22:00', min: 0, fee: 60, free: 600, prep: 30, phone: '', zone: '', cash: 5, bmax: 30, cpay: 0, onl: 0, qrpay: 0 }; // onl — 🌐 онлайн-оплата замовлень; qrpay — оплата рахунку столу з QR (обидва — лише з ключами LiqPay закладу)
const NUM = { on: [0, 1], del: [0, 1], pick: [0, 1], min: [0, 10000], fee: [0, 2000], free: [0, 100000], prep: [5, 240], cash: [0, 50], bmax: [0, 100], cpay: [0, 2000], onl: [0, 1], qrpay: [0, 1] };
export const getGoCfg = async env => ({ ...GO_DEF, ...((await env.DB.get('gocfg', 'json')) || {}) });
export async function setGoCfg(env, k, v) {
  if (NUM[k]) { v = Math.round(+v); const [lo, hi] = NUM[k]; if (!(v >= lo && v <= hi)) return { error: `Від ${lo} до ${hi}` }; }
  else if (k === 'from' || k === 'to') { v = String(v).trim(); if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) return { error: 'Формат часу: 10:00' }; v = v.padStart(5, '0'); }
  else if (k === 'phone' || k === 'zone') v = String(v || '').trim().slice(0, k === 'zone' ? 300 : 30);
  else return { error: 'Невідоме налаштування' };
  return L(env, 'gocfg', async () => { const c = await getGoCfg(env); c[k] = v; await env.DB.put('gocfg', JSON.stringify(c)); return c; });
}
const mins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
// чи приймаємо зараз (години через північ теж: 18:00–02:00)
export function isOpen(c, at = hhmm()) { const n = mins(at), a = mins(c.from), b = mins(c.to); return a <= b ? n >= a && n < b : n >= a || n < b; }
export const normPhone = p => { const d = String(p || '').replace(/\D/g, ''); const x = d.length === 10 && d[0] === '0' ? '38' + d : d.length === 12 && d.startsWith('380') ? d : ''; return x || null; };
export const fmtPhone = p => p ? `+${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8, 10)} ${p.slice(10)}` : '';

// ---------- 🎁 клієнти й бонуси ----------
// 📱 у програмі лояльності лише ті, хто підключив бот гостей (є куди написати), або кому адмін вручну дав рівень (персонал, VIP)
export const isMem = c => !!(c && (c.chat || c.lvl));
export const getCli = async (env, ph) => ph ? (await env.DB.get('cli:' + ph, 'json')) || null : null;
export async function cliTouch(env, ph, fn) { return L(env, 'cli:' + ph, async () => { const c = (await getCli(env, ph)) || { n: 0, sum: 0, bal: 0, addr: [] }; fn(c); await env.DB.put('cli:' + ph, JSON.stringify(c)); return c; }); }
// чек закрито: списані бонуси — з балансу, кешбек — на баланс
export async function cliClose(env, ph, paid, used, name, lvCash) {
  if (!ph) return null; const pct = lvCash > 0 ? lvCash : (await getGoCfg(env)).cash, add = Math.floor(paid * pct / 100);
  let got = 0; const c = await cliTouch(env, ph, c => { got = isMem(c) ? add : 0; c.bal = Math.max(0, (c.bal || 0) - (used || 0)) + got; c.n++; c.sum += paid; c.last = Date.now(); if (name) c.name = name; c.lastAdd = got; });
  await (await import('./guestbot.js')).bonusMsg(env, ph, got, c.bal).catch(() => {}); // 🤖 «+N бонусів»
  return c;
}

// ---------- номер віртуального стола ----------
async function goAlloc(env, kind) {
  const base = kind === 'pick' ? GO_PICK : GO_DEL;
  return L(env, 'goseq', async () => {
    const k = 'goseq:' + dayKey(); let n = +(await env.DB.get(k)) || 0;
    for (let i = 0; i < 999; i++) { n = n % 999 + 1; if (!(await getBill(env, base + n)).total) break; }
    await env.DB.put(k, String(n), { expirationTtl: 3 * 86400 }); return base + n;
  });
}

// статус для гостя: new → acc → cook → ready → road → done | rej
const ST = { new: '🆕 нове', acc: '✅ прийнято', cook: '🔥 готується', ready: '🍽 готово', road: '🛵 в дорозі', done: '🤝 видано', rej: '❌ відхилено' };
export const goStLabel = s => ST[s] || s;
async function markOrd(env, oid, st, extra = {}) {
  if (!oid) return; await L(env, 'ord:' + oid, async () => { const o = await env.DB.get('ord:' + oid, 'json'); if (o) await env.DB.put('ord:' + oid, JSON.stringify({ ...o, g: st, gAt: Date.now(), ...extra }), { expirationTtl: BILL_TTL }); });
}
// 🛵 доставку скасовано в касі / боті (стіл видалено, відхилено, усе прибрано) — гість бачить «скасовано» і може замовити знову
export async function goGone(env, b0) {
  const g = b0?.go; if (!g?.oid) return;
  await markOrd(env, g.oid, 'rej', { cancelled: 1 });
  if (g.phone) { const { guestMsg } = await import('./site.js'); await guestMsg(env, g.phone, '😔 Ваше замовлення скасовано закладом. Якщо це помилка — зателефонуйте нам.').catch(() => {}); }
}
// змінити статус (каса, бот, кухня). done — закриває чек (pay: cash|card; онлайн-оплачене — завжди card)
export async function goSet(env, t, st, who, { pay, cour } = {}) {
  if (!isGo(t) || !ST[st]) return null;
  const b0 = await getBill(env, t); if (!b0.go) return null;
  if (st === 'done') {
    const g = b0.go, p = pay || (g.pay === 'card' ? 'card' : 'cash'); /* оплачене онлайн рахує _closeTable (go.paid); доплату — обраним способом */
    const r = await closeTable(env, t, who, p); if (!r) return null;
    await markOrd(env, g.oid, 'done');
    return { ...r, done: 1 };
  }
  const b = await L(env, 'bills', async () => { const b = await getBill(env, t); if (!b.go) return null; b.go.st = st; if (st === 'road' && !b.go.roadAt) b.go.roadAt = Date.now(); if (cour !== undefined && cour !== b.go.cour) { b.go.cour = cour || ''; if (cour) b.go.takeAt ||= Date.now(); } await putBill(env, t, b); return b; });
  if (!b) return null;
  await markOrd(env, b.go.oid, st);
  if (b0.go.st !== st) await (await import('./guestbot.js')).goStatusMsg(env, t, b.go, st).catch(() => {}); // 🤖 гостю в Telegram
  if (st === 'road' || st === 'ready') await logEvent(env, { k: 'go', t, by: who, s: 'acc', text: `${st === 'road' ? '🛵' : '🍽'} ${tn(t)} ${b.go.name || ''} — ${goStLabel(st)}${b.go.cour ? ' · ' + b.go.cour : ''}` });
  return b.go;
}
// кухня взяла / віддала — статус доставки рухається сам
export async function goKitchen(env, t, st) { if (!isGo(t)) return; const b = await getBill(env, t); if (!b.go || ['road', 'done', 'rej'].includes(b.go.st)) return; if (st === 'ready' || b.go.st === 'new' || b.go.st === 'acc') await goSet(env, t, st, 'кухня'); if (st === 'ready') await courNotify(env, t, 'ready').catch(() => {}); else await courNotify(env, t, 'refresh').catch(() => {}); }

// ---------- 🛒 замовлення з сайту ----------
const TYPES = { del: 'ДОСТАВКА', pick: 'САМОВИВІЗ' };
// 💳 callback LiqPay: оплачено → створюємо замовлення з позначкою «оплачено» (ідемпотентно); не оплачено — гість може спробувати ще
export async function goPaid(env, x) {
  const oid = String(x.order_id || '').split('-').pop(); if (!/^[a-f0-9]{10}$/.test(oid)) return { error: 'order' };
  return L(env, 'gop:' + oid, async () => {
    if (await env.DB.get('ord:' + oid)) return { ok: true, dup: 1 };
    const p = await env.DB.get('gop:' + oid, 'json'); if (!p) { if (lpOk(x)) await notify(env, `⚠️ Онлайн-оплата ${Math.round(+x.amount || 0)} грн прийшла пізніше 30 хв — замовлення вже знято (${esc(String(x.order_id))}). Поверніть гроші в кабінеті LiqPay або зателефонуйте гостю.`).catch(() => {}); return { error: 'expired' }; }
    if (!lpOk(x)) { await env.DB.put('gop:' + oid, JSON.stringify({ ...p, fail: x.status || 'error' }), { expirationTtl: 3600 }); return { ok: true, fail: 1 }; }
    const sum = Math.round(+x.amount || 0); if (sum + 1 < p.amount) { await notify(env, `⚠️ Онлайн-оплата ${sum} грн менша за замовлення (${p.amount} грн) — ${esc(p.b.name)} ${esc(p.b.phone)}. Замовлення не створено, поверніть гроші в LiqPay.`).catch(() => {}); await env.DB.put('gop:' + oid, JSON.stringify({ ...p, fail: 'amount' }), { expirationTtl: 3600 }); return { ok: true, fail: 1 }; }
    const [r] = await goOrder({ ...p.b, _paid: { sum, lp: String(x.payment_id || ''), at: Date.now(), ...(x.status === 'sandbox' ? { test: 1 } : {}) }, _oid: oid }, 'lp', env);
    if (r.error) { await notify(env, `⚠️ Оплачено онлайн ${sum} грн, але замовлення не створилось (${esc(r.error)}) — ${esc(p.b.name)} ${esc(p.b.phone)}. Поверніть гроші або зателефонуйте гостю.`).catch(() => {}); await env.DB.put('gop:' + oid, JSON.stringify({ ...p, fail: 'order' }), { expirationTtl: 3600 }); return { ok: true, fail: 1 }; } /* 200 — щоб LiqPay не повторював і не дублював сповіщення */
    return r;
  });
}
// гість повернувся з LiqPay: оплачено (замовлення вже є) / ще чекаємо / не вдалося
export async function goPayState(env, oid) {
  if (!/^[a-f0-9]{10}$/.test(oid || '')) return { st: 'none' };
  const o = await env.DB.get('ord:' + oid, 'json'); if (o) return { st: 'paid', no: o.t ? tn(o.t) : '' };
  const p = await env.DB.get('gop:' + oid, 'json'); return p ? { st: p.fail ? 'fail' : 'wait', sum: p.amount } : { st: 'none' };
}
export async function goOrder(b, ip, env) {
  const c = await getGoCfg(env), kind = b.kind === 'del' ? 'del' : 'pick';
  if (!b._paid && (!c.on || !c[kind])) return [{ error: 'off' }, 403]; // гість уже заплатив — замовлення створюємо, навіть якщо щойно вимкнули/зачинились
  if (!b._paid && (env.VENUE || 'varvar') !== 'varvar' && await env.DB.get('cfg:lock')) return [{ error: 'off' }, 403]; // ⛔ підписка не оплачена
  const when = /^\d{1,2}:\d{2}$/.test(b.when || '') ? String(b.when).padStart(5, '0') : '';
  if (!b._paid && !isOpen(c, when || hhmm())) return [{ error: 'closed', from: c.from, to: c.to }, 403];
  const phone = normPhone(b.phone), name = String(b.name || '').trim().slice(0, 40);
  if (!phone || !name) return [{ error: 'contact' }, 400];
  const addr = String(b.addr || '').trim().slice(0, 200); if (kind === 'del' && addr.length < 5) return [{ error: 'addr' }, 400];
  // антиспам: 3 замовлення за 10 хв з пристрою/IP
  const rk = 'gorl:' + String(b.device || ip).slice(0, 64), rn = b._paid ? 0 : +(await env.DB.get(rk)) || 0; if (rn >= 3) return [{ error: 'rate' }, 429];
  const PRICES = priceMap(await getMenu(env)), lines = [], sold = []; let sum = 0;
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 60)) {
    const p = PRICES[it.id], q = Math.min(50, Math.max(0, parseInt(it.q, 10) || 0)); if (!p || !q) continue;
    const price = typeof p.p === 'number' ? p.p : Object.hasOwn(p.p, String(it.v)) ? p.p[it.v] : 0; if (!(price > 0)) continue;
    const n = p.n + (typeof p.p === 'number' ? '' : ` ${it.v} ${p.s || 'л'}`);
    sum += price * q; sold.push({ n, q, sum: price * q }); lines.push(`${q}× ${n} — ${price * q}`);
  }
  if (!lines.length) return [{ error: 'empty' }, 400];
  if (!b._paid && sum < c.min) return [{ error: 'min', min: c.min }, 400];
  if (sum > 30000) return [{ error: 'too_big' }, 400];
  const fee = kind === 'del' && !(c.free && sum >= c.free) ? c.fee : 0;
  const cli = await getCli(env, phone), bonus = Math.min(Math.max(0, Math.round(+b.bonus || 0)), isMem(cli) ? cli.bal || 0 : 0, Math.floor(sum * c.bmax / 100));
  const pay = ['cash', 'card', 'online'].includes(b.pay) ? b.pay : 'cash', change = pay === 'cash' ? Math.max(0, Math.min(10000, Math.round(+b.change || 0))) : 0;
  const cut = Math.max(0, Math.min(20, parseInt(b.cut, 10) || 0)), note = String(b.comment || '').trim().slice(0, 200), ent = String(b.ent || '').trim().slice(0, 60);
  const oid = b._paid && /^[a-f0-9]{10}$/.test(b._oid || '') ? b._oid : crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  if (pay === 'online' && !b._paid) { // 🌐 спершу оплата: замовлення зʼявиться в касі лише після підтвердження LiqPay (/api/lp/go)
    const k = lpKeys(env); if (!c.onl || !k) return [{ error: 'online_off' }, 403];
    const pre = { total: sum + fee, cli: phone, go: { kind }, log: [{ lines: fee ? [...lines, `1× 🛵 Доставка — ${fee}`] : lines }], ...(bonus ? { bonus } : {}) };
    await promoFill(env, pre).catch(() => {});
    const amount = sum + fee - bonus - (pre.promo?.sum || 0); if (amount < 1) return [{ error: 'empty' }, 400];
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map(i => ({ id: String(i.id).slice(0, 40), ...(i.v ? { v: String(i.v).slice(0, 20) } : {}), q: Math.min(50, parseInt(i.q, 10) || 1) }));
    await Promise.all([env.DB.put('gop:' + oid, JSON.stringify({ b: { kind, name, phone, addr, ent, when: b.when || '', cut, pay: 'online', bonus, comment: note, device: String(b.device || '').slice(0, 64), src: String(b.src || '').slice(0, 20), items }, amount, at: Date.now() }), { expirationTtl: 1800 }), // ⏳ не оплатив за 30 хв — замовлення знімається
      env.DB.put(rk, String(rn + 1), { expirationTtl: 600 })]);
    const f = await lpForm(k, { order_id: `go-${env.VENUE || 'varvar'}-${oid}`, amount, description: `${TYPES[kind] === 'ДОСТАВКА' ? 'Доставка' : 'Замовлення з собою'} · ${name}`, result_url: siteLink(`?go&paid=${oid}`), server_url: env.SELF_URL + '/api/lp/go' });
    return [{ ok: true, pay: f.url, id: oid, sum: amount, wait: 1 }, 200];
  }
  const comment = ['З СОБОЮ', when ? `НА ${when}` : '', cut ? `прибори: ${cut}` : '', note].filter(Boolean).join(' · ');
  const go = { kind, name, phone, addr, ent, when, pay, change, cut, note, fee, bonus, st: 'new', oid, at: Date.now(), src: String(b.src || '').slice(0, 20), ...(b._paid ? { paid: b._paid } : {}) };
  const r = await L(env, 'bills', async () => {
    const t = await goAlloc(env, kind), bill = await getBill(env, t);
    const all = fee ? [...lines, `1× 🛵 Доставка — ${fee}`] : lines;
    bill.total = sum + fee; bill.orders = 1; bill.opened = Date.now(); bill.go = go; bill.cli = phone;
    if (bonus) bill.bonus = bonus;
    if (pay !== 'online' || b._paid) { bill.check = true; bill.pay = b._paid ? 'online' : pay === 'card' ? 'card' : 'cash'; }
    bill.log = [{ at: hhmm(), kind: TYPES[kind].toLowerCase(), lines: all, comment, oid }];
    await promoFill(env, bill).catch(() => {}); // 🎁 акції й рівень — рахує сервер (promo.js), після log
    await putBill(env, t, bill); return { t, bill };
  });
  const pr = r.bill.promo?.sum || 0, prL = (r.bill.promo?.lines || []).filter(l => l.amt).map(l => `🎁 ${l.n} −${l.amt}`);
  const { t } = r, pl = { cash: '💵 готівка', card: '💳 картка при отриманні', online: b._paid ? `✅ ОПЛАЧЕНО онлайн ${b._paid.sum} грн` : '💳 онлайн' }[pay];
  const msg = [`${kind === 'del' ? '🛵' : '🥡'} <b>${TYPES[kind]} ${tn(t)}</b>${when ? ` · <b>на ${when}</b>` : ''}`,
    `👤 ${esc(name)} · <a href="tel:+${phone}">${fmtPhone(phone)}</a>`, kind === 'del' ? `📍 ${esc(addr)}${ent ? ` (${esc(ent)})` : ''}` : '',
    '', ...lines.map(esc), fee ? `🛵 Доставка — ${fee}` : '', ...prL.map(esc), `Сума: <b>${sum + fee - bonus - pr} грн</b>${bonus ? ` (−${bonus} бонусами)` : ''}`,
    `Оплата: <b>${pl}</b>${change ? ` · решта з ${change}` : ''}`, cut ? `🍴 Прибори: ${cut}` : '', note ? `💬 ${esc(note)}` : ''].filter(x => x !== '').join('\n');
  await Promise.all([
    env.DB.put('ord:' + oid, JSON.stringify({ s: 'new', g: 'new', t, html: msg, lines, comment, kind: TYPES[kind], sum, sold, go: 1, eta: Date.now() + c.prep * 60e3 }), { expirationTtl: BILL_TTL }),
    logEvent(env, { k: 'guest', t, oid, s: 'new', kind: `${TYPES[kind]}${when ? ' на ' + when : ''}`, lines, comment: [name, fmtPhone(phone), kind === 'del' ? addr : '', pl, change ? `решта з ${change}` : ''].filter(Boolean).join(' · '), sum: sum + fee - bonus - pr, go: kind }),
    addStat(env, 'orders', 1), addDishes(env, sold),
    b._paid ? null : env.DB.put(rk, String(rn + 1), { expirationTtl: 600 }),
    cliTouch(env, phone, x => { x.name = name; if (addr && !x.addr.includes(addr)) x.addr = [addr, ...x.addr].slice(0, 5); x.lastGo = { at: Date.now(), lines: lines.slice(0, 20), items: b.items.slice(0, 40).map(i => ({ id: String(i.id).slice(0, 40), ...(i.v ? { v: String(i.v).slice(0, 20) } : {}), q: Math.min(50, parseInt(i.q, 10) || 1) })) }; }), // 🔁 «Повторити» в боті
  ]);
  const res = await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: [[
    { text: '✅ Прийняв', callback_data: `acc:${t}:${oid}` }, { text: '❌ Відхилити', callback_data: `rej:${t}:${oid}` }]] } }).catch(() => null);
  const mid = res && await res.json().then(j => j.result?.message_id).catch(() => null);
  if (mid) await L(env, 'ord:' + oid, async () => { const o = await env.DB.get('ord:' + oid, 'json'); if (o) await env.DB.put('ord:' + oid, JSON.stringify({ ...o, mid }), { expirationTtl: BILL_TTL }); });
  return [{ ok: true, id: oid, t, no: tn(t), sum: sum + fee - bonus - pr, ...(pr ? { promo: pr } : {}), eta: c.prep }, 200];
}

// 🛵 замовлення з каси/бота (дзвінок): клієнт до першого «Замовити» — новий віртуальний стіл
export async function goFromPos(env, g, who) {
  const kind = g.kind === 'del' ? 'del' : 'pick', phone = normPhone(g.phone), c = await getGoCfg(env);
  const t = await goAlloc(env, kind);
  const go = { kind, name: String(g.name || '').trim().slice(0, 40), phone, addr: String(g.addr || '').trim().slice(0, 200), ent: String(g.ent || '').trim().slice(0, 60), when: /^\d{1,2}:\d{2}$/.test(g.when || '') ? g.when : '', pay: g.pay === 'card' ? 'card' : 'cash', change: Math.max(0, +g.change || 0), cut: 0, note: '', fee: kind === 'del' ? c.fee : 0, st: 'acc', at: Date.now(), src: 'каса', by: who };
  return { t, go };
}
// після першого замовлення з каси — дописати go і рядок доставки
export async function goAttach(env, t, go) {
  return L(env, 'bills', async () => {
    const b = await getBill(env, t); if (!b.total) return null; b.go = go; if (go.phone) b.cli = go.phone;
    if (go.fee && !(b.log || []).some(o => o.lines.some(l => l.includes('🛵 Доставка')))) { b.total += go.fee; b.log.push({ at: hhmm(), kind: 'доставка', lines: [`1× 🛵 Доставка — ${go.fee}`] }); }
    if (go.kind === 'del') b.go.accAt = Date.now();
    await putBill(env, t, b); if (go.kind === 'del') courNotify(env, t, 'new').catch(() => {}); if (go.phone) await cliTouch(env, go.phone, x => { if (go.name) x.name = go.name; if (go.addr && !x.addr.includes(go.addr)) x.addr = [go.addr, ...x.addr].slice(0, 5); });
    return b;
  });
}
// активні доставки (бот)
export async function goList(env, open) {
  return open.filter(r => isGo(r.t) && r.b.go).map(r => ({ t: r.t, ...r.b.go, sum: payable(r.b) }));
}
export function goText(list) {
  if (!list.length) return '🛵 Активних доставок і самовивозів немає.';
  return ['🛵 <b>Доставка і з собою</b>', ...list.map(g => `\n<b>${tn(g.t)}</b> · ${goStLabel(g.st)} · ${g.sum} грн${g.when ? ` · на ${g.when}` : ''}\n👤 ${esc(g.name)} ${fmtPhone(g.phone)}${g.kind === 'del' ? `\n📍 ${esc(g.addr)}` : ''}${g.cour ? `\n🛵 ${esc(g.cour)}` : ''}`)].join('\n');
}
export const goButtons = g => [[...(g.st !== 'road' && g.kind === 'del' ? [{ text: `🛵 ${tn(g.t)} поїхав`, callback_data: `gos:${g.t}:road` }] : []), ...(g.st !== 'ready' && g.st !== 'road' ? [{ text: '🍽 Готово', callback_data: `gos:${g.t}:ready` }] : []), { text: `🤝 ${tn(g.t)} видано`, callback_data: `gos:${g.t}:done` }]];

// 💡 «часто беруть разом» — пари страв із закритих чеків за 30 днів (раз на добу)
export async function reco(env) {
  const day = dayKey(), cached = await env.DB.get('reco', 'json'); if (cached?.day === day) return cached.m;
  const days = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - i * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' }));
  const all = await env.DB.getMany(days.map(d => 'closed:' + d), 'json'), pair = {};
  for (const l of all) for (const c of l || []) { if (c.del) continue; const ns = [...new Set((c.dishes || []).map(d => d[0]).filter(n => !/Доставка|Упаковк/i.test(n)))];
    for (const a of ns) for (const b of ns) if (a !== b) ((pair[a] ||= {})[b] = (pair[a][b] || 0) + 1); }
  const m = {}; for (const [a, o] of Object.entries(pair)) m[a] = Object.entries(o).filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([b]) => b);
  await env.DB.put('reco', JSON.stringify({ day, m })); return m;
}

// публічні дані для сайту: налаштування (без зайвого) і баланс бонусів
export async function goInfo(env, ph) {
  const c = await getGoCfg(env), cli = ph ? await getCli(env, normPhone(ph)) : null;
  return { on: c.on, del: c.del, pick: c.pick, from: c.from, to: c.to, open: isOpen(c), min: c.min, fee: c.fee, free: c.free, prep: c.prep, phone: c.phone, zone: c.zone, cash: c.cash, bmax: c.bmax, onl: c.onl && lpKeys(env) ? 1 : 0, ...(isMem(cli) ? { bal: cli.bal || 0 } : {}) }; // адреси — лише в касі (не світимо за номером)
}

// ---------- 🖥 API каси: go* / cli* ----------
// ✏️ адмін змінює клієнта/адресу → кур'єру сповіщення (каса goEdit і бот)
export async function goEdit(env, t, b, who) {
  const F = { name: 40, addr: 200, ent: 60, when: 5, note: 300 }, ch = [];
  const r = await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x.go) return null;
    for (const k of Object.keys(F)) if (b[k] != null) { let v = String(b[k]).trim().slice(0, F[k]); if (k === 'when' && v && !/^\d{1,2}:\d{2}$/.test(v)) continue; if (v !== (x.go[k] || '')) { x.go[k] = v; ch.push(k === 'addr' ? '📍 ' + v : k === 'name' ? '👤 ' + v : k === 'when' ? '🕐 ' + (v || 'якнайшвидше') : k === 'ent' ? '🚪 ' + v : '💬 ' + v); } }
    if (b.phone != null) { const ph = normPhone(b.phone); if (ph && ph !== x.go.phone) { x.go.phone = ph; x.cli = ph; ch.push('📞 ' + fmtPhone(ph)); } }
    if (ch.length) await putBill(env, t, x); return x.go; });
  if (!r) return { error: 'Немає замовлення' };
  if (ch.length) { await logEvent(env, { k: 'go', t, by: who, s: 'acc', text: `✏️ ${tn(t)} змінено: ${ch.join(' · ')}` }); await courNotify(env, t, 'upd', ch.join(' · ')).catch(() => {}); }
  return { go: r, ch };
}
export async function goApi(b, env, me, t) {
  const who = me.name, admin = me.role === 'admin', ok = (x = {}) => [{ ok: true, ...x }, 200], bad = (e, s = 400) => [{ error: e }, s];
  switch (b.op) {
    case 'goSt': {
      if (!isGo(t)) return bad('Не доставка');
      const bl = await getBill(env, t); if (!bl.go) return bad('Немає замовлення');
      if (me.role === 'courier' && (!['road', 'done'].includes(b.st) || (bl.go.cour && bl.go.cour !== who))) return bad('Це доставка іншого кур\'єра', 403);
      const r = await goSet(env, t, String(b.st), who, { pay: b.pay === 'card' ? 'card' : b.pay === 'cash' ? 'cash' : undefined, ...(me.role === 'courier' && !bl.go.cour ? { cour: who } : {}) });
      if (!r) return bad('Не вдалось');
      await notify(env, `🖥 ${tn(t)} — ${goStLabel(b.st)}${r.done ? ` · ${money0(r.sum)} ${r.card ? '💳' : '💵'}` : ''} — ${esc(who)}`);
      return ok({ go: r });
    }
    case 'goCour': { // кур'єр бере доставку собі (або адмін призначає)
      const name = admin && b.n != null ? String(b.n) : b.take === false ? '' : who;
      const bl = await getBill(env, t); if (!bl.go) return bad('Немає замовлення');
      if (me.role === 'courier' && bl.go.cour && bl.go.cour !== who) return bad('Вже взяв ' + bl.go.cour, 409);
      const r = await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x.go) return null; x.go.cour = name; await putBill(env, t, x); return x.go; });
      if (r) await logEvent(env, { k: 'go', t, by: who, s: 'acc', text: `🛵 ${tn(t)} → кур'єр ${name || '—'}` });
      return ok({ go: r });
    }
    case 'goMap': { // 🗺 маршрут через усі активні доставки (від закладу)
      if (!admin) return bad('admin', 403);
      const s = await getSite(env), geo = Array.isArray(s.geo) ? s.geo.join(',') : '', list = (await openTables(env)).filter(r => isGo(r.t) && r.t < 2000 && r.b.go?.addr && !['new', 'done', 'rej'].includes(r.b.go.st)).sort((a, c) => (a.b.go.roadAt || 9e15) - (c.b.go.roadAt || 9e15) || a.t - c.t);
      if (!list.length) return bad('Немає активних доставок');
      const pts = list.slice(0, 10).map(r => r.b.go.addr + ', Поляниця'), dest = pts.pop(), e = encodeURIComponent;
      return ok({ n: list.length, url: `https://www.google.com/maps/dir/?api=1${geo ? '&origin=' + e(geo) : ''}&destination=${e(dest)}${pts.length ? '&waypoints=' + e(pts.join('|')) : ''}&travelmode=driving` });
    }
    case 'goEdit': { if (!admin) return bad('admin', 403); const r = await goEdit(env, t, b, who); return r.error ? bad(r.error) : ok(r); }
    case 'goCfg': { const k = lpKeys(env); return ok({ cfg: await getGoCfg(env), lp: k ? { on: 1, sandbox: k.sandbox ? 1 : 0 } : null, main: (env.VENUE || 'varvar') === 'varvar' }); }
    case 'goCfgSet': { if (!admin) return bad('admin', 403); const c = await setGoCfg(env, String(b.k), b.v); if (c.error) return bad(c.error); return ok({ cfg: c }); }
    case 'cliGet': { const ph = normPhone(b.phone); if (!ph) return bad('Невірний номер'); const c = await getCli(env, ph); const { botName } = await import('./site.js'); return ok({ phone: ph, cli: c, mem: isMem(c), bot: await botName(env).catch(() => ''), cfg: await getGoCfg(env) }); }
    case 'cliSet': { // 🎁 телефон гостя в залі — щоб нарахувати кешбек при закритті
      const ph = b.phone ? normPhone(b.phone) : null; if (b.phone && !ph) return bad('Невірний номер');
      const r = await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x.total) return null; if (ph) x.cli = ph; else { delete x.cli; if (x.cert?.sum) x.bonus = x.cert.sum; else delete x.bonus; } /* сертифікат лишається */ await putBill(env, t, x); return x; });
      return r ? ok({ cli: ph ? await getCli(env, ph) : null }) : bad('Стіл порожній');
    }
    case 'cliBonus': {
      const c = await getGoCfg(env);
      const r = await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x.total || !x.cli) return { error: 'Спершу вкажіть телефон гостя' };
    const cl = await getCli(env, x.cli); if (!isMem(cl) && +b.sum) return { error: 'Гість не в програмі лояльності — спершу хай підключить бот гостей' }; const sum = Math.max(0, Math.round(+b.sum || 0)), cs = x.cert?.sum || 0, base = Math.max(0, x.total - discAmt(x) - (x.promo?.sum || 0) - cs), max = Math.min(cl?.bal || 0, Math.floor(base * c.bmax / 100)); /* від суми страв після знижки, акцій і сертифіката */
    if (sum > max) return { error: `Можна списати до ${max} грн` }; if (sum + cs) x.bonus = sum + cs; else delete x.bonus; /* bonus = бонуси + сертифікат */ await putBill(env, t, x); return { bonus: sum }; });
      return r.error ? bad(r.error) : ok(r);
    }
  }
  return bad('unknown');
}
const money0 = n => `${Math.round(n || 0)} грн`;

