# CP-026B Public Commerce Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert ColdPower’s public Next.js experience into a product-first technical ecommerce while preserving all current catalog, search, quote, CMS, authentication, and persistence contracts.

**Architecture:** Keep existing server repositories and route contracts intact. Introduce a small public visual system around shared tokens, search, media slots, category/product/banner primitives, and accessible mobile controls; then compose those primitives across the shell, home, catalog, product, quote, institutional, and error pages. All content remains sourced from the current catalog/CMS/company settings or an explicit placeholder.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, `lucide-react`, `next/image`, existing Drizzle/Neon repositories, existing Playwright/browser tooling.

## Global Constraints

- Preserve existing backend, Neon, Drizzle, catalog, products, categories, families, brands, search, quote persistence, inventory, Kardex, authentication, RBAC, and editorial logic.
- Never invent price, stock, availability, compatibility, brand claims, payment methods, WhatsApp numbers, product photos, or business claims.
- The public catalog remains server-side and paginated; do not reintroduce hardcoded product/category arrays as runtime data sources.
- Reuse active CMS/media assets and existing placeholders; do not download arbitrary product imagery.
- Keep the working tree’s unrelated changes; edit only files needed by CP-026B and do not reset or checkout existing work.
- Use existing IBM Plex Sans/Mono and current ColdPower navy/blue/orange identity.
- Verify with focused tests, typecheck, lint, build, browser smoke flows, and real screenshots at desktop/tablet/mobile widths.

---

### Task 1: Establish public design tokens and baseline shell primitives

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/shared/Button.tsx`
- Modify: `src/components/shared/Badge.tsx`
- Create: `src/components/shared/SearchBar.tsx`
- Create: `src/components/shared/PublicPageHeader.tsx`
- Test: `scripts/cp026b-public-ui-contract.test.mjs`

**Interfaces:**
- `SearchBar({ action?: string; id: string; placeholder?: string; className?: string; compact?: boolean })` renders a labeled GET search form whose query field is named `q` and whose action defaults to `/buscar`.
- `PublicPageHeader({ eyebrow?: string; title: string; description?: string; children?: ReactNode })` renders a semantic page heading with optional action content.
- Existing `Button` and `Badge` props remain source-compatible; only visual variants/classes change.

- [ ] **Step 1: Add failing contract assertions.** Create `scripts/cp026b-public-ui-contract.test.mjs` that reads the shared files and asserts the token names, `SearchBar`, and `PublicPageHeader` exports exist, plus that public copy does not contain “Solicitud persistente” or “fuente runtime”.
- [ ] **Step 2: Run the contract and confirm it fails.** Run `node --test scripts/cp026b-public-ui-contract.test.mjs`; expect failures for the missing shared components.
- [ ] **Step 3: Define tokens and shared primitives.** Extend `globals.css` with page/container/section spacing, surface, focus, shadow, and responsive variables; add reduced-motion-safe reveal utilities and avoid changing existing semantic variable names. Implement `SearchBar` with a `Search` icon, accessible label, `q` input, 44px minimum control height, and submit button only when the caller requests it. Implement `PublicPageHeader` with one `h1`, optional eyebrow, description, and action slot.
- [ ] **Step 4: Refine shared controls.** Update `Button` and `Badge` so primary actions use orange, secondary actions use quiet outlines/links, focus states are visible, and no caller loses an existing variant or prop.
- [ ] **Step 5: Run the focused contract.** Run `node --test scripts/cp026b-public-ui-contract.test.mjs`; expected result: PASS.

### Task 2: Redesign the public header, navigation, mobile menu, and footer

**Files:**
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/TechnicalNav.tsx`
- Modify: `src/components/layout/MobileMenu.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/app/layout.tsx`
- Test: `scripts/cp026b-public-ui-contract.test.mjs`

**Interfaces:**
- `Header({ authEnabled?: boolean; categories: CatalogCategory[] })` keeps its current props and all existing links/actions.
- `MobileMenu` keeps its current `isOpen`, `onClose`, `links`, `authEnabled`, and `categories` contract.
- `Footer({ categories: CatalogCategory[] })` keeps its current prop and only renders configured contact/payment/reclamation content.

