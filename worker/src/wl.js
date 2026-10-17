// ⏳ Черга в залі (waitlist): гість без броні чекає вільного столу. Один ключ wl:<день>, без окремого полінгу — каса бачить чергу разом зі станом.
import { L, dayKey, esc, hhmm, notify } from './ops.js';
import { normPhone } from './delivery.js';

const K = () => 'wl:' + dayKey(), TTL = 86400, GONE = 20 * 60e3, RECALL = 2 * 60e3;
const get = async env => (await env.DB.get(K(), 'json')) || [];
// «покликали» і 20 хв без реакції — вважаємо, що пішов (без cron: лише при читанні)
const live = x => !(x.st === 'called' && Date.now() - x.cAt > GONE) && ['wait', 'called'].includes(x.st);
const pub = (l, x) => ({ id: x.id, name: x.name, people: x.people, at: x.at, st: live(x) ? x.st : (x.st === 'called' ? 'gone' : x.st), t: x.t || 0, pos: live(x) ? l.filter(y => live(y) && y.at <= x.at).length : 0, cAt: x.cAt || 0 });

export async function wlList(env) { const l = await get(env); return l.filter(live).map(x => ({ ...pub(l, x), phone: x.phone })); }

export async function wlAdd(env, b, by) {
  const name = String(b.name || '').trim().slice(0, 40), people = Math.max(1, Math.min(30, parseInt(b.people, 10) || 0)), phone = b.phone ? normPhone(b.phone) : '';
  if (!name || !people) return [{ error: 'contact' }, 400];
  if (!by && !phone) return [{ error: 'contact' }, 400];
  const x = { id: crypto.randomUUID().replace(/-/g, '').slice(0, 10), name, people, phone, at: Date.now(), st: 'wait', by: by || '🌐 сайт' };
  let res;
  await L(env, [K()], async () => {
    const l = await get(env);
    if (l.filter(live).length >= 60) { res = [{ error: 'full' }, 409]; return; }
    if (phone && l.some(y => live(y) && y.phone === phone)) { res = [{ ok: true, ...pub(l, l.find(y => live(y) && y.phone === phone)) }]; return; }
    l.push(x); await env.DB.put(K(), JSON.stringify(l.slice(-200)), { expirationTtl: TTL });
    res = [{ ok: true, ...pub(l, x) }];
  });
  if (!by && res[0].id === x.id) notify(env, `⏳ Черга: <b>${esc(name)}</b>, ${people} ос. — №${res[0].pos}`).catch(() => {});
  return res;
}

export async function wlStatus(env, id) { const l = await get(env), x = l.find(y => y.id === String(id || '')); return x ? pub(l, x) : null; }

// єдина дія для каси й бота: call | seat (arg = стіл) | gone | cancel (гість сам)
export async function wlAct(env, id, act, arg, who) {
  let res;
  await L(env, [K()], async () => {
    const l = await get(env), x = l.find(y => y.id === String(id || ''));
    if (!x || !live(x)) { res = [{ error: 'not_found' }, 404]; return; }
    if (act === 'call') { if (x.cAt && Date.now() - x.cAt < RECALL) { res = [{ error: 'Щойно кликали — зачекайте 2 хв' }, 429]; return; } x.st = 'called'; x.cAt = Date.now(); }
    else if (act === 'seat') { const t = parseInt(arg, 10) || 0; if (t && l.some(y => y !== x && y.st === 'seated' && y.t === t && Date.now() - y.sAt < 10 * 60e3)) { res = [{ error: 'На цей стіл щойно посадили інших' }, 409]; return; } x.st = 'seated'; x.t = t; x.sAt = Date.now(); }
    else if (act === 'gone' || act === 'cancel') x.st = 'gone';
    else { res = [{ error: 'act' }, 400]; return; }
    x.by2 = who || ''; await env.DB.put(K(), JSON.stringify(l), { expirationTtl: TTL });
    res = [{ ok: true, ...pub(l, x) }];
  });
  return res;
}

// текст для бота
export const wlText = l => l.length ? '⏳ <b>Черга в залі</b>\n' + l.map((x, i) => `${i + 1}. ${esc(x.name)} · ${x.people} ос. · з ${hhmm(x.at)}${x.st === 'called' ? ' · 🔔 покликали' : ''}`).join('\n') : '⏳ Черга порожня';
export const wlKb = l => ({ inline_keyboard: l.slice(0, 10).map(x => [{ text: '🔔 ' + x.name.slice(0, 14), callback_data: 'wl:call:' + x.id }, { text: '🪑 Сів', callback_data: 'wl:seat:' + x.id }, { text: '✖', callback_data: 'wl:gone:' + x.id }]) });
