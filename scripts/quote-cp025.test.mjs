import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("la cotización conserva flujo transaccional, snapshots y anti-spam", () => {
  const route = fs.readFileSync(path.join(root, "src", "app", "api", "cotizacion", "route.ts"), "utf8");
  assert.match(route, /transaction/);
  assert.match(route, /quoteItems/);
  assert.match(route, /quoteStatusHistory/);
  assert.match(route, /checkQuoteRateLimit/);
  assert.match(route, /503/);
});
