  function stopHTML() {
    if (!S.menu) return '<div class="head"><h1>Стоп-лист</h1></div><div class="muted">Завантаження…</div>';
    const q = S.q.trim().toLowerCase(), only = S.stopOff, all = S.menu.categories.filter(c => !c.tech).flatMap(c => c.items), off = all.filter(i => i.hidden);
    const blocks = S.menu.categories.filter(c => !c.tech).map(c => { const its = c.items.filter(i => (!q || i.name.uk.toLowerCase().includes(q)) && (!only || i.hidden)); if (!its.length) return '';
      const n = c.items.filter(i => i.hidden).length;
      return `<div class="st-b"><h3>${esc(c.name.uk)}${n ? ` <span class="bad">· ⛔ ${n}</span>` : ''}</h3><div class="st-g">${its.map(i => `<button class="st-i${i.hidden ? ' off' : ''}" data-a="stopT" data-id="${i.id}" data-h="${i.hidden ? 0 : 1}">${i.hidden ? '⛔ ' : ''}${esc(i.name.uk)}</button>`).join('')}</div></div>`; }).join('');
    return `<div class="head"><h1>Стоп-лист</h1><span class="muted">Тап — увімкнути / вимкнути. Вимкнене не бачать гості й не продається</span></div>
      <div class="st-top"><input id="stopSearch" placeholder="🔎 Пошук" value="${esc(S.q)}"><button class="chip ${only ? 'on' : ''}" data-a="stopOff">⛔ Вимкнені · ${off.length}</button></div>
      <div class="st-w">${blocks || '<div class="muted">Нічого не знайдено</div>'}</div>`;
  }
  function printerHTML() { return `<div class="head"><h1>Принтер</h1></div>${printerCards()}`; }
  const linksCard = () => (() => { const B = `https://posatom.online/${VENUE || 'varvar'}/`, L = [['🌐 Сайт-візитка', B, 'для Instagram, Google Maps, друзів'], ['🛵 Меню з собою й доставка', B + '?go', 'гість замовляє онлайн'], ['📅 Бронювання', B + '#book', 'одразу на форму броні'], ['🎟 Подарункові сертифікати', B + '#cert', ''], ['🪑 Каса для персоналу', B + 'pos.html', 'відкрити на телефоні / планшеті'], ['👑 Кабінет власника', 'https://posatom.online/owner/', 'аналітика, налаштування, сайт']];
        return `<div class="card" style="margin-top:12px"><h3>🔗 Посилання закладу</h3>${L.map(([l, u, h]) => `<div class="kv"><span style="min-width:0">${l}<br><small class="muted" style="overflow-wrap:anywhere">${esc(u)}${h ? ' · ' + h : ''}</small></span><span class="kv-r"><button class="btn sm" data-a="copyLink" data-u="${esc(u)}" title="Копіювати">📋</button><a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener" title="Відкрити">↗</a></span></div>`).join('')}<div class="muted set-note">QR столів — у 🖨 Принтер → «Усі QR-коди». Старі надруковані QR теж працюють.</div></div>`; })();
  function printerCards() {
    const p = S.printer || {}, ok = p.seen && Date.now() - p.seen < 60e3;
    return `<div class="cards"><div class="card"><div class="big">${ok ? '✅ на звʼязку' : p.seen ? '❌ немає звʼязку' : '❌ програма друку не запущена'}</div>
      <div class="muted">${p.seen ? 'Останній звʼязок: ' + hhmm(p.seen) : ''} · у черзі: ${p.q ?? 0}</div>${p.q && isAdmin() ? '<div class="btnrow" style="margin-top:10px"><button class="btn sm" data-a="pQList">📋 Що в черзі</button><button class="btn sm red" data-a="pQClear">🗑 Очистити чергу</button></div>' : ''}</div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">🖨 Тестовий друк</button><button class="btn" data-a="pQr">🔳 QR меню для столу</button><button class="btn" data-a="qrPanel">🔳 Усі QR-коди</button></div></div>${prnCard()}`;
  }
  // 🖨 що на який принтер (js/prnroute.js) — лише адмін; розподіл вантажиться раз при відкритті вкладки
  function prnCard() {
    if (!isAdmin() || !window.PRN) return '';
    if (!S.prnR) { if (!S.prnL) { S.prnL = 1; api('rcptGet', {}).then(r => { S.prnR = { route: r.route || { st: [] }, dev: r.dev }; renderMain(); }).catch(() => { S.prnL = 0; }); } return '<div class="card" style="margin-top:12px"><h3>🖨 Що на який принтер</h3><div class="muted">Завантаження…</div></div>'; }
    return `<div class="card" style="margin-top:12px"><h3>🖨 Що на який принтер</h3>${PRN.html(S.prnR.route, S.prnR.dev, S.prnR.dirty)}</div>${window.TABP ? `<div class="card" style="margin-top:12px"><h3>📱 Принтер цього планшета</h3>${TABP.html()}</div>` : ''}`;
  }
  document.addEventListener('click', async e => { const el = e.target.closest('[data-tp]'); if (!el || !window.TABP) return; el.disabled = true; await TABP.click(el.dataset.tp); el.disabled = false; S.prnR = null; S.prnL = 0; renderMain(); });
  const prnDo = async el => { const P = S.prnR; if (!P) return; P.route = { st: (P.route.st || []).map(x => ({ ...x })) }; const r = PRN.apply(el, P.route);
    if (r === 'save') { const x = await act('printRoute', P.route, '🖨 Збережено — програма друку підхопить за кілька хвилин'); if (x) { P.route = x.route; P.dirty = 0; } } else if (r) P.dirty = 1; renderMain(); };
  document.addEventListener('click', e => { const el = e.target.closest('button[data-prn]'); if (el) prnDo(el); });
  document.addEventListener('change', e => { if (e.target.dataset?.prn) prnDo(e.target); });
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>Меню</h1></div><div class="muted">Завантаження…</div>';
    return `<div class="head"><h1>Меню</h1><button class="btn" data-a="menuUndo">↩️ Відмінити останню зміну</button><button class="btn" data-a="catAdd">📂 Новий розділ</button><button class="btn" data-a="phPanel">📸 ШІ-фото</button><button class="btn primary" data-a="menuEdit" data-id="">➕ Нова страва</button></div>
      ${S.menu.categories.map(c => `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${c.items.map(i => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? ' ⛔' : ''}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map(v => `${v.v} — ${v.p}`).join(' / ') : i.price + ' ₴'}${i.size && !i.variants ? ' · ' + esc(i.size) : ''}</div></div>›</button>`).join('')}</div>`).join('')}`;
  }
  function lookHTML() {
    const L = look(), opt = (k, v, l, extra = '') => `<button class="lk-o${L[k] == v ? ' on' : ''}" data-a="look" data-k="${k}" data-v="${v}"${extra}>${l}</button>`;
    const ACC = ['', '#f2c14e', '#ff453a', '#ff9f0a', '#30d158', '#0a84ff', '#bf5af2', '#e0457b', '#4fe3c1', '#ffffff'];
    return `<div class="grid2 set">
      <div class="card"><h3>🎨 Тема</h3><div class="lk-themes">${Object.entries(THEMES).map(([k, [l, T]]) => `<button class="lk-th${L.theme === k ? ' on' : ''}" data-a="look" data-k="theme" data-v="${k}" style="background:${T.bg};color:${T.text}"><i style="background:${T.card}"><b style="background:${T.accent}"></b></i>${l}</button>`).join('')}</div>
        <div class="set-note muted" style="margin-top:12px">Колір акценту (кнопки, виділення)</div><div class="lk-acc">${ACC.map(c => `<button class="lk-dot${L.accent === c ? ' on' : ''}" data-a="look" data-k="accent" data-v="${c}" style="background:${c || 'conic-gradient(#f2c14e,#e0457b,#3fb6ff,#5ed68a,#f2c14e)'}" title="${c || 'як у темі'}"></button>`).join('')}</div></div>
      <div class="card"><h3>🔤 Шрифти</h3><div class="set-note muted">Основний шрифт</div><div class="lk-row">${Object.entries(FONTS).map(([k, [l, f]]) => opt('font', k, l, f ? ` style="font-family:'${f}',sans-serif"` : '')).join('')}</div>
        <div class="set-note muted" style="margin-top:10px">Шрифт сум і цифр</div><div class="lk-row">${opt('nfont', 'same', 'Як основний')}${Object.entries(FONTS).map(([k, [l, f]]) => opt('nfont', k, l, f ? ` style="font-family:'${f}',sans-serif"` : '')).join('')}</div>
        <div class="set-note muted" style="margin-top:10px">Розмір</div><div class="lk-row">${[85, 92, 100, 110, 120].map(z => opt('size', z, z === 100 ? 'Звичайний' : z + '%')).join('')}</div></div>
      <div class="card"><h3>🪟 Віконця</h3><div class="set-note muted">Кути</div><div class="lk-row">${opt('radius', 'round', '◯ Круглі')}${opt('radius', 'soft', '▢ М\'які')}${opt('radius', 'square', '□ Прямі')}</div>
        <div class="set-note muted" style="margin-top:10px">Анімації</div><div class="lk-row">${opt('anim', 1, '✨ Увімкнені')}${opt('anim', 0, '⚡ Вимкнені (швидше на слабких)')}</div></div>
      <div class="card"><h3>🔊 Звук сповіщень</h3><div class="lk-row">${Object.entries(SOUNDS).map(([k, [l]]) => opt('sound', k, (k === 'off' ? '🔇 ' : '▶ ') + l)).join('')}</div>
        <div class="set-note muted" style="margin-top:10px">Гучність</div><div class="lk-row">${[30, 50, 70, 100].map(v => opt('vol', v, v + '%')).join('')}</div>
        <div class="btnrow" style="margin-top:12px"><button class="btn sm" data-a="lookReset">↺ Скинути все до стандарту</button></div></div>
      <div class="muted set-note" style="grid-column:1/-1">Вигляд зберігається на цьому пристрої — кожен телефон і планшет можна налаштувати по-своєму.</div></div>`;
  }
  function settingsHTML(only) {
    const st = S.data.staff, wf = S.data.wifi, c = st?.cfg || {};
    const ROLE = { admin: '🔐 адмін', cook: '👨‍🍳 кухар', courier: '🛵 кур\'єр', waiter: '🧑‍🍳 офіціант' };
    const row = (l, v, btn, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ''}</span><span class="kv-r"><b>${v}</b>${btn}</span></div>`;
    const ch = (a, extra = '') => `<button class="btn sm" data-a="${a}"${extra}>змінити</button>`;
    const staff = st ? [...st.staff].sort((a, b) => (a.role || '').localeCompare(b.role || '') || a.name.localeCompare(b.name)) : null;
    const OWN = ['test'], SS = [['rules', '⚙️ Правила роботи'], ['go', '🛵 Доставка'], ['loy', '🎁 Лояльність'], ['look', '🎨 Вигляд'], ['printer', '🖨 Принтер'], ['test', '🧪 Тест']].filter(([k]) => !OWN.includes(k) || S.setTab === k) /* заклад і сайт — у кабінеті власника; тест — за посиланням */, cur = only || (SS0 => SS0.includes(S.setTab) ? S.setTab : 'rules')(['rules', 'go', 'loy', 'look', 'printer', 'test']);
    const part = {};
    part.people = `<div class="grid2 set">
      ${[['admin', '🔐 Адміністратори'], ['waiter', '🧑‍🍳 Офіціанти'], ['cook', '👨‍🍳 Кухня'], ['courier', '🛵 Кур\'єри']].map(([r, t]) => { const l = staff ? staff.filter(s => (ROLE[s.role] ? s.role : 'waiter') === r) : null;
        return `<div class="card"><h3>${t} <span class="muted">· ${l ? l.length : '…'}</span></h3>
        <div class="scrollbox">${l ? l.map(s => `<div class="kv stf-row"><span class="stf-n">${esc(s.name)}</span><span class="kv-r"><button class="btn sm" data-a="stfName" data-id="${s.id}" title="Змінити імʼя">✏️</button><button class="btn sm" data-a="stfPin" data-id="${s.id}" title="Змінити PIN">🔑</button><button class="btn sm" data-a="stfRole" data-id="${s.id}" title="Змінити роль">🔄</button><button class="btn sm red" data-a="staffDel" data-id="${s.id}" title="Видалити">🗑</button></span></div>`).join('') || '<div class="muted">Ще немає</div>' : '…'}</div></div>`; }).join('')}
      <div class="card"><h3>➕ Новий працівник</h3><div class="muted set-note">Або сам — кодом реєстрації в касі.</div>
        <button class="btn sm primary" data-a="staffAdd">➕ Додати працівника</button></div>
      <div class="card"><h3>🆕 Коди реєстрації</h3><div class="muted set-note">Новий працівник вводить код замість PIN → пише імʼя і придумує свій PIN.</div>
        ${st?.reg ? row('🔐 Адміністратор', esc(st.reg.admin), ch('regSet', ' data-r="admin"')) + row('🧑‍🍳 Офіціант', esc(st.reg.waiter), ch('regSet', ' data-r="waiter"')) + row('👨‍🍳 Кухар', esc(st.reg.cook || '1113'), ch('regSet', ' data-r="cook"')) + row('🛵 Кур\'єр', esc(st.reg.courier || '1114'), ch('regSet', ' data-r="courier"')) : '…'}</div>
      <div class="card"><h3>🤖 Увійшли в Telegram-бот</h3><div class="scrollbox">${st ? st.waiters.map(w => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">Вийти</button></div>`).join('') || '<div class="muted">Нікого</div>' : '…'}</div></div></div>`;
    const tg = (k, l, hint, def = 0) => `<div class="kv press" data-a="cfgTgl" data-k="${k}" data-def="${def}"><span>${l}<br><small class="muted">${hint}</small></span><span class="switch ${c[k] ?? def ? 'on' : ''}"></span></div>`;
    part.rules = `<div class="grid2 set">
      <div class="card"><h3>🪑 Зал</h3>${row('🪑 Столів у залі', S.n, ch('cfg', ' data-k="tables"'), 'Скільки столів показує каса й QR-меню')}</div>
      <div class="card"><h3>💰 Гроші</h3>
        ${row('🏷 Макс. знижка офіціанта', (c.discMax ?? 20) + '%', ch('cfg', ' data-k="discMax"'), 'Більшу знижку дає лише адміністратор')}
        ${row('👨‍🍳 Частка кухні від чайових', (st?.kpct ?? 20) + '%', ch('kpct'), `Плюс «подяка кухні» від гостя; порівну між кухарями на зміні${st?.cooks?.length ? ` (зараз: ${st.cooks.map(esc).join(', ')})` : ' (сьогодні ще нікого — піде в «👨‍🍳 Кухня»)'}`)}</div>
      <div class="card"><h3>🌙 День і Z-звіт</h3>
        ${row('🕒 Робочий день закінчується о', String(c.dayH ?? 3).padStart(2, '0') + ':00', ch('cfg', ' data-k="dayH"'), 'Чеки до цієї години рахуються в попередній день (0–8)')}
        ${tg('autoZ', '🤖 Автоматичний Z-звіт', 'Сам закриває день, якщо Z не закрили вручну')}${tg('zPrint', '🖨 Друкувати авто-Z', 'На принтері каси')}${tg('zTg', '✈️ Надсилати Z у Telegram', 'Звіт приходить у групу персоналу')}${tg('zRemind', '🔔 Нагадувати про незакритий Z', 'Якщо автоматичний Z вимкнено')}</div>
      <div class="card"><h3>👷 Зміни</h3>
        ${row('⏰ Запізнення рахується після', (c.lateMin ?? 10) + ' хв', ch('cfg', ' data-k="lateMin"'), 'Від запланованого часу початку зміни')}
        ${row('➖ Штраф за запізнення', (c.lateFine ?? 0) + ' ₴', ch('cfg', ' data-k="lateFine"'), '0 — без штрафу; адмін вирішує кнопкою «✅ + штраф»')}</div>
      <div class="card"><h3>🧮 Розрахунок</h3>
        ${tg('semiCalc', '📐 Соуси й тісто — розрахунком', 'Увімкнено: продали страву — продукти з рецепту соусу списуються самі, варити «заготовку» не треба. Вимкнено: облік партіями через «🍳 Заготовка»', 1)}
        ${row('🎯 Цільовий фудкост', (c.foodCost ?? 30) + '%', ch('cfg', ' data-k="foodCost"'), 'Собівартість ÷ ціна. За ним рахується рекомендована ціна страв')}
        ${row('🔺 Сповіщати про подорожчання від', (c.priceAlert ?? 5) + '%', ch('cfg', ' data-k="priceAlert"'), 'Якщо в накладній ціна продукту вища за минулу')}</div>
      <div class="card"><h3>📱 Замовлення гостей</h3>
        ${row('⏱ Час на замовлення після QR', (c.scanMin ?? 60) + ' хв', ch('cfg', ' data-k="scanMin"'), 'Скільки гість може замовляти після сканування QR на столі')}
        <div class="muted set-note" style="margin-top:10px">📶 Wi‑Fi закладу (запасний спосіб) · ваша мережа: ${esc(wf?.current || '…')}</div>
        <div class="scrollbox sm">${wf ? wf.list.map(x => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString('uk-UA')}</span></div>`).join('') || '<div class="muted">немає збережених адрес</div>' : ''}</div>
        <div class="btnrow"><button class="btn sm primary" data-a="wifiAdd">➕ Це наша мережа</button><button class="btn sm red" data-a="wifiClear">Скинути всі</button></div></div></div>`;
    part.go = goSetHTML();
    part.loy = loyHTML(); // 🎁 75-loyalty.js
    part.look = lookHTML();
    part.printer = printerCards() + linksCard();
    part.test = `<div class="grid2 set"><div class="card"><h3>🧪 Тест</h3><div class="muted set-note">Тимчасово, до запуску.</div><button class="btn sm red" data-a="reset">♻️ Обнулити все</button></div></div>`;
    if (only) return part[only];
    return `<div class="rhead"><div><h1>Налаштування</h1><span class="muted">правила роботи, принтер</span></div><div class="icogrp">${isAdmin() ? `<a class="btn icobtn" href="owner.html${VENUE ? '' : '#pos=' + S.token}" target="_blank" rel="noopener" title="Кабінет власника">👑</a>` : ''}<button class="btn icobtn" data-a="zpHelp" title="Допомога">🆘</button></div></div>
      <div class="seg rsec">${SS.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="setTab" data-s="${k}">${l}</button>`).join('')}</div>${part[cur]}`;
  }
  async function menuEdit(id) {
    const it = itemsAll().find(i => i.id === id) || null;
    const cat = it ? S.menu.categories.find(c => c.items.includes(it)).id : S.menu.categories[0].id;
    const body = `<div class="form">
      <label>Розділ<select id="fCat">${S.menu.categories.map(c => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${esc(c.name.uk)}</option>`).join('')}</select></label>
      <label>Назва<input id="fName" value="${esc(it?.name.uk || '')}"></label>
      <label>Назва англійською (необовʼязково)<input id="fEn" value="${esc(it && it.name.en !== it.name.uk ? it.name.en : '')}"></label>
      <label>Ціна, ₴ ${it?.variants ? '' : ''}<input id="fPrice" inputmode="numeric" value="${it?.price ?? ''}" placeholder="напр. 380"></label>
      <label>Або розміри (для напоїв): <span class="muted">0.33=60, 0.5=70</span><input id="fVar" value="${esc(it?.variants ? it.variants.map(v => `${v.v}=${v.p}`).join(', ') : '')}"></label>
      <label>Вага/обʼєм<input id="fSize" value="${esc(it?.size || '')}" placeholder="напр. 400 г або л"></label>
      <label>Склад<textarea id="fDesc" rows="3">${esc(it?.desc?.uk || '')}</textarea></label>
      ${it ? `<label>Фото<input id="fPhoto" type="file" accept="image/*"></label>` : ''}</div>`;
    const v = await modal({ title: it ? 'Редагувати страву' : 'Нова страва', body, buttons: [{ label: '💾 Зберегти', val: 'save', cls: 'primary' }, ...(it ? [{ label: '📸 ШІ-фото', val: 'ai' }, { label: '🗑 Видалити страву', val: 'del', cls: 'red' }] : []), { label: 'Скасувати', val: null }], keep: true });
    if (v === 'ai') { closeModal(); return phDish(it); }
    if (v === 'del') { if (await confirmBox(`Видалити «${it.name.uk}» з меню?`)) await act('menuDel', { id: it.id }, '🗑 Видалено'); return; }
    if (v !== 'save') return;
    const variants = $('#fVar').value.split(',').map(s => s.trim()).filter(Boolean).map(s => { const [vv, p] = s.split(/[=:]/).map(x => x.trim()); return { v: vv.replace(',', '.'), p: +p }; }).filter(x => x.v && x.p);
    const item = { id: it?.id, cat: $('#fCat').value, name: $('#fName').value, nameEn: $('#fEn').value, price: +$('#fPrice').value, variants, size: $('#fSize').value, desc: $('#fDesc').value };
    const file = $('#fPhoto')?.files?.[0];
    closeModal();
    const r = await act('menuSave', { item }, '💾 Збережено');
    if (r && file) { const data = await shrink(file);
      const inf = await api('photoInfo').catch(() => null); // 📸 є стиль закладу → запропонувати обробити
      if (inf?.on && (inf.prompt || inf.refs.length) && await choose('📸 Обробити фото в стилі закладу?', 'ШІ прибере фон і зробить фото як інші в меню. Оригінал не зникне, поки не натиснете «✅ Взяти».', [{ label: '🪄 Обробити', val: 1, cls: 'primary' }, { label: 'Ні, як є', val: 0 }])) { await phDish(itemsAll().find(i => i.id === r.id) || { id: r.id, name: { uk: item.name }, img: it?.img }, { data }); }
      else await act('menuPhoto', { id: r.id, data }, '📷 Фото оновлено'); }
    loadMenu().catch(() => {});
  }
  // ---------- 🔳 QR-коди меню: усі столи (за кількістю столів), друк на принтері чеків, файл для друкарні, нові коди ----------
  async function qrPanel() {
    let r; try { r = await api('qrInfo'); } catch (e) { return toast('⚠️ ' + errText(e.message)); }
    const v = await modal({ title: `🔳 QR-коди меню · ${r.n} столів`, body: `<div class="muted" style="font-size:13px">У кожного столу свій QR — гість сканує й замовляє одразу на цей стіл. Кількість столів — у Налаштуваннях → 🪑 Зал.${r.next > Date.now() ? ` 🔄 Нові коди — не частіше разу на місяць, наступні з ${new Date(r.next).toLocaleDateString('uk-UA')}.` : ''}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">Торкніться QR — збережеться на пристрій у високій якості (1000×1000).</div><div class="qr-grid">${r.list.map(x => `<a href="#" data-mi-v="dl:${x.t}"><img src="${esc(x.img)}" alt="" loading="lazy"><b>Стіл ${x.t} ⬇️</b></a>`).join('')}</div>`,
      buttons: [{ label: `⬇️ Зберегти всі (${r.n})`, val: 'dlall', cls: 'primary' }, { label: '💾 Аркуш A4 / PDF', val: 'file' }, ...(r.next > Date.now() ? [] : [{ label: '🔄 Нові коди', val: 'new', cls: 'red' }]), { label: 'Закрити', val: null }] });
    if (String(v).startsWith('dl:')) { const x = r.list.find(y => y.t === +v.slice(3)); await qrSave(x); return qrPanel(); }
    if (v === 'dlall') { toast('⬇️ Готую ' + r.n + ' QR…');
      if (matchMedia('(hover: none)').matches && navigator.canShare) { const fs = await Promise.all(r.list.map(async x => new File([await (await fetch(x.img + '?s=24')).blob()], `QR-стіл-${x.t}.png`, { type: 'image/png' }))).catch(() => null); if (fs && navigator.canShare({ files: fs })) { await navigator.share({ files: fs }).catch(() => {}); return; } } // телефон: одним «Зберегти зображення»
      for (const x of r.list) { await qrSave(x); await new Promise(z => setTimeout(z, 400)); } }
    if (v === 'file') qrSheet(r);
    if (v === 'new' && await confirmBox('🔄 Створити нові QR-коди?', 'Усі ВЖЕ НАДРУКОВАНІ QR перестануть давати доступ до замовлення — їх треба буде замінити на столах. Принтер чеків одразу друкуватиме нові.')) { if (await act('qrNew', {}, '🔄 Нові коди створено')) qrPanel(); }
  }
  async function qrSave(x) { // PNG високої якості → файл «QR-стіл-3.png» (на телефоні — у Файли / Фото)
    try { const b = await (await fetch(x.img + '?s=24')).blob(), f = new File([b], `QR-стіл-${x.t}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [f] }) && matchMedia('(hover: none)').matches) { await navigator.share({ files: [f] }).catch(() => {}); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } catch { toast('⚠️ Не вдалось зберегти'); }
  }
  function qrSheet(r) { // сторінка-аркуш A4 (по 6 табличок) → «Зберегти як PDF» або друк — для друкарні
    const name = esc(S.brand?.name || 'VARVAR'), w = window.open('', '_blank'); if (!w) return toast('⚠️ Дозвольте спливаючі вікна');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-коди — ${name}</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:system-ui,sans-serif}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}.c{border:1px dashed #bbb;border-radius:4mm;padding:6mm;text-align:center;break-inside:avoid;height:84mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center}.c h2{margin:0;font-size:20pt;letter-spacing:1px}.c img{width:52mm;height:52mm;margin:3mm 0}.c b{font-size:16pt}.c small{color:#555;font-size:10pt}.bar{padding:10px;text-align:center}@media print{.bar{display:none}}</style>
      <div class="bar"><button onclick="print()" style="font-size:16px;padding:8px 16px">🖨 Друк / зберегти PDF</button></div><div class="g">${r.list.map(x => `<div class="c"><h2>${name}</h2><img src="${x.img}?s=20"><b>СТІЛ ${x.t}</b><small>Скануйте — меню й замовлення</small></div>`).join('')}</div>`);
    w.document.close();
  }
  // ---------- 📸 ШІ-фото страв (photoai.js): чернетка → «до / після» → ✅ Взяти ----------
  const pickFile = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => res(i.files[0] || null); i.click(); });
  const phCtx = () => ({ menu: S.menu, toast, vapi: async (op, data) => { try { return await api(op, data, op === 'photoMake' ? 100000 : 12000); } catch (e) { const x = new Error(e.data?.error === 'pay' ? 'pay' : errText(e.message)); x.data = e.data; throw x; } },
    img: async () => { const f = await pickFile(); return f ? shrink(f) : null; }, onDone: () => loadMenu().catch(() => {}) });
  const phDish = (it, o) => window.PHOTOAI.dish(phCtx(), it, o); // 📸 одне вікно з кабінетом власника — js/photo-ai.js
  const phPanel = () => window.PHOTOAI.open(phCtx());
  function shrink(file, max = 1200, qq = .85) { // фото → JPEG до max px
    return new Promise(res => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', qq)); }; img.src = URL.createObjectURL(file); });
  }


  // 🖌 стиль (конструктор) — Налаштування → Вигляд
  const skMode = () => look().skin || (VVSkin.skinPart(S.lookV) ? 'venue' : 'old');
  function skinCard() {
    const m = skMode(), L = look(), own = L.sk && JSON.stringify(L.sk), pre = k => own === JSON.stringify(SK_PRE[k][2]);
    const b = (on, a, extra, t, sub) => `<button class="${on ? 'on' : ''}" data-a="${a}" ${extra}>${t}<small>${sub}</small></button>`;
    return `<div class="card" style="grid-column:1/-1"><h3>🖌 Стиль</h3><div class="set-note muted">Вигляд кнопок, карток, меню й вікон. «Стара каса» — точно як було. Стиль закладу задає адмін для всіх пристроїв; «свій» — лише на цьому.</div>
      <div class="sk-pre" style="margin-top:10px">${b(m === 'old', 'skSet', 'data-v="old"', '↩️ Стара каса', 'як було раніше')}${S.lookV ? b(m === 'venue', 'skSet', 'data-v="venue"', '🏪 Стиль закладу', 'для всіх пристроїв') : ''}
        ${Object.entries(SK_PRE).map(([k, [t, sub]]) => b(m === 'own' && pre(k), 'skSet', `data-v="pre" data-p="${k}"`, t, sub)).join('')}${m === 'own' && !Object.keys(SK_PRE).some(pre) ? b(true, 'skSet', 'data-v="own"', '✏️ Свій', 'на цьому пристрої') : ''}</div>
      <div class="btnrow" style="margin-top:12px"><button class="btn sm primary" data-a="skEdit">🎨 Конструктор</button><button class="btn sm" data-a="skCode">📥 Вставити код</button>${isAdmin() ? `<button class="btn sm" data-a="skVenue">🏪 Зробити стилем закладу</button>${S.lookV ? '<button class="btn sm ghost" data-a="skVenueOff">✕ Прибрати стиль закладу</button>' : ''}` : ''}</div></div>`;
  }
  const skSave = (skin, sk) => { store.set('look', { ...look(), skin, ...(sk ? { sk } : {}) }); applyLook(); renderMain(); };
  const skCur = () => skinOf() || { ...SK_BASE };
  const skDiff = K => Object.fromEntries(Object.entries(K).filter(([k, v]) => SK_BASE[k] !== v));
  async function skEditor() {
    const K = { ...skCur() }, body = VVSkin.editorHTML(K);
    const pm = modal({ title: '🎨 Конструктор стилю', body, buttons: [{ label: '💾 Зберегти на цьому пристрої', val: 'own', cls: 'primary' }, ...(isAdmin() ? [{ label: '🏪 Зберегти для всього закладу', val: 'venue' }] : []), { label: 'Скасувати', val: null }], keep: true });
    const box = $('#modal .skc'), upd = () => applySkin(K); VVSkin.bind(box, K, upd);
    upd(); const v = await pm; closeModal();
    if (v === 'own') skSave('own', skDiff(K));
    else if (v === 'venue' && await act('lookVSet', { look: { ...skDiff(K), ...(S.lookV?.ct ? { ct: S.lookV.ct, ca: S.lookV.ca } : {}) } }, '🏪 Стиль закладу збережено')) { S.lookV = { ...skDiff(K), ...(S.lookV?.ct ? { ct: S.lookV.ct, ca: S.lookV.ca } : {}) }; skSave('venue'); }
    else applyLook();
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^sk(Set|Edit|Code|Venue|VenueOff)$/.test(el.dataset.a)) return; const a = el.dataset.a, d = el.dataset;
    if (a === 'skSet') return d.v === 'pre' ? skSave('own', SK_PRE[d.p][2]) : skSave(d.v);
    if (a === 'skEdit') return skEditor();
    if (a === 'skCode') { const t = await ask('📥 Код стилю', 'Вставте рядок VARVAR-STYLE {…} з конструктора'); if (!t) return; try { const j = JSON.parse(t.slice(t.indexOf('{'))); const K = Object.fromEntries(Object.entries(j).filter(([k]) => k in SK_BASE)); if (K.r != null || K.font) { skSave('own', K); toast('🎨 Стиль застосовано на цьому пристрої'); } else toast('⚠️ У коді немає налаштувань стилю'); } catch { toast('⚠️ Не вдалося прочитати код'); } return; }
    if (a === 'skVenue') { const K = skDiff(skCur()); if (!(await confirmBox('🏪 Зробити поточний стиль стилем закладу?', 'Він зʼявиться на всіх пристроях, де вибрано «Стиль закладу» (за замовчуванням). Повернути стару касу можна будь-коли.'))) return; if (await act('lookVSet', { look: K }, '🏪 Стиль закладу збережено')) { S.lookV = K; skSave('venue'); } return; }
    if (a === 'skVenueOff') { if (await confirmBox('Прибрати стиль закладу?', 'Пристрої без свого стилю повернуться до старої каси') && await act('lookVSet', { look: null }, '↩️ Прибрано')) { S.lookV = null; skSave('old'); } }
  });
