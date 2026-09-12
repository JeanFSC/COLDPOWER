import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-037 clientes expone Customer 360 y filtros server-side", () => {
  const contract = read("src/lib/customer-contract.ts");
  const repository = read("src/lib/customer-repository.ts");
  const page = read("src/components/admin/CustomersControlCenter.tsx");
  const detail = read("src/components/admin/CustomerDetailPanel.tsx");
  for (const field of ["department", "opportunity", "attention", "needsAttention", "overdueFollowUp", "noActivity", "hasQuotes", "hasSales", "createdFrom", "lastActivityFrom", "attentionCategories"]) assert.match(contract, new RegExp(field));
  for (const field of ["countDistinct(opportunities.id)", "activeCommercialStages", "pipelineAgingThresholds", "respondedAt", "customerContacts", "crmActivities", "quoteResponseCondition"]) assert.ok(repository.includes(field), `falta ${field}`);
  for (const field of ["CustomerDetailPanel", "Crear oportunidad", "Crear cotización", "Fusionar clientes", "Desactivar cliente"]) assert.match(page, new RegExp(field));
  for (const field of ["statusLabels", "PROSPECT: \"Prospecto\"", "statusLabel"]) assert.match(page, new RegExp(field));
  for (const field of ["Resumen", "Actividad", "Oportunidades", "Cotizaciones", "Ventas", "Pedidos", "Contactos", "Direcciones", "Notas"]) assert.match(detail, new RegExp(field));
});

test("CP-037 actividad persiste resultado, ocurrencia y próxima acción", () => {
  const schema = read("src/db/crm-schema.ts");
  const migration = read("drizzle/0039_cp037_activity_context.sql");
  const service = read("src/lib/crm-service.ts");
  const route = read("src/app/api/admin/actividades/route.ts");
  const panel = read("src/components/admin/CustomerDetailPanel.tsx");
  for (const field of ["result", "occurredAt", "nextAction", "nextActionAt"]) assert.match(schema, new RegExp(field));
  for (const field of ["result", "occurred_at", "next_action", "next_action_at"]) assert.match(migration, new RegExp(field));
  for (const field of ["ACTIVITY_DATE_INVALID", "ACTIVITY_FOLLOW_UP_REQUIRED", "crm.task_created", "sourceActivityId"]) assert.match(service, new RegExp(field));
  for (const field of ["occurredAt", "nextAction", "createFollowUp"]) assert.match(route, new RegExp(field));
  for (const field of ["Resultado", "Fecha y hora de la actividad", "Próxima acción", "Crear seguimiento"]) assert.match(panel, new RegExp(field));
});

test("CP-037 operaciones sensibles mantienen motivo, auditoría e idempotencia", () => {
  const service = read("src/lib/customer-operations-service.ts");
  const relations = read("src/app/api/admin/clientes/[id]/relations/route.ts");
  const detail = read("src/components/admin/CustomerDetailPanel.tsx");
  const dedupe = read("src/app/api/admin/clientes/dedupe/route.ts");
  const merge = read("src/app/api/admin/clientes/merge/route.ts");
  assert.match(service, /CUSTOMER_MERGE_REASON_REQUIRED/);
  assert.match(service, /customer\.merged/);
  assert.match(service, /CUSTOMER_HAS_OPEN_OPERATIONS/);
  assert.match(dedupe, /findCustomerDuplicates/);
  assert.match(merge, /previewCustomerMerge/);
  for (const kind of ["contact", "address", "note"]) assert.match(relations, new RegExp(`kind === "${kind}"`));
  for (const label of ["Agregar contacto", "Agregar dirección", "Agregar nota", "Nota interna"]) assert.match(detail, new RegExp(label));
  assert.match(detail, /customers\.manage|canManage/);
});

test("CP-037 creación de cliente usa tres pasos y persiste relaciones iniciales", () => {
  const page = read("src/components/admin/CustomersControlCenter.tsx");
  const service = read("src/lib/crm-service.ts");
  const route = read("src/app/api/admin/clientes/route.ts");
  for (const label of ["Identidad", "Contacto", "Relación", "Siguiente", "Revisar duplicados"]) assert.match(page, new RegExp(label));
  for (const field of ["primaryContact", "primaryAddress"]) assert.match(route, new RegExp(field));
  for (const field of ["primaryContact", "primaryAddress", "customerContacts", "customerAddresses", "customerNotes"]) assert.match(service, new RegExp(field));
  assert.match(page, /duplicatesChecked/);
});

test("CP-037 operaciones CRM se cargan por pestaña desde PostgreSQL", () => {
  const query = read("src/lib/customer-operations-query.ts");
  const route = read("src/app/api/admin/clientes/operaciones/route.ts");
  const page = read("src/components/admin/CustomersControlCenter.tsx");
  for (const tab of ["agenda", "activity", "opportunities", "history"]) {
    assert.match(query, new RegExp(`"${tab}"`));
    assert.match(page, new RegExp(tab));
  }
  for (const field of ["crmTasks", "crmActivities", "opportunities", "auditLogs", "limit(10)"]) assert.ok(query.includes(field), `falta ${field}`);
  assert.match(route, /customers\.view/);
  assert.match(page, /api\/admin\/clientes\/operaciones/);
  for (const label of ["Distribución por tipo", "Distribución geográfica", "Requieren atención", "Seguimiento vencido", "Sin responsable", "Oportunidad estancada", "Cotización por responder"]) assert.match(page, new RegExp(label));
});

test("CP-037 separa el acceso a ventas y pagos en Customer 360", () => {
  const route = read("src/app/api/admin/clientes/[id]/route.ts");
  const repo = read("src/lib/customer-repository.ts");
  assert.match(route, /includeSales:\s*can\(actor\.role, "sales\.view"\)/);
  assert.match(route, /includePayments:\s*can\(actor\.role, "payments\.view"\)/);
  assert.match(route, /includeOrders:\s*can\(actor\.role, "orders\.view"\)/);
  assert.match(repo, /const includeSales = options\.includeSales/);
  assert.match(repo, /const includePayments = options\.includePayments/);
  assert.match(repo, /const includeOrders = options\.includeOrders/);
  assert.match(repo, /payments: includePayments/);
  assert.match(repo, /orders: includeOrders/);
  const panel = read("src/components/admin/CustomerDetailPanel.tsx");
  assert.match(panel, /canCrmManage/);
  assert.match(panel, /canPaymentsView/);
});

test("CP-037 ofrece loading state estructural para la navegación al módulo", () => {
  const loading = read("src/app/admin/clientes/loading.tsx");
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Cargando clientes/);
  assert.match(loading, /animate-pulse/);
  assert.match(loading, /grid/);
});

test("CP-037 ofrece error state accionable sin exponer detalles internos", () => {
  const error = read("src/app/admin/clientes/error.tsx");
  const shared = read("src/components/admin/AdminSegmentError.tsx");
  assert.match(error, /No pudimos cargar los clientes/);
  assert.match(error, /unstable_retry/);
  assert.match(shared, /role="alert"/);
  assert.match(shared, /Reintentar/);
  assert.doesNotMatch(shared, /error\.message/);
});
