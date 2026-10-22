// 📥 Перехід з іншої системи (етап 1): одне ядро «пакет переходу» + адаптери. Адаптер (майстер у кабінеті: Excel/CSV, вивантаження 1С…)
// перетворює чужу таблицю в рядки нашими полями (KINDS), далі все однаково: перевірка (dry) → імпорт → журнал → відкат.
// Повторний імпорт оновлює, а не дублює: ext = «система:код» → наш id (ключ mig:x:<вид>); без коду — за назвою / телефоном / кодом сертифіката.
// Відкат точковий: під час імпорту записуємо, якими були змінені ключі (mig:u:<id>); відмінити можна, лише поки їх ніхто не змінював після імпорту.
// Повний знімок (бекап «перед-переходом-…») — запасний шлях, відновлює лише платформа.
import { L, dayKey, hhmm, notify, esc } from './ops.js';
import { getMenu, saveMenu, menuLock, slug } from './menu.js';
import { getIng, getCards, norm, r3, UNITS } from './stock.js';
import { supEnsure, nrmSup } from './suppliers.js';
import { normPhone, getCli, cliTouch, fmtPhone } from './delivery.js';
import { getCert, bookImport } from './site.js';
import { getStaff } from './ops-staff.js';

// вид → назва й поля (* — обовʼязкові). Ті самі ключі використовує майстер для зіставлення колонок.
export const KINDS = {
  menu: { t: '🍽 Меню', f: { id: 'Код', cat: 'Розділ', name: 'Назва*', price: 'Ціна*', v: 'Розмір (0,5 л)', desc: 'Опис', size: 'Вага / обʼєм' } },
  ing: { t: '📦 Продукти й залишки', f: { id: 'Код', n: 'Назва*', u: 'Одиниця', cat: 'Група', q: 'Залишок', wh: 'Склад', cost: 'Ціна за одиницю', sum: 'Сума залишку', bc: 'Штрихкод' } },
  cards: { t: '📋 Техкарти', f: { dish: 'Страва*', ing: 'Продукт*', q: 'Брутто*', u: 'Одиниця', loss: 'Втрати, %', out: 'Вихід, г' } },
  sup: { t: '🚚 Постачальники', f: { n: 'Назва*', code: 'ЄДРПОУ / ІПН', iban: 'IBAN', phone: 'Телефон', addr: 'Адреса' } },
  cli: { t: '👤 Гості й бонуси', f: { phone: 'Телефон*', name: 'Імʼя', bal: 'Бонуси, ₴', bd: 'День народження', note: 'Нотатка' } },
  cert: { t: '🎁 Сертифікати', f: { code: 'Код*', sum: 'Номінал*', left: 'Залишок', phone: 'Телефон', to: 'Кому', exp: 'Діє до' } },
  staff: { t: '👥 Персонал', f: { n: 'Імʼя*', role: 'Посада' } },
  book: { t: '📅 Броні й передоплати', f: { id: 'Код', date: 'Дата*', time: 'Час*', name: 'Імʼя*', phone: 'Телефон*', people: 'Гостей', kind: 'Тип (стіл/банкет)', dep: 'Передоплата, ₴', comment: 'Коментар', t: 'Стіл' } },
};
export const SYS = { xls: '📊 Excel / CSV', '1c': '🟡 1С / BAS', poster: '🟠 Poster', syrve: '🟣 Syrve / iiko', rkeeper: '🔴 R-Keeper / StoreHouse', other: '🔹 Інша система' };
const MAX = 2000, UNDO_MAX = 1.8e6, UNDO_DAYS = 7;
const T = (v, n = 120) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
// «1 234,50 ₴» → 1234.5; порожньо → null (поле не задано)
const num = v => { const t = String(v ?? '').replace(/\s| /g, '').replace(',', '.').replace(/[^\d.-]/g, ''); return t === '' || t === '-' || isNaN(+t) ? null : +t; };
const k2 = x => Math.round(x * 100) / 100;
// одиниця з чужої системи → наша + множник кількості (г → кг ×0.001)
const UNIT = [[/^(кг|kg|кілограм\w*|килограм\w*)$/, 'кг', 1], [/^(г|гр|g|грам\w*)$/, 'кг', 0.001], [/^(л|l|літр\w*|литр\w*)$/, 'л', 1], [/^(мл|ml)$/, 'л', 0.001],
  [/^(шт|pcs|pc|штук\w*|пляш\w*|бут\w*|уп|упак\w*|порц\w*|пач\w*|банк\w*)$/, 'шт', 1]];
