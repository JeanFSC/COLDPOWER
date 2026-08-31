import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routePath = "src/app/api/admin/usuarios/invitaciones/route.ts";
let route = "";
try { route = readFileSync(routePath, "utf8"); } catch { route = ""; }
const lifecycleRoute = readFileSync("src/app/api/admin/usuarios/invitaciones/[id]/route.ts", "utf8");
const webhook = readFileSync("src/app/api/webhooks/clerk/route.ts", "utf8");
const page = readFileSync("src/app/admin/usuarios/page.tsx", "utf8");

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
assert.match(page, /StaffInvitationForm/);
assert.match(page, /allowSuperadmin/);
console.log("CP-027 staff invitation route contract: PASS");
