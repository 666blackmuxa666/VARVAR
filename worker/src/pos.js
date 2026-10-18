// API касової програми (pos.html). POST /api/pos {op, ...} з заголовком Authorization: Bearer <token>.
// Живі оновлення: WebSocket /api/pos/live?token=… (див. store.js). Логіка — спільна з ботом (ops.js).
import { getMenu, saveMenu, addCategory, menuLock, importMenu } from './menu.js';
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
import { acctExport } from './acct.js';
import { taxView, taxSet, taxDone } from './tax.js';
import { setPerm } from './ops.js';
import { PERMS, SENSITIVE, permOf, can, canList, discLimit } from './perm.js';
import { payApi, closeStale, getAtt } from './pay.js';
import { aiInvoice, aiCard, aiDups } from './ai.js';
import {
  esc, money, hhmm, dayKey, isDay, tablesCount, notify, getBill, openTables, billItems, payable, addWaiterOrder, itemsFromMenu, removeOne, closeTable, payLabel, precheck,
  setDiscount, setTip, moveTable, splitTable, restoreVoid, getVoids, deleteTable, getClosed, closedRec, delClosed, reprintClosed, getExp, addExpense, delExpense, setFloat, cashData, reportsData,
  getStations, setStations, setItemStation, kqView, pinFind, pinUpgrade, topData, setHidden, GROUPS, groupOf, getFav, toggleFav, getShift, shiftData, openShift, closeShift, lastZ, dayZData, dayZ, zDayText, MOVE, MOVE_ALL, addMove, kitchenClosed, markCook, kitchenPct, getCfg, setCfg, setHalls, setMap, hallsOf, rejectOrder, getKq, kitchenDone, kitchenStart, kitchenUndo, kitchenMsg, kitchenStats, restoreClosed, reopenClosed, restoreTable, restoreExpense, restoreMove, delZ, restoreZ, editEv, balances, reconcile, delMove, getMov, zText, reportRange, samePass, adminPass, waiterPass, pinHash, tipBalances, payTips, getStaff, regCode, regRole, addStaff, delStaff, editStaff, editClosed, dayX, loggedWaiters, resetAll, acceptOrder, getEvents, logEvent,
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
  if (b.op === 'register') return register(b, env, ip);
  const token = tokenOf(req); let me = await session(env, token);
  if (!me) return [{ error: 'auth' }, 401];
  // видаленого працівника одразу викидає з каси (сесія більше не діє)
  // ✏️ змінили PIN / імʼя / роль (ver) — теж вхід заново
  if (me.sid) { const s = (await getStaff(env)).find(x => x.id === me.sid); if (!s || (s.ver || 0) !== (me.ver || 0)) { await env.DB.delete('pos:' + token); return [{ error: 'auth' }, 401]; } me.av = s.av || ''; me.perm = s.perm || {}; } // 👤 аватарка — свіжа з профілю
  let admin = me.role === 'admin'; const who = me.name;
  // 🔑 права з галочками: адміну право можна зняти, іншій ролі — видати (на цей запит працівник діє як адмін; staff.perm — відхилення від шаблону ролі)
  delete b._elev; // службове: позначка «права видані галочкою» ставиться лише тут
  { const pk = permOf(b.op);
    if (pk && !can(me, pk)) { if (admin) return [{ error: 'admin', perm: pk }, 403]; }
    else if (pk && !admin) { if (b.op === 'staffPerm') return [{ error: 'admin' }, 403]; me = { ...me, role: 'admin', real: me.role, elev: 1 }; admin = true; b._elev = 1;
      if (b.op === 'regCode' && b.role === 'admin') return [{ error: 'Код реєстрації адміністратора задає лише адміністратор' }, 403];
      if (/^staff(Add|Edit|Del)$/.test(b.op) && (b.role === 'admin' || (await getStaff(env)).some(x => x.id === String(b.id) && x.role === 'admin'))) return [{ error: 'Адміністраторів змінює лише адміністратор' }, 403]; } }
  const t = +b.t || 0;
  const needAdmin = () => [{ error: 'admin' }, 403];
  // ⛔ підписку ATOM не оплачено (5+ днів) — каса лише для перегляду: нові замовлення й чеки — ні
  if (/^(order|close|accept|split|move|discount|precheck|goNew|goSt|tpayOk|tip|tipPay|cashMove|closedEdit|closedReopen|voidBack|tableBack|expense|shiftOpen|menuSave|menuDel|catAdd|menuImport)$/.test(b.op || '') && env.VENUE !== 'varvar') { const lk = await env.DB.get('cfg:lock', 'json'); if (lk) return [{ error: lk.why === 'off' ? '⛔ Заклад вимкнено платформою ATOM — каса в режимі перегляду' : '⛔ Підписку ATOM не оплачено — каса в режимі перегляду. Оплатіть у кабінеті власника (💳 Оплата)' }, 402]; }
  // 📱 демо-каса ATOM (сайт продажу): усе можна спробувати, крім платного ШІ, Telegram, друку, персоналу й кодів
  if (env.VENUE === 'atom-demo' && /Гість демо/.test(me.name || '') && /^(help|aiBench|photo[A-Z]|menuPhoto|menuImport|skInvParse|skCardAi|skDups|print|rcpt|closedPrint|precheck|qrNew|regCode|staff[A-Z]|wifi|courTg|reset|lookVSet|dzSet|site[A-Z]*Ai|aiSite|gbSend|chat|menuSave|menuDel|menuUndo|catAdd|catSet|cfgSet|closedRefund|tpayRefund|closedDel|zDel|bak|go[A-Z]*Cfg|goCfgSet|siteSet|siteDesign|menuDesign)/.test(b.op || '')) return [{ error: '🔒 У демо це вимкнено — підключіть свій заклад' }, 403];
  const ok = (x = {}) => [{ ok: true, ...x }, 200];
  if (/^push[A-Z]/.test(b.op || '')) return (await import('./push.js')).pushApi(b, env, me); // 🔔 сповіщення в шторку — кожному працівнику
  // 👨‍🍳 кухар: черга кухні + вибити замовлення + стоп-лист; решта — ні
  // 🧮 Розрахунок: склад, техкарти, накладні, інвентаризація — свої права (адмін / кухар)
  if (/^sk[A-Z]/.test(b.op || '')) return stockApi(b, env, me, { invoice: aiInvoice, card: aiCard, dups: aiDups });
  if (/^zp[A-Z]/.test(b.op || '')) return payApi(b, env, me); // 👷 зміни й зарплата
  if (me.role === 'cook' && !['logout', 'state', 'zpMy', 'zpIn', 'zpOut', 'zpSwap', 'zpSwapStep', 'zpPeople', 'avatar', 'menu', 'fav', 'order', 'accept', 'reject', 'stop', 'kitchen', 'kDone', 'kStart', 'kUndo', 'kMsg', 'evCom', 'chatSay', 'jsErr', 'evComDel', 'evRx', 'evSeen', 'evVoice', 'evVoiceGet', 'evNames', 'printTest', 'tabJobs', 'tabAck', 'ideaAdd', 'ideaList', 'ideaDel', 'ideaThr', 'ideaSay', 'ideaSeen', 'help', 'taskList', 'taskMark', 'taskPh', 'lookV'].includes(b.op)) return [{ error: 'Кухар — лише черга, замовлення й стоп-лист' }, 403];

  // 🛵 кур'єр: лише свої доставки
  if (me.role === 'courier' && !['logout', 'state', 'avatar', 'goSt', 'goCour', 'zpIn', 'zpOut', 'zpMy', 'ideaAdd', 'ideaList', 'ideaDel', 'ideaThr', 'ideaSay', 'ideaSeen', 'help', 'courMe', 'courTg', 'courAct', 'taskList', 'taskMark', 'taskPh', 'lookV'].includes(b.op)) return [{ error: 'Кур\'єр — лише доставки' }, 403];
  if (/^go[A-Z]|^cli[A-Z]/.test(b.op || '')) return goApi(b, env, me, t);
  if (b.op === 'help') { // 💬 Допомога: з каси будь-якого закладу → власнику платформи в Telegram (група VARVAR)
    const text = String(b.text || '').trim().slice(0, 1500); if (text.length < 3) return [{ error: 'Опишіть проблему' }, 400];
    const site = await (await import('./site.js')).getSite(env), tok = env.PLATFORM_BOT || env.BOT_TOKEN, chat = env.PLATFORM_CHAT || env.CHAT_ID;
    await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, parse_mode: 'HTML', text: `🆘 <b>Допомога</b> · ${esc(site.name)} (${esc(env.VENUE || 'varvar')})\n👤 ${esc(me.name)} · ${esc(me.role)}\n🖥 ${esc(String(b.screen || '').slice(0, 60))}\n\n${esc(text)}` }) }).catch(() => {});
    await (await import('./ideas.js')).toHub(env, { kind: 'help', by: me.name, role: me.role, text: text + (b.screen ? `\n🖥 ${String(b.screen).slice(0, 60)}` : '') });
    return [{ ok: true }, 200];
  }
  if (b.op === 'aiBench') { if (!admin) return needAdmin(); const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 3).map(x => String(x).replace(/^data:image\/\w+;base64,/, '')).filter(x => x.length > 1000 && x.length < 6e6); if (!imgs.length) return [{ error: 'Додайте фото' }, 400]; return [{ ok: true, list: await (await import('./ai.js')).aiBench(env, imgs) }, 200]; } // 🧪 порівняння ШІ на накладній
  if (b.op === 'lookV') return [{ ok: true, look: await env.DB.get('lookv', 'json') }, 200]; // 🎨 стиль закладу (конструктор)
  if (b.op === 'onlList') { if (!admin) return needAdmin(); // 🌐 кабінет власника → 💳 Оплата: рахунки, оплачені онлайн, за N днів (один getMany)
    const n = Math.min(62, Math.max(1, +b.days || 30)), days = [...Array(n)].map((_, i) => dayKey(Date.now() - i * 864e5)), cl = await env.DB.getMany(days.map(d => 'closed:' + d), 'json');
    return [{ ok: true, list: days.flatMap((d, i) => (cl[i] || []).filter(x => x.lpo?.length).map(x => ({ d, id: x.id, at: x.at, t: x.t, sum: x.sum, onl: x.onl, go: x.go || '', tip: x.tip || 0, test: x.lpo.some(p => /sandbox/.test(p.o)) ? 1 : 0, ref: x.lref || 0, refBy: x.lrefBy || '', rm: x.rm || x.del ? 1 : 0 })).reverse()) }, 200]; }
  if (b.op === 'dzGet' || b.op === 'dzSet') { if (!admin) return needAdmin(); // 🎨 друк і дизайн: вибраний стиль, тексти й свої стилі (кабінет власника)
    if (b.op === 'dzGet') return [{ ok: true, dz: await env.DB.get('dz', 'json') }, 200];
    const v = b.dz && typeof b.dz === 'object' ? JSON.stringify(b.dz) : ''; if (v.length > 20000) return [{ error: 'too_big' }, 400]; if (v) await env.DB.put('dz', v); else await env.DB.delete('dz'); return [{ ok: true }, 200]; }
  if (b.op === 'lookVSet') { if (!admin) return needAdmin(); const v = b.look && typeof b.look === 'object' ? JSON.stringify(b.look).slice(0, 4000) : null; if (v) await env.DB.put('lookv', v); else await env.DB.delete('lookv'); return [{ ok: true }, 200]; }
  if ((b.op === 'delete' || (b.op === 'goSt' && b.st === 'rej')) && await (async () => { const x = await (await import('./ops.js')).getBill(env, +b.t || 0); return x?.paid || (x?.go?.paid && !x.go.paid.ref); })()) return [{ error: 'Стіл оплачено онлайн — спершу ❌ поверніть гроші або ✅ підтвердіть оплату' }, 400];
  if (b.op === 'tpayOk' || b.op === 'tpayRefund') return (await import('./lpay.js')).tpayApi(b, env, me); // 💳 стіл оплачено з QR
  if (/^task[A-Z]/.test(b.op || '')) return (await import('./tasks.js')).taskApi(b, env, me); // 📋 план на день
  if (/^photo[A-Z]/.test(b.op || '')) { if (!admin) return needAdmin(); return (await import('./photoai.js')).photoApi(b, env, who); } // 📸 ШІ-фото страв
  if (/^idea[A-Z]/.test(b.op || '')) return (await import('./ideas.js')).ideaApi(b, env, me); // 💡 побажання розробнику
  if (/^gb[A-Z]/.test(b.op || '')) return (await import('./guestbot.js')).gbApi(b, env, me); // 🤖 бот гостей
  if (/^loy[A-Z]/.test(b.op || '')) return loyApi(b, env, me, t); // 🎁 лояльність: рівні, акції, клієнти, звіт (promo.js)
  if (/^(bk|site|cert)[A-Z]/.test(b.op || '')) return siteApi(b, env, me, t);
  if (/^cour[A-Z]/.test(b.op || '')) { // 🛵 кур'єр
    if (b.op === 'courMe') return ok({ day: await courDay(env, b.n && admin ? String(b.n) : who), route: await multiRoute(env, who), bot: env.COURIER_BOT_TOKEN ? await courBot(env) : '', linked: !!(await getLinks(env))[who] });
    if (b.op === 'courTg') return ok(await courLinkUrl(env, who));
    if (b.op === 'courAct') { if (b.act === 'take' && me.role !== 'courier' && !admin) return [{ error: 'Брати доставку може кур\'єр або адмін' }, 403]; const r = await courAct(env, t, who, String(b.act), b.arg); return r.error ? [{ error: r.error }, 400] : ok(r); }
    if (b.op === 'courList') { if (!admin) return needAdmin(); const st = (await getStaff(env)).filter(s => s.role === 'courier'), links = await getLinks(env); return ok({ list: await Promise.all(st.map(async s => ({ ...(await courDay(env, s.name)), name: s.name, tg: !!links[s.name] }))), bot: env.COURIER_BOT_TOKEN ? await courBot(env) : '' }); }
    if (b.op === 'courRep') { if (!admin) return needAdmin(); return ok(await courRep(env, String(b.m || ''))); }
    if (b.op === 'courCash') { if (!admin) return needAdmin(); if (!(await getStaff(env)).some(s => s.role === 'courier' && s.name === String(b.n))) return [{ error: 'Немає такого кур\'єра' }, 400]; const r = await courCashGive(env, String(b.n), +b.sum, who); if (!r) return [{ error: 'Некоректна сума' }, 400]; await logEvent(env, { k: 'shift', by: who, text: `💵 Отримано від кур'єра ${b.n}: ${+b.sum} ₴` }); return ok({ r }); }
  }

  if (['move', 'split'].includes(b.op) && !(+b.to >= 1 && +b.to <= tablesCount(env))) return [{ error: 'Переносити можна лише на стіл залу' }, 400]; // не на 1005 / 99999
  switch (b.op) {
    case 'logout': await env.DB.delete('pos:' + token); return ok();
    case 'avatar': { // 👤 своя аватарка в кабінеті (будь-яка роль); data:'' — прибрати
      if (!me.sid) return [{ error: 'Спершу увійдіть своїм PIN' }, 400];
      const O = await import('./ops.js'), url = await O.avPut(env, 'av-s-' + me.sid, b.data); if (url === null) return [{ error: 'Фото не підходить — оберіть інше' }, 400];
      await O.staffAv(env, me.sid, url); return ok({ av: url });
    }
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
      return ok({ me: { ...me, can: canList(me), dmax: me.perm?.discountMax ?? null }, shift, myTip, myAtt, books, wl: me.role === 'courier' || me.role === 'cook' ? [] : await (await import('./wl.js')).wlList(env), bkNew: me.role === 'courier' ? 0 : bkNew, brand: await (async () => { const s = await (await import('./site.js')).getSite(env); return { name: s.name, logo: s.logo || '' }; })(), gInN: ['courier', 'cook'].includes(me.role) ? 0 : await (await import('./guestbot.js')).inOpenN(env), cfg: await getCfg(env), n: tablesCount(env), tables: rows.map(r => ({ t: r.t, ...r.b, items: billItems(r.b), pay2: payable(r.b) })), events: events.slice(-120), printer: pr, now: Date.now() });
    }
    case 'wlAdd': { const [r, c] = await (await import('./wl.js')).wlAdd(env, b, who); return c ? [r, c] : ok(r); }
    case 'wlAct': { const [r, c] = await (await import('./wl.js')).wlAct(env, b.id, b.act, b.t, who); return c ? [r, c] : ok(r); }
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
      if (b.pay && !['card', 'cash'].includes(b.pay)) return [{ error: 'Невідомий спосіб оплати' }, 400];
      const r = await closeTable(env, t, who, b.pay === 'card' ? 'card' : 'cash', b.print !== false);
      if (r) await notify(env, `🖥 ✅ <b>Стіл ${tn(t)} закрито</b> — ${money(r.sum)}${r.disc ? ` (знижка ${money(r.disc)})` : ''} · ${payLabel(r.cash, r.card)}${b.print === false ? ' · без чека' : ''} — ${esc(who)}`);
      return ok({ r });
    }
    case 'discount': { const r = await setDiscount(env, t, b.pct, who, me.perm?.discountMax != null ? discLimit(me) : admin); if (r?.error) return [{ error: r.error }, 400]; if (r) await notify(env, `🖥 % Стіл ${tn(t)}: ${r.disc ? `знижка ${r.disc}% — до сплати ${money(payable(r))}` : 'знижку прибрано'} — ${esc(who)}`); return ok(); }
    case 'tip': { if (+b.sum || !admin) return [{ error: 'Чайові додає лише гість. Прибрати може адміністратор.' }, 403]; const r = await setTip(env, t, b.sum, who); if (r) await notify(env, `🖥 💝 Стіл ${tn(t)}: ${r.tip ? `чайові ${money(r.tip)}` : 'чайові прибрано'} — ${esc(who)}`); return ok(); }
    case 'split': { const r = await splitTable(env, t, b.items, +b.to, who); if (!r) return [{ error: 'Нічого не перенесено' }, 400]; if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 ✂️ Стіл ${tn(t)} розділено → <b>стіл ${tn(r.to)}</b> (${money(r.sum)}): ${esc(r.lines.join(', '))} — ${esc(who)}`, tgBtns(r.to)); return ok({ r }); }
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
      if (stale.length) await kitchenClosed(env, stale); // стіл уже закритий — картка лишається, позначка «оплачено»
      const l = await getKq(env), { KV } = await import('./kitchen.js'), sts = await getStations(env), z = sts.some(x => x.id === b.st) ? b.st : '';
      return ok({ kv: KV, sts: sts.filter(x => x.scr), list: kqView(l.filter(e => !e.done).concat(l.filter(e => e.done && !e.cancelled && !e.closed).slice(-10)), z) }); }
    case 'kDone': return ok({ e: await kitchenDone(env, String(b.id), b.i == null ? null : +b.i, who, String(b.st || '').slice(0, 12) || undefined) });
    case 'kStart': return ok({ e: await kitchenStart(env, String(b.id), who) });
    case 'kUndo': return ok({ e: await kitchenUndo(env, String(b.id)) });
    case 'kMsg': { const e = await kitchenMsg(env, String(b.id), b.text, who); return e ? ok() : [{ error: 'Порожнє повідомлення' }, 400]; }
    case 'kStats': { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.from)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.to))) return [{ error: 'Невірний період' }, 400]; return ok({ list: await kitchenStats(env, String(b.from), String(b.to)) }); }

    // ---- стоп-лист і принтер (усім) ----
    case 'stop': { const it = await setHidden(env, String(b.id), !!b.hidden); if (it) await logEvent(env, { k: 'shift', by: who, text: `${b.hidden ? '⛔' : '✅'} ${it.name.uk} — ${b.hidden ? 'у стоп-листі' : 'знову в меню'}` }); if (it) await notify(env, `🖥 ${b.hidden ? '⛔' : '✅'} <b>${esc(it.name.uk)}</b> ${b.hidden ? 'у стоп-листі' : 'знову в меню'} — ${esc(who)}`); return ok(); }
    case 'printTest': await queuePrint(env, 'test', TEST_JOB()); return ok();
    case 'printQ': return ok({ list: await printList(env) });
    case 'rcptGet': { const P = await import('./print.js'); return ok({ rcpt: await P.getRcpt(env), def: P.RCPT_DEF, dev: await P.allDev(env), route: await P.getRoute(env) }); }
    case 'rcptSet': { if (!admin) return needAdmin(); const P = await import('./print.js'), cur = await P.getRcpt(env), r = P.cleanRcpt({ ...cur, ...(b.rcpt || {}), logoImg: b.rcpt?.logoImg === '' ? '' : cur.logoImg }); if (b.rcpt?.logoImg === '') delete r.logoImg; await env.DB.put('rcpt', JSON.stringify(r)); await notify(env, `🖥 🧾 Змінено вигляд чека — ${esc(who)}`).catch(() => {}); return ok({ rcpt: r }); }
    case 'rcptLogo': { if (!admin) return needAdmin(); const m = String(b.data || '').match(/^data:image\/(png|jpeg);base64,(.+)$/); if (!m) return [{ error: 'image' }, 400]; let bytes; try { bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)); } catch { return [{ error: 'audio' }, 400]; } if (bytes.length > 1e6) return [{ error: 'too_big' }, 400];
      const id = 'rl-' + crypto.randomUUID().slice(0, 8); await env.DB.put('img:' + id, bytes.buffer); const P = await import('./print.js'), r = { ...(await P.getRcpt(env)), logoImg: 'img:' + id, logo: 1 }; await env.DB.put('rcpt', JSON.stringify(r)); return ok({ rcpt: r }); }
    case 'rcptTest': { if (!admin) return needAdmin(); const P = await import('./print.js'); await queuePrint(env, 'test', await P.receipt(env, { table: 5, final: false, by: who, bill: { opened: Date.now() - 50 * 60e3, total: 640, log: [{ lines: ['2× Капучино — 130', '1× Бургер класичний — 290', '1× Лимонад — 220'] }] } })); return ok(); }
    case 'printRoute': { if (!admin) return needAdmin(); const P = await import('./print.js'), r = P.cleanRoute(b); await env.DB.put('print_route', JSON.stringify(r)); await notify(env, `🖥 🖨 Змінено розподіл принтерів — ${esc(who)}`).catch(() => {}); return ok({ route: r }); }
    case 'tabJobs': { const P = await import('./print.js'); return ok({ jobs: await P.tabJobs(env, String(b.dev || '')) }); }
    case 'tabAck': { const P = await import('./print.js'); await P.tabAck(env, [].concat(b.ids || []).map(String).slice(0, 40), String(b.dev || '-')); return ok(); }
    case 'tabReg': { if (!admin) return needAdmin(); const P = await import('./print.js'), r = await P.tabReg(env, b); return r.error ? [{ error: 'Невірний пристрій' }, 400] : ok(r); }
    case 'printMove': { if (!admin) return needAdmin(); const P = await import('./print.js'), r = await P.printMove(env, String(b.id || ''), String(b.st || '')); return r.error ? [{ error: r.error }, 400] : ok(r); }
    case 'evAck': { let ok = 0; await editEv(env, l => { const e = l.find(x => x.id === b.id && x.k === 'noscan'); if (e && e.s !== 'acc') { e.s = 'acc'; e.accBy = who; ok = 1; } }); return ok ? [{ ok: true }, 200] : [{ error: 'Вже підтверджено' }, 400]; } // 🚨 «гість не може замовити» — хтось іде
    // 💬 коментарі під подіями стрічки (як в Instagram): усе в самій події ev:<день> — без окремих запитів, приходить зі станом
    case 'evCom': case 'evComDel': case 'evRx': case 'evSeen': case 'evPin': case 'evVoice': {
      const id = String(b.id || ''), RX = ['👍', '✅', '🔥', '❤️', '😂', '😮'];
      let text = b.op === 'evCom' ? String(b.text || '').trim().slice(0, 300) : '', vid = '';
      if (b.op === 'evCom' && !text) return [{ error: 'Порожній коментар' }, 400];
      if (b.op === 'evVoice') { const m = String(b.data || '').match(/^data:audio\/[\w.+-]+(;codecs=[\w.]+)?;base64,(.+)$/); if (!m) return [{ error: 'audio' }, 400]; const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)); if (bytes.length > 100e3) return [{ error: 'Голосове задовге (до ~50 с)' }, 400];
        vid = crypto.randomUUID().slice(0, 12); await env.DB.put('vc:' + vid, JSON.stringify({ mime: String(b.data).slice(5, String(b.data).indexOf(';')), b64: m[2] }), { expirationTtl: 3 * 86400 }); }
      let err = '', res = null;
      await editEv(env, l => {
        const e = l.find(x => x.id === id); if (!e) { err = 'Подію не знайдено (стрічка за сьогодні)'; return; }
        const cm = (e.cm ||= []);
        if (b.op === 'evCom' || b.op === 'evVoice') {
          if (cm.length >= 40) { err = 'Забагато коментарів під цією подією'; return; }
          if (JSON.stringify(l).length > 1.5e6) { err = 'Стрічка за сьогодні переповнена'; return; }
          const at = [...new Set((text.match(/@[^\s@,.!?]{2,24}/g) || []).map(x => x.slice(1)))].slice(0, 5);
          cm.push({ i: crypto.randomUUID().slice(0, 6), by: who, ts: Date.now(), at: hhmm(), text, ...(vid ? { v: vid, d: Math.min(60, +b.dur || 0) } : {}), ...(at.length ? { m: at } : {}) });
          e.seen = [who];
        } else if (b.op === 'evComDel') {
          const i = cm.findIndex(c => c.i === b.c); if (i < 0) { err = 'Вже видалено'; return; }
          if (cm[i].by !== who && !admin) { err = 'Видалити можна лише свій коментар'; return; }
          cm.splice(i, 1);
        } else if (b.op === 'evRx') {
          if (!RX.includes(b.rx)) { err = 'Реакція?'; return; }
          const tgt = b.c ? cm.find(c => c.i === b.c) : e; if (!tgt) { err = 'Коментар видалено'; return; }
          const r = (tgt.rx ||= {}), a = (r[b.rx] ||= []), i = a.indexOf(who); if (i >= 0) a.splice(i, 1); else a.push(who); if (!a.length) delete r[b.rx]; if (!Object.keys(r).length) delete tgt.rx;
        } else if (b.op === 'evSeen') { if ((e.seen ||= []).includes(who)) { err = '-'; return; } e.seen.push(who); }
        else if (b.op === 'evPin') { if (!admin && e.by !== who) { err = 'Закріпити може адміністратор'; return; } if (e.pin) delete e.pin; else e.pin = who; }
        if (!cm.length) delete e.cm;
        res = e;
      }).catch(x => { err = x.message; });
      if (err === '-') return ok({ e: res });
      if (err) { if (vid) await env.DB.delete('vc:' + vid); return [{ error: err }, 400]; }
      return ok({ e: res });
    }
    // 💬 чат закладу: повідомлення = подія k:'chat' у стрічці (коментарі/реакції — як під будь-якою подією)
    case 'chatSay': { const text = String(b.text || '').trim().slice(0, 500); if (!text) return [{ error: 'Порожнє повідомлення' }, 400]; const m = [...new Set((text.match(/@[^\s@,.!?]{2,24}/g) || []).map(x => x.slice(1)))].slice(0, 5); return ok({ e: await logEvent(env, { k: 'chat', by: who, text, seen: [who], ...(m.length ? { m } : {}) }) }); }
    case 'jsErr': { const k = 'jserr:' + String(who).slice(0, 40), n = +(await env.DB.get(k)) || 0; if (n < 20) { await env.DB.put(k, String(n + 1), { expirationTtl: 600 }); console.log('JSERR', env.VENUE || 'main', JSON.stringify([String(who).slice(0, 40), String(b.m || '').slice(0, 300), String(b.st || '').slice(0, 1500)])); } return ok(); } // 🩺 помилка запуску каси — у wrangler tail
    case 'evVoiceGet': { const v = /^[a-f0-9-]{12}$/.test(String(b.v)) && await env.DB.get('vc:' + b.v, 'json'); return v ? ok(v) : [{ error: 'Голосове вже видалено (зберігаються 3 дні)' }, 404]; }
    case 'evNames': return ok({ list: (await getStaff(env)).map(s => s.name).concat('Кухня') });
    case 'printClear': { if (!admin) return needAdmin(); const r = await printClear(env, b.id ? String(b.id) : ''); if (r.n) await notify(env, `🖥 🗑 Черга друку: ${b.id ? 'видалено 1 завдання' : `очищено (${r.n})`} — ${esc(who)}`).catch(() => {}); return ok(r); }
    case 'printQr': { const { qrImg } = await import('./qr.js'); if (b.all) { const n = tablesCount(env); for (let i = 1; i <= n; i++) await queuePrint(env, 'qr', QR_PRINT(i, await qrImg(env, i))); return ok({ n }); }
      await queuePrint(env, 'qr', QR_PRINT(+b.t || 0, await qrImg(env, +b.t || 0))); return ok(); }
    case 'qrInfo': case 'qrNew': { // 🔳 QR столів: картинки генерує сервер (/print/qr-…png); «нові коди» — старі надруковані перестають працювати
      if (!admin) return needAdmin(); const Q = await import('./qr.js');
      if (b.op === 'qrNew') { if (!(await Q.qrNew(env))) return [{ error: 'Нові коди — не частіше разу на місяць. Наступні: ' + new Date(await Q.qrNext(env)).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' }) }, 400]; await notify(env, `🖥 🔳 Нові QR-коди меню — старі надруковані більше не працюють — ${esc(who)}`); }
      const n = tablesCount(env), base = env.SELF_URL + '/print/';
      return ok({ n, next: await Q.qrNext(env), all: base + (await Q.qrImg(env, 0)) + '.png', list: await Promise.all(Array.from({ length: n }, async (_, i) => ({ t: i + 1, img: base + (await Q.qrImg(env, i + 1)) + '.png', url: await Q.qrUrl(env, i + 1) }))) });
    }

    // ---- закриті ----
    case 'closed': { const day = isDay(b.day) && b.day <= dayKey() ? b.day : dayKey(); return ok({ day, today: dayKey(), list: await getClosed(env, day), voids: (await getVoids(env, day)).filter(v => !v.table) }); }
    case 'voidBack': { if (!admin) return needAdmin(); const v = await restoreVoid(env, +b.ts, who); if (!v) return [{ error: 'Вже повернуто' }, 400]; await notify(env, `🖥 ↩️ <b>Стіл ${tn(v.t)}</b>: повернуто скасоване ${esc(v.name)} (${money(v.sum)}) — ${esc(who)}`, tgBtns(v.t)); return ok({ v }); }
    case 'closedPrint': return ok({ done: await reprintClosed(env, String(b.ref), who, isDay(b.day) ? b.day : undefined) });
    case 'closedBack': { if (!admin) return needAdmin(); const x = await restoreClosed(env, String(b.ref), who, b.day); if (x) await notify(env, `🖥 ↩️ Рахунок стола ${tn(x.t)} (${money(x.sum)}, ${x.at}) повернуто у виручку — ${esc(who)}`); return ok({ x }); }
    case 'closedReopen': { if (!admin) return needAdmin(); const x = await reopenClosed(env, String(b.ref), who, b.day); if (x) await notify(env, `🖥 ↩️ <b>Стіл ${tn(x.t)}</b>: закритий рахунок (${money(x.sum)}, ${x.at}) відкрито знову — ${esc(who)}`, tgBtns(x.t)); return ok({ x }); }
    case 'tableBack': { if (!admin) return needAdmin(); const x = await restoreTable(env, String(b.ref), who, b.day); if (x) await notify(env, `🖥 ↩️ <b>Стіл ${tn(x.t)}</b> відновлено (${money(x.sum)}) — ${esc(who)}`, tgBtns(x.t)); return ok({ x }); }
    case 'closedEdit': { if (!admin) return needAdmin(); const r = await editClosed(env, String(b.ref), b.p, who, b.day); if (r.error) return [{ error: r.error }, 400];
      if (r.what.length) await notify(env, `🖥 ✏️ <b>Чек стола ${tn(r.x.t)}</b> (${r.x.at}${isDay(b.day) && b.day !== dayKey() ? ', ' + b.day : ''}) змінено: ${esc(r.what.join(', '))}\nБуло ${money(r.was)} → <b>${money(r.x.sum)}</b> · ${payLabel(r.x.cash, r.x.card)} — ${esc(who)}`); return ok({ x: r.x, what: r.what }); }
    case 'closedRefund': { // ↩️ закритий чек оплачено онлайн → повернути гостю через LiqPay і зняти чек з виручки
      if (!admin) return needAdmin(); const day = b.day || dayKey(), x = (await getClosed(env, day)).find(c => c.id === String(b.ref));
      if (!x?.lpo?.length) return [{ error: 'Цей чек не оплачувався онлайн' }, 400]; if (x.del || x.rm) return [{ error: 'Чек уже знято з виручки' }, 400];
      const LP = await import('./liqpay.js'), k = LP.lpKeys(env); if (!k) return [{ error: 'LiqPay не підключено' }, 400];
      for (const p of x.lpo) { const r = await LP.lpRefund(k, p.o, p.a); if (r.error) return [{ error: 'LiqPay не повернув: ' + r.error }, 400]; }
      await delClosed(env, String(b.ref), day); await env.DB.locked('closed:' + day, async () => { const l = await getClosed(env, day), y = l.find(c => c.id === x.id); if (y) { y.lref = Date.now(); y.lrefBy = who; await env.DB.put('closed:' + day, JSON.stringify(l)); } }).catch(() => {}); await notify(env, `🖥 ↩️ Повернуто гостю онлайн ${money(x.onl)} — стіл ${tn(x.t)} (${x.at}), чек знято з виручки — ${esc(who)}`); return ok({ sum: x.onl }); }
    case 'fisRetry': { if (!admin) return needAdmin(); const F = await import('./fiscal.js'); if (!F.fisOn(env)) return [{ error: 'ПРРО Checkbox не підключено' }, 400]; // 🧾 повторити фіскалізацію чека (або всіх невдалих за день)
      const day = isDay(b.day) && b.day <= dayKey() ? b.day : dayKey(); if (!b.ref) return ok(await F.fisRetry(env, day));
      const x = await closedRec(env, String(b.ref), day); if (!x?.id) return [{ error: 'Чек не знайдено' }, 400]; return ok((await F.fisSync(env, day, x.id)) || {}); }
    case 'fisInfo': { if (!admin) return needAdmin(); return ok(await (await import('./fiscal.js')).fisInfo(env, !!b.check)); }
    case 'closedDel': { if (!admin) return needAdmin(); const x = await delClosed(env, String(b.ref), b.day); if (x) await notify(env, `🖥 🧹 Закритий рахунок стола ${tn(x.t)} (${money(x.sum)}, ${x.at}) видалено з виручки — ${esc(who)}`); return ok({ x }); }
  }

  // ---- далі лише адміністратор ----
  if (!admin) return needAdmin();
  switch (b.op) {
    case 'shift': { const day = await cashData(env); return ok({ tipbal: await tipBalances(env), tippay: (await env.DB.get('tippay:' + day.day, 'json')) || [], z: await dayZData(env), rec: await env.DB.get('rec:day', 'json'), day, exp: day.exp, mov: day.mov, last: await lastZ(env), bal: await balances(env), closed: await getClosed(env) }); }
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
      const sum = Math.round(+b.sum || 0); if (!(sum > 0 && sum <= 1e6)) return [{ error: 'sum' }, 400];
      const day = /^\d{4}-\d{2}-\d{2}$/.test(b.day || '') && b.day < dayKey() ? b.day : ''; if (day && !admin) return needAdmin(); // 📅 минулий день — лише адмін
      const e = { sum, note: String(b.note || '').slice(0, 100), src: b.src === 'card' ? 'card' : 'cash', at: hhmm(), by: who, ...(day ? { late: dayKey() } : {}) };
      await addExpense(env, e, day || undefined); await notify(env, `🖥 💸 Витрата${day ? ` за ${day.split('-').reverse().join('.')}` : ''} ${money(sum)} ${e.src === 'card' ? '💳 з карти' : '💵 з каси'}${e.note ? ` — ${esc(e.note)}` : ''} · ${esc(who)}`); return ok();
    }
    case 'expenseDel': { if (!admin) return needAdmin(); const ok2 = await delExpense(env, +b.i, b.day); if (ok2 === 'inv') return [{ error: 'Це оплата накладної — видаліть або змініть накладну у Складі' }, 400]; if (ok2) await notify(env, `🖥 🗑 Витрату${b.day ? ' за ' + esc(String(b.day)) : ''} видалено — ${esc(who)}`).catch(() => {}); return ok(); }
    case 'reset': return ok({ n: await resetAll(env) });
    case 'evDrop': { const t = String(b.match || ''); if (t.length < 3) return [{ error: 'Мінімум 3 символи' }, 400]; let n = 0; await editEv(env, l => { const k = l.filter(e => !JSON.stringify(e).includes(t)); n = l.length - k.length; l.length = 0; l.push(...k); }); return ok({ n }); }

    // меню (🔒 по одному — див. menuLock)
    case 'catSet': { if (!admin) return needAdmin(); const r = await (await import('./menu.js')).setCatGroup(env, String(b.id), b); if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 📂 Меню: розділ <b>${esc(r.c.name.uk)}</b> → ${{ kitchen: '🍳 кухня', bar: '🍹 бар', hookah: '💨 кальян' }[r.c.g]}${r.c.nopack ? ' · без упаковки' : ''} — ${esc(who)}`); return ok(); }
    case 'menuSave': case 'catAdd': case 'menuDel': case 'menuUndo': case 'menuPhoto': return menuLock(env, () => menuOp(b, env, who));
    case 'menuImport': { if (!admin) return needAdmin(); const r = await importMenu(env, b.rows, !!b.replace); await notify(env, `🖥 📥 Меню: імпорт — додано ${r.add}, оновлено ${r.upd}, розділів ${r.cats} · ${esc(who)}`); return ok(r); }
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
    case 'staff': return ok({ perms: PERMS, sens: SENSITIVE, staff: (await getStaff(env)).map(({ pin, ...s }) => s), waiters: await loggedWaiters(env), reg: { admin: b._elev ? '' : await regCode(env, 'admin'), waiter: await regCode(env, 'waiter'), cook: await regCode(env, 'cook'), courier: await regCode(env, 'courier') }, kpct: await kitchenPct(env), cfg: await getCfg(env), cooks: (await env.DB.get('cooks:' + dayKey(), 'json')) || [] });
    case 'regCode': { const c = String(b.code || '').trim(); if (!/^\d{4,8}$/.test(c)) return [{ error: 'Код — від 4 до 8 цифр' }, 400]; { if (await pinFind(env, await getStaff(env), c)) return [{ error: 'Цей код збігається з PIN працівника — оберіть інший' }, 400]; } await env.DB.put('reg_' + (['admin', 'cook', 'courier'].includes(b.role) ? b.role : 'waiter'), c); return ok(); }
    case 'staffAdd': { const r = await addStaff(env, b.name, b.pin, b.role); if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 👥 Додано працівника <b>${esc(r.s.name)}</b> (${ROLE_UA[r.s.role]}) — ${esc(who)}`); return ok(); }
    case 'alog': return ok({ list: await (await import('./ops.js')).alogGet(env, String(b.m || '')) }); // 📜 журнал дій
    case 'hallsSet': { const c = await setHalls(env, b.halls, b.go); if (c.error) return [{ error: c.error }, 400]; await notify(env, `🖥 🏛 Зали: ${c.halls ? c.halls.map(h => `${h.ic} ${esc(h.n)} (${h.c})`).join(', ') : `один зал (${c.tables || tablesCount(env)})`} — ${esc(who)}`); return ok({ cfg: c }); }
    case 'mapSet': { const c = await setMap(env, b.pos, b.from, b.to, b.deco, b.floor); return ok({ cfg: c }); } // 🗺 без повідомлення в групу
    case 'cfgSet': { const c = await setCfg(env, String(b.k), b.v); if (c.error) return [{ error: c.error }, 400]; await notify(env, `🖥 ⚙️ Налаштування: ${esc(String(b.k))} = <b>${c[b.k]}</b> — ${esc(who)}`); return ok({ cfg: c }); }
    case 'kitchenPct': { const v = Math.round(+b.pct); if (!(v >= 0 && v <= 100)) return [{ error: 'Від 0 до 100' }, 400]; await env.DB.put('kitchen_pct', String(v)); await notify(env, `🖥 👨‍🍳 Частка кухні від чайових: <b>${v}%</b> — ${esc(who)}`); return ok(); }
    case 'acctExport': { const r = await acctExport(env, String(b.from), String(b.to)); if (!r) return [{ error: 'Невірний період' }, 400]; return ok(r); } // 📤 експорт для бухгалтера
    case 'taxGet': return ok(await taxView(env)); // 📅 податковий календар
    case 'taxSet': { const r = await taxSet(env, b); if (r.error) return [{ error: r.error }, 400]; return ok(await taxView(env)); }
    case 'taxDone': { if (typeof b.key !== 'string' || !/^[a-zA-Z0-9]+:\d{4}-\d{2}-\d{2}$/.test(b.key)) return [{ error: 'Невірний ключ' }, 400]; await taxDone(env, b.key, b.v ? 1 : 0); return ok(await taxView(env)); }
    case 'stGet': { const m = await getMenu(env); return ok({ sts: await getStations(env), cats: m.categories.filter(c => !c.tech).map(c => ({ id: c.id, name: c.name.uk, g: groupOf(c.id), st: c.st || '' })) }); } // 🍳 цехи кухні
    case 'stSet': { const sts = await setStations(env, b.list, b.cats); await notify(env, `🖥 🍳 Цехи кухні: ${sts.length ? sts.map(x => esc(x.name)).join(', ') : 'вимкнено'} — ${esc(who)}`); return ok({ sts }); }
    case 'stItem': { const it = await setItemStation(env, String(b.id), String(b.st || '')); return it ? ok() : [{ error: 'Позицію не знайдено' }, 404]; }
    case 'staffPerm': { // 🔑 права видає лише справжній адміністратор (перевірка elev — у шлюзі прав)
      const r = await setPerm(env, String(b.id || ''), b.perm, b.pin); if (r.error) return [{ error: r.error }, 400];
      await notify(env, `🖥 🔑 Права <b>${esc(r.s.name)}</b>: ${Object.keys(r.s.perm || {}).length ? esc(JSON.stringify(r.s.perm)) : 'за шаблоном ролі'} — ${esc(who)}`); return ok({ perm: r.s.perm || {} }); }
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
// 🔒 ліміт невдалих спроб входу / реєстрації з однієї адреси (10 за 10 хв); успішний вхід лічильник не скидає
const lrlKey = ip => 'lrl:' + ipKey(ip || 'none');
const lrlBlocked = async (env, ip) => (+(await env.DB.get(lrlKey(ip))) || 0) >= 30; // 30 помилок за 10 хв з однієї мережі: увесь персонал часто за одним Wi-Fi
const lrlFail = async (env, ip) => { const k = lrlKey(ip); await env.DB.put(k, String((+(await env.DB.get(k)) || 0) + 1), { expirationTtl: 600 }); };
// 🛡 загальний захист від підбору PIN по всьому закладу (не вимикає касу): ≥20 хибних за 10 хв — сповіщення власнику платформи; ≥60 — невідомі IP чекають, а ті, звідки вже входили (okip:), працюють
const loginFailAll = async env => {
  const k = 'lfail:all', n = (+(await env.DB.get(k)) || 0) + 1; await env.DB.put(k, String(n), { expirationTtl: 600 });
  if (n >= 20 && !(await env.DB.get('lfail:warn'))) { await env.DB.put('lfail:warn', '1', { expirationTtl: 600 }); await (await import('./ideas.js')).toHub(env, { kind: 'help', by: 'Безпека', role: 'system', text: `🛡 Підбір PIN у касі: ${n} хибних спроб за 10 хв. Невідомі IP будуть гальмуватись після 60.` }).catch(() => {}); }
};
const loginGuard = async (env, ip) => ((+(await env.DB.get('lfail:all')) || 0) < 60) || !!(ip && await env.DB.get('okip:' + ip.slice(0, 64)));
const TOO_MANY = [{ error: 'Забагато спроб — зачекайте 10 хвилин' }, 429];
async function register(b, env, ip) {
  if (await lrlBlocked(env, ip)) return TOO_MANY;
  const role = await regRole(env, b.code); if (!role) { await lrlFail(env, ip); return [{ error: 'Невірний код реєстрації' }, 401]; }
  const r = await addStaff(env, b.name, b.pin, role); if (r.error) return [{ error: r.error }, 400];
  await notify(env, `👥 Новий працівник: <b>${esc(r.s.name)}</b> (${ROLE_UA[role]}) — зареєструвався в касі`);
  const me = { name: r.s.name, role, sid: r.s.id, can: canList({ role }) };
  const token = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.DB.put('pos:' + token, JSON.stringify({ ...me, at: Date.now() }), { expirationTtl: SESSION_TTL[role] });
  return [{ ok: true, token, me }, 200];
}
async function login(b, env, ip) {
  if (await lrlBlocked(env, ip)) return TOO_MANY;
  let me = null;
  if (b.pin) {
    if (!(await loginGuard(env, ip))) return TOO_MANY;
    const s = await pinFind(env, await getStaff(env), String(b.pin)); if (s) { me = { name: s.name, role: s.role, sid: s.id, ver: s.ver || 0, can: canList(s) }; await pinUpgrade(env, s, String(b.pin)); await env.DB.put('okip:' + ip.slice(0, 64), '1', { expirationTtl: 30 * 86400 }); } // спершу PIN працівника — код реєстрації не має його перекривати
    else { const role = await regRole(env, b.pin); if (role) return [{ ok: true, register: role }, 200]; } // код реєстрації → форма «імʼя + свій PIN»
  }
  if (!me) { await lrlFail(env, ip); await loginFailAll(env); return [{ error: 'Невірний PIN' }, 401]; }
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
