#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = process.cwd();
const currentFile = fileURLToPath(import.meta.url);
const blockedPattern = "hsl(" + "var(--";
const ignoredDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  ".vite",
  ".vercel",
]);
const checkedExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const violations = [];

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await scanDirectory(entryPath);
      }
      continue;
    }

    if (!entry.isFile() || entryPath === currentFile) {
      continue;
    }

    if (!checkedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const content = await readFile(entryPath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (line.includes(blockedPattern)) {
        violations.push({
          file: path.relative(rootDir, entryPath),
          line: index + 1,
          text: line.trim(),
        });
      }
    });
  }
}

await scanDirectory(rootDir);

if (violations.length > 0) {
  console.error("Legacy Tailwind v3 color syntax is not allowed.");
  console.error(
    "Use Tailwind v4 classes, var(--token), or color-mix() instead."
  );
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.text}`);
  }
  process.exit(1);
}
