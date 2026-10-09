// 🚀 Кабінет → «Продажі» (лише платформа): заявки з сайту ATOM (posatom.online), статуси, нотатки, нагадування «подзвонити»,
// статистика переглядів і конверсії, демо-каса для сайту. Сервер: owner.js (leads, leadSet, demo) + hub.js (lead:*, ah:*).
window.OWNCRM = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ST = { new: '🆕 Нова', call: '📞 Подзвонили', demo: '📱 Демо', trial: '🧪 Пробний', won: '✅ Клієнт', lost: '❌ Відмова' };
  let C, D = null, F = 'open', P = 30, busy = false;
  const tm = t => new Date(t).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const load = async () => { if (busy) return; busy = true; try { D = await C.api('leads', { days: P }); } catch (e) { C.toast('⚠️ ' + e.message); } busy = false; C.render(); };
  function stats() {
    const h = D.hits || [], v = h.reduce((s, x) => s + (x.view || 0), 0), from = Date.now() - P * 864e5, L = D.list.filter(x => x.at >= from), won = L.filter(x => x.st === 'won').length;
    const max = Math.max(1, ...h.map(x => x.view || 0)), bars = h.map(x => `<i title="${x.d}: ${x.view || 0} переглядів, ${x.lead || 0} заявок" style="height:${Math.max(4, (x.view || 0) / max * 100)}%">${x.lead ? '<b></b>' : ''}</i>`).join('');
    return `<div class="kpis">${C.kpi('Переглядів', v, `унікальних за ${P} дн.`)}${C.kpi('Заявок', L.length, v ? `конверсія ${(L.length / v * 100).toFixed(1)}%` : '')}${C.kpi('Клієнтів', won, L.length ? `${Math.round(won / L.length * 100)}% заявок` : '')}${C.kpi('В роботі', D.list.filter(x => !['won', 'lost'].includes(x.st)).length, 'усього')}</div>
      <div class="card crm-ch"><div class="crm-bars">${bars}</div><div class="muted" style="font-size:12px;margin-top:6px">Перегляди posatom.online по днях · жовта точка — день із заявкою</div></div>`;
  }
  function card(x) {
    const late = x.next && x.next < Date.now() && !['won', 'lost'].includes(x.st);
    return `<div class="card crm-l${x.st === 'lost' ? ' done' : ''}"><div class="h"><b>${esc(x.name)}</b><span class="st crm-${x.st}">${ST[x.st] || x.st}</span></div>
      <div class="muted" style="font-size:13px">📞 <b class="crm-ph">${esc(x.phone)}</b> <button class="btn sm ghost" data-crm="copy" data-v="${esc(x.phone)}">📋</button><br>${x.place ? '🏪 ' + esc(x.place) : ''}${x.city ? ' · ' + esc(x.city) : ''}${x.place || x.city ? '<br>' : ''}🕓 ${tm(x.at)}${x.src && x.src !== 'site' ? ' · ' + esc(x.src) : ''}${x.venue ? ' · заклад <b>' + esc(x.venue) + '</b>' : ''}</div>
      ${x.msg ? `<p class="ib-t">💬 ${esc(x.msg)}</p>` : ''}${x.note ? `<p class="ib-t">📝 ${esc(x.note)}</p>` : ''}
      ${x.next ? `<div style="font-size:13px;margin:4px 0;color:${late ? '#ff6b6b' : 'var(--accent)'}">⏰ ${late ? 'прострочено · ' : ''}${tm(x.next)}</div>` : ''}
      <div class="chips crm-st">${Object.entries(ST).map(([k, l]) => `<button class="${x.st === k ? 'on' : ''}" data-crm="st" data-id="${x.id}" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="btnrow"><button class="btn sm" data-crm="note" data-id="${x.id}">📝 Нотатка</button><button class="btn sm" data-crm="next" data-id="${x.id}">⏰ Нагадати</button>${x.venue ? '' : `<button class="btn sm" data-crm="mk" data-id="${x.id}">➕ Створити заклад</button>`}<button class="btn sm red" data-crm="del" data-id="${x.id}">🗑</button></div></div>`;
  }
  function view(ctx) {
    C = ctx; if (!D) { load(); return '<div class="muted">…</div>'; }
    const L = D.list.filter(x => F === 'all' ? 1 : F === 'open' ? !['won', 'lost'].includes(x.st) : F === 'due' ? x.next && x.next < Date.now() + 864e5 && !['won', 'lost'].includes(x.st) : x.st === F);
    return `<h2>🚀 Продажі ATOM</h2><div class="chips">${[[7, '7 днів'], [30, '30 днів'], [90, '90 днів']].map(([k, l]) => `<button class="${P === k ? 'on' : ''}" data-crm="per" data-v="${k}">${l}</button>`).join('')}</div>${stats()}
      <div class="card" style="margin-top:12px"><h3>📱 Демо-каса для сайту</h3><div class="muted" style="font-size:13px;margin-bottom:8px">Кнопка «Спробувати касу» на posatom.online відкриває заклад <b>atom-demo</b> без PIN. Щоночі о 4:00 він повертається до еталону. Налаштуйте його як вітрину (меню, фото, сайт) і натисніть «📸 Зберегти еталон». У демо вимкнено ШІ, Telegram, друк, персонал і коди.</div>
        <div class="btnrow">${D.demo ? '<button class="btn sm" data-crm="demoGo">Каса демо →</button><button class="btn sm" data-crm="demoCfg">⚙️ Налаштувати</button><button class="btn sm primary" data-crm="demoSave">📸 Зберегти еталон</button>' : '<button class="btn sm primary" data-crm="demoNew">🎬 Створити демо-касу</button>'}<a class="btn sm ghost" href="https://posatom.online/" target="_blank" rel="noopener">🌐 Сайт ATOM</a></div></div>
      <h2>📋 Заявки</h2><div class="chips">${[['open', 'В роботі'], ['due', '⏰ Дзвонити'], ['new', '🆕 Нові'], ['won', '✅ Клієнти'], ['lost', '❌ Відмови'], ['all', 'Усі']].map(([k, l]) => `<button class="${F === k ? 'on' : ''}" data-crm="f" data-v="${k}">${l}</button>`).join('')}<button data-crm="add">➕ Додати вручну</button></div>
      <div class="grid">${L.map(card).join('') || '<div class="muted">Порожньо — заявки з posatom.online зʼявляться тут і в Telegram</div>'}</div>`;
  }
  const set = async (id, f) => { try { const r = await C.api('leadSet', { id, f }); D.list = D.list.map(x => x.id === id ? r.lead || x : x).filter(x => !(f.del && x.id === id)); C.render(); } catch (e) { C.toast('⚠️ ' + e.message); } };
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-crm]'); if (!el || !C) return; const a = el.dataset.crm, d = el.dataset, x = D?.list.find(l => l.id === d.id);
    if (a === 'per') { P = +d.v; D = null; return C.render(); }
    if (a === 'f') { F = d.v; return C.render(); }
    if (a === 'copy') { try { await navigator.clipboard.writeText(d.v); C.toast('📋 Скопійовано'); } catch { C.toast(d.v); } return; }
    if (a === 'st') return set(d.id, { st: d.v });
    if (a === 'del') { if (confirm('Видалити заявку?')) set(d.id, { del: 1 }); return; }
    if (a === 'note') return C.modal('📝 Нотатка', `<textarea name="n" rows="5" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px">${esc(x?.note)}</textarea>`, f => set(d.id, { note: f.n.value }));
    if (a === 'next') { const t = new Date(Date.now() + 864e5); t.setHours(11, 0, 0, 0); const v = new Date(t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
      return C.modal('⏰ Коли подзвонити', `<div class="muted" style="font-size:13px">У цей час прийде нагадування в Telegram.</div><input type="datetime-local" name="t" value="${v}" required><label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" name="off" style="width:auto"> прибрати нагадування</label>`, f => set(d.id, { next: f.off.checked ? 0 : new Date(f.t.value).getTime() })); }
    if (a === 'add') return C.modal('➕ Заявка вручну', '<input name="name" placeholder="Імʼя" required><input name="phone" placeholder="Телефон" required><input name="place" placeholder="Заклад"><input name="city" placeholder="Місто"><textarea name="msg" rows="3" placeholder="Нотатка" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px"></textarea>',
      async f => { await C.api('leadNew', { name: f.name.value, phone: f.phone.value, place: f.place.value, city: f.city.value, msg: f.msg.value }); D = null; C.render(); });
    if (a === 'mk') { // ➕ заклад із заявки: адреса з назви, власник — новий акаунт з цим імʼям
      const id = (x?.place || x?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
      return C.modal('➕ Заклад із заявки', `<div class="muted" style="font-size:13px">Спершу створіть власника (🌐 Платформа → 👤 Новий власник), потім тут — заклад.</div><input name="id" placeholder="адреса латиницею" value="${esc(id)}" required pattern="[a-z0-9][a-z0-9-]{1,30}"><input name="name" placeholder="Назва" value="${esc(x?.place)}" required><input name="owner" type="email" placeholder="email власника" required><input name="city" placeholder="Місто" value="${esc(x?.city)}">`,
        async f => { await C.api('venueNew', { id: f.id.value, name: f.name.value, owner: f.owner.value, city: f.city.value }); await set(d.id, { st: 'trial', venue: f.id.value }); C.toast('✅ Заклад створено — статус «Пробний»'); });
    }
    if (a === 'demoNew') { el.disabled = true; C.toast('🎬 Створюю демо-касу…'); try { await C.VC.demo('cafe', 'atom-demo', 'ATOM Демо-кавʼярня'); await C.api('demo', { do: 'save' }); D = null; C.toast('✅ Демо-каса готова, еталон збережено'); C.render(); } catch (y) { C.toast('⚠️ ' + y.message); el.disabled = false; } return; }
    if (a === 'demoSave') { el.disabled = true; try { await C.api('demo', { do: 'save' }); C.toast('📸 Еталон збережено — щоночі демо повертатиметься до цього стану'); } catch (y) { C.toast('⚠️ ' + y.message); } el.disabled = false; return; }
    if (a === 'demoGo') return C.enter('atom-demo');
    if (a === 'demoCfg') return C.VC.open('atom-demo');
  });
  return { view, reset: () => { D = null; } };
})();
