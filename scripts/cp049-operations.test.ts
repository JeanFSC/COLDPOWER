import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { parseOperationsFilters } from "@/lib/operations-contract";
import { can } from "@/lib/roles";

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), "utf8");

test("operaciones aceptan rango, Lima, local, vendedor, estado, cola y paginación", () => {
  const filters = parseOperationsFilters(new URLSearchParams("range=week&from=2026-08-01&to=2026-08-14&locationId=loc-1&sellerId=user-1&status=PREPARING&queue=orders&page=2&pageSize=50"));
  assert.equal(filters.range, "week");
  assert.equal(filters.locationId, "loc-1");
  assert.equal(filters.sellerId, "user-1");
  assert.equal(filters.queue, "orders");
  assert.equal(filters.page, 2);
  assert.equal(filters.pageSize, 50);
  assert.throws(() => parseOperationsFilters(new URLSearchParams("queue=financial")));
  assert.throws(() => parseOperationsFilters(new URLSearchParams("from=2026-08-15&to=2026-08-14")));
});

test("el centro operativo tiene colas paginadas y estados excluidos", () => {
  const workspace = read("src/lib/operations-workspace.ts");
  const route = read("src/app/api/admin/operaciones/route.ts");
  for (const queue of ["quotes", "opportunities", "orders", "followUps", "inventoryAlerts"]) assert.match(workspace, new RegExp(queue));
  assert.match(workspace, /limit\(filters\.pageSize\)/);
  assert.match(workspace, /offset\(\(filters\.page - 1\)/);
  assert.match(workspace, /CANCELLED/);
  assert.match(workspace, /LOST/);
  assert.match(workspace, /COMPLETED/);
  assert.match(workspace, /getOperationsExport/);
  assert.match(workspace, /totalPages/);
  assert.match(workspace, /queueTotals/);
  assert.match(route, /operations\.view/);
  assert.match(route, /OPERATIONS_INVALID_FILTER/);
});

test("el DTO y exportación operativos no seleccionan información financiera", () => {
  const workspace = read("src/lib/operations-workspace.ts");
  const exportRoute = read("src/app/api/admin/operaciones/export/route.ts");
  for (const source of [workspace, exportRoute]) assert.doesNotMatch(source, /subtotal|margin|cost|revenue|utility|averageTicket|paymentAmount|amount/iu);
  assert.match(exportRoute, /operations\.exported/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(workspace, /filters\.queue \? \[filters\.queue\]/);
});

test("RBAC permite visualizar operaciones al equipo autorizado y bloquea clientes", () => {
  assert.equal(can("customer", "operations.view"), false);
  assert.equal(can("OPERACIONES_VENTAS", "operations.view"), true);
  assert.equal(can("ALMACEN", "operations.view"), true);
  assert.equal(can("VENTAS", "operations.view"), true);
});

test("las tareas operativas se asignan, resuelven en el dominio de origen y reportan carga", () => {
  const workspace = read("src/lib/operations-workspace.ts");
  const service = read("src/lib/operations-work-items-service.ts");
  const route = read("src/app/api/admin/operaciones/[id]/route.ts");
  const action = read("src/components/admin/OperationsWorkItemAction.tsx");
  const ui = read("src/components/admin/AdminTanda2Workspaces.tsx");
  assert.match(workspace, /loadTeamLoad/);
  assert.match(workspace, /operationalSignals/);
  assert.match(service, /resolveOperationsWorkItem/);
  assert.match(service, /operations\.work_item_resolved/);
  assert.match(service, /sourceType !== "FOLLOW_UP"/);
  assert.match(route, /action === "resolve"/);
  assert.match(route, /crm\.edit/);
  assert.match(action, /Resolver/);
  assert.match(action, /Reasignar/);
  assert.match(ui, /operations-filters/);
  assert.match(ui, /workItemTeam/);
});
