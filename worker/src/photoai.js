// 📸 ШІ-фото страв в одному стилі закладу: Gemini Image (платний ключ GEMINI_IMG_KEY — лише тут; решта ШІ — безкоштовний ключ).
// Стиль закладу: cfg:photoStyle { prompt, refs: [img-ключ] } — до 2 фото-зразків. Результат — чернетка img:draft-<id>; у меню — лише після «✅ Взяти».
// Ліміт: FREE генерацій на місяць на заклад, далі — PRICE ₴ за фото (рахується в phq:<місяць>.over для рахунку платформи); жорстка стеля DAY_CAP на добу.
import { getMenu, saveMenu, menuLock } from './menu.js';
import { dayKey } from './ops.js';

export const FREE = 20, PRICE = 2, DAY_CAP = 30;
// 🤖 баланс ШІ закладу (₴): поповнення з кабінету через LiqPay платформи (billing.js), списання — тут
export const aiBal = async env => (await env.DB.get('aibal', 'json')) || { bal: 0, h: [] };
export async function aiCharge(env, sum, what, who) { return env.DB.locked('aibal', async () => { const a = await aiBal(env); a.bal = Math.round((a.bal - sum) * 100) / 100; a.h = [{ ts: Date.now(), sum: -sum, what: String(what || '').slice(0, 60), by: String(who || '').slice(0, 40) }, ...a.h].slice(0, 200); await env.DB.put('aibal', JSON.stringify(a)); return a; }); }
const MODEL = 'gemini-2.5-flash-image';
export const STYLE0 = 'Професійне фуд-фото для меню ресторану. Страва в центрі кадру, вид під кутом 45°, темний матовий фон (графітовий камінь), тепле мʼяке бокове світло, глибокі мʼякі тіні, невелика глибина різкості, апетитно й реалістично. Без тексту, без рук, без логотипів, без зайвих предметів. Квадрат 1:1.';

// 🖼 фото страви: у базі (img:<ключ> з /img/<ключ>) або файлом сайту (img/страва.png — старі фото VARVAR)
async function dishBuf(env, id) {
  const it = (await getMenu(env)).categories.flatMap(c => c.items).find(x => x.id === id), u = String(it?.img || ''), k = u.match(/\/img\/([\w-]+)(?:\?|$)/)?.[1] || id;
  const buf = await env.DB.get('img:' + k, 'arrayBuffer'); if (buf || !u || /^(https?:|data:)/.test(u)) return buf;
  const { siteFile } = await import('./index.js'), r = await siteFile(env, '/' + u.replace(/^\/+/, '').split('?')[0]); return r.ok ? r.arrayBuffer() : null;
}
const mimeOf = x => new Uint8Array(x, 0, 4)[0] === 0x89 ? 'image/png' : new Uint8Array(x, 0, 4)[0] === 0x52 ? 'image/webp' : 'image/jpeg';
const month = () => dayKey().slice(0, 7);
async function quota(env) { const k = 'phq:' + month(), q = (await env.DB.get(k, 'json')) || { n: 0, over: 0, d: {} }; return { k, q }; }
export async function photoInfo(env) {
  const st = (await env.DB.get('cfg:photoStyle', 'json')) || {}, { q } = await quota(env);
  return { prompt: st.prompt || '', def: STYLE0, refs: (st.refs || []).map(k => `${env.SELF_URL}/img/${k}?v=${st.v || 0}`), dish: st.dish || {}, n: q.n, over: q.over, free: FREE, price: PRICE, on: !!env.GEMINI_IMG_KEY, bal: (env.VENUE || 'varvar') === 'varvar' ? null : (await aiBal(env)).bal };
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
      if (b.dish?.id) { st.dish ||= {}; const n = String(b.dish.note || '').trim().slice(0, 600), di = String(b.dish.id).replace(/[^\w-]/g, ''); if (n) st.dish[di] = n; else delete st.dish[di]; }
      if (b.refFrom || b.refData) {
        if (st.refs.length >= 2) return bad('Не більше 2 зразків — спершу приберіть один');
        let buf; if (b.refFrom) buf = await dishBuf(env, String(b.refFrom).replace(/[^\w-]/g, '')); else { const x = unData(b.refData); if (x) buf = Uint8Array.from(atob(x.data), c => c.charCodeAt(0)).buffer; }
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
  if (q.n >= FREE && !b.pay) return [{ error: 'pay', n: q.n, free: FREE, price: PRICE }, 402]; // каса питає «понад ліміт — 2 ₴, продовжити?»
  if (await env.DB.get('phbusy')) return [{ error: 'Інше фото ще генерується — зачекайте кілька секунд' }, 429];
  await env.DB.put('phbusy', '1', { expirationTtl: 120 }); // довше за тайм-аут ШІ (90 с) — другий запит не пройде перевірку балансу
  try {
    const st = (await env.DB.get('cfg:photoStyle', 'json')) || {}, style = st.prompt || STYLE0;
    st.dish ||= {}; const note = b.note != null ? String(b.note).trim().slice(0, 600) : (st.dish[id] || '');
    if (b.note != null && note !== (st.dish[id] || '')) { if (note) st.dish[id] = note; else delete st.dish[id]; await env.DB.put('cfg:photoStyle', JSON.stringify(st)); } // промт страви — спільний для каси, кабінету й бота
    let src = unData(b.data); if (!src && b.mode === 'edit') { const buf = await dishBuf(env, id); if (buf) src = { mime: mimeOf(buf), data: b64(buf) }; }
    const strict = b.strict !== 0 && b.strict !== false, useRefs = b.refs != null ? !!+b.refs : !src; // зі своїм фото зразки за замовчуванням не шлемо — модель копіює з них страву
    const refs = useRefs && !(src && strict) ? (await Promise.all((st.refs || []).map(r => env.DB.get('img:' + r, 'arrayBuffer')))).filter(Boolean) : [];
    const dish = `«${it.name.uk}»${it.desc?.uk ? ' — склад: ' + it.desc.uk : ''}${it.size ? ', ' + it.size : ''}`;
    const look = note ? `\nЯК ВИГЛЯДАЄ СТРАВА (обовʼязково): ${note}` : '';
    const parts = [];
    if (src) {
      parts.push({ text: `ЗОБРАЖЕННЯ 1 — НАША СПРАВЖНЯ СТРАВА ${dish}. Це головне фото.` }, { inline_data: { mime_type: src.mime, data: src.data } });
      parts.push({ text: (strict ? `Збережи страву з ЗОБРАЖЕННЯ 1 один в один: ту саму форму, кількість шматків, розташування, кольори, посуд і порцію. Нічого не додавай, не прибирай і не замінюй. Змінюй ЛИШЕ фон, поверхню під посудом і світло.`
        : `Збережи саму страву впізнаваною (інгредієнти, форма, посуд), можна покращити подачу й світло.`) + look });
    } else parts.push({ text: `Створи реалістичне фото страви ${dish}, як її подають у ресторані.${look}\nНе підміняй страву іншою: форма, інгредієнти й посуд мають відповідати опису.` });
    refs.forEach((x, i) => parts.push({ text: `ЗРАЗОК СТИЛЮ ${i + 1} — лише для фону, світла, кута й кольорів. НЕ копіюй з нього страву, посуд чи форму.` }, { inline_data: { mime_type: mimeOf(x), data: b64(x) } }));
    parts.push({ text: `СТИЛЬ ЗАКЛАДУ: ${style}` });
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
