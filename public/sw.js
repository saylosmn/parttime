/* Цаг service worker: push мэдэгдэл + энгийн offline fallback */
const CACHE = 'tsag-v2';
// Dev орчинд /_next/static файлууд hash-гүй тул cache хийхгүй
const IS_DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname);
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Хуудсууд: network-first, сүлжээгүй бол offline хуудас
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  const url = new URL(req.url);
  // Next.js-ийн hash-тай статик файлууд: cache-first
  if (!IS_DEV && url.origin === self.location.origin && (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/'))) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Цаг', body: event.data && event.data.text() };
  }
  const title = data.title || 'Цаг';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { link: data.link || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  const target = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url === target && 'focus' in w) return w.focus();
      }
      for (const w of wins) {
        if ('navigate' in w && 'focus' in w) return w.navigate(target).then((c) => c && c.focus());
      }
      return self.clients.openWindow(target);
    }),
  );
});
