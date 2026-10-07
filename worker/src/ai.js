// ✨ Помічник «Не знаю, що хочу»: Gemini ставить кілька питань і підбирає страви / сет із нашого меню
import { getMenu } from './menu.js';

// безкоштовні ліміти — окремо на кожну модель: беремо всі доступні flash-моделі й перемикаємось, коли одна вичерпана
const PREF = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
async function models(env) {
  let l = await env.DB.get('ai_models', 'json');
  if (!l) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
      const d = await r.json();
      l = (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace('models/', ''))
        .filter(n => /^gemini-.*flash/.test(n) && !/(image|tts|audio|live|thinking|exp|preview)/.test(n));
    } catch { l = []; }
    l = [...PREF, ...l.filter(n => !PREF.includes(n))].slice(0, 12);
    await env.DB.put('ai_models', JSON.stringify(l), { expirationTtl: 86400 });
  }
  return l;
}
const MAX_Q = 4;
const LANG = { uk: 'українською', en: 'in English', pl: 'po polsku', de: 'auf Deutsch', fr: 'en français', es: 'en español', it: 'in italiano', cs: 'česky', ro: 'în română', tr: 'Türkçe' };

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } },
    intro: { type: 'STRING' },
    picks: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      title: { type: 'STRING' }, why: { type: 'STRING' },
      items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, v: { type: 'STRING' }, q: { type: 'INTEGER' } }, required: ['id', 'q'] } },
    }, required: ['title', 'why', 'items'] } },
  },
};

function menuText(menu) {
  const out = [], byId = {};
  for (const c of menu.categories) {
    if (c.tech || c.id === 'upakuvannia') continue;
    const its = c.items.filter(i => !i.hidden); if (!its.length) continue;
    out.push(`## ${c.name.uk} [${c.id}]`);
    for (const i of its) {
      byId[i.id] = i;
      const price = i.variants ? i.variants.map(v => `${v.v}: ${v.p} грн`).join(' / ') : `${i.price} грн`;
      out.push(`- id=${i.id} | ${i.name.uk}${i.size ? ' (' + i.size + ')' : ''} | ${price}${i.desc?.uk ? ' | ' + i.desc.uk : ''}`);
    }
  }
  return { text: out.join('\n'), byId };
}

export const aiOn = env => !!(env.GEMINI_API_KEY || env.GROQ_API_KEY || env.KIMI_API_KEY);
// 🔁 запасні ШІ (OpenAI-сумісні): коли Gemini не відповів (ліміт / завис) або його ключа немає. Схему Gemini передаємо текстом.
// Текст: Gemini → Groq (безкоштовний) → Kimi (платний, копійки). Фото накладних: Gemini → Kimi (краще читає) → Groq.
const schemaText = s => !s ? 'any' : s.type === 'OBJECT' ? '{' + Object.entries(s.properties || {}).map(([k, v]) => `"${k}": ${schemaText(v)}`).join(', ') + '}' : s.type === 'ARRAY' ? '[' + schemaText(s.items) + ', …]' : s.type.toLowerCase();
const ALT = {
  groq: { key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions', text: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'], vision: ['qwen/qwen3.8-27b'], temp: 1 },
  kimi: { key: 'KIMI_API_KEY', url: 'https://api.moonshot.ai/v1/chat/completions', text: ['kimi-k2.6'], vision: ['kimi-k2.6'], temp: 0 }, // температуру Kimi не передаємо — у k2.6 вона фіксована
};
async function alt(env, name, parts, o = {}) {
  const P = ALT[name]; if (!env[P.key]) throw new Error(name + ' off');
  const busy = (await env.DB.get('ai_busy', 'json')) || {}, now = Date.now(), pics = parts.filter(p => p.inline_data).slice(0, 5);
  const text = parts.filter(p => p.text).map(p => p.text).join('\n') + `\n\nВідповідь — ЛИШЕ валідний JSON такої форми: ${schemaText(o.schema || SCHEMA)}`;
  const content = pics.length ? [{ type: 'text', text }, ...pics.map(p => ({ type: 'image_url', image_url: { url: `data:${p.inline_data.mime_type || 'image/jpeg'};base64,${p.inline_data.data}` } }))] : text;
  let last = name;
  for (const m of o.only ? [o.only] : (pics.length ? P.vision : P.text).filter(m => !(busy[name + ':' + m] > now))) try {
    const r = await fetch(P.url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env[P.key] }, signal: AbortSignal.timeout(Math.max(o.timeout || 8000, name === 'kimi' ? 40000 : 15000)),
      body: JSON.stringify({ model: m, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, ...(P.temp ? { temperature: o.temperature ?? 0.9 } : {}) }) });
    if (r.ok) { const d = await r.json(), t = d.choices?.[0]?.message?.content || '{}'; return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1) || '{}'); }
    if (r.status === 429) { busy[name + ':' + m] = now + 60e3; await env.DB.put('ai_busy', JSON.stringify(busy), { expirationTtl: 86400 }); }
    last = name + ' ' + m + ' ' + r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 300);
  } catch (e) { last = name + ' ' + m + ' ' + e.message; }
  throw new Error(last);
}
async function backup(env, parts, o, why) {
  const order = o.ai && ALT[o.ai] ? [o.ai] : parts.some(p => p.inline_data) ? ['kimi'] : ['groq', 'kimi'];
  let err = why;
  for (const n of order) { if (!env[ALT[n].key]) continue; try { console.log('ai fallback', n, String(err).slice(0, 200)); return await alt(env, n, parts, o); } catch (e) { err = e.message; } }
  throw new Error(String(err));
}

