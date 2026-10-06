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
const pub = a => a && { email: a.email, name: a.name, role: a.role, venues: a.venues || [] };

export class Hub extends DurableObject {
  get st() { return this.ctx.storage; }
  // ---- акаунти ----
  async acctGet(email) { return pub(await this.st.get('acct:' + normEmail(email))); }
  async acctCreate({ email, name, pass, role = 'owner' }) {
    email = normEmail(email); if (!okEmail(email)) return { error: 'Невірний email' };
    if (String(pass || '').length < 8) return { error: 'Пароль — щонайменше 8 символів' };
    if (await this.st.get('acct:' + email)) return { error: 'Такий email уже є' };
    const salt = rnd(16), a = { email, name: String(name || '').trim().slice(0, 60) || email, role: role === 'platform' ? 'platform' : 'owner', salt, hash: await passHash(String(pass), salt), venues: [], at: Date.now() };
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
    const token = rnd(24); await this.st.put('sess:' + token, { email, exp: Date.now() + SESS_MS });
    return { token, acct: pub(a) };
  }
  async session(token) {
    if (!/^[a-f0-9]{48}$/.test(token || '')) return null;
    const s = await this.st.get('sess:' + token); if (!s || s.exp < Date.now()) { if (s) await this.st.delete('sess:' + token); return null; }
    return pub(await this.st.get('acct:' + s.email));
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
    if (f.name != null) v.name = String(f.name).trim().slice(0, 60) || v.name;
    if (f.status && ['active', 'trial', 'off'].includes(f.status)) v.status = f.status;
    if (f.city != null) v.city = String(f.city).slice(0, 60);
    if (f.owner) { const a = await this.st.get('acct:' + normEmail(f.owner)); if (!a) return { error: 'Немає власника' }; const old = await this.st.get('acct:' + v.owner); if (old) { old.venues = (old.venues || []).filter(x => x !== id); await this.st.put('acct:' + old.email, old); } a.venues = [...new Set([...(a.venues || []), id])]; await this.st.put('acct:' + a.email, a); v.owner = a.email; }
    await this.st.put('venue:' + id, v); return v;
  }
  async seen(id) { const k = 'seen:' + id; await this.st.put(k, Date.now()); }
  async seenAll() { return Object.fromEntries([...(await this.st.list({ prefix: 'seen:' }))].map(([k, v]) => [k.slice(5), v])); }
}

export const hub = env => env.HUB.get(env.HUB.idFromName('hub'));
// активні заклади (для Cron); VARVAR окремо (MAIN)
export async function hubVenues(env) { if (!env.HUB) return []; return (await hub(env).venueList()).filter(v => v.id !== MAIN && v.status !== 'off').map(v => v.id); }
