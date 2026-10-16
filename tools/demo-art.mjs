// 🎨 Ілюстрації демо-закладу «Все за 500»: страви + емблема + банер → img/demo/*.svg
// Власні малюнки (без стокових фото — у публічному репо жодних чужих ліцензій). Запуск: node tools/demo-art.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('../img/demo/', import.meta.url); mkdirSync(OUT, { recursive: true });
let gid = 0; const uid = p => p + (++gid);
const svg = (body, defs = '', vb = '0 0 640 640') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${defs}</defs>${body}</svg>`;
const lin = (id, a, b, vert = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vert ? 0 : 1}" y2="${vert ? 1 : 0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rad = (id, a, b) => `<radialGradient id="${id}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const shadow = (cx = 320, cy = 560, rx = 220, ry = 34) => { const id = uid('sh'); return [`<radialGradient id="${id}"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`, `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`]; };
const wave = (x0, x1, y, amp, n, down = 1) => { let d = `M${x0} ${y}`; const w = (x1 - x0) / n; for (let i = 0; i < n; i++) d += ` q${w / 2} ${amp * down * (i % 2 ? -1 : 1)} ${w} 0`; return d; };
const R = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(500);
const dots = (n, cx, cy, rx, ry, r, fill, op = 1) => Array.from({ length: n }, () => { const a = R() * 6.283, k = Math.sqrt(R()); return `<circle cx="${(cx + Math.cos(a) * rx * k).toFixed(1)}" cy="${(cy + Math.sin(a) * ry * k).toFixed(1)}" r="${r}" fill="${fill}" opacity="${op}"/>`; }).join('');

