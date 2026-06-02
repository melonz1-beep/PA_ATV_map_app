const CACHE_NAME = "pa-atv-gps-trail-app-v300";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "map.jpg",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "install-qr.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(response => response || fetch(event.request)));
});
const CACHE_NAME = "pa-atv-map-v4";
