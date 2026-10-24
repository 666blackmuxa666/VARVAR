// 📸 ШІ-фото страв в одному стилі закладу: Gemini Image (платний ключ GEMINI_IMG_KEY — лише тут; решта ШІ — безкоштовний ключ).
// Стиль закладу: cfg:photoStyle { prompt, refs: [img-ключ], cat: { <розділ>: { prompt, refs } } } — до 2 фото-зразків; у розділу (блоку) свій стиль і зразки — фото блоку однакові.
// Перше «✅ Взяти» в блоці без зразків стає зразком блоку (якір) — наступні страви блоку отримують той самий фон, кут і світло. Результат — чернетка img:draft-<id>; у меню — лише після «✅ Взяти».
// Ліміт: FREE генерацій на місяць на заклад, далі — PRICE ₴ за фото з балансу ШІ (VARVAR — без місячного ліміту й оплати, лише DAY_CAP) (рахується в phq:<місяць>.over для рахунку платформи); жорстка стеля DAY_CAP на добу.
import { getMenu, saveMenu, menuLock } from './menu.js';
import { dayKey, L } from './ops.js';

export const FREE = 20, PRICE = 3, DAY_CAP = 30;
const isMain = env => (env.VENUE || 'varvar') === 'varvar'; // VARVAR — заклад платформи: ШІ-фото без ліміту на місяць
const freeOf = env => isMain(env) ? null : FREE; // null — без ліміту (каса показує «без ліміту»)
// 🤖 баланс ШІ закладу (₴): поповнення з кабінету через LiqPay платформи (billing.js), списання — тут
export const aiBal = async env => (await env.DB.get('aibal', 'json')) || { bal: 0, h: [] };
export async function aiCharge(env, sum, what, who) { return env.DB.locked('aibal', async () => { const a = await aiBal(env); a.bal = Math.round((a.bal - sum) * 100) / 100; a.h = [{ ts: Date.now(), sum: -sum, what: String(what || '').slice(0, 60), by: String(who || '').slice(0, 40) }, ...a.h].slice(0, 200); await env.DB.put('aibal', JSON.stringify(a)); return a; }); }
const MODEL = 'gemini-2.5-flash-image';
export const STYLE0 = 'Професійне фуд-фото для меню ресторану. Страва в центрі кадру, вид під кутом 45°, камера на тій самій відстані, темний матовий фон (графітовий камінь), тепле мʼяке бокове світло, глибокі мʼякі тіні, невелика глибина різкості, апетитно й реалістично. Без тексту, без рук, без логотипів, без зайвих предметів. Квадрат 1:1.';

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
  const u = l => (l || []).map(k => `${env.SELF_URL}/img/${k}?v=${st.v || 0}`), bg = k => k ? u([k])[0] : '';
  return { prompt: st.prompt || '', def: STYLE0, refs: u(st.refs), bg: bg(st.bg), cat: Object.fromEntries(Object.entries(st.cat || {}).map(([c, x]) => [c, { prompt: x.prompt || '', refs: u(x.refs), bg: bg(x.bg) }])), dish: st.dish || {}, cut: Object.fromEntries(Object.entries(st.cut || {}).map(([i, v]) => [i, `${env.SELF_URL}/img/cut-${i}?v=${v}`])), fit: st.fit || {}, n: q.n, over: q.over, free: freeOf(env), price: PRICE, on: !!env.GEMINI_IMG_KEY, bal: isMain(env) ? null : (await aiBal(env)).bal };
}
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unData = d => { const m = String(d || '').match(/^data:image\/(jpeg|png|webp);base64,(.+)$/); return m ? { mime: 'image/' + m[1], data: m[2] } : null; };

