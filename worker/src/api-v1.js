// 🔌 Публічне API v1 для партнерів (агрегатори, сайти, бухгалтерія): ключ закладу → ті самі дії, що й сайт/каса.
// Ключ: atk_<id 8>_<секрет 32>; у базі лише sha256 (apikeys). Права: menu · orders · sales. Ліміт — 60 запитів/хв на ключ.
// Статуси замовлень партнеру — webhook з підписом HMAC (X-Atom-Signature), надсилає будильник закладу (apiTick у cron), повтори 1/5/30/120 хв.
// Паспорт — _team/api.md, документація для партнерів — api.html.
import { getMenu } from './menu.js';
import { goOrder } from './delivery.js';
import { reportRange, L, tg, esc, dayKey } from './ops.js';
import { tn } from './tn.js';
import { audit } from './ledger.js';

export const SCOPES = { menu: '🍽 Меню й стоп-лист', orders: '🛵 Замовлення: створення й статус', sales: '📊 Продажі для бухгалтерії' };
const MAX_KEYS = 10, RPM = 60, FINAL = new Set(['done', 'rej']), RETRY = [60e3, 300e3, 1800e3, 7200e3];
const te = new TextEncoder(), hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async s => hex(await crypto.subtle.digest('SHA-256', te.encode(s)));
export const hmac = async (k, s) => hex(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', te.encode(k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), te.encode(s)));
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const keys = async env => (await env.DB.get('apikeys', 'json')) || [];
const pub = k => ({ id: k.id, name: k.name, sc: k.sc, at: k.at, by: k.by, last: k.last || 0, hook: k.hook || '' });
const hookOk = u => { try { const x = new URL(u); return x.protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(x.hostname) && u.length <= 300; } catch { return false; } };
const J = (d, s = 200, h = {}) => new Response(s === 304 ? null : JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, if-none-match', 'cache-control': 'no-store', ...h } });

// 🔑 перевірка ключа: Authorization: Bearer atk_… (або X-Api-Key)
async function auth(req, env, scope) {
  const raw = ((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || req.headers.get('x-api-key') || '').trim();
  const m = raw.match(/^atk_([a-f0-9]{8})_([a-f0-9]{32})$/); if (!m) return [{ error: 'unauthorized' }, 401];
  const k = (await keys(env)).find(x => x.id === m[1]); if (!k || !same(k.h, await sha(raw))) return [{ error: 'unauthorized' }, 401];
  if (scope && !k.sc.includes(scope)) return [{ error: 'forbidden', need: scope }, 403];
  const rk = 'apirl:' + k.id, n = (+(await env.DB.get(rk)) || 0) + 1; if (n > RPM) return [{ error: 'rate_limit', limit_per_min: RPM }, 429];
  await env.DB.put(rk, String(n), { expirationTtl: 60 });
  if (Date.now() - (k.last || 0) > 3600e3) await L(env, 'apikeys', async () => { const l = await keys(env), x = l.find(y => y.id === k.id); if (x) { x.last = Date.now(); await env.DB.put('apikeys', JSON.stringify(l)); } }); // «востаннє» — не частіше разу на годину (менше записів)
  return [k];
}

const imgUrl = (env, s) => !s ? '' : /^https?:/.test(s) ? s : (env.SELF_URL || '') + (s.startsWith('/img/') && (env.VENUE || 'varvar') !== 'varvar' ? '/v/' + env.VENUE : '') + '/' + s.replace(/^\//, '').replace(/\?.*$/, '');
async function menuOut(env) {
  const m = await getMenu(env);
  return { categories: m.categories.filter(c => !c.tech).map(c => ({ id: c.id, name: c.name?.uk || '', items: c.items.map(i => ({
    id: i.id, name: i.name?.uk || '', ...(i.name?.en && i.name.en !== i.name.uk ? { name_en: i.name.en } : {}),
    ...(i.variants ? { variants: i.variants.map(v => ({ id: String(v.v), price: v.p })), unit: i.size || 'л' } : { price: i.price, ...(i.size ? { size: i.size } : {}) }),
    available: !i.hidden, ...(i.desc?.uk ? { description: i.desc.uk } : {}), ...(i.img ? { image: imgUrl(env, i.img) } : {}) })) })) };
}
const ordOut = (id, o, ext) => o && { id, ...(ext ? { ext_id: ext } : {}), status: o.g || o.s, no: o.t ? tn(o.t) : '', ...(o.eta ? { eta: new Date(o.eta).toISOString() } : {}), ...(o.cour ? { courier: o.cour } : {}), ...(o.gAt ? { updated: new Date(o.gAt).toISOString() } : {}) };

export async function apiV1(req, env, url) {
  if (req.method === 'OPTIONS') return J(null, 204);
  const p = url.pathname.slice(8); // після /api/v1/
  try {
    if (p === 'ping') { const [k, s] = await auth(req, env); if (s) return J(k, s); return J({ ok: true, venue: env.VENUE || 'varvar', key: k.name, scopes: k.sc }); }
    if (p === 'menu' && req.method === 'GET') { // ETag: меню не змінилось → 304 без тіла
      const [k, s] = await auth(req, env, 'menu'); if (s) return J(k, s);
      const d = await menuOut(env), body = JSON.stringify(d), tag = '"m' + (await sha(body)).slice(0, 16) + '"';
      if ((req.headers.get('if-none-match') || '') === tag) return J(null, 304, { etag: tag });
      return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-cache', etag: tag } });
    }
    if (p === 'sales' && req.method === 'GET') { // 📊 закриті чеки за період (до 31 дня)
      const [k, s] = await auth(req, env, 'sales'); if (s) return J(k, s);
      const from = url.searchParams.get('from') || dayKey(), to = url.searchParams.get('to') || from;
      if ((Date.parse(to) - Date.parse(from)) / 864e5 > 30) return J({ error: 'range', max_days: 31 }, 400);
      const r = await reportRange(env, from, to); if (!r) return J({ error: 'bad_date', format: 'YYYY-MM-DD' }, 400);
      return J({ from, to, checks: r.checks.map(x => ({ id: x.id, date: x.d, closed_at: x.at, no: tn(x.t), total: x.sum, cash: x.cash, card: x.card, online: x.onl, discount: x.disc, tip: x.tip, ...(x.bonus ? { bonus: x.bonus } : {}), ...(x.go ? { delivery: x.go, fee: x.fee } : {}), items: (x.dishes || []).map(([name, qty, sum]) => ({ name, qty, sum })) })) });
    }
    const om = p.match(/^orders(?:\/([a-f0-9]{10}))?$/);
    if (om && om[1] && req.method === 'GET') { // статус свого замовлення
      const [k, s] = await auth(req, env, 'orders'); if (s) return J(k, s);
      const a = await env.DB.get('apiord:' + om[1], 'json'); if (!a || a.k !== k.id) return J({ error: 'not_found' }, 404);
      return J(ordOut(om[1], await env.DB.get('ord:' + om[1], 'json'), a.ext) || { error: 'not_found' }, 200);
    }
    if (om && !om[1] && req.method === 'POST') return J(...await createOrder(req, env));
    return J({ error: 'not_found', docs: 'https://posatom.online/api' }, 404);
  } catch (e) { console.log('api v1', e.message); return J({ error: 'server' }, 500); }
}

// 🛵 нове замовлення від партнера: ext_id обов'язковий — повтор з тим самим ext_id повертає те саме замовлення (без дубля)
async function createOrder(req, env) {
  const [k, s] = await auth(req, env, 'orders'); if (s) return [k, s];
  const b = await req.json().catch(() => null); if (!b || typeof b !== 'object') return [{ error: 'bad_json' }, 400];
  const ext = String(b.ext_id || '').trim(); if (!/^[\w.:-]{1,64}$/.test(ext)) return [{ error: 'ext_id', msg: 'ext_id — ваш номер замовлення (1–64 символи: літери, цифри, . _ : -)' }, 400];
  if (!['delivery', 'pickup'].includes(b.type)) return [{ error: 'type', allowed: ['delivery', 'pickup'] }, 400];
  if (!['cash', 'card', 'prepaid'].includes(b.payment || 'cash')) return [{ error: 'payment', allowed: ['cash', 'card', 'prepaid'] }, 400];
  const ik = 'apiidem:' + k.id + ':' + ext;
  return L(env, ik, async () => {
    const was = await env.DB.get(ik, 'json'); if (was) return [{ ...was, duplicate: true }, 200];
    const pre = b.payment === 'prepaid', paid = Math.max(0, Math.round(+b.paid_sum || 0));
    const g = { kind: b.type === 'delivery' ? 'del' : 'pick', name: b.customer?.name, phone: b.customer?.phone, addr: b.address, ent: b.entrance, when: b.time || '', cut: b.cutlery, comment: b.comment, change: b.change_from,
      items: (Array.isArray(b.items) ? b.items : []).map(i => ({ id: String(i?.id || ''), q: i?.qty, ...(i?.variant ? { v: String(i.variant) } : {}) })),
      pay: pre ? 'online' : b.payment || 'cash', src: ('api:' + k.name).slice(0, 20), device: 'api-' + k.id, _api: k.id, ...(pre ? { _paid: { sum: paid, via: 'api' } } : {}) };
    const [r, st] = await goOrder(g, '', env);
    if (st !== 200 || !r.ok) return [{ ...r, error: { off: 'closed_for_orders', closed: 'closed_now', contact: 'customer', addr: 'address', empty: 'no_valid_items', min: 'below_minimum' }[r.error] || r.error }, st];
    const out = { ok: true, id: r.id, ext_id: ext, no: r.no, total: r.sum, status: 'new', ...(r.eta ? { prep_min: r.eta } : {}) };
    await Promise.all([env.DB.put(ik, JSON.stringify(out), { expirationTtl: 2 * 86400 }), env.DB.put('apiord:' + r.id, JSON.stringify({ k: k.id, ext }), { expirationTtl: 3 * 86400 }),
      k.hook ? L(env, 'apiwatch', async () => { const w = (await env.DB.get('apiwatch', 'json')) || []; w.push({ id: r.id, k: k.id, ext, last: 'new', at: Date.now() }); await env.DB.put('apiwatch', JSON.stringify(w.slice(-500))); }) : null,
      audit(env, 'API ' + k.name, 'apiOrder', r.id, null, { ext, sum: r.sum })]);
    if (k.hook && env.WAKE) await env.WAKE(60e3); // ⏰ будильник — за хвилину перевірить статус
    return [out, 200];
  });
}

// ⏰ з cron закладу: зміни статусів замовлень партнерів → webhook. Повертає, коли прокинутись знову (0 — нічого не чекаємо)
export async function apiTick(env) {
  const w = (await env.DB.get('apiwatch', 'json')) || []; if (!w.length) return 0;
  const now = Date.now(), ks = await keys(env), os = await env.DB.getMany(w.map(x => 'ord:' + x.id), 'json'), res = new Map();
  for (const [i, x] of w.entries()) {
    const o = os[i], k = ks.find(y => y.id === x.k), st = o && (o.g || o.s);
    if (!o || !k?.hook || now - x.at > 86400e3) { res.set(x.id, { drop: 1 }); continue; } // ключ видалено / без webhook / старше доби
    if (st === x.last || (x.next || 0) > now) continue;
    const body = JSON.stringify({ event: 'order.status', venue: env.VENUE || 'varvar', order: ordOut(x.id, o, x.ext), sent_at: new Date(now).toISOString() });
    const r = await fetch(k.hook, { method: 'POST', headers: { 'content-type': 'application/json', 'x-atom-event': 'order.status', 'x-atom-signature': await hmac(k.hs, body) }, body, signal: AbortSignal.timeout(5000) }).then(r => r.ok, () => false);
    if (r) res.set(x.id, { last: st, tries: 0, next: 0, fin: FINAL.has(st) });
    else { const tries = (x.tries || 0) + 1; res.set(x.id, tries > RETRY.length ? { last: st, tries: 0, next: 0, fin: FINAL.has(st), fail: k } : { tries, next: now + RETRY[tries - 1] }); }
  }
  let next = 0;
  await L(env, 'apiwatch', async () => {
    const l = ((await env.DB.get('apiwatch', 'json')) || []).flatMap(x => { const r = res.get(x.id); if (!r) return [x]; if (r.drop || r.fin) return []; const { fail, fin, ...y } = r; return [{ ...x, ...y }]; });
    await env.DB.put('apiwatch', JSON.stringify(l)); next = l.length ? now + 60e3 : 0;
  });
  for (const r of res.values()) if (r.fail) { const f = 'apifail:' + r.fail.id + ':' + dayKey(); if (!(await env.DB.get(f))) { await env.DB.put(f, '1', { expirationTtl: 2 * 86400 }); await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text: `🔌 Інтеграція <b>${esc(r.fail.name)}</b> не приймає сповіщення (webhook). Перевірте адресу в кабінеті → 🔌 API.` }).catch(() => {}); } } // раз на добу, без спаму
  return next;
}

// 👑 керування ключами — лише адмін закладу (кабінет власника → 🔌 API)
export async function apiAdmin(b, env, me) {
  if (me.role !== 'admin' || me.elev) return [{ error: 'admin' }, 403];
  if (env.VENUE === 'atom-demo' && /Гість демо/.test(me.name || '')) return [{ error: 'У демо ключі API не створюються' }, 403];
  const sc = a => [...new Set((Array.isArray(a) ? a : []).filter(x => SCOPES[x]))];
  if (b.op === 'apiKeys') return [{ ok: true, list: (await keys(env)).map(pub), scopes: SCOPES }, 200];
  if (b.op === 'apiKeyNew') {
    const name = String(b.name || '').trim().slice(0, 40), s = sc(b.sc); if (!name) return [{ error: 'Назва ключа' }, 400]; if (!s.length) return [{ error: 'Оберіть хоча б одне право' }, 400];
    if (b.hook && !hookOk(b.hook)) return [{ error: 'Адреса webhook — лише https://' }, 400];
    const id = rnd(4), key = `atk_${id}_${rnd(16)}`, hs = b.hook ? 'whs_' + rnd(16) : '';
    const r = await L(env, 'apikeys', async () => { const l = await keys(env); if (l.length >= MAX_KEYS) return null; l.push({ id, name, sc: s, h: await sha(key), at: Date.now(), by: me.name, ...(b.hook ? { hook: b.hook, hs } : {}) }); await env.DB.put('apikeys', JSON.stringify(l)); return 1; });
    if (!r) return [{ error: `Не більше ${MAX_KEYS} ключів` }, 400];
    await audit(env, me.name, 'apiKeyNew', id, null, { name, sc: s });
    return [{ ok: true, id, key, ...(hs ? { hs } : {}) }, 200]; // ключ показується один раз
  }
  if (b.op === 'apiKeyDel') { const id = String(b.id || ''); const r = await L(env, 'apikeys', async () => { const l = await keys(env), n = l.filter(x => x.id !== id); if (n.length === l.length) return null; await env.DB.put('apikeys', JSON.stringify(n)); return 1; }); if (!r) return [{ error: 'not_found' }, 404]; await audit(env, me.name, 'apiKeyDel', id); return [{ ok: true }, 200]; }
  if (b.op === 'apiKeyHook') { // нова адреса → новий секрет підпису; порожня — вимкнути сповіщення
    const id = String(b.id || ''), u = String(b.hook || '').trim(); if (u && !hookOk(u)) return [{ error: 'Адреса webhook — лише https://' }, 400];
    const hs = u ? 'whs_' + rnd(16) : '';
    const r = await L(env, 'apikeys', async () => { const l = await keys(env), x = l.find(y => y.id === id); if (!x) return null; if (u) Object.assign(x, { hook: u, hs }); else { delete x.hook; delete x.hs; } await env.DB.put('apikeys', JSON.stringify(l)); return 1; });
    if (!r) return [{ error: 'not_found' }, 404]; await audit(env, me.name, 'apiKeyHook', id, null, { hook: u }); return [{ ok: true, ...(hs ? { hs } : {}) }, 200];
  }
  if (b.op === 'apiHookTest') { // 🧪 тестове сповіщення event=ping
    const k = (await keys(env)).find(x => x.id === String(b.id || '')); if (!k?.hook) return [{ error: 'Спершу вкажіть адресу webhook' }, 400];
    const body = JSON.stringify({ event: 'ping', venue: env.VENUE || 'varvar', sent_at: new Date().toISOString() });
    const st = await fetch(k.hook, { method: 'POST', headers: { 'content-type': 'application/json', 'x-atom-event': 'ping', 'x-atom-signature': await hmac(k.hs, body) }, body, signal: AbortSignal.timeout(5000) }).then(r => r.status, () => 0);
    return [{ ok: st >= 200 && st < 300, status: st }, 200];
  }
  return [{ error: 'unknown op' }, 400];
}
