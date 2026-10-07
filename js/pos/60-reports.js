  function perRange(p) {
    const now = new Date(Date.now() - (S.cfg?.dayH ?? 3) * 3600e3), day = 864e5, y = now.getFullYear(), mo = now.getMonth(); // робочий день — з 03:00 (як на сервері)
    if (p === 'd') return [iso(now), iso(now)];
    if (p === 'y') return [iso(now - day), iso(now - day)];
    if (p === 'w') return [iso(now - 6 * day), iso(now)];
    if (p === '30') return [iso(now - 29 * day), iso(now)];
    if (p === 'm') return [iso(new Date(y, mo, 1)), iso(now)];
    if (p === 'pm') return [iso(new Date(y, mo - 1, 1)), iso(new Date(y, mo, 0))];
    if (p === 'yr') return [iso(new Date(y, 0, 1)), iso(now)];
    if (p === 'all') return ['2026-09-01', iso(now)]; // з початку роботи системи
    return [S.rep.from || iso(now - 6 * day), S.rep.to || iso(now)];
  }
  let resolver;
  function dishOf(name) { // «Pepsi 0.5 л» → страва меню з категорією і групою
    if (!S.menu) return null;
    if (!resolver || resolver.menu !== S.menu) {
      const all = S.menu.categories.flatMap(c => c.items.map(it => ({ n: it.name.uk, cat: c.id, cname: c.name.uk, grp: (S.groups.find(g => g.cats.includes(c.id)) || {}).id }))).sort((a, b) => b.n.length - a.n.length);
      resolver = { menu: S.menu, memo: new Map(), all };
    }
    if (!resolver.memo.has(name)) resolver.memo.set(name, resolver.all.find(x => name === x.n || name.startsWith(x.n + ' ')) || null);
    return resolver.memo.get(name);
  }
  async function loadReport() {
    const [from, to] = perRange(S.rep.p), key = from + '|' + to, [pf, pt] = prevRange(from, to), cmp = S.rep.p !== 'all';
    if (S.data.rangeKey !== key) { S.data.range = null; S.data.prev = null; S.data.rangeKey = key; renderMain(); }
    const [res, ks, prev] = await Promise.all([api('report', { from, to }).catch(() => null), api('kStats', { from, to }).catch(() => null), cmp ? api('report', { from: pf, to: pt }).catch(() => null) : null]);
    if (S.data.rangeKey !== key) return;
    S.data.kstats = ks?.list || []; S.data.prev = prev && prev.checks.length ? prev : null;
    S.data.range = res || S.data.range || { checks: [], exp: [], z: [] };
  }
  // ---------- 📊 звіти: розділи · порівняння з попереднім періодом · графіки ----------
  const SECS = [['overview', '📈 Огляд', ['overview']], ['sales', '🍽 Продажі', ['dishes', 'cats', 'groups', 'tables', 'days', 'wd']], ['staff', '👥 Персонал', ['waiters', 'tips', 'ctrl', 'kitchen', 'cour']], ['money', '💰 Гроші', ['checks', 'exp', 'mov', 'z']]];
  const TABS = { dishes: '🍽 Страви', cats: '📂 Категорії', groups: '🍳 Кухня/бар', tables: '🪑 Столи', days: '📅 Дні', wd: '🗓 Дні тижня', waiters: '👤 Офіціанти', tips: '💝 Чайові', ctrl: '🕵️ Контроль', kitchen: '⏱ Кухня', cour: '🛵 Кур\'єри', checks: '🧾 Чеки', exp: '💸 Витрати', mov: '🔁 Рух коштів', z: '🔒 Z-звіти' };
  const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'], wdOf = d => (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const hOrd = h => { const n = parseInt(h, 10) || 0; return n < 3 ? n + 24 : n; }; // робочий день — з 03:00: 00–02 год ідуть після 23
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const daysIn = (a, b) => { const out = []; for (let d = a; d <= b && out.length < 4000; d = addDays(d, 1)) out.push(d); return out; };
  const share = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const ACC = ['var(--accent)', 'var(--blue)', 'var(--purple)', 'var(--green)', 'var(--orange)'];
  function prevRange(from, to) { const n = daysIn(from, to).length; return [addDays(from, -n), addDays(from, -1)]; }
  // фільтри звіту → чеки з потрібними стравами (ds) і сумою (val)
  function repChecks(r) {
    const R = S.rep, dishF = R.grp || R.cat || R.q.trim(), q = R.q.trim().toLowerCase();
    const dishOk = n => { if (!dishF) return true; const x = dishOf(n); if (R.grp && x?.grp !== R.grp) return false; if (R.cat && x?.cat !== R.cat) return false; return !q || n.toLowerCase().includes(q); };
    const checks = (r?.checks || []).filter(c => (!R.pay || (R.pay === 'card' ? c.card > 0 : c.cash > 0)) && (!R.by || (c.w || c.by) === R.by || c.by === R.by) && (!R.t || String(c.t) === R.t))
      .map(c => { const ds = c.dishes.filter(([n]) => dishOk(n)); return { ...c, ds, val: dishF ? ds.reduce((a, [, , s]) => a + s, 0) : c.sum - (c.tip || 0) }; }).filter(c => !dishF || c.ds.length);
    return { checks, dishF };
  }
  function repStats(r) {
    if (!r) return null;
    const R = S.rep, { checks, dishF } = repChecks(r), sum = (l, f) => l.reduce((a, x) => a + (f(x) || 0), 0);
    const total = sum(checks, c => c.val), n = checks.length, exp = R.by || R.t || dishF || R.pay ? null : sum(r.exp, e => e.sum);
    const tipOut = sum((r.mov || []).filter(m => m.type === 'tipc' || m.type === 'tipk'), m => m.sum), salOut = sum((r.mov || []).filter(m => m.type === 'salc' || m.type === 'salk'), m => m.sum);
    return { checks, dishF, total, n, avg: n ? total / n : 0, qty: sum(checks, c => sum(c.ds, d => d[1])), cash: sum(checks, c => c.cash), card: sum(checks, c => c.card), disc: sum(checks, c => c.disc), tip: sum(checks, c => c.tip), exp, tipOut, net: exp == null ? null : total - exp - salOut, salOut }; // зарплата — теж витрата // виручка вже без чайових
  }
  const delta = (a, b, inv) => { if (b == null || !isFinite(b) || !b) return ''; const p = Math.round((a - b) / Math.abs(b) * 100); return `<em class="dl ${(inv ? -p : p) > 0 ? 'up' : (inv ? -p : p) < 0 ? 'down' : ''}" title="попередній період: ${money(b)}">${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${Math.abs(p)}%</em>`; };
  // стовпчиковий графік; pts: [підпис, значення, підказка, день для переходу]
  // стовпчики: сума над кожним (коротко: 12,4к), під ним — число й день тижня; вихідні — кольором; наведення / дотик — повний підпис зверху
  const kfmt = v => !v ? '' : v >= 1e5 ? Math.round(v / 1e3) + 'к' : v >= 1e3 ? (Math.round(v / 100) / 10).toString().replace('.', ',') + 'к' : String(Math.round(v));
  const colChart = pts => { const max = Math.max(1, ...pts.map(p => p[1])), n = pts.length, many = n > 16, sum = pts.reduce((a, p) => a + p[1], 0), nz = pts.filter(p => p[1]).length, avg = nz ? sum / nz : 0;
    return `<div class="cread muted">Торкніться стовпчика — сума й день${avg ? ` · середнє ${money(avg)}` : ''}</div><div class="cols${many ? ' many' : ''}" onmouseover="const c=event.target.closest('.c');if(c)this.previousElementSibling.textContent=c.title">${pts.map(([l, v, t, d], i) => { const wd = d ? wdOf(d) : -1, we = wd === 5 || wd === 6;
      return `<div class="c${d ? ' press' : ''}${we ? ' we' : ''}${v === max && v ? ' top' : ''}"${d ? ` data-a="rDay" data-d="${d}"` : ''} title="${esc(t)}"><b class="cv">${kfmt(v)}</b><i style="height:${v ? Math.max(3, v / max * 86) : 0}%"></i><small${many && i % Math.ceil(n / 10) && i !== n - 1 ? ' class="nl"' : ''}>${esc(l)}${d ? `<span>${WD[wd].slice(0, 2)}</span>` : ''}</small></div>`; }).join('')}</div>`; };
  const barRows = (rows, unit, tot, sub) => { const max = Math.max(1, ...rows.map(x => x[1][1]));
    return rows.length ? rows.map(([k, [qq, ss]]) => `<div class="bar"><div class="bl"><span>${esc(k)}</span><span class="muted">${sub ? sub(qq, ss) : `${qq} ${unit}`}</span><span class="muted pct">${share(ss, tot)}%</span><b class="money">${money(ss)}</b></div><i style="width:${Math.max(2, ss / max * 100)}%"></i></div>`).join('') : '<div class="muted">Немає даних за цими фільтрами</div>'; };

  function reportsHTML() {
    const R = S.rep, [from, to] = perRange(R.p), r = S.data.range;
    if (!SECS.some(s => s[2].includes(R.tab))) R.tab = 'overview';
    const sec = SECS.find(s => s[2].includes(R.tab));
    if (R.tab === 'plus') return `<div class="rhead"><div><h1>Звіти</h1><span class="muted">фудкост, прибуток страв, нестачі й списання</span></div></div><div class="seg rsec">${SECS.map(([k, l]) => `<button class="${sec[0] === k ? 'on' : ''}" data-a="rSec" data-s="${k}">${l}</button>`).join('')}</div><div class="sk" style="margin-top:12px">${skRepHTML()}</div>`;
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    const checks0 = r ? r.checks : [];
    const waiters = [...new Set(checks0.flatMap(c => [c.w, c.by]).filter(Boolean))].sort(), tables = [...new Set(checks0.map(c => c.t))].sort((a, b) => a - b);
    const cats = S.menu ? S.menu.categories.filter(c => !R.grp || (S.groups.find(g => g.id === R.grp) || { cats: [] }).cats.includes(c.id)) : [];
    const nF = [R.pay, R.by, R.grp, R.cat, R.t, R.q.trim()].filter(Boolean).length;
    const dm = d => d.split('-').reverse().slice(0, from.slice(0, 4) === to.slice(0, 4) ? 2 : 3).join('.');
    const head = `<div class="rhead"><div><h1>Звіти</h1><span class="muted">${from === to ? dm(from) : dm(from) + ' — ' + dm(to)}${S.data.prev ? ' · порівняння з попередніми ' + daysIn(from, to).length + ' дн.' : ''}</span></div>
      <button class="btn sm ${nF ? 'primary' : ''}" data-a="rFo">⚙️ Фільтри${nF ? ` · ${nF}` : ''}</button></div>
      <div class="chips scroll">${PER.map(([k, l]) => `<button class="chip ${R.p === k ? 'on' : ''}" data-a="rp" data-p="${k}">${l}</button>`).join('')}</div>
      ${R.p === 'c' ? `<div class="frow" style="margin-top:10px"><label>З<input type="date" id="rFrom" value="${from}"></label><label>По<input type="date" id="rTo" value="${to}"></label></div>` : ''}`;
    const filters = R.fo || nF ? `<div class="filters" style="margin-top:10px">${R.fo ? `<div class="frow">
        <label>Оплата<select data-f="pay">${opt('', 'Усі', R.pay)}${opt('cash', '💵 Готівка', R.pay)}${opt('card', '💳 Карта', R.pay)}</select></label>
        <label>Офіціант<select data-f="by">${opt('', 'Усі', R.by)}${waiters.map(w => opt(w, w, R.by)).join('')}</select></label>
        <label>Група<select data-f="grp">${opt('', 'Усе', R.grp)}${S.groups.map(g => opt(g.id, g.name, R.grp)).join('')}</select></label>
        <label>Категорія<select data-f="cat">${opt('', 'Усі', R.cat)}${cats.map(c => opt(c.id, c.name.uk, R.cat)).join('')}</select></label>
        <label>Стіл<select data-f="t">${opt('', 'Усі', R.t)}${tables.map(t => opt(String(t), 'Стіл ' + tn(t), R.t)).join('')}</select></label>
        <label>Страва<input id="rQ" placeholder="🔎 назва" value="${esc(R.q)}"></label></div>` : ''}
        ${nF ? `<div class="chips">${[R.pay && (R.pay === 'card' ? '💳 Карта' : '💵 Готівка'), R.by && '👤 ' + R.by, R.grp && (S.groups.find(g => g.id === R.grp) || {}).name, R.cat && (cats.find(c => c.id === R.cat)?.name.uk || R.cat), R.t && 'Стіл ' + tn(R.t), R.q.trim() && '🔎 ' + R.q.trim()].filter(Boolean).map(x => `<span class="chip on sm">${esc(x)}</span>`).join('')}<button class="chip" data-a="rReset">✕ Скинути</button></div>` : ''}</div>` : '';
    if (!r) return head + filters + '<div class="muted" style="margin:16px 4px">Завантаження…</div>';

    const st = repStats(r), pv = repStats(S.data.prev), { checks, dishF } = st, gross = st.total + st.disc;
    const kpi = (l, v, raw, pr, cls) => `<div class="kpi ${cls || ''}"><span>${l}</span><b class="money">${v}</b>${pv ? delta(raw, pr) : ''}</div>`;
    const kpis = `<div class="kpis">${kpi('Виручка', money(st.total), st.total, pv?.total, 'accent')}${kpi('Чеків', st.n, st.n, pv?.n)}${kpi('Середній чек', st.n ? money(st.avg) : '—', st.avg, pv?.avg)}${st.net != null ? kpi('Чистими', money(st.net), st.net, pv?.net, 'green') : kpi('Продано позицій', st.qty, st.qty, pv?.qty)}</div>`;
    const cp = share(st.cash, st.cash + st.card);
    const pills = `<div class="pills">${!dishF ? `<div class="pill wide"><div class="psplit"><i style="width:${cp}%"></i></div><div class="psplit-l"><span>💵 Готівка <b class="money">${money(st.cash)}</b> <span class="muted">${cp}%</span></span><span>💳 Карта <b class="money">${money(st.card)}</b> <span class="muted">${st.cash + st.card ? Math.round((100 - cp) * 10) / 10 : 0}%</span></span></div></div>
      <div class="pill"><span>🏷 Знижки</span><b class="money">${money(st.disc)}</b><small>${share(st.disc, gross)}% від суми</small></div><div class="pill"><span>💝 Чайові</span><b class="money">${money(st.tip)}</b>${st.tipOut ? `<small>видано ${money(st.tipOut)}</small>` : ''}</div>` : ''}
      ${st.exp != null ? `<div class="pill"><span>💸 Витрати</span><b class="money">${money(st.exp)}</b>${pv?.exp != null ? delta(st.exp, pv.exp, 1) : ''}</div>` : ''}
      <div class="pill"><span>🍽 Позицій</span><b>${st.qty}</b><small>${st.n ? (st.qty / st.n).toFixed(1) : 0} у чеку</small></div>${(() => { // 🛵 канали продажу
        const ch = { hall: [0, 0], pick: [0, 0], del: [0, 0] }; let fee = 0; for (const c of checks || []) { const k = c.go || 'hall'; ch[k][0]++; ch[k][1] += c.sum - (c.tip || 0); fee += c.fee || 0; }
        if (!ch.pick[0] && !ch.del[0]) return '';
        return `<div class="pill wide"><span>Канали продажу</span><div class="psplit-l"><span>🪑 Зал <b class="money">${money(ch.hall[1])}</b> <span class="muted">${ch.hall[0]} чек.</span></span><span>🥡 Самовивіз <b class="money">${money(ch.pick[1])}</b> <span class="muted">${ch.pick[0]} чек.</span></span><span>🛵 Доставка <b class="money">${money(ch.del[1])}</b> <span class="muted">${ch.del[0]} чек.${fee ? ` · за доставку ${money(fee)}` : ''}</span></span></div></div>`; })()}</div>`;
    const nav = `<div class="seg rsec">${SECS.map(([k, l, tabs]) => `<button class="${sec[0] === k ? 'on' : ''}" data-a="rSec" data-s="${k}">${l}</button>`).join('')}</div>` +
      (sec[2].length > 1 ? `<div class="chips scroll sub">${sec[2].map(k => `<button class="chip ${R.tab === k ? 'on' : ''}" data-a="rTab" data-t="${k}">${TABS[k]}</button>`).join('')}</div>` : '');

    // розрізи
    const grpBy = keyF => { const m = new Map(); checks.forEach(c => { const k = keyF(c); const a = m.get(k) || [0, 0]; a[0]++; a[1] += c.val; m.set(k, a); }); return [...m]; };
    const dishAgg = keyF => { const m = new Map(); checks.forEach(c => c.ds.forEach(([nm, qq, ss]) => { const k = keyF(nm); const a = m.get(k) || [0, 0]; a[0] += qq; a[1] += ss; m.set(k, a); })); return [...m]; };
    const grpName = nm => (S.groups.find(g => g.id === dishOf(nm)?.grp) || { name: '🧩 Інше' }).name;
    const days = daysIn(from, to), byDay = new Map(grpBy(c => c.d));
    const waiterOf = c => c.w || c.by || '—';
    const T = R.tab; let body = '';
    if (T === 'cour') return head + nav + courRepHTML();
    if (T === 'overview') {
      // графік виручки: по днях (≤ 62 дні), по місяцях (довше) або по годинах (1 день)
      let chart, ctitle;
      if (days.length === 1) chart = '';
      else if (days.length <= 62) { ctitle = '📅 Виручка по днях'; chart = colChart(days.map(d => { const v = byDay.get(d) || [0, 0]; return [d.slice(8), v[1], `${WD[wdOf(d)]} ${dm(d)} · ${money(v[1])} · ${v[0]} чек.`, d]; })); }
      else { ctitle = '📅 Виручка по місяцях'; const m = new Map(); checks.forEach(c => { const k = c.d.slice(0, 7); m.set(k, (m.get(k) || 0) + c.val); }); const ms = [...new Set(days.map(d => d.slice(0, 7)))];
        chart = colChart(ms.map(k => [k.slice(5) + '.' + k.slice(2, 4), m.get(k) || 0, `${k} · ${money(m.get(k) || 0)}`])); }
      const heat = '';
      // частки кухня / бар / кальян
      const grps = dishAgg(grpName).sort((a, b) => b[1][1] - a[1][1]), gt = grps.reduce((a, x) => a + x[1][1], 0);
      const grpCard = `<div class="card"><h3>🍳 Що продаємо</h3>${grps.length ? `<div class="stack">${grps.map(([k, [, s]], i) => `<i style="width:${share(s, gt)}%;background:${ACC[i % 5]}" title="${esc(k)} ${share(s, gt)}%"></i>`).join('')}</div>
        ${grps.map(([k, [q, s]], i) => `<div class="kv"><span><i class="dot" style="background:${ACC[i % 5]}"></i>${esc(k)} <span class="muted">· ${q} шт</span></span><span><b class="money">${money(s)}</b> <span class="muted">${share(s, gt)}%</span></span></div>`).join('')}` : '<div class="muted">Немає продажів</div>'}</div>`;
      // офіціанти
      const ws = grpBy(waiterOf).sort((a, b) => b[1][1] - a[1][1]).slice(0, 6), wmax = Math.max(1, ...ws.map(x => x[1][1]));
      const wCard = `<div class="card"><h3>👤 Офіціанти</h3>${ws.length ? ws.map(([k, [q, s]], i) => `<div class="bar"><div class="bl"><span>${['🥇', '🥈', '🥉'][i] || ''} ${esc(k)}<br><small class="muted">${q} чек. · сер. чек ${money(s / q)}</small></span><b class="money">${money(s)}</b></div><i style="width:${Math.max(2, s / wmax * 100)}%"></i></div>`).join('') : '<div class="muted">Немає даних</div>'}</div>`;
      // висновки
      const best = [...byDay].sort((a, b) => b[1][1] - a[1][1])[0], bt = grpBy(c => c.t).sort((a, b) => b[1][1] - a[1][1])[0];
      const vs = (r.voids || []).filter(v => !v.table), vsum = vs.reduce((a, v) => a + v.sum, 0), ks = S.data.kstats || [];
      const ins = [best && days.length > 1 && ['🏆 Найкращий день', `${WD[wdOf(best[0])]} ${dm(best[0])}`, money(best[1][1])],
        bt && ['🪑 Найприбутковіший стіл', `Стіл ${tn(bt[0])} · ${bt[1][0]} чек.`, money(bt[1][1])], days.length > 1 && ['📊 В середньому за день', `${(st.n / days.length).toFixed(1)} чек.`, money(st.total / days.length)],
        ['🚫 Скасування', `${vs.length} поз. · ${share(vsum, st.total + vsum)}% продажів`, money(vsum)], ks.length && ['⏱ Кухня, сер. час', `${ks.length} замовл. · понад 15 хв: ${ks.filter(x => x.mins > 15).length}`, Math.round(ks.reduce((a, x) => a + x.mins, 0) / ks.length) + ' хв']].filter(Boolean);
      const insCard = `<div class="card"><h3>💡 Висновки</h3>${ins.map(([l, s, v]) => `<div class="kv"><span>${l}<br><small class="muted">${esc(s)}</small></span><b class="money">${v}</b></div>`).join('')}</div>`;
      const top = dishAgg(nm => nm).sort((x, y) => y[1][0] - x[1][0] || y[1][1] - x[1][1]).slice(0, 10), tmax = Math.max(1, ...top.map(x => x[1][0]));
      const topCard = `<div class="card"><h3>🏆 Топ страв</h3>${top.length ? top.map(([k, [qq, ss]], i) => `<div class="bar"><div class="bl"><span>${['🥇', '🥈', '🥉'][i] || `<span class="muted">${i + 1}.</span>`} ${esc(k)}</span><b>${qq} шт</b><span class="muted money">${money(ss)}</span></div><i style="width:${Math.max(2, qq / tmax * 100)}%"></i></div>`).join('') : '<div class="muted">Ще немає продажів за цей період</div>'}</div>`;
      return head + filters + kpis + pills + nav + `<div class="dash">${chart ? `<div class="card wide"><h3>${ctitle}${days.length > 1 && days.length <= 62 ? ' <span class="muted">· натисніть день — відкриється звіт за нього</span>' : ''}</h3>${chart}</div>` : ''}${heat}${insCard}${grpCard}${topCard}${wCard}</div>`;
    }
    let rows, unit = 'чек.', sortable = false, sub;
    if (T === 'dishes') { rows = dishAgg(nm => nm); unit = 'шт'; sortable = true; }
    else if (T === 'cats') { rows = dishAgg(nm => dishOf(nm)?.cname || 'Інше'); unit = 'шт'; sortable = true; }
    else if (T === 'groups') { rows = dishAgg(grpName); unit = 'шт'; }
    else if (T === 'waiters') { rows = grpBy(waiterOf); sub = (q, s) => `${q} чек. · сер. ${money(s / q)}`; }
    else if (T === 'tips') { const m = new Map(); checks.forEach(c => Object.entries(c.tipSplit || (c.tip ? { [c.by || '—']: c.tip } : {})).forEach(([n, v]) => { const a = m.get(n) || [0, 0]; a[0]++; a[1] += v; m.set(n, a); })); rows = [...m].filter(x => x[1][1] > 0); }
    else if (T === 'days') { rows = [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [`${WD[wdOf(d)]} ${dm(d)}`, v]); }
    else if (T === 'wd') { const cnt = Array(7).fill(0); days.forEach(d => cnt[wdOf(d)]++); const m = grpBy(c => wdOf(c.d)); rows = WD.map((w, i) => [w, (m.find(x => x[0] === i) || [0, [0, 0]])[1]]).filter(x => cnt[WD.indexOf(x[0])]); sub = (q, s) => { return `${q} чек.`; };
      body = `<div class="muted" style="margin-bottom:8px">Середня виручка за один такий день — у дужках</div>`; const cntOf = w => cnt[WD.indexOf(w)]; rows = rows.map(([w, v]) => [`${w} (сер. ${money(v[1] / cntOf(w))})`, v]); }
    else if (T === 'tables') rows = grpBy(c => 'Стіл ' + tn(c.t)).sort((a, b) => parseInt(a[0].slice(5)) - parseInt(b[0].slice(5)));
    if (rows) {
      if (!['hours', 'days', 'tables', 'wd'].includes(T)) rows.sort((a, b) => R.sort === 'q' && sortable ? b[1][0] - a[1][0] : b[1][1] - a[1][1]);
      const tot = rows.reduce((a, x) => a + x[1][1], 0);
      body += barRows(rows, unit, tot, sub);
      if (sortable) body = `<div class="chips" style="margin-bottom:10px"><button class="chip ${R.sort !== 'q' ? 'on' : ''}" data-a="rSort" data-s="s">За сумою</button><button class="chip ${R.sort === 'q' ? 'on' : ''}" data-a="rSort" data-s="q">За кількістю</button></div>` + body;
    } else if (['checks', 'exp', 'mov', 'z'].includes(T)) {
      // 💰 Гроші: кожен запис можна видалити (🗑) і повернути (↩️) — за будь-який день
      const xb = (kind, x, back) => `<button class="xb${back ? ' back' : ''}" data-a="${back ? 'rBack' : 'rDel'}" data-k="${kind}" data-d="${x.d}" data-i="${kind === 'checks' ? esc(x.id || '') : x.i}" title="${back ? 'Повернути' : 'Видалити'}">${back ? '↩️' : '🗑'}</button>`;
      const line = (kind, x, l, v, back) => `<div class="kv rrow${back ? ' del' : ''}"><span>${l}</span><span class="kv-r"><b class="money">${v}</b>${kind === 'checks' && !back && x.id && isAdmin() ? `<button class="xb" data-a="cEdit" data-ref="${esc(x.id)}" data-d="${x.d}" title="Відкрити й редагувати">✏️</button>` : ''}${kind !== 'checks' || x.id ? xb(kind, x, back) : ''}</span></div>`;
      const dd = d => d.slice(8) + '.' + d.slice(5, 7);
      let act = [], gone = [], empty = '';
      if (T === 'checks') { act = [...checks].reverse().slice(0, 300).map(c => line('checks', c, `${dd(c.d)} ${c.at} · стіл ${tn(c.t)} · ${esc(waiterOf(c))} ${c.card ? '💳' : '💵'}${c.disc ? ' 🏷' : ''}${c.tip ? ` · 💝 ${money(c.tip)}` : ''}<br><small class="muted">${c.ds.map(([nm, qq]) => `${qq}× ${esc(nm)}`).join(', ')}</small>`, money(c.val)));
        gone = (r.removed || []).filter(x => !x.reopen).map(x => line('checks', x, `${dd(x.d)} ${x.at} · стіл ${tn(x.t)} · ${esc(x.by)} <span class="muted">· знято з виручки</span>`, money(x.sum), 1)); empty = 'Немає чеків'; }
      if (T === 'exp') { act = [...r.exp].reverse().map(e => line('exp', e, `${dd(e.d)} ${e.at} ${e.src === 'card' ? '💳' : '💵'} ${esc(e.note || 'Витрата')} <span class="muted">${esc(e.by)}</span>`, money(e.sum)));
        gone = (r.expDel || []).map(e => line('exp', e, `${dd(e.d)} ${e.at} ${esc(e.note || 'Витрата')}`, money(e.sum), 1)); empty = 'Витрат немає'; }
      if (T === 'mov') { act = [...(r.mov || [])].reverse().map(m => line('mov', m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || '')} <span class="muted">${esc(m.by || '')}</span>`, money(m.sum)));
        gone = (r.movDel || []).map(m => line('mov', m, `${dd(m.d)} ${m.at} ${MOVE[m.type] || m.type} ${esc(m.note || '')}`, money(m.sum), 1)); empty = 'Руху коштів немає'; }
      if (T === 'z') { const zl = z => `${dd(z.d)} ${new Date(z.closed).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })} · ${z.checks} чек. · ${esc(z.closedBy || '')}${z.diff ? ` · <b style="color:var(--red)">різниця ${z.diff > 0 ? '+' : ''}${money(z.diff)}</b>` : ''}`;
        act = [...r.z].reverse().map(z => line('z', z, zl(z), money(z.total))); gone = (r.zDel || []).map(z => line('z', z, zl(z), money(z.total), 1)); empty = 'Z-звітів за період немає'; }
      body = (act.join('') || `<div class="muted">${empty}</div>`) + (gone.length ? `<h3 style="margin:18px 0 8px">🗑 Видалені <span class="muted">· ${gone.length} · ↩️ — повернути</span></h3>${gone.join('')}` : '');
    }
    else if (T === 'kitchen') { // ⏱ час від замовлення до «готово»
      const L = (S.data.kstats || []).filter(x => !R.t || String(x.t) === R.t), avg = l => l.length ? l.reduce((a, x) => a + x.mins, 0) / l.length : 0, f = m => m ? `${Math.round(m)} хв` : '—';
      const byD = new Map(); L.forEach(x => x.items.forEach(([n]) => { const a = byD.get(n) || []; a.push(x.mins); byD.set(n, a); }));
      const byH = new Map(); L.forEach(x => { const h = String(x.at).slice(0, 2) + ':00'; const a = byH.get(h) || []; a.push(x.mins); byH.set(h, a); });
      const row = (k, a) => `<div class="kv"><span>${esc(k)} <span class="muted">· ${a.length}</span></span><b>${f(a.reduce((s, m) => s + m, 0) / a.length)}</b></div>`;
      body = L.length ? `<div class="kpis"><div class="kpi"><span>Замовлень кухні</span><b>${L.length}</b></div><div class="kpi accent"><span>Середній час</span><b>${f(avg(L))}</b></div><div class="kpi"><span>Найдовше</span><b>${f(Math.max(...L.map(x => x.mins)))}</b></div><div class="kpi ${L.filter(x => x.mins > 15).length ? 'red' : 'green'}"><span>Понад 15 хв</span><b>${L.filter(x => x.mins > 15).length}</b></div></div>
        <h3 style="margin:16px 0 8px">По стравах (сер. час)</h3>${[...byD].sort((a, b) => b[1].length - a[1].length).slice(0, 40).map(([k, a]) => row(k, a)).join('')}
        <h3 style="margin:16px 0 8px">По годинах</h3>${[...byH].sort((a, b) => hOrd(a[0]) - hOrd(b[0])).map(([k, a]) => row(k, a)).join('')}` : '<div class="muted">Ще немає готових замовлень з кухонного екрана</div>';
    }
    else if (T === 'ctrl') { // 🕵️ контроль по офіціантах
      const vs = (r.voids || []).filter(v => (!R.by || v.by === R.by) && (!R.t || String(v.t) === R.t)), W = {};
      const w = nm => W[nm || '—'] = W[nm || '—'] || { name: nm || '—', n: 0, s: 0, vN: 0, vS: 0, tN: 0, tS: 0, dN: 0, dS: 0, dMax: 0, tip: 0 };
      checks.forEach(c => { const x = w(c.by); x.n++; x.s += c.sum; if (c.disc) { x.dN++; x.dS += c.disc; x.dMax = Math.max(x.dMax, c.pct || 0); } const tn = waiterOf(c), tv = (c.tipSplit || {})[tn] ?? (c.tipSplit ? 0 : c.tip || 0); if (tv) w(tn).tip += tv; });
      vs.forEach(v => { const x = w(v.by); if (v.table) { x.tN++; x.tS += v.sum; } else { x.vN++; x.vS += v.sum; } });
      const ws = Object.values(W).sort((a, b) => b.vS + b.dS + b.tS - a.vS - a.dS - a.tS);
      const rm = (r.removed || []).filter(x => !R.t || String(x.t) === R.t);
      body = (ws.length ? `<div class="ctrl">${ws.map(x => { const pct = x.s + x.vS ? Math.round(x.vS / (x.s + x.vS) * 1000) / 10 : 0, bad = pct >= 5 || x.dMax > 20 || x.tN;
        return `<div class="ctrl-w ${bad ? 'bad' : ''}"><div class="ctrl-h"><b>👤 ${esc(x.name)}</b><span class="muted">${x.n} чек. · ${money(x.s)}</span></div>
          <div class="ctrl-g"><span>🚫 Скасування<b>${x.vN} · ${money(x.vS)}</b><small>${pct}% від продажів</small></span><span>🗑 Видалені столи<b>${x.tN} · ${money(x.tS)}</b></span>
          <span>🏷 Знижки<b>${x.dN} · ${money(x.dS)}</b><small>${x.dMax ? 'макс ' + x.dMax + '%' : '—'}</small></span><span>💝 Чайові<b>${money(x.tip)}</b></span></div></div>`; }).join('')}</div>` : '<div class="muted">Немає даних</div>') +
        `<h3 style="margin:18px 0 8px">🚫 Журнал скасувань</h3>` + (vs.length ? [...vs].reverse().slice(0, 300).map(v => `<div class="kv"><span>${v.d.slice(5)} ${v.at} · стіл ${tn(v.t)} · <b>${esc(v.by)}</b> · ${esc(v.name)}<br><small class="muted">❓ ${esc(v.reason)}</small></span><b class="money" style="color:var(--red)">−${money(v.sum)}</b></div>`).join('') : '<div class="muted">Скасувань немає 👍</div>') +
        (rm.length ? `<h3 style="margin:18px 0 8px">🧹 Видалені з виручки</h3>` + rm.map(x => `<div class="kv"><span>${x.d.slice(5)} ${x.at} · стіл ${tn(x.t)} · ${esc(x.by)}</span><b class="money">${money(x.sum)}</b></div>`).join('') : '');
    }
    return head + filters + kpis + pills + nav + `<div class="card">${body}</div>`;
  }
