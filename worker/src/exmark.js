// 🍾 Акцизні марки: пляшки акцизного продукту (марка → скільки лишилось у пляшці). Чиста логіка без імпортів складу.
// Ключ exm: { <id продукту>: { b: [пляшка…], q: [марки відкритих пляшок, що ще не потрапили у фіскальний чек], short? } }
// пляшка: { c: марка, e?: 1 (електронна єАкциз), left, add: ts, inv?: накладна, o?: відкрито ts, d?: закінчилась ts, w?: списано (причина), fr?: 'день/чек' }
// Порядок у b — порядок витрати: відкрита пляшка першою, далі нові в порядку сканування. Змінювати лише під замком «ing».
export const getExm = async env => (await env.DB.get('exm', 'json')) || {};
export const putExm = (env, m) => env.DB.put('exm', JSON.stringify(m));
const r3 = x => Math.round((+x || 0) * 1000) / 1000;
// обʼєм однієї пляшки в одиницях продукту (0.5 л; для «шт» — 1 пляшка)
export const exVol = x => +x?.vol > 0 ? r3(x.vol) : x?.u === 'л' ? 0.5 : 1;
export const exP = (m, id) => (m[id] ||= { b: [], q: [] });
// скільки ще можна продати за марками (відкрита + нові пляшки)
export const exCap = (m, id) => r3((m[id]?.b || []).reduce((a, y) => a + (y.d ? 0 : y.left), 0));
// марка зі сканера / камери: без керівних символів (сканер-клавіатура губить GS з DataMatrix, тож прибираємо завжди — однаково для всіх способів), 6–200 символів.
// Лише цифри — паперова марка (штрихкод), інакше — електронна (DataMatrix єАкциз; людина може ввести лише 12 символів з-під коду).
export function exCode(s) { s = String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim(); return s.length >= 6 && s.length <= 200 ? s : ''; }
export const exIsE = c => !/^\d+$/.test(c);
// та сама марка: точний збіг або 12 символів, введених очима, ⊂ повного коду DataMatrix
export const exSame = (a, b) => a === b || (a.length === 12 && b.length > 12 && b.includes(a)) || (b.length === 12 && a.length > 12 && a.includes(b));
export const exFind = (l, c) => { const i = l.findIndex(y => y.c === c); return i >= 0 ? i : l.findIndex(y => exSame(y.c, c)); };
const tail = c => '…' + String(c).slice(-6);
export const exTail = tail;
function prune(p) { const done = p.b.filter(y => y.d); if (done.length > 150) { const cut = new Set(done.slice(0, done.length - 150)); p.b = p.b.filter(y => !cut.has(y)); } if (p.q.length > 100) p.q = p.q.slice(-100); }
// відкрити пляшку: марка стає в чергу на фіскальний чек (у чеку марка — лише при першій порції з пляшки)
function open(p, y) { if (y.o) return false; y.o = Date.now(); p.q.push(y.c); return true; }

// продаж qq > 0: з відкритої пляшки, закінчилась → наступна. qq < 0 (повернули порцію) — назад у відкриту / щойно закінчену.
// → [пляшки, відкриті цим продажем]
export function exTake(m, x, qq) {
  const p = exP(m, x.id), opened = []; qq = r3(qq);
  if (qq > 0) {
    let need = qq;
    for (const y of p.b) {
      if (need <= 0) break; if (y.d) continue;
      if (open(p, y)) opened.push(y);
      const t = Math.min(y.left, need); y.left = r3(y.left - t); need = r3(need - t);
      if (y.left <= 0) { y.left = 0; y.d = Date.now(); }
    }
    if (need > 0) p.short = r3((p.short || 0) + need); // продано понад марки (не мало статися: каса не дає замовити)
  } else if (qq < 0) {
    let give = -qq; const vol = exVol(x);
    if (p.short) { const t = Math.min(p.short, give); p.short = r3(p.short - t); give = r3(give - t); if (!p.short) delete p.short; }
    const cand = [...p.b.filter(y => y.o && !y.d), ...p.b.filter(y => y.d && !y.w).sort((a, b) => b.d - a.d)];
    for (const y of cand) { if (give <= 0) break; const t = Math.min(r3(vol - y.left), give); if (t <= 0) continue; y.left = r3(y.left + t); give = r3(give - t); delete y.d; }
  }
  prune(p); return opened;
}
// відкрити саме цю пляшку (бармен взяв іншу): вона стає першою
export function exOpenOne(m, x, c) {
  const p = exP(m, x.id), i = exFind(p.b.map(y => y.d ? { c: '' } : y), c); if (i < 0) return null;
  const [y] = p.b.splice(i, 1); p.b.unshift(y); const fresh = open(p, y); return { y, fresh };
}
// стан для каси / бота
export function exSum(m, x) {
  const p = m[x.id] || { b: [], q: [] }, live = p.b.filter(y => !y.d), op = live.find(y => y.o);
  return { id: x.id, n: x.n, u: x.u, vol: exVol(x), uk: x.uk || '', cap: exCap(m, x.id), open: op ? { c: op.c, left: op.left } : null, n0: live.filter(y => !y.o).length, nOpen: live.filter(y => y.o).length, q: p.q.length, short: p.short || 0 };
}
