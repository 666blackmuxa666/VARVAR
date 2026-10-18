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
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">🖨 Тестовий друк</button><button class="btn" data-a="pQr">🔳 QR меню для столу</button><button class="btn" data-a="qrPanel">🔳 Усі QR-коди</button></div></div>${stCard()}${taxCard()}${prnCard()}`;
  }
  // 🖨 що на який принтер (js/prnroute.js) — лише адмін; розподіл вантажиться раз при відкритті вкладки
  // 🍳 цехи кухні: свій екран, принтер і готовність; порожній список = як раніше (одна кухня)
  const stNew = () => 'c' + Math.random().toString(36).slice(2, 7);
  function stCard() {
    if (!isAdmin()) return '';
    if (!S.stR) { if (!S.stL) { S.stL = 1; api('stGet', {}).then(r => { S.stR = r; renderMain(); }).catch(() => { S.stL = 0; }); } return '<div class="card" style="margin-top:12px"><h3>🍳 Цехи кухні</h3><div class="muted">Завантаження…</div></div>'; }
    const R = S.stR, GU = { kitchen: '🍳 кухня', bar: '🍹 бар', hookah: '💨 кальян', other: '📦 інше' };
    return `<div class="card" style="margin-top:12px"><h3>🍳 Цехи кухні</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Гарячий, холодний, бар… — у кожного свій екран (/k), квиток на свій принтер і свій статус «готово». Без цехів усе працює як раніше.</div>
      ${R.sts.map(z => `<div class="kv"><span>${esc((z.emoji ? z.emoji + ' ' : '') + z.name)} <span class="muted">· ${z.g.map(g => GU[g]).join(', ') || 'лише розділи'}${z.pr ? ' · 🖨 ' + esc((S.prnR?.route.st || []).find(p => p.id === z.pr)?.name || z.pr) : ''}${z.scr ? '' : ' · без екрана'}</span></span><span style="display:flex;gap:6px"><button class="btn sm" data-stx="edit" data-id="${z.id}">✏️</button><button class="btn sm" data-stx="del" data-id="${z.id}">🗑</button></span></div>`).join('') || '<div class="muted">Цехів немає — працює одна кухня.</div>'}
      <div class="btnrow" style="margin-top:8px"><button class="btn sm" data-stx="add">➕ Цех</button></div>
      ${R.sts.length ? `<h3 class="muted" style="margin:14px 0 6px;font-size:14px">Розділи меню → цех</h3>${R.cats.map(c => `<div class="kv"><span>${esc(c.name)}</span><select data-stx="cat" data-id="${esc(c.id)}"><option value="">авто (за групою)</option>${R.sts.map(z => `<option value="${z.id}" ${c.st === z.id ? 'selected' : ''}>${esc((z.emoji ? z.emoji + ' ' : '') + z.name)}</option>`).join('')}</select></div>`).join('')}` : ''}</div>`;
  }
  async function stSave(list, cats) { const r = await act('stSet', { list, cats }, '🍳 Збережено'); S.stR = null; S.stL = 0; if (r) loadMenu?.().catch(() => {}); renderMain(); return r; }
  async function stEdit(z) {
    const name = await askVal('Назва цеху', z.name); if (!name?.trim()) return null;
    const emoji = await askVal('Емодзі (необовʼязково)', z.emoji || '');
    const g = await choose('Які страви сюди за замовчуванням?', 'Розділи меню можна призначити окремо нижче', [{ label: '🍳 Кухня', val: 'kitchen' }, { label: '🍹 Бар', val: 'bar' }, { label: '💨 Кальян', val: 'hookah' }, { label: '📦 Інше', val: 'other' }, { label: '— лише вибрані розділи', val: 'none' }]); if (!g) return null;
    const ps = S.prnR?.route.st || []; let pr = z.pr || ''; if (ps.length) { const p = await choose('🖨 Принтер цеху', 'Куди друкувати квитки цього цеху', [...ps.map(x => ({ label: x.name, val: x.id })), { label: '— за групою (як раніше)', val: 'none' }]); if (!p) return null; pr = p === 'none' ? '' : p; }
    return { ...z, name: name.trim(), emoji: (emoji || '').trim(), g: g === 'none' ? [] : [g], pr, scr: 1 };
  }
  document.addEventListener('click', async e => { const el = e.target.closest('button[data-stx]'); if (!el || !S.stR) return; const R = S.stR;
    if (el.dataset.stx === 'add') { const z = await stEdit({ id: stNew() }); if (z) await stSave([...R.sts, z], null); }
    else if (el.dataset.stx === 'edit') { const z = await stEdit(R.sts.find(x => x.id === el.dataset.id)); if (z) await stSave(R.sts.map(x => x.id === z.id ? z : x), null); }
    else if (el.dataset.stx === 'del' && await confirmBox('Видалити цех?', 'Страви підуть у перший цех або за групою')) { const cats = Object.fromEntries(R.cats.filter(c => c.st === el.dataset.id).map(c => [c.id, ''])); await stSave(R.sts.filter(x => x.id !== el.dataset.id), cats); } });
  document.addEventListener('change', async e => { const el = e.target.closest('select[data-stx="cat"]'); if (el) await stSave(S.stR.sts, { [el.dataset.id]: el.value }); });
  // 📅 податковий календар: ФОП/ТОВ → дати звітів і платежів, нагадування в Telegram; без КЕП і без доступу до рахунків
  const TXR = { minWage: 'Мінімальна зарплата, ₴', living: 'Прожитковий мінімум, ₴', esv: 'ЄСВ, %', ep3: 'ЄП 3 групи, % доходу', vz: 'Військовий збір ФОП, % доходу', pdfo: 'ПДФО із зарплати, %', vzZp: 'Військовий збір із зарплати, %' };
  function taxCard() {
    if (!isAdmin()) return '';
    const hd = '<div class="card" style="margin-top:12px"><h3>📅 Податковий календар</h3>';
    if (!S.txR) { if (!S.txL) { S.txL = 1; api('taxGet', {}).then(r => { S.txR = r; renderMain(); }).catch(() => { S.txL = 0; }); } return hd + '<div class="muted">Завантаження…</div></div>'; }
    const R = S.txR, T = R.tax, dm = d => d.split('-').reverse().slice(0, 2).join('.');
    return hd + `<div class="muted" style="font-size:13px;margin-bottom:8px">Оберіть форму — система нагадає в Telegram про звіти й платежі та дасть посилання на кабінет платника. Ми не подаємо звіти й не маємо доступу до рахунків. ⚠️ Дати й суми орієнтовні — звірте з бухгалтером.</div>
      <div class="kv"><span>Форма</span><button class="btn sm ${T.kind ? 'primary' : ''}" data-tx="kind">${esc(R.kinds[T.kind] || 'Не обрано')}</button></div>
      ${T.kind === 'tov' ? `<div class="kv"><span>Платник ПДВ</span><label class="switch"><input type="checkbox" data-tx="pdv" ${T.pdv ? 'checked' : ''}><i></i></label></div>` : ''}
      ${T.kind ? `<div class="kv"><span>🔔 Нагадування в Telegram</span><label class="switch"><input type="checkbox" data-tx="on" ${T.on ? 'checked' : ''}><i></i></label></div>
      <div class="kv"><span>Нагадувати за (днів)</span><button class="btn sm" data-tx="lead">${T.lead}</button></div>
      <div class="kv"><span>Ставки й мінімуми</span><button class="btn sm" data-tx="rates">✏️ Змінити</button></div>
      <h3 class="muted" style="margin:14px 0 6px;font-size:14px">Найближчі строки</h3>
      ${R.list.map(e => `<div class="kv" style="${e.done ? 'opacity:.5' : ''}"><span>${esc(e.title)}<br><small class="muted">${dm(e.d)} · ${e.left < 0 ? 'прострочено' : e.left === 0 ? 'сьогодні' : 'через ' + e.left + ' дн.'}${e.amt ? ' · ≈ ' + money(e.amt) : ''}</small></span><button class="btn sm ${e.done ? '' : 'primary'}" data-tx="done" data-k="${esc(e.key)}" data-v="${e.done ? 0 : 1}">${e.done ? '↩️' : '✅ Готово'}</button></div>`).join('') || '<div class="muted">Немає строків найближчим часом</div>'}
      <div class="btnrow" style="margin-top:10px"><a class="btn sm" href="${esc(R.link)}" target="_blank" rel="noopener">🔗 Кабінет платника податків</a></div>` : ''}</div>`;
  }
  async function taxDo(b, msg) { const r = await act('taxSet', b, msg || '💾 Збережено'); if (r) S.txR = r; renderMain(); }
  document.addEventListener('click', async e => { const el = e.target.closest('button[data-tx]'); if (!el || !S.txR) return; const R = S.txR, T = R.tax, a = el.dataset.tx;
    if (a === 'kind') { const k = await choose('Форма оподаткування', 'Від неї залежать строки й платежі', [...Object.entries(R.kinds).map(([val, label]) => ({ label, val })), { label: '🚫 Не вести', val: '-' }]); if (k) await taxDo({ kind: k === '-' ? '' : k }); }
    else if (a === 'lead') { const v = await askVal('За скільки днів нагадувати (0–30)', String(T.lead), 'number'); if (v != null && v !== '') await taxDo({ lead: +v }); }
    else if (a === 'rates') { const b = {}; for (const [k, l] of Object.entries(TXR)) { const v = await askVal(l, String(T.rates[k]), 'number'); if (v == null) return; if (v !== '') b[k] = +v; } await taxDo({ rates: b }); }
    else if (a === 'done') { const r = await act('taxDone', { key: el.dataset.k, v: +el.dataset.v }, el.dataset.v === '1' ? '✅ Позначено' : '↩️ Знято'); if (r) S.txR = r; renderMain(); } });
  document.addEventListener('change', async e => { const el = e.target.closest('input[data-tx]'); if (el && S.txR) await taxDo({ [el.dataset.tx]: el.checked ? 1 : 0 }); });
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
      <div class="muted" style="font-size:13px;margin:4px 4px 0">📂 Біля кожного розділу — куди йдуть його страви: 🍳 кухня (бігунок і екран кухні, упаковка «з собою») / 🍹 бар / 💨 кальян.</div>
      ${S.menu.categories.map(c => `<div class="btnrow" style="margin:18px 4px 8px;align-items:center;flex-wrap:wrap"><h3 class="muted catH" style="margin:0;flex:1;min-width:0">${esc(c.name.uk)}</h3>${c.tech ? '<span class="muted" style="font-size:12px">⚙️ технічний</span>' : `<button class="btn sm" data-a="catG" data-id="${c.id}" title="Куди йдуть страви розділу">${{ kitchen: '🍳 Кухня', bar: '🍹 Бар', hookah: '💨 Кальян' }[c.g] || '🍳 Кухня'}</button>${c.g === 'kitchen' ? `<button class="btn sm" data-a="catPack" data-id="${c.id}">${c.nopack ? '🚫 Без упаковки' : '🥡 З упаковкою'}</button>` : ''}`}</div><div class="grid2">${c.items.map(i => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? ' ⛔' : ''}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map(v => `${v.v} — ${v.p}`).join(' / ') : i.price + ' ₴'}${i.size && !i.variants ? ' · ' + esc(i.size) : ''}</div></div>›</button>`).join('')}</div>`).join('')}`;
  }
  function lookHTML() {
    const L = look(), opt = (k, v, l) => `<button class="lk-o${L[k] == v ? ' on' : ''}" data-a="look" data-k="${k}" data-v="${v}">${l}</button>`;
    const st = VVSkin.studio({ venue: S.lookV, dev: lookDev(), canVenue: isAdmin(), scope: S.lookScope, ...(isAdmin() ? {} : { note: 'Ваш колір і стиль — лише на цьому пристрої. Інші бачать вигляд закладу.' }), open: S.lookOpen, toast, ask: (t, ph) => ask(t, ph),
      onScope: v => { S.lookScope = v; }, rerender: renderMain,
      setVenue: l => { S.lookV = l; S.lookScope = 'venue'; applyLook(); }, saveVenue: l => api('lookVSet', { look: l }),
      setDev: d => { const { own, sk, ct, ca } = d; store.set('look', { ...look(), own, ...(own ? { sk, theme: ct || '', accent: ca || '' } : { sk: undefined, theme: 'night', accent: '' }) }); applyLook(); } });
    setTimeout(pushSwSync, 0);
    return `<div class="grid2 set"><div class="card" style="grid-column:1/-1"><h3>🎨 Студія вигляду</h3>${st}</div>
      <div class="card"><h3>📱 Цей пристрій</h3><div class="kv" id="pushRow" style="cursor:pointer"><span style="min-width:0">🔔 Сповіщення в шторку</span><span class="switch" id="pushSw"></span></div><div class="set-note muted">Розмір</div><div class="lk-row">${[85, 92, 100, 110, 120].map(z => opt('size', z, z === 100 ? 'Звичайний' : z + '%')).join('')}</div>
        <div class="set-note muted" style="margin-top:10px">Анімації</div><div class="lk-row">${opt('anim', 1, '✨ Увімкнені')}${opt('anim', 0, '⚡ Вимкнені (швидше на слабких)')}</div>
        <div class="btnrow" style="margin-top:12px"><button class="btn sm" data-a="lookReset">↺ Скинути пристрій до вигляду закладу</button></div></div>
      <div class="card"><h3>🔊 Звук сповіщень</h3><div class="lk-row">${Object.entries(SOUNDS).map(([k, [l]]) => opt('sound', k, (k === 'off' ? '🔇 ' : '▶ ') + l)).join('')}</div>
        <div class="set-note muted" style="margin-top:10px">Гучність</div><div class="lk-row">${[30, 50, 70, 100].map(v => opt('vol', v, v + '%')).join('')}</div></div></div>`;
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
        <div class="scrollbox">${l ? l.map(s => `<div class="kv stf-row"><span class="stf-n">${esc(s.name)}</span><span class="kv-r"><button class="btn sm" data-a="stfName" data-id="${s.id}" title="Змінити імʼя">✏️</button><button class="btn sm" data-a="stfPin" data-id="${s.id}" title="Змінити PIN">🔑</button><button class="btn sm" data-a="stfRole" data-id="${s.id}" title="Змінити роль">🔄</button><button class="btn sm" data-a="stfPerm" data-id="${s.id}" title="Права (галочки)">🛡${Object.keys(s.perm || {}).length ? '•' : ''}</button><button class="btn sm red" data-a="staffDel" data-id="${s.id}" title="Видалити">🗑</button></span></div>`).join('') || '<div class="muted">Ще немає</div>' : '…'}</div></div>`; }).join('')}
      <div class="card"><h3>➕ Новий працівник</h3><div class="muted set-note">Або сам — кодом реєстрації в касі.</div>
        <button class="btn sm primary" data-a="staffAdd">➕ Додати працівника</button></div>
      <div class="card"><h3>🆕 Коди реєстрації</h3><div class="muted set-note">Новий працівник вводить код замість PIN → пише імʼя і придумує свій PIN.</div>
        ${st?.reg ? row('🔐 Адміністратор', esc(st.reg.admin), ch('regSet', ' data-r="admin"')) + row('🧑‍🍳 Офіціант', esc(st.reg.waiter), ch('regSet', ' data-r="waiter"')) + row('👨‍🍳 Кухар', esc(st.reg.cook || '1113'), ch('regSet', ' data-r="cook"')) + row('🛵 Кур\'єр', esc(st.reg.courier || '1114'), ch('regSet', ' data-r="courier"')) : '…'}</div>
      <div class="card"><h3>🤖 Увійшли в Telegram-бот</h3><div class="scrollbox">${st ? st.waiters.map(w => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">Вийти</button></div>`).join('') || '<div class="muted">Нікого</div>' : '…'}</div></div></div>`;
    const tg = (k, l, hint, def = 0) => `<div class="kv press" data-a="cfgTgl" data-k="${k}" data-def="${def}"><span>${l}<br><small class="muted">${hint}</small></span><span class="switch ${c[k] ?? def ? 'on' : ''}"></span></div>`;
    part.rules = `<div class="grid2 set">
      <div class="card"><h3>🏛 Зали і столи</h3>${(() => { const H = c.halls || []; let a = 1;
        return (H.length ? H.map((h, i) => { const f = a; a += h.c; return `<div class="kv"><span>${h.ic} ${esc(h.n)}<br><small class="muted">${h.c} стол. · №${f}–${a - 1}</small></span><span class="kv-r"><button class="btn sm" data-hs="ed" data-i="${i}">✏️</button><button class="btn sm" data-hs="up" data-i="${i}" ${i ? '' : 'disabled'}>⬆️</button><button class="btn sm red" data-hs="del" data-i="${i}">🗑</button></span></div>`; }).join('')
          : row('🪑 Столів у залі', S.n, ch('cfg', ' data-k="tables"'), 'Один зал. Додайте зали й тераси — каса покаже перемикач'))
          + `<button class="btn sm primary" data-hs="add">➕ Додати ${H.length ? 'зал / терасу' : 'зали'}</button>`
          + `<div class="kv press" data-hs="map"><span>🗺 Схема залу<br><small class="muted">Розставте столи так, як вони стоять насправді</small></span><span class="muted kv-r" style="white-space:nowrap">розставити ›</span></div>`
          + `<div class="kv press" data-hs="go"><span>🛵 З собою і доставка<br><small class="muted">${['У залі — стрічкою над столами', 'Окрема вкладка «З собою і доставка»', 'Дві вкладки: «З собою» і «Доставка»'][c.goTabs || 0]}</small></span><span class="muted">змінити ›</span></div>`
          + '<div class="muted set-note">Столи нумеруються підряд через усі зали — номери й QR на столах лишаються. Офіціант обирає «⭐ Мої зали» на своєму пристрої.</div>'; })()}</div>
      <div class="card"><h3>💰 Гроші</h3>
        ${row('🏷 Макс. знижка офіціанта', (c.discMax ?? 20) + '%', ch('cfg', ' data-k="discMax"'), 'Більшу знижку дає лише адміністратор')}
        ${row('👨‍🍳 Частка кухні від чайових', (st?.kpct ?? 20) + '%', ch('kpct'), `Плюс «подяка кухні» від гостя; порівну між кухарями на зміні${st?.cooks?.length ? ` (зараз: ${st.cooks.map(esc).join(', ')})` : ' (сьогодні ще нікого — піде в «👨‍🍳 Кухня»)'}`)}</div>
      <div class="card"><h3>🌙 День і Z-звіт</h3>
        ${row('🕒 Робочий день закінчується о', String(c.dayH ?? 3).padStart(2, '0') + ':00', ch('cfg', ' data-k="dayH"'), 'Чеки до цієї години рахуються в попередній день (0–8)')}
      <div class="card"><h3>👷 Зміни</h3>
        ${row('⏰ Запізнення рахується після', (c.lateMin ?? 10) + ' хв', ch('cfg', ' data-k="lateMin"'), 'Від запланованого часу початку зміни')}
        ${row('➖ Штраф за запізнення', (c.lateFine ?? 0) + ' ₴', ch('cfg', ' data-k="lateFine"'), '0 — без штрафу; адмін вирішує кнопкою «✅ + штраф»')}</div>
      <div class="card"><h3>💡 Допродаж</h3><div class="muted set-note">До страви — що запропонувати гостю (каса, бот, сайт). До правил додаються пари, які гості й так беруть разом.</div><button class="btn sm" data-a="upsEdit">✏️ Правила допродажу</button></div>
      <div class="card"><h3>🧮 Розрахунок</h3>
        ${tg('semiCalc', '📐 Соуси й тісто — розрахунком', 'Увімкнено: продали страву — продукти з рецепту соусу списуються самі, варити «заготовку» не треба. Вимкнено: облік партіями через «🍳 Заготовка»', 1)}
        ${row('🎯 Цільовий фудкост', (c.foodCost ?? 30) + '%', ch('cfg', ' data-k="foodCost"'), 'Собівартість ÷ ціна. За ним рахується рекомендована ціна страв')}
        ${row('🏆 Премія за рекорд дня', (c.recBonus ?? 0) + ' ₴', ch('cfg', ' data-k="recBonus"'), 'Коли за день заробили більше, ніж будь-коли — кожному на зміні додається премія в ЗП. 0 — без премії')}
        ${row('🏦 Комісія банку за карту/онлайн', (c.bankFee ?? 0) + '%', ch('cfg', ' data-k="bankFee"'), 'Наприклад 1.3 — віднімається з прибутку за безготівкові оплати (звіти, кабінет власника)')}
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



  // 🏛 редактор залів (Правила роботи)
  async function hallsSave(halls, go = (S.data.staff?.cfg || S.cfg)?.goTabs || 0) { const r = await act('hallsSet', { halls, go }, '✅ Зали збережено'); if (r?.cfg) { S.cfg = r.cfg; S.n = r.cfg.tables || S.n; if (S.data.staff) S.data.staff.cfg = r.cfg; renderMain(); } }
  async function hallEdit(h) {
    const n = await askVal('Назва (Зал 1, Тераса, VIP…)', h?.n || ''); if (n == null) return null;
    const c = await askVal('Скільки столів', String(h?.c || 10), 'number'); if (c == null) return null;
    const ic = await choose('Значок', '', ['🪑', '🌿', '🍸', '🛋', '🎉', '☀️', '🏠', '🌙'].map(x => ({ label: x, val: x }))) || h?.ic || '🪑';
    return { n: n.trim() || 'Зал', c: +c, ic };
  }
  document.addEventListener('click', async ev => {
    const el = ev.target.closest('[data-hs]'); if (!el || !isAdmin()) return;
    const a = el.dataset.hs, i = +el.dataset.i, C = S.data.staff?.cfg || S.cfg || {}, H = (C.halls || []).map(h => ({ ...h }));
    if (a === 'add') { if (!H.length) H.push({ n: 'Зал', ic: '🪑', c: S.n }); const h = await hallEdit({ n: H.length > 1 ? 'Зал ' + (H.length + 1) : 'Тераса', c: 8, ic: H.length > 1 ? '🪑' : '🌿' }); if (h) { H.push(h); hallsSave(H); } return; }
    if (a === 'ed') { const h = await hallEdit(H[i]); if (!h) return; if (+h.c !== +H[i].c && i < H.length - 1 && !await confirmBox('Номери столів у наступних залах зсунуться — надруковані QR-коди цих столів доведеться передрукувати. Продовжити?')) return; H[i] = h; hallsSave(H); return; }
    if (a === 'up') { if (!await confirmBox('Номери столів у цих двох залах зміняться — надруковані QR-коди доведеться передрукувати. Продовжити?')) return; [H[i - 1], H[i]] = [H[i], H[i - 1]]; return hallsSave(H); }
    if (a === 'del') { if (!await confirmBox(`Видалити «${H[i].n}»? Столи далі перенумеруються.`)) return; H.splice(i, 1); return hallsSave(H); }
    if (a === 'map') { S.hm = 'map'; store.set('hm', 'map'); S.view = 'hall'; mapStart(); renderNav(); renderMain(); return; }
    if (a === 'go') { const g = await choose('🛵 З собою і доставка', 'Де показувати в касі', [['0', 'У залі — стрічкою'], ['1', 'Одна вкладка'], ['2', 'Дві вкладки']].map(([v, l]) => ({ label: l, val: v }))); if (g != null) hallsSave(H, +g); }
  });
