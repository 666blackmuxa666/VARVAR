// 📸 ШІ-фото страв — ОДНЕ вікно для каси (Налаштування → Меню) і кабінету власника (Меню).
// open(ctx) — блоки меню: у кожного розділу свої зразки й особливості (фото блоку однакові), загальний стиль закладу — основа; dish(ctx, it) — одна страва зі своїм промтом і налаштуваннями.
// ctx: { menu, vapi(op, data), toast, img() → dataURL|null, onDone }. Дані спільні на сервері: cfg:photoStyle { prompt, refs, dish{id:note} } (worker/src/photoai.js).
window.PHOTOAI = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let C, inf, paid = false;
  const TA = 'width:100%;font:inherit;color:inherit;background:var(--card2,#ffffff10);border:1px solid var(--line,#ffffff22);border-radius:12px;padding:10px';
  const box = (title, html) => { document.getElementById('phw')?.remove(); document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="phw" style="z-index:60"><div class="modal">${title ? `<h3>${title}</h3>` : ''}${html}</div></div>`); if (!document.getElementById('phCss')) document.head.insertAdjacentHTML('beforeend', `<style id="phCss">${CSS}</style>`); return document.getElementById('phw'); };
  const close = () => document.getElementById('phw')?.remove();
  const items = () => C.menu.categories.filter(c => !c.tech).flatMap(c => c.items);
  const nm = it => it.name?.uk || it.name || '';
  async function load(ctx) { C = ctx; try { inf = await C.vapi('photoInfo'); } catch (e) { C.toast('⚠️ ' + e.message); return false; } if (!inf.on) { C.toast('⚠️ ШІ-фото ще не підключено'); return false; } inf.dish ||= {}; inf.cat ||= {}; return true; }
  const CSS = `#phw .modal{width:min(640px,100%);max-width:640px;padding:16px}#phw h3{margin:0 0 8px;text-align:left}#phw .ph-hint{font-size:12px;color:var(--muted,#999);margin:4px 0 8px;text-align:left}
    #phw .ph-q{display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:6px 10px;border-radius:10px;background:var(--card2,#ffffff10);margin:6px 0}
    #phw .ph-cats{display:grid;gap:6px;margin-top:8px}#phw .ph-cat{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;text-align:left;padding:8px 10px;border-radius:12px;background:var(--card2,#ffffff10);border:1px solid var(--line,#ffffff1a);color:inherit;font:inherit;cursor:pointer}
    #phw .ph-cat small,#phw .ph-cat .m{color:var(--muted,#999);font-size:12px}#phw .ph-st{display:flex;width:76px}#phw .ph-st i{width:30px;height:30px;border-radius:8px;background:var(--card,#0003) center/cover;border:2px solid var(--card2,#222);margin-left:-8px}#phw .ph-st i:first-child{margin-left:0}
    #phw .ph-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px;max-height:38vh;overflow:auto;margin:6px 0}#phw .ph-d{position:relative;aspect-ratio:1;border-radius:10px;background:var(--card2,#ffffff10) center/cover;cursor:pointer;display:block;overflow:hidden}
    #phw .ph-d input{position:absolute;top:4px;right:4px;width:20px;height:20px;margin:0}#phw .ph-d b{position:absolute;left:0;right:0;bottom:0;background:#000b;color:#fff;font-size:10px;font-weight:500;padding:3px 4px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#phw .ph-d em{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;font-size:22px;opacity:.5}
    #phw .ph-act{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:6px;margin-top:10px}#phw details summary{cursor:pointer;font-size:14px;padding:4px 0}#phw .ph-steps{font-size:13px;padding:8px 10px;border-radius:10px;border:1px dashed var(--line2,#ffffff33);margin:6px 0;text-align:left}`;
  const quotaRow = () => `<div class="ph-q"><span>📊 Цього місяця</span><b>${inf.n} / ${inf.free}${inf.over ? ` · +${inf.over} × ${inf.price} ₴` : ''}</b></div>`;
  const tgt = cat => cat ? (inf.cat[cat] ||= { prompt: '', refs: [] }) : inf; // стиль блоку або всього закладу
  const refsRow = cat => { const r = tgt(cat).refs; return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${r.map((u, i) => `<div style="width:72px;height:72px;border-radius:10px;background:var(--card2,#ffffff10) url('${esc(u)}') center/cover;position:relative"><button data-ph="refDel" data-i="${i}" style="position:absolute;top:2px;right:2px;background:#000a;color:#fff;border-radius:8px;width:22px;height:22px">✕</button></div>`).join('')}${r.length < 2 ? '<button class="btn sm" data-ph="refAdd" style="height:72px">＋ Зразок</button>' : ''}</div>`; };
  const styleBlock = cat => cat
    ? `<div class="ph-hint" style="margin-top:0">🖼 Зразки блоку (до 2) — з них ШІ повторює фон, кут і світло для КОЖНОЇ страви блоку:</div>${refsRow(cat)}
      <label style="display:block">✍️ Особливості блоку <span class="muted" style="font-size:12px">— необовʼязково</span><textarea id="phP" rows="2" style="${TA}" placeholder="напр.: на дерев'яній дошці, вид збоку, поруч картопля фрі">${esc(tgt(cat).prompt)}</textarea></label>`
    : `<label style="display:block">🎨 Стиль закладу (основа для всіх блоків)<textarea id="phP" rows="5" style="${TA}">${esc(inf.prompt || inf.def)}</textarea></label>
      <div class="btnrow" style="margin:6px 0"><button class="btn sm ghost" data-ph="def">↺ Стандартний стиль</button></div>
      <div class="ph-hint">Загальні зразки (до 2) — для блоків, у яких немає своїх:</div>${refsRow('')}`;
  async function saveStyle(w, cat) { const el = w.querySelector('#phP'); if (!el) return; const p = el.value.trim(), o = tgt(cat), cur = cat ? o.prompt : (inf.prompt || inf.def);
    if (p !== cur && (cat || p)) { await C.vapi('photoStyleSet', { prompt: p, ...(cat ? { cat } : {}) }); if (cat) o.prompt = p; else inf.prompt = p; } }
  const upd = x => { inf = { ...inf, ...x }; inf.cat ||= {}; };
  async function styleClick(a, b, w, back, cat) { // спільні кнопки блоку стилю; true — оброблено
    if (a === 'def') { w.querySelector('#phP').value = inf.def; return true; }
    if (a === 'refDel') { await saveStyle(w, cat).catch(() => {}); try { upd(await C.vapi('photoStyleSet', { refDel: +b.dataset.i, ...(cat ? { cat } : {}) })); } catch (x) { C.toast('⚠️ ' + x.message); } back(); return true; }
    if (a === 'refAdd') { await saveStyle(w, cat).catch(() => {}); refPick(back, cat); return true; }
    return false;
  }
  const cats = () => C.menu.categories.filter(c => !c.tech && c.items.length);
  const thumbs = l => `<span class="ph-st">${l.slice(0, 3).map(u => `<i style="background-image:url('${esc(u)}')"></i>`).join('') || '<i></i>'}</span>`;

  // ---------- головне вікно: блоки меню (кожен блок — свій стиль і зразки → фото блоку однакові) ----------
  async function open(ctx) {
    paid = false; if (!(await load(ctx))) return;
    const show = () => {
      const w = box('📸 ШІ-фото — по блоках меню', `<div class="ph-hint" style="margin-top:0">Генеруємо <b>блоками</b>: у кожного розділу (бургери, міні-бургери, напої…) свої зразки — тож усі фото блоку виходять з однаковим фоном, кутом і світлом.</div>
        ${quotaRow()}
        <div class="ph-cats">${cats().map(c => { const n = c.items.length, f = c.items.filter(i => i.img).length, r = tgt(c.id).refs;
          return `<button class="ph-cat" data-ph="cat" data-c="${esc(c.id)}">${thumbs(r.length ? r : c.items.filter(i => i.img).map(i => i.img))}<span><b>${esc(c.name.uk)}</b><br><small>📷 ${f} з ${n} · ${r.length ? `🖼 зразків ${r.length}` : inf.refs.length ? '🖼 загальні зразки' : '⚠️ без зразка'}</small></span><span class="m">›</span></button>`; }).join('') || '<div class="muted">Меню порожнє</div>'}</div>
        <details style="margin-top:10px"><summary>🎨 Загальний стиль закладу</summary><div style="margin-top:6px">${styleBlock('')}<button class="btn sm primary" data-ph="save" style="margin-top:4px">💾 Зберегти стиль</button></div></details>
        <div class="ph-act"><button class="btn" data-ph="one">🍽 Одна страва</button><button class="btn ghost" data-ph="x">Закрити</button></div>`);
      w.addEventListener('click', async e => {
        if (e.target === w) return close(); const b = e.target.closest('[data-ph]'); if (!b) return; const a = b.dataset.ph;
        if (a === 'x') return close();
        if (await styleClick(a, b, w, show, '')) return;
        try { await saveStyle(w, ''); } catch (x) { return C.toast('⚠️ ' + x.message); }
        if (a === 'save') return C.toast('💾 Стиль збережено');
        if (a === 'cat') return catWin(b.dataset.c);
        if (a === 'one') return pickList();
      });
    };
    show();
  }
  function catWin(cid) {
    const c = C.menu.categories.find(x => x.id === cid); if (!c) return open(C);
    const r = tgt(cid).refs, noImg = c.items.filter(i => !i.img), withImg = c.items.filter(i => i.img);
    const w = box(`📸 ${esc(c.name.uk)}`, `${styleBlock(cid)}
      ${r.length ? '' : `<div class="ph-steps">💡 Немає зразка — фото вийдуть різні. Почнемо з <b>першої страви</b>: якщо сподобається — «✅ Взяти», і вона стане зразком для решти блоку.</div>`}
      <div class="ph-hint">Страви блоку — позначте, які робити (без фото позначені):</div>
      <div class="ph-g">${c.items.map(i => `<label class="ph-d" style="${i.img ? `background-image:url('${esc(i.img)}')` : ''}" title="${esc(nm(i))}">${i.img ? '' : '<em>📷</em>'}<input type="checkbox" value="${i.id}" ${i.img ? '' : 'checked'}><b>${inf.dish[i.id] ? '✍️ ' : ''}${esc(nm(i))}</b></label>`).join('')}</div>
      ${quotaRow()}
      <div class="ph-act"><button class="btn primary" data-k="sel">✨ Зробити позначені</button>${withImg.length ? `<button class="btn" data-k="edit">🪄 Наявні — під стиль блоку (${withImg.length})</button>` : ''}<button class="btn ghost" data-k="x">‹ Блоки</button></div>
      <div class="ph-hint">Позначені з фото — фото обробляється (страва та сама, фон і світло як у зразку); без фото — малюється з назви й складу. Окремий опис страви — 🍽 «Одна страва».</div>`);
    w.addEventListener('click', async e => {
      if (e.target === w) return close();
      const p = e.target.closest('[data-ph]'); if (p && await styleClick(p.dataset.ph, p, w, () => catWin(cid), cid)) return;
      const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
      try { await saveStyle(w, cid); } catch (x) { return C.toast('⚠️ ' + x.message); }
      if (k === 'x') return open(C);
      const ids = new Set([...w.querySelectorAll('.ph-g input:checked')].map(x => x.value));
      const l = k === 'edit' ? withImg : c.items.filter(i => ids.has(i.id)); if (!l.length) return C.toast('Позначте страви');
      batch(l, cid);
    });
  }
  function refPick(back, cat) {
    const own = cat ? C.menu.categories.find(c => c.id === cat)?.items || [] : [], withImg = [...own, ...items().filter(x => !own.includes(x))].filter(x => x.img);
    const w = box('＋ Зразок стилю', `<div class="ph-hint" style="margin-top:0">Оберіть фото, яке подобається найбільше${cat ? ' (спершу — страви цього блоку)' : ''}, або завантажте своє.</div><div class="ph-g" style="max-height:50vh">${withImg.map(x => `<button class="ph-d" data-r="${x.id}" style="background-image:url('${esc(x.img)}')" title="${esc(nm(x))}"><b>${esc(nm(x))}</b></button>`).join('')}</div><div class="btnrow" style="margin-top:10px"><button class="btn" data-r="up">📤 Своє фото</button><button class="btn ghost" data-r="x">Назад</button></div>`);
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-r]'); if (!b) return; const r = b.dataset.r; if (r === 'x') return back();
      try {
        const o = cat ? { cat } : {}; let x; if (r === 'up') { const data = await C.img(); if (!data) return; x = await C.vapi('photoStyleSet', { refData: data, ...o }); } else x = await C.vapi('photoStyleSet', { refFrom: r, ...o });
        upd(x); C.toast('＋ Зразок додано');
      } catch (x) { C.toast('⚠️ ' + x.message); }
      back();
    });
  }
  function pickList() {
    const w = box('🍽 Яка страва', `<input id="phF" placeholder="🔎 Пошук" style="${TA};padding:8px 10px;margin-bottom:6px"><div id="phL" style="height:50vh;overflow:auto;display:grid;gap:2px;align-content:start">${cats().map(c => `<div class="muted" data-h style="margin-top:6px;font-size:12px">${esc(c.name.uk)}</div>${c.items.map(i => `<button class="kv" data-one="${i.id}" data-n="${esc(nm(i).toLowerCase())}" style="cursor:pointer;width:100%;background:none;border:0;color:inherit;font:inherit;text-align:left"><span style="display:flex;gap:8px;align-items:center"><i style="width:34px;height:34px;border-radius:8px;flex:none;background:var(--card2,#ffffff10) center/cover;${i.img ? `background-image:url('${esc(i.img)}')` : ''}"></i>${esc(nm(i))}${inf.dish[i.id] ? ' ✍️' : ''}</span>›</button>`).join('')}`).join('')}</div>
      <div class="btnrow" style="margin-top:8px"><button class="btn ghost" data-k="x">‹ Блоки</button></div>`);
    w.querySelector('#phF').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); w.querySelectorAll('[data-one]').forEach(x => { x.hidden = !!q && !x.dataset.n.includes(q); }); w.querySelectorAll('#phL [data-h]').forEach(h => { h.hidden = !!q; }); });
    w.addEventListener('click', e => {
      const o = e.target.closest('[data-one]'); if (o) { const it = items().find(i => i.id === o.dataset.one); return it && dishWin(it); }
      if (e.target.closest('[data-k="x"]')) return open(C);
    });
  }
  async function make(body) {
    try { return await C.vapi('photoMake', { ...body, ...(paid ? { pay: 1 } : {}) }); }
    catch (e) { if ((e.data?.error || e.message) !== 'pay') { C.toast('⚠️ ' + e.message); return null; }
      if (!confirm(`📸 ${inf.free} безкоштовних фото цього місяця використано.\nДалі — ${inf.price} ₴ за кожне фото. Продовжити?`)) return null;
      paid = true; return make(body); }
  }
  const gen = it => make({ id: it.id, series: 1, refs: 1, ...(it.img ? { mode: 'edit' } : {}) }); // з фото — обробка під зразок, без — з нуля
  // блок: без зразка спершу одна страва → «✅ Взяти» робить її зразком (якір) → решта блоку в тому ж стилі
  async function batch(list, cid) {
    const left = Math.max(0, inf.free - inf.n), over = Math.max(0, list.length - left);
    if (!confirm(`📸 ${list.length} фото для блоку?\nБезкоштовно ще ${left}.${over ? ` Понад ліміт — ${over} × ${inf.price} ₴ = ${over * inf.price} ₴.` : ''}\nЗайме ~${Math.ceil(list.length * 15 / 60)} хв — вікно не закривайте.`)) return;
    if (over) paid = true;
    if (!tgt(cid).refs.length && list.length > 1) return anchor(list, cid);
    run(list, cid);
  }
  async function anchor(list, cid) {
    const [it, ...rest] = list, w = box('📸 Зразок блоку', `<div class="ph-hint" style="margin-top:0">⏳ Малюю першу страву «${esc(nm(it))}» — вона задасть фон, кут і світло для решти ${rest.length}…</div>`);
    const r = await gen(it); if (!r) return catWin(cid); inf.n = r.n; inf.over = r.over;
    if (!document.getElementById('phw')) return;
    w.querySelector('.modal').innerHTML = `<h3>📸 Зразок блоку — ${esc(nm(it))}</h3><img src="${esc(r.draft)}" alt="" style="display:block;width:min(320px,100%);aspect-ratio:1;object-fit:cover;border-radius:12px;margin:0 auto">
      <div class="ph-hint" style="text-align:center">Подобається? Тоді решта ${rest.length} страв блоку буде в такому ж стилі.</div>
      <div class="ph-act"><button class="btn primary" data-v="ok">✅ Так — взяти й робити решту</button><button class="btn" data-v="again">🔄 Інший варіант</button><button class="btn ghost" data-v="no">✕ Стоп</button></div>`;
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-v]'); if (!b) return; w.querySelectorAll('[data-v]').forEach(x => { x.disabled = true; }); const v = b.dataset.v;
      if (v === 'ok') { try { upd({ cat: { ...inf.cat, [cid]: { ...tgt(cid), refs: [r.draft] } } }); await C.vapi('photoApply', { id: it.id }); C.onDone?.(); } catch (x) { C.toast('⚠️ ' + x.message); return close(); } return run(rest, cid); }
      await C.vapi('photoDrop', { id: it.id }).catch(() => {});
      if (v === 'again') return anchor(list, cid); catWin(cid);
    });
  }
  async function run(list, cid) {
    const done = [], w = box('📸 Генерую…', '<div id="phProg" class="ph-hint">…</div><div id="phGrid" class="ph-g" style="max-height:50vh"></div>');
    for (const [k, it] of list.entries()) {
      if (!document.getElementById('phw')) break; w.querySelector('#phProg').textContent = `⏳ ${k + 1} / ${list.length}: ${nm(it)}`;
      const r = await gen(it); if (!r) { if (!paid) break; continue; } inf.n = r.n; inf.over = r.over;
      done.push({ it, u: r.draft }); w.querySelector('#phGrid').insertAdjacentHTML('beforeend', `<button class="ph-d on" data-i="${done.length - 1}" style="background:#000 url('${esc(r.draft)}') center/cover;outline:3px solid var(--green,#3c3)" title="${esc(nm(it))}"><b>${esc(nm(it))}</b></button>`);
    }
    if (!done.length) return cid ? catWin(cid) : close();
    w.querySelector('#phProg').innerHTML = `✅ Готово: ${done.length}. Торкніться фото, яке НЕ подобається, — воно не піде в меню.`;
    w.querySelector('.modal').insertAdjacentHTML('beforeend', '<div class="ph-act"><button class="btn primary" data-f="ok">✅ Взяти в меню</button><button class="btn ghost" data-f="no">Відкинути всі</button></div>');
    w.addEventListener('click', async e => {
      const t = e.target.closest('#phGrid [data-i]'); if (t) { t.classList.toggle('on'); const on = t.classList.contains('on'); t.style.outline = `3px solid ${on ? 'var(--green,#3c3)' : 'var(--red,#e44)'}`; t.style.opacity = on ? 1 : .4; return; }
      const f = e.target.closest('[data-f]'); if (!f) return; f.disabled = true;
      const keep = new Set([...w.querySelectorAll('#phGrid .on')].map(b => +b.dataset.i)); let n = 0;
      for (const [i, d] of done.entries()) { if (f.dataset.f === 'ok' && keep.has(i)) { if (await C.vapi('photoApply', { id: d.it.id }).catch(() => null)) n++; } else await C.vapi('photoDrop', { id: d.it.id }).catch(() => {}); }
      C.toast(`📸 У меню: ${n} фото`); C.onDone?.(); if (cid) { try { upd(await C.vapi('photoInfo')); } catch {} return catWin(cid); } close();
    });
  }

  // ---------- одна страва: джерело, свій промт, зразки, точність → «було / ШІ» ----------
  async function dish(ctx, it, o = {}) { paid = false; if (!(await load(ctx))) return; dishWin(it, o.data ? { src: 'up', data: o.data } : {}); } // o.data — щойно завантажене фото
  function dishWin(it, st = {}) {
    st.src ??= it.img ? 'edit' : 'gen'; st.note ??= inf.dish[it.id] || ''; st.strict ??= true;
    const hasPhoto = st.src !== 'gen', srcImg = st.src === 'up' ? st.data : st.src === 'edit' ? it.img : '';
    const ci = C.menu.categories.find(c => c.items.includes(it))?.id || '', rc = (inf.cat[ci]?.refs.length || inf.refs.length);
    st.refs ??= !hasPhoto || !!inf.cat[ci]?.refs.length;
    const opt = (k, l, dis) => `<button class="btn sm ${st.src === k ? 'primary' : ''}" data-d="src" data-v="${k}" ${dis ? 'disabled' : ''}>${l}</button>`;
    const w = box('', `<h3>📸 ${esc(nm(it))}</h3>
      <div class="muted" style="font-size:13px;margin-bottom:6px">1. Звідки фото</div>
      <div class="btnrow" style="flex-wrap:wrap;gap:6px">${opt('edit', '🪄 Наявне фото', !it.img)}${opt('up', '📷 Своє фото')}${opt('gen', '✨ З нуля')}</div>
      ${srcImg ? `<img src="${esc(srcImg)}" alt="" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:12px;margin-top:8px">` : ''}
      <label style="display:block;margin-top:12px">2. ✍️ Як виглядає саме ця страва <span class="muted" style="font-size:12px">— форма, посуд, подача, що НЕ має бути</span>
        <textarea id="phN" rows="3" style="${TA}" placeholder="напр.: кругла піца на дерев'яній дошці, 8 шматків, зверху базилік; без соусу збоку">${esc(st.note)}</textarea></label>
      <div class="muted" style="font-size:12px">ШІ також бере назву${it.desc?.uk ? ', склад' : ''}${it.size ? ' і вагу' : ''} з меню. Опис зберігається для цієї страви — і в касі, і в кабінеті.</div>
      <div style="display:grid;gap:6px;margin-top:12px">
        ${hasPhoto ? `<label class="kv" style="cursor:pointer"><span>🎯 Суворо як на фото <small class="muted">(міняє лише фон і світло)</small></span><input type="checkbox" id="phS" ${st.strict ? 'checked' : ''} style="width:22px;height:22px"></label>` : ''}
        <label class="kv" style="cursor:pointer"><span>🖼 Зразки блоку — фон, посуд, кут (${rc})</span><input type="checkbox" id="phR" ${st.refs ? 'checked' : ''} ${!rc ? 'disabled' : ''} style="width:22px;height:22px"></label></div>
      <details style="margin-top:10px"><summary>🎨 Стиль закладу (спільний для всіх фото)</summary><div style="margin-top:8px">${styleBlock('')}</div></details>
      ${quotaRow()}
      <div class="ph-act"><button class="btn primary" data-d="go">✨ Згенерувати</button><button class="btn ghost" data-d="x">Закрити</button></div>`);
    const grab = () => { st.note = w.querySelector('#phN').value.trim(); const s = w.querySelector('#phS'), r = w.querySelector('#phR'); if (s) st.strict = s.checked; if (r && !r.disabled) st.refs = r.checked; };
    w.addEventListener('change', e => { if (e.target.id === 'phS') { grab(); dishWin(it, st); } });
    w.addEventListener('click', async e => {
      if (e.target === w) return close();
      const p = e.target.closest('[data-ph]'); if (p) { grab(); if (await styleClick(p.dataset.ph, p, w, () => dishWin(it, st), '')) return; }
      const b = e.target.closest('[data-d]'); if (!b) return; const a = b.dataset.d;
      if (a === 'x') { grab(); if (st.note !== (inf.dish[it.id] || '')) C.vapi('photoStyleSet', { dish: { id: it.id, note: st.note } }).then(() => { inf.dish[it.id] = st.note; }).catch(() => {}); return close(); }
      if (a === 'src') { grab(); const v = b.dataset.v; if (v === 'up') { const data = await C.img(); if (!data) return; st.data = data; } st.src = v; st.refs = v === 'gen'; return dishWin(it, st); }
      if (a === 'go') {
        grab(); try { await saveStyle(w, ''); } catch (x) { return C.toast('⚠️ ' + x.message); }
        b.disabled = true; b.textContent = '⏳ ШІ малює… до хвилини';
        const body = { id: it.id, note: st.note, strict: st.strict ? 1 : 0, refs: st.refs ? 1 : 0, series: st.refs && hasPhoto && !st.strict ? 1 : 0, ...(st.src === 'edit' ? { mode: 'edit' } : st.src === 'up' ? { data: st.data } : {}) };
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
      <div class="ph-act"><button class="btn primary" data-v="ok">✅ Взяти в меню</button><button class="btn" data-v="edit">✍️ Підправити опис і ще раз</button><button class="btn ghost" data-v="no">✕ Не треба</button></div>`);
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-v]'); if (!b) return; b.disabled = true; const v = b.dataset.v;
      if (v === 'ok') { try { const x = await C.vapi('photoApply', { id: it.id }); C.toast(x.anchor ? '📸 Фото в меню · стало зразком блоку' : '📸 Фото в меню'); C.onDone?.(); } catch (x) { C.toast('⚠️ ' + x.message); } return close(); }
      await C.vapi('photoDrop', { id: it.id }).catch(() => {});
      if (v === 'edit') return dishWin(it, st); close();
    });
  }
  return { open, dish };
})();
