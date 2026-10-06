// Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV).
// KV віддає старе значення до ~60 с після запису → губились швидкі натискання, двічі віднімалась виручка.
// env.DB = storeDB(...) має той самий API, що й KV (get/put/delete/list) + getMany; картинки img:* лишаються в KV.
import { DurableObject } from 'cloudflare:workers';
import { handle } from './index.js';
import { ALS, MAIN, doName, venueEnv, venueId } from './venue.js';

const now = () => Date.now();
// ключі, зміна яких оновлює екрани POS
const WATCH = /^(bill:|closed:|day:|exp:|ev:|menu$|staff$|ord:|fav$|shift$|z:|mov:|tipbal$|tippay:|void:|kq:|ing$|cards$|stk:|invl:|sups$|cntl$|cnt:open|att:|plan:|pay:|swaps$)/;
const alive = r => r && (!r.e || r.e > now());

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      // 🏪 мультизаклад: стара одноразова міграція з KV була лише для VARVAR (DO «main», уже виконана).
      // Новий заклад НІЧОГО не копіює з KV — інакше отримав би чужі дані.
      if (!(await ctx.storage.get('__migrated'))) { await ctx.storage.put('__migrated', -1); await ctx.storage.put('__keep1', 1); }
      else if (!(await ctx.storage.get('__keep1'))) await this.keepHistory();
    });
  }
  // (історично) одноразове перенесення з KV — більше не викликається
  async migrate() {
    let cursor, n = 0;
    do {
      const r = await this.env.DB.list({ cursor });
      for (const k of r.keys) {
        if (/^(img:|pq:|printer_seen)/.test(k.name)) continue;
        const v = await this.env.DB.get(k.name); if (v == null) continue;
        await this.ctx.storage.put(k.name, { v, e: k.expiration ? k.expiration * 1000 : 0 }); n++;
      }
      cursor = r.list_complete ? null : r.cursor;
    } while (cursor);
    await this.ctx.storage.put('__migrated', n);
    await this.ctx.storage.setAlarm(now() + 3600e3);
  }
  // історія більше не має терміну (раніше 400 днів) — знімаємо термін зі старих записів
  async keepHistory() {
    for (const prefix of ['day:', 'closed:', 'exp:', 'dish:', 'rcpt:', 'mov:']) {
      const m = await this.ctx.storage.list({ prefix });
      for (const [k, r] of m) if (r && r.e) await this.ctx.storage.put(k, { v: r.v, e: 0 });
    }
    await this.ctx.storage.put('__keep1', 1);
  }
  // ---- живе оновлення для POS: WebSocket-и підключені до цього ж об'єкта ----
  async fetch(req) {
    if (req.headers.get('Upgrade') !== 'websocket') { // увесь запит — тут, база локальна
      const venue = req.headers.get('x-venue') || MAIN, DB = localDB(this, this.env.DB, venue);
      if (venue !== MAIN && !(await DB.get('cfg:venue')) && !req.headers.get('x-venue-init')) return Response.json({ error: 'venue_not_found' }, { status: 404 }); // 🏪 заклад ще не створено в HUB
      const env = { ...(await venueEnv(this.env, venue, DB)), DB, INSTORE: 1 };
      return ALS.run({ venue }, () => handle(req, env));
    }
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) { if (msg === 'ping') ws.send('pong'); }
  webSocketClose(ws, code) { try { ws.close(code); } catch {} }
  changed(keys) {
    const ks = keys.filter(k => WATCH.test(k)); if (!ks.length) return;
    (this.pend ||= new Set()); ks.forEach(k => this.pend.add(k.split(':')[0]));
    if (this.timer) return;
    this.timer = setTimeout(() => {
      const msg = JSON.stringify({ type: 'changed', keys: [...this.pend] }); this.pend = new Set(); this.timer = null;
      for (const ws of this.ctx.getWebSockets()) { try { ws.send(msg); } catch {} }
    }, 40);
  }
  async get(k) { const r = await this.ctx.storage.get(k); return alive(r) ? r.v : null; }
  async getMany(ks) { const m = new Map(); for (let i = 0; i < ks.length; i += 128) for (const [k, v] of await this.ctx.storage.get(ks.slice(i, i + 128))) m.set(k, v); return ks.map(k => { const r = m.get(k); return alive(r) ? r.v : null; }); }
  async put(k, v, ttl) { await this.ctx.storage.put(k, { v, e: ttl ? now() + ttl * 1000 : 0 }); this.changed([k]); }
  async del(k) { await this.ctx.storage.delete(k); this.changed([k]); }
  async delMany(ks) { for (let i = 0; i < ks.length; i += 128) await this.ctx.storage.delete(ks.slice(i, i + 128)); this.changed(ks); }
  // 🔒 черга на ключ: дії «прочитав → змінив → записав» з різних запитів ідуть строго по одній (без загублених змін)
  async lock(k) {
    this.q ||= new Map(); const prev = this.q.get(k) || Promise.resolve();
    let rel; const mine = new Promise(r => { rel = r; }); const tail = prev.then(() => mine);
    this.q.set(k, tail); await Promise.race([prev, new Promise(r => setTimeout(r, 8000))]); // попередній завис — не чекаємо вічно
    const id = crypto.randomUUID(); (this.rel ||= new Map()).set(id, () => { rel(); if (this.q.get(k) === tail) this.q.delete(k); });
    setTimeout(() => this.unlock(id), 8000); // запобіжник: запит упав — черга не зависає
    return id;
  }
  unlock(id) { const f = this.rel?.get(id); if (f) { this.rel.delete(id); f(); } }
  async list(prefix) { const m = await this.ctx.storage.list({ prefix }); return [...m].filter(([, r]) => alive(r)).map(([name]) => name); }
  // раз на годину прибираємо прострочене
  async alarm() {
    const m = await this.ctx.storage.list(); const dead = [...m].filter(([k, r]) => !k.startsWith('__') && !alive(r)).map(([k]) => k);
    for (let i = 0; i < dead.length; i += 128) await this.ctx.storage.delete(dead.slice(i, i + 128));
    await this.ctx.storage.setAlarm(now() + 3600e3);
  }
}

