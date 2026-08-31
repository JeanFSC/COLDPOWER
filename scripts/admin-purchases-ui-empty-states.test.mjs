import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("src/components/admin/PurchasesOperations.tsx", "utf8");
const page = fs.readFileSync("src/app/admin/compras/page.tsx", "utf8");

test("purchases presents a guided workflow without changing its endpoints", () => {
  assert.match(source, /1\. Proveedor/);
  assert.match(source, /2\. Orden de compra/);
  assert.match(source, /3\. Recepción/);
  assert.match(source, /Primero registra un proveedor/);
  assert.match(source, /Antes de crear una orden/);
  assert.match(source, /No hay órdenes pendientes de recepción/);
  assert.match(source, /\/api\/admin\/proveedores/);
  assert.match(source, /\/api\/admin\/compras/);
  assert.match(source, /\/api\/admin\/compras\/recepciones/);
  assert.match(page, /La compra no altera inventario/);
});
