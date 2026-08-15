import assert from "node:assert/strict";
import test from "node:test";
import { can, appRoles, type AppRole } from "../src/lib/roles";

test("CP-025 expone roles operativos y permisos mínimos", () => {
  assert.deepEqual(appRoles, ["SUPERADMIN", "JEFATURA", "ADMIN", "VENTAS", "ALMACEN", "COMPRAS", "REPORTES"]);
  assert.equal(can("SUPERADMIN", "catalog:publish"), true);
  assert.equal(can("JEFATURA", "catalog:publish"), true);
  assert.equal(can("VENTAS", "catalog:publish"), false);
  assert.equal(can("VENTAS", "quote:manage"), true);
  assert.equal(can("VENTAS", "inventory:adjust"), false);
  assert.equal(can("ALMACEN", "inventory:adjust"), true);
  assert.equal(can("REPORTES", "inventory:read"), true);
  assert.equal(can("REPORTES" as AppRole, "inventory:adjust"), false);
});