- [ ] **Step 1: Add shell assertions.** Extend the contract to assert that the header exposes a prominent search field, “Todas las categorías”, mobile `aria-expanded` menu state, and no visible internal copy; assert footer includes category/help/contact columns and reclamaciones access.
- [ ] **Step 2: Run the failing contract.** Run `node --test scripts/cp026b-public-ui-contract.test.mjs`; capture the exact assertions that fail against the current markup.
- [ ] **Step 3: Implement desktop shell.** Compose `TopBar` as a short optional trust strip only when configured. Make the main header row logo/search/account/quote-cart oriented, make the search occupy the flexible center, and move the short commercial nav into a restrained second row. Keep all existing route targets and Clerk/cart/compare actions.
- [ ] **Step 4: Implement mobile shell.** Reduce the mobile row to menu/logo/search/account-or-cart affordances, move full navigation into the existing drawer, add correct `aria-controls`/`aria-expanded`, close on link selection and Escape, and preserve the existing quote/cart navigation.
- [ ] **Step 5: Compact the footer.** Replace repeated badge/card treatments with four readable columns and a compact legal row; render payment methods only from confirmed configuration and keep `/libro-de-reclamaciones`.
- [ ] **Step 6: Run the contract.** Run `node --test scripts/cp026b-public-ui-contract.test.mjs`; expected result: PASS.

