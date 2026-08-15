import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, "src/db/schema.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "src/app/api/admin/catalogo/[id]/route.ts"), "utf8");
const form = fs.readFileSync(path.join(root, "src/components/admin/ProductEditorialForm.tsx"), "utf8");
const adminPage = fs.readFileSync(path.join(root, "src/app/admin/catalogo/page.tsx"), "utf8");
const migration = fs.readFileSync(path.join(root, "drizzle/0015_harsh_angel.sql"), "utf8");

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
assert.match(form, /Categor[ií]a editorial/);
assert.match(form, /Familia editorial/);
assert.match(form, /Marca editorial/);
assert.match(adminPage, /editorialCategoryId/);
assert.match(adminPage, /editorialFamilyId/);
assert.match(adminPage, /editorialBrandId/);

console.log("Editorial taxonomy contract: PASS");
