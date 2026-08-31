import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("CP-031 migration is additive and has dashboard/catalog indexes", () => {
  const migration = fs.readFileSync("drizzle/0019_cp031_dashboard_catalog_indexes.sql", "utf8");
  for (const name of ["sales_created_at", "orders_created_at", "opportunities_created_at", "products_editorial_taxonomy", "media_usages_entity_slot"]) assert.match(migration, new RegExp(name));
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN/i);
});
