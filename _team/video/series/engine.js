// Рушій серії: розкладає анімації за таймінгом голосу (timing.js → window.TIMING).
// Сцена: <section class="sc" data-l="N" [data-brk] [data-cap="текст з *ключовим*"]>. Елемент: data-t (с або %, «e-0.5» — від кінця рядка),
// класи a-* (вхід), l-* (цикл), data-an="keyframes dur ease" (свій), data-x/data-xa (вихід), data-stag (затримка між дітьми).
(() => {
const { s, d, T } = window.TIMING, L = s.length, end = l => l + 1 < L ? s[l + 1] : T, last = L - 1, P = L - 2;
const B = document.body.dataset, st = document.getElementById('stage');
const IN = { slam: 'slam .6s var(--back)', pop: 'pop .7s var(--back)', drop: 'drop .9s var(--ez)', rise: 'rise .8s var(--ez)', zoom: 'zoom .6s var(--back)', sl: 'sl .7s var(--ez)', sr: 'sr .7s var(--ez)', stamp: 'stamp .5s var(--ez)', fade: 'fade .6s ease', print: 'print 1.1s var(--ez)', phone: 'phone 1.1s var(--ez)', phone2: 'phone2 1.1s var(--ez)', flyup: 'flyup 1.6s var(--ez)', grow: 'grow .9s var(--back)', growx: 'growx .5s ease-out', cnt: 'cnt var(--dur,1.6s) var(--ez)', tap: 'tap .7s ease-out', ring: 'ring 1.2s var(--ez)', chip: 'chip .7s var(--back)' };
const LOOP = { glitch: 'glitch .18s steps(2) infinite', jit: 'jit .26s steps(2) infinite', buzz: 'buzz .12s linear infinite', bob: 'bob 2.4s ease-in-out infinite', spin: 'spin 6s linear infinite', spinf: 'spin .9s linear infinite', pulse: 'pulse 1.2s ease-in-out infinite', wave: 'wave .5s ease-in-out infinite' };
const tv = (v, l) => { v = String(v).trim(); if (v.endsWith('%')) return d[l] * parseFloat(v) / 100; if (v[0] === 'e') return end(l) - s[l] + parseFloat(v.slice(1) || 0); return +v; };
const BRK = [], booms = [0.05];

// ── фінальні сцени: ціна + лого (два останні рядки голосу)
st.insertAdjacentHTML('beforeend', `
<section class="sc ok" data-l="${P}" data-cap="*500 ₴* на місяць · перший місяць — *0 ₴*"><div class="wrap"><div class="cam">
  <div class="rays a-zoom l-spin" data-t="0" style="z-index:-1"></div>
  <div class="t3 a-pop" data-t="0">💳 Усе в одному — одна ціна</div>
  <div class="pcard a-slam" data-t="0.05"><b class="g">500 ₴</b><span>на місяць</span>
    <div class="pstamp a-stamp" data-t="33%" style="--sr:8deg">1-й місяць — 0 ₴</div></div>
  <div class="t2 a-pop" data-t="68%">🛠 Налаштуємо <span class="g">за вас</span></div>
  <div class="t3 a-pop" data-t="78%">меню · столи · склад · персонал</div>
</div></div></section>
<section class="sc ok" data-l="${last}"><div class="wrap"><div class="cam" style="gap:56px">
  <div class="rays a-zoom l-spin" data-t="0" style="z-index:-1"></div>
  <div class="ring a-ring" data-t="0" style="top:640px"></div>
  <div class="logo a-slam" data-t="0" style="--sr:0deg"><div class="atom"><i></i><i></i><i></i></div><span class="g">ATOM</span></div>
  <div class="t2 a-pop" data-t="0.45">${B.slogan || ''}</div>
  <div class="cta a-pop l-pulse" data-t="0.9">Спробувати безкоштовно</div>
  <div class="t3 a-pop" data-t="1.2">500 ₴/міс · перший місяць 0 ₴</div>
</div></div></section>`);

// ── сцени: вхід/вихід/камера + фон
const scs = [...document.querySelectorAll('.sc')];
scs.forEach((sc, k) => {
  const l = +sc.dataset.l, a = l ? s[l] - .25 : -1, b = end(l) - .25;
  sc.style.setProperty('--s', a + 's'); sc.style.setProperty('--len', (b - a + .5) + 's');
  sc.style.setProperty('--e', (l === last ? 999 : b - .15) + 's');
  if (!sc.style.getPropertyValue('--cam')) sc.style.setProperty('--cam', ['camIn', 'camPan', 'camOut'][l % 3]);
  if (sc.dataset.brk != null) { BRK.push(l); sc.style.setProperty('--sin', 'scMask'); }
  else if (l % 2) sc.style.setProperty('--sin', 'scUp');
  if (l % 2 === 0) sc.style.setProperty('--sout', 'scOutUp');
  // елементи
  const D = new Map();
  sc.querySelectorAll('*').forEach(el => {
    let t;
    if (el.dataset.t != null) t = s[l] + tv(el.dataset.t, l);
    else if (el.parentElement.dataset.stag != null && D.has(el.parentElement)) t = D.get(el.parentElement) + [...el.parentElement.children].indexOf(el) * +el.parentElement.dataset.stag;
    else if (el.dataset.stag != null) t = s[l];
    if (t == null) return; D.set(el, t);
    const an = [];
    el.classList.forEach(c => { if (c.startsWith('a-') && IN[c.slice(2)]) an.push(`${IN[c.slice(2)]} ${t}s 1 normal both`); });
    el.classList.forEach(c => { if (c.startsWith('l-') && LOOP[c.slice(2)]) an.push(`${LOOP[c.slice(2)]} ${t}s`); });
    if (el.dataset.an) an.push(`${el.dataset.an} ${t}s 1 normal both`);
    if (el.dataset.x != null) an.push(`${el.dataset.xa || 'vanish'} ${el.dataset.xd || '.5'}s var(--in) ${s[l] + tv(el.dataset.x, l)}s 1 normal forwards`);
    if (an.length) el.style.animation = an.join(',');
  });
});

// ── «розлам»: тріщини по склу → спалах → лого → проліт крізь
const ov = document.getElementById('ov'); let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
BRK.forEach(l => {
  const t = s[l], cx = 540, cy = 820; let paths = '', shards = '';
  for (let i = 0; i < 14; i++) { let a = i / 14 * Math.PI * 2 + rnd() * .3, x = cx, y = cy, p = `M${cx} ${cy}`; for (let j = 0; j < 6; j++) { const r = 90 + rnd() * 170; a += (rnd() - .5) * .5; x += Math.cos(a) * r; y += Math.sin(a) * r; p += ` L${x | 0} ${y | 0}`; } paths += `<path d="${p}" style="animation:draw .3s ease-out ${t - .4 + rnd() * .12}s both"/>`; }
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = 120 + rnd() * 380, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, z = 50 + rnd() * 90;
    shards += `<polygon class="shard" points="${x | 0},${y | 0} ${(x + z) | 0},${(y + z * .3) | 0} ${(x + z * .2) | 0},${(y + z) | 0}" style="--fx:${Math.cos(a) * 900 | 0}px;--fy:${Math.sin(a) * 900 + 500 | 0}px;--fr:${rnd() * 360 | 0}deg;animation:fade .01s ${t - .02}s both,fly .9s cubic-bezier(.3,0,.8,.5) ${t}s forwards"/>`; }
  ov.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 1080 1920" class="crack" style="animation:vanish .35s ease-in ${t + .02}s forwards">${paths}</svg><svg viewBox="0 0 1080 1920">${shards}</svg>
   <div class="bflash" style="animation:fade .05s ${t}s both,vanish .9s ease-out ${t + .06}s forwards"></div>
   <div class="blogo" style="animation:slam .55s var(--back) ${t + .06}s both,vanish .45s var(--in) ${t + .95}s forwards;--sr:0deg"><div class="logo"><div class="atom"><i></i><i></i><i></i></div><span class="g">ATOM</span></div></div>`);
  booms.push(t - .35, t);
});
document.head.insertAdjacentHTML('beforeend', '<style>@keyframes draw{to{stroke-dashoffset:0}}</style>');
// тряска на ударах з SFX (boom/glass/coin) + фінал
(window.SFX || []).forEach(([l, t, k]) => { if (k === 'boom' || k === 'glass') booms.push(s[l] + tv(t, l)); });
booms.push(s[last], s[P] + .05, s[P] + d[P] * .33);
const beat = 60 / 112, b0 = BRK.length ? Math.ceil(s[BRK[0]] / beat) * beat : 999;
st.style.animation = [`beat ${beat}s ease-out ${b0}s infinite`, ...booms.map(t => `shake .5s linear ${t}s 1 both`)].join(',');

// ── переходи між сценами (біль — червоний клин, рішення — золотий)
const tr = document.getElementById('tr');
for (let l = 1; l <= last; l++) { if (BRK.includes(l)) continue; const t = s[l] - .5, sc = scs.find(x => +x.dataset.l === l), c = sc && sc.classList.contains('pain') ? 'rd' : 'gd';
  tr.insertAdjacentHTML('beforeend', `<div class="wipe ${c}" style="animation-delay:${t}s"></div><div class="wipe k" style="animation-delay:${t + .07}s"></div><div class="flick" style="animation-delay:${s[l] - .2}s"></div>`); }

// ── субтитри: data-cap="текст" або "текст@0|текст2@55%"
const caps = document.getElementById('caps');
scs.forEach(sc => { const l = +sc.dataset.l, raw = sc.dataset.cap; if (!raw) return;
  const parts = raw.split('|').map(p => { const [x, t] = p.split('@'); return [x, t ? tv(t, l) : 0.05]; });
  parts.forEach(([txt, t], i) => { const t0 = s[l] + t, t1 = i + 1 < parts.length ? s[l] + parts[i + 1][1] - .2 : end(l) - .4;
    const c = document.createElement('div'); c.className = 'cap';
    txt.split(/(\*[^*]+\*)/).filter(Boolean).forEach(seg => { const key = seg[0] === '*'; seg.replace(/\*/g, '').trim().split(/\s+/).forEach(w => { const sp = document.createElement('span'); if (key) sp.innerHTML = `<b>${w}</b>`; else sp.textContent = w; c.appendChild(sp); }); });
    [...c.children].forEach((sp, j) => sp.style.animationDelay = `${t0 + j * .07}s,${t1}s`); caps.appendChild(c); });
});
})();
