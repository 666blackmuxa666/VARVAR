(() => {
  const C = window.VARVAR, $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('vv_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('vv_' + k, JSON.stringify(v)); } catch {} },
  };
  const SESSION_MS = 8 * 3600e3;
  let lang = store.get('lang', navigator.language.startsWith('uk') || navigator.language.startsWith('ru') ? 'uk' : 'en');
  let cart = store.get('cart', {});           // "id" або "id|варіант" → кількість
  let table = store.get('table', '');
  let hist = store.get('hist', { ts: 0, orders: [] }); // замовлення цієї сесії
  let tableTotal = null, inVenue = null, busy = false;
  if (Date.now() - hist.ts > SESSION_MS) hist = { ts: 0, orders: [] };
  const device = store.get('device', null) || (() => { const d = crypto.randomUUID(); store.set('device', d); return d; })();

  const t = k => I18N[lang][k] ?? k;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const unit = s => lang === 'uk' ? s : s.replace(/ г/g, ' g').replace(/ л/g, ' l').replace(/^л$/, 'l').replace('шт', 'pc').replace("м'яса", 'meat');
  const money = n => n.toLocaleString('uk-UA') + ' ' + t('cur');
  const IMG_VER = 7; // збільшити після оновлення фото, щоб телефони не брали стару копію
  let menu, byId = {};
  // напої — менші картки
  const DRINKS = new Set(['coffee', 'soft', 'lemonades', 'cocktails', 'shots', 'whisky', 'rum', 'vermouth', 'liqueur', 'cognac', 'vodka', 'tequila', 'gin', 'wine', 'beer', 'hookah']);

  const priceOf = key => { const [id, v] = key.split('|'); const it = byId[id]; return v ? it.variants.find(x => x.v === v).p : it.price; };
  const labelOf = key => { const [id, v] = key.split('|'); const it = byId[id]; return it.name[lang] + (v ? unit(` ${v} л`) : ''); };
  const cartEntries = () => Object.entries(cart).filter(([k, q]) => q > 0 && byId[k.split('|')[0]]);
  const cartSum = () => cartEntries().reduce((s, [k, q]) => s + priceOf(k) * q, 0);
  const save = () => { store.set('cart', cart); store.set('hist', hist); store.set('table', table); };

  // ---------- меню ----------
  function renderMenu() {
    document.documentElement.lang = lang;
    $('#lang').textContent = lang === 'uk' ? 'EN' : 'UA';
    document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
    document.querySelectorAll('[data-i18n-ph]').forEach(e => e.placeholder = t(e.dataset.i18nPh));
    $('#cats').innerHTML = menu.categories.map(c => `<a href="#c-${c.id}" data-cat="${c.id}">${esc(c.name[lang])}</a>`).join('');
    $('#menu').innerHTML = menu.categories.map(c => `
      <section class="cat ${c.id === 'extras' ? 'compact' : DRINKS.has(c.id) ? 'drinks' : ''}" id="c-${c.id}">
        <h2>${esc(c.name[lang])}</h2>
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
        <h3>${esc(it.name[lang])}${it.size && !it.variants ? `<span class="size">${esc(unit(it.size))}</span>` : ''}</h3>
        ${it.desc ? `<p>${esc(it.desc[lang])}</p>` : ''}
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
  function renderCart() {
    const rows = cartEntries();
    $('#cartList').innerHTML = rows.length ? rows.map(([k, q]) => `
      <div class="line"><span class="ln">${esc(labelOf(k))}</span>
        <span class="qty"><button data-dec="${esc(k)}">−</button><b>${q}</b><button data-inc="${esc(k)}">+</button></span>
        <span class="lp">${money(priceOf(k) * q)}</span></div>`).join('')
      + `<div class="line sum"><span>${t('total')}</span><b>${money(cartSum())}</b></div>`
      : `<p class="empty">${t('empty')}</p>`;
    $('#table').innerHTML = `<option value="">—</option>` + Array.from({ length: C.tables }, (_, i) => `<option ${String(i + 1) === String(table) ? 'selected' : ''}>${i + 1}</option>`).join('');
    const histSum = hist.orders.reduce((s, o) => s + o.total, 0);
    const shown = tableTotal ?? histSum;
    // що вже замовлено: кожне замовлення окремо (замовлення / дозамовлення, час, статус)
    $('#history').innerHTML = hist.orders.length || tableTotal ? `
      <div class="hist"><div class="hist-title">${t('ordered')}</div>
      ${hist.orders.map((o, i) => `<div class="hist-order">
        <div class="hist-head"><span>${i ? t('reorderLbl') : t('orderLbl')}${o.at ? ' · ' + o.at : ''}</span>${badge(o)}</div>
        ${o.items.map(([k, q]) => `<div class="hist-line"><span>${q}× ${esc(labelOf(k))}</span><span>${byId[k.split('|')[0]] ? money(priceOf(k) * q) : ''}</span></div>`).join('')}
      </div>`).join('')}
      <div class="hist-total"><span>${t('tableTotal')}</span><b>${money(shown)}</b></div></div>` : '';
    const first = !hist.orders.length;
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
  setInterval(renderStatus, 30000);

  const openSheet = () => { $('#msg').textContent = ''; renderCart(); $('#sheet').hidden = false; document.body.classList.add('lock'); syncStatus(); };
  const closeAll = () => { $('#sheet').hidden = $('#wifiModal').hidden = true; document.body.classList.remove('lock'); };

  function change(key, d) {
    cart[key] = Math.max(0, (cart[key] || 0) + d);
    if (!cart[key]) delete cart[key];
    save(); renderFab(); refreshButtons();
    if (!$('#sheet').hidden) renderCart();
  }

  // ---------- сервер ----------
  async function api(path, body) {
    const r = await fetch(C.api + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }
  async function syncStatus() {
    try {
      const { data } = await api('/api/status' + (table ? '?table=' + table : ''));
      inVenue = !!data.inVenue;
      if (table && typeof data.tableTotal === 'number') {
        // стіл закрили (/close) — сесія скінчилась
        if (data.tableTotal === 0 && hist.orders.length) { hist = { ts: 0, orders: [] }; save(); renderStatus(); }
        tableTotal = data.tableTotal || null;
      }
    } catch { inVenue = null; }
    $('#wifiBanner').hidden = inVenue !== false;
    $('#wifiBanner').textContent = '📶 ' + t('wifiBanner');
    if (!$('#sheet').hidden) renderCart();
    renderFab();
  }
  async function send(type) {
    if (busy) return;
    table = $('#table').value; save();
    if (!table) { $('#msg').textContent = t('chooseTable'); $('#table').focus(); return; }
    const items = type === 'check' ? [] : cartEntries();
    busy = true; $('#msg').textContent = '…';
    try {
      const { status, data } = await api('/api/order', {
        table: +table, type, device, comment: $('#comment').value.slice(0, 300),
        items: items.map(([k, q]) => { const [id, v] = k.split('|'); return { id, v, q }; }),
      });
      if (status === 403) { showWifi(); $('#msg').textContent = ''; return; }
      if (status === 429) { $('#msg').textContent = t('wait'); return; }
      if (status !== 200) throw 0;
      if (items.length) { hist.orders.push({ items, total: data.orderTotal, id: data.id, s: 'new', at: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) }); }
      hist.ts = Date.now();
      if (data.id) { hist.reqs = [...(hist.reqs || []), { id: data.id, type: items.length ? 'order' : 'check', s: 'new' }].slice(-20); }
      renderStatus();
      tableTotal = data.tableTotal; cart = {}; $('#comment').value = ''; save();
      renderCart(); refreshButtons(); renderFab();
      $('#msg').textContent = type === 'check' || type === 'order_check' ? t('sentCheck') : t('sent');
    } catch { $('#msg').textContent = t('error'); }
    finally { busy = false; }
  }
  function showWifi() {
    $('#wSsid').textContent = C.wifi.ssid; $('#wPass').textContent = C.wifi.password;
    $('#wPassRow').hidden = $('#copyPass').hidden = !C.wifi.password;
    $('#wifiModal').hidden = false;
  }

  // ---------- події ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('button, [data-close], #wifiBanner, #orderStatus');
    if (!el) return;
    if (el.dataset.add) change(el.dataset.add, 1);
    else if (el.dataset.inc) change(el.dataset.inc, 1);
    else if (el.dataset.dec) change(el.dataset.dec, -1);
    else if (el.dataset.send) send(el.dataset.send);
    else if ('close' in el.dataset) el.closest('.modal') ? ($('#wifiModal').hidden = true) : closeAll();
    else if (el.id === 'fab' || el.id === 'orderStatus') openSheet();
    else if (el.id === 'wifiBanner') showWifi();
    else if (el.id === 'lang') { lang = lang === 'uk' ? 'en' : 'uk'; store.set('lang', lang); renderMenu(); syncStatus(); }
    else if (el.id === 'copyPass') navigator.clipboard?.writeText(C.wifi.password).then(() => el.textContent = t('copied'));
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
    m.categories.forEach(c => c.items.forEach(it => byId[it.id] = it));
    renderMenu(); syncStatus(); renderStatus(); pollOrders();
  });
})();
