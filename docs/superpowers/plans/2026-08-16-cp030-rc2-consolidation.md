# CP-030 RC2 Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `release/coldpower-v1.0-rc2` from RC1 plus the validated UI pass and the clean read-only CP-029 backend contract regression, with the temporary local authentication bypass completely absent.

**Architecture:** The UI worktree is first made reproducible as `ui/coldpower-v1.0-final-pass`; RC2 is then created from that exact commit. Only `scripts/cp029-be-contract.test.ts` and its package script are copied from the backend branch. Authentication, Clerk, RBAC, domain services, migrations, and deployment configuration remain inherited from RC1.

**Tech Stack:** Next.js, TypeScript, Drizzle/PostgreSQL, Clerk, Node test runner, `tsx`, Corepack pnpm, PowerShell, Git.

## Global Constraints

- RC1 remains exactly `bf572060ff2efade5ea0fbaec7542f97d12da1c5`.
- Do not merge `fix/cp029-be-blockers` as a branch.
- RC2 must contain zero functional uses of `CP_DEV_AUTH_BYPASS`, `CP_DEV_AUTH_USER_ID`, and `CP_DEV_AUTH_ALLOWED_HOSTS`.
- Do not modify Cloudflare, DNS, Clerk secrets, Neon, production, migrations, pricing, inventory, CRM, quotes, CMS, or `main`.
- Do not publish products, invent prices, invent stock, or create duplicate users.
- Do not show secret values in terminal output, reports, or commits.
- Preserve the current public API/UI contract names and formats.

### Task 1: Record and publish the validated UI pass

**Files:**
- Modify: the eight existing UI files listed by the ticket.
- Create: `scripts/cp029-catalog-metrics-ui.test.mjs`.
- Create: `scripts/cp029-catalog-metrics-render.test.tsx`.
- Modify: `package.json` with `test:cp029-ui`.
- Create: `docs/qa/ui-final-production-pass-2026-08-16.md`.

- [ ] Confirm the worktree diff contains only the expected UI files, tests, package script, and QA evidence.
- [ ] Run `corepack pnpm test:cp029-ui` and confirm all three UI assertions pass.
- [ ] Run `git diff --check`.
- [ ] Commit the validated UI worktree and push `ui/coldpower-v1.0-final-pass` so its SHA is reproducible from GitHub.

### Task 2: Create RC2 from the UI SHA

**Files:**
- Create branch: `release/coldpower-v1.0-rc2`.
- Create: `docs/superpowers/specs/2026-08-16-cp030-rc2-consolidation-design.md`.

- [ ] Verify the UI commit descends from RC1 and RC1 still resolves to `bf572060ff2efade5ea0fbaec7542f97d12da1c5`.
- [ ] Create RC2 at the exact UI commit without merging `fix/cp029-be-blockers`.
- [ ] Verify no bypass symbol is present in RC2 production code or tracked configuration.

### Task 3: Add only the clean backend contract regression

**Files:**
- Create: `scripts/cp029-be-contract.test.ts` copied and reviewed from the backend branch.
- Modify: `package.json` with the backend contract test command only.

- [ ] Confirm the test is read-only, compares service output with direct PostgreSQL aggregates, and does not import bypass code.
- [ ] Add only the test file and its package command; do not copy backend auth, proxy, env, docs, or bypass files.
- [ ] Run the contract test against the configured development database.

### Task 4: Verify Clerk and RBAC with the real path

**Files:**
- Modify code only if a verification finds a real RC2 regression; otherwise none.
- Update: `docs/qa/release-coldpower-v1.0-rc2-2026-08-16.md` with evidence.

- [ ] Check presence of `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SECRET` without printing values.
- [ ] Use Clerk real authentication at `https://dev.coldpower.pe`; stop at OTP and request the user code if Clerk requires it.
- [ ] Verify SUPERADMIN access, refresh stability, logout/login behavior, protected routes, unauthenticated redirects, and existing 403 tests.
- [ ] Confirm `/api/webhooks/clerk` remains canonical and signed/idempotent behavior remains intact.

### Task 5: Execute the complete RC2 verification matrix

**Files:**
- Update: `docs/qa/release-coldpower-v1.0-rc2-2026-08-16.md`.

- [ ] Run `corepack pnpm test:all`.
- [ ] Run `corepack pnpm test:cp029-ui` and the CP-029 backend contract test.
- [ ] Run TypeScript, lint, build, and `git diff --check`.
- [ ] Verify PostgreSQL and admin catalog counts: 1348 total, 4 published, 1344 review, 57 require-review, 62 pending editorial duplicates, 0 exact duplicate SKU groups, 27 categories, and 60 brands.
- [ ] Verify page changes and `publicationStatus=review` preserve global KPIs.
- [ ] Verify localhost and `dev.coldpower.pe` health/public routes plus authenticated catalog, comparator, quotation, and dashboard behavior.

### Task 6: Document, commit, push, and close RC2

**Files:**
- Create: `docs/qa/release-coldpower-v1.0-rc2-2026-08-16.md`.

- [ ] Record RC1 SHA, UI SHA, reviewed backend SHA, included/excluded changes, bypass result, final RC2 SHA, all test results, runtime results, and remaining production blockers.
- [ ] Commit RC2 and push `release/coldpower-v1.0-rc2`.
- [ ] Re-run `git status --short --branch`, confirm the branch is clean and the remote points to the final SHA.
- [ ] Confirm RC1 remains unchanged and no production deployment or `main` merge occurred.
