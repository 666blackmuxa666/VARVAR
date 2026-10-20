// ⏸ ВИМКНЕНО (виклик прибрано з index.js scheduled, ключі віддано боту підтримки). 🧪 ШІ-тестувальник у хмарі: двічі на день (вікна нижче, за Києвом) з cron кожні 5 хв бере по ОДНОМУ шматку коду
// на ділянку й просить Groq знайти баги. 1 запит на 5 хв — хвилинні ліміти не зачіпає.
// Код — з копії у файлах самого сервера (/__src, назовні не видно), стан і знахідки — у KV (ait:state, ait:bugs). Забрати: sh tools/bugs-pull.sh
// Ключі TEST_AI_1..3 — окремі тестові, робочі ключі закладу не чіпає. Однакові ключі — ділянки по черзі.
import { siteFile } from './index.js';
const WIN = [['03:00', '05:00'], ['14:00', '16:00']];
const CH = 14000;
const AREAS = {
  1: ['🧾 Каса', ['ops.js', 'pos.js', 'lpay.js', 'billing.js'], 'столи, замовлення, оплата, знижки, закриття рахунків, Z/X-звіти, рухи готівки'],
  2: ['🤖 Боти', ['bot.js', 'kitbot.js', 'courier.js', 'delivery.js', 'site.js'], 'Telegram-боти команди, кухні, кур\'єрів, гостей: доступ за ролями, вхід по PIN, callback-и'],
  3: ['📦 Склад і ЗП', ['stock.js', 'stockbot.js', 'pay.js'], 'склад, накладні, списання, інвентаризація, зарплати, аванси, графік'],
};
const sys = a => `Ти — суворий тестувальник POS-системи ресторану (Cloudflare Worker, JS). Ділянка: ${a}.
Шукай ЛИШЕ реальні баги в наданому шматку коду: помилки логіки, гроші рахуються не так, хтось отримує доступ не за роллю, падіння на null/undefined, гонки при записі, неперевірене введення.
Від'ємний залишок складу — НЕ баг (заклад так працює навмисно). НЕ пиши про стиль, назви, коментарі, «можна покращити». Якщо не впевнений — не пиши. Нічого не знайшов — відповідай рівно: НЕМАЄ
Формат кожної знахідки (українською, коротко):
### <ОДИН значок: 🔴 гроші/доступ/падіння, 🟡 логіка, 🟢 дрібне> <суть одним рядком>
- Де: <файл>:<рядок>
- Як відтворити: <дії>
- Очікував / вийшло: <...>`;

async function sha(s) { const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)); return [...new Uint8Array(b)].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join(''); }
async function chunks(env, files) {
  const out = [];
  for (const f of files) {
    const r = await siteFile(env, '/__src/' + f); if (!r.ok) continue;
    const lines = (await r.text()).split('\n');
    for (let i = 0, start = 0, buf = ''; i <= lines.length; i++) {
      if (i < lines.length && buf.length + lines[i].length < CH) { buf += lines[i] + '\n'; continue; }
      if (buf) out.push({ f, from: start + 1, code: buf, id: f + ':' + await sha(buf) });
      start = i; buf = i < lines.length ? lines[i] + '\n' : '';
    }
  }
  return out;
}

export async function aiTestTick(env, kh) {
  if (!WIN.some(([a, b]) => kh >= a && kh < b)) return;
  const keys = [1, 2, 3].map(n => env['TEST_AI_' + n]); if (!keys.some(Boolean)) return;
  const st = (await env.DB.get('ait:state', 'json')) || { seen: {}, turn: 0 };
  // різні ключі — кожна ділянка свій запит; однакові — по одній ділянці за тік по колу
  const uniq = new Set(keys.filter(Boolean)).size === keys.filter(Boolean).length;
  const todo = uniq ? [1, 2, 3].filter(n => keys[n - 1]) : [[1, 2, 3].filter(n => keys[n - 1])[st.turn++ % keys.filter(Boolean).length]];
  let add = '', hit = 0;
  for (const n of todo) {
    const A = AREAS[n], list = await chunks(env, A[1]), c = list.find(x => !st.seen[x.id]);
    if (!c) continue;
    hit = 1;
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { authorization: 'Bearer ' + keys[n - 1], 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', temperature: 0.2, messages: [{ role: 'system', content: sys(A[2]) }, { role: 'user', content: `Файл ${c.f}, рядки з ${c.from}:\n\n${c.code}` }] }),
    }).catch(() => null);
    if (!r || !r.ok) continue; // ліміт чи збій — цей шматок спробуємо наступного тіку
    const a = ((await r.json()).choices?.[0]?.message?.content || '').trim();
    st.seen[c.id] = 1;
    if (a && !/^НЕМАЄ/i.test(a)) add += `\n<!-- ${new Date().toISOString().slice(0, 16)} · ${A[0]} · ${c.f}:${c.from} -->\n${a}\n`;
  }
  if (!hit) return; // усе вже перевірено — нічого не пишемо
  const ids = Object.keys(st.seen); if (ids.length > 600) st.seen = Object.fromEntries(ids.slice(-400).map(k => [k, 1]));
  await env.DB.put('ait:state', JSON.stringify(st));
  if (add) await env.DB.put('ait:bugs', ((await env.DB.get('ait:bugs')) || '') + add);
}
