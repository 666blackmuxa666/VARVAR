// VARVAR POS — касова програма. Ті самі дані й дії, що в Telegram-боті (сервер: worker/src/pos.js → ops.js).
// ⚠️ Після змін: npx esbuild js/pos.js --target=es2017 --outfile=js/pos.build.js (pos.html підключає build — для старих планшетів).
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
    tw: {}, packAdj: {}, open: 0, carts: store.get('carts', {}), coms: {}, grp: store.get('grp', ''), cat: '', q: '', fav: [], groups: [], photos: store.get('photos', true), shift: null, shown: new Set(), rep: { p: 'd', pay: '', by: '', grp: '', cat: '', t: '', q: '', tab: 'dishes', sort: 's' }, mobileMenu: false, data: {}, seen: new Set(), ready: false, live: false,
  };
  const isAdmin = () => S.me?.role === 'admin';
  const setHTML = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } };

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
  const dots = () => { const d = $('#dots'); const len = 4; d.innerHTML = Array.from({ length: len }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join(''); };
  async function tryLogin(body) {
    $('#lErr').style.color = 'var(--muted)'; $('#lErr').textContent = 'Перевіряю…';
    try {
      const r = await api('login', body);
      if (r.register) return showReg(r.register, body.pin);
      S.token = r.token; S.me = r.me; store.set('token', r.token); store.set('me', r.me);
      start();
    } catch (e) {
      $('#lErr').style.color = ''; $('#lErr').textContent = e.message === 'error' ? 'Помилка зʼєднання' : /fetch|network/i.test(e.message) ? 'Немає звʼязку з сервером: ' + e.message : e.message;
      pin = ''; dots(); $('#dots').classList.add('shake'); setTimeout(() => $('#dots').classList.remove('shake'), 400);
    }
  }
  // PIN з клавіатури комп'ютера: цифри, Backspace, Enter
  document.addEventListener('keydown', e => {
    if ($('#login').hidden || $('#pinView').hidden || !$('#regView').hidden) return;
    if (/^\d$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') pinKey('b'); else if (e.key === 'Escape') pinKey('c');
    else if (e.key === 'Enter' && pin.length >= 4) { clearTimeout(tryLogin.t); tryLogin({ pin }); }
  });
  $('#keypad').addEventListener('click', e => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) pinKey(k); });
  function pinKey(k) {
    if (k === 'c') pin = ''; else if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
    dots();
    if (pin.length === 4) { clearTimeout(tryLogin.t); tryLogin.t = setTimeout(() => tryLogin({ pin }), 150); }
  }
  // реєстрація: код 1119 (адмін) / 1112 (офіціант) → імʼя + свій PIN
  let regCodeV = '';
  function showReg(role, code) {
    regCodeV = code; pin = ''; dots();
    $('#pinView').hidden = true; $('#passView').hidden = true; $('#regView').hidden = false;
    $('#loginSub').textContent = 'Реєстрація працівника';
    $('#regRole').textContent = role === 'admin' ? '🔐 Новий адміністратор' : '🧑‍🍳 Новий офіціант';
    $('#lErr').textContent = ''; $('#rName').value = ''; $('#rPin').value = ''; $('#rPin2').value = ''; setTimeout(() => $('#rName').focus(), 50);
  }
  document.querySelectorAll('.pin4').forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 4); }));
  $('#regBack').onclick = () => { $('#regView').hidden = true; $('#pinView').hidden = false; $('#loginSub').textContent = 'Введіть свій PIN'; $('#lErr').textContent = ''; };
  $('#regView').onsubmit = async e => {
    e.preventDefault();
    const name = $('#rName').value.trim(), p1 = $('#rPin').value.trim(), p2 = $('#rPin2').value.trim();
    if (!/^\d{4}$/.test(p1)) { $('#lErr').textContent = 'PIN — рівно 4 цифри'; return; }
    if (p1 !== p2) { $('#lErr').textContent = 'PIN-и не збігаються'; return; }
    $('#lErr').style.color = 'var(--muted)'; $('#lErr').textContent = 'Реєструю…';
    try {
      const r = await api('register', { code: regCodeV, name, pin: p1 });
      S.token = r.token; S.me = r.me; store.set('token', r.token); store.set('me', r.me);
      $('#regView').hidden = true; $('#pinView').hidden = false; $('#lErr').textContent = '';
      start(); toast(`👋 Вітаю, ${r.me.name}! Ваш PIN збережено`);
    } catch (e2) { $('#lErr').style.color = ''; $('#lErr').textContent = e2.message; }
  };
  if ($('#toPass')) $('#toPass').onclick = () => { $('#pinView').hidden = true; $('#passView').hidden = false; $('#loginSub').textContent = 'Вхід паролем'; $('#lName').focus(); };
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
    S.me = { ...S.me, ...r.me }; S.myTip = r.myTip; S.n = r.n; S.printer = r.printer; S.shift = r.shift;
    S.tables = Object.fromEntries(r.tables.map(b => [b.t, b]));
    const fresh = r.events.filter(e => !S.seen.has(e.id));
    if (S.ready && fresh.some(e => e.k === 'guest' || e.k === 'check')) ding();
    r.events.forEach(e => S.seen.add(e.id));
    S.events = r.events; S.ready = true;
    render();
  }
  async function loadMenu() { const r = await api('menu'); S.menu = r.menu; S.fav = r.fav || []; S.groups = r.groups || []; if (S.open) renderSheet(); if (['stop', 'menu', 'reports'].includes(S.view)) renderMain(); }
  let ws, wsTimer, pingT, reloadT, lastMsg = 0;
  // iPhone «на головному екрані» присипляє застосунок: зʼєднання тихо вмирає — перепідключаємось і перечитуємо стан
  function revive() { if (!S.token) return; S.live = false; liveDot(); try { ws.onclose = null; ws.close(); } catch {} clearInterval(pingT); connect(); }
  function connect() {
    try { ws?.close(); } catch {}
    ws = new WebSocket(API.replace(/^http/, 'ws') + '/api/pos/live?token=' + S.token);
    ws.onopen = () => { S.live = true; lastMsg = Date.now(); liveDot(); clearInterval(pingT); pingT = setInterval(() => { if (Date.now() - lastMsg > 45000) return revive(); ws.readyState === 1 && ws.send('ping'); }, 15000); loadState().catch(() => {}); };
    ws.onmessage = e => {
      lastMsg = Date.now();
      if (e.data === 'pong') return;
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type !== 'changed') return;
      clearTimeout(reloadT);
      reloadT = setTimeout(() => {
        loadState().catch(() => {});
        if (m.keys.includes('menu') || m.keys.includes('fav')) loadMenu().catch(() => {});
        if (['closed', 'reports', 'settings', 'cash'].includes(S.view) && m.keys.some(k => ['closed', 'day', 'exp', 'staff', 'shift', 'z', 'mov', 'tipbal', 'tippay', 'void'].includes(k))) loadView(true);
      }, 120);
    };
    ws.onclose = () => { S.live = false; liveDot(); clearInterval(pingT); clearTimeout(wsTimer); if (S.token) wsTimer = setTimeout(connect, 2000); };
  }
  const liveDot = () => { $('#live').className = 'live' + (S.live ? ' on' : ''); };
  setInterval(() => { if (S.token && !S.live && document.visibilityState === 'visible') loadState().catch(() => {}); }, 15000); // запасний варіант без WebSocket
  const wake = () => { if (document.visibilityState !== 'visible' || !S.token) return; loadState().catch(() => {}); if (!S.live || Date.now() - lastMsg > 20000) revive(); };
  document.addEventListener('visibilitychange', wake); addEventListener('pageshow', wake); addEventListener('focus', wake); addEventListener('online', wake);

  let actx;
  function ding() { // короткий сигнал про нове замовлення гостя
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      [0, .16].forEach((d, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = i ? 1320 : 880; g.gain.setValueAtTime(.0001, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(.25, actx.currentTime + d + .02); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d + .25); o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + .3); });
    } catch {}
  }

  // ---------- каркас ----------
  const NAV = [['hall', '🪑', 'Зал'], ['closed', '📜', 'Закриті'], ['stop', '⛔', 'Стоп-лист'], ['cash', '💰', 'Каса', 1], ['reports', '📊', 'Звіти', 1], ['menu', '📖', 'Меню', 1], ['printer', '🖨', 'Принтер'], ['settings', '⚙️', 'Налашт.', 1]];
  function renderNav() {
    const newCnt = S.events.filter(e => e.k === 'guest' && e.s !== 'acc').length;
    setHTML($('#nav'), `<div class="brand"><img src="printer/logo.png" alt="VARVAR"></div>` +
      NAV.filter(n => !n[3] || isAdmin()).map(([v, ic, l]) => `<button class="${S.view === v ? 'on' : ''}${['printer', 'menu', 'settings', 'stop'].includes(v) ? ' more-i' : ''}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}</button>`).join('') +
      `<button class="feed-btn" data-a="feed"><span class="ic">🔔</span>Стрічка${newCnt ? `<span class="badge">${newCnt}</span>` : ''}</button>` +
      `<button class="more-btn ${['printer', 'menu', 'settings', 'stop'].includes(S.view) ? 'on' : ''}" data-a="more"><span class="ic">⋯</span>Ще</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="На весь екран"><span class="ic">⛶</span>Екран</button><div class="me">${esc(S.me?.name)}<br>${isAdmin() ? 'адмін' : 'офіціант'}</div>` +
      `<button data-a="switch"><span class="ic">🔒</span>Вийти</button>`);
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
      const tag = b.check ? `<span class="tag c">🧾 рахунок</span>${b.pay ? `<i class="pay" title="${b.pay === 'card' ? 'карта' : 'готівка'}">${b.pay === 'card' ? '💳' : '💵'}</i>` : ''}` : pending.has(t) ? '<span class="tag g">нове</span>' : '';
      return `<button class="tbl ${cls}" data-a="table" data-t="${t}">${tag}<div class="n">${t}</div><div class="st">${b.orders} замовл.${b.disc ? ` · −${b.disc}%` : ''}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">з ${b.opened ? hhmm(b.opened) : '—'}</div></button>`;
    }).join('');
    return `<div class="head"><h1>Зал</h1><div class="stat">Відкрито<b>${list.length}</b></div><div class="stat tipstat" title="Накопичено, ще не видано">💝 Мої чайові<b class="money">${money(S.myTip?.sum || 0)}</b></div><div class="stat">У залі<b class="money">${money(sum)}</b></div>
      <button class="btn primary" data-a="newOrder">➕ Замовлення</button></div><div class="tables">${tiles}</div>`;
  }

  // ---------- стрічка ----------
  const evTitle = e => ({
    guest: `🛎 Стіл ${e.t} — ${esc((e.kind || 'замовлення').toLowerCase())}`, check: `🧾 Стіл ${e.t} просить чек${e.pay ? (e.pay === 'card' ? ' · 💳 карта' : ' · 💵 готівка') : ''}${e.tip ? ` · 💝 ${money(e.tip)}` : ''}`,
    waiter: `🧑‍🍳 Стіл ${e.t} — ${esc(e.by)}${e.src === 'каса' ? ' (каса)' : ''}`, close: `✅ Стіл ${e.t} закрито — ${money(e.sum)} ${e.pay === 'card' ? '💳' : '💵'}${e.print === false ? ' · без чека' : ''}`,
    shift: esc(e.text), del: `🗑 Стіл ${e.t} видалено (${money(e.sum)})`, move: `↔️ ${esc(e.text)}`, disc: `% Стіл ${e.t}: ${esc(e.text)}`, rm: `✏️ Стіл ${e.t}: ${esc(e.text)}`, pre: `🖨 Пречек стіл ${e.t}`, noscan: `🚨📵🚫 СТІЛ ${e.t} — НЕ МОЖЕ ЗАМОВИТИ 🚫📵🚨<br><small>Гість не відсканував QR (або минула година). Підійдіть: 📷 нехай відсканує QR на столі 👆</small>`,
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    setHTML($('#events'), S.events.length ? [...S.events].reverse().map(e => {
      const add = e.prev?.length && e.lines?.length; // дозамовлення — яскраво, а що вже було на столі — сіро нижче
      const lines = e.lines?.length ? `${add ? '<div class="addtag">➕ ДОЗАМОВЛЕННЯ</div>' : ''}<div class="lines${add ? ' add' : ''}">${e.lines.map(esc).join('\n')}</div>` : '';
      const by = e.by && !['waiter'].includes(e.k) ? ` · ${esc(e.by)}` : '';
      const btns = e.k === 'noscan' ? `<div class="act"><button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${e.t}</button></div>` : e.k === 'guest' || e.k === 'check'
        ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || 'прийнято')}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button>`}<button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${e.t}</button></div>` : '';
      const fresh = S.shown.size && !S.shown.has(e.id) ? ' fresh' : '';
      return `<div class="ev ${e.k}${e.s === 'acc' ? ' acc' : ''}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}${e.sum && ['guest', 'waiter'].includes(e.k) ? `<div class="muted">Сума ${money(e.sum)}</div>` : ''}${btns}</div>`;
    }).join('') : '<div class="muted" style="padding:12px">Сьогодні подій ще немає</div>');
    S.events.forEach(e => S.shown.add(e.id));
  }

  // ---------- стіл (лист) ----------
  const cartOf = t => (S.carts[t] ||= {});
  // «з собою»: 1 упаковка на кожну страву з кухні (як на сайті гостя і в боті)
  const FOOD = ['minimax', 'pasta', 'burgers', 'salads', 'snacks', 'soups', 'pans'];
  const packItem = () => S.menu?.categories.find(c => c.id === 'upakuvannia')?.items[0];
  const packQ = t => { if (!S.tw[t] || !S.menu) return 0; const food = new Set(S.menu.categories.filter(c => FOOD.includes(c.id)).flatMap(c => c.items.map(i => i.id))); return Math.max(0, Object.values(cartOf(t)).filter(x => food.has(x.id)).reduce((s, x) => s + x.q, 0) + (S.packAdj[t] || 0)); };
  const saveCarts = () => store.set('carts', S.carts);
  const itemsAll = () => S.menu ? S.menu.categories.flatMap(c => c.items) : [];
  function openTable(t) {
    S.open = +t; S.mobileMenu = !S.tables[t]; S.q = ''; if (!S.menu) loadMenu();
    // каркас створюється один раз — далі оновлюються лише частини (без блимання і повторної анімації)
    $('#layer').innerHTML = `<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet"><div class="sheet-head" id="shHead"></div><div id="shPend"></div>
      <div class="sheet-body" id="shBody"><div class="bill" id="shBill"></div><div class="menu-pane"><div id="shNav"></div><div class="items" id="shItems"></div></div></div></div>`;
    renderSheet();
  }
  function closeSheet() { S.open = 0; $('#layer').innerHTML = ''; }
  // групи меню: ⭐ Обрані · 🍳 Кухня · 🍹 Бар · 💨 Кальян
  const grpList = () => [{ id: 'fav', name: '⭐ Обрані' }, ...S.groups];
  const curGrp = () => S.grp || (S.fav.length ? 'fav' : 'kitchen');
  const grpCats = g => { const gg = S.groups.find(x => x.id === g); return gg ? S.menu.categories.filter(c => gg.cats.includes(c.id)) : []; };
  function menuItems() {
    const q = S.q.trim().toLowerCase();
    if (q) return itemsAll().filter(i => i.name.uk.toLowerCase().includes(q) || (i.name.en || '').toLowerCase().includes(q));
    const g = curGrp();
    if (g === 'fav') return S.fav.map(id => itemsAll().find(i => i.id === id)).filter(Boolean);
    const cats = grpCats(g), c = cats.find(x => x.id === S.cat) || cats[0];
    return c ? c.items : [];
  }
  function renderSheet() {
    const t = S.open; if (!t || !$('#shHead')) return;
    const b = S.tables[t], cart = cartOf(t), cartRows = Object.entries(cart);
    const pk = packItem(), pq = pk ? packQ(t) : 0;
    const cartSum = cartRows.reduce((s, [, x]) => s + x.price * x.q, 0) + (pq ? pq * pk.price : 0);
    setHTML($('#shHead'), `<h2>Стіл ${t}</h2>${b ? `<span class="total money">${money(b.pay2)}</span>${b.disc ? `<span class="chip">−${b.disc}%</span>` : ''}${b.tip ? `<span class="chip tipc">💝 ${money(b.tip)}</span>` : ''}<span class="muted hide-s">з ${b.opened ? hhmm(b.opened) : '—'} · ${b.orders} замовл.</span>${b.check ? '<span class="chip" style="background:var(--orange);color:#000">🧾 чек</span>' : ''}` : '<span class="muted">новий</span>'}
        <span class="sp"></span><div class="tabs2"><button class="${S.mobileMenu ? '' : 'on'}" data-a="tab" data-m="0">Рахунок${cartRows.length ? ` (${cartRows.reduce((s, [, x]) => s + x.q, 0)})` : ''}</button><button class="${S.mobileMenu ? 'on' : ''}" data-a="tab" data-m="1">Меню</button></div>
        <button class="close-x" data-a="closeSheet">✕</button>`);
    const pend = S.events.filter(e => e.k === 'guest' && e.s !== 'acc' && +e.t === t);
    setHTML($('#shPend'), pend.map(e => `<div class="pend"><div><b>🛎 Нове замовлення гостя · ${e.at}</b><div class="lines">${(e.lines || []).map(esc).join('<br>')}</div>${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}</div><button class="btn green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button></div>`).join(''));
    $('#shBody').className = 'sheet-body' + (S.mobileMenu ? ' show-menu' : '');
    // рахунок
    const billRows = b ? b.items.map(it => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} × ${Math.round(it.sum / it.q)} ₴</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="Прибрати 1">−</button></div>`).join('') : '<div class="muted" style="padding:8px 4px">Рахунок порожній — оберіть страви в меню</div>';
    const discRow = b?.disc ? `<div class="row"><div class="nm">Знижка ${b.disc}%</div><b class="money" style="color:var(--green)">−${b.total - b.pay2}</b><button class="rb minus" data-a="discSet" data-p="0">×</button></div>` : '';
    const tipRow = b?.tip ? `<div class="row"><div class="nm">💝 Чайові<small>входять у виручку</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">×</button>' : ''}</div>` : '';
    const comments = b ? b.log.filter(o => o.comment).map(o => `<div class="muted" style="padding:2px 6px">💬 ${esc(o.comment)}</div>`).join('') : '';
    const cartHTML = cartRows.length ? `<div class="cart"><h3>Нове замовлення</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} ₴</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">−</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join('')}${pq ? `<div class="row auto"><div class="nm">🥡 ${esc(pk.name.uk)}<small>${pk.price} ₴ × ${pq}${S.packAdj[t] ? '' : ' · автоматично'}</small></div><button class="rb minus" data-a="pk" data-d="-1">−</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ''}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="💬 Коментар для кухні" value="${esc(S.coms[t] || '')}"><button class="btn sm ${S.tw[t] ? 'primary' : 'ghost'}" data-a="tw">🥡 З собою</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">✕</button><button class="btn primary" data-a="send">Відправити · ${money(cartSum)}</button></div></div>` : '';
    const actions = b ? `<div class="actions"><button class="btn" data-a="pre">🖨 Пречек</button><button class="btn" data-a="disc">% Знижка</button>
      <button class="btn" data-a="move">↔️ Перенести</button>${isAdmin() ? '<button class="btn red" data-a="delTable">🗑 Видалити</button>' : '<button class="btn" data-a="mobileMenu">➕ Додати</button>'}
      <button class="btn green wide" data-a="closeT">💰 Закрити рахунок · ${money(b.pay2)}</button></div>` : '';
    const keepBill = $('#shBill .scroll')?.scrollTop, focusCom = document.activeElement?.id === 'cartCom';
    setHTML($('#shBill'), `<div class="scroll"><h3>Рахунок</h3>${billRows}${discRow}${tipRow}${comments}</div>${cartHTML}${actions}`);
    if (keepBill) $('#shBill .scroll').scrollTop = keepBill;
    if (focusCom) { const s = $('#cartCom'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    // меню: групи → категорії → страви (кількість у кошику малюється окремо, щоб фото не перемальовувались)
    if (!S.menu) { setHTML($('#shItems'), '<div class="muted" style="padding:20px">Завантаження меню…</div>'); return; }
    const g = curGrp(), q = S.q.trim(), cats = g === 'fav' ? [] : grpCats(g), cur = (cats.find(x => x.id === S.cat) || cats[0] || {}).id;
    const focusSearch = document.activeElement?.id === 'search';
    setHTML($('#shNav'), `<div class="seg">${grpList().map(x => `<button class="${!q && x.id === g ? 'on' : ''}" data-a="grp" data-g="${x.id}">${esc(x.name)}</button>`).join('')}</div>
      ${cats.length > 1 && !q ? `<div class="cats">${cats.map(c => `<button class="chip ${c.id === cur ? 'on' : ''}" data-a="cat" data-c="${c.id}">${esc(c.name.uk)}</button>`).join('')}</div>` : ''}
      <div class="srow"><input class="search" id="search" placeholder="🔎 Пошук страви" value="${esc(S.q)}"><button class="btn sm ghost" data-a="photos" title="Фото">${S.photos ? '🖼' : '📝'}</button></div>`);
    if (focusSearch) { const s = $('#search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    const items = menuItems();
    $('#shItems').classList.toggle('nophoto', !S.photos);
    setHTML($('#shItems'), items.map(it => `<div class="item ${it.hidden ? 'off' : ''}" data-a="add" data-id="${it.id}" role="button"><span class="cnt" data-cnt="${it.id}" hidden></span>${S.photos && it.img ? `<img src="${esc(it.img)}" alt="" decoding="async">` : ''}<span class="nm">${esc(it.name.uk)}</span>${it.size && !it.variants ? `<span class="muted sz">${esc(it.size)}</span>` : ''}<span class="pr">${it.hidden ? '⛔ немає' : it.variants ? it.variants.map(v => v.p).join(' / ') + ' ₴' : it.price + ' ₴'}</span><span class="star ${S.fav.includes(it.id) ? 'on' : ''}" data-a="fav" data-id="${it.id}" title="Обрані">${S.fav.includes(it.id) ? '★' : '☆'}</span></div>`).join('')
      || `<div class="muted" style="padding:10px">${g === 'fav' && !q ? 'Обраних ще немає — натисніть ☆ на страві, щоб додати' : 'Нічого не знайдено'}</div>`);
    paintCounts();
  }
  function paintCounts() {
    const cart = cartOf(S.open), n = {};
    Object.entries(cart).forEach(([k, x]) => { const id = k.split('|')[0]; n[id] = (n[id] || 0) + x.q; });
    document.querySelectorAll('[data-cnt]').forEach(el => { const v = n[el.dataset.cnt] || 0; el.hidden = !v; el.textContent = v; });
  }
  async function addItem(id) {
    const wasKb = searching();
    const it = itemsAll().find(i => i.id === id); if (!it) return;
    if (it.hidden) return toast('⛔ ' + it.name.uk + ' — у стоп-листі');
    let v = null;
    if (it.variants) {
      v = await choose(it.name.uk, 'Оберіть розмір', it.variants.map(x => ({ label: `${x.v} ${it.size || ''} · ${x.p} ₴`, val: x.v })));
      if (v == null) { if (wasKb) $('#search')?.focus(); return; }
    }
    const vv = it.variants?.find(x => x.v === v);
    const key = it.id + (v ? '|' + v : ''), cart = cartOf(S.open);
    cart[key] ||= { id: it.id, v, name: it.name.uk + (vv ? ` ${vv.v} ${it.size || ''}`.trimEnd() : ''), price: vv ? vv.p : it.price, q: 0 };
    const keepKb = wasKb || searching(); cart[key].q++; saveCarts();
    if (S.q) { S.q = ''; const se = $('#search'); if (se) se.value = ''; } // знайшли й додали — пошук очищується, можна одразу писати нове
    renderSheet(); if (keepKb && !searching()) $('#search')?.focus();
  }
  async function sendCart() {
    const t = S.open, cart = cartOf(t), pk = packItem(), pq = pk ? packQ(t) : 0, items = [...Object.values(cart).map(x => ({ id: x.id, v: x.v, q: x.q })), ...(pq ? [{ id: pk.id, q: pq }] : [])];
    if (!items.length) return;
    const btn = document.querySelector('[data-a="send"]'); if (btn) btn.disabled = true;
    const r = await act('order', { t, items, comment: [S.tw[t] ? 'З СОБОЮ' : '', S.coms[t] || ''].filter(Boolean).join(' · ') });
    if (r) { S.carts[t] = {}; S.coms[t] = ''; S.tw[t] = false; S.packAdj[t] = 0; saveCarts(); S.mobileMenu = false; toast(`🖨 Стіл ${t}: відправлено на кухню`); await loadState().catch(() => {}); }
    else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const v = await choose(`Закрити стіл ${t}`, `До сплати ${money(b.pay2)}${b.tip ? ` + 💝 чайові ${money(b.tip)} = ${money(b.pay2 + b.tip)}` : ''}${b.pay ? ` · гість хоче ${b.pay === 'card' ? '💳 карткою' : '💵 готівкою'}` : ''}`, [
      { label: '💵 Готівка + 🖨 чек', val: 'cash:1', cls: 'green' }, { label: '💳 Карта + 🖨 чек', val: 'card:1', cls: 'blue' },
      { label: '💵 Готівка, без чека', val: 'cash:0' }, { label: '💳 Карта, без чека', val: 'card:0' }]);
    if (!v) return;
    const [pay, pr] = v.split(':');
    const r = await act('close', { t, pay, print: pr === '1' });
    if (r?.r) { toast(`✅ Стіл ${t} закрито · ${money(r.r.sum)}`); closeSheet(); loadState().catch(() => {}); }
  }
  // причина скасування — обовʼязкова, видно у звітах і в закритому рахунку
  const VOID_R = ['Гість передумав', 'Помилка офіціанта', 'Довго чекали', 'Не сподобалось', 'Немає продукту', 'Брак / зіпсовано'];
  async function voidReason(title) {
    const v = await choose(title, '❓ Чому? Причину побачить адміністратор у звітах', [...VOID_R.map(r => ({ label: r, val: r })), { label: '✏️ Своя причина', val: 'own' }]);
    if (v !== 'own') return v || null;
    return await ask('Причина скасування', 'Напр.: гість пролив, замінили на іншу');
  }
  async function discFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const max = isAdmin() ? 100 : 20; // офіціант — до 20%, адмін — будь-яка
    const v = await choose(`Знижка — стіл ${t}`, `Сума ${money(b.total)}${b.disc ? ` · зараз ${b.disc}%` : ''}${isAdmin() ? '' : ' · офіціант — до 20%'}`, [...[5, 10, 15, 20, 25, 30, 50].filter(p => p <= max).map(p => ({ label: `${p}%  →  ${money(b.total - Math.round(b.total * p / 100))}`, val: String(p) })), { label: '✏️ Свій відсоток', val: 'own' }, { label: 'Без знижки', val: '0', cls: 'red' }]);
    if (v == null) return;
    let p = v;
    if (v === 'own') { p = await ask('Свій відсоток знижки', `Число від 0 до ${max}`, 'number'); if (p == null) return; if (+p > max) return toast(`⛔ Офіціант може дати знижку до ${max}%`); }
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
  async function loadView(silent) {
    try {
      if (S.view === 'cash') S.data.shift = await api('shift');
      if (S.view === 'reports') { if (!S.menu) await loadMenu(); await loadReport(); }
      if (S.view === 'closed') S.data.closed = (await api('closed')).list;
      if (S.view === 'settings') { S.data.staff = await api('staff'); S.data.wifi = await api('wifi'); }
      if (['stop', 'menu'].includes(S.view) && !S.menu) await loadMenu();
    } catch {}
    renderMain();
  }
  function renderMain() {
    const v = S.view, m = $('#main');
    m.classList.toggle('hall', v === 'hall');
    if (v === 'hall') { const [c, r] = hallGrid(m); m.style.setProperty('--cols', c); m.style.setProperty('--rows', r); }
    const html = { hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML }[v]?.();
    const fid = document.activeElement?.id, keep = ['stopSearch', 'rQ'].includes(fid);
    setHTML(m, html || '');
    if (keep) { const el = $('#' + fid); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
  // сітка залу: столи рівномірно на всю робочу зону, без порожніх клітинок, плитки близькі до квадрата
  function hallGrid(m) {
    const w = m.clientWidth || innerWidth, h = Math.max(200, (m.clientHeight || innerHeight) - 90), n = S.n;
    let best = [1, n], score = 1e9;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), empty = c * r - n, ratio = (w / c) / (h / r);
      const sc = empty * 3 + Math.abs(Math.log(ratio / 1.15));
      if (sc < score) { score = sc; best = [c, r]; }
    }
    return best;
  }
  addEventListener('resize', () => { if (S.view === 'hall' && S.token) { $('#main')._h = ''; renderMain(); } });
  const payL = x => x.card ? '💳 карта' : '💵 готівка';
  function closedHTML() {
    const l = S.data.closed; if (!l) return '<div class="head"><h1>Закриті сьогодні</h1></div><div class="muted">Завантаження…</div>';
    const gone = x => x.del || x.rm, ok = l.filter(x => !gone(x));
    return `<div class="head"><h1>Закриті сьогодні</h1><div class="stat">Рахунків<b>${ok.length}</b></div><div class="stat">Разом<b class="money">${money(ok.reduce((s, x) => s + x.sum, 0))}</b></div>
      <div class="stat">💵<b class="money">${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))}</b></div><div class="stat">💳<b class="money">${money(ok.reduce((s, x) => s + (x.card || 0), 0))}</b></div></div>
      <div class="cards">${[...l].reverse().map((x, i) => { const ref = x.id || (l.length - 1 - i); return `<div class="card" style="${gone(x) ? 'opacity:.45' : ''}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} · Стіл ${x.t} · <span class="money">${money(x.sum)}</span> ${x.reopen ? '↩️ відкрито знову' : x.restored ? '↩️ стіл відновлено' : x.del ? '🗑 стіл видалено' : x.rm ? '🧹 знято з виручки' : payL(x)}${x.disc ? ` · знижка ${x.disc}%` : ''}</h3><span class="muted">${esc(x.by || '')}</span>
        ${!gone(x) && x.dishes?.length ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">🖨 Чек</button>` : ''}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">🗑 З виручки</button>` : ''}
        ${isAdmin() && !x.del && !x.reopen && x.dishes?.length ? `<button class="btn sm" data-a="cReopen" data-ref="${ref}">↩️ Відкрити знову</button>` : ''}
        ${isAdmin() && x.rm && !x.reopen && !x.del ? `<button class="btn sm green" data-a="cBack" data-ref="${ref}">↩️ У виручку</button>` : ''}
        ${isAdmin() && x.del && !x.restored && x.dishes?.length ? `<button class="btn sm green" data-a="tBack" data-ref="${ref}">↩️ Відновити стіл</button>` : ''}</div>
        ${x.dishes?.length ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}× ${esc(n)} — ${s}`).join(' · ')}</div>` : ''}${x.tip ? `<div class="muted" style="margin-top:4px">💝 в т.ч. чайові ${money(x.tip)}</div>` : ''}
        ${x.voids?.length ? `<div class="voids">🚫 Скасовано:${x.voids.map(v => `<div>${v.at} · −${money(v.sum)} ${esc(v.name)} — <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join('')}</div>` : ''}</div>`; }).join('') || '<div class="muted">Сьогодні закритих рахунків ще немає</div>'}</div>`;
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
  // ---------- каса (зміна) ----------
  function cashHTML() {
    const r = S.data.shift; if (!r) return '<div class="head"><h1>Каса</h1></div><div class="muted">Завантаження…</div>';
    const z = r.z, pc = z.total ? Math.round(z.cash / z.total * 100) : 0;
    const today = new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
    // 0. гроші зараз — залишки за весь час (змін немає, усе переходить з дня в день)
    const B = r.bal, sg = n => (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n));
    const balH = B ? `<div class="bal">
      <button class="bal-c" data-a="balInfo" data-s="cash"><span>💵 Готівка в касі</span><b class="money">${money(B.cash)}</b><small>✏️ звірити</small></button>
      <button class="bal-c" data-a="balInfo" data-s="card"><span>💳 На картці</span><b class="money">${money(B.card)}</b><small>✏️ звірити</small></button>
      <div class="bal-c tot"><span>💰 Разом</span><b class="money">${money(B.total)}</b><small>з ${B.from ? B.from.split('-').reverse().join('.') : '—'}</small></div></div>` : '';
    // 1. головне: виручка за сьогодні, готівка/картка, кнопка Z
    const hero = `<div class="cash-hero on"><div class="hero-main"><div class="muted">${today}</div><div class="hero-l">Виручка за сьогодні</div><div class="hero-n money">${money(z.total)}</div>
        <div class="split"><div class="bar2"><i style="width:${pc}%"></i></div><div class="split-l"><span>💵 Готівка <b class="money">${money(z.cash)}</b></span><span>💳 Картка <b class="money">${money(z.card)}</b></span></div></div></div>
      <button class="btn primary zbtn" data-a="zDay">🧾 Z-звіт<small>надрукувати й надіслати</small></button></div>`;
    // 2. плитки
    const tiles = [['🧾 Чеків', z.checks], ['Ø Середній чек', z.checks ? money(z.total / z.checks) : '—'], ['🏷 Знижки', money(z.disc)], ['💝 Чайові', money(z.tip || 0)], ['💸 Витрати', money(z.exCash + z.exCard)], ['📈 Чистими', money(z.net), 'green'], ['⏳ Відкрито в залі', z.openTables ? `${money(z.openSum)} · ${z.openTables} ст.` : '—']];
    const tilesH = `<div class="widgets">${tiles.map(([l, v, c]) => `<div class="widget ${c || ''}"><span>${l}</span><b class="money">${v}</b></div>`).join('')}</div>`;
    // 3. операції
    const ops = `<div class="card"><h3>⚡ Операції</h3><div class="opsg"><button class="btn" data-a="expense">💸 Витрата</button><button class="btn" data-a="cMove" data-t="in">➕ Внести</button><button class="btn" data-a="cMove" data-t="out">➖ Вилучити</button><button class="btn" data-a="cMove" data-t="x">🔁 Обмін</button><button class="btn" data-a="cMove" data-t="kout">➖ З картки</button></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Витрата — купили щось · Внести / вилучити — поклали чи забрали гроші · Обмін — картка ↔ готівка · З картки — зняли з рахунку ФОП (собі, податки)</div></div>`;
    // 4. готівка за весь час
    const kv = (l, v, cls = '') => `<div class="kv ${cls}"><span>${l}</span><b class="money">${v}</b></div>`;
    const all = '';
    // 5. рух коштів сьогодні (якщо є)
    const mvH = z.mvCash || z.mvCard ? `<div class="card"><h3>🔁 Рух коштів сьогодні</h3>${kv('Готівка', (z.mvCash > 0 ? '+' : '') + money(z.mvCash))}${z.mvCard ? kv('Картка', (z.mvCard > 0 ? '+' : '') + money(z.mvCard)) : ''}</div>` : '';
    // рахунки чайових: накопичено → «Видано» обнуляє (не виручка)
    const tb = Object.entries(r.tipbal || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const tipsH = `<div class="card"><h3>💝 Чайові до видачі</h3>${tb.length ? tb.map(([n, v]) => `<div class="kv"><span>👤 ${esc(n)}</span><span><b class="money">${money(v)}</b> <button class="btn sm green" data-a="tipPay" data-n="${esc(n)}">Видано</button></span></div>`).join('') : '<div class="muted">Нічого не накопичено</div>'}
      ${(r.tippay || []).length ? `<div class="muted" style="font-size:12px;margin-top:8px">Сьогодні видано: ${r.tippay.map(x => `${x.at} ${esc(x.name)} ${money(x.sum)}`).join(' · ')}</div>` : ''}<div class="muted" style="font-size:12px;margin-top:6px">Чайові входять у виручку; при видачі списуються з готівки або картки.</div></div>`;
    // 6. журнал за сьогодні
    const J = [...(r.closed || []).filter(x => !x.del && !x.rm).map(x => ({ at: x.at, ic: x.card ? '💳' : '💵', t: `Стіл ${x.t}${x.by ? ' · ' + esc(x.by) : ''}${x.disc ? ` · −${x.disc}%` : ''}${x.tip ? ` · 💝 ${money(x.tip)}` : ''}`, v: '+' + money(x.sum), cls: 'in' })),
      ...r.exp.map((e, i) => ({ at: e.at, ic: '💸', t: esc(e.note || 'Витрата') + (e.src === 'card' ? ' (картка)' : ''), v: '−' + money(e.sum), cls: 'out', del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">✕</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="Відновити">↩️</button>` })),
      ...(r.mov || []).map((m, i) => ({ at: m.at, ic: '🔁', t: MOVE[m.type] + (m.note ? ' · ' + esc(m.note) : ''), v: money(m.sum), cls: 'mv', del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">✕</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="Відновити">↩️</button>` }))]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const journal = `<div class="card"><h3>📒 Журнал за сьогодні <span class="muted" style="font-weight:400;font-size:13px">· ${J.length}</span></h3>${J.length ? J.map(x => `<div class="jr ${x.cls}${x.del ? ' del' : ''}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : '<i></i>'}</div>`).join('') : '<div class="muted">Поки порожньо</div>'}</div>`;
    return `<div class="head"><h1>Каса</h1></div>${balH}${hero}${tilesH}<div class="cash-grid"><div class="col">${journal}</div><div class="col">${tipsH}${ops}${mvH}${all}</div></div>`;
  }
  const MOVE = { in: '➕ Внесення', out: '➖ Вилучення', k2c: '🔁 Картка → готівка', c2k: '🔁 Готівка → картка', tipc: '💝 Чайові (готівка)', tipk: '💝 Чайові (картка)', kout: '➖ Вилучення з картки', adjc: '✏️ Звірка готівки', adjk: '✏️ Звірка картки' };
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
    if (t === 'x') { t = await choose('🔁 Обмін', 'Звідки куди переходять гроші?', [{ label: '💳 Картка → 💵 готівка', val: 'k2c' }, { label: '💵 Готівка → 💳 картка', val: 'c2k' }]); if (!t) return; }
    const v = await modal({ title: MOVE[t], text: t === 'k2c' ? 'Зняли з картки й поклали в касу' : t === 'c2k' ? 'Взяли з каси й поклали на картку' : t === 'in' ? 'Поклали гроші в касу' : t === 'kout' ? 'Зняли з рахунку ФОП: собі, податки, закупка' : 'Забрали гроші з каси',
      body: '<div class="form"><input id="mSum" inputmode="decimal" placeholder="Сума, ₴"><input id="mNote" placeholder="Коментар (необовʼязково)"></div>', buttons: [{ label: 'Записати', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const sum = v && +$('#mSum').value.replace(',', '.'), note = v && $('#mNote').value; closeModal();
    if (v && sum > 0) { await act('cashMove', { type: t, sum, note }, '🔁 Записано'); loadView(); }
  }
  async function zDay() {
    const v = await choose('🧾 Z-звіт за сьогодні', 'Підсумок дня: чеки, готівка, картка, знижки, витрати', [{ label: '🖨 Надрукувати й надіслати в Telegram', val: 'p', cls: 'primary' }, { label: '📲 Лише в Telegram', val: 'n' }]);
    if (!v) return;
    const r = await act('zDay', { print: v === 'p' }, v === 'p' ? '🧾 Z-звіт надруковано' : '🧾 Z-звіт надіслано');
    if (r) loadView();
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
  async function shClose() {
    const d = (await api('shift').catch(() => null))?.d; if (!d) return;
    const v = await modal({ title: '🔒 Закрити касу', text: `Має бути в касі: ${money(d.inBox)}${d.openTables ? ` · ⚠️ відкрито столів: ${d.openTables}` : ''}`,
      body: '<div class="form"><input id="zCnt" inputmode="decimal" placeholder="Скільки пораховано готівки, ₴ (необовʼязково)"></div>',
      buttons: [{ label: '🖨 Закрити і надрукувати Z-звіт', val: 'p', cls: 'red' }, { label: 'Закрити без друку', val: 'n' }, { label: 'Скасувати', val: null }], keep: true });
    const c = v && $('#zCnt').value.trim().replace(',', '.'); closeModal(); if (!v) return;
    const r = await act('shiftClose', { counted: c === '' ? null : +c, print: v === 'p' });
    if (r?.z) { const z = r.z; await modal({ title: '🔒 Касу закрито', text: `Виручка ${money(z.total)} · чеків ${z.checks} · 💵 ${money(z.cash)} · 💳 ${money(z.card)} · в касі має бути ${money(z.inBox)}${z.diff != null ? ` · різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}` : ''}`, buttons: [{ label: 'OK', val: 1, cls: 'primary' }] }); loadState().catch(() => {}); if (S.view === 'cash') loadView(); }
  }

  // ---------- звіти: віджети + фільтри ----------
  const iso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const PER = [['d', 'Сьогодні'], ['y', 'Вчора'], ['w', '7 днів'], ['30', '30 днів'], ['m', 'Цей місяць'], ['pm', 'Мин. місяць'], ['yr', 'Рік'], ['all', 'За весь час'], ['c', 'Свій період']];
  function perRange(p) {
    const now = new Date(), day = 864e5, y = now.getFullYear(), mo = now.getMonth();
    if (p === 'd') return [iso(now), iso(now)];
    if (p === 'y') return [iso(now - day), iso(now - day)];
    if (p === 'w') return [iso(now - 6 * day), iso(now)];
    if (p === '30') return [iso(now - 29 * day), iso(now)];
    if (p === 'm') return [iso(new Date(y, mo, 1)), iso(now)];
    if (p === 'pm') return [iso(new Date(y, mo - 1, 1)), iso(new Date(y, mo, 0))];
    if (p === 'yr') return [iso(new Date(y, 0, 1)), iso(now)];
    if (p === 'all') return ['2026-09-01', iso(now)]; // з початку роботи системи
    return [S.rep.from || iso(now - 6 * day), S.rep.to || iso(now)];
  }
  let resolver;
  function dishOf(name) { // «Pepsi 0.5 л» → страва меню з категорією і групою
    if (!S.menu) return null;
    if (!resolver || resolver.menu !== S.menu) {
      const all = S.menu.categories.flatMap(c => c.items.map(it => ({ n: it.name.uk, cat: c.id, cname: c.name.uk, grp: (S.groups.find(g => g.cats.includes(c.id)) || {}).id }))).sort((a, b) => b.n.length - a.n.length);
      resolver = { menu: S.menu, memo: new Map(), all };
    }
    if (!resolver.memo.has(name)) resolver.memo.set(name, resolver.all.find(x => name === x.n || name.startsWith(x.n + ' ')) || null);
    return resolver.memo.get(name);
  }
  async function loadReport() {
    const [from, to] = perRange(S.rep.p), key = from + '|' + to;
    if (S.data.rangeKey !== key) { S.data.range = null; S.data.rangeKey = key; renderMain(); }
    const res = await api('report', { from, to }).catch(() => null);
    if (S.data.rangeKey === key) S.data.range = res || S.data.range || { checks: [], exp: [], z: [] };
  }
  function reportsHTML() {
    const R = S.rep, [from, to] = perRange(R.p), r = S.data.range;
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    const checks0 = r ? r.checks : [];
    const waiters = [...new Set(checks0.map(c => c.by).filter(Boolean))].sort(), tables = [...new Set(checks0.map(c => c.t))].sort((a, b) => a - b);
    const cats = S.menu ? S.menu.categories.filter(c => !R.grp || (S.groups.find(g => g.id === R.grp) || { cats: [] }).cats.includes(c.id)) : [];
    const filters = `<div class="filters">
      <div class="chips">${PER.map(([k, l]) => `<button class="chip ${R.p === k ? 'on' : ''}" data-a="rp" data-p="${k}">${l}</button>`).join('')}</div>
      ${R.p === 'c' ? `<div class="frow"><label>З<input type="date" id="rFrom" value="${from}"></label><label>По<input type="date" id="rTo" value="${to}"></label></div>` : ''}
      <div class="frow">
        <label>Оплата<select data-f="pay">${opt('', 'Усі', R.pay)}${opt('cash', '💵 Готівка', R.pay)}${opt('card', '💳 Карта', R.pay)}</select></label>
        <label>Офіціант<select data-f="by">${opt('', 'Усі', R.by)}${waiters.map(w => opt(w, w, R.by)).join('')}</select></label>
        <label>Група<select data-f="grp">${opt('', 'Усе', R.grp)}${S.groups.map(g => opt(g.id, g.name, R.grp)).join('')}</select></label>
        <label>Категорія<select data-f="cat">${opt('', 'Усі', R.cat)}${cats.map(c => opt(c.id, c.name.uk, R.cat)).join('')}</select></label>
        <label>Стіл<select data-f="t">${opt('', 'Усі', R.t)}${tables.map(t => opt(String(t), 'Стіл ' + t, R.t)).join('')}</select></label>
        <label>Страва<input id="rQ" placeholder="🔎 назва" value="${esc(R.q)}"></label>
        ${R.pay || R.by || R.grp || R.cat || R.t || R.q ? '<button class="btn sm ghost" data-a="rReset" style="align-self:end">✕ Скинути</button>' : ''}
      </div></div>`;
    const head = `<div class="head"><h1>Звіти</h1><span class="muted">${from === to ? from : from + ' — ' + to}</span></div>`;
    if (!r) return head + '<div class="muted" style="margin-bottom:14px">Завантаження…</div>' + filters;
    // фільтрація
    const dishF = R.grp || R.cat || R.q.trim(), q = R.q.trim().toLowerCase();
    const dishOk = n => { if (!dishF) return true; const x = dishOf(n); if (R.grp && x?.grp !== R.grp) return false; if (R.cat && x?.cat !== R.cat) return false; return !q || n.toLowerCase().includes(q); };
    const checks = checks0.filter(c => (!R.pay || (R.pay === 'card' ? c.card > 0 : c.cash > 0)) && (!R.by || c.by === R.by) && (!R.t || String(c.t) === R.t))
      .map(c => { const ds = c.dishes.filter(([n]) => dishOk(n)); return { ...c, ds, val: dishF ? ds.reduce((a, [, , s]) => a + s, 0) : c.sum }; }).filter(c => !dishF || c.ds.length);
    const sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
    const total = sum(checks, c => c.val), n = checks.length, qty = sum(checks, c => sum(c.ds, d => d[1]));
    const exp = R.by || R.t || dishF || R.pay ? null : sum(r.exp, e => e.sum);
    const tipOut = sum((r.mov || []).filter(m => m.type === 'tipc' || m.type === 'tipk'), m => m.sum); // як у касі: видані чайові теж зменшують «чистими»
    const W = [['Виручка', money(total), 'accent'], ['Чеків', n], ['Середній чек', n ? money(total / n) : '—'], ['Продано позицій', qty],
      ...(!dishF ? [['💵 Готівка', money(sum(checks, c => c.cash))], ['💳 Карта', money(sum(checks, c => c.card))], ['🏷 Знижки', money(sum(checks, c => c.disc))], ['💝 Чайові', money(sum(checks, c => c.tip))]] : []),
      ...(exp != null ? [['💸 Витрати', money(exp)], ...(tipOut ? [['💝 Чайові видано', money(tipOut)]] : []), ['Чистими', money(total - exp - tipOut), 'green']] : [])];
    const widgets = `<div class="widgets">${W.map(([l, v, c]) => `<div class="widget ${c || ''}"><span>${l}</span><b class="money">${v}</b></div>`).join('')}</div>`;
    // розрізи
    const grpBy = (keyF, valF = c => c.val) => { const m = new Map(); checks.forEach(c => { const k = keyF(c); const a = m.get(k) || [0, 0]; a[0]++; a[1] += valF(c); m.set(k, a); }); return [...m]; };
    const dishAgg = keyF => { const m = new Map(); checks.forEach(c => c.ds.forEach(([nm, qq, ss]) => { const k = keyF(nm); const a = m.get(k) || [0, 0]; a[0] += qq; a[1] += ss; m.set(k, a); })); return [...m]; };
    const TABS = { dishes: '🍽 Страви', cats: '📂 Категорії', groups: '🍳 Кухня/бар', waiters: '👤 Офіціанти', tips: '💝 Чайові', hours: '🕐 Години', days: '📅 Дні', tables: '🪑 Столи', checks: '🧾 Чеки', exp: '💸 Витрати', mov: '🔁 Рух коштів', z: '🔒 Z-звіти', ctrl: '🕵️ Контроль' };
    let rows, unit = 'чек.', sortable = false;
    const T = R.tab;
    if (T === 'dishes') { rows = dishAgg(nm => nm); unit = 'шт'; sortable = true; }
    else if (T === 'cats') { rows = dishAgg(nm => dishOf(nm)?.cname || 'Інше'); unit = 'шт'; sortable = true; }
    else if (T === 'groups') { rows = dishAgg(nm => (S.groups.find(g => g.id === dishOf(nm)?.grp) || { name: 'Інше' }).name); unit = 'шт'; }
    else if (T === 'waiters') rows = grpBy(c => c.by || '—');
    else if (T === 'tips') { rows = grpBy(c => c.by || '—', c => c.tip || 0).filter(x => x[1][1] > 0); unit = 'чек.'; }
    else if (T === 'hours') rows = grpBy(c => String(c.at || '').slice(0, 2) + ':00').sort((a, b) => a[0].localeCompare(b[0]));
    else if (T === 'days') rows = grpBy(c => c.d).sort((a, b) => a[0].localeCompare(b[0]));
    else if (T === 'tables') rows = grpBy(c => 'Стіл ' + c.t).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    let body;
    if (rows) {
      if (!['hours', 'days', 'tables'].includes(T)) rows.sort((a, b) => R.sort === 'q' && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const max = Math.max(1, ...rows.map(x => x[1][1]));
      body = rows.length ? rows.map(([k, [qq, ss]]) => `<div class="bar"><div class="bl"><span>${esc(k)}</span><span class="muted">${qq} ${unit}</span><b class="money">${money(ss)}</b></div><i style="width:${Math.max(2, ss / max * 100)}%"></i></div>`).join('') : '<div class="muted">Немає даних за цими фільтрами</div>';
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== 'q' ? 'on' : ''}" data-a="rSort" data-s="s">За сумою</button><button class="chip ${R.sort === 'q' ? 'on' : ''}" data-a="rSort" data-s="q">За кількістю</button></div>` + body;
    } else if (T === 'checks') body = checks.length ? [...checks].reverse().slice(0, 300).map(c => `<div class="kv"><span>${c.d.slice(5)} ${c.at} · стіл ${c.t} · ${esc(c.by)} ${c.card ? '💳' : '💵'}${c.disc ? ' 🏷' : ''}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}× ${esc(nm)}`).join(', ')}</small></span><b class="money">${money(c.val)}</b></div>`).join('') : '<div class="muted">Немає чеків</div>';
    else if (T === 'exp') body = r.exp.length ? r.exp.map(e => `<div class="kv"><span>${e.d.slice(5)} ${e.at} ${e.src === 'card' ? '💳' : '💵'} ${esc(e.note)} <span class="muted">${esc(e.by)}</span></span><b class="money">${money(e.sum)}</b></div>`).join('') : '<div class="muted">Витрат немає</div>';
    else if (T === 'mov') body = (r.mov || []).length ? r.mov.map(m => `<div class="kv"><span>${m.d.slice(5)} ${m.at} ${MOVE[m.type]} ${esc(m.note)} <span class="muted">${esc(m.by)}</span></span><b class="money">${money(m.sum)}</b></div>`).join('') : '<div class="muted">Руху коштів немає</div>';
    else if (T === 'z') body = r.z.length ? [...r.z].reverse().map(z => `<div class="kv"><span>${new Date(z.opened).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} — ${new Date(z.closed).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} · ${z.checks} чек. · ${esc(z.closedBy)}${z.diff ? ` · <b style="color:var(--red)">різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}</b>` : ''}</span><b class="money">${money(z.total)}</b></div>`).join('') : '<div class="muted">Z-звітів за період немає</div>';
    else if (T === 'ctrl') { // 🕵️ контроль по офіціантах
      const vs = (r.voids || []).filter(v => (!R.by || v.by === R.by) && (!R.t || String(v.t) === R.t)), W = {};
      const w = nm => W[nm || '—'] = W[nm || '—'] || { name: nm || '—', n: 0, s: 0, vN: 0, vS: 0, tN: 0, tS: 0, dN: 0, dS: 0, dMax: 0, tip: 0 };
      checks.forEach(c => { const x = w(c.by); x.n++; x.s += c.sum; if (c.disc) { x.dN++; x.dS += c.disc; x.dMax = Math.max(x.dMax, c.pct || 0); } x.tip += c.tip || 0; });
      vs.forEach(v => { const x = w(v.by); if (v.table) { x.tN++; x.tS += v.sum; } else { x.vN++; x.vS += v.sum; } });
      const ws = Object.values(W).sort((a, b) => b.vS + b.dS + b.tS - a.vS - a.dS - a.tS);
      const rm = (r.removed || []).filter(x => !R.t || String(x.t) === R.t);
      body = (ws.length ? `<div class="ctrl">${ws.map(x => { const pct = x.s + x.vS ? Math.round(x.vS / (x.s + x.vS) * 1000) / 10 : 0, bad = pct >= 5 || x.dMax > 20 || x.tN;
        return `<div class="ctrl-w ${bad ? 'bad' : ''}"><div class="ctrl-h"><b>👤 ${esc(x.name)}</b><span class="muted">${x.n} чек. · ${money(x.s)}</span></div>
          <div class="ctrl-g"><span>🚫 Скасування<b>${x.vN} · ${money(x.vS)}</b><small>${pct}% від продажів</small></span><span>🗑 Видалені столи<b>${x.tN} · ${money(x.tS)}</b></span>
          <span>🏷 Знижки<b>${x.dN} · ${money(x.dS)}</b><small>${x.dMax ? 'макс ' + x.dMax + '%' : '—'}</small></span><span>💝 Чайові<b>${money(x.tip)}</b></span></div></div>`; }).join('')}</div>` : '<div class="muted">Немає даних</div>') +
        `<h3 style="margin:18px 0 8px">🚫 Журнал скасувань</h3>` + (vs.length ? [...vs].reverse().slice(0, 300).map(v => `<div class="kv"><span>${v.d.slice(5)} ${v.at} · стіл ${v.t} · <b>${esc(v.by)}</b> · ${esc(v.name)}<br><small class="muted">❓ ${esc(v.reason)}</small></span><b class="money" style="color:var(--red)">−${money(v.sum)}</b></div>`).join('') : '<div class="muted">Скасувань немає 👍</div>') +
        (rm.length ? `<h3 style="margin:18px 0 8px">🧹 Видалені з виручки</h3>` + rm.map(x => `<div class="kv"><span>${x.d.slice(5)} ${x.at} · стіл ${x.t} · ${esc(x.by)}</span><b class="money">${money(x.sum)}</b></div>`).join('') : '');
    }
    // 🏆 топ страв за вибраний період (з урахуванням фільтрів)
    const top = dishAgg(nm => nm).sort((x, y) => y[1][0] - x[1][0] || y[1][1] - x[1][1]).slice(0, 10), tmax = Math.max(1, ...top.map(x => x[1][0]));
    const topHTML = `<div class="card top"><h3>🏆 Топ страв</h3>${top.length ? top.map(([k, [qq, ss]], i) => `<div class="bar"><div class="bl"><span>${['🥇', '🥈', '🥉'][i] || `<span class="muted">${i + 1}.</span>`} ${esc(k)}</span><b>${qq} шт</b><span class="muted money">${money(ss)}</span></div><i style="width:${Math.max(2, qq / tmax * 100)}%"></i></div>`).join('') : '<div class="muted">Ще немає продажів за цей період</div>'}</div>`;
    return head + widgets + filters + `<div class="seg wrap" style="margin:14px 0 10px">${Object.entries(TABS).map(([k, l]) => `<button class="${T === k ? 'on' : ''}" data-a="rTab" data-t="${k}">${l}</button>`).join('')}</div><div class="card">${body}</div>` + topHTML;
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>Меню</h1></div><div class="muted">Завантаження…</div>';
    return `<div class="head"><h1>Меню</h1><button class="btn" data-a="menuUndo">↩️ Відмінити останню зміну</button><button class="btn" data-a="catAdd">📂 Новий розділ</button><button class="btn primary" data-a="menuEdit" data-id="">➕ Нова страва</button></div>
      ${S.menu.categories.map(c => `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${c.items.map(i => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? ' ⛔' : ''}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map(v => `${v.v} — ${v.p}`).join(' / ') : i.price + ' ₴'}${i.size && !i.variants ? ' · ' + esc(i.size) : ''}</div></div>›</button>`).join('')}</div>`).join('')}`;
  }
  function settingsHTML() {
    const st = S.data.staff, wf = S.data.wifi;
    return `<div class="head"><h1>Налаштування</h1></div><div class="grid2">
      <div class="card"><h3>👥 Персонал (PIN для каси)</h3>${st ? st.staff.map(s => `<div class="kv"><span>${esc(s.name)} · ${s.role === 'admin' ? '🔐 адмін' : '🧑‍🍳 офіціант'}</span><button class="btn sm red" data-a="staffDel" data-id="${s.id}">🗑</button></div>`).join('') || '<div class="muted">Ще немає</div>' : '…'}
        <button class="btn sm primary" style="margin-top:10px" data-a="staffAdd">➕ Додати працівника</button></div>
      <div class="card"><h3>🆕 Коди реєстрації</h3><div class="muted" style="margin-bottom:8px">Новий працівник вводить код замість PIN → пише імʼя і придумує свій PIN. Видно, хто що робить.</div>
        ${st?.reg ? `<div class="kv"><span>🔐 Адміністратор</span><span><b>${esc(st.reg.admin)}</b> <button class="btn sm" data-a="regSet" data-r="admin">змінити</button></span></div><div class="kv"><span>🧑‍🍳 Офіціант</span><span><b>${esc(st.reg.waiter)}</b> <button class="btn sm" data-a="regSet" data-r="waiter">змінити</button></span></div>` : '…'}</div>
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
      const fq = el.querySelector('[data-mi-quick]'); if (fq) fq.onclick = () => { el.querySelector('#fIn').value = last0; modalResolve('ok'); };
    });
  }
  let last0 = 0;
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
      case 'fs': { const on = !document.fullscreenElement; store.set('fs', on); on ? document.documentElement.requestFullscreen?.().catch(() => {}) : document.exitFullscreen?.(); break; }
      case 'more': { const v = await choose('Ще', '', NAV.filter(n => (!n[3] || isAdmin()) && ['stop', 'menu', 'printer', 'settings'].includes(n[0])).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: '🔒 Вийти', val: 'logout', cls: 'red' }]));
        if (v === 'logout') { if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); } else if (v) { S.view = v; S.q = ''; renderNav(); renderMain(); loadView(); $('#main').scrollTop = 0; } break; }
      case 'switch': if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); break;
      case 'table': $('#feed').classList.remove('open'); openTable(el.dataset.t); break;
      case 'newOrder': { const n = await pickTable('Новe замовлення', 'Оберіть стіл'); if (n) { openTable(n); S.mobileMenu = true; renderSheet(); } break; }
      case 'closeSheet': closeSheet(); break;
      case 'tab': S.mobileMenu = el.dataset.m === '1'; renderSheet(); break;
      case 'mobileMenu': S.mobileMenu = true; renderSheet(); break;
      case 'cat': S.cat = el.dataset.c; S.q = ''; renderSheet(); $('#shItems').scrollTop = 0; break;
      case 'grp': S.grp = el.dataset.g; S.cat = ''; S.q = ''; store.set('grp', S.grp); renderSheet(); $('#shItems').scrollTop = 0; break;
      case 'fav': { const on = !S.fav.includes(el.dataset.id); S.fav = on ? [...S.fav, el.dataset.id] : S.fav.filter(x => x !== el.dataset.id); renderSheet(); act('fav', { id: el.dataset.id, on }, on ? '⭐ Додано в обрані' : 'Прибрано з обраних'); break; }
      case 'tw': S.tw[t] = !S.tw[t]; S.packAdj[t] = 0; renderSheet(); break;
      case 'pk': { const cur = packQ(t); if (cur + +el.dataset.d >= 0) S.packAdj[t] = (S.packAdj[t] || 0) + +el.dataset.d; renderSheet(); break; }
      case 'photos': S.photos = !S.photos; store.set('photos', S.photos); renderSheet(); break;
      case 'zDay': zDay(); break;
      case 'shOpen': shOpen(); break;
      case 'shClose': shClose(); break;
      case 'rp': S.rep.p = el.dataset.p; loadView(); break;
      case 'rTab': S.rep.tab = el.dataset.t; renderMain(); break;
      case 'rSort': S.rep.sort = el.dataset.s; renderMain(); break;
      case 'rReset': Object.assign(S.rep, { pay: '', by: '', grp: '', cat: '', t: '', q: '' }); renderMain(); break;
      case 'add': addItem(el.dataset.id); break;
      case 'cq': { const c = cartOf(t), x = c[el.dataset.k]; if (x) { x.q += +el.dataset.d; if (x.q <= 0) delete c[el.dataset.k]; } saveCarts(); renderSheet(); break; }
      case 'cartClear': S.carts[t] = {}; saveCarts(); renderSheet(); break;
      case 'send': sendCart(); break;
      case 'rm': { const reason = await voidReason(`Скасувати 1× ${el.dataset.name}?`); if (reason) act('remove', { t, name: el.dataset.name, reason }, '✏️ Скасовано'); break; }
      case 'pre': act('precheck', { t }, '🖨 Пречек відправлено'); break;
      case 'disc': discFlow(); break;
      case 'tip': { const b = S.tables[t]; if (!b) break; const v = await choose(`💝 Чайові — стіл ${t}`, `До сплати ${money(b.pay2)}`, [...[5, 10, 15].map(p => ({ label: `${p}% · ${money(Math.round(b.pay2 * p / 100))}`, val: String(Math.round(b.pay2 * p / 100)) })), { label: '✏️ Своя сума', val: 'own' }, ...(b.tip ? [{ label: 'Прибрати чайові', val: '0', cls: 'red' }] : [])]);
        if (v == null) break; let sum = v; if (v === 'own') { sum = await ask('Сума чайових, ₴', 'напр. 100', 'number'); if (sum == null) break; }
        await act('tip', { t, sum: +sum }, +sum ? `💝 Чайові ${money(+sum)}` : 'Чайові прибрано'); break; }
      case 'tipSet': act('tip', { t, sum: 0 }, 'Чайові прибрано'); break;
      case 'discSet': act('discount', { t, pct: 0 }, 'Знижку прибрано'); break;
      case 'move': moveFlow(); break;
      case 'closeT': closeFlow(); break;
      case 'delTable': { const reason = await voidReason(`Видалити весь стіл ${t}? Сума НЕ піде у виручку`); if (reason) { const r = await act('delete', { t, reason }, `🗑 Стіл ${t} видалено`); if (r) closeSheet(); } break; }
      case 'accept': act('accept', { oid: el.dataset.oid }, '✅ Прийнято — гість бачить статус'); break;
      case 'cBack': if (await confirmBox('Повернути рахунок у виручку?', 'Сума, страви й чайові знову зарахуються')) { await act('closedBack', { ref: el.dataset.ref }, '↩️ Повернуто у виручку'); loadView(); } break;
      case 'cReopen': if (await confirmBox('Відкрити рахунок знову?', 'Він зніметься з виручки й повернеться на стіл — виправите й закриєте заново')) { const r = await act('closedReopen', { ref: el.dataset.ref }, '↩️ Рахунок знову на столі'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } break;
      case 'tBack': if (await confirmBox('Відновити видалений стіл?', 'Страви повернуться на стіл')) { const r = await act('tableBack', { ref: el.dataset.ref }, '↩️ Стіл відновлено'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } break;
      case 'movBack': await act('moveBack', { i: +el.dataset.i }, '↩️ Відновлено'); loadView(); break;
      case 'expBack': await act('expenseBack', { i: +el.dataset.i }, '↩️ Відновлено'); loadView(); break;
      case 'cPrint': act('closedPrint', { ref: el.dataset.ref }, '🖨 Чек відправлено'); break;
      case 'cDel': if (await confirmBox('Видалити рахунок з виручки?', 'Сума, страви й замовлення віднімуться зі звітів')) await act('closedDel', { ref: el.dataset.ref }, '🧹 Видалено з виручки'); loadView(); break;
      case 'stopT': await act('stop', { id: el.dataset.id, hidden: el.dataset.h === '1' }); break;
      case 'pTest': act('printTest', {}, '🖨 Тест відправлено'); break;
      case 'pQr': { const n = await pickTable('QR меню', 'У кожного столу свій QR — замовлення одразу на цей стіл'); if (n) act('printQr', { t: n }, `🖨 QR столу ${n}`); break; }
      case 'float': { const v = await ask('Розмін на початок дня', 'Сума в касі, ₴', 'number'); if (v != null) { await act('float', { sum: +v.replace(',', '.') }, '🏦 Записано'); loadView(); } break; }
      case 'expense': {
        const v = await modal({ title: '💸 Витрата', body: '<div class="form"><input id="eSum" inputmode="decimal" placeholder="Сума, ₴"><input id="eNote" placeholder="На що (напр. овочі на ринку)"></div>', buttons: [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З карти', val: 'card' }, { label: 'Скасувати', val: null }], keep: true });
        const sum = v && +$('#eSum').value.replace(',', '.'), note = v && $('#eNote').value; closeModal();
        if (v && sum) { await act('expense', { sum, note, src: v }, '💸 Витрату записано'); loadView(); }
        break;
      }
      case 'tipPay': { const src = await choose(`💝 Видати чайові: ${el.dataset.n}`, 'Звідки списати? Сума відніметься з готівки або картки', [{ label: '💵 Готівкою з каси', val: 'cash', cls: 'green' }, { label: '💳 З картки', val: 'card', cls: 'blue' }]);
        if (src) { await act('tipPay', { name: el.dataset.n, src }, '💝 Видано'); loadView(); loadState().catch(() => {}); } break; }
      case 'cMove': cashMove(el.dataset.t); break;
      case 'balInfo': balInfo(el.dataset.s); break;
      case 'movDel': if (await confirmBox('Видалити запис?')) { await act('moveDel', { i: +el.dataset.i }); loadView(); } break;
      case 'expDel': if (await confirmBox('Видалити витрату?')) { await act('expenseDel', { i: +el.dataset.i }); loadView(); } break;
      case 'menuEdit': menuEdit(el.dataset.id); break;
      case 'catAdd': { const v = await ask('📂 Новий розділ меню', 'Назва, напр. Упакування'); if (v && await act('catAdd', { name: v }, '📂 Розділ додано в кінець меню')) loadMenu().catch(() => {}); break; }
      case 'menuUndo': if (await confirmBox('Скасувати останню зміну меню?')) act('menuUndo', {}, '↩️ Скасовано'); break;
      case 'staffAdd': {
        const v = await modal({ title: '➕ Працівник', body: '<div class="form"><input id="sName" placeholder="Імʼя"><input id="sPin" inputmode="numeric" maxlength="4" placeholder="PIN — 4 цифри"></div>', buttons: [{ label: '🧑‍🍳 Офіціант', val: 'waiter', cls: 'primary' }, { label: '🔐 Адміністратор', val: 'admin' }, { label: 'Скасувати', val: null }], keep: true });
        const name = v && $('#sName').value, p = v && $('#sPin').value; closeModal();
        if (v) { await act('staffAdd', { name, pin: p, role: v }, '👥 Додано'); loadView(); }
        break;
      }
      case 'regSet': { const v = await ask(`Новий код реєстрації (${el.dataset.r === 'admin' ? 'адмін' : 'офіціант'})`, '4 цифри', 'number'); if (v) { await act('regCode', { role: el.dataset.r, code: v }, '🆕 Код змінено'); loadView(); } break; }
      case 'staffDel': if (await confirmBox('Видалити працівника?', 'Його PIN перестане працювати')) { await act('staffDel', { id: el.dataset.id }); loadView(); } break;
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
    if (e.target.id === 'rQ') { S.rep.q = e.target.value; renderMain(); }
  });
  document.addEventListener('change', e => {
    const f = e.target.dataset?.f; if (f) { S.rep[f] = e.target.value; if (f === 'grp') S.rep.cat = ''; renderMain(); }
    if (e.target.id === 'rFrom' || e.target.id === 'rTo') { S.rep[e.target.id === 'rFrom' ? 'from' : 'to'] = e.target.value; loadView(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#modal')) modalResolve?.(null); else closeSheet(); } });

  // ---------- пошук: клавіатура не ховається при виборі страви; ховається свайпом вниз по списку ----------
  document.addEventListener('pointerdown', () => { if (store.get('fs', false) && !document.fullscreenElement && matchMedia('(min-width: 900px)').matches) document.documentElement.requestFullscreen?.().catch(() => {}); }, true);
  const searching = () => document.activeElement?.id === 'search';
  document.addEventListener('mousedown', e => { if (searching() && e.target.closest('#shItems .item, .cats, .seg')) e.preventDefault(); });
  let kbY = null;
  document.addEventListener('touchstart', e => { kbY = searching() && e.target.closest('#shItems') ? e.touches[0].clientY : null; }, { passive: true });
  document.addEventListener('touchmove', e => { if (kbY != null && e.touches[0].clientY - kbY > 40) { document.activeElement.blur(); kbY = null; } }, { passive: true });

  // ---------- свайп від лівого краю — «назад» (як в iPhone) ----------
  function goBack() {
    if ($('#modal')) return modalResolve?.(null);
    if ($('#feed').classList.contains('open')) return $('#feed').classList.remove('open');
    if (S.open) { if (S.mobileMenu && S.tables[S.open] && innerWidth <= 980) { S.mobileMenu = false; return renderSheet(); } return closeSheet(); }
    if (S.view !== 'hall') { S.view = 'hall'; S.q = ''; renderNav(); renderMain(); }
  }
  let sw = null;
  const swEl = () => $('#modal .modal') || ($('#feed').classList.contains('open') ? null : $('.sheet')) || $('#main');
  document.addEventListener('touchstart', e => {
    const p = e.touches[0]; sw = e.touches.length === 1 && p.clientX < 28 && !$('#login').offsetParent ? { x: p.clientX, y: p.clientY, dx: 0, on: false, el: swEl() } : null;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!sw) return; const p = e.touches[0], dx = p.clientX - sw.x, dy = p.clientY - sw.y;
    if (!sw.on) { if (Math.abs(dy) > 14 && Math.abs(dy) > dx) { sw = null; return; } if (dx > 10) sw.on = true; else return; }
    sw.dx = Math.max(0, dx);
    if (sw.el) { sw.el.style.transition = 'none'; sw.el.style.transform = `translateX(${sw.dx * .6}px)`; }
    let a = $('#swArrow'); if (!a) { a = document.createElement('div'); a.id = 'swArrow'; a.textContent = '‹'; document.body.append(a); }
    a.style.opacity = Math.min(1, sw.dx / 90); a.classList.toggle('go', sw.dx > 90);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!sw) return; const go = sw.on && sw.dx > 90, el = sw.el; sw = null;
    $('#swArrow')?.remove();
    if (el) { el.style.transition = 'transform .2s'; el.style.transform = ''; setTimeout(() => { el.style.transition = ''; }, 220); }
    if (go) { navigator.vibrate?.(10); goBack(); }
  });

  // ---------- автооновлення: телефони/планшети тримають старий pos.html у кеші ----------
  const myVer = (document.querySelector('script[src*="pos.build.js"]')?.getAttribute('src') || '').split('v=')[1];
  async function checkVer() {
    try {
      const h = await (await fetch('pos.html?u=' + Date.now(), { cache: 'no-store' })).text();
      const v = (h.match(/pos\.build\.js\?v=(\d+)/) || [])[1];
      if (v && myVer && v !== myVer && !S.open && !$('#modal')) location.replace(location.pathname + '?v=' + v);
    } catch {}
  }
  setInterval(checkVer, 5 * 60e3); document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkVer()); setTimeout(checkVer, 3000);

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
