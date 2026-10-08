// 📋 План на день: адмін складає завдання (разові + шаблони, що повторюються), працівник відмічає ✅ зробив / ❌ не зробив (з причиною, за потреби — фото).
// Ключі: task_tpl — шаблони [{id,n,who,days,imp,photo,tm}]; task:<день> — {gen, l:[{id,n,who,imp,photo,tm,tpl,st,by,at,why,ph}]}; tph:<день>:<id> — фото (35 днів).
// who: {k:'a'} — будь-хто на зміні · {k:'r', r:'cook'} — уся роль · {k:'s', id, n} — конкретна людина.
import { L, dayKey, isDay, hhmm, getStaff, esc } from './ops.js';

const ROLE = { admin: 'адміни', waiter: 'офіціанти', cook: 'кухарі', courier: 'кур\'єри' };
export const whoText = w => !w || w.k === 'a' ? 'будь-хто' : w.k === 'r' ? ROLE[w.r] || w.r : w.n || '?';
export const isMine = (t, me) => !t.who || t.who.k === 'a' || (t.who.k === 'r' && t.who.r === me.role) || (t.who.k === 's' && t.who.id === me.sid);
const nid = () => Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
const wd = day => (new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = пн
const getTpl = async env => (await env.DB.get('task_tpl', 'json')) || [];

function cleanWho(w, staff) {
  if (w?.k === 'r' && ROLE[w.r]) return { k: 'r', r: w.r };
  if (w?.k === 's') { const s = staff.find(x => x.id === w.id); if (s) return { k: 's', id: s.id, n: s.name }; }
  return { k: 'a' };
}
const cleanTask = (x, staff) => ({ n: String(x.n || '').trim().slice(0, 140), who: cleanWho(x.who, staff), imp: x.imp ? 1 : 0, photo: x.photo ? 1 : 0, tm: /^\d{1,2}:\d{2}$/.test(x.tm || '') ? x.tm : '' });

// день: шаблони додаються один раз — коли день уперше відкрили (сьогодні або завтра, щоб адмін бачив план наперед)
export async function taskDay(env, day = dayKey()) {
  const k = 'task:' + day, d = (await env.DB.get(k, 'json')) || { l: [] };
  if (d.gen || day < dayKey()) return d;
  return L(env, k, async () => {
    const d2 = (await env.DB.get(k, 'json')) || { l: [] }; if (d2.gen) return d2;
    const w = wd(day);
    for (const t of await getTpl(env)) if (!t.days?.length || t.days.includes(w)) d2.l.push({ id: nid(), n: t.n, who: t.who, imp: t.imp, photo: t.photo, tm: t.tm, tpl: t.id, st: '' });
    d2.gen = 1; await env.DB.put(k, JSON.stringify(d2), { expirationTtl: 95 * 86400 }); return d2;
  });
}
const edit = (env, day, fn) => L(env, 'task:' + day, async () => { const d = await taskDay(env, day), r = await fn(d); await env.DB.put('task:' + day, JSON.stringify(d), { expirationTtl: 95 * 86400 }); return r; });
const sortL = l => [...l].sort((a, b) => (!!a.st - !!b.st) || (b.imp - a.imp) || (a.tm || '99').localeCompare(b.tm || '99'));

// підсумок дня: для Z-звіту, Telegram і кабінету власника
export async function taskSum(env, day = dayKey()) {
  const d = (await env.DB.get('task:' + day, 'json')) || { l: [] }, l = d.l;
  return { n: l.length, ok: l.filter(t => t.st === 'done').length, no: l.filter(t => t.st === 'no'), open: l.filter(t => !t.st) };
}
export async function taskSumText(env, day = dayKey()) {
  const s = await taskSum(env, day); if (!s.n) return '';
  const bad = [...s.no.map(t => `❌ ${esc(t.by || whoText(t.who))} — ${esc(t.n)}${t.why ? ` (${esc(t.why)})` : ''}`), ...s.open.map(t => `⏳ ${esc(whoText(t.who))} — ${esc(t.n)}`)];
  return `📋 <b>План на ${day.split('-').reverse().join('.')}: ${s.ok} з ${s.n} ✅</b>${bad.length ? '\nНе зроблено:\n' + bad.slice(0, 15).join('\n') + (bad.length > 15 ? `\n…ще ${bad.length - 15}` : '') : ' — усе виконано 👏'}`;
}

// ✅ / ❌ — може той, кому завдання, або адмін
export async function taskMark(env, me, day, id, st, why, ph) {
  if (!['done', 'no', ''].includes(st)) return { error: 'Невідомий стан' };
  return edit(env, day, async d => {
    const t = d.l.find(x => x.id === id); if (!t) return { error: 'Завдання не знайдено' };
    if (me.role !== 'admin' && !isMine(t, me)) return { error: 'Це завдання не ваше' };
    if (st === 'no' && !String(why || '').trim()) return { error: 'Напишіть, чому не зроблено' };
    if (st === 'done' && t.photo && !ph && !t.ph && me.role !== 'admin') return { error: 'Додайте фото — так домовились для цього завдання' };
    if (ph) { await env.DB.put(`tph:${day}:${id}`, ph, { expirationTtl: 35 * 86400 }); t.ph = 1; }
    if (st) Object.assign(t, { st, by: me.name, at: hhmm(), why: st === 'no' ? String(why).trim().slice(0, 140) : '' }); else { t.st = ''; delete t.by; delete t.at; delete t.why; }
    return { ok: true, t };
  });
}

export async function taskApi(b, env, me) {
  const admin = me.role === 'admin', day = admin && isDay(b.day) ? b.day : dayKey(), /* працівник — лише сьогодні */ R = x => [x?.error ? x : { ok: true, ...x }, x?.error ? 400 : 200];
  const needAdmin = () => [{ error: 'admin' }, 403];
  switch (b.op) {
    case 'taskList': {
      const d = await taskDay(env, day), l = admin && !b.mine ? d.l : d.l.filter(t => isMine(t, me));
      return R({ day, list: sortL(l), ...(admin ? { tpl: await getTpl(env), staff: (await getStaff(env)).map(s => ({ id: s.id, n: s.name, r: s.role })) } : {}) });
    }
    case 'taskAdd': {
      if (!admin) return needAdmin(); if (day < dayKey()) return R({ error: 'Минулий день змінити не можна' });
      const t = cleanTask(b, await getStaff(env)); if (!t.n) return R({ error: 'Напишіть завдання' });
      return R(await edit(env, day, d => { if (d.l.length >= 200) return { error: 'Забагато завдань на день' }; const x = { id: nid(), ...t, st: '' }; d.l.push(x); return { t: x }; }));
    }
    case 'taskDel': { if (!admin) return needAdmin(); return R(await edit(env, day, d => { const i = d.l.findIndex(x => x.id === b.id); if (i < 0) return { error: 'Не знайдено' }; if (d.l[i].tpl) d.dtpl = [...new Set([...(d.dtpl || []), d.l[i].tpl])]; d.l.splice(i, 1); return {}; })); } // видалене з шаблону не повертається
    case 'taskMark': return R(await taskMark(env, me, day, String(b.id || ''), String(b.st || ''), b.why, typeof b.ph === 'string' && b.ph.length > 1000 && b.ph.length < 2e6 ? b.ph.replace(/^data:image\/\w+;base64,/, '') : ''));
    case 'taskPh': { const d = await taskDay(env, day), t = d.l.find(x => x.id === b.id); if (!t || (!admin && !isMine(t, me))) return R({ error: 'Не знайдено' }); return R({ ph: await env.DB.get(`tph:${day}:${t.id}`) || '' }); }
    case 'taskTpl': { // шаблони, що повторюються: зберегти весь список
      if (!admin) return needAdmin(); const staff = await getStaff(env);
      const list = (Array.isArray(b.list) ? b.list : []).slice(0, 60).map(x => ({ id: String(x.id || nid()).slice(0, 12), ...cleanTask(x, staff), days: (Array.isArray(x.days) ? x.days : []).map(Number).filter(n => n >= 0 && n <= 6) })).filter(x => x.n);
      await env.DB.put('task_tpl', JSON.stringify(list));
      // сьогоднішній план: додати нові шаблони одразу (якщо день уже згенеровано)
      for (const dd of [dayKey(), new Date(Date.parse(dayKey() + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10)]) { if (dd !== dayKey() && !(await env.DB.get('task:' + dd, 'json'))?.gen) continue; const w = wd(dd); // сьогодні й завтра (якщо вже відкривали)
      await edit(env, dd, d => { for (const t of list) if ((!t.days.length || t.days.includes(w)) && !d.l.some(x => x.tpl === t.id) && !(d.dtpl || []).includes(t.id)) d.l.push({ id: nid(), n: t.n, who: t.who, imp: t.imp, photo: t.photo, tm: t.tm, tpl: t.id, st: '' }); }); }
      return R({ tpl: list });
    }
  }
  return [{ error: 'unknown_op' }, 400];
}

// 🤖 бот персоналу: «📋 Мій план» — список і кнопки ✅ / ❌ (причину бот попросить написати)
export async function taskBotView(env, s) {
  const me = { name: s.name, role: s.role, sid: s.id }, day = dayKey(), l = sortL((await taskDay(env, day)).l.filter(t => isMine(t, me)));
  if (!l.length) return { text: '📋 На сьогодні завдань немає.' };
  const ic = t => t.st === 'done' ? '✅' : t.st === 'no' ? '❌' : t.imp ? '❗' : '⬜';
  const text = `📋 <b>Мій план на ${day.split('-').reverse().join('.')}</b> · ${l.filter(t => t.st === 'done').length} з ${l.length}\n\n` + l.map(t => `${ic(t)} ${t.tm ? t.tm + ' · ' : ''}${esc(t.n)}${t.photo && !t.st ? ' 📷' : ''}${t.st ? ` <i>(${esc(t.by || '')} ${t.at || ''}${t.why ? ' — ' + esc(t.why) : ''})</i>` : ''}`).join('\n') + (l.some(t => t.photo && !t.st) ? '\n\n📷 — завдання з фото: відмітьте в касі (👤 кабінет).' : '');
  const open = l.filter(t => !t.st).slice(0, 20);
  return { text, markup: open.length ? { inline_keyboard: open.map(t => [...(t.photo ? [] : [{ text: '✅ ' + t.n.slice(0, 28), callback_data: 'tkd:' + t.id }]), { text: '❌' + (t.photo ? ' ' + t.n.slice(0, 28) : ''), callback_data: 'tkn:' + t.id }]) } : undefined };
}
