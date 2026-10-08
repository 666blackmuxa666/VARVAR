// 🧮 Розрахунок у Telegram-боті (паритет з касою): залишки, закупівля, накладні з фото, списання, заготовки, інвентаризація, техкарти, фудкост.
import { esc, money, tg, dayKey } from './ops.js';
import { getMenu } from './menu.js';
import { WH, fq, norm, getIng, getCards, purchaseList, purchaseText, adjust, transfer, produce, invoiceSave, invList, invPay, matchLines, countSave, countFinish, countGet, ingSave, cardSave, cardResolver, cardCost, unitCost, costReport, r3 } from './stock.js';
import { aiInvoice } from './ai.js';

export const CALC_HELP = `🧮 <b>Розрахунок — команди</b>
📷 Фото з підписом <code>накладна</code> — розпізнаю й запишу на склад (кілька сторінок — кілька фото підряд)
<code>списати сир фета 0.3 зіпсувався</code>
<code>+ сир фета 2</code> — оприбуткувати без накладної
<code>перемістити лимон 1 в бар</code>
<code>заготовка соус зелений 3</code>
<code>інв кухня філе 14.5</code> … <code>інв кухня кінець</code>
<code>техкарта Курочка: коржик 1, філе 130 г, салат 30 г</code>
<code>штрихкод 4820000123456 сир фета</code> — привʼязати (без назви — знайти продукт)
<code>залишки</code> · <code>закупівля</code>
Кількість можна в г / мл: <code>250 г</code>`;

const tot = x => r3((x.st?.k || 0) + (x.st?.b || 0));
// «сир фета 0.3 кг зіпсувався» → { x, q, rest }
function findQ(l, s) {
  const m = String(s).match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(кг|г|гр|л|мл|шт)?\.?(?:\s+(.*))?$/i); if (!m) return null;
  const x = pick(l, m[1]); if (!x) return { miss: m[1] };
  return { x, q: toU(x, m[2], m[3]), rest: (m[4] || '').trim() };
}
function pick(l, s) {
  const name = norm(s), cands = l.filter(x => !x.off && !x.grp);
  return cands.find(y => norm(y.n) === name) || cands.find(y => norm(y.n).startsWith(name)) || cands.find(y => norm(y.n).includes(name)) || cands.find(y => name.split(' ').every(w => norm(y.n).includes(w)));
}
// «250 г» для продукту в кг → 0.25
function toU(x, n, u) { let q = +String(n).replace(',', '.'); u = (u || '').toLowerCase(); if ((u === 'г' || u === 'гр') && x.u === 'кг') q /= 1000; if (u === 'мл' && x.u === 'л') q /= 1000; return r3(q); }

export async function calcView(env) {
  const [l, buy, inv] = await Promise.all([getIng(env), purchaseList(env), invList(env, 1)]);
  const live = l.filter(x => !x.off), val = live.reduce((a, x) => a + Math.max(0, tot(x)) * (x.cost || 0), 0);
  const low = buy.flatMap(g => g.items), debts = Object.entries(inv.sups || {}).filter(([, s]) => s.debt > 0);
  return { text: [`🧮 <b>Розрахунок</b>`, `📦 На складах: <b>${money(val)}</b> · продуктів ${live.length}`,
    low.length ? `⚠️ Нижче мінімуму: ${low.slice(0, 8).map(i => esc(i.n)).join(', ')}${low.length > 8 ? '…' : ''}` : '✅ Усього вистачає',
    debts.length ? `💸 Борги постачальникам: ${debts.map(([n, s]) => `${esc(n)} ${money(s.debt)}`).join(', ')}` : '', '', CALC_HELP].filter(x => x !== '').join('\n'),
    markup: { inline_keyboard: [[{ text: '📦 Залишки', callback_data: 'skst' }, { text: '🛒 Закупівля', callback_data: 'skbuy' }], [{ text: '🧾 Накладні', callback_data: 'skinvl' }, { text: '📊 Фудкост · 7 днів', callback_data: 'skrep:w' }],
      [{ text: '📝 Інвентаризація', callback_data: 'skcnm' }, { text: '🍳 Заготовки', callback_data: 'skprl' }], [{ text: '🔗 Штрихкод', callback_data: 'skbc' }]] } };
}
export async function stockText(env) {
  const l = (await getIng(env)).filter(x => !x.off && !x.grp).sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.n.localeCompare(b.n));
  if (!l.length) return { text: '📦 Склад порожній. Надішліть фото накладної з підписом «накладна» — продукти створяться самі.' };
  let cat = '', out = ['📦 <b>Залишки</b>'];
  for (const x of l) { if (x.cat !== cat) out.push(`\n<b>${esc(cat = x.cat || 'Інше')}</b>`); const t = tot(x), lo = x.min > 0 && t < x.min; out.push(`${lo ? '🔴' : '•'} ${esc(x.n)} — ${fq(t, x.u)}${x.st?.k && x.st?.b ? ` (К ${fq(x.st.k, x.u)} · Б ${fq(x.st.b, x.u)})` : ''}`); }
  return { text: out.join('\n').slice(0, 4000) };
}

