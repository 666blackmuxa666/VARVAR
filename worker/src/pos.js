// API касової програми (pos.html). POST /api/pos {op, ...} з заголовком Authorization: Bearer <token>.
// Живі оновлення: WebSocket /api/pos/live?token=… (див. store.js). Логіка — спільна з ботом (ops.js).
import { getMenu, saveMenu, addCategory, menuLock } from './menu.js';
import { tn, isGo } from './tn.js';
import { goFromPos, goAttach, goButtons, fmtPhone, goApi } from './delivery.js';
import { siteApi } from './siteapi.js';
import { loyApi, promoFillMany } from './promo.js';
import { bookList } from './site.js';
import { courDay, courBot, courLinkUrl, courAct, courCashGive, courWatch, getLinks, multiRoute, courRep } from './courier.js';
import { queuePrint, printStatus, printList, printClear } from './print.js';
import { QR_PRINT, TEST_JOB } from './bot.js';
import { storeStub } from './store.js';
import { stockApi } from './stock.js';
import { payApi, closeStale, getAtt } from './pay.js';
import { aiInvoice, aiCard } from './ai.js';
import {
  esc, money, hhmm, dayKey, isDay, tablesCount, notify, getBill, openTables, billItems, payable, addWaiterOrder, itemsFromMenu, removeOne, closeTable, payLabel, precheck,
  setDiscount, setTip, moveTable, splitTable, restoreVoid, getVoids, deleteTable, getClosed, closedRec, delClosed, reprintClosed, getExp, addExpense, delExpense, setFloat, cashData, reportsData,
  topData, setHidden, GROUPS, groupOf, getFav, toggleFav, getShift, shiftData, openShift, closeShift, lastZ, dayZData, dayZ, zDayText, MOVE, MOVE_ALL, addMove, kitchenClosed, markCook, kitchenPct, getCfg, setCfg, rejectOrder, getKq, kitchenDone, kitchenStart, kitchenUndo, kitchenMsg, kitchenStats, restoreClosed, reopenClosed, restoreTable, restoreExpense, restoreMove, delZ, restoreZ, editEv, balances, reconcile, delMove, getMov, zText, reportRange, samePass, adminPass, waiterPass, pinHash, tipBalances, payTips, getStaff, regCode, regRole, addStaff, delStaff, editStaff, editClosed, dayX, loggedWaiters, resetAll, acceptOrder, getEvents, logEvent,
} from './ops.js';

const SESSION_TTL = { admin: 12 * 3600, waiter: 30 * 86400, cook: 30 * 86400, courier: 30 * 86400 };
const tokenOf = req => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
async function session(env, token) { return /^[a-f0-9]{32}$/.test(token || '') ? env.DB.get('pos:' + token, 'json') : null; }
const ipKey = ip => ip.includes(':') ? ip.split(':').slice(0, 4).join(':') + '::/64' : ip;
const tgBtns = t => ({ inline_keyboard: [[{ text: `🪑 Стіл ${tn(t)}`, callback_data: 'tbl:' + t }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + t }]] });

export async function posLive(req, env, url) {
  if (!(await session(env, url.searchParams.get('token')))) return new Response('forbidden', { status: 403 });
  return storeStub(env).fetch(req);
}

