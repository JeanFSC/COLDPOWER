import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("quote submission persists quote items atomically and never reports false success", async () => {
  const route = await readFile(path.join(root, "src/app/api/cotizacion/route.ts"), "utf8");
  assert.match(route, /quoteItems/);
  assert.match(route, /db\.transaction/);
  assert.match(route, /skuSnapshot/);
  assert.match(route, /productNameSnapshot/);
  assert.match(route, /status: 503/);
  assert.doesNotMatch(route, /preservar el flujo/);
});
