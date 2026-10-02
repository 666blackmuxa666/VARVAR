// Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV).
// KV віддає старе значення до ~60 с після запису → губились швидкі натискання, двічі віднімалась виручка.
// env.DB = storeDB(...) має той самий API, що й KV (get/put/delete/list) + getMany; картинки img:* лишаються в KV.
import { DurableObject } from 'cloudflare:workers';

const now = () => Date.now();
// ключі, зміна яких оновлює екрани POS
const WATCH = /^(bill:|closed:|day:|exp:|ev:|menu$|staff$|ord:|fav$|shift$|z:|mov:|tipbal$|tippay:)/;
const alive = r => r && (!r.e || r.e > now());

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      if (!(await ctx.storage.get('__migrated'))) await this.migrate();
      if (!(await ctx.storage.get('__keep1'))) await this.keepHistory();
    });
  }
  // одноразово переносимо все з KV (крім картинок і старої черги друку)
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
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
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
  async list(prefix) { const m = await this.ctx.storage.list({ prefix }); return [...m].filter(([, r]) => alive(r)).map(([name]) => name); }
  // раз на годину прибираємо прострочене
  async alarm() {
    const m = await this.ctx.storage.list(); const dead = [...m].filter(([k, r]) => !k.startsWith('__') && !alive(r)).map(([k]) => k);
    for (let i = 0; i < dead.length; i += 128) await this.ctx.storage.delete(dead.slice(i, i + 128));
    await this.ctx.storage.setAlarm(now() + 3600e3);
  }
}

export const storeStub = env => env.STORE.get(env.STORE.idFromName('main'));
export function storeDB(kv, ns) {
  const s = ns.get(ns.idFromName('main'));
  const img = k => k.startsWith('img:');
  const parse = (v, type) => v == null ? null : type === 'json' ? JSON.parse(v) : v;
  return {
    get: async (k, type) => img(k) ? kv.get(k, type) : parse(await s.get(k), type),
    getMany: async (ks, type) => (await s.getMany(ks)).map(v => parse(v, type)),
    put: (k, v, o) => img(k) ? kv.put(k, v, o) : s.put(k, String(v), o?.expirationTtl),
    delete: k => img(k) ? kv.delete(k) : s.del(k),
    deleteMany: ks => s.delMany(ks),
    list: async ({ prefix } = {}) => ({ keys: (await s.list(prefix)).map(name => ({ name })), list_complete: true }),
  };
}