// 🍔 бургер (вид збоку)
function burger({ patties = 1, cheese = 1, bun = ['#f0b35c', '#c9772b'], patty = ['#6b3a22', '#3e1f12'], extra = [], seeds = 1 } = {}) {
  const [sd, sh] = shadow(320, 560, 230, 30), b = uid('b'), p = uid('p'), bb = uid('bb');
  let y = 520, body = '';
  body += `<path d="M110 ${y - 50} h420 a10 10 0 0 1 10 10 q0 50 -60 60 h-330 q-60 -10 -60 -60 a10 10 0 0 1 10 -10z" fill="url(#${bb})"/>`; y -= 50;
  const layer = {
    patty: () => { body += `<rect x="96" y="${y - 58}" width="448" height="62" rx="30" fill="url(#${p})"/>` + dots(14, 320, y - 30, 200, 18, 3, '#2a140a', .6); y -= 50; },
    chicken: () => { body += `<path d="M92 ${y} q-12 -34 20 -58 q30 -14 60 -4 q40 -14 90 -6 q50 -10 100 0 q50 -10 92 4 q32 8 36 34 q4 30 -20 30z" fill="#d68a2e"/>` + dots(40, 320, y - 26, 210, 20, 4, '#f3b65a', .9); y -= 50; },
    cheese: () => { body += `<path d="M90 ${y - 6} h460 l-30 24 l-40 -6 l-30 36 l-36 -30 l-70 10 l-40 30 l-40 -34 l-70 4 l-40 26 l-30 -30z" fill="#ffc627"/><path d="M90 ${y - 6} h460 l-8 8 h-444z" fill="#ffdd6a"/>`; y -= 12; },
    bacon: () => { body += `<path d="${wave(88, 552, y - 8, 14, 8)} v16 ${wave(552, 88, y + 8, 14, 8).replace(/^M[^q]+/, '')}z" fill="#b23a2a" transform="translate(0 0)"/><path d="${wave(96, 544, y - 6, 12, 8)}" stroke="#f1b5a0" stroke-width="5" fill="none"/>`; y -= 16; },
    onion: () => { body += `<path d="M100 ${y} h440 q-40 -26 -80 -8 q-40 -24 -80 -2 q-40 -22 -80 0 q-40 -22 -80 0 q-40 -22 -80 0 q-30 -10 -40 10z" fill="#8a3b1c"/>`; y -= 12; },
    lettuce: () => { body += `<path d="M80 ${y + 6} ${wave(80, 560, y - 6, 18, 14).replace(/^M[^q]+/, '')} l0 18 h-480z" fill="#5fb83a"/><path d="${wave(80, 560, y - 6, 18, 14)}" stroke="#93dd5b" stroke-width="6" fill="none"/>`; y -= 18; },
    tomato: () => { body += `<rect x="112" y="${y - 22}" width="200" height="26" rx="13" fill="#e2352b"/><rect x="328" y="${y - 22}" width="200" height="26" rx="13" fill="#d22d24"/><rect x="130" y="${y - 18}" width="160" height="6" rx="3" fill="#ff7a5c" opacity=".7"/>`; y -= 24; },
    avocado: () => { body += `<path d="M110 ${y + 2} q30 -30 100 -24 q60 4 110 -4 q60 -6 110 4 q70 0 100 24z" fill="#a9cf54"/><path d="M130 ${y} q30 -18 80 -14" stroke="#d8ec8f" stroke-width="6" fill="none"/>`; y -= 18; },
    sauce: () => { body += `<path d="M100 ${y} q60 -16 120 0 q60 16 120 0 q60 -16 120 0 q40 10 80 0 v8 h-440z" fill="#f4e4c4"/>`; y -= 8; },
  };
  const order = [...Array(patties)].flatMap((_, i) => [extra.includes('chicken') ? 'chicken' : 'patty', ...(cheese ? ['cheese'] : [])]);
  if (extra.includes('chicken')) order.splice(0, order.length, 'chicken', 'sauce');
  if (extra.includes('vegan')) order.splice(0, order.length, 'patty', 'avocado');
  for (const l of order) layer[l]();
  for (const l of ['bacon', 'onion']) if (extra.includes(l)) layer[l]();
  layer.lettuce(); if (!extra.includes('chicken')) layer.tomato();
  const top = y + 6;
  body += `<path d="M96 ${top} q-6 -20 10 -40 q40 -150 214 -150 q174 0 214 150 q16 20 10 40z" fill="url(#${b})"/>`;
  body += `<path d="M150 ${top - 70} q30 -90 140 -110" stroke="#fff" stroke-opacity=".28" stroke-width="18" stroke-linecap="round" fill="none"/>`;
  if (seeds) body += Array.from({ length: 22 }, (_, i) => { const x = 160 + R() * 320, yy = top - 60 - R() * 110 + Math.abs(x - 320) * .35; return `<ellipse cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" rx="7" ry="4" fill="#fff4d6" transform="rotate(${(R() * 60 - 30).toFixed(0)} ${x.toFixed(0)} ${yy.toFixed(0)})"/>`; }).join('');
  return svg(sh + body, sd + lin(b, bun[0], bun[1]) + lin(bb, bun[1], '#a65c1c') + lin(p, patty[0], patty[1]));
}

// 🍕 піца (вид згори, трохи в перспективі)
function pizza(top) {
  const [sd, sh] = shadow(320, 520, 260, 50), c = uid('c');
  let t = '';
  if (top === 'margarita') t = dots(9, 320, 330, 150, 110, 26, '#fff5d8') + Array.from({ length: 7 }, () => { const x = 200 + R() * 240, y = 250 + R() * 160; return `<path d="M${x} ${y} q18 -22 36 0 q-18 22 -36 0z" fill="#2f9b3a" transform="rotate(${R() * 180} ${x + 18} ${y})"/>`; }).join('');
  if (top === 'pepperoni') t = Array.from({ length: 13 }, () => { const a = R() * 6.28, k = Math.sqrt(R()) * .85, x = 320 + Math.cos(a) * 170 * k, y = 330 + Math.sin(a) * 120 * k; return `<ellipse cx="${x}" cy="${y}" rx="24" ry="18" fill="#b8261c"/><ellipse cx="${x - 5}" cy="${y - 4}" rx="10" ry="6" fill="#dc4a35"/>`; }).join('');
  if (top === 'cheese') t = dots(16, 320, 330, 170, 120, 16, '#fff3c4') + dots(12, 320, 330, 170, 120, 10, '#5a7fb8', .8) + dots(18, 320, 330, 170, 120, 6, '#e8a33a');
  if (top === 'meat') t = dots(10, 320, 330, 170, 120, 18, '#b8261c') + Array.from({ length: 10 }, () => { const x = 180 + R() * 280, y = 260 + R() * 140; return `<rect x="${x}" y="${y}" width="40" height="16" rx="5" fill="#e9a3a0" transform="rotate(${R() * 180} ${x + 20} ${y + 8})"/>`; }).join('') + dots(14, 320, 330, 170, 120, 8, '#6b3a22');
  const cuts = [0, 60, 120].map(a => `<line x1="${320 - Math.cos(a / 57.3) * 230}" y1="${330 - Math.sin(a / 57.3) * 160}" x2="${320 + Math.cos(a / 57.3) * 230}" y2="${330 + Math.sin(a / 57.3) * 160}" stroke="#8a4b1a" stroke-opacity=".35" stroke-width="3"/>`).join('');
  return svg(sh + `<ellipse cx="320" cy="350" rx="262" ry="190" fill="#c27a35"/><ellipse cx="320" cy="335" rx="262" ry="190" fill="url(#${c})"/><ellipse cx="320" cy="333" rx="222" ry="158" fill="#d1401f"/><ellipse cx="320" cy="330" rx="214" ry="150" fill="#f4c650"/>` + dots(30, 320, 330, 200, 140, 9, '#ffe08a', .8) + t + cuts,
    sd + rad(c, '#f2bb6a', '#c98837'));
}