export async function photoApi(b, env, who) {
  const ok = (x = {}) => [{ ok: true, ...x }, 200], bad = e => [{ error: e }, 400];
  switch (b.op) {
    case 'photoInfo': return ok(await photoInfo(env));
    case 'photoStyleSet': { // prompt / додати зразок (з фото страви або завантажений) / прибрати зразок
      const st = (await env.DB.get('cfg:photoStyle', 'json')) || { refs: [] }; st.refs ||= [];
      const ci = b.cat ? String(b.cat).replace(/[^\w-]/g, '').slice(0, 60) : '', o = ci ? ((st.cat ||= {})[ci] ||= { prompt: '', refs: [] }) : st; // блок меню або весь заклад
      if (b.prompt != null) o.prompt = String(b.prompt).trim().slice(0, 1500);
      if (b.refDel != null) { const [k] = o.refs.splice(+b.refDel, 1); if (k) await env.DB.delete('img:' + k); }
      if (b.dish?.id) { st.dish ||= {}; const n = String(b.dish.note || '').trim().slice(0, 600), di = String(b.dish.id).replace(/[^\w-]/g, ''); if (n) st.dish[di] = n; else delete st.dish[di]; }
      if (b.refFrom || b.refData) {
        if (o.refs.length >= 2) return bad('Не більше 2 зразків — спершу приберіть один');
        let buf; if (b.refFrom) buf = await dishBuf(env, String(b.refFrom).replace(/[^\w-]/g, '')); else { const x = unData(b.refData); if (x) buf = Uint8Array.from(atob(x.data), c => c.charCodeAt(0)).buffer; }
        if (!buf || buf.byteLength > 3e6) return bad('Фото не знайдено або завелике');
        const k = 'style-' + crypto.randomUUID().slice(0, 6); await env.DB.put('img:' + k, buf); o.refs.push(k);
      }
      if (b.bgDel) { if (o.bg) await env.DB.delete('img:' + o.bg); delete o.bg; }
      if (b.bgData || b.bgDraft) { // 🖼 спільний фон блоку/закладу: своє фото або щойно намальований ШІ (img:draft-bg-<блок>)
        let buf; if (b.bgDraft) buf = await env.DB.get('img:draft-bg-' + (ci || '_'), 'arrayBuffer'); else { const x = unData(b.bgData); if (x) buf = Uint8Array.from(atob(x.data), c => c.charCodeAt(0)).buffer; }
        if (!buf || buf.byteLength > 3e6) return bad('Фон не знайдено або завеликий');
        if (o.bg) await env.DB.delete('img:' + o.bg); o.bg = 'bg-' + crypto.randomUUID().slice(0, 6); await env.DB.put('img:' + o.bg, buf); if (b.bgDraft) await env.DB.delete('img:draft-bg-' + (ci || '_'));
      }
      if (ci && !o.prompt && !o.refs.length && !o.bg) delete st.cat[ci];
      st.v = Date.now().toString(36); await env.DB.put('cfg:photoStyle', JSON.stringify(st)); return ok(await photoInfo(env));
    }
    case 'photoMake': return photoMake(b, env, who);
    case 'photoApply': case 'photoDrop': {
      const id = String(b.id || '').replace(/[^\w-]/g, ''), dk = 'img:draft-' + id;
      if (b.op === 'photoDrop') { await env.DB.delete(dk); return ok(); }
      // 🖼 страва на спільному фоні: каса сама вирізає й кладе страву на фон (b.data — готове фото, b.fit — розмір і місце); вирізка лишається (img:cut-<id>) — розмір можна підігнати знову без ШІ
      const raw = await env.DB.get(dk, 'arrayBuffer'), fin = b.data ? unData(b.data) : null, buf = fin ? Uint8Array.from(atob(fin.data), c => c.charCodeAt(0)).buffer : raw;
      if (!buf) return bad('Чернетку не знайдено — згенеруйте ще раз'); if (buf.byteLength > 3e6) return bad('Фото завелике');
      if (fin) { const sp = (await env.DB.get('cfg:photoStyle', 'json')) || { refs: [] }; if (raw) { await env.DB.put('img:cut-' + id, raw); (sp.cut ||= {})[id] = Date.now().toString(36); } if (b.fit) (sp.fit ||= {})[id] = { s: +(+b.fit.s || 1).toFixed(3), x: +(+b.fit.x || 0).toFixed(3), y: +(+b.fit.y || 0).toFixed(3) }; await env.DB.put('cfg:photoStyle', JSON.stringify(sp)); }
      else if (raw) { const sp = await env.DB.get('cfg:photoStyle', 'json'); if (sp?.cut?.[id]) { delete sp.cut[id]; await env.DB.delete('img:cut-' + id); await env.DB.put('cfg:photoStyle', JSON.stringify(sp)); } } // звичайне фото замість вирізки
      return menuLock(env, async () => {
        const menu = await getMenu(env), it = menu.categories.flatMap(c => c.items).find(x => x.id === id); if (!it) return bad('Страву не знайдено');
        await env.DB.put('img:' + id, buf); await env.DB.delete(dk); it.img = `${env.SELF_URL}/img/${id}?v=${Date.now().toString(36)}`; await saveMenu(env, menu);
        const c = menu.categories.find(x => x.items.includes(it)), st = (await env.DB.get('cfg:photoStyle', 'json')) || { refs: [] }; let anchor = false;
        if (c && !c.tech && !st.cat?.[c.id]?.refs?.length) { const k = 'style-' + crypto.randomUUID().slice(0, 6); await env.DB.put('img:' + k, buf); ((st.cat ||= {})[c.id] ||= { prompt: '', refs: [] }).refs.push(k); st.v = Date.now().toString(36); await env.DB.put('cfg:photoStyle', JSON.stringify(st)); anchor = true; } // перше фото блоку — його зразок
        return ok({ img: it.img, anchor });
      });
    }
  }
  return [{ error: 'unknown op' }, 400];
}

