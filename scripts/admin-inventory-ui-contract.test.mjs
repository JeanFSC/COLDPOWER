import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("inventario: la vista vigente recibe datos persistentes y expone controles seguros", async () => {
  const workspace = await read("src/components/admin/InventoryAdminWorkspace.tsx");
  const page = await read("src/app/admin/inventario/page.tsx");

  assert.match(page, /InventoryAdminWorkspace/);
  assert.match(page, /requirePermission\("inventory\.view"\)/);
  assert.match(page, /getInventoryAdminPage\(filters\)/);
  assert.match(page, /data=\{data\}/);
  assert.match(page, /INVENTORY_INVALID_FILTER/);
  assert.match(page, /canAdjust: can\(actor\.role, "inventory\.adjust"\)/);
  assert.match(page, /canKardex: can\(actor\.role, "inventory\.kardex\.view"\)/);
  assert.match(workspace, /data\.operations\.movements/);
  assert.match(workspace, /data\.alerts/);
  assert.match(workspace, /InventoryOperationsTabs/);
  assert.match(workspace, /Transferir stock/);
  assert.match(workspace, /Registrar recepción/);
  assert.match(workspace, /permissions\.canKardex/);
  assert.match(workspace, /transfersPagination/);
  assert.match(workspace, /reservationsPagination/);
  assert.match(workspace, /status=CRITICO/);
  assert.match(workspace, /Crear solicitud de compra/);
  assert.match(workspace, /reservas\/expirar/);
});
