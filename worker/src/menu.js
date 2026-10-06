// Меню в KV + редагування через Telegram звичайними фразами.
import DEFAULT_MENU from '../../data/menu.json';

export async function getMenu(env) {
  const m = (await env.DB.get('menu', 'json')) || DEFAULT_MENU;
  if (!m.categories.some(c => c.id === 'inshe-food')) { // одноразово: технічні розділи «Інше»
    const old = m.categories.find(c => c.id === 'inshe'), known = new Set(INSHE.flatMap(c => c.items.map(i => i.id)));
    const cats = INSHE.map(c => ({ ...c, items: [...c.items] }));
    if (old) old.items.filter(i => !known.has(i.id)).forEach(i => cats[0].items.push(i)); // додане вручну — у «Страви поза меню»
    m.categories = m.categories.filter(c => c.id !== 'inshe');
    const pi = m.categories.findIndex(c => c.id === 'upakuvannia');
    m.categories.splice(pi < 0 ? m.categories.length : pi, 0, ...cats);
    await env.DB.put('menu', JSON.stringify(m));
  }
  for (const c of m.categories) if (c.id === 'upakuvannia' || c.id.startsWith('inshe')) c.tech = true; // не показується гостям
  return m;
}
const it = (id, uk, en, price) => ({ id: 'x-' + id, name: { uk, en }, price });
const INSHE = [
  { id: 'inshe-food', tech: true, name: { uk: '🍨 Страви поза меню', en: 'Off-menu dishes' }, items: [
    it('icecream', 'Морозиво', 'Ice cream', 80), it('fruit', 'Фруктова тарілка', 'Fruit plate', 400), it('cheese', 'Сирна тарілка', 'Cheese plate', 450),
    it('meat', 'Мʼясна тарілка', 'Meat plate', 500), it('extra', 'Додаткова позиція', 'Extra item', 50)] },
  { id: 'inshe-posud', tech: true, name: { uk: '🍷 Посуд (бій)', en: 'Broken dishes' }, items: [
    it('glass', 'Розбитий стакан', 'Broken glass', 100), it('wglass', 'Розбитий келих', 'Broken wine glass', 150), it('shot', 'Розбита стопка', 'Broken shot glass', 80),
    it('mug', 'Розбита чашка', 'Broken cup', 100), it('plate', 'Розбита тарілка', 'Broken plate', 200), it('ashtray', 'Розбита попільничка', 'Broken ashtray', 150),
    it('hookah', 'Пошкоджений кальян / колба', 'Damaged hookah', 1000)] },
  { id: 'inshe-serv', tech: true, name: { uk: '🎉 Послуги', en: 'Services' }, items: [
    it('banquet', 'Банкетне обслуговування', 'Banquet service', 500), it('cork', 'Пробковий збір (свій алкоголь)', 'Corkage fee', 200),
    it('cake', 'Подача торта гостей', 'Cake service', 100), it('music', 'Замовлення пісні / музики', 'Music request', 100), it('deco', 'Оформлення столу / декор', 'Table decoration', 300)] },
];
// 🔒 меню змінюють по одному (два планшети/бот одночасно не перезаписують зміни одне одного)
export const menuLock = (env, fn) => env.DB.locked ? env.DB.locked('menu', fn) : fn();
export const addCategory = (env, ...a) => menuLock(env, () => _addCategory(env, ...a));
export const handleMenuText = (text, env, ...a) => menuLock(env, () => _handleMenuText(text, env, ...a));
export const handleMenuPhoto = (msg, env, ...a) => menuLock(env, () => _handleMenuPhoto(msg, env, ...a));
export async function saveMenu(env, menu) {
  const cur = await env.DB.get('menu');
  if (cur) await env.DB.put('menu_prev', cur);           // для «відмінити»
  await env.DB.put('menu', JSON.stringify(menu));
}

// id → { n: назва, p: ціна | {варіант: ціна} }; приховані (стоп-лист) не продаються
export function priceMap(menu) {
  const m = {};
  menu.categories.forEach(c => c.items.forEach(it => {
    if (it.hidden) return;
    m[it.id] = { n: it.name.uk, s: it.size, p: it.variants ? Object.fromEntries(it.variants.map(v => [v.v, v.p])) : it.price };
  }));
  return m;
}

