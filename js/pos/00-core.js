  // 🏪 заклад: ?v=<заклад> (з кабінету власника) запам'ятовується на цьому пристрої; без нього — VARVAR
  // параметр саме ?venue= (?v= у старих посиланнях — це номер версії для оновлення!); назва закладу обов'язково з літерою
  const okV = x => /^(?=.*[a-z])[a-z0-9][a-z0-9-]{1,30}$/.test(x || '') && x !== 'varvar';
  const VENUE = (() => { const seg = /(^|\.)posatom\.online$/.test(location.hostname) ? location.pathname.split('/')[1] : null; if (seg != null) return okV(seg) ? seg : ''; /* 🌐 posatom.online/<заклад>/pos.html */ const q = new URLSearchParams(location.search).get('venue'); try { if (q != null) { if (okV(q)) localStorage.setItem('pos_venue2', q); else localStorage.removeItem('pos_venue2'); } localStorage.removeItem('pos_venue'); const s = localStorage.getItem('pos_venue2') || ''; if (s && !okV(s)) { localStorage.removeItem('pos_venue2'); return ''; } return s; } catch { return okV(q) ? q : ''; } })();
  const API = (new URLSearchParams(location.search).get('api') || (/workers\.dev$/.test(location.hostname) ? location.origin : 'https://varvar-menu.varvar.workers.dev')) + (VENUE ? '/v/' + VENUE : '');
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tn = t => +t > 2000 ? 'С‑' + (t - 2000) : +t > 1000 ? 'Д‑' + (t - 1000) : t; // 🛵 віртуальні столи доставки / самовивозу
  const money = n => `${Math.round(n || 0).toLocaleString('uk-UA')} ₴`;
  const store = { get(k, d) { try { const v = localStorage.getItem('pos_' + (VENUE ? VENUE + '_' : '') + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('pos_' + (VENUE ? VENUE + '_' : '') + k, JSON.stringify(v)); } catch {} } };
  // 👑 вхід з кабінету власника: #tok=…&me=… (у якорі — не йде на сервер і в історію)
  const OPEN_SET = new URLSearchParams(location.hash.slice(1)).get('set') || ''; // 👑 з кабінету: одразу відкрити вкладку налаштувань (напр. повний редактор сайту)
  { const h = new URLSearchParams(location.hash.slice(1)); if (/^[a-f0-9]{32}$/.test(h.get('tok') || '')) { try { store.set('token', h.get('tok')); store.set('me', JSON.parse(h.get('me') || 'null')); } catch {} history.replaceState(null, '', location.pathname + location.search); } }
  const hhmm = t => new Date(t).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  const S = {
    token: store.get('token', ''), me: store.get('me', null), view: 'hall', n: 15, tables: {}, events: [], printer: {}, menu: null,
    tw: {}, packAdj: {}, open: 0, carts: store.get('carts', {}), coms: {}, grp: store.get('grp', ''), cat: '', q: '', fav: [], groups: [], photos: store.get('photos', true), shift: null, shown: new Set(), rep: { p: 'd', pay: '', by: '', grp: '', cat: '', t: '', q: '', tab: 'overview', sort: 's', fo: false }, mobileMenu: false, data: {}, kq: [], kqSeen: null, kqCanc: new Set(), ur: {}, kFont: store.get('kfont', 1), seen: new Set(), ready: false, live: false,
  };
  // 🏪 бренд закладу (лого й назва) — приходить разом зі state, пам'ятається для вікна входу; VARVAR — свій логотип
  S.brand = store.get('brand', null);
  const brandIni = () => esc((S.brand?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const brandImg = () => S.brand?.logo ? `<img class="own" src="${esc(S.brand.logo)}" alt="" onerror="this.outerHTML='<b class=&quot;brand-t&quot;>${brandIni()}</b>'">` : !VENUE ? '<img src="printer/logo.png" alt="VARVAR">' : `<b class="brand-t">${brandIni()}</b>`;
  function applyBrand() {
    const nm = S.brand?.name || (VENUE ? '' : 'VARVAR'); document.title = (nm ? nm + ' — ' : '') + 'каса';
    const li = $('.logo-img'); if (li) { if (S.brand?.logo) { li.src = S.brand.logo; li.classList.add('own'); li.hidden = false; } else if (VENUE) li.hidden = true; }
    const sub = $('#loginBrand'); if (sub) sub.textContent = VENUE || S.brand?.logo ? nm : '';
  }
  applyBrand();
  const isAdmin = () => S.me?.role === 'admin', isCook = () => S.me?.role === 'cook', isCour = () => S.me?.role === 'courier';
  const setHTML = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } };

  // ---------- API ----------
  // 📴 офлайн: замовлення й закриття без зв'язку стають у чергу на пристрої (з qid — сервер не виконає двічі) і відправляються, щойно зв'язок повернеться
  const QOPS = new Set(['order', 'close']), qidNew = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const offQ = () => store.get('offq', []), offSave = q => { store.set('offq', q); offBanner(); };
  const netErr = e => e instanceof TypeError || /не відповідає|fetch|network|load failed/i.test(e?.message || '');
  function offBanner() {
    const n = offQ().length; let el = $('#offq'); if (!n && !S.offline) { el?.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'offq'; document.body.append(el); }
    el.textContent = `📴 ${S.offline ? 'Немає зв\'язку з сервером' : 'Відправляю…'}${n ? ` · у черзі ${n} ${n === 1 ? 'дія' : n < 5 ? 'дії' : 'дій'} — відправимо самі` : ''}`;
  }
  let flushing = false;
  async function offFlush() {
    if (flushing || !offQ().length || !S.token) return; flushing = true;
    try {
      for (const x of offQ()) {
        let r; try { r = await withTimeout(fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op: x.op, ...x.data }) }), 10000); } catch (e) { S.offline = true; offBanner(); return; }
        S.offline = false;
        if (r.status === 401 || r.status >= 500) { offBanner(); return; } // не увійшли / сервер оновлюється — дія лишається в черзі, спробуємо пізніше
        offSave(offQ().filter(y => y.data.qid !== x.data.qid));
        if (!r.ok) { const j = await r.json().catch(() => ({})); toast(`⚠️ З черги не пройшло (${x.op === 'close' ? 'закриття' : 'замовлення'} стіл ${tn(x.data.t)}): ${errText(j.error || r.status)}`); }
      }
      toast('📶 Зв\'язок є — черга відправлена'); loadState().catch(() => {});
    } finally { flushing = false; offBanner(); }
  }
  addEventListener('online', () => offFlush()); setInterval(() => { if (offQ().length) offFlush(); }, 20000); // перевірка — лише коли є черга
  async function api(op, data = {}, ms = 12000) {
    if (QOPS.has(op) && !data.qid) data = { ...data, qid: qidNew() };
    let r;
    try { r = await withTimeout(fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op, ...data }) }), ms); }
    catch (e) { if (QOPS.has(op) && netErr(e)) { S.offline = true; offSave([...offQ(), { op, data, at: Date.now() }]); return { ok: true, queued: true }; } if (netErr(e)) { S.offline = true; offBanner(); if (op === 'state' || op === 'menu') { const c = store.get('cache_' + op, null); if (c) return c; } } throw e; } // без зв'язку — останній відомий стан залу й меню
    if (S.offline) { S.offline = false; offBanner(); if (offQ().length) setTimeout(offFlush, 300); }
    if (r.status === 404 && VENUE) { try { localStorage.removeItem('pos_venue2'); } catch {} location.replace(location.pathname); } // 🏪 заклад не знайдено — назад до VARVAR
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && op !== 'login') { logout(true); throw new Error('auth'); }
    if (!r.ok) { const e = new Error(j.error || 'error'); e.data = j; throw e; }
    if ((op === 'state' || op === 'menu') && r.ok) try { store.set('cache_' + op, j); } catch {} // 📴 для запуску без інтернету
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
    // PIN — 4 цифри, коди реєстрації нових закладів — 6+: після паузи пробуємо будь-яку довжину від 4 (наступна цифра скасовує спробу)
    if (k === 'c') pin = ''; else if (k === 'b') pin = pin.slice(0, -1); else if (pin.length < 12) pin += k;
    dots(); clearTimeout(tryLogin.t);
    if (pin.length >= 4) tryLogin.t = setTimeout(() => tryLogin({ pin }), pin.length === 4 ? 900 : 1200);
  }
  // реєстрація: код 1119 (адмін) / 1112 (офіціант) → імʼя + свій PIN
  let regCodeV = '';
  function showReg(role, code) {
    regCodeV = code; pin = ''; dots();
    $('#pinView').hidden = true; $('#regView').hidden = false;
    $('#loginSub').textContent = 'Реєстрація працівника';
    $('#regRole').textContent = role === 'admin' ? '🔐 Новий адміністратор' : role === 'cook' ? '👨‍🍳 Новий кухар' : role === 'courier' ? '🛵 Новий кур\'єр' : '🧑‍🍳 Новий офіціант';
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
  async function logout(expired) {
    if (!expired && offQ().length && !(await confirmBox(`📴 У черзі ${offQ().length} невідправлених дій`, 'Вони збережуться й відправляться, щойно хтось увійде в касу на цьому пристрої й з\'явиться зв\'язок. Вийти?'))) return;
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
    S.me = { ...S.me, ...r.me }; S.myTip = r.myTip; S.myAtt = r.myAtt || null; S.books = r.books || []; S.bkNew = r.bkNew || 0; if (r.brand && JSON.stringify(r.brand) !== JSON.stringify(S.brand)) { S.brand = r.brand; store.set('brand', r.brand); applyBrand(); } S.gInN = r.gInN || 0; S.cfg = r.cfg || S.cfg; S.n = r.n; S.printer = r.printer; S.shift = r.shift;
    S.tables = Object.fromEntries(r.tables.map(b => [b.t, b]));
    const fresh = r.events.filter(e => !S.seen.has(e.id));
    if (S.ready && fresh.some(e => ['guest', 'check', 'call'].includes(e.k) || (!isCook() && ['ready', 'kmsg'].includes(e.k)))) ding();
    r.events.forEach(e => S.seen.add(e.id));
    S.events = r.events; S.ready = true; if (!S._tk0) { S._tk0 = 1; loadMyTasks(); loadLookV(); if (OPEN_SET && isAdmin()) { S.view = 'settings'; S.setTab = OPEN_SET; renderNav(); renderMain(); loadView(); } }
    if (isCour() && S.view === 'go') renderMain(); // 🛵 нові доставки й «готово» — одразу на екрані кур'єра
    render();
  }
  async function loadMenu() { const r = await api('menu'); S.menu = r.menu; S.fav = r.fav || []; S.groups = r.groups || []; if (S.open) renderSheet(); if (['stop', 'menu', 'reports', 'calc'].includes(S.view)) renderMain(); }
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
        if (m.keys.includes('lookv')) loadLookV();
        if (m.keys.includes('task')) { loadMyTasks(); if (S.view === 'team' && S.zpTab === 'plan' && !$('#modal')) tkLoad(); } // 📋 план на день
        if (S.view === 'team' && m.keys.some(k => ['att', 'plan', 'pay', 'swaps', 'staff'].includes(k)) && !$('#modal')) loadView(true);
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

  // 🔊 звуки сповіщень — вибір у Налаштуваннях → 🎨 Вигляд: [частота, старт, тривалість, тип]
  const SOUNDS = {
    classic: ['Дзінь-дзінь', [[880, 0, .25], [1320, .16, .25]]], bell: ['Дзвіночок', [[1568, 0, .9, 'triangle'], [2093, .02, .7, 'sine']]],
    triple: ['Три тони', [[660, 0, .18], [880, .18, .18], [1100, .36, .3]]], soft: ['М\'який', [[523, 0, .5, 'sine'], [659, .2, .6, 'sine']]],
    alarm: ['Тривога', [[1000, 0, .12, 'square'], [1000, .2, .12, 'square'], [1000, .4, .12, 'square']]], marimba: ['Маримба', [[784, 0, .3, 'triangle'], [988, .12, .3, 'triangle'], [1175, .24, .4, 'triangle']]],
    pop: ['Поп', [[400, 0, .08, 'sine'], [800, .05, .12, 'sine']]], kitchen: ['Кухонний', [[2637, 0, .5, 'triangle'], [2637, .6, .5, 'triangle']]], off: ['Без звуку', []],
  };
  let actx;
  function ding(k) { // сигнал про нове замовлення гостя
    try {
      const L = look(), sn = SOUNDS[k || L.sound] || SOUNDS.classic, vol = (L.vol ?? 70) / 100 * .35 + .0002;
      actx ||= new (window.AudioContext || window.webkitAudioContext)(); actx.resume?.();
      sn[1].forEach(([f, d, len, type]) => { const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + d; o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + len); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + len + .05); });
    } catch {}
  }

  // 🎨 теми (на цьому пристрої)
  const THEMES = {
    night: ['🌑 Ніч (стандарт)', { bg: '#0b0b0d', bg2: '#151518', card: '#1c1c1f', card2: '#26262a', text: '#f5f5f7', muted: '#8e8e93', accent: '#f2c14e', 'accent-ink': '#1a1400' }],
    beet: ['🍷 Буряк', { bg: '#120609', bg2: '#1c0a10', card: '#261019', card2: '#341824', text: '#fbeff3', muted: '#a8848f', accent: '#e0457b', 'accent-ink': '#fff' }],
    ocean: ['🌊 Океан', { bg: '#06101a', bg2: '#0b1a29', card: '#102236', card2: '#173049', text: '#eef6ff', muted: '#7f98b3', accent: '#3fb6ff', 'accent-ink': '#00121f' }],
    forest: ['🌲 Ліс', { bg: '#07110b', bg2: '#0d1a12', card: '#13241a', card2: '#1b3224', text: '#eefaf2', muted: '#83a08e', accent: '#5ed68a', 'accent-ink': '#04210f' }],
    violet: ['🔮 Фіалка', { bg: '#0d0916', bg2: '#151024', card: '#1d1631', card2: '#291f44', text: '#f4f0ff', muted: '#9a8fb8', accent: '#a98bff', 'accent-ink': '#14082e' }],
    coffee: ['☕ Кава', { bg: '#120d09', bg2: '#1b140f', card: '#251c15', card2: '#32261d', text: '#f8efe6', muted: '#a8958a', accent: '#d9a066', 'accent-ink': '#2a1806' }],
    graphite: ['⚫ Графіт', { bg: '#161618', bg2: '#1e1e21', card: '#28282c', card2: '#333338', text: '#ffffff', muted: '#9b9ba1', accent: '#ffffff', 'accent-ink': '#000' }],
    amoled: ['🖤 Чорний AMOLED', { bg: '#000', bg2: '#050505', card: '#0e0e0e', card2: '#1a1a1a', text: '#fff', muted: '#888', accent: '#ffd60a', 'accent-ink': '#000' }],
    sunset: ['🌅 Захід', { bg: '#140a06', bg2: '#1f100a', card: '#2a160e', card2: '#3a2014', text: '#fff3ea', muted: '#b39282', accent: '#ff7a45', 'accent-ink': '#2a0c00' }],
    mint: ['🍃 М\'ята', { bg: '#071312', bg2: '#0c1d1b', card: '#112826', card2: '#183633', text: '#ecfffb', muted: '#80a7a1', accent: '#4fe3c1', 'accent-ink': '#00241c' }],
  };
  const FONTS = { system: ['Системний (iOS)', ''], inter: ['Inter', 'Inter'], manrope: ['Manrope', 'Manrope'], rubik: ['Rubik', 'Rubik'], nunito: ['Nunito', 'Nunito'], montserrat: ['Montserrat', 'Montserrat'], roboto: ['Roboto', 'Roboto'], comfortaa: ['Comfortaa', 'Comfortaa'], mono: ['JetBrains Mono', 'JetBrains Mono'], pt: ['PT Sans', 'PT Sans'] };
  const look = () => ({ theme: 'night', font: 'system', nfont: 'same', size: 100, radius: 'round', sound: 'classic', vol: 70, anim: 1, accent: '', ...store.get('look', {}) });
  function applyLook() {
    const L = look(), T = (THEMES[L.theme] || THEMES.night)[1], r = document.documentElement.style;
    for (const [k, v] of Object.entries(T)) r.setProperty('--' + k, v);
    if (L.accent) r.setProperty('--accent', L.accent);
    const fam = k => FONTS[k]?.[1], need = [fam(L.font), L.nfont !== 'same' && fam(L.nfont)].filter(Boolean);
    for (const f of need) { const id = 'gf-' + f.replace(/ /g, ''); if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}:wght@400;600;700;800&display=swap`; document.head.append(l); } }
    const base = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';
    r.setProperty('--font', fam(L.font) ? `"${fam(L.font)}", ${base}` : base);
    r.setProperty('--nfont', L.nfont === 'same' ? 'var(--font)' : fam(L.nfont) ? `"${fam(L.nfont)}", ${base}` : base);
    document.body.style.zoom = L.size === 100 ? '' : L.size / 100;
    const R = { round: [18, 24], soft: [12, 16], square: [6, 8] }[L.radius] || [18, 24]; r.setProperty('--r', R[0] + 'px'); r.setProperty('--r2', R[1] + 'px');
    document.body.classList.toggle('noanim', !L.anim);
    applySkin();
  }
  // 🎨 стиль (конструктор): «Стара каса» — без шару skin.css; «Стиль закладу» — від адміна (сервер); «Свій» — лише на цьому пристрої
  const { BASE: SK_BASE, PRE: SK_PRE } = VVSkin;
  const skinOf = () => (S.lookV ? { ...SK_BASE, ...S.lookV } : null); /* 🖌 стиль каси задає власник у кабінеті (Заклад і каса → Стиль каси) — однаковий на всіх пристроях */
  function applySkin(over) { const K = over || skinOf(); VVSkin.apply(K); if (K) document.body.classList.toggle('noanim', !K.anim || !look().anim); }
  async function loadLookV() { try { const r = await api('lookV'); S.lookV = r.look || null; applyLook(); } catch {} }
  const setLook = (k, v) => { store.set('look', { ...look(), [k]: v }); applyLook(); renderMain(); };
  applyLook();

  // ---------- каркас ----------
  const NAV_COOK = [['kq', '👨‍🍳', 'Черга'], ['calc', '📦', 'Склад'], ['stop', '⛔', 'Стоп-лист'], ['hall', '🪑', 'Зал']];
  const NAV_A = [['hall', '🪑', 'Зал'], ['books', '📅', 'Броні'], ['kq', '👨‍🍳', 'Кухня'], ['cash', '💰', 'Каса'], ['reports', '📊', 'Звіти'], ['calc', '📦', 'Склад'], ['team', '👥', 'Персонал'], ['settings', '⚙️', 'Налашт.']];
  const NAV_MAIN = ['hall', 'kq', 'cash', 'books']; // 📱 адмін на телефоні: 4 основні + «⋯ Ще»
  const NAV_W = [['hall', '🪑', 'Зал'], ['books', '📅', 'Броні'], ['closed', '🧾', 'Чеки'], ['stop', '⛔', 'Стоп-лист']];
  const NAV_COUR = [['go', '🛵', 'Доставки']];
  const navList = () => isCour() ? NAV_COUR : isCook() ? NAV_COOK : isAdmin() ? NAV_A : NAV_W;
  const NAV = [['hall', '🪑', 'Зал'], ['closed', '📜', 'Закриті'], ['stop', '⛔', 'Стоп-лист'], ['cash', '💰', 'Каса', 1], ['reports', '📊', 'Звіти', 1], ['kq', '👨‍🍳', 'Кухня', 1], ['calc', '🧮', 'Розрахунок', 1], ['settings', '⚙️', 'Налашт.', 1]];
  function renderNav() {
    const newCnt = S.events.filter(e => e.k === 'guest' && e.s === 'new').length;
    const attNew = isAdmin() ? S.events.filter(e => e.k === 'att' && e.s === 'new').length : 0;
    setHTML($('#nav'), `<div class="brand">${brandImg()}</div>` +
      navList().map(([v, ic, l]) => `<button data-n="${v}" class="${S.view === v ? 'on' : ''}${isAdmin() && !NAV_MAIN.includes(v) ? ' more-i' : ''}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}${v === 'team' && attNew ? `<span class="badge">${attNew}</span>` : ''}${v === 'books' && S.bkNew ? `<span class="badge">${S.bkNew}</span>` : ''}</button>`).join('') +
      `<button class="feed-btn" data-a="feed"><span class="ic">🔔</span>Стрічка${newCnt ? `<span class="badge">${newCnt}</span>` : ''}</button>` +
      `<button class="more-btn ${isAdmin() && !NAV_MAIN.includes(S.view) ? 'on' : ''}" data-a="more"><span class="ic">⋯</span>Ще</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="На весь екран"><span class="ic">⛶</span>Екран</button><button class="me" data-a="zpMy" title="Мій кабінет"><i>${esc((S.me?.name || '?').slice(0, 1).toUpperCase())}${onShift() ? '<em class="sh-dot"></em>' : ''}</i>${S.taskN ? `<span class="badge" title="Завдань на сьогодні">${S.taskN}</span>` : ''}<b>${esc(S.me?.name)}</b><small>${isAdmin() ? 'адмін' : isCook() ? 'кухар' : isCour() ? 'кур\'єр' : 'офіціант'} · кабінет</small></button>` +
      `<button data-a="switch"><span class="ic">🔒</span>Вийти</button>`);
  }
  function render() { renderNav(); renderFeed(); if (['hall', 'printer', 'kq'].includes(S.view) || (S.view === 'settings' && S.setTab === 'printer')) renderMain(); if (S.open) renderSheet(); }

  // ---------- зал ----------
  setInterval(() => { if (S.events?.some(e => e.k === 'call' && e.s === 'new')) { renderFeed(); if (S.view === 'hall' && !S.open) renderMain(); } }, 10000); // 🔔 через 1 хв — червоним
  // ---------- 🛵 доставка і самовивіз ----------
  const GOST = { new: '🆕 нове', acc: '✅ прийнято', cook: '🔥 готується', ready: '🍽 готово', road: '🛵 в дорозі', done: '🤝 видано', rej: '❌' };
  const fmtPh = p => p ? `+${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 8)} ${p.slice(8, 10)} ${p.slice(10)}` : '';
  // ---------- 📅 броні, 🎟 сертифікати, 🌐 сайт ----------
  const BKS = { new: '🆕 нова', ok: '✅ підтверджено', no: '❌ відхилено', came: '🪑 прийшли', noshow: '🚫 не прийшли', cancel: '↩️ скасовано' };
  // 📅 розділ «Броні»: стрічка днів, список по часу, повне редагування, бронь по телефону
  const addD = (d, n) => iso(Date.parse(d + 'T12:00:00') + n * 864e5);
  // ---------- інші екрани ----------
  async function loadView(silent) {
    try {
      if (S.view === 'kq') await loadKq();
      if (S.view === 'cash' && S.cashTab !== 'checks') { S.data.shift = await api('shift'); if (isAdmin()) S.data.cours = await api('courList').catch(() => null); }
      if (S.view === 'closed' || (S.view === 'cash' && S.cashTab === 'checks')) { const r = await api('closed', { day: S.cday || '' }); S.data.closed = r.list; S.data.cvoids = r.voids || []; S.data.cday = r.day; S.data.ctoday = r.today; }
      if (S.view === 'reports') { if (!S.menu) await loadMenu(); if (S.rep.tab === 'plus') { const [from, to] = perRange(S.sk.p); S.data.skRep = await api('skReport', { from, to }, 30000); } else await loadReport(); }
      if (S.view === 'go' && isCour()) await loadCour();
      if (S.view === 'books') await loadBooks();
      if (S.view === 'calc') await loadCalc();
      if (S.view === 'team') { await loadPay(); S.data.staff = await api('staff'); }
      if (S.view === 'settings') { S.data.staff = await api('staff'); S.data.wifi = await api('wifi'); S.data.gocfg = (await api('goCfg')).cfg; S.data.cours = await api('courList').catch(() => null); if (!S.menu) await loadMenu(); }
      if (['stop', 'menu'].includes(S.view) && !S.menu) await loadMenu();
    } catch {}
    renderMain();
  }
  function renderMain() {
    const v = S.view, m = $('#main');
    m.classList.toggle('hall', v === 'hall');
    if (v === 'hall') { const [c, r] = hallGrid(m); m.style.setProperty('--cols', c); m.style.setProperty('--rows', r); }
    const html = { books: booksHTML, go: goHTML, kq: kqHTML, hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, calc: calcHTML, team: teamHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML }[v]?.();
    const fid = document.activeElement?.id, keep = ['stopSearch', 'rQ', 'skQ', 'skQ2', 'skCq'].includes(fid);
    const sx = [...m.querySelectorAll('.zp-grid, .sk-tbl, .chips.scroll, .seg')].map(e => e.scrollLeft); // таблиці, що гортаються вбік, — лишаються на місці
    setHTML(m, html || '');
    m.querySelectorAll('.zp-grid, .sk-tbl, .chips.scroll, .seg').forEach((e, i) => { if (sx[i]) e.scrollLeft = sx[i]; });
    if (keep) { const el = $('#' + fid); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
  // сітка залу: столи рівномірно на всю робочу зону, без порожніх клітинок, плитки близькі до квадрата
  addEventListener('resize', () => { if (S.view === 'hall' && S.token) { $('#main')._h = ''; renderMain(); } });
  // ---------- 👨‍🍳 кухонний екран ----------
  setInterval(() => { if (S.view === 'kq') renderMain(); }, 30000); // таймери
  document.addEventListener('visibilitychange', async () => { if (isCook() && document.visibilityState === 'visible' && (!wakeLock || wakeLock.released)) try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {} });
  // ---------- каса (зміна) ----------
  // 🛵 кур'єри: готівка на руках, «отримав»
  // ---------- звіти: віджети + фільтри ----------
  const iso = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const PER = [['d', 'Сьогодні'], ['y', 'Вчора'], ['w', '7 днів'], ['30', '30 днів'], ['m', 'Цей місяць'], ['pm', 'Мин. місяць'], ['yr', 'Рік'], ['all', 'За весь час'], ['c', 'Свій період']];
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
    : [['stock', '📦 Залишки'], ['inv', '🧾 Накладні'], ['sup', '🏭 Постачальники'], ['buy', '🛒 Закупівля'], ['cards', '📋 Техкарти'], ['prod', '🍳 Заготовки'], ['count', '📝 Інвентаризація'], ['rep', '📊 Плюси / мінуси'], ['menu', '📖 Меню'], ['stop', '⛔ Стоп-лист']];
  S.sk = { tab: 'stock', q: '', q2: '', cq: '', wh: '', cat: '', flt: '', cf: {}, cwh: 'k', p: 'w', draft: null, card: null };
  const skBusy = () => S.sk.draft || S.sk.card || (document.activeElement?.closest?.('#main') && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
  // ---------- 👷 зміни й зарплата ----------
  const hhK = t => new Date(t).toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
  const WDL = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const curMon = () => { const d = new Date(Date.now() - (S.cfg?.dayH ?? 3) * 3600e3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const todayK = () => iso(Date.now() - (S.cfg?.dayH ?? 3) * 3600e3);
  const monAdd = (m, n) => { const [y, mo] = m.split('-').map(Number), d = new Date(y, mo - 1 + n, 15); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const MONN = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
  const monName = m => `${MONN[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const onShift = () => S.myAtt && S.myAtt.in && !S.myAtt.out;
  const shiftBtns = () => `${onShift() ? `<button class="btn sm red" data-a="zpOut">🔴 Закінчити зміну</button>` : `<button class="btn sm green" data-a="zpIn">🟢 Почати зміну</button>`}${S.myAtt?.ok === 0 ? '<span class="zp-wait">🕓 чекає ✅</span>' : ''}<button class="btn sm" data-a="zpMy">👤 Кабінет</button>`;
  const attIc = (a, p, d) => a?.ok === 1 ? (a.late ? '⏰' : a.auto ? '⚠️' : '✅') : a?.ok === 0 ? '🕓' : a?.ok === -1 ? '❌' : p && d < todayK() ? '🚫' : '';
  const hrs = a => a?.in && a?.out ? Math.round((a.out - a.in) / 360e4 * 10) / 10 : null;
  // ---------- модальні вікна ----------
  let modalResolve;
  function modal({ title, text = '', body = '', buttons, keep }) {
    return new Promise(res => {
      modalResolve = v => { if (!keep || v == null) closeModal(); res(v); };
      const el = document.createElement('div'); el.className = 'modal-bg'; el.id = 'modal';
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${body}<div class="btns" style="margin-top:14px">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mi="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
      el.addEventListener('click', e => { if (e.target === el) return modalResolve(null); const i = e.target.closest('[data-mi]')?.dataset.mi; if (i != null) return modalResolve(buttons[+i].val); const pk = e.target.closest('[data-mi-v]')?.dataset.miV; if (pk != null) modalResolve(pk); });
      document.body.append(el);
      const fq = el.querySelector('[data-mi-quick]'); if (fq) fq.onclick = () => { el.querySelector('#fIn').value = last0; modalResolve('ok'); };
    });
  }
  let last0 = 0;
  const closeModal = () => $('#modal')?.remove();
  const choose = (title, text, opts) => modal({ title, text, buttons: [...opts, { label: 'Скасувати', val: null }] });
  const confirmBox = (title, text = '') => modal({ title, text, buttons: [{ label: 'Так', val: true, cls: 'red' }, { label: 'Ні', val: null }] });
  async function askVal(title, val = '', type = 'text') { // поле з поточним значенням (можна стерти — порожнє)
    const v = await modal({ title, body: `<input id="askIn" type="${type}" value="${esc(val)}" ${type === 'number' ? 'inputmode="decimal" step="0.1"' : ''}>`, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    setTimeout(() => $('#askIn')?.focus(), 50); const x = v === 'ok' ? $('#askIn').value.trim() : null; closeModal(); return x;
  }
  async function askLong(title, val = '') { // довгий текст — багаторядкове поле з поточним значенням
    const v = await modal({ title, body: `<textarea id="askIn" rows="7" style="width:100%">${esc(val)}</textarea>`, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const x = v === 'ok' ? $('#askIn').value.trim() : null; closeModal(); return x;
  }
  async function ask(title, ph = '', type = 'text') {
    const v = await modal({ title, body: `<input id="askIn" type="${type}" placeholder="${esc(ph)}" ${type === 'number' ? 'inputmode="decimal"' : ''}>`, buttons: [{ label: 'OK', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const x = v === 'ok' ? $('#askIn').value.trim() : null; closeModal(); return x || null;
  }
  function pickTable(title, text, skip, withGo) {
    return new Promise(res => {
      modalResolve = v => { closeModal(); res(v); };
      const el = document.createElement('div'); el.className = 'modal-bg'; el.id = 'modal';
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><p>${esc(text)}</p>${withGo ? '<div class="btnrow" style="margin-bottom:10px"><button class="btn" data-t="pick">🥡 Самовивіз</button><button class="btn" data-t="del">🛵 Доставка</button></div>' : ''}<div class="grid">${Array.from({ length: S.n }, (_, i) => i + 1).filter(n => n !== skip).map(n => `<button class="${S.tables[n] ? 'busy' : ''}" data-t="${n}">${n}</button>`).join('')}</div><div class="btns"><button class="btn" data-x>Скасувати</button></div></div>`;
      el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-x]')) return modalResolve(null); const t = e.target.closest('[data-t]')?.dataset.t; if (t) modalResolve(isNaN(+t) ? t : +t); });
      document.body.append(el);
      setTimeout(() => el.querySelector('input')?.focus(), 50);
    });
  }
  setTimeout(() => {}, 0);
  let toastT;
  function toast(msg) { $('.toast')?.remove(); const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.append(d); clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 2600); }

  document.addEventListener('change', async e => { const el = e.target; if (el.dataset?.a !== 'bkDate' || !el.value) return; S.bkDay = el.value; if (!S.data.bk?.some(b => b.date === el.value) && (el.value < addD(todayK(), -7) || el.value > addD(todayK(), 60))) { const r = await api('bkList', { from: el.value, to: el.value, all: true }).catch(() => null); if (r) S.data.bk = [...S.data.bk.filter(b => b.date !== el.value), ...r.list]; } renderMain(); });
  // ---------- кліки ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const a = el.dataset.a, t = S.open;
    switch (a) {
      case 'view': S.view = el.dataset.v; S.q = ''; renderNav(); renderMain(); loadView(); $('#feed').classList.remove('open'); $('#main').scrollTop = 0; break;
      case 'feed': $('#feed').classList.toggle('open'); break;
      case 'fs': { const on = !document.fullscreenElement; store.set('fs', on); on ? document.documentElement.requestFullscreen?.().catch(() => {}) : document.exitFullscreen?.(); break; }
      case 'more': { const v = await choose('Ще', '', (isCook() ? NAV_COOK : isAdmin() ? NAV_A.filter(n => !NAV_MAIN.includes(n[0])) : NAV.filter(n => !n[3] && ['stop', 'menu', 'calc'].includes(n[0]))).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: '🔒 Вийти', val: 'logout', cls: 'red' }]));
        if (v === 'logout') { if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); } else if (v) { S.view = v; S.q = ''; renderNav(); renderMain(); loadView(); $('#main').scrollTop = 0; } break; }
      case 'switch': if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); break;
      case 'table': $('#feed').classList.remove('open'); openTable(el.dataset.t); break;
      case 'newOrder': { const n = await pickTable('Новe замовлення', 'Оберіть стіл', 0, true); if (n === 'pick' || n === 'del') goNew(n); else if (n) { openTable(n); S.mobileMenu = true; renderSheet(); } break; }
      case 'closeSheet': closeSheet(); break;
      case 'tab': S.mobileMenu = el.dataset.m === '1'; renderSheet(); break;
      case 'mobileMenu': S.mobileMenu = true; renderSheet(); break;
      case 'cat': S.cat = el.dataset.c; S.q = ''; renderSheet(); $('#shItems').scrollTop = 0; break;
      case 'grp': S.grp = el.dataset.g; S.cat = ''; S.q = ''; store.set('grp', S.grp); renderSheet(); $('#shItems').scrollTop = 0; break;
      case 'fav': { const on = !S.fav.includes(el.dataset.id); S.fav = on ? [...S.fav, el.dataset.id] : S.fav.filter(x => x !== el.dataset.id); renderSheet(); act('fav', { id: el.dataset.id, on }, on ? '⭐ Додано в обрані' : 'Прибрано з обраних'); break; }
      case 'tw': { // 🥡 з собою: самовивіз або доставка — окремий віртуальний стіл С‑ / Д‑
        if (t === -1 || t > 1000) { S.tw[t] = !S.tw[t]; S.packAdj[t] = 0; renderSheet(); break; }
        const k = await choose('🥡 З собою', 'Замовлення піде окремим чеком; стіл не займається', [{ label: '🥡 Самовивіз', val: 'pick', cls: 'primary' }, { label: '🛵 Доставка', val: 'del', cls: 'primary' }]);
        if (k) goNew(k, t); break; }
      case 'ur': S.ur[t] = !S.ur[t]; renderSheet(); break;
      case 'kItem': { const r = await act('kDone', { id: el.dataset.id, i: +el.dataset.i }); if (r) loadKq(); break; }
      case 'kAll': { el.closest('.kc')?.classList.add('bye'); const r = await act('kDone', { id: el.dataset.id }); if (r) setTimeout(loadKq, 250); break; }
      case 'kStart': { await act('kStart', { id: el.dataset.id }); loadKq(); break; }
      case 'kUndo': { await act('kUndo', { id: el.dataset.id }, '↩️ Повернуто в чергу'); loadKq(); break; }
      case 'kMsg': { let v = await choose('Повідомлення в зал', 'Офіціанти побачать у стрічці', ['❗ Немає продукту', '⏱ Ще +10 хв', '🙋 Підійди на кухню', '🔥 Вже майже готово'].map(x => ({ label: x, val: x })).concat([{ label: '✏️ Своє…', val: 'own' }]));
        if (v === 'own') v = await ask('Повідомлення в зал', 'Напр.: замінимо фрі на пюре?'); if (v) await act('kMsg', { id: el.dataset.id, text: v }, '📨 Надіслано'); loadKq(); break; }
      case 'kFont': S.kFont = (S.kFont % 3) + 1; store.set('kfont', S.kFont); renderMain(); break;
      case 'kGo': kitchenStart(); break;
      case 'kSnd': kSndPick(); break;
      case 'kSndTry': kPlay(el.dataset.k); break;
      case 'pk': { const cur = packQ(t); if (cur + +el.dataset.d >= 0) S.packAdj[t] = (S.packAdj[t] || 0) + +el.dataset.d; renderSheet(); break; }
      case 'photos': S.photos = !S.photos; store.set('photos', S.photos); renderSheet(); break;
      case 'zDay': zDay(); break;
      case 'shOpen': shOpen(); break;
      case 'rp': S.rep.p = el.dataset.p; loadView(); break;
      case 'rTab': S.rep.tab = el.dataset.t; (S.rep.last ||= {})[SECS.find(x => x[2].includes(el.dataset.t))[0]] = el.dataset.t; renderMain(); break;
      case 'rSec': { const sc = SECS.find(x => x[0] === el.dataset.s); S.rep.tab = (S.rep.last || {})[sc[0]] || sc[2][0]; renderMain(); if (S.rep.tab === 'plus' || !S.data.range) loadView(); break; }
      case 'rFo': S.rep.fo = !S.rep.fo; renderMain(); break;
      case 'rDay': if (matchMedia('(hover: none)').matches && !el.classList.contains('on')) { el.parentNode.querySelectorAll('.c.on').forEach(x => x.classList.remove('on')); el.classList.add('on'); el.parentNode.previousElementSibling.textContent = el.title + ' · ще раз — звіт за день'; break; } Object.assign(S.rep, { p: 'c', from: el.dataset.d, to: el.dataset.d }); loadView(); $('#main').scrollTop = 0; break;
      case 'rSort': S.rep.sort = el.dataset.s; renderMain(); break;
      case 'rReset': Object.assign(S.rep, { pay: '', by: '', grp: '', cat: '', t: '', q: '' }); renderMain(); break;
      case 'add': addItem(el.dataset.id); break;
      case 'cq': { const c = cartOf(t), x = c[el.dataset.k]; if (x) { x.q += +el.dataset.d; if (x.q <= 0) delete c[el.dataset.k]; } saveCarts(); renderSheet(); break; }
      case 'cartClear': S.carts[t] = {}; saveCarts(); renderSheet(); break;
      case 'send': sendCart(); break;
      case 'goNew': goNew(); break;
      case 'books': S.view = 'books'; renderNav(); renderMain(); loadView(); break;
      case 'bkDay': S.bkDay = el.dataset.d; renderMain(); break;
      case 'bkAll': S.bkAll = !!el.dataset.v; renderMain(); break;
      case 'bkNew': bkForm(); break;
      case 'bkEd': bkForm(S.data.bk.find(x => x.id === el.dataset.id)); break;
      case 'bkCame': { const b = S.data.bk.find(x => x.id === el.dataset.id); let tt = b.t; if (!tt) { tt = await pickTable(`🪑 ${b.name}: за який стіл?`, 'Бронь закриється як «прийшли»'); if (!tt) break; }
        if (await act('bkSet', { id: b.id, st: 'came', t: tt }, '🪑 Гості прийшли')) { await loadBooks(); loadState().catch(() => {}); if (b.pre?.length && !b.preSent && await confirmBox('🍽 Передзамовлення', 'Відправити на кухню зараз?')) await act('bkSet', { id: b.id, st: 'kit' }, '🔥 На кухні'); S.view = 'hall'; renderNav(); renderMain(); openTable(tt); } break; }
      case 'bkSet': { if (el.dataset.s === 'cancel' && !(await confirmBox('Скасувати бронь?'))) break; if (await act('bkSet', { id: el.dataset.id, st: el.dataset.s }, BKS[el.dataset.s] || '🔥 На кухню')) { loadState().catch(() => {}); if (S.view === 'books') { await loadBooks(); renderMain(); } } break; }
      case 'bkTbl': { const n = await pickTable('🪑 Стіл для броні', 'Плитка стола покаже час броні'); if (n && await act('bkEdit', { id: el.dataset.id, f: { t: n } }, '🪑 Стіл призначено')) { loadState().catch(() => {}); await loadBooks(); renderMain(); } break; }
      case 'certPay': if (await act('certPay', { code: el.dataset.c, how: el.dataset.h }, el.dataset.h === 'no' ? '❌ Скасовано' : '🎟 Сертифікат активовано')) loadState().catch(() => {}); break;
      case 'certDel': { const code = el.dataset.c; if (!(await choose('🗑 Видалити сертифікат?', code + ' — код перестане діяти. Це не можна скасувати.', [{ label: '🗑 Видалити', val: 1, cls: 'red' }, { label: 'Ні', val: 0 }]))) break; if (await act('certDel', { code }, '🗑 Видалено')) { el.closest('.kv')?.remove(); } break; }
      case 'certT': certT(t); break;
      case 'bonCert': { const v = await choose('🎁 Бонуси · 🎟 Сертифікат', S.tables[t]?.cli ? 'Гість за телефоном уже вказаний' : 'Що застосувати до рахунку?', [{ label: S.tables[t]?.cli ? '🎁 Гість і бонуси' : '🎁 Бонуси гостя (за телефоном)', val: 'cli', cls: 'primary' }, { label: '🎟 Сертифікат (код)', val: 'cert' }, { label: '🎂 Подарунок на ДН', val: 'bd' }]); if (v === 'cli') cliT(t); else if (v === 'cert') certT(t); else if (v === 'bd') bdGiftT(t); break; }
      case 'certs': { const r = await api('certList').catch(() => null); if (!r) break; await modal({ title: '🎟 Сертифікати', body: `<div class="bk-list">${r.list.map(c => `<div class="kv"><span><b>${c.code}</b> · ${money(c.sum)}${c.left !== c.sum ? ` · залишок ${money(c.left)}` : ''}<br><small class="muted">від ${esc(c.from)}${c.to ? ' для ' + esc(c.to) : ''} · ${fmtPh(c.phone)} · ${{ new: '⏳ не оплачено', ok: '✅ активний', no: '❌ скасовано' }[c.st]}</small></span>${c.st === 'new' ? `<span class="kv-r"><button class="btn sm green" data-a="certPay" data-c="${c.code}" data-h="cash">💵</button><button class="btn sm" data-a="certPay" data-c="${c.code}" data-h="card">💳</button><button class="btn sm red" data-a="certDel" data-c="${c.code}">🗑</button></span>` : `<span class="kv-r"><button class="btn sm red" data-a="certDel" data-c="${c.code}">🗑</button></span>`}</div>`).join('') || '<div class="muted">Ще немає</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] }); break; }
      case 'copyLink': try { await navigator.clipboard.writeText(el.dataset.u); toast('🔗 Скопійовано'); } catch { prompt('Скопіюйте посилання:', el.dataset.u); } break;
      case 'goSt': if (await act('goSt', { t, st: el.dataset.s }, '✔ ' + GOST[el.dataset.s])) loadState().catch(() => {}); break;
      case 'goDone': goDone(t); break;
      case 'goDoneT': goDone(+el.dataset.t); break;
      case 'crGive': { const v = await askVal(`💵 Скільки отримано від ${el.dataset.n}?`, el.dataset.v, 'number'); if (!v) break; if (await act('courCash', { n: el.dataset.n, sum: +v }, '✅ Записано')) loadView(); break; }
      case 'crTab': S.courTab = el.dataset.t; renderMain(); break;
      case 'crAct': { const x = el.dataset.x; if (await act('courAct', { t: +el.dataset.t, act: x, arg: el.dataset.v }, { take: '✋ Ваша доставка', road: '🛵 В дорозі', eta: '⏱ Гостю надіслано', km: '💬 Кухні надіслано' }[x])) { if (x === 'take') S.courTab = 'mine'; await loadState().catch(() => {}); await loadCour().catch(() => {}); } break; }
      case 'crDone': { const tt = +el.dataset.t, b = S.tables[tt]; const pay = b?.go?.paid ? 'card' : await choose(`🤝 ${tn(tt)} видано`, `До сплати ${money(b.pay2)}${b.go.change ? ` · решта з ${b.go.change}` : ''}`, [{ label: '💵 Готівка', val: 'cash', cls: 'green' }, { label: '💳 Картка', val: 'card', cls: 'blue' }]); if (!pay) break;
        if (await act('courAct', { t: tt, act: 'done', arg: pay }, '✅ Видано')) { await loadState().catch(() => {}); await loadCour().catch(() => {}); } break; }
      case 'crProb': { const v = await choose('⚠️ Що сталось?', 'Адмін отримає сповіщення', [{ label: '📵 Гість не відповідає', val: 'noans' }, { label: '📍 Невірна адреса', val: 'addr' }, { label: '🙅 Гість відмовився', val: 'refuse', cls: 'red' }, { label: '✏️ Інше…', val: 'own' }]); if (!v) break;
        const arg = v === 'own' ? await ask('⚠️ Опишіть проблему') : v; if (arg && await act('courAct', { t: +el.dataset.t, act: 'prob', arg }, '⚠️ Адміна повідомлено')) loadState().catch(() => {}); break; }
      case 'crTg': { const r = await act('courTg'); if (r?.url) { window.open(r.url, '_blank'); toast('✈️ Натисніть «Start» у боті'); setTimeout(() => loadCour().catch(() => {}), 15000); } break; }
      case 'goTake': if (await act('goCour', { t: +el.dataset.t }, '✋ Ваша доставка')) { await loadState().catch(() => {}); renderMain(); } break;
      case 'goRoad': if (await act('goSt', { t: +el.dataset.t, st: 'road' }, '🛵 В дорозі')) { await loadState().catch(() => {}); renderMain(); } break;
      case 'goCourSet': { const n = await ask('👤 Кур\'єр (імʼя)', S.tables[t]?.go?.cour || ''); if (n != null && await act('goCour', { t, n }, '✔')) loadState().catch(() => {}); break; }
      case 'cliT': cliT(t); break;
      case 'cliBon0': { const b = S.tables[t]; if (b?.cert) { if (!(await confirmBox(b.cert.code && b.bonus > b.cert.sum ? '↩️ Прибрати сертифікат і бонуси з рахунку?' : '↩️ Прибрати сертифікат з рахунку?'))) break; if (!(await act('certOff', { t }, '↩️ Прибрано'))) break; if (b.bonus > b.cert.sum && b.cli) await act('cliBonus', { t, sum: 0 }); } else if (!(await act('cliBonus', { t, sum: 0 }))) break; loadState().catch(() => {}); break; }
      case 'goCfg': { const k = el.dataset.k, cur = S.data.gocfg?.[k]; const v = ['on', 'del', 'pick'].includes(k) ? (cur ? 0 : 1) : await ask(el.dataset.l || k, String(cur ?? ''), ['phone', 'zone', 'from', 'to'].includes(k) ? 'text' : 'number'); if (v == null) break;
        const r = await act('goCfgSet', { k, v }, '💾 Збережено'); if (r) { S.data.gocfg = r.cfg; renderMain(); } break; }
      case 'goLink': { const u = 'https://666blackmuxa666.github.io/VARVAR/' + '?go' + (el.dataset.src ? '&src=' + el.dataset.src : ''); try { await navigator.clipboard.writeText(u); toast('📋 Скопійовано: ' + u); } catch { await ask('Посилання', u); } break; }
      case 'rm': { const reason = await voidReason(`Скасувати 1× ${el.dataset.name}?`); if (reason) act('remove', { t, name: el.dataset.name, reason }, '✏️ Скасовано'); break; }
      case 'pre': act('precheck', { t }, '🖨 Пречек відправлено'); break;
      case 'disc': discFlow(); break;
      case 'tip': { const b = S.tables[t]; if (!b) break; const v = await choose(`💝 Чайові — стіл ${tn(t)}`, `До сплати ${money(b.pay2)}`, [...[5, 10, 15].map(p => ({ label: `${p}% · ${money(Math.round(b.pay2 * p / 100))}`, val: String(Math.round(b.pay2 * p / 100)) })), { label: '✏️ Своя сума', val: 'own' }, ...(b.tip ? [{ label: 'Прибрати чайові', val: '0', cls: 'red' }] : [])]);
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
      case 'setTab': S.setTab = el.dataset.s; renderMain(); break;
      case 'look': { const k = el.dataset.k, v = ['size', 'vol', 'anim'].includes(k) ? +el.dataset.v : el.dataset.v; setLook(k, v); if (k === 'sound' || k === 'vol') ding(); break; }
      case 'lookReset': store.set('look', {}); applyLook(); renderMain(); toast('↺ Стандартний вигляд'); break;
      case 'cashTab': S.cashTab = el.dataset.t; renderMain(); loadView(); break;
      case 'move': moveFlow(); break;
      case 'split': splitFlow(); break;
      case 'spq': { const i = +el.dataset.i, it = S.spl.items[i]; S.spl.q[i] = Math.max(0, Math.min(it.q, (S.spl.q[i] || 0) + +el.dataset.d)); splitRender(); break; }
      case 'closeT': closeFlow(); break;
      case 'delTable': { const reason = await voidReason(`Видалити весь стіл ${tn(t)}? Сума НЕ піде у виручку`); if (reason) { const r = await act('delete', { t, reason }, `🗑 Стіл ${tn(t)} видалено`); if (r) closeSheet(); } break; }
      case 'evAck': act('evAck', { id: el.dataset.id }, '✅ Ви йдете до гостя'); break;
      case 'accept': act('accept', { oid: el.dataset.oid }, '✅ Прийнято — пішло на кухню'); break;
      case 'reject': if (await confirmBox('Відхилити замовлення гостя?', 'Позиції приберуться з рахунку, на кухню не піде, гість побачить «відхилено»')) { await act('reject', { oid: el.dataset.oid }, '❌ Відхилено'); loadState().catch(() => {}); } break;
      case 'cBack': if (await confirmBox('Повернути рахунок у виручку?', 'Сума, страви й чайові знову зарахуються')) { await act('closedBack', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Повернуто у виручку'); loadView(); } break;
      case 'cReopen': if (await confirmBox('Відкрити рахунок знову?', 'Він зніметься з виручки й повернеться на стіл — виправите й закриєте заново')) { const r = await act('closedReopen', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Рахунок знову на столі'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } break;
      case 'tBack': if (await confirmBox('Відновити видалений стіл?', 'Страви повернуться на стіл')) { const r = await act('tableBack', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Стіл відновлено'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } break;
      case 'movBack': await act('moveBack', { i: +el.dataset.i }, '↩️ Відновлено'); loadView(); break;
      case 'expBack': await act('expenseBack', { i: +el.dataset.i }, '↩️ Відновлено'); loadView(); break;
      case 'cEdit': cEdit(el.dataset.ref, el.dataset.d || undefined); break;
      case 'cPrint': act('closedPrint', { ref: el.dataset.ref, day: S.data.cday }, '🖨 Чек відправлено'); break;
      case 'cDay': { const v = +el.dataset.v, base = S.data.cday || S.data.ctoday; if (!v || !base) S.cday = ''; else { const d = new Date(base + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + v); const k = d.toISOString().slice(0, 10); S.cday = k >= S.data.ctoday ? '' : k; } S.data.closed = null; renderMain(); loadView(); break; }
      case 'cDel': if (await confirmBox('Видалити рахунок з виручки?', 'Сума, страви й замовлення віднімуться зі звітів')) await act('closedDel', { ref: el.dataset.ref, day: S.data.cday }, '🧹 Видалено з виручки'); loadView(); break;
      case 'stopOff': S.stopOff = !S.stopOff; renderMain(); break;
      case 'stopT': await act('stop', { id: el.dataset.id, hidden: el.dataset.h === '1' }); break;
      case 'pTest': act('printTest', {}, '🖨 Тест відправлено'); break;
      case 'pQClear': if (await confirmBox('🗑 Очистити всю чергу друку?', 'Чеки й кухонні квитки, які ще не надрукувались, буде видалено — принтер їх не надрукує.')) { const r = await act('printClear', {}); if (r) { toast(`🗑 Видалено: ${r.n}`); loadState().catch(() => {}); } } break;
      case 'pQList': { const r = await act('printQ', {}); if (!r) break; const K = { kitchen: '👨‍🍳', receipt: '🧾', test: '🧪', z: '📊', qr: '🔳' };
        modal({ title: `🖨 Черга друку (${r.list.length})`, body: `<div class="muted set-note">Принтер друкує по черзі. Якщо щось застрягло або вже не потрібне — 🗑 (двічі).</div>${r.list.map(j => `<div class="kv" data-pq="${j.id}"><span style="min-width:0;overflow-wrap:anywhere">${K[j.kind] || '🖨'} ${esc(j.txt || j.kind)}<br><small class="muted">${j.at ? hhmm(j.at) : ''}</small></span><span class="kv-r"><button class="btn sm red" data-a="pQDel" data-id="${j.id}">🗑</button></span></div>`).join('') || '<div class="muted">Черга порожня</div>'}`, buttons: [{ label: 'Закрити', val: null }] }).then(() => loadState().catch(() => {})); break; }
      case 'pQDel': { if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = '🗑 Точно?'; setTimeout(() => { if (el.isConnected) { delete el.dataset.sure; el.textContent = '🗑'; } }, 3000); break; }
        if (await act('printClear', { id: el.dataset.id }, '🗑 Видалено')) el.closest('[data-pq]')?.remove(); break; }
      case 'pQr': { const n = await pickTable('QR меню', 'У кожного столу свій QR — замовлення одразу на цей стіл'); if (n) act('printQr', { t: n }, `🖨 QR столу ${tn(n)}`); break; }
      case 'float': { const v = await ask('Розмін на початок дня', 'Сума в касі, ₴', 'number'); if (v != null) { await act('float', { sum: +v.replace(',', '.') }, '🏦 Записано'); loadView(); } break; }
      case 'expense': {
        const v = await modal({ title: '💸 Витрата', body: '<div class="form"><input id="eSum" inputmode="decimal" placeholder="Сума, ₴"><input id="eNote" placeholder="На що (напр. овочі на ринку)">' + (isAdmin() ? `<label class="muted" style="font-size:13px">📅 За день<input id="eDay" type="date" value="${todayK()}" max="${todayK()}"></label>` : '') + '</div>', buttons: [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З карти', val: 'card' }, { label: 'Скасувати', val: null }], keep: true });
        const sum = v && +$('#eSum').value.replace(',', '.'), note = v && $('#eNote').value, day = v && $('#eDay')?.value !== todayK() ? $('#eDay')?.value || '' : ''; closeModal();
        if (v && sum) { await act('expense', { sum, note, src: v, ...(day ? { day } : {}) }, day ? `💸 Витрату записано за ${day.split('-').reverse().join('.')}` : '💸 Витрату записано'); loadView(); }
        break;
      }
      case 'tipPay': { const src = await choose(`💝 Видати чайові: ${el.dataset.n}`, 'Звідки списати? Сума відніметься з готівки або картки', [{ label: '💵 Готівкою з каси', val: 'cash', cls: 'green' }, { label: '💳 З картки', val: 'card', cls: 'blue' }]);
        if (src) { await act('tipPay', { name: el.dataset.n, src }, '💝 Видано'); loadView(); loadState().catch(() => {}); } break; }
      case 'cMove': cashMove(el.dataset.t); break;
      case 'balInfo': balInfo(el.dataset.s); break;
      case 'movDel': if (await confirmBox('Видалити запис?')) { await act('moveDel', { i: +el.dataset.i }); loadView(); } break;
      case 'expDel': if (await confirmBox('Видалити витрату?')) { await act('expenseDel', { i: +el.dataset.i }); loadView(); } break;
      case 'menuEdit': menuEdit(el.dataset.id); break;
      case 'phPanel': phPanel(); break;
      case 'qrPanel': qrPanel(); break;
      case 'catAdd': { const v = await ask('📂 Новий розділ меню', 'Назва, напр. Упакування'); if (v && await act('catAdd', { name: v }, '📂 Розділ додано в кінець меню')) loadMenu().catch(() => {}); break; }
      case 'menuUndo': if (await confirmBox('Скасувати останню зміну меню?')) act('menuUndo', {}, '↩️ Скасовано'); break;
      case 'staffAdd': {
        const v = await modal({ title: '➕ Працівник', body: '<div class="form"><input id="sName" placeholder="Імʼя"><input id="sPin" inputmode="numeric" maxlength="4" placeholder="PIN — 4 цифри"></div>', buttons: [{ label: '🧑‍🍳 Офіціант', val: 'waiter', cls: 'primary' }, { label: '🔐 Адміністратор', val: 'admin' }, { label: '👨‍🍳 Кухар', val: 'cook' }, { label: '🛵 Кур\'єр', val: 'courier' }, { label: 'Скасувати', val: null }], keep: true });
        const name = v && $('#sName').value, p = v && $('#sPin').value; closeModal();
        if (v) { await act('staffAdd', { name, pin: p, role: v }, '👥 Додано'); loadView(); }
        break;
      }
      case 'cfgTgl': { const k = el.dataset.k, cur = S.data.staff?.cfg?.[k] ?? S.cfg?.[k] ?? +(el.dataset.def || 0); if (await act('cfgSet', { k, v: cur ? 0 : 1 }, '⚙️ Збережено')) { loadView(); loadState().catch(() => {}); } break; }
      case 'cfg': { const k = el.dataset.k, L = { tables: ['Скільки столів у залі', 'від 1 до 200'], discMax: ['Макс. знижка офіціанта, %', 'від 0 до 100'], scanMin: ['Хвилин на замовлення після QR', 'від 10 до 600'], foodCost: ['Цільовий фудкост, %', 'від 5 до 90'], priceAlert: ['Сповіщати про подорожчання від, %', 'від 1 до 100'], lateMin: ['Запізнення — після скількох хвилин', 'від 0 до 120'], lateFine: ['Штраф за запізнення, ₴', '0 — без штрафу'], dayH: ['О котрій закінчується робочий день (година)', 'від 0 до 8, напр. 3'] }[k]; const v = await ask(L[0], L[1], 'number'); if (v != null && v !== '') { await act('cfgSet', { k, v: +v }, '⚙️ Збережено'); loadView(); loadState().catch(() => {}); } break; }
      case 'kpct': { const v = await ask('Частка кухні від чайових, %', 'Напр. 20', 'number'); if (v != null) { await act('kitchenPct', { pct: +v }, '👨‍🍳 Збережено'); loadView(); } break; }
      case 'regSet': { const v = await ask(`Новий код реєстрації (${{ admin: 'адмін', cook: 'кухар', courier: 'кур\'єр' }[el.dataset.r] || 'офіціант'})`, '4 цифри', 'number'); if (v) { await act('regCode', { role: el.dataset.r, code: v }, '🆕 Код змінено'); loadView(); } break; }
      case 'staffDel': if (await confirmBox('Видалити працівника?', 'Його PIN перестане працювати')) { await act('staffDel', { id: el.dataset.id }); loadView(); } break;
      case 'wOut': await act('waiterOut', { uid: el.dataset.uid }, 'Вийшов із бота'); loadView(); break;
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
  // 🧮 Розрахунок: кліки, введення
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
      if (d.k === 'cost' && x && !x.semi) { (K.card.costCh ||= {})[x.id] = v; x.cost = v; K.card.items.forEach((o, j) => { if (j !== i && o.id === x.id) { const e2 = document.querySelector(`[data-cl="${j}"][data-k="cost"]`); if (e2) e2.value = t.value; } }); }
      if (d.k === 'net') { const z = lo(); l.q = z < 100 ? r3(v / k / (1 - z / 100)) : 0; const qi = t.closest('.cl')?.querySelector('[data-k="q"]'); if (qi) qi.value = l.q ? r3(l.q * k) : ''; }
      skCardCalc();
    }
    if (d.ch && K.card && t.tagName === 'INPUT' && t.type !== 'checkbox') { K.card[d.ch] = t.value; skCardCalc(); }
  });
  document.addEventListener('change', async e => {
    const t = e.target, K = S.sk, d = t.dataset || {};
    if (t.id === 'skCat') { K.cat = t.value; renderMain(); }
    if (t.id === 'skPhoto' || t.id === 'skPhoto2') { skPhotos(t.files); t.value = ''; }
    if (t.id === 'skBench') { skBench(t.files); t.value = ''; }
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
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('pos-sw.js').catch(() => {}); } catch {} // 📴 каса відкривається й без інтернету
  async function start() {
    offBanner(); setTimeout(offFlush, 1500);
    $('#login').hidden = true; $('#app').hidden = false;
    renderNav(); $('#main').innerHTML = '<div class="muted">Завантаження…</div>';
    try { await loadState(); } catch (e) { console.error('start', e); return; }
    if (!isCour()) loadMenu().catch(() => {});
    connect();
    document.body.classList.toggle('cook', isCook()); document.body.classList.toggle('adm', isAdmin()); document.body.classList.toggle('cour', isCour());
    if (isCook()) { S.view = 'kq'; renderNav(); loadKq().catch(() => {}); kitchenGate(); }
    if (isCour()) { S.view = 'go'; renderNav(); loadCour().catch(() => {}); }
  }
