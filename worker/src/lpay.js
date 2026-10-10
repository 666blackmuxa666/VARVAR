// 💳 Оплата рахунку столу з QR (LiqPay закладу) + callback для сертифікатів / підписки ATOM / балансу ШІ.
// Стіл: гість платить фактичний рахунок (рахує сервер) + чайові → bill.paid, стіл НЕ закривається:
// у касі плитка червона, у стрічці «💳 оплачено — підтвердіть» (✅ закрити · ✏️ стіл · ❌ повернути гроші).
import { getBill, putBill, payable, logEvent, editEv, L, notify, closeTable, esc } from './ops.js';
import { getGoCfg } from './delivery.js';
import { lpKeys, lpForm, lpOk, lpApi } from './liqpay.js';
import { tableKey } from './qr.js';
import { siteLink } from './venue.js';
import { promoFill } from './promo.js';
import { tn } from './tn.js';

const TIPS = [0, 5, 10, 15];
// скільки ще сплатити за стіл (без чайових): рахунок мінус уже оплачене онлайн
export const tDue = b => Math.max(0, payable(b) - (b.paid?.net || 0));
export async function tpayOn(env) { const c = await getGoCfg(env); return !!(c.qrpay && lpKeys(env)); }

async function tableOk(env, t, k, device) {
  t = Math.round(+t || 0); if (!(t > 0 && t < 1000)) return 0;
  if (k && String(k) === await tableKey(env, t)) return t;
  const si = device ? await env.DB.get('scan:' + String(device).slice(0, 64), 'json') : null; /* 📱 сканував QR (стіл або загальний) і сесія ще діє */
  return si && si.until > Date.now() && (!si.t || si.t === t) ? t : 0;
}

// гість: почати оплату столу → посилання LiqPay
export async function tpayStart(env, b) {
  if (!(await tpayOn(env))) return [{ error: 'off' }, 403];
  const t = await tableOk(env, b.t, b.k, b.device); if (!t) return [{ error: 'bad_qr' }, 403];
  const bill = await getBill(env, t); if (!bill?.total) return [{ error: 'empty' }, 400];
  await promoFill(env, bill).catch(() => {});
  const due = tDue(bill); if (due < 1) return [{ error: 'paid' }, 400];
  const pct = TIPS.includes(+b.tip) ? +b.tip : 0, tip = b.tipSum != null ? Math.max(0, Math.min(due, Math.round(+b.tipSum || 0))) : Math.round(due * pct / 100), amount = due + tip; /* tipSum — сума з вікна «Хочу чек» */
  const id = Date.now().toString(36) + [...crypto.getRandomValues(new Uint8Array(3))].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.DB.put('tpp:' + id, JSON.stringify({ t, due, tip, amount, at: Date.now() }), { expirationTtl: 3600 });
  const f = await lpForm(lpKeys(env), { order_id: `tb-${env.VENUE || 'varvar'}-${id}`, amount, description: `Рахунок · стіл ${tn(t)}${tip ? ` · чайові ${tip} грн` : ''}`, result_url: siteLink(`?tpaid=${id}`), server_url: env.SELF_URL + '/api/lp/table' });
  return [{ ok: true, pay: f.url, id, sum: amount }, 200];
}
export async function tpayState(env, id) {
  if (!/^[a-z0-9]{8,20}$/.test(id || '')) return { st: 'none' };
  const p = await env.DB.get('tpp:' + id, 'json'); return !p ? { st: 'none' } : { st: p.done ? 'paid' : p.fail ? 'fail' : 'wait', sum: p.amount };
}

