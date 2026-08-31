# CP-032 Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/dashboard` to match the CP-032 mockup 1:1 visually while fixing real analytics bugs (active-order definition, pipeline lost/cancelled leakage, fake sparklines, export scope) and adding the missing panels (insights, pending actions, filters drawer) — all backed by real Postgres data, never invented numbers.

**Architecture:** Backend-first. A new `src/lib/dashboard-definitions.ts` centralizes the status/stage semantics the ticket demands (`isOpenQuoteStatus`, `isActiveOrderStatus`, `getPipelineMacroStage`, `stockState`), consumed by `src/lib/operations-dashboard.ts` (existing 325-line aggregation service, already timezone-correct and N+1-free — extend it, don't replace it) and two new pure modules (`dashboard-insights.ts`, `dashboard-pending-actions.ts`). Two new generic primitives (`AdminDrawer`, `AdminTooltip`) get built once and reused across every panel that needs them. `AdminDashboardView.tsx` (1318 lines, already has most of the skeleton: KPI cards, pipeline, top products, activity, error state) gets reworked panel-by-panel against the mockup, not rewritten from scratch.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Drizzle ORM + Neon Postgres, Tailwind v4, hand-rolled canvas charts (`AdminCharts.tsx` — no chart library in this repo, don't add one).

**Spec:** CP-032 ticket (pasted in conversation, not a repo file) + mockup image `c99d7624-4371-4f82-99a3-af881fd7a490.png` (referenced by the user as the 1:1 visual source of truth — get it from the user/conversation before starting Phase 3, it is not in the repo).

## Global Constraints

- Work directly on `main` (no `feat/coldpower-admin-redesign` branch — confirmed not to exist; user decided to work on `main` directly).
- This ticket is CP-032. The visual redesign of Productos (originally going to be "CP-031-Productos") does **not** exist yet in this repo and is **out of scope** here — if/when it happens it must be named CP-033+ to avoid colliding with the real, already-merged `docs/contracts/CP-031.md` (backend seed logic, commit `e0035ae`). Do not create any file/branch named CP-031 for this work.
- Never invent numbers: revenue, percentages, trends, forecasts, goals, sparkline shapes. If data can't be reconstructed, show `N/D` or "Sin base comparable" — never `0` as a stand-in for unknown, never a fake `↑ +X%`.
- Timezone for all day-bucketing: `America/Lima` (already correct in `operations-dashboard.ts` via `limaParts`/`startOfDay` — do not touch that logic, only extend it).
- Sales revenue = `sales.status = 'CONFIRMED'` only (already enforced in `salesConditions()` — do not weaken it).
- Never sum monetary values across different `currency` values. Every monetary aggregate must be currency-scoped.
- `previous === 0` → comparison is `null`/"Sin base comparable", never `+∞%` or `+999%` (already correct in `dashboardComparisons()` — reuse it, don't reinvent per-KPI).
- Snapshot metrics (cotizaciones abiertas, pedidos activos, stock crítico, acciones pendientes) show "Estado actual", never a fabricated vs.-previous-period trend line.
- No autorefresh faster than 60s; default is manual refresh only.
- RBAC: `dashboard.view` permission gate stays server-side (`requirePermission`/`requireApiPermission` in `src/lib/auth.ts`) — never hide data with CSS.
- Run before considering any task done: `corepack pnpm exec tsc --noEmit` and `corepack pnpm lint` must stay clean (0 new errors/warnings). Full verification suite (`corepack pnpm test:inventory`, the tsx test commands, `corepack pnpm build`) runs at the end of Phase 5 (Task 24) and must pass.
- Test convention in this repo: plain Node `node:test` files run via `corepack pnpm exec tsx --test <file>` (see `scripts/catalog-view-model.test.ts`), not Jest/Vitest. New unit test files go in `scripts/*.test.ts` following that pattern.

---

## Phase 1 — Backend: centralized definitions, bug fixes, currency safety

### Task 1: Central dashboard definitions module

**Files:**
- Create: `src/lib/dashboard-definitions.ts`
- Test: `scripts/dashboard-definitions.test.ts`

**Interfaces:**
- Produces: `isOpenQuoteStatus(workflowStatus: string | null | undefined): boolean`, `ACTIVE_ORDER_STATUSES: readonly string[]`, `isActiveOrderStatus(status: string): boolean`, `type PipelineMacroStage`, `PIPELINE_MACRO_STAGE_ORDER: PipelineMacroStage[]`, `PIPELINE_MACRO_STAGE_LABELS: Record<PipelineMacroStage,string>`, `getPipelineMacroStage(stage: string): PipelineMacroStage`, `type StockState`, `stockState(balance: {onHand:number; reserved:number; minimumStock: number|null} | null): StockState`. Later tasks import all of these — do not rename after this task.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/dashboard-definitions.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  isOpenQuoteStatus,
  isActiveOrderStatus,
  ACTIVE_ORDER_STATUSES,
  getPipelineMacroStage,
  PIPELINE_MACRO_STAGE_ORDER,
  stockState,
} from "../src/lib/dashboard-definitions";

test("isOpenQuoteStatus excludes terminal states only", () => {
  assert.equal(isOpenQuoteStatus("DRAFT"), true);
  assert.equal(isOpenQuoteStatus("FOLLOW_UP"), true);
  assert.equal(isOpenQuoteStatus("REJECTED"), false);
  assert.equal(isOpenQuoteStatus("EXPIRED"), false);
  assert.equal(isOpenQuoteStatus("CONVERTED"), false);
  assert.equal(isOpenQuoteStatus("CANCELLED"), false);
  assert.equal(isOpenQuoteStatus(null), true);
});

test("isActiveOrderStatus excludes DELIVERED and CANCELLED, nothing else", () => {
  const allStatuses = ["NEW","RECEIVED","PAYMENT_PENDING","PAID","PREPARING","READY","READY_FOR_PICKUP","IN_TRANSIT","SHIPPED","DELIVERED","CANCELLED"];
  const active = allStatuses.filter(isActiveOrderStatus);
  assert.deepEqual(active, ["NEW","RECEIVED","PAYMENT_PENDING","PAID","PREPARING","READY","READY_FOR_PICKUP","IN_TRANSIT","SHIPPED"]);
  assert.equal(ACTIVE_ORDER_STATUSES.includes("DELIVERED"), false);
  assert.equal(ACTIVE_ORDER_STATUSES.includes("CANCELLED"), false);
});

test("getPipelineMacroStage groups per CP-032 spec, lost/cancelled/no_response are PERDIDA", () => {
  assert.equal(getPipelineMacroStage("NEW"), "PROSPECCION");
  assert.equal(getPipelineMacroStage("CONTACTED"), "PROSPECCION");
  assert.equal(getPipelineMacroStage("QUOTING"), "COTIZACION");
  assert.equal(getPipelineMacroStage("QUOTE_SENT"), "COTIZACION");
  assert.equal(getPipelineMacroStage("FOLLOW_UP"), "SEGUIMIENTO");
  assert.equal(getPipelineMacroStage("NEGOTIATION"), "NEGOCIACION");
  assert.equal(getPipelineMacroStage("ACCEPTED"), "NEGOCIACION");
  assert.equal(getPipelineMacroStage("SALE"), "CIERRE");
  assert.equal(getPipelineMacroStage("PAYMENT_PENDING"), "CIERRE");
  assert.equal(getPipelineMacroStage("PAID"), "CIERRE");
  assert.equal(getPipelineMacroStage("PREPARING"), "CIERRE");
  assert.equal(getPipelineMacroStage("DELIVERED"), "CIERRE");
  assert.equal(getPipelineMacroStage("CLOSED"), "CIERRE");
  assert.equal(getPipelineMacroStage("LOST"), "PERDIDA");
  assert.equal(getPipelineMacroStage("CANCELLED"), "PERDIDA");
  assert.equal(getPipelineMacroStage("NO_RESPONSE"), "PERDIDA");
  assert.deepEqual(PIPELINE_MACRO_STAGE_ORDER, ["PROSPECCION","COTIZACION","SEGUIMIENTO","NEGOCIACION","CIERRE"]);
});

