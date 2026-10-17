// 🌙 Підсумок дня для власника (о 23:00 за Києвом): виручка, чеки, оплати, ЗП, нестача, топ страв.
// Зберігається в `digl` (останні 14 днів) → блок «🌙 Підсумок дня» у кабінеті власника. У Telegram — лише особисто, якщо власник вказав свій chat id (`digchat`). Раз на день: прапорець `dig:<день>`.
const money = n => Math.round(n || 0).toLocaleString('uk-UA').replace(/ /g, ' ') + ' ₴';
const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const dm = d => d.split('-').reverse().join('.');
const pctTxt = (a, b) => { if (!b) return ''; const p = Math.round((a - b) / b * 100); return p ? ` (${p > 0 ? '▲' : '▼'}${Math.abs(p)}% до минулого тижня)` : ' (як минулого тижня)'; };

// чиста функція: підсумок дня → текст (тестується без бази)
export function digText(d) {
  const L = [`🌙 <b>Підсумок дня ${dm(d.day)}</b>`, ''];
  if (!d.n) { L.push('Чеків за день не було.'); if (d.exp) L.push(`💸 Витрати: ${money(d.exp)}`); return L.join('\n'); }
  L.push(`💰 Виручка: <b>${money(d.rev)}</b>${pctTxt(d.rev, d.prevRev)}`, `🧾 Чеків: ${d.n} · середній ${money(d.rev / d.n)}`);
  const pay = [d.cash && `готівка ${money(d.cash)}`, d.card && `картка ${money(d.card)}`, d.onl && `онлайн ${money(d.onl)}`].filter(Boolean);
  if (pay.length) L.push(`💳 ${pay.join(' · ')}`);
  if (d.tip) L.push(`💝 Чайові: ${money(d.tip)}`);
  if (d.disc) L.push(`🏷 Знижки: ${money(d.disc)}`);
  if (d.voids) L.push(`🗑 Скасовано: ${d.voids}${d.voidSum ? ` на ${money(d.voidSum)}` : ''}`);
  if (d.exp) L.push(`💸 Витрати: ${money(d.exp)}`);
  if (d.sal) L.push(`👥 Виплачено ЗП: ${money(d.sal)}`);
  if (d.short) L.push(`⚠️ Нестача за інвентаризацією: ${money(d.short)}`);
  if (d.top?.length) L.push('', '🏆 Топ страв:', ...d.top.map(([n, q, s], i) => `${i + 1}. ${esc(n)} — ${q} шт · ${money(s)}`));
  return L.join('\n');
}

// дані за робочий день (reportRange + склад)
export async function digData(env, day) {
  const o = await import('./ops.js'), prev = new Date(Date.parse(day + 'T12:00:00Z') - 7 * 864e5).toISOString().slice(0, 10);
  const [R, P] = await Promise.all([o.reportRange(env, day, day), o.reportRange(env, prev, prev)]);
  const sum = (l, f) => (l || []).reduce((a, x) => a + (f(x) || 0), 0), net = c => c.sum - (c.tip || 0), dishes = {};
  for (const c of R.checks) for (const [n, q, s] of c.dishes || []) { const x = dishes[n] ||= [n, 0, 0]; x[1] += q; x[2] += s; }
  const cnt = ((await env.DB.get('cntl', 'json')) || []).filter(c => c.day === day);
  return {
    day, n: R.checks.length, rev: sum(R.checks, net), prevRev: sum(P?.checks, net), cash: sum(R.checks, c => c.cash), card: sum(R.checks, c => c.card), onl: sum(R.checks, c => c.onl),
    tip: sum(R.checks, c => c.tip), disc: sum(R.checks, c => c.disc), voids: R.voids.length, voidSum: sum(R.voids, v => v.sum),
    exp: sum(R.exp, e => e.sum), sal: sum((R.mov || []).filter(m => m.type === 'salc' || m.type === 'salk'), m => m.sum), short: sum(cnt, c => c.short),
    top: Object.values(dishes).sort((a, b) => b[2] - a[2]).slice(0, 3),
  };
}

// ⏰ з cron (кожні 5 хв): після 23:00 за Києвом (до кінця робочого дня) — рахуємо, зберігаємо, за потреби шлемо власнику особисто
export async function digDaily(env) {
  const o = await import('./ops.js'), c = await o.getCfg(env);
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Kyiv', hour: 'numeric', hour12: false }) % 24; if (h < 23 && h >= c.dayH) return;
  const day = o.dayKey(), flag = 'dig:' + day; if (await env.DB.get(flag)) return;
  await env.DB.put(flag, '1', { expirationTtl: 3 * 86400 }); // спершу прапорець: збій не повинен давати дублі кожні 5 хв
  await digRun(env, day, true);
}
// порахувати й зберегти підсумок дня (tgSend — слати власнику особисто, якщо вказав chat id)
export async function digRun(env, day, tgSend) {
  const d = await digData(env, day), log = ((await env.DB.get('digl', 'json')) || []).filter(x => x.day !== day);
  log.push(d); await env.DB.put('digl', JSON.stringify(log.sort((a, b) => a.day < b.day ? -1 : 1).slice(-14)));
  const chat = tgSend && await env.DB.get('digchat'); if (chat && env.BOT_TOKEN) await (await import('./ops.js')).tg(env, 'sendMessage', { chat_id: chat, text: digText(d), parse_mode: 'HTML' }).catch(() => {});
  return d;
}
// для кабінету власника: останні дні (найновіші першими) і чи ввімкнено Telegram
export async function digList(env) { return { list: ((await env.DB.get('digl', 'json')) || []).slice().reverse().map(d => ({ ...d, text: digText(d) })), tg: !!(await env.DB.get('digchat')) }; }
export async function digChat(env, chat) { chat = String(chat || '').trim(); if (chat && !/^-?\d{5,15}$/.test(chat)) return { error: 'Chat id — число (дізнатись: @userinfobot)' }; if (chat) await env.DB.put('digchat', chat); else await env.DB.delete('digchat'); return { ok: true, tg: !!chat }; }
