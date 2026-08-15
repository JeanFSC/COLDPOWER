import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("Bloque F declara proveedores, compras, recepciones e importaciones futuras", () => {
  const schema = read("src/db/purchases-schema.ts");
  for (const table of ["suppliers", "purchases", "purchaseItems", "purchaseReceipts", "purchaseReceiptItems"]) assert.match(schema, new RegExp(`export const ${table}`));
  const migrationFile = readdirSync(join(root, "drizzle")).find((file) => /^0012_.*\.sql$/.test(file));
  assert.ok(migrationFile, "falta la migración 0012 del Bloque F");
  const migration = read(join("drizzle", migrationFile));
  for (const table of ["suppliers", "purchases", "purchase_items", "purchase_receipts", "purchase_receipt_items"]) assert.match(migration, new RegExp(table));
});

test("recepción actualiza inventario y Kardex dentro de una transacción", () => {
  const service = read("src/lib/purchases-service.ts");
  assert.match(service, /transaction/);
  assert.match(service, /PURCHASE_RECEIPT/);
  assert.match(service, /inventoryMovements|adjustInventory/);
  assert.match(service, /purchaseReceiptItems/);
});

test("proveedores y compras requieren permisos server-side", () => {
  assert.match(read("src/app/api/admin/proveedores/route.ts"), /requireApiPermission\("purchases.manage"\)/);
  assert.match(read("src/app/api/admin/compras/route.ts"), /requireApiPermission\("purchases.manage"\)/);
  assert.match(read("src/app/api/admin/compras/recepciones/route.ts"), /requireApiPermission\("purchases.receive"\)/);
});
