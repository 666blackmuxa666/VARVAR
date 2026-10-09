// Налаштування закладу — редагуйте тут
window.VARVAR = {
  // URL Cloudflare Worker (після деплою); локально — wrangler dev
  api: location.hostname === 'localhost' ? 'http://localhost:8787' : 'https://varvar-menu.varvar.workers.dev',
  wifi: { ssid: 'VARVAR', password: '66666666' }, // порожній = відкрита мережа
  tables: 15,
};
// 🏪 мультизаклад: ?v=<заклад> — свій сервер (/v/<заклад>), своє сховище в браузері й посилання між сторінками зберігають заклад
(() => {
  // ↪️ старі QR і посилання (github.io) → posatom.online: лише сторінки гостя (меню, візитка); каса й кабінет лишаються, щоб нікого не вибило з входу
  if (location.hostname === '666blackmuxa666.github.io') { const pg = (location.pathname.match(/\/VARVAR\/(index\.html|about\.html)?$/) || [])[1];
    if (pg !== undefined || /\/VARVAR\/?$/.test(location.pathname)) { const q = new URLSearchParams(location.search), vn = q.get('venue'); q.delete('venue'); const qs = q.toString();
      location.replace(`https://posatom.online/${/^(?=.*[a-z])[a-z0-9][a-z0-9-]{1,30}$/.test(vn || '') ? vn : 'varvar'}/${pg || 'index.html'}${qs ? '?' + qs.replace(/=(&|$)/g, '$1') : ''}${location.hash}`); window.VARVAR.moving = 1; return; } } /* moving — меню й візитка не стартують на старій адресі */
  const C = window.VARVAR, ATOM = /(^|\.)posatom\.online$/.test(location.hostname), seg = ATOM ? location.pathname.split('/')[1] || '' : '';
  const v = ATOM ? (seg === 'varvar' || seg === 'owner' ? '' : seg) : new URLSearchParams(location.search).get('venue') || ''; // ?venue= (не ?v= — це версія); на posatom.online — зі шляху /<заклад>/
  C.venue = /^(?=.*[a-z])[a-z0-9][a-z0-9-]{1,30}$/.test(v) && v !== 'varvar' ? v : '';
  C.pre = C.venue ? 'vv_' + C.venue + '_' : 'vv_';
  if (C.venue) C.api += '/v/' + C.venue;
  C.link = u => { if (!C.venue || ATOM) return u; /* на posatom.online заклад уже в шляху */ const [p, h] = u.split('#'); return p + (p.includes('?') ? '&' : '?') + 'venue=' + C.venue + (h != null ? '#' + h : ''); };
  if (C.venue && !ATOM) document.addEventListener('click', e => { const a = e.target.closest?.('a[href]'); if (!a) return; const h = a.getAttribute('href'); if (/^(index|about)\.html/.test(h) && !/[?&]venue=/.test(h)) a.setAttribute('href', C.link(h)); }, true);
})();
