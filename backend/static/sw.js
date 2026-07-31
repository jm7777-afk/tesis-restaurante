const CACHE_NAME = "donde-david-pwa-v1";
const ASSETS_TO_CACHE = [
  "/static/index.html",
  "/static/cliente/app.html",
  "/static/css/global.css",
  "/static/css/toon-theme.css",
  "/static/js/auth.js",
  "/static/js/websocket.js",
  "/static/images/logo-donde-david.jpg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
