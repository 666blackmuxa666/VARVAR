// Telegram-бот закладу. Вхід: пароль офіціанта (столи, замовлення, закриття, стоп-лист)
// і окремо пароль адміністратора (звіти, каса, видалення, меню, Wi‑Fi, персонал, паролі).
// Уся логіка — у ops.js (та сама, що в касовій програмі POS).
export { tg, esc, hhmm, getBill } from './ops.js';
export { addStat, addDishes } from './ops.js';

export { KEYBOARD, COMMANDS, QR_PRINT, TEST_JOB } from './bot-views.js';
export { handleUpdate } from './bot-main.js';
