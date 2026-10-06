// 🏪 Мультизаклад: який заклад обслуговує запит і його «середовище» (env).
// Адреса закладу: префікс шляху /v/<id>/… (каса, сайт, боти, кухня, картинки). Без префікса — VARVAR (заклад №1, старі адреси й QR працюють).
// Дані: кожен заклад — свій Durable Object Store. VARVAR = DO «main» (без перенесення даних).
// Контекст запиту (заклад, межа дня) — AsyncLocalStorage: різні заклади можуть працювати в одному процесі, глобальні змінні ділити не можна.
import { AsyncLocalStorage } from 'node:async_hooks';

export const MAIN = 'varvar';
export const ALS = new AsyncLocalStorage();
export const cur = () => ALS.getStore() || {};
export const venueId = () => cur().venue || MAIN;
export const doName = v => !v || v === MAIN ? 'main' : 'v:' + v;
export const isVenueId = v => /^(?=.*[a-z])[a-z0-9][a-z0-9-]{1,30}$/.test(v || ''); // з літерою — щоб не сплутати з номером версії

// /v/<id>/rest → { venue: id, path: /rest }
export function splitVenue(url) {
  const m = url.pathname.match(/^\/v\/((?=[a-z0-9-]*[a-z])[a-z0-9][a-z0-9-]{1,30})(\/.*)?$/);
  return m ? { venue: m[1], path: m[2] || '/' } : { venue: MAIN, path: url.pathname };
}
// запит без префікса закладу, але з позначкою закладу в заголовку (для Store)
export function stripVenue(req, venue, path) {
  const u = new URL(req.url); u.pathname = path;
  const r = new Request(u.toString(), req); r.headers.set('x-venue', venue); return r;
}

// 🔐 секрети закладу (токени ботів, чат персоналу…) — у сховищі закладу, зашифровані MASTER_KEY
const enc = new TextEncoder(), dec = new TextDecoder();
async function aesKey(env) {
  if (!env.MASTER_KEY) throw new Error('MASTER_KEY не задано');
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(env.MASTER_KEY));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const b64 = u8 => btoa(String.fromCharCode(...u8)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), enc.encode(JSON.stringify(obj))));
  return b64(iv) + '.' + b64(ct);
}
export async function unseal(env, s) {
  if (!s) return {}; const [iv, ct] = s.split('.');
  return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(env), unb64(ct))));
}
// секрет вебхуків закладу: похідний від MASTER_KEY (різний для кожного закладу, нікуди не зберігається)
async function hookSecret(env, venue) {
  const k = await crypto.subtle.importKey('raw', enc.encode(env.MASTER_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode('tg:' + venue)))].slice(0, 24).map(x => x.toString(16).padStart(2, '0')).join('');
}
export const SECRET_KEYS = ['BOT_TOKEN', 'GUEST_BOT_TOKEN', 'COURIER_BOT_TOKEN', 'CHAT_ID', 'PRINT_KEY'];

// env закладу: для VARVAR — як є (секрети wrangler); для інших — секрети з його сховища, свої адреси
export async function venueEnv(env, venue, DB) {
  if (!venue || venue === MAIN) return { ...env, VENUE: MAIN };
  const s = await unseal(env, await DB.get('cfg:secrets')).catch(() => ({}));
  const e = { ...env, PLATFORM_BOT: env.BOT_TOKEN, PLATFORM_CHAT: env.CHAT_ID, VENUE: venue, SELF_URL: `${env.SELF_URL}/v/${venue}`, TG_SECRET: await hookSecret(env, venue), IMG_PRE: venue + '/' };
  for (const k of SECRET_KEYS) e[k] = s[k] || ''; // жодних «запасних» секретів VARVAR — інакше чужий заклад писав би в нашу групу
  e.ADMIN_PIN = ''; // PIN Wi‑Fi адміна VARVAR — не для інших закладів
  return e;
}

export const getSecrets = async env => unseal(env, await env.DB.get('cfg:secrets')).catch(() => ({}));
// зберегти секрети закладу (зашифровано) — лише всередині Store закладу
export async function saveSecrets(env, patch) {
  const cur = await unseal(env, await env.DB.get('cfg:secrets')).catch(() => ({}));
  for (const k of SECRET_KEYS) if (patch[k] != null) { const v = String(patch[k]).trim(); if (v) cur[k] = v; else delete cur[k]; }
  await env.DB.put('cfg:secrets', await seal(env, cur)); return Object.fromEntries(SECRET_KEYS.map(k => [k, !!cur[k]]));
}

// 🔗 посилання на сайт закладу (меню, візитка): для VARVAR — як було; для інших — ?v=<заклад> (перед #якорем)
export const SITE_BASE = 'https://666blackmuxa666.github.io/VARVAR/';
export function siteLink(path = '') {
  const v = venueId(); if (v === MAIN) return SITE_BASE + path;
  const [p, h] = path.split('#'); return SITE_BASE + (p || '') + (p.includes('?') ? '&' : '?') + 'venue=' + v + (h != null ? '#' + h : '');
}
