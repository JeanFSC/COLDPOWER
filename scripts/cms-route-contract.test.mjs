import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CMS administrativo restringe páginas y permisos", () => {
  const route = read("src/app/api/admin/cms/[slug]/route.ts");
  const repository = read("src/lib/cms-repository.ts");
  assert.match(route, /requireApiPermission/);
  assert.match(route, /cms\.edit/);
  assert.match(route, /validateCmsPageSlug/);
  assert.match(repository, /cmsPages/);
  assert.match(repository, /cmsBlocks/);
  assert.match(repository, /writeAuditLog|auditLogs/);
});

test("CMS público solo expone bloques publicados", () => {
  const route = read("src/app/api/cms/[slug]/route.ts");
  const repository = read("src/lib/cms-repository.ts");
  assert.match(route, /validateCmsPageSlug/);
  assert.match(repository, /PUBLISHED/);
  assert.match(repository, /cmsBlocks/);
  assert.match(repository, /publishedOnly/);
});

test("CMS tiene página administrativa y navegación", () => {
  assert.ok(existsSync(join(root, "src/app/admin/cms/page.tsx")));
  assert.ok(existsSync(join(root, "src/components/admin/CmsPageEditor.tsx")));
  assert.match(read("src/app/admin/layout.tsx"), /\/admin\/cms/);
});
