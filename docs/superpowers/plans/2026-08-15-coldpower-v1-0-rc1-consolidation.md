# ColdPower v1.0 RC1 Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task with verification checkpoints.

**Goal:** Consolidate the current ColdPower frontend/backend/database state into a reproducible `release/coldpower-v1.0-rc1` branch without losing Codex1 or Codex2 work.

**Architecture:** Treat the current shared feature branch and its remote as the authoritative integrated source after a read-only Git comparison. Preserve the existing Next.js, Drizzle/Neon, Clerk/RBAC, catalog, CRM, inventory and quote contracts; make only release-blocking correctness fixes. Validate database state in the development Neon environment, then validate APIs and pages from a clean RC checkout before pushing.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Drizzle ORM, Neon PostgreSQL, Clerk, pnpm, Node test suites and Playwright/browser smoke checks.

## Global Constraints

- Do not use `git reset --hard`, force push, or delete changes without evidence.
- Do not deploy production, redesign UI, regenerate the catalog/SKU, invent prices or stock, replace Clerk, or introduce unrelated features.
- Preserve the ACSOFT → user PDF → validated Excel → Neon product provenance.
- Keep `products` at exactly 1,348 rows with immutable unique SKUs.
- Keep unpublished products out of public catalog responses.
- Do not commit `.env.local`, secrets, browser profiles, cookies or temporary logs.

## Tasks

### Task 1: Git and provenance audit

- Record status, branches, remotes, graph, stashes, local/remote divergence, staged/unstaged changes and untracked paths.
- Classify agent ownership only where Git evidence supports it; report shared/indistinguishable history honestly.
- Fetch remote refs without changing working files.

### Task 2: Data-preservation regression

- Reproduce the inventory integrity mismatch after the published pilot.
- Add a failing regression asserting that editorial approval does not erase imported `reviewReason`.
- Remove only the destructive metadata assignment from `src/lib/publication-service.ts`.
- Restore the affected development row from the audited ACSOFT value and rerun inventory integrity checks.

### Task 3: Schema and migration audit

- Run Drizzle migration consistency checks.
- Compare migration files/journal with applied development migrations.
- Audit table coverage, taxonomy hierarchy, foreign-key relationships, indexes/constraints through the existing schema and read-only SQL checks.

### Task 4: Backend and contract audit

- Run the complete official test runner plus API contract, RBAC and workflow regression wrappers when available.
- Check public catalog/search/quote contracts, administrative route contracts, idempotency, transaction and authorization guards.
- Verify Clerk webhook validation and host-independent auth configuration without printing secrets.

### Task 5: Runtime smoke audit

- Start the application from the RC candidate.
- Check `/api/health`, public routes, catalog/category/family/brand/search/product/quote/auth/account/FAQ routes, and administrative routes.
- Exercise only safe reversible actions; do not create fake sales, payments, stock or quote records.
- Document UI-only findings for Codex1 and correct only backend/contract/runtime defects.

### Task 6: RC branch and clean-checkout gate

- Commit valid source, test and audit documentation changes.
- Create `release/coldpower-v1.0-rc1` from the consolidated commit without force operations.
- Push the RC branch and record its final SHA/remote status.
- Verify a clean checkout can install dependencies, load development environment variables, run migrations as needed, build and start.

### Task 7: Release report

- Record initial/final branch state, commits, migrations, data counts, test/build/lint/typecheck results, runtime checks, bugs fixed, UI handoff items and production risks.