// 🥣 миска (вид збоку з поверхнею)
function bowl({ fill, rim = '#f3f1ec', side = ['#ffffff', '#cfcac0'], garnish = '', steam = 0 }) {
  const [sd, sh] = shadow(320, 545, 210, 28), s = uid('s'), f = uid('f');
  const st = steam ? [250, 320, 390].map(x => `<path d="M${x} 230 q-24 -36 0 -70 q24 -36 0 -70" stroke="#fff" stroke-opacity=".35" stroke-width="10" stroke-linecap="round" fill="none"/>`).join('') : '';
  return svg(sh + st + `<path d="M90 330 q10 200 230 210 q220 -10 230 -210z" fill="url(#${s})"/><ellipse cx="320" cy="330" rx="230" ry="62" fill="${rim}"/><ellipse cx="320" cy="334" rx="208" ry="50" fill="url(#${f})"/>` + garnish + `<path d="M130 380 q20 100 120 130" stroke="#fff" stroke-opacity=".6" stroke-width="12" stroke-linecap="round" fill="none"/>`,
    sd + lin(s, side[0], side[1], false) + rad(f, fill[0], fill[1]));
}

// 🍽 тарілка (вид згори) + страва
function plate(content, { col = '#f6f4ef' } = {}) {
  const [sd, sh] = shadow(320, 520, 270, 46);
  return svg(sh + `<ellipse cx="320" cy="350" rx="270" ry="180" fill="#d8d3c8"/><ellipse cx="320" cy="340" rx="270" ry="180" fill="${col}"/><ellipse cx="320" cy="340" rx="200" ry="128" fill="#ebe7de"/>` + content, sd);
}

