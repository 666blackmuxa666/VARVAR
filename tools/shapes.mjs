// 🔷 Форми вікон (карток) — один набір для меню, сайту й каси. Генерує CSS-блоки між маркерами у трьох файлах.
// Запуск: node tools/shapes.mjs
import fs from 'node:fs';
const S = { // A — акцент, T — текст, C — картка
  arch: 'border-radius: 50% 50% 12px 12px / 64px 64px 12px 12px;',
  ticket: '--n: 11px; border-radius: 10px; -webkit-mask: radial-gradient(circle var(--n) at 0 50%, #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle var(--n) at 100% 50%, #0000 98%, #000) right / 51% 100% no-repeat; mask: radial-gradient(circle var(--n) at 0 50%, #0000 98%, #000) left / 51% 100% no-repeat, radial-gradient(circle var(--n) at 100% 50%, #0000 98%, #000) right / 51% 100% no-repeat;',
  cut: 'border-radius: 0; clip-path: polygon(16px 0, calc(100% - 16px) 0, 100% 16px, 100% calc(100% - 16px), calc(100% - 16px) 100%, 16px 100%, 0 calc(100% - 16px), 0 16px);',
  notch: 'border-radius: 6px; clip-path: polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 0 100%); background-image: linear-gradient(225deg, transparent 21px, A 21px 22px, transparent 22px);',
  slant: 'border-radius: 0; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 18px), 0 100%); padding-bottom: 18px;',
  leaf: 'border-radius: 34px 4px 34px 4px;',
  bubble: 'border-radius: 26px 26px 26px 4px;',
  pill: 'border-radius: 36px;',
  sketch: 'border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; border: 2px solid T; box-shadow: none;',
  brutal: 'border-radius: 0; border: 2px solid T; box-shadow: 6px 6px 0 A;',
  deco: 'border-radius: 0; border: 0; box-shadow: inset 0 0 0 1px A, inset 0 0 0 5px C, inset 0 0 0 6px A;',
  neon: 'border: 1px solid A; box-shadow: 0 0 0 1px A, 0 0 22px color-mix(in srgb, A 45%, transparent), inset 0 0 16px color-mix(in srgb, A 18%, transparent);',
  glass: 'background-color: color-mix(in srgb, C 52%, transparent); -webkit-backdrop-filter: blur(14px) saturate(150%); backdrop-filter: blur(14px) saturate(150%); border: 1px solid color-mix(in srgb, T 16%, transparent); box-shadow: 0 10px 30px rgba(0,0,0,.25);',
  scallop: '--w: 9px; border-radius: 12px 12px 0 0; -webkit-mask: radial-gradient(var(--w) at 50% 100%, #0000 98%, #000) 50% 100% / calc(2 * var(--w)) calc(2 * var(--w)) repeat-x, linear-gradient(#000 0 0) top / 100% calc(100% - var(--w) * 2 + 1px) no-repeat; mask: radial-gradient(var(--w) at 50% 100%, #0000 98%, #000) 50% 100% / calc(2 * var(--w)) calc(2 * var(--w)) repeat-x, linear-gradient(#000 0 0) top / 100% calc(100% - var(--w) * 2 + 1px) no-repeat; padding-bottom: 14px;',
  frame: 'border-radius: 2px; outline: 1px solid A; outline-offset: 4px;',
  folder: 'border-radius: 0 20px 20px 20px; border-top: 4px solid A;',
  line: 'background: transparent; border: 0; border-bottom: 2px solid A; border-radius: 0; box-shadow: none;',
  brackets: 'border-radius: 0; border: 0; box-shadow: none; background-image: linear-gradient(A, A), linear-gradient(A, A), linear-gradient(A, A), linear-gradient(A, A), linear-gradient(A, A), linear-gradient(A, A), linear-gradient(A, A), linear-gradient(A, A); background-repeat: no-repeat; background-size: 20px 2px, 2px 20px, 20px 2px, 2px 20px, 20px 2px, 2px 20px, 20px 2px, 2px 20px; background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;',
  polaroid: 'border-radius: 3px; border: 0; padding: 8px 8px 18px; background: #fbfaf6; color: #1d1d1d; box-shadow: 0 10px 26px rgba(0,0,0,.28); rotate: -1.2deg;',
};
const T = {
  menu: { file: 'css/style.css', pre: 'html[data-mt][data-shp="K"] .cat:not(.compact) .item', v: { A: 'var(--accent)', T: 'var(--text)', C: 'var(--card)' }, extra: 'html[data-mt][data-shp="polaroid"] .cat:not(.compact) .item:nth-child(2n) { rotate: 1.1deg; } html[data-mt][data-shp="polaroid"] .item :is(h3, p, .price) { color: #1d1d1d; }' },
  site: { file: 'css/about.css', pre: 'html[data-site][data-shp="K"] :is(.feats div, .hit, .box, .formbox, .quote, .promo, .evc, .adr)', v: { A: 'var(--accent)', T: 'var(--text)', C: 'var(--card)' }, extra: 'html[data-site][data-shp="polaroid"] :is(.hit, .promo, .evc):nth-child(2n) { rotate: 1.1deg; } html[data-site][data-shp="polaroid"] :is(.hit, .promo, .evc, .feats div, .box, .quote, .adr) * { color: #1d1d1d; }' },
  pos: { file: 'css/skin.css', pre: 'html[data-skin][data-sk-win="K"] :is(.card, .kpi, .pill, .stat, .modal)', v: { A: 'var(--accent)', T: 'var(--text)', C: 'var(--card)' }, skip: ['polaroid', 'slant', 'scallop', 'line'] },
};
for (const [, t] of Object.entries(T)) {
  const css = Object.entries(S).filter(([k]) => !(t.skip || []).includes(k)).map(([k, v]) => `${t.pre.replace('K', k)} { ${v.replace(/\b[ATC]\b/g, m => t.v[m])} }`).join('\n') + (t.extra ? '\n' + t.extra : '');
  let s = fs.readFileSync(t.file, 'utf8'); const a = '/* 🔷 shapes:start (tools/shapes.mjs) */', b = '/* 🔷 shapes:end */';
  s = s.includes(a) ? s.slice(0, s.indexOf(a)) + a + '\n' + css + '\n' + s.slice(s.indexOf(b)) : s.trimEnd() + '\n' + a + '\n' + css + '\n' + b + '\n';
  fs.writeFileSync(t.file, s);
}
