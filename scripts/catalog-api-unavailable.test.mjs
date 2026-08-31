import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("catalog APIs report persistent storage outages as 503", async () => {
  const [search, products] = await Promise.all([
    readFile(path.join(root, "src/app/api/catalog/search/route.ts"), "utf8"),
    readFile(path.join(root, "src/app/api/catalog/products/route.ts"), "utf8"),
  ]);

  for (const route of [search, products]) {
    assert.match(route, /catch/);
    assert.match(route, /status: 503/);
    assert.match(route, /catálogo persistente no está disponible/i);
  }
});
