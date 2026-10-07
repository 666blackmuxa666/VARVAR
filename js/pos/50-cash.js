  function cashHTML() {
    const ctab = S.cashTab || 'day', cseg = `<div class="seg rsec cseg">${[['day', '💰 Сьогодні'], ['checks', '🧾 Чеки']].map(([k, l]) => `<button class="${ctab === k ? 'on' : ''}" data-a="cashTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    if (ctab === 'checks') return cseg + closedHTML();
    return cseg + courCard() + cashHTML0();
  }
  function cashHTML0() {
    const r = S.data.shift; if (!r) return '<div class="head"><h1>Каса</h1></div><div class="muted">Завантаження…</div>';
    const z = r.z, pc = z.total ? Math.round(z.cash / z.total * 100) : 0;
    const today = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
    // 0. гроші зараз — залишки за весь час (змін немає, усе переходить з дня в день)
    const B = r.bal, sg = n => (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n));
    const balH = B ? `<div class="bal">
      <button class="bal-c" data-a="balInfo" data-s="cash"><span>💵 Готівка в касі</span><b class="money">${money(B.cash)}</b><small>✏️ звірити</small></button>
      <button class="bal-c" data-a="balInfo" data-s="card"><span>💳 На картці</span><b class="money">${money(B.card)}</b><small>✏️ звірити</small></button>
      <div class="bal-c tot"><span>💰 Разом</span><b class="money">${money(B.total)}</b><small>${B.tipOwed ? `з них чайові ${money(B.tipOwed)} · вільних <b>${money(B.free)}</b>` : `з ${B.from ? B.from.split('-').reverse().join('.') : '—'}`}</small></div></div>` : '';
    // 1. головне: виручка за сьогодні, готівка/картка, кнопка Z
    const hero = `<div class="cash-hero on"><div class="hero-main"><div class="muted">${today}</div><div class="hero-l">Виручка за сьогодні</div><div class="hero-n money">${money(z.total)}</div>${z.tip ? `<div class="muted" style="font-size:13px">без чайових · + 💝 ${money(z.tip)} чайові персоналу</div>` : ''}
        <div class="split"><div class="bar2"><i style="width:${pc}%"></i></div><div class="split-l"><span>💵 Готівка <b class="money">${money(z.cash)}</b></span><span>💳 Картка <b class="money">${money(z.card)}</b></span></div></div></div>
      <button class="btn primary zbtn" data-a="zDay">🧾 Z-звіт<small>переглянути · друк · закрити день</small></button></div>`;
    // 2. плитки
    const tiles = [['🧾 Чеків', z.checks], ['Ø Середній чек', z.checks ? money(z.total / z.checks) : '—'], ['🏷 Знижки', money(z.disc)], ['💝 Чайові', money(z.tip || 0)], ['💸 Витрати', money(z.exCash + z.exCard)], ['📈 Чистими', money(z.net), 'green'], ['⏳ Відкрито в залі', z.openTables ? `${money(z.openSum)} · ${z.openTables} ст.` : '—']];
    const tilesH = `<div class="widgets">${tiles.map(([l, v, c]) => `<div class="widget ${c || ''}"><span>${l}</span><b class="money">${v}</b></div>`).join('')}</div>`;
    // 3. операції
    const ops = `<div class="card"><h3>⚡ Операції</h3><div class="opsg"><button class="btn" data-a="expense">💸 Витрата</button><button class="btn" data-a="cMove" data-t="+">➕ Внести</button><button class="btn" data-a="cMove" data-t="-">➖ Вилучити</button><button class="btn" data-a="cMove" data-t="x">🔁 Обмін</button></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Витрата — купили щось · Внести / вилучити — поклали чи забрали гроші (готівкою або з картки ФОП: собі, податки) · Обмін — картка ↔ готівка</div></div>`;
    // 4. готівка за весь час
    const kv = (l, v, cls = '') => `<div class="kv ${cls}"><span>${l}</span><b class="money">${v}</b></div>`;
    const all = '';
    // 5. рух коштів сьогодні (якщо є)
    const mvH = z.mvCash || z.mvCard ? `<div class="card"><h3>🔁 Рух коштів сьогодні</h3>${kv('Готівка', (z.mvCash > 0 ? '+' : '') + money(z.mvCash))}${z.mvCard ? kv('Картка', (z.mvCard > 0 ? '+' : '') + money(z.mvCard)) : ''}</div>` : '';
    // рахунки чайових: накопичено → «Видано» обнуляє (не виручка)
    const tb = Object.entries(r.tipbal || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const tipsH = `<div class="card"><h3>💝 Чайові до видачі</h3>${tb.length ? tb.map(([n, v]) => `<div class="kv"><span>👤 ${esc(n)}</span><span><b class="money">${money(v)}</b> <button class="btn sm green" data-a="tipPay" data-n="${esc(n)}">Видано</button></span></div>`).join('') : '<div class="muted">Нічого не накопичено</div>'}
      ${(r.tippay || []).length ? `<div class="muted" style="font-size:12px;margin-top:8px">Сьогодні видано: ${r.tippay.map(x => `${x.at} ${esc(x.name)} ${money(x.sum)}`).join(' · ')}</div>` : ''}<div class="muted" style="font-size:12px;margin-top:6px">Чайові — не виручка (гроші персоналу); лежать у касі, поки не видані, і списуються з готівки або картки при видачі.</div></div>`;
    // 6. журнал за сьогодні
    // 💵 / 💳 — окремо; змішана оплата — в обох частинах, обмін — в обох
    const MC = { in: 1, out: 1, k2c: 1, c2k: 1, tipc: 1, adjc: 1, salc: 1 }, MK = { k2c: 1, c2k: 1, kin: 1, tipk: 1, kout: 1, adjk: 1, salk: 1 };
    const chk = (x, part) => { const k = +x.card || 0, c = x.cash ?? (x.sum - k), v = part === 'card' ? k : c; return v > 0 ? { at: x.at, ic: part === 'card' ? '💳' : '💵', t: `Стіл ${tn(x.t)}${x.by ? ' · ' + esc(x.by) : ''}${x.disc ? ` · −${x.disc}%` : ''}${x.tip ? ` · 💝 ${money(x.tip)}` : ''}${k && c ? ' · змішана' : ''}`, v: '+' + money(v), cls: 'in' } : null; };
    const jlist = part => [...(r.closed || []).filter(x => !x.del && !x.rm).map(x => chk(x, part)).filter(Boolean),
      ...r.exp.map((e, i) => ({ e, i })).filter(({ e }) => (e.src === 'card') === (part === 'card')).map(({ e, i }) => ({ at: e.at, ic: '💸', t: esc(e.note || 'Витрата'), v: '−' + money(e.sum), cls: 'out', del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">✕</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="Відновити">↩️</button>` })),
      ...(r.mov || []).map((m, i) => ({ m, i })).filter(({ m }) => (part === 'card' ? MK : MC)[m.type]).map(({ m, i }) => ({ at: m.at, ic: '🔁', t: MOVE[m.type] + (m.note ? ' · ' + esc(m.note) : ''), v: money(m.sum), cls: 'mv', del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">✕</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="Відновити">↩️</button>` }))]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const jcard = (title, J) => `<div class="card"><h3>${title} <span class="muted" style="font-weight:400;font-size:13px">· ${J.length}</span></h3>${J.length ? J.map(x => `<div class="jr ${x.cls}${x.del ? ' del' : ''}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : '<i></i>'}</div>`).join('') : '<div class="muted">Поки порожньо</div>'}</div>`;
    const journal = jcard('💵 Журнал готівки за сьогодні', jlist('cash')) + jcard('💳 Журнал картки за сьогодні', jlist('card'));
    return `<div class="head"><h1>Каса</h1></div>${balH}${hero}${tilesH}<div class="cash-grid"><div class="col">${journal}</div><div class="col">${tipsH}${ops}${mvH}${all}</div></div>`;
  }
  const MOVE = { in: '➕ Внесення', out: '➖ Вилучення', k2c: '🔁 Картка → готівка', c2k: '🔁 Готівка → картка', tipc: '💝 Чайові (готівка)', tipk: '💝 Чайові (картка)', kin: '➕ Внесення на картку', kout: '➖ Вилучення з картки', adjc: '✏️ Звірка готівки', adjk: '✏️ Звірка картки', salc: '👷 Зарплата (готівка)', salk: '👷 Зарплата (картка)' };
  // розшифровка залишку + звірка з фактом
  async function balInfo(src) {
    const B = S.data.shift?.bal; if (!B) return; const c = src === 'card';
    const row = (l, v) => v ? `<div class="kv"><span>${l}</span><b class="money">${(v > 0 ? '+' : '−') + money(Math.abs(v))}</b></div>` : '';
    const body = (c ? [row('💳 Продажі карткою', B.saleCard), row('🔁 Рух (обмін, вилучення)', B.mvCard), row('💸 Витрати з картки', -B.exCard), row('💝 Чайові видано', -B.tipCard), row('✏️ Звірки', B.adjCard)]
      : [row('💵 Продажі готівкою', B.saleCash), row('🔁 Рух (внесення, вилучення, обмін)', B.mvCash), row('💸 Витрати з каси', -B.exCash), row('💝 Чайові видано', -B.tipCash), row('✏️ Звірки', B.adjCash)]).join('')
      + `<div class="kv" style="font-size:18px"><span><b>Має бути</b></span><b class="money">${money(c ? B.card : B.cash)}</b></div>`;
    const v = await modal({ title: c ? '💳 На картці' : '💵 Готівка в касі', body: `<div class="card" style="margin:0 0 12px">${body}</div><div class="form"><input id="rcAct" inputmode="decimal" placeholder="${c ? 'Залишок у Приват24, ₴' : 'Перерахували касу — скільки є, ₴'}"></div><div class="muted" style="font-size:12px">Якщо не збігається — впишіть факт, різниця запишеться як звірка (видно в журналі й Telegram)</div>`,
      buttons: [{ label: '✏️ Звірити', val: 1, cls: 'primary' }, { label: 'Закрити', val: null }], keep: true });
    const a = v && $('#rcAct').value.replace(',', '.').trim(); closeModal();
    if (v && a !== '' && +a >= 0) { const r = await act('reconcile', { src, actual: +a }); if (r) toast(r.diff ? `✏️ Різниця ${r.diff > 0 ? '+' : ''}${money(r.diff)} записана` : '✅ Усе збігається'); loadView(); }
  }
  async function cashMove(t) {
    if (t === '+') { t = await choose('➕ Внести', 'Куди додати гроші?', [{ label: '💵 Готівка в касу', val: 'in', cls: 'primary' }, { label: '💳 На картку', val: 'kin', cls: 'primary' }]); if (!t) return; }
    if (t === '-') { t = await choose('➖ Вилучити', 'Звідки забрати гроші?', [{ label: '💵 З каси (готівка)', val: 'out', cls: 'primary' }, { label: '💳 З картки', val: 'kout', cls: 'primary' }]); if (!t) return; }
    if (t === 'x') { t = await choose('🔁 Обмін', 'Звідки куди переходять гроші?', [{ label: '💳 Картка → 💵 готівка', val: 'k2c' }, { label: '💵 Готівка → 💳 картка', val: 'c2k' }]); if (!t) return; }
    const v = await modal({ title: MOVE[t], text: t === 'k2c' ? 'Зняли з картки й поклали в касу' : t === 'c2k' ? 'Взяли з каси й поклали на картку' : t === 'in' ? 'Поклали гроші в касу' : t === 'kin' ? 'Зарахували гроші на рахунок/картку ФОП' : t === 'kout' ? 'Зняли з рахунку ФОП: собі, податки, закупка' : 'Забрали гроші з каси',
      body: '<div class="form"><input id="mSum" inputmode="decimal" placeholder="Сума, ₴"><input id="mNote" placeholder="Коментар (необовʼязково)"></div>', buttons: [{ label: 'Записати', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const sum = v && +$('#mSum').value.replace(',', '.'), note = v && $('#mNote').value; closeModal();
    if (v && sum > 0) { await act('cashMove', { type: t, sum, note }, '🔁 Записано'); loadView(); }
  }
  async function shOpen() {
    const last = (await api('shift').catch(() => null))?.last; last0 = last ? String(last.sum) : 0;
    const fmt = d => d.split('-').reverse().join('.');
    const how = !last ? '' : `уся готівка від гостей за весь час${last.from ? ' (з ' + fmt(last.from) + ')' : ''}`;
    const b = await modal({ title: '🔓 Відкрити касу', text: 'Одне натискання — продовжити з тією ж готівкою, що в касі', keep: true,
      body: `<div class="form">${last ? `<button type="button" class="btn primary big1" data-mi-quick>🔓 Відкрити · ${money(last.sum)}</button><div class="muted" style="font-size:13px;text-align:center">${how}</div>` : ''}
        <input id="fIn" inputmode="decimal" placeholder="Або впишіть іншу суму, ₴"></div>`,
      buttons: [{ label: 'Відкрити з вписаною сумою', val: 'ok' }, { label: 'Скасувати', val: null }] });
    const v = b ? $('#fIn').value.trim() : null; closeModal(); if (!v) return;
    if (await act('shiftOpen', { float: +v.replace(',', '.') }, '🔓 Касу відкрито')) { loadState().catch(() => {}); if (S.view === 'cash') loadView(); }
  }
  // 🧾 Z-звіт: повний підсумок дня у вікні → 🖨 надрукувати (X, день не закривається) або 🔒 закрити день (Z)
  async function zDay() {
    const r = await api('shift').catch(() => null), z = r?.z; if (!z) return toast('Не вдалося завантажити');
    const kv = (l, v, st = '') => `<div class="kv"${st}><span>${l}</span><b class="money">${v}</b></div>`, sg = n => (n > 0 ? '+' : '') + money(n);
    const B = r.bal, tb = Object.entries(z.tipBy || {});
    const body = `<div class="card" style="margin:0 0 10px">${kv('🧾 Чеків', z.checks)}${kv('💵 Готівка', money(z.cash))}${kv('💳 Картка', money(z.card))}${z.disc ? kv('🏷 Знижки', money(z.disc)) : ''}
        ${kv('<b>📈 Виручка</b> <small class="muted">без чайових</small>', money(z.total), ' style="font-size:17px"')}</div>
      ${z.tip ? `<div class="card" style="margin:0 0 10px">${kv('💝 Чайові (персоналу)', money(z.tip))}${tb.map(([n, v]) => kv('👤 ' + esc(n), money(v))).join('')}</div>` : ''}
      <div class="card" style="margin:0 0 10px">${kv('💸 Витрати' + (z.exCard ? ` <small class="muted">з картки ${money(z.exCard)}</small>` : ''), money(z.exCash + z.exCard))}${z.mvCash ? kv('🔁 Рух готівки', sg(z.mvCash)) : ''}${z.mvCard ? kv('🔁 Рух картки', sg(z.mvCard)) : ''}${z.salOut ? kv('👷 Зарплата', money(z.salOut)) : ''}
        ${kv('<b>💰 Чистими</b>', money(z.net))}${B ? kv('💵 Готівка в касі зараз', money(B.cash)) + kv('💳 На картці зараз', money(B.card)) : ''}</div>
      ${z.openTables ? `<div class="muted" style="color:var(--red)">⚠️ Ще відкрито столів: ${z.openTables} на ${money(z.openSum)}</div>` : ''}`;
    const v = await modal({ title: `🧾 Z-звіт · ${z.day.split('-').reverse().join('.')}`, body, buttons: [{ label: '🖨 Надрукувати', val: 'x', cls: 'primary' }, { label: '🔒 Закрити день', val: 'z', cls: 'green' }, { label: 'Закрити вікно', val: null }] });
    if (v === 'x') await act('zX', {}, '🖨 X-звіт надруковано (день не закрито)');
    if (v === 'z') {
      const p = await choose('🔒 Закрити день?', `Z-звіт ${money(z.total)} запишеться в історію й піде в Telegram`, [{ label: '🖨 Закрити й надрукувати', val: 'p', cls: 'primary' }, { label: '📲 Закрити без друку', val: 'n' }]);
      if (p && await act('zDay', { print: p === 'p' }, '🔒 День закрито · Z-звіт збережено')) loadView();
    }
  }
  // ✏️ закритий чек: позиції, знижка, чайові, оплата, офіціант, стіл (лише адмін) → closedEdit
  async function cEdit(ref, day) {
    const [cl, st] = await Promise.all([api('closed', { day }).catch(() => null), api('staff').catch(() => null)]); if (!S.menu) await loadMenu().catch(() => {});
    const l = cl?.list || [], x = l.find(e => e.id === ref) || (/^\d+$/.test(ref) ? l[+ref] : null); if (!x) return toast('Чек не знайдено');
    if (x.del || x.rm) return toast('Чек знято з виручки — спершу поверніть');
    const E = { items: (x.dishes || []).map(d => [...d]), disc: x.disc || 0, tip: x.tip || 0, pay: x.card && (x.cash ?? 0) ? 'mix' : x.card ? 'card' : 'cash', cash: x.cash ?? x.sum, w: x.w || x.by || '', t: x.t };
    const opts = itemsAll().flatMap(it => it.variants ? it.variants.map(v => [`${it.name.uk} ${v.v} ${it.size || 'л'}`.trimEnd(), v.p]) : [[it.name.uk, it.price]]);
    const names = [...new Set((st?.staff || []).filter(s => s.role !== 'courier').map(s => s.name))];
    const calc = () => { const g = E.items.reduce((a, d) => a + d[2], 0), oG = (x.dishes || []).reduce((a, d) => a + d[2], 0) || (x.gross ?? x.sum - (x.tip || 0) + (x.discSum || 0)), other = Math.max(0, oG - (x.discSum || 0) - (x.sum - (x.tip || 0)));
      const ds = !E.disc ? 0 : E.disc === (x.disc || 0) && g === oG && x.discSum != null ? x.discSum : Math.round(g * E.disc / 100); return { g, ds, other, sum: Math.max(0, g - ds - other) + E.tip }; };
    const draw = () => { const c = calc(), m = $('#ceBody'); if (!m) return;
      m.innerHTML = `<div class="card" style="margin:0 0 10px">${E.items.map(([n, q, s], i) => `<div class="kv"><span>${esc(n)}</span><span class="kv-r" style="flex-wrap:nowrap;gap:4px"><button class="btn sm" data-ce="m" data-i="${i}">−</button><b>${q}</b><button class="btn sm" data-ce="p" data-i="${i}">+</button><b class="money" style="min-width:64px;text-align:right">${money(s)}</b><button class="xb" data-ce="x" data-i="${i}">✕</button></span></div>`).join('') || '<div class="muted">Порожньо</div>'}
        <div class="frow" style="margin-top:8px"><select id="ceAdd" style="flex:1;min-width:0"><option value="">➕ Додати страву з меню…</option>${opts.map(([n, p], i) => `<option value="${i}">${esc(n)} — ${p}</option>`).join('')}</select></div></div>
        <div class="form"><label>🏷 Знижка, %<input id="ceDisc" inputmode="numeric" value="${E.disc}"></label><label>💝 Чайові, ₴<input id="ceTip" inputmode="decimal" value="${E.tip}"></label>
        <label>💳 Оплата<select id="cePay">${[['cash', '💵 Готівка'], ['card', '💳 Картка'], ['mix', '💵+💳 Змішано']].map(([k, n]) => `<option value="${k}" ${E.pay === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        ${E.pay === 'mix' ? `<label>💵 З них готівкою, ₴<input id="ceCash" inputmode="decimal" value="${E.cash}"></label>` : ''}
        <label>👤 Офіціант<select id="ceW">${[...new Set([E.w, ...names])].filter(Boolean).map(n => `<option ${n === E.w ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label><label>🪑 Стіл<input id="ceT" inputmode="numeric" value="${E.t}"></label></div>
        <div class="kv" style="font-size:18px;margin-top:8px"><span><b>Разом</b> <small class="muted">${c.ds ? `знижка −${money(c.ds)}` : ''}${c.other ? ` · бонуси −${money(c.other)}` : ''}${E.tip ? ` · 💝 ${money(E.tip)}` : ''}</small></span><b class="money">${money(c.sum)}</b></div>
        <div class="muted" style="font-size:12px">Було ${money(x.sum)}. Виручка дня, готівка/картка, топ страв, чайові й склад виправляться на різницю.</div>
        ${(x.edits || []).length ? `<div class="muted" style="font-size:12px;margin-top:6px">✏️ ${x.edits.map(e => `${e.at} ${esc(e.by)}: ${esc(e.what)}`).join('<br>✏️ ')}</div>` : ''}`; };
    const num = id => +String($(id)?.value || 0).replace(',', '.') || 0;
    const read = () => { if (!$('#ceDisc')) return; E.disc = Math.max(0, Math.min(100, Math.round(num('#ceDisc')))); E.tip = Math.max(0, Math.round(num('#ceTip'))); E.pay = $('#cePay').value; if ($('#ceCash')) E.cash = Math.round(num('#ceCash')); E.w = $('#ceW').value; E.t = Math.round(num('#ceT')) || x.t; };
    const p = modal({ title: `✏️ Чек · стіл ${tn(x.t)} · ${x.at}`, body: '<div id="ceBody"></div>', buttons: [{ label: '💾 Зберегти', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }] });
    draw(); const box = $('#modal');
    box.addEventListener('click', e => { const b = e.target.closest('[data-ce]'); if (!b) return; read(); const i = +b.dataset.i, d = E.items[i], u = d[1] ? d[2] / d[1] : 0;
      if (b.dataset.ce === 'p') { d[1]++; d[2] = Math.round(u * d[1]); } else if (b.dataset.ce === 'm' && d[1] > 1) { d[1]--; d[2] = Math.round(u * d[1]); } else E.items.splice(i, 1); draw(); });
    box.addEventListener('change', e => { read(); if (e.target.id === 'ceAdd' && e.target.value !== '') { const [n, pr] = opts[+e.target.value], d = E.items.find(z => z[0] === n); if (d) { d[2] += Math.round(d[2] / d[1]); d[1]++; } else E.items.push([n, 1, pr]); } draw(); });
    box.addEventListener('input', e => { if (['ceDisc', 'ceTip', 'ceCash'].includes(e.target.id)) { read(); const c = calc(), t = box.querySelector('.kv[style*="18px"] b.money'); if (t) t.textContent = money(c.sum); } });
    if (!(await p)) return;
    if (!E.items.length) return toast('Чек без позицій — краще «🗑 З виручки»');
    const r = await act('closedEdit', { ref: x.id || ref, day: cl.day, p: { items: E.items, disc: E.disc, tip: E.tip, pay: E.pay, cash: E.cash, w: E.w, t: E.t } });
    if (r) { toast(r.what?.length ? '✏️ Чек збережено' : 'Без змін'); S.data.range = null; loadView(); }
  }
