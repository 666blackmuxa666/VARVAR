(() => {
  // 👁 перегляд у конструкторі меню (кабінет): дизайн приходить через postMessage; замовлення й виклики не відправляються
  if (new URLSearchParams(location.search).has('preview')) {
    const f0 = window.fetch; window.fetch = (u, o) => (o && o.method && o.method !== 'GET' ? Promise.reject(new Error('preview')) : f0(u, o));
    addEventListener('message', e => { if (e.origin === location.origin && e.data && 'vvMenu' in e.data && window.VVM) { window.__vvM = e.data; VVM.apply(e.data.vvMenu, e.data.brand); } });
    addEventListener('load', () => parent.postMessage({ vvReady: 1 }, location.origin));
  }
  const C = window.VARVAR, $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem((window.VARVAR.pre || 'vv_') + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem((window.VARVAR.pre || 'vv_') + k, JSON.stringify(v)); } catch {} },
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
  // QR столу (?k=…&t=N) — стіл закріплений на годину, вибрати інший не можна
  let scanUntil = store.get('scan', 0), lockT = store.get('lockT', 0);
  const lockOn = () => lockT && scanUntil > Date.now();
  const qs = new URLSearchParams(location.search), qk = qs.get('k'), qt = qs.get('t');
  const GO = qs.has('go'), BOOK = /^\d{8}[a-f0-9]{6}$/.test(qs.get('book') || '') ? qs.get('book') : ''; // BOOK — передзамовлення до броні // 🛵 замовлення за посиланням: лише з собою (самовивіз / доставка)
  if (GO) { tw = true; document.body.classList.add('go'); }
  const scanP = qk ? fetch(C.api + '/api/scan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k: qk, t: qt, device }) })
    .then(r => r.json()).then(d => { if (d.until) { scanUntil = d.until; lockT = d.t || 0; store.set('scan', d.until); store.set('lockT', lockT); if (lockT) { table = String(lockT); store.set('table', table); } } }).catch(() => {}) : Promise.resolve();
  if (qk) { const u = new URL(location.href); u.searchParams.delete('k'); u.searchParams.delete('t'); history.replaceState(null, '', u.pathname + u.search + u.hash); }

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
    const cats = menu.categories.filter(c => !c.tech); // технічні (Інше, упаковка) — лише для персоналу
    $('#cats').innerHTML = cats.map(c => `<a href="#c-${c.id}" data-cat="${c.id}">${esc(catName(c))}</a>`).join('');
    $('#menu').innerHTML = cats.map(c => `${c.id === 'extras' ? `<button class="ai-card" data-ai><b>✨ ${esc(t('aiBtn'))}</b><span>${esc(t('aiSub'))}</span></button>` : ''}
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
    $('#fab').hidden = n === 0 && !(GO ? goHist.length : hist.orders.length);
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
    if (lockOn()) table = String(lockT);
    $('#table').innerHTML = (lockOn() ? '' : `<option value="">—</option>`) + Array.from({ length: C.tables }, (_, i) => i + 1).filter(n => !lockOn() || n === lockT).map(n => `<option ${String(n) === String(table) ? 'selected' : ''}>${n}</option>`).join('');
    $('#table').disabled = !!lockOn(); $('#table').closest('.table-row').classList.toggle('locked', !!lockOn());
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
    if (GO) goCart(rows);
  }
  // ---------- статус замовлення (офіціант натиснув «Прийняв» у Telegram) ----------
  const badge = o => !o.id ? '' : o.s === 'acc' ? `<span class="st ok">✅ ${t('accShort')}</span>` : `<span class="st wait">⏳ ${t('waitShort')}</span>`;
  // 🔔 покликати офіціанта
  async function callWaiter() {
    if (lockOn()) table = String(lockT);
    if (!table) { openSheet(); $('#msg').textContent = t('chooseTable'); return; }
    const b = $('#callBtn'); b.disabled = true;
    try {
      const { status, data } = await api('/api/call', { table: +table, device });
      if (status === 403) { if (data.error === 'wrong_table') return; inVenue = false; $('#wifiBanner').hidden = false; showWifi(); return; }
      if (status === 429) { toastG(t('callWait')); return; }
      if (status !== 200) throw 0;
      hist.reqs = [...(hist.reqs || []), { id: data.id, type: 'call', s: 'new' }].slice(-20); save(); renderStatus();
    } catch { toastG(t('error')); } finally { setTimeout(() => { b.disabled = false; }, 3000); }
  }
  function toastG(m) { const bar = $('#orderStatus'); bar.hidden = false; bar.className = 'order-status wait'; bar.textContent = m; setTimeout(renderStatus, 3000); }
  function renderStatus() {
    const last = hist.reqs && hist.reqs[hist.reqs.length - 1];
    const bar = $('#orderStatus');
    if (!last || (last.s === 'acc' && Date.now() - (last.accAt || 0) > 3000)) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.className = 'order-status ' + (last.rej ? 'wait' : last.s === 'acc' ? 'ok' : 'wait');
    bar.textContent = last.rej ? t('rejOrder') : last.s === 'acc'
      ? (last.type === 'call' ? t('accCall') : last.type === 'check' ? t('accCheck') : t('accOrder')) + (last.by ? ` · ${last.by}` : '')
      : (last.type === 'call' ? t('waitCall') : last.type === 'check' ? t('waitCheck') : t('waitOrder'));
  }
  async function pollOrders() {
    if (GO) return goPoll();
    const pending = (hist.reqs || []).filter(r => r.s !== 'acc');
    if (!pending.length) return;
    try {
      const { data } = await api('/api/orders?ids=' + pending.map(r => r.id).join(','));
      let changed = false;
      for (const r of pending) {
        const st = data[r.id];
        if (st && st.s === 'rej') { // офіціант відхилив
          Object.assign(r, { s: 'acc', rej: 1, by: st.by, accAt: Date.now() + 9000 }); changed = true;
          hist.orders = hist.orders.filter(x => x.id !== r.id); navigator.vibrate?.([80, 60, 80]);
        } else if (st && st.s === 'acc') {
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
    // 👨‍🍳 окрема подяка кухні
    // 👨‍🍳 подяка кухні — так само, як чайові офіціанту: % або своя сума
    $('#ktipRow').innerHTML = [0, 5, 10, 15].map(p => `<button class="tip ${!kt.own && kt.p === p ? 'on' : ''}" data-ktip="${p}">${p ? p + '%' : t('tipNo')}${p && tipBase() ? `<small>${money(Math.round(tipBase() * p / 100))}</small>` : ''}</button>`).join('')
      + `<button class="tip ${kt.own ? 'on' : ''}" data-ktip="own">✏️<small>${t('tipOwnBtn')}</small></button>`;
    $('#ktipOwn').hidden = !kt.own;
    const k = ktipAmount(); $('#ktipSum').textContent = k ? '+' + money(k) : '';
  }
  let kt = { p: 0, own: false };
  const ktipAmount = () => kt.own ? Math.max(0, Math.round(+$('#ktipOwn').value || 0)) : Math.round(tipBase() * kt.p / 100);
  $('#ktipOwn').addEventListener('input', () => { const k = ktipAmount(); $('#ktipSum').textContent = k ? '+' + money(k) : ''; });
  $('#tipOwn').addEventListener('input', () => { const a = tipAmount(); $('#tipSum').textContent = a ? '+' + money(a) : ''; });

  // ---------- сервер ----------
  async function api(path, body) {
    const r = await fetch(C.api + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }
  async function syncStatus() {
    if (GO) { if (!$('#sheet').hidden) renderCart(); renderFab(); return; }
    try {
      await scanP;
      const { data } = await api('/api/status?device=' + device + (table ? '&table=' + table : ''));
      inVenue = !!data.inVenue; if (data.scanUntil) { scanUntil = data.scanUntil; store.set('scan', scanUntil); } lockT = data.scanT || 0; store.set('lockT', lockT); if (lockT) { table = String(lockT); save(); }
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
    table = lockOn() ? String(lockT) : $('#table').value; save();
    if (!table) { $('#msg').textContent = t('chooseTable'); $('#table').focus(); return; }
    // запит чека — спершу питаємо спосіб оплати
    if ((type === 'check' || type === 'order_check') && !pay) { pendingType = type; tip = { p: 0, own: false }; kt = { p: 0, own: false }; $('#tipOwn').value = ''; $('#ktipOwn').value = ''; renderTips(); $('#payModal').hidden = false; return; }
    const items = type === 'check' ? [] : cartEntries();
    busy = true; $('#msg').textContent = '…';
    try {
      const { status, data } = await api('/api/order', {
        table: +table, type, pay, device, tip: pay ? tipAmount() : 0, ktip: pay ? ktipAmount() : 0, comment: [items.length && tw ? 'З СОБОЮ' : '', $('#comment').value].filter(Boolean).join(' · ').slice(0, 300),
        items: [...items.map(([k, q]) => { const [id, v] = k.split('|'); return { id, v, q }; }), ...(items.length && packId && packQty() ? [{ id: packId, q: packQty() }] : [])],
      });
      if (status === 403 && data.error === 'wrong_table') { $('#msg').textContent = `📷 ${t('table')} ${data.t}`; return; }
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

  // ---------- 🛵 доставка і самовивіз (?go) ----------
  let goCfg = null, goHist = store.get('goHist', []), reco = {}, gf = { kind: store.get('goKind', 'pick'), name: store.get('goName', ''), phone: store.get('goPhone', ''), addr: store.get('goAddr', ''), ent: store.get('goEnt', ''), when: '', cut: 0, pay: 'cash', change: 0, bonus: 0, bal: 0, useB: false };
  const goSave = () => { store.set('goHist', goHist.slice(-20)); ['kind', 'name', 'phone', 'addr', 'ent'].forEach(k => store.set('go' + k[0].toUpperCase() + k.slice(1), gf[k])); };
  const byUk = n => Object.values(byId).find(it => it.name.uk === n);
  const goFood = () => cartEntries().reduce((s, [k, q]) => s + priceOf(k) * q, 0) + packSum();
  const goFee = () => gf.kind === 'del' && goCfg && !(goCfg.free && goFood() >= goCfg.free) ? goCfg.fee : 0;
  const goBonus = () => gf.useB ? Math.min(gf.bal, Math.floor(goFood() * (goCfg?.bmax || 0) / 100)) : 0;
  const goTotal = () => Math.max(0, goFood() + goFee() - goBonus() - (gf.pr?.sum || 0));
  // 🎁 акції й рівень клієнта — рахує сервер (/api/promo), тут лише показ; при замовленні сервер рахує наново
  let prSeq = 0;
  async function goPromo() { const n = ++prSeq, items = cartEntries().map(([k, q]) => { const [id, v] = k.split('|'); return { id, v, q }; });
    try { const { status, data } = await api('/api/promo', { kind: gf.kind, phone: gf.phone, items }); if (n !== prSeq || status !== 200) return; const was = JSON.stringify(gf.pr || null); gf.pr = data.sum || data.lvl ? data : null; if (JSON.stringify(gf.pr) !== was && !$('#goModal').hidden) { goRead(); goForm(); } } catch {} }
  const GST = { new: ['⏳', 'goStNew'], acc: ['✅', 'goStAcc'], cook: ['🔥', 'goStCook'], ready: ['🍽', 'goStReady'], road: ['🛵', 'goStRoad'], done: ['🤝', 'goStDone'], rej: ['❌', 'goStRej'] };
  async function goInit() {
    $('#callBtn').hidden = true;
    { const a = document.createElement('a'); a.href = window.VARVAR.link('about.html'); a.className = 'lang'; a.style.cssText = 'text-decoration:none;color:inherit;margin-left:auto;margin-right:8px'; a.textContent = '← ' + (menu?.brand?.name || 'VARVAR'); $('.top').insertBefore(a, $('#meBtn')); }
    try { goCfg = (await api('/api/goinfo')).data; } catch {}
    try { reco = (await api('/api/reco')).data || {}; } catch {}
    if (goCfg && !goCfg[gf.kind]) gf.kind = goCfg.del ? 'del' : 'pick';
    const bar = $('#wifiBanner');
    if (goCfg && (!goCfg.on || !goCfg.open)) { bar.hidden = false; bar.textContent = !goCfg.on ? '⛔ ' + t('goOff') : `🕐 ${t('goClosed')} ${goCfg.from}–${goCfg.to}`; }
    if (BOOK) { bar.hidden = false; bar.className = 'wifi-banner go-ok'; bar.textContent = '📅 ' + t('goPreBar'); }
    else if (goCfg) { bar.hidden = false; bar.className = 'wifi-banner go-ok'; bar.textContent = `🥡 ${t('goHello')}${goCfg.del ? ' · 🛵 ' + t('goDel') : ''}`; }
    goPoll(); renderFab();
  }
  function goWhenOpts() {
    if (!goCfg) return [];
    const kn = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(Number), now = { getHours: () => kn[0] % 24, getMinutes: () => kn[1] }, step = 15, start = Math.ceil((now.getHours() * 60 + now.getMinutes() + goCfg.prep) / step) * step, [fh, fm] = goCfg.from.split(':').map(Number), [th, tm] = goCfg.to.split(':').map(Number), a = fh * 60 + fm, b = th * 60 + tm > a ? th * 60 + tm : 24 * 60 + th * 60 + tm;
    const out = []; for (let m = Math.max(start, a + goCfg.prep); m <= b - 15 && out.length < 48; m += step) { const h = Math.floor(m / 60) % 24; out.push(`${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); }
    return out;
  }
  function goCart(rows) {
    $('.table-row').hidden = true;
    const recs = []; for (const [k] of rows) for (const n of reco[byId[k.split('|')[0]]?.name.uk] || []) { const it = byUk(n); if (it && !it.variants && !cart[it.id] && !recs.includes(it)) recs.push(it); }
    const toFree = goCfg && gf.kind === 'del' && goCfg.free ? goCfg.free - goFood() : 0;
    $('#twBox').innerHTML = (recs.length ? `<div class="go-reco"><div class="cl-title">💡 ${t('goReco')}</div><div class="go-chips">${recs.slice(0, 4).map(it => `<button class="go-chip" data-add="${it.id}" data-label="${esc(itemName(it))}">+ ${esc(itemName(it))} · ${it.price}</button>`).join('')}</div></div>` : '')
      + (rows.length && toFree > 0 ? `<div class="go-hint">🛵 ${t('goToFree')} <b>${money(toFree)}</b></div>` : '');
    const act = goHist.filter(o => !['done', 'rej'].includes(o.g) && Date.now() - o.ts < 12 * 3600e3), old = goHist.filter(o => !act.includes(o)).slice(-5).reverse();
    $('#history').innerHTML = (act.length ? `<div class="hist"><div class="hist-title">📦 ${t('goActive')}</div>${act.map(o => `<button class="go-ord" data-go-st="${o.id}"><b>${o.no}</b> · ${GST[o.g || 'new'][0]} ${t(GST[o.g || 'new'][1])}<span>${money(o.sum)}</span></button>`).join('')}</div>` : '')
      + (old.length ? `<div class="hist"><div class="hist-title">🔁 ${t('goMine')}</div>${old.map(o => `<div class="go-old"><span>${o.at} · ${o.items.map(([k, q]) => `${q}× ${esc(byId[k.split('|')[0]] ? labelOf(k) : '…')}`).join(', ')}</span><button class="btn ghost sm" data-go-rep="${o.id}">${t('goRepeat')}</button></div>`).join('')}</div>` : '');
    const ok = rows.length && goCfg?.on && (goCfg.del || goCfg.pick);
    if (BOOK) { $('#actions').innerHTML = `<button class="btn" data-go-pre ${rows.length ? '' : 'disabled'}>📅 ${t('goPreSave')}${rows.length ? ' · ' + money(goFood()) : ''}</button>`; $('#history').innerHTML = ''; return; }
    $('#actions').innerHTML = `<button class="btn" data-go-out ${ok ? '' : 'disabled'}>${t('goCheckout')}${rows.length ? ' · ' + money(goFood()) : ''}</button>`;
  }
  function goForm() {
    const c = goCfg || {}, sum = goFood(), min = c.min && sum < c.min, w = goWhenOpts();
    $('#goBody').innerHTML = `<div class="seg2">${c.pick ? `<button class="${gf.kind === 'pick' ? 'on' : ''}" data-go-k="pick">🥡 ${t('goPick')}</button>` : ''}${c.del ? `<button class="${gf.kind === 'del' ? 'on' : ''}" data-go-k="del">🛵 ${t('goDel')}${c.fee ? `<small>${c.free ? `${money(c.fee)} · ${t('goFreeFrom')} ${money(c.free)}` : money(c.fee)}</small>` : ''}</button>` : ''}</div>
      <input id="gName" placeholder="${t('goName')}" value="${esc(gf.name)}" autocomplete="name">
      <input id="gPhone" type="tel" placeholder="${t('goPhone')}" value="${esc(gf.phone)}" autocomplete="tel" inputmode="tel">
      ${gf.kind === 'del' ? `<input id="gAddr" placeholder="${t('goAddr')}" value="${esc(gf.addr)}" autocomplete="street-address"><input id="gEnt" placeholder="${t('goEnt')}" value="${esc(gf.ent)}">${c.zone ? `<div class="go-note">📍 ${esc(c.zone)}</div>` : ''}` : ''}
      <label class="go-row"><span>🕐 ${t(gf.kind === 'del' ? 'goWhenDel' : 'goWhen')}</span><select id="gWhen">${c.open ? `<option value="">${t('goAsap')} (~${c.prep} ${t('goMin')})</option>` : ''}${w.map(x => `<option ${gf.when === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="go-row"><span>🍴 ${t('goCut')}</span><span class="qty"><button data-go-cut="-1">−</button><b>${gf.cut}</b><button data-go-cut="1">+</button></span></label>
      <div class="go-sub">${t('goPay')}</div>
      <div class="seg2"><button class="${gf.pay === 'cash' ? 'on' : ''}" data-go-p="cash">💵 ${t('goCash')}</button><button class="${gf.pay === 'card' ? 'on' : ''}" data-go-p="card">💳 ${t('goCard')}</button></div>
      ${gf.pay === 'cash' ? `<label class="go-row"><span>💵 ${t('goChange')}</span><select id="gChange">${[0, 200, 500, 1000].map(v => `<option value="${v}" ${gf.change === v ? 'selected' : ''}>${v ? `${t('goFrom')} ${v}` : t('goNoChange')}</option>`).join('')}</select></label>` : ''}
      ${gf.bal > 0 && c.bmax ? `<label class="go-row go-bonus"><span>🎁 ${t('goBonus')} <b>${money(gf.bal)}</b></span><input type="checkbox" id="gUseB" ${gf.useB ? 'checked' : ''}></label>` : c.cash ? `<div class="go-note">🎁 ${t('goCashback')} ${c.cash}%</div>` : ''}
      <div class="go-sum"><div><span>${t('goFood')}</span><b>${money(sum)}</b></div>${goFee() ? `<div><span>🛵 ${t('goDel')}</span><b>${money(goFee())}</b></div>` : gf.kind === 'del' ? `<div><span>🛵 ${t('goDel')}</span><b>0</b></div>` : ''}${(gf.pr?.lines || []).filter(l => l.amt).map(l => `<div><span>${esc(l.n)}</span><b>−${money(l.amt)}</b></div>`).join('')}${goBonus() ? `<div><span>🎁 ${t('goBonusUse')}</span><b>−${money(goBonus())}</b></div>` : ''}<div class="tot"><span>${t('total')}</span><b>${money(goTotal())}</b></div></div>
      ${min ? `<div class="go-err">${t('goMinSum')} ${money(c.min)}</div>` : ''}<div class="msg" id="goMsg"></div>
      <button class="btn" data-go-send ${min ? 'disabled' : ''}>${t('goSend')} · ${money(goTotal())}</button>`;
  }
  const goRead = () => { const v = id => $('#' + id)?.value.trim(); gf.name = v('gName') ?? gf.name; gf.phone = v('gPhone') ?? gf.phone; if ($('#gAddr')) { gf.addr = v('gAddr'); gf.ent = v('gEnt'); } if ($('#gWhen')) gf.when = $('#gWhen').value; if ($('#gChange')) gf.change = +$('#gChange').value; if ($('#gUseB')) gf.useB = $('#gUseB').checked; };
  async function goBal() { const d = gf.phone.replace(/\D/g, ''); if (d.length < 10) return; try { const r = (await api('/api/goinfo?ph=' + encodeURIComponent(gf.phone))).data; const b = r.bal || 0; if (b !== gf.bal) { gf.bal = b; goForm(); } } catch {} }
  async function goSend() {
    goRead(); goSave(); const m = $('#goMsg');
    if (!gf.name || gf.phone.replace(/\D/g, '').length < 10) { m.textContent = t('goNeedContact'); return; }
    if (gf.kind === 'del' && gf.addr.length < 5) { m.textContent = t('goNeedAddr'); return; }
    if (busy) return; busy = true; m.textContent = '…';
    const items = cartEntries();
    try {
      const { status, data } = await api('/api/go', { kind: gf.kind, name: gf.name, phone: gf.phone, addr: gf.addr, ent: gf.ent, when: gf.when, cut: gf.cut, pay: gf.pay, change: gf.change, bonus: goBonus(), comment: $('#comment').value, device, src: qs.get('src') || '',
        items: [...items.map(([k, q]) => { const [id, v] = k.split('|'); return { id, v, q }; }), ...(packId && packQty() ? [{ id: packId, q: packQty() }] : [])] });
      if (status !== 200) { m.textContent = { closed: `${t('goClosed')} ${data.from}–${data.to}`, min: `${t('goMinSum')} ${money(data.min || 0)}`, rate: t('wait'), contact: t('goNeedContact'), addr: t('goNeedAddr'), off: t('goOff') }[data.error] || t('error'); return; }
      goHist.push({ id: data.id, no: data.no, ts: Date.now(), at: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }), sum: data.sum, items: items.map(([k, q]) => [k, q]), g: 'new', eta: Date.now() + data.eta * 60e3 });
      cart = {}; packAdj = 0; gf.useB = false; gf.pr = null; gf.bal = 0; $('#comment').value = ''; save(); goSave();
      $('#goModal').hidden = true; refreshButtons(); renderFab(); renderCart(); goShow(data.id);
    } catch { m.textContent = t('error'); } finally { busy = false; }
  }
  function goShow(id) {
    const o = goHist.find(x => x.id === id); if (!o) return; const g = o.g || 'new', steps = ['new', 'acc', 'cook', 'ready', ...(o.no.startsWith('Д') ? ['road'] : []), 'done'];
    $('#goBody').innerHTML = `<div class="go-big">${GST[g][0]}</div><h3 class="go-no">${t('goOrder')} ${o.no}</h3><p class="go-st">${t(GST[g][1])}</p>
      ${g === 'rej' ? '' : `<div class="go-steps">${steps.map(s => `<i class="${steps.indexOf(s) <= steps.indexOf(g) ? 'on' : ''}" title="${t(GST[s][1])}">${GST[s][0]}</i>`).join('')}</div>`}
      ${o.etaC && g === 'road' ? `<p class="go-st">🛵 ${t('goEtaC')} <b>~${new Date(o.etaC).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })}</b></p>` : ''}${o.eta && !o.etaC && !['done', 'rej'].includes(g) ? `<p class="go-note">${t('goEta')} ~${new Date(o.eta).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })}</p>` : ''}
      ${goCfg?.phone ? `<a class="btn ghost" href="tel:${esc(goCfg.phone.replace(/[^\d+]/g, ''))}">📞 ${esc(goCfg.phone)}</a>` : ''}<button class="btn alt" data-close>${t('goOk')}</button>`;
    ($('#sheet').hidden = true, $('#goModal').hidden = false); $('#goModal').dataset.show = id;
  }
  async function goPoll() {
    const act = goHist.filter(o => !['done', 'rej'].includes(o.g) && Date.now() - o.ts < 12 * 3600e3); if (!act.length) { $('#orderStatus').hidden = true; return; }
    try { const { data } = await api('/api/orders?ids=' + act.map(o => o.id).join(','));
      for (const o of act) { const x = data[o.id]; if (x && x.g && x.g !== o.g) { o.g = x.g; navigator.vibrate?.(80); } if (x?.etaC && x.etaC !== o.etaC) { o.etaC = x.etaC; navigator.vibrate?.(80); } } goSave(); } catch {}
    const last = act[act.length - 1], bar = $('#orderStatus'); bar.hidden = false; bar.className = 'order-status ' + (['ready', 'road', 'done'].includes(last.g) ? 'ok' : 'wait'); bar.textContent = `${last.no} · ${GST[last.g || 'new'][0]} ${t(GST[last.g || 'new'][1])}${last.etaC && last.g === 'road' ? ` · ~${new Date(last.etaC).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' })}` : ''}`; bar.dataset.go = last.id;
    if (!$('#goModal').hidden && $('#goModal').dataset.show) goShow($('#goModal').dataset.show);
    if (!$('#sheet').hidden) renderCart();
  }
  function goClick(el) {
    const d = el.dataset;
    if ('goOut' in d) { goRead(); goForm(); delete $('#goModal').dataset.show; ($('#sheet').hidden = true, $('#goModal').hidden = false); goBal(); goPromo(); return true; }
    if (d.goK) { goRead(); gf.kind = d.goK; goForm(); goPromo(); return true; }
    if (d.goP) { goRead(); gf.pay = d.goP; goForm(); return true; }
    if (d.goCut) { goRead(); gf.cut = Math.max(0, Math.min(20, gf.cut + +d.goCut)); goForm(); return true; }
    if ('goSend' in d) { goSend(); return true; }
    if ('goPre' in d) { (async () => { const items = cartEntries().map(([k, q]) => { const [id, v] = k.split('|'); return { id, v, q }; });
      const { status } = await api('/api/bookpre', { id: BOOK, phone: store.get('bkPhone', store.get('goPhone', '')), items }).catch(() => ({ status: 0 }));
      if (status === 200) { cart = {}; save(); refreshButtons(); renderFab(); $('#msg').textContent = '✅ ' + t('goPreOk'); setTimeout(() => { location.href = window.VARVAR.link('about.html#book'); }, 1500); } else $('#msg').textContent = t('error'); })(); return true; }
    if (d.goSt) { goShow(d.goSt); return true; }
    if (el.id === 'orderStatus' && el.dataset.go) { goShow(el.dataset.go); return true; }
    if (d.goRep) { const o = goHist.find(x => x.id === d.goRep); if (o) { o.items.forEach(([k, q]) => { const it = byId[k.split('|')[0]]; if (it) cart[k] = (cart[k] || 0) + q; }); save(); refreshButtons(); renderFab(); renderCart(); } return true; }
    if (el.id === 'callBtn' || el.id === 'wifiBanner') return true;
    return false;
  }
  document.addEventListener('change', e => { if (!GO) return; if (e.target.id === 'gUseB' || e.target.id === 'gWhen' || e.target.id === 'gChange') { goRead(); goForm(); } });
  document.addEventListener('focusout', e => { if (GO && e.target.id === 'gPhone') { goRead(); goBal(); goPromo(); } });

  // ---------- 👤 кабінет гостя (прямо в меню, без переходу на візитку) — вхід через Telegram-бот закладу ----------
  const gk = (window.VARVAR.pre || 'vv_') + 'gtok', gtok = v => { try { if (v === undefined) return JSON.parse(localStorage.getItem(gk) || '""'); localStorage.setItem(gk, JSON.stringify(v)); } catch { return ''; } };
  const meApi = async (p, body) => { const tk = gtok(), h = tk ? { authorization: 'Bearer ' + tk } : {}; const r = await fetch(C.api + p, body ? { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(body) } : { headers: h }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
  const uah = n => Math.round(n || 0).toLocaleString('uk-UA') + ' ₴';
  async function meOpen() {
    $('#meModal').hidden = false; const b = $('#meBody'); b.innerHTML = '<p class="muted">…</p>';
    if (!gtok()) { try { const pn = JSON.parse(localStorage.getItem(gk + 'n') || 'null'); if (pn && Date.now() - pn.t < 300e3) { const r = await meApi('/api/me/poll?n=' + pn.n).catch(() => null); if (r?.data?.token) { gtok(r.data.token); localStorage.removeItem(gk + 'n'); } } } catch {} } // 📱 iOS міг вивантажити сторінку, поки гість був у Telegram — забираємо вхід тут
    if (gtok()) { const { status, data: d } = await meApi('/api/me').catch(() => ({})); if (status === 200) {
      const dd = x => `${x.slice(8)}.${x.slice(5, 7)}`;
      b.innerHTML = `<p><b>${esc(d.name || '')}</b> <span class="muted">${esc(d.phone.replace(/^380(\d{2})(\d{3})(\d{2})(\d{2})$/, '+380 $1 $2 $3 $4'))}</span></p>
        <div class="me-k"><div><b>${uah(d.bal)}</b><span>🎁 бонуси</span></div><div><b>${d.n}</b><span>візитів</span></div><div><b>${uah(d.sum)}</b><span>витрачено</span></div></div>
        ${d.certs.length ? `<h3>🎟 Сертифікати</h3><div class="me-l">${d.certs.map(c => `<div><b>${esc(c.code)}</b> · ${uah(c.left)} / ${uah(c.sum)}</div>`).join('')}</div>` : ''}
        ${d.books.length ? `<h3>📅 Броні</h3><div class="me-l">${d.books.map(x => `<div><b>${dd(x.date)} ${esc(x.time)}</b> · ${x.people} 👤</div>`).join('')}</div>` : ''}
        <h3>🧾 Історія</h3><div class="me-l">${d.hist.slice(0, 10).map(h => `<div><b>${dd(h.d)} ${esc(h.at)}</b> · ${uah(h.sum)}<br><small class="muted">${h.dishes.map(([n, q]) => `${q}× ${esc(n)}`).join(', ')}</small></div>`).join('') || '<div class="muted">Поки порожньо</div>'}</div>
        <button class="btn ghost" id="meOut" style="margin-top:12px;width:100%">Вийти</button>`; return; }
      if (status === 401) gtok(''); else if (status !== 200) { b.innerHTML = '<p class="muted">⚠️ Немає звʼязку — спробуйте ще раз</p>'; return; } } // вихід лише якщо сесія справді завершилась, а не через зникнення мережі
    b.innerHTML = `<p class="muted">Бонуси, сертифікати й історія замовлень — у вашому кабінеті. Вхід і реєстрація — через Telegram, за номером телефону.</p><button class="btn" id="meTg" style="width:100%">✈️ Увійти через Telegram</button><p class="muted" id="meMsg"></p>`;
  }
  async function meLogin() {
    const { data } = await meApi('/api/me/start').catch(() => ({ data: {} })); if (!data.bot) return ($('#meMsg').textContent = '⚠️ Спробуйте пізніше');
    try { localStorage.setItem(gk + 'n', JSON.stringify({ n: data.nonce, t: Date.now() })); } catch {} window.open(`https://t.me/${data.bot}?start=login_${data.nonce}`, '_blank'); $('#meMsg').textContent = '⏳ Підтвердіть вхід у Telegram і поверніться сюди';
    for (let i = 0; i < 45 && !$('#meModal').hidden; i++) { await new Promise(r => setTimeout(r, 4000)); const r = await meApi('/api/me/poll?n=' + data.nonce).catch(() => null); if (r?.data?.token) { gtok(r.data.token); return meOpen(); } if (r?.data?.error) break; }
  }
  async function meOut() { await meApi('/api/me/logout', {}).catch(() => {}); gtok(''); $('#meModal').hidden = true; }

  // ---------- події ----------
  document.addEventListener('click', e => {
    const el = e.target.closest('button, [data-close], #wifiBanner, #orderStatus');
    if (!el || (el.id !== 'lang' && !el.dataset.lang)) $('#langs').hidden = true;
    if (!el) return;
    if (GO && goClick(el)) return;
    if (el.id === 'callBtn') callWaiter();
    else if (el.id === 'meBtn') meOpen();
    else if (el.id === 'meTg') meLogin();
    else if (el.id === 'meOut') meOut();
    else if ('ai' in el.dataset) aiOpen();
    else if (el.dataset.aiA != null) aiStep(el.dataset.aiA);
    else if (el.dataset.aiPick != null) aiTake(+el.dataset.aiPick);
    else if ('aiAgain' in el.dataset) aiOpen();
    else if (el.dataset.add) change(el.dataset.add, 1);
    else if (el.dataset.pk) { if (packQty() + +el.dataset.pk >= 0) packAdj += +el.dataset.pk; renderCart(); renderFab(); }
    else if ('tw' in el.dataset && !GO) { packAdj = 0; tw = !tw; store.set('tw', tw); renderCart(); renderFab(); }
    else if (el.dataset.inc) change(el.dataset.inc, 1);
    else if (el.dataset.dec) change(el.dataset.dec, -1);
    else if (el.dataset.send) send(el.dataset.send);
    else if (el.dataset.ktip != null) { kt = el.dataset.ktip === 'own' ? { p: 0, own: true } : { p: +el.dataset.ktip, own: false }; renderTips(); if (kt.own) $('#ktipOwn').focus(); }
    else if (el.dataset.tip) { tip = el.dataset.tip === 'own' ? { p: 0, own: true } : { p: +el.dataset.tip, own: false }; renderTips(); if (tip.own) $('#tipOwn').focus(); }
    else if (el.dataset.pay) { $('#payModal').hidden = true; send(pendingType, el.dataset.pay); }
    else if ('close' in el.dataset) { if (el.closest('.modal')) el.closest('.modal').hidden = true; else closeAll(); if ($('#sheet').hidden) document.body.classList.remove('lock'); }
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
    if (window.VVM && (window.__vvM || m.brand?.theme)) VVM.apply(window.__vvM ? window.__vvM.vvMenu : m.brand.theme, window.__vvM?.brand || m.brand); /* 🎨 дизайн меню з кабінету (js/menu-design.js) */
    if (m.brand?.name) { document.title = m.brand.name + ' — меню'; const h = $('.logo'); if (h) h.textContent = m.brand.name; document.querySelectorAll('a.lang[href*="about.html"]').forEach(a => { a.textContent = a.textContent.replace('VARVAR', m.brand.name); }); }
    m.categories.forEach(c => c.items.forEach(it => { byId[it.id] = it; catOf[it.id] = c.id; }));
    packId = (m.categories.find(c => c.id === 'upakuvannia')?.items || [])[0]?.id || null;
    if (GO && qs.get('rep')) { // 🔁 «Повторити» з бота гостей: ?go&rep=id|v*q,…
      cart = {}; qs.get('rep').split(',').forEach(x => { const [k, q] = x.split('*'), [id, v] = k.split('|'), it = byId[id]; if (it && id !== packId && +q > 0 && (v ? it.variants?.some(y => y.v === v) : !it.variants?.length)) cart[k] = (cart[k] || 0) + Math.min(50, +q); });
      save(); history.replaceState(null, '', window.VARVAR.link(location.pathname + '?go'));
    }
    renderMenu(); syncStatus(); renderStatus(); pollOrders(); if (GO) goInit();
  });
})();