// 🥤 склянка / келих
function glass({ shape = 'tumbler', liquid = ['#ffd36b', '#f39c12'], level = .75, ice = 0, foam = 0, garnish = '', straw = '', bubbles = 0 }) {
  const [sd, sh] = shadow(320, 565, 140, 22), l = uid('l');
  const G = {
    tumbler: { o: 'M200 150 L222 545 Q224 560 240 560 H400 Q416 560 418 545 L440 150Z', top: 150, bot: 548, xl: t => 200 + 22 * t, xr: t => 440 - 22 * t },
    tall: { o: 'M225 90 L238 548 Q240 562 254 562 H386 Q400 562 402 548 L415 90Z', top: 90, bot: 548, xl: t => 225 + 13 * t, xr: t => 415 - 13 * t },
    pint: { o: 'M196 110 Q190 140 206 180 L230 548 Q232 562 248 562 H392 Q408 562 410 548 L434 180 Q450 140 444 110Z', top: 110, bot: 548, xl: t => 196 + 34 * t, xr: t => 444 - 34 * t },
    wine: { o: 'M196 110 Q186 330 300 372 V520 H230 Q226 548 320 552 Q414 548 410 520 H340 V372 Q454 330 444 110Z', top: 110, bot: 360, xl: t => 196 + 40 * t * t, xr: t => 444 - 40 * t * t },
  }[shape];
  const y0 = G.bot - (G.bot - G.top) * level, tl = (y0 - G.top) / (G.bot - G.top);
  const liq = shape === 'wine' ? `<path d="M${G.xl(tl) + 4} ${y0} H${G.xr(tl) - 4} Q${440 - 6} 300 320 362 Q${200 + 6} 300 ${G.xl(tl) + 4} ${y0}Z" fill="url(#${l})"/>` : `<path d="M${G.xl(tl) + 6} ${y0} H${G.xr(tl) - 6} L${G.xr(1) - 8} ${G.bot - 2} H${G.xl(1) + 8}Z" fill="url(#${l})"/>`;
  const ic = Array.from({ length: ice }, (_, i) => `<rect x="${G.xl(tl) + 26 + (i % 2) * 70 + R() * 20}" y="${y0 + 10 + Math.floor(i / 2) * 64 + R() * 10}" width="62" height="56" rx="10" fill="#fff" fill-opacity=".38" stroke="#fff" stroke-opacity=".7" stroke-width="3" transform="rotate(${R() * 30 - 15} ${G.xl(tl) + 60 + (i % 2) * 70} ${y0 + 40 + Math.floor(i / 2) * 64})"/>`).join('');
  const bb = bubbles ? dots(bubbles, 320, (y0 + G.bot) / 2, (G.xr(1) - G.xl(1)) / 2 - 20, (G.bot - y0) / 2 - 10, 4, '#fff', .55) : '';
  const fm = foam ? `<path d="M${G.xl(tl) - 4} ${y0 + 4} q0 -40 40 -40 q20 -26 60 -10 q30 -24 70 -2 q40 -10 52 26 q8 22 -6 30z" fill="#fff8e7"/><rect x="${G.xl(tl) + 4}" y="${y0}" width="${G.xr(tl) - G.xl(tl) - 8}" height="${foam}" fill="#fff8e7"/>` : '';
  return svg(sh + straw + liq + ic + bb + fm + `<path d="${G.o}" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".75" stroke-width="6"/><path d="M${G.xl(.05) + 18} ${G.top + 30} L${G.xl(.9) + 18} ${G.bot - 30}" stroke="#fff" stroke-opacity=".45" stroke-width="12" stroke-linecap="round"/>` + garnish,
    sd + lin(l, liquid[0], liquid[1]));
}
const lemon = (x, y, r = 46, c = '#ffe14a') => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f5c400"/><circle cx="${x}" cy="${y}" r="${r - 7}" fill="${c}"/>` + [0, 60, 120].map(a => `<line x1="${x - Math.cos(a / 57.3) * (r - 10)}" y1="${y - Math.sin(a / 57.3) * (r - 10)}" x2="${x + Math.cos(a / 57.3) * (r - 10)}" y2="${y + Math.sin(a / 57.3) * (r - 10)}" stroke="#fff6b0" stroke-width="4"/>`).join('');
const mint = (x, y) => [[-30, -10, -30], [10, -26, 10], [34, 0, 40]].map(([dx, dy, rot]) => `<path d="M${x + dx} ${y + dy} q22 -36 44 0 q-22 30 -44 0z" fill="#3fae49" transform="rotate(${rot} ${x + dx + 22} ${y + dy})"/>`).join('');
const strawP = (c = '#e53935') => `<rect x="352" y="40" width="20" height="420" rx="8" fill="${c}" transform="rotate(14 362 250)"/>`;

