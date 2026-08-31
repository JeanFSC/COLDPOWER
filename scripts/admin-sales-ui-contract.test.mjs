import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("ventas: las acciones de facturación y cancelación usan los endpoints reales", async () => {
  const page = await read("src/app/admin/ventas/page.tsx");
  const actions = await read("src/components/admin/SalesActions.tsx");

  assert.match(page, /SalesActions/);
  assert.match(page, /controls=/);
  assert.match(actions, /api\/admin\/ventas\/\$\{encodeURIComponent\(saleId\)\}\/facturacion/);
  assert.match(actions, /api\/admin\/ventas\/\$\{encodeURIComponent\(saleId\)\}/);
  assert.match(actions, /role=\{messageKind === "error" \? "alert"/);
});

test("ventas: las acciones rápidas no quedan como botones muertos", async () => {
  const views = await read("src/components/admin/AdminCategoryViews.tsx");

  assert.match(views, /sales-controls/);
  assert.match(views, /Generar factura/);
  assert.match(views, /Descargar reporte/);
  assert.doesNotMatch(views, /key=\{String\(label\)\}[\s\S]*disabled[\s\S]*Acción pendiente de conexión/);
});
