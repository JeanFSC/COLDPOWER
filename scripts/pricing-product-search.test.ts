import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PgDialect } from "drizzle-orm/pg-core";
import { pricingProductSearchPredicate } from "../src/lib/pricing-product-search";

test("Búsqueda comercial incluye SKU, nombres, marca, familia y categoría con parámetros", () => {
  const predicate = pricingProductSearchPredicate("  Capacitores  ");
  assert.ok(predicate);
  const compiled = new PgDialect().sqlToQuery(predicate);
  assert.match(compiled.sql, /"families"\."name" ilike/);
  assert.match(compiled.sql, /"categories"\."name" ilike/);
  assert.match(compiled.sql, /"brands"\."name" ilike/);
  assert.match(compiled.sql, /"products"\."sku" ilike/);
  assert.equal(compiled.params.length, 7);
  assert.ok(compiled.params.every(value => value === "%Capacitores%"));
  assert.ok(!compiled.sql.includes("Capacitores"));
});

test("La API usa el predicado y conserva permiso, mínimo y límite de resultados", () => {
  const route = readFileSync("src/app/api/admin/precios/productos/route.ts", "utf8");
  assert.match(route, /requireApiPermission\("pricing\.view"\)/);
  assert.match(route, /query\.length < 2/);
  assert.match(route, /where\(pricingProductSearchPredicate\(query\)\)/);
  assert.match(route, /limit\(20\)/);
});
