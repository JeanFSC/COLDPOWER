# CP-050 Backend Audit and Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Demonstrate and repair the ColdPower backend/data spine from Clerk through catalog, pricing, inventory, CRM, commerce, purchases, reporting, CMS, settings, notifications, and audit without inventing business data.

**Architecture:** Preserve the existing Next.js App Router, Drizzle/PostgreSQL repositories, server-side permission guards, append-only audit log, and stable dashboard DTO fields. Prefer additive migrations, repository-level transactions/idempotency, and fixtures isolated by a QA correlation prefix. UI changes remain out of scope; only backend contracts and evidence are delivered to Codex 1.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Clerk, Svix, Node test runner, `tsx`, Playwright.

## Global Constraints

- Do not change Cloudflare, DNS, tunnel, or regenerate secrets.
- Do not expose secrets, Clerk tokens, cookies, or production credentials in logs or reports.
- Do not commit or push.
- Keep `salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary`, `recentActivity`, and `unknownStock` stable.
- Backend authorization is authoritative; hiding a UI button is never sufficient.
- Public reads must exclude unpublished products, internal prices, sensitive stock, and customer data.
- Every mutation must return distinguishable validation, authorization, not-found, conflict, dependency, and internal errors.
- Every retriable webhook/business mutation must be idempotent and auditable.
- Do not seed or publish real business data; use isolated QA fixtures and clean them after tests.
- Do not mark complaints legally ready without business/legal approval.

---

### Task 1: Establish reproducible evidence and root causes

**Files:**
- Read: `docs/qa/full-system-audit-2026-08-14.md`
- Read: `scripts/cp030-diagnose.ts`
- Read: `scripts/qa-inventory-data.ts`
- Read: `scripts/qa-inventory-full.ts`
- Create: `docs/qa/cp050-backend-audit-2026-08-15.md`
- Test: existing `scripts/test-all.mjs` and CP-031–CP-049 runtime tests.

**Interfaces:**
- Consumes: `.env.local`, current PostgreSQL database, current Clerk configuration, current local server.
- Produces: sanitized baseline counts, endpoint matrix, known gaps, and a list of fixes tied to reproduced failures.

- [ ] Run `pnpm test:all`, `pnpm qa:inventory-data`, `pnpm qa:inventory-db`, and all available `test:cp0xx:runtime` scripts.
- [ ] Query and record counts for products, publication states, prices, stock, locations, suppliers, CRM, quotes, sales, orders, payments, users, settings, CMS, notifications, and audit without recording sensitive values.
- [ ] Probe localhost and `dev.coldpower.pe` for root, health, sign-in, sign-up, admin redirect, webhook rejection, and public catalog responses.
- [ ] Compare route contracts against response bodies and record every discrepancy before editing code.

### Task 2: Auth, Clerk webhook, roles, and dashboard landing

**Files:**
- Modify if reproduced: `src/app/api/webhooks/clerk/route.ts`, `src/lib/env.ts`, `src/lib/auth.ts`, `src/lib/roles.ts`, `src/proxy.ts`, `src/app/auth/after-sign-in/page.tsx`.
- Add/modify tests: `scripts/cp050-auth-webhook.test.ts`, `scripts/cp050-auth-routes.test.mjs`.
- Add migration only if required: `drizzle/0033_cp050_*.sql`.

**Interfaces:**
- Produces: canonical `/api/webhooks/clerk`; event processing for create/update/delete; persisted local role/status; `/dashboard` compatibility route; server-side role matrix.

- [ ] Write failing tests for valid signed events, invalid signature, malformed payload, duplicate delivery, out-of-order delivery, deletion deactivation, and `/dashboard` redirect/landing.
- [ ] Run the new tests and verify they fail for the missing behavior rather than due to setup errors.
- [ ] Implement runtime payload validation, event idempotency, append-only audit, and atomic user status updates using the existing Neon-compatible database path.
- [ ] Ensure the only webhook verification secret is `CLERK_WEBHOOK_SECRET` from environment configuration.
- [ ] Add `/dashboard` as a stable redirect to the authenticated landing without changing `/admin/dashboard`.
- [ ] Verify persisted role is required for staff access and claims/query strings cannot elevate access.
- [ ] Run auth/webhook tests, TypeScript, and the affected runtime checks.

### Task 3: QA role fixtures and permission matrix

**Files:**
- Modify if required: `src/lib/roles.ts`, `src/lib/user-administration.ts`, `src/app/api/admin/usuarios/**`.
- Add/modify tests: `scripts/cp050-rbac.test.ts`, `scripts/cp050-rbac-routes.test.mjs`.
- Create sanitized fixture guide: `docs/contracts/cp050-qa-fixtures.md`.

