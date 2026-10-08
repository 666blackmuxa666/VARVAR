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
  return { BASE, PRE, BG, apply, diff, full, parse, last };
})();
