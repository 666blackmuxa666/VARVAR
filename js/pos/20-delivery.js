  function goBlock(t, g, b) {
    const map = g.addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(g.addr)}` : '';
    const nx = t === -1 ? '' : [['cook', '🔥 Готується'], ['ready', '🍽 Готово'], ...(g.kind === 'del' ? [['road', '🛵 Поїхав']] : [])].filter(([s]) => s !== g.st).map(([s, l]) => `<button class="btn sm" data-a="goSt" data-s="${s}">${l}</button>`).join('');
    const pay = g.pay === 'online' ? (g.paid ? '💳 онлайн ✓' : '⏳ онлайн') : g.pay === 'card' ? '💳 картка' : '💵 готівка';
    const tags = [g.when ? `🕐 <b>${g.when}</b>` : '⚡ швидко', pay + (g.change ? ` · з ${g.change}` : ''), g.cut ? `🍴 ${g.cut}` : '', g.cour ? `🛵 ${esc(g.cour)}` : '', g.src ? esc(g.src) : ''].filter(Boolean).map(x => `<span class="chip sm">${x}</span>`).join('');
    return `<div class="go-card"><div class="go-h"><b>${g.kind === 'del' ? '🛵' : '🥡'} ${esc(g.name || '—')}</b>${t !== -1 ? `<span class="chip sm on">${GOST[g.st] || g.st}</span>` : ''}${g.phone ? `<a class="btn sm go-ph" href="tel:+${g.phone}">📞 ${fmtPh(g.phone)}</a>` : ''}</div>
      ${g.kind === 'del' ? `<div class="go-adr">📍 ${map ? `<a href="${map}" target="_blank" rel="noopener">${esc(g.addr)}</a>` : '—'}${g.ent ? ` <span class="muted">· ${esc(g.ent)}</span>` : ''}</div>` : ''}
      <div class="chips">${tags}</div>${g.note ? `<div class="muted">💬 ${esc(g.note)}</div>` : ''}
      ${t !== -1 ? `<div class="btnrow">${nx}${g.kind === 'del' && isAdmin() ? '<button class="btn sm" data-a="goCourSet">👤 Кур\'єр</button>' : ''}${isAdmin() ? '<button class="btn sm" data-a="goEdit">✏️</button>' : ''}<button class="btn sm green" data-a="goDone">🤝 Видано · ${money(b?.pay2 || 0)}</button></div>` : ''}</div>`;
  }
  // ☎️ нове «з собою» / доставка: телефон → клієнт (імʼя, бонуси, адреси чипами), час і оплата чипами
  async function goNew(kind0 = 'pick', fromT = 0) {
    const hm = m => { const d = new Date(Date.now() + m * 60e3); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
    const chip = (grp, v, l, on) => `<button class="chip sm${on ? ' on' : ''}" data-g="${grp}" data-v="${v}">${l}</button>`;
    const body = `<div class="gof"><div class="seg" id="gKind"><button class="${kind0 === 'pick' ? 'on' : ''}" data-k="pick">🥡 Самовивіз</button><button class="${kind0 === 'del' ? 'on' : ''}" data-k="del">🛵 Доставка</button></div>
      <div class="gof-r"><input id="gP" type="tel" inputmode="tel" placeholder="📞 Телефон 050 123 45 67" autocomplete="off"><input id="gN" placeholder="👤 Імʼя"></div>
      <div id="gCli" class="gof-cli" hidden></div>
      <div id="gAL" class="gof-r" ${kind0 === 'del' ? '' : 'hidden'}><input id="gA" placeholder="📍 Адреса"><input id="gE" class="gof-s" placeholder="🚪 Підʼїзд, поверх"></div>
      <div id="gAdr" class="chips scroll" hidden></div>
      <div class="gof-l">🕐 Коли</div><div class="chips" id="gWc">${chip('w', '', '⚡ Одразу', 1)}${chip('w', 30, '+30 хв')}${chip('w', 60, '+60 хв')}${chip('w', 'own', '✏️ Свій')}<input id="gW" class="gof-t" placeholder="19:30" inputmode="numeric" hidden></div>
      <div class="gof-l">💰 Оплата</div><div class="chips" id="gPc">${chip('p', 'cash', '💵 Готівка', 1)}${chip('p', 'card', '💳 Картка')}<input id="gCh" class="gof-t" placeholder="решта з…" inputmode="numeric"></div></div>`;
    const pr = modal({ title: '☎️ Замовлення з собою', body, buttons: [{ label: 'Далі → меню', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    let kind = kind0, when = '', pay = 'cash';
    $('#gKind').onclick = e => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return; kind = k; $('#gKind').querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.k === k)); $('#gAL').hidden = k !== 'del'; $('#gAdr').hidden = k !== 'del' || !$('#gAdr').innerHTML; };
    const pick = (box, el) => box.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === el));
    $('#gWc').onclick = e => { const el = e.target.closest('[data-g]'); if (!el) return; pick($('#gWc'), el); const v = el.dataset.v; $('#gW').hidden = v !== 'own'; when = v === 'own' ? '' : v ? hm(+v) : ''; if (v === 'own') $('#gW').focus(); else $('#gW').value = when; };
    $('#gPc').onclick = e => { const el = e.target.closest('[data-g]'); if (!el) return; pick($('#gPc'), el); pay = el.dataset.v; $('#gCh').hidden = pay !== 'cash'; };
    $('#gAdr').onclick = e => { const el = e.target.closest('[data-v]'); if (!el) return; $('#gA').value = el.dataset.v; pick($('#gAdr'), el); };
    $('#gP').onchange = async () => { const r = await api('cliGet', { phone: $('#gP').value }).catch(() => null), box = $('#gCli'); box.hidden = false;
      if (!r?.cli) { box.textContent = r ? '🆕 Новий клієнт' : '⚠️ Перевірте номер'; $('#gAdr').hidden = true; return; }
      const c = r.cli; if (!$('#gN').value) $('#gN').value = c.name || '';
      box.innerHTML = `👤 <b>${esc(c.name || 'Клієнт')}</b> · ${c.n} замовл. · 🎁 <b>${money(c.bal || 0)}</b>`;
      $('#gAdr').innerHTML = (c.addr || []).map((a, i) => `<button class="chip sm${i ? '' : ' on'}" data-v="${esc(a)}">📍 ${esc(a)}</button>`).join(''); $('#gAdr').hidden = kind !== 'del' || !c.addr?.length;
      if (!$('#gA').value && c.addr?.[0]) $('#gA').value = c.addr[0]; };
    setTimeout(() => $('#gP')?.focus(), 50);
    const v = await pr; if (v !== 'ok') return closeModal();
    if ($('#gW').hidden === false) when = $('#gW').value.trim();
    const d = { kind, phone: $('#gP').value, name: $('#gN').value.trim(), addr: $('#gA').value.trim(), ent: $('#gE').value.trim(), when, pay, change: pay === 'cash' ? +$('#gCh').value || 0 : 0 }; closeModal();
    if (kind === 'del' && !d.name) return toast('⚠️ Вкажіть імʼя'); if (kind === 'del' && !d.addr) return toast('⚠️ Вкажіть адресу'); /* 🥡 самовивіз — усе необовʼязково */
    if (d.when && !/^\d{1,2}:\d{2}$/.test(d.when)) return toast('⚠️ Час у форматі 19:30');
    S.goDraft = d; S.tw[-1] = true;
    if (fromT) { S.carts[-1] = S.carts[fromT] || {}; S.coms[-1] = S.coms[fromT] || ''; S.packAdj[-1] = S.packAdj[fromT] || 0; S.ur[-1] = S.ur[fromT]; S.carts[fromT] = {}; S.coms[fromT] = ''; S.tw[fromT] = false; S.packAdj[fromT] = 0; saveCarts(); }
    openTable(-1); S.mobileMenu = !fromT; renderSheet();
  }
  async function goDone(t) {
    const b = S.tables[t], g = b?.go; if (!g) return;
    let pay = g.paid ? 'card' : null;
    if (!pay) { pay = await choose(`🤝 ${tn(t)} видано`, `До сплати ${money(b.pay2)}${g.change ? ` · решта з ${g.change}` : ''}`, [{ label: '💵 Готівка', val: 'cash', cls: 'green' }, { label: '💳 Картка', val: 'card', cls: 'blue' }]); if (!pay) return; }
    if (await act('goSt', { t, st: 'done', pay }, `🤝 ${tn(t)} видано`)) { if (S.open === t) closeSheet?.(); await loadState().catch(() => {}); if (S.view === 'go') renderMain(); }
  }
  async function cliT(t) {
    const b = S.tables[t]; if (!b) return;
    let ph = b.cli; if (!ph) { ph = await ask('🎁 Телефон гостя (для бонусів)', '050 123 45 67', 'tel'); if (!ph) return; }
    const r = await api('cliGet', { phone: ph }).catch(e => { toast('⚠️ ' + (e.message || 'номер?')); return null; }); if (!r) return;
    const c = r.cli || { n: 0, sum: 0, bal: 0 }, max = r.mem ? Math.min(c.bal || 0, Math.floor(b.total * (r.cfg.bmax || 0) / 100)) : 0;
    if (!b.cli) await act('cliSet', { t, phone: r.phone });
    if (!r.mem) { // 📱 не в програмі лояльності — запрошуємо в бот гостей (QR / посилання)
      const link = r.bot ? `https://t.me/${r.bot}?start=join` : '';
      const v = await modal({ title: `📱 ${c.name || fmtPh(r.phone)} — ще не в програмі`, body: `<div class="muted set-note">Бонуси, знижки постійним і подарунок на ДН — лише для тих, хто підключив наш Telegram-бот (щоб ми могли написати гостю).${c.n ? ` Візитів уже ${c.n}${c.bal ? `, накопичено ${money(c.bal)} бонусів — стануть доступні після підключення` : ''}.` : ''}</div>${link ? `<div style="text-align:center;margin:10px 0"><img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(link)}" width="220" height="220" alt="QR" style="border-radius:12px;background:#fff"><div class="muted" style="margin-top:6px">Гість сканує камерою → «Почати» → «📱 Поділитися номером»<br><b>${esc('@' + r.bot)}</b></div></div>` : ''}`, buttons: [{ label: 'Готово', val: null }, { label: '✕ Прибрати номер', val: 'del', cls: 'red' }] });
      if (v === 'del') await act('cliSet', { t, phone: '' }, 'Прибрано');
      return loadState().catch(() => {});
    }
    if (!b.cli) await loadState().catch(() => {}); const pr = S.tables[t]?.promo; // 🎁 рівень і акції підставились сервером
    const v = await choose(`🎁 ${c.name || fmtPh(r.phone)}`, `${pr?.lvn ? pr.lvn + ' · ' : ''}${c.n} замовл. · ${money(c.sum)} · бонусів ${money(c.bal || 0)}${c.bd ? ` · 🎂 ${c.bd.slice(3)}.${c.bd.slice(0, 2)}` : ''} · кешбек ${pr?.cash || r.cfg.cash}% нарахується при закритті${c.note ? ` · 📌 ${c.note}` : ''}`, [
      ...(max > 0 ? [{ label: `Списати ${money(max)}`, val: 'use', cls: 'primary' }] : []), ...(r.cli ? [{ label: '👤 Картка клієнта', val: 'card' }] : []), { label: '✕ Прибрати гостя', val: 'del', cls: 'red' }]);
    if (v === 'card') return loyCliCard(r.phone);
    if (v === 'use') await act('cliBonus', { t, sum: max }, '🎁 Бонуси списано'); else if (v === 'del') await act('cliSet', { t, phone: '' }, 'Прибрано');
    await loadState().catch(() => {});
  }
  // 🛵 екран кур'єра: Нові / Мої / Сьогодні (як кухня, без стрічки)
  async function loadCour() { S.data.cour = await api('courMe'); renderMain(); }
  const minsAgo = ts => ts ? Math.max(0, Math.round((Date.now() - ts) / 60e3)) : 0;
  function goHTML() {
    const me = S.me?.name, C = S.data.cour, all = Object.values(S.tables).filter(b => b.t > 1000 && b.t < 2000 && b.go && !['new', 'done', 'rej'].includes(b.go.st));
    const fresh = all.filter(b => !b.go.cour), mine = all.filter(b => b.go.cour === me).sort((a, b) => (a.go.takeAt || 0) - (b.go.takeAt || 0));
    const seen = (S.courSeen ||= new Set()); if (S.courReady && fresh.some(b => !seen.has(b.t)) || mine.some(b => b.go.st === 'ready' && !seen.has('r' + b.t))) { ding(); navigator.userActivation?.hasBeenActive && navigator.vibrate?.([200, 100, 200]); }
    fresh.forEach(b => seen.add(b.t)); mine.forEach(b => { if (b.go.st === 'ready') seen.add('r' + b.t); }); S.courReady = true;
    const tab = S.courTab || (mine.length ? 'mine' : 'new');
    const items = b => b.items.filter(i => !i.name.includes('Доставка')).map(i => `${i.q}× ${esc(i.name)}`).join(', ');
    const card = (b, my) => { const g = b.go, map = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(g.addr + ', Поляниця')}&travelmode=driving`;
      return `<div class="cr-c st-${g.st}${g.prob ? ' prob' : ''}"><div class="cr-h"><b>${tn(b.t)}</b><span class="chip">${g.when ? '🕐 на ' + g.when : '⚡ якнайшвидше'}</span><span class="chip">${GOST[g.st]}</span><small>${minsAgo(g.accAt || g.at)} хв</small></div>
        ${g.st === 'ready' && my ? '<div class="cr-ready">🍽 ГОТОВО — ЗАБИРАЙ!</div>' : ''}${g.prob ? `<div class="cr-prob">⚠️ ${esc(g.prob.text)}</div>` : ''}
        <a class="cr-addr" href="${map}" target="_blank" rel="noopener">📍 ${esc(g.addr)}${g.ent ? ` · ${esc(g.ent)}` : ''}</a>
        <div class="cr-row"><span>👤 ${esc(g.name)}</span><a class="btn sm" href="tel:+${g.phone}">📞 ${fmtPh(g.phone)}</a></div>
        <div class="muted">🍽 ${items(b)}${g.cut ? ` · 🍴 ${g.cut}` : ''}</div>
        <div class="cr-pay">${g.paid ? '💳 оплачено онлайн' : `<b class="money">${money(b.pay2)}</b><span>${g.pay === 'card' ? '💳 термінал' : '💵 готівка'}${g.change ? ` · решта з <b>${g.change}</b>` : ''}</span>`}</div>
        ${my ? `<div class="cr-act">${g.st !== 'road' ? `<button class="btn green" data-a="crAct" data-t="${b.t}" data-x="road">🛵 Поїхав</button>` : `<div class="cr-eta">${g.etaC ? `<div class="cr-etac">⏱ гостю сказано: буду о <b>${hhmm(g.etaC)}</b></div>` : '<div class="cr-etac muted">⏱ Коли будете в гостя? Гість побачить час</div>'}${[5, 10, 15, 20].map(m => `<button class="btn sm" data-a="crAct" data-t="${b.t}" data-x="eta" data-v="${m}">⏱ ${m} хв</button>`).join('')}</div>`}
            <button class="btn primary" data-a="crDone" data-t="${b.t}">🤝 Видано</button></div>
          <div class="btnrow"><button class="btn sm" data-a="crAct" data-t="${b.t}" data-x="km" data-v="soon">💬 Буду за 5 хв</button><button class="btn sm" data-a="crAct" data-t="${b.t}" data-x="km" data-v="here">💬 Я на місці</button><button class="btn sm red" data-a="crProb" data-t="${b.t}">⚠️ Проблема</button></div>`
        : `<button class="btn primary cr-take" data-a="crAct" data-t="${b.t}" data-x="take">✋ Беру</button>`}</div>`; };
    const d = C?.day || { n: 0, left: 0, earn: 0, list: [] };
    const head = `<div class="cr-top"><div><h1>🛵 ${esc(me || '')}</h1><span class="muted">${onShift() ? '🟢 на зміні' : 'зміну не розпочато'}</span></div>
      <div class="btnrow">${onShift() ? '<button class="btn sm red" data-a="zpOut">🔴 Закінчити зміну</button>' : '<button class="btn sm green" data-a="zpIn">🟢 Почати зміну</button>'}${C?.bot ? `<button class="btn sm${C.linked ? '' : ' primary'}" data-a="crTg">✈️ ${C.linked ? 'Telegram ✓' : 'Підключити Telegram'}</button>` : ''}</div></div>
      <div class="kpis cr-k"><div class="kpi"><span>Доставок сьогодні</span><b>${d.n}</b></div><div class="kpi accent"><span>💵 Готівка на руках</span><b class="money">${money(d.left)}</b></div><div class="kpi"><span>💰 Заробіток</span><b class="money">${money(d.earn)}</b></div></div>`;
    const tabs = `<div class="seg cr-tabs">${[['new', `🆕 Нові${fresh.length ? ` · ${fresh.length}` : ''}`], ['mine', `🛵 Мої${mine.length ? ` · ${mine.length}` : ''}`], ['done', `✅ Сьогодні · ${d.n}`]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}${k === 'new' && fresh.length ? ' blink' : ''}" data-a="crTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    const col = { new: fresh.map(b => card(b, false)).join('') || '<div class="cr-empty">Нових доставок немає<br><small>щойно адмін прийме замовлення — тут пролунає звук</small></div>',
      mine: (mine.length > 1 && C?.route ? `<a class="btn cr-route" href="${C.route}" target="_blank" rel="noopener">🗺 Маршрут через усі ${mine.length} адреси</a>` : '') + (mine.map(b => card(b, true)).join('') || '<div class="cr-empty">У вас немає доставок</div>'),
      done: d.list.map(x => `<div class="kv"><span><b>${tn(x.t)}</b> · ${x.at}${x.mins != null ? ` · в дорозі ${x.mins} хв` : ''}</span><b class="money">${money(x.sum)} ${x.pay === 'card' ? '💳' : '💵'}</b></div>`).join('') || '<div class="cr-empty">Ще нічого не доставлено</div>' };
    return head + tabs + `<div class="cr-cols t-${tab}"><section class="c-new"><h3>🆕 Нові</h3>${col.new}</section><section class="c-mine"><h3>🛵 Мої</h3>${col.mine}</section><section class="c-done"><h3>✅ Сьогодні</h3><div class="card">${col.done}</div></section></div>`;
  }
  // 🛵 контроль доставок для адміна (екран «Кухня»): нові / в дорозі / сьогодні — без кнопок кур'єра
  function goCtlHTML() {
    if (!S.data.courAt || Date.now() - S.data.courAt > 30e3) { S.data.courAt = Date.now(); api('courList').then(r => { S.data.cours = r; if (S.view === 'kq') renderMain(); }).catch(() => {}); }
    const all = Object.values(S.tables).filter(b => b.t > 1000 && b.t < 2000 && b.go && !['done', 'rej'].includes(b.go.st)).sort((a, b) => (a.go.accAt || a.go.at || 0) - (b.go.accAt || b.go.at || 0));
    const fresh = all.filter(b => !b.go.cour), act = all.filter(b => b.go.cour);
    const items = b => b.items.filter(i => !i.name.includes('Доставка')).map(i => `${i.q}× ${esc(i.name)}`).join(', ');
    const card = b => { const g = b.go, late = g.st === 'new' || (!g.cour && minsAgo(g.accAt || g.at) >= 3);
      return `<div class="cr-c st-${g.st}${g.prob ? ' prob' : ''}${late && !g.cour ? ' late' : ''}" data-t="${b.t}"><div class="cr-h"><b>${tn(b.t)}</b><span class="chip sm">${g.when ? '🕐 ' + g.when : '⚡'}</span><span class="chip sm">${GOST[g.st] || g.st}</span><small>${minsAgo(g.accAt || g.at)} хв</small></div>
        <div>${g.cour ? `🛵 <b>${esc(g.cour)}</b>${g.st === 'road' && g.roadAt ? ` · в дорозі ${minsAgo(g.roadAt)} хв` : ''}${g.etaC ? ` · ⏱ буду о ${hhmm(g.etaC)}` : ''}` : '⚠️ <b>кур\'єра немає</b>'}</div>
        ${g.prob ? `<div class="cr-prob">⚠️ ${esc(g.prob.text)}</div>` : ''}<div class="cr-addr">📍 ${esc(g.addr || '—')}${g.ent ? ` · ${esc(g.ent)}` : ''} · 👤 ${esc(g.name || '')}</div>
        <div class="muted">🍽 ${items(b)}</div>
        <div class="btnrow"><button class="btn sm${g.cour ? '' : ' primary'}" data-a="goCourSet" data-t="${b.t}">👤 ${g.cour ? 'Змінити кур\'єра' : 'Призначити'}</button><button class="btn sm" data-a="table" data-t="${b.t}">Відкрити</button></div></div>`; };
    const C = (S.data.cours?.list || []), done = C.flatMap(c => (c.list || []).map(x => ({ ...x, n: c.name }))).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const route = act.some(b => b.go.addr) && all.length ? `<button class="btn sm" data-a="goMap">🗺 Карта · ${act.length + fresh.length}</button>` : '';
    return `<div class="khead" style="margin-top:22px"><h1>🛵 Доставки <span class="muted">${all.length}</span></h1><div class="btnrow">${route}</div></div>
      <div class="cr-cols t-all"><section><h3>🆕 Нові${fresh.length ? ` · ${fresh.length}` : ''}</h3>${fresh.map(card).join('') || '<div class="cr-empty">Нових немає</div>'}</section>
      <section><h3>🛵 В роботі${act.length ? ` · ${act.length}` : ''}</h3>${act.map(card).join('') || '<div class="cr-empty">Ніхто не їде</div>'}</section>
      <section><h3>✅ Сьогодні · ${done.length}</h3><div class="card">${done.map(x => `<div class="kv"><span><b>${tn(x.t)}</b> · ${x.at} · ${esc(x.n)}${x.mins != null ? ` · ${x.mins} хв` : ''}</span><b class="money">${money(x.sum)} ${x.pay === 'card' ? '💳' : '💵'}</b></div>`).join('') || '<div class="cr-empty">Ще нічого</div>'}</div></section></div>`;
  }
  function courCard() {
    const L = S.data.cours?.list?.filter(c => c.n || c.left) || []; if (!L.length) return '';
    return `<div class="card cr-adm"><h3>🛵 Кур'єри сьогодні</h3>${L.map(c => `<div class="kv"><span><b>${esc(c.name)}</b> ${c.tg ? '✈️' : ''}<br><small class="muted">${c.n} доставок${c.avg != null ? ` · ⌀ ${c.avg} хв у дорозі` : ''} · заробіток ${money(c.earn)}${c.given ? ` · здав ${money(c.given)}` : ''}</small></span><span class="kv-r"><b class="money">${money(c.left)}</b>${c.left > 0 ? `<button class="btn sm green" data-a="crGive" data-n="${esc(c.name)}" data-v="${c.left}">✅ Отримав</button>` : ''}</span></div>`).join('')}</div>`;
  }
  function goSetHTML() {
    const c = S.data.gocfg; if (!c) return '<div class="muted">Завантаження…</div>';
    const row = (k, l, v, hint) => `<div class="kv"><span>${l}${hint ? `<br><small class="muted">${hint}</small>` : ''}</span><span class="kv-r"><b>${v}</b><button class="btn sm" data-a="goCfg" data-k="${k}" data-l="${esc(l)}">${['on', 'del', 'pick'].includes(k) ? (c[k] ? 'вимкнути' : 'увімкнути') : 'змінити'}</button></span></div>`;
    const yn = v => v ? '✅ так' : '⛔ ні';
    return `<div class="grid2 set">
      <div class="card"><h3>🛵 Прийом онлайн-замовлень</h3>${row('on', '🌐 Приймати з сайту', yn(c.on))}${row('pick', '🥡 Самовивіз', yn(c.pick))}${row('del', '🛵 Доставка', yn(c.del))}
        ${row('from', '🕐 Приймаємо з', c.from)}${row('to', '🕐 Приймаємо до', c.to, 'Поза цим часом гість може замовити лише на час')}${row('prep', '⏱ Готуємо приблизно', c.prep + ' хв', 'Для «орієнтовно о…» у гостя')}${row('phone', '📞 Телефон закладу', esc(c.phone || '—'), 'Показується гостю на екрані статусу')}</div>
      <div class="card"><h3>💰 Умови</h3>${row('min', '🧾 Мінімальне замовлення', money(c.min))}${row('fee', '🛵 Ціна доставки', money(c.fee))}${row('free', '🎁 Безкоштовна доставка від', c.free ? money(c.free) : '—', '0 — завжди платна')}${row('zone', '📍 Зона доставки', esc(c.zone || '—'), 'Текст для гостя: райони, межі')}${row('cpay', '🛵 Кур\'єру за доставку', money(c.cpay), 'Додається у відомість ЗП; можна змінити кожному в Персоналі')}</div>
      <div class="card"><h3>🎁 Бонуси за телефоном</h3>${row('cash', '💸 Кешбек', c.cash + '%', 'Нараховується при закритті чека (сайт, каса, зал)')}${row('bmax', '🎟 Бонусами можна оплатити до', c.bmax + '%', 'від суми замовлення')}</div>
      <div class="card"><h3>🔗 Посилання для гостей</h3><div class="muted set-note">Інстаграм, Google Maps, месенджери — гість відкриває і замовляє з собою. Окремі посилання показують у звітах, звідки прийшло замовлення.</div>
        <div class="btnrow"><button class="btn sm primary" data-a="goLink">📋 Основне</button><button class="btn sm" data-a="goLink" data-src="insta">Instagram</button><button class="btn sm" data-a="goLink" data-src="google">Google</button><button class="btn sm" data-a="goLink" data-src="tiktok">TikTok</button></div>
</div>
      <div class="card"><h3>🛵 Кур'єри</h3><div class="muted set-note">Реєстрація в касі кодом <b>${esc(S.data.staff?.reg?.courier || '1114')}</b> → у своєму екрані кур'єр натискає «✈️ Підключити Telegram». Бот кур'єрів: ${S.data.cours?.bot ? `<a href="https://t.me/${esc(S.data.cours.bot)}" target="_blank" rel="noopener">@${esc(S.data.cours.bot)}</a>` : '—'}</div>
        ${(S.data.cours?.list || []).map(c => `<div class="kv"><span>${esc(c.name)}</span><span class="kv-r">${c.tg ? '✈️ Telegram підключено' : '<span class="muted">без Telegram</span>'}</span></div>`).join('') || '<div class="muted">Кур\'єрів ще немає</div>'}</div></div>`;
  }
  // 🗺 зал: кнопка «Карта доставок» над рядом Д-/С- і підпис плитки Д- (хто везе, скільки в дорозі)
  function goMapBtn(gos) { const n = gos.filter(b => b.t < 2000 && b.go.addr && !['new', 'done', 'rej'].includes(b.go.st)).length;
    return n && isAdmin() ? `<div class="btnrow go-map"><button class="btn sm" data-a="goMap">🗺 Карта доставок · ${n}</button></div>` : ''; }
  function goTileInfo(g) { if (g.kind !== 'del' || !g.cour) return '';
    return ` · 🛵 ${esc(g.cour)}${g.st === 'road' && g.roadAt ? ` · ${minsAgo(g.roadAt)} хв` : ''}`; }
  async function goEdit(t) {
    const g = S.tables[t]?.go; if (!g) return;
    const body = `<div class="form"><label>Імʼя<input id="eN" value="${esc(g.name || '')}"></label><label>Телефон<input id="eP" type="tel" value="${esc(g.phone ? '+' + g.phone : '')}"></label>
      ${g.kind === 'del' ? `<label>Адреса<input id="eA" value="${esc(g.addr || '')}"></label><label>Підʼїзд / поверх<input id="eE" value="${esc(g.ent || '')}"></label>` : ''}
      <label>На котру<input id="eW" placeholder="19:30" value="${esc(g.when || '')}"></label><label>Коментар<input id="eC" value="${esc(g.note || '')}"></label></div>`;
    const v = await modal({ title: `✏️ ${tn(t)}`, body, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    if (v !== 'ok') return closeModal();
    const d = { t, name: $('#eN').value, phone: $('#eP').value, when: $('#eW').value, note: $('#eC').value, ...(g.kind === 'del' ? { addr: $('#eA').value, ent: $('#eE').value } : {}) }; closeModal();
    if (await act('goEdit', d, '✏️ Збережено · кур\'єру надіслано')) loadState().catch(() => {});
  }
  async function goMap() { const r = await api('goMap').catch(e => { toast('⚠️ ' + (e.message || 'Помилка')); return null; }); if (r?.url) open(r.url, '_blank', 'noopener'); }
  // 🛵 звіт по кур'єрах за місяць (Звіти → Персонал → Кур'єри)
  async function loadCourRep(m) { S.data.courRep = { m, wait: 1 }; renderMain(); S.data.courRep = await api('courRep', { m }).catch(() => ({ m, list: [] })); renderMain(); }
  function courRepHTML() {
    const R = S.data.courRep; if (!R) { setTimeout(() => loadCourRep(new Date().toISOString().slice(0, 7))); return '<div class="muted">Завантаження…</div>'; }
    const sh = d => { const [y, mo] = R.m.split('-').map(Number), x = new Date(Date.UTC(y, mo - 1 + d, 1)); return x.toISOString().slice(0, 7); };
    const PR = { noans: '📵', addr: '📍', refuse: '🙅' }, mn = v => v == null ? '—' : v + ' хв';
    const nav = `<div class="btnrow"><button class="btn sm" data-a="crRepM" data-m="${sh(-1)}">‹</button><b>🛵 ${R.m}</b><button class="btn sm" data-a="crRepM" data-m="${sh(1)}">›</button></div>`;
    if (R.wait) return nav + '<div class="muted">Завантаження…</div>';
    if (!R.list.length) return nav + '<div class="card"><div class="muted">Доставок за місяць немає</div></div>';
    return nav + `<div class="dash">${R.list.map(x => { const pr = Object.entries(x.prob || {}), pn = pr.reduce((a, p) => a + p[1], 0);
      return `<div class="card"><h3>🛵 ${esc(x.name)}</h3><div class="kv"><span>📦 Доставок</span><b>${x.n}</b></div><div class="kv"><span>💰 Сума чеків</span><b class="money">${money(x.sum)}</b></div>
        <div class="kv"><span>🛣 Поїхав → видано, сер.</span><b>${mn(x.road)}</b></div><div class="kv"><span>⏱ Замовлення → видано, сер.</span><b>${mn(x.tot)}</b></div>
        <div class="kv"><span>⏰ Запізнення (пізніше «на котру»)</span><b>${x.late}</b></div><div class="kv"><span>⚠️ Проблеми</span><b>${pn ? pr.map(([k, q]) => `${PR[k] || '⚠️'} ${q}`).join(' ') : 0}</b></div></div>`; }).join('')}</div>`;
  }
  document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el) return; const a = el.dataset.a;
    if (a === 'goMap') goMap(); else if (a === 'crRepM') loadCourRep(el.dataset.m); else if (a === 'goEdit') goEdit(S.open); });
