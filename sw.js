// Offline support. Strategy: serve from cache immediately, refresh the cache in
// the background — so a newly deployed version shows up on the NEXT launch,
// never mid-game.
const CACHE = 'power-river';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Navigations (the app opening) all map to the cached index page.
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: req.mode === 'navigate' });
    const refresh = fetch(sameOrigin ? new Request(req, { cache: 'no-cache' }) : req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
        return res;
      })
      .catch(() => undefined);
    if (cached) { e.waitUntil(refresh); return cached; }
    return (await refresh) || new Response('ออฟไลน์อยู่ — เปิดเกมครั้งแรกขณะต่ออินเทอร์เน็ต', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
