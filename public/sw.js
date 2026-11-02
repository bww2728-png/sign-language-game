/*
 * Service worker for the installable build of "الإشارة تتحدث".
 *
 * Strategy:
 * - App shell (HTML, hashed bundles, icons, sign images) is precached at
 *   install time. scripts/inject-sw-precache.mjs fills in the exact file list
 *   after `vite build`, so the installed iOS app boots without a network.
 * - Large MediaPipe assets (hand_landmarker.task, the ~14 MB wasm module) are
 *   above the precache size limit and are cached on first use instead, to keep
 *   install fast and avoid hitting iOS storage limits.
 * - Navigations are network-first and silently fall back to the cached shell.
 */

const CACHE_VERSION = "v4";
const SHELL_CACHE = `sign-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sign-runtime-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = "./index.html";

/* Replaced with a real array at build time. Empty during local dev. */
const PRECACHE_MANIFEST = self.__PRECACHE_MANIFEST__ || [];

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_MANIFEST.map(url =>
          cache
            .add(new Request(url, { cache: "reload" }))
            .catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names.filter(name => !keep.has(name)).map(name => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  if (request.method !== "GET") return;
  /* Range requests (media streaming) are left to the browser. */
  if (request.headers.has("range")) return;
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js")) return;

  /* Navigations: network first, cached shell as the offline fallback. */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached =
          (await cache.match(request, { ignoreVary: true })) ||
          (await cache.match(OFFLINE_FALLBACK, { ignoreVary: true }));

        try {
          const fresh = await fetch(request);
          /* The cached shell beats an error page from the network or a proxy. */
          if (!fresh.ok && cached) return cached;
          if (fresh.ok) {
            await cache.put(OFFLINE_FALLBACK, fresh.clone());
          }
          return fresh;
        } catch {
          if (cached) return cached;
          return Response.error();
        }
      })()
    );
    return;
  }

  /* Static assets: cache first, network fills the cache for offline use. */
  event.respondWith(
    (async () => {
      /* Precached shell entries and runtime-cached files live in two caches.
         ignoreVary keeps hosts that send "Vary: Origin" (Vite preview, some
         CDNs) from breaking the match on a header the browser never sends. */
      const cached = await caches.match(request, { ignoreVary: true });
      if (cached) return cached;

      const fresh = await fetch(request);
      if (
        fresh &&
        fresh.ok &&
        fresh.status === 200 &&
        fresh.type === "basic" &&
        !request.headers.has("range")
      ) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    })()
  );
});
