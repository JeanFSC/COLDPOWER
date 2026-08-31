import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("mínimos de inventario son persistentes, protegidos y auditados", () => {
  const route = read("src/app/api/admin/inventario/minimos/route.ts");
  assert.match(route, /requireApiPermission\("inventory\.adjust"\)/);
  assert.match(route, /inventoryBalances/);
  assert.match(route, /minimumStock/);
  assert.match(route, /auditLogs/);
  assert.match(read("src/components/admin/InventoryOperations.tsx"), /minimos|mínimo|minimumStock/i);
});
