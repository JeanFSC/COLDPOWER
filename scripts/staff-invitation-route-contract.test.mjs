import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routePath = "src/app/api/admin/usuarios/invitaciones/route.ts";
let route = "";
try { route = readFileSync(routePath, "utf8"); } catch { route = ""; }
const lifecycleRoute = readFileSync("src/app/api/admin/usuarios/invitaciones/[id]/route.ts", "utf8");
const webhook = readFileSync("src/app/api/webhooks/clerk/route.ts", "utf8");
const page = readFileSync("src/app/admin/usuarios/page.tsx", "utf8");
const usersView = readFileSync("src/components/admin/AdminUsersStitch.tsx", "utf8");

assert.ok(route, "Debe existir la ruta de invitación interna.");
assert.match(route, /requireApiPermission\("users\.invite"\)/);
assert.match(route, /createInvitation/);
assert.match(route, /publicMetadata/);
assert.match(route, /access\.staff_invitation_created/);
assert.match(lifecycleRoute, /cancelStaffInvitation/);
assert.match(lifecycleRoute, /resendStaffInvitation/);
assert.match(webhook, /roleCode/);
assert.doesNotMatch(webhook, /count === 0/);
assert.match(webhook, /const roleCode/);
assert.match(webhook, /session\.created/);
assert.match(page, /<AdminUsersStitch/);
assert.match(page, /canInvite=\{can\(actor\.role, "users\.invite"\)\}/);
assert.match(page, /canManage=\{can\(actor\.role, "users\.manage"\)\}/);
assert.match(page, /allowSuperadmin=\{actor\.role === "SUPERADMIN"\}/);
assert.match(usersView, /import \{ StaffInvitationForm \}/);
assert.match(usersView, /canInvite \? <StaffInvitationForm[\s\S]*allowSuperadmin=\{allowSuperadmin\}/);
assert.match(usersView, /<UserRoleControl[\s\S]*status=\{detail\.user\.status as UserStatus\}/);
assert.doesNotMatch(page, /StaffInvitationForm/);
console.log("CP-027 staff invitation route contract: PASS");
