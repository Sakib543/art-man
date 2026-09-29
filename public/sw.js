/*
 * Service worker (backlog P2.2a, P2.2d, P2.2e).
 *
 * What it does, and nothing more:
 *
 * - keeps the app's built files (`/_next/static/…`) once they have been
 *   fetched. Their names carry a content hash, so a cached copy can never be
 *   stale — a new deploy simply asks for new names;
 * - keeps the offline pages — Billing (P2.2d), Daily folders and the Register
 *   (P2.2e) — and every built file each names, refreshed whenever a signed-in
 *   page asks (`components/pwa-setup.tsx`);
 * - when the network is down: a screen that has an offline page opens it
 *   instead, if it is kept; any other page shows `/offline.html` instead of
 *   the browser's own error screen.
 *
 * It deliberately does NOT cache the app's pages. Every screen is rendered on
 * the server for the person signed in, with that moment's figures; a cached
 * copy would show yesterday's numbers as if they were today's, and would
 * outlive a sign out. The offline pages are the one exception because they
 * hold nothing: they are static, and fill themselves from this browser's
 * IndexedDB.
 *
 * Anything not described above — Server Actions, API calls, the connectivity
 * probe — passes through untouched.
 *
 * Bump VERSION to throw away every cache this worker made.
 */

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_CACHE = `offline-${VERSION}`;
const SHELL_CACHE = `shell-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const OFFLINE_FILES = [OFFLINE_URL, "/logo.png"];

/**
 * The offline pages. `src/lib/offline/pages.ts` names the same ones, and its
 * test reads this file: keep the two together.
 */
const SHELL_URLS = ["/offline-billing", "/offline-folders", "/offline-register"];

/** With no network, these screens open their offline page (when it is kept). */
const OFFLINE_FOR = new Map([
  ["/", "/offline-billing"],
  ["/billing", "/offline-billing"],
  ["/folders", "/offline-folders"],
  ["/daily-report", "/offline-register"],
  ["/worksheet", "/offline-register"],
]);

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
  const keep = [STATIC_CACHE, OFFLINE_CACHE, SHELL_CACHE];
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

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  // "cache-offline-billing" is what pages from before P2.2e send.
  if (type === "cache-offline-pages" || type === "cache-offline-billing") event.waitUntil(cacheShells());
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

/**
 * Always the network. Only when that fails: an offline page is served as it
 * was kept; a screen that has one is sent to it — by a redirect, so the page's
 * address and the app's router agree; and anything else gets the offline page.
 */
async function page(event) {
  try {
    return (await event.preloadResponse) || (await fetch(event.request));
  } catch {
    const { pathname } = new URL(event.request.url);
    if (SHELL_URLS.includes(pathname)) {
      const kept = await caches.match(pathname, { cacheName: SHELL_CACHE });
      if (kept) return kept;
    }
    const target = OFFLINE_FOR.get(pathname);
    if (target && (await caches.match(target, { cacheName: SHELL_CACHE }))) {
      return Response.redirect(new URL(target, self.location.origin).href, 302);
    }
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

/** Keep every offline page, one after another. Signed out, none is kept. */
async function cacheShells() {
  for (const url of SHELL_URLS) {
    if ((await cacheShell(url)) === "signed-out") return;
  }
}

/**
 * Keep one offline page and every built file it names, so that it opens with
 * no network at all. The page is stored last, once all of its files are in: a
 * page whose scripts are missing would open blank, which is worse than the
 * offline page.
 */
async function cacheShell(url) {
  let response;
  try {
    // `manual`: signed out, the proxy answers with a redirect to /login, and
    // the login page must never be kept as an offline one.
    response = await fetch(url, { cache: "no-store", redirect: "manual", credentials: "same-origin" });
  } catch {
    return "failed";
  }
  if (response.type === "opaqueredirect") return "signed-out";
  if (!response.ok) return "failed";

  const html = await response.clone().text();
  const files = [...new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || [])];
  const statics = await caches.open(STATIC_CACHE);
  for (const file of files) {
    const kept = await statics.match(file);
    if (kept) {
      // Stored again, so it counts as new: `trim` must not throw out a file
      // an offline page still needs just because it was first kept long ago.
      await statics.put(file, kept);
      continue;
    }
    try {
      const built = await fetch(file);
      if (!built.ok) return "failed";
      await statics.put(file, built);
    } catch {
      // The network went mid-way; the next load finishes the job.
      return "failed";
    }
  }
  await trim(statics);
  await (await caches.open(SHELL_CACHE)).put(url, response);
  return "kept";
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - STATIC_LIMIT))) await cache.delete(key);
}
