// 💳 Платежі платформи ATOM (ключі LiqPay платформи = VARVAR):
//  • sub — підписка закладу 500 ₴/міс: разово (pay) або 🔁 автосписання щомісяця (subscribe); кожна оплата → +1 міс до paidTill (HUB venue:<id>)
//  • ai  — поповнення балансу ШІ закладу (100/200/500 ₴) → /__int/aitop у сховищі закладу
// Пробний місяць: paidTill = дата створення + 30 дн. Прострочка > 5 днів пільги → заклад «лише перегляд» (cfg:lock), нічого не видаляється.
import { hub } from './hub.js';
import { MAIN } from './venue.js';
import { lpForm, lpOk, lpApi, lpPlatform } from './liqpay.js';
import { tg, esc } from './ops.js';

export const PRICE = 500, GRACE = 5, AI_TOPS = [100, 200, 500];
const FREE_IDS = id => id === MAIN || id === 'atom-demo' || id.startsWith('demo-');
const DAY = 864e5, addMonth = ts => { const d = new Date(ts); d.setMonth(d.getMonth() + 1); return d.getTime(); };
const ymd = ts => new Date(ts).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv' });
const LAUNCH = Date.parse('2026-10-10T00:00:00+03:00'); // заклади, створені до запуску оплат, — 30 днів від запуску
export const tillOf = v => v.paidTill || Math.max(v.at || Date.now(), LAUNCH) + 30 * DAY;
const say = (env, text) => tg(env, 'sendMessage', { chat_id: env.CHAT_ID, parse_mode: 'HTML', text }).catch(() => {});

// стан оплати закладу для кабінету
export function billState(v) {
  if (FREE_IDS(v.id)) return { free: 1 };
  const till = tillOf(v), left = Math.ceil((till - Date.now()) / DAY);
  return { till, left, auto: !!v.auto, trial: !v.paidTill, lock: left < -GRACE, price: PRICE, pays: (v.pays || []).slice(0, 12) };
}
// посилання на оплату: sub (auto — щомісяця) / ai (sum)
export async function billLink(env, v, kind, o = {}) {
  const k = lpPlatform(env); if (!k) return { error: 'Онлайн-оплата платформи ще не підключена' };
  const id = Date.now().toString(36), back = `https://posatom.online/owner/#pay`;
  if (kind === 'ai') {
    const sum = AI_TOPS.includes(+o.sum) ? +o.sum : 0; if (!sum) return { error: 'Сума: 100, 200 або 500 ₴' };
    return lpForm(k, { order_id: `ai-${v.id}-${id}`, amount: sum, description: `ATOM · баланс ШІ · ${v.name}`, result_url: back, server_url: env.SELF_URL + '/api/lp/ai' });
  }
  const p = { order_id: `sub-${v.id}-${id}`, amount: PRICE, description: `ATOM · підписка 1 міс · ${v.name}`, result_url: back, server_url: env.SELF_URL + '/api/lp/sub' };
  if (o.auto) { // 🔁 перше списання зараз, далі LiqPay сам щомісяця
    p.action = 'subscribe'; p.subscribe = 1; p.subscribe_periodicity = 'month'; p.subscribe_date_start = new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
  return lpForm(k, p);
}
// вимкнути автосписання
export async function billUnsub(env, v) {
  if (!v.subOrder) return { ok: true };
  const k = lpPlatform(env); const r = k ? await lpApi(k, { action: 'unsubscribe', order_id: v.subOrder }) : null;
  await hub(env).venueBill(v.id, { auto: 0, subOrder: '' });
  return r?.status === 'error' ? { error: r.err_description || 'LiqPay не відповів' } : { ok: true };
}

// callback LiqPay (підпис перевірено в index.js ключами платформи)
export async function billPaid(env, kind, x) {
  const [k0, ...rest] = String(x.order_id || '').split('-'), vid = rest.slice(0, -1).join('-'); if (k0 !== kind || !vid) return { error: 'order' };
  const H = hub(env), v = await H.venueGet(vid); if (!v) return { error: 'venue' };
  if (!lpOk(x)) { if (x.status === 'unsubscribed') await H.venueBill(vid, { auto: 0, subOrder: '' }); return { ok: true, fail: x.status }; }
  const pid = String(x.payment_id || x.order_id + ':' + (x.end_date || x.create_date || '')), sum = Math.round(+x.amount || 0), test = x.status === 'sandbox' || /^sandbox_/.test(x.public_key || '');
  if (!(await H.payOnce(pid))) return { ok: true, dup: 1 };
  if (kind === 'ai') {
    await (await import('./owner.js')).callVenue(env, vid, '/__int/aitop', { sum, lp: pid, test });
    await say(env, `🤖 <b>Баланс ШІ</b> · ${esc(v.name)}: +${sum} грн${test ? ' · 🧪 тест' : ''}`);
    return { ok: true };
  }
  // sub: +1 місяць від пізнішої з дат (зараз / оплачено до)
  const till = addMonth(Math.max(Date.now(), tillOf(v)));
  await H.venueBill(vid, { locked: 0, paidTill: till, pay: { ts: Date.now(), sum, lp: pid, ...(test ? { test: 1 } : {}) }, ...(x.action === 'subscribe' || x.status === 'subscribed' ? { auto: 1, subOrder: String(x.order_id) } : {}), ...(v.status === 'off' || v.status === 'trial' ? { status: 'active' } : {}) });
  await (await import('./owner.js')).callVenue(env, vid, '/__int/lock', { on: 0 }).catch(() => {});
  await say(env, `💳 <b>Оплата ATOM</b> · ${esc(v.name)}: ${sum} грн → оплачено до ${ymd(till)}${test ? ' · 🧪 тест' : ''}`);
  return { ok: true };
}

// ⏰ раз на день (cron 10:00): нагадування за 3 дні й у день оплати; прострочка > пільги → «лише перегляд»
export async function billDaily(env) {
  const H = hub(env), { callVenue } = await import('./owner.js'), { mailOn, sendMail } = await import('./mail.js');
  for (const v of await H.venueList()) {
    if (FREE_IDS(v.id) || v.status === 'off') continue;
    const s = billState(v), acct = await H.acctGet(v.owner);
    if (!s.auto && [3, 0].includes(s.left)) {
      const t = s.left ? `Через ${s.left} дні закінчується оплачений період ATOM для «${v.name}» (до ${ymd(s.till)}).` : `Сьогодні закінчується оплачений період ATOM для «${v.name}».`;
      if (acct && mailOn(env)) await sendMail(env, acct.email, 'Оплата ATOM', '💳 Оплата ATOM', `${t} Оплатіть 500 ₴ або увімкніть автосписання в кабінеті власника. Після ${GRACE} днів без оплати каса перейде в режим перегляду (дані зберігаються).`, '💳 Оплатити', 'https://posatom.online/owner/#pay').catch(() => {});
      await say(env, `⏰ ${esc(t)} Власник: ${esc(acct?.email || v.owner)}`);
    }
    if (s.left === -GRACE - 1 || (s.lock && !v.locked)) { await callVenue(env, v.id, '/__int/lock', { on: 1, why: 'sub' }).catch(() => {}); await H.venueBill(v.id, { locked: 1 }); await say(env, `⛔ «${esc(v.name)}»: підписка не оплачена ${GRACE}+ днів — каса в режимі перегляду`); }
  }
}
