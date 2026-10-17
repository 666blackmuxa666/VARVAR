// 🔔 Push-сповіщення в шторку (Web Push, VAPID + aes128gcm, RFC 8291/8292) — без бібліотек, лише WebCrypto.
// Ключі платформи: секрети VAPID_PUB (base64url, 65 байт) і VAPID_PRIV (base64url, 32 байти). Немає — push вимкнено.
// Підписки працівника: push:<sid> → [{ e, k, a, ts }] (до 3 пристроїв). Мертві (404/410) — видаляємо.

const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
const MAX = 3;

export const pushOn = env => !!(env.VAPID_PUB && env.VAPID_PRIV);

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}

// 🔐 підпис VAPID (ES256 JWT) для origin push-сервісу
async function vapid(env, endpoint) {
  const pub = unb64u(env.VAPID_PUB), d = env.VAPID_PRIV;
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:support@posatom.online' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(head + '.' + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUB}`;
}

// 📦 шифрування тіла (aes128gcm): один запис
export async function encrypt(p256dh, auth, text) {
  const ua = unb64u(p256dh), au = unb64u(auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(au, shared, cat(te.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(te.encode(text), new Uint8Array([2]))));
  const hdr = new Uint8Array(21); hdr.set(salt); new DataView(hdr.buffer).setUint32(16, 4096); hdr[20] = 65;
  return cat(hdr, asPub, ct);
}

// ✉️ одне сповіщення на один пристрій → статус відповіді push-сервісу
async function sendOne(env, s, msg, urgent) {
  const body = await encrypt(s.k, s.a, JSON.stringify(msg));
  const r = await fetch(s.e, { method: 'POST', body, headers: { Authorization: await vapid(env, s.e), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: urgent ? '600' : '43200', Urgency: urgent ? 'high' : 'normal', ...(msg.tag ? { Topic: String(msg.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}) } });
  return r.status;
}

const okEndpoint = e => { try { const u = new URL(e); return u.protocol === 'https:' && /(^|\.)(push\.apple\.com|googleapis\.com|mozilla\.com|mozaws\.net|windows\.com|notify\.windows\.com)$/.test(u.hostname); } catch { return false; } };

export async function pushSub(env, sid, sub) {
  const e = String(sub?.endpoint || ''), k = String(sub?.keys?.p256dh || ''), a = String(sub?.keys?.auth || '');
  if (!sid) return { error: 'Сповіщення — лише для працівника з PIN' };
  if (!okEndpoint(e) || e.length > 800 || !/^[A-Za-z0-9_-]{80,100}$/.test(k) || !/^[A-Za-z0-9_-]{16,32}$/.test(a)) return { error: 'Некоректна підписка' };
  const key = 'push:' + sid;
  return env.DB.locked(key, async () => {
    const l = ((await env.DB.get(key, 'json')) || []).filter(x => x.e !== e);
    l.push({ e, k, a, ts: Date.now() }); await env.DB.put(key, JSON.stringify(l.slice(-MAX))); return { ok: true, n: Math.min(l.length, MAX) };
  });
}

export async function pushUnsub(env, sid, e) {
  const key = 'push:' + sid;
  return env.DB.locked(key, async () => { const l = ((await env.DB.get(key, 'json')) || []).filter(x => x.e !== String(e || '')); if (l.length) await env.DB.put(key, JSON.stringify(l)); else await env.DB.delete(key); return { ok: true }; });
}

// 📣 надіслати працівникам (sids) — msg: { title, body, tag?, go? }; urgent → гучно (🔴)
export async function pushTo(env, sids, msg, urgent = false) {
  if (!pushOn(env)) return 0;
  let n = 0;
  for (const sid of [...new Set(sids)].filter(Boolean)) {
    const key = 'push:' + sid, l = (await env.DB.get(key, 'json')) || []; if (!l.length) continue;
    const dead = [];
    await Promise.all(l.map(async s => { try { const st = await sendOne(env, s, { ...msg, urgent: !!urgent }, urgent); if (st === 404 || st === 410) dead.push(s.e); else if (st < 300) n++; } catch {} }));
    if (dead.length) await env.DB.locked(key, async () => { const c = ((await env.DB.get(key, 'json')) || []).filter(x => !dead.includes(x.e)); if (c.length) await env.DB.put(key, JSON.stringify(c)); else await env.DB.delete(key); });
  }
  return n;
}

// 🧩 каса: push* дії
export async function pushApi(b, env, me) {
  if (b.op === 'pushKey') return [{ ok: true, on: pushOn(env), key: env.VAPID_PUB || '', n: me.sid ? ((await env.DB.get('push:' + me.sid, 'json')) || []).length : 0 }, 200];
  if (!pushOn(env)) return [{ error: 'Сповіщення ще не налаштовані на сервері' }, 400];
  if (b.op === 'pushSub') { const r = await pushSub(env, me.sid, b.sub); return [r, r.error ? 400 : 200]; }
  if (b.op === 'pushUnsub') return [await pushUnsub(env, me.sid, b.e), 200];
  if (b.op === 'pushTest') { const n = await pushTo(env, [me.sid], { title: '🔔 ATOM', body: `Сповіщення працюють, ${me.name}!`, tag: 'test' }, true); return n ? [{ ok: true, n }, 200] : [{ error: 'Не вдалося надіслати — увімкніть сповіщення ще раз' }, 400]; }
  return [{ error: 'op' }, 400];
}
