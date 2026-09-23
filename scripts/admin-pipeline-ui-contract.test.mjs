import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("pipeline: los seguimientos vencidos muestran el conteo real", async () => {
  const workspace = await read("src/components/admin/PipelineWorkspace.tsx");
  const page = await read("src/app/admin/crm/page.tsx");

  assert.match(page, /import \{ PipelineWorkspace \} from "@\/components\/admin\/PipelineWorkspace"/);
  assert.match(page, /getPipelineBoard\(parsePipelineFilters\(pipelineParams\)/);
  assert.match(page, /<PipelineWorkspace board=\{board\} queryString=\{pipelineParams\.toString\(\)\}/);
  assert.match(workspace, /label="Seguimientos vencidos"/);
  assert.match(workspace, /board\.metrics\.overdueFollowUps/);
  assert.match(workspace, /updateQuery\(\{ view: "followups", overdue: "true" \}\)/);
  assert.match(workspace, /Todo al día\. No tienes seguimientos pendientes\./);
});

test("pipeline: filtros de etapa y vencimiento se conservan en la vista vigente", async () => {
  const workspace = await read("src/components/admin/PipelineWorkspace.tsx");
  const page = await read("src/app/admin/crm/page.tsx");

  assert.match(page, /parsePipelineFilters\(pipelineParams\)/);
  assert.match(page, /queryString=\{pipelineParams\.toString\(\)\}/);
  assert.match(workspace, /searchParams\.get\("stage"\)/);
  assert.match(workspace, /updateQuery\(\{ stage: event\.target\.value \|\| null \}\)/);
  assert.match(workspace, /searchParams\.get\("overdue"\) === "true"/);
  assert.match(workspace, /queryString/);
});

test("pipeline: los deeplinks globales abren la oportunidad y resuelven la tarea dueña", async () => {
  const contract = await read("src/lib/pipeline-contract.ts");
  const page = await read("src/app/admin/crm/page.tsx");
  const workspace = await read("src/components/admin/PipelineWorkspace.tsx");
  const taskRoute = await read("src/app/api/admin/tareas/route.ts");

  assert.match(contract, /export type PipelineDeepLink/);
  assert.match(contract, /parsePipelineDeepLink/);
  assert.match(contract, /opportunityId: text\(params, "opportunityId"\)/);
  assert.match(contract, /taskId: text\(params, "taskId"\)/);
  assert.match(page, /parsePipelineDeepLink\(pipelineParams\)/);
  assert.match(page, /deepLink=\{deepLink\}/);
  assert.match(workspace, /deepLink\.opportunityId/);
  assert.match(workspace, /deepLink\.taskId/);
  assert.match(workspace, /\/api\/admin\/tareas\?taskId=/);
  assert.match(taskRoute, /export async function GET/);
  assert.match(taskRoute, /crmTasks\.opportunityId/);
});
