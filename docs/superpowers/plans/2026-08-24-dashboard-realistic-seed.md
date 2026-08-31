# Dashboard realistic development seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the QA-only development fixture with an idempotent, real-catalog development seed and expose truthful current-vs-previous KPI comparisons without breaking the existing dashboard DTO.

**Architecture:** Keep `scripts/seed-dev-mock.ts` as the single entry point, but make the fixture select existing catalog products instead of inserting products. A versioned fixture namespace will own all generated records; legacy `cp-mock-v1` data can only be removed through an explicit development-only replacement flag. Dashboard comparisons will be calculated from the same filtered SQL windows already used by the current service and added to the DTO.

**Tech Stack:** Next.js/TypeScript, Drizzle ORM, Neon PostgreSQL, Node test runner, pnpm.

## Global Constraints

- Only `.env.local`/development data may be changed; never run the seed with `NODE_ENV=production`.
- Use existing catalog products, categories, families, brands, prices and media; never insert product names with `QA` or create product rows in the seed.
- Keep `salesSeries`, `previousSalesSeries`, `pipelineSummary`, `userSummary`, `recentActivity` and `unknownStock` compatible.
- No runtime data generation and no arrays hardcoded in the UI.
- Legacy fixture deletion requires an explicit `--replace-legacy-mock` flag and is restricted to IDs with the legacy fixture prefix.

---

### Task 1: Lock the seed safety and data contract with failing tests

**Files:**
- Modify: `scripts/dev-mock-seed.test.ts`
- Modify: `scripts/cp031-dashboard-data.test.ts`
- Modify: `src/lib/dev-mock-fixtures.ts`

**Interfaces:**
- `assertDevMockSeedAllowed(env, args)` continues to reject production and missing confirmation.
- Add `assertDevDatabaseTarget(env, args)` for the development marker and replacement flag.
- Add `dashboardComparisons()` as a pure helper returning the four comparison objects with `null` when previous is zero.

- [ ] **Step 1: Write failing tests** for the new fixture version, development target guard, replacement flag, comparison percentages, zero-denominator behavior, and preserved dashboard fields.
- [ ] **Step 2: Run the focused tests** and confirm they fail for the missing version/guard/comparison helper.
- [ ] **Step 3: Implement only the fixture guard and pure comparison helper.** Do not touch database writes in this task.
- [ ] **Step 4: Re-run the focused tests** and confirm they pass.

### Task 2: Replace QA products with real catalog selection and controlled inventory

**Files:**
- Modify: `scripts/seed-dev-mock.ts`
- Modify: `src/lib/dev-mock-fixtures.ts`

**Interfaces:**
- `seedDevelopmentMockData()` returns `{ seedVersion, counts, selectedProducts, inventoryCases }`.
- The seed selects active existing products, preserves their identity/taxonomy/brand fields, and creates prices only for products used in transactions.

- [ ] **Step 1: Add a failing seed-contract test** asserting no inserted product row is required, selected product IDs already exist, and `unknownStock` is a small count after seeding.
- [ ] **Step 2: Run the test to observe the current QA product fixture fail the contract.**
- [ ] **Step 3: Implement the real-product selector and controlled inventory:** balances for nearly all catalog products, a small explicit unknown subset, critical/low/zero/overstock cases, active reservations, and recent/old movement dates.
- [ ] **Step 4: Replace QA labels in generated people, customers, suppliers, locations and notes with realistic business labels; keep fixture IDs and idempotency keys isolated.
- [ ] **Step 5: Re-run focused seed tests.**

### Task 3: Add period-comparable dashboard metrics

**Files:**
- Modify: `src/lib/operations-dashboard.ts`
- Modify: `scripts/cp031-dashboard-data.test.ts`
- Modify: `docs/contracts/CP-031.md`

**Interfaces:**
- Additive DTO field:

```ts
comparisons: {
  sales: { current: number; previous: number; percentage: number | null };
  quotes: { current: number; previous: number; percentage: number | null };
  orders: { current: number; previous: number; percentage: number | null };
  criticalStock: { current: number; previous: number; percentage: number | null };
}
```

- [ ] **Step 1: Add failing pure and runtime tests** for `month`, `week`, `today` and `custom`, including a previous value of zero.
- [ ] **Step 2: Run the tests and verify the comparison assertions fail before implementation.
- [ ] **Step 3: Add filtered current/previous queries using the existing window helpers and add `comparisons` without renaming existing fields.
- [ ] **Step 4: Verify the DTO keeps all six frontend-stable fields and that financial masking/RBAC remains unchanged.

### Task 4: Make the seed command documented and safely reproducible

**Files:**
- Modify: `package.json`
- Modify: `scripts/seed-dev-mock.ts`
- Modify: `scripts/dev-mock-seed.test.ts`
- Modify: `docs/contracts/CP-031.md`

- [ ] **Step 1: Add `pnpm seed:dev` and document the exact confirmation/replacement command.
- [ ] **Step 2: Implement idempotent versioned inserts with no reset behavior; run legacy cleanup only when `--replace-legacy-mock` is explicitly present.
- [ ] **Step 3: Execute the seed twice against the development database and record first-run versus second-run counts.
- [ ] **Step 4: Query the database and `/api/admin/dashboard?range=month` to verify current/previous sales, quotes, pipeline, orders, payments, inventory cases, users, activity, real product names and a small `unknownStock`.

### Task 5: Full verification and handoff

**Files:**
- No additional source files unless a verification failure requires a targeted fix.

- [ ] **Step 1: Run focused seed and dashboard tests.
- [ ] **Step 2: Run TypeScript, lint, build and existing CP-031/CP-030 regression suites.
- [ ] **Step 3: Capture the final DTO example and entity counts without printing secrets.
- [ ] **Step 4: Report modified files, exact seed commands, first/second run counts, DTO sample, test results and any remaining limitation such as absent real media/prices in the current catalog.
