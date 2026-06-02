const CACHE = "pa-atv-gps-map-v200";
const FILES = ["./", "index.html", "style.css", "app.js", "manifest.json", "map.jpg", "icon-192.png", "icon-512.png", "install-qr.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
