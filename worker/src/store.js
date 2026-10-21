// Надійне сховище закладу: Durable Object (одна копія, без затримок узгодження, як у KV).
// KV віддає старе значення до ~60 с після запису → губились швидкі натискання, двічі віднімалась виручка.
// env.DB = storeDB(...) має той самий API, що й KV (get/put/delete/list) + getMany; картинки img:* лишаються в KV.
import { DurableObject } from 'cloudflare:workers';
import { handle } from './index.js';
import { ALS, MAIN, doName, venueEnv, venueId } from './venue.js';
import { SCHEMA, migrate } from './migrate.js';
import { LEDGER_DDL, LEDGER_TABLES } from './ledgerdb.js';
const LOCK_MS = 30000; // 🔒 скільки максимум тримається / чекається замок ключа (довгі дії — ПРРО, банк — вкладаються)

const now = () => Date.now();
// ключі, зміна яких оновлює екрани POS
const WATCH = /^(bill:|closed:|day:|exp:|ev:|menu$|staff$|ord:|fav$|shift$|z:|mov:|tipbal$|tippay:|void:|kq:|ing$|cards$|stk:|invl:|sups$|cntl$|cnt:open|att:|plan:|pay:|swaps$|task:|lookv$|tpq$)/;
const alive = r => r && (!r.e || r.e > now());
const SQLK = '§sql:'; // запис бекапу з рядками SQL-таблиці (не ключ сховища)

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch {} // 💤 пінг не будить DO
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
      if (this.venue !== venue) { this.venue = venue; if ((await this.ctx.storage.get('__venue')) !== venue) await this.ctx.storage.put('__venue', venue); } // ⏰ будильнику треба знати, чий він
      if (this.schema !== SCHEMA) { // 🧬 дані закладу — до поточної версії (один раз на запуск об'єкта; паралельні запити чекають ту саму міграцію)
        this.mig ||= ALS.run({ venue }, () => migrate(env)).then(v => { this.schema = v; }, () => {}).finally(() => { this.mig = null; });
        await this.mig;
      }
      const cron = new URL(req.url).pathname === '/__cron';
      if (!cron) await this.wake(req.method === 'GET' ? 3600e3 : 300e3); // дія в закладі → справи будуть перевірені за 5 хв
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
  async wipe() { await this.ctx.storage.deleteAll(); } // 🗑 видалення закладу (лише з консолі платформи)
  // 💾 бекап / відновлення: увесь вміст сховища закладу як є (з терміном життя записів)
  // 🔐 у бекап не йдуть сесії/токени входу й лічильники ліміти (вони короткоживучі; копія бекапу не має давати доступ до каси чи кабінету гостя)
  static volatile = k => k.startsWith('__') || k === 'failall' || /^(pos|gs|gl|glu|qid|ipdev|prl|prfail|jserr|gorl|wlrl|lrl|gchrl|callrl|fail):/.test(k);
  // 📒 SQL-облік (ledgerdb.js): таблиці створюються при першому зверненні; stmts = [[запит, ...аргументи], …] — усі разом в одній транзакції
  sqlInit() { if (this.sqlOk) return; for (const q of LEDGER_DDL) this.ctx.storage.sql.exec(q); this.sqlOk = 1; }
  sqlRun(stmts) { this.sqlInit(); return this.ctx.storage.transactionSync(() => stmts.map(([q, ...a]) => [...this.ctx.storage.sql.exec(q, ...a.map(x => x === undefined ? null : x))])); }
  async dump() { this.sqlInit(); return [...[...(await this.ctx.storage.list())].filter(([k]) => !Store.volatile(k)), ...LEDGER_TABLES.map(t => [SQLK + t, { v: [...this.ctx.storage.sql.exec(`SELECT * FROM ${t}`)], e: 0 }])]; }
  // відновлення SQL: документи — оновлюються з копії (не видаляються: документ не зникає); журнали — лише дописуються відсутні рядки
  sqlRestore(t, rows) {
    if (!LEDGER_TABLES.includes(t) || !Array.isArray(rows) || !rows.length) return; this.sqlInit();
    const cols = Object.keys(rows[0]).filter(c => /^[a-z]+$/.test(c)), q = `INSERT OR ${t === 'doc' ? 'REPLACE' : 'IGNORE'} INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    this.ctx.storage.transactionSync(() => { for (const r of rows) this.ctx.storage.sql.exec(q, ...cols.map(c => r[c] ?? null)); });
  }
  async restore(entries) {
    // спершу записуємо новий вміст, лише потім прибираємо зайве: збій посередині лишає суміш, а не порожню базу (deleteAll не атомарний)
    for (const e of entries) if (Array.isArray(e) && typeof e[0] === 'string' && e[0].startsWith(SQLK)) this.sqlRestore(e[0].slice(SQLK.length), e[1]?.v);
    entries = entries.filter(e => Array.isArray(e) && typeof e[0] === 'string' && !e[0].startsWith(SQLK) && !Store.volatile(e[0]));
    for (let i = 0; i < entries.length; i += 128) await this.ctx.storage.put(Object.fromEntries(entries.slice(i, i + 128)));
    const want = new Set(entries.map(e => e[0])), stale = [...(await this.ctx.storage.list()).keys()].filter(k => !Store.volatile(k) && !want.has(k));
    for (let i = 0; i < stale.length; i += 128) await this.ctx.storage.delete(stale.slice(i, i + 128));
    this.schema = undefined; // старий бекап → міграції пройдуть знову
    this.changed(['bill:', 'menu', 'staff', 'closed:', 'day:']); return entries.length;
  }
  async delMany(ks) { for (let i = 0; i < ks.length; i += 128) await this.ctx.storage.delete(ks.slice(i, i + 128)); this.changed(ks); }
  // 🔒 черга на ключ: дії «прочитав → змінив → записав» з різних запитів ідуть строго по одній (без загублених змін)
  async lock(k) {
    this.q ||= new Map(); const prev = this.q.get(k) || Promise.resolve();
    let rel; const mine = new Promise(r => { rel = r; }); const tail = prev.then(() => mine);
    this.q.set(k, tail); const done = () => { rel(); if (this.q.get(k) === tail) this.q.delete(k); };
    if (!(await Promise.race([prev.then(() => 1), new Promise(r => setTimeout(r, LOCK_MS, 0))]))) { done(); throw new Error('Зайнято — спробуйте ще раз'); } // попередній завис — не заходимо поверх нього (інакше дві зміни перетруть одна одну), а відмовляємо
    const id = crypto.randomUUID(); (this.rel ||= new Map()).set(id, done);
    setTimeout(() => this.unlock(id), LOCK_MS); // запобіжник: запит упав і не відпустив — черга не зависає назавжди
    return id;
  }
  unlock(id) { const f = this.rel?.get(id); if (f) { this.rel.delete(id); f(); } }
  async list(prefix) { const m = await this.ctx.storage.list({ prefix }); return [...m].filter(([, r]) => alive(r)).map(([name]) => name); }
  // ⏰ будильник закладу: кожен заклад прокидається сам, коли в нього є справи (броні, відгуки, доставки),
  // інакше — раз на годину для щоденних задач (авто-Z, бекап, ДН гостей). Без центрального обходу всіх закладів.
  async wake(ms) { // підтягнути будильник не пізніше ніж за ms (після дій у закладі)
    const t = now() + ms; if (this.at === undefined) this.at = await this.ctx.storage.getAlarm();
    if (!this.at || this.at > t) { await this.ctx.storage.setAlarm(t); this.at = t; }
  }
  async alarm() {
    const t = now(), venue = (await this.ctx.storage.get('__venue')) || MAIN; let next = t + 3600e3;
    const day = new Date(t).toISOString().slice(0, 10);
    if ((await this.ctx.storage.get('__gc')) !== day) { // 🧹 прострочене — раз на день (повний перегляд бази дорогий)
      const m = await this.ctx.storage.list(); const dead = [...m].filter(([k, r]) => !k.startsWith('__') && !alive(r)).map(([k]) => k);
      for (let i = 0; i < dead.length; i += 128) await this.ctx.storage.delete(dead.slice(i, i + 128));
      await this.ctx.storage.put('__gc', day);
    }
    try {
      const r = await this.fetch(new Request('https://in/__cron', { headers: { 'x-cron': this.env.MASTER_KEY ? await (await import('./owner.js')).intSecret(this.env) : '1', ...(venue === MAIN ? {} : { 'x-venue': venue }) } }));
      if (r.status === 404) { this.at = null; return; } // заклад видалено — більше не будимо
      const j = await r.json().catch(() => ({})); if (j.next > 0) next = j.next;
    } catch (e) { console.log('alarm', venue, e.message); next = t + 300e3; }
    this.at = Math.min(Math.max(next, t + 60e3), t + 3600e3); await this.ctx.storage.setAlarm(this.at); console.log('⏰', venue, 'наступний через', Math.round((this.at - t) / 60e3), 'хв');
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
    sql: stmts => st.sqlRun(stmts), // 📒 облік: [[запит, ...аргументи], …] → рядки кожного запиту (одна транзакція)
    dump: () => st.dump(), restore: e => st.restore(e), kv, // 💾 бекапи (лише всередині Store)
  };
}
export const storeStub = env => env.STORE.get(env.STORE.idFromName(doName(venueId())));
export function storeDB(kv, ns, venue = MAIN) {
  const s = ns.get(ns.idFromName(doName(venue)));
  const img = k => k.startsWith('img:'), ik = k => imgKey(k, venue);
  const kvRaw = kv;
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
    sql: stmts => s.sqlRun(stmts),
    kv: kvRaw, // сирий KV (бекапи bak:*)
  };
}
