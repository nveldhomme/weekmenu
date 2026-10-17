// Service worker voor Staphorst Weekmenu.
// Pagina en data.json: eerst het netwerk (zodat het menu van de nieuwe week direct zichtbaar is),
// bij geen verbinding de laatst bewaarde versie. Iconen en lettertypen: eerst uit de cache.
const CACHE = "weekmenu-v2";
const CORE = ["./", "./index.html", "./data.json", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === "navigate") return cache.match("./index.html");
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (sameOrigin && (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("data.json") || url.pathname.endsWith("/"))) {
    e.respondWith(networkFirst(req));
  } else if (sameOrigin || isFont) {
    e.respondWith(cacheFirst(req));
  }
});
