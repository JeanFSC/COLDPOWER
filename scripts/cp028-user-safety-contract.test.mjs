import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("CP-028 conserva usuarios desactivados y protege al Ãºltimo SUPERADMIN", () => {
  const schema = read("src/db/schema.ts");
  const auth = read("src/lib/auth.ts");
  const webhook = read("src/app/api/webhooks/clerk/route.ts");
  const userAdmin = read("src/lib/user-administration.ts");
  assert.match(schema, /userStatusEnum|user_status/);
  assert.match(schema, /lastSignInAt|last_sign_in_at/);
  assert.match(webhook, /INACTIVE|status/);
  assert.doesNotMatch(webhook, /delete\(users\)/);
  assert.doesNotMatch(auth, /if \(!record\) return \{ role: claimRole/);
  assert.match(webhook, /syncClerkRoleFromMetadata|superadmin-safety/);
  assert.match(userAdmin, /SUPERADMIN/);
  assert.match(userAdmin, /active|count|Ãºltimo|ultimo|conflict/i);
});

test("CP-028 aplica guards y conserva los controles reales de usuarios", () => {
  const adminPage = read("src/app/admin/page.tsx");
  const usersPage = read("src/app/admin/usuarios/page.tsx");
  const usersView = read("src/components/admin/AdminUsersStitch.tsx");
  assert.match(adminPage, /requireAdmin/);
  assert.match(adminPage, /getAdminLandingPath/);
  assert.match(adminPage, /redirect\(/);
  assert.match(read("src/app/admin/auditoria/page.tsx"), /requirePermission\(["']audit\.view["']\)/);
  assert.match(read("src/app/admin/inventario/page.tsx"), /requirePermission\(["']inventory\.view["']\)/);
  assert.match(usersPage, /requirePermission\(["']users\.view["']\)/);
  assert.match(read("src/app/api/admin/usuarios/invitaciones/route.ts"), /users\.invite/);
  assert.match(usersPage, /<AdminUsersStitch/);
  assert.match(usersPage, /canInvite=\{can\(actor\.role, "users\.invite"\)\}/);
  assert.match(usersPage, /canManage=\{can\(actor\.role, "users\.manage"\)\}/);
  assert.match(usersView, /<UserRoleControl[\s\S]*status=\{detail\.user\.status as UserStatus\}/);
  assert.match(usersView, /<StaffInvitationForm[\s\S]*allowSuperadmin=\{allowSuperadmin\}/);
  assert.doesNotMatch(usersPage, /StaffInvitationForm/);
  assert.doesNotMatch(usersPage, /status=\{user\.status\}/);
  assert.match(read("src/components/admin/UserRoleControl.tsx"), /SUSPENDED|Estado del usuario/);
});
