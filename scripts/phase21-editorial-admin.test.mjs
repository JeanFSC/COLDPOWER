import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");
assert.equal(existsSync(join(root, "src/app/admin/catalogo/page.tsx")), true, "admin catalog queue should exist");
assert.match(read("src/app/admin/layout.tsx"), /admin\/catalogo/);
const page = read("src/app/admin/catalogo/page.tsx");
const catalogUi = read("src/components/admin/AdminProductCatalog.tsx");
for (const status of ["draft", "review", "published", "hidden"]) assert.match(catalogUi, new RegExp(status));
assert.match(page, /getAdminCatalogPage|AdminProductCatalog/);
assert.match(catalogUi, /No existen grupos pendientes en el cat[aá]logo persistente|requiresReview/i);
assert.doesNotMatch(`${page}\n${catalogUi}`, /auto.?public|publicar todo|publicar autom[aá]ticamente/i);
const service = read("src/lib/publication-service.ts");
assert.match(service, /evaluatePublication/);
assert.match(service, /cannotPublish|No se puede publicar|requiresReview/i);
console.log("Phase 21 editorial admin queue: PASS");
