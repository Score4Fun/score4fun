// Score4Fun Service Worker — network-first pour toujours servir la dernière version
const CACHE = 's4f-v22';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  // Supprimer les anciens caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Pour l'HTML principal → toujours réseau d'abord
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          // Mettre en cache la version fraîche
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // fallback si hors ligne
    );
    return;
  }

  // Pour les assets (fonts, CDN JS) → cache d'abord
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
      return cached || net;
    })
  );
});
