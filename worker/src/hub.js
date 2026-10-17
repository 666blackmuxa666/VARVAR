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
const REF_LIMIT = 12; // 🎁 макс. подарункових місяців на одного рефері
const SESS_MS = 30 * 864e5;
const pub = a => a && { email: a.email, name: a.name, role: a.role, venues: a.venues || [], ...(a.verified === false ? { unverified: true } : {}), ...(a.av ? { av: a.av } : {}) }; // av — аватарка (data:, ~30 КБ)

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
  async acctList() { return [...(await this.st.list({ prefix: 'acct:' })).values()].map(x => { const { av, ...r } = pub(x); return r; }); } // без аватарок — список легкий
  // 👤 аватарка власника: квадрат 256 JPEG як data: у самому акаунті ('' — прибрати)
  async acctAv(email, data) {
    const a = await this.st.get('acct:' + normEmail(email)); if (!a) return { error: 'Немає акаунта' };
    if (!data) delete a.av; else if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data) && data.length <= 120000) a.av = data; else return { error: 'Фото завелике — оберіть інше' };
    await this.st.put('acct:' + a.email, a); return { ok: true, av: a.av || '' };
  }
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
    const t = rnd(24); await this.st.put('tok:' + t, { email: a.email, kind, exp: Date.now() + (kind !== 'reset' ? 7 * 864e5 : 3600e3) }); await this.st.put(rk, Date.now());
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
  // ⚡ самореєстрація: акаунт (непідтверджений) + «заявка на заклад»; заклад створюється після підтвердження пошти (signupTake)
  async signupStart({ email, name, pass, place, city, ref, ip }) {
    email = normEmail(email); if (!okEmail(email)) return { error: 'Невірний email' };
    const now = Date.now();
    if (ip) { const rk = 'srl:' + ip.slice(0, 64), fresh = ((await this.st.get(rk)) || []).filter(t => now - t < 3600e3); // ліміт з IP (без IP — лише тестовий виклик)
      if (fresh.length >= 4) return { error: 'Забагато спроб — спробуйте пізніше або залиште заявку' };
      await this.st.put(rk, [...fresh, now]); }
    const old = await this.st.get('acct:' + email);
    if (old) { if (old.verified !== false || !(await this.st.get('signup:' + email))) return { error: 'Такий email уже зареєстровано — увійдіть у кабінет' }; await this.st.delete('acct:' + email); } // непідтверджену спробу можна повторити
    const a = await this.acctCreate({ email, name, pass, verify: true }); if (a.error) return a;
    await this.st.put('signup:' + email, { place: String(place || '').trim().slice(0, 60), city: String(city || '').trim().slice(0, 60), ref: String(ref || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20), at: now });
    this.ctx.storage.setAlarm?.(now + 864e5);
    return this.mailToken(email, 'signup');
  }
  async signupTake(email) { const k = 'signup:' + normEmail(email), p = await this.st.get(k); if (p) await this.st.delete(k); return p || null; }
  async logout(token) { if (/^[a-f0-9]{48}$/.test(token || '')) await this.st.delete('sess:' + token); }
  // ---- заклади ----
  async venueGet(id) { return (await this.st.get('venue:' + id)) || null; }
  async venueList() { return [...(await this.st.list({ prefix: 'venue:' })).values()]; }
  // 🔢 скільки справжніх закладів (для лічильника акції на posatom.online) — з пам'яті, перерахунок не частіше ніж раз на 10 хв
  async venueCount() {
    if (this.cnt && Date.now() - this.cnt.at < 600e3) return this.cnt.n;
    const n = (await this.venueList()).filter(v => v.id !== MAIN && v.id !== 'atom-demo' && !v.id.startsWith('demo-') && v.status !== 'off').length;
    this.cnt = { n, at: Date.now() }; return n;
  }
  // 💳 щоденна перевірка оплат: перебір — тут, усередині реєстру (локально); назовні лише заклади, з якими є що робити
  async billScan() {
    const { billState, GRACE } = await import('./billing.js'), out = [];
    for (const v of await this.venueList()) {
      if (v.id === MAIN || v.id === 'atom-demo' || v.id.startsWith('demo-') || v.status === 'off') continue;
      const s = billState(v);
      if ((!s.auto && [3, 0].includes(s.left)) || (v.unlockErr && !s.lock) || s.left === -GRACE - 1 || (s.lock && !v.locked)) out.push({ v, acct: pub(await this.st.get('acct:' + normEmail(v.owner))) || null });
    }
    return out;
  }
  async venueCreate({ id, name, owner, status = 'trial', city = '', ref = '' }) {
    id = String(id || '').toLowerCase(); if (!isVenueId(id)) return { error: 'Адреса закладу: латиниця, цифри, дефіс (2–31)' };
    if (await this.st.get('venue:' + id)) return { error: 'Така адреса вже зайнята' };
    const a = await this.st.get('acct:' + normEmail(owner)); if (!a) return { error: 'Немає власника з таким email' };
    const v = { id, name: String(name || id).trim().slice(0, 60), owner: a.email, status, plan: 'start', city: String(city).slice(0, 60), at: Date.now() };
    ref = String(ref || '').toLowerCase().replace(/[^a-z0-9]/g, ''); if (ref && (await this.st.get('refc:' + ref)) && (await this.st.get('refc:' + ref)) !== id) v.refBy = ref; // 🎁 хто привів — незмінне
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
    await this.st.put('msg:' + id, x); const l = await this.st.list({ prefix: 'msg:' }); // 🔒 стеля на заклад (100): спам одного закладу не витісняє звернення інших; загальна — 500
    const own = [...l].filter(([, v]) => v.venue === x.venue).map(([k]) => k); if (own.length > 100) await this.st.delete(own.slice(0, own.length - 100));
    if (l.size > 500) await this.st.delete([...l.keys()].slice(0, l.size - 500)); return x; }
  // 💬 чат у зверненні: from 'a' — ATOM (кабінет), 'u' — працівник закладу; повідомлення знову стає «новим», коли пише працівник
  async msgSay(id, from, text, venues) { const m = await this.st.get('msg:' + id); if (!m || (venues && !venues.includes(m.venue))) return { error: 'Не знайдено' };
    m.chat = [...(m.chat || []), { from: from === 'a' ? 'a' : 'u', text: String(text || '').slice(0, 1500), at: Date.now() }].slice(-60); if (from !== 'a') m.done = 0; await this.st.put('msg:' + id, m); return m; }
  async msgList(venues) { return [...(await this.st.list({ prefix: 'msg:', reverse: true, limit: 300 })).values()].filter(m => !venues || venues.includes(m.venue)); }
  async msgSet(id, f, venues) { const m = await this.st.get('msg:' + id); if (!m || (venues && !venues.includes(m.venue))) return { error: 'Не знайдено' }; if (f.del) { await this.st.delete('msg:' + id); return { ok: true }; } m.done = m.done ? 0 : Date.now(); await this.st.put('msg:' + id, m); return m; }
  async seen(id) { const k = 'seen:' + id; await this.st.put(k, Date.now()); }
  async seenAll() { return Object.fromEntries([...(await this.st.list({ prefix: 'seen:' }))].map(([k, v]) => [k.slice(5), v])); }
  // 💳 оплата ATOM: оплачено до, автосписання, історія оплат; payOnce — один платіж LiqPay обробляється один раз
  async venueBill(id, f) {
    const v = await this.st.get('venue:' + id); if (!v) return { error: 'Немає закладу' };
    for (const k of ['paidTill', 'auto', 'subOrder', 'locked', 'unlockErr']) if (f[k] !== undefined) v[k] = f[k];
    if (f.status && ['active', 'trial', 'off'].includes(f.status)) v.status = f.status;
    if (f.pay) v.pays = [f.pay, ...(v.pays || [])].slice(0, 36);
    await this.st.put('venue:' + id, v); return v;
  }
  async payOnce(pid) { const k = 'lpp:' + pid; if (await this.st.get(k)) return false; await this.st.put(k, Date.now()); return true; }
  // 🚀 ATOM: заявки з сайту posatom.online (CRM «Продажі»), ліміт з IP, статистика переглядів
  async leadAdd(l, ip) {
    if (!ip.startsWith('own:')) this.ctx.storage.setAlarm?.(Date.now() + 864e5);
    const rk = 'lrl:' + (ip || 'none').slice(0, 64), r = (await this.st.get(rk)) || []; const now = Date.now(), fresh = r.filter(t => now - t < 3600e3);
    if (fresh.length >= 3) return { error: 'Забагато заявок — спробуйте пізніше або напишіть у Telegram' };
    await this.st.put(rk, [...fresh, now]);
    const id = now.toString(36) + rnd(3), x = { id, name: String(l.name || '').trim().slice(0, 60), phone: String(l.phone || '').trim().slice(0, 30), place: String(l.place || '').trim().slice(0, 80), city: String(l.city || '').trim().slice(0, 60), msg: String(l.msg || '').trim().slice(0, 800), src: String(l.src || '').slice(0, 30), ref: String(l.ref || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20), st: 'new', note: '', next: 0, at: now };
    await this.st.put('lead:' + id, x); await this.hit('lead'); return x;
  }
  // 🎁 реферальна програма (етап 1, вручну): refc:<код> → id закладу; ref:<код> → { n, list } — лічильник подарованих місяців рефері
  async refCode(id) {
    const v = await this.st.get('venue:' + id); if (!v) return null; if (v.refCode) return v.refCode;
    const A = 'abcdefghjkmnpqrstuvwxyz23456789'; let c = '';
    for (let i = 0; i < 20; i++) { c = [...crypto.getRandomValues(new Uint8Array(6))].map(x => A[x % A.length]).join(''); if (!(await this.st.get('refc:' + c))) break; }
    await this.st.put('refc:' + c, id); v.refCode = c; await this.st.put('venue:' + id, v); return c;
  }
  async refStat(id) {
    const code = await this.refCode(id); if (!code) return { error: 'Немає закладу' };
    const r = (await this.st.get('ref:' + code)) || { n: 0 }, leads = [...(await this.st.list({ prefix: 'lead:' })).values()].filter(x => x.ref === code);
    return { code, n: r.n || 0, limit: REF_LIMIT, blocked: !!r.blocked, leads: leads.length, won: leads.filter(x => x.st === 'won' || x.st === 'trial').length };
  }
  // подарунок приведеному (id) і, якщо ліміт не вичерпано, рефері: повертає { friend, referrer, capped } — місяці додає викликач
  async refApply(id, code) {
    const v = await this.st.get('venue:' + id); if (!v) return { error: 'Немає закладу' };
    code = String(code || v.refBy || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!code) return { friend: true, referrer: null };
    if (v.refPaid) return { error: 'Подарунок за цей заклад уже нараховано' };
    const rid = await this.st.get('refc:' + code); if (!rid) return { error: 'Невірний код рефері' };
    const rv = await this.st.get('venue:' + rid); if (!rv) return { error: 'Немає закладу рефері' };
    if (rid === id || rv.owner === v.owner) return { error: 'Свої заклади не рахуються' };
    { let cur = rv; for (let i = 0; i < 6 && cur; i++) { // ланцюжок запрошень A→B→C→A: рефері не може бути «нащадком» цього закладу (не лише пряма взаємність)
        if (cur.id === id || cur.owner === v.owner && cur.id !== rv.id) return { error: 'Взаємні запрошення не рахуються' };
        const up = cur.refBy && await this.st.get('refc:' + cur.refBy); cur = up ? await this.st.get('venue:' + up) : null; } }
    const r = (await this.st.get('ref:' + code)) || { n: 0, list: [] }, capped = r.blocked || r.n >= REF_LIMIT;
    v.refBy = code; v.refPaid = Date.now(); await this.st.put('venue:' + id, v);
    if (!capped) { r.n++; r.list = [{ v: id, ts: v.refPaid }, ...(r.list || [])].slice(0, 50); await this.st.put('ref:' + code, r); }
    return { friend: true, referrer: capped ? null : rid, capped };
  }
  async refBlock(code, on) { code = String(code || '').toLowerCase(); if (!(await this.st.get('refc:' + code))) return { error: 'Невірний код' }; const r = (await this.st.get('ref:' + code)) || { n: 0, list: [] }; r.blocked = on ? 1 : 0; await this.st.put('ref:' + code, r); return { ok: true }; }
  // 💬 контакти сайту ATOM (кабінет → 🚀 Продажі): телефон, посилання Telegram і Viber
  async atomCfg(f) {
    const c = (await this.st.get('atomcfg')) || {}; if (!f) return c;
    const url = v => { v = String(v || '').trim().slice(0, 200); return !v || /^(https:\/\/|viber:\/\/|tg:\/\/)/.test(v) ? v : ''; };
    const n = { phone: String(f.phone ?? c.phone ?? '').trim().slice(0, 30), tg: url(f.tg ?? c.tg), viber: url(f.viber ?? c.viber) };
    await this.st.put('atomcfg', n); return n;
  }
  // 💬 ATOM: живий чат з сайту (ШІ-асистент). Розмова — окремо в chat:<leadId> (до 40 повідомлень по 500 символів), у lead лише прапорці chat/hot/last
  async chatCfg(f) {
    const c = (await this.st.get('chatcfg')) || { on: 0, tg: '' }; if (!f) return c;
    const n = { on: (f.on ?? c.on) ? 1 : 0, tg: String(f.tg ?? c.tg ?? '').replace(/[^\d-]/g, '').slice(0, 20) };
    await this.st.put('chatcfg', n); return n;
  }
  async chatOpen(ip) { // 1 новий чат на IP за годину
    const rk = 'ccr:' + (ip || 'none').slice(0, 64), now = Date.now(), r = ((await this.st.get(rk)) || []).filter(t => now - t < 3600e3);
    if (r.length >= 1) return { error: 'Забагато чатів — залиште заявку в формі або напишіть у Telegram', code: 429 };
    await this.st.put(rk, [...r, now]);
    const id = now.toString(36) + rnd(3), k = rnd(8);
    await this.st.put('lead:' + id, { id, name: 'Гість з чату', phone: '', place: '', city: '', msg: '', src: 'chat', ref: '', st: 'new', note: '', next: 0, at: now, chat: 1, hot: 0, last: now });
    await this.st.put('chat:' + id, { k, m: [] }); return { id, k };
  }
  async chatGuest(id, k, text, ip) { // повідомлення гостя: ліміт 20 за 10 хв з IP, до 40 у розмові
    const c = await this.st.get('chat:' + String(id)), x = await this.st.get('lead:' + String(id)); if (!c || !x || c.k !== k) return { error: 'Чат закінчився — почніть новий', code: 404 };
    const rk = 'cmr:' + (ip || 'none').slice(0, 64), now = Date.now(), r = ((await this.st.get(rk)) || []).filter(t => now - t < 600e3);
    if (r.length >= 20) return { error: 'Забагато повідомлень — зачекайте кілька хвилин', code: 429 };
    if (c.m.length >= 40) return { error: 'Розмова завелика — залиште телефон у формі нижче', code: 429 };
    await this.st.put(rk, [...r, now]); c.m.push({ r: 'g', t: String(text).slice(0, 500), ts: now }); x.last = now;
    await this.st.put('chat:' + id, c); await this.st.put('lead:' + id, x); return { m: c.m, lead: x };
  }
  async chatBot(id, reply, u = {}) { // відповідь асистента + дані, які гість сам назвав; newHot — перший раз «тепла»
    const c = await this.st.get('chat:' + String(id)), x = await this.st.get('lead:' + String(id)); if (!c || !x) return { error: 'Не знайдено' };
    const cl = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);
    if (reply && c.m.length < 40) c.m.push({ r: 'a', t: String(reply).slice(0, 500), ts: Date.now() });
    if (u.name && x.name === 'Гість з чату') x.name = cl(u.name, 60) || x.name;
    if (u.place && !x.place) x.place = cl(u.place, 80); if (u.city && !x.city) x.city = cl(u.city, 60); if (u.phone && !x.phone) x.phone = cl(u.phone, 30);
    const newHot = !!(u.hot && x.phone && !x.hot); if (newHot) { x.hot = 1; x.msg = (c.m.filter(m => m.r === 'g').map(m => m.t).join(' · ')).slice(0, 800); }
    x.last = Date.now(); await this.st.put('chat:' + id, c); await this.st.put('lead:' + id, x); if (newHot) await this.hit('lead'); return { lead: x, newHot };
  }
  async chatGet(id) { const c = await this.st.get('chat:' + String(id)); return c ? { m: c.m } : { error: 'Розмови немає' }; }
  async leadList() { return [...(await this.st.list({ prefix: 'lead:', reverse: true, limit: 500 })).values()]; }
  async leadSet(id, f) {
    const x = await this.st.get('lead:' + id); if (!x) return { error: 'Не знайдено' };
    if (f.del) { await this.st.delete('lead:' + id); await this.st.delete('chat:' + id); return { ok: true }; }
    if (f.st && ['new', 'call', 'demo', 'trial', 'won', 'lost'].includes(f.st)) x.st = f.st;
    if (f.note != null) x.note = String(f.note).slice(0, 1000);
    if (f.next != null) { x.next = +f.next || 0; x.rem = 0; }
    if (f.venue) x.venue = String(f.venue).slice(0, 31);
    x.upd = Date.now(); await this.st.put('lead:' + id, x); return x;
  }
  async leadDue() { // ⏰ нагадування «подзвонити» — один раз
    const now = Date.now(), out = [];
    for (const [k, x] of await this.st.list({ prefix: 'lead:' })) if (x.next && x.next <= now && !x.rem && !['won', 'lost'].includes(x.st)) { x.rem = now; await this.st.put(k, x); out.push(x); }
    return out;
  }
  async hit(kind) { const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' }), k = 'ah:' + d, v = (await this.st.get(k)) || {}; v[kind] = (v[kind] || 0) + 1; await this.st.put(k, v); }
  async hitOnce(ip) { if (!ip) return; const k = 'ahip:' + ip.slice(0, 64); if (await this.st.get(k)) return; await this.st.put(k, 1); await this.hit('view'); this.ctx.storage.setAlarm?.(Date.now() + 864e5); }
  async alarm() { for (const [k, v] of await this.st.list({ prefix: 'signup:' })) if (Date.now() - v.at > 7 * 864e5) { await this.st.delete(k); const a = await this.st.get('acct:' + k.slice(7)); if (a && a.verified === false) await this.st.delete('acct:' + k.slice(7)); } /* непідтверджені самореєстрації старші 7 днів */
    for (const p of ['ahip:', 'lrl:', 'srl:']) { const l = await this.st.list({ prefix: p }); if (l.size) await this.st.delete([...l.keys()].slice(0, 1000)); } } // щодоби: перегляди й ліміти заявок з IP
  async hitStats(days) { const out = []; for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' }); out.push({ d, ...((await this.st.get('ah:' + d)) || {}) }); } return out; }
}

export const hub = env => env.HUB.get(env.HUB.idFromName('hub'));
// активні заклади (для Cron); VARVAR окремо (MAIN)
export async function hubVenues(env) { if (!env.HUB) return []; return (await hub(env).venueList()).filter(v => v.id !== MAIN && v.status !== 'off').map(v => v.id);}