// prompt — текст або масив parts (текст + фото inline_data); o: { schema, timeout, temperature, prefer }
async function gemini(env, prompt, o = {}) {
  const parts0 = typeof prompt === 'string' ? [{ text: prompt }] : prompt;
  if (!env.GEMINI_API_KEY || ALT[o.ai]) return backup(env, parts0, o, 'gemini off');
  try { return await gemini1(env, parts0, o); }
  catch (e) { return backup(env, parts0, o, e.message); }
}
async function gemini1(env, prompt, o = {}) {
  let last, dirty = false;
  const busy = (await env.DB.get('ai_busy', 'json')) || {}, now = Date.now();
  let list = (await models(env)).filter(m => !(busy[m] > now));
  if (o.only) list = [o.only];
  else if (o.prefer) list = [...o.prefer.filter(m => list.includes(m)), ...list.filter(m => !o.prefer.includes(m))]; // для фото — спершу моделі, що найстабільніше читають
  if (!list.length) list = PREF;
  const parts = typeof prompt === 'string' ? [{ text: prompt }] : prompt, t0 = Date.now(), stop = new AbortController();
  const one = async m => {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        signal: AbortSignal.any([stop.signal, AbortSignal.timeout(o.budget ? Math.max(5000, Math.min(o.timeout || 8000, o.budget - (Date.now() - t0))) : o.timeout || 8000)]),
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: o.schema || SCHEMA, temperature: o.temperature ?? 0.9 } }),
      });
      if (r.ok) { const d = await r.json(); return JSON.parse(d.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '{}'); }
      if ([404, 429, 503].includes(r.status)) { busy[m] = now + (r.status === 404 ? 86400e3 : 60e3); dirty = true; } // закрита / вичерпана / перевантажена — пропускаємо
      throw new Error(m + ' ' + r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 300));
    } catch (e) { if (!stop.signal.aborted && !/^\S+ \d{3} /.test(e.message)) { busy[m] = now + 60e3; dirty = true; } throw new Error(e.message.startsWith(m) ? e.message : m + ' ' + e.message); } // зависла — теж пропускаємо хвилину
  };
  const save = () => dirty && env.DB.put('ai_busy', JSON.stringify(busy), { expirationTtl: 86400 });
  try {
    // фото: кілька моделей одночасно — бере першу відповідь (безкоштовні часто перевантажені або думають хвилину)
    const n = o.race ? Math.min(o.race, list.length) : 1;
    try { const r = await Promise.any(list.slice(0, n).map(one)); stop.abort(); return r; }
    catch (e) { last = e.errors?.map(x => x.message).join(' · ') || e.message; }
    for (const m of list.slice(n)) {
      if (o.budget && Date.now() - t0 > o.budget) break; // час вичерпано — віддаємо запасному ШІ
      try { return await one(m); } catch (e) { last = e.message; }
    }
    throw new Error(last);
  } finally { await save(); }
}

// 🧠 кабінет власника: «Запитай у даних» — відповідь лише з переданих цифр
export const aiAnswer = (env, prompt) => gemini(env, prompt, { schema: { type: 'OBJECT', properties: { answer: { type: 'STRING' } }, required: ['answer'] }, temperature: 0.2, timeout: 20000, prefer: ['gemini-2.5-flash', 'gemini-2.0-flash'] });

