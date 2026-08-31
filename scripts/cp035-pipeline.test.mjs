import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-035 pipeline usa filtros, métricas server-side y paginación", () => {
  const contract = read("src/lib/pipeline-contract.ts");
  const repository = read("src/lib/pipeline-repository.ts");
  const route = read("src/app/api/admin/oportunidades/route.ts");
  for (const field of ["query", "stages", "assignedSellerId", "origin", "createdFrom", "createdTo", "followUpFrom", "followUpTo", "page", "pageSize"]) assert.match(contract, new RegExp(field));
  for (const field of ["totalAmount", "weightedAmount", "conversionRate", "overdueFollowUps", "byStage"]) assert.match(repository, new RegExp(field));
  assert.match(repository, /limit\(pageSize\)/);
  assert.match(repository, /offset\(\(page - 1\) \* pageSize\)/);
  assert.match(route, /getPipelinePage/);
  assert.doesNotMatch(read("src/app/admin/crm/page.tsx"), /getCrmSnapshot/);
});

test("CP-035 detalle y transición preservan reglas, historia, auditoría y seguimiento", () => {
  const detail = read("src/app/api/admin/oportunidades/[id]/route.ts");
  const service = read("src/lib/crm-service.ts");
  const repository = read("src/lib/pipeline-repository.ts");
  assert.match(detail, /getPipelineDetail/);
  assert.match(detail, /followUpAt/);
  assert.match(service, /assertOpportunityTransition/);
  assert.match(service, /opportunityStageHistory/);
  assert.match(service, /opportunityFollowups/);
  assert.match(service, /crm\.opportunity_stage_changed/);
  assert.match(repository, /stageHistory/);
  assert.match(repository, /followUps/);
  assert.match(repository, /crmTasks/);
});

test("CP-035 exportación está auditada y el frontend usa el contrato paginado", () => {
  const exportRoute = read("src/app/api/admin/oportunidades/export/route.ts");
  const page = read("src/app/admin/crm/page.tsx");
  const workspace = read("src/components/admin/AdminCategoryViews.tsx");
  assert.match(exportRoute, /crm\.pipeline_exported/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(page, /getPipelinePage/);
  assert.match(workspace, /weightedAmount/);
  assert.match(workspace, /hrefForPage/);
});
