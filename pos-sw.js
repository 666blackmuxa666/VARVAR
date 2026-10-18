// 📴 Каса без інтернету: усі файли каси (сторінка, стилі, скрипти, звуки, іконки) — з мережі, а якщо її немає або вона «висить» — з копії в браузері.
// Копія робиться одразу при встановленні (не лише з того, що вже відкривали) і оновлюється після кожного успішного завантаження.
// Запити до сервера (API, WebSocket) сюди не потрапляють — їх обробляє офлайн-черга в самій касі.
const C = 'pos-v2';
const PRE = ['pos.html', 'pos.webmanifest', 'css/pos.css', 'css/skin.css', 'js/config.js', 'js/skin.js', 'js/prnroute.js', 'js/tabprint.js', 'js/photo-ai.js', 'js/avatar.js', 'js/floor3d.js', 'js/pos.build.js', 'printer/logo.png', 'img/icon.png', 'img/app/pos.png', 'snd/duck.mp3'];
const FILE = /\.(html|css|js|png|jpe?g|webp|svg|ico|mp3|ogg|wav|woff2?|webmanifest)$/;
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(PRE.map(u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? c.put(u, r) : 0).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k.startsWith('pos-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const fromCache = req => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true }));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || /\/api\//.test(u.pathname) || !FILE.test(u.pathname) || /pos-sw\.js$/.test(u.pathname)) return;
  e.respondWith(new Promise(res => {
    let done = false; const give = r => { if (!done && r) { done = true; res(r); } };
    // мережа «висить» (Wi-Fi є, інтернету нема) — через 4 с віддаємо копію, а свіжий файл докладемо в копію, коли дійде
    const t = setTimeout(() => fromCache(e.request).then(give), 4000);
    fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)); } clearTimeout(t); if (r.ok || done) return give(r); return fromCache(e.request).then(x => give(x || r)); })
      .catch(() => { clearTimeout(t); fromCache(e.request).then(x => give(x || Response.error())); });
  }));
});

// 🔔 сповіщення в шторку (Web Push): показати; тап → відкрити касу (або перейти в уже відкриту)
self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(m.title || 'ATOM', { body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag, icon: 'img/app/pos.png', badge: 'img/app/pos.png', requireInteraction: !!m.urgent, silent: false, data: { go: m.go || null } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const go = e.notification.data && e.notification.data.go;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const c = l.find(x => /pos\.html/.test(x.url)); if (c) { c.postMessage({ push: 1, go }); return c.focus(); }
    return self.clients.openWindow('pos.html');
  }));
});
