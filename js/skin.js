// 🖌 Спільний рушій стилю (конструктор) для каси й кабінету власника. Без data-skin — «Стара каса», css/skin.css нічого не чіпає.
window.VVSkin = (() => {
  const BASE = { acc: '', bg: 'theme', contrast: 5, muted: 5, bgfx: 'none', r: 18, rb: 14, shape: 'auto', h: 48, pad: 16, gap: 10, card: 'solid', shadow: 'none', border: 'none', caps: false, font: '', fonth: 'same', fs: 15, hw: 800, prim: 'fill', sec: 'fill', seg: 'dark', tabs: 'seg', tbl: 'gold', nav: 'bar', navn: '8', navon: 'accent', navlbl: true, modal: 'center', anim: true, win: 'none' };
  const PRE = {
    varvar: ['⭐ VARVAR', 'ваш стиль: світіння, Rubik, плаваюче меню', { bgfx: 'glow', r: 22, rb: 17, h: 42, pad: 11, gap: 11, shadow: 'soft', caps: true, font: 'rubik', fonth: 'rubik', fs: 14, hw: 700, nav: 'float' }],
    // 💎 готові теми — кожна з власною формою вікон, кольором, шрифтом і меню
    noir: ['🖤 Нуар і золото', 'кутики, Prata, золото', { bg: 'amoled', acc: '#d4af37', win: 'brackets', r: 0, rb: 0, shape: 'square', h: 46, card: 'outline', border: 'accent', caps: true, font: 'jost', fonth: 'prata', hw: 500, prim: 'outline', sec: 'ghost', seg: 'line', tabs: 'line', tbl: 'frame', nav: 'bar', navon: 'text', modal: 'center' }],
    deco: ['🏛 Ар-деко', 'подвійна рамка, Гетсбі', { bg: 'black', acc: '#c9a45c', win: 'deco', r: 0, rb: 2, h: 46, pad: 18, card: 'solid', caps: true, font: 'jost', fonth: 'prata', hw: 600, prim: 'outline', sec: 'outline', seg: 'line', tabs: 'line', tbl: 'frame', navon: 'dark' }],
    neon: ['🌃 Неон', 'світні контури, Unbounded', { bg: 'blue', acc: '#00e5ff', win: 'neon', bgfx: 'glow', r: 14, rb: 12, card: 'glass', shadow: 'glow', font: 'onest', fonth: 'unbounded', hw: 700, prim: 'grad', sec: 'outline', seg: 'accent', tabs: 'pill', tbl: 'fill', nav: 'float', navon: 'accent' }],
    cyber: ['⚡ Кіберпанк', 'зрізані кути, Tektur', { bg: 'plum', acc: '#ff2fb3', win: 'cut', bgfx: 'glow', r: 0, rb: 0, shape: 'square', h: 44, card: 'grad', border: 'accent', caps: true, font: 'tektur', fonth: 'tektur', hw: 700, prim: 'fill', sec: 'outline', seg: 'accent', tabs: 'line', tbl: 'fill', navon: 'accent' }],
    glass: ['🫧 Рідке скло', 'матове скло, капсули', { bg: 'navy', acc: '#8cf1ff', win: 'glass', bgfx: 'glow', r: 26, rb: 22, shape: 'pill', h: 48, pad: 18, gap: 12, card: 'glass', shadow: 'soft', font: 'manrope', fonth: 'unbounded', hw: 600, prim: 'grad', sec: 'ghost', seg: 'white', tabs: 'pill', tbl: 'dot', nav: 'float', navon: 'dark', modal: 'sheet' }],
    brutal: ['⬛ Бруталізм', 'товсті рамки, тінь-зсув', { bg: 'graphite', acc: '#ff4f00', win: 'brutal', r: 0, rb: 0, shape: 'square', h: 50, gap: 14, card: 'solid', caps: true, font: 'golos', fonth: 'unbounded', hw: 900, prim: 'fill', sec: 'outline', seg: 'accent', tabs: 'seg', tbl: 'fill', navon: 'accent', anim: false }],
    ticket: ['🎟 Кіно-квиток', 'вирізи по боках, Oswald', { bg: 'cherry', acc: '#f5c04a', win: 'ticket', r: 10, rb: 10, h: 46, card: 'grad', shadow: 'deep', caps: true, font: 'jost', fonth: 'oswald', hw: 700, prim: 'fill', sec: 'fill', seg: 'accent', tabs: 'pill', tbl: 'gold', nav: 'bar', navon: 'accent' }],
    arch: ['⛷ Шале', 'арки, дерево, тепло', { bg: 'espresso', acc: '#e8b25c', win: 'arch', bgfx: 'vignette', r: 20, rb: 16, shape: 'pill', h: 46, pad: 18, card: 'grad', shadow: 'soft', font: 'nunito', fonth: 'prata', hw: 600, prim: 'grad', sec: 'fill', seg: 'white', tabs: 'pill', tbl: 'gold', nav: 'float', navon: 'dark', modal: 'sheet' }],
    leaf: ['🌿 Листок', 'діагональні кути, зелень', { bg: 'green', acc: '#7ddc8f', win: 'leaf', r: 30, rb: 18, h: 46, card: 'solid', shadow: 'soft', font: 'manrope', fonth: 'manrope', hw: 800, prim: 'fill', sec: 'ghost', seg: 'white', tabs: 'pill', tbl: 'dot', nav: 'float', navon: 'accent' }],
    bubble: ['💬 Бульбашки', 'як у месенджері', { bg: 'graphite', acc: '#7aa7ff', win: 'bubble', r: 24, rb: 22, shape: 'pill', h: 44, card: 'solid', font: 'inter', fonth: 'inter', hw: 700, prim: 'fill', sec: 'fill', seg: 'white', tabs: 'pill', tbl: 'fill', nav: 'float', navon: 'dark', modal: 'sheet' }],
    sketch: ['✏️ Від руки', 'намальовані рамки', { bg: 'slate', acc: '#f6e27a', win: 'sketch', r: 14, rb: 14, h: 46, card: 'outline', font: 'comfortaa', fonth: 'comfortaa', hw: 700, prim: 'outline', sec: 'ghost', seg: 'line', tabs: 'line', tbl: 'frame', navon: 'text' }],
    folder: ['🗂 Папки', 'вкладки-закладки, ділово', { bg: 'blue', acc: '#5b8cff', win: 'folder', r: 16, rb: 10, h: 44, gap: 12, card: 'solid', shadow: 'soft', font: 'inter', fonth: 'montserrat', hw: 800, prim: 'fill', sec: 'fill', seg: 'dark', tabs: 'seg', tbl: 'fill', navon: 'dark' }],
    notch: ['📐 Загнутий кут', 'технічно, Exo 2', { bg: 'petrol', acc: '#3ddc97', win: 'notch', r: 6, rb: 6, shape: 'square', h: 44, card: 'solid', border: 'hair', caps: true, font: 'exo', fonth: 'exo', hw: 800, prim: 'fill', sec: 'outline', seg: 'line', tabs: 'line', tbl: 'dot', navon: 'accent' }],
    frame: ['🖼 Галерея', 'рамка з відступом, мінімал', { bg: 'amoled', acc: '#ffffff', win: 'frame', r: 2, rb: 0, shape: 'square', h: 46, pad: 18, gap: 16, card: 'solid', font: 'jost', fonth: 'jost', hw: 500, caps: true, prim: 'outline', sec: 'ghost', seg: 'line', tabs: 'line', tbl: 'frame', navlbl: false, navon: 'text' }],
    pillw: ['💊 Капсули', 'все кругле, яскраво', { bg: 'plum', acc: '#ff8a3d', win: 'pill', r: 34, rb: 30, shape: 'pill', h: 50, pad: 20, card: 'grad', shadow: 'deep', font: 'nunito', fonth: 'nunito', hw: 900, prim: 'grad', sec: 'fill', seg: 'accent', tabs: 'pill', tbl: 'fill', nav: 'float', navon: 'accent', modal: 'sheet' }],
    wine: ['🍷 Винотека', 'бордо, Prata, тонкі лінії', { bg: 'wine', acc: '#c4935f', win: 'none', r: 4, rb: 4, h: 46, card: 'grad', border: 'accent', font: 'jost', fonth: 'prata', hw: 500, caps: true, prim: 'outline', sec: 'ghost', seg: 'line', tabs: 'line', tbl: 'gold', navon: 'text', modal: 'full' }],
    terminal: ['💻 Термінал', 'кутики, зелений код', { bg: 'amoled', acc: '#3ddc84', win: 'brackets', r: 0, rb: 0, shape: 'square', h: 42, pad: 14, gap: 8, card: 'solid', font: 'tektur', fonth: 'tektur', fs: 14, hw: 600, prim: 'outline', sec: 'ghost', seg: 'line', tabs: 'line', tbl: 'dot', navlbl: false, navon: 'text', anim: false }],
    big: ['👆 Великі кнопки', 'для швидкої роботи пальцем', { bg: 'black', acc: '#ffb340', win: 'none', r: 20, rb: 18, h: 56, pad: 20, gap: 14, card: 'solid', shadow: 'soft', font: 'manrope', fonth: 'manrope', fs: 17, hw: 900, prim: 'fill', sec: 'fill', seg: 'white', tabs: 'seg', tbl: 'fill', nav: 'bar', navon: 'dark' }],
  };
  const THEMES = { /* 🎨 палітри каси й кабінету */
    night: ['🌑 Ніч (стандарт)', { bg: '#0b0b0d', bg2: '#151518', card: '#1c1c1f', card2: '#26262a', text: '#f5f5f7', muted: '#8e8e93', accent: '#f2c14e', 'accent-ink': '#1a1400' }],
    beet: ['🍷 Буряк', { bg: '#120609', bg2: '#1c0a10', card: '#261019', card2: '#341824', text: '#fbeff3', muted: '#a8848f', accent: '#e0457b', 'accent-ink': '#fff' }],
    ocean: ['🌊 Океан', { bg: '#06101a', bg2: '#0b1a29', card: '#102236', card2: '#173049', text: '#eef6ff', muted: '#7f98b3', accent: '#3fb6ff', 'accent-ink': '#00121f' }],
    forest: ['🌲 Ліс', { bg: '#07110b', bg2: '#0d1a12', card: '#13241a', card2: '#1b3224', text: '#eefaf2', muted: '#83a08e', accent: '#5ed68a', 'accent-ink': '#04210f' }],
    violet: ['🔮 Фіалка', { bg: '#0d0916', bg2: '#151024', card: '#1d1631', card2: '#291f44', text: '#f4f0ff', muted: '#9a8fb8', accent: '#a98bff', 'accent-ink': '#14082e' }],
    coffee: ['☕ Кава', { bg: '#120d09', bg2: '#1b140f', card: '#251c15', card2: '#32261d', text: '#f8efe6', muted: '#a8958a', accent: '#d9a066', 'accent-ink': '#2a1806' }],
    graphite: ['⚫ Графіт', { bg: '#161618', bg2: '#1e1e21', card: '#28282c', card2: '#333338', text: '#ffffff', muted: '#9b9ba1', accent: '#ffffff', 'accent-ink': '#000' }],
    amoled: ['🖤 Чорний AMOLED', { bg: '#000', bg2: '#050505', card: '#0e0e0e', card2: '#1a1a1a', text: '#fff', muted: '#888', accent: '#ffd60a', 'accent-ink': '#000' }],
    sunset: ['🌅 Захід', { bg: '#140a06', bg2: '#1f100a', card: '#2a160e', card2: '#3a2014', text: '#fff3ea', muted: '#b39282', accent: '#ff7a45', 'accent-ink': '#2a0c00' }],
    mint: ['🍃 М\'ята', { bg: '#071312', bg2: '#0c1d1b', card: '#112826', card2: '#183633', text: '#ecfffb', muted: '#80a7a1', accent: '#4fe3c1', 'accent-ink': '#00241c' }],
  };
  const BG = { wine: ['#120609', '#1a0a0e', '#241015', '#33171e'], navy: ['#070b18', '#0c1224', '#141c33', '#1d2744'], plum: ['#0e0814', '#150c1e', '#20132c', '#2c1b3c'], espresso: ['#0f0a07', '#17100b', '#221811', '#2e2118'], slate: ['#141a18', '#1a221f', '#232d29', '#2e3a35'], petrol: ['#061214', '#0a1a1d', '#112629', '#183337'], cherry: ['#120607', '#1a090b', '#260e10', '#341417'], black: ['#0b0b0d', '#151518', '#1c1c1f', '#26262a'], amoled: ['#000000', '#08080a', '#141416', '#1f1f22'], graphite: ['#131317', '#18181d', '#1f1f25', '#2a2a32'], blue: ['#0a0e16', '#0e1420', '#161c28', '#202838'], warm: ['#100d0a', '#16120e', '#1f1a15', '#2b241d'], green: ['#0a100d', '#0e1612', '#16201b', '#1f2c25'] };
  const FONT = { rubik: 'Rubik', manrope: 'Manrope', montserrat: 'Montserrat', nunito: 'Nunito', inter: 'Inter', roboto: 'Roboto', comfortaa: 'Comfortaa', pt: 'PT Sans', unbounded: 'Unbounded', oswald: 'Oswald', jost: 'Jost', onest: 'Onest', tektur: 'Tektur', exo: 'Exo 2', prata: 'Prata', golos: 'Golos Text' };
  const SYS = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';
  const VARS = ['--sk-r', '--sk-rb', '--sk-h', '--sk-pad', '--sk-gap', '--sk-fs', '--sk-hw', '--sk-fh', '--sk-shadow', '--sk-border'];
  // K — повний набір (BASE + зміни) або null = стара каса. Тема (кольори) ставиться ДО виклику — тут лише поверх неї.
  function apply(K, save = true) {
    const h = document.documentElement, r = h.style;
    for (const n of [...h.attributes].map(a => a.name).filter(n => n.startsWith('data-sk'))) h.removeAttribute(n);
    for (const v of VARS) r.removeProperty(v);
    if (save) try { localStorage.setItem('vv_skin_cur', JSON.stringify(K ? diff(K) : null)); } catch {}
    if (!K) return;
    h.setAttribute('data-skin', '1');
    for (const k of ['win', 'bgfx', 'shape', 'card', 'prim', 'sec', 'seg', 'tabs', 'tbl', 'nav', 'navn', 'navon', 'modal']) h.setAttribute('data-sk-' + k, K[k]);
    for (const k of ['caps', 'navlbl']) h.setAttribute('data-sk-' + k, K[k] ? '1' : '0');
    const px = (n, v) => r.setProperty(n, v + 'px'); px('--sk-r', K.r); px('--sk-rb', K.rb); px('--sk-h', K.h); px('--sk-pad', K.pad); px('--sk-gap', K.gap); px('--sk-fs', K.fs); r.setProperty('--sk-hw', K.hw);
    r.setProperty('--r', K.r + 'px'); r.setProperty('--r2', (K.r + 4) + 'px');
    r.setProperty('--sk-shadow', { none: 'none', soft: '0 1px 0 #ffffff08 inset, 0 8px 22px #00000055', deep: '0 14px 34px #000000a0', glow: '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 10px 30px color-mix(in srgb, var(--accent) 18%, transparent)' }[K.shadow] || 'none');
    r.setProperty('--sk-border', { none: '0', hair: '1px solid var(--line)', accent: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }[K.border] || '0');
    if (K.acc) r.setProperty('--accent', K.acc);
    const B = BG[K.bg]; if (B) { r.setProperty('--bg', B[0]); r.setProperty('--bg2', B[1]); r.setProperty('--card', B[2]); r.setProperty('--card2', B[3]); }
    if (K.contrast !== 5) { const c = (K.contrast - 5) * 2, base = B ? B[2] : getComputedStyle(h).getPropertyValue('--card').trim() || '#1c1c1f'; r.setProperty('--card', `color-mix(in srgb, ${base} ${100 - Math.abs(c)}%, ${c > 0 ? '#ffffff' : '#000000'} ${Math.abs(c)}%)`); }
    if (K.muted !== 5) r.setProperty('--muted', `hsl(240 4% ${40 + K.muted * 4}%)`);
    for (const f of [FONT[K.font], FONT[K.fonth]].filter(Boolean)) { const id = 'gf-' + f.replace(/ /g, ''); if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`; document.head.appendChild(l); } }
    if (FONT[K.font]) r.setProperty('--font', `"${FONT[K.font]}", ${SYS}`); else if (K.font === 'system') r.setProperty('--font', SYS);
    r.setProperty('--sk-fh', K.fonth !== 'same' && FONT[K.fonth] ? `"${FONT[K.fonth]}", ${SYS}` : 'var(--font)');
    document.body?.classList.toggle('noanim', !K.anim || document.body.classList.contains('noanim-own'));
  }
  const diff = K => Object.fromEntries(Object.entries(K).filter(([k, v]) => BASE[k] !== v));
  const full = d => d ? { ...BASE, ...d } : null;
  const parse = t => { const j = JSON.parse(String(t).slice(String(t).indexOf('{'))); const K = Object.fromEntries(Object.entries(j).filter(([k]) => k in BASE)); return Object.keys(K).length ? K : null; };
  const last = () => { try { return JSON.parse(localStorage.getItem('vv_skin_cur') || 'null'); } catch { return null; } };
  /* 🎨 конструктор стилю каси (HTML + оживлення) — спільний для каси й кабінету власника */
  function editorHTML(K) {
    const ch = (k, l, o) => `<div class="o"><span>${l}</span><div class="ch" data-k="${k}">${o.map(([v, t]) => `<button data-v="${v}" class="${String(K[k]) === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>`;
    const rg = (k, l, a, b, st = 1) => `<div class="o"><span>${l}</span><div class="rg"><input type="range" data-k="${k}" min="${a}" max="${b}" step="${st}" value="${K[k]}"><output>${K[k]}</output></div></div>`;
    const tg = (k, l) => `<label class="kv" style="cursor:pointer"><span>${l}</span><input type="checkbox" data-k="${k}" ${K[k] ? 'checked' : ''} style="width:auto"></label>`;
    const FN = [['', 'Як у темі'], ['system', 'Системний'], ['rubik', 'Rubik'], ['manrope', 'Manrope'], ['montserrat', 'Montserrat'], ['nunito', 'Nunito'], ['inter', 'Inter'], ['jost', 'Jost'], ['onest', 'Onest'], ['golos', 'Golos'], ['exo', 'Exo 2'], ['tektur', 'Tektur'], ['oswald', 'Oswald'], ['unbounded', 'Unbounded'], ['prata', 'Prata'], ['comfortaa', 'Comfortaa']];
    const body = `<div class="skc">
      <h4>🎨 Кольори</h4>${ch('bg', 'Фон', [['theme', 'Як у темі'], ['black', 'Чорний'], ['amoled', 'AMOLED'], ['graphite', 'Графіт'], ['blue', 'Синюватий'], ['warm', 'Теплий'], ['green', 'Зеленуватий'], ['wine', 'Бордо'], ['navy', 'Нічний синій'], ['plum', 'Сливовий'], ['espresso', 'Еспресо'], ['slate', 'Сланець'], ['petrol', 'Петроль'], ['cherry', 'Вишневий']])}
      <div class="o"><span>Акцент</span><div class="ch" data-k="acc">${['', '#f2c14e', '#ffb340', '#ff8a3d', '#ff5a5f', '#e879a6', '#a78bfa', '#7aa7ff', '#3ddc97'].map(c => `<button data-v="${c}" class="${K.acc === c ? 'on' : ''}" style="${c ? `background:${c};` : ''}min-width:30px">${c ? '&nbsp;' : 'Як у темі'}</button>`).join('')}</div></div>
      ${rg('contrast', 'Контраст карток', 0, 10)}${rg('muted', 'Яскравість сірого тексту', 0, 10)}${ch('bgfx', 'Ефект фону', [['none', 'Немає'], ['glow', 'Світіння'], ['vignette', 'Віньєтка']])}
      <h4>🔷 Форма</h4>${ch('win', 'Форма вікон', [['none', 'Звичайні'], ['arch', 'Арка'], ['ticket', 'Квиток'], ['cut', 'Зрізані кути'], ['notch', 'Загнутий кут'], ['leaf', 'Листок'], ['bubble', 'Бульбашка'], ['pill', 'Капсула'], ['sketch', 'Від руки'], ['brutal', 'Брутал'], ['deco', 'Ар-деко'], ['neon', 'Неон'], ['glass', 'Скло'], ['frame', 'Рамка'], ['folder', 'Папка'], ['brackets', 'Кутики']])}${rg('r', 'Заокруглення карток', 0, 30)}${rg('rb', 'Заокруглення кнопок', 0, 26)}${ch('shape', 'Форма кнопок', [['auto', 'За повзунком'], ['pill', 'Пілюля'], ['square', 'Квадратні']])}
      ${rg('h', 'Висота кнопок', 36, 56)}${rg('pad', 'Відступи в картках', 8, 22)}${rg('gap', 'Проміжки між блоками', 4, 18)}
      <h4>🗂 Картки</h4>${ch('card', 'Заливка', [['solid', 'Суцільна'], ['grad', 'Градієнт'], ['glass', 'Скло'], ['outline', 'Контур']])}${ch('shadow', 'Тінь', [['none', 'Немає'], ['soft', 'Мʼяка'], ['deep', 'Глибока'], ['glow', 'Світіння']])}${ch('border', 'Рамка', [['none', 'Немає'], ['hair', 'Тонка'], ['accent', 'Акцент']])}${tg('caps', 'Заголовки карток великими літерами')}
      <h4>🔤 Шрифт</h4>${ch('font', 'Основний', FN)}${ch('fonth', 'Заголовки й суми', [['same', 'Як основний'], ...FN.slice(2)])}${rg('fs', 'Розмір тексту', 13, 18)}${rg('hw', 'Жирність заголовків', 500, 900, 100)}
      <h4>🔘 Кнопки й перемикачі</h4>${ch('prim', 'Головна кнопка', [['fill', 'Заливка'], ['grad', 'Градієнт'], ['outline', 'Контур']])}${ch('sec', 'Звичайні кнопки', [['fill', 'Заливка'], ['outline', 'Контур'], ['ghost', 'Прозорі']])}
      ${ch('seg', 'Перемикач', [['dark', 'Темний'], ['white', 'Білі пілюлі'], ['accent', 'Акцентний'], ['line', 'Підкреслення']])}${ch('tabs', 'Вкладки розділу', [['seg', 'Сегмент'], ['pill', 'Пілюлі'], ['line', 'Підкреслення']])}
      <h4>🪑 Зал і меню</h4>${ch('tbl', 'Зайнятий стіл', [['gold', 'Золотий'], ['fill', 'Заливка'], ['frame', 'Рамка'], ['dot', 'Крапка']])}
      ${ch('nav', 'Нижнє меню', [['bar', 'Прикріплене'], ['float', 'Плаваюче']])}${ch('navon', 'Активний пункт', [['accent', 'Акцент'], ['dark', 'Плашка'], ['text', 'Лише колір']])}${tg('navlbl', 'Підписи під іконками')}
      ${ch('modal', 'Вікна на телефоні', [['center', 'По центру'], ['sheet', 'Знизу'], ['full', 'На весь екран']])}${tg('anim', 'Анімації')}</div>`;
    return body;
  }
  function bind(box, K, upd) {
    box.addEventListener('click', e => { const b = e.target.closest('.ch button'); if (!b) return; e.preventDefault(); const g = b.parentElement, k = g.dataset.k; K[k] = b.dataset.v; g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); upd(K); });
    box.addEventListener('input', e => { const i = e.target; if (!i.dataset.k) return; K[i.dataset.k] = i.type === 'checkbox' ? i.checked : +i.value; if (i.nextElementSibling) i.nextElementSibling.textContent = i.value; upd(K); });
  }
  function colors(t, a) { const T = (THEMES[t] || THEMES.night)[1], r = document.documentElement.style; for (const [k, v] of Object.entries(T)) r.setProperty('--' + k, v); if (a) r.setProperty('--accent', a); }
  const saveCol = c => { try { localStorage.setItem('vv_col_cur', JSON.stringify(c)); } catch {} };
  const lastCol = () => { try { return JSON.parse(localStorage.getItem('vv_col_cur') || 'null'); } catch { return null; } };
  const skinPart = v => { if (!v) return null; const { ct, ca, ...k } = v; return Object.keys(k).length ? k : null; }; /* у стилі закладу: ct/ca — кольори, решта — форма */
  return { BASE, PRE, BG, THEMES, colors, saveCol, lastCol, skinPart, apply, diff, full, parse, last, editorHTML, bind };
})();
