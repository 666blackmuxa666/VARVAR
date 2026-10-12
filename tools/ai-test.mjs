// 🧪 ШІ-тестувальник: читає код своєї ділянки шматками й записує підозри на баги в _team/bugs.md
// Ключі — TEST_AI_1..3 з ../ключі.env (окремі від робочих, ліміти закладу не чіпає).
// Запуск: node tools/ai-test.mjs 1   (1 каса · 2 боти · 3 склад і ЗП)   --all = перевірити все заново
// Перевіряє лише шматки, що змінились з минулого разу (стан у _team/.ai-test.json) — так економить ліміт.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ROOT = decodeURIComponent(new URL('..', import.meta.url).pathname), SRC = ROOT + 'worker/src/';
const AREAS = {
  1: ['🧾 Каса', ['ops.js', 'pos.js', 'lpay.js', 'billing.js'], 'столи, замовлення, оплата, знижки, закриття рахунків, Z/X-звіти, рухи готівки'],
  2: ['🤖 Боти', ['bot.js', 'kitbot.js', 'courier.js', 'delivery.js', 'site.js'], 'Telegram-боти команди, кухні, кур\'єрів, гостей: доступ за ролями, вхід по PIN, callback-и'],
  3: ['📦 Склад і ЗП', ['stock.js', 'stockbot.js', 'pay.js'], 'склад, накладні, списання, інвентаризація, зарплати, аванси, графік'],
};
const n = process.argv[2], all = process.argv.includes('--all'), A = AREAS[n];
if (!A) { console.log('node tools/ai-test.mjs 1|2|3 [--all]'); process.exit(1); }
const env = Object.fromEntries(readFileSync(ROOT + '../ключі.env', 'utf8').split('\n').map(l => l.match(/^([A-Z_0-9]+)=([^\s#]+)/)).filter(Boolean).map(m => [m[1], m[2]]));
const KEY = env['TEST_AI_' + n]; if (!KEY) { console.log(`❌ Немає TEST_AI_${n} у ключі.env`); process.exit(1); }
const STATE = ROOT + '_team/.ai-test.json', OUT = ROOT + '_team/bugs.md', CH = 14000; // ~4–5 тис. токенів на шматок
const st = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SYS = `Ти — суворий тестувальник POS-системи ресторану (Cloudflare Worker, JS). Ділянка: ${A[2]}.
Шукай ЛИШЕ реальні баги в наданому шматку коду: помилки логіки, гроші рахуються не так, хтось отримує доступ не за роллю, падіння на null/undefined, гонки при записі, неперевірене введення.
Від'ємний залишок складу — НЕ баг (заклад так працює навмисно). НЕ пиши про стиль, назви, коментарі, «можна покращити». Якщо не впевнений — не пиши. Нічого не знайшов — відповідай рівно: НЕМАЄ
Формат кожної знахідки (українською, коротко):
### <ОДИН значок: 🔴 гроші/доступ/падіння, 🟡 логіка, 🟢 дрібне> <суть одним рядком>
- Де: <файл>:<рядок>
- Як відтворити: <дії>
- Очікував / вийшло: <...>`;

async function ask(file, from, code) {
  for (let i = 0; i < 6; i++) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { authorization: 'Bearer ' + KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', temperature: 0.2, messages: [{ role: 'system', content: SYS }, { role: 'user', content: `Файл ${file}, рядки з ${from}:\n\n${code}` }] }),
    });
    if (r.status === 429) { const w = Math.min(+(r.headers.get('retry-after') || 30), 600); console.log(`  ⏳ ліміт, чекаю ${w} с`); await sleep(w * 1000 + 500); continue; }
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200));
    return (await r.json()).choices[0].message.content.trim();
  }
  throw new Error('ліміт не відпускає — спробуйте пізніше');
}

let found = 0, done = 0;
try {
  for (const f of A[1]) {
    const lines = readFileSync(SRC + f, 'utf8').split('\n');
    for (let i = 0, start = 0, buf = ''; i <= lines.length; i++) {
      if (i < lines.length && buf.length + lines[i].length < CH) { buf += lines[i] + '\n'; continue; }
      const h = createHash('sha1').update(buf).digest('hex').slice(0, 12), id = `${f}:${h}`;
      if (all || !st[id]) {
        process.stdout.write(`🔎 ${f} з рядка ${start + 1}… `);
        const a = await ask(f, start + 1, buf); done++;
        if (!/^НЕМАЄ/i.test(a)) { appendFileSync(OUT, `\n<!-- ${new Date().toISOString().slice(0, 16)} · ${A[0]} · ${f}:${start + 1} -->\n${a}\n`); found++; console.log('⚠️ є підозри'); } else console.log('✅');
        st[id] = 1; writeFileSync(STATE, JSON.stringify(st));
        await sleep(8000); // рівномірно, щоб не впиратись у ліміт за хвилину
      }
      start = i; buf = i < lines.length ? lines[i] + '\n' : '';
    }
  }
} catch (e) { console.log('\n❌ ' + e.message + ' — перевірене збережено, наступний запуск продовжить'); }
console.log(`\nГотово: перевірено ${done} шматків, з підозрами ${found}. Дивіться _team/bugs.md`);
