// 🔒 Ф5 замок періоду: закритий місяць не правиться (чеки, витрати, Z, рух каси, облікові документи).
// cfg:plock = { to: 'РРРР-ММ-ДД' (останній закритий день), by, at }. Читається лише коли op стосується минулого дня — без зайвих запитів.
import { dayKey, isDay } from './ops-core.js';

export async function plockTo(env) { return (await env.DB.get('cfg:plock', 'json'))?.to || ''; }
export const plockMsg = to => `🔒 Період до ${to.split('-').reverse().join('.')} закрито — минулі чеки й витрати не правляться. Повернення оформіть сьогоднішнім днем`;
// день у закритому періоді → текст помилки, інакше ''
export async function plocked(env, day) { if (!isDay(day) || day >= dayKey()) return ''; const to = await plockTo(env); return to && day <= to ? plockMsg(to) : ''; }

// m = 'РРРР-ММ' — закрити по кінець місяця (лише минулий місяць); m = '' — відкрити
export async function plockSet(env, m, who) {
  if (!m) { await env.DB.delete('cfg:plock'); return { to: '' }; }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return { error: 'Місяць — РРРР-ММ' };
  const [y, mo] = m.split('-').map(Number), to = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  if (to >= dayKey()) return { error: 'Закрити можна лише місяць, що вже минув' };
  await env.DB.put('cfg:plock', JSON.stringify({ to, by: String(who || '').slice(0, 60), at: Date.now() })); return { to };
}
