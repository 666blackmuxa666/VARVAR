// 💳 monobank (еквайринг): рахунок (invoice/create), вебхук з перевіркою ECDSA-підпису (X-Sign + pubkey), повернення (cancel).
// Токен X-Token (web.monobank.ua) — секрет закладу MONO_TOKEN; VARVAR — env. Без опитування: статус приходить вебхуком.
// Вебхук нормалізується до тієї самої форми, що й callback LiqPay ({order_id, status, amount, currency, payment_id}) — обробники оплат спільні.
// Тестовий режим: токен з префіксом mono_test_ не ходить у мережу (рахунок-заглушка), підпис перевіряється ключем нижче (приватна частина — лише в tools/selftest.mjs).
const API = 'https://api.monobank.ua/api/merchant/';
const TEST_PUB = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAExoIVGTBAh7WWkE69wzytjsfEh3aO4btU0+y7YqSravP3lsShAUYjoAmqC8f0+OkUBoGN6A69IP/aqgRnwd36Ug==';
const u8 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export const monoKeys = env => env.MONO_TOKEN ? { mono: 1, token: String(env.MONO_TOKEN), db: env.DB, sandbox: /^mono_test_/.test(env.MONO_TOKEN) } : null;
const call = (k, path, body) => fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'X-Token': k.token, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) })
  .then(async r => { const j = await r.json().catch(() => ({})); return r.ok ? j : { error: j.errText || j.errCode || 'HTTP ' + r.status }; }).catch(() => ({ error: 'monobank не відповідає' }));

// перевірка токена (кабінет власника): назва мерчанта або помилка
export async function monoCheck(k) { if (k.sandbox) return { ok: 1, name: 'тест' }; const r = await call(k, 'details'); return r.error ? { error: r.error } : { ok: 1, name: r.merchantName || '' }; }

// форма оплати: { url } — сторінка monobank; reference = order_id (як у LiqPay), invoiceId зберігаємо для повернення
export async function monoForm(k, p) {
  const kop = Math.round(+p.amount * 100);
  let r;
  if (k.sandbox) r = { invoiceId: 'mt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pageUrl: 'https://pay.monobank.ua/test' };
  else r = await call(k, 'invoice/create', { amount: kop, ccy: 980, validity: 3600, merchantPaymInfo: { reference: p.order_id, destination: String(p.description || '').slice(0, 280) }, redirectUrl: p.result_url, webHookUrl: p.server_url });
  if (!r.invoiceId) return { url: '', error: r.error || 'monobank не створив рахунок' };
  await k.db.put('mono:o:' + p.order_id, r.invoiceId, { expirationTtl: 40 * 86400 });
  return { url: r.pageUrl, invoiceId: r.invoiceId };
}

// DER (ASN.1) → r||s для WebCrypto
function derRaw(d) {
  let o = 2 + (d[1] & 0x80 ? d[1] & 0x7f : 0); const part = () => { o++; let n = d[o++], s = d.slice(o, o + n); o += n; while (s.length > 32 && !s[0]) s = s.slice(1); const x = new Uint8Array(32); x.set(s, 32 - s.length); return x; };
  const r = part(), s = part(); return new Uint8Array([...r, ...s]);
}
async function pubKey(k, fresh) {
  let b = k.sandbox ? TEST_PUB : fresh ? '' : await k.db.get('mono:pk');
  if (!b) { const r = await call(k, 'pubkey'); if (!r.key) return null; const pem = atob(r.key); b = pem.replace(/-----[A-Z ]+-----|\s/g, ''); await k.db.put('mono:pk', b, { expirationTtl: 86400 }); }
  return crypto.subtle.importKey('spki', u8(b), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']).catch(() => null);
}
async function sigOk(k, raw, sig, fresh) {
  const key = await pubKey(k, fresh); if (!key) return false;
  try { return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derRaw(u8(sig)), new TextEncoder().encode(raw)); } catch { return false; }
}
// вебхук: тіло (рядок) + X-Sign → нормалізований callback, null (підпис не той) або { wait: 1 } (рахунок ще не завершено)
export async function monoVerify(k, raw, sig) {
  if (!k || !raw || !sig) return null;
  if (!(await sigOk(k, raw, sig)) && (k.sandbox || !(await sigOk(k, raw, sig, true)))) return null; // ключ міг змінитись — одне оновлення
  let j; try { j = JSON.parse(raw); } catch { return null; }
  const st = { success: 'success', failure: 'failure', expired: 'failure', reversed: 'reversed' }[j.status];
  if (!st) return { wait: 1 };
  return { order_id: String(j.reference || ''), status: st, amount: (j.finalAmount ?? j.amount) / 100, currency: (j.ccy || 980) === 980 ? 'UAH' : String(j.ccy), payment_id: String(j.invoiceId || '') };
}

// ↩️ повернення: за invoiceId, збереженим під час створення
export async function monoRefund(k, order, amt) {
  const id = await k.db.get('mono:o:' + order); if (!id) return { error: 'не знайдено рахунок monobank для цього платежу' };
  if (k.sandbox) return { ok: true };
  const st = await call(k, 'invoice/status?invoiceId=' + encodeURIComponent(id)); if (st.status === 'reversed') return { ok: true, already: 1 };
  const r = await call(k, 'invoice/cancel', { invoiceId: id, extRef: 'rf-' + order, amount: Math.round(+amt * 100) });
  console.log('mono cancel', order, JSON.stringify(r).slice(0, 300));
  if (r.error || r.status === 'failure') return { error: r.error || r.failureReason || 'monobank не повернув' + (st.status ? ' · стан платежу: ' + st.status : '') };
  return { ok: true };
}
