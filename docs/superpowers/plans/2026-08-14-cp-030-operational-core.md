# CP-030 Operational Core 3.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Eliminate fictitious runtime data and deliver a persistent, transactional, auditable ColdPower operational core while preserving the real ACSOFT catalog and CP-028 RBAC.

**Architecture:** Keep the existing Next.js App Router, Drizzle schema and PostgreSQL source of truth. Additive migrations extend missing business entities and constraints; domain services own transactions and audit writes; read services own dashboard/reporting DTOs; HTTP routes expose uniform contracts and server-side guards. UI files are changed only where a hardcoded value prevents consuming a real DTO.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, React 19, Drizzle ORM, Neon PostgreSQL, Node test runner, tsx, ESLint, Next build.

## Global Constraints

- Preserve exactly 1,348 imported products and 1,348 unique immutable SKUs.
- PostgreSQL/Neon is the source of truth; production never imports fixtures or hardcoded catalog/metric arrays.
- `NULL`/`UNKNOWN` is not `ZERO`; unknown inventory must not be shown as low stock.
- Public catalog exposes `PUBLISHED` only; `REVIEW`, `HIDDEN`, `DRAFT` and `ARCHIVED` stay private.
- Preserve CP-028 roles and canonical guards; Bryan (`OPERACIONES_VENTAS`) has no cost/margin permissions.
- All sensitive mutations are transactional, idempotent where applicable, and audited with sanitized structured before/after JSON.
- Presentation timezone is `America/Lima`; do not retain the static `25 may. - 24 jun. 2024` range.
- Do not redesign layout/CSS or migrate infrastructure in this ticket.

## Task 1: Baseline, backup, and executable data contracts

**Files:**
- Create: `scripts/cp030-runtime-data-contract.test.mjs`
- Create: `scripts/cp030-consistency.test.ts`
- Create: `docs/contracts/cp-030-admin-data-contracts.md`
- Modify: `package.json`
- Use: `scripts/backup-database.ts`, `scripts/qa-inventory-data.ts`, `scripts/qa-inventory-full.ts`

**Interfaces:**
- `assertUniformApiError(source: string)` rejects route error responses without `{ error: { code, message, details } }`.
- `assertNoProductionDemoLiterals(sourceFiles: string[])` scans runtime source only; fixtures and tests remain allowed.
- `ConsistencySnapshot` contains zero-safe sales, pipeline, payment and inventory semantics.

- [ ] Write tests that fail for the existing hardcoded admin literals, review-visible public query, fake pager, static security count, and missing product report filter.
- [ ] Run the focused tests and record the expected red failures before implementation.
- [ ] Run a logical backup and inventory QA; verify backup metadata, table list, 1,348 products and unique SKU count without printing secrets.
- [ ] Write the 14-screen route matrix with route, method, permission, params, response, empty behavior and error contract.
- [ ] Implement the minimum shared error/DTO assertions and add `test:cp030` to `package.json`.
- [ ] Run the focused tests again and retain the red-to-green evidence in the task report.

## Task 2: Catalog publication, inventory semantics, and Kardex integrity

**Files:**
- Create/modify: `src/db/schema.ts`, `drizzle/0017_cp030_inventory_catalog.sql`, `docs/migrations/0017_cp030_inventory_catalog.rollback.sql`
- Modify: `src/lib/catalog-repository.ts`, `src/lib/inventory-domain.ts`, `src/lib/inventory-transaction.ts`, `src/lib/inventory-admin.ts`
- Modify: `src/app/api/admin/inventario/ajustes/route.ts`, transfer and reservation routes under `src/app/api/admin/inventario/`
- Create: `scripts/cp030-inventory-domain.test.ts`, `scripts/cp030-publication-contract.test.mjs`

**Interfaces:**
- `getPublicCatalog(params)` always adds `publicationStatus = "published"` and returns `availabilityStatus: "UNKNOWN"` without quantitative balance.
- `adjustInventory(input: { productId: string; locationId: string; delta: number; reason: string; notes?: string; actorId: string })` atomically updates a locked balance, appends one movement and one audit event.
- `reserveInventory`, `releaseInventory`, `consumeInventory`, and `expireInventory` operate on `inventory_reservations` with idempotency and balance locks.
- `transitionTransfer(id, nextStatus, actor)` permits only `DRAFT → REQUESTED → IN_TRANSIT → RECEIVED` and cancellation before receipt; receipt creates paired Kardex entries.

