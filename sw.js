// Service worker for offline access to TrailWithKev.
// Bump CACHE_VERSION whenever page content changes so visitors
// pick up the new version next time they're online.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `trailwithkev-${CACHE_VERSION}`;

// Core pages/assets to cache the moment the service worker installs,
// so the whole site is available offline after a single visit.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/terms.html',
  '/manifest.json',
  '/public/favicon.jpg',
  '/itineraries/washington.html',
  '/itineraries/montana.html',
  '/itineraries/canadian_rockies.html',
  '/itineraries/guatemala.html',
  '/nh48/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly (works offline),
// and refresh the cache in the background whenever there's a connection.
// Covers same-origin pages/assets as well as cross-origin ones (Google
// Fonts, Leaflet/unpkg, map tiles) so as much as possible still works
// without signal on a later visit.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => undefined);

        if (cached) return cached;

        return network.then((response) => {
          if (response) return response;
          // Nothing cached and no network — for page navigations, fall
          // back to the homepage shell rather than a hard browser error.
          if (request.mode === 'navigate') return cache.match('/index.html');
          return undefined;
        });
      })
    )
  );
});
