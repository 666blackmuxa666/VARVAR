// 🎨 Конструктор візитки: застосовує дизайн із кабінету власника (тема, фон, шрифти, головний екран, блоки, панель,
// оголошення, години, SEO, соцмережі, сезон, адреси, афіша, «Написати нам»). Без налаштувань сайт виглядає як раніше.
window.VVD = (() => {
  const $ = s => document.querySelector(s), R = document.documentElement;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FW = { 'Rubik': 'Rubik:wght@400;500;700', 'Rubik Dirt': 'Rubik+Dirt', 'Montserrat': 'Montserrat:wght@400;600;800', 'Playfair Display': 'Playfair+Display:wght@400;700', 'Lora': 'Lora:wght@400;600', 'Unbounded': 'Unbounded:wght@400;700', 'Comfortaa': 'Comfortaa:wght@400;700', 'Oswald': 'Oswald:wght@400;600', 'Nunito': 'Nunito:wght@400;700', 'Merriweather': 'Merriweather:wght@400;700', 'Russo One': 'Russo+One', 'Caveat': 'Caveat:wght@400;700', 'Manrope': 'Manrope:wght@400;700', 'Exo 2': 'Exo+2:wght@400;700' };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), toHex = a => '#' + a.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };
  const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
  const L = (o, lang) => (o && typeof o === 'object' ? o[lang] || o.uk || '' : o || '');
  const WD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд'], WDE = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const kyivWd = () => WDE.indexOf(new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short' }));
  const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' });
  // 🕐 години сьогодні: null = вихідний
  function hoursToday(s) { const h = s.hours?.[kyivWd()]; if (h && (h.off || (h.f && h.t))) return h.off ? null : { from: h.f, to: h.t }; return { from: s.from, to: s.to }; }
  const SEASON = { ny: ['🎄', '❄️', '🎁', '#e53935'], hw: ['🎃', '🦇', '👻', '#ff7a00'], summer: ['☀️', '🌴', '🍹', '#00bfa5'], easter: ['🌷', '🥚', '🐣', '#ab7bff'], love: ['💘', '🌹', '💌', '#ff4f8b'] };
  let fontsKey = '', obs = null, parOn = false;

  function theme(t) {
    const st = R.style;
    if (!t) { delete R.dataset.site; for (const k of ['--bg', '--card', '--card2', '--line', '--text', '--muted', '--soft', '--accent', '--ink', '--r', '--fh', '--fb', '--fz', '--navbg', '--pagebg']) st.removeProperty(k); for (const k of ['btn', 'cards', 'nav', 'caps', 'mode', 'anim']) delete R.dataset[k]; return; }
    R.dataset.site = '1';
    const v = { '--bg': t.bg, '--card': t.card, '--card2': mix(t.card, t.text, .06), '--line': mix(t.card, t.text, .12), '--text': t.text, '--muted': mix(t.text, t.bg, .42), '--soft': mix(t.text, t.bg, .12), '--accent': t.accent, '--ink': t.ink, '--r': t.r + 'px', '--fh': `'${t.fh}', ${t.fb === t.fh ? '' : `'${t.fb}', `}system-ui, sans-serif`, '--fb': `'${t.fb}', system-ui, sans-serif`, '--fz': { s: '15px', m: '16px', l: '18px' }[t.fs] || '16px', '--navbg': rgba(t.bg, .88) };
    const bgfx = { solid: t.bg, grad: `linear-gradient(${t.ang}deg, ${t.bg}, ${t.bg2}) fixed`, img: t.bgImg ? `linear-gradient(${rgba(t.bg, .78)}, ${rgba(t.bg, .9)}), url("${t.bgImg}") center/cover fixed` : t.bg,
      dots: `radial-gradient(${rgba(t.text, .09)} 1.2px, transparent 1.4px) 0 0/18px 18px, ${t.bg}`, grid: `linear-gradient(${rgba(t.text, .05)} 1px, transparent 1px) 0 0/28px 28px, linear-gradient(90deg, ${rgba(t.text, .05)} 1px, transparent 1px) 0 0/28px 28px, ${t.bg}`,
      noise: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E"), ${t.bg}` };
    v['--pagebg'] = bgfx[t.bgfx] || t.bg;
    for (const [k, x] of Object.entries(v)) st.setProperty(k, x);
    Object.assign(R.dataset, { btn: t.btn, cards: t.cards, nav: t.nav, caps: t.caps ? '1' : '0', mode: t.mode, anim: t.anim });
    const fk = [...new Set([t.fh, t.fb])].filter(f => f !== 'Rubik' && f !== 'Rubik Dirt').map(f => FW[f]).filter(Boolean).join('&family=');
    if (fk !== fontsKey) { fontsKey = fk; $('#vvFonts')?.remove(); if (fk) { const l = document.createElement('link'); l.id = 'vvFonts'; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${fk}&display=swap`; document.head.append(l); } }
    $('meta[name="theme-color"]')?.setAttribute('content', t.bg); $('meta[name="color-scheme"]')?.setAttribute('content', t.mode === 'light' ? 'light only' : 'dark only');
  }

  function hero(s, h, t, link) {
    const H = $('.hero'); if (!H) return;
    const tel = 'tel:' + String(s.phone || '').replace(/[^\d+]/g, '');
    R.dataset.hero = h?.lay || ''; H.style.setProperty('--hh', (h?.h || 62) + 'vh'); H.style.setProperty('--dim', ((h?.dim ?? 40) / 100).toFixed(2)); H.dataset.al = h?.al || 'l';
    if (h) { $('#openBadge').hidden = !h.badge; $('.hero .addr').hidden = !h.addr; } else { $('#openBadge').hidden = false; $('.hero .addr').hidden = false; }
    let lg = $('#hLogo'); if (h?.logo && s.logo) { if (!lg) { lg = document.createElement('img'); lg.id = 'hLogo'; lg.alt = ''; $('#sName').before(lg); } lg.src = s.logo; } else lg?.remove();
    const B = { order: `<a class="btn" data-hit="order" href="index.html?go">🛵 <span>${t('order')}</span></a>`, book: s.bookOn ? `<a class="btn alt" data-hit="book" href="#book">📅 <span>${t('book')}</span></a>` : '', call: `<a class="btn ghost" data-hit="call" id="callA" href="${esc(tel)}">📞 <span>${t('call')}</span></a>`,
      route: `<a class="btn ghost" data-hit="route" id="routeA" href="${esc(link)}" target="_blank" rel="noopener">🧭 <span>${t('route')}</span></a>`, own: h?.own?.t && h.own.u ? `<a class="btn ghost" href="${esc(h.own.u)}"${/^https/.test(h.own.u) ? ' target="_blank" rel="noopener"' : ''}>${esc(h.own.t)}</a>` : '' };
    const list = h ? h.btns : ['order', 'book', 'call', 'route'];
    $('.hero .cta').innerHTML = list.map(k => B[k] || '').join('');
  }

  // 🧱 блоки: свої заголовки, власні блоки, афіша, порядок
  function custom(b, s, lang, t) {
    const T = L(b.t, lang), h2 = T ? `<h2>${esc(T)}</h2>` : '', P = x => esc(L(x, lang)).replace(/\n/g, '<br>');
    if (b.type === 'text') return `${h2}<p class="cb-txt">${P(b.txt)}</p>`;
    if (b.type === 'media') return `<div class="cb-media ${b.side === 'r' ? 'r' : ''}">${b.img ? `<img src="${esc(b.img)}" alt="" loading="lazy">` : '<div></div>'}<div>${h2}<p class="cb-txt">${P(b.txt)}</p></div></div>`;
    if (b.type === 'feats') return `${h2}<div class="feats">${(b.items || []).map(x => `<div><b>${esc(x.e)}</b><span>${esc(L(x.l, lang))}</span></div>`).join('')}</div>`;
    if (b.type === 'links') return `${h2}<div class="cta">${(b.links || []).map((x, i) => `<a class="btn${i ? ' ghost' : ''}" href="${esc(x.u)}"${/^https/.test(x.u) ? ' target="_blank" rel="noopener"' : ''}>${esc(L(x.l, lang))}</a>`).join('')}</div>`;
    if (b.type === 'quote') return `<blockquote class="cb-q">«${P(b.txt)}»${b.by ? `<small>— ${esc(b.by)}</small>` : ''}</blockquote>`;
    if (b.type === 'sep') return '<div class="cb-sep"><span>✦</span></div>';
    if (b.type === 'soc') return `${h2 || `<h2>${lang === 'en' ? 'Follow us' : 'Ми в соцмережах'}</h2>`}<div class="soc big">${socHTML(s)}</div>`;
    return '';
  }
  const SOC = { insta: '📸 Instagram', tg: '✈️ Telegram', tiktok: '🎵 TikTok', fb: '📘 Facebook', viber: '💜 Viber', yt: '▶️ YouTube' };
  const socHTML = s => { const o = { ...(s.insta ? { insta: s.insta } : {}), ...(s.tg ? { tg: s.tg } : {}), ...(s.soc || {}) }; return Object.entries(o).filter(([k, u]) => SOC[k] && u).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${SOC[k]}</a>`).join(''); };
  function events(s, lang, t) {
    let sec = $('#events'); if (!sec) { sec = document.createElement('section'); sec.id = 'events'; $('main').append(sec); }
    const td = today(), l = (s.events || []).filter(e => e.d >= td);
    sec.hidden = !l.length; if (!l.length) return sec;
    const dd = d => new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { day: 'numeric', month: 'long', weekday: 'short' });
    sec.innerHTML = `<h2 data-o>${lang === 'en' ? '🎵 Events' : '🎵 Афіша'}</h2><div class="evs">${l.map(e => `<div class="evc">${e.img ? `<img src="${esc(e.img)}" alt="" loading="lazy">` : ''}<div><small>${esc(dd(e.d))}${e.tm ? ' · ' + e.tm : ''}</small><b>${esc(L(e.t, lang))}</b>${L(e.txt, lang) ? `<p>${esc(L(e.txt, lang))}</p>` : ''}${e.book && s.bookOn ? `<a class="btn alt" href="#book" data-evd="${e.d}">📅 ${t('book')}</a>` : ''}</div></div>`).join('')}</div>`;
    return sec;
  }
  function blocks(s, lang, t) {
    const main = $('main'), two = $('.two'), ev = events(s, lang, t);
    const ALL = ['about', 'promos', 'menu', 'events', 'gallery', 'hookah', 'banquet', 'book', 'cert', 'reviews', 'contacts'];
    const list = [...(s.blocks || []), ...ALL.filter(id => !(s.blocks || []).some(b => b.id === id)).map(id => ({ id, on: 1 }))];
    // свої заголовки (оригінал зберігаємо, щоб повернути)
    for (const id of ALL) { const h = $('#' + id + ' h2'); if (!h || h.hasAttribute('data-o')) continue; if (h.dataset.orig == null) h.dataset.orig = h.innerHTML; const b = list.find(x => x.id === id), T = L(b?.t, lang); h.innerHTML = T ? esc(T) : h.dataset.orig; if (!T) h.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); }); }
    const keep = new Set(list.filter(b => b.type).map(b => 'cb-' + b.id)); document.querySelectorAll('main > section.cb').forEach(x => { if (!keep.has(x.id)) x.remove(); });
    const placed = new Set();
    for (const b of list) {
      let x;
      if (b.type) { x = $('#cb-' + b.id); if (!x) { x = document.createElement('section'); x.id = 'cb-' + b.id; x.className = 'cb'; } x.dataset.type = b.type; x.innerHTML = custom(b, s, lang, t); x.hidden = !b.on; }
      else if (b.id === 'hookah' || b.id === 'banquet') { x = two; $('#' + b.id).hidden = !b.on; }
      else { x = b.id === 'events' ? ev : $('#' + b.id); if (!x) continue; if (b.id === 'book') x.hidden = !b.on || !s.bookOn; else if (b.id === 'cert') x.hidden = !b.on || !s.certOn; else if (b.id === 'promos') x.hidden = !b.on || !s.promos?.length; else if (b.id === 'gallery') x.hidden = !b.on || !s.photos?.length; else if (b.id === 'events') x.hidden = !b.on || x.hidden; else x.hidden = !b.on; }
      if (x && !placed.has(x)) { main.append(x); placed.add(x); }
    }
    if (two) two.hidden = $('#hookah').hidden && $('#banquet').hidden;
  }

  function dock(s, t, link) {
    let d = $('#vvDock'); const on = s.dock?.on && s.dock.btns?.length;
    if (!on) { d?.remove(); document.body.classList.remove('has-dock'); return; }
    if (!d) { d = document.createElement('nav'); d.id = 'vvDock'; d.className = 'dock'; document.body.append(d); }
    const tel = 'tel:' + String(s.phone || '').replace(/[^\d+]/g, '');
    const B = { order: `<a class="main" data-hit="order" href="index.html?go">🛵 ${t('order')}</a>`, call: `<a data-hit="call" href="${esc(tel)}" aria-label="${t('call')}">📞</a>`, book: `<a data-hit="book" href="#book" aria-label="${t('book')}">📅</a>`, route: `<a data-hit="route" href="${esc(link)}" target="_blank" rel="noopener" aria-label="${t('route')}">🧭</a>` };
    d.innerHTML = s.dock.btns.map(k => B[k]).join(''); d.style.gridTemplateColumns = s.dock.btns.map(k => k === 'order' ? '1fr' : '56px').join(' ');
    document.body.classList.add('has-dock');
  }
  function ann(s, lang) {
    let a = $('#vvAnn'); const x = s.ann, on = x?.on && L(x.t, lang) && !(x.till && x.till < today());
    if (!on) { a?.remove(); return; }
    if (!a) { a = document.createElement('div'); a.id = 'vvAnn'; document.body.prepend(a); }
    const light = hex(x.c).reduce((p, v, i) => p + v * [.299, .587, .114][i], 0) > 150;
    a.style.cssText = `background:${x.c};color:${light ? '#141414' : '#fff'}`;
    a.innerHTML = x.u ? `<a href="${esc(x.u)}" style="color:inherit">${esc(L(x.t, lang))} →</a>` : esc(L(x.t, lang));
  }
  function season(s) {
    const k = s.season?.k && !(s.season.till && s.season.till < today()) ? s.season.k : '';
    R.dataset.season = k; let d = $('#vvSeason');
    if (!k || !SEASON[k]) { d?.remove(); R.style.removeProperty('--season'); return; }
    if (!d) { d = document.createElement('div'); d.id = 'vvSeason'; d.setAttribute('aria-hidden', 'true'); document.body.append(d); }
    const [a, b, c, col] = SEASON[k]; R.style.setProperty('--season', col);
    d.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 7.3 + (i % 3) * 2) % 100}%;animation-delay:-${(i * 1.7) % 12}s;animation-duration:${10 + (i % 5) * 2}s">${[a, b, c][i % 3]}</i>`).join('');
  }
  function contacts(s, lang, t) {
    // 🕐 розклад по днях
    const c = $('#cHours'), lbl = c?.previousElementSibling; if (c) { const has = s.hours?.some(h => h.off || (h.f && h.t)), td = kyivWd(); if (lbl) lbl.hidden = !!has; c.innerHTML = has ? '<span class="hrs">' + s.hours.map((h, i) => `<span${i === td ? ' class="on"' : ''}>${lang === 'en' ? WDE[i] : WD[i]} ${h.off ? (lang === 'en' ? 'closed' : 'вихідний') : h.f && h.t ? h.f + '–' + h.t : s.from + '–' + s.to}</span>`).join('') + '</span>' : esc(`${s.from}–${s.to}`); }
    const so = $('#socials'); if (so) so.innerHTML = socHTML(s);
    let box = $('#addrs'); const l = s.addrs || [];
    if (!l.length) box?.remove();
    else { if (!box) { box = document.createElement('div'); box.id = 'addrs'; box.className = 'addrs'; $('#contacts').after(box); } box.innerHTML = `<h3>${lang === 'en' ? '📍 Our locations' : '📍 Наші адреси'}</h3>` + l.map(a => `<div class="adr"><b>${esc(a.n || a.a)}</b>${a.n ? `<span>${esc(a.a)}</span>` : ''}${a.h ? `<span>🕐 ${esc(a.h)}</span>` : ''}${a.p ? `<a href="tel:${esc(a.p.replace(/[^\d+]/g, ''))}">📞 ${esc(a.p)}</a>` : ''}<a href="${esc(a.m || 'https://www.google.com/maps?q=' + encodeURIComponent(a.a))}" target="_blank" rel="noopener">🧭 ${t('route')}</a></div>`).join(''); }
    // 💬 «Написати нам»
    let ch = $('#vvChatB'); if (!s.chat) ch?.remove(); else if (!ch) { ch = document.createElement('button'); ch.id = 'vvChatB'; ch.className = 'btn alt'; ch.type = 'button'; $('#routeB')?.after(ch); }
    if (ch) ch.textContent = lang === 'en' ? '💬 Message us' : '💬 Написати нам';
  }
  function seo(s) {
    const T = s.seo?.title || s.name; if (T) document.title = T;
    let m = $('meta[name="description"]'); if (s.seo?.desc && m) m.setAttribute('content', s.seo.desc);
    if (s.logo) { const i = $('link[rel="icon"]'); if (i) i.href = s.logo; }
  }
  function motion(t) {
    obs?.disconnect(); obs = null; const secs = document.querySelectorAll('main > section');
    if (t?.anim && t.anim !== 'none' && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
      secs.forEach(x => { if (!x.classList.contains('in')) obs.observe(x); });
    } else secs.forEach(x => x.classList.add('in'));
    const want = !!t?.par && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (want && !parOn) { parOn = true; let raf = 0; addEventListener('scroll', () => { if (raf || !parOn) return; raf = requestAnimationFrame(() => { raf = 0; const b = $('#heroBg'); if (b && parOn) b.style.transform = `translateY(${Math.min(scrollY, 900) * .35}px) scale(1.06)`; }); }, { passive: true }); }
    if (!want && parOn) { parOn = false; const b = $('#heroBg'); if (b) b.style.transform = ''; }
  }
  // 📊 лічильник: один запит на подію за сесію (не в перегляді конструктора)
  function hit(api, e, preview) { if (preview) return; try { const k = 'vv_hit_' + e; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { return; } fetch(api + '/api/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ e }), keepalive: true }).catch(() => {}); }

  function apply(s, lang, t, link) {
    theme(s.theme || null); hero(s, s.heroCfg || null, t, link); blocks(s, lang, t); contacts(s, lang, t); dock(s, t, link); ann(s, lang); season(s); seo(s); motion(s.theme);
    if (s.langs === 0) $('#lng').hidden = true;
  }
  return { apply, hoursToday, hit };
})();
