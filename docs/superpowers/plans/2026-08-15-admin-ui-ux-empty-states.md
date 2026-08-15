# Admin UI/UX Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current admin and public informational surfaces feel production-ready when data is empty or incomplete, without changing API contracts, permissions, backend logic, or business data.

**Architecture:** Keep the existing server data loading and shared admin/public shells. Improve presentation at the component boundary with explanatory status blocks, contextual links, clearer disabled controls, and a compact account navigation model. Do not add client data fetching, mutations, mock data, or new domain states.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react, existing ColdPower shared components.

## Global Constraints

- Do not change API routes, response shapes, field names, permissions, database queries, or backend services.
- Do not publish products or create prices, stock, images, contacts, locations, or legal data.
- Preserve every existing destination and form action; UI grouping may reduce repeated cards but must keep all links available.
- Use truthful copy for empty, unavailable, pending, and unknown states; never represent `0`, `—`, or missing configuration as confirmed business activity.
- Keep current navy/orange visual language, responsive layout, keyboard labels, and existing hrefs.

---

### Task 1: Add truthful dashboard readiness cues

**Files:**
- Modify: `src/components/admin/AdminDashboardView.tsx`
- Test: `scripts/admin-dashboard-ui-empty-states.test.mjs`

**Interfaces:**
- Consumes: existing `DashboardData | null`, role, and hrefs.
- Produces: visual-only `DataStatus`/`DashboardReadiness` JSX helpers inside the existing component file; no exported API changes.

- [ ] **Step 1: Write the failing contract test**

Assert that the dashboard component source contains visible explanatory text for the disabled export and period controls, contextual dashboard links, and empty-state copy that distinguishes missing activity from a real zero. Do not assert API fields or change runtime data.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test scripts/admin-dashboard-ui-empty-states.test.mjs`

Expected: FAIL because the current dashboard only exposes the disabled controls' explanations through `title` attributes and has generic empty rows.

- [ ] **Step 3: Implement the smallest visual change**

Add an inline readiness note beside the header controls and a compact `DashboardReadiness` panel after the KPI row. Update empty panel copy to explain the next truthful action, using existing links such as `/admin/cotizaciones`, `/admin/catalogo`, `/admin/inventario`, `/admin/auditoria`, and `/admin/usuarios`. Keep `disabled` on controls and keep all data expressions unchanged.

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test scripts/admin-dashboard-ui-empty-states.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run the focused static checks**

Run: `pnpm exec eslint src/components/admin/AdminDashboardView.tsx`

Expected: exit code 0.

---

### Task 2: Recompose the purchases empty workflow

**Files:**
- Modify: `src/components/admin/PurchasesOperations.tsx`
- Modify: `src/app/admin/compras/page.tsx`
- Test: `scripts/admin-purchases-ui-empty-states.test.mjs`

**Interfaces:**
- Consumes: the existing `suppliers`, `locations`, `products`, and `purchases` props and unchanged POST paths.
- Produces: the same three forms and submission payloads, visually organized as a guided three-step workflow.

- [ ] **Step 1: Write the failing contract test**

Assert that the UI source includes the workflow labels “1. Proveedor”, “2. Orden de compra”, “3. Recepción”, truthful prerequisite copy for empty supplier/location/order states, and preserves `/api/admin/proveedores`, `/api/admin/compras`, and `/api/admin/compras/recepciones`.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test scripts/admin-purchases-ui-empty-states.test.mjs`

Expected: FAIL because the current forms are visually equal columns and only describe the transaction semantics after the controls.

- [ ] **Step 3: Implement the smallest visual change**

Keep the same form names, fields, transforms, and buttons. Add a workflow intro, numbered step markers, empty-state helper copy, and disabled-state explanation that reflects only the prop arrays (for example, “Primero registra un proveedor” when `suppliers.length === 0`). Use a responsive two-column layout for the first two steps and a full-width receiving step when appropriate; no new behavior.

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test scripts/admin-purchases-ui-empty-states.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run the focused static checks**

Run: `pnpm exec eslint src/components/admin/PurchasesOperations.tsx src/app/admin/compras/page.tsx`

Expected: exit code 0.

---

### Task 3: Make catalog missing data and unavailable actions explicit

