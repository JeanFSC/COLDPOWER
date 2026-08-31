import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-034 lista clientes con filtros, métricas, facetas y paginación server-side", () => {
  const route = read("src/app/api/admin/clientes/route.ts");
  const repository = read("src/lib/customer-repository.ts");
  const contract = read("src/lib/customer-contract.ts");
  assert.match(route, /parseCustomerFilters/);
  assert.match(route, /getCustomersPage/);
  for (const field of ["query", "customerType", "status", "assignedSellerId", "location", "createdFrom", "createdTo", "page", "pageSize"]) assert.match(contract, new RegExp(field));
  for (const field of ["metrics", "facets", "withOpenOpportunity", "withoutActivity", "quoteCount", "openOpportunityCount", "orderCount"]) assert.match(repository, new RegExp(field));
  assert.match(repository, /limit\(pageSize\)/);
  assert.match(repository, /offset\(\(page - 1\) \* pageSize\)/);
  assert.doesNotMatch(repository, /rows\.slice\(/);
});

test("CP-034 protege duplicados, referencias, motivo y datos vinculados", () => {
  const service = read("src/lib/crm-service.ts");
  const validation = read("src/lib/crm-validation.ts");
  const schema = read("src/db/crm-schema.ts");
  assert.match(service, /CUSTOMER_DUPLICATE/);
  assert.match(service, /CUSTOMER_SELLER_INVALID/);
  assert.match(service, /CUSTOMER_USER_INVALID/);
  assert.match(service, /CUSTOMER_REASON_REQUIRED/);
  assert.match(service, /lastActivityAt/);
  assert.match(service, /idempotencyKey/);
  assert.match(validation, /correo electrónico no es válido/);
  assert.match(validation, /RUC debe contener 11 dígitos/);
  assert.match(schema, /customers_user_id_unique|userUnique/);
  assert.match(schema, /crm_activities_idempotency_unique/);
  assert.match(schema, /crm_tasks_idempotency_unique/);
});

test("CP-034 expone 360 con relaciones independientes, exportación auditable y RBAC", () => {
  const detail = read("src/app/api/admin/clientes/[id]/route.ts");
  const exportRoute = read("src/app/api/admin/clientes/export/route.ts");
  const page = read("src/app/admin/crm/page.tsx");
  const roles = read("src/lib/roles.ts");
  assert.match(detail, /getCustomer360/);
  assert.match(detail, /includeFinancial/);
  assert.match(detail, /CUSTOMER_NOT_FOUND/);
  assert.match(exportRoute, /customers\.exported/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(exportRoute, /requireApiPermission\("customers\.export"\)/);
  assert.match(page, /getCustomersPage/);
  assert.match(page, /CustomersWorkspace/);
  assert.match(roles, /customers\.export/);
});

test("CP-034 actividades y tareas usan clave de idempotencia y errores estructurados", () => {
  const activity = read("src/app/api/admin/actividades/route.ts");
  const task = read("src/app/api/admin/tareas/route.ts");
  assert.match(activity, /Idempotency-Key/);
  assert.match(task, /Idempotency-Key/);
  assert.match(activity, /idempotent/);
  assert.match(task, /idempotent/);
  assert.match(activity, /apiError/);
  assert.match(task, /apiError/);
});
