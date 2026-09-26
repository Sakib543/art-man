/*
 * Service worker (backlog P2.2a).
 *
 * What it does today, and nothing more:
 *
 * - keeps the app's built files (`/_next/static/…`) once they have been
 *   fetched. Their names carry a content hash, so a cached copy can never be
 *   stale — a new deploy simply asks for new names;
 * - when a page cannot be loaded because the network is down, shows
 *   `/offline.html` instead of the browser's own error screen.
 *
 * It deliberately does NOT cache pages. Every screen is rendered on the server
 * for the person signed in, with that moment's figures; a cached copy would
 * show yesterday's numbers as if they were today's, and would outlive a sign
 * out. Offline billing (P2.2d) will serve its own shell, fed from IndexedDB.
 *
 * Anything not described above — Server Actions, API calls, the connectivity
 * probe — passes through untouched.
 *
 * Bump VERSION to throw away every cache this worker made.
 */

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_CACHE = `offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const OFFLINE_FILES = [OFFLINE_URL, "/logo.png"];

/** Enough for a few deploys' worth of chunks; the oldest go first. */
const STATIC_LIMIT = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = [STATIC_CACHE, OFFLINE_CACHE];
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (!keep.includes(name)) await caches.delete(name);
      }
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(page(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(builtFile(request));
  } else if (OFFLINE_FILES.includes(url.pathname)) {
    event.respondWith(offlineFile(request));
  }
});

/** Always the network. Only when that fails, the offline page. */
async function page(event) {
  try {
    return (await event.preloadResponse) || (await fetch(event.request));
  } catch {
    return (await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE })) || Response.error();
  }
}

/** Cache first: a hashed file never changes under the same name. */
async function builtFile(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

/** The offline page's own files: fresh when online, the kept copy when not. */
async function offlineFile(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await (await caches.open(OFFLINE_CACHE)).put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request, { cacheName: OFFLINE_CACHE })) || Response.error();
  }
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - STATIC_LIMIT))) await cache.delete(key);
}
