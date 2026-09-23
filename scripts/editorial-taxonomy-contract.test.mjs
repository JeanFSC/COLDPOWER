import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const schema = read("src/db/schema.ts");
const route = read("src/app/api/admin/catalogo/[id]/route.ts");
const adminPage = read("src/app/admin/catalogo/page.tsx");
const catalog = read("src/components/admin/AdminProductCatalog.tsx");
const migration = read("drizzle/0015_harsh_angel.sql");

assert.match(schema, /editorialCategoryId/);
assert.match(schema, /editorialFamilyId/);
assert.match(schema, /editorialBrandId/);
assert.match(migration, /editorial_category_id/);
assert.match(migration, /editorial_family_id/);
assert.match(migration, /editorial_brand_id/);
assert.match(route, /catalog\.product\.edit/);
assert.match(route, /editorialCategoryId/);
assert.match(route, /editorialFamilyId/);
assert.match(route, /editorialBrandId/);
assert.match(route, /auditLogs/);
assert.match(catalog, /Usar categor[ií]a fuente/);
assert.match(catalog, /Usar familia fuente/);
assert.match(catalog, /Usar marca fuente/);
assert.match(adminPage + catalog, /editorialCategoryId/);
assert.match(adminPage + catalog, /editorialFamilyId/);
assert.match(adminPage + catalog, /editorialBrandId/);

console.log("Editorial taxonomy contract: PASS");
