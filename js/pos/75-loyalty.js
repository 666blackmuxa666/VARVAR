  // ---------- 🎁 Лояльність: рівні, акції, клієнти, звіт (сервер — worker/src/promo.js, op loy*) ----------
  const LOY_W = { hall: '🪑 зал', pick: '🥡 з собою', del: '🛵 доставка' }, LOY_D = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const bdTxt = bd => bd ? `${bd.slice(3)}.${bd.slice(0, 2)}` : '';
  const ruleName = r => r.name || ({ cat: `−${r.pct}%`, happy: `Щасливі години −${r.pct}%`, nth: `Кожна ${r.n}-та в подарунок`, sum: r.gift ? `Від ${r.min} ₴ — подарунок` : `Від ${r.min} ₴ −${r.pct}%`, bday: `День народження −${r.pct}%` }[r.type] || 'Акція');
  const lvCond = l => l.man ? 'лише вручну' : [l.n ? `від ${l.n} візитів` : '', l.sum ? `від ${money(l.sum)}` : ''].filter(Boolean).join(' або ') || 'усі клієнти';
  // ---------- ✉️ Вхідні від гостей (бот гостей: повідомлення, відгуки, низькі оцінки) ----------
  const inboxBtn = () => S.gInN ? `<button class="btn red bk-blink" data-a="gbInbox" title="Гості написали — відпишіть">✉️ ${S.gInN}</button>` : `<button class="btn ghost" data-a="gbInbox" title="Повідомлення гостей">✉️</button>`;
  const agoT = at => { const m = Math.round((Date.now() - at) / 60e3); return m < 1 ? 'щойно' : m < 60 ? m + ' хв' : m < 1440 ? Math.round(m / 60) + ' год' : new Date(at).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); };
  async function gbInbox() {
    const r = await act('gbInbox', {}); if (!r) return;
    const v = await modal({ title: '✉️ Повідомлення гостей', body: `<div class="muted set-note">Пишуть у бот гостей: «💬 Написати нам», відгуки й низькі оцінки після візиту. 🔴 — чекають відповіді.</div><div class="bk-list">${r.list.map(x => `<button class="kv press inb${x.open ? ' open' : ''}" data-a="gbThread" data-ph="${x.ph}" style="width:100%;text-align:left"><span style="min-width:0;overflow-wrap:anywhere">${x.open ? '🔴 ' : ''}<b>${esc(x.name || '—')}</b> <small class="muted">${fmtPh(x.ph)}</small><br><small class="${x.open ? '' : 'muted'}">${x.lastMsg?.f === 's' ? '↩️ ' : x.lastMsg?.k === 'rev' ? '' : '👤 '}${esc((x.lastMsg?.text || '').slice(0, 90))}</small></span><span class="kv-r"><small class="muted">${agoT(x.last)}</small></span></button>`).join('') || '<div class="muted">Ще ніхто не писав</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] });
  }
  async function gbThread(ph) {
    closeModal(); const r = await act('gbThread', { ph }); if (!r) return; const x = r.th, c = r.cli;
    const body = `<div class="muted" style="font-size:12px;margin-bottom:8px">📞 <a href="tel:+${x.ph}">${fmtPh(x.ph)}</a>${c ? ` · 🧾 ${c.n} візитів · ${money(c.sum)} · 🎁 ${money(c.bal)}` : ''}${c && !c.tg ? ' · ⚠️ відключив бота' : ''}</div>
      <div class="chat">${x.msgs.map(m => `<div class="msg ${m.f === 'g' ? 'in' : 'out'}${m.sys ? ' sys' : ''}${m.k === 'rev' ? ' rev' : ''}"><div>${esc(m.text)}</div><small>${m.f === 's' ? esc(m.by || '') + ' · ' : ''}${agoT(m.at)}</small></div>`).join('')}</div>`;
    const v = await modal({ title: `✉️ ${x.name || fmtPh(x.ph)}`, body, buttons: [{ label: '↩️ Відповісти', val: 'rep', cls: 'primary' }, ...(x.open ? [{ label: '✔️ Без відповіді', val: 'close' }] : []), { label: '← Усі', val: 'back' }] });
    if (v === 'rep') { const text = await ask('↩️ Відповідь гостю в Telegram', 'Текст'); if (text && await act('gbReply', { ph, text }, '✅ Надіслано')) loadState().catch(() => {}); return gbThread(ph); }
    if (v === 'close') { if (await act('gbClose', { ph }, '✔️ Закрито')) loadState().catch(() => {}); return gbInbox(); }
    if (v === 'back') return gbInbox();
  }
  async function loadLoy(part) {
    try {
      if (!S.data.loy || part === 'cfg') S.data.loy = await api('loyGet');
      const t = S.loyTab || 'cli';
      if (t === 'cli' && part !== 'cfg') S.data.loyCli = (await api('loyCli', { q: S.loyQ || '', f: S.loyF || 'tg' })).list;
      if (t === 'bot' && isAdmin() && part !== 'cfg') S.data.gb = await api('gbGet');
      if (t === 'rep' && isAdmin()) { const [from, to] = loyRange(); S.data.loyRep = await api('loyRep', { from, to }, 30000); }
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
    if (S.view === 'settings') renderMain();
  }
  function loyRange() { const p = S.loyP || 'd', to = todayK(); return [p === 'd' ? to : p === 'w' ? addD(to, -6) : to.slice(0, 8) + '01', to]; }
  function loyHTML() {
    const D = S.data.loy; if (!D) { if (!S._loyL) { S._loyL = 1; loadLoy().finally(() => { S._loyL = 0; }); } return '<div class="muted">Завантаження…</div>'; }
    const c = D.cfg, tab = S.loyTab || 'cli', adm = isAdmin();
    const TABS = [['cli', '👥 Клієнти'], ['lvl', '🏅 Рівні'], ['rules', '🎯 Акції'], ...(adm ? [['rep', '📊 Звіт'], ['bot', '🤖 Бот гостей']] : [])];
    const seg = `<div class="seg wrap" style="margin:12px 0">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="loyTab" data-s="${k}">${l}</button>`).join('')}${adm ? '<button class="btn sm" data-a="certs">🎟 Сертифікати</button>' : ''}</div>`;
    let body = '';
    if (tab === 'lvl') body = `<div class="grid2 set">
      <div class="card"><h3>🏅 Рівні постійних клієнтів</h3><div class="muted set-note">Рівень рахується сам за телефоном (візити або сума). «Вручну» — призначає адмін у картці клієнта (VIP, персонал, друзі). Знижка рівня й ручна знижка офіціанта не складаються — діє більша.</div>
        ${c.levels.map(l => `<div class="kv"><span>${esc(l.e)} <b>${esc(l.name)}</b><br><small class="muted">${lvCond(l)}</small></span><span class="kv-r"><b>${l.pct ? '−' + l.pct + '%' : ''}${l.cash ? ` 💸${l.cash}%` : ''}${!l.pct && !l.cash ? '—' : ''}</b>${adm ? `<button class="btn sm" data-a="loyLv" data-id="${l.id}">✏️</button>` : ''}</span></div>`).join('')}
        ${adm ? '<button class="btn sm primary" style="margin-top:10px" data-a="loyLv" data-id="">➕ Рівень</button>' : ''}</div>
      <div class="card"><h3>⚙️ Загальне</h3>
        <button class="sf press" data-a="loyOn" ${adm ? '' : 'disabled'}><span><b>🎁 Акції й рівні</b><small>Автоматично в залі, з собою і в доставці (сайт ?go теж)</small></span><span class="switch ${c.on ? 'on' : ''}"></span></button>
        <div class="kv"><span>🧢 Стеля всіх знижок разом<br><small class="muted">від суми страв у чеку</small></span><span class="kv-r"><b>${c.max}%</b>${adm ? '<button class="btn sm" data-a="loyMax">змінити</button>' : ''}</span></div>
        <div class="muted set-note" style="margin-top:8px">💸 Кешбек рівня замінює загальний кешбек (⚙️ → 🛵 Доставка → Бонуси), якщо більший за 0.</div></div></div>`;
    if (tab === 'bot') { const G = S.data.gb; body = !G ? '<div class="muted">…</div>' : (() => { const g = G.cfg, sw = (k, t, d) => `<button class="sf press" data-a="gbSw" data-k="${k}"><span><b>${t}</b><small>${d}</small></span><span class="switch ${g[k] ? 'on' : ''}"></span></button>`, kv = (k, t, v) => `<div class="kv"><span>${t}</span><span class="kv-r"><b>${esc(String(v))}</b><button class="btn sm" data-a="gbEd" data-k="${k}">✏️</button></span></div>`, tx = (k, v) => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">✍️ Текст<br><small class="muted">${esc(v)}</small></span><span class="kv-r"><button class="btn sm" data-a="gbEd" data-k="${k}">✏️</button></span></div>`;
      return `<div class="grid2 set">
      <div class="card"><h3>📣 Розсилка</h3><div class="muted set-note">Повідомлення в бот гостям, які підключили Telegram: <b>${G.linked}</b>. Під текстом — кнопка «🍔 Замовити».</div>
        <button class="btn primary" data-a="gbCast">📣 Нова розсилка</button>${kv('gap', '⏳ Не частіше ніж раз на, год', g.gap)}</div>
      <div class="card"><h3>🤖 Що бот робить сам</h3>${sw('stat', '🛵 Статус замовлення', 'Прийнято · готується · готово · кур\'єр виїхав')}${sw('bon', '🎁 Нараховані бонуси', '«+35 бонусів, на рахунку 210» після закриття чека')}${sw('chat', '💬 Чат з адміністратором', 'Повідомлення гостя — у стрічку й групу, відповідь — кнопкою «↩️ Відповісти»')}</div>
      <div class="card"><h3>🎂 День народження</h3>${sw('bd', '🎂 Вітати в день народження', 'Гість вказує дату в боті. Знижка — акцією «🎂 День народження»')}<div class="kv"><span>🎁 Подарунок (сертифікат у бот)<br><small class="muted">раз на рік, офіціант вводить код у «🎟 Сертифікат»</small></span><span class="kv-r"><b>${esc(G.gifts.find(x => x.id === g.bdGift)?.n || 'без подарунка')}</b><button class="btn sm" data-a="gbGift">✏️</button></span></div>${kv('bdGiftDays', '📆 Сертифікат діє, днів', g.bdGiftDays)}${tx('bdText', g.bdText)}</div>
      <div class="card"><h3>👋 «Сплячі» гості</h3>${sw('sleep', '👋 Нагадувати тим, хто давно не був', 'Раз на день, о 11:00–20:00; одному гостю — не частіше ніж раз на 2 періоди')}${kv('sleepDays', '📆 Не був днів', g.sleepDays)}${kv('sleepBon', '🎁 Подарувати бонусів', g.sleepBon)}${tx('sleepText', g.sleepText)}</div></div>`; })(); }
    if (tab === 'rules') body = `<div class="grid2 set">${c.rules.map(r => `<div class="card"><h3>${r.on ? '' : '⛔ '}${esc(ruleName(r))}</h3>
        <div class="kv"><span>${D.T[r.type] || r.type}</span>${adm ? `<span class="switch ${r.on ? 'on' : ''}" data-a="loyRuleOn" data-id="${r.id}" role="switch"></span>` : `<b>${r.on ? '✅' : '⛔'}</b>`}</div>
        <div class="muted set-note">${esc(ruleWhat(r, D))}</div>
        ${adm ? `<div class="btnrow"><button class="btn sm" data-a="loyRule" data-id="${r.id}">✏️ Змінити</button><button class="btn sm red" data-a="loyRuleDel" data-id="${r.id}">🗑</button></div>` : ''}</div>`).join('')}
      <div class="card"><h3>➕ Нова акція</h3><div class="muted set-note">% на категорію/страву · щасливі години · N-та кава в подарунок · від суми — знижка або подарунок · день народження ±N днів. Умови: зал / з собою / доставка, період дії. Знижки рахує сервер і показує в чеку назвою акції.</div>
        ${adm ? '<button class="btn sm primary" data-a="loyRule" data-id="">➕ Створити</button>' : '<div class="muted">Створює адміністратор</div>'}</div></div>`;
    if (tab === 'cli') { const L = S.data.loyCli, f = S.loyF || 'tg';
      const F = [['tg', '📱 У програмі'], ['all', 'Усі номери'], ...c.levels.map(l => [l.id, `${l.e} ${l.name}`]), ['bd', '🎂 ДН ±7 днів'], ['sleep', '😴 Не були 30+ днів'], ['bal', '🎁 Є бонуси']];
      body = `<div class="card"><div class="muted set-note">📱 У програмі лояльності — лише гості, які підключили бот гостей (бонуси, знижки рівня, ДН). Інші номери — просто історія замовлень: бонуси їм не нараховуються, доки не підключать бот. ✋ — рівень, який адмін дав вручну (персонал, VIP), діє і без бота.</div><div class="srow" style="margin-bottom:10px"><input id="loyQ" placeholder="🔎 Телефон або ім'я" value="${esc(S.loyQ || '')}" inputmode="search"><button class="btn sm primary" data-a="loyFind">Знайти</button></div>
        <div class="btnrow" style="flex-wrap:wrap">${F.map(([k, l]) => `<button class="chip sm ${f === k ? 'on' : ''}" data-a="loyF" data-f="${k}">${esc(l)}</button>`).join('')}</div>
        <div style="margin-top:10px">${!L ? '<div class="muted">…</div>' : L.length ? L.map(x => `<button class="kv press" style="width:100%;text-align:left" data-a="loyCli" data-ph="${x.phone}"><span>${x.tg ? '📱 ' : ''}<b>${esc(x.name || '—')}</b> <span class="muted">${fmtPh(x.phone)}</span>${!x.tg && !x.man ? ' <small class="warn">не в програмі</small>' : ''}<br><small class="muted">${esc(x.lvn || '')}${x.man ? ' ✋' : ''} · ${x.n} віз. · ${money(x.sum)}${x.bal ? ` · 🎁 ${money(x.bal)}` : ''}${x.bd ? ` · 🎂 ${bdTxt(x.bd)}` : ''}</small></span><span class="muted">›</span></button>`).join('') : '<div class="muted">Нікого не знайдено. Клієнт з\'являється, коли на столі / в доставці вказали його телефон.</div>'}</div>
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
    if (a === 'gbSw') { const k = d.k, r = await act('gbSet', { f: { [k]: !S.data.gb.cfg[k] } }); if (r) { S.data.gb.cfg = r.cfg; renderMain(); } return; }
    if (a === 'gbEd') { const k = d.k, txt = /Text$/.test(k), v = await askVal({ bdText: '🎂 Текст привітання', bdGiftDays: '📆 Скільки днів діє подарунок', sleepText: '👋 Текст для «сплячих»', sleepDays: '📆 Скільки днів не був', sleepBon: '🎁 Бонусів у подарунок', gap: '⏳ Годин між розсилками' }[k], S.data.gb.cfg[k], txt ? 'text' : 'number'); if (v == null) return; const r = await act('gbSet', { f: { [k]: v } }, '💾 Збережено'); if (r) { S.data.gb.cfg = r.cfg; renderMain(); } return; }
    if (a === 'gbGift') { const G = S.data.gb, cur = G.gifts.find(x => x.id === G.cfg.bdGift), l = G.gifts.filter(x => x.c === (cur?.c || 'hookah')); const v = await choose('🎁 Подарунок на день народження', 'Сертифікат на цю позицію прийде гостю в бот', [...l.map(x => ({ label: `${x.n} · ${money(x.p)}`, val: x.id, cls: x.id === G.cfg.bdGift ? 'primary' : '' })), { label: '🚫 Без подарунка', val: '-' }]); if (!v) return; const r = await act('gbSet', { f: { bdGift: v === '-' ? '' : v } }, '💾 Збережено'); if (r) { G.cfg = r.cfg; renderMain(); } return; }
    if (a === 'gbCast') { const A = S.data.gb.aud, lv = S.data.loy.cfg.levels; const f = await choose('📣 Кому надіслати?', 'Лише тим, хто підключив бот гостей', [...Object.entries(A).map(([val, l]) => ({ label: l[0].toUpperCase() + l.slice(1), val })), ...lv.map(l => ({ label: `${l.e} ${l.name}`, val: l.id }))]); if (!f) return;
      const c = await api('gbCount', { f }).catch(e => { toast('⚠️ ' + errText(e.message)); return null; }); if (!c) return; if (c.wait) return toast(`⏳ Наступна розсилка — через ${c.wait} хв`); if (!c.n) return toast('Нікого немає в цій групі');
      const text = await ask(`📣 Текст розсилки (${c.n} гостей)`, 'Сьогодні −20% на бургери! 🍔'); if (!text) return;
      if (!(await confirmBox(`📣 Надіслати ${c.n} гостям?`, text))) return; toast('📣 Надсилаю…'); const r = await api('gbCast', { f, text }, 180000).catch(e => { toast('⚠️ ' + errText(e.message)); return null; }); if (r) toast(`📣 Надіслано ${r.n} з ${r.of}`); return; }
    if (a === 'gbInbox') return gbInbox();
    if (a === 'gbThread') return gbThread(d.ph);
    if (a === 'gbReply') { const text = await ask('↩️ Відповідь гостю в Telegram', 'Текст'); if (text) await act('gbReply', { ph: d.ph, text }, '✅ Надіслано'); return; }
    if (a === 'loyCliT') { const ph = S.tables[S.open]?.cli; if (ph) loyCliCard(ph); }
  });
