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
export async function pushTo(env, sids, msg, urgent = false, out = null) {
  if (!pushOn(env)) return 0;
  let n = 0;
  for (const sid of [...new Set(sids)].filter(Boolean)) {
    const key = 'push:' + sid, l = (await env.DB.get(key, 'json')) || []; if (!l.length) continue;
    const dead = [];
    await Promise.all(l.map(async s => { try { const st = await sendOne(env, s, { ...msg, urgent: !!urgent }, urgent); out?.push(st); if (st === 404 || st === 410) dead.push(s.e); else if (st < 300) n++; } catch (e) { out?.push(String(e?.message || e).slice(0, 60)); } }));
    if (dead.length) await env.DB.locked(key, async () => { const c = ((await env.DB.get(key, 'json')) || []).filter(x => !dead.includes(x.e)); if (c.length) await env.DB.put(key, JSON.stringify(c)); else await env.DB.delete(key); });
  }
  return n;
}

// 🧩 каса: push* дії
export async function pushApi(b, env, me) {
  if (b.op === 'pushKey') return [{ ok: true, on: pushOn(env), key: env.VAPID_PUB || '', n: me.sid ? ((await env.DB.get('push:' + me.sid, 'json')) || []).length : 0, all: !!me.sid && ((await env.DB.get('push:all', 'json')) || []).includes(me.sid) }, 200];
  if (b.op === 'pushAll') { // 👑 власник/адмін — отримувати всі події закладу, навіть не на зміні
    if (me.role !== 'admin' || !me.sid) return [{ error: 'Лише для адміністратора' }, 403];
    return [await env.DB.locked('push:all', async () => { const l = ((await env.DB.get('push:all', 'json')) || []).filter(x => x !== me.sid); if (b.on) l.push(me.sid); await env.DB.put('push:all', JSON.stringify(l.slice(-20))); return { ok: true, all: !!b.on }; }), 200];
  }
  if (!pushOn(env)) return [{ error: 'Сповіщення ще не налаштовані на сервері' }, 400];
  if (b.op === 'pushSub') { const r = await pushSub(env, me.sid, b.sub); return [r, r.error ? 400 : 200]; }
  if (b.op === 'pushUnsub') return [await pushUnsub(env, me.sid, b.e), 200];
  if (b.op === 'pushTest') { const st = [], n = await pushTo(env, [me.sid], { title: '🔔 ATOM', body: `Сповіщення працюють, ${me.name}!`, tag: 'test' }, true, st); return n ? [{ ok: true, n }, 200] : [{ error: `Не вдалося надіслати${st.length ? ` (${st.join(', ')})` : ' — на цьому акаунті немає підписаних пристроїв'}. Вимкніть і увімкніть сповіщення ще раз` }, 400]; }
  return [{ error: 'op' }, 400];
}

// 🎯 подія стрічки каси → сповіщення потрібним людям (викликається з logEvent). Хто сам зробив дію — не отримує.
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
export async function pushEvent(env, e) {
  if (!pushOn(env) || !e?.k) return;
  const O = await import('./ops.js'), tn = (await import('./tn.js')).tn;
  const staff = (await O.getStaff(env)).filter(s => s.id && s.role);
  const d = O.dayKey(), att = (await env.DB.get('att:' + d.slice(0, 7), 'json')) || {}, day = att[d] || {};
  const on = s => { const x = day[s.name]; return !!(x && x.in && !x.out); };
  const role = (r, shiftOnly = true) => { const l = staff.filter(s => s.role === r); const w = shiftOnly ? l.filter(on) : l; return w.length || r !== 'admin' ? w : l; }; // адміна — хоч когось, навіть не на зміні
  const T = e.t ? (x => /^\d+$/.test(String(x)) ? 'Стіл ' + x : x)(tn(e.t)) : '';
  const waiterOf = async () => { if (!e.t) return []; const b = await O.getBill(env, e.t); const w = b.waiter && staff.find(s => s.name === b.waiter); return w ? [w] : role('waiter'); };
  let to = [], msg = null, urgent = false;
  switch (e.k) {
    case 'guest': to = [...role('admin'), ...role('waiter')]; urgent = true; msg = { title: `🆕 Нове замовлення · ${T}`, body: strip(`${e.kind || ''} ${(e.lines || []).map?.(x => typeof x === 'string' ? x : `${x.q || 1}× ${x.n || x.name || ''}`).join(', ') || ''}`), tag: 'g' + (e.oid || e.t), go: { view: 'hall' } }; break;
    case 'call': to = e.oid && String(e.oid).startsWith('p') ? role('admin') : [...(await waiterOf()), ...role('admin')]; urgent = true; msg = { title: e.text ? '⚠️ Проблема з доставкою' : `🖐 Гість кличе · ${T}`, body: strip(e.text || 'Підійдіть до столу'), tag: 'c' + e.t, go: { view: 'hall' } }; break;
    case 'check': to = [...(await waiterOf()), ...role('admin')]; urgent = true; msg = { title: `🧾 Гість просить рахунок · ${T}`, body: e.pay ? `Оплата: ${strip(e.pay)}` : 'Підійдіть до столу', tag: 'k' + e.t, go: { view: 'hall' } }; break;
    case 'ready': if (e.part) return; to = await waiterOf(); urgent = true; msg = { title: `✅ Готово · ${T}`, body: strip(e.text), tag: 'r' + e.kid, go: { view: 'hall' } }; break;
    case 'go': if (!/^🍽/.test(e.text || '')) return; to = role('courier'); urgent = true; msg = { title: '🛵 Доставка готова', body: strip(e.text), tag: 'd' + e.t, go: { view: 'go' } }; break;
    case 'book': to = role('admin'); msg = { title: '📅 Нова бронь', body: strip(e.text), tag: 'b' + e.bid, go: { view: 'books' } }; break;
    case 'tpay': to = [...(await waiterOf()), ...role('admin')]; msg = { title: `💳 Оплачено онлайн · ${T}`, body: `${e.sum} грн${e.tip ? ` · чайові ${e.tip} грн` : ''}`, tag: 'p' + e.t, go: { view: 'hall' } }; break;
    case 'gchat': if (e.out) return; to = role('admin'); msg = { title: '💬 Гість пише', body: strip(e.text), tag: 'gc' + (e.ph || ''), go: { view: 'hall' } }; break;
    default: return;
  }
  const all = (await env.DB.get('push:all', 'json')) || []; to = [...to, ...staff.filter(s => all.includes(s.id))]; // 👑 «усі сповіщення»
  const sids = [...new Set(to.filter(s => s && s.name !== e.by).map(s => s.id))];
  if (sids.length) await pushTo(env, sids, msg, urgent);
}
// 📊 підсумок дня — адмінам (усім, не лише на зміні)
export async function pushDigest(env, text) {
  if (!pushOn(env)) return;
  const O = await import('./ops.js'), sids = (await O.getStaff(env)).filter(s => s.role === 'admin' && s.id).map(s => s.id);
  if (sids.length) await pushTo(env, sids, { title: '📊 Підсумок дня', body: strip(text).slice(0, 170), tag: 'dig', go: { view: 'reports' } });
}
