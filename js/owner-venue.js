// ⚙️ Кабінет власника → налаштування закладу без розробника: 🚀 запуск (чек-лист), заклад, сайт, меню (+ імпорт з Excel/Google), доставка, каса, персонал, боти, принтер.
// Працює через ті самі операції, що й каса (/v/<заклад>/api/pos) — сесія адміна закладу з кабінету (op enter). Підключається з owner.js: window.OWNV(ctx).
window.OWNV = ctx => {
  const { S, api, esc, money, toast, modal, render, API, $ } = ctx;
  const base = id => API + (id === 'varvar' ? '' : '/v/' + id);
  S.vtok ||= {};
  async function vapi(id, op, data = {}, again) {
    if (!S.vtok[id]) S.vtok[id] = (await api('enter', { venue: id })).token;
    const r = await fetch(base(id) + '/api/pos', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.vtok[id] }, body: JSON.stringify({ op, ...data }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !again) { S.vtok[id] = ''; return vapi(id, op, data, true); }
    if (!r.ok || j.error) throw new Error(errText(j.error) || 'Помилка ' + r.status); return j;
  }
  const errText = e => ({ admin: 'Потрібні права адміна', image: 'Невірний формат картинки', too_big: 'Завеликий файл', not_found: 'Не знайдено' }[e] || e);
  const SEC0 = [['start', '🚀 Запуск'], ['venue', '🏪 Заклад і каса'], ['site', '🌐 Сайт'], ['menu', '🍽 Меню'], ['go', '🛵 Доставка'], ['staff', '👥 Персонал'], ['bots', '🤖 Боти'], ['printer', '🖨 Принтер'], ['log', '🛡 Журнал і копії']];
  /* 🚀 Запуск — лише поки заклад не налаштований (VARVAR — ніколи) */
  const doneKey = id => 'own_ready_' + id, isDone = id => { if (id === 'varvar') return true; try { return localStorage.getItem(doneKey(id)) === '1'; } catch { return false; } };
  const secs = () => SEC0.filter(([k]) => k !== 'start' || !isDone(S.cfgV?.id));
  const V = () => S.cfgV; // { id, sec, d: {…дані розділу} }

  async function load() {
    const v = V(); if (!secs().some(x => x[0] === v.sec)) v.sec = 'venue'; v.d = null; render();
    try {
      const id = v.id, sec = v.sec;
      if (sec === 'start' || sec === 'bots' || sec === 'printer') v.d = { ready: await api('ready', { venue: id }) };
      if (sec === 'venue' || sec === 'site') v.d = { site: (await vapi(id, 'siteGet')).site };
      if (sec === 'venue') { const [st, lv] = await Promise.all([vapi(id, 'state'), vapi(id, 'lookV').catch(() => ({}))]); Object.assign(v.d, { cfg: st.cfg, n: st.n, lookV: lv.look || null }); }
      if (sec === 'site') v.d.menu = (await vapi(id, 'menu')).menu;
      if (sec === 'bots') v.d.live = await api('bots', { venue: id }).catch(e => ({ err: e.message }));
      if (sec === 'printer') { const [q, rc] = await Promise.all([vapi(id, 'printQ').catch(() => ({ list: [] })), vapi(id, 'rcptGet').catch(() => ({}))]); Object.assign(v.d, { q: q.list, rc: rc.rcpt, dev: rc.dev, route: rc.route || {} }); }
      if (sec === 'menu') v.d = { menu: (await vapi(id, 'menu')).menu };
      if (sec === 'go') v.d = { go: (await vapi(id, 'goCfg')).cfg };
      if (sec === 'staff') v.d = await vapi(id, 'staff');
      if (sec === 'log') { const [a, b] = await Promise.all([vapi(id, 'alog', { m: S.logM || '' }), api('bak', { venue: id, do: 'list' }).catch(() => ({ list: [] }))]); v.d = { list: a.list, bak: b.list }; }
    } catch (e) { toast('⚠️ ' + e.message); v.d = { err: e.message }; }
    render();
  }
  // поля
  const row = (l, val, a, k, extra = '') => `<div class="kv"><span>${l}<br><small class="muted">${val === '' || val == null ? 'не вказано' : esc(val)}</small></span><button class="btn sm" data-a="${a}" data-k="${k}" ${extra}>✏️</button></div>`;
  const tgl = (l, on, a, k) => `<div class="kv"><span>${l}</span><button class="btn sm ${on ? 'primary' : ''}" data-a="${a}" data-k="${k}" data-on="${on ? 1 : 0}">${on ? '✅ Увімкнено' : '⛔ Вимкнено'}</button></div>`;

  function view() {
    const v = V(), venue = S.venues.find(x => x.id === v.id) || { name: v.id };
    const tabs = `<div class="vtabs" style="--c:${secs().length % 4 && secs().length % 3 === 0 ? 3 : 4}">${secs().map(([k, l]) => { const [ic, ...t] = l.split(' '); return `<button class="${v.sec === k ? 'on' : ''}" data-a="vsec" data-s="${k}"><i>${ic}</i><span>${t.join(' ')}</span></button>`; }).join('')}</div>`;
    const head = `<div class="vtop">${S.venues.length > 1 ? '<button class="btn sm ghost" data-a="vpickBack" title="Інший заклад">←</button>' : ''}${S.venues.length > 1 ? `<select id="vpick">${S.venues.map(x => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<h2 style="margin:0">${esc(venue.name)}</h2>`}</div>${tabs}`;
    if (!v.d) return head + '<div class="muted">Завантаження…</div>';
    if (v.d.err) return head + `<div class="alert red">${esc(v.d.err)}</div>`;
    return head + (SECV[v.sec] || (() => ''))(v, venue);
  }
  const SECV = {
    start(v) {
      const r = v.d.ready, ok = x => x ? '✅' : '⬜', it = (done, l, sec, hint) => `<div class="kv"><span>${ok(done)} <b>${l}</b><br><small class="muted">${hint}</small></span>${done ? '' : `<button class="btn sm primary" data-a="vsec" data-s="${sec}">Налаштувати →</button>`}</div>`;
      const list = [[r.name && r.name !== 'Новий заклад', 'Назва', 'venue', esc(r.name || '')], [r.logo, 'Логотип', 'venue', 'квадратний PNG — у касі й на сайті'], [r.contacts, 'Контакти й години', 'site', 'телефон, адреса — для сайту й ботів'],
        [r.items > 0, 'Меню', 'menu', r.items ? `${r.items} страв у ${r.cats} розділах` : 'вручну або імпорт з Excel / Google'], [true, 'Зал', 'venue', `${r.tables} столів`], [r.staff > 0, 'Персонал', 'staff', r.staff ? `${r.staff} працівників` : 'надішліть посилання каси й коди'],
        [r.bots.staff && r.bots.group, 'Бот персоналу й група', 'bots', 'замовлення, броні, звіти — у Telegram'], [r.bots.guest, 'Бот гостей', 'bots', 'бонуси, броні, статус замовлення'], [r.site, 'Сайт-візитка', 'site', 'опис і головне фото'], [r.printer === 1, 'Принтер', 'printer', r.printer ? 'був на зв\'язку' : 'програма друку на комп\'ютері з принтером']];
      const done = list.filter(x => x[0]).length; if (done === list.length) try { localStorage.setItem(doneKey(v.id), '1'); } catch {}
      return `<div class="card"><h3>🚀 Готовність закладу: ${done} з ${list.length}</h3><div style="height:8px;border-radius:5px;background:var(--card2);overflow:hidden;margin-bottom:10px"><div style="height:100%;width:${done / list.length * 100}%;background:var(--green)"></div></div>${list.map(x => it(...x)).join('')}</div>
        <div class="muted" style="font-size:13px;margin-top:8px">Усе можна змінювати будь-коли — тут або в касі закладу (⚙️ Налаштування).</div>`;
    },
    venue(v) {
      const s = v.d.site, c = v.d.cfg, R = [['tables', '🪑 Столів у залі', v.d.n], ['discMax', '% Макс. знижка офіціанта', c.discMax + '%'], ['dayH', '🌙 Робочий день закінчується о', c.dayH + ':00'], ['scanMin', '📱 Замовлення за QR діє', c.scanMin + ' хв'], ['lateMin', '⏰ Запізнення після', c.lateMin + ' хв'], ['lateFine', '💸 Штраф за запізнення', c.lateFine + ' ₴'], ['foodCost', '🧮 Цільовий фудкост', c.foodCost + '%']];
      return `<div class="grid"><div class="card"><h3>🏪 Заклад</h3>${row('Назва закладу', s.name, 'vsite', 'name')}${row('🕐 Відкриваємось', s.from, 'vsite', 'from')}${row('🕙 Зачиняємось', s.to, 'vsite', 'to')}
          <div style="display:flex;gap:14px;align-items:center;margin-top:10px"><button data-a="vimg" data-k="logo" style="width:84px;height:84px;flex:none;border-radius:18px;background:var(--card2);border:1px dashed var(--line2);overflow:hidden;font-size:28px">${s.logo ? `<img src="${esc(s.logo)}" style="width:100%;height:100%;object-fit:contain" alt="">` : '➕'}</button><div class="muted" style="font-size:13px">🖼 Логотип — квадратний PNG, найкраще з прозорим фоном. Видно в касі, на сайті, в меню й ботах.${s.logo ? '<br><button class="btn sm" data-a="vsiteDel" data-k="logo" style="margin-top:8px">✕ Прибрати</button>' : ''}</div></div></div>
        <div class="card"><h3>🪑 Каса й зал</h3>${R.map(([k, l, val]) => row(l, val, 'vcfg', k)).join('')}</div>
        <div class="card"><h3>🖌 Стиль каси</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Вигляд кнопок, карток, меню й вікон — однаковий на всіх телефонах і планшетах закладу. Зараз: <b>${v.d.lookV ? (Object.entries(window.VVSkin?.PRE || {}).find(([, p]) => JSON.stringify(p[2]) === JSON.stringify(v.d.lookV))?.[1][0] || '✏️ свій') : '↩️ стара каса'}</b></div>
          <div class="btnrow"><button class="btn sm ${v.d.lookV ? '' : 'primary'}" data-a="vsk" data-v="old">↩️ Стара каса</button>${Object.entries(window.VVSkin?.PRE || {}).map(([k, [t]]) => `<button class="btn sm ${JSON.stringify(window.VVSkin.PRE[k][2]) === JSON.stringify(v.d.lookV) ? 'primary' : ''}" data-a="vsk" data-v="pre" data-p="${k}">${t}</button>`).join('')}<button class="btn sm" data-a="vskEdit">🎨 Конструктор</button><button class="btn sm ghost" data-a="vskCode">📥 Код</button></div></div>
        <div class="card"><h3>🌙 Закриття дня</h3>${tgl('Автоматичний Z-звіт', c.autoZ, 'vcfgTgl', 'autoZ')}${tgl('Друкувати Z', c.zPrint, 'vcfgTgl', 'zPrint')}${tgl('Z у Telegram', c.zTg, 'vcfgTgl', 'zTg')}${tgl('Нагадати, якщо Z не закрито', c.zRemind, 'vcfgTgl', 'zRemind')}</div></div>`;
    },
    site(v) {
      const s = v.d.site, F = [['tagline', '✨ Слоган'], ['about', '📝 Про нас'], ['phone', '📞 Телефон'], ['addr', '📍 Адреса'], ['insta', '📸 Instagram'], ['tg', '✈️ Telegram-канал'], ['gmaps', '🗺 Google Maps (посилання)'], ['reviewsUrl', '✍️ «Залишити відгук» (посилання)'], ['banquet', '🎉 Банкети (текст)'], ['hookah', '💨 Кальяни (текст)']];
      const url = window.VVPUB(v.id, '');
      const all = (v.d.menu?.categories || []).flatMap(c => c.items), it = id => all.find(i => i.id === id);
      return `<div class="vhead"><a class="btn sm" href="${esc(url)}" target="_blank">🔗 Відкрити</a><button class="btn sm" data-a="copy" data-u="${esc(url)}">📋 Посилання</button><button class="btn sm primary" data-a="vbuild">🎨 Конструктор сайту</button></div>
        <div class="grid"><div class="card"><h3>📝 Тексти й контакти</h3>${F.map(([k, l]) => row(l, s[k], 'vsite', k)).join('')}</div>
        <div class="card"><h3>📷 Фото</h3><button data-a="vimg" data-k="hero" style="width:100%;height:140px;border-radius:14px;background:var(--card2) center/cover;${s.hero && typeof s.hero === 'string' ? `background-image:url('${esc(s.hero)}')` : ''};color:#fff;font-weight:700;text-shadow:0 1px 4px #000">${s.hero ? '🔄 Замінити головне фото' : '🖼 Головне фото'}</button>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px">${(s.photos || []).map(u => `<div style="aspect-ratio:1;border-radius:10px;background:var(--card2) url('${esc(u)}') center/cover;position:relative"><button data-a="vphotoDel" data-u="${esc(u)}" style="position:absolute;top:2px;right:2px;background:#000a;border-radius:8px;width:24px;height:24px">✕</button></div>`).join('')}<button data-a="vimg" data-k="photo" style="aspect-ratio:1;border-radius:10px;background:var(--card2);border:1px dashed var(--line2);font-size:22px">➕</button></div></div>
        <div class="card"><h3>🍽 Хіти меню</h3><div class="chips">${(s.hits || []).map(id => it(id)).filter(Boolean).map(i => `<span class="chip">${esc(i.name.uk)}</span>`).join('') || '<span class="muted" style="font-size:13px">Автоматично — страви з фото</span>'}</div><button class="btn sm" data-a="vhits" style="margin-top:10px">✏️ Обрати страви</button></div>
        <div class="card"><h3>🎉 Акції та події</h3>${(s.promos || []).map(p => `<div class="kv"><span><b>${esc(p.t)}</b>${p.d ? `<br><small class="muted">${esc(p.d)}</small>` : ''}</span><button class="btn sm red" data-a="vsdel" data-k="promoDel" data-v="${esc(p.id)}">🗑</button></div>`).join('') || '<div class="muted" style="font-size:13px">Немає — блок на сайті прихований</div>'}<button class="btn sm primary" data-a="vpromo" style="margin-top:10px">➕ Акція</button></div>
        <div class="card"><h3>⭐ Відгуки</h3>${row('⭐ Рейтинг Google (0–5)', s.rating || '', 'vsite', 'rating')}${row('💬 Кількість відгуків', s.ratingN || '', 'vsite', 'ratingN')}${(s.quotes || []).map((q, i) => `<div class="kv"><span><i>«${esc(q.t)}»</i><br><small class="muted">— ${esc(q.a)}</small></span><button class="btn sm red" data-a="vsdel" data-k="quoteDel" data-v="${i}">🗑</button></div>`).join('')}<button class="btn sm" data-a="vquote" style="margin-top:10px">➕ Цитата відгуку</button></div>
        <div class="card"><h3>⚙️ Функції</h3>${tgl('📅 Бронювання на сайті', s.bookOn, 'vsiteTgl', 'bookOn')}${tgl('🎟 Подарункові сертифікати', s.certOn, 'vsiteTgl', 'certOn')}${row('Мін. сума передзамовлення', s.preMin, 'vsite', 'preMin')}</div></div>`;
    },
    menu(v) {
      const cats = v.d.menu.categories.filter(c => !c.tech), q = (S.mq || '').toLowerCase();
      return `<div class="vhead"><input id="mq" placeholder="🔎 Пошук страви" value="${esc(S.mq || '')}"><button class="btn sm primary" data-a="mItem">➕ Страва</button><button class="btn sm" data-a="mCat">📂 Розділ</button><button class="btn sm" data-a="mMore">⋯ Ще</button><button class="btn sm" data-a="vmbuild">🎨 Конструктор меню</button></div>
        ${cats.length ? cats.map(c => { const items = c.items.filter(i => !q || i.name.uk.toLowerCase().includes(q)); if (q && !items.length) return ''; return `<div class="card" style="margin-bottom:10px"><h3>${esc(c.name.uk)} <span class="muted">· ${c.items.length}</span></h3>${items.map(i => `<div class="kv"><span style="display:flex;gap:10px;align-items:center"><button data-a="mPhoto" data-id="${i.id}" title="Фото" style="flex:none;width:44px;height:44px;border-radius:10px;background:var(--card2) center/cover;${i.img ? `background-image:url('${esc(i.img)}')` : ''}">${i.img ? '' : '📷'}</button><span>${i.hidden ? '⛔ ' : ''}${esc(i.name.uk)}${i.size ? ` <small class="muted">${esc(i.size)}</small>` : ''}${i.desc?.uk ? `<br><small class="muted">${esc(i.desc.uk.slice(0, 80))}</small>` : ''}</span></span><span style="display:flex;gap:6px;align-items:center"><b class="money">${i.variants ? i.variants.map(x => x.p).join(' / ') : money(i.price)}</b><button class="btn sm" data-a="mItem" data-id="${i.id}">✏️</button><button class="btn sm red" data-a="mDel" data-id="${i.id}">🗑</button></span></div>`).join('') || '<div class="muted">порожньо</div>'}</div>`; }).join('') : '<div class="card muted">Меню порожнє — додайте страви або імпортуйте таблицю.</div>'}
`;
    },
    go(v) {
      const g = v.d.go, N = [['min', '💰 Мінімальна сума', '₴'], ['fee', '🛵 Ціна доставки', '₴'], ['free', '🎁 Безкоштовно від', '₴ (0 — ні)'], ['prep', '⏱ Час приготування', 'хв'], ['cash', '💸 Кешбек бонусами', '%'], ['bmax', '🎁 Бонусами можна оплатити до', '%']];
      return `<div class="grid"><div class="card"><h3>🛵 Замовлення з собою й доставка</h3>${tgl('Приймати замовлення з сайту', g.on, 'vgoTgl', 'on')}${tgl('🛵 Доставка', g.del, 'vgoTgl', 'del')}${tgl('🥡 Самовивіз', g.pick, 'vgoTgl', 'pick')}${row('🕐 Приймаємо з', g.from, 'vgo', 'from')}${row('🕙 Приймаємо до', g.to, 'vgo', 'to')}</div>
        <div class="card"><h3>💰 Гроші</h3>${N.map(([k, l, u]) => row(l, g[k] + ' ' + u, 'vgo', k)).join('')}</div><div class="card"><h3>📍 Зона й контакт</h3>${row('📍 Зона доставки', g.zone, 'vgo', 'zone')}${row('📞 Телефон для гостей', g.phone, 'vgo', 'phone')}</div></div>`;
    },
    staff(v) {
      const d = v.d, R = { admin: '👑 Адмін', waiter: '🧑‍🍳 Офіціант', cook: '👨‍🍳 Кухар', courier: '🛵 Кур\'єр' }, link = window.VVPUB(v.id, 'pos.html');
      const on = new Set((d.waiters || []).map(w => w.name || w));
      const list = [...d.staff].sort((a, b) => (a.role || '').localeCompare(b.role || '') || a.name.localeCompare(b.name));
      return `<div class="grid"><div class="card" style="grid-column:1/-1"><h3>👥 Працівники · ${d.staff.length}</h3>${list.map(s => `<div class="kv"><span>${on.has(s.name) ? '🟢 ' : ''}<b>${esc(s.name)}</b><br><small class="muted">${R[s.role] || s.role}</small></span><span class="kv-r" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" data-a="vstf" data-f="name" data-id="${s.id}" title="Імʼя">✏️</button><button class="btn sm" data-a="vstf" data-f="pin" data-id="${s.id}" title="Новий PIN">🔑</button><button class="btn sm" data-a="vstf" data-f="role" data-id="${s.id}" title="Роль">🔄</button><button class="btn sm red" data-a="vstaffDel" data-id="${s.id}" data-n="${esc(s.name)}">🗑</button></span></div>`).join('') || '<div class="muted">Ще нікого</div>'}
          <div class="btnrow" style="margin-top:10px"><button class="btn sm primary" data-a="vstfAdd">➕ Додати працівника</button></div><div class="muted" style="font-size:12px;margin-top:6px">✏️ імʼя (графік, ЗП і чайові переходять) · 🔑 новий PIN · 🔄 роль — працівника вийде з каси. Ставки, графік і виплати — у касі: 👥 Персонал.</div></div>
        <div class="card"><h3>🔗 Самореєстрація</h3><div class="muted" style="font-size:14px">1) Надішліть посилання каси. 2) Людина вводить код своєї ролі. 3) Пише імʼя й свій PIN.</div><div class="kv"><span style="min-width:0;overflow-wrap:anywhere"><small class="muted">${esc(link)}</small></span><button class="btn sm" data-a="copy" data-u="${esc(link)}">📋</button></div></div>
        <div class="card"><h3>🔑 Коди реєстрації</h3>${Object.entries(R).map(([r, l]) => `<div class="kv"><span>${l}</span><span style="display:flex;gap:6px;align-items:center"><b style="letter-spacing:1px">${esc(d.reg?.[r] || '')}</b><button class="btn sm" data-a="vreg" data-r="${r}">✏️</button></span></div>`).join('')}</div></div>`;
    },
    bots(v) {
      const L = v.d.live || {}, ext = v.id !== 'varvar';
      if (L.err) return `<div class="alert red">${esc(L.err)}</div>`;
      const st = (b, need) => !b?.on ? `<b class="muted">⬜ не підключено</b>` : !b.ok ? `<b style="color:var(--red)">❌ ${esc(b.err || 'не працює')}</b>` : b.lastErr ? `<b style="color:var(--orange)">⚠️ ${esc(b.lastErr)}</b>` : !b.hook ? `<b style="color:var(--orange)">⚠️ не отримує повідомлень</b>` : `<b style="color:var(--green)">✅ працює</b>`;
      const card = (b, ic, title, what, k) => `<div class="card"><h3>${ic} ${title}</h3><div class="kv"><span>${b?.user ? `<a href="https://t.me/${esc(b.user)}" target="_blank">@${esc(b.user)}</a>${b.name ? ` <small class="muted">${esc(b.name)}</small>` : ''}` : '<span class="muted">—</span>'}</span>${st(b)}</div><div class="muted" style="font-size:13px">${what}</div>${b?.pending > 20 ? `<div class="muted" style="font-size:12px">У черзі ${b.pending} непрочитаних оновлень</div>` : ''}${ext ? `<button class="btn sm ${b?.on ? '' : 'primary'}" data-a="vbotNew" data-k="${k}" style="margin-top:8px">${b?.on ? '🔁 Замінити бота' : '➕ Створити бота'}</button>` : ''}</div>`;
      const g = L.group || {};
      return `<div class="vhead"><button class="btn sm" data-a="vsec" data-s="bots">🔄 Перевірити ще раз</button>${g.ok ? '<button class="btn sm" data-a="vbotTest">📨 Тест у групу</button>' : ''}</div>
        <div class="grid">${card(L.staff, '🧑‍🍳', 'Бот персоналу', 'Замовлення, броні, звіти, ЗП — для працівників.', 'BOT_TOKEN')}
        <div class="card"><h3>👥 Група персоналу</h3><div class="kv"><span>${g.title ? esc(g.title) : '<span class="muted">—</span>'}</span>${!g.on ? '<b class="muted">⬜ не підключена</b>' : g.ok ? '<b style="color:var(--green)">✅ бот у групі</b>' : `<b style="color:var(--red)">❌ ${esc(g.err || '')}</b>`}</div><div class="muted" style="font-size:13px">Сюди приходять сповіщення: нові замовлення, броні, Z-звіт. Щоб підключити — додайте бота персоналу в робочу групу.</div></div>
        ${card(L.guest, '🍔', 'Бот гостей', 'Вхід у кабінет гостя, бонуси, статус броні, «Написати нам».', 'GUEST_BOT_TOKEN')}${card(L.courier, '🛵', 'Бот курʼєрів', 'Доставки для курʼєрів.', 'COURIER_BOT_TOKEN')}
        ${ext ? (L.staff?.ok || L.guest?.ok ? '<div class="card" style="grid-column:1/-1"><h3>🎨 Оформлення</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Назва, опис і аватарка всіх ботів — з назви й логотипа закладу.</div><button class="btn sm" data-a="vbrand">🎨 Оформити ботів</button></div>' : '') : '<div class="muted" style="font-size:13px;grid-column:1/-1">VARVAR: токени ботів зберігаються на сервері. Стан вище — справжній, перевірено в Telegram щойно.</div>'}</div>`;
    },
    bak(v) {
      const plat = S.me.role === 'platform', l = v.d.bak || [];
      return `<div class="card"><h3>💾 Резервні копії</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Щоночі система сама зберігає повну копію даних закладу (меню, чеки, звіти, склад, персонал, гості) і тримає 7 днів. ${plat ? 'Відновити можна будь-яку.' : 'Якщо щось зламалось — розробник відновить потрібний день (🆘 Допомога).'}</div>
        <div class="btnrow" style="margin-bottom:8px"><button class="btn sm primary" data-a="bakNow">💾 Зробити копію зараз</button></div>
        ${l.length ? l.map(b => `<div class="kv"><span>${/^\d{4}-\d\d-\d\d$/.test(b.tag) ? '🌙 ' + b.tag.split('-').reverse().join('.') : esc(b.tag)}<br><small class="muted">${b.at ? new Date(b.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''} · ${b.n || '?'} записів · ${b.kb || '?'} КБ</small></span><span style="display:flex;gap:6px"><button class="btn sm" data-a="bakGet" data-t="${esc(b.tag)}">⬇️</button>${plat ? `<button class="btn sm red" data-a="bakRestore" data-t="${esc(b.tag)}">♻️ Відновити</button>` : ''}</span></div>`).join('') : '<div class="muted">Копій ще немає — перша буде вночі (або натисніть «Зробити копію зараз»).</div>'}</div>`;
    },
    log(v) { return SECV.bak(v) + '<h3 style="margin:18px 4px 8px">📜 Журнал змін</h3>' + SECV.log0(v); },
    log0(v) {
      const m = S.logM || new Date().toLocaleDateString('sv-SE').slice(0, 7), q = (S.logQ || '').toLowerCase(), l = v.d.list.filter(x => !q || x.t.toLowerCase().includes(q));
      return `<div class="btnrow" style="margin-bottom:10px;align-items:center"><input type="month" id="logM" value="${m}" style="max-width:170px;min-height:34px;padding:6px 10px"><input id="logQ" placeholder="🔎 Хто / що (напр. Меню, Олег)" value="${esc(S.logQ || '')}" style="max-width:260px;min-height:34px;padding:6px 12px"></div>
        <div class="card">${l.length ? l.slice(0, 500).map(x => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${esc(x.t)}</span><small class="muted" style="white-space:nowrap">${new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') : '<div class="muted">Записів немає</div>'}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Зміни меню, цін, налаштувань, чеків, персоналу — хто й коли. Журнал ведеться з ${new Date().toLocaleDateString('uk-UA')}.</div>`;
    },
    printer(v) {
      const r = v.d.ready, q = v.d.q || [], K = { kitchen: '👨‍🍳', receipt: '🧾', precheck: '🧾', test: '🧪', z: '📊', qr: '🔳' }, dv = v.d.dev, rc = v.d.rc || {}, ext = v.id !== 'varvar';
      const TY = { win: '🖨 Windows', winusb: '🔌 USB', winnet: '🌐 мережа', winbt: '📶 Bluetooth', raw: '🔌 USB без драйвера', net: '🌐 мережа (Wi-Fi / кабель)', com: '📶 COM / Bluetooth' };
      const sel = (k, cur) => `<select data-route="${k}" style="max-width:100%"><option value="">🤖 Автоматично${dv?.using ? ' (' + esc((dv.list.find(x => x.id === dv.using) || {}).name || dv.using) + ')' : ''}</option>${(dv?.list || []).map(x => `<option value="${esc(x.id)}" ${x.id === cur ? 'selected' : ''}>${esc(x.name)} — ${TY[x.type] || x.type}</option>`).join('')}</select>`;
      const route = v.d.route || {};
      return `<div class="vhead"><button class="btn sm primary" data-a="vprintTest">🧪 Тест принтера</button><button class="btn sm" data-a="vrcTest">🧾 Пробний чек</button><button class="btn sm" data-a="vqrPrint">🖨 QR столу</button><button class="btn sm" data-a="vqrAll">🔳 Усі QR-коди</button></div>
        <div class="grid"><div class="card"><h3>🖨 Стан</h3><div class="kv"><span>Програма друку${dv?.pc ? `<br><small class="muted">💻 ${esc(dv.pc)} · версія ${esc(dv.ver || '1')}</small>` : ''}</span><b>${r.printer === 1 ? '✅ на звʼязку' : r.printer ? '⚠️ давно не було' : '⬜ ще не запускалась'}</b></div><div class="kv"><span>У черзі</span><b>${q.length}</b></div>
          ${q.map(j => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${K[j.kind] || '🖨'} ${esc(j.txt || j.kind)}<br><small class="muted">${j.at ? new Date(j.at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : ''}</small></span><button class="btn sm red" data-a="vpqDel" data-id="${esc(j.id)}">🗑</button></div>`).join('')}
          ${q.length ? '<button class="btn sm red" data-a="vpqClear" style="margin-top:8px">🗑 Очистити всю чергу</button>' : ''}</div>
        <div class="card"><h3>🔎 Знайдені принтери</h3>${dv?.list?.length ? `${dv.list.map(x => `<div class="kv"><span>${x.id === dv.using ? '✅ ' : ''}${esc(x.name)}<br><small class="muted">${TY[x.type] || x.type}</small></span></div>`).join('')}
            <label style="margin-top:10px">🧾 Чеки й пречеки друкувати на${sel('receipt', route.receipt)}</label><label>👨‍🍳 Бігунки на кухню${sel('kitchen', route.kitchen)}</label><div class="muted" style="font-size:12px">Програма шукає принтери сама: USB, мережа (Wi-Fi / кабель), Bluetooth. Список оновлюється кожні 10 хв.</div>`
          : `<div class="muted" style="font-size:13px">${dv ? 'Програма не знайшла жодного принтера — перевірте живлення й кабель / Wi-Fi / Bluetooth.' : 'Зʼявиться після встановлення нової версії програми друку (нижче).'}</div>`}</div>
        <div class="card"><h3>🧾 Вигляд чека</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Папір ${rc.w || 80} мм · логотип ${rc.logo ? (rc.logoImg ? 'свій' : 'закладу') : 'вимкнено'}${rc.qr ? ' · QR меню' : ''}. Шапка, тексти, що показувати, бігунок на кухню — з живим переглядом.</div><button class="btn primary" data-a="vrc">🧾 Конструктор чека</button></div>
        <div class="card"><h3>⬇️ Встановлення на компʼютер з принтером</h3>${ext ? `<ol class="muted" style="font-size:13px;padding-left:18px;margin:0 0 10px"><li>Завантажте встановлювач (один файл) на Windows-компʼютер, до якого підключено принтер</li><li>Запустіть його й дозвольте права адміністратора</li><li>Програма сама знайде принтери (USB, мережа, Bluetooth), надрукує пробний чек і запуститься разом з Windows</li></ol><button class="btn sm primary" data-a="vprintSetup">⬇️ Встановлювач для Windows</button><div class="muted" style="font-size:12px;margin-top:6px">⚠️ Файл містить ключ вашого принтера — не пересилайте його стороннім.</div>`
          : '<div class="muted" style="font-size:13px">VARVAR: програма вже встановлена на компʼютері закладу. Нова версія (сама шукає принтери) ставиться так само встановлювачем — напишіть розробнику, ключ VARVAR зберігається лише на сервері.</div>'}</div></div>`;
    },
  };

  // 🧩 шаблони меню за типом закладу — швидкий старт (ціни потім змінити)
  const T = (cat, list) => list.map(([name, price, size]) => ({ cat, name, price, size: size || '' }));
  const TPL = {
    cafe: ['☕ Кав\'ярня', [...T('Кава', [['Еспресо', 45, '30 мл'], ['Американо', 50, '200 мл'], ['Капучино', 65, '250 мл'], ['Лате', 70, '300 мл'], ['Флет уайт', 75, '200 мл'], ['Раф', 85, '300 мл']]), ...T('Чай та інше', [['Чай чорний / зелений', 45, '400 мл'], ['Какао', 65, '300 мл'], ['Лимонад', 80, '400 мл']]), ...T('Десерти', [['Чізкейк', 120, '150 г'], ['Круасан', 65], ['Брауні', 90]])]],
    bar: ['🍸 Бар', [...T('Коктейлі', [['Апероль шприц', 210], ['Мохіто', 190], ['Негроні', 220], ['Маргарита', 200]]), ...T('Пиво', [['Світле розливне', 75, '500 мл'], ['Темне розливне', 85, '500 мл'], ['Сидр', 95, '330 мл']]), ...T('Закуски', [['Сирна тарілка', 290], ['Крильця BBQ', 240], ['Картопля фрі', 110], ['Грінки з часником', 120]])]],
    pizza: ['🍕 Піцерія', [...T('Піца', [['Маргарита', 210, '30 см'], ['Пепероні', 260, '30 см'], ['Чотири сири', 290, '30 см'], ['Гавайська', 260, '30 см'], ['М\'ясна', 310, '30 см']]), ...T('Салати', [['Цезар з куркою', 210], ['Грецький', 180]]), ...T('Напої', [['Кола', 55, '500 мл'], ['Сік', 60, '250 мл']])]],
    rest: ['🍽 Ресторан', [...T('Закуски', [['Брускети', 160], ['Сирна тарілка', 320]]), ...T('Салати', [['Цезар', 220], ['Грецький', 190]]), ...T('Супи', [['Борщ', 150, '350 г'], ['Крем-суп грибний', 160, '300 г']]), ...T('Основні страви', [['Стейк зі свинини', 320, '250 г'], ['Куряче філе гриль', 260], ['Паста карбонара', 240]]), ...T('Десерти', [['Тірамісу', 150], ['Чізкейк', 140]]), ...T('Напої', [['Лимонад', 90, '400 мл'], ['Американо', 50]])]],
  };
  // ---------- дії ----------
  const img = (max, png) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async () => { const f = i.files[0]; if (!f) return res(null); const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .82)); }; im.src = URL.createObjectURL(f); }; i.click(); });
  const ask = (title, val, type = 'text', long) => new Promise(res => { let done = false; const bg = modal(esc(title), long ? `<textarea name="v" rows="6" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px">${esc(val ?? '')}</textarea>` : `<input name="v" type="${type}" value="${esc(val ?? '')}">`, async f => { done = true; res(f.v.value); }); const t = setInterval(() => { if (!bg.isConnected) { clearInterval(t); if (!done) res(null); } }, 300); });
  // 📥 таблиця з Excel / Google Sheets → рядки меню (Розділ | Назва | Ціна | Опис | Вага), стовпці впізнаємо за заголовком або вмістом
  function parseTable(txt) {
    const lines = txt.split(/\r?\n/).map(l => l.replace(/[ \r]+$/, '')).filter(l => l.trim()); /* порожній перший стовпець (розділ лише в першому рядку групи) — не обрізаємо */ if (!lines.length) return [];
    const sep = lines[0].includes('\t') ? '\t' : lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
    const cells = lines.map(l => l.split(sep).map(x => x.replace(/^"|"$/g, '').trim()));
    const h = cells[0].map(x => x.toLowerCase()), has = re => h.findIndex(x => re.test(x));
    let ci = { cat: has(/розд|катег|груп|categ/), name: has(/назв|страв|товар|name|позиц/), price: has(/ціна|цена|вартість|price|сума/), desc: has(/опис|склад|desc/), size: has(/ваг|вихід|об.єм|порц|size|грам/) }, start = 1;
    if (ci.name < 0 || ci.price < 0) { // без заголовка: назва — перший текстовий стовпець, ціна — перший числовий
      start = 0; const r = cells[0]; ci = { cat: -1, desc: -1, size: -1, name: r.findIndex(x => x && isNaN(+x.replace(',', '.'))), price: r.findIndex(x => x && !isNaN(+x.replace(',', '.').replace(/[^\d.]/g, '')) && /\d/.test(x)) };
      if (r.length >= 3 && ci.name === 1 && isNaN(+r[0])) { ci.cat = 0; }
    }
    let lastCat = 'Меню';
    return cells.slice(start).map(r => { if (ci.cat >= 0 && r[ci.cat]) lastCat = r[ci.cat]; return { cat: lastCat, name: r[ci.name] || '', price: r[ci.price] || '', desc: ci.desc >= 0 ? r[ci.desc] || '' : '', size: ci.size >= 0 ? r[ci.size] || '' : '' }; }).filter(x => x.name && /\d/.test(x.price));
  }
  async function act(fn, ok) { try { await fn(); if (ok) toast(ok); await load(); } catch (e) { toast('⚠️ ' + e.message); } }

  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !S.cfgV) return; const a = el.dataset.a, d = el.dataset, v = S.cfgV, id = v.id;
    if (a === 'vsec') { v.sec = d.s; return load(); }
    if (a === 'vpickBack') { S.cfgV = null; S.tab = 'cfg'; return render(); }
    if (a === 'vback') { S.cfgV = null; S.tab = 'ven'; return render(); }
    if (a === 'vsite') { const long = ['about', 'banquet', 'hookah'].includes(d.k), x = await ask(el.closest('.kv')?.querySelector('span')?.firstChild?.textContent || d.k, v.d.site[d.k], ['rating', 'ratingN', 'preMin'].includes(d.k) ? 'number' : 'text', long); if (x == null) return; return act(() => vapi(id, 'siteSet', { k: d.k, v: x }), '💾 Збережено'); }
    // 🌐 сайт: хіти, акції, відгуки (раніше — лише в касі)
    if (a === 'vhits') { const all = v.d.menu.categories.filter(c => !c.tech).flatMap(c => c.items.filter(i => !i.hidden).map(i => ({ ...i, cat: c.name.uk }))), sel = new Set(v.d.site.hits || []);
      return modal('🍽 Хіти на сайті (до 4)', `<div class="muted" style="font-size:13px;margin-bottom:8px">Нічого не обрано — сайт покаже страви з фото автоматично.</div><div style="max-height:55vh;overflow:auto;display:grid;gap:4px">${all.map(i => `<label class="kv" style="cursor:pointer"><span>${esc(i.name.uk)}<br><small class="muted">${esc(i.cat)}${i.img ? ' · 📷' : ''}</small></span><input type="checkbox" name="h" value="${i.id}" ${sel.has(i.id) ? 'checked' : ''} style="width:22px;height:22px"></label>`).join('')}</div>`,
        async f => { const l = [...f.querySelectorAll('[name=h]:checked')].map(x => x.value); if (l.length > 4) throw new Error('Не більше 4'); await vapi(id, 'siteSet', { k: 'hits', v: l }); toast('🍽 Збережено'); load(); }); }
    if (a === 'vpromo') return modal('🎉 Нова акція', '<label>Назва<input name="t" required maxlength="80" placeholder="Щасливі години 15–17"></label><label>Опис (необовʼязково)<input name="d" maxlength="300" placeholder="−20% на коктейлі"></label>', async f => { await vapi(id, 'siteSet', { k: 'promoAdd', v: { t: f.t.value, d: f.d.value } }); toast('🎉 Додано'); load(); });
    if (a === 'vquote') return modal('💬 Цитата відгуку', '<label>Текст<input name="t" required maxlength="300"></label><label>Автор<input name="a" maxlength="40" placeholder="Олена, Google"></label>', async f => { await vapi(id, 'siteSet', { k: 'quoteAdd', v: { t: f.t.value, a: f.a.value } }); toast('💬 Додано'); load(); });
    if (a === 'vsdel') { if (!confirm('Видалити?')) return; return act(() => vapi(id, 'siteSet', { k: d.k, v: d.k === 'quoteDel' ? +d.v : d.v }), '🗑 Видалено'); }
    // 🍽 меню: рідкісні дії — у «⋯ Ще»
    if (a === 'mMore') { const bg = modal('🍽 Меню · ще', `<div style="display:grid;gap:8px"><button class="btn" data-a="mImport">📥 Імпорт з Excel / Google</button><button class="btn" data-a="mTpl">🧩 Шаблон меню за типом закладу</button><button class="btn" data-a="mUndo">↩️ Відмінити останню зміну</button></div>`); bg.addEventListener('click', e => { if (e.target.closest('[data-a]')) bg.remove(); }, true); return; }
    // 👥 персонал — як у касі
    if (a === 'vstf') { const st = v.d.staff.find(x => x.id === d.id); if (!st) return;
      if (d.f === 'name') { const x = await ask('✏️ Нове імʼя (графік, ЗП і чайові перейдуть)', st.name); if (!x || x.trim() === st.name) return; return act(() => vapi(id, 'staffEdit', { id: st.id, name: x.trim() }), '✏️ Імʼя змінено'); }
      if (d.f === 'pin') { const x = await ask(`🔑 Новий PIN для ${st.name} (4 цифри)`, '', 'tel'); if (!x) return; return act(() => vapi(id, 'staffEdit', { id: st.id, pin: x }), '🔑 PIN змінено'); }
      if (d.f === 'role') return modal(`🔄 Роль: ${esc(st.name)}`, `<label>Нова роль<select name="r">${[['admin', '👑 Адмін'], ['waiter', '🧑‍🍳 Офіціант'], ['cook', '👨‍🍳 Кухар'], ['courier', '🛵 Курʼєр']].map(([r, l]) => `<option value="${r}" ${r === st.role ? 'selected' : ''}>${l}</option>`).join('')}</select></label><div class="muted" style="font-size:13px">Працівника вийде з каси — увійде знову з новими правами.</div>`, async f => { if (f.r.value === st.role) return; await vapi(id, 'staffEdit', { id: st.id, role: f.r.value }); toast('🔄 Роль змінено'); load(); });
    }
    if (a === 'vstfAdd') return modal('➕ Новий працівник', `<label>Імʼя<input name="n" required maxlength="30"></label><label>PIN (4 цифри)<input name="p" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4"></label><label>Роль<select name="r"><option value="waiter">🧑‍🍳 Офіціант</option><option value="cook">👨‍🍳 Кухар</option><option value="courier">🛵 Курʼєр</option><option value="admin">👑 Адмін</option></select></label>`, async f => { await vapi(id, 'staffAdd', { name: f.n.value.trim(), pin: f.p.value, role: f.r.value }); toast('👥 Додано'); load(); });
    // 🤖 боти
    // 🖌 стиль каси закладу (lookv) — лише тут, у касі вибору більше немає
    if (a === 'vsk') { const look = d.v === 'old' ? null : window.VVSkin.PRE[d.p][2]; return act(() => vapi(id, 'lookVSet', { look }), '🖌 Стиль каси збережено — каси оновляться самі'); }
    if (a === 'vskCode') { const t = prompt('Вставте код стилю (VARVAR-STYLE {…})'); if (!t) return; let K; try { K = window.VVSkin.parse(t); } catch { K = null; } if (!K) return toast('⚠️ Невірний код'); return act(() => vapi(id, 'lookVSet', { look: K }), '🖌 Стиль каси збережено'); }
    if (a === 'vskEdit') { const VS = window.VVSkin, K = { ...VS.BASE, ...(v.d.lookV || {}) };
      const bg = modal('🎨 Конструктор стилю каси', `<div class="muted" style="font-size:13px;margin-bottom:8px">Кабінет одразу показує, як виглядатиме каса. Збереження — для всіх пристроїв закладу.</div>${VS.editorHTML(K)}`, async () => { const look = VS.diff(K); await vapi(id, 'lookVSet', { look: Object.keys(look).length ? look : null }); toast('🖌 Стиль каси збережено'); load(); });
      VS.bind(bg.querySelector('.skc'), K, k => VS.apply(k, false)); VS.apply(K, false);
      new MutationObserver((m, o) => { if (!bg.isConnected) { o.disconnect(); window.OWNSKIN?.(); } }).observe(document.body, { childList: true }); return; }
    if (a === 'vbotNew') { /* 🤖 майстер: Telegram дозволяє створити бота лише через @BotFather — ведемо по кроках і підставляємо готові назви */
      const nm = S.venues.find(x => x.id === id)?.name || id, W = { BOT_TOKEN: ['🧑‍🍳 бот персоналу', ' · персонал', 'staff'], GUEST_BOT_TOKEN: ['🍔 бот гостей', '', ''], COURIER_BOT_TOKEN: ['🛵 бот курʼєрів', ' · курʼєри', 'courier'] }[d.k];
      const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', 'ʼ': '', "'": '' };
      const slug = nm.toLowerCase().split('').map(c => TR[c] ?? c).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20) || 'cafe', title = nm + W[1], user = slug + (W[2] ? '_' + W[2] : '') + '_bot';
      const cp = t => `<button type="button" class="btn sm" data-cp="${esc(t)}">📋</button>`;
      const bg = modal('➕ Створити ' + W[0], `<ol style="padding-left:18px;margin:0;display:grid;gap:12px;font-size:14px">
          <li>Відкрийте <a class="btn sm primary" href="https://t.me/BotFather?start=newbot" target="_blank">@BotFather</a> і надішліть йому <b>/newbot</b></li>
          <li>Назва бота (що бачать люди):<div class="kv"><b>${esc(title)}</b>${cp(title)}</div></li>
          <li>Імʼя бота (латиницею, закінчується на <b>bot</b>). Якщо зайняте — додайте цифру:<div class="kv"><b>${esc(user)}</b>${cp(user)}</div></li>
          <li>BotFather надішле токен (виглядає як <code>123456789:AA…</code>) — скопіюйте й вставте сюди:</li></ol>
          <label style="margin-top:8px">Токен<input name="tok" required autocomplete="off" placeholder="123456789:AA…"></label><div class="muted" style="font-size:12px">Після збереження система сама перевірить бота, підключить його, поставить назву, опис і логотип закладу.${d.k === 'BOT_TOKEN' ? ' Потім додайте бота у вашу робочу групу Telegram — вона підключиться сама.' : ''}</div>`,
        async f => { const tok = f.tok.value.trim(); if (!/^\d{6,12}:[\w-]{30,}$/.test(tok)) throw new Error('Це не схоже на токен — скопіюйте повністю з повідомлення BotFather'); const r = await api('secrets', { venue: id, f: { [d.k]: tok } }); toast('✅ Підключено: ' + Object.values(r.names || {}).map(n => '@' + n).join(', ')); load(); });
      bg.addEventListener('click', async e => { const b = e.target.closest('[data-cp]'); if (!b) return; try { await navigator.clipboard.writeText(b.dataset.cp); toast('📋 Скопійовано'); } catch { prompt('Скопіюйте:', b.dataset.cp); } });
      return; }
    if (a === 'vbotTest') { el.disabled = true; try { const r = await api('bots', { venue: id, test: 1 }); toast(r.sent ? '📨 Надіслано — перевірте групу' : '⚠️ ' + (r.err || 'не вдалося')); } catch (x) { toast('⚠️ ' + x.message); } el.disabled = false; return; }
    // 🖨 принтер — як у касі
    if (a === 'vrc') { const lu = base(id) + '/print/logo.png'; return window.OWNPRINT.open({ rcpt: v.d.rc, logoUrl: lu, toast, vapi: (op, data) => vapi(id, op, data), onSave: r => { v.d.rc = r; render(); } }); }
    if (a === 'vrcTest') return act(() => vapi(id, 'rcptTest'), '🧾 Пробний пречек — у черзі друку');
    if (a === 'vprintSetup') { const key = v.d.ready?.printKey; if (!key) return toast('⚠️ Ключ принтера ще не створено — відкрийте 🚀 Запуск'); return window.OWNPRINT.installer(base(id), key); }
    if (a === 'vpqDel') return act(() => vapi(id, 'printClear', { id: d.id }), '🗑 Видалено');
    if (a === 'vpqClear') { if (!confirm('Очистити всю чергу друку? Те, що ще не надрукувалось, принтер не надрукує.')) return; return act(() => vapi(id, 'printClear', {}), '🗑 Чергу очищено'); }
    if (a === 'vqrPrint') { const n = v.d.ready?.tables || 15; return modal('🖨 Надрукувати QR столу', `<label>Стіл<select name="t">${Array.from({ length: n }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label>`, async f => { await vapi(id, 'printQr', { t: +f.t.value }); toast('🖨 QR столу ' + f.t.value + ' — у черзі друку'); }); }
    if (a === 'vqrAll') { let r; try { r = await vapi(id, 'qrInfo'); } catch (x) { return toast('⚠️ ' + x.message); }
      return modal(`🔳 QR-коди · ${r.n} столів`, `<div class="muted" style="font-size:13px;margin-bottom:8px">У кожного столу свій QR — гість сканує й замовляє одразу на цей стіл. Натисніть QR — збережеться картинка 1000×1000.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;max-height:55vh;overflow:auto">${r.list.map(x => `<a href="${esc(x.img)}?s=24" download="QR-стіл-${x.t}.png" target="_blank" style="background:#fff;border-radius:12px;padding:8px;text-align:center;color:#111;text-decoration:none;font-weight:700"><img src="${esc(x.img)}" alt="" style="width:100%;display:block">Стіл ${x.t}</a>`).join('')}</div><button class="btn" data-a="vqrSheet" style="margin-top:10px;width:100%">💾 Аркуш A4 для друкарні</button><button class="btn" data-a="vqrPrintAll" style="margin-top:8px;width:100%">🖨 Надрукувати всі на принтері чеків</button>${r.next > Date.now() ? `<div class="muted" style="font-size:12px;margin-top:8px">🔄 Нові коди можна створити після ${new Date(r.next).toLocaleDateString('uk-UA')}</div>` : '<button class="btn red" data-a="vqrNew" style="margin-top:8px;width:100%">🔄 Створити нові коди (старі перестануть працювати)</button>'}`); }
    if (a === 'vqrPrintAll') { document.querySelector('.modal-bg')?.remove(); return act(async () => { const r = await vapi(id, 'printQr', { all: 1 }); toast(`🖨 ${r.n} QR — у черзі друку`); }); }
    if (a === 'vqrNew') { if (!confirm('🔄 Створити нові QR-коди?\n\nУсі ВЖЕ НАДРУКОВАНІ QR перестануть давати доступ до замовлення — їх треба буде замінити на столах.')) return; document.querySelector('.modal-bg')?.remove(); try { await vapi(id, 'qrNew'); toast('🔄 Нові коди створено'); } catch (x) { return toast('⚠️ ' + x.message); } el.dataset.a = 'vqrAll'; return document.querySelector('[data-a="vqrAll"]')?.click(); }
    if (a === 'vqrSheet') { let r; try { r = await vapi(id, 'qrInfo'); } catch (x) { return toast('⚠️ ' + x.message); } const name = esc(v.d.site?.name || S.venues.find(x => x.id === id)?.name || ''), w = window.open('', '_blank'); if (!w) return toast('⚠️ Дозвольте спливаючі вікна');
      w.document.write(`<!doctype html><meta charset="utf-8"><title>QR-коди — ${name}</title><style>@page{size:A4;margin:8mm}body{margin:0;font-family:system-ui,sans-serif}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:6mm}.c{border:1px dashed #bbb;border-radius:4mm;padding:6mm;text-align:center;break-inside:avoid;height:84mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center}.c h2{margin:0;font-size:20pt}.c img{width:52mm;height:52mm}.c b{font-size:18pt}.bar{padding:10px}@media print{.bar{display:none}}</style><div class="bar"><button onclick="print()" style="font-size:16px;padding:8px 16px">🖨 Друк / зберегти PDF</button></div><div class="g">${r.list.map(x => `<div class="c"><h2>${name}</h2><img src="${x.img}?s=20"><b>СТІЛ ${x.t}</b><small>Скануйте — меню й замовлення</small></div>`).join('')}</div>`); w.document.close(); return; }
    if (a === 'vmbuild') { let site; try { site = v.d.site || (await vapi(id, 'siteGet')).site; } catch (x) { return toast('⚠️ ' + x.message); } const url = location.origin + window.VVLOC(id, 'about.html'), pub = window.VVPUB(id, ''); return window.OWNSITE.open({ site, url, pub: window.VVPUB(id, 'index.html'), toast, vapi: (op, data) => vapi(id, op, data), onSave: st => { if (v.d.site) v.d.site = st; } }, 'menu'); }
    if (a === 'vbuild') { const url = location.origin + window.VVLOC(id, 'about.html'), pub = window.VVPUB(id, ''); return window.OWNSITE.open({ site: v.d.site, url, pub, toast, vapi: (op, data) => vapi(id, op, data), onSave: st => { v.d.site = st; render(); } }); }
    if (a === 'vsiteTgl') return act(() => vapi(id, 'siteSet', { k: d.k, v: d.on === '1' ? 0 : 1 }), '💾 Збережено');
    if (a === 'vsiteDel') return act(() => vapi(id, 'siteSet', { k: d.k, v: '' }), '🗑 Прибрано');
    if (a === 'vphotoDel') return act(() => vapi(id, 'siteSet', { k: 'photoDel', v: d.u }), '🗑 Прибрано');
    if (a === 'vimg') { const data = await img(d.k === 'logo' ? 512 : 1600, d.k === 'logo'); if (!data) return; return act(() => vapi(id, 'sitePhoto', { data, logo: d.k === 'logo', hero: d.k === 'hero' }), '🖼 Збережено'); }
    if (a === 'vgo') { const x = await ask(el.closest('.kv')?.querySelector('span')?.firstChild?.textContent || d.k, v.d.go[d.k], ['from', 'to', 'zone', 'phone'].includes(d.k) ? 'text' : 'number'); if (x == null) return; return act(() => vapi(id, 'goCfgSet', { k: d.k, v: x }), '💾 Збережено'); }
    if (a === 'vgoTgl') return act(() => vapi(id, 'goCfgSet', { k: d.k, v: d.on === '1' ? 0 : 1 }), '💾 Збережено');
    if (a === 'vcfg') { const x = await ask(el.closest('.kv')?.querySelector('span')?.firstChild?.textContent || d.k, d.k === 'tables' ? v.d.n : v.d.cfg[d.k], 'number'); if (x == null) return; return act(() => vapi(id, 'cfgSet', { k: d.k, v: x }), '💾 Збережено'); }
    if (a === 'vcfgTgl') return act(() => vapi(id, 'cfgSet', { k: d.k, v: d.on === '1' ? 0 : 1 }), '💾 Збережено');
    if (a === 'vreg') { const x = await ask('Новий код (4–8 цифр)', v.d.reg?.[d.r], 'tel'); if (x == null) return; return act(() => vapi(id, 'regCode', { role: d.r, code: x }), '🔑 Код змінено'); }
    if (a === 'vstaffDel') { if (!confirm(`Видалити ${d.n}? Працівника одразу викине з каси.`)) return; return act(() => vapi(id, 'staffDel', { id: d.id }), '🗑 Видалено'); }
    if (a === 'vbrand') { el.disabled = true; try { const r = await api('brand', { venue: id }); toast(r.logo ? '🎨 Готово — назви, описи й аватарки оновлено' : '🎨 Назви й описи оновлено (додайте логотип для аватарки)'); } catch (x) { toast('⚠️ ' + x.message); } el.disabled = false; return; }
    if (a === 'bakNow') { el.disabled = true; return act(async () => { const r = await api('bak', { venue: id, do: 'now' }); toast(`💾 Копію збережено: ${r.n} записів, ${r.kb} КБ`); }); }
    if (a === 'bakGet') { try { const r = await api('bak', { venue: id, do: 'get', tag: d.t }); const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([r.data], { type: 'application/json' })); l.download = `backup-${id}-${d.t}.json`; l.click(); } catch (x) { toast('⚠️ ' + x.message); } return; }
    if (a === 'bakRestore') return modal('♻️ Відновити дані з копії ' + esc(d.t) + '?', `<div class="alert red">Усі поточні дані закладу буде замінено даними з цієї копії. Перед цим система збереже ще одну копію «до відновлення».</div><label>Щоб підтвердити, введіть адресу закладу: <b>${esc(id)}</b><input name="c" autocomplete="off" required></label>`, async f => { const r = await api('bak', { venue: id, do: 'restore', tag: d.t, confirm: f.c.value.trim() }); toast(`♻️ Відновлено: ${r.n} записів`); load(); });
    if (a === 'vprintTest') return act(() => vapi(id, 'printTest'), '🧾 Тест відправлено');
    // меню
    if (a === 'mCat') { const n = await ask('📂 Назва розділу', ''); if (!n) return; return act(() => vapi(id, 'catAdd', { name: n }), '📂 Розділ додано'); }
    if (a === 'mDel') { const it = v.d.menu.categories.flatMap(c => c.items).find(i => i.id === d.id); if (!confirm(`Видалити «${it?.name.uk}»?`)) return; return act(() => vapi(id, 'menuDel', { id: d.id }), '🗑 Видалено'); }
    if (a === 'mUndo') return act(() => vapi(id, 'menuUndo'), '↩️ Відмінено');
    if (a === 'mPhoto') { const data = await img(1200); if (!data) return; return act(() => vapi(id, 'menuPhoto', { id: d.id, data }), '📷 Фото збережено'); }
    if (a === 'mItem') {
      const cats = v.d.menu.categories.filter(c => !c.tech); if (!cats.length) return toast('Спершу додайте розділ 📂');
      const it = d.id ? v.d.menu.categories.flatMap(c => c.items).find(i => i.id === d.id) : null, cat = it ? v.d.menu.categories.find(c => c.items.includes(it)) : cats[0];
      return modal(it ? '✏️ ' + esc(it.name.uk) : '➕ Нова страва', `<label>Назва<input name="n" required value="${esc(it?.name.uk || '')}"></label><label>Розділ<select name="c">${cats.map(c => `<option value="${c.id}" ${c === cat ? 'selected' : ''}>${esc(c.name.uk)}</option>`).join('')}</select></label><label>Ціна, ₴<input name="p" type="number" min="1" required value="${it?.price || ''}"></label><label>Вага / об'єм<input name="s" value="${esc(it?.size || '')}" placeholder="350 г"></label><label>Опис<input name="d" value="${esc(it?.desc?.uk || '')}"></label>`,
        async f => { await vapi(id, 'menuSave', { item: { id: it?.id, cat: f.c.value, name: f.n.value, price: f.p.value, size: f.s.value, desc: f.d.value } }); toast('💾 Збережено'); load(); });
    }
    if (a === 'mTpl') { const k = await new Promise(res => { const bg = modal('🧩 Шаблон меню', `<div class="muted" style="font-size:13px;margin-bottom:8px">Додасть типові розділи й страви — потім змініть ціни, назви, фото.</div><div class="btnrow">${Object.entries(TPL).map(([k, [l, rows]]) => `<button type="button" class="btn" data-tpl="${k}">${l} · ${rows.length}</button>`).join('')}</div>`); bg.addEventListener('click', ev => { const b = ev.target.closest('[data-tpl]'); if (b) { bg.remove(); res(b.dataset.tpl); } }); });
      if (!k) return; return act(() => vapi(id, 'menuImport', { rows: TPL[k][1] }), '🧩 Шаблон додано'); }
    if (a === 'mImport') {
      const bg = modal('📥 Імпорт меню з таблиці', `<div class="muted" style="font-size:13px">Скопіюйте рядки з Excel або Google Sheets (Ctrl+C) і вставте сюди. Стовпці: <b>Розділ · Назва · Ціна · Опис · Вага</b> — порядок і заголовки можна свої, ми впізнаємо. Наявні страви з такою самою назвою — оновлять ціну.</div><textarea id="mImp" rows="8" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px" placeholder="Розділ	Назва	Ціна&#10;Бургери	Класичний	220&#10;Напої	Лимонад	90"></textarea><div id="mPrev" class="muted" style="font-size:13px;max-height:180px;overflow:auto"></div><label style="flex-direction:row;display:flex;gap:8px;align-items:center;color:var(--text)"><input type="checkbox" id="mRep" style="width:18px;height:18px"> Замінити все меню (інакше — додати)</label>`, async () => {
        const rows = parseTable($('#mImp').value); if (!rows.length) throw new Error('Не бачу рядків з назвою й ціною');
        if ($('#mRep').checked && !confirm('Видалити поточне меню й залишити лише імпортоване?')) return false;
        const r = await vapi(id, 'menuImport', { rows, replace: $('#mRep').checked }); toast(`📥 Додано ${r.add}, оновлено ${r.upd}, нових розділів ${r.cats}`); load();
      });
      bg.querySelector('#mImp').addEventListener('input', ev => { const rows = parseTable(ev.target.value); $('#mPrev').innerHTML = rows.length ? `Знайдено ${rows.length} страв:<br>` + rows.slice(0, 30).map(r => `${esc(r.cat)} → <b>${esc(r.name)}</b> — ${esc(r.price)} ₴`).join('<br>') + (rows.length > 30 ? '<br>…' : '') : ''; });
    }
  });
  document.addEventListener('change', async e => { if (e.target.dataset?.route && S.cfgV) { const v = S.cfgV, x = { ...(v.d.route || {}), [e.target.dataset.route]: e.target.value }; try { const r = await vapi(v.id, 'printRoute', x); v.d.route = r.route; toast('🖨 Збережено — програма друку підхопить за кілька хвилин'); } catch (y) { toast('⚠️ ' + y.message); } return; }
 if (e.target.id === 'logM' && S.cfgV) { S.logM = e.target.value; load(); } if (e.target.id === 'vpick' && S.cfgV) { S.cfgV.id = e.target.value; try { localStorage.setItem('own_cfgV', JSON.stringify(e.target.value)); } catch {} load(); } });
  document.addEventListener('input', e => { if (e.target.id === 'logQ' && S.cfgV) { S.logQ = e.target.value; clearTimeout(S.lqT); S.lqT = setTimeout(() => { const p = e.target.selectionStart; render(); const i = $('#logQ'); if (i) { i.focus(); i.setSelectionRange(p, p); } }, 250); } });
  document.addEventListener('input', e => { if (e.target.id === 'mq' && S.cfgV) { S.mq = e.target.value; clearTimeout(S.mqT); S.mqT = setTimeout(() => { const p = e.target.selectionStart; render(); const i = $('#mq'); if (i) { i.focus(); i.setSelectionRange(p, p); } }, 250); } });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'vbf' || !S.cfgV) return; e.preventDefault(); const f = e.target, err = $('#vberr'), x = {};
    for (const k of ['BOT_TOKEN', 'GUEST_BOT_TOKEN', 'COURIER_BOT_TOKEN']) if (f[k].value.trim()) x[k] = f[k].value.trim(); if (!Object.keys(x).length) return; err.textContent = '…';
    try { const r = await api('secrets', { venue: S.cfgV.id, f: x }); toast('✅ Підключено й оформлено: ' + Object.values(r.names).map(n => '@' + n).join(', ')); load(); } catch (y) { err.textContent = y.message; }
  });
  // 🎬 демо-заклад для показу клієнту: меню-шаблон + тексти сайту
  async function demo(type = 'cafe') {
    const id = 'demo-' + Math.random().toString(36).slice(2, 6), name = 'Демо · ' + TPL[type][0].replace(/^\S+\s/, '');
    const r = await api('venueNew', { id, name, owner: S.me.email, city: 'Демо' });
    await vapi(id, 'menuImport', { rows: TPL[type][1] });
    for (const [k, v] of [['tagline', 'Смачно, швидко, з любов\'ю'], ['about', 'Демонстраційний заклад: так виглядатиме сайт вашого закладу — меню, замовлення з собою й доставка, бронювання, сертифікати.'], ['phone', '+380 00 000 00 00'], ['addr', 'вул. Демонстраційна, 1'], ['from', '09:00'], ['to', '22:00']]) await vapi(id, 'siteSet', { k, v }).catch(() => {});
    return r;
  }
  return { view, demo, open: (id, sec = 'start') => { S.cfgV = { id, sec }; S.tab = 'cfg'; try { localStorage.setItem('own_cfgV', JSON.stringify(id)); } catch {} load(); } };
};
