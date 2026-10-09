  // 🏭 Склад → Постачальники: профілі (створюються з накладних), борг і оплата, накладні, що возить і почому,
  // 🛒 замовлення текстом, 📄 акт звірки, ⚖️ порівняння цін, 🔗 обʼєднання дублікатів. Сервер: worker/src/suppliers.js (op skSup*).
  const dm = d => d ? `${d.slice(8)}.${d.slice(5, 7)}` : '';
  const supShare = async (text, title) => { try { if (navigator.share && matchMedia('(hover: none)').matches) await navigator.share({ text, title }); else { await navigator.clipboard.writeText(text); toast('📋 Скопійовано — вставте в Viber / Telegram'); } } catch { prompt('Скопіюйте:', text); } };
  function skSupHTML() {
    const D = S.data.skSup, adm = isAdmin(); if (!D) return '<div class="muted">Завантаження…</div>';
    const tot = D.list.reduce((a, x) => a + (x.debt || 0), 0), over = D.list.reduce((a, x) => a + (x.over || 0), 0);
    return `${adm ? `<div class="kpis"><div class="kpi ${tot ? 'red' : ''}"><span>💸 Винні постачальникам</span><b>${money(tot)}</b>${over ? `<small style="color:var(--red)">прострочено ${money(over)}</small>` : '<small class="muted">без прострочок</small>'}</div><div class="kpi"><span>🏭 Постачальників</span><b>${D.list.length}</b></div></div>` : ''}
      <div class="btnrow" style="margin:10px 0">${adm ? '<button class="btn sm primary" data-a="supNew">➕ Постачальник</button><button class="btn sm" data-a="supPrices">⚖️ Порівняти ціни</button>' : ''}</div>
      <div class="sup-l">${D.list.map(x => `<button class="card sup-c press" data-a="supOpen" data-id="${x.id}"><div class="sup-h"><b>${esc(x.n)}</b>${adm && x.debt ? `<span class="money" style="color:var(--red)">−${money(x.debt)}</span>` : ''}</div>
        <small class="muted">${x.cnt} накл.${x.last ? ' · остання ' + new Date(x.last).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }) : ''}${adm && x.n30 ? ' · за 30 дн. ' + money(x.n30) : ''}${x.term ? ' · відстрочка ' + x.term + ' дн.' : ''}</small>${adm && x.over ? `<small style="color:var(--red)">⏰ прострочено ${money(x.over)}</small>` : ''}</button>`).join('') || '<div class="muted">Ще немає — профіль створюється сам, коли сканується накладна.</div>'}</div>
      ${adm && D.loose?.length ? `<div class="card" style="margin-top:10px"><h3>Накладні без профілю</h3><div class="muted set-note">Постачальники зі старих накладних — створіть профіль одним натиском.</div><div class="chips">${D.loose.map(n => `<button class="chip" data-a="supMake" data-n="${esc(n)}">➕ ${esc(n)}</button>`).join('')}</div></div>` : ''}`;
  }
  async function supLoad() { S.data.skSup = await api('skSupList'); if (S.view === 'calc' && S.sk.tab === 'sup') renderMain(); }
  async function supOpen(id) {
    let c; try { c = await api('skSupCard', { id }); } catch (e) { return toast('⚠️ ' + errText(e.message)); }
    const p = c.p, adm = isAdmin(), un = c.inv.filter(x => x.pay === 'debt' && !x.paid);
    const row = (l, v, copy) => v ? `<div class="kv"><span>${l}</span><span class="kv-r"><b style="overflow-wrap:anywhere">${esc(v)}</b>${copy ? `<button class="btn sm" data-mi-v="cp:${esc(v)}" title="Копіювати">📋</button>` : ''}</span></div>` : '';
    const v = await modal({ title: `🏭 ${esc(p.n)}`, body: `<div class="sup-card">
      ${adm ? `<div class="kpis"><div class="kpi ${c.debt ? 'red' : ''}"><span>💸 Винні</span><b>${money(c.debt)}</b><small class="muted">${un.length} неоплач.</small></div><div class="kpi"><span>За рік</span><b>${money(c.year)}</b><small class="muted">${c.inv.length} накл. · сер. ${money(c.avg)}</small></div></div>` : ''}
      <h4>📇 Реквізити й контакти</h4>${row('Юр. назва', p.legal)}${row('ЄДРПОУ / ІПН', p.code, 1)}${row('IBAN', p.iban, 1)}${row('Телефон', p.phone, 1)}${row('Менеджер', p.mgr)}${row('Viber / Telegram', p.msg)}${row('Адреса', p.addr)}${row('Дні поставки', p.days)}${row('Відстрочка', p.term ? p.term + ' дн.' : '')}${row('Примітки', p.note)}
      ${!p.code && !p.iban && !p.phone ? '<div class="muted set-note">Реквізити підтягнуться з наступної накладної — або заповніть ✏️</div>' : ''}
      ${adm && un.length ? `<h4>💸 Неоплачені</h4>${un.map(x => `<label class="kv" style="cursor:pointer"><span>${dm(x.day)}${x.no ? ' · №' + esc(x.no) : ''}<br><small class="${x.due != null && x.due < 0 ? 'neg' : 'muted'}">${x.due == null ? x.age + ' дн. тому' : x.due < 0 ? `⏰ прострочено ${-x.due} дн.` : x.due === 0 ? '⏰ сьогодні' : `ще ${x.due} дн.`}</small></span><span class="kv-r"><b class="money">${money(x.total)}</b><input type="checkbox" class="supPk" value="${x.id}" checked style="width:22px;height:22px"></span></label>`).join('')}` : ''}
      <h4>🧾 Накладні</h4>${c.inv.slice(0, 30).map(x => `<div class="kv press" data-mi-v="inv:${x.id}"><span>${dm(x.day)}${x.no ? ' · №' + esc(x.no) : ''} <small class="muted">· ${x.n} поз.</small></span><span class="kv-r">${x.total != null ? `<b class="money">${money(x.total)}</b>` : ''}<small class="${x.pay === 'debt' && !x.paid ? 'neg' : 'good'}">${x.pay === 'debt' && !x.paid ? '⏳' : '✅'}</small></span></div>`).join('') || '<div class="muted">Немає</div>'}
      ${c.prod.length ? `<h4>📦 Що возить</h4>${c.prod.slice(0, 40).map(x => `<div class="kv"><span>${esc(x.n)}<br><small class="muted">${fq(x.q, x.u)} за рік${x.day ? ' · ' + dm(x.day) : ''}</small></span>${x.last != null ? `<span class="kv-r"><b>${money(x.last)}/${x.u}</b>${x.prev && x.last > x.prev * 1.01 ? `<small class="warn">↑${Math.round((x.last / x.prev - 1) * 100)}%</small>` : x.prev && x.last < x.prev * 0.99 ? `<small class="good">↓${Math.round((1 - x.last / x.prev) * 100)}%</small>` : ''}</span>` : ''}</div>`).join('')}` : ''}</div>`,
      buttons: [...(adm && un.length ? [{ label: '💵 Оплатити позначені готівкою', val: 'pay:cash', cls: 'primary' }, { label: '💳 Оплатити позначені карткою', val: 'pay:card' }] : []), { label: '🛒 Замовлення', val: 'order' }, ...(adm ? [{ label: '📄 Акт звірки', val: 'act' }, { label: '✏️ Редагувати', val: 'edit' }, { label: '🔗 Обʼєднати з іншим', val: 'merge' }] : []), { label: 'Закрити', val: null }], keep: true });
    if (v == null) return closeModal();
    if (String(v).startsWith('cp:')) { await supShare(v.slice(3)); return supOpen(id); }
    if (String(v).startsWith('inv:')) { closeModal(); return skInvView(v.slice(4)); }
    if (String(v).startsWith('pay:')) { const ids = [...document.querySelectorAll('.supPk:checked')].map(x => x.value); closeModal(); if (!ids.length) return toast('Позначте накладні'); const sum = un.filter(x => ids.includes(x.id)).reduce((a, x) => a + (x.total || 0), 0);
      if (!(await confirmBox(`💸 Оплатити ${ids.length} накл. на ${money(sum)}?`, v === 'pay:cash' ? 'Готівкою з каси — запишеться як витрата' : 'Карткою — запишеться як витрата з картки'))) return supOpen(id);
      const r = await act('skSupPay', { ids, src: v.slice(4) }); if (r) toast(`💸 Оплачено ${r.n} · ${money(r.sum)}`); supLoad(); return supOpen(id); }
    closeModal();
    if (v === 'order') { const r = await act('skSupOrder', { id }); if (!r) return; if (!r.text) { toast('✅ У цього постачальника нічого не закінчується (за мінімальними залишками)'); return supOpen(id); }
      const w = await modal({ title: '🛒 Замовлення', body: `<textarea id="supOt" rows="10" style="width:100%">${esc(r.text)}</textarea><div class="muted set-note">Можна виправити кількості. Список — з товарів нижче мінімуму (Склад → мінімальні залишки).</div>`, buttons: [{ label: '📤 Надіслати / скопіювати', val: 'go', cls: 'primary' }, { label: 'Закрити', val: null }], keep: true });
      const t = $('#supOt')?.value; closeModal(); if (w === 'go' && t) await supShare(t, p.n); return; }
    if (v === 'act') { const from = await ask('📄 Акт звірки з дати', 'РРРР-ММ-ДД, напр. ' + new Date().getFullYear() + '-01-01', 'text'); if (!from) return;
      const r = await act('skSupAct', { id, from: from.trim(), to: todayK() }); if (!r) return;
      const txt = `Акт звірки: ${S.brand?.name || ''} — ${p.legal || p.n}\nПеріод: ${r.from} — ${r.to}\n\n${r.rows.map(x => `${x.d}  ${x.t}  ${x.plus ? '+' + x.plus : '−' + x.minus}`).join('\n')}\n\nПоставлено: ${r.plus} грн · Оплачено: ${r.minus} грн · Сальдо (наш борг): ${r.saldo} грн`;
      const w = await modal({ title: '📄 Акт звірки', body: `<div class="kv"><span>Поставлено</span><b class="money">${money(r.plus)}</b></div><div class="kv"><span>Оплачено</span><b class="money">${money(r.minus)}</b></div><div class="kv tot"><span>Сальдо — наш борг</span><b class="money ${r.saldo > 0 ? 'neg' : 'good'}">${money(r.saldo)}</b></div><div class="sk-jr">${r.rows.map(x => `<div class="kv"><span>${dm(x.d)} · ${esc(x.t)}</span><b class="${x.plus ? '' : 'good'}">${x.plus ? '+' + money(x.plus) : '−' + money(x.minus)}</b></div>`).join('') || '<div class="muted">За період нічого</div>'}</div>`, buttons: [{ label: '📤 Надіслати / скопіювати', val: 'go', cls: 'primary' }, { label: 'Закрити', val: null }] });
      if (w === 'go') await supShare(txt, 'Акт звірки'); return; }
    if (v === 'edit') return supEdit(p);
    if (v === 'merge') { const l = S.data.skSup?.list.filter(x => x.id !== id) || []; if (!l.length) return toast('Немає з ким обʼєднати');
      const o = await choose(`🔗 ${p.n} — це той самий, що…`, 'Накладні й назви перейдуть у цей профіль, дублікат зникне', l.map(x => ({ label: x.n, val: x.id }))); if (!o) return supOpen(id);
      if (await act('skSupMerge', { to: id, from: o }, '🔗 Обʼєднано')) { await supLoad(); return supOpen(id); } }
  }
  async function supEdit(p = {}) {
    const F = [['n', 'Назва (як у накладних)'], ['legal', 'Юридична назва (ФОП / ТОВ)'], ['code', 'ЄДРПОУ / ІПН'], ['iban', 'IBAN (UA…)'], ['phone', 'Телефон'], ['mgr', 'Менеджер'], ['msg', 'Viber / Telegram (посилання або номер)'], ['addr', 'Адреса'], ['days', 'Дні поставки (напр. пн, чт)'], ['term', 'Відстрочка оплати, днів (0 — одразу)'], ['note', 'Примітки']];
    const v = await modal({ title: p.id ? '✏️ ' + esc(p.n) : '➕ Постачальник', body: `<div class="form">${F.map(([k, l]) => `<label class="muted" style="font-size:12px">${l}<input id="sp_${k}" value="${esc(p[k] ?? '')}" ${k === 'term' ? 'inputmode="numeric"' : ''}></label>`).join('')}</div>`, buttons: [{ label: '💾 Зберегти', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    if (!v) { closeModal(); return p.id ? supOpen(p.id) : null; }
    const b = { id: p.id }; for (const [k] of F) b[k] = $('#sp_' + k).value; closeModal(); if (!b.n.trim()) return toast('Вкажіть назву');
    const r = await act('skSupSave', { p: b }, '💾 Збережено'); if (r) { await supLoad(); supOpen(r.p.id); }
  }
  async function supPrices() {
    const r = await act('skSupPrices'); if (!r) return;
    await modal({ title: '⚖️ Порівняння цін', body: r.list.length ? `<div class="muted set-note">Продукти, які возять кілька постачальників: остання ціна в кожного (з накладних за рік). Зверху — де різниця найбільша.</div>${r.list.slice(0, 60).map(e => `<div class="card" style="padding:10px 12px;margin-bottom:6px"><b>${esc(e.n)}</b> <small class="muted">· різниця ${money(e.save)}/${e.u}</small>${e.by.map((x, i) => `<div class="kv"><span>${i ? '' : '✅ '}${esc(x.s)} <small class="muted">${dm(x.day)}</small></span><b class="${i ? '' : 'good'}">${money(x.p)}/${e.u}</b></div>`).join('')}</div>`).join('')}` : '<div class="muted">Поки немає продуктів, які возять кілька постачальників.</div>', buttons: [{ label: 'Закрити', val: null }] });
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^sup[A-Z]/.test(el.dataset.a)) return; const a = el.dataset.a;
    if (a === 'supOpen') supOpen(el.dataset.id);
    if (a === 'supNew') supEdit();
    if (a === 'supPrices') supPrices();
    if (a === 'supMake') { const r = await act('skSupSave', { p: { n: el.dataset.n } }, '➕ Профіль створено'); if (r) { await supLoad(); supOpen(r.p.id); } }
  });
