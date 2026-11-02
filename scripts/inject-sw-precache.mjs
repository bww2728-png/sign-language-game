#!/usr/bin/env node

/*
 * Fills the service worker precache list with the files produced by
 * `vite build`. Runs after the build so the installed iOS app can boot with no
 * network connection.
 *
 * Files larger than MAX_PRECACHE_BYTES are skipped on purpose: the MediaPipe
 * wasm module (~14 MB) and the hand landmarker model (~8 MB) are cached on
 * first use by the runtime cache instead.
 */

import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "dist");
const swPath = path.join(distDir, "sw.js");
const placeholder = "self.__PRECACHE_MANIFEST__";
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

for (const file of files) {
  if (file === "sw.js" || file.endsWith(".map")) continue;

  const info = await stat(path.join(distDir, file));
  if (info.size > MAX_PRECACHE_BYTES) continue;

  urls.push(`./${file}`);
}

urls.sort();

const source = await readFile(swPath, "utf8");

if (!source.includes(placeholder)) {
  console.error(
    `inject-sw-precache: "${placeholder}" not found in ${swPath}. ` +
      "Did public/sw.js change?"
  );
  process.exit(1);
}

await writeFile(swPath, source.replace(placeholder, JSON.stringify(urls)), "utf8");

console.log(
  `inject-sw-precache: ${urls.length} files queued for offline install`
);