export async function posApi(b, req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || '';
  if (b.op === 'login') return login(b, env, ip);
  if (b.op === 'register') return register(b, env);
  const token = tokenOf(req), me = await session(env, token);
  if (!me) return [{ error: 'auth' }, 401];
  // видаленого працівника одразу викидає з каси (сесія більше не діє)
  // ✏️ змінили PIN / імʼя / роль (ver) — теж вхід заново
  if (me.sid) { const s = (await getStaff(env)).find(x => x.id === me.sid); if (!s || (s.ver || 0) !== (me.ver || 0)) { await env.DB.delete('pos:' + token); return [{ error: 'auth' }, 401]; } }
  const admin = me.role === 'admin', who = me.name;
  const t = +b.t || 0;
  const needAdmin = () => [{ error: 'admin' }, 403];
  const ok = (x = {}) => [{ ok: true, ...x }, 200];
  // 👨‍🍳 кухар: черга кухні + вибити замовлення + стоп-лист; решта — ні
  // 🧮 Розрахунок: склад, техкарти, накладні, інвентаризація — свої права (адмін / кухар)
  if (/^sk[A-Z]/.test(b.op || '')) return stockApi(b, env, me, { invoice: aiInvoice, card: aiCard });
  if (/^zp[A-Z]/.test(b.op || '')) return payApi(b, env, me); // 👷 зміни й зарплата
  if (me.role === 'cook' && !['logout', 'state', 'menu', 'fav', 'order', 'accept', 'reject', 'stop', 'kitchen', 'kDone', 'kStart', 'kUndo', 'kMsg', 'printTest', 'ideaAdd', 'ideaList', 'ideaDel'].includes(b.op)) return [{ error: 'Кухар — лише черга, замовлення й стоп-лист' }, 403];

  // 🛵 кур'єр: лише свої доставки
  if (me.role === 'courier' && !['logout', 'state', 'goSt', 'goCour', 'zpIn', 'zpOut', 'zpMy', 'ideaAdd', 'ideaList', 'ideaDel', 'courMe', 'courTg', 'courAct'].includes(b.op)) return [{ error: 'Кур\'єр — лише доставки' }, 403];
  if (/^go[A-Z]|^cli[A-Z]/.test(b.op || '')) return goApi(b, env, me, t);
  if (/^idea[A-Z]/.test(b.op || '')) return (await import('./ideas.js')).ideaApi(b, env, me); // 💡 побажання розробнику
  if (/^gb[A-Z]/.test(b.op || '')) return (await import('./guestbot.js')).gbApi(b, env, me); // 🤖 бот гостей
  if (/^loy[A-Z]/.test(b.op || '')) return loyApi(b, env, me, t); // 🎁 лояльність: рівні, акції, клієнти, звіт (promo.js)
  if (/^(bk|site|cert)[A-Z]/.test(b.op || '')) return siteApi(b, env, me, t);
  if (/^cour[A-Z]/.test(b.op || '')) { // 🛵 кур'єр
    if (b.op === 'courMe') return ok({ day: await courDay(env, b.n && admin ? String(b.n) : who), route: await multiRoute(env, who), bot: env.COURIER_BOT_TOKEN ? await courBot(env) : '', linked: !!(await getLinks(env))[who] });
    if (b.op === 'courTg') return ok(await courLinkUrl(env, who));
    if (b.op === 'courAct') { const r = await courAct(env, t, who, String(b.act), b.arg); return r.error ? [{ error: r.error }, 400] : ok(r); }
    if (b.op === 'courList') { if (!admin) return needAdmin(); const st = (await getStaff(env)).filter(s => s.role === 'courier'), links = await getLinks(env); return ok({ list: await Promise.all(st.map(async s => ({ ...(await courDay(env, s.name)), name: s.name, tg: !!links[s.name] }))), bot: env.COURIER_BOT_TOKEN ? await courBot(env) : '' }); }
    if (b.op === 'courRep') { if (!admin) return needAdmin(); return ok(await courRep(env, String(b.m || ''))); }
    if (b.op === 'courCash') { if (!admin) return needAdmin(); const r = await courCashGive(env, String(b.n), +b.sum, who); await logEvent(env, { k: 'shift', by: who, text: `💵 Отримано від кур'єра ${b.n}: ${+b.sum} ₴` }); return ok({ r }); }
  }

  if (['move', 'split'].includes(b.op) && !(+b.to >= 1 && +b.to <= tablesCount(env))) return [{ error: 'Переносити можна лише на стіл залу' }, 400]; // не на 1005 / 99999
  switch (b.op) {
    case 'logout': await env.DB.delete('pos:' + token); return ok();
    case 'state': {
      if (me.role === 'cook') await markCook(env, me.name); // кухар на зміні — отримує частку чайових кухні
      await closeStale(env).catch(() => {});
      if (!(await env.DB.get('cw'))) { await env.DB.put('cw', '1', { expirationTtl: 60 }); await courWatch(env).catch(() => {}); } // 🛵 ніхто не взяв — не частіше раз на хвилину
      { const sk = 'seen:' + dayKey().slice(0, 7), sn = (await env.DB.get(sk, 'json')) || []; if (!sn.includes(me.name)) { sn.push(me.name); await env.DB.put(sk, JSON.stringify(sn), { expirationTtl: 400 * 86400 }); } } // хто працював у касі цього місяця — у графіку
      const myAtt = (await getAtt(env))[dayKey()]?.[me.name] || null;
      let [rows, events, pr, shift, cl] = await Promise.all([openTables(env), getEvents(env), printStatus(env), getShift(env), getClosed(env)]);
      { const old = events.filter(e => e.k === 'call' && e.s === 'new' && Date.now() - e.ts > 20 * 60e3); // 🔔 ніхто не підтвердив 20 хв — автоматично
        if (old.length) { for (const e of old) await acceptOrder(env, e.oid, '⏱ авто').catch(() => {}); events = await getEvents(env); } }
      const mine = cl.filter(x => !x.del && !x.rm);
      const myTip = { sum: (await tipBalances(env))[me.name] || 0, today: mine.reduce((a, x) => a + ((x.tipSplit || {})[me.name] || (!x.tipSplit && x.by === me.name ? x.tip || 0 : 0)), 0) }; // накопичені, ще не видані
      const bl = me.role === 'courier' ? [] : await bookList(env, dayKey(), undefined), bkNew = (await bookList(env, dayKey(), new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10))).filter(x => x.st === 'new').length; // 🔔 нові броні на будь-яку дату — лічильник у меню
      const books = bl.filter(x => x.date === dayKey() && ['new', 'ok'].includes(x.st)).map(x => ({ id: x.id, time: x.time, name: x.name, people: x.people, t: x.t || 0, st: x.st, pre: (x.pre || []).length }));
      await promoFillMany(env, rows.map(r => r.b)); // 🎁 акції/рівень — для показу суми на столі
      return ok({ me, shift, myTip, myAtt, books, bkNew: me.role === 'courier' ? 0 : bkNew, gInN: ['courier', 'cook'].includes(me.role) ? 0 : await (await import('./guestbot.js')).inOpenN(env), cfg: await getCfg(env), n: tablesCount(env), tables: rows.map(r => ({ t: r.t, ...r.b, items: billItems(r.b), pay2: payable(r.b) })), events: events.slice(-120), printer: pr, now: Date.now() });
    }
    case 'menu': { const menu = await getMenu(env); return ok({ menu, fav: await getFav(env), groups: GROUPS.map(g => ({ ...g, cats: menu.categories.filter(c => groupOf(c.id) === g.id).map(c => c.id) })) }); }
    case 'fav': { const fav = await toggleFav(env, String(b.id), !!b.on); return ok({ fav }); }

    // ---- столи ----
    case 'order': {
      const items = await itemsFromMenu(env, b.items);
      const comment = String(b.comment || '').trim().slice(0, 200);
      let T = t, go = null;
      if (!T && b.go) ({ t: T, go } = await goFromPos(env, b.go, who)); // ☎️ нова доставка/самовивіз з каси
      if (!T || (T > tablesCount(env) && !isGo(T))) return [{ error: 'table' }, 400];
      const r = await addWaiterOrder(env, { table: T, items }, who, [go ? 'З СОБОЮ' : '', go?.when ? 'НА ' + go.when : '', comment].filter(Boolean).join(' · '), 'каса', !!b.urgent);
      if (r && go) { await goAttach(env, T, go); r.t = T; }
      if (r && go) { await notify(env, `☎️ ${go.kind === 'del' ? '🛵 ДОСТАВКА' : '🥡 САМОВИВІЗ'} <b>${tn(T)}</b> з каси (${esc(who)})\n👤 ${esc(go.name)} ${fmtPhone(go.phone)}${go.addr ? `\n📍 ${esc(go.addr)}` : ''}\n${r.lines.map(esc).join('\n')}\nСума: <b>${money(r.total)}</b>`, { inline_keyboard: goButtons({ ...go, t: T }) }); return ok(r); }
      if (!r) return [{ error: 'empty' }, 400];
      await notify(env, `🖥 <b>Стіл ${tn(t)}</b> — ${r.prev?.length ? '<b>➕ ДОЗАМОВЛЕННЯ</b>' : 'замовлення'} з каси (${esc(who)})\n${r.lines.map(esc).join('\n')}${comment ? `\n💬 ${esc(comment)}` : ''}\nСума: <b>${money(r.sum)}</b> · разом за стіл: <b>${money(r.total)}</b>`, tgBtns(t));
      return ok(r);
    }
    case 'remove': { const r = await removeOne(env, t, String(b.name), who, b.reason); if (r?.error) return [{ error: r.error }, 400]; if (r) await notify(env, `🖥 ✏️ Стіл ${tn(t)}: скасовано 1× ${esc(r.name)} (−${r.unit} грн)\n❓ Причина: <i>${esc(r.reason)}</i> — ${esc(who)}`); return ok({ r }); }
    case 'precheck': return ok({ done: await precheck(env, t, who) });
    case 'close': {
      const r = await closeTable(env, t, who, b.pay === 'card' ? 'card' : 'cash', b.print !== false);
      if (r) await notify(env, `🖥 ✅ <b>Стіл ${tn(t)} закрито</b> — ${money(r.sum)}${r.disc ? ` (знижка ${money(r.disc)})` : ''} · ${payLabel(r.cash, r.card)}${b.print === false ? ' · без чека' : ''} — ${esc(who)}`);
      return ok({ r });
    }
    case 'discount': { const r = await setDiscount(env, t, b.pct, who, admin); if (r?.error) return [{ error: r.error }, 400]; if (r) await notify(env, `🖥 % Стіл ${tn(t)}: ${r.disc ? `знижка ${r.disc}% — до сплати ${money(payable(r))}` : 'знижку прибрано'} — ${esc(who)}`); return ok(); }
    case 'tip': { if (+b.sum || !admin) return [{ error: 'Чайові додає лише гість. Прибрати може адміністратор.' }, 403]; const r = await setTip(env, t, b.sum, who); if (r) await notify(env, `🖥 💝 Стіл ${tn(t)}: ${r.tip ? `чайові ${money(r.tip)}` : 'чайові прибрано'} — ${esc(who)}`); return ok(); }
    case 'split': { const r = await splitTable(env, t, b.items, +b.to, who); if (!r) return [{ error: 'Нічого не перенесено' }, 400]; await notify(env, `🖥 ✂️ Стіл ${tn(t)} розділено → <b>стіл ${tn(r.to)}</b> (${money(r.sum)}): ${esc(r.lines.join(', '))} — ${esc(who)}`, tgBtns(r.to)); return ok({ r }); }
    case 'move': { const r = await moveTable(env, t, +b.to, who); if (r) await notify(env, `🖥 ${r.merged ? `🔗 Стіл ${tn(t)} об'єднано зі столом ${tn(b.to)}` : `↔️ Стіл ${tn(t)} перенесено на стіл ${tn(b.to)}`} — ${esc(who)}`, tgBtns(+b.to)); return ok({ r }); }
    case 'accept': return ok({ done: await acceptOrder(env, String(b.oid), who) });
    case 'reject': { const o = await rejectOrder(env, String(b.oid), who); return o ? ok() : [{ error: 'Вже прийнято або відхилено' }, 400]; }
    case 'delete': {
      if (!admin) return needAdmin();
      const r = await deleteTable(env, t, who, b.reason); if (r) await notify(env, `🖥 🗑 <b>Стіл ${tn(t)} видалено</b> (${money(r.sum)}) — у виручку не піде · ${esc(who)}`);
      return ok({ r });
    }

    // ---- 👨‍🍳 кухня ----
    case 'kitchen': {
      const open = new Set((await openTables(env)).map(r => r.t)), stale = [...new Set((await getKq(env)).filter(e => !e.done && !open.has(e.t)).map(e => e.t))];
      if (stale.length) await kitchenClosed(env, stale); // стіл уже закритий, а картка висить
      const l = await getKq(env); return ok({ list: l.filter(e => !e.done).concat(l.filter(e => e.done && !e.cancelled && !e.closed).slice(-10)) }); }
    case 'kDone': return ok({ e: await kitchenDone(env, String(b.id), b.i == null ? null : +b.i, who) });
    case 'kStart': return ok({ e: await kitchenStart(env, String(b.id), who) });
    case 'kUndo': return ok({ e: await kitchenUndo(env, String(b.id)) });
    case 'kMsg': { const e = await kitchenMsg(env, String(b.id), b.text, who); return e ? ok() : [{ error: 'Порожнє повідомлення' }, 400]; }
    case 'kStats': { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.from)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.to))) return [{ error: 'Невірний період' }, 400]; return ok({ list: await kitchenStats(env, String(b.from), String(b.to)) }); }

    // ---- стоп-лист і принтер (усім) ----
    case 'stop': { const it = await setHidden(env, String(b.id), !!b.hidden); if (it) await logEvent(env, { k: 'shift', by: who, text: `${b.hidden ? '⛔' : '✅'} ${it.name.uk} — ${b.hidden ? 'у стоп-листі' : 'знову в меню'}` }); if (it) await notify(env, `🖥 ${b.hidden ? '⛔' : '✅'} <b>${esc(it.name.uk)}</b> ${b.hidden ? 'у стоп-листі' : 'знову в меню'} — ${esc(who)}`); return ok(); }
    case 'printTest': await queuePrint(env, 'test', TEST_JOB()); return ok();
    case 'printQ': return ok({ list: await printList(env) });
    case 'printClear': { if (!admin) return needAdmin(); const r = await printClear(env, b.id ? String(b.id) : ''); if (r.n) await notify(env, `🖥 🗑 Черга друку: ${b.id ? 'видалено 1 завдання' : `очищено (${r.n})`} — ${esc(who)}`).catch(() => {}); return ok(r); }
    case 'printQr': await queuePrint(env, 'qr', QR_PRINT(+b.t || 0)); return ok();

    // ---- закриті ----
    case 'closed': { const day = isDay(b.day) && b.day <= dayKey() ? b.day : dayKey(); return ok({ day, today: dayKey(), list: await getClosed(env, day), voids: (await getVoids(env, day)).filter(v => !v.table) }); }
    case 'voidBack': { if (!admin) return needAdmin(); const v = await restoreVoid(env, +b.ts, who); if (!v) return [{ error: 'Вже повернуто' }, 400]; await notify(env, `🖥 ↩️ <b>Стіл ${tn(v.t)}</b>: повернуто скасоване ${esc(v.name)} (${money(v.sum)}) — ${esc(who)}`, tgBtns(v.t)); return ok({ v }); }
    case 'closedPrint': return ok({ done: await reprintClosed(env, String(b.ref), who, isDay(b.day) ? b.day : undefined) });
    case 'closedBack': { if (!admin) return needAdmin(); const x = await restoreClosed(env, String(b.ref), who, b.day); if (x) await notify(env, `🖥 ↩️ Рахунок стола ${tn(x.t)} (${money(x.sum)}, ${x.at}) повернуто у виручку — ${esc(who)}`); return ok({ x }); }
    case 'closedReopen': { if (!admin) return needAdmin(); const x = await reopenClosed(env, String(b.ref), who, b.day); if (x) await notify(env, `🖥 ↩️ <b>Стіл ${tn(x.t)}</b>: закритий рахунок (${money(x.sum)}, ${x.at}) відкрито знову — ${esc(who)}`, tgBtns(x.t)); return ok({ x }); }
    case 'tableBack': { if (!admin) return needAdmin(); const x = await restoreTable(env, String(b.ref), who, b.day); if (x) await notify(env, `🖥 ↩️ <b>Стіл ${tn(x.t)}</b> відновлено (${money(x.sum)}) — ${esc(who)}`, tgBtns(x.t)); return ok({ x }); }
    case 'closedEdit': { if (!admin) return needAdmin(); const r = await editClosed(env, String(b.ref), b.p, who, b.day); if (r.error) return [{ error: r.error }, 400];
      if (r.what.length) await notify(env, `🖥 ✏️ <b>Чек стола ${tn(r.x.t)}</b> (${r.x.at}${isDay(b.day) && b.day !== dayKey() ? ', ' + b.day : ''}) змінено: ${esc(r.what.join(', '))}\nБуло ${money(r.was)} → <b>${money(r.x.sum)}</b> · ${payLabel(r.x.cash, r.x.card)} — ${esc(who)}`); return ok({ x: r.x, what: r.what }); }
    case 'closedDel': { if (!admin) return needAdmin(); const x = await delClosed(env, String(b.ref), b.day); if (x) await notify(env, `🖥 🧹 Закритий рахунок стола ${tn(x.t)} (${money(x.sum)}, ${x.at}) видалено з виручки — ${esc(who)}`); return ok({ x }); }
  }

  // ---- далі лише адміністратор ----
  if (!admin) return needAdmin();
  switch (b.op) {
    case 'shift': { const day = await cashData(env); return ok({ tipbal: await tipBalances(env), tippay: (await env.DB.get('tippay:' + day.day, 'json')) || [], z: await dayZData(env), day, exp: day.exp, mov: day.mov, last: await lastZ(env), bal: await balances(env), closed: await getClosed(env) }); }
    case 'zX': { const z = await dayX(env, who); await notify(env, `🖥 🖨 X-звіт надруковано (день не закрито): виручка ${money(z.total)} · чеків ${z.checks} — ${esc(who)}`); return ok({ z }); }
    case 'zDay': { const z = await dayZ(env, who, b.print !== false); await notify(env, `🖥 ${zDayText(z)}\n— ${esc(who)}`); return ok({ z }); }
    case 'tipPay': { const s = await payTips(env, String(b.name), who, b.src); if (!s) return [{ error: 'Нема що видавати' }, 400]; await notify(env, `🖥 💝 Видано чайові: <b>${esc(b.name)}</b> — ${money(s)} ${b.src === 'card' ? '💳 з картки' : '💵 готівкою'} · ${esc(who)}`); return ok({ sum: s }); }
    case 'cashMove': { const e = await addMove(env, { type: b.type, sum: +b.sum, note: b.note, by: who }); if (!e) return [{ error: 'Потрібна сума' }, 400]; await notify(env, `🖥 ${MOVE_ALL[e.type]}: <b>${money(e.sum)}</b>${e.note ? ` — ${esc(e.note)}` : ''} · ${esc(who)}`); return ok(); }
    case 'reconcile': { const r = await reconcile(env, b.src === 'card' ? 'card' : 'cash', b.actual, who); if (!r) return [{ error: 'Потрібна сума' }, 400]; if (r.diff) await notify(env, `🖥 ✏️ Звірка ${b.src === 'card' ? '💳 картки' : '💵 готівки'}: було ${money(r.was)}, факт <b>${money(r.actual)}</b> (${r.diff > 0 ? '+' : ''}${money(r.diff)}) · ${esc(who)}`); return ok(r); }
    case 'moveDel': await delMove(env, +b.i, b.day); return ok();
    case 'moveBack': await restoreMove(env, +b.i, b.day); return ok();
    case 'expenseBack': await restoreExpense(env, +b.i, b.day); return ok();
    case 'zDel': await delZ(env, +b.i, b.day); return ok();
    case 'zBack': await restoreZ(env, +b.i, b.day); return ok();
    case 'shiftOpen': { const r = await openShift(env, b.float, who); if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 🔓 <b>Касу відкрито</b> — на початок ${money(r.s.float)} · ${esc(who)}`); return ok(); }
    case 'shiftClose': { const r = await closeShift(env, b.counted, who, b.print !== false); if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 ${zText(r.z)}
— ${esc(who)}`); return ok({ z: r.z }); }
    case 'report': { const r = await reportRange(env, String(b.from), String(b.to)); if (!r) return [{ error: 'Невірний період' }, 400]; return ok(r); }
    case 'reports': return ok({ ...(await reportsData(env)), cash: await cashData(env), top: await topData(env) });
    case 'float': await setFloat(env, +b.sum || 0); return ok();
    case 'expense': {
      const sum = Math.round(+b.sum || 0); if (!sum) return [{ error: 'sum' }, 400];
      const e = { sum, note: String(b.note || '').slice(0, 100), src: b.src === 'card' ? 'card' : 'cash', at: hhmm(), by: who };
      await addExpense(env, e); await notify(env, `🖥 💸 Витрата ${money(sum)} ${e.src === 'card' ? '💳 з карти' : '💵 з каси'}${e.note ? ` — ${esc(e.note)}` : ''} · ${esc(who)}`); return ok();
    }
    case 'expenseDel': await delExpense(env, +b.i, b.day); return ok();
    case 'reset': return ok({ n: await resetAll(env) });
    case 'evDrop': { const t = String(b.match || ''); if (t.length < 3) return [{ error: 'Мінімум 3 символи' }, 400]; let n = 0; await editEv(env, l => { const k = l.filter(e => !JSON.stringify(e).includes(t)); n = l.length - k.length; l.length = 0; l.push(...k); }); return ok({ n }); }

    // меню (🔒 по одному — див. menuLock)
    case 'menuSave': case 'catAdd': case 'menuDel': case 'menuUndo': case 'menuPhoto': return menuLock(env, () => menuOp(b, env, who));
    default: return adminRest(b, env, who, ip, ok);
  }
}

async function menuOp(b, env, who) {
  const ok = (x = {}) => [{ ok: true, ...x }, 200];
  switch (b.op) {
    case 'menuSave': return menuSave(env, b.item, who);
    case 'catAdd': { const r = await addCategory(env, b.name); if (!r || r.error) return [{ error: r?.error || 'Потрібна назва' }, 400]; await notify(env, `🖥 📂 Меню: новий розділ <b>${esc(r.c.name.uk)}</b> — ${esc(who)}`); return ok({ id: r.c.id }); }
    case 'menuDel': {
      const menu = await getMenu(env); let name = '';
      menu.categories.forEach(c => { const i = c.items.findIndex(x => x.id === b.id); if (i >= 0) { name = c.items[i].name.uk; c.items.splice(i, 1); } });
      if (!name) return [{ error: 'not_found' }, 404];
      await saveMenu(env, menu); await notify(env, `🖥 🗑 Меню: видалено <b>${esc(name)}</b> — ${esc(who)}`); return ok();
    }
    case 'menuUndo': {
      const prev = await env.DB.get('menu_prev'); if (!prev) return [{ error: 'nothing' }, 400];
      await env.DB.put('menu', prev); await env.DB.delete('menu_prev'); await notify(env, `🖥 ↩️ Меню: останню зміну скасовано — ${esc(who)}`); return ok();
    }
    case 'menuPhoto': {
      const m = String(b.data || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); if (!m) return [{ error: 'image' }, 400];
      const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)); if (bytes.length > 3e6) return [{ error: 'too_big' }, 400];
      const menu = await getMenu(env); const it = menu.categories.flatMap(c => c.items).find(x => x.id === b.id); if (!it) return [{ error: 'not_found' }, 404];
      await env.DB.put('img:' + it.id, bytes.buffer);
      it.img = `${env.SELF_URL}/img/${it.id}?v=${Date.now().toString(36)}`;
      await saveMenu(env, menu); await notify(env, `🖥 📷 Меню: нове фото для <b>${esc(it.name.uk)}</b> — ${esc(who)}`); return ok();
    }
  }
}

async function adminRest(b, env, who, ip, ok) {
  switch (b.op) {

    // Wi‑Fi
    case 'wifi': return ok({ list: (await env.DB.get('venue_ips', 'json')) || [], current: ipKey(ip) });
    case 'wifiAdd': {
      const k = ipKey(ip); const list = [{ k, at: Date.now() }, ...((await env.DB.get('venue_ips', 'json')) || []).filter(x => x.k !== k)].slice(0, 20);
      await env.DB.put('venue_ips', JSON.stringify(list)); await notify(env, `🖥 📶 Додано мережу закладу ${k} — ${esc(who)}`); return ok({ list });
    }
    case 'wifiClear': await env.DB.put('venue_ips', '[]'); await notify(env, `🖥 📶 Усі мережі закладу скинуто — ${esc(who)}`); return ok();

    // персонал і паролі
    case 'staff': return ok({ staff: (await getStaff(env)).map(({ pin, ...s }) => s), waiters: await loggedWaiters(env), reg: { admin: await regCode(env, 'admin'), waiter: await regCode(env, 'waiter'), cook: await regCode(env, 'cook'), courier: await regCode(env, 'courier') }, kpct: await kitchenPct(env), cfg: await getCfg(env), cooks: (await env.DB.get('cooks:' + dayKey(), 'json')) || [] });
    case 'regCode': { const c = String(b.code || '').trim(); if (!/^\d{4}$/.test(c)) return [{ error: 'Код — 4 цифри' }, 400]; await env.DB.put('reg_' + (['admin', 'cook', 'courier'].includes(b.role) ? b.role : 'waiter'), c); return ok(); }
    case 'staffAdd': { const r = await addStaff(env, b.name, b.pin, b.role); if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 👥 Додано працівника <b>${esc(r.s.name)}</b> (${ROLE_UA[r.s.role]}) — ${esc(who)}`); return ok(); }
    case 'cfgSet': { const c = await setCfg(env, String(b.k), b.v); if (c.error) return [{ error: c.error }, 400]; await notify(env, `🖥 ⚙️ Налаштування: ${esc(String(b.k))} = <b>${c[b.k]}</b> — ${esc(who)}`); return ok({ cfg: c }); }
    case 'kitchenPct': { const v = Math.round(+b.pct); if (!(v >= 0 && v <= 100)) return [{ error: 'Від 0 до 100' }, 400]; await env.DB.put('kitchen_pct', String(v)); await notify(env, `🖥 👨‍🍳 Частка кухні від чайових: <b>${v}%</b> — ${esc(who)}`); return ok(); }
    case 'staffDel': await delStaff(env, String(b.id)); return ok();
    case 'staffEdit': { const f = {}; for (const k of ['name', 'pin', 'role']) if (b[k] != null && b[k] !== '') f[k] = b[k];
      const r = await editStaff(env, String(b.id), f); if (r.error) return [{ error: r.error }, 400];
      await notify(env, `🖥 👥 Працівник <b>${esc(r.old)}</b>: ${[f.name != null && r.old !== r.s.name ? `імʼя → <b>${esc(r.s.name)}</b>` : '', f.pin != null ? 'новий PIN' : '', f.role != null ? `роль → ${ROLE_UA[r.s.role]}` : ''].filter(Boolean).join(', ')} — ${esc(who)}`);
      return ok({ s: { id: r.s.id, name: r.s.name, role: r.s.role }, moved: r.moved || 0 }); }
    case 'waiterOut': await env.DB.delete('wlog:' + b.uid); await env.DB.delete('adm:' + b.uid); return ok();
  }
  return [{ error: 'unknown_op' }, 400];
}

// реєстрація працівника: код (1119 адмін / 1112 офіціант) + імʼя + свій PIN → одразу вхід
const ROLE_UA = { admin: 'адміністратор', cook: 'кухар', courier: 'кур\'єр', waiter: 'офіціант' };
async function register(b, env) {
  const role = await regRole(env, b.code); if (!role) return [{ error: 'Невірний код реєстрації' }, 401];
  const r = await addStaff(env, b.name, b.pin, role); if (r.error) return [{ error: r.error }, 400];
  await notify(env, `👥 Новий працівник: <b>${esc(r.s.name)}</b> (${ROLE_UA[role]}) — зареєструвався в касі`);
  const me = { name: r.s.name, role, sid: r.s.id };
  const token = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.DB.put('pos:' + token, JSON.stringify({ ...me, at: Date.now() }), { expirationTtl: SESSION_TTL[role] });
  return [{ ok: true, token, me }, 200];
}
async function login(b, env, ip) {
  let me = null;
  if (b.pin) {
    const role = await regRole(env, b.pin); if (role) return [{ ok: true, register: role }, 200]; // код реєстрації → форма «імʼя + свій PIN»
    const h = await pinHash(String(b.pin)); const s = (await getStaff(env)).find(x => x.pin === h); if (s) me = { name: s.name, role: s.role, sid: s.id, ver: s.ver || 0 };
  }
  if (!me) return [{ error: 'Невірний PIN' }, 401];
  const token = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.DB.put('pos:' + token, JSON.stringify({ ...me, at: Date.now() }), { expirationTtl: SESSION_TTL[me.role] });
  return [{ ok: true, token, me }, 200];
}

// створення/редагування страви з форми POS
async function menuSave(env, x, who) {
  if (!x || !String(x.name || '').trim()) return [{ error: 'Потрібна назва' }, 400];
  const menu = await getMenu(env);
  const cat = menu.categories.find(c => c.id === x.cat); if (!cat) return [{ error: 'Оберіть розділ' }, 400];
  let it = x.id && menu.categories.flatMap(c => c.items).find(i => i.id === x.id);
  const isNew = !it;
  if (isNew) {
    let id = String(x.name).toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/gi, '-').replace(/^-|-$/g, '').slice(0, 24) || 'item';
    id = 'p-' + id.replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36).slice(-4);
    it = { id, name: { uk: '', en: '' } }; cat.items.push(it);
  } else if (!cat.items.includes(it)) { // перенос у інший розділ
    menu.categories.forEach(c => { c.items = c.items.filter(i => i !== it); }); cat.items.push(it);
  }
  const name = String(x.name).trim().slice(0, 60);
  it.name = { uk: name, en: (x.nameEn || '').trim() || (it.name.en && it.name.en !== it.name.uk ? it.name.en : name) };
  it.size = String(x.size || '').trim().slice(0, 30);
  const desc = String(x.desc || '').trim().slice(0, 300);
  if (desc) it.desc = { uk: desc, en: it.desc?.en && it.desc.en !== it.desc.uk ? it.desc.en : desc }; else delete it.desc;
  if (Array.isArray(x.variants) && x.variants.length) { it.variants = x.variants.filter(v => v.v && +v.p > 0).map(v => ({ v: String(v.v), p: Math.round(+v.p) })); delete it.price; }
  else { const p = Math.round(+x.price || 0); if (!p) return [{ error: 'Потрібна ціна' }, 400]; it.price = p; delete it.variants; }
  await saveMenu(env, menu);
  await notify(env, `🖥 ${isNew ? '➕ Меню: додано' : '✏️ Меню: оновлено'} <b>${esc(name)}</b> — ${it.variants ? it.variants.map(v => `${v.v} ${v.p}`).join(' / ') : it.price + ' грн'} · ${esc(who)}`);
  return [{ ok: true, id: it.id }, 200];
}