### Task 3: Build the image-led home composition

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/home/Hero.tsx`
- Modify: `src/components/home/CategoriesGrid.tsx`
- Modify: `src/components/home/ProductSection.tsx`
- Modify: `src/components/home/PromoBanner.tsx`
- Modify: `src/components/home/BrandsSection.tsx`
- Modify: `src/components/home/AssistanceSection.tsx`
- Modify: `src/components/home/BenefitsBar.tsx`
- Modify: `src/components/home/ApplicationSolutions.tsx`
- Modify: `src/components/home/ComplementsSection.tsx`
- Create: `src/components/home/CategoryCard.tsx`
- Create: `src/components/home/BannerPair.tsx`
- Test: `scripts/cp026b-home-contract.test.mjs`

**Interfaces:**
- `CategoryCard({ href: string; name: string; count?: number; imageSrc?: string; imageAlt?: string })` renders a linked visual category card with a safe placeholder fallback.
- `BannerPair({ banners: Array<{ title: string; body?: string; href?: string; imageSrc?: string; imageAlt?: string }> })` renders at most two administrable banner slots and omits invalid CTA/image data.
- Existing `Hero`, `CategoriesGrid`, and `ProductSection` continue to consume repository-derived categories/products/brands.

- [ ] **Step 1: Add home contract tests.** Create `scripts/cp026b-home-contract.test.mjs` asserting the home source contains the commercial headline/search, category visual slot, product grid, brands, assistance, benefits, and no fake WhatsApp/payment claim.
- [ ] **Step 2: Run the failing tests.** Run `node --test scripts/cp026b-home-contract.test.mjs`; expect failures for the new composition markers.
- [ ] **Step 3: Implement the hero.** Replace the panel-heavy hero with an edge-to-edge navy/visual section: short headline, one-line support copy, shared `SearchBar`, “Explorar catálogo”, “Solicitar cotización”, and the existing hero SVG as a bounded visual slot. Keep `priority`, `sizes`, alt text, and a calm responsive crop.
- [ ] **Step 4: Implement category cards.** Add `CategoryCard` using existing category placeholder/assets only; update `CategoriesGrid` to select real categories, show counts, use a responsive grid/scroll treatment, and avoid an all-navy card grid.
- [ ] **Step 5: Recompose products and commercial sections.** Keep `ProductSection` as the reusable product-first section, reduce explanatory copy, use a subtle section divider/background, and compose `PromoBanner`/`BannerPair` around valid CMS/fallback content without inventing promotions. Keep `ApplicationSolutions`/`ComplementsSection` only where their data is backed by existing categories/families.
- [ ] **Step 6: Rework brands, assistance, and benefits.** Make brands a clean typographic grid, make assistance a high-visibility final CTA with future-photo affordance but no fake upload action, and reduce benefits to at most four configured claims.
- [ ] **Step 7: Verify home contract.** Run `node --test scripts/cp026b-home-contract.test.mjs`; expected result: PASS.

### Task 4: Redesign the standard product card and catalogue result grid

**Files:**
- Modify: `src/components/catalog/ProductCard.tsx`
- Modify: `src/components/catalog/ProductGrid.tsx`
- Modify: `src/components/catalog/EmptyState.tsx`
- Modify: `src/components/catalog/AppliedFilters.tsx`
- Modify: `src/components/catalog/CatalogPagination.tsx`
- Create: `src/components/catalog/ProductMedia.tsx`
- Test: `scripts/cp026b-product-card-contract.test.mjs`

**Interfaces:**
- `ProductMedia({ src?: string | null; alt: string; sizes?: string; priority?: boolean; className?: string })` renders `next/image` for valid local/media URLs and the existing product placeholder otherwise.
- `ProductCard({ product: Product })` remains source-compatible and keeps product href, tracking, compare, and add-to-quote behavior.
- `ProductGrid({ products: Product[] })` remains source-compatible.

- [ ] **Step 1: Add failing product-card tests.** Create `scripts/cp026b-product-card-contract.test.mjs` asserting ProductMedia fallback, no fabricated pricing/stock, SKU/spec fields, and existing add-to-quote link markers.
- [ ] **Step 2: Run the tests.** Run `node --test scripts/cp026b-product-card-contract.test.mjs`; expect at least the ProductMedia assertion to fail.
- [ ] **Step 3: Implement ProductMedia.** Use the product placeholder for missing/invalid images, reserve a stable aspect ratio, set `sizes`, and label category representations as referential. Do not change product data.
- [ ] **Step 4: Recompose ProductCard.** Give the image most of the card height, reduce border/shadow weight, order brand/name/SKU/specs/status/price/CTA, hide empty technical rows, and use “Solicitar cotización” whenever price is null. Preserve compare and add-to-quote event handlers.
- [ ] **Step 5: Refine grid and states.** Ensure `ProductGrid` supports 2 columns mobile, 3 tablet, and 4 desktop; make empty states compact and actionable; keep applied filter chips and pagination URLs unchanged.
- [ ] **Step 6: Run focused tests.** Run `node --test scripts/cp026b-product-card-contract.test.mjs`; expected result: PASS.

### Task 5: Redesign catalog, category, brand, and search result pages

**Files:**
- Modify: `src/app/catalogo/page.tsx`
- Modify: `src/app/categoria/[slug]/page.tsx`
- Modify: `src/app/buscar/page.tsx`
- Modify: `src/components/catalog/CatalogFilters.tsx`
- Modify: `src/components/catalog/SearchResults.tsx`
- Create: `src/components/catalog/MobileFilterDrawer.tsx`
- Test: `scripts/cp026b-catalog-contract.test.mjs`

**Interfaces:**
- `MobileFilterDrawer({ open: boolean; onClose: () => void; children: ReactNode; title?: string })` is a client component with focusable close control and a `role="dialog"`/`aria-modal="true"` surface.
- `CatalogFilters` retains current `filters`, `action`, `showCategory`, `categories`, `families`, and `brands` props and URL field names.
- Server pages retain existing `searchParams` and repository calls.

- [ ] **Step 1: Add catalog contract tests.** Assert source-level presence of public page heading/count, `SearchBar`, `AppliedFilters`, desktop filter/result layout, mobile filter trigger/drawer, compact empty state, and unchanged `q/categoria/familia/marca/disponibilidad/orden` names.
- [ ] **Step 2: Run the tests.** Run `node --test scripts/cp026b-catalog-contract.test.mjs`; expect failures for the new layout markers.
- [ ] **Step 3: Implement mobile drawer.** Add a client drawer with body scroll lock, Escape/click-close, `aria-labelledby`, focus return, and no URL mutation until the existing filter form submits.
- [ ] **Step 4: Recompose filters.** Make desktop filters compact and calm, remove the giant orange submit treatment, preserve all backed options, and add a mobile trigger in the page layout.
- [ ] **Step 5: Recompose catalog pages.** Use `PublicPageHeader`, count real products, show search and chips before results, place filters/results in 25/75 desktop columns, and make the grid the visual focus. Keep pagination, category/family hierarchy, brands, and unavailable/error states.
- [ ] **Step 6: Apply the same result hierarchy to category/search pages.** Use the same product grid and states for `/categoria/[slug]` and `/buscar`; if `/marca/*` is present, apply the same public header and grid treatment without changing repository logic.
- [ ] **Step 7: Run catalog tests.** Run `node --test scripts/cp026b-catalog-contract.test.mjs`; expected result: PASS.

### Task 6: Redesign product detail and quote flows

**Files:**
- Modify: `src/components/product/ProductDetail.tsx`
- Modify: `src/components/product/ProductGallery.tsx`
- Modify: `src/components/product/TechnicalIdentity.tsx`
- Modify: `src/components/product/TransactionBox.tsx`
- Modify: `src/components/product/CompatibilityPanel.tsx`
- Modify: `src/app/producto/[slug]/page.tsx`
- Modify: `src/app/cotizacion/page.tsx`
- Modify: `src/components/quote/QuoteForm.tsx`
- Modify: `src/components/quote/QuoteSummary.tsx`
- Modify: `src/components/cart/CartQuotePanel.tsx`
- Modify: `src/components/quote/QuoteSuccess.tsx`
- Create: `src/components/quote/QuoteLineItem.tsx`
- Test: `scripts/cp026b-product-quote-contract.test.mjs`

**Interfaces:**
- Existing product components keep their current `Product`/callback props and continue calling current quote/cart actions.
- `QuoteLineItem({ name: string; sku?: string; imageSrc?: string | null; quantity: number; onRemove?: () => void; onDecrease?: () => void; onIncrease?: () => void })` renders a compact quote summary line.
- `QuoteSummary` remains compatible with `product?: Product` and can additionally render cart lines when supplied by the existing cart context.

- [ ] **Step 1: Add failing product/quote contracts.** Assert 50/50 detail structure, image fallback, technical identity, related-products labeling, quote headings, no “Solicitud persistente”, and primary “Solicitar cotización” CTA.
- [ ] **Step 2: Run the tests.** Run `node --test scripts/cp026b-product-quote-contract.test.mjs`; record failures.
- [ ] **Step 3: Recompose product detail.** Keep existing repository data and related-product calls, but change the visual layout to gallery/information columns, reduce auxiliary boxes, show only non-empty spec blocks, and preserve compatibility safety wording.
- [ ] **Step 4: Improve gallery/media.** Use the shared fallback slot, stable image dimensions, accessible thumbnail buttons where current gallery data supports them, and responsive stacking.
- [ ] **Step 5: Recompose transaction box and mobile CTA.** Make quote the primary orange action, keep secondary inquiry/WhatsApp only when configured, and add a non-obstructive mobile sticky action if the existing transaction component can expose it safely.
- [ ] **Step 6: Recompose quote page.** Put cart/request summary beside a grouped form, use “¿Qué repuesto necesitas?” for no-product state, remove infrastructure language, preserve current API submission and success/error states, and keep all existing field names/validation.
- [ ] **Step 7: Add quote line item only around existing cart data.** Show image/name/SKU/quantity/remove controls without inventing price or stock; preserve quantity/remove callbacks from `CartProvider`.
- [ ] **Step 8: Run focused tests.** Run `node --test scripts/cp026b-product-quote-contract.test.mjs`; expected result: PASS.

### Task 7: Normalize institutional, public error, and unavailable states

**Files:**
- Modify: `src/app/nosotros/page.tsx`
- Modify: `src/app/contacto/page.tsx`
- Modify: `src/app/faq/page.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/components/catalog/CatalogUnavailable.tsx`
- Modify: `src/components/shared/FinalCTA.tsx`
- Modify: `src/components/shared/WhatsAppCTA.tsx`
- Test: `scripts/cp026b-public-pages-contract.test.mjs`

**Interfaces:**
- Existing route params, data imports, form actions, and company settings remain unchanged.
- `CatalogUnavailable` keeps its current title/description props.
- `WhatsAppCTA` remains configuration-gated and must render nothing when no real number exists.

- [ ] **Step 1: Add public-page assertions.** Assert every required public route has a public heading, consistent CTA/surface markers, and no internal infrastructure language; assert WhatsApp remains conditional.
- [ ] **Step 2: Run the tests.** Run `node --test scripts/cp026b-public-pages-contract.test.mjs`; expect failures for current copy/layout.
- [ ] **Step 3: Apply shared page hierarchy.** Use `PublicPageHeader`/shared spacing on Nosotros, Contacto, FAQ and unavailable/404 states; reduce text density and preserve legally/operationally required content.
- [ ] **Step 4: Refine CTA gating and error surfaces.** Keep WhatsApp and contact claims sourced from settings, make error states compact and helpful, and ensure 404 has catalog/contact actions.
- [ ] **Step 5: Run the contract.** Run `node --test scripts/cp026b-public-pages-contract.test.mjs`; expected result: PASS.

### Task 8: Add visual smoke tests and produce required screenshots

**Files:**
- Create: `scripts/cp026b-visual-smoke.mjs`
- Create: `tmp/qa-cp026b/.gitkeep`
- Modify: `package.json` only if a clean existing Playwright command is unavailable
- Test output: `tmp/qa-cp026b/*.png`

**Interfaces:**
- The smoke runner starts against an already-running local server or accepts `BASE_URL`; it does not seed or mutate database data.
- Screenshot names are stable: `home-desktop.png`, `catalog-desktop.png`, `product-desktop.png`, `quote-desktop.png`, `home-tablet.png`, `catalog-tablet.png`, `product-tablet.png`, `home-mobile.png`, `menu-mobile.png`, `catalog-mobile.png`, `filters-mobile.png`, `product-mobile.png`, `quote-mobile.png`.

- [ ] **Step 1: Write the smoke runner.** Use the project’s available Playwright/browser dependency and assert each route returns a successful document, body has no horizontal overflow, and key landmarks/search exist. Use viewport 1440x1000, 1024x1000, 768x1000, and 390x844.
- [ ] **Step 2: Implement interaction captures.** Open the mobile menu and capture `menu-mobile.png`; open the catalog filter drawer and capture `filters-mobile.png`; choose a product link from catalog when available before product captures.
- [ ] **Step 3: Run the smoke runner.** Start the app with the existing local command, run `BASE_URL=http://127.0.0.1:3000 corepack pnpm exec tsx scripts/cp026b-visual-smoke.mjs` or the equivalent available command, and inspect all PNGs.
- [ ] **Step 4: Fix visual defects found by inspection.** Correct overflow, contrast, clipping, missing placeholders, layout shift, or broken controls in the smallest responsible component; rerun screenshots after each correction.

### Task 9: Run full regression verification and document handoff

**Files:**
- Modify: `scripts/test-all.mjs` only if focused CP-026B contracts are not picked up automatically
- Create: `docs/superpowers/qa/2026-08-12-cp-026b-qa.md`

- [ ] **Step 1: Run focused contracts.** Run all `node --test scripts/cp026b-*.test.mjs` and fix failures without weakening assertions.
- [ ] **Step 2: Run existing public regressions.** Run `corepack pnpm test:phase3`, `corepack pnpm test:phase4`, `corepack pnpm test:phase5`, `corepack pnpm test:phase8`, `corepack pnpm test:phase10`, `corepack pnpm test:phase15`, `corepack pnpm test:phase16`, `corepack pnpm test:phase17`, `corepack pnpm test:phase18`, `corepack pnpm test:phase19`, `corepack pnpm test:phase20`, and relevant CMS/media tests.
- [ ] **Step 3: Run static/build checks.** Run `corepack pnpm exec tsc --noEmit`, `corepack pnpm lint`, and `corepack pnpm build`; fix errors caused by CP-026B.
- [ ] **Step 4: Write the QA handoff.** Record the initial diagnosis, architecture, reused/new components, conceptual before/after for home/catalog/product/quote, header/footer/responsive/tokens/accessibility/performance, screenshot paths, tests, typecheck/lint/build, regressions, pending risks, required ColdPower assets, and recommended next ticket. Clearly separate verified results from unavailable external configuration.
- [ ] **Step 5: Inspect final diff.** Run `git status --short`, `git diff --stat`, and `git diff --` for only CP-026B files; do not commit or push unrelated changes.

