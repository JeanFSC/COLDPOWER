import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const root = process.cwd(); const read = (file) => readFileSync(join(root, file), "utf8");
test("Bloque G declara métricas, notificaciones y promociones", () => {
  const schema = read("src/db/operations-schema.ts");
  for (const table of ["notifications", "promotions", "promotionProducts", "promotionCategories"]) assert.match(schema, new RegExp(`export const ${table}`));
  const migrationFile = readdirSync(join(root, "drizzle")).find((file) => /^0013_.*\.sql$/.test(file)); assert.ok(migrationFile, "falta migración 0013 del Bloque G");
  const migration = read(join("drizzle", migrationFile)); for (const table of ["notifications", "promotions", "promotion_products", "promotion_categories"]) assert.match(migration, new RegExp(table));
});
test("dashboard calcula desde base de datos y notificaciones requieren permisos", () => {
  const dashboard = read("src/lib/operations-dashboard.ts"); assert.match(dashboard, /sales|orders|quotes|opportunities|payments|inventoryBalances/); assert.match(dashboard, /count|sum/);
  assert.match(read("src/app/api/admin/notificaciones/route.ts"), /requireApiPermission\("notifications.view"\)/);
  assert.match(read("src/app/api/admin/promociones/route.ts"), /requireApiPermission\("promotions.manage"\)/);
});
