// Замовлення офіціанта кнопками: стіл → категорія → страва → (розмір) → кількість → знову категорії.
// Чернетка одна на офіціанта: KV ob:<uid> {table, items:[{name,price,q}], com, mid, chat}; повідомлення редагується на місці.
import { getMenu } from './menu.js';

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const TTL = 3 * 3600;
const chunk = (a, n) => a.reduce((r, x, i) => (i % n ? r[r.length - 1].push(x) : r.push([x]), r), []);
const b = (text, d) => ({ text, callback_data: 'o:' + d });

export const getOb = async (env, uid) => env.DB.get('ob:' + uid, 'json');
export const putOb = (env, uid, ob) => env.DB.put('ob:' + uid, JSON.stringify(ob), { expirationTtl: TTL });
const sum = ob => ob.items.reduce((s, i) => s + i.price * i.q, 0);

function head(ob) {
  const list = ob.items.length ? ob.items.map(i => `${i.q}× ${esc(i.name)} — ${i.price * i.q}`).join('\n') : '<i>поки порожньо — оберіть категорію</i>';
  return `🧾 <b>Стіл ${ob.table}</b> — нове замовлення\n\n${list}${ob.com ? `\n💬 ${esc(ob.com)}` : ''}${ob.items.length ? `\n\nСума: <b>${sum(ob)} грн</b>` : ''}`;
}

export async function tablePick(env, openTables, tables) {
  const open = new Set(openTables);
  const btns = Array.from({ length: tables }, (_, i) => b(open.has(i + 1) ? `• ${i + 1}` : String(i + 1), 't:' + (i + 1)));
  return { text: '🪑 <b>Для якого столу?</b>\n<i>• — стіл уже має рахунок (буде дозамовлення)</i>', markup: { inline_keyboard: [...chunk(btns, 5), [b('✖ Скасувати', 'x')]] } };
}

export async function catsView(env, ob) {
  const menu = await getMenu(env);
  const cats = menu.categories.map((c, i) => b(c.name.uk, 'c:' + i));
  const n = ob.items.reduce((s, i) => s + i.q, 0);
  const foot = ob.items.length
    ? [[b(`✅ Відправити · ${sum(ob)} грн`, 'send')], [b(`✏️ Кошик (${n})`, 'cart'), b(ob.com ? '💬 Змінити коментар' : '💬 Коментар', 'com')], [b('🪑 Інший стіл', 'tp'), b('✖ Скасувати', 'x')]]
    : [[b('💬 Коментар', 'com'), b('🪑 Інший стіл', 'tp')], [b('✖ Скасувати', 'x')]];
  return { text: head(ob), markup: { inline_keyboard: [...chunk(cats, 2), ...foot] } };
}

async function itemsView(env, ob, c) {
  const cat = (await getMenu(env)).categories[c]; if (!cat) return catsView(env, ob);
  const btns = cat.items.map((it, i) => it.hidden ? b(`⛔ ${it.name.uk}`, 'h')
    : b(`${it.name.uk} · ${it.variants ? it.variants[0].p + '+' : it.price}`, `i:${c}:${i}`));
  return { text: head(ob) + `\n\n📂 <b>${esc(cat.name.uk)}</b>`, markup: { inline_keyboard: [...chunk(btns, 2), [b('⬅️ Категорії', 'back')]] } };
}

async function qtyView(env, ob, c, i, v) {
  const it = (await getMenu(env)).categories[c]?.items[i]; if (!it) return catsView(env, ob);
  if (it.variants && v === undefined) // спершу розмір
    return { text: head(ob) + `\n\n🥤 <b>${esc(it.name.uk)}</b> — який розмір?`, markup: { inline_keyboard: [...chunk(it.variants.map((x, k) => b(`${x.v} ${it.size || ''} · ${x.p}`, `i:${c}:${i}:${k}`)), 3), [b('⬅️ Назад', 'c:' + c)]] } };
  const vv = it.variants?.[v], price = vv ? vv.p : it.price;
  const name = it.name.uk + (vv ? ` ${vv.v} ${it.size || ''}`.trimEnd() : '');
  const tail = v === undefined ? '' : ':' + v;
  return { text: head(ob) + `\n\n🍽 <b>${esc(name)}</b> · ${price} грн — скільки?`,
    markup: { inline_keyboard: [[1, 2, 3].map(n => b(String(n), `q:${c}:${i}:${n}${tail}`)), [4, 5, 6].map(n => b(String(n), `q:${c}:${i}:${n}${tail}`)), [b('⬅️ Назад', 'c:' + c)]] } };
}

function cartView(ob) {
  if (!ob.items.length) return null;
  return { text: head(ob) + '\n\nНатисніть позицію, щоб прибрати 1 шт.',
    markup: { inline_keyboard: [...ob.items.map((x, k) => [b(`➖ ${x.q}× ${x.name}`, 'r:' + k)]), [b('⬅️ Категорії', 'back')]] } };
}

// p = частини callback після «o:»; повертає { view } | { toast } | { send: ob } | { cancel } | { comment } | { tablePick }
export async function obCallback(env, uid, p) {
  const [a, x, y, z, w] = p;
  if (a === 'h') return { toast: 'Немає в наявності' };
  let ob = await getOb(env, uid);
  if (a === 't') { ob = { ...(ob || { items: [] }), table: +x }; await putOb(env, uid, ob); return { view: await catsView(env, ob) }; }
  if (!ob) return { expired: true };
  if (a === 'x') { await env.DB.delete('ob:' + uid); return { cancel: true }; }
  if (a === 'tp') return { tablePick: true };
  if (a === 'back') return { view: await catsView(env, ob) };
  if (a === 'c') return { view: await itemsView(env, ob, +x) };
  if (a === 'i') return { view: await qtyView(env, ob, +x, +y, z === undefined ? undefined : +z) };
  if (a === 'q') {
    const it = (await getMenu(env)).categories[+x]?.items[+y]; if (!it || it.hidden) return { view: await catsView(env, ob), toast: 'Немає в наявності' };
    const vv = w !== undefined ? it.variants?.[+w] : null;
    const name = it.name.uk + (vv ? ` ${vv.v} ${it.size || ''}`.trimEnd() : ''), price = vv ? vv.p : it.price;
    const ex = ob.items.find(e => e.name === name);
    if (ex) ex.q += +z; else ob.items.push({ name, price, q: +z });
    await putOb(env, uid, ob);
    return { view: await catsView(env, ob), toast: `➕ ${z}× ${name}` };
  }
  if (a === 'cart') return { view: cartView(ob) || await catsView(env, ob) };
  if (a === 'r') {
    const e = ob.items[+x]; if (e) { e.q--; if (!e.q) ob.items.splice(+x, 1); await putOb(env, uid, ob); }
    return { view: cartView(ob) || await catsView(env, ob) };
  }
  if (a === 'com') return { comment: true, ob };
  if (a === 'send') { if (!ob.items.length) return { toast: 'Кошик порожній' }; await env.DB.delete('ob:' + uid); return { send: ob }; }
  return { toast: '' };
}
