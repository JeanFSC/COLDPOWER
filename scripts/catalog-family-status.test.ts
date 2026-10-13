import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { catalogFamilyConditions } from "../src/lib/catalog-family-conditions";

test("la consulta de familias aplica estado público separado del filtro de categoría", () => {
  const source = readFileSync("src/lib/catalog-repository.ts", "utf8");
  const body = source.split("async function queryCatalogFamilies")[1].split("export async function getCatalogFamilies")[0];
  assert.match(body, /catalogFamilyConditions\(categoryId, publicOnly\)/);
});

test("SQL público exige familia y categoría activas; administrativo conserva inactivas", () => {
  const dialect = new PgDialect();
  const publicSql = dialect.sqlToQuery(catalogFamilyConditions("qa-category", true)!);
  assert.match(publicSql.sql, /"families"\."active"/);
  assert.match(publicSql.sql, /"categories"\."active" = true/);
  assert.deepEqual(publicSql.params, ["qa-category", true]);
  assert.equal(catalogFamilyConditions(undefined, false), undefined);
  const adminSql = dialect.sqlToQuery(catalogFamilyConditions("qa-category", false)!);
  assert.doesNotMatch(adminSql.sql, /active/);
  assert.deepEqual(adminSql.params, ["qa-category"]);
});
