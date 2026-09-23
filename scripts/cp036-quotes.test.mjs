import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-036 cotizaciones usa contrato paginado, filtros, métricas y detalle", () => {
  const contract = read("src/lib/quote-contract.ts");
  const repository = read("src/lib/quote-repository.ts");
  const route = read("src/app/api/admin/cotizaciones/route.ts");
  const detail = read("src/app/api/admin/cotizaciones/[id]/route.ts");
  for (const field of ["query", "workflowStatus", "legacyStatus", "customerType", "createdFrom", "createdTo", "page", "pageSize"]) assert.match(contract, new RegExp(field));
  for (const field of ["totalItems", "pending", "converted", "conversionRate", "itemCount", "limit(pageSize)", "offset((page - 1) * pageSize)"]) assert.ok(repository.includes(field), `falta ${field}`);
  assert.match(route, /getQuotesPage/);
  assert.match(detail, /getQuoteDetail/);
  assert.match(detail, /quoteStatusHistory/);
});

test("CP-036 workflow protege transiciones, cancelación, historia y auditoría", () => {
  const workflow = read("src/lib/quote-workflow.ts");
  const route = read("src/app/api/admin/cotizaciones/[id]/route.ts");
  const conversion = read("src/lib/quote-conversion-service.ts");
  assert.match(workflow, /canTransitionQuote/);
  assert.match(route, /CANCELLATION_REASON_REQUIRED/);
  assert.match(route, /quote\.workflow_status_changed/);
  assert.match(conversion, /idempotent/);
  assert.match(conversion, /quoteUnique|quoteId/);
});

test("CP-036 exportación audita PII y la UI conserva filtros/paginación", () => {
  const exportRoute = read("src/app/api/admin/cotizaciones/export/route.ts");
  const page = read("src/app/admin/cotizaciones/page.tsx");
  const workspace = read("src/components/admin/QuotesWorkspace.tsx");
  assert.match(exportRoute, /quotes\.exported/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(page, /getQuotesPage/);
  assert.match(workspace, /new URLSearchParams/);
  assert.match(workspace, /quoteId/);
  assert.match(workspace, /\/api\/admin\/cotizaciones\/discount/);
  assert.match(workspace, /approveDiscount/);
});
