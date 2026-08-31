import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("catalog API exposes global queues, server pagination and real facets", () => {
  const source = fs.readFileSync("src/app/api/admin/catalogo/route.ts", "utf8");
  const service = fs.readFileSync("src/lib/catalog-admin-service.ts", "utf8");
  assert.match(source, /export async function GET/);
  assert.match(source, /catalog\.product\.view/);
  assert.match(service, /totalItems|totalPages/);
  assert.match(service, /queues|facets/);
  assert.doesNotMatch(service, /slice\(0,\s*12\)/);
});
