  // 🍾 Акциз: марки пляшок акцизного продукту. Прихід — скан марок (після накладної або тут), продаж порціями сам бере обʼєм з відкритої пляшки,
  // закінчилась — відкриває наступну (у стрічці «🍾 Нова пляшка … марка …123456»). Марка йде у фіскальний чек при першій порції з пляшки.
  // Сервер: excise.js (skEx, skExAdd, skExOpen, skExOff). Замовити більше, ніж є за марками, каса/бот/сайт не дають.
  const exAge = t => t ? new Date(t).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : '';
  const exTl = c => '…' + String(c || '').slice(-6);
  function skExHTML() {
    const K = S.sk, R = S.data.skEx;
    if (!R) return '<div class="muted" style="margin:16px 4px">Завантаження…</div>';
    if (K.exId && R.x) return skExOneHTML(R);
    const help = `<div class="card"><h3>🍾 Як це працює</h3><div class="muted" style="font-size:13px;line-height:1.5">
      1) У картці продукту (📦 Залишки → назва) увімкніть «🍾 Акцизний», вкажіть обʼєм пляшки й код УКТ ЗЕД.<br>
      2) Прийшла накладна — відскануйте марку на кожній пляшці (сканером підряд або камерою).<br>
      3) Продаєте порціями як завжди: марка відкритої пляшки сама піде в перший фіскальний чек з неї. Закінчилась пляшка — відкривається наступна, у стрічці каси видно її марку.<br>
      4) Продати більше, ніж є пляшок з марками, не вийде — каса, бот і сайт попередять.</div></div>`;
    const dd = d => d.split('-').reverse().join('.'), L = R.lic;
    const lic = `<div class="card${R.licErr || !L ? ' sk-low' : ''}"><h3>📜 Ліцензія на алкоголь</h3>${L ? `<div class="kv"><span>№ ${esc(L.no)}<br><small class="muted">дійсна до ${dd(L.till)}${R.licLeft >= 0 ? ` · лишилось ${R.licLeft} дн.` : ''}</small></span><span class="kv-r">${R.licErr ? `<b class="warn">⛔ ${esc(R.licErr)}</b>` : L.ok ? '✅ каса вписана' : ''}</span></div>
      ${R.licErr ? '<div class="warn" style="font-size:13px">Алкоголь не продається (каса, бот, сайт), доки не оновите.</div>' : R.licLeft <= 30 ? '<div class="warn" style="font-size:13px">⚠️ Скоро закінчується — продовжте й оновіть дату.</div>' : ''}`
      : '<div class="muted" style="font-size:13px">⚠️ Не вказано. Продаж алкоголю через касу, не вписану в ліцензію, — штраф 200%. Вкажіть номер, строк і чи вписана ця каса — нагадаємо за 30 і 7 днів до кінця.</div>'}
      <div class="btnrow"><button class="btn sm" data-a="exLic">${L ? '✏️ Змінити' : '📜 Вказати ліцензію'}</button></div></div>`;
    if (!R.list.length) return lic + help;
    const row = x => { const bad = Math.abs(x.cap - x.st) > x.vol * 0.25;
      return `<div class="sk-row${x.short ? ' low' : ''}"><div class="sk-n press" data-a="exOne" data-id="${x.id}"><b>🍾 ${esc(x.n)}</b><small class="muted">${x.open ? `відкрита ${exTl(x.open.c)} · лишилось ${fq(x.open.left, x.u)}` : 'відкритої пляшки немає'}${x.uk ? ` · УКТ ЗЕД ${esc(x.uk)}` : ' · ⚠️ без УКТ ЗЕД'}</small>
        ${x.short ? `<small class="warn">⚠️ продано понад марки: ${fq(x.short, x.u)} — додайте марки</small>` : bad ? `<small class="warn">⚠️ за марками ${fq(x.cap, x.u)}, на складі ${fq(x.st, x.u)} — перевірте</small>` : ''}</div>
        <div class="sk-q"><b>${x.n0}</b><small class="muted">нових пляшок</small></div>
        <div class="sk-act"><button class="btn sm" data-a="exAdd" data-id="${x.id}">➕ Марки</button></div></div>`; };
    return `<div class="kpis sk-kpis"><div class="kpi accent"><span>Акцизних продуктів</span><b>${R.list.length}</b><small class="muted">пляшок нових: ${R.list.reduce((a, x) => a + x.n0, 0)}</small></div>
      <div class="kpi ${R.list.some(x => !x.cap) ? 'red' : ''}"><span>Без марок</span><b>${R.list.filter(x => !x.cap).length}</b><small class="muted">їх не продати</small></div></div>
      <div class="card"><h3>🍾 Акцизні продукти</h3>${R.list.map(row).join('')}</div>` + lic + help;
  }
  function skExOneHTML(R) {
    const x = R.x, st = y => y.w ? `🗑 ${esc(y.w)}` : y.d ? '✅ закінчилась' : y.o ? '🍾 відкрита' : '🆕 нова';
    const b = R.b.map(y => `<div class="kv"><span><b>${exTl(y.c)}</b> <small class="muted">${st(y)}${y.e ? ' · єАкциз' : ''} · ${exAge(y.add)}${y.inv ? ` · накл. ${esc(y.inv)}` : ''}${y.fr ? ` · 🧾 у чеку` : y.o && !y.d ? ' · марка ще не в чеку' : ''}</small></span>
      <span class="kv-r">${y.d ? '' : `<b>${fq(y.left, x.u)}</b> <button class="btn sm" data-a="exOff" data-id="${x.id}" data-c="${esc(y.c)}" data-o="${y.o ? 1 : 0}">${y.o ? '🗑 Списати' : '✕'}</button>`}</span></div>`).join('');
    return `<div class="btnrow"><button class="btn sm" data-a="exBack">← Усі акцизні</button></div>
      <div class="kpis sk-kpis"><div class="kpi accent"><span>${esc(x.n)}</span><b>${fq(x.cap, x.u)}</b><small class="muted">можна продати за марками · на складі ${fq(x.st, x.u)}</small></div>
      <div class="kpi"><span>Відкрита пляшка</span><b>${x.open ? exTl(x.open.c) : '—'}</b><small class="muted">${x.open ? `лишилось ${fq(x.open.left, x.u)} з ${fq(x.vol, x.u)}` : 'відкриється з першою порцією'}</small></div>
      <div class="kpi"><span>Нових пляшок</span><b>${x.n0}</b><small class="muted">${x.q ? `марок чекають чека: ${x.q}` : 'по ' + fq(x.vol, x.u)}</small></div></div>
      ${x.short ? `<div class="card sk-low">⚠️ Продано понад марки: ${fq(x.short, x.u)}. Додайте марки пляшок, з яких наливали.</div>` : ''}
      <div class="btnrow"><button class="btn primary" data-a="exAdd" data-id="${x.id}">➕ Додати марки</button><button class="btn" data-a="exOpen" data-id="${x.id}">🍾 Відкрили іншу пляшку</button></div>
      <div class="card"><h3>Пляшки <span class="muted">· останні ${R.b.length}</span></h3>${b || '<div class="muted">Марок ще немає — натисніть «➕ Додати марки»</div>'}</div>`;
  }
  async function exReload() { const K = S.sk; S.data.skEx = await api('skEx', K.exId ? { id: K.exId } : {}).catch(() => S.data.skEx); if (S.view === 'calc' && K.tab === 'ex') renderMain(); }
  // ➕ скан марок підряд (сканер — Enter після коду; або камера); need — скільки пляшок прийшло за накладною
  async function exScan(id, need = 0, inv = '') {
    const D = S.data.sk || (S.data.sk = await api('skData')), x = D.ing.find(y => y.id === id); if (!x) return;
    const got = [], draw = m => { const el = $('#exRes'); if (el) el.innerHTML = `<b>${got.length}${need ? ' з ' + need : ''}</b> марок${m ? ' · ' + m : ''}<br><small class="muted">${got.slice(-5).map(exTl).join(' · ')}</small>`; };
    const pm = modal({ title: `🍾 Марки: ${x.n}`, body: `<div class="form"><input id="exIn" placeholder="Відскануйте марку на пляшці (сканер або код і Enter)" autocomplete="off"><div id="exRes" class="muted"></div>
      <button class="btn" data-a="exCam">📷 Сканувати камерою</button><div id="scCam" class="sc-cam" hidden><video id="scV" playsinline muted></video></div></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Скануйте кожну пляшку один раз — повтор не зарахується. Обʼєм пляшки: ${fq(x.vol || (x.u === 'л' ? .5 : 1), x.u)}.</div>`,
      buttons: [{ label: '✅ Зберегти', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }] });
    const put = c => { c = String(c || '').replace(/[\u0000-\u001f\u007f]/g, '').trim(); if (c.length < 6) return draw('⚠️ закороткий код'); if (got.includes(c)) return draw('↩️ ця вже є');
      got.push(c); draw('✅ ' + exTl(c)); try { navigator.vibrate?.(60); } catch {} };
    exCamCb = put;
    setTimeout(() => { const i = $('#exIn'); if (!i) return; i.focus(); i.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); put(i.value); i.value = ''; }); draw(); }, 60);
    const v = await pm; camStop?.(); camStop = null; exCamCb = null;
    const left = $('#exIn')?.value; if (left) put(left);
    if (!v || !got.length) return;
    const r = await act('skExAdd', { id, codes: got, inv }); if (!r) return;
    toast(`🍾 Додано марок: ${r.added}${r.up ? ` · оновлено до повного коду: ${r.up}` : ''}${r.dup.length ? ` · дублі: ${r.dup.length}` : ''}`);
    if (r.dup.length) modal({ title: '↩️ Ці марки вже є', text: r.dup.map(d => `${exTl(d.c)}${d.n ? ' — ' + d.n : ''}`).join(' · '), buttons: [{ label: 'Зрозуміло', val: 1, cls: 'primary' }] });
    exReload();
  }
  let exCamCb = null;
  // 🧾 після накладної: для кожного акцизного рядка — одразу скан марок пляшок
  async function exAfterInv(lines, no) {
    const im = new Map((S.data.sk?.ing || []).map(y => [y.id, y]));
    for (const l of lines) { const x = im.get(l.id); if (!x?.ex) continue;
      const n = Math.max(1, Math.round((+l.q || 0) * (+l.f || 1) / (x.vol || (x.u === 'л' ? .5 : 1))));
      if (!(await choose(`🍾 ${x.n}: відскануйте марки (${n} пл.)`, 'Без марок ці пляшки не продати', [{ label: '📷 Сканувати марки', val: 1 }]))) continue;
      await exScan(x.id, n, no);
    }
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^ex[A-Z]/.test(el.dataset.a)) return;
    const a = el.dataset.a, K = S.sk, id = el.dataset.id;
    switch (a) {
      case 'exOne': if (!id) break; K.exId = id; S.data.skEx = null; renderMain(); exReload(); break;
      case 'exBack': K.exId = ''; S.data.skEx = null; renderMain(); exReload(); break;
      case 'exAdd': if (id) exScan(id); break;
      case 'exLic': { const L = S.data.skEx?.lic || {};
        const v = await modal({ title: '📜 Ліцензія на алкоголь', body: `<div class="form"><label>Номер ліцензії<input id="exLn" value="${esc(L.no || '')}" maxlength="40"></label>
          <label>Дійсна до<input id="exLt" type="date" value="${esc(L.till || '')}"></label>
          <label class="kv"><span>✅ Цю касу (ПРРО) вписано в ліцензію</span><input id="exLo" type="checkbox"${L.ok || !L.no ? ' checked' : ''}></label>
          <div class="muted" style="font-size:12px">Без позначки або після дати алкоголь не продаватиметься — так каса вбереже від штрафу 200%.</div></div>`,
          buttons: [{ label: '💾 Зберегти', val: 1, cls: 'primary' }, ...(L.no ? [{ label: '🗑 Прибрати', val: 'off' }] : []), { label: 'Скасувати', val: null }], keep: true });
        const f = v === 1 ? { no: $('#exLn')?.value.trim(), till: $('#exLt')?.value, ok: $('#exLo')?.checked ? 1 : 0 } : null; closeModal();
        if (v === 'off') { if (await confirmBox('🗑 Прибрати ліцензію?', 'Продаж алкоголю не блокуватиметься, нагадувань не буде.') && await act('skExLic', { off: 1 }, '🗑 Прибрано')) exReload(); break; }
        if (f && await act('skExLic', f, '📜 Збережено')) exReload(); break; }
      case 'exCam': skCam(c => exCamCb?.(c)); break;
      case 'exOpen': { if (!id) break; const c = await ask('🍾 Яку пляшку відкрили?', 'Відскануйте марку відкритої пляшки'); if (!c) break;
        const r = await act('skExOpen', { id, c }, '🍾 Тепер відкрита ця пляшка'); if (r) exReload(); break; }
      case 'exOff': { const c = el.dataset.c; if (!id || !c) break;
        if (el.dataset.o !== '1') { if (await confirmBox(`✕ Прибрати марку ${exTl(c)}?`, 'Для помилково відсканованої нової пляшки. Склад не змінюється.') && await act('skExOff', { id, c, rm: 1 }, '✕ Прибрано')) exReload(); break; }
        const note = await ask(`🗑 Списати пляшку ${exTl(c)}`, 'Причина: розбилась, зіпсована…'); if (!note) break;
        if (await act('skExOff', { id, c, note }, '🗑 Списано зі складу')) exReload(); break; }
    }
  });
