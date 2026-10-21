// 👑 Кабінет власника мережі й консоль платформи: /api/owner (поза закладом) + внутрішні виклики закладів /__int/* (всередині Store).
// Власник бачить лише свої заклади (acct.venues); роль platform — усі. Цифри рахує кожен заклад сам (venueSum) — завжди точні.
import { hub } from './hub.js';
import { MAIN, doName, isVenueId, saveSecrets, getSecrets } from './venue.js';
import { L } from './ops-core.js';
import { tg } from './ops.js';
import { mailOn, sendMail, ownerLink } from './mail.js';
import { reportRange, openTables, dayKey, getCfg, payable } from './ops.js';
import { getAtt } from './pay.js';
import { printStatus } from './print.js';

const enc = new TextEncoder();
export async function intSecret(env) { // секрет внутрішніх викликів «кабінет → заклад»
  const k = await crypto.subtle.importKey('raw', enc.encode(env.MASTER_KEY || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode('int')))].map(x => x.toString(16).padStart(2, '0')).join('');
}
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

// виклик закладу зсередини воркера
export async function callVenue(env, venue, path, body, init) {
  const h = { 'content-type': 'application/json', 'x-int': await intSecret(env), ...(venue === MAIN ? {} : { 'x-venue': venue }), ...(init ? { 'x-venue-init': '1' } : {}) };
  const r = await env.STORE.get(env.STORE.idFromName(doName(venue))).fetch(new Request('https://in' + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}) }));
  return r.json();
}

// 📱 демо ATOM: адмін-сесія без PIN; заклад atom-demo щоночі повертається до еталону (save — зберегти еталон, reset — повернути)
const hx = t => String(t ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); // екранування для Telegram HTML
export const demoLogin = (env, id) => callVenue(env, id, '/__int/login', { name: 'Гість демо' });
export const demoSnap = (env, id, op) => callVenue(env, id, '/__int/demosnap', { do: op }).catch(e => ({ error: e.message }));

