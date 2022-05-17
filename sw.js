//https://github.com/ibrahima92/pwa-with-vanilla-js
const assets = [
  "/",
  "/index.html",
  "/dist/index.js",
  "/src/assets"
];

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open('spectrogrampwa').then(cache => {
      cache.addAll(assets);
    })
  );
});

self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
      return res || fetch(fetchEvent.request);
    })
  );
});