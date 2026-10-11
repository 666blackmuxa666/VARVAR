// 🎨 Кабінет → 🚀 Продажі → «Конструктор сайту ATOM» (posatom.online): кольори (теми, генератор, кожен колір окремо,
// перевірка контрасту), шрифти, заокруглення й відступи, ефекти, порядок і показ блоків, тексти, версії.
// Живий перегляд — iframe сайту з ?preview=1 (чернетка через postMessage). Сервер: owner.js atomDesign → KV atom:design.
window.ATOMSB = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = x => JSON.parse(JSON.stringify(x ?? {}));
  const SITE = location.hostname === 'posatom.online' ? '/' : 'https://posatom.online/';
  // 13 кольорів теми: [ключ, підпис, стандарт]
  const TOK = [['bg', 'Фон', '#0f0b1a'], ['bg2', 'Фон 2 (поля, підкладки)', '#160f26'], ['card', 'Картки', '#1b1330'], ['card2', 'Картки 2 (плитки, шапка таблиці)', '#241a3d'], ['line', 'Рамки', '#2e2350'],
    ['text', 'Текст', '#f3eefc'], ['muted', 'Другорядний текст', '#a99cc6'], ['gold', 'Акцент (кнопки)', '#f2c14e'], ['gold2', 'Акцент світлий (цифри)', '#ffdf8a'], ['ink', 'Текст на кнопках', '#1a1205'],
    ['vio', 'Другий колір (сяйво, рамки)', '#8b5cf6'], ['vio2', 'Другий світлий (підписи)', '#b794ff'], ['ok', 'Успіх (✓, економія)', '#4ade80']];
  const DEF = Object.fromEntries(TOK.map(([k, , v]) => [k, v]));
  // готові теми: bg, bg2, card, card2, line, text, muted, gold, gold2, ink, vio, vio2, ok
  const P = (n, a) => [n, Object.fromEntries(TOK.map(([k], i) => [k, a[i]]))];
  const THEMES = [
    P('🌌 ATOM нічний', TOK.map(t => t[2])),
    P('💠 Неон', ['#05060d', '#0a0d1a', '#0f1426', '#161d36', '#22305a', '#eaf6ff', '#8ea3c7', '#22e3ff', '#8ff3ff', '#001018', '#ff2bd6', '#ff8bea', '#3dffa8']),
    P('🌊 Океан', ['#061a24', '#08222f', '#0c2b3b', '#11384c', '#1b4c66', '#e8f7ff', '#8fb6c9', '#2ec4b6', '#8ef0e6', '#03201d', '#3a86ff', '#8fb8ff', '#4ade80']),
    P('🔥 Вогонь', ['#140806', '#1c0c08', '#24100b', '#2f160f', '#47231a', '#fff1ea', '#c9a092', '#ff6a2b', '#ffb08a', '#1d0700', '#ff2b55', '#ff8aa1', '#ffd23f']),
    P('🌿 Ліс', ['#0b1410', '#0f1b15', '#13221a', '#192c22', '#25402f', '#eef7f0', '#9db8a5', '#a3e635', '#d4f78f', '#132003', '#10b981', '#6ee7b7', '#4ade80']),
    P('⚫ Графіт і золото', ['#0d0d0d', '#141414', '#1a1a1a', '#222222', '#333333', '#f5f5f0', '#a3a39a', '#d4af37', '#f0d878', '#1a1404', '#8a8a8a', '#c9c9c9', '#7bd88f']),
    P('🍒 Вишня', ['#16060c', '#1e0911', '#280c17', '#33111e', '#4d1a2e', '#ffeef4', '#c99aab', '#ff4d6d', '#ff99ad', '#2a0009', '#c084fc', '#e2b8ff', '#4ade80']),
    P('☀️ Світла', ['#faf7f2', '#f1ece3', '#ffffff', '#f4efe6', '#e3dacb', '#1d1a16', '#6b6359', '#e8590c', '#c2410c', '#ffffff', '#7c3aed', '#6d28d9', '#15803d']),
    P('🧊 Світла холодна', ['#f4f7fb', '#e9eef6', '#ffffff', '#eef2f8', '#d6deea', '#0f172a', '#5b6475', '#2563eb', '#1d4ed8', '#ffffff', '#06b6d4', '#0e7490', '#16a34a']),
    P('🍋 Лимонад', ['#fffdf2', '#fbf5d9', '#ffffff', '#fdf8e4', '#ece3b8', '#2a2410', '#756b45', '#16a34a', '#15803d', '#ffffff', '#eab308', '#a16207', '#16a34a']),
    P('🌸 Пастель', ['#fdf6fb', '#f7eaf3', '#ffffff', '#fbeff7', '#ecd5e4', '#2b1730', '#7a6280', '#d946ef', '#a21caf', '#ffffff', '#f472b6', '#be185d', '#16a34a']),
    P('🖤 Мінімал', ['#ffffff', '#f5f5f5', '#ffffff', '#f3f3f3', '#e5e5e5', '#0a0a0a', '#666666', '#0a0a0a', '#262626', '#ffffff', '#737373', '#404040', '#16a34a']),
  ];
  const FONTS = ['Unbounded', 'Manrope', 'Inter', 'Montserrat', 'Rubik', 'Golos Text', 'Onest', 'Nunito', 'Comfortaa', 'Exo 2', 'Oswald', 'Russo One', 'Playfair Display', 'Lora', 'Prata', 'Roboto Slab', 'Philosopher', 'Tenor Sans', 'Raleway', 'Open Sans'];
  const SEC = { hero: '🚀 Головний екран', feat: '✦ Можливості', who: '🏪 Для кого', demo: '📱 Демо', steps: '1️⃣ Як підключити', calc: '🧮 Калькулятор', cmp: '⚖️ Порівняння', price: '💰 Ціна й акція', faq: '❓ Питання', lead: '💬 Заявка й контакти' };
  const TXT = { top: '🔝 Шапка', hero: '🚀 Головний екран', mob: '📱 Кнопка внизу (телефон)' }, TL = { e: 'Надпис над заголовком', h: 'Заголовок', l: 'Підзаголовок', b: 'Кнопка', b1: 'Кнопка 1', b2: 'Кнопка 2', pill: 'Плашка', note: 'Примітка', ph: 'Заголовок акції' };
  const FX = [['grad', '🌈 Градієнт на кнопках і заголовку'], ['glow', '✨ Сяйво й тіні'], ['phone', '📱 Макет каси в телефоні'], ['facts', '🔢 Плитки з цифрами під головним екраном'], ['anim', '🎞 Анімації при прокрутці']];
  const TABS = [['col', '🎨 Кольори'], ['font', '🔤 Шрифт і форма'], ['fx', '✨ Ефекти'], ['blk', '🧱 Блоки'], ['txt', '✏️ Тексти'], ['ver', '🕓 Версії']];

  let C, D, O, V = [], T0 = {}, O0 = Object.keys(SEC), tab = 'col', dirty = false, frame, hist = [];
  const col = k => D.c?.[k] || DEF[k];
  // ---------- кольори: hex ↔ hsl, генератор палітри з одного акценту ----------
  const hx = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
  const toHex = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return toHex([f(0) * 255, f(8) * 255, f(4) * 255]); };
  const hex2hsl = h => { let [r, g, b] = hx(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let H = 0, S = 0;
    if (mx !== mn) { const d = mx - mn; S = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H *= 60; }
    return [H, S * 100, l * 100]; };
  const L = h => { const c = hx(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  function gen(acc, mode, h2) { // акцент + темна/світла → уся палітра; h2 — відтінок другого кольору (за замовчуванням −60°)
    const [h, s] = hex2hsl(acc), hb = h2 ?? (h + 300) % 360, dark = mode !== 'light', bh = hb, S = Math.min(45, s * .5);
    const p = dark ? { bg: hsl2hex(bh, S, 6), bg2: hsl2hex(bh, S, 8.5), card: hsl2hex(bh, S, 11), card2: hsl2hex(bh, S, 15), line: hsl2hex(bh, S * .9, 22), text: hsl2hex(bh, 30, 96), muted: hsl2hex(bh, 18, 70) }
      : { bg: hsl2hex(bh, S * .6, 97.5), bg2: hsl2hex(bh, S * .6, 94), card: '#ffffff', card2: hsl2hex(bh, S * .6, 95), line: hsl2hex(bh, S * .5, 86), text: hsl2hex(bh, 30, 10), muted: hsl2hex(bh, 10, 40) };
    const al = hex2hsl(acc)[2], gold = dark ? acc : (al > 50 ? hsl2hex(h, s, 42) : acc);
    return { ...p, gold, gold2: dark ? hsl2hex(h, Math.min(100, s), Math.min(85, al + 18)) : hsl2hex(h, s, 34), ink: L(gold) > .35 ? hsl2hex(h, 60, 8) : '#ffffff',
      vio: hsl2hex(hb, 80, dark ? 62 : 52), vio2: hsl2hex(hb, 90, dark ? 78 : 38), ok: dark ? '#4ade80' : '#15803d' };
  }
  const isLight = () => L(col('bg')) > .35;

  // ---------- стан ----------
  const push = () => frame?.contentWindow?.postMessage({ atomDesign: D }, '*');
  const touch = (keepHist) => { if (!keepHist) { hist.push(JSON.stringify(D)); if (hist.length > 60) hist.shift(); } dirty = true; document.getElementById('sbPub')?.classList.add('dirty'); push(); };
  const setC = (k, v) => { (D.c ||= {})[k] = v; };

  // ---------- вкладки ----------
  const card = (h, body, note) => `<div class="sb-card"><h4>${h}</h4>${note ? `<div class="sb-note">${note}</div>` : ''}${body}</div>`;
  const sw = c => `<i style="background:${c}"></i>`;
  function pCol() {
    const bg = col('bg'), t = cr(col('text'), bg), m = cr(col('muted'), bg), b = cr(col('ink'), col('gold')), a = cr(col('gold'), bg);
    const badge = (n, min, l) => `<span class="as-cr ${n >= min ? 'ok' : 'bad'}" title="${l}: контраст ${n.toFixed(1)} (норма від ${min})">${n >= min ? '✓' : '⚠️'} ${l} ${n.toFixed(1)}</span>`;
    const pal = THEMES.map(([n, p], i) => `<button type="button" class="as-th" data-as="theme" data-i="${i}" style="background:${p.bg};color:${p.text};border-color:${p.line}"><span class="as-sw">${sw(p.gold)}${sw(p.vio)}${sw(p.card2)}</span><b>${n}</b></button>`).join('');
    const ah = Math.round(hex2hsl(col('gold'))[0]), bh = Math.round(hex2hsl(col('vio'))[0]);
    return card('🎨 Готові теми', `<div class="as-ths">${pal}</div>`, 'Один дотик — і весь сайт у нових кольорах. Далі можна докрутити будь-який колір нижче.')
      + card('🪄 Генератор з одного кольору', `<div class="sb-row" style="align-items:center"><label class="as-pick"><input type="color" id="asAcc" value="${col('gold')}"><span>Акцент</span></label><label class="as-pick"><input type="color" id="asSec" value="${col('vio')}"><span>Другий</span></label>
          <div class="sb-chips"><button type="button" class="${isLight() ? '' : 'on'}" data-as="gen" data-m="dark">🌙 Темна</button><button type="button" class="${isLight() ? 'on' : ''}" data-as="gen" data-m="light">☀️ Світла</button></div></div>
        <label class="sb-f">Відтінок акценту <b>${ah}°</b><input type="range" class="as-hue" min="0" max="359" value="${ah}" data-as-r="hue"></label>
        <label class="sb-f">Відтінок другого кольору <b>${bh}°</b><input type="range" class="as-hue" min="0" max="359" value="${bh}" data-as-r="hue2"></label>
        <div class="sb-row"><button type="button" class="btn sm" data-as="rnd">🎲 Випадкова</button><button type="button" class="btn sm" data-as="swap">🔄 Поміняти акценти місцями</button><button type="button" class="btn sm" data-as="inv">🌓 Темна ↔ світла</button></div>`,
        'Оберіть акцент — фон, картки, рамки й тексти підберуться самі в тон. Повзунки крутять відтінок по колу.')
      + card('🖌 Кожен колір окремо', `<div class="as-cols">${TOK.map(([k, l]) => `<label class="sb-col"><input type="color" data-as-c="${k}" value="${col(k)}"><span>${l}<br><small class="as-hex">${col(k)}</small></span>${D.c?.[k] ? `<button type="button" class="as-rst" data-as="rstC" data-k="${k}" title="Стандартний">↺</button>` : ''}</label>`).join('')}</div>`)
      + card('👁 Читабельність', `<div class="as-crs">${badge(t, 7, 'Текст')}${badge(m, 4.5, 'Другорядний')}${badge(b, 4.5, 'Кнопки')}${badge(a, 3, 'Акцент на фоні')}</div>`, 'Контраст за WCAG: зелене — читається добре, ⚠️ — краще зробити світліше або темніше.');
  }
  function pFont() {
    const fl = (k, d) => `<div class="sb-fonts">${FONTS.map(f => `<button type="button" class="${(D[k] || d) === f ? 'on' : ''}" data-as="font" data-k="${k}" data-f="${esc(f)}" style="font-family:'${esc(f)}',system-ui">${esc(f)}</button>`).join('')}</div>`;
    const r = D.r ?? 20, sp = D.sp ?? 72;
    return card('🅰️ Шрифт заголовків', fl('fh', 'Unbounded'), 'Усі шрифти — з кирилицею.') + card('🔡 Шрифт тексту', fl('fb', 'Manrope'))
      + card('⬜ Форма', `<label class="sb-f">Заокруглення карток і кнопок <b>${r}px</b><input type="range" min="0" max="40" value="${r}" data-as-r="r"></label>
        <div class="sb-chips">${[[0, '▭ Гострі'], [10, '▢ Мʼякі'], [20, '◻ Стандарт'], [32, '⬭ Круглі']].map(([v, l]) => `<button type="button" class="${r === v ? 'on' : ''}" data-as="r" data-v="${v}">${l}</button>`).join('')}</div>
        <label class="sb-f">Відступи між блоками <b>${sp}px</b><input type="range" min="32" max="140" step="4" value="${sp}" data-as-r="sp"></label>`);
  }
  function pFx() {
    return card('✨ Ефекти', FX.map(([k, l]) => `<label class="sb-tg"><input type="checkbox" data-as-fx="${k}" ${D.fx?.[k] === 0 ? '' : 'checked'}> ${l}</label>`).join(''), 'Без градієнтів і сяйва сайт виглядає спокійніше й строгіше; без анімацій — швидше на старих телефонах.');
  }
  function order() { const o = (D.order || []).filter(k => SEC[k]); return [...o, ...O0.filter(k => !o.includes(k) && SEC[k])]; }
  function pBlk() {
    const o = order(), off = D.off || [];
    return card('🧱 Порядок і показ блоків', `<div class="sb-list">${o.map((k, i) => `<div class="sb-li${off.includes(k) ? ' off' : ''}"><span>${SEC[k]}</span><span><button type="button" data-as="up" data-i="${i}" ${i ? '' : 'disabled'} title="Вище">↑</button><button type="button" data-as="dn" data-i="${i}" ${i < o.length - 1 ? '' : 'disabled'} title="Нижче">↓</button><button type="button" data-as="eye" data-k="${k}" title="${off.includes(k) ? 'Показати' : 'Сховати'}">${off.includes(k) ? '🙈' : '👁'}</button></span></div>`).join('')}</div>
      <div class="sb-row"><button type="button" class="btn sm" data-as="blkRst">↺ Стандартний порядок</button></div>`, 'Стрілками — переставити, 👁 — сховати блок (пункт меню в шапці теж зникне). Якщо сховати «Заявку», кнопки «Підключити» теж сховаються.');
  }
  function pTxt() {
    const groups = {}; for (const k of Object.keys(T0)) (groups[k.split('.')[0]] ||= []).push(k);
    const ord = ['top', ...order(), 'mob'].filter(g => groups[g]);
    return `<div class="sb-note" style="padding:0 4px">Слово в <b>*зірочках*</b> виділяється акцентом. Порожнє поле — стандартний текст.</div>` + ord.map(g => card(SEC[g] || TXT[g] || g, groups[g].map(k => { const v = D.t?.[k], big = T0[k].length > 70;
      return `<label class="sb-f">${TL[k.split('.')[1]] || k}${v != null ? ` <button type="button" class="as-rst" data-as="rstT" data-k="${k}" title="Стандартний">↺</button>` : ''}${big ? `<textarea rows="3" data-as-t="${k}" placeholder="${esc(T0[k])}">${esc(v ?? '')}</textarea>` : `<input data-as-t="${k}" placeholder="${esc(T0[k])}" value="${esc(v ?? '')}">`}</label>`; }).join(''))).join('');
  }
  function pVer() {
    return card('🕓 Попередні версії', `<div class="sb-list">${V.length ? V.map((x, i) => `<div class="sb-li"><span>${new Date(x.at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} <span class="as-sw">${sw(x.d.c?.bg || DEF.bg)}${sw(x.d.c?.gold || DEF.gold)}${sw(x.d.c?.vio || DEF.vio)}</span></span><span><button type="button" class="btn sm" data-as="verBack" data-i="${i}">↩️ Взяти</button></span></div>`).join('') : '<div class="sb-note">Ще немає — тут зʼявлятимуться 10 попередніх публікацій.</div>'}</div>`, 'Версія підставляється в чернетку — побачите в перегляді, опублікуєте кнопкою 💾.')
      + card('🧹 Почати з нуля', '<button type="button" class="btn sm red" data-as="reset">↺ Стандартний дизайн ATOM</button>', 'Скидає кольори, шрифти, блоки й тексти до початкових (у чернетці).');
  }
  function draw() {
    const p = document.getElementById('sbP'); if (!p) return; const y = p.scrollTop;
    p.innerHTML = { col: pCol, font: pFont, fx: pFx, blk: pBlk, txt: pTxt, ver: pVer }[tab]();
    document.querySelectorAll('#sb .sb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    document.getElementById('asUndo').disabled = !hist.length; p.scrollTop = y;
  }

  async function open(ctx) {
    C = ctx; let r; try { r = await C.api('atomDesign'); } catch (e) { return C.toast('⚠️ ' + e.message); }
    O = clone(r.d); D = clone(O); V = r.vers || []; dirty = false; hist = []; tab = 'col';
    document.body.insertAdjacentHTML('beforeend', `<div id="sb" class="as"><div class="sb-top"><button type="button" class="btn sm" data-as="close">✕</button><b>🎨 Конструктор сайту ATOM</b><span class="sb-sp"></span><button type="button" class="btn sm sb-pvb" data-as="pv">👁 Перегляд</button><button type="button" class="btn sm" id="asUndo" data-as="undo" title="Крок назад">↶<span class="sb-lbl"> Крок назад</span></button><button type="button" class="btn sm" data-as="revert" title="Повернути опубліковане">↩️<span class="sb-lbl"> Скасувати все</span></button><button type="button" class="btn sm primary" id="sbPub" data-as="pub">💾<span class="sb-lbl"> Опублікувати</span></button></div>
      <div class="sb-body"><div class="sb-side"><div class="sb-tabs">${TABS.map(([k, l]) => `<button type="button" data-as="tab" data-t="${k}">${l}</button>`).join('')}</div><div class="sb-p" id="sbP"></div></div>
      <div class="sb-view"><div class="sb-dev"><button type="button" data-as="dev" data-w="390" class="on">📱</button><button type="button" data-as="dev" data-w="0">💻</button><a class="btn sm ghost" href="${SITE}" target="_blank" rel="noopener">🔗 Сайт</a></div><div class="sb-fw"><iframe id="sbF" src="${SITE}?preview=1" title="Перегляд сайту ATOM"></iframe></div></div></div></div>`);
    frame = document.getElementById('sbF'); document.body.style.overflow = 'hidden'; draw();
  }
  function close(force) {
    if (!force && dirty && !confirm('Закрити без публікації? Зміни пропадуть.')) return;
    document.getElementById('sb')?.remove(); document.body.style.overflow = ''; C = null; frame = null;
  }
  addEventListener('message', e => { if (!C || !frame || e.source !== frame.contentWindow || !e.data?.atomReady) return; T0 = e.data.texts || {}; O0 = e.data.order || O0; push(); if (tab === 'txt' || tab === 'blk') draw(); });

  // ---------- дії ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-as]'); if (!el || !C) return; const a = el.dataset.as, d = el.dataset;
    if (a === 'close') return close();
    if (a === 'tab') { tab = d.t; return draw(); }
    if (a === 'pv') { const sb = document.getElementById('sb'); sb.classList.toggle('pv'); el.textContent = sb.classList.contains('pv') ? '⚙️ Налаштування' : '👁 Перегляд'; return; }
    if (a === 'dev') { document.querySelectorAll('#sb .sb-dev button').forEach(b => b.classList.toggle('on', b === el)); document.querySelector('#sb .sb-fw').style.maxWidth = +d.w ? d.w + 'px' : 'none'; return; }
    if (a === 'undo') { if (!hist.length) return; D = JSON.parse(hist.pop()); touch(true); return draw(); }
    if (a === 'revert') { if (dirty && !confirm('Повернути опубліковану версію? Чернетка пропаде.')) return; hist.push(JSON.stringify(D)); D = clone(O); dirty = false; document.getElementById('sbPub')?.classList.remove('dirty'); push(); return draw(); }
    if (a === 'pub') { el.disabled = true; try { const r = await C.api('atomDesign', { set: 1, d: D }); O = clone(r.d); D = clone(r.d); V = r.vers || V; dirty = false; el.classList.remove('dirty'); C.toast('✅ Опубліковано — на posatom.online за хвилину'); draw(); } catch (x) { C.toast('⚠️ ' + x.message); } el.disabled = false; return; }
    if (a === 'theme') { touch(); D.c = clone(THEMES[+d.i][1]); push(); return draw(); }
    if (a === 'gen') { touch(); D.c = gen(col('gold'), d.m, hex2hsl(col('vio'))[0]); push(); return draw(); }
    if (a === 'rnd') { touch(); const h = Math.random() * 360; D.c = gen(hsl2hex(h, 70 + Math.random() * 25, 55 + Math.random() * 10), Math.random() < .3 ? 'light' : 'dark', (h + 90 + Math.random() * 180) % 360); push(); return draw(); }
    if (a === 'swap') { touch(); const [g, g2, v, v2] = [col('gold'), col('gold2'), col('vio'), col('vio2')]; setC('gold', v); setC('gold2', v2); setC('vio', g); setC('vio2', g2); setC('ink', L(v) > .35 ? '#111111' : '#ffffff'); push(); return draw(); }
    if (a === 'inv') { touch(); D.c = gen(col('gold'), isLight() ? 'dark' : 'light', hex2hsl(col('vio'))[0]); push(); return draw(); }
    if (a === 'rstC') { touch(); delete D.c[d.k]; push(); return draw(); }
    if (a === 'font') { touch(); D[d.k] = d.f; push(); return draw(); }
    if (a === 'r') { touch(); D.r = +d.v; push(); return draw(); }
    if (a === 'up' || a === 'dn') { touch(); const o = order(), i = +d.i, j = a === 'up' ? i - 1 : i + 1; [o[i], o[j]] = [o[j], o[i]]; D.order = o; push(); return draw(); }
    if (a === 'eye') { touch(); const off = new Set(D.off || []); off.has(d.k) ? off.delete(d.k) : off.add(d.k); D.off = [...off]; push(); return draw(); }
    if (a === 'blkRst') { touch(); delete D.order; delete D.off; push(); return draw(); }
    if (a === 'rstT') { touch(); delete D.t[d.k]; push(); return draw(); }
    if (a === 'verBack') { touch(); D = clone(V[+d.i].d); push(); C.toast('↩️ Версію підставлено — перевірте й опублікуйте'); return draw(); }
    if (a === 'reset') { touch(); D = {}; push(); return draw(); }
  });
  // повзунки й поля: перегляд оновлюється одразу, історія — один крок на жест
  let gest = null; const start = el => { if (gest !== el) { gest = el; touch(); } };
  document.addEventListener('input', e => {
    if (!C) return; const el = e.target, ds = el.dataset;
    if (ds.asC) { start(el); setC(ds.asC, el.value); const s = el.closest('.sb-col')?.querySelector('.as-hex'); if (s) s.textContent = el.value; return push(); }
    if (el.id === 'asAcc' || el.id === 'asSec') { start(el); D.c = gen(el.id === 'asAcc' ? el.value : col('gold'), isLight() ? 'light' : 'dark', hex2hsl(el.id === 'asSec' ? el.value : col('vio'))[0]); if (el.id === 'asSec') { setC('vio', el.value); } return push(); }
    if (ds.asR === 'hue' || ds.asR === 'hue2') { start(el); const g = col('gold'), [, s, l] = hex2hsl(g); D.c = gen(ds.asR === 'hue' ? hsl2hex(+el.value, s, l) : g, isLight() ? 'light' : 'dark', ds.asR === 'hue2' ? +el.value : hex2hsl(col('vio'))[0]); el.previousElementSibling.textContent = el.value + '°'; return push(); }
    if (ds.asR === 'r' || ds.asR === 'sp') { start(el); D[ds.asR] = +el.value; el.previousElementSibling.textContent = el.value + 'px'; return push(); }
    if (ds.asFx) { touch(); D.fx ||= {}; el.checked ? delete D.fx[ds.asFx] : D.fx[ds.asFx] = 0; return push(); }
    if (ds.asT) { start(el); D.t ||= {}; el.value.trim() ? D.t[ds.asT] = el.value : delete D.t[ds.asT]; return push(); }
  });
  document.addEventListener('change', e => { if (C && e.target.closest('#sbP') && (e.target.type === 'color' || e.target.type === 'range')) { gest = null; draw(); } });
  return { open };
})();
