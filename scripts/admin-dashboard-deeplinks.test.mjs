import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const dashboard = fs.readFileSync(path.join(root, "src/components/admin/AdminDashboardView.tsx"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src/lib/operations-workspace.ts"), "utf8");

test("dashboard queue links target the existing CRM route", () => {
  assert.doesNotMatch(dashboard, /\/admin\/oportunidades|\/admin\/tareas/);
  assert.match(dashboard, /\/admin\/crm\?view=pipeline/);
  assert.doesNotMatch(workspace, /\/admin\/oportunidades|\/admin\/tareas/);
  assert.match(workspace, /\/admin\/crm\?view=pipeline/);
});
