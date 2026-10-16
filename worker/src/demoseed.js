// 🎬 Демо-заклад «Все за 500» (atom-demo): видумане меню, персонал і 14 днів «життя» закладу.
// Історію пишуть справжні функції каси (ops.js) з підміненим годинником (Date.now) — тож звіти, чеки, витрати,
// зміни й стрічка виглядають як у живого закладу. Щоночі (index.js → owner.js demosnap reset): еталон + свіжа історія,
// дати завжди «до сьогодні». Telegram і друк у демо не підключені — notify нікуди не шле.
import { getMenu, importMenu } from './menu.js';
import { addWaiterOrder, itemsFromMenu, closeTable, addExpense, openShift, closeShift, addStaff, getStaff, setDiscount, resetAll, dayKey } from './ops.js';
import { setSite, bookManual } from './site.js';

const M = (cat, rows) => rows.map(([name, price, size, desc]) => ({ cat, name, price, size, desc }));
export const DEMO_MENU = [
  ...M('🍔 Бургери', [['Класичний', 245, '320 г', 'Яловича котлета, чедер, томат, мариновані огірки, фірмовий соус'], ['Чізбургер подвійний', 320, '420 г', 'Дві котлети, подвійний чедер, цибуля, гірчиця'], ['Курячий хрусткий', 230, '310 г', 'Курка в паніровці, капуста коул-слоу, соус ранч'], ['Біф-бекон', 290, '360 г', 'Яловичина, бекон, карамелізована цибуля, BBQ'], ['Веган-бургер', 260, '300 г', 'Котлета з нуту, авокадо, томат, соус песто']]),
  ...M('🍕 Піца', [['Маргарита', 210, '30 см', 'Томатний соус, моцарела, базилік'], ['Пепероні', 265, '30 см', 'Пепероні, моцарела, орегано'], ['Чотири сири', 295, '30 см', 'Моцарела, дор-блю, пармезан, гауда'], ['М\'ясна', 330, '30 см', 'Бекон, шинка, курка, мисливські ковбаски']]),
  ...M('🥗 Салати', [['Цезар з куркою', 225, '280 г', 'Ромен, курка гриль, пармезан, крутони, соус цезар'], ['Грецький', 190, '260 г', 'Овочі, фета, маслини, орегано'], ['Теплий з телятиною', 285, '270 г', 'Телятина, мікс салатів, кунжутний соус']]),
  ...M('🍲 Супи', [['Борщ з пампушками', 150, '350/60 г', 'Класичний український, сметана, сало'], ['Крем-суп грибний', 160, '300 г', 'Печериці, вершки, крутони'], ['Том ям', 245, '350 г', 'Креветки, кокосове молоко, лайм']]),
  ...M('🥩 Гаряче', [['Стейк з свинини', 340, '250/100 г', 'Свиняча шия, картопля по-селянськи'], ['Паста карбонара', 240, '320 г', 'Бекон, жовток, пармезан'], ['Крильця BBQ', 220, '400 г', '10 крилець, соус на вибір'], ['Сет «Все за 500»', 500, '1200 г', 'Бургер, піца маргарита, картопля фрі, 2 соуси — на компанію']]),
  ...M('🍟 Закуски', [['Картопля фрі', 85, '150 г'], ['Цибулеві кільця', 95, '150 г'], ['Нагетси', 135, '200 г', '8 шт, соус на вибір'], ['Сирні палички', 155, '180 г']]),
  ...M('🍰 Десерти', [['Чізкейк', 135, '150 г', 'Нью-Йорк, ягідний соус'], ['Брауні з морозивом', 125, '170 г'], ['Тірамісу', 145, '160 г']]),
  ...M('☕ Кава', [['Еспресо', 45, '30 мл'], ['Американо', 50, '200 мл'], ['Капучино', 65, '250 мл'], ['Лате', 70, '300 мл'], ['Раф', 85, '300 мл']]),
  ...M('🥤 Напої', [['Лимонад', 85, '400 мл', 'Класичний / маракуя / полуниця'], ['Coca-Cola', 55, '330 мл'], ['Сік', 60, '250 мл'], ['Вода', 40, '500 мл']]),
  ...M('🍸 Бар', [['Апероль шприц', 210, '300 мл'], ['Мохіто', 190, '300 мл'], ['Пиво світле', 75, '500 мл'], ['Пиво темне', 85, '500 мл'], ['Сидр', 95, '500 мл']]),
];
const STAFF = [['Олена', 'admin'], ['Максим', 'waiter'], ['Ірина', 'waiter'], ['Денис', 'waiter'], ['Тарас', 'cook'], ['Сергій', 'courier']];
const SITE = [['name', 'Все за 500'], ['tagline', 'Бургери, піца й бар — усе меню до 500 ₴'], ['about', 'Демонстраційний заклад «Все за 500»: так працює система ATOM. Меню з QR на столі, замовлення з собою й доставка, бронювання, сертифікати, а в касі — столи, кухня, склад, зарплата й звіти. Тут можна все спробувати — щоночі демо повертається до початкового вигляду.'], ['phone', '+380 00 000 05 00'], ['addr', 'вул. Демонстраційна, 500'], ['from', '10:00'], ['to', '23:00'], ['rating', 4.8], ['ratingN', 500], ['bookOn', 1], ['certOn', 1]];
const PROMOS = [{ t: '🍔 Сет «Все за 500»', d: 'Бургер, піца, фрі й соуси на компанію — рівно 500 ₴' }, { t: '☕ Кава до 12:00 −20%', d: 'Щоранку в будні' }];
const EXP = [['Овочі на ринку', 850], ['Хліб і булочки', 420], ['Газ для кухні', 300], ['Миючі засоби', 260], ['Лід для бару', 180]];

