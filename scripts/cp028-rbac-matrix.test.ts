import assert from "node:assert/strict";
import test from "node:test";
import { businessRoles, can, type Permission } from "../src/lib/roles";

test("CP-028 separa Gerencia, Operaciones y SUPERADMIN", () => {
  assert.deepEqual(businessRoles, ["SUPERADMIN", "GERENCIA", "OPERACIONES_VENTAS"]);

  const operationsAllowed: Permission[] = [
    "catalog.product.edit", "media.upload", "cms.edit", "inventory.adjust", "inventory.kardex.view",
    "pricing.edit", "customers.view", "crm.view", "quotes.view", "sales.view", "orders.view",
  ];
  for (const permission of operationsAllowed) assert.equal(can("OPERACIONES_VENTAS", permission), true, permission);

  const operationsForbidden: Permission[] = [
    "dashboard.view", "reports.view", "audit.view", "users.view", "roles.manage",
    "pricing.cost.view", "pricing.margin.view", "settings.technical.edit", "integrations.manage",
  ];
  for (const permission of operationsForbidden) assert.equal(can("OPERACIONES_VENTAS", permission), false, permission);

  assert.equal(can("GERENCIA", "dashboard.view"), true);
  assert.equal(can("GERENCIA", "reports.view"), true);
  assert.equal(can("GERENCIA", "audit.view"), true);
  assert.equal(can("GERENCIA", "users.view"), true);
  assert.equal(can("GERENCIA", "users.invite"), true);
  assert.equal(can("GERENCIA", "roles.manage"), false);
  assert.equal(can("GERENCIA", "settings.technical.edit"), false);
  assert.equal(can("SUPERADMIN", "roles.manage"), true);
  assert.equal(can("customer", "catalog.product.view"), false);
});