// ---------- усередині закладу ----------
export async function intApi(req, env, path) {
  if (!env.INSTORE || !env.MASTER_KEY || req.headers.get('x-int') !== await intSecret(env)) return [{ error: 'no' }, 403];
  const b = await req.json().catch(() => ({}));
  if (path === '/__int/init') { // новий заклад: позначка + випадкові коди реєстрації (не 1119!)
    if (await env.DB.get('cfg:venue')) return [{ error: 'Заклад уже створено' }, 400];
    const codes = {}; for (const r of ['admin', 'waiter', 'cook', 'courier']) { let c; do c = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)); while (Object.values(codes).includes(c)); codes[r] = c; await env.DB.put('reg_' + r, c); }
    await env.DB.put('cfg:venue', JSON.stringify({ id: env.VENUE, name: String(b.name || ''), at: Date.now() }));
    { const c = (await env.DB.get('cfg', 'json')) || {}; if (!c.mods) { c.mods = {}; await env.DB.put('cfg', JSON.stringify(c)); } } // 🧩 новий заклад — лише каса; модулі вмикає власник
    await env.DB.put('menu', JSON.stringify({ categories: [] })); // не меню VARVAR за замовчуванням
    await saveSecrets(env, { PRINT_KEY: rnd(16) }); // свій ключ програми друку
    await (await import('./backup.js')).backupNow(env).catch(() => {}); // 💾 перша копія одразу
    await env.DB.put('site', JSON.stringify({ name: String(b.name || 'Новий заклад'), tagline: '', about: '', phone: '', addr: '', from: '10:00', to: '22:00', insta: '', tg: '', gmaps: '', geo: null, rating: 0, ratingN: 0, reviewsUrl: '', quotes: [], promos: [], photos: [], hero: '' }));
    return [{ ok: true, codes }, 200];
  }
  if (path === '/__int/login') { // власник заходить у касу закладу без PIN — сесія адміна «👑 Ім'я»
    if (env.VENUE === 'atom-demo' && !((await env.DB.get('site', 'json')) || {}).logo) await (await import('./demoseed.js')).demoArt(env).catch(() => {}); // 🎨 демо без картинок → накласти одразу
    const token = rnd(16), me = { name: '👑 ' + String(b.name || 'Власник').slice(0, 40), role: 'admin', owner: String(b.email || '') };
    await env.DB.put('pos:' + token, JSON.stringify({ ...me, at: Date.now() }), { expirationTtl: 12 * 3600 });
    return [{ ok: true, token, me }, 200];
  }
  if (path === '/__int/demosnap' && env.VENUE === 'atom-demo') { const B = await import('./backup.js');
    if (b.do === 'save') return [await B.backupNow(env, 'demo'), 200];
    const S = await import('./demoseed.js');
    if (b.do === 'seed') { const r = await S.demoSeed(env, { full: true }); if (r.error) return [r, 400]; await B.backupNow(env, 'demo'); return [r, 200]; } // 🎬 «Все за 500»: меню, персонал, сайт + 14 днів історії → еталон
    if (b.do === 'reset') { const r = await B.backupRestore(env, 'demo', 'нічне скидання демо'); return [{ ...r, seed: await S.demoSeed(env, { full: !!r.error }) }, 200]; } // еталон + свіжа історія «до сьогодні»
    return [{ error: 'unknown' }, 400]; }
  if (path === '/__int/payer') { const { payerBind } = await import('./ledger.js'); const r = await payerBind(env, b.id ? { id: b.id, n: b.n } : null, String(b.who || '').slice(0, 60)); return [{ payer: r.payer, year: r.sent || null }, 200]; } // 🧾 Ф2: заклад ← платник
  if (path === '/__int/aibal') { const { aiBal } = await import('./photoai.js'); return [await aiBal(env), 200]; } // 🤖 баланс ШІ
  if (path === '/__int/aitop') { const sum = Math.round(+b.sum || 0); if (!(sum > 0)) return [{ error: 'sum' }, 400];
    const a = await env.DB.locked('aibal', async () => { const x = (await env.DB.get('aibal', 'json')) || { bal: 0, h: [] }; if (x.h.some(h => h.lp && h.lp === b.lp)) return x; x.bal = Math.round((x.bal + sum) * 100) / 100; x.h = [{ ts: Date.now(), sum, what: '💳 Поповнення LiqPay', lp: String(b.lp || ''), ...(b.test ? { test: 1 } : {}) }, ...x.h].slice(0, 200); await env.DB.put('aibal', JSON.stringify(x)); return x; });
    return [a, 200]; }
  if (path === '/__int/msgIn') { const r = await (await import('./ideas.js')).thrIn(env, String(b.hid || ''), String(b.text || '')); return [r, r.error ? 404 : 200]; } // 💬 відповідь ATOM у зверненні
  if (path === '/__int/lock') { if (b.on) await env.DB.put('cfg:lock', JSON.stringify({ why: String(b.why || 'sub'), at: Date.now() })); else await env.DB.delete('cfg:lock'); return [{ ok: true }, 200]; } // ⛔ підписка не оплачена — лише перегляд
  if (path === '/__int/whoami') { const s = /^[a-f0-9]{32}$/.test(b.token || '') ? await env.DB.get('pos:' + b.token, 'json') : null; return [{ admin: s?.role === 'admin', name: s?.name || '' }, 200]; }
  if (path === '/__int/secrets') { // 🤖 токени ботів закладу → перевірка getMe, збереження, вебхуки
    if (env.VENUE === MAIN) return [{ error: 'VARVAR — секрети через wrangler' }, 400];
    const f = {}, names = {};
    for (const [k, nm] of [['BOT_TOKEN', 'staff'], ['GUEST_BOT_TOKEN', 'guest'], ['COURIER_BOT_TOKEN', 'courier']]) {
      const v = b[k]; if (v == null) continue; if (v === '') { f[k] = ''; continue; }
      if (!/^\d{6,12}:[\w-]{30,60}$/.test(String(v).trim())) return [{ error: `Токен ${nm}: невірний формат` }, 400];
      const me = await fetch(`https://api.telegram.org/bot${String(v).trim()}/getMe`).then(r => r.json()).catch(() => null);
      if (!me?.ok) return [{ error: `Токен ${nm}: Telegram не приймає` }, 400]; f[k] = String(v).trim(); names[nm] = me.result.username;
    }
    if (b.CHAT_ID != null) f.CHAT_ID = String(b.CHAT_ID);
    if (b.PAY_PROVIDER != null) { if (!['liqpay', 'mono'].includes(b.PAY_PROVIDER)) return [{ error: 'Невідома платіжна система' }, 400]; f.PAY_PROVIDER = b.PAY_PROVIDER === 'mono' ? 'mono' : ''; } // 💳 вибір платіжної системи
    if (b.MONO_TOKEN === '') f.MONO_TOKEN = '';
    else if (b.MONO_TOKEN != null) { // 💳 monobank: токен X-Token з web.monobank.ua — перевіряємо запитом «details»
      const tok = String(b.MONO_TOKEN).trim(); if (!/^[\w-]{10,80}$/.test(tok)) return [{ error: 'Токен monobank: невірний формат' }, 400];
      const M = await import('./mono.js'), r = await M.monoCheck({ mono: 1, token: tok, sandbox: /^mono_test_/.test(tok) });
      if (r.error) return [{ error: 'monobank не приймає токен: ' + r.error }, 400]; f.MONO_TOKEN = tok; f.PAY_PROVIDER = 'mono'; }
    for (const [k, nm] of [['MONO_BANK', 'mono'], ['PRIVAT_BANK', 'privat']]) { // 🔄 виписки автоматично: особистий токен mono (рахунки ФОП) / токен Автоклієнта Приват — перевіряємо одразу
      if (b[k] == null) continue; const A = await import('./bankapi.js');
      if (b[k] === '') { if (k === 'MONO_BANK') await A.monoOff((await getSecrets(env)).MONO_BANK); f[k] = ''; continue; }
      const tok = String(b[k]).trim(); if (!A.tokOk[nm](tok)) return [{ error: `Токен ${nm === 'mono' ? 'monobank' : 'Автоклієнта'}: невірний формат` }, 400];
      const r = nm === 'mono' ? await A.monoSetup(env, tok) : await A.privatCheck(tok); if (r.error) return [{ error: r.error }, 400]; f[k] = tok; if (nm === 'mono') f._mono = r.acc; else f._priv = 1; }
    if (b.CHECKBOX_LICENSE === '') { f.CHECKBOX_LICENSE = ''; f.CHECKBOX_PIN = ''; f.CHECKBOX_MORE = ''; await env.DB.delete('fis:tok'); } // 🧾 відключити ПРРО (усі каси)
    if (b.FOP || b.FOP_DEL || b.FIS_IB != null) { // 🏪 ФОП / каси: опис (назва, група, ліміт, дохід до підключення, розділи меню) + ключі другої/третьої каси
      const F = await import('./fiscal.js'), cur = await getSecrets(env), meta = F.fopMeta({ FOPS: cur.FOPS }), more = F.fopMeta({ FOPS: cur.CHECKBOX_MORE });
      if (!cur.CHECKBOX_LICENSE && (b.FOP || b.FOP_DEL)) return [{ error: 'Спершу підключіть головну касу Checkbox' }, 400];
      if (b.FIS_IB != null) meta.ib = b.FIS_IB ? 1 : 0;
      if (b.FOP_DEL) { const k = String(b.FOP_DEL); if (k === 'a') return [{ error: 'Головну касу відключають кнопкою «Відключити ПРРО»' }, 400]; delete meta[k]; delete more[k]; await env.DB.delete('fis:tok:' + k); }
      if (b.FOP) { const p = b.FOP, k = p.k ? String(p.k) : ['b', 'c', 'd', 'e'].find(z => !more[z]); if (!/^[a-e]$/.test(k || '')) return [{ error: 'Не більше 5 кас' }, 400];
        if (k !== 'a' && !more[k] && !p.lic) return [{ error: 'Потрібні ключ ліцензії каси й PIN касира' }, 400];
        if (p.lic) { const lic = String(p.lic).trim(), pin = String(p.pin || '').trim(); if (k === 'a') return [{ error: 'Ключі головної каси — у формі вище' }, 400];
          if (!/^[\w-]{6,80}$/.test(lic) || !/^\w{3,20}$/.test(pin)) return [{ error: 'Checkbox: потрібні ключ ліцензії каси й PIN касира' }, 400];
          if (lic === cur.CHECKBOX_LICENSE || Object.entries(more).some(([z, c]) => z !== k && c.lic === lic)) return [{ error: 'Ця каса вже підключена' }, 400];
          const r = await F.fisCheck(env, lic, pin); if (r.error) return [{ error: r.error }, 400]; more[k] = { lic, pin }; names.kasa = r.title + (r.test ? ' (тестова)' : ''); await env.DB.delete('fis:tok:' + k); }
        const cats = Array.isArray(p.cats) ? [...new Set(p.cats.map(String))].slice(0, 60) : meta[k]?.cats || [];
        if (k !== 'a') for (const [z, m] of Object.entries(meta)) if (z !== k && m?.cats) m.cats = m.cats.filter(c => !cats.includes(c)); // розділ — лише в одній касі
        meta[k] = { n: String(p.n ?? meta[k]?.n ?? '').trim().slice(0, 60), g: [1, 2, 3].includes(+p.g) ? +p.g : 0, lim: Math.max(0, Math.round(+p.lim || 0)), base: Math.max(0, Math.round(+p.base || 0)), ...(k !== 'a' ? { cats } : {}) }; }
      f.FOPS = JSON.stringify(meta); f.CHECKBOX_MORE = Object.keys(more).length ? JSON.stringify(more) : ''; }
    if (b.IBAN_PAY != null) { // 🏦 рахунок для оплати переказом (QR НБУ): отримувач, IBAN, ІПН/ЄДРПОУ — лише власник (не адмін каси: інакше гроші підуть не туди)
      const F = await import('./fiscal.js'), p = b.IBAN_PAY;
      if (p === '') f.IBAN_PAY = '';
      else { const iban = F.ibanOk(p.iban), ipn = String(p.ipn || '').replace(/\D/g, ''), n = String(p.n || '').trim().slice(0, 70);
        if (!iban) return [{ error: 'IBAN: має бути UA + 27 цифр (перевірте, чи без помилки)' }, 400]; if (!/^(\d{8}|\d{10})$/.test(ipn)) return [{ error: 'ІПН (10 цифр) або ЄДРПОУ (8 цифр)' }, 400]; if (n.length < 3) return [{ error: 'Отримувач: назва ФОП / ТОВ' }, 400];
        f.IBAN_PAY = JSON.stringify({ n, iban, ipn }); }
      await L(env, 'cfg', async () => { const c = (await env.DB.get('cfg', 'json')) || {}; if (f.IBAN_PAY) c.iban = 1; else delete c.iban; await env.DB.put('cfg', JSON.stringify(c)); }); } // прапорець для каси/бота (кнопка «🏦 Переказ»)
    if (b.CHECKBOX_LICENSE) { // 🧾 ПРРО Checkbox: ключ ліцензії каси + PIN касира — перевіряємо входом касира
      const lic = String(b.CHECKBOX_LICENSE).trim(), pin = String(b.CHECKBOX_PIN || '').trim();
      if (!/^[\w-]{6,80}$/.test(lic) || !/^\w{3,20}$/.test(pin)) return [{ error: 'Checkbox: потрібні ключ ліцензії каси й PIN касира' }, 400];
      const r = await (await import('./fiscal.js')).fisCheck(env, lic, pin); if (r.error) return [{ error: r.error }, 400];
      f.CHECKBOX_LICENSE = lic; f.CHECKBOX_PIN = pin; names.kasa = r.title + (r.test ? ' (тестова)' : ''); await env.DB.delete('fis:tok'); }
    if (b.LIQPAY_PUBLIC === '' && b.LIQPAY_PRIVATE === '') { f.LIQPAY_PUBLIC = ''; f.LIQPAY_PRIVATE = ''; } // 🗑 відключити LiqPay закладу
    else if (b.LIQPAY_PUBLIC != null || b.LIQPAY_PRIVATE != null) { // 💳 ключі LiqPay закладу: перевіряємо запитом статусу (неіснуючий order_id → відповідь з підписом прийнята)
      const pub = String(b.LIQPAY_PUBLIC || '').trim(), priv = String(b.LIQPAY_PRIVATE || '').trim();
      if (!/^(sandbox_)?i\d{6,20}$/.test(pub) || !/^(sandbox_)?[\w]{20,80}$/.test(priv)) return [{ error: 'Ключі LiqPay: невірний формат (public_key починається з i… або sandbox_i…)' }, 400];
      const r = await (await import('./liqpay.js')).lpApi({ pub, priv }, { action: 'status', order_id: 'check-' + Date.now() }).catch(() => null);
      if (r?.err_code === 'invalid_signature' || /public_key/i.test(r?.err_description || '')) return [{ error: 'LiqPay не приймає ці ключі' }, 400];
      f.LIQPAY_PUBLIC = pub; f.LIQPAY_PRIVATE = priv; }
    const has = await saveSecrets(env, f);
    if (f._mono || f._priv || f.MONO_BANK === '' || f.PRIVAT_BANK === '') { const A = await import('./bankapi.js'); // 🔄 рахунки mono — уже знаємо (повторний client-info за хвилину mono відхилить); Приват — перша виписка одразу
      await L(env, 'bkapi', async () => { const st = (await env.DB.get('bkapi', 'json')) || {}; if (f._mono) st.mono = { tk: A.tkOf(f.MONO_BANK), acc: f._mono, i: 0, day: '', ts: Date.now() }; if (f.MONO_BANK === '') delete st.mono; if (f.PRIVAT_BANK === '') delete st.privat; await env.DB.put('bkapi', JSON.stringify(st)); });
      if (f._priv) await A.bankApiSync({ ...env, PRIVAT_BANK: f.PRIVAT_BANK }, { force: 1, only: 'privat' }).catch(e => console.log('bankApi', e.message)); }
    if (f.BOT_TOKEN) await fetch(`https://api.telegram.org/bot${f.BOT_TOKEN}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: env.SELF_URL + '/tg', secret_token: env.TG_SECRET, allowed_updates: ['message', 'callback_query', 'my_chat_member'] }) }).catch(() => {});
    if (f.GUEST_BOT_TOKEN) await env.DB.delete('g2hook'); if (f.COURIER_BOT_TOKEN) await env.DB.delete('g3hook'); // вебхуки гостей/кур'єрів поставляться самі з новим env
    const { venueEnv } = await import('./venue.js'), e2 = { ...(await venueEnv(env, env.VENUE, env.DB)), DB: env.DB }; const br = await (await import('./brand.js')).brandVenue(e2).catch(() => null); // 🎨 одразу оформити нових ботів
    if (f.GUEST_BOT_TOKEN) await (await import('./site.js')).botName(e2).catch(() => {}); if (f.COURIER_BOT_TOKEN) await (await import('./courier.js')).courBot?.(e2).catch(() => {});
    return [{ ok: true, has, names, brand: br?.out }, 200];
  }
  if (path === '/__int/bots') { /* 🤖 справжній стан ботів: питаємо сам Telegram (getMe, getWebhookInfo, getChat) */
    const sec = env.VENUE === MAIN ? env : { ...env, ...(await getSecrets(env)) };
    const call = async (tok, m, q = {}) => { if (!tok) return null; try { const r = await fetch(`https://api.telegram.org/bot${tok}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q), signal: AbortSignal.timeout(6000) }); return await r.json(); } catch (e) { return { ok: false, description: e.message }; } };
    const one = async tok => { if (!tok) return { on: 0 }; const [me, wh] = await Promise.all([call(tok, 'getMe'), call(tok, 'getWebhookInfo')]); if (!me?.ok) return { on: 1, ok: 0, err: me?.description || 'не відповідає' };
      const w = wh?.result || {}; return { on: 1, ok: 1, user: me.result.username, name: me.result.first_name, hook: !!w.url, pending: w.pending_update_count || 0, lastErr: w.last_error_date && Date.now() / 1000 - w.last_error_date < 86400 ? w.last_error_message : '' }; };
    const [staff, guest, courier] = await Promise.all([one(sec.BOT_TOKEN), one(sec.GUEST_BOT_TOKEN), one(sec.COURIER_BOT_TOKEN)]);
    let group = { on: sec.CHAT_ID ? 1 : 0 };
    if (sec.CHAT_ID && sec.BOT_TOKEN) { const g = await call(sec.BOT_TOKEN, 'getChat', { chat_id: sec.CHAT_ID }); group = g?.ok ? { on: 1, ok: 1, title: g.result.title || g.result.first_name || '' } : { on: 1, ok: 0, err: g?.description || 'бот не бачить групу' }; }
    if (b.test && sec.CHAT_ID && sec.BOT_TOKEN) { const t = await call(sec.BOT_TOKEN, 'sendMessage', { chat_id: sec.CHAT_ID, text: '✅ Тест з кабінету власника — бот персоналу пише в цю групу.' }); return [{ sent: !!t?.ok, err: t?.ok ? '' : t?.description }, 200]; }
    return [{ staff, guest, courier, group }, 200];
  }
  if (path === '/__int/ready') { // 🚀 чек-лист запуску закладу
    const sec = env.VENUE === MAIN ? { BOT_TOKEN: env.BOT_TOKEN, GUEST_BOT_TOKEN: env.GUEST_BOT_TOKEN, COURIER_BOT_TOKEN: env.COURIER_BOT_TOKEN, CHAT_ID: env.CHAT_ID } : await getSecrets(env);
    const { getMenu } = await import('./menu.js'), { getSite } = await import('./site.js'), { getGoCfg } = await import('./delivery.js'), { getStaff } = await import('./ops.js');
    const m = await getMenu(env), s = await getSite(env), st = await getStaff(env), pr = await printStatus(env).catch(() => ({})), g = await getGoCfg(env), c = await getCfg(env);
    return [{ name: s.name, logo: !!s.logo, contacts: !!(s.phone && s.addr), items: m.categories.filter(x => !x.tech).reduce((a, x) => a + x.items.length, 0), cats: m.categories.filter(x => !x.tech).length, tables: c.tables || +env.TABLES || 15,
      staff: st.length, bots: { staff: !!sec.BOT_TOKEN, guest: !!sec.GUEST_BOT_TOKEN, courier: !!sec.COURIER_BOT_TOKEN, group: !!sec.CHAT_ID }, printer: pr.seen ? Date.now() - pr.seen < 120e3 ? 1 : 0.5 : 0, printKey: env.VENUE === MAIN ? '' : sec.PRINT_KEY || '', go: g.on ? 1 : 0, site: !!(s.about || s.hero) }, 200];
  }
  if (path === '/__int/brand') { if (env.VENUE === MAIN) return [{ error: 'VARVAR — окреме оформлення' }, 400]; return [await (await import('./brand.js')).brandVenue(env), 200]; }
  if (path === '/__int/bak') { const B = await import('./backup.js'); // 💾
    if (b.do === 'list') return [{ list: await B.backupList(env) }, 200];
    if (b.do === 'now') return [await B.backupNow(env, 'вручну-' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')), 200];
    if (b.do === 'get') { console.log('BAKGET', env.VENUE || 'main', String(b.tag).slice(0, 60), String(b.who || '').slice(0, 40)); const t = await B.backupGet(env, String(b.tag)); return t ? [{ data: t }, 200] : [{ error: 'Не знайдено' }, 404]; }
    if (b.do === 'restore') return [await B.backupRestore(env, String(b.tag), String(b.who || '')), 200];
    return [{ error: 'unknown' }, 400]; }
  if (path === '/__int/dig') { const D = await import('./digest.js'); return [b.do === 'chat' ? await D.digChat(env, b.chat) : b.do === 'now' ? (await D.digRun(env, dayKey(), false), await D.digList(env)) : await D.digList(env), 200]; }
  if (path === '/__int/an') { const { anData } = await import('./analytics.js'); const r = await anData(env, isDay(b.from) ? b.from : dayKey(), isDay(b.to) ? b.to : dayKey()); return [r, r.error ? 400 : 200]; }
  if (path === '/__int/sum') { const r = await venueSum(env, b.from, b.to); if (b.pnl) r.pnl = await pnl(env, r).catch(e => ({ error: e.message })); return [r, 200]; }
  if (path === '/__int/acc') { // 🧮 кабінет бухгалтера: стан закладу або експорт за період (лише читання)
    if (!isDay(b.from) || !isDay(b.to) || b.from > b.to || Date.parse(b.to) - Date.parse(b.from) > 370 * 864e5) return [{ error: 'Невірний період' }, 400];
    const A = await import('./acct.js'), r = b.do === 'exp' ? await A.acctExport(env, b.from, b.to) : b.do === 'file' ? await A.acctFile(env, b.from, b.to, String(b.fmt), b.no) : await A.accSum(env, b.from, b.to); return r ? [r, 200] : [{ error: 'Невірний період' }, 400]; }
  if (path === '/__int/codes') return [{ codes: Object.fromEntries(await Promise.all(['admin', 'waiter', 'cook', 'courier'].map(async r => [r, await env.DB.get('reg_' + r)]))) }, 200];
  return [{ error: 'unknown' }, 404];
}
// 📊 цифри закладу за період + «зараз»
async function venueSum(env, from, to) {
  const today = dayKey(); from = isDay(from) ? from : today; to = isDay(to) ? to : from;
  const R = await reportRange(env, from, to) || { checks: [], voids: [], removed: [], exp: [], z: [] };
  const days = {};
  for (const c of R.checks) { const d = days[c.d] ||= { rev: 0, n: 0, cash: 0, card: 0, onl: 0, tip: 0, disc: 0, go: 0, goRev: 0 }; d.rev += c.sum; d.n++; d.cash += c.cash; d.card += c.card; d.onl += c.onl || 0; d.tip += c.tip; d.disc += c.disc; if (c.go) { d.go++; d.goRev += c.sum; } }
  const tot = Object.values(days).reduce((a, d) => { for (const k in d) a[k] = (a[k] || 0) + d[k]; return a; }, { rev: 0, n: 0, cash: 0, card: 0, onl: 0, tip: 0, disc: 0, go: 0, goRev: 0 });
  tot.avg = tot.n ? Math.round(tot.rev / tot.n) : 0;
  tot.voids = R.voids.length; tot.voidSum = R.voids.reduce((a, v) => a + (v.sum || 0), 0);
  tot.removed = R.removed.length; tot.removedSum = R.removed.reduce((a, v) => a + (v.sum || 0), 0);
  tot.exp = R.exp.reduce((a, v) => a + (v.sum || 0), 0);
  { const T = await import('./tasks.js'); tot.plan = { n: 0, ok: 0 }; for (let d = from, i = 0; d <= to && i < 62; d = new Date(Date.parse(d + 'T12:00:00Z') + 86400e3).toISOString().slice(0, 10), i++) { const x = await T.taskSum(env, d); tot.plan.n += x.n; tot.plan.ok += x.ok; } } // 📋 виконання плану
  // зараз
  const open = await openTables(env), att = await getAtt(env, today.slice(0, 7)), onShift = Object.entries(att[today] || {}).filter(([, x]) => x && !x.out && x.ok !== -1).map(([n]) => n);
  const pr = await printStatus(env).catch(() => ({})), gin = await env.DB.get('gin', 'json') || {};
  const supD = Object.values((await env.DB.get('sups', 'json')) || {}).reduce((a, x) => a + (x.debt || 0), 0); /* 🏭 борг постачальникам */
  const now = { supDebt: Math.round(supD), tables: open.filter(r => r.t < 1000).length, go: open.filter(r => r.t > 1000).length, openSum: open.reduce((a, r) => a + payable(r.b), 0), onShift, printer: pr.seen && Date.now() - pr.seen < 120e3 ? 1 : 0, printQ: pr.q || 0, inbox: Object.values(gin).filter(x => x.open).length, zToday: R.z.some(z => z.d === today) };
  return { from, to, days, tot, now, risk: risks(R), name: (await env.DB.get('cfg:venue', 'json'))?.name || '' };
}
// 🚨 тривоги про втрати й крадіжки за період — згруповано «хто, скільки, на яку суму»
function risks(R) {
  const out = [], by = (l, key) => Object.entries(l.reduce((a, x) => { const k = key(x) || '—'; (a[k] ||= { n: 0, sum: 0 }); a[k].n++; a[k].sum += Math.abs(x.sum || 0); return a; }, {})).sort((a, b) => b[1].sum - a[1].sum);
  const fmt = l => l.slice(0, 4).map(([w, x]) => `${w}: ${x.n} на ${Math.round(x.sum)} ₴`).join(' · ');
  const cooked = R.voids.filter(v => v.w && !v.table); if (cooked.length) out.push({ lvl: 'red', k: 'cooked', text: `🍳 Прибрано вже приготовані страви — ${fmt(by(cooked, v => v.by))}` });
  const tbl = R.voids.filter(v => v.table); if (tbl.length) out.push({ lvl: 'red', k: 'table', text: `🗑 Видалено цілі столи — ${fmt(by(tbl, v => v.by))}` });
  const rm = R.removed.filter(x => !x.reopen), ro = R.removed.filter(x => x.reopen);
  if (rm.length) out.push({ lvl: 'red', k: 'removed', text: `🧾 Видалено закриті чеки — ${fmt(by(rm, x => x.by))}` });
  if (ro.length) out.push({ lvl: '', k: 'reopen', text: `↩️ Перевідкрито закриті чеки — ${fmt(by(ro, x => x.by))}` });
  const big = R.checks.filter(c => c.pct >= 50 || (c.disc && c.sum && c.disc >= c.sum)); if (big.length) out.push({ lvl: 'red', k: 'disc', text: `% Знижки 50% і більше — ${fmt(by(big.map(c => ({ ...c, sum: c.disc })), c => c.w))}` });
  const minus = (R.mov || []).filter(m => m.type === 'adjc' && m.sum < 0); if (minus.length) out.push({ lvl: 'red', k: 'cash', text: `💵 Нестача готівки при звірці — ${fmt(by(minus, m => m.by))}` });
  const many = by(R.voids.filter(v => !v.w && !v.table), v => v.by).filter(([, x]) => x.n >= 5); if (many.length) out.push({ lvl: '', k: 'voids', text: `✏️ Часто прибирають позиції з рахунку — ${fmt(many)}` });
  return out;
}

// 💰 P&L: виручка − собівартість (техкарти) − зарплата (≈ пропорційно дням) − витрати з каси = прибуток
async function pnl(env, S) {
  const { getMenu } = await import('./menu.js'), st = await import('./stock.js'), { payroll } = await import('./pay.js');
  const R = await reportRange(env, S.from, S.to), [menu, cards, ing] = await Promise.all([getMenu(env), st.getCards(env), st.getIng(env)]);
  const res = st.cardResolver(menu), im = new Map(ing.map(x => [x.id, x])), memo = new Map();
  let cogs = 0, noCard = 0; const top = {};
  for (const c of R.checks) for (const [n, q, sum] of c.dishes || []) {
    if (!memo.has(n)) { const f = st.cardFor(cards, res(n)); memo.set(n, f ? st.cardCost(f.card, im, cards) * f.k : null); }
    const u = memo.get(n); if (u == null || !(u > 0)) { noCard += sum || 0; continue; }
    cogs += u * q; const t = top[n] ||= { n, q: 0, rev: 0, cost: 0 }; t.q += q; t.rev += sum || 0; t.cost += u * q;
  }
  // зарплата: фонд місяця × частка днів періоду
  let pay = 0; const months = []; for (let d = new Date(S.from.slice(0, 7) + '-15'); d.toISOString().slice(0, 7) <= S.to.slice(0, 7) && months.length < 24; d.setMonth(d.getMonth() + 1)) months.push(d.toISOString().slice(0, 7)); // усі місяці періоду
  for (const m of months) {
    const p = await payroll(env, m).catch(() => null); if (!p) continue;
    const dim = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(), a = S.from > m + '-01' ? +S.from.slice(8) : 1, z = S.to < m + '-' + dim ? +S.to.slice(8) : dim, today = dayKey(), elapsed = today.slice(0, 7) === m ? +today.slice(8) : dim;
    pay += p.fund * Math.max(0, Math.min(z, elapsed) - a + 1) / Math.max(1, elapsed);
  }
  // 🏦 комісія банку з безготівки (карта + онлайн) — % з налаштувань каси
  const bf = (await (await import('./ops.js')).getCfg(env)).bankFee || 0, bank = (S.tot.card || 0) * bf / 100; /* онлайн уже входить у card */
  const rev = S.tot.rev || 0, exp = S.tot.exp || 0, profit = rev - cogs - pay - exp - bank, r = x => Math.round(x);
  return { rev, cogs: r(cogs), noCard: r(noCard), fc: rev ? Math.round(cogs / (rev - noCard || 1) * 1000) / 10 : 0, pay: r(pay), payPct: rev ? Math.round(pay / rev * 1000) / 10 : 0, exp: r(exp), bank: r(bank), bankFee: bf, profit: r(profit), margin: rev ? Math.round(profit / rev * 1000) / 10 : 0,
    top: Object.values(top).map(t => ({ ...t, cost: r(t.cost), m: r(t.rev - t.cost) })).sort((a, b) => b.m - a.m).slice(0, 10) };
}

const sendVerify = (env, x) => sendMail(env, x.email, 'Підтвердіть пошту — кабінет власника', 'Вітаємо в кабінеті власника', `${x.name}, для вас створено кабінет власника закладу. Підтвердіть пошту й задайте свій пароль. Посилання діє 7 днів.`, '✅ Підтвердити й задати пароль', ownerLink('verify', x.t));

// ⚡ заклад із заявки самореєстрації (пошта підтверджена листом або Google) → пробний місяць, лід, повідомлення платформі
async function signupVenue(env, H, r) {
  const p = await H.signupTake(r.acct.email); let venue = null;
  if (p) {
    const slug = String(p.place || '').toLowerCase().replace(/[а-яіїєґ'’ь]/g, c => ({ а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ю: 'yu', я: 'ya' }[c] || '')).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 22);
    for (let i = 0; i < 6 && !venue?.id; i++) {
      venue = await H.venueCreate({ id: (slug.length >= 2 ? slug : 'cafe') + '-' + rnd(2), name: p.place, owner: r.acct.email, city: p.city, ref: p.ref, status: 'trial' });
      if (venue.error) { if (!/зайнята/.test(venue.error)) break; venue = null; }
    }
    if (venue?.id) {
      const q = await callVenue(env, venue.id, '/__int/init', { name: venue.name }, true).catch(e => ({ error: e.message }));
      if (q.error) { await H.venueSet(venue.id, { status: 'off' }).catch(() => {}); venue = null; }
      else {
        const l = await H.leadAdd({ name: r.acct.name, phone: '', place: venue.name, city: venue.city, msg: '⚡ самореєстрація · ' + r.acct.email, src: 'self', ref: p.ref }, 'own:' + Date.now()); if (l?.id) await H.leadSet(l.id, { st: 'trial', venue: venue.id }).catch(() => {});
        await (await import('./push.js')).crmPush(env, '🆕 Новий заклад', `${venue.name}${venue.city ? ' · ' + venue.city : ''} — ${r.acct.name} · ${r.acct.email}`, 'reg').catch(() => {});
        await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text: `🆕 <b>Новий заклад (самореєстрація)</b>\n🏪 ${hx(venue.name)}${venue.city ? ' · ' + hx(venue.city) : ''}\n👤 ${hx(r.acct.name)} · ${hx(r.acct.email)}\n🧪 пробний місяць · адреса: ${hx(venue.id)}` }).catch(() => {});
      }
    }
  }
  return venue?.id || null;
}

// 🇬 Google: перевірка ID-токена (RS256, ключі Google кешуються Cloudflare на годину). Клієнт — env.GOOGLE_CLIENT_ID (не секрет)
const gid = env => env.GOOGLE_CLIENT_ID || (env.BOT_TOKEN === 'local-test' ? 'test-gid' : '');
const b64u = x => Uint8Array.from(atob(String(x).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(x.length / 4) * 4, '=')), c => c.charCodeAt(0));
async function gVerify(env, cred, testJwk) {
  const [h, p, sg] = String(cred || '').split('.'); if (!sg || cred.length > 4096 || !gid(env)) return null;
  let H, P; try { H = JSON.parse(new TextDecoder().decode(b64u(h))); P = JSON.parse(new TextDecoder().decode(b64u(p))); } catch { return null; }
  if (H.alg !== 'RS256') return null;
  const keys = testJwk && env.BOT_TOKEN === 'local-test' ? [testJwk] // тестовий сервер: ключ із тесту (на проді BOT_TOKEN інший)
    : (await fetch('https://www.googleapis.com/oauth2/v3/certs', { cf: { cacheTtl: 3600, cacheEverything: true } }).then(r => r.json()).catch(() => ({}))).keys || [];
  const k = keys.find(x => x.kid === H.kid); if (!k) return null;
  try { const key = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: k.n, e: k.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(sg), new TextEncoder().encode(h + '.' + p)))) return null; } catch { return null; }
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(P.iss) || P.aud !== gid(env) || !(P.exp * 1000 > Date.now()) || P.email_verified !== true || !P.email || !P.sub) return null;
  return { email: String(P.email), sub: String(P.sub), name: String(P.name || '').slice(0, 60) };
}

