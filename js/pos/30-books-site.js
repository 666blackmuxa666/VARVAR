  async function loadBooks() { S.bkDay ||= todayK(); const from = addD(todayK(), -7), to = addD(todayK(), 60); S.data.bk = (await api('bkList', { from, to, all: true })).list; }
  const DOW = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  function booksHTML() {
    const L0 = S.data.bk; if (!L0) return '<div class="head"><h1>Броні</h1></div><div class="muted">Завантаження…</div>';
    const day = S.bkDay, act = b => !['no', 'cancel', 'noshow'].includes(b.st), cnt = d => L0.filter(b => b.date === d && act(b));
    const days = Array.from({ length: 21 }, (_, i) => addD(todayK(), i - 1));
    const strip = `<div class="bk-days">${days.map(d => { const l = cnt(d), g = l.reduce((a, b) => a + b.people, 0), nw = l.some(b => b.st === 'new'), dt = new Date(d + 'T12:00:00');
      return `<button class="bk-d${d === day ? ' on' : ''}${d === todayK() ? ' td' : ''}" data-a="bkDay" data-d="${d}"><small>${d === todayK() ? 'сьогодні' : DOW[dt.getDay()]}</small><b>${d.slice(8)}.${d.slice(5, 7)}</b><span>${l.length ? `${l.length} · ${g}👤` : '—'}</span>${nw ? '<i></i>' : ''}</button>`; }).join('')}<label class="bk-d pick" title="Інша дата"><small>дата</small><b>📆</b><input type="date" data-a="bkDate" value="${day}"></label></div>`;
    const newAll = L0.filter(b => b.st === 'new');
    const list = L0.filter(b => b.date === day && (S.bkAll || act(b)));
    const guests = list.filter(act).reduce((a, b) => a + b.people, 0);
    const card = b => `<div class="bk-c st-${b.st}">
      <div class="bk-t"><b>${b.time}</b><small>${b.people} 👤</small></div>
      <div class="bk-m"><div class="bk-n"><b>${esc(b.name)}</b>${b.kind === 'banquet' ? '<span class="chip">🎉 банкет</span>' : ''}<span class="chip bk-s">${BKS[b.st]}</span>${b.t ? `<span class="chip">🪑 ${b.t}</span>` : ''}${b.src === 'каса' ? '<span class="chip">☎️ каса</span>' : ''}</div>
        <a href="tel:+${b.phone}">📞 ${fmtPh(b.phone)}</a>${b.comment ? `<div class="muted">💬 ${esc(b.comment)}</div>` : ''}${b.note ? `<div class="bk-note">📌 ${esc(b.note)}</div>` : ''}${b.pre?.length ? `<div class="bk-pre">🍽 ${b.pre.map(esc).join(' · ')}${b.preSent ? ' <span class="muted">· на кухні</span>' : ''}</div>` : ''}
        <div class="btnrow">${b.st === 'new' ? `<button class="btn sm green" data-a="bkSet" data-id="${b.id}" data-s="ok">✅ Підтвердити</button><button class="btn sm red" data-a="bkSet" data-id="${b.id}" data-s="no">❌ Відхилити</button>` : ''}
          ${b.st === 'ok' ? `<button class="btn sm green" data-a="bkCame" data-id="${b.id}">🪑 Прийшли</button><button class="btn sm" data-a="bkTbl" data-id="${b.id}">${b.t ? '🔄 Стіл' : '🪑 Стіл'}</button>${b.pre?.length && !b.preSent ? `<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="kit">🔥 На кухню</button>` : ''}<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="noshow">🚫 Не прийшли</button>` : ''}
          ${['no', 'cancel', 'noshow', 'came'].includes(b.st) ? `<button class="btn sm" data-a="bkSet" data-id="${b.id}" data-s="ok">↩️ Повернути</button>` : ''}
          <button class="btn sm" data-a="bkEd" data-id="${b.id}">✏️</button>${['new', 'ok'].includes(b.st) ? `<button class="btn sm red" data-a="bkSet" data-id="${b.id}" data-s="cancel" title="Скасувати">🗑</button>` : ''}</div></div></div>`;
    return `<div class="rhead"><div><h1>Броні</h1><span class="muted">${day === todayK() ? 'сьогодні' : DOW[new Date(day + 'T12:00:00').getDay()] + ', ' + day.slice(8) + '.' + day.slice(5, 7)} · ${list.filter(act).length} бронь · ${guests} гостей</span></div><button class="btn primary" data-a="bkNew">➕ Бронь</button></div>
      ${newAll.length ? `<div class="bk-alert">🆕 Чекають підтвердження: ${newAll.map(b => `<button class="chip" data-a="bkDay" data-d="${b.date}">${b.date === todayK() ? 'сьогодні' : b.date.slice(8) + '.' + b.date.slice(5, 7)} ${b.time} · ${esc(b.name)}</button>`).join('')}</div>` : ''}
      ${strip}<div class="seg rsec" style="margin:10px 0"><button class="${S.bkAll ? '' : 'on'}" data-a="bkAll" data-v="">Активні</button><button class="${S.bkAll ? 'on' : ''}" data-a="bkAll" data-v="1">Усі, з відхиленими</button></div>
      <div class="bk-grid">${list.map(card).join('') || '<div class="muted" style="padding:20px 4px">На цей день броней немає</div>'}</div>`;
  }
  async function bkForm(b) {
    const v0 = b || { kind: 'table', date: S.bkDay || todayK(), time: '19:00', people: 2, name: '', phone: '', comment: '', note: '', t: 0 };
    const body = `<div class="form"><div class="seg" id="bkK"><button class="${v0.kind !== 'banquet' ? 'on' : ''}" data-k="table">📅 Стіл</button><button class="${v0.kind === 'banquet' ? 'on' : ''}" data-k="banquet">🎉 Банкет</button></div>
      <div class="frow"><label>Телефон<input id="bP" type="tel" inputmode="tel" value="${esc(v0.phone ? '0' + v0.phone.slice(3) : '')}"></label><label>Імʼя<input id="bN" value="${esc(v0.name)}"></label></div>
      <div class="frow"><label>Дата<input id="bD" type="date" value="${v0.date}"></label><label>Час<input id="bT" type="time" step="900" value="${v0.time}"></label></div>
      <div class="frow"><label>Гостей<input id="bG" type="number" inputmode="numeric" min="1" max="60" value="${v0.people}"></label><label>Стіл<select id="bS"><option value="0">—</option>${Array.from({ length: S.n }, (_, i) => i + 1).map(n => `<option ${+v0.t === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label>Побажання гостя<input id="bC" value="${esc(v0.comment || '')}"></label><label>📌 Нотатка для персоналу<input id="bO" value="${esc(v0.note || '')}" placeholder="напр. торт свій, VIP, депозит"></label></div>`;
    const pr = modal({ title: b ? '✏️ Бронь' : '➕ Нова бронь', body, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    let kind = v0.kind; $('#bkK').onclick = e => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return; kind = k; $('#bkK').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.k === k)); };
    if (!b) $('#bP').onchange = async () => { const r = await api('cliGet', { phone: $('#bP').value }).catch(() => null); if (r?.cli?.name && !$('#bN').value) $('#bN').value = r.cli.name; };
    const v = await pr; if (v !== 'ok') return closeModal();
    const f = { kind, phone: $('#bP').value, name: $('#bN').value, date: $('#bD').value, time: $('#bT').value, people: $('#bG').value, t: +$('#bS').value, comment: $('#bC').value, note: $('#bO').value }; closeModal();
    const r = b ? await act('bkEdit', { id: b.id, f }, '💾 Збережено') : await act('bkNew', { f }, '📅 Бронь створено');
    if (r) { S.bkDay = r.b.date; await loadBooks().catch(() => {}); renderMain(); loadState().catch(() => {}); }
  }
  async function certT(t) {
    const code = await ask('🎟 Код сертифіката', 'VV-XXXXX'); if (!code) return;
    const g = await api('certGet', { code }).catch(e => { toast('⚠️ ' + e.message); return null; }); if (!g) return;
    if (g.c.st !== 'ok') return toast(g.c.st === 'new' ? '⚠️ Сертифікат ще не оплачено' : '⚠️ Сертифікат скасовано');
    if (!(await confirmBox(`🎟 ${g.c.code} — ${money(g.c.left)} з ${money(g.c.sum)}`, `Від ${g.c.from}${g.c.to ? ' для ' + g.c.to : ''}. Списати на цей рахунок?`))) return;
    const r = await act('certUse', { t, code }); if (r) { toast(`🎟 −${money(r.use)} · залишок ${money(r.left)}`); loadState().catch(() => {}); }
  }
  async function siteImg(hero) {
    const f = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => res(i.files[0]); i.click(); }); if (!f) return;
    const img = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = URL.createObjectURL(f); }), k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const r = await act('sitePhoto', { data: c.toDataURL('image/jpeg', .82), hero: !!hero }, '📷 Фото додано'); if (r) { S.data.site = r.site; renderMain(); }
  }
  function siteHTML() {
    const s = S.data.site; if (!s) return '<div class="muted">Завантаження…</div>';
    const U = 'https://666blackmuxa666.github.io/VARVAR/about.html';
    // рядок-поле: тап — редагувати; довгий текст — 2 рядки прев'ю
    const f = (k, ic, l, v, ph) => `<button class="sf press" data-a="siteSet" data-k="${k}" data-l="${esc(l)}"><i>${ic}</i><span><small>${l}</small><b class="${v ? '' : 'muted'}">${v ? esc(v) : esc(ph || 'не вказано')}</b></span><em>✏️</em></button>`;
    const sw = (k, l, hint) => `<button class="sf press" data-a="siteTgl" data-k="${k}"><span><b>${l}</b><small>${hint}</small></span><span class="switch ${s[k] ? 'on' : ''}"></span></button>`;
    const item = id => itemsAll().find(i => i.id === id);
    return `<div class="site-top card"><div><h3>🌐 Сайт-візитка</h3><span class="muted">Зміни зʼявляються на сайті одразу</span></div><div class="btnrow"><a class="btn sm primary" href="${U}" target="_blank" rel="noopener">🔗 Відкрити</a><button class="btn sm" data-a="siteCopy">📋 Посилання</button></div></div>
    <div class="grid2 set">
      <div class="card"><h3>🏷 Основне</h3>${f('name', '🍽', 'Назва', s.name)}${f('tagline', '✨', 'Слоган', s.tagline)}${f('about', '📝', 'Про нас', s.about)}</div>
      <div class="card"><h3>📍 Контакти</h3>${f('phone', '📞', 'Телефон', s.phone)}${f('addr', '📍', 'Адреса', s.addr)}
        <div class="sf2">${f('from', '🕐', 'Відкриваємось', s.from)}${f('to', '🕙', 'Зачиняємось', s.to)}</div></div>
      <div class="card"><h3>📷 Фото</h3>
        <button class="site-hero press" data-a="siteImg" data-h="1" style="${s.hero ? `background-image:url('${esc(s.hero)}')` : ''}"><span>${s.hero ? '🔄 Замінити головне фото' : '🖼 Додати головне фото'}</span></button>
        <div class="site-gal">${s.photos.map(u => `<div style="background-image:url('${esc(u)}')"><button data-a="siteDel" data-k="photoDel" data-v="${esc(u)}" title="Прибрати">✕</button></div>`).join('')}<button class="add press" data-a="siteImg">＋<small>галерея</small></button></div></div>
      <div class="card"><h3>🍽 Хіти меню</h3><div class="site-hits">${s.hits.length ? s.hits.map(id => { const it = item(id); return it ? `<span>${it.img ? `<i style="background-image:url('${esc(it.img)}')"></i>` : ''}${esc(it.name.uk)}</span>` : ''; }).join('') : '<span class="muted">Автоматично — страви з фото</span>'}</div><button class="btn sm" data-a="siteHits" style="margin-top:10px">✏️ Обрати страви</button></div>
      <div class="card"><h3>🎉 Акції та події</h3>${s.promos.map(p => `<div class="site-promo"><div><b>${esc(p.t)}</b>${p.d ? `<small>${esc(p.d)}</small>` : ''}</div><button class="btn sm red" data-a="siteDel" data-k="promoDel" data-v="${p.id}">🗑</button></div>`).join('') || '<div class="muted set-note">Немає — блок на сайті прихований</div>'}<button class="btn sm primary" data-a="sitePromo">➕ Додати акцію</button></div>
      <div class="card"><h3>⭐ Відгуки</h3><div class="sf2">${f('rating', '⭐', 'Рейтинг Google', s.rating ? String(s.rating) : '', '—')}${f('ratingN', '💬', 'Відгуків', s.ratingN ? String(s.ratingN) : '', '0')}</div>
        ${s.quotes.map((q, i) => `<div class="site-promo"><div><i>«${esc(q.t)}»</i><small>— ${esc(q.a)}</small></div><button class="btn sm red" data-a="siteDel" data-k="quoteDel" data-v="${i}">🗑</button></div>`).join('')}<button class="btn sm" data-a="siteQuote">➕ Цитата відгуку</button>
        ${S.data.rates ? `<div class="site-rate"><b>${S.data.rates.avg || '—'}</b><span>оцінка гостей у боті за 30 днів · ${S.data.rates.n} оцінок</span></div>` : ''}</div>
      <div class="card"><h3>🔗 Соцмережі й карти</h3>${f('insta', '📸', 'Instagram', s.insta, 'https://instagram.com/…')}${f('tg', '✈️', 'Telegram-канал', s.tg, 'https://t.me/…')}${f('gmaps', '🗺', 'Google Maps', s.gmaps)}${f('reviewsUrl', '✍️', 'Посилання «Залишити відгук»', s.reviewsUrl)}</div>
      <div class="card"><h3>🎉 Банкети · 💨 Кальяни</h3>${f('banquet', '🎉', 'Банкети й кейтеринг', s.banquet)}${f('hookah', '💨', 'Кальяни', s.hookah)}</div>
      <div class="card"><h3>⚙️ Функції сайту</h3>${sw('bookOn', '📅 Бронювання', 'Форма броні й банкетів на сайті')}${sw('certOn', '🎟 Подарункові сертифікати', 'Заявки на сертифікат з сайту')}<button class="btn sm" data-a="certs" style="margin-top:10px">🎟 Усі сертифікати</button></div>
    </div>`;
  }
