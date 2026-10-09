// VARVAR — сайт-візитка: дані з /api/site (редагуються в касі й боті), бронювання, сертифікати, кабінет гостя
(() => {
  if (window.VARVAR?.moving) return; // ↪️ переходимо на posatom.online
  const API = window.VARVAR.api, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const store = { get(k, d) { try { const v = localStorage.getItem((window.VARVAR.pre || 'vv_') + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem((window.VARVAR.pre || 'vv_') + k, JSON.stringify(v)); } catch {} } };
  const device = store.get('device', null) || (() => { const d = crypto.randomUUID(); store.set('device', d); return d; })();
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = {
    uk: { nMenu: 'Меню', nBook: 'Бронь', nBanq: 'Банкети', nCont: 'Контакти', nMe: 'Кабінет', order: 'Замовити', book: 'Забронювати', call: 'Подзвонити', route: 'Маршрут',
      hAbout: 'Про нас', f1: 'Власні рецепти й ситні тарілки', f2: 'Кальяни: 50+ смаків', f3: 'Банкети до 20 гостей', f4: 'Доставка й самовивіз', hPromo: 'Акції та події', hHits: 'Хіти меню', allMenu: 'Усе меню →', hGal: 'Атмосфера',
      hHook: 'Кальяни', hBanq: 'Банкети й кейтеринг', banqBtn: 'Залишити заявку', hBook: 'Бронювання столу', kTable: 'Стіл', kBanq: 'Банкет', fName: "Ваше ім'я", fPhone: 'Телефон', fCom: 'Побажання (необовʼязково)',
      bookSend: 'Забронювати', hCert: 'Подарунковий сертифікат', certTxt: 'Найкращий подарунок після катання — вечеря у Varvar. Залиште заявку, адміністратор зв’яжеться щодо оплати й надішле сертифікат.',
      own: 'Своя', certOwn: 'Сума, ₴', certFrom: 'Від кого', certTo: 'Кому (необовʼязково)', certSend: 'Замовити сертифікат', hRev: 'Відгуки', revAll: 'Усі відгуки на Google', revWrite: 'Залишити відгук', hCont: 'Контакти', daily: 'Щодня',
      openNow: 'Відчинено', closedNow: 'Зачинено', bookOk: 'Заявку прийнято!', bookOkT: 'Підтвердимо найближчим часом. Статус оновлюється тут.', pre: '🍽 Обрати страви заздалегідь', preT: 'Кухня почне готувати до вашого приходу',
      st: { new: '⏳ Чекає підтвердження', ok: '✅ Підтверджено', no: '❌ Відхилено — зателефонуйте нам', came: '🪑 Ви в нас!', noshow: '—', cancel: '↩️ Скасовано' },
      err: 'Помилка — спробуйте ще раз', errC: "Вкажіть ім'я і телефон", errD: 'Перевірте дату й час', rate: 'Забагато заявок — спробуйте пізніше', certOk: '🎟 Заявку прийнято! Адміністратор зателефонує щодо оплати.',
      meT: 'Кабінет гостя', meIn: 'Увійдіть через Telegram — номер підтверджує сам Telegram, без SMS.', meBtn: 'Увійти через Telegram', meWait: 'Натисніть «Start» у боті й поділіться номером… чекаємо', bal: 'бонусів', vis: 'візитів', spent: 'витрачено',
      myBook: 'Мої броні', myHist: 'Історія', myCert: 'Сертифікати', out: 'Вийти', none: 'Поки порожньо', certP: 'Подарунковий сертифікат', certPrint: '🖨 Друк', certLeft: 'залишок' },
    en: { nMenu: 'Menu', nBook: 'Booking', nBanq: 'Banquets', nCont: 'Contacts', nMe: 'Account', order: 'Order', book: 'Book a table', call: 'Call', route: 'Directions',
      hAbout: 'About us', f1: 'Own recipes & hearty plates', f2: 'Hookahs: 50+ flavours', f3: 'Banquets up to 20 guests', f4: 'Delivery & pickup', hPromo: 'Offers & events', hHits: 'Menu highlights', allMenu: 'Full menu →', hGal: 'Atmosphere',
      hHook: 'Hookahs', hBanq: 'Banquets & catering', banqBtn: 'Send request', hBook: 'Book a table', kTable: 'Table', kBanq: 'Banquet', fName: 'Your name', fPhone: 'Phone', fCom: 'Wishes (optional)',
      bookSend: 'Book', hCert: 'Gift certificate', certTxt: 'The best gift after skiing — dinner at Varvar. Leave a request and we will contact you about payment.',
      own: 'Custom', certOwn: 'Amount, ₴', certFrom: 'From', certTo: 'To (optional)', certSend: 'Order certificate', hRev: 'Reviews', revAll: 'All reviews on Google', revWrite: 'Write a review', hCont: 'Contacts', daily: 'Daily',
      openNow: 'Open', closedNow: 'Closed', bookOk: 'Request received!', bookOkT: 'We will confirm shortly. Status updates here.', pre: '🍽 Pre-order dishes', preT: 'The kitchen will start before you arrive',
      st: { new: '⏳ Awaiting confirmation', ok: '✅ Confirmed', no: '❌ Declined — please call us', came: '🪑 Welcome!', noshow: '—', cancel: '↩️ Cancelled' },
      err: 'Error — please try again', errC: 'Enter name and phone', errD: 'Check date and time', rate: 'Too many requests — try later', certOk: '🎟 Request received! We will call you about payment.',
      meT: 'Guest account', meIn: 'Sign in with Telegram — your number is verified by Telegram, no SMS.', meBtn: 'Sign in with Telegram', meWait: 'Press «Start» in the bot and share your number… waiting', bal: 'bonuses', vis: 'visits', spent: 'spent',
      myBook: 'My bookings', myHist: 'History', myCert: 'Certificates', out: 'Sign out', none: 'Nothing yet', certP: 'Gift certificate', certPrint: '🖨 Print', certLeft: 'left' },
  };
  let lang = store.get('alang', (navigator.language || 'uk').startsWith('uk') || (navigator.language || '').startsWith('ru') ? 'uk' : 'en'), S = null;
  const t = k => T[lang][k] ?? T.uk[k] ?? k;
  const money = n => `${Math.round(n).toLocaleString('uk-UA')} ₴`;
  const api = async (p, body, tok) => { const r = await fetch(API + p, body ? { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body) } : { headers: tok ? { authorization: 'Bearer ' + tok } : {} }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
  const kyivNow = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hour12: false });
  const isOpen = s => { const h = window.VVD ? VVD.hoursToday(s) : s; if (!h) return false; const m = x => +x.slice(0, 2) * 60 + +x.slice(3), n = m(kyivNow()), a = m(h.from), b = m(h.to); return a <= b ? n >= a && n < b : n >= a || n < b; };

  function i18n() {
    document.documentElement.lang = lang; $('#lng').textContent = lang === 'uk' ? 'EN' : 'UA';
    $$('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); }); $$('[data-ph]').forEach(e => { e.placeholder = t(e.dataset.ph); });
    if (S) render();
  }
  function render() {
    const s = { promos: [], hits: [], photos: [], quotes: [], ...S, phone: S.phone || '' }, tel = 'tel:' + s.phone.replace(/[^\d+]/g, ''), maps = s.gmaps || (Array.isArray(s.geo) ? `https://www.google.com/maps?q=${s.geo[0]},${s.geo[1]}` : `https://www.google.com/maps?q=${encodeURIComponent(s.addr || s.name || '')}`); // новий заклад: полів може ще не бути
    $('#sName').textContent = s.name; $('#sTag').textContent = s.tagline; $('#sAddr').textContent = s.addr; $('#sAbout').textContent = s.about;
    if (s.hero) { $('#heroBg').style.backgroundImage = `url("${s.hero}")`; $('.hero').classList.add('ph'); }
    const op = isOpen(s), bd = $('#openBadge'); bd.className = 'badge' + (op ? '' : ' off'); const hh = window.VVD ? VVD.hoursToday(s) : s; bd.textContent = `${op ? '🟢 ' + t('openNow') : '🔴 ' + t('closedNow')}${hh ? ` · ${hh.from}–${hh.to}` : ''}`;
    if ($('#callA')) $('#callA').href = tel; ['#routeA', '#routeB'].forEach(x => { if ($(x)) $(x).href = maps; });
    $('#cAddr').textContent = s.addr; $('#cHours').textContent = `${s.from}–${s.to}`; $('#cPhone').textContent = String(s.phone || '').replace(/^\+380(\d{2})(\d{3})(\d{2})(\d{2})$/, '+380 $1 $2 $3 $4'); $('#cPhone').href = tel;
    $('#socials').innerHTML = [s.insta && `<a href="${esc(s.insta)}" target="_blank" rel="noopener">Instagram</a>`, s.tg && `<a href="${esc(s.tg)}" target="_blank" rel="noopener">Telegram</a>`].filter(Boolean).join('');
    if (Array.isArray(s.geo) && s.geo.length === 2) $('#map').src = `https://www.google.com/maps?q=${s.geo[0]},${s.geo[1]}&z=16&output=embed`; else if (s.addr) $('#map').src = `https://www.google.com/maps?q=${encodeURIComponent(s.addr)}&z=16&output=embed`; else $('#map').hidden = true;
    $('#sHook').textContent = s.hookah; $('#sBanq').textContent = s.banquet;
    $('#promos').hidden = !s.promos.length; $('#promoList').innerHTML = s.promos.map(p => `<div class="promo"><b>${esc(p.t)}</b>${esc(p.d)}</div>`).join('');
    const mt = s.menuTheme, phBg = !mt || !mt.phbg || mt.phbg === 'tex' ? '' : ` style="background:${esc(mt.phbg === 'color' ? mt.phC : mt.phbg === 'img' && mt.phImg ? `${mt.card} url('${mt.phImg}') center/cover` : mt.phbg === 'none' ? 'transparent' : mt.card)}"`; /* фон під фото — як у меню */
    $('#hits').innerHTML = s.hits.slice(0, 4).map(h => `<a class="hit" href="index.html?go#i-${h.id}"><span class="ph"${phBg}>${h.img ? `<img src="${esc(h.img)}" alt="" loading="lazy">` : ''}</span><div><b>${esc(h.n?.[lang] || h.n?.uk || '')}</b>${h.d ? `<small>${esc(h.d[lang] || h.d.uk || '')}</small>` : ''}${h.p ? `<span>${money(h.p)}</span>` : ''}</div></a>`).join('');
    $('#gallery').hidden = !s.photos.length; $('#gal').innerHTML = s.photos.map(u => `<img src="${esc(u)}" alt="" loading="lazy">`).join('');
    $('#rate').textContent = s.rating ? `⭐ ${s.rating}${s.ratingN ? ` · ${s.ratingN}` : ''}` : '';
    $('#quotes').innerHTML = s.quotes.map(q => `<div class="quote">«${esc(q.t)}»<small>— ${esc(q.a)}</small></div>`).join('');
    $('#revA').href = s.gmaps; $('#revW').href = s.reviewsUrl || s.gmaps;
    $('#book').hidden = !s.bookOn; $('#cert').hidden = !s.certOn;
    // 🏪 назва й логотип закладу
    $('.nav .brand').innerHTML = s.logo ? `<img src="${esc(s.logo)}" alt="" style="height:30px;width:30px;object-fit:contain;border-radius:8px;vertical-align:middle;margin-right:8px">${esc(s.name)}` : esc(s.name); $('#fName').textContent = s.name; { const L = s.legal || {}; const f = $('#fLegal'); if (f) f.textContent = [L.name, L.code ? 'ІПН/ЄДРПОУ ' + L.code : '', L.addr].filter(Boolean).join(' · '); } /* 🏛 реквізити (LiqPay) */ document.title = s.name;
    if (window.VARVAR.venue) $('#about > .feats')?.remove(); // переваги VARVAR (кальяни, банкети…) — не для інших закладів
    // 🎨 конструктор: тема, головний екран, блоки, панель, оголошення… (js/about-design.js)
    if (window.VVD) VVD.apply(s, lang, t, maps);
  }

  // ---------- 📅 бронювання ----------
  let bkKind = 'table';
  const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' });
  function bookInit() {
    const f = $('#bookF'); f.date.min = today(); f.date.max = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10); f.date.value = today();
    f.name.value = store.get('goName', ''); f.phone.value = store.get('goPhone', '');
    $$('[data-kind]').forEach(b => b.onclick = () => { bkKind = b.dataset.kind; $$('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); if (bkKind === 'banquet' && +f.people.value < 8) f.people.value = 10; });
    $$('[data-book]').forEach(b => b.onclick = () => { $(`[data-kind="${b.dataset.book}"]`).click(); location.hash = 'book'; });
    f.onsubmit = async e => {
      e.preventDefault(); const m = $('#bookMsg'); m.textContent = '…';
      const d = { kind: bkKind, name: f.name.value.trim(), phone: f.phone.value.trim(), date: f.date.value, time: f.time.value, people: +f.people.value, comment: f.comment.value.trim(), device };
      const { status, data } = await api('/api/book', d).catch(() => ({ status: 0, data: {} }));
      if (status !== 200) { m.textContent = { contact: t('errC'), date: t('errD'), rate: t('rate') }[data.error] || t('err'); return; }
      store.set('goName', d.name); store.set('goPhone', d.phone); store.set('bkPhone', d.phone);
      store.set('bks', [...store.get('bks', []), data.id].slice(-10)); showBook(data.id);
    };
    const last = store.get('bks', []).slice(-1)[0]; if (last) showBook(last, true);
  }
  async function showBook(id, quiet) {
    const { data: b } = await api('/api/book?id=' + id).catch(() => ({ data: null }));
    if (!b || b.error || b.date < today() || ['came', 'noshow', 'cancel'].includes(b.st)) { if (!quiet) $('#bookMsg').textContent = t('err'); return; }
    $('#bookF').hidden = true; const box = $('#bookDone'); box.hidden = false;
    box.innerHTML = `<div class="big">${b.st === 'ok' ? '✅' : b.st === 'no' ? '😔' : '📅'}</div><h3>${t('bookOk')}</h3><p><b>${b.date.slice(8)}.${b.date.slice(5, 7)} · ${b.time}</b> · ${b.people} 👤</p><p>${t('st')[b.st] || b.st}</p>
      ${['new', 'ok'].includes(b.st) ? `${b.pre.length ? `<p class="muted">🍽 ${b.pre.map(esc).join(', ')}</p>` : ''}<a class="btn alt" href="index.html?go&book=${id}">${t('pre')}</a><small class="muted">${t('preT')}</small>` : ''}
      <button class="btn ghost" id="bkNew">＋ ${t('book')}</button>`;
    $('#bkNew').onclick = () => { $('#bookF').hidden = false; box.hidden = true; store.set('bks', []); };
    if (b.st === 'new') setTimeout(() => showBook(id, true), 15000);
  }

  // ---------- 🎟 сертифікат ----------
  function certInit() {
    const f = $('#certF'); let sum = 1000; f.phone.value = store.get('goPhone', ''); f.from.value = store.get('goName', '');
    $$('#certSum button').forEach(b => b.onclick = () => { $$('#certSum button').forEach(x => x.classList.toggle('on', x === b)); f.sum.hidden = b.dataset.v !== 'own'; sum = b.dataset.v === 'own' ? 0 : +b.dataset.v; if (!f.sum.hidden) f.sum.focus(); });
    f.onsubmit = async e => {
      e.preventDefault(); const m = $('#certMsg'), v = sum || +f.sum.value; m.textContent = '…';
      const { status, data } = await api('/api/cert', { sum: v, from: f.from.value.trim(), to: f.to.value.trim(), phone: f.phone.value.trim(), device }).catch(() => ({ status: 0, data: {} }));
      m.textContent = status === 200 ? t('certOk') : data.error === 'rate' ? t('rate') : t('errC'); if (status === 200) f.reset();
    };
  }
  async function certPage(code) {
    const { data: c } = await api('/api/cert?code=' + encodeURIComponent(code)).catch(() => ({ data: null })); if (!c || c.error) return;
    document.body.innerHTML = `<div class="certpage"><div class="certcard"><div class="v">VARVAR</div><div><div class="muted">${t('certP')}${c.to ? ` · ${esc(c.to)}` : ''}</div><div class="s">${money(c.sum)}</div>${c.left !== c.sum ? `<small class="muted">${t('certLeft')} ${money(c.left)}</small>` : ''}</div><div style="display:flex;justify-content:space-between;align-items:end"><span class="c">${esc(c.code)}</span><small class="muted">${c.from ? '♥ ' + esc(c.from) : ''}</small></div></div>
      <div class="cta noprint" style="margin-top:18px"><button class="btn" onclick="print()">${t('certPrint')}</button><a class="btn alt" href="about.html">VARVAR</a></div></div>`;
  }

  // ---------- 👤 кабінет гостя ----------
  const modal = html => { $('#mBody').innerHTML = `<button class="x" data-x>✕</button>${html}`; $('#modal').hidden = false; };
  $('#modal').addEventListener('click', e => { if (e.target.closest('[data-x]')) $('#modal').hidden = true; });
  async function me() {
    const tok = store.get('gtok', '');
    if (!tok) { const pn = store.get('gtokn', null); if (pn && Date.now() - pn.t < 300e3) { const r = await api('/api/me/poll?n=' + pn.n).catch(() => null); if (r?.data?.token) { store.set('gtok', r.data.token); store.set('gtokn', null); return me(); } } } // 📱 iOS міг вивантажити сторінку, поки гість був у Telegram
    if (tok) { const { status, data } = await api('/api/me', null, tok).catch(() => ({ status: 0 })); if (status === 200) return meShow(data, tok); if (status === 401) store.set('gtok', ''); else return modal(`<h2>👤 ${t('meT')}</h2><p class="muted">⚠️ ${t('err')}</p>`); } // вихід лише якщо сесія справді завершилась
    modal(`<h2>👤 ${t('meT')}</h2><p class="muted">${t('meIn')}</p><button class="btn" id="tgIn">✈️ ${t('meBtn')}</button><div class="msg" id="meMsg"></div>`);
    $('#tgIn').onclick = async () => {
      const { data } = await api('/api/me/start'); if (!data.bot) return ($('#meMsg').textContent = t('err'));
      store.set('gtokn', { n: data.nonce, t: Date.now() }); window.open(`https://t.me/${data.bot}?start=login_${data.nonce}`, '_blank'); $('#meMsg').textContent = t('meWait');
      for (let i = 0; i < 100 && !$('#modal').hidden; i++) { await new Promise(r => setTimeout(r, 3000)); const r = await api('/api/me/poll?n=' + data.nonce).catch(() => null); if (r?.data?.token) { store.set('gtok', r.data.token); return me(); } if (r?.data?.error) break; }
    };
  }
  function meShow(d, tok) {
    const dd = x => `${x.slice(8)}.${x.slice(5, 7)}`;
    modal(`<h2>👤 ${esc(d.name || t('meT'))}</h2><div class="muted">${d.phone.replace(/^380(\d{2})(\d{3})(\d{2})(\d{2})$/, '+380 $1 $2 $3 $4')}</div>
      <div class="me-k"><div><b>${money(d.bal)}</b><span>${t('bal')}</span></div><div><b>${d.n}</b><span>${t('vis')}</span></div><div><b>${money(d.sum)}</b><span>${t('spent')}</span></div></div>
      <h3>📅 ${t('myBook')}</h3><div class="me-l">${d.books.map(b => `<div><b>${dd(b.date)} ${b.time}</b> · ${b.people} 👤 · ${t('st')[b.st] || b.st}${b.pre.length ? `<br><small class="muted">🍽 ${b.pre.map(esc).join(', ')}</small>` : ''}</div>`).join('') || `<div class="muted">${t('none')}</div>`}</div>
      ${d.certs.length ? `<h3>🎟 ${t('myCert')}</h3><div class="me-l">${d.certs.map(c => `<div><a href="about.html#cert=${c.code}"><b>${c.code}</b></a> · ${money(c.left)} / ${money(c.sum)}${c.to ? ' · ' + esc(c.to) : ''}</div>`).join('')}</div>` : ''}
      <h3>🧾 ${t('myHist')}</h3><div class="me-l">${d.hist.map(h => `<div><b>${dd(h.d)} ${h.at}</b> · ${money(h.sum)} ${h.go === 'del' ? '🛵' : h.go === 'pick' ? '🥡' : '🪑'}<br><small class="muted">${h.dishes.map(([n, q]) => `${q}× ${esc(n)}`).join(', ')}</small></div>`).join('') || `<div class="muted">${t('none')}</div>`}</div>
      <a class="btn" href="index.html?go">🛵 ${t('order')}</a><button class="btn ghost" id="meOut">${t('out')}</button>`);
    $('#meOut').onclick = async () => { await api('/api/me/logout', {}, tok).catch(() => {}); store.set('gtok', ''); $('#modal').hidden = true; };
  }

  // ---------- старт ----------
  $('#lng').onclick = () => { lang = lang === 'uk' ? 'en' : 'uk'; store.set('alang', lang); i18n(); };
  $('#meBtn').onclick = me;
  const cm = location.hash.match(/^#cert=([A-Z0-9-]+)$/i); if (cm) { certPage(cm[1]); return; }
  i18n(); bookInit(); certInit();
  if (location.hash === '#me') me();
  // 👁 перегляд у конструкторі кабінету: чернетка приходить через postMessage, без запитів і без відправки форм
  const PREVIEW = new URLSearchParams(location.search).has('preview');
  if (PREVIEW) { addEventListener('message', e => { if (e.origin !== location.origin || !e.data?.vvSite) return; S = { ...(S || {}), ...e.data.vvSite }; render(); }); document.addEventListener('submit', e => e.preventDefault(), true); parent.postMessage({ vvReady: 1 }, location.origin); }
  // 📊 лічильник і кнопки конструктора
  document.addEventListener('click', e => {
    const h = e.target.closest('[data-hit]'); if (h && window.VVD) VVD.hit(API, h.dataset.hit, PREVIEW);
    const ev = e.target.closest('[data-evd]'); if (ev) { const f = $('#bookF'); if (f) f.date.value = ev.dataset.evd; }
    if (e.target.closest('#vvChatB')) chat();
  });
  function chat() {
    modal(`<h2>💬 ${lang === 'en' ? 'Message us' : 'Написати нам'}</h2><form id="chF"><div class="row2"><input name="name" required placeholder="${t('fName')}" value="${esc(store.get('goName', ''))}"><input name="phone" type="tel" required inputmode="tel" placeholder="${t('fPhone')}" value="${esc(store.get('goPhone', ''))}"></div><textarea name="text" rows="4" required minlength="2" maxlength="1000" placeholder="${lang === 'en' ? 'Your question' : 'Ваше питання'}"></textarea><button class="btn" type="submit">${lang === 'en' ? 'Send' : 'Надіслати'}</button><div class="msg" id="chMsg"></div></form>`);
    $('#chF').onsubmit = async e => { e.preventDefault(); if (PREVIEW) return; const f = e.target, m = $('#chMsg'); m.textContent = '…';
      const { status, data } = await api('/api/sitemsg', { name: f.name.value.trim(), phone: f.phone.value.trim(), text: f.text.value.trim(), device }).catch(() => ({ status: 0, data: {} }));
      if (status === 200) { store.set('goName', f.name.value.trim()); store.set('goPhone', f.phone.value.trim()); f.innerHTML = `<p>✅ ${lang === 'en' ? 'Sent! We will reply in Telegram or call you.' : 'Надіслано! Відповімо в Telegram або зателефонуємо.'}</p>`; } else m.textContent = data.error === 'rate' ? t('rate') : t('errC'); };
  }
  fetch(API + '/api/site').then(r => r.json()).then(s => { S = s; render(); if (window.VVD) VVD.hit(API, 'v', PREVIEW); }).catch(() => {});
  setInterval(() => { if (S) render(); }, 60000);
})();
