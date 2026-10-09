// 🔎 Зіставлення рядка накладної з продуктом складу (чиста логіка, без бази — тестується `node tools/stock-match-bench.mjs`).
// Порядок: штрихкод → памʼять псевдонімів (al) → точна назва → токен-скоринг з вагами (IDF по списку продуктів).
// Слова, яких немає в жодній назві продукту (марки «Galbani», «Галичина», «скло»…), просто не впливають на бал.

const LAT = { a: 'а', b: 'б', c: 'к', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'і', j: 'й', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'кс', y: 'і', z: 'з' };
// латиниця → кирилиця (mozzarella ≈ моцарела), подвоєні літери → одна, и/ы/ї → і
const tr = w => /[a-z]/.test(w) ? w.replace(/zz/g, 'ц').replace(/ch/g, 'ч').replace(/sh/g, 'ш').replace(/[a-z]/g, c => LAT[c]) : w;
// синоніми з накладних → як зазвичай звуть продукт на складі
const SYN = [[/^томат/, 'помідор'], [/^б+к$|^бібік/, 'барбекю'], [/^пепсі/, 'пепсі'], [/^кола$/, 'кока']];
const canon = w => { w = tr(w).replace(/[иыї]/g, 'і').replace(/(.)\1+/g, '$1'); for (const [r, v] of SYN) if (r.test(w)) return v; return w; };
// службові слова упаковки/торгові позначки — не про продукт
const STOP = new Set(['скло', 'ск', 'жб', 'ж', 'б', 'пет', 'пэт', 'пл', 'бут', 'бан', 'уп', 'упак', 'пач', 'ящ', 'вак', 'тм', 'ст', 'гост', 'ту', 'кг', 'г', 'гр', 'л', 'мл', 'шт', 'вага', 'ваг', 'весовой', 'ваговий', 'для', 'та', 'з', 'із', 'зі', 'в', 'у', 'на', 'по', 'пф', 'н', 'ф']);
export const nrm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[ʼ'’`"«»().,;:!?*_/\\+-]+/g, ' ').replace(/\s+/g, ' ').trim();
// фасування з назви: 0,33 / 0.5л / 125г / 1 кг → { v (у кг або л), u }
export function size(s) {
  s = String(s || '').toLowerCase().replace(/(\d),(\d)/g, '$1.$2');
  const m = s.match(/(\d+(?:\.\d+)?)\s*(кг|г|гр|л|мл|kg|g|l|ml)(?![a-zа-яіїє])/i);
  if (m) { const k = /^(г|гр|g|мл|ml)$/.test(m[2]) ? 0.001 : 1; return { v: Math.round(+m[1] * k * 1000) / 1000, u: /^(л|мл|l|ml)$/.test(m[2]) ? 'л' : 'кг' }; }
  const d = s.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*$/) || s.match(/(?:^|\s)(0\.\d+|[12]\.\d+)(?:\s|$)/); // «Pepsi 0.33», «Pepsi 1», «Стакан 400» без одиниці
  return d ? { v: +d[1] >= 10 ? +d[1] / 1000 : +d[1], u: '' } : null;
}
export function toks(s) {
  return nrm(s).replace(/\d+(?:[.,]\d+)?\s*(кг|г|гр|л|мл|шт|kg|g|l|ml|%)?/g, ' ').replace(/\//g, ' ').split(' ')
    .filter(w => w.length > 1 && !STOP.has(w)).map(canon).filter(w => w.length > 1);
}
// дві форми одного слова: моцарела/моцарели, томатний/томати (спільний корінь)
const same = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b.slice(0, Math.max(4, Math.min(b.length - 1, 6)))) || b.startsWith(a.slice(0, Math.max(4, Math.min(a.length - 1, 6))))));

