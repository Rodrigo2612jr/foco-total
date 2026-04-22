// Service Worker dedicado a Web Push notifications.
// Registrado em /index.tsx — separado do sw.js principal.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Foco Total', body: 'Você tem um lembrete.', url: '/#/tarefas' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (_e) {
    try {
      data.body = event.data ? event.data.text() : data.body;
    } catch (_e2) {
      // noop
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'focototal-push',
      data: { url: data.url || '/' },
      requireInteraction: true,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
