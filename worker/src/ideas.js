// 💡 Побажання розробнику: працівник пише з особистого кабінету (каса) або з бота персоналу.
// Адмін бачить усі (Персонал → 💡 Побажання), позначає «✅ зроблено» і видаляє. Автор бачить і видаляє свої. Ключ бази: ideas.
import { L, logEvent, esc } from './ops.js';
// копія у 📨 вхідні кабінету власника (HUB)
export async function toHub(env, m) { try { if (!env.HUB) return; const { hub } = await import('./hub.js'), { getSite } = await import('./site.js'); await hub(env).msgAdd({ ...m, venue: env.VENUE || 'varvar', vname: (await getSite(env)).name }); } catch (e) { console.log('toHub', e.message); } }
const get = async env => (await env.DB.get('ideas', 'json')) || [];
const edit = (env, fn) => L(env, 'ideas', async () => { const l = await get(env), r = fn(l); if (r?.error) return r; await env.DB.put('ideas', JSON.stringify(l.slice(-300))); return r ?? l; });
export async function ideaAdd(env, who, text) {
  text = String(text || '').trim().slice(0, 1500); if (text.length < 3) return { error: 'Напишіть побажання' };
  const x = { id: crypto.randomUUID().slice(0, 8), by: who, text, at: Date.now() };
  await edit(env, l => { l.push(x); return x; });
  await logEvent(env, { k: 'shift', text: `💡 Нове побажання від ${who}: ${text.slice(0, 120)}` });
  await toHub(env, { kind: 'idea', by: who, text });
  return x;
}
export const ideaList = async (env, who, admin) => (await get(env)).filter(x => admin || x.by === who).reverse();
export const ideaDel = (env, id, who, admin) => edit(env, l => { const i = l.findIndex(x => x.id === id); if (i < 0) return { error: 'Не знайдено' }; if (!admin && l[i].by !== who) return { error: 'Можна видалити лише своє' }; l.splice(i, 1); return {}; });
export const ideaDone = (env, id, admin) => admin ? edit(env, l => { const x = l.find(x => x.id === id); if (!x) return { error: 'Не знайдено' }; x.done = x.done ? 0 : Date.now(); return x; }) : { error: 'Лише адміністратор' };
export async function ideaApi(b, env, me) {
  const admin = me.role === 'admin', ok = (x = {}) => [{ ok: true, ...x }, 200], bad = e => [{ error: e }, 400], r = x => x?.error ? bad(x.error) : ok({ x });
  switch (b.op) {
    case 'ideaAdd': return r(await ideaAdd(env, me.name, b.text));
    case 'ideaList': return ok({ list: await ideaList(env, me.name, admin) });
    case 'ideaDel': return r(await ideaDel(env, String(b.id), me.name, admin));
    case 'ideaDone': return r(await ideaDone(env, String(b.id), admin));
  }
  return bad('unknown');
}
// 🤖 бот персоналу: «побажання <текст>» — додати; «побажання» — список з кнопками
export async function ideaBot(env, text, me, admin) {
  const m = text.match(/^(?:побажання|💡 побажання|\/idea)(?:\s+([\s\S]+))?$/i); if (!m) return null;
  if (!me) return { text: '🔐 Спершу увійдіть своїм PIN' };
  if (m[1]) { const x = await ideaAdd(env, me.name, m[1]); return { text: x.error ? '⚠️ ' + x.error : '💡 Дякуємо! Побажання передано розробнику.' }; }
  return ideaBotList(env, me, admin);
}
export async function ideaBotList(env, me, admin) {
  const l = await ideaList(env, me.name, admin);
  return { text: l.length ? `💡 <b>${admin ? 'Побажання персоналу' : 'Ваші побажання'}</b>\n\n` + l.slice(0, 15).map((x, i) => `${i + 1}. ${x.done ? '✅ ' : ''}${admin ? `<b>${esc(x.by)}</b>: ` : ''}${esc(x.text.slice(0, 300))}`).join('\n\n') + '\n\n✍️ Нове: <code>побажання Ваш текст</code>' : '💡 Побажань ще немає.\n✍️ Написати: <code>побажання Ваш текст</code>',
    markup: l.length ? { inline_keyboard: l.slice(0, 15).map((x, i) => [...(admin ? [{ text: `${x.done ? '↩️' : '✅'} ${i + 1}`, callback_data: 'idd:' + x.id }] : []), { text: `🗑 ${i + 1}`, callback_data: 'idx:' + x.id }]) } : undefined };
}
