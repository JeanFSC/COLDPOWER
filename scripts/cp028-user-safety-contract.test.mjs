import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const read = (file) => readFileSync(join(root, file), "utf8");

test("invitaciones requieren elegir un rol explícito antes de enviar", () => {
  const form = read("src/components/admin/StaffInvitationForm.tsx");
  assert.match(form, /useState<InvitationRole \| "">\(""\)/);
  assert.match(form, /roleOptions\.some\(\(option\) => option\.value === role\)/);
  assert.ok(form.indexOf("roleOptions.some") < form.indexOf("await fetch"));
  assert.match(form, /value: "", label: "Selecciona un rol"/);
  assert.match(form, /setRole\(""\)/);
  assert.doesNotMatch(form, /roleOptions\[0\]\?\.value/);
});

test("usuarios presentan límites de paginación inactivos y títulos completos", () => {
  const view = read("src/components/admin/AdminUsersStitch.tsx");
  assert.match(view, /page <= 1 \? \([\s\S]*?<span aria-label="Página anterior" aria-disabled="true"/);
  assert.match(view, /page >= totalPages \? \([\s\S]*?<span aria-label="Página siguiente" aria-disabled="true"/);
  assert.match(view, /aria-current=\{number === page \? "page" : undefined\}/);
  assert.match(view, /className="break-words[^\n]*>\{label\}/);
});

test("usuarios ajustan la página antes de consultar sus filas", () => {
  const service = read("src/lib/user-administration.ts");
  const pageService = service.slice(service.indexOf("export async function getUserPage("), service.indexOf("export async function getPendingInvitationsCount("));
  assert.ok(pageService.indexOf("Math.min(requestedPage, totalPages)") < pageService.indexOf(".offset((page - 1) * pageSize)"));
  assert.match(read("src/app/admin/usuarios/page.tsx"), /filters=\{\{ \.\.\.filters, page: page\.page, pageSize: page\.pageSize \}\}/);
});

test("usuarios distinguen errores de filtros, base y Clerk", () => {
  const page = read("src/app/admin/usuarios/page.tsx");
  const view = read("src/components/admin/AdminUsersStitch.tsx");
  assert.match(page, /resolveUsersPageFilters\(query\)/);
  assert.match(page, /invitationsError = true/);
  assert.match(view, /filterNotice \? <p role="alert"/);
  assert.match(view, /value=\{loadError \? "N\/D" : metrics\.active\}/);
  assert.match(view, /value=\{invitationsError \? "N\/D" : metrics\.pendingInvitations\}/);
  assert.match(view, /invitationsError \? "No se pudieron consultar las invitaciones pendientes\."/);
  assert.match(view, /!loadError \? <footer/);
});

test("selector de roles conserva todas las opciones al filtrar o paginar", () => {
  const view = read("src/components/admin/AdminUsersStitch.tsx");
  assert.match(view, /\.\.\.userRoleCatalog\.map\(\(role\)/);
  assert.doesNotMatch(view, /new Set\(users\.map\(\(user\) => user\.role\)\)/);
  assert.match(view, /Buscar por nombre, correo o teléfono/);
});

test("usuarios conservan confirmación y presentan fallos de red sin reintento automático", () => {
  const roles = read("src/components/admin/UserRoleControl.tsx");
  const invitations = read("src/components/admin/StaffInvitationActions.tsx");
  assert.match(roles, /try\s*\{[\s\S]*await fetch[\s\S]*catch\s*\{/);
  assert.match(roles, /Actualiza la ficha y comprueba el estado actual/);
  assert.match(roles, /pendingChange\.payload/);
  assert.match(invitations, /window\.confirm/);
  assert.match(invitations, /try\s*\{[\s\S]*await fetch[\s\S]*catch\s*\{/);
  assert.match(invitations, /Actualiza la lista de invitaciones/);
  assert.match(invitations, /messageKind === "error" \? "text\[?[^\n]*b42318/);
});

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
  assert.match(usersPage, /canManage=\{can\(actor\.role, "roles\.manage"\)\}/);
  assert.match(usersView, /<UserRoleControl[\s\S]*status=\{detail\.user\.status as UserStatus\}/);
  assert.match(usersView, /<StaffInvitationForm[\s\S]*allowSuperadmin=\{allowSuperadmin\}/);
  assert.doesNotMatch(usersPage, /StaffInvitationForm/);
  assert.doesNotMatch(usersPage, /status=\{user\.status\}/);
  assert.match(read("src/components/admin/UserRoleControl.tsx"), /SUSPENDED|Estado del usuario/);
});
