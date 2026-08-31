# CP-028 Authentication, Users, Roles and Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the existing Clerk/Neon authentication stack into the ColdPower business model `SUPERADMIN`, `GERENCIA`, `OPERACIONES_VENTAS` and `CUSTOMER`, with server-side authorization, safe staff administration, role-aware navigation and escalation tests.

**Architecture:** Keep Clerk as the identity provider and the existing `users.roleCode` plus centralized permission helper as the authorization source. Add business-role aliases and user lifecycle state to the existing schema, resolve the active role/status server-side before protected work, and keep legacy role codes as compatibility values rather than performing a destructive migration. Reuse existing catalog, inventory, pricing, CRM, sales, orders, CMS, media, invitations and audit services.

**Tech Stack:** Next.js 16 App Router, Clerk, Drizzle ORM, Neon PostgreSQL, TypeScript, Node test runner, `tsx`, ESLint, Next build.

## Global Constraints

- Do not replace Clerk or create a second authentication system.
- Do not duplicate RBAC or trust frontend-hidden controls.
- Do not hardcode names, email addresses or passwords for the three workers.
- Do not delete users or audit history to remove access; use lifecycle status and append-only audit entries.
- Preserve legacy role codes (`JEFATURA`, `ADMIN`, `VENTAS`, `ALMACEN`, `COMPRAS`, `REPORTES`) for compatibility while displaying ColdPower business labels.
- Enforce permission checks before sensitive database queries in pages and API routes.
- Do not expose secrets, credentials, passwords or session tokens in audit data or logs.

### Task 1: Add failing CP-028 contracts

**Files:**
- Create: `scripts/cp028-rbac-contract.test.mjs`
- Create: `scripts/cp028-user-safety-contract.test.mjs`
- Modify: `scripts/test-all.mjs`

- [ ] Assert the final role labels and mappings exist, `OPERACIONES_VENTAS` has operational permissions but not dashboard/reports/audit/costs/users/roles, and `GERENCIA` has business permissions but not technical/RBAC permissions.
- [ ] Assert protected pages use permission-specific guards, the admin navigation is permission-filtered, the operations landing exists, user status is persisted, webhook deletion is non-destructive, and last-superadmin safety is represented.
- [ ] Run the two new tests before production changes and confirm they fail for the missing behavior.

### Task 2: Extend the existing user model safely

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0016_cp028_access_control.sql`
- Modify: `src/lib/roles.ts`
- Modify: `src/lib/auth.ts`

- [ ] Add `GERENCIA` and `OPERACIONES_VENTAS` to the existing app-role enum while retaining legacy values.
- [ ] Add `user_status` enum (`ACTIVE`, `INACTIVE`, `SUSPENDED`) and `users.status`, `users.lastSignInAt`, and `users.lastRoleChangedAt` fields with safe defaults/nullability.
- [ ] Define canonical permission names needed by the ticket and keep aliases for current route names.
- [ ] Map `JEFATURA` to `GERENCIA` and `ADMIN`/`VENTAS` to `OPERACIONES_VENTAS` for display and compatibility without changing historical rows destructively.
- [ ] Resolve the current user from Clerk plus Neon: reject inactive/suspended staff before data access, prefer persisted `roleCode`, and use claims only for the existing bootstrap/configured fallback.
- [ ] Keep `SUPERADMIN` as the only role with technical/RBAC/integration permissions.

### Task 3: Protect staff lifecycle and the last SUPERADMIN

**Files:**
- Modify: `src/app/api/admin/usuarios/[id]/route.ts`
- Modify: `src/app/api/admin/usuarios/invitaciones/route.ts`
- Modify: `src/app/api/webhooks/clerk/route.ts`
- Create: `src/lib/user-administration.ts`
- Modify: `src/db/schema.ts` and `drizzle/0016_cp028_access_control.sql`

- [ ] Centralize target-user loading, role/status authorization and active-superadmin counting in `user-administration.ts`.
- [ ] Reject Gerencia/Bryan attempts to modify, deactivate or downgrade a SUPERADMIN; reject any operation that would leave zero active SUPERADMIN users with HTTP 409.
- [ ] Separate `users.view`, `users.invite` and `users.manage`; allow Gerencia to view/invite only `GERENCIA` or `OPERACIONES_VENTAS`, and reserve role changes/deactivation for SUPERADMIN.
- [ ] Keep invitations in Clerk, restrict public staff roles to the two business roles, and audit invitation creation without secrets.
- [ ] Change `user.deleted` webhook handling to mark the local user `INACTIVE` and preserve historical attribution; update Clerk role synchronization and sign-in timestamps.

### Task 4: Make all server-side guards match the matrix

**Files:**
- Modify: `src/app/admin/page.tsx`
- Create: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/operaciones/page.tsx`
- Modify: `src/app/admin/catalogo/page.tsx`
- Modify: `src/app/admin/taxonomia/page.tsx`
- Modify: `src/app/admin/cms/page.tsx`
- Modify: `src/app/admin/inventario/page.tsx`
- Modify: `src/app/admin/precios/page.tsx`
- Modify: `src/app/admin/crm/page.tsx`
- Modify: `src/app/admin/cotizaciones/page.tsx`
- Modify: `src/app/admin/ventas/page.tsx`
- Modify: `src/app/admin/pedidos/page.tsx`
- Modify: `src/app/admin/reportes/page.tsx`
- Modify: `src/app/admin/auditoria/page.tsx`
- Modify: `src/app/admin/compras/page.tsx`
- Modify: `src/app/admin/notificaciones/page.tsx`
- Modify: `src/app/admin/promociones/page.tsx`
- Modify: `src/app/admin/configuracion/page.tsx`
- Modify: all matching `src/app/api/admin/**/route.ts` files

