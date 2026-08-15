# ColdPower Inventory Database Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the provisional hardcoded catalog with the 1,348 validated rows from `IMPORT_PRODUCTOS`, persisted in the existing Drizzle/Neon architecture, while preserving technical NULLs, stable SKUs/slugs, quote snapshots, and a reproducible QA path.

**Architecture:** Add normalized catalog dimensions (`categories`, `families`, `brands`) and a persistent `products` table with SKU uniqueness, stable slug, source/audit fields, and technical attributes. The Next.js catalog becomes server-driven through an async repository; the Excel is consumed only by an idempotent import command and never at runtime. Quotes gain persistent line items and product snapshots while existing quote status history remains compatible.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Drizzle ORM, Neon PostgreSQL, `xlsx` for import-only workbook parsing, `tsx` for the import command, Node test scripts, pnpm.

## Global Constraints

- `IMPORT_PRODUCTOS` is the sole public-catalog source and must contain exactly 1,348 imported products.
- Do not import `EXCLUIDOS_USUARIO`, `FUENTE_ORIGINAL`, `VALIDACION_31`, `POSIBLES_DUPLICADOS`, or `PENDIENTES_REVISION` as products.
- SKU is unique, indexed, stable, and the commercial identity; never regenerate it from an internal ID.
- Category and family are distinct persisted entities; frontend menus and filters must query them rather than hardcode them.
- Preserve every useful source column, including original names/codes, review flags, duplicate metadata, normalization metadata, source page, and source row.
- Technical NULLs remain NULL; never invent stock, price, compatibility, availability, or technical specifications.
- Imports are idempotent upserts by SKU and must not delete manual data without an explicit rule.
- Product relationships are only `related` unless an explicit validated compatibility record exists.
- Quotes and quote items must persist in the database; no successful response may silently fall back to memory.
- Do not expose or commit database credentials. `DATABASE_URL` is required for import/runtime persistence.

---

### Task 1: Capture the migration contract and create parser tests

**Files:**
- Create: `scripts/inventory-import.test.mjs`
- Create: `scripts/inventory-import.mjs`
- Modify: `package.json`

**Interfaces:**
- `readImportRows(workbookPath)` returns `{ rows, sheetName, headers }` and reads only `IMPORT_PRODUCTOS`.
- `validateImportRows(rows, expectedCount = 1348)` returns `{ valid, errors, duplicateSkus }`.
- `buildStableSlug(normalizedName, sku)` returns a deterministic URL slug.
- `normalizeSourceRow(row)` returns a typed import record with empty cells represented as `null`.

- [ ] **Step 1: Write failing parser tests** for the required sheet, exact row count, duplicate SKU rejection, NULL preservation, ignored sheets, and stable slug collision suffixes.
- [ ] **Step 2: Run `node --test scripts/inventory-import.test.mjs` and confirm the failure is because the parser exports do not exist.**
- [ ] **Step 3: Implement the pure workbook parser and source-row normalizer using `xlsx`, with explicit header validation and no runtime database access.**
- [ ] **Step 4: Run the focused test again and confirm it passes, then run it against the real workbook to report 1,348 valid rows and zero duplicate SKUs.**

---

### Task 2: Add the normalized Drizzle schema and migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/<generated_catalog_migration>.sql`
- Modify: `src/db/index.ts` only if the repository type needs the new schema exports.

**Interfaces:**
- `categories`, `families`, `brands`, `products`, `quoteItems`, and `productRelations` are exported Drizzle tables.
- `products.sku` and `products.slug` are unique; category/family/brand and search-relevant fields have indexes.
- `quoteItems.productId` references the persistent product and stores `skuSnapshot`, `productNameSnapshot`, and `quantity`.

- [ ] **Step 1: Add schema tests/SQL assertions that require category/family/brand/product tables, SKU uniqueness, stable slug uniqueness, source audit columns, and quote item snapshots.**
- [ ] **Step 2: Run the schema assertions before the schema exists and confirm they fail for the expected missing tables/columns.**
- [ ] **Step 3: Add additive Drizzle tables and generate a non-destructive migration; preserve existing users, quotes, carts, and quote status history.**
- [ ] **Step 4: Inspect generated SQL for unique constraints, foreign keys, indexes, NULL behavior, and absence of destructive drops.**
- [ ] **Step 5: Run schema tests and Drizzle typecheck.**

---

### Task 3: Implement idempotent import and reporting

**Files:**
- Modify: `scripts/inventory-import.mjs` or create `scripts/import-inventory.ts` if the database transaction requires typed Drizzle imports.
- Modify: `package.json` and `pnpm-lock.yaml` to add the import-only dependencies/scripts.
- Create: `scripts/inventory-import.integration.test.mjs` for database-backed checks.

**Interfaces:**
- Command: `pnpm import:inventory -- ./INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`.
- Report fields: `totalRead`, `inserted`, `updated`, `skipped`, `errors`, `categoriesCreated`, `familiesCreated`, `brandsCreated`.
- Re-running the same workbook updates by SKU without changing SKU or stable slug and without duplicating dimensions/products.

- [ ] **Step 1: Add failing tests for one-pass insert, second-pass update, stable dimension reuse, duplicate prevention, and exact report counts.**
- [ ] **Step 2: Run the tests against an isolated test database or explicit `DATABASE_URL` test schema and confirm the expected failures.**
- [ ] **Step 3: Implement a transaction-backed importer: validate all rows first, upsert dimensions by normalized slug, upsert products by SKU, preserve NULLs, and never import excluded sheets.**
- [ ] **Step 4: Run the importer against the real workbook and save the machine-readable report under `tmp/` without committing secrets or generated database credentials.**
- [ ] **Step 5: Execute the importer a second time and verify `inserted` is zero, products remain 1,348, and no SKU duplicates appear.**

