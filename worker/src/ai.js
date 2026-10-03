// ✨ Помічник «Не знаю, що хочу»: Gemini ставить кілька питань і підбирає страви / сет із нашого меню
import { getMenu } from './menu.js';

const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-lite-latest', 'gemini-flash-latest']; // lite — швидка; повтор, якщо зависла
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
    if (c.id === 'upakuvannia') continue;
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

async function gemini(env, prompt) {
  let last;
  for (const m of MODELS) try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.9 } }),
    });
    if (!r.ok) console.log('gemini-fail', m, r.status);
    if (r.ok) { const d = await r.json(); return JSON.parse(d.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '{}'); }
    last = m + ' ' + r.status + ' ' + (await r.text()).replace(/\s+/g, ' ').slice(0, 400);
  } catch (e) { last = m + ' ' + e.message; }
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
