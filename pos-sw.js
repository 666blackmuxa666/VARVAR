// 📴 Каса без інтернету: файли каси (сторінка, стилі, скрипти, лого) — з мережі, а якщо її немає — з копії в браузері.
// Запити до сервера (API) сюди не потрапляють — їх обробляє офлайн-черга в самій касі.
const C = 'pos-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !/\/(pos\.html|pos\.webmanifest|css\/pos\.css|js\/pos\.build\.js|printer\/logo\.png|img\/icon\.png)$/.test(u.pathname)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: u.pathname.endsWith('pos.html') }).then(r => r || caches.match(e.request, { ignoreSearch: true }))));
});