// ☕ чашка (вид збоку)
function cup({ size = 1, drink = '#5a2e14', art = 0, crema = '#c47b3d', glassy = 0 }) {
  const [sd, sh] = shadow(320, 545, 230 * size + 30, 30), c = uid('c');
  const w = 150 * size, h = 170 * size, top = 520 - h - 20;
  const body = glassy
    ? `<path d="M${320 - w} ${top} L${320 - w * .82} 520 H${320 + w * .82} L${320 + w} ${top}Z" fill="${drink}"/><path d="M${320 - w} ${top} L${320 - w * .94} ${top + 70} H${320 + w * .94} L${320 + w} ${top}Z" fill="#fbf1e2"/><path d="M${320 - w} ${top} L${320 - w * .82} 520 H${320 + w * .82} L${320 + w} ${top}Z" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".8" stroke-width="6"/>`
    : `<path d="M${320 + w - 8} ${top + 40} q${80 * size} 0 ${70 * size} ${60 * size} q-6 ${50 * size} ${-80 * size} ${50 * size}" stroke="#e9e5dd" stroke-width="${22 * size}" fill="none"/><path d="M${320 - w} ${top} q0 ${h + 10} ${w} ${h + 10} q${w} 0 ${w} ${-h - 10}z" fill="url(#${c})"/><ellipse cx="320" cy="${top}" rx="${w}" ry="${32 * size}" fill="#f7f5f0"/><ellipse cx="320" cy="${top + 4}" rx="${w - 14}" ry="${24 * size}" fill="${crema}"/>` + (art ? `<path d="M${320 - 30 * size} ${top + 2} q${30 * size} ${-26 * size} ${60 * size} 0 q${-30 * size} ${24 * size} ${-60 * size} 0z M${320 - 6 * size} ${top + 16 * size} h${12 * size} v-${30 * size}" fill="#fbf1e2"/>` : '');
  const saucer = glassy ? '' : `<ellipse cx="320" cy="530" rx="${w + 70}" ry="${30 + 8 * size}" fill="#d8d3c8"/><ellipse cx="320" cy="524" rx="${w + 70}" ry="${30 + 8 * size}" fill="#f4f2ec"/>`;
  return svg(sh + saucer + body + `<path d="M${320 - w + 30} ${top + 50} q8 ${h * .5} ${40} ${h * .75}" stroke="#fff" stroke-opacity=".55" stroke-width="10" stroke-linecap="round" fill="none"/>`, sd + lin(c, '#ffffff', '#d9d4ca', false));
}

// 🍟 картопля фрі в коробочці
function fries({ box = '#e53935', stick = '#ffcc3d' } = {}) {
  const [sd, sh] = shadow(320, 560, 170, 26);
  const st = Array.from({ length: 16 }, (_, i) => { const x = 200 + i * 15 + R() * 6, y = 120 + R() * 70, rot = (i - 8) * 2.4; return `<rect x="${x}" y="${y}" width="26" height="260" rx="5" fill="${stick}" stroke="#e0a21a" stroke-width="3" transform="rotate(${rot} ${x} 380)"/>`; }).join('');
  return svg(sh + st + `<path d="M180 270 L220 550 H420 L460 270 Q320 320 180 270Z" fill="${box}"/><path d="M180 270 Q320 320 460 270 L456 296 Q320 344 184 296Z" fill="#fff" fill-opacity=".25"/><text x="320" y="460" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="64" fill="#fff">500</text>`, sd);
}
const ring = (x, y, r = 70, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .62}" fill="none" stroke="#d98a2b" stroke-width="${r * .42}"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .62}" fill="none" stroke="#f3b14e" stroke-width="${r * .22}" stroke-dasharray="6 10"/></g>`;
const nug = (x, y, s = 1) => `<path d="M${x - 50 * s} ${y} q-6 -40 40 -46 q50 -10 62 30 q10 40 -40 46 q-56 8 -62 -30z" fill="#d68a2e"/>` + dots(6, x, y - 8, 40 * s, 22 * s, 4, '#f3b65a');
const stick = (x, y, rot) => `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - 110}" y="${y - 24}" width="220" height="48" rx="22" fill="#e0952f"/>${dots(10, x, y, 100, 18, 4, '#f6c264')}<ellipse cx="${x + 110}" cy="${y}" rx="14" ry="20" fill="#fff3c4"/></g>`;
const sauceDip = (x, y, c) => `<ellipse cx="${x}" cy="${y}" rx="56" ry="34" fill="#ddd8cc"/><ellipse cx="${x}" cy="${y - 4}" rx="44" ry="24" fill="${c}"/>`;

