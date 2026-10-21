// FieldShift 360 offline support: after the first visit the app opens without internet.
// - The page itself: network first (so updates arrive), the saved copy when offline.
// - Built files in assets/ (their names change with every build): saved on first use, then served from the cache.
// Live data (weather, NASA, map tiles) is not cached here; the app already falls back to saved data for those.
const CACHE = 'fieldshift-v1';
const SCOPE = new URL(self.registration.scope).pathname;
const SHELL = [SCOPE, `${SCOPE}index.html`];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Only the app's own page; other pages on the site (the radar under /radar/) are left alone.
  if (req.mode === 'navigate' && SHELL.includes(url.pathname)) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(`${SCOPE}index.html`, copy)); }
      return res;
    }).catch(() => caches.match(`${SCOPE}index.html`)));
    return;
  }
  if (url.pathname.startsWith(`${SCOPE}assets/`)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
