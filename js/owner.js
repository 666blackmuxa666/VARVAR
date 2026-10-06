// 👑 Кабінет власника мережі (owner.html): вхід → мережа сьогодні → аналітика → заклади → (платформа).
// Сервер: POST /api/owner (worker/src/owner.js). Цифри рахує кожен заклад сам.
(() => {
  const API = new URLSearchParams(location.search).get('api') || (location.hostname === 'localhost' ? 'http://localhost:8787' : 'https://varvar-menu.varvar.workers.dev');
  const POS = location.pathname.replace(/owner\.html$/, '') + 'pos.html';
  const $ = s => document.querySelector(s), app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => `${Math.round(n || 0).toLocaleString('uk-UA')} ₴`;
  const store = { get(k, d) { try { const v = localStorage.getItem('own_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('own_' + k, JSON.stringify(v)); } catch {} } };
  const S = { token: store.get('token', ''), tab: store.get('tab', 'home'), per: 'today', from: '', to: '', me: null, venues: [], seen: {}, sum: null, prev: null };
  const COLORS = ['#f2c14e', '#0a84ff', '#30d158', '#bf5af2', '#ff9f0a', '#64d2ff', '#ff375f', '#a2845e'];
  const ST = { active: '✅ активний', trial: '🧪 пробний', off: '⛔ вимкнено' };

  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 3000); }
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
    const pos = new URLSearchParams(location.hash.slice(1)).get('pos') || '';
    let boot = false; try { boot = (await api('canBoot')).boot; } catch {}
    app.innerHTML = `<div class="login"><img class="logo" src="img/icon.png" alt=""><h1>${boot ? 'Перший запуск платформи' : 'Кабінет власника'}</h1>
      <p class="muted">${boot ? (pos ? 'Створіть головний акаунт — він бачитиме всі заклади й керуватиме платформою.' : 'Відкрийте цю сторінку з каси VARVAR: ⚙️ Налаштування → 👑 Кабінет власника.') : 'Усі ваші заклади, аналітика й керування — в одному місці.'}</p>
      ${boot && !pos ? '' : `<form id="lf">${boot ? '<input name="name" placeholder="Ваше ім\'я" autocomplete="name">' : ''}<input name="email" type="email" placeholder="Email" autocomplete="username" required><input name="pass" type="password" placeholder="Пароль${boot ? ' (від 8 символів)' : ''}" autocomplete="${boot ? 'new-password' : 'current-password'}" required minlength="${boot ? 8 : 1}">
      <button class="btn primary">${boot ? '🚀 Створити й увійти' : 'Увійти'}</button><div class="err" id="lerr"></div></form>`}</div>`;
    $('#lf')?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, err = $('#lerr'); err.textContent = '…';
      try { const r = await api(boot ? 'bootstrap' : 'login', { email: f.email.value, pass: f.pass.value, ...(boot ? { name: f.name.value, pos } : {}) }); S.token = r.token; store.set('token', r.token); history.replaceState(null, '', location.pathname + location.search); start(); }
      catch (x) { err.textContent = x.message; }
    });
  }

  // ---------- дані ----------
  async function start() {
    if (!S.token) return renderLogin();
    try { const r = await api('me'); S.me = r.me; S.venues = r.venues; S.seen = r.seen || {}; } catch { return; }
    render(); load();
  }
  async function load() {
    const [f, t] = S.tab === 'home' ? [today(), today()] : range(S.per);
    S.sum = null; render();
    try {
      const reqs = [api('sum', { from: f, to: t })];
      if (S.tab === 'home') { const w = addD(today(), -7); reqs.push(api('sum', { from: w, to: w })); }
      const [a, b] = await Promise.all(reqs); S.sum = a.list; S.prev = b?.list || null;
    } catch (e) { if (e.message !== 'auth') toast('⚠️ ' + e.message); S.sum = []; }
    render();
  }

  // ---------- екрани ----------
  const kpi = (l, v, sub = '') => `<div class="kpi"><span>${l}</span><b class="money">${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const delta = (a, b) => !b ? '' : `<span class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / b * 100))}%</span> до мин. тижня`;
  const sumTot = l => l.reduce((a, v) => { const t = v.tot || {}; for (const k of ['rev', 'n', 'tip', 'disc', 'go', 'goRev', 'voids', 'voidSum', 'removed', 'removedSum', 'exp', 'cash', 'card']) a[k] = (a[k] || 0) + (t[k] || 0); return a; }, {});
  function alerts(list) {
    const out = [];
    for (const v of list) {
      const n = v.now || {}, t = v.tot || {}, nm = esc(v.name);
      if (v.error) { out.push(['red', `❗ ${nm}: немає зв'язку із закладом`]); continue; }
      if (t.removed) out.push(['red', `🗑 ${nm}: видалено закритих чеків — ${t.removed} на ${money(t.removedSum)}`]);
      if (t.voids >= 3) out.push(['', `✏️ ${nm}: прибрано позицій після замовлення — ${t.voids} (${money(t.voidSum)})`]);
      if (n.inbox) out.push(['', `✉️ ${nm}: гості чекають відповіді — ${n.inbox}`]);
      if (!n.printer && (n.tables || n.go)) out.push(['', `🖨 ${nm}: принтер не на зв'язку${n.printQ ? `, у черзі ${n.printQ}` : ''}`]);
      const p = S.prev?.find(x => x.id === v.id)?.tot?.rev || 0, h = new Date().getHours();
      if (p > 0 && h >= 15 && (t.rev || 0) < p * 0.7) out.push(['', `📉 ${nm}: виручка ${money(t.rev)} — на ${Math.round((1 - (t.rev || 0) / p) * 100)}% менше, ніж минулого ${['неділі', 'понеділка', 'вівторка', 'середи', 'четверга', 'пʼятниці', 'суботи'][new Date().getDay()]}`]);
    }
    return out;
  }
  function home() {
    if (!S.sum) return '<div class="muted">Рахуємо цифри всіх закладів…</div>';
    const T = sumTot(S.sum), P = S.prev ? sumTot(S.prev) : null, now = S.sum.reduce((a, v) => { const n = v.now || {}; a.tables += n.tables || 0; a.go += n.go || 0; a.open += n.openSum || 0; a.staff += (n.onShift || []).length; return a; }, { tables: 0, go: 0, open: 0, staff: 0 });
    const al = alerts(S.sum);
    return `<h2>🏠 Мережа сьогодні</h2><div class="kpis">
      ${kpi('Виручка', money(T.rev), delta(T.rev, P?.rev))}${kpi('Чеків', T.n || 0, T.n ? 'середній ' + money(T.rev / T.n) : '')}${kpi('Зараз у залах', money(now.open), `${now.tables} столів · ${now.go} доставок`)}${kpi('На зміні', now.staff, 'людей')}${kpi('Чайові', money(T.tip))}${kpi('Знижки', money(T.disc))}</div>
      <h2>🚨 Тривоги ${al.length ? `<span class="muted">(${al.length})</span>` : ''}</h2>${al.length ? al.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join('') : '<div class="card muted">Усе спокійно 👌</div>'}
      <h2>🏪 Заклади</h2><div class="grid">${S.sum.map(venueCard).join('')}</div>`;
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
    const chart = days.length > 1 ? `<div class="card"><h3>Виручка по днях</h3><div class="chart">${days.map((d, i) => `<div class="col" title="${d}: ${money(S.sum.reduce((a, v) => a + (v.days?.[d]?.rev || 0), 0))}">${S.sum.map((v, j) => { const r = v.days?.[d]?.rev || 0; return r ? `<div class="seg" style="height:${r / mx * 100}%;background:${COLORS[j % COLORS.length]}"></div>` : ''; }).join('')}${days.length <= 16 || i % Math.ceil(days.length / 10) === 0 ? `<div class="lbl">${+d.slice(8)}.${d.slice(5, 7)}</div>` : ''}</div>`).join('')}</div>
      <div class="legend">${S.sum.map((v, j) => `<span><i style="background:${COLORS[j % COLORS.length]}"></i>${esc(v.name)}</span>`).join('')}</div></div>` : '';
    const row = (nm, x, cls = '') => `<tr class="${cls}"><td>${nm}</td><td class="money">${money(x.rev)}</td><td>${x.n || 0}</td><td class="money">${x.n ? money(x.rev / x.n) : '—'}</td><td class="money">${money(x.tip)}</td><td class="money">${money(x.disc)}</td><td>${x.go || 0}</td><td>${x.voids || 0}</td><td>${x.removed || 0}</td><td class="money">${money(x.exp)}</td></tr>`;
    const rank = [...S.sum].sort((a, b) => (b.tot?.rev || 0) - (a.tot?.rev || 0));
    return `<h2>📊 Аналітика</h2>${seg}<div class="kpis">${kpi('Виручка', money(T.rev))}${kpi('Чеків', T.n || 0)}${kpi('Середній чек', T.n ? money(T.rev / T.n) : '—')}${kpi('🛵 Доставка', money(T.goRev), `${T.go || 0} замовлень`)}${kpi('Чайові', money(T.tip))}${kpi('Витрати з каси', money(T.exp))}</div>
      <div style="margin-top:12px">${chart}</div>
      <h2>🏆 Порівняння закладів</h2><div class="card tbl"><table><thead><tr><th>Заклад</th><th>Виручка</th><th>Чеків</th><th>Сер. чек</th><th>Чайові</th><th>Знижки</th><th>🛵</th><th>✏️ Відміни</th><th>🗑 Видал.</th><th>Витрати</th></tr></thead>
      <tbody>${rank.map((v, i) => row(`${['🥇', '🥈', '🥉'][i] || ''} ${esc(v.name)}`, v.tot || {})).join('')}${S.sum.length > 1 ? row('Разом', T, 'sum') : ''}</tbody></table></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Період: ${f.split('-').reverse().join('.')} – ${t.split('-').reverse().join('.')}. Фудкост, ЗП й прибуток (P&L) — наступний етап.</div>`;
  }
  function venues() {
    return `<h2>🏪 Мої заклади</h2><div class="grid">${S.venues.map(v => `<div class="card venue"><div class="h"><b>${esc(v.name)}</b><span class="st ${v.status}">${ST[v.status] || ''}</span></div>
      <div class="muted">${esc(v.city || '')}${v.city ? ' · ' : ''}адреса: <b>${esc(v.id)}</b>${S.seen[v.id] ? ` · заходили ${new Date(S.seen[v.id]).toLocaleDateString('uk-UA')}` : ''}</div>
      <div class="btnrow"><button class="btn primary sm" data-a="vcfgOpen" data-v="${v.id}">⚙️ Налаштувати</button><button class="btn sm" data-a="enter" data-v="${v.id}">Увійти в касу →</button><a class="btn sm ghost" href="${esc(siteOf(v.id, 'about.html'))}" target="_blank">🌐 Сайт</a></div>
      <div class="kv"><span>🔗 Каса для персоналу<br><small class="muted">${esc(absOf(v.id, 'pos.html'))}</small></span><button class="btn sm" data-a="copy" data-u="${esc(absOf(v.id, 'pos.html'))}">Копіювати</button></div><div class="kv"><span>🌐 Сайт для гостей<br><small class="muted">${esc(absOf(v.id, 'about.html'))}</small></span><button class="btn sm" data-a="copy" data-u="${esc(absOf(v.id, 'about.html'))}">Копіювати</button></div></div>`).join('') || '<div class="muted">Закладів ще немає</div>'}</div>
      <h2>🔐 Акаунт</h2><div class="card"><div class="kv"><span>${esc(S.me.name)}<br><small class="muted">${esc(S.me.email)}</small></span><button class="btn sm" data-a="pass">Змінити пароль</button></div></div>`;
  }
  const absOf = (id, page) => location.origin + siteOf(id, page) + (id === 'varvar' && page === 'pos.html' ? '?venue=varvar' : ''); // VARVAR — явно, щоб пристрій «забув» інший заклад // повна адреса для персоналу / гостей
  const siteOf = (id, page) => location.pathname.replace(/owner\.html$/, '') + page + (id === 'varvar' ? '' : '?venue=' + id);
  function platform() {
    const P = S.plat;
    if (!P) { api('accts').then(r => { S.plat = { accts: r.list }; S.venues = r.venues; render(); }).catch(e => toast('⚠️ ' + e.message)); return '<div class="muted">…</div>'; }
    const all = S.venues, nameOf = e => P.accts.find(a => a.email === e)?.name || e;
    return `<h2>🌐 Платформа</h2><div class="kpis">${kpi('Закладів', all.length, `${all.filter(v => v.status === 'active').length} активних · ${all.filter(v => v.status === 'trial').length} пробних`)}${kpi('Власників', P.accts.filter(a => a.role === 'owner').length)}</div>
      <div class="card" style="margin-top:12px"><h3>💡 Як підключити нового власника</h3><div class="muted" style="font-size:14px">1) «👤 Новий власник» — email і тимчасовий пароль. 2) «➕ Новий заклад» — оберіть цього власника (або ✏️ у наявного закладу → змініть власника). 3) Надішліть людині посилання <b>${esc(location.origin + location.pathname)}</b> + email і пароль — вона заходить у свій кабінет, бачить лише свої заклади й змінює пароль («🏪 Заклади → Змінити пароль»). Керуючому / бухгалтеру — «🔐 Доступи» у його акаунта.</div></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn primary" data-a="vnew">➕ Новий заклад</button><button class="btn" data-a="anew">👤 Новий власник</button></div>
      <h2>🏪 Усі заклади</h2><div class="grid">${all.map(v => `<div class="card venue"><div class="h"><b>${esc(v.name)}</b><span class="st ${v.status}">${ST[v.status]}</span></div>
        <div class="muted" style="font-size:13px">адреса: <b>${esc(v.id)}</b>${v.city ? ' · ' + esc(v.city) : ''}<br>👤 ${esc(nameOf(v.owner))} <span style="opacity:.7">${esc(v.owner)}</span><br>активність: ${S.seen[v.id] ? new Date(S.seen[v.id]).toLocaleDateString('uk-UA') : '—'}</div>
        <div class="btnrow"><button class="btn sm" data-a="vedit" data-v="${v.id}">✏️ Змінити</button><button class="btn sm" data-a="vinfo" data-v="${v.id}">🔑 Коди й боти</button><button class="btn sm" data-a="enter" data-v="${v.id}">Каса →</button>${v.id === 'varvar' ? '' : `<button class="btn sm red" data-a="vdel" data-v="${v.id}">🗑</button>`}</div></div>`).join('')}</div>
      <h2>👤 Акаунти</h2><div class="grid">${P.accts.map(a => `<div class="card"><div class="kv"><span><b>${esc(a.name)}</b> ${a.role === 'platform' ? '👑 платформа' : ''}<br><small class="muted">${esc(a.email)}</small></span></div>
        <div class="muted" style="font-size:13px;margin:6px 0">${a.venues.length ? a.venues.map(id => { const v = all.find(x => x.id === id); return `${v?.owner === a.email ? '👤' : '🔐'} ${esc(v?.name || id)}`; }).join(' · ') : 'закладів немає'}</div>
        <div class="btnrow"><button class="btn sm" data-a="aedit" data-e="${esc(a.email)}">✏️ Ім'я</button><button class="btn sm" data-a="apass" data-e="${esc(a.email)}">🔑 Пароль</button>${a.role === 'platform' ? '' : `<button class="btn sm" data-a="agrant" data-e="${esc(a.email)}">🔐 Доступи</button><button class="btn sm red" data-a="adel" data-e="${esc(a.email)}">🗑</button>`}</div></div>`).join('')}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">👤 — власник закладу · 🔐 — має доступ (керуючий, бухгалтер). Власник у закладу один; доступ — скільком завгодно.</div>`;
  }
  function render() {
    if (!S.me) return;
    const plat = S.me.role === 'platform', TABS = [['home', '🏠 Мережа'], ['an', '📊 Аналітика'], ['ven', '🏪 Заклади'], ...(plat ? [['plat', '🌐 Платформа']] : [])];
    if (!TABS.some(x => x[0] === S.tab) && !(S.tab === 'cfg' && S.cfgV)) S.tab = 'home';
    app.innerHTML = `<header class="top"><div class="in"><img src="img/icon.png" alt=""><b>Кабінет власника</b><div class="who"><b>${esc(S.me.name)}</b><span class="muted">${plat ? '👑 платформа' : 'власник'} · <a href="#" data-a="out">вийти</a></span></div></div>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${l}</button>`).join('')}<button data-a="reload">🔄</button></nav></header>
      <main>${S.tab === 'cfg' && S.cfgV ? VC.view() : S.tab === 'home' ? home() : S.tab === 'an' ? analytics() : S.tab === 'ven' ? venues() : platform()}</main>`;
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

  // ---------- кліки ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a, d = el.dataset;
    const reload = async () => { S.plat = null; await start(); S.tab = 'plat'; render(); };
    if (a === 'out') { e.preventDefault(); return logout(); }
    if (a === 'tab') { S.cfgV = null; S.tab = d.t; store.set('tab', d.t); if (d.t === 'home' || d.t === 'an') return load(); return render(); }
    if (a === 'reload') { S.plat = null; return start(); }
    if (a === 'per') { S.per = d.p; if (d.p === 'own') return render(); return load(); }
    if (a === 'perGo') { S.from = $('#pf').value; S.to = $('#pt').value; if (S.from > S.to) [S.from, S.to] = [S.to, S.from]; return load(); }
    if (a === 'enter') { el.disabled = true; try { const r = await api('enter', { venue: d.v }); location.href = `${POS}?venue=${encodeURIComponent(d.v)}#tok=${r.token}&me=${encodeURIComponent(JSON.stringify(r.me))}`; } catch (x) { toast('⚠️ ' + x.message); el.disabled = false; } return; }
    if (a === 'vinfo') return vinfo(d.v);
    if (a === 'vcfgOpen') { window.scrollTo(0, 0); return VC.open(d.v); }
    if (a === 'copy') { try { await navigator.clipboard.writeText(d.u); toast('🔗 Скопійовано — надішліть персоналу'); } catch { prompt('Скопіюйте посилання:', d.u); } return; }
    if (a === 'pass') return modal('🔐 Новий пароль', '<input name="p" type="password" placeholder="Від 8 символів" minlength="8" required autocomplete="new-password">', async f => { await api('pass', { pass: f.p.value }); toast('✅ Пароль змінено — увійдіть знову'); logout(true); });
    if (a === 'anew') return modal('👤 Новий власник', '<label>Ім\'я<input name="n" required></label><label>Email<input name="e" type="email" required></label><label>Тимчасовий пароль<input name="p" required minlength="8" autocomplete="off"></label><div class="muted" style="font-size:13px">Передайте власнику email і пароль — він змінить пароль у кабінеті.</div>', async f => { await api('acctNew', { name: f.n.value, email: f.e.value, pass: f.p.value }); toast('✅ Власника створено'); await reload(); });
    if (a === 'apass') return modal('🔑 Новий пароль для ' + esc(d.e), '<input name="p" required minlength="8" autocomplete="off" placeholder="Від 8 символів">', async f => { await api('acctPass', { email: d.e, pass: f.p.value }); toast('✅ Пароль змінено'); });
    if (a === 'vnew') return modal('➕ Новий заклад', `<label>Назва<input name="n" required placeholder="Кав'ярня Ранок"></label><label>Адреса в системі (латиниця)<input name="i" required pattern="[a-z0-9][a-z0-9\\-]{1,30}" placeholder="ranok-lviv"></label><label>Місто<input name="c"></label><label>Власник<select name="o">${(S.plat?.accts || []).map(x => `<option value="${esc(x.email)}">${esc(x.name)} · ${esc(x.email)}</option>`).join('')}</select></label>`, async (f, bg) => {
      const r = await api('venueNew', { name: f.n.value, id: f.i.value.trim().toLowerCase(), city: f.c.value, owner: f.o.value });
      await start(); VC.open(r.venue.id, 'start');
      modal('✅ Заклад створено', `<div class="muted" style="margin-bottom:8px">Коди реєстрації персоналу (збережені й у «🔑 Коди й боти»):</div><div class="codes">${Object.entries(r.codes).map(([k, c]) => `<span>${ROLE[k]}</span><b>${c}</b>`).join('')}</div><div class="muted" style="margin-top:10px;font-size:13px">Каса: <b>pos.html?venue=${esc(r.venue.id)}</b><br>Сайт: <b>about.html?venue=${esc(r.venue.id)}</b></div>`); });
    if (a === 'vedit') { const v = S.venues.find(x => x.id === d.v), A = S.plat?.accts || []; return modal('✏️ ' + esc(v.name), `<label>Назва<input name="n" value="${esc(v.name)}" required></label><label>Місто<input name="c" value="${esc(v.city || '')}"></label><label>Власник<select name="o">${A.map(x => `<option value="${esc(x.email)}" ${x.email === v.owner ? 'selected' : ''}>${esc(x.name)} · ${esc(x.email)}</option>`).join('')}</select></label><label>Статус<select name="s">${Object.entries(ST).filter(([k]) => v.id !== 'varvar' || k !== 'off').map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label><div class="muted" style="font-size:13px">Змінили власника — попередній лишається з доступом 🔐 (забрати — «🔐 Доступи» у його акаунта).</div>`, async f => { await api('venueSet', { id: v.id, f: { name: f.n.value, city: f.c.value, owner: f.o.value, status: f.s.value } }); toast('✅ Збережено'); await reload(); }); }
    if (a === 'vdel') { const v = S.venues.find(x => x.id === d.v); return modal('🗑 Видалити ' + esc(v.name) + '?', `<div class="alert red">Назавжди зникнуть усі дані закладу: меню, чеки, звіти, склад, персонал, гості. Відновити не можна.</div><label>Щоб підтвердити, введіть адресу закладу: <b>${esc(v.id)}</b><input name="c" autocomplete="off" required></label>`, async f => { await api('venueDel', { id: v.id, confirm: f.c.value.trim() }); toast('🗑 Заклад видалено'); await reload(); }); }
    if (a === 'aedit') { const x = S.plat.accts.find(y => y.email === d.e); return modal('✏️ ' + esc(x.email), `<label>Ім'я<input name="n" value="${esc(x.name)}" required></label>`, async f => { await api('acctSet', { email: x.email, f: { name: f.n.value } }); toast('✅ Збережено'); await reload(); }); }
    if (a === 'adel') { const x = S.plat.accts.find(y => y.email === d.e); return modal('🗑 Видалити акаунт?', `<div class="muted">${esc(x.name)} · ${esc(x.email)} більше не зможе увійти. Заклади, де він власник, спершу передайте іншому (✏️ у закладу).</div>`, async () => { await api('acctDel', { email: x.email }); toast('🗑 Видалено'); await reload(); }); }
    if (a === 'agrant') { const x = S.plat.accts.find(y => y.email === d.e); const bg = modal('🔐 Доступи · ' + esc(x.name), `<div class="muted" style="font-size:13px;margin-bottom:8px">Які заклади ця людина бачить у своєму кабінеті (аналітика, вхід у касу як адмін).</div>${S.venues.map(v => `<label style="display:flex;gap:10px;align-items:center;flex-direction:row;color:var(--text);padding:6px 0"><input type="checkbox" data-g="${v.id}" style="width:20px;height:20px" ${x.venues.includes(v.id) ? 'checked' : ''} ${v.owner === x.email ? 'disabled' : ''}> ${esc(v.name)} ${v.owner === x.email ? '<span class="muted">(власник)</span>' : ''}</label>`).join('')}`);
      bg.addEventListener('change', async ev => { const c = ev.target.closest('[data-g]'); if (!c) return; try { await api('grant', { venue: c.dataset.g, email: x.email, on: c.checked }); toast(c.checked ? '🔐 Доступ надано' : 'Доступ забрано'); S.plat = null; } catch (y) { c.checked = !c.checked; toast('⚠️ ' + y.message); } });
      bg.addEventListener('click', ev => { if (ev.target === bg || ev.target.closest('[data-x]')) render(); }); return; }
    if (a === 'vstat') { const v = S.venues.find(x => x.id === d.v); return modal('Статус · ' + esc(v.name), `<select name="s">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`, async f => { await api('venueSet', { id: d.v, f: { status: f.s.value } }); await start(); }); }
  });
  const VC = window.OWNV({ S, api, esc, money, toast, modal, render, API, $ });
  start();
})();
