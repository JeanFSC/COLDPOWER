import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("inventario: las acciones abren controles y muestran movimientos y alertas reales", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const page = await read("src/app/admin/inventario/page.tsx");

  assert.match(views, /href="#inventory-controls"/);
  assert.match(views, /id="inventory-controls"/);
  assert.match(views, /movements\?\.length/);
  assert.match(views, /alerts\?\.length/);
  assert.match(page, /movements=\{/);
});
