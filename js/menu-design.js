// 🍽 Дизайн онлайн-меню з кабінету власника (Конструктор меню): тема, фон, шрифти, вигляд карток, фон під фото,
// вкладки розділів, кнопки, оголошення. Без налаштувань меню виглядає як раніше.
window.VVM = (() => {
  const R = document.documentElement, st = R.style, $ = s => document.querySelector(s);
  const FW = { 'Rubik': 'Rubik:wght@400;500;700', 'Rubik Dirt': 'Rubik+Dirt', 'Russo One': 'Russo+One', 'Cormorant Garamond': 'Cormorant+Garamond:wght@400;600;700', 'Prata': 'Prata', 'Forum': 'Forum', 'Tenor Sans': 'Tenor+Sans', 'Yeseva One': 'Yeseva+One', 'Old Standard TT': 'Old+Standard+TT:wght@400;700', 'Spectral': 'Spectral:wght@400;700', 'Alice': 'Alice', 'Philosopher': 'Philosopher:wght@400;700', 'Poiret One': 'Poiret+One', 'Inter': 'Inter:wght@400;700', 'Jost': 'Jost:wght@400;700', 'Raleway': 'Raleway:wght@400;700', 'Golos Text': 'Golos+Text:wght@400;700', 'Onest': 'Onest:wght@400;700', 'Tektur': 'Tektur:wght@400;700', 'Dela Gothic One': 'Dela+Gothic+One', 'Pacifico': 'Pacifico', 'Lobster': 'Lobster', 'Marck Script': 'Marck+Script', 'Amatic SC': 'Amatic+SC:wght@400;700', 'Bad Script': 'Bad+Script', 'Press Start 2P': 'Press+Start+2P' };
  const fam = f => FW[f] || f.replace(/ /g, '+') + ':wght@400;700';
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
  const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
  const VARS = ['--bg', '--card', '--card2', '--line', '--text', '--muted', '--accent', '--accent-ink', '--r', '--fh', '--fb', '--fz', '--pagebg', '--catbg', '--phbg', '--cols', '--ratio', '--fit', '--ttlsz'];
  const DS = ['mt', 'mode', 'lay', 'phbg', 'cats', 'ttl', 'ttlline', 'desc', 'size', 'add', 'price', 'btn', 'cards', 'caps', 'sticky', 'shp'];
  let fk = '';
  function apply(t, brand) {
    for (const k of VARS) st.removeProperty(k); for (const k of DS) delete R.dataset[k];
    $('#mtNote')?.remove();
    if (!t) { fonts(''); return; }
    const card2 = mix(t.card, t.text, .07);
    const bg = { solid: t.bg, grad: `linear-gradient(${t.ang ?? 160}deg, ${t.bg}, ${t.bg2 || t.bg}) fixed`, img: t.bgImg ? `linear-gradient(${rgba(t.bg, .8)}, ${rgba(t.bg, .9)}), url("${new URL(t.bgImg, document.baseURI).href}") center/cover fixed` : t.bg,
      photo: t.bgImg ? `linear-gradient(${rgba(t.bg, t.mode === "light" ? .74 : .55)}, ${rgba(t.bg, t.mode === "light" ? .9 : .86)}), url("${new URL(t.bgImg, document.baseURI).href}") center/cover fixed` : t.bg,
      aurora: `radial-gradient(60% 50% at 12% 0%, ${rgba(t.accent, .3)}, transparent 70%), radial-gradient(50% 45% at 100% 30%, ${rgba(t.bg2 || t.accent, .34)}, transparent 70%), radial-gradient(70% 55% at 45% 105%, ${rgba(t.accent, .16)}, transparent 70%), ${t.bg}`,
      vign: `radial-gradient(110% 70% at 50% 0%, ${rgba(t.text, .08)}, transparent 60%), radial-gradient(140% 110% at 50% 45%, transparent 55%, rgba(0,0,0,${t.mode === 'light' ? .12 : .6})), ${t.bg}`,
      dots: `radial-gradient(${rgba(t.text, .09)} 1.2px, transparent 1.4px) 0 0/18px 18px, ${t.bg}`, grid: `linear-gradient(${rgba(t.text, .05)} 1px, transparent 1px) 0 0/28px 28px, linear-gradient(90deg, ${rgba(t.text, .05)} 1px, transparent 1px) 0 0/28px 28px, ${t.bg}`,
      noise: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E"), ${t.bg}` }[t.bgfx] || t.bg;
    const ph = { tex: '', card: card2, accent: mix(t.accent, t.card, .55), color: t.phC || card2, img: t.phImg ? `${card2} url("${new URL(t.phImg, document.baseURI).href}") center/cover` : card2, none: 'transparent' }[t.phbg || 'tex'];
    const v = { '--bg': t.bg, '--card': t.card, '--card2': card2, '--line': mix(t.card, t.text, .12), '--text': t.text, '--muted': mix(t.text, t.bg, .42), '--accent': t.accent, '--accent-ink': t.ink, '--r': t.r + 'px',
      '--fh': `'${t.fh}', '${t.fb}', system-ui, sans-serif`, '--fb': `'${t.fb}', system-ui, sans-serif`, '--fz': { s: '14px', m: '15px', l: '17px' }[t.fs] || '15px', '--pagebg': bg, '--catbg': rgba(t.bg, .92),
      '--cols': t.cols || 2, '--ratio': t.ratio || '1', '--fit': t.fit || 'contain', '--ttlsz': (t.ttlSz || 30) + 'px', ...(ph ? { '--phbg': ph } : {}) };
    for (const [k, x] of Object.entries(v)) st.setProperty(k, x);
    Object.assign(R.dataset, { mt: '1', mode: t.mode, lay: t.lay || 'grid', phbg: t.phbg || 'tex', cats: t.cats || 'pill', ttl: t.ttl || 'l', ttlline: t.ttlLine ? '1' : '0', desc: t.desc === 0 ? '0' : '1', size: t.size === 0 ? '0' : '1', add: t.add || 'round', price: t.price || 'accent', btn: t.btn || 'fill', cards: t.cards || 'line', caps: t.caps === 0 ? '0' : '1', sticky: t.catsSticky === 0 ? '0' : '1', ...(t.shp ? { shp: t.shp } : {}) });
    fonts([...new Set([t.fh, t.fb])].filter(f => f && f !== 'Rubik' && f !== 'Rubik Dirt').map(fam).join('&family='));
    $('meta[name="theme-color"]')?.setAttribute('content', t.bg); $('meta[name="color-scheme"]')?.setAttribute('content', t.mode === 'light' ? 'light only' : 'dark only');
    // 🏷 логотип у шапці
    const lg = $('.top .logo'); if (lg) { lg.querySelector('img')?.remove(); if (t.logo && brand?.logo) { const i = document.createElement('img'); i.src = brand.logo; i.alt = ''; lg.prepend(i); } }
    // 📣 стрічка над меню
    if (t.note?.t) { const n = document.createElement('div'); n.id = 'mtNote'; const light = hex(t.note.c).reduce((p, x, i) => p + x * [.299, .587, .114][i], 0) > 150; n.style.cssText = `background:${t.note.c};color:${light ? '#141414' : '#fff'}`; n.textContent = t.note.t; $('#cats')?.before(n); }
  }
  function fonts(k) { if (k === fk) return; fk = k; $('#mtFonts')?.remove(); if (!k) return; const l = document.createElement('link'); l.id = 'mtFonts'; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${k}&display=swap`; document.head.append(l); }
  return { apply };
})();