async function photoMake(b, env, who) {
  if (!env.GEMINI_IMG_KEY) return [{ error: 'ШІ-фото не підключено — зверніться до розробника' }, 503];
  const bgFor = b.bg != null ? String(b.bg).replace(/[^\w-]/g, '').slice(0, 60) || '_' : null; // 🖼 намалювати порожній фон блоку ('_' — закладу)
  const id = String(b.id || '').replace(/[^\w-]/g, ''), menu = await getMenu(env), it = menu.categories.flatMap(c => c.items).find(x => x.id === id), cat = bgFor ? menu.categories.find(c => c.id === bgFor) : menu.categories.find(c => c.items.includes(it));
  if (!it && bgFor == null) return [{ error: 'Страву не знайдено' }, 400];
  const { k, q } = await quota(env), today = dayKey();
  if ((q.d[today] || 0) >= DAY_CAP) return [{ error: `Сьогодні вже ${DAY_CAP} фото — продовжимо завтра` }, 429];
  const paid = q.n >= FREE && !isMain(env); /* 🤖 понад ліміт — з балансу ШІ закладу (VARVAR — без ліміту й оплати) */
  if (paid && (await aiBal(env)).bal < PRICE) return [{ error: `Безкоштовні ${FREE} фото цього місяця використано. Поповніть баланс ШІ в кабінеті власника (💳 Оплата) — ${PRICE} ₴ за фото`, bal: 1 }, 402];
  if (paid && !b.pay) return [{ error: 'pay', n: q.n, free: FREE, price: PRICE }, 402]; // каса питає «понад ліміт — 3 ₴, продовжити?»
  const busy = await L(env, 'phbusy', async () => { if (await env.DB.get('phbusy')) return 1; await env.DB.put('phbusy', '1', { expirationTtl: 120 }); }); // 🔒 зайняти атомарно; довше за тайм-аут ШІ (90 с)
  if (busy) return [{ error: 'Інше фото ще генерується — зачекайте кілька секунд' }, 429];
  try {
    const { q: q2 } = await quota(env); Object.assign(q, q2); // поки чекали — могло пройти інше фото: ліміт і баланс ще раз, уже під «зайнято»
    if (!paid && q.n >= FREE && !isMain(env)) return [{ error: 'pay', n: q.n, free: FREE, price: PRICE }, 402];
    if (paid && (await aiBal(env)).bal < PRICE) return [{ error: `Безкоштовні ${FREE} фото цього місяця використано. Поповніть баланс ШІ в кабінеті власника (💳 Оплата) — ${PRICE} ₴ за фото`, bal: 1 }, 402];
    const st = (await env.DB.get('cfg:photoStyle', 'json')) || {}, cs = st.cat?.[cat?.id] || {}, style = [st.prompt || STYLE0, cs.prompt].filter(Boolean).join('\nДЛЯ ЦЬОГО РОЗДІЛУ: '), refK = cs.refs?.length ? cs.refs : st.refs || [];
    const gem = async parts => { // → { bytes } | [помилка, статус]
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_IMG_KEY }, signal: AbortSignal.timeout(90000),
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } } }) });
      if (!r.ok) { console.log('photoMake', r.status, (await r.text()).slice(0, 300)); return [{ error: r.status === 429 ? 'ШІ перевантажений — спробуйте за хвилину' : 'Не вдалось згенерувати — спробуйте ще раз' }, 502]; }
      const d = await r.json(), p = (d.candidates?.[0]?.content?.parts || []).find(x => x.inlineData || x.inline_data), img = p && (p.inlineData || p.inline_data);
      if (!img?.data) return [{ error: 'ШІ не повернув фото (можливо, відмовив через опис) — змініть опис і спробуйте ще' }, 502];
      return { bytes: Uint8Array.from(atob(img.data), c => c.charCodeAt(0)) };
    };
    const count = async what => { if (paid) await aiCharge(env, PRICE, what, who); q.n++; if (paid) q.over++; q.d = { [today]: (q.d[today] || 0) + 1 }; await env.DB.put(k, JSON.stringify(q), { expirationTtl: 400 * 86400 }); };
    const refBufs = async l => (await Promise.all(l.map(r => env.DB.get('img:' + r, 'arrayBuffer')))).filter(Boolean);
    if (bgFor != null) { // 🖼 порожній фон: зі зразка прибираємо страву, без зразка — малюємо поверхню за стилем
      const rb = (await refBufs(bgFor === '_' ? st.refs || [] : refK)).slice(0, 1), parts = [];
      if (rb.length) parts.push({ inline_data: { mime_type: mimeOf(rb[0]), data: b64(rb[0]) } }, { text: 'Remove ALL food, plates, boards, bowls, glasses and props from this photo. Keep ONLY the empty background surface (table, stone, wood, cloth) with exactly the same camera angle, lighting, colors and depth of field. Fill the removed area naturally so it looks like an untouched empty surface. No text.' });
      else parts.push({ text: `Empty background for restaurant food photography: ONLY the surface (table / stone / wood), no food, no dishes, no props, no text. Camera at 45°, soft warm side light, shallow depth of field, darker vignette at the edges, empty center. Square 1:1. Venue style (ignore the food, keep surface, colors and light): ${style}` });
      const g = await gem(parts); if (Array.isArray(g)) return g;
      await env.DB.put('img:draft-bg-' + bgFor, g.bytes.buffer, { expirationTtl: 7 * 86400 }); await count('📸 фон');
      return [{ ok: true, draft: `${env.SELF_URL}/img/draft-bg-${bgFor}?v=${Date.now().toString(36)}`, n: q.n, over: q.over, free: freeOf(env), price: PRICE }, 200];
    }
    st.dish ||= {}; const note = b.note != null ? String(b.note).trim().slice(0, 600) : (st.dish[id] || '');
    if (b.note != null && note !== (st.dish[id] || '')) { if (note) st.dish[id] = note; else delete st.dish[id]; await env.DB.put('cfg:photoStyle', JSON.stringify(st)); } // промт страви — спільний для каси, кабінету й бота
    let src = unData(b.data); if (!src && b.mode === 'edit') { const buf = await dishBuf(env, id); if (buf) src = { mime: mimeOf(buf), data: b64(buf) }; }
    const strict = b.strict !== 0 && b.strict !== false, useRefs = b.refs != null ? !!+b.refs : !src || !!cs.refs?.length; // зразки блоку шлемо й до свого фото — інакше фон у блоці щоразу інший
    const refs = useRefs ? await refBufs(refK) : [];
    const dish = `«${it.name.uk}»${it.desc?.uk ? ' — склад: ' + it.desc.uk : ''}${it.size ? ', ' + it.size : ''}`;
    const look = note ? `\nЯК ВИГЛЯДАЄ СТРАВА (обовʼязково): ${note}` : '';
    const cut = !!(cs.bg || st.bg) && b.cut !== 0 && b.cut !== false; // 🖼 є спільний фон → ШІ малює лише страву на пурпуровому тлі, каса вирізає її й кладе на фон (фон у блоці однаковий на 100%)
    const parts = [];
    if (cut) {
      if (src) parts.push({ text: `IMAGE 1 — OUR REAL DISH ${dish}. This is the main photo.` }, { inline_data: { mime_type: src.mime, data: src.data } }, { text: strict ? 'Keep the dish from IMAGE 1 exactly: same shape, pieces, arrangement, colors, plate and portion. Add, remove or replace nothing.' : 'Keep the dish recognizable (ingredients, shape, plate); you may improve plating and light.' });
      else parts.push({ text: `Create a realistic restaurant photo of the dish ${dish}. Do not substitute another dish: shape and ingredients must match the description.` });
      refs.forEach((x, i) => parts.push({ text: `STYLE SAMPLE ${i + 1} — copy from it ONLY the plate/board/serveware, camera angle and lighting. IGNORE its background and do NOT copy its food${src ? ' (the food comes only from IMAGE 1)' : ''}.` }, { inline_data: { mime_type: mimeOf(x), data: b64(x) } }));
      parts.push({ text: `${look}\nVenue style (use it for light, angle and serveware; IGNORE any background or surface in it): ${style}\n\nOUTPUT RULES (most important): the whole dish on its plate/board, fully visible, nothing cropped, centered, filling about 70% of the frame. Background: perfectly flat uniform solid pure magenta #FF00FF, edge to edge — no table, no surface, no gradient, no texture, no shadow or reflection on the background, no props, no text. Soft studio light on the dish only. Square 1:1.` });
    } else {
      if (src) {
        parts.push({ text: `ЗОБРАЖЕННЯ 1 — НАША СПРАВЖНЯ СТРАВА ${dish}. Це головне фото.` }, { inline_data: { mime_type: src.mime, data: src.data } });
        const series = !!b.series && refs.length; // блок: одна серія — посуд, кут і масштаб зі зразка, від страви лише їжа
        parts.push({ text: (series ? `Збережи з ЗОБРАЖЕННЯ 1 лише саму їжу: ті самі інгредієнти, кількість і порцію. Посуд, кут камери, відстань (страва займає таку саму частку кадру), фон і світло — ТОЧНО як на ЗРАЗКУ СТИЛЮ, щоб усі фото блоку були однаковою серією.`
          : strict ? `Збережи страву з ЗОБРАЖЕННЯ 1 один в один: ту саму форму, кількість шматків, розташування, кольори, посуд і порцію. Нічого не додавай, не прибирай і не замінюй. Змінюй ЛИШЕ фон, поверхню під посудом і світло.`
          : `Збережи саму страву впізнаваною (інгредієнти, форма, посуд), можна покращити подачу й світло.`) + look });
      } else parts.push({ text: `Створи реалістичне фото страви ${dish}, як її подають у ресторані.${look}\nНе підміняй страву іншою: форма й інгредієнти мають відповідати опису.${refs.length ? ' Посуд, кут камери, відстань і фон — як на ЗРАЗКУ СТИЛЮ.' : ''}` });
      refs.forEach((x, i) => parts.push({ text: `ЗРАЗОК СТИЛЮ ${i + 1} — повтори з нього ТОЧНО фон, поверхню, кут камери, відстань, світло й кольори, щоб фото виглядали як одна серія. НЕ копіюй з нього страву${src ? ' — страва лише з ЗОБРАЖЕННЯ 1' : ''}.` }, { inline_data: { mime_type: mimeOf(x), data: b64(x) } }));
      parts.push({ text: `СТИЛЬ ЗАКЛАДУ: ${style}` });
    }
    const g = await gem(parts); if (Array.isArray(g)) return g;
    await env.DB.put('img:draft-' + id, g.bytes.buffer, { expirationTtl: 7 * 86400 });
    await count(`📸 ${it.name.uk}`);
    return [{ ok: true, draft: `${env.SELF_URL}/img/draft-${id}?v=${Date.now().toString(36)}`, cut, n: q.n, over: q.over, free: freeOf(env), price: PRICE }, 200];
  } finally { await env.DB.delete('phbusy'); }
}
