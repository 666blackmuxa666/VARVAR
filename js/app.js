(() => {
  const C = window.VARVAR, $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('vv_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('vv_' + k, JSON.stringify(v)); } catch {} },
  };
  const SESSION_MS = 8 * 3600e3;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  let lang = store.get('lang', nav === 'ru' || nav === 'uk' ? 'uk' : I18N[nav] ? nav : 'en');
  if (!I18N[lang]) lang = 'en';
  let cart = store.get('cart', {});           // "id" або "id|варіант" → кількість
  let table = store.get('table', '');
  let hist = store.get('hist', { ts: 0, orders: [] }); // замовлення цієї сесії
  let tip = { p: 0, own: false };
  let tableTotal = null, inVenue = null, busy = false, pendingType = null, bill = null, tw = store.get('tw', false);
  // «з собою»: 1 упаковка на кожну страву з кухні (напої, додатки не рахуються)
  const FOOD = new Set(['minimax', 'pasta', 'burgers', 'salads', 'snacks', 'soups', 'pans']);
  let packId = null, catOf = {};
  if (Date.now() - hist.ts > SESSION_MS) hist = { ts: 0, orders: [] };
  const device = store.get('device', null) || (() => { const d = crypto.randomUUID(); store.set('device', d); return d; })();

  // QR на столі: ?k=… → 1 година на замовлення; ключ одразу прибираємо з адреси
  let scanUntil = store.get('scan', 0);
  const qk = new URLSearchParams(location.search).get('k');
  const scanP = qk ? fetch(C.api + '/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k: qk, device }) })
    .then(r => r.json()).then(d => { if (d.until) { scanUntil = d.until; store.set('scan', d.until); } }).catch(() => {}) : Promise.resolve();
  if (qk) { const u = new URL(location.href); u.searchParams.delete('k'); history.replaceState(null, '', u.pathname + u.search + u.hash); }

  const t = k => I18N[lang][k] ?? I18N.en[k] ?? k;
  // назви і склад: uk/en — з меню; інші мови — з js/menu-i18n.js (склад по словах), інакше англійською
  const MI = () => (window.MENU_I18N || {})[lang];
  const catName = c => c.name[lang] || MI()?.c[c.id] || c.name.en;
  const itemName = it => it.name[lang] || MI()?.n[it.id] || it.name.en;
  const itemDesc = it => {
    if (!it.desc) return '';
    if (it.desc[lang]) return it.desc[lang];
    const m = MI(); if (!m) return it.desc.en;
    const r = it.desc.en.split(', ').map(p => m.t[p.toLowerCase()] || p).join(', ');
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unit = s => lang === 'uk' ? s : s.replace(/ г/g, ' g').replace(/ л/g, ' l').replace(/^л$/, 'l').replace('шт', 'pc').replace("м'яса", 'meat');
  const money = n => n.toLocaleString('uk-UA') + ' ' + t('cur');
  const IMG_VER = 7; // збільшити після оновлення фото, щоб телефони не брали стару копію
  let menu, byId = {};
  // напої — менші картки
  const DRINKS = new Set(['coffee', 'soft', 'lemonades', 'cocktails', 'shots', 'whisky', 'rum', 'vermouth', 'liqueur', 'cognac', 'vodka', 'tequila', 'gin', 'wine', 'beer', 'hookah', 'upakuvannia']); // компактні картки (3 в ряд)

  const priceOf = key => { const [id, v] = key.split('|'); const it = byId[id]; return v ? it.variants.find(x => x.v === v).p : it.price; };
  const labelOf = key => { const [id, v] = key.split('|'); const it = byId[id]; return itemName(it) + (v ? unit(` ${v} л`) : ''); };
  const cartEntries = () => Object.entries(cart).filter(([k, q]) => q > 0 && byId[k.split('|')[0]]);
  let packAdj = 0; // ручна поправка кількості упаковок (+/−)
  const packQty = () => tw ? Math.max(0, cartEntries().filter(([k]) => FOOD.has(catOf[k.split('|')[0]])).reduce((s, [, q]) => s + q, 0) + packAdj) : 0;
  const packSum = () => packId ? packQty() * priceOf(packId) : 0;
  const cartSum = () => cartEntries().reduce((s, [k, q]) => s + priceOf(k) * q, 0) + packSum();
  const save = () => { store.set('cart', cart); store.set('hist', hist); store.set('table', table); };

  // ---------- меню ----------
  $('#langs').innerHTML = LANGS.map(([c, f, n]) => `<button data-lang="${c}">${f} ${n}</button>`).join('');
  function renderMenu() {
    document.documentElement.lang = lang;
    $('#lang').textContent = (LANGS.find(l => l[0] === lang) || ['', '🌐'])[1] + ' ' + lang.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
    document.querySelectorAll('[data-i18n-ph]').forEach(e => e.placeholder = t(e.dataset.i18nPh));
    $('#cats').innerHTML = menu.categories.map(c => `<a href="#c-${c.id}" data-cat="${c.id}">${esc(catName(c))}</a>`).join('');
    $('#menu').innerHTML = menu.categories.map(c => `${c.id === 'extras' ? `<button class="ai-card" data-ai><b>✨ ${esc(t('aiBtn'))}</b><span>${esc(t('aiSub'))}</span></button>` : ''}
      <section class="cat ${c.id === 'extras' ? 'compact' : DRINKS.has(c.id) ? 'drinks' : ''}" id="c-${c.id}">
        <h2>${esc(catName(c))}</h2>
        <div class="grid">${c.items.map(card).join('')}</div>
      </section>`).join('');
    observeCats();
    renderFab();
  }
  function card(it) {
    const btns = it.variants
      ? `<div class="vars">${it.variants.map(v => addBtn(it.id + '|' + v.v, unit(`${v.v} л`) + ` · ${v.p}`)).join('')}</div>`
      : `<div class="row"><span class="price">${it.price} <small>${t('cur')}</small></span>${addBtn(it.id, '+')}</div>`;
    return `<article class="item">
      ${it.img ? `<div class="ph"><img src="${it.img}${it.img.includes('?') ? '' : '?v=' + IMG_VER}" alt="" loading="lazy" decoding="async"></div>` : ''}
      <div class="info">
        <h3>${esc(itemName(it))}${it.size && !it.variants ? `<span class="size">${esc(unit(it.size))}</span>` : ''}</h3>
        ${it.desc ? `<p>${esc(itemDesc(it))}</p>` : ''}
        ${btns}
      </div></article>`;
  }
  const addBtn = (key, label) => {
    const q = cart[key] || 0;
    return `<button class="add ${q ? 'on' : ''}" data-add="${esc(key)}" data-label="${esc(label)}">${q ? `<i>${q}</i>` : ''}${esc(label)}</button>`;
  };
  function refreshButtons() {
    document.querySelectorAll('[data-add]').forEach(b => {
      const q = cart[b.dataset.add] || 0;
      b.classList.toggle('on', q > 0);
      b.innerHTML = (q ? `<i>${q}</i>` : '') + esc(b.dataset.label);
    });
  }
  function observeCats() {
    const links = [...document.querySelectorAll('#cats a')];
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('on', a.dataset.cat === e.target.id.slice(2)));
      const a = links.find(a => a.classList.contains('on'));
      // крутимо лише рядок категорій по горизонталі — сторінку не чіпаємо (scrollIntoView смикав скрол на телефонах)
      if (a) { const nav = $('#cats'); nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' }); }
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.cat').forEach(s => io.observe(s));
  }

  // ---------- кошик ----------
  function renderFab() {
    const n = cartEntries().reduce((s, [, q]) => s + q, 0);
    $('#fab').hidden = n === 0 && !hist.orders.length;
    $('#fabCount').textContent = n;
    $('#fabSum').textContent = n ? money(cartSum()) : t('cart');
  }
  const thumb = k => { const it = byId[k.split('|')[0]]; return it?.img ? `<img class="th" src="${esc(it.img)}${it.img.includes('?') ? '' : '?v=' + IMG_VER}" alt="">` : '<span class="th"></span>'; };
  function renderCart() {
    const rows = cartEntries(), pq = packQty();
    $('#cartList').innerHTML = rows.length ? `<div class="cl-title">${t('newOrder')}</div>` + rows.map(([k, q]) => `
      <div class="line">${thumb(k)}<span class="ln">${esc(labelOf(k))}<small>${money(priceOf(k))}</small></span>
        <span class="qty"><button data-dec="${esc(k)}">−</button><b>${q}</b><button data-inc="${esc(k)}">+</button></span>
        <span class="lp">${money(priceOf(k) * q)}</span></div>`).join('')
      + (pq && packId ? `<div class="line auto">${thumb(packId)}<span class="ln">🥡 ${t('pack')}<small>${money(priceOf(packId))} × ${pq}</small></span><span class="qty"><button data-pk="-1">−</button><b>${pq}</b><button data-pk="1">+</button></span><span class="lp">${money(packSum())}</span></div>` : '')
      + `<div class="line sum"><span>${t('total')}</span><b>${money(cartSum())}</b></div>`
      : `<p class="empty">🛒 ${t('empty')}</p>`;
    $('#twBox').innerHTML = rows.length ? `<button class="tw ${tw ? 'on' : ''}" data-tw><span class="tw-ic">🥡</span><span class="tw-t"><b>${t('takeaway')}</b><small>${t('takeawayNote')}</small></span><span class="sw"></span></button>` : '';
    $('#table').innerHTML = `<option value="">—</option>` + Array.from({ length: C.tables }, (_, i) => `<option ${String(i + 1) === String(table) ? 'selected' : ''}>${i + 1}</option>`).join('');
    // рахунок столу — з сервера, тож зміни офіціанта (прибрав страву, знижка) видно одразу
    const pend = hist.orders.filter(o => o.id);
    $('#history').innerHTML = bill || pend.length ? `
      <div class="hist"><div class="hist-title">🧾 ${t('yourBill')}${table ? ` · ${t('table')} ${table}` : ''}</div>
      ${pend.length ? `<div class="pills">${pend.map((o, i) => `<span class="st ${o.s === 'acc' ? 'ok' : 'wait'}">${i ? t('reorderLbl') : t('orderLbl')} ${o.at || ''} · ${o.s === 'acc' ? '✅ ' + t('accShort') : '⏳ ' + t('waitShort')}</span>`).join('')}</div>` : ''}
      ${bill ? bill.items.map(([n, q, sm]) => `<div class="hist-line"><span>${q}× ${esc(n)}</span><span>${money(sm)}</span></div>`).join('') : ''}
      ${bill && bill.tip ? `<div class="hist-line"><span>💝 ${t('tipLbl')}</span><span>+${money(bill.tip)}</span></div>` : ''}${bill && bill.disc ? `<div class="hist-line disc"><span>${t('discount')} ${bill.disc}%</span><span>−${money(bill.gross - bill.pay)}</span></div>` : ''}
      <div class="hist-total"><span>${t('tableTotal')}</span><b>${money(bill ? bill.pay : tableTotal || 0)}</b></div>
      <div class="hist-note">${t('billNote')}</div></div>` : '';
    const first = !hist.orders.length && !bill;
    const hasItems = rows.length > 0;
    $('#actions').innerHTML = first
      ? `<button class="btn" data-send="order" ${hasItems ? '' : 'disabled'}>${t('order')}</button>
         <button class="btn alt" data-send="order_check" ${hasItems ? '' : 'disabled'}>${t('orderCheck')}</button>`
      : `<button class="btn" data-send="reorder" ${hasItems ? '' : 'disabled'}>${t('reorder')}</button>
         <button class="btn alt" data-send="check">${t('check')}</button>`;
  }
  // ---------- статус замовлення (офіціант натиснув «Прийняв» у Telegram) ----------
  const badge = o => !o.id ? '' : o.s === 'acc' ? `<span class="st ok">✅ ${t('accShort')}</span>` : `<span class="st wait">⏳ ${t('waitShort')}</span>`;
  function renderStatus() {
    const last = hist.reqs && hist.reqs[hist.reqs.length - 1];
    const bar = $('#orderStatus');
    if (!last || (last.s === 'acc' && Date.now() - (last.accAt || 0) > 3000)) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.className = 'order-status ' + (last.s === 'acc' ? 'ok' : 'wait');
    bar.textContent = last.s === 'acc'
      ? (last.type === 'check' ? t('accCheck') : t('accOrder')) + (last.by ? ` · ${last.by}` : '')
      : (last.type === 'check' ? t('waitCheck') : t('waitOrder'));
  }
  async function pollOrders() {
    const pending = (hist.reqs || []).filter(r => r.s !== 'acc');
    if (!pending.length) return;
    try {
      const { data } = await api('/api/orders?ids=' + pending.map(r => r.id).join(','));
      let changed = false;
      for (const r of pending) {
        const st = data[r.id];
        if (st && st.s === 'acc') {
          Object.assign(r, { s: 'acc', by: st.by, accAt: Date.now() }); changed = true;
          const o = hist.orders.find(x => x.id === r.id); if (o) o.s = 'acc';
          navigator.vibrate?.(80);
        }
      }
      if (changed) { save(); renderStatus(); setTimeout(renderStatus, 3100); if (!$('#sheet').hidden) renderCart(); } // зелена плашка — 3 с
    } catch {}
  }
  setInterval(pollOrders, 5000);
  setInterval(() => { if (!$('#sheet').hidden && document.visibilityState === 'visible') syncStatus(); }, 5000);
  setInterval(renderStatus, 30000);

  const openSheet = () => { $('#msg').textContent = ''; renderCart(); $('#sheet').hidden = false; document.body.classList.add('lock'); syncStatus(); };
  const closeAll = () => { $('#sheet').hidden = $('#wifiModal').hidden = true; document.body.classList.remove('lock'); };

  function change(key, d) {
    cart[key] = Math.max(0, (cart[key] || 0) + d);
    if (!cart[key]) delete cart[key];
    save(); renderFab(); refreshButtons();
    if (!$('#sheet').hidden) renderCart();
  }

  // ---------- чайові (у вікні оплати) ----------
  const tipBase = () => (bill ? bill.pay : tableTotal || 0) + (pendingType === 'order_check' ? cartSum() : 0);
  const tipAmount = () => tip.own ? Math.max(0, Math.round(+$('#tipOwn').value || 0)) : Math.round(tipBase() * tip.p / 100);
  function renderTips() {
    $('#tipRow').innerHTML = [0, 5, 10, 15].map(p => `<button class="tip ${!tip.own && tip.p === p ? 'on' : ''}" data-tip="${p}">${p ? p + '%' : t('tipNo')}${p && tipBase() ? `<small>${money(Math.round(tipBase() * p / 100))}</small>` : ''}</button>`).join('')
      + `<button class="tip ${tip.own ? 'on' : ''}" data-tip="own">✏️<small>${t('tipOwnBtn')}</small></button>`;
    $('#tipOwn').hidden = !tip.own;
    const a = tipAmount(); $('#tipSum').textContent = a ? '+' + money(a) : '';
  }
  $('#tipOwn').addEventListener('input', () => { const a = tipAmount(); $('#tipSum').textContent = a ? '+' + money(a) : ''; });

  // ---------- сервер ----------
  async function api(path, body) {
    const r = await fetch(C.api + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }
  async function syncStatus() {
    try {
      await scanP;
      const { data } = await api('/api/status?device=' + device + (table ? '&table=' + table : ''));
      inVenue = !!data.inVenue; if (data.scanUntil) { scanUntil = data.scanUntil; store.set('scan', scanUntil); }
      if (table && typeof data.tableTotal === 'number') {
        // стіл закрили (/close) — сесія скінчилась
        if (data.tableTotal === 0 && hist.orders.length) { hist = { ts: 0, orders: [] }; save(); renderStatus(); }
        if (!data.bill) bill = null;
        tableTotal = data.tableTotal || null; bill = data.bill || null;
      }
    } catch { inVenue = null; }
    $('#wifiBanner').hidden = inVenue !== false;
    $('#wifiBanner').textContent = t('wifiBanner');
    if (!$('#sheet').hidden) renderCart();
    renderFab();
  }
  async function send(type, pay) {
    if (busy) return;
    table = $('#table').value; save();
    if (!table) { $('#msg').textContent = t('chooseTable'); $('#table').focus(); return; }
    // запит чека — спершу питаємо спосіб оплати
    if ((type === 'check' || type === 'order_check') && !pay) { pendingType = type; tip = { p: 0, own: false }; $('#tipOwn').value = ''; renderTips(); $('#payModal').hidden = false; return; }
    const items = type === 'check' ? [] : cartEntries();
    busy = true; $('#msg').textContent = '…';
    try {
      const { status, data } = await api('/api/order', {
        table: +table, type, pay, device, tip: pay ? tipAmount() : 0, comment: [items.length && tw ? 'З СОБОЮ' : '', $('#comment').value].filter(Boolean).join(' · ').slice(0, 300),
        items: [...items.map(([k, q]) => { const [id, v] = k.split('|'); return { id, v, q }; }), ...(items.length && packId && packQty() ? [{ id: packId, q: packQty() }] : [])],
      });
      if (status === 403) { inVenue = false; $('#wifiBanner').hidden = false; showWifi(); $('#msg').textContent = ''; return; }
      if (status === 429) { $('#msg').textContent = t('wait'); return; }
      if (status !== 200) throw 0;
      if (items.length) { hist.orders.push({ items, total: data.orderTotal, id: data.id, s: 'new', at: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) }); }
      hist.ts = Date.now();
      if (data.id) { hist.reqs = [...(hist.reqs || []), { id: data.id, type: items.length ? 'order' : 'check', s: 'new' }].slice(-20); }
      renderStatus();
      tableTotal = data.tableTotal; cart = {}; tw = false; packAdj = 0; store.set('tw', false); $('#comment').value = ''; save(); syncStatus();
      renderCart(); refreshButtons(); renderFab();
      $('#msg').textContent = type === 'check' || type === 'order_check' ? t('sentCheck') : t('sent');
    } catch { $('#msg').textContent = t('error'); }
    finally { busy = false; }
  }
  function showWifi() { // тепер — «скануйте QR-код на столі»
    $('#wifiModal').hidden = false;
  }

  // ---------- ✨ помічник Gemini ----------
  let ai = { hist: [], q: null, res: null };
  const aiNm = key => { const [id, v] = key.split('|'); const it = byId[id]; return it ? itemName(it) + (v ? ` ${unit(v + ' л')}` : '') : key; };
  function aiRender(html) { $('#aiBody').innerHTML = html; }
  async function aiAsk(now) {
    aiRender(`<div class="ai-think"><i></i><i></i><i></i></div>`);
    try {
      const r = await fetch(C.api + '/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang, device, hist: ai.hist, now }) });
      const d = await r.json(); if (!r.ok) throw d;
      if (d.question) { ai.q = d.question;
        aiRender(`<p class="ai-q">${esc(d.question)}</p><div class="ai-opts">${d.options.map(o => `<button class="btn ghost" data-ai-a="${esc(o)}">${esc(o)}</button>`).join('')}</div>
          <div class="ai-own"><input id="aiOwn" placeholder="${esc(t('aiOwn'))}"><button class="btn" data-ai-a="">→</button></div>${ai.hist.length ? `<button class="ai-skip" data-ai-a="__now">${esc(t('aiNow'))}</button>` : ''}`);
      } else { ai.res = d;
        aiRender(`<p class="ai-q">${esc(d.intro)}</p>${d.picks.map((p, i) => `<div class="ai-pick"><h3>${esc(p.title)}</h3><p>${esc(p.why)}</p>
          <ul>${p.items.map(x => `<li>${x.q > 1 ? x.q + '× ' : ''}${esc(aiNm(x.key))}<span>${money(x.price * x.q)}</span></li>`).join('')}</ul>
          <button class="btn" data-ai-pick="${i}">🛒 ${esc(t('aiAdd'))} · ${money(p.sum)}</button></div>`).join('')}<button class="ai-skip" data-ai-again>🔄 ${esc(t('aiAgain'))}</button>`);
      }
    } catch (e) { aiRender(`<p class="ai-q">${esc(t(e?.error === 'limit' ? 'aiLimit' : 'aiErr'))}</p><button class="btn" data-ai-again>🔄 ${esc(t('aiAgain'))}</button>`); }
  }
  function aiOpen() { ai = { hist: [], q: null, res: null }; $('#aiModal').hidden = false; aiAsk(); }
  function aiStep(a) {
    if (a === '__now') return aiAsk(true);
    if (!a) { a = ($('#aiOwn')?.value || '').trim(); if (!a) return; }
    ai.hist.push({ q: ai.q, a }); aiAsk();
  }
  function aiTake(i) {
    const p = ai.res?.picks[i]; if (!p) return;
    p.items.forEach(x => { if (byId[x.key.split('|')[0]]) cart[x.key] = (cart[x.key] || 0) + x.q; });
    save(); refreshButtons(); renderFab(); $('#aiModal').hidden = true; openSheet();
  }

  // ---------- події ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('button, [data-close], #wifiBanner, #orderStatus');
    if (!el || (el.id !== 'lang' && !el.dataset.lang)) $('#langs').hidden = true;
    if (!el) return;
    if ('ai' in el.dataset) aiOpen();
    else if (el.dataset.aiA != null) aiStep(el.dataset.aiA);
    else if (el.dataset.aiPick != null) aiTake(+el.dataset.aiPick);
    else if ('aiAgain' in el.dataset) aiOpen();
    else if (el.dataset.add) change(el.dataset.add, 1);
    else if (el.dataset.pk) { if (packQty() + +el.dataset.pk >= 0) packAdj += +el.dataset.pk; renderCart(); renderFab(); }
    else if ('tw' in el.dataset) { packAdj = 0; tw = !tw; store.set('tw', tw); renderCart(); renderFab(); }
    else if (el.dataset.inc) change(el.dataset.inc, 1);
    else if (el.dataset.dec) change(el.dataset.dec, -1);
    else if (el.dataset.send) send(el.dataset.send);
    else if (el.dataset.tip) { tip = el.dataset.tip === 'own' ? { p: 0, own: true } : { p: +el.dataset.tip, own: false }; renderTips(); if (tip.own) $('#tipOwn').focus(); }
    else if (el.dataset.pay) { $('#payModal').hidden = true; send(pendingType, el.dataset.pay); }
    else if ('close' in el.dataset) el.closest('.modal') ? (el.closest('.modal').hidden = true) : closeAll();
    else if (el.id === 'fab' || el.id === 'orderStatus') openSheet();
    else if (el.id === 'wifiBanner') showWifi();
    else if (el.id === 'lang') { const p = $('#langs'); p.hidden = !p.hidden; }
    else if (el.dataset.lang) { lang = el.dataset.lang; store.set('lang', lang); $('#langs').hidden = true; renderMenu(); syncStatus(); }
    else if (el.id === 'retry') { $('#wifiModal').hidden = true; syncStatus(); }
  });
  $('#table').addEventListener('change', e => { table = e.target.value; save(); syncStatus(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { syncStatus(); pollOrders(); } });

  // меню з сервера (редагується через Telegram); якщо сервер недоступний — локальна копія
  const load = u => fetch(u).then(r => { if (!r.ok) throw 0; return r.json(); });
  load(C.api + '/api/menu').catch(() => load('data/menu.json')).then(m => {
    m.categories.forEach(c => c.items = c.items.filter(it => !it.hidden));
    m.categories = m.categories.filter(c => c.items.length);
    menu = m;
    m.categories.forEach(c => c.items.forEach(it => { byId[it.id] = it; catOf[it.id] = c.id; }));
    packId = (m.categories.find(c => c.id === 'upakuvannia')?.items || [])[0]?.id || null;
    renderMenu(); syncStatus(); renderStatus(); pollOrders();
  });
})();
