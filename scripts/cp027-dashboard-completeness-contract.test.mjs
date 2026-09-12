import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("dashboard operativo expone mÃƒÂ©tricas comerciales y de inventario completas", () => {
  const service = read("src/lib/operations-dashboard.ts");
  for (const field of ["conversion", "overdueFollowUps", "noStock", "noMovement", "transfers", "topProducts", "topCustomers", "topSellers", "channels", "newCustomers", "returningCustomers", "productsSold", "unitsSold", "margin"]) assert.match(service, new RegExp(field));
  const page = read("src/app/admin/page.tsx") + read("src/app/admin/inicio/page.tsx") + read("src/components/admin/AdminDashboardView.tsx") + read("src/components/admin/AdminTanda2Workspaces.tsx");
  for (const label of [String.fromCharCode(67,111,110,118,101,114,115,105,243,110), "Seguimientos vencidos", "Productos sin stock", "Transferencias pendientes", "Top productos", "Top clientes", "Top vendedores", "Clientes activos", "Productos más vendidos", "Unidades", "Margen"]) assert.match(page, new RegExp(label));
});

test("dashboard administrativo no sirve una instantánea estática de métricas", () => {
  const page = read("src/app/admin/dashboard/page.tsx");
  assert.match(page, /dynamic\s*=\s*["']force-dynamic["']/);
});

test("dashboard administrativo expone estados de carga y error recuperable", () => {
  const loading = read("src/app/admin/dashboard/loading.tsx");
  const error = read("src/app/admin/dashboard/error.tsx");
  assert.match(loading, /aria-busy=["']true["']/);
  assert.match(loading, /Cargando dashboard/);
  assert.match(error, /AdminSegmentError/);
  assert.match(error, /unstable_retry/);
  assert.match(error, /No pudimos cargar las métricas del dashboard/);
});