// callback LiqPay (підпис уже перевірено в index.js)
export async function lpCallback(env, kind, x) {
  if (kind === 'table') return tablePaid(env, x);
  if (kind === 'cert') return (await import('./site.js')).certPaid?.(env, x) || { error: 'unknown' };
  if (kind === 'sub' || kind === 'ai') return (await import('./billing.js')).billPaid(env, kind, x);
  return { error: 'unknown' };
}
async function tablePaid(env, x) {
  const id = String(x.order_id || '').split('-').pop();
  return L(env, 'tpp:' + id, async () => {
    const p = await env.DB.get('tpp:' + id, 'json'); if (!p) return { error: 'expired' };
    if (p.done) return { ok: true, dup: 1 };
    if (!lpOk(x)) { await env.DB.put('tpp:' + id, JSON.stringify({ ...p, fail: x.status || 'error' }), { expirationTtl: 3600 }); return { ok: true, fail: 1 }; }
    const amount = Math.round(+x.amount || 0), tip = Math.min(p.tip, amount), net = amount - tip, pay = { id, lp: String(x.payment_id || ''), order: String(x.order_id), amt: amount, at: Date.now(), ...(x.status === 'sandbox' ? { test: 1 } : {}) };
    const ok = await L(env, 'bills', async () => {
      const b = await getBill(env, p.t); if (!b?.total) return false;
      b.paid = { sum: (b.paid?.sum || 0) + amount, net: (b.paid?.net || 0) + net, list: [...(b.paid?.list || []), pay] }; b.pwait = 1;
      if (tip) b.tip = (b.tip || 0) + tip;
      b.check = true; b.pay = 'online'; await putBill(env, p.t, b); return true;
    });
    await env.DB.put('tpp:' + id, JSON.stringify({ ...p, done: 1, lp: pay.lp, amount }), { expirationTtl: 7 * 86400 });
    if (!ok) { await notify(env, `⚠️ Стіл ${tn(p.t)}: гість оплатив онлайн ${amount} грн, але рахунку вже немає (закрили). Поверніть гроші в LiqPay або врахуйте вручну.`).catch(() => {}); return { ok: true, orphan: 1 }; }
    await logEvent(env, { k: 'tpay', t: p.t, s: 'new', sum: amount, tip, pid: id, ...(pay.test ? { test: 1 } : {}) });
    await notify(env, `💳 <b>Стіл ${tn(p.t)} оплатив онлайн</b> ${amount} грн${tip ? ` (з них 💝 чайові ${tip})` : ''}${pay.test ? ' · 🧪 тест' : ''}\nПідтвердіть у касі — стіл закриється.`).catch(() => {});
    return { ok: true };
  });
}
const ackEv = (env, t, s, who) => editEv(env, l => { for (const e of l) if (e.k === 'tpay' && +e.t === +t && e.s === 'new') { e.s = s; e.accBy = who; } });

// каса: ✅ підтвердити (закрити стіл; доплату — обраним способом) / ❌ повернути все онлайн-оплачене
export async function tpayApi(b, env, me) {
  const t = Math.round(+b.t || 0), admin = me.role === 'admin', who = me.name;
  if (b.op === 'tpayOk') {
    const bill = await getBill(env, t); if (!bill?.paid) return [{ error: 'Онлайн-оплати на цьому столі немає' }, 400];
    const r = await closeTable(env, t, who, b.pay === 'card' ? 'card' : 'cash', b.print !== false); if (!r) return [{ error: 'Не вдалося закрити' }, 400];
    await ackEv(env, t, 'acc', who); return [{ ok: true, ...r }, 200];
  }
  if (b.op === 'tpayRefund') {
    if (!admin) return [{ error: 'Повернення — лише адмін' }, 403];
    const k = lpKeys(env); if (!k) return [{ error: 'LiqPay не підключено' }, 400];
    const bill = await getBill(env, t), gp = bill?.go?.paid && !bill.go.paid.ref ? bill.go.paid : null; /* 🛵 доставка/з собою, оплачені онлайн */
    const list = gp ? [{ order: `go-${env.VENUE || 'varvar'}-${bill.go.oid}`, amt: gp.sum }] : bill?.paid?.list || []; if (!list.length) return [{ error: 'Немає що повертати' }, 400];
    const fails = [];
    for (const p of list) { const r = await lpApi(k, { action: 'refund', order_id: p.order, amount: p.amt }); if (!['reversed', 'success', 'sandbox'].includes(r.status) && r.result !== 'ok') fails.push(`${p.amt} грн: ${r.err_description || r.status}`); }
    if (fails.length) return [{ error: 'LiqPay не повернув: ' + fails.join('; ') }, 400];
    const sum = list.reduce((a, p) => a + p.amt, 0);
    if (gp) await L(env, 'bills', async () => { const x = await getBill(env, t); if (x?.go?.paid) { x.go.paid.ref = Date.now(); await putBill(env, t, x); } });
    else await L(env, 'bills', async () => { const x = await getBill(env, t); if (!x?.paid) return; const tip = x.paid.sum - x.paid.net; x.tip = Math.max(0, (x.tip || 0) - tip); if (!x.tip) delete x.tip; delete x.paid; delete x.pwait; delete x.pay; await putBill(env, t, x); });
    await ackEv(env, t, 'rej', who);
    await logEvent(env, { k: 'shift', by: who, text: `↩️ Стіл ${tn(t)}: повернуто гостю онлайн-оплату ${sum} грн` });
    return [{ ok: true, sum }, 200];
  }
  return [{ error: 'unknown' }, 400];
}
export { esc };
