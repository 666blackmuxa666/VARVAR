// 👑 Кабінет власника мережі (owner.html): вхід → мережа сьогодні → аналітика → заклади → (платформа).
// Сервер: POST /api/owner (worker/src/owner.js). Цифри рахує кожен заклад сам.
(() => {
  const API = new URLSearchParams(location.search).get('api') || (location.hostname === 'localhost' ? 'http://localhost:8787' : 'https://varvar-menu.varvar.workers.dev');
  const ATOM = /(^|\.)posatom\.online$/.test(location.hostname);
  /* 🌐 адреси сторінок закладу: на posatom.online — /<заклад>/<сторінка>, інакше — як раніше (?venue=) */
  window.VVLOC = (id, page = '') => ATOM ? `/${id}/${page}` : location.pathname.replace(/owner\.html$/, '') + page + (id === 'varvar' ? '' : (page.includes('?') ? '&' : '?') + 'venue=' + id);
  window.VVPUB = (id, page = '') => `https://posatom.online/${id}/${page === 'about.html' ? '' : page}`; /* гарна адреса для гостей і персоналу */
  const POS = location.pathname.replace(/owner\.html$/, '') + 'pos.html';
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => `${Math.round(n || 0).toLocaleString('uk-UA')} ₴`;
  const store = { get(k, d) { try { const v = localStorage.getItem('own_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('own_' + k, JSON.stringify(v)); } catch {} } };
  const S = { token: store.get('token', ''), tab: store.get('tab', 'home'), per: 'today', from: '', to: '', me: null, venues: [], seen: {}, sum: null, prev: null };
  const COLORS = ['#f2c14e', '#0a84ff', '#30d158', '#bf5af2', '#ff9f0a', '#64d2ff', '#ff375f', '#a2845e'];
  const ST = { active: '✅ активний', trial: '🧪 пробний', off: '⛔ вимкнено' };
  // 🎨 вигляд кабінету = вигляд закладу (lookv з сервера, кешовано) або свій на цьому пристрої — одна студія з касою (VVSkin.studio)
  const lookId = () => (S.venues?.find(x => x.id === 'varvar') || S.venues?.[0])?.id;
  function skApply() {
    const r = document.documentElement.style; for (const v of ['--accent', '--bg', '--bg2', '--card', '--card2', '--muted', '--font', '--r', '--r2']) r.removeProperty(v);
    window.VVSkin?.paint(store.get('vlook', null), store.get('odev', {}), false);
  }
  async function syncLook() { /* 🔗 1 запит на відкриття */
    const id = lookId(); if (!id) return;
    try { const r = await VC.vapi(id, 'lookV'); const n = r.look || null; if (JSON.stringify(n) !== JSON.stringify(store.get('vlook', null))) { store.set('vlook', n); skApply(); } } catch {}
  }
  skApply(); window.OWNSKIN = skApply;
  // 🎨 свій вигляд кабінету (лише цей пристрій); без нього — як у головного закладу
  function myLook() {
    let box = document.getElementById('olook'); if (!box) { box = document.createElement('div'); box.id = 'olook'; box.className = 'olook'; document.body.appendChild(box); box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-olx]')) box.remove(); }); }
    const draw = () => { box.innerHTML = `<div class="olook-in"><div class="olook-h"><b>🎨 Вигляд кабінету</b><button class="icobtn" data-olx title="Закрити">✕</button></div>${window.VVSkin.studio({ venue: store.get('vlook', null), dev: store.get('odev', {}), canVenue: false, only: 'dev', toast, rerender: draw,
      note: store.get('odev', {}).own ? 'Свій вигляд кабінету на цьому пристрої.' : 'Зараз кабінет — як головний заклад. Будь-яка зміна — лише для кабінету на цьому пристрої.', followL: '↩️ Як у закладу',
      setDev: d => { store.set('odev', d); skApply(); } })}</div>`; };
    draw();
  }
  window.OWNLOOK = { dev: () => store.get('odev', {}), setDev: d => { store.set('odev', d); skApply(); }, setVenue: (id, l) => { if (id === lookId()) { store.set('vlook', l); skApply(); } } };

  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3000); }
  const supLink = (u, v) => /^https:\/\/t\.me\/[a-z0-9_]+bot$/i.test(u) && v ? u + '?start=v_' + v : u; // 🛟 бот підтримки одразу бачить заклад
  async function api(op, b = {}) {
    const r = await fetch(API + '/api/owner', { method: 'POST', headers: { 'content-type': 'application/json', ...(S.token ? { authorization: 'Bearer ' + S.token } : {}) }, body: JSON.stringify({ op, ...b }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && op !== 'login') { logout(true); throw new Error('auth'); }
    if (!r.ok || j.error) throw new Error(j.error || 'Помилка ' + r.status); return j;
  }
  // дати (локальний день; межа робочого дня закладу враховується на сервері)
  const dk = d => d.toLocaleDateString('sv-SE');
  const addD = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dk(d); };
  const today = () => dk(new Date());
  const PER = { today: 'Сьогодні', yest: 'Вчора', w: '7 днів', m: 'Цей місяць', pm: 'Минулий місяць', own: '📅 Свій' };
  function range(p) {
    const t = today();
    if (p === 'today') return [t, t]; if (p === 'yest') return [addD(t, -1), addD(t, -1)]; if (p === 'w') return [addD(t, -6), t];
    if (p === 'm') return [t.slice(0, 8) + '01', t];
    if (p === 'pm') { const d = new Date(t.slice(0, 8) + '01T12:00:00'); d.setDate(0); return [dk(d).slice(0, 8) + '01', dk(d)]; }
    return [S.from || t, S.to || t];
  }

  // ---------- вхід ----------
  function logout(silent) { if (!silent) api('logout').catch(() => {}); S.token = ''; store.set('token', ''); renderLogin(); }
  async function renderLogin() {
    const hp = new URLSearchParams(location.hash.slice(1)), pos = hp.get('pos') || '', mt = hp.get('verify') ? 'verify' : hp.get('reset') ? 'reset' : '';
    if (hp.get('signup')) { // ⚡ підтвердження самореєстрації: пошта підтверджується, заклад створюється
      app.innerHTML = '<div class="login"><img class="logo" src="img/app/pos.svg" alt="ATOM"><div class="brandw">ATOM</div><h1>⏳ Створюємо ваш заклад…</h1><div class="err" id="serr"></div></div>';
      try { const r = await api('signupOk', { t: hp.get('signup') }); S.token = r.token; store.set('token', r.token); history.replaceState(null, '', location.pathname + location.search); toast(r.venue ? '🎉 Заклад створено — пробний місяць увімкнено' : '✅ Пошту підтверджено'); return start(); }
      catch (x) { $('#serr').textContent = x.message; return; }
    }
    if (mt) return renderSetPass(mt, hp.get(mt));
    let boot = false, gid = ''; try { ({ boot, gid } = await api('canBoot')); } catch {}
    app.innerHTML = `<div class="login"><img class="logo" src="img/app/pos.svg" alt="ATOM"><div class="brandw">ATOM</div><h1>${boot ? 'Перший запуск платформи' : 'Кабінет власника'}</h1>
      <p class="muted">${boot ? (pos ? 'Створіть головний акаунт — він бачитиме всі заклади й керуватиме платформою.' : 'Відкрийте цю сторінку з каси VARVAR: ⚙️ Налаштування → 👑 Кабінет власника.') : 'Усі ваші заклади, аналітика й керування — в одному місці.'}</p>
      ${boot && !pos ? '' : `<form id="lf">${boot ? '<input name="name" placeholder="Ваше ім\'я" autocomplete="name">' : ''}<input name="email" type="email" placeholder="Email" autocomplete="username" required><input name="pass" type="password" placeholder="Пароль${boot ? ' (від 8 символів)' : ''}" autocomplete="${boot ? 'new-password' : 'current-password'}" required minlength="${boot ? 8 : 1}">
      <button class="btn primary">${boot ? '🚀 Створити й увійти' : 'Увійти'}</button><div class="err" id="lerr"></div>${boot ? '' : '<a href="#" class="muted lnk" id="forgot">Забули пароль?</a>'}</form>`}${!boot && gid ? `<div class="gor">${hp.get('gnew') ? 'Реєстрація закладу через Google' : 'або'}</div><div id="gbtn" class="gbtn"><div class="btn ghost gfake"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>${hp.get('gnew') ? 'Зареєструватися з Google' : 'Увійти з Google'}</div><div class="greal" id="greal"></div></div>` : ''}</div>`;
    if (!boot && gid) gSign(gid, hp);
    $('#forgot')?.addEventListener('click', async e => { e.preventDefault(); const f = $('#lf'), err = $('#lerr'); if (!f.email.checkValidity() || !f.email.value) { err.textContent = 'Введіть email вище'; return f.email.focus(); }
      err.textContent = '…'; try { const r = await api('forgot', { email: f.email.value }); err.textContent = r.mail ? '✉️ Якщо такий акаунт є — лист з посиланням уже на пошті (перевірте «Спам»)' : 'Пошта ще не налаштована — зверніться до розробника'; } catch (x) { err.textContent = x.message; } });
    $('#lf')?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, err = $('#lerr'); err.textContent = '…';
      try { const r = await api(boot ? 'bootstrap' : 'login', { email: f.email.value, pass: f.pass.value, ...(boot ? { name: f.name.value, pos } : {}) }); S.token = r.token; store.set('token', r.token); history.replaceState(null, '', location.pathname + location.search); start(); }
      catch (x) { err.textContent = x.message; if (/Підтвердіть email/.test(x.message)) { const l = document.createElement('a'); l.href = '#'; l.className = 'lnk'; l.textContent = '✉️ Надіслати лист ще раз'; l.onclick = async ev => { ev.preventDefault(); try { await api('resend', { email: f.email.value }); err.textContent = '✉️ Надіслано — перевірте пошту'; } catch (y) { err.textContent = y.message; } }; err.append(' ', l); } }
    });
  }
  // 🇬 вхід / реєстрація через Google (скрипт Google вантажиться лише на екрані входу). Новий email → питаємо назву закладу
  function gSign(gid, hp) {
    const go = async (cred, x = {}) => { const err = $('#lerr') || $('#gerr'); if (err) err.textContent = '…';
      try { const r = await api('google', { cred, place: hp.get('place') || '', city: hp.get('city') || '', ref: hp.get('ref') || '', ...x });
        if (r.need) return gPlace(cred, r, go);
        S.token = r.token; store.set('token', r.token); history.replaceState(null, '', location.pathname + location.search); if (r.venue) toast('🎉 Заклад створено — пробний місяць увімкнено'); start();
      } catch (e) { if (err) err.textContent = e.message; } };
    const draw = () => { if (!window.google?.accounts?.id || !$('#greal')) return; // справжня кнопка Google — прозора поверх нашої (без білої рамки)
      google.accounts.id.initialize({ client_id: gid, callback: r => go(r.credential), ux_mode: 'popup', auto_select: false });
      google.accounts.id.renderButton($('#greal'), { theme: 'outline', size: 'large', shape: 'rectangular', text: hp.get('gnew') ? 'signup_with' : 'continue_with', locale: 'uk', width: Math.min(400, $('#greal').clientWidth || 320) }); };
    if (window.google?.accounts?.id) return draw();
    const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = draw; document.head.append(sc);
  }
  function gPlace(cred, r, go) { // перший вхід через Google — створюємо заклад (як самореєстрація)
    app.innerHTML = `<div class="login"><img class="logo" src="img/app/pos.svg" alt="ATOM"><div class="brandw">ATOM</div><h1>Ваш заклад</h1><p class="muted">${esc(r.name || '')} · ${esc(r.email)}<br>Для цього email ще немає кабінету. Як називається заклад? Створимо його з пробним місяцем.</p>
      <form id="gf"><input name="place" placeholder="Назва закладу" required minlength="2" maxlength="60"><input name="city" placeholder="Місто" maxlength="60"><button class="btn primary">🚀 Створити заклад</button><div class="err" id="gerr"></div><a href="#" class="muted lnk" id="gback">← Назад</a></form></div>`;
    $('#gback').onclick = e => { e.preventDefault(); renderLogin(); };
    $('#gf').addEventListener('submit', e => { e.preventDefault(); go(cred, { place: e.target.place.value, city: e.target.city.value }); });
  }
  function renderSetPass(kind, t) { // ✉️ посилання з листа
    app.innerHTML = `<div class="login"><img class="logo" src="img/app/pos.svg" alt="ATOM"><div class="brandw">ATOM</div><h1>${kind === 'verify' ? '✅ Підтвердження пошти' : '🔑 Новий пароль'}</h1><p class="muted">Придумайте пароль для входу в кабінет (від 8 символів).</p>
      <form id="pf"><input name="p" type="password" placeholder="Новий пароль" autocomplete="new-password" required minlength="8"><input name="p2" type="password" placeholder="Ще раз" autocomplete="new-password" required minlength="8"><button class="btn primary">💾 Зберегти й увійти</button><div class="err" id="perr"></div></form></div>`;
    $('#pf').addEventListener('submit', async e => { e.preventDefault(); const f = e.target, err = $('#perr'); if (f.p.value !== f.p2.value) { err.textContent = 'Паролі не збігаються'; return; } err.textContent = '…';
      try { const r = await api(kind, { t, pass: f.p.value }); S.token = r.token; store.set('token', r.token); history.replaceState(null, '', location.pathname + location.search); toast(kind === 'verify' ? '✅ Пошту підтверджено' : '✅ Пароль змінено'); start(); } catch (x) { err.textContent = x.message; } });
  }

  // ---------- дані ----------
  async function start() {
    if (!S.token) return renderLogin();
    try { const r = await api('me'); S.me = r.me; S.venues = r.venues; S.seen = r.seen || {}; S.inboxN = r.inbox || 0; } catch { return; }
    if (S.me.role === 'acc') { S.tab = 'acc'; return render(); } // 🧮 бухгалтер: лише «Мої клієнти» (owner-acc.js)
    if (location.hash === '#pay' && S.venues.length) { history.replaceState(null, '', location.pathname + location.search); let id = null; try { id = JSON.parse(localStorage.getItem('own_cfgV')); } catch {} /* 💳 повернулись з LiqPay */
      const v = S.venues.find(x => x.id === id) || S.venues.find(x => x.id !== 'varvar') || S.venues[0]; toast('💳 Дякуємо! Оплата зарахується за хвилину — оновіть сторінку'); return VC.open(v.id, 'pay'); }
    if (location.hash === '#crm' && S.me.role === 'platform') { history.replaceState(null, '', location.pathname + location.search); S.tab = 'crm'; store.set('tab', 'crm'); } // 🔔 тап по сповіщенню CRM
    if (!S.swMsg) try { S.swMsg = 1; navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.crm && S.me?.role === 'platform') { S.tab = 'crm'; store.set('tab', 'crm'); window.OWNCRM?.reset(); render(); } }); } catch {}
    if (S.tab === 'cfg' && !S.cfgV && S.venues.length === 1) return VC.open(S.venues[0].id);
    render(); if (S.tab !== 'cfg') load();
    syncLook();
  }
  async function load() {
    const [f, t] = S.tab === 'home' ? [today(), today()] : range(S.per);
    S.sum = null; render();
    try {
      const reqs = [api('sum', { from: f, to: t, pnl: S.tab === 'an' })];
      if (S.tab === 'home') { const w = addD(today(), -7); reqs.push(api('sum', { from: w, to: w })); }
      if (S.tab === 'home') reqs.push(api('dig').catch(() => ({ list: [] })));
      const [a, b, g] = await Promise.all(reqs); S.sum = a.list; S.prev = S.tab === 'home' ? b?.list || null : null; S.dig = g?.list || [];
    } catch (e) { if (e.message !== 'auth') toast('⚠️ ' + e.message); S.sum = []; }
    render();
  }

  // ---------- екрани ----------
  const kpi = (l, v, sub = '') => `<div class="kpi"><span>${l}</span><b class="money">${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const delta = (a, b) => !b ? '' : `<span class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}%</span> до мин. тижня`;
  const sumTot = l => l.reduce((a, v) => { const t = v.tot || {}; for (const k of ['rev', 'n', 'tip', 'disc', 'go', 'goRev', 'voids', 'voidSum', 'removed', 'removedSum', 'exp', 'cash', 'card', 'onl']) a[k] = (a[k] || 0) + (t[k] || 0); return a; }, {});
  function alerts(list) {
    const out = [];
    for (const v of list) {
      const n = v.now || {}, t = v.tot || {}, nm = esc(v.name);
      if (v.error) { out.push(['red', `❗ ${nm}: немає зв'язку із закладом`]); continue; }
      for (const r of v.risk || []) out.push([r.lvl, `${nm}: ${esc(r.text)}`]); // 🚨 хто, скільки, на яку суму
      if (n.inbox) out.push(['', `✉️ ${nm}: гості чекають відповіді — ${n.inbox}`]);
      if (!n.printer && (n.tables || n.go)) out.push(['', `🖨 ${nm}: принтер не на зв'язку${n.printQ ? `, у черзі ${n.printQ}` : ''}`]);
      const p = S.prev?.find(x => x.id === v.id)?.tot?.rev || 0, h = new Date().getHours();
      if (p > 0 && h >= 15 && (t.rev || 0) < p * 0.7) out.push(['', `📉 ${nm}: виручка ${money(t.rev)} — на ${Math.round((1 - (t.rev || 0) / p) * 100)}% менше, ніж минулого ${['неділі', 'понеділка', 'вівторка', 'середи', 'четверга', 'пʼятниці', 'суботи'][new Date().getDay()]}`]);
    }
    return out;
  }
  function home() {
    if (!S.sum) return '<div class="muted">Рахуємо цифри всіх закладів…</div>';
    const T = sumTot(S.sum), P = S.prev ? sumTot(S.prev) : null, now = S.sum.reduce((a, v) => { const n = v.now || {}; a.tables += n.tables || 0; a.go += n.go || 0; a.open += n.openSum || 0; a.staff += (n.onShift || []).length; a.sup += n.supDebt || 0; return a; }, { sup: 0, tables: 0, go: 0, open: 0, staff: 0 });
    const al = alerts(S.sum);
    return `<h2>🏠 Мережа сьогодні</h2><div class="kpis">
      ${kpi('Виручка', money(T.rev), delta(T.rev, P?.rev))}${kpi('Чеків', T.n || 0, T.n ? 'середній ' + money(T.rev / T.n) : '')}${kpi('Зараз у залах', money(now.open), `${now.tables} столів · ${now.go} доставок`)}${kpi('На зміні', now.staff, 'людей')}${kpi('Чайові', money(T.tip))}${kpi('Знижки', money(T.disc))}${now.sup ? kpi('💸 Винні постачальникам', money(now.sup), 'деталі — у касі: Склад → 🏭') : ''}</div>
      <h2>🧠 Запитай у даних</h2><form class="card" id="askF" style="display:grid;gap:8px"><div class="btnrow" style="flex-wrap:nowrap"><input name="q" placeholder="Напр.: який заклад заробив найбільше цього місяця і чому?" autocomplete="off"><button class="btn primary">Запитати</button></div><div class="muted" style="font-size:12px">${['Скільки заробили на доставці за тиждень?', 'Чому вчора впала виручка?', 'Які страви приносять найбільше грошей?'].map(x => `<a href="#" data-a="askEx" data-q="${esc(x)}" style="margin-right:10px">${esc(x)}</a>`).join('')}</div><div id="askA" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(S.askA || '')}</div></form>
      <h2>🚨 Тривоги ${al.length ? `<span class="muted">(${al.length})</span>` : ''}</h2>${al.length ? al.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join('') : '<div class="card muted">Усе спокійно 👌</div>'}
      ${digBlock()}
      <h2>🏪 Заклади</h2><div class="grid">${S.sum.map(venueCard).join('')}</div>`;
  }
  // 🌙 підсумок дня (щодня о 23:00): останні дні по закладах + особистий Telegram власника
  function digBlock() {
    const L = (S.dig || []).filter(v => !v.error);
    return `<h2>🌙 Підсумок дня</h2>` + (L.length ? L.map(v => `<div class="card" style="display:grid;gap:8px"><b>${esc(v.name)}</b>${v.list.length ? v.list.map((d, i) => `<details${i ? '' : ' open'}><summary>${esc(d.day.split('-').reverse().join('.'))} · <b>${money(d.rev)}</b> · ${d.n} чек.</summary><div class="muted" style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:6px">${esc(d.text.replace(/<[^>]+>/g, '').split('\n').slice(2).join('\n'))}</div></details>`).join('') : '<div class="muted">Перший підсумок з\'явиться сьогодні о 23:00</div>'}<div class="btnrow" style="flex-wrap:wrap"><button class="btn sm" data-a="digNow" data-v="${esc(v.id)}">🔄 Порахувати зараз</button><button class="btn sm" data-a="digTg" data-v="${esc(v.id)}">${v.tg ? '✈️ Telegram увімкнено' : '✈️ Надсилати в Telegram'}</button></div></div>`).join('') : '<div class="card muted">Поки немає даних</div>');
  }
  function venueCard(v) {
    const n = v.now || {}, t = v.tot || {}, meta = S.venues.find(x => x.id === v.id) || {};
    return `<div class="card venue"><div class="h"><b>${esc(v.name || meta.name)}</b><span class="st ${meta.status || v.status}">${ST[meta.status || v.status] || ''}</span></div>
      ${v.error ? '<div class="muted">❗ немає даних</div>' : `<div class="rev money">${money(t.rev)}</div><div class="muted">${t.n || 0} чеків${t.n ? ' · середній ' + money(t.rev / t.n) : ''}${t.go ? ` · 🛵 ${t.go}` : ''}</div>
      <div class="chips"><span class="chip">🪑 ${n.tables || 0} столів · ${money(n.openSum)}</span><span class="chip">👥 ${(n.onShift || []).length} на зміні</span>${n.inbox ? `<span class="chip bad">✉️ ${n.inbox}</span>` : ''}<span class="chip ${n.printer ? 'ok' : 'bad'}">🖨 ${n.printer ? 'ок' : 'офлайн'}</span>${n.zToday ? '<span class="chip ok">Z закрито</span>' : ''}</div>`}
      <div class="btnrow"><button class="btn primary sm" data-a="enter" data-v="${v.id}">Увійти в касу →</button><button class="btn sm" data-a="copy" data-u="${esc(absOf(v.id, 'pos.html'))}" title="Скопіювати посилання каси для персоналу">🔗 Каса</button><button class="btn sm" data-a="vcfgOpen" data-v="${v.id}">⚙️ Налаштувати</button></div></div>`;
  }
  function analytics() {
    const [f, t] = range(S.per);
    const seg = `<div class="seg2">${Object.entries(PER).map(([k, l]) => `<button class="${S.per === k ? 'on' : ''}" data-a="per" data-p="${k}">${l}</button>`).join('')}</div>${S.per === 'own' ? `<div class="btnrow" style="margin-bottom:12px"><input type="date" id="pf" value="${f}" style="max-width:180px"><input type="date" id="pt" value="${t}" style="max-width:180px"><button class="btn sm primary" data-a="perGo">Показати</button></div>` : ''}`;
    if (!S.sum) return `<h2>📊 Аналітика</h2>${seg}<div class="muted">Рахуємо…</div>`;
    const T = sumTot(S.sum), days = []; for (let d = f; d <= t && days.length < 62; d = addD(d, 1)) days.push(d);
    const mx = Math.max(1, ...days.map(d => S.sum.reduce((a, v) => a + (v.days?.[d]?.rev || 0), 0)));
    const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'], wdOf = d => (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7;
    const kfmt = v => !v ? '' : v >= 1e5 ? Math.round(v / 1e3) + 'к' : v >= 1e3 ? (Math.round(v / 100) / 10).toString().replace('.', ',') + 'к' : String(Math.round(v));
    const dayRev = d => S.sum.reduce((a, v) => a + (v.days?.[d]?.rev || 0), 0), n = days.length, many = n > 16, nz = days.filter(dayRev).length, avg = nz ? days.reduce((a, d) => a + dayRev(d), 0) / nz : 0;
    // 📅 як у касі: сума над стовпчиком, день і день тижня, вихідні — іншим кольором, торкніться — підказка; кілька закладів — частинами
    const chart = n > 1 ? `<div class="card"><h3>Виручка по днях</h3><div class="cread muted">Торкніться стовпчика — сума й день${avg ? ` · середнє ${money(avg)}` : ''}</div><div class="cols${many ? ' many' : ''}" onmouseover="const c=event.target.closest('.c');if(c)this.previousElementSibling.textContent=c.title" onclick="const c=event.target.closest('.c');if(c)this.previousElementSibling.textContent=c.title">${days.map((d, i) => { const r = dayRev(d), wd = wdOf(d), we = wd >= 5, t = `${WD[wd]} ${+d.slice(8)}.${d.slice(5, 7)} · ${money(r)}${S.sum.length > 1 ? ' — ' + S.sum.filter(v => v.days?.[d]?.rev).map(v => `${v.name} ${money(v.days[d].rev)}`).join(', ') : ''}`;
      return `<div class="c${we ? ' we' : ''}${r === mx && r ? ' top' : ''}" title="${esc(t)}"><b class="cv">${kfmt(r)}</b><div class="stk" style="height:${r ? Math.max(3, r / mx * 86) : 0}%">${S.sum.map((v, j) => { const x = v.days?.[d]?.rev || 0; return x ? `<i style="flex:${x}${S.sum.length > 1 ? ';background:' + COLORS[j % COLORS.length] : ''}"></i>` : ''; }).join('')}</div><small${many && i % Math.ceil(n / 10) && i !== n - 1 ? ' class="nl"' : ''}>${+d.slice(8)}<span>${WD[wd]}</span></small></div>`; }).join('')}</div>
      ${S.sum.length > 1 ? `<div class="legend">${S.sum.map((v, j) => `<span><i style="background:${COLORS[j % COLORS.length]}"></i>${esc(v.name)}</span>`).join('')}</div>` : ''}</div>` : '';
    const row = (nm, x, cls = '') => `<tr class="${cls}"><td>${nm}</td><td class="money">${money(x.rev)}</td><td>${x.n || 0}</td><td class="money">${x.n ? money(x.rev / x.n) : '—'}</td><td class="money">${money(x.tip)}</td><td class="money">${money(x.disc)}</td><td>${x.go || 0}</td><td>${x.voids || 0}</td><td>${x.removed || 0}</td><td class="money">${money(x.exp)}</td></tr>`;
    const rank = [...S.sum].sort((a, b) => (b.tot?.rev || 0) - (a.tot?.rev || 0));
    return `<h2>📊 Аналітика</h2>${seg}<div class="kpis">${kpi('Виручка', money(T.rev))}${kpi('Чеків', T.n || 0)}${kpi('Середній чек', T.n ? money(T.rev / T.n) : '—')}${kpi('💵 Готівка', money(T.cash || 0))}${kpi('💳 Безготівка', money(T.card || 0), `термінал ${money((T.card || 0) - (T.onl || 0))}<br>🌐 онлайн ${money(T.onl || 0)}`)}${kpi('🛵 Доставка', money(T.goRev), `${T.go || 0} замовлень`)}${kpi('Чайові', money(T.tip))}${kpi('Витрати з каси', money(T.exp))}${(() => { const n = S.sum.reduce((a, v) => a + (v.tot?.plan?.n || 0), 0), ok = S.sum.reduce((a, v) => a + (v.tot?.plan?.ok || 0), 0); return n ? kpi('📋 План персоналу', Math.round(ok / n * 100) + '%', `${ok} з ${n} завдань`) : ''; })()}</div>
      <div style="margin-top:12px">${chart}</div>
      ${(() => { const R = S.sum.flatMap(v => (v.risk || []).map(r => [r.lvl, `<b>${esc(v.name)}</b>: ${esc(r.text)}`])); return `<h2>🚨 Ризики за період ${R.length ? `<span class="muted">(${R.length})</span>` : ''}</h2>${R.length ? R.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join('') : '<div class="card muted">Підозрілих дій не знайдено 👌</div>'}`; })()}
      ${pnlHTML()}
      ${window.OWNAN ? OWNAN.view({ api, money, kpi, render, venues: S.venues }, [f, t]) : ''}
      <h2>🏆 Порівняння закладів</h2><div class="card tbl"><table><thead><tr><th>Заклад</th><th>Виручка</th><th>Чеків</th><th>Сер. чек</th><th>Чайові</th><th>Знижки</th><th>🛵</th><th>✏️ Відміни</th><th>🗑 Видал.</th><th>Витрати</th></tr></thead>
      <tbody>${rank.map((v, i) => row(`${['🥇', '🥈', '🥉'][i] || ''} ${esc(v.name)}`, v.tot || {})).join('')}${S.sum.length > 1 ? row('Разом', T, 'sum') : ''}</tbody></table></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Період: ${f.split('-').reverse().join('.')} – ${t.split('-').reverse().join('.')}. Прибуток: собівартість — за техкартами складу, зарплата — фонд місяця пропорційно дням (≈), витрати — з каси.</div>`;
  }
  // 💰 P&L по закладах і разом
  function pnlHTML() {
    const L = S.sum.filter(v => v.pnl && !v.pnl.error); if (!L.length) return '';
    const T = L.reduce((a, v) => { for (const k of ['rev', 'cogs', 'pay', 'exp', 'bank', 'profit', 'noCard']) a[k] = (a[k] || 0) + v.pnl[k]; return a; }, {});
    const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 + '%' : '—';
    const row = (nm, p, cls = '') => `<tr class="${cls}"><td>${nm}</td><td class="money">${money(p.rev)}</td><td class="money">${money(p.cogs)} <small class="muted">${pct(p.cogs, p.rev - (p.noCard || 0))}</small></td><td class="money">${money(p.pay)} <small class="muted">${pct(p.pay, p.rev)}</small></td><td class="money">${money(p.exp)}</td><td class="money">${money(p.bank || 0)}</td><td class="money" style="color:${p.profit >= 0 ? 'var(--green)' : 'var(--red)'}"><b>${money(p.profit)}</b> <small class="muted">${pct(p.profit, p.rev)}</small></td></tr>`;
    const top = L.length === 1 ? L[0].pnl.top : [];
    return `<h2>💰 Прибуток (P&L)</h2><div class="kpis">${kpi('Чистий прибуток', money(T.profit), 'маржа ' + pct(T.profit, T.rev))}${kpi('Собівартість', money(T.cogs), 'фудкост ' + pct(T.cogs, T.rev - T.noCard))}${kpi('Зарплата ≈', money(T.pay), pct(T.pay, T.rev) + ' від виручки')}${kpi('Витрати з каси', money(T.exp))}${T.bank ? kpi('Комісія банку', money(T.bank), 'карта + онлайн') : ''}</div>
      <div class="card tbl" style="margin-top:12px"><table><thead><tr><th>Заклад</th><th>Виручка</th><th>Собівартість</th><th>Зарплата ≈</th><th>Витрати</th><th>Комісія банку</th><th>Прибуток</th></tr></thead><tbody>${L.map(v => row(esc(v.name), v.pnl)).join('')}${L.length > 1 ? row('Разом', T, 'sum') : ''}</tbody></table></div>
      ${T.noCard ? `<div class="alert" style="margin-top:8px">⚠️ Продажі без техкарти: ${money(T.noCard)} — їх собівартість не врахована. Заповніть техкарти (каса → 📦 Склад), щоб прибуток був точним.</div>` : ''}
      ${top.length ? `<div class="card tbl" style="margin-top:12px"><h3>🏆 Що приносить найбільше грошей</h3><table><thead><tr><th>Страва</th><th>Продано</th><th>Виручка</th><th>Собівартість</th><th>Заробили</th></tr></thead><tbody>${top.map(x => `<tr><td>${esc(x.n)}</td><td>${x.q}</td><td class="money">${money(x.rev)}</td><td class="money">${money(x.cost)}</td><td class="money"><b>${money(x.m)}</b></td></tr>`).join('')}</tbody></table></div>` : ''}`;
  }
  // ⚙️ Налаштування: спершу — який заклад
  function pickVenue() {
    return `<h2>⚙️ Який заклад налаштувати?</h2><div class="grid">${S.venues.map(v => `<button class="card venue" data-a="vcfgOpen" data-v="${v.id}" style="text-align:left;cursor:pointer"><div class="h"><b>${esc(v.name)}</b><span class="st ${v.status}">${ST[v.status] || ''}</span></div><div class="muted" style="font-size:13px">${esc(v.city || '')}${v.city ? ' · ' : ''}${esc(v.id)}</div><span class="btn sm primary" style="align-self:flex-start">Налаштувати →</span></button>`).join('') || '<div class="muted">Закладів ще немає</div>'}</div>`;
  }
  function venues() {
    return `<h2>🏪 Мої заклади</h2><div class="grid">${S.venues.map(v => `<div class="card venue"><div class="h"><b>${esc(v.name)}</b><span class="st ${v.status}">${ST[v.status] || ''}</span></div>
      <div class="muted">${esc(v.city || '')}${v.city ? ' · ' : ''}адреса: <b>${esc(v.id)}</b>${S.seen[v.id] ? ` · заходили ${new Date(S.seen[v.id]).toLocaleDateString('uk-UA')}` : ''}</div>
      <div class="btnrow"><button class="btn primary sm" data-a="vcfgOpen" data-v="${v.id}">⚙️ Налаштувати</button><button class="btn sm" data-a="enter" data-v="${v.id}">Увійти в касу →</button><a class="btn sm ghost" href="${esc(siteOf(v.id, 'about.html'))}" target="_blank">🌐 Сайт</a>${v.owner === S.me.email || S.me.role === 'platform' ? `<button class="btn sm" data-a="accMan" data-v="${v.id}">🧮 Бухгалтер</button>` : ''}</div>
      <div class="kv"><span>🔗 Каса для персоналу<br><small class="muted">${esc(absOf(v.id, 'pos.html'))}</small></span><button class="btn sm" data-a="copy" data-u="${esc(absOf(v.id, 'pos.html'))}">Копіювати</button></div><div class="kv"><span>🌐 Сайт для гостей<br><small class="muted">${esc(absOf(v.id, 'about.html'))}</small></span><button class="btn sm" data-a="copy" data-u="${esc(absOf(v.id, 'about.html'))}">Копіювати</button></div></div>`).join('') || '<div class="muted">Закладів ще немає</div>'}</div>
      <h2>🔐 Акаунт</h2><div class="card"><div class="kv"><span>${esc(S.me.name)}<br><small class="muted">${esc(S.me.email)}</small></span><button class="btn sm" data-a="pass">Змінити пароль</button></div></div>`;
  }
  const absOf = (id, page) => window.VVPUB(id, page); // VARVAR — явно, щоб пристрій «забув» інший заклад // повна адреса для персоналу / гостей
  const siteOf = (id, page) => window.VVLOC(id, page);
  // 📨 Вхідні: 💡 побажання персоналу й 🆘 допомога з кас усіх закладів (платформа — усі; власник — свої)
  function inbox() {
    if (!S.ib) { api('inbox').then(r => { S.ib = r.list; render(); }).catch(e => toast('⚠️ ' + e.message)); return '<div class="muted">…</div>'; }
    const f = S.ibF || 'open', L = S.ib.filter(m => f === 'all' ? 1 : f === 'done' ? m.done : f === 'open' ? !m.done : m.kind === f && !m.done);
    const tm = t => new Date(t).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<h2>📨 Вхідні</h2><div class="chips">${[['open', 'Нові'], ['idea', '💡 Побажання'], ['help', '🆘 Допомога'], ['done', '✅ Опрацьовані'], ['all', 'Усі']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-a="ibF" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="grid">${L.map(m => `<div class="card${m.done ? ' done' : ''}"><div class="kv"><span><b>${m.kind === 'help' ? '🆘 Допомога' : '💡 Побажання'}</b> · ${esc(m.vname || m.venue)}<br><small class="muted">${esc(m.by)}${m.role ? ' · ' + esc(m.role) : ''} · ${tm(m.at)}</small></span></div>
        <p class="ib-t">${esc(m.text)}</p>${(m.chat || []).map(c => `<div class="ib-c${c.from === 'a' ? ' me' : ''}"><small class="muted">${c.from === 'a' ? '👑 ATOM' : '👤'} · ${tm(c.at)}</small><div>${esc(c.text)}</div></div>`).join('')}
        <form class="ib-say" data-id="${m.id}"><input name="t" placeholder="Відповісти ${esc(m.by.split(' · ')[0])}…" maxlength="1500" autocomplete="off"><button class="btn sm">💬</button></form><div class="btnrow"><button class="btn sm" data-a="ibDone" data-id="${m.id}">${m.done ? '↩️ Повернути' : '✅ Опрацьовано'}</button><button class="btn sm red" data-a="ibDel" data-id="${m.id}">🗑</button></div></div>`).join('') || '<div class="muted">Порожньо</div>'}</div>`;
  }
  function platform() {
    const P = S.plat;
    if (!P) { api('accts').then(r => { S.plat = { accts: r.list }; S.venues = r.venues; render(); }).catch(e => toast('⚠️ ' + e.message)); return '<div class="muted">…</div>'; }
    const all = S.venues, nameOf = e => P.accts.find(a => a.email === e)?.name || e;
    return `<h2>🌐 Платформа</h2><div class="kpis">${kpi('Закладів', all.length, `${all.filter(v => v.status === 'active').length} активних · ${all.filter(v => v.status === 'trial').length} пробних`)}${kpi('Власників', P.accts.filter(a => a.role === 'owner').length)}</div>
      <div class="card" style="margin-top:12px"><h3>💡 Як підключити нового власника</h3><div class="muted" style="font-size:14px">1) «👤 Новий власник» — email і тимчасовий пароль. 2) «➕ Новий заклад» — оберіть цього власника (або ✏️ у наявного закладу → змініть власника). 3) Надішліть людині посилання <b>${esc(location.origin + location.pathname)}</b> + email і пароль — вона заходить у свій кабінет, бачить лише свої заклади й змінює пароль («🏪 Заклади → Змінити пароль»). Керуючому / бухгалтеру — «🔐 Доступи» у його акаунта.</div></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn primary" data-a="vnew">➕ Новий заклад</button><button class="btn" data-a="anew">👤 Новий власник</button><button class="btn" data-a="vdemo">🎬 Демо-заклад</button></div>
      <h2>🏪 Усі заклади</h2><div class="grid">${all.map(v => `<div class="card venue"><div class="h"><b>${esc(v.name)}</b><span class="st ${v.status}">${ST[v.status]}</span></div>
        <div class="muted" style="font-size:13px">адреса: <b>${esc(v.id)}</b>${v.city ? ' · ' + esc(v.city) : ''}<br>👤 ${esc(nameOf(v.owner))} <span style="opacity:.7">${esc(v.owner)}</span><br>активність: ${S.seen[v.id] ? new Date(S.seen[v.id]).toLocaleDateString('uk-UA') : '—'}${v.id === 'varvar' || /^(atom-)?demo/.test(v.id) ? '' : (() => { const till = v.paidTill || Math.max(v.at || 0, Date.parse('2026-10-10T00:00:00+03:00')) + 30 * 864e5, late = till < Date.now(); return `<br>💳 ${v.paidTill ? 'оплачено' : 'пробний'} до <b style="color:${late ? '#ff6b6b' : 'inherit'}">${new Date(till).toLocaleDateString('uk-UA')}</b>${v.auto ? ' · 🔁' : ''}${v.locked ? ' · ⛔ перегляд' : ''}`; })()}</div>
        <div class="btnrow"><button class="btn sm" data-a="vedit" data-v="${v.id}">✏️ Змінити</button><button class="btn sm" data-a="vinfo" data-v="${v.id}">🔑 Коди й боти</button><button class="btn sm" data-a="enter" data-v="${v.id}">Каса →</button>${v.id === 'varvar' ? '' : `<button class="btn sm red" data-a="vdel" data-v="${v.id}">🗑</button>`}</div></div>`).join('')}</div>
      <h2>👤 Акаунти</h2><div class="grid">${P.accts.map(a => `<div class="card"><div class="kv"><span><b>${esc(a.name)}</b> ${a.role === 'platform' ? '👑 платформа' : ''}<br><small class="muted">${esc(a.email)}${a.unverified ? ' · ⏳ не підтвердив пошту' : ''}</small></span></div>
        <div class="muted" style="font-size:13px;margin:6px 0">${a.venues.length ? a.venues.map(id => { const v = all.find(x => x.id === id); return `${v?.owner === a.email ? '👤' : '🔐'} ${esc(v?.name || id)}`; }).join(' · ') : 'закладів немає'}</div>
        <div class="btnrow"><button class="btn sm" data-a="aedit" data-e="${esc(a.email)}">✏️ Ім'я</button><button class="btn sm" data-a="apass" data-e="${esc(a.email)}">🔑 Пароль</button>${a.unverified ? `<button class="btn sm" data-a="aresend" data-e="${esc(a.email)}">✉️ Лист ще раз</button>` : ''}${a.role === 'platform' ? '' : `<button class="btn sm" data-a="agrant" data-e="${esc(a.email)}">🔐 Доступи</button><button class="btn sm red" data-a="adel" data-e="${esc(a.email)}">🗑</button>`}</div></div>`).join('')}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">👤 — власник закладу · 🔐 — має доступ (керуючий, бухгалтер). Власник у закладу один; доступ — скільком завгодно.</div>`;
  }
  function render() {
    if (!S.me) return;
    const plat = S.me.role === 'platform', acc = S.me.role === 'acc', TABS = acc ? [['acc', '🧮 Мої клієнти']] : [['home', '🏠 Мережа'], ['an', '📊 Аналітика'], ['ven', '🏪 Заклади'], ['cfg', '⚙️ Налаштування'], ['learn', '🎓 Навчання'], ['inbox', `📨 Вхідні${S.inboxN ? ` <i class="bdg">${S.inboxN}</i>` : ''}`], ...(plat ? [['crm', '🚀 Продажі'], ['plat', '🌐 Платформа']] : [])];
    if (!TABS.some(x => x[0] === S.tab)) S.tab = 'home';
    app.innerHTML = `<header class="top"><div class="in"><img src="img/app/pos.svg" alt="ATOM"><b>${acc ? 'Кабінет бухгалтера' : 'Кабінет власника'}</b><button class="who-av" data-a="myAv" title="Змінити фото">${VVAV.html(S.me.av, S.me.name)}</button><div class="who"><b>${esc(S.me.name)}</b><span class="muted">${plat ? '👑 платформа' : acc ? '🧮 бухгалтер' : 'власник'}</span></div><div class="icogrp">${acc ? '' : '<button class="icobtn" data-a="myLook" title="Вигляд кабінету">🎨</button>'}<button class="icobtn" data-a="help" title="Допомога">🆘</button><button class="icobtn" data-a="out" title="Вийти">🚪</button></div></div>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${l}</button>`).join('')}<button data-a="reload">🔄</button></nav></header>
      <main>${acc ? OWNACC.view({ api, toast, render, modal }) : S.tab === 'cfg' ? (S.cfgV ? VC.view() : pickVenue()) : S.tab === 'home' ? home() : S.tab === 'an' ? analytics() : S.tab === 'ven' ? venues() : S.tab === 'learn' ? OWNCOURSE.view({ canOpen: S.venues.length === 1 }) : S.tab === 'inbox' ? inbox() : S.tab === 'crm' && plat ? OWNCRM.view({ api, toast, render, modal, kpi, VC, enter: goPos }) : platform()}</main>`;
  }

  // ---------- модалки ----------
  function modal(title, body, onSubmit) {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal"><h3>${title}</h3>${onSubmit ? `<form>${body}<div class="err"></div><div class="btnrow"><button class="btn primary">Зберегти</button><button type="button" class="btn ghost" data-x>Скасувати</button></div></form>` : body + '<div class="btnrow" style="margin-top:14px"><button class="btn" data-x>Закрити</button></div>'}</div>`;
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-x]')) close(); });
    bg.querySelector('form')?.addEventListener('submit', async e => { e.preventDefault(); const err = bg.querySelector('.err'); err.textContent = '…'; try { if ((await onSubmit(e.target, bg)) !== false) close(); } catch (x) { err.textContent = x.message; } });
    document.body.append(bg); bg.querySelector('input')?.focus(); return bg;
  }
  const ROLE = { admin: '👑 Адмін', waiter: '🧑‍🍳 Офіціант', cook: '👨‍🍳 Кухар', courier: '🛵 Кур\'єр' };
  async function vinfo(id) {
    const v = S.venues.find(x => x.id === id); let c = null; try { c = (await api('codes', { venue: id })).codes; } catch (e) { return toast('⚠️ ' + e.message); }
    modal(`⚙️ ${esc(v?.name || id)}`, `<div class="muted" style="margin-bottom:8px">Коди реєстрації персоналу: людина вводить код у касі → своє ім'я й PIN.</div><div class="codes">${Object.entries(c).map(([r, k]) => `<span>${ROLE[r]}</span><b>${esc(k || '—')}</b>`).join('')}</div>
      ${id === 'varvar' ? '' : `<h3 style="margin-top:16px">🤖 Telegram-боти закладу</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Створіть 3 ботів у <a href="https://t.me/BotFather" target="_blank">@BotFather</a> (/newbot) і вставте токени. Потім додайте бота персоналу у вашу робочу групу — вона підключиться сама.</div>
      <form id="bf" style="display:grid;gap:8px"><label>🧑‍🍳 Бот персоналу<input name="BOT_TOKEN" placeholder="123456:ABC…" autocomplete="off"></label><label>🍔 Бот гостей<input name="GUEST_BOT_TOKEN" placeholder="123456:ABC…" autocomplete="off"></label><label>🛵 Бот кур'єрів<input name="COURIER_BOT_TOKEN" placeholder="123456:ABC…" autocomplete="off"></label><div class="err" id="berr"></div><button class="btn primary">💾 Перевірити й зберегти</button></form>`}`);
    $('#bf')?.addEventListener('submit', async e => { e.preventDefault(); const f = e.target, err = $('#berr'), x = {}; for (const k of ['BOT_TOKEN', 'GUEST_BOT_TOKEN', 'COURIER_BOT_TOKEN']) if (f[k].value.trim()) x[k] = f[k].value.trim(); if (!Object.keys(x).length) return; err.textContent = '…';
      try { const r = await api('secrets', { venue: id, f: x }); err.textContent = ''; toast('✅ Збережено: ' + Object.values(r.names).map(n => '@' + n).join(', ')); f.reset(); } catch (y) { err.textContent = y.message; } });
  }

  async function goPos(v, set) { const r = await api('enter', { venue: v }); location.href = `${ATOM ? '/' + encodeURIComponent(v) + '/pos.html' : POS}?venue=${encodeURIComponent(v)}#tok=${r.token}&me=${encodeURIComponent(JSON.stringify(r.me))}${set ? '&set=' + set : ''}`; }
  // ---------- кліки ----------
  // 💬 відповідь у зверненні — працівник побачить її в касі (Профіль → 💬 Звернення)
  document.addEventListener('submit', async e => { const f = e.target.closest('.ib-say'); if (!f) return; e.preventDefault(); const t = f.t.value.trim(); if (!t) return;
    f.querySelector('button').disabled = true; try { const r = await api('inboxSay', { id: f.dataset.id, text: t }); const i = S.ib.findIndex(x => x.id === f.dataset.id); if (i >= 0) S.ib[i] = r.m; toast('💬 Надіслано'); render(); } catch (er) { toast('⚠️ ' + er.message); f.querySelector('button').disabled = false; } });
  document.addEventListener('change', e => { const el = e.target.closest('[data-a="anV"]'); if (el) { OWNAN.pick(el.value); render(); } });
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, d = el.dataset;
    const reload = async () => { S.plat = null; await start(); S.tab = 'plat'; render(); };
    if (a === 'out') { e.preventDefault(); return logout(); }
    if (a === 'help') { e.preventDefault(); let sp = {}; try { sp = await fetch(API + '/api/sup').then(r => r.json()); } catch {} const tg = sp.url ? `<a class="btn" style="display:block;text-align:center;margin-bottom:10px" href="${esc(supLink(sp.url, S.venues?.[0]?.id))}" target="_blank" rel="noopener">🛟 Підтримка в Telegram · ${esc(sp.hrs)}</a><div class="muted" style="font-size:13px">або напишіть тут:</div>` : '';
      return modal('🆘 Допомога', tg + '<div class="muted" style="font-size:13px">Напишіть, що не працює або що потрібно налаштувати — розробник отримає повідомлення в Telegram і зв\'яжеться з вами.</div><textarea name="t" rows="5" required style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px"></textarea>', async f => { await api('help', { text: f.t.value }); toast('🆘 Надіслано'); }); }
    if (a === 'tab' && d.t === 'cfg') { store.set('tab', 'cfg'); S.cfgV = null; S.tab = 'cfg'; if (S.venues.length === 1) return VC.open(S.venues[0].id); return render(); } // спершу — вибір закладу
    if (a === 'ocOpen') { window.scrollTo(0, 0); S.tab = 'cfg'; store.set('tab', 'cfg'); return VC.open(S.venues[0].id, d.s); }
    if (a === 'ibF') { S.ibF = d.f; return render(); }
    if (a === 'ibDone' || a === 'ibDel') { if (a === 'ibDel' && !confirm('Видалити повідомлення?')) return; try { await api('inboxSet', { id: d.id, del: a === 'ibDel' }); const m = S.ib.find(x => x.id === d.id); if (a === 'ibDel') S.ib = S.ib.filter(x => x !== m); else m.done = m.done ? 0 : Date.now(); S.inboxN = S.ib.filter(x => !x.done).length; render(); } catch (x) { toast('⚠️ ' + x.message); } return; }
    if (a === 'digNow') { el.disabled = true; try { await api('dig', { venue: d.v, now: 1 }); S.dig = (await api('dig')).list; toast('🌙 Підсумок оновлено'); } catch (x) { toast('⚠️ ' + x.message); } return render(); }
    if (a === 'digTg') { const v = (S.dig || []).find(x => x.id === d.v), c = prompt('Ваш особистий Telegram chat id (число; дізнатись — бот @userinfobot; спершу натисніть Start у боті закладу). Порожнє — вимкнути:', ''); if (c == null) return; try { await api('dig', { venue: d.v, chat: c.trim() }); if (v) v.tg = !!c.trim(); toast(c.trim() ? '✈️ Підсумок надходитиме вам особисто' : 'Telegram вимкнено'); } catch (x) { toast('⚠️ ' + x.message); } return render(); }
    if (a === 'tab' && d.t === 'inbox') S.ib = null;
    if (a === 'tab') { S.cfgV = null; S.tab = d.t; store.set('tab', d.t); if (d.t === 'home' || d.t === 'an') return load(); return render(); }
    if (a === 'accMan') return OWNACC.manage({ api, toast, render, modal }, d.v, S.venues.find(x => x.id === d.v)?.name || d.v);
    if (a === 'reload') { OWNACC.reset(); OWNAN.reset(); S.plat = null; window.OWNCRM?.reset(); return start(); }
    if (a === 'per') { S.per = d.p; if (d.p === 'own') return render(); return load(); }
    if (a === 'perGo') { S.from = $('#pf').value; S.to = $('#pt').value; if (S.from > S.to) [S.from, S.to] = [S.to, S.from]; return load(); }
    if (a === 'enter') { el.disabled = true; try { await goPos(d.v, d.set); } catch (x) { toast('⚠️ ' + x.message); el.disabled = false; } return; }
    if (a === 'vinfo') return vinfo(d.v);
    if (a === 'askEx') { e.preventDefault(); const f = $('#askF'); f.q.value = d.q; f.requestSubmit(); return; }
    if (a === 'vdemo') { el.disabled = true; toast('🎬 Створюю демо…'); try { const r = await VC.demo('cafe'); await start(); VC.open(r.venue.id, 'start'); toast('🎬 Демо готове — покажіть клієнту касу й сайт'); } catch (x) { toast('⚠️ ' + x.message); } el.disabled = false; return; }
    if (a === 'vcfgOpen') { window.scrollTo(0, 0); return VC.open(d.v); }
    if (a === 'copy') { try { await navigator.clipboard.writeText(d.u); toast('🔗 Скопійовано — надішліть персоналу'); } catch { prompt('Скопіюйте посилання:', d.u); } return; }
    if (a === 'myLook') return myLook();
    if (a === 'myAv') { const x = await VVAV.pick(); /* галерея — одразу в кліку */ if (!x) return; try { const r = await api('av', { data: x }); S.me.av = r.av; render(); toast('📷 Фото оновлено'); } catch (y) { toast('⚠️ ' + y.message); } return; }
    if (a === 'pass') return modal('🔐 Новий пароль', '<input name="p" type="password" placeholder="Від 8 символів" minlength="8" required autocomplete="new-password">', async f => { await api('pass', { pass: f.p.value }); toast('✅ Пароль змінено — увійдіть знову'); logout(true); });
    if (a === 'anew') return modal('👤 Новий власник', '<label>Ім\'я<input name="n" required></label><label>Email<input name="e" type="email" required></label><label>Тимчасовий пароль (необов\'язково)<input name="p" minlength="8" autocomplete="off"></label><div class="muted" style="font-size:13px">Власнику прийде лист: підтвердити пошту й задати свій пароль. Без пошти — передайте email і пароль самі.</div>', async f => { const r = await api('acctNew', { name: f.n.value, email: f.e.value, pass: f.p.value }); toast(r.warn ? '⚠️ Створено, але ' + r.warn : r.mailed ? '✉️ Створено — лист надіслано' : '✅ Власника створено'); await reload(); });
    if (a === 'aresend') { try { await api('acctResend', { email: d.e }); toast('✉️ Лист надіслано'); } catch (x) { toast('⚠️ ' + x.message); } return; }
    if (a === 'apass') return modal('🔑 Новий пароль для ' + esc(d.e), '<input name="p" required minlength="8" autocomplete="off" placeholder="Від 8 символів">', async f => { await api('acctPass', { email: d.e, pass: f.p.value }); toast('✅ Пароль змінено'); });
    if (a === 'vnew') return modal('➕ Новий заклад', `<label>Назва<input name="n" required placeholder="Кав'ярня Ранок"></label><label>Адреса в системі (латиниця)<input name="i" required pattern="[a-z0-9][a-z0-9\\-]{1,30}" placeholder="ranok-lviv"></label><label>Місто<input name="c"></label><label>Власник<select name="o">${(S.plat?.accts || []).map(x => `<option value="${esc(x.email)}">${esc(x.name)} · ${esc(x.email)}</option>`).join('')}</select></label>`, async (f, bg) => {
      const r = await api('venueNew', { name: f.n.value, id: f.i.value.trim().toLowerCase(), city: f.c.value, owner: f.o.value });
      await start(); VC.open(r.venue.id, 'start');
      modal('✅ Заклад створено', `<div class="muted" style="margin-bottom:8px">Коди реєстрації персоналу (збережені й у «🔑 Коди й боти»):</div><div class="codes">${Object.entries(r.codes).map(([k, c]) => `<span>${ROLE[k]}</span><b>${c}</b>`).join('')}</div><div class="muted" style="margin-top:10px;font-size:13px">Каса: <b>pos.html?venue=${esc(r.venue.id)}</b><br>Сайт: <b>about.html?venue=${esc(r.venue.id)}</b></div>`); });
    if (a === 'vedit') { const v = S.venues.find(x => x.id === d.v), A = S.plat?.accts || []; return modal('✏️ ' + esc(v.name), `<label>Назва<input name="n" value="${esc(v.name)}" required></label><label>Місто<input name="c" value="${esc(v.city || '')}"></label><label>Власник<select name="o">${A.map(x => `<option value="${esc(x.email)}" ${x.email === v.owner ? 'selected' : ''}>${esc(x.name)} · ${esc(x.email)}</option>`).join('')}</select></label><label>Статус<select name="s">${Object.entries(ST).filter(([k]) => v.id !== 'varvar' || k !== 'off').map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="keep" style="width:auto"> Залишити попередньому власнику доступ як керуючому</label><div class="muted" style="font-size:13px">Змінили власника — попередній одразу втрачає доступ до кабінету закладу. Новому власнику варто змінити PIN адмінів у касі.</div>`, async f => { await api('venueSet', { id: v.id, f: { name: f.n.value, city: f.c.value, owner: f.o.value, keep: f.keep.checked, status: f.s.value } }); toast('✅ Збережено'); await reload(); }); }
    if (a === 'vdel') { const v = S.venues.find(x => x.id === d.v); return modal('🗑 Видалити ' + esc(v.name) + '?', `<div class="alert red">Назавжди зникнуть усі дані закладу: меню, чеки, звіти, склад, персонал, гості. Відновити не можна.</div><label>🔑 Ваш пароль від кабінету власника<input name="c" type="password" autocomplete="current-password" required></label>`, async f => { await api('venueDel', { id: v.id, pass: f.c.value }); toast('🗑 Заклад видалено'); await reload(); }); }
    if (a === 'aedit') { const x = S.plat.accts.find(y => y.email === d.e); return modal('✏️ ' + esc(x.email), `<label>Ім'я<input name="n" value="${esc(x.name)}" required></label>`, async f => { await api('acctSet', { email: x.email, f: { name: f.n.value } }); toast('✅ Збережено'); await reload(); }); }
    if (a === 'adel') { const x = S.plat.accts.find(y => y.email === d.e); return modal('🗑 Видалити акаунт?', `<div class="muted">${esc(x.name)} · ${esc(x.email)} більше не зможе увійти. Заклади, де він власник, спершу передайте іншому (✏️ у закладу).</div>`, async () => { await api('acctDel', { email: x.email }); toast('🗑 Видалено'); await reload(); }); }
    if (a === 'agrant') { const x = S.plat.accts.find(y => y.email === d.e); const bg = modal('🔐 Доступи · ' + esc(x.name), `<div class="muted" style="font-size:13px;margin-bottom:8px">Які заклади ця людина бачить у своєму кабінеті (аналітика, вхід у касу як адмін).</div>${S.venues.map(v => `<label style="display:flex;gap:10px;align-items:center;flex-direction:row;color:var(--text);padding:6px 0"><input type="checkbox" data-g="${v.id}" style="width:20px;height:20px" ${x.venues.includes(v.id) ? 'checked' : ''} ${v.owner === x.email ? 'disabled' : ''}> ${esc(v.name)} ${v.owner === x.email ? '<span class="muted">(власник)</span>' : ''}</label>`).join('')}`);
      bg.addEventListener('change', async ev => { const c = ev.target.closest('[data-g]'); if (!c) return; try { await api('grant', { venue: c.dataset.g, email: x.email, on: c.checked }); toast(c.checked ? '🔐 Доступ надано' : 'Доступ забрано'); S.plat = null; } catch (y) { c.checked = !c.checked; toast('⚠️ ' + y.message); } });
      bg.addEventListener('click', ev => { if (ev.target === bg || ev.target.closest('[data-x]')) render(); }); return; }
    if (a === 'vstat') { const v = S.venues.find(x => x.id === d.v); return modal('Статус · ' + esc(v.name), `<select name="s">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`, async f => { await api('venueSet', { id: d.v, f: { status: f.s.value } }); await start(); }); }
  });
  document.addEventListener('submit', async e => { if (e.target.id !== 'askF') return; e.preventDefault(); const q = e.target.q.value.trim(); if (!q) return; const box = $('#askA'); box.textContent = '🧠 Думаю над цифрами…'; try { const r = await api('ask', { q }); S.askA = '🧠 ' + r.answer; box.textContent = S.askA; } catch (x) { box.textContent = '⚠️ ' + x.message; } });
  const VC = window.OWNV({ S, api, esc, money, toast, modal, render, API, $ });
  start();
})();
