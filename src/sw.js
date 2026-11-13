// Service worker for offline use. vite-sw-plugin.js bundles this file into
// dist/sw.js after the main build and fills in the two constants below.
import {
  FONT_CACHE,
  buildPrecacheList,
  decideStrategy,
  isCacheable,
  shellCacheName,
  staleCacheNames
} from './sw/swLogic.js';

/* global __SW_VERSION__, __SW_FILES__ */
const CACHE = shellCacheName(__SW_VERSION__);
const scope = self.registration.scope;
const precacheUrls = buildPrecacheList(__SW_FILES__).map(path => new URL(path, scope).href);
const precacheSet = new Set(precacheUrls);
const shellUrl = new URL('./', scope).href;

self.addEventListener('install', event => {
  // No skipWaiting here on purpose. The page asks for it once the user
  // clicks "Reload" on the update prompt.
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(precacheUrls.map(url => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(staleCacheNames(names, CACHE).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'GET_VERSION') event.ports[0]?.postMessage(__SW_VERSION__);
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(response => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const strategy = decideStrategy(request, { origin: self.location.origin, precacheUrls: precacheSet });

  if (strategy === 'precache') {
    const url = new URL(request.url);
    event.respondWith(
      caches
        .match(url.origin + url.pathname, { cacheName: CACHE })
        .then(hit => hit || fetch(request))
    );
  } else if (strategy === 'navigate') {
    event.respondWith(
      caches.match(shellUrl, { cacheName: CACHE }).then(hit => hit || fetch(request))
    );
  } else if (strategy === 'fonts') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
