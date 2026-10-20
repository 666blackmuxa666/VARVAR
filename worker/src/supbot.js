// 🛟 Бот підтримки ATOM (вебхук /tg5). Клієнт пише боту → окрема тема в групі-форумі помічників; відповідь помічника в темі → клієнту.
// Ключ: кабінет платформи → 🚀 Продажі → 💬 Контакти → поле «Підтримка» (або секрет SUPPORT_BOT_TOKEN). Після ключа протягом години додайте бота в групу — вона стане групою підтримки.
// HUB: sup:tok, sup:chat (група), sup:arm (час підключення), sup:u:<tgId> → { t: тема, v: заклад }, sup:t:<тема> → tgId, sup:m:<повідомлення в групі без тем> → tgId
import { hub } from './hub.js';
import { KB } from './supkb.js';
export const SUP_TOKEN = /^\d{6,12}:[\w-]{30,}$/;
const call = (tok, m, b) => fetch(`https://api.telegram.org/bot${tok}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(e => ({ ok: false, description: e.message }));

export async function supSetup(env, tok) { // ключ з кабінету: перевірка, вебхук, посилання на бота в контактах
  tok = String(tok || '').trim(); if (!SUP_TOKEN.test(tok)) return { error: 'Це не схоже на ключ бота від @BotFather' };
  const me = await call(tok, 'getMe', {}); if (!me.ok) return { error: 'Telegram не прийняв ключ — скопіюйте його з @BotFather ще раз' };
  const w = await call(tok, 'setWebhook', { url: env.SELF_URL + '/tg5', secret_token: env.TG_SECRET, allowed_updates: ['message', 'my_chat_member', 'callback_query'] });
  if (!w.ok) return { error: 'Не вдалося підключити бота: ' + (w.description || '') };
  const H = hub(env); await H.supSet('tok', tok); await H.supSet('arm', Date.now());
  return { bot: me.result.username, link: 'https://t.me/' + me.result.username, chat: !!(await H.supGet('chat')) };
}

export async function supStatus(env, rearm, probe) { // 🩺 стан бота для кабінету: вебхук (лагодить сам), група, теми, права бота
  const H = hub(env), tok = env.SUPPORT_BOT_TOKEN || await H.supGet('tok'); if (!tok) return { bot: '' };
  const T = (m, b) => call(tok, m, b), me = await T('getMe', {}); if (!me.ok) return { bot: '', err: 'Telegram не приймає ключ — вставте новий з @BotFather' };
  const url = env.SELF_URL + '/tg5', w = await T('getWebhookInfo', {}); let hook = w.result?.url === url && (w.result.allowed_updates || []).includes('callback_query');
  if (!hook) hook = !!(await T('setWebhook', { url, secret_token: env.TG_SECRET, allowed_updates: ['message', 'my_chat_member', 'callback_query'] })).ok;
  if (rearm) await H.supSet('arm', Date.now());
  const r = { bot: me.result.username, hook, err: w.result?.last_error_message || '', arm: Date.now() - ((await H.supGet('arm')) || 0) < 3600e3 }; let chat = await H.supGet('chat');
  let c = chat && await T('getChat', { chat_id: chat }); const to = c && c.parameters?.migrate_to_chat_id;
  if (to) { await H.supSet('chat', chat = String(to)); c = null; } // пропущений перехід у супергрупу — лагодимо
  if (chat) { c ||= await T('getChat', { chat_id: chat }); const m = await T('getChatMember', { chat_id: chat, user_id: me.result.id });
    Object.assign(r, { chat: c.result?.title || '?', type: c.result?.type, gone: !c.ok, why: c.ok ? m.result?.status : c.description, forum: !!c.result?.is_forum, admin: m.result?.status === 'administrator', topics: !!m.result?.can_manage_topics }); }
  if (probe) { const e = []; const a = await ai(env, {}, 'Як закрити зміну?', e); r.ai = a ? '✅ ' + a.text.slice(0, 80) : '❌ ' + (e.join('; ') || 'немає ключів TEST_AI_1..3'); } // 🤖 перевірка ШІ
  return r;
}

export async function supNotify(env, text) { // сповіщення в групу помічників (загальна тема), якщо бот і група підключені
  const H = hub(env), tok = env.SUPPORT_BOT_TOKEN || await H.supGet('tok'), chat = tok && await H.supGet('chat');
  if (chat) await call(tok, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text });
  return !!chat;
}

export async function supUpdate(u, env) {
  const H = hub(env), tok = env.SUPPORT_BOT_TOKEN || await H.supGet('tok'); if (!tok) return;
  const T = (m, b) => call(tok, m, b);
  if (u.callback_query) return answer(u.callback_query, T, H, env);
  const m = u.message, mc = u.my_chat_member, gc = (m || mc)?.chat; if (!gc) return;
  let chat = await H.supGet('chat');
  const mig = m?.migrate_to_chat_id && String(gc.id) === String(chat) ? m.migrate_to_chat_id : m?.migrate_from_chat_id && String(m.migrate_from_chat_id) === String(chat) ? gc.id : 0;
  if (mig) { await H.supSet('chat', chat = String(mig)); return; } // увімкнули «Теми» → група стала супергрупою з новим id
  if (/group/.test(gc.type) && String(gc.id) !== String(chat)) { // нова група стає групою підтримки лише протягом години після ключа
    const arm = await H.supGet('arm'), inn = !mc || /member|administrator/.test(mc.new_chat_member?.status || '');
    if (arm && Date.now() - arm < 3600e3 && inn) { await H.supSet('chat', String(gc.id)); await H.supSet('arm', 0);
      await T('sendMessage', { chat_id: gc.id, text: '✅ Групу підтримки ATOM підключено.\n\n1) Налаштування групи → увімкніть «Теми».\n2) Зробіть бота адміністратором (право «Керувати темами»).\n\nКожен клієнт — окрема тема. Пишіть відповідь прямо в темі — бот перешле її клієнту. Повідомлення, що починається з //, — нотатка лише для команди.' }); }
    return;
  }
  if (!m) return;
  if (gc.type === 'private') return client(m, T, H, chat, env);
  if (String(gc.id) === String(chat) && (!m.from?.is_bot || String(m.sender_chat?.id) === String(chat))) return helper(m, T, H); // 🕶 анонімний адмін пише «від імені групи» (from — GroupAnonymousBot)
}

async function client(m, T, H, chat, env) {
  const id = m.from.id, k = 'u:' + id, s = (await H.supGet(k)) || {}, st = /^\/start(?:\s+v_([a-z0-9-]{1,40}))?/i.exec(m.text || '');
  if (st) { if (st[1]) s.v = st[1]; s.op = 0; s.h = []; await H.supSet(k, s); const c = await H.atomCfg();
    return T('sendMessage', { chat_id: id, text: `🛟 Підтримка ATOM · ${c.hrs || '9:00–22:00'}\n\nОпишіть питання — можна з фото чи скриншотом. Помічник відповість тут.` }); }
  if (!chat) return T('sendMessage', { chat_id: id, text: '🛟 Підтримка ще налаштовується. Напишіть, будь ласка, пізніше або через «Зв\'язок з ATOM» у касі.' });
  const who = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') || 'Клієнт', now = Date.now();
  if (!(s.op && now - s.op < OP_TTL)) { // 🤖 спершу відповідає ШІ; оператор — на прохання, фото, збій ШІ або «[OP]» від ШІ
    const txt = String(m.text || '').trim(), want = OP_RE.test(txt);
    if (txt && !want) { const a = await ai(env, s, txt); if (a && !a.op) { s.h = [...(s.h || []), [txt.slice(0, 400), a.text.slice(0, 600)]].slice(-6); await H.supSet(k, s);
      return T('sendMessage', { chat_id: id, text: a.text, reply_markup: { inline_keyboard: [[{ text: '👤 Покликати оператора', callback_data: 'op' }]] } }); } }
    return toOp(m, T, H, chat, env, s, who); }
  s.op = now; await H.supSet(k, s);
  for (let i = 0; i < 2; i++) {
    if (!s.t) { const t = await T('createForumTopic', { chat_id: chat, name: `${who}${s.v ? ' · ' + s.v : ''}`.slice(0, 120) });
      if (!t.ok) return flat(m, T, H, chat, who, s); // без «Тем» — просто в групу, відповідь через «Відповісти»
      s.t = t.result.message_thread_id; await H.supSet(k, s); await H.supSet('t:' + s.t, id);
      await T('sendMessage', { chat_id: chat, message_thread_id: s.t, text: `👤 ${who}${m.from.username ? ' @' + m.from.username : ''}\n🏪 Заклад: ${s.v || 'не вказано'}` }); }
    const r = await fwd(T, m, { chat_id: chat, message_thread_id: s.t });
    if (r.ok) return; if (!/thread|topic/i.test(r.description || '')) break; s.t = 0; // тему видалили — нова
  }
  return T('sendMessage', { chat_id: id, text: '⚠️ Не вдалося передати повідомлення. Спробуйте ще раз за хвилину.' });
}

const OP_TTL = 12 * 3600e3, OP_RE = /оператор|людин|живий|менеджер|адміністратор|консультант|operator|human|\/op\b/i;
async function ai(env, s, txt, e = []) { // Groq (ключі TEST_AI_1..3 по черзі) з базою знань; null — збій
  const keys = [1, 2, 3].map(n => env['TEST_AI_' + n]).filter(Boolean); if (!keys.length) return null;
  const c = await hub(env).atomCfg(), sys = `Ти — помічник підтримки ATOM (каса й кабінет для кафе/ресторанів, posatom.online). Відповідай коротко (до 600 символів), мовою клієнта, дружньо, без вигадок — лише з бази знань нижче. Пиши кроки 1-2-3, якщо питають «як». Якщо відповіді в базі немає, проблема з грошима, оплатою, збоєм, помилкою, доступом, або клієнт роздратований — НЕ вигадуй, а відповідь почни з «[OP]» і коротко скажи, що передаєш оператору. Години роботи операторів: ${c.hrs || '9:00–22:00'}.\n\n${KB}`;
  const msgs = [{ role: 'system', content: sys }, ...(s.h || []).flatMap(([q, a]) => [{ role: 'user', content: q }, { role: 'assistant', content: a }]), { role: 'user', content: txt.slice(0, 1500) }];
  for (let i = 0, o = Math.floor(Math.random() * keys.length); i < keys.length; i++) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(20000), headers: { authorization: 'Bearer ' + keys[(o + i) % keys.length], 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', reasoning_effort: 'low', temperature: 0.3, max_tokens: 700, messages: msgs }) }).catch(() => null);
    if (!r?.ok) { e.push(r ? r.status + ' ' + (await r.text().catch(() => '')).slice(0, 120) : 'тайм-аут'); continue; } const a = String((await r.json().catch(() => ({}))).choices?.[0]?.message?.content || '').trim(); if (!a) continue;
    return { op: /^\[OP\]/i.test(a), text: a.replace(/^\[OP\]\s*/i, '').replace(/\*\*/g, '').slice(0, 1500) };
  }
  return null;
}

async function toOp(m, T, H, chat, env, s, who) { // 🙋 клієнт → оператор: ШІ замовкає на 12 год, гучне сповіщення в групу з історією
  const id = m.from.id; s.op = Date.now(); const h = s.h || []; s.h = []; await H.supSet('u:' + id, s);
  const c = await H.atomCfg();
  await T('sendMessage', { chat_id: id, text: `👤 Передав оператору — відповімо тут${c.hrs ? ' (' + c.hrs + ')' : ''}. Можете дописати деталі чи скриншот.` });
  if (h.length) await T('sendMessage', { chat_id: chat, ...(s.t ? { message_thread_id: s.t } : {}), text: `🙋 ${who} просить оператора. Розмова з ШІ:\n\n` + h.map(([q, a]) => `👤 ${q}\n🤖 ${a}`).join('\n\n').slice(0, 3500) });
  return client({ ...m, _op: 1 }, T, H, chat, env);
}

const fwd = (T, m, b) => m._btn ? T('sendMessage', { ...b, text: '🙋 Натиснув «Покликати оператора»' }) : T('copyMessage', { ...b, from_chat_id: m.from.id, message_id: m.message_id });

async function flat(m, T, H, chat, who, s) { // група без тем: картка клієнта + його повідомлення; «Відповісти» на будь-яке з них → клієнту
  const id = m.from.id, tag = '#' + (who.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 20) || 'клієнт') + '_' + String(id).slice(-4); // мітка: тап → усе листування з цим клієнтом
  const h = await T('sendMessage', { chat_id: chat, text: `👤 ${who}${m.from.username ? ' @' + m.from.username : ''} · 🏪 ${s.v || 'заклад не вказано'}\n${tag}` });
  const r = await fwd(T, m, { chat_id: chat, reply_markup: { inline_keyboard: [[{ text: '↩️ Відповісти ' + who.slice(0, 30), callback_data: 'r:' + id }]] } });
  for (const x of [h, r]) if (x.ok) await H.supSet('m:' + x.result.message_id, id);
  if (!r.ok) return T('sendMessage', { chat_id: id, text: '⚠️ Не вдалося передати повідомлення. Спробуйте ще раз за хвилину.' });
}

async function answer(q, T, H, env) { // «↩️ Відповісти»: одне натискання — поле відповіді вже відкрите саме цьому клієнту
  if (q.data === 'op' && q.message?.chat?.type === 'private') { await T('answerCallbackQuery', { callback_query_id: q.id }); const chat = await H.supGet('chat'), s = (await H.supGet('u:' + q.from.id)) || {};
    if (!chat) return; return toOp({ from: q.from, chat: q.message.chat, text: '🙋 Покликати оператора', message_id: 0, _btn: 1 }, T, H, chat, env, s, [q.from.first_name, q.from.last_name].filter(Boolean).join(' ') || 'Клієнт'); }
  const uid = /^r:(\d+)$/.exec(q.data || '')?.[1], chat = q.message?.chat?.id; if (!uid || String(chat) !== String(await H.supGet('chat'))) return T('answerCallbackQuery', { callback_query_id: q.id });
  const name = q.from.first_name || 'Помічник', who = (q.message.reply_markup?.inline_keyboard?.[0]?.[0]?.text || '').replace('↩️ Відповісти ', '') || 'клієнту';
  const p = await T('sendMessage', { chat_id: chat, reply_to_message_id: q.message.message_id, text: `✍️ ${name}, пишіть відповідь для ${who}:`, entities: [{ type: 'text_mention', offset: 3, length: name.length, user: q.from }], reply_markup: { force_reply: true, selective: true, input_field_placeholder: 'Відповідь для ' + who.slice(0, 40) } });
  if (p.ok) await H.supSet('m:' + p.result.message_id, { u: +uid, p: 1 });
  return T('answerCallbackQuery', { callback_query_id: q.id, text: p.ok ? '✍️ Пишіть відповідь' : '⚠️ ' + (p.description || 'помилка') });
}

const opOn = async (H, uid) => { const s = (await H.supGet('u:' + uid)) || {}; s.op = Date.now(); await H.supSet('u:' + uid, s); }; // оператор пише — ШІ мовчить

async function helper(m, T, H) {
  const rp = !m.is_topic_message && m.reply_to_message; // група без тем: відповідь на повідомлення бота
  if (rp) { if (!rp.from?.is_bot || /^\/\//.test(m.text || m.caption || '')) return; const v = await H.supGet('m:' + rp.message_id), uid = v?.u || v; if (!uid) return;
    const r = await T('copyMessage', { chat_id: uid, from_chat_id: m.chat.id, message_id: m.message_id }); if (r.ok) await opOn(H, uid);
    if (r.ok && v?.p) { await T('deleteMessage', { chat_id: m.chat.id, message_id: rp.message_id }); await H.supSet('m:' + rp.message_id, null); } // підказку «пишіть відповідь» прибираємо
    return T('sendMessage', { chat_id: m.chat.id, reply_to_message_id: m.message_id, text: r.ok ? '✅ Надіслано' : '⚠️ Не доставлено: ' + (r.description || 'помилка') }); }
  const t = m.is_topic_message && m.message_thread_id; if (!t || m.forum_topic_created || m.forum_topic_edited || m.forum_topic_closed || m.forum_topic_reopened) return; // загальна тема — розмова команди
  if (/^\/\//.test(m.text || m.caption || '')) return; // // нотатка для своїх
  const uid = await H.supGet('t:' + t); if (!uid) return;
  const r = await T('copyMessage', { chat_id: uid, from_chat_id: m.chat.id, message_id: m.message_id }); if (r.ok) await opOn(H, uid);
  if (!r.ok) await T('sendMessage', { chat_id: m.chat.id, message_thread_id: t, text: '⚠️ Не доставлено: ' + (r.description || 'помилка') });
}
