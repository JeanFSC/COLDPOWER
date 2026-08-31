import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const schema = read("src/db/schema.ts");
const statusControl = read("src/components/admin/QuoteStatusControl.tsx");
const accountQuotes = read("src/app/cuenta/cotizaciones/page.tsx");
const adminQuotes = read("src/app/admin/cotizaciones/page.tsx");
const statusRoute = read("src/app/api/admin/cotizaciones/[id]/route.ts");

for (const status of ["borrador", "enviada", "evaluacion", "requiere_info", "cotizada", "aprobada", "convertida", "cerrada"]) {
  assert.match(schema, new RegExp(`\\\"${status}\\\"`), `${status} should be a persisted quote status`);
  assert.match(statusControl, new RegExp(status), `${status} should be selectable by admins`);
}

assert.match(statusRoute, /quoteWorkflowStatuses|legacyQuoteStatus/);
assert.match(statusRoute, /updatedAt/);
assert.match(accountQuotes, /createdAt/);
assert.match(accountQuotes, /updatedAt/);
assert.match(accountQuotes, /statusBadge|statusLabel/);
assert.match(adminQuotes, /customerType|documentNumber|department/);
assert.match(statusControl, /enviada|evaluacion|cotizada/);
assert.equal(existsSync(join(root, "drizzle/meta/0003_snapshot.json")), true, "quote workflow snapshot should exist");

console.log("Phase 27 quote workflow contract: PASS");
