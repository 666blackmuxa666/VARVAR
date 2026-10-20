// 🧮 Кабінет бухгалтера «Мої клієнти» (роль acc) + запрошення бухгалтера власником (🏪 Заклади → 🧮 Бухгалтер).
// Сервер: owner.js (accCli, accExp, accList, accInv, accDel) → заклад /__int/acc (acct.js accSum / acctExport). Лише читання.
window.OWNACC = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => `${Math.round(n || 0).toLocaleString('uk-UA')} ₴`;
  const pad = n => String(n).padStart(2, '0'), dd = d => d ? d.split('-').reverse().join('.') : '—';
  const monthR = (y, m) => { const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return [`${y}-${pad(m)}-01`, `${y}-${pad(m)}-${pad(last)}`]; };
  const PER = { m: '📅 Цей місяць', pm: '⏮ Минулий місяць', q: '🗓 Квартал' };
  let C, P = 'm', D = null, busy = false;
  function range() {
    const n = new Date(), y = n.getFullYear(), m = n.getMonth() + 1;
    if (P === 'pm') return m === 1 ? monthR(y - 1, 12) : monthR(y, m - 1);
    if (P === 'q') { const q0 = Math.floor((m - 1) / 3) * 3 + 1; return [monthR(y, q0)[0], monthR(y, q0 + 2)[1]]; }
    return monthR(y, m);
  }
  async function load() { if (busy) return; busy = true; const [from, to] = range(); try { D = { key: P, ...(await C.api('accCli', { from, to })) }; } catch (e) { D = { key: P, list: [] }; if (e.message !== 'auth') C.toast('⚠️ ' + e.message); } busy = false; C.render(); }
  function card(v) {
    if (v.error) return `<div class="card"><div class="h"><b>${esc(v.name)}</b></div><div class="muted">⚠️ ${esc(v.error)}</div></div>`;
    const s = v.sales || {}, b = v.bank || {}, warn = [b.q ? `⚠️ на підтвердження: <b>${b.q}</b>` : '', b.miss ? `💳 не надійшла безготівка: ${b.miss} дн.` : '', b.missAg ? `🛵 не надійшла виплата агрегатора: ${b.missAg}` : ''].filter(Boolean);
    return `<div class="card acc-v"><h3 style="margin:0">${esc(v.name)}</h3><div class="muted" style="font-size:13px;margin-bottom:6px;overflow-wrap:anywhere">🧾 ${esc(v.payer?.n || 'платника не вказано')}</div>
      <div class="kv"><span>🧾 Продажі · ${s.n || 0} чеків</span><b>${money(s.sum)}</b></div>
      <div class="muted" style="font-size:13px">💵 ${money(s.cash)} · 💳 ${money(s.card)}${s.onl ? ` (з них 🌐 онлайн ${money(s.onl)})` : ''}${s.tip ? ` · 💝 чайові ${money(s.tip)}` : ''}${v.exp ? ` · 💸 витрати з каси ${money(v.exp)}` : ''}</div>
      <div class="kv"><span>🏦 Банк · остання виписка ${dd(b.last)}</span><span>${b.in || b.out ? `+${money(b.in)} / −${money(-b.out)}` : '<span class="muted">виписок немає</span>'}</span></div>
      ${b.fee ? `<div class="muted" style="font-size:13px">комісії еквайрингу й агрегаторів: ${money(b.fee)}</div>` : ''}
      ${warn.length ? `<div class="acc-w">${warn.join('<br>')}</div>` : ''}
      ${(v.tax?.next || []).length ? `<div class="acc-t">${v.tax.next.map(e => `<div class="kv"><span>${esc(e.t)}</span><small class="${e.left <= 3 ? 'red' : 'muted'}">${dd(e.d)}${e.left < 0 ? ' · прострочено' : e.left === 0 ? ' · сьогодні' : ` · ${e.left} дн.`}</small></div>`).join('')}</div>` : v.tax?.kind ? '' : '<div class="muted" style="font-size:13px">📅 податковий календар не налаштовано</div>'}
      <div class="btnrow"><button class="btn sm primary" data-acc="csv" data-v="${esc(v.id)}">📄 Експорт CSV</button><button class="btn sm" data-acc="pdf" data-v="${esc(v.id)}">🖨 PDF / друк</button></div></div>`;
  }
  function view(ctx) {
    C = ctx; if (!D || D.key !== P) { load(); }
    const [from, to] = range(), L = D?.key === P ? D.list : null;
    return `<h2>🧮 Мої клієнти</h2><div class="chips">${Object.entries(PER).map(([k, l]) => `<button class="${P === k ? 'on' : ''}" data-acc="per" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="muted" style="margin:6px 0 10px;font-size:13px">${dd(from)} — ${dd(to)} · лише перегляд і вивантаження: продажі, оплати, накладні, списання, витрати, ЗП, банк</div>
      ${!L ? '<div class="muted">…</div>' : `<div class="grid">${L.map(card).join('') || '<div class="muted">Власники ще не відкрили вам жодного закладу</div>'}</div>`}`;
  }
  const csvOf = x => x.sections.map(s => [s.title, s.head, ...s.rows].map(r => Array.isArray(r) ? r.map(v => { const t = String(v ?? ''); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(';') : r).join('\r\n')).join('\r\n\r\n');
  async function exp(id, how) {
    const [from, to] = range(), name = (D?.list || []).find(v => v.id === id)?.name || id;
    let w = how === 'pdf' ? window.open('', '_blank') : null; if (how === 'pdf' && !w) return C.toast('⚠️ Дозвольте спливаюче вікно');
    let x; try { x = await C.api('accExp', { venue: id, from, to }); } catch (e) { w?.close(); return C.toast('⚠️ ' + e.message); }
    if (how === 'csv') { const f = new Blob(['﻿' + csvOf(x)], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = `${id}-${from}_${to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); return; }
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(name)} ${esc(from)} — ${esc(to)}</title><style>body{font:12px Arial;margin:18px}h1{font-size:16px}h2{font-size:13px;margin:16px 0 4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:3px 6px;text-align:left}th{background:#eee}td:not(:first-child){text-align:right}@media print{h2{break-after:avoid}tr{break-inside:avoid}}</style><h1>${esc(name)} · ${esc(from)} — ${esc(to)}</h1>`
      + x.sections.map(s => `<h2>${esc(s.title)}</h2><table><tr>${s.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${s.rows.map(r => `<tr>${r.map(v => `<td>${esc(String(v ?? ''))}</td>`).join('')}</tr>`).join('')}</table>`).join('') + '<script>setTimeout(function(){print()},300)<\/script>');
    w.document.close();
  }
  // 👑 власник: хто з бухгалтерів має доступ до закладу, запросити / прибрати
  async function manage(ctx, id, name) {
    C = ctx; let l = []; try { l = (await C.api('accList', { venue: id })).list; } catch (e) { return C.toast('⚠️ ' + e.message); }
    const bg = C.modal(`🧮 Бухгалтер · ${esc(name)}`, `<div class="muted" style="font-size:13px;margin-bottom:8px">Бухгалтер отримує окремий вхід у кабінет: бачить продажі, банк, податкові дати й вивантажує звіти. Каси, налаштувань і персоналу не бачить, нічого не змінює.</div>
      ${l.map(a => `<div class="kv"><span>${esc(a.name)}<br><small class="muted">${esc(a.email)}${a.unverified ? ' · ⏳ ще не задав пароль' : ''}</small></span><button type="button" class="btn sm red" data-accdel="${esc(a.email)}">Прибрати</button></div>`).join('') || '<div class="muted" style="margin-bottom:8px">Бухгалтера ще не запрошено</div>'}
      <label>Email бухгалтера<input name="email" type="email" required maxlength="100" placeholder="buh@example.com"></label><label>Ім'я<input name="name" maxlength="60" placeholder="Напр.: Олена, бухгалтерка"></label>`,
      async f => { const r = await C.api('accInv', { venue: id, email: f.email.value, name: f.name.value }); C.toast(r.acc.unverified ? (r.mail ? '✉️ Запрошення надіслано' : '✅ Доступ відкрито — пошта не налаштована, попросіть бухгалтера натиснути «Забули пароль»') : '✅ Доступ відкрито'); });
    bg.addEventListener('click', async e => { const b = e.target.closest('[data-accdel]'); if (!b) return; e.stopPropagation();
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Точно прибрати?'; return; }
      try { await C.api('accDel', { venue: id, email: b.dataset.accdel }); C.toast('🧮 Доступ прибрано'); bg.remove(); manage(ctx, id, name); } catch (x) { C.toast('⚠️ ' + x.message); } });
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-acc]'); if (!b || !C) return; const a = b.dataset.acc;
    if (a === 'per') { P = b.dataset.v; C.render(); } else if (a === 'csv' || a === 'pdf') exp(b.dataset.v, a); });
  return { view, manage, reset: () => { D = null; } };
})();
