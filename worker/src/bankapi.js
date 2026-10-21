// 🔄 Банк автоматично (етап 2): monobank — особистий токен api.monobank.ua (лише рахунки ФОП у гривні) і ПриватБанк «Автоклієнт».
// mono: вебхук на кожну операцію (без опитування) + раз на добу добір пропущеного за 3 дні (виписка — 1 запит/хв, тому по одному рахунку за пробудження).
// Приват: раз на добу (після 7:00) операції за 3 дні + «🔄 Оновити» вручну. Рядки → bank.js bankRows (та сама звірка), src 'mono' / 'privat'.
// Секрети закладу MONO_BANK / PRIVAT_BANK (VARVAR — wrangler secret). Стан: bkapi → { mono:{ tk, acc:[{id,iban,n}], i, day, err, ts, n }, privat:{ tk, day, err, ts, n } } · bkapi:hook → { ts, n }
// Тестовий режим: токени monob_test_… / privat_test_… не ходять у мережу (рахунок і операція-заглушки).
import { L, dayKey } from './ops.js';
import { bankRows, hash, decode } from './bank.js';
import { MAIN } from './venue.js';

const MONO = 'https://api.monobank.ua/personal/', PB = 'https://acp.privatbank.ua/api/statements/';
const r2 = n => Math.round((+n || 0) * 100) / 100;
const T = (v, n = 160) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const kyiv = (ms = Date.now()) => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' });
const kyivH = () => +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', hour12: false });
const ibanN = v => String(v || '').toUpperCase().replace(/\s/g, '').match(/UA\d{27}/)?.[0] || '';
export const tkOf = t => hash('tk|' + t);
const sbM = t => /^monob_test_/.test(t), sbP = t => /^privat_test_/.test(t);
export const tokOk = { mono: t => /^[\w-]{20,80}$/.test(t), privat: t => /^[\w-]{20,400}$/.test(t) };

// 🔐 адреса вебхука mono: секрет похідний від MASTER_KEY і закладу (ніде не зберігається)
export async function hookKey(env) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.MASTER_KEY || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('bank:' + (env.VENUE || MAIN))))].slice(0, 20).map(x => x.toString(16).padStart(2, '0')).join('');
}
const hookUrl = async env => env.SELF_URL + '/api/bankhook/' + await hookKey(env);

// ---------- monobank ----------
const mcall = (tok, path, body) => fetch(MONO + path, { method: body ? 'POST' : 'GET', headers: { 'X-Token': tok, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) })
  .then(async r => { const t = await r.text(), j = (() => { try { return JSON.parse(t); } catch { return {}; } })(); return r.ok ? j : { error: r.status === 429 ? 'monobank: забагато запитів, спробуємо пізніше' : r.status === 403 || r.status === 401 ? 'monobank не приймає токен' : j.errorDescription || 'monobank: HTTP ' + r.status }; })
  .catch(() => ({ error: 'monobank не відповідає' }));
// рахунки ФОП у гривні + вебхук на нашу адресу
export async function monoSetup(env, tok) {
  const ci = sbM(tok) ? { accounts: [{ id: 'qa-fop', type: 'fop', currencyCode: 980, iban: 'UA213223130000026007233566001' }] } : await mcall(tok, 'client-info'); if (ci.error) return ci;
  const acc = (ci.accounts || []).filter(a => a.type === 'fop' && a.currencyCode === 980).slice(0, 5).map(a => ({ id: String(a.id), iban: ibanN(a.iban), n: '…' + String(a.iban || '').slice(-4) }));
  if (!acc.length) return { error: 'У monobank немає рахунку ФОП у гривні (особисті картки в облік не беремо)' };
  if (!sbM(tok)) { const w = await mcall(tok, 'webhook', { webHookUrl: await hookUrl(env) }); if (w.error) return { error: 'Вебхук monobank: ' + w.error }; }
  return { acc };
}
const monoRow = it => { const d = kyiv((+it.time || 0) * 1000), r = { d, sum: r2((+it.amount || 0) / 100), who: T(it.counterName || it.description, 120), pur: T(it.comment || it.description, 300), code: String(it.counterEdrpou || '').replace(/\D/g, ''), iban: ibanN(it.counterIban), no: '' };
  r.id = d.slice(2, 4) + d.slice(5, 7) + hash('mono|' + it.id); return r; };
