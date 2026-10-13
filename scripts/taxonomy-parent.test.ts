import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clearPublicCatalogRuntimeCache } from "../src/lib/catalog-repository";
import { invalidateRuntimeCache, withRuntimeCache } from "../src/lib/runtime-cache";

test("reactivar familia comprueba padre aunque no cambie la categoría", () => {
  const source = readFileSync("src/app/api/admin/taxonomia/[entity]/[id]/route.ts", "utf8");
  assert.match(source, /entity === "families" && \(active \|\| categoryId !== current.categoryId\)/);
  assert.match(source, /if \(categoryId !== current.categoryId\) \{/);
});

test("invalidación real recarga categorías, familias y marcas sin limpiar otras claves", async () => {
  const suffix = crypto.randomUUID();
  const keys = ["catalog:categories:public", "catalog:families:public:all", "catalog:brands:public", "catalog:brands:public:category:qa"].map(key => `${key}:${suffix}`);
  const other = `qa:other:${suffix}`;
  try {
    for (const key of [...keys, other]) await withRuntimeCache(key, async () => "anterior", { enabled: true });
    clearPublicCatalogRuntimeCache();
    for (const key of keys) assert.equal(await withRuntimeCache(key, async () => "actual", { enabled: true }), "actual");
    assert.equal(await withRuntimeCache(other, async () => "inesperado", { enabled: true }), "anterior");
  } finally {
    for (const key of [...keys, other]) invalidateRuntimeCache(key);
  }
});

test("mutaciones de taxonomía invalidan catálogo después del commit", () => {
  for (const file of ["src/app/api/admin/taxonomia/route.ts", "src/app/api/admin/taxonomia/[entity]/[id]/route.ts"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /\}\); clearPublicCatalogRuntimeCache\(\); return apiSuccess/);
  }
});

test("mutaciones bloquean taxonomía antes de consultar identidades y dependencias", () => {
  for (const file of ["src/app/api/admin/taxonomia/route.ts", "src/app/api/admin/taxonomia/[entity]/[id]/route.ts"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /transaction\(async \(tx\) => \{ await lockTaxonomyMutation\(tx\);/);
  }
});
