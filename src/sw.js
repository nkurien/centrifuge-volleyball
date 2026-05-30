const CACHE_NAME = 'centrifuge-volleyball-v1';
const ASSETS = [
    './',
    './index.html',
    './styles/styles.css',
    './js/config.js',
    './js/Game.js',
    './js/Player.js',
    './js/Ball.js',
    './js/Vector.js',
    './assets/hit.ogg',
    './assets/hit.mp3',
    './assets/oops.ogg',
    './assets/oops.mp3',
    './assets/win.ogg',
    './assets/win.mp3',
    './assets/icon-192.png',
    './assets/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                }),
            );
        }),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        }),
    );
});