// 🎲 стабільний «випадок» — однакова історія при кожному скиданні
const rng = s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;

async function withClock(t, fn) { const real = Date.now; Date.now = () => t; try { return await fn(); } finally { Date.now = real; } }
const kyivMs = (day, hh, mm) => { // YYYY-MM-DD + час у Києві → ms
  const guess = Date.parse(`${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00Z`);
  const off = new Date(guess).toLocaleString('sv-SE', { timeZone: 'Europe/Kyiv' }).replace(' ', 'T') + 'Z';
  return guess - (Date.parse(off) - guess);
};
const addD = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);

// full — уперше: меню, персонал, сайт. Без full — лише історія (щоночі після відновлення еталону).
export async function demoSeed(env, { full = false, days = 14 } = {}) {
  if (env.VENUE !== 'atom-demo') return { error: 'лише для atom-demo' };
  if (full) {
    await importMenu(env, DEMO_MENU, true);
    const have = new Set((await getStaff(env)).map(s => s.name));
    for (const [i, [n, r]] of STAFF.entries()) if (!have.has(n)) await addStaff(env, n, String(1000 + Math.floor(Math.random() * 8999)), r).catch(() => {}); // PIN випадкові — у демо входять кнопкою
    for (const [k, v] of SITE) await setSite(env, k, v).catch(() => {});
    for (const p of PROMOS) await setSite(env, 'promoAdd', p).catch(() => {});
  }
  await resetAll(env); // стара історія (чеки, рахунки, витрати, стрічка, зміна)
  for (const k of (await env.DB.list({ prefix: 'book:' })).keys.map(k => k.name)) await env.DB.delete(k);
  const items = (await getMenu(env)).categories.filter(c => !c.tech).flatMap(c => c.items.map(i => ({ ...i, cat: c.name.uk })));
  if (!items.length) return { error: 'немає меню' };
  const pick = (r, re) => { const l = items.filter(i => re.test(i.cat)); return l[Math.floor(r() * l.length)]; };
  const waiters = (await getStaff(env)).filter(s => s.role === 'waiter').map(s => s.name); if (!waiters.length) waiters.push('Максим');
  const admin = (await getStaff(env)).find(s => s.role === 'admin')?.name || 'Олена';
  const today = dayKey(), nowT = Date.now(), r = rng(500);
  let checks = 0;
  for (let d = days - 1; d >= 0; d--) {
    const day = addD(today, -d), wk = new Date(day + 'T12:00:00Z').getUTCDay(), busy = wk === 5 || wk === 6 ? 1.5 : 1;
    const at = (h, m) => kyivMs(day, h, m), live = t => t < nowT;
    if (!live(at(10, 0))) { // 🌙 сьогодні ще не відкрились (скидання о 4:00) — у залі все одно кілька гостей, щоб демо не було порожнім
      await withClock(nowT - 40 * 60e3, () => openShift(env, 1000, admin));
      for (const [j, tbl] of [3, 5, 8, 11].entries()) { const it = [pick(r, /Бургер|Піца|Гаряче/), pick(r, /Бар|Напої|Кава/), pick(r, /Закуск|Салат/)];
        await withClock(nowT - (30 - j * 7) * 60e3, async () => addWaiterOrder(env, { table: tbl, items: await itemsFromMenu(env, it.map(x => ({ id: x.id, q: 1 + (j % 2) }))) }, waiters[j % waiters.length], '', 'каса')); }
      break;
    }
    await withClock(at(9, 50), () => openShift(env, 1000, admin));
    const n = Math.round((14 + r() * 8) * busy), open = [];
    for (let i = 0; i < n; i++) {
      const h = 11 + Math.floor(i * 11 / n), m = Math.floor(r() * 50), t0 = at(h, m); if (!live(t0)) break;
      const tbl = 1 + ((i * 7 + d) % 12), w = waiters[Math.floor(r() * waiters.length)], guests = 1 + Math.floor(r() * 4);
      const ord = [pick(r, /Бургер|Піца|Гаряче|Салат|Суп/)];
      for (let g = 1; g < guests; g++) ord.push(pick(r, /Бургер|Піца|Гаряче|Салат|Суп|Закуск/));
      for (let g = 0; g < guests; g++) ord.push(pick(r, /Кава|Напої|Бар/));
      if (r() < .35) ord.push(pick(r, /Десерт/));
      const list = Object.values(ord.reduce((a, it) => ((a[it.id] ||= { id: it.id, q: 0 }).q++, a), {}));
      await withClock(t0, async () => addWaiterOrder(env, { table: tbl, items: await itemsFromMenu(env, list) }, w, '', 'каса'));
      const t1 = t0 + (35 + r() * 50) * 60e3;
      if (!live(t1) || (d === 0 && i >= n - 3 && live(t0))) { open.push(tbl); continue; } // 🍽 сьогодні — кілька столів ще сидять
      if (r() < .08) await withClock(t1 - 60e3, () => setDiscount(env, tbl, 10, admin, true));
      await withClock(t1, () => closeTable(env, tbl, w, r() < .62 ? 'card' : 'cash', false)); checks++;
    }
    for (const [j, [note, sum]] of EXP.entries()) if (r() < .45 && live(at(12 + j, 5))) await withClock(at(12 + j, 5), () => addExpense(env, { sum: Math.round(sum * (.8 + r() * .4)), note, src: 'cash', at: `${12 + j}:05`, by: admin }, day));
    if (d > 0) await withClock(at(23, 10), () => closeShift(env, null, admin, false)).catch(() => {});
  }
  const B = [['Анна', 2, 19, '30', 4, 'День народження'], ['Віктор', 1, 20, '00', 2, ''], ['Компанія «Рога і копита»', 3, 18, '00', 12, 'Корпоратив, банкет'], ['Марія', 5, 13, '00', 3, '']];
  for (const [i, [name, dd, h, mm, people, comment]] of B.entries()) await bookManual(env, { name, phone: '38000000050' + i, date: addD(today, dd), time: `${h}:${mm}`, people, comment, kind: people > 8 ? 'banquet' : 'table' }, admin).catch(() => {});
  return { ok: true, checks, days };
}