**Files:**
- Modify: `src/components/admin/AdminCategoryViews.tsx`
- Test: `scripts/admin-catalog-ui-empty-states.test.mjs`

**Interfaces:**
- Consumes: existing product rows and `ProductWorkspace` controls.
- Produces: visual `ProductThumb`, stock cell, and disabled-action presentation only; no publication or mutation changes.

- [ ] **Step 1: Write the failing contract test**

Assert that the source has visible labels for image pending, stock unavailable/unknown, and disabled actions with an explanatory title or adjacent text, while preserving the existing `ProductThumb`, `More`, table headers, and publication status values.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test scripts/admin-catalog-ui-empty-states.test.mjs`

Expected: FAIL because the product table currently renders an image placeholder with alt text “Sin imagen”, a bare `—` stock cell, and a disabled ellipsis without context.

- [ ] **Step 3: Implement the smallest visual change**

Give the thumbnail a neutral “Imagen pendiente” visual label without changing its source asset. Replace the bare stock dash with a compact “Sin dato”/“No sincronizado” state only when the existing value is unavailable. Add an accessible explanation to unavailable row actions and a short catalog readiness note near the table; do not enable actions or alter publication logic.

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test scripts/admin-catalog-ui-empty-states.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run the focused static checks**

Run: `pnpm exec eslint src/components/admin/AdminCategoryViews.tsx`

Expected: exit code 0.

---

### Task 4: Polish contact, account, and complaints states

**Files:**
- Modify: `src/app/contacto/page.tsx`
- Modify: `src/app/cuenta/page.tsx`
- Modify: `src/app/libro-de-reclamaciones/page.tsx`
- Test: `scripts/public-empty-state-ui.test.mjs`

**Interfaces:**
- Consumes: existing company settings, profile, role, and account hrefs.
- Produces: presentation-only status cards and grouped account navigation; all existing routes remain reachable.

- [ ] **Step 1: Write the failing contract test**

Assert that contact uses professional pending-configuration labels, account groups the three history destinations under one visual section, and complaints states that the legal form and tracking flow are not available while retaining the contact CTA.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test scripts/public-empty-state-ui.test.mjs`

Expected: FAIL because contact repeats “Por confirmar”, account renders three separate cards to the same history href, and complaints presents a single implementation heading without a readiness/status treatment.

- [ ] **Step 3: Implement the smallest visual change**

Use an explicit `ChannelStatus` presentation for missing contact values and a concise configuration explanation. Replace the three duplicate account cards with one “Historial y recompra” card containing three links/buttons to the same existing destinations. Add a status badge and next-step explanation to the complaints page while retaining only real company values and `/contacto`.

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test scripts/public-empty-state-ui.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run the focused static checks**

Run: `pnpm exec eslint src/app/contacto/page.tsx src/app/cuenta/page.tsx src/app/libro-de-reclamaciones/page.tsx`

Expected: exit code 0.

---

### Task 5: Verify the complete visual surface

**Files:**
- Inspect: all files above and current worktree diff.

- [ ] **Step 1: Run all new UI contract tests**

Run: `node --test scripts/admin-dashboard-ui-empty-states.test.mjs scripts/admin-purchases-ui-empty-states.test.mjs scripts/admin-catalog-ui-empty-states.test.mjs scripts/public-empty-state-ui.test.mjs`

Expected: all tests pass.

- [ ] **Step 2: Run lint and build**

Run: `pnpm lint; pnpm build`

Expected: both commands exit 0.

- [ ] **Step 3: Re-check the rendered routes**

Open authenticated `/admin/dashboard`, `/admin/compras`, and `/admin/catalogo`, plus `/contacto`, `/cuenta`, and `/libro-de-reclamaciones`. Confirm no products are published, no new business data appears, disabled actions remain disabled, and all existing hrefs/forms remain present.

- [ ] **Step 4: Review the diff boundaries**

Run: `git diff --stat -- src/components/admin/AdminDashboardView.tsx src/components/admin/PurchasesOperations.tsx src/app/admin/compras/page.tsx src/components/admin/AdminCategoryViews.tsx src/app/contacto/page.tsx src/app/cuenta/page.tsx src/app/libro-de-reclamaciones/page.tsx`

Expected: only UI/copy/layout changes in the listed files.

---
