import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("quote cart uses persistent products and does not silently fall back to memory", async () => {
  const route = await readFile(path.join(root, "src/app/api/cotizacion/cart/route.ts"), "utf8");
  assert.match(route, /from "@\/db\/schema"/);
  assert.match(route, /inArray/);
  assert.doesNotMatch(route, /quoteCartMemory|__coldpowerQuoteCarts/);
  assert.match(route, /status: 503/);
});
