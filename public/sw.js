/*
 * Service worker for the installable build of "الإشارة تتحدث".
 *
 * Strategy:
 * - App shell (HTML, hashed bundles, icons, sign images) is precached at
 *   install time. scripts/inject-sw-precache.mjs fills in the exact file list
 *   and the build id after `vite build`, so every deploy gets a brand new,
 *   self-consistent shell cache and the installed app boots with no network.
 * - Large MediaPipe assets (hand_landmarker.task, the ~14 MB wasm module) are
 *   above the precache size limit and are cached on first use instead, to keep
 *   install fast and avoid hitting iOS storage limits.
 * - Navigations revalidate with the network and fall back to the cached shell
 *   only when the device is offline or the server is failing.
 */

/* Replaced at build time so each deploy gets its own shell cache. */
const CACHE_VERSION = "__CACHE_VERSION__";
const SHELL_PREFIX = "sign-shell-";
const SHELL_CACHE = `${SHELL_PREFIX}${CACHE_VERSION}`;
/* Not versioned on purpose: the big MediaPipe files fetched on first use stay
   cached across app updates instead of being downloaded again every deploy. */
const RUNTIME_CACHE = "sign-runtime-v1";
const OFFLINE_FALLBACK = "./index.html";

/* Replaced with a real array at build time. Empty during local dev. */
const PRECACHE_MANIFEST = self.__PRECACHE_MANIFEST__ || [];

async function addToCache(cache, url) {
  try {
    await cache.add(new Request(url, { cache: "reload" }));
  } catch {
    /* One retry covers a flaky first load; a miss is only logged so a single
       bad file cannot block the whole install. */
    try {
      await cache.add(new Request(url, { cache: "reload" }));
    } catch {
      console.warn("[sw] precache failed:", url);
    }
  }
}

self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(PRECACHE_MANIFEST.map(url => addToCache(cache, url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const shellNames = names.filter(name => name.startsWith(SHELL_PREFIX));
      /* Keep the current shell plus the previous generation: a page that is
         still running an older build can finish requesting its own chunks. */
      const keep = new Set([
        ...shellNames.slice(-2),
        SHELL_CACHE,
        RUNTIME_CACHE,
      ]);
      await Promise.all(
        names
          .filter(name => name.startsWith("sign-") && !keep.has(name))
          .map(name => caches.delete(name))
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

  /* Navigations: revalidate, then fall back to the cached shell. */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached =
          (await cache.match(request, { ignoreVary: true })) ||
          (await cache.match(OFFLINE_FALLBACK, { ignoreVary: true }));

        try {
          /* "no-cache" revalidates the document, so a fresh deploy is never
             shadowed by the browser's HTTP cache and the shell we store always
             references the asset hashes that are currently deployed. */
          const fresh = await fetch(request, { cache: "no-cache" });
          if (cached && (!navigator.onLine || fresh.status >= 500)) {
            return cached;
          }
          if (fresh.ok) {
            await cache
              .put(OFFLINE_FALLBACK, fresh.clone())
              .catch(() => undefined);
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
      let cached = null;
      try {
        cached = await caches.match(request, { ignoreVary: true });
      } catch {
        cached = null;
      }
      if (cached) return cached;

      const fresh = await fetch(request);
      if (fresh && fresh.ok && fresh.status === 200 && fresh.type === "basic") {
        try {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, fresh.clone());
        } catch {
          /* A full cache quota must never turn a good response into a failure. */
        }
      }
      return fresh;
    })()
  );
});