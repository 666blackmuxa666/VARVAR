// 👥 Доступ і персонал: паролі, PIN, коди реєстрації, працівники, права, перейменування, аватарки
// (частина ops.js — інші файли імпортують з ops.js, як і раніше)
import { KITCHEN_POOL } from './ops-bill.js';
import { BILL_TTL, L } from './ops-core.js';
import { SENSITIVE, cleanPerm, diffPerm } from './perm.js';

// ---------- доступ: паролі, персонал ----------
// порівняння паролів без різниці в розкладці: «фиц» / «фіц» / латинська i, великі літери, пробіли
export const normPass = s => String(s || '').trim().toLowerCase().replace(/[иiыїі]/g, 'і').replace(/ё/g, 'е').replace(/[.\s]+$/g, '');
export const samePass = (a, b) => !!b && normPass(a) === normPass(b);
export const adminPass = async env => (await env.DB.get('admin_pass')) || env.ADMIN_PIN || '';
export const isAdmin = async (env, uid) => !!uid && !!(await env.DB.get('adm:' + uid));
export const isWaiter = async (env, uid) => !!uid && !!(await env.DB.get('wlog:' + uid));
export async function pinHash(pin) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('varvar:' + pin));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
// 🔐 PIN: старий формат — SHA-256('varvar:'+pin) (64 hex); новий — 'h2:'+HMAC-SHA256(ключ з MASTER_KEY, id+':'+pin): без секрету з дампу бази PIN не підібрати.
// Читаються обидва формати. Новий пишеться лише коли env.PIN2 увімкнено (спершу викладається читання, потім вмикається запис — відкат коду не відбирає вхід).
const pinKey = async env => crypto.subtle.importKey('raw', new TextEncoder().encode('pin:' + env.MASTER_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const pinH2 = async (env, pin, sid) => 'h2:' + [...new Uint8Array(await crypto.subtle.sign('HMAC', await pinKey(env), new TextEncoder().encode(sid + ':' + pin)))].map(x => x.toString(16).padStart(2, '0')).join('');
export const pinMake = async (env, pin, sid) => env.PIN2 && env.MASTER_KEY ? pinH2(env, pin, sid) : pinHash(pin);
export async function pinIs(env, s, pin) { pin = String(pin); if (!s?.pin) return false; return String(s.pin).startsWith('h2:') ? !!env.MASTER_KEY && s.pin === await pinH2(env, pin, s.id) : s.pin === await pinHash(pin); }
export async function pinFind(env, list, pin, exceptId) { for (const s of list) if (s.id !== exceptId && await pinIs(env, s, pin)) return s; return null; }
// тихе перехешування при вдалому вході: старий формат → новий (під замком, лише якщо запис не змінився)
export async function pinUpgrade(env, s, pin) {
  if (!env.PIN2 || !env.MASTER_KEY || String(s.pin).startsWith('h2:')) return;
  try { await L(env, 'staff', async () => { const l = await getStaff(env), x = l.find(y => y.id === s.id); if (!x || x.pin !== s.pin) return; x.pin = await pinH2(env, pin, x.id); await env.DB.put('staff', JSON.stringify(l)); }); } catch (e) { console.log('pinUpgrade', e.message); }
}
// коди реєстрації: адмін 1119, офіціант 1112 — ними не входять, а реєструються (імʼя + свій PIN)
export const REG_DEF = { admin: '1119', waiter: '1112', cook: '1113', courier: '1114' };
export const regCode = async (env, role) => (await env.DB.get('reg_' + role)) || REG_DEF[role];
export async function regRole(env, code) { code = String(code || ''); for (const r of ['admin', 'waiter', 'cook', 'courier']) if (code === await regCode(env, r)) return r; return null; }
export const getStaff = async env => (await env.DB.get('staff', 'json')) || [];
// 🔐 PIN: адміністратор — 6–8 цифр (він бачить гроші й налаштування), решта — 4. Старі 4-значні PIN адмінів діють, доки їх не змінять.
export const pinRule = (role, perm) => role === 'admin' || (perm && SENSITIVE.some(k => perm[k] === 1)) ? { re: /^\d{6,8}$/, err: role === 'admin' ? 'PIN адміністратора — від 6 до 8 цифр.' : 'З правами на видалення, персонал, налаштування чи звіти PIN — від 6 до 8 цифр.' } : { re: /^\d{4}$/, err: 'PIN — рівно 4 цифри.' };
async function _addStaff(env, name, pin, role = 'waiter') {
  name = String(name || '').trim().slice(0, 30); pin = String(pin || '').trim(); role = ['admin', 'cook', 'courier'].includes(role) ? role : 'waiter';
  if (!name) return { error: 'Потрібне імʼя.' };
  if (!pinRule(role).re.test(pin)) return { error: pinRule(role).err };
  const list = await getStaff(env);
  if (await pinFind(env, list, pin)) return { error: 'Такий PIN уже є — оберіть інший.' };
  if (await regRole(env, pin)) return { error: 'Цей код — для реєстрації. Оберіть інший PIN.' };
  if (list.some(s => s.name.toLowerCase() === name.toLowerCase())) return { error: 'Працівник з таким імʼям уже є — додайте прізвище або букву.' };
  const sid = crypto.randomUUID().slice(0, 6), s = { id: sid, name, pin: await pinMake(env, pin, sid), role: ['admin', 'cook', 'courier'].includes(role) ? role : 'waiter' };
  list.push(s); await env.DB.put('staff', JSON.stringify(list));
  return { ok: true, s };
}
async function _delStaff(env, id) {
  const list = await getStaff(env); const n = list.filter(s => s.id !== id);
  await env.DB.put('staff', JSON.stringify(n)); if (n.length !== list.length) await env.DB.delete('img:av-s-' + id); return n.length !== list.length;
}
// ✏️ зміна працівника: імʼя / PIN / роль. ver++ → чинні сесії каси закриваються (pos.js порівнює ver), привʼязки «зміна» в боті (tgs:) — теж
async function _editStaff(env, id, f) {
  const list = await getStaff(env), s = list.find(x => x.id === id); if (!s) return { error: 'Працівника не знайдено' };
  const old = s.name;
  if (f.name != null) { const n = String(f.name).trim().slice(0, 30); if (!n) return { error: 'Порожнє імʼя' };
    if (n === KITCHEN_POOL || n === '—') return { error: 'Таке імʼя зайняте' };
    if (list.some(x => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) return { error: 'Працівник з таким імʼям уже є — додайте прізвище або букву.' }; s.name = n; }
  const fr = f.role != null ? (['admin', 'cook', 'courier'].includes(f.role) ? f.role : 'waiter') : s.role;
  if (fr === 'admin' && s.role !== 'admin' && f.pin == null) return { error: 'Для адміністратора задайте новий PIN — від 6 до 8 цифр.' };
  if (f.pin != null) { const pin = String(f.pin).trim(); if (!pinRule(fr, fr === 'admin' ? null : s.perm).re.test(pin)) return { error: pinRule(fr, fr === 'admin' ? null : s.perm).err };
    if (await regRole(env, pin)) return { error: 'Цей код — для реєстрації. Оберіть інший PIN.' };
    if (await pinFind(env, list, pin, id)) return { error: 'Такий PIN уже є — оберіть інший.' }; s.pin = await pinMake(env, pin, id); }
  if (f.role != null) s.role = ['admin', 'cook', 'courier'].includes(f.role) ? f.role : 'waiter';
  s.ver = (s.ver || 0) + 1;
  await env.DB.put('staff', JSON.stringify(list));
  return { ok: true, s, old };
}
// перейменування: імʼя — ключ у графіку, ЗП, чайових, чеках, доставках → переносимо всі записи, кожен ключ під своїм замком
const REN_TTL = { 'gridx:': 400 * 86400, 'seen:': 400 * 86400, 'cooks:': 3 * 86400 };
export async function renameRefs(env, a, b) {
  if (!a || !b || a === b) return 0; let n = 0;
  const sw = v => v === a ? b : v, mv = o => { if (o && a in o) { o[b] = typeof o[a] === 'number' ? (o[b] || 0) + o[a] : o[a]; delete o[a]; return 1; } return 0; };
  const arr = v => { const j = JSON.stringify(v); v.forEach((x, i) => { v[i] = sw(x); }); return JSON.stringify(v) !== j; };
  const each = async (prefix, fn) => { for (const k of (await env.DB.list({ prefix })).keys.map(x => x.name)) await L(env, k, async () => {
    const v = await env.DB.get(k, 'json'); if (v && fn(v)) { await env.DB.put(k, JSON.stringify(v), REN_TTL[prefix] ? { expirationTtl: REN_TTL[prefix] } : undefined); n++; } }); };
  await each('att:', v => Object.values(v).reduce((c, d) => c + mv(d), 0));
  await each('plan:', v => Object.values(v).reduce((c, d) => c + mv(d), 0));
  await each('pay:', v => v.reduce((c, o) => c + (o.n === a ? (o.n = b, 1) : 0), 0));
  await each('gridx:', v => arr(v.add || []) + arr(v.hide || []));
  await each('seen:', arr);
  await each('cooks:', arr);
  await each('closed:', v => v.reduce((c, x) => { const j = JSON.stringify(x); x.w = sw(x.w); x.by = sw(x.by); if (x.cour) x.cour = sw(x.cour); if (x.tipSplit) mv(x.tipSplit); return c + (JSON.stringify(x) !== j); }, 0));
  for (const k of ['swaps', 'tipbal', 'courtg']) await L(env, k, async () => { const v = await env.DB.get(k, 'json'); if (!v) return;
    const ch = Array.isArray(v) ? v.reduce((c, x) => { const j = x.from + x.to; x.from = sw(x.from); x.to = sw(x.to); return c + (j !== x.from + x.to); }, 0) : mv(v);
    if (ch) { await env.DB.put(k, JSON.stringify(v)); n++; } });
  await L(env, 'bills', async () => { for (const k of (await env.DB.list({ prefix: 'bill:' })).keys.map(x => x.name)) { const x = await env.DB.get(k, 'json'); if (!x) continue;
    const j = JSON.stringify(x); x.waiter = sw(x.waiter); if (x.go?.cour) x.go.cour = sw(x.go.cour); if (JSON.stringify(x) !== j) { await env.DB.put(k, JSON.stringify(x), { expirationTtl: BILL_TTL }); n++; } } });
  for (const k of (await env.DB.list({ prefix: 'wlog:' })).keys.map(x => x.name)) { const x = await env.DB.get(k, 'json'); if (x?.name === a) { x.name = b; await env.DB.put(k, JSON.stringify(x)); } }
  return n;
}
async function dropTgLinks(env, id) { const keys = (await env.DB.list({ prefix: 'tgs:' })).keys.map(k => k.name), v = keys.length ? await env.DB.getMany(keys) : []; for (let i = 0; i < keys.length; i++) if (v[i] === id) await env.DB.delete(keys[i]); }
export async function editStaff(env, id, f) {
  const r = await L(env, 'staff', () => _editStaff(env, id, f)); if (r.error) return r;
  if (r.old !== r.s.name) r.moved = await renameRefs(env, r.old, r.s.name);
  await dropTgLinks(env, id);
  return r;
}
export const loggedWaiters = async env => {
  const keys = (await env.DB.list({ prefix: 'wlog:' })).keys.map(k => k.name);
  const v = keys.length ? await env.DB.getMany(keys, 'json') : [];
  return keys.map((k, i) => ({ uid: k.slice(5), ...(v[i] || {}) }));
};
// 🔑 права працівника (відхилення від шаблону ролі). Чутливі права (SENSITIVE) — лише разом із новим PIN 6–8 цифр; старі PIN не чіпаємо
export async function setPerm(env, id, p, pin) {
  return L(env, 'staff', async () => {
    const list = await getStaff(env), s = list.find(x => x.id === id); if (!s) return { error: 'Працівника не знайдено' };
    const np = diffPerm(s.role, cleanPerm(p));
    if (s.role !== 'admin' && SENSITIVE.some(k => np[k] === 1 && s.perm?.[k] !== 1) && (pin == null || pin === '')) return { error: 'Для прав «видалення / персонал / налаштування / звіти» задайте новий PIN — від 6 до 8 цифр.' };
    if (s.role === 'admin' && np.staff === 0 && !list.some(x => x.id !== id && x.role === 'admin' && x.perm?.staff !== 0)) return { error: 'Має лишитись хоча б один адміністратор із правом «Персонал».' };
    if (pin != null && pin !== '') { const pn = String(pin).trim(), rule = pinRule(s.role, np);
      if (!rule.re.test(pn)) return { error: rule.err };
      if (await regRole(env, pn)) return { error: 'Цей код — для реєстрації. Оберіть інший PIN.' };
      if (await pinFind(env, list, pn, id)) return { error: 'Такий PIN уже є — оберіть інший.' };
      s.pin = await pinMake(env, pn, id); s.ver = (s.ver || 0) + 1; }
    if (Object.keys(np).length) s.perm = np; else delete s.perm;
    await env.DB.put('staff', JSON.stringify(list));
    return { ok: true, s };
  });
}
export async function addStaff(env, ...a) { return L(env, 'staff', () => _addStaff(env, ...a)); }
export async function delStaff(env, ...a) { return L(env, 'staff', () => _delStaff(env, ...a)); }
// 👤 аватарки (працівник, гість, власник): data:image/… → байти (до 600 КБ; клієнт стискає до ~30 КБ)
export const avBytes = d => { const m = String(d || '').match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/); if (!m) return null; try { const b = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0)); return b.length > 6e5 ? null : b; } catch { return null; } };
// зберегти/прибрати аватарку: img:<key> + адреса з ?v= (кеш картинок — рік)
export async function avPut(env, key, data) {
  if (!data) { await env.DB.delete('img:' + key); return ''; }
  const b = avBytes(data); if (!b) return null;
  await env.DB.put('img:' + key, b.buffer); return `${env.SELF_URL}/img/${key}?v=${Date.now().toString(36)}`;
}
// аватарка працівника — без зміни ver (інакше викине з каси)
export const staffAv = (env, sid, url) => L(env, 'staff', async () => { const l = await getStaff(env), s = l.find(x => x.id === sid); if (!s) return 0; if (url) s.av = url; else delete s.av; await env.DB.put('staff', JSON.stringify(l)); return 1; });
