// 🛟 Бот підтримки ATOM (вебхук /tg5). Клієнт пише боту → окрема тема в групі-форумі помічників; відповідь помічника в темі → клієнту.
// Ключ: кабінет платформи → 🚀 Продажі → 💬 Контакти → поле «Підтримка» (або секрет SUPPORT_BOT_TOKEN). Після ключа протягом години додайте бота в групу — вона стане групою підтримки.
// HUB: sup:tok, sup:chat (група), sup:arm (час підключення), sup:u:<tgId> → { t: тема, v: заклад }, sup:t:<тема> → tgId, sup:m:<повідомлення в групі без тем> → tgId
import { hub } from './hub.js';
export const SUP_TOKEN = /^\d{6,12}:[\w-]{30,}$/;
const call = (tok, m, b) => fetch(`https://api.telegram.org/bot${tok}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json()).catch(e => ({ ok: false, description: e.message }));

export async function supSetup(env, tok) { // ключ з кабінету: перевірка, вебхук, посилання на бота в контактах
  tok = String(tok || '').trim(); if (!SUP_TOKEN.test(tok)) return { error: 'Це не схоже на ключ бота від @BotFather' };
  const me = await call(tok, 'getMe', {}); if (!me.ok) return { error: 'Telegram не прийняв ключ — скопіюйте його з @BotFather ще раз' };
  const w = await call(tok, 'setWebhook', { url: env.SELF_URL + '/tg5', secret_token: env.TG_SECRET, allowed_updates: ['message', 'my_chat_member'] });
  if (!w.ok) return { error: 'Не вдалося підключити бота: ' + (w.description || '') };
  const H = hub(env); await H.supSet('tok', tok); await H.supSet('arm', Date.now());
  return { bot: me.result.username, link: 'https://t.me/' + me.result.username, chat: !!(await H.supGet('chat')) };
}

export async function supStatus(env, rearm) { // 🩺 стан бота для кабінету: вебхук (лагодить сам), група, теми, права бота
  const H = hub(env), tok = env.SUPPORT_BOT_TOKEN || await H.supGet('tok'); if (!tok) return { bot: '' };
  const T = (m, b) => call(tok, m, b), me = await T('getMe', {}); if (!me.ok) return { bot: '', err: 'Telegram не приймає ключ — вставте новий з @BotFather' };
  const url = env.SELF_URL + '/tg5', w = await T('getWebhookInfo', {}); let hook = w.result?.url === url;
  if (!hook) hook = !!(await T('setWebhook', { url, secret_token: env.TG_SECRET, allowed_updates: ['message', 'my_chat_member'] })).ok;
  if (rearm) await H.supSet('arm', Date.now());
  const r = { bot: me.result.username, hook, err: w.result?.last_error_message || '', arm: Date.now() - ((await H.supGet('arm')) || 0) < 3600e3 }; let chat = await H.supGet('chat');
  let c = chat && await T('getChat', { chat_id: chat }); const to = c && c.parameters?.migrate_to_chat_id;
  if (to) { await H.supSet('chat', chat = String(to)); c = null; } // пропущений перехід у супергрупу — лагодимо
  if (chat) { c ||= await T('getChat', { chat_id: chat }); const m = await T('getChatMember', { chat_id: chat, user_id: me.result.id });
    Object.assign(r, { chat: c.result?.title || '?', type: c.result?.type, gone: !c.ok, why: c.ok ? m.result?.status : c.description, forum: !!c.result?.is_forum, admin: m.result?.status === 'administrator', topics: !!m.result?.can_manage_topics }); }
  return r;
}

export async function supNotify(env, text) { // сповіщення в групу помічників (загальна тема), якщо бот і група підключені
  const H = hub(env), tok = env.SUPPORT_BOT_TOKEN || await H.supGet('tok'), chat = tok && await H.supGet('chat');
  if (chat) await call(tok, 'sendMessage', { chat_id: chat, parse_mode: 'HTML', text });
  return !!chat;
}

export async function supUpdate(u, env) {
  const H = hub(env), tok = env.SUPPORT_BOT_TOKEN || await H.supGet('tok'); if (!tok) return;
  const T = (m, b) => call(tok, m, b), m = u.message, mc = u.my_chat_member, gc = (m || mc)?.chat; if (!gc) return;
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
  if (gc.type === 'private') return client(m, T, H, chat);
  if (String(gc.id) === String(chat) && !m.from?.is_bot) return helper(m, T, H);
}

async function client(m, T, H, chat) {
  const id = m.from.id, k = 'u:' + id, s = (await H.supGet(k)) || {}, st = /^\/start(?:\s+v_([a-z0-9-]{1,40}))?/i.exec(m.text || '');
  if (st) { if (st[1]) { s.v = st[1]; await H.supSet(k, s); } const c = await H.atomCfg();
    return T('sendMessage', { chat_id: id, text: `🛟 Підтримка ATOM · ${c.hrs || '9:00–22:00'}\n\nОпишіть питання — можна з фото чи скриншотом. Помічник відповість тут.` }); }
  if (!chat) return T('sendMessage', { chat_id: id, text: '🛟 Підтримка ще налаштовується. Напишіть, будь ласка, пізніше або через «Зв\'язок з ATOM» у касі.' });
  const who = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') || 'Клієнт';
  for (let i = 0; i < 2; i++) {
    if (!s.t) { const t = await T('createForumTopic', { chat_id: chat, name: `${who}${s.v ? ' · ' + s.v : ''}`.slice(0, 120) });
      if (!t.ok) return flat(m, T, H, chat, who, s); // без «Тем» — просто в групу, відповідь через «Відповісти»
      s.t = t.result.message_thread_id; await H.supSet(k, s); await H.supSet('t:' + s.t, id);
      await T('sendMessage', { chat_id: chat, message_thread_id: s.t, text: `👤 ${who}${m.from.username ? ' @' + m.from.username : ''}\n🏪 Заклад: ${s.v || 'не вказано'}` }); }
    const r = await T('copyMessage', { chat_id: chat, message_thread_id: s.t, from_chat_id: id, message_id: m.message_id });
    if (r.ok) return; if (!/thread|topic/i.test(r.description || '')) break; s.t = 0; // тему видалили — нова
  }
  return T('sendMessage', { chat_id: id, text: '⚠️ Не вдалося передати повідомлення. Спробуйте ще раз за хвилину.' });
}

async function flat(m, T, H, chat, who, s) { // група без тем: картка клієнта + його повідомлення; «Відповісти» на будь-яке з них → клієнту
  const id = m.from.id, h = await T('sendMessage', { chat_id: chat, text: `👤 ${who}${m.from.username ? ' @' + m.from.username : ''} · 🏪 ${s.v || 'заклад не вказано'}\n↩️ Щоб відповісти — «Відповісти» на повідомлення нижче` });
  const r = await T('copyMessage', { chat_id: chat, from_chat_id: id, message_id: m.message_id });
  for (const x of [h, r]) if (x.ok) await H.supSet('m:' + x.result.message_id, id);
  if (!r.ok) return T('sendMessage', { chat_id: id, text: '⚠️ Не вдалося передати повідомлення. Спробуйте ще раз за хвилину.' });
}

async function helper(m, T, H) {
  const rp = !m.is_topic_message && m.reply_to_message; // група без тем: відповідь на повідомлення бота
  if (rp) { if (!rp.from?.is_bot || /^\/\//.test(m.text || m.caption || '')) return; const uid = await H.supGet('m:' + rp.message_id); if (!uid) return;
    const r = await T('copyMessage', { chat_id: uid, from_chat_id: m.chat.id, message_id: m.message_id });
    return T('sendMessage', { chat_id: m.chat.id, reply_to_message_id: m.message_id, text: r.ok ? '✅ Надіслано' : '⚠️ Не доставлено: ' + (r.description || 'помилка') }); }
  const t = m.is_topic_message && m.message_thread_id; if (!t || m.forum_topic_created || m.forum_topic_edited || m.forum_topic_closed || m.forum_topic_reopened) return; // загальна тема — розмова команди
  if (/^\/\//.test(m.text || m.caption || '')) return; // // нотатка для своїх
  const uid = await H.supGet('t:' + t); if (!uid) return;
  const r = await T('copyMessage', { chat_id: uid, from_chat_id: m.chat.id, message_id: m.message_id });
  if (!r.ok) await T('sendMessage', { chat_id: m.chat.id, message_thread_id: t, text: '⚠️ Не доставлено: ' + (r.description || 'помилка') });
}