export const unitOf = u => { const s = String(u || '').toLowerCase().replace(/\.$/, '').trim(); if (!s) return null; for (const [re, x, f] of UNIT) if (re.test(s)) return { u: x, f }; return UNITS.includes(s) ? { u: s, f: 1 } : null; };
// дата народження: 31.12.1990 · 1990-12-31 · 31.12 → «ММ-ДД»
const bdOf = v => { const s = T(v, 20); let m = s.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-]\d{2,4})?$/); if (m) return pad(m[2]) + '-' + pad(m[1]); m = s.match(/^\d{4}-(\d{2})-(\d{2})/); return m ? m[1] + '-' + m[2] : ''; };
const pad = x => String(x).padStart(2, '0');
const timeOf = v => { const m = T(v, 10).match(/^(\d{1,2})[:.](\d{2})/); return m && +m[1] < 24 && +m[2] < 60 ? pad(m[1]) + ':' + m[2] : ''; };
const ymd = v => { const t = dateOf(v); return t ? new Date(t).toISOString().slice(0, 10) : ''; };
const dateOf = v => { const s = T(v, 20); let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/); if (m) return Date.UTC(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1], 21); m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 21) : 0; };
const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);
const hash = s => { let h = 2166136261; s = String(s ?? '∅'); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36) + s.length; };

// 📼 запис змін для відкату: перше «було» кожного ключа, який чіпає імпорт (журнали подій і складу не відкочуємо)
const KEEP = /^(menu|ing|cards|supl|certs|staff)$|^(sup|cli|cert|book|bkm|mig:x):/;
function recorder(env) {
  const was = {}, db = env.DB;
  const note = async k => { if (KEEP.test(k) && !(k in was)) was[k] = await db.get(k); };
  const DB = new Proxy(db, { get(t, p) {
    if (p === 'put') return async (k, v, o) => { await note(k); return t.put(k, v, o); };
    if (p === 'delete') return async k => { await note(k); return t.delete(k); };
    const v = t[p]; return typeof v === 'function' ? v.bind(t) : v;
  } });
  return { env: { ...env, DB }, was };
}
const getX = async (env, kind) => (await env.DB.get('mig:x:' + kind, 'json')) || {};

