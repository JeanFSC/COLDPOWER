# CP-029 Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove fabricated visual data from shared Admin workspaces and establish production-grade shared navigation, states, pagination, and responsive behavior without changing backend contracts.

**Architecture:** Keep server pages responsible for loading snapshots and rows. Keep `AdminCategoryViews.tsx` presentational and derive every visible number/status/date from props. Put shared UI rules in `AdminShell` and small Admin primitives; use source-level contracts to prevent hardcoded fallback business values. Existing route permissions and services remain the source of truth.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, lucide-react, Node contract tests, Playwright browser QA.

## Global Constraints

- Neon/PostgreSQL remains the runtime source of truth.
- Never invent price, stock, compatibility, availability, brand or technical values.
- Preserve role and permission checks; do not change schema, API contracts or transaction rules.
- Use `0`, `—`, `Sin datos` or `No disponible` when a backend value is absent.
- Do not retain the fixed `25 may. - 24 jun. 2024` period in reusable Admin UI.
- Do not render fictitious page numbers, fixed IPs, sellers, payment methods, dates or progress values.
- Use Spanish UI labels throughout Admin.

### Task 1: Add failing Admin foundation contracts

**Files:**
- Create: `scripts/cp029-admin-foundation-contract.test.mjs`
- Read: `src/components/admin/AdminCategoryViews.tsx`
- Read: `src/components/admin/AdminShell.tsx`

**Interfaces:**
- The test scans source because shared workspaces are server-rendered and have no isolated UI test harness.
- The contract names are intentionally narrow: fixed period, fake pager, fixed IP, fake metric literals and non-functional action controls must be absent after implementation.

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const views = fs.readFileSync("src/components/admin/AdminCategoryViews.tsx", "utf8");
const shell = fs.readFileSync("src/components/admin/AdminShell.tsx", "utf8");

assert.doesNotMatch(views, /25 may\.?\s*-\s*24 jun\.?\s*2024/i);
assert.doesNotMatch(views, /190\.12\.45\.23/);
assert.doesNotMatch(views, /\[156,\s*28,\s*42,\s*71,\s*15\]/);
assert.doesNotMatch(views, /Transferencia bancaria.*Deposito en cuenta.*Tarjeta de credito/i);
assert.match(views, /aria-label|aria-labelledby/);
assert.match(shell, /sticky|lg:sticky/);
console.log("cp029-admin-foundation-contract: passed");
```

- [ ] **Step 2: Run it and verify it fails**

Run: `node scripts/cp029-admin-foundation-contract.test.mjs`

Expected: FAIL because the current shared views contain the fixed 2024 date, fixed audit IP and hardcoded order/payment values.

### Task 2: Replace fabricated shared workspace values with prop-driven states

**Files:**
- Modify: `src/components/admin/AdminCategoryViews.tsx`
- Modify: `src/components/admin/AdminCharts.tsx` only if chart inputs currently synthesize activity
- Test: `scripts/cp029-admin-foundation-contract.test.mjs`

**Interfaces:**
- `PageHeader` accepts `period?: string | null`; it renders a date control only when the page supplies a real period.
- `Pager` accepts `label` and `totalPages?: number`; it renders no page buttons when `totalPages <= 1`.
- `ListingRow` remains backend-derived; missing optional fields render `—` or `Sin datos`, never operational defaults.
- `MetricGrid` accepts optional `sparkline?: number[]`; no sparkline is rendered when the array is absent or empty.

- [ ] **Step 1: Add explicit props and state helpers**

Use these helpers in the existing file:

```tsx
function displayValue(value: ReactNode, empty = "—") {
  return value === null || value === undefined || value === "" ? empty : value;
}

