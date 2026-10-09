// 📸 Кабінет → Меню → «📸 ШІ-фото»: один стиль (промт + до 2 фото-зразків) для всіх фото страв.
// Генерація по одній страві за запит (photoMake) → чернетки → огляд «що взяти» → photoApply / photoDrop. Сервер: worker/src/photoai.js.
window.OWNPHOTO = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let C, inf, paid = false;
  const box = (title, html) => { document.getElementById('phw')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="phw"><div class="modal" style="max-width:640px"><h3>${title}</h3>${html}</div></div>`); return document.getElementById('phw'); };
  const close = () => document.getElementById('phw')?.remove();
  const items = () => C.menu.categories.filter(c => !c.tech).flatMap(c => c.items);
  async function open(ctx) {
    C = ctx; paid = false;
    try { inf = await C.vapi('photoInfo'); } catch (e) { return C.toast('⚠️ ' + e.message); }
    if (!inf.on) return C.toast('⚠️ ШІ-фото ще не підключено');
    const all = items(), noImg = all.filter(i => !i.img), withImg = all.filter(i => i.img);
    const w = box('📸 ШІ-фото страв — один стиль для всіх', `<div class="muted" style="font-size:13px;margin-bottom:8px">Опишіть стиль один раз — і всі фото меню будуть однакові: той самий фон, світло, кут, посуд. ШІ бере назву й опис страви з меню.</div>
      <label>🎨 Стиль (промт для всіх фото)<textarea id="phP" rows="7" style="width:100%;font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:12px">${esc(inf.prompt || inf.def)}</textarea></label>
      <div class="btnrow" style="margin:6px 0 10px"><button class="btn sm ghost" data-ph="def">↺ Стандартний стиль</button></div>
      <div class="muted" style="font-size:13px">Зразки стилю (до 2) — ваші найкращі фото, ШІ повторить їхній вигляд:</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">${inf.refs.map((u, i) => `<div style="width:84px;height:84px;border-radius:12px;background:var(--card2) url('${esc(u)}') center/cover;position:relative"><button data-ph="refDel" data-i="${i}" style="position:absolute;top:2px;right:2px;background:#000a;border-radius:8px;width:24px;height:24px">✕</button></div>`).join('')}${inf.refs.length < 2 ? '<button class="btn sm" data-ph="refAdd" style="height:84px">＋ Зразок</button>' : ''}</div>
      <div class="kv"><span>Цього місяця</span><b>${inf.n} / ${inf.free} безкоштовних${inf.over ? ` · понад ліміт ${inf.over} × ${inf.price} ₴` : ''}</b></div>
      <div style="display:grid;gap:8px;margin-top:12px"><button class="btn primary" data-ph="save">💾 Зберегти стиль</button>
        ${noImg.length ? `<button class="btn" data-ph="gen">✨ Згенерувати фото для всіх без фото (${noImg.length})</button>` : ''}
        ${withImg.length ? `<button class="btn" data-ph="edit">🪄 Привести наявні фото до стилю (${withImg.length})</button>` : ''}
        <button class="btn" data-ph="pick">🎯 Обрати страви вручну</button><button class="btn ghost" data-ph="x">Закрити</button></div>`);
    w.addEventListener('click', async e => {
      if (e.target === w) return close(); const b = e.target.closest('[data-ph]'); if (!b) return; const a = b.dataset.ph;
      if (a === 'x') return close();
      if (a === 'def') { w.querySelector('#phP').value = inf.def; return; }
      const p = w.querySelector('#phP')?.value.trim(); if (p && p !== (inf.prompt || inf.def)) { try { await C.vapi('photoStyleSet', { prompt: p }); inf.prompt = p; } catch (x) { return C.toast('⚠️ ' + x.message); } }
      if (a === 'save') { C.toast('💾 Стиль збережено'); return close(); }
      if (a === 'refDel') { await C.vapi('photoStyleSet', { refDel: +b.dataset.i }).catch(x => C.toast('⚠️ ' + x.message)); return open(C); }
      if (a === 'refAdd') return refPick();
      if (a === 'gen') return batch(noImg, 'gen');
      if (a === 'edit') return batch(withImg, 'edit');
      if (a === 'pick') return pickList();
    });
  }
  function refPick() {
    const withImg = items().filter(x => x.img);
    const w = box('＋ Зразок стилю', `<div class="muted" style="font-size:13px;margin-bottom:8px">Оберіть фото страви з меню — або завантажте своє.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;max-height:50vh;overflow:auto">${withImg.map(x => `<button data-r="${x.id}" style="aspect-ratio:1;border-radius:12px;background:var(--card2) url('${esc(x.img)}') center/cover" title="${esc(x.name.uk)}"></button>`).join('')}</div><div class="btnrow" style="margin-top:10px"><button class="btn" data-r="up">📤 Своє фото</button><button class="btn ghost" data-r="x">Назад</button></div>`);
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-r]'); if (!b) return; const r = b.dataset.r; if (r === 'x') return open(C);
      try {
        if (r === 'up') { const data = await C.img(1200); if (!data) return; await C.vapi('photoStyleSet', { refData: data }); }
        else await C.vapi('photoStyleSet', { refFrom: r });
        C.toast('＋ Зразок додано');
      } catch (x) { C.toast('⚠️ ' + x.message); }
      open(C);
    });
  }
  function pickList() {
    const w = box('🎯 Які страви', `<div style="max-height:55vh;overflow:auto;display:grid;gap:4px">${C.menu.categories.filter(c => !c.tech).map(c => `<div class="muted" style="margin-top:8px">${esc(c.name.uk)}</div>${c.items.map(i => `<label class="kv" style="cursor:pointer"><span style="display:flex;gap:8px;align-items:center"><i style="width:36px;height:36px;border-radius:8px;flex:none;background:var(--card2) center/cover;${i.img ? `background-image:url('${esc(i.img)}')` : ''}"></i>${esc(i.name.uk)}</span><input type="checkbox" value="${i.id}" style="width:22px;height:22px"></label>`).join('')}`).join('')}</div>
      <div class="btnrow" style="margin-top:10px"><button class="btn primary" data-k="gen">✨ Згенерувати нові</button><button class="btn" data-k="edit">🪄 Обробити наявні</button><button class="btn ghost" data-k="x">Назад</button></div>`);
    w.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; if (b.dataset.k === 'x') return open(C);
      const ids = new Set([...w.querySelectorAll('input:checked')].map(x => x.value)), l = items().filter(i => ids.has(i.id)); if (!l.length) return C.toast('Позначте страви');
      batch(b.dataset.k === 'edit' ? l.filter(i => i.img) : l, b.dataset.k); });
  }
  async function make(id, mode) {
    try { return await C.vapi('photoMake', { id, ...(mode === 'edit' ? { mode: 'edit' } : {}), ...(paid ? { pay: 1 } : {}) }); }
    catch (e) { if (e.message !== 'pay') { C.toast('⚠️ ' + e.message); return null; }
      if (!confirm(`📸 ${inf.free} безкоштовних фото цього місяця використано.\nДалі — ${inf.price} ₴ за кожне фото (додасться до рахунку за систему). Продовжити?`)) return null;
      paid = true; return make(id, mode); }
  }
  async function batch(list, mode) {
    if (!list.length) return C.toast('Немає страв');
    const left = Math.max(0, inf.free - inf.n), over = Math.max(0, list.length - left);
    if (!confirm(`${mode === 'gen' ? '✨ Згенерувати' : '🪄 Обробити'} ${list.length} фото?\nБезкоштовно ще ${left}.${over ? ` Понад ліміт — ${over} × ${inf.price} ₴ = ${over * inf.price} ₴.` : ''}\nЗайме ~${Math.ceil(list.length * 15 / 60)} хв — вікно не закривайте.`)) return;
    if (over) paid = true;
    const done = [], w = box('📸 Генерую…', '<div id="phProg" class="muted">…</div><div id="phGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px"></div>');
    for (const [k, it] of list.entries()) {
      if (!document.getElementById('phw')) break; w.querySelector('#phProg').textContent = `⏳ ${k + 1} / ${list.length}: ${it.name.uk}`;
      const r = await make(it.id, mode); if (!r) { if (!paid) break; continue; }
      done.push({ it, u: r.draft }); w.querySelector('#phGrid').insertAdjacentHTML('beforeend', `<button class="on" data-i="${done.length - 1}" style="aspect-ratio:1;border-radius:12px;background:#000 url('${esc(r.draft)}') center/cover;outline:3px solid var(--green);position:relative" title="${esc(it.name.uk)}"><small style="position:absolute;left:4px;right:4px;bottom:4px;background:#000a;border-radius:6px;font-size:10px;padding:2px">${esc(it.name.uk)}</small></button>`);
    }
    if (!done.length) return close();
    w.querySelector('#phProg').innerHTML = `✅ Готово: ${done.length}. Торкніться фото, яке НЕ подобається, — воно не піде в меню.`;
    w.querySelector('.modal').insertAdjacentHTML('beforeend', '<div class="btnrow" style="margin-top:12px"><button class="btn primary" data-f="ok">✅ Взяти в меню</button><button class="btn ghost" data-f="no">Відкинути всі</button></div>');
    w.addEventListener('click', async e => {
      const t = e.target.closest('#phGrid [data-i]'); if (t) { t.classList.toggle('on'); t.style.outline = t.classList.contains('on') ? '3px solid var(--green)' : '3px solid var(--red)'; t.style.opacity = t.classList.contains('on') ? 1 : .4; return; }
      const f = e.target.closest('[data-f]'); if (!f) return; f.disabled = true;
      const keep = new Set([...w.querySelectorAll('#phGrid .on')].map(b => +b.dataset.i)); let n = 0;
      for (const [i, d] of done.entries()) { if (f.dataset.f === 'ok' && keep.has(i)) { if (await C.vapi('photoApply', { id: d.it.id }).catch(() => null)) n++; } else await C.vapi('photoDrop', { id: d.it.id }).catch(() => {}); }
      close(); C.toast(`📸 У меню: ${n} фото`); C.onDone?.();
    });
  }
  return { open };
})();
