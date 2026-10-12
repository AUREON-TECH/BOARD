const CACHE_PREFIX = 'board-shell-';
const CACHE_VERSION = 'v11';
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const SHELL = [
  './index.html', './styles.css?v=10', './app.js?v=10',
  './manifest.webmanifest', './offline.html',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
const PUBLIC_ASSETS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function safeRequest(request) {
  return !['Authorization', 'Cookie', 'Range', 'If-Range'].some(name => request.headers.has(name));
}

function safeResponse(response) {
  if (!response.ok || response.type !== 'basic') return false;
  const cacheControl = response.headers.get('Cache-Control') || '';
  if (/\b(?:private|no-store|no-cache)\b/i.test(cacheControl)) return false;
  if (response.headers.has('Set-Cookie') || response.headers.has('Content-Range')) return false;
  const vary = response.headers.get('Vary') || '';
  if (vary.trim() === '*' || /\b(?:Authorization|Cookie)\b/i.test(vary)) return false;
  return true;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation is always network-only. Only the public offline page is a fallback.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match('./offline.html')));
    return;
  }

  // Never cache API calls, unknown paths, authenticated requests or partial responses.
  if (!PUBLIC_ASSETS.has(url.href) || !safeRequest(request)) return;
  event.respondWith(
    fetch(request, { cache: 'no-store' }).then(response => {
      if (safeResponse(response)) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
