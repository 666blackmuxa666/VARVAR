  async function loadPay() { S.zpM ||= curMon(); S.data.zp = await api('zpGrid', { m: S.zpM }, 20000); }
  function teamHTML() { return `<div class="rhead"><div><h1>Персонал</h1><span class="muted">графік змін, зарплата, працівники</span></div></div>${payHTML()}`; }
  function payHTML() {
    const G = S.data.zp; if (!G) return '<div class="muted">Завантаження…</div>';
    const people = G.staff.filter(s => s.role !== 'courier' && !(G.hide || []).includes(s.name) && (s.pay?.rate || s.pay?.pct || (G.seen || []).includes(s.name) || G.days.some(d => G.att[d]?.[s.name] || G.plan[d]?.[s.name]))).map(s => s.name); // зі ставкою — завжди в графіку
    const rows = G.rows.filter(r => people.includes(r.n) || r.paid || r.adv || r.bonus || r.fine), due = rows.reduce((a, r) => a + Math.max(0, r.due), 0), pend = rows.reduce((a, r) => a + r.pending, 0);
    const tab = S.zpTab || 'grid', TABS = [['grid', '📅 Графік'], ['pay', '💰 Зарплата'], ['ops', '🧾 Операції'], ['eff', '📊 Ефективність'], ['plan', '📋 План'], ['people', '👥 Працівники'], ['ideas', '💡 Побажання']];
    const top = `<div class="zp-top"><button class="btn sm" data-a="zpM" data-d="-1">◀</button><b>${monName(G.m)}</b><button class="btn sm" data-a="zpM" data-d="1">▶</button></div>
      ${['pay', 'ops', 'eff'].includes(tab) ? `<div class="kpis"><div class="kpi accent"><span>До виплати</span><b class="money">${money(due)}</b></div><div class="kpi"><span>Фонд оплати</span><b class="money">${money(G.fund)}</b><small class="muted">${G.fundPct}% від виручки</small></div>
        <div class="kpi"><span>Виручка місяця</span><b class="money">${money(G.revenue)}</b></div><div class="kpi ${pend ? 'red press' : ''}"${pend ? ' data-a="zpPend"' : ''}><span>Чекає ✅</span><b>${pend}</b><small class="muted">${pend ? 'натисніть, щоб підтвердити' : 'усе підтверджено'}</small></div></div>
` : ''}
      <div class="seg rsec">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="zpTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'grid') {
      const sw = (G.swaps || []).map(s => `<div class="kv"><span>🔁 ${s.day.slice(8)}.${s.day.slice(5, 7)}: <b>${esc(s.from)}</b> → <b>${esc(s.to)}</b> <span class="muted">${s.st === 'ask' ? '· чекає згоди колеги' : '· колега погодився'}</span></span><span class="kv-r">${s.st === 'agreed' ? `<button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="ok">✅</button>` : ''}<button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">❌</button></span></div>`).join('');
      body = `<div class="card">${gridHTML(G, people, true)}<div class="zp-leg muted">Тап: майбутнє — ● заплановано, сьогодні й раніше — ✅ був; ще раз — скасувати · 🕓 чекає · ⏰ запізнення · 🚫 прогул · ⚠️ закрито автоматично</div>
        <div class="btnrow"><button class="btn sm primary" data-a="zpAddP">➕ Додати в графік</button><button class="btn sm" data-a="zpCopy">📋 Скопіювати минулий тиждень</button></div></div>${sw ? `<div class="card"><h3>🔁 Обміни змінами</h3>${sw}</div>` : ''}`;
    } else if (tab === 'pay') {
      const role = r => r.role === 'cook' ? 'кухар' : r.role === 'admin' ? 'адмін' : r.role === 'courier' ? 'кур\'єр' : 'офіціант';
      const cond = p => !p.rate && !p.pct ? '<span class="warn">ставку не задано</span>' : `${p.rate ? money(p.rate) + '/зміна' : ''}${p.pct ? ` · ${p.pct}% ${{ all: 'виручки', own: 'своїх чеків', kitchen: 'кухні' }[p.base || 'all']}` : ''}${p.dayRev || p.monRev ? ' · 🎯' : ''}`;
      body = `<div class="card zp-pay"><div class="zp-pr th"><span>Працівник</span><span>Змін</span><span>Нараховано</span><span>Видано</span><span>До виплати</span><span></span></div>
        ${rows.map(r => { const open = S.zpOpen === r.n, ln = (l, v, c = '') => `<div class="kv ${c}"><span>${l}</span><b class="money">${v}</b></div>`;
          return `<div class="zp-pr press" data-a="zpRow" data-n="${esc(r.n)}"><span><b>${esc(r.n)}</b><small class="muted">${role(r)} · ${cond(r.pay || {})}</small></span><span>${r.shifts}${r.pending ? `<small class="warn">+${r.pending}🕓</small>` : ''}</span><span class="money">${money(r.earned)}</span><span class="money muted">${r.adv + r.paid ? money(r.adv + r.paid) : '—'}</span><b class="money ${r.due > 0 ? 'acc' : ''}">${money(r.due)}</b>
            <span class="zp-act">${r.due > 0 ? `<button class="btn sm primary" data-a="zpPay" data-n="${esc(r.n)}" data-v="${r.due}">💸</button>` : ''}<i>${open ? '▴' : '▾'}</i></span></div>
            ${open ? `<div class="zp-det"><div class="zp-det-l">${ln(`Ставка × ${r.shifts} змін${r.hours ? ` (${r.hours} год)` : ''}`, money(r.rate))}${r.pct ? ln(`% від ${money(r.baseSum)}`, money(r.pct)) : ''}${r.dlv ? ln(`🛵 Доставки × ${r.dlvN}`, money(r.dlv)) : ''}${r.dayB || r.monB ? ln('🎯 Бонус за план', money(r.dayB + r.monB)) : ''}${r.bonus ? ln('➕ Премії', money(r.bonus), 'good') : ''}${r.fine ? ln('➖ Штрафи', '−' + money(r.fine), 'bad') : ''}${r.adv ? ln('💵 Аванси', '−' + money(r.adv)) : ''}${r.paid ? ln('💸 Виплачено', '−' + money(r.paid)) : ''}
              ${r.toMon ? `<div class="muted" style="font-size:12px">🎯 до місячного бонусу ще ${money(r.toMon)}</div>` : ''}${r.tips ? `<div class="muted" style="font-size:12px">💝 чайові окремо: ${money(r.tips)}</div>` : ''}${r.late || r.absent ? `<div class="warn" style="font-size:12px">${r.late ? `⏰ запізнень ${r.late}` : ''}${r.late && r.absent ? ' · ' : ''}${r.absent ? `🚫 прогулів ${r.absent}` : ''}</div>` : ''}</div>
              <div class="zp-det-b"><button class="btn sm" data-a="zpOpN" data-t="bonus" data-n="${esc(r.n)}">➕ Премія</button><button class="btn sm" data-a="zpOpN" data-t="fine" data-n="${esc(r.n)}">➖ Штраф</button><button class="btn sm" data-a="zpOpN" data-t="adv" data-n="${esc(r.n)}">💵 Аванс</button><button class="btn sm" data-a="zpSet" data-id="${r.id}">⚙️ Ставка</button></div></div>` : ''}`; }).join('') || '<div class="muted">Немає працівників у графіку</div>'}
        <div class="muted" style="font-size:12px;margin-top:8px">Натисніть на рядок — деталі, премія, штраф, аванс, ставка. 💸 — видати весь залишок (з каси або картки).</div></div>`;
    } else if (tab === 'plan') { body = tkAdminHTML();
    } else if (tab === 'ideas') { const l = S.data.ideas; if (!l) ideasLoad(); body = `<div class="card"><h3>💡 Побажання персоналу щодо системи</h3><div class="muted set-note">Пишуть з особистого кабінету (👤 → «💡 Побажання») або в боті: <code>побажання текст</code>. ✅ — зроблено, 🗑 — видалити.</div>${!l ? '<div class="muted">…</div>' : l.length ? l.map(ideaRow).join('') : '<div class="muted">Поки порожньо</div>'}</div>`;
    } else if (tab === 'people') { body = settingsHTML('people');
    } else if (tab === 'ops') {
      const OPN = { bonus: '➕ Премія', fine: '➖ Штраф', adv: '💵 Аванс', paid: '💸 Виплата' };
      body = `<div class="card">${G.ops.map(o => `<div class="kv rrow${o.del ? ' del' : ''}"><span>${o.day.slice(8)}.${o.day.slice(5, 7)} ${OPN[o.t]} · <b>${esc(o.n)}</b>${o.src ? (o.src === 'card' ? ' 💳' : ' 💵') : ''}${o.note ? ` <span class="muted">· ${esc(o.note)}</span>` : ''}<br><small class="muted">${esc(o.by || '')}</small></span><span class="kv-r"><b class="money">${money(o.sum)}</b><button class="xb" data-a="zpOpDel" data-id="${o.id}" data-b="${o.del ? 1 : ''}">${o.del ? '↩️' : '🗑'}</button></span></div>`).join('') || '<div class="muted">Операцій цього місяця ще не було</div>'}</div>`;
    } else {
      const l = rows.filter(r => r.shifts).sort((a, b) => b.revPerShift - a.revPerShift), mx = Math.max(1, ...l.map(r => r.revPerShift));
      body = `<div class="card"><h3>Виручка закладу в дні, коли людина на зміні</h3>${l.map(r => `<div class="bar"><div class="bl"><span>${esc(r.n)}<br><small class="muted">${r.shifts} змін${r.hours ? ` · ${r.hours} год` : ''}${r.revPerHour ? ` · ${money(r.revPerHour)}/год` : ''}</small></span><b class="money">${money(r.revPerShift)}</b></div><i style="width:${Math.max(3, r.revPerShift / mx * 100)}%"></i></div>`).join('') || '<div class="muted">Ще немає підтверджених змін</div>'}</div>`;
    }
    return top + `<div class="zp-body">${body}</div>`;
  }
  function gridHTML(G, people, edit, me) {
    const today = todayK();
    return `<div class="zp-grid"><table><thead><tr><th></th>${G.days.map(d => { const w = new Date(d + 'T12:00:00Z').getUTCDay(); return `<th class="${d === today ? 'td' : ''}${w === 0 || w === 6 ? ' we' : ''}">${+d.slice(8)}<small>${WDL[w]}</small></th>`; }).join('')}</tr></thead>
      <tbody>${people.map(n => `<tr class="${n === me ? 'me' : ''}"><th>${edit ? `<button class="zp-x" data-a="zpDelP" data-n="${esc(n)}" title="Прибрати з графіка">✕</button>` : ''}${esc(n)}</th>${G.days.map(d => { const a = G.att[d]?.[n], p = G.plan[d]?.[n], h = hrs(a); return `<td class="${edit ? 'press' : ''}${d === today ? ' td' : ''}"${edit ? ` data-a="zpCell" data-d="${d}" data-n="${esc(n)}"` : ''}><i>${attIc(a, p, d)}</i>${p ? (p === '+' ? (a ? '' : '<i class="pl">●</i>') : `<small>${p}</small>`) : ''}${h ? `<small class="h">${h}г</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  // 🕓 усі, хто чекає підтвердження зміни — одним списком
  async function zpPend() {
    const G = S.data.zp, fine = G.cfg?.lateFine, L = [];
    for (const d of G.days) for (const [n, a] of Object.entries(G.att[d] || {})) if (a?.ok === 0) L.push({ d, n, a });
    if (!L.length) return toast('✅ Усе підтверджено');
    const body = `<div class="zp-pend">${L.map(({ d, n, a }) => `<div class="kv"><span><b>${esc(n)}</b><br><small class="muted">${d.slice(8)}.${d.slice(5, 7)}${a.in ? ` · прийшов ${hhK(a.in)}` : ''}${a.out ? `–${hhK(a.out)}` : ''}${a.late ? ` · ⏰ ${a.late} хв` : ''}</small></span><span class="kv-r"><button class="btn sm green" data-a="zpConf" data-d="${d}" data-n="${esc(n)}" data-h="o">✅</button>${a.late && fine ? `<button class="btn sm" data-a="zpConf" data-d="${d}" data-n="${esc(n)}" data-h="f">✅ + ${fine} ₴</button>` : ''}<button class="btn sm red" data-a="zpConf" data-d="${d}" data-n="${esc(n)}" data-h="n">❌</button></span></div>`).join('')}</div>`;
    const v = await modal({ title: `🕓 Чекають підтвердження · ${L.length}`, body, buttons: [{ label: `✅ Підтвердити всіх (${L.length})`, val: 'all', cls: 'primary' }, { label: 'Закрити', val: null }] });
    if (v === 'all') { for (const x of L) await act('zpAtt', { day: x.d, n: x.n, how: 'o' }); toast('✅ Підтверджено'); loadState().catch(() => {}); loadView(); }
  }
  async function zpCell(d, n) {
    const G = S.data.zp, a = G.att[d]?.[n], p = G.plan[d]?.[n], fine = G.cfg?.lateFine;
    // один тап: майбутній день — план ● / прибрати; сьогодні й раніше — був на зміні ✅ / прибрати (підтвердити 🕓)
    const upd = x => { (G.att[d] ||= {}); if (x) G.att[d][n] = x; else delete G.att[d][n]; renderMain(); };
    if (d > todayK()) { (G.plan[d] ||= {}); if (p) delete G.plan[d][n]; else G.plan[d][n] = '+'; renderMain(); if (!(await act('zpPlan', { day: d, n, time: p ? '' : '+' }))) loadView(); return; }
    if (a?.ok === 1) { upd(null); if (!(await act('zpAtt', { day: d, n, set: 'del' }))) loadView(); else loadView(true); return; }
    upd({ ...(a || {}), ok: 1 }); if (!(await act('zpAtt', a?.ok === 0 ? { day: d, n, how: 'o' } : { day: d, n, set: 'o' }))) loadView(); else loadView(true); return;
    const info = `${d.slice(8)}.${d.slice(5, 7)} · ${n}${p && p !== '+' ? ` · план ${p}` : ''}${a?.in ? ` · прийшов ${hhK(a.in)}` : ''}${a?.out ? ` · пішов ${hhK(a.out)}${a.auto ? ' (авто)' : ''}` : ''}${a?.late ? ` · запізнення ${a.late} хв` : ''}${a?.by ? ` · ✔ ${a.by}` : ''}`;
    const opts = a?.ok === 0 ? [{ label: '✅ Підтвердити', val: 'o', cls: 'primary' }, ...(a.late && fine ? [{ label: `✅ + штраф ${fine} ₴`, val: 'f' }] : []), { label: '❌ Відхилити', val: 'n', cls: 'red' }]
      : [a?.ok === 1 ? { label: '❌ Не був (зняти)', val: 'del', cls: 'red' } : { label: '✅ Був на зміні', val: 'set', cls: 'primary' }, { label: p && p !== '+' ? `🕐 Час початку (${p})` : '🕐 Вказати час початку', val: 'plan' }, ...(p ? [{ label: '🗑 Прибрати з плану', val: 'unplan' }] : [])];
    const v = await choose('👷 Зміна', info, opts); if (!v) return;
    if (v === 'plan') { const t = await ask(`📅 ${n}, ${d.slice(8)}.${d.slice(5, 7)}: о котрій початок?`, 'напр. 10:00'); if (!t) return; if (!/^\d{1,2}:\d{2}$/.test(t.trim())) return toast('⚠️ Формат часу: 10:00'); await act('zpPlan', { day: d, n, time: t.trim() }, '📅 Заплановано'); }
    else if (v === 'unplan') await act('zpPlan', { day: d, n, time: '' }, '🗑 Прибрано');
    else await act('zpAtt', ['o', 'f', 'n'].includes(v) ? { day: d, n, how: v } : { day: d, n, set: v === 'del' ? 'del' : 'o' }, '✔ Збережено');
    loadView();
  }
  async function zpSet(id) {
    const s = S.data.zp.staff.find(x => x.id === id), p = s?.pay || {}; if (!s) return;
    const body = `<div class="form"><div class="frow"><label>Ставка за зміну, ₴<input id="zR" inputmode="numeric" value="${p.rate || ''}" placeholder="напр. 600"></label><label>% від виручки<input id="zP" inputmode="decimal" value="${p.pct || ''}" placeholder="напр. 2"></label></div>
      <label>Відсоток рахувати від<select id="zB"><option value="all" ${p.base !== 'own' && p.base !== 'kitchen' ? 'selected' : ''}>усієї виручки дня (за дні на зміні)</option><option value="own" ${p.base === 'own' ? 'selected' : ''}>своїх чеків (офіціант стола)</option><option value="kitchen" ${p.base === 'kitchen' ? 'selected' : ''}>продажів кухні</option></select></label>
      <div class="muted" style="font-size:12px">🎯 План продажів (від тієї ж бази) — необовʼязково:</div>
      <div class="frow"><label>За зміну більше, ₴<input id="zDR" inputmode="numeric" value="${p.dayRev || ''}"></label><label>→ бонус, ₴<input id="zDB" inputmode="numeric" value="${p.dayBonus || ''}"></label></div>
      <div class="frow"><label>За місяць більше, ₴<input id="zMR" inputmode="numeric" value="${p.monRev || ''}"></label><label>→ бонус, ₴<input id="zMB" inputmode="numeric" value="${p.monBonus || ''}"></label></div>
      <label>🛵 За доставку, ₴ (кур'єру; порожньо — як у налаштуваннях)<input id="zDl" inputmode="numeric" value="${p.dlv ?? ''}"></label></div>`;
    const v = await modal({ title: `⚙️ ${s.name}: ставка`, body, buttons: [{ label: '💾 Зберегти', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const g = i => $('#' + i).value.replace(',', '.'), pay = v === 'ok' ? { rate: g('zR'), pct: g('zP'), base: $('#zB').value, dayRev: g('zDR'), dayBonus: g('zDB'), monRev: g('zMR'), monBonus: g('zMB'), dlv: $('#zDl').value.trim() } : null; closeModal();
    if (pay && await act('zpStaff', { id, pay }, '💾 Збережено')) loadView();
  }
  async function zpOpN(t, n, preset) {
    const T = { bonus: '➕ Премія', fine: '➖ Штраф', adv: '💵 Аванс', paid: '💸 Видати зарплату' }[t], money_ = t === 'adv' || t === 'paid';
    const body = `<div class="form"><label>Сума, ₴<input id="oS" inputmode="numeric" value="${preset || ''}"></label><input id="oN" placeholder="${t === 'fine' ? 'За що (напр. запізнення)' : 'Коментар'}"></div>`;
    const v = await modal({ title: `${T} · ${n}`, body, buttons: money_ ? [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З картки', val: 'card', cls: 'primary' }, { label: 'Скасувати', val: null }] : [{ label: 'OK', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const sum = v ? +$('#oS').value.replace(',', '.') : 0, note = v ? $('#oN').value.trim() : ''; closeModal();
    if (!v) return; if (!(sum > 0)) return toast('⚠️ Вкажіть суму');
    if (await act('zpOp', { n, t, sum, note, ...(money_ ? { src: v } : {}) }, money_ ? `💸 Видано ${money(sum)} ${v === 'card' ? 'з картки' : 'з каси'}` : '✔ Записано')) loadView();
  }
  const ideaRow = x => `<div class="kv idea" data-idea="${x.id}"><span style="min-width:0;overflow-wrap:anywhere">${x.done ? '✅ ' : ''}${esc(x.text)}<br><small class="muted">${esc(x.by)} · ${new Date(x.at).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' })}</small></span><span class="kv-r">${isAdmin() ? `<button class="btn sm" data-a="ideaDone" data-id="${x.id}">${x.done ? '↩️' : '✅'}</button>` : ''}<button class="btn sm red" data-a="ideaDel" data-id="${x.id}">🗑</button></span></div>`;
  async function ideasLoad() { if (S._idL) return; S._idL = 1; try { S.data.ideas = (await api('ideaList')).list; } catch { S.data.ideas = []; } S._idL = 0; if (S.view === 'team') renderMain(); }
  async function helpAsk() { // 🆘 пише розробнику системи в Telegram (не побажання, а «щось не працює / як зробити»)
    const text = await ask('🆘 Допомога — що сталось?', 'Напр.: не друкує чек, не можу додати страву'); if (!text) return;
    await act('help', { text, screen: S.view + (S.setTab ? '/' + S.setTab : '') }, '🆘 Надіслано — з вами зв\'яжуться');
  }
  async function ideasMy() { // 👤 особистий кабінет → свої побажання розробнику
    const l = (await act('ideaList', {}))?.list; if (!l) return; const mine = l.filter(x => x.by === S.me?.name);
    const v = await modal({ title: '💡 Побажання розробнику', body: `<div class="muted set-note">Що незручно, чого не вистачає, що змінити в касі чи боті — напишіть, розробник побачить і врахує.</div>${mine.length ? mine.map(ideaRow).join('') : '<div class="muted">Ви ще нічого не писали</div>'}`, buttons: [{ label: '✍️ Написати', val: 'add', cls: 'primary' }, { label: 'Закрити', val: null }] });
    if (v !== 'add') return; const text = await ask('💡 Ваше побажання', 'Напр.: зробити кнопку … більшою'); if (!text) return ideasMy();
    if (await act('ideaAdd', { text }, '💡 Дякуємо! Передано розробнику')) { S.data.ideas = null; ideasMy(); }
  }
  async function zpMy() {
    const r = await act('zpMy', {}); if (!r) return; const w = r.row, me = S.me?.name;
    const lnx = (l, v) => `<div class="kv"><span>${l}</span><b class="money">${v}</b></div>`;
    const asks = r.swaps.filter(s => s.to === me && s.st === 'ask');
    const shiftH = `<div class="zp-shift">${onShift() ? `<button class="btn red" data-a="zpOut">🔴 Закінчити зміну</button><span class="muted">на зміні з ${hhK(S.myAtt.in)}${S.myAtt.ok === 0 ? ' · 🕓 чекає підтвердження' : ' · ✅'}</span>` : `<button class="btn green" data-a="zpIn">🟢 Почати зміну</button>${S.myAtt?.out ? `<span class="muted">сьогодні ${hhK(S.myAtt.in)}–${hhK(S.myAtt.out)}</span>` : ''}`}</div>`;
    await loadMyTasks();
    const body = shiftH + `<div id="myTasks">${myTasksHTML()}</div>` + `${w ? `<div class="pills zp-my"><div class="pill"><span>Змін</span><b>${w.shifts}</b><small>${w.hours ? w.hours + ' год' : ''}</small></div><div class="pill"><span>Зароблено</span><b class="money">${money(w.earned)}</b></div><div class="pill"><span>До виплати</span><b class="money">${money(w.due)}</b></div><div class="pill"><span>💝 Мої чайові</span><b class="money">${money(S.myTip?.sum || 0)}</b><small>${w.tips ? `за місяць ${money(w.tips)}` : 'ще не видано'}</small></div></div>
      ${lnx(`Ставка × ${w.shifts}`, money(w.rate))}${w.pct ? lnx('% від виручки', money(w.pct)) : ''}${w.dayB || w.monB ? lnx('🎯 Бонус за план', money(w.dayB + w.monB)) : ''}${w.bonus ? lnx('➕ Премії', money(w.bonus)) : ''}${w.fine ? lnx('➖ Штрафи', '−' + money(w.fine)) : ''}${w.adv ? lnx('💵 Аванси', '−' + money(w.adv)) : ''}${w.paid ? lnx('💸 Виплачено', '−' + money(w.paid)) : ''}
      ${w.toMon ? `<div class="muted" style="font-size:13px;margin-top:6px">🎯 До місячного бонусу ще ${money(w.toMon)}</div>` : ''}` : '<div class="muted">Ставку ще не задано</div>'}
      ${asks.map(s => `<div class="card zp-ask">🔁 <b>${esc(s.from)}</b> просить вийти за нього ${s.day.slice(8)}.${s.day.slice(5, 7)} о ${s.time}<div class="btnrow"><button class="btn sm green" data-a="zpSw" data-id="${s.id}" data-s="agree">Погоджуюсь</button><button class="btn sm red" data-a="zpSw" data-id="${s.id}" data-s="no">Ні</button></div></div>`).join('')}
      <h3 style="margin:14px 0 6px">Графік · ${monName(r.m)}</h3>${gridHTML(r.grid, r.grid.people, false, me)}<div class="muted" style="font-size:11px;margin-top:4px">✅ був · ● заплановано · 🕓 чекає · ⏰ запізнення · 🚫 прогул</div>
      ${r.swaps.filter(s => s.from === me).map(s => `<div class="muted" style="font-size:12px">🔁 ${s.day.slice(8)}.${s.day.slice(5, 7)} → ${esc(s.to)}: ${s.st === 'ask' ? 'чекає згоди' : 'чекає адміна'}</div>`).join('')}`;
    const v = await modal({ title: `👤 ${me}`, body, buttons: [{ label: '🔁 Попросити обмін', val: 'swap' }, { label: '💡 Побажання', val: 'idea' }, { label: '🆘 Допомога', val: 'help' }, { label: 'Закрити', val: null }] });
    if (v === 'idea') return ideasMy();
    if (v === 'help') return helpAsk();
    if (v === 'swap') {
      const future = r.days.filter(x => x.plan && x.d >= todayK()); if (!future.length) return toast('У вашому плані немає майбутніх змін');
      const d = await choose('🔁 Яку зміну віддати?', '', future.map(x => ({ label: `${x.d.slice(8)}.${x.d.slice(5, 7)} ${WDL[new Date(x.d + 'T12:00:00Z').getUTCDay()]} · ${x.plan}`, val: x.d }))); if (!d) return;
      const pl = await act('zpPeople', {}); const to = pl && await choose('🔁 Кого попросити?', 'Колега погодиться у своєму кабінеті, потім підтвердить адмін', pl.list.map(n => ({ label: n, val: n }))); if (!to) return;
      await act('zpSwap', { day: d, to }, '🔁 Запит надіслано');
    }
  }

  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^(zp|idea)/.test(el.dataset.a)) return;
    const a = el.dataset.a, D = el.dataset;
    switch (a) {
      case 'zpIn': closeModal(); if (await act('zpIn', {}, '🟢 Зміну почато — адмін підтвердить')) { await loadState().catch(() => {}); renderNav(); } break;
      case 'zpOut': closeModal(); if (await confirmBox('🔴 Закінчити зміну?')) { if (await act('zpOut', {}, '🔴 Зміну закінчено')) { await loadState().catch(() => {}); renderNav(); } } break;
      case 'zpMy': zpMy(); break;
      case 'zpHelp': helpAsk(); break;
      case 'ideaDel': if (!D.sure) { D.sure = 1; el.textContent = '🗑 Точно?'; setTimeout(() => { if (el.isConnected) { delete D.sure; el.textContent = '🗑'; } }, 3000); break; } // друге натискання — видалити (вікно підтвердження закрило б кабінет)
        if (await act('ideaDel', { id: D.id }, '🗑 Видалено')) { el.closest('[data-idea]')?.remove(); if (S.data.ideas) S.data.ideas = S.data.ideas.filter(x => x.id !== D.id); } break;
      case 'ideaDone': { const r = await act('ideaDone', { id: D.id }); if (r) { const x = S.data.ideas?.find(y => y.id === D.id); if (x) x.done = r.x.done; const row = el.closest('[data-idea]'); if (row && $('#modal')?.contains(row)) row.outerHTML = ideaRow(r.x); else renderMain(); } break; }
      case 'zpM': S.zpM = monAdd(S.zpM || curMon(), +D.d); S.data.zp = null; renderMain(); loadView(); break;
      case 'zpCell': zpCell(D.d, D.n); break;
      case 'zpPend': zpPend(); break;
      case 'zpTab': S.zpTab = D.t; renderMain(); break;
      case 'zpRow': if (e.target.closest('button')) break; S.zpOpen = S.zpOpen === D.n ? null : D.n; renderMain(); break;
      case 'zpAddP': { const G = S.data.zp, shown = new Set([...document.querySelectorAll('.zp-grid tbody th')].map(t => t.textContent.replace('✕', '').trim())), l = G.staff.map(s => s.name).filter(n => !shown.has(n));
        if (!l.length) { toast('Усі працівники вже в графіку'); break; }
        const n = await choose('➕ Додати в графік', monName(G.m), l.map(x => ({ label: x, val: x }))); if (n && await act('zpGridSet', { m: G.m, n, show: 1 }, '➕ Додано')) loadView(); break; }
      case 'zpDelP': if (await confirmBox(`Прибрати ${D.n} з графіка?`, 'Лише з цього місяця. Нарахування й виплати не зміняться; повернути — «➕ Додати в графік»')) { if (await act('zpGridSet', { m: S.data.zp.m, n: D.n, show: 0 }, '✕ Прибрано')) loadView(); } break;
      case 'zpCopy': { const t = new Date(todayK() + 'T12:00:00Z'), mon = new Date(t); mon.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); const to = mon.toISOString().slice(0, 10); mon.setUTCDate(mon.getUTCDate() - 7); const from = mon.toISOString().slice(0, 10);
        if (await confirmBox('📋 Скопіювати план?', `Тиждень з ${from.slice(8)}.${from.slice(5, 7)} → тиждень з ${to.slice(8)}.${to.slice(5, 7)}`)) { const r = await act('zpPlanCopy', { from, to }); if (r) { toast(`📋 Скопійовано змін: ${r.n}`); loadView(); } } break; }
      case 'zpSet': zpSet(D.id); break;
      case 'zpPay': zpOpN('paid', D.n, D.v); break;
      case 'zpOpN': zpOpN(D.t, D.n); break;
      case 'zpOpDel': { const back = !!D.b; if (!back && !(await confirmBox('Видалити операцію?', 'Якщо це видача грошей — вони повернуться в касу / на картку. Можна відновити ↩️'))) break; if (await act('zpOpDel', { id: D.id, back, m: S.zpM }, back ? '↩️ Повернуто' : '🗑 Видалено')) loadView(); break; }
      case 'zpSw': if (await act('zpSwapStep', { id: D.id, step: D.s }, D.s === 'no' ? '❌ Відхилено' : D.s === 'agree' ? '🔁 Погоджено — чекає адміна' : '✅ Обмін підтверджено')) { closeModal(); if (S.view === 'settings') loadView(); } break;
      case 'zpConf': { const row = el.closest('.zp-pend .kv'); if (await act('zpAtt', { day: D.d, n: D.n, how: D.h }, D.h === 'n' ? '❌ Відхилено' : '✅ Підтверджено')) { loadState().catch(() => {}); if (row) { row.remove(); if (!$('.zp-pend .kv')) closeModal(); } if (['settings', 'team'].includes(S.view)) loadView(); } break; }
    }
  });

  // 👥 Працівники: ✏️ імʼя · 🔑 PIN · 🔄 роль (сервер staffEdit: перейменування переносить графік, ЗП, чайові; сесії працівника закриваються)
  const ROLES = [['admin', '🔐 Адміністратор'], ['waiter', '🧑‍🍳 Офіціант'], ['cook', '👨‍🍳 Кухар'], ['courier', '🛵 Кур\'єр']];
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^stf(Name|Pin|Role)$/.test(el.dataset.a)) return;
    const s = (S.data.staff?.staff || []).find(x => x.id === el.dataset.id); if (!s) return;
    let f = null;
    if (el.dataset.a === 'stfName') { const v = await askVal('✏️ Нове імʼя (графік, зарплата й чайові перейдуть)', s.name); if (v && v.trim() !== s.name) f = { name: v.trim() }; }
    if (el.dataset.a === 'stfPin') { const v = await ask(`🔑 Новий PIN: ${s.name}`, '4 цифри · працівника вийде з каси', 'tel'); if (v) f = { pin: String(v) }; }
    if (el.dataset.a === 'stfRole') { const v = await choose(`🔄 Роль: ${s.name}`, 'Працівника вийде з каси — увійде знову з новими правами', ROLES.filter(([r]) => r !== (s.role || 'waiter')).map(([val, label]) => ({ label, val }))); if (v) f = { role: v }; }
    if (f && await act('staffEdit', { id: s.id, ...f }, f.name ? '✏️ Імʼя змінено' : f.pin ? '🔑 PIN змінено' : '🔄 Роль змінено')) loadView();
  });
  // 📱 графік на телефоні: одразу сьогоднішній день по центру (а після тапу по клітинці — там, де гортали)
  const zpSL = {};
  new MutationObserver(() => document.querySelectorAll('.zp-grid:not([data-c])').forEach(g => {
    g.dataset.c = 1; const k = (g.closest('#modal') ? 'm' : 'v') + (S.zpM || ''), td = g.querySelector('thead th.td');
    if (zpSL[k] != null) g.scrollLeft = zpSL[k];
    else if (td && g.scrollWidth > g.clientWidth) { const st = g.querySelector('tbody th')?.offsetWidth || 0; g.scrollLeft = td.offsetLeft - st - (g.clientWidth - st) / 2 + td.offsetWidth / 2; }
    g.addEventListener('scroll', () => { zpSL[k] = g.scrollLeft; }, { passive: true });
  })).observe(document.body, { childList: true, subtree: true });
