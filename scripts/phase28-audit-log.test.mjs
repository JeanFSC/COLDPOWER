import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

assert.equal(existsSync(join(root, "src/app/admin/auditoria/page.tsx")), true);
const page = read("src/app/admin/auditoria/page.tsx");
const layout = read("src/app/admin/layout.tsx");
const schema = read("src/db/schema.ts");
const statusRoute = read("src/app/api/admin/cotizaciones/[id]/route.ts");

for (const field of ["quoteStatusHistory", "fromStatus", "toStatus", "changedBy", "createdAt"]) {
  assert.match(schema, new RegExp(field), `${field} should be persisted`);
}
assert.match(page, /before/);
assert.match(page, /after/);
assert.match(statusRoute, /quoteStatusHistory/);
assert.match(layout, /admin\/auditoria/);

console.log("Phase 28 audit log contract: PASS");
