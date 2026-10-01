// VARVAR POS — касова програма. Ті самі дані й дії, що в Telegram-боті (сервер: worker/src/pos.js → ops.js).
// ⚠️ Після змін: npx esbuild js/pos.js --target=safari11,chrome61 --outfile=js/pos.build.js (pos.html підключає build — для старих планшетів).
// Живе оновлення: WebSocket /api/pos/live — будь-яка зміна (з бота, сайту чи іншого планшета) з'являється одразу.
(() => {
  const API = new URLSearchParams(location.search).get('api') || (/workers\.dev$/.test(location.hostname) ? location.origin : 'https://varvar-menu.varvar.workers.dev');
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => `${Math.round(n || 0).toLocaleString('uk-UA')} ₴`;
  const store = { get(k, d) { try { const v = localStorage.getItem('pos_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pos_' + k, JSON.stringify(v)); } catch {} } };
  const hhmm = t => new Date(t).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  const S = {
    token: store.get('token', ''), me: store.get('me', null), view: 'hall', n: 15, tables: {}, events: [], printer: {}, menu: null,
    open: 0, carts: store.get('carts', {}), coms: {}, cat: 0, q: '', mobileMenu: false, data: {}, seen: new Set(), ready: false, live: false,
  };
  const isAdmin = () => S.me?.role === 'admin';

  // ---------- API ----------
  async function api(op, data = {}) {
    const r = await withTimeout(fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op, ...data }) }), 12000);
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && op !== 'login') { logout(true); throw new Error('auth'); }
    if (!r.ok) { const e = new Error(j.error || 'error'); e.data = j; throw e; }
    return j;
  }
  const act = async (op, data, okMsg) => { try { const r = await api(op, data); if (okMsg) toast(okMsg); return r; } catch (e) { if (e.message !== 'auth') toast('⚠️ ' + errText(e.message)); return null; } };
  const errText = e => ({ admin: 'Лише для адміністратора', empty: 'Нічого не вибрано', table: 'Невірний стіл', nothing: 'Нема що відміняти' })[e] || e;

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Сервер не відповідає (перевірте інтернет / дату й час на компʼютері)')), ms))]);

  // ---------- вхід ----------
  let pin = '';
  function showLogin(msg = '') {
    $('#app').hidden = true; $('#login').hidden = false; $('#lErr').textContent = msg; pin = ''; dots();
    $('#keypad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('') + '<button class="fn" data-k="c">Стерти</button><button data-k="0">0</button><button class="fn" data-k="b">⌫</button>';
  }
  const dots = () => { const d = $('#dots'); const len = Math.max(4, pin.length); d.innerHTML = Array.from({ length: len }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join(''); };
  async function tryLogin(body) {
    $('#lErr').style.color = 'var(--muted)'; $('#lErr').textContent = 'Перевіряю…';
    try {
      const r = await api('login', body);
      S.token = r.token; S.me = r.me; store.set('token', r.token); store.set('me', r.me);
      start();
    } catch (e) {
      $('#lErr').style.color = ''; $('#lErr').textContent = e.message === 'error' ? 'Помилка зʼєднання' : /fetch|network/i.test(e.message) ? 'Немає звʼязку з сервером: ' + e.message : e.message;
      pin = ''; dots(); $('#dots').classList.add('shake'); setTimeout(() => $('#dots').classList.remove('shake'), 400);
    }
  }
  // PIN з клавіатури комп'ютера: цифри, Backspace, Enter
  document.addEventListener('keydown', e => {
    if ($('#login').hidden || $('#pinView').hidden) return;
    if (/^\d$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') pinKey('b'); else if (e.key === 'Escape') pinKey('c');
    else if (e.key === 'Enter' && pin.length >= 4) { clearTimeout(tryLogin.t); tryLogin({ pin }); }
  });
  $('#keypad').addEventListener('click', e => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) pinKey(k); });
  function pinKey(k) {
    if (k === 'c') pin = ''; else if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 6) pin += k;
    dots();
    if (pin.length >= 4) { clearTimeout(tryLogin.t); tryLogin.t = setTimeout(() => tryLogin({ pin }), pin.length === 6 ? 0 : 700); }
  }
  $('#toPass').onclick = () => { $('#pinView').hidden = true; $('#passView').hidden = false; $('#loginSub').textContent = 'Вхід паролем'; $('#lName').focus(); };
  $('#toPin').onclick = () => { $('#pinView').hidden = false; $('#passView').hidden = true; $('#loginSub').textContent = 'Введіть свій PIN'; };
  $('#passView').onsubmit = e => { e.preventDefault(); tryLogin({ pass: $('#lPass').value, name: $('#lName').value }); };
  async function logout(expired) {
    if (!expired) await api('logout').catch(() => {});
    S.token = ''; S.me = null; store.set('token', ''); store.set('me', null); ws?.close(); closeSheet();
    showLogin(expired ? 'Сесія закінчилась — увійдіть знову' : '');
  }

  // ---------- дані і живе оновлення ----------
  async function loadState() {
    const r = await api('state');
    S.me = { ...S.me, ...r.me }; S.n = r.n; S.printer = r.printer;
    S.tables = Object.fromEntries(r.tables.map(b => [b.t, b]));
    const fresh = r.events.filter(e => !S.seen.has(e.id));
    if (S.ready && fresh.some(e => e.k === 'guest' || e.k === 'check')) ding();
    r.events.forEach(e => S.seen.add(e.id));
    S.events = r.events; S.ready = true;
    render();
  }
  async function loadMenu() { S.menu = (await api('menu')).menu; if (S.open) renderSheet(); if (['stop', 'menu'].includes(S.view)) renderMain(); }
  let ws, wsTimer, pingT, reloadT;
  function connect() {
    try { ws?.close(); } catch {}
    ws = new WebSocket(API.replace(/^http/, 'ws') + '/api/pos/live?token=' + S.token);
    ws.onopen = () => { S.live = true; liveDot(); clearInterval(pingT); pingT = setInterval(() => ws.readyState === 1 && ws.send('ping'), 25000); loadState().catch(() => {}); };
    ws.onmessage = e => {
      if (e.data === 'pong') return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type !== 'changed') return;
      clearTimeout(reloadT);
      reloadT = setTimeout(() => {
        loadState().catch(() => {});
        if (m.keys.includes('menu')) loadMenu().catch(() => {});
        if (['closed', 'reports', 'settings'].includes(S.view) && m.keys.some(k => ['closed', 'day', 'exp', 'staff'].includes(k))) loadView();
      }, 120);
    };
    ws.onclose = () => { S.live = false; liveDot(); clearInterval(pingT); clearTimeout(wsTimer); if (S.token) wsTimer = setTimeout(connect, 2000); };
  }
  const liveDot = () => { $('#live').className = 'live' + (S.live ? ' on' : ''); };
  setInterval(() => { if (S.token && !S.live && document.visibilityState === 'visible') loadState().catch(() => {}); }, 15000); // запасний варіант без WebSocket
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token) { loadState().catch(() => {}); if (!S.live) connect(); } });

  let actx;
  function ding() { // короткий сигнал про нове замовлення гостя
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      [0, .16].forEach((d, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = i ? 1320 : 880; g.gain.setValueAtTime(.0001, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(.25, actx.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d + .25); o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + .3); });
    } catch {}
  }

  // ---------- каркас ----------
  const NAV = [['hall', '🪑', 'Зал'], ['closed', '📜', 'Закриті'], ['stop', '⛔', 'Стоп-лист'], ['printer', '🖨', 'Принтер'], ['reports', '📊', 'Звіти', 1], ['menu', '📖', 'Меню', 1], ['settings', '⚙️', 'Налашт.', 1]];
  function renderNav() {
    const newCnt = S.events.filter(e => e.k === 'guest' && e.s !== 'acc').length;
    $('#nav').innerHTML = `<div class="brand"><img src="printer/logo.png" alt="VARVAR"></div>` +
      NAV.filter(n => !n[3] || isAdmin()).map(([v, ic, l]) => `<button class="${S.view === v ? 'on' : ''}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}</button>`).join('') +
      `<button class="feed-btn" data-a="feed"><span class="ic">🔔</span>Стрічка${newCnt ? `<span class="badge">${newCnt}</span>` : ''}</button>` +
      `<div class="grow"></div><div class="me">${esc(S.me?.name)}<br>${isAdmin() ? 'адмін' : 'офіціант'}</div>` +
      `<button data-a="switch"><span class="ic">🔒</span>Вийти</button>`;
  }
  function render() { renderNav(); renderFeed(); if (['hall', 'printer'].includes(S.view)) renderMain(); if (S.open) renderSheet(); }

  // ---------- зал ----------
  function hallHTML() {
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter(e => e.k === 'guest' && e.s !== 'acc').map(e => e.t));
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map(t => {
      const b = S.tables[t];
      if (!b) return `<button class="tbl" data-a="table" data-t="${t}"><div class="n">${t}</div><div class="st">вільний</div></button>`;
      const cls = ['busy', b.check ? 'check' : '', pending.has(t) ? 'new' : ''].join(' ');
      const tag = b.check ? `<span class="tag c">🧾 чек${b.pay ? (b.pay === 'card' ? ' 💳' : ' 💵') : ''}</span>` : pending.has(t) ? '<span class="tag g">нове</span>' : '';
      return `<button class="tbl ${cls}" data-a="table" data-t="${t}">${tag}<div class="n">${t}</div><div class="st">${b.orders} замовл.${b.disc ? ` · −${b.disc}%` : ''}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">з ${b.opened ? hhmm(b.opened) : '—'}</div></button>`;
    }).join('');
    return `<div class="head"><h1>Зал</h1><div class="stat">Відкрито<b>${list.length}</b></div><div class="stat">У залі<b class="money">${money(sum)}</b></div>
      <button class="btn primary" data-a="newOrder">➕ Замовлення</button></div><div class="tables">${tiles}</div>`;
  }

  // ---------- стрічка ----------
  const evTitle = e => ({
    guest: `🛎 Стіл ${e.t} — ${esc((e.kind || 'замовлення').toLowerCase())}`, check: `🧾 Стіл ${e.t} просить чек${e.pay ? (e.pay === 'card' ? ' · 💳 карта' : ' · 💵 готівка') : ''}`,
    waiter: `🧑‍🍳 Стіл ${e.t} — ${esc(e.by)}${e.src === 'каса' ? ' (каса)' : ''}`, close: `✅ Стіл ${e.t} закрито — ${money(e.sum)} ${e.pay === 'card' ? '💳' : '💵'}${e.print === false ? ' · без чека' : ''}`,
    del: `🗑 Стіл ${e.t} видалено (${money(e.sum)})`, move: `↔️ ${esc(e.text)}`, disc: `% Стіл ${e.t}: ${esc(e.text)}`, rm: `✏️ Стіл ${e.t}: ${esc(e.text)}`, pre: `🖨 Пречек стіл ${e.t}`,
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    $('#events').innerHTML = S.events.length ? [...S.events].reverse().map(e => {
      const lines = e.lines?.length ? `<div class="lines">${e.lines.map(esc).join('\n')}</div>` : '';
      const by = e.by && !['waiter'].includes(e.k) ? ` · ${esc(e.by)}` : '';
      const btns = e.k === 'guest' || e.k === 'check'
        ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || 'прийнято')}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button>`}<button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${e.t}</button></div>` : '';
      return `<div class="ev ${e.k}${e.s === 'acc' ? ' acc' : ''}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}${e.sum && ['guest', 'waiter'].includes(e.k) ? `<div class="muted">Сума ${money(e.sum)}</div>` : ''}${btns}</div>`;
    }).join('') : '<div class="muted" style="padding:12px">Сьогодні подій ще немає</div>';
  }

  // ---------- стіл (лист) ----------
  const cartOf = t => (S.carts[t] ||= {});
  const saveCarts = () => store.set('carts', S.carts);
  const itemsAll = () => S.menu ? S.menu.categories.flatMap(c => c.items) : [];
  function openTable(t) { S.open = +t; S.mobileMenu = !S.tables[t]; S.q = ''; if (!S.menu) loadMenu(); renderSheet(); }
  function closeSheet() { S.open = 0; $('#layer').innerHTML = ''; }
  function renderSheet() {
    const t = S.open; if (!t) return;
    const b = S.tables[t], cart = cartOf(t), cartRows = Object.entries(cart);
    const cartSum = cartRows.reduce((s, [, x]) => s + x.price * x.q, 0);
    const billRows = b ? b.items.map(it => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} × ${Math.round(it.sum / it.q)} ₴</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="Прибрати 1">−</button></div>`).join('') : '<div class="muted" style="padding:8px 4px">Рахунок порожній — оберіть страви в меню</div>';
    const discRow = b?.disc ? `<div class="row"><div class="nm">Знижка ${b.disc}%</div><b class="money" style="color:var(--green)">−${b.total - b.pay2}</b><button class="rb minus" data-a="discSet" data-p="0">×</button></div>` : '';
    const comments = b ? b.log.filter(o => o.comment).map(o => `<div class="muted" style="padding:2px 6px">💬 ${esc(o.comment)}</div>`).join('') : '';
    const cartHTML = cartRows.length ? `<div class="cart"><h3>Нове замовлення</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} ₴</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">−</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join('')}</div>
      <input id="cartCom" placeholder="💬 Коментар для кухні (необовʼязково)" value="${esc(S.coms[t] || '')}" style="margin:6px 0 10px">
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">✕</button><button class="btn primary" data-a="send">Відправити на кухню · ${money(cartSum)}</button></div></div>` : '';
    const actions = b ? `<div class="actions"><button class="btn" data-a="pre">🖨 Пречек</button><button class="btn" data-a="disc">% Знижка</button>
      <button class="btn" data-a="move">↔️ Перенести</button>${isAdmin() ? '<button class="btn red" data-a="delTable">🗑 Видалити</button>' : '<button class="btn" data-a="mobileMenu">➕ Додати</button>'}
      <button class="btn green wide" data-a="closeT">💰 Закрити рахунок · ${money(b.pay2)}</button></div>` : '';
    // меню
    let menuHTML = '<div class="muted" style="padding:20px">Завантаження меню…</div>';
    if (S.menu) {
      const cats = S.menu.categories;
      const q = S.q.trim().toLowerCase();
      const items = q ? itemsAll().filter(i => i.name.uk.toLowerCase().includes(q) || (i.name.en || '').toLowerCase().includes(q)) : (cats[S.cat]?.items || []);
      const inCart = id => cartRows.filter(([k]) => k.split('|')[0] === id).reduce((s, [, x]) => s + x.q, 0);
      menuHTML = `<div class="cats">${cats.map((c, i) => `<button class="chip ${!q && i === S.cat ? 'on' : ''}" data-a="cat" data-i="${i}">${esc(c.name.uk)}</button>`).join('')}</div>
        <input class="search" id="search" placeholder="🔎 Пошук страви" value="${esc(S.q)}">
        <div class="items">${items.map(it => { const n = inCart(it.id); return `<button class="item ${it.hidden ? 'off' : ''}" data-a="add" data-id="${it.id}">${n ? `<span class="cnt">${n}</span>` : ''}${it.img ? `<img loading="lazy" src="${esc(it.img)}" alt="">` : ''}<span class="nm">${esc(it.name.uk)}</span>${it.size && !it.variants ? `<span class="muted" style="font-size:12px">${esc(it.size)}</span>` : ''}<span class="pr">${it.hidden ? '⛔ немає' : it.variants ? it.variants.map(v => v.p).join(' / ') + ' ₴' : it.price + ' ₴'}</span></button>`; }).join('') || '<div class="muted">Нічого не знайдено</div>'}</div>`;
    }
    const keepScroll = $('.items')?.scrollTop, keepBill = $('.bill .scroll')?.scrollTop, focusSearch = document.activeElement?.id === 'search', focusCom = document.activeElement?.id === 'cartCom';
    $('#layer').innerHTML = `<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet">
      <div class="sheet-head"><h2>Стіл ${t}</h2>${b ? `<span class="total money">${money(b.pay2)}</span>${b.disc ? `<span class="chip">−${b.disc}%</span>` : ''}<span class="muted">з ${b.opened ? hhmm(b.opened) : '—'} · ${b.orders} замовл.</span>${b.check ? '<span class="chip" style="background:var(--orange);color:#000">🧾 просять чек</span>' : ''}` : '<span class="muted">новий рахунок</span>'}
        <span class="sp"></span><div class="tabs2"><button class="${S.mobileMenu ? '' : 'on'}" data-a="tab" data-m="0">Рахунок${cartRows.length ? ` (${cartRows.length})` : ''}</button><button class="${S.mobileMenu ? 'on' : ''}" data-a="tab" data-m="1">Меню</button></div>
        <button class="close-x" data-a="closeSheet">✕</button></div>
      <div class="sheet-body ${S.mobileMenu ? 'show-menu' : ''}">
        <div class="bill"><div class="scroll"><h3>Рахунок</h3>${billRows}${discRow}${comments}</div>${cartHTML}${actions}</div>
        <div class="menu-pane">${menuHTML}</div></div></div>`;
    if (keepScroll) $('.items') && ($('.items').scrollTop = keepScroll);
    if (keepBill) $('.bill .scroll').scrollTop = keepBill;
    if (focusSearch) { const s = $('#search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    if (focusCom) { const s = $('#cartCom'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }
  async function addItem(id) {
    const it = itemsAll().find(i => i.id === id); if (!it) return;
    if (it.hidden) return toast('⛔ ' + it.name.uk + ' — у стоп-листі');
    let v = null;
    if (it.variants) {
      v = await choose(it.name.uk, 'Оберіть розмір', it.variants.map(x => ({ label: `${x.v} ${it.size || ''} · ${x.p} ₴`, val: x.v })));
      if (v == null) return;
    }
    const vv = it.variants?.find(x => x.v === v);
    const key = it.id + (v ? '|' + v : ''), cart = cartOf(S.open);
    cart[key] ||= { id: it.id, v, name: it.name.uk + (vv ? ` ${vv.v} ${it.size || ''}`.trimEnd() : ''), price: vv ? vv.p : it.price, q: 0 };
    cart[key].q++; saveCarts(); renderSheet();
  }
  async function sendCart() {
    const t = S.open, cart = cartOf(t), items = Object.values(cart).map(x => ({ id: x.id, v: x.v, q: x.q }));
    if (!items.length) return;
    const btn = document.querySelector('[data-a="send"]'); if (btn) btn.disabled = true;
    const r = await act('order', { t, items, comment: S.coms[t] || '' });
    if (r) { S.carts[t] = {}; S.coms[t] = ''; saveCarts(); S.mobileMenu = false; toast(`🖨 Стіл ${t}: відправлено на кухню`); await loadState().catch(() => {}); }
    else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const v = await choose(`Закрити стіл ${t}`, `До сплати ${money(b.pay2)}${b.pay ? ` · гість хоче ${b.pay === 'card' ? '💳 карткою' : '💵 готівкою'}` : ''}`, [
      { label: '💵 Готівка + 🖨 чек', val: 'cash:1', cls: 'green' }, { label: '💳 Карта + 🖨 чек', val: 'card:1', cls: 'blue' },
      { label: '💵 Готівка, без чека', val: 'cash:0' }, { label: '💳 Карта, без чека', val: 'card:0' }]);
    if (!v) return;
    const [pay, pr] = v.split(':');
    const r = await act('close', { t, pay, print: pr === '1' });
    if (r?.r) { toast(`✅ Стіл ${t} закрито · ${money(r.r.sum)}`); closeSheet(); loadState().catch(() => {}); }
  }
  async function discFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const v = await choose(`Знижка — стіл ${t}`, `Сума ${money(b.total)}${b.disc ? ` · зараз ${b.disc}%` : ''}`, [...[5, 10, 15, 20, 25, 30, 50].map(p => ({ label: `${p}%  →  ${money(b.total - Math.round(b.total * p / 100))}`, val: String(p) })), { label: '✏️ Свій відсоток', val: 'own' }, { label: 'Без знижки', val: '0', cls: 'red' }]);
    if (v == null) return;
    let p = v;
    if (v === 'own') { p = await ask('Свій відсоток знижки', 'Число від 0 до 100', 'number'); if (p == null) return; }
    await act('discount', { t, pct: +p }, +p ? `% Знижка ${p}%` : 'Знижку прибрано');
  }
  async function moveFlow() {
    const t = S.open;
    const to = await pickTable(`Перенести стіл ${t}`, 'На зайнятий стіл (жовтий) — рахунки обʼєднаються', t);
    if (!to) return;
    const r = await act('move', { t, to }, '');
    if (r?.r) { toast(r.r.merged ? `🔗 Обʼєднано зі столом ${to}` : `↔️ Перенесено на стіл ${to}`); S.carts[to] = { ...(S.carts[to] || {}), ...cartOf(t) }; S.carts[t] = {}; saveCarts(); S.open = to; await loadState().catch(() => {}); }
  }

  // ---------- інші екрани ----------
  async function loadView() {
    try {
      if (S.view === 'closed') S.data.closed = (await api('closed')).list;
      if (S.view === 'reports') S.data.rep = await api('reports');
      if (S.view === 'settings') { S.data.staff = await api('staff'); S.data.wifi = await api('wifi'); }
      if (['stop', 'menu'].includes(S.view) && !S.menu) await loadMenu();
    } catch {}
    renderMain();
  }
  function renderMain() {
    const v = S.view, m = $('#main');
    m.classList.toggle('hall', v === 'hall');
    if (v === 'hall') { const cols = Math.ceil(Math.sqrt(S.n * 1.6)); m.style.setProperty('--cols', cols); m.style.setProperty('--rows', Math.ceil(S.n / cols)); m.innerHTML = hallHTML(); }
    else if (v === 'closed') m.innerHTML = closedHTML();
    else if (v === 'stop') m.innerHTML = stopHTML();
    else if (v === 'printer') m.innerHTML = printerHTML();
    else if (v === 'reports') m.innerHTML = reportsHTML();
    else if (v === 'menu') m.innerHTML = menuHTML();
    else if (v === 'settings') m.innerHTML = settingsHTML();
  }
  const payL = x => x.card ? '💳 карта' : '💵 готівка';
  function closedHTML() {
    const l = S.data.closed; if (!l) return '<div class="head"><h1>Закриті сьогодні</h1></div><div class="muted">Завантаження…</div>';
    const gone = x => x.del || x.rm, ok = l.filter(x => !gone(x));
    return `<div class="head"><h1>Закриті сьогодні</h1><div class="stat">Рахунків<b>${ok.length}</b></div><div class="stat">Разом<b class="money">${money(ok.reduce((s, x) => s + x.sum, 0))}</b></div>
      <div class="stat">💵<b class="money">${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))}</b></div><div class="stat">💳<b class="money">${money(ok.reduce((s, x) => s + (x.card || 0), 0))}</b></div></div>
      <div class="cards">${[...l].reverse().map((x, i) => { const ref = x.id || (l.length - 1 - i); return `<div class="card" style="${gone(x) ? 'opacity:.45' : ''}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} · Стіл ${x.t} · <span class="money">${money(x.sum)}</span> ${gone(x) ? '🗑 видалено' : payL(x)}${x.disc ? ` · знижка ${x.disc}%` : ''}</h3><span class="muted">${esc(x.by || '')}</span>
        ${!gone(x) && x.dishes?.length ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">🖨 Чек</button>` : ''}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">🗑 З виручки</button>` : ''}</div>
        ${x.dishes?.length ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}× ${esc(n)} — ${s}`).join(' · ')}</div>` : ''}</div>`; }).join('') || '<div class="muted">Сьогодні закритих рахунків ще немає</div>'}</div>`;
  }
  function stopHTML() {
    if (!S.menu) return '<div class="head"><h1>Стоп-лист</h1></div><div class="muted">Завантаження…</div>';
    const q = S.q.trim().toLowerCase();
    return `<div class="head"><h1>Стоп-лист</h1><span class="muted">Вимкнене не показується гостям і не продається</span></div>
      <input id="stopSearch" placeholder="🔎 Пошук" value="${esc(S.q)}" style="max-width:420px;margin-bottom:14px">
      ${S.menu.categories.map(c => { const its = c.items.filter(i => !q || i.name.uk.toLowerCase().includes(q)); return its.length ? `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${its.map(i => `<div class="list-row"><div class="grow">${esc(i.name.uk)}</div><button class="switch ${i.hidden ? '' : 'on'}" data-a="stopT" data-id="${i.id}" data-h="${i.hidden ? 0 : 1}"></button></div>`).join('')}</div>` : ''; }).join('')}`;
  }
  function printerHTML() {
    const p = S.printer || {}, ok = p.seen && Date.now() - p.seen < 60e3;
    return `<div class="head"><h1>Принтер</h1></div><div class="cards"><div class="card"><div class="big">${ok ? '✅ на звʼязку' : p.seen ? '❌ немає звʼязку' : '❌ програма друку не запущена'}</div>
      <div class="muted">${p.seen ? 'Останній звʼязок: ' + hhmm(p.seen) : ''} · у черзі: ${p.q ?? 0}</div></div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="pTest">🖨 Тестовий друк</button><button class="btn" data-a="pQr">🔳 QR меню для столу</button></div></div>`;
  }
  function reportsHTML() {
    const r = S.data.rep; if (!r) return '<div class="head"><h1>Звіти і каса</h1></div><div class="muted">Завантаження…</div>';
    const c = r.cash;
    const row = ([label, d]) => `<div class="card"><h3>${esc(label)}</h3><div class="big money">${money(d.closed)}</div>
      <div class="kv"><span>💵 Готівка</span><b class="money">${money(d.cash)}</b></div><div class="kv"><span>💳 Карта</span><b class="money">${money(d.card)}</b></div>
      <div class="kv"><span>💸 Витрати</span><b class="money">${money(d.exp)}</b></div><div class="kv"><span>Чистими</span><b class="money">${money(d.closed - d.exp)}</b></div>
      <div class="kv"><span>Столів · сер. чек</span><b>${d.tables} · ${d.tables ? money(d.closed / d.tables) : '—'}</b></div>${d.disc ? `<div class="kv"><span>🏷 Знижки</span><b class="money">${money(d.disc)}</b></div>` : ''}</div>`;
    return `<div class="head"><h1>Звіти і каса</h1><div class="stat">Ще відкрито в залі<b class="money">${money(r.open)}</b></div></div>
      <div class="grid2" style="margin-bottom:14px"><div class="card"><h3>💰 Каса сьогодні</h3>
        <div class="kv"><span>Розмін на початок</span><b class="money">${money(c.float)}</b></div><div class="kv"><span>+ 💵 Готівка від гостей</span><b class="money">${money(c.cash)}</b></div>
        <div class="kv"><span>− 💸 Витрати готівкою</span><b class="money">${money(c.exCash)}</b></div><div class="kv"><span><b>Має бути в касі</b></span><b class="money big" style="font-size:22px">${money(c.inBox)}</b></div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sm" data-a="float">🏦 Розмін</button><button class="btn sm" data-a="expense">💸 Витрата</button></div></div>
        <div class="card"><h3>💸 Витрати сьогодні</h3>${c.exp.length ? c.exp.map((e, i) => `<div class="kv" style="${e.del ? 'opacity:.4;text-decoration:line-through' : ''}"><span>${e.at} ${e.src === 'card' ? '💳' : '💵'} ${esc(e.note || '')}</span><span><b class="money">${money(e.sum)}</b> ${e.del ? '' : `<button class="btn sm red" data-a="expDel" data-i="${i}">🗑</button>`}</span></div>`).join('') : '<div class="muted">Немає</div>'}</div></div>
      <div class="grid2">${r.rows.map(row).join('')}</div>
      <h2 style="margin:26px 0 10px">🏆 Топ страв за місяць</h2><div class="card">${r.top.map((x, i) => `<div class="kv"><span>${i + 1}. ${esc(x.n)}</span><b>${x.q} шт · <span class="money">${money(x.s)}</span></b></div>`).join('') || '<div class="muted">Ще немає продажів</div>'}</div>`;
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>Меню</h1></div><div class="muted">Завантаження…</div>';
    return `<div class="head"><h1>Меню</h1><button class="btn" data-a="menuUndo">↩️ Відмінити останню зміну</button><button class="btn primary" data-a="menuEdit" data-id="">➕ Нова страва</button></div>
      ${S.menu.categories.map(c => `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${c.items.map(i => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? ' ⛔' : ''}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map(v => `${v.v} — ${v.p}`).join(' / ') : i.price + ' ₴'}${i.size && !i.variants ? ' · ' + esc(i.size) : ''}</div></div>›</button>`).join('')}</div>`).join('')}`;
  }
  function settingsHTML() {
    const st = S.data.staff, wf = S.data.wifi;
    return `<div class="head"><h1>Налаштування</h1></div><div class="grid2">
      <div class="card"><h3>👥 Персонал (PIN для каси)</h3>${st ? st.staff.map(s => `<div class="kv"><span>${esc(s.name)} · ${s.role === 'admin' ? '🔐 адмін' : '🧑‍🍳 офіціант'}</span><button class="btn sm red" data-a="staffDel" data-id="${s.id}">🗑</button></div>`).join('') || '<div class="muted">Ще немає</div>' : '…'}
        <button class="btn sm primary" style="margin-top:10px" data-a="staffAdd">➕ Додати працівника</button></div>
      <div class="card"><h3>🤖 Увійшли в Telegram-бот</h3>${st ? st.waiters.map(w => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">Вийти</button></div>`).join('') || '<div class="muted">Нікого</div>' : '…'}</div>
      <div class="card"><h3>🔑 Паролі</h3><div class="muted" style="margin-bottom:10px">Пароль офіціанта — вхід у бот і касу; пароль адміна — адмін-функції.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="wPass">Пароль офіціанта</button><button class="btn sm" data-a="aPass">Пароль адміна</button></div></div>
      <div class="card"><h3>📶 Wi‑Fi закладу</h3><div class="muted">Звідси гості можуть замовляти. Ваша мережа зараз: ${esc(wf?.current || '…')}</div>
        ${wf ? wf.list.map(x => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString('uk-UA')}</span></div>`).join('') || '<div class="muted">немає — замовлення не прийматимуться!</div>' : ''}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm primary" data-a="wifiAdd">➕ Це наша мережа</button><button class="btn sm red" data-a="wifiClear">Скинути всі</button></div></div>
      <div class="card"><h3>🧪 Тест</h3><div class="muted" style="margin-bottom:10px">Тимчасово, до запуску.</div><button class="btn sm red" data-a="reset">♻️ Обнулити все</button></div></div>`;
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
    const v = await modal({ title: it ? 'Редагувати страву' : 'Нова страва', body, buttons: [{ label: '💾 Зберегти', val: 'save', cls: 'primary' }, ...(it ? [{ label: '🗑 Видалити страву', val: 'del', cls: 'red' }] : []), { label: 'Скасувати', val: null }], keep: true });
    if (v === 'del') { if (await confirmBox(`Видалити «${it.name.uk}» з меню?`)) await act('menuDel', { id: it.id }, '🗑 Видалено'); return; }
    if (v !== 'save') return;
    const variants = $('#fVar').value.split(',').map(s => s.trim()).filter(Boolean).map(s => { const [vv, p] = s.split(/[=:]/).map(x => x.trim()); return { v: vv.replace(',', '.'), p: +p }; }).filter(x => x.v && x.p);
    const item = { id: it?.id, cat: $('#fCat').value, name: $('#fName').value, nameEn: $('#fEn').value, price: +$('#fPrice').value, variants, size: $('#fSize').value, desc: $('#fDesc').value };
    const file = $('#fPhoto')?.files?.[0];
    closeModal();
    const r = await act('menuSave', { item }, '💾 Збережено');
    if (r && file) { const data = await shrink(file); await act('menuPhoto', { id: r.id, data }, '📷 Фото оновлено'); }
    loadMenu().catch(() => {});
  }
  function shrink(file) { // фото → JPEG до 1200 px
    return new Promise(res => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1200 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .85)); }; img.src = URL.createObjectURL(file); });
  }

  // ---------- модальні вікна ----------
  let modalResolve;
  function modal({ title, text = '', body = '', buttons, keep }) {
    return new Promise(res => {
      modalResolve = v => { if (!keep || v == null) closeModal(); res(v); };
      const el = document.createElement('div'); el.className = 'modal-bg'; el.id = 'modal';
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${body}<div class="btns" style="margin-top:14px">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mi="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
      el.addEventListener('click', e => { if (e.target === el) return modalResolve(null); const i = e.target.closest('[data-mi]')?.dataset.mi; if (i != null) modalResolve(buttons[+i].val); });
      document.body.append(el);
    });
  }
  const closeModal = () => $('#modal')?.remove();
  const choose = (title, text, opts) => modal({ title, text, buttons: [...opts, { label: 'Скасувати', val: null }] });
  const confirmBox = (title, text = '') => modal({ title, text, buttons: [{ label: 'Так', val: true, cls: 'red' }, { label: 'Ні', val: null }] });
  async function ask(title, ph = '', type = 'text') {
    const v = await modal({ title, body: `<input id="askIn" type="${type}" placeholder="${esc(ph)}" ${type === 'number' ? 'inputmode="decimal"' : ''}>`, buttons: [{ label: 'OK', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const x = v === 'ok' ? $('#askIn').value.trim() : null; closeModal(); return x || null;
  }
  function pickTable(title, text, skip) {
    return new Promise(res => {
      modalResolve = v => { closeModal(); res(v); };
      const el = document.createElement('div'); el.className = 'modal-bg'; el.id = 'modal';
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="grid">${Array.from({ length: S.n }, (_, i) => i + 1).filter(n => n !== skip).map(n => `<button class="${S.tables[n] ? 'busy' : ''}" data-t="${n}">${n}</button>`).join('')}</div><div class="btns"><button class="btn" data-x>Скасувати</button></div></div>`;
      el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-x]')) return modalResolve(null); const t = e.target.closest('[data-t]')?.dataset.t; if (t) modalResolve(+t); });
      document.body.append(el);
      setTimeout(() => el.querySelector('input')?.focus(), 50);
    });
  }
  setTimeout(() => {}, 0);
  let toastT;
  function toast(msg) { $('.toast')?.remove(); const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.append(d); clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 2600); }

  // ---------- кліки ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const a = el.dataset.a, t = S.open;
    switch (a) {
      case 'view': S.view = el.dataset.v; S.q = ''; renderNav(); renderMain(); loadView(); $('#feed').classList.remove('open'); $('#main').scrollTop = 0; break;
      case 'feed': $('#feed').classList.toggle('open'); break;
      case 'switch': if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); break;
      case 'table': $('#feed').classList.remove('open'); openTable(el.dataset.t); break;
      case 'newOrder': { const n = await pickTable('Новe замовлення', 'Оберіть стіл'); if (n) { openTable(n); S.mobileMenu = true; renderSheet(); } break; }
      case 'closeSheet': closeSheet(); break;
      case 'tab': S.mobileMenu = el.dataset.m === '1'; renderSheet(); break;
      case 'mobileMenu': S.mobileMenu = true; renderSheet(); break;
      case 'cat': S.cat = +el.dataset.i; S.q = ''; renderSheet(); $('.items').scrollTop = 0; break;
      case 'add': addItem(el.dataset.id); break;
      case 'cq': { const c = cartOf(t), x = c[el.dataset.k]; if (x) { x.q += +el.dataset.d; if (x.q <= 0) delete c[el.dataset.k]; } saveCarts(); renderSheet(); break; }
      case 'cartClear': S.carts[t] = {}; saveCarts(); renderSheet(); break;
      case 'send': sendCart(); break;
      case 'rm': if (await confirmBox(`Прибрати 1× ${el.dataset.name}?`)) act('remove', { t, name: el.dataset.name }, '✏️ Прибрано'); break;
      case 'pre': act('precheck', { t }, '🖨 Пречек відправлено'); break;
      case 'disc': discFlow(); break;
      case 'discSet': act('discount', { t, pct: 0 }, 'Знижку прибрано'); break;
      case 'move': moveFlow(); break;
      case 'closeT': closeFlow(); break;
      case 'delTable': if (await confirmBox(`Видалити стіл ${t}?`, 'Помилковий/тестовий — сума НЕ піде у виручку')) { const r = await act('delete', { t }, `🗑 Стіл ${t} видалено`); if (r) closeSheet(); } break;
      case 'accept': act('accept', { oid: el.dataset.oid }, '✅ Прийнято — гість бачить статус'); break;
      case 'cPrint': act('closedPrint', { ref: el.dataset.ref }, '🖨 Чек відправлено'); break;
      case 'cDel': if (await confirmBox('Видалити рахунок з виручки?', 'Сума, страви й замовлення віднімуться зі звітів')) await act('closedDel', { ref: el.dataset.ref }, '🧹 Видалено з виручки'); loadView(); break;
      case 'stopT': await act('stop', { id: el.dataset.id, hidden: el.dataset.h === '1' }); break;
      case 'pTest': act('printTest', {}, '🖨 Тест відправлено'); break;
      case 'pQr': { const n = await pickTable('QR меню', 'Номер столу надрукується над QR (QR однаковий)'); if (n) act('printQr', { t: n }, `🖨 QR столу ${n}`); break; }
      case 'float': { const v = await ask('Розмін на початок дня', 'Сума в касі, ₴', 'number'); if (v != null) { await act('float', { sum: +v }, '🏦 Записано'); loadView(); } break; }
      case 'expense': {
        const v = await modal({ title: '💸 Витрата', body: '<div class="form"><input id="eSum" inputmode="decimal" placeholder="Сума, ₴"><input id="eNote" placeholder="На що (напр. овочі на ринку)"></div>', buttons: [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З карти', val: 'card' }, { label: 'Скасувати', val: null }], keep: true });
        const sum = v && +$('#eSum').value.replace(',', '.'), note = v && $('#eNote').value; closeModal();
        if (v && sum) { await act('expense', { sum, note, src: v }, '💸 Витрату записано'); loadView(); }
        break;
      }
      case 'expDel': if (await confirmBox('Видалити витрату?')) { await act('expenseDel', { i: +el.dataset.i }); loadView(); } break;
      case 'menuEdit': menuEdit(el.dataset.id); break;
      case 'menuUndo': if (await confirmBox('Скасувати останню зміну меню?')) act('menuUndo', {}, '↩️ Скасовано'); break;
      case 'staffAdd': {
        const v = await modal({ title: '➕ Працівник', body: '<div class="form"><input id="sName" placeholder="Імʼя"><input id="sPin" inputmode="numeric" maxlength="6" placeholder="PIN (4–6 цифр)"></div>', buttons: [{ label: '🧑‍🍳 Офіціант', val: 'waiter', cls: 'primary' }, { label: '🔐 Адміністратор', val: 'admin' }, { label: 'Скасувати', val: null }], keep: true });
        const name = v && $('#sName').value, p = v && $('#sPin').value; closeModal();
        if (v) { await act('staffAdd', { name, pin: p, role: v }, '👥 Додано'); loadView(); }
        break;
      }
      case 'staffDel': if (await confirmBox('Видалити працівника?')) { await act('staffDel', { id: el.dataset.id }); loadView(); } break;
      case 'wOut': await act('waiterOut', { uid: el.dataset.uid }, 'Вийшов із бота'); loadView(); break;
      case 'wPass': { const v = await ask('Новий пароль офіціанта', 'мінімум 3 символи'); if (v) act('waiterPass', { pass: v }, '🔑 Змінено'); break; }
      case 'aPass': { const v = await ask('Новий пароль адміністратора', 'мінімум 4 символи'); if (v) act('adminPass', { pass: v }, '🔑 Змінено'); break; }
      case 'wifiAdd': await act('wifiAdd', {}, '📶 Мережу додано'); loadView(); break;
      case 'wifiClear': if (await confirmBox('Скинути всі мережі?', 'Гості не зможуть замовляти, поки не додасте мережу')) { await act('wifiClear'); loadView(); } break;
      case 'reset': if (await confirmBox('♻️ Обнулити все?', 'Звіти, каса, закриті, топ страв, стрічка і ВСІ відкриті столи')) if (await confirmBox('Точно? Це не можна скасувати.')) { await act('reset', {}, '♻️ Обнулено'); loadView(); } break;
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'search') { S.q = e.target.value; renderSheet(); }
    if (e.target.id === 'stopSearch') { S.q = e.target.value; renderMain(); const s = $('#stopSearch'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    if (e.target.id === 'cartCom') S.coms[S.open] = e.target.value;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#modal')) modalResolve?.(null); else closeSheet(); } });

  // ---------- старт ----------
  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    renderNav(); $('#main').innerHTML = '<div class="muted">Завантаження…</div>';
    try { await loadState(); } catch { return; }
    loadMenu().catch(() => {});
    connect();
  }
  if (S.token) start(); else showLogin();
})();
