// v2 — network-first (pega versão nova quando online; cache é fallback offline)
const CACHE_NAME = 'yasmin-foco-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => undefined);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Só lida com GET (outros métodos não podem ser cacheados)
  if (event.request.method !== 'GET') return;

  // API do Firestore/Google — network-only (sem cache, evita dados velhos)
  if (event.request.url.includes('firestore') || event.request.url.includes('googleapis')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first para TUDO (HTML, JS, CSS, imagens):
  // Tenta baixar versão fresh → se offline, usa cache como fallback.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cacheia respostas OK pra uso offline
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
          return new Response('', { status: 504 });
        });
      })
  );
});
