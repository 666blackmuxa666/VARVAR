// Замовлення від офіціанта текстом у боті:
//   1            ← номер столу (або «стіл 1»)
//   гранад 2     ← страва + кількість (помилки в назвах допускаються)
//   пепсі 0.5 4  ← для напоїв з розмірами можна вказати розмір
// Бот показує розпізнане з цінами → «✅ Додати до столу».
import { getMenu } from './menu.js';
import { tn } from './tn.js';

const norm = s => String(s).toLowerCase().replace(/[ʼ'’`"«»\-–—.,!?()]/g, ' ').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '' };
const lat = s => [...s].map(c => TR[c] ?? c).join('');
// спрощення для звукової схожості латиниці: pepsi≈pepsy, cola≈kola, whisky≈viski
const snd = s => lat(s).replace(/[yj]/g, 'i').replace(/c(?=[eiy])/g, 's').replace(/[cq]/g, 'k').replace(/w/g, 'v').replace(/kh/g, 'h').replace(/ph/g, 'f').replace(/dzh/g, 'j').replace(/[ae]i/g, 'i').replace(/e\b/g, '').replace(/(.)\1+/g, '$1');

// розмовні назви, як їх пишуть офіціанти
const ALIASES = {
  jack: ['джек', 'джек деніелс', 'джек дениелс', 'деніелс'], 'red-label': ['ред лейбл', 'ред'], 'jim-beam': ['джим бім', 'джим'], jameson: ['джемісон', 'джемесон', 'джеймсон'],
  'dewars-wl': ['дюарс', 'деварс'], aberfeldy: ['аберфелді'], 'bacardi-spiced': ['бакарді спайсд', 'спайсд'], 'bacardi-blanca': ['бакарді', 'бакарді білий', 'карта бланка'],
  'bacardi-negra': ['карта негра', 'бакарді чорний'], oakheart: ['окхарт'], 'martini-bianco': ['мартіні', 'мартіні б'], 'martini-rosso': ['мартіні россо'],
  jager: ['ягер', 'єгер', 'єгермейстер', 'ягермайстер', 'егер'], becherovka: ['бехеровка'], sambuca: ['самбука'], metaxa: ['метакса'], hennessy: ['хенесі', 'хеннесі'],
  askaneli: ['асканелі', 'коньяк'], hetman: ['гетьман', 'горілка'], finlandia: ['фінляндія', 'фінка'], 'grey-goose': ['грей гус'], 'casco-viejo': ['касо', 'каско', 'текіла'],
  patron: ['патрон'], larios: ['ларіос'], bombay: ['бомбей', 'джин'], nastoyanky: ['настоянка'], 'martini-asti': ['асті', 'шампанське'],
  beer: ['пиво', 'опілля'], kronenbourg: ['кроненбург'], corona: ['корона'], 'blanc-draft': ['бланк', 'бланш', 'пиво розливне'], grimbergen: ['грімберген'],
  pepsi: ['пепсі', 'пепсі кола'], sprite: ['спрайт'], '7up': ['севен ап', 'сенап'], mirinda: ['міринда'], water: ['вода', 'мінералка'], redbull: ['ред бул', 'редбул', 'енергетик'],
  sandora: ['сік', 'сандора'], 'cola-cherry': ['кола черрі', 'кола вишня'], 'fries-l': ['фрі', 'картопля фрі'], 'tea': ['чай'], 'hookah-silver': ['кальян'],
};

function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
const sim = (q, n) => {
  if (!q || !n) return 0;
  if (n === q) return 1;
  if (n.startsWith(q) && q.length >= 3) return 0.92 + 0.05 * q.length / n.length;
  return 1 - lev(q, n) / Math.max(q.length, n.length);
};
// найкраща схожість запиту з назвою: ціла назва, окремі слова, транслітерація
function score(q, names) {
  let best = 0; const qs = snd(q);
  for (const raw of names) {
    const n = norm(raw);
    const variants = [n, ...n.split(' ').filter(w => w.length >= 3)];
    variants.forEach((v, i) => { const pen = i ? 0.06 : 0; best = Math.max(best, sim(q, v) - pen, sim(qs, snd(v)) - 0.02 - pen); });
    // кілька слів у запиті: кожне слово шукаємо серед слів назви («паста кревет», «чай малина»)
    const qw = q.split(' ').filter(Boolean), nw = n.split(' ').filter(w => w.length >= 2);
    if (qw.length > 1 && nw.length > 1) {
      const per = qw.map(w => Math.max(...nw.map(x => Math.max(sim(w, x), sim(snd(w), snd(x)) - 0.02))));
      best = Math.max(best, per.reduce((x, y) => x + y, 0) / per.length - 0.03);
    }
  }
  return best;
}
export function matchItem(menu, query) {
  const q = norm(query); if (!q) return null;
  const all = menu.categories.flatMap(c => c.items);
  const ranked = all.map(it => ({ it, s: score(q, [it.name.uk, it.name.en, ...(it.aliases || []), ...(ALIASES[it.id] || [])]) })).sort((a, b) => b.s - a.s);
  const [a, b] = ranked;
  if (!a || a.s < 0.72) return { none: true, guesses: ranked.slice(0, 3).filter(x => x.s > 0.35).map(x => x.it.name.uk) };
  const unsure = b && b.it !== a.it && a.s - b.s < 0.04 && a.s < 0.97;
  return { it: a.it, unsure, alt: unsure ? b.it.name.uk : null };
}

// розбір повідомлення офіціанта; повертає null, якщо це не замовлення
export function parseWaiterOrder(menu, text, maxTables) {
  const rows = text.split('\n').map(s => s.trim()).filter(Boolean);
  if (rows.length < 2) return null;
  const tm = rows[0].toLowerCase().match(/^(?:стіл|стол|table|№)?\s*№?\s*(\d{1,3})$/);
  if (!tm) return null;
  const table = +tm[1]; if (table < 1 || table > maxTables) return { error: `Столу ${tn(table)} немає (столи 1–${maxTables}).` };
  const items = [], bad = [];
  for (const row of rows.slice(1)) {
    let s = row.replace(/[×x*]\s*(\d+)\s*$/i, ' $1').replace(/^(\d+)\s*[×x*]?\s+(?=\D)/, (_, n) => `\u0000${n} `);
    let q = 1, size = null;
    const lead = s.match(/^\u0000(\d+)\s+/); if (lead) { q = +lead[1]; s = s.slice(lead[0].length); }
    const sz = s.match(/\s(\d[.,]\d{1,2})\s*(?:л|l)?(?=\s|$)/); if (sz) { size = sz[1].replace(',', '.'); s = s.replace(sz[0], ' '); }
    const tail = s.match(/\s(\d{1,2})\s*(?:шт|pcs)?\s*$/i); if (tail && !lead) { q = +tail[1]; s = s.slice(0, tail.index); }
    q = Math.min(Math.max(q, 1), 50);
    const m = matchItem(menu, s);
    if (!m || m.none) { bad.push({ row, guesses: m?.guesses || [] }); continue; }
    const it = m.it;
    let v = null, price = it.price;
    if (it.variants) {
      v = (size && it.variants.find(x => x.v === size || +x.v === +size)) || it.variants[0];
      price = v.p;
    }
    items.push({ id: it.id, name: it.name.uk + (v ? ` ${v.v} л` : ''), v: v?.v, q, price, hidden: !!it.hidden, unsure: m.unsure, alt: m.alt, row, sizeDefault: it.variants && !size });
  }
  return { table, items, bad };
}

export function draftText(d) {
  const ok = d.items.filter(i => !i.hidden);
  const sum = ok.reduce((s, i) => s + i.price * i.q, 0);
  const lines = d.items.map(i => {
    const base = `${i.q}× ${i.name} — ${i.price * i.q}`;
    if (i.hidden) return `⛔ <s>${base}</s> (у стоп-листі)`;
    const notes = [i.unsure ? `можливо «${i.alt}»?` : '', i.sizeDefault ? 'розмір за замовч.' : ''].filter(Boolean).join(', ');
    return `${i.unsure ? '⚠️' : '✅'} ${base}${notes ? ` <i>(${notes})</i>` : ''}`;
  });
  const bad = d.bad.map(b => `❓ «${b.row}» — не знайшов${b.guesses.length ? ` (може: ${b.guesses.join(', ')}?)` : ''}`);
  return [`🧾 <b>Стіл ${tn(d.table)}</b> — замовлення від офіціанта`, '', ...lines, ...bad, '', ok.length ? `Сума: <b>${sum} грн</b>` : 'Нічого додати.',
    bad.length || d.items.some(i => i.unsure) ? '\n<i>Якщо щось не так — виправте текст і надішліть ще раз.</i>' : ''].filter(x => x !== '').join('\n');
}
