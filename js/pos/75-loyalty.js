  // ---------- 🎁 Лояльність: рівні, акції, клієнти, звіт (сервер — worker/src/promo.js, op loy*) ----------
  const LOY_W = { hall: '🪑 зал', pick: '🥡 з собою', del: '🛵 доставка' }, LOY_D = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const bdTxt = bd => bd ? `${bd.slice(3)}.${bd.slice(0, 2)}` : '';
  const ruleName = r => r.name || ({ cat: `−${r.pct}%`, happy: `Щасливі години −${r.pct}%`, nth: `Кожна ${r.n}-та в подарунок`, sum: r.gift ? `Від ${r.min} ₴ — подарунок` : `Від ${r.min} ₴ −${r.pct}%`, bday: `День народження −${r.pct}%` }[r.type] || 'Акція');
  const lvCond = l => l.man ? 'лише вручну' : [l.n ? `від ${l.n} візитів` : '', l.sum ? `від ${money(l.sum)}` : ''].filter(Boolean).join(' або ') || 'усі клієнти';
  async function loadLoy(part) {
    try {
      if (!S.data.loy || part === 'cfg') S.data.loy = await api('loyGet');
      const t = S.loyTab || 'cli';
      if (t === 'cli' && part !== 'cfg') S.data.loyCli = (await api('loyCli', { q: S.loyQ || '', f: S.loyF || 'all' })).list;
      if (t === 'rep' && isAdmin()) { const [from, to] = loyRange(); S.data.loyRep = await api('loyRep', { from, to }, 30000); }
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
    if (S.view === 'settings') renderMain();
  }
  function loyRange() { const p = S.loyP || 'd', to = todayK(); return [p === 'd' ? to : p === 'w' ? addD(to, -6) : to.slice(0, 8) + '01', to]; }
  function loyHTML() {
    const D = S.data.loy; if (!D) { if (!S._loyL) { S._loyL = 1; loadLoy().finally(() => { S._loyL = 0; }); } return '<div class="muted">Завантаження…</div>'; }
    const c = D.cfg, tab = S.loyTab || 'cli', adm = isAdmin();
    const TABS = [['cli', '👥 Клієнти'], ['lvl', '🏅 Рівні'], ['rules', '🎯 Акції'], ...(adm ? [['rep', '📊 Звіт']] : [])];
    const seg = `<div class="seg wrap" style="margin:12px 0">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="loyTab" data-s="${k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'lvl') body = `<div class="grid2 set">
      <div class="card"><h3>🏅 Рівні постійних клієнтів</h3><div class="muted set-note">Рівень рахується сам за телефоном (візити або сума). «Вручну» — призначає адмін у картці клієнта (VIP, персонал, друзі). Знижка рівня й ручна знижка офіціанта не складаються — діє більша.</div>
        ${c.levels.map(l => `<div class="kv"><span>${esc(l.e)} <b>${esc(l.name)}</b><br><small class="muted">${lvCond(l)}</small></span><span class="kv-r"><b>${l.pct ? '−' + l.pct + '%' : ''}${l.cash ? ` 💸${l.cash}%` : ''}${!l.pct && !l.cash ? '—' : ''}</b>${adm ? `<button class="btn sm" data-a="loyLv" data-id="${l.id}">✏️</button>` : ''}</span></div>`).join('')}
        ${adm ? '<button class="btn sm primary" style="margin-top:10px" data-a="loyLv" data-id="">➕ Рівень</button>' : ''}</div>
      <div class="card"><h3>⚙️ Загальне</h3>
        <button class="sf press" data-a="loyOn" ${adm ? '' : 'disabled'}><span><b>🎁 Акції й рівні</b><small>Автоматично в залі, з собою і в доставці (сайт ?go теж)</small></span><span class="switch ${c.on ? 'on' : ''}"></span></button>
        <div class="kv"><span>🧢 Стеля всіх знижок разом<br><small class="muted">від суми страв у чеку</small></span><span class="kv-r"><b>${c.max}%</b>${adm ? '<button class="btn sm" data-a="loyMax">змінити</button>' : ''}</span></div>
        <div class="muted set-note" style="margin-top:8px">💸 Кешбек рівня замінює загальний кешбек (⚙️ → 🛵 Доставка → Бонуси), якщо більший за 0.</div></div></div>`;
    if (tab === 'rules') body = `<div class="grid2 set">${c.rules.map(r => `<div class="card"><h3>${r.on ? '' : '⛔ '}${esc(ruleName(r))}</h3>
        <div class="kv"><span>${D.T[r.type] || r.type}</span>${adm ? `<span class="switch ${r.on ? 'on' : ''}" data-a="loyRuleOn" data-id="${r.id}" role="switch"></span>` : `<b>${r.on ? '✅' : '⛔'}</b>`}</div>
        <div class="muted set-note">${esc(ruleWhat(r, D))}</div>
        ${adm ? `<div class="btnrow"><button class="btn sm" data-a="loyRule" data-id="${r.id}">✏️ Змінити</button><button class="btn sm red" data-a="loyRuleDel" data-id="${r.id}">🗑</button></div>` : ''}</div>`).join('')}
      <div class="card"><h3>➕ Нова акція</h3><div class="muted set-note">% на категорію/страву · щасливі години · N-та кава в подарунок · від суми — знижка або подарунок · день народження ±N днів. Умови: зал / з собою / доставка, період дії. Знижки рахує сервер і показує в чеку назвою акції.</div>
        ${adm ? '<button class="btn sm primary" data-a="loyRule" data-id="">➕ Створити</button>' : '<div class="muted">Створює адміністратор</div>'}</div></div>`;
    if (tab === 'cli') { const L = S.data.loyCli, f = S.loyF || 'all';
      const F = [['all', 'Усі'], ...c.levels.map(l => [l.id, `${l.e} ${l.name}`]), ['bd', '🎂 ДН ±7 днів'], ['sleep', '😴 Не були 30+ днів'], ['bal', '🎁 Є бонуси']];
      body = `<div class="card"><div class="srow" style="margin-bottom:10px"><input id="loyQ" placeholder="🔎 Телефон або ім'я" value="${esc(S.loyQ || '')}" inputmode="search"><button class="btn sm primary" data-a="loyFind">Знайти</button></div>
        <div class="btnrow" style="flex-wrap:wrap">${F.map(([k, l]) => `<button class="chip sm ${f === k ? 'on' : ''}" data-a="loyF" data-f="${k}">${esc(l)}</button>`).join('')}</div>
        <div style="margin-top:10px">${!L ? '<div class="muted">…</div>' : L.length ? L.map(x => `<button class="kv press" style="width:100%;text-align:left" data-a="loyCli" data-ph="${x.phone}"><span><b>${esc(x.name || '—')}</b> <span class="muted">${fmtPh(x.phone)}</span><br><small class="muted">${esc(x.lvn || '')}${x.man ? ' ✋' : ''} · ${x.n} віз. · ${money(x.sum)}${x.bal ? ` · 🎁 ${money(x.bal)}` : ''}${x.bd ? ` · 🎂 ${bdTxt(x.bd)}` : ''}</small></span><span class="muted">›</span></button>`).join('') : '<div class="muted">Нікого не знайдено. Клієнт з\'являється, коли на столі / в доставці вказали його телефон.</div>'}</div>
        ${L?.length === 200 ? '<div class="muted set-note">Показано перші 200 — уточніть пошук</div>' : ''}</div>`; }
    if (tab === 'rep') { const R = S.data.loyRep, p = S.loyP || 'd';
      body = `<div class="btnrow" style="margin-bottom:10px">${[['d', 'Сьогодні'], ['w', '7 днів'], ['m', 'Цей місяць']].map(([k, l]) => `<button class="chip sm ${p === k ? 'on' : ''}" data-a="loyP" data-p="${k}">${l}</button>`).join('')}</div>
        ${!R ? '<div class="muted">…</div>' : `<div class="grid2 set"><div class="card"><h3>📊 Знижки за акціями й рівнями</h3>
          <div class="kv"><span>🎁 Дано знижок</span><b class="money">${money(R.sum)}</b></div><div class="kv"><span>🧾 Чеків з акціями</span><b>${R.checks}</b></div>
          <div class="kv"><span>💰 Виручка цих чеків</span><b class="money">${money(R.gross)}</b></div><div class="kv"><span>📞 Чеків з телефоном гостя</span><b>${R.cli}</b></div>
          <div class="kv"><span>🏷 Ручні знижки офіціантів</span><b class="money">${money(R.manual)}</b></div></div>
          <div class="card"><h3>🎯 По акціях</h3>${R.list.map(x => `<div class="kv"><span>${esc(x.n)} <span class="muted">· ${x.q}×</span></span><b class="money">${money(x.sum)}</b></div>`).join('') || '<div class="muted">Ще не було</div>'}</div></div>`}`; }
    return seg + body;
  }
  function ruleWhat(r, D) {
    const cn = id => D.cats.find(c => c.id === id)?.n || id, what = [...(r.cats || []).map(cn), ...(r.dishes || [])].join(', ');
    return [r.type === 'happy' ? `${r.days?.length ? r.days.map(d => LOY_D[d]).join(', ') : 'щодня'} ${r.from}–${r.to}` : '', r.type === 'nth' ? `кожна ${r.n}-та` : '', r.type === 'sum' ? `від ${money(r.min)} → ${r.gift ? '🎁 ' + r.gift : '−' + r.pct + '%'}` : '', r.type === 'bday' ? `±${r.bdays ?? 3} дн. від ДН (дата в картці клієнта)` : '',
      what ? '🍽 ' + what : r.type === 'sum' || r.type === 'bday' ? '' : '🍽 усе меню', r.where?.length ? r.where.map(w => LOY_W[w]).join(' ') : '🪑🥡🛵 скрізь', r.d1 || r.d2 ? `📅 ${r.d1 || '…'} — ${r.d2 || '…'}` : ''].filter(Boolean).join(' · ');
  }
  async function loyLvEdit(id) {
    const c = S.data.loy.cfg, l = c.levels.find(x => x.id === id) || { e: '🎁', name: '', n: 0, sum: 0, pct: 0, cash: 0 };
    const body = `<div class="form"><label>Емодзі і назва<div class="srow"><input id="lE" value="${esc(l.e)}" style="max-width:70px"><input id="lN" value="${esc(l.name)}" placeholder="Постійний"></div></label>
      <label><input type="checkbox" id="lM" ${l.man ? 'checked' : ''}> Лише вручну (VIP, персонал, друзі)</label>
      <label>Від скількох візитів (0 — не враховувати)<input id="lV" inputmode="numeric" value="${l.n || 0}"></label><label>Або від суми покупок, ₴ (0 — не враховувати)<input id="lS" inputmode="numeric" value="${l.sum || 0}"></label>
      <label>Знижка рівня, %<input id="lP" inputmode="numeric" value="${l.pct || 0}"></label><label>Кешбек рівня, % (0 — загальний)<input id="lC" inputmode="numeric" value="${l.cash || 0}"></label></div>`;
    const v = await modal({ title: id ? '🏅 Рівень' : '➕ Новий рівень', body, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, ...(id ? [{ label: '🗑 Видалити', val: 'del', cls: 'red' }] : []), { label: 'Скасувати', val: null }], keep: true });
    const lv = v === 'ok' ? { id, e: $('#lE').value, name: $('#lN').value, man: $('#lM').checked ? 1 : 0, n: +$('#lV').value || 0, sum: +$('#lS').value || 0, pct: +$('#lP').value || 0, cash: +$('#lC').value || 0 } : null; closeModal();
    if (v === 'del' && await confirmBox(`Видалити рівень «${l.name}»?`, 'Клієнти з цим ручним рівнем отримають рівень автоматично')) { const r = await act('loyLevel', { del: id }, '🗑 Видалено'); if (r) S.data.loy.cfg = r.cfg; }
    if (lv) { const r = await act('loyLevel', { lv }, '💾 Збережено'); if (r) S.data.loy.cfg = r.cfg; }
    renderMain();
  }
  async function loyRuleEdit(id) {
    const D = S.data.loy, r = D.cfg.rules.find(x => x.id === id) || { type: 'happy', on: 1, pct: 10, where: [], cats: [], dishes: [], days: [], from: '15:00', to: '18:00', n: 5, min: 1000, bdays: 3 };
    const chk = (name, val, on, l) => `<label class="chip sm ${on ? 'on' : ''}" style="display:inline-flex;gap:6px;align-items:center;margin:0 6px 6px 0"><input type="checkbox" name="${name}" value="${val}" ${on ? 'checked' : ''} style="width:auto;margin:0">${l}</label>`;
    const body = `<div class="form">
      <label>Тип<select id="rT">${Object.entries(D.T).map(([k, l]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Назва в чеку (необовʼязково)<input id="rN" value="${esc(r.name || '')}" placeholder="напр. ☕ Кожна 5-та кава"></label>
      <label data-f="pct">Знижка, %<input id="rP" inputmode="numeric" value="${r.pct || 0}"></label>
      <label data-f="n">Кожна N-та в подарунок, N<input id="rNth" inputmode="numeric" value="${r.n || 5}"></label>
      <label data-f="min">Від суми, ₴<input id="rMin" inputmode="numeric" value="${r.min || 1000}"></label>
      <label data-f="gift">Подарунок — страва (замість %; порожньо — знижка %)<input id="rGift" list="rDl" value="${esc(r.gift || '')}"></label>
      <label data-f="bdays">Днів до/після ДН<input id="rBd" inputmode="numeric" value="${r.bdays ?? 3}"></label>
      <div data-f="days"><div class="muted set-note">Дні тижня (нічого — щодня)</div>${[1, 2, 3, 4, 5, 6, 7].map(d => chk('rDay', d, r.days?.includes(d), LOY_D[d])).join('')}
        <div class="srow"><label>З<input id="rF" value="${esc(r.from || '')}" placeholder="15:00"></label><label>До<input id="rTo" value="${esc(r.to || '')}" placeholder="18:00"></label></div></div>
      <div data-f="what"><div class="muted set-note">На що (нічого — усе меню)</div><div class="scrollbox sm">${D.cats.map(c => chk('rCat', c.id, r.cats?.includes(c.id), esc(c.n))).join('')}</div>
        <label>Або страви через кому<input id="rDish" list="rDl" value="${esc((r.dishes || []).join(', '))}"></label></div>
      <datalist id="rDl">${D.cats.flatMap(c => c.items).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="muted set-note">Де діє (нічого — скрізь)</div><div>${Object.entries(LOY_W).map(([k, l]) => chk('rW', k, r.where?.includes(k), l)).join('')}</div>
      <div class="srow"><label>Діє з<input id="rD1" type="date" value="${r.d1 || ''}"></label><label>по<input id="rD2" type="date" value="${r.d2 || ''}"></label></div></div>`;
    const show = () => { const t = $('#rT').value, F = { pct: t !== 'nth', n: t === 'nth', min: t === 'sum', gift: t === 'sum', bdays: t === 'bday', days: t === 'happy', what: ['cat', 'happy', 'nth'].includes(t) }; document.querySelectorAll('#modal [data-f]').forEach(el => { el.hidden = !F[el.dataset.f]; }); };
    const p = modal({ title: id ? '🎯 Акція' : '➕ Нова акція', body, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    $('#rT').onchange = show; show(); document.querySelectorAll('#modal input[type=checkbox]').forEach(i => { i.onchange = () => i.parentElement.classList.toggle('on', i.checked); });
    const v = await p; if (v !== 'ok') return;
    const all = n => [...document.querySelectorAll(`#modal input[name=${n}]:checked`)].map(i => i.value);
    const rule = { id: r.id, on: r.on ?? 1, type: $('#rT').value, name: $('#rN').value, pct: +$('#rP').value || 0, n: +$('#rNth').value || 0, min: +$('#rMin').value || 0, gift: $('#rGift').value.trim(), bdays: +$('#rBd').value || 0,
      days: all('rDay').map(Number), from: $('#rF').value.trim(), to: $('#rTo').value.trim(), cats: all('rCat'), dishes: $('#rDish').value.split(',').map(s => s.trim()).filter(Boolean), where: all('rW'), d1: $('#rD1').value, d2: $('#rD2').value };
    if (rule.type === 'sum' && rule.gift) rule.pct = 0;
    const res = await act('loyRule', { rule }, '💾 Акцію збережено'); if (!res) return; closeModal(); S.data.loy.cfg = res.cfg; renderMain();
  }
  // 👤 картка клієнта: рівень, бонуси, ДН, нотатка, історія
  async function loyCliCard(ph) {
    const r = await act('loyCliGet', { phone: ph }); if (!r) return; const c = r.cli;
    const hist = c.h.length ? c.h.map(h => `<div class="kv"><span>${new Date(h.ts).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit' })} · ${h.t === 'hall' ? '🪑 зал' : h.t === 'del' ? '🛵 доставка' : '🥡 з собою'}</span><b class="money">${money(h.sum)}${h.pr ? ` <small class="muted">🎁−${h.pr}</small>` : ''}</b></div>`).join('') : '<div class="muted">Історія з\'явиться після наступних чеків</div>';
    const body = `<div class="kv"><span>📞 Телефон</span><a href="tel:+${c.phone}">${fmtPh(c.phone)}</a></div><div class="kv"><span>🏅 Рівень</span><b>${esc(c.lvn || '—')}${c.man ? ' ✋ вручну' : ''}</b></div>
      <div class="kv"><span>🧾 Візитів · сума</span><b>${c.n} · ${money(c.sum)}</b></div><div class="kv"><span>🎁 Бонуси</span><b>${money(c.bal)}</b></div>
      <div class="kv"><span>🎂 День народження</span><b>${bdTxt(c.bd) || '—'}</b></div>${c.note ? `<div class="kv"><span>📌 ${esc(c.note)}</span></div>` : ''}
      <h3 style="margin-top:12px">🕓 Історія</h3><div class="scrollbox sm">${hist}</div>`;
    const v = await modal({ title: `👤 ${c.name || 'Клієнт'}`, body, buttons: [{ label: '✏️ Ім\'я / ДН / нотатка', val: 'edit', cls: 'primary' }, ...(isAdmin() ? [{ label: '🏅 Рівень', val: 'lvl' }] : []), { label: 'Закрити', val: null }] });
    if (v === 'edit') {
      const e = await modal({ title: '✏️ Клієнт', body: `<div class="form"><label>Ім'я<input id="cN" value="${esc(c.name)}"></label><label>День народження (дд.мм)<input id="cB" value="${bdTxt(c.bd)}" placeholder="25.12" inputmode="decimal"></label><label>Нотатка<textarea id="cT" rows="3">${esc(c.note)}</textarea></label></div>`, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
      const f = e === 'ok' ? { name: $('#cN').value, bd: $('#cB').value, note: $('#cT').value } : null; closeModal();
      if (f && await act('loyCliSet', { phone: ph, f }, '💾 Збережено')) return loyAfter(ph);
    }
    if (v === 'lvl') {
      const L = S.data.loy?.cfg.levels || (await api('loyGet')).cfg.levels;
      const lv = await choose('🏅 Рівень клієнта', 'Ручний рівень не змінюється сам. «Авто» — за візитами й сумою.', [{ label: '↺ Авто', val: '-' }, ...L.map(l => ({ label: `${l.e} ${l.name}${l.pct ? ` −${l.pct}%` : ''}`, val: l.id, cls: c.lvl === l.id && c.man ? 'primary' : '' }))]);
      if (lv && await act('loyCliSet', { phone: ph, f: { lvl: lv === '-' ? '' : lv } }, '🏅 Рівень змінено')) return loyAfter(ph);
    }
  }
  async function loyAfter(ph) { if (S.view === 'settings') await loadLoy(); if (S.open) await loadState().catch(() => {}); return loyCliCard(ph); }
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'loyQ') { S.loyQ = e.target.value.trim(); loadLoy(); } });
  document.addEventListener('click', async e => { const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, d = el.dataset;
    if (a === 'setTab' && d.s === 'loy') return loadLoy();
    if (a === 'loyTab') { S.loyTab = d.s; renderMain(); return loadLoy(); }
    if (a === 'loyF') { S.loyF = d.f; return loadLoy(); }
    if (a === 'loyFind') { S.loyQ = $('#loyQ')?.value.trim() || ''; return loadLoy(); }
    if (a === 'loyP') { S.loyP = d.p; return loadLoy(); }
    if (a === 'loyCli') return loyCliCard(d.ph);
    if (a === 'loyLv') return loyLvEdit(d.id);
    if (a === 'loyRule') return loyRuleEdit(d.id);
    if (a === 'loyRuleDel') { if (await confirmBox('Видалити акцію?')) { const r = await act('loyRule', { del: d.id }, '🗑 Видалено'); if (r) { S.data.loy.cfg = r.cfg; renderMain(); } } return; }
    if (a === 'loyRuleOn') { const r0 = S.data.loy.cfg.rules.find(x => x.id === d.id); const r = await act('loyRuleOn', { id: d.id, on: !r0.on }, r0.on ? '⛔ Вимкнено' : '✅ Увімкнено'); if (r) { Object.assign(r0, r.rule); renderMain(); } return; }
    if (a === 'loyOn') { const r = await act('loySet', { on: !S.data.loy.cfg.on }); if (r) { S.data.loy.cfg = r.cfg; renderMain(); } return; }
    if (a === 'loyMax') { const v = await askVal('🧢 Стеля всіх знижок, %', S.data.loy.cfg.max, 'number'); if (v == null) return; const r = await act('loySet', { max: v }, '💾 Збережено'); if (r) { S.data.loy.cfg = r.cfg; renderMain(); } return; }
    if (a === 'loyOff') { await act('loyOff', { t: S.open, off: d.off === '1' }, d.off === '1' ? '🎁 Акції на столі вимкнено' : '🎁 Акції повернуто'); return loadState().catch(() => {}); }
    if (a === 'loyCliT') { const ph = S.tables[S.open]?.cli; if (ph) loyCliCard(ph); }
  });
