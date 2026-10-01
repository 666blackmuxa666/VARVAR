// Налаштування закладу — редагуйте тут
window.VARVAR = {
  // URL Cloudflare Worker (після деплою); локально — wrangler dev
  api: location.hostname === 'localhost' ? 'http://localhost:8787' : 'https://varvar-menu.varvar.workers.dev',
  wifi: { ssid: 'VARVAR', password: 'ЗМІНІТЬ_ПАРОЛЬ' },
  tables: 15,
};
