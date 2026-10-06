  function hallHTML() {
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter(e => e.k === 'guest' && e.s === 'new').map(e => e.t));
    const calls = {}; for (const e of S.events) if (e.k === 'call' && e.s === 'new') calls[e.t] = e;
    const bell = t => calls[t] ? `<span class="callbell${Date.now() - calls[t].ts > 60e3 ? ' late' : ''}" title="Кличе офіціанта">🔔</span>` : '';
    const tiles = Array.from({ length: S.n }, (_, i) => i + 1).map(t => {
      const b = S.tables[t];
      const bk = (S.books || []).find(x => x.t === t && x.st === 'ok');
      if (!b) return `<button class="tbl${calls[t] ? ' calling' : ''}${bk ? ' booked' : ''}" data-a="table" data-t="${t}">${bell(t)}<div class="n">${t}</div><div class="st">${bk ? `📅 ${bk.time} · ${esc(bk.name)}` : 'вільний'}</div></button>`;
      const cls = ['busy', b.check ? 'check' : '', pending.has(t) ? 'new' : ''].join(' ');
      const tag = b.check ? `<span class="tag c">🧾 рахунок</span>${b.pay ? `<i class="pay" title="${b.pay === 'card' ? 'карта' : 'готівка'}">${b.pay === 'card' ? '💳' : '💵'}</i>` : ''}` : pending.has(t) ? '<span class="tag g">нове</span>' : '';
      return `<button class="tbl ${cls}${calls[t] ? ' calling' : ''}" data-a="table" data-t="${t}">${bell(t)}${tag}<div class="n">${t}</div><div class="st">${b.orders} замовл.${b.disc ? ` · −${b.disc}%` : ''}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">з ${b.opened ? hhmm(b.opened) : '—'}</div></button>`;
    }).join('');
    const gos = list.filter(b => b.t > 1000 && b.go);
    const strip = !gos.length ? '' : `${goMapBtn(gos)}<div class="go-strip">${gos.map(b => { const g = b.go, late = g.st === 'new' && Date.now() - g.at > 60e3;
      return `<button class="go-t st-${g.st}${pending.has(b.t) ? ' new' : ''}${late ? ' late' : ''}" data-a="table" data-t="${b.t}"><b>${g.kind === 'del' ? '🛵' : '🥡'} ${tn(b.t)}</b><span>${esc(g.name || '')}</span><small>${GOST[g.st] || g.st}${g.when ? ' · на ' + g.when : ''}${goTileInfo(g)}</small><i class="money">${money(b.pay2)}</i></button>`; }).join('')}</div>`;
    return `<div class="head"><h1>Зал</h1>
      ${inboxBtn()}${S.bkNew ? `<button class="btn red bk-blink" data-a="books" title="Нові броні — підтвердіть">📅 ${S.bkNew} нов.</button>` : (S.books || []).length ? `<button class="btn" data-a="books">📅 ${S.books.length}</button>` : `<button class="btn ghost" data-a="books" title="Бронювання">📅</button>`}</div>${strip}<div class="tables">${tiles}</div>`;
  }

  // ---------- стрічка ----------
  const evTitle = e => ({
    guest: `🛎 Стіл ${tn(e.t)} — ${esc((e.kind || 'замовлення').toLowerCase())}`, check: `🧾 Стіл ${tn(e.t)} просить чек${e.pay ? (e.pay === 'card' ? ' · 💳 карта' : ' · 💵 готівка') : ''}${e.tip ? ` · 💝 ${money(e.tip)}` : ''}`,
    waiter: `🧑‍🍳 Стіл ${tn(e.t)} — ${esc(e.by)}${e.src === 'каса' ? ' (каса)' : ''}`, close: `✅ Стіл ${tn(e.t)} закрито — ${money(e.sum)} ${e.pay === 'card' ? '💳' : '💵'}${e.print === false ? ' · без чека' : ''}`,
    shift: esc(e.text), del: `🗑 Стіл ${tn(e.t)} видалено (${money(e.sum)})`, move: `↔️ ${esc(e.text)}`, disc: `% Стіл ${tn(e.t)}: ${esc(e.text)}`, rm: `✏️ Стіл ${tn(e.t)}: ${esc(e.text)}`, pre: `🖨 Пречек стіл ${tn(e.t)}`, ready: e.part ? `🍽 Стіл ${tn(e.t)} — страва готова, забирайте` : `🍽 Стіл ${tn(e.t)} — ВСЕ ГОТОВО, забирайте!${e.mins != null ? ` <small>(${e.mins} хв)</small>` : ''}`, cooking: `🔥 Стіл ${tn(e.t)} — кухня готує`, kmsg: `👨‍🍳 Кухня → стіл ${tn(e.t)}: ${esc(e.text)}`, call: `🔔🔔 Стіл ${tn(e.t)} кличе офіціанта`, noscan: `🚨📵🚫 СТІЛ ${e.t} — НЕ МОЖЕ ЗАМОВИТИ 🚫📵🚨<br><small>Гість не відсканував QR (або минула година). Підійдіть: 📷 нехай відсканує QR на столі 👆</small>`,
    go: esc(e.text), book: esc(e.text), cert: esc(e.text), gchat: esc(e.text), att: `🟢 ${esc(e.n)} на зміні${e.late ? ` · ⏰ запізнення ${e.late} хв` : ''}`, swap: esc(e.text),
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    setHTML($('#events'), S.events.length ? [...S.events].reverse().map(e => {
      const add = e.prev?.length && e.lines?.length; // дозамовлення — яскраво, а що вже було на столі — сіро нижче
      const rdy = e.k === 'ready' && e.text ? `<div class="lines">${esc(e.text)}</div>` : '';
      const lines = rdy || (e.lines?.length ? `${add ? '<div class="addtag">➕ ДОЗАМОВЛЕННЯ</div>' : ''}<div class="lines${add ? ' add' : ''}">${e.lines.map(esc).join('\n')}</div>` : '');
      const by = e.by && !['waiter'].includes(e.k) ? ` · ${esc(e.by)}` : '';
      const zb = e.k === 'att' ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || '')}</span>` : e.s === 'rej' ? `<span class="bad">❌ ${esc(e.accBy || '')}</span>` : isAdmin() ? `<button class="btn sm green" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="o">✅ Підтвердити</button>${e.late && S.cfg?.lateFine ? `<button class="btn sm" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="f">✅ + штраф</button>` : ''}<button class="btn sm red" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="n">❌</button>` : '<span class="muted">чекає підтвердження</span>'}</div>`
        : e.k === 'swap' && !e.old ? (e.s === 'ask' && e.n === S.me?.name ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="agree">Погоджуюсь</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">Ні</button></div>` : e.s === 'agreed' && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="ok">✅ Підтвердити обмін</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">❌</button></div>` : '') : '';
      const sb = e.k === 'book' && e.s === 'new' ? `<div class="act"><button class="btn sm green" data-a="bkSet" data-id="${e.bid}" data-s="ok">✅ Підтвердити</button><button class="btn sm red" data-a="bkSet" data-id="${e.bid}" data-s="no">❌</button><button class="btn sm" data-a="books">📅 Усі броні</button></div>`
        : e.k === 'cert' && e.s === 'new' && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="certPay" data-c="${e.code}" data-h="cash">💵 Оплачено</button><button class="btn sm" data-a="certPay" data-c="${e.code}" data-h="card">💳</button><button class="btn sm red" data-a="certPay" data-c="${e.code}" data-h="no">❌</button></div>`
        : e.k === 'gchat' && !e.out ? `<div class="act"><button class="btn sm primary" data-a="gbThread" data-ph="${e.ph}">↩️ Відповісти</button></div>`
        : (e.k === 'book' || e.k === 'cert') && e.s !== 'new' ? `<div class="act"><span class="muted">${e.s === 'rej' ? '❌' : '✅'} ${esc(e.accBy || '')}</span></div>` : '';
      const btns = isCour() ? '' : sb || zb || (e.k === 'noscan' ? `<div class="act"><button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${tn(e.t)}</button></div>` : e.k === 'guest' || e.k === 'check' || e.k === 'call'
        ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || 'прийнято')}</span>` : e.s === 'rej' ? `<span style="color:var(--red,#ff453a)">❌ відхилено · ${esc(e.accBy || '')}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button>${e.k === 'guest' ? `<button class="btn sm red" data-a="reject" data-oid="${e.oid}">❌ Відхилити</button>` : ''}`}<button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${tn(e.t)}</button></div>` : '');
      const fresh = S.shown.size && !S.shown.has(e.id) ? ' fresh' : '';
      return `<div class="ev ${e.k}${e.k === 'call' && e.s === 'new' && Date.now() - e.ts > 60e3 ? ' late' : ''}${e.s === 'acc' || e.s === 'rej' ? ' acc' : ''}${e.s === 'rej' ? ' rej' : ''}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}${e.sum && ['guest', 'waiter'].includes(e.k) ? `<div class="muted">Сума ${money(e.sum)}</div>` : ''}${btns}</div>`;
    }).join('') : '<div class="muted" style="padding:12px">Сьогодні подій ще немає</div>');
    S.events.forEach(e => S.shown.add(e.id));
  }

  // ---------- стіл (лист) ----------
  const cartOf = t => (S.carts[t] ||= {});
  // «з собою»: 1 упаковка на кожну страву з кухні (як на сайті гостя і в боті)
  const FOOD = ['minimax', 'pasta', 'burgers', 'salads', 'snacks', 'soups', 'pans'];
  const packItem = () => S.menu?.categories.find(c => c.id === 'upakuvannia')?.items[0];
  const packQ = t => { if (!S.tw[t] || !S.menu) return 0; const food = new Set(S.menu.categories.filter(c => FOOD.includes(c.id)).flatMap(c => c.items.map(i => i.id))); return Math.max(0, Object.values(cartOf(t)).filter(x => food.has(x.id)).reduce((s, x) => s + x.q, 0) + (S.packAdj[t] || 0)); };
  const saveCarts = () => store.set('carts', S.carts);
  const itemsAll = () => S.menu ? S.menu.categories.flatMap(c => c.items) : [];
  function openTable(t) {
    S.open = +t; S.mobileMenu = !S.tables[t]; S.q = ''; if (!S.menu) loadMenu();
    // каркас створюється один раз — далі оновлюються лише частини (без блимання і повторної анімації)
    $('#layer').innerHTML = `<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet"><div class="sheet-head" id="shHead"></div><div id="shPend"></div>
      <div class="sheet-body" id="shBody"><div class="bill" id="shBill"></div><div class="menu-pane"><div id="shNav"></div><div class="items" id="shItems"></div></div></div></div>`;
    renderSheet();
  }
  function closeSheet() { S.open = 0; $('#layer').innerHTML = ''; }
  // групи меню: ⭐ Обрані · 🍳 Кухня · 🍹 Бар · 💨 Кальян
  const grpList = () => [{ id: 'fav', name: '⭐ Обрані' }, ...S.groups];
  const curGrp = () => { const g = S.grp || (S.fav.length ? 'fav' : 'kitchen'); if (g === 'fav' || !S.groups?.length || S.groups.find(x => x.id === g)?.cats?.length) return g; return S.groups.find(x => x.cats?.length)?.id || g; }; // порожня група (новий заклад) — перша, де є страви
  const grpCats = g => { const gg = S.groups.find(x => x.id === g); return gg ? S.menu.categories.filter(c => gg.cats.includes(c.id)) : []; };
  function menuItems() {
    const q = S.q.trim().toLowerCase();
    if (q) return itemsAll().filter(i => i.name.uk.toLowerCase().includes(q) || (i.name.en || '').toLowerCase().includes(q));
    const g = curGrp();
    if (g === 'fav') return S.fav.map(id => itemsAll().find(i => i.id === id)).filter(Boolean);
    const cats = grpCats(g), c = cats.find(x => x.id === S.cat) || cats[0];
    return c ? c.items : [];
  }
  function renderSheet() {
    const t = S.open; if (!t || !$('#shHead')) return;
    const b = S.tables[t], cart = cartOf(t), cartRows = Object.entries(cart);
    const pk = packItem(), pq = pk ? packQ(t) : 0;
    const cartSum = cartRows.reduce((s, [, x]) => s + x.price * x.q, 0) + (pq ? pq * pk.price : 0);
    const G = b?.go || (t === -1 ? S.goDraft : null);
    setHTML($('#shHead'), `<h2>${t === -1 ? `${G.kind === 'del' ? '🛵' : '🥡'} Нове: ${esc(G.name || '')}` : G ? `${G.kind === 'del' ? '🛵' : '🥡'} ${tn(t)}` : `Стіл ${tn(t)}`}</h2>${b ? `<span class="total money">${money(b.pay2)}</span>${b.disc ? `<span class="chip">−${b.disc}%</span>` : ''}${b.promo?.lvn ? `<span class="chip" data-a="loyCliT">${esc(b.promo.lvn)}</span>` : ''}${b.tip ? `<span class="chip tipc">💝 ${money(b.tip)}</span>` : ''}<span class="muted hide-s">з ${b.opened ? hhmm(b.opened) : '—'} · ${b.orders} замовл.</span>${b.check ? '<span class="chip" style="background:var(--orange);color:#000">🧾 чек</span>' : ''}` : '<span class="muted">новий</span>'}
        <span class="sp"></span><div class="tabs2"><button class="${S.mobileMenu ? '' : 'on'}" data-a="tab" data-m="0">Рахунок${cartRows.length ? ` (${cartRows.reduce((s, [, x]) => s + x.q, 0)})` : ''}</button><button class="${S.mobileMenu ? 'on' : ''}" data-a="tab" data-m="1">Меню</button></div>
        <button class="close-x" data-a="closeSheet">✕</button>`);
    const pend = S.events.filter(e => e.k === 'guest' && e.s === 'new' && +e.t === t);
    setHTML($('#shPend'), (G ? goBlock(t, G, b) : '') + pend.map(e => `<div class="pend"><div><b>🛎 Нове замовлення гостя · ${e.at}</b><div class="lines">${(e.lines || []).map(esc).join('<br>')}</div>${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}</div><button class="btn green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button></div>`).join(''));
    $('#shBody').className = 'sheet-body' + (S.mobileMenu ? ' show-menu' : '');
    // рахунок
    const billRows = b ? b.items.map(it => `<div class="row"><div class="nm">${esc(it.name)}<small>${it.q} × ${Math.round(it.sum / it.q)} ₴</small></div><b class="money">${it.sum}</b><button class="rb minus" data-a="rm" data-name="${esc(it.name)}" title="Прибрати 1">−</button></div>`).join('') : '<div class="muted" style="padding:8px 4px">Рахунок порожній — оберіть страви в меню</div>';
    const discRow = b?.disc ? `<div class="row"><div class="nm">Знижка ${b.disc}%</div><b class="money" style="color:var(--green)">−${b.discSum != null ? Math.min(b.total, b.discSum) : Math.round(b.total * b.disc / 100)}</b><button class="rb minus" data-a="discSet" data-p="0">×</button></div>` : '';
    // 🎁 акції й рівень клієнта (рахує сервер, promo.js); адмін може вимкнути на цьому столі
    const promoRow = b?.promoOff ? `<div class="row"><div class="nm muted">🎁 Акції на столі вимкнено</div>${isAdmin() ? '<button class="rb plus" data-a="loyOff" data-off="0" title="Повернути">↺</button>' : ''}</div>` : (b?.promo?.lines || []).filter(l => l.amt || !l.info).map((l, i) => `<div class="row"><div class="nm">${esc(l.n)}</div><b class="money" style="color:var(--green)">${l.amt ? '−' + l.amt : ''}</b>${isAdmin() && i === 0 ? '<button class="rb minus" data-a="loyOff" data-off="1" title="Без акцій">×</button>' : ''}</div>`).join('');
    const bonRow = b?.bonus ? `<div class="row"><div class="nm">${b.cert ? `🎟 Сертифікат ${esc(b.cert.code)}${b.bonus > b.cert.sum ? ' + 🎁 бонуси' : ''}` : '🎁 Бонуси'}</div><b class="money" style="color:var(--green)">−${b.bonus}</b><button class="rb minus" data-a="cliBon0">×</button></div>` : '';
    const tipRow = b?.tip ? `<div class="row"><div class="nm">💝 Чайові<small>входять у виручку</small></div><b class="money" style="color:#ff7aa8">+${b.tip}</b>${isAdmin() ? '<button class="rb minus" data-a="tipSet" data-v="0">×</button>' : ''}</div>` : '';
    const comments = b ? b.log.filter(o => o.comment).map(o => `<div class="muted" style="padding:2px 6px">💬 ${esc(o.comment)}</div>`).join('') : '';
    const cartHTML = cartRows.length ? `<div class="cart"><h3>Нове замовлення</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} ₴</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">−</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join('')}${pq ? `<div class="row auto"><div class="nm">🥡 ${esc(pk.name.uk)}<small>${pk.price} ₴ × ${pq}${S.packAdj[t] ? '' : ' · автоматично'}</small></div><button class="rb minus" data-a="pk" data-d="-1">−</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ''}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="💬 Коментар для кухні" value="${esc(S.coms[t] || '')}"><button class="btn sm ${S.tw[t] ? 'primary' : 'ghost'}" data-a="tw">🥡 З собою</button><button class="btn sm ${S.ur[t] ? 'red' : 'ghost'}" data-a="ur">⚡ Терміново</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">✕</button><button class="btn primary" data-a="send">Відправити · ${money(cartSum)}</button></div></div>` : '';
    const actions = b && !isCook() ? `<div class="actions"><button class="btn" data-a="pre">🖨 Пречек</button><button class="btn" data-a="disc">% Знижка</button>
      <button class="btn" data-a="move">↔️ Перенести</button><button class="btn" data-a="split">✂️ Розділити</button><button class="btn" data-a="bonCert">🎁 Бонуси · 🎟 Сертифікат</button>${isAdmin() ? '<button class="btn red" data-a="delTable">🗑 Видалити</button>' : '<button class="btn" data-a="mobileMenu">➕ Додати</button>'}
      <button class="btn green wide" data-a="closeT">💰 Закрити рахунок · ${money(b.pay2)}</button></div>` : '';
    const keepBill = $('#shBill .scroll')?.scrollTop, focusCom = document.activeElement?.id === 'cartCom';
    setHTML($('#shBill'), `<div class="scroll"><h3>Рахунок</h3>${billRows}${discRow}${promoRow}${bonRow}${tipRow}${comments}</div>${cartHTML}${actions}`);
    if (keepBill) $('#shBill .scroll').scrollTop = keepBill;
    if (focusCom) { const s = $('#cartCom'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    // меню: групи → категорії → страви (кількість у кошику малюється окремо, щоб фото не перемальовувались)
    if (!S.menu) { setHTML($('#shItems'), '<div class="muted" style="padding:20px">Завантаження меню…</div>'); return; }
    const g = curGrp(), q = S.q.trim(), cats = g === 'fav' ? [] : grpCats(g), cur = (cats.find(x => x.id === S.cat) || cats[0] || {}).id;
    const focusSearch = document.activeElement?.id === 'search';
    setHTML($('#shNav'), `<div class="seg">${grpList().map(x => `<button class="${!q && x.id === g ? 'on' : ''}" data-a="grp" data-g="${x.id}">${esc(x.name)}</button>`).join('')}</div>
      ${cats.length > 1 && !q ? `<div class="cats">${cats.map(c => `<button class="chip ${c.id === cur ? 'on' : ''}" data-a="cat" data-c="${c.id}">${esc(c.name.uk)}</button>`).join('')}</div>` : ''}
      <div class="srow"><input class="search" id="search" placeholder="🔎 Пошук страви" value="${esc(S.q)}"><button class="btn sm ghost" data-a="photos" title="Фото">${S.photos ? '🖼' : '📝'}</button></div>`);
    if (focusSearch) { const s = $('#search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    const items = menuItems();
    $('#shItems').classList.toggle('nophoto', !S.photos);
    setHTML($('#shItems'), items.map(it => `<div class="item ${it.hidden ? 'off' : ''}" data-a="add" data-id="${it.id}" role="button"><span class="cnt" data-cnt="${it.id}" hidden></span>${S.photos && it.img ? `<img src="${esc(it.img)}" alt="" decoding="async">` : ''}<span class="nm">${esc(it.name.uk)}</span>${it.size && !it.variants ? `<span class="muted sz">${esc(it.size)}</span>` : ''}<span class="pr">${it.hidden ? '⛔ немає' : it.variants ? it.variants.map(v => v.p).join(' / ') + ' ₴' : it.price + ' ₴'}</span><span class="star ${S.fav.includes(it.id) ? 'on' : ''}" data-a="fav" data-id="${it.id}" title="Обрані">${S.fav.includes(it.id) ? '★' : '☆'}</span></div>`).join('')
      || `<div class="muted" style="padding:10px">${g === 'fav' && !q ? 'Обраних ще немає — натисніть ☆ на страві, щоб додати' : 'Нічого не знайдено'}</div>`);
    paintCounts();
  }
  function paintCounts() {
    const cart = cartOf(S.open), n = {};
    Object.entries(cart).forEach(([k, x]) => { const id = k.split('|')[0]; n[id] = (n[id] || 0) + x.q; });
    document.querySelectorAll('[data-cnt]').forEach(el => { const v = n[el.dataset.cnt] || 0; el.hidden = !v; el.textContent = v; });
  }
  async function addItem(id) {
    const wasKb = searching();
    const it = itemsAll().find(i => i.id === id); if (!it) return;
    if (it.hidden) return toast('⛔ ' + it.name.uk + ' — у стоп-листі');
    let v = null;
    if (it.variants) {
      v = await choose(it.name.uk, 'Оберіть розмір', it.variants.map(x => ({ label: `${x.v} ${it.size || ''} · ${x.p} ₴`, val: x.v })));
      if (v == null) { if (wasKb) $('#search')?.focus(); return; }
    }
    const vv = it.variants?.find(x => x.v === v);
    const key = it.id + (v ? '|' + v : ''), cart = cartOf(S.open);
    cart[key] ||= { id: it.id, v, name: it.name.uk + (vv ? ` ${vv.v} ${it.size || ''}`.trimEnd() : ''), price: vv ? vv.p : it.price, q: 0 };
    const keepKb = wasKb || searching(); cart[key].q++; saveCarts();
    if (S.q) { S.q = ''; const se = $('#search'); if (se) se.value = ''; } // знайшли й додали — пошук очищується, можна одразу писати нове
    renderSheet(); if (keepKb && !searching()) $('#search')?.focus();
  }
  async function sendCart() {
    const t = S.open, cart = cartOf(t), pk = packItem(), pq = pk ? packQ(t) : 0, items = [...Object.values(cart).map(x => ({ id: x.id, v: x.v, q: x.q })), ...(pq ? [{ id: pk.id, q: pq }] : [])];
    if (!items.length) return;
    const btn = document.querySelector('[data-a="send"]'); if (btn) btn.disabled = true;
    const r = await act('order', { t: t === -1 ? 0 : t, ...(t === -1 ? { go: S.goDraft } : {}), items, urgent: !!S.ur[t], comment: [S.tw[t] && t !== -1 ? 'З СОБОЮ' : '', S.coms[t] || ''].filter(Boolean).join(' · ') });
    if (r && t === -1) { S.carts[-1] = {}; S.coms[-1] = ''; saveCarts(); S.goDraft = null; S.mobileMenu = false; toast(`🛵 ${tn(r.t)}: відправлено на кухню`); await loadState().catch(() => {}); openTable(r.t); return; }
    if (r) { S.carts[t] = {}; S.coms[t] = ''; S.tw[t] = false; S.ur[t] = false; S.packAdj[t] = 0; saveCarts(); S.mobileMenu = false; toast(r.queued ? `📴 Стіл ${tn(t)}: немає зв'язку — замовлення збережено, кухня отримає, щойно з'явиться інтернет` : `🖨 Стіл ${tn(t)}: відправлено на кухню`); if (!r.queued) await loadState().catch(() => {}); }
    else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const v = await choose(`Закрити стіл ${tn(t)}`, `До сплати ${money(b.pay2)}${b.tip ? ` + 💝 чайові ${money(b.tip)} = ${money(b.pay2 + b.tip)}` : ''}${b.pay ? ` · гість хоче ${b.pay === 'card' ? '💳 карткою' : '💵 готівкою'}` : ''}`, [
      { label: '💵 Готівка + 🖨 чек', val: 'cash:1', cls: 'green' }, { label: '💳 Карта + 🖨 чек', val: 'card:1', cls: 'blue' },
      { label: '💵 Готівка, без чека', val: 'cash:0' }, { label: '💳 Карта, без чека', val: 'card:0' }]);
    if (!v) return;
    const [pay, pr] = v.split(':');
    const r = await act('close', { t, pay, print: pr === '1' });
    if (r?.queued) { toast(`📴 Стіл ${tn(t)}: немає зв'язку — закриття в черзі, відправимо самі`); closeSheet(); return; }
    if (r?.r) { toast(`✅ Стіл ${tn(t)} закрито · ${money(r.r.sum)}`); closeSheet(); loadState().catch(() => {}); }
  }
  // причина скасування — обовʼязкова, видно у звітах і в закритому рахунку
  const VOID_R = ['Гість передумав', 'Помилка офіціанта', 'Довго чекали', 'Не сподобалось', 'Немає продукту', 'Брак / зіпсовано'];
  async function voidReason(title) {
    const v = await choose(title, '❓ Чому? Причину побачить адміністратор у звітах', [...VOID_R.map(r => ({ label: r, val: r })), { label: '✏️ Своя причина', val: 'own' }]);
    if (v !== 'own') return v || null;
    return await ask('Причина скасування', 'Напр.: гість пролив, замінили на іншу');
  }
  async function discFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const dmax = S.cfg?.discMax ?? 20, max = isAdmin() ? 100 : dmax; // офіціант — до ліміту з налаштувань, адмін — будь-яка
    const v = await choose(`Знижка — стіл ${tn(t)}`, `Сума ${money(b.total)}${b.disc ? ` · зараз ${b.disc}%` : ''}${isAdmin() ? '' : ` · офіціант — до ${dmax}%`}`, [...[5, 10, 15, 20, 25, 30, 50].filter(p => p <= max).map(p => ({ label: `${p}%  →  ${money(b.total - Math.round(b.total * p / 100))}`, val: String(p) })), { label: '✏️ Свій відсоток', val: 'own' }, { label: 'Без знижки', val: '0', cls: 'red' }]);
    if (v == null) return;
    let p = v;
    if (v === 'own') { p = await ask('Свій відсоток знижки', `Число від 0 до ${max}`, 'number'); if (p == null) return; if (+p > max) return toast(`⛔ Офіціант може дати знижку до ${max}%`); }
    await act('discount', { t, pct: +p }, +p ? `% Знижка ${p}%` : 'Знижку прибрано');
  }
  async function moveFlow() {
    const t = S.open;
    const to = await pickTable(`Перенести стіл ${tn(t)}`, 'На зайнятий стіл (жовтий) — рахунки обʼєднаються', t);
    if (!to) return;
    const r = await act('move', { t, to }, '');
    if (r?.r) { toast(r.r.merged ? `🔗 Обʼєднано зі столом ${tn(to)}` : `↔️ Перенесено на стіл ${tn(to)}`); S.carts[to] = { ...(S.carts[to] || {}), ...cartOf(t) }; S.carts[t] = {}; saveCarts(); S.open = to; await loadState().catch(() => {}); }
  }

  // ✂️ розділити рахунок: обрати позиції й кількість → стіл, куди перенести
  function splitRender() {
    const { items, q } = S.spl, sum = items.reduce((a, it, i) => a + Math.round(it.sum / it.q) * (q[i] || 0), 0);
    const box = $('#splBox'); if (!box) return;
    box.innerHTML = items.map((it, i) => `<div class="row"><div class="nm">${esc(it.name)}<small>на столі ${it.q} шт · ${Math.round(it.sum / it.q)} ₴</small></div><button class="rb minus" data-a="spq" data-i="${i}" data-d="-1">−</button><span class="q">${q[i] || 0}</span><button class="rb plus" data-a="spq" data-i="${i}" data-d="1">+</button></div>`).join('')
      + `<div class="row"><div class="nm"><b>Новий рахунок</b></div><b class="money">${money(sum)}</b></div>`;
  }
  async function splitFlow() {
    const t = S.open, b = S.tables[t]; if (!b?.items?.length) return toast("Стіл порожній");
    S.spl = { items: b.items, q: {} };
    const pm = modal({ title: `✂️ Розділити стіл ${tn(t)}`, text: 'Оберіть, що піде в окремий рахунок', body: '<div class="rows" id="splBox"></div>', buttons: [{ label: 'Далі → обрати стіл', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    splitRender(); const v = await pm;
    const sel = S.spl.items.map((it, i) => ({ name: it.name, q: S.spl.q[i] || 0 })).filter(x => x.q > 0); closeModal();
    if (!v) return; if (!sel.length) return toast('Нічого не обрано');
    const to = await pickTable(`✂️ Куди перенести (${sel.reduce((a, x) => a + x.q, 0)} поз.)`, 'Вільний стіл — новий рахунок; зайнятий (жовтий) — позиції додадуться до нього', t);
    if (!to) return;
    const r = await act('split', { t, to, items: sel }, '');
    if (r?.r) { toast(`✂️ Перенесено на стіл ${tn(to)} · ${money(r.r.sum)}`); await loadState().catch(() => {}); }
  }

  function hallGrid(m) {
    const w = m.clientWidth || innerWidth, h = Math.max(200, (m.clientHeight || innerHeight) - 90 - (Object.keys(S.tables).some(t => t > 1000) ? 74 : 0)), n = S.n; // 74 — ряд доставок
    let best = [1, n], score = 1e9;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), empty = c * r - n, ratio = (w / c) / (h / r);
      const sc = empty * 3 + Math.abs(Math.log(ratio / 1.15));
      if (sc < score) { score = sc; best = [c, r]; }
    }
    return best;
  }
  const payL = x => x.card ? '💳 карта' : '💵 готівка';
  function closedHTML() {
    const l = S.data.closed; if (!l) return '<div class="head"><h1>Закриті</h1></div><div class="muted">Завантаження…</div>';
    const isToday = !S.data.cday || S.data.cday === S.data.ctoday, dTitle = isToday ? 'сьогодні' : S.data.cday.split('-').reverse().join('.');
    const nav = `<button class="btn sm" data-a="cDay" data-v="-1">◀</button>${isToday ? '' : '<button class="btn sm" data-a="cDay" data-v="1">▶</button><button class="btn sm" data-a="cDay" data-v="0">Сьогодні</button>'}`;
    const gone = x => x.del || x.rm, ok = l.filter(x => !gone(x));
    return `<div class="head"><h1>Закриті ${dTitle}</h1>${nav}<div class="stat">Рахунків<b>${ok.length}</b></div><div class="stat">Разом<b class="money">${money(ok.reduce((s, x) => s + x.sum, 0))}</b></div>
      <div class="stat">💵<b class="money">${money(ok.reduce((s, x) => s + (x.cash ?? x.sum), 0))}</b></div><div class="stat">💳<b class="money">${money(ok.reduce((s, x) => s + (x.card || 0), 0))}</b></div></div>
      <div class="cards">${[...l].reverse().map((x, i) => { const ref = x.id || (l.length - 1 - i); return `<div class="card" style="${gone(x) ? 'opacity:.45' : ''}"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <h3 style="margin:0;flex:1">${x.at} · Стіл ${tn(x.t)} · <span class="money">${money(x.sum)}</span> ${x.reopen ? '↩️ відкрито знову' : x.restored ? '↩️ стіл відновлено' : x.del ? '🗑 стіл видалено' : x.rm ? '🧹 знято з виручки' : payL(x)}${x.disc ? ` · знижка ${x.disc}%` : ''}</h3><span class="muted">${esc(x.by || '')}</span>
        ${!gone(x) && x.dishes?.length ? `<button class="btn sm" data-a="cPrint" data-ref="${ref}">🖨 Чек</button>` : ''}${!gone(x) && isAdmin() ? `<button class="btn sm" data-a="cEdit" data-ref="${ref}" data-d="${S.data.cday || ''}">✏️ Відкрити</button>` : ''}${!gone(x) && isAdmin() ? `<button class="btn sm red" data-a="cDel" data-ref="${ref}">🗑 З виручки</button>` : ''}
        ${isAdmin() && !x.del && !x.reopen && x.dishes?.length ? `<button class="btn sm" data-a="cReopen" data-ref="${ref}">↩️ Відкрити знову</button>` : ''}
        ${isAdmin() && x.rm && !x.reopen && !x.del ? `<button class="btn sm green" data-a="cBack" data-ref="${ref}">↩️ У виручку</button>` : ''}
        ${isAdmin() && x.del && !x.restored && (x.dishes?.length || x.voids?.length) ? `<button class="btn sm green" data-a="tBack" data-ref="${ref}">↩️ Відновити стіл</button>` : ''}</div>
        ${x.dishes?.length ? `<div class="muted" style="margin-top:8px">${x.dishes.map(([n, q, s]) => `${q}× ${esc(n)} — ${s}`).join(' · ')}</div>` : ''}${x.tip ? `<div class="muted" style="margin-top:4px">💝 в т.ч. чайові ${money(x.tip)}</div>` : ''}${x.edits?.length ? `<div class="muted" style="margin-top:4px;font-size:12px">✏️ змінено ${x.edits.length}× · ${esc(x.edits[x.edits.length - 1].by)} ${x.edits[x.edits.length - 1].at}</div>` : ''}
        ${x.voids?.length ? `<div class="voids">🚫 Скасовано:${x.voids.map(v => `<div>${v.at} · −${money(v.sum)} ${esc(v.name)} — <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join('')}</div>` : ''}</div>`; }).join('') || `<div class="muted">${isToday ? 'Сьогодні закритих рахунків ще немає' : 'Цього дня закритих рахунків немає'}</div>`}</div>${(S.data.cvoids || []).length ? `<div class="card"><h3>🚫 Скасовані страви ${dTitle} <span class="muted">· ${S.data.cvoids.length}</span></h3>${[...S.data.cvoids].reverse().map(v => `<div class="kv"><span>${v.at} · стіл ${tn(v.t)} · <b>${esc(v.name)}</b> — <i>${esc(v.reason || '')}</i> <span class="muted">(${esc(v.by || '')})</span></span><span class="kv-r"><b class="money">${money(v.sum)}</b>${isToday && isAdmin() ? `<button class="btn sm green" data-a="vBack" data-ts="${v.ts}">↩️ На стіл</button>` : ''}</span></div>`).join('')}</div>` : ''}`;
  }
