// Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV).
// KV віддає старе значення до ~60 с після запису → губились швидкі натискання, двічі віднімалась виручка.
// env.DB = storeDB(...) має той самий API, що й KV (get/put/delete/list) + getMany; картинки img:* лишаються в KV.
import { DurableObject } from 'cloudflare:workers';

const now = () => Date.now();
const alive = r => r && (!r.e || r.e > now());

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => { if (!(await ctx.storage.get('__migrated'))) await this.migrate(); });
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
  async get(k) { const r = await this.ctx.storage.get(k); return alive(r) ? r.v : null; }
  async getMany(ks) { const m = await this.ctx.storage.get(ks); return ks.map(k => { const r = m.get(k); return alive(r) ? r.v : null; }); }
  async put(k, v, ttl) { await this.ctx.storage.put(k, { v, e: ttl ? now() + ttl * 1000 : 0 }); }
  async del(k) { await this.ctx.storage.delete(k); }
  async delMany(ks) { for (let i = 0; i < ks.length; i += 128) await this.ctx.storage.delete(ks.slice(i, i + 128)); }
  async list(prefix) { const m = await this.ctx.storage.list({ prefix }); return [...m].filter(([, r]) => alive(r)).map(([name]) => name); }
  // раз на годину прибираємо прострочене
  async alarm() {
    const m = await this.ctx.storage.list(); const dead = [...m].filter(([k, r]) => k !== '__migrated' && !alive(r)).map(([k]) => k);
    for (let i = 0; i < dead.length; i += 128) await this.ctx.storage.delete(dead.slice(i, i + 128));
    await this.ctx.storage.setAlarm(now() + 3600e3);
  }
}

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