const okItem = it => it && it.id && +it.time > 0 && Math.abs(+it.amount) >= 1 && (it.currencyCode == null || +it.currencyCode === 980);
// 📩 вебхук: { type:'StatementItem', data:{ account, statementItem } } — лише наші рахунки ФОП
export async function bankHook(env, key, j) {
  if (key !== await hookKey(env)) return [{ error: 'key' }, 403];
  const st = (await env.DB.get('bkapi', 'json')) || {}, acc = st.mono?.acc?.find(a => a.id === String(j?.data?.account || '')), it = j?.data?.statementItem;
  if (!env.MONO_BANK || !acc || j?.type !== 'StatementItem' || !okItem(it)) return [{ ok: true }, 200]; // чуже / не гривня — мовчки 200, інакше mono повторює
  const r = await bankRows(env, { rows: [monoRow(it)], own: acc.iban ? [acc.iban] : [], fmt: 'mono' }, { src: 'mono', who: '🔄 monobank' });
  await L(env, 'bkapi:hook', async () => { const h = (await env.DB.get('bkapi:hook', 'json')) || { n: 0 }; await env.DB.put('bkapi:hook', JSON.stringify({ ts: Date.now(), n: h.n + (r.add || 0) })); });
  return [{ ok: true, add: r.add || 0 }, 200];
}
async function monoPull(tok, a) {
  const to = Math.floor(Date.now() / 1000), from = to - 3 * 86400;
  const l = sbM(tok) ? [] : await mcall(tok, `statement/${a.id}/${from}/${to}`); if (l.error) return l;
  return { rows: (Array.isArray(l) ? l : []).filter(okItem).map(monoRow) };
}

// ---------- ПриватБанк «Автоклієнт» ----------
const pcall = (tok, path) => fetch(PB + path, { headers: { token: tok, 'user-agent': 'ATOM', 'content-type': 'application/json;charset=utf8' }, signal: AbortSignal.timeout(20000) })
  .then(async r => { let j = {}; try { j = JSON.parse(decode(new Uint8Array(await r.arrayBuffer()))); } catch {} return r.ok && j.status !== 'ERROR' ? j : { error: r.status === 401 || r.status === 403 ? 'Приват не приймає токен Автоклієнта' : 'Приват: ' + (j.message || j.error || 'HTTP ' + r.status) }; })
  .catch(() => ({ error: 'ПриватБанк не відповідає' }));
