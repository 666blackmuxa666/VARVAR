// 🗺 Кабінет → «План» (лише платформа): компас «де ми», ⭐ першим, дошка команди, план (горизонт → гілка → задача → підзадача),
// 🐞 помилки, ⏸ чекає власника, 📝 чернетка зі скрінами, 🗑 виконане. Сервер: owner.js (plan / planSet / planImg) + worker/src/plan.js.
// Запити: 1 при відкритті вкладки, 1 на кожну дію. Команда читає той самий KV через tools/plan.mjs.
window.OWNPLAN = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ls = { get(k, d) { try { const v = localStorage.getItem('plan_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('plan_' + k, JSON.stringify(v)); } catch {} } };
  const HZ = { 1: 'Горизонт 1 — доробляємо почате', 2: 'Горизонт 2 — 10 закладів: гість платить сам, зарплата', 3: 'Горизонт 3 — 100 закладів і мережі' };
  const ZN = { plan: '🗺 План', team: '👥 Команда', bug: '🐞 Помилка', wait: '⏸ Чекає тебе' };
  const ROLES = ['👑 Начальник', '🛠 Розробник-1', '🛠 Розробник-2', '🧪 Тестувальник', '🔐 Безпека', '💡 Ідеї', '🎓 Навчання', '📣 Маркетолог', 'власник'];
  let C, D = null, Z = ls.get('z', 'plan'), busy = false, open = ls.get('open', {}), seen = ls.get('seen', 0), seenNow = 0;
  const dt = t => new Date(t).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
  const load = async () => { if (busy) return; busy = true; try { D = (await C.api('plan')).d; } catch (e) { C.toast('⚠️ ' + e.message); } busy = false; if (D) { seenNow = seen; seen = Date.now(); ls.set('seen', seen); } C.render(); };
  const save = async ops => { try { const r = await C.api('planSet', { ops }); D = r.d; const er = (r.out || []).find(x => x.error); if (er) C.toast('⚠️ ' + er.error); C.render(); return r.out || []; } catch (e) { C.toast('⚠️ ' + e.message); return []; } };
  const kids = id => D.items.filter(x => x.parent === id);
  const all = id => { const r = []; const go = p => kids(p).forEach(x => { r.push(x); go(x.id); }); go(id); return r; };
  const live = () => D.items.filter(x => !x.done);

  // ✅ ⭐ два квадратики + назва, «навіщо», бейджі; клік по назві — модалка
  function row(x, sub) {
    const k = kids(x.id), kd = k.filter(y => y.done).length;
    const st = x.done ? 'done' : x.zone === 'bug' ? 'bug' : x.take ? 'work' : x.star ? 'star' : '';
    return `<div class="pl-r ${sub ? 'sub' : ''} ${st}"><button class="pl-cb d ${x.done ? 'on' : ''}" data-pl="done" data-id="${x.id}" title="Виконано → у кошик">${x.done ? '✓' : ''}</button>${x.done ? '' : `<button class="pl-cb s ${x.star ? 'on' : ''}" data-pl="star" data-id="${x.id}" title="Першим на «старт»">${x.star ? '★' : '☆'}</button>`}
      <div class="pl-t" data-pl="edit" data-id="${x.id}"><b>${esc(x.t)}</b>${x.why ? `<div class="muted">${esc(x.why)}</div>` : ''}${x.done && x.res ? `<div class="muted">✅ ${esc(x.res)}</div>` : ''}</div>
      <div class="pl-bd">${x.take ? `<span class="pl-tg work">⚙️ ${esc(x.take)}</span>` : x.role ? `<span class="pl-tg">${esc(x.role)}</span>` : ''}${x.imgs?.length ? `<span class="pl-tg">📎${x.imgs.length}</span>` : ''}${k.length ? `<span class="pl-tg">${kd}/${k.length}</span>` : ''}${x.done ? `<span class="pl-tg">${dt(x.done)}</span>` : ''}</div></div>`;
  }
  const tree = (x, lvl = 0) => row(x, lvl) + kids(x.id).filter(y => !y.done).map(y => tree(y, lvl + 1)).join('');
  const bar = (d, a) => `<div class="pl-bar"><i style="width:${a ? Math.round(d / a * 100) : 0}%"></i></div>`;

  function compass() {
    const P = D.items.filter(x => x.zone === 'plan' && (x.hz || 1) === 1), roots = P.filter(x => !x.parent), sub = roots.flatMap(r => all(r.id));
    const a = sub.length, d = sub.filter(x => x.done).length, L = live();
    const nw = seenNow ? D.items.filter(x => (x.done && x.done > seenNow) || x.at > seenNow) : [], nd = D.draft.filter(x => !x.parsed).length;
    return `<div class="card pl-cmp"><div class="muted" style="font-size:12px">🧭 Де ми зараз</div><h3 style="margin:2px 0 8px">${HZ[1]}</h3>
      <div style="display:flex;gap:10px;align-items:center">${bar(d, a)}<b style="white-space:nowrap">${d} з ${a}</b></div>
      <div class="pl-k"><button data-pl="z" data-v="star"><b>${L.filter(x => x.star).length}</b><span>⭐ першим</span></button><button data-pl="z" data-v="team"><b>${L.filter(x => x.take).length}</b><span>⚙️ команда робить</span></button><button data-pl="z" data-v="draft"><b>${nd}</b><span>📝 нерозібрано</span></button></div>
      ${nw.length ? `<div class="pl-new">🆕 З минулого візиту: ${nw.filter(x => x.done && x.done > seenNow).length} виконано · ${nw.filter(x => x.at > seenNow).length} нових</div>` : ''}</div>`;
  }
  function waitBox() { const W = live().filter(x => x.zone === 'wait'); return W.length && Z !== 'wait' ? `<div class="card pl-wait"><h3>⏸ Чекає тебе (${W.length})</h3>${W.slice(0, 3).map(x => row(x)).join('')}${W.length > 3 ? `<button class="btn sm ghost" data-pl="z" data-v="wait">усі →</button>` : ''}</div>` : ''; }

  function body() {
    const L = live();
    if (Z === 'star') { const S = L.filter(x => x.star).sort((a, b) => a.star - b.star);
      return `<div class="muted pl-hint">На «старт» команда бере ці задачі першими, згори вниз. ↑↓ — змінити черговість.</div>${S.map((x, i) => `<div class="pl-sr"><span class="pl-n">${i + 1}</span>${row(x)}<span class="pl-mv"><button data-pl="up" data-id="${x.id}" ${i ? '' : 'disabled'}>↑</button><button data-pl="dn" data-id="${x.id}" ${i < S.length - 1 ? '' : 'disabled'}>↓</button></span></div>`).join('') || '<div class="muted">Нічого не позначено ⭐ — натисни ☆ біля задачі в Плані чи на Дошці.</div>'}`; }
    if (Z === 'plan') return [1, 2, 3].map(h => { const R = D.items.filter(x => x.zone === 'plan' && !x.parent && (x.hz || 1) === h && !x.done), hOpen = open['h' + h] ?? h === 1;
      return `<div class="pl-hz ${h > 1 ? 'far' : ''}"><div class="pl-hh" data-pl="tog" data-v="h${h}">${hOpen ? '▾' : '▸'} <b>${HZ[h]}</b> <span class="muted">· гілок: ${R.length}</span></div>${hOpen ? R.sort((a, b) => (a.ord || 0) - (b.ord || 0)).map(r => { const s = all(r.id), d = s.filter(x => x.done).length, o = open[r.id] ?? false;
        return `<div class="card pl-br"><div class="pl-bh"><span data-pl="tog" data-v="${r.id}" style="cursor:pointer">${o ? '▾' : '▸'}</span><button class="pl-cb s ${r.star ? 'on' : ''}" data-pl="star" data-id="${r.id}">${r.star ? '★' : '☆'}</button><b data-pl="edit" data-id="${r.id}" style="flex:2;cursor:pointer">${esc(r.t)}</b>${bar(d, s.length)}<span class="muted" style="white-space:nowrap">${d}/${s.length}</span></div>
          ${r.why && o ? `<div class="muted" style="font-size:13px;margin:-4px 0 6px 30px">${esc(r.why)}</div>` : ''}${o ? kids(r.id).filter(x => !x.done).map(x => tree(x, 0)).join('') + `<button class="btn sm ghost" data-pl="add" data-p="${r.id}">➕ задача</button>` : ''}</div>`; }).join('') + `<button class="btn sm" data-pl="add" data-z="plan" data-h="${h}">➕ Гілка</button>` : ''}</div>`; }).join('');
    if (Z === 'draft') return `<div class="card"><h3>📝 Чернетка</h3><div class="muted" style="font-size:13px">Пиши як думаєш, додавай скріни. Потім скажи в чаті «розбери чернетку» — розкладу на гілки плану, задачі чи помилки.</div>
        <textarea id="plDr" rows="5" class="pl-ta" placeholder="Напр.: на кухні не видно коментар до страви, скрін додаю">${esc(ls.get('dr', ''))}</textarea><div id="plDi" class="pl-im">${(ls.get('dri', [])).map(u => `<img src="${esc(u)}">`).join('')}</div>
        <div class="btnrow"><button class="btn sm" data-pl="img" data-v="draft">📎 Скрін</button><button class="btn sm primary" data-pl="drAdd">💾 Зберегти накидку</button></div></div>
      ${D.draft.map(x => `<div class="card pl-dr ${x.parsed ? 'done' : ''}"><div class="muted" style="font-size:12px">${dt(x.at)}${x.parsed ? ' · ✅ розібрано → ' + esc(x.parsed) : ' · ⏳ ще не розібрано'}</div><div style="white-space:pre-wrap">${esc(x.text)}</div>${x.imgs?.length ? `<div class="pl-im">${x.imgs.map(u => `<a href="${esc(u)}" target="_blank"><img src="${esc(u)}"></a>`).join('')}</div>` : ''}<button class="btn sm ghost" data-pl="drDel" data-id="${x.id}">🗑</button></div>`).join('')}`;
    if (Z === 'done') { const X = D.items.filter(x => x.done).sort((a, b) => b.done - a.done); return `<div class="muted pl-hint">Виконане — ${X.length}. Натисни ✓, щоб повернути в роботу.</div>${X.slice(0, 150).map(x => `${row(x)}`).join('') || '<div class="muted">Поки порожньо</div>'}`; }
    const Q = L.filter(x => x.zone === Z && !(x.parent && D.items.find(p => p.id === x.parent && p.zone === Z && !p.done)));
    return `${Z === 'team' ? '<div class="muted pl-hint">Дошка команди: ⚙️ — хтось уже робить. Сортування: ⭐, потім у роботі, потім решта.</div>' : ''}${Q.sort((a, b) => (b.star ? 1e9 - b.star : 0) - (a.star ? 1e9 - a.star : 0) || !!b.take - !!a.take || a.at - b.at).map(x => tree(x)).join('') || '<div class="muted">Порожньо</div>'}<button class="btn sm" data-pl="add" data-z="${Z}">➕ Додати</button>`;
  }

  function view(ctx) {
    C = ctx; if (!D) { load(); return '<div class="muted">…</div>'; }
    const L = live(), n = z => L.filter(x => x.zone === z).length;
    const ch = [['star', `⭐ Першим ${L.filter(x => x.star).length}`], ['team', `👥 Команда ${n('team')}`], ['plan', '🗺 План'], ['bug', `🐞 Помилки ${n('bug')}`], ['wait', `⏸ Чекає тебе ${n('wait')}`], ['draft', `📝 Чернетка ${D.draft.filter(x => !x.parsed).length}`], ['done', '🗑 Виконане']];
    return `<h2>🗺 План</h2>${compass()}${waitBox()}<div class="chips pl-ch">${ch.map(([k, l]) => `<button class="${Z === k ? 'on' : ''}" data-pl="z" data-v="${k}">${l}</button>`).join('')}</div><div class="pl-body">${body()}</div>`;
  }

  // 📎 скрін: зменшити до 1600 px, JPEG — і на сервер (img:plan-*)
  const pickImg = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => { const f = i.files[0]; if (!f) return res(null);
    const im = new Image(), u = URL.createObjectURL(f); im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', .8)); }; im.onerror = () => res(null); im.src = u; }; i.click(); });
  const upImg = async p => { const data = await p; if (!data) return null; C.toast('📎 Завантажую…'); try { return (await C.api('planImg', { data })).url; } catch (e) { C.toast('⚠️ ' + e.message); return null; } };

  function edit(x, def = {}) {
    const v = x || def, P = D.items.filter(y => !y.done && y.id !== v.id && !(x && all(x.id).some(z => z.id === y.id)));
    let im = [...(v.imgs || [])];
    const bg = C.modal(x ? '✏️ Задача' : '➕ Нова задача', `<input name="t" placeholder="Що зробити" value="${esc(v.t)}" required>
      <input name="why" placeholder="Навіщо — одним реченням, простими словами" value="${esc(v.why)}">
      <label>Зона<select name="zone">${Object.entries(ZN).map(([k, l]) => `<option value="${k}" ${(v.zone || 'plan') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Всередині (батьківська гілка/задача)<select name="parent"><option value="">— верхній рівень —</option>${P.map(y => `<option value="${y.id}" ${v.parent === y.id ? 'selected' : ''}>${esc(ZN[y.zone].split(' ')[0] + ' ' + y.t).slice(0, 70)}</option>`).join('')}</select></label>
      <label>Горизонт (для гілок плану)<select name="hz">${[1, 2, 3].map(h => `<option value="${h}" ${(v.hz || 1) === h ? 'selected' : ''}>${HZ[h]}</option>`).join('')}</select></label>
      <label>Для кого<input name="role" list="plRoles" value="${esc(v.role)}"><datalist id="plRoles">${ROLES.map(r => `<option value="${r}">`).join('')}</datalist></label>
      <textarea name="note" rows="4" class="pl-ta" placeholder="Деталі, пояснення, технічне">${esc(v.note)}</textarea>
      <div class="pl-im" id="plMi">${im.map(u => `<a href="${esc(u)}" target="_blank"><img src="${esc(u)}"></a>`).join('')}</div>
      <div class="btnrow"><button type="button" class="btn sm" id="plMa">📎 Скрін</button>${x ? `<button type="button" class="btn sm" id="plMs">➕ Підзадача</button>${x.take ? '<button type="button" class="btn sm" id="plMf">🔓 Зняти «в роботі»</button>' : ''}<button type="button" class="btn sm red" id="plMd">🗑</button>` : ''}</div>
      ${x ? `<div class="muted" style="font-size:12px">${esc(x.by || '')} · ${dt(x.at)}${x.take ? ' · ⚙️ ' + esc(x.take) : ''}</div>` : ''}`,
      async f => { const fl = { t: f.t.value, why: f.why.value, zone: f.zone.value, parent: f.parent.value, hz: +f.hz.value, role: f.role.value, note: f.note.value, imgs: im };
        const o = await save([x ? { o: 'set', id: x.id, f: fl } : { o: 'add', f: { ...fl, star: def.star || 0 } }]); if (o[0]?.error) throw new Error(o[0].error); });
    bg.querySelector('#plMa').onclick = async () => { const u = await upImg(pickImg()); if (u) { im.push(u); bg.querySelector('#plMi').insertAdjacentHTML('beforeend', `<img src="${esc(u)}">`); } };
    if (x) { bg.querySelector('#plMs').onclick = () => { bg.remove(); edit(null, { parent: x.id, zone: x.zone, role: x.role }); };
      bg.querySelector('#plMd').onclick = async () => { const n = all(x.id).length; if (!confirm(`Видалити «${x.t}»${n ? ` і ${n} підзадач` : ''}? (Краще ✓ — тоді лишиться в кошику)`)) return; bg.remove(); await save([{ o: 'del', id: x.id }]); };
      const fr = bg.querySelector('#plMf'); if (fr) fr.onclick = async () => { bg.remove(); await save([{ o: 'set', id: x.id, f: { take: '' } }]); }; }
  }

  document.addEventListener('input', e => { if (e.target.id === 'plDr') ls.set('dr', e.target.value); });
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-pl]'); if (!el || !C || !D) return; const a = el.dataset.pl, d = el.dataset, x = D.items.find(y => y.id === d.id);
    if (a === 'z') { Z = d.v; ls.set('z', Z); return C.render(); }
    if (a === 'tog') { open[d.v] = !(open[d.v] ?? d.v === 'h1'); ls.set('open', open); return C.render(); }
    if (a === 'done' && x) { if (!x.done) { const n = all(x.id).filter(y => !y.done).length; if (n && !confirm(`У задачі ще ${n} невиконаних підзадач. Все одно позначити виконаною?`)) return; } return save([{ o: 'set', id: x.id, f: { done: x.done ? 0 : 1 } }]); }
    if (a === 'star' && x) return save([{ o: 'set', id: x.id, f: { star: x.star ? 0 : 1 } }]);
    if ((a === 'up' || a === 'dn') && x) { const S = live().filter(y => y.star).sort((p, q) => p.star - q.star).map(y => y.id), i = S.indexOf(x.id), j = a === 'up' ? i - 1 : i + 1; [S[i], S[j]] = [S[j], S[i]]; return save([{ o: 'stars', ids: S }]); }
    if (a === 'edit' && x) return edit(x);
    if (a === 'add') { const p = d.p && D.items.find(y => y.id === d.p); return edit(null, p ? { parent: p.id, zone: p.zone, hz: p.hz } : { zone: d.z || 'plan', hz: +d.h || 1, star: Z === 'star' ? 1 : 0 }); }
    if (a === 'img') { const u = await upImg(pickImg()); if (u) { const l = [...ls.get('dri', []), u]; ls.set('dri', l); C.render(); } return; }
    if (a === 'drAdd') { const t = document.getElementById('plDr')?.value || '', im = ls.get('dri', []); if (!t.trim() && !im.length) return C.toast('Напиши щось або додай скрін');
      const o = await save([{ o: 'draft', text: t, imgs: im }]); if (o[0]?.id) { ls.set('dr', ''); ls.set('dri', []); C.toast('💾 Накидку збережено'); C.render(); } return; }
    if (a === 'drDel') { if (confirm('Видалити накидку?')) save([{ o: 'draftDel', id: d.id }]); return; }
  });
  return { view, reset: () => { D = null; } };
})();