**Interfaces:**
- Produces: isolated fixture definitions for `SUPERADMIN`, `GERENCIA`, `OPERACIONES_VENTAS`, and `ALMACEN` where applicable; permission matrix for view/create/edit/export/approve/destructive operations.

- [ ] Write failing matrix assertions for all roles and sensitive endpoints.
- [ ] Run them red.
- [ ] Align role labels, legacy aliases, route guards, action permissions, and scope filters without weakening `SUPERADMIN` safety.
- [ ] Verify invite creation, expiry, resend, revoke, and audit behavior using QA-only data.
- [ ] Run matrix and route tests and document fixture identifiers without secrets.

### Task 4: Catalog publication, duplicates, taxonomy, and public search

**Files:**
- Modify if required: `src/lib/publication-governance.ts`, `src/lib/publication-service.ts`, `src/lib/catalog-repository.ts`, `src/lib/catalog-admin-service.ts`, `src/lib/taxonomy-admin.ts`, `src/app/api/catalog/**`, `src/app/api/admin/catalogo/**`.
- Add migration only after evidence: `drizzle/0033_cp050_catalog_*.sql`.
- Add/modify tests: `scripts/cp050-publication.test.ts`, `scripts/cp050-taxonomy.test.ts`, `scripts/cp050-catalog-routes.test.mjs`.

**Interfaces:**
- Produces: explicit `IMPORTED`, `IN_REVIEW`, `APPROVED`, `PUBLISHED`, `REJECTED`, `ARCHIVED` behavior; canonical category/family/brand identities; stable paginated public/admin DTOs.

- [ ] Write failing tests for state transitions, required publication fields, SKU/search/filter pagination, duplicate visibility, and public exclusion of non-published products.
- [ ] Run red.
- [ ] Fix root causes in repository/query/governance layers; do not auto-publish the 1,348 imports.
- [ ] Create a reversible duplicate mapping only if database evidence confirms duplicates; preserve source identity and audit decisions.
- [ ] Verify one isolated approved fixture appears by SKU, brand, category, family, and application and enters quote flow.
- [ ] Run full catalog and taxonomy tests and clean QA rows.

### Task 5: Pricing and promotions

**Files:**
- Modify if required: `src/lib/pricing-service.ts`, `src/lib/pricing-repository.ts`, `src/lib/pricing-validation.ts`, `src/lib/promotion-service.ts`, `src/app/api/admin/precios/**`, `src/app/api/admin/promociones/**`.
- Add migration only if required: `drizzle/0034_cp050_pricing_*.sql`.
- Add/modify tests: `scripts/cp050-pricing.test.ts`, `scripts/cp050-pricing-routes.test.mjs`.

**Interfaces:**
- Produces: validated price/list/validity/currency model, history with actor and before/after, bulk preview/apply contract, promotion precedence, and explicit no-price publication behavior.

- [ ] Write failing tests for negative price, invalid currency, overlap, concurrent update, rounding, history, bulk rejection report, and promotion precedence.
- [ ] Run red.
- [ ] Implement minimal validated repository/service behavior with idempotency keys and audit entries.
- [ ] Verify cost visibility is restricted and public responses never expose internal prices.
- [ ] Run pricing/promotion tests and remove QA fixtures.

### Task 6: Inventory, locations, reservations, and purchase reception

**Files:**
- Modify if required: `src/lib/inventory-domain.ts`, `src/lib/inventory-transaction.ts`, `src/lib/inventory-workflow.ts`, `src/lib/inventory-admin.ts`, `src/lib/purchases-service.ts`, `src/app/api/admin/inventario/**`, `src/app/api/admin/compras/**`.
- Add migration only if required: `drizzle/0035_cp050_inventory_*.sql`.
- Add/modify tests: `scripts/cp050-inventory.test.ts`, `scripts/cp050-purchases.test.ts`.

**Interfaces:**
- Produces: atomic local/stock/Kardex/reservation workflows, reconciliation query, partial purchase reception, and idempotent receipt events.

- [ ] Write failing tests for two locales, receive, adjust, transfer, reserve, release, consume, return, negative balance, concurrency, reconciliation, and duplicate reception.
- [ ] Run red.
- [ ] Implement only the missing repository/domain logic; keep movements immutable and every business event auditable.
- [ ] Verify a purchase order does not alter stock until reception and that reception creates `PURCHASE_RECEIPT` plus Kardex in one transaction.
- [ ] Run inventory/purchase tests and clean fixtures.

