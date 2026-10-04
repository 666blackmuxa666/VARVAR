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
    tw: {}, packAdj: {}, open: 0, carts: store.get('carts', {}), coms: {}, grp: store.get('grp', ''), cat: '', q: '', fav: [], groups: [], photos: store.get('photos', true), shift: null, shown: new Set(), rep: { p: 'd', pay: '', by: '', grp: '', cat: '', t: '', q: '', tab: 'overview', sort: 's', fo: false }, mobileMenu: false, data: {}, kq: [], kqSeen: null, kqCanc: new Set(), ur: {}, kFont: store.get('kfont', 1), seen: new Set(), ready: false, live: false,
  };
  const isAdmin = () => S.me?.role === 'admin', isCook = () => S.me?.role === 'cook';
  const setHTML = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } };

  // ---------- API ----------
  async function api(op, data = {}, ms = 12000) {
    const r = await withTimeout(fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op, ...data }) }), ms);
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
    $('#regRole').textContent = role === 'admin' ? '🔐 Новий адміністратор' : role === 'cook' ? '👨‍🍳 Новий кухар' : '🧑‍🍳 Новий офіціант';
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
  let stateSeq = 0, stateDone = 0;
  async function loadState() {
    const my = ++stateSeq, r = await api('state');
    if (my < stateDone) return; // повільна стара відповідь не затирає новішу (стіл «повертався» після закриття)
    stateDone = my;
    S.me = { ...S.me, ...r.me }; S.myTip = r.myTip; S.myAtt = r.myAtt || null; S.cfg = r.cfg || S.cfg; S.n = r.n; S.printer = r.printer; S.shift = r.shift;
    S.tables = Object.fromEntries(r.tables.map(b => [b.t, b]));
    const fresh = r.events.filter(e => !S.seen.has(e.id));
    if (S.ready && fresh.some(e => ['guest', 'check', 'call'].includes(e.k) || (!isCook() && ['ready', 'kmsg'].includes(e.k)))) ding();
    r.events.forEach(e => S.seen.add(e.id));
    S.events = r.events; S.ready = true;
    render();
  }
  async function loadMenu() { const r = await api('menu'); S.menu = r.menu; S.fav = r.fav || []; S.groups = r.groups || []; if (S.open) renderSheet(); if (['stop', 'menu', 'reports'].includes(S.view)) renderMain(); }
  let ws, wsTimer, pingT, reloadT, lastMsg = 0; const pendKeys = new Set();
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
      // ключі накопичуємо: раніше брались лише з останнього повідомлення — зміна меню/кухні за 120 мс до іншої губилась
      m.keys.forEach(k => pendKeys.add(k));
      clearTimeout(reloadT);
      reloadT = setTimeout(() => {
        m = { keys: [...pendKeys] }; pendKeys.clear();
        loadState().catch(() => {});
        if (m.keys.includes('menu') || m.keys.includes('fav')) loadMenu().catch(() => {});
        if (m.keys.includes('kq') && (isCook() || S.view === 'kq')) loadKq().catch(() => {});
        if (S.view === 'settings' && S.setTab === 'pay' && m.keys.some(k => ['att', 'plan', 'pay', 'swaps', 'staff'].includes(k)) && !$('#modal')) loadView(true);
        if (S.view === 'calc' && m.keys.some(k => ['ing', 'cards', 'stk', 'invl', 'sups', 'cntl', 'cnt'].includes(k)) && !skBusy()) loadView(true);
        if (['closed', 'reports', 'settings', 'cash'].includes(S.view) && m.keys.some(k => ['closed', 'day', 'exp', 'staff', 'shift', 'z', 'mov', 'tipbal', 'tippay', 'void', 'kq'].includes(k) || (k === 'bill' && S.view === 'cash'))) loadView(true);
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
  const NAV_COOK = [['kq', '👨‍🍳', 'Черга'], ['hall', '🪑', 'Зал'], ['stop', '⛔', 'Стоп-лист'], ['calc', '🧮', 'Склад']];
  const navList = () => isCook() ? NAV_COOK : NAV.filter(n => !n[3] || isAdmin());
  const NAV = [['hall', '🪑', 'Зал'], ['closed', '📜', 'Закриті'], ['stop', '⛔', 'Стоп-лист'], ['cash', '💰', 'Каса', 1], ['reports', '📊', 'Звіти', 1], ['kq', '👨‍🍳', 'Кухня', 1], ['menu', '📖', 'Меню', 1], ['calc', '🧮', 'Розрахунок', 1], ['settings', '⚙️', 'Налашт.', 1]];
  function renderNav() {
    const newCnt = S.events.filter(e => e.k === 'guest' && e.s === 'new').length;
    setHTML($('#nav'), `<div class="brand"><img src="printer/logo.png" alt="VARVAR"></div>` +
      navList().map(([v, ic, l]) => `<button class="${S.view === v ? 'on' : ''}${!isCook() && ['calc', 'menu', 'settings', 'stop', 'kq'].includes(v) ? ' more-i' : ''}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}</button>`).join('') +
      `<button class="feed-btn" data-a="feed"><span class="ic">🔔</span>Стрічка${newCnt ? `<span class="badge">${newCnt}</span>` : ''}</button>` +
      `<button class="more-btn ${['calc', 'menu', 'settings', 'stop', 'kq'].includes(S.view) ? 'on' : ''}" data-a="more"><span class="ic">⋯</span>Ще</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="На весь екран"><span class="ic">⛶</span>Екран</button><div class="me">${esc(S.me?.name)}<br>${isAdmin() ? 'адмін' : isCook() ? 'кухар' : 'офіціант'}</div>` +
      `<button data-a="switch"><span class="ic">🔒</span>Вийти</button>`);
  }
  function render() { renderNav(); renderFeed(); if (['hall', 'printer', 'kq'].includes(S.view) || (S.view === 'settings' && S.setTab === 'printer')) renderMain(); if (S.open) renderSheet(); }

  // ---------- зал ----------
  function hallHTML() {
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter(e => e.k === 'guest' && e.s === 'new').map(e => e.t));
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map(t => {
      const b = S.tables[t];
      if (!b) return `<button class="tbl" data-a="table" data-t="${t}"><div class="n">${t}</div><div class="st">вільний</div></button>`;
      const cls = ['busy', b.check ? 'check' : '', pending.has(t) ? 'new' : ''].join(' ');
      const tag = b.check ? `<span class="tag c">🧾 рахунок</span>${b.pay ? `<i class="pay" title="${b.pay === 'card' ? 'карта' : 'готівка'}">${b.pay === 'card' ? '💳' : '💵'}</i>` : ''}` : pending.has(t) ? '<span class="tag g">нове</span>' : '';
      return `<button class="tbl ${cls}" data-a="table" data-t="${t}">${tag}<div class="n">${t}</div><div class="st">${b.orders} замовл.${b.disc ? ` · −${b.disc}%` : ''}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">з ${b.opened ? hhmm(b.opened) : '—'}</div></button>`;
    }).join('');
    return `<div class="head"><h1>Зал</h1><div class="stat">Відкрито<b>${list.length}</b></div><div class="stat tipstat" title="Накопичено, ще не видано">💝 Мої чайові<b class="money">${money(S.myTip?.sum || 0)}</b></div><div class="zp-sh">${shiftBtns()}</div><div class="stat">У залі<b class="money">${money(sum)}</b></div>
      <button class="btn primary" data-a="newOrder">➕ Замовлення</button></div><div class="tables">${tiles}</div>`;
  }

  // ---------- стрічка ----------
  const evTitle = e => ({
    guest: `🛎 Стіл ${e.t} — ${esc((e.kind || 'замовлення').toLowerCase())}`, check: `🧾 Стіл ${e.t} просить чек${e.pay ? (e.pay === 'card' ? ' · 💳 карта' : ' · 💵 готівка') : ''}${e.tip ? ` · 💝 ${money(e.tip)}` : ''}`,
    waiter: `🧑‍🍳 Стіл ${e.t} — ${esc(e.by)}${e.src === 'каса' ? ' (каса)' : ''}`, close: `✅ Стіл ${e.t} закрито — ${money(e.sum)} ${e.pay === 'card' ? '💳' : '💵'}${e.print === false ? ' · без чека' : ''}`,
    shift: esc(e.text), del: `🗑 Стіл ${e.t} видалено (${money(e.sum)})`, move: `↔️ ${esc(e.text)}`, disc: `% Стіл ${e.t}: ${esc(e.text)}`, rm: `✏️ Стіл ${e.t}: ${esc(e.text)}`, pre: `🖨 Пречек стіл ${e.t}`, ready: e.part ? `🍽 Стіл ${e.t} — страва готова, забирайте` : `🍽 Стіл ${e.t} — ВСЕ ГОТОВО, забирайте!${e.mins != null ? ` <small>(${e.mins} хв)</small>` : ''}`, cooking: `🔥 Стіл ${e.t} — кухня готує`, kmsg: `👨‍🍳 Кухня → стіл ${e.t}: ${esc(e.text)}`, call: `🔔🔔 Стіл ${e.t} кличе офіціанта`, noscan: `🚨📵🚫 СТІЛ ${e.t} — НЕ МОЖЕ ЗАМОВИТИ 🚫📵🚨<br><small>Гість не відсканував QR (або минула година). Підійдіть: 📷 нехай відсканує QR на столі 👆</small>`,
    att: `🟢 ${esc(e.n)} на зміні${e.late ? ` · ⏰ запізнення ${e.late} хв` : ''}`, swap: esc(e.text),
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    setHTML($('#events'), S.events.length ? [...S.events].reverse().map(e => {
      const add = e.prev?.length && e.lines?.length; // дозамовлення — яскраво, а що вже було на столі — сіро нижче
      const rdy = e.k === 'ready' && e.text ? `<div class="lines">${esc(e.text)}</div>` : '';
      const lines = rdy || (e.lines?.length ? `${add ? '<div class="addtag">➕ ДОЗАМОВЛЕННЯ</div>' : ''}<div class="lines${add ? ' add' : ''}">${e.lines.map(esc).join('\n')}</div>` : '');
      const by = e.by && !['waiter'].includes(e.k) ? ` · ${esc(e.by)}` : '';
      const zb = e.k === 'att' ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || '')}</span>` : e.s === 'rej' ? `<span class="bad">❌ ${esc(e.accBy || '')}</span>` : isAdmin() ? `<button class="btn sm green" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="o">✅ Підтвердити</button>${e.late && S.cfg?.lateFine ? `<button class="btn sm" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="f">✅ + штраф</button>` : ''}<button class="btn sm red" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="n">❌</button>` : '<span class="muted">чекає підтвердження</span>'}</div>`
        : e.k === 'swap' && !e.old ? (e.s === 'ask' && e.n === S.me?.name ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="agree">Погоджуюсь</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">Ні</button></div>` : e.s === 'agreed' && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="ok">✅ Підтвердити обмін</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">❌</button></div>` : '') : '';
      const btns = zb || (e.k === 'noscan' ? `<div class="act"><button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${e.t}</button></div>` : e.k === 'guest' || e.k === 'check' || e.k === 'call'
        ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || 'прийнято')}</span>` : e.s === 'rej' ? `<span style="color:var(--red,#ff453a)">❌ відхилено · ${esc(e.accBy || '')}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button>${e.k === 'guest' ? `<button class="btn sm red" data-a="reject" data-oid="${e.oid}">❌ Відхилити</button>` : ''}`}<button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${e.t}</button></div>` : '');
      const fresh = S.shown.size && !S.shown.has(e.id) ? ' fresh' : '';
      return `<div class="ev ${e.k}${e.s === 'acc' || e.s === 'rej' ? ' acc' : ''}${e.s === 'rej' ? ' rej' : ''}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}${e.sum && ['guest', 'waiter'].includes(e.k) ? `<div class="muted">Сума ${money(e.sum)}</div>` : ''}${btns}</div>`;
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
    const pend = S.events.filter(e => e.k === 'guest' && e.s === 'new' && +e.t === t);
    setHTML($('#shPend'), pend.map(e => `<div class="pend"><div><b>🛎 Нове замовлення гостя · ${e.at}</b><div class="lines">${(e.lines || []).map(esc).join('<br>')}</div>${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}</div><button class="btn green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button></div>`).join(''));
    $('#shBody').className = 'sheet-body' + (S.mobileMenu ? ' show-menu' : '');
    // рахунок
    const billRows = b ? b.items.map(it => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} × ${Math.round(it.sum / it.q)} ₴</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="Прибрати 1">−</button></div>`).join('') : '<div class="muted" style="padding:8px 4px">Рахунок порожній — оберіть страви в меню</div>';
    const discRow = b?.disc ? `<div class="row"><div class="nm">Знижка ${b.disc}%</div><b class="money" style="color:var(--green)">−${b.total - b.pay2}</b><button class="rb minus" data-a="discSet" data-p="0">×</button></div>` : '';
    const tipRow = b?.tip ? `<div class="row"><div class="nm">💝 Чайові<small>входять у виручку</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">×</button>' : ''}</div>` : '';
    const comments = b ? b.log.filter(o => o.comment).map(o => `<div class="muted" style="padding:2px 6px">💬 ${esc(o.comment)}</div>`).join('') : '';
    const cartHTML = cartRows.length ? `<div class="cart"><h3>Нове замовлення</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} ₴</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">−</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join('')}${pq ? `<div class="row auto"><div class="nm">🥡 ${esc(pk.name.uk)}<small>${pk.price} ₴ × ${pq}${S.packAdj[t] ? '' : ' · автоматично'}</small></div><button class="rb minus" data-a="pk" data-d="-1">−</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ''}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="💬 Коментар для кухні" value="${esc(S.coms[t] || '')}"><button class="btn sm ${S.tw[t] ? 'primary' : 'ghost'}" data-a="tw">🥡 З собою</button><button class="btn sm ${S.ur[t] ? 'red' : 'ghost'}" data-a="ur">⚡ Терміново</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">✕</button><button class="btn primary" data-a="send">Відправити · ${money(cartSum)}</button></div></div>` : '';
    const actions = b && !isCook() ? `<div class="actions"><button class="btn" data-a="pre">🖨 Пречек</button><button class="btn" data-a="disc">% Знижка</button>
      <button class="btn" data-a="move">↔️ Перенести</button><button class="btn" data-a="split">✂️ Розділити</button>${isAdmin() ? '<button class="btn red" data-a="delTable">🗑 Видалити</button>' : '<button class="btn" data-a="mobileMenu">➕ Додати</button>'}
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
    const r = await act('order', { t, items, urgent: !!S.ur[t], comment: [S.tw[t] ? 'З СОБОЮ' : '', S.coms[t] || ''].filter(Boolean).join(' · ') });
    if (r) { S.carts[t] = {}; S.coms[t] = ''; S.tw[t] = false; S.ur[t] = false; S.packAdj[t] = 0; saveCarts(); S.mobileMenu = false; toast(`🖨 Стіл ${t}: відправлено на кухню`); await loadState().catch(() => {}); }
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
    const dmax = S.cfg?.discMax ?? 20, max = isAdmin() ? 100 : dmax; // офіціант — до ліміту з налаштувань, адмін — будь-яка
    const v = await choose(`Знижка — стіл ${t}`, `Сума ${money(b.total)}${b.disc ? ` · зараз ${b.disc}%` : ''}${isAdmin() ? '' : ` · офіціант — до ${dmax}%`}`, [...[5, 10, 15, 20, 25, 30, 50].filter(p => p <= max).map(p => ({ label: `${p}%  →  ${money(b.total - Math.round(b.total * p / 100))}`, val: String(p) })), { label: '✏️ Свій відсоток', val: 'own' }, { label: 'Без знижки', val: '0', cls: 'red' }]);
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

  // ✂️ розділити рахунок: обрати позиції й кількість → стіл, куди перенести
  function splitRender() {
    const { items, q } = S.spl, sum = items.reduce((a, it, i) => a + Math.round(it.sum / it.q) * (q[i] || 0), 0);
    const box = $('#splBox'); if (!box) return;
    box.innerHTML = items.map((it, i) => `<div class="row"><div class="nm">${esc(it.name)}<small>на столі ${it.q} шт · ${Math.round(it.sum / it.q)} ₴</small></div><button class="rb minus" data-a="spq" data-i="${i}" data-d="-1">−</button><span class="q">${q[i] || 0}</span><button class="rb plus" data-a="spq" data-i="${i}" data-d="1">+</button></div>`).join('')
      + `<div class="row"><div class="nm"><b>Новий рахунок</b></div><b class="money">${money(sum)}</b></div>`;
  }
  async function splitFlow() {
    const t = S.open, b = S.tables.find(x => x.t === t); if (!b) return;
    S.spl = { items: b.items, q: {} };
    const pm = modal({ title: `✂️ Розділити стіл ${t}`, text: 'Оберіть, що піде в окремий рахунок', body: '<div class="rows" id="splBox"></div>', buttons: [{ label: 'Далі → обрати стіл', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    splitRender(); const v = await pm;
    const sel = S.spl.items.map((it, i) => ({ name: it.name, q: S.spl.q[i] || 0 })).filter(x => x.q > 0); closeModal();
    if (!v) return; if (!sel.length) return toast('Нічого не обрано');
    const to = await pickTable(`✂️ Куди перенести (${sel.reduce((a, x) => a + x.q, 0)} поз.)`, 'Вільний стіл — новий рахунок; зайнятий (жовтий) — позиції додадуться до нього', t);
    if (!to) return;
    const r = await act('split', { t, to, items: sel }, '');
    if (r?.r) { toast(`✂️ Перенесено на стіл ${to} · ${money(r.r.sum)}`); await loadState().catch(() => {}); }
  }

  // ---------- інші екрани ----------
  async function loadView(silent) {
    try {
      if (S.view === 'kq') await loadKq();
      if (S.view === 'cash') S.data.shift = await api('shift');
      if (S.view === 'reports') { if (!S.menu) await loadMenu(); await loadReport(); }
      if (S.view === 'closed') { const r = await api('closed', { day: S.cday || '' }); S.data.closed = r.list; S.data.cvoids = r.voids || []; S.data.cday = r.day; S.data.ctoday = r.today; }
      if (S.view === 'calc') await loadCalc();
      if (S.view === 'settings' && S.setTab === 'pay') await loadPay();
      if (S.view === 'settings') { S.data.staff = await api('staff'); S.data.wifi = await api('wifi'); }
      if (['stop', 'menu'].includes(S.view) && !S.menu) await loadMenu();
    } catch {}
    renderMain();
  }
  function renderMain() {
    const v = S.view, m = $('#main');
    m.classList.toggle('hall', v === 'hall');
    if (v === 'hall') { const [c, r] = hallGrid(m); m.style.setProperty('--cols', c); m.style.setProperty('--rows', r); }
    const html = { kq: kqHTML, hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, calc: calcHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML }[v]?.();
    const fid = document.activeElement?.id, keep = ['stopSearch', 'rQ', 'skQ', 'skQ2', 'skCq'].includes(fid);
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
    const l = S.data.closed; if (!l) return '<div class="head"><h1>Закриті</h1></div><div class="muted">Завантаження…</div>';
    const isToday = !S.data.cday || S.data.cday === S.data.ctoday, dTitle = isToday ? 'сьогодні' : S.data.cday.split('-').reverse().join('.');
    const nav = `<button class="btn sm" data-a="cDay" data-v="-1">◀</button>${isToday ? '' : '<button class="btn sm" data-a="cDay" data-v="1">▶</button><button class="btn sm" data-a="cDay" data-v="0">Сьогодні</button>'}`;
    const gone = x => x.del || x.rm, ok = l.filter(x => !gone(x));
    return `<div class="head"><h1>Закриті ${dTitle}</h1>${nav}<div class="stat">Рахунків<b>${ok.length}</b></div><div class="stat">Разом<b class="money">${money(ok.reduce((s, x) => s + x.sum, 0))}</b></div>
      <div class="stat">💵<b class="money">${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))}</b></div><div class="stat">💳<b class="money">${money(ok.reduce((s, x) => s + (x.card || 0), 0))}</b></div></div>
      <div class="cards">${[...l].reverse().map((x, i) => { const ref = x.id || (l.length - 1 - i); return `<div class="card" style="${gone(x) ? 'opacity:.45' : ''}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} · Стіл ${x.t} · <span class="money">${money(x.sum)}</span> ${x.reopen ? '↩️ відкрито знову' : x.restored ? '↩️ стіл відновлено' : x.del ? '🗑 стіл видалено' : x.rm ? '🧹 знято з виручки' : payL(x)}${x.disc ? ` · знижка ${x.disc}%` : ''}</h3><span class="muted">${esc(x.by || '')}</span>
        ${!gone(x) && x.dishes?.length ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">🖨 Чек</button>` : ''}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">🗑 З виручки</button>` : ''}
        ${isAdmin() && !x.del && !x.reopen && x.dishes?.length ? `<button class="btn sm" data-a="cReopen" data-ref="${ref}">↩️ Відкрити знову</button>` : ''}
        ${isAdmin() && x.rm && !x.reopen && !x.del ? `<button class="btn sm green" data-a="cBack" data-ref="${ref}">↩️ У виручку</button>` : ''}
        ${isAdmin() && x.del && !x.restored && x.dishes?.length ? `<button class="btn sm green" data-a="tBack" data-ref="${ref}">↩️ Відновити стіл</button>` : ''}</div>
        ${x.dishes?.length ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}× ${esc(n)} — ${s}`).join(' · ')}</div>` : ''}${x.tip ? `<div class="muted" style="margin-top:4px">💝 в т.ч. чайові ${money(x.tip)}</div>` : ''}
        ${x.voids?.length ? `<div class="voids">🚫 Скасовано:${x.voids.map(v => `<div>${v.at} · −${money(v.sum)} ${esc(v.name)} — <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join('')}</div>` : ''}</div>`; }).join('') || `<div class="muted">${isToday ? 'Сьогодні закритих рахунків ще немає' : 'Цього дня закритих рахунків немає'}</div>`}</div>${(S.data.cvoids || []).length ? `<div class="card"><h3>🚫 Скасовані страви ${dTitle} <span class="muted">· ${S.data.cvoids.length}</span></h3>${[...S.data.cvoids].reverse().map(v => `<div class="kv"><span>${v.at} · стіл ${v.t} · <b>${esc(v.name)}</b> — <i>${esc(v.reason || '')}</i> <span class="muted">(${esc(v.by || '')})</span></span><span class="kv-r"><b class="money">${money(v.sum)}</b>${isToday && isAdmin() ? `<button class="btn sm green" data-a="vBack" data-ts="${v.ts}">↩️ На стіл</button>` : ''}</span></div>`).join('')}</div>` : ''}`;
  }
  // ---------- 👨‍🍳 кухонний екран ----------
  async function loadKq() {
    const r = await api('kitchen'); const list = r.list || [];
    const ids = list.filter(e => !e.done).map(e => e.id), canc = list.flatMap(e => e.items.filter(x => x.cancel || x.canc).map(x => e.id + x.n + (x.canc || 0)));
    if (S.kqSeen) { const nw = list.filter(e => !e.done && !S.kqSeen.has(e.id)); if (nw.length) siren(nw.some(e => e.urgent)); else if (canc.some(c => !S.kqCanc.has(c))) beep(); }
    S.kqSeen = new Set(list.map(e => e.id)); S.kqCanc = new Set(canc); S.kq = list;
    if (S.view === 'kq') renderMain();
  }
  setInterval(() => { if (S.view === 'kq') renderMain(); }, 30000); // таймери
  function tone(freqs, dur, vol = .6) { try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.(); let d = 0; for (const f of freqs) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(vol, actx.currentTime + d); g.gain.setValueAtTime(.0001, actx.currentTime + d + dur); o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + dur); d += dur; } } catch {} }
  // сирена: один гучний сигнал ~2 с (терміново — двічі)
  // 🚨 сигналізація 4 с: виючий звук (частота гойдається вгору-вниз), терміново — швидше
  function siren(urgent) {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.();
      const t0 = actx.currentTime, dur = 4, per = urgent ? .25 : .5;
      const o = actx.createOscillator(), o2 = actx.createOscillator(), g = actx.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      for (let t = 0; t < dur; t += per) { [o, o2].forEach((x, k) => { x.frequency.setValueAtTime(k ? 650 : 600, t0 + t); x.frequency.linearRampToValueAtTime(k ? 1450 : 1400, t0 + t + per / 2); x.frequency.linearRampToValueAtTime(k ? 650 : 600, t0 + t + per); }); }
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.7, t0 + .05); g.gain.setValueAtTime(.7, t0 + dur - .1); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g); o2.connect(g); g.connect(actx.destination); o.start(t0); o2.start(t0); o.stop(t0 + dur); o2.stop(t0 + dur);
    } catch {}
  }
  const beep = () => tone([440, 330], .2, .4);
  let wakeLock;
  async function kitchenStart() {
    $('#kGate')?.remove(); tone([660], .05, .01);
    try { await document.documentElement.requestFullscreen?.(); } catch {}
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  }
  document.addEventListener('visibilitychange', async () => { if (isCook() && document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {} });
  function kitchenGate() { if ($('#kGate')) return; const g = document.createElement('div'); g.id = 'kGate'; g.innerHTML = '<button class="btn primary" data-a="kGo">🔊 Почати зміну<small>увімкне звук сирени й повний екран</small></button>'; document.body.appendChild(g); }
  function kqHTML() {
    const now = Date.now(), act0 = S.kq.filter(e => !e.done).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || a.ts - b.ts), done = S.kq.filter(e => e.done).slice(-6).reverse();
    const card = e => { const m = Math.floor((now - e.ts) / 60000), tc = m >= 15 ? 'red' : m >= 10 ? 'yel' : '';
      return `<div class="kc${e.urgent ? ' urg' : ''}${e.start ? ' cook' : ' new'}"><div class="kh"><b>Стіл ${e.t}</b><span class="tm ${tc}">⏱ ${m} хв</span></div>
        <div class="km">${e.at} · ${esc(e.by)}${e.src === 'гість' ? ' · 📱 сайт' : ''}</div>
        ${e.urgent ? '<div class="ktag urg">⚡ ТЕРМІНОВО</div>' : ''}${e.tw ? '<div class="ktag">🥡 З СОБОЮ</div>' : ''}${e.comment ? `<div class="kcom">💬 ${esc(e.comment)}</div>` : ''}
        <div class="ki">${e.items.map((x, i) => `<div class="kit-w"><button class="kit${x.done ? ' done' : ''}${x.cancel ? ' canc' : ''}" data-a="kItem" data-id="${e.id}" data-i="${i}" ${x.cancel ? 'disabled' : ''}><b>${x.q}×</b> ${esc(x.n)}${x.cancel ? ' <em>СКАСОВАНО</em>' : x.canc ? ` <em>−${x.canc} скас.</em>` : ''}</button><button class="kinfo" data-a="skTechOne" data-n="${esc(x.n)}" title="Техкарта">ⓘ</button></div>`).join('')}</div>
        ${(e.msgs || []).map(x => `<div class="kmsg">📨 ${x.at} ${esc(x.text)}</div>`).join('')}
        <div class="kb">${e.start ? '' : `<button class="btn" data-a="kStart" data-id="${e.id}">🔥 Готую</button>`}<button class="btn" data-a="kMsg" data-id="${e.id}">💬</button><button class="btn green" data-a="kAll" data-id="${e.id}">✅ ВСЕ ГОТОВО</button></div></div>`; };
    return `<div class="khead"><h1>👨‍🍳 Черга <span class="muted">${act0.length}</span></h1>${isCook() ? `<div class="stat tipstat">💝 Мої чайові<b class="money">${money(S.myTip?.sum || 0)}</b></div>` : ''}<div class="zp-sh">${shiftBtns()}</div><button class="btn" data-a="skTechAll">📋 Техкарти</button><button class="btn" data-a="skOffPick">🗑 Списати</button><button class="btn" data-a="view" data-v="stop">⛔ Стоп-лист</button><button class="btn" data-a="kFont">A${'+'.repeat(S.kFont - 1)}</button></div>
      <div class="kq f${S.kFont}">${act0.length ? act0.map(card).join('') : '<div class="kempty">✅ Черга порожня</div>'}</div>
      ${done.length ? `<h3 class="muted" style="margin:18px 0 8px">Останні готові</h3><div class="kdone">${done.map(e => `<div class="kd">Стіл ${e.t} · ${e.items.filter(x => !x.cancel).map(x => `${x.q}× ${esc(x.n)}`).join(', ')}${e.cancelled ? ' · ❌ скасовано' : ` · ${Math.round((e.doneAt - e.ts) / 60000)} хв`} <button class="btn sm" data-a="kUndo" data-id="${e.id}">↩️</button></div>`).join('')}</div>` : ''}`;
  }
  function stopHTML() {
    if (!S.menu) return '<div class="head"><h1>Стоп-лист</h1></div><div class="muted">Завантаження…</div>';
    const q = S.q.trim().toLowerCase();
    return `<div class="head"><h1>Стоп-лист</h1><span class="muted">Вимкнене не показується гостям і не продається</span></div>
      <input id="stopSearch" placeholder="🔎 Пошук" value="${esc(S.q)}" style="max-width:420px;margin-bottom:14px">
      ${S.menu.categories.map(c => { const its = c.items.filter(i => !q || i.name.uk.toLowerCase().includes(q)); return its.length ? `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${its.map(i => `<div class="list-row"><div class="grow">${esc(i.name.uk)}</div><button class="switch ${i.hidden ? '' : 'on'}" data-a="stopT" data-id="${i.id}" data-h="${i.hidden ? 0 : 1}"></button></div>`).join('')}</div>` : ''; }).join('')}`;
  }
  function printerHTML() { return `<div class="head"><h1>Принтер</h1></div>${printerCards()}`; }
  function printerCards() {
    const p = S.printer || {}, ok = p.seen && Date.now() - p.seen < 60e3;
    return `<div class="cards"><div class="card"><div class="big">${ok ? '✅ на звʼязку' : p.seen ? '❌ немає звʼязку' : '❌ програма друку не запущена'}</div>
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
      <div class="bal-c tot"><span>💰 Разом</span><b class="money">${money(B.total)}</b><small>${B.tipOwed ? `з них чайові ${money(B.tipOwed)} · вільних <b>${money(B.free)}</b>` : `з ${B.from ? B.from.split('-').reverse().join('.') : '—'}`}</small></div></div>` : '';
    // 1. головне: виручка за сьогодні, готівка/картка, кнопка Z
    const hero = `<div class="cash-hero on"><div class="hero-main"><div class="muted">${today}</div><div class="hero-l">Виручка за сьогодні</div><div class="hero-n money">${money(z.total)}</div>${z.tip ? `<div class="muted" style="font-size:13px">без чайових · + 💝 ${money(z.tip)} чайові персоналу</div>` : ''}
        <div class="split"><div class="bar2"><i style="width:${pc}%"></i></div><div class="split-l"><span>💵 Готівка <b class="money">${money(z.cash)}</b></span><span>💳 Картка <b class="money">${money(z.card)}</b></span></div></div></div>
      <button class="btn primary zbtn" data-a="zDay">🧾 Z-звіт<small>надрукувати й надіслати</small></button></div>`;
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
    const J = [...(r.closed || []).filter(x => !x.del && !x.rm).map(x => ({ at: x.at, ic: x.card ? '💳' : '💵', t: `Стіл ${x.t}${x.by ? ' · ' + esc(x.by) : ''}${x.disc ? ` · −${x.disc}%` : ''}${x.tip ? ` · 💝 ${money(x.tip)}` : ''}`, v: '+' + money(x.sum), cls: 'in' })),
      ...r.exp.map((e, i) => ({ at: e.at, ic: '💸', t: esc(e.note || 'Витрата') + (e.src === 'card' ? ' (картка)' : ''), v: '−' + money(e.sum), cls: 'out', del: e.del, btn: `<button class="xb" data-a="expDel" data-i="${i}">✕</button>`, back: `<button class="xb" data-a="expBack" data-i="${i}" title="Відновити">↩️</button>` })),
      ...(r.mov || []).map((m, i) => ({ at: m.at, ic: '🔁', t: MOVE[m.type] + (m.note ? ' · ' + esc(m.note) : ''), v: money(m.sum), cls: 'mv', del: m.del, btn: `<button class="xb" data-a="movDel" data-i="${i}">✕</button>`, back: `<button class="xb" data-a="movBack" data-i="${i}" title="Відновити">↩️</button>` }))]
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const journal = `<div class="card"><h3>📒 Журнал за сьогодні <span class="muted" style="font-weight:400;font-size:13px">· ${J.length}</span></h3>${J.length ? J.map(x => `<div class="jr ${x.cls}${x.del ? ' del' : ''}"><span class="muted">${x.at}</span><span>${x.ic}</span><span class="jt">${x.t}</span><b class="money">${x.v}</b>${!x.del && x.btn ? x.btn : x.del && x.back ? x.back : '<i></i>'}</div>`).join('') : '<div class="muted">Поки порожньо</div>'}</div>`;
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
    const now = new Date(Date.now() - 3 * 3600e3), day = 864e5, y = now.getFullYear(), mo = now.getMonth(); // робочий день — з 03:00 (як на сервері)
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
    const [from, to] = perRange(S.rep.p), key = from + '|' + to, [pf, pt] = prevRange(from, to), cmp = S.rep.p !== 'all';
    if (S.data.rangeKey !== key) { S.data.range = null; S.data.prev = null; S.data.rangeKey = key; renderMain(); }
    const [res, ks, prev] = await Promise.all([api('report', { from, to }).catch(() => null), api('kStats', { from, to }).catch(() => null), cmp ? api('report', { from: pf, to: pt }).catch(() => null) : null]);
    if (S.data.rangeKey !== key) return;
    S.data.kstats = ks?.list || []; S.data.prev = prev && prev.checks.length ? prev : null;
    S.data.range = res || S.data.range || { checks: [], exp: [], z: [] };
  }
  // ---------- 📊 звіти: розділи · порівняння з попереднім періодом · графіки ----------
  const SECS = [['overview', '📈 Огляд', ['overview']], ['sales', '🍽 Продажі', ['dishes', 'cats', 'groups', 'tables', 'days', 'wd']], ['staff', '👥 Персонал', ['waiters', 'tips', 'ctrl', 'kitchen']], ['money', '💰 Гроші', ['checks', 'exp', 'mov', 'z']]];
  const TABS = { dishes: '🍽 Страви', cats: '📂 Категорії', groups: '🍳 Кухня/бар', tables: '🪑 Столи', days: '📅 Дні', wd: '🗓 Дні тижня', waiters: '👤 Офіціанти', tips: '💝 Чайові', ctrl: '🕵️ Контроль', kitchen: '⏱ Кухня', checks: '🧾 Чеки', exp: '💸 Витрати', mov: '🔁 Рух коштів', z: '🔒 Z-звіти' };
  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'], wdOf = d => (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const hOrd = h => { const n = parseInt(h, 10) || 0; return n < 3 ? n + 24 : n; }; // робочий день — з 03:00: 00–02 год ідуть після 23
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const daysIn = (a, b) => { const out = []; for (let d = a; d <= b && out.length < 4000; d = addDays(d, 1)) out.push(d); return out; };
  const share = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const ACC = ['var(--accent)', 'var(--blue)', 'var(--purple)', 'var(--green)', 'var(--orange)'];
  function prevRange(from, to) { const n = daysIn(from, to).length; return [addDays(from, -n), addDays(from, -1)]; }
  // фільтри звіту → чеки з потрібними стравами (ds) і сумою (val)
  function repChecks(r) {
    const R = S.rep, dishF = R.grp || R.cat || R.q.trim(), q = R.q.trim().toLowerCase();
    const dishOk = n => { if (!dishF) return true; const x = dishOf(n); if (R.grp && x?.grp !== R.grp) return false; if (R.cat && x?.cat !== R.cat) return false; return !q || n.toLowerCase().includes(q); };
    const checks = (r?.checks || []).filter(c => (!R.pay || (R.pay === 'card' ? c.card > 0 : c.cash > 0)) && (!R.by || (c.w || c.by) === R.by || c.by === R.by) && (!R.t || String(c.t) === R.t))
      .map(c => { const ds = c.dishes.filter(([n]) => dishOk(n)); return { ...c, ds, val: dishF ? ds.reduce((a, [, , s]) => a + s, 0) : c.sum - (c.tip || 0) }; }).filter(c => !dishF || c.ds.length);
    return { checks, dishF };
  }
  function repStats(r) {
    if (!r) return null;
    const R = S.rep, { checks, dishF } = repChecks(r), sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
    const total = sum(checks, c => c.val), n = checks.length, exp = R.by || R.t || dishF || R.pay ? null : sum(r.exp, e => e.sum);
    const tipOut = sum((r.mov || []).filter(m => m.type === 'tipc' || m.type === 'tipk'), m => m.sum), salOut = sum((r.mov || []).filter(m => m.type === 'salc' || m.type === 'salk'), m => m.sum);
    return { checks, dishF, total, n, avg: n ? total / n : 0, qty: sum(checks, c => sum(c.ds, d => d[1])), cash: sum(checks, c => c.cash), card: sum(checks, c => c.card), disc: sum(checks, c => c.disc), tip: sum(checks, c => c.tip), exp, tipOut, net: exp == null ? null : total - exp - salOut, salOut }; // зарплата — теж витрата // виручка вже без чайових
  }
  const delta = (a, b, inv) => { if (b == null || !isFinite(b) || !b) return ''; const p = Math.round((a - b) / Math.abs(b) * 100); return `<em class="dl ${(inv ? -p : p) > 0 ? 'up' : (inv ? -p : p) < 0 ? 'down' : ''}" title="попередній період: ${money(b)}">${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${Math.abs(p)}%</em>`; };
  // стовпчиковий графік; pts: [підпис, значення, підказка, день для переходу]
  const colChart = pts => { const max = Math.max(1, ...pts.map(p => p[1])), step = Math.ceil(pts.length / 12);
    return `<div class="cols">${pts.map(([l, v, t, d], i) => `<div class="c${d ? ' press' : ''}"${d ? ` data-a="rDay" data-d="${d}"` : ''} title="${esc(t)}"><i style="height:${v ? Math.max(3, v / max * 86) : 0}%"></i><small>${i % step ? '' : esc(l)}</small></div>`).join('')}</div>`; };
  const barRows = (rows, unit, tot, sub) => { const max = Math.max(1, ...rows.map(x => x[1][1]));
    return rows.length ? rows.map(([k, [qq, ss]]) => `<div class="bar"><div class="bl"><span>${esc(k)}</span><span class="muted">${sub ? sub(qq, ss) : `${qq} ${unit}`}</span><span class="muted pct">${share(ss, tot)}%</span><b class="money">${money(ss)}</b></div><i style="width:${Math.max(2, ss / max * 100)}%"></i></div>`).join('') : '<div class="muted">Немає даних за цими фільтрами</div>'; };

  function reportsHTML() {
    const R = S.rep, [from, to] = perRange(R.p), r = S.data.range;
    if (!SECS.some(s => s[2].includes(R.tab))) R.tab = 'overview';
    const sec = SECS.find(s => s[2].includes(R.tab));
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    const checks0 = r ? r.checks : [];
    const waiters = [...new Set(checks0.flatMap(c => [c.w, c.by]).filter(Boolean))].sort(), tables = [...new Set(checks0.map(c => c.t))].sort((a, b) => a - b);
    const cats = S.menu ? S.menu.categories.filter(c => !R.grp || (S.groups.find(g => g.id === R.grp) || { cats: [] }).cats.includes(c.id)) : [];
    const nF = [R.pay, R.by, R.grp, R.cat, R.t, R.q.trim()].filter(Boolean).length;
    const dm = d => d.split('-').reverse().slice(0, from.slice(0, 4) === to.slice(0, 4) ? 2 : 3).join('.');
    const head = `<div class="rhead"><div><h1>Звіти</h1><span class="muted">${from === to ? dm(from) : dm(from) + ' — ' + dm(to)}${S.data.prev ? ' · порівняння з попередніми ' + daysIn(from, to).length + ' дн.' : ''}</span></div>
      <button class="btn sm ${nF ? 'primary' : ''}" data-a="rFo">⚙️ Фільтри${nF ? ` · ${nF}` : ''}</button></div>
      <div class="chips scroll">${PER.map(([k, l]) => `<button class="chip ${R.p === k ? 'on' : ''}" data-a="rp" data-p="${k}">${l}</button>`).join('')}</div>
      ${R.p === 'c' ? `<div class="frow" style="margin-top:10px"><label>З<input type="date" id="rFrom" value="${from}"></label><label>По<input type="date" id="rTo" value="${to}"></label></div>` : ''}`;
    const filters = R.fo || nF ? `<div class="filters" style="margin-top:10px">${R.fo ? `<div class="frow">
        <label>Оплата<select data-f="pay">${opt('', 'Усі', R.pay)}${opt('cash', '💵 Готівка', R.pay)}${opt('card', '💳 Карта', R.pay)}</select></label>
        <label>Офіціант<select data-f="by">${opt('', 'Усі', R.by)}${waiters.map(w => opt(w, w, R.by)).join('')}</select></label>
        <label>Група<select data-f="grp">${opt('', 'Усе', R.grp)}${S.groups.map(g => opt(g.id, g.name, R.grp)).join('')}</select></label>
        <label>Категорія<select data-f="cat">${opt('', 'Усі', R.cat)}${cats.map(c => opt(c.id, c.name.uk, R.cat)).join('')}</select></label>
        <label>Стіл<select data-f="t">${opt('', 'Усі', R.t)}${tables.map(t => opt(String(t), 'Стіл ' + t, R.t)).join('')}</select></label>
        <label>Страва<input id="rQ" placeholder="🔎 назва" value="${esc(R.q)}"></label></div>` : ''}
        ${nF ? `<div class="chips">${[R.pay && (R.pay === 'card' ? '💳 Карта' : '💵 Готівка'), R.by && '👤 ' + R.by, R.grp && (S.groups.find(g => g.id === R.grp) || {}).name, R.cat && (cats.find(c => c.id === R.cat)?.name.uk || R.cat), R.t && 'Стіл ' + R.t, R.q.trim() && '🔎 ' + R.q.trim()].filter(Boolean).map(x => `<span class="chip on sm">${esc(x)}</span>`).join('')}<button class="chip" data-a="rReset">✕ Скинути</button></div>` : ''}</div>` : '';
    if (!r) return head + filters + '<div class="muted" style="margin:16px 4px">Завантаження…</div>';

    const st = repStats(r), pv = repStats(S.data.prev), { checks, dishF } = st, gross = st.total + st.disc;
    const kpi = (l, v, raw, pr, cls) => `<div class="kpi ${cls || ''}"><span>${l}</span><b class="money">${v}</b>${pv ? delta(raw, pr) : ''}</div>`;
    const kpis = `<div class="kpis">${kpi('Виручка', money(st.total), st.total, pv?.total, 'accent')}${kpi('Чеків', st.n, st.n, pv?.n)}${kpi('Середній чек', st.n ? money(st.avg) : '—', st.avg, pv?.avg)}${st.net != null ? kpi('Чистими', money(st.net), st.net, pv?.net, 'green') : kpi('Продано позицій', st.qty, st.qty, pv?.qty)}</div>`;
    const cp = share(st.cash, st.cash + st.card);
    const pills = `<div class="pills">${!dishF ? `<div class="pill wide"><div class="psplit"><i style="width:${cp}%"></i></div><div class="psplit-l"><span>💵 Готівка <b class="money">${money(st.cash)}</b> <span class="muted">${cp}%</span></span><span>💳 Карта <b class="money">${money(st.card)}</b> <span class="muted">${st.cash + st.card ? Math.round((100 - cp) * 10) / 10 : 0}%</span></span></div></div>
      <div class="pill"><span>🏷 Знижки</span><b class="money">${money(st.disc)}</b><small>${share(st.disc, gross)}% від суми</small></div><div class="pill"><span>💝 Чайові</span><b class="money">${money(st.tip)}</b>${st.tipOut ? `<small>видано ${money(st.tipOut)}</small>` : ''}</div>` : ''}
      ${st.exp != null ? `<div class="pill"><span>💸 Витрати</span><b class="money">${money(st.exp)}</b>${pv?.exp != null ? delta(st.exp, pv.exp, 1) : ''}</div>` : ''}
      <div class="pill"><span>🍽 Позицій</span><b>${st.qty}</b><small>${st.n ? (st.qty / st.n).toFixed(1) : 0} у чеку</small></div></div>`;
    const nav = `<div class="seg rsec">${SECS.map(([k, l, tabs]) => `<button class="${sec[0] === k ? 'on' : ''}" data-a="rSec" data-s="${k}">${l}</button>`).join('')}</div>` +
      (sec[2].length > 1 ? `<div class="chips scroll sub">${sec[2].map(k => `<button class="chip ${R.tab === k ? 'on' : ''}" data-a="rTab" data-t="${k}">${TABS[k]}</button>`).join('')}</div>` : '');

    // розрізи
    const grpBy = keyF => { const m = new Map(); checks.forEach(c => { const k = keyF(c); const a = m.get(k) || [0, 0]; a[0]++; a[1] += c.val; m.set(k, a); }); return [...m]; };
    const dishAgg = keyF => { const m = new Map(); checks.forEach(c => c.ds.forEach(([nm, qq, ss]) => { const k = keyF(nm); const a = m.get(k) || [0, 0]; a[0] += qq; a[1] += ss; m.set(k, a); })); return [...m]; };
    const grpName = nm => (S.groups.find(g => g.id === dishOf(nm)?.grp) || { name: '🧩 Інше' }).name;
    const days = daysIn(from, to), byDay = new Map(grpBy(c => c.d));
    const waiterOf = c => c.w || c.by || '—';
    const T = R.tab; let body = '';
    if (T === 'overview') {
      // графік виручки: по днях (≤ 62 дні), по місяцях (довше) або по годинах (1 день)
      let chart, ctitle;
      if (days.length === 1) chart = '';
      else if (days.length <= 62) { ctitle = '📅 Виручка по днях'; chart = colChart(days.map(d => { const v = byDay.get(d) || [0, 0]; return [d.slice(8), v[1], `${WD[wdOf(d)]} ${dm(d)} · ${money(v[1])} · ${v[0]} чек.`, d]; })); }
      else { ctitle = '📅 Виручка по місяцях'; const m = new Map(); checks.forEach(c => { const k = c.d.slice(0, 7); m.set(k, (m.get(k) || 0) + c.val); }); const ms = [...new Set(days.map(d => d.slice(0, 7)))];
        chart = colChart(ms.map(k => [k.slice(5) + '.' + k.slice(2, 4), m.get(k) || 0, `${k} · ${money(m.get(k) || 0)}`])); }
      const heat = '';
      // частки кухня / бар / кальян
      const grps = dishAgg(grpName).sort((a, b) => b[1][1] - a[1][1]), gt = grps.reduce((a, x) => a + x[1][1], 0);
      const grpCard = `<div class="card"><h3>🍳 Що продаємо</h3>${grps.length ? `<div class="stack">${grps.map(([k, [, s]], i) => `<i style="width:${share(s, gt)}%;background:${ACC[i % 5]}" title="${esc(k)} ${share(s, gt)}%"></i>`).join('')}</div>
        ${grps.map(([k, [q, s]], i) => `<div class="kv"><span><i class="dot" style="background:${ACC[i % 5]}"></i>${esc(k)} <span class="muted">· ${q} шт</span></span><span><b class="money">${money(s)}</b> <span class="muted">${share(s, gt)}%</span></span></div>`).join('')}` : '<div class="muted">Немає продажів</div>'}</div>`;
      // офіціанти
      const ws = grpBy(waiterOf).sort((a, b) => b[1][1] - a[1][1]).slice(0, 6), wmax = Math.max(1, ...ws.map(x => x[1][1]));
      const wCard = `<div class="card"><h3>👤 Офіціанти</h3>${ws.length ? ws.map(([k, [q, s]], i) => `<div class="bar"><div class="bl"><span>${['🥇', '🥈', '🥉'][i] || ''} ${esc(k)}<br><small class="muted">${q} чек. · сер. чек ${money(s / q)}</small></span><b class="money">${money(s)}</b></div><i style="width:${Math.max(2, s / wmax * 100)}%"></i></div>`).join('') : '<div class="muted">Немає даних</div>'}</div>`;
      // висновки
      const best = [...byDay].sort((a, b) => b[1][1] - a[1][1])[0], bt = grpBy(c => c.t).sort((a, b) => b[1][1] - a[1][1])[0];
      const vs = (r.voids || []).filter(v => !v.table), vsum = vs.reduce((a, v) => a + v.sum, 0), ks = S.data.kstats || [];
      const ins = [best && days.length > 1 && ['🏆 Найкращий день', `${WD[wdOf(best[0])]} ${dm(best[0])}`, money(best[1][1])],
        bt && ['🪑 Найприбутковіший стіл', `Стіл ${bt[0]} · ${bt[1][0]} чек.`, money(bt[1][1])], days.length > 1 && ['📊 В середньому за день', `${(st.n / days.length).toFixed(1)} чек.`, money(st.total / days.length)],
        ['🚫 Скасування', `${vs.length} поз. · ${share(vsum, st.total + vsum)}% продажів`, money(vsum)], ks.length && ['⏱ Кухня, сер. час', `${ks.length} замовл. · понад 15 хв: ${ks.filter(x => x.mins > 15).length}`, Math.round(ks.reduce((a, x) => a + x.mins, 0) / ks.length) + ' хв']].filter(Boolean);
      const insCard = `<div class="card"><h3>💡 Висновки</h3>${ins.map(([l, s, v]) => `<div class="kv"><span>${l}<br><small class="muted">${esc(s)}</small></span><b class="money">${v}</b></div>`).join('')}</div>`;
      const top = dishAgg(nm => nm).sort((x, y) => y[1][0] - x[1][0] || y[1][1] - x[1][1]).slice(0, 10), tmax = Math.max(1, ...top.map(x => x[1][0]));
      const topCard = `<div class="card"><h3>🏆 Топ страв</h3>${top.length ? top.map(([k, [qq, ss]], i) => `<div class="bar"><div class="bl"><span>${['🥇', '🥈', '🥉'][i] || `<span class="muted">${i + 1}.</span>`} ${esc(k)}</span><b>${qq} шт</b><span class="muted money">${money(ss)}</span></div><i style="width:${Math.max(2, qq / tmax * 100)}%"></i></div>`).join('') : '<div class="muted">Ще немає продажів за цей період</div>'}</div>`;
      return head + filters + kpis + pills + nav + `<div class="dash">${chart ? `<div class="card wide"><h3>${ctitle}${days.length > 1 && days.length <= 62 ? ' <span class="muted">· натисніть день — відкриється звіт за нього</span>' : ''}</h3>${chart}</div>` : ''}${heat}${insCard}${grpCard}${topCard}${wCard}</div>`;
    }
    let rows, unit = 'чек.', sortable = false, sub;
    if (T === 'dishes') { rows = dishAgg(nm => nm); unit = 'шт'; sortable = true; }
    else if (T === 'cats') { rows = dishAgg(nm => dishOf(nm)?.cname || 'Інше'); unit = 'шт'; sortable = true; }
    else if (T === 'groups') { rows = dishAgg(grpName); unit = 'шт'; }
    else if (T === 'waiters') { rows = grpBy(waiterOf); sub = (q, s) => `${q} чек. · сер. ${money(s / q)}`; }
    else if (T === 'tips') { const m = new Map(); checks.forEach(c => Object.entries(c.tipSplit || (c.tip ? { [c.by || '—']: c.tip } : {})).forEach(([n, v]) => { const a = m.get(n) || [0, 0]; a[0]++; a[1] += v; m.set(n, a); })); rows = [...m].filter(x => x[1][1] > 0); }
    else if (T === 'days') { rows = [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [`${WD[wdOf(d)]} ${dm(d)}`, v]); }
    else if (T === 'wd') { const cnt = Array(7).fill(0); days.forEach(d => cnt[wdOf(d)]++); const m = grpBy(c => wdOf(c.d)); rows = WD.map((w, i) => [w, (m.find(x => x[0] === i) || [0, [0, 0]])[1]]).filter(x => cnt[WD.indexOf(x[0])]); sub = (q, s) => { return `${q} чек.`; };
      body = `<div class="muted" style="margin-bottom:8px">Середня виручка за один такий день — у дужках</div>`; const cntOf = w => cnt[WD.indexOf(w)]; rows = rows.map(([w, v]) => [`${w} (сер. ${money(v[1] / cntOf(w))})`, v]); }
    else if (T === 'tables') rows = grpBy(c => 'Стіл ' + c.t).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    if (rows) {
      if (!['hours', 'days', 'tables', 'wd'].includes(T)) rows.sort((a, b) => R.sort === 'q' && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const tot = rows.reduce((a, x) => a + x[1][1], 0);
      body += barRows(rows, unit, tot, sub);
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== 'q' ? 'on' : ''}" data-a="rSort" data-s="s">За сумою</button><button class="chip ${R.sort === 'q' ? 'on' : ''}" data-a="rSort" data-s="q">За кількістю</button></div>` + body;
    } else if (['checks', 'exp', 'mov', 'z'].includes(T)) {
      // 💰 Гроші: кожен запис можна видалити (🗑) і повернути (↩️) — за будь-який день
      const xb = (kind, x, back) => `<button class="xb${back ? ' back' : ''}" data-a="${back ? 'rBack' : 'rDel'}" data-k="${kind}" data-d="${x.d}" data-i="${kind === 'checks' ? esc(x.id || '') : x.i}" title="${back ? 'Повернути' : 'Видалити'}">${back ? '↩️' : '🗑'}</button>`;
      const line = (kind, x, l, v, back) => `<div class="kv rrow${back ? ' del' : ''}"><span>${l}</span><span class="kv-r"><b class="money">${v}</b>${kind !== 'checks' || x.id ? xb(kind, x, back) : ''}</span></div>`;
      const dd = d => d.slice(8) + '.' + d.slice(5, 7);
      let act = [], gone = [], empty = '';
      if (T === 'checks') { act = [...checks].reverse().slice(0, 300).map(c => line('checks', c, `${dd(c.d)} ${c.at} · стіл ${c.t} · ${esc(waiterOf(c))} ${c.card ? '💳' : '💵'}${c.disc ? ' 🏷' : ''}${c.tip ? ` · 💝 ${money(c.tip)}` : ''}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}× ${esc(nm)}`).join(', ')}</small>`, money(c.val)));
        gone = (r.removed || []).filter(x => !x.reopen).map(x => line('checks', x, `${dd(x.d)} ${x.at} · стіл ${x.t} · ${esc(x.by)} <span class="muted">· знято з виручки</span>`, money(x.sum), 1)); empty = 'Немає чеків'; }
      if (T === 'exp') { act = [...r.exp].reverse().map(e => line('exp', e, `${dd(e.d)} ${e.at} ${e.src === 'card' ? '💳' : '💵'} ${esc(e.note || 'Витрата')} <span class="muted">${esc(e.by)}</span>`, money(e.sum)));
        gone = (r.expDel || []).map(e => line('exp', e, `${dd(e.d)} ${e.at} ${esc(e.note || 'Витрата')}`, money(e.sum), 1)); empty = 'Витрат немає'; }
      if (T === 'mov') { act = [...(r.mov || [])].reverse().map(m => line('mov', m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || '')} <span class="muted">${esc(m.by || '')}</span>`, money(m.sum)));
        gone = (r.movDel || []).map(m => line('mov', m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || '')}`, money(m.sum), 1)); empty = 'Руху коштів немає'; }
      if (T === 'z') { const zl = z => `${dd(z.d)} ${new Date(z.closed).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} · ${z.checks} чек. · ${esc(z.closedBy || '')}${z.diff ? ` · <b style="color:var(--red)">різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}</b>` : ''}`;
        act = [...r.z].reverse().map(z => line('z', z, zl(z), money(z.total))); gone = (r.zDel || []).map(z => line('z', z, zl(z), money(z.total), 1)); empty = 'Z-звітів за період немає'; }
      body = (act.join('') || `<div class="muted">${empty}</div>`) + (gone.length ? `<h3 style="margin:18px 0 8px">🗑 Видалені <span class="muted">· ${gone.length} · ↩️ — повернути</span></h3>${gone.join('')}` : '');
    }
    else if (T === 'kitchen') { // ⏱ час від замовлення до «готово»
      const L = (S.data.kstats || []).filter(x => !R.t || String(x.t) === R.t), avg = l => l.length ? l.reduce((a, x) => a + x.mins, 0) / l.length : 0, f = m => m ? `${Math.round(m)} хв` : '—';
      const byD = new Map(); L.forEach(x => x.items.forEach(([n]) => { const a = byD.get(n) || []; a.push(x.mins); byD.set(n, a); }));
      const byH = new Map(); L.forEach(x => { const h = String(x.at).slice(0, 2) + ':00'; const a = byH.get(h) || []; a.push(x.mins); byH.set(h, a); });
      const row = (k, a) => `<div class="kv"><span>${esc(k)} <span class="muted">· ${a.length}</span></span><b>${f(a.reduce((s, m) => s + m, 0) / a.length)}</b></div>`;
      body = L.length ? `<div class="kpis"><div class="kpi"><span>Замовлень кухні</span><b>${L.length}</b></div><div class="kpi accent"><span>Середній час</span><b>${f(avg(L))}</b></div><div class="kpi"><span>Найдовше</span><b>${f(Math.max(...L.map(x => x.mins)))}</b></div><div class="kpi ${L.filter(x => x.mins > 15).length ? 'red' : 'green'}"><span>Понад 15 хв</span><b>${L.filter(x => x.mins > 15).length}</b></div></div>
        <h3 style="margin:16px 0 8px">По стравах (сер. час)</h3>${[...byD].sort((a, b) => b[1].length - a[1].length).slice(0, 40).map(([k, a]) => row(k, a)).join('')}
        <h3 style="margin:16px 0 8px">По годинах</h3>${[...byH].sort((a, b) => hOrd(a[0]) - hOrd(b[0])).map(([k, a]) => row(k, a)).join('')}` : '<div class="muted">Ще немає готових замовлень з кухонного екрана</div>';
    }
    else if (T === 'ctrl') { // 🕵️ контроль по офіціантах
      const vs = (r.voids || []).filter(v => (!R.by || v.by === R.by) && (!R.t || String(v.t) === R.t)), W = {};
      const w = nm => W[nm || '—'] = W[nm || '—'] || { name: nm || '—', n: 0, s: 0, vN: 0, vS: 0, tN: 0, tS: 0, dN: 0, dS: 0, dMax: 0, tip: 0 };
      checks.forEach(c => { const x = w(c.by); x.n++; x.s += c.sum; if (c.disc) { x.dN++; x.dS += c.disc; x.dMax = Math.max(x.dMax, c.pct || 0); } const tn = waiterOf(c), tv = (c.tipSplit || {})[tn] ?? (c.tipSplit ? 0 : c.tip || 0); if (tv) w(tn).tip += tv; });
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
    return head + filters + kpis + pills + nav + `<div class="card">${body}</div>`;
  }
  function menuHTML() {
    if (!S.menu) return '<div class="head"><h1>Меню</h1></div><div class="muted">Завантаження…</div>';
    return `<div class="head"><h1>Меню</h1><button class="btn" data-a="menuUndo">↩️ Відмінити останню зміну</button><button class="btn" data-a="catAdd">📂 Новий розділ</button><button class="btn primary" data-a="menuEdit" data-id="">➕ Нова страва</button></div>
      ${S.menu.categories.map(c => `<h3 class="muted" style="margin:18px 4px 8px">${esc(c.name.uk)}</h3><div class="grid2">${c.items.map(i => `<button class="list-row press" data-a="menuEdit" data-id="${i.id}" style="text-align:left"><div class="grow"><b>${esc(i.name.uk)}</b>${i.hidden ? ' ⛔' : ''}<div class="muted" style="font-size:13px">${i.variants ? i.variants.map(v => `${v.v} — ${v.p}`).join(' / ') : i.price + ' ₴'}${i.size && !i.variants ? ' · ' + esc(i.size) : ''}</div></div>›</button>`).join('')}</div>`).join('')}`;
  }
  function settingsHTML() {
    const st = S.data.staff, wf = S.data.wifi, c = st?.cfg || {};
    const ROLE = { admin: '🔐 адмін', cook: '👨‍🍳 кухар', waiter: '🧑‍🍳 офіціант' };
    const row = (l, v, btn, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ''}</span><span class="kv-r"><b>${v}</b>${btn}</span></div>`;
    const ch = (a, extra = '') => `<button class="btn sm" data-a="${a}"${extra}>змінити</button>`;
    const staff = st ? [...st.staff].sort((a, b) => (a.role || '').localeCompare(b.role || '') || a.name.localeCompare(b.name)) : null;
    const SS = [['people', '👥 Люди'], ['rules', '⚙️ Правила роботи'], ['pay', '👷 Зарплата'], ['printer', '🖨 Принтер'], ['test', '🧪 Тест']], cur = S.setTab || 'people';
    const part = {};
    part.people = `<div class="grid2 set">
      <div class="card"><h3>👥 Персонал <span class="muted">· ${staff ? staff.length : '…'}</span></h3>
        <div class="scrollbox">${staff ? staff.map(s => `<div class="kv"><span>${esc(s.name)} <span class="muted">· ${ROLE[s.role] || ROLE.waiter}</span></span><button class="btn sm red" data-a="staffDel" data-id="${s.id}">🗑</button></div>`).join('') || '<div class="muted">Ще немає</div>' : '…'}</div>
        <button class="btn sm primary" style="margin-top:10px" data-a="staffAdd">➕ Додати працівника</button></div>
      <div class="card"><h3>🆕 Коди реєстрації</h3><div class="muted set-note">Новий працівник вводить код замість PIN → пише імʼя і придумує свій PIN.</div>
        ${st?.reg ? row('🔐 Адміністратор', esc(st.reg.admin), ch('regSet', ' data-r="admin"')) + row('🧑‍🍳 Офіціант', esc(st.reg.waiter), ch('regSet', ' data-r="waiter"')) + row('👨‍🍳 Кухар', esc(st.reg.cook || '1113'), ch('regSet', ' data-r="cook"')) : '…'}</div>
      <div class="card"><h3>🤖 Увійшли в Telegram-бот</h3><div class="scrollbox">${st ? st.waiters.map(w => `<div class="kv"><span>${esc(w.name || w.uid)}</span><button class="btn sm red" data-a="wOut" data-uid="${w.uid}">Вийти</button></div>`).join('') || '<div class="muted">Нікого</div>' : '…'}</div></div>
      <div class="card"><h3>🔑 Паролі</h3><div class="muted set-note">Пароль офіціанта — вхід у бот і касу; пароль адміна — адмін-функції.</div>
        <div class="btnrow"><button class="btn sm" data-a="wPass">Пароль офіціанта</button><button class="btn sm" data-a="aPass">Пароль адміна</button></div></div></div>`;
    part.rules = `<div class="grid2 set">
      <div class="card"><h3>💰 Гроші</h3>
        ${row('🏷 Макс. знижка офіціанта', (c.discMax ?? 20) + '%', ch('cfg', ' data-k="discMax"'), 'Більшу знижку дає лише адміністратор')}
        ${row('👨‍🍳 Частка кухні від чайових', (st?.kpct ?? 20) + '%', ch('kpct'), `Плюс «подяка кухні» від гостя; порівну між кухарями на зміні${st?.cooks?.length ? ` (зараз: ${st.cooks.map(esc).join(', ')})` : ' (сьогодні ще нікого — піде в «👨‍🍳 Кухня»)'}`)}</div>
      <div class="card"><h3>👷 Зміни</h3>
        ${row('⏰ Запізнення рахується після', (c.lateMin ?? 10) + ' хв', ch('cfg', ' data-k="lateMin"'), 'Від запланованого часу початку зміни')}
        ${row('➖ Штраф за запізнення', (c.lateFine ?? 0) + ' ₴', ch('cfg', ' data-k="lateFine"'), '0 — без штрафу; адмін вирішує кнопкою «✅ + штраф»')}</div>
      <div class="card"><h3>🧮 Розрахунок</h3>
        ${row('🎯 Цільовий фудкост', (c.foodCost ?? 30) + '%', ch('cfg', ' data-k="foodCost"'), 'Собівартість ÷ ціна. За ним рахується рекомендована ціна страв')}
        ${row('🔺 Сповіщати про подорожчання від', (c.priceAlert ?? 5) + '%', ch('cfg', ' data-k="priceAlert"'), 'Якщо в накладній ціна продукту вища за минулу')}</div>
      <div class="card"><h3>📱 Замовлення гостей</h3>
        ${row('⏱ Час на замовлення після QR', (c.scanMin ?? 60) + ' хв', ch('cfg', ' data-k="scanMin"'), 'Скільки гість може замовляти після сканування QR на столі')}
        <div class="muted set-note" style="margin-top:10px">📶 Wi‑Fi закладу (запасний спосіб) · ваша мережа: ${esc(wf?.current || '…')}</div>
        <div class="scrollbox sm">${wf ? wf.list.map(x => `<div class="kv"><span>${esc(x.k)}</span><span class="muted">${new Date(x.at).toLocaleDateString('uk-UA')}</span></div>`).join('') || '<div class="muted">немає збережених адрес</div>' : ''}</div>
        <div class="btnrow"><button class="btn sm primary" data-a="wifiAdd">➕ Це наша мережа</button><button class="btn sm red" data-a="wifiClear">Скинути всі</button></div></div></div>`;
    part.printer = printerCards();
    if (cur === 'pay') part.pay = payHTML();
    part.test = `<div class="grid2 set"><div class="card"><h3>🧪 Тест</h3><div class="muted set-note">Тимчасово, до запуску.</div><button class="btn sm red" data-a="reset">♻️ Обнулити все</button></div></div>`;
    return `<div class="rhead"><div><h1>Налаштування</h1><span class="muted">персонал, коди, паролі, правила</span></div></div>
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
  function shrink(file, max = 1200, qq = .85) { // фото → JPEG до max px
    return new Promise(res => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', qq)); }; img.src = URL.createObjectURL(file); });
  }

  // ---------- 🧮 Розрахунок: склад, закупівля, накладні, техкарти, заготовки, інвентаризація, плюси / мінуси ----------
  const WHN = { k: '🍳 Кухня', b: '🍹 Бар' };
  const r3 = x => Math.round((+x || 0) * 1000) / 1000;
  const fq = (q, u) => { q = r3(q); if ((u === 'кг' || u === 'л') && q && Math.abs(q) < 1) return `${Math.round(q * 1000)} ${u === 'кг' ? 'г' : 'мл'}`; return `${String(q).replace('.', ',')} ${u}`; };
  const totQ = x => r3((x.st?.k || 0) + (x.st?.b || 0));
  const nrm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[ʼ'’`"«»().,;:!?*_/\\+-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // «250 г», «0,5», «1.5 кг», «2 шт» → в одиницях продукту
  const parseQ = (s, u) => { const m = String(s ?? '').trim().replace(',', '.').match(/^(-?\d*\.?\d+)\s*(г|гр|мл|кг|л|шт)?\.?$/i); if (!m) return NaN; let v = +m[1]; const su = (m[2] || '').toLowerCase(); if ((su === 'г' || su === 'гр') && u === 'кг') v /= 1000; if (su === 'мл' && u === 'л') v /= 1000; return r3(v); };
  const small = u => u === 'кг' ? 'г' : u === 'л' ? 'мл' : u; // грамовка в техкарті — у г / мл
  const SK_TABS = () => isCook() ? [['stock', '📦 Склад'], ['inv', '🧾 Накладні'], ['prod', '🍳 Заготовки'], ['count', '📝 Інвентаризація'], ['tech', '📋 Техкарти']]
    : [['stock', '📦 Склад'], ['buy', '🛒 Закупівля'], ['inv', '🧾 Накладні'], ['cards', '📋 Техкарти'], ['prod', '🍳 Заготовки'], ['count', '📝 Інвентаризація'], ['rep', '📊 Плюси / мінуси']];
  S.sk = { tab: 'stock', q: '', q2: '', cq: '', wh: '', cat: '', flt: '', cf: {}, cwh: 'k', p: 'w', draft: null, card: null };
  const skBusy = () => S.sk.draft || S.sk.card || (document.activeElement?.closest?.('#main') && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  async function loadCalc() {
    const K = S.sk, t = K.tab;
    if (!S.data.sk || ['stock', 'prod', 'inv', 'cards'].includes(t)) S.data.sk = await api('skData');
    if (t === 'buy') S.data.skBuy = await api('skBuy');
    if (t === 'inv' && !K.draft) S.data.skInv = await api('skInvList');
    if ((t === 'cards' || t === 'prod') && isAdmin()) { if (!S.menu) await loadMenu(); S.data.skCost = await api('skCost'); }
    if (t === 'tech') S.data.skTech = await api('skTech');
    if (t === 'count') { const [c, l] = await Promise.all([api('skCount', { wh: K.cwh }), api('skCountList')]); S.data.skCount = c; S.data.skCnts = l.list; K.cf = Object.fromEntries(Object.entries(c.draft.f || {}).map(([k, v]) => [k, String(v)])); }
    if (t === 'rep') { const [from, to] = perRange(K.p); S.data.skRep = null; renderMain(); S.data.skRep = await api('skReport', { from, to }, 30000); }
  }
  function calcHTML() {
    const K = S.sk, tabs = SK_TABS(); if (!tabs.some(x => x[0] === K.tab)) K.tab = tabs[0][0];
    const sub = { stock: 'залишки на складах Кухня і Бар', buy: 'що докупити — по постачальниках', inv: 'прихід товару: фото, код або вручну', cards: 'калькуляційні карти й собівартість страв', tech: 'склад і грамовка страв', prod: 'напівфабрикати: соуси, тісто, заготовки', count: 'перерахунок фактичних залишків', rep: 'фудкост, прибуток страв, нестачі й списання' }[K.tab];
    const head = `<div class="rhead"><div><h1>${isCook() ? '🧮 Склад' : '🧮 Розрахунок'}</h1><span class="muted">${sub}</span></div></div>
      <div class="seg rsec">${tabs.map(([k, l]) => `<button class="${K.tab === k ? 'on' : ''}" data-a="skTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    if (!S.data.sk) return head + '<div class="muted" style="margin:16px 4px">Завантаження…</div>';
    if (K.card && (K.tab === 'cards' || K.tab === 'prod')) return head + `<div class="sk">${skCardEdHTML()}</div>`;
    return head + `<div class="sk">${{ stock: skStockHTML, buy: skBuyHTML, inv: skInvHTML, cards: skCardsHTML, tech: skTechHTML, prod: skProdHTML, count: skCountHTML, rep: skRepHTML }[K.tab]()}</div>`;
  }
  // 📦 склад
  function skStockHTML() {
    const K = S.sk, D = S.data.sk, adm = isAdmin(), q = K.q.trim().toLowerCase(), live = D.ing.filter(x => !x.off);
    const list = D.ing.filter(x => (K.cat === '🗑' ? x.off : !x.off) && (!q || x.n.toLowerCase().includes(q)) && (!K.cat || K.cat === '🗑' || x.cat === K.cat) && (!K.wh || x.home === K.wh || (x.st?.[K.wh] || 0) !== 0));
    const low = live.filter(x => x.min > 0 && totQ(x) < x.min);
    const val = w => live.reduce((a, x) => a + Math.max(0, w ? x.st?.[w] || 0 : totQ(x)) * (x.cost || 0), 0);
    const cats = [...new Set(live.map(x => x.cat || 'Інше'))].sort();
    const tools = `<div class="sk-tools"><input id="skQ" placeholder="🔎 Пошук продукту" value="${esc(K.q)}">
      <div class="chips">${[['', 'Усі'], ['k', WHN.k], ['b', WHN.b]].map(([k, l]) => `<button class="chip ${K.wh === k ? 'on' : ''}" data-a="skWh" data-w="${k}">${l}</button>`).join('')}
      <select id="skCat"><option value="">Усі категорії</option>${cats.map(c => `<option ${K.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}${D.ing.some(x => x.off) ? `<option value="🗑" ${K.cat === '🗑' ? 'selected' : ''}>🗑 Сховані</option>` : ''}</select></div>
      <div class="btnrow">${adm ? '<button class="btn sm primary" data-a="skIng">➕ Продукт</button>' : ''}<button class="btn sm" data-a="skOffPick">🗑 Списати</button><button class="btn sm" data-a="skJr">📜 Рух за сьогодні</button></div></div>`;
    const pills = adm ? `<div class="pills sk-pills"><div class="pill"><span>📦 Товару на складах</span><b class="money">${money(val())}</b><small>${WHN.k} ${money(val('k'))} · ${WHN.b} ${money(val('b'))}</small></div>
      <div class="pill ${low.length ? 'bad' : ''}"><span>⚠️ Нижче мінімуму</span><b>${low.length}</b>${low.length ? '<small class="press" data-a="skTab" data-t="buy">🛒 відкрити закупівлю →</small>' : '<small>усього вистачає</small>'}</div>
      <div class="pill"><span>🧾 Продуктів</span><b>${live.length}</b><small>${live.filter(x => !x.cost).length ? `без ціни: ${live.filter(x => !x.cost).length}` : 'у всіх є ціна'}</small></div></div>`
      : low.length ? `<div class="card sk-low">⚠️ Нижче мінімуму: ${low.map(x => esc(x.n)).join(', ')}</div>` : '';
    const rowH = x => { const t = totQ(x), lo = x.min > 0 && t < x.min, both = (x.st?.k || 0) && (x.st?.b || 0);
      return `<div class="sk-row${lo ? ' low' : ''}${x.off ? ' off' : ''}"><div class="sk-n${adm ? ' press' : ''}" ${adm ? `data-a="skIng" data-id="${x.id}"` : ''}><b>${x.semi ? '🍳 ' : ''}${esc(x.n)}</b><small class="muted">${x.min ? `мін ${fq(x.min, x.u)}` : ''}${adm && x.cost ? `${x.min ? ' · ' : ''}${money(x.cost)} / ${x.u}` : ''}${adm && !x.cost ? `${x.min ? ' · ' : ''}<span class="warn">немає ціни</span>` : ''}</small></div>
        <div class="sk-q"><b class="${t < 0 ? 'neg' : ''}">${fq(t, x.u)}</b><small class="muted">${both ? `К ${fq(x.st.k, x.u)} · Б ${fq(x.st.b, x.u)}` : (x.st?.b ? WHN.b : WHN.k)}</small></div>
        <div class="sk-act">${adm ? `<button class="rb plus" data-a="skAdd" data-id="${x.id}" title="Оприбуткувати">+</button>` : ''}<button class="rb minus" data-a="skOff" data-id="${x.id}" title="Списати">−</button><button class="rb" data-a="skMv" data-id="${x.id}" title="Перемістити між складами">⇄</button></div></div>`; };
    const groups = {}; list.forEach(x => (groups[x.cat || 'Інше'] ||= []).push(x));
    const body = list.length ? Object.keys(groups).sort().map(c => `<div class="card"><h3>${esc(c)} <span class="muted">· ${groups[c].length}</span></h3>${groups[c].sort((a, b) => a.n.localeCompare(b.n)).map(rowH).join('')}</div>`).join('')
      : `<div class="card"><div class="muted">${D.ing.length ? 'Нічого не знайдено' : adm ? 'Склад порожній. Додайте продукти кнопкою «➕ Продукт» — або просто внесіть першу накладну (🧾 Накладні → 📷 Фото): продукти створяться самі.' : 'Склад ще порожній.'}</div></div>`;
    return tools + pills + `<div class="sk-list">${body}</div>`;
  }
  async function skIngEdit(id, preset = {}) {
    const D = S.data.sk, x = D.ing.find(y => y.id === id) || { n: '', u: 'кг', cat: 'Інше', home: 'k', min: 0, par: 0, loss: 0, pk: [], bc: [], ...preset };
    const body = `<div class="form">
      <label>Назва<input id="iN" value="${esc(x.n)}" placeholder="напр. Куряче філе"></label>
      <div class="frow"><label>Одиниця обліку<select id="iU">${D.units.map(u => `<option ${x.u === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label>Де зберігається<select id="iH"><option value="k" ${x.home !== 'b' ? 'selected' : ''}>${WHN.k}</option><option value="b" ${x.home === 'b' ? 'selected' : ''}>${WHN.b}</option></select></label></div>
      <label>Категорія<select id="iC">${[...new Set([...D.cats, x.cat || 'Інше'])].map(c => `<option ${x.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <div class="frow"><label>Мінімум <small>(нижче — сповіщення)</small><input id="iMin" inputmode="decimal" value="${x.min || ''}" placeholder="0"></label><label>Норма <small>(докупити до)</small><input id="iPar" inputmode="decimal" value="${x.par || ''}" placeholder="0"></label></div>
      <div class="frow"><label>% втрат при обробці <small>(чистка, варка…)</small><input id="iL" inputmode="numeric" value="${x.loss || ''}" placeholder="0"></label>
        ${x.lp ? `<label>Ціна (з накладних)<input disabled value="${money(x.cost)} / ${x.u}"></label>` : `<label>Ціна за ${x.u}, ₴ <small>(поки без накладних)</small><input id="iCost" inputmode="decimal" value="${x.cost || ''}"></label>`}</div>
      <label>Одиниці закупівлі <small>напр.: ящик=12, уп=2.5 (скільки ${x.u} в одній)</small><input id="iPk" value="${esc((x.pk || []).map(p => `${p.n}=${p.f}`).join(', '))}" placeholder="ящик=12"></label>
      <label>Штрихкоди <small>через кому — або відскануйте сканером у це поле</small><input id="iBc" value="${esc((x.bc || []).join(', '))}"></label>
      <label class="chk"><input type="checkbox" id="iS" ${x.semi ? 'checked' : ''}> 🍳 Заготовка — готуємо самі (соус, тісто…), має свою техкарту</label></div>`;
    const v = await modal({ title: x.id ? '📦 ' + x.n : '➕ Новий продукт', body, buttons: [{ label: '💾 Зберегти', val: 'save', cls: 'primary' }, ...(x.id ? [{ label: x.off ? '↩️ Повернути' : '🗑 Сховати', val: 'del', cls: x.off ? '' : 'red' }] : []), { label: 'Скасувати', val: null }], keep: true });
    if (v === 'del') { closeModal(); if (await act('skIngDel', { id: x.id, back: !!x.off }, x.off ? '↩️ Повернуто' : '🗑 Сховано')) loadView(); return null; }
    if (v !== 'save') return null;
    const num = i => +String($('#' + i)?.value || '').replace(',', '.') || 0;
    const d = { id: x.id, n: $('#iN').value, u: $('#iU').value, home: $('#iH').value, cat: $('#iC').value, min: num('iMin'), par: num('iPar'), loss: num('iL'), semi: $('#iS').checked,
      pk: $('#iPk').value.split(',').map(s => s.split(/[=:]/).map(z => z.trim())).filter(p => p[0] && +String(p[1] || '').replace(',', '.') > 0).map(([n, f]) => ({ n, f: +f.replace(',', '.') })),
      bc: $('#iBc').value.split(/[,\s]+/).filter(Boolean), ...($('#iCost') ? { cost: num('iCost'), setCost: 1 } : {}) };
    closeModal();
    const r = await act('skIngSave', { x: d }, '💾 Збережено'); if (!r) return null;
    S.data.sk = await api('skData').catch(() => S.data.sk); renderMain(); return r.x;
  }
  async function skQty(kind, id) { // add | off | mv
    const x = S.data.sk.ing.find(y => y.id === id); if (!x) return;
    const ttl = { add: '➕ Оприбуткувати', off: '➖ Списати', mv: '⇄ Перемістити' }[kind] + ' · ' + x.n;
    const dw = (x.st?.b || 0) > 0 && !((x.st?.k || 0) > 0) ? 'b' : x.home || 'k';
    const body = `<div class="form"><label>Кількість <small>${x.u === 'кг' ? 'напр. 0.5 або 500 г' : x.u === 'л' ? 'напр. 0.5 або 500 мл' : 'штук'}</small><input id="aQ" inputmode="decimal" placeholder="${x.u}"></label>
      ${kind === 'mv' ? `<label>Куди<select id="aW"><option value="k" ${dw === 'k' ? 'selected' : ''}>${WHN.k} → ${WHN.b}</option><option value="b" ${dw === 'b' ? 'selected' : ''}>${WHN.b} → ${WHN.k}</option></select></label>`
        : `<label>Склад<select id="aW">${['k', 'b'].map(w => `<option value="${w}" ${dw === w ? 'selected' : ''}>${WHN[w]} — є ${fq(x.st?.[w] || 0, x.u)}</option>`).join('')}</select></label>`}
      ${kind === 'off' ? `<div class="chips">${S.data.sk.offR.map(r => `<button class="chip" data-a="skReason" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div><input id="aN" placeholder="Причина списання">` : kind === 'add' ? '<input id="aN" placeholder="Коментар (напр. принесли без накладної)">' : ''}</div>`;
    const pm = modal({ title: ttl, body, buttons: [{ label: 'OK', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    setTimeout(() => $('#aQ')?.focus(), 60);
    if (await pm !== 'ok') return;
    const q = parseQ($('#aQ').value, x.u), wh = $('#aW')?.value, note = $('#aN')?.value?.trim() || '';
    closeModal();
    if (!(q > 0)) return toast('⚠️ Вкажіть кількість');
    if (kind === 'off' && !note) return toast('⚠️ Вкажіть причину списання');
    const r = kind === 'mv' ? await act('skMove', { id, from: wh, q }, '⇄ Переміщено') : await act('skAdj', { id, wh, q: kind === 'off' ? -q : q, note }, kind === 'off' ? '➖ Списано' : '➕ Оприбутковано');
    if (r) { S.data.sk = await api('skData').catch(() => S.data.sk); renderMain(); }
  }
  // вибір продукту зі списку (пошук)
  function skPick(title, filter = () => true) {
    return new Promise(async res => {
      if (!S.data.sk) S.data.sk = await api('skData').catch(() => null); if (!S.data.sk) return res(null);
      const all = S.data.sk.ing.filter(x => !x.off && filter(x)).sort((a, b) => a.n.localeCompare(b.n));
      const draw = q => all.filter(x => !q || x.n.toLowerCase().includes(q.toLowerCase())).slice(0, 60).map(x => `<button class="pk-i" data-pk="${x.id}">${x.semi ? '🍳 ' : ''}${esc(x.n)} <span class="muted">${fq(totQ(x), x.u)}</span></button>`).join('') || '<div class="muted">Нічого не знайдено</div>';
      modalResolve = v => { closeModal(); res(v); };
      const el = document.createElement('div'); el.className = 'modal-bg'; el.id = 'modal';
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><input id="pkQ" placeholder="🔎 Почніть вводити назву" autocomplete="off"><div class="pk-l" id="pkL">${draw('')}</div><div class="btns"><button class="btn" data-x>Скасувати</button></div></div>`;
      el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-x]')) return modalResolve(null); const p = e.target.closest('[data-pk]')?.dataset.pk; if (p) modalResolve(p); });
      el.querySelector('#pkQ').addEventListener('input', e => { el.querySelector('#pkL').innerHTML = draw(e.target.value); });
      document.body.append(el); setTimeout(() => el.querySelector('#pkQ')?.focus(), 60);
    });
  }
  async function skJournal() {
    const r = await act('skJournal', {}); if (!r) return;
    const T = { in: '🧾', add: '➕', off: '🗑', mv: '⇄', prod: '🍳', cnt: '📝' };
    const rows = [...r.list].reverse().map(x => `<div class="kv"><span>${x.at} ${T[x.t] || '•'} <b>${esc(x.n)}</b> ${x.q > 0 ? '+' : ''}${fq(x.q, x.u)} <span class="muted">· ${WHN[x.wh] || ''}${x.note ? ' · ' + esc(x.note) : ''}${x.by ? ' · ' + esc(x.by) : ''}</span></span>${isAdmin() && x.sum ? `<b class="money">${money(x.sum)}</b>` : ''}</div>`).join('');
    await modal({ title: '📜 Рух складу за сьогодні', body: `<div class="sk-jr">${rows || '<div class="muted">Сьогодні рухів ще не було (продажі за техкартами — у «📊 Плюси / мінуси»)</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] });
  }
  // 🛒 закупівля
  function skBuyHTML() {
    const B = S.data.skBuy; if (!B) return '<div class="muted">Завантаження…</div>';
    if (!B.list.length) return `<div class="card"><div class="big">✅ Усього вистачає</div><div class="muted" style="margin-top:6px">Тут з'являться продукти, яких менше за мінімум. Мінімум і норма задаються в картці продукту (📦 Склад → натисніть на назву).</div></div>`;
    return `<div class="btnrow" style="margin:0 0 12px"><button class="btn sm primary" data-a="skShare">📤 Поділитися всім списком</button></div>` + B.list.map((g, gi) => `<div class="card"><h3>🚚 ${esc(g.sup)} ${g.sum ? `<span class="muted">· ~${money(g.sum)}</span>` : ''}</h3>
      ${g.items.map(i => `<div class="kv"><span>${esc(i.n)}<br><small class="muted">є ${fq(i.have, i.u)} · мінімум ${fq(i.min, i.u)}</small></span><span class="kv-r"><b>${fq(i.need, i.u)}</b>${i.price ? `<span class="muted money">~${money(i.sum)}</span>` : ''}</span></div>`).join('')}
      <div class="btnrow"><button class="btn sm" data-a="skShare" data-g="${gi}">📤 Надіслати замовлення</button></div></div>`).join('');
  }
  async function skShare(gi) {
    const B = S.data.skBuy, gs = gi === '' || gi == null ? B.list : [B.list[+gi]];
    const text = `Замовлення VARVAR:\n${gs.map(g => `${gs.length > 1 ? `\n${g.sup}:\n` : ''}${g.items.map(i => `• ${i.n} — ${fq(i.need, i.u)}`).join('\n')}`).join('\n')}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('📋 Скопійовано — вставте в месенджер постачальнику'); } } catch {}
  }
  // 🧾 накладні
  function skInvHTML() {
    const K = S.sk; if (K.draft) return skDraftHTML();
    const I = S.data.skInv, adm = isAdmin();
    const top = `<div class="card"><h3>Нова накладна</h3>${K.busy ? '<div class="sk-busy">🔎 Розпізнаю накладну… зазвичай 10–30 секунд</div>' : `<div class="sk-new"><label class="btn primary">📷 Фото накладної<input type="file" id="skPhoto" accept="image/*" multiple hidden></label><button class="btn" data-a="skScan">🔎 Код / штрихкод</button><button class="btn" data-a="skHand">✏️ Вручну</button></div>`}
      <div class="muted" style="font-size:12px;margin-top:8px">Фото: до 3 сторінок, рівно, при гарному світлі. Розпізнає Gemini — ви перевіряєте й підтверджуєте. Фото ніде не зберігається.</div></div>`;
    if (!I) return top + '<div class="muted">Завантаження…</div>';
    const debts = Object.entries(I.sups || {}).filter(([, s]) => s.debt > 0);
    const dH = adm && debts.length ? `<div class="card"><h3>💸 Борги постачальникам <span class="muted">· ${money(debts.reduce((a, [, s]) => a + s.debt, 0))}</span></h3>${debts.map(([n, s]) => `<div class="kv"><span>${esc(n)}</span><b class="money" style="color:var(--red)">${money(s.debt)}</b></div>`).join('')}</div>` : '';
    const rows = I.list.map(x => `<div class="kv rrow${x.del ? ' del' : ''}"><span class="press" data-a="skInvView" data-id="${x.id}">${x.day.slice(8)}.${x.day.slice(5, 7)} · <b>${esc(x.sup)}</b>${x.no ? ' №' + esc(x.no) : ''}<br><small class="muted">${x.n} поз. · ${esc(x.by)}</small></span>
      <span class="kv-r">${adm && x.total != null ? `<b class="money">${money(x.total)}</b>` : ''}${x.del ? '' : x.pay === 'debt' && !x.paid ? (adm ? `<button class="btn sm red" data-a="skInvPay" data-id="${x.id}">⏳ Оплатити</button>` : '<span class="muted">⏳ не оплачено</span>') : `<span title="оплачено">${x.pay === 'card' ? '💳' : x.pay === 'cash' ? '💵' : '✅'}</span>`}${adm ? `<button class="xb" data-a="skInvDel" data-id="${x.id}" data-b="${x.del ? 1 : ''}" title="${x.del ? 'Повернути' : 'Видалити'}">${x.del ? '↩️' : '🗑'}</button>` : ''}</span></div>`).join('');
    return top + dH + `<div class="card"><h3>🧾 Накладні <span class="muted">· ${I.list.length}</span></h3>${rows || '<div class="muted">Ще немає накладних</div>'}</div>`;
  }
  const lineHint = (l, x, adm) => { if (!x && !l.add) return ''; const u = x?.u || l.add?.u || '', bq = r3((+l.q || 0) * (+l.f || 1)), up = bq && +l.sum ? +l.sum / bq : 0;
    return `= ${fq(bq, u)}${up ? ` · ${money(up)}/${u}` : ''}${adm && x?.lp && up ? (up > x.lp * 1.01 ? ` <b class="warn">↑${Math.round((up / x.lp - 1) * 100)}%</b>` : up < x.lp * 0.99 ? ` <span class="good">↓${Math.round((1 - up / x.lp) * 100)}%</span>` : '') : ''}`; };
  function skDraftHTML() {
    const d = S.sk.draft, D = S.data.sk, adm = isAdmin(), ing = D.ing.filter(x => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(ing.map(x => [x.id, x]));
    const sum = d.lines.reduce((a, l) => a + (+l.sum || 0), 0), diff = d.total ? Math.round((d.total - sum) * 100) / 100 : 0;
    const opt = l => `<option value="">— оберіть продукт —</option><option value="__new">${l.add ? `➕ Новий: ${esc(l.add.n)} (${l.add.u})` : '➕ Створити новий продукт…'}</option>${ing.map(x => `<option value="${x.id}" ${l.id === x.id ? 'selected' : ''}>${esc(x.n)} (${x.u})</option>`).join('')}`;
    const pkOpt = l => { const x = im.get(l.id), u = x?.u || l.add?.u || 'од.', pks = [{ n: u, f: 1 }, ...(x?.pk || [])]; if (l.f && !pks.some(p => p.f === +l.f)) pks.push({ n: '×' + l.f, f: +l.f }); return pks.map(p => `<option value="${p.f}" ${(+l.f || 1) === p.f ? 'selected' : ''}>${esc(p.n)}${p.f !== 1 ? ` (${p.f} ${u})` : ''}</option>`).join('') + '<option value="?">інша…</option>'; };
    const rows = d.lines.map((l, i) => { const st = l.add ? 'new' : !l.id ? 'none' : l.ok === 'guess' ? 'guess' : 'ok', x = im.get(l.id);
      return `<div class="dl ${st}"><div class="dl-src">${i + 1}. ${l.n ? esc(l.n) : '<i class="muted">новий рядок</i>'}${l.u || l.price ? ` <span class="muted">· ${esc(l.q0 ?? l.q)} ${esc(l.u || '')}${l.price ? ' × ' + l.price : ''}</span>` : ''}${st === 'guess' ? ' <span class="warn">перевірте продукт</span>' : st === 'none' ? ' <span class="warn">оберіть продукт</span>' : ''}</div>
        <div class="dl-f"><select data-dl="${i}" data-k="id">${opt(l)}</select><input data-dl="${i}" data-k="q" inputmode="decimal" value="${l.q ?? ''}" placeholder="К-сть"><select data-dl="${i}" data-k="f">${pkOpt(l)}</select><input data-dl="${i}" data-k="sum" inputmode="decimal" value="${l.sum ?? ''}" placeholder="Сума ₴"><button class="xb" data-a="skDlDel" data-i="${i}" title="Прибрати рядок">✕</button></div>
        <div class="dl-h muted" id="dlh${i}">${lineHint(l, x, adm)}</div></div>`; }).join('');
    const sups = Object.keys(S.data.skInv?.sups || {});
    return `<div class="card"><div class="rhead"><h3 style="margin:0">🧾 ${d.src === 'photo' ? 'Розпізнана накладна — перевірте' : 'Нова накладна'}</h3><button class="btn sm" data-a="skDraftX">✕ Скасувати</button></div>
      <div class="frow"><label>Постачальник<input id="dSup" list="supL" value="${esc(d.sup || '')}" data-dh="sup" placeholder="напр. Метро"><datalist id="supL">${sups.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label><label>№ документа<input id="dNo" value="${esc(d.no || '')}" data-dh="no"></label><label>Дата<input id="dDate" value="${esc(d.date || '')}" data-dh="date" placeholder="ДД.ММ.РРРР"></label></div></div>
      <div class="card"><h3>Позиції <span class="muted">· ${d.lines.length}</span> <span class="muted" style="font-weight:400;font-size:12px">🟢 впізнано · 🟡 перевірте · 🔵 новий — створиться сам</span></h3>${rows || '<div class="muted">Додайте позиції</div>'}
        <div class="btnrow"><button class="btn sm" data-a="skDlAdd">➕ Рядок</button><button class="btn sm" data-a="skScan">🔎 Сканувати штрихкод</button></div></div>
      <div class="card"><div class="kv tot"><span>Разом за позиціями</span><b class="money" id="dSum">${money(sum)}</b></div>${d.total ? `<div class="kv ${Math.abs(diff) > 1 ? 'bad' : ''}" id="dTot"><span>У документі</span><b class="money">${money(d.total)}${Math.abs(diff) > 1 ? ` · різниця ${money(diff)}` : ' ✅'}</b></div>` : ''}
        <div class="muted" style="font-size:12px;margin:10px 0 6px">Оплата:</div>
        <div class="btnrow">${isCook() ? '<button class="btn primary" data-a="skDraftSave" data-p="debt">✅ Записати (оплатить адмін)</button>' : '<button class="btn primary" data-a="skDraftSave" data-p="cash">💵 Оплачено з каси</button><button class="btn primary" data-a="skDraftSave" data-p="card">💳 Оплачено з картки</button><button class="btn" data-a="skDraftSave" data-p="debt">⏳ В борг</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">Оплачена накладна сама стане витратою в «Касі». Склад поповниться, ціни продуктів оновляться (середня ціна).</div></div>`;
  }
  const skDraftUpd = i => { const d = S.sk.draft, l = d.lines[i], x = S.data.sk.ing.find(y => y.id === l?.id); if (l && $('#dlh' + i)) $('#dlh' + i).innerHTML = lineHint(l, x, isAdmin()); const s = d.lines.reduce((a, z) => a + (+z.sum || 0), 0); if ($('#dSum')) $('#dSum').textContent = money(s); };
  async function skNewIng(n, u, home) { // новий продукт прямо з накладної / техкарти
    const D = S.data.sk, uu = /^(л|мл|l|ml)$/i.test(u || '') ? 'л' : /^(шт|уп|ящ|пач|пл|бут|бан|pcs?)\.?$/i.test(u || '') ? 'шт' : D.units.includes(u) ? u : 'кг';
    const body = `<div class="form"><label>Назва продукту<input id="nN" value="${esc(String(n || '').replace(/\s+\d+([.,]\d+)?\s*(кг|г|л|мл|шт)\.?$/i, '').trim())}"></label>
      <div class="frow"><label>Одиниця обліку<select id="nU">${D.units.map(x => `<option ${x === uu ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Склад<select id="nH"><option value="k" ${home !== 'b' ? 'selected' : ''}>${WHN.k}</option><option value="b" ${home === 'b' ? 'selected' : ''}>${WHN.b}</option></select></label></div>
      <label>Категорія<select id="nC">${D.cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>`;
    const v = await modal({ title: '➕ Новий продукт', body, buttons: [{ label: 'Додати', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const r = v === 'ok' ? { n: $('#nN').value.trim(), u: $('#nU').value, home: $('#nH').value, cat: $('#nC').value } : null; closeModal();
    return r?.n ? r : null;
  }
  async function skDraftSave(pay) {
    const d = S.sk.draft, bad = d.lines.findIndex(l => !(+l.q > 0) || (!l.id && !l.add));
    if (!d.lines.length) return toast('⚠️ Немає позицій');
    if (bad >= 0) return toast(`⚠️ Рядок ${bad + 1}: оберіть продукт і кількість (або приберіть рядок ✕)`);
    const inv = { sup: $('#dSup')?.value.trim() || d.sup, no: $('#dNo')?.value.trim() || d.no, date: $('#dDate')?.value.trim() || d.date, pay, src: d.src, lines: d.lines.map(l => ({ id: l.id || null, q: +l.q, f: +l.f || 1, sum: +l.sum || 0, src: l.n || '', ...(l.add ? { add: l.add } : {}) })) };
    const r = await act('skInvSave', { inv }, '🧾 Накладну записано'); if (!r) return;
    S.sk.draft = null; S.data.sk = null;
    if (r.alerts?.length) modal({ title: '🔺 Подорожчання', text: r.alerts.map(a => `${a.n}: ${money(a.from)} → ${money(a.to)} / ${a.u} (+${a.pct}%)`).join(' · '), buttons: [{ label: 'Зрозуміло', val: 1, cls: 'primary' }] });
    loadView();
  }
  function skAutoF(l) { const x = S.data.sk.ing.find(y => y.id === l.id); if (!x) return l.f || 1; if (l.ok === 'mem' && l.f) return l.f; const u = nrm(l.u || '');
    if (x.u === 'кг' && /^(г|гр)$/.test(u)) return 0.001; if (x.u === 'л' && u === 'мл') return 0.001; const p = u && (x.pk || []).find(p => nrm(p.n).slice(0, 2) === u.slice(0, 2)); return p ? p.f : 1; }
  async function skPhotos(files) {
    files = [...files].slice(0, 3); if (!files.length) return;
    S.sk.busy = true; renderMain();
    try {
      const images = await Promise.all(files.map(f => shrink(f, 1800, .82)));
      const r = await api('skInvParse', { images }, 75000);
      if (!S.data.sk) S.data.sk = await api('skData');
      S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: 'photo', lines: r.lines.map(l => ({ ...l, q0: l.q, f: l.add ? l.f : skAutoF(l) })) };
      if (!S.data.skInv) S.data.skInv = await api('skInvList').catch(() => null);
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
    S.sk.busy = false; renderMain();
  }
  // 🔎 код: штрихкод товару (сканер / камера) або QR накладної
  let camStop = null;
  async function skScan() {
    const pm = modal({ title: '🔎 Код / штрихкод', body: `<div class="form"><input id="scIn" placeholder="Відскануйте сканером або введіть код і Enter" autocomplete="off"><div id="scRes" class="muted"></div>
      <button class="btn" data-a="skCam">📷 Сканувати камерою</button><div id="scCam" class="sc-cam" hidden><video id="scV" playsinline muted></video></div></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Штрихкод товару — додає продукт у накладну (можна сканувати підряд). QR-код накладної — розпізнаю її вміст.</div>`, buttons: [{ label: 'Готово', val: 'ok', cls: 'primary' }], keep: true });
    setTimeout(() => $('#scIn')?.focus(), 60);
    await pm; camStop?.(); camStop = null; closeModal(); renderMain();
  }
  async function skCode(code) {
    code = String(code || '').trim(); if (!code) return;
    const res = m => { const el = $('#scRes'); if (el) el.innerHTML = m; };
    if (/^\d{6,14}$/.test(code)) {
      if (!S.data.sk) S.data.sk = await api('skData');
      const x = S.data.sk.ing.find(y => (y.bc || []).includes(code));
      if (!x) { res(`❓ Невідомий штрихкод <b>${code}</b> <button class="btn sm" data-a="skBcBind" data-c="${code}">Привʼязати до продукту</button>`); return; }
      skDraftAdd(x); res(`✅ +1 <b>${esc(x.n)}</b> (${code})`); try { navigator.vibrate?.(60); } catch {}
      return;
    }
    // не цифри — QR накладної: вміст розбирає Gemini
    camStop?.(); camStop = null; closeModal(); S.sk.tab = 'inv'; S.sk.busy = true; renderMain();
    try { const r = await api('skInvParse', { text: code }, 60000); S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: 'code', lines: r.lines.map(l => ({ ...l, q0: l.q, f: l.f || 1 })) }; }
    catch (e) { toast('⚠️ ' + errText(e.message)); }
    S.sk.busy = false; renderMain();
  }
  function skDraftAdd(x) {
    const K = S.sk; K.tab = 'inv'; K.draft ||= { sup: '', no: '', date: '', total: 0, src: 'code', lines: [] };
    const l = K.draft.lines.find(z => z.id === x.id); if (l) l.q = r3((+l.q || 0) + 1); else K.draft.lines.push({ id: x.id, n: x.n, q: 1, f: 1, sum: '', ok: 'ok' });
    if (!$('#modal')) renderMain();
  }
  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('сканер не завантажився')); document.head.append(s); });
  async function skCam() {
    const box = $('#scCam'), v = $('#scV'); if (!box || camStop) return; box.hidden = false;
    try {
      if ('BarcodeDetector' in window) {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.srcObject = st; await v.play();
        const bd = new BarcodeDetector(); let on = true, last = '', lt = 0; camStop = () => { on = false; st.getTracks().forEach(t => t.stop()); };
        const loop = async () => { if (!on) return; if (!$('#scV')) return camStop?.(); try { const r = await bd.detect(v); const t = r[0]?.rawValue; if (t && (t !== last || Date.now() - lt > 2500)) { last = t; lt = Date.now(); skCode(t); } } catch {} setTimeout(loop, 250); }; loop();
      } else {
        await loadScript('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js');
        const rd = new ZXingBrowser.BrowserMultiFormatReader(); let last = '', lt = 0;
        const c = await rd.decodeFromVideoDevice(undefined, v, r => { if (!r) return; const t = r.getText(); if (t !== last || Date.now() - lt > 2500) { last = t; lt = Date.now(); skCode(t); } });
        camStop = () => { try { c.stop(); } catch {} };
      }
    } catch (e) { toast('⚠️ Камера недоступна: ' + (e.message || e)); box.hidden = true; camStop = null; }
  }
  async function skInvView(id) {
    const r = await act('skInvGet', { id }); if (!r) return; const x = r.inv, adm = isAdmin();
    const body = `<div class="sk-jr">${x.lines.map(l => `<div class="kv"><span>${esc(l.n)}${l.src && l.src !== l.n ? `<br><small class="muted">${esc(l.src)}</small>` : ''}</span><span class="kv-r"><b>${l.f !== 1 ? `${l.q} × ${l.f} = ` : ''}${fq(l.bq, l.u)}</b>${adm && l.sum != null ? `<span class="muted money">${money(l.sum)}</span>` : ''}</span></div>`).join('')}
      ${adm ? `<div class="kv tot"><span>Разом</span><b class="money">${money(x.total)}</b></div>` : ''}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">${x.day} ${x.at} · ${esc(x.by)} · ${{ photo: '📷 з фото', code: '🔎 з коду', hand: '✏️ вручну' }[x.src] || ''} · ${x.pay === 'debt' ? (x.paid ? `оплачено ${x.paid.src === 'card' ? 'з картки' : 'з каси'}` : '⏳ не оплачено') : x.pay === 'card' ? '💳 з картки' : '💵 з каси'}${x.del ? ' · 🗑 видалена' : ''}</div>`;
    await modal({ title: `🧾 ${x.sup}${x.no ? ' №' + x.no : ''}`, body, buttons: [{ label: 'Закрити', val: null }] });
  }
  // 📋 техкарти
  function skUnitCost(id, depth = 0) {
    const x = S.data.sk.ing.find(y => y.id === id); if (!x) return 0;
    const sc = x.semi && S.data.skCost?.cards?.['semi:' + id];
    if (sc && depth < 3 && sc.yield > 0) { const c = sc.items.reduce((a, l) => a + l.q * skUnitCost(l.id, depth + 1), 0); if (c > 0) return c / sc.yield; }
    return x.cost || 0;
  }
  function skCardsHTML() {
    const K = S.sk; if (K.card) return skCardEdHTML();
    const C = S.data.skCost; if (!C) return '<div class="muted">Завантаження…</div>';
    const tgt = C.cfg.foodCost, list = C.list.filter(x => !x.tech), q = K.q2.trim().toLowerCase();
    const nNo = list.filter(x => x.cost == null).length, nHi = list.filter(x => x.fc > tgt).length, nDr = list.filter(x => x.draft).length;
    const shown = list.filter(x => (!q || x.name.toLowerCase().includes(q)) && (K.flt === 'none' ? x.cost == null : K.flt === 'hi' ? x.fc > tgt : K.flt === 'draft' ? x.draft : true));
    const wc = list.filter(x => x.cost != null && !x.draft && x.price), avg = wc.length ? Math.round(wc.reduce((a, x) => a + x.fc, 0) / wc.length * 10) / 10 : null;
    const fcc = f => f == null ? '' : f <= tgt ? 'good' : f <= tgt + 10 ? 'mid' : 'bad';
    const tools = `<div class="sk-tools"><input id="skQ2" placeholder="🔎 Пошук страви" value="${esc(K.q2)}">
      <div class="chips">${[['', `Усі · ${list.length}`], ['none', `Без техкарти · ${nNo}`], ['hi', `Фудкост > ${tgt}% · ${nHi}`], ['draft', `Чернетки AI · ${nDr}`]].map(([k, l]) => `<button class="chip ${K.flt === k ? 'on' : ''}" data-a="skFlt" data-fl="${k}">${l}</button>`).join('')}</div>
      <div class="btnrow">${nNo ? `<button class="btn sm" data-a="skAiAll">${K.aiRun ? `⏹ Зупинити (${K.aiRun})` : `✨ AI-чернетки для ${nNo} страв без техкарти`}</button>` : ''}</div></div>
      <div class="pills sk-pills"><div class="pill"><span>📋 З техкартою</span><b>${list.length - nNo} / ${list.length}</b><small>${nDr ? `чернеток: ${nDr}` : 'страв і напоїв'}</small></div><div class="pill"><span>🎯 Середній фудкост</span><b class="${fcc(avg)}">${avg == null ? '—' : avg + '%'}</b><small>ціль ${tgt}%</small></div></div>`;
    const groups = {}; shown.forEach(x => (groups[x.cname] ||= []).push(x));
    const body = Object.entries(groups).map(([c, xs]) => `<div class="card"><h3>${esc(c)}</h3>${xs.map(x => `<div class="kv press sk-cr" data-a="skCard" data-k="${esc(x.key)}"><span>${esc(x.name)}${x.draft ? ' <span class="badge-d">✨ чернетка</span>' : ''}${x.miss?.length ? `<br><small class="warn">немає ціни: ${esc(x.miss.join(', '))}</small>` : ''}</span>
      <span class="kv-r">${x.cost == null ? '<span class="muted">немає техкарти</span>' : `<span class="muted money">${money(x.cost)}</span><b class="${fcc(x.fc)}">${x.fc ?? '—'}%</b>`}<span class="money" style="min-width:64px;text-align:right">${money(x.price)}</span></span></div>`).join('')}</div>`).join('') || '<div class="card muted">Нічого не знайдено</div>';
    return tools + body;
  }
  function skCardOpen(key) {
    const C = S.data.skCost, c = C?.cards?.[key], semi = key.startsWith('semi:');
    const it = semi ? null : C.list.find(x => x.key === key), x = semi ? S.data.sk.ing.find(y => y.id === key.slice(5)) : null;
    S.sk.card = { key, name: semi ? x?.n : it?.name, price: it?.price || 0, semi, u: x?.u, out: c?.out || '', yield: c?.yield || (semi ? 1 : ''), wh: c?.wh || '', perL: !!c?.perL, draft: !!c?.draft, note: c?.note || '', items: (c?.items || []).map(l => ({ ...l })), isNew: !c, variant: key.includes('|') };
    S.sk.tab = semi ? S.sk.tab : 'cards'; renderMain(); $('#main').scrollTop = 0;
  }
  function skCardEdHTML() {
    const c = S.sk.card, D = S.data.sk, ing = D.ing.filter(x => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(D.ing.map(x => [x.id, x])), tgt = S.data.skCost?.cfg?.foodCost || 30;
    const cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0), fc = c.price ? Math.round(cost / c.price * 1000) / 10 : null, rec = cost ? Math.ceil(cost / (tgt / 100) / 5) * 5 : 0;
    const per = c.semi && +c.yield > 0 ? cost / +c.yield : null;
    const rows = c.items.map((l, i) => { const x = im.get(l.id), u = x?.u || l.add?.u || 'кг', k = u === 'шт' ? 1 : 1000, loss = l.loss ?? x?.loss ?? 0, net = (+l.q || 0) * (1 - loss / 100);
      return `<div class="cl"><select data-cl="${i}" data-k="id"><option value="">— продукт —</option><option value="__new">${l.add ? `➕ Новий: ${esc(l.add.n)}` : '➕ Новий продукт…'}</option>${ing.map(y => `<option value="${y.id}" ${l.id === y.id ? 'selected' : ''}>${y.semi ? '🍳 ' : ''}${esc(y.n)}</option>`).join('')}</select>
        <label>брутто, ${small(u)}<input data-cl="${i}" data-k="q" inputmode="decimal" value="${l.q ? r3(l.q * k) : ''}"></label><label>втрати %<input data-cl="${i}" data-k="loss" inputmode="numeric" value="${loss || ''}" placeholder="0"></label>
        <label>нетто, ${small(u)}<input data-cl="${i}" data-k="net" inputmode="decimal" value="${net ? r3(net * k) : ''}" id="cln${i}"></label>
        <span class="cl-c muted money" id="clc${i}">${x ? money((+l.q || 0) * skUnitCost(x.id)) : ''}</span><button class="xb" data-a="skClDel" data-i="${i}">✕</button></div>`; }).join('');
    return `<div class="card"><div class="rhead"><div><h3 style="margin:0">📋 ${esc(c.name || '')}</h3><span class="muted">${c.semi ? `заготовка · партія ${c.yield || 1} ${c.u || ''}` : `ціна ${money(c.price)}`}${c.draft ? ' · ✨ чернетка від AI — перевірте грамовки' : ''}</span></div><button class="btn sm" data-a="skCardX">← Назад</button></div>
      <div class="frow">${c.semi ? `<label>Вихід партії, ${esc(c.u || '')}<input data-ch="yield" inputmode="decimal" value="${c.yield || ''}"></label>` : `<label>Вихід, г / мл<input data-ch="out" inputmode="numeric" value="${c.out || ''}" placeholder="напр. 400"></label>`}
        <label>Списувати зі складу<select data-ch="wh"><option value="">авто (${c.semi ? 'де заготовка' : 'кухня — з кухні, бар — з бару'})</option><option value="k" ${c.wh === 'k' ? 'selected' : ''}>${WHN.k}</option><option value="b" ${c.wh === 'b' ? 'selected' : ''}>${WHN.b}</option></select></label>
        ${c.variant && !c.semi ? `<label class="chk"><input type="checkbox" data-ch="perL" ${c.perL ? 'checked' : ''}> на 1 л — множити на обʼєм (розливне)</label>` : ''}</div></div>
      <div class="card"><h3>Склад <span class="muted">· ${c.items.length}</span></h3>${rows || '<div class="muted">Додайте продукти або натисніть «✨ Заповнити з AI»</div>'}
        <div class="btnrow"><button class="btn sm" data-a="skClAdd">➕ Продукт</button><button class="btn sm" data-a="skCardAi">${S.sk.aiBusy ? '⏳ AI думає…' : '✨ Заповнити з AI'}</button></div></div>
      <div class="card"><div class="kv tot"><span>Собівартість ${c.semi ? 'партії' : 'порції'}</span><b class="money" id="cCost">${money(cost)}</b></div>
        ${c.semi ? `<div class="kv"><span>За 1 ${esc(c.u || '')}</span><b class="money" id="cPer">${per != null ? money(per) : '—'}</b></div>`
        : `<div class="kv"><span>Фудкост</span><b id="cFc" class="${fc == null ? '' : fc <= tgt ? 'good' : fc <= tgt + 10 ? 'mid' : 'bad'}">${fc ?? '—'}%</b></div><div class="kv"><span>Маржа з порції</span><b class="money" id="cM">${money(c.price - cost)}</b></div>
        <div class="kv"><span>Рекомендована ціна при фудкості ${tgt}%</span><b class="money" id="cRec">${rec ? money(rec) : '—'}</b></div>`}
        <div class="btnrow"><button class="btn primary" data-a="skCardSave">💾 Зберегти</button>${c.isNew ? '' : '<button class="btn red" data-a="skCardDel">🗑 Видалити техкарту</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">Брутто — скільки береться зі складу; нетто — після чистки / варки. Продаж страви списує брутто зі складу. Чернетка AI не списує, поки ви не збережете.</div></div>`;
  }
  const skCardCalc = () => { const c = S.sk.card; if (!c) return; const tgt = S.data.skCost?.cfg?.foodCost || 30, cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0);
    c.items.forEach((l, i) => { const el = $('#clc' + i); if (el && l.id) el.textContent = money((+l.q || 0) * skUnitCost(l.id)); });
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('cCost', money(cost)); if (c.semi) set('cPer', +c.yield > 0 ? money(cost / +c.yield) : '—');
    else { const fc = c.price ? Math.round(cost / c.price * 1000) / 10 : null; set('cFc', (fc ?? '—') + '%'); const el = $('#cFc'); if (el) el.className = fc == null ? '' : fc <= tgt ? 'good' : fc <= tgt + 10 ? 'mid' : 'bad'; set('cM', money(c.price - cost)); set('cRec', cost ? money(Math.ceil(cost / (tgt / 100) / 5) * 5) : '—'); } };
  async function skMakeIngs(lines) { // нові продукти (з AI / накладної) → створити, повернути id
    for (const l of lines) {
      if (l.id || !l.add) continue;
      const ex = S.data.sk.ing.find(x => !x.off && nrm(x.n) === nrm(l.add.n));
      if (ex) { l.id = ex.id; delete l.add; continue; }
      const r = await api('skIngSave', { x: { n: l.add.n, u: l.add.u, home: l.add.home || 'k', cat: l.add.cat || 'Інше', loss: l.loss || 0 } }).catch(e => ({ error: e.message }));
      if (r.x) { S.data.sk.ing.push(r.x); l.id = r.x.id; delete l.add; } else throw new Error(`«${l.add.n}»: ${r.error}`);
    }
  }
  async function skCardSave(draft = false) {
    const c = S.sk.card;
    try { await skMakeIngs(c.items); } catch (e) { return toast('⚠️ ' + e.message); }
    const items = c.items.filter(l => l.id && +l.q > 0).map(l => ({ id: l.id, q: r3(l.q), ...(l.loss != null && l.loss !== '' ? { loss: +l.loss } : {}) }));
    if (!items.length) return toast('⚠️ Додайте хоча б один продукт з кількістю');
    const card = { items, out: +c.out || 0, yield: +c.yield || 0, wh: c.wh, perL: c.perL, draft, note: c.note };
    const r = await act('skCardSave', { key: c.key, name: c.name, card }, draft ? '✨ Чернетку збережено' : '💾 Техкарту збережено'); if (!r) return;
    S.sk.card = null; S.data.sk = null; loadView();
  }
  async function skCardAi() {
    const c = S.sk.card; if (S.sk.aiBusy) return; S.sk.aiBusy = true; renderMain();
    try {
      const r = await api('skCardAi', { key: c.key, yield: c.yield }, 45000);
      c.items = r.items.map(l => ({ id: l.id, q: l.q, loss: l.loss, ...(l.id ? {} : { add: { n: l.n, u: l.u, home: S.data.sk.ing.find(x => x.id === c.key.slice(5))?.home || 'k' } }) }));
      if (!c.semi && r.out && !c.out) c.out = r.out; c.draft = true; toast('✨ Готово — перевірте грамовки і збережіть');
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
    S.sk.aiBusy = false; renderMain();
  }
  async function skAiAll() {
    const K = S.sk; if (K.aiRun) { K.aiStop = true; return; }
    const todo = S.data.skCost.list.filter(x => !x.tech && x.cost == null); if (!todo.length) return;
    if (!(await confirmBox(`✨ Скласти чернетки техкарт для ${todo.length} страв?`, 'AI запропонує склад і грамовки, нові продукти створяться самі. Чернетки не списують склад, поки ви їх не перевірите й не збережете. Займе кілька хвилин.'))) return;
    K.aiStop = false; let done = 0, fail = 0;
    for (const x of todo) {
      if (K.aiStop) break; K.aiRun = `${done + fail + 1}/${todo.length}`; if (S.view === 'calc') renderMain();
      try {
        const r = await api('skCardAi', { key: x.key }, 45000), items = r.items.map(l => ({ id: l.id, q: l.q, loss: l.loss, ...(l.id ? {} : { add: { n: l.n, u: l.u, home: ['bar', 'hookah'].includes(((S.groups || []).find(g => g.cats.includes(x.cat)) || {}).id) ? 'b' : 'k' } }) }));
        await skMakeIngs(items);
        await api('skCardSave', { key: x.key, name: x.name, card: { items: items.filter(l => l.id).map(l => ({ id: l.id, q: l.q, ...(l.loss ? { loss: l.loss } : {}) })), out: r.out || 0, draft: true } });
        done++;
      } catch { fail++; await new Promise(z => setTimeout(z, 4000)); }
    }
    K.aiRun = null; toast(`✨ Чернеток: ${done}${fail ? ` · не вдалось: ${fail}` : ''}`); S.data.sk = null; if (S.view === 'calc') loadView();
  }
  // 📋 техкарти для кухні (без грошей)
  const techCard = x => `<div class="card tech"><h3>${esc(x.name)}${x.draft ? ' <span class="badge-d">чернетка</span>' : ''}</h3>${x.out || x.size ? `<div class="muted">вихід ${x.out ? x.out + ' г' : esc(x.size)}${x.yield ? ` · партія ${x.yield}` : ''}</div>` : ''}
    ${x.items.map(l => { const net = l.q * (1 - (l.loss || 0) / 100); return `<div class="kv"><span>${esc(l.n)}</span><b>${fq(l.q, l.u)}${l.loss ? ` <small class="muted">→ ${fq(net, l.u)} нетто</small>` : ''}</b></div>`; }).join('')}${x.desc ? `<div class="muted" style="font-size:12px;margin-top:6px">${esc(x.desc)}</div>` : ''}</div>`;
  function skTechHTML() {
    const T = S.data.skTech; if (!T) return '<div class="muted">Завантаження…</div>';
    const q = S.sk.q2.trim().toLowerCase(), l = T.list.filter(x => !q || x.name.toLowerCase().includes(q));
    return `<div class="sk-tools"><input id="skQ2" placeholder="🔎 Пошук страви" value="${esc(S.sk.q2)}"></div><div class="tech-g">${l.map(techCard).join('') || '<div class="card muted">Техкарт ще немає — їх заповнює адміністратор</div>'}</div>`;
  }
  async function skTechOne(name) {
    const r = await act('skTech', { name }); const x = r?.list?.[0];
    if (!x) return toast('Для цієї страви ще немає техкарти');
    await modal({ title: '📋 Техкарта', body: techCard(x), buttons: [{ label: 'Закрити', val: null }] });
  }
  async function skTechAll() {
    const r = await act('skTech', {}); if (!r) return;
    const pm = modal({ title: '📋 Техкарти', body: `<input id="tqQ" placeholder="🔎 Пошук страви" autocomplete="off"><div class="tech-m" id="tqL">${r.list.map(techCard).join('') || '<div class="muted">Техкарт ще немає</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] });
    setTimeout(() => { const i = $('#tqQ'); i?.addEventListener('input', () => { const q = i.value.toLowerCase(); $('#tqL').innerHTML = r.list.filter(x => x.name.toLowerCase().includes(q)).map(techCard).join(''); }); }, 30);
    await pm;
  }
  // 🍳 заготовки
  function skProdHTML() {
    const D = S.data.sk, adm = isAdmin(), cards = S.data.skCost?.cards || {}, semis = D.ing.filter(x => x.semi && !x.off);
    return `<div class="btnrow" style="margin:0 0 12px">${adm ? '<button class="btn sm primary" data-a="skSemiNew">➕ Заготовка</button>' : ''}</div>` + (semis.length ? `<div class="grid2">${semis.map(x => { const c = cards['semi:' + x.id];
      return `<div class="card"><h3>🍳 ${esc(x.n)}</h3><div class="kv"><span>На складі</span><b>${fq(totQ(x), x.u)}</b></div>${adm ? `<div class="kv"><span>Собівартість</span><b class="money">${skUnitCost(x.id) ? money(skUnitCost(x.id)) + ' / ' + x.u : '—'}</b></div><div class="kv"><span>Техкарта</span><span class="${c ? '' : 'warn'}">${c ? `${c.items.length} продуктів · партія ${c.yield} ${x.u}` : 'не заповнена'}</span></div>` : ''}
        <div class="btnrow"><button class="btn sm primary" data-a="skProd" data-id="${x.id}">🍳 Приготували</button>${adm ? `<button class="btn sm" data-a="skCardSemi" data-id="${x.id}">📋 Техкарта</button>` : ''}</div></div>`; }).join('')}</div>`
      : `<div class="card muted">Заготовок ще немає. ${adm ? 'Натисніть «➕ Заготовка» (напр. «Соус зелений», л) і заповніть її техкарту: з чого й скільки виходить. Потім «🍳 Приготували» спише сировину й додасть заготовку на склад, а страви списуватимуть уже заготовку.' : 'Їх додає адміністратор.'}</div>`);
  }
  async function skProduce(id) {
    const x = S.data.sk.ing.find(y => y.id === id); if (!x) return;
    const v = await ask(`🍳 ${x.n}: скільки приготували?`, `напр. 3 (${x.u})`); if (!v) return;
    const q = parseQ(v, x.u); if (!(q > 0)) return toast('⚠️ Вкажіть кількість');
    const r = await act('skProduce', { id, q }, `🍳 +${fq(q, x.u)} ${x.n}`); if (r) { S.data.sk = null; loadView(); }
  }
  // 📝 інвентаризація
  function skCountHTML() {
    const K = S.sk, C = S.data.skCount, adm = isAdmin(); if (!C) return '<div class="muted">Завантаження…</div>';
    const wh = K.cwh, all = C.ing.filter(x => !x.off && (x.home === wh || (x.st?.[wh] || 0) !== 0)).sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.n.localeCompare(b.n));
    const q = K.cq.trim().toLowerCase(), shown = all.filter(x => !q || x.n.toLowerCase().includes(q)), n = Object.values(K.cf).filter(v => v !== '').length;
    const diffH = x => { const raw = K.cf[x.id]; if (raw == null || raw === '') return ''; const f = parseQ(raw, x.u); if (isNaN(f)) return '<span class="warn">?</span>'; const d = r3(f - (x.st?.[wh] || 0));
      return d ? `<span class="${d < 0 ? 'neg' : 'good'}">${d > 0 ? '+' : ''}${fq(d, x.u)}${adm && x.cost ? ` · ${d > 0 ? '+' : ''}${money(d * x.cost)}` : ''}</span>` : '<span class="good">✓</span>'; };
    let cat = '';
    const rows = shown.map(x => { const h = x.cat !== cat ? `<div class="cnt-cat">${esc(cat = x.cat || 'Інше')}</div>` : '';
      return h + `<div class="cnt-r"><span>${x.semi ? '🍳 ' : ''}${esc(x.n)}<br><small class="muted">система: ${fq(x.st?.[wh] || 0, x.u)}</small></span><input data-cf="${x.id}" inputmode="decimal" value="${esc(K.cf[x.id] ?? '')}" placeholder="факт, ${x.u}"><span class="cnt-d" id="cfd${x.id}">${diffH(x)}</span></div>`; }).join('');
    const hist = (S.data.skCnts || []).slice(0, 15).map(c => `<div class="kv press" data-a="skCntView" data-id="${c.id}"><span>${c.day.slice(8)}.${c.day.slice(5, 7)} · ${WHN[c.wh]} · ${esc(c.by)} <span class="muted">· ${c.n} поз.</span></span>${adm ? `<span class="kv-r"><b class="neg">${money(c.short)}</b><b class="good">+${money(c.over)}</b></span>` : ''}</div>`).join('');
    return `<div class="sk-tools">${adm ? `<div class="chips">${['k', 'b'].map(w => `<button class="chip ${wh === w ? 'on' : ''}" data-a="skCwh" data-w="${w}">${WHN[w]}</button>`).join('')}</div>` : ''}<input id="skCq" placeholder="🔎 Пошук продукту" value="${esc(K.cq)}"></div>
      <div class="card"><div class="rhead"><div><h3 style="margin:0">📝 ${WHN[wh]}: внесено ${n} з ${all.length}</h3><span class="muted">Пишіть фактичний залишок (можна «250 г»). Чернетка зберігається сама — можна рахувати з планшета частинами. Порожні рядки не змінюються.</span></div>
        <button class="btn primary" data-a="skCntFin" ${n ? '' : 'disabled'}>✅ Завершити</button></div>${rows || '<div class="muted">На цьому складі ще немає продуктів</div>'}</div>
      ${hist ? `<div class="card"><h3>Історія</h3>${hist}</div>` : ''}`;
  }
  let cfT = null; const cfPend = {};
  function skCfInput(id, v) {
    const K = S.sk, C = S.data.skCount, x = C.ing.find(y => y.id === id); K.cf[id] = v;
    const el = $('#cfd' + id); if (el && x) { const f = parseQ(v, x.u), d = r3(f - (x.st?.[K.cwh] || 0)); el.innerHTML = v === '' ? '' : isNaN(f) ? '<span class="warn">?</span>' : d ? `<span class="${d < 0 ? 'neg' : 'good'}">${d > 0 ? '+' : ''}${fq(d, x.u)}${isAdmin() && x.cost ? ` · ${d > 0 ? '+' : ''}${money(d * x.cost)}` : ''}</span>` : '<span class="good">✓</span>'; }
    cfPend[id] = v === '' ? '' : parseQ(v, x?.u); clearTimeout(cfT);
    cfT = setTimeout(async () => { const f = { ...cfPend }; Object.keys(cfPend).forEach(k => delete cfPend[k]); Object.keys(f).forEach(k => { if (Number.isNaN(f[k])) delete f[k]; }); if (Object.keys(f).length) await api('skCountSave', { wh: K.cwh, f }).catch(() => toast('⚠️ Чернетку не збережено — перевірте інтернет')); }, 1200);
  }
  async function skCntFinish() {
    const K = S.sk; clearTimeout(cfT); const f = { ...cfPend }; Object.keys(cfPend).forEach(k => delete cfPend[k]);
    if (Object.keys(f).length) await api('skCountSave', { wh: K.cwh, f }).catch(() => {});
    if (!(await confirmBox(`✅ Завершити інвентаризацію (${WHN[K.cwh]})?`, 'Залишки стануть такими, як ви внесли. Нестачі й надлишки запишуться в історію.'))) return;
    const r = await act('skCountFinish', { wh: K.cwh }, '📝 Інвентаризацію завершено'); if (!r) return;
    K.cf = {}; await skCntShow(r.doc); loadView();
  }
  async function skCntShow(d) {
    const adm = isAdmin(), ch = d.lines.filter(x => x.diff);
    await modal({ title: `📝 ${WHN[d.wh]} · ${d.day}`, body: `${adm ? `<div class="kv tot"><span>🔻 Нестача</span><b class="money neg">${money(d.short)}</b></div><div class="kv"><span>🔺 Надлишок</span><b class="money good">+${money(d.over)}</b></div>` : ''}
      <div class="sk-jr">${ch.map(x => `<div class="kv"><span>${esc(x.n)}<br><small class="muted">було ${fq(x.sys, x.u)} → факт ${fq(x.fact, x.u)}</small></span><b class="${x.diff < 0 ? 'neg' : 'good'}">${x.diff > 0 ? '+' : ''}${fq(x.diff, x.u)}${adm && x.sum != null ? ` · ${money(x.sum)}` : ''}</b></div>`).join('') || '<div class="muted">Усе збіглося ✅</div>'}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">Пораховано позицій: ${d.lines.length} · ${esc(d.by)}</div>`, buttons: [{ label: 'Закрити', val: null }] });
  }
  // 📊 плюси / мінуси
  function skRepHTML() {
    const K = S.sk, R = S.data.skRep, P = [['d', 'Сьогодні'], ['w', '7 днів'], ['30', '30 днів'], ['m', 'Цей місяць'], ['pm', 'Мин. місяць']];
    const head = `<div class="chips scroll" style="margin-bottom:12px">${P.map(([k, l]) => `<button class="chip ${K.p === k ? 'on' : ''}" data-a="skP" data-p="${k}">${l}</button>`).join('')}</div>`;
    if (!R) return head + '<div class="muted">Рахую…</div>';
    const tgt = R.foodCost, fc = R.revKnown ? Math.round(R.cogs / R.revKnown * 1000) / 10 : null, gp = R.revKnown - R.cogs, cls = f => f == null ? '' : f <= tgt ? 'good' : f <= tgt + 10 ? 'mid' : 'bad';
    const kpis = `<div class="kpis"><div class="kpi accent"><span>Виручка</span><b class="money">${money(R.revenue)}</b></div><div class="kpi"><span>Собівартість проданого</span><b class="money">${money(R.cogs)}</b>${R.revKnown < R.revenue ? `<small class="muted">з ${money(R.revKnown)} виручки страв з техкартами</small>` : ''}</div>
      <div class="kpi"><span>Фудкост <small class="muted">(ціль ${tgt}%)</small></span><b class="${cls(fc)}">${fc == null ? '—' : fc + '%'}</b></div><div class="kpi green"><span>Валовий прибуток <small class="muted">(страви з техкартами)</small></span><b class="money">${money(gp)}</b></div></div>
      <div class="pills"><div class="pill"><span>🗑 Списано</span><b class="money">${money(R.offSum)}</b></div><div class="pill"><span>📝 Інвентаризацій</span><b>${R.cnt.n}</b>${R.cnt.n ? `<small><span class="neg">${money(R.cnt.short)}</span> · <span class="good">+${money(R.cnt.over)}</span></small>` : ''}</div>
      ${R.noCard ? `<div class="pill wide"><span>⚠️ Без техкарти</span><b>${R.noCard} страв</b><small class="press" data-a="skTab" data-t="cards">їхня собівартість не врахована — заповнити →</small></div>` : ''}</div>`;
    const ME = { star: ['⭐ Зірки', 'популярні й вигідні — тримайте якість і ціну'], horse: ['🐴 Конячки', 'популярні, але мало заробляють — підніміть ціну на 5–10% або здешевіть техкарту'], puzzle: ['❓ Загадки', 'вигідні, але беруть рідко — краще місце в меню, фото, хай офіціанти радять'], dog: ['🐶 Собаки', 'і непопулярні, і невигідні — приберіть або переробіть'] };
    const me = R.rows.filter(x => x.me), meH = me.length ? `<div class="me-g">${Object.entries(ME).map(([k, [t, tip]]) => { const l = me.filter(x => x.me === k).sort((a, b) => b.q - a.q); return `<div class="card me ${k}"><h3>${t} <span class="muted">· ${l.length}</span></h3><div class="muted" style="font-size:12px;margin-bottom:6px">${tip}</div>${l.slice(0, 8).map(x => `<div class="kv"><span>${esc(x.n)}</span><span class="muted">${x.q} шт · ${money(x.cm)}/шт</span></div>`).join('') || '<div class="muted">—</div>'}</div>`; }).join('')}</div>` : '';
    const tbl = `<div class="card"><h3>🍽 Прибуток по стравах</h3><div class="sk-tbl"><div class="th"><span>Страва</span><span>Продано</span><span>Виручка</span><span>Собів./шт</span><span>Маржа</span><span>Фудкост</span></div>
      ${R.rows.slice(0, 120).map(x => `<div class="tr"><span>${esc(x.n)}${x.rec && x.fc > tgt ? `<br><small class="warn">реком. ціна ${money(x.rec)}</small>` : ''}</span><span>${x.q}</span><span class="money">${money(x.rev)}</span><span class="money">${x.unit == null ? '—' : money(x.unit)}</span><span class="money">${x.cm == null ? '—' : money(x.cm * x.q)}</span><b class="${cls(x.fc)}">${x.fc == null ? '—' : x.fc + '%'}</b></div>`).join('')}</div></div>`;
    const off = R.off.length ? `<div class="grid2"><div class="card"><h3>🗑 Списання за причинами</h3>${R.off.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b class="money">${money(v)}</b></div>`).join('')}</div><div class="card"><h3>Що списуємо найбільше</h3>${R.offIng.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b class="money">${money(v)}</b></div>`).join('')}</div></div>` : '';
    return head + kpis + meH + tbl + off;
  }

  // ---------- 👷 зміни й зарплата ----------
  const hhK = t => new Date(t).toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
  const WDL = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const curMon = () => { const d = new Date(Date.now() - 3 * 3600e3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const todayK = () => iso(Date.now() - 3 * 3600e3);
  const monAdd = (m, n) => { const [y, mo] = m.split('-').map(Number), d = new Date(y, mo - 1 + n, 15); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const MONN = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
  const monName = m => `${MONN[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const onShift = () => S.myAtt && S.myAtt.in && !S.myAtt.out;
  const shiftBtns = () => `${onShift() ? `<button class="btn sm red" data-a="zpOut">🔴 Закінчити зміну</button>` : `<button class="btn sm green" data-a="zpIn">🟢 Почати зміну</button>`}${S.myAtt?.ok === 0 ? '<span class="zp-wait">🕓 чекає ✅</span>' : ''}<button class="btn sm" data-a="zpMy">👤 Кабінет</button>`;
  const attIc = (a, p, d) => a?.ok === 1 ? (a.late ? '⏰' : a.auto ? '⚠️' : '✅') : a?.ok === 0 ? '🕓' : a?.ok === -1 ? '❌' : p && d < todayK() ? '🚫' : '';
  const hrs = a => a?.in && a?.out ? Math.round((a.out - a.in) / 360e4 * 10) / 10 : null;
  async function loadPay() { S.zpM ||= curMon(); S.data.zp = await api('zpGrid', { m: S.zpM }, 20000); }
  function payHTML() {
    const G = S.data.zp; if (!G) return '<div class="muted">Завантаження…</div>';
    const today = todayK(), people = G.staff.map(s => s.name);
    const head = `<div class="zp-top"><button class="btn sm" data-a="zpM" data-d="-1">◀</button><b>${monName(G.m)}</b><button class="btn sm" data-a="zpM" data-d="1">▶</button>
      <span class="muted">✅ був · ⏰ запізнився · 🕓 чекає підтвердження · ❌ відхилено · 🚫 прогул · ⚠️ зміну закрито автоматично · ● — у графіку (тап по клітинці — поставити / прибрати)</span></div>`;
    const grid = `<div class="zp-grid"><table><thead><tr><th></th>${G.days.map(d => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return `<th class="${d === today ? 'td' : ''}${w === 0 || w === 6 ? ' we' : ''}">${+d.slice(8)}<small>${WDL[w]}</small></th>`; }).join('')}</tr></thead>
      <tbody>${people.map(n => `<tr><th>${esc(n)}</th>${G.days.map(d => { const a = G.att[d]?.[n], p = G.plan[d]?.[n], h = hrs(a); return `<td class="press${d === today ? ' td' : ''}" data-a="zpCell" data-d="${d}" data-n="${esc(n)}"><i>${attIc(a, p, d)}</i>${p ? (p === '+' ? (a ? '' : '<i class="pl">●</i>') : `<small>${p}</small>`) : ''}${h ? `<small class="h">${h}г</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="btnrow"><button class="btn sm" data-a="zpCopy">📋 План: скопіювати минулий тиждень на цей</button></div>`;
    const due = G.rows.reduce((a, r) => a + Math.max(0, r.due), 0);
    const pills = `<div class="pills"><div class="pill"><span>💰 Виручка місяця</span><b class="money">${money(G.revenue)}</b></div><div class="pill"><span>👷 Фонд оплати праці</span><b class="money">${money(G.fund)}</b><small>${G.fundPct}% від виручки</small></div><div class="pill"><span>💸 До виплати всім</span><b class="money">${money(due)}</b></div></div>`;
    const ln = (l, v, cls = '') => `<div class="kv ${cls}"><span>${l}</span><b class="money">${v}</b></div>`;
    const cards = G.rows.map(r => { const p = r.pay || {};
      return `<div class="card"><div class="rhead"><h3 style="margin:0">${esc(r.n)} <span class="muted" style="font-weight:400">· ${r.role === 'cook' ? 'кухар' : r.role === 'admin' ? 'адмін' : 'офіціант'}</span></h3><button class="btn sm" data-a="zpSet" data-id="${r.id}">⚙️ Ставка</button></div>
        ${!p.rate && !p.pct ? '<div class="warn" style="font-size:13px">Ставку не задано — натисніть «⚙️ Ставка»</div>' : `<div class="muted" style="font-size:12px">${p.rate ? money(p.rate) + ' за зміну' : ''}${p.pct ? ` · ${p.pct}% від ${{ all: 'виручки дня', own: 'своїх чеків', kitchen: 'продажів кухні' }[p.base || 'all']}` : ''}${p.dayRev ? ` · 🎯 зміна > ${money(p.dayRev)} → +${money(p.dayBonus)}` : ''}${p.monRev ? ` · 🎯 місяць > ${money(p.monRev)} → +${money(p.monBonus)}` : ''}</div>`}
        ${ln(`Змін ${r.shifts}${r.hours ? ` · ${r.hours} год` : ''}${r.pending ? ` · <span class="warn">${r.pending} чекає ✅</span>` : ''}`, money(r.rate))}
        ${r.pct ? ln(`% від ${money(r.baseSum)}`, money(r.pct)) : ''}${r.dayB || r.monB ? ln('🎯 Бонус за план', money(r.dayB + r.monB)) : ''}${r.toMon ? `<div class="muted" style="font-size:12px">до місячного бонусу ще ${money(r.toMon)}</div>` : ''}
        ${r.bonus ? ln('➕ Премії', money(r.bonus), 'good') : ''}${r.fine ? ln('➖ Штрафи', '−' + money(r.fine), 'bad') : ''}${r.adv ? ln('💵 Аванси', '−' + money(r.adv)) : ''}${r.paid ? ln('💸 Виплачено', '−' + money(r.paid)) : ''}
        <div class="kv tot"><span>До виплати</span><b class="money">${money(r.due)}</b></div>${r.tips ? `<div class="muted" style="font-size:12px">💝 чайові до видачі окремо: ${money(r.tips)} (Каса)</div>` : ''}${r.late || r.absent ? `<div class="warn" style="font-size:12px">${r.late ? `⏰ запізнень: ${r.late}` : ''}${r.late && r.absent ? ' · ' : ''}${r.absent ? `🚫 прогулів: ${r.absent}` : ''}</div>` : ''}
        <div class="btnrow"><button class="btn sm primary" data-a="zpPay" data-n="${esc(r.n)}" data-v="${Math.max(0, r.due)}">💸 Видати</button><button class="btn sm" data-a="zpOpN" data-t="bonus" data-n="${esc(r.n)}">➕ Премія</button><button class="btn sm" data-a="zpOpN" data-t="fine" data-n="${esc(r.n)}">➖ Штраф</button><button class="btn sm" data-a="zpOpN" data-t="adv" data-n="${esc(r.n)}">💵 Аванс</button></div></div>`; }).join('');
    const sw = (G.swaps || []).map(s => `<div class="kv"><span>🔁 ${s.day.slice(8)}.${s.day.slice(5, 7)} ${s.time}: <b>${esc(s.from)}</b> → <b>${esc(s.to)}</b> <span class="muted">${s.st === 'ask' ? '· чекає згоди колеги' : '· колега погодився'}</span></span><span class="kv-r">${s.st === 'agreed' ? `<button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="ok">✅</button>` : ''}<button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">❌</button></span></div>`).join('');
    const OPN = { bonus: '➕ Премія', fine: '➖ Штраф', adv: '💵 Аванс', paid: '💸 Виплата' };
    const ops = G.ops.slice(0, 40).map(o => `<div class="kv rrow${o.del ? ' del' : ''}"><span>${o.day.slice(8)}.${o.day.slice(5, 7)} ${OPN[o.t]} · <b>${esc(o.n)}</b>${o.src ? (o.src === 'card' ? ' 💳' : ' 💵') : ''}${o.note ? ` <span class="muted">· ${esc(o.note)}</span>` : ''}</span><span class="kv-r"><b class="money">${money(o.sum)}</b><button class="xb" data-a="zpOpDel" data-id="${o.id}" data-b="${o.del ? 1 : ''}">${o.del ? '↩️' : '🗑'}</button></span></div>`).join('');
    const eff = `<div class="card"><h3>📊 Ефективність</h3><div class="sk-tbl"><div class="th zp-eff"><span>Хто</span><span>Змін</span><span>Годин</span><span>Виручка за зміну</span><span>За годину</span></div>${G.rows.filter(r => r.shifts).sort((a, b) => b.revPerShift - a.revPerShift).map(r => `<div class="tr zp-eff"><span>${esc(r.n)}</span><span>${r.shifts}</span><span>${r.hours || '—'}</span><span class="money">${money(r.revPerShift)}</span><span class="money">${r.revPerHour ? money(r.revPerHour) : '—'}</span></div>`).join('') || '<div class="muted">Ще немає підтверджених змін</div>'}</div><div class="muted" style="font-size:12px;margin-top:6px">Середня виручка закладу в дні, коли людина працювала.</div></div>`;
    return head + pills + `<div class="card">${grid}</div>` + (sw ? `<div class="card"><h3>🔁 Обміни змінами</h3>${sw}</div>` : '') + `<div class="grid2 set">${cards || '<div class="card muted">Немає персоналу</div>'}</div>` + eff + (ops ? `<div class="card"><h3>Операції за місяць</h3>${ops}</div>` : '');
  }
  async function zpCell(d, n) {
    const G = S.data.zp, a = G.att[d]?.[n], p = G.plan[d]?.[n], fine = G.cfg?.lateFine;
    // без відмітки приходу — один тап ставить / знімає людину в графіку
    if (!a) { if (await act('zpPlan', { day: d, n, time: p ? '' : '+' })) loadView(); return; }
    const info = `${d.slice(8)}.${d.slice(5, 7)} · ${n}${p && p !== '+' ? ` · план ${p}` : ''}${a?.in ? ` · прийшов ${hhK(a.in)}` : ''}${a?.out ? ` · пішов ${hhK(a.out)}${a.auto ? ' (авто)' : ''}` : ''}${a?.late ? ` · запізнення ${a.late} хв` : ''}${a?.by ? ` · ✔ ${a.by}` : ''}`;
    const opts = a?.ok === 0 ? [{ label: '✅ Підтвердити', val: 'o', cls: 'primary' }, ...(a.late && fine ? [{ label: `✅ + штраф ${fine} ₴`, val: 'f' }] : []), { label: '❌ Відхилити', val: 'n', cls: 'red' }]
      : [a?.ok === 1 ? { label: '❌ Не був (зняти)', val: 'del', cls: 'red' } : { label: '✅ Був на зміні', val: 'set', cls: 'primary' }, { label: p && p !== '+' ? `🕐 Час початку (${p})` : '🕐 Вказати час початку', val: 'plan' }, ...(p ? [{ label: '🗑 Прибрати з плану', val: 'unplan' }] : [])];
    const v = await choose('👷 Зміна', info, opts); if (!v) return;
    if (v === 'plan') { const t = await ask(`📅 ${n}, ${d.slice(8)}.${d.slice(5, 7)}: о котрій початок?`, 'напр. 10:00'); if (!t) return; if (!/^\d{1,2}:\d{2}$/.test(t.trim())) return toast('⚠️ Формат часу: 10:00'); await act('zpPlan', { day: d, n, time: t.trim() }, '📅 Заплановано'); }
    else if (v === 'unplan') await act('zpPlan', { day: d, n, time: '' }, '🗑 Прибрано');
    else await act('zpAtt', ['o', 'f', 'n'].includes(v) ? { day: d, n, how: v } : { day: d, n, set: v === 'del' ? 'del' : 'o' }, '✔ Збережено');
    loadView();
  }
  async function zpSet(id) {
    const s = S.data.zp.staff.find(x => x.id === id), p = s?.pay || {}; if (!s) return;
    const body = `<div class="form"><div class="frow"><label>Ставка за зміну, ₴<input id="zR" inputmode="numeric" value="${p.rate || ''}" placeholder="напр. 600"></label><label>% від виручки<input id="zP" inputmode="decimal" value="${p.pct || ''}" placeholder="напр. 2"></label></div>
      <label>Відсоток рахувати від<select id="zB"><option value="all" ${p.base !== 'own' && p.base !== 'kitchen' ? 'selected' : ''}>усієї виручки дня (за дні на зміні)</option><option value="own" ${p.base === 'own' ? 'selected' : ''}>своїх чеків (офіціант стола)</option><option value="kitchen" ${p.base === 'kitchen' ? 'selected' : ''}>продажів кухні</option></select></label>
      <div class="muted" style="font-size:12px">🎯 План продажів (від тієї ж бази) — необовʼязково:</div>
      <div class="frow"><label>За зміну більше, ₴<input id="zDR" inputmode="numeric" value="${p.dayRev || ''}"></label><label>→ бонус, ₴<input id="zDB" inputmode="numeric" value="${p.dayBonus || ''}"></label></div>
      <div class="frow"><label>За місяць більше, ₴<input id="zMR" inputmode="numeric" value="${p.monRev || ''}"></label><label>→ бонус, ₴<input id="zMB" inputmode="numeric" value="${p.monBonus || ''}"></label></div></div>`;
    const v = await modal({ title: `⚙️ ${s.name}: ставка`, body, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const g = i => $('#' + i).value.replace(',', '.'), pay = v === 'ok' ? { rate: g('zR'), pct: g('zP'), base: $('#zB').value, dayRev: g('zDR'), dayBonus: g('zDB'), monRev: g('zMR'), monBonus: g('zMB') } : null; closeModal();
    if (pay && await act('zpStaff', { id, pay }, '💾 Збережено')) loadView();
  }
  async function zpOpN(t, n, preset) {
    const T = { bonus: '➕ Премія', fine: '➖ Штраф', adv: '💵 Аванс', paid: '💸 Видати зарплату' }[t], money_ = t === 'adv' || t === 'paid';
    const body = `<div class="form"><label>Сума, ₴<input id="oS" inputmode="numeric" value="${preset || ''}"></label><input id="oN" placeholder="${t === 'fine' ? 'За що (напр. запізнення)' : 'Коментар'}"></div>`;
    const v = await modal({ title: `${T} · ${n}`, body, buttons: money_ ? [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З картки', val: 'card', cls: 'primary' }, { label: 'Скасувати', val: null }] : [{ label: 'OK', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const sum = v ? +$('#oS').value.replace(',', '.') : 0, note = v ? $('#oN').value.trim() : ''; closeModal();
    if (!v) return; if (!(sum > 0)) return toast('⚠️ Вкажіть суму');
    if (await act('zpOp', { n, t, sum, note, ...(money_ ? { src: v } : {}) }, money_ ? `💸 Видано ${money(sum)} ${v === 'card' ? 'з картки' : 'з каси'}` : '✔ Записано')) loadView();
  }
  async function zpMy() {
    const r = await act('zpMy', {}); if (!r) return; const w = r.row, me = S.me?.name;
    const lnx = (l, v) => `<div class="kv"><span>${l}</span><b class="money">${v}</b></div>`;
    const asks = r.swaps.filter(s => s.to === me && s.st === 'ask');
    const body = `${w ? `<div class="pills zp-my"><div class="pill"><span>Змін</span><b>${w.shifts}</b><small>${w.hours ? w.hours + ' год' : ''}</small></div><div class="pill"><span>Зароблено</span><b class="money">${money(w.earned)}</b></div><div class="pill"><span>До виплати</span><b class="money">${money(w.due)}</b></div>${w.tips ? `<div class="pill"><span>💝 Чайові</span><b class="money">${money(w.tips)}</b></div>` : ''}</div>
      ${lnx(`Ставка × ${w.shifts}`, money(w.rate))}${w.pct ? lnx('% від виручки', money(w.pct)) : ''}${w.dayB || w.monB ? lnx('🎯 Бонус за план', money(w.dayB + w.monB)) : ''}${w.bonus ? lnx('➕ Премії', money(w.bonus)) : ''}${w.fine ? lnx('➖ Штрафи', '−' + money(w.fine)) : ''}${w.adv ? lnx('💵 Аванси', '−' + money(w.adv)) : ''}${w.paid ? lnx('💸 Виплачено', '−' + money(w.paid)) : ''}
      ${w.toMon ? `<div class="muted" style="font-size:13px;margin-top:6px">🎯 До місячного бонусу ще ${money(w.toMon)}</div>` : ''}` : '<div class="muted">Ставку ще не задано</div>'}
      ${asks.map(s => `<div class="card zp-ask">🔁 <b>${esc(s.from)}</b> просить вийти за нього ${s.day.slice(8)}.${s.day.slice(5, 7)} о ${s.time}<div class="btnrow"><button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="agree">Погоджуюсь</button><button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">Ні</button></div></div>`).join('')}
      <h3 style="margin:14px 0 6px">Мій графік · ${monName(r.m)}</h3><div class="sk-jr">${r.days.map(x => `<div class="kv"><span>${x.d.slice(8)}.${x.d.slice(5, 7)} ${WDL[new Date(x.d + 'T12:00:00Z').getUTCDay()]}${x.plan ? ` <span class="muted">план ${x.plan}</span>` : ''}</span><span>${attIc(x.att, x.plan, x.d)} ${x.att?.in ? hhK(x.att.in) : ''}${x.att?.out ? '–' + hhK(x.att.out) : ''}</span></div>`).join('') || '<div class="muted">Змін ще немає</div>'}</div>
      ${r.swaps.filter(s => s.from === me).map(s => `<div class="muted" style="font-size:12px">🔁 ${s.day.slice(8)}.${s.day.slice(5, 7)} → ${esc(s.to)}: ${s.st === 'ask' ? 'чекає згоди' : 'чекає адміна'}</div>`).join('')}`;
    const v = await modal({ title: `👤 ${me}`, body, buttons: [{ label: '🔁 Попросити обмін', val: 'swap' }, { label: 'Закрити', val: null }] });
    if (v === 'swap') {
      const future = r.days.filter(x => x.plan && x.d >= todayK()); if (!future.length) return toast('У вашому плані немає майбутніх змін');
      const d = await choose('🔁 Яку зміну віддати?', '', future.map(x => ({ label: `${x.d.slice(8)}.${x.d.slice(5, 7)} ${WDL[new Date(x.d + 'T12:00:00Z').getUTCDay()]} · ${x.plan}`, val: x.d }))); if (!d) return;
      const pl = await act('zpPeople', {}); const to = pl && await choose('🔁 Кого попросити?', 'Колега погодиться у своєму кабінеті, потім підтвердить адмін', pl.list.map(n => ({ label: n, val: n }))); if (!to) return;
      await act('zpSwap', { day: d, to }, '🔁 Запит надіслано');
    }
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
      case 'more': { const v = await choose('Ще', '', (isCook() ? NAV_COOK : NAV.filter(n => (!n[3] || isAdmin()) && ['stop', 'kq', 'menu', 'calc', 'settings'].includes(n[0]))).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: '🔒 Вийти', val: 'logout', cls: 'red' }]));
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
      case 'ur': S.ur[t] = !S.ur[t]; renderSheet(); break;
      case 'kItem': { const r = await act('kDone', { id: el.dataset.id, i: +el.dataset.i }); if (r) loadKq(); break; }
      case 'kAll': { el.closest('.kc')?.classList.add('bye'); const r = await act('kDone', { id: el.dataset.id }); if (r) setTimeout(loadKq, 250); break; }
      case 'kStart': { await act('kStart', { id: el.dataset.id }); loadKq(); break; }
      case 'kUndo': { await act('kUndo', { id: el.dataset.id }, '↩️ Повернуто в чергу'); loadKq(); break; }
      case 'kMsg': { let v = await choose('Повідомлення в зал', 'Офіціанти побачать у стрічці', ['❗ Немає продукту', '⏱ Ще +10 хв', '🙋 Підійди на кухню', '🔥 Вже майже готово'].map(x => ({ label: x, val: x })).concat([{ label: '✏️ Своє…', val: 'own' }]));
        if (v === 'own') v = await ask('Повідомлення в зал', 'Напр.: замінимо фрі на пюре?'); if (v) await act('kMsg', { id: el.dataset.id, text: v }, '📨 Надіслано'); loadKq(); break; }
      case 'kFont': S.kFont = (S.kFont % 3) + 1; store.set('kfont', S.kFont); renderMain(); break;
      case 'kGo': kitchenStart(); break;
      case 'pk': { const cur = packQ(t); if (cur + +el.dataset.d >= 0) S.packAdj[t] = (S.packAdj[t] || 0) + +el.dataset.d; renderSheet(); break; }
      case 'photos': S.photos = !S.photos; store.set('photos', S.photos); renderSheet(); break;
      case 'zDay': zDay(); break;
      case 'shOpen': shOpen(); break;
      case 'shClose': shClose(); break;
      case 'rp': S.rep.p = el.dataset.p; loadView(); break;
      case 'rTab': S.rep.tab = el.dataset.t; (S.rep.last ||= {})[SECS.find(x => x[2].includes(el.dataset.t))[0]] = el.dataset.t; renderMain(); break;
      case 'rSec': { const sc = SECS.find(x => x[0] === el.dataset.s); S.rep.tab = (S.rep.last || {})[sc[0]] || sc[2][0]; renderMain(); break; }
      case 'rFo': S.rep.fo = !S.rep.fo; renderMain(); break;
      case 'rDay': Object.assign(S.rep, { p: 'c', from: el.dataset.d, to: el.dataset.d }); loadView(); $('#main').scrollTop = 0; break;
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
      case 'rDel': case 'rBack': {
        const k = el.dataset.k, d = el.dataset.d, i = el.dataset.i, del = a === 'rDel';
        if (del && !(await confirmBox(k === 'checks' ? 'Зняти чек з виручки? (можна повернути)' : 'Видалити запис? (можна повернути)'))) break;
        const op = { checks: del ? 'closedDel' : 'closedBack', exp: del ? 'expenseDel' : 'expenseBack', mov: del ? 'moveDel' : 'moveBack', z: del ? 'zDel' : 'zBack' }[k];
        if (await act(op, k === 'checks' ? { ref: i, day: d } : { i: +i, day: d }, del ? '🗑 Видалено' : '↩️ Повернуто')) { S.data.rangeKey = ''; loadView(); }
        break; }
      case 'vBack': if (await confirmBox('Повернути страву на стіл? Вона знову буде в рахунку.')) { if (await act('voidBack', { ts: +el.dataset.ts }, '↩️ Повернуто на стіл')) loadView(); } break;
      case 'setTab': S.setTab = el.dataset.s; renderMain(); if (S.setTab === 'pay') loadView(); break;
      case 'move': moveFlow(); break;
      case 'split': splitFlow(); break;
      case 'spq': { const i = +el.dataset.i, it = S.spl.items[i]; S.spl.q[i] = Math.max(0, Math.min(it.q, (S.spl.q[i] || 0) + +el.dataset.d)); splitRender(); break; }
      case 'closeT': closeFlow(); break;
      case 'delTable': { const reason = await voidReason(`Видалити весь стіл ${t}? Сума НЕ піде у виручку`); if (reason) { const r = await act('delete', { t, reason }, `🗑 Стіл ${t} видалено`); if (r) closeSheet(); } break; }
      case 'accept': act('accept', { oid: el.dataset.oid }, '✅ Прийнято — пішло на кухню'); break;
      case 'reject': if (await confirmBox('Відхилити замовлення гостя?', 'Позиції приберуться з рахунку, на кухню не піде, гість побачить «відхилено»')) { await act('reject', { oid: el.dataset.oid }, '❌ Відхилено'); loadState().catch(() => {}); } break;
      case 'cBack': if (await confirmBox('Повернути рахунок у виручку?', 'Сума, страви й чайові знову зарахуються')) { await act('closedBack', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Повернуто у виручку'); loadView(); } break;
      case 'cReopen': if (await confirmBox('Відкрити рахунок знову?', 'Він зніметься з виручки й повернеться на стіл — виправите й закриєте заново')) { const r = await act('closedReopen', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Рахунок знову на столі'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } break;
      case 'tBack': if (await confirmBox('Відновити видалений стіл?', 'Страви повернуться на стіл')) { const r = await act('tableBack', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Стіл відновлено'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } break;
      case 'movBack': await act('moveBack', { i: +el.dataset.i }, '↩️ Відновлено'); loadView(); break;
      case 'expBack': await act('expenseBack', { i: +el.dataset.i }, '↩️ Відновлено'); loadView(); break;
      case 'cPrint': act('closedPrint', { ref: el.dataset.ref, day: S.data.cday }, '🖨 Чек відправлено'); break;
      case 'cDay': { const v = +el.dataset.v, base = S.data.cday || S.data.ctoday; if (!v || !base) S.cday = ''; else { const d = new Date(base + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + v); const k = d.toISOString().slice(0, 10); S.cday = k >= S.data.ctoday ? '' : k; } S.data.closed = null; renderMain(); loadView(); break; }
      case 'cDel': if (await confirmBox('Видалити рахунок з виручки?', 'Сума, страви й замовлення віднімуться зі звітів')) await act('closedDel', { ref: el.dataset.ref, day: S.data.cday }, '🧹 Видалено з виручки'); loadView(); break;
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
      case 'cfg': { const k = el.dataset.k, L = { discMax: ['Макс. знижка офіціанта, %', 'від 0 до 100'], scanMin: ['Хвилин на замовлення після QR', 'від 10 до 600'], foodCost: ['Цільовий фудкост, %', 'від 5 до 90'], priceAlert: ['Сповіщати про подорожчання від, %', 'від 1 до 100'], lateMin: ['Запізнення — після скількох хвилин', 'від 0 до 120'], lateFine: ['Штраф за запізнення, ₴', '0 — без штрафу'] }[k]; const v = await ask(L[0], L[1], 'number'); if (v != null && v !== '') { await act('cfgSet', { k, v: +v }, '⚙️ Збережено'); loadView(); loadState().catch(() => {}); } break; }
      case 'kpct': { const v = await ask('Частка кухні від чайових, %', 'Напр. 20', 'number'); if (v != null) { await act('kitchenPct', { pct: +v }, '👨‍🍳 Збережено'); loadView(); } break; }
      case 'regSet': { const v = await ask(`Новий код реєстрації (${el.dataset.r === 'admin' ? 'адмін' : el.dataset.r === 'cook' ? 'кухар' : 'офіціант'})`, '4 цифри', 'number'); if (v) { await act('regCode', { role: el.dataset.r, code: v }, '🆕 Код змінено'); loadView(); } break; }
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
  // 👷 зміни й зарплата: кліки
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^zp/.test(el.dataset.a)) return;
    const a = el.dataset.a, D = el.dataset;
    switch (a) {
      case 'zpIn': if (await act('zpIn', {}, '🟢 Зміну почато — адмін підтвердить')) loadState().catch(() => {}); break;
      case 'zpOut': if (await confirmBox('🔴 Закінчити зміну?')) { if (await act('zpOut', {}, '🔴 Зміну закінчено')) loadState().catch(() => {}); } break;
      case 'zpMy': zpMy(); break;
      case 'zpM': S.zpM = monAdd(S.zpM || curMon(), +D.d); S.data.zp = null; renderMain(); loadView(); break;
      case 'zpCell': zpCell(D.d, D.n); break;
      case 'zpCopy': { const t = new Date(todayK() + 'T12:00:00Z'), mon = new Date(t); mon.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); const to = mon.toISOString().slice(0, 10); mon.setUTCDate(mon.getUTCDate() - 7); const from = mon.toISOString().slice(0, 10);
        if (await confirmBox('📋 Скопіювати план?', `Тиждень з ${from.slice(8)}.${from.slice(5, 7)} → тиждень з ${to.slice(8)}.${to.slice(5, 7)}`)) { const r = await act('zpPlanCopy', { from, to }); if (r) { toast(`📋 Скопійовано змін: ${r.n}`); loadView(); } } break; }
      case 'zpSet': zpSet(D.id); break;
      case 'zpPay': zpOpN('paid', D.n, D.v); break;
      case 'zpOpN': zpOpN(D.t, D.n); break;
      case 'zpOpDel': { const back = !!D.b; if (!back && !(await confirmBox('Видалити операцію?', 'Якщо це видача грошей — вони повернуться в касу / на картку. Можна відновити ↩️'))) break; if (await act('zpOpDel', { id: D.id, back, m: S.zpM }, back ? '↩️ Повернуто' : '🗑 Видалено')) loadView(); break; }
      case 'zpSw': if (await act('zpSwapStep', { id: D.id, step: D.s }, D.s === 'no' ? '❌ Відхилено' : D.s === 'agree' ? '🔁 Погоджено — чекає адміна' : '✅ Обмін підтверджено')) { closeModal(); if (S.view === 'settings') loadView(); } break;
      case 'zpConf': if (await act('zpAtt', { day: D.d, n: D.n, how: D.h }, D.h === 'n' ? '❌ Відхилено' : '✅ Підтверджено')) { loadState().catch(() => {}); if (S.view === 'settings') loadView(); } break;
    }
  });
  // 🧮 Розрахунок: кліки, введення
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^sk/.test(el.dataset.a)) return;
    const a = el.dataset.a, K = S.sk;
    switch (a) {
      case 'skTab': K.tab = el.dataset.t; K.q2 = ''; K.card = null; if (S.view !== 'calc') { S.view = 'calc'; renderNav(); } renderMain(); loadView(); $('#main').scrollTop = 0; break;
      case 'skWh': K.wh = el.dataset.w; renderMain(); break;
      case 'skIng': skIngEdit(el.dataset.id); break;
      case 'skAdd': skQty('add', el.dataset.id); break;
      case 'skOff': skQty('off', el.dataset.id); break;
      case 'skMv': skQty('mv', el.dataset.id); break;
      case 'skReason': { const i = $('#aN'); if (i) i.value = el.dataset.r; break; }
      case 'skOffPick': { const id = await skPick('🗑 Що списати?'); if (id) skQty('off', id); break; }
      case 'skJr': skJournal(); break;
      case 'skShare': skShare(el.dataset.g); break;
      case 'skHand': if (!S.data.skInv) S.data.skInv = await api('skInvList').catch(() => null); K.draft = { sup: '', no: '', date: '', total: 0, src: 'hand', lines: [{ id: null, n: '', q: '', f: 1, sum: '' }] }; renderMain(); break;
      case 'skScan': skScan(); break;
      case 'skCam': skCam(); break;
      case 'skBcBind': { const c = el.dataset.c; if (!isAdmin()) { toast('Привʼязати штрихкод може адміністратор'); break; } camStop?.(); camStop = null; modalResolve?.('ok'); await new Promise(z => setTimeout(z, 50));
        const id = await skPick(`Штрихкод ${c} — який це продукт?`); if (!id) break; const x = S.data.sk.ing.find(y => y.id === id);
        const r = await act('skIngSave', { x: { ...x, bc: [...(x.bc || []), c] } }, '🔗 Штрихкод привʼязано'); if (r) { Object.assign(x, r.x); skDraftAdd(x); renderMain(); } break; }
      case 'skDlDel': K.draft.lines.splice(+el.dataset.i, 1); renderMain(); break;
      case 'skDlAdd': K.draft.lines.push({ id: null, n: '', q: '', f: 1, sum: '' }); renderMain(); break;
      case 'skDraftX': if (await confirmBox('Скасувати накладну?', 'Внесене не збережеться')) { K.draft = null; renderMain(); loadView(); } break;
      case 'skDraftSave': skDraftSave(el.dataset.p); break;
      case 'skInvView': skInvView(el.dataset.id); break;
      case 'skInvPay': { const src = await choose('💸 Оплатити накладну', 'Звідки оплатили? Сума стане витратою в «Касі».', [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З картки', val: 'card', cls: 'primary' }]); if (src && await act('skInvPay', { id: el.dataset.id, src }, '💸 Оплачено')) loadView(); break; }
      case 'skInvDel': { const back = !!el.dataset.b; if (!back && !(await confirmBox('Видалити накладну?', 'Товар зникне зі складу, оплата — з витрат. Можна повернути ↩️.'))) break; if (await act('skInvDel', { id: el.dataset.id, back }, back ? '↩️ Повернуто' : '🗑 Видалено')) { S.data.sk = null; loadView(); } break; }
      case 'skFlt': K.flt = el.dataset.fl; renderMain(); break;
      case 'skCard': skCardOpen(el.dataset.k); break;
      case 'skCardSemi': skCardOpen('semi:' + el.dataset.id); break;
      case 'skCardX': K.card = null; renderMain(); loadView(); break;
      case 'skClAdd': K.card.items.push({ id: null, q: 0 }); renderMain(); break;
      case 'skClDel': K.card.items.splice(+el.dataset.i, 1); renderMain(); break;
      case 'skCardSave': skCardSave(false); break;
      case 'skCardDel': if (await confirmBox('Видалити техкарту?', 'Страва перестане списувати продукти')) { if (await act('skCardSave', { key: K.card.key, name: K.card.name, card: null }, '🗑 Видалено')) { K.card = null; loadView(); } } break;
      case 'skCardAi': skCardAi(); break;
      case 'skAiAll': skAiAll(); break;
      case 'skSemiNew': { const x = await skIngEdit(null, { semi: 1, cat: 'Заготовки', u: 'л' }); if (x) skCardOpen('semi:' + x.id); break; }
      case 'skProd': skProduce(el.dataset.id); break;
      case 'skCwh': K.cwh = el.dataset.w; K.cf = {}; S.data.skCount = null; renderMain(); loadView(); break;
      case 'skCntFin': skCntFinish(); break;
      case 'skCntView': { const r = await act('skCountDoc', { id: el.dataset.id }); if (r) skCntShow(r.doc); break; }
      case 'skP': K.p = el.dataset.p; loadView(); break;
      case 'skTechAll': skTechAll(); break;
      case 'skTechOne': skTechOne(el.dataset.n); break;
    }
  });
  document.addEventListener('input', e => {
    const t = e.target, K = S.sk, d = t.dataset || {};
    if (t.id === 'skQ') { K.q = t.value; renderMain(); }
    if (t.id === 'skQ2') { K.q2 = t.value; renderMain(); }
    if (t.id === 'skCq') { K.cq = t.value; renderMain(); }
    if (d.cf) skCfInput(d.cf, t.value);
    if (d.dh && K.draft) K.draft[d.dh] = t.value;
    if (d.dl != null && K.draft && t.tagName === 'INPUT') { const l = K.draft.lines[+d.dl]; if (l) { l[d.k] = t.value.replace(',', '.'); skDraftUpd(+d.dl); } }
    if (d.cl != null && K.card && t.tagName === 'INPUT') {
      const i = +d.cl, l = K.card.items[i]; if (!l) return;
      const x = S.data.sk.ing.find(y => y.id === l.id), u = x?.u || l.add?.u || 'кг', k = u === 'шт' ? 1 : 1000, v = +t.value.replace(',', '.') || 0, lo = () => +(l.loss ?? x?.loss ?? 0);
      if (d.k === 'q') { l.q = r3(v / k); const n = $('#cln' + i); if (n) n.value = l.q ? r3(l.q * (1 - lo() / 100) * k) : ''; }
      if (d.k === 'loss') { l.loss = Math.max(0, Math.min(90, v)); const n = $('#cln' + i); if (n) n.value = l.q ? r3(l.q * (1 - l.loss / 100) * k) : ''; }
      if (d.k === 'net') { const z = lo(); l.q = z < 100 ? r3(v / k / (1 - z / 100)) : 0; const qi = t.closest('.cl')?.querySelector('[data-k="q"]'); if (qi) qi.value = l.q ? r3(l.q * k) : ''; }
      skCardCalc();
    }
    if (d.ch && K.card && t.tagName === 'INPUT' && t.type !== 'checkbox') { K.card[d.ch] = t.value; skCardCalc(); }
  });
  document.addEventListener('change', async e => {
    const t = e.target, K = S.sk, d = t.dataset || {};
    if (t.id === 'skCat') { K.cat = t.value; renderMain(); }
    if (t.id === 'skPhoto') { skPhotos(t.files); t.value = ''; }
    if (d.dl != null && K.draft && t.tagName === 'SELECT') {
      const l = K.draft.lines[+d.dl]; if (!l) return;
      if (d.k === 'id') { if (t.value === '__new') { const a = await skNewIng(l.n, l.u, 'k'); if (a) { l.add = a; l.id = null; } } else { l.id = t.value || null; delete l.add; if (l.id) { l.ok = 'ok'; l.f = skAutoF(l); } } renderMain(); }
      if (d.k === 'f') { if (t.value === '?') { const v = await ask('Скільки одиниць складу в одній одиниці з накладної?', 'напр. 12 (шт у ящику) або 2.5 (кг в упаковці)'); const f = +String(v || '').replace(',', '.'); if (f > 0) l.f = f; renderMain(); } else { l.f = +t.value; skDraftUpd(+d.dl); } }
    }
    if (d.cl != null && K.card && t.tagName === 'SELECT') { const l = K.card.items[+d.cl]; if (!l) return; if (t.value === '__new') { const a = await skNewIng('', 'кг', 'k'); if (a) { l.add = a; l.id = null; } } else { l.id = t.value || null; delete l.add; const x = S.data.sk.ing.find(y => y.id === l.id); if (x && l.loss == null && x.loss) l.loss = x.loss; } renderMain(); }
    if (d.ch && K.card && (t.tagName === 'SELECT' || t.type === 'checkbox')) { K.card[d.ch] = t.type === 'checkbox' ? t.checked : t.value; renderMain(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'scIn') { e.preventDefault(); const v = e.target.value; e.target.value = ''; skCode(v); } });
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
    document.body.classList.toggle('cook', isCook());
    if (isCook()) { S.view = 'kq'; renderNav(); loadKq().catch(() => {}); kitchenGate(); }
  }
  if (S.token) start(); else showLogin();
})();
