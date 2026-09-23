import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("cotización crea lead CRM y el servicio protege idempotencia", () => {
  const quoteRoute = read("src/app/api/cotizacion/route.ts");
  const service = read("src/lib/crm-service.ts");
  assert.match(quoteRoute, /ensureLeadFromQuote/);
  assert.match(service, /existingLink/);
  assert.match(service, /customerQuoteLinks/);
  assert.match(service, /assignedSellerId/);
  assert.match(service, /crm\.lead_created_from_quote/);
  assert.match(quoteRoute, /recipientIds/);
});

test("pipeline exige transición y conserva historial", () => {
  const service = read("src/lib/crm-service.ts");
  assert.match(service, /assertOpportunityTransition/);
  assert.match(service, /opportunityStageHistory/);
  assert.match(service, /crm\.opportunity_stage_changed/);
});
