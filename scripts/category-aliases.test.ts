import test from "node:test";
import assert from "node:assert/strict";

import { resolveCatalogCategorySlug } from "../src/lib/catalog-category-slugs";

test("keeps legacy singular category URLs compatible with imported category slugs", () => {
  assert.equal(resolveCatalogCategorySlug("lavadora"), "lavadoras");
  assert.equal(resolveCatalogCategorySlug("licuadora"), "licuadoras");
  assert.equal(resolveCatalogCategorySlug("bomba-de-agua"), "bombas-de-agua");
  assert.equal(resolveCatalogCategorySlug("cocina"), "cocinas");
  assert.equal(resolveCatalogCategorySlug("campana-extractora"), "campanas-extractoras");
  assert.equal(resolveCatalogCategorySlug("repuestos-y-accesorios-generales"), "conexiones-y-accesorios");
  assert.equal(resolveCatalogCategorySlug("refrigeracion"), "refrigeracion");
});
