// 📊 Кабінет → Аналітика → «Деталі закладу»: теплова карта, топ/антитоп, ABC, канали, оплати, офіціанти, кухня, склад, гості, прогноз.
// Сервер: owner.js (op «an») → analytics.js (один запит за період, кеш 5 хв). Графіки — CSS/SVG, без бібліотек. Без polling.
window.OWNAN = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];
  let C, V = '', D = null, K = '', busy = false, err = '';
  const m = v => C.money(v), pct = v => v == null ? '' : `<small class="an-d ${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v)}%</small>`;
  async function load(f, t) {
    if (busy) return; busy = true; err = '';
    try { D = await C.api('an', { venue: V, from: f, to: t }); K = V + f + t; } catch (e) { err = e.message; D = null; K = V + f + t; }
    busy = false; C.render();
  }
  function heat() {
    const mx = Math.max(1, ...D.heat.flat()), hrs = []; for (let h = 0; h < 24; h++) if (D.heat.some(r => r[h])) hrs.push(h);
    if (!hrs.length) return '';
    const h0 = Math.max(0, hrs[0]), h1 = hrs[hrs.length - 1];
    let g = `<div class="an-heat" style="grid-template-columns:28px repeat(${h1 - h0 + 1},1fr)"><span></span>`;
    for (let h = h0; h <= h1; h++) g += `<small>${h}</small>`;
    D.heat.forEach((row, d) => { g += `<small>${WD[d]}</small>`; for (let h = h0; h <= h1; h++) { const v = row[h]; g += `<i title="${WD[d]} ${h}:00 — ${m(v)}, чеків: ${D.heatN[d][h]}" style="opacity:${v ? (0.15 + 0.85 * v / mx).toFixed(2) : 0.05}"></i>`; } });
    return `<div class="card"><h3>🔥 Години пік</h3><div class="muted" style="font-size:12px;margin-bottom:6px">Виручка по днях тижня й годинах — що темніше, то більше</div>${g}</div></div>`;
  }
  const bar = (label, v, mx, extra = '') => `<div class="an-bar"><span class="l">${label}</span><span class="b"><i style="width:${mx ? Math.max(2, v / mx * 100) : 0}%"></i></span><b class="money">${extra || m(v)}</b></div>`;
  const dishes = (L, empty) => L.length ? L.map(x => bar(esc(x.n) + ` <small class="muted">×${x.q}</small>`, x.rev, Math.max(...L.map(y => y.rev)))).join('') : `<div class="muted">${empty}</div>`;
  function body() {
    const c = D.cur, p = D.prev, tot = (D.ch.hall.rev + D.ch.del.rev + D.ch.pick.rev) || 1, F = D.forecast;
    const ch = [['🍽 Зал', D.ch.hall], ['🛵 Доставка', D.ch.del], ['🥡 Самовивіз', D.ch.pick]].map(([l, x]) => bar(l + ` <small class="muted">${x.n} чек.</small>`, x.rev, tot)).join('');
    const pay = D.pay, pt = (pay.cash + pay.card + pay.onl) || 1;
    const pays = [['💵 Готівка', pay.cash], ['💳 Картка', pay.card], ['🌐 Онлайн', pay.onl]].map(([l, v]) => bar(l, v, pt, `${m(v)} <small class="muted">${Math.round(v / pt * 100)}%</small>`)).join('');
    const wmx = Math.max(1, ...D.waiters.map(w => w.rev));
    const w = D.waiters.length ? `<div class="tbl"><table><thead><tr><th>Офіціант</th><th>Виручка</th><th>Чеків</th><th>Сер. чек</th><th>Чайові</th></tr></thead><tbody>${D.waiters.map(x => `<tr><td>${esc(x.name)}</td><td class="money">${m(x.rev)}</td><td>${x.n}</td><td class="money">${m(x.avg)}</td><td class="money">${m(x.tip)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="muted">Закритих чеків за період немає.</div>';
    const s = D.stock, st = s ? `<div class="kpis">${C.kpi('Фудкост', s.fc == null ? '—' : s.fc + '%', 'собівартість / виручка')}${C.kpi('Собівартість', m(s.cogs))}${C.kpi('Списання', m(s.offSum), 'зіпсовано, скасовано')}</div>${s.noCard ? `<div class="muted" style="font-size:12px;margin-top:6px">⚠️ ${s.noCard} страв без техкарти — фудкост неповний</div>` : ''}${(s.off || []).length ? `<div style="margin-top:8px">${s.off.map(([k, v]) => bar(esc(k), v, s.off[0][1])).join('')}</div>` : ''}` : '<div class="muted">Склад ще не налаштований.</div>';
    const g = D.guests, gt = g.known || 1;
    const k = D.kitchen.n ? `<div class="kpis">${C.kpi('Сер. час', D.kitchen.avg + ' хв', 'від прийняття до «готово»')}${C.kpi('90% за', D.kitchen.p90 + ' хв')}${C.kpi('Замовлень', D.kitchen.n)}</div>` : '<div class="muted">Дані кухні за період відсутні (екран кухні не використовувався).</div>';
    return `<div class="kpis">${C.kpi('Виручка', m(c.rev), pct(D.d.rev) + (p.rev ? ` <small class="muted">було ${m(p.rev)}</small>` : ''))}${C.kpi('Чеків', c.n, pct(D.d.n))}${C.kpi('Середній чек', m(c.avg), pct(D.d.avg))}${C.kpi('Прогноз на місяць', m(F.est), `зараз ${m(F.done)} за ${F.days} з ${F.of} дн.`)}</div>
      <div class="an-grid">${heat()}
      <div class="card"><h3>🛍 Канали</h3>${ch}<h3 style="margin-top:14px">💳 Оплата</h3>${pays}</div>
      <div class="card"><h3>🏆 Топ страв</h3>${dishes(D.top, 'Продажів за період немає.')}</div>
      <div class="card"><h3>🐌 Антитоп (рідко беруть)</h3>${dishes(D.low, 'Продажів за період немає.')}<div class="muted" style="font-size:12px;margin-top:8px">Кандидати на заміну чи акцію.</div></div>
      <div class="card"><h3>🅰️ ABC-аналіз меню</h3><div class="kpis"><div class="kpi"><span>A · 80% виручки</span><b>${D.abc.A}</b></div><div class="kpi"><span>B · ще 15%</span><b>${D.abc.B}</b></div><div class="kpi"><span>C · останні 5%</span><b>${D.abc.C}</b></div></div><div class="muted" style="font-size:12px;margin-top:6px">A — основа виручки, C — «баласт» меню.</div></div>
      <div class="card"><h3>👥 Гості</h3>${g.known ? bar('🔁 Повторні', g.repeat, gt, `${g.repeat} <small class="muted">${Math.round(g.repeat / gt * 100)}%</small>`) + bar('🆕 Нові', g.fresh, gt, `${g.fresh}`) : '<div class="muted">У чеках немає гостей з телефоном (доставка, самовивіз, лояльність).</div>'}<div class="muted" style="font-size:12px;margin-top:6px">Без телефону: ${g.noPhone} чеків · з бонусами: ${g.bonus}</div></div>
      <div class="card"><h3>👨‍🍳 Кухня</h3>${k}</div>
      <div class="card"><h3>📦 Склад</h3>${st}</div></div>
      <div class="card" style="margin-top:12px"><h3>🧑‍🍳 Офіціанти</h3>${w}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">Порівняння — з попереднім таким самим періодом (${D.pfrom.split('-').reverse().join('.')} – ${D.pto.split('-').reverse().join('.')}). Виручка без чайових. Дані кешуються на 5 хв${D.cached ? ' (з кешу)' : ''}.</div>`;
  }
  return {
    reset() { D = null; K = ''; },
    view(ctx, [f, t]) {
      C = ctx; const L = C.venues; if (!L.length) return '';
      if (!V || !L.some(v => v.id === V)) V = L[0].id;
      const sel = L.length > 1 ? `<select data-a="anV" class="an-sel">${L.map(v => `<option value="${esc(v.id)}"${v.id === V ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : '';
      const need = K !== V + f + t;
      if (need && !busy) load(f, t);
      return `<h2>🔬 Деталі закладу ${sel}</h2>${err ? `<div class="card err">⚠️ ${esc(err)}</div>` : !D || need ? '<div class="muted">Рахуємо…</div>' : body()}`;
    },
    pick(v) { V = v; D = null; K = ''; },
  };
})();
