// 🖌 Спільний рушій стилю (конструктор) для каси й кабінету власника. Без data-skin — «Стара каса», css/skin.css нічого не чіпає.
window.VVSkin = (() => {
  const BASE = { acc: '', bg: 'theme', contrast: 5, muted: 5, bgfx: 'none', r: 18, rb: 14, shape: 'auto', h: 48, pad: 16, gap: 10, card: 'solid', shadow: 'none', border: 'none', caps: false, font: '', fonth: 'same', fs: 15, hw: 800, prim: 'fill', sec: 'fill', seg: 'dark', tabs: 'seg', tbl: 'gold', nav: 'bar', navn: '8', navon: 'accent', navlbl: true, modal: 'center', anim: true };
  const PRE = {
    varvar: ['⭐ VARVAR', 'ваш стиль: світіння, Rubik, плаваюче меню', { bgfx: 'glow', r: 22, rb: 17, h: 42, pad: 11, gap: 11, shadow: 'soft', caps: true, font: 'rubik', fonth: 'rubik', fs: 14, hw: 700, nav: 'float' }],
  };
  const BG = { black: ['#0b0b0d', '#151518', '#1c1c1f', '#26262a'], amoled: ['#000000', '#08080a', '#141416', '#1f1f22'], graphite: ['#131317', '#18181d', '#1f1f25', '#2a2a32'], blue: ['#0a0e16', '#0e1420', '#161c28', '#202838'], warm: ['#100d0a', '#16120e', '#1f1a15', '#2b241d'], green: ['#0a100d', '#0e1612', '#16201b', '#1f2c25'] };
  const FONT = { rubik: 'Rubik', manrope: 'Manrope', montserrat: 'Montserrat', nunito: 'Nunito', inter: 'Inter', roboto: 'Roboto', comfortaa: 'Comfortaa', pt: 'PT Sans' };
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
    for (const k of ['bgfx', 'shape', 'card', 'prim', 'sec', 'seg', 'tabs', 'tbl', 'nav', 'navn', 'navon', 'modal']) h.setAttribute('data-sk-' + k, K[k]);
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
    const FN = [['', 'Як у темі'], ['system', 'Системний'], ['rubik', 'Rubik'], ['manrope', 'Manrope'], ['montserrat', 'Montserrat'], ['nunito', 'Nunito'], ['inter', 'Inter']];
    const body = `<div class="skc">
      <h4>🎨 Кольори</h4>${ch('bg', 'Фон', [['theme', 'Як у темі'], ['black', 'Чорний'], ['amoled', 'AMOLED'], ['graphite', 'Графіт'], ['blue', 'Синюватий'], ['warm', 'Теплий'], ['green', 'Зеленуватий']])}
      <div class="o"><span>Акцент</span><div class="ch" data-k="acc">${['', '#f2c14e', '#ffb340', '#ff8a3d', '#ff5a5f', '#e879a6', '#a78bfa', '#7aa7ff', '#3ddc97'].map(c => `<button data-v="${c}" class="${K.acc === c ? 'on' : ''}" style="${c ? `background:${c};` : ''}min-width:30px">${c ? '&nbsp;' : 'Як у темі'}</button>`).join('')}</div></div>
      ${rg('contrast', 'Контраст карток', 0, 10)}${rg('muted', 'Яскравість сірого тексту', 0, 10)}${ch('bgfx', 'Ефект фону', [['none', 'Немає'], ['glow', 'Світіння'], ['vignette', 'Віньєтка']])}
      <h4>🔷 Форма</h4>${rg('r', 'Заокруглення карток', 0, 30)}${rg('rb', 'Заокруглення кнопок', 0, 26)}${ch('shape', 'Форма кнопок', [['auto', 'За повзунком'], ['pill', 'Пілюля'], ['square', 'Квадратні']])}
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
  return { BASE, PRE, BG, apply, diff, full, parse, last, editorHTML, bind };
})();
