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
  const SEC = [['start', '🚀 Запуск'], ['venue', '🏪 Заклад'], ['site', '🌐 Сайт'], ['menu', '🍽 Меню'], ['go', '🛵 Доставка'], ['pos', '🪑 Каса'], ['staff', '👥 Персонал'], ['bots', '🤖 Боти'], ['printer', '🖨 Принтер'], ['log', '📜 Журнал'], ['bak', '💾 Бекапи']];
  const V = () => S.cfgV; // { id, sec, d: {…дані розділу} }

  async function load() {
    const v = V(); v.d = null; render();
    try {
      const id = v.id, sec = v.sec;
      if (sec === 'start' || sec === 'bots' || sec === 'printer') v.d = { ready: await api('ready', { venue: id }) };
      if (sec === 'venue' || sec === 'site') v.d = { site: (await vapi(id, 'siteGet')).site };
      if (sec === 'menu') v.d = { menu: (await vapi(id, 'menu')).menu };
      if (sec === 'go') v.d = { go: (await vapi(id, 'goCfg')).cfg };
      if (sec === 'pos') { const st = await vapi(id, 'state'); v.d = { cfg: st.cfg, n: st.n }; }
      if (sec === 'staff') v.d = await vapi(id, 'staff');
      if (sec === 'bak') v.d = { list: (await api('bak', { venue: id, do: 'list' })).list };
      if (sec === 'log') v.d = { list: (await vapi(id, 'alog', { m: S.logM || '' })).list };
    } catch (e) { toast('⚠️ ' + e.message); v.d = { err: e.message }; }
    render();
  }
  // поля
  const row = (l, val, a, k, extra = '') => `<div class="kv"><span>${l}<br><small class="muted">${val === '' || val == null ? 'не вказано' : esc(val)}</small></span><button class="btn sm" data-a="${a}" data-k="${k}" ${extra}>✏️</button></div>`;
  const tgl = (l, on, a, k) => `<div class="kv"><span>${l}</span><button class="btn sm ${on ? 'primary' : ''}" data-a="${a}" data-k="${k}" data-on="${on ? 1 : 0}">${on ? '✅ Увімкнено' : '⛔ Вимкнено'}</button></div>`;

  function view() {
    const v = V(), venue = S.venues.find(x => x.id === v.id) || { name: v.id };
    const tabs = `<div class="seg2">${SEC.map(([k, l]) => `<button class="${v.sec === k ? 'on' : ''}" data-a="vsec" data-s="${k}">${l}</button>`).join('')}</div>`;
    const head = `<div class="btnrow" style="align-items:center;margin-bottom:10px">${S.venues.length > 1 ? '<button class="btn sm ghost" data-a="vpickBack">← Інший заклад</button>' : ''}<h2 style="margin:0">⚙️</h2>${S.venues.length > 1 ? `<select id="vpick" style="max-width:320px;font-weight:700">${S.venues.map(x => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<h2 style="margin:0">${esc(venue.name)}</h2>`}</div>${tabs}`;
    if (!v.d) return head + '<div class="muted">Завантаження…</div>';
    if (v.d.err) return head + `<div class="alert red">${esc(v.d.err)}</div>`;
    return head + (SECV[v.sec] || (() => ''))(v, venue);
  }
  const SECV = {
    start(v) {
      const r = v.d.ready, ok = x => x ? '✅' : '⬜', it = (done, l, sec, hint) => `<div class="kv"><span>${ok(done)} <b>${l}</b><br><small class="muted">${hint}</small></span>${done ? '' : `<button class="btn sm primary" data-a="vsec" data-s="${sec}">Налаштувати →</button>`}</div>`;
      const list = [[r.name && r.name !== 'Новий заклад', 'Назва', 'venue', esc(r.name || '')], [r.logo, 'Логотип', 'venue', 'квадратний PNG — у касі й на сайті'], [r.contacts, 'Контакти й години', 'site', 'телефон, адреса — для сайту й ботів'],
        [r.items > 0, 'Меню', 'menu', r.items ? `${r.items} страв у ${r.cats} розділах` : 'вручну або імпорт з Excel / Google'], [true, 'Зал', 'pos', `${r.tables} столів`], [r.staff > 0, 'Персонал', 'staff', r.staff ? `${r.staff} працівників` : 'надішліть посилання каси й коди'],
        [r.bots.staff && r.bots.group, 'Бот персоналу й група', 'bots', 'замовлення, броні, звіти — у Telegram'], [r.bots.guest, 'Бот гостей', 'bots', 'бонуси, броні, статус замовлення'], [r.site, 'Сайт-візитка', 'site', 'опис і головне фото'], [r.printer === 1, 'Принтер', 'printer', r.printer ? 'був на зв\'язку' : 'програма друку на комп\'ютері з принтером']];
      const done = list.filter(x => x[0]).length;
      return `<div class="card"><h3>🚀 Готовність закладу: ${done} з ${list.length}</h3><div style="height:8px;border-radius:5px;background:var(--card2);overflow:hidden;margin-bottom:10px"><div style="height:100%;width:${done / list.length * 100}%;background:var(--green)"></div></div>${list.map(x => it(...x)).join('')}</div>
        <div class="muted" style="font-size:13px;margin-top:8px">Усе можна змінювати будь-коли — тут або в касі закладу (⚙️ Налаштування).</div>`;
    },
    venue(v) {
      const s = v.d.site;
      return `<div class="grid"><div class="card"><h3>🏪 Заклад</h3>${row('Назва закладу', s.name, 'vsite', 'name')}<div class="muted" style="font-size:13px">У касі, на сайті, у вікні входу й у ботах.</div></div>
        <div class="card"><h3>🖼 Логотип</h3><div style="display:flex;gap:14px;align-items:center"><button data-a="vimg" data-k="logo" style="width:96px;height:96px;border-radius:18px;background:var(--card2);border:1px dashed var(--line2);overflow:hidden;font-size:28px">${s.logo ? `<img src="${esc(s.logo)}" style="width:100%;height:100%;object-fit:contain" alt="">` : '➕'}</button><div class="muted" style="font-size:13px">Квадратний PNG, найкраще з прозорим фоном.${s.logo ? '<br><button class="btn sm" data-a="vsiteDel" data-k="logo" style="margin-top:8px">✕ Прибрати</button>' : ''}</div></div></div></div>`;
    },
    site(v) {
      const s = v.d.site, F = [['tagline', '✨ Слоган'], ['about', '📝 Про нас'], ['phone', '📞 Телефон'], ['addr', '📍 Адреса'], ['from', '🕐 Відкриваємось'], ['to', '🕙 Зачиняємось'], ['insta', '📸 Instagram'], ['tg', '✈️ Telegram-канал'], ['gmaps', '🗺 Google Maps (посилання)'], ['reviewsUrl', '⭐ Відгуки Google (посилання)'], ['banquet', '🎉 Банкети (текст)'], ['hookah', '💨 Кальяни (текст)']];
      const url = location.origin + location.pathname.replace(/owner\.html$/, '') + 'about.html' + (v.id === 'varvar' ? '' : '?venue=' + v.id);
      return `<div class="btnrow" style="margin-bottom:10px"><a class="btn sm primary" href="${esc(url)}" target="_blank">🔗 Відкрити сайт</a><button class="btn sm" data-a="copy" data-u="${esc(url)}">Копіювати посилання</button><button class="btn sm" data-a="enter" data-v="${esc(v.id)}" data-set="site">✏️ Повний редактор (хіти, акції, відгуки, банкети, фото)</button></div>
        <div class="grid"><div class="card"><h3>📝 Тексти й контакти</h3>${F.map(([k, l]) => row(l, s[k], 'vsite', k)).join('')}</div>
        <div class="card"><h3>⚙️ Функції</h3>${tgl('📅 Бронювання на сайті', s.bookOn, 'vsiteTgl', 'bookOn')}${tgl('🎟 Подарункові сертифікати', s.certOn, 'vsiteTgl', 'certOn')}${row('⭐ Рейтинг (0–5)', s.rating, 'vsite', 'rating')}${row('Кількість відгуків', s.ratingN, 'vsite', 'ratingN')}${row('Мін. сума передзамовлення', s.preMin, 'vsite', 'preMin')}</div>
        ${blocksCard(s)}
        <div class="card"><h3>📷 Фото</h3><button data-a="vimg" data-k="hero" style="width:100%;height:140px;border-radius:14px;background:var(--card2) center/cover;${s.hero ? `background-image:url('${esc(s.hero)}')` : ''};color:#fff;font-weight:700;text-shadow:0 1px 4px #000">${s.hero ? '🔄 Замінити головне фото' : '🖼 Головне фото'}</button>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px">${(s.photos || []).map(u => `<div style="aspect-ratio:1;border-radius:10px;background:var(--card2) url('${esc(u)}') center/cover;position:relative"><button data-a="vphotoDel" data-u="${esc(u)}" style="position:absolute;top:2px;right:2px;background:#000a;border-radius:8px;width:24px;height:24px">✕</button></div>`).join('')}<button data-a="vimg" data-k="photo" style="aspect-ratio:1;border-radius:10px;background:var(--card2);border:1px dashed var(--line2);font-size:22px">➕</button></div></div></div>`;
    },
    menu(v) {
      const cats = v.d.menu.categories.filter(c => !c.tech), q = (S.mq || '').toLowerCase();
      return `<div class="btnrow" style="margin-bottom:10px"><button class="btn primary sm" data-a="mItem">➕ Страва</button><button class="btn sm" data-a="mCat">📂 Розділ</button><button class="btn sm" data-a="mImport">📥 Імпорт з Excel / Google</button><button class="btn sm" data-a="mTpl">🧩 Шаблон</button><input id="mq" placeholder="🔎 Пошук" value="${esc(S.mq || '')}" style="max-width:220px;min-height:34px;padding:6px 12px"></div>
        ${cats.length ? cats.map(c => { const items = c.items.filter(i => !q || i.name.uk.toLowerCase().includes(q)); if (q && !items.length) return ''; return `<div class="card" style="margin-bottom:10px"><h3>${esc(c.name.uk)} <span class="muted">· ${c.items.length}</span></h3>${items.map(i => `<div class="kv"><span style="display:flex;gap:10px;align-items:center"><button data-a="mPhoto" data-id="${i.id}" title="Фото" style="flex:none;width:44px;height:44px;border-radius:10px;background:var(--card2) center/cover;${i.img ? `background-image:url('${esc(i.img)}')` : ''}">${i.img ? '' : '📷'}</button><span>${i.hidden ? '⛔ ' : ''}${esc(i.name.uk)}${i.size ? ` <small class="muted">${esc(i.size)}</small>` : ''}${i.desc?.uk ? `<br><small class="muted">${esc(i.desc.uk.slice(0, 80))}</small>` : ''}</span></span><span style="display:flex;gap:6px;align-items:center"><b class="money">${i.variants ? i.variants.map(x => x.p).join(' / ') : money(i.price)}</b><button class="btn sm" data-a="mItem" data-id="${i.id}">✏️</button><button class="btn sm red" data-a="mDel" data-id="${i.id}">🗑</button></span></div>`).join('') || '<div class="muted">порожньо</div>'}</div>`; }).join('') : '<div class="card muted">Меню порожнє — додайте страви або імпортуйте таблицю.</div>'}
        <div class="btnrow"><button class="btn sm ghost" data-a="mUndo">↩️ Відмінити останню зміну</button></div>`;
    },
    go(v) {
      const g = v.d.go, N = [['min', '💰 Мінімальна сума', '₴'], ['fee', '🛵 Ціна доставки', '₴'], ['free', '🎁 Безкоштовно від', '₴ (0 — ні)'], ['prep', '⏱ Час приготування', 'хв'], ['cash', '💸 Кешбек бонусами', '%'], ['bmax', '🎁 Бонусами можна оплатити до', '%']];
      return `<div class="grid"><div class="card"><h3>🛵 Замовлення з собою й доставка</h3>${tgl('Приймати замовлення з сайту', g.on, 'vgoTgl', 'on')}${tgl('🛵 Доставка', g.del, 'vgoTgl', 'del')}${tgl('🥡 Самовивіз', g.pick, 'vgoTgl', 'pick')}${row('🕐 Приймаємо з', g.from, 'vgo', 'from')}${row('🕙 Приймаємо до', g.to, 'vgo', 'to')}</div>
        <div class="card"><h3>💰 Гроші</h3>${N.map(([k, l, u]) => row(l, g[k] + ' ' + u, 'vgo', k)).join('')}</div><div class="card"><h3>📍 Зона й контакт</h3>${row('📍 Зона доставки', g.zone, 'vgo', 'zone')}${row('📞 Телефон для гостей', g.phone, 'vgo', 'phone')}</div></div>`;
    },
    pos(v) {
      const c = v.d.cfg, R = [['tables', '🪑 Столів у залі', v.d.n], ['discMax', '% Макс. знижка офіціанта', c.discMax + '%'], ['dayH', '🌙 Робочий день закінчується о', c.dayH + ':00'], ['scanMin', '📱 Замовлення за QR діє', c.scanMin + ' хв'], ['lateMin', '⏰ Запізнення після', c.lateMin + ' хв'], ['lateFine', '💸 Штраф за запізнення', c.lateFine + ' ₴'], ['foodCost', '🧮 Цільовий фудкост', c.foodCost + '%']];
      return `<div class="grid"><div class="card"><h3>🪑 Каса й зал</h3>${R.map(([k, l, val]) => row(l, val, 'vcfg', k)).join('')}</div><div class="card"><h3>🌙 Закриття дня</h3>${tgl('Автоматичний Z-звіт', c.autoZ, 'vcfgTgl', 'autoZ')}${tgl('Друкувати Z', c.zPrint, 'vcfgTgl', 'zPrint')}${tgl('Z у Telegram', c.zTg, 'vcfgTgl', 'zTg')}${tgl('Нагадати, якщо Z не закрито', c.zRemind, 'vcfgTgl', 'zRemind')}</div></div>`;
    },
    staff(v, venue) {
      const d = v.d, R = { admin: '👑 Адмін', waiter: '🧑‍🍳 Офіціант', cook: '👨‍🍳 Кухар', courier: '🛵 Кур\'єр' }, link = location.origin + location.pathname.replace(/owner\.html$/, '') + 'pos.html?venue=' + v.id;
      return `<div class="grid"><div class="card"><h3>🔗 Як додати працівника</h3><div class="muted" style="font-size:14px">1) Надішліть посилання каси. 2) Людина вводить код своєї ролі. 3) Пише ім'я й свій PIN.</div><div class="kv"><span style="min-width:0;overflow-wrap:anywhere"><small class="muted">${esc(link)}</small></span><button class="btn sm" data-a="copy" data-u="${esc(link)}">Копіювати</button></div></div>
        <div class="card"><h3>🔑 Коди реєстрації</h3>${Object.entries(R).map(([r, l]) => `<div class="kv"><span>${l}</span><span style="display:flex;gap:6px;align-items:center"><b style="letter-spacing:1px">${esc(d.reg?.[r] || '')}</b><button class="btn sm" data-a="vreg" data-r="${r}">✏️</button></span></div>`).join('')}</div>
        <div class="card"><h3>👥 Працівники · ${d.staff.length}</h3>${d.staff.map(s => `<div class="kv"><span>${esc(s.name)}<br><small class="muted">${R[s.role] || s.role}</small></span><button class="btn sm red" data-a="vstaffDel" data-id="${s.id}" data-n="${esc(s.name)}">🗑</button></div>`).join('') || '<div class="muted">Ще нікого</div>'}<div class="muted" style="font-size:12px;margin-top:6px">Ставки, графік і ЗП — у касі: 👥 Персонал.</div></div></div>`;
    },
    bots(v) {
      const b = v.d.ready.bots, st = x => x ? '✅ підключено' : '⬜ ні';
      if (v.id === 'varvar') return `<div class="card">VARVAR: боти підключені на сервері (${st(b.staff)} персоналу · ${st(b.guest)} гостей · ${st(b.courier)} кур'єрів).</div>`;
      return `<div class="grid"><div class="card"><h3>🤖 Стан</h3><div class="kv"><span>🧑‍🍳 Бот персоналу</span><b>${st(b.staff)}</b></div><div class="kv"><span>👥 Група персоналу</span><b>${b.group ? '✅ підключена' : '⬜ додайте бота в групу'}</b></div><div class="kv"><span>🍔 Бот гостей</span><b>${st(b.guest)}</b></div><div class="kv"><span>🛵 Бот кур'єрів</span><b>${st(b.courier)}</b></div>${b.staff || b.guest || b.courier ? '<button class="btn sm" data-a="vbrand" style="margin-top:10px">🎨 Оформити ботів (назва й логотип закладу)</button><div class="muted" style="font-size:12px;margin-top:4px">Робиться само при підключенні; натисніть, якщо змінили назву чи логотип.</div>' : ''}</div>
        <div class="card"><h3>➕ Підключити / замінити</h3><ol class="muted" style="font-size:13px;padding-left:18px;margin:0 0 10px"><li>Telegram → <a href="https://t.me/BotFather" target="_blank">@BotFather</a> → /newbot → назва й ім'я бота</li><li>Скопіюйте токен (виглядає як 123456:ABC…) і вставте нижче</li><li>Бота персоналу додайте у вашу робочу групу — вона підключиться сама</li></ol>
        <form id="vbf" style="display:grid;gap:8px"><input name="BOT_TOKEN" placeholder="🧑‍🍳 Токен бота персоналу" autocomplete="off"><input name="GUEST_BOT_TOKEN" placeholder="🍔 Токен бота гостей" autocomplete="off"><input name="COURIER_BOT_TOKEN" placeholder="🛵 Токен бота кур'єрів" autocomplete="off"><div class="err" id="vberr"></div><button class="btn primary">💾 Перевірити й зберегти</button></form></div></div>`;
    },
    bak(v) {
      const plat = S.me.role === 'platform', l = v.d.list;
      return `<div class="card"><h3>💾 Резервні копії</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Щоночі система сама зберігає повну копію даних закладу (меню, чеки, звіти, склад, персонал, гості) і тримає 7 днів. ${plat ? 'Відновити можна будь-яку.' : 'Якщо щось зламалось — розробник відновить потрібний день (🆘 Допомога).'}</div>
        <div class="btnrow" style="margin-bottom:8px"><button class="btn sm primary" data-a="bakNow">💾 Зробити копію зараз</button></div>
        ${l.length ? l.map(b => `<div class="kv"><span>${/^\d{4}-\d\d-\d\d$/.test(b.tag) ? '🌙 ' + b.tag.split('-').reverse().join('.') : esc(b.tag)}<br><small class="muted">${b.at ? new Date(b.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''} · ${b.n || '?'} записів · ${b.kb || '?'} КБ</small></span><span style="display:flex;gap:6px"><button class="btn sm" data-a="bakGet" data-t="${esc(b.tag)}">⬇️</button>${plat ? `<button class="btn sm red" data-a="bakRestore" data-t="${esc(b.tag)}">♻️ Відновити</button>` : ''}</span></div>`).join('') : '<div class="muted">Копій ще немає — перша буде вночі (або натисніть «Зробити копію зараз»).</div>'}</div>`;
    },
    log(v) {
      const m = S.logM || new Date().toLocaleDateString('sv-SE').slice(0, 7), q = (S.logQ || '').toLowerCase(), l = v.d.list.filter(x => !q || x.t.toLowerCase().includes(q));
      return `<div class="btnrow" style="margin-bottom:10px;align-items:center"><input type="month" id="logM" value="${m}" style="max-width:170px;min-height:34px;padding:6px 10px"><input id="logQ" placeholder="🔎 Хто / що (напр. Меню, Олег)" value="${esc(S.logQ || '')}" style="max-width:260px;min-height:34px;padding:6px 12px"></div>
        <div class="card">${l.length ? l.slice(0, 500).map(x => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${esc(x.t)}</span><small class="muted" style="white-space:nowrap">${new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div>`).join('') : '<div class="muted">Записів немає</div>'}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Зміни меню, цін, налаштувань, чеків, персоналу — хто й коли. Журнал ведеться з ${new Date().toLocaleDateString('uk-UA')}.</div>`;
    },
    printer(v) {
      const r = v.d.ready, apiU = base(v.id);
      return `<div class="grid"><div class="card"><h3>🖨 Стан</h3><div class="kv"><span>Програма друку</span><b>${r.printer === 1 ? '✅ на зв\'язку' : r.printer ? '⚠️ давно не було' : '⬜ ще не запускалась'}</b></div><button class="btn sm" data-a="vprintTest" style="margin-top:8px">🧾 Тестовий друк</button></div>
        <div class="card"><h3>⬇️ Встановлення (Windows-комп'ютер з принтером)</h3><ol class="muted" style="font-size:13px;padding-left:18px;margin:0 0 10px"><li>Завантажте програму й розпакуйте в папку</li><li>Завантажте файл налаштувань і покладіть у ту саму папку</li><li>Запустіть install.cmd</li></ol>
        <div class="btnrow"><a class="btn sm" href="printer/VARVAR-print.zip" download>⬇️ Програма друку</a>${v.id === 'varvar' ? '' : `<button class="btn sm primary" data-a="vprintCfg" data-k="${esc(r.printKey)}" data-u="${esc(apiU)}">⬇️ Файл налаштувань</button>`}</div></div></div>`;
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
  // 🧱 конструктор сайту: порядок і показ блоків
  const BL = { about: '📝 Про нас', promos: '🎉 Акції', menu: '🍽 Хіти меню', gallery: '📷 Галерея', hookah: '💨 Кальяни', banquet: '🥂 Банкети', book: '📅 Бронювання', cert: '🎟 Сертифікати', reviews: '⭐ Відгуки', contacts: '📍 Контакти й карта' };
  const blocksOf = s => { const l = (s.blocks || []).filter(b => BL[b.id]); for (const id of Object.keys(BL)) if (!l.some(b => b.id === id)) l.push({ id, on: 1 }); return l; };
  function blocksCard(s) {
    const l = blocksOf(s);
    return `<div class="card"><h3>🧱 Блоки сайту</h3><div class="muted" style="font-size:13px;margin-bottom:6px">Порядок розділів на сайті й що показувати. Зміни — одразу на сайті.</div>${l.map((b, i) => `<div class="kv"><span>${b.on ? '' : '<s class="muted">'}${BL[b.id]}${b.on ? '' : '</s>'}</span><span style="display:flex;gap:4px"><button class="btn sm" data-a="vblk" data-i="${i}" data-m="-1" ${i ? '' : 'disabled'}>▲</button><button class="btn sm" data-a="vblk" data-i="${i}" data-m="1" ${i < l.length - 1 ? '' : 'disabled'}>▼</button><button class="btn sm ${b.on ? 'primary' : ''}" data-a="vblk" data-i="${i}" data-m="0">${b.on ? '👁' : '🚫'}</button></span></div>`).join('')}</div>`;
  }
  // ---------- дії ----------
  const img = (max, png) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async () => { const f = i.files[0]; if (!f) return res(null); const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .82)); }; im.src = URL.createObjectURL(f); }; i.click(); });
  const ask = (title, val, type = 'text', long) => new Promise(res => { let done = false; const bg = modal(esc(title), long ? `<textarea name="v" rows="6" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px">${esc(val ?? '')}</textarea>` : `<input name="v" type="${type}" value="${esc(val ?? '')}">`, async f => { done = true; res(f.v.value); }); const t = setInterval(() => { if (!bg.isConnected) { clearInterval(t); if (!done) res(null); } }, 300); });
  // 📥 таблиця з Excel / Google Sheets → рядки меню (Розділ | Назва | Ціна | Опис | Вага), стовпці впізнаємо за заголовком або вмістом
  function parseTable(txt) {
    const lines = txt.split(/\r?\n/).map(l => l.replace(/[ \r]+$/, '')).filter(l => l.trim()); // порожній перший стовпець (розділ лише в першому рядку групи) — не обрізаємо if (!lines.length) return [];
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
    if (a === 'vblk') { const l = blocksOf(v.d.site), i = +d.i, m = +d.m; if (m) { const j = i + m; [l[i], l[j]] = [l[j], l[i]]; } else l[i].on = l[i].on ? 0 : 1; v.d.site.blocks = l; render(); try { v.d.site = (await vapi(id, 'siteSet', { k: 'blocks', v: l })).site; } catch (x) { toast('⚠️ ' + x.message); } return; }
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
    if (a === 'vprintCfg') { const blob = new Blob([JSON.stringify({ api: d.u, key: d.k, printer: '' }, null, 2)], { type: 'application/json' }); const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'varvar-print.config.json'; l.click(); return; }
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
  document.addEventListener('change', e => { if (e.target.id === 'logM' && S.cfgV) { S.logM = e.target.value; load(); } if (e.target.id === 'vpick' && S.cfgV) { S.cfgV.id = e.target.value; try { localStorage.setItem('own_cfgV', JSON.stringify(e.target.value)); } catch {} load(); } });
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
