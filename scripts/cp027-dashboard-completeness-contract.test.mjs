import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("dashboard operativo expone métricas comerciales y de inventario desde la vista vigente", () => {
  const service = read("src/lib/operations-dashboard.ts");
  for (const field of [
    "conversion",
    "overdueFollowUps",
    "noStock",
    "noMovement",
    "transfers",
    "topProducts",
    "topCustomers",
    "topSellers",
    "channels",
    "newCustomers",
    "returningCustomers",
    "productsSold",
    "unitsSold",
    "margin",
  ]) {
    assert.match(service, new RegExp(field));
  }
  const page = read("src/app/admin/inicio/page.tsx") + read("src/components/admin/AdminTanda2Workspaces.tsx");
  for (const label of [
    "Conversión comercial",
    "Seguimientos vencidos",
    "Transferencias pendientes",
    "Top productos",
    "Top clientes",
    "Top vendedores",
    "Clientes activos",
    "Unidades",
    "Margen bruto",
    "Stock crítico",
  ]) {
    assert.match(page, new RegExp(label));
  }
});

test("dashboard administrativo no sirve una instantánea estática de métricas", () => {
  const page = read("src/app/admin/dashboard/page.tsx");
  assert.match(page, /dynamic\s*=\s*["']force-dynamic["']/);
});

test("inicio administrativo conserva fallback de carga y no oculta fallos de datos críticos", () => {
  const page = read("src/app/admin/inicio/page.tsx");
  const loading = read("src/app/admin/inicio/loading.tsx");
  const error = read("src/app/admin/inicio/error.tsx");
  assert.match(loading, /aria-busy=["']true["']/);
  assert.match(loading, /Cargando inicio/);
  assert.match(error, /AdminSegmentError/);
  assert.match(error, /unstable_retry/);
  assert.match(page, /ADMIN_HOME_DATA_UNAVAILABLE/);
  assert.match(page, /dashboardResult\.status === "rejected"/);
  assert.match(page, /workspaceResult\.status === "rejected"/);
});

test("dashboard administrativo propaga fallos de datos críticos al error boundary", () => {
  assert.match(read("src/app/admin/dashboard/page.tsx"), /ADMIN_DASHBOARD_DATA_UNAVAILABLE/);
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