- [ ] Replace broad `requireAdmin()` calls with the permission required for that module before database reads.
- [ ] Ensure `/admin`, `/admin/dashboard`, `/admin/reportes`, `/admin/auditoria`, `/admin/usuarios` and their APIs deny Bryan and CUSTOMER.
- [ ] Add the limited `/admin/operaciones` landing using existing persisted counts only: pending quotes/follow-ups, open opportunities, preparing orders and stock alerts.
- [ ] Keep operational modules accessible to Bryan and Gerencia according to the ticket without exposing executive totals, costs, margins or audit data to Bryan.

### Task 5: Filter the admin navigation and post-login destinations

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Create/modify: `src/components/admin/AdminNavigation.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Modify: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `src/components/auth/AuthCard.tsx`

- [ ] Render each admin link only when the server-resolved actor has its permission; never rely on CSS/client state for security.
- [ ] Route SUPERADMIN and GERENCIA to `/admin/dashboard`, Bryan to `/admin/operaciones`, and CUSTOMER to `/cuenta` after authentication using Clerk-safe server-side logic.
- [ ] Keep sign-up as CUSTOMER-only; do not accept role selection or role metadata from public form input.
- [ ] Preserve centered responsive ColdPower login/register presentation.

### Task 6: Complete `/admin/usuarios` without privilege escalation

**Files:**
- Modify: `src/app/admin/usuarios/page.tsx`
- Modify: `src/components/admin/UserRoleControl.tsx`
- Modify: `src/components/admin/StaffInvitationForm.tsx`
- Modify: `src/app/api/admin/usuarios/[id]/route.ts`
- Modify: `src/app/api/admin/usuarios/invitaciones/route.ts`

- [ ] Show name, email, account type, business role, lifecycle status, last access when available, join date and allowed actions.
- [ ] Show role/status controls only to SUPERADMIN; show Gerencia only the allowed invitation/view actions.
- [ ] Add activate/deactivate/suspend actions backed by the lifecycle service and audit log.
- [ ] Make role options display `Gerencia` and `Operaciones y ventas`, while accepting legacy codes only for compatibility.

### Task 7: Add adversarial authorization and audit tests

**Files:**
- Create: `scripts/cp028-authorization-matrix.test.ts`
- Create: `scripts/cp028-route-guards-contract.test.mjs`
- Modify: `scripts/rbac-permissions.test.ts`
- Modify: `scripts/rbac-cp027.test.ts`

- [ ] Test positive/negative permission matrix for SUPERADMIN, GERENCIA, OPERACIONES_VENTAS and CUSTOMER.
- [ ] Test Bryan cannot access dashboard, reports, audit, users, roles, permissions, costs, margins, technical settings or integrations.
- [ ] Test CUSTOMER cannot access `/admin` or any `/admin/*` route.
- [ ] Test Bryan cannot send `roleCode: SUPERADMIN`, modify users or access report APIs.
- [ ] Test last-superadmin downgrade/deactivation/delete protection and append-only audit requirements.
- [ ] Test inventory mutations require Kardex plus audit, price mutations require price history plus audit, and sales have no hard-delete route.
- [ ] Keep IDOR coverage for user/product/quote/sale IDs at route authorization boundaries.

### Task 8: Runtime and delivery verification

**Files:**
- Modify only if needed after tests: affected implementation files.

- [ ] Apply the additive migration only after reviewing its SQL and current Neon schema; do not run destructive resets.
- [ ] Run `pnpm test:all`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` fresh.
- [ ] Run local HTTP smoke for `/`, `/catalogo`, `/admin`, `/admin/dashboard`, `/admin/operaciones`, `/api/health`, and direct denied routes with auth-configured test coverage where possible.
- [ ] Run catalog/inventory QA to ensure the 1,348 Excel products remain intact.
- [ ] Inspect the final diff and report implemented requirements, compatibility mappings, migration, test evidence, screenshots/runtime limitations and remaining risks. Do not commit or push without explicit authorization.