// 🍰 десерти
const cake = ({ base = '#f5e6c8', top = '#c0182b', crust = '#c98a4a', layers = 0 }) => { const [sd, sh] = shadow(320, 520, 220, 34); return svg(sh + `<ellipse cx="320" cy="500" rx="240" ry="56" fill="#ece8df"/><path d="M150 470 L320 520 L500 430 V250 L330 200 L150 290Z" fill="${base}"/><path d="M320 520 L500 430 V250 L320 330Z" fill="#000" fill-opacity=".08"/>` + (layers ? [0, 1, 2].map(i => `<path d="M150 ${330 + i * 50} L320 ${370 + i * 50} L500 ${290 + i * 50}" stroke="${['#6b3a22', '#f7efe0', '#6b3a22'][i]}" stroke-width="18" fill="none"/>`).join('') : `<path d="M150 450 L320 500 L500 410 V440 L320 530 L150 480Z" fill="${crust}"/>`) + `<path d="M150 290 L320 330 L500 250 L330 200Z" fill="${top}"/>` + (layers ? dots(40, 325, 265, 140, 40, 4, '#3a1d0c') : `<path d="M200 300 q40 30 20 70 M280 320 q30 40 10 80" stroke="${top}" stroke-width="16" stroke-linecap="round" fill="none"/>`), sd); };
function brownie() { const [sd, sh] = shadow(320, 520, 230, 34); return svg(sh + `<ellipse cx="320" cy="470" rx="250" ry="90" fill="#ece8df"/><path d="M160 430 L300 480 L470 420 V330 L330 280 L160 340Z" fill="#4a2615"/><path d="M160 340 L300 390 L470 330 L330 280Z" fill="#6b3a22"/><path d="M300 480 L470 420 V330 L300 390Z" fill="#000" fill-opacity=".18"/><circle cx="330" cy="250" r="80" fill="#fff7e6"/><circle cx="300" cy="230" r="26" fill="#fff" opacity=".7"/><path d="M260 300 q20 60 0 90 M380 300 q-10 50 10 80" stroke="#4a2615" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M320 166 q20 -30 46 -20 q-10 30 -46 20z" fill="#3fae49"/>`, sd); }