- [ ] Add failing tests for unknown-vs-zero, public review/hidden exclusion, product `CP-REF-OTR-0435`/source `121`, rollback on adjustment error, append-only Kardex, transfer transition rules, and reservation lifecycle.
- [ ] Run the tests red.
- [ ] Apply additive constraints/indexes and preserve existing source/original/normalized/commercial product fields.
- [ ] Implement locked transactions and compensating-movement rules; no historical movement update/delete routes.
- [ ] Reconcile review, duplicate, published and hidden counts from DB and expose them through admin catalog DTOs.
- [ ] Run inventory, catalog, publication and migration tests green.

## Task 3: Pricing, company settings, users and RBAC counters

**Files:**
- Create/modify: `src/db/schema.ts`, `drizzle/0018_cp030_pricing_settings.sql`, `docs/migrations/0018_cp030_pricing_settings.rollback.sql`
- Modify: `src/lib/pricing-repository.ts`, `src/lib/company-settings.ts`, `src/lib/company-settings-runtime.ts`, `src/lib/user-administration.ts`, `src/lib/roles.ts`
- Modify: `src/app/api/admin/precios/`, `src/app/api/admin/configuracion/`, `src/app/api/admin/usuarios/`
- Create: `scripts/cp030-pricing-settings-rbac.test.ts`

**Interfaces:**
- `upsertProductPrice(input)` stores retail/wholesale/minimum/special, PEN default, validity window and status, then appends price history with old/new value, actor and reason.
- `getCompanySettings()` returns typed `legalName`, `tradeName`, `ruc`, `country`, `department`, `province`, `district`, `address`, `whatsapp`, `phone`, `salesEmail`, `businessHours`, `facebook`, `instagram`, `tiktok`, `website` from one row without positional defaults.
- `getUserSummary()` groups only `users.roleCode` and `users.status`; disabled users do not count as active.

- [ ] Add failing tests for price history, special/minimum fields, Bryan cost/margin denial, typed settings, one-user role counters and truthful pagination metadata.
- [ ] Run red.
- [ ] Add missing schema fields and migrations with rollback.
- [ ] Implement permission-separated pricing/settings/user services and uniform errors.
- [ ] Replace positional company-setting fallbacks and current-page metric counts with DB totals; remove fake pager.
- [ ] Run RBAC, pricing, settings, user and contract tests green.

## Task 4: CRM, pipeline, quote conversion, sales, orders and payments

**Files:**
- Create/modify: `src/db/crm-schema.ts`, `src/db/sales-schema.ts`, `drizzle/0019_cp030_erp_workflows.sql`, `docs/migrations/0019_cp030_erp_workflows.rollback.sql`
- Modify: `src/lib/crm-repository.ts`, `src/lib/crm-service.ts`, `src/lib/quote-conversion-service.ts`, `src/lib/sales-service.ts`, `src/lib/payments.ts`
- Modify: `src/app/api/admin/clientes/`, `oportunidades/`, `cotizaciones/`, `ventas/`, `pedidos/`, `pagos/`, `src/app/api/checkout/`, `src/app/api/cuenta/`
- Create: `scripts/cp030-erp-flow.test.ts`, `scripts/cp030-customer-scope.test.ts`, `scripts/cp030-erp-contract.test.mjs`

**Interfaces:**
- `getCustomerForActor(actor)` resolves the internal customer link from Clerk user id; customer portal queries always include that customer id.
- `transitionOpportunity`, `convertQuoteToSale`, `transitionOrder`, and `confirmManualPayment` validate allowed transitions and persist actor/reason/timestamp.
- `convertQuoteToSale({ quoteId, idempotencyKey, actorId })` returns the existing sale on a repeated key or quote id and never creates a duplicate.
- `getPipelineMetrics(filters)` returns zeros and `conversion: null` when no opportunities exist.

