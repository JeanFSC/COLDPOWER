import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("usuarios admin muestra rol legible y fecha de incorporación real", async () => {
  const page = await readFile(path.join(root, "src/app/admin/usuarios/page.tsx"), "utf8");
  const workspace = await readFile(path.join(root, "src/components/admin/AdminCategoryViews.tsx"), "utf8");

  assert.match(page, /createdAt/);
  assert.match(page, /roleLabel/);
  assert.match(workspace, /Fecha de incorporación/);
  assert.match(workspace, /row\.createdAt/);
  assert.match(workspace, /row\.roleLabel \?\? row\.role/);
  assert.match(workspace, /function displayRole/);
  assert.match(workspace, /label: displayRole\(value\)/);
});
