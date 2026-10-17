// 🔑 Ролі й права з галочками (_team/roles.md).
// Роль — шаблон: адмін має всі права, решта — нічого понад свої звичні дії.
// staff.perm = { <ключ>: 1 | 0 } — лише відхилення від шаблону (1 — додати, 0 — забрати у адміна).
// Нема поля → поведінка як до появи прав (відкат безпечний, міграція даних не потрібна).
export const PERMS = [
  { k: 'void', e: '🗑', n: 'Видаляти/повертати рахунки й позиції', g: 'Зал' },
  { k: 'edit_closed', e: '✏️', n: 'Правити й відкривати закриті чеки', g: 'Зал' },
  { k: 'cash', e: '💰', n: 'Каса: зміна, Z-звіт, внесення/вилучення, витрати', g: 'Гроші' },
  { k: 'reports', e: '📊', n: 'Звіти продажів і експорт бухгалтеру', g: 'Гроші' },
  { k: 'tax', e: '📅', n: 'Податковий календар', g: 'Гроші' },
  { k: 'stock', e: '📦', n: 'Склад: прихід, списання, інвентаризація, собівартість', g: 'Склад' },
  { k: 'menu', e: '🍽', n: 'Меню, ціни, категорії, цехи', g: 'Склад' },
  { k: 'staff', e: '👥', n: 'Персонал: додавати, PIN, ролі (крім адмінів)', g: 'Команда' },
  { k: 'pay', e: '👷', n: 'Графік, зміни й зарплата', g: 'Команда' },
  { k: 'print', e: '🖨', n: 'Друк, чеки, QR-столи', g: 'Заклад' },
  { k: 'delivery', e: '🛵', n: 'Диспетчер кур\'єрів і звіти доставки', g: 'Заклад' },
  { k: 'settings', e: '⚙️', n: 'Налаштування закладу, зали, Wi‑Fi, журнал дій', g: 'Заклад' },
];
export const PERM_KEYS = PERMS.map(p => p.k);
// права, що вимагають PIN ≥6 (лише при новому/зміненому PIN — старі не блокуємо)
export const SENSITIVE = ['void', 'staff', 'settings', 'reports'];

// операція → право. Невідома операція лишається «лише адміністратор» (безпечний дефолт).
const MAP = [
  ['void', /^(voidBack|tableBack|closedDel|closedRefund)$/],
  ['edit_closed', /^(closedEdit|closedReopen|closedBack|closedPrint)$/],
  ['cash', /^(shift|zX|zDay|tipPay|cashMove|reconcile|moveDel|moveBack|expenseBack|zDel|zBack|shiftOpen|shiftClose|float|expense|expenseDel)$/],
  ['reports', /^(report|reports|acctExport)$/],
  ['tax', /^tax(Get|Set|Done)$/],
  ['stock', /^sk[A-Z]/],
  ['menu', /^(catSet|menuSave|catAdd|menuDel|menuUndo|menuPhoto|menuImport|stGet|stSet|stItem|photo[A-Z]\w*)$/],
  ['staff', /^(staff|regCode|staffAdd|staffDel|staffEdit|staffPerm)$/],
  ['pay', /^zp(Grid|Att|Plan|PlanCopy|Op|OpDel|GridSet|Staff)$/],
  ['print', /^(rcptSet|rcptLogo|rcptTest|printRoute|tabReg|printMove|printClear|printQr|qrInfo|qrNew|dzGet|dzSet)$/],
  ['delivery', /^cour(List|Rep|Cash)$/],
  ['settings', /^(wifi|wifiAdd|wifiClear|hallsSet|mapSet|cfgSet|kitchenPct|evDrop|alog|onlList)$/],
];
export const permOf = op => { for (const [k, re] of MAP) if (re.test(op || '')) return k; return ''; };

// чи має працівник право k: адмін — так, якщо не знято (perm[k]===0); решта — лише якщо видано (perm[k]===1)
export const can = (me, k) => me?.role === 'admin' ? me.perm?.[k] !== 0 : me?.perm?.[k] === 1;
// повний розрахований набір прав (для інтерфейсу)
export const canList = me => PERM_KEYS.filter(k => can(me, k));
// ліміт знижки: perm.discountMax (0..100) перекриває cfg.discMax; адмін без перекриття — 100
export const discLimit = (me, cfgMax) => { const v = me?.perm?.discountMax; if (Number.isFinite(+v) && v !== null && v !== '' && v !== undefined) return Math.max(0, Math.min(100, Math.round(+v))); return me?.role === 'admin' ? 100 : cfgMax; };
// очищення perm з тіла запиту: лише відомі ключі, значення 0/1, discountMax 0..100
export function cleanPerm(p) {
  const o = {}; if (!p || typeof p !== 'object') return o;
  for (const k of PERM_KEYS) if (p[k] === 0 || p[k] === 1) o[k] = p[k];
  if (p.discountMax !== undefined && p.discountMax !== null && p.discountMax !== '' && Number.isFinite(+p.discountMax)) o.discountMax = Math.max(0, Math.min(100, Math.round(+p.discountMax)));
  return o;
}
// видача права понад шаблон: 1 для не-адміна, 0 для адміна — тільки відхилення зберігаємо
export function diffPerm(role, p) {
  const o = {}; for (const k of PERM_KEYS) if (role === 'admin' ? p[k] === 0 : p[k] === 1) o[k] = p[k];
  if (p.discountMax !== undefined) o.discountMax = p.discountMax;
  return o;
}
