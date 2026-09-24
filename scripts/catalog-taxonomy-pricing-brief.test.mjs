import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("catalogo: solo un RETAIL ACTIVE vigente llega a carrito y checkout", () => {
  const source = read("src/lib/retail-price.ts");
  assert.match(source, /eq\(productPrices\.priceType, ["']RETAIL["']\)/);
  assert.match(source, /eq\(productPrices\.status, ["']ACTIVE["']\)/);
  assert.match(source, /eq\(productPrices\.active, true\)/);
  assert.match(source, /validUntil/);
});

test("catalogo: taxonomia usa permiso propio y no hace fallback a editar productos", () => {
  const access = read("src/lib/taxonomy-access.ts");
  assert.match(access, /taxonomyPermission/);
  for (const file of [
    "src/app/api/admin/taxonomia/route.ts",
    "src/app/api/admin/taxonomia/[entity]/[id]/route.ts",
    "src/app/api/admin/taxonomia/export/route.ts",
  ]) {
    const source = read(file);
    assert.match(source, /requireTaxonomyAccess/);
    assert.doesNotMatch(source, /requireApiPermission\("catalog\.product\.edit"\)/);
  }
});

test("catalogo: joins editoriales y jerarquia se mantienen en datos administrativos", () => {
  assert.match(read("src/lib/taxonomy-admin.ts"), /effectiveCategoryJoin|editorialCategoryId/);
  assert.match(read("src/lib/pricing-repository.ts"), /effectiveCategoryJoin|effectiveCategoryFilter/);
  assert.match(read("src/lib/catalog-taxonomy-validation.ts"), /families\.categoryId/);
  assert.match(read("src/app/api/admin/catalogo/[id]/route.ts"), /assertEditorialTaxonomy/);
});

test("catalogo: reemplazo y permisos de ficha usan contratos reales", () => {
  assert.match(read("src/components/admin/PricingWorkspace.tsx"), /priceId: initialPrice\.id/);
  const editor = read("src/components/admin/ProductCommercialEditor.tsx");
  assert.match(editor, /canEditPricing/);
  assert.match(editor, /canAdjustInventory/);
  const media = read("src/app/api/admin/catalogo/[id]/media/route.ts");
  assert.match(media, /catalog\.media\.upload/);
  assert.match(media, /slot === ["']primary["']/);
});

test("catalogo: acciones masivas sin endpoint no se presentan como ejecutables", () => {
  const source = read("src/components/admin/AdminProductCatalog.tsx");
  assert.ok((source.match(/No disponible en lote/g) ?? []).length >= 3);
});
