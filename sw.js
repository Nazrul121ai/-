// অফলাইনে চলার জন্য সহজ ক্যাশ: আগে নেটওয়ার্ক, না পেলে ক্যাশ
const CACHE = 'chalok-web-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(r, c)).catch(() => {}); return res; }).catch(() => caches.match(r).then(m => m || caches.match('./index.html'))));
});
