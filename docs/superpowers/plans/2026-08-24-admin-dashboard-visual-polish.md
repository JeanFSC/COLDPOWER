# Admin Dashboard Visual Polish Implementation Plan

> **For agentic workers:** Execute this plan inline with a test-first cycle and do not stage unrelated Codex2 worktree changes.

**Goal:** Align `/admin/dashboard` with the ColdPower executive reference while consuming only real dashboard DTO data.

**Architecture:** Keep `getOperationsDashboard` as the server-side source of truth and make `AdminDashboardView` a presentation layer over its existing and newly available `comparisons`, `stageLabel`, `actionLabel`, `entityLabel`, `roleLabel`, `statusLabel`, and product media fields. Use empty states for unavailable data instead of fabricated values.

**Tech Stack:** Next.js App Router, React/TypeScript, Tailwind classes, existing Lucide icons, existing canvas chart primitives, Node/tsx contract tests.

## Global Constraints

- Do not alter database schema, seed scripts, auth bypass files, or Codex2 backend files.
- Do not hardcode product names, dashboard counts, or percentage values.
- Preserve existing links, filters, export behavior, RBAC, and responsive layout.
- Use `—` or a truthful empty state when a value is not supplied by the DTO.
- Keep the dashboard usable at desktop and mobile widths.

### Task 1: Dashboard UI contract

**Files:**
- Modify: `scripts/admin-dashboard-ui-empty-states.test.mjs`
- Modify: `src/components/admin/AdminDashboardView.tsx`

Add source-level assertions for human labels, comparison rendering, greeting, date-range control, absence of `DashboardReadiness`, absence of the duplicated completeness panel, and use of DTO labels/media.

### Task 2: Executive header and KPI cards

Use a personalized greeting from the authenticated actor name, a date-range selector in the header, and the DTO `comparisons` object for current/previous percentages. Keep sparklines based on real sales series and render a neutral unavailable state for metrics without a comparison.

### Task 3: Business widgets

Render `stageLabel`, `actionLabel`, `entityLabel`, `actorName`, `roleLabel`, and `statusLabel`. Use product `primaryImageUrl` when present and the existing placeholder only for media that is genuinely absent. Map inventory rows to `Stock crítico`, `Stock bajo`, `Sin stock`, and `Sobre stock`; keep unknown stock as a separate truthful row only when nonzero.

### Task 4: Footer consolidation

Keep one six-item horizontal KPI strip for customers, sales, orders, ticket, products, and categories. Remove the technical readiness panel and the repeated 14-metric completeness panel from the management dashboard.

### Task 5: Verification

Run the dashboard UI contract tests, CP-031 dashboard contracts/runtime tests, TypeScript, lint, production build, and a browser screenshot at desktop/mobile widths. Confirm the local dashboard contains no raw enum copy or QA product names.