- [ ] Add failing tests for customer/company contacts/notes/addresses, Clerk internal link, pipeline transitions, zero metrics, quote snapshot, idempotent conversion, order/payment states, manual permission, cancellation audit and IDOR rejection.
- [ ] Run red.
- [ ] Add normalized CRM and provider-agnostic payment evidence/attempt tables and constraints.
- [ ] Implement domain transition services and transactional Customer → Quote → Opportunity → Sale → Order → Payment → Delivery flow.
- [ ] Keep invoice fields limited to external ACSOFT reference/status; do not add a fake SUNAT generator.
- [ ] Run domain, integration, E2E and RBAC tests green.

## Task 5: Dashboard, reporting, search, notifications, audit and CMS persistence

**Files:**
- Create/modify: `src/db/operations-schema.ts`, `src/db/schema.ts`, `drizzle/0020_cp030_reporting_audit_cms.sql`, `docs/migrations/0020_cp030_reporting_audit_cms.rollback.sql`
- Create: `src/lib/dashboard-service.ts`, `src/lib/reporting-service.ts`, `src/lib/global-search.ts`
- Modify: `src/lib/operations-dashboard.ts`, `src/lib/audit.ts`, `src/lib/cms-repository.ts`, `src/lib/public-cms.ts`, `src/lib/notifications-service.ts`
- Modify: `src/app/api/admin/dashboard/route.ts`, `src/app/api/admin/notificaciones/route.ts`, `src/app/api/admin/cms/`, `src/app/api/cms/[slug]/route.ts`, `src/app/api/catalog/`
- Modify minimally: `src/components/admin/AdminDashboardView.tsx`, `AdminCharts.tsx`, `AdminCategoryViews.tsx`, `AdminShell.tsx`
- Create: `scripts/cp030-reporting-audit-cms.test.ts`, `scripts/cp030-no-fake-runtime.test.mjs`

**Interfaces:**
- `DashboardService.getSnapshot(filters)` returns real sales, quote, order, stock, pipeline, top-product, top-customer, activity, user and notification DTOs.
- `ReportingService.getReport(filters)` documents formulas: ticket = confirmed sales amount/count only when count > 0; conversion = accepted/eligible opportunities, null when denominator is zero; margin only with cost and sale price.
- `searchAdmin(query, actor)` scopes product/SKU/customer/quote/sale/order results by permission.
- `getPublicCms(slug)` returns published only; `getCmsPreview(slug, actor)` may return draft.

- [ ] Add failing tests for zero-safe metrics, Lima dates, SQL source of top products/customers, notification count from unread rows, sanitized audit events, CMS draft preview/published public behavior, public pagination and admin search permissions.
- [ ] Run red.
- [ ] Implement dedicated read services and remove static chart series/date/IP/count literals from runtime components.
- [ ] Add CMS sections/entries/revisions or complete equivalent persistence, validate banner placement/order/active/window/link/alt, and keep media as R2-ready metadata only.
- [ ] Normalize route errors and notification empty state to zero.
- [ ] Run reporting, audit, CMS, search, notification and runtime fake-data tests green.

## Task 6: Full QA and local smoke

**Files:**
- Modify: `scripts/test-all.mjs`, `package.json`
- Create: `scripts/cp030-e2e-flow.test.ts`, `scripts/cp030-production-gates.test.mjs`, `docs/qa/cp-030-final-report.md`

- [ ] Run all existing CP-025/CP-027/CP-028/CP-029 tests and CP-030 tests.
- [ ] Run the full Customer → Quote → Opportunity → Sale → Order → Payment → Delivery flow and verify audit entries after each transition.
- [ ] Run `corepack pnpm exec tsc --noEmit`, `corepack pnpm lint`, and `corepack pnpm build`.
- [ ] Run RBAC audit, API contract sync and workflow regression runners when their repository wrappers are available; record unavailable wrappers explicitly.
- [ ] Start/verify localhost on port 3000 and smoke `/`, `/catalogo`, `/api/health`, `/admin/dashboard` with authentication behavior documented.
- [ ] Re-read CP-030 section by section, fill the final deliverable report with diagnosis, eliminated mock data, migrations, contracts, permissions, risks and pending items.
