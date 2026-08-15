import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("el catálogo admin conecta el alta manual con el contrato persistente", async () => {
  const form = await readFile(path.join(root, "src/components/admin/ProductCreateForm.tsx"), "utf8");
  const page = await readFile(path.join(root, "src/app/admin/catalogo/page.tsx"), "utf8");

  assert.match(form, /fetch\("\/api\/admin\/catalogo"/);
  assert.match(form, /method: "POST"/);
  assert.match(form, /No se pudo crear el producto/);
  assert.match(form, /role=\{message\.includes\("creado"\) \? "status" : "alert"\}/);
  assert.match(page, /catalog\.product\.create/);
  assert.match(page, /createOptions=\{\{ categories, families, brands \}\}/);
  const workspace = await readFile(path.join(root, "src/components/admin/AdminCategoryViews.tsx"), "utf8");
  assert.match(workspace, /\/admin\/catalogo\/\$\{encodeURIComponent\(row\.id\)\}/);
  assert.match(workspace, />Abrir ficha<\/Link>/);
});
