import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("los traslados respetan el ciclo operativo y mueven stock al recibir", () => {
  const createRoute = read("src/app/api/admin/inventario/transferencias/route.ts");
  assert.match(createRoute, /status: "DRAFT"/);
  assert.doesNotMatch(createRoute, /status: "IN_TRANSIT"/);

  const transitionRoute = read("src/app/api/admin/inventario/transferencias/[id]/route.ts");
  for (const status of ["REQUESTED", "IN_TRANSIT", "RECEIVED", "CANCELLED"]) assert.match(transitionRoute, new RegExp(status));
  assert.match(transitionRoute, /inventory:transfer/);

  const inventoryService = read("src/lib/inventory.ts");
  assert.match(transitionRoute, /TRANSFER_OUT/);
  assert.match(inventoryService + transitionRoute, /TRANSFER_IN/);
  assert.match(inventoryService + transitionRoute, /transaction/);

  const adminPage = read("src/app/admin/inventario/page.tsx");
  assert.match(adminPage, /TransferStatusControl/);
});

test("recibir un traslado ejecuta los movimientos Kardex", () => {
  const route = read("src/app/api/admin/inventario/transferencias/[id]/recibir/route.ts");
  assert.match(route, /receiveTransfer/);
  assert.match(route, /inventory:transfer/);
});
