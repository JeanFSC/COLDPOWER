import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

const databaseBackedPages = [
  "src/app/buscar/page.tsx",
  "src/app/categoria/[slug]/page.tsx",
  "src/app/producto/[slug]/page.tsx",
  "src/app/comparar/page.tsx",
  "src/app/cotizacion/page.tsx",
];

test("database-backed public pages render an honest unavailable state instead of crashing", async () => {
  for (const pagePath of databaseBackedPages) {
    const page = await readFile(path.join(root, pagePath), "utf8");

    assert.match(page, /CatalogUnavailable/, `${pagePath} must use the shared unavailable state`);
    assert.match(page, /catch/, `${pagePath} must handle unavailable persistent storage`);
  }
});
