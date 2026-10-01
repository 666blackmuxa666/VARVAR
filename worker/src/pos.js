// API касової програми (pos.html). POST /api/pos {op, ...} з заголовком Authorization: Bearer <token>.
// Живі оновлення: WebSocket /api/pos/live?token=… (див. store.js). Логіка — спільна з ботом (ops.js).
import { getMenu, saveMenu } from './menu.js';
import { queuePrint, printStatus } from './print.js';
import { QR_PRINT, TEST_JOB } from './bot.js';
import { storeStub } from './store.js';
import {
  esc, money, hhmm, tablesCount, notify, getBill, openTables, billItems, payable, addWaiterOrder, itemsFromMenu, removeOne, closeTable, payLabel, precheck,
  setDiscount, moveTable, deleteTable, getClosed, closedRec, delClosed, reprintClosed, getExp, addExpense, delExpense, setFloat, cashData, reportsData,
  topData, setHidden, adminPass, waiterPass, pinHash, getStaff, addStaff, delStaff, loggedWaiters, resetAll, acceptOrder, getEvents,
} from './ops.js';

const SESSION_TTL = { admin: 12 * 3600, waiter: 30 * 86400 };
const tokenOf = req => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
async function session(env, token) { return /^[a-f0-9]{32}$/.test(token || '') ? env.DB.get('pos:' + token, 'json') : null; }
const ipKey = ip => ip.includes(':') ? ip.split(':').slice(0, 4).join(':') + '::/64' : ip;
const tgBtns = t => ({ inline_keyboard: [[{ text: `🪑 Стіл ${t}`, callback_data: 'tbl:' + t }, { text: '🧾 Закрити стіл', callback_data: 'cls:' + t }]] });

export async function posLive(req, env, url) {
  if (!(await session(env, url.searchParams.get('token')))) return new Response('forbidden', { status: 403 });
  return storeStub(env).fetch(req);
}

