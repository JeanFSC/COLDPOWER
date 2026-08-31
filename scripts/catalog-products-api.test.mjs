import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("cart product resolution uses the persistent catalog", async () => {
  const route = await readFile(path.join(root, "src/app/api/catalog/products/route.ts"), "utf8");
  assert.match(route, /getCatalogProductsByIds/);
  assert.doesNotMatch(route, /data\/products/);
  assert.match(route, /searchParams\.get\("ids"\)/);
});
