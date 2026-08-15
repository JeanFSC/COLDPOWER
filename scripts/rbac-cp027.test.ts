import assert from "node:assert/strict";
import test from "node:test";
import {
  appRoles,
  can,
  isAppRole,
  isStaffRole,
  permissions,
  roleFromClaims,
} from "../src/lib/roles";

test("CP-027 declara todos los roles internos y el rol ADMIN", () => {
  assert.deepEqual(appRoles, ["SUPERADMIN", "JEFATURA", "ADMIN", "VENTAS", "ALMACEN", "COMPRAS", "REPORTES"]);
  assert.equal(isAppRole("ADMIN"), true);
  assert.equal(isAppRole("customer"), true);
  assert.equal(isStaffRole("ADMIN"), true);
  assert.equal(isStaffRole("customer"), false);
});

test("CP-027 expone permisos granulares y conserva aliases antiguos", () => {
  assert.ok(permissions.includes("catalog.product.edit"));
  assert.ok(permissions.includes("catalog.product.publish"));
  assert.ok(permissions.includes("catalog.media.upload"));
  assert.ok(permissions.includes("cms.edit"));
  assert.ok(permissions.includes("inventory.view"));
  assert.ok(permissions.includes("pricing.cost.view"));
  assert.ok(permissions.includes("crm.manage"));
  assert.ok(permissions.includes("orders.manage"));
  assert.ok(permissions.includes("payments.manage"));
  assert.ok(permissions.includes("roles.manage"));
  assert.ok(permissions.includes("audit.view"));
  assert.equal(can("JEFATURA", "catalog:publish"), true);
  assert.equal(can("VENTAS", "quote:manage"), true);
  assert.equal(can("ALMACEN", "inventory:adjust"), true);
});

test("CP-027 limita cada rol al dominio que debe operar", () => {
  assert.equal(can("SUPERADMIN", "roles.manage"), true);
  assert.equal(can("JEFATURA", "pricing.cost.view"), true);
  assert.equal(can("JEFATURA", "roles.manage"), false);
  assert.equal(can("ADMIN", "catalog.product.edit"), true);
  assert.equal(can("ADMIN", "cms.edit"), true);
  assert.equal(can("ADMIN", "roles.manage"), false);
  assert.equal(can("VENTAS", "crm.manage"), true);
  assert.equal(can("VENTAS", "inventory.adjust"), false);
  assert.equal(can("ALMACEN", "inventory.transfer"), true);
  assert.equal(can("ALMACEN", "pricing.edit"), false);
  assert.equal(can("COMPRAS", "inventory.view"), true);
  assert.equal(can("COMPRAS", "pricing.edit"), false);
  assert.equal(can("REPORTES", "reports.view"), true);
  assert.equal(can("REPORTES", "inventory.adjust"), false);
  assert.equal(can("customer", "catalog.product.edit"), false);
});

test("CP-027 obtiene el rol desde metadata pública o metadata privada de Clerk", () => {
  assert.equal(roleFromClaims({ metadata: { role: "VENTAS" } }), "VENTAS");
  assert.equal(roleFromClaims({ publicMetadata: { role: "ALMACEN" } }), "ALMACEN");
  assert.equal(roleFromClaims({ metadata: { role: "not-a-role" }, publicMetadata: { role: "ADMIN" } }), "ADMIN");
  assert.equal(roleFromClaims({ metadata: { role: "customer" } }), "customer");
  assert.equal(roleFromClaims({ metadata: { role: "not-a-role" } }), null);
  assert.equal(roleFromClaims(null), null);
});
