  // 📋 План на день: адмін складає (Персонал → 📋 План), працівник відмічає у своєму кабінеті 👤 (або в боті «📋 Мій план»)
  const TK_ROLE = { admin: 'адміни', waiter: 'офіціанти', cook: 'кухарі', courier: 'кур\'єри' }, TK_WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'];
  const tkWho = w => !w || w.k === 'a' ? '👥 будь-хто' : w.k === 'r' ? '👥 ' + (TK_ROLE[w.r] || w.r) : '👤 ' + esc(w.n || '?');
  const tkIc = t => t.st === 'done' ? '✅' : t.st === 'no' ? '❌' : t.imp ? '❗' : '⬜';
  const tkDm = d => `${d.slice(8)}.${d.slice(5, 7)}`;
  async function loadMyTasks() { try { const r = await api('taskList', { mine: 1 }); S.myTasks = r.list; const n = r.list.filter(t => !t.st).length; if (n !== S.taskN) { S.taskN = n; renderNav(); } if ($('#myTasks')) $('#myTasks').innerHTML = myTasksHTML(); } catch {} }
  // 👤 у кабінеті працівника
  function myTasksHTML() {
    const l = S.myTasks || []; if (!l.length) return '';
    return `<h3 style="margin:4px 0 6px">📋 Мій план на сьогодні · ${l.filter(t => t.st === 'done').length} з ${l.length}</h3>${l.map(t => `<div class="tk-row${t.st ? ' done' : ''}${t.imp && !t.st ? ' imp' : ''}"><span class="tk-n">${tkIc(t)} ${t.tm ? `<b>${t.tm}</b> · ` : ''}${esc(t.n)}${t.photo && !t.st ? ' 📷' : ''}${t.st ? `<small class="muted">${esc(t.by || '')} ${t.at || ''}${t.why ? ' — ' + esc(t.why) : ''}</small>` : ''}</span>
      ${t.st ? `<button class="btn sm ghost" data-a="tkMark" data-id="${t.id}" data-st="" title="Повернути">↩️</button>` : `<span class="tk-b"><button class="btn sm green" data-a="tkMark" data-id="${t.id}" data-st="done">✅</button><button class="btn sm" data-a="tkMark" data-id="${t.id}" data-st="no">❌</button></span>`}</div>`).join('')}`;
  }
  async function tkMark(id, st, day) {
    const l = day ? S.data.tasks?.list : S.myTasks, t = (l || []).find(x => x.id === id); let why = '', ph = '';
    if (st === 'no') { why = await ask('❌ Чому не зроблено?', 'Коротко, напр.: не було мийного засобу'); if (!why) return; }
    if (st === 'done' && t?.photo && !t.ph && !isAdmin()) { toast('📷 Сфотографуйте результат'); const f = await new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.capture = 'environment'; i.onchange = () => res(i.files[0] || null); i.click(); }); if (!f) return; ph = await shrink(f, 1280, .75); }
    const r = await act('taskMark', { id, st, why, ph, ...(day ? { day } : {}) }, st === 'done' ? '✅ Зроблено' : st === 'no' ? '❌ Записано' : '↩️ Повернуто'); if (!r) return;
    loadMyTasks(); if (S.view === 'team' && S.zpTab === 'plan') tkLoad();
  }
  // 👑 адмін: Персонал → 📋 План
  async function tkLoad() { if (S._tkL) return; S._tkL = 1; try { S.data.tasks = await api('taskList', { day: S.tkDay || todayK() }); } catch { S.data.tasks = { list: [], tpl: [], staff: [] }; } S._tkL = 0; if (S.view === 'team') renderMain(); }
  function tkAdminHTML() {
    const D = S.data.tasks, day = S.tkDay || todayK(); if (!D || D.day !== day) { tkLoad(); return '<div class="muted">…</div>'; }
    const l = D.list, ok = l.filter(t => t.st === 'done').length, past = day < todayK(), shift = n => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const by = {}; for (const t of l) { const k = t.st ? (t.by || '—') : tkWho(t.who).replace(/<[^>]+>/g, ''); (by[k] ||= [0, 0]); by[k][1]++; if (t.st === 'done') by[k][0]++; }
    const row = t => `<div class="tk-row${t.st ? ' done' : ''}${t.imp && !t.st ? ' imp' : ''}"><span class="tk-n">${tkIc(t)} ${t.tm ? `<b>${t.tm}</b> · ` : ''}${esc(t.n)}${t.tpl ? ' <small class="muted">🔁</small>' : ''}<small class="muted">${tkWho(t.who)}${t.st ? ` · ${esc(t.by || '')} ${t.at || ''}${t.why ? ' — ' + esc(t.why) : ''}` : t.photo ? ' · 📷 з фото' : ''}</small></span>
      <span class="tk-b">${t.ph ? `<button class="btn sm" data-a="tkPh" data-id="${t.id}">📷</button>` : ''}${t.st ? '' : `<button class="btn sm green" data-a="tkMarkA" data-id="${t.id}" data-st="done" title="Відмітити за працівника">✅</button>`}${past ? '' : `<button class="btn sm ghost" data-a="tkDel" data-id="${t.id}">🗑</button>`}</span></div>`;
    const tpl = D.tpl || [];
    return `<div class="card"><div class="zp-top"><button class="btn sm" data-a="tkDay" data-d="${shift(-1)}">◀</button><b>${day === todayK() ? 'Сьогодні' : day === shift(0) && day > todayK() ? 'Завтра' : ''} ${tkDm(day)} ${TK_WD[(new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7]}</b><button class="btn sm" data-a="tkDay" data-d="${shift(1)}">▶</button></div>
        ${l.length ? `<div class="kpis"><div class="kpi accent"><span>Виконано</span><b>${ok} з ${l.length}</b><small class="muted">${Math.round(ok / l.length * 100)}%</small></div>${Object.entries(by).map(([n, [a, b]]) => `<div class="kpi"><span>${esc(n)}</span><b>${a}/${b}</b></div>`).join('')}</div>` : ''}
        ${l.length ? l.map(row).join('') : '<div class="muted">На цей день завдань немає</div>'}
        ${past ? '' : '<div class="btnrow" style="margin-top:10px"><button class="btn primary" data-a="tkAdd">➕ Завдання</button></div>'}</div>
      <div class="card"><h3>🔁 Щоденні шаблони</h3><div class="muted set-note">Додаються в план самі: щодня або в обрані дні тижня. Напр. «Відкриття зали», «Генеральне прибирання — чт».</div>
        ${tpl.map((t, i) => `<div class="tk-row"><span class="tk-n">${t.imp ? '❗ ' : ''}${t.tm ? `<b>${t.tm}</b> · ` : ''}${esc(t.n)}<small class="muted">${tkWho(t.who)} · ${t.days?.length ? t.days.map(d => TK_WD[d]).join(', ') : 'щодня'}${t.photo ? ' · 📷' : ''}</small></span><span class="tk-b"><button class="btn sm" data-a="tkTplEd" data-i="${i}">✏️</button><button class="btn sm ghost" data-a="tkTplDel" data-i="${i}">🗑</button></span></div>`).join('') || '<div class="muted">Шаблонів ще немає</div>'}
        <div class="btnrow" style="margin-top:10px"><button class="btn" data-a="tkTplEd" data-i="-1">➕ Шаблон</button></div></div>`;
  }
  // форма завдання / шаблону
  async function tkForm(x = {}, tpl) {
    const D = S.data.tasks, who = x.who || { k: 'a' }, wv = who.k === 's' ? 's:' + who.id : who.k === 'r' ? 'r:' + who.r : 'a';
    const opts = [['a', '👥 Будь-хто на зміні'], ...Object.entries(TK_ROLE).map(([r, l]) => ['r:' + r, '👥 Усі ' + l]), ...(D.staff || []).map(s => ['s:' + s.id, '👤 ' + s.n])];
    const v = await modal({ title: tpl ? '🔁 Шаблон' : '➕ Завдання на ' + tkDm(S.tkDay || todayK()), body: `<div class="form"><input id="tkN" placeholder="Що зробити (напр. протерти вітрину)" value="${esc(x.n || '')}" maxlength="140">
      <select id="tkW">${opts.map(([k, l]) => `<option value="${k}"${k === wv ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>
      <input id="tkT" type="time" value="${esc(x.tm || '')}" placeholder="Час (необов'язково)">
      ${tpl ? `<div class="tk-days">${TK_WD.map((d, i) => `<label><input type="checkbox" class="tkD" value="${i}"${(x.days || []).includes(i) ? ' checked' : ''}> ${d}</label>`).join('')}</div><div class="muted" style="font-size:12px">Нічого не обрано — щодня</div>` : ''}
      <label class="tk-chk"><input type="checkbox" id="tkI"${x.imp ? ' checked' : ''}> ❗ Важливо</label><label class="tk-chk"><input type="checkbox" id="tkP"${x.photo ? ' checked' : ''}> 📷 Підтвердити фото</label></div>`,
      buttons: [{ label: '💾 Зберегти', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    if (!v) return closeModal();
    const w = $('#tkW').value, r = { ...x, n: $('#tkN').value.trim(), tm: $('#tkT').value, imp: $('#tkI').checked ? 1 : 0, photo: $('#tkP').checked ? 1 : 0, who: w === 'a' ? { k: 'a' } : w.startsWith('r:') ? { k: 'r', r: w.slice(2) } : { k: 's', id: w.slice(2) }, ...(tpl ? { days: [...document.querySelectorAll('.tkD:checked')].map(c => +c.value) } : {}) };
    closeModal(); if (!r.n) { toast('Напишіть завдання'); return; } return r;
  }
  async function tkClick(a, D) {
    switch (a) {
      case 'tkMark': return tkMark(D.id, D.st);
      case 'tkMarkA': return tkMark(D.id, D.st, S.tkDay || todayK());
      case 'tkDay': S.tkDay = D.d; S.data.tasks = null; return renderMain();
      case 'tkAdd': { const r = await tkForm(); if (r && await act('taskAdd', { ...r, day: S.tkDay || todayK() }, '➕ Додано')) tkLoad(); return; }
      case 'tkDel': if (await confirmBox('Видалити завдання?') && await act('taskDel', { id: D.id, day: S.tkDay || todayK() }, '🗑 Видалено')) tkLoad(); return;
      case 'tkPh': { const r = await act('taskPh', { id: D.id, day: S.tkDay || todayK() }); if (r?.ph) modal({ title: '📷 Фото', body: `<img src="data:image/jpeg;base64,${r.ph}" style="width:100%;border-radius:12px">`, buttons: [{ label: 'Закрити', val: null }] }); return; }
      case 'tkTplEd': case 'tkTplDel': {
        const l = [...(S.data.tasks.tpl || [])], i = +D.i;
        if (a === 'tkTplDel') { if (!(await confirmBox('Видалити шаблон?', 'Сьогоднішні завдання з нього лишаться'))) return; l.splice(i, 1); }
        else { const r = await tkForm(i >= 0 ? l[i] : {}, true); if (!r) return; if (i >= 0) l[i] = r; else l.push(r); }
        if (await act('taskTpl', { list: l }, '🔁 Шаблони збережено')) { S.data.tasks = null; tkLoad(); } return;
      }
    }
  }
  document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && /^tk[A-Z]/.test(el.dataset.a)) tkClick(el.dataset.a, el.dataset); });
