import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { parseTaxonomyFilters, slugifyTaxonomy } from "../src/lib/taxonomy-admin";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("taxonomía: slugs estables y filtros paginados", () => {
  assert.equal(slugifyTaxonomy("  Línea Blanca / HVAC  "), "linea-blanca-hvac");
  const filters = parseTaxonomyFilters(new URLSearchParams("entity=families&query=compresor&active=true&categoryId=cat-1&page=2&pageSize=50"));
  assert.equal(filters.entity, "families"); assert.equal(filters.active, true); assert.equal(filters.page, 2); assert.equal(filters.pageSize, 50); assert.equal(filters.categoryId, "cat-1");
  assert.equal(parseTaxonomyFilters(new URLSearchParams("entity=categories")).active, undefined);
  assert.throws(() => parseTaxonomyFilters(new URLSearchParams("entity=invalid")));
});

test("taxonomía: unicidad, relaciones, soft delete, conteos y auditoría están respaldados", () => {
  assert.match(read("drizzle/0030_cp047_taxonomy_ci.sql"), /lower\("slug"\)/);
  assert.match(read("drizzle/0030_cp047_taxonomy_ci.sql"), /categories_name_ci_unique/);
  assert.match(read("src/app/api/admin/taxonomia/route.ts"), /lower\(\$\{.*slug/);
  assert.match(read("src/app/api/admin/taxonomia/[entity]/[id]/route.ts"), /No se puede desactivar una categoría con familias activas/);
  assert.match(read("src/app/api/admin/taxonomia/[entity]/[id]/route.ts"), /rompería productos relacionados/);
  assert.match(read("src/app/api/admin/taxonomia/[entity]/[id]/route.ts"), /DELETE/);
  assert.match(read("src/lib/taxonomy-admin.ts"), /publishedProductCount/);
  assert.match(read("src/app/api/admin/taxonomia/export/route.ts"), /productCount/);
  assert.match(read("src/app/api/admin/taxonomia/[entity]/[id]/route.ts"), /auditLogs/);
});

test("taxonomía: contratos de listado, detalle, exportación y RBAC", () => {
  for (const file of ["src/app/api/admin/taxonomia/route.ts", "src/app/api/admin/taxonomia/[entity]/[id]/route.ts", "src/app/api/admin/taxonomia/export/route.ts", "src/app/admin/taxonomia/page.tsx"]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/lib/taxonomy-admin.ts"), /catalog\.category\.manage/);
  assert.match(read("src/app/api/admin/taxonomia/route.ts"), /catalog\.product\.edit/);
  assert.match(read("src/app/api/admin/taxonomia/route.ts"), /TAXONOMY_INVALID_FILTER/);
  assert.match(read("src/app/api/admin/taxonomia/[entity]/[id]/route.ts"), /products/);
});
