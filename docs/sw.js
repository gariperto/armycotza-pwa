const CACHE = 'armycotza-shell-v17';
const SHELL = ['./','./index.html','./style.css?v=17','./manifest.webmanifest?v=15','./js/app.js?v=17','./js/db.js?v=13','./js/data.js?v=13','./js/map.js?v=17','./assets/logo-oficial.png','./assets/icon-shield-180.png','./assets/icon-shield-192.png','./assets/icon-shield-512.png','./assets/especie-1.png','./assets/especie-2.png','./assets/especie-3.png','./assets/especie-4.png','./assets/especie-5.png','./assets/boletus-aereus.jpg','./assets/imleria-badia.jpg','./assets/butyriboletus-regius.jpg','./assets/boletus-pinophilus.jpg','./assets/neoboletus-erythropus.jpg','./assets/leccinellum-lepidum.jpg','./assets/craterellus-cornucopioides.jpg','./assets/official-routes.json'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Provider map tiles are deliberately excluded from app caching and prefetching.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request).catch(() => caches.match('./index.html'))); return; }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