// текстові команди адміна; null — не наша команда
export async function stockCmd(text, env, who) {
  const t = text.trim(), low = t.toLowerCase(); let m;
  if (/^(залишки|склад)$/.test(low)) return stockText(env);
  if (/^(закупівля|закупка|що купити)$/.test(low)) return { text: '🛒 <b>Закупівля</b>\n\n' + purchaseText(await purchaseList(env)) };
  if (/^(розрахунок|техкарти|калькуляція)$/.test(low)) return calcView(env);
  if ((m = t.match(/^(?:списати|спиши)\s+(.+)$/i))) {
    const f = findQ(await getIng(env), m[1]); if (!f) return { text: 'Формат: <code>списати сир фета 0.3 зіпсувався</code>' }; if (f.miss) return { text: `❓ Не знайшов продукт «${esc(f.miss)}»` };
    if (!f.rest) return { text: 'Вкажіть причину в кінці, напр.: <code>списати сир фета 0.3 зіпсувався</code>' };
    const r = await adjust(env, { id: f.x.id, q: -f.q, note: f.rest }, who); if (r.error) return { text: '⚠️ ' + r.error };
    return { text: `🗑 Списано: <b>${esc(f.x.n)}</b> ${fq(f.q, f.x.u)} — ${esc(f.rest)}\nЗалишок: ${fq(tot(r.x), r.x.u)}` };
  }
  if ((m = t.match(/^\+\s*(.+)$/))) {
    const f = findQ(await getIng(env), m[1]); if (!f) return null; if (f.miss) return { text: `❓ Не знайшов продукт «${esc(f.miss)}»` };
    const r = await adjust(env, { id: f.x.id, q: f.q, note: f.rest || 'оприбутковано' }, who); if (r.error) return { text: '⚠️ ' + r.error };
    return { text: `➕ <b>${esc(f.x.n)}</b> +${fq(f.q, f.x.u)}\nЗалишок: ${fq(tot(r.x), r.x.u)}` };
  }
  if ((m = t.match(/^перемісти(?:ти)?\s+(.+?)\s+(?:в|на|у)\s+(бар|кухн\S*)$/i))) {
    const f = findQ(await getIng(env), m[1]); if (!f || f.miss) return { text: `❓ Не знайшов продукт «${esc(f?.miss || m[1])}»` };
    const to = /^бар/i.test(m[2]) ? 'b' : 'k', r = await transfer(env, { id: f.x.id, from: to === 'b' ? 'k' : 'b', q: f.q }, who); if (r.error) return { text: '⚠️ ' + r.error };
    return { text: `⇄ <b>${esc(f.x.n)}</b> ${fq(f.q, f.x.u)} → ${WH[to]}` };
  }
  if ((m = t.match(/^заготовка\s+(.+)$/i))) {
    const f = findQ((await getIng(env)).filter(x => x.semi), m[1]); if (!f) return { text: 'Формат: <code>заготовка соус зелений 3</code>' }; if (f.miss) return { text: `❓ Немає заготовки «${esc(f.miss)}» (створіть у касі: 🧮 Розрахунок → 🍳 Заготовки)` };
    const r = await produce(env, { id: f.x.id, q: f.q }, who); if (r.error) return { text: '⚠️ ' + r.error };
    return { text: `🍳 Приготовано: <b>${esc(f.x.n)}</b> +${fq(f.q, f.x.u)} (сировина списана за техкартою)` };
  }
  if ((m = t.match(/^інв(?:ентаризація)?\s+(кухня|бар)\s+(.+)$/i))) {
    const wh = /^бар/i.test(m[1]) ? 'b' : 'k';
    if (/^(кінець|завершити|все)$/i.test(m[2].trim())) {
      const r = await countFinish(env, wh, who); if (r.error) return { text: '⚠️ ' + r.error };
      return { text: `📝 Інвентаризацію (${WH[wh]}) завершено: нестача ${money(-r.doc.short)}, надлишок ${money(r.doc.over)}` };
    }
    const f = findQ(await getIng(env), m[2]); if (!f || f.miss) return { text: f?.miss ? `❓ Не знайшов «${esc(f.miss)}»` : 'Формат: <code>інв кухня філе 14.5</code>' };
    const d = await countSave(env, wh, { [f.x.id]: f.q }, who), sys = f.x.st?.[wh] || 0, diff = r3(f.q - sys);
    return { text: `📝 ${WH[wh]}: <b>${esc(f.x.n)}</b> факт ${fq(f.q, f.x.u)} (система ${fq(sys, f.x.u)}${diff ? `, ${diff > 0 ? '+' : ''}${fq(diff, f.x.u)}` : ', ✓'})\nВнесено позицій: ${Object.keys(d.f).length}. Закінчити: <code>інв ${wh === 'b' ? 'бар' : 'кухня'} кінець</code>` };
  }
  if ((m = t.match(/^(?:штрихкод|шк)\s+(\d{6,})\s*(.*)$/i))) return bcBind(env, m[1], m[2].trim(), who);
  if ((m = t.match(/^техкарта\s+(.+?)\s*:\s*(.+)$/is))) {
    const menu = await getMenu(env), res = cardResolver(menu), r = res(m[1].trim()) || (() => { const n = norm(m[1]); const it = menu.categories.flatMap(c => c.items).find(i => norm(i.name.uk) === n); return it ? { key: it.id, name: it.name.uk } : null; })();
    if (!r) return { text: `❓ Немає в меню страви «${esc(m[1])}»` };
    const l = await getIng(env), items = [], miss = [];
    for (const part of m[2].split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)) { const f = findQ(l, part); if (!f || f.miss) miss.push(part); else items.push({ id: f.x.id, q: f.q, ...(f.x.loss ? { loss: f.x.loss } : {}) }); }
    if (miss.length) return { text: `❓ Не знайшов продукти: ${miss.map(esc).join(', ')}\nСпершу додайте їх (накладною або в касі), потім повторіть.` };
    const c = await cardSave(env, r.key, { items }); if (c.error) return { text: '⚠️ ' + c.error };
    const im = new Map(l.map(x => [x.id, x])), cards = await getCards(env), cost = cardCost(c.card, im, cards), price = r.price || 0;
    return { text: `📋 Техкарта <b>${esc(r.name || m[1])}</b> збережена:\n${items.map(i => `• ${esc(im.get(i.id).n)} — ${fq(i.q, im.get(i.id).u)}`).join('\n')}\n\nСобівартість: <b>${money(cost)}</b>${price ? ` · фудкост ${Math.round(cost / price * 100)}%` : ''}` };
  }
  return null;
}

