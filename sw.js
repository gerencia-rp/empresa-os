// Empresa OS · Service Worker
// Strategy: network-first para shell HTML, cache-first para assets con hash.
// El bundle de JS ya tiene hash en el filename (bundle.XXXX.js), entonces es
// seguro cachearlo de forma indefinida; si cambia el hash, el index.html nuevo
// referencia un filename distinto y la versión vieja se va por ttl natural.

const CACHE_VERSION = 'v3';
const CACHE_NAME = `empresa-os-${CACHE_VERSION}`;
const SHELL = [
  '/',
  '/index.html',
  '/config.public.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  const url = new URL(req.url);

  // Solo GET, mismo origen
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Nunca cachear llamadas a APIs (supabase, anthropic, etc.) — siempre fresh
  if (url.pathname.startsWith('/functions/') || url.search.includes('access_token')) return;

  // Assets con hash (bundle.XXXX.js) — cache first
  if (url.pathname.startsWith('/assets/')) {
    ev.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }))
    );
    return;
  }

  // HTML / config — network first, fallback a cache si hay offline
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.webmanifest')) {
    ev.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('/')))
    );
    return;
  }
});
