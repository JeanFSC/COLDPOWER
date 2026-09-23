import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("CP-033 inventory page is backed by the paginated database service", async () => {
  const page = await read("src/app/admin/inventario/page.tsx");
  const service = await read("src/lib/inventory-admin-service.ts");
  assert.match(page, /getInventoryAdminPage/);
  assert.doesNotMatch(page, /getInventoryAdminSnapshot|snapshot\.balances\.length|snapshot\.locations\.length/);
  assert.match(service, /count\(inventoryBalances\.id\)/);
  assert.match(service, /limit\(pageSize\)/);
  assert.match(service, /getPublishedMediaForEntities/);
});

test("CP-033 inventory UI uses safe workflow controls and refreshes router state", async () => {
  const page = await read("src/components/admin/InventoryAdminWorkspace.tsx");
  const workflow = await read("src/components/admin/InventoryAdminWorkspace.tsx");
  const movements = await read("src/app/api/admin/inventario/movimientos/route.ts");
  assert.match(page, /Idempotency-Key/);
  assert.match(page, /api\/admin\/inventario\/kardex/);
  assert.match(page, /api\/admin\/inventario\/export/);
  assert.match(page, /hasReservations/);
  assert.match(page, /updatedFrom/);
  assert.match(page, /<th[^>]*>SKU<\/th>/);
  assert.match(page, /<th[^>]*>Producto<\/th>/);
  assert.match(page, /Movimientos globales/);
  assert.match(movements, /getInventoryMovementsPage/);
  assert.match(page, /CSV/);
  assert.match(page, /Nuevo traslado/);
  assert.match(page, /Registrar movimiento/);
  assert.match(page, /InventoryOperationsTabs/);
  assert.match(page, /InventoryDetailDrawer/);
  assert.match(page, /Stock antes/);
  assert.match(page, /Stock después/);
  assert.match(page, /referenceType/);
  assert.match(page, /router\.refresh\(\)/);
  assert.doesNotMatch(page, /window\.location\.reload/);
  assert.doesNotMatch(workflow, /window\.location\.reload/);
  assert.doesNotMatch(workflow, /APPROVED|PREPARED/);
});
