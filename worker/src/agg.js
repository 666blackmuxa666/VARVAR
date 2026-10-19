// 🛵 Агрегатори доставки (Glovo, Bolt Food…) — модуль `agg`.
// Замовлення з агрегатора закривається оплатою «🛵 <назва>»: гроші безготівкові (входять у card дня, як і 🏦 переказ),
// агрегатор виплачує нетто (мінус комісія) раз на кілька днів — виплату у виписці зіставляє bank.js.
// Ключі: `aggs` — [{ id, n, fee (% комісії, орієнтовна), on, rx? (як агрегатор підписаний у виписці) }].
// Чек `closed:`: ag — id агрегатора, agS — сума через нього (⊂ card). День `day:`: ag — { id: сума }.
import { L } from './ops.js';

const DEF = [{ id: 'glovo', n: 'Glovo', fee: 30, on: 1, rx: 'glovo|глово' }, { id: 'bolt', n: 'Bolt Food', fee: 25, on: 1, rx: 'bolt|болт' }];
const T = (s, n) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, n);
const r2 = n => Math.round(n * 100) / 100;

export async function aggList(env) { const l = await env.DB.get('aggs', 'json'); return Array.isArray(l) ? l : DEF.map(x => ({ ...x })); }
export const aggOn = async env => (await aggList(env)).filter(x => x.on);
export const aggName = (l, id) => l.find(x => x.id === id)?.n || id;
export function aggRx(a) { try { return new RegExp(a.rx || a.n.replace(/[^\p{L}\p{N} ]/gu, '').split(' ')[0] || a.id, 'i'); } catch { return new RegExp(a.id, 'i'); } }

// ✏️ додати / змінити / вимкнути агрегатор. id нового — з назви
export async function aggSet(env, b) {
  return L(env, 'aggs', async () => {
    const l = await aggList(env), n = T(b.n, 30), fee = b.fee == null || b.fee === '' ? null : Math.round(+b.fee * 100) / 100;
    if (fee != null && !(fee >= 0 && fee <= 60)) return { error: 'Комісія — від 0 до 60%' };
    let x = l.find(a => a.id === b.id);
    if (!x) { if (!n) return { error: 'Вкажіть назву' }; if (l.length >= 8) return { error: 'Не більше 8 агрегаторів' };
      const base = n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'agg'; let id = base; for (let i = 2; l.some(a => a.id === id); i++) id = base + i;
      x = { id, n, fee: fee ?? 0, on: 1 }; l.push(x); }
    else { if (n) x.n = n; if (fee != null) x.fee = fee; if (b.on != null) x.on = b.on ? 1 : 0; if (b.rx != null) x.rx = T(b.rx, 60); }
    await env.DB.put('aggs', JSON.stringify(l)); return { list: l };
  });
}

// pay = 'agg:<id>' → id, якщо агрегатор існує й увімкнений
export async function aggPay(env, pay) { if (!String(pay || '').startsWith('agg:')) return null; const id = pay.slice(4); return (await aggOn(env)).some(a => a.id === id) ? id : undefined; }

// день: d.ag[id] += sign · agS (закриття, видалення з виручки, повернення, правка)
export function agBump(d, id, v) { if (!id || !v) return; const a = d.ag || (d.ag = {}); a[id] = r2(Math.max(0, (a[id] || 0) + v)); if (!a[id]) delete a[id]; if (!Object.keys(a).length) delete d.ag; }
// підсумок по чеках: { id: сума }
export function agSum(recs) { const o = {}; for (const x of recs) if (x.ag && x.agS) o[x.ag] = r2((o[x.ag] || 0) + x.agS); return o; }
export const agTotal = d => Object.values(d?.ag || {}).reduce((a, v) => a + v, 0);
const AGN = Object.fromEntries(DEF.map(x => [x.id, x.n])), agN = id => AGN[id] || id;
// Z-звіт: рядок для Telegram і рядки для друку
export const agLine = ag => Object.entries(ag || {}).map(([id, v]) => ` · 🛵 ${agN(id)} ${Math.round(v)} грн`).join('');
export const agRows = ag => Object.entries(ag || {}).map(([id, v]) => ['lr', ' з них ' + agN(id), `${Math.round(v)} грн`]);
// 🤖 бот: список з перемикачами
export async function aggBotView(env) { const l = await aggList(env);
  return { text: `🛵 <b>Агрегатори доставки</b>\nЗамовлення закривайте кнопкою «🛵 назва» — продажі окремо в Z, виплату у виписці система зіставить сама.\n\n${l.map(a => `${a.on ? '🟢' : '⚪️'} <b>${a.n}</b> · комісія ~${a.fee || 0}%`).join('\n')}\n\nКомісія або новий: <code>агрегатор Glovo 28</code>`,
    markup: { inline_keyboard: l.map(a => [{ text: `${a.on ? '⚪️ Вимкнути' : '🟢 Увімкнути'} ${a.n}`, callback_data: 'agg:' + a.id }]) } }; }
