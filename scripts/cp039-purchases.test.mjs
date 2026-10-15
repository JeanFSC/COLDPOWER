import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const root=process.cwd();const read=(file)=>readFileSync(join(root,file),"utf8");

test("CP-039 métricas de Compras describen sus montos y alcance",()=>{const ui=read("src/components/admin/AdminPurchasesModule.tsx"),repo=read("src/lib/purchases-repository.ts");assert.match(ui,/label: "Subtotal de órdenes"/);assert.match(ui,/Subtotal de OC por categoría/);assert.match(ui,/Top 5 proveedores por subtotal/);assert.match(ui,/Participación sobre el total de OC de la misma moneda/);assert.match(ui,/Histórico de todos los proveedores; no cambia con los filtros/);assert.match(repo,/fillRatePurchaseStatuses = \["PENDING", "PARTIAL_RECEIVED", "RECEIVED"\]/);assert.doesNotMatch(ui,/Gasto por categoría|Rendimiento por proveedor|Gasto del período/)});

test("CP-039 identidad de proveedor comparte defensa entre alta y edición", () => {
  const service = read("src/lib/purchases-service.ts");
  const guard = service.split("async function assertSupplierIdentityAvailable")[1].split("export async function createSupplier")[0];
  assert.match(guard, /pg_advisory_xact_lock/);
  assert.match(guard, /\.sort\(\)/);
  assert.match(guard, /lower\(/);
  assert.match(guard, /ne\(suppliers\.id, excludeId\)/);
  const create = service.split("export async function createSupplier")[1].split("export async function updateSupplier")[0];
  const update = service.split("export async function updateSupplier")[1].split("export async function listSuppliers")[0];
  assert.ok(create.indexOf("assertSupplierIdentityAvailable") < create.indexOf(".insert(suppliers)"));
  assert.ok(update.indexOf("assertSupplierIdentityAvailable") < update.indexOf(".update(suppliers)"));
});

test("CP-039 creación concurrente de OC y solicitud bloquea clave antes del replay", () => {
  const service = read("src/lib/purchases-service.ts");
  for (const name of ["createPurchase", "createPurchaseRequest"]) {
    const body = service.split(`export async function ${name}(`)[1].split("export async function")[0];
    assert.match(body, /pg_advisory_xact_lock/);
    assert.ok(body.indexOf("pg_advisory_xact_lock") < body.indexOf("const [existing]"));
  }
});

test("CP-039 recepción concurrente bloquea clave antes del replay y de tocar stock", () => {
  const receipt = read("src/lib/purchases-service.ts").split("export async function receivePurchase(")[1];
  assert.match(receipt, /pg_advisory_xact_lock/);
  assert.ok(receipt.indexOf("pg_advisory_xact_lock") < receipt.indexOf("const [existing]"));
  assert.ok(receipt.indexOf("const [existing]") < receipt.indexOf("adjustInventoryInTransaction"));
});
test("CP-039 compras y proveedores tienen filtros, métricas, detalle y exportación",()=>{const contract=read("src/lib/purchases-contract.ts"),repo=read("src/lib/purchases-repository.ts"),route=read("src/app/api/admin/compras/route.ts"),supplier=read("src/app/api/admin/proveedores/[id]/route.ts"),exportRoute=read("src/app/api/admin/compras/export/route.ts");for(const field of ["query","status","supplierId","locationId","currency","createdFrom","createdTo","page","pageSize"])assert.match(contract,new RegExp(field));for(const field of ["pending","partialReceived","received","totalAmount"])assert.match(repo,new RegExp(field));assert.match(route,/getPurchasesPage/);assert.match(supplier,/updateSupplier/);assert.match(exportRoute,/purchases\.exported/);assert.match(exportRoute,/text\/csv/)})
test("CP-039 recepción parcial actualiza Kardex y es idempotente",()=>{const service=read("src/lib/purchases-service.ts"),schema=read("src/db/purchases-schema.ts"),receipt=read("src/app/api/admin/compras/recepciones/route.ts");assert.match(service,/PARTIAL_RECEIVED/);assert.match(service,/adjustInventoryInTransaction/);assert.match(service,/idempotencyKey/);assert.match(schema,/purchases_idempotency_unique/);assert.match(schema,/purchase_receipts_idempotency_unique/);assert.match(receipt,/Idempotency-Key/)})
test("CP-039 separa monedas y no reutiliza una recepciÃ³n en otra OC",()=>{const repo=read("src/lib/purchases-repository.ts"),service=read("src/lib/purchases-service.ts");assert.match(repo,/amountsByCurrency/);assert.match(repo,/groupBy\(purchases\.currency/);assert.match(repo,/spendCurrencies/);assert.match(service,/existing\.purchaseId !== input\.purchaseId/)})
