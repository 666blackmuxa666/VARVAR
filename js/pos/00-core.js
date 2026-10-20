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
    tw: {}, packAdj: {}, kst: store.get('kst', ''), open: 0, carts: store.get('carts', {}), coms: {}, grp: store.get('grp', ''), cat: '', q: '', fav: [], groups: [], photos: store.get('photos', true), shift: null, shown: new Set(), rep: { p: 'd', pay: '', by: '', grp: '', cat: '', t: '', q: '', tab: 'overview', sort: 's', fo: false }, mobileMenu: false, data: {}, kq: [], kqSeen: null, kqCanc: new Set(), ur: {}, kFont: store.get('kfont', 1), seen: new Set(), ready: false, live: false,
  };
  // 🏪 бренд закладу (лого й назва) — приходить разом зі state, пам'ятається для вікна входу; VARVAR — свій логотип
  S.brand = store.get('brand', null);
  const brandIni = () => esc((S.brand?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
  const brandImg = () => S.brand?.logo ? `<img class="own" src="${esc(S.brand.logo)}" alt="" onerror="this.outerHTML='<b class=&quot;brand-t&quot;>${brandIni()}</b>'">` : !VENUE ? '<img src="printer/logo.png" alt="VARVAR">' : `<b class="brand-t">${brandIni()}</b>`;
  function applyBrand() {
    const nm = S.brand?.name || (VENUE ? '' : 'VARVAR'); document.title = (nm ? nm + ' — ' : '') + 'каса';
    const li = $('.logo-img'); if (li) { if (S.brand?.logo) { li.src = S.brand.logo; li.classList.add('own'); li.hidden = false; } else if (VENUE) li.hidden = true; }
    const at = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (at) at.content = nm || 'Каса'; // 📱 підпис іконки на головному екрані
    const mf = document.querySelector('link[rel="manifest"]'); if (mf && nm) { const b = new URL('.', location.href).href; mf.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify({ name: nm + ' — каса', short_name: nm, start_url: b + 'pos.html', scope: b, id: b + 'pos.html', display: 'standalone', background_color: '#0b0b0d', theme_color: '#0b0b0d', orientation: 'any', icons: [{ src: b + 'img/app/pos.png', sizes: '512x512', type: 'image/png' }] })); }
    const sub = $('#loginBrand'); if (sub) sub.textContent = VENUE || S.brand?.logo ? nm : '';
  }
  applyBrand();
  const realAdmin = () => S.me?.role === 'admin';
  // 🔑 у розділі, на який працівнику видано право (галочки), він бачить адмінські кнопки; сервер все одно перевіряє кожну дію
  const VIEW_PERM = { cash: ['cash'], reports: ['reports'], calc: ['stock'], team: ['staff', 'pay'], settings: ['settings', 'print'], closed: ['void', 'edit_closed'] };
  const isAdmin = () => realAdmin() || (!!S.me?.can?.length && (VIEW_PERM[S.view] || []).some(k => S.me.can.includes(k))), isCook = () => S.me?.role === 'cook', isCour = () => S.me?.role === 'courier';
  const setHTML = (el, html) => { if (el && el._h !== html) { el._h = html; el.innerHTML = html; } };

  // ---------- API ----------
  // 📴 офлайн: основні дії залу й кухні без зв'язку стають у чергу на пристрої (з qid — сервер не виконає двічі) і відправляються по черзі, щойно зв'язок повернеться.
  // Поки дія в черзі, стіл показується вже зміненим (⏳) — офіціант бачить замовлене, а не порожній стіл.
  const QOPS = new Set(['order', 'close', 'remove', 'move', 'split', 'discount', 'kDone', 'kStart', 'evAck']), qidNew = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const QN = { order: 'замовлення', close: 'закриття', remove: 'скасування', move: 'перенесення', split: 'розділення', discount: 'знижка', kDone: 'готово', kStart: 'кухня', evAck: 'підтвердження' };
  const offQ = () => store.get('offq', []), offSave = q => { store.set('offq', q); offBanner(); };
  const netErr = e => e instanceof TypeError || /не відповідає|fetch|network|load failed/i.test(e?.message || '');
  const offNow = () => S.offline || navigator.onLine === false;
  // ⏱ скільки каса без зв'язку: понад OFF_LONG — червона підказка «увімкніть роздачу з телефона» (фіскальні чеки без зв'язку не видаються);
  // після повернення зв'язку — один запис у стрічку подій (без Telegram), щоб власник бачив, коли й скільки каса була офлайн
  const OFF_LONG = 2 * 60e3;
  function offBanner() {
    const n = offQ().length; let el = $('#offq');
    let t0 = +store.get('offAt', 0);
    if (S.offline && !t0) store.set('offAt', t0 = Date.now());
    if (!S.offline && t0) { store.set('offAt', 0); const dur = Date.now() - t0; if (dur >= OFF_LONG && dur < 12 * 3600e3 && S.token) fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op: 'offLog', from: t0, to: Date.now(), n }) }).catch(() => {}); t0 = 0; }
    if (!n && !S.offline) { el?.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'offq'; document.body.append(el); }
    const at = S.offline && S.cacheAt ? ` · дані на ${new Date(S.cacheAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}` : '';
    const long = S.offline && t0 && Date.now() - t0 >= OFF_LONG; el.classList.toggle('long', !!long);
    el.textContent = long ? `📴 Немає зв'язку ${Math.round((Date.now() - t0) / 60e3)} хв — фіскальні чеки не видаються. Увімкніть роздачу інтернету з телефона (Налаштування → Точка доступу)${n ? ` · у черзі ${n} — відправимо самі` : ''}`
      : `📴 ${S.offline ? 'Немає зв\'язку — каса працює' : 'Відправляю…'}${n ? ` · у черзі ${n} ${n === 1 ? 'дія' : n < 5 ? 'дії' : 'дій'} — відправимо самі` : ''}${at}`;
  }
  setInterval(() => { if (S.offline) offBanner(); }, 30e3); // лише оновлює текст підказки, без запитів
  // ⏳ накласти дії з черги на останній відомий стан залу (кеш або свіжий — сервер їх ще не бачив)
  function offOverlay() {
    const q = offQ(); if (!q.length || !S.tables) return; const by = {}; (S.menu?.categories || []).forEach(c => c.items.forEach(i => { by[i.id] = i; }));
    const tb = t => S.tables[t] ||= { t, total: 0, pay2: 0, items: [], log: [], orders: 0, opened: Date.now() };
    const add = (b, name, q, sum) => { const k = b.total ? b.pay2 / b.total : 1, r = b.items.find(z => z.name === name); if (r) { r.q += q; r.sum += sum; r.off = 1; } else b.items.push({ name, q, sum, off: 1 }); b.total += sum; b.pay2 = Math.round(b.pay2 + sum * k); b.off = 1; };
    const sub = (b, name, q) => { const r = b.items.find(z => z.name === name); if (!r) return 0; q = Math.min(q, r.q); const u = Math.round(r.sum / r.q), k = b.total ? b.pay2 / b.total : 1; r.q -= q; r.sum -= u * q; b.total -= u * q; b.pay2 = Math.round(b.pay2 - u * q * k); if (r.q <= 0) b.items = b.items.filter(z => z !== r); b.off = 1; return u * q; };
    for (const x of q) { const d = x.data || {}, t = +d.t;
      if (x.op === 'order' && t > 0) { const b = tb(t), lines = [];
        for (const it of d.items || []) { const m = by[it.id]; if (!m) continue; const v = m.variants ? m.variants.find(z => z.v === it.v) || m.variants[0] : null, name = m.name.uk + (v ? ` ${v.v} ${m.size || 'л'}`.trimEnd() : ''), sum = (v ? v.p : m.price) * it.q; add(b, name, it.q, sum); lines.push(`${it.q}× ${name} — ${sum}`); }
        b.log = [...(b.log || []), { lines, comment: d.comment || '', off: 1, at: x.at }]; b.orders = (b.orders || 0) + 1; }
      else if (!S.tables[t]) continue;
      else if (x.op === 'remove') sub(S.tables[t], d.name, 1);
      else if (x.op === 'close') delete S.tables[t];
      else if (x.op === 'discount') { const b = S.tables[t]; b.disc = +d.pct || 0; b.pay2 = Math.round(b.total * (1 - b.disc / 100)); b.off = 1; }
      else if (x.op === 'move' && +d.to) { const a = S.tables[t]; delete S.tables[t]; const b = S.tables[+d.to]; if (b) { a.items.forEach(z => add(b, z.name, z.q, z.sum)); b.log = [...(b.log || []), ...(a.log || [])]; } else S.tables[+d.to] = { ...a, t: +d.to, off: 1 }; }
      else if (x.op === 'split' && +d.to) { const a = S.tables[t], b = tb(+d.to); for (const z of d.items || []) { const s = sub(a, z.name, z.q); if (s) add(b, z.name, z.q, s); } if (!a.items.length) delete S.tables[t]; }
    }
  }
  // 🧾 пречек без зв'язку: на екрані (показати гостю) і на принтер цього планшета, якщо підключено
  async function offPre(t) {
    const b = S.tables[t]; if (!b?.items?.length) return toast('Стіл порожній');
    const now = new Date().toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), due = b.pay2 + (b.tip || 0);
    const lines = [['cfg', 80, 100, 120], ['big', S.brand?.name || 'Рахунок'], ['c', `Стіл ${tn(t)} · ${now}`], ['c', 'ПРЕЧЕК · не фіскальний чек'], ['hr'], ...b.items.map(it => ['item', `${it.q}× ${it.name}`, money(it.sum)]), ['hr'], ...(b.disc ? [['lr', `Знижка ${b.disc}%`, '−' + money(b.total - b.pay2)]] : []), ...(b.tip ? [['lr', 'Чайові', money(b.tip)]] : []), ['total', 'ДО СПЛАТИ', money(due)], ['gap'], ['gap']];
    let pr = ''; if (window.TABP?.has()) try { await TABP.print(lines); pr = '🖨 Надруковано на принтері планшета. '; } catch (e) { pr = '⚠️ Принтер: ' + e.message + '. '; }
    modal({ title: `🧾 Пречек · стіл ${tn(t)}`, text: `📴 Немає зв'язку з сервером. ${pr}Покажіть гостю екран.`, body: `<div class="rows">${b.items.map(it => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} × ${Math.round(it.sum / it.q)} ₴</small></div><b class="money">${money(it.sum)}</b></div>`).join('')}${b.disc ? `<div class="row"><div class="nm">Знижка ${b.disc}%</div><b class="money">−${money(b.total - b.pay2)}</b></div>` : ''}<div class="row"><div class="nm"><b>До сплати</b></div><b class="money" style="font-size:1.3em">${money(due)}</b></div></div>`, buttons: [{ label: 'Закрити', val: 1 }] });
  }
  let flushing = false;
  async function offFlush() {
    if (flushing || !offQ().length || !S.token) return; flushing = true; let sent = 0;
    try {
      for (const x of offQ()) {
        let r; try { r = await withTimeout(fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op: x.op, ...x.data }) }), 15000); } catch (e) { S.offline = true; offBanner(); return; }
        S.offline = false;
        if (r.status === 401 || r.status >= 500) { offBanner(); return; } // не увійшли / сервер оновлюється — дія лишається в черзі, спробуємо пізніше
        offSave(offQ().filter(y => y.data.qid !== x.data.qid)); sent++;
        if (!r.ok) { const j = await r.json().catch(() => ({})); toast(`⚠️ З черги не пройшло (${QN[x.op] || x.op}${x.data.t ? ' стіл ' + tn(x.data.t) : ''}): ${errText(j.error || r.status)}`); }
      }
      if (sent) toast('📶 Зв\'язок є — черга відправлена'); loadState().catch(() => {}); if (S.view === 'kq' || isCook()) loadKq().catch(() => {});
    } finally { flushing = false; offBanner(); }
  }
  const offKick = () => { if (offQ().length) offFlush(); else if (S.offline && S.token) loadState().catch(() => {}); };
  addEventListener('online', offKick); addEventListener('offline', () => { S.offline = true; offBanner(); });
  setInterval(() => { if (offQ().length) offFlush(); }, 20000); // перевірка — лише коли є черга
  const queue = (op, data) => { S.offline = true; offSave([...offQ(), { op, data, at: Date.now() }]); try { offOverlay(); render(); } catch {} return { ok: true, queued: true }; };
  async function api(op, data = {}, ms = 12000) {
    if (QOPS.has(op) && !data.qid) data = { ...data, qid: qidNew() };
    // 📴 уже відомо, що зв'язку нема, — у чергу одразу (не чекати 12 с на кожну дію); зв'язок перевірить сама черга
    if (QOPS.has(op) && offNow() && !(op === 'order' && !data.t)) { const r = queue(op, data); setTimeout(offFlush, 500); return r; }
    let r;
    try { r = await withTimeout(fetch(API + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: JSON.stringify({ op, ...data }) }), QOPS.has(op) ? 8000 : ms); }
    catch (e) { if (QOPS.has(op) && netErr(e) && !(op === 'order' && !data.t)) return queue(op, data); if (netErr(e)) { S.offline = true; offBanner(); if (op === 'state' || op === 'menu') { const c = store.get('cache_' + op, null); if (c) { if (op === 'state') S.cacheAt = c._at || 0; offBanner(); return c; } } } throw e; } // без зв'язку — останній відомий стан залу й меню
    if (S.offline) { S.offline = false; S.cacheAt = 0; offBanner(); if (offQ().length) setTimeout(offFlush, 300); }
    if (r.status === 404 && VENUE) { try { localStorage.removeItem('pos_venue2'); } catch {} location.replace(location.pathname); } // 🏪 заклад не знайдено — назад до VARVAR
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && op !== 'login') { logout(true); throw new Error('auth'); }
    if (!r.ok) { const e = new Error(j.error || 'error'); e.data = j; throw e; }
    if ((op === 'state' || op === 'menu') && r.ok) try { store.set('cache_' + op, op === 'state' ? { ...j, _at: Date.now() } : j); } catch {} // 📴 для запуску без інтернету
    return j;
  }
  const act = async (op, data, okMsg) => { try { const r = await api(op, data); if (r?.queued && op !== 'order' && op !== 'close') toast(`📴 ${okMsg || QN[op] || 'Дія'} — без зв'язку, у черзі, відправимо самі`); else if (okMsg) toast(okMsg); return r; } catch (e) { if (e.message !== 'auth') toast('⚠️ ' + errText(e.message)); return null; } };
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
  let regCodeV = '', regRoleV = '';
  function showReg(role, code) {
    regCodeV = code; regRoleV = role; pin = ''; dots(); { const adm = role === 'admin'; $('#rPin').placeholder = adm ? 'Придумайте PIN — 6–8 цифр' : 'Придумайте PIN — 4 цифри'; }
    $('#pinView').hidden = true; $('#regView').hidden = false;
    $('#loginSub').textContent = 'Реєстрація працівника';
    $('#regRole').textContent = role === 'admin' ? '🔐 Новий адміністратор' : role === 'cook' ? '👨‍🍳 Новий кухар' : role === 'courier' ? '🛵 Новий кур\'єр' : '🧑‍🍳 Новий офіціант';
    $('#lErr').textContent = ''; $('#rName').value = ''; $('#rPin').value = ''; $('#rPin2').value = ''; setTimeout(() => $('#rName').focus(), 50);
  }
  document.querySelectorAll('.pin4').forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 8); }));
  $('#regBack').onclick = () => { $('#regView').hidden = true; $('#pinView').hidden = false; $('#loginSub').textContent = 'Введіть свій PIN'; $('#lErr').textContent = ''; };
  $('#regView').onsubmit = async e => {
    e.preventDefault();
    const name = $('#rName').value.trim(), p1 = $('#rPin').value.trim(), p2 = $('#rPin2').value.trim();
    if (!(regRoleV === 'admin' ? /^\d{6,8}$/ : /^\d{4}$/).test(p1)) { $('#lErr').textContent = regRoleV === 'admin' ? 'PIN адміністратора — від 6 до 8 цифр' : 'PIN — рівно 4 цифри'; return; }
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
    if (!S.tpInit && window.TABP) { S.tpInit = 1; TABP.init({ api, toast, ask, base: API }); } // 📱 принтер планшета (js/tabprint.js)
    S.me = { ...S.me, ...r.me }; S.myTip = r.myTip; S.myAtt = r.myAtt || null; S.books = r.books || []; S.wl = r.wl || []; S.bkNew = r.bkNew || 0; if (r.brand && JSON.stringify(r.brand) !== JSON.stringify(S.brand)) { S.brand = r.brand; store.set('brand', r.brand); applyBrand(); } S.gInN = r.gInN || 0; S.cfg = r.cfg || S.cfg; S.n = r.n; S.printer = r.printer; S.shift = r.shift;
    S.tables = Object.fromEntries(r.tables.map(b => [b.t, b])); offOverlay(); // ⏳ дії з офлайн-черги — на екрані вже зараз
    const fresh = r.events.filter(e => !S.seen.has(e.id));
    if (S.ready && fresh.some(e => ['guest', 'check', 'call'].includes(e.k) || (!isCook() && ['ready', 'kmsg'].includes(e.k)))) ding();
    r.events.forEach(e => S.seen.add(e.id));
    const prevEv = S.events; S.events = r.events; if (S.ready) evNotify(prevEv); S.ready = true; if (!S._tk0) { S._tk0 = 1; loadMyTasks(); loadLookV(); if (location.hash === '#course') { S.view = 'course'; history.replaceState(null, '', location.pathname + location.search); renderNav(); renderMain(); } /* 🎓 посилання з бота */ if (OPEN_SET && isAdmin()) { S.view = 'settings'; S.setTab = OPEN_SET; renderNav(); renderMain(); loadView(); } }
    if (isCour() && S.view === 'go') renderMain(); // 🛵 нові доставки й «готово» — одразу на екрані кур'єра
    render();
  }
  async function loadMenu() { const r = await api('menu'); S.menu = r.menu; S.fav = r.fav || []; S.groups = r.groups || []; if (offQ().length && S.ready) loadState().catch(() => {}); /* ⏳ назви й ціни страв із черги */ if (S.open) renderSheet(); if (['stop', 'menu', 'reports', 'calc'].includes(S.view)) renderMain(); }
  let ws, wsTimer, pingT, reloadT, lastMsg = 0, wsBack = 2000; const pendKeys = new Set();
  // iPhone «на головному екрані» присипляє застосунок: зʼєднання тихо вмирає — перепідключаємось і перечитуємо стан
  function revive() { if (!S.token) return; S.live = false; liveDot(); try { ws.onclose = null; ws.close(); } catch {} clearInterval(pingT); connect(); }
  function connect() {
    try { ws?.close(); } catch {}
    ws = new WebSocket(API.replace(/^http/, 'ws') + '/api/pos/live?token=' + S.token);
    ws.onopen = () => { S.live = true; wsBack = 2000; lastMsg = Date.now(); liveDot(); if (offQ().length) offFlush(); clearInterval(pingT); pingT = setInterval(() => { if (Date.now() - lastMsg > 45000) return revive(); ws.readyState === 1 && ws.send('ping'); }, 15000); loadState().catch(() => {}); };
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
        if (m.keys.some(k => k !== 'tpq')) loadState().catch(() => {}); // лише черга планшета — без перезавантаження стану
        if (m.keys.includes('menu') || m.keys.includes('fav')) loadMenu().catch(() => {});
        if (m.keys.includes('kq') && (isCook() || S.view === 'kq')) loadKq().catch(() => {});
        if (m.keys.includes('tpq')) window.TABP?.check();
        if (m.keys.includes('lookv')) loadLookV();
        if (m.keys.includes('task')) { loadMyTasks(); if (S.view === 'team' && S.zpTab === 'plan' && !$('#modal')) tkLoad(); } // 📋 план на день
        if (S.view === 'team' && m.keys.some(k => ['att', 'plan', 'pay', 'swaps', 'staff'].includes(k)) && !$('#modal')) loadView(true);
        if (S.view === 'calc' && m.keys.some(k => ['ing', 'cards', 'stk', 'invl', 'sups', 'cntl', 'cnt'].includes(k)) && !skBusy()) loadView(true);
        if (['closed', 'reports', 'settings', 'cash'].includes(S.view) && m.keys.some(k => ['closed', 'day', 'exp', 'staff', 'shift', 'z', 'mov', 'tipbal', 'tippay', 'void', 'kq'].includes(k) || (k === 'bill' && S.view === 'cash'))) loadView(true);
      }, 120);
    };
    ws.onclose = () => { S.live = false; liveDot(); clearInterval(pingT); clearTimeout(wsTimer); if (S.token) { wsTimer = setTimeout(connect, wsBack); wsBack = Math.min(wsBack * 2, 30000); } }; // без звʼязку — рідше: 2→4→…→30 с
  }
  const liveDot = () => { $('#live').className = 'live' + (S.live ? ' on' : ''); };
  setInterval(() => { if (S.token && !S.live && document.visibilityState === 'visible') loadState().catch(() => {}); }, 15000); // запасний варіант без WebSocket
  const wake = () => { if (document.visibilityState !== 'visible' || !S.token) return; loadState().catch(() => {}); if (!S.live || Date.now() - lastMsg > 20000) revive(); };
  { // 👉 Телефон: свайп від правого краю на екрані столів — відкрити стрічку; свайп вправо по стрічці — закрити
    let sx = 0, sy = 0, mode = '';
    document.addEventListener('touchstart', e => { const t = e.touches[0], f = $('#feed'); mode = ''; if (!f || innerWidth > 980 || e.touches.length > 1) return; sx = t.clientX; sy = t.clientY;
      if (f.classList.contains('open')) mode = f.contains(e.target) ? 'close' : ''; else if (S.view === 'hall' && !S.open && !document.querySelector('.modal-bg,.modal') && sx > innerWidth - 24 && !e.target.closest('input,textarea,[style*="overflow"],.zones,.tabs,.nav,.f3w')) mode = 'open'; }, { passive: true });
    document.addEventListener('touchend', e => { if (!mode) return; const t = e.changedTouches[0], dx = t.clientX - sx, dy = Math.abs(t.clientY - sy), f = $('#feed');
      if (dy < 50 && Math.abs(dx) > dy * 2 && (mode === 'open' ? dx < -60 : dx > 70)) f.classList.toggle('open', mode === 'open'); mode = ''; }, { passive: true });
  }
  { // 📱 Телефон: нижній лист (.modal) закривається свайпом вниз — як підказує «ручка» зверху
    let d = null;
    const atTop = (t, m) => { for (let n = t; n && n !== m.parentNode; n = n.parentNode) if (n.scrollTop > 0) return false; return true; };
    document.addEventListener('touchstart', e => { d = null; if (innerWidth > 600 || e.touches.length > 1) return; const m = e.target.closest?.('.modal-bg > .modal'); if (!m || e.target.closest('input[type=range],textarea,canvas,.nodrag')) return;
      const p = e.touches[0]; if (p.clientY - m.getBoundingClientRect().top > 70 && !atTop(e.target, m)) return; d = { m, y: p.clientY, x: p.clientX, dy: 0, on: false }; }, { passive: true });
    document.addEventListener('touchmove', e => { if (!d) return; const p = e.touches[0], dy = p.clientY - d.y, dx = Math.abs(p.clientX - d.x);
      if (!d.on) { if (dx > 12 && dx > dy || dy < -6) { d = null; return; } if (dy > 10) d.on = true; else return; }
      d.dy = Math.max(0, dy); d.m.style.transition = 'none'; d.m.style.transform = `translateY(${d.dy}px)`; }, { passive: true });
    document.addEventListener('touchend', () => { if (!d) return; const { m, dy, on } = d; d = null; if (!on) return;
      if (dy > Math.min(120, m.offsetHeight * .25)) { const bg = m.parentNode; m.style.transition = 'transform .18s'; m.style.transform = 'translateY(100%)'; navigator.vibrate?.(8);
        setTimeout(() => { bg.dispatchEvent(new MouseEvent('click', { bubbles: true })); if (bg.isConnected) { m.style.transform = ''; } }, 170); }
      else { m.style.transition = 'transform .2s'; m.style.transform = ''; setTimeout(() => { m.style.transition = ''; }, 220); } });
  }
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
  const THEMES = VVSkin.THEMES; /* 🎨 палітри — спільні з кабінетом (js/skin.js) */
  const FONTS = { system: ['Системний (iOS)', ''], inter: ['Inter', 'Inter'], manrope: ['Manrope', 'Manrope'], rubik: ['Rubik', 'Rubik'], nunito: ['Nunito', 'Nunito'], montserrat: ['Montserrat', 'Montserrat'], roboto: ['Roboto', 'Roboto'], comfortaa: ['Comfortaa', 'Comfortaa'], mono: ['JetBrains Mono', 'JetBrains Mono'], pt: ['PT Sans', 'PT Sans'] };
  const look = () => ({ theme: 'night', font: 'system', nfont: 'same', size: 100, radius: 'round', sound: 'classic', vol: 70, anim: 1, accent: '', ...store.get('look', {}) });
  function applyLook() {
    const L = look(), r = document.documentElement.style;
    const base = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';
    r.setProperty('--font', base); r.setProperty('--nfont', 'var(--font)'); r.setProperty('--r', '18px'); r.setProperty('--r2', '24px');
    document.body.style.zoom = L.size === 100 ? '' : L.size / 100;
    applySkin();
  }
  // 🎨 вигляд = стиль (форма) + кольори; заклад — на сервері (lookv), свій — лише на пристрої. Одна студія з кабінетом (VVSkin.studio)
  const { BASE: SK_BASE, PRE: SK_PRE } = VVSkin;
  const lookDev = () => { const L = look(); return { own: L.own ? 1 : 0, sk: 'sk' in L ? L.sk : undefined, ct: L.theme, ca: L.accent }; };
  const skinOf = () => VVSkin.resolve(S.lookV, lookDev()).K;
  function applySkin(over) { const K = over ? (VVSkin.apply(over), over) : VVSkin.paint(S.lookV, lookDev()); document.body.classList.toggle('noanim', (K && !K.anim) || !look().anim); }
  async function loadLookV() { try { const r = await api('lookV'); S.lookV = r.look || null; applyLook(); } catch {} }
  const setLook = (k, v) => { store.set('look', { ...look(), [k]: v }); applyLook(); renderMain(); };
  applyLook();

  // ---------- каркас ----------
  const NAV_COOK = [['kq', '👨‍🍳', 'Черга'], ['calc', '📦', 'Склад'], ['stop', '⛔', 'Стоп-лист'], ['hall', '🪑', 'Зал'], ['course', '🎓', 'Навчання']];
  // порядок: обслуговування (зал, броні, кухня) → гроші (каса, звіти) → бек-офіс (склад, персонал) → налаштування
  const NAV_A = [['hall', '🪑', 'Зал'], ['books', '📅', 'Броні'], ['kq', '👨‍🍳', 'Кухня'], ['cash', '💰', 'Каса'], ['reports', '📊', 'Звіти'], ['calc', '📦', 'Склад'], ['team', '👥', 'Персонал'], ['settings', '⚙️', 'Налашт.'], ['course', '🎓', 'Навчання']];
  const NAV_MAIN = ['hall', 'kq', 'cash', 'books']; // 📱 адмін на телефоні: 4 основні + «⋯ Ще»
  const NAV_W = [['hall', '🪑', 'Зал'], ['books', '📅', 'Броні'], ['closed', '🧾', 'Чеки'], ['stop', '⛔', 'Стоп-лист'], ['course', '🎓', 'Навчання']];
  const NAV_COUR = [['go', '🛵', 'Доставки'], ['course', '🎓', 'Навчання']];
  // 🔑 права з галочками: S.me.can — повний набір ключів (сервер perm.js); без нього (старий кеш) — за роллю
  const can = k => S.me?.can ? S.me.can.includes(k) : realAdmin();
  // 🧩 Ф13 модулі закладу: немає cfg.mods → старий заклад, усе увімкнено; новий заклад — лише каса
  const modOn = k => { const m = (S.data?.staff?.cfg || S.cfg)?.mods; return !m || !!m[k]; };
  const NAV_PERM = { cash: 'cash', reports: 'reports', calc: 'stock', team: 'staff', settings: 'settings' };
  const navList = () => {
    if (isCour()) return NAV_COUR; if (isCook()) return S.me?.can?.length ? [...NAV_COOK, ...NAV_A.filter(([v]) => NAV_PERM[v] && can(NAV_PERM[v]) && !NAV_COOK.some(x => x[0] === v))] : NAV_COOK;
    if (realAdmin()) return NAV_A.filter(([v]) => !NAV_PERM[v] || can(NAV_PERM[v]));
    return [...NAV_W, ...NAV_A.filter(([v]) => NAV_PERM[v] && can(NAV_PERM[v]))];
  };
  const NAV = [['hall', '🪑', 'Зал'], ['closed', '📜', 'Закриті'], ['stop', '⛔', 'Стоп-лист'], ['cash', '💰', 'Каса', 1], ['reports', '📊', 'Звіти', 1], ['kq', '👨‍🍳', 'Кухня', 1], ['calc', '🧮', 'Розрахунок', 1], ['settings', '⚙️', 'Налашт.', 1]];
  function renderNav() {
    const newCnt = S.events.filter(e => e.k === 'guest' && e.s === 'new').length;
    const attNew = realAdmin() ? S.events.filter(e => e.k === 'att' && e.s === 'new').length : 0;
    const nv = $('#nav'), nx = nv?.scrollLeft || 0, ny = nv?.scrollTop || 0; // 📱 меню гортається вбік — після перемальовки лишається на місці
    setHTML(nv, `<div class="brand">${brandImg()}</div>` +
      navList().map(([v, ic, l]) => `<button data-n="${v}" class="${S.view === v ? 'on' : ''}${realAdmin() && !NAV_MAIN.includes(v) ? ' more-i' : ''}" data-a="view" data-v="${v}"><span class="ic">${ic}</span>${l}${v === 'team' && attNew ? `<span class="badge">${attNew}</span>` : ''}${v === 'books' && S.bkNew ? `<span class="badge">${S.bkNew}</span>` : ''}</button>`).join('') +
      `<button class="feed-btn" data-a="feed"><span class="ic">🔔</span>Стрічка${newCnt ? `<span class="badge">${newCnt}</span>` : S.events.some(evMention) ? '<span class="badge">@</span>' : ''}</button>` +
      `<button class="more-btn ${realAdmin() && !NAV_MAIN.includes(S.view) ? 'on' : ''}" data-a="more"><span class="ic">⋯</span>Ще</button><div class="grow"></div><button class="fs-btn" data-a="fs" title="На весь екран"><span class="ic">⛶</span>Екран</button><button class="me" data-a="zpMy" title="Мій кабінет"><i>${S.me?.av ? `<img src="${esc(S.me.av)}" alt="">` : esc((S.me?.name || '?').slice(0, 1).toUpperCase())}${onShift() ? '<em class="sh-dot"></em>' : ''}</i>${S.taskN ? `<span class="badge" title="Завдань на сьогодні">${S.taskN}</span>` : ''}<b>${esc(S.me?.name)}</b><small>${isAdmin() ? 'адмін' : isCook() ? 'кухар' : isCour() ? 'кур\'єр' : 'офіціант'} · кабінет</small></button>` +
      `<button data-a="switch"><span class="ic">🔒</span>Вийти</button>`);
    if (nv && ny) nv.scrollTop = ny; // 📲 бокове меню планшета не відскакує нагору
    if (nv && nv.scrollWidth > nv.clientWidth) { nv.scrollLeft = nx; const on = nv.querySelector('button.on'), moved = renderNav.v !== S.view; renderNav.v = S.view; /* до активної кнопки — лише коли змінили вкладку, інакше людина гортає, а меню смикає назад */ if (on && moved && (on.offsetLeft < nv.scrollLeft || on.offsetLeft + on.offsetWidth > nv.scrollLeft + nv.clientWidth)) nv.scrollLeft = on.offsetLeft - 8; }
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
      if (S.view === 'cash' && S.cashTab === 'bank') S.data.bank = await api('bankList', { m: S.bankM || '' });
      if (S.view === 'cash' && S.cashTab !== 'checks' && S.cashTab !== 'bank') { S.data.shift = await api('shift'); if (isAdmin()) S.data.cours = await api('courList').catch(() => null); }
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
    const html = { books: booksHTML, go: goHTML, kq: kqHTML, hall: hallHTML, closed: closedHTML, stop: stopHTML, printer: printerHTML, calc: calcHTML, team: teamHTML, reports: reportsHTML, cash: cashHTML, menu: menuHTML, settings: settingsHTML, course: courseHTML, mylook: () => `<div class="rhead"><div><h1>🎨 Мій вигляд</h1><span class="muted">${isAdmin() ? 'заклад або лише цей пристрій' : 'колір і стиль лише на цьому пристрої'}</span></div></div>` + lookHTML() }[v]?.();
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
    : [['stock', '📦 Залишки'], ['inv', '🧾 Накладні'], ['sup', '🏭 Постачальники'], ['buy', '🛒 Закупівля'], ['cards', '📋 Техкарти'], ['prod', '🍳 Заготовки'], ['count', '📝 Інвентаризація'], ['rep', '📊 Плюси / мінуси'], ['ex', '🍾 Акциз'], ['menu', '📖 Меню'], ['stop', '⛔ Стоп-лист']];
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
  function toast(msg, btn) { $('.toast')?.remove(); const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; if (btn) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = btn.label; b.style.marginLeft = '10px'; b.onclick = () => { d.remove(); btn.fn(); }; d.append(b); } document.body.append(d); clearTimeout(toastT); toastT = setTimeout(() => d.remove(), btn ? 9000 : 2600); }

  document.addEventListener('change', e => { const el = e.target; if (el.dataset?.a !== 'cDate' || !el.value) return; S.cday = el.value >= S.data.ctoday ? '' : el.value; S.data.closed = null; renderMain(); loadView(); });
  document.addEventListener('change', async e => { const el = e.target; if (el.dataset?.a !== 'bkDate' || !el.value) return; S.bkDay = el.value; if (!S.data.bk?.some(b => b.date === el.value) && (el.value < addD(todayK(), -7) || el.value > addD(todayK(), 60))) { const r = await api('bkList', { from: el.value, to: el.value, all: true }).catch(() => null); if (r) S.data.bk = [...S.data.bk.filter(b => b.date !== el.value), ...r.list]; } renderMain(); });
  // ---------- кліки ----------
  // 🖱 кнопки data-a: розділ реєструє свої через on('назва', async (el, e, a, t) => {…}) — поряд зі своїм кодом, ядро не чіпати
  const ACT = {};
  function on(names, fn) { for (const x of [].concat(names)) { if (ACT[x]) console.error('🖱 дубль обробника кнопки', x); ACT[x] = fn; } }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return;
    const a = el.dataset.a, t = S.open;
    if (ACT[a]) return ACT[a](el, e, a, t); // кнопки розділів (on(…) у js/pos/NN-*.js)
    switch (a) {
      case 'view': S.view = el.dataset.v; S.q = ''; renderNav(); renderMain(); loadView(); $('#feed').classList.remove('open'); $('#main').scrollTop = 0; break;
      case 'feed': $('#feed').classList.toggle('open'); break;
      case 'fs': { const on = !document.fullscreenElement; store.set('fs', on); on ? document.documentElement.requestFullscreen?.().catch(() => {}) : document.exitFullscreen?.(); break; }
      case 'more': { const v = await choose('Ще', '', (isCook() ? navList() : realAdmin() ? navList().filter(n => !NAV_MAIN.includes(n[0])) : NAV.filter(n => !n[3] && ['stop', 'menu', 'calc'].includes(n[0]))).map(([vv, ic, l]) => ({ label: `${ic} ${l}`, val: vv })).concat([{ label: '🔔 Сповіщення', val: 'push' }, { label: '🔒 Вийти', val: 'logout', cls: 'red' }]));
        if (v === 'push') pushMenu(); else if (v === 'logout') { if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); } else if (v) { S.view = v; S.q = ''; renderNav(); renderMain(); loadView(); $('#main').scrollTop = 0; } break; }
      case 'switch': if (await confirmBox('Вийти?', 'Наступний працівник увійде своїм PIN')) logout(); break;
      case 'kFont': S.kFont = (S.kFont % 3) + 1; store.set('kfont', S.kFont); renderMain(); break;
      case 'rp': S.rep.p = el.dataset.p; loadView(); break;
      case 'rFo': S.rep.fo = !S.rep.fo; renderMain(); break;
      case 'certPay': if (await act('certPay', { code: el.dataset.c, how: el.dataset.h }, el.dataset.h === 'no' ? '❌ Скасовано' : '🎟 Сертифікат активовано')) loadState().catch(() => {}); break;
      case 'certDel': { const code = el.dataset.c; if (!(await choose('🗑 Видалити сертифікат?', code + ' — код перестане діяти. Це не можна скасувати.', [{ label: '🗑 Видалити', val: 1, cls: 'red' }, { label: 'Ні', val: 0 }]))) break; if (await act('certDel', { code }, '🗑 Видалено')) { el.closest('.kv')?.remove(); } break; }
      case 'certs': { const r = await api('certList').catch(() => null); if (!r) break; await modal({ title: '🎟 Сертифікати', body: `<div class="bk-list">${r.list.map(c => `<div class="kv"><span><b>${c.code}</b> · ${money(c.sum)}${c.left !== c.sum ? ` · залишок ${money(c.left)}` : ''}<br><small class="muted">від ${esc(c.from)}${c.to ? ' для ' + esc(c.to) : ''} · ${fmtPh(c.phone)} · ${{ new: '⏳ не оплачено', ok: '✅ активний', no: '❌ скасовано' }[c.st]}</small></span>${c.st === 'new' ? `<span class="kv-r"><button class="btn sm green" data-a="certPay" data-c="${c.code}" data-h="cash">💵</button><button class="btn sm" data-a="certPay" data-c="${c.code}" data-h="card">💳</button><button class="btn sm red" data-a="certDel" data-c="${c.code}">🗑</button></span>` : `<span class="kv-r"><button class="btn sm red" data-a="certDel" data-c="${c.code}">🗑</button></span>`}</div>`).join('') || '<div class="muted">Ще немає</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] }); break; }
      case 'goTake': if (await act('goCour', { t: +el.dataset.t }, '✋ Ваша доставка')) { await loadState().catch(() => {}); renderMain(); } break;
      case 'goRoad': if (await act('goSt', { t: +el.dataset.t, st: 'road' }, '🛵 В дорозі')) { await loadState().catch(() => {}); renderMain(); } break;
      case 'goCourSet': { const n = await ask('👤 Кур\'єр (імʼя)', S.tables[t]?.go?.cour || ''); if (n != null && await act('goCour', { t, n }, '✔')) loadState().catch(() => {}); break; }
      case 'pre': if (offNow()) { offPre(t); break; } api('precheck', { t }).then(() => toast('🖨 Пречек відправлено'), e => netErr(e) ? offPre(t) : e.message !== 'auth' && toast('⚠️ ' + errText(e.message))); break;
      case 'tip': { const b = S.tables[t]; if (!b) break; const v = await choose(`💝 Чайові — стіл ${tn(t)}`, `До сплати ${money(b.pay2)}`, [...[5, 10, 15].map(p => ({ label: `${p}% · ${money(Math.round(b.pay2 * p / 100))}`, val: String(Math.round(b.pay2 * p / 100)) })), { label: '✏️ Своя сума', val: 'own' }, ...(b.tip ? [{ label: 'Прибрати чайові', val: '0', cls: 'red' }] : [])]);
        if (v == null) break; let sum = v; if (v === 'own') { sum = await ask('Сума чайових, ₴', 'напр. 100', 'number'); if (sum == null) break; }
        await act('tip', { t, sum: +sum }, +sum ? `💝 Чайові ${money(+sum)}` : 'Чайові прибрано'); break; }
      case 'rDel': case 'rBack': {
        const k = el.dataset.k, d = el.dataset.d, i = el.dataset.i, del = a === 'rDel';
        if (del && !(await confirmBox(k === 'checks' ? 'Зняти чек з виручки? (можна повернути)' : 'Видалити запис? (можна повернути)'))) break;
        const op = { checks: del ? 'closedDel' : 'closedBack', exp: del ? 'expenseDel' : 'expenseBack', mov: del ? 'moveDel' : 'moveBack', z: del ? 'zDel' : 'zBack' }[k];
        if (await act(op, k === 'checks' ? { ref: i, day: d } : { i: +i, day: d }, del ? '🗑 Видалено' : '↩️ Повернуто')) { S.data.rangeKey = ''; loadView(); }
        break; }
      case 'accept': act('accept', { oid: el.dataset.oid }, '✅ Прийнято — пішло на кухню'); break;
      case 'cBack': if (await confirmBox('Повернути рахунок у виручку?', 'Сума, страви й чайові знову зарахуються')) { await act('closedBack', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Повернуто у виручку'); loadView(); } break;
      case 'cPrint': act('closedPrint', { ref: el.dataset.ref, day: S.data.cday }, '🖨 Чек відправлено'); break;
      case 'cRefund': if (await confirmBox(`Повернути гостю ${money(+el.dataset.s)} на картку?`, 'Гроші повернуться через LiqPay (1–7 днів), чек зніметься з виручки')) await act('closedRefund', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Повернуто гостю'); loadView(); break;
      case 'cDel': if (await confirmBox('Видалити рахунок з виручки?', 'Сума, страви й замовлення віднімуться зі звітів')) await act('closedDel', { ref: el.dataset.ref, day: S.data.cday }, '🧹 Видалено з виручки'); loadView(); break;
      case 'pQMove': { const r = await api('rcptGet', {}).catch(() => null), st = r?.route?.st || []; if (!st.length) { toast('🖨 Принтери ще не розподілені — Налаштування → 🖨 Принтер'); break; }
        closeModal(); /* вікно черги закрити — інакше два #modal і закриється не те */ const sid = await choose('🔁 Надрукувати на іншому', 'Завдання перейде на вибраний принтер', st.map(x => ({ label: '🖨 ' + x.name, val: x.id }))); if (sid && await act('printMove', { id: el.dataset.id, st: sid }, '🔁 Перенесено')) { const sm = el.closest('[data-pq]')?.querySelector('small'); if (sm) sm.textContent = sm.textContent.replace(/ · 🖨 .*$/, '') + ' · 🖨 ' + st.find(x => x.id === sid).name; } break; }
      case 'pQDel': { if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = '🗑 Точно?'; setTimeout(() => { if (el.isConnected) { delete el.dataset.sure; el.textContent = '🗑'; } }, 3000); break; }
        if (await act('printClear', { id: el.dataset.id }, '🗑 Видалено')) el.closest('[data-pq]')?.remove(); break; }
      case 'float': { const v = await ask('Розмін на початок дня', 'Сума в касі, ₴', 'number'); if (v != null) { await act('float', { sum: +v.replace(',', '.') }, '🏦 Записано'); loadView(); } break; }
      case 'expense': {
        const v = await modal({ title: '💸 Витрата', body: '<div class="form"><input id="eSum" inputmode="decimal" placeholder="Сума, ₴"><input id="eNote" placeholder="На що (напр. овочі на ринку)">' + (isAdmin() ? `<label class="muted" style="font-size:13px">📅 За день<input id="eDay" type="date" value="${todayK()}" max="${todayK()}"></label>` : '') + '</div>', buttons: [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З карти', val: 'card' }, { label: 'Скасувати', val: null }], keep: true });
        const sum = v && +$('#eSum').value.replace(',', '.'), note = v && $('#eNote').value, day = v && $('#eDay')?.value !== todayK() ? $('#eDay')?.value || '' : ''; closeModal();
        if (v && sum) { await act('expense', { sum, note, src: v, ...(day ? { day } : {}) }, day ? `💸 Витрату записано за ${day.split('-').reverse().join('.')}` : '💸 Витрату записано'); loadView(); }
        break;
      }
      case 'tipPay': { const src = await choose(`💝 Видати чайові: ${el.dataset.n}`, 'Звідки списати? Сума відніметься з готівки або картки', [{ label: '💵 Готівкою з каси', val: 'cash', cls: 'green' }, { label: '💳 З картки', val: 'card', cls: 'blue' }]);
        if (src) { await act('tipPay', { name: el.dataset.n, src }, '💝 Видано'); loadView(); loadState().catch(() => {}); } break; }
      case 'cfg': { const k = el.dataset.k, L = { tables: ['Скільки столів у залі', 'від 1 до 200'], discMax: ['Макс. знижка офіціанта, %', 'від 0 до 100'], scanMin: ['Хвилин на замовлення після QR', 'від 10 до 600'], foodCost: ['Цільовий фудкост, %', 'від 5 до 90'], recBonus: ['Премія кожному на зміні за рекорд дня, ₴', '0 — без премії'], bankFee: ['Комісія банку за карту/онлайн, %', 'від 0 до 10, напр. 1.3'], priceAlert: ['Сповіщати про подорожчання від, %', 'від 1 до 100'], lateMin: ['Запізнення — після скількох хвилин', 'від 0 до 120'], lateFine: ['Штраф за запізнення, ₴', '0 — без штрафу'], dayH: ['О котрій закінчується робочий день (година)', 'від 0 до 8, напр. 3'] }[k]; const v = await ask(L[0], L[1], 'number'); if (v != null && v !== '') { await act('cfgSet', { k, v: +String(v).replace(',', '.') }, '⚙️ Збережено'); loadView(); loadState().catch(() => {}); } break; }
      case 'kpct': { const v = await ask('Частка кухні від чайових, %', 'Напр. 20', 'number'); if (v != null) { await act('kitchenPct', { pct: +v }, '👨‍🍳 Збережено'); loadView(); } break; }
      case 'regSet': { const v = await ask(`Новий код реєстрації (${{ admin: 'адмін', cook: 'кухар', courier: 'кур\'єр' }[el.dataset.r] || 'офіціант'})`, '4 цифри', 'number'); if (v) { await act('regCode', { role: el.dataset.r, code: v }, '🆕 Код змінено'); loadView(); } break; }
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
      const v = (h.match(/pos\.build\.js\?v=(\w+)/) || [])[1];
      if (v && myVer && v !== myVer && !S.open && !$('#modal')) location.replace(location.pathname + '?v=' + v);
    } catch {}
  }
  setInterval(checkVer, 5 * 60e3); document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkVer()); setTimeout(checkVer, 3000);

  // ---------- 🔔 сповіщення в шторку (Web Push) ----------
  const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isApp = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushCan = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:';
  const installHow = () => isIOS() ? '1. Відкрийте касу в Safari\n2. Натисніть «Поділитися» (квадрат зі стрілкою)\n3. «На початковий екран» → «Додати»\n4. Відкрийте касу з іконки й увімкніть сповіщення' : '1. Відкрийте касу в Chrome\n2. Меню ⋮ → «Встановити додаток» або «Додати на головний екран»\n3. Відкрийте касу з іконки';
  const u8 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  async function pushSubNow() {
    // iPhone: дозвіл — одразу після натискання (до будь-якого запиту до сервера), інакше Safari його мовчки відхиляє
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Сповіщення заборонені — дозвольте їх у налаштуваннях телефона для каси');
    const k = S.pushK || (S.pushK = await api('pushKey')); if (!k.on) throw new Error('Сповіщення ще не налаштовані на сервері');
    const reg = await navigator.serviceWorker.register('pos-sw.js'); await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options?.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== k.key) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(k.key) });
    await api('pushSub', { sub: sub.toJSON() }); return sub;
  }
  async function pushMenu() {
    if (!S.pushK) api('pushKey').then(k => { S.pushK = k; }).catch(() => {});
    if (isIOS() && !isApp()) return modal({ title: '📲 Спершу встановіть касу', text: 'На iPhone сповіщення працюють лише в касі, встановленій на екран (iOS 16.4+).\n\n' + installHow(), buttons: [{ label: 'Зрозуміло', val: null }] });
    if (!pushCan()) return modal({ title: '🔔 Сповіщення', text: 'Цей браузер не підтримує сповіщення. Встановіть касу як додаток:\n\n' + installHow(), buttons: [{ label: 'Зрозуміло', val: null }] });
    const reg = await navigator.serviceWorker.getRegistration(), sub = await reg?.pushManager.getSubscription(), on = !!sub && Notification.permission === 'granted';
    const v = await modal({ title: on ? '🔔 Сповіщення увімкнені' : '🔔 Сповіщення в шторку', text: on ? 'Нові замовлення й важливі події приходитимуть на цей телефон, навіть коли він заблокований.' : 'Отримуйте нові замовлення й важливі події на цей телефон — навіть на заблокований екран.' + (isApp() ? '' : '\n\n💡 Краще встановити касу як додаток:\n' + installHow()), buttons: on ? [{ label: '📨 Тестове', val: 'test' }, { label: '🔕 Вимкнути', val: 'off', cls: 'red' }, { label: 'Закрити', val: null }] : [{ label: '🔔 Увімкнути', val: 'on' }, { label: 'Пізніше', val: null }] });
    try {
      if (v === 'on') { await pushSubNow(); store.set('pushAsk', 1); pushBanner(); toast('🔔 Увімкнено'); await api('pushTest'); }
      else if (v === 'test') { await api('pushTest'); toast('📨 Надіслано — перевірте шторку'); }
      else if (v === 'off') { await api('pushUnsub', { e: sub.endpoint }); await sub.unsubscribe(); toast('🔕 Вимкнено'); }
    } catch (e) { toast('⚠️ ' + (e.message || e)); }
  }
  // 📲 одна акуратна плашка: встановити касу / увімкнути сповіщення — дві кнопки, закривається назавжди
  async function pushBanner() {
    $('#pushAsk')?.remove(); if (store.get('pushAsk') || !S.me?.sid) return;
    api('pushKey').then(k => { S.pushK = k; }).catch(() => {});
    try { if (pushCan() && Notification.permission === 'granted' && await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()) return; } catch {}
    const ios = isIOS() && !isApp(), d = document.createElement('div'); d.id = 'pushAsk'; d.className = 'push-ask';
    d.innerHTML = `<div class="pa-t">🔔 ${ios ? 'Замовлення — у шторку' : 'Увімкнути сповіщення?'}</div><div class="pa-s">${ios ? 'Встановіть касу на екран телефона' : 'Нові замовлення навіть на заблокованому екрані'}</div><div class="pa-b"><button class="btn sm" data-p="no">Не зараз</button><button class="btn sm pa-ok" data-p="on">${ios ? 'Як?' : 'Увімкнути'}</button></div>`;
    d.onclick = e => { const p = e.target.dataset.p; if (!p) return; d.remove(); store.set('pushAsk', 1); if (p === 'on') ios ? pushMenu() : pushSubNow().then(() => { toast('🔔 Увімкнено'); api('pushTest').catch(() => {}); pushSwSync(); }).catch(er => toast('⚠️ ' + (er.message || er))); };
    document.body.append(d);
  }
  // ⚙️ перемикач у Налаштуваннях → Цей пристрій
  async function pushSwSync() {
    const el = $('#pushSw'); if (!el) return; if (!S.pushK && !$('#pushAllSw')) api('pushKey').then(k => { S.pushK = k; }).catch(() => {});
    let on = false; try { on = pushCan() && Notification.permission === 'granted' && !!(await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()); } catch {}
    el.classList.toggle('on', on);
    const aw = $('#pushAllSw'), ar = $('#pushAllRow'); if (aw && ar) { const k = await api('pushKey').catch(() => S.pushK || {}); S.pushK = k; aw.classList.toggle('on', !!k.all);
      ar.onclick = async () => { try { const v = !S.pushK?.all, r = await api('pushAll', { on: v }); S.pushK = { ...S.pushK, all: r.all }; aw.classList.toggle('on', r.all); toast(r.all ? (on ? '👑 Тепер приходять усі сповіщення закладу' : '👑 Увімкнено — ще увімкніть «Сповіщення в шторку» вище') : '🔕 Лише ваші сповіщення'); } catch (e) { toast('⚠️ ' + (e.message || e)); } }; }
    const row = $('#pushRow'); if (!row) return;
    row.onclick = async () => {
      if (isIOS() && !isApp() || !pushCan()) return pushMenu();
      try {
        if (!on) { await pushSubNow(); store.set('pushAsk', 1); $('#pushAsk')?.remove(); toast('🔔 Увімкнено'); api('pushTest').catch(() => {}); }
        else { const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription(); if (sub) { await api('pushUnsub', { e: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); } toast('🔕 Вимкнено'); }
      } catch (e) { toast('⚠️ ' + (e.message || e)); }
      pushSwSync();
    };
  }
  try { navigator.serviceWorker?.addEventListener('message', e => { const go = e.data?.push && e.data.go; if (go?.view) { S.view = go.view; renderNav(); renderMain(); loadView(); } }); } catch {}

  // ---------- старт ----------
  try { if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('pos-sw.js').catch(() => {}); } catch {} // 📴 каса відкривається й без інтернету
  async function start() {
    offBanner(); setTimeout(offFlush, 1500);
    $('#login').hidden = true; $('#app').hidden = false;
    renderNav(); $('#main').innerHTML = '<div class="muted">Завантаження…</div>';
    setTimeout(pushBanner, 4000); // 🔔 запропонувати сповіщення (один раз)
    try { await loadState(); } catch (e) { console.error('start', e); if (e.message === 'auth') return; // 🩺 не «вічне завантаження»: показати помилку й надіслати на сервер (видно в логах)
      $('#main').innerHTML = `<div class="card"><h3>⚠️ Каса не завантажилась</h3><div class="muted" style="word-break:break-word">${esc(String(e.message || e))}</div><button class="btn" onclick="location.reload()">🔄 Ще раз</button></div>`;
      api('jsErr', { m: String(e.message || e).slice(0, 300), st: String(e.stack || '').slice(0, 1500) }).catch(() => {}); return; }
    if (!isCour()) loadMenu().catch(() => {});
    connect();
    document.body.classList.toggle('cook', isCook()); document.body.classList.toggle('adm', isAdmin()); document.body.classList.toggle('cour', isCour());
    if (isCook()) { S.view = 'kq'; renderNav(); loadKq().catch(() => {}); kitchenGate(); }
    if (isCour()) { S.view = 'go'; renderNav(); loadCour().catch(() => {}); }
    else if (!isCook() && S.view !== 'hall') loadView(); // 🔁 після повторного входу лишилась інша вкладка (каса, звіти…) — підтягнути її дані, а не «Завантаження…»
  }
