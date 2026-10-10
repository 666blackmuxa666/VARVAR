// 💳 LiqPay (ПриватБанк): форма оплати, перевірка підпису callback, серверні запити (статус, повернення, відписка).
// Ключі: VARVAR і платформа (підписка ATOM, баланс ШІ) — env.LIQPAY_PUBLIC / LIQPAY_PRIVATE; інші заклади — свої (cfg:secrets → env закладу).
// Підпис: base64( sha1( private + data + private ) ). Пісочниця — ключі з префіксом sandbox_ (гроші не списуються).
const enc = new TextEncoder();
const b64 = s => { const u = enc.encode(s); let r = ''; for (let i = 0; i < u.length; i += 0x8000) r += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(r); };
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
async function sign(priv, data) { const h = await crypto.subtle.digest('SHA-1', enc.encode(priv + data + priv)); return btoa(String.fromCharCode(...new Uint8Array(h))); }

export const lpKeys = env => env.LIQPAY_PUBLIC && env.LIQPAY_PRIVATE ? { pub: env.LIQPAY_PUBLIC, priv: env.LIQPAY_PRIVATE, sandbox: /^sandbox_/.test(env.LIQPAY_PUBLIC) } : null;
// платформа (підписка ATOM, баланс ШІ) — завжди ключі VARVAR з кореневого env, а не закладу
export const lpPlatform = env => env.PLATFORM_LP_PUB ? { pub: env.PLATFORM_LP_PUB, priv: env.PLATFORM_LP_PRIV, sandbox: /^sandbox_/.test(env.PLATFORM_LP_PUB) } : lpKeys(env);

// форма для переходу на checkout: { url, data, signature } — сторінка робить POST-форму (або GET з параметрами)
export async function lpForm(k, p) {
  const data = b64(JSON.stringify({ version: 3, public_key: k.pub, currency: 'UAH', language: 'uk', action: 'pay', ...(k.sandbox ? { sandbox: 1 } : {}), ...p, amount: Math.round(+p.amount * 100) / 100 }));
  const signature = await sign(k.priv, data);
  return { url: `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}`, data, signature };
}
// callback від LiqPay (application/x-www-form-urlencoded: data, signature) → розібраний JSON або null, якщо підпис не той
export async function lpVerify(k, data, signature) {
  if (!k || !data || !signature) return null;
  if ((await sign(k.priv, String(data))) !== String(signature)) return null;
  try { return JSON.parse(unb64(String(data))); } catch { return null; }
}
export const lpOk = x => ['success', 'sandbox', 'subscribed'].includes(x?.status);
// серверний запит: status / refund / unsubscribe
export async function lpApi(k, p) {
  const data = b64(JSON.stringify({ version: 3, public_key: k.pub, ...p })), signature = await sign(k.priv, data);
  const r = await fetch('https://www.liqpay.ua/api/request', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(data)}&signature=${encodeURIComponent(signature)}` });
  return r.json().catch(() => ({ status: 'error', err_description: 'Немає відповіді LiqPay' }));
}
// для тестів: зібрати «callback» тими самими ключами
export async function lpFake(k, obj) { const data = b64(JSON.stringify(obj)); return { data, signature: await sign(k.priv, data) }; }
// ↩️ повернення: спершу стан платежу (вже повернено? ще в обробці?), далі refund; повна відповідь — у журнал воркера (wrangler tail)
export async function lpRefund(k, order, amt) {
  const st = await lpApi(k, { action: 'status', order_id: order }); console.log('lp status', order, JSON.stringify(st).slice(0, 400));
  if (['reversed', 'refund'].includes(st.status)) return { ok: true, already: 1 };
  const tries = [{ action: 'refund', order_id: order, amount: amt }, { action: 'refund', order_id: order }];
  let r = null;
  for (const p of tries) { r = await lpApi(k, p); console.log('lp refund', order, JSON.stringify(p), JSON.stringify(r).slice(0, 400)); if (r.result === 'ok' || ['reversed', 'success', 'sandbox'].includes(r.status)) return { ok: true }; }
  const why = { wait_accept: 'платіж ще не зарахований магазину (LiqPay перевіряє магазин) — поверніть пізніше або в кабінеті LiqPay', processing: 'платіж ще обробляється — спробуйте за кілька хвилин' }[st.status];
  return { error: why || `${r?.err_description || r?.status || 'помилка'}${r?.err_code ? ' (' + r.err_code + ')' : ''}${st.status ? ' · стан платежу: ' + st.status : ''}` };
}
