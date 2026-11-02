#!/usr/bin/env node

/*
 * Runs after `vite build` and prepares dist/sw.js:
 *
 * 1. Fills the service worker precache list with the files produced by the
 *    build, so the installed iOS app can boot with no network connection.
 * 2. Replaces the cache version with a per-build id, so every deploy gets its
 *    own self-consistent shell cache and nothing is served from a stale one.
 *
 * Files larger than MAX_PRECACHE_BYTES are skipped on purpose: the MediaPipe
 * wasm module (~14 MB) and the hand landmarker model (~8 MB) are cached on
 * first use by the runtime cache instead.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const swPath = path.join(distDir, "sw.js");
const versionPlaceholder = "__CACHE_VERSION__";
const precachePlaceholder = "self.__PRECACHE_MANIFEST__";
const MAX_PRECACHE_BYTES = 2 * 1024 * 1024;

async function walk(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await walk(absolute, relative)));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }

  return files;
}

const files = await walk(distDir);
const urls = [];
const skipped = [];

for (const file of files) {
  if (file === "sw.js" || file.endsWith(".map") || file.startsWith(".")) {
    continue;
  }

  const info = await stat(path.join(distDir, file));

  if (info.size > MAX_PRECACHE_BYTES) {
    const megabytes = (info.size / 1024 / 1024).toFixed(1);
    skipped.push(`${file} (${megabytes} MB)`);
    continue;
  }

  urls.push(`./${file}`);
}

urls.sort();

const buildId =
  (process.env.GITHUB_SHA || "").slice(0, 8) || Date.now().toString(36);

let source = await readFile(swPath, "utf8");

for (const placeholder of [versionPlaceholder, precachePlaceholder]) {
  if (!source.includes(placeholder)) {
    console.error(
      `inject-sw-precache: "${placeholder}" not found in ${swPath}. ` +
        "Did public/sw.js change?"
    );
    process.exit(1);
  }
}

if (urls.length === 0) {
  console.error("inject-sw-precache: no files to precache, refusing to write");
  process.exit(1);
}

source = source.split(versionPlaceholder).join(buildId);
source = source.split(precachePlaceholder).join(JSON.stringify(urls));

await writeFile(swPath, source, "utf8");

console.log(
  `inject-sw-precache: ${urls.length} files queued for offline install ` +
    `(cache ${buildId})`
);

if (skipped.length > 0) {
  console.log(
    `inject-sw-precache: ${skipped.length} large files cached on first use: ` +
      skipped.join(", ")
  );
}