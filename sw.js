const CACHE_VERSION = '0.9.0';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    // Network-first for same-origin JS files
    if (url.origin === self.location.origin && url.pathname.endsWith('.js')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    }
});
