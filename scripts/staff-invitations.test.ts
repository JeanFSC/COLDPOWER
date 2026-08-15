import assert from "node:assert/strict";
import test from "node:test";
import { validateStaffInvitation } from "../src/lib/staff-invitations";

test("valida una invitación interna con correo y rol operativo", () => {
  assert.deepEqual(validateStaffInvitation({ email: "  JEFE@Example.COM ", role: "JEFATURA" }), { email: "jefe@example.com", role: "JEFATURA" });
});

test("rechaza formato inválido o roles de cuenta legacy", () => {
  assert.equal(validateStaffInvitation({ email: "no-es-correo", role: "VENTAS" }), null);
  assert.equal(validateStaffInvitation({ email: "staff@example.com", role: "customer" }), null);
  assert.equal(validateStaffInvitation({ email: "staff@example.com", role: "admin" }), null);
  assert.deepEqual(validateStaffInvitation({ email: "staff@example.com", role: "SUPERADMIN" }), { email: "staff@example.com", role: "SUPERADMIN" });
});
