  function hallHTML() {
    const list = Object.values(S.tables), sum = list.reduce((s, b) => s + b.pay2, 0);
    const pending = new Set(S.events.filter(e => e.k === 'guest' && e.s === 'new').map(e => e.t));
    const calls = {}; for (const e of S.events) if (e.k === 'call' && e.s === 'new') calls[e.t] = e;
    const bell = t => calls[t] ? `<span class="callbell${Date.now() - calls[t].ts > 60e3 ? ' late' : ''}" title="Кличе офіціанта">🔔</span>` : '';
    const V = hallViews(), cur = V.find(v => v.id === S.hall) || V[0], go = cur.go, hot = t => pending.has(t) || calls[t] || S.tables[t]?.check || S.tables[t]?.pwait;
    const rng = go ? [] : hallRng(cur, calls);
    const map = !go && S.hm === 'map', all = map ? Array.from({ length: Math.max(0, cur.to - cur.from + 1) }, (_, i) => cur.from + i) : rng, inF = new Set(rng);
    const tiles = map ? '' : all.map(t => {
      const b = S.tables[t], at = map ? ` style="left:${mp[t][0]}%;top:${mp[t][1]}%"${S.mapEd ? ` data-mt="${t}"` : ''}` : '', dim = map && !inF.has(t) ? ' dim' : '';
      const bk = (S.books || []).find(x => x.t === t && x.st === 'ok');
      if (!b) return `<button${at} class="tbl${dim}${pending.has(t) ? ' new' : ''}${calls[t] ? ' calling' : ''}${bk ? ' booked' : ''}" data-a="table" data-t="${t}">${bell(t)}${pending.has(t) ? '<span class="tag g">нове</span>' : ''}<div class="n">${t}</div><div class="st">${pending.has(t) ? '🛎 замовлення — підтвердіть' : bk ? `📅 ${bk.time} · ${esc(bk.name)}` : 'вільний'}</div></button>`; // 🛎 гість замовив на вільний стіл — теж блимає
      const due = b.paid ? Math.max(0, b.pay2 - (b.paid.net || 0)) : 0, cls = ['busy', b.check ? 'check' : '', pending.has(t) || b.pwait ? 'new' : '', b.pwait ? 'pw' : ''].join(' '); /* 💳 оплачено з QR — червона, доки не підтвердять */
      const tag = b.pwait ? '<span class="tag c" title="оплачено онлайн">🌐</span>' : b.check ? `<span class="tag c">🧾 рахунок</span>${b.pay ? `<i class="pay" title="${b.pay === 'online' ? 'оплачено онлайн' : b.pay === 'card' ? 'карта' : 'готівка'}">${b.pay === 'online' ? '🌐' : b.pay === 'card' ? '💳' : '💵'}</i>` : ''}` : pending.has(t) ? '<span class="tag g">нове</span>' : '';
      return `<button${at} class="tbl${dim} ${cls}${calls[t] ? ' calling' : ''}" data-a="table" data-t="${t}">${bell(t)}${tag}<div class="n">${t}</div><div class="st">${b.pwait ? (due ? `оплачено · доплата ${money(due)}` : 'оплачено — підтвердіть') : `${b.orders} замовл.${b.disc ? ` · −${b.disc}%` : ''}`}</div><div class="sum money">${money(b.pay2)}</div><div class="tm">з ${b.opened ? hhmm(b.opened) : '—'}</div></button>`;
    }).join('');
    const gos = list.filter(b => b.t > 1000 && b.go);
    const goTileHTML = b => { const g = b.go, late = g.st === 'new' && Date.now() - g.at > 60e3;
      return `<button class="go-t st-${g.st}${pending.has(b.t) ? ' new' : ''}${late ? ' late' : ''}" data-a="table" data-t="${b.t}"><b>${g.kind === 'del' ? '🛵' : '🥡'} ${tn(b.t)}</b><span>${esc(g.name || '')}</span><small>${GOST[g.st] || g.st}${g.when ? ' · на ' + g.when : ''}${goTileInfo(g)}</small><i class="money">${money(b.pay2)}</i></button>`; };
    const strip = !gos.length ? '' : `<div class="go-strip">${gos.map(goTileHTML).join('')}</div>`;
    const goL = gos.filter(b => go === 'all' || (go === 'del' ? b.go.kind === 'del' : b.go.kind !== 'del')), goNew = gos.filter(b => b.go.st === 'new').length;
    const tab = v => { const n = v.go ? gos.filter(b => v.go === 'all' || (v.go === 'del' ? b.go.kind === 'del' : b.go.kind !== 'del')).length : Object.keys(S.tables).filter(t => t >= v.from && t <= v.to).length, h = v.go ? gos.some(b => b.go.st === 'new' && (v.go === 'all' || (v.go === 'del') === (b.go.kind === 'del'))) : Array.from({ length: v.to - v.from + 1 }, (_, i) => v.from + i).some(hot);
      return `<button class="${v.id === cur.id ? 'on' : ''}${h ? ' hot' : ''}" data-hl="set" data-h="${v.id}">${v.ic} ${esc(v.n)}${n ? ` <b>${n}</b>` : ''}</button>`; };
    const tabs = V.map(tab), bar = V.length > 1 ? `<div class="hall-tabs">${tabs.join('')}</div>` : '', othHot = tabs.some((x, i) => V[i].id !== cur.id && x.includes(' hot"')); // 📱 на телефоні вкладок немає — крапка на кнопці залу
    const tools = go ? '' : `<div class="seg hall-f">${[['mine', '👤', 'Мої столи'], ['busy', '🔥', 'Зайняті'], ['all', 'Усі', 'Усі столи']].map(([k, l, t]) => `<button class="${S.hf === k ? 'on' : ''}" data-hl="hf" data-h="${k}" title="${t}">${l}</button>`).join('')}<button data-hl="hm" title="Вигляд: плитки → 3D → план">${!map ? '📋' : S.f3m === '3d' ? '🧊' : '▦'}</button></div>`;
    // 🔔 що чекає в ІНШИХ залах — одним рядком над столами: тап → той зал і стіл
    const why = t => calls[t] ? '🔔 кличе' : pending.has(t) ? '🛎 замовлення' : S.tables[t]?.pwait ? '🌐 оплатив' : S.tables[t]?.check ? '🧾 рахунок' : '';
    const away = go ? [] : V.filter(v => !v.go && v.id !== cur.id).flatMap(v => Array.from({ length: v.to - v.from + 1 }, (_, i) => v.from + i).filter(hot).map(t => ({ v, t })));
    const alerts = away.length ? `<div class="hall-alert">${away.slice(0, 6).map(({ v, t }) => `<button data-hl="go" data-h="${v.id}" data-t="${t}"><b>${v.ic} ${esc(v.n)} · ${t}</b> ${why(t)}</button>`).join('')}</div>` : '';
    const goTile = !go && S.cfg?.goTabs && gos.length ? `<button class="go-sum${goNew ? ' new' : ''}" data-hl="set" data-h="${V.find(v => v.go)?.id}">🛵 ${gos.length} ${goNew ? `· <b>${goNew} нов.</b>` : 'в роботі'} →</button>` : '';
    const body0 = go ? (goL.length ? `<div class="go-strip go-grid">${goL.map(goTileHTML).join('')}</div>` : '<div class="muted" style="padding:14px">Замовлень зараз немає</div>') : `${S.cfg?.goTabs ? goTile : strip}${map ? floorUI(cur, all, inF, calls, pending) : ''}${map ? '' : `<div class="tables${rng.length > 24 ? ' compact' : ''}">${tiles || `<div class="muted" style="padding:14px">${S.hf === 'mine' ? 'У вас зараз немає столів' : 'Зайнятих столів немає'}</div>`}</div>`}`;
    const body = alerts + body0;
    return `<div class="head"><h1>${V.length > 1 ? `<button class="hall-pick${othHot ? ' hot' : ''}" data-hl="pick">${cur.ic} ${esc(cur.n)} ▾</button>` : 'Зал'}</h1>${tools}
      ${isCook() || isCour() ? '' : inboxBtn()}${isCook() || isCour() ? '' : S.bkNew ? `<button class="btn red bk-blink" data-a="books" title="Нові броні — підтвердіть">📅 ${S.bkNew} нов.</button>` : (S.books || []).length ? `<button class="btn" data-a="books">📅 ${S.books.length}</button>` : `<button class="btn ghost" data-a="books" title="Бронювання">📅</button>`}</div>${bar}${body}`;
  }

  // ---------- стрічка ----------
  const evTitle = e => ({
    guest: `🛎 Стіл ${tn(e.t)} — ${esc((e.kind || 'замовлення').toLowerCase())}`, check: `🧾 Стіл ${tn(e.t)} просить чек${e.pay ? (e.pay === 'card' ? ' · 💳 карта' : ' · 💵 готівка') : ''}${e.tip ? ` · 💝 ${money(e.tip)}` : ''}`,
    waiter: `🧑‍🍳 Стіл ${tn(e.t)} — ${esc(e.by)}${e.src === 'каса' ? ' (каса)' : ''}`, close: `✅ Стіл ${tn(e.t)} закрито — ${money(e.sum)} ${e.pay === 'card' ? '💳' : '💵'}${e.print === false ? ' · без чека' : ''}`,
    shift: esc(e.text), del: `🗑 Стіл ${tn(e.t)} видалено (${money(e.sum)})`, move: `↔️ ${esc(e.text)}`, disc: `% Стіл ${tn(e.t)}: ${esc(e.text)}`, rm: `✏️ Стіл ${tn(e.t)}: ${esc(e.text)}`, pre: `🖨 Пречек стіл ${tn(e.t)}`, ready: e.part ? `🍽 Стіл ${tn(e.t)} — страва готова, забирайте` : `🍽 Стіл ${tn(e.t)} — ВСЕ ГОТОВО, забирайте!${e.mins != null ? ` <small>(${e.mins} хв)</small>` : ''}`, cooking: `🔥 Стіл ${tn(e.t)} — кухня готує`, kmsg: `👨‍🍳 Кухня → стіл ${tn(e.t)}: ${esc(e.text)}`, call: `🔔🔔 Стіл ${tn(e.t)} кличе офіціанта`, noscan: `🚨📵🚫 СТІЛ ${e.t} — НЕ МОЖЕ ЗАМОВИТИ 🚫📵🚨<br><small>Гість не відсканував QR (або минула година). Підійдіть: 📷 нехай відсканує QR на столі 👆</small>`,
    tpay: `💳 Стіл ${tn(e.t)} оплатив онлайн — ${money(e.sum)}${e.tip ? ` (💝 ${money(e.tip)})` : ''}${e.test ? ' · 🧪 тест' : ''}`,
    chat: `💬 ${esc(e.by)}: ${cmText(e)}`, go: esc(e.text), book: esc(e.text), cert: esc(e.text), gchat: esc(e.text), att: `🟢 ${esc(e.n)} на зміні${e.late ? ` · ⏰ запізнення ${e.late} хв` : ''}`, swap: esc(e.text),
  })[e.k] || esc(e.text || e.k);
  function renderFeed() {
    const ci = $('#chatIn'), cv = ci?.value, cf = ci && document.activeElement === ci; // набраний текст чату не губиться при оновленні
    if (S.evc) evcRender(); // відкритий лист коментарів — оновлюється разом зі стрічкою
    setHTML($('#events'), evHead() + (S.events.length ? (evList().length ? evList() : null)?.map(e => {
      const add = e.prev?.length && e.lines?.length; // дозамовлення — яскраво, а що вже було на столі — сіро нижче
      const rdy = e.k === 'ready' && e.text ? `<div class="lines">${esc(e.text)}</div>` : '';
      const lines = rdy || (e.lines?.length ? `${add ? '<div class="addtag">➕ ДОЗАМОВЛЕННЯ</div>' : ''}<div class="lines${add ? ' add' : ''}">${e.lines.map(esc).join('\n')}</div>` : '');
      const by = e.by && !['waiter', 'chat'].includes(e.k) ? ` · ${esc(e.by)}` : '';
      const zb = e.k === 'att' ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || '')}</span>` : e.s === 'rej' ? `<span class="bad">❌ ${esc(e.accBy || '')}</span>` : isAdmin() ? `<button class="btn sm green" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="o">✅ Підтвердити</button>${e.late && S.cfg?.lateFine ? `<button class="btn sm" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="f">✅ + штраф</button>` : ''}<button class="btn sm red" data-a="zpConf" data-d="${e.day}" data-n="${esc(e.n)}" data-h="n">❌</button>` : '<span class="muted">чекає підтвердження</span>'}</div>`
        : e.k === 'swap' && !e.old ? (e.s === 'ask' && e.n === S.me?.name ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="agree">Погоджуюсь</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">Ні</button></div>` : e.s === 'agreed' && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="zpSw" data-id="${e.sw}" data-s="ok">✅ Підтвердити обмін</button><button class="btn sm red" data-a="zpSw" data-id="${e.sw}" data-s="no">❌</button></div>` : '') : '';
      const sb = e.k === 'book' && e.s === 'new' ? `<div class="act"><button class="btn sm green" data-a="bkSet" data-id="${e.bid}" data-s="ok">✅ Підтвердити</button><button class="btn sm red" data-a="bkSet" data-id="${e.bid}" data-s="no">❌</button><button class="btn sm" data-a="books">📅 Усі броні</button></div>`
        : e.k === 'cert' && e.s === 'new' && isAdmin() ? `<div class="act"><button class="btn sm green" data-a="certPay" data-c="${e.code}" data-h="cash">💵 Оплачено</button><button class="btn sm" data-a="certPay" data-c="${e.code}" data-h="card">💳</button><button class="btn sm red" data-a="certPay" data-c="${e.code}" data-h="no">❌</button></div>`
        : e.k === 'tpay' ? `<div class="act">${e.s === 'new' ? `<button class="btn sm green" data-a="tpayOk" data-t="${e.t}">✅ Підтвердити</button><button class="btn sm" data-a="table" data-t="${e.t}">✏️ ${tn(e.t)}</button>${isAdmin() ? `<button class="btn sm red" data-a="tpayRefund" data-t="${e.t}">↩️ Повернути</button>` : ''}` : `<span class="${e.s === 'rej' ? 'bad' : 'muted'}">${e.s === 'rej' ? '↩️ повернуто' : '✅'} ${esc(e.accBy || '')}</span>`}</div>`
        : e.k === 'gchat' && !e.out ? `<div class="act"><button class="btn sm primary" data-a="gbThread" data-ph="${e.ph}">↩️ Відповісти</button></div>`
        : (e.k === 'book' || e.k === 'cert') && e.s !== 'new' ? `<div class="act"><span class="muted">${e.s === 'rej' ? '❌' : '✅'} ${esc(e.accBy || '')}</span></div>` : '';
      const btns = isCour() ? '' : sb || zb || (e.k === 'noscan' ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || '')}</span>` : `<button class="btn sm green" data-a="evAck" data-id="${e.id}">✅ Іду</button>`}<button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${tn(e.t)}</button></div>` : e.k === 'guest' || e.k === 'check' || e.k === 'call'
        ? `<div class="act">${e.s === 'acc' ? `<span class="muted">✅ ${esc(e.accBy || 'прийнято')}</span>` : e.s === 'rej' ? `<span style="color:var(--red,#ff453a)">❌ відхилено · ${esc(e.accBy || '')}</span>` : `<button class="btn sm green" data-a="accept" data-oid="${e.oid}">✅ Прийняв</button>${e.k === 'guest' ? `<button class="btn sm red" data-a="reject" data-oid="${e.oid}">❌ Відхилити</button>` : ''}`}<button class="btn sm" data-a="table" data-t="${e.t}">Стіл ${tn(e.t)}</button></div>` : '');
      const fresh = S.shown.size && !S.shown.has(e.id) ? ' fresh' : '';
      return `<div data-ec="open" data-id="${e.id}" class="ev ${e.k}${e.pin ? ' pinned' : ''}${evMention(e) ? ' mention' : ''}${e.k === 'call' && e.s === 'new' && Date.now() - e.ts > 60e3 ? ' late' : ''}${e.k === 'noscan' && e.s !== 'acc' ? ' blink' : ''}${(['guest', 'check', 'call', 'noscan'].includes(e.k) && !['acc', 'rej'].includes(e.s)) || (['book', 'cert', 'tpay'].includes(e.k) && e.s === 'new') ? ' wait' : ''}${e.s === 'acc' || e.s === 'rej' ? ' acc' : ''}${e.s && !['new', 'ask', 'agreed'].includes(e.s) ? ' done' : ''}${e.s === 'rej' ? ' rej' : ''}${fresh}"><div class="top"><b>${evTitle(e)}</b><span class="tm">${e.at}${by}</span></div>${lines}${e.comment ? `<div class="com">💬 ${esc(e.comment)}</div>` : ''}${e.sum && ['guest', 'waiter'].includes(e.k) ? `<div class="muted">Сума ${money(e.sum)}</div>` : ''}${btns}${evFoot(e)}</div>`;
    }).join('') ?? '<div class="muted" style="padding:12px">Повідомлень ще немає — напишіть першим 👆</div>' : '<div class="muted" style="padding:12px">Сьогодні подій ще немає</div>'));
    if (cv || cf) { const n = $('#chatIn'); if (n) { n.value = cv || ''; if (cf) n.focus(); } }
    S.events.forEach(e => S.shown.add(e.id));
  }

  // ---------- стіл (лист) ----------
  const cartOf = t => (S.carts[t] ||= {});
  // «з собою»: 1 упаковка на кожну страву з кухні (як на сайті гостя і в боті)
  const isFood = c => !c.tech && c.g === 'kitchen' && !c.nopack; // позначка розділу (сервер: menu.js catGroups) — однаково для всіх закладів
  const packItem = () => S.menu?.categories.find(c => c.id === 'upakuvannia' || /упаков/i.test(c.name?.uk || ''))?.items.find(i => !i.hidden);
  const packQ = t => { if (!S.tw[t] || !S.menu) return 0; const food = new Set(S.menu.categories.filter(isFood).flatMap(c => c.items.map(i => i.id))); return Math.max(0, Object.values(cartOf(t)).filter(x => food.has(x.id)).reduce((s, x) => s + x.q, 0) + (S.packAdj[t] || 0)); };
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
    const paidRow = b?.paid ? `<div class="row"><div class="nm">🌐 Оплачено онлайн<small>${b.pwait ? 'гість заплатив з QR — підтвердіть' : 'LiqPay'}${Math.max(0, b.pay2 - (b.paid.net || 0)) ? ` · доплата ${money(Math.max(0, b.pay2 - (b.paid.net || 0)))}` : ''}</small></div><b class="money" style="color:var(--green,#30d158)">${money(b.paid.sum)}</b></div>` : '';
    const comments = b ? b.log.filter(o => o.comment).map(o => `<div class="muted" style="padding:2px 6px">💬 ${esc(o.comment)}</div>`).join('') : '';
    const cartHTML = cartRows.length ? `<div class="cart"><h3>Нове замовлення</h3><div class="rows">${cartRows.map(([k, x]) => `<div class="row"><div class="nm">${esc(x.name)}<small>${x.price} ₴</small></div><button class="rb minus" data-a="cq" data-k="${esc(k)}" data-d="-1">−</button><span class="q">${x.q}</span><button class="rb plus" data-a="cq" data-k="${esc(k)}" data-d="1">+</button></div>`).join('')}${pq ? `<div class="row auto"><div class="nm">🥡 ${esc(pk.name.uk)}<small>${pk.price} ₴ × ${pq}${S.packAdj[t] ? '' : ' · автоматично'}</small></div><button class="rb minus" data-a="pk" data-d="-1">−</button><span class="q">${pq}</span><button class="rb plus" data-a="pk" data-d="1">+</button></div>` : ''}</div>
      <div class="srow" style="margin:6px 0 10px"><input id="cartCom" placeholder="💬 Коментар для кухні" value="${esc(S.coms[t] || '')}"><button class="btn sm ${S.tw[t] ? 'primary' : 'ghost'}" data-a="tw">🥡 З собою</button><button class="btn sm ${S.ur[t] ? 'red' : 'ghost'}" data-a="ur">⚡ Терміново</button></div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:8px"><button class="btn red" data-a="cartClear">✕</button><button class="btn primary" data-a="send">Відправити · ${money(cartSum)}</button></div></div>` : '';
    const actions = b && !isCook() ? `<div class="actions"><button class="btn" data-a="pre">🖨 Пречек</button><button class="btn" data-a="disc">% Знижка</button>
      <button class="btn" data-a="move">↔️ Перенести</button><button class="btn" data-a="split">✂️ Розділити</button><button class="btn" data-a="bonCert">🎁 Бонуси · 🎟 Сертифікат</button>${isAdmin() ? '<button class="btn red" data-a="delTable">🗑 Видалити</button>' : '<button class="btn" data-a="mobileMenu">➕ Додати</button>'}
      <button class="btn green wide" data-a="closeT">💰 Закрити рахунок · ${money(b.pay2)}</button></div>` : '';
    const keepBill = $('#shBill .scroll')?.scrollTop, focusCom = document.activeElement?.id === 'cartCom';
    setHTML($('#shBill'), `<div class="scroll"><h3>Рахунок</h3>${billRows}${discRow}${promoRow}${bonRow}${tipRow}${paidRow}${comments}</div>${cartHTML}${actions}`);
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
    if (S.q) { S.q = ''; const se = $('#search'); if (se) se.value = ''; // знайшли й додали — пошук очищується, можна одразу писати нове
      const c = S.menu?.categories.find(x => x.items.some(i => i.id === it.id)), gr = c && S.groups?.find(x => x.cats?.includes(c.id)); /* і відкривається розділ цієї страви, а не перша вкладка групи (була «Кава» замість «Пиво») */
      if (c && gr && curGrp() !== 'fav') { S.grp = gr.id; S.cat = c.id; } }
    renderSheet(); if (keepKb && !searching()) $('#search')?.focus();
    upsHint(it.name.uk, cart);
  }
  // 💡 допродаж: правила власника + «часто беруть разом» → підказка після додавання страви (карта вантажиться раз)
  async function upsHint(name, cart) {
    if (!S.ups) { S.ups = {}; try { S.ups = (await api('upsMap')).m || {}; } catch {} }
    const have = new Set(Object.values(cart).map(x => x.name)), l = (S.ups[name] || []).filter(n => !have.has(n)).slice(0, 3);
    if (l.length) toast('💡 До «' + name + '» пропонуємо: ' + l.join(', '));
  }
  for (const ev of ['change', 'compositionend']) document.addEventListener(ev, e => { if (e.target.id === 'cartCom') S.coms[S.open] = e.target.value; }); // 📝 iPad: підказки клавіатури
  async function sendCart() {
    const t = S.open, cart = cartOf(t), pk = packItem(), pq = pk ? packQ(t) : 0, items = [...Object.values(cart).map(x => ({ id: x.id, v: x.v, q: x.q })), ...(pq ? [{ id: pk.id, q: pq }] : [])];
    if (!items.length) return;
    { const ci = $('#cartCom'); if (ci) { ci.blur(); S.coms[t] = ci.value.trim(); } } /* 📝 iPad: останнє слово з підказок клавіатури потрапляє в поле вже після натискання — беремо текст прямо з поля, інакше коментар «їде» до наступного замовлення */
    const btn = document.querySelector('[data-a="send"]'); if (btn) btn.disabled = true;
    const r = await act('order', { t: t === -1 ? 0 : t, ...(t === -1 ? { go: S.goDraft } : {}), items, urgent: !!S.ur[t], comment: [S.tw[t] && t !== -1 ? 'З СОБОЮ' : '', S.coms[t] || ''].filter(Boolean).join(' · ') });
    if (r && t === -1) { S.carts[-1] = {}; S.coms[-1] = ''; saveCarts(); S.goDraft = null; S.mobileMenu = false; toast(`🛵 ${tn(r.t)}: відправлено на кухню`); await loadState().catch(() => {}); openTable(r.t); return; }
    if (r) { { const ci = $('#cartCom'); if (ci) ci.value = ''; } S.carts[t] = {}; S.coms[t] = ''; S.tw[t] = false; S.ur[t] = false; S.packAdj[t] = 0; saveCarts(); S.mobileMenu = false; toast(r.queued ? `📴 Стіл ${tn(t)}: немає зв'язку — замовлення збережено, кухня отримає, щойно з'явиться інтернет` : `🖨 Стіл ${tn(t)}: відправлено на кухню`); if (!r.queued) await loadState().catch(() => {}); }
    else if (btn) btn.disabled = false;
  }
  async function closeFlow() {
    const t = S.open, b = S.tables[t]; if (!b) return;
    const v = await choose(`Закрити стіл ${tn(t)}`, `До сплати ${money(b.pay2)}${b.tip ? ` + 💝 чайові ${money(b.tip)} = ${money(b.pay2 + b.tip)}` : ''}${b.pay ? ` · гість хоче ${b.pay === 'card' ? '💳 карткою' : '💵 готівкою'}` : ''}`, [
      { label: '💵 Готівка + 🖨 чек', val: 'cash:1', cls: 'green' }, { label: '💳 Карта + 🖨 чек', val: 'card:1', cls: 'blue' },
      { label: '💵 Готівка, без чека', val: 'cash:0' }, { label: '💳 Карта, без чека', val: 'card:0' }, { label: '➗ Порівну на гостей', val: 'eq' }]);
    if (!v) return;
    if (v === 'eq') { // підказка: скільки з кожного (оплата — окремо, одним рахунком)
      const n = Math.round(+await ask('Порівну на скількох?', `Сума ${money(b.pay2 + (b.tip || 0))}`, 'number')); if (!(n >= 2 && n <= 30)) return;
      const tot = b.pay2 + (b.tip || 0), one = Math.floor(tot / n), rest = tot - one * n;
      await choose(`➗ Порівну на ${n}`, `З кожного ${money(one)}${rest ? ` (один доплачує ${money(one + rest)})` : ''} · разом ${money(tot)}`, [{ label: 'Гаразд', val: 'ok' }]);
      return closeFlow();
    }
    const [pay, pr] = v.split(':');
    const r = await act('close', { t, pay, print: pr === '1' });
    if (r?.queued) { toast(`📴 Стіл ${tn(t)}: немає зв'язку — закриття в черзі, відправимо самі`); closeSheet(); return; }
    if (r?.r) { toast(`✅ Стіл ${tn(t)} закрито · ${money(r.r.sum)}`); closeSheet(); loadState().then(wlFree.bind(null, t)).catch(() => {}); }
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
    const dmax = S.me?.dmax ?? S.cfg?.discMax ?? 20, max = realAdmin() && S.me?.dmax == null ? 100 : dmax; // офіціант — до ліміту з налаштувань, адмін — будь-яка
    const v = await choose(`Знижка — стіл ${tn(t)}`, `Сума ${money(b.total)}${b.disc ? ` · зараз ${b.disc}%` : ''}${max === 100 ? '' : ` · ваш ліміт — до ${dmax}%`}`, [...[5, 10, 15, 20, 25, 30, 50].filter(p => p <= max).map(p => ({ label: `${p}%  →  ${money(b.total - Math.round(b.total * p / 100))}`, val: String(p) })), { label: '✏️ Свій відсоток', val: 'own' }, { label: 'Без знижки', val: '0', cls: 'red' }]);
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
    if (r?.r) { toast((r.r.merged ? `🔗 Обʼєднано зі столом ${tn(to)}` : `↔️ Перенесено на стіл ${tn(to)}`) + (r.r.released ? ' · 🎁 бонуси / сертифікат знято — застосуйте знову' : '')); S.carts[to] = { ...(S.carts[to] || {}), ...cartOf(t) }; S.carts[t] = {}; saveCarts(); S.open = to; await loadState().catch(() => {}); }
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
    if (r?.r) { toast(`✂️ Перенесено на стіл ${tn(to)} · ${money(r.r.sum)}` + (r.r.released ? ' · 🎁 бонуси / сертифікат знято — застосуйте знову' : '')); await loadState().catch(() => {}); }
  }

  function hallGrid(m) {
    const w = m.clientWidth || innerWidth, h = Math.max(200, (m.clientHeight || innerHeight) - 90 - (Object.keys(S.tables).some(t => t > 1000) ? 74 : 0) - (hallViews().length > 1 ? 46 : 0) - ($('.hall-alert') ? 44 : 0)), V = hallViews(), cur = V.find(v => v.id === S.hall) || V[0], n = Math.max(1, cur.go ? 1 : hallRng(cur).length); // 74 — ряд доставок, 46 — вкладки залів, 44 — фільтри
    let best = [1, n], score = 1e9;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c), empty = c * r - n, ratio = (w / c) / (h / r);
      const sc = empty * 3 + Math.abs(Math.log(ratio / 1.15));
      if (sc < score) { score = sc; best = [c, r]; }
    }
    return best;
  }
  const payL = x => x.onl ? (x.onl < x.sum ? `🌐 онлайн ${money(x.onl)} + ${x.card > x.onl ? '💳' : '💵'} ${money(x.sum - x.onl)}` : '🌐 онлайн') : x.card && (x.cash ?? 0) ? `💵 ${money(x.cash)} + 💳 ${money(x.card)}` : x.card ? '💳 карта' : '💵 готівка';
  // 🧾 ПРРО Checkbox: стан фіскального чека закритого рахунку
  const fisNote = (x, ref) => !x.fis ? '' : x.fis.st === 'err' ? `<div class="c-note" style="color:var(--red,#e66)">🧾⚠️ Checkbox: ${esc(x.fis.err || 'помилка')}${isAdmin() ? ` <button class="c-b" data-a="cFis" data-ref="${ref}" data-d="${S.data.cday || ''}">🔁 Повторити</button>` : ''}</div>`
    : x.fis.id ? `<div class="c-note">🧾 Фіскальний чек: <a href="https://check.checkbox.ua/${esc(x.fis.id)}" target="_blank" rel="noopener">відкрити</a>${x.fis.ret?.length ? ` · ↩️ повернень ${x.fis.ret.length}` : ''}</div>` : x.fis.ret?.length ? `<div class="c-note">🧾 Фіскальний чек повернено</div>` : '';
  function closedHTML() {
    const l = S.data.closed; if (!l) return '<div class="muted">Завантаження…</div>';
    const isToday = !S.data.cday || S.data.cday === S.data.ctoday, dTitle = isToday ? 'сьогодні' : S.data.cday.split('-').reverse().join('.');
    const gone = x => x.del || x.rm, ok = l.filter(x => !gone(x)), sum = f => money(ok.reduce((s, x) => s + f(x), 0)), onl = ok.some(x => x.onl);
    const nav = `<div class="c-day"><button class="c-arr" data-a="cDay" data-v="-1">‹</button><label class="c-date">📅 ${isToday ? 'Сьогодні' : dTitle}<input type="date" data-a="cDate" value="${S.data.cday || S.data.ctoday || ''}" max="${S.data.ctoday || ''}"></label><button class="c-arr" data-a="cDay" data-v="1" ${isToday ? 'disabled' : ''}>›</button></div>`;
    const top = `<div class="c-top">${nav}<div class="c-tot"><div class="c-big"><small>Разом · ${ok.length} чек.</small><b class="money">${sum(x => x.sum)}</b></div><div class="c-split"><span>💵 ${sum(x => x.cash ?? x.sum)}</span><span>💳 ${sum(x => (x.card || 0) - (x.onl || 0))}</span>${onl ? `<span>🌐 ${sum(x => x.onl || 0)}</span>` : ''}</div></div></div>`;
    const kind = x => x.del ? 'del' : x.rm ? 'rm' : x.reopen || x.restored ? 're' : x.onl ? 'onl' : x.card ? 'card' : 'cash';
    const stat = x => x.reopen ? '↩️ відкрито знову' : x.restored ? '↩️ відновлено' : x.del ? '🗑 видалено' : x.rm ? '🧹 знято' : payL(x);
    const B = (a, ref, l, cls = '', extra = '') => `<button class="c-b ${cls}" data-a="${a}" data-ref="${ref}"${extra}>${l}</button>`;
    const card = (x, i) => { const ref = x.id || (l.length - 1 - i), adm = isAdmin(), g = gone(x);
      const btns = [!g && x.dishes?.length && B('cPrint', ref, '🖨 Чек'), !g && adm && B('cEdit', ref, '✏️ Змінити', '', ` data-d="${S.data.cday || ''}"`), adm && !x.del && !x.reopen && x.dishes?.length && B('cReopen', ref, '↩️ На стіл'),
        adm && x.rm && !x.reopen && !x.del && B('cBack', ref, '↩️ У виручку', 'ok'), adm && x.del && !x.restored && (x.dishes?.length || x.voids?.length) && B('tBack', ref, '↩️ Відновити', 'ok'),
        !g && adm && x.lpo?.length && B('cRefund', ref, `↩️ ${money(x.onl)} на картку`, '', ` data-s="${x.onl}"`), !g && adm && B('cDel', ref, '🗑', 'bad', ' title="Зняти з виручки"')].filter(Boolean).join('');
      const items = (x.dishes || []).map(([n, q, s]) => `<div><span>${q}× ${esc(n)}</span><b>${s}</b></div>`).join('');
      return `<details class="c-card k-${kind(x)}${g ? ' gone' : ''}"><summary><span class="c-tm">${x.at}</span><span class="c-t">Стіл ${tn(x.t)}</span><span class="c-pay">${stat(x)}${x.disc ? ` · −${x.disc}%` : ''}${x.fis ? x.fis.st === 'err' ? ' · 🧾⚠️' : ' · 🧾' : ''}</span><b class="money c-sum">${money(x.sum)}</b></summary>
        <div class="c-body">${items ? `<div class="c-items">${items}</div>` : ''}${x.tip ? `<div class="c-note">💝 чайові ${money(x.tip)}</div>` : ''}${x.by ? `<div class="c-note">👤 ${esc(x.by)}${x.edits?.length ? ` · ✏️ змінено ${x.edits.length}× (${esc(x.edits[x.edits.length - 1].by)} ${x.edits[x.edits.length - 1].at})` : ''}</div>` : ''}
        ${x.voids?.length ? `<div class="voids">🚫 Скасовано:${x.voids.map(v => `<div>${v.at} · −${money(v.sum)} ${esc(v.name)} — <i>${esc(v.reason)}</i> <span class="muted">(${esc(v.by)})</span></div>`).join('')}</div>` : ''}${fisNote(x, ref)}${btns ? `<div class="c-btns">${btns}</div>` : ''}</div></details>`; };
    const voids = (S.data.cvoids || []).length ? `<details class="c-card k-rm"><summary><span class="c-tm">🚫</span><span class="c-t">Скасовані страви</span><span class="c-pay">${S.data.cvoids.length} шт.</span><b class="money c-sum">${money(S.data.cvoids.reduce((s, v) => s + (v.sum || 0), 0))}</b></summary><div class="c-body">${[...S.data.cvoids].reverse().map(v => `<div class="kv"><span>${v.at} · стіл ${tn(v.t)} · <b>${esc(v.name)}</b> — <i>${esc(v.reason || '')}</i> <span class="muted">(${esc(v.by || '')})</span></span><span class="kv-r"><b class="money">${money(v.sum)}</b>${isToday && isAdmin() ? `<button class="c-b ok" data-a="vBack" data-ts="${v.ts}">↩️ На стіл</button>` : ''}</span></div>`).join('')}</div></details>` : '';
    return `${top}<div class="c-list">${[...l].reverse().map(card).join('') || `<div class="c-empty">🧾 ${isToday ? 'Сьогодні закритих рахунків ще немає' : 'Цього дня закритих рахунків немає'}</div>`}${voids}</div>`;
  }

  // ---------- 🏛 зали (Налаштування → Правила роботи → Зали) ----------
  // столи нумеруються підряд через усі зали; «з собою» й доставка — у залі стрічкою (goTabs 0), однією вкладкою (1) або двома (2)
  S.hall = store.get('hall', ''); S.hf = store.get('hf', 'all');
  function hallViews() {
    const H = S.cfg?.halls?.length ? S.cfg.halls : [{ n: 'Зал', ic: '🪑', c: S.n }]; let a = 1;
    const V = H.map((h, i) => { const v = { id: 'h' + i, n: h.n, ic: h.ic || '🪑', from: a, to: Math.min(S.n, a + h.c - 1) }; a += h.c; return v; });
    const g = S.cfg?.goTabs; if (g === 1) V.push({ id: 'go', go: 'all', n: 'З собою і доставка', ic: '🛵' }); if (g === 2) V.push({ id: 'pick', go: 'pick', n: 'З собою', ic: '🥡' }, { id: 'del', go: 'del', n: 'Доставка', ic: '🛵' });
    if (!isAdmin() && H.length > 1) { const mine = store.get('myHalls', null); if (mine?.length) return V.filter(v => v.go || mine.includes(v.id)); } // 👤 офіціант бачить свої зали (вибір на пристрої)
    return V;
  }
  const hallRng = (cur, calls = {}) => Array.from({ length: Math.max(0, cur.to - cur.from + 1) }, (_, i) => cur.from + i).filter(t => S.hf === 'busy' ? S.tables[t] || calls[t] : S.hf === 'mine' ? S.tables[t]?.waiter === S.me?.name : true);
  // 🗺 схема залу (js/floor3d.js): місця столів cfg.map {t:[x%,y%,форма,поворот]}, декор cfg.deco[from], підлога cfg.floor[from]
  // редагування — у чернетці S.mapDraft {pos, deco, floor}; зберігається одним запитом mapSet
  S.hm = store.get('hm', 'tiles'); S.f3m = store.get('f3m', '3d'); S.mapSel = null;
  const hk = cur => String(cur.from);
  function mapPos(cur) {
    const n = cur.to - cur.from + 1, cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.5))), rows = Math.ceil(n / cols), m = {}, d = S.mapDraft;
    for (let t = cur.from; t <= cur.to; t++) { const i = t - cur.from, p = d?.pos?.[t] || (!d?.r && S.cfg?.map?.[t]) || [Math.round((i % cols + .5) / cols * 1000) / 10, Math.round((Math.floor(i / cols) + .5) / rows * 1000) / 10]; m[t] = [p[0], p[1], p[2] || 's', p[3] || 0]; }
    return m;
  }
  const curHall = () => { const V = hallViews(); return V.find(v => v.id === S.hall) || V[0]; };
  function mapStart() { const c = curHall(); S.mapEd = 1; S.mapSel = null; S.mapDraft = null; S.mapDraft = { pos: mapPos(c), deco: JSON.parse(JSON.stringify(S.cfg?.deco?.[hk(c)] || [])), floor: S.cfg?.floor?.[hk(c)] || 'wood' }; }
  const mapStop = () => { S.mapEd = 0; S.mapDraft = null; S.mapSel = null; };
  async function mapSave() { const c = curHall(), d = S.mapDraft, r = await act('mapSet', { pos: mapPos(c), from: c.from, to: c.to, deco: d.deco, floor: d.floor }, '✅ Схему збережено'); if (r?.cfg) { S.cfg = r.cfg; if (S.data.staff) S.data.staff.cfg = r.cfg; mapStop(); renderMain(); } }
  function floorUI(cur, all, inF, calls, pending) {
    const F = window.Floor3D; if (!F) return '<div class="muted" style="padding:14px">Оновіть сторінку</div>';
    const mp = mapPos(cur), ed = S.mapEd, d = S.mapDraft, key = hk(cur);
    const tables = all.map(t => {
      const b = S.tables[t], bk = !b && (S.books || []).find(x => x.t === t && x.st === 'ok'), [x, y, sh, r] = mp[t];
      const st = pending.has(t) || b?.pwait ? 's-new pw' : b ? (b.check ? 's-check' : 's-busy') : bk ? 's-book' : ''; // 🛎 усе від гостя блимає, доки не підтвердять
      const sub = b ? `<small>${b.pwait ? '🌐 ' : b.check ? '🧾 ' : pending.has(t) ? '🛎 ' : ''}${money(b.pay2)}</small>` : bk ? `<small>📅 ${bk.time}</small>` : '';
      return { t, x, y, sh, r, cls: `${st}${calls[t] ? ' call' : ''}${inF.has(t) ? '' : ' dim'}`, attrs: ed ? '' : `data-a="table" data-t="${t}"`, pin: `<b>${calls[t] ? '🔔' : ''}${t}</b>${sub}` };
    });
    requestAnimationFrame(() => { const el = $('.f3'); if (el) { F.fit(); F.watch(el); } });
    const plan = F.html({ tables, deco: ed ? d.deco : S.cfg?.deco?.[key] || [], floor: ed ? d.floor : S.cfg?.floor?.[key], mode: ed ? '2d' : S.f3m, edit: ed, sel: S.mapSel });
    if (!ed) return `<div class="f3w">${plan}</div>`;
    const sel = S.mapSel, st = sel?.[0] === 't' ? +sel.slice(1) : null, sd = sel?.[0] === 'd' ? +sel.slice(1) : null, dx = sd != null ? d.deco[sd] : null;
    const tools = st != null ? `<div class="f3-tools"><b>🪑 Стіл ${st}</b>${Object.entries(F.SH).map(([k, v]) => `<button class="chip${mp[st][2] === k ? ' on' : ''}" data-hl="msh" data-h="${k}">${v.n}</button>`).join('')}<button class="btn sm" data-hl="mrot">↻ Повернути</button></div>`
      : dx ? `<div class="f3-tools"><b>${F.K[dx[0]]?.n || ''}</b><button class="btn sm" data-hl="mrot">↻ Повернути</button>${F.K[dx[0]]?.len ? '<button class="btn sm" data-hl="mlen" data-h="-40">⟷ −</button><button class="btn sm" data-hl="mlen" data-h="40">⟷ +</button>' : ''}<button class="btn sm" data-hl="mdup">⧉ Копія</button><button class="btn sm red" data-hl="mdel">🗑</button></div>`
      : '<div class="f3-tools muted">Перетягуйте столи й предмети · торкніться — з’являться дії<button class="btn sm" data-hl="mreset" style="margin-left:auto">↺ Рядами</button></div>';
    return `<div class="f3w"><div class="f3-bar"><button class="f3-ic" data-hl="mno" title="Скасувати">✕</button><b class="f3-title">${esc(cur.n)}</b><button class="btn sm primary" data-hl="msave">Готово</button></div>${plan}${tools}
      <div class="f3-pal">${Object.entries(F.K).map(([k, v]) => `<button data-hl="madd" data-h="${k}">${v.n}</button>`).join('')}</div>
      <div class="f3-pal fl">${Object.entries(F.FLOORS).map(([k, v]) => `<button class="${d.floor === k ? 'on' : ''}" data-hl="mfl" data-h="${k}">${v}</button>`).join('')}</div></div>`;
  }
  // ✋ перетягування (миша і палець) у редакторі; дотик без руху — вибір предмета
  let drag = null;
  document.addEventListener('pointerdown', ev => { const el = S.mapEd && ev.target.closest('.f3.edit [data-mt], .f3.edit [data-md]'); if (!el) return; ev.preventDefault();
    drag = { el, box: el.closest('.f3-st').getBoundingClientRect(), id: el.dataset.mt ? 't' + el.dataset.mt : 'd' + el.dataset.md, x0: ev.clientX, y0: ev.clientY, mv: 0 }; el.setPointerCapture?.(ev.pointerId); });
  document.addEventListener('pointermove', ev => { if (!drag) return; const { el, box } = drag; if (!drag.mv && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 4) return; drag.mv = 1;
    const x = Math.round(Math.min(98, Math.max(2, (ev.clientX - box.left) / box.width * 100)) * 2) / 2, y = Math.round(Math.min(98, Math.max(2, (ev.clientY - box.top) / box.height * 100)) * 2) / 2;
    el.style.left = x + '%'; el.style.top = y + '%'; const d = S.mapDraft; if (!d) return;
    if (el.dataset.mt) { const p = d.pos[el.dataset.mt] ||= [x, y, 's', 0]; p[0] = x; p[1] = y; } else { const p = d.deco[+el.dataset.md]; if (p) { p[1] = x; p[2] = y; } } });
  document.addEventListener('pointerup', () => { if (!drag) return; const id = drag.id; drag = null; if (S.mapSel !== id) { S.mapSel = id; renderMain(); } });
  document.addEventListener('click', ev => { if (S.mapEd && ev.target.closest('[data-mt]')) { ev.stopPropagation(); ev.preventDefault(); } }, true);
  function mapEdit(a, h) {
    const d = S.mapDraft, F = window.Floor3D; if (!d) return; const sel = S.mapSel || '', i = +sel.slice(1);
    if (a === 'madd') { if (d.deco.length >= 150) return toast('Максимум 150 предметів'); const f = $('.f3'), cx = f ? Math.round(Math.min(90, Math.max(10, (f.scrollLeft + f.clientWidth / 2) / f.scrollWidth * 100))) : 50, cy = f ? Math.round(Math.min(90, Math.max(10, (f.scrollTop + f.clientHeight / 2) / f.scrollHeight * 100))) : 50, j = d.deco.length % 4 * 3; d.deco.push([h, cx + j, cy + j, 0, F.K[h]?.len || 0]); S.mapSel = 'd' + (d.deco.length - 1); }
    if (a === 'mfl') d.floor = h;
    if (a === 'msh' && sel[0] === 't') d.pos[i][2] = h;
    if (a === 'mrot') { if (sel[0] === 't') d.pos[i][3] = ((d.pos[i][3] || 0) + 45) % 360; else if (d.deco[i]) d.deco[i][3] = ((+d.deco[i][3] || 0) + 45) % 360; }
    if (a === 'mlen' && d.deco[i]) d.deco[i][4] = Math.max(40, Math.min(700, (+d.deco[i][4] || F.K[d.deco[i][0]].len) + +h));
    if (a === 'mdup' && d.deco[i] && d.deco.length < 150) { const c = [...d.deco[i]]; c[1] = Math.min(98, c[1] + 4); c[2] = Math.min(98, c[2] + 4); d.deco.push(c); S.mapSel = 'd' + (d.deco.length - 1); }
    if (a === 'mdel' && d.deco[i]) { d.deco.splice(i, 1); S.mapSel = null; }
    if (a === 'mreset') { d.pos = {}; d.r = 1; d.pos = mapPos(curHall()); }
    renderMain();
  }
  const hallSet = h => { mapStop(); S.hall = h; store.set('hall', h); renderMain(); };
  async function hallPick() {
    const all = isAdmin() ? null : (S.cfg?.halls?.length > 1 ? 1 : null), V = hallViews();
    const h = await choose('🏛 Зал', '', [...V.map(v => ({ label: `${v.ic} ${v.n}${v.go ? '' : ` · ${v.from}–${v.to}`}`, val: v.id })), ...(all ? [{ label: '⭐ Мої зали…', val: '*' }] : [])]);
    if (h === '*') return myHalls(); if (h) hallSet(h);
  }
  async function myHalls() { // офіціант обирає, які зали показувати на цьому пристрої
    const H = S.cfg.halls, cur = store.get('myHalls', []) || [], pick = new Set(cur);
    for (;;) {
      const v = await choose('⭐ Мої зали', 'Позначте зали, які показувати на цьому пристрої. Порожньо — усі.', [...H.map((h, i) => ({ label: `${pick.has('h' + i) ? '✅' : '▫️'} ${h.ic} ${h.n}`, val: 'h' + i })), { label: '💾 Готово', val: 'ok', cls: 'primary' }]);
      if (!v) return; if (v === 'ok') break; pick.has(v) ? pick.delete(v) : pick.add(v);
    }
    store.set('myHalls', [...pick]); if (pick.size && !pick.has(S.hall)) S.hall = [...pick][0]; renderMain();
  }
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-hl]'); if (!el) return; const a = el.dataset.hl;
    if (a === 'set') return hallSet(el.dataset.h);
    if (a === 'pick') return hallPick();
    if (a === 'go') { S.hall = el.dataset.h; store.set('hall', S.hall); renderMain(); return openTable(+el.dataset.t); }
    if (a === 'hm') { if (S.hm !== 'map') { S.hm = 'map'; S.f3m = '3d'; } else if (S.f3m === '3d') S.f3m = '2d'; else S.hm = 'tiles'; store.set('hm', S.hm); store.set('f3m', S.f3m); mapStop(); return renderMain(); }
    if (a === 'mno') { mapStop(); return renderMain(); }
    if (a === 'msave') return mapSave();
    if (['madd', 'mfl', 'msh', 'mrot', 'mlen', 'mdup', 'mdel', 'mreset'].includes(a)) return mapEdit(a, el.dataset.h);
    if (a === 'hf') { S.hf = el.dataset.h; store.set('hf', S.hf); return renderMain(); }
  });


  // ⏳ стіл звільнився → пропонуємо покликати першого з черги (місткість столів у системі не зберігається; без автовідправки)
  function wlFree(t) {
    const n = (S.wl || []).find(x => x.st === 'wait'); if (!n) return;
    toast(`⏳ Стіл ${tn(t)} вільний — покликати ${n.name} (${n.people} ос.)?`, { label: '🔔 Покликати', fn: async () => { if (await act('wlAct', { id: n.id, act: 'call' }, '🔔 Покликали')) loadState().catch(() => {}); } });
  }
  // ⏳ черга гостей у залі (wl.js; та сама wlAct у боті)
  async function wlOpen() {
    const ago = x => Math.max(0, Math.round((Date.now() - x.at) / 60e3));
    const rows = (S.wl || []).map((x, i) => `<div class="kv" style="flex-wrap:wrap;gap:6px"><span style="min-width:0;overflow-wrap:anywhere">${i + 1}. <b>${esc(x.name)}</b> · ${x.people} ос. · ${ago(x)} хв${x.st === 'called' ? ' · 🔔' : ''}${x.phone ? ` · ${esc(x.phone)}` : ''}</span><span class="row" style="gap:6px"><button class="btn sm" data-mi-v="call:${x.id}">🔔</button><button class="btn sm" data-mi-v="seat:${x.id}">🪑</button><button class="btn sm ghost" data-mi-v="gone:${x.id}">✖</button></span></div>`).join('') || '<div class="muted">Черга порожня</div>';
    const v = await modal({ title: '⏳ Черга в залі', body: rows, buttons: [{ label: '➕ Додати гостя', val: 'add', cls: 'primary' }, { label: 'Закрити', val: null }] });
    if (!v) return;
    if (v === 'add') { const name = await ask('Імʼя гостя'); if (!name) return; const p = await ask('Скільки людей?', '2', 'number'); if (!p) return; const r = await act('wlAdd', { name, people: +p }, '⏳ Додано в чергу'); if (r) { await loadState().catch(() => {}); wlOpen(); } return; }
    const [a, id] = String(v).split(':'); let tt = 0;
    if (a === 'seat') { tt = await pickTable('🪑 За який стіл?', ''); if (!tt) return; }
    if (await act('wlAct', { id, act: a, t: tt }, { call: '🔔 Покликали', seat: '🪑 Посадили', gone: '✖ Прибрано' }[a])) { await loadState().catch(() => {}); if ((S.wl || []).length) wlOpen(); }
  }

  // ---------- 🖱 кнопки розділу (data-a) ----------
  on('table', async (el, e, a, t) => { $('#feed').classList.remove('open'); openTable(el.dataset.t); return; });
  on('newOrder', async (el, e, a, t) => { { const n = await pickTable('Новe замовлення', 'Оберіть стіл', 0, true); if (n === 'pick' || n === 'del') goNew(n); else if (n) { openTable(n); S.mobileMenu = true; renderSheet(); } return; } });
  on('closeSheet', async (el, e, a, t) => { closeSheet(); return; });
  on('tab', async (el, e, a, t) => { S.mobileMenu = el.dataset.m === '1'; renderSheet(); return; });
  on('mobileMenu', async (el, e, a, t) => { S.mobileMenu = true; renderSheet(); return; });
  on('cat', async (el, e, a, t) => { S.cat = el.dataset.c; S.q = ''; renderSheet(); $('#shItems').scrollTop = 0; return; });
  on('grp', async (el, e, a, t) => { S.grp = el.dataset.g; S.cat = ''; S.q = ''; store.set('grp', S.grp); renderSheet(); $('#shItems').scrollTop = 0; return; });
  on('fav', async (el, e, a, t) => { { const on = !S.fav.includes(el.dataset.id); S.fav = on ? [...S.fav, el.dataset.id] : S.fav.filter(x => x !== el.dataset.id); renderSheet(); act('fav', { id: el.dataset.id, on }, on ? '⭐ Додано в обрані' : 'Прибрано з обраних'); return; } });
  on('tw', async (el, e, a, t) => { { // 🥡 з собою: самовивіз або доставка — окремий віртуальний стіл С‑ / Д‑
        if (t === -1 || t > 1000) { S.tw[t] = !S.tw[t]; S.packAdj[t] = 0; renderSheet(); return; }
        const k = await choose('🥡 З собою', 'Замовлення піде окремим чеком; стіл не займається', [{ label: '🥡 Самовивіз', val: 'pick', cls: 'primary' }, { label: '🛵 Доставка', val: 'del', cls: 'primary' }]);
        if (k) goNew(k, t); return; }
  });
  on('ur', async (el, e, a, t) => { S.ur[t] = !S.ur[t]; renderSheet(); return; });
  on('pk', async (el, e, a, t) => { { const cur = packQ(t); if (cur + +el.dataset.d >= 0) S.packAdj[t] = (S.packAdj[t] || 0) + +el.dataset.d; renderSheet(); return; } });
  on('photos', async (el, e, a, t) => { S.photos = !S.photos; store.set('photos', S.photos); renderSheet(); return; });
  on('add', async (el, e, a, t) => { addItem(el.dataset.id); return; });
  on('cq', async (el, e, a, t) => { { const c = cartOf(t), x = c[el.dataset.k]; if (x) { x.q += +el.dataset.d; if (x.q <= 0) delete c[el.dataset.k]; } saveCarts(); renderSheet(); return; } });
  on('cartClear', async (el, e, a, t) => { S.carts[t] = {}; saveCarts(); renderSheet(); return; });
  on('send', async (el, e, a, t) => { sendCart(); return; });
  on('books', async (el, e, a, t) => { S.view = 'books'; renderNav(); renderMain(); loadView(); return; });
  on('bonCert', async (el, e, a, t) => { { const v = await choose('🎁 Бонуси · 🎟 Сертифікат', S.tables[t]?.cli ? 'Гість за телефоном уже вказаний' : 'Що застосувати до рахунку?', [{ label: S.tables[t]?.cli ? '🎁 Гість і бонуси' : '🎁 Бонуси гостя (за телефоном)', val: 'cli', cls: 'primary' }, { label: '🎟 Сертифікат (код)', val: 'cert' }, { label: '🎂 Подарунок на ДН', val: 'bd' }]); if (v === 'cli') cliT(t); else if (v === 'cert') certT(t); else if (v === 'bd') bdGiftT(t); return; } });
  on('cliBon0', async (el, e, a, t) => { { const b = S.tables[t]; if (b?.cert) { if (!(await confirmBox(b.cert.code && b.bonus > b.cert.sum ? '↩️ Прибрати сертифікат і бонуси з рахунку?' : '↩️ Прибрати сертифікат з рахунку?'))) return; if (!(await act('certOff', { t }, '↩️ Прибрано'))) return; if (b.bonus > b.cert.sum && b.cli) await act('cliBonus', { t, sum: 0 }); } else if (!(await act('cliBonus', { t, sum: 0 }))) return; loadState().catch(() => {}); return; } });
  on('rm', async (el, e, a, t) => { { const reason = await voidReason(`Скасувати 1× ${el.dataset.name}?`); if (reason) act('remove', { t, name: el.dataset.name, reason }, '✏️ Скасовано'); return; } });
  on('disc', async (el, e, a, t) => { discFlow(); return; });
  on('tipSet', async (el, e, a, t) => { act('tip', { t, sum: 0 }, 'Чайові прибрано'); return; });
  on('discSet', async (el, e, a, t) => { act('discount', { t, pct: 0 }, 'Знижку прибрано'); return; });
  on('vBack', async (el, e, a, t) => { if (await confirmBox('Повернути страву на стіл? Вона знову буде в рахунку.')) { if (await act('voidBack', { ts: +el.dataset.ts }, '↩️ Повернуто на стіл')) loadView(); } return; });
  on('move', async (el, e, a, t) => { moveFlow(); return; });
  on('split', async (el, e, a, t) => { splitFlow(); return; });
  on('spq', async (el, e, a, t) => { { const i = +el.dataset.i, it = S.spl.items[i]; S.spl.q[i] = Math.max(0, Math.min(it.q, (S.spl.q[i] || 0) + +el.dataset.d)); splitRender(); return; } });
  on('closeT', async (el, e, a, t) => { closeFlow(); return; });
  on('delTable', async (el, e, a, t) => { { const pb = S.tables[t], pp = pb?.paid?.sum || (pb?.go?.paid && !pb.go.paid.ref ? pb.go.paid.sum : 0); /* 💳 оплачено онлайн — спершу повернути гроші */
        if (pp) { if (!isAdmin()) { toast('💳 Оплачено онлайн — видалити може лише адмін (з поверненням грошей)'); return; } if (!(await confirmBox(`Повернути гостю ${money(pp)} на картку?`, 'Стіл оплачено онлайн. Спершу повертаємо гроші через LiqPay, потім — видалення.'))) return; if (!(await act('tpayRefund', { t }, '↩️ Гроші повернуто'))) return; }
        const reason = await voidReason(`Видалити весь стіл ${tn(t)}? Сума НЕ піде у виручку`); if (reason) { const r = await act('delete', { t, reason }, `🗑 Стіл ${tn(t)} видалено`); if (r) closeSheet(); } return; }
  });
  on('evAck', async (el, e, a, t) => { act('evAck', { id: el.dataset.id }, '✅ Ви йдете до гостя'); return; });
  on('tpayOk', async (el, e, a, t) => { { const tt = +el.dataset.t, b = S.tables[tt]; const due = b?.paid ? Math.max(0, b.pay2 - (b.paid.net || 0)) : 0; /* 💳 оплачено з QR: доплату — обраним способом */
        let pay = 'cash'; if (due > 0) { pay = await choose(`Стіл ${tn(tt)}: доплата ${money(due)}`, 'Гість оплатив онлайн не все (додали страви). Як доплатили?', [{ label: '💵 Готівка', val: 'cash' }, { label: '💳 Термінал', val: 'card' }]); if (!pay) return; }
        const r = await act('tpayOk', { t: tt, pay }, `✅ Стіл ${tn(tt)} закрито — 🌐 онлайн`); if (r && S.open === tt) closeSheet(); return; }
  });
  on('tpayRefund', async (el, e, a, t) => { { const tt = +el.dataset.t, b = S.tables[tt]; if (await confirmBox(`Повернути гостю ${money(b?.paid?.sum || 0)} на картку?`, `Стіл ${tn(tt)} лишиться відкритим. Повернення через LiqPay — гроші прийдуть гостю за 1–7 днів.`)) await act('tpayRefund', { t: tt }, '↩️ Гроші повернуто гостю'); return; } });
  on('reject', async (el, e, a, t) => { if (await confirmBox('Відхилити замовлення гостя?', 'Позиції приберуться з рахунку, на кухню не піде, гість побачить «відхилено»')) { await act('reject', { oid: el.dataset.oid }, '❌ Відхилено'); loadState().catch(() => {}); } return; });
  on('cReopen', async (el, e, a, t) => { if (await confirmBox('Відкрити рахунок знову?', 'Він зніметься з виручки й повернеться на стіл — виправите й закриєте заново')) { const r = await act('closedReopen', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Рахунок знову на столі'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } return; });
  on('tBack', async (el, e, a, t) => { if (await confirmBox('Відновити видалений стіл?', 'Страви повернуться на стіл')) { const r = await act('tableBack', { ref: el.dataset.ref, day: S.data.cday }, '↩️ Стіл відновлено'); loadView(); loadState().catch(() => {}); if (r?.x) openTable(r.x.t); } return; });
  on('cDay', async (el, e, a, t) => { { const v = +el.dataset.v, base = S.data.cday || S.data.ctoday; if (!v || !base) S.cday = ''; else { const d = new Date(base + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + v); const k = d.toISOString().slice(0, 10); S.cday = k >= S.data.ctoday ? '' : k; } S.data.closed = null; renderMain(); loadView(); return; } });
  on('cFis', async (el) => { const r = await api('fisRetry', { ref: el.dataset.ref, day: el.dataset.d || undefined }); toast(r.st === 'err' ? '⚠️ ' + (r.err || 'Checkbox не прийняв') : '🧾 Чек фіскалізовано'); loadView(); });
