import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-036 conserva estados canónicos y evita acciones legacy en la UI", () => {
  const workflow = read("src/lib/quote-workflow.ts");
  const workspace = read("src/components/admin/QuotesWorkspace.tsx");

  for (const status of ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]) {
    assert.match(workflow, new RegExp(status));
  }
  assert.match(workspace, /status === "ACCEPTED"/);
  assert.match(workspace, /QuoteConversionControl/);
  assert.doesNotMatch(workspace, /QuoteStatusControl/);
});

test("CP-036 convierte sólo desde la versión aceptada e idempotente", () => {
  const conversion = read("src/lib/quote-conversion-service.ts");
  const salesRoute = read("src/app/api/admin/ventas/route.ts");
  const migration = read("drizzle/0037_cp036_quote_versioning.sql");

  assert.match(conversion, /acceptedVersionId/);
  assert.match(conversion, /quoteVersionItems/);
  assert.match(conversion, /reserveInventoryBatch/);
  assert.match(conversion, /existingSale/);
  assert.doesNotMatch(conversion, /applyPromotionsInTransaction/);
  assert.doesNotMatch(salesRoute, /unitPrice:\s*String\(/);
  assert.match(migration, /quote_versions/);
  assert.match(migration, /quote_discount_approvals/);
});
