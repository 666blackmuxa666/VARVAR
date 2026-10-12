// 🎨 Кабінет власника → Друк і дизайн: візитки, таблички на столи, меню, флаєри, банери, сертифікати, наклейки, бейджі —
// з даних закладу (назва, лого, контакти, меню, QR) у будь-якому з ~36 стилів (+ 🎲 випадкові поєднання, ⭐ свої стилі, 🏷 «Мій бренд» з лого).
// Усе малюється в браузері в міліметрах: 🖨 друк (вектор → «Зберегти як PDF»), ⬇️ PDF для друкарні (300 dpi, +3 мм під обріз), ⬇️ PNG.
// Сервер — лише збереження вибору (op dzGet/dzSet, ключ dz). Бібліотеки (QR, експорт) вантажаться з CDN тільки при відкритті.
window.OWNDZ = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LIB = { qr: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', h2i: 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js', pdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' };
  const loaded = {}, lib = k => loaded[k] ||= new Promise((ok, no) => { const s = document.createElement('script'); s.src = LIB[k]; s.onload = ok; s.onerror = () => { delete loaded[k]; no(new Error('Не вдалося завантажити модуль — перевірте інтернет')); }; document.head.append(s); });

  // ---------- шрифти (усі з кирилицею) ----------
  const FONTS = ['Inter', 'Montserrat', 'Onest', 'Raleway', 'Jost', 'Rubik', 'Oswald', 'Unbounded', 'Russo One', 'Dela Gothic One', 'Rubik Mono One', 'Tektur', 'Comfortaa', 'Playfair Display', 'Cormorant Garamond', 'Lora', 'PT Serif', 'Spectral', 'Prata', 'Forum', 'Alice', 'Old Standard TT', 'Yeseva One', 'Tenor Sans', 'Poiret One', 'Philosopher', 'Kelly Slab', 'Ruslan Display', 'Lobster', 'Pacifico', 'Marck Script', 'Caveat', 'Bad Script', 'Amatic SC', 'Neucha'];
  const W2 = { Inter: 1, Montserrat: 1, Onest: 1, Raleway: 1, Jost: 1, Rubik: 1, Oswald: 1, Unbounded: 1, Comfortaa: 1, 'Playfair Display': 1, 'Cormorant Garamond': 1, Lora: 1, 'PT Serif': 1, Spectral: 1, 'Old Standard TT': 1, Philosopher: 1, Caveat: 1, 'Amatic SC': 1, Tektur: 1 };
  const fq = f => 'family=' + f.replace(/ /g, '+') + (W2[f] ? ':wght@400;700' : '');
  const gf = list => 'https://fonts.googleapis.com/css2?' + [...new Set(list)].map(fq).join('&') + '&display=swap';
  const FF = f => `'${f}', ${/Lora|Serif|Spectral|Prata|Forum|Alice|Old|Yeseva|Playfair|Cormorant|Kelly/.test(f) ? 'Georgia, serif' : /Lobster|Pacifico|Script|Caveat|Neucha|Amatic/.test(f) ? 'cursive' : 'Arial, sans-serif'}`;

  // ---------- візерунки (SVG-плитка кольором акценту, прозорість — у самому SVG) ----------
  const svg = (w, h, body) => `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`).replace(/'/g, '%27')}')`;
  const noise = (c, a, f = .9, o = 4) => svg(200, 200, `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${f}' numOctaves='${o}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${a} 0'/></filter><rect width='200' height='200' fill='${c}' filter='url(#n)'/>`);
  const PAT = {
    none: ['Без візерунка', () => ''],
    dots: ['Горошок', c => [svg(20, 20, `<circle cx='10' cy='10' r='3' fill='${c}' fill-opacity='.18'/>`), '6em']],
    grid: ['Сітка', c => [svg(20, 20, `<path d='M20 0H0V20' fill='none' stroke='${c}' stroke-opacity='.16' stroke-width='.6'/>`), '6em']],
    stripes: ['Смуги', c => [svg(20, 20, `<rect width='10' height='20' fill='${c}' fill-opacity='.08'/>`), '8em']],
    diag: ['Навскіс', c => [svg(16, 16, `<path d='M-4 4l8-8M0 16L16 0M12 20l8-8' stroke='${c}' stroke-opacity='.14' stroke-width='2'/>`), '4em']],
    check: ['Клітинка', c => [svg(20, 20, `<rect width='10' height='20' fill='${c}' fill-opacity='.1'/><rect width='20' height='10' fill='${c}' fill-opacity='.1'/>`), '9em']],
    lines: ['Лінійки', c => [svg(20, 20, `<path d='M0 19.5h20' stroke='${c}' stroke-opacity='.15'/>`), '5em']],
    paper: ['Папір', c => [noise(c, .12, .8), '60em']],
    kraft: ['Крафт', c => [noise(c, .22, .65, 3), '50em']],
    marble: ['Мармур', c => [noise(c, .2, .012, 5), '100em']],
    leather: ['Шкіра', c => [noise(c, .25, 1.6, 2), '30em']],
    chalk: ['Крейда', c => [noise(c, .1, .5, 4), '40em']],
    wood: ['Дерево', c => [svg(60, 30, `<path d='M0 8q15 -4 30 0t30 0M0 18q15 4 30 0t30 0M0 27q15 -3 30 0t30 0' fill='none' stroke='${c}' stroke-opacity='.18'/>`), '30em']],
    hutsul: ['Гуцульський', c => [svg(24, 24, `<path d='M12 2l10 10-10 10L2 12z' fill='none' stroke='${c}' stroke-opacity='.18' stroke-width='1.4'/><path d='M12 8l4 4-4 4-4-4z' fill='${c}' fill-opacity='.16'/>`), '10em']],
    cross: ['Вишивка', c => [svg(24, 24, `<g fill='${c}' fill-opacity='.16'><rect x='10' y='4' width='4' height='4'/><rect x='10' y='16' width='4' height='4'/><rect x='4' y='10' width='4' height='4'/><rect x='16' y='10' width='4' height='4'/><rect x='10' y='10' width='4' height='4'/></g>`), '9em']],
    snow: ['Сніжинки', c => [svg(60, 60, `<g stroke='${c}' stroke-opacity='.3' stroke-width='1' fill='none'><path d='M15 9v12M9 15h12M11 11l8 8M19 11l-8 8'/><path d='M45 37v10M40 42h10M41.5 38.5l7 7M48.5 38.5l-7 7'/></g><circle cx='42' cy='12' r='1.6' fill='${c}' fill-opacity='.3'/><circle cx='12' cy='46' r='1.2' fill='${c}' fill-opacity='.3'/>`), '22em']],
    pines: ['Смереки', c => [svg(40, 40, `<path d='M10 6l7 12h-4l5 9H2l5-9H3z' fill='${c}' fill-opacity='.14'/><path d='M30 22l5 9h-3l4 7H24l4-7h-3z' fill='${c}' fill-opacity='.1'/>`), '16em']],
    deco: ['Ар-деко', c => [svg(40, 20, `<g fill='none' stroke='${c}' stroke-opacity='.25'><path d='M0 20a20 20 0 0 1 40 0'/><path d='M6 20a14 14 0 0 1 28 0'/><path d='M12 20a8 8 0 0 1 16 0'/></g>`), '12em']],
    sun: ['Промені', c => [`repeating-conic-gradient(from 0deg at 50% 50%, ${c}1f 0 6deg, transparent 6deg 18deg)`, 'auto']],
    leaves: ['Листя', c => [svg(60, 60, `<g fill='${c}' fill-opacity='.16'><path d='M10 30q10-22 30-20-4 22-30 20z'/><path d='M38 52q6-14 20-12-3 14-20 12z'/></g>`), '24em']],
    memphis: ['Мемфіс', c => [svg(80, 80, `<g fill='none' stroke='${c}' stroke-opacity='.4' stroke-width='2'><path d='M6 14q5-6 10 0t10 0t10 0'/><circle cx='60' cy='20' r='6'/><path d='M20 58l8-12 8 12z'/></g><g fill='${c}' fill-opacity='.3'><rect x='56' y='54' width='8' height='8' transform='rotate(20 60 58)'/><circle cx='42' cy='38' r='2'/></g>`), '28em']],
    graffiti: ['Бризки', c => [svg(80, 80, `<g fill='${c}' fill-opacity='.18'><circle cx='14' cy='18' r='9'/><circle cx='26' cy='10' r='2'/><circle cx='4' cy='30' r='1.5'/><circle cx='58' cy='56' r='12'/><circle cx='74' cy='44' r='2.5'/><circle cx='44' cy='70' r='2'/></g>`), '30em']],
    beans: ['Кава', c => [svg(40, 40, `<g fill='${c}' fill-opacity='.16'><ellipse cx='10' cy='12' rx='5' ry='7' transform='rotate(30 10 12)'/><ellipse cx='30' cy='30' rx='5' ry='7' transform='rotate(-25 30 30)'/></g><g stroke='${c}' stroke-opacity='.25' fill='none'><path d='M7 7q5 5 6 10'/><path d='M32 24q-5 5-4 12'/></g>`), '14em']],
    waves: ['Хвилі', c => [svg(40, 20, `<g fill='none' stroke='${c}' stroke-opacity='.2'><path d='M0 20a20 20 0 0 1 40 0'/><path d='M8 20a12 12 0 0 1 24 0'/><path d='M-20 10a20 20 0 0 1 40 0M20 10a20 20 0 0 1 40 0'/></g>`), '10em']],
    hearts: ['Сердечка', c => [svg(40, 40, `<path d='M12 16c-4-5-10-1-6 4l6 6 6-6c4-5-2-9-6-4zM30 34c-3-3-7-1-4 3l4 4 4-4c3-4-1-6-4-3z' fill='${c}' fill-opacity='.2'/>`), '14em']],
  };
  const FRAMES = { none: 'Без рамки', line: 'Лінія', double: 'Подвійна', corners: 'Кути', band: 'Орнамент-смуги', stamp: 'Штамп', round: 'Закруглена', thick: 'Товста', glow: 'Неон' };

  // ---------- стилі: [id, назва, група, фон, текст, акцент, шрифт заголовків, шрифт тексту, візерунок, рамка, прапорці (u — великі літери, i — курсив), фон-2 (градієнт)] ----------
  const GROUPS = { cl: '🏛 Класика', mt: '🏔 Гори й Карпати', br: '🌈 Яскраві', pr: '🖤 Темні й преміум', st: '🍔 Вуличні й фуд', se: '🎄 Сезонні', my: '⭐ Мої стилі' };
  const STY = [
    ['minimal', 'Мінімал', 'cl', '#ffffff', '#141414', '#141414', 'Inter', 'Inter', 'none', 'none', 'u'],
    ['swiss', 'Швейцарський', 'cl', '#f4f1ea', '#111111', '#e2231a', 'Oswald', 'Inter', 'grid', 'none', 'u'],
    ['deco', 'Ар-деко', 'cl', '#0f1a1c', '#ece0c4', '#c9a45c', 'Poiret One', 'Tenor Sans', 'deco', 'corners', 'u'],
    ['vintage', 'Вінтаж', 'cl', '#f3e9d2', '#3b2a1a', '#8c2f1b', 'Yeseva One', 'Old Standard TT', 'paper', 'double', ''],
    ['bistro', 'Бістро', 'cl', '#fbf7ef', '#1d2a44', '#b8282f', 'Playfair Display', 'Lora', 'stripes', 'line', 'i'],
    ['trattoria', 'Тратторія', 'cl', '#fffaf0', '#2c3b2a', '#c0392b', 'Lobster', 'PT Serif', 'check', 'line', ''],
    ['hutsul', 'Гуцульський', 'mt', '#f6efe3', '#2a1b12', '#b3261e', 'Ruslan Display', 'PT Serif', 'hutsul', 'band', 'u'],
    ['craft', 'Крафт', 'mt', '#d8c3a0', '#2b2016', '#5b3a1e', 'Amatic SC', 'Neucha', 'kraft', 'stamp', 'u'],
    ['chalet', 'Шале', 'mt', '#3a2618', '#f3e6cf', '#e0a24a', 'Kelly Slab', 'PT Serif', 'wood', 'line', ''],
    ['ski', 'Лижний', 'mt', '#eaf4fb', '#0d2c4a', '#d6332a', 'Unbounded', 'Onest', 'snow', 'none', 'u'],
    ['vyshyvka', 'Вишиванка', 'mt', '#ffffff', '#1a1a1a', '#c1121f', 'Philosopher', 'Philosopher', 'cross', 'band', ''],
    ['forest', 'Смерековий ліс', 'mt', '#1f3326', '#eaf0e2', '#a7c957', 'Cormorant Garamond', 'Jost', 'pines', 'line', ''],
    ['neon', 'Неон-бар', 'br', '#0b0418', '#f2f2ff', '#ff2bd6', 'Tektur', 'Onest', 'grid', 'glow', 'u'],
    ['popart', 'Поп-арт', 'br', '#ffe600', '#111111', '#e4002b', 'Dela Gothic One', 'Rubik', 'dots', 'thick', 'u'],
    ['retro70', 'Ретро 70-х', 'br', '#f5e1c0', '#4a2511', '#e07a1f', 'Rubik Mono One', 'Rubik', 'sun', 'round', 'u'],
    ['tropic', 'Тропіки', 'br', '#0f5c4d', '#fff8e7', '#ffb703', 'Pacifico', 'Raleway', 'leaves', 'none', ''],
    ['memphis', 'Мемфіс', 'br', '#fff4f8', '#1b1b3a', '#00a6c8', 'Rubik Mono One', 'Onest', 'memphis', 'none', 'u'],
    ['gradient', 'Градієнт', 'br', '#6a11cb', '#ffffff', '#ffd166', 'Unbounded', 'Onest', 'none', 'round', '', '#2575fc'],
    ['blackgold', 'Чорне золото', 'pr', '#0d0d0d', '#f1e6c8', '#c9a45c', 'Cormorant Garamond', 'Tenor Sans', 'none', 'double', 'u'],
    ['marble', 'Мармур', 'pr', '#f7f5f2', '#222222', '#9c7c4c', 'Playfair Display', 'Raleway', 'marble', 'line', ''],
    ['noir', 'Нуар', 'pr', '#000000', '#ffffff', '#ffffff', 'Prata', 'Inter', 'none', 'line', 'u'],
    ['leather', 'Шкіра', 'pr', '#3b2416', '#f1e1c6', '#d4a373', 'Forum', 'Alice', 'leather', 'stamp', 'u'],
    ['wine', 'Вино-бордо', 'pr', '#4a0e1c', '#f7e7d4', '#e6b980', 'Yeseva One', 'Spectral', 'diag', 'double', ''],
    ['emerald', 'Смарагд', 'pr', '#0b3d2e', '#f3ead3', '#d4af37', 'Prata', 'Montserrat', 'deco', 'corners', 'u'],
    ['street', 'Стріт-фуд', 'st', '#1a1a1a', '#ffffff', '#ffd60a', 'Russo One', 'Rubik', 'graffiti', 'thick', 'u'],
    ['chalk', 'Крейдяна дошка', 'st', '#24302b', '#f4f4f0', '#f4d35e', 'Marck Script', 'Neucha', 'chalk', 'line', ''],
    ['news', 'Газета', 'st', '#efeae0', '#111111', '#111111', 'Old Standard TT', 'PT Serif', 'lines', 'double', 'u'],
    ['burger', 'Бургерна', 'st', '#ffb703', '#2b1300', '#d62828', 'Dela Gothic One', 'Rubik', 'dots', 'thick', 'u'],
    ['coffee', 'Кавʼярня', 'st', '#efe3d3', '#3d2b1f', '#8b5e3c', 'Caveat', 'Raleway', 'beans', 'none', ''],
    ['sushi', 'Азія', 'st', '#f8f3ea', '#1c1c1c', '#c8102e', 'Tenor Sans', 'Inter', 'waves', 'line', 'u'],
    ['newyear', 'Новий рік', 'se', '#0f3d2e', '#ffffff', '#e63946', 'Lobster', 'Raleway', 'snow', 'double', ''],
    ['easter', 'Великдень', 'se', '#fdf6e3', '#4a3f35', '#7bb662', 'Bad Script', 'Alice', 'dots', 'round', ''],
    ['summer', 'Літо', 'se', '#fff3d6', '#14213d', '#fb8500', 'Pacifico', 'Onest', 'sun', 'none', ''],
    ['halloween', 'Хелловін', 'se', '#1a1423', '#f5e6d3', '#ff7518', 'Ruslan Display', 'Rubik', 'diag', 'thick', 'u'],
    ['valentine', 'День закоханих', 'se', '#ffe5ec', '#590d22', '#c9184a', 'Marck Script', 'Alice', 'hearts', 'round', ''],
    ['winter', 'Зимовий вечір', 'se', '#16213e', '#eaf2ff', '#8ecae6', 'Comfortaa', 'Onest', 'snow', 'corners', ''],
  ].map(([id, name, g, bg, fg, ac, fh, fb, pat, fr, fl, bg2]) => ({ id, name, g, bg, fg, ac, fh, fb, pat, fr, fl, bg2 }));

  // ---------- кольори ----------
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
  const lum = h => { const [r, g, b] = hex(h); return (r * .299 + g * .587 + b * .114) / 255; };

  let C, D, T, cur = 0, pages = [], dirty = false, busy = false;
  const st = () => { const base = [...STY, ...(D.mine || [])].find(s => s.id === D.style) || STY[0]; return { ...base, ...(D.ov || {}) }; };

  // ---------- QR (векторно, кольором тексту) ----------
  function qr(url, cls = '') {
    if (!window.qrcode || !url) return `<div class="dz-qr ${cls}"></div>`;
    const q = window.qrcode(0, 'M'); q.addData(url); q.make(); const n = q.getModuleCount(); let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return `<svg class="dz-qr ${cls}" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="var(--qbg)"/><path d="${d}" fill="var(--qfg)"/></svg>`;
  }
  const logo = (cls = '') => T.logo ? `<img class="dz-logo ${cls}" src="${T.logo}" alt="">` : `<div class="dz-logo dz-mono ${cls}"><span>${esc((T.name.match(/\p{L}+/gu) || ['?']).slice(0, 2).map(w => w[0]).join('').toUpperCase())}</span></div>`;
  const ln = (ic, t) => t ? `<div class="dz-ln"><i>${ic}</i><span>${esc(t)}</span></div>` : '';
  const contacts = () => ln('☎', T.phone) + ln('⌖', T.addr) + ln('◷', T.hours) + ln('@', T.insta);
  const tx = k => D.tx[D.prod + '.' + k] ?? (PROD[D.prod].f.find(f => f[0] === k) || [])[2] ?? '';

  // ---------- вироби: w×h мм, f — поля для текстів [ключ, підпис, типово, тип], p — сторінки ----------
  const PROD = {
    card: { n: '💳 Візитка', d: '90×50 мм · лице й зворот', w: 90, h: 50, f: [['tag', 'Підпис під назвою', '', 't'], ['qrt', 'Підпис під QR', 'Меню й бронь', 't']],
      p: () => [cardFront(), cardBack()] },
    cards: { n: '📄 Візитки на аркуші A4', d: '10 шт. з мітками різу · лице й зворот', w: 210, h: 297, f: [['tag', 'Підпис під назвою', '', 't'], ['qrt', 'Підпис під QR', 'Меню й бронь', 't']], sheet: 1,
      p: () => [sheet(cardFront), sheet(cardBack)] },
    tent: { n: '🔳 Таблички на столи', d: 'A6 · QR свого столу на кожній', w: 105, h: 148, f: [['head', 'Заголовок', 'Скануйте — меню й замовлення', 't'], ['sub', 'Підпис', 'Замовлення прийде прямо на ваш стіл', 't'], ['wifi', 'Wi-Fi (необовʼязково)', '', 't']],
      p: () => (T.tables.length ? T.tables : [{ t: 1, url: T.site }]).map(x => `<div class="dz-col dz-c dz-tent">${logo('l16')}<div class="dz-h h7">${esc(tx('head'))}</div>${qr(x.url, 'q60')}<div class="dz-big">Стіл ${x.t}</div><div class="dz-m">${esc(tx('sub'))}</div>${tx('wifi') ? `<div class="dz-chip">📶 Wi-Fi: ${esc(tx('wifi'))}</div>` : ''}</div>`) },
    menu: { n: '🍽 Меню', d: 'A4 · страви й ціни з системи', w: 210, h: 297, f: [['head', 'Заголовок', 'Меню', 't'], ['cols', 'Колонки', '2', 's', ['1', '2']], ['desc', 'Склад страв', '1', 's', [['1', 'Показувати'], ['0', 'Без складу']]], ['cats', 'Розділи (порожньо — усі)', '', 'cats']],
      p: menuPages },
    flyer: { n: '📣 Флаєр / постер', d: 'A6 · A5 · A4 · A3', w: 148, h: 210, sz: { A6: [105, 148], A5: [148, 210], A4: [210, 297], A3: [297, 420] }, f: [['size', 'Розмір', 'A5', 's', ['A6', 'A5', 'A4', 'A3']], ['head', 'Заголовок', '', 't'], ['text', 'Текст', '', 'a'], ['qrt', 'Підпис під QR', 'Меню, бронь і доставка', 't']],
      p: () => [`<div class="dz-col dz-c dz-fly">${logo('l16')}<div class="dz-name n8">${esc(T.name)}</div><div class="dz-rule"></div><div class="dz-h h11">${esc(tx('head') || T.promo.t || T.tag)}</div><div class="dz-txt t5">${esc(tx('text') || T.promo.d || '')}</div><div class="dz-sp"></div><div class="dz-row">${qr(T.site, 'q26')}<div class="dz-cts">${contacts()}<div class="dz-m">${esc(tx('qrt'))}</div></div></div></div>`] },
    rollup: { n: '🏳 Ролл-ап банер', d: '85×200 см · виставка, вхід', w: 850, h: 2000, f: [['head', 'Гасло', '', 't'], ['hits', 'Хіти (через кому)', '', 't']],
      p: () => [`<div class="dz-col dz-c dz-roll">${logo('l40')}<div class="dz-name n16">${esc(T.name)}</div><div class="dz-rule"></div><div class="dz-h h9">${esc(tx('head') || T.tag)}</div><div class="dz-hits">${hits().map(h => `<div><span>${esc(h[0])}</span>${h[1] ? `<b>${h[1]} ₴</b>` : ''}</div>`).join('')}</div><div class="dz-sp"></div>${qr(T.site, 'q30')}<div class="dz-cts big">${contacts()}</div></div>`] },
    facade: { n: '🏪 Банер на фасад', d: '300×100 см · вивіска', w: 3000, h: 1000, f: [['head', 'Підпис', '', 't'], ['right', 'Справа', '', 't']],
      p: () => [`<div class="dz-fac">${logo('l70')}<div class="dz-col"><div class="dz-name n18">${esc(T.name)}</div><div class="dz-h h8">${esc(tx('head') || T.tag)}</div></div><div class="dz-col dz-r"><div class="dz-big b9">${esc(tx('right') || T.phone)}</div><div class="dz-m m4">${esc(T.hours)}</div></div></div>`] },
    cert: { n: '🎁 Подарунковий сертифікат', d: '210×99 мм (конверт DL)', w: 210, h: 99, f: [['head', 'Заголовок', 'Подарунковий сертифікат', 't'], ['sum', 'Номінал', '1000 грн', 't'], ['note', 'Умови', 'Діє 3 місяці з дня покупки', 't']],
      p: () => [`<div class="dz-cert"><div class="dz-col">${logo('l22')}<div class="dz-name n9">${esc(T.name)}</div><div class="dz-sp"></div><div class="dz-m">${esc(tx('note'))}</div><div class="dz-num">№ ____________</div></div><div class="dz-col dz-c"><div class="dz-h h9">${esc(tx('head'))}</div><div class="dz-sum">${esc(tx('sum'))}</div><div class="dz-cts">${ln('☎', T.phone)}${ln('⌖', T.addr)}</div></div>${qr(T.site, 'q30')}</div>`] },
    sticker: { n: '🏷 Наклейка', d: 'кругла 60 мм · пакети, коробки доставки', w: 60, h: 60, f: [['text', 'Текст', 'Смачного!', 't']],
      p: () => [`<div class="dz-col dz-c dz-stk">${logo('l34')}<div class="dz-name n10">${esc(T.name)}</div><div class="dz-h h7">${esc(tx('text'))}</div><div class="dz-m m5">${esc(T.phone)}</div></div>`] },
    badge: { n: '🪪 Бейджі персоналу', d: '86×54 мм · на кожного', w: 86, h: 54, f: [['sub', 'Підпис', 'Раді вас бачити', 't']],
      p: () => (T.staff.length ? T.staff : [{ name: 'Імʼя', role: 'waiter' }]).map(s => `<div class="dz-col dz-c dz-bdg">${logo('l18')}<div class="dz-big b16">${esc(s.name)}</div><div class="dz-h h5">${esc({ admin: 'Адміністратор', waiter: 'Офіціант', cook: 'Кухар', courier: 'Курʼєр' }[s.role] || '')}</div><div class="dz-m">${esc(tx('sub'))} · ${esc(T.name)}</div></div>`) },
    sign: { n: '🪧 Табличка', d: 'A5 · Wi-Fi, «Зарезервовано», години, правила', w: 210, h: 148, f: [['kind', 'Тип', 'wifi', 's', [['wifi', '📶 Wi-Fi'], ['res', '🔖 Зарезервовано'], ['hrs', '◷ Години роботи'], ['own', '✏️ Свій текст']]], ['head', 'Заголовок', '', 't'], ['text', 'Текст / пароль Wi-Fi', '', 'a']],
      p: () => { const k = tx('kind'), H = tx('head') || { wifi: 'Wi-Fi', res: 'Зарезервовано', hrs: 'Ми працюємо', own: T.name }[k], X = tx('text') || { wifi: 'мережа: ' + T.name + '\nпароль: ________', res: 'Дякуємо, що обрали нас', hrs: T.hours, own: '' }[k];
        return [`<div class="dz-col dz-c dz-sign">${logo('l16')}<div class="dz-big b16">${esc(H)}</div><div class="dz-rule"></div><div class="dz-txt t9">${esc(X).replace(/\n/g, '<br>')}</div></div>`]; } },
  };
  const hits = () => { const l = tx('hits') ? tx('hits').split(',').map(s => [s.trim(), 0]).filter(x => x[0]) : T.hits; return l.slice(0, 5); };
  const cardFront = () => `<div class="dz-col dz-c dz-cf">${logo('l20')}<div class="dz-name n9">${esc(T.name)}</div><div class="dz-m m4">${esc(tx('tag') || T.tag)}</div></div>`;
  const cardBack = () => `<div class="dz-cb"><div class="dz-cts">${contacts()}</div><div class="dz-col dz-c">${qr(T.site, 'q32')}<div class="dz-m m3">${esc(tx('qrt'))}</div></div></div>`;
  // 10 візиток 90×50 на A4 з мітками різу (мітки — поза карткою, на білому полі)
  const sheet = fn => { let h = ''; for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) h += `<div class="dz-sc" style="left:${15 + c * 90}mm;top:${23.5 + r * 50}mm">${pageHTML(90, 50, fn(), 0, 'nest')}</div>`;
    const m = []; for (const x of [15, 105, 195]) m.push(`<i style="left:${x}mm;top:17mm;height:5mm;width:.2mm"></i><i style="left:${x}mm;top:275mm;height:5mm;width:.2mm"></i>`); for (let r = 0; r <= 5; r++) { const y = 23.5 + r * 50; m.push(`<i style="top:${y}mm;left:8mm;width:5mm;height:.2mm"></i><i style="top:${y}mm;left:197mm;width:5mm;height:.2mm"></i>`); }
    return `<div class="dz-sheet">${h}<div class="dz-marks">${m.join('')}</div></div>`; };

  // меню: блоки (розділ + страви) розкладаються по сторінках з вимірюванням — що не влізло, переходить на наступну
  function menuPages() {
    const want = tx('cats') ? new Set(tx('cats').split(',')) : null, desc = tx('desc') === '1';
    const blocks = []; for (const c of T.menu) { if (want && !want.has(c.id)) continue; blocks.push(`<div class="dz-mc">${esc(c.name)}</div>`); for (const i of c.items) blocks.push(`<div class="dz-mi"><div class="dz-mr"><b>${esc(i.n)}</b><span class="dz-dots"></span><b class="dz-pr">${i.p}</b></div>${(desc && i.d) || i.s ? `<div class="dz-md">${esc([desc ? i.d : '', i.s].filter(Boolean).join(' · '))}</div>` : ''}</div>`); }
    const head = `<div class="dz-mh">${logo('l14')}<div class="dz-col"><div class="dz-name n7">${esc(T.name)}</div><div class="dz-h h5">${esc(tx('head'))}</div></div>${qr(T.site, 'q14')}</div>`;
    const wrap = (b, first) => `<div class="dz-menu">${first ? head : ''}<div class="dz-mcols" style="column-count:${tx('cols')}">${b.join('')}</div><div class="dz-mf">${esc([T.phone, T.addr].filter(Boolean).join(' · '))} · ціни в гривнях</div></div>`;
    const S = st(), host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden'; document.body.append(host);
    const out = []; let cur = [], i = 0;
    const fits = b => { host.innerHTML = pageHTML(210, 297, wrap(b, !out.length), 0, '', S); const c = host.querySelector('.dz-mcols'); return c.scrollWidth <= c.clientWidth + 2 && c.scrollHeight <= c.clientHeight + 2; };
    while (i < blocks.length) { cur.push(blocks[i]); if (!fits(cur) && cur.length > 1) { cur.pop(); if (/dz-mc/.test(cur[cur.length - 1] || '')) { cur.pop(); i--; } out.push(wrap(cur, !out.length)); cur = []; continue; } i++; }
    if (cur.length || !out.length) out.push(wrap(cur, !out.length)); host.remove(); return out;
  }

  // ---------- сторінка: точний розмір у мм; b — поля під обріз (фон заходить за край) ----------
  function vars(S) {
    const mu = mix(S.fg, S.bg, .38), [pi, ps] = (PAT[S.pat] || PAT.none)[1](S.ac) || [];
    const bg = S.bg2 ? `linear-gradient(150deg, ${S.bg}, ${S.bg2})` : S.bg, light = lum(S.bg) > .5;
    return `--bg:${S.bg};--fg:${S.fg};--ac:${S.ac};--mu:${mu};--fh:${FF(S.fh)};--fb:${FF(S.fb)};--ac2:${mix(S.ac, S.bg, .82)};--qfg:${light ? S.fg : S.bg};--qbg:${light ? 'transparent' : S.fg};--band:${svg(24, 12, `<path d='M0 6l6-6 6 6-6 6zM12 6l6-6 6 6-6 6z' fill='${S.ac}'/><path d='M6 3l3 3-3 3-3-3zM18 3l3 3-3 3-3-3z' fill='${S.bg}'/>`)};background:${pi ? pi + ' 0 0/' + ps + ',' : ''}${bg};--tt:${/u/.test(S.fl) ? 'uppercase' : 'none'};--fs:${/i/.test(S.fl) ? 'italic' : 'normal'}`;
  }
  function pageHTML(w, h, inner, b = 0, cls = '', S = st(), k = 1) {
    return `<div class="dz-pg ${cls} fr-${S.fr} pt-${S.pat}" style="width:${w + 2 * b}mm;height:${h + 2 * b}mm;font-size:${Math.min(w, h) / 100}mm;${vars(S)}"><div class="dz-in" style="inset:${b}mm"><div class="dz-fr"></div><div class="dz-bx" style="font-size:${k}em">${inner}</div></div></div>`;
  }
  // автопідгін: довга назва чи широкий шрифт — уміст пропорційно зменшується, щоб не вилазив за край
  const kc = {};
  function fitK(w, h, inner, S) {
    if (/dz-menu|dz-sheet/.test(inner)) return 1; const key = [w, h, JSON.stringify(S), inner].join('|'); if (kc[key]) return kc[key];
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden'; document.body.append(host);
    let k = 1; for (; k > .5; k -= .04) { host.innerHTML = pageHTML(w, h, inner, 0, '', S, k); const x = host.querySelector('.dz-bx'); if (x.scrollHeight <= x.clientHeight * 1.003 + 1 && x.scrollWidth <= x.clientWidth * 1.003 + 1) break; }
    host.remove(); return kc[key] = +k.toFixed(2);
  }
  const PG = (w, h, inner, b, S = st()) => pageHTML(w, h, inner, b, '', S, fitK(w, h, inner, S));
  const size = () => { const P = PROD[D.prod]; if (P.sz) { const [w, h] = P.sz[tx('size')] || [P.w, P.h]; return [w, h]; } return [P.w, P.h]; };
  const bleed = () => PROD[D.prod].sheet ? 0 : D.bleed ? 3 : 0;

  // ---------- дані закладу ----------
  function data(c) {
    const s = c.site || {}, m = c.menu || { categories: [] }, nm = x => (typeof x === 'object' ? x?.uk : x) || '';
    const menu = m.categories.filter(x => !x.tech && !x.hidden).map(x => ({ id: x.id, name: nm(x.name), items: (x.items || []).filter(i => !i.hidden && !i.off && i.price != null).map(i => ({ n: nm(i.name), p: i.price, d: nm(i.desc), s: i.size || '' })) })).filter(x => x.items.length);
    const all = menu.flatMap(x => x.items), byId = Object.fromEntries(m.categories.flatMap(x => x.items || []).map(i => [i.id, i]));
    return { name: s.name || c.name || 'Заклад', tag: s.tagline || '', phone: s.phone || '', addr: s.addr || '', hours: s.from && s.to ? `щодня ${s.from}–${s.to}` : '', insta: s.insta ? s.insta.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '') : '',
      site: c.pub, logo: '', logoSrc: s.logo ? new URL(s.logo, location.href).href : '', menu, promo: (s.promos || [])[0] || {}, tables: [], staff: [],
      hits: (s.hits || []).map(id => byId[id]).filter(Boolean).map(i => [nm(i.name), i.price]).concat(all.slice(0, 5).map(i => [i.n, i.p])).slice(0, 5) };
  }
  const toData = u => fetch(u).then(r => r.ok ? r.blob() : Promise.reject()).then(b => new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }));

  // ---------- відкрити студію ----------
  async function open(ctx, prod) {
    C = ctx; T = data(ctx); dirty = false; cur = 0;
    D = { prod: prod || 'card', style: 'minimal', ov: null, tx: {}, mine: [], bleed: 1, tab: prod ? 'style' : 'prod', ...((await ctx.vapi('dzGet').catch(() => ({}))).dz || {}) };
    if (prod) D.prod = prod; if (!PROD[D.prod]) D.prod = 'card';
    if (!document.getElementById('dzFonts')) document.head.insertAdjacentHTML('beforeend', `<link id="dzFonts" rel="stylesheet" href="${gf(FONTS)}">`);
    document.body.insertAdjacentHTML('beforeend', `<div id="sb" class="dz"><div class="sb-top"><button type="button" class="btn sm" data-z="close">✕</button><b>🎨 Друк і дизайн</b><span class="sb-sp"></span><button type="button" class="btn sm sb-pvb" data-z="pv">👁 Макет</button><button type="button" class="btn sm" data-z="print" title="Друк або «Зберегти як PDF» (вектор)">🖨<span class="sb-lbl"> Друк</span></button><button type="button" class="btn sm" data-z="png" title="Картинка 300 dpi">🖼<span class="sb-lbl"> PNG</span></button><button type="button" class="btn sm primary" data-z="pdf" title="PDF для друкарні">📄<span class="sb-lbl"> PDF</span></button><button type="button" class="btn sm" id="dzSave" data-z="save">💾</button></div>
      <div class="sb-body"><div class="sb-side"><div class="sb-tabs" id="dzT"></div><div class="sb-p" id="dzP"></div></div><div class="sb-view dz-v"><div class="sb-dev" id="dzN"></div><div class="dz-stage" id="dzV"></div></div></div></div>`);
    document.body.style.overflow = 'hidden'; side(); draw();
    // повільне — фоном: QR-бібліотека, лого (у data:, щоб потрапило в PDF), QR столів, персонал
    lib('qr').then(draw).catch(e => C.toast('⚠️ ' + e.message));
    if (T.logoSrc) toData(T.logoSrc).then(u => { T.logo = u; draw(); side(); }).catch(() => {});
    ctx.vapi('qrInfo').then(r => { T.tables = r.list.map(x => ({ t: x.t, url: x.url })); if (D.prod === 'tent') draw(); }).catch(() => {});
    ctx.vapi('staff').then(r => { T.staff = (r.staff || []).filter(s => !s.off && s.name); if (D.prod === 'badge') draw(); }).catch(() => {});
  }
  function close() { if (dirty && !confirm('Закрити без збереження вибору?')) return; document.getElementById('sb')?.remove(); document.body.style.overflow = ''; C = null; removeEventListener('resize', fit); }
  const touch = () => { dirty = true; document.getElementById('dzSave')?.classList.add('primary'); };

  // ---------- макет ----------
  function draw() {
    if (!C) return; const [w, h] = size(); pages = PROD[D.prod].p(); if (cur >= pages.length) cur = 0;
    document.getElementById('dzV').innerHTML = `<div class="dz-fit">${PG(w, h, pages[cur], bleed() && D.showBleed ? 3 : 0)}</div>`;
    const n = pages.length, lbl = D.prod === 'card' || D.prod === 'cards' ? ['Лице', 'Зворот'][cur] : `${cur + 1} / ${n}`;
    document.getElementById('dzN').innerHTML = `${n > 1 ? `<button data-z="pg" data-d="-1">‹</button><span class="dz-pn">${lbl}</span><button data-z="pg" data-d="1">›</button>` : ''}<span class="dz-pn muted">${w >= 1000 ? w / 10 + '×' + h / 10 + ' см' : w + '×' + h + ' мм'}${n > 1 ? ' · сторінок: ' + n : ''}</span>`;
    fit();
  }
  function fit() { const v = document.getElementById('dzV'), f = v?.querySelector('.dz-fit'), p = f?.firstElementChild; if (!p) return; f.style.transform = ''; const k = Math.min((v.clientWidth - 32) / p.offsetWidth, (v.clientHeight - 32) / p.offsetHeight); f.style.transform = `scale(${k})`; f.style.width = p.offsetWidth * k + 'px'; f.style.height = p.offsetHeight * k + 'px'; }
  addEventListener('resize', () => C && fit());

  // ---------- бічна панель ----------
  const TABS = [['prod', '📦 Виріб'], ['style', '🎨 Стиль'], ['text', '✏️ Тексти'], ['tune', '🛠 Тонко']];
  function side() {
    document.getElementById('dzT').innerHTML = TABS.map(([k, l]) => `<button class="${D.tab === k ? 'on' : ''}" data-z="tab" data-t="${k}">${l}</button>`).join('');
    document.getElementById('dzP').innerHTML = (SIDE[D.tab] || SIDE.prod)();
  }
  const mini = S => pageHTML(90, 50, `<div class="dz-col dz-c dz-cf">${logo('l20')}<div class="dz-name n9">${esc(T.name)}</div><div class="dz-m m4">${esc(S.name)}</div></div>`, 0, '', S);
  const SIDE = {
    prod: () => `<div class="dz-prods">${Object.entries(PROD).map(([k, P]) => `<button class="${D.prod === k ? 'on' : ''}" data-z="prod" data-p="${k}"><b>${P.n}</b><small>${P.d}</small></button>`).join('')}</div>
      <div class="sb-note">Усе береться з даних закладу: назва, лого, контакти, меню, QR столів і персонал. Змінили меню чи контакти — макет оновиться сам.</div>`,
    style: () => { const all = [...STY, ...(D.mine || []).map(s => ({ ...s, g: 'my' }))], S = st();
      return `<div class="sb-row"><button class="btn sm primary" data-z="rnd">🎲 Ще варіант</button><button class="btn sm" data-z="brand">🏷 Мій бренд з лого</button>${D.ov ? '<button class="btn sm" data-z="mine">⭐ Зберегти як свій</button>' : ''}</div>${D.ov ? `<div class="sb-note">Зараз: «${esc(S.name)}» зі змінами${D.ov.rnd ? ' (випадкове поєднання)' : ''}. <a href="#" data-z="reset">Скинути зміни</a></div>` : ''}
        ${Object.entries(GROUPS).map(([g, gl]) => { const l = all.filter(s => s.g === g); return l.length ? `<h4 class="dz-gh">${gl} <small>${l.length}</small></h4><div class="dz-sty">${l.map(s => `<button class="${D.style === s.id && !D.ov ? 'on' : D.style === s.id ? 'half' : ''}" data-z="sty" data-s="${s.id}">${mini(s)}<span>${esc(s.name)}${g === 'my' ? ` <i data-z="mineDel" data-s="${s.id}">✕</i>` : ''}</span></button>`).join('')}</div>` : ''; }).join('')}`; },
    text: () => { const P = PROD[D.prod];
      return `<div class="sb-card"><h4>${P.n}</h4>${P.f.map(([k, l, def, t, o]) => { const v = esc(tx(k)), name = `data-zf="${k}"`;
        if (t === 's') return `<label class="sb-f">${l}<select ${name}>${o.map(x => { const [a, b] = Array.isArray(x) ? x : [x, x]; return `<option value="${a}" ${tx(k) === a ? 'selected' : ''}>${b}</option>`; }).join('')}</select></label>`;
        if (t === 'a') return `<label class="sb-f">${l}<textarea ${name} rows="3" placeholder="${esc(hint(k))}">${v}</textarea></label>`;
        if (t === 'cats') return `<div class="sb-f">Розділи меню<div class="sb-chips">${T.menu.map(c => `<button class="${!tx(k) || tx(k).split(',').includes(c.id) ? 'on' : ''}" data-z="cat" data-c="${c.id}">${esc(c.name)}</button>`).join('')}</div></div>`;
        return `<label class="sb-f">${l}<input ${name} value="${v}" placeholder="${esc(hint(k))}"></label>`; }).join('')}</div>
        <div class="sb-note">Назва, лого й контакти — з налаштувань закладу (🏪 Заклад і каса, 🌐 Сайт). Порожнє поле — береться звідти.</div>`; },
    tune: () => { const S = st();
      return `<div class="sb-card"><h4>🎨 Кольори</h4><div class="sb-cols">${[['bg', 'Фон'], ['fg', 'Текст'], ['ac', 'Акцент']].map(([k, l]) => `<label class="sb-col"><input type="color" data-zc="${k}" value="${S[k]}">${l}</label>`).join('')}</div></div>
        <div class="sb-card"><h4>🔤 Шрифти</h4><div class="sb-tr"><label class="sb-f">Заголовки<select data-zo="fh">${FONTS.map(f => `<option ${S.fh === f ? 'selected' : ''} style="font-family:${FF(f)}">${f}</option>`).join('')}</select></label><label class="sb-f">Текст<select data-zo="fb">${FONTS.map(f => `<option ${S.fb === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label></div>
          <label class="sb-tg"><input type="checkbox" data-zfl="u" ${/u/.test(S.fl) ? 'checked' : ''}> ВЕЛИКІ ЛІТЕРИ в заголовках</label><label class="sb-tg"><input type="checkbox" data-zfl="i" ${/i/.test(S.fl) ? 'checked' : ''}> Курсив у заголовках</label></div>
        <div class="sb-card"><h4>🧩 Візерунок</h4><div class="sb-chips">${Object.entries(PAT).map(([k, [l]]) => `<button class="${S.pat === k ? 'on' : ''}" data-z="ov" data-k="pat" data-v="${k}">${l}</button>`).join('')}</div></div>
        <div class="sb-card"><h4>🖼 Рамка</h4><div class="sb-chips">${Object.entries(FRAMES).map(([k, l]) => `<button class="${S.fr === k ? 'on' : ''}" data-z="ov" data-k="fr" data-v="${k}">${l}</button>`).join('')}</div></div>
        <div class="sb-card"><h4>✂️ Для друкарні</h4><label class="sb-tg"><input type="checkbox" data-zb="bleed" ${D.bleed ? 'checked' : ''}> PDF з полями 3 мм під обріз</label><label class="sb-tg"><input type="checkbox" data-zb="showBleed" ${D.showBleed ? 'checked' : ''}> Показати поля на макеті</label>
          <div class="sb-note">Друкарні зазвичай просять PDF з полями під обріз — фон заходить за край, щоб після різання не лишилось білої смужки. «🖨 Друк» — без полів, для свого принтера.</div></div>`; },
  };
  const hint = k => ({ head: D.prod === 'flyer' ? T.promo.t || T.tag || 'Щасливі години 15:00–17:00' : D.prod === 'rollup' ? T.tag : '', text: D.prod === 'flyer' ? T.promo.d || '−20% на коктейлі' : '', tag: T.tag, hits: T.hits.map(h => h[0]).join(', '), right: T.phone }[k] || '');

  // ---------- 🎲 випадкове поєднання, 🏷 бренд з лого ----------
  const any = a => a[Math.floor(Math.random() * a.length)];
  function random() {
    const p = any(STY), f = any(STY), dark = lum(p.bg) < .5, ok = Object.keys(PAT).filter(k => k !== 'sun' || Math.random() < .3);
    D.style = p.id; D.ov = { rnd: 1, name: 'Мікс', fh: any([f.fh, any(FONTS)]), fb: any([f.fb, 'Inter', 'Onest', 'Raleway', 'PT Serif', 'Montserrat']), pat: any(ok), fr: any(Object.keys(FRAMES)), fl: any(['u', '', 'i', 'u']), ...(Math.random() < .3 ? { ac: any(STY.filter(s => (lum(s.bg) < .5) === dark)).ac } : {}) };
  }
  async function brand() {
    if (!T.logo) return C.toast('Спершу додайте логотип: 🏪 Заклад і каса → лого');
    const im = new Image(); im.src = T.logo; await im.decode(); const c = document.createElement('canvas'), k = 64; c.width = c.height = k; const x = c.getContext('2d'); x.drawImage(im, 0, 0, k, k);
    const px = x.getImageData(0, 0, k, k).data, box = {};
    for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 128) continue; const [r, g, b] = [px[i], px[i + 1], px[i + 2]], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0; const key = [r, g, b].map(v => v >> 5).join(); (box[key] ||= { n: 0, r: 0, g: 0, b: 0, s: sat, l: (mx + mn) / 510 }).n++; Object.assign(box[key], { r: box[key].r + r, g: box[key].g + g, b: box[key].b + b }); }
    const L = Object.values(box).map(o => ({ ...o, h: '#' + [o.r, o.g, o.b].map(v => Math.round(v / o.n).toString(16).padStart(2, '0')).join('') })).sort((a, b) => b.n - a.n);
    const ac = (L.filter(o => o.s > .35 && o.l > .15 && o.l < .85).sort((a, b) => b.n * b.s - a.n * a.s)[0] || L[0])?.h || '#c0392b', dark = L[0] && L[0].l < .35;
    D.style = 'minimal'; D.ov = { name: 'Мій бренд', bg: dark ? '#111111' : '#ffffff', fg: dark ? '#f5f5f5' : '#151515', ac, fh: 'Montserrat', fb: 'Inter', pat: 'none', fr: 'line', fl: 'u' };
  }

  // ---------- експорт ----------
  const fcss = {};
  async function fontCSS(list) { // шрифти — усередину картинки (інакше в PNG/PDF буде запасний шрифт)
    const css = await (await fetch(gf(list))).text(), out = [];
    for (const blk of css.split('}').filter(b => /unicode-range:[^;]*(U\+0000|U\+0400|U\+0301)/i.test(b))) { const u = blk.match(/url\((.+?)\)/)?.[1]; if (!u) continue; fcss[u] ||= await toData(u).catch(() => ''); out.push(blk.replace(u, fcss[u]) + '}'); }
    return out.join('\n');
  }
  async function render(fmt) {
    if (busy) return; busy = true; const S = st(), [w, h] = size(), b = fmt === 'pdf' ? bleed() : 0, list = pages;
    C.toast(list.length > 3 ? `⏳ Готую ${list.length} сторінок…` : '⏳ Готую файл…');
    try {
      await Promise.all([lib('h2i'), fmt === 'pdf' && lib('pdf'), lib('qr')]); await document.fonts.ready;
      const fontEmbedCSS = await fontCSS([S.fh, S.fb]).catch(() => ''), mmPx = 96 / 25.4, longPx = Math.max(w, h) * mmPx, pr = Math.min(300 / 96, 9000 / longPx);
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0'; document.body.append(host);
      const name = `${T.name} — ${PROD[D.prod].n.replace(/^\S+ /, '')}`.replace(/[\\/:*?"<>|]/g, '');
      let pdf;
      for (let i = 0; i < (fmt === 'png' ? 1 : list.length); i++) {
        host.innerHTML = PG(w, h, list[fmt === 'png' ? cur : i], b, S); const el = host.firstElementChild;
        const url = await (fmt === 'pdf' ? htmlToImage.toJpeg(el, { pixelRatio: pr, quality: .93, fontEmbedCSS }) : htmlToImage.toPng(el, { pixelRatio: pr, fontEmbedCSS }));
        if (fmt === 'png') { dl(url, name + (list.length > 1 ? ' ' + (cur + 1) : '') + '.png'); break; }
        const W = w + 2 * b, H = h + 2 * b; if (!pdf) pdf = new jspdf.jsPDF({ unit: 'mm', format: [W, H], orientation: W > H ? 'l' : 'p' }); else pdf.addPage([W, H], W > H ? 'l' : 'p');
        pdf.addImage(url, 'JPEG', 0, 0, W, H, undefined, 'FAST');
      }
      host.remove(); if (pdf) pdf.save(name + '.pdf');
      C.toast(fmt === 'pdf' ? `✅ PDF готовий${b ? ' · з полями 3 мм під обріз' : ''}` : '✅ PNG готовий (300 dpi)');
    } catch (e) { C.toast('⚠️ ' + (e.message || 'Не вдалося зберегти')); } finally { busy = false; }
  }
  const dl = (u, n) => { const a = document.createElement('a'); a.href = u; a.download = n; document.body.append(a); a.click(); a.remove(); };
  function print() { // вектор: браузер друкує або зберігає PDF; розмір аркуша = розмір виробу
    const S = st(), [w, h] = size(), wn = open_(); if (!wn) return C.toast('⚠️ Дозвольте спливаючі вікна для друку');
    wn.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(T.name)}</title><link rel="stylesheet" href="${gf([S.fh, S.fb])}"><link rel="stylesheet" href="${new URL('css/owner.css', location.href).href}"><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;background:#fff!important}.dz-pg{break-after:page}</style></head><body>${pages.map(p => PG(w, h, p, 0, S)).join('')}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))<\/script></body></html>`);
    wn.document.close();
  }
  const open_ = () => window.open('', '_blank');

  // ---------- кліки й поля ----------
  document.addEventListener('click', async e => {
    if (!C || !e.target.closest('#sb.dz')) return; const b = e.target.closest('[data-z]'); if (!b) return; e.preventDefault(); const z = b.dataset.z;
    if (z === 'close') return close();
    if (z === 'pv') { const s = document.getElementById('sb'); s.classList.toggle('pv'); b.textContent = s.classList.contains('pv') ? '✏️ Налаштувати' : '👁 Макет'; return fit(); }
    if (z === 'tab') { D.tab = b.dataset.t; return side(); }
    if (z === 'pg') { cur = (cur + +b.dataset.d + pages.length) % pages.length; return draw(); }
    if (z === 'prod') { D.prod = b.dataset.p; cur = 0; touch(); side(); draw(); if (innerWidth <= 900) document.querySelector('[data-z=pv]')?.click(); return; }
    if (z === 'sty') { D.style = b.dataset.s; D.ov = null; touch(); side(); return draw(); }
    if (z === 'rnd') { random(); touch(); side(); return draw(); }
    if (z === 'brand') { try { await brand(); } catch { return C.toast('⚠️ Не вдалося прочитати кольори лого'); } touch(); side(); return draw(); }
    if (z === 'reset') { D.ov = null; touch(); side(); return draw(); }
    if (z === 'mine') { const n = prompt('Назва свого стилю', 'Мій стиль ' + ((D.mine || []).length + 1)); if (!n) return; const s = { ...st(), id: 'm' + Date.now().toString(36), name: n.slice(0, 30), g: 'my' }; delete s.rnd; D.mine = [...(D.mine || []), s].slice(-24); D.style = s.id; D.ov = null; touch(); side(); return C.toast('⭐ Додано в «Мої стилі» — натисніть 💾, щоб зберегти'); }
    if (z === 'mineDel') { e.stopPropagation(); D.mine = D.mine.filter(s => s.id !== b.dataset.s); if (D.style === b.dataset.s) D.style = 'minimal'; touch(); side(); return draw(); }
    if (z === 'ov') { D.ov = { ...(D.ov || {}), [b.dataset.k]: b.dataset.v }; touch(); side(); return draw(); }
    if (z === 'cat') { const all = T.menu.map(c => c.id), on = new Set(tx('cats') ? tx('cats').split(',') : all); on.has(b.dataset.c) ? on.delete(b.dataset.c) : on.add(b.dataset.c); D.tx['menu.cats'] = on.size === all.length ? '' : all.filter(x => on.has(x)).join(','); touch(); side(); return draw(); }
    if (z === 'save') { try { const { tab, ...dz } = D; await C.vapi('dzSet', { dz }); dirty = false; b.classList.remove('primary'); C.toast('💾 Збережено — відкриється з цим стилем на будь-якому пристрої'); } catch (y) { C.toast('⚠️ ' + y.message); } return; }
    if (z === 'pdf' || z === 'png') return render(z);
    if (z === 'print') return print();
  });
  let tm; document.addEventListener('input', e => {
    if (!C || !e.target.closest('#sb.dz')) return; const t = e.target, d = t.dataset;
    if (d.zf) D.tx[D.prod + '.' + d.zf] = t.value;
    else if (d.zc) D.ov = { ...(D.ov || {}), [d.zc]: t.value, bg2: d.zc === 'bg' ? undefined : st().bg2 };
    else if (d.zo) D.ov = { ...(D.ov || {}), [d.zo]: t.value };
    else if (d.zfl) { const f = (st().fl || '').replace(d.zfl, ''); D.ov = { ...(D.ov || {}), fl: t.checked ? f + d.zfl : f }; }
    else if (d.zb) D[d.zb] = t.checked ? 1 : 0;
    else return;
    touch(); clearTimeout(tm); tm = setTimeout(draw, t.tagName === 'SELECT' || t.type === 'checkbox' ? 0 : 200);
  });
  return { open, PROD, STY };
})();
