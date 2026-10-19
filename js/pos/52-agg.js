  // ===== 🛵 Агрегатори доставки (Glovo, Bolt Food…) — модуль `agg`, сервер agg.js =====
  // Список завантажується раз (кнопки оплати при закритті стола), оновлюється після змін у налаштуваннях
  async function aggsLoad(force) {
    if (!modOn('agg')) return [];
    if (!S.aggs || force) { const r = await api('aggList').catch(() => null); if (!r) return S.aggs || []; S.aggsAll = r.list || []; S.aggs = S.aggsAll.filter(a => a.on); }
    return S.aggs;
  }
  async function aggManage() {
    await aggsLoad(true); const l = S.aggsAll || [];
    const v = await modal({ title: '🛵 Агрегатори доставки', body: `<div class="muted" style="font-size:12px;margin-bottom:8px">Замовлення з агрегатора закривайте оплатою «🛵 назва». Виплату агрегатора у банківській виписці система зіставить з продажами сама, а комісію запише витратою.</div>
      ${l.map(a => `<div class="kv"><span style="min-width:0;overflow-wrap:anywhere">${a.on ? '🟢' : '⚪️'} ${esc(a.n)}<br><small class="muted">комісія ~${a.fee || 0}%${a.rx ? ' · у виписці: ' + esc(a.rx) : ''}</small></span></div>`).join('')}`,
      buttons: [...l.map(a => ({ label: '✏️ ' + a.n, val: 'ed:' + a.id })), { label: '➕ Додати', val: 'add' }, { label: 'Закрити', val: null }] });
    if (String(v).startsWith('ed:')) return aggEd(v.slice(3));
    if (v === 'add') { const n = await ask('Назва агрегатора', 'Напр.: Uklon Food'); if (!n) return; const fee = await ask('Комісія, %', 'Орієнтовна — для підказки при звірці', 'number'); if (await act('aggSet', { n, fee }, '🛵 Додано')) { await aggsLoad(true); aggManage(); } }
  }
  on('aggManage', async () => { aggManage(); return; });
  async function aggEd(id) {
    const a = (S.aggsAll || []).find(x => x.id === id); if (!a) return;
    const v = await choose('🛵 ' + a.n, `Комісія ~${a.fee || 0}% · ${a.on ? 'увімкнено' : 'вимкнено'}`, [{ label: a.on ? '⚪️ Вимкнути' : '🟢 Увімкнути', val: 'on' }, { label: '💸 Комісія, %', val: 'fee' }, { label: '✏️ Назва', val: 'n' }, { label: '🏦 Як підписаний у виписці', val: 'rx' }]);
    if (!v) return aggManage();
    const p = { id: a.id };
    if (v === 'on') p.on = a.on ? 0 : 1;
    else { const x = await askVal({ fee: 'Комісія, %', n: 'Назва', rx: 'Як агрегатор підписаний у виписці (через |, напр.: glovo|глово)' }[v], a[v] ?? '', v === 'fee' ? 'number' : 'text'); if (x == null || x === '') return aggManage(); p[v] = x; }
    if (await act('aggSet', p, '🛵 Збережено')) await aggsLoad(true); aggManage();
  }
