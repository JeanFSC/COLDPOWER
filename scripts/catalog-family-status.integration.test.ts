import assert from "node:assert/strict";
import test from "node:test";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { categories, families } from "../src/db/schema";
import { getCatalogFamilies } from "../src/lib/catalog-repository";
import { catalogFamilyConditions } from "../src/lib/catalog-family-conditions";

test("QA lectura: catálogo devuelve solo familias y padres activos", { skip: process.env.QA_FAMILY_STATUS !== "1", timeout: 60_000 }, async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  try {
    const db = getDb();
    const allFamilies = await db.select().from(families);
    const allCategories = await db.select().from(categories);
    const activeCategoryIds = new Set(allCategories.filter(row => row.active).map(row => row.id));
    const expected = allFamilies.filter(row => row.active && activeCategoryIds.has(row.categoryId));
    const publicRows = await getCatalogFamilies();
    assert.deepEqual(publicRows.map(row => row.id).sort(), expected.map(row => row.id).sort());
    const adminRows = await getCatalogFamilies(undefined, false);
    assert.deepEqual(adminRows.map(row => row.id).sort(), allFamilies.map(row => row.id).sort());
    const categoryId = expected[0]?.categoryId;
    assert.ok(categoryId, "Se requiere una categoría activa para probar el filtro");
    const scoped = await getCatalogFamilies(categoryId);
    assert.deepEqual(scoped.map(row => row.id).sort(), expected.filter(row => row.categoryId === categoryId).map(row => row.id).sort());
    console.log(JSON.stringify({ publicFamilies: publicRows.length, administrativeFamilies: adminRows.length, excludedInactive: allFamilies.length - expected.length }));
    const fixture = sql`with categories(id, active) as (values ('qa-parent-active', true), ('qa-parent-inactive', false)),
      families(id, category_id, active) as (values ('qa-family-visible', 'qa-parent-active', true), ('qa-family-inactive', 'qa-parent-active', false), ('qa-family-parent-inactive', 'qa-parent-inactive', true), ('qa-family-orphan', 'qa-parent-missing', true))`;
    const excluded = await db.execute(sql`${fixture} select families.id from families where ${catalogFamilyConditions(undefined, true)} order by families.id`);
    assert.deepEqual(excluded.rows.map(row => row.id), ["qa-family-visible"]);
    const complete = await db.execute(sql`${fixture} select families.id from families order by families.id`);
    assert.equal(complete.rows.length, 4);
    console.log(JSON.stringify({ syntheticPublicRows: excluded.rows.length, syntheticTotalRows: complete.rows.length, writes: 0 }));
  } finally { await closeDb(); }
});
