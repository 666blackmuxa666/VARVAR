// 🗺 «План» у кабінеті (лише платформа): дошка команди, план (горизонт → гілка → задача → підзадача), помилки, «чекає власника», чернетка.
// Одне джерело правди — KV `atom:plan`. Пишуть: owner.js (op plan/planSet/planImg) і tools/plan.mjs (команда, через wrangler kv) — обидва через planApply.
export const PLAN_KEY = 'atom:plan';
export const ZONES = ['plan', 'team', 'bug', 'wait'];
const s = (v, n) => String(v ?? '').trim().slice(0, n);
const rid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
const imgs = v => [].concat(v || []).map(x => s(x, 200)).filter(x => /^https:\/\/[^\s"'<>]+$/.test(x)).slice(0, 8);

export function planEmpty() { return { v: 1, upd: 0, items: [], draft: [] }; }

function cleanItem(f, cur = {}) {
  const x = { ...cur };
  if ('t' in f) x.t = s(f.t, 200);
  if ('why' in f) x.why = s(f.why, 300);
  if ('note' in f) x.note = s(f.note, 4000);
  if ('role' in f) x.role = s(f.role, 40);
  if ('take' in f) x.take = s(f.take, 40);
  if ('zone' in f) x.zone = ZONES.includes(f.zone) ? f.zone : 'plan';
  if ('hz' in f) x.hz = Math.min(3, Math.max(1, +f.hz || 1));
  if ('parent' in f) x.parent = f.parent ? s(f.parent, 20) : null;
  if ('imgs' in f) x.imgs = imgs(f.imgs);
  if ('star' in f) x.star = +f.star > 0 ? +f.star : 0;
  if ('done' in f) x.done = f.done ? (+f.done > 1 ? +f.done : Date.now()) : 0;
  if ('res' in f) x.res = s(f.res, 300); // 1 рядок «що зроблено»
  if ('ord' in f) x.ord = +f.ord || 0;
  return x;
}

// ops: [{o:'add',f} | {o:'set',id,f} | {o:'del',id} | {o:'stars',ids} | {o:'draft',text,imgs} | {o:'draftSet',id,f} | {o:'draftDel',id}]
export function planApply(d, ops, who = '') {
  d = d && Array.isArray(d.items) ? d : planEmpty(); d.draft = d.draft || [];
  const out = [], now = Date.now(), byId = id => d.items.find(x => x.id === id);
  for (const op of [].concat(ops || []).slice(0, 200)) {
    if (op.o === 'add') {
      const p = op.f?.parent ? byId(op.f.parent) : null;
      const x = cleanItem({ zone: p?.zone || 'plan', ...op.f }, { id: rid(), at: now, by: s(who, 40), star: 0, done: 0 });
      if (!x.t) { out.push({ error: 'Порожня назва' }); continue; }
      if (x.parent && !p) x.parent = null;
      if (x.star === 1) x.star = Math.max(0, ...d.items.map(y => y.star || 0)) + 1; // ⭐ у кінець черги
      d.items.push(x); out.push({ id: x.id }); continue;
    }
    if (op.o === 'set') {
      const i = d.items.findIndex(x => x.id === op.id); if (i < 0) { out.push({ error: 'Немає задачі ' + op.id }); continue; }
      const f = { ...(op.f || {}) };
      if (f.star === 1 && !d.items[i].star) f.star = Math.max(0, ...d.items.map(y => y.star || 0)) + 1;
      if (f.parent === op.id) delete f.parent;
      d.items[i] = cleanItem(f, d.items[i]); d.items[i].upd = now;
      if (f.done) d.items[i].star = 0, d.items[i].take = '';
      out.push({ id: op.id }); continue;
    }
    if (op.o === 'del') { // разом з усіма підзадачами
      const kill = new Set([op.id]); let n; do { n = kill.size; d.items.forEach(x => { if (kill.has(x.parent)) kill.add(x.id); }); } while (kill.size > n);
      d.items = d.items.filter(x => !kill.has(x.id)); out.push({ n: kill.size }); continue;
    }
    if (op.o === 'stars') { const ids = [].concat(op.ids || []); d.items.forEach(x => { const k = ids.indexOf(x.id); if (k >= 0) x.star = k + 1; else if (x.star) x.star = 0; }); out.push({}); continue; }
    if (op.o === 'draft') { const x = { id: rid(), text: s(op.text, 4000), imgs: imgs(op.imgs), at: now, parsed: '' }; if (!x.text && !x.imgs.length) { out.push({ error: 'Порожньо' }); continue; } d.draft.unshift(x); out.push({ id: x.id }); continue; }
    if (op.o === 'draftSet') { const x = d.draft.find(y => y.id === op.id); if (x) { if ('text' in (op.f || {})) x.text = s(op.f.text, 4000); if ('parsed' in (op.f || {})) x.parsed = s(op.f.parsed, 200); if ('imgs' in (op.f || {})) x.imgs = imgs(op.f.imgs); } out.push({ id: op.id }); continue; }
    if (op.o === 'draftDel') { d.draft = d.draft.filter(x => x.id !== op.id); out.push({}); continue; }
    out.push({ error: 'op?' });
  }
  d.draft = d.draft.slice(0, 200); d.upd = now;
  return { d, out };
}