// ── каталог: файл → малюнок
const A = {
  'burger-classic': burger({ extra: [] }),
  'burger-double': burger({ patties: 2, extra: ['onion'] }),
  'burger-chicken': burger({ extra: ['chicken'], cheese: 0 }),
  'burger-bacon': burger({ extra: ['bacon', 'onion'], bun: ['#e9a04b', '#a85e1c'] }),
  'burger-vegan': burger({ extra: ['vegan'], cheese: 0, bun: ['#c99a5e', '#8a5a2b'], patty: ['#b88a4a', '#8a6230'] }),
  'pizza-margarita': pizza('margarita'), 'pizza-pepperoni': pizza('pepperoni'), 'pizza-cheese': pizza('cheese'), 'pizza-meat': pizza('meat'),
  'salad-caesar': bowl({ fill: ['#9fd36a', '#5f9e34'], garnish: dots(16, 320, 330, 170, 34, 12, '#fff3c4') + dots(8, 320, 330, 150, 30, 16, '#e9b46a') + dots(8, 320, 326, 140, 28, 14, '#f1d9b8') }),
  'salad-greek': bowl({ fill: ['#8fca5a', '#4f8e2a'], garnish: dots(9, 320, 330, 160, 30, 16, '#e2352b') + dots(9, 320, 330, 160, 30, 13, '#2b2b2b') + dots(8, 320, 330, 150, 30, 15, '#fdfcf7') + dots(8, 320, 330, 160, 30, 12, '#f4d65a') }),
  'salad-veal': bowl({ fill: ['#9fd36a', '#5f9e34'], garnish: dots(14, 320, 330, 160, 30, 15, '#7a3b25') + dots(30, 320, 330, 170, 32, 3, '#f7efe0') }),
  'soup-borsch': bowl({ fill: ['#d0303a', '#8f1420'], garnish: `<ellipse cx="320" cy="328" rx="44" ry="14" fill="#fffaf0"/>` + dots(10, 320, 334, 150, 30, 5, '#3fae49'), steam: 1 }),
  'soup-mushroom': bowl({ fill: ['#e9d2a8', '#b99666'], garnish: dots(8, 320, 334, 140, 28, 10, '#f3d9a0') + dots(14, 320, 334, 150, 30, 4, '#3fae49'), steam: 1 }),
  'soup-tomyam': bowl({ fill: ['#f3a03a', '#c8571c'], garnish: Array.from({ length: 4 }, (_, i) => `<path d="M${200 + i * 70} 330 q20 -26 44 -6 q-10 14 -30 12" stroke="#ff8a65" stroke-width="12" fill="none" stroke-linecap="round"/>`).join('') + dots(10, 320, 334, 150, 30, 6, '#3fae49'), steam: 1 }),
  'steak': plate(`<path d="M190 320 q10 -70 110 -70 q110 -6 130 50 q20 70 -80 90 q-120 20 -160 -70z" fill="#6b2f1c"/><path d="M220 300 l170 -20 M230 330 l170 -20 M250 360 l150 -20" stroke="#3a160b" stroke-width="9" stroke-linecap="round"/>` + Array.from({ length: 9 }, (_, i) => `<rect x="${330 + (i % 3) * 40}" y="${360 + Math.floor(i / 3) * 26}" width="34" height="24" rx="6" fill="#e9b04a"/>`).join('') + mint(220, 400)),
  'pasta': plate(Array.from({ length: 16 }, (_, i) => `<path d="M${200 + (i % 4) * 10} ${290 + i * 7} q${60 + R() * 40} -40 ${120} 0 t${120} 0" stroke="#f3d27a" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('') + dots(12, 320, 330, 110, 50, 10, '#c96b4a') + `<circle cx="320" cy="320" r="26" fill="#ffb52e"/>` + dots(30, 320, 330, 130, 60, 3, '#fffbe8')),
  'wings': plate(Array.from({ length: 7 }, (_, i) => { const a = i * .9, x = 320 + Math.cos(a) * 120, y = 340 + Math.sin(a) * 70; return `<path d="M${x - 46} ${y} q0 -34 46 -34 q50 0 50 30 q0 30 -50 30 q-46 0 -46 -26z" fill="#9a3d12" transform="rotate(${a * 57} ${x} ${y})"/><path d="M${x - 30} ${y - 10} q20 -14 50 -6" stroke="#d26a2b" stroke-width="8" stroke-linecap="round" fill="none" transform="rotate(${a * 57} ${x} ${y})"/>`; }).join('') + sauceDip(320, 340, '#f4e4c4')),
  'nuggets': plate(nug(240, 320) + nug(330, 290) + nug(400, 350) + nug(290, 390) + sauceDip(440, 290, '#e2352b')),
  'onion-rings': plate(ring(250, 320, 70, -10) + ring(370, 300, 66, 12) + ring(320, 390, 72, 4) + sauceDip(450, 380, '#f4e4c4')),
  'cheese-sticks': plate(stick(300, 300, -12) + stick(320, 350, 6) + stick(300, 400, -4) + sauceDip(470, 300, '#d63a2a')),
  'fries': fries(),
  'set-500': (([d, h]) => svg(h + `<g transform="translate(10 150) scale(.58)">${pizza('margarita').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g><g transform="translate(330 250) scale(.5)">${fries().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g><g transform="translate(150 60) scale(.55)">${burger({ extra: ['bacon'] }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`, d))(shadow(320, 560, 280, 34)),
  'cheesecake': cake({ base: '#f8ebcb', top: '#c0182b' }),
  'tiramisu': cake({ base: '#f7efe0', top: '#7a4a2a', layers: 1 }),
  'brownie': brownie(),
  'espresso': cup({ size: .62, crema: '#b86a2f' }),
  'americano': cup({ size: .85, crema: '#7a3e17' }),
  'cappuccino': cup({ size: .95, crema: '#d7a26b', art: 1 }),
  'latte': glass({ shape: 'tall', liquid: ['#e9cfa6', '#9a6034'], level: .78, foam: 34 }),
  'raf': cup({ size: .95, crema: '#f2e3c8', art: 1 }),
  'lemonade': glass({ shape: 'tall', liquid: ['#ffe680', '#ffb703'], ice: 4, bubbles: 14, straw: strawP('#ffd400'), garnish: lemon(420, 110) + mint(250, 90) }),
  'cola': glass({ liquid: ['#5a2a14', '#1f0d05'], ice: 4, bubbles: 18, straw: strawP(), garnish: lemon(430, 150, 40, '#c9f05a') }),
  'juice': glass({ liquid: ['#ffb347', '#ff7b00'], level: .8, garnish: `<circle cx="428" cy="150" r="52" fill="#ff9800"/><circle cx="428" cy="150" r="44" fill="#ffc04d"/>` }),
  'water': glass({ shape: 'tall', liquid: ['#d8f2ff', '#a6dcf5'], level: .7, bubbles: 10, garnish: lemon(425, 100, 40) }),
  'aperol': glass({ shape: 'wine', liquid: ['#ff8a2b', '#e04e0c'], level: .85, ice: 0, bubbles: 10, garnish: `<circle cx="430" cy="130" r="56" fill="#ff7a00"/><circle cx="430" cy="130" r="47" fill="#ffad42"/>` }),
  'mojito': glass({ liquid: ['#e9ffd8', '#b5e67f'], ice: 4, bubbles: 10, straw: strawP('#2e7d32'), garnish: mint(300, 150) + lemon(430, 150, 40, '#c9f05a') }),
  'beer-light': glass({ shape: 'pint', liquid: ['#ffd65a', '#e8a317'], level: .82, foam: 40, bubbles: 22 }),
  'beer-dark': glass({ shape: 'pint', liquid: ['#6b2d0f', '#2a0e03'], level: .82, foam: 40, bubbles: 10 }),
  'cider': glass({ shape: 'pint', liquid: ['#fff0a6', '#f2c94c'], level: .85, bubbles: 24, garnish: `<path d="M420 120 q-50 -40 -60 20 q-6 60 60 70 q66 -10 60 -70 q-10 -60 -60 -20z" fill="#c62828"/><path d="M420 120 q4 -24 18 -34" stroke="#5d3a1a" stroke-width="7" fill="none"/>` }),
};

// 🏷 емблема «Все за 500»
const LOGO = svg(`<circle cx="256" cy="256" r="250" fill="url(#lg)"/><circle cx="256" cy="256" r="214" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/>
<path id="arcT" d="M96 256 A160 160 0 0 1 416 256" fill="none"/><path id="arcB" d="M112 266 A146 146 0 0 0 400 266" fill="none"/>
<text font-family="Arial Black,Helvetica Neue,Arial,sans-serif" font-weight="900" font-size="54" letter-spacing="8" fill="#fff"><textPath href="#arcT" startOffset="50%" text-anchor="middle">ВСЕ ЗА</textPath></text>
<text x="256" y="322" text-anchor="middle" font-family="Arial Black,Helvetica Neue,Arial,sans-serif" font-weight="900" font-size="170" fill="#ffd23f" stroke="#7a0e14" stroke-width="10" paint-order="stroke" letter-spacing="-6">500</text>
<text font-family="Arial Black,Helvetica Neue,Arial,sans-serif" font-weight="900" font-size="34" letter-spacing="6" fill="#fff"><textPath href="#arcB" startOffset="50%" text-anchor="middle">★ ГРИВЕНЬ ★</textPath></text>`,
  `<radialGradient id="lg" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ff6a2b"/><stop offset=".6" stop-color="#e3262e"/><stop offset="1" stop-color="#a3101c"/></radialGradient>`, '0 0 512 512');

// 🖼 банер для сайту: страви на теплому тлі
const strip = s => s.replace(/^<svg[^>]*>|<\/svg>$/g, '');
const HERO = svg(`<rect width="1600" height="900" fill="url(#hb)"/>` + dots(80, 800, 450, 820, 470, 3, '#ffd23f', .25) +
  `<g transform="translate(-40 260) scale(1.05)">${strip(A['pizza-pepperoni'])}</g><g transform="translate(1030 330) scale(.92)">${strip(A['beer-light'])}</g><g transform="translate(470 210) scale(1.08)">${strip(A['burger-double'])}</g><g transform="translate(1210 360) scale(.8)">${strip(A['fries'])}</g>`,
  `<radialGradient id="hb" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#3a1410"/><stop offset="1" stop-color="#140806"/></radialGradient>`, '0 0 1600 900');

for (const [k, v] of Object.entries(A)) writeFileSync(new URL(k + '.svg', OUT), v);
writeFileSync(new URL('logo.svg', OUT), LOGO); writeFileSync(new URL('hero.svg', OUT), HERO);
console.log(Object.keys(A).length + 2, 'файлів → img/demo/');
