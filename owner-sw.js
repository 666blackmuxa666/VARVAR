// 🔔 Кабінет власника: сповіщення CRM «Продажі ATOM» у шторку (Web Push). Тап → кабінет, вкладка «🚀 Продажі».
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(m.title || 'ATOM', { body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag, icon: 'img/app/pos.png', badge: 'img/app/pos.png', requireInteraction: !!m.urgent, silent: false }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const c = l.find(x => /\/owner/.test(x.url)); if (c) { c.postMessage({ crm: 1 }); return c.focus(); }
    return self.clients.openWindow('./#crm');
  }));
});