// ---------- /api/owner (поза закладом) ----------
const ACC_OPS = new Set(['logout', 'me', 'pass', 'av', 'help', 'accCli', 'accExp']); // 🧮 що може акаунт бухгалтера
export async function ownerApi(req, env) {
  if (!env.HUB) return [{ error: 'HUB не підключено' }, 500];
  const b = await req.json().catch(() => ({})), H = hub(env), tok = (req.headers.get('authorization') || '').slice(7);
  const ok = (x = {}) => [{ ok: true, ...x }, 200], bad = (e, s = 400) => [{ error: e }, s];
  if (b.op === 'login') { const r = await H.login(b.email, b.pass); return r.error ? bad(r.error, 401) : ok(r); }
  if (b.op === 'bootstrap') { // 1-й акаунт платформи — лише коли акаунтів ще немає І є чинна сесія адміна каси VARVAR
    if ((await H.acctList()).length) return bad('Акаунт платформи вже створено — увійдіть');
    const s = /^[a-f0-9]{32}$/.test(b.pos || '') ? await callVenue(env, MAIN, '/__int/whoami', { token: b.pos }) : null;
    if (!s?.admin) return bad('Відкрийте кабінет з каси VARVAR (Налаштування → 👑 Кабінет власника)', 403);
    const a = await H.acctCreate({ email: b.email, name: b.name || s.name, pass: b.pass, role: 'platform' }); if (a.error) return bad(a.error);
    await H.venueCreate({ id: MAIN, name: 'Varvar Food Bar', owner: a.email, status: 'active', city: 'Буковель' });
    return ok(await H.login(b.email, b.pass));
  }
  if (b.op === 'forgot') { // 🔑 завжди «ok» — не підказуємо, чи є такий email
    const x = await H.mailToken(b.email, 'reset'); if (x?.error) return bad(x.error);
    if (x) { const r = await sendMail(env, x.email, 'Відновлення пароля', 'Новий пароль', `${x.name}, натисніть кнопку, щоб задати новий пароль до кабінету власника. Посилання діє 1 годину.`, '🔑 Задати пароль', ownerLink('reset', x.t)); if (r.error) return bad(r.error); }
    return ok({ mail: mailOn(env) });
  }
  if (b.op === 'reset' || b.op === 'verify') { const r = await H.useToken(b.t, b.op, b.pass ?? null); return r.error ? bad(r.error) : ok(r); }
  if (b.op === 'signup') { // ⚡ самореєстрація закладу: email, назва, місто, пароль → лист → (підтвердження) → заклад на пробний місяць
    if (b.web) return ok(); // 🍯 пастка для ботів
    const tst = env.BOT_TOKEN === 'local-test'; // тестовий сервер без пошти: токен підтвердження віддається у відповіді (на проді BOT_TOKEN інший)
    if (!mailOn(env) && !tst) return bad('Реєстрація тимчасово недоступна — залиште заявку');
    const place = String(b.place || '').trim(); if (place.length < 2) return bad('Вкажіть назву закладу');
    const x = await H.signupStart({ email: b.email, name: b.name || place, pass: b.pass, place, city: b.city, ref: b.ref, ip: req.headers.get('CF-Connecting-IP') || '' }); if (x?.error) return bad(x.error);
    if (tst && !mailOn(env)) return ok({ test: x.t });
    const r = await sendMail(env, x.email, 'Підтвердіть пошту — ATOM', 'Майже готово!', `${x.name}, підтвердіть пошту — і ми створимо заклад «${place.slice(0, 60)}» з пробним місяцем. Посилання діє 7 днів.`, '✅ Підтвердити й створити заклад', ownerLink('signup', x.t));
    return r.error ? bad(r.error) : ok();
  }
  if (b.op === 'signupOk') { // ✉️ перехід за посиланням: підтверджує пошту й створює заклад
    const r = await H.useToken(b.t, 'signup', null); if (r.error) return bad(r.error);
    const venue = await signupVenue(env, H, r);
    return ok({ token: r.token, venue });
  }
  if (b.op === 'google') { // 🇬 вхід / реєстрація через Google; новий email — лише з назвою закладу (як самореєстрація)
    const u = await gVerify(env, b.cred, b.jwk); if (!u) return bad('Google не підтвердив вхід — спробуйте ще раз', 401);
    const place = String(b.place || '').trim().slice(0, 60);
    const r = await H.googleIn({ ...u, create: place.length >= 2, place, city: b.city, ref: b.ref, ip: req.headers.get('CF-Connecting-IP') || '' }); if (r.error) return bad(r.error, 403);
    if (r.need) return ok({ need: 'place', name: u.name, email: u.email });
    return ok({ token: r.token, venue: await signupVenue(env, H, r) }); // заявка є лише в нового (або ще не підтвердженого листом) акаунта
  }
  if (b.op === 'resend') { const x = await H.mailToken(b.email, 'verify'); if (x?.error) return bad(x.error); if (x && (await H.acctGet(x.email))?.unverified) await sendVerify(env, x); return ok(); }
  if (b.op === 'canBoot') return ok({ boot: !(await H.acctList()).length, gid: gid(env) });
  const me = await H.session(tok); if (!me) return bad('auth', 401);
  const plat = me.role === 'platform', mine = async () => plat ? await H.venueList() : (await Promise.all(me.venues.map(id => H.venueGet(id)))).filter(Boolean);
  const may = async id => plat || me.venues.includes(id);
  if (me.role === 'acc' && !ACC_OPS.has(b.op)) return bad('Бухгалтеру доступні лише облік і звіти', 403); // 🧮 окрема роль: без входу в касу й налаштувань
  const own = async id => plat || (isVenueId(id) && (await H.venueGet(id))?.owner === me.email); // справжній власник закладу (не керуючий)
  switch (b.op) {
    case 'logout': await H.logout(tok); return ok();
    case 'me': return ok({ me, venues: await mine(), seen: await H.seenAll(), inbox: me.role === 'acc' ? 0 : (await H.msgList(plat ? null : me.venues)).filter(m => !m.done).length });
    case 'accCli': { // 🧮 «Мої клієнти»: кожен заклад рахує свій стан сам, паралельно
      const vs = (await mine()).filter(v => v.status !== 'off' && v.id !== 'atom-demo');
      return ok({ list: await Promise.all(vs.map(async v => ({ ...(await callVenue(env, v.id, '/__int/acc', { from: b.from, to: b.to }).catch(e => ({ error: e.message }))), id: v.id, name: v.name, city: v.city || '' }))) }); }
    case 'accExp': { if (!isVenueId(b.venue) || !(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/acc', b.fmt ? { do: 'file', fmt: b.fmt, no: b.no, from: b.from, to: b.to } : { do: 'exp', from: b.from, to: b.to }); return r.error ? bad(r.error) : ok(r); }
    case 'accList': { if (!(await own(b.venue))) return bad('Лише власник закладу', 403); return ok({ list: (await H.acctList()).filter(a => a.role === 'acc' && a.venues.includes(b.venue)).map(a => ({ email: a.email, name: a.name, unverified: !!a.unverified })) }); }
    case 'accInv': { // ✉️ власник запрошує бухгалтера: новий акаунт «бухгалтер» (пароль — за посиланням з листа) або доступ уже наявному
      if (!(await own(b.venue))) return bad('Лише власник закладу', 403);
      const email = String(b.email || '').trim().toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 100) return bad('Вкажіть email бухгалтера');
      let a = await H.acctGet(email);
      if (a && a.role !== 'acc') return bad('Цей email уже має кабінет власника — для бухгалтера потрібна окрема пошта');
      if (!a) { if ((await H.acctList()).filter(x => x.role === 'acc' && x.venues.includes(b.venue)).length >= 5) return bad('Не більше 5 бухгалтерів на заклад');
        a = await H.acctCreate({ email, name: String(b.name || '').trim() || email, pass: rnd(16), role: 'acc', verify: true }); if (a.error) return bad(a.error); }
      const g = await H.grant(b.venue, email, true); if (g.error) return bad(g.error);
      const v = await H.venueGet(b.venue); let test = null;
      if (g.unverified) { const x = await H.mailToken(email, 'verify'); if (x?.error) return bad(x.error);
        if (mailOn(env)) { const r = await sendMail(env, x.email, 'Запрошення бухгалтера — ATOM', 'Вас запросили як бухгалтера', `${me.name} відкриває вам облік закладу «${v.name}»: продажі, банк, податкові дати й експорт для бухгалтерії. Задайте пароль — посилання діє 7 днів.`, '🧮 Задати пароль і увійти', ownerLink('verify', x.t)); if (r.error) return bad(r.error); }
        else if (env.BOT_TOKEN === 'local-test') test = x.t; }
      return ok({ acc: { email, name: g.name, unverified: !!g.unverified }, mail: mailOn(env), ...(test ? { test } : {}) }); }
    case 'accDel': { if (!(await own(b.venue))) return bad('Лише власник закладу', 403); const a = await H.acctGet(b.email); if (!a || a.role !== 'acc') return bad('Немає такого бухгалтера');
      const r = await H.grant(b.venue, a.email, false); return r.error ? bad(r.error) : ok(); }
    case 'dig': { // 🌙 підсумок дня: останні дні всіх закладів / особистий Telegram власника
      if (b.now) { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/dig', { do: 'now' })); }
      if (b.chat != null) { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/dig', { do: 'chat', chat: b.chat }); return r.error ? bad(r.error) : ok(r); }
      const vs = (await mine()).filter(v => v.status !== 'off' && v.id !== 'atom-demo');
      return ok({ list: await Promise.all(vs.map(async v => ({ id: v.id, name: v.name, ...(await callVenue(env, v.id, '/__int/dig', {}).catch(e => ({ error: e.message, list: [] }))) }))) });
    }
    case 'sum': { // аналітика: кожен заклад рахує сам, паралельно
      const vs = (await mine()).filter(v => v.status !== 'off' && v.id !== 'atom-demo' && (!b.venues?.length || b.venues.includes(v.id))); // ⛔ вимкнені — не в аналітиці
      const out = await Promise.all(vs.map(async v => ({ ...(await callVenue(env, v.id, '/__int/sum', { from: b.from, to: b.to, pnl: !!b.pnl }).catch(e => ({ error: e.message }))), id: v.id, name: v.name, status: v.status })));
      return ok({ list: out });
    }
    case 'an': { // 📊 розширена аналітика одного закладу (кеш 5 хв у закладі)
      if (!isVenueId(b.venue) || !(await may(b.venue))) return bad('Немає доступу', 403);
      const r = await callVenue(env, b.venue, '/__int/an', { from: b.from, to: b.to }); return r.error ? bad(r.error) : ok(r); }
    case 'enter': { if (!isVenueId(b.venue) || !(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/login', { name: me.name, email: me.email }); await H.seen(b.venue); return r.token ? ok({ token: r.token, me: r.me, venue: b.venue }) : bad(r.error || 'Не вдалось'); }
    case 'brand': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/brand', {}); return r.error ? bad(r.error) : ok(r); }
    case 'bots': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/bots', { test: !!b.test })); }
    case 'ready': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/ready', {})); }
    case 'codes': { if (!(await may(b.venue))) return bad('Немає доступу', 403); return ok(await callVenue(env, b.venue, '/__int/codes', {})); }
    case 'secrets': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await callVenue(env, b.venue, '/__int/secrets', b.f || {}); return r.error ? bad(r.error) : ok(r); }
    case 'help': { const text = String(b.text || '').trim().slice(0, 1500); if (text.length < 3) return bad('Опишіть питання');
      const hk = 'helprl:' + String(me.email || me.name).slice(0, 60), hn = +(await env.DB.get(hk) || 0); if (hn >= 5) return bad('Забагато звернень — спробуйте за годину'); await env.DB.put(hk, String(hn + 1), { expirationTtl: 3600 });
      await (await import('./push.js')).crmPush(env, '🆘 Допомога з кабінету', `${me.name}: ${text}`, 'help').catch(() => {});
      await tg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text: `🆘 <b>Допомога з кабінету</b>\n👤 ${hx(me.name)} · ${hx(me.email)}\n🏪 ${hx(me.venues.join(', ') || '—')}\n\n${text.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}` }).catch(() => {});
      await H.msgAdd({ kind: 'help', venue: me.venues[0] || '', vname: '👑 кабінет', by: me.name + ' · ' + me.email, role: me.role, text }); return ok(); }
    case 'inbox': return ok({ list: await H.msgList(plat ? null : me.venues) });
    case 'inboxSay': { const text = String(b.text || '').trim().slice(0, 1500); if (!text) return bad('Напишіть відповідь'); // 💬 відповідь працівнику закладу
      const m = await H.msgSay(String(b.id), 'a', text, plat ? null : me.venues); if (m.error) return bad(m.error);
      if (m.venue) await callVenue(env, m.venue, '/__int/msgIn', { hid: m.id, text }).catch(() => {}); return ok({ m }); }
    case 'inboxSet': { const r = await H.msgSet(String(b.id), { del: !!b.del }, plat ? null : me.venues); return r.error ? bad(r.error) : ok(); }
    case 'ask': { // 🧠 «Запитай у даних»: цифри закладів за цей і минулий місяць → ШІ відповідає лише з них
      const q = String(b.q || '').trim().slice(0, 500); if (q.length < 3) return bad('Напишіть питання');
      const t = new Date(), m0 = t.toLocaleDateString('sv-SE').slice(0, 7), pm = new Date(t.getFullYear(), t.getMonth(), 0).toLocaleDateString('sv-SE'), from = pm.slice(0, 7) + '-01', to = t.toLocaleDateString('sv-SE');
      const vs = (await mine()).filter(v => v.status !== 'off'), data = await Promise.all(vs.map(async v => { const r = await callVenue(env, v.id, '/__int/sum', { from, to, pnl: true }).catch(() => null); return r && { заклад: v.name, дні: r.days, разом: r.tot, прибуток: r.pnl && { собівартість: r.pnl.cogs, зарплата: r.pnl.pay, витрати: r.pnl.exp, прибуток: r.pnl.profit, топ_страв: r.pnl.top }, ризики: (r.risk || []).map(x => x.text) }; }));
      const prompt = `Ти — фінансовий аналітик мережі закладів харчування. Сьогодні ${to}. Дані (дні у форматі РРРР-ММ-ДД, суми в гривнях; rev — виручка, n — чеки, tip — чайові, disc — знижки, go/goRev — доставки/з собою, exp — витрати з каси) за період ${from} — ${to}:
${JSON.stringify(data.filter(Boolean))}

Питання власника: «${q}»

Відповідай українською, коротко (до 8 речень), з конкретними цифрами лише з цих даних. Якщо даних не вистачає — так і скажи й порадь, що заповнити (техкарти, витрати тощо).`;
      try { const r = await (await import('./ai.js')).aiAnswer(env, prompt); return ok({ answer: String(r.answer || '').slice(0, 3000) }); } catch (e) { return bad('ШІ зараз недоступний, спробуйте за хвилину'); } }
    case 'bak': { // 💾 бекапи: список / зробити зараз / завантажити — власник; відновити — лише платформа
      if (!(await may(b.venue))) return bad('Немає доступу', 403); const op = String(b.do || 'list');
      if (op === 'restore' && (!plat || b.confirm !== b.venue)) return bad(plat ? 'Для підтвердження введіть адресу закладу' : 'Відновлення — лише через розробника (🆘 Допомога)', 403);
      const r = await callVenue(env, b.venue, '/__int/bak', { do: op, tag: b.tag, who: me.name }); return r.error ? bad(r.error) : ok(r); }
    case 'bill': { // 💳 оплата ATOM і баланс ШІ закладу
      if (!(await may(b.venue))) return bad('Немає доступу', 403); const v = await H.venueGet(b.venue); if (!v) return bad('Немає закладу');
      const B = await import('./billing.js'), ai = b.venue === MAIN ? null : await callVenue(env, b.venue, '/__int/aibal', {}).catch(() => null);
      return ok({ sub: B.billState(v), ai: ai && { bal: ai.bal, h: (ai.h || []).slice(0, 30) }, tops: B.AI_TOPS, lp: !!(await import('./liqpay.js')).lpPlatform(env) }); }
    case 'billPay': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const v = await H.venueGet(b.venue); if (!v) return bad('Немає закладу');
      const r = await (await import('./billing.js')).billLink(env, v, b.kind === 'ai' ? 'ai' : 'sub', { auto: !!b.auto, sum: b.sum }); return r.error ? bad(r.error) : ok({ url: r.url }); }
    case 'billUnsub': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const v = await H.venueGet(b.venue); const r = await (await import('./billing.js')).billUnsub(env, v); return r.error ? bad(r.error) : ok(); }
    case 'payers': { const y = String(new Date().getFullYear()), list = await H.payerList(plat ? null : me.email), vs = await mine(); // 🧾 платники власника + дохід за рік по закладах
      return ok({ list: await Promise.all(list.map(async p => ({ ...p, year: await H.payerYear(p.id, y), venues: vs.filter(v => v.payer === p.id).map(v => v.id) }))) }); }
    case 'payerSet': { const r = await H.payerSet(b.f || {}, plat ? null : me.email); return r.error ? bad(r.error, r.error === 'Немає доступу' ? 403 : 400) : ok({ payer: r }); }
    case 'payerVenue': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const p = b.payer ? await H.payerGet(String(b.payer)) : null;
      if (b.payer && (!p || (!plat && p.owner !== me.email))) return bad('Немає доступу', 403);
      const v = await H.payerVenue(String(b.venue), p?.id || ''); if (v.error) return bad(v.error);
      const r = await callVenue(env, v.id, '/__int/payer', { id: p?.id || '', n: p?.n || '', who: '👑 ' + me.name }); return r.error ? bad(r.error) : ok({ venue: v, year: r.year }); }
    case 'pass': { const r = await H.acctPass(me.email, b.pass); return r.error ? bad(r.error) : ok(); }
    case 'av': { const r = await H.acctAv(me.email, String(b.data || '')); return r.error ? bad(r.error) : ok({ av: r.av }); }
  }
  // ---- консоль платформи ----
  if (!plat) return bad('Лише для платформи', 403);
  switch (b.op) {
    case 'accts': return ok({ list: await H.acctList(), venues: await H.venueList() });
    case 'acctNew': { // з поштою: власник сам підтверджує email і задає пароль за посиланням з листа
      const m = mailOn(env), pass = String(b.pass || '').trim() || (m ? rnd(16) : '');
      const a = await H.acctCreate({ email: b.email, name: b.name, pass, verify: m }); if (a.error) return bad(a.error);
      if (m) { const x = await H.mailToken(a.email, 'verify'); const r = x && await sendVerify(env, x); if (r?.error) return ok({ acct: a, warn: r.error }); }
      return ok({ acct: a, mailed: m });
    }
    case 'acctResend': { const x = await H.mailToken(b.email, 'verify'); if (!x) return bad('Немає акаунта'); if (x.error) return bad(x.error); const r = await sendVerify(env, x); return r.error ? bad(r.error) : ok(); }
    case 'acctPass': { const r = await H.acctPass(b.email, b.pass); return r.error ? bad(r.error) : ok(); }
    case 'venueNew': {
      const v = await H.venueCreate({ id: b.id, name: b.name, owner: b.owner, city: b.city, ref: b.ref }); if (v.error) return bad(v.error);
      const r = await callVenue(env, v.id, '/__int/init', { name: v.name }, true); if (r.error) return bad(r.error);
      return ok({ venue: v, codes: r.codes });
    }
    case 'acctSet': { const a = await H.acctSet(b.email, b.f || {}); return a.error ? bad(a.error) : ok({ acct: a }); }
    case 'acctDel': { const r = await H.acctDel(b.email); return r.error ? bad(r.error) : ok(); }
    case 'grant': { const r = await H.grant(String(b.venue), b.email, !!b.on); return r.error ? bad(r.error) : ok({ acct: r }); }
    case 'venueDel': { // 🗑 назавжди: запис у HUB + усі дані закладу (підтвердження — пароль власника платформи)
      { const p = await H.login(me.email, b.pass); if (p.error) return bad(p.error === 'Невірний email або пароль' ? 'Невірний пароль' : p.error, 403); if (p.token && H.logout) await H.logout(p.token).catch(() => {}); } { const v0 = await H.venueGet(String(b.id)); if (v0?.subOrder) await (await import('./billing.js')).billUnsub(env, v0).catch(() => {}); } /* 💳 спершу вимкнути автосписання */ const r = await H.venueDel(String(b.id)); if (r.error) return bad(r.error);
      await env.STORE.get(env.STORE.idFromName(doName(String(b.id)))).wipe().catch(() => {});
      if (env.DB.kv) { const l = await env.DB.kv.list({ prefix: 'bak:' + String(b.id) + ':' }); for (const x of l.keys) await env.DB.kv.delete(x.name); } // 💾 бекапи теж — щоб новий заклад з тією ж адресою їх не побачив
      return ok(); }
    case 'leads': { const days = Math.min(90, +b.days || 30); return ok({ list: await H.leadList(), hits: await H.hitStats(days), demo: !!(await H.venueGet('atom-demo')) }); } // 🚀 CRM «Продажі»
    case 'atomCfg': { const f = b.set ? { ...(b.f || {}) } : undefined; let bot; // 💬 контакти сайту ATOM; ключ бота в полі «Підтримка» → бот підтримки (supbot.js)
      if (f && /^\d{6,12}:/.test(String(f.sup || '').trim())) { const S = await import('./supbot.js'), r = await S.supSetup(env, f.sup); if (r.error) return bad(r.error); f.sup = r.link; bot = r; }
      return ok({ cfg: await H.atomCfg(f), bot }); }
    case 'atomDesign': { // 🎨 конструктор сайту ATOM: дизайн у KV (воркер вшиває його в сторінку) + 10 попередніх версій
      const kv = env.DB.kv || env.DB, cur = await kv.get('atom:design', 'json'), vers = (await kv.get('atom:design:v', 'json')) || [];
      if (!b.set) return ok({ d: cur || {}, vers });
      const d = atomDesignClean(b.d); if (JSON.stringify(d).length > 30000) return bad('Забагато тексту');
      if (cur && Object.keys(cur).length) vers.unshift({ at: Date.now(), d: cur });
      await kv.put('atom:design', JSON.stringify(d)); await kv.put('atom:design:v', JSON.stringify(vers.slice(0, 10)));
      return ok({ d, vers: vers.slice(0, 10) }); }
    case 'leadNew': { const r = await H.leadAdd({ ...b, src: 'вручну' }, 'own:' + Date.now()); return r.error ? bad(r.error) : ok({ lead: r }); }
    case 'crmKey': { const P = await import('./push.js'), l = (await H.supGet('opush')) || []; return ok({ on: P.pushOn(env), key: env.VAPID_PUB || '', n: l.filter(x => x.m === me.email).length, mine: !!b.e && l.some(x => x.e === b.e) }); } // 🔔 повзунок «Сповіщення CRM»
    case 'crmSub': { const r = await (await import('./push.js')).crmSub(env, H, me.email, b.sub, !!b.on); return r.error ? bad(r.error) : ok(r); }
    case 'crmTest': { const n = await (await import('./push.js')).crmPush(env, '🚀 ATOM · Продажі', 'Сповіщення CRM працюють ✅', 'crmtest'); return n ? ok({ n }) : bad('Не надіслано — увімкніть повзунок ще раз'); }
    case 'leadSet': { const r = await H.leadSet(String(b.id), b.f || {}); return r.error ? bad(r.error) : ok({ lead: r }); }
    case 'demo': { // 📱 демо-каса: створити (власник — платформа) / зберегти поточний стан як еталон для нічного скидання
      if (b.do === 'create') { if (await H.venueGet('atom-demo')) return bad('Демо вже є'); const v = await H.venueCreate({ id: 'atom-demo', name: 'Все за 500', owner: me.email, city: 'Демо' }); if (v.error) return bad(v.error); const r = await callVenue(env, v.id, '/__int/init', { name: v.name }, true); return r.error ? bad(r.error) : ok(); }
      if (b.do === 'save') { const r = await demoSnap(env, 'atom-demo', 'save'); return r.error ? bad(r.error) : ok(r); }
      if (b.do === 'seed') { const r = await demoSnap(env, 'atom-demo', 'seed'); if (r.error) return bad(r.error); await H.venueSet('atom-demo', { name: 'Все за 500' }).catch(() => {}); return ok(r); }
      return bad('unknown'); }
    case 'ref': { if (!(await may(b.venue))) return bad('Немає доступу', 403); const r = await H.refStat(String(b.venue)); return r.error ? bad(r.error) : ok({ ref: r }); } // 🎁 код і лічильник; назву друга не показуємо
    case 'supStatus': { if (!plat) return bad('Лише платформа', 403); return ok(await (await import('./supbot.js')).supStatus(env, !!b.rearm, !!b.ai)); } // 🩺 стан бота підтримки
    case 'chatCfg': { if (!plat) return bad('Лише платформа', 403); return ok({ cfg: await H.chatCfg(b.set ? b.f || {} : undefined) }); } // 💬 вимикач чату на сайті ATOM і Telegram власника для «🔥»
    case 'chat': { if (!plat) return bad('Лише платформа', 403); const r = await H.chatGet(b.id); return r.error ? bad(r.error) : ok({ chat: r.m }); }
    case 'chatSim': { if (!plat) return bad('Лише платформа', 403); const { chatTurn } = await import('./chat.js'); const [d, st] = await chatTurn(env, H, b, 'sim:' + String(b.ip || 'x').slice(0, 20)); return st === 200 ? ok(d) : bad(d.error, st); } // для автотестів: той самий шлях, що /api/chat
    case 'refBlock': { if (!plat) return bad('Лише платформа', 403); const r = await H.refBlock(b.code, !!b.on); return r.error ? bad(r.error) : ok(); }
    case 'refGift': { // 🎁 +1 міс закладу вручну (причина обов'язкова); з кодом — ще й рефері (ліміт 12), один раз на заклад
      if (!plat) return bad('Лише платформа', 403); const why = String(b.why || '').trim().slice(0, 80); if (!why) return bad('Вкажіть причину');
      const v = await H.venueGet(String(b.id)); if (!v) return bad('Немає закладу'); const B = await import('./billing.js');
      const give = async (x, note) => { const d = new Date(Math.max(Date.now(), B.tillOf(x))); d.setMonth(d.getMonth() + 1); await H.venueBill(x.id, { paidTill: d.getTime(), locked: 0, pay: { ts: Date.now(), sum: 0, lp: note } }); await callVenue(env, x.id, '/__int/lock', { on: 0 }).catch(() => {}); return d.getTime(); };
      let ra = null; if (b.code || v.refBy) { ra = await H.refApply(v.id, b.code); if (ra.error) return bad(ra.error); }
      const till = await give(v, '🎁 подарунок · ' + why + ' · ' + me.name); let ref = null;
      if (ra?.referrer) { const rv = await H.venueGet(ra.referrer); if (rv) { await give(rv, '🎁 запросив друга · ' + me.name); ref = rv.name; } }
      return ok({ till, ref, capped: !!ra?.capped }); }
    case 'billMark': { // 👑 платформа: оплата готівкою/переказом — +N міс вручну, або задати дату
      const v = await H.venueGet(String(b.id)); if (!v) return bad('Немає закладу'); const B = await import('./billing.js');
      let till = B.tillOf(v); if (b.till) till = Date.parse(b.till + 'T23:59:59+03:00'); else { const d = new Date(Math.max(Date.now(), till)); d.setMonth(d.getMonth() + Math.max(1, Math.min(12, +b.months || 1))); till = d.getTime(); }
      if (!(till > 0)) return bad('Невірна дата');
      await H.venueBill(v.id, { paidTill: till, locked: 0, ...(b.till ? {} : { pay: { ts: Date.now(), sum: 0, lp: 'вручну · ' + me.name } }) }); await callVenue(env, v.id, '/__int/lock', { on: 0 }).catch(() => {}); return ok({ till }); }
    case 'venueSet': { const v = await H.venueSet(String(b.id), b.f || {}); if (v.error) return bad(v.error);
      if (b.f?.status) { const on = v.status === 'off' ? 1 : v.locked ? 1 : 0; await callVenue(env, v.id, '/__int/lock', { on, why: v.status === 'off' ? 'off' : 'sub' }).catch(() => {}); } // ⛔ «вимкнено» = каса лише перегляд, сайт не приймає замовлень; увімкнули — знімаємо, якщо не борг
      return ok({ venue: v }); }
  }
  return bad('unknown');
}

// 🎨 дизайн сайту ATOM: лише відомі ключі, кольори #rrggbb, шрифти зі списку, тексти — простий текст
export const ATOM_FONTS = ['Unbounded', 'Manrope', 'Inter', 'Montserrat', 'Rubik', 'Golos Text', 'Onest', 'Nunito', 'Comfortaa', 'Exo 2', 'Oswald', 'Russo One', 'Playfair Display', 'Lora', 'Prata', 'Roboto Slab', 'Philosopher', 'Tenor Sans', 'Raleway', 'Open Sans'];
const ATOM_TOK = ['bg', 'bg2', 'card', 'card2', 'line', 'text', 'muted', 'gold', 'gold2', 'vio', 'vio2', 'ok', 'ink'], ATOM_SEC = ['hero', 'feat', 'who', 'demo', 'steps', 'calc', 'cmp', 'price', 'faq', 'lead'];
export function atomDesignClean(x) {
  x = x && typeof x === 'object' ? x : {}; const d = {}, c = {};
  for (const k of ATOM_TOK) if (/^#[0-9a-f]{6}$/i.test(x.c?.[k] || '')) c[k] = x.c[k].toLowerCase();
  if (Object.keys(c).length) d.c = c;
  for (const k of ['fh', 'fb']) if (ATOM_FONTS.includes(x[k])) d[k] = x[k];
  if (x.r != null && +x.r >= 0 && +x.r <= 40) d.r = Math.round(+x.r);
  if (x.sp != null && +x.sp >= 32 && +x.sp <= 140) d.sp = Math.round(+x.sp);
  const fx = {}; for (const k of ['grad', 'glow', 'phone', 'anim', 'facts']) if (x.fx?.[k] === 0) fx[k] = 0; if (Object.keys(fx).length) d.fx = fx;
  if (Array.isArray(x.order)) { const o = [...new Set(x.order.filter(k => ATOM_SEC.includes(k)))]; if (o.length) d.order = o; }
  if (Array.isArray(x.off)) { const o = [...new Set(x.off.filter(k => ATOM_SEC.includes(k)))]; if (o.length) d.off = o; }
  if (x.t && typeof x.t === 'object') { const t = {}; for (const [k, v] of Object.entries(x.t)) if (/^[a-z]{2,6}\.[a-z0-9]{1,5}$/.test(k) && typeof v === 'string') t[k] = v.slice(0, 600); if (Object.keys(t).length) d.t = t; }
  return d;
}
