import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { assertUserChangeAllowed, canInviteRole, UserAdministrationError, parseUserFilters } from "../src/lib/user-administration";

const root = process.cwd();
const read = (file: string) => readFileSync(`${root}/${file}`, "utf8");

test("usuarios: listado paginado y filtros", () => {
  const filters = parseUserFilters(new URLSearchParams("query=ana&role=GERENCIA&status=ACTIVE&createdFrom=2026-01-01&lastSignInTo=2026-02-01&page=2&pageSize=50"));
  assert.equal(filters.query, "ana"); assert.equal(filters.role, "GERENCIA"); assert.equal(filters.status, "ACTIVE"); assert.equal(filters.page, 2); assert.equal(filters.pageSize, 50);
  assert.throws(() => parseUserFilters(new URLSearchParams("createdFrom=2026-02-02&createdTo=2026-02-01")));
  assert.throws(() => parseUserFilters(new URLSearchParams("status=UNKNOWN")));
});

test("usuarios: último SUPERADMIN y auto-bloqueo quedan protegidos", () => {
  const target = { roleCode: "SUPERADMIN", status: "ACTIVE" } as never;
  assert.throws(() => assertUserChangeAllowed({ actorRole: "SUPERADMIN", actorUserId: "u1", targetId: "u1", nextStatus: "SUSPENDED", target, activeSuperadmins: 1 }), (error: unknown) => error instanceof UserAdministrationError && error.status === 409);
  assert.throws(() => assertUserChangeAllowed({ actorRole: "GERENCIA", actorUserId: "u2", targetId: "u1", nextRole: "VENTAS", target, activeSuperadmins: 2 }), (error: unknown) => error instanceof UserAdministrationError && error.status === 403);
  assert.equal(canInviteRole("OPERACIONES_VENTAS", "GERENCIA"), false);
  assert.equal(canInviteRole("GERENCIA", "OPERACIONES_VENTAS"), true);
  assert.equal(canInviteRole("SUPERADMIN", "SUPERADMIN"), true);
});

test("usuarios: contrato de APIs, Clerk, invitaciones, RBAC y auditoría", () => {
  for (const file of [
    "src/app/api/admin/usuarios/route.ts",
    "src/app/api/admin/usuarios/[id]/route.ts",
    "src/app/api/admin/usuarios/export/route.ts",
    "src/app/api/admin/usuarios/invitaciones/route.ts",
    "src/app/api/admin/usuarios/invitaciones/[id]/route.ts",
    "src/components/admin/StaffInvitationActions.tsx",
  ]) assert.equal(existsSync(`${root}/${file}`), true, file);
  assert.match(read("src/app/admin/usuarios/page.tsx"), /getUserPage/);
  assert.doesNotMatch(read("src/app/admin/usuarios/page.tsx"), /select\(\)\.from\(users\)/);
  assert.match(read("src/app/api/admin/usuarios/route.ts"), /users\.view/);
  assert.match(read("src/app/api/admin/usuarios/export/route.ts"), /users\.export/);
  assert.match(read("src/app/api/admin/usuarios/[id]/route.ts"), /setUserRole/);
  assert.match(read("src/app/api/admin/usuarios/[id]/route.ts"), /clerkSyncStatus: "PENDING"/);
  assert.match(read("src/app/api/admin/usuarios/[id]/route.ts"), /roles\.manage/);
  assert.match(read("src/app/api/admin/usuarios/invitaciones/route.ts"), /getInvitationList/);
  assert.match(read("src/app/api/admin/usuarios/invitaciones/[id]/route.ts"), /cancel|resend/);
  assert.match(read("src/lib/user-administration.ts"), /ignoreExisting: true/);
  assert.match(read("src/app/api/webhooks/clerk/route.ts"), /clerkWebhookEvents/);
  assert.match(read("src/app/api/webhooks/clerk/route.ts"), /idempotent/);
  assert.match(read("src/app/api/webhooks/clerk/route.ts"), /parseClerkWebhookEvent/);
  assert.match(read("src/app/api/webhooks/clerk/route.ts"), /pg_advisory_xact_lock/);
  assert.doesNotMatch(read("src/app/api/webhooks/clerk/route.ts"), /getDb\(\)\.transaction/);
  assert.match(read("src/db/schema.ts"), /clerkSyncStatus/);
  assert.match(read("src/app/api/admin/usuarios/[id]/route.ts"), /access\.user_role_changed|access\.user_status_changed/);
});
