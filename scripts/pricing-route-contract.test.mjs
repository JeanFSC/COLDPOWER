import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("precios e historial tienen rutas protegidas y auditoría en mutaciones", () => {
  const files = ["src/app/api/admin/precios/route.ts", "src/app/api/admin/precios/[id]/route.ts", "src/app/api/admin/precios/historial/route.ts", "src/app/api/admin/descuentos/route.ts"];
  for (const file of files) assert.match(read(file), /requirePermission|pricing/);
  for (const file of [files[0], files[1], files[3]]) assert.match(read(file), /audit|transaction/);
});

test("el esquema separa precio vigente, historial y reglas de descuento", () => {
  const schema = read("src/db/schema.ts");
  for (const name of ["productPrices", "priceHistory", "discountRules"]) assert.match(schema, new RegExp(name));
  const migrationFile = readdirSync(join(root, "drizzle")).find((file) => /^0009_.*\.sql$/.test(file));
  assert.ok(migrationFile, "falta la migración 0009 del Bloque C");
  const migration = read(join("drizzle", migrationFile));
  assert.match(migration, /product_prices/);
  assert.match(migration, /price_history/);
  assert.match(migration, /discount_rules/);
});