// ---------- пошук ----------
const norm = s => String(s).toLowerCase().replace(/[ʼ'’`"«»]/g, '').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
function findMany(list, q, key) {
  const n = norm(q); if (!n) return [];
  for (const test of [x => x === n, x => x.startsWith(n), x => x.includes(n)]) {
    const r = list.filter(x => key(x).some(k => test(norm(k))));
    if (r.length) return r;
  }
  return [];
}
const itemsOf = menu => menu.categories.flatMap(c => c.items.map(it => ({ it, c })));
const findItem = (menu, q) => findMany(itemsOf(menu), q, x => [x.it.name.uk, x.it.name.en, x.it.id]);
const findCat = (menu, q) => findMany(menu.categories, q, c => [c.name.uk, c.name.en, c.id]);

// ---------- розбір фрази ----------
// ключові слова → поле; «склад» забирає весь хвіст (там є коми)
const KW = [['price', 'ціна|цена|ціну|price'], ['size', 'вага|вагу|обʼєм|обєм|обьем|об\'єм|об’єм|size|weight'], ['name', 'назва|назву|name'], ['desc', 'склад|інгредієнти|опис|desc']];
const KW_RE = new RegExp(`(?:^|[\\s,;.\\-–—:])(${KW.map(k => k[1]).join('|')})(?=[\\s:=\\-–—]|$)`, 'i');
function parseFields(text) {
  const out = {}; let rest = text; const m0 = rest.match(KW_RE);
  const head = m0 ? rest.slice(0, m0.index + (m0[0].length - m0[1].length)) : rest;
  rest = m0 ? rest.slice(m0.index + (m0[0].length - m0[1].length)) : '';
  while (rest) {
    const m = rest.match(new RegExp(`^(${KW.map(k => k[1]).join('|')})\\s*[:=\\-–—]?\\s*`, 'i'));
    if (!m) break;
    const field = KW.find(k => new RegExp(`^(${k[1]})$`, 'i').test(m[1]))[0];
    rest = rest.slice(m[0].length);
    if (field === 'desc') { out.desc = rest.trim().replace(/[.;]$/, ''); break; }
    const next = rest.match(KW_RE);
    const cut = next ? next.index + (next[0].length - next[1].length) : rest.length;
    out[field] = rest.slice(0, cut).replace(/[\s,;.]+$/, '').trim();
    rest = rest.slice(cut);
  }
  return { head: head.replace(/[\s,;:\-–—]+$/, '').trim(), ...out };
}
const fmtSize = s => /^\d+([.,]\d+)?$/.test(s) ? s + ' г' : s;

function slug(s) {
  const t = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia' };
  return norm(s).split('').map(ch => t[ch] ?? ch).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item';
}

function card(it, c) {
  const price = it.variants ? it.variants.map(v => `${v.v} л — ${v.p} грн`).join(', ') : `${it.price} грн`;
  return [`<b>${esc(it.name.uk)}</b>${it.hidden ? ' ⛔ (стоп-лист)' : ''}`, c ? `Розділ: ${esc(c.name.uk)}` : '',
    `Ціна: ${price}`, it.size && !it.variants ? `Вага: ${esc(it.size)}` : '', it.desc ? `Склад: ${esc(it.desc.uk)}` : ''].filter(Boolean).join('\n');
}
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const many = (r, q) => `Знайшов кілька: ${r.map(x => x.it.name.uk).join(', ')}. Напишіть точніше, ніж «${esc(q)}».`;

export const HELP = `<b>Як керувати меню</b> (пишіть звичайним текстом):

✏️ <b>Змінити</b>
<code>мєско ціна 400</code>
<code>мєско - ціна 400, вага 470</code>
<code>мєско склад коржик, свинина, фрі</code>
<code>мєско назва Мєско XL</code>
<code>pepsi ціна 0.5 75</code> (для напоїв з розмірами)

➕ <b>Додати</b>
<code>додати в бургери: Монстр, ціна 450, вага 500, склад булка, телятина, сир</code>

🗑 <b>Видалити</b>: <code>видалити мєско</code>
⛔ <b>Стоп-лист</b>: <code>стоп мєско</code> / <code>повернути мєско</code>
📷 <b>Фото</b>: надішліть фото з підписом <code>фото мєско</code>
🔎 <code>мєско</code>: показати страву
📋 <code>розділи</code> або <code>меню бургери</code>
📂 <code>новий розділ Упакування</code>
↩️ <code>відмінити</code>: скасувати останню зміну

🧾 Рахунки: /tables, /close 5`;

// 📥 масовий імпорт меню (кабінет власника: таблиця Excel / Google): створює розділи, оновлює ціни наявних страв за назвою
async function _importMenu(env, rows, replace) {
  const menu = replace ? { ...(await getMenu(env)), categories: (await getMenu(env)).categories.filter(c => c.tech) } : await getMenu(env);
  let add = 0, upd = 0, cats = 0;
  for (const r of (Array.isArray(rows) ? rows : []).slice(0, 1000)) {
    const name = String(r.name || '').trim().slice(0, 60), price = Math.round(+String(r.price ?? '').replace(',', '.').replace(/[^\d.]/g, '') || 0), cn = String(r.cat || 'Меню').trim().slice(0, 40) || 'Меню';
    if (!name || !(price > 0)) continue;
    let c = menu.categories.find(x => !x.tech && x.name.uk.toLowerCase() === cn.toLowerCase());
    if (!c) { let id = slug(cn) || 'cat'; while (menu.categories.some(x => x.id === id)) id += '-2'; c = { id, name: { uk: cn, en: cn }, items: [] }; const t = menu.categories.findIndex(x => x.tech); t >= 0 ? menu.categories.splice(t, 0, c) : menu.categories.push(c); cats++; }
    let it = menu.categories.flatMap(x => x.items).find(i => i.name.uk.toLowerCase() === name.toLowerCase());
    if (!it) { let id = 'p-' + (slug(name) || 'item').slice(0, 24) + '-' + (Date.now() + add).toString(36).slice(-4); it = { id, name: { uk: name, en: name } }; c.items.push(it); add++; } else upd++;
    it.price = price; delete it.variants;
    const d = String(r.desc || '').trim().slice(0, 300); if (d) it.desc = { uk: d, en: d };
    const sz = String(r.size || '').trim().slice(0, 30); if (sz) it.size = sz;
  }
  if (add || upd || replace) await saveMenu(env, menu);
  return { add, upd, cats };
}
export const importMenu = (env, ...a) => menuLock(env, () => _importMenu(env, ...a));

// новий розділ меню — у кінець списку (бот: «новий розділ Упакування», POS: «➕ Розділ»)
async function _addCategory(env, name) {
  name = String(name || '').trim().slice(0, 40); if (!name) return null;
  const menu = await getMenu(env);
  if (menu.categories.some(c => c.name.uk.toLowerCase() === name.toLowerCase())) return { error: 'Такий розділ уже є' };
  let id = slug(name) || 'cat'; while (menu.categories.some(c => c.id === id)) id += '-2';
  const c = { id, name: { uk: name, en: name }, items: [] }; menu.categories.push(c); await saveMenu(env, menu);
  return { c };
}

// повертає текст відповіді або null (не схоже на команду меню)
async function _handleMenuText(text, env, { canEdit = true } = {}) {
  const t = text.trim(); let m;
  const NO = '🔐 Змінювати меню може лише адміністратор. Натисніть «🔐 Адмін».';
  const menu = await getMenu(env);

  if (/^(відмінити|відміна|скасувати|undo)$/i.test(t)) {
    if (!canEdit) return NO;
    const prev = await env.DB.get('menu_prev'); if (!prev) return 'Нема що відміняти.';
    await env.DB.put('menu', prev); await env.DB.delete('menu_prev');
    return '↩️ Останню зміну скасовано.';
  }
  if ((m = t.match(/^(?:новий|додати|додай)\s+розділ\s+(.+)$/i))) {
    if (!canEdit) return NO;
    const r = await _addCategory(env, m[1]); if (r?.error) return r.error;
    return `📂 Розділ <b>${esc(r.c.name.uk)}</b> додано в кінець меню.\nДодати страву: <code>додати в ${esc(r.c.name.uk.toLowerCase())}: Назва, ціна 15</code>`;
  }
  if (/^(розділи|категорії|категории)$/i.test(t)) return menu.categories.map(c => `• ${esc(c.name.uk)} (${c.items.length})`).join('\n');
  if ((m = t.match(/^меню\s+(.+)$/i))) {
    const cs = findCat(menu, m[1]); if (cs.length !== 1) return `Не знайшов розділ «${esc(m[1])}». Напишіть «розділи».`;
    return `<b>${esc(cs[0].name.uk)}</b>\n` + cs[0].items.map(it => `• ${esc(it.name.uk)}${it.hidden ? ' ⛔' : ''} — ${it.variants ? it.variants.map(v => v.v + 'л ' + v.p).join(' / ') : it.price} грн`).join('\n');
  }
  if ((m = t.match(/^(видалити|видали|удалить)\s+(.+)$/i))) {
    if (!canEdit) return NO;
    const r = findItem(menu, m[2]); if (!r.length) return `Не знайшов «${esc(m[2])}».`; if (r.length > 1) return many(r, m[2]);
    r[0].c.items = r[0].c.items.filter(x => x !== r[0].it); await saveMenu(env, menu);
    return `🗑 Видалено: <b>${esc(r[0].it.name.uk)}</b>\n(передумали — напишіть «відмінити»)`;
  }
  if ((m = t.match(/^(стоп|нема|немає|повернути|поверни|є)\s+(.+)$/i))) {
    const r = findItem(menu, m[2]); if (!r.length) return `Не знайшов «${esc(m[2])}».`; if (r.length > 1) return many(r, m[2]);
    const hide = /^(стоп|нема|немає)$/i.test(m[1]);
    if (hide) r[0].it.hidden = true; else delete r[0].it.hidden;
    await saveMenu(env, menu);
    await (await import('./ops.js')).logEvent(env, { k: 'shift', by: 'Telegram', text: `${hide ? '⛔' : '✅'} ${r[0].it.name.uk} — ${hide ? 'у стоп-листі' : 'знову в меню'}` }).catch(() => {});
    return hide ? `⛔ <b>${esc(r[0].it.name.uk)}</b> у стоп-листі (не показується на сайті)` : `✅ <b>${esc(r[0].it.name.uk)}</b> знову в меню`;
  }
  if ((m = t.match(/^(додати|додай|добавити|добав)\s+(?:в|у|до)?\s*([^:]+):\s*([\s\S]+)$/i))) {
    if (!canEdit) return NO;
    const cs = findCat(menu, m[2]); if (cs.length !== 1) return `Не знайшов розділ «${esc(m[2])}». Напишіть «розділи».`;
    const f = parseFields(m[3]);
    const price = parseInt(f.price, 10);
    if (!f.head || !price) return 'Треба назва і ціна, наприклад:\n<code>додати в бургери: Монстр, ціна 450, вага 500, склад булка, телятина</code>';
    let id = slug(f.head); while (itemsOf(menu).some(x => x.it.id === id)) id += '-2';
    const it = { id, name: { uk: f.head, en: f.head }, size: f.size ? fmtSize(f.size) : '', price };
    if (f.desc) it.desc = { uk: f.desc, en: f.desc };
    cs[0].items.push(it); await saveMenu(env, menu);
    return `➕ Додано:\n${card(it, cs[0])}\n\n📷 Щоб додати фото — надішліть його з підписом «фото ${esc(f.head)}»`;
  }

  // редагування: «<назва> ціна 400, вага 470 …» або просто «<назва>» → показати
  const f = parseFields(t);
  if (!f.head) return null;
  const r = findItem(menu, f.head);
  const edits = ['price', 'size', 'name', 'desc'].filter(k => f[k] != null);
  if (!r.length) return edits.length ? `Не знайшов страву «${esc(f.head)}». Напишіть «help», щоб побачити приклади.` : null;
  if (r.length > 1) return many(r, f.head);
  const { it, c } = r[0];
  if (!edits.length) return card(it, c);
  if (!canEdit) return NO;
  if (f.price != null) {
    if (it.variants) {
      const pm = f.price.match(/^(\d+(?:[.,]\d+)?)\s*(?:л)?\s*[-=:–]?\s*(\d+)$/);
      const v = pm && it.variants.find(x => x.v === pm[1].replace(',', '.'));
      if (!v) return `У «${esc(it.name.uk)}» кілька розмірів (${it.variants.map(x => x.v).join(', ')}). Пишіть так: <code>${esc(it.name.uk)} ціна ${it.variants[0].v} 75</code>`;
      v.p = +pm[2];
    } else {
      const p = parseInt(f.price, 10); if (!p) return 'Ціна має бути числом.'; it.price = p;
    }
  }
  if (f.size != null) it.size = fmtSize(f.size);
  if (f.name) it.name = { uk: f.name, en: it.name.en === it.name.uk ? f.name : it.name.en };
  if (f.desc != null) it.desc = { uk: f.desc, en: f.desc };
  await saveMenu(env, menu);
  return `✏️ Оновлено:\n${card(it, c)}`;
}

// фото з підписом «фото <назва>» → KV, віддається з /img/<id>
async function _handleMenuPhoto(msg, env, tg) {
  const m = (msg.caption || '').trim().match(/^(фото|photo)\s+(.+)$/i);
  if (!m) return 'Щоб змінити фото, додайте підпис: «фото <назва страви>»';
  const menu = await getMenu(env);
  const r = findItem(menu, m[2]); if (!r.length) return `Не знайшов «${esc(m[2])}».`; if (r.length > 1) return many(r, m[2]);
  const ph = msg.photo[msg.photo.length - 1];                       // найбільший розмір
  const f = await (await tg(env, 'getFile', { file_id: ph.file_id })).json();
  const img = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`);
  await env.DB.put('img:' + r[0].it.id, await img.arrayBuffer());
  r[0].it.img = `${env.SELF_URL}/img/${r[0].it.id}?v=${Date.now().toString(36)}`;
  await saveMenu(env, menu);
  return `📷 Фото для <b>${esc(r[0].it.name.uk)}</b> оновлено.`;
}
