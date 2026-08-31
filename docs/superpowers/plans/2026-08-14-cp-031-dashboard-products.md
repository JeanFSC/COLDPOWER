# CP-031 — Lógica real de producción para Dashboard y Productos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar contratos backend reales, seguros y paginados para el Dashboard administrativo y el Catálogo administrativo sin romper los campos que ya consume el frontend.

**Architecture:** Mantener `src/lib/operations-dashboard.ts` como servicio de lectura del Dashboard y extraer validación, etiquetas y exportación a módulos enfocados. Consolidar el catálogo en un servicio paginado que devuelva filas, colas, facetas, stock y media en consultas agrupadas, dejando las rutas como adaptadores HTTP con permisos y errores explícitos. Las mutaciones de productos continuarán usando transacciones y auditoría existentes.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, PostgreSQL/Neon, Clerk/RBAC existente, Node test runner, `tsx`, ESLint y build de Next.js.

## Global Constraints

- Trabajar únicamente en Dashboard administrativo y Productos/ Catálogo administrativo.
- No eliminar componentes, cards, botones, imágenes, rutas ni estructura visual existente.
- Mantener sin renombrar ni eliminar `salesToday`, `salesMonth`, `salesRange`, `orders`, `quotes`, `opportunities`, `pipelineValue`, `criticalStock`, `noStock`, `unknownStock`, `noMovement`, `conversion`, `newCustomers`, `returningCustomers`, `productsSold`, `unitsSold`, `margin`, `overdueFollowUps`, `topProducts`, `topCustomers`, `topSellers`, `channels`, `salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary` y `recentActivity`.
- Mantener `salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary`, `recentActivity` y `unknownStock` compatibles con el frontend integrado.
- Usar `America/Lima` para resolver ventanas y días.
- No usar fechas fijas, datos simulados, imágenes falsas ni stock desconocido convertido a cero.
- Una fuente financiera ausente se representa con `null`; una consulta fallida se representa con error HTTP explícito, nunca con métricas silenciosamente vacías.
- Todos los endpoints administrativos validan permisos en backend.
- No exponer costos, márgenes ni información sensible a roles sin autorización.
- Ejecutar TypeScript, lint, build, `test:cp030` y las pruebas específicas CP-031 antes de declarar terminado.

---

### Task 1: Congelar contratos y crear utilidades de validación

**Files:**
- Create: `src/lib/dashboard-contract.ts`
- Create: `src/lib/catalog-contract.ts`
- Modify: `src/lib/api-errors.ts`
- Test: `scripts/cp031-contracts.test.ts`

**Interfaces:**
- Produce `DashboardFilters`, `parseDashboardFilters(params: URLSearchParams): DashboardFilters`, `ApiAuthorizationError`, `requireApiPermission(permission)` y etiquetas estables para roles, estados, pipeline, publicaciones y stock.
- No modifica el shape de los campos actuales; solo centraliza tipos y normalización que consumirán los servicios y rutas.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseDashboardFilters } from "@/lib/dashboard-contract";

test("CP-031 acepta filtros válidos y normaliza el rango", () => {
  const params = new URLSearchParams("range=custom&from=2026-08-01&to=2026-08-14&locationId=l1&sellerId=s1&productId=p1");
  assert.deepEqual(parseDashboardFilters(params), {
    range: "custom", from: "2026-08-01", to: "2026-08-14", locationId: "l1", sellerId: "s1",
    customerId: undefined, productId: "p1", categoryId: undefined, familyId: undefined,
    brandId: undefined, channel: undefined, orderStatus: undefined,
  });
});