### Task 7: CRM and pipeline

**Files:**
- Modify if required: `src/lib/crm-service.ts`, `src/lib/crm-repository.ts`, `src/lib/crm-validation.ts`, `src/lib/pipeline-repository.ts`, `src/app/api/admin/clientes/**`, `src/app/api/admin/oportunidades/**`, `src/app/api/admin/actividades/route.ts`, `src/app/api/admin/tareas/route.ts`.
- Add/modify tests: `scripts/cp050-crm.test.ts`.

**Interfaces:**
- Produces: idempotent client/customer/contact/opportunity/activity/task operations, deduplication rules, state transitions, ownership, due times, and audit events.

- [ ] Write failing tests for duplicate client conflict, idempotent create, invalid stage transitions, assignment, overdue task, and audit payload.
- [ ] Run red.
- [ ] Implement the smallest repository/service changes needed for the failing cases.
- [ ] Verify customer → opportunity → activity/task persists and is visible through the 360 response.
- [ ] Run CRM runtime and route tests and clean QA fixtures.

### Task 8: Quote → sale → order → payment

**Files:**
- Modify if required: `src/lib/quote-workflow.ts`, `src/lib/quote-conversion-service.ts`, `src/lib/sales-service.ts`, `src/lib/orders-repository.ts`, `src/lib/payment-service.ts`, `src/app/api/admin/cotizaciones/**`, `src/app/api/admin/ventas/**`, `src/app/api/admin/pedidos/**`, `src/app/api/admin/pagos/**`, `src/app/api/checkout/route.ts`.
- Add/modify tests: `scripts/cp050-commerce-flow.test.ts`.

**Interfaces:**
- Produces: immutable quote line snapshots, explicit state transitions, idempotent conversion references, order/reservation/payment contracts, cancellation/refund paths, and mock payment provider behavior.

- [ ] Write failing tests for quote lifecycle, duplicate conversion, missing stock/price, order creation, manual payment confirmation, payment retry, cancellation, return, expiration, and audit cross-references.
- [ ] Run red.
- [ ] Implement the smallest workflow fixes while preserving existing DTO names.
- [ ] Execute the complete isolated fixture flow and verify no duplicate lines, reservations, sales, orders, or payments.
- [ ] Run commerce tests and clean QA rows.

### Task 9: Reports, exports, settings, CMS, media, notifications, and complaints status

**Files:**
- Modify if required: `src/lib/operations-dashboard.ts`, `src/lib/reports-contract.ts`, `src/lib/dashboard-export.ts`, `src/lib/company-settings.ts`, `src/lib/cms-repository.ts`, `src/lib/media-repository.ts`, `src/lib/notifications-service.ts`, relevant admin API routes.
- Add/modify tests: `scripts/cp050-reports-settings.test.ts`, `scripts/cp050-cms-notifications.test.ts`.
- Update contract evidence: `docs/contracts/cp050-backend-contracts.md`.

**Interfaces:**
- Produces: explicit empty/no-data semantics, scoped metrics and exports, public/internal settings split, CMS draft/preview/publish/revision behavior, media validation/storage boundary, notification idempotency, and complaints “not legally approved” status.

- [ ] Write failing tests for non-trivial report series, filters/totals consistency, export authorization, settings public redaction, CMS publish/rollback, notification dedupe, and complaint access controls.
- [ ] Run red.
- [ ] Implement only the broken backend contracts; do not redesign UI.
- [ ] Verify stable dashboard fields remain present and their meanings do not change.
- [ ] Keep complaints marked pending legal/business approval unless approval evidence is supplied.
- [ ] Run affected tests and write contracts for Codex 1.

### Task 10: Full verification and handoff

**Files:**
- Modify: `docs/qa/cp050-backend-audit-2026-08-15.md`
- Read: all modified files and current `docs/qa/full-system-audit-2026-08-14.md`.

**Interfaces:**
- Produces: reproducible report with exact test commands, pass/fail results, sanitized counts, known external blockers, fixture/matrix handoff, and no secret material.

- [ ] Run `pnpm test:all`.
- [ ] Run TypeScript, lint, production build, all affected runtime suites, and Playwright smoke tests for localhost and public dev origin.
- [ ] Run database reconciliation and confirm QA fixtures are removed; retain only append-only audit evidence where the schema requires it.
- [ ] Check `git diff --check` and secret-marker scan over changed docs/source.
- [ ] Update the report with verified results, unresolved gaps, UI-only findings for Codex 1, and explicit no-commit/no-push status.
