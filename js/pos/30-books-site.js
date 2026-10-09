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
  async function bdGiftT(t) { // 🎂 гість святкує тут — подарунок з чека (що саме — обирає офіціант); телефон обовʼязковий: раз на рік на номер
    const ph = S.tables[t]?.cli || await askVal('🎂 Телефон іменинника (обовʼязково)', '', 'tel'); if (!ph) return;
    const p = await act('certBd', { t, phone: ph }); if (!p?.pick) return;
    const i = await choose('🎂 Що подарувати?', 'Одна позиція з чека — за її ціною', p.pick.map(x => ({ label: `${x.n} · ${money(x.p)}${x.q > 1 ? ` (у чеку ${x.q})` : ''}`, val: String(x.i) }))); if (i == null) return;
    const r = await act('certBd', { t, phone: ph, item: i }); if (r) { toast(`🎂 Подарунок: ${r.gift} −${money(r.use)}`); loadState().catch(() => {}); }
  }
  async function certT(t) {
    const code = await ask('🎟 Код сертифіката', 'VV-XXXXX'); if (!code) return;
    const g = await api('certGet', { code }).catch(e => { toast('⚠️ ' + e.message); return null; }); if (!g) return;
    if (g.c.st !== 'ok') return toast(g.c.st === 'new' ? '⚠️ Сертифікат ще не оплачено' : '⚠️ Сертифікат скасовано');
    if (!(await confirmBox(`🎟 ${g.c.code} — ${money(g.c.left)} з ${money(g.c.sum)}`, `Від ${g.c.from}${g.c.to ? ' для ' + g.c.to : ''}. Списати на цей рахунок?`))) return;
    const r = await act('certUse', { t, code }); if (r) { toast(`🎟 −${money(r.use)} · залишок ${money(r.left)}`); loadState().catch(() => {}); }
  }