// 📷 фото накладної → чернетка (сторінки підряд додаються в ту саму чернетку 15 хв)
export async function invPhoto(m, env, uid) {
  const ph = m.photo[m.photo.length - 1];
  const f = await (await tg(env, 'getFile', { file_id: ph.file_id })).json();
  const buf = new Uint8Array(await (await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.result.file_path}`)).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const r = await aiInvoice(env, { images: [btoa(bin)] }); // фото далі ніде не зберігається
  if (r.error) return { text: '⚠️ ' + r.error };
  const k = 'invd:' + uid, prev = await env.DB.get(k, 'json');
  const lines = await matchLines(env, r.sup || prev?.sup || '', r.lines);
  const d = prev ? { ...prev, lines: [...prev.lines, ...lines], total: (prev.total || 0) + (r.total || 0) } : { sup: r.sup, no: r.no, date: r.date, total: r.total, lines };
  await env.DB.put(k, JSON.stringify(d), { expirationTtl: 900 });
  return draftView(d);
}
const OK = { bc: '🟢', mem: '🟢', name: '🟢', sure: '🟢', ok: '🟢', guess: '❓', '': '🔵' };
function draftView(d) {
  const sum = d.lines.reduce((a, l) => a + (+l.sum || 0), 0);
  return { text: `🧾 <b>Накладна</b> ${esc(d.sup || '')}${d.no ? ' №' + esc(d.no) : ''}\n\n${d.lines.map((l, i) => `${OK[l.ok || ''] || '🔵'} ${i + 1}. ${esc(l.n)}${l.ok === 'guess' && l.id ? ` → <b>${esc(l.c?.find(c => c.id === l.id)?.n || '')}</b>?` : ''} — ${l.q} ${esc(l.u || '')} · ${money(l.sum)}`).join('\n')}\n\nРазом: <b>${money(sum)}</b>${d.total && Math.abs(d.total - sum) > 1 ? ` · ⚠️ у документі ${money(d.total)}` : ''}\n🟢 впізнано · ❓ перевірте — оберіть кнопкою нижче · 🔵 новий продукт — створю сам\nНаступна сторінка — ще одне фото з підписом «накладна». Точно зіставити — у касі (🧮 → 🧾).`,
    markup: { inline_keyboard: [...candRows(d), [{ text: '✅ Записати · 💵 з каси', callback_data: 'skis:cash' }, { text: '💳 з картки', callback_data: 'skis:card' }], [{ text: '⏳ В борг', callback_data: 'skis:debt' }, { text: '❌ Скасувати', callback_data: 'skix' }]] } };
}
// ❓ сумнівні рядки: кнопки 2–3 кандидатів + «новий» (skim:<рядок>:<id|new>); вибір запамʼятається в al при записі
const candRows = d => d.lines.map((l, i) => (l.ok === 'guess' || (!l.id && l.ok === '')) && l.c?.length ? [...l.c.slice(0, 3).map(c => ({ text: `${i + 1}. ${c.id === l.id ? '✅ ' : ''}${c.n}`.slice(0, 40), callback_data: `skim:${i}:${c.id}` })), ...(l.id ? [{ text: `${i + 1}. ➕ новий`, callback_data: `skim:${i}:new` }] : [])] : null).filter(Boolean).slice(0, 10);
const unitOf = u => /^(л|мл|l|ml)/i.test(u || '') ? 'л' : /^(шт|уп|ящ|пач|пл|бут|бан|pcs)/i.test(u || '') ? 'шт' : 'кг';

// кнопки «sk…»; повертає { text, markup, edit? } або null
export async function stockCallback(act, arg, env, uid, who) {
  if (act === 'skst') return stockText(env);
  if (act === 'skbuy') return { text: '🛒 <b>Закупівля</b>\n\n' + purchaseText(await purchaseList(env)) };
  if (act === 'skinvl') {
    const { list, sups } = await invList(env, 1), debts = Object.entries(sups).filter(([, s]) => s.debt > 0);
    return { text: `🧾 <b>Накладні</b> (цей місяць)\n${list.slice(0, 20).map(x => `${x.del ? '🗑' : x.pay === 'debt' && !x.paid ? '⏳' : '✅'} ${x.day.slice(8)}.${x.day.slice(5, 7)} ${esc(x.sup)}${x.no ? ' №' + esc(x.no) : ''} — ${money(x.total)}`).join('\n') || 'Ще немає'}${debts.length ? `\n\n💸 Борги: ${debts.map(([n, s]) => `${esc(n)} ${money(s.debt)}`).join(', ')}` : ''}`,
      markup: { inline_keyboard: list.filter(x => !x.del && x.pay === 'debt' && !x.paid).slice(0, 8).map(x => [{ text: `💸 Оплатити ${x.sup} · ${Math.round(x.total)}`.slice(0, 60), callback_data: 'skip:' + x.id }]) } };
  }
  if (act === 'skip') return { text: '💸 Звідки оплатили?', markup: { inline_keyboard: [[{ text: '💵 З каси', callback_data: `skipp:${arg}:cash` }, { text: '💳 З картки', callback_data: `skipp:${arg}:card` }]] } };
  if (act === 'skrep') {
    const now = Date.now(), d = n => dayKey(now - n * 86400e3), r = await costReport(env, d(6), d(0));
    if (!r) return { text: 'Немає даних' };
    const fc = r.revKnown ? Math.round(r.cogs / r.revKnown * 1000) / 10 : null, ME = { star: '⭐', horse: '🐴', puzzle: '❓', dog: '🐶' };
    const me = Object.entries(ME).map(([k, ic]) => { const l = r.rows.filter(x => x.me === k).sort((a, b) => b.q - a.q).slice(0, 5); return l.length ? `${ic} ${l.map(x => esc(x.n)).join(', ')}` : ''; }).filter(Boolean);
    return { text: [`📊 <b>Фудкост за 7 днів</b>`, `Виручка ${money(r.revenue)} · собівартість ${money(r.cogs)}${r.revKnown < r.revenue ? ` (страви з техкартами: ${money(r.revKnown)})` : ''}`, `Фудкост: <b>${fc ?? '—'}%</b> (ціль ${r.foodCost}%) · валовий прибуток ${money(r.revKnown - r.cogs)}`,
      r.offSum ? `🗑 Списано: ${money(r.offSum)}${r.off.length ? ' — ' + r.off.slice(0, 4).map(([k, v]) => `${esc(k)} ${money(v)}`).join(', ') : ''}` : '', r.cnt.n ? `📝 Інвентаризацій: ${r.cnt.n} · нестача ${money(-r.cnt.short)} · надлишок ${money(r.cnt.over)}` : '',
      me.length ? `\n<b>Меню-інженерія</b>\n${me.join('\n')}\n⭐ зірки · 🐴 популярні, мало заробляють · ❓ вигідні, рідко беруть · 🐶 прибрати/переробити` : '', r.noCard ? `\n⚠️ Без техкарти: ${r.noCard} страв — заповніть у касі (🧮 → 📋)` : ''].filter(Boolean).join('\n') };
  }
  return null;
}
export async function stockCallbackW(act, arg, opt, env, uid, who) { // з записом
  if (act === 'skipp') { const r = await invPay(env, arg, opt === 'card' ? 'card' : 'cash', who); return { text: r ? `💸 Оплачено: ${esc(r.sup)} ${money(r.total)} ${opt === 'card' ? 'з картки' : 'з каси'} — записано у витрати` : 'Вже оплачено' }; }
  if (act === 'skim') { // вибір кандидата для рядка чернетки
    const k = 'invd:' + uid, d = await env.DB.get(k, 'json'), l = d?.lines[+arg]; if (!l) return { text: 'Чернетка застаріла — надішліть фото ще раз' };
    if (opt === 'new') { l.id = null; l.add ||= { n: (l.p || l.n).slice(0, 60), u: l.pu || unitOf(l.u), home: l.bar ? 'b' : 'k', cat: l.cat || 'Інше' }; l.ok = ''; }
    else { const c = l.c?.find(z => z.id === opt); if (c) { l.id = opt; delete l.add; l.f = /^(г|гр|мл)\.?$/i.test(l.u || '') && c.u !== 'шт' ? 0.001 : l.pq && l.pu === c.u ? l.pq : 1; l.ok = 'ok'; } }
    delete l.c; await env.DB.put(k, JSON.stringify(d), { expirationTtl: 900 }); return draftView(d);
  }
  if (act === 'skix') { await env.DB.delete('invd:' + uid); return { text: '❌ Накладну скасовано' }; }
  if (act === 'skis') {
    const d = await env.DB.get('invd:' + uid, 'json'); if (!d) return { text: 'Чернетка застаріла — надішліть фото ще раз' };
    const lines = d.lines.map(l => ({ id: l.id || null, q: l.q, f: l.f || (l.id ? 1 : 1), sum: l.sum, src: l.n, ...(l.id ? {} : { add: l.add || { n: l.n.replace(/\s+\d+([.,]\d+)?\s*(кг|г|л|мл|шт)\.?$/i, '').trim().slice(0, 60), u: unitOf(l.u), home: 'k', cat: 'Інше' } }) }));
    const r = await invoiceSave(env, { sup: d.sup, no: d.no, date: d.date, pay: arg, src: 'photo', lines }, who);
    if (r.error) return { text: '⚠️ ' + r.error };
    await env.DB.delete('invd:' + uid);
    return { text: `✅ Накладну записано: ${esc(r.inv.sup)} — ${money(r.inv.total)} · ${r.inv.lines.length} поз. · ${{ cash: '💵 з каси', card: '💳 з картки', debt: '⏳ в борг' }[r.inv.pay]}${r.alerts.length ? `\n🔺 Подорожчало: ${r.alerts.map(a => `${esc(a.n)} +${a.pct}%`).join(', ')}` : ''}` };
  }
  return null;
}

// ---------- 📝 інвентаризація, 🍳 заготовки, 🔗 штрихкоди — кнопками (паритет з касою) ----------
const ST_TTL = { expirationTtl: 1800 };
async function countView(env, wh) {
  const [d, l] = await Promise.all([countGet(env, wh), getIng(env)]), im = new Map(l.map(x => [x.id, x])), rows = Object.entries(d.f).map(([id, q]) => [im.get(id), q]).filter(([x]) => x);
  return { text: [`📝 <b>Інвентаризація · ${WH[wh]}</b>`, rows.length ? rows.map(([x, q]) => { const sys = r3(x.st?.[wh] || 0), df = r3(q - sys); return `• ${esc(x.n)} — факт ${fq(q, x.u)} (система ${fq(sys, x.u)}${df ? `, ${df > 0 ? '+' : ''}${fq(df, x.u)}` : ', ✓'})`; }).join('\n') : 'Ще нічого не внесено.',
    '', 'Надсилайте факт рядками: <code>філе 14.5</code>, <code>лимон 800 г</code> (можна кілька рядків в одному повідомленні). Не внесені продукти не змінюються.'].join('\n').slice(0, 4000),
    markup: { inline_keyboard: [[{ text: '✅ Завершити й записати', callback_data: 'skcf:' + wh }, { text: '🔄 Оновити', callback_data: 'skcn:' + wh }]] } };
}
async function bcBind(env, code, name, who) {
  const l = await getIng(env), had = l.find(y => !y.off && (y.bc || []).includes(code));
  if (!name) return { text: had ? `🔎 ${code} → <b>${esc(had.n)}</b> (${fq(tot(had), had.u)})` : `❓ Штрихкод ${code} ні до чого не привʼязаний. Напишіть: <code>штрихкод ${code} назва продукту</code>` };
  const x = pick(l, name); if (!x) return { text: `❓ Не знайшов продукт «${esc(name)}»` };
  if (had && had.id !== x.id) return { text: `⚠️ Цей штрихкод уже привʼязаний до «${esc(had.n)}»` };
  if (had) return { text: `✔ Вже привʼязано до <b>${esc(x.n)}</b>` };
  const r = await ingSave(env, { ...x, bc: [...(x.bc || []), code] }, who); if (r.error) return { text: '⚠️ ' + r.error };
  return { text: `🔗 Штрихкод ${code} привʼязано: <b>${esc(r.x.n)}</b>` };
}
// кнопки (з записом стану очікування вводу st:<uid>)
export async function stockCallbackX(act, arg, env, uid, who) {
  if (act === 'skcnm') return { text: '📝 Інвентаризація — який склад?', markup: { inline_keyboard: [[{ text: WH.k, callback_data: 'skcn:k' }, { text: WH.b, callback_data: 'skcn:b' }]] } };
  if (act === 'skcn') { const wh = arg === 'b' ? 'b' : 'k'; await env.DB.put('st:' + uid, 'skcn:' + wh, ST_TTL); return countView(env, wh); }
  if (act === 'skcf') { const wh = arg === 'b' ? 'b' : 'k', r = await countFinish(env, wh, who); if (r.error) return { text: '⚠️ ' + r.error }; await env.DB.delete('st:' + uid);
    return { text: `📝 Інвентаризацію (${WH[wh]}) завершено: позицій ${r.doc.lines.length} · нестача ${money(-r.doc.short)} · надлишок ${money(r.doc.over)}` }; }
  if (act === 'skprl') { const l = (await getIng(env)).filter(x => x.semi && !x.off), cards = await getCards(env);
    if (!l.length) return { text: '🍳 Заготовок немає — створіть у касі: 🧮 Розрахунок → 🍳 Заготовки' };
    return { text: '🍳 <b>Заготовки</b> — що приготували? (⚠️ — немає техкарти)', markup: { inline_keyboard: l.slice(0, 40).map(x => [{ text: `${cards['semi:' + x.id]?.yield > 0 ? '' : '⚠️ '}${x.n} · ${fq(tot(x), x.u)}`.slice(0, 60), callback_data: 'skpr:' + x.id }]) } }; }
  if (act === 'skpr') { const x = (await getIng(env)).find(y => y.id === arg && y.semi); if (!x) return { text: 'Не знайдено' };
    await env.DB.put('st:' + uid, 'skpr:' + x.id, ST_TTL); return { text: `🍳 <b>${esc(x.n)}</b>: скільки приготували? (у ${x.u}, можна <code>500 г</code>)` }; }
  if (act === 'skbc') { await env.DB.put('st:' + uid, 'skbc', ST_TTL); return { text: '🔗 Надішліть штрихкод і назву продукту: <code>4820000123456 сир фета</code>\nАбо лише код — покажу, до чого привʼязаний.' }; }
  return null;
}
// текст у стані очікування (st: бот уже видалив); null — не наш стан
export async function stockState(state, text, env, uid, who) {
  const [k, a] = state.split(':');
  if (k === 'skcn') {
    const wh = a === 'b' ? 'b' : 'k', l = await getIng(env), f = {}, miss = [];
    for (const ln of text.split('\n').map(s => s.trim()).filter(Boolean)) { const x = findQ(l, ln); if (!x || x.miss) miss.push(ln); else f[x.x.id] = x.q; }
    if (!Object.keys(f).length) return null; // жодного продукту — це не факт інвентаризації: режим знято, текст обробляється як звичайно
    await env.DB.put('st:' + uid, state, ST_TTL); // далі приймаємо рядки, поки не «Завершити»
    await countSave(env, wh, f, who);
    const v = await countView(env, wh); if (miss.length) v.text = `❓ Не зрозумів: ${miss.map(esc).join(', ')}\n\n` + v.text; return v;
  }
  if (k === 'skpr') {
    const x = (await getIng(env)).find(y => y.id === a); if (!x) return { text: 'Не знайдено' };
    const m = text.match(/^(\d+(?:[.,]\d+)?)\s*(кг|г|гр|л|мл|шт)?\.?$/i); if (!m) return null;
    const q = toU(x, m[1], m[2]), r = await produce(env, { id: x.id, q }, who); if (r.error) return { text: '⚠️ ' + r.error };
    return { text: `🍳 Приготовано: <b>${esc(r.x.n)}</b> +${fq(q, x.u)} · собівартість ${money(r.cost)} (сировина списана за техкартою)\nЗалишок: ${fq(tot(r.x), r.x.u)}` };
  }
  if (k === 'skbc') { const m = text.match(/^(\d{6,})\s*(.*)$/); if (!m) return null; return bcBind(env, m[1], m[2].trim(), who); }
  return null;
}
