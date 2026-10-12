// 📸 ШІ-фото страв — ОДНЕ вікно для каси (Налаштування → Меню) і кабінету власника (Меню).
// open(ctx) — стиль закладу (промт + до 2 зразків) і пакетна генерація; dish(ctx, it) — одна страва зі своїм промтом і налаштуваннями.
// ctx: { menu, vapi(op, data), toast, img() → dataURL|null, onDone }. Дані спільні на сервері: cfg:photoStyle { prompt, refs, dish{id:note} } (worker/src/photoai.js).
window.PHOTOAI = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let C, inf, paid = false;
  const TA = 'width:100%;font:inherit;color:inherit;background:var(--card2,#ffffff10);border:1px solid var(--line,#ffffff22);border-radius:12px;padding:10px';
  const box = (title, html) => { document.getElementById('phw')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="phw" style="z-index:60"><div class="modal" style="width:min(640px,100%);max-width:640px">${title ? `<h3>${title}</h3>` : ''}${html}</div></div>`); return document.getElementById('phw'); };
  const close = () => document.getElementById('phw')?.remove();
  const items = () => C.menu.categories.filter(c => !c.tech).flatMap(c => c.items);
  const nm = it => it.name?.uk || it.name || '';
  async function load(ctx) { C = ctx; try { inf = await C.vapi('photoInfo'); } catch (e) { C.toast('⚠️ ' + e.message); return false; } if (!inf.on) { C.toast('⚠️ ШІ-фото ще не підключено'); return false; } inf.dish ||= {}; return true; }
  const quotaRow = () => `<div class="kv"><span>Цього місяця</span><b>${inf.n} / ${inf.free} безкоштовних${inf.over ? ` · понад ліміт ${inf.over} × ${inf.price} ₴` : ''}</b></div>`;
  const refsRow = () => `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">${inf.refs.map((u, i) => `<div style="width:84px;height:84px;border-radius:12px;background:var(--card2,#ffffff10) url('${esc(u)}') center/cover;position:relative"><button data-ph="refDel" data-i="${i}" style="position:absolute;top:2px;right:2px;background:#000a;color:#fff;border-radius:8px;width:24px;height:24px">✕</button></div>`).join('')}${inf.refs.length < 2 ? '<button class="btn sm" data-ph="refAdd" style="height:84px">＋ Зразок</button>' : ''}</div>`;
  const styleBlock = () => `<label>🎨 Стиль закладу (для всіх фото)<textarea id="phP" rows="6" style="${TA}">${esc(inf.prompt || inf.def)}</textarea></label>
      <div class="btnrow" style="margin:6px 0 10px"><button class="btn sm ghost" data-ph="def">↺ Стандартний стиль</button></div>
      <div class="muted" style="font-size:13px">Зразки стилю (до 2) — ваші найкращі фото. ШІ бере з них лише фон і світло:</div>${refsRow()}`;
  async function saveStyle(w) { const p = w.querySelector('#phP')?.value.trim(); if (p && p !== (inf.prompt || inf.def)) { await C.vapi('photoStyleSet', { prompt: p }); inf.prompt = p; } }
  async function styleClick(a, b, w, back) { // спільні кнопки блоку стилю; true — оброблено
    if (a === 'def') { w.querySelector('#phP').value = inf.def; return true; }
    if (a === 'refDel') { await saveStyle(w).catch(() => {}); try { inf = { ...inf, ...(await C.vapi('photoStyleSet', { refDel: +b.dataset.i })) }; } catch (x) { C.toast('⚠️ ' + x.message); } back(); return true; }
    if (a === 'refAdd') { await saveStyle(w).catch(() => {}); refPick(back); return true; }
    return false;
  }

  // ---------- загальне вікно: стиль + пакетна генерація ----------
  async function open(ctx) {
    paid = false; if (!(await load(ctx))) return;
    const show = () => {
      const all = items(), noImg = all.filter(i => !i.img), withImg = all.filter(i => i.img);
      const w = box('📸 ШІ-фото страв — один стиль для всіх', `<div class="muted" style="font-size:13px;margin-bottom:8px">Опишіть стиль один раз — і всі фото меню будуть однакові: той самий фон, світло, кут, посуд. Для окремої страви відкрийте її → «📸 ШІ-фото».</div>
        ${styleBlock()}${quotaRow()}
        <div style="display:grid;gap:8px;margin-top:12px"><button class="btn primary" data-ph="save">💾 Зберегти стиль</button>
          ${noImg.length ? `<button class="btn" data-ph="gen">✨ Згенерувати фото для всіх без фото (${noImg.length})</button>` : ''}
          ${withImg.length ? `<button class="btn" data-ph="edit">🪄 Привести наявні фото до стилю (${withImg.length})</button>` : ''}
          <button class="btn" data-ph="pick">🎯 Обрати страви вручну</button><button class="btn" data-ph="one">🍽 Одна страва — з налаштуваннями</button><button class="btn ghost" data-ph="x">Закрити</button></div>`);
      w.addEventListener('click', async e => {
        if (e.target === w) return close(); const b = e.target.closest('[data-ph]'); if (!b) return; const a = b.dataset.ph;
        if (a === 'x') return close();
        if (await styleClick(a, b, w, show)) return;
        try { await saveStyle(w); } catch (x) { return C.toast('⚠️ ' + x.message); }
        if (a === 'save') { C.toast('💾 Стиль збережено'); return close(); }
        if (a === 'gen') return batch(noImg, 'gen');
        if (a === 'edit') return batch(withImg, 'edit');
        if (a === 'pick') return pickList(false);
        if (a === 'one') return pickList(true);
      });
    };
    show();
  }
  function refPick(back) {
    const withImg = items().filter(x => x.img);
    const w = box('＋ Зразок стилю', `<div class="muted" style="font-size:13px;margin-bottom:8px">Оберіть фото страви з меню — або завантажте своє.</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;max-height:50vh;overflow:auto">${withImg.map(x => `<button data-r="${x.id}" style="aspect-ratio:1;border-radius:12px;background:var(--card2,#ffffff10) url('${esc(x.img)}') center/cover" title="${esc(nm(x))}"></button>`).join('')}</div><div class="btnrow" style="margin-top:10px"><button class="btn" data-r="up">📤 Своє фото</button><button class="btn ghost" data-r="x">Назад</button></div>`);
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-r]'); if (!b) return; const r = b.dataset.r; if (r === 'x') return back();
      try {
        let x; if (r === 'up') { const data = await C.img(); if (!data) return; x = await C.vapi('photoStyleSet', { refData: data }); } else x = await C.vapi('photoStyleSet', { refFrom: r });
        inf = { ...inf, ...x }; C.toast('＋ Зразок додано');
      } catch (x) { C.toast('⚠️ ' + x.message); }
      back();
    });
  }
  function pickList(one) {
    const w = box(one ? '🍽 Яка страва' : '🎯 Які страви', `<div style="max-height:55vh;overflow:auto;display:grid;gap:4px">${C.menu.categories.filter(c => !c.tech).map(c => `<div class="muted" style="margin-top:8px">${esc(c.name.uk)}</div>${c.items.map(i => `<label class="kv" style="cursor:pointer" ${one ? `data-one="${i.id}"` : ''}><span style="display:flex;gap:8px;align-items:center"><i style="width:36px;height:36px;border-radius:8px;flex:none;background:var(--card2,#ffffff10) center/cover;${i.img ? `background-image:url('${esc(i.img)}')` : ''}"></i>${esc(nm(i))}${inf.dish[i.id] ? ' ✍️' : ''}</span>${one ? '›' : `<input type="checkbox" value="${i.id}" style="width:22px;height:22px">`}</label>`).join('')}`).join('')}</div>
      <div class="btnrow" style="margin-top:10px">${one ? '' : '<button class="btn primary" data-k="gen">✨ Згенерувати нові</button><button class="btn" data-k="edit">🪄 Обробити наявні</button>'}<button class="btn ghost" data-k="x">Назад</button></div>`);
    w.addEventListener('click', e => {
      const o = e.target.closest('[data-one]'); if (o) { const it = items().find(i => i.id === o.dataset.one); return it && dishWin(it); }
      const b = e.target.closest('[data-k]'); if (!b) return; if (b.dataset.k === 'x') return open(C);
      const ids = new Set([...w.querySelectorAll('input:checked')].map(x => x.value)), l = items().filter(i => ids.has(i.id)); if (!l.length) return C.toast('Позначте страви');
      batch(b.dataset.k === 'edit' ? l.filter(i => i.img) : l, b.dataset.k);
    });
  }
  async function make(body) {
    try { return await C.vapi('photoMake', { ...body, ...(paid ? { pay: 1 } : {}) }); }
    catch (e) { if ((e.data?.error || e.message) !== 'pay') { C.toast('⚠️ ' + e.message); return null; }
      if (!confirm(`📸 ${inf.free} безкоштовних фото цього місяця використано.\nДалі — ${inf.price} ₴ за кожне фото. Продовжити?`)) return null;
      paid = true; return make(body); }
  }
  async function batch(list, mode) {
    if (!list.length) return C.toast('Немає страв');
    const left = Math.max(0, inf.free - inf.n), over = Math.max(0, list.length - left);
    if (!confirm(`${mode === 'gen' ? '✨ Згенерувати' : '🪄 Обробити'} ${list.length} фото?\nБезкоштовно ще ${left}.${over ? ` Понад ліміт — ${over} × ${inf.price} ₴ = ${over * inf.price} ₴.` : ''}\nЗайме ~${Math.ceil(list.length * 15 / 60)} хв — вікно не закривайте.`)) return;
    if (over) paid = true;
    const done = [], w = box('📸 Генерую…', '<div id="phProg" class="muted">…</div><div id="phGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px"></div>');
    for (const [k, it] of list.entries()) {
      if (!document.getElementById('phw')) break; w.querySelector('#phProg').textContent = `⏳ ${k + 1} / ${list.length}: ${nm(it)}`;
      const r = await make({ id: it.id, ...(mode === 'edit' ? { mode: 'edit' } : {}) }); if (!r) { if (!paid) break; continue; }
      done.push({ it, u: r.draft }); w.querySelector('#phGrid').insertAdjacentHTML('beforeend', `<button class="on" data-i="${done.length - 1}" style="aspect-ratio:1;border-radius:12px;background:#000 url('${esc(r.draft)}') center/cover;outline:3px solid var(--green,#3c3);position:relative" title="${esc(nm(it))}"><small style="position:absolute;left:4px;right:4px;bottom:4px;background:#000a;color:#fff;border-radius:6px;font-size:10px;padding:2px">${esc(nm(it))}</small></button>`);
    }
    if (!done.length) return close();
    w.querySelector('#phProg').innerHTML = `✅ Готово: ${done.length}. Торкніться фото, яке НЕ подобається, — воно не піде в меню.`;
    w.querySelector('.modal').insertAdjacentHTML('beforeend', '<div class="btnrow" style="margin-top:12px"><button class="btn primary" data-f="ok">✅ Взяти в меню</button><button class="btn ghost" data-f="no">Відкинути всі</button></div>');
    w.addEventListener('click', async e => {
      const t = e.target.closest('#phGrid [data-i]'); if (t) { t.classList.toggle('on'); const on = t.classList.contains('on'); t.style.outline = `3px solid ${on ? 'var(--green,#3c3)' : 'var(--red,#e44)'}`; t.style.opacity = on ? 1 : .4; return; }
      const f = e.target.closest('[data-f]'); if (!f) return; f.disabled = true;
      const keep = new Set([...w.querySelectorAll('#phGrid .on')].map(b => +b.dataset.i)); let n = 0;
      for (const [i, d] of done.entries()) { if (f.dataset.f === 'ok' && keep.has(i)) { if (await C.vapi('photoApply', { id: d.it.id }).catch(() => null)) n++; } else await C.vapi('photoDrop', { id: d.it.id }).catch(() => {}); }
      close(); C.toast(`📸 У меню: ${n} фото`); C.onDone?.();
    });
  }

  // ---------- одна страва: джерело, свій промт, зразки, точність → «було / ШІ» ----------
  async function dish(ctx, it, o = {}) { paid = false; if (!(await load(ctx))) return; dishWin(it, o.data ? { src: 'up', data: o.data } : {}); } // o.data — щойно завантажене фото
  function dishWin(it, st = {}) {
    st.src ??= it.img ? 'edit' : 'gen'; st.note ??= inf.dish[it.id] || ''; st.strict ??= true;
    const hasPhoto = st.src !== 'gen', srcImg = st.src === 'up' ? st.data : st.src === 'edit' ? it.img : '';
    st.refs ??= !hasPhoto;
    const opt = (k, l, dis) => `<button class="btn sm ${st.src === k ? 'primary' : ''}" data-d="src" data-v="${k}" ${dis ? 'disabled' : ''}>${l}</button>`;
    const w = box('', `<h3>📸 ${esc(nm(it))}</h3>
      <div class="muted" style="font-size:13px;margin-bottom:6px">1. Звідки фото</div>
      <div class="btnrow" style="flex-wrap:wrap;gap:6px">${opt('edit', '🪄 Наявне фото', !it.img)}${opt('up', '📷 Своє фото')}${opt('gen', '✨ З нуля')}</div>
      ${srcImg ? `<img src="${esc(srcImg)}" alt="" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:12px;margin-top:8px">` : ''}
      <label style="display:block;margin-top:12px">2. ✍️ Як виглядає саме ця страва <span class="muted" style="font-size:12px">— форма, посуд, подача, що НЕ має бути</span>
        <textarea id="phN" rows="4" style="${TA}" placeholder="напр.: кругла піца на дерев'яній дошці, 8 шматків, зверху базилік; без соусу збоку">${esc(st.note)}</textarea></label>
      <div class="muted" style="font-size:12px">ШІ також бере назву${it.desc?.uk ? ', склад' : ''}${it.size ? ' і вагу' : ''} з меню. Опис зберігається для цієї страви — і в касі, і в кабінеті.</div>
      <div style="display:grid;gap:6px;margin-top:12px">
        ${hasPhoto ? `<label class="kv" style="cursor:pointer"><span>🎯 Суворо як на фото <small class="muted">(міняє лише фон і світло)</small></span><input type="checkbox" id="phS" ${st.strict ? 'checked' : ''} style="width:22px;height:22px"></label>` : ''}
        <label class="kv" style="cursor:pointer"><span>🖼 Враховувати зразки стилю (${inf.refs.length})${hasPhoto && st.strict ? ' <small class="muted">— у суворому режимі вимкнено</small>' : ''}</span><input type="checkbox" id="phR" ${st.refs ? 'checked' : ''} ${!inf.refs.length || (hasPhoto && st.strict) ? 'disabled' : ''} style="width:22px;height:22px"></label></div>
      <details style="margin-top:10px"><summary style="cursor:pointer">🎨 Стиль закладу (спільний для всіх фото)</summary><div style="margin-top:8px">${styleBlock()}</div></details>
      ${quotaRow()}
      <div style="display:grid;gap:8px;margin-top:12px"><button class="btn primary" data-d="go">✨ Згенерувати</button><button class="btn ghost" data-d="x">Закрити</button></div>`);
    const grab = () => { st.note = w.querySelector('#phN').value.trim(); const s = w.querySelector('#phS'), r = w.querySelector('#phR'); if (s) st.strict = s.checked; if (r && !r.disabled) st.refs = r.checked; };
    w.addEventListener('change', e => { if (e.target.id === 'phS') { grab(); dishWin(it, st); } });
    w.addEventListener('click', async e => {
      if (e.target === w) return close();
      const p = e.target.closest('[data-ph]'); if (p) { grab(); if (await styleClick(p.dataset.ph, p, w, () => dishWin(it, st))) return; }
      const b = e.target.closest('[data-d]'); if (!b) return; const a = b.dataset.d;
      if (a === 'x') { grab(); if (st.note !== (inf.dish[it.id] || '')) C.vapi('photoStyleSet', { dish: { id: it.id, note: st.note } }).then(() => { inf.dish[it.id] = st.note; }).catch(() => {}); return close(); }
      if (a === 'src') { grab(); const v = b.dataset.v; if (v === 'up') { const data = await C.img(); if (!data) return; st.data = data; } st.src = v; st.refs = v === 'gen'; return dishWin(it, st); }
      if (a === 'go') {
        grab(); try { await saveStyle(w); } catch (x) { return C.toast('⚠️ ' + x.message); }
        b.disabled = true; b.textContent = '⏳ ШІ малює… до хвилини';
        const body = { id: it.id, note: st.note, strict: st.strict ? 1 : 0, refs: st.refs ? 1 : 0, ...(st.src === 'edit' ? { mode: 'edit' } : st.src === 'up' ? { data: st.data } : {}) };
        const r = await make(body); if (st.note) inf.dish[it.id] = st.note; else delete inf.dish[it.id];
        if (!r) { b.disabled = false; b.textContent = '✨ Згенерувати'; return; }
        inf.n = r.n; inf.over = r.over; review(it, st, r);
      }
    });
  }
  function review(it, st, r) {
    const before = st.src === 'up' ? st.data : st.src === 'edit' ? it.img : '';
    const w = box('📸 ' + esc(nm(it)), `<div style="display:grid;grid-template-columns:${before ? '1fr 1fr' : '1fr'};gap:8px">${before ? `<figure style="margin:0"><img src="${esc(before)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px"><figcaption class="muted" style="text-align:center">було</figcaption></figure>` : ''}<figure style="margin:0"><img src="${esc(r.draft)}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px"><figcaption class="muted" style="text-align:center">ШІ</figcaption></figure></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Цього місяця: ${r.n} фото${r.over ? ` · понад ліміт ${r.over} × ${r.price} ₴` : ` з ${r.free} безкоштовних`}</div>
      <div style="display:grid;gap:8px;margin-top:12px"><button class="btn primary" data-v="ok">✅ Взяти в меню</button><button class="btn" data-v="edit">✍️ Підправити опис і ще раз</button><button class="btn ghost" data-v="no">✕ Не треба</button></div>`);
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-v]'); if (!b) return; b.disabled = true; const v = b.dataset.v;
      if (v === 'ok') { try { await C.vapi('photoApply', { id: it.id }); C.toast('📸 Фото в меню'); C.onDone?.(); } catch (x) { C.toast('⚠️ ' + x.message); } return close(); }
      await C.vapi('photoDrop', { id: it.id }).catch(() => {});
      if (v === 'edit') return dishWin(it, st); close();
    });
  }
  return { open, dish };
})();