// індекс по списку продуктів: токени + IDF
export function index(l) {
  const P = l.map(x => ({ x, t: [...new Set(toks(x.n))], sz: size(x.n) })), df = new Map();
  P.forEach(p => p.t.forEach(w => df.set(w, (df.get(w) || 0) + 1)));
  const N = P.length || 1, idf = w => Math.log(1 + N / (df.get(w) || 0.5));
  return { P, idf, vocab: [...df.keys()] };
}
// бал 0…1: скільки «ваги» назви продукту знайдено в рядку + чи всі значущі слова рядка пояснені
function score(q, qs, p, idf, vocab) {
  if (!p.t.length) return 0;
  let wp = 0, hp = 0; p.t.forEach(w => { const i = idf(w); wp += i; if (q.some(y => same(y, w))) hp += i; });
  if (!hp) return 0;
  const known = q.filter(y => vocab.some(w => same(y, w))); // слова рядка, що бувають у продуктах (марки відсіяно)
  let wl = 0, hl = 0; known.forEach(y => { const i = Math.max(...vocab.filter(w => same(y, w)).map(idf)); wl += i; if (p.t.some(w => same(y, w))) hl += i; });
  let s = 0.7 * hp / wp + 0.3 * (wl ? hl / wl : 1);
  if (qs && p.sz && (!qs.u || !p.sz.u || qs.u === p.sz.u)) s += Math.abs(qs.v - p.sz.v) < 1e-6 ? 0.1 : -0.35; // Pepsi 0.33 ≠ Pepsi 0.5
  return Math.max(0, Math.min(1, s));
}
export const SURE = 0.8, GAP = 0.12, WEAK = 0.4;
// → { id, ok: 'bc'|'mem'|'name'|'sure'|'guess'|'', sc, c: [{id,n,u,sc}] (кандидати для «❓ перевірте»), f? }
// 🚫 жодного спільного слова між назвою з документа й продуктом (Jack Daniel's ≠ Jim Beam, Трафальгар ≠ Bombay) — не зараховуємо мовчки
export function clash(n, x) { const q = toks(n), t = toks(x.n); return q.length > 0 && t.length > 0 && !t.some(w => q.some(y => same(y, w))); }
export function matchOne(ln, I, al, sk) {
  const m = matchOne0(ln, I, al, sk);
  if (m.id && m.ok !== 'bc' && !m.chk && ln.n) { const x = I.P.find(p => p.x.id === m.id)?.x; if (x && clash(ln.n, x)) return { ...m, ok: 'guess', sc: Math.min(m.sc || 0, 0.5), c: [{ id: x.id, n: x.n, u: x.u, sc: 0.5 }, ...(m.c || []).filter(c => c.id !== x.id)].slice(0, 3) }; }
  return m;
}
function matchOne0(ln, I, al, sk) {
  const l = I.P.map(p => p.x), has = id => l.some(x => x.id === id);
  if (ln.bc) { const x = l.find(y => (y.bc || []).includes(String(ln.bc))); if (x) return { id: x.id, ok: 'bc', sc: 1 }; }
  for (const s of [ln.n, ln.p].filter(Boolean)) { // памʼять: цей постачальник → будь-який постачальник
    const nn = nrm(s), m = al[sk + nn] || Object.entries(al).find(([k]) => k.endsWith('|' + nn))?.[1];
    if (m && has(m.id)) return { id: m.id, f: m.f, ok: 'mem', sc: 1, ...(m.chk ? { chk: 1 } : {}) }; /* chk — людина вже підтвердила саме цю заміну */
  }
  for (const s of [ln.n, ln.p].filter(Boolean)) { const x = l.find(y => nrm(y.n) === nrm(s)); if (x) return { id: x.id, ok: 'name', sc: 1 }; }
  const qs = size(ln.n) || size(ln.p), sc = new Map();
  for (const s of [ln.n, ln.p].filter(Boolean)) { const q = toks(s); I.P.forEach(p => { const v = score(q, qs, p, I.idf, I.vocab); if (v > (sc.get(p.x.id) || 0)) sc.set(p.x.id, v); }); }
  const top = I.P.map(p => ({ id: p.x.id, n: p.x.n, u: p.x.u, sc: Math.round((sc.get(p.x.id) || 0) * 100) / 100 })).filter(c => c.sc >= 0.25).sort((a, b) => b.sc - a.sc).slice(0, 3);
  const [a, b] = top;
  if (a && a.sc >= SURE && (!b || a.sc - b.sc >= GAP)) return { id: a.id, ok: 'sure', sc: a.sc };
  // «Сир Чеддер» ≈ усі сири однаково (лише слово «сир») — це, найімовірніше, новий продукт; кандидати все одно показуємо
  if (a && a.sc >= WEAK && !(a.sc < 0.6 && b && a.sc - b.sc < 0.02)) return { id: a.id, ok: 'guess', sc: a.sc, c: top };
  return { id: null, ok: '', sc: a?.sc || 0, c: top };
}