export async function privatCheck(tok) { if (sbP(tok)) return { ok: 1 }; const r = await pcall(tok, 'settings'); return r.error ? r : { ok: 1 }; }
const pDay = s => { const m = String(s || '').match(/^(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const pRow = t => { const d = pDay(t.DAT_OD || t.DAT_KL), s = Math.abs(+String(t.SUM ?? '').replace(',', '.') || 0), r = { d, sum: r2(t.TRANTYPE === 'D' ? -s : s), who: T(t.AUT_CNTR_NAM, 120), pur: T(t.OSND, 300), code: String(t.AUT_CNTR_CRF || '').replace(/\D/g, ''), iban: ibanN(t.AUT_CNTR_ACC), no: T(t.NUM_DOC, 20) };
  r.id = d.slice(2, 4) + d.slice(5, 7) + hash('privat|' + (t.ID || [t.REF, t.REFN, t.DAT_OD, t.SUM].join('|'))); return r; };
async function privatPull(tok) {
  const dmy = d => d.split('-').reverse().join('-'), to = kyiv(), from = kyiv(Date.now() - 3 * 864e5);
  let l = [];
  if (sbP(tok)) l = [{ ID: 'qa-' + to, DAT_OD: to.split('-').reverse().join('.'), SUM: '777.00', TRANTYPE: 'C', CCY: 'UAH', PR_PR: 'r', OSND: 'Тест Автоклієнт', AUT_CNTR_NAM: 'ТОВ Тест', AUT_MY_ACC: 'UA903052990000026007000000001' }];
  else for (let p = 0, f = ''; p < 10; p++) { const r = await pcall(tok, `transactions?startDate=${dmy(from)}&endDate=${dmy(to)}&limit=100${f ? '&followId=' + encodeURIComponent(f) : ''}`); if (r.error) return r;
    l.push(...(r.transactions || [])); if (!r.exist_next_page || !r.next_page_id) break; f = r.next_page_id; }
  l = l.filter(t => (!t.CCY || t.CCY === 'UAH') && (!t.PR_PR || t.PR_PR === 'r') && (!t.FL_REAL || t.FL_REAL === 'r'));
  return { rows: l.map(pRow).filter(r => r.d && r.sum), own: [...new Set(l.map(t => ibanN(t.AUT_MY_ACC)).filter(Boolean))] };
}

// ---------- синхронізація (будильник закладу щогодини; force — кнопка «🔄 Оновити») ----------
export async function bankApiSync(env, { force, only } = {}) {
  const st0 = await env.DB.get('bkapi', 'json'); if (!env.MONO_BANK && !env.PRIVAT_BANK && !st0) return null;
  const st = st0 || {}, today = dayKey(), out = {};
  if (only === 'privat') {} else if (env.MONO_BANK) { const tk = tkOf(env.MONO_BANK); let m = st.mono;
    if (m?.tk !== tk || (force && m.err && !m.acc?.length)) { const r = await monoSetup(env, env.MONO_BANK); m = st.mono = r.error ? { tk, acc: [], err: r.error, ts: Date.now() } : { tk, acc: r.acc, i: 0, day: '', ts: Date.now() }; }
    if (m.acc?.length && (force || m.day !== today)) { const a = m.acc[(m.i || 0) % m.acc.length], r = await monoPull(env.MONO_BANK, a);
      if (r.error) m.err = r.error; else { const x = r.rows.length ? await bankRows(env, { rows: r.rows, own: a.iban ? [a.iban] : [], fmt: 'mono' }, { src: 'mono', who: '🔄 monobank' }) : {}; m.err = ''; m.ts = Date.now(); m.n = x.add || 0; m.i = (m.i || 0) + 1; if (m.i % m.acc.length === 0) m.day = today; out.mono = m.n; } }
  } else delete st.mono;
  if (only === 'mono') {} else if (env.PRIVAT_BANK) { const tk = tkOf(env.PRIVAT_BANK); let p = st.privat; if (p?.tk !== tk) p = st.privat = { tk, day: '' };
    if (force || (p.day !== today && kyivH() >= 7)) { const r = await privatPull(env.PRIVAT_BANK); p.day = today; p.ts = Date.now();
      if (r.error) p.err = r.error; else { const x = r.rows.length ? await bankRows(env, { rows: r.rows, own: r.own, fmt: 'privat' }, { src: 'privat', who: '🔄 ПриватБанк' }) : {}; p.err = ''; p.n = x.add || 0; out.privat = p.n; } }
  } else delete st.privat;
  await env.DB.put('bkapi', JSON.stringify(st));
  return out;
}
// стан для каси / бота / кабінету (без токенів)
export async function bankApiState(env) {
  const [st, h] = await Promise.all([env.DB.get('bkapi', 'json'), env.DB.get('bkapi:hook', 'json')]);
  const m = env.MONO_BANK && st?.mono, p = env.PRIVAT_BANK && st?.privat;
  return { mono: m ? { acc: (m.acc || []).map(a => a.n), err: m.err || '', ts: m.ts || 0, hook: h?.ts || 0, ...(sbM(env.MONO_BANK) ? { test: 1, key: await hookKey(env) } : {}) } : env.MONO_BANK ? { acc: [], err: '', ts: 0, wait: 1 } : null,
    privat: p ? { err: p.err || '', ts: p.ts || 0, n: p.n || 0, ...(sbP(env.PRIVAT_BANK) ? { test: 1 } : {}) } : env.PRIVAT_BANK ? { err: '', ts: 0, wait: 1 } : null };
}
const when = ts => ts ? new Date(ts).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const apiText = a => [a?.mono && `🔄 monobank ${a.mono.acc.join(', ') || ''}: ${a.mono.err ? '⚠️ ' + a.mono.err : a.mono.wait ? 'підключається…' : 'автоматично · остання операція ' + when(a.mono.hook || a.mono.ts)}`,
  a?.privat && `🔄 ПриватБанк: ${a.privat.err ? '⚠️ ' + a.privat.err : a.privat.wait ? 'перше оновлення сьогодні' : 'раз на добу · оновлено ' + when(a.privat.ts)}`].filter(Boolean).join('\n');
// 🔌 відключення mono — прибрати наш вебхук
export async function monoOff(tok) { if (tok && !sbM(tok)) await mcall(tok, 'webhook', { webHookUrl: '' }).catch(() => {}); }
