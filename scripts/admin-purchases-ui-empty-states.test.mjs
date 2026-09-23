import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/components/admin/PurchasesOperations.tsx", "utf8");
const page = fs.readFileSync("src/app/admin/compras/page.tsx", "utf8");

test("purchases presents a guided workflow with persistent endpoints", () => {
  assert.match(source, /StepBadge index=\{1\} label="Solicitud"/);
  assert.match(source, /StepBadge index=\{2\} label="Proveedor"/);
  assert.match(source, /StepBadge index=\{3\} label="Orden"/);
  assert.match(source, /StepBadge index=\{4\} label="Recepción"/);
  assert.match(source, /No hay órdenes pendientes de recepción/);
  for (const endpoint of [
    "/api/admin/compras/solicitudes",
    "/api/admin/proveedores",
    "/api/admin/compras",
    "/api/admin/compras/recepciones",
  ]) {
    assert.match(source, new RegExp(endpoint.replaceAll("/", "\\/")), `${endpoint} must remain connected`);
  }
  assert.match(page, /AdminPurchasesModule/);
  assert.match(page, /PurchasesOperations/);
  assert.match(page, /can\(actor\.role, "purchases\.manage"\)/);
  assert.match(page, /purchasePage=\{purchasePage\}/);
});
