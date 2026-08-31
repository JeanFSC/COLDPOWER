import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFile(path.join(root, file), "utf8");

test("clientes: la tabla abre el detalle 360 real", async () => {
  const page = await read("src/app/admin/crm/page.tsx");
  const views = await read("src/components/admin/AdminCategoryViews.tsx");
  const detail = await read("src/components/admin/CustomerDetailPanel.tsx");

  assert.match(page, /customerId/);
  assert.match(page, /const customerId = query\.get\("customerId"\)/);
  assert.match(page, /CustomersWorkspace[\s\S]*customerId=\{customerId\}/);
  assert.match(views, /CustomerDetailPanel/);
  assert.match(views, /admin\/crm\?\$\{detailQuery\.toString\(\)\}/);
  assert.match(detail, /api\/admin\/clientes\/\$\{encodeURIComponent\(customerId\)\}/);
  assert.match(detail, /role="dialog"|aria-label="Detalle 360/);
});

test("clientes: las relaciones secundarias tienen paginación propia y estados recuperables", async () => {
  const detail = await read("src/components/admin/CustomerDetailPanel.tsx");

  for (const key of ["quotesPage", "opportunitiesPage", "salesPage", "ordersPage", "paymentsPage", "activitiesPage", "tasksPage"]) {
    assert.match(detail, new RegExp(key));
  }
  assert.match(detail, /No pudimos cargar el detalle del cliente/);
  assert.match(detail, /Reintentar/);
  assert.match(detail, /totalPages/);
});
