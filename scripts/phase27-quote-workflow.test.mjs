import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

const workflow = read("src/lib/quote-workflow.ts");
const workspace = read("src/components/admin/QuotesWorkspace.tsx");
const accountQuotes = read("src/app/cuenta/cotizaciones/page.tsx");
const adminQuotes = read("src/app/admin/cotizaciones/page.tsx");
const statusRoute = read("src/app/api/admin/cotizaciones/[id]/route.ts");

for (const status of ["DRAFT", "SENT", "FOLLOW_UP", "ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"]) {
  assert.match(workflow, new RegExp(status), `${status} should be a canonical quote status`);
  assert.match(workspace, new RegExp(status), `${status} should be rendered by the active quotes workspace`);
}

assert.match(statusRoute, /quoteWorkflowStatuses|legacyQuoteStatus/);
assert.match(statusRoute, /updatedAt/);
assert.match(accountQuotes, /createdAt/);
assert.match(accountQuotes, /updatedAt/);
assert.match(accountQuotes, /statusBadge|statusLabel/);
assert.match(adminQuotes, /customerType|documentNumber|department/);
assert.match(workspace, /QuoteConversionControl/);
assert.doesNotMatch(workspace, /QuoteStatusControl/);
assert.equal(existsSync(join(root, "drizzle/meta/0003_snapshot.json")), true, "quote workflow snapshot should exist");

console.log("Phase 27 quote workflow contract: PASS");
