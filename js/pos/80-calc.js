  async function loadCalc() {
    const K = S.sk, t = K.tab;
    if (!S.data.sk || ['stock', 'prod', 'inv', 'cards'].includes(t)) S.data.sk = await api('skData');
    if (t === 'buy') S.data.skBuy = await api('skBuy');
    if (t === 'inv' && !K.draft) S.data.skInv = await api('skInvList');
    if ((t === 'cards' || t === 'prod') && isAdmin()) { if (!S.menu) await loadMenu(); S.data.skCost = await api('skCost'); }
    if (t === 'tech') S.data.skTech = await api('skTech');
    if (t === 'count') { const [c, l] = await Promise.all([api('skCount', { wh: K.cwh }), api('skCountList')]); S.data.skCount = c; S.data.skCnts = l.list; K.cf = Object.fromEntries(Object.entries(c.draft.f || {}).map(([k, v]) => [k, String(v)])); }
    if ((t === 'menu' || t === 'stop') && !S.menu) await loadMenu();
    if (t === 'rep') { const [from, to] = perRange(K.p); S.data.skRep = null; renderMain(); S.data.skRep = await api('skReport', { from, to }, 30000); }
  }
  function calcHTML() {
    const K = S.sk, tabs = SK_TABS(); if (!tabs.some(x => x[0] === K.tab)) K.tab = tabs[0][0];
    const sub = { stock: 'залишки на складах Кухня і Бар', buy: 'що докупити — по постачальниках', inv: 'прихід товару: фото, код або вручну', cards: 'калькуляційні карти й собівартість страв', tech: 'склад і грамовка страв', prod: 'напівфабрикати: соуси, тісто, заготовки', count: 'перерахунок фактичних залишків', menu: 'страви, ціни, фото', stop: 'що зараз не продається', rep: 'фудкост, прибуток страв, нестачі й списання' }[K.tab];
    const head = `<div class="rhead"><div><h1>Склад</h1><span class="muted">${sub}</span></div></div>
      <div class="seg rsec">${tabs.map(([k, l]) => `<button class="${K.tab === k ? 'on' : ''}" data-a="skTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    if (!S.data.sk) return head + '<div class="muted" style="margin:16px 4px">Завантаження…</div>';
    if (K.card && (K.tab === 'cards' || K.tab === 'prod')) return head + `<div class="sk">${skCardEdHTML()}</div>`;
    if (K.tab === 'menu') return head + `<div class="sk sk-emb">${menuHTML()}</div>`;
    if (K.tab === 'stop') return head + `<div class="sk sk-emb">${stopHTML()}</div>`;
    return head + `<div class="sk">${{ stock: skStockHTML, buy: skBuyHTML, inv: skInvHTML, cards: skCardsHTML, tech: skTechHTML, prod: skProdHTML, count: skCountHTML, rep: skRepHTML }[K.tab]()}</div>`;
  }
  // 📦 склад
  function skStockHTML() {
    const K = S.sk, D = S.data.sk, adm = isAdmin(), q = K.q.trim().toLowerCase(), live = D.ing.filter(x => !x.off && !x.grp), gq = x => x.grp ? x.grp.reduce((a, id) => a + Math.max(0, totQ(D.ing.find(y => y.id === id) || {})), 0) : totQ(x);
    const list = D.ing.filter(x => (K.cat === '🗑' ? x.off : !x.off) && (!q || x.n.toLowerCase().includes(q)) && (!K.cat || K.cat === '🗑' || x.cat === K.cat) && (!K.wh || x.home === K.wh || (x.st?.[K.wh] || 0) !== 0));
    const low = live.filter(x => x.min > 0 && totQ(x) < x.min);
    const val = w => live.reduce((a, x) => a + Math.max(0, w ? x.st?.[w] || 0 : totQ(x)) * (x.cost || 0), 0);
    const cats = [...new Set(live.map(x => x.cat || 'Інше'))].sort();
    const tools = `<div class="sk-bar"><input id="skQ" placeholder="🔎 Пошук продукту" value="${esc(K.q)}">
      <div class="seg wrap sk-wh">${[['', 'Усі'], ['k', WHN.k], ['b', WHN.b]].map(([k, l]) => `<button class="${K.wh === k ? 'on' : ''}" data-a="skWh" data-w="${k}">${l}</button>`).join('')}</div>
      <select id="skCat"><option value="">Усі категорії</option>${cats.map(c => `<option ${K.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}${D.ing.some(x => x.off) ? `<option value="🗑" ${K.cat === '🗑' ? 'selected' : ''}>🗑 Сховані</option>` : ''}</select>
      <span class="grow"></span>${adm ? '<button class="btn sm primary" data-a="skIng">➕ Продукт</button><button class="btn sm" data-a="skGrp">🥬 Група</button><button class="btn sm" data-a="skDups">🔍 Дублікати</button>' : ''}<button class="btn sm" data-a="skOffPick">🗑 Списати</button><button class="btn sm" data-a="skJr">📜 Рух</button></div>`;
    const pills = adm ? `<div class="kpis sk-kpis"><div class="kpi accent"><span>Товару на складах</span><b class="money">${money(val())}</b><small class="muted">${WHN.k} ${money(val('k'))} · ${WHN.b} ${money(val('b'))}</small></div>
      <div class="kpi ${low.length ? 'red' : ''}${low.length ? ' press' : ''}" ${low.length ? 'data-a="skTab" data-t="buy"' : ''}><span>Нижче мінімуму</span><b>${low.length}</b><small class="muted">${low.length ? '🛒 відкрити закупівлю →' : 'усього вистачає'}</small></div>
      <div class="kpi"><span>Продуктів</span><b>${live.length}</b><small class="muted">${live.filter(x => !x.cost).length ? `без ціни: ${live.filter(x => !x.cost).length}` : 'у всіх є ціна'}</small></div></div>`
      : low.length ? `<div class="card sk-low">⚠️ Нижче мінімуму: ${low.map(x => esc(x.n)).join(', ')}</div>` : '';
    const rowH = x => { if (x.grp) { const m = x.grp.map(id => D.ing.find(y => y.id === id)).filter(Boolean);
        return `<div class="sk-row"><div class="sk-n${adm ? ' press' : ''}" ${adm ? `data-a="skGrp" data-id="${x.id}"` : ''}><b>🥬 ${esc(x.n)}</b><small class="muted">група-замінник: ${m.map(y => esc(y.n)).join(', ')}</small></div><div class="sk-q"><b>${fq(gq(x), x.u)}</b><small class="muted">разом</small></div><div class="sk-act"></div></div>`; }
      const t = totQ(x), lo = x.min > 0 && t < x.min, both = (x.st?.k || 0) && (x.st?.b || 0);
      return `<div class="sk-row${lo ? ' low' : ''}${x.off ? ' off' : ''}"><div class="sk-n${adm ? ' press' : ''}" ${adm ? `data-a="skIng" data-id="${x.id}"` : ''}><b>${x.semi ? '🍳 ' : ''}${esc(x.n)}</b><small class="muted">${x.min ? `мін ${fq(x.min, x.u)}` : ''}${adm && x.cost ? `${x.min ? ' · ' : ''}${money(x.cost)} / ${x.u}` : ''}${adm && !x.cost ? `${x.min ? ' · ' : ''}<span class="warn">немає ціни</span>` : ''}</small></div>
        <div class="sk-q"><b class="${t < 0 ? 'neg' : ''}">${fq(t, x.u)}</b><small class="muted">${both ? `К ${fq(x.st.k, x.u)} · Б ${fq(x.st.b, x.u)}` : (x.st?.b ? WHN.b : x.st?.k ? WHN.k : WHN[x.home || 'k'])}</small></div>
        <div class="sk-act">${adm ? `<button class="rb plus" data-a="skAdd" data-id="${x.id}" title="Оприбуткувати">+</button>` : ''}<button class="rb minus" data-a="skOff" data-id="${x.id}" title="Списати">−</button><button class="rb" data-a="skMv" data-id="${x.id}" title="Перемістити між складами">⇄</button></div></div>`; };
    const groups = {}; list.forEach(x => (groups[x.cat || 'Інше'] ||= []).push(x));
    const body = list.length ? Object.keys(groups).sort().map(c => `<div class="card"><h3>${esc(c)} <span class="muted">· ${groups[c].length}</span></h3>${groups[c].sort((a, b) => a.n.localeCompare(b.n)).map(rowH).join('')}</div>`).join('')
      : `<div class="card"><div class="muted">${D.ing.length ? 'Нічого не знайдено' : adm ? 'Склад порожній. Додайте продукти кнопкою «➕ Продукт» — або просто внесіть першу накладну (🧾 Накладні → 📷 Фото): продукти створяться самі.' : 'Склад ще порожній.'}</div></div>`;
    return pills + tools + `<div class="sk-list">${body}</div>`;
  }
  async function skIngEdit(id, preset = {}) {
    const D = S.data.sk, x = D.ing.find(y => y.id === id) || { n: '', u: 'кг', cat: 'Інше', home: 'k', min: 0, par: 0, loss: 0, pk: [], bc: [], ...preset };
    const body = `<div class="form">
      <label>Назва<input id="iN" value="${esc(x.n)}" placeholder="напр. Куряче філе"></label>
      <div class="frow"><label>Одиниця обліку<select id="iU">${D.units.map(u => `<option ${x.u === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label>Де зберігається<select id="iH"><option value="k" ${x.home !== 'b' ? 'selected' : ''}>${WHN.k}</option><option value="b" ${x.home === 'b' ? 'selected' : ''}>${WHN.b}</option></select></label></div>
      <label>Категорія<select id="iC">${[...new Set([...D.cats, x.cat || 'Інше'])].map(c => `<option ${x.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <div class="frow"><label>Мінімум <small>(нижче — сповіщення)</small><input id="iMin" inputmode="decimal" value="${x.min || ''}" placeholder="0"></label><label>Норма <small>(докупити до)</small><input id="iPar" inputmode="decimal" value="${x.par || ''}" placeholder="0"></label></div>
      <div class="frow"><label>% втрат при обробці <small>(чистка, варка…)</small><input id="iL" inputmode="numeric" value="${x.loss || ''}" placeholder="0"></label>
        ${x.semi ? '' : `<label>Ціна за ${x.u}, ₴ <small>${x.lp ? '(середня з накладних — можна змінити)' : ''}</small><input id="iCost" inputmode="decimal" value="${x.cost || ''}"></label>`}</div>
      <label>Одиниці закупівлі <small>напр.: ящик=12, уп=2.5 (скільки ${x.u} в одній)</small><input id="iPk" value="${esc((x.pk || []).map(p => `${p.n}=${p.f}`).join(', '))}" placeholder="ящик=12"></label>
      <label>Штрихкоди <small>через кому — або відскануйте сканером у це поле</small><input id="iBc" value="${esc((x.bc || []).join(', '))}"></label>
      <label class="chk"><input type="checkbox" id="iS" ${x.semi ? 'checked' : ''}> 🍳 Заготовка — готуємо самі (соус, тісто…), має свою техкарту</label></div>`;
    const v = await modal({ title: x.id ? '📦 ' + x.n : '➕ Новий продукт', body, buttons: [{ label: '💾 Зберегти', val: 'save', cls: 'primary' }, ...(x.id && !x.off ? [{ label: '🔗 Обʼєднати', val: 'merge' }] : []), ...(x.id ? [{ label: x.off ? '↩️ Повернути' : '🗑 Сховати', val: 'del', cls: x.off ? '' : 'red' }] : []), { label: 'Скасувати', val: null }], keep: true });
    if (v === 'merge') { closeModal(); return skMergeUI(x); }
    if (v === 'del') { closeModal(); if (await act('skIngDel', { id: x.id, back: !!x.off }, x.off ? '↩️ Повернуто' : '🗑 Сховано')) loadView(); return null; }
    if (v !== 'save') return null;
    const num = i => +String($('#' + i)?.value || '').replace(',', '.') || 0;
    const d = { id: x.id, n: $('#iN').value, u: $('#iU').value, home: $('#iH').value, cat: $('#iC').value, min: num('iMin'), par: num('iPar'), loss: num('iL'), semi: $('#iS').checked,
      pk: $('#iPk').value.split(',').map(s => s.split(/[=:]/).map(z => z.trim())).filter(p => p[0] && +String(p[1] || '').replace(',', '.') > 0).map(([n, f]) => ({ n, f: +f.replace(',', '.') })),
      bc: $('#iBc').value.split(/[,\s]+/).filter(Boolean), ...($('#iCost') && num('iCost') !== (x.cost || 0) ? { cost: num('iCost'), setCost: 1 } : {}) };
    closeModal();
    const r = await act('skIngSave', { x: d }, '💾 Збережено'); if (!r) return null;
    S.data.sk = await api('skData').catch(() => S.data.sk); renderMain(); return r.x;
  }
  // 🔗 обʼєднати дублікати в головний продукт
  async function skMergeUI(T, pre = []) {
    const L = S.data.sk.ing.filter(y => !y.off && !y.grp && y.id !== T.id && !!y.semi === !!T.semi).sort((a, b) => a.n.localeCompare(b.n));
    const v = await modal({ title: '🔗 Обʼєднати в «' + T.n + '»', body: `<div class="muted" style="font-size:13px;margin-bottom:8px">Відмітьте дублікати — це той самий продукт під іншою назвою. Їх залишки перейдуть сюди, техкарти й майбутні накладні — теж. Дублікати сховаються.</div>
      <input id="mgQ" placeholder="🔎 Пошук" oninput="const q=this.value.toLowerCase();document.querySelectorAll('.mg-r').forEach(r=>r.hidden=q&&!r.dataset.n.includes(q)&&!r.querySelector('input').checked)">
      <div class="mg-l">${L.map(y => `<label class="mg-r" data-n="${esc(y.n.toLowerCase())}"><input type="checkbox" class="mgC" value="${y.id}"${pre.includes(y.id) ? ' checked' : ''}> <span>${esc(y.n)} <small class="muted">${fq(totQ(y), y.u)}</small></span>${y.u !== T.u ? `<span class="mg-f">1 ${y.u} = <input class="mgF" data-id="${y.id}" inputmode="decimal" placeholder="?"> ${T.u}</span>` : ''}</label>`).join('')}</div>`,
      buttons: [{ label: '🔗 Обʼєднати', val: 1, cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    if (!v) return closeModal();
    const from = [...document.querySelectorAll('.mgC:checked')].map(c => c.value), f = {}; document.querySelectorAll('.mgF').forEach(i => { if (i.value) f[i.dataset.id] = +i.value.replace(',', '.'); });
    closeModal(); if (!from.length) return toast('Нічого не обрано');
    if (!(await confirmBox(`🔗 Обʼєднати ${from.length} в «${T.n}»?`, 'Скасувати можна лише вручну'))) return;
    const r = await act('skMerge', { to: T.id, from, f }, '🔗 Обʼєднано'); if (!r) return;
    toast(`🔗 Обʼєднано ${r.n}${r.cards ? ` · техкарт оновлено: ${r.cards}` : ''}`); S.data.sk = await api('skData').catch(() => S.data.sk); renderMain();
  }
  // 🥬 група-замінник: у техкарті — група, списується продукт групи, якого найбільше
  async function skGrpEdit(id) {
    const D = S.data.sk, x = D.ing.find(y => y.id === id) || { n: '', u: 'кг', grp: [] }, L = D.ing.filter(y => !y.off && !y.grp).sort((a, b) => a.n.localeCompare(b.n));
    const v = await modal({ title: x.id ? '🥬 ' + x.n : '🥬 Нова група-замінник', body: `<div class="form"><div class="muted" style="font-size:13px">Різні продукти, що в стравах замінюють один одного (напр. Айсберг, Ромен, Мікс). Поставте групу в техкарту — при продажу спишеться той, якого найбільше.</div>
      <label>Назва<input id="gN" value="${esc(x.n)}" placeholder="напр. Салат листовий"></label>
      <label>Одиниця<select id="gU" onchange="document.querySelectorAll('.mg-r').forEach(r=>r.hidden=r.dataset.u!==this.value)">${D.units.map(u => `<option ${x.u === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      <div class="mg-l">${L.map(y => `<label class="mg-r" data-u="${y.u}"${y.u !== x.u ? ' hidden' : ''}><input type="checkbox" class="gC" value="${y.id}"${x.grp.includes(y.id) ? ' checked' : ''}> <span>${esc(y.n)} <small class="muted">${fq(totQ(y), y.u)}</small></span></label>`).join('')}</div></div>`,
      buttons: [{ label: '💾 Зберегти', val: 'save', cls: 'primary' }, ...(x.id ? [{ label: '🗑 Видалити групу', val: 'del', cls: 'red' }] : []), { label: 'Скасувати', val: null }], keep: true });
    if (v === 'del') { closeModal(); if (await confirmBox('Видалити групу?', 'У техкартах, де вона стоїть, замініть її на продукт') && await act('skIngDel', { id: x.id }, '🗑 Видалено')) loadView(); return; }
    if (v !== 'save') return closeModal();
    const u = $('#gU').value, d = { id: x.id, n: $('#gN').value, u, grp: [...document.querySelectorAll('.gC:checked')].filter(c => c.closest('.mg-r').dataset.u === u).map(c => c.value) };
    closeModal(); if (await act('skGrp', { x: d }, '🥬 Групу збережено')) { S.data.sk = await api('skData').catch(() => S.data.sk); renderMain(); }
  }
  // 🔍 ШІ шукає дублікати → обʼєднати групу одним натиском
  async function skDups() {
    toast('🔍 Шукаю дублікати… до 30 с'); const r = await act('skDups', {}); if (!r) return;
    const D = S.data.sk, im = new Map(D.ing.map(y => [y.id, y])), G = r.groups.map(g => g.map(id => im.get(id)).filter(Boolean)).filter(g => g.length > 1);
    if (!G.length) return modal({ title: '🔍 Дублікати', body: '<div class="muted">Дублікатів не знайдено 👌</div>', buttons: [{ label: 'Добре', val: null }] });
    const v = await modal({ title: `🔍 Схожі продукти · ${G.length}`, body: `<div class="muted" style="font-size:13px;margin-bottom:8px">Перевірте: якщо це справді той самий продукт — «🔗 Обʼєднати» (першим буде головний, можна змінити). Різні сорти — не обʼєднуйте, краще зробіть 🥬 групу.</div>${G.map((g, i) => `<div class="card mg-g"><div>${g.map(y => `${esc(y.n)} <small class="muted">${fq(totQ(y), y.u)}</small>`).join('<br>')}</div><div class="btnrow"><button class="btn sm primary" data-mi-v="m${i}">🔗 Обʼєднати</button><button class="btn sm" data-mi-v="g${i}">🥬 Група</button></div></div>`).join('')}`, buttons: [{ label: 'Закрити', val: null }] });
    if (!v) return; const g = G[+v.slice(1)];
    if (v[0] === 'm') { const main = await choose('Яка назва головна?', '', g.map(y => ({ label: y.n, val: y.id }))); if (main) return skMergeUI(im.get(main), g.map(y => y.id).filter(id => id !== main)); }
    else return skGrpNew(g);
  }
  async function skGrpNew(g) { const r = await act('skGrp', { x: { n: g[0].n.split(/\s+/)[0] + ' (група)', u: g[0].u, grp: g.filter(y => y.u === g[0].u).map(y => y.id) } }, '🥬 Групу створено — перейменуйте за потреби'); if (r) { S.data.sk = await api('skData').catch(() => S.data.sk); renderMain(); skGrpEdit(r.x.id); } }
  async function skQty(kind, id) { // add | off | mv
    const x = S.data.sk.ing.find(y => y.id === id); if (!x) return;
    const ttl = { add: '➕ Оприбуткувати', off: '➖ Списати', mv: '⇄ Перемістити' }[kind] + ' · ' + x.n;
    const dw = (x.st?.b || 0) > 0 && !((x.st?.k || 0) > 0) ? 'b' : x.home || 'k';
    const body = `<div class="form"><label>Кількість <small>${x.u === 'кг' ? 'напр. 0.5 або 500 г' : x.u === 'л' ? 'напр. 0.5 або 500 мл' : 'штук'}</small><input id="aQ" inputmode="decimal" placeholder="${x.u}"></label>
      ${kind === 'mv' ? `<label>Куди<select id="aW"><option value="k" ${dw === 'k' ? 'selected' : ''}>${WHN.k} → ${WHN.b}</option><option value="b" ${dw === 'b' ? 'selected' : ''}>${WHN.b} → ${WHN.k}</option></select></label>`
        : `<label>Склад<select id="aW">${['k', 'b'].map(w => `<option value="${w}" ${dw === w ? 'selected' : ''}>${WHN[w]} — є ${fq(x.st?.[w] || 0, x.u)}</option>`).join('')}</select></label>`}
      ${kind === 'off' ? `<div class="chips">${S.data.sk.offR.map(r => `<button class="chip" data-a="skReason" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div><input id="aN" placeholder="Причина списання">` : kind === 'add' ? '<input id="aN" placeholder="Коментар (напр. принесли без накладної)">' : ''}</div>`;
    const pm = modal({ title: ttl, body, buttons: [{ label: 'OK', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    setTimeout(() => $('#aQ')?.focus(), 60);
    if (await pm !== 'ok') return;
    const q = parseQ($('#aQ').value, x.u), wh = $('#aW')?.value, note = $('#aN')?.value?.trim() || '';
    closeModal();
    if (!(q > 0)) return toast('⚠️ Вкажіть кількість');
    if (kind === 'off' && !note) return toast('⚠️ Вкажіть причину списання');
    const r = kind === 'mv' ? await act('skMove', { id, from: wh, q }, '⇄ Переміщено') : await act('skAdj', { id, wh, q: kind === 'off' ? -q : q, note }, kind === 'off' ? '➖ Списано' : '➕ Оприбутковано');
    if (r) { S.data.sk = await api('skData').catch(() => S.data.sk); renderMain(); }
  }
  // вибір продукту зі списку (пошук)
  function skPick(title, filter = () => true, allowNew = false) {
    return new Promise(async res => {
      if (!S.data.sk) S.data.sk = await api('skData').catch(() => null); if (!S.data.sk) return res(null);
      const all = S.data.sk.ing.filter(x => !x.off && !x.grp && filter(x)).sort((a, b) => a.n.localeCompare(b.n));
      const draw = q => all.filter(x => !q || x.n.toLowerCase().includes(q.toLowerCase())).slice(0, 60).map(x => `<button class="pk-i" data-pk="${x.id}">${x.semi ? '🍳 ' : ''}${esc(x.n)} <span class="muted">${fq(totQ(x), x.u)}</span></button>`).join('') || '<div class="muted">Нічого не знайдено</div>';
      modalResolve = v => { closeModal(); res(v); };
      const el = document.createElement('div'); el.className = 'modal-bg'; el.id = 'modal';
      el.innerHTML = `<div class="modal"><h3>${esc(title)}</h3><input id="pkQ" placeholder="🔎 Почніть вводити назву" autocomplete="off">${allowNew ? '<button class="pk-i pk-new" data-pk="__new">➕ Новий продукт…</button>' : ''}<div class="pk-l" id="pkL">${draw('')}</div><div class="btns"><button class="btn" data-x>Скасувати</button></div></div>`;
      el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-x]')) return modalResolve(null); const p = e.target.closest('[data-pk]')?.dataset.pk; if (p) modalResolve(p); });
      el.querySelector('#pkQ').addEventListener('input', e => { el.querySelector('#pkL').innerHTML = draw(e.target.value); });
      document.body.append(el); setTimeout(() => el.querySelector('#pkQ')?.focus(), 60);
    });
  }
  async function skJournal(day) {
    day ||= todayK(); const r = await act('skJournal', { day }); if (!r) return;
    const T = { in: '🧾', add: '➕', off: '🗑', mv: '⇄', prod: '🍳', cnt: '📝' }, sh = n => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const NOTE = { in: 'накладна', add: 'додано вручну', off: 'списано', mv: 'переміщення', prod: 'заготовка', cnt: 'інвентаризація' };
    const can = x => ['add', 'off'].includes(x.t) && !x.undo && !/^(🔗|↩️)/.test(x.note || '') && (isAdmin() || (x.by === S.me?.name && day === todayK()));
    const rows = r.list.map((x, i) => [x, i]).reverse().map(([x, i]) => `<div class="kv${x.undo ? ' sk-undo' : ''}"><span>${x.at} ${T[x.t] || '•'} <b>${esc(x.n)}</b> ${x.q > 0 ? '+' : ''}${fq(x.q, x.u)} <span class="muted">· ${NOTE[x.t] || ''} · ${WHN[x.wh] || ''}${x.note ? ' · ' + esc(x.note) : ''}${x.by ? ' · ' + esc(x.by) : ''}${x.undo ? ` · ↩️ скасовано ${esc(x.undo.by)} ${x.undo.at}` : ''}</span></span><span class="kv-r">${isAdmin() && x.sum ? `<b class="money">${money(x.sum)}</b>` : ''}${can(x) ? `<button class="btn sm ghost" data-mi-v="u${i}:${x.ts}" title="Скасувати">↩️</button>` : ''}</span></div>`).join('');
    const v = await modal({ title: '📜 Рух складу', body: `<div class="zp-top"><button class="btn sm" data-mi-v="d${sh(-1)}">◀</button><b>${day === todayK() ? 'Сьогодні' : day.split('-').reverse().join('.')}</b>${day < todayK() ? `<button class="btn sm" data-mi-v="d${sh(1)}">▶</button>` : '<span></span>'}</div>
      <div class="muted" style="font-size:12px;margin-bottom:6px">🧾 накладна (з «видалено» / «↩️ повернуто» — коли накладну видалили або відновили) · ➕ додано · 🗑 списано · ⇄ переміщення · 🍳 заготовка · 📝 інвентаризація. Продажі за техкартами — у «📊 Плюси / мінуси».</div>
      <div class="sk-jr">${rows || '<div class="muted">Рухів за цей день немає</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] });
    if (!v) return;
    if (v[0] === 'd') return skJournal(v.slice(1));
    if (v[0] === 'u' && await confirmBox('↩️ Скасувати цей рух?', 'Кількість повернеться на склад як було') && await act('skJrUndo', { day, i: +v.slice(1).split(':')[0], ts: +v.split(':')[1] }, '↩️ Скасовано')) { S.data.sk = null; loadView(); }
    return skJournal(day);
  }
  // 🛒 закупівля
  function skBuyHTML() {
    const B = S.data.skBuy; if (!B) return '<div class="muted">Завантаження…</div>';
    if (!B.list.length) return `<div class="card"><div class="big">✅ Усього вистачає</div><div class="muted" style="margin-top:6px">Тут з'являться продукти, яких менше за мінімум. Мінімум і норма задаються в картці продукту (📦 Склад → натисніть на назву).</div></div>`;
    return `<div class="btnrow" style="margin:0 0 12px"><button class="btn sm primary" data-a="skShare">📤 Поділитися всім списком</button></div>` + B.list.map((g, gi) => `<div class="card"><h3>🚚 ${esc(g.sup)} ${g.sum ? `<span class="muted">· ~${money(g.sum)}</span>` : ''}</h3>
      ${g.items.map(i => `<div class="kv"><span>${esc(i.n)}<br><small class="muted">є ${fq(i.have, i.u)} · мінімум ${fq(i.min, i.u)}</small></span><span class="kv-r"><b>${fq(i.need, i.u)}</b>${i.price ? `<span class="muted money">~${money(i.sum)}</span>` : ''}</span></div>`).join('')}
      <div class="btnrow"><button class="btn sm" data-a="skShare" data-g="${gi}">📤 Надіслати замовлення</button></div></div>`).join('');
  }
  async function skShare(gi) {
    const B = S.data.skBuy, gs = gi === '' || gi == null ? B.list : [B.list[+gi]];
    const text = `Замовлення VARVAR:\n${gs.map(g => `${gs.length > 1 ? `\n${g.sup}:\n` : ''}${g.items.map(i => `• ${i.n} — ${fq(i.need, i.u)}`).join('\n')}`).join('\n')}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('📋 Скопійовано — вставте в месенджер постачальнику'); } } catch {}
  }
  // 🧾 накладні
  function skInvHTML() {
    const K = S.sk; if (K.draft) return skDraftHTML();
    const I = S.data.skInv, adm = isAdmin();
    const top = `<div class="card"><h3>Нова накладна</h3>${K.busy ? '<div class="sk-busy">🔎 Розпізнаю накладну… зазвичай 10–30 секунд</div>' : `<div class="sk-new"><label class="btn primary sk-scan">📷 Сканувати накладну<input type="file" id="skPhoto" accept="image/*" capture="environment" hidden></label><label class="btn">🖼 З галереї<input type="file" id="skPhoto2" accept="image/*" multiple hidden></label><button class="btn" data-a="skHand">✏️ Вручну</button>${isAdmin() ? '<label class="btn sm">🧪 Порівняти ШІ<input type="file" id="skBench" accept="image/*" multiple hidden></label>' : ''}</div>`}
      <div class="muted" style="font-size:12px;margin-top:8px">«Сканувати» одразу відкриває камеру — сфотографуйте накладну рівно, при гарному світлі. Кілька сторінок — «З галереї». Розпізнає Gemini — ви перевіряєте й підтверджуєте. Фото ніде не зберігається.</div></div>`;
    if (!I) return top + '<div class="muted">Завантаження…</div>';
    const debts = Object.entries(I.sups || {}).filter(([, s]) => s.debt > 0);
    const dH = adm && debts.length ? `<div class="card"><h3>💸 Борги постачальникам <span class="muted">· ${money(debts.reduce((a, [, s]) => a + s.debt, 0))}</span></h3>${debts.map(([n, s]) => `<div class="kv"><span>${esc(n)}</span><b class="money" style="color:var(--red)">${money(s.debt)}</b></div>`).join('')}</div>` : '';
    const rows = I.list.map(x => `<div class="kv rrow${x.del ? ' del' : ''}"><span class="press" data-a="skInvView" data-id="${x.id}">${x.day.slice(8)}.${x.day.slice(5, 7)} · <b>${esc(x.sup)}</b>${x.no ? ' №' + esc(x.no) : ''}<br><small class="muted">${x.n} поз. · ${esc(x.by)}</small></span>
      <span class="kv-r">${adm && x.total != null ? `<b class="money">${money(x.total)}</b>` : ''}${x.del ? '' : x.pay === 'debt' && !x.paid ? (adm ? `<button class="btn sm red" data-a="skInvPay" data-id="${x.id}">⏳ Оплатити</button>` : '<span class="muted">⏳ не оплачено</span>') : `<span title="оплачено">${x.pay === 'card' ? '💳' : x.pay === 'cash' ? '💵' : '✅'}</span>`}${adm ? `<button class="xb" data-a="skInvDel" data-id="${x.id}" data-b="${x.del ? 1 : ''}" title="${x.del ? 'Повернути' : 'Видалити'}">${x.del ? '↩️' : '🗑'}</button>` : ''}</span></div>`).join('');
    return top + dH + `<div class="card"><h3>🧾 Накладні <span class="muted">· ${I.list.length}</span></h3>${rows || '<div class="muted">Ще немає накладних</div>'}</div>`;
  }
  const lineHint = (l, x, adm) => { if (!x && !l.add) return ''; const u = x?.u || l.add?.u || '', bq = r3((+l.q || 0) * (+l.f || 1)), up = bq && +l.sum ? +l.sum / bq : 0;
    return `= ${fq(bq, u)}${up ? ` · ${money(up)}/${u}` : ''}${adm && x?.lp && up ? (up > x.lp * 1.01 ? ` <b class="warn">↑${Math.round((up / x.lp - 1) * 100)}%</b>` : up < x.lp * 0.99 ? ` <span class="good">↓${Math.round((1 - up / x.lp) * 100)}%</span>` : '') : ''}`; };
  function skDraftHTML() {
    const d = S.sk.draft, D = S.data.sk, adm = isAdmin(), ing = D.ing.filter(x => !x.off && !x.grp).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(ing.map(x => [x.id, x]));
    const sum = d.lines.reduce((a, l) => a + (+l.sum || 0), 0), diff = d.total ? Math.round((d.total - sum) * 100) / 100 : 0;
    const opt = l => `<option value="">— оберіть продукт —</option><option value="__new">${l.add ? `➕ Новий: ${esc(l.add.n)} (${l.add.u})` : '➕ Створити новий продукт…'}</option>${ing.map(x => `<option value="${x.id}" ${l.id === x.id ? 'selected' : ''}>${esc(x.n)} (${x.u})</option>`).join('')}`;
    const pkOpt = l => { const x = im.get(l.id), u = x?.u || l.add?.u || 'од.', pks = [{ n: u, f: 1 }, ...(x?.pk || [])]; if (l.f && !pks.some(p => p.f === +l.f)) pks.push({ n: '×' + l.f, f: +l.f }); return pks.map(p => `<option value="${p.f}" ${(+l.f || 1) === p.f ? 'selected' : ''}>${esc(p.n)}${p.f !== 1 ? ` (${p.f} ${u})` : ''}</option>`).join('') + '<option value="?">інша…</option>'; };
    const rows = d.lines.map((l, i) => { const st = l.add ? 'new' : !l.id ? 'none' : l.ok === 'guess' ? 'guess' : 'ok', x = im.get(l.id);
      return `<div class="dl ${st}"><div class="dl-src">${i + 1}. ${l.n ? esc(l.n) : '<i class="muted">новий рядок</i>'}${l.u || l.price ? ` <span class="muted">· ${esc(l.q0 ?? l.q)} ${esc(l.u || '')}${l.price ? ' × ' + l.price : ''}</span>` : ''}${st === 'guess' ? ` <span class="warn">❓ перевірте${l.sc ? ' · ' + Math.round(l.sc * 100) + '%' : ''}</span>` : st === 'none' ? ' <span class="warn">оберіть продукт</span>' : ''}</div>
        ${(st === 'guess' || st === 'new') && l.c?.length ? `<div class="chips dl-c">${st === 'new' ? '<span class="muted">схоже на:</span>' : ''}${l.c.map(c => `<button class="chip ${c.id === l.id ? 'on' : ''}" data-a="skDlCand" data-i="${i}" data-id="${c.id}">${esc(c.n)} <small class="muted">${Math.round(c.sc * 100)}%</small></button>`).join('')}${st === 'guess' ? `<button class="chip" data-a="skDlCand" data-i="${i}" data-id="__new">➕ Новий</button>` : ''}</div>` : ''}
        <div class="dl-f"><button class="pk-b ${l.id || l.add ? '' : 'empty'}" data-a="skDlPick" data-i="${i}">${x ? esc(x.n) + ` <span class="muted">${x.u}</span>` : l.add ? `➕ ${esc(l.add.n)} <span class="muted">${l.add.u}</span>` : '🔎 Оберіть продукт…'}</button><input data-dl="${i}" data-k="q" inputmode="decimal" value="${l.q ?? ''}" placeholder="К-сть"><select data-dl="${i}" data-k="f">${pkOpt(l)}</select><input data-dl="${i}" data-k="sum" inputmode="decimal" value="${l.sum ?? ''}" placeholder="Сума ₴"><button class="xb" data-a="skDlDel" data-i="${i}" title="Прибрати рядок">✕</button></div>
        <div class="dl-h muted" id="dlh${i}">${lineHint(l, x, adm)}</div></div>`; }).join('');
    const sups = Object.keys(S.data.skInv?.sups || {});
    return `<div class="card"><div class="rhead"><h3 style="margin:0">🧾 ${d.src === 'photo' ? 'Розпізнана накладна — перевірте' : 'Нова накладна'}</h3><button class="btn sm" data-a="skDraftX">✕ Скасувати</button></div>
      <div class="frow"><label>Постачальник<input id="dSup" list="supL" value="${esc(d.sup || '')}" data-dh="sup" placeholder="напр. Метро"><datalist id="supL">${sups.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label><label>№ документа<input id="dNo" value="${esc(d.no || '')}" data-dh="no"></label><label>Дата<input id="dDate" value="${esc(d.date || '')}" data-dh="date" placeholder="ДД.ММ.РРРР"></label></div></div>
      <div class="card"><h3>Позиції <span class="muted">· ${d.lines.length}</span> <span class="muted" style="font-weight:400;font-size:12px">🟢 впізнано · 🟡 ❓ перевірте — тапніть правильний · 🔵 новий — створиться сам</span></h3>${rows || '<div class="muted">Додайте позиції</div>'}
        <div class="btnrow"><button class="btn sm" data-a="skDlAdd">➕ Рядок</button><button class="btn sm" data-a="skScan">🔎 Сканувати штрихкод</button></div></div>
      <div class="card"><div class="kv tot"><span>Разом за позиціями</span><b class="money" id="dSum">${money(sum)}</b></div>${d.total ? `<div class="kv ${Math.abs(diff) > 1 ? 'bad' : ''}" id="dTot"><span>У документі</span><b class="money">${money(d.total)}${Math.abs(diff) > 1 ? ` · різниця ${money(diff)}` : ' ✅'}</b></div>` : ''}
        <div class="muted" style="font-size:12px;margin:10px 0 6px">Оплата:</div>
        <div class="btnrow">${isCook() ? '<button class="btn primary" data-a="skDraftSave" data-p="debt">✅ Записати (оплатить адмін)</button>' : '<button class="btn primary" data-a="skDraftSave" data-p="cash">💵 Оплачено з каси</button><button class="btn primary" data-a="skDraftSave" data-p="card">💳 Оплачено з картки</button><button class="btn" data-a="skDraftSave" data-p="debt">⏳ В борг</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">Оплачена накладна сама стане витратою в «Касі». Склад поповниться, ціни продуктів оновляться (середня ціна).</div></div>`;
  }
  const skDraftUpd = i => { const d = S.sk.draft, l = d.lines[i], x = S.data.sk.ing.find(y => y.id === l?.id); if (l && $('#dlh' + i)) $('#dlh' + i).innerHTML = lineHint(l, x, isAdmin()); const s = d.lines.reduce((a, z) => a + (+z.sum || 0), 0); if ($('#dSum')) $('#dSum').textContent = money(s); };
  async function skNewIng(n, u, home) { // новий продукт прямо з накладної / техкарти
    const D = S.data.sk, uu = /^(л|мл|l|ml)$/i.test(u || '') ? 'л' : /^(шт|уп|ящ|пач|пл|бут|бан|pcs?)\.?$/i.test(u || '') ? 'шт' : D.units.includes(u) ? u : 'кг';
    const body = `<div class="form"><label>Назва продукту<input id="nN" value="${esc(String(n || '').replace(/\s+\d+([.,]\d+)?\s*(кг|г|л|мл|шт)\.?$/i, '').trim())}"></label>
      <div class="frow"><label>Одиниця обліку<select id="nU">${D.units.map(x => `<option ${x === uu ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label>Склад<select id="nH"><option value="k" ${home !== 'b' ? 'selected' : ''}>${WHN.k}</option><option value="b" ${home === 'b' ? 'selected' : ''}>${WHN.b}</option></select></label></div>
      <label>Категорія<select id="nC">${D.cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>`;
    const v = await modal({ title: '➕ Новий продукт', body, buttons: [{ label: 'Додати', val: 'ok', cls: 'primary' }, { label: 'Скасувати', val: null }], keep: true });
    const r = v === 'ok' ? { n: $('#nN').value.trim(), u: $('#nU').value, home: $('#nH').value, cat: $('#nC').value } : null; closeModal();
    return r?.n ? r : null;
  }
  async function skDraftSave(pay) {
    const d = S.sk.draft, bad = d.lines.findIndex(l => !(+l.q > 0) || (!l.id && !l.add));
    if (!d.lines.length) return toast('⚠️ Немає позицій');
    if (bad >= 0) return toast(`⚠️ Рядок ${bad + 1}: оберіть продукт і кількість (або приберіть рядок ✕)`);
    const inv = { sup: $('#dSup')?.value.trim() || d.sup, no: $('#dNo')?.value.trim() || d.no, date: $('#dDate')?.value.trim() || d.date, pay, src: d.src, lines: d.lines.map(l => ({ id: l.id || null, q: +l.q, f: +l.f || 1, sum: +l.sum || 0, src: l.n || '', ...(l.chk ? { chk: 1 } : {}), ...(l.add ? { add: l.add } : {}) })) };
    const r = await act('skInvSave', { inv }, '🧾 Накладну записано'); if (!r) return;
    S.sk.draft = null; S.data.sk = null;
    if (r.alerts?.length) modal({ title: '🔺 Подорожчання', text: r.alerts.map(a => `${a.n}: ${money(a.from)} → ${money(a.to)} / ${a.u} (+${a.pct}%)`).join(' · '), buttons: [{ label: 'Зрозуміло', val: 1, cls: 'primary' }] });
    loadView();
  }
  function skAutoF(l) { const x = S.data.sk.ing.find(y => y.id === l.id); if (!x) return l.f || 1; if (l.ok === 'mem' && l.f) return l.f; const u = nrm(l.u || '');
    if (x.u === 'кг' && /^(г|гр)$/.test(u)) return 0.001; if (x.u === 'л' && u === 'мл') return 0.001; const p = u && (x.pk || []).find(p => nrm(p.n).slice(0, 2) === u.slice(0, 2)); return p ? p.f : 1; }
  async function skPhotos(files) {
    files = [...files].slice(0, 3); if (!files.length) return;
    S.sk.busy = true; renderMain();
    try {
      const images = await Promise.all(files.map(f => shrink(f, 1800, .82)));
      const r = await api('skInvParse', { images }, 120000);
      if (!S.data.sk) S.data.sk = await api('skData');
      S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: 'photo', lines: r.lines.map(l => ({ ...l, q0: l.q, f: l.add || (l.f && l.f !== 1) ? l.f : skAutoF(l) })) };
      if (!S.data.skInv) S.data.skInv = await api('skInvList').catch(() => null);
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
    S.sk.busy = false; renderMain();
  }
  // 🧪 одне фото накладної → усі безкоштовні моделі одночасно: хто швидше й точніше
  async function skBench(files) {
    files = [...files].slice(0, 3); if (!files.length) return;
    toast('🧪 Порівнюю моделі… до хвилини');
    try {
      const r = await api('aiBench', { images: await Promise.all(files.map(f => shrink(f, 1800, .82))) }, 90000);
      const l = r.list.sort((a, b) => (!!a.err - !!b.err) || (b.rows - a.rows) || (a.ms - b.ms));
      modal({ title: '🧪 Порівняння ШІ', body: l.map(x => `<div class="kv" style="flex-wrap:wrap"><b style="word-break:break-all">${x.err ? '❌' : '✅'} ${esc(x.m)}</b><span>${(x.ms / 1000).toFixed(1)} с</span></div>
        <div class="muted" style="font-size:12px;margin:-2px 0 8px;word-break:break-word">${x.err ? esc(x.err) : `${x.rows} рядків · сума рядків ${money(x.sum)}${x.total ? ` · разом у документі ${money(x.total)}` : ''}${x.sup ? ' · ' + esc(x.sup) : ''}<br>${x.ex.map(esc).join('<br>')}`}</div>`).join(''), buttons: [{ label: 'Зрозуміло', val: 1, cls: 'primary' }] });
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
  }
  // 🔎 код: штрихкод товару (сканер / камера) або QR накладної
  let camStop = null;
  async function skScan() {
    const pm = modal({ title: '🔎 Код / штрихкод', body: `<div class="form"><input id="scIn" placeholder="Відскануйте сканером або введіть код і Enter" autocomplete="off"><div id="scRes" class="muted"></div>
      <button class="btn" data-a="skCam">📷 Сканувати камерою</button><div id="scCam" class="sc-cam" hidden><video id="scV" playsinline muted></video></div></div>
      <div class="muted" style="font-size:12px;margin-top:8px">Штрихкод товару — додає продукт у накладну (можна сканувати підряд). QR-код накладної — розпізнаю її вміст.</div>`, buttons: [{ label: 'Готово', val: 'ok', cls: 'primary' }], keep: true });
    setTimeout(() => $('#scIn')?.focus(), 60);
    await pm; camStop?.(); camStop = null; closeModal(); renderMain();
  }
  async function skCode(code) {
    code = String(code || '').trim(); if (!code) return;
    const res = m => { const el = $('#scRes'); if (el) el.innerHTML = m; };
    if (/^\d{6,14}$/.test(code)) {
      if (!S.data.sk) S.data.sk = await api('skData');
      const x = S.data.sk.ing.find(y => (y.bc || []).includes(code));
      if (!x) { res(`❓ Невідомий штрихкод <b>${code}</b> <button class="btn sm" data-a="skBcBind" data-c="${code}">Привʼязати до продукту</button>`); return; }
      skDraftAdd(x); res(`✅ +1 <b>${esc(x.n)}</b> (${code})`); try { navigator.vibrate?.(60); } catch {}
      return;
    }
    // не цифри — QR накладної: вміст розбирає Gemini
    camStop?.(); camStop = null; closeModal(); S.sk.tab = 'inv'; S.sk.busy = true; renderMain();
    try { const r = await api('skInvParse', { text: code }, 60000); S.sk.draft = { sup: r.sup, no: r.no, date: r.date, total: r.total, src: 'code', lines: r.lines.map(l => ({ ...l, q0: l.q, f: l.f || 1 })) }; }
    catch (e) { toast('⚠️ ' + errText(e.message)); }
    S.sk.busy = false; renderMain();
  }
  function skDraftAdd(x) {
    const K = S.sk; K.tab = 'inv'; K.draft ||= { sup: '', no: '', date: '', total: 0, src: 'code', lines: [] };
    const l = K.draft.lines.find(z => z.id === x.id); if (l) l.q = r3((+l.q || 0) + 1); else K.draft.lines.push({ id: x.id, n: x.n, q: 1, f: 1, sum: '', ok: 'ok' });
    if (!$('#modal')) renderMain();
  }
  const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('сканер не завантажився')); document.head.append(s); });
  async function skCam() {
    const box = $('#scCam'), v = $('#scV'); if (!box || camStop) return; box.hidden = false;
    try {
      if ('BarcodeDetector' in window) {
        const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.srcObject = st; await v.play();
        const bd = new BarcodeDetector(); let on = true, last = '', lt = 0; camStop = () => { on = false; st.getTracks().forEach(t => t.stop()); };
        const loop = async () => { if (!on) return; if (!$('#scV')) return camStop?.(); try { const r = await bd.detect(v); const t = r[0]?.rawValue; if (t && (t !== last || Date.now() - lt > 2500)) { last = t; lt = Date.now(); skCode(t); } } catch {} setTimeout(loop, 250); }; loop();
      } else {
        await loadScript('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js');
        const rd = new ZXingBrowser.BrowserMultiFormatReader(); let last = '', lt = 0;
        const c = await rd.decodeFromVideoDevice(undefined, v, r => { if (!r) return; const t = r.getText(); if (t !== last || Date.now() - lt > 2500) { last = t; lt = Date.now(); skCode(t); } });
        camStop = () => { try { c.stop(); } catch {} };
      }
    } catch (e) { toast('⚠️ Камера недоступна: ' + (e.message || e)); box.hidden = true; camStop = null; }
  }
  async function skInvView(id) {
    const r = await act('skInvGet', { id }); if (!r) return; const x = r.inv, adm = isAdmin();
    const body = `<div class="sk-jr">${x.lines.map(l => `<div class="kv"><span>${esc(l.n)}${l.src && l.src !== l.n ? `<br><small class="muted">${esc(l.src)}</small>` : ''}</span><span class="kv-r"><b>${l.f !== 1 ? `${l.q} × ${l.f} = ` : ''}${fq(l.bq, l.u)}</b>${adm && l.sum != null ? `<span class="muted money">${money(l.sum)}</span>` : ''}</span></div>`).join('')}
      ${adm ? `<div class="kv tot"><span>Разом</span><b class="money">${money(x.total)}</b></div>` : ''}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">${x.day} ${x.at} · ${esc(x.by)} · ${{ photo: '📷 з фото', code: '🔎 з коду', hand: '✏️ вручну' }[x.src] || ''} · ${x.pay === 'debt' ? (x.paid ? `оплачено ${x.paid.src === 'card' ? 'з картки' : 'з каси'}` : '⏳ не оплачено') : x.pay === 'card' ? '💳 з картки' : '💵 з каси'}${x.del ? ' · 🗑 видалена' : ''}</div>`;
    await modal({ title: `🧾 ${x.sup}${x.no ? ' №' + x.no : ''}`, body, buttons: [{ label: 'Закрити', val: null }] });
  }
  // 📋 техкарти
  function skUnitCost(id, depth = 0) {
    const x = S.data.sk.ing.find(y => y.id === id); if (!x) return 0;
    const sc = x.semi && S.data.skCost?.cards?.['semi:' + id];
    if (sc && depth < 3 && sc.yield > 0) { const c = sc.items.reduce((a, l) => a + l.q * skUnitCost(l.id, depth + 1), 0); if (c > 0) return c / sc.yield; }
    return x.cost || 0;
  }
  function skCardsHTML() {
    const K = S.sk; if (K.card) return skCardEdHTML();
    const C = S.data.skCost; if (!C) return '<div class="muted">Завантаження…</div>';
    const tgt = C.cfg.foodCost, list = C.list.filter(x => !x.tech), q = K.q2.trim().toLowerCase();
    const nNo = list.filter(x => x.cost == null).length, nHi = list.filter(x => x.fc > tgt).length, nDr = list.filter(x => x.draft).length;
    const shown = list.filter(x => (!q || x.name.toLowerCase().includes(q)) && (K.flt === 'none' ? x.cost == null : K.flt === 'hi' ? x.fc > tgt : K.flt === 'draft' ? x.draft : true));
    const wc = list.filter(x => x.cost != null && !x.draft && x.price), avg = wc.length ? Math.round(wc.reduce((a, x) => a + x.fc, 0) / wc.length * 10) / 10 : null;
    const fcc = f => f == null ? '' : f <= tgt ? 'good' : f <= tgt + 10 ? 'mid' : 'bad';
    const tools = `<div class="sk-tools"><input id="skQ2" placeholder="🔎 Пошук страви" value="${esc(K.q2)}">
      <div class="chips">${[['', `Усі · ${list.length}`], ['none', `Без техкарти · ${nNo}`], ['hi', `Фудкост > ${tgt}% · ${nHi}`], ['draft', `Чернетки AI · ${nDr}`]].map(([k, l]) => `<button class="chip ${K.flt === k ? 'on' : ''}" data-a="skFlt" data-fl="${k}">${l}</button>`).join('')}</div>
      <div class="btnrow">${nNo ? `<button class="btn sm" data-a="skAiAll">${K.aiRun ? `⏹ Зупинити (${K.aiRun})` : `✨ AI-чернетки для ${nNo} страв без техкарти`}</button>` : ''}</div></div>
      <div class="pills sk-pills"><div class="pill"><span>📋 З техкартою</span><b>${list.length - nNo} / ${list.length}</b><small>${nDr ? `чернеток: ${nDr}` : 'страв і напоїв'}</small></div><div class="pill"><span>🎯 Середній фудкост</span><b class="${fcc(avg)}">${avg == null ? '—' : avg + '%'}</b><small>ціль ${tgt}%</small></div></div>`;
    const groups = {}; shown.forEach(x => (groups[x.cname] ||= []).push(x));
    const body = Object.entries(groups).map(([c, xs]) => `<div class="card"><h3>${esc(c)}</h3>${xs.map(x => `<div class="kv press sk-cr" data-a="skCard" data-k="${esc(x.key)}"><span>${esc(x.name)}${x.draft ? ' <span class="badge-d">✨ чернетка</span>' : ''}${x.miss?.length ? `<br><small class="warn">немає ціни: ${esc(x.miss.join(', '))}</small>` : ''}</span>
      <span class="kv-r">${x.cost == null ? '<span class="muted">немає техкарти</span>' : `<span class="muted money">${money(x.cost)}</span><b class="${fcc(x.fc)}">${x.fc ?? '—'}%</b>`}<span class="money" style="min-width:64px;text-align:right">${money(x.price)}</span></span></div>`).join('')}</div>`).join('') || '<div class="card muted">Нічого не знайдено</div>';
    return tools + body;
  }
  function skCardOpen(key) {
    const C = S.data.skCost, c = C?.cards?.[key], semi = key.startsWith('semi:');
    const it = semi ? null : C.list.find(x => x.key === key), x = semi ? S.data.sk.ing.find(y => y.id === key.slice(5)) : null;
    S.sk.card = { key, name: semi ? x?.n : it?.name, price: it?.price || 0, semi, u: x?.u, out: c?.out || '', yield: c?.yield || (semi ? 1 : ''), wh: c?.wh || '', perL: !!c?.perL, mk: c?.mk || '', draft: !!c?.draft, note: c?.note || '', items: (c?.items || []).map(l => ({ ...l })), isNew: !c, variant: key.includes('|') };
    S.sk.tab = semi ? S.sk.tab : 'cards'; renderMain(); $('#main').scrollTop = 0;
  }
  function skCardEdHTML() {
    const c = S.sk.card, D = S.data.sk, ing = D.ing.filter(x => !x.off).sort((a, b) => a.n.localeCompare(b.n)), im = new Map(D.ing.map(x => [x.id, x])), tgt = S.data.skCost?.cfg?.foodCost || 30;
    const cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0), fc = c.price ? Math.round(cost / c.price * 1000) / 10 : null, rec = cost ? Math.ceil(cost / (tgt / 100) / 5) * 5 : 0;
    const per = c.semi && +c.yield > 0 ? cost / +c.yield : null;
    const rows = c.items.map((l, i) => { const x = im.get(l.id), u = x?.u || l.add?.u || 'кг', k = u === 'шт' ? 1 : 1000, loss = l.loss ?? x?.loss ?? 0, net = (+l.q || 0) * (1 - loss / 100);
      return `<div class="cl"><button class="pk-b ${l.id || l.add ? '' : 'empty'}" data-a="skClPick" data-i="${i}">${x ? (x.semi ? '🍳 ' : '') + esc(x.n) : l.add ? `➕ ${esc(l.add.n)}` : '🔎 Продукт…'}</button>
        <label>брутто, ${small(u)}<input data-cl="${i}" data-k="q" inputmode="decimal" value="${l.q ? r3(l.q * k) : ''}"></label><label>втрати %<input data-cl="${i}" data-k="loss" inputmode="numeric" value="${loss || ''}" placeholder="0"></label>
        <label>нетто, ${small(u)}<input data-cl="${i}" data-k="net" inputmode="decimal" value="${net ? r3(net * k) : ''}" id="cln${i}"></label>
        ${isAdmin() ? `<label>ціна ₴/${small(u)}<input data-cl="${i}" data-k="cost" inputmode="decimal" ${!x || x.semi ? `disabled placeholder="${x?.semi ? 'з рецепту' : '—'}"` : ''} value="${x && !x.semi ? (c.costCh?.[x.id] ?? x.cost ?? '') || '' : ''}"></label>` : '<i></i>'}
        <span class="cl-c muted money" id="clc${i}">${x ? money((+l.q || 0) * skUnitCost(x.id)) : ''}</span><button class="xb" data-a="skClDel" data-i="${i}">✕</button></div>`; }).join('');
    return `<div class="card"><div class="rhead"><div><h3 style="margin:0">📋 ${esc(c.name || '')}</h3><span class="muted">${c.semi ? `заготовка · партія ${c.yield || 1} ${c.u || ''}` : `ціна ${money(c.price)}`}${c.draft ? ' · ✨ чернетка від AI — перевірте грамовки' : ''}</span></div><button class="btn sm" data-a="skCardX">← Назад</button></div>
      <div class="frow">${c.semi ? `<label>Вихід партії, ${esc(c.u || '')}<input data-ch="yield" inputmode="decimal" value="${c.yield || ''}"></label>` : `<label>Вихід, г / мл<input data-ch="out" inputmode="numeric" value="${c.out || ''}" placeholder="напр. 400"></label>`}
        <label>Списувати зі складу<select data-ch="wh"><option value="">авто (${c.semi ? 'де заготовка' : 'кухня — з кухні, бар — з бару'})</option><option value="k" ${c.wh === 'k' ? 'selected' : ''}>${WHN.k}</option><option value="b" ${c.wh === 'b' ? 'selected' : ''}>${WHN.b}</option></select></label>
        ${c.variant && !c.semi ? `<label class="chk"><input type="checkbox" data-ch="perL" ${c.perL ? 'checked' : ''}> на 1 л — множити на обʼєм (розливне)</label>` : ''}</div></div>
      <div class="card"><h3>Склад <span class="muted">· ${c.items.length}</span></h3>${rows || '<div class="muted">Додайте продукти або натисніть «✨ Заповнити з AI»</div>'}
        ${c.items.length ? `<div class="kv tot sk-mass"><span>⚖️ Загальна маса продуктів</span><b id="cMass">${skMass(c)}</b></div>` : ''}
        <div class="btnrow"><button class="btn sm" data-a="skClAdd">➕ Продукт</button><button class="btn sm" data-a="skCardAi">${S.sk.aiBusy ? '⏳ AI думає…' : '✨ Заповнити з AI'}</button></div></div>
      ${c.semi ? `<div class="card sk-howto">📐 <b>Як це працює:</b> вкажіть рецепт на будь-який вихід (напр. на <b>1 ${esc(c.u || 'л')}</b>: усі продукти й «Вихід партії» = 1). Система порахує, скільки коштує 1 ${esc(c.u || 'л')}.<br>У техкарті страви додайте цей соус як звичайний продукт (напр. <b>0.05 ${esc(c.u || 'л')}</b>) — собівартість страви порахується з ціни 1 ${esc(c.u || 'л')}${(S.cfg?.semiCalc ?? 1) ? ', а при продажі зі складу спишуться самі продукти рецепту. Варити «заготовку» в системі не потрібно.' : '. Режим партій: продукти списуються, коли на кухні відмічають «🍳 Заготовка».'}</div>` : ''}
      <div class="card"><div class="kv tot"><span>Собівартість ${c.semi ? 'партії' : 'порції'}</span><b class="money" id="cCost">${money(cost)}</b></div>
        ${c.semi ? `<div class="kv"><span>За 1 ${esc(c.u || '')}</span><b class="money" id="cPer">${per != null ? money(per) : '—'}</b></div>`
        : `<div class="kv"><span>Фудкост</span><b id="cFc" class="${fc == null ? '' : fc <= tgt ? 'good' : fc <= tgt + 10 ? 'mid' : 'bad'}">${fc ?? '—'}%</b></div><div class="kv"><span>Маржа з порції</span><b class="money" id="cM">${money(c.price - cost)}</b></div>
        <div class="kv"><span>Рекомендована ціна при фудкості ${tgt}%</span><b class="money" id="cRec">${rec ? money(rec) : '—'}</b></div>
        <div class="kv sk-mk"><span>📈 Націнка (множник)<br><small class="muted">напр. 4 = собівартість × 4</small></span><span class="kv-r"><input data-ch="mk" inputmode="decimal" value="${c.mk || ''}" placeholder="×4" style="width:80px"></span></div>
        <div class="kv"><span>Ціна за націнкою</span><b class="money" id="cMk">${+c.mk && cost ? money(Math.ceil(cost * +String(c.mk).replace(',', '.') / 5) * 5) : '—'}</b></div>
        <div class="kv"><span>Фактична націнка за ціною в меню</span><b id="cMkF">${cost && c.price ? '×' + (Math.round(c.price / cost * 100) / 100) + ` (+${Math.round((c.price / cost - 1) * 100)}%)` : '—'}</b></div>`}
        <div class="btnrow"><button class="btn primary" data-a="skCardSave">💾 Зберегти</button>${c.isNew ? '' : '<button class="btn red" data-a="skCardDel">🗑 Видалити техкарту</button>'}</div>
        <div class="muted" style="font-size:12px;margin-top:8px">Брутто — скільки береться зі складу; нетто — після чистки / варки. Продаж страви списує брутто зі складу. Чернетка AI не списує, поки ви не збережете.</div></div>`;
  }
  // ⚖️ маса продуктів у техкарті: брутто і нетто (кг/л → г/мл; шт окремо)
  function skMass(c) { const im = new Map(S.data.sk.ing.map(x => [x.id, x])); let g = 0, n = 0, pc = 0; for (const l of c.items) { const x = im.get(l.id), u = x?.u || l.add?.u || 'кг', q = +l.q || 0, loss = l.loss ?? x?.loss ?? 0; if (u === 'шт') pc += q; else { g += q * 1000; n += q * (1 - loss / 100) * 1000; } }
    return `${Math.round(g)} г${Math.round(n) !== Math.round(g) ? ` · нетто ${Math.round(n)} г` : ''}${pc ? ` + ${r3(pc)} шт` : ''}`; }
  const skCardCalc = () => { const c = S.sk.card; if (!c) return; const tgt = S.data.skCost?.cfg?.foodCost || 30, cost = c.items.reduce((a, l) => a + (l.id ? (+l.q || 0) * skUnitCost(l.id) : 0), 0);
    c.items.forEach((l, i) => { const el = $('#clc' + i); if (el && l.id) el.textContent = money((+l.q || 0) * skUnitCost(l.id)); });
    const set = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
    set('cMass', skMass(c)); { const mk = +String(c.mk || '').replace(',', '.'); set('cMk', mk && cost ? money(Math.ceil(cost * mk / 5) * 5) : '—'); }
    set('cCost', money(cost)); if (c.semi) set('cPer', +c.yield > 0 ? money(cost / +c.yield) : '—');
    else { const fc = c.price ? Math.round(cost / c.price * 1000) / 10 : null; set('cFc', (fc ?? '—') + '%'); const el = $('#cFc'); if (el) el.className = fc == null ? '' : fc <= tgt ? 'good' : fc <= tgt + 10 ? 'mid' : 'bad'; set('cM', money(c.price - cost)); set('cRec', cost ? money(Math.ceil(cost / (tgt / 100) / 5) * 5) : '—'); } };
  async function skMakeIngs(lines) { // нові продукти (з AI / накладної) → створити, повернути id
    for (const l of lines) {
      if (l.id || !l.add) continue;
      const ex = S.data.sk.ing.find(x => !x.off && nrm(x.n) === nrm(l.add.n));
      if (ex) { l.id = ex.id; delete l.add; continue; }
      const r = await api('skIngSave', { x: { n: l.add.n, u: l.add.u, home: l.add.home || 'k', cat: l.add.cat || 'Інше', loss: l.loss || 0 } }).catch(e => ({ error: e.message }));
      if (r.x) { S.data.sk.ing.push(r.x); l.id = r.x.id; delete l.add; } else throw new Error(`«${l.add.n}»: ${r.error}`);
    }
  }
  async function skCardSave(draft = false) {
    const c = S.sk.card;
    try { await skMakeIngs(c.items); } catch (e) { return toast('⚠️ ' + e.message); }
    const items = c.items.filter(l => l.id && +l.q > 0).map(l => ({ id: l.id, q: r3(l.q), ...(l.loss != null && l.loss !== '' ? { loss: +l.loss } : {}) }));
    if (!items.length) return toast('⚠️ Додайте хоча б один продукт з кількістю');
    if (c.costCh && Object.keys(c.costCh).length && !(await act('skIngCost', { list: Object.entries(c.costCh).map(([id, cost]) => ({ id, cost })) }))) return;
    const card = { items, out: +c.out || 0, yield: +c.yield || 0, wh: c.wh, perL: c.perL, mk: +String(c.mk || '').replace(',', '.') || 0, draft, note: c.note };
    const r = await act('skCardSave', { key: c.key, name: c.name, card }, draft ? '✨ Чернетку збережено' : '💾 Техкарту збережено'); if (!r) return;
    S.sk.card = null; S.data.sk = null; loadView();
  }
  async function skCardAi() {
    const c = S.sk.card; if (S.sk.aiBusy) return; S.sk.aiBusy = true; renderMain();
    try {
      const r = await api('skCardAi', { key: c.key, yield: c.yield }, 45000);
      c.items = r.items.map(l => ({ id: l.id, q: l.q, loss: l.loss, ...(l.id ? {} : { add: { n: l.n, u: l.u, home: S.data.sk.ing.find(x => x.id === c.key.slice(5))?.home || 'k' } }) }));
      if (!c.semi && r.out && !c.out) c.out = r.out; c.draft = true; toast('✨ Готово — перевірте грамовки і збережіть');
    } catch (e) { toast('⚠️ ' + errText(e.message)); }
    S.sk.aiBusy = false; renderMain();
  }
  async function skAiAll() {
    const K = S.sk; if (K.aiRun) { K.aiStop = true; return; }
    const todo = S.data.skCost.list.filter(x => !x.tech && x.cost == null); if (!todo.length) return;
    if (!(await confirmBox(`✨ Скласти чернетки техкарт для ${todo.length} страв?`, 'AI запропонує склад і грамовки, нові продукти створяться самі. Чернетки не списують склад, поки ви їх не перевірите й не збережете. Займе кілька хвилин.'))) return;
    K.aiStop = false; let done = 0, fail = 0;
    for (const x of todo) {
      if (K.aiStop) break; K.aiRun = `${done + fail + 1}/${todo.length}`; if (S.view === 'calc') renderMain();
      try {
        const r = await api('skCardAi', { key: x.key }, 45000), items = r.items.map(l => ({ id: l.id, q: l.q, loss: l.loss, ...(l.id ? {} : { add: { n: l.n, u: l.u, home: ['bar', 'hookah'].includes(((S.groups || []).find(g => g.cats.includes(x.cat)) || {}).id) ? 'b' : 'k' } }) }));
        await skMakeIngs(items);
        await api('skCardSave', { key: x.key, name: x.name, card: { items: items.filter(l => l.id).map(l => ({ id: l.id, q: l.q, ...(l.loss ? { loss: l.loss } : {}) })), out: r.out || 0, draft: true } });
        done++;
      } catch { fail++; await new Promise(z => setTimeout(z, 4000)); }
    }
    K.aiRun = null; toast(`✨ Чернеток: ${done}${fail ? ` · не вдалось: ${fail}` : ''}`); S.data.sk = null; if (S.view === 'calc') loadView();
  }
  // 📋 техкарти для кухні (без грошей)
  const techCard = x => `<div class="card tech"><h3>${esc(x.name)}${x.draft ? ' <span class="badge-d">чернетка</span>' : ''}</h3>${x.out || x.size ? `<div class="muted">вихід ${x.out ? x.out + ' г' : esc(x.size)}${x.yield ? ` · партія ${x.yield}` : ''}</div>` : ''}
    ${x.items.map(l => { const net = l.q * (1 - (l.loss || 0) / 100); return `<div class="kv"><span>${esc(l.n)}</span><b>${fq(l.q, l.u)}${l.loss ? ` <small class="muted">→ ${fq(net, l.u)} нетто</small>` : ''}</b></div>`; }).join('')}${x.desc ? `<div class="muted" style="font-size:12px;margin-top:6px">${esc(x.desc)}</div>` : ''}</div>`;
  function skTechHTML() {
    const T = S.data.skTech; if (!T) return '<div class="muted">Завантаження…</div>';
    const q = S.sk.q2.trim().toLowerCase(), l = T.list.filter(x => !q || x.name.toLowerCase().includes(q));
    return `<div class="sk-tools"><input id="skQ2" placeholder="🔎 Пошук страви" value="${esc(S.sk.q2)}"></div><div class="tech-g">${l.map(techCard).join('') || '<div class="card muted">Техкарт ще немає — їх заповнює адміністратор</div>'}</div>`;
  }
  async function skTechOne(name) {
    const r = await act('skTech', { name }); const x = r?.list?.[0];
    if (!x) return toast('Для цієї страви ще немає техкарти');
    await modal({ title: '📋 Техкарта', body: techCard(x), buttons: [{ label: 'Закрити', val: null }] });
  }
  async function skTechAll() {
    const r = await act('skTech', {}); if (!r) return;
    const pm = modal({ title: '📋 Техкарти', body: `<input id="tqQ" placeholder="🔎 Пошук страви" autocomplete="off"><div class="tech-m" id="tqL">${r.list.map(techCard).join('') || '<div class="muted">Техкарт ще немає</div>'}</div>`, buttons: [{ label: 'Закрити', val: null }] });
    setTimeout(() => { const i = $('#tqQ'); i?.addEventListener('input', () => { const q = i.value.toLowerCase(); $('#tqL').innerHTML = r.list.filter(x => x.name.toLowerCase().includes(q)).map(techCard).join(''); }); }, 30);
    await pm;
  }
  // 🍳 заготовки
  function skProdHTML() {
    const D = S.data.sk, adm = isAdmin(), cards = S.data.skCost?.cards || {}, semis = D.ing.filter(x => x.semi && !x.off), calc = S.cfg?.semiCalc ?? 1;
    return `${calc ? '<div class="card sk-howto">📐 <b>Режим «розрахунок»:</b> соуси й тісто рахуються від рецепту — ціна за 1 л / 1 кг, а при продажі страви продукти рецепту списуються самі. Нічого «готувати» тут не потрібно, лише заповнити рецепт (📋 Техкарта). Облік партіями вмикається в Налаштуваннях → 🧮 Розрахунок.</div>' : ''}<div class="btnrow" style="margin:0 0 12px">${adm ? '<button class="btn sm primary" data-a="skSemiNew">➕ Заготовка</button>' : ''}</div>` + (semis.length ? `<div class="grid2">${semis.map(x => { const c = cards['semi:' + x.id];
      return `<div class="card"><h3>🍳 ${esc(x.n)}</h3>${calc ? '' : `<div class="kv"><span>На складі</span><b>${fq(totQ(x), x.u)}</b></div>`}${adm ? `<div class="kv"><span>Собівартість</span><b class="money">${skUnitCost(x.id) ? money(skUnitCost(x.id)) + ' / ' + x.u : '—'}</b></div><div class="kv"><span>Техкарта</span><span class="${c ? '' : 'warn'}">${c ? `${c.items.length} продуктів · партія ${c.yield} ${x.u}` : 'не заповнена'}</span></div>` : ''}
        <div class="btnrow">${calc ? '' : `<button class="btn sm primary" data-a="skProd" data-id="${x.id}">🍳 Приготували</button>`}${adm ? `<button class="btn sm" data-a="skCardSemi" data-id="${x.id}">📋 Техкарта</button>` : ''}</div></div>`; }).join('')}</div>`
      : `<div class="card muted">Заготовок ще немає. ${adm ? 'Натисніть «➕ Заготовка» (напр. «Соус зелений», л) і заповніть її техкарту: з чого й скільки виходить. Потім «🍳 Приготували» спише сировину й додасть заготовку на склад, а страви списуватимуть уже заготовку.' : 'Їх додає адміністратор.'}</div>`);
  }
  async function skProduce(id) {
    const x = S.data.sk.ing.find(y => y.id === id); if (!x) return;
    const v = await ask(`🍳 ${x.n}: скільки приготували?`, `напр. 3 (${x.u})`); if (!v) return;
    const q = parseQ(v, x.u); if (!(q > 0)) return toast('⚠️ Вкажіть кількість');
    const r = await act('skProduce', { id, q }, `🍳 +${fq(q, x.u)} ${x.n}`); if (r) { S.data.sk = null; loadView(); }
  }
  // 📝 інвентаризація
  function skCountHTML() {
    const K = S.sk, C = S.data.skCount, adm = isAdmin(); if (!C) return '<div class="muted">Завантаження…</div>';
    const wh = K.cwh, all = C.ing.filter(x => !x.off && !x.grp && (x.home === wh || (x.st?.[wh] || 0) !== 0)).sort((a, b) => (a.cat || '').localeCompare(b.cat || '') || a.n.localeCompare(b.n));
    const q = K.cq.trim().toLowerCase(), shown = all.filter(x => !q || x.n.toLowerCase().includes(q)), n = Object.values(K.cf).filter(v => v !== '').length;
    const diffH = x => { const raw = K.cf[x.id]; if (raw == null || raw === '') return ''; const f = parseQ(raw, x.u); if (isNaN(f)) return '<span class="warn">?</span>'; const d = r3(f - (x.st?.[wh] || 0));
      return d ? `<span class="${d < 0 ? 'neg' : 'good'}">${d > 0 ? '+' : ''}${fq(d, x.u)}${adm && x.cost ? ` · ${d > 0 ? '+' : ''}${money(d * x.cost)}` : ''}</span>` : '<span class="good">✓</span>'; };
    let cat = '';
    const rows = shown.map(x => { const h = x.cat !== cat ? `<div class="cnt-cat">${esc(cat = x.cat || 'Інше')}</div>` : '';
      return h + `<div class="cnt-r"><span>${x.semi ? '🍳 ' : ''}${esc(x.n)}<br><small class="muted">система: ${fq(x.st?.[wh] || 0, x.u)}</small></span><input data-cf="${x.id}" inputmode="decimal" value="${esc(K.cf[x.id] ?? '')}" placeholder="факт, ${x.u}"><span class="cnt-d" id="cfd${x.id}">${diffH(x)}</span></div>`; }).join('');
    const hist = (S.data.skCnts || []).slice(0, 15).map(c => `<div class="kv press" data-a="skCntView" data-id="${c.id}"><span>${c.day.slice(8)}.${c.day.slice(5, 7)} · ${WHN[c.wh]} · ${esc(c.by)} <span class="muted">· ${c.n} поз.</span></span>${adm ? `<span class="kv-r"><b class="neg">${money(c.short)}</b><b class="good">+${money(c.over)}</b></span>` : ''}</div>`).join('');
    return `<div class="sk-tools">${adm ? `<div class="chips">${['k', 'b'].map(w => `<button class="chip ${wh === w ? 'on' : ''}" data-a="skCwh" data-w="${w}">${WHN[w]}</button>`).join('')}</div>` : ''}<input id="skCq" placeholder="🔎 Пошук продукту" value="${esc(K.cq)}"></div>
      <div class="card"><div class="rhead"><div><h3 style="margin:0">📝 ${WHN[wh]}: внесено ${n} з ${all.length}</h3><span class="muted">Пишіть фактичний залишок (можна «250 г»). Чернетка зберігається сама — можна рахувати з планшета частинами. Порожні рядки не змінюються.</span></div>
        <button class="btn primary" data-a="skCntFin" ${n ? '' : 'disabled'}>✅ Завершити</button></div>${rows || '<div class="muted">На цьому складі ще немає продуктів</div>'}</div>
      ${hist ? `<div class="card"><h3>Історія</h3>${hist}</div>` : ''}`;
  }
  let cfT = null; const cfPend = {};
  function skCfInput(id, v) {
    const K = S.sk, C = S.data.skCount, x = C.ing.find(y => y.id === id); K.cf[id] = v;
    const el = $('#cfd' + id); if (el && x) { const f = parseQ(v, x.u), d = r3(f - (x.st?.[K.cwh] || 0)); el.innerHTML = v === '' ? '' : isNaN(f) ? '<span class="warn">?</span>' : d ? `<span class="${d < 0 ? 'neg' : 'good'}">${d > 0 ? '+' : ''}${fq(d, x.u)}${isAdmin() && x.cost ? ` · ${d > 0 ? '+' : ''}${money(d * x.cost)}` : ''}</span>` : '<span class="good">✓</span>'; }
    cfPend[id] = v === '' ? '' : parseQ(v, x?.u); clearTimeout(cfT);
    cfT = setTimeout(async () => { const f = { ...cfPend }; Object.keys(cfPend).forEach(k => delete cfPend[k]); Object.keys(f).forEach(k => { if (Number.isNaN(f[k])) delete f[k]; }); if (Object.keys(f).length) await api('skCountSave', { wh: K.cwh, f }).catch(() => toast('⚠️ Чернетку не збережено — перевірте інтернет')); }, 1200);
  }
  async function skCntFinish() {
    const K = S.sk; clearTimeout(cfT); const f = { ...cfPend }; Object.keys(cfPend).forEach(k => delete cfPend[k]);
    if (Object.keys(f).length) await api('skCountSave', { wh: K.cwh, f }).catch(() => {});
    if (!(await confirmBox(`✅ Завершити інвентаризацію (${WHN[K.cwh]})?`, 'Залишки стануть такими, як ви внесли. Нестачі й надлишки запишуться в історію.'))) return;
    const r = await act('skCountFinish', { wh: K.cwh }, '📝 Інвентаризацію завершено'); if (!r) return;
    K.cf = {}; await skCntShow(r.doc); loadView();
  }
  async function skCntShow(d) {
    const adm = isAdmin(), ch = d.lines.filter(x => x.diff);
    await modal({ title: `📝 ${WHN[d.wh]} · ${d.day}`, body: `${adm ? `<div class="kv tot"><span>🔻 Нестача</span><b class="money neg">${money(d.short)}</b></div><div class="kv"><span>🔺 Надлишок</span><b class="money good">+${money(d.over)}</b></div>` : ''}
      <div class="sk-jr">${ch.map(x => `<div class="kv"><span>${esc(x.n)}<br><small class="muted">було ${fq(x.sys, x.u)} → факт ${fq(x.fact, x.u)}</small></span><b class="${x.diff < 0 ? 'neg' : 'good'}">${x.diff > 0 ? '+' : ''}${fq(x.diff, x.u)}${adm && x.sum != null ? ` · ${money(x.sum)}` : ''}</b></div>`).join('') || '<div class="muted">Усе збіглося ✅</div>'}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">Пораховано позицій: ${d.lines.length} · ${esc(d.by)}</div>`, buttons: [{ label: 'Закрити', val: null }] });
  }
  // 📊 плюси / мінуси
  function skRepHTML() {
    const K = S.sk, R = S.data.skRep, P = [['d', 'Сьогодні'], ['w', '7 днів'], ['30', '30 днів'], ['m', 'Цей місяць'], ['pm', 'Мин. місяць']];
    const head = `<div class="chips scroll" style="margin-bottom:12px">${P.map(([k, l]) => `<button class="chip ${K.p === k ? 'on' : ''}" data-a="skP" data-p="${k}">${l}</button>`).join('')}</div>`;
    if (!R) return head + '<div class="muted">Рахую…</div>';
    const tgt = R.foodCost, fc = R.revKnown ? Math.round(R.cogs / R.revKnown * 1000) / 10 : null, gp = R.revKnown - R.cogs, cls = f => f == null ? '' : f <= tgt ? 'good' : f <= tgt + 10 ? 'mid' : 'bad';
    const kpis = `<div class="kpis"><div class="kpi accent"><span>Виручка</span><b class="money">${money(R.revenue)}</b></div><div class="kpi"><span>Собівартість проданого</span><b class="money">${money(R.cogs)}</b>${R.revKnown < R.revenue ? `<small class="muted">з ${money(R.revKnown)} виручки страв з техкартами</small>` : ''}</div>
      <div class="kpi"><span>Фудкост <small class="muted">(ціль ${tgt}%)</small></span><b class="${cls(fc)}">${fc == null ? '—' : fc + '%'}</b></div><div class="kpi green"><span>Валовий прибуток <small class="muted">(страви з техкартами)</small></span><b class="money">${money(gp)}</b></div></div>
      <div class="pills"><div class="pill"><span>🗑 Списано</span><b class="money">${money(R.offSum)}</b></div><div class="pill"><span>📝 Інвентаризацій</span><b>${R.cnt.n}</b>${R.cnt.n ? `<small><span class="neg">${money(R.cnt.short)}</span> · <span class="good">+${money(R.cnt.over)}</span></small>` : ''}</div>
      ${R.noCard ? `<div class="pill wide"><span>⚠️ Без техкарти</span><b>${R.noCard} страв</b><small class="press" data-a="skTab" data-t="cards">їхня собівартість не врахована — заповнити →</small></div>` : ''}</div>`;
    const ME = { star: ['⭐ Зірки', 'популярні й вигідні — тримайте якість і ціну'], horse: ['🐴 Конячки', 'популярні, але мало заробляють — підніміть ціну на 5–10% або здешевіть техкарту'], puzzle: ['❓ Загадки', 'вигідні, але беруть рідко — краще місце в меню, фото, хай офіціанти радять'], dog: ['🐶 Собаки', 'і непопулярні, і невигідні — приберіть або переробіть'] };
    const me = R.rows.filter(x => x.me), meH = me.length ? `<div class="me-g">${Object.entries(ME).map(([k, [t, tip]]) => { const l = me.filter(x => x.me === k).sort((a, b) => b.q - a.q); return `<div class="card me me-${k}"><h3>${t} <span class="muted">· ${l.length}</span></h3><div class="muted" style="font-size:12px;margin-bottom:6px">${tip}</div>${l.slice(0, 8).map(x => `<div class="kv"><span>${esc(x.n)}</span><span class="muted">${x.q} шт · ${money(x.cm)}/шт</span></div>`).join('') || '<div class="muted">—</div>'}</div>`; }).join('')}</div>` : '';
    const tbl = `<div class="card"><h3>🍽 Прибуток по стравах</h3><div class="sk-tbl"><div class="th"><span>Страва</span><span>Продано</span><span>Виручка</span><span>Собів./шт</span><span>Маржа</span><span>Фудкост</span></div>
      ${R.rows.slice(0, 120).map(x => `<div class="tr"><span>${esc(x.n)}${x.rec && x.fc > tgt ? `<br><small class="warn">реком. ціна ${money(x.rec)}</small>` : ''}</span><span>${x.q}</span><span class="money">${money(x.rev)}</span><span class="money">${x.unit == null ? '—' : money(x.unit)}</span><span class="money">${x.cm == null ? '—' : money(x.cm * x.q)}</span><b class="${cls(x.fc)}">${x.fc == null ? '—' : x.fc + '%'}</b></div>`).join('')}</div></div>`;
    const off = R.off.length ? `<div class="grid2"><div class="card"><h3>🗑 Списання за причинами</h3>${R.off.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b class="money">${money(v)}</b></div>`).join('')}</div><div class="card"><h3>Що списуємо найбільше</h3>${R.offIng.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b class="money">${money(v)}</b></div>`).join('')}</div></div>` : '';
    return head + kpis + meH + tbl + off;
  }

  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-a]'); if (!el || !/^sk/.test(el.dataset.a)) return;
    const a = el.dataset.a, K = S.sk;
    switch (a) {
      case 'skTab': K.tab = el.dataset.t; K.q2 = ''; K.card = null; if (S.view !== 'calc') { S.view = 'calc'; renderNav(); } renderMain(); loadView(); $('#main').scrollTop = 0; break;
      case 'skWh': K.wh = el.dataset.w; renderMain(); break;
      case 'skIng': skIngEdit(el.dataset.id); break;
      case 'skGrp': skGrpEdit(el.dataset.id); break;
      case 'skDups': skDups(); break;
      case 'skAdd': skQty('add', el.dataset.id); break;
      case 'skOff': skQty('off', el.dataset.id); break;
      case 'skMv': skQty('mv', el.dataset.id); break;
      case 'skReason': { const i = $('#aN'); if (i) i.value = el.dataset.r; break; }
      case 'skOffPick': { const id = await skPick('🗑 Що списати?'); if (id) skQty('off', id); break; }
      case 'skJr': skJournal(); break;
      case 'skShare': skShare(el.dataset.g); break;
      case 'skHand': if (!S.data.skInv) S.data.skInv = await api('skInvList').catch(() => null); K.draft = { sup: '', no: '', date: '', total: 0, src: 'hand', lines: [{ id: null, n: '', q: '', f: 1, sum: '' }] }; renderMain(); break;
      case 'skScan': skScan(); break;
      case 'skCam': skCam(); break;
      case 'skBcBind': { const c = el.dataset.c; if (!isAdmin()) { toast('Привʼязати штрихкод може адміністратор'); break; } camStop?.(); camStop = null; modalResolve?.('ok'); await new Promise(z => setTimeout(z, 50));
        const id = await skPick(`Штрихкод ${c} — який це продукт?`); if (!id) break; const x = S.data.sk.ing.find(y => y.id === id);
        const r = await act('skIngSave', { x: { ...x, bc: [...(x.bc || []), c] } }, '🔗 Штрихкод привʼязано'); if (r) { Object.assign(x, r.x); skDraftAdd(x); renderMain(); } break; }
      case 'skDlPick': case 'skClPick': {
        const dl = a === 'skDlPick', i = +el.dataset.i, l = dl ? K.draft.lines[i] : K.card.items[i]; if (!l) break;
        const id = await skPick(dl && l.n ? `Що це: «${l.n}»?` : 'Оберіть продукт', () => true, true); if (!id) break;
        if (id === '__new') { const nw = await skNewIng(l.n || '', l.u || 'кг', 'k'); if (nw) { l.add = nw; l.id = null; } }
        else { l.id = id; delete l.add; const x = S.data.sk.ing.find(y => y.id === id); if (dl) { l.ok = 'ok'; l.f = skAutoF(l); l.chk = 1; } else if (x && l.loss == null && x.loss) l.loss = x.loss; }
        renderMain(); break; }
      case 'skDlCand': { const l = K.draft.lines[+el.dataset.i]; if (!l) break; const id = el.dataset.id; // вибір кандидата одним тапом (запамʼятається в al при записі)
        if (id === '__new') { const nw = await skNewIng(l.p || l.n || '', l.pu || l.u || 'кг', l.bar ? 'b' : 'k'); if (!nw) break; l.add = nw; l.id = null; }
        else { l.id = id; delete l.add; l.f = skAutoF(l); l.chk = 1; /* людина сама обрала — запамʼятати без ❓ */ }
        l.ok = 'ok'; delete l.c; renderMain(); break; }
      case 'skDlDel': K.draft.lines.splice(+el.dataset.i, 1); renderMain(); break;
      case 'skDlAdd': K.draft.lines.push({ id: null, n: '', q: '', f: 1, sum: '' }); renderMain(); break;
      case 'skDraftX': if (await confirmBox('Скасувати накладну?', 'Внесене не збережеться')) { K.draft = null; renderMain(); loadView(); } break;
      case 'skDraftSave': skDraftSave(el.dataset.p); break;
      case 'skInvView': skInvView(el.dataset.id); break;
      case 'skInvPay': { const src = await choose('💸 Оплатити накладну', 'Звідки оплатили? Сума стане витратою в «Касі».', [{ label: '💵 З каси', val: 'cash', cls: 'primary' }, { label: '💳 З картки', val: 'card', cls: 'primary' }]); if (src && await act('skInvPay', { id: el.dataset.id, src }, '💸 Оплачено')) loadView(); break; }
      case 'skInvDel': { const back = !!el.dataset.b; if (!back && !(await confirmBox('Видалити накладну?', 'Товар зникне зі складу, оплата — з витрат. Можна повернути ↩️.'))) break; if (await act('skInvDel', { id: el.dataset.id, back }, back ? '↩️ Повернуто' : '🗑 Видалено')) { S.data.sk = null; loadView(); } break; }
      case 'skFlt': K.flt = el.dataset.fl; renderMain(); break;
      case 'skCard': skCardOpen(el.dataset.k); break;
      case 'skCardSemi': skCardOpen('semi:' + el.dataset.id); break;
      case 'skCardX': K.card = null; renderMain(); loadView(); break;
      case 'skClAdd': K.card.items.push({ id: null, q: 0 }); renderMain(); break;
      case 'skClDel': K.card.items.splice(+el.dataset.i, 1); renderMain(); break;
      case 'skCardSave': skCardSave(false); break;
      case 'skCardDel': if (await confirmBox('Видалити техкарту?', 'Страва перестане списувати продукти')) { if (await act('skCardSave', { key: K.card.key, name: K.card.name, card: null }, '🗑 Видалено')) { K.card = null; loadView(); } } break;
      case 'skCardAi': skCardAi(); break;
      case 'skAiAll': skAiAll(); break;
      case 'skSemiNew': { const x = await skIngEdit(null, { semi: 1, cat: 'Заготовки', u: 'л' }); if (x) skCardOpen('semi:' + x.id); break; }
      case 'skProd': skProduce(el.dataset.id); break;
      case 'skCwh': K.cwh = el.dataset.w; K.cf = {}; S.data.skCount = null; renderMain(); loadView(); break;
      case 'skCntFin': skCntFinish(); break;
      case 'skCntView': { const r = await act('skCountDoc', { id: el.dataset.id }); if (r) skCntShow(r.doc); break; }
      case 'skP': K.p = el.dataset.p; S.data.skRep = null; renderMain(); loadView(); break;
      case 'skTechAll': skTechAll(); break;
      case 'skKStock': { const v = await choose('📦 Склад', '', [{ label: '🗑 Списати продукт', val: 'off', cls: 'primary' }, { label: '📝 Інвентаризація', val: 'cnt' }, { label: '📋 Техкарти', val: 'tech' }]);
        if (v === 'off') { const id = await skPick('🗑 Що списати?'); if (id) skQty('off', id); } else if (v === 'tech') skTechAll(); else if (v === 'cnt') { K.tab = 'count'; K.card = null; S.view = 'calc'; renderNav(); renderMain(); loadView(); } break; }
      case 'skTechOne': skTechOne(el.dataset.n); break;
    }
  });
