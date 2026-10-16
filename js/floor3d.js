// 🏛 3D-план залу — спільний для каси (pos.html) і сайту гостя (about.html: вибір столу при броні).
// Чистий CSS 3D (без бібліотек): підлога-макет, столи з кріслами, декор. Режими 3d / 2d (2d — для редагування).
// Дані: столи [{t, x, y, sh, r, cls, pin}] (x,y — % підлоги), декор [[kind, x, y, rot, len]], підлога 'wood'|'tile'…
(function () {
  var FW = 1000, FH = 640, AX = 56, AZ = -32, ZM = 1, SC = null; // ZM, SC — наближення й прокрутка (переживають перемальовування)
  // каталог декору: n — підпис, len — довжина за замовчуванням (розтягується), d — глибина
  var K = {
    wall: { n: '🧱 Стіна', len: 200 }, win: { n: '🪟 Вікно', len: 140 }, door: { n: '🚪 Двері' }, col: { n: '◼️ Колона' },
    bar: { n: '🍸 Барна стійка', len: 220 }, sofa: { n: '🛋 Диван', len: 140 }, plant: { n: '🪴 Вазон' }, tree: { n: '🌳 Дерево' },
    umb: { n: '⛱ Парасоля' }, rug: { n: '🟫 Килим', len: 180 }, stage: { n: '🎤 Сцена', len: 220 }, stairs: { n: '🪜 Сходи' }
  };
  var FLOORS = { wood: '🪵 Дерево', herring: '🧩 Ялинка', tile: '◻️ Плитка', stone: '🪨 Камінь', concrete: '⬜ Бетон', grass: '🌿 Тераса' };
  // столи: розмір і крісла навколо (вигляд згори)
  var SH = { s: { n: '◻️ Квадратний', w: 64, d: 64, ch: [[0, -50, 0], [0, 50, 180], [-50, 0, 270], [50, 0, 90]] },
    r: { n: '⚪ Круглий', w: 68, d: 68, ch: [[0, -52, 0], [0, 52, 180], [-52, 0, 270], [52, 0, 90]] },
    l: { n: '▭ Довгий', w: 132, d: 64, ch: [[-38, -50, 0], [38, -50, 0], [-38, 50, 180], [38, 50, 180], [-84, 0, 270], [84, 0, 90]] },
    b: { n: '⭕ Великий круглий', w: 104, d: 104, ch: [0, 60, 120, 180, 240, 300].map(function (a) { var r = a * Math.PI / 180; return [Math.round(Math.sin(r) * 72), Math.round(-Math.cos(r) * 72), a]; }) },
    t: { n: '▫️ На двох', w: 52, d: 52, ch: [[0, -42, 0], [0, 42, 180]] } };
  var px = function (v) { return v + 'px'; };
  // коробка: верх + 4 стінки (тінь граней — накладенням)
  function box(w, d, h, cls, st) {
    return '<i class="f3-bx ' + cls + '" style="width:' + px(w) + ';height:' + px(d) + ';left:' + px(-w / 2) + ';top:' + px(-d / 2) + ';--h:' + px(h) + (st || '') + '"><b class="xt"></b><b class="xf"></b><b class="xb"></b><b class="xl"></b><b class="xr"></b></i>';
  }
  function disc(d, z, cls, st) { return '<b class="f3-dc ' + cls + '" style="width:' + px(d) + ';height:' + px(d) + ';left:' + px(-d / 2) + ';top:' + px(-d / 2) + ';--z:' + px(z) + (st || '') + '"></b>'; }
  function shadow(w, d, st) { return '<b class="f3-sh" style="width:' + px(w) + ';height:' + px(d) + ';left:' + px(-w / 2) + ';top:' + px(-d / 2) + (st || '') + '"></b>'; }
  function decoHTML(x, i, edit, sel) {
    var k = x[0], L = Math.max(40, Math.min(700, +x[4] || (K[k] && K[k].len) || 100)), o = '';
    if (k === 'wall') o = shadow(L + 10, 26) + box(L, 14, 40, 'wall');
    else if (k === 'win') o = box(L, 10, 16, 'sill') + box(L, 6, 70, 'glass', ';transform:translateZ(16px)');
    else if (k === 'door') o = '<b class="f3-door"></b>';
    else if (k === 'col') o = shadow(54, 54) + box(36, 36, 130, 'mcol');
    else if (k === 'bar') { o = shadow(L + 16, 70) + box(L, 50, 52, 'mbar'); for (var s = 0, n = Math.max(1, Math.floor(L / 56)); s < n; s++) o += '<i class="f3-p" style="left:' + px(-L / 2 + (s + .5) * L / n) + ';top:42px">' + disc(26, 34, 'stool') + '</i>'; }
    else if (k === 'sofa') o = shadow(L + 10, 60) + box(L, 46, 22, 'sofa') + '<i class="f3-p" style="top:-17px">' + box(L, 12, 46, 'sofa back') + '</i>';
    else if (k === 'plant') o = shadow(46, 46) + box(26, 26, 24, 'pot') + disc(40, 40, 'leaf l1') + disc(30, 54, 'leaf l2') + disc(18, 64, 'leaf l3');
    else if (k === 'tree') o = shadow(90, 90) + box(30, 30, 26, 'pot') + disc(80, 70, 'leaf l1') + disc(64, 92, 'leaf l2') + disc(42, 110, 'leaf l3') + disc(20, 122, 'leaf l3');
    else if (k === 'umb') o = '<b class="f3-sh round" style="width:120px;height:120px;left:-60px;top:-60px"></b>' + box(6, 6, 96, 'pole') + disc(124, 98, 'canopy');
    else if (k === 'rug') o = '<b class="f3-rug" style="width:' + px(L) + ';height:' + px(Math.round(L * .62)) + ';left:' + px(-L / 2) + ';top:' + px(-L * .31) + '"></b>';
    else if (k === 'stage') o = shadow(L + 20, 140) + box(L, 120, 16, 'stage');
    else if (k === 'stairs') { for (var j = 0; j < 5; j++) o += '<i class="f3-p" style="top:' + px(-40 + j * 20) + '">' + box(90, 20, 50 - j * 10, 'step') + '</i>'; }
    else return '';
    return '<i class="f3-o f3-d' + (sel ? ' sel' : '') + '"' + (edit ? ' data-md="' + i + '"' : '') + ' style="left:' + x[1] + '%;top:' + x[2] + '%;--r:' + (+x[3] || 0) + 'deg">' + o + '</i>';
  }
  function tableHTML(T, o) {
    var s = SH[T.sh] || SH.s, round = T.sh === 'r' || T.sh === 'b', ch = '', i;
    for (i = 0; i < s.ch.length; i++) { var c = s.ch[i]; ch += '<i class="f3-p f3-ch" style="left:' + px(c[0]) + ';top:' + px(c[1]) + ';--cr:' + c[2] + 'deg"><b class="seat"></b><b class="back"></b></i>'; }
    var top = round ? disc(s.w, 26, 'tt under') + disc(s.w, 31, 'tt') : '<i class="f3-p" style="transform:translateZ(25px)">' + box(s.w, s.d, 6, 'tt' + (T.sh === 'l' ? ' long' : '')) + '</i>';
    var glow = '<b class="f3-gl" style="width:' + px(s.w * 2.3) + ';height:' + px(s.d * 2.3) + ';left:' + px(-s.w * 1.15) + ';top:' + px(-s.d * 1.15) + '"></b>';
    return '<div class="f3-o f3-t ' + (T.cls || '') + (o.sel === 't' + T.t ? ' sel' : '') + '" ' + (T.attrs || '') + (o.edit ? ' data-mt="' + T.t + '"' : '') + ' style="left:' + T.x + '%;top:' + T.y + '%;--r:' + (+T.r || 0) + 'deg">'
      + glow + shadow(s.w + 24, s.d + 24, round ? ';border-radius:50%' : '') + ch + '<i class="f3-p" style="transform:translateZ(0)">' + box(10, 10, 25, 'leg') + '</i>' + top
      + '<span class="f3-pin">' + (T.pin || '<b>' + T.t + '</b>') + '</span></div>';
  }
  // повний план: o = {tables, deco, floor, mode:'3d'|'2d', edit, sel, grid}
  function html(o) {
    var t = (o.tables || []).map(function (T) { return tableHTML(T, o); }).join('');
    var d = (o.deco || []).map(function (x, i) { return decoHTML(x, i, o.edit, o.sel === 'd' + i); }).join('');
    var fl = FLOORS[o.floor] ? o.floor : 'wood';
    return '<div class="f3' + (o.mode === '2d' ? ' m2' : '') + (o.edit ? ' edit' : '') + '"><div class="f3-box"><div class="f3-st"><div class="f3-fl fl-' + fl + '"><b class="e1"></b><b class="e2"></b><b class="e3"></b><b class="e4"></b></div>' + d + t + '</div></div></div>';
  }
  // підганяє масштаб під ширину контейнера (викликати після вставки і при зміні розміру)
  function fit(root) {
    var all = (root || document).querySelectorAll('.f3'), i;
    for (i = 0; i < all.length; i++) {
      var f = all[i], W = f.clientWidth - 8, two = f.classList.contains('m2'), ed = f.classList.contains('edit'), bw, bh, k, lift = 0;
      if (!W) continue;
      // 📱 вузький екран: зал «стоїть» уздовж телефона (довга сторона — вертикально), камера трохи пологіша
      var pt = !ed && W < 600, ax = two ? 0 : pt ? 46 : AX, az = two ? (pt ? -90 : 0) : pt ? -82 : AZ;
      f.style.setProperty('--ax', ax + 'deg'); f.style.setProperty('--az', az + 'deg'); f.classList.toggle('pt', pt);
      var a = Math.abs(az) * Math.PI / 180, x = ax * Math.PI / 180;
      lift = 130 * Math.sin(x); bw = Math.abs(Math.cos(a)) * FW + Math.abs(Math.sin(a)) * FH; bh = (Math.abs(Math.sin(a)) * FW + Math.abs(Math.cos(a)) * FH) * Math.cos(x) + lift;
      k = Math.max(ed ? .5 : .26, Math.min(1.3, W * .94 / bw)) * (f.classList.contains('edit') ? 1 : ZM);
      var st = f.querySelector('.f3-st'), bx = f.querySelector('.f3-box');
      bx.style.width = Math.max(W, bw * k / .94) + 'px'; bx.style.height = bh * k + 'px';
      f.style.setProperty('--k', k); f.style.setProperty('--ty', (lift / 2 * k) + 'px'); f.style.setProperty('--pk', Math.min(3.2, .9 / k));
      if (!f.dataset.c) { f.dataset.c = 1; if (ZM > 1 && SC) { f.scrollLeft = SC[0]; f.scrollTop = SC[1]; } else f.scrollLeft = (f.scrollWidth - f.clientWidth) / 2; requestAnimationFrame(function () { requestAnimationFrame(function () { f.classList.add('rdy'); }); }); f.addEventListener('scroll', function () { SC = [this.scrollLeft, this.scrollTop]; }, { passive: true }); }
    }
  }
  var css = [
    '.f3{--ax:' + AX + 'deg;--az:' + AZ + 'deg;--k:.6;--ty:0px;--pk:1;--lz:78px;--py:-100%;position:relative;overflow:auto;border-radius:24px;background:radial-gradient(120% 90% at 50% 0%,#ffffff12,transparent 60%),radial-gradient(80% 60% at 50% 100%,#00000066,transparent),#121214;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-x pan-y;contain:paint;user-select:none;-webkit-user-select:none;display:flex}',
    '.f3.m2{--ax:0deg;--az:0deg;--lz:60px;--py:-50%}',
    '.f3-box{position:relative;margin:auto;flex:none}',
    '.f3-st{position:absolute;left:50%;top:50%;width:' + FW + 'px;height:' + FH + 'px;margin:-' + FH / 2 + 'px 0 0 -' + FW / 2 + 'px;transform-style:preserve-3d;transform:translateY(var(--ty)) scale(var(--k)) rotateX(var(--ax)) rotateZ(var(--az))}.f3.rdy .f3-st,.f3.rdy .f3-pin{transition:transform .8s cubic-bezier(.2,.8,.2,1)}.f3.live .f3-st,.f3.live .f3-pin,.f3.live .f3-box{transition:none}',
    '.f3 *{transform-style:preserve-3d;box-sizing:border-box}',
    '.f3 i,.f3 b,.f3-st div{position:absolute;display:block;font-style:normal}',
    // підлога-макет з торцями
    '.f3-fl{inset:0;border-radius:6px;box-shadow:inset 0 0 0 2px #ffffff10,inset 0 0 80px #0006}',
    '.f3-fl b{background:#2a2420}.f3-fl .e1{left:0;top:100%;width:100%;height:22px;transform-origin:top;transform:rotateX(-90deg);background:linear-gradient(#3a302a,#1a1512)}',
    '.f3-fl .e2{left:100%;top:0;width:22px;height:100%;transform-origin:left;transform:rotateY(90deg);background:linear-gradient(90deg,#2c241f,#141110)}',
    '.f3-fl .e3{left:0;top:0;width:100%;height:22px;transform-origin:top;transform:rotateX(-90deg)}.f3-fl .e4{left:0;top:0;width:22px;height:100%;transform-origin:left;transform:rotateY(90deg)}',
    '.fl-wood{background:repeating-linear-gradient(90deg,#00000022 0 1px,transparent 1px 64px),repeating-linear-gradient(0deg,#0000002e 0 2px,transparent 2px 22px),linear-gradient(135deg,#8a6446,#6e4e36 50%,#7d5a3f)}',
    '.fl-herring{background:repeating-linear-gradient(45deg,#00000026 0 2px,transparent 2px 26px),repeating-linear-gradient(-45deg,#ffffff0d 0 2px,transparent 2px 26px),linear-gradient(135deg,#9a7350,#7b5838)}',
    '.fl-tile{background:conic-gradient(#e9e4dc 25%,#d6cfc4 0 50%,#e9e4dc 0 75%,#d6cfc4 0) 0 0/64px 64px}',
    '.fl-stone{background:repeating-linear-gradient(0deg,#0000003a 0 2px,transparent 2px 80px),repeating-linear-gradient(90deg,#0000003a 0 2px,transparent 2px 120px),linear-gradient(135deg,#55545a,#44434a 60%,#4e4c52)}',
    '.fl-concrete{background:radial-gradient(#ffffff0c 1px,transparent 1.5px) 0 0/9px 9px,repeating-linear-gradient(90deg,#0000002a 0 1px,transparent 1px 200px),linear-gradient(135deg,#8e8c88,#7a7874)}',
    '.fl-grass{background:repeating-linear-gradient(90deg,#00000024 0 3px,transparent 3px 46px),linear-gradient(135deg,#b08a5c,#97734a)}',
    // об'єкти: точка-якір з поворотом
    '.f3-o{width:0;height:0;transform:rotateZ(var(--r));z-index:1}.f3-p{width:0;height:0}',
    '.f3-bx>b{background:var(--c)}.f3-bx .xt{inset:0;transform:translateZ(var(--h));background:linear-gradient(135deg,#ffffff1c,transparent),var(--c)}',
    '.f3-bx .xf,.f3-bx .xb{left:0;width:100%;height:var(--h);transform-origin:top;transform:rotateX(90deg);background:linear-gradient(#00000040,#00000080),var(--c)}.f3-bx .xf{top:100%}.f3-bx .xb{top:0}',
    '.f3-bx .xl,.f3-bx .xr{top:0;width:var(--h);height:100%;transform-origin:left;transform:rotateY(-90deg);background:linear-gradient(90deg,#00000090,#00000070),var(--c)}.f3-bx .xl{left:0}.f3-bx .xr{left:100%}',
    '.f3-dc{border-radius:50%;transform:translateZ(var(--z));background:var(--c)}',
    '.f3-sh{background:radial-gradient(closest-side,#00000070,#00000030 60%,#0000);transform:translate(8px,10px) scale(1.25)}',
    // матеріали
    '.wall{--c:#55555c}.wall .xt{background:#6a6a72}.sill{--c:#d9d2c8}.glass{--c:#9fd4ff55}.glass>b{border:1px solid #cfeaff66}.mcol{--c:#d8d2ca}',
    '.mbar{--c:#2c2522}.mbar .xt{background:linear-gradient(90deg,#1b1b1e,#3a3a40 50%,#1b1b1e)}.stool{--c:#c9a26b;box-shadow:0 0 0 3px #00000040}',
    '.sofa{--c:#5b3a3a}.sofa .xt{background:linear-gradient(#ffffff14,transparent),#6b4444}.pot{--c:#b4643c}',
    '.leaf{background:radial-gradient(circle at 35% 30%,#6f8f5c,#3d5a35 60%,#2a4026)}.leaf.l2{background:radial-gradient(circle at 35% 30%,#7c9c68,#47653e 60%,#30482b)}.leaf.l3{background:radial-gradient(circle at 35% 30%,#8aab75,#527147 60%,#375231)}.pole{--c:#ddd}',
    '.canopy{background:repeating-conic-gradient(#e8e2d6 0 22.5deg,#d4ccbd 22.5deg 45deg);box-shadow:0 0 0 2px #0002;opacity:.96}',
    '.f3-rug{border-radius:6px;background:repeating-linear-gradient(45deg,#ffffff10 0 6px,transparent 6px 14px),radial-gradient(#5a4a3e,#3e332b);box-shadow:inset 0 0 0 6px #d9b98a55,inset 0 0 0 9px #0003}',
    '.stage{--c:#26262b}.stage .xt{background:repeating-linear-gradient(90deg,#00000030 0 2px,transparent 2px 40px),#3a3540}.step{--c:#bfb6aa}',
    '.f3-door{width:80px;height:80px;left:-40px;top:-80px;border-left:4px solid #e9e4dc;border-top:1px solid #ffffff30;border-top-left-radius:80px 80px;background:radial-gradient(circle at 0 100%,#ffffff14 0 70%,transparent 71%);border-radius:80px 0 0 0;transform-origin:0 100%}',
    // столи
    '.f3-t{cursor:pointer;z-index:2}.tt{--c:#d8c3a5;background:radial-gradient(circle at 35% 30%,#f1e3cc,#c9ad86)}.tt.under{background:#7a6248}.f3-bx.tt .xt{background:linear-gradient(135deg,#f1e3cc,#c9ad86)}.leg{--c:#3a332d}',
    '.f3-ch{transform:rotateZ(var(--cr))}.f3-ch .seat{width:26px;height:22px;left:-13px;top:-11px;border-radius:7px;background:linear-gradient(#5a5048,#3f3833);transform:translateZ(14px);box-shadow:0 0 0 1px #0004}',
    '.f3-ch .back{width:26px;height:22px;left:-13px;top:-11px;border-radius:6px 6px 2px 2px;background:linear-gradient(#4a423c,#2e2925);transform-origin:top;transform:translateZ(14px) rotateX(90deg) translateY(-22px)}',
    '.f3-gl{border-radius:50%;opacity:0;transition:opacity .4s;background:radial-gradient(closest-side,var(--g,transparent),transparent)}',
    // 📍 мітка над столом — завжди обличчям до глядача, розмір не залежить від масштабу
    '.f3-pin{left:0;top:0;transform-origin:0 0;transform:translateZ(var(--lz)) rotateZ(calc(-1 * var(--r))) rotateZ(calc(-1 * var(--az))) rotateX(calc(-1 * var(--ax))) scale(var(--pk)) translate(-50%,var(--py));',
    'display:flex;flex-direction:column;align-items:center;gap:1px;padding:3px 7px 4px;min-width:28px;border-radius:9px;background:#1c1c1ef2;color:#8e8e93;font:600 11px/1.15 system-ui,-apple-system,sans-serif;white-space:nowrap;box-shadow:0 6px 16px #0007,inset 0 0 0 1px #ffffff1f;pointer-events:auto}',
    '.f3-pin b{position:static;font-size:15px;font-weight:800;letter-spacing:-.02em}.f3-pin small{display:block;font-size:10.5px;opacity:.85;font-weight:600}',
    '.f3:not(.m2) .f3-pin::after{content:"";position:absolute;left:50%;top:100%;width:2px;height:12px;margin-left:-1px;background:linear-gradient(currentColor,transparent);opacity:.5}',
    '.f3-t.s-busy{--g:#f2c14eaa}.f3-t.s-busy .f3-pin{background:#f2c14e;color:#1a1400}',
    '.f3-t.s-check{--g:#ff9f0acc}.f3-t.s-check .f3-pin{background:#ff9f0a;color:#1f1200}',
    '.f3-t.s-new{--g:#ff453acc}.f3-t.s-new .f3-pin{background:#ff453a}.f3-t.s-new .f3-gl,.f3-t.call .f3-gl{animation:f3p 1.4s ease-in-out infinite}',
    '.f3-t.s-book{--g:#bf5af2aa}.f3-t.s-book .f3-pin{background:#bf5af2}.f3-t.s-pick{--g:#30d158cc}.f3-t.s-pick .f3-pin{background:#30d158;color:#04210d}',
    '.f3-t.call{--g:#ffd60acc}.f3-t.call .f3-pin{box-shadow:0 0 0 3px #ffd60a,0 6px 16px #0007}',
    '.f3-t[class*=" s-"] .f3-gl{opacity:1}.f3-t.dim .f3-pin{opacity:.4}.f3-t.dim .tt{--c:#6d6458;background:#6d6458}',
    '@keyframes f3p{50%{opacity:.45}}.f3:not(.edit) .f3-t:active .f3-pin{filter:brightness(1.3)}.f3-t[class*=" s-"] .f3-pin{color:#fff}',
    '@media (hover:hover){.f3:not(.edit) .f3-t:hover .f3-pin{box-shadow:0 0 0 2px #fff,0 8px 20px #0008}}',
    // редагування: сітка, рамка вибраного
    '.f3.edit .f3-fl::after{content:"";position:absolute;inset:0;background:linear-gradient(#ffffff1a 1px,transparent 1px) 0 0/25px 25px,linear-gradient(90deg,#ffffff1a 1px,transparent 1px) 0 0/25px 25px}',
    '.f3.edit .f3-o{cursor:grab;touch-action:none}.f3.edit .f3-o.sel::before{content:"";position:absolute;width:150px;height:150px;left:-75px;top:-75px;border-radius:50%;border:2px solid #f2c14ecc;background:#f2c14e10;box-shadow:0 0 24px #f2c14e33}',
    '.f3.edit .f3-d::after{content:"";position:absolute;width:56px;height:56px;left:-28px;top:-28px}',
    '@media (prefers-reduced-motion:reduce){.f3-st,.f3-pin,.f3-box{transition:none}}'
  ].join('\n');
  var tag = document.createElement('style'); tag.textContent = css; document.head.appendChild(tag);
  var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { fit(); }) : null;
  window.addEventListener('resize', function () { fit(); });
  // 🔍 наближення до точки (cx, cy — координати екрана); жести: два пальці, ctrl/трекпад-колесо, подвійний тап
  function zoomAt(f, z, cx, cy) {
    var r = f.getBoundingClientRect(); if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    var ox = cx - r.left, oy = cy - r.top, px0 = (f.scrollLeft + ox) / f.scrollWidth, py0 = (f.scrollTop + oy) / f.scrollHeight;
    ZM = Math.max(1, Math.min(3.5, z)); if (ZM < 1.03) ZM = 1; f.classList.add('live'); fit();
    f.scrollLeft = px0 * f.scrollWidth - ox; f.scrollTop = py0 * f.scrollHeight - oy;
    if (!pz) { clearTimeout(f._lv); f._lv = setTimeout(function () { f.classList.remove('live'); }, 150); }
  }
  var P = {}, pz = null, lastTap = 0;
  function dist() { var k = Object.keys(P); return Math.hypot(P[k[0]].x - P[k[1]].x, P[k[0]].y - P[k[1]].y); }
  document.addEventListener('pointerdown', function (e) {
    var f = e.target.closest && e.target.closest('.f3'); if (!f || e.pointerType === 'mouse') return;
    P[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Object.keys(P).length === 2) { pz = { f: f, d: dist(), z: ZM }; f.classList.add('live'); }
    else if (!f.classList.contains('edit') && !e.target.closest('.f3-pin')) { var n = Date.now(); if (n - lastTap < 300) { zoomAt(f, ZM > 1.4 ? 1 : 2, e.clientX, e.clientY); n = 0; } lastTap = n; }
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!P[e.pointerId]) return; P[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pz && Object.keys(P).length === 2) { var k = Object.keys(P); zoomAt(pz.f, pz.z * dist() / pz.d, (P[k[0]].x + P[k[1]].x) / 2, (P[k[0]].y + P[k[1]].y) / 2); }
  }, true);
  function up(e) { delete P[e.pointerId]; if (pz && Object.keys(P).length < 2) { pz.f.classList.remove('live'); pz = null; } }
  document.addEventListener('pointerup', up, true); document.addEventListener('pointercancel', up, true);
  document.addEventListener('wheel', function (e) {
    var f = e.ctrlKey && e.target.closest && e.target.closest('.f3'); if (!f) return; e.preventDefault();
    zoomAt(f, ZM * Math.exp(-e.deltaY / 120), e.clientX, e.clientY);
  }, { passive: false });
  window.Floor3D = { html: html, fit: fit, K: K, SH: SH, FLOORS: FLOORS, zoom: function (d) { var f = document.querySelector('.f3'); if (f) zoomAt(f, ZM * (d > 0 ? 1.4 : 1 / 1.4)); }, watch: function (el) { if (ro && el) ro.observe(el); }, FW: FW, FH: FH };
})();