test("stockState: critical / no-stock / unknown / ok", () => {
  assert.equal(stockState(null), "UNKNOWN");
  assert.equal(stockState({ onHand: 0, reserved: 0, minimumStock: 5 }), "NO_STOCK");
  assert.equal(stockState({ onHand: 5, reserved: 0, minimumStock: 5 }), "CRITICAL");
  assert.equal(stockState({ onHand: 6, reserved: 0, minimumStock: 5 }), "OK");
  assert.equal(stockState({ onHand: 10, reserved: 0, minimumStock: null }), "OK");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/dashboard-definitions.test.ts`
Expected: FAIL — module `../src/lib/dashboard-definitions` not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/dashboard-definitions.ts
export const OPEN_QUOTE_EXCLUDED_STATUSES = ["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"] as const;

export function isOpenQuoteStatus(workflowStatus: string | null | undefined): boolean {
  if (!workflowStatus) return true;
  return !(OPEN_QUOTE_EXCLUDED_STATUSES as readonly string[]).includes(workflowStatus);
}

export const ACTIVE_ORDER_STATUSES = [
  "NEW", "RECEIVED", "PAYMENT_PENDING", "PAID", "PREPARING", "READY", "READY_FOR_PICKUP", "IN_TRANSIT", "SHIPPED",
] as const;

export function isActiveOrderStatus(status: string): boolean {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

export type PipelineMacroStage = "PROSPECCION" | "COTIZACION" | "SEGUIMIENTO" | "NEGOCIACION" | "CIERRE" | "PERDIDA";

const PIPELINE_MACRO_STAGE_MAP: Record<string, PipelineMacroStage> = {
  NEW: "PROSPECCION", CONTACTED: "PROSPECCION",
  QUOTING: "COTIZACION", QUOTE_SENT: "COTIZACION",
  FOLLOW_UP: "SEGUIMIENTO",
  NEGOTIATION: "NEGOCIACION", ACCEPTED: "NEGOCIACION",
  SALE: "CIERRE", PAYMENT_PENDING: "CIERRE", PAID: "CIERRE", PREPARING: "CIERRE", DELIVERED: "CIERRE", CLOSED: "CIERRE",
  LOST: "PERDIDA", CANCELLED: "PERDIDA", NO_RESPONSE: "PERDIDA",
};

export const PIPELINE_MACRO_STAGE_ORDER: PipelineMacroStage[] = ["PROSPECCION", "COTIZACION", "SEGUIMIENTO", "NEGOCIACION", "CIERRE"];

export const PIPELINE_MACRO_STAGE_LABELS: Record<PipelineMacroStage, string> = {
  PROSPECCION: "Prospección",
  COTIZACION: "Cotización",
  SEGUIMIENTO: "Seguimiento",
  NEGOCIACION: "Negociación",
  CIERRE: "Cierre ganado",
  PERDIDA: "Perdidas/canceladas",
};

export function getPipelineMacroStage(stage: string): PipelineMacroStage {
  return PIPELINE_MACRO_STAGE_MAP[stage] ?? "PERDIDA";
}

export type StockState = "CRITICAL" | "NO_STOCK" | "UNKNOWN" | "OK";

export function stockState(balance: { onHand: number; reserved: number; minimumStock: number | null } | null): StockState {
  if (!balance) return "UNKNOWN";
  const available = balance.onHand - balance.reserved;
  if (available <= 0) return "NO_STOCK";
  if (balance.minimumStock !== null && available <= balance.minimumStock) return "CRITICAL";
  return "OK";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/dashboard-definitions.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-definitions.ts scripts/dashboard-definitions.test.ts
git commit -m "feat(admin-dashboard): centralize open-quote, active-order, pipeline-macro-stage, stock-state definitions"
```

---

### Task 2: Fix `activeOrderCount` and pipeline lost/cancelled leakage in `operations-dashboard.ts`

Two real bugs confirmed by reading the current file:
- `activeOrderCount` (line 258) and `previousOrderTotals` (line 234) both use `status !== "CANCELLED"`, which **wrongly counts DELIVERED as active**. Ticket §30 requires excluding both DELIVERED and CANCELLED.
- `pipelineSummary` (line 250, built from the ungated `pipelineStages` query at line 227) currently includes **every** stage, including LOST/CANCELLED/NO_RESPONSE. Ticket §65 requires these excluded from the active pipeline panel.

**Files:**
- Modify: `src/lib/operations-dashboard.ts:200-298`

**Interfaces:**
- Consumes: `isActiveOrderStatus`, `getPipelineMacroStage`, `PIPELINE_MACRO_STAGE_ORDER`, `PIPELINE_MACRO_STAGE_LABELS` from `src/lib/dashboard-definitions.ts` (Task 1).
- Produces: `getOperationsDashboard()` return type gains `pipelineMacroSummary: Array<{macroStage, macroStageLabel, count, amount, share, stages: string[]}>`, `pipelineActiveTotal: {count, amount}`, `pipelineLostTotal: {count, amount}`. Existing `pipelineSummary` (raw per-stage, used for tooltip detail) stays unchanged in shape. Task 12 (Pipeline panel UI) consumes the new fields.

- [ ] **Step 1: Add the import**

```ts
// top of src/lib/operations-dashboard.ts, alongside existing imports
import { isActiveOrderStatus, getPipelineMacroStage, PIPELINE_MACRO_STAGE_ORDER, PIPELINE_MACRO_STAGE_LABELS } from "@/lib/dashboard-definitions";
```

- [ ] **Step 2: Fix the two order-count bugs**

Replace line 234:
```ts
db.select({ count: count() }).from(orders).where(and(...orderConditions(db, filters, previous), ne(orders.status, "CANCELLED"))),
```
with:
```ts
db.select({ status: orders.status, count: count() }).from(orders).where(and(...orderConditions(db, filters, previous))).groupBy(orders.status),
```
(so `previousOrderTotals` becomes a grouped row set, matching `ordersByStatus`'s shape, filtered the same way as the current-period count below).

Replace line 258:
```ts
const activeOrderCount = [...orderCounts.entries()].filter(([status]) => status !== "CANCELLED").reduce((sum, [, value]) => sum + value, 0);
```
with:
```ts
const activeOrderCount = [...orderCounts.entries()].filter(([status]) => isActiveOrderStatus(status)).reduce((sum, [, value]) => sum + value, 0);
const previousOrderMap = new Map(previousOrderTotals.map((row) => [row.status, Number(row.count)]));
const previousActiveOrderCount = [...previousOrderMap.entries()].filter(([status]) => isActiveOrderStatus(status)).reduce((sum, [, value]) => sum + value, 0);
```

Update the `comparisons` call (around line 262) to use `previousActiveOrderCount` instead of `Number(previousOrderTotals[0]?.count ?? 0)`:
```ts
orders: { current: activeOrderCount, previous: previousActiveOrderCount },
```

Note: the destructured `ne` import from drizzle-orm (line 2) may become unused after this change — check with `tsc --noEmit`/lint and remove it from the import list only if no other usage remains in the file.

- [ ] **Step 3: Add pipeline macro-stage grouping**

Insert right after the existing `const pipelineSummary = ...` line (line 250):

```ts
const activePipelineRows = pipelineSummary.filter((row) => getPipelineMacroStage(row.stage) !== "PERDIDA");
const lostPipelineRows = pipelineSummary.filter((row) => getPipelineMacroStage(row.stage) === "PERDIDA");
const pipelineActiveTotal = {
  count: activePipelineRows.reduce((sum, row) => sum + row.count, 0),
  amount: activePipelineRows.reduce((sum, row) => sum + row.amount, 0),
};
const pipelineLostTotal = {
  count: lostPipelineRows.reduce((sum, row) => sum + row.count, 0),
  amount: lostPipelineRows.reduce((sum, row) => sum + row.amount, 0),
};
const pipelineMacroSummary = PIPELINE_MACRO_STAGE_ORDER.map((macroStage) => {
  const rows = activePipelineRows.filter((row) => getPipelineMacroStage(row.stage) === macroStage);
  const amount = rows.reduce((sum, row) => sum + row.amount, 0);
  const count = rows.reduce((sum, row) => sum + row.count, 0);
  return {
    macroStage,
    macroStageLabel: PIPELINE_MACRO_STAGE_LABELS[macroStage],
    count,
    amount,
    share: pipelineActiveTotal.amount ? amount / pipelineActiveTotal.amount : 0,
    stages: rows.map((row) => row.stageCode),
  };
});
```

- [ ] **Step 4: Add the new fields to the return object**

In the `return { ... }` block (line 265 onward), add after the existing `pipelineSummary,` line:
```ts
pipelineMacroSummary,
pipelineActiveTotal,
pipelineLostTotal,
```

- [ ] **Step 5: Verify with TypeScript**

Run: `corepack pnpm exec tsc --noEmit`
Expected: no new errors. If `ne` import is now unused, remove it from the drizzle-orm import line.

- [ ] **Step 6: Manual verification query**

This function requires a live DB connection to unit-test end-to-end (it is not a pure function). Verification happens in Task 24's Playwright pass and in the QA report (Task 24) by comparing `/admin/dashboard` pipeline panel counts against a manual SQL query:
```sql
select stage, count(*), sum(total_amount) from opportunities where stage not in ('LOST','CANCELLED','NO_RESPONSE') group by stage;
```
Cross-check this matches `pipelineActiveTotal`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/operations-dashboard.ts
git commit -m "fix(admin-dashboard): exclude DELIVERED from active orders, exclude lost/cancelled from pipeline total"
```

---

### Task 3: Currency-safe aggregation

Real gap confirmed: `sales.currency`, `orders.currency`, `payments.currency` are `varchar(3) not null`; `opportunities.currency` is `varchar(3)` **nullable**. None of the current aggregate queries filter or group by currency — `sum(sales.total)` blindly mixes currencies if more than one is present.

**Files:**
- Modify: `src/lib/dashboard-contract.ts`
- Modify: `src/lib/operations-dashboard.ts`
- Test: `scripts/dashboard-contract.test.ts`

**Interfaces:**
- Produces: `DashboardFilters.currency?: string`; `parseDashboardFilters` accepts/echoes it; `getOperationsDashboard()` return type gains `currency: string | null`, `availableCurrencies: string[]`, `currencyAmbiguous: boolean`.

- [ ] **Step 1: Write the failing contract test**

```ts
// scripts/dashboard-contract.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseDashboardFilters, dashboardFiltersToQuery } from "../src/lib/dashboard-contract";

test("parseDashboardFilters reads currency", () => {
  const params = new URLSearchParams("range=month&currency=USD");
  const filters = parseDashboardFilters(params);
  assert.equal(filters.currency, "USD");
});

test("dashboardFiltersToQuery round-trips currency", () => {
  const query = dashboardFiltersToQuery({ range: "month", currency: "PEN" });
  assert.equal(query.get("currency"), "PEN");
});

test("parseDashboardFilters omits currency when absent", () => {
  const filters = parseDashboardFilters(new URLSearchParams("range=month"));
  assert.equal(filters.currency, undefined);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/dashboard-contract.test.ts`
Expected: FAIL — `filters.currency` is `undefined` vs expected `"USD"` (field doesn't exist yet).

- [ ] **Step 3: Add `currency` to the contract**

In `src/lib/dashboard-contract.ts`, add to the `DashboardFilters` type (after `orderStatus?: string;`):
```ts
  currency?: string;
```
In `parseDashboardFilters`, add to the returned object (after `orderStatus: readOptional(params, "orderStatus"),`):
```ts
    currency: readOptional(params, "currency"),
```
`dashboardFiltersToQuery` already iterates `Object.entries(filters)` generically — no change needed there.

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/dashboard-contract.test.ts`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Apply currency scoping in `operations-dashboard.ts`**

Add a currency-detection query and thread the resolved currency into every monetary condition builder. In `salesConditions`, `orderConditions`, and `opportunityConditions`, add an optional `currency` param and, when set, push `eq(sales.currency, currency)` / `eq(orders.currency, currency)` / `eq(opportunities.currency, currency)` respectively (guard the opportunities case since the column is nullable: only add the condition when a currency is resolved, do not push `eq(opportunities.currency, null)`).

Concretely, change each function signature:
```ts
function salesConditions(db: ReturnType<typeof getDb>, filters: DashboardFilters, window: Window, currency?: string) {
  const conditions = conditionList(eq(sales.status, "CONFIRMED"), gte(sales.createdAt, window.from), lt(sales.createdAt, window.to));
  if (currency) conditions.push(eq(sales.currency, currency));
  // ...unchanged rest
}
```
Do the same pattern for `orderConditions` (`eq(orders.currency, currency)`) and `opportunityConditions` (`eq(opportunities.currency, currency)`). Update every call site of these three functions inside `getOperationsDashboard` to pass the resolved currency (see next step) as the last argument.

In `getOperationsDashboard`, before the big `Promise.all`, add:
```ts
const currencyRows = await db.selectDistinct({ currency: sales.currency }).from(sales).where(and(eq(sales.status, "CONFIRMED"), gte(sales.createdAt, range.from), lt(sales.createdAt, range.to)));
const availableCurrencies = currencyRows.map((row) => row.currency).filter((value): value is string => Boolean(value)).sort();
const currencyAmbiguous = !filters.currency && availableCurrencies.length > 1;
const resolvedCurrency = filters.currency ?? (availableCurrencies.includes("PEN") ? "PEN" : availableCurrencies[0]) ?? undefined;
```
Pass `resolvedCurrency` as the extra argument everywhere `salesConditions(db, filters, ...)`, `orderConditions(db, filters, ...)`, and `opportunityConditions(db, filters, ...)` are called (including inside `salesMetric`, `salesSeries`, and the category/top-products/top-customers/top-sellers queries, all of which call these condition builders).

Add to the return object:
```ts
currency: resolvedCurrency ?? null,
availableCurrencies,
currencyAmbiguous,
```

- [ ] **Step 6: Verify with TypeScript**

Run: `corepack pnpm exec tsc --noEmit`
Expected: no new errors — every call site of the three condition-builder functions must be updated or TS will flag nothing (the new param is optional), so double check by grep: `grep -n "salesConditions(db, filters" src/lib/operations-dashboard.ts` and confirm each call passes the currency through where a `range`/`previous`/`today`/`month` window is used for a monetary aggregate.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard-contract.ts src/lib/operations-dashboard.ts scripts/dashboard-contract.test.ts
git commit -m "feat(admin-dashboard): scope all monetary aggregates to a single resolved currency"
```

---

### Task 4: KPI snapshot/comparison semantics + remove fake sparkline data source

Ticket §37 forbids fake sparkline trends; ticket §117-118 requires snapshot metrics (quotes/orders/stock) to say "Estado actual" instead of a fabricated vs.-previous-period percentage in the UI. The backend (`dashboardComparisons`) already returns `percentage: null` when `previous === 0`, which is correct — but it does **not** mark which metrics are snapshots at all (that's implicit knowledge the UI currently gets wrong by drawing a synthetic wave, see Task 14).

**Files:**
- Modify: `src/lib/operations-dashboard.ts`
- Test: extend `scripts/dashboard-definitions.test.ts` (or add `scripts/dashboard-kpis.test.ts` if the pure function below doesn't belong in `dashboard-definitions.ts`)

**Interfaces:**
- Produces: `buildKpiView(input): {sales, openQuotes, activeOrders, criticalStock}` where each entry is `{value: number, isSnapshot: boolean, comparison: {previous:number, absoluteDelta:number, relativeDelta:number|null, comparisonAvailable:boolean} | null}`. Task 14 (KPI cards UI) consumes this directly instead of re-deriving snapshot/comparison logic in JSX.

- [ ] **Step 1: Write the failing test**

```ts
// append to scripts/dashboard-definitions.test.ts
import { buildKpiView } from "../src/lib/dashboard-definitions";

test("buildKpiView marks sales as period metric with comparison, quotes/orders/stock as snapshot", () => {
  const view = buildKpiView({
    sales: { current: 206426, previous: 105000 },
    openQuotes: 52,
    activeOrders: 80,
    criticalStock: 4,
  });
  assert.equal(view.sales.isSnapshot, false);
  assert.equal(view.sales.comparison?.comparisonAvailable, true);
  assert.equal(view.openQuotes.isSnapshot, true);
  assert.equal(view.openQuotes.comparison, null);
  assert.equal(view.activeOrders.isSnapshot, true);
  assert.equal(view.criticalStock.isSnapshot, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/dashboard-definitions.test.ts`
Expected: FAIL — `buildKpiView` not exported.

- [ ] **Step 3: Implement in `src/lib/dashboard-definitions.ts`**

```ts
export type KpiComparison = { previous: number; absoluteDelta: number; relativeDelta: number | null; comparisonAvailable: boolean };
export type KpiView = { value: number; isSnapshot: boolean; comparison: KpiComparison | null };

function periodKpi(current: number, previous: number): KpiView {
  const comparisonAvailable = previous > 0 || current > 0;
  return {
    value: current,
    isSnapshot: false,
    comparison: {
      previous,
      absoluteDelta: current - previous,
      relativeDelta: previous === 0 ? null : ((current - previous) / previous) * 100,
      comparisonAvailable,
    },
  };
}

function snapshotKpi(value: number): KpiView {
  return { value, isSnapshot: true, comparison: null };
}

export function buildKpiView(input: { sales: { current: number; previous: number }; openQuotes: number; activeOrders: number; criticalStock: number }) {
  return {
    sales: periodKpi(input.sales.current, input.sales.previous),
    openQuotes: snapshotKpi(input.openQuotes),
    activeOrders: snapshotKpi(input.activeOrders),
    criticalStock: snapshotKpi(input.criticalStock),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/dashboard-definitions.test.ts`
Expected: PASS, all tests green including the new one.

- [ ] **Step 5: Wire into `getOperationsDashboard`**

Add near the `comparisons` computation in `src/lib/operations-dashboard.ts`:
```ts
import { buildKpiView } from "@/lib/dashboard-definitions"; // add to existing import line from Task 1/2

// after `comparisons` is computed:
const kpiView = buildKpiView({
  sales: { current: Number(salesRange.total), previous: previousSalesRange.total },
  openQuotes: Number(openQuotes[0]?.count ?? 0),
  activeOrders: activeOrderCount,
  criticalStock: Number(criticalStock[0]?.count ?? 0),
});
```
Add `kpiView,` to the return object. Keep the existing `comparisons` field for backward compatibility with any other current consumer (grep for `.comparisons` usage in `AdminDashboardView.tsx` before removing it — do not remove `comparisons` in this task, only add `kpiView` alongside it).

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard-definitions.ts src/lib/operations-dashboard.ts scripts/dashboard-definitions.test.ts
git commit -m "feat(admin-dashboard): formalize snapshot-vs-period KPI semantics"
```

---

### Task 5: Deterministic insights engine

Ticket §53-61: max 5 insights, ranked P0-P3, each with a real data source and a real CTA. No AI-generated copy, no invented percentages.

**Files:**
- Create: `src/lib/dashboard-insights.ts`
- Test: `scripts/dashboard-insights.test.ts`

**Interfaces:**
- Produces: `type Insight = {id:string; priority:"P0"|"P1"|"P2"|"P3"; icon:"warning"|"info"|"lightbulb"; title:string; description:string; ctaLabel:string; ctaHref:string}`, `buildInsights(input): Insight[]` (pure function, max 5, sorted by priority). Task 17 (Insights rail UI) renders this list as-is.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/dashboard-insights.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildInsights } from "../src/lib/dashboard-insights";

test("critical stock produces a P0 insight linking to inventory", () => {
  const insights = buildInsights({ criticalStock: 4, openQuotes: 0, ordersReadyToDispatch: 0, paymentsToVerify: 0, overdueFollowUps: 0, salesComparison: null });
  assert.equal(insights[0].priority, "P0");
  assert.match(insights[0].title, /4 productos con stock crítico/);
  assert.equal(insights[0].ctaHref, "/admin/inventario?critical=true");
});

test("zero signals returns the all-clear insight, never an empty array", () => {
  const insights = buildInsights({ criticalStock: 0, openQuotes: 0, ordersReadyToDispatch: 0, paymentsToVerify: 0, overdueFollowUps: 0, salesComparison: null });
  assert.equal(insights.length, 1);
  assert.match(insights[0].title, /Todo al día/);
});

test("never returns more than 5 insights, ordered P0 before P1 before P2 before P3", () => {
  const insights = buildInsights({ criticalStock: 4, openQuotes: 52, ordersReadyToDispatch: 11, paymentsToVerify: 6, overdueFollowUps: 8, salesComparison: { relativeDelta: 96.5, comparisonAvailable: true } });
  assert.ok(insights.length <= 5);
  const priorities = insights.map((i) => i.priority);
  assert.deepEqual(priorities, [...priorities].sort());
});

test("sales insight only appears when comparisonAvailable is true, and reflects sign", () => {
  const up = buildInsights({ criticalStock: 0, openQuotes: 0, ordersReadyToDispatch: 0, paymentsToVerify: 0, overdueFollowUps: 0, salesComparison: { relativeDelta: 96.5, comparisonAvailable: true } });
  assert.ok(up.some((i) => /crecimiento/.test(i.title)));
  const down = buildInsights({ criticalStock: 0, openQuotes: 0, ordersReadyToDispatch: 0, paymentsToVerify: 0, overdueFollowUps: 0, salesComparison: { relativeDelta: -12.4, comparisonAvailable: true } });
  assert.ok(down.some((i) => /debajo del período anterior/.test(i.title)));
  const none = buildInsights({ criticalStock: 0, openQuotes: 0, ordersReadyToDispatch: 0, paymentsToVerify: 0, overdueFollowUps: 0, salesComparison: { relativeDelta: null, comparisonAvailable: false } });
  assert.ok(!none.some((i) => /crecimiento|debajo del período/.test(i.title)));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/dashboard-insights.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/dashboard-insights.ts
export type InsightPriority = "P0" | "P1" | "P2" | "P3";
export type Insight = {
  id: string;
  priority: InsightPriority;
  icon: "warning" | "info" | "lightbulb";
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export type BuildInsightsInput = {
  criticalStock: number;
  openQuotes: number;
  ordersReadyToDispatch: number;
  paymentsToVerify: number;
  overdueFollowUps: number;
  salesComparison: { relativeDelta: number | null; comparisonAvailable: boolean } | null;
};

const priorityOrder: Record<InsightPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function buildInsights(input: BuildInsightsInput): Insight[] {
  const insights: Insight[] = [];

  if (input.criticalStock > 0) {
    insights.push({
      id: "critical-stock",
      priority: "P0",
      icon: "warning",
      title: `${input.criticalStock} producto${input.criticalStock === 1 ? "" : "s"} con stock crítico`,
      description: "Requieren atención inmediata.",
      ctaLabel: "Ver inventario",
      ctaHref: "/admin/inventario?critical=true",
    });
  }

  if (input.paymentsToVerify > 0) {
    insights.push({
      id: "payments-to-verify",
      priority: "P1",
      icon: "warning",
      title: `${input.paymentsToVerify} pago${input.paymentsToVerify === 1 ? "" : "s"} por verificar`,
      description: "Revisar comprobantes pendientes.",
      ctaLabel: "Ir a pagos",
      ctaHref: "/admin/pagos?status=UNDER_REVIEW",
    });
  }

  if (input.overdueFollowUps >= 5) {
    insights.push({
      id: "overdue-follow-ups",
      priority: "P1",
      icon: "warning",
      title: `${input.overdueFollowUps} seguimientos vencidos`,
      description: "Revisa seguimientos vencidos antes de abrir nuevas oportunidades.",
      ctaLabel: "Ver seguimientos",
      ctaHref: "/admin/crm?followups=overdue",
    });
  }

  if (input.ordersReadyToDispatch > 0) {
    insights.push({
      id: "orders-ready",
      priority: "P2",
      icon: "info",
      title: `${input.ordersReadyToDispatch} pedidos listos para despacho`,
      description: "Hay pedidos que pueden avanzar hoy.",
      ctaLabel: "Ir a pedidos",
      ctaHref: "/admin/pedidos?status=READY",
    });
  }

  if (input.openQuotes > 0) {
    insights.push({
      id: "open-quotes",
      priority: "P2",
      icon: "info",
      title: `${input.openQuotes} cotizaciones abiertas`,
      description: "Dar seguimiento puede mejorar la conversión.",
      ctaLabel: "Ir a cotizaciones",
      ctaHref: "/admin/cotizaciones?status=open",
    });
  }

  if (input.salesComparison?.comparisonAvailable && input.salesComparison.relativeDelta !== null) {
    const delta = input.salesComparison.relativeDelta;
    if (delta >= 0) {
      insights.push({
        id: "sales-trend",
        priority: "P3",
        icon: "info",
        title: "Ventas en crecimiento",
        description: `+${delta.toFixed(1)}% vs período anterior.`,
        ctaLabel: "Ver reporte",
        ctaHref: "/admin/reportes",
      });
    } else {
      insights.push({
        id: "sales-trend",
        priority: "P3",
        icon: "warning",
        title: "Ventas por debajo del período anterior",
        description: `${delta.toFixed(1)}%.`,
        ctaLabel: "Ver reporte",
        ctaHref: "/admin/reportes",
      });
    }
  }

  if (input.criticalStock > 0) {
    insights.push({
      id: "recommendation-stock",
      priority: "P3",
      icon: "lightbulb",
      title: "Recomendación",
      description: "Prioriza la reposición de productos con stock crítico.",
      ctaLabel: "Ver sugerencias",
      ctaHref: "/admin/inventario?critical=true",
    });
  } else if (input.overdueFollowUps >= 5) {
    insights.push({
      id: "recommendation-followups",
      priority: "P3",
      icon: "lightbulb",
      title: "Recomendación",
      description: "Revisa seguimientos vencidos antes de abrir nuevas oportunidades.",
      ctaLabel: "Ver seguimientos",
      ctaHref: "/admin/crm?followups=overdue",
    });
  }

  if (insights.length === 0) {
    return [{
      id: "all-clear",
      priority: "P3",
      icon: "info",
      title: "Todo al día",
      description: "No detectamos alertas operativas críticas.",
      ctaLabel: "Ver reporte",
      ctaHref: "/admin/reportes",
    }];
  }

  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `corepack pnpm exec tsx --test scripts/dashboard-insights.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Wire into `getOperationsDashboard`**

Add near the end of `src/lib/operations-dashboard.ts`, after `kpiView` (Task 4):
```ts
import { buildInsights } from "@/lib/dashboard-insights";
// ...
const ordersReadyToDispatch = orderCounts.get("READY") ?? 0;
const insights = buildInsights({
  criticalStock: Number(criticalStock[0]?.count ?? 0),
  openQuotes: Number(openQuotes[0]?.count ?? 0),
  ordersReadyToDispatch,
  paymentsToVerify: Number(pendingPayments[0]?.count ?? 0),
  overdueFollowUps: Number(overdueFollowUps[0]?.count ?? 0),
  salesComparison: kpiView.sales.comparison,
});
```
Add `insights,` to the return object.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard-insights.ts scripts/dashboard-insights.test.ts src/lib/operations-dashboard.ts
git commit -m "feat(admin-dashboard): deterministic insights engine, no AI-generated copy"
```

---

### Task 6: Pending actions aggregation

Reuses numbers `getOperationsDashboard` already computes; adds exactly one new query (orders needing confirmation) and one snapshot-scoped overdue-followups count (the existing `overdueFollowUps` is period-scoped by `createdAt`, which is wrong for a snapshot panel — a task created last month but still overdue today should count).

**Files:**
- Modify: `src/lib/operations-dashboard.ts`

**Interfaces:**
- Produces: `pendingActions: Array<{id:string; label:string; count:number; href:string}>` (5 entries max, ticket order: Pedidos por confirmar, Cotizaciones por enviar/seguir, Pagos por verificar, Productos que requieren revisión, Seguimientos vencidos).

- [ ] **Step 1: Add the new query**

Add to the big `Promise.all` array in `getOperationsDashboard` (alongside the other order/product queries):
```ts
db.select({ count: count() }).from(orders).where(and(...orderConditions(db, filters, range), inArray(orders.status, ["NEW", "RECEIVED"]))),
```
Name its destructured result `ordersNeedingConfirmation`. Also add a snapshot (non-period) overdue count:
```ts
db.select({ count: count() }).from(crmTasks).where(and(eq(crmTasks.status, "PENDING"), lt(crmTasks.dueAt, now), filters.sellerId ? eq(crmTasks.assignedTo, filters.sellerId) : undefined)),
```
Name its result `overdueFollowUpsSnapshot`. `productConditions`/`requiresReview` count already exists as `pendingApprovalsRows` (line 231) — reuse it, no new query needed.

- [ ] **Step 2: Assemble `pendingActions`**

After `insights` (Task 5), add:
```ts
const pendingActions = [
  { id: "orders-to-confirm", label: "Pedidos por confirmar", count: Number(ordersNeedingConfirmation[0]?.count ?? 0), href: "/admin/pedidos?status=NEW,RECEIVED" },
  { id: "quotes-to-follow-up", label: "Cotizaciones por enviar/seguir", count: Number(openQuotes[0]?.count ?? 0), href: "/admin/cotizaciones?status=open" },
  { id: "payments-to-verify", label: "Pagos por verificar", count: Number(pendingPayments[0]?.count ?? 0), href: "/admin/pagos?status=UNDER_REVIEW" },
  { id: "products-to-review", label: "Productos que requieren revisión", count: Number(pendingApprovalsRows[0]?.count ?? 0), href: "/admin/catalogo?requiresReview=true" },
  { id: "overdue-followups", label: "Seguimientos vencidos", count: Number(overdueFollowUpsSnapshot[0]?.count ?? 0), href: "/admin/crm?followups=overdue" },
];
```
Add `pendingActions,` to the return object.

- [ ] **Step 3: Verify with TypeScript**

Run: `corepack pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/operations-dashboard.ts
git commit -m "feat(admin-dashboard): assemble real pending-actions panel data"
```

---

### Task 7: Fix the export scope bug (UI only sends `range`)

Confirmed exact bug: `src/components/admin/AdminDashboardView.tsx` lines 127-138, the export `<a>`/button builds its href as `` `/api/admin/dashboard/export?range=${encodeURIComponent(range)}` ``, dropping every other active filter. The backend route (`src/app/api/admin/dashboard/export/route.ts`) already calls `parseDashboardFilters(new URL(request.url).searchParams)` — it's ready for the full contract, only the button is wrong.

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx:127-138`
- Test: `scripts/dashboard-export-href.test.ts`

**Interfaces:**
- Consumes: `dashboardFiltersToQuery` from `src/lib/dashboard-contract.ts` (already exists).

- [ ] **Step 1: Write the failing test (pure function, no DOM needed)**

```ts
// scripts/dashboard-export-href.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { dashboardFiltersToQuery } from "../src/lib/dashboard-contract";

test("export href preserves every active filter, not just range", () => {
  const query = dashboardFiltersToQuery({ range: "month", categoryId: "cat-1", sellerId: "seller-9" });
  const href = `/api/admin/dashboard/export?${query.toString()}`;
  assert.match(href, /range=month/);
  assert.match(href, /categoryId=cat-1/);
  assert.match(href, /sellerId=seller-9/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `corepack pnpm exec tsx --test scripts/dashboard-export-href.test.ts`
Expected: PASS already (this tests the existing, already-correct `dashboardFiltersToQuery`) — this step confirms the utility is sound; the bug is purely in the component not calling it. Note in the commit message that this test documents the contract the component must use.

- [ ] **Step 3: Fix the component**

Read `src/components/admin/AdminDashboardView.tsx` lines 100-150 to get the exact current `ExportButton` implementation before editing (props may differ slightly from a stale summary). Replace the href construction so it builds from the full `data.filters` object (the dashboard payload already echoes `filters` back per `operations-dashboard.ts:266`) via `dashboardFiltersToQuery`, e.g.:
```tsx
import { dashboardFiltersToQuery } from "@/lib/dashboard-contract";
// ...
function ExportButton({ filters }: { filters: DashboardFilters }) {
  const query = dashboardFiltersToQuery(filters);
  return (
    <a href={`/api/admin/dashboard/export?${query.toString()}`} /* ...keep existing classes/icon/label... */>
      Exportar reporte
    </a>
  );
}
```
Update the call site to pass `data.filters` instead of just `range`. Do not change the empty-export behavior (`dashboardHasExportableData` / `DASHBOARD_EMPTY` 404 in `src/lib/dashboard-export.ts` already implements ticket §19 correctly).

- [ ] **Step 4: Verify with TypeScript and lint**

Run: `corepack pnpm exec tsc --noEmit` and `corepack pnpm lint`
Expected: no new errors/warnings.

- [ ] **Step 5: Manual verification**

Start the dev server, apply a category + seller filter on `/admin/dashboard`, inspect the "Exportar reporte" link's `href` in devtools, confirm it contains `categoryId=` and `sellerId=` alongside `range=`.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx scripts/dashboard-export-href.test.ts
git commit -m "fix(admin-dashboard): export button now sends the full active filter set, not just range"
```

---

### Task 8: Notifications bell — real unread count

Confirmed: a real notifications system exists (`src/lib/notifications-service.ts`, `getNotificationsPage(recipientId, filters)` returns a real `unreadCount`). `AdminShell.tsx` (`src/components/admin/AdminShell.tsx:264-270`) renders the bell with zero badge — not a stub to build, just needs wiring.

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`
- Modify: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `getNotificationsPage(recipientId, filters)` from `src/lib/notifications-service.ts` — read its exact signature/return shape before wiring (the `unreadCount` field name is confirmed to exist; page-size/filter param names need a quick check since they weren't read verbatim in research).
- Produces: `AdminShellProps` gains `unreadNotificationsCount?: number`.

- [ ] **Step 1: Read the notifications service signature**

Read `src/lib/notifications-service.ts` in full before writing the call site — confirm exact parameter names for `getNotificationsPage` and whether a lighter dedicated "count only" function exists or must be reused with `pageSize: 1`.

- [ ] **Step 2: Add the prop to `AdminShell`**

In `src/components/admin/AdminShell.tsx`, add `unreadNotificationsCount?: number;` to `AdminShellProps` (line 57-63) and destructure it in the function signature (line 97-103). Replace the bell `<Link>` block (lines 264-270) with a version that renders a badge when the count is truthy:
```tsx
<Link
  href="/admin/notificaciones"
  className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#173654] transition hover:bg-[#f4f7fa]"
  aria-label="Ver notificaciones"
>
  <Bell className="h-[19px] w-[19px]" strokeWidth={1.8} aria-hidden="true" />
  {unreadNotificationsCount ? (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-semibold text-white">
      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
    </span>
  ) : null}
</Link>
```

- [ ] **Step 3: Fetch the count in the layout and pass it down**

In `src/app/admin/layout.tsx`, after `const actor = await requireAdmin();`, fetch the count and pass it to `<AdminShell>`:
```ts
import { getNotificationsPage } from "@/lib/notifications-service"; // adjust to the exact signature confirmed in Step 1
// ...
const notifications = actor.userId ? await getNotificationsPage(actor.userId, { pageSize: 1 }) : null;
// ...
<AdminShell role={role} links={links} unreadNotificationsCount={notifications?.unreadCount ?? 0}>
```
This runs once per admin page load (all admin pages share this layout) — if `getNotificationsPage` is expensive, wrap with `withRuntimeCache` (already used elsewhere in this codebase, e.g. `operations-dashboard.ts:307`) keyed per-user with a short TTL (a few seconds) rather than leaving it uncached, to avoid regressing the recent dashboard perf work (see prior session notes on Neon pool/TTFB).

- [ ] **Step 4: Verify with TypeScript**

Run: `corepack pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Load `/admin` as SUPERADMIN with at least one unread notification in the DB; confirm the badge renders with the correct count and disappears when count is 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminShell.tsx src/app/admin/layout.tsx
git commit -m "feat(admin-shell): wire real unread notification count into the bell badge"
```

---

## Phase 2 — Shared primitives

### Task 9: `AdminDrawer` — generic slide-over panel

No drawer component exists anywhere under `src/components/admin` (confirmed by grep). This is the shared primitive for the filters drawer (Task 11) and the pending-actions drawer (Task 18).

**Files:**
- Create: `src/components/admin/AdminDrawer.tsx`

**Interfaces:**
- Produces: `AdminDrawer({open, onClose, title, children, footer?}: {open:boolean; onClose:()=>void; title:string; children:ReactNode; footer?:ReactNode})`. Tasks 11 and 18 import this.

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function AdminDrawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e3ebf2] px-5 py-4">
          <h2 className="text-base font-semibold text-[#173654]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5b7186] hover:bg-[#f4f7fa]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-[#e3ebf2] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with TypeScript and lint**

Run: `corepack pnpm exec tsc --noEmit` and `corepack pnpm lint`
Expected: no errors. Confirm `lucide-react`'s `X` icon import matches how other icons are imported elsewhere in `AdminShell.tsx` (same package, same import style).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminDrawer.tsx
git commit -m "feat(admin): add reusable AdminDrawer primitive"
```

---

### Task 10: `AdminTooltip` — accessible info tooltip

No tooltip component exists (confirmed by grep). Needed for KPI info icons (ticket §133), pipeline tooltip (§134), stock tooltip (§135), chart tooltip (§47 — that one is canvas-based, handled separately in Task 15).

**Files:**
- Create: `src/components/admin/AdminTooltip.tsx`

**Interfaces:**
- Produces: `AdminTooltip({label, children}: {label: string; children: ReactNode})` — wraps a trigger element (typically an info icon button) and shows `label` on hover/focus.

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useId, useState, type ReactNode } from "react";

export function AdminTooltip({ label, children }: { label: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center">
      <span
        tabIndex={0}
        aria-describedby={tooltipId}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="inline-flex cursor-help"
      >
        {children}
      </span>
      {visible ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-40 mb-2 w-64 -translate-x-1/2 rounded-md bg-[#173654] px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 2: Verify with TypeScript and lint**

Run: `corepack pnpm exec tsc --noEmit` and `corepack pnpm lint`

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminTooltip.tsx
git commit -m "feat(admin): add reusable AdminTooltip primitive"
```

---

## Phase 3 — UI rebuild against the mockup

**Before starting this phase:** get the mockup image (`c99d7624-4371-4f82-99a3-af881fd7a490.png`, referenced in the ticket) accessible in the working environment for pixel-level comparison at 1440px width — the ticket is explicit that "inspired by" is not acceptable, it must be a close visual match. Every task below cites the current `AdminDashboardView.tsx` structures being replaced/extended (1318 lines — read the specific line range cited before editing, since exact line numbers may drift as earlier tasks touch the file).

### Task 11: Dynamic greeting + role-based subtitle

**Files:**
- Modify: `src/app/admin/page.tsx` (actor name is already fetched here per research: line 28, 36-37, via a plain `users` table query)
- Modify: `src/components/admin/AdminDashboardView.tsx` (header section)

- [ ] **Step 1** Confirm the actor-name fetch in `src/app/admin/page.tsx` returns `name ?? email`; if `name` is null, ticket §5 requires falling back to `"Bienvenido 👋"` (no name at all) rather than showing an email as a greeting — adjust the fallback logic there if it currently falls back to email.

- [ ] **Step 2** Pass `actorName: string | null` and `role` into `AdminDashboardView`. Render:
```tsx
<h1>{actorName ? `Bienvenido${actorName.endsWith("a") ? "" : ""}, ${actorName} 👋` : "Bienvenido 👋"}</h1>
```
(Do not attempt automatic gender inflection of "Bienvenido/Bienvenida" from the name — ticket's example shows both forms but gives no reliable signal to pick between them from a name string; keep "Bienvenido" invariant unless the codebase already has a stored gender/pronoun field on `users`, which research did not find. Note this as a documented simplification in the QA report, Task 24.)

- [ ] **Step 3** Subtitle by role:
```tsx
const subtitle = role === "SUPERADMIN" ? "Resumen operativo de la plataforma ColdPower" : role === "GERENCIA" ? "Resumen ejecutivo del negocio" : "Resumen operativo";
```

- [ ] **Step 4: Manual verification** — log in as SUPERADMIN and as a GERENCIA-mapped role, confirm both subtitle variants render, confirm a user with `name = null` shows "Bienvenido 👋" not their email.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): dynamic greeting and role-based subtitle"
```

---

### Task 12: Filters drawer (location/seller/customer/product/category/family/brand/channel/orderStatus + currency)

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`

**Interfaces:**
- Consumes: `AdminDrawer` (Task 9), `listReportOptions()` from `src/lib/operations-dashboard.ts:300` (already returns locations/sellers/customers/products/categories/families/brands — reuse this instead of new queries), `parseDashboardFilters`/`dashboardFiltersToQuery` (Task 3 adds `currency`).

- [ ] **Step 1** Replace the current inline `DashboardRangePicker` form (range-only, no drawer) with: the date/preset controls staying inline in the header (Task 13 handles those), plus a new "Aplicar filtros" button that opens an `AdminDrawer` titled "Filtros del dashboard" containing selects for: Local, Vendedor, Cliente, Producto, Categoría, Familia, Marca, Canal, Estado de pedido, Moneda (when `availableCurrencies.length > 1`, per Task 3).

- [ ] **Step 2** Category → Family dependency: when `categoryId` changes, filter the Family select's options to `families` rows where `family.categoryId === categoryId` (the `listReportOptions()` family rows don't carry `categoryId` today — check `src/lib/operations-dashboard.ts:316-318`; if the `families` query doesn't select `categoryId`, add it: `db.select({ id: families.id, name: families.name, categoryId: families.categoryId })...`). If the currently-selected `familyId` doesn't belong to the newly-selected category, clear it.

- [ ] **Step 3** On "Aplicar filtros" submit, build the next URL via `dashboardFiltersToQuery({...currentFilters, ...formValues})` and navigate with `router.push` (client-side navigation, preserves scroll, triggers server refetch via the page's server component reading `searchParams`).

- [ ] **Step 4** Channel select options are the fixed list from `opportunity_origin`: `WEB→Web, WHATSAPP→WhatsApp, TELEFONO→Teléfono, LOCAL→Local, REFERIDO→Referido, CLIENTE_RECURRENTE→Cliente recurrente, OTRO→Otro` (verbatim enum, confirmed in `src/db/crm-schema.ts:20`).

- [ ] **Step 5: Manual verification** — apply a category filter, confirm family options narrow; apply several filters, confirm the URL reflects them; refresh the page, confirm the drawer's form re-populates from `searchParams`.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx src/lib/operations-dashboard.ts
git commit -m "feat(admin-dashboard): add filters drawer wired to full query-param contract"
```

---

### Task 13: Date range control, preset select, active-filter chips, filter count badge

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`

- [ ] **Step 1** Split the current single range form into two controls per ticket §8-9: a calendar control showing the effective range (e.g. "1 ago – 31 ago 2026") that opens a date picker supporting `today/yesterday/week/month/custom`, and a separate preset `<select>` for the same five values as a shorthand. Both write to the same `range`/`from`/`to` query params — do not let them represent independent state that can desync.

- [ ] **Step 2** When `range=custom`, show "Desde"/"Hasta" date inputs; validate `from <= to` client-side before navigating (the server already validates this in `parseDashboardFilters` and throws `DashboardInvalidFilterError` — surface that as a form error rather than a 500).

- [ ] **Step 3** Active-filter chips: render one chip per non-`range` filter present in `data.filters` (e.g. "Local: Lima ×"), each `×` removing only that key from the query string and navigating.

- [ ] **Step 4** Filter count badge on the "Aplicar filtros" button: count keys in `data.filters` excluding `range`/`from`/`to` (per ticket §16, range doesn't count as an advanced filter).

- [ ] **Step 5: Manual verification** — set 3 filters, confirm badge shows "3"; remove one via its chip's `×`, confirm badge updates to "2" and the URL drops that key.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): split date/preset controls, add filter chips and count badge"
```

---

### Task 14: Rebuild the 4 KPI cards

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx` (current `MetricCard`/`comparisonSparkline` — the latter, lines ~167-179 per research, synthesizes a fake wave for quotes/orders/stock and **must be deleted**, not adjusted)

**Interfaces:**
- Consumes: `data.kpiView` (Task 4), `data.insights`/`data.pipelineActiveTotal` for click-through hrefs where relevant, `AdminTooltip` (Task 10).

- [ ] **Step 1** Delete the `comparisonSparkline` fake-wave generator entirely. Sales KPI keeps its real sparkline (`data.salesSeries`, already real daily data). Quotes/Orders/Stock KPIs render **no sparkline** (an empty/neutral placeholder area at most, never a drawn line) since no real per-day snapshot history is persisted for these — this is a deliberate ticket §37 requirement, not a temporary gap to "fix" by inventing history.

- [ ] **Step 2** Card order and colors (ticket §20, §38, exact): 1. Ventas del período — blue. 2. Cotizaciones abiertas — orange. 3. Pedidos activos — green. 4. Stock crítico — red.

- [ ] **Step 3** Sales card: value from `data.kpiView.sales.value`, delta from `data.kpiView.sales.comparison` — render `${relativeDelta.toFixed(1)}%` with an up/down arrow colored green/red by sign, or "Sin base comparable" when `comparisonAvailable` is false. Label reads "Ventas del mes" when `range === "month"` (ticket §20 exact wording), otherwise "Ventas del período".

- [ ] **Step 4** Quotes/Orders/Stock cards: value from `data.kpiView.{openQuotes,activeOrders,criticalStock}.value`, context text reads "Estado actual" (not a fake percentage), each card is a `<Link>` to its ticket-specified destination: quotes → `/admin/cotizaciones?status=open`, orders → `/admin/pedidos?status=active`, stock → `/admin/inventario?critical=true`.

- [ ] **Step 5** Stock card semantics: an increase in critical-stock count is bad — if a "vs. previous" number is ever shown for stock in the future (it currently is not, per Task 4's snapshot rule), it must never auto-color "up = green"; hardcode stock's color logic as "more critical stock = red" if this is revisited. For now, since stock is snapshot-only, this is moot — just don't accidentally reuse the sales card's green-up/red-down component for the stock card's static "Estado actual" text.

- [ ] **Step 6** Add an `AdminTooltip` info icon next to each KPI title with the exact copy from ticket §133 (sales) and equivalent one-sentence definitions for the other three (state the filter/status/formula in one sentence, per ticket §159-160).

- [ ] **Step 7: Manual verification** — confirm no card shows a sparkline except Sales; confirm clicking each card navigates correctly; confirm sales delta color follows sign, others show "Estado actual".

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): rebuild KPI cards, remove fake sparklines, add snapshot labeling"
```

---

### Task 15: Sales evolution chart — real tooltip, granularity, click-through, empty state

**Files:**
- Modify: `src/components/admin/AdminCharts.tsx` (canvas-based `AdminLineChart` — no chart library in this repo, extend the canvas component rather than introducing recharts/visx)
- Modify: `src/components/admin/AdminChartsLazy.tsx` (lazy wrapper, adjust the props passthrough if the signature changes)
- Modify: `src/lib/operations-dashboard.ts` (granularity-aware bucketing)
- Modify: `src/components/admin/AdminDashboardView.tsx` (wire the granularity `<select>` — currently UI-only/button-theater per research, must become real)

- [ ] **Step 1** Backend granularity: extend `salesSeries`/`fillSalesSeries` to accept a `granularity: "hour"|"day"|"week"|"month"` parameter, chosen server-side by range length per ticket §43 (today/yesterday → hour if `range` is exactly one day; week/month/custom≤60d → day; custom 61-365d → week; custom>365d → month). Add a `resolveGranularity(window: Window): Granularity` pure helper (unit-testable without DB — add to `src/lib/dashboard-definitions.ts` and cover with a test in `scripts/dashboard-definitions.test.ts` mirroring Task 1's TDD pattern: assert day-length windows map to "day", ~90-day windows map to "week", etc.). Wire the granularity `<select>` in the UI to a `granularity` query param that, when present and valid for the current range, overrides the auto-resolved value.

- [ ] **Step 2** Real tooltip on the canvas chart: since `<canvas>` has no native hover targets, add an invisible absolutely-positioned overlay of per-point `<button>`/`<div>` hit targets sized to the chart's plotted width divided by point count, each firing `onMouseEnter`/`onFocus` to show an `AdminTooltip`-style popover (or a bespoke small popover matching ticket §47's layout: date, ventas, ventas confirmadas count, unidades, período anterior — only the fields that exist in `SalesSeriesPoint` today: `date`, `total`, `count`, `orders`, `units`). Do not add a charting library — the overlay-over-canvas pattern keeps the existing rendering.

- [ ] **Step 3** Click-through: same overlay's `onClick` navigates to `/admin/ventas?date=<point.date>`.

- [ ] **Step 4** Empty state: when `data.salesSeries` is entirely zero-valued (no confirmed sales in the period), do not draw a flat line — render the ticket §51 copy block ("Aún no hay ventas confirmadas en este período...") with a "Revisar cotizaciones" link to `/admin/cotizaciones`, replacing the chart area entirely.

- [ ] **Step 5: Manual verification** — confirm hovering a point shows real values matching the tooltip fields available; confirm clicking navigates; confirm switching granularity (where the current range supports more than one option) changes the bucket count; confirm a date range with zero sales shows the empty state, not a flat zero line.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminCharts.tsx src/components/admin/AdminChartsLazy.tsx src/lib/operations-dashboard.ts src/lib/dashboard-definitions.ts src/components/admin/AdminDashboardView.tsx scripts/dashboard-definitions.test.ts
git commit -m "feat(admin-dashboard): real chart tooltip, working granularity selector, click-through, honest empty state"
```

---

### Task 16: Pipeline panel — macro-stage bars, participation, total, tooltip

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx` (current `PipelinePanel`/`GerenciaPipelineRows`/`superadminStageGroups` — the existing macro-grouping differs from the ticket spec and must be replaced with `data.pipelineMacroSummary` from Task 2, not a locally-redefined grouping)

**Interfaces:**
- Consumes: `data.pipelineMacroSummary`, `data.pipelineActiveTotal`, `data.pipelineLostTotal` (Task 2), `AdminTooltip` (Task 10).

- [ ] **Step 1** Delete the local `superadminStageGroups` constant and any other hardcoded macro-stage list in this file — the only source of truth for macro-stage grouping is `getPipelineMacroStage`/`data.pipelineMacroSummary` from the backend (Task 1/2). Two definitions of the same grouping in two places is exactly the duplication ticket §158 forbids.

- [ ] **Step 2** Render one row per `data.pipelineMacroSummary` entry (already in ticket §64 order: Prospección, Cotización, Seguimiento, Negociación, Cierre ganado): bar width = `row.share * 100%` (participation over active pipeline total, ticket §67's recommended definition — document this choice in the QA report, Task 24), then `count` and formatted `amount` (respecting `data.currency`, Task 3 — never render a bare number without a currency symbol).

- [ ] **Step 3** Total row: "Total pipeline" = `data.pipelineActiveTotal.count` / formatted `data.pipelineActiveTotal.amount`.

- [ ] **Step 4** Below the bars (not inside them), a small line: `Perdidas/canceladas: {data.pipelineLostTotal.count}` — ticket §65 explicitly keeps these out of the bars/total but allows a below-the-fold mention.

- [ ] **Step 5** Row click → `/admin/crm?stage=<comma-joined stage codes for that macro-stage>` (the `stages` array is already on each `pipelineMacroSummary` entry).

- [ ] **Step 6** `AdminTooltip` per row with ticket §72 format: count, amount, share%, and the list of raw stage labels (`pipelineLabels` map already exists in `operations-dashboard.ts:94`, exposed via the existing `pipelineSummary` field — filter it by macro-stage to get the raw-stage breakdown for the tooltip).

- [ ] **Step 7: Manual verification** — confirm bar widths sum sensibly (no bar wider than "Cierre ganado" implies more than 100% share); confirm LOST/CANCELLED/NO_RESPONSE opportunities never appear in a bar or the total; confirm clicking a row navigates with the right stage filter.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): rebuild pipeline panel on centralized macro-stage grouping"
```

---

### Task 17: Insights & recommendations rail

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`

**Interfaces:**
- Consumes: `data.insights` (Task 5).

- [ ] **Step 1** Render up to 5 cards from `data.insights` in the order the array already provides (pre-sorted P0→P3 by `buildInsights`). Icon per `insight.icon` (warning/info/lightbulb), title, description, and a text CTA linking to `insight.ctaHref` with `insight.ctaLabel` — never a generic "Ver más".

- [ ] **Step 2** No client-side re-sorting or filtering of this list — the ordering and 5-item cap are already enforced server-side (Task 5); the UI's only job is to render it faithfully.

- [ ] **Step 3: Manual verification** — with 0 alerts present, confirm the "Todo al día" single card renders (never an empty panel); with several signals present, confirm exactly the mockup's card style (colored left border or icon bubble per severity).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): insights and alerts rail"
```

---

### Task 18: Pending actions rail + drawer

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`

**Interfaces:**
- Consumes: `data.pendingActions` (Task 6), `AdminDrawer` (Task 9).

- [ ] **Step 1** Render the 5 `data.pendingActions` rows with an icon, label, count, each row a `<Link>` to its `href`.

- [ ] **Step 2** "Ir al panel de pendientes" button opens an `AdminDrawer` titled "Pendientes de ColdPower" re-listing the same 5 categories with slightly more detail (this repo has no unified pendings module — per ticket §76, a drawer grouping the same real data is the correct fallback, not a new page).

- [ ] **Step 3: Manual verification** — confirm every row and the drawer button navigate to real, working routes (no "próximamente" placeholders — ticket §122 forbids button theater).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): pending actions rail and drawer"
```

---

### Task 19: Top products panel polish

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx` (`TopProductsPanel` already exists and is largely correct — `topProducts` query in `operations-dashboard.ts:221` already ranks by `revenue DESC LIMIT 5` with batched media via `getPublishedMediaForEntities`, no N+1)

- [ ] **Step 1** Confirm columns match ticket §82 exactly: #, Producto (image + name + category), Ventas (units), Ingresos (revenue), Tendencia.

- [ ] **Step 2** Tendencia sparkline: only render if a real per-product daily revenue series can be cheaply derived. Check whether adding this requires a new per-product-per-day query (it does — `saleItems` grouped by product+day is not currently computed). Given ticket §84 explicitly permits omitting the sparkline honestly when history can't be cheaply reconstructed, and adding a 6th query per top-product would reintroduce N+1-adjacent cost the codebase's perf work just fixed (see prior session notes on the 35-query Promise.all), **do not add a per-product daily-series query in this task**. Instead render a neutral "sin tendencia suficiente" indicator or omit the column's sparkline glyph, and note this decision explicitly in the QA report (Task 24) as a documented simplification, not a silent gap.

- [ ] **Step 3** Click-through: since no shared Product Detail Drawer exists yet in this codebase (confirmed — that's part of the not-yet-built CP-033 Productos redesign), use the ticket's stated fallback: `/admin/catalogo?query=<SKU>`.

- [ ] **Step 4: Manual verification** — confirm no fabricated sparkline values render; confirm click navigates to the catalog filtered by SKU.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "polish(admin-dashboard): top products panel, honest trend indicator, catalog click-through"
```

---

### Task 20: Activity panel — click-through and color audit

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx` (`ActivityPanel` already resolves actor names and translates action codes correctly per `operations-dashboard.ts:257` — this task only adds click-through and confirms color-by-domain, not a rewrite)

- [ ] **Step 1** Confirm `activityTone` mapping matches ticket §91 (pedido=green, cotización=blue, pago=teal/green, producto=orange, error=red, usuario=purple) — research flagged the current heuristic is string-matching on translated labels, which is fragile; if it already produces correct colors for the `entityType` values actually present (`product`, `order`, `quote`, `opportunity`, `user`, `payment`, `customer`, `inventory`, `company_settings` per the `entityLabels` map in `operations-dashboard.ts:97`), leave the mechanism as-is and only fix cases where the color is wrong — don't rewrite a working heuristic for its own sake.

- [ ] **Step 2** Click-through per entity type where a real route exists: order → `/admin/pedidos?...`, quote → `/admin/cotizaciones?...`, product → `/admin/catalogo?query=<sku or id>`, customer → `/admin/crm?view=clientes&...`. Where no per-entity deep link is feasible without new lookups, leave the row non-clickable rather than linking to a generic list — don't fake a working link.

- [ ] **Step 3: Manual verification** — confirm no raw actor/entity IDs appear as primary text (already correct per research — verify it stayed correct after any edits); confirm click-through works for at least orders and quotes.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "polish(admin-dashboard): activity panel click-through"
```

---

### Task 21: Footer — last-updated timestamp and manual refresh

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`

- [ ] **Step 1** Render `Última actualización: <formatted actual load time>` using the real render time (e.g. `new Date().toLocaleString("es-PE", {timeZone:"America/Lima", ...})` computed server-side when the page renders, not a client `Date.now()` that would drift from actual data freshness).

- [ ] **Step 2** Refresh button triggers `router.refresh()` (Next.js App Router server-component revalidation) — not a full page reload, not a client-only re-fetch of stale cached data.

- [ ] **Step 3** Confirm no `setInterval` auto-refresh exists anywhere in this file; if one is added later it must be ≥60000ms per ticket §103 — for this ticket, ship manual-only.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): last-updated timestamp and manual refresh"
```

---

### Task 22: Loading skeleton + partial-failure isolation

**Files:**
- Modify: `src/app/admin/loading.tsx` (currently a generic 4-KPI + 1 chart + 2 boxes skeleton — doesn't reflect the new 7-section layout)
- Modify: `src/components/admin/AdminDashboardView.tsx` or `src/app/admin/page.tsx` (whichever currently assembles the full `getOperationsDashboard()` call — for partial-failure isolation)

- [ ] **Step 1** Rewrite `src/app/admin/loading.tsx` to mirror the real layout: header bar, 4 KPI cards, chart+rail 75/25 grid, pipeline panel, pending-actions rail, top-products panel, activity rail — same skeleton block pattern already used (`animate-pulse` divs), just resized/repositioned to match, per ticket §109.

- [ ] **Step 2** Partial-failure isolation (ticket §111): if `recentActivity`'s query specifically fails while the rest of `getOperationsDashboard`'s `Promise.all` succeeds, the whole page should not go to the full error state. Since all ~35 queries are currently in one `Promise.all` (an all-or-nothing failure unit per `operations-dashboard.ts:200`), achieving true partial isolation would mean pulling `recentActivity` out into its own `Promise.allSettled`-wrapped call, which is a bigger architectural change than this ticket's other tasks. Scope this task to the minimum honest version: wrap the whole `getOperationsDashboard()` call in the page in a `try/catch` (if not already there — the existing error state at `AdminDashboardView.tsx` lines 277-289 suggests it already handles a total failure correctly), and explicitly do **not** claim per-panel partial-failure isolation in the QA report unless it's actually implemented — if time-boxed out, document it as a known gap against ticket §111 rather than silently skipping it.

- [ ] **Step 3: Manual verification** — throttle the DB connection or temporarily break a query to confirm the loading skeleton renders during the request and the existing full-error state still triggers correctly on total failure.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/loading.tsx src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): loading skeleton matches real layout"
```

---

### Task 23: Responsive pass — 1440 / 1024 / 768 / 390

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`

- [ ] **Step 1** 1440 (primary reference): confirm the 75/25 grid (`grid-template-columns: minmax(0,1fr) 270px` per ticket §39) matches the mockup's proportions.

- [ ] **Step 2** 1024: KPI 2×2 if needed, rail may narrow or drop below, chart keeps its axes.

- [ ] **Step 3** 768: full single-column stacking in the ticket §129 order (KPI 2-col, Ventas 100%, Insights 100%, Pipeline 100%, Pendientes 100%, Top productos 100%, Actividad 100%).

- [ ] **Step 4** 390: 1 KPI per row or horizontal-snap carousel, chart full-width, tooltip usable on touch (the overlay hit-targets from Task 15 must be touch-friendly, not hover-only), filters become a bottom sheet (reuse `AdminDrawer` anchored to the bottom on small viewports, or a simple CSS variant), no horizontal document overflow anywhere.

- [ ] **Step 5: Manual verification** — resize the browser (or use devtools device presets) at all four widths, screenshot each (feeds Task 24's evidence set), confirm zero horizontal scroll on the page body at any width.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminDashboardView.tsx
git commit -m "feat(admin-dashboard): responsive layout at 1440/1024/768/390"
```

---

## Phase 4 — Tests, RBAC, evidence, QA report

### Task 24: Final verification suite, Playwright e2e, visual evidence, QA report

**Files:**
- Create: `docs/qa/cp032-dashboard-redesign-2026-08-31.md` (mirror the section style of `docs/qa/cp029-be-blockers-2026-08-15.md` / `docs/qa/cp050-backend-audit-2026-08-15.md` — the closest existing precedents)
- Create/extend: Playwright test file for the dashboard flow (check whether a Playwright config/existing e2e directory already exists in this repo before creating a new one — research did not confirm one; if none exists, this sub-step may need to be scoped down to a manual, screenshotted walkthrough documented in the QA report instead of a new Playwright harness, since introducing a whole new test runner is out of proportion for one ticket — flag this explicitly to the user if no e2e harness is found rather than silently skipping §151-153).

- [ ] **Step 1: RBAC tests**

Add to a suitable existing test file (or a new `scripts/dashboard-rbac.test.ts` if the RBAC checks are exercised through a pure `can()` call rather than a live request): assert `can("SUPERADMIN", "dashboard.view")` is `true`, `can("GERENCIA", "dashboard.view")` is `true`, and at least one role known to lack it (check `src/lib/roles.ts`'s full `rolePermissions` map, read in research, for a role without `dashboard.view` — e.g. `ALMACEN`/`COMPRAS`) is `false`.

- [ ] **Step 2: Multi-currency guard test**

Extend `scripts/dashboard-definitions.test.ts` or add a focused test asserting the currency-resolution logic from Task 3 never lets two different currencies contribute to one sum — since the resolution logic lives inline in `operations-dashboard.ts` (DB-bound), extract the pure "pick a currency" decision into a small testable function if it isn't already (e.g. `resolveActiveCurrency(available: string[], requested?: string): {currency?: string; ambiguous: boolean}` in `dashboard-definitions.ts`), and unit test: `["PEN"]` → `{currency:"PEN", ambiguous:false}`; `["PEN","USD"]` with no request → `{currency:"PEN", ambiguous:true}`; `["USD"]` → `{currency:"USD", ambiguous:false}`; `[]` → `{currency:undefined, ambiguous:false}`.

- [ ] **Step 3: Run the full verification suite from AGENTS.md**

```bash
corepack pnpm test:inventory
corepack pnpm exec tsx --test scripts/catalog-view-model.test.ts scripts/compatibility-safety.test.ts scripts/dashboard-definitions.test.ts scripts/dashboard-contract.test.ts scripts/dashboard-insights.test.ts scripts/dashboard-export-href.test.ts
corepack pnpm exec tsc --noEmit
corepack pnpm lint
corepack pnpm build
```
Expected: all pass, 0 new lint warnings, build succeeds. Fix any failures before proceeding — do not write the QA report against a red build.

- [ ] **Step 4: Manual runtime pass as SUPERADMIN**

Using the `run` skill or a manual dev-server session: log in, load `/admin/dashboard`, verify the 4 KPIs render with real numbers, change period, apply 2-3 filters, verify the URL and the chips/badge update, open an insight's CTA, go back, click a pipeline row, go back, click a top product, export the report with filters applied and confirm the downloaded CSV's scope matches (open it and check the filter values are reflected in whatever scope-echo the export already includes, or at minimum confirm the request URL had every filter), click refresh, confirm the "Última actualización" timestamp updates.

- [ ] **Step 5: Capture visual evidence**

Screenshot at 1440/1024/768/390 (`cp032-dashboard-1440.png` etc.), plus `cp032-dashboard-filters.png`, `cp032-dashboard-empty.png` (a period with zero sales), `cp032-dashboard-error.png` (simulate a DB failure), `cp032-dashboard-tooltip.png`, `cp032-dashboard-insights.png`. Store them under a location consistent with how prior tickets in this repo stored evidence (check `docs/qa/` for an existing screenshots convention before picking a new one).

- [ ] **Step 6: Write the QA report**

`docs/qa/cp032-dashboard-redesign-2026-08-31.md`, covering all 40 items from ticket §173: SHA before/after, branch (`main`, no separate branch was used per the user's decision), files modified, new components (`AdminDrawer`, `AdminTooltip`, `dashboard-definitions.ts`, `dashboard-insights.ts`), modified services (`operations-dashboard.ts`, `dashboard-contract.ts`, `dashboard-export.ts` if touched), endpoints (export route, unchanged contract but now correctly consumed), contract changes (`currency` filter, `kpiView`, `pipelineMacroSummary`, `pendingActions`, `insights` fields added to `getOperationsDashboard`'s return type), each KPI's documented fuente/fórmula/filtros/moneda/comparación per ticket §160's template, pipeline grouping table (macro-stage → raw stages, explicitly note CLOSED counts as "Cierre ganado" while LOST/CANCELLED/NO_RESPONSE are excluded), pipeline total definition (participation-over-active-total, per ticket §67's recommendation), top-products trend decision (Task 19's documented simplification — no per-product daily sparkline, and why), snapshot-vs-period metric list, timezone (`America/Lima`, unchanged), loading/error/empty states, responsive breakpoints, performance (still one `Promise.all`, no new N+1 introduced — note the two new queries added in Task 6 and the one currency-detection query added in Task 3 as the only additions to the existing 35-query batch), test results, TypeScript/lint/build status, screenshot references, explicit diffs against the mockup (if any deliberate deviation was made, name it and why — e.g. the top-products sparkline omission), and open blockers (e.g. no Playwright harness found — Task 24 Step "Playwright" note above; partial-failure isolation for `recentActivity` not fully implemented, Task 22 Step 2's honest scope-down).

- [ ] **Step 7: Commit**

```bash
git add docs/qa/cp032-dashboard-redesign-2026-08-31.md scripts/
git commit -m "docs(admin-dashboard): CP-032 QA report and final test suite"
```

---

## Self-review notes (from the plan author, not a task)

- **Spec coverage:** All numbered ticket sections map to a task above except the ones explicitly out of scope by the user's own decision (branch strategy §RAMA — resolved to "work on main"), sections that describe already-correct existing behavior with no work needed (§21 CONFIRMED-only sales, §24-26 comparison math, §88-89 activity translation, §110 error state — all verified against the real file and already compliant, cited in their relevant tasks as "no change needed" or folded into a verification step rather than a fake task), and two items flagged as legitimately not fully achievable within this ticket's proportional scope (full per-panel partial-failure isolation, Task 22; a new Playwright harness if none exists, Task 24) — both are called out to the user in the QA report rather than silently dropped.
- **Placeholder scan:** no task above says "add appropriate error handling" or "similar to Task N" without inline code — verified by re-reading each task's Step 3.
- **Type consistency:** `DashboardFilters` (Task 3) → consumed identically in Tasks 7, 11, 12, 13. `isActiveOrderStatus`/`getPipelineMacroStage`/`stockState` (Task 1) → consumed identically in Task 2 (backend) and referenced (not re-implemented) in Task 16 (UI, via the already-shaped `pipelineMacroSummary` payload, not by re-importing the raw function into a client component). `buildKpiView`'s `KpiView` shape (Task 4) is consumed as-is in Task 14 with no renamed fields.
