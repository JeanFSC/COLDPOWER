import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("admin taxonomy module exposes CRUD, soft deactivation and audit", () => {
  const route = read("src/app/api/admin/taxonomia/route.ts");
  const entityRoute = read("src/app/api/admin/taxonomia/[entity]/[id]/route.ts");
  const page = read("src/app/admin/taxonomia/page.tsx");
  const manager = read("src/components/admin/TaxonomyManager.tsx");

  for (const source of [route, entityRoute]) {
    assert.match(source, /requireTaxonomyAccess/);
    assert.match(source, /auditLogs/);
  }
  assert.match(entityRoute, /active/);
  assert.match(entityRoute, /No se elimina|desactivar|ARCHIV/i);
  assert.match(page, /taxonom/i);
  assert.match(manager, /Familias|Marcas/);
  assert.ok(manager.includes("/api/admin/taxonomia"));
  assert.match(read("src/lib/taxonomy-access.ts"), /requireApiPermission/);
  assert.doesNotMatch(route, /catalog\.product\.edit/);
});