// ---------- застосування по видах. ctx: { sys, dry, errs(i, m, w), ext(row) } → { add, upd, skip, tot } ----------
const AP = {
  async menu(env, rows, c) {
    return menuLock(env, async () => {
      const menu = await getMenu(env), x = await getX(env, 'menu'), all = () => menu.categories.flatMap(k => k.items);
      let add = 0, upd = 0, skip = 0, cats = 0;
      rows.forEach((r, i) => {
        const name = T(r.name, 60), p = num(r.price); if (!name) return c.err(i, 'немає назви'), skip++; if (!(p > 0)) return c.err(i, `«${name}»: немає ціни`), skip++;
        const price = Math.round(p); if (price !== p) c.err(i, `«${name}»: ціну ${p} округлено до ${price} ₴`, 1);
        const ext = c.ext(r), cn = T(r.cat, 40) || 'Меню', vm = T(r.v, 16).replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*([a-zа-яʼ'.]*)$/i);
        if (r.v && !vm) c.err(i, `«${name}»: розмір «${T(r.v, 16)}» — потрібне число (0,5 або 0.33 л) — ціну взяли без розміру`, 1);
        let it = (ext && x[ext] && all().find(y => y.id === x[ext])) || all().find(y => y.name.uk.toLowerCase() === name.toLowerCase());
        let cat = menu.categories.find(k => !k.tech && k.name.uk.toLowerCase() === cn.toLowerCase());
        if (!cat) { let id = slug(cn) || 'cat'; while (menu.categories.some(k => k.id === id)) id += '-2'; cat = { id, name: { uk: cn, en: cn }, items: [] }; const t = menu.categories.findIndex(k => k.tech); t >= 0 ? menu.categories.splice(t, 0, cat) : menu.categories.push(cat); cats++; }
        if (!it) { it = { id: 'p-' + slug(name).slice(0, 24) + '-' + uid().slice(0, 4), name: { uk: name, en: name } }; cat.items.push(it); add++; }
        else { upd++; if (r.cat && !cat.items.includes(it)) { menu.categories.forEach(k => { k.items = k.items.filter(y => y !== it); }); cat.items.push(it); } it.name = { ...it.name, uk: name }; }
        // 🥤 розмір (0,5 л) → варіант страви: рядки з однією назвою й різними розмірами = одна позиція з розмірами
        if (vm) { const v = String(+vm[1]), vs = it.variants || []; const o = vs.find(z => z.v === v); o ? (o.p = price) : vs.push({ v, p: price }); it.variants = vs.sort((a, b) => a.v - b.v); delete it.price; if (vm[2] && !it.size) it.size = vm[2].replace(/\.$/, ''); }
        else if (it.variants?.length) c.err(i, `«${name}»: у системі є розміри (${it.variants.map(z => z.v).join(', ')}) — ціну без розміру не ставимо, розміри лишили`, 1);
        else it.price = price;
        const d = T(r.desc, 300); if (d) it.desc = { uk: d, en: d }; const sz = T(r.size, 30); if (sz && !it.variants) it.size = sz; // у страви з розмірами size — одиниця розміру (л)
        if (ext) x[ext] = it.id;
      });
      if (!c.dry && (add || upd)) { await saveMenu(env, menu); await env.DB.put('mig:x:menu', JSON.stringify(x)); }
      return { add, upd, skip, tot: { cats } };
    });
  },
  async ing(env, rows, c) {
    return L(env, 'ing', async () => {
      const l = await getIng(env), x = await getX(env, 'ing'), jr = []; let add = 0, upd = 0, skip = 0, qn = 0;
      rows.forEach((r, i) => {
        const n = T(r.n, 60); if (!n) return c.err(i, 'немає назви'), skip++;
        const un = unitOf(r.u); if (r.u && !un) c.err(i, `«${n}»: незнайома одиниця «${T(r.u, 10)}» — поставили кг`, 1);
        const ext = c.ext(r), { u, f } = un || { u: 'кг', f: 1 };
        let y = (ext && x[ext] && l.find(z => z.id === x[ext])) || l.find(z => !z.off && !z.grp && norm(z.n) === norm(n));
        if (!y) { y = { id: uid(), n, u, cat: 'Інше', home: 'k', st: { k: 0, b: 0 }, cost: 0, min: 0, par: 0, loss: 0 }; l.push(y); add++; } else upd++;
        if (y.u !== u && un) { if (y.st.k || y.st.b) c.err(i, `«${n}»: у системі одиниця ${y.u}, у файлі ${u} — лишили ${y.u}`, 1); else y.u = u; }
        const k = y.u === u ? f : 1; // одиниця не збіглась — кількість не перераховуємо
        if (T(r.cat)) y.cat = T(r.cat, 30);
        const bc = String(r.bc ?? '').replace(/\D/g, ''); if (bc.length >= 6) y.bc = [...new Set([...(y.bc || []), bc])].slice(0, 10);
        const q = num(r.q), cost = num(r.cost), sum = num(r.sum);
        if (q != null && q < 0) c.err(i, `«${n}»: мінусовий залишок ${q} — поставили 0`, 1);
        const pq = cost != null && cost >= 0 ? cost / k : sum != null && q > 0 ? sum / (q * k) : null; if (pq != null) y.cost = k2(pq);
        if (q != null) { const w = /бар|bar/i.test(String(r.wh || '')) ? 'b' : /кух|kitch/i.test(String(r.wh || '')) ? 'k' : y.home || 'k', to = r3(Math.max(0, q) * k), d = r3(to - (y.st[w] || 0));
          y.st[w] = to; qn++; if (d) jr.push({ ts: Date.now(), at: hhmm(), t: d > 0 ? 'add' : 'off', id: y.id, n: y.n, u: y.u, wh: w, q: d, sum: k2(d * (y.cost || 0)), by: c.who, note: '📥 Вхідні залишки' }); }
        if (ext) x[ext] = y.id;
      });
      if (!c.dry && (add || upd)) {
        await env.DB.put('ing', JSON.stringify(l)); await env.DB.put('mig:x:ing', JSON.stringify(x));
        if (jr.length) { const kk = 'stk:' + dayKey(), j = (await env.DB.get(kk, 'json')) || []; j.push(...jr); await env.DB.put(kk, JSON.stringify(j.slice(-3000))); }
      }
      const val = k2(l.filter(z => !z.off && !z.grp).reduce((a, z) => a + ((z.st?.k || 0) + (z.st?.b || 0)) * (z.cost || 0), 0));
      return { add, upd, skip, tot: { q: qn, val }, open: qn > 0 };
    });
  },
  async cards(env, rows, c) {
    const menu = await getMenu(env), items = menu.categories.flatMap(k => k.items);
    return L(env, 'ing', async () => {
      const l = await getIng(env), cards = await getCards(env), by = new Map(); let add = 0, upd = 0, skip = 0, ni = 0;
      rows.forEach((r, i) => { const d = T(r.dish, 60); if (!d) return c.err(i, 'немає страви'), skip++; const k = d.toLowerCase(); if (!by.has(k)) by.set(k, { d, rows: [] }); by.get(k).rows.push([r, i]); });
      for (const { d, rows: rr } of by.values()) {
        const it = items.find(y => y.name.uk.toLowerCase() === d.toLowerCase()); if (!it) { c.err(rr[0][1], `«${d}»: такої страви немає в меню — спершу імпортуйте меню`); skip += rr.length; continue; }
        if (cards[it.id] && !cards[it.id].draft) { c.err(rr[0][1], `«${d}»: техкарту вже підтвердив шеф — не чіпаємо`, 1); skip += rr.length; continue; }
        const lines = []; let out = 0;
        for (const [r, i] of rr) {
          const n = T(r.ing, 60), q0 = num(r.q); if (!n || !(q0 > 0)) { c.err(i, `«${d}»: рядок без продукту або кількості`); skip++; continue; }
          const un = unitOf(r.u); let y = l.find(z => !z.off && norm(z.n) === norm(n));
          if (!y) { y = { id: uid(), n, u: un?.u || 'кг', cat: 'Інше', home: 'k', st: { k: 0, b: 0 }, cost: 0, min: 0, par: 0, loss: 0 }; l.push(y); ni++; }
          let q = q0 * (un && un.u === y.u ? un.f : 1);
          if (!un && y.u !== 'шт' && q0 >= 5) { q = q0 / 1000; c.err(i, `«${d}» → ${n}: ${q0} без одиниці — вважаємо ${y.u === 'л' ? 'мл' : 'г'}`, 1); }
          const ls = num(r.loss); lines.push({ id: y.id, q: r3(q), ...(ls > 0 ? { loss: Math.min(90, Math.round(ls)) } : {}) });
          if (num(r.out) > 0) out = Math.round(num(r.out));
        }
        if (!lines.length) continue;
        cards[it.id] ? upd++ : add++; cards[it.id] = { items: lines.slice(0, 40), ...(out ? { out } : {}), draft: 1, mig: c.sys };
      }
      if (!c.dry && (add || upd)) { if (ni) await env.DB.put('ing', JSON.stringify(l)); await env.DB.put('cards', JSON.stringify(cards)); }
      return { add, upd, skip, tot: { dishes: add + upd, newIng: ni } };
    });
  },
  async sup(env, rows, c) {
    const l = (await env.DB.get('supl', 'json')) || []; let add = 0, upd = 0, skip = 0; const seen = new Set();
    for (const [i, r] of rows.entries()) {
      const n = T(r.n, 80); if (!n) { c.err(i, 'немає назви'); skip++; continue; }
      const code = String(r.code ?? '').replace(/\D/g, ''); if (code && !/^(\d{8}|\d{10})$/.test(code)) c.err(i, `«${n}»: ЄДРПОУ/ІПН має бути 8 або 10 цифр`, 1);
      const iban = String(r.iban ?? '').replace(/\s/g, '').toUpperCase(); if (iban && !/^UA\d{27}$/.test(iban)) c.err(i, `«${n}»: IBAN не схожий на український (UA + 27 цифр)`, 1);
      const nn = nrmSup(n), old = (code && l.find(x => x.code === code)) || l.find(x => nrmSup(x.n) === nn || (x.al || []).includes(nn));
      old || seen.has(nn) ? upd++ : add++; seen.add(nn);
      if (!c.dry) await supEnsure(env, n, { ...(/^(\d{8}|\d{10})$/.test(code) ? { code } : {}), ...(/^UA\d{27}$/.test(iban) ? { iban } : {}), phone: T(r.phone, 40), addr: T(r.addr, 200) });
    }
    return { add, upd, skip, tot: {} };
  },
  async cli(env, rows, c) {
    let add = 0, upd = 0, skip = 0, bal = 0;
    for (const [i, r] of rows.entries()) {
      const ph = normPhone(r.phone); if (!ph) { c.err(i, `телефон «${T(r.phone, 20)}» не схожий на український`); skip++; continue; }
      const b = num(r.bal); if (b != null && b < 0) { c.err(i, `${fmtPhone(ph)}: мінусові бонуси`); skip++; continue; }
      const had = await getCli(env, ph); had ? upd++ : add++; if (b != null) bal += Math.round(b * 100);
      if (c.dry) continue;
      const nm = T(r.name, 40), bd = bdOf(r.bd), note = T(r.note, 200);
      await cliTouch(env, ph, x => { if (nm && !x.name) x.name = nm; if (b != null) x.bal = k2(b); if (bd) x.bd = bd; if (note && !String(x.note || '').includes(note)) x.note = T((x.note ? x.note + ' · ' : '') + note, 300); x.mig = c.sys; });
    }
    return { add, upd, skip, tot: { bal: bal / 100 } };
  },
  async cert(env, rows, c) {
    let add = 0, upd = 0, skip = 0, left = 0; const now = Date.now(), codes = [];
    for (const [i, r] of rows.entries()) {
      const code = T(r.code, 30).toUpperCase().replace(/\s/g, ''); if (!/^[A-Z0-9А-ЯІЇЄҐ-]{3,24}$/.test(code)) { c.err(i, `код «${T(r.code, 30)}» — лише літери, цифри й дефіс, 3–24 знаки`); skip++; continue; }
      const sum = num(r.sum), lf = num(r.left) ?? sum; if (!(sum > 0) || lf < 0 || lf > sum) { c.err(i, `${code}: номінал має бути > 0, залишок — від 0 до номіналу`); skip++; continue; }
      const exp = dateOf(r.exp); if (exp && exp < now) c.err(i, `${code}: термін дії вже минув`, 1);
      const o = await getCert(env, code); if (o && !o.mig) { c.err(i, `${code}: такий сертифікат уже є в системі — не чіпаємо`, 1); skip++; continue; }
      o ? upd++ : add++; left += Math.round(lf * 100);
      if (c.dry) continue;
      const x = { ...(o || { code, from: `Перенесено (${SYS[c.sys] || c.sys})`, note: '', st: 'ok', paid: 'mig', at: now, uses: [] }), sum: k2(sum), left: k2(lf), to: T(r.to, 40) || o?.to || '', phone: normPhone(r.phone) || o?.phone || '', mig: c.sys, ...(exp ? { exp } : {}) };
      await L(env, 'cert:' + code, () => env.DB.put('cert:' + code, JSON.stringify(x))); codes.push(code);
    }
    if (codes.length) await L(env, 'certs', async () => { const l = (await env.DB.get('certs', 'json')) || []; for (const k of codes) if (!l.includes(k)) l.push(k); await env.DB.put('certs', JSON.stringify(l.slice(-5000))); });
    return { add, upd, skip, tot: { left: left / 100 } };
  },
  // 👥 персонал без PIN: PIN з чужої системи не перенести (там хеш) — адмін задає кожному в Налаштуваннях → Персонал → 🔑
  async staff(env, rows, c) {
    const RL = [[/адмін|админ|менедж|управ|директ|admin|manag/i, 'admin'], [/кух|повар|кухар|шеф|cook|chef|пекар|кондит/i, 'cook'], [/курʼ?'?єр|курьер|courier|достав/i, 'courier']];
    return L(env, 'staff', async () => {
      const l = await getStaff(env); let add = 0, upd = 0, skip = 0;
      rows.forEach((r, i) => {
        const n = T(r.n, 30); if (!n) return c.err(i, 'немає імені'), skip++;
        // R-Keeper (RK7_dbf) усім пише «менеджер» — з нього адміном робимо лише явних адмінів/директорів, решта — офіціанти
        const rk = c.sys === 'rkeeper' && /менедж|manag/i.test(String(r.role || '')) && !/адмін|админ|директ|управ|admin/i.test(String(r.role || ''));
        const role = rk ? 'waiter' : (RL.find(([re]) => re.test(String(r.role || ''))) || [, 'waiter'])[1];
        if (rk) c.err(i, `«${T(r.n, 30)}»: «${T(r.role, 30)}» з R-Keeper — поставили офіціанта; адміна призначте в Налаштуваннях → Персонал`, 1);
        const y = l.find(z => z.name.toLowerCase() === n.toLowerCase());
        if (y) { upd++; if (r.role && y.role !== role) c.err(i, `«${n}»: вже є з іншою роллю — роль не змінюємо`, 1); return; }
        l.push({ id: crypto.randomUUID().slice(0, 6), name: n, role, mig: c.sys }); add++;
      });
      if (!c.dry && add) await env.DB.put('staff', JSON.stringify(l));
      return { add, upd, skip, tot: { nopin: add } };
    });
  },
  // 📅 майбутні броні; передоплата — гроші гостя, вже отримані старою системою: показуємо в броні, зараховує адмін при розрахунку
  async book(env, rows, c) {
    const x = await getX(env, 'book'), today = dayKey(); let add = 0, upd = 0, skip = 0, dep = 0;
    for (const [i, r] of rows.entries()) {
      const date = ymd(r.date), time = timeOf(r.time) || timeOf(String(r.date || '').split(/[ T]/)[1]), name = T(r.name, 40), phone = normPhone(r.phone);
      if (!date || !time) { c.err(i, `дата «${T(r.date, 20)}» або час «${T(r.time, 10)}» не розпізнано`); skip++; continue; }
      if (date < today) { c.err(i, `${date}: бронь у минулому — пропущено`, 1); skip++; continue; }
      if (!name || !phone) { c.err(i, `${date} ${time}: потрібні імʼя і телефон`); skip++; continue; }
      const d = num(r.dep); if (d != null && d < 0) { c.err(i, `${name}: мінусова передоплата`); skip++; continue; }
      const ext = c.ext(r) || `${c.sys}:${date}|${time}|${phone}`, t = Math.round(num(r.t) || 0);
      x[ext] ? upd++ : add++; if (d > 0) dep += Math.round(d * 100);
      if (c.dry) continue;
      const b = await bookImport(env, x[ext], { kind: /банк|banq|фурш|корпор/i.test(String(r.kind || '')) ? 'banquet' : 'table', name, phone, date, time,
        people: Math.max(1, Math.min(60, Math.round(num(r.people) || 2))), comment: T(r.comment, 300), ...(t > 0 && t <= (+env.TABLES || 999) ? { t } : {}), ...(d > 0 ? { dep: k2(d) } : {}), mig: c.sys });
      x[ext] = b.id;
    }
    if (!c.dry && (add || upd)) await env.DB.put('mig:x:book', JSON.stringify(x));
    return { add, upd, skip, tot: { dep: dep / 100 } };
  },
};
// ключ дубліката всередині файлу (останній рядок перемагає — як і при повторному імпорті)
const DUPK = { menu: r => T(r.name).toLowerCase() + '|' + T(r.v).replace(',', '.'), ing: r => norm(r.n), cards: r => T(r.dish).toLowerCase() + '|' + norm(r.ing), sup: r => nrmSup(r.n), cli: r => normPhone(r.phone), cert: r => T(r.code).toUpperCase(), staff: r => T(r.n).toLowerCase(), book: r => T(r.id) || ymd(r.date) + '|' + T(r.time) + '|' + normPhone(r.phone) };

// 🚀 { sys, kind, rows, map?, dry } → підсумок. who — хто імпортує
export async function migRun(env, b, who) {
  const kind = String(b.kind || ''), sys = SYS[b.sys] ? b.sys : 'xls'; if (!KINDS[kind]) return { error: 'Невідомий вид даних' };
  if (!Array.isArray(b.rows) || !b.rows.length) return { error: 'Немає рядків' };
  if (b.rows.length > MAX) return { error: `За раз — до ${MAX} рядків. Розбийте файл на частини` };
  const F = Object.keys(KINDS[kind].f), rows = b.rows.map(r => Object.fromEntries(F.map(k => [k, T(r?.[k], 300)])));
  const errs = [], dups = [], seen = new Map(), dk = DUPK[kind];
  rows.forEach((r, i) => { const k = dk(r); if (!k) return; if (seen.has(k)) dups.push({ i, j: seen.get(k) }); seen.set(k, i); });
  const c = { sys, dry: !!b.dry, who: T(who, 40), err: (i, m, w) => { if (errs.length < 200) errs.push({ i, m, ...(w ? { w: 1 } : {}) }); }, ext: r => r.id ? `${sys}:${T(r.id, 60)}` : '' };
  if (c.dry) { const r = await AP[kind](env, rows, c); return { dry: 1, kind, n: rows.length, ...r, errs, dups: dups.slice(0, 50) }; }
  // справжній імпорт: повний знімок (запасний шлях) → запис змін → застосування → журнал
  const id = Date.now().toString(36), tag = 'перед-переходом-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  let bak = ''; try { bak = (await (await import('./backup.js')).backupNow(env, tag)).tag; } catch (e) { console.log('mig bak', e.message); }
  const R = recorder(env), r = await AP[kind](R.env, rows, c);
  if (r.open) await openDoc(env, r.tot.val, who).catch(e => console.log('mig open', e.message));
  const keys = Object.keys(R.was), after = keys.length ? await env.DB.getMany(keys) : [], size = JSON.stringify(R.was).length;
  const undo = size <= UNDO_MAX && keys.length; if (undo) await env.DB.put('mig:u:' + id, JSON.stringify({ was: R.was, h: Object.fromEntries(keys.map((k, i) => [k, hash(after[i])])) }), { expirationTtl: UNDO_DAYS * 86400 });
  const e = { id, ts: Date.now(), sys, kind, n: rows.length, add: r.add, upd: r.upd, skip: r.skip, tot: r.tot, nerr: errs.filter(x => !x.w).length, who: c.who, bak, ...(undo ? { undo: 1 } : {}) };
  await L(env, 'mig:log', async () => { const l = (await env.DB.get('mig:log', 'json')) || []; l.unshift(e); await env.DB.put('mig:log', JSON.stringify(l.slice(0, 40))); });
  if (b.map && typeof b.map === 'object') await L(env, 'mig:map', async () => { const m = (await env.DB.get('mig:map', 'json')) || {}; m[sys + '|' + kind] = Object.fromEntries(Object.entries(b.map).filter(([k]) => F.includes(k)).map(([k, v]) => [k, T(v, 60)])); await env.DB.put('mig:map', JSON.stringify(m)); });
  await (await import('./ledger.js')).audit(env, who, 'mig', 'mig:' + id, null, { sys, kind, n: rows.length, add: r.add, upd: r.upd }).catch(() => {});
  await notify(env, `🖥 📥 Перехід (${SYS[sys]}): ${KINDS[kind].t} — нових ${r.add}, оновлено ${r.upd}${r.skip ? `, пропущено ${r.skip}` : ''} · ${esc(c.who)}`);
  return { ...e, errs, dups: dups.slice(0, 50) };
}
// 📦 вхідні залишки в обліку: один «живий» документ — вартість усього складу на момент імпорту (повторний імпорт → сторно + новий)
async function openDoc(env, val, who) { const L2 = await import('./ledger.js'); return L2.docSync(env, { type: 'open', ext: 'mig:open', day: L2.acctDay(), sum: L2.kop(val), src: 'import', body: { val } }, who); }

export async function migLog(env) {
  const [list, map] = await Promise.all([env.DB.get('mig:log', 'json'), env.DB.get('mig:map', 'json')]);
  return { list: list || [], map: map || {}, kinds: Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v])), sys: SYS };
}
// ↩️ відкат імпорту: лише останній з можливих і лише якщо змінені ним записи ніхто не чіпав після нього
export async function migUndo(env, id, who) {
  return L(env, 'mig:log', async () => {
    const l = (await env.DB.get('mig:log', 'json')) || [], e = l.find(x => x.id === id); if (!e) return { error: 'Імпорт не знайдено' };
    if (!e.undo || e.undone) return { error: 'Цей імпорт відмінити не можна' };
    if (l.some(x => x.ts > e.ts && x.undo && !x.undone)) return { error: 'Спершу відмініть пізніші імпорти' };
    const u = await env.DB.get('mig:u:' + id, 'json'); if (!u) return { error: `Відкат можливий ${UNDO_DAYS} днів — строк минув` };
    const keys = Object.keys(u.was), cur = await env.DB.getMany(keys), moved = keys.filter((k, i) => hash(cur[i]) !== u.h[k]);
    if (moved.length) return { error: `Після імпорту вже змінювали: ${[...new Set(moved.map(k => ({ menu: 'меню', ing: 'склад', cards: 'техкарти', supl: 'постачальників', certs: 'сертифікати', staff: 'персонал' }[k] || { sup: 'постачальника', cli: 'гостя', cert: 'сертифікат', book: 'броні', bkm: 'броні', 'mig:x': 'звʼязки' }[k.split(':').slice(0, k.startsWith('mig:x') ? 2 : 1).join(':')] || k)))].join(', ')}. Відкат лише через копію — напишіть ATOM` };
    for (const k of keys) u.was[k] == null ? await env.DB.delete(k) : await env.DB.put(k, u.was[k]);
    if (e.kind === 'ing') { const ing = await getIng(env); await openDoc(env, k2(ing.filter(z => !z.off && !z.grp).reduce((a, z) => a + ((z.st?.k || 0) + (z.st?.b || 0)) * (z.cost || 0), 0)), who).catch(() => {}); }
    e.undone = Date.now(); e.undoBy = T(who, 40); await env.DB.put('mig:log', JSON.stringify(l)); await env.DB.delete('mig:u:' + id);
    await (await import('./ledger.js')).audit(env, who, 'mig.undo', 'mig:' + id, { n: keys.length }, null).catch(() => {});
    await notify(env, `🖥 ↩️ Перехід: імпорт «${KINDS[e.kind]?.t || e.kind}» відмінено · ${esc(T(who, 40))}`);
    return { ok: 1, n: keys.length };
  });
}
// 🤖 бот: статус переходу
export async function migBotText(env, link) {
  const { list } = await migLog(env), l = list.slice(0, 8);
  return [`📥 <b>Перехід з іншої системи</b>`, l.length ? l.map(e => `${e.undone ? '↩️' : e.nerr ? '⚠️' : '✅'} ${new Date(e.ts + 3 * 3600e3).toISOString().slice(5, 16).replace('T', ' ').replace(/(\d\d)-(\d\d)/, '$2.$1')} · ${KINDS[e.kind]?.t || e.kind} (${SYS[e.sys] || e.sys}) — нових ${e.add}, оновлено ${e.upd}${e.skip ? `, пропущено ${e.skip}` : ''}${e.undone ? ' — відмінено' : ''}`).join('\n') : 'Імпортів ще не було.',
    `\nМайстер переходу (Excel, 1С, Poster…): кабінет власника → заклад → 📥 Перехід${link ? `\n${link}` : ''}`].join('\n');
}

// 📡 Перехід напряму (етап 2): власник вставляє ключ API своєї старої системи → ми забираємо дані її ж API й повертаємо рядки
// нашими полями (KINDS). Далі — той самий майстер: перевірка → імпорт → відкат. Ключ ніде не зберігається й не пишеться в журнал;
// звертаємось лише до офіційних адрес систем (не до довільних URL). Poster: меню, техкарти, залишки, постачальники, гості з бонусами.
// Syrve/iiko Cloud API віддає лише номенклатуру (меню + товари); техкарти й залишки там — через файл.
const cents = v => v == null || v === '' ? '' : String(Math.round(+v) / 100);
const getJ = async (u, o = {}) => { const r = await fetch(u, { ...o, signal: AbortSignal.timeout(20000) }); const j = await r.json().catch(() => null); if (!r.ok || !j) throw new Error(r.status === 401 || r.status === 403 ? 'Ключ не підходить' : `Система відповіла ${r.status}`); return j; };
async function pullPoster(tok) {
  if (!/^\d+:[0-9a-f]{20,64}$/i.test(tok)) return { error: 'Ключ Poster має вигляд 123456:abcdef… (Доступ → Інтеграції → API)' };
  const P = async (m, q = '') => { const j = await getJ(`https://joinposter.com/api/${m}?token=${encodeURIComponent(tok)}${q}`); if (j.error) throw new Error(j.error.message || j.message || 'Poster: помилка ' + (j.error.code || j.error)); return j.response || []; };
  const [prods, left, sups] = await Promise.all([P('menu.getProducts'), P('storage.getStorageLeftovers', '&zero_leftovers=true'), P('storage.getSuppliers').catch(() => [])]);
  const cli = []; for (let off = 0; off < 10000; off += 500) { const l = await P('clients.getClients', `&num=500&offset=${off}`); cli.push(...l); if (l.length < 500) break; }
  const U = { kg: 'кг', l: 'л', p: 'шт' }, SU = { kg: 'г', l: 'мл', p: 'шт' }, ingN = new Map(left.map(x => [String(x.ingredient_id), x.ingredient_name]));
  const live = prods.filter(p => p.type !== '1' && +p.type !== 1 && String(p.delete || '0') !== '1');
  const price = p => cents((p.spots || []).find(s => +s.visible)?.price ?? p.spots?.[0]?.price ?? (typeof p.price === 'object' ? Object.values(p.price || {})[0] : p.price));
  const cards = [], miss = new Set();
  for (const p of live.filter(p => +p.type === 2)) for (const s of p.ingredients || []) { const n = ingN.get(String(s.ingredient_id)); if (!n) { miss.add(p.product_name); continue; } cards.push({ dish: p.product_name, ing: n, q: String(s.structure_brutto ?? ''), u: SU[s.structure_unit] || s.structure_unit || '', out: '' }); }
  return { data: {
    menu: live.flatMap(p => p.modifications?.length ? p.modifications.map(x => ({ id: p.product_id + '-' + x.modificator_id, cat: p.category_name || '', name: `${p.product_name} — ${String(x.modificator_name || '').trim()}`, price: price(x), desc: '', size: '' })) // товар з модифікаціями (смаки, обʼєми) — окремі позиції
      : [{ id: p.product_id, cat: p.category_name || '', name: p.product_name, price: price(p), desc: '', size: '' }]),
    ing: left.filter(x => +x.hidden !== 1).map(x => ({ id: x.ingredient_id, n: x.ingredient_name, u: U[x.ingredient_unit] || x.ingredient_unit || '', cat: '', q: String(x.ingredient_left ?? ''), wh: '', cost: cents(x.prime_cost), sum: cents(x.storage_ingredient_sum), bc: '' })),
    cards, sup: sups.filter(s => +s.delete !== 1).map(s => ({ n: s.supplier_name, code: s.supplier_tin || s.supplier_code || '', iban: '', phone: s.supplier_phone || '', addr: s.supplier_adress || '' })),
    cli: cli.filter(c => +c.delete !== 1 && (c.phone_number || c.phone)).map(c => ({ phone: c.phone_number || c.phone, name: [c.firstname, c.lastname].filter(Boolean).join(' '), bal: cents(c.bonus), bd: c.birthday && !/^0000/.test(c.birthday) ? c.birthday : '', note: c.comment || '' })),
  }, note: miss.size ? `Техкарти з напівфабрикатами перенесено частково: ${[...miss].slice(0, 5).join(', ')}${miss.size > 5 ? '…' : ''}` : '' };
}
async function pullSyrve(tok, org) {
  if (!/^[\w-]{8,80}$/.test(tok)) return { error: 'Ключ Syrve — «API login» з налаштувань Syrve Cloud' };
  let base = '', at = '';
  for (const h of ['https://api-eu.syrve.live', 'https://api-ru.iiko.services']) { try { at = (await getJ(h + '/api/1/access_token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ apiLogin: tok }) })).token; if (at) { base = h; break; } } catch {} }
  if (!at) return { error: 'Ключ не підходить ні до Syrve, ні до iiko' };
  const S = (p, b) => getJ(base + '/api/1/' + p, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + at }, body: JSON.stringify(b) });
  const orgs = (await S('organizations', {})).organizations || []; const o = orgs.find(x => x.id === org) || orgs[0]; if (!o) return { error: 'У Syrve немає закладів' };
  const n = await S('nomenclature', { organizationId: o.id }), gr = new Map((n.groups || []).map(g => [g.id, g.name])), ps = (n.products || []).filter(p => !p.isDeleted);
  const pr = p => String((p.sizePrices || [])[0]?.price?.currentPrice ?? '');
  return { data: {
    menu: ps.filter(p => p.type === 'Dish' || (p.type === 'Good' && pr(p) > 0)).map(p => ({ id: p.code || p.id, cat: gr.get(p.parentGroup) || '', name: p.name, price: pr(p), desc: p.description || '', size: p.weight ? String(Math.round(p.weight * 1000)) + ' г' : '' })),
    ing: ps.filter(p => p.type === 'Good').map(p => ({ id: p.code || p.id, n: p.name, u: p.measureUnit || '', cat: gr.get(p.parentGroup) || '', q: '', wh: '', cost: '', sum: '', bc: '' })),
  }, note: `Заклад Syrve: ${o.name}${orgs.length > 1 ? ` (усього ${orgs.length})` : ''}. Техкарти, залишки й гостей Syrve через цей ключ не віддає — їх перенесіть файлом.`, orgs: orgs.map(x => ({ id: x.id, name: x.name })) };
}
export async function migPull(env, b) {
  const tok = String(b.token || '').trim(); if (!tok) return { error: 'Вставте ключ API' };
  try { const r = b.sys === 'poster' ? await pullPoster(tok) : b.sys === 'syrve' ? await pullSyrve(tok, String(b.org || '')) : { error: 'Напряму — лише Poster і Syrve/iiko; для інших — файл' };
    if (r.data) for (const k of Object.keys(r.data)) r.data[k] = r.data[k].slice(0, 10000);
    return r; }
  catch (e) { return { error: e.name === 'TimeoutError' ? 'Система не відповідає — спробуйте пізніше' : String(e.message || e).slice(0, 160) }; }
}
