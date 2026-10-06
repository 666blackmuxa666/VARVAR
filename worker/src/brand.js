// 🎨 Оформлення трьох Telegram-ботів: аватар з емблемою (img/bots/*.png), ім'я, опис, команди.
// Виконується один раз на версію (ключ brand:<V>) з Cron. Змінили картинки/тексти — підніміть V.
const V = 'v1', IMG = 'https://666blackmuxa666.github.io/VARVAR/img/bots/';
const BOTS = [
  { tok: 'BOT_TOKEN', img: 'staff', name: 'Varvar · Команда 🧑‍🍳', short: '🧑‍🍳 Робочий бот персоналу Varvar: столи, кухня, зміни, склад.', desc: '🧑‍🍳 Бот команди Varvar Food Bar.\n\nЗамовлення й столи, кухня, зміни й зарплата, склад, броні, звіти.\n\n🔐 Вхід — ваш PIN з каси.' },
  { tok: 'GUEST_BOT_TOKEN', img: 'guest', name: 'Varvar Food Bar 🍔', short: '🍔 Замовлення, бонуси, броні й сертифікати Varvar — Буковель.', desc: '🍔 Varvar Food Bar · Поляниця (Буковель)\n\n• замовлення з собою й доставка\n• 🎁 бонуси й статус замовлення\n• 📅 броні та 🎟 сертифікати\n• 💬 зв\'язок з адміністратором\n\nНатисніть «Почати» 👇', cmds: [{ command: 'start', description: '📱 Меню' }, { command: 'menu', description: '📱 Меню' }] },
  { tok: 'COURIER_BOT_TOKEN', img: 'courier', name: 'Varvar · Доставка 🛵', short: '🛵 Бот кур\'єрів Varvar: нові доставки, маршрут, видача.', desc: '🛵 Бот кур\'єрів Varvar Food Bar.\n\nНові доставки, «Беру», маршрут, час прибуття, видача й готівка.\n\n🔐 Вхід — ваш код кур\'єра.' },
];
const call = (tok, m, body) => fetch(`https://api.telegram.org/bot${tok}/${m}`, body instanceof FormData ? { method: 'POST', body } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(e => ({ ok: false, description: e.message }));
export async function brandBots(env, force) {
  if ((await import('./venue.js')).venueId() !== 'varvar') return null; // 🏪 картинки й імена — VARVAR; інші заклади — майстер запуску (етап 3)
  if (!force && await env.DB.get('brand:' + V)) return null;
  const err = await env.DB.get('brandErr', 'json'); if (!force && err && Date.now() - err.at < 3600e3) return null; // повтор не частіше ніж раз на годину
  const out = {};
  for (const b of BOTS) {
    const tok = env[b.tok]; if (!tok) { out[b.img] = 'немає токена'; continue; }
    const r = [];
    r.push((await call(tok, 'setMyName', { name: b.name })).ok);
    r.push((await call(tok, 'setMyShortDescription', { short_description: b.short })).ok);
    r.push((await call(tok, 'setMyDescription', { description: b.desc })).ok);
    if (b.cmds) r.push((await call(tok, 'setMyCommands', { commands: b.cmds })).ok);
    const png = await fetch(IMG + b.img + '.png?' + V).then(x => x.ok ? x.arrayBuffer() : null).catch(() => null);
    if (png) { const fd = new FormData(); fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://p' })); fd.append('p', new Blob([png], { type: 'image/png' }), b.img + '.png'); const x = await call(tok, 'setMyProfilePhoto', fd); r.push(x.ok || x.description); }
    out[b.img] = r;
  }
  if (Object.values(out).every(r => Array.isArray(r) && r.every(x => x === true))) await env.DB.put('brand:' + V, JSON.stringify(out));
  else await env.DB.put('brandErr', JSON.stringify({ at: Date.now(), out }), { expirationTtl: 7 * 86400 });
  return out;
}

// 🏪 оформлення ботів іншого закладу: назва з «🏪 Заклад», аватарка — його логотип (той самий для трьох, різняться назвами)
export async function brandVenue(env) {
  const { getSite } = await import('./site.js'), s = await getSite(env), n = (s.name || 'Заклад').slice(0, 40), out = {};
  const m = String(s.logo || '').match(/\/img\/([\w-]+)/), png = m ? await env.DB.get('img:' + m[1], 'arrayBuffer') : null;
  const L = [
    { tok: env.BOT_TOKEN, k: 'staff', name: `${n} · Команда 🧑‍🍳`, short: `🧑‍🍳 Робочий бот персоналу ${n}: столи, кухня, зміни, склад.`, desc: `🧑‍🍳 Бот команди ${n}.\n\nЗамовлення й столи, кухня, зміни й зарплата, склад, броні, звіти.\n\n🔐 Вхід — ваш PIN з каси.` },
    { tok: env.GUEST_BOT_TOKEN, k: 'guest', name: n, short: `Замовлення, бонуси, броні й сертифікати ${n}.`, desc: `${n}${s.addr ? ' · ' + s.addr : ''}\n\n• замовлення з собою й доставка\n• 🎁 бонуси й статус замовлення\n• 📅 броні та 🎟 сертифікати\n• 💬 зв'язок з адміністратором\n\nНатисніть «Почати» 👇`, cmds: [{ command: 'start', description: '📱 Меню' }, { command: 'menu', description: '📱 Меню' }] },
    { tok: env.COURIER_BOT_TOKEN, k: 'courier', name: `${n} · Доставка 🛵`, short: `🛵 Бот кур'єрів ${n}: нові доставки, маршрут, видача.`, desc: `🛵 Бот кур'єрів ${n}.\n\nНові доставки, «Беру», маршрут, час прибуття, видача й готівка.\n\n🔐 Вхід — ваш код кур'єра.` },
  ];
  for (const b of L) {
    if (!b.tok) continue; const r = [];
    r.push((await call(b.tok, 'setMyName', { name: b.name.slice(0, 64) })).ok);
    r.push((await call(b.tok, 'setMyShortDescription', { short_description: b.short.slice(0, 120) })).ok);
    r.push((await call(b.tok, 'setMyDescription', { description: b.desc.slice(0, 512) })).ok);
    if (b.cmds) r.push((await call(b.tok, 'setMyCommands', { commands: b.cmds })).ok);
    if (png) { const fd = new FormData(); fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://p' })); fd.append('p', new Blob([png], { type: 'image/png' }), 'logo.png'); const x = await call(b.tok, 'setMyProfilePhoto', fd); r.push(x.ok || x.description); }
    out[b.k] = r.every(x => x === true) ? 'ok' : r.filter(x => x !== true).join('; ') || 'частково';
  }
  return { ok: true, out, logo: !!png };
}
