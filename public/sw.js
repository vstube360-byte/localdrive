// LocalCloud Offline Service Worker
const CACHE_NAME = 'localcloud-offline-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('Pre-cache initial warning:', err);
      }
    })
  );
});

// Activate: Clean up older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, internal, and WebSocket requests
  if (
    request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // Bypass service worker cache for Vite dev server internals to prevent duplicate React instances
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.includes('/.vite/') ||
    url.pathname.includes('hot-update') ||
    url.pathname.startsWith('/__vite') ||
    url.pathname.startsWith('/__aistudio') ||
    url.pathname.includes('node_modules')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. Navigation requests (HTML document loads)
      if (request.mode === 'navigate') {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone()).catch(() => {});
            cache.put('/index.html', networkResponse.clone()).catch(() => {});
            cache.put('/', networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          // Offline fallback
          const cached =
            (await cache.match(request)) ||
            (await cache.match('/index.html')) ||
            (await cache.match('/'));
          if (cached) return cached;
          return new Response('Offline: Page not cached yet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      }

      // 2. Static & dynamic assets (manifest.json, CSS, fonts, images, icons)
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        // Offline asset fallback from cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return (
          (await cache.match('/manifest.json')) ||
          new Response('Resource offline unavailable', { status: 408 })
        );
      }
    })()
  );
});

