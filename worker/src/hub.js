// 🌐 HUB — центральна база платформи (один Durable Object): акаунти власників, заклади, сесії кабінету.
// Дані закладів тут НЕ зберігаються — лише «хто чим володіє». Цифри для аналітики беруться з закладів (owner.js).
//   acct:<email>  { email, name, role: platform|owner, hash, salt, venues: [id], at }
//   venue:<id>    { id, name, owner, status: active|trial|off, plan, city, at }
//   sess:<token>  { email, exp }
import { DurableObject } from 'cloudflare:workers';
import { MAIN, isVenueId } from './venue.js';

const enc = new TextEncoder();
const hex = u8 => [...new Uint8Array(u8)].map(x => x.toString(16).padStart(2, '0')).join('');
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
async function passHash(pass, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
const normEmail = e => String(e || '').trim().toLowerCase();
const okEmail = e => /^[^\s@]{1,64}@[^\s@]{1,100}\.[a-z]{2,}$/.test(e);
const SESS_MS = 30 * 864e5;
const pub = a => a && { email: a.email, name: a.name, role: a.role, venues: a.venues || [], ...(a.verified === false ? { unverified: true } : {}) };

export class Hub extends DurableObject {
  get st() { return this.ctx.storage; }
  // ---- акаунти ----
  async acctGet(email) { return pub(await this.st.get('acct:' + normEmail(email))); }
  async acctCreate({ email, name, pass, role = 'owner', verify = false }) {
    email = normEmail(email); if (!okEmail(email)) return { error: 'Невірний email' };
    if (String(pass || '').length < 8) return { error: 'Пароль — щонайменше 8 символів' };
    if (await this.st.get('acct:' + email)) return { error: 'Такий email уже є' };
    const salt = rnd(16), a = { email, name: String(name || '').trim().slice(0, 60) || email, role: role === 'platform' ? 'platform' : 'owner', salt, hash: await passHash(String(pass), salt), venues: [], at: Date.now(), ...(verify ? { verified: false } : {}) };
    await this.st.put('acct:' + email, a); return pub(a);
  }
  async acctPass(email, pass) {
    const a = await this.st.get('acct:' + normEmail(email)); if (!a) return { error: 'Немає акаунта' };
    if (String(pass || '').length < 8) return { error: 'Пароль — щонайменше 8 символів' };
    a.salt = rnd(16); a.hash = await passHash(String(pass), a.salt); await this.st.put('acct:' + a.email, a);
    const s = await this.st.list({ prefix: 'sess:' }); for (const [k, v] of s) if (v.email === a.email) await this.st.delete(k); // вийти скрізь
    return { ok: true };
  }
  async acctList() { return [...(await this.st.list({ prefix: 'acct:' })).values()].map(pub); }
  // ---- вхід ----
  async login(email, pass) {
    email = normEmail(email);
    const fk = 'fail:' + email, f = (await this.st.get(fk)) || { n: 0, at: 0 };
    if (f.n >= 8 && Date.now() - f.at < 15 * 60e3) return { error: 'Забагато спроб — зачекайте 15 хв' };
    const a = await this.st.get('acct:' + email);
    if (!a || (await passHash(String(pass || ''), a.salt)) !== a.hash) { await this.st.put(fk, { n: f.n + 1, at: Date.now() }); return { error: 'Невірний email або пароль' }; }
    await this.st.delete(fk);
    if (a.verified === false) return { error: 'Підтвердіть email — перейдіть за посиланням з листа', unverified: true };
    const token = rnd(24); await this.st.put('sess:' + token, { email, exp: Date.now() + SESS_MS });
    return { token, acct: pub(a) };
  }
  async session(token) {
    if (!/^[a-f0-9]{48}$/.test(token || '')) return null;
    const s = await this.st.get('sess:' + token); if (!s || s.exp < Date.now()) { if (s) await this.st.delete('sess:' + token); return null; }
    return pub(await this.st.get('acct:' + s.email));
  }
  // ✉️ одноразові посилання з листа: verify — підтвердити пошту (і задати пароль), reset — новий пароль
  async mailToken(email, kind) {
    const a = await this.st.get('acct:' + normEmail(email)); if (!a) return null;
    const rk = 'mt:' + kind + ':' + a.email, last = await this.st.get(rk); if (last && Date.now() - last < 60e3) return { error: 'Лист уже надіслано — зачекайте хвилину' };
    const t = rnd(24); await this.st.put('tok:' + t, { email: a.email, kind, exp: Date.now() + (kind === 'verify' ? 7 * 864e5 : 3600e3) }); await this.st.put(rk, Date.now());
    return { t, email: a.email, name: a.name };
  }
  async useToken(t, kind, pass) {
    if (!/^[a-f0-9]{48}$/.test(t || '')) return { error: 'Посилання недійсне' };
    const x = await this.st.get('tok:' + t); if (!x || x.kind !== kind || x.exp < Date.now()) return { error: 'Посилання недійсне або застаріло — запросіть новий лист' };
    const a = await this.st.get('acct:' + x.email); if (!a) return { error: 'Немає акаунта' };
    if (pass != null) { if (String(pass).length < 8) return { error: 'Пароль — щонайменше 8 символів' }; a.salt = rnd(16); a.hash = await passHash(String(pass), a.salt); const s = await this.st.list({ prefix: 'sess:' }); for (const [k, v] of s) if (v.email === a.email) await this.st.delete(k); }
    else if (kind === 'reset') return { error: 'Вкажіть новий пароль' };
    a.verified = true; await this.st.put('acct:' + a.email, a); await this.st.delete('tok:' + t);
    const token = rnd(24); await this.st.put('sess:' + token, { email: a.email, exp: Date.now() + SESS_MS }); return { token, acct: pub(a) };
  }
  async logout(token) { if (/^[a-f0-9]{48}$/.test(token || '')) await this.st.delete('sess:' + token); }
  // ---- заклади ----
  async venueGet(id) { return (await this.st.get('venue:' + id)) || null; }
  async venueList() { return [...(await this.st.list({ prefix: 'venue:' })).values()]; }
  async venueCreate({ id, name, owner, status = 'trial', city = '' }) {
    id = String(id || '').toLowerCase(); if (!isVenueId(id)) return { error: 'Адреса закладу: латиниця, цифри, дефіс (2–31)' };
    if (await this.st.get('venue:' + id)) return { error: 'Така адреса вже зайнята' };
    const a = await this.st.get('acct:' + normEmail(owner)); if (!a) return { error: 'Немає власника з таким email' };
    const v = { id, name: String(name || id).trim().slice(0, 60), owner: a.email, status, plan: 'start', city: String(city).slice(0, 60), at: Date.now() };
    await this.st.put('venue:' + id, v); a.venues = [...new Set([...(a.venues || []), id])]; await this.st.put('acct:' + a.email, a);
    return v;
  }
  async venueSet(id, f) {
    const v = await this.st.get('venue:' + id); if (!v) return { error: 'Немає закладу' };
    if (id === MAIN && f.status === 'off') return { error: 'VARVAR не вимикається' };
    if (f.name != null) v.name = String(f.name).trim().slice(0, 60) || v.name;
    if (f.status && ['active', 'trial', 'off'].includes(f.status)) v.status = f.status;
    if (f.city != null) v.city = String(f.city).slice(0, 60);
    if (f.owner) { const a = await this.st.get('acct:' + normEmail(f.owner)); if (!a) return { error: 'Немає власника' }; const old = await this.st.get('acct:' + v.owner); if (old) { /* старий власник зберігає доступ як керуючий — забрати можна окремо */ } a.venues = [...new Set([...(a.venues || []), id])]; await this.st.put('acct:' + a.email, a); v.owner = a.email; }
    await this.st.put('venue:' + id, v); return v;
  }
  // ---- керування (консоль платформи) ----
  async acctSet(email, f) { const a = await this.st.get('acct:' + normEmail(email)); if (!a) return { error: 'Немає акаунта' }; if (f.name != null) a.name = String(f.name).trim().slice(0, 60) || a.name; await this.st.put('acct:' + a.email, a); return pub(a); }
  async acctDel(email) {
    const a = await this.st.get('acct:' + normEmail(email)); if (!a) return { error: 'Немає акаунта' }; if (a.role === 'platform') return { error: 'Акаунт платформи не видаляється' };
    const own = [...(await this.st.list({ prefix: 'venue:' })).values()].filter(v => v.owner === a.email); if (own.length) return { error: `Спершу передайте іншому власнику заклади: ${own.map(v => v.name).join(', ')}` };
    await this.st.delete('acct:' + a.email); const s = await this.st.list({ prefix: 'sess:' }); for (const [k, v] of s) if (v.email === a.email) await this.st.delete(k); return { ok: true };
  }
  // доступ до закладу (керуючий, бухгалтер…) — бачить заклад у своєму кабінеті; власник лишається один
  async grant(id, email, on) {
    const v = await this.st.get('venue:' + id); if (!v) return { error: 'Немає закладу' };
    const a = await this.st.get('acct:' + normEmail(email)); if (!a) return { error: 'Немає акаунта з таким email' };
    if (!on && v.owner === a.email) return { error: 'Це власник — спершу передайте заклад іншому' };
    a.venues = on ? [...new Set([...(a.venues || []), id])] : (a.venues || []).filter(x => x !== id); await this.st.put('acct:' + a.email, a); return pub(a);
  }
  async venueDel(id) {
    if (id === MAIN) return { error: 'VARVAR не видаляється' };
    const v = await this.st.get('venue:' + id); if (!v) return { error: 'Немає закладу' };
    for (const [k, a] of await this.st.list({ prefix: 'acct:' })) if ((a.venues || []).includes(id)) { a.venues = a.venues.filter(x => x !== id); await this.st.put(k, a); }
    await this.st.delete(['venue:' + id, 'seen:' + id]); return { ok: true };
  }
  // 📨 вхідні кабінету: 💡 побажання персоналу й 🆘 допомога з усіх закладів (копія — щоб кабінет читав одним запитом)
  async msgAdd(m) { const id = Date.now().toString(36) + rnd(3), x = { id, kind: m.kind === 'help' ? 'help' : 'idea', venue: String(m.venue || ''), vname: String(m.vname || '').slice(0, 60), by: String(m.by || '').slice(0, 60), role: String(m.role || '').slice(0, 20), text: String(m.text || '').slice(0, 1500), at: Date.now() };
    await this.st.put('msg:' + id, x); const l = await this.st.list({ prefix: 'msg:' }); if (l.size > 500) await this.st.delete([...l.keys()].slice(0, l.size - 500)); return x; }
  async msgList(venues) { return [...(await this.st.list({ prefix: 'msg:', reverse: true, limit: 300 })).values()].filter(m => !venues || venues.includes(m.venue)); }
  async msgSet(id, f, venues) { const m = await this.st.get('msg:' + id); if (!m || (venues && !venues.includes(m.venue))) return { error: 'Не знайдено' }; if (f.del) { await this.st.delete('msg:' + id); return { ok: true }; } m.done = m.done ? 0 : Date.now(); await this.st.put('msg:' + id, m); return m; }
  async seen(id) { const k = 'seen:' + id; await this.st.put(k, Date.now()); }
  async seenAll() { return Object.fromEntries([...(await this.st.list({ prefix: 'seen:' }))].map(([k, v]) => [k.slice(5), v])); }
}

export const hub = env => env.HUB.get(env.HUB.idFromName('hub'));
// активні заклади (для Cron); VARVAR окремо (MAIN)
export async function hubVenues(env) { if (!env.HUB) return []; return (await hub(env).venueList()).filter(v => v.id !== MAIN && v.status !== 'off').map(v => v.id); }
