// 🖨 Кілька принтерів: що на який друкувати (спільне для каси й кабінету власника).
// route = { st: [{ id, name, dev, g: ['kitchen','bar','hookah','other'], r: чеки 0/1, n: копій }] }
(() => {
  const G = [['kitchen', '🍳', 'Кухня'], ['bar', '🍹', 'Бар'], ['hookah', '💨', 'Кальян'], ['other', '🧩', 'Інше']];
  const TY = { win: 'Windows', winusb: 'USB', winnet: 'мережа', winbt: 'Bluetooth', raw: 'USB', net: 'мережа', com: 'Bluetooth', bt: 'Bluetooth планшета', usb: 'USB планшета', epos: 'Epson Wi-Fi планшета' };
  const E = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  if (!document.getElementById('prn-css')) document.head.insertAdjacentHTML('beforeend', `<style id="prn-css">
    .prn{display:grid;gap:8px}.prn-r{display:grid;grid-template-columns:minmax(90px,1fr) minmax(120px,1.4fr) auto auto auto;gap:6px;align-items:center;padding:8px;border-radius:12px;background:var(--card2,rgba(127,127,127,.08))}
    .prn-r input,.prn-r select{min-height:34px;padding:4px 8px;font:inherit;font-size:14px;min-width:0;width:100%}
    .prn-c{display:flex;gap:4px;flex-wrap:wrap}.prn-c button,.prn-n{min-height:40px;min-width:40px;padding:0 6px;border-radius:9px;border:1px solid var(--line,rgba(127,127,127,.3));background:none;color:inherit;font:inherit;font-size:15px;opacity:.45;cursor:pointer}
    .prn-c button.on{opacity:1;background:var(--accent);border-color:var(--accent);color:var(--accent-ink,#000)}.prn-n{opacity:1;font-size:13px;font-weight:700}
    .prn-x{background:none;border:0;color:inherit;opacity:.5;font-size:16px;cursor:pointer;padding:0 4px}.prn-w{font-size:12px;color:#ff9f0a}
    @media(max-width:640px){.prn-r{grid-template-columns:1fr auto auto}.prn-r select{grid-column:1/-1;grid-row:2}.prn-c{grid-column:1/-1;grid-row:3}}</style>`);
  const blank = i => ({ id: 'p' + Date.now().toString(36).slice(-5), name: `Принтер ${i + 1}`, dev: '', g: [], r: 0, n: 1 });
  window.PRN = {
    // dv = знайдені програмою друку принтери (print_dev), dirty = є незбережені зміни
    html(route, dv, dirty) {
      const st = route.st || [], list = dv?.list || [];
      const sel = cur => `<select data-prn="dev">${`<option value="">🤖 Автоматично</option>`}${list.map(x => `<option value="${E(x.id)}" ${x.id === cur ? 'selected' : ''}>${E(x.name)} · ${TY[x.type] || x.type}</option>`).join('')}${cur && !list.some(x => x.id === cur) ? `<option value="${E(cur)}" selected>${E(cur)}</option>` : ''}</select>`;
      const free = G.filter(([g]) => !st.some(s => s.g.includes(g))), noR = st.length && !st.some(s => s.r);
      return `<div class="prn">${st.map((s, i) => `<div class="prn-r" data-i="${i}"><input data-prn="name" value="${E(s.name)}" maxlength="30" aria-label="Назва">${sel(s.dev)}
          <div class="prn-c">${G.map(([g, e, l]) => `<button type="button" data-prn="g" data-g="${g}" class="${s.g.includes(g) ? 'on' : ''}" title="${l}">${e}</button>`).join('')}<button type="button" data-prn="r" class="${s.r ? 'on' : ''}" title="Чеки, пречеки, Z-звіти">🧾</button></div>
          <button type="button" class="prn-n" data-prn="n" title="Копій">×${s.n}</button><button type="button" class="prn-x" data-prn="del" title="Прибрати">✕</button></div>`).join('')
        || '<div class="muted" style="font-size:13px">Усе друкується на один принтер. Додайте принтери, щоб кухня, бар і кальян отримували лише свої страви.</div>'}
        ${st.length && free.length ? `<div class="prn-w">⚠️ ${free.map(([, e, l]) => e + ' ' + l).join(', ')} — не призначено, піде на перший кухонний</div>` : ''}${noR ? '<div class="prn-w">⚠️ 🧾 Чеки не призначено — підуть на принтер «Автоматично»</div>' : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">${st.length < 6 ? '<button type="button" class="btn sm" data-prn="add">➕ Принтер</button>' : ''}${dirty ? '<button type="button" class="btn sm primary" data-prn="save">💾 Зберегти</button>' : ''}</div>
        <div class="muted" style="font-size:12px">🍳 Кухня · 🍹 Бар · 💨 Кальян · 🧩 Інше · 🧾 Чеки. Бігунок ділиться: кожен принтер друкує лише свої страви.</div></div>`;
    },
    // клік / зміна поля → змінює route; повертає 'save', true (змінено) або false
    apply(el, route) {
      const k = el.dataset.prn; if (!k) return false; route.st = route.st || [];
      if (k === 'add') { route.st.push(blank(route.st.length)); return true; }
      if (k === 'save') return 'save';
      const s = route.st[+el.closest('[data-i]')?.dataset.i]; if (!s) return false;
      if (k === 'g') s.g = s.g.includes(el.dataset.g) ? s.g.filter(x => x !== el.dataset.g) : [...s.g, el.dataset.g];
      else if (k === 'r') s.r = s.r ? 0 : 1;
      else if (k === 'n') s.n = s.n % 3 + 1;
      else if (k === 'del') route.st.splice(route.st.indexOf(s), 1);
      else if (k === 'name') s.name = el.value.slice(0, 30);
      else if (k === 'dev') s.dev = el.value;
      return true;
    },
  };
})();