// b: { lang, device, hist: [{ q, a }] }
export async function aiHelp(b, env) {
  if (!aiOn(env)) return [{ error: 'off' }, 503];
  const dev = String(b.device || '').slice(0, 64) || 'anon';
  const rk = 'ai:' + dev, n = +(await env.DB.get(rk)) || 0;
  if (n > 40) return [{ error: 'limit' }, 429];
  await env.DB.put(rk, String(n + 1), { expirationTtl: 3600 });

  const hist = (Array.isArray(b.hist) ? b.hist : []).slice(0, MAX_Q).map(x => ({ q: String(x.q || '').slice(0, 200), a: String(x.a || '').slice(0, 200) }));
  const lang = LANG[b.lang] ? b.lang : 'en';
  const { text, byId } = menuText(await getMenu(env));
  const final = hist.length >= MAX_Q || b.now;
  const prompt = `Ти — привітний офіціант бару-ресторану VARVAR. Гість не знає, що замовити. Допоможи йому вибрати з МЕНЮ нижче.
Пиши ${LANG[lang]}, коротко, тепло, з легким гумором, можна 1 емодзі.

МЕНЮ (id | назва | ціна | склад):
${text}

Вже поставлені питання і відповіді гостя:
${hist.length ? hist.map((x, i) => `${i + 1}. ${x.q} → ${x.a}`).join('\n') : '(ще нічого)'}

${final ? `ЗАРАЗ дай фінальну пораду: поле "intro" (1 речення) і "picks" — 1–3 варіанти. Кожен варіант: "title" (назва сету чи страви), "why" (чому це підійде, 1–2 речення), "items" — позиції з меню: "id" ТОЧНО з меню, "v" — лише для позицій з варіантами (точна назва варіанта), "q" — кількість. Якщо гостей кілька — підбери на всіх. Можна додати напій. Дотримуйся бюджету, якщо його назвали. Не пиши "question".`
  : `Постав ОДНЕ наступне коротке питання ("question") і ОБОВʼЯЗКОВО 3–5 коротких варіантів відповіді ("options", до 4 слів кожен). Не повторюй уже поставлені питання. Питай про те, що найбільше допоможе вибрати: голод/перекус, скільки людей, мʼясо/риба/овочі, гостре, бюджет, напої. ${hist.length >= 2 ? 'Якщо вже достатньо інформації — замість питання одразу дай фінальну пораду (intro + picks, як описано: id точно з меню, v для варіантів, q кількість).' : ''}`}
Відповідь — JSON.`;

  let r;
  try { r = await gemini(env, prompt); } catch (e) { console.log('gemini', e.message); return [{ error: 'ai' }, 502]; }
  // перші 2 кроки — завжди питання (модель іноді заповнює обидва поля)
  if (r.question && !final && hist.length < 2) return [{ question: String(r.question).slice(0, 200), options: (r.options || []).slice(0, 5).map(o => String(o).slice(0, 40)) }, 200];
  if (r.picks?.length) {
    const picks = r.picks.slice(0, 3).map(p => {
      const items = (p.items || []).map(x => {
        const it = byId[x.id]; if (!it) return null;
        const q = Math.max(1, Math.min(20, +x.q || 1));
        if (it.variants) { const v = it.variants.find(z => z.v === x.v) || it.variants[0]; return { key: it.id + '|' + v.v, q, price: v.p }; }
        return { key: it.id, q, price: it.price };
      }).filter(Boolean);
      return { title: String(p.title || '').slice(0, 80), why: String(p.why || '').slice(0, 300), items, sum: items.reduce((s, x) => s + x.price * x.q, 0) };
    }).filter(p => p.items.length);
    if (picks.length) return [{ intro: String(r.intro || '').slice(0, 300), picks }, 200];
  }
  if (r.question && !final) return [{ question: String(r.question).slice(0, 200), options: (r.options || []).slice(0, 5).map(o => String(o).slice(0, 40)) }, 200];
  return [{ error: 'ai' }, 502];
}

// 🧾 накладна з фото (або текст QR-коду) → постачальник, №, дата, рядки. Фото лише передається в запиті — ніде не зберігається.
const BENCH = [['g', 'gemini-3.8-flash'], ['g', 'gemini-3.7-flash'], ['g', 'gemini-3.6-flash'], ['g', 'gemini-3.5-flash'], ['g', 'gemini-3.5-flash-lite'], ['g', 'gemini-3.1-flash-lite'], ['g', 'gemini-flash-latest'], ['g', 'gemini-flash-lite-latest'], ['g', 'gemma-4-31b-it'], ['groq', 'qwen/qwen3.8-27b'], ['kimi', 'kimi-k2.6']];
const INV = { type: 'OBJECT', properties: { sup: { type: 'STRING' }, no: { type: 'STRING' }, date: { type: 'STRING' }, total: { type: 'NUMBER' },
  lines: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'STRING' }, q: { type: 'NUMBER' }, u: { type: 'STRING' }, price: { type: 'NUMBER' }, sum: { type: 'NUMBER' }, p: { type: 'STRING' }, cat: { type: 'STRING' }, bar: { type: 'BOOLEAN' }, pu: { type: 'STRING' }, pq: { type: 'NUMBER' }, bc: { type: 'STRING' } }, required: ['n', 'q', 'u', 'sum', 'p', 'cat', 'bar', 'pu', 'pq'] } } }, required: ['lines'] };
