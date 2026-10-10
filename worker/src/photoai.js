// 📸 ШІ-фото страв в одному стилі закладу: Gemini Image (платний ключ GEMINI_IMG_KEY — лише тут; решта ШІ — безкоштовний ключ).
// Стиль закладу: cfg:photoStyle { prompt, refs: [img-ключ] } — до 2 фото-зразків. Результат — чернетка img:draft-<id>; у меню — лише після «✅ Взяти».
// Ліміт: FREE генерацій на місяць на заклад, далі — PRICE ₴ за фото (рахується в phq:<місяць>.over для рахунку платформи); жорстка стеля DAY_CAP на добу.
import { getMenu, saveMenu, menuLock } from './menu.js';
import { dayKey } from './ops.js';

export const FREE = 20, PRICE = 5, DAY_CAP = 30;
// 🤖 баланс ШІ закладу (₴): поповнення з кабінету через LiqPay платформи (billing.js), списання — тут
export const aiBal = async env => (await env.DB.get('aibal', 'json')) || { bal: 0, h: [] };
export async function aiCharge(env, sum, what, who) { return env.DB.locked('aibal', async () => { const a = await aiBal(env); a.bal = Math.round((a.bal - sum) * 100) / 100; a.h = [{ ts: Date.now(), sum: -sum, what: String(what || '').slice(0, 60), by: String(who || '').slice(0, 40) }, ...a.h].slice(0, 200); await env.DB.put('aibal', JSON.stringify(a)); return a; }); }
const MODEL = 'gemini-2.5-flash-image';
export const STYLE0 = 'Професійне фуд-фото для меню ресторану. Страва в центрі кадру, вид під кутом 45°, темний матовий фон (графітовий камінь), тепле мʼяке бокове світло, глибокі мʼякі тіні, невелика глибина різкості, апетитно й реалістично. Без тексту, без рук, без логотипів, без зайвих предметів. Квадрат 1:1.';

const month = () => dayKey().slice(0, 7);
async function quota(env) { const k = 'phq:' + month(), q = (await env.DB.get(k, 'json')) || { n: 0, over: 0, d: {} }; return { k, q }; }
export async function photoInfo(env) {
  const st = (await env.DB.get('cfg:photoStyle', 'json')) || {}, { q } = await quota(env);
  return { prompt: st.prompt || '', def: STYLE0, refs: (st.refs || []).map(k => `${env.SELF_URL}/img/${k}?v=${st.v || 0}`), n: q.n, over: q.over, free: FREE, price: PRICE, on: !!env.GEMINI_IMG_KEY, bal: (env.VENUE || 'varvar') === 'varvar' ? null : (await aiBal(env)).bal };
}
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unData = d => { const m = String(d || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); return m ? { mime: 'image/' + m[1], data: m[2] } : null; };

export async function photoApi(b, env, who) {
  const ok = (x = {}) => [{ ok: true, ...x }, 200], bad = e => [{ error: e }, 400];
  switch (b.op) {
    case 'photoInfo': return ok(await photoInfo(env));
    case 'photoStyleSet': { // prompt / додати зразок (з фото страви або завантажений) / прибрати зразок
      const st = (await env.DB.get('cfg:photoStyle', 'json')) || { refs: [] }; st.refs ||= [];
      if (b.prompt != null) st.prompt = String(b.prompt).trim().slice(0, 1500);
      if (b.refDel != null) st.refs.splice(+b.refDel, 1);
      if (b.refFrom || b.refData) {
        if (st.refs.length >= 2) return bad('Не більше 2 зразків — спершу приберіть один');
        let buf; if (b.refFrom) buf = await env.DB.get('img:' + String(b.refFrom).replace(/[^\w-]/g, ''), 'arrayBuffer'); else { const x = unData(b.refData); if (x) buf = Uint8Array.from(atob(x.data), c => c.charCodeAt(0)).buffer; }
        if (!buf || buf.byteLength > 3e6) return bad('Фото не знайдено або завелике');
        const k = 'style-' + crypto.randomUUID().slice(0, 6); await env.DB.put('img:' + k, buf); st.refs.push(k);
      }
      st.v = Date.now().toString(36); await env.DB.put('cfg:photoStyle', JSON.stringify(st)); return ok(await photoInfo(env));
    }
    case 'photoMake': return photoMake(b, env, who);
    case 'photoApply': case 'photoDrop': {
      const id = String(b.id || '').replace(/[^\w-]/g, ''), dk = 'img:draft-' + id;
      if (b.op === 'photoDrop') { await env.DB.delete(dk); return ok(); }
      const buf = await env.DB.get(dk, 'arrayBuffer'); if (!buf) return bad('Чернетку не знайдено — згенеруйте ще раз');
      return menuLock(env, async () => {
        const menu = await getMenu(env), it = menu.categories.flatMap(c => c.items).find(x => x.id === id); if (!it) return bad('Страву не знайдено');
        await env.DB.put('img:' + id, buf); await env.DB.delete(dk); it.img = `${env.SELF_URL}/img/${id}?v=${Date.now().toString(36)}`; await saveMenu(env, menu); return ok({ img: it.img });
      });
    }
  }
  return [{ error: 'unknown op' }, 400];
}