// той самий API, що storeDB, але всередині Store — без мережевих викликів
// картинки img:* лежать у спільному KV — у кожного закладу (крім VARVAR) свій префікс img:<заклад>/…
const imgKey = (k, v) => !v || v === MAIN ? k : 'img:' + v + '/' + k.slice(4);
function localDB(st, kv, venue) {
  const img = k => k.startsWith('img:'), held = new Set(), ik = k => imgKey(k, venue);
  const parse = (v, type) => v == null ? null : type === 'json' ? JSON.parse(v) : v;
  return {
    get: async (k, type) => img(k) ? kv.get(ik(k), type) : parse(await st.get(k), type),
    getMany: async (ks, type) => (await st.getMany(ks)).map(v => parse(v, type)),
    put: (k, v, o) => img(k) ? kv.put(ik(k), v, o) : st.put(k, String(v), o?.expirationTtl),
    delete: k => img(k) ? kv.delete(ik(k)) : st.del(k),
    deleteMany: ks => st.delMany(ks),
    locked: async (keys, fn) => {
      keys = [...new Set([].concat(keys))].sort(); const mine = keys.filter(k => !held.has(k));
      const ids = []; try { for (const k of mine) { ids.push(await st.lock(k)); held.add(k); } return await fn(); }
      finally { mine.forEach(k => held.delete(k)); for (const id of ids) st.unlock(id); }
    },
    list: async ({ prefix } = {}) => ({ keys: (await st.list(prefix)).map(name => ({ name })), list_complete: true }),
  };
}
export const storeStub = env => env.STORE.get(env.STORE.idFromName(doName(venueId())));
export function storeDB(kv, ns, venue = MAIN) {
  const s = ns.get(ns.idFromName(doName(venue)));
  const img = k => k.startsWith('img:'), ik = k => imgKey(k, venue);
  const held = new Set(); // ключі, які цей запит уже тримає (повторний вхід без самоблокування)
  const parse = (v, type) => v == null ? null : type === 'json' ? JSON.parse(v) : v;
  return {
    get: async (k, type) => img(k) ? kv.get(ik(k), type) : parse(await s.get(k), type),
    getMany: async (ks, type) => (await s.getMany(ks)).map(v => parse(v, type)),
    put: (k, v, o) => img(k) ? kv.put(ik(k), v, o) : s.put(k, String(v), o?.expirationTtl),
    delete: k => img(k) ? kv.delete(ik(k)) : s.del(k),
    deleteMany: ks => s.delMany(ks),
    // виконати fn під замком ключа(ів); вкладені однакові ключі в одному запиті не блокуються
    locked: async (keys, fn) => {
      keys = [...new Set([].concat(keys))].sort(); const mine = keys.filter(k => !held.has(k));
      const ids = []; try { for (const k of mine) { ids.push(await s.lock(k)); held.add(k); } return await fn(); }
      finally { mine.forEach(k => held.delete(k)); for (const id of ids) try { await s.unlock(id); } catch {} }
    },
    list: async ({ prefix } = {}) => ({ keys: (await s.list(prefix)).map(name => ({ name })), list_complete: true }),
  };
}
