// ✨ Помічник «Не знаю, що хочу»: Gemini ставить кілька питань і підбирає страви / сет із нашого меню
import { getMenu } from './menu.js';

// безкоштовні ліміти — окремо на кожну модель: беремо всі доступні flash-моделі й перемикаємось, коли одна вичерпана
const PREF = ['gemini-flash-lite-latest', 'gemini-flash-latest'];
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

// prompt — текст або масив parts (текст + фото inline_data); o: { schema, timeout, temperature, prefer }
async function gemini(env, prompt, o = {}) {
  let last;
  const busy = (await env.DB.get('ai_busy', 'json')) || {}, now = Date.now();
  let list = (await models(env)).filter(m => !(busy[m] > now));
  if (o.prefer) list = [...o.prefer.filter(m => list.includes(m)), ...list.filter(m => !o.prefer.includes(m))]; // для фото — спершу сильніша модель
  const parts = typeof prompt === 'string' ? [{ text: prompt }] : prompt;
  for (const m of list.length ? list : PREF) try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(o.timeout || 8000),
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: o.schema || SCHEMA, temperature: o.temperature ?? 0.9 } }),
    });
    if (r.status === 429 || r.status === 404) { busy[m] = now + (r.status === 404 ? 86400e3 : 60e3); await env.DB.put('ai_busy', JSON.stringify(busy), { expirationTtl: 86400 }); } // вичерпана — пропускаємо хвилину
    if (r.ok) { const d = await r.json(); return JSON.parse(d.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '{}'); }
    last = m + ' ' + r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 400);
  } catch (e) { last = m + ' ' + e.message; busy[m] = now + 60e3; await env.DB.put('ai_busy', JSON.stringify(busy), { expirationTtl: 86400 }); } // зависла — теж пропускаємо хвилину
  throw new Error(last);
}

// b: { lang, device, hist: [{ q, a }] }
export async function aiHelp(b, env) {
  if (!env.GEMINI_API_KEY) return [{ error: 'off' }, 503];
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
const INV = { type: 'OBJECT', properties: { sup: { type: 'STRING' }, no: { type: 'STRING' }, date: { type: 'STRING' }, total: { type: 'NUMBER' },
  lines: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'STRING' }, q: { type: 'NUMBER' }, u: { type: 'STRING' }, price: { type: 'NUMBER' }, sum: { type: 'NUMBER' }, p: { type: 'STRING' }, cat: { type: 'STRING' }, bar: { type: 'BOOLEAN' }, pu: { type: 'STRING' }, pq: { type: 'NUMBER' } }, required: ['n', 'q', 'u', 'sum', 'p', 'cat', 'bar', 'pu', 'pq'] } } }, required: ['lines'] };
export async function aiInvoice(env, { images = [], text = '' }) {
  if (!env.GEMINI_API_KEY) return { error: 'AI вимкнено' };
  const prompt = `Це ${images.length ? 'фото накладної / чека / рахунку постачальника' : 'вміст QR-коду накладної або чека'} українського ресторану. Витягни дані документа:
- sup: постачальник (назва продавця / ФОП / магазину), коротко;
- no: номер документа; date: дата (ДД.ММ.РРРР);
- total: загальна сума до сплати (з ПДВ);
- lines: КОЖЕН товарний рядок по порядку: n — назва товару як у документі (без артикулів), q — кількість, u — одиниця як у документі (кг, г, л, мл, шт, уп, ящ, пач, пл…), price — ціна за одиницю, sum — сума рядка.
Для кожного рядка також: p — коротка назва продукту для складу ресторану без бренду/відсотків/упаковки (напр. «Сир фета», «Куряче філе», «Pepsi 0.5»); cat — одна з категорій: М'ясо, Риба, Овочі й фрукти, Молочне, Бакалія, Соуси й спеції, Хліб, Напої, Алкоголь, Пиво, Кальян, Упаковка, Інше; bar — true, якщо це для бару (напої, алкоголь, кальян); pu — одиниця обліку на складі: «кг», «л» або «шт»; pq — скільки pu в ОДНІЙ одиниці з документа (напр. ящик Pepsi = 12 шт → pq 12; упаковка сиру 2.5 кг → pq 2.5; якщо одиниця та сама — 1; г → кг: 0.001).
Якщо є колонки з ПДВ і без ПДВ — бери з ПДВ. Числа — з крапкою. Не вигадуй рядків, не пропускай. Знижку/доставку — окремим рядком, якщо є. Відповідь — JSON.${text ? '\n\nВміст коду:\n' + text : ''}`;
  try {
    const r = await gemini(env, [{ text: prompt }, ...images.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } }))], { schema: INV, timeout: 45000, temperature: 0.1, prefer: ['gemini-flash-latest', 'gemini-2.5-flash'] });
    const num = v => Math.round((+String(v ?? '').replace(',', '.') || 0) * 1000) / 1000;
    const lines = (r.lines || []).map(l => ({ n: String(l.n || '').trim().slice(0, 80), q: num(l.q), u: String(l.u || '').trim().slice(0, 10), price: num(l.price), sum: num(l.sum) || Math.round(num(l.price) * num(l.q) * 100) / 100,
      p: String(l.p || '').trim().slice(0, 60), cat: String(l.cat || '').slice(0, 30), bar: !!l.bar, pu: ['кг', 'л', 'шт'].includes(l.pu) ? l.pu : '', pq: num(l.pq) || 0 })).filter(l => l.n && l.q > 0).slice(0, 120);
    if (!lines.length) return { error: 'Не вдалось прочитати рядки — сфотографуйте рівніше й ближче' };
    return { sup: String(r.sup || '').trim().slice(0, 60), no: String(r.no || '').trim().slice(0, 30), date: String(r.date || '').trim().slice(0, 20), total: num(r.total), lines };
  } catch (e) { console.log('aiInvoice', e.message); return { error: 'Помічник зараз не відповідає — спробуйте ще раз за хвилину' }; }
}

// 📋 чернетка техкарти з назви, складу й ваги страви
const CARD = { type: 'OBJECT', properties: { out: { type: 'NUMBER' }, items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { n: { type: 'STRING' }, q: { type: 'NUMBER' }, u: { type: 'STRING' }, loss: { type: 'NUMBER' } }, required: ['n', 'q', 'u'] } } }, required: ['items'] };
export async function aiCard(env, b) {
  if (!env.GEMINI_API_KEY) return { error: 'AI вимкнено' };
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
  let r; try { r = await gemini(env, prompt, { schema: CARD, timeout: 25000, temperature: 0.3 }); } catch (e) { console.log('aiCard', e.message); return { error: 'Помічник зараз не відповідає — спробуйте ще раз за хвилину' }; }
  const base = u => /^(мл|ml|л|l)$/i.test(u) ? 'л' : /^(шт|pcs?)$/i.test(u) ? 'шт' : 'кг';
  const items = (r.items || []).slice(0, 30).map(l => {
    const u = String(l.u || 'г').toLowerCase(), k = /^(г|мл|g|ml)$/.test(u) ? 0.001 : 1, q = Math.round((+l.q || 0) * k * 1000) / 1000, x = ing.find(y => norm(y.n) === norm(l.n));
    return q > 0 ? { id: x?.id || null, n: x?.n || String(l.n).slice(0, 60), u: x?.u || base(u), q, loss: Math.max(0, Math.min(90, Math.round(+l.loss || 0))), ...(x ? {} : { add: 1 }) } : null;
  }).filter(Boolean);
  if (!items.length) return { error: 'Не вийшло — спробуйте ще раз' };
  return { name, out: Math.round(+r.out || 0), items };
}