async function photoMake(b, env, who) {
  if (!env.GEMINI_IMG_KEY) return [{ error: 'ШІ-фото не підключено — зверніться до розробника' }, 503];
  const id = String(b.id || '').replace(/[^\w-]/g, ''), menu = await getMenu(env), it = menu.categories.flatMap(c => c.items).find(x => x.id === id);
  if (!it) return [{ error: 'Страву не знайдено' }, 400];
  const { k, q } = await quota(env), today = dayKey();
  if ((q.d[today] || 0) >= DAY_CAP) return [{ error: `Сьогодні вже ${DAY_CAP} фото — продовжимо завтра` }, 429];
  const paid = q.n >= FREE && (env.VENUE || 'varvar') !== 'varvar'; /* 🤖 понад ліміт — з балансу ШІ закладу (VARVAR — без оплати) */
  if (paid && (await aiBal(env)).bal < PRICE) return [{ error: `Безкоштовні ${FREE} фото цього місяця використано. Поповніть баланс ШІ в кабінеті власника (💳 Оплата) — ${PRICE} ₴ за фото`, bal: 1 }, 402];
  if (q.n >= FREE && !b.pay) return [{ error: 'pay', n: q.n, free: FREE, price: PRICE }, 402]; // каса питає «понад ліміт — 5 ₴, продовжити?»
  if (await env.DB.get('phbusy')) return [{ error: 'Інше фото ще генерується — зачекайте кілька секунд' }, 429];
  await env.DB.put('phbusy', '1', { expirationTtl: 60 });
  try {
    const st = (await env.DB.get('cfg:photoStyle', 'json')) || {}, style = st.prompt || STYLE0;
    const refs = (await Promise.all((st.refs || []).map(r => env.DB.get('img:' + r, 'arrayBuffer')))).filter(Boolean);
    let src = unData(b.data); if (!src && b.mode === 'edit') { const buf = await env.DB.get('img:' + id, 'arrayBuffer'); if (buf) src = { mime: 'image/jpeg', data: b64(buf) }; }
    const dish = `«${it.name.uk}»${it.desc?.uk ? ' — склад: ' + it.desc.uk : ''}${it.size ? ', ' + it.size : ''}`;
    const text = `${style}\n\n${refs.length ? `Перші ${refs.length} фото — ЗРАЗКИ СТИЛЮ закладу: повтори їхній фон, світло, кут, кольори й подачу, але страва інша.\n` : ''}`
      + (src ? `Останнє фото — наша справжня страва ${dish}. Збережи саму страву точно такою, як на фото (інгредієнти, форма, порція, посуд), прибери фон і перестав світло та фон у стиль закладу. Нічого не вигадуй і не додавай.`
             : `Створи реалістичне фото страви ${dish}, як її подають у ресторані.`);
    const parts = [{ text }, ...refs.map(x => ({ inline_data: { mime_type: 'image/jpeg', data: b64(x) } })), ...(src ? [{ inline_data: { mime_type: src.mime, data: src.data } }] : [])];
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_IMG_KEY }, signal: AbortSignal.timeout(90000),
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } } }) });
    if (!r.ok) { console.log('photoMake', r.status, (await r.text()).slice(0, 300)); return [{ error: r.status === 429 ? 'ШІ перевантажений — спробуйте за хвилину' : 'Не вдалось згенерувати — спробуйте ще раз' }, 502]; }
    const d = await r.json(), p = (d.candidates?.[0]?.content?.parts || []).find(x => x.inlineData || x.inline_data), img = p && (p.inlineData || p.inline_data);
    if (!img?.data) return [{ error: 'ШІ не повернув фото (можливо, відмовив через опис) — змініть опис і спробуйте ще' }, 502];
    const bytes = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
    await env.DB.put('img:draft-' + id, bytes.buffer, { expirationTtl: 7 * 86400 });
    if (paid) await aiCharge(env, PRICE, `📸 ${it.name.uk}`, who);
    q.n++; if (q.n > FREE) q.over++; q.d = { [today]: (q.d[today] || 0) + 1 }; await env.DB.put(k, JSON.stringify(q), { expirationTtl: 400 * 86400 });
    return [{ ok: true, draft: `${env.SELF_URL}/img/draft-${id}?v=${Date.now().toString(36)}`, n: q.n, over: q.over, free: FREE, price: PRICE }, 200];
  } finally { await env.DB.delete('phbusy'); }
}
