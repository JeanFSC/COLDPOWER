import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "src/lib/sales-service.ts"), "utf8");

test("CP-030 no convierte un saldo ausente en stock cero durante checkout", () => {
  assert.doesNotMatch(source, /balance\?\.available\s*\?\?\s*0/);
  assert.match(source, /INVENTORY_UNKNOWN|saldo.*desconocido|stock.*confirmado/i);
});
