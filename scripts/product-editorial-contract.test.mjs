import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("editor de producto usa permiso server-side y protege identidad fuente", () => {
  const route = read("src/app/api/admin/catalogo/[id]/route.ts");
  assert.match(route, /require(?:Api)?Permission\("catalog\.product\.edit"\)/);
  assert.match(route, /originalName|original_name/);
  assert.match(route, /sku/);
  assert.match(route, /no.*mod|immutable|inmutable|source/i);
  assert.match(route, /writeAuditLog|auditLogs/);
});

test("editorial mapea nombre comercial sin destruir nombre original", () => {
  const repository = read("src/lib/catalog-repository.ts");
  const mapper = read("src/lib/catalog-view-model.ts");
  assert.match(repository, /commercialName/);
  assert.match(mapper, /commercialName/);
  assert.match(mapper, /normalizedName.*commercialName|commercialName.*normalizedName/);
});