export async function posApi(b, req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || '';
  if (b.op === 'login') return login(b, env, ip);
  const token = tokenOf(req), me = await session(env, token);
  if (!me) return [{ error: 'auth' }, 401];
  const admin = me.role === 'admin', who = me.name;
  const t = +b.t || 0;
  const needAdmin = () => [{ error: 'admin' }, 403];
  const ok = (x = {}) => [{ ok: true, ...x }, 200];

  switch (b.op) {
    case 'logout': await env.DB.delete('pos:' + token); return ok();
    case 'state': {
      const [rows, events, pr] = await Promise.all([openTables(env), getEvents(env), printStatus(env)]);
      return ok({ me, n: tablesCount(env), tables: rows.map(r => ({ t: r.t, ...r.b, items: billItems(r.b), pay2: payable(r.b) })), events: events.slice(-120), printer: pr, now: Date.now() });
    }
    case 'menu': return ok({ menu: await getMenu(env) });

    // ---- столи ----
    case 'order': {
      const items = await itemsFromMenu(env, b.items);
      const comment = String(b.comment || '').trim().slice(0, 200);
      if (!t || t > tablesCount(env)) return [{ error: 'table' }, 400];
      const r = await addWaiterOrder(env, { table: t, items }, who, comment, 'каса');
      if (!r) return [{ error: 'empty' }, 400];
      await notify(env, `🖥 <b>Стіл ${t}</b> — замовлення з каси (${esc(who)})\n${r.lines.map(esc).join('\n')}${comment ? `\n💬 ${esc(comment)}` : ''}\nСума: <b>${money(r.sum)}</b> · разом за стіл: <b>${money(r.total)}</b>`, tgBtns(t));
      return ok(r);
    }
    case 'remove': { const r = await removeOne(env, t, String(b.name), who); if (r) await notify(env, `🖥 ✏️ Стіл ${t}: прибрано 1× ${esc(r.name)} (−${r.unit} грн) — ${esc(who)}`); return ok({ r }); }
    case 'precheck': return ok({ done: await precheck(env, t, who) });
    case 'close': {
      const r = await closeTable(env, t, who, b.pay === 'card' ? 'card' : 'cash', b.print !== false);
      if (r) await notify(env, `🖥 ✅ <b>Стіл ${t} закрито</b> — ${money(r.sum)}${r.disc ? ` (знижка ${money(r.disc)})` : ''} · ${payLabel(r.cash, r.card)}${b.print === false ? ' · без чека' : ''} — ${esc(who)}`);
      return ok({ r });
    }
    case 'discount': { const r = await setDiscount(env, t, b.pct, who); if (r) await notify(env, `🖥 % Стіл ${t}: ${r.disc ? `знижка ${r.disc}% — до сплати ${money(payable(r))}` : 'знижку прибрано'} — ${esc(who)}`); return ok(); }
    case 'move': { const r = await moveTable(env, t, +b.to, who); if (r) await notify(env, `🖥 ${r.merged ? `🔗 Стіл ${t} об'єднано зі столом ${b.to}` : `↔️ Стіл ${t} перенесено на стіл ${b.to}`} — ${esc(who)}`, tgBtns(+b.to)); return ok({ r }); }
    case 'accept': return ok({ done: await acceptOrder(env, String(b.oid), who) });
    case 'delete': {
      if (!admin) return needAdmin();
      const r = await deleteTable(env, t, who); if (r) await notify(env, `🖥 🗑 <b>Стіл ${t} видалено</b> (${money(r.sum)}) — у виручку не піде · ${esc(who)}`);
      return ok({ r });
    }

    // ---- стоп-лист і принтер (усім) ----
    case 'stop': { const it = await setHidden(env, String(b.id), !!b.hidden); if (it) await notify(env, `🖥 ${b.hidden ? '⛔' : '✅'} <b>${esc(it.name.uk)}</b> ${b.hidden ? 'у стоп-листі' : 'знову в меню'} — ${esc(who)}`); return ok(); }
    case 'printTest': await queuePrint(env, 'test', TEST_JOB()); return ok();
    case 'printQr': await queuePrint(env, 'qr', QR_PRINT(+b.t || 0)); return ok();

    // ---- закриті ----
    case 'closed': return ok({ list: await getClosed(env) });
    case 'closedPrint': return ok({ done: await reprintClosed(env, String(b.ref), who) });
    case 'closedDel': { if (!admin) return needAdmin(); const x = await delClosed(env, String(b.ref)); if (x) await notify(env, `🖥 🧹 Закритий рахунок стола ${x.t} (${money(x.sum)}, ${x.at}) видалено з виручки — ${esc(who)}`); return ok({ x }); }
  }

  // ---- далі лише адміністратор ----
  if (!admin) return needAdmin();
  switch (b.op) {
    case 'reports': return ok({ ...(await reportsData(env)), cash: await cashData(env), top: await topData(env) });
    case 'float': await setFloat(env, +b.sum || 0); return ok();
    case 'expense': {
      const sum = Math.round(+b.sum || 0); if (!sum) return [{ error: 'sum' }, 400];
      const e = { sum, note: String(b.note || '').slice(0, 100), src: b.src === 'card' ? 'card' : 'cash', at: hhmm(), by: who };
      await addExpense(env, e); await notify(env, `🖥 💸 Витрата ${money(sum)} ${e.src === 'card' ? '💳 з карти' : '💵 з каси'}${e.note ? ` — ${esc(e.note)}` : ''} · ${esc(who)}`); return ok();
    }
    case 'expenseDel': await delExpense(env, +b.i); return ok();
    case 'reset': return ok({ n: await resetAll(env) });

    // меню
    case 'menuSave': return menuSave(env, b.item, who);
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

    // Wi‑Fi
    case 'wifi': return ok({ list: (await env.DB.get('venue_ips', 'json')) || [], current: ipKey(ip) });
    case 'wifiAdd': {
      const k = ipKey(ip); const list = [{ k, at: Date.now() }, ...((await env.DB.get('venue_ips', 'json')) || []).filter(x => x.k !== k)].slice(0, 6);
      await env.DB.put('venue_ips', JSON.stringify(list)); await notify(env, `🖥 📶 Додано мережу закладу ${k} — ${esc(who)}`); return ok({ list });
    }
    case 'wifiClear': await env.DB.put('venue_ips', '[]'); await notify(env, `🖥 📶 Усі мережі закладу скинуто — ${esc(who)}`); return ok();

    // персонал і паролі
    case 'staff': return ok({ staff: (await getStaff(env)).map(({ pin, ...s }) => s), waiters: await loggedWaiters(env) });
    case 'staffAdd': { const r = await addStaff(env, b.name, b.pin, b.role); if (r.error) return [{ error: r.error }, 400]; await notify(env, `🖥 👥 Додано працівника <b>${esc(r.s.name)}</b> (${r.s.role === 'admin' ? 'адмін' : 'офіціант'}) — ${esc(who)}`); return ok(); }
    case 'staffDel': await delStaff(env, String(b.id)); return ok();
    case 'waiterOut': await env.DB.delete('wlog:' + b.uid); await env.DB.delete('adm:' + b.uid); return ok();
    case 'adminPass': if (String(b.pass || '').length < 4) return [{ error: 'Мінімум 4 символи' }, 400]; await env.DB.put('admin_pass', String(b.pass)); return ok();
    case 'waiterPass': if (String(b.pass || '').length < 3) return [{ error: 'Мінімум 3 символи' }, 400]; await env.DB.put('waiter_pass', String(b.pass)); return ok();
  }
  return [{ error: 'unknown_op' }, 400];
}

async function login(b, env, ip) {
  const fk = 'pfail:' + ipKey(ip), fails = +(await env.DB.get(fk) || 0);
  if (fails >= 8) return [{ error: 'Забагато спроб. Зачекайте 15 хвилин.' }, 429];
  let me = null;
  if (b.pin) { const h = await pinHash(String(b.pin)); const s = (await getStaff(env)).find(x => x.pin === h); if (s) me = { name: s.name, role: s.role, sid: s.id }; }
  if (b.pass) {
    const p = String(b.pass).toLowerCase();
    if (p === (await adminPass(env)).toLowerCase()) me = { name: String(b.name || 'Адміністратор').slice(0, 30), role: 'admin' };
    else if (p === (await waiterPass(env)).toLowerCase()) me = { name: String(b.name || 'Офіціант').slice(0, 30), role: 'waiter' };
  }
  if (!me) { await env.DB.put(fk, String(fails + 1), { expirationTtl: 900 }); return [{ error: 'Невірний PIN або пароль' }, 401]; }
  await env.DB.delete(fk);
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