async function invPrompt(env, images, text) {
  const { getIng } = await import('./stock.js'), ing = (await getIng(env)).filter(x => !x.off).slice(0, 300).map(x => x.n);
  const prompt = `Це ${images.length ? 'фото накладної / чека / рахунку постачальника' : 'вміст QR-коду накладної або чека'} українського ресторану. Витягни дані документа:
- sup: постачальник (назва продавця / ФОП / магазину), коротко;
- no: номер документа; date: дата (ДД.ММ.РРРР);
- total: загальна сума до сплати (з ПДВ);
- lines: КОЖЕН товарний рядок по порядку: n — назва товару як у документі (без артикулів), q — кількість, u — одиниця як у документі (кг, г, л, мл, шт, уп, ящ, пач, пл…), price — ціна за одиницю, sum — сума рядка.
Для кожного рядка також: p — коротка назва продукту для складу ресторану без бренду/відсотків/упаковки (напр. «Сир фета», «Куряче філе», «Pepsi 0.5»); cat — одна з категорій: М'ясо, Риба, Овочі й фрукти, Молочне, Бакалія, Соуси й спеції, Хліб, Напої, Алкоголь, Пиво, Кальян, Упаковка, Інше; bar — true, якщо це для бару (напої, алкоголь, кальян); pu — одиниця обліку на складі: «кг», «л» або «шт»; pq — скільки pu в ОДНІЙ одиниці з документа (напр. ящик Pepsi = 12 шт → pq 12; упаковка сиру 2.5 кг → pq 2.5; якщо одиниця та сама — 1; г → кг: 0.001); bc — штрихкод/EAN товару, якщо надрукований у рядку, інакше порожньо.${ing.length ? `\nПродукти, що вже є на складі. Якщо рядок — це один з них, p має бути ТОЧНО така назва зі списку (марка, жирність, тара не важливі; різний обʼєм напою — різні продукти): ${ing.join('; ')}` : ''}
Якщо є колонки з ПДВ і без ПДВ — бери з ПДВ. Числа — з крапкою. Не вигадуй рядків, не пропускай. Знижку/доставку — окремим рядком, якщо є. Відповідь — JSON.${text ? '\n\nВміст коду:\n' + text : ''}`;
  return prompt;
}
export async function aiInvoice(env, { images = [], text = '' }) {
  if (!aiOn(env)) return { error: 'AI вимкнено' };
  const prompt = await invPrompt(env, images, text);
  try {
    const r = await gemini(env, [{ text: prompt }, ...images.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))], { schema: INV, timeout: 50000, budget: 60000, race: 3, temperature: 0.1, prefer: ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'] });
    const num = v => Math.round((+String(v ?? '').replace(',', '.') || 0) * 1000) / 1000;
    const lines = (r.lines || []).map(l => ({ n: String(l.n || '').trim().slice(0, 80), q: num(l.q), u: String(l.u || '').trim().slice(0, 10), price: num(l.price), sum: num(l.sum) || Math.round(num(l.price) * num(l.q) * 100) / 100,
      p: String(l.p || '').trim().slice(0, 60), cat: String(l.cat || '').slice(0, 30), bar: !!l.bar, pu: ['кг', 'л', 'шт'].includes(l.pu) ? l.pu : '', pq: num(l.pq) || 0, ...(/^\d{8,14}$/.test(String(l.bc || '').trim()) ? { bc: String(l.bc).trim() } : {}) })).filter(l => l.n && l.q > 0).slice(0, 120);
    if (!lines.length) return { error: 'Не вдалось прочитати рядки — сфотографуйте рівніше й ближче' };
    return { sup: String(r.sup || '').trim().slice(0, 60), no: String(r.no || '').trim().slice(0, 30), date: String(r.date || '').trim().slice(0, 20), total: num(r.total), lines };
  } catch (e) { console.log('aiInvoice', e.message); return { error: 'Помічник зараз не відповідає — спробуйте ще раз за хвилину' }; }
}