test("CP-031 rechaza rango y fecha inválidos", () => {
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=bad")), /DASHBOARD_INVALID_FILTER/);
  assert.throws(() => parseDashboardFilters(new URLSearchParams("range=custom&from=2026-08-14&to=2026-08-01")), /DASHBOARD_INVALID_FILTER/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/cp031-contracts.test.ts`

Expected: FAIL because `src/lib/dashboard-contract.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
const ranges = ["today", "yesterday", "week", "month", "custom"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export type DashboardRange = (typeof ranges)[number];
export type DashboardFilters = {
  range?: DashboardRange; from?: string; to?: string; locationId?: string; sellerId?: string;
  customerId?: string; productId?: string; categoryId?: string; familyId?: string; brandId?: string;
  channel?: string; orderStatus?: string;
};
export function parseDashboardFilters(params: URLSearchParams): DashboardFilters {
  const range = params.get("range") || "month";
  if (!ranges.includes(range as DashboardRange)) throw new Error("DASHBOARD_INVALID_FILTER");
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  if ((from && !datePattern.test(from)) || (to && !datePattern.test(to))) throw new Error("DASHBOARD_INVALID_FILTER");
  if (range === "custom" && from && to && from > to) throw new Error("DASHBOARD_INVALID_FILTER");
  return { range: range as DashboardRange, from, to, locationId: params.get("locationId") || undefined, sellerId: params.get("sellerId") || undefined, customerId: params.get("customerId") || undefined, productId: params.get("productId") || undefined, categoryId: params.get("categoryId") || undefined, familyId: params.get("familyId") || undefined, brandId: params.get("brandId") || undefined, channel: params.get("channel") || undefined, orderStatus: params.get("orderStatus") || undefined };
}
```

Add `apiError` helpers that emit the existing `{ error: { code, message, details } }` envelope with `DASHBOARD_INVALID_FILTER`, `DASHBOARD_FORBIDDEN`, `DASHBOARD_EMPTY`, `CATALOG_INVALID_FILTER`, `CATALOG_FORBIDDEN` and the other CP-031 codes without changing current callers.

Add an API-only authorization helper that does not issue a Next.js redirect:

```ts
export class ApiAuthorizationError extends Error {
  constructor() { super("DASHBOARD_FORBIDDEN"); this.name = "ApiAuthorizationError"; }
}
export async function requireApiPermission(permission: Permission) {
  const context = await requireAdmin();
  if (!can(context.role, permission)) throw new ApiAuthorizationError();
  return context;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/cp031-contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-contract.ts src/lib/catalog-contract.ts src/lib/api-errors.ts scripts/cp031-contracts.test.ts
git commit -m "feat(cp031): freeze dashboard and catalog contracts"
```

### Task 2: Dashboard route, filters and explicit failures

**Files:**
- Modify: `src/app/api/admin/dashboard/route.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/reportes/page.tsx`
- Modify: `src/lib/operations-dashboard.ts`
- Test: `scripts/cp031-dashboard-route.test.mjs`

**Interfaces:**
- `GET /api/admin/dashboard` reads all query parameters from `request.nextUrl.searchParams` and passes the normalized `DashboardFilters` to `getOperationsDashboard(filters)`.
- `GET /api/admin/dashboard/export` will reuse the same parser in Task 6.
- Existing server-rendered pages keep their current stable response object and pass URL filters to the service.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard route reads request filters and separates invalid filters from database failures", () => {
  const source = fs.readFileSync("src/app/api/admin/dashboard/route.ts", "utf8");
  assert.match(source, /request\.nextUrl\.searchParams/);
  assert.match(source, /DASHBOARD_INVALID_FILTER/);
  assert.match(source, /DASHBOARD_UNAVAILABLE/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/cp031-dashboard-route.test.mjs`

Expected: FAIL because the route currently has no `request` parameter and always calls the service without filters.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function GET(request: Request) {
  try {
    const actor = await requireApiPermission("dashboard.view");
    const filters = parseDashboardFilters(new URL(request.url).searchParams);
    return apiSuccess(await getOperationsDashboard(filters, actor));
  } catch (error) {
    if (error instanceof Error && error.message === "DASHBOARD_INVALID_FILTER") return apiError("DASHBOARD_INVALID_FILTER", "Los filtros del dashboard no son válidos.", 400);
    if (error instanceof ApiAuthorizationError) return apiError("DASHBOARD_FORBIDDEN", "No tienes permiso para ver el dashboard.", 403);
    return apiError("DASHBOARD_UNAVAILABLE", "No se pudo cargar el dashboard.", 503);
  }
}
```

Use the repository's actual permission-error helper from `src/lib/auth.ts`; do not infer forbidden from a database failure. Update the page loaders to preserve the current `N/D` error state and pass URL filters, while keeping `requirePermission("dashboard.view")` and `requirePermission("reports.view")` intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/cp031-dashboard-route.test.mjs scripts/reports-filters-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/dashboard/route.ts src/app/admin/page.tsx src/app/admin/reportes/page.tsx src/lib/operations-dashboard.ts scripts/cp031-dashboard-route.test.mjs
git commit -m "feat(cp031): apply dashboard URL filters and explicit errors"
```

### Task 3: Dashboard real metrics, permissions and complete sales series

**Files:**
- Modify: `src/lib/operations-dashboard.ts`
- Modify: `src/lib/operational-semantics.ts`
- Test: `scripts/cp031-dashboard-data.test.ts`

**Interfaces:**
- Preserve every current top-level dashboard field.
- Add compatible fields `sales`, `revenue`, `costOfSales`, `grossProfit`, `grossMargin`, `operatingExpenses`, `operatingProfit`, `profitability`, `categorySummary`, `pendingPaymentsCount`, `criticalStockCount`, `overdueFollowUpsCount`, `pendingQuotesCount`, `pendingApprovalsCount`, and per-row `orders`/`units` where source data exists.
- `salesSeries` and `previousSalesSeries` remain arrays of `{ date, total, count }` and may add `orders`/`units` without removing existing keys.
- `getOperationsDashboard(filters, actor?)` applies the same date and entity filters to every metric query and masks financial fields for roles without the financial permission.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { fillSalesSeries, financialMetrics } from "@/lib/operations-dashboard";

test("CP-031 complete series keeps zero days and previous range aligned", () => {
  const from = new Date("2026-08-10T05:00:00.000Z");
  const to = new Date("2026-08-13T05:00:00.000Z");
  assert.deepEqual(fillSalesSeries({ from, to }, [{ date: "2026-08-11", total: 100, count: 2 }]), [
    { date: "2026-08-10", total: 0, count: 0 }, { date: "2026-08-11", total: 100, count: 2 }, { date: "2026-08-12", total: 0, count: 0 },
  ]);
});

test("CP-031 no financial source returns null instead of zero", () => {
  assert.equal(financialMetrics({ revenue: null, costOfSales: null, operatingExpenses: null }).grossProfit, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/cp031-dashboard-data.test.ts`

Expected: FAIL for the new financial helper and fields not yet implemented.

- [ ] **Step 3: Write minimal implementation**

Implement a single `financialMetrics` helper with these rules:

```ts
export function financialMetrics(input: { revenue: number | null; costOfSales: number | null; operatingExpenses: number | null }) {
  const grossProfit = input.revenue !== null && input.costOfSales !== null ? input.revenue - input.costOfSales : null;
  const grossMargin = grossProfit !== null && input.revenue !== null && input.revenue !== 0 ? grossProfit / input.revenue : null;
  const operatingProfit = grossProfit !== null && input.operatingExpenses !== null ? grossProfit - input.operatingExpenses : null;
  return { ...input, grossProfit, grossMargin, operatingProfit, profitability: operatingProfit !== null && input.revenue !== null && input.revenue !== 0 ? operatingProfit / input.revenue : null };
}
```

Extend the SQL service with filtered confirmed-sale revenue, sale-item units, product cost only when an active `COST` price exists, category aggregation, and payment/approval counts. Keep cost and margin `null` if any required cost source is missing. Keep the already-corrected zero-filled series implementation and add `orders` and `units` from grouped sale/order items. Map all existing filters into `salesConditions`, `orderConditions`, `opportunityConditions`, inventory-alert conditions and category/product joins. Keep `unknownStock` as a count of products without an inventory balance, not as zero stock.

Implement explicit label maps for pipeline stages, user roles/statuses and activity actions. The stable `stage`/`role`/`status` keys remain present, while additive keys `stageCode`, `stageLabel`, `roleCode`, `roleLabel`, `statusCode`, `statusLabel`, `actionLabel`, `entityLabel`, and `actorName` are added. Use `Sistema` when the audit actor is absent.

For financial masking, return the numeric financial fields only when `dashboard.financials.view` is allowed for the current actor; otherwise return `null` for the new sensitive fields and keep non-sensitive sales counts/series available. Never derive `operatingExpenses` from unrelated sales data.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/cp031-dashboard-data.test.ts scripts/cp030-consistency.test.ts`

Expected: PASS, including the existing complete-series test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/operations-dashboard.ts src/lib/operational-semantics.ts scripts/cp031-dashboard-data.test.ts
git commit -m "feat(cp031): make dashboard metrics and labels production-backed"
```

### Task 4: Dashboard export with the same filters and permission scope

**Files:**
- Create: `src/app/api/admin/dashboard/export/route.ts`
- Create: `src/lib/dashboard-export.ts`
- Modify: `src/lib/operations-dashboard.ts`
- Test: `scripts/cp031-dashboard-export.test.mjs`

**Interfaces:**
- `GET /api/admin/dashboard/export?...filters` returns `text/csv; charset=utf-8` with a UTF-8 BOM, a fixed header row, and the same filtered dashboard snapshot used by `/api/admin/dashboard`.
- Export rows include only fields visible to the actor; financial columns are omitted when the actor lacks `dashboard.financials.view`.
- Empty valid data returns `DASHBOARD_EMPTY` with HTTP 404; query failure returns `DASHBOARD_UNAVAILABLE` with HTTP 503.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("dashboard export reuses all filters and emits CSV", () => {
  const source = fs.readFileSync("src/app/api/admin/dashboard/export/route.ts", "utf8");
  assert.match(source, /searchParams/);
  assert.match(source, /getOperationsDashboard/);
  assert.match(source, /text\/csv/);
  assert.match(source, /DASHBOARD_EMPTY/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/cp031-dashboard-export.test.mjs`

Expected: FAIL because the export route does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function GET(request: Request) {
  try {
    const actor = await requirePermission("dashboard.view");
    const filters = parseDashboardFilters(new URL(request.url).searchParams);
    const data = await getOperationsDashboard(filters, actor);
    if (!data.salesSeries.length && !data.pipelineSummary.length && !data.recentActivity.length) return apiError("DASHBOARD_EMPTY", "No existen datos para exportar en este alcance.", 404);
    return new Response(toDashboardCsv(data, actor), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=coldpower-dashboard.csv" } });
  } catch (error) {
    return dashboardErrorResponse(error);
  }
}
```

Use a CSV escape function that quotes commas, quotes and line breaks; do not include secrets, raw audit JSON or hidden financial fields. Reuse `parseDashboardFilters` and the same service invocation, never a second filter implementation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/cp031-dashboard-export.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/dashboard/export/route.ts src/lib/dashboard-export.ts src/lib/operations-dashboard.ts scripts/cp031-dashboard-export.test.mjs
git commit -m "feat(cp031): export filtered dashboard data"
```

### Task 5: Catalog global queues, server filters, facets, stock and media

**Files:**
- Modify: `src/lib/admin-catalog.ts`
- Create: `src/lib/catalog-admin-contract.ts`
- Modify: `src/app/api/admin/catalogo/route.ts`
- Test: `scripts/cp031-catalog-list.test.mjs`

**Interfaces:**
- Add `GET /api/admin/catalogo` returning `{ items, page, pageSize, totalItems, totalPages, queues, facets }`.
- Accept `query`, `sku`, `name`, `category`, `categoryId`, `family`, `familyId`, `brand`, `brandId`, `publicationStatus`, `requiresReview`, `possibleDuplicate`, `confidence`, `sourceStatus`, `page`, `pageSize`.
- Preserve the current server page consumer by retaining `rows`, `total`, `page`, `pageSize`, `totalPages` as aliases in the service response until the frontend migrates.
- Each item adds `stock`, `media`, `publicationStatusLabel`, `reviewReason`, `duplicateDecision`, and existing source-identity fields without overwriting original values.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("catalog API exposes global queues, server pagination and real facets", () => {
  const source = fs.readFileSync("src/app/api/admin/catalogo/route.ts", "utf8");
  const service = fs.readFileSync("src/lib/admin-catalog.ts", "utf8");
  assert.match(source, /GET/);
  assert.match(source, /catalog\.product\.view/);
  assert.match(service, /totalItems|totalPages|queues|facets/);
  assert.doesNotMatch(service, /slice\(0,\s*12\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/cp031-catalog-list.test.mjs`

Expected: FAIL because the collection route is absent and the service does not expose `items`, queues or facets.

- [ ] **Step 3: Write minimal implementation**

Use one filtered base query for the page and one count query for `totalItems`; cap `pageSize` at 100 and normalize invalid page values to 1. Build queues from all products, not the current page, with `totalProducts`, `publishedProducts`, `draftProducts`, `hiddenProducts`, `reviewProducts`, `duplicateProducts`, `productsRequiringReview`, `totalBrands` and `totalCategories`. Build facets from active database categories/families/brands and distinct real product publication/source/confidence values.

Aggregate inventory in one grouped query by product and optional location, returning:

```ts
{ state: "AVAILABLE" | "LOW" | "ZERO" | "UNKNOWN"; onHand: number | null; reserved: number | null; available: number | null; minimum: number | null; locations: number }
```

Use `available = onHand - reserved`; use `UNKNOWN` only when no balance exists; use `ZERO` for available 0; use `LOW` when minimum exists and available is at or below minimum; otherwise `AVAILABLE`. Fetch active media usages in one query and return `{ primaryUrl, altText, assetId } | null` from the `product` entity usage with `slot=primary` first.

Map `sourceStatus` to `products.status`, `categoryId`/`familyId`/`brandId` to effective editorial-or-original IDs, and keep all source fields read-only in the response.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/cp031-catalog-list.test.mjs scripts/catalog-pagination.test.mjs scripts/catalog-filter-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-catalog.ts src/lib/catalog-admin-contract.ts src/app/api/admin/catalogo/route.ts scripts/cp031-catalog-list.test.mjs
git commit -m "feat(cp031): add paginated catalog API with stock and media"
```

### Task 6: Product creation and protected detail contract

**Files:**
- Create: `src/lib/catalog-product-service.ts`
- Modify: `src/app/api/admin/catalogo/route.ts`
- Modify: `src/app/api/admin/catalogo/[id]/route.ts`
- Modify: `src/lib/admin-catalog.ts`
- Test: `scripts/cp031-product-service.test.ts`

**Interfaces:**
- `POST /api/admin/catalogo` requires `catalog.product.create` and creates a manual product transactionally with `sourceStatus=MANUAL`, `publicationStatus=DRAFT`, validated taxonomy and an audit record.
- `GET /api/admin/catalogo/[id]` requires `catalog.product.view` and returns `sourceIdentity`, `editorialData`, `taxonomy`, `publication`, `duplicateInformation`, `stockSummary`, `media`, `pricing` and `auditHistory`.
- Price/cost/margin fields are `null` or omitted unless the actor has the existing pricing permission.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildManualProductInsert } from "@/lib/catalog-product-service";

test("manual product starts as DRAFT and does not overwrite imported identity", () => {
  const values = buildManualProductInsert({ sku: "MAN-001", commercialName: "Producto manual", categoryId: "cat", familyId: "fam", brandId: "brand" }, "actor-1");
  assert.equal(values.status, "MANUAL");
  assert.equal(values.publicationStatus, "draft");
  assert.equal(values.sku, "MAN-001");
  assert.equal(values.sourcePage, null);
  assert.equal(values.sourceRow, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/cp031-product-service.test.ts`

Expected: FAIL because the creation service does not exist.

- [ ] **Step 3: Write minimal implementation**

Validate SKU uniqueness, non-empty commercial name, existing category/family/brand IDs, family/category consistency and product type. Generate a slug only after uniqueness validation. Use a single transaction to insert the product and `PRODUCT_CREATED` audit. Reject any request field named `originalName`, `normalizedName`, `sourcePage`, `sourceRow` or imported taxonomy fields instead of silently accepting them. Detail loading must query source and editorial columns separately and return no hidden pricing data to unauthorized actors.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/cp031-product-service.test.ts scripts/cp030-audit-sanitization.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog-product-service.ts src/app/api/admin/catalogo/route.ts src/app/api/admin/catalogo/[id]/route.ts src/lib/admin-catalog.ts scripts/cp031-product-service.test.ts
git commit -m "feat(cp031): add safe product creation and detail"
```

### Task 7: Publication, duplicate and media mutation contracts

**Files:**
- Modify: `src/lib/publication-service.ts`
- Modify: `src/lib/duplicate-service.ts`
- Modify: `src/lib/media-repository.ts`
- Modify: `src/app/api/admin/catalogo/[id]/publication/route.ts`
- Modify: `src/app/api/admin/catalogo/[id]/duplicate/route.ts`
- Create: `src/app/api/admin/catalogo/[id]/media/route.ts`
- Test: `scripts/cp031-product-mutations.test.ts`

**Interfaces:**
- Publication transitions allowed exactly: `DRAFT -> REVIEW`, `REVIEW -> PUBLISHED`, `REVIEW -> DRAFT`, `PUBLISHED -> HIDDEN`, `HIDDEN -> PUBLISHED`.
- Duplicate decisions reject self-canonical references, cross-group references and cycles.
- Media operations preserve existing associations unless an explicit remove action is requested; primary/gallery ordering is transactional and audited.
- All mutations use `catalog.product.publish`, `catalog.product.review`, `catalog.product.edit` or `catalog.product.view` according to operation and preserve current route behavior.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionPublication, validateDuplicateDecision } from "@/lib/catalog-admin-contract";

test("publication transitions reject arbitrary jumps", () => {
  assert.equal(canTransitionPublication("draft", "published"), false);
  assert.equal(canTransitionPublication("review", "published"), true);
  assert.equal(canTransitionPublication("hidden", "published"), true);
});

test("duplicate canonical product cannot be itself", () => {
  assert.throws(() => validateDuplicateDecision({ productId: "p1", decision: "confirmed", canonicalProductId: "p1" }), /CATALOG_DUPLICATE_INVALID/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/cp031-product-mutations.test.ts`

Expected: FAIL because transition and duplicate validation are not exposed through the CP-031 contract.

- [ ] **Step 3: Write minimal implementation**

Add an explicit transition map and validate the current database state before update. Publishing must reject unresolved duplicates and failed required-field evaluation. Every mutation writes one of `PRODUCT_PUBLICATION_CHANGED`, `PRODUCT_DUPLICATE_REVIEWED`, `PRODUCT_MEDIA_ASSOCIATED` or `PRODUCT_MEDIA_REMOVED` with actor, timestamps, before and after values. Media association must verify the asset is active and the product exists, and use a unique transaction-safe ordering update.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/cp031-product-mutations.test.ts scripts/publication-governance.test.ts scripts/media-validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/publication-service.ts src/lib/duplicate-service.ts src/lib/media-repository.ts src/lib/catalog-admin-contract.ts src/app/api/admin/catalogo/[id]/publication/route.ts src/app/api/admin/catalogo/[id]/duplicate/route.ts src/app/api/admin/catalogo/[id]/media/route.ts scripts/cp031-product-mutations.test.ts
git commit -m "feat(cp031): harden product publication duplicate and media mutations"
```

### Task 8: Database indexes and migration verification

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/sales-schema.ts`
- Modify: `src/db/crm-schema.ts`
- Create: `drizzle/0019_cp031_dashboard_catalog_indexes.sql`
- Test: `scripts/cp031-migration.test.mjs`

**Interfaces:**
- Keep all existing columns and enum values.
- Add indexes only for filters and grouped reads used by CP-031: sales created/status, orders created/status/location, opportunities created/stage/seller, quotes created/workflow status, products editorial taxonomy/publication/review/confidence, media usages entity/slot, and inventory balances product/location.
- Migration must be additive and safe to run through the existing migration runner.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("CP-031 migration is additive and has dashboard/catalog indexes", () => {
  const migration = fs.readFileSync("drizzle/0019_cp031_dashboard_catalog_indexes.sql", "utf8");
  for (const name of ["sales_created_at", "orders_created_at", "opportunities_created_at", "products_editorial_taxonomy", "media_usages_entity_slot"]) assert.match(migration, new RegExp(name));
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/cp031-migration.test.mjs`

Expected: FAIL because migration `0019_cp031_dashboard_catalog_indexes.sql` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add matching Drizzle indexes and generate the SQL migration with `corepack pnpm db:generate`. Review the generated file, keep only additive `CREATE INDEX IF NOT EXISTS` statements, and register it with the existing migration metadata. Run the repository migration inspector against `.env.local` without printing `DATABASE_URL` or other secrets.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/cp031-migration.test.mjs scripts/database-migration-runner.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/sales-schema.ts src/db/crm-schema.ts drizzle/0019_cp031_dashboard_catalog_indexes.sql scripts/cp031-migration.test.mjs
git commit -m "perf(cp031): add dashboard and catalog query indexes"
```

### Task 9: Full CP-031 integration and RBAC regression tests

**Files:**
- Create: `scripts/cp031-dashboard.integration.test.ts`
- Create: `scripts/cp031-catalog.integration.test.ts`
- Create: `scripts/cp031-rbac.test.ts`
- Modify: `package.json`
- Modify: `scripts/test-all.mjs`

**Interfaces:**
- Tests cover empty dashboard, confirmed sales, custom range, combined filters, zero-filled series, export filters, global catalog counts, pagination, stock states, creation, identity protection, invalid publication, invalid duplicate, media and audit mutations.
- Add `test:cp031` that runs all CP-031 tests without changing `test:cp030`.

- [ ] **Step 1: Write the failing tests**

Create deterministic service-level fixtures using the repository's existing test database helpers. The assertions must include:

```ts
assert.equal(empty.salesSeries.length > 0, true);
assert.equal(empty.salesSeries.every((row) => row.total === 0), true);
assert.equal(withSale.salesRange.total, 125);
assert.equal(custom.range.from.toISOString(), "2026-08-01T05:00:00.000Z");
assert.equal(combined.filters.productId, productId);
assert.deepEqual(stockStates, ["UNKNOWN", "ZERO", "LOW", "AVAILABLE"]);
assert.equal(catalog.totalItems, 1348);
assert.equal(catalog.totalPages, Math.ceil(catalog.totalItems / catalog.pageSize));
assert.equal(created.sourceStatus, "MANUAL");
assert.equal(invalidPublication.code, "CATALOG_PUBLICATION_INVALID");
assert.equal(unauthorized.code, "CATALOG_FORBIDDEN");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `corepack pnpm exec tsx --test scripts/cp031-dashboard.integration.test.ts scripts/cp031-catalog.integration.test.ts scripts/cp031-rbac.test.ts`

Expected: FAIL only on not-yet-implemented CP-031 behaviors, with no failures caused by test discovery or missing fixture setup.

- [ ] **Step 3: Implement deterministic fixtures and complete the contracts**

Use isolated transaction fixtures or the existing database QA helpers. Do not mutate the imported 1,348-product inventory irreversibly. Roll back temporary records after each test, or use unique IDs and delete only records created by the test inside its transaction. Assert that audit records contain actor, entity, action, before and after values for every mutation.

- [ ] **Step 4: Run the specific suite**

Run: `corepack pnpm test:cp031`

Expected: all CP-031 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/cp031-dashboard.integration.test.ts scripts/cp031-catalog.integration.test.ts scripts/cp031-rbac.test.ts package.json scripts/test-all.mjs
git commit -m "test(cp031): cover dashboard catalog and RBAC production flows"
```

### Task 10: Final verification and handoff

**Files:**
- Modify: `docs/contracts/CP-031.md`
- Modify: `README.md` only if a new local API command or permission is needed

**Interfaces:**
- Document every added field, endpoint, permission and error code.
- Include response examples for `/api/admin/dashboard`, `/api/admin/dashboard/export` and `/api/admin/catalogo`.
- Document database facts that affect QA: current imported catalog count, publication state, absence of confirmed sales, missing cost sources and missing media.

- [ ] **Step 1: Run the complete verification set**

```bash
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
corepack pnpm test:cp030
corepack pnpm test:cp031
```

Expected: all commands exit with code 0. Lint may retain only the warning already documented as unrelated; no new errors or warnings are accepted.

- [ ] **Step 2: Run runtime smoke checks without exposing secrets**

```bash
corepack pnpm exec dotenv -e .env.local -- tsx -e "import { getOperationsDashboard } from './src/lib/operations-dashboard'; (async()=>{const d=await getOperationsDashboard({range:'month'}); console.log(JSON.stringify({points:d.salesSeries.length,previousPoints:d.previousSalesSeries.length,unknownStock:d.unknownStock,products:d.topProducts.length},null,2));})()"
curl.exe -sS -D - -o NUL http://localhost:3000/api/health
```

Expected: non-empty zero-filled series for an empty sales period, stable field names, a numeric `unknownStock`, and HTTP 200 from health. Do not print environment variables, tokens or connection strings.

- [ ] **Step 3: Review the diff for contract safety**

```bash
git diff --check
git status --short
```

Confirm no public UI component was deleted or redesigned, no stable Dashboard field was renamed, no source-identity column is writable from editorial input, and no secret appears in code, tests or documentation.

- [ ] **Step 4: Commit**

```bash
git add docs/contracts/CP-031.md README.md
git commit -m "docs(cp031): document dashboard and catalog backend contracts"
```

## Self-review against CP-031

- Dashboard filter parsing, `America/Lima` windows, all stable fields, complete current/previous series and explicit errors are covered by Tasks 1–3.
- Financial values, null safety and permission masking are covered by Task 3.
- Pipeline labels, category summary, product media, alert identifiers, activity labels and user labels are covered by Task 3.
- Export and filter parity are covered by Task 4.
- Global catalog queues, server pagination, all filters, facets, stock states and media are covered by Task 5.
- Manual creation, detail, publication transitions, duplicate validation, media lifecycle and audit are covered by Tasks 6–7.
- Indexes and additive migration are covered by Task 8.
- All required integration, RBAC, empty-data and mutation tests are covered by Task 9.
- TypeScript, lint, build, CP-030, CP-031 and runtime smoke checks are covered by Task 10.
- No task changes the public UI structure; frontend integration can consume the additive contracts later.
