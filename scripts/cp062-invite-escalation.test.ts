import assert from "node:assert/strict";
import test from "node:test";
import { permissionsForRole } from "../src/lib/roles";
import { canInviteRole } from "../src/lib/user-administration";

test("no role can invite a role with permissions it does not hold", () => {
  assert.equal(canInviteRole("GERENCIA", "JEFATURA"), permissionsForRole("JEFATURA").every((permission) => permissionsForRole("GERENCIA").includes(permission)));
  assert.equal(canInviteRole("GERENCIA", "SUPERADMIN"), false);
  assert.equal(canInviteRole("JEFATURA", "SUPERADMIN"), false);
  assert.equal(canInviteRole("SUPERADMIN", "JEFATURA"), true);
  assert.equal(canInviteRole("GERENCIA", "GERENCIA"), true);
});
