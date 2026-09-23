import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("ventas: el centro vigente actualiza facturación y comunica errores", async () => {
  const page = await read("src/app/admin/ventas/page.tsx");
  const workspace = await read("src/components/admin/SalesControlCenter.tsx");

  assert.match(page, /SalesControlCenter/);
  assert.match(workspace, /api\/admin\/ventas\/\$\{encodeURIComponent\(saleId\)\}\/facturacion/);
  assert.match(workspace, /invoiceStatus/);
  assert.match(workspace, /role="alert"/);
});

test("ventas: las acciones rápidas navegan a operaciones reales", async () => {
  const workspace = await read("src/components/admin/SalesControlCenter.tsx");
  assert.match(workspace, /Ver por facturar|Facturación/);
  assert.match(workspace, /api\/admin\/ventas/);
});