---

### Task 4: Replace static catalog reads with the database repository

**Files:**
- Create: `src/lib/catalog-repository.ts`
- Modify: `src/lib/catalog.ts`, `src/types/product.ts`, `src/types/catalog.ts`
- Modify: `src/app/catalogo/page.tsx`, `src/app/categoria/[slug]/page.tsx`, `src/app/producto/[slug]/page.tsx`, `src/app/buscar/page.tsx`, `src/app/comparar/page.tsx`, `src/app/sitemap.ts`
- Modify: `src/components/catalog/*`, `src/components/product/*`, and home catalog components that currently import `src/data/products.ts` or `src/data/categories.ts`.

**Interfaces:**
- `listCatalogProducts(filters, pagination)` returns `{ items, total, page, pageSize, facets }` from PostgreSQL.
- `getCatalogProductBySlug(slug)` and `getCatalogProductsByIds(ids)` return database-backed product view models.
- `listCatalogCategories()` and `listCatalogFamilies(categorySlug?)` return persisted dimensions/counts.
- Product view models expose source status/specifications without fabricating price/stock/compatibility.

- [ ] **Step 1: Add failing route/repository tests for server-side pagination, category/family filtering, SKU/brand/technical search, stable slug lookup, and NULL omission.**
- [ ] **Step 2: Run focused tests and confirm they fail because pages still read static arrays.**
- [ ] **Step 3: Implement repository queries with server-side filtering for SKU, original/normalized name, brand, model, category, family, application, refrigerant, voltage, power, capacitance, and dimensions.**
- [ ] **Step 4: Update pages/components to await repository data, show 24–48 items per page, and remove runtime imports of the product/category arrays.**
- [ ] **Step 5: Add product detail rendering that hides empty attributes and labels unknown availability as “Consultar disponibilidad”.**
- [ ] **Step 6: Run focused tests plus route smoke checks for catalog, all required categories, search examples, product detail, and sitemap.**

---

### Task 5: Persist quote line items and remove silent memory fallbacks

**Files:**
- Modify: `src/db/schema.ts` and the migration if quote columns need additive changes.
- Modify: `src/app/api/cotizacion/route.ts`, `src/app/api/cotizacion/cart/route.ts`
- Modify: `src/lib/quote.ts`, `src/components/quote/QuoteForm.tsx`, `src/components/cart/CartProvider.tsx`, `src/components/cart/CartQuotePanel.tsx`
- Create/modify: `src/app/api/catalog/products/route.ts` for cart item hydration.

**Interfaces:**
- Quote creation accepts a list of `{ productId, quantity }`, resolves persistent products, and snapshots SKU/name into `quote_items` in the same transaction as the quote.
- Existing single-product form payload remains backward compatible by resolving its SKU/slug to one quote item.
- Database outage returns a non-success response with an actionable message; it never reports a successful “temporary” quote.

- [ ] **Step 1: Add failing tests for multi-item quote persistence, snapshot immutability, unknown product rejection, and no-memory-success behavior.**
- [ ] **Step 2: Run the tests and confirm they fail against the current single-product/memory fallback implementation.**
- [ ] **Step 3: Implement quote/quote-item transaction handling and persistent cart hydration using product IDs from the database.**
- [ ] **Step 4: Update UI copy that calls the API/cart temporary and preserve WhatsApp as a communication channel, not the persistence layer.**
- [ ] **Step 5: Run quote API integration tests and verify status history remains intact.**

---

### Task 6: Persist project rules and handle legacy data safely

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/inventory-migration.md`
- Create: `tmp/legacy-products-backup.ts` outside runtime import paths before removing/reclassifying legacy data.
- Modify/delete only after verification: `src/data/products.ts`, `src/data/categories.ts`, and legacy imports.

- [ ] **Step 1: Add the required ColdPower rules to `AGENTS.md`: SKU identity, category/family separation, no invented technical/commercial values, idempotent imports, NULL preservation, explicit compatibility, database runtime truth, and reproducible migrations.**
- [ ] **Step 2: Document legacy 1,359-row origin, migration mapping, backup location, URL/slug policy, and rollback steps.**
- [ ] **Step 3: Remove runtime imports of legacy arrays and only then archive/delete the obsolete source file after repository search proves it is unused.**
- [ ] **Step 4: Verify no public route depends on the old provisional dataset.**

---

### Task 7: Full validation and handoff

**Files:**
- Modify: `package.json` with `test:inventory`, `test:catalog-db`, `test:qa-full` scripts.
- Create: `scripts/qa-inventory-full.mjs`.
- Update: `docs/inventory-migration.md` with exact execution results.

- [ ] **Step 1: Run exact data checks: 1,348 products, unique SKUs, persisted dimensions, required category routes, search examples, NULL rendering, and no fictitious commercial data.**
- [ ] **Step 2: Run importer twice and verify idempotency.**
- [ ] **Step 3: Restart the local app and repeat persistence/API checks.**
- [ ] **Step 4: Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, existing `pnpm test:all`, inventory tests, and full QA scripts.**
- [ ] **Step 5: Update the plan with evidence, list remaining blockers such as missing real company data or database credentials, and only mark the goal complete when every requirement is verified.**