// 📋 чернетка техкарти з назви, складу й ваги страви
const CARD = { type: 'OBJECT', properties: { out: { type: 'NUMBER' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'STRING' }, q: { type: 'NUMBER' }, u: { type: 'STRING' }, loss: { type: 'NUMBER' } }, required: ['n', 'q', 'u'] } } }, required: ['items'] };
export async function aiCard(env, b) {
  if (!aiOn(env)) return { error: 'AI вимкнено' };
  const { getIng, norm } = await import('./stock.js');
  const menu = await getMenu(env), key = String(b.key || ''), [id, v] = key.replace(/^semi:/, '').split('|');
  const it = menu.categories.flatMap(c => c.items.map(i => ({ ...i, cname: c.name.uk }))).find(i => i.id === id);
  const ing = (await getIng(env)).filter(x => !x.off);
  const semi = key.startsWith('semi:') ? ing.find(x => x.id === id) : null;
  if (!it && !semi) return { error: 'Страву не знайдено' };
  const name = semi ? semi.n : it.name.uk + (v ? ` ${v} ${it.size || 'л'}` : '');
  const prompt = `Ти — шеф-кухар і технолог ресторану в Україні. Склади техкарту (калькуляційну карту) на ${semi ? `заготовку «${name}» на партію ${b.yield || 1} ${semi.u}` : `1 порцію страви «${name}» (розділ меню: ${it.cname}${it.size ? ', вихід/обʼєм: ' + it.size : ''})`}.
${it?.desc?.uk ? 'Склад з меню: ' + it.desc.uk : ''}
Для кожного інгредієнта: n — назва продукту (як закуповують, напр. «Куряче філе», «Сир фета», «Олія соняшникова»); q — кількість БРУТТО на ${semi ? 'партію' : 'порцію'}; u — одиниця: «г», «мл» або «шт»; loss — % втрат при обробці (очищення, варіння, смаження), 0 якщо нема.
out — вихід готової ${semi ? 'партії' : 'страви'} в г або мл. Реалістичні ресторанні грамовки. ${ing.length ? 'Якщо продукт уже є в списку — назви ТОЧНО як у списку: ' + ing.slice(0, 250).map(x => x.n).join('; ') : ''}
Відповідь — JSON.`;
  let r; try { r = await gemini(env, prompt, { schema: CARD, timeout: 25000, temperature: 0.3, ai: ALT[b.ai] ? b.ai : '' }); } catch (e) { console.log('aiCard', e.message); return { error: 'Помічник зараз не відповідає — спробуйте ще раз за хвилину' }; }
  const base = u => /^(мл|ml|л|l)$/i.test(u) ? 'л' : /^(шт|pcs?)$/i.test(u) ? 'шт' : 'кг';
  const items = (r.items || []).slice(0, 30).map(l => {
    const u = String(l.u || 'г').toLowerCase(), k = /^(г|мл|g|ml)$/.test(u) ? 0.001 : 1, q = Math.round((+l.q || 0) * k * 1000) / 1000, x = ing.find(y => norm(y.n) === norm(l.n));
    return q > 0 ? { id: x?.id || null, n: x?.n || String(l.n).slice(0, 60), u: x?.u || base(u), q, loss: Math.max(0, Math.min(90, Math.round(+l.loss || 0))), ...(x ? {} : { add: 1 }) } : null;
  }).filter(Boolean);
  if (!items.length) return { error: 'Не вийшло — спробуйте ще раз' };
  return { name, out: Math.round(+r.out || 0), items };
}

// 🧪 порівняння ШІ на одній накладній: те саме фото одночасно в кожну безкоштовну модель → час, рядки, сума, помилка
export async function aiBench(env, images, only) {
  const prompt = await invPrompt(env, images, ''), parts = [{ text: prompt }, ...images.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))];
  const o = { schema: INV, timeout: 60000, temperature: 0.1 };
  return Promise.all(BENCH.filter(([k, m]) => !only || only.includes(m)).filter(([k]) => env[k === 'g' ? 'GEMINI_API_KEY' : ALT[k].key]).map(async ([k, m]) => {
    const t = Date.now();
    try {
      const r = await (k === 'g' ? gemini1(env, parts, { ...o, only: m }) : alt(env, k, parts, { ...o, only: m }));
      const lines = (r.lines || []).filter(l => l.n && +l.q > 0);
      return { m, ms: Date.now() - t, rows: lines.length, sum: Math.round(lines.reduce((s, l) => s + (+l.sum || 0), 0) * 100) / 100, total: +r.total || 0, sup: String(r.sup || '').slice(0, 40), ex: lines.slice(0, 3).map(l => `${l.n} ${l.q}${l.u || ''} ${l.sum}`.slice(0, 60)) };
    } catch (e) { return { m, ms: Date.now() - t, err: String(e.message).replace(m, '').slice(0, 160) }; }
  }));
}