function periodLabel(period?: string | null) {
  return period?.trim() || null;
}
```

Update `PageHeader`, `Pager`, and all workspaces to consume their page-provided period/total-pages values rather than creating defaults internally.

- [ ] **Step 2: Remove fake values from orders, payments, audit and pipeline**

Replace fixed arrays and fallbacks with `rows`-derived values. If the backend does not provide a value, render `—`; if there are no rows, render an explanatory empty state. Audit rows must use a provided `origin`/`ip` field or `—`, and before/after must be summarized as readable values rather than raw JSON.

- [ ] **Step 3: Make primary controls honest**

Change visual-only actions without a route or callback to disabled buttons with an accessible explanation, or pass the existing `controls` callback/child into a details panel. `More` must accept `onClick`/`href`; never expose a clickable-looking no-op as a completed action.

- [ ] **Step 4: Make charts data-aware**

Update chart callers so an empty series renders a flat empty panel with `Aún no hay datos suficientes para este reporte`, while a non-empty series uses only the values supplied by the server snapshot.

- [ ] **Step 5: Run the focused contract**

Run: `node scripts/cp029-admin-foundation-contract.test.mjs`

Expected: PASS with no fabricated date/IP/metric literals.

### Task 3: Harden AdminShell and responsive shared UI

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/globals.css` only for shared focus/scroll tokens if needed
- Test: `scripts/cp029-admin-foundation-contract.test.mjs`

**Interfaces:**
- Sidebar remains permission-filtered by the existing `can()`/role helpers.
- Support help remains available but uses a compact panel with an accessible expand/collapse control.
- Desktop content keeps independent scroll; at 1024 px and below the navigation becomes a labeled toggle/drawer without changing route permissions.

- [ ] **Step 1: Add keyboard and focus contracts**

Ensure the sidebar toggle has `aria-expanded`, `aria-controls`, a visible focus style, and closes on route change. Ensure all icon-only controls have an accessible label.

- [ ] **Step 2: Compact the support panel**

Keep the support CTA but reduce its permanent height; show the description only when expanded or at wide desktop widths.

- [ ] **Step 3: Verify route visibility remains unchanged**

Run: `node scripts/phase11-rbac.test.mjs && node scripts/cp028-rbac-contract.test.mjs`

Expected: PASS; no role or permission source files change.

### Task 4: Add route-aware period and pagination plumbing

**Files:**
- Modify: `src/app/admin/catalogo/page.tsx`
- Modify: `src/app/admin/inventario/page.tsx`
- Modify: `src/app/admin/precios/page.tsx`
- Modify: `src/app/admin/crm/page.tsx`
- Modify: `src/app/admin/cotizaciones/page.tsx`
- Modify: `src/app/admin/ventas/page.tsx`
- Modify: `src/app/admin/pedidos/page.tsx`
- Modify: `src/app/admin/pagos/page.tsx`
- Modify: `src/app/admin/auditoria/page.tsx`

**Interfaces:**
- Preserve existing repository/service calls and permission guards.
- Pass only values already returned by those calls; if a route does not have a total-period contract, omit the period control instead of fabricating one.

- [ ] **Step 1: Identify each page's actual total/page metadata**

Read the current service return types and map `total`, `page`, `totalPages` and period fields. Do not add a new API query for presentation-only needs.

- [ ] **Step 2: Pass metadata into the shared workspace**

Use explicit props and keep empty/error messages close to the failing data source.

- [ ] **Step 3: Add a regression assertion per page**

Extend the contract to verify the shared workspace is called with real rows/metrics and no source file contains the fixed 2024 range.

### Task 5: Verify foundation before expanding scope

**Files:**
- No production file changes.
- Read: all files touched in Tasks 1–4.

- [ ] **Step 1: Run TypeScript**

Run: `corepack pnpm exec tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 2: Run lint**

Run: `corepack pnpm lint`

Expected: exit code 0.

- [ ] **Step 3: Run relevant contract suite**

Run: `node scripts/cp029-admin-foundation-contract.test.mjs && node scripts/admin-category-ui-contract.test.mjs && node scripts/phase16-navigation-design.test.mjs`

Expected: all commands exit 0.

- [ ] **Step 4: Capture browser evidence**

Use the authenticated browser at 1440/1024/390 px for `/admin/dashboard`, `/admin/operaciones`, `/admin/pedidos`, `/admin/pagos`, `/admin/auditoria`, and verify no horizontal document overflow, no fabricated period, and no clickable no-op exposed as a completed mutation.

## Self-review

- The plan covers the first independently testable CP-029 subsystem and keeps public commerce/portal work in a later plan.
- No task changes schema, backend permissions or API contracts.
- All fabricated data called out in the audit has a concrete removal step.
- The plan uses existing components and repository results instead of introducing a parallel data layer.
