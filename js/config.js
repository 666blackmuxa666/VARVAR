// Налаштування закладу — редагуйте тут
window.VARVAR = {
  // URL Cloudflare Worker (після деплою); локально — wrangler dev
  api: location.hostname === 'localhost' ? 'http://localhost:8787' : 'https://varvar-menu.varvar.workers.dev',
  wifi: { ssid: 'VARVAR', password: '66666666' }, // порожній = відкрита мережа
  tables: 15,
};
// 🏪 мультизаклад: ?v=<заклад> — свій сервер (/v/<заклад>), своє сховище в браузері й посилання між сторінками зберігають заклад
(() => {
  const C = window.VARVAR, v = new URLSearchParams(location.search).get('v') || '';
  C.venue = /^[a-z0-9][a-z0-9-]{1,30}$/.test(v) && v !== 'varvar' ? v : '';
  C.pre = C.venue ? 'vv_' + C.venue + '_' : 'vv_';
  if (C.venue) C.api += '/v/' + C.venue;
  C.link = u => { if (!C.venue) return u; const [p, h] = u.split('#'); return p + (p.includes('?') ? '&' : '?') + 'v=' + C.venue + (h != null ? '#' + h : ''); };
  if (C.venue) document.addEventListener('click', e => { const a = e.target.closest?.('a[href]'); if (!a) return; const h = a.getAttribute('href'); if (/^(index|about)\.html/.test(h) && !/[?&]v=/.test(h)) a.setAttribute('href', C.link(h)); }, true);
})();
