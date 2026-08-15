import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("pipeline: los seguimientos vencidos muestran el conteo real", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const page = await read("src/app/admin/crm/page.tsx");
  const summary = views.slice(views.indexOf("function PipelineSummary"), views.indexOf("export function PipelineWorkspace"));

  assert.match(page, /PipelineWorkspace metrics=\{pipelinePage\.metrics\}/);
  assert.match(summary, /Seguimientos vencidos/);
  assert.match(summary, /overdueFollowUps/);
  assert.doesNotMatch(summary, /No hay seguimientos vencidos[\s\S]*EmptyState/);
});

test("pipeline: ver más conserva filtros y abre la etapa", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const page = await read("src/app/admin/crm/page.tsx");

  assert.match(page, /\(\{ stage, label/);
  assert.match(views, /stageHrefFor/);
  assert.match(views, /name\("stage"\)|set\("stage"/);
  assert.match(views, /Ver más/);
});
