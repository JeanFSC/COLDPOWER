import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("dashboard vigente y operaciones apuntan al CRM real", () => {
  const dashboard = read("src/components/admin/AdminTanda2Workspaces.tsx");
  const workspace = read("src/lib/operations-workspace.ts");
  assert.doesNotMatch(dashboard, /\/admin\/oportunidades|\/admin\/tareas/);
  assert.match(dashboard, /\/admin\/crm/);
  assert.doesNotMatch(workspace, /\/admin\/oportunidades|\/admin\/tareas/);
  assert.match(workspace, /\/admin\/crm\?view=pipeline/);
});
