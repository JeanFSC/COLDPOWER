# Public Home V2 — Design QA — 2026-09-22

- source visual truth: `C:\Users\jean_\.codex\attachments\5fcd37c9-7265-4731-8f2f-1665e1ab89f3\image-1.png` plus `pasted-text-1.txt`.
- implementation report: `docs/qa/public-home-v2-redesign-2026-09-22.md`.
- implementation route: `/` in the current COLDPOWER checkout.
- browser evidence: authenticated Brave Personal QA tab, CSS viewport 1920 × 1080 at 100% zoom; responsive checks at 1440, 1024 and 390 CSS widths. The browser connector emitted the implementation capture but did not expose a filesystem path for it.
- visual state: header/search/nav, HVAC hero, real catalog categories/products/brands, workflow, benefits, commercial banner, sectors, assistance, FAQ and footer reviewed against the supplied reference.
- data state: PostgreSQL returned 1 category, 4 products and 3 brands. No synthetic catalog data, prices, stock, compatibility or availability was introduced. The category grid compacts to the real data count.
- interaction evidence: real `Embraco` search, FAQ `aria-expanded`, mobile menu, real CTAs, and no horizontal overflow at the requested responsive widths.
- automated evidence: TypeScript PASS; ESLint PASS with 0 errors and 20 pre-existing warnings; focused catalog/compatibility tests 3/3 PASS; production build PASS. Inventory is 19/20 because the external canonical workbook is absent. The ESLint config now ignores local `.claude/**` and `.remember/**` tooling artifacts.

final result: passed

## M10-06 final corrections from re-audit v2 - 2026-09-25

- source visual truth: `docs/goal/usabilidad/gemini/v2/informe.md` and the corresponding Gemini v2 captures; the implementation scope was the 13 defects listed in `docs/goal/briefs/M10-06-final.md`.
- implementation routes: `/admin/dashboard`, `/admin/pagos`, `/admin/ventas`, `/admin/precios`, `/admin/auditoria`, `/admin/notificaciones`, `/admin/reportes`, `/admin/catalogo/product-cp-ref-ven-0844`, `/cuenta/pagos`, and the shared public shell/footer.
- runtime: local authenticated dev bypass on `http://localhost:3006`, local database environment, Playwright Chromium launched headless with `GPU_ARGS`; validation used 1920 x 1080 and 390 x 844 at 100% zoom.
- evidence: `docs/goal/evidencia/m10/final/` contains before/after captures and DOM text for every touched surface, plus `m10-06-final-qa.json` and `m10-06-final-console.json`.
- payment and sales semantics: method values are centralized and grouped; raw provider codes, duplicate payment-method rows, `PAGO-PENDING`, and invented channels are absent. Payment codes are stable and deterministic.
- product and pricing semantics: missing validity is rendered as the standalone `Sin fecha de vigencia registrada`, price text wraps inside the reference card, and the pricing timestamp remains readable at the narrow layout.
- audit and notifications: operational audit codes use Spanish labels; the notifications detail defaults to the requested notification, otherwise the first unread/available real row, and test references are sanitized in the visible detail.
- media: missing physical media keeps a 200 response with a family/category/neutral referential fallback and an explicit response header; it does not silently return a broken image or invent a product asset.
- interactions: the notification detail, product `Precios` to `Ficha` return path, keyboard focus traversal, responsive overflow, and date-input help text were exercised without creating mutations.
- accessibility/runtime: 20 route/viewport checks returned HTTP 200, no horizontal overflow was detected, axe reported 0 violations in every check, and there were 0 console errors/page errors. Known development warnings from Clerk/Next are recorded in `m10-06-final-console.json`.
- automated verification: focused M10-06 tests 6/6 PASS; `corepack pnpm exec tsc --noEmit` PASS; `corepack pnpm lint` PASS; `corepack pnpm build` PASS; `corepack pnpm test:all` runs all relevant groups but is 19/20 in the inventory group because the external workbook is absent at `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.

final result: passed with the external inventory-workbook prerequisite documented

## M10-04 lote 2 · Taxonomía, Proveedor, Producto y Configuración · 2026-09-25

- source visual truth: `docs/goal/designs/m10-lote2/` and `docs/goal/designs/m10-lote2/spec.md`; implementation followed the brief in `docs/goal/briefs/M10-04-lote2.md` in the requested order.
- data state: all four routes use PostgreSQL through the existing repositories/services. The visual reference values were not copied when the local database contained different or empty records.
- responsive evidence: each route was inspected in the authenticated personal Brave session and captured at CSS viewports 1920 × 1080 and 390 × 844. Cards keep content-driven height, text stays at the brief minimums, and mobile navigation/content remain within the viewport.
- interaction evidence: Taxonomía brand drawer and real published-count deactivation dialog; Proveedor edit drawer with cancel; Producto Ficha/Precios/Imágenes tabs, editorial drawer, checklist-disabled publish; Configuración Empresa/Precios e IGV/Integraciones/Historial tabs, RUC validation and discard.
- accessibility evidence: axe results are stored per route under `docs/goal/evidencia/m10/lote2/`; final `violations` and `incomplete` arrays are empty for all four routes. Console evidence records zero errors per route.
- evidence folders: `docs/goal/evidencia/m10/lote2/taxonomia/`, `proveedor/`, `producto/`, and `configuracion/` each include desktop/mobile captures, comparison report, axe, console, snapshots, and SQL journey.

final result: passed

# ColdPower visual QA

- source visual truth path: `C:\Users\JEAN\.codex\attachments\31ec516c-03fb-4ae4-af3a-050d0e2a8425\image-1.png`
- source dimensions: 1536x1024 pixels
- implementation captures:
  - `output/playwright/cp026b-home-1440.png` Ã¢â‚¬â€ 1440x900 viewport
  - `output/playwright/cp026b-home-1024.png` Ã¢â‚¬â€ 1024x768 viewport
  - `output/playwright/cp026b-home-final.png` Ã¢â‚¬â€ 1280x720 viewport
  - `output/playwright/cp026b-catalogo.png` Ã¢â‚¬â€ 1280x720 viewport
  - `output/playwright/cp026b-cotizacion.png` Ã¢â‚¬â€ 1280x720 viewport
  - `output/playwright/cp026b-sign-in.png` Ã¢â‚¬â€ 1280x720 viewport
  - `output/playwright/cp026b-sign-up-final.png` Ã¢â‚¬â€ 1280x720 viewport
  - `output/playwright/cp026b-mobile-home.png` Ã¢â‚¬â€ 393x659 viewport
  - `output/playwright/cp026b-mobile-menu.png` Ã¢â‚¬â€ 393x659 viewport
- density normalization: screenshots captured at CSS scale 1; no device-frame normalization required.
- state: public signed-out state; authentication provider is not configured in `.env.local`; catalog runtime returned zero published products.

## Comparison evidence

Full-view comparison confirmed the requested direction: navy top shell, compact white header, prominent technical search, orange quote action, secondary category navigation on desktop, light product-first hero, product/category grid structure, promotional banner, compact benefits strip, and responsive mobile drawer.

Focused checks covered header actions, hero composition and asset load, catalog filter/results shell, quote summary/form shell, sign-in/register routes, mobile header/menu, horizontal overflow, and browser console errors.

## Findings and fixes

- P1 Ã¢â‚¬â€ Initial mobile capture showed the desktop technical navigation consuming mobile space. Fixed by hiding `TechnicalNav` below `lg`; mobile now presents logo, cart, menu, and search, with category navigation inside the drawer.
- P2 Ã¢â‚¬â€ The existing homepage contract rejected `PromoBanner`, despite the ticket requiring a promotional banner. Updated the stale assertion to continue rejecting removed testimonials/FAQ while permitting the required banner.
- P2 Ã¢â‚¬â€ The runtime catalog currently reports `0 referencias` and shows the empty state. This is a data/environment state, not a fabricated UI failure; no fake products or stock were added.
- P3 Ã¢â‚¬â€ Some legacy public copy outside the touched surfaces still lacks accent normalization. It does not affect the new header, hero, auth routes, or responsive behavior.

## Functional checks

- Header links: Iniciar sesiÃƒÂ³n, Registrarse, Comparar, CotizaciÃƒÂ³n, carrito Ã¢â‚¬â€ verified in browser snapshots.
- Auth routes `/sign-in` and `/sign-up`: load and cross-link correctly; Clerk components render when configured, honest fallback renders when not configured.
- Mobile menu: opens as modal dialog and exposes Iniciar sesiÃƒÂ³n / Registrarse Ã¢â‚¬â€ verified at 393px.
- Catalog route: loads filters, empty state, and quote CTA Ã¢â‚¬â€ verified in browser snapshot.
- Quote route: loads empty request state and full client form Ã¢â‚¬â€ verified in browser snapshot.
- Horizontal overflow at 1024px: none.
- Browser console at 1024px: 0 errors, 0 warnings.

## Automated verification

- TypeScript: PASS
- ESLint: PASS
- CP-026B UI contract: PASS
- CP-026B shell contract: PASS
- Home/catalog/category/quote/navigation/facets/product/quote-events/SEO-media contracts: PASS
- Next production build: compiled successfully, but the sandbox blocks Next worker creation with `spawn EPERM`.

## Final result

passed

## CP-036 cotizaciones — QA visual y funcional

- source visual truth: `C:\Users\jean_\.codex\attachments\816f43dd-34ca-4c86-bc5a-c69dbf1c0fba\image-1.png`
- implementation route: `/admin/cotizaciones`
- local evidence: `docs/qa/cp036-quotes-browser-1280x720.png`, `docs/qa/cp036-quote-detail.png`, `docs/qa/cp036-quote-create.png`
- visual comparison: el shell, sidebar, topbar, cuatro KPI, barra de filtros, tabla, rail y jerarquía tipográfica siguen la referencia. La nueva cotización mantiene la CTA naranja requerida por el ticket; la tabla se convierte en cards bajo `md` y el drawer ocupa la pantalla en mobile.
- browser evidence: local authenticated session rendered 80 persisted quotes; canonical filters, detail drawer, tabs, create drawer and accepted-without-snapshot guard were checked. Clean tab reported 0 console errors and no document overflow at 1280×720; only the expected Clerk development-key warning remained.
- unresolved environment: `https://dev.coldpower.pe/admin/cotizaciones` requires sign-in, and the integrated browser exposes a fixed 1280×720 viewport, so the required exact 1440/1024/768/390 captures cannot be produced in this session.

See the full implementation and blocker report in `docs/qa/cp036-quotes-redesign-2026-08-31.md`.

final result: blocked

## Catálogo admin — corrección KPI y filtros — 2026-09-12

- source visual truth: segunda captura adjunta por Jean en esta conversación, correspondiente al módulo Dashboard. Su tarjeta KPI es el componente visual de referencia para Catálogo.
- implementation target: `https://dev.coldpower.pe/admin/catalogo`.

**Findings**

- [P0 fixed] Se retiraron los siete snapshots sintéticos insertados por error. La base conserva únicamente el snapshot real del 12 de septiembre: 1,348 / 4 / 1,344 / 57 / 62.
- [P1 fixed in code] Catálogo ahora replica la composición del KPI Dashboard: tarjeta de 172 px, icono de 48 px, tipografía de 26 px, delta con flecha y el componente compartido `AdminSparkline`. Si no hay una serie real, comunica “Sin serie diaria disponible” y no fabrica una línea.
- [P1 fixed in code] La búsqueda incorpora submit accesible y los filtros mantienen una composición principal y una fila de utilidades separada.

**Verification status**

- TypeScript: passed.
- Servicio de catálogo: passed; cada KPI tiene sólo el punto real actual y ninguna comparación inventada.
- Runtime/túnel: passed; `https://dev.coldpower.pe` responde HTTP 200 en modo desarrollo.
- Browser visual comparison at 1920 × 1080: blocked; el navegador personal no está disponible para esta sesión.

final result: blocked

## Catalog KPI trend comparison QA — 2026-09-12

- source visual truth: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-164c1a47-93ea-4fea-9a75-4762dc96a776.png` (364 × 45 px)
- implementation: authenticated Jean Brave tab `http://localhost:3000/admin/catalogo`, visual capture at 1920 × 920 px after load, desktop light state.
- target state: five compact catalog KPIs, each with a semantic-colored microtrend and an explicit comparison against the preceding period.

**Findings**

- [P1 resolved] The earlier implementation expressed catalog participation with a horizontal bar, not temporal movement. It now persists one real daily catalog snapshot and compares the current value with the latest real cut-off from the preceding seven-day period.
- [P1 resolved] There was no historical data at rollout. The rendered initial state says “Comparación disponible en 7 días” and “Histórico iniciando hoy”; it deliberately does not render a fabricated percentage or line. When there are at least two captured daily values, the compact actual-data sparkline replaces that state.
- [P2 resolved] The first browser verification exposed that the new migration was not registered in Drizzle's journal. The migration journal was corrected, the migration was applied, and a second authenticated-browser capture confirmed the loaded catalog route with no runtime error.

**Required fidelity surfaces**

- Typography and copy: retains the compact labels and bold values of the reference; comparison copy is explicit in Spanish and distinguishes a not-yet-comparable baseline.
- Spacing and layout rhythm: five equal cards retain the existing desktop grid and add a low-height chart region separated by a restrained rule, matching the reference's compact data density.
- Colors and tokens: blue, green, orange, red, and purple remain tied to each catalog KPI; comparison direction uses green/red only when a real prior value exists.
- Image and asset fidelity: the source contains no external image asset to reproduce. Icons remain the product's Lucide icons; the microtrend is a data visualization based only on persisted metric observations.
- Content: live PostgreSQL values shown are 1,348 total, 4 published, 1,344 in review, 57 requiring review, and 62 pending duplicates. No values were invented.

**Interaction and browser checks**

- Used Jean's authenticated Brave profile only, in separate catalog validation tabs; existing personal tabs were not changed.
- Verified the five cards remain navigable links to their corresponding catalog filters, the filter panel loads, and the catalog table renders with live data.
- Verified the runtime-error state caused by the unregistered migration no longer appears after applying migration `0046_catalog_metric_snapshots`.

**Implementation checklist**

- [x] Persist idempotent daily catalog snapshots in PostgreSQL.
- [x] Compare every KPI with the preceding seven-day period when a real baseline exists.
- [x] Render only observed trend points; disclose the initial collection period.
- [x] Validate in the authenticated user browser.

final result: passed

## M10-03 final corrections - 2026-09-25

- Visual evidence: `docs/goal/evidencia/m10/tienda-pulido/final-corrections/capacitor-quote-only-1920x1080.png`, `capacitor-quote-only-390x844.png`, `carbon-priced-1920x1080.png` and `carbon-priced-390x844.png`.
- Quote-only product: the exact catalog filler is absent from the page and meta description; the former disabled `Solo cotizable` control is replaced by an informational note with an icon.
- Priced product: the real `S/ 90.00` RETAIL price renders with active `Agregar al carrito` and `Cotizar` actions. Persisted `availability_status = in_stock` is respected by the view-model.
- Responsive checks: CSS viewports 1920 x 1080 and 390 x 844, no horizontal overflow; desktop transaction panels remain above the fold and mobile fixed actions remain visible.
- Browser console: no application errors; only the expected Clerk development-key warning was observed.

### Product design review

- Attractive: yes; the note communicates the quote-only state without looking like a dead control.
- Efficient: yes; commercial state, explanation and next action remain grouped.
- Responsive: yes; both target viewports rendered without overflow and the mobile action bar stayed reachable.
- Easy to use: yes; every visible control has an action, while quote-only availability is explicit text.

final result: passed

## M10-03 tienda — pulido de ficha, cotización y responsive — 2026-09-25

- source visual truth: `docs/goal/usabilidad/capturas/baseline-producto-6871-1920x1080.png` y `baseline-producto-6871-390x844.png`.
- implementation route: `http://localhost:3006/producto/capacitor-25-%C2%B5f-450-v-coldpower`, servidor Webpack con `.env.localdb`, viewport 1920 × 1080 y 390 × 844 a 100%.
- implementation evidence: `docs/goal/evidencia/m10/tienda-pulido/final-clean/after-producto-capacitor-25-µf-450-v-coldpower-check-1920x1080.png`, `after-producto-capacitor-25-µf-450-v-coldpower-390x844.png`, `final-journey/after-journey-confirmation-1920x1080.png`.

La comparación final conserva la composición de ficha y galería, elimina el estado fuente editorial, reemplaza el filler de familia por datos reales y lleva el bloque comercial al primer viewport. `Bajo consulta` aparece una vez; la imagen de producto conserva su badge `Imagen referencial`. En móvil la CTA fija permanece visible sin tapar el contenido.

Se validaron búsqueda, ficha, agregado a cotización, formulario mínimo, confirmación, persistencia SQL, 404 y la matriz pública solicitada. El producto y `/faq` tuvieron visitas aisladas `200` en ambos viewports; solo se observó el warning esperado de Clerk de desarrollo. Los warnings/violaciones de axe restantes corresponden a superficies públicas preexistentes y quedan detallados en `docs/goal/evidencia/m10/tienda-pulido/INFORME.md`.

### Product design review

- Attractive: sí; mantiene la referencia y hace dominante la acción comercial.
- Efficient: sí; estado, cantidad y CTA se leen sin abandonar el primer viewport.
- Responsive: sí; galería y CTA fijo fueron inspeccionados en 390 × 844.
- Easy to use: sí; el texto explica qué se confirma y la acción no es ambigua.

Automated verification: TypeScript PASS, lint PASS, build PASS, contratos focalizados PASS; `test:all`/`test:inventory` quedan limitados únicamente por el workbook externo ausente.

final result: passed

## Catalog filter-bar balance — 2026-09-11

**Source visual truth:** `C:/Users/jean_/AppData/Local/Temp/codex-clipboard-45990dd4-2747-40d6-9b2f-3b1c5996ee9d.png` (1718 × 148 CSS-pixel crop supplied by the user).

**Implementation evidence:** browser-rendered `http://localhost:3000/admin/catalogo` in Jean's authenticated Brave profile. The automation screenshot endpoint timed out at the profile's 7680 × 3444 device-pixel capture size after the route had rendered; the live DOM and interaction evidence were still captured in the same browser session.

**Viewport and state:** desktop authenticated catalog, primary filters clear, then advanced filters expanded and collapsed. The browser automation surface reported a high-density 7680 × 3444 capture; a normalized 1920 × 1080 image file could not be saved by the available browser session.

**Comparison history:**

- [P1] The source crop showed a visually unbalanced secondary row: the update timestamp sat beside `Más filtros` while `Limpiar filtros` was isolated at the far edge, leaving a large unstructured gap. The primary search/select grid was already proportionate and was preserved.
- Fix: added a top divider and deliberate vertical rhythm to the action row; kept `Más filtros` as the left-side exploration control; grouped `Actualizado` and `Limpiar filtros` as right-side utility controls; added hover and keyboard-focus states without changing filter semantics.
- Post-fix evidence: authenticated browser confirmed the five primary controls, the balanced utility grouping, the clear-filters link, and the `Más filtros` expansion exposing Familia, Requiere revisión, Duplicado, Confianza de normalización and Estado fuente. The panel returned cleanly to its collapsed state.

**Required fidelity surfaces:**

- Typography: existing compact sizes and weights preserved.
- Spacing and layout rhythm: action row now has a clear boundary and two intentional clusters rather than an accidental void.
- Colors and tokens: uses the existing blue-gray borders, `#fbfcfd` utility surfaces and established primary hover color.
- Assets: no new visual assets required; existing Lucide controls retained.
- Copy and content: all existing user-facing labels and actual catalog data preserved.

**Interaction and accessibility:** `Más filtros` opens and closes successfully in the authenticated browser. Existing native select labels remain available; the updated controls add visible `focus-visible` rings and hover feedback.

**Final result:** blocked

Reason: the available authenticated-browser screenshot endpoint times out while capturing its high-density viewport, so a post-fix image file at the mandated 1920 × 1080 comparison size could not be retained. Functional browser validation passed; no P0/P1/P2 issue remains in the observed live state.

## Catalog KPI visual correspondence — 2026-09-11

**Source visual truth:** `C:/Users/jean_/AppData/Local/Temp/codex-clipboard-9c1b66fa-2c49-4b8c-a9d8-b05972a94dd5.png` (1718 × 161 px user-provided KPI crop). It exposed the defect: five KPI cards contained an unused dashed lower region with no data visual.

**Implementation evidence:** browser-rendered authenticated Brave tab at `http://localhost:3000/admin/catalogo`, captured after the update by the current browser session. The session rendered all five KPI progress indicators and exposed their accessible names and values: Total 100%, Publicados 0.3%, En revisión 99.7%, Requieren revisión 4.2%, and Duplicados 4.6%.

**Viewport and state:** desktop authenticated catalog, clear filters, real server-backed catalog metrics. The browser's high-density viewport was visually inspected through its live screenshot output.

**Comparison history:**

- [P1] Each card's dashed placeholder implied a missing chart. The generic `Métrica global` label did not explain the KPI in relation to the catalog.
- Fix: replaced the empty dashed region with a color-matched proportion bar derived from `value / totalProducts`; replaced the generic label with the actual catalog share; added a short interpretation label. Small non-zero values retain a minimum visible fill while their textual and ARIA values preserve the exact percentage.
- Post-fix evidence: the authenticated browser displays populated blue, green, orange, red and purple indicators. No card has an empty visual reserve, and cards still navigate to their original server-backed filters.

**Required fidelity surfaces:**

- Typography: retained the existing compact KPI hierarchy while replacing generic copy with real proportions.
- Spacing and layout rhythm: the lower card region now has a 6px visual bar plus readable status text, with no blank chart reserve.
- Colors and tokens: each progress value uses the semantic color already assigned to its KPI.
- Assets: no new assets required; the existing Lucide icons remain intact.
- Copy and content: all counts and percentages derive from the live catalog totals; no historic trend was invented.

**Accessibility:** semantic `progressbar` roles provide a label, 0–100 bounds, and the exact numeric percentage; the card links and their destinations remain unchanged.

**Final result:** passed

## CP-050 operations inspectors redesign QA

- original context screenshot: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-c57631df-ef61-4c42-8536-c676df55ca87.png`
- selected visual truth: `C:\Users\jean_\.codex\generated_images\01a07c04-c718-7762-a9df-2a3f133c5fd5\exec-290b355e-64e6-4170-a639-b9e79e012759.png` (option 2)
- implementation routes: `http://localhost:3001/admin/operaciones?queue=quotes&page=1`, with equivalent inspectors for `opportunities`, `orders`, `followUps` and `inventoryAlerts`.
- implementation evidence: authenticated Brave session, inventory alert `CP-REF-BIM-0440`, captured through the computer-use connector at 1920x1080 and 100% zoom; responsive capture at 390x844.

### Comparison and behavior

The implemented drawers follow the selected inspector hierarchy: compact identity, status and responsibility, three contextual tabs, operational summary, two-column detail panels, recommended action, recent activity, and a fixed action footer. Quotes, opportunities, orders and follow-ups adapt the middle tab, fields, wording and source-module actions to their workflow. Inventory uses persisted stock, minimum, warehouse, assignment, history and published product media when available. When inventory history has no records, the interface derives development-only status entries from the current persisted balance and labels them as `Datos de desarrollo`; it does not invent stock movements. A neutral package icon is shown when no published product image exists.

Browser checks confirmed all three tabs, the assignment dialog handoff, valid inventory and transfer destinations, sticky footer actions, no horizontal document overflow at 390px, and a full-width mobile drawer. At 1920x1080 the information hierarchy stays visible without crowding and the drawer preserves the dashboard context.

### Product design review

- Attractive: restrained navy/blue hierarchy, semantic stock colors, consistent cards, spacing and icons.
- Efficient: availability and shortage appear first; operational actions remain fixed and reachable.
- Responsive: verified at 1920x1080 and 390x844; the mobile view stacks information and keeps a 390px document width.
- Easy to use: named tabs, clear status language, one primary inventory action, and assignment/transfer shortcuts.

### Verification

- `corepack pnpm exec tsc --noEmit` — passed
- targeted ESLint for the operations component and workspace — passed
- `scripts/cp049-operations.test.ts` and `scripts/operations-comparison.test.ts` — 7/7 passed

final result: passed

## CP-041 Dashboard — panel Vendedores — 2026-09-07

- source visual truth path: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-421214b4-8673-46d0-9e6d-959535768f9d.png`
- supplied baseline comparison: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-f1e1440e-0bb2-42a6-b443-b35f6bbee12a.png`
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: authenticated Brave browser capture from the current tab; the connector did not expose a filesystem path for the in-memory screenshot.
- viewport: 1920×861 CSS pixels, device scale 1.
- measured implementation: seller panel 548×144 CSS pixels; five seller rows at 18–19 pixels; no horizontal document overflow.
- state: Últimos 30 días, PEN, top five sellers with confirmed sales.

### Comparison evidence

The oversized generic `Top vendedores` table was replaced by the compact reference structure: title/subtitle/action, rank, initials avatar, seller, sales amount, quote count, conversion and progress track. Seller rows remain real links to the sales workspace. Quote counts now use the effective opportunity→quote seller relation, while conversion remains `N/D` when the canonical denominator is unavailable; no business values were invented.

### Functional checks

- “Ver todos” → `/admin/ventas`.
- First seller row → `/admin/ventas?sellerId=cp-dashboard-v5-user-staff-016`.
- Browser state after navigation returned to `/admin/dashboard` successfully.
- Console: no current application error; only pre-existing Clerk development-key and Next.js smooth-scroll warnings were observed. An earlier transient network error from a route reload was recovered and did not persist in the final rendered state.

### Automated verification

- `corepack pnpm exec tsc --noEmit` — PASS
- focused dashboard/report tests — 8/8 PASS
- `corepack pnpm lint` — PASS, 0 errors and 16 pre-existing warnings
- `corepack pnpm build` — PASS

final result: passed

## Centro operativo — fidelidad visual y lógica — 2026-09-07

- source visual truth: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-2ed6901e-08ae-426c-bbd4-b0d35f0fe959.png`
- supplied baseline: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-32a9d14f-8043-43c3-8343-51fd6c7f9763.png`
- implementation route: `http://localhost:3001/admin/operaciones`
- browser evidence: authenticated Brave Personal session, 1920×861 CSS pixels; responsive check at 260×563; no horizontal document overflow.

### Comparison evidence

The page now follows the reference composition: compact operational header, period and team controls, three contextual batch actions, six KPI cards, five queue tabs, priority table, alert rail, team-load bars and daily-status donut. Typography, white cards, blue-gray borders, status colors, density and responsive stacking were aligned to the supplied visual. KPI cards compare adjacent periods of equal duration, expose the previous value and render a two-point trend from those real aggregates. In all-history mode, KPI cards use the latest 30 days against the preceding 30 because an unbounded period has no mathematical predecessor.

### Functional checks

- Default period is “Todo el período” so the current persisted backlog is visible; “Últimos 7 días” remains available as a real date filter. Team and queue-specific filters persist in canonical URL state.
- Cotizaciones, Oportunidades, Pedidos, Seguimientos and Inventario load their own real queue, count, columns, actions and pagination.
- HIGH urgency filtering returned only “Alta” tasks and displayed the active-filter count.
- The advanced filter panel starts collapsed, keeps the active-filter badge visible, toggles from the Filters button and opens automatically only when the user selects a custom period.
- Detail drawer loaded persisted task data and history; Reassign opened its validated form without mutating data.
- Transferencias pendientes opened `/admin/inventario?tab=transfers#inventory-operations`, selected the Transferencias tab and focused the operations area.
- Header batch actions enable only for compatible selections and use the existing persisted operations API.
- Final Brave console: 0 application errors.

### Automated verification

- TypeScript: PASS
- ESLint: PASS, 0 errors and 14 pre-existing warnings
- Operations, catalog view-model and compatibility tests: PASS, 8/8
- Next production build: PASS
- Inventory verification: 19/20 checks pass; the remaining check requires the absent external workbook `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.

final result: passed

## CP-041 Dashboard — paneles inferiores compactos — 2026-09-07

- source visual truth paths:
  - `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-2a055037-d1b9-48f4-88ae-9f143a09cb3b.png` — formato compacto de Actividad, Resumen y Métodos de pago.
  - `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-83a79c64-1beb-4635-afcc-ca52a0ae359d.png` — baseline anterior con paneles sobredimensionados.
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: authenticated Brave browser capture from the current tab; the connector did not expose a filesystem path for the in-memory screenshot.
- viewport: 1920×861 CSS pixels, device scale 1.
- measured implementation: Actividad 717×137, Resumen 500×137, Métodos de pago 426×137 CSS pixels; no horizontal document overflow.
- state: Últimos 30 días, PEN; actividad limitada a cinco eventos y pagos confirmados/aprobados solamente.

### Comparison evidence

The previous vertical layout was replaced by the supplied compact three-column format. “Actividad reciente” now has the Usuario/Acción/Módulo/Detalle/Tiempo header and dense linked rows; “Resumen operativo” uses the target 2×2 metric cards and exact target copy; “Métodos de pago” uses the target participation subtitle, compact SVG donut, total and percentage legend. Values remain sourced from the database: ticket promedio is calculated from confirmed sales, while SLA, fill rate and preparation time remain `N/D` where the required timestamps or formula are unavailable.

### Functional checks

- “Ver todas” from Actividad reciente → `/admin/auditoria`.
- Dashboard returned successfully after navigation.
- Donut has an accessible label with the confirmed-payment shares.
- Compact row remains responsive: three columns at desktop, stacked layout below `xl`, contained activity overflow, and no document overflow.
- Brave console final state: 0 errors; only pre-existing Clerk development-key and Next.js smooth-scroll warnings.

### Automated verification

- `corepack pnpm exec tsc --noEmit` — PASS
- focused dashboard/report tests — 8/8 PASS
- `corepack pnpm lint` — PASS, 0 errors and 14 pre-existing warnings
- `corepack pnpm build` — PASS

final result: passed

## CP-041 Dashboard — donut de pagos y Top clientes — 2026-09-07

- source visual truth paths:
  - `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-87cc7d49-7e2c-477a-a0b1-e4127bc0fcaf.png` — referencia compacta para Métodos de pago y su donut.
  - `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-e520a752-e3c7-40f7-bd1e-38a290a796ca.png` — referencia de Top clientes a ajustar al sistema compacto.
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: authenticated Brave browser capture from a fresh final QA tab; the connector did not expose a filesystem path for the in-memory screenshot.
- viewport: 1920×861 CSS pixels, device scale 1.
- measured implementation: Top clientes 548×154; Métodos de pago 426×137; donut present; no horizontal document overflow.
- state: Últimos 30 días, PEN; values and labels come from the database.

### Comparison evidence

Métodos de pago now renders the missing donut as a compact SVG ring with a centered confirmed-payment total and percentage legend, limited to the visible payment methods under the five-plus-`OTHER` rule. Top clientes now follows the same compact card system as Top productos and Vendedores: compact header/action, ranking, initials avatar, Cliente, Ventas, Revenue and Última compra. No mock values were introduced.

### Functional checks

- Top clientes “Ver todos” → `/admin/clientes`.
- Each Top clientes row keeps a real customer query link, for example `/admin/clientes?query=Cliente%20corporativo%20012`.
- Actividad reciente “Ver todas” → `/admin/auditoria`.
- Donut container exposes an accessible label with confirmed-payment shares.
- Fresh Brave final tab: no application errors; only the pre-existing Clerk development-key warning.
- No document overflow.

### Automated verification

- `corepack pnpm exec tsc --noEmit` — PASS
- focused dashboard/report tests — 8/8 PASS (with `.env.local` loaded)
- `corepack pnpm lint` — PASS, 0 errors and 14 pre-existing warnings
- `corepack pnpm build` — PASS
- `git diff --check` — PASS

final result: passed

## CP-041 Dashboard — gráfico de ventas y margen — 2026-09-07

- source visual truth path: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-1c09addd-6b63-40fe-98de-439b5b436952.png`
- supplied baseline comparison: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-ed384377-9ba8-4ea8-9402-6b0b7eed3853.png`
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: Brave Browser capture from the current authenticated tab; connector did not expose a filesystem path for the PNG capture.
- viewport: 1920x861 CSS pixels, device scale 1; chart card measured 1340x182 and chart group 1318x126.
- state: Últimos 30 días, agrupación diaria, moneda PEN, timezone America/Lima.

### Comparison evidence

The chart was compared against the supplied reference at the same visible dashboard state. The implementation now uses the compact card proportion, compact title/subtitle, inline three-item legend, compact Diario selector, left currency axis, right percentage axis, six x-axis labels, blue current line, dashed previous-period line, and a green margin series when historical costs exist. The document has no horizontal overflow.

### Required fidelity surfaces

- Fonts and typography: compact navy heading, muted 9px subtitle/legend hierarchy, and bold axis labels aligned to the supplied reference.
- Spacing and layout rhythm: reduced panel padding and chart height; selector and legend share the top row; chart group preserves the compact reference density.
- Colors and visual tokens: blue current series, light-blue dashed comparison, green margin legend/series, pale dotted grid, white card, and subtle blue-gray border.
- Image quality and asset fidelity: no raster asset is present in the selected visual; existing Lucide icon system remains unchanged outside this chart.
- Copy and content: title, subtitle, legend labels, axis units, and Diario control match the supplied reference. Real database values remain intact.

### Findings and fixes

- P1 fixed — the previous panel was oversized and stacked its header, legend, and selector differently from the reference. Replaced the target panel with a compact responsive layout.
- P1 fixed — the chart lacked the reference's right percentage axis and margin-series support. Added both, with the green line rendered only when complete historical cost snapshots are available.
- P2 fixed — the chart previously exposed only five x-axis labels in this surface. Compact mode now exposes six evenly distributed labels.
- Expected data-dependent difference — the current database has 0 costed sale lines, so the margin line is not rendered and the KPI remains `N/D`; no sample line was injected.

### Functional checks

- Grouping selector: changed Diario → Semanal → Diario successfully.
- Chart point links and accessible data table remain available.
- Final browser state rendered without a compilation overlay or runtime failure; earlier transient HMR parser errors were removed before the final capture.

### Automated verification

- TypeScript: PASS
- ESLint: PASS (0 errors, 14 pre-existing warnings)
- Focused dashboard/report tests: PASS (8/8)
- Next production build: PASS
- `git diff --check`: PASS; only existing LF/CRLF normalization warnings.

final result: passed

## CP-041 Dashboard — panel Pipeline comercial — 2026-09-07

- source visual truth path: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-ea6b2460-6510-41fa-99fd-9d7595bf597a.png`
- supplied baseline comparison: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-3af2fe88-7955-48f9-bc15-98a2538b1979.png`
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: Brave Browser capture from the current tab; viewport 1920x861 CSS pixels, device scale 1.
- measured implementation: panel 1667x77 px; five stage cards 43 px high; no horizontal overflow.

### Comparison evidence

The pipeline now follows the compact reference composition: inline title/subtitle, right-aligned total and “Ver pipeline”, five horizontal macro-stage cards, semantic icon circles, count and amount, percentage labels, tinted surfaces, and compact progress bars. Each card remains linked to its persisted pipeline stage filter.

### Findings and fixes

- P1 fixed — previous panel was 174 px tall with stacked header and oversized cards. The revised panel is 77 px tall with five 43 px cards, matching the supplied compact proportion.
- P2 fixed — previous cards had no stage icons, no total summary, and separated percentage/amount layout. Added the reference's compact information hierarchy and existing Lucide icons.
- Expected data difference — current PostgreSQL scope reports 34 active opportunities and S/ 92,594; the reference shows sample values. No mock pipeline data was inserted.

### Functional and automated verification

- “Ver pipeline” and all five stage cards remain functional links.
- TypeScript: PASS
- ESLint: PASS (0 errors, 14 pre-existing warnings)
- Next production build: PASS

final result: passed

## CP-041 Dashboard — panel Estado del negocio — 2026-09-07

- source visual truth path: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-b54d7876-4c4b-40e4-a0d1-62b7a25ac4f6.png`
- supplied baseline comparison: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-3e358757-fa7c-47b6-b821-0c559b1a9ec1.png`
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: Brave Browser capture from the current tab; viewport 1920x861 CSS pixels, device scale 1.
- measured implementation: panel 315x174 px; five rows 25/25/25/25/24 px; no horizontal overflow.

### Comparison evidence

The panel now matches the compact reference composition: title and “Ver todas” action share the header, the subtitle uses the smaller secondary hierarchy, each row contains a semantic icon, two-line task copy, right-aligned count, priority pill, and chevron, with the same restrained border and color treatment. Persisted labels/counts remain the source of truth.

### Findings and fixes

- P1 fixed — previous panel was 365 px tall with oversized rows and no priority/status treatment. Compact version is 174 px tall, matching the supplied reference proportion.
- P2 fixed — rows previously used a single generic alert icon. They now use existing Lucide icons and semantic priority colors for each action type.
- Expected data difference — current persisted actions are “Pedidos por confirmar”, “Cotizaciones por enviar/seguir”, “Pagos por verificar”, “Productos que requieren revisión” and “Seguimientos vencidos”; the reference uses different sample labels/counts. No mock values were inserted.

### Functional and automated verification

- All five rows remain links to their corresponding workflows.
- TypeScript: PASS
- ESLint: PASS (0 errors, 14 pre-existing warnings)
- Next production build: PASS

final result: passed

## CP-041 a CP-050 — Tanda 2 — QA actual

- Referencias: `C:\Users\jean_\.codex\attachments\f5d232a9-d146-4d75-b9fd-273cd95c325e\image-1.png` a `image-10.png`.
- Reporte consolidado: `docs/qa/cp041-cp050-tanda2-redesign-2026-09-06.md`.
- Reportes individuales: `docs/qa/cp041-dashboard-v2-2026-09-06.md`, `cp042-purchases-redesign-2026-09-06.md`, `cp043-cms-redesign-2026-09-06.md`, `cp044-reports-redesign-2026-09-06.md`, `cp045-audit-redesign-2026-09-06.md`, `cp046-users-redesign-2026-09-06.md`, `cp047-settings-redesign-2026-09-06.md`, `cp048-notifications-redesign-2026-09-06.md`, `cp049-home-2026-09-06.md` y `cp050-operations-redesign-2026-09-06.md`.
- Preview local validado en Brave: Home, Dashboard ejecutivo, Centro operativo, Compras, CMS, Reportes, Auditoría, Usuarios, Configuración y Notificaciones.
- Breakpoints revisados: 1440×900, 1024×768, 768×900 y 390×844. Se comprobó navegación, búsqueda Ctrl/Cmd+K, filtros, colas, exportaciones, matriz de permisos y filas estructuradas de configuración.
- Verificación automatizada: TypeScript, lint, build, contratos CP-041–CP-050 y runtime CP-041–CP-050 pasan. La suite de inventario no puede abrir el workbook canónico ausente en `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.
- Bloqueo remoto: `https://dev.coldpower.pe/admin/dashboard` continúa sirviendo la versión anterior y no permite validar allí la Tanda 2 actual.

final result: blocked

## CP-041 Dashboard — panel Top productos por ventas — 2026-09-07

- source visual truth path: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-378156b4-917a-4057-9640-1f98ebef0056.png`
- supplied baseline comparison: `C:\Users\jean_\AppData\Local\Temp\codex-clipboard-3409486c-93cb-49e7-8deb-abef51acb86d.png`
- implementation route: `http://localhost:3001/admin/dashboard`
- implementation evidence: authenticated Brave browser capture from the current tab; the connector did not expose a filesystem path for the in-memory screenshot.
- viewport: 1920×861 CSS pixels, device scale 1.
- measured implementation: panel 548×144 px; five product rows at 18–19 px; no document overflow.
- state: Últimos 30 días, PEN, five confirmed products from PostgreSQL.
- comparison evidence: compact title/action, ranking, product image slot, units, ingreso, and trend columns are present; SKU is preserved in the product link/title without occupying a visible primary column.
- expected data difference: all five `primaryImageUrl` values are null, so the closest existing semantic Package icon is rendered; the previous-period product revenue base is unavailable, so the real product sparkline is shown instead of an invented percentage.
- required fidelity surfaces: typography, spacing, colors, image/asset fidelity, and Spanish copy checked against the supplied reference.
- findings and fixes: oversized table height fixed with natural-height alignment; SKU-heavy layout replaced by the compact reference hierarchy; data caveats remain explicit and source-backed.
- functional checks: “Ver todas” routes to `/admin/catalogo`; all five product rows route to `/admin/catalogo?query=<SKU>`; no horizontal overflow.
- automated verification: `corepack pnpm exec tsc --noEmit` PASS; focused dashboard/report tests 8/8 PASS; `corepack pnpm lint` PASS with 0 errors and 14 pre-existing warnings; `corepack pnpm build` PASS.

final result: passed

## CP-035 Pipeline de oportunidades — QA final

- Referencia visual: `C:\Users\jean_\.codex\attachments\85428ec9-5458-4529-b97d-71b59df9a2a9\image-1.png`
- Ruta implementada: `/admin/crm`
- Reporte detallado: `docs/qa/cp035-pipeline-redesign-2026-08-31.md`
- Resultado funcional: PASS para board de seis macroetapas, métricas server-side, PEN/USD separados, paginación por lane, filtros URL, drawers, follow-ups, actividades, auditoría, RBAC, export y handoff de cotización.
- Browser QA: preview local verificado en 1440×900, 1024×800, 768×900 y 390×844; se comprobó carga, filtros, tabs, detalle, drawer de alta y modal de pérdida. Consola estable sin errores propios, sólo warnings esperables de Clerk/Next de desarrollo.
- Comparación visual: se conservan shell blanco, canvas azul-gris, jerarquía navy, CTA naranja, cuatro KPI, filtros compactos, board horizontal interno y cards comerciales. La adaptación a seis macroetapas sigue el contrato del ticket.
- Bloqueos: `https://dev.coldpower.pe/admin/crm` requiere una sesión autenticada no disponible; el navegador integrado no permitió guardar los PNG obligatorios; `test:inventory` no puede abrir el workbook externo requerido en `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx`.

final result: partial

## CP-034 pricing workspace QA

- source visual truth: `C:\Users\jean_\.codex\attachments\22f89b90-7c79-4c75-9031-ad6023fb25af\image-1.png`
- ImageGen visual reference: `C:\Users\jean_\.codex\generated_images\01a05962-ce42-7840-b13c-e736ef9a99e6\exec-7da9236a-4652-4f6a-88ca-c3ddcc3c81a5.png`
- implementation route: `/admin/precios`
- Brave verification: local `http://localhost:3000/admin/precios` and `https://dev.coldpower.pe/admin/precios` rendered with active admin sessions.
- filter evidence: advanced panel opens, chips persist in the URL, status selection updates the result scope, and the document has no horizontal overflow at 390px.
- responsive evidence: 1920, 1440, 1024, 768 and 390 viewport checks passed; bulk workspace and import drawer rendered in the same session.
- console evidence: no module-owned errors; only the existing Clerk development-key warning and Next smooth-scroll warning were present locally.
- automated checks: focused ESLint and pricing/domain tests pass; the production build reaches the CP-034 routes and then stops on concurrent pre-existing quote/pipeline contract errors outside CP-034.

### Final result

passed with unrelated repository-wide checks pending

final result: passed with unrelated repository-wide checks pending

## CP-Admin profile QA (three references)

- source visual truth paths:
  - `C:\Users\JEAN\.codex\attachments\2e844a86-3612-40ad-9fc3-1dcadfda637b\image-1.png` Ã¢â‚¬â€ Superadmin
  - `C:\Users\JEAN\.codex\attachments\2e844a86-3612-40ad-9fc3-1dcadfda637b\image-2.png` Ã¢â‚¬â€ Gerencia
  - `C:\Users\JEAN\.codex\attachments\2e844a86-3612-40ad-9fc3-1dcadfda637b\image-3.png` Ã¢â‚¬â€ Operaciones/Bryan
- implementation screenshot paths:
  - `output/playwright/cp-admin-superadmin-data.png`
  - `output/playwright/cp-admin-gerencia-data.png`
  - `output/playwright/cp-admin-operaciones-data.png`
- source dimensions: 1448x1086 pixels for each reference.
- implementation viewport: 1448x1086 CSS pixels, captured at browser device scale 1 for the headless comparison set; browser extension QA was additionally checked at 1536x798 with no actionable console errors after the duplicate-key fix.
- state: role preview used only for visual QA because `.env.local` has no Clerk publishable key; production routes remain server-guarded and redirect unauthenticated requests.

### Comparison evidence

The three references and the three implementation captures were opened and compared at matching desktop dimensions. The implementation preserves the same shell, left navigation, role identity, KPI density, panel hierarchy, pipeline proportions, executive/operations split, empty-state honesty, and responsive navigation behavior. Follow-up fixes added visible sparklines, chart axes/labels, corrected the Gerencia navigation label, removed the duplicate navigation key, and changed Operations to a two-thirds pipeline / one-third orders grid.

Focused checks covered header/profile identity, active navigation, KPI sparklines, chart canvas and labels, panel proportions, the operations sidebar restriction, and the mobile drawer. At 390px the drawer opens correctly; the intentional 760px pipeline board remains horizontally scrollable as a dense kanban surface.

### Required fidelity surfaces

- Fonts and typography: IBM Plex Sans stack, bold display hierarchy, compact utility labels, and role-specific wrapping checked.
- Spacing and layout rhythm: 68px admin shell header, role-specific sidebar widths, compact vertical rhythm, three-column executive panels, and two-thirds/one-third Operations split checked.
- Colors and tokens: navy shell, white panels, light blue-gray page canvas, blue/orange/green/red semantic accents, and orange Operations CTA checked.
- Image quality and asset fidelity: supplied ColdPower logo and existing product/banner assets used; UI icons come from the existing Lucide icon system. No screenshot was used as a page background or substituted for editable UI.
- Copy and content: role names, subtitles, menu visibility, Spanish labels, empty states, and data-dependent metrics checked. No fake business numbers are injected when the source returns no records.

### Comparison history

- Initial admin comparison: P1 Ã¢â‚¬â€ main chart canvas rendered blank in one capture, KPI cards lacked source-like sparklines, Operations panels were stacked at the target desktop width, and Gerencia navigation used the generic Ã¢â‚¬Å“ConfiguraciÃƒÂ³nÃ¢â‚¬Â label.
- Fix iteration: chart redraw was made resize-safe and received axes/labels; KPI cards now use sparklines; Operations uses an explicit two-thirds/one-third grid; Gerencia displays Ã¢â‚¬Å“ConfiguraciÃƒÂ³n empresarialÃ¢â‚¬Â; duplicate nav keys were removed.
- Post-fix evidence: `output/playwright/cp-admin-superadmin-data.png`, `output/playwright/cp-admin-gerencia-data.png`, and `output/playwright/cp-admin-operaciones-data.png`, plus browser DOM/console checks at the same QA session.

## Admin automated verification

- `pnpm build` Ã¢â‚¬â€ PASS
- `pnpm lint` Ã¢â‚¬â€ PASS
- `pnpm exec tsc --noEmit` Ã¢â‚¬â€ PASS
- `pnpm test:phase11` Ã¢â‚¬â€ PASS
- `pnpm test:phase16` Ã¢â‚¬â€ PASS

## Final result

passed
## CP-Admin category UI QA (8 reference pairs)

- source visual truth paths:
  - `C:\Users\JEAN\.codex\attachments\6261ebdf-83da-4a6b-9930-0866df4c1e0c\image-1.png` through `image-8.png`
- reference contract: each source image contains two category variants side-by-side; the app renders only the selected category route. Payments/CMS use the same white sidebar as the other categories per the requested override.
- implementation: all management routes now render the shared category workspaces from `src/components/admin/AdminCategoryViews.tsx`, while existing server permissions, repository queries, and operational controls remain attached inside the workspace action panels.
- browser note: the local Brave extension preview was blocked by browser security review for the local navigation, so this iteration was validated through production compilation, TypeScript, lint, route inspection, and category contract tests. No screenshot is claimed as browser evidence for this iteration.

### Required fidelity surfaces

- Shell: white left navigation, navy active item, white search header, profile identity, notification badge, compact blue/orange semantic accents.
- Category structure: header/action row, KPI cards, filters, dense data panel, right-side summary/secondary panel where relevant, and responsive horizontal overflow for tables/kanban.
- Category selection: `/admin/crm?view=clientes` activates Clientes only; `/admin/crm` activates Pipeline only. The shell now accounts for the query state so both links are not highlighted together.
- Functional preservation: catalog editorial/publication/duplicate decisions, inventory operations/transfers/reservations, pricing controls, CRM create/operation/pipeline controls, quote state/conversion, order state/manual payment, CMS editor/media, report filters, audit records, user invitation/role controls, and company settings form are retained in expandable action areas.

## CP-Admin category automated verification

- `pnpm exec tsc --noEmit` â€” PASS
- `pnpm lint` â€” PASS
- `pnpm build` â€” PASS
- `node scripts/admin-category-ui-contract.test.mjs` â€” PASS
- `node scripts/phase16-navigation-design.test.mjs` â€” PASS
- `node scripts/cp027-dashboard-completeness-contract.test.mjs` â€” PASS

## Final result

blocked

## CP-031 product-management redesign QA

- source visual truth path: `C:\Users\jean_\.codex\attachments\1942beb9-90bc-47c5-a52c-20985d9194ad\image-1.png`
- source visual context: ColdPower admin dashboard with white fixed sidebar, navy active navigation, white topbar, light blue-gray canvas, compact KPI cards, and blue/orange/green/red/purple semantic accents.
- implementation route: `/admin/catalogo`
- implementation captures:
  - `output/playwright/cp031-productos-1440.png` — 1440x900 desktop
  - `output/playwright/cp031-productos-1024.png` — 1024x768 tablet/compact desktop
  - `output/playwright/cp031-productos-768.png` — 768x900 tablet
  - `output/playwright/cp031-productos-390.png` — 390x844 mobile
  - `output/playwright/cp031-product-detail.png` — product detail drawer
  - `output/playwright/cp031-new-product.png` — new product modal
  - `output/playwright/cp031-import-preview.png` — import preview
  - `output/playwright/cp031-publication-preflight.png` — publication preflight
  - `output/playwright/cp031-bulk-operation.png` — bulk operations workspace
  - `output/playwright/cp031-duplicate-review.png` — duplicate review surface
- capture state: authenticated admin browser session with persistent catalog data; no artificial product cards or placeholder business metrics were introduced.

### Comparison evidence

The product route follows the reference shell and visual language while adapting the information architecture to CP-031: exactly five KPI cards, a server-backed filter bar, dense product table, right-side category/brand/quality/alert summaries, and a lower operational workspace. The catalog surface keeps the reference's restrained borders, compact labels, generous white panels, and semantic accent colors.

Responsive checks covered the sidebar-to-hamburger transition, KPI stacking, filter wrapping, table containment, drawer width, modal containment, and document width. At 390px the page remains within the viewport and the dense table is replaced by readable product cards; no horizontal document overflow was observed.

Functional visual states covered search/filter navigation, quality filtering, product detail loading, editorial edit fields, category-to-family dependency, import dry-run preview, publication blockers, bulk workspace, and duplicate comparison/decision controls. The duplicate groups are sourced globally from PostgreSQL; the final comparison control also closes with Escape and refreshes after a saved decision.

### Required fidelity surfaces

- Typography: IBM Plex Sans-style admin hierarchy, compact uppercase metadata, bold navy headings, and readable mobile wrapping.
- Layout: fixed admin shell on desktop, responsive navigation below `xl`, KPI row, filters, data table, summary rail, and operational workspace.
- Colors: navy shell/action hierarchy, white surfaces, blue-gray page background, blue primary, orange publication action, green healthy state, red blockers, and purple duplicate state.
- Assets: existing ColdPower/product assets and Lucide interface icons; no screenshot was used as a page background and no generic visual asset was required.
- Accessibility: semantic buttons/links, labels on form controls, dialog roles, aria labels for icon actions, keyboard Escape handling, visible focus styles, and disabled states for unavailable permissions or incomplete preflight.

### Browser evidence

The authenticated Brave session was used before the session reset to inspect the rendered route, real KPI values, filters, drawer, new-product dependency, import modal, preflight blocker, responsive widths, console, and document overflow. A subsequent attempt to reconnect found only an unauthenticated in-app browser and therefore did not mutate or fabricate data. Direct DB/service verification confirmed the final duplicate query returns 62 pending duplicate products and real groups.

### Final result

passed

## CP-036 final QA status

The local authenticated session passed the functional and visual checks available in the integrated browser. Remote development remains behind sign-in, and that browser exposes only a 1280×720 viewport, so the ticket's exact 1440/1024/768/390 screenshot set remains pending.

final result: blocked

## Catálogo admin — serie visual KPI de desarrollo — 2026-09-12

- La ruta `/admin/catalogo` ahora recibe siete puntos para cada KPI y vuelve a usar el mismo renderer de sparkline del dashboard.
- La serie conserva la relación de dominio: `en revisión = total de referencias - publicados`; las series de requieren revisión y duplicados corresponden a sus propios contadores.
- El último punto de cada serie es el snapshot real actual. Los anteriores son una fixture de desarrollo no lineal, protegida contra producción y creada únicamente para validar la visualización mientras se define la captura histórica operativa.
- Verificación de datos: las cinco series tienen siete puntos y el chequeo TypeScript terminó correctamente.

final result: blocked — falta inspección en el navegador autenticado personal a 1920 × 1080; este entorno no dispone de ese controlador.

## Contacto público — rediseño visual y flujo CRM — 2026-09-22

- source: `pasted-text-1.txt` plus `image-1.png`; reference image is a 938 × 1677 desktop capture of the public Contacto page.
- implementation route: `/contacto`, rendered in the authenticated personal Brave profile at `http://localhost:3002/contacto` with the local Webpack dev server.
- generated assets: `public/images/contact-hero-coldpower.webp` (1513 × 1040), `public/images/contact-coverage-peru.webp` (1813 × 868), and `public/images/contact-cta-cooling.webp` (2243 × 701). The assets were generated for the requested refrigeration/HVAC visual language and inspected before integration.
- layout state: desktop hero with two-column contact channels, transactional contact form, help/brand panel, coverage/map section, CTA and global footer; CSS adapts at 1100, 767 and 420px breakpoints.
- data state: company settings, catalog brands, CMS media slots and payment-method labels are server-backed. Missing business settings remain explicit (`Disponible al configurar`, `Horario por confirmar`, `Cobertura coordinada`); no operational values were invented.
- behavior state: `/api/contacto` validates and rate-limits public submissions, rejects the honeypot without persistence, validates attachment type/signature/size, persists customer/opportunity/activity/history/attachment through CRM, and sends a deduplicated `CONTACT_SUBMITTED` notification. Repeated `requestId` submissions are idempotent.
- browser evidence: the authenticated Brave session rendered the updated desktop page, completed a real form submission, displayed `Consulta enviada correctamente.`, and confirmed the persisted CRM activity and notification through read-only database checks. A JPEG attachment submission also persisted its `crm_attachments` relation and local file.
- responsive/accessibility state: semantic headings, labels, required controls, inline errors with `aria-invalid`/`aria-describedby`, consent error announcement, keyboard-compatible controls, reduced-motion CSS, and mobile layout rules are implemented. The browser session was additionally resized toward 1024px and 390px for visual inspection; exact screenshot capture at every requested viewport remains constrained by the desktop-window controller.

final result: passed

## Catálogo admin — alineación de barra de filtros — 2026-09-12

- Referencia: la barra del Dashboard suministrada por Jean. La segunda fila conserva sus utilidades en una secuencia compacta a la izquierda.
- Ajuste: `Más filtros`, `Actualizado` y `Limpiar filtros` comparten el mismo flujo horizontal; se eliminó la distribución extrema que desplazaba las dos últimas acciones al borde derecho.
- Se preservaron los controles, enlaces, foco por teclado y ajuste responsive mediante `flex-wrap`.

final result: blocked — falta comparación visual en el navegador autenticado personal a 1920 × 1080.

## CP-PUBLIC-CONTACT — cierre actual de QA — 2026-09-22

- source visual truth: `C:\Users\jean_\.codex\attachments\fafb984a-2407-4088-9e30-cdc8d8624ec4\image-1.png` (938 × 1677) plus `pasted-text-1.txt`.
- implementation: `/contacto` in the authenticated Brave Personal tab `http://localhost:3002/contacto`; the reference header remains shared and the page uses the generated hero, coverage and CTA assets.
- desktop evidence: CSS viewport 1920 × 1080 at 100% zoom; the hero keeps the two-line title, channels card, generated product image and three benefits without horizontal overflow. The full-page capture also shows the transactional form, real-brand list, coverage visual, CTA and footer.
- responsive evidence: CSS viewports 1440 × 900, 1024 × 900, 768 × 900 and 390 × 844 were inspected through the authenticated browser. `document.documentElement.scrollWidth` stayed below the viewport at every size. Tablet now stacks hero/art/channels to avoid collisions; mobile stacks fields, buttons and coverage cards, and keeps the handwritten note over the hero image.
- interaction evidence this pass: clicking the empty `Enviar consulta` button produced inline accessible errors for name, phone, email and message plus the summary notice; no request was emitted. A valid CRM submission was not repeated in this pass because it would create another real lead.
- persisted evidence from the prior authenticated QA run: read-only Neon checks show two `public.contact_submitted` audit entries and one row in `crm_attachments`; the current migration check confirms the attachment table exists. This is historical evidence, not a new submission in this pass.
- data and safety: company settings, CMS media slots, catalog brands and payment labels remain server-backed. Missing settings stay explicit (`Disponible al configurar`, `Horario por confirmar`, `Cobertura coordinada`); no operational contact values or brands were invented.
- console: no error filtered to Contacto was reported by the current browser tab. Older unrelated logs from another local homepage tab reference missing components in a dirty worktree and are not part of `/contacto`.
- automated verification: `corepack pnpm test:contact` PASS (7/7); `corepack pnpm exec tsc --noEmit` PASS; `corepack pnpm build` PASS; targeted ESLint PASS with one pre-existing unused-type warning in `src/lib/media-repository.ts`. The global lint remains blocked by generated `.next/dev` and `.claude/worktrees/verification-execution-rules-09b665` contents (341 errors outside this change). The inventory suite is 19/20 because the external workbook `C:\Users\jean_\Desktop\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx` is absent.

final result: passed

## M10-05 — corrección de atención y deduplicación administrativa — 2026-09-25

- source visual truth: `docs/goal/designs/m10-lote3/cuenta-hub-desktop-1920x1080.png` y `cuenta-hub-mobile-390x844.png`.
- implementation screenshots: `docs/goal/evidencia/m10/mi-cuenta/hub-revision-1920x1080.png` y `hub-revision-390x844.png`.
- viewport/pixels/density: desktop 1920 × 1080 CSS / 1920 × 1080 px / deviceScaleFactor 1; mobile 390 × 844 CSS / 390 × 844 px / deviceScaleFactor 1. No density normalization needed.
- state: usuario cliente autenticado en bypass local; datos comerciales reales; COT-2026-019 `CONVERTED` vencida y COT-2026-040 `ACCEPTED` presentes solo en actividad reciente.
- full-view comparison: shell TIENDA, topbar/header, breadcrumb, sidebar, hub, pedido en curso y responsive conservan la composición de la lámina; la sección de atención se omite correctamente cuando no existen acciones abiertas.
- focused comparison: `.account-attention-grid`, badge de Cotizaciones y enlaces administrativos. Playwright confirmó cero tarjetas para 019/040, cero acciones en el header y un único enlace administrativo en el menú.
- typography, spacing, colors/tokens, assets and copy: no se rediseñaron; el ajuste es de estado y navegación, conservando los tokens y la densidad aprobados.
- comparison history: revisión inicial detectó estados aprobada/convertida como atención y duplicación administrativa; se corrigieron los filtros server-side, la vigencia Lima, el plural del badge y se capturaron nuevamente ambos viewports.
- accessibility/runtime: axe 0 violaciones, consola 0 errores, HTTP 200; evidencia adicional en `docs/goal/evidencia/m10/mi-cuenta/revalidation.json`.

final result: passed

## M10-05 review unblock - honest errors and mobile overflow - 2026-09-25

- source visual truth: `docs/goal/designs/m10-lote3/cuenta-hub-desktop-1920x1080.png` and `cuenta-hub-mobile-390x844.png`.
- current implementation captures: `docs/goal/evidencia/m10/mi-cuenta/hub-revision-1920x1080.png` and `hub-revision-390x844.png`.
- comparison viewports: desktop 1920 x 1080 and mobile 390 x 844 at 100% zoom; both inspected against the source shell, account sidebar, hub hierarchy, cards, typography, spacing, colors and responsive density.
- functional state: real authenticated customer data; converted/expired and approved quotes are retained only in recent activity and do not render as attention cards or quote badges.
- error-state contract: account hub failures render `No pudimos cargar tu cuenta` with `Reintentar`; orders, quotes, payments, history and data queries bubble to the account error boundary; a history-only failure keeps the hub and renders a local retry message for `Volver a comprar`. Logs keep only a safe scope and error name.
- overflow investigation: the original 483-484px document width came from the repeat-purchase grid's min-content sizing. `min-width: 0` on the account grid/content/card chain and contained horizontal scrolling on `.account-nav` keep the document inside the viewport.
- responsive automation: 15 route/viewport checks for data and 15 for empty state at 360, 390 and 430px; all returned HTTP 200, `document.documentElement.scrollWidth === clientWidth`, and zero console issues. Internal account tabs remain horizontally scrollable within their container.
- accessibility/runtime: the 1920/390 hub revalidation reports axe 0, console 0, and exactly one personal admin link in the account menu.

final result: passed

## Menú «Todas las categorías» — 2026-10-05

- source visual truth: `C:\Users\JEAN\AppData\Local\Temp\codex-clipboard-ca89c6b2-d41c-431a-8d32-08e84335efc9.png` (Impacto, menú abierto) y `C:\Users\JEAN\AppData\Local\Temp\codex-clipboard-71e22182-acc6-49a3-abff-24964d7276a0.png` (ColdPower antes del cambio).
- fuente interactiva verificada: `https://www.impacto.com.pe/`; al pulsar «Categorías» abre un panel bajo el header, mantiene la URL, selecciona categorías en un lateral, cambia las secciones del panel y ofrece scroll y cierre.
- implementación: `http://localhost:3000/catalogo`, navegador Brave personal; captura visible en la sesión con el panel abierto en Refrigeración. La API de captura entregó la imagen al navegador/sesión, no una ruta de archivo local.
- viewport: implementación 1517 × 724 CSS px; las capturas fuente adjuntas tienen 1735 × 966 y 1906 × 954 px. Se comparó la jerarquía y el panel de navegación, sin afirmar una comparación píxel a píxel entre viewports distintos.
- interacción verificada: abrir sin navegar, elegir categoría, mostrar sus familias publicadas, cerrar con Escape, entrar al filtro de una familia y limpiar el filtro.
- comparación inicial y corrección: el primer panel abría Amoladoras y mostraba una sola familia; el estado inicial pasó a la categoría con más familias publicadas (Refrigeración) y se ajustó la grilla a cuatro columnas en el viewport amplio.
- fidelidad: usa categorías y familias reales de PostgreSQL y el filtro de catálogo existente. Mantiene el header ColdPower y sus colores navy/azul/naranja; no copia la marca ni el contenido de Impacto. Las familias se muestran como grupos enlazables porque el modelo ColdPower no tiene un nivel de subcategoría adicional.
- accesibilidad/responsive: diálogo modal etiquetado, foco inicial, ciclo de foco, cierre por Escape/backdrop y bloqueo de scroll de fondo; en móvil el panel usa pantalla completa, selector horizontal de categorías y lista vertical. El viewport móvil no se capturó en esta sesión.
- build: `corepack pnpm build` pasó; ESLint pasó para los cuatro archivos modificados. La generación registró el warning conocido de disponibilidad de `company_settings` en la base local.
- corrección del 2026-10-06: el menú ahora consulta la taxonomía activa completa, sin filtrar por cantidad de productos públicos. La base local reporta 27 categorías y 171 familias; Refrigeración muestra sus 45 familias en una grilla desplazable. Se ocultaron los conteos en este menú para no confundirlos con referencias publicadas. En Brave local se verificó el panel abierto y la lista larga desplazable después del rebuild.
- build de la corrección: `corepack pnpm build` y ESLint focalizado (`src/app/layout.tsx`, `src/components/layout/CategoryMegaMenu.tsx`) pasaron. Se mantuvo el warning conocido de `company_settings`.

final result: passed; menú de taxonomía verificado; viewport móvil no capturado

### Tipos de producto en el mega-menú — 2026-10-06

- Se reorganizó el panel derecho en grupos por familia: encabezado, enlace «Ver todo» y tipos de producto debajo, siguiendo la jerarquía observada en Impacto.
- Los tipos se derivan del campo `product_type` de productos activos, relacionados con la familia y categoría editorial. El filtro del catálogo usa `tipo` y conserva los filtros al enviar el formulario.
- En local, «Otros electrodomésticos» despliega Equipos de limpieza → Limpiadora a vapor; Motores → Motor; Otros → Centrifugador, Deshilachador y Olla; Termómetros → Termómetro.
- El click de Centrifugador llega al catálogo con `tipo=Centrifugador`; actualmente devuelve cero referencias públicas porque las fichas de esa categoría siguen en revisión.
- build y ESLint focalizado pasaron; el warning de `company_settings` local persiste.

final result: passed; el árbol de tipos se ve y el filtro responde; viewport móvil no capturado

---

## Seguimiento de auditoría 2026-10-07

# Design QA — seguimiento de correcciones

final result: blocked

Referencia: captura de auditoría 16c-reporte-qa-activo.png. Implementación: 30-reportes-graficas-corregidas.png, navegador personal autenticado, 1920×1080 y escala 1. Son capturas con viewport/fechas distintos; todavía falta una comparación normalizada conjunta. No se declara fidelidad integral aprobada.

Verificado en runtime: margen propio por fecha, ceros de ventas sin oscilación negativa, serie/leyenda de margen visible. Clientes muestra porcentajes reales cuya distribución por tipo suma 100%.

Pendientes P2: agrupación por familia real, pestañas funcionales de Reportes, tendencia ficticia sin serie, validación responsive y accesibilidad integral. Pendiente P3: flechas duplicadas.

Pruebas técnicas: 9/9, TypeScript y build aprobados; no sustituyen la validación visual pendiente.

## Iteración de Reportes

F07/F08 corregidos y comprobados en escritorio: familia real Motores automotrices; pestañas con paneles operativos, ArrowRight y Home probados. Evidencia 32/33 en carpeta de auditoría. Eliminadas curvas ficticias y flechas duplicadas. Continúa `final result: blocked` para aprobación integral hasta comparación normalizada y móvil/filtros/exportaciones.


## Seguimiento de búsqueda administrativa — 7 octubre 2026

Referencia: captura 42 de la paleta existente. Se modifica la entrada Enter del encabezado para abrir esa misma paleta; estilos y composición conservados. Prueba de usuario: resultado de cotización, navegación correcta, búsqueda multigrupo QA y Escape; consola sin errores. Build y ESLint aprobados. Evidencia 43 en carpeta temporal de auditoría. Final result: blocked para aprobación integral; pendiente comparación normalizada a 1920×1080 y móvil, y prueba de contención/restauración del foco. Esta sección no reemplaza el historial previo ni aprueba el diseño completo del sistema.

## Seguimiento de filtros del catálogo — 7 octubre 2026

Referencia: evidencia 46 de filtros combinados. Corrección funcional de enlaces individuales, etiquetas legibles y remonte del formulario sin cambio de estilos. Navegador confirmó familia seleccionada, quitar tipo conservando familia y quitar familia reiniciando selección. Captura 47. Final result: blocked para QA visual integral: falta comparación normalizada principal/móvil y combinaciones restantes. Se mantiene el historial previo.

## Continuación 2026-10-07 — compras
Referencia: capturas 48/49 de la auditoría. Flujo solicitud En revisión → Aprobada → Convertida probado sin recarga. Se detectó formulario de conversión con ID técnico y cancelación que conserva Pendiente pese a éxito. Correcciones de etiquetas/contrato de error e invalidación implementadas; 3 regresiones y ESLint aprobados. Build en curso. Verificación visual de correcciones pendiente. Final result: blocked para aprobación visual integral; no se declara completo el sistema.

Rectificación: captura 49 y DOM final 49b muestran Cancelada sin recarga. F27 retirado como fallo persistente; estado previo era transitorio. F25/F26 continúan como defectos confirmados y corregidos en código; revisión visual de compilación nueva pendiente.

Build final aprobado, servidor 64510. F26 verificado en lectura con SC-DEV-003: SKU, nombre y etiqueta accesible correctos; captura 50. F25 tiene regresión aprobada; respuesta fallida en navegador pendiente. Sin aprobación visual integral.

## Pipeline — navegación de cotizaciones
Referencia: captura de la bandeja vacía 51 y formulario precargado 52. Cambio limitado al destino y etiqueta del enlace existente; mantiene distribución/estilo. Propuesta: abrir detalle con quoteId y abrir formulario con new=1 conservando opportunityId. F11 precarga verificada; navegación final F28, principal/móvil/teclado pendientes. QA visual integral continúa sin aprobar.

F28 verificado: clic desde Pipeline abre COT-2026-C5C7EF; captura 53, consola sin errores. F29 parpadeo falso inicial detectado y estado loading inicial corregido; repetición pendiente. Medida efectiva 1536×798, DPR1.25/scale1 pese al viewport solicitado 1920×1080; no se certifica principal. Override restablecido.

F29 verificado en navegador: carga inicial Cargando detalle… → detalle QA sin error; evidencia 55/55b. Build, ESLint y regresión aprobados; servidor 11740. Alcance visual integral sigue pendiente.

## Clientes — validación en su paso
Referencia: asistente existente capturado en 56, conserva estructura y estilos. Propuesta: requisito RUC marcado para Empresa, error accesible antes de avanzar, mismas reglas backend para identidad/contacto. 2 nuevas regresiones + 6 contratos aprobados; ESLint aprobado. Navegador y build pendientes. No se aprueba revisión integral.

F16 validado en navegador: RUC obligatorio/inválido retiene Identidad; Persona sin RUC avanza; email inválido retiene Contacto y corrección avanza. Capturas 57/58 y DOM59. Sin guardado ni errores de consola. Build y 8 pruebas específicas aprobados; local sesión11131. Visual integral, móvil y principal pendientes.

## Notificaciones — alcance explícito
Referencia: captura 60. Se conserva composición y se agrega período de No leídas y explicación de campana histórica; snapshots sin comparación muestran Estado actual. Contrato y ESLint aprobados, build/validación final pendientes. F30: donut suma magnitudes superpuestas y unidades distintas; pendiente rediseñar representación fiel, no se aprueba gráfico ni visual integral.

F31: abrir detalle seleccionado por defecto marcaba automáticamente como leído. Se elimina useEffect; mantiene acciones explícitas. Dos avisos originalmente No leída quedan identificados para restauración. Regresión aprobada; navegador final pendiente.

F17/F31 comprobados: período visible, snapshots Estado actual, restauraciones conocidas persistidas y filtro 6/badge6 estable, sin marcado automático. Captura62, consola sin errores. F32 pendiente: botón no sincroniza lectura hasta recarga; F30 gráfico pendiente. Build final aprobado; servidor29645.

F32: mantiene botón y presentación del detalle; invalida datos tras persistencia y muestra error accesible si falla. Pruebas/ESLint aprobados, comprobación de ambos sentidos con aviso QA pendiente.

F32 repetido tras build: persiste cambio pero botón/fila siguen obsoletos hasta recarga. Invalidación insuficiente; no se aprueba arreglo. QA restaurada READ, badge6, evidencia64. Servidor91500. Próximo trabajo: sincronización con estado confirmado por API, incluyendo detalle/lista/contador.

F32 iteración: acción del servidor con autorización y estado READ/UNREAD restringido, invocada en transición; misma presentación del botón/aviso. Prueba real de actualización de detalle/lista/contador pendiente.

## F32 — nueva comprobación real, 07 oct 2026
La acción del servidor persiste READ/UNREAD, pero la interfaz queda con el estado anterior y la transición pendiente. Se cambió a useTransition para bloquear clics repetidos y mostrar el indicador; se eliminó router.refresh duplicado porque revalidatePath ya solicita la actualización. Ninguna iteración resolvió el caso en navegador: F32 continúa abierto. Build/TypeScript, ESLint y 2 contratos pasan; los contratos comprueban estructura, no sincronización real.
Evidencias 65 (transición pendiente), 66 (sin refresh duplicado) y 67 (restauración). Se restauró el aviso QA notification-9a62bebb-72ec-4d7a-ad75-4938ca692667 a READ desde la bandeja; recarga confirma Leído y campana 6. Consola sin errores observados. Local activo en http://localhost:3000, sesión 15337. F30 gráfico continúa abierto: el total 91 suma avisos entregados/no leídos superpuestos con programaciones, y no representa una distribución válida. Auditoría integral aún incompleta; principal 1920 CSS/móvil no certificados.

## F30 — indicadores fieles, verificados 07 oct 2026
Se eliminó el donut y el total que sumaban avisos creados/no leídos superpuestos y programaciones con otra unidad. La tarjeta mantiene el estilo existente y muestra indicadores independientes de todo el equipo, con períodos y explicación por destinatario. La consulta entregadas realmente cuenta avisos creados; su etiqueta ahora dice Avisos creados. Programaciones futuras/vencidas/fallidas identifican su unidad sin presentarse como estados excluyentes de los avisos.
Verificación: build/TypeScript, ESLint y tres contratos específicos pasan; navegador muestra 48 avisos creados/30d, 42 sin leer actualmente, 0 futuras, 0 vencidas y 1 fallida/30d, sin total ni errores de consola. Capturas 68, 69 móvil 390×844 sin desbordamiento, 70b principal 1920×1080 CSS confirmado. 70 captura quedó desplazada y no sirve como prueba de tarjeta; se reemplaza con 70b. Override restablecido. F30 corregido para esta representación; no certifica gráficos de otros módulos. F32 sigue abierto, sin nuevas mutaciones QA en esta revisión. Local sesión33245. Auditoría y QA visual integral siguen pendientes.

## F32 — sincronización corregida y verificada, 07 oct 2026
Se reemplazó la acción de servidor fallida por PATCH autorizado y publicación de su respuesta persistida. useConfirmedNotifications comparte estado confirmado entre bandeja, detalle, destinatarios, historial, KPI de 24h, contador personal de campana y agregado global. No publica cambios optimistas ni marca al abrir. API individual y bulk conservan ownership y notifications.view; incluyen contadores consultados en servidor. Si estos no cargan, el guardado permanece exitoso y se muestra aviso de contadores no actualizados, sin inventar cero. La acción use server experimental sin consumidores se retiró. Prioridad visual se comparte con función pura para mantener clientes sin acceso a módulos DB; fechas del detalle se fijan a America/Lima. CONTACT_SUBMITTED/LEAD_CREATED ahora muestran etiquetas españolas.
Prueba real: QA READ → UNREAD cambia botón/fila/detalle/destinatario y campana 6 → 7 sin recarga (71); UNREAD → READ devuelve todo a lectura/campana6 e historial real (72). Enter ejecuta la acción correctamente. Filtro No leídas presenta 7 registros; selección de solo Producto agotado y bulk Marcar leídas lo retira, deja 6 resultados/campana6 y detalle leído sin recarga (73). Nueva navegación confirma QA persistido READ (75). Ningún otro destinatario se alteró.
Build/TypeScript, ESLint y nueve pruebas específicas pasan (5 contratos UI/KPI + 3 CP046 + 1 evento confirmado). Nueva prueba valida cero real, fechas, rechazo de estados/fechas inválidos, bulk y ausencia de contador sin fabricarlo; integrada en test-all. Navegador sin errores de consola. Vista principal 1920×1080 (75) y móvil390×844 sin desbordamiento (76), conserva composición de referencia67/70b. Captura74 no se usa: selección del navegador cambió a Pedidos durante adaptación móvil; se repitió con navegación móvil cerrada y captura76 válida. Viewport restablecido. Local sesión61562. F32 resuelto para los flujos comprobados; no implica auditoría integral aprobada. Roles reales, paginación de múltiples páginas, fallos de red/contadores en navegador y otras operaciones de notificaciones todavía pendientes en matriz general.

Regresión acumulada: 389 pruebas aprobadas/0 fallos/2 omitidas, contratos por fases y TypeScript/ESLint/build pasan. Integración de traslados repetida en Neon pasa sin modificar datos. Evidencias77/78. Auditoría visual integral no aprobada. Reporte QA sigue ACTIVE; confirmación bloqueó control de Brave y queda pendiente recuperar navegador con ayuda del usuario. Local sesión25241. Galería ampliada con capturas ausentes;70/74 excluidas como prueba inválida.

## Ampliación pendiente de exportaciones — 07 oct 2026

Se revisaron las 17 rutas de exportación administrativa y los serializadores compartidos. Evidencia reproducible de inspección: 79-exportaciones-revision-fuente.json. Esta revisión es de código; no equivale a descargar y abrir cada archivo en Microsoft Excel.

### F33 · P2 · Compatibilidad de CSV con Excel sin resolver en otros módulos

La captura aportada por Jean prueba que coldpower-pagos.csv abrió encabezado y cada registro íntegros en la columna A. Pagos ahora genera XLSX por defecto y conserva CSV explícito con sep=,. Dos pruebas de paymentsWorkbook repetidas en esta continuación pasan: 16 columnas, importes numéricos, diferencia negativa numérica, referencias con ceros iniciales, texto con acentos, fecha ISO UTC y texto que no se convierte en fórmula. Apertura real del XLSX en Excel y descarga autenticada siguen pendientes.

Las otras 16 rutas siguen emitiendo CSV separado por comas sin sep=, ni salida XLSX: Clientes, Compras, Cotizaciones, Ventas, Pedidos, Pipeline, Inventario, Kardex, Operaciones, Auditoría, Usuarios, Taxonomía, Promociones, Precios, Reportes y la opción CSV de Dashboard. Dashboard mantiene PDF por defecto. Se confirma la estructura del archivo en fuente; la reproducción en Excel de esas 16 descargas todavía NO está comprobada. No es correcto declarar que todos los CSV son inválidos: su interpretación al abrir depende del separador configurado en Excel/Windows. BOM por sí solo no define separador.

Corrección y aceptación pendientes: salida XLSX con columnas y tipos explícitos donde se anuncia Excel; conservar contratos CSV para intercambio; documentos/RUC/teléfonos/SKU/referencias como texto sin perder ceros, importes como números; mantener filtros, alcance por rol, ocultación de costos y trazabilidad. Descargar cada módulo y abrir en el Excel de Jean, incluyendo archivo vacío, acentos/comillas/saltos de línea y volúmenes paginados.

### F34 · P2 · Protección desigual frente a fórmulas en CSV

src/lib/csv.ts aplica prefijo de texto a valores que empiezan con =, +, - o @; Auditoría y Usuarios lo utilizan. Los serializadores locales de Clientes, Compras, Cotizaciones, Ventas, Pedidos, Pipeline, Inventario, Kardex, Operaciones, Promociones, Taxonomía y CSV opcional de Pagos escapan comillas, pero no neutralizan fórmulas. pricing-export.ts y dashboard-export.ts tampoco neutralizan ese prefijo. Encerrar un valor entre comillas CSV no fuerza que Excel lo trate como texto. Ejemplo de dato controlado en un nombre: =1+1 se serializa como contenido de celda susceptible de interpretación, no como texto tipado.

Confirmado por inspección de serializadores, sin crear registros maliciosos ni ejecutar fórmulas en Excel. XLSX de Pagos sí conserva el valor como celda de texto y sin propiedad de fórmula en prueba automatizada. Pendiente solución común que distinga texto de importes negativos legítimos; no aplicar prefijos indiscriminados a números financieros ni afirmar explotación real sin reproducción.

### Alcance de esta continuación

No se modificaron exportadores ni datos operativos. Se amplió auditoría con los hallazgos, manifest y límites reales de comprobación. La auditoría integral permanece abierta. Control de Brave pendiente de recuperación; cancelación de programación QA y flujos comerciales restantes no se declaran terminados. Las dos pruebas de Pagos pasan en esta continuación; la batería completa de 389 pruebas corresponde a la ejecución anterior documentada en 77.

## F34 — protección común aplicada, 07 oct 2026

Se retiraron 12 serializadores locales duplicados. Las 17 rutas CSV usan ahora csvCell de src/lib/csv.ts directamente o csvText a través de dashboard-export/pricing-export. Auditoría y Usuarios también reciben la mejora del guard existente. Se neutralizan expresiones con =, +, - o @ tras espacios/BOM y prefijos de tabulación/CR/LF. Decimales finitos y notación científica puramente numérica se conservan sin apóstrofo: diferencias negativas siguen siendo valores numéricos importables. Fechas Date siguen ISO UTC, null sigue vacío y comillas CSV siguen escapadas. No se cambiaron filtros, permisos, límites, consultas o datos.

23 pruebas específicas pasan (10 CSV/Pagos/Precios y 13 Auditoría/Dashboard/Clientes/Promociones); TypeScript y ESLint pasan. Nueva scripts/csv-safety.test.ts integrada en test-all: casos de prefijos, negativos, ceros iniciales, comillas, fechas y contrato de las 17 rutas. La prueba de rutas demuestra uso del helper; no sustituye abrir las descargas reales. F34 corregido en serialización y verificado por pruebas; apertura en Excel pendiente. F33 compatibilidad de separador sigue abierto para otros módulos. Build de producción en curso al registrar esta nota; no se afirma despliegue ni nueva batería global.

F34 — build de producción terminado con exit 0. Servidor anterior detenido por su sesión25241 y nuevo pnpm start sesión35470 Ready193ms en http://localhost:3000. No equivale a validación de descargas en navegador/Excel; esa comprobación sigue pendiente.


## F33 — Clientes convertido a XLSX, 07 oct 2026

/api/admin/clientes/export genera XLSX por defecto con 19 columnas y filtro automático; format=csv conserva el CSV protegido para intercambio. Exportar en Clientes ya usa esta ruta sin formato, por lo que no requirió cambios visuales. Se conserva permiso customers.export, filtro y recorrido de todas las páginas de 100 filas, auditoría con PII y cache no-store. Documentos/RUC/teléfonos/referencias se escriben como texto, cantidades como números, fechas Date como ISO UTC. El helper tabular-workbook rechaza filas con columnas inconsistentes y números no finitos, sin inventar datos.

Nueve pruebas pasan (2 workbook, 3 CSV y 4 contratos Clientes), TypeScript aprobado. Prueba workbook demuestra ceros iniciales, teléfono +51, nombre =1+1 sin fórmula, número y fecha, archivo vacío y errores de estructura. Integrada en test-all. No prueba descarga autenticada real ni apertura en Excel; ambas pendientes. F33 avanza para Clientes y Pagos; las otras 15 rutas todavía requieren solución y comprobación según su uso. Build en curso; auditoría integral abierta.

Clientes XLSX — ESLint y build exit0. Nuevo local pnpm start sesión52242 Ready778ms. Build avisó fallos de consulta de categorías/familias al prerenderizar; NO se oculta ni se interpreta como validación del menú. Comprobación posterior de conexión, solo lectura con .env.local, devolvió27 categorías y171 familias. Esto prueba acceso y filas, no el éxito de la consulta agrupada del menú ni su render real: investigar advertencia y comprobar menú pendiente. Auditoría integral permanece abierta.

## Taxonomía — consultas exactas comprobadas, 07 oct 2026

Tras la advertencia de build se ejecutaron, solo lectura, las mismas funciones que RootLayout usa para el menú: getCatalogCategories(false), getCatalogFamilies(undefined,false), getCatalogProductTypes(). Resultados27 categorías/2142ms,171 familias/253ms,257 grupos de tipo/1436ms. Estos grupos son combinaciones categoría-familia-tipo, no necesariamente257 nombres únicos. Se repitieron las tres consultas en Promise.allSettled: todas fulfilled, mismos totales,1230ms. Evidencia80-taxonomia-consultas-reales.json.

Esto mejora la comprobación anterior que solo contaba filas de tablas: ahora se probaron joins efectivos y agrupaciones reales. No demuestra la causa del fallo observado en worker de build. No se atribuye sin pruebas a la red, la base o el esquema. Menú visual/estados de error en navegador y reproducción bajo build aún pendientes. No se cambiaron consultas ni se añadió fallback ficticio; datos de catálogo intactos. Auditoría integral sigue abierta.

## F33 — Compras, Pipeline y Cotizaciones a XLSX, 07 oct 2026

Se convirtieron otras3 rutas a XLSX por defecto, manteniendo format=csv: Compras8 columnas, Pipeline13, Cotizaciones14. Subtotal de compra y monto de oportunidad son números en XLSX; CSV conserva representación original del importe. Documentos, teléfonos, códigos y nombres se conservan como texto; fechasDate sonISO. Permisos purchases.view/crm.export/quotes.export, filtros, paginación completa, auditoría/PII y no-store se mantienen. Botones existentes dicen Exportar sin prometer CSV, por lo que no se modificó interfaz visual.

15 pruebas pasan (6 workbook/CSV,3 Pipeline,3 Cotizaciones,3 Compras); TypeScript y ESLint pasan. Contrato añadido verifica permiso, recorrido hasta totalPages, CSV explícito, MIME XLSX y columnas8/13/14 del archivo vacío. Estos contratos comprueban fuente y helper; no equivalen a abrir descargas autenticadas ni probar roles reales. Build en curso al registrar. F33 resuelto en generación XLSX de cinco rutas contando Clientes/Pagos; quedan12 rutas con CSV y aceptación real en Excel de todas las nuevas. Auditoría integral sigue abierta; ningún dato operativo modificado.

Build de estas tres exportaciones aprobado exit0; no reaparecieron las advertencias de taxonomía en la salida observada de esta ejecución. Esto no establece la causa del fallo anterior. Local reiniciado sesión26521 Ready257ms. Descargas autenticadas/Excel y auditoría global continúan pendientes.


## F33 — Inventario y opción XLSX de Kardex, 07 oct 2026

Inventario genera XLSX por defecto con9 columnas, filtros del servicio intactos y permiso inventory.view; format=csv mantiene intercambio. Kardex añade format=xlsx con11 columnas, respetando productId/locationId/tipo/fechas y inventory.kardex.view. Kardex conserva CSV por defecto porque su botón actual está rotulado CSV; falta ofrecer XLSX en interfaz y validar ese flujo en navegador. No se declara Kardex completamente resuelto para el usuario.

11 pruebas pasan; TypeScript y ESLint de rutas pasan. Nuevo caso workbook confirma stock desconocido vacío frente a mínimo cero numérico, SKU con ceros y movimiento negativo numérico. Contrato verifica elección de formato y permisos. Además, lectura real de getInventoryAdminExport(query QA-AUD-20261006) devolvió2 filas; se generó81-inventario-qa.xlsx con9 columnas/rangoA1:I3 y se reabrió con lectorXLSX: SKU, stock físico y disponible coinciden con las dos filas reales. Sin mutaciones DB y sin datos de otros productos. Esto prueba round-trip con datos QA reales, no descarga autenticada ni apertura en Microsoft Excel. Build en curso. Auditoría global abierta.

Inventario/Kardex — build aprobado exit0 y local reiniciado sesión79223 Ready314ms. XLSX QA real guardado como81-inventario-qa.xlsx (17533bytes). Pendientes descarga autenticada, apertura en Excel y opción visual de XLSX en Kardex; no se certifica auditoría integral.


## F33 — Ventas y Pedidos XLSX, 07 oct 2026

Ventas exporta XLSX por defecto con17 columnas; sus6 importes se convierten a números sin alterar CSV explícito. Pedidos exporta XLSX por defecto con columnas dinámicas de permisos: importe/moneda solo canViewAmounts; pago solo payments.view. Consulta mantiene includeAmounts/includeFinancial y las mismas opciones en cada página; no se agregan valores financieros ocultos al workbook. Código/documentos/referencias/cantidad atendida-total como1/2 son texto; fechasISO. CSV protegido disponible con format=csv, filtros/permisos/auditoríaPII/no-store intactos.

26 pruebas específicas pasan; TypeScript/ESLint de rutas y test pasan. Nuevos casos preservan ceros iniciales en referencia, proporción1/2 como texto y diferencia negativa como número; contratos verifican gates financieros en encabezados/filas y consulta, opciones de formato y paginación. Son pruebas de helper y contratos, no sesiones reales de roles ni ejecución completa de endpoint autenticado. Build en curso. Descarga y Microsoft Excel pendientes; auditoría integral activa. No hubo escrituras de datos operativos.

Ventas/Pedidos — build exit0; nuevo local sesión49302 Ready288ms. Revisión de inventario del navegador personal Brave3 confirmó que la antigua pestaña Reportes ya no existe; se reutilizó binding sin reselección y se creó pestaña nueva Ventas. DOM real responde; por tanto el bloqueo de control anterior ya no impide esta navegación. Vista autenticada muestra168 ventas, botón Exportar y campana6; consola únicamente aviso de Clerk desarrollo, sin errores observados.

Se pulsó Exportar de la interfaz. waitForEvent(download) agotó20s, pero el archivo apareció realmente en C:/Users/JEAN/Downloads/ventas-2026-10-07.xlsx conmtime de la acción y132409bytes. LectorXLSX confirmó hojaVentas, rangoA1:Q169,168filas/17columnas y las6columnas financieras numéricas. Coincide con total168 de la página, supera la primera página25 y límite de consulta100. Copia/evidencia82-ventas-descarga-real.xlsx/json, DOM/captura83. Captura de contexto, sin afirmar aprobación visual1920/móvil. Microsoft Excel aún no comprobado; no confundir lectorXLSX con la aplicación. Pedidos descarga/roles siguen pendientes. Esta acción produjo registro normal sales.exported; no modificó ventas/pagos/stock. Auditoría integral abierta.

## Descarga de Pedidos y F33 Taxonomía — 07 oct 2026

Se usó Pedidos en Brave personal: DOM muestra168pedidos y Exportar hacia/api/admin/pedidos/export. Se pulsó enlace; no apareció XLSX en Descargas. La respuesta visible posterior fue página de Brave «La página localhost está bloqueada», ERR_BLOCKED_BY_CLIENT. No se confirma fallo del backend ni descarga aprobada. Evidencia84-pedidos-navegador.txt y84-pedidos-descarga-bloqueada.txt/png. Solo aviso de Clerk desarrollo observado antes del bloqueo. Se solicitó a Jean descarga manual: política de navegador impide eludir su bloqueo; no se desactivaron protecciones ni se usó otro canal autenticado. Pestaña marcadahandoff para acción humana. Auditoría de Pedidos continúa pendiente.

Mientras tanto Taxonomía exporta XLSX por defecto con9columnas, format=csv opcional. Conserva requireTaxonomyAccess(filters.entity), filtros y todas las páginas100. IDs/nombres/slugs son texto; activo booleano, conteos numéricos, fechasISO.15pruebas distintas de workbook/CSV/taxonomía pasan (14previas más1caso nuevo de flags/conteos/permisos); TypeScript y ESLint pasan. Build en curso. Descarga de Taxonomía y aperturaExcel todavía pendientes.

Revisión de fuente también identifica TaxonomyWorkspace Exportar hardcoded entity=categories. No exporta explícitamente familias/marcas desde ese botón. Debe comprobarse contexto/selección real y definir alcance visible antes de modificar interacción; no se aprueba UX de exportación completa. No se cambiaron datos operativos. Auditoría integral activa.

Taxonomía XLSX — build exit0 y local reiniciado sesión77379 Ready373ms. AperturaExcel/descargas/roles reales y UX de selección de entidad pendientes. Bloqueo de descarga de Pedidos espera comprobación manual de Jean; no es bloqueo de toda la auditoría, continúan módulos/flows por trabajar.


## F35 y bloqueo de descarga — actualización07oct2026

F35: exportación Taxonomía ahora sigue selection.entity con etiqueta explícita y permiso seleccionado. Comparación de85c referencia y86 resultado1920x1080 inspeccionada;87 móvil390x844 inspeccionada, botón legible sin desbordamiento horizontal. Categorías/familias/marcas tienen enlaces correctos comprobados en DOM. 9 pruebas workbook+4taxonomía, ESLint/TypeScript/build aprobados. Aprobación limitada al contexto del botón; auditoría global abierta.

F33 continúa pendiente: captura de Jean muestra export bloqueado por organización. Observación CDP normal de Exportar familias registra200/MIME XLSX/filename coldpower-families.xlsx correctos, pero navegador suggestedFilename export y cancelación0bytes. Evidencia88-export-bloqueado-red.json saneada. No es503/403 en esa petición; causa del bloqueo aún no determinada. No se eludieron protecciones ni se declara descarga exitosa. Backend de solo lectura genera171familias y168pedidos correctamente; esto no sustituye aceptación real.

## Reportes XLSX — 07oct2026

Ruta Reportes convierte exportación genérica a XLSX por defecto, cuatro hojas con contexto/resumen/serie/pipeline, CSV explícito preservado. Permisos/alcance/auditoría/no-store intactos; desconocido vacío y financiero solo con ambos permisos. 13 pruebas específicas, TypeScript y ESLint pasan. Sin edición visual. Build en curso; descarga/Excel/roles reales pendientes. ReporteQA sigueActivo después de intento de aceptar confirmación nativa no concluido; evidencia89 registra estado. Auditoría integral abierta.

Reportes build exit0/local42615 activo. Descarga real responde200 con filename XLSX correcto entrecomillas, pero navegador propone export y cancela0bytes (90-reportes-descarga-red.json). Mismo fallo que familias; descarta atribuir exclusivamente al filename sin comillas. F33 abierto, causa pendiente. Auditoría integral no aprobada.

## Regresión completa / Operaciones XLSX —07oct2026

91-regresion-completa.log terminaexit0:404TAP/402pass/0fail/2skip más contratosfase/tsc/lint/build. No certifica auditoría integral ni roles/runtime. Operaciones ahoraXLSX17cols por defecto con CSVexplícito, mismospermisos/filtros/auditoría/consulta completa.14pruebas específicaspostcambio pasan,tsc/lint pasan; buildnuevo en curso,descarga/Excel pendientes. Sin cambio visual.

Operaciones buildactual exit0; local reiniciado con versiónactual. Descarga real y aceptaciónExcel no certificadas. Auditoría global abierta.

## Exportaciones Auditoría/Usuarios —07oct2026

XLSXdefault14/10columnas,CSVexplícito,permisos/filtros/límite5000/avisotruncamientopreservados. F36detallesAntesDespuésantes[object Object], ahoraJSONsaneado conredacciónsegúnpermiso.22pruebas,TypeScript/ESLint pasan. Buildencurso,descarga/Excel/roles reales pendientes. Sin modificaciónvisualniroles. Auditoríaintegralabierta.

Auditoría/Usuariosbuildexit0,localreiniciadoactual. Descargaautenticada/Excel/rolespendientes.22específicaspass. Auditoríaintegralabierta.

## Precios y opciones XLSX —07oct2026

PreciosXLSXdefault11cols,costossegúnpermiso ysinpreciovacío;CSVpreservado,auditformatoefectivo,no-store. Promociones/DashboardañadenXLSXopcional peroUIpendiente,CSV/PDFdefaultsconservados.30pruebaspass,tsc/lintpass,buildencurso;descargaExcel/rolesrealesnoverificados. Sin ediciónvisual. Auditoríaglobalabierta.

## Estado actualizado de exportaciones, 07 oct 2026

Build aprobado, local reiniciado. Las 17 rutas tienen generación XLSX; 14 por defecto y 3 opcionales (Kardex, Promociones, Dashboard). La interfaz de esas tres opciones sigue pendiente. Pasaron 30 pruebas específicas, TypeScript, ESLint y diff --check. La aceptación de descargas, Excel y roles reales sigue pendiente. Auditoría integral abierta.

## Comprobación de roles y Promociones, 07 oct 2026

Workbook de Reportes/Dashboard probado con 11 roles de dominio: solo SUPERADMIN/GERENCIA/JEFATURA reciben métricas privilegiadas; valores desconocidos vacíos. 18 pruebas workbook/CSV pasan. No equivale a sesiones autenticadas de cada rol.

Promociones → Pausar campaña QA abre confirmación nativa; controlador no consiguió aceptarla. Pausa no comprobada, pendiente de intervención manual solicitada. No hubo edición visual ni certificación global. Auditoría integral abierta.

Promoción QA: pausa manual confirmada por Jean, toast de éxito y persistencia comprobada tras recargar (92 txt/png). Sin errores de aplicación en consola. Solo se cierra este flujo; auditoría integral abierta.


## Promociones: F37/F38, iteración de corrección 07-oct
Referencia: captura 96-promociones-calendario-estados.png. Implementación: 97-promociones-calendario-corregido.png. Comparación conjunta: 100-promociones-comparacion.png en carpeta externa ColdPower-audit-2026-10-06. Mismas campañas, Superadmin, misma ruta y calendario cerrado, viewport CSS 1920×1080; imágenes 1920×1080, DPR 1. Sin normalización.

Se inspeccionó la comparación conjunta completa: tipografía, pesos, jerarquía, bordes, radios, espaciado y densidad permanecen coherentes. Cambio intencional: etiqueta Exportar abre formatos y leyenda agrega Pausada/Vencida; barra QA violeta ahora corresponde a Pausada. Logo y los iconos existentes se conservan; no se incorporaron imágenes nuevas. Comparación enfocada innecesaria: los cambios se distinguen en la captura conjunta y DOM anuncia estado/fechas.

Historial: F37 menú de acciones abría creación y ocultaba exportación móvil; ahora selector explícito con dos enlaces. F38 barra gris confundía pausa y borrador; ahora color y etiquetas separados derivados de un mapping compartido. Post-fix: 97 y 101-promociones-menu-movil-visible.png, ambas inspeccionadas. Móvil 390×844, imagen 390×844, DPR 1, menú abierto; no overflow (390/390), filas de 44px y CTA de creación visible. Enter/Tab/Escape probados, cero errores de consola. Es atractivo por conservar el diseño existente, eficiente al dar acceso directo a formatos, responsive y fácil de usar con etiquetas claras.

Resultado del alcance F37/F38 de interfaz: passed. La descarga completa no se certifica (F33 abierto). Estados vacíos/error y sesiones reales de otros roles siguen pendientes del alcance integral. Auditoría global: final result: blocked. No representa aprobación de todo el sistema.

## Recepción individual — 08-oct
Referencia: captura 109 del detalle existente; estados implementados 111 escritorio y 114 móvil. Se conservó composición, tipografía y paleta; sin nuevos assets. Defecto responsive identificado por medidas DOM y captura 112; corrección mínima min-w-0. En 114 el producto, SKU y cantidad 2 son legibles dentro de la tarjeta; tabla de OC desplazable. Atractivo, eficiente, responsive y fácil de usar para el detalle probado: aprobado con este alcance. Navegación entre códigos y cantidades 1/2 comprobada; aviso inexistente comprobado; consola móvil sin errores. F41 de cambio de OC pendiente. QA global abierta.

## Navegación entre OC — 08-oct
F41: se conservó la interfaz existente, corrigiendo únicamente destinos de ambos enlaces. Teclado Enter en escritorio CSS 1920×1080 (116) y clic en móvil CSS 390×844 (117) muestran la orden elegida, sin recepción anterior. Capturas inspeccionadas; consola escritorio sin errores; pruebas de conservación de filtros y codificación aprobadas. QA de este cambio aprobada; objetivo global sigue abierto.

## Formatos Dashboard/Kardex — 08-oct
Referencias de interfaces existentes 118/119 y selector de Promociones. Se preservaron encabezados, icono Download y tokens. Selector común con formatos explícitos, áreas de opción de 44 px y foco visible. Se iteró un recorte móvil identificado en 122; 124 comprueba alineación completa, 126 Kardex móvil y 125/127 escritorio CSS 1920×1080. Enter/Tab/Escape comprobados, retorno de foco y consola sin errores. Evaluación acotada: atractivo (consistente con controles existentes), eficiente (formato explícito), responsive (opciones completas) y fácil de usar (teclado y etiquetas) aprobados. Las descargas no finalizaron y quedan fuera de la aprobación de interfaz; F33 sigue abierto. 18 pruebas dirigidas, lint y build final 123 pasaron; regresión completa 115 antecede a este cambio. QA global abierta.

## Auditoría 8oct — flujo comercial QA
F44 creaciónsin oportunidad: FK corregida,6contratos/lint/build134pasan; browser→DBconfirmaquote/oportunidad/versión/venta/pedido. F45 restaura formulario manual existente para placeholderUNCONFIGUREDsinproveedor/referencia manteniendo diseño136;139desktop1920y140mobile390inspeccionados,11pruebas/lint/build138pasan. Cobro explícitamente simulado→preparación→recojo→DELIVERED→reservaCONSUMED y stock4→3verificadosDB142. AmboslinksGestionarpagoconservanorderId(F47). No reclamar cierre global: F46estadoobsoleto,F48placeholderpendiente,F43responsive,descargas y demás cobertura pendientes.

## 8oct — F46/F48/F49 seguimiento
- F46: passed acotado al flujoQA convertido; detalle actualizado sin recarga manual, captura144.
- F48: passed para nuevos cobros completos; pruebaUI5+6PEN y DB145 confirman cierre del placeholder, trazabilidad y diferencia0. Pendiente tratamiento histórico del QA anterior.
- F49: correcciónfuncional de refresco de bandeja sin cambios de estilos, basada en captura146.13contratosyESLintpasan; build147pasa0. La conexión del navegador personal desapareció durante la validación posterior; final result: blocked para F49 hasta recuperar esa conexión y ejecutar mutaciónQA. No sustituir con compilación ni navegador aislado.
- La auditoría visual integral continúa abierta; no se declara el sistema completo ni listo para producción.

## 8oct — puertas posteriores a F50
Regresión153: passed (429 casos, 426 aprobados, 3 omitidos, TypeScript, ESLint y build). Integración QA de Pagos152 aprobada explícitamente, sin llamadas externas. No hubo cambios de estilos en este bloque. F49 y la comparación visual integral mantienen final result: blocked mientras no esté conectado el navegador personal; no considerar el resultado general del producto aprobado por las pruebas de servidor.

## 8oct — F51 y ejecución de Reportes
Sin cambios visuales en este bloque. F51: integración QA de saldo/concurrencia/idempotencia aprobada; regresión159 pasa430casos(427aprobados,3omitidos),TypeScript,ESLint y build. Reportes160 confirma entrega interna única por procesamiento concurrente, con programaciónQA cancelada al terminar; lint y TypeScript posteriores pasan. No equivale a verificación de cron automático ni de UI. F49 y la auditoría visual general conservan final result: blocked por falta de conexión con Brave personal; F52 de recuperación de jobs requiere reproducción y reparación.

## 8 octubre — F52 recuperación de reportes verificada
Reproducción161: una ejecución RUNNING antigua bloqueaba el reporte (fallo esperado 0 frente a1). Se implementó recuperación tras15minutos, comprobación de propiedad de la ejecución y entrega/cierre dentro de la misma transacción. Un ejecutor sustituido no puede publicar ni marcar error sobre el resultado nuevo.
Evidencia162: recuperación y concurrencia aprobadas. Evidencia163:3 pruebas de integración aprobadas; incluye éxito tardío, error tardío, cancelación durante ejecución (SKIPPED sin notificación), recuperación conservando una entrega previa y concurrencia sin duplicados. Solo fixtures QA, inbox interno propio; programaciones creadas canceladas al finalizar, historial y auditoría conservados. No demuestra ejecución automática de cron ni revisión visual del inbox.
Regresión164 iniciada sobre el árbol actual. La validación visual en Brave sigue pendiente de reconexión. Promoción QA: Jean confirmó manualmente que quedó pausada; no reactivar.

F52 ampliación: revisión detectó que insertar notificaciones directamente omitía las preferencias. La entrega ahora reutiliza createNotifications dentro de la misma transacción; conserva normalización, preferencias y deduplicación. Prueba166:9/9 aprobadas, incluyendo preferencias desactivadas/activadas, límites del lease y3 integraciones con variantes de ejecutor antiguo y cancelación. Regresión164 terminó0 antes de este ajuste; regresión167 posterior en curso. No se declara cerrado el objetivo global ni F33.
Regresión167 posterior al ajuste de preferencias: terminó con exit0; contratos, TypeScript, ESLint y build aprobados. Local reiniciado con este build, Ready en http://localhost:3000 (sesión76693). La validación visual personal y F33 siguen pendientes; no se realizó commit/push del conjunto aún.

## 8 octubre — F53 · Reembolsos: precisión e idempotencia
Reproducción169 confirmó dos defectos: refundPayment aceptaba1.001 redondeándolo a1.00; reutilizar la clave de otro pago devolvía el registro ajeno como idempotente. Primera fixture168 falló por un campo obligatorio del pedido; no es evidencia del defecto y fue limpiada. La ruta además trataba un amount numérico como ausente, pudiendo asumir devolución total (evidencia de código).
Corrección: validación de monto positivo con hasta2decimales antes de procesar; clave serializada por advisorylock y comprobación de pago/monto asociado; API rechaza tipo no textual explícito. Evidencia170/171: pruebas contra Neon QA aprobadas. Incluyen monto inválido, saldo excesivo, replay, conflicto de pago/monto, dos solicitudes competidoras (solo una cabe), duplicado concurrente (un solo reembolso), parcial y total. Fixture171: qa-refund-bf8f8ee9-74b3-4a58-9ce7-a9ba3d56c8a0. Ledger final bruto22/devuelto22/neto0; no se invocó ninguna pasarela. Limpieza por IDs exclusivos; auditoría append-only conservada. Se agregó al runner como opt-in QA_REFUNDS=1. Contrato172 comprueba el rechazo de tipo en API; no sustituye una petición autenticada de navegador.
Pendiente adicional F54: reembolso MANUAL persiste SUCCEEDED en una transacción y actualiza estado/historial del pago en otra; una interrupción entre ambas podría dejar la proyección del pago desactualizada. Es hallazgo de código pendiente de reproducción/corrección; los tests de concurrencia171 no prueban recuperación tras caída.
Brave continúa ausente del inventario del controlador. Siguen pendientes revisión visual, descargasF33 y cierre integral.

F54 corrección estructural: la rama manual ahora calcula saldo devuelto, actualiza REFUNDED cuando corresponde, inserta historial y ambas auditorías dentro de la transacción inicial bajo el lock del pago. Se eliminó la segunda transacción manual. Contrato173 y17 contratos de Pagos aprobados junto con integración (18/18). Evidencia174 aprobada: exactamente5 solicitudes y5 confirmaciones de reembolso para5 registros y2 transiciones REFUNDED, sin duplicación por replay. Se verificó persistencia y límite concurrente; no se mató un proceso ni se simuló una caída del servidor. La garantía de indivisibilidad se apoya en la transacción PostgreSQL y la inspección del código, no en una prueba destructiva de interrupción.
Regresión175 en curso sobre estos cambios. No son aún el build servido en el local.
Regresión175 terminada exit0:431 casos TAP aprobados,0 fallos,7 omitidos por sus gates; contratos por fases, TypeScript, ESLint y build aprobados. diff --check sin errores tras retirar líneas finales vacías. Local reiniciado con este build en http://localhost:3000, sesión19112 Ready. F53/F54 quedan corregidos y verificados al alcance indicado; API autenticada y revisión visual pendientes. El objetivo global, las descargas F33 y commit/push del conjunto siguen pendientes.

## 8 octubre — F55 · Programación de notificaciones concurrente
Reproducción176: dos llamadas con la misma clave persistían una programación pero una fallaba por la carrera de creación (fulfilled/rejected). Se agregó advisorylock de la clave antes de consultar replay, manteniendo la restricción única.
Evidencia177/178: ambas solicitudes responden correctamente, una creación y un replay; un único registro y una auditoría de creación. Dos procesadores concurrentes entregan una única notificación; un replay del procesador no entrega otra. Cancelar una segunda programación impide su entrega. Se comprobó estado SENT y una auditoría de envío. Fixture178: notification-schedule-230c45b0-643c-424a-86ad-8ebf677d3b6c, inbox notification-4267c8e0-715b-42b1-925b-9e66b9811583; cancelada notification-schedule-cbc789f1-80b2-4d29-b51d-063f52985b3c. Solo inbox propio del creador QA autorizado, ningún correo/WhatsApp. No se cambiaron preferencias personales. Se comprobó que no existían otras programaciones vencidas antes de ejecutar el worker; reloj controlado y fixture exclusiva.
Se conservan notificación, programaciones completadas/canceladas e historial. Caso integrado al runner opt-in QA_NOTIFICATION_WORKER=1. Regresión179 en curso. No prueba cron automático ni lectura visual del inbox. Brave sigue ausente del inventario del controlador; las verificaciones visuales y F33 continúan pendientes.
Regresión179 terminó exit0:432 casos TAP aprobados,0 fallos,8 omitidos por gates; contratos por fases, TypeScript, ESLint y build aprobados. diff --check sin errores. Local reiniciado con este build, Ready en http://localhost:3000, sesión28955. F55 corregido al alcance comprobado; cron automático y UI personal no verificados. El objetivo global y commit/push del conjunto continúan pendientes.

## 8 octubre — Ampliación de Notificaciones: avisos manuales, reglas y plantillas
Evidencia180/181: integración real contra Neon QA aprobada. Dos envíos manuales simultáneos con la misma clave producen1 aviso y1 auditoría; destino exclusivo inbox propio, texto normalizado y enlace externo descartado. Regla con evento QA único sin otras reglas asociadas, audiencia explícita de1 usuario y condición compuesta: status QA_READY y amount>=2. Dos condiciones negativas no entregan; dos disparos concurrentes válidos entregan1, replay no entrega otra. Variables entity/customer y enlace interno renderizados correctamente. Una auditoría de disparo. Regla INACTIVE deja de entregar. Finalmente se verificaron valores persistidos INACTIVE y plantilla enabled=false; no se modificaron preferencias personales.
Fixture181: regla notification-rule-da00c3fe-b3b3-435f-bcdd-d16279b9d0ab; plantilla notification-template-24c35be3-7f63-489d-8cdd-ce9dc6bb6c83; aviso manual notification-0974bc7c-ba64-40dd-acca-5842095543a6; aviso regla notification-2b917451-c293-4b30-ac6f-b71eab3fb5d8. Se conservan registros QA y auditoría; ningún correo, WhatsApp o envío externo. Evento QA propio; no disparó reglas operativas existentes.
Prueba integrada al runner con gate QA_NOTIFICATION_RULES=1. TypeScript y ESLint182 aprobados. Solo se añadieron scripts de pruebas y runner; no cambió código de aplicación ni el build servido179. No se presenta como validación visual ni comprobación de cron. Pendientes: preferencias en UI, filtros completos, lectura de inbox y roles reales en navegador personal.

## 8 octubre — F56 · Concurrencia en solicitudes y órdenes de compra
Reproducción184: solicitudes y OC con la misma clave, creadas en paralelo, persistían1 registro cada una pero respondían fulfilled/rejected. Se añadió advisorylock de clave antes de consultar replay en createPurchase y createPurchaseRequest, conservando los índices únicos. Evidencia185/186: ambas respuestas válidas,1 creación+1 replay, una línea por entidad, sin duplicación de auditoría.
Cobertura adicional186: proveedor QA creado, duplicado por correo rechazado, edición sin motivo rechazada, edición válida persistida, proveedor INACTIVE bloquea OC y moneda distinta rechazada. Solicitud DRAFT no admite APPROVED; SUBMITTED exige motivo para REJECTED; REJECTED no admite aprobación. Segunda solicitud cancelada. OC DRAFT subtotal10(costos sintéticos5x2); no admite recepción; emisión pasa PENDING, segunda emisión rechazada; cancelación exige motivo y termina CANCELLED; recepción posterior rechazada. Inventario completo del producto QA comparado antes/después: onHand y reserved sin cambios. Auditoría: exactamente1 evento por creación, envío, rechazo, emisión y cancelación esperados.
Fixture186: proveedor supplier-4c0521f0-15aa-4738-830c-dbf666c21e0d quedó INACTIVE; solicitud purchase-request-b94368be-b99c-43b8-bf29-a5f6d9e25666 REJECTED; solicitud purchase-request-9841b1ef-f240-46a7-b07d-8ed9af725b09 CANCELLED; OC purchase-d759b1cb-3a0a-4143-aca6-23b09d72a033 CANCELLED. Se conservan registros QA y auditoría. Ninguna recepción, movimiento de stock, comunicación externa ni dato de proveedor real.
Caso al runner opt-in QA_PURCHASE_WORKFLOW=1. Contrato de exclusión por clave añadido CP039. Regresión187 en curso. Es cobertura del servicio/persistencia; no sustituye usar formularios, roles o estados visuales en Brave. Recepciones concurrentes no incluidas; su comprobación sigue pendiente.
Regresión187 terminó exit0:433 casos TAP aprobados,0 fallos,10 omitidos por gates; fases, TypeScript, ESLint y build aprobados. diff --check sin errores. Local reiniciado con este build en http://localhost:3000, sesión58923 Ready. F56 verificado al alcance de servicio/persistencia indicado; interfaz y roles de Compras siguen pendientes. No se cerró el objetivo global ni se realizó commit/push del conjunto.

## 8 octubre — F57 · Replay concurrente de recepciones
Prueba188 se detuvo antes de crear registros por una precondición demasiado estricta del mínimo de stock; se sustituyó por comprobar que la recepción QA quede por encima del umbral, sin cambiar configuración. Reproducción189: misma recepción en paralelo responde fulfilled/rejected; solo una unidad recibida. El cierre de esa fixture falló por ausencia de notas obligatorias en el ajuste de inventario, error del script QA. Corrección y recuperación190 por IDs exclusivos: se retiró exactamente1 unidad mediante ADJUSTMENT_OUT trazado, OC parcial cancelada y proveedor desactivado; saldo comprobado onHand3/reserved1. No se borraron movimientos, recepciones ni auditoría. Script de recuperación guardado en190-receipt-recovery.ts.
CorrecciónF57: receivePurchase bloquea la clave de recepción antes de consultar replay y antes de tocar la OC/stock. Evidencia191 aprobada: dos llamadas misma clave responden correctamente(1 creación/1 replay),1 recepción parcial/1 unidad; replay posterior sin nueva entrada; clave utilizada con otra OC rechazada. Dos recepciones distintas por2 unidades compiten por pendiente2: una entra, otra rechazada; finalRECEIVED3. Exactamente2 recepciones,2 movimientos con suma3,2 auditorías receipt_posted y reservas intactas. Después se retiraron las3 unidades sintéticas con un ajuste QA trazado; stock restaurado a3/1. Proveedor quedó INACTIVE. No hubo comunicaciones ni pagos externos; no se dispararon avisos de bajo stock.
Fixture191: OC purchase-e35f927f-68ec-4d40-8150-93573d29fd3a; recepciones purchase-receipt-5705e2c2-03a3-41ee-b085-5c38cf9c259d y purchase-receipt-7f24548c-0b47-44e1-b91f-2ef1c03dfae4. Registros y trazabilidad conservados. Caso al runner opt-in QA_PURCHASE_RECEIPT=1 y contratoCP039 actualizado. Regresión192 en curso. Esto prueba servicio y persistencia, no UI de recepción ni permisos reales de navegador.
Regresión192 terminó exit0:434 casos TAP aprobados,0 fallos,11 omitidos por gates; fases, TypeScript, ESLint y build aprobados. diff --check sin errores. Local reiniciado con este build, Ready en http://localhost:3000, sesión50379. F57 corregido y verificado al alcance de servicio indicado. Stock QA restaurado y trazabilidad conservada. La validación visual, F33, roles reales y cierre global/commit/push siguen pendientes.

## 8 octubre — F58 · Proveedores duplicados al crear/editar
Reproducción193: dos altas concurrentes con igual correo/identificación fueron aceptadas; editar otro proveedor copiando esos campos también fue aceptado (emailRejected/identificationRejected=false). Fixtures exclusivamente QA.
Corrección: createSupplier/updateSupplier comparten assertSupplierIdentityAvailable. Bloqueo por identidades ordenadas antes de consultar duplicados; correo comparado sin distinguir mayúsculas; edición excluye el propio ID. Una edición rechazada no actualiza la fila ni auditoría. No se cambió esquema ni se fusionaron proveedores reales.
Evidencia195/196: un alta válida y un duplicado rechazado; edición de correo/identificación ajenos rechazada y valores previos conservados; identidad propia permitida. Dos ediciones concurrentes al mismo correo: una aceptada y otra rechazada. Alta con correo equivalente en mayúsculas rechazada. Fixtures cerradas INACTIVE y con correo/identificación sintéticos únicos.
Las3 filas QA duplicadas de193 se corrigieron exclusivamente por IDs verificados, preservando registros/auditoría. Evidencia194-supplier-cleanup-final.log aprobada; primer intento194 no cargó dependencia y no ejecutó SQL. IDs: supplier-3d7f6a38-d3bf-4d83-8bf8-92123ceeedc8, supplier-0f3f2e93-1aec-4c7e-917c-285f42a81754, supplier-d1d22887-4eda-4cc5-9491-100d46d942e7. Ningún proveedor real modificado.
Fixture196: supplier-db0075e7-ce9f-49d2-85ad-d1601297c4f9 y supplier-d808ff1b-e4df-4981-a41f-4e0ba49614ef. Verificación198 solo SELECT sobre toda la base:0 grupos de correo duplicado(sin distinguir mayúsculas),0 grupos de identificación duplicada, sin mostrar datos personales. Es evidencia puntual de estos2campos, no una auditoría completa del maestro de proveedores.
ContratoCP039 y prueba opt-in QA_SUPPLIER_IDENTITY=1 integrados. Regresión197 en curso. UI/roles en navegador personal y objetivo global siguen pendientes.
Regresión197 terminó exit0:435 casos TAP aprobados,0 fallos,12 omitidos por gates; fases, TypeScript, ESLint y build aprobados. Reejecución199 de integraciones QA de Compras y recepción, después del cambio de proveedores, aprobada; stock sintético retirado con traza y saldo restaurado. Local reiniciado con este build, Ready en http://localhost:3000, sesión44620. F58 corregido al alcance descrito. Brave continúa ausente; UI, roles, descargasF33 y cierre global/commit/push siguen pendientes.

## F59 — Clientes: edición parcial borraba el nombre (2026-10-08)
Reproducción200: validateCustomerInput({notes}, true) añadía name vacío; también permitía enviar un nombre vacío explícito. Corregido para conservar campos ausentes y rechazar borrar el nombre obligatorio. Evidencia201:7 pruebas aprobadas,0 fallos.
Integración202 en Neon de pruebas con el cliente QA existente: guardado sin motivo rechazado; notas editadas y nombre conservado; vista360 con3 cotizaciones,3 oportunidades,2 ventas,2 pedidos y5 pagos; paginación por1 elemento y segunda página distintas. Flags de proyección excluyen ventas/pagos/pedidos. Esto verifica el repositorio, no sesiones reales de roles ni el formulario visual. Finalmente restaurados nombre/notas originales con motivo y auditoría; sin modificar pagos/pedidos/stock.
Prueba reutilizable scripts/customer-360.integration.test.ts, opt-in QA_CUSTOMER_360=1, rechaza producción. Regresión203 en curso. La campaña de Promociones QA quedó pausada por confirmación del usuario. DescargasF33 y validación visual en Brave continúan pendientes; no se considera completada la auditoría global.
Regresión203 finalizó exit0:437 pruebas TAP aprobadas,0 fallos; fases, TypeScript, ESLint y build aprobados. Local reiniciado con el cambio F59. Integración202 aprobada por separado. Continúan pendientes UI personal/roles/descargas y cierre global; no se hizo commit/push en este paso.

## F60 — Clientes: principales duplicados por guardados concurrentes (2026-10-08)
Reproducción204 en cliente QA separado: dos altas simultáneas generaron2 contactos principales y2 direcciones principales. Las transacciones leían el cliente sin bloqueo y ambas reemplazaban un conjunto inicialmente vacío. Corrección: addCustomerContact/addCustomerAddress bloquean la fila del cliente antes de cambiar principales e insertar. No se modificó el esquema ni se repararon registros reales sin evidencia.
Integraciones205 y207 aprobadas: dos llamadas simultáneas aceptadas en cada tipo,1 principal persistido; contactos/direcciones visibles en360; nota recortada persistida; entradas vacías rechazadas; contacto secundario conserva principal. TypeScript206 aprobado. Fixtures204/205/207 cerradas INACTIVE, contactos INACTIVE y principales retirados con auditoría qa.customer_relations_cleanup. No se borraron filas ni trazas, ni se modificaron el cliente QA comercial original, pagos/pedidos/stock.
Fixture204:customer-1e39d21d-531f-4717-91c6-730c6296aaf8; fixture205:customer-e33d2092-71d7-4371-9020-1795ce8a2aa4. Identificador207 en su log. Prueba opt-in QA_CUSTOMER_RELATIONS=1 rechaza producción; incorporada al runner junto con customer360, ambas omitidas sin autorización explícita por variables de entorno. ContratoCP037 exige bloqueo antes de reemplazar principales.
Alcance: servicios administrativos y repositorio; no prueba visual, sesiones reales de roles ni guardado del perfil público. Brave continúa ausente del controlador. Regresión208 en curso; objetivo global y descargasF33 pendientes.
Regresión208 finalizó exit0:438 pruebas TAP aprobadas,0 fallos,14 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Integraciones205/207 ejecutadas explícitamente y aprobadas. Local reiniciado con F60, Ready en localhost:3000. Validación visual en Brave, descargas y objetivo global continúan pendientes; no se hizo commit/push en este paso.

## F61 — Cuenta: guardado bloqueado por FOR UPDATE sobre LEFT JOIN (2026-10-08)
Reproducción209 contra Neon, sin escrituras: consulta usada por PATCH /api/cuenta/perfil falló con PostgreSQL0A000, «FOR UPDATE cannot be applied to the nullable side of an outer join». La consulta fallaba antes de actualizar campos, devolviendo503 desde el catch de la ruta.
Corrección: helper compartido loadProfileForUpdate bloquea primero usuario y después cliente con SELECTs separados en la misma transacción. Conserva los campos y el caso sin cliente; la ruta utiliza ese helper. El bloqueo del cliente precede al de la dirección, coordinándose con F60. Sin cambios de esquema, credenciales ni roles.
Evidencia210/211: consulta corregida aprobada, usuario inexistente devuelve null y vínculo existente devuelve el cliente correspondiente;0 escrituras en estas pruebas. Se omitió imprimir identidad/datos personales. Prueba opt-in QA_ACCOUNT_PROFILE_LOCK=1 rechaza producción y usa la misma función que la ruta. Contratophase30 exige helper y ausencia de LEFT JOIN bloqueado. No se afirma verificado el guardado HTTP autenticado ni su formulario: esos casos quedan pendientes del navegador personal.
Regresión212 en curso. F61 corrige el fallo PostgreSQL reproducido; objetivo global, visual, roles, descargaF33 y commit/push pendientes.
Regresión212 terminó exit0:438 pruebas TAP aprobadas,0 fallos,15 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Integración211 ejecutada por separado y aprobada, sin escrituras. Local reiniciado con F61, Ready en localhost:3000. El formulario/HTTP autenticado, visual en Brave, roles y descargas siguen pendientes. Sin commit/push en este paso.

## F62 — Pipeline: dos cierres incompatibles aceptados simultáneamente (2026-10-08)
Integración213 en cliente QA separado recorrió NEW→CONTACTED→QUOTING→FOLLOW_UP→NEGOTIATION→LOST; verificó rechazos de salto a PAID, QUOTE_SENT sin cotización, seguimiento sin datos, ACCEPTED sin datos, SALE sin conversión explícita, LOST sin motivo y reapertura desde LOST. Seguimiento adicional completado con completedAt. El flujo dejó6 entradas válidas de historia.
Reproducción concurrente213: LOST y CANCELLED desde NEW fueron ambas aceptadas; historia con creación y2 cierres desde la misma etapa. CorrecciónF62: changeOpportunityStage bloquea la oportunidad antes de leer/validar la transición. Integración214 aprobada:1 cierre aceptado,1 rechazado y2 entradas totales en historia. Repetición215 y regresión216; resultados finales se agregan al terminar.
Prueba opt-in QA_PIPELINE_WORKFLOW=1 rechaza producción, incorporada al runner; contratoCP037 exige bloqueo antes de validar transición. Finalmente se cancelan solo seguimientos QA pendientes y se cierran oportunidades/clientes propios; se conservan filas e historia/auditoría. Sin cotizaciones nuevas, precios, venta, pagos, stock ni mensajes externos.
Fixture213: customer-7c302daa-e484-4cd0-985e-00af5f1fa5d5; oportunidades opportunity-ec81bc68-1b08-44c5-aeb1-8c246ec32ae0 y opportunity-8c4a9c14-06aa-42b4-84e9-a3c21b809ddf. Se retiene historia defectuosa de reproducción como evidencia QA. Fixture214:customer-d26db58b-ce99-4bea-8a31-45a5fa88524e; IDs215 en log.
Alcance: servicios/transacciones reales de Neon, no uso de tablero/drawer autenticado. Visual personal, sesiones de roles, descargasF33 y objetivo global pendientes; no commit/push en este paso.
Repetición215 aprobada:1 cierre aceptado/1 rechazado, historial consistente; fixtures cerradas y seguimientos QA sin pendientes. Regresión216 terminó exit0:439 pruebas TAP aprobadas,0 fallos,16 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Local reiniciado con F62, Ready en localhost:3000. Validación visual personal, roles, descargas y cierre global permanecen pendientes.

## F63 — CRM/Operaciones: estados y fechas desincronizados (2026-10-09)
Reproducción217 en cliente QA separado: tarea CRM reabierta seguía RESOLVED con resolvedAt en Operaciones. Seguimiento resuelto desde Operaciones quedaba COMPLETED sin completedAt y la oportunidad conservaba followUpAt/nextAction pendientes. Los4 controles fallaron. Fixture cerrada conservando auditoría; el cleanup completó la tarea y el seguimiento desde CRM y cerró oportunidad/cliente.
CorrecciónF63: función común syncCrmWorkItemStatus para tareas y seguimientos sincroniza COMPLETED→RESOLVED(fecha), CANCELLED→STALE, PENDING/OVERDUE→PENDING o IN_PROGRESS según asignación, retirando resolvedAt; cambios dejan historia y auditoría. CRM bloquea el origen antes del work-item. Resolver desde Operaciones usa el mismo orden, registra completedAt/updatedAt y refresca la próxima acción del seguimiento en la misma transacción. Se extrajo refreshOpportunityFollowUpSnapshot como función compartida, sin cambiar su cálculo.
Evidencia218 inicial y220 ciclo extendido aprobados: tomar, liberar/reasignar con motivo; rechazo sin motivo, responsable inexistente y actor de tipo customer; resolver y bloqueo de nuevas acciones resueltas; tarea reabierta accionable/fecha retirada; seguimiento con fecha de cierre y snapshot limpio; cancelar/reabrir ambos tipos, historial REOPEN; completar desde CRM y Operaciones simultáneamente converge a RESOLVED con fecha y sin deadlock observado. Actor customer es una prueba del servicio, no una sesión real RBAC.
219 TypeScript aprobado. Repetición221 junto a Pipeline y regresión222 en curso. Prueba opt-in QA_OPERATIONS_WORKFLOW=1 rechaza producción, integrada al runner. Ningún pago/stock ni mensaje externo. Registros propios finalizan COMPLETED/RESOLVED; oportunidad CANCELLED y cliente INACTIVE. Historial/auditoría conservados; no limpieza de registros ajenos.
Fixture217:customer-85de8bbd-8756-47a4-bcfd-92d818cfdebf, task-c89552c0-df1f-47aa-b60c-be1ca420d0d5, opportunity-23e317c7-439e-40fb-b013-04203339d712, opportunity-followup-72b5e0c7-cc3c-40e3-8728-c6e67d01844b. Fixture220:customer-ca724aed-0a87-44e8-8003-31dca69f08f4; demásIDs220/221 en logs.
Alcance: servicios en Neon. UI autenticada, roles reales, visual y descargasF33 pendientes. Objetivo global incompleto, sin commit/push en este paso.
Repetición221 de Operaciones y Pipeline aprobada:2 integraciones,0 fallos; fixtures cerradas. Regresión222 terminó exit0:440 pruebas TAP aprobadas,0 fallos,17 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Local reiniciado con F63, Ready en localhost:3000. Brave ausente; UI/roles reales, descargasF33 y cierre global pendientes. Sin commit/push en este paso.

## F64 — Operaciones: reasignación a responsable sin permisos (2026-10-09)
Reproducción223: reassignOperationsWorkItem aceptó un usuario existente activo sin permiso para atender FOLLOW_UP del equipoVENTAS; cambió responsable e insertó historia. Se usó solo una tarea QA del cliente QA existente, sin alterar la cuenta ni su rol y sin notificación/mensaje. Finalmente se retiró la asignación y la tarea quedó COMPLETED/RESOLVED.
Corrección: además de usuario activo, valida canActOnOperationsWorkItem con equipo/tipo de origen y roleCode o role del responsable antes de escribir. El propio actor conserva sus controles previos. No se creó usuario ni se cambió rol/permiso.
Evidencia224 aprobada: responsable incompatible rechazado, asignación/estado/historia intactos; responsable autorizado aceptado. Prueba opt-in QA_OPERATIONS_ASSIGNEE=1 rechaza producción, usa usuarios existentes y no imprime sus identidades; registros nuevos son exclusivamente QA. ContratoCP049 exige validación antes de UPDATE. Repetición225 junto al ciclo de Operaciones y regresión226 en curso.
Fixture223:task-f2568882-eb15-435f-bdd3-a81ecd1b2836; IDs224/225 en logs. Todas las asignaciones de prueba se retiran con motivo y auditoría, y tareas se completan; historia retenida. Cliente comercial QA original sin cambios de datos; ningún pago/pedido/stock modificado.
Alcance: servicio real en Neon y rol leído de la base. No reemplaza pruebas HTTP ni sesiones reales de roles. UI personal/visual, descargasF33 y objetivo global pendientes; sin commit/push en este paso.
Repetición225 aprobada:2 integraciones de Operaciones,0 fallos, asignaciones QA retiradas y tareas completadas. Regresión226 terminó exit0:441 pruebas TAP aprobadas,0 fallos,18 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Local reiniciado con F64, Ready en localhost:3000. UI/roles reales, visual en Brave y descargasF33 pendientes; objetivo global incompleto.

## F65 — Configuración: restauración sin controles de campos protegidos y caché interna (2026-10-09)
Inspección de POST /api/admin/configuracion/restaurar: exigía settings.business.edit, pero restauraba el snapshot validado sin comprobar cambios de taxRate/taxMode o legalPagesPublished. PUT sí restringía esos campos. Además restaurar solo revalidaba la etiqueta de Next y no limpiaba las entradas company-settings:public/tax de withRuntimeCache. Evidencia227: contrato nuevo falló por ausencia de controles. No se ejecutó una restauración fiscal/legal real para reproducir.
CorrecciónF65: assertCompanySettingsRestorePermissions compara campos protegidos entre configuración actual y candidata dentro de la transacción y antes del UPDATE. Cambio fiscal exige SUPERADMIN; cambio de publicación legal exige settings.legal.publish. Restauraciones descriptivas con esos valores equivalentes se permiten. Error de permiso devuelve403 con código específico. Después del commit se invalida el prefijo company-settings: además de revalidateTag.
Evidencia228:8 pruebas dirigidas aprobadas,0 fallos. Casos unitarios con GERENCIA/ADMIN/OPERACIONES_VENTAS rechazan alta/borrado fiscal y cambio de publicación en ambos sentidos; SUPERADMIN permitido; restaura descriptivos sin cambiar protegidos y normaliza equivalencias18/18.00 y UNCONFIGURED/null. Prueba de caché en memoria: entradas pública/fiscal vuelven a cargar, otra clave se conserva. Valores fiscales de tests son sintéticos, no configuración real. Contrato de ruta confirma guard antes de escribir, mapeo de error e invalidación. Prueba integrada al runner.
Esta ronda no escribió configuración ni datos fiscales/legales en Neon. Pendientes: guardado/restauración autenticados completos, caché durante cargas concurrentes, visual de Configuración y sesiones reales RBAC. Regresión229 en curso. Objetivo global, descargasF33 y commit/push pendientes.
Regresión229 terminó exit0:445 pruebas TAP aprobadas,0 fallos,18 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Local reiniciado con F65, Ready en localhost:3000. Pruebas de restauración fiscal/legal fueron unitarias; no cambio en datos reales. Pendientes guardado/restauración autenticados, UI/roles/visual en Brave, descargasF33 y cierre global.

## F66 — Caché: lectura antigua repoblaba datos después de invalidar (2026-10-09)
Reproducción230 con promesas controladas sobre withRuntimeCache real:3 fallos de6 pruebas. Una lectura en curso invalidada podía reinsertar el valor antiguo; otra podía sobrescribir un valor fresco cargado después de invalidar; lectura pendiente expirada podía reemplazar su sucesora. Fallo de lectura invalidada ya preservaba nueva entrada y coalescing/prefijo básico ya pasaban.
CorrecciónF66: cada carga conserva su objeto de entrada; solo escribe o elimina caché si ese mismo objeto sigue siendo dueño de la clave. Una respuesta anterior puede terminar para su solicitante, pero no repuebla ni sobrescribe caché invalidada/reemplazada. Se conserva la política de TTL y el comportamiento desactivado fuera de producción.
Evidencia231:9 pruebas aprobadas,0 fallos (6 caché +3 restauración Configuración). Casos deterministas sin sleeps/DB; no cambios de datos reales. Se incorporó catalog-runtime-cache.test.ts al runner completo: antes se ejecutaba por el comando dedicado test:catalog-performance, no por test:all. Regresión232 en curso.
Aplicación: caché compartida por categorías/familias/marcas públicas y Configuración pública/fiscal. La corrección no equivale a verificación de todas esas páginas en navegador. Pendientes guardado/restauración autenticados, visual en Brave, sesiones reales, descargasF33 y cierre global; sin commit/push en este paso.
Regresión232 terminó exit0:451 pruebas TAP aprobadas,0 fallos,18 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Local reiniciado con F66, Ready en localhost:3000. Caché concurrente verificada mediante promesas controladas; no pruebas visuales ni escrituras DB en esta ronda. UI autenticada, roles reales, visual en Brave, descargasF33 y cierre global pendientes.

## F67 — Precios: replay concurrente fallaba y edición distinta se aceptaba como repetición (2026-10-09)
Integración233 en el producto QA existente con precio SPECIAL sintético INACTIVE y vigencia futura fija: dos altas con la misma clave dieron1 éxito/1 fallo. Actualizar reutilizando una clave con distinto importe o mínimo permitido devolvía idempotent:true en lugar de rechazar el conflicto. Validación de motivo/decimales/mínimo ya rechazaba entradas inválidas.
CorrecciónF67: creación/edición/reemplazo/archivo toman un bloqueo por clave antes de buscar replay. La edición compara producto/tipo/importe/moneda/vigencias/estado/cantidad mayorista/mínimo permitido; creación y reemplazo incluyen también estos2últimos campos. Archivo solo acepta replay si el precio está ARCHIVED, no meramente INACTIVE. Se conserva bloqueo de ventanas por producto/tipo.
Evidencia234 aprobada. Repetición extendida235 aprobada: dos altas responden correctamente(1 creación/1 replay,1 fila); dos ediciones idénticas concurrentes(1 cambio/1 replay); mismo key con importe/mínimo/cantidad distintos rechazado; clave de alta inactiva no se acepta como archivo. Precio RETAIL del producto QA idéntico al snapshot inicial. Nuevos SPECIAL fueron INACTIVE desde su creación y finalmente ARCHIVED con motivo/historia/auditoría; ningún precio real ni catálogo público modificado. No se eliminan filas ni trazas.
Fixture233:price-3b150208-4d32-4323-922f-e65fa8846275; demásIDs234/235 en logs. Prueba opt-in QA_PRICING_WORKFLOW=1 rechaza producción y está integrada al runner. ContratoCP033 cubre bloqueo previo y comparación de campos. Regresión236 en curso.
Alcance: creación y replay inmediato de edición, pruebas reales Neon. Reemplazo/archivo tienen cobertura de contrato y rechazo de clave de alta, no ciclo completo. Pendientes importaciones de Precios, replay tras mutaciones posteriores, UI/roles autenticados, visual en Brave, descargasF33 y objetivo global; sin commit/push en este paso.
Regresión236 terminó exit0:451 pruebas TAP aprobadas,0 fallos,19 omitidas por gates; fases, TypeScript, ESLint y build aprobados. Complemento237 (test:cp033) aprobado:11 pruebas TAP,0 fallos. El runner de236 se inició antes de incorporar cp033-pricing.test.ts; esa incorporación aplicará a la próxima regresión completa. Local reiniciado con F67, Ready en localhost:3000. Importaciones/replay tras mutaciones posteriores, UI/roles/visual en Brave, descargasF33 y cierre global siguen pendientes.

## F68 — Precios: lectura de CSV altera encabezados y fechas (2026-10-09)
Reproducción238/238b: la vista previa acepta una vigencia futura 2029-01-01 en CSV UTF-8 sin BOM con encabezado «Válido desde». No se ejecutó la aplicación de precios: la integración se detuvo en esa comprobación y no escribió precios.
Diagnóstico local con XLSX.read y las mismas opciones del servicio: sin BOM, los encabezados acentuados se interpretan incorrectamente; por ello el alias de vigencia no se reconoce y usa la fecha por defecto. Con BOM, reconoce el encabezado pero raw:false transforma 2029-01-01 en 12/31/28 en este entorno. raw:true y codepage:65001 preservan los encabezados UTF-8 sin BOM y las fechas ISO en el caso reproducido. Esto es evidencia de diagnóstico, no una corrección aplicada ni validación de todos los formatos XLS/XLSX.
Estado: abierto. Pendientes preservar fechas/encabezados correctamente, probar fechas nativas XLSX y continuar la prueba de aplicación concurrente y repetición. La prueba nueva pricing-import.integration.test.ts queda pendiente de completar; no declarar aprobado ese flujo.
Confirmación del usuario recibida: pausó manualmente «QA AUDITORÍA — Campaña de prueba». Se registra su confirmación; no equivale a nueva verificación visual o consulta de estado en esta ronda. Descargas F33 y validación visual en Brave siguen pendientes.

### F68 corregido y F69 — Importaciones concurrentes de Precios (2026-10-09)
Lectura separada: CSV se decodifica UTF-8 con TextDecoder fatal y raw:true, preservando BOM/tildes/SKU textual/fechas ISO. XLS/XLSX se leen como binarios con cellNF; fechas numéricas con formato de fecha se convierten mediante SSF.parse_date_code, sin año abreviado ni conversión Date dependiente de zona. Vigencias con segundos sin zona se interpretan en Lima igual que fechas/minutos.
Pruebas pricing-import-file.test.ts: CSV con/sin BOM, XLS y XLSX con fecha serial nativa47119=2029-01-01;2 pruebas aprobadas. La primera aproximación falló en BOM y fecha nativa y se reemplazó antes de validar. TypeScript y ESLint dirigidos aprobados.
Evidencia239: fecha futura se rechaza; dos aplicaciones concurrentes diferentes crean2 SPECIAL ACTIVE superpuestos. Ambos precios del producto QA quedaron archivados por cleanup con historial. Sin cambios al precio RETAIL.
CorrecciónF69: aplicación toma bloqueo por lote y bloqueos por producto/tipo en orden estable, comprueba ventanas activas y snapshot actualizado dentro de la transacción antes de escribir. Un lote se identifica por hash de bytes/nombre/motivo/actor y su auditoría persistida impide repetir escrituras del lote aplicado. Claves de filas incluyen hash, evitando colisión simple por nombre/fila.
Evidencia240 aprobada: archivo con SKU inexistente rechazado sin cambios, duplicado/precisión/vigencia futura/costo sin permiso rechazados; importaciones concurrentes1 aplicada/1 rechazada,1 SPECIAL activo; replay sin historial adicional, RETAIL intacto. Precio QA creado archivado al terminar. No pagos/stock/configuración modificados. Ambas pruebas incorporadas al runner, integración protegida por QA_PRICING_IMPORT.
Pendientes: ampliar cobertura de cambios sobre precios existentes, atomicidad multirregistro concurrente, fechas1904 y formatos regionales; HTTP/UI autenticada y regresión/build actuales. Servidor todavía ejecuta build236. Descargas F33, visual Brave y objetivo global siguen abiertos; sin commit/push.
Regresión241 terminó exit0:459 pruebas TAP aprobadas,0 fallos,20 omitidas por gates; fases,TypeScript,ESLint y build aprobados. Local reconstruido con F68/F69. La prueba de importación240 se ejecutó aparte y pasó contra Neon QA. Persisten UI/roles reales, visual Brave, descargasF33 y cierre global; sin commit/push.

### F68/F69 ampliación242 (2026-10-09)
Pruebas de archivo3/3 aprobadas: CSV con/sin BOM, XLS/XLSX, calendario Excel1904 con hora12:00, coma decimal entre comillas. TypeScript y ESLint posteriores aprobados. Esta ronda modifica solo pruebas, no código de aplicación; local mantiene build241.
Integración242 aprobada contra Neon QA: además de rechazo/concurrencia/replay, aplica segunda lista con mismo nombre pero importe26.00 sobre el precio SPECIAL existente; conserva ID e incrementa historial exactamente1. Repite después el lote original: no revierte importe26.00 ni añade historial. Precio price-4699bd0c-0a72-4917-bf68-f56fd4cb3166 archivado en cleanup; RETAIL intacto. Evidencia242-pricing-import-expanded.log.
Alcance pendiente: atomicidad concurrente multirregistro, errores de fechas regionales/inválidas y formulario HTTP/UI autenticado. La respuesta de replay todavía devuelve la vista previa actual, no un resultado original persistido; comprobar presentación/conteos antes de dar por terminado el flujo. DescargasF33 y visual Brave pendientes. No commit/push ni cierre global.

## F70 — Precios: replay informaba cambios no aplicados (2026-10-09)
Reproducción243: repetir una importación ya aplicada no escribía historial, pero devolvía changes1 desde la vista previa. PricingImportDialog usa esos contadores para informar cambios aplicados; defecto confirmado en respuesta de servicio y uso del código, sin reproducción visual en Brave.
Corrección: replay devuelve newPrices0/changes0/idempotenttrue; primera aplicación devuelve idempotentfalse. Ambas respuestas pasan por publicPreview para retirar los snapshots internos de filas. No cambio de diseño/estilos/interacción del diálogo.
Integración244 aprobada: concurrencia, rechazo atómico de archivo inválido, edición mismo nombre con distinto contenido, replay inmediato y replay tras edición posterior con contadores0 e historial intacto; SPECIAL QA archivado y RETAIL intacto. No pagos ni inventario modificados.
Regresión245 en curso, sesión81998; servidor26652 detenido antes del build. Reiniciar local únicamente tras final exitoso. F70 requiere todavía validación HTTP/UI autenticada. Brave ausente, descargasF33 y cierre global pendientes; no commit/push.
Regresión245 terminada exit0: pruebas, fases,TypeScript,ESLint y build aprobados; local reiniciado con F70. Validación de respuesta por integración244, visual personal y descargasF33 pendientes.

## F71 — Precios: días inexistentes normalizados silenciosamente (2026-10-09)
Reproducción246: preview acepta 2026-02-30 sin error; la comprobación se detiene antes de aplicar y no crea precio. parseDate delegaba a Date, que normaliza días inexistentes.
Corrección: antes de interpretar vigencia ISO se valida fecha civil YYYY-MM-DD por roundtrip UTC; se rechaza si normaliza día/mes/año. No modifica la zona Lima ni fechas nativas Excel corregidas previamente.
Integración247 aprobada: rechaza2026-02-30 y2025-02-29; permite2024-02-29. Repite casos previos de importación/concurrencia/edición/replay, conserva RETAIL y archiva SPECIAL QA price-96551da0-6736-4bce-965b-d7fbcfbf6390. Alcance: fechas ISO; formatos regionales ambiguos no certificados. ESLint/TypeScript dirigidos en curso al redactar. Local todavía build245, rebuild posterior pendiente. UI visual y descargasF33 abiertas; sin commit/push.
F71: ESLint y TypeScript dirigidos terminaron exit0. Regresión248 iniciada (sesión42807 confirmada activa); servidor41789 detenido para reconstruir. No dar local por actualizado hasta build y Ready.
Regresión248 terminó exit0: pruebas/fases/TypeScript/ESLint/build aprobados. Local reiniciado con F71 (fechas inexistentes rechazadas); UI/Brave/descargasF33 y prueba de descuentos pendientes. Sin cierre global ni commit/push.

## F72 — Descuentos: pausa concurrente sin resultado y auditoría duplicada (2026-10-09)
Reproducción249 en regla QA futura2035–2036: dos pausas simultáneas devuelven1regla/1resultado vacío, ambasidempotentfalse y2eventos. Regla discount-rule-505fd014-553c-40a7-9186-c2c169878c9c queda INACTIVE; auditoría defectuosa retenida para evidencia.
Corrección: updateDiscountRule y setDiscountRuleStatus bloquean fila FOR UPDATE antes de leer y decidir replay/cambio. Evidencia250:1modificación/1replay, ambas respuestas válidas y1evento. Ampliación251 aprobada: edición idéntica concurrente también1cambio/1replay/1auditoría; estadoINACTIVE conservado; motivo vacío y actorCUSTOMER rechazados. RolCUSTOMER solo parámetro simulado; no cambio de usuarios/permisos.
Fixtures250/251 quedanINACTIVE, vigencia futura fija; sin efecto comercial vigente, pagos/stock/productos intactos. Test protegido por QA_DISCOUNT_WORKFLOW y no producción, integrado al runner. TypeScript/ESLint dirigidos terminados exit0. Rebuild/regresión completos posteriores pendientes; local sigue build248 (sesión50468). API/UI autenticada, visual Brave y descargasF33 siguen pendientes. Sin commit/push ni cierre global.
Corrección de registro F72: TypeScript inicial rechazó el parámetro simulado CUSTOMER (rol correcto customer). Se corrigió el test a customer; TypeScript posterior exit0 y repetición252 aprobada. No se modificaron roles reales. El resto de cobertura251 permanece válido para concurrencia, mientras permiso customer se acredita por252.
Regresión253 terminó exit0:460 TAP aprobadas,0 fallos,21 omitidas por gates; fases,TypeScript,ESLint y build aprobados. Local reiniciado con F72. Integración descuentos252 ejecutada aparte y aprobada. Taxonomía ampliada, visual Brave, roles/UI reales y descargasF33 siguen pendientes; sin commit/push ni cierre global.

## F73 — Taxonomía: reactivación omite categoría padre (2026-10-09)
Evidencia de código: PATCH families validaba categoría padre solo si categoryId cambiaba; activar familia con mismo padre inactivo no ejecutaba guard. Contrato nuevo falló antes de corregir. No se reprodujo mediante petición autenticada ni se modificó taxonomía en Neon.
Corrección: valida padre cuando familia quedará activa o cambia categoría. El control de productos vinculados conserva su alcance solo cuando cambia categoryId; editar/desactivar una familia inactiva con padre inactivo sigue permitido. Contrato taxonomy-parent.test.ts aprobado e integrado al runner. No cambio en catálogo fuente1348 ni productos/stock/precios.
Pendientes: HTTP/UI autenticada, integración de dependencia, concurrencia categoría/familia y unicidad sin distinción de mayúsculas. Regresión/build posteriores pendientes; local sigue build253 (sesión58637). Visual Brave/descargasF33 y objetivo global abiertos; sin commit/push.
Regresión254 terminó exit0: pruebas/fases/TypeScript/ESLint/build aprobados. Local reiniciado con F73. Contrato de guard padre no sustituye prueba HTTP/UI. Próxima cobertura: invalidación de caché Taxonomía, dependencia/concurrencia. Visual Brave, descargasF33 y objetivo global pendientes; sin commit/push.

## F74 — Taxonomía: caché pública no invalidada al guardar (2026-10-09)
Contrato255 falló: POST/PATCH taxonomía no invalidaban caché tras commit. Corrección: ambas rutas llaman clearPublicCatalogRuntimeCache después de resolver la transacción y antes de devolver éxito; no se limpia por fallos de escritura.
Evidencia256:8 pruebas aprobadas (contratos y caché). Ampliación257:9 aprobadas, incluye llamada real a clearPublicCatalogRuntimeCache sobre entradas sintéticas catalog:categories/families/brands y marcas por categoría; vuelven a cargar mientras clave ajena conserva valor. Casos de carga antigua concurrente también pasan. No conexión/escritura Neon ni cambios a catálogo1348 en estas pruebas.
TypeScript/ESLint dirigidos previos a ampliación257 terminaron exit0. Regresión/build posteriores pendientes; local sigue build254 (sesión75240). Validación HTTP/visual personal aún pendiente; no sustituir con prueba de caché en memoria. Dependencias y concurrencia Taxonomía, descargasF33 y objetivo global abiertos. Sin commit/push.
Regresión258 terminó exit0:463 TAP aprobadas,0 fallos,21 omitidas por gates; fases,TypeScript,ESLint y build aprobados. Local reiniciado con F74 (caché Taxonomía). Brave consultado y ausente; validación visual personal, HTTP/roles, dependencias/concurrencia Taxonomía y descargasF33 pendientes. main mantiene cambios sin commit/push; objetivo global no cerrado.

## F75 — Taxonomía: comprobaciones administrativas sin serialización (2026-10-09)
Contrato259 falló por falta de bloqueo previo. Riesgos identificados en código: unicidad lower(name/slug) y dependencia categoría/familia leen antes de escribir sin serializar. No se reprodujo duplicado real ni categoría/familia inconsistente en Neon.
Corrección: POST/PATCH toman bloqueo transaccional compartido coldpower:taxonomy-mutations antes de consultas de identidad/dependencias. Serializa mutaciones administrativas de las3entidades; no garantiza escrituras externas que no utilicen este bloqueo. Se elige alcance global de taxonomía para proteger invariantes entre entidades; posible coste de espera al guardar concurrentemente.
Evidencia260:5 pruebas aprobadas; contratos de ruta/cache/padre y integración real de bloqueo con2clientes. Segunda transacción no obtiene lock mientras primera lo posee; al terminar primera, segunda lo obtiene. No inserts/updates/deletes ni fixtures de categorías/marcas/familias/productos; catálogo fuente intacto. Test protegido QA_TAXONOMY_LOCK/no producción e integrado al runner.
Pendientes: probar flujos completos de dependencia/unicidad por API autenticada, visual Brave, regresión/build posteriores. Local sigue build258 (sesión34061). DescargasF33/objetivo global abiertos; sin commit/push.
Regresión261 terminó exit0: pruebas/fases/TypeScript/ESLint/build aprobados. Local reiniciado con F75 (bloqueo Taxonomía). Integración de exclusión260 aprobada aparte; no reemplaza dependencia/unicidad por API. Pendiente filtrado público de familias, UI/Brave/roles reales y descargasF33. Sin commit/push ni cierre global.

## F76 — Familias públicas sin filtro de estado (2026-10-09)
Inspección: queryCatalogFamilies no filtraba families.active ni categoría padre activa, a diferencia de categorías/marcas. Contrato262 falló; no se modificó ninguna familia real para reproducir.
Corrección: catálogo público usa catalogFamilyConditions con familia activa y EXISTS categoría activa; filtro de categoría opcional se conserva. Consulta administrativa publicOnlyfalse mantiene familias inactivas. Evidencia263:2 pruebas aprobadas, contrato de conexión del helper y SQL real generado por PgDialect; parámetros públicos/administrativos verificados. No escritura DB/catalog1348.
Alcance pendiente: menú general src/app/layout.tsx llama getCatalogFamilies(undefined,false), por lo que el menú aún no queda cubierto por el nuevo filtro. Cambiar ese comportamiento exige flujo product-design e inspección/validación personal; Brave sigue ausente. No afirmar filtrado público completo. Pendientes integración/HTTP de facetas, menú, TypeScript/ESLint en curso, regresión/build. Local sigue build261 (sesión32189). DescargasF33/objetivo global abiertos; sin commit/push.

### F76 integración de lectura264 (2026-10-09)
Prueba contra Neon sin escrituras: getCatalogFamilies público coincide con familias activas cuyos padres están activos; getCatalogFamilies(false) coincide con todas; filtro por categoría coincide con subconjunto esperado. Resultado171públicas/171administrativas,0excluidas por inactividad. No hay caso negativo real en esta base; exclusión de inactivas se acredita solo por SQL generado263, no por fixture negativa. No declarar probado un caso inexistente.
Test protegido QA_FAMILY_STATUS/no producción, integrado al runner. TypeScript/ESLint previosF76 terminaron exit0. Regresión265 en curso sesión27694; servidor32189 detenido antes de build. Menúgeneral sigue consultaadministrativa; visual Brave/descargasF33 y cierre global pendientes.
Regresión265 terminó exit0: pruebas/fases/TypeScript/ESLint/build aprobados. Local reiniciado con filtroF76. Integración264 de lectura aprobada con171familiasactivas y0inactivas; caso negativo real no presente. Menúgeneral usa consultaadministrativa y continúa pendiente junto a UI/Brave/roles/descargasF33. Sin commit/push ni cierre global.

### F76 casos negativos266 — consulta sintética sin escrituras (2026-10-09)
Ampliación de integración en Neon: CTE de SELECT crea categorías/familias sintéticas solo dentro de la consulta (no tablas ni INSERT). Se reutiliza catalogFamilyConditions real sobre4filas: activa/padre activo, familia inactiva, padre inactivo, padre inexistente. Resultado público1fila correcta; consulta completa4filas. Exclusión negativa queda probada mediante PostgreSQL real y condición reutilizada, sin modificar catálogo. Esto no equivale a desactivación/activación por API ni a verificación visual.
Repite lectura de171familias reales con match y filtro de categoría. Log266-family-status-negative-readonly.log aprobado. Solo modificación de test, no código de aplicación; local permanece build265 (sesión92440). Menúgeneral consultaadministrativa, UI/Brave/roles/descargasF33 y cierre global pendientes. Sin commit/push.

### Menú público — flujo Product Design revalidado (2026-10-09)
Se leyeron image-to-code, index, critical-overrides, user-context y design-qa; preflight Python correcto, sin user-context guardado. Código confirma loadNavigationFamilies usa getCatalogFamilies(undefined,false), pendiente conectar filtro público conservando familias activas sin productos y su jerarquía.
La skill image-to-code exige detener el paso visual cuando captura/comparación está bloqueada; design-qa exige final result: blocked. Inventario CUA actual solo IAB/MCP Apps sin pestañas; Brave personal ausente. AGENTS exige navegador personal autenticado, por lo que IAB no satisface esa validación. No cambio de menú aplicado en esta ronda, sin handoff visual.
final result: blocked
Bloqueo específico: captura y comparación del menú en Brave, mismo estado/viewport1920x1080/zoom100%. Pruebas backend F76 siguen válidas; no equivalen a menú verificado. Local sigue build265 sesión92440. Continúa trabajo independiente de navegador; objetivo global abierto, sin commit/push.

## F77 — Descuentos: fecha inexistente aceptada (2026-10-09)
Reproducción267: createDiscountRule acepta2035-02-30 y la normaliza. Regla de prueba con fecha futura desactivada inmediatamente; regla principal tambiénINACTIVE en finally. No efecto comercial vigente ni cambios de pagos/inventario/productos.
Corrección: parseDiscountDate valida fecha civil ISO por roundtrip UTC antes de convertir timestamp, aplicado a validFrom/validUntil de creación y edición. Se conserva validación de intervalo y significado de fechas ausentes. Formatos regionales ambiguos aún no certificados.
Integración268 aprobada: creación con día inexistente rechazada; edición con2035-02-29 rechazada sin evento de edición adicional; pruebas previas de pausa/edición concurrente/motivo/permiso siguen pasando. Reglas QA futuras quedanINACTIVE; historia retenida. Log268-discount-date-after.log. TypeScript/ESLint dirigidos terminados exit0.
Regresión/build posteriores pendientes; local siguebuild265 sesión92440. Menú visual detenido por skill/navegador personal ausente; F33 y objetivo global abiertos, sin commit/push.
Regresión269 terminó exit0: pruebas/fases/TypeScript/ESLint/build aprobados. Local reiniciado con F77(fecha de descuento). Próxima cobertura: contexto/replay/concurrencia de Promociones, sin reactivar originalQA. Visual Brave y menú bloqueados; F33/roles/HTTP y objetivo global abiertos. Sin commit/push.

## F78 — Aplicación de promoción: replay de contexto ajeno (2026-10-09)
270 falló en guard de fixture: campaña originalQA tiene estado persistidoINACTIVE, noPAUSED; ninguna escritura antes de ese fallo. Corrige el registro anterior: pausa confirmada por usuario se representaINACTIVE. No reactivada ni editada.
271 reproduce defecto: applyPromotion con clave de aplicación existente y contextId distinto devuelve resultado previo en lugar de conflicto. Fixture sintética insertada transaccionalmente en promotion_applications y audit qa.promotion_replay_fixture, solo productoQA/contextTypeQA_AUDITORIA. No venta/pedido/cobro ni cambio de precio publicado; campañaINACTIVE. Aplicaciones sintéticas/historia quedan conservadas y etiquetadas, sin efecto operativo.
Corrección: replay compara campaña/producto/contextType/contextId/baseUnitPrice positivo finito; discrepancia generaPROMOTION_IDEMPOTENCY_CONFLICT409. También valida resultado recuperado tras onConflict y rechaza ausencia de resultado.272 aprobada: replay idéntico permitido y5variantes de conflicto rechazadas. No se probó una nueva aplicación de campaña vigente ni la carrera onConflict; esta rama se protege por inspección y queda pendiente integración.
Test gateQA_PROMOTION_REPLAY/no producción, integrado al runner. TypeScript/ESLint dirigidos terminados exit0. Pendientes otras vías applyPromotionsInTransaction, atomicidad aplicación+auditoría, conflictos y aprobaciones, API/UI. Local siguebuild269 sesión7844; regresión/build posteriores pendientes. Visual Brave/F33/objetivo global abiertos; sin commit/push.
Regresión273 terminó exit0: pruebas/fases/TypeScript/ESLint/build aprobados. Local reiniciado con F78(replay applyPromotion). Próximo paso prioritario: replay de snapshots de checkout(recordPromotionalApplicationsInTransaction), aún no cubierto. UI/Brave/roles/descargasF33 y objetivo global pendientes; sin commit/push.

## F79 — Snapshots de promoción en checkout: replay sin validar (2026-10-09)
274 reproduce: recordPromotionalApplicationsInTransaction reutiliza registro con contextId distinto. Datos de aplicación sintéticos QA_AUDITORIA/productoQA/campaña originalINACTIVE; no venta/pedido/pago. Aplicaciones e historia retenidas con contexto QA.
Corrección: antes de reutilizar existente y tras recuperar onConflict, assertPromotionStepReplay compara campaña/producto/contextType/contextId/base del step, descuento y final.275 aprobada: replay applyPromotion previo y6conflictos de snapshot rechazados (3contexto/producto,3importes). Solo function de snapshots usada por sales-service cubierta; applyPromotionsInTransaction distinta vía continúa pendiente.
TypeScript/ESLint dirigidos terminados exit0. Pendientes repetición idéntica de snapshots/concurrencia onConflict y coherencia precio base global/cadena de steps; la prueba actual no los cubre. No afirmar checkout completo ni nuevas aplicaciones vigentes aprobadas. Campaña original permaneceINACTIVE; no precio público/stock/cobro alterado. Localbuild273 sesión37087; regresión/build posteriores pendientes. VisualBrave/F33/objetivo global abiertos; sin commit/push.

### F79 ampliación276 — replay idéntico y onConflict concurrente (2026-10-09)
Integración276 aprobada: snapshot idéntico devuelve mismo ID; dos transacciones con misma clave e importes de descuento/final distintos dan1fulfilled/1conflicto de dominio,1fila persistida. IDs en276-promotion-checkout-race.log. Repite conflictosprevios. Solo contextosQA_AUDITORIA/productoQA/campañaINACTIVE; sin ventas/pedidos/cobros/stock/precio público. Registros de aplicaciones QA e historia retenidos.
La exclusión se verificó mediante resultados y consulta de fila, no conteo explícito de auditoría en esta ampliación. Coherencia global/cadena de importes y otra vía applyPromotionsInTransaction aún pendientes. Regresión277 en curso; servidor37087 detenido para rebuild. Objetivo global/visualBrave/F33 abiertos, sin commit/push.

### Cierre de regresión 277
- `277-regression.log`: `pnpm test:all` terminó con código 0, incluyendo comprobaciones y build.
- Local reiniciado en http://localhost:3000; Next confirmó Ready. Sesión 95022.
- El usuario confirmó la pausa manual de la campaña QA. No se reactivó durante estas pruebas.
- La comprobación visual autenticada y de descarga sigue pendiente; este resultado no la sustituye.

### F80 — Coherencia de pasos de promociones
- Se revisó el consumidor real de sales-service y el registro de snapshots. El registro carecía de validación de base global, cadena y aritmética.
- Nuevo promotion-step-validation.ts: importes finitos, no negativos, centavos seguros y sin precisión extra; bases encadenadas; descuento = base - final; promociones únicas.
- recordPromotionalApplicationsInTransaction valida antes de consultas/escrituras. Error de entrada PROMOTION_STEPS_INVALID (400), separado de conflicto idempotente (409).
- Prueba promotion-step-validation.test.ts pasó (1/1); añadida a test-all. Integración existente ajustada para esperar entrada inválida en los tres pasos incoherentes.
- Pendientes: integración Neon posterior al cambio y nuevo build. Local sigue ejecutando build 277 anterior; no afirmar que F80 esté servido.
- Validación visual en Brave sigue bloqueada.

### F80 — Evidencia Neon 278 y regresión 279
- 278-promotion-chain.log: integración real Neon pasó, 1/1; campaña QA INACTIVE comprobada al inicio.
- Repetición conserva snapshot; contextos ajenos y tres secuencias incoherentes se rechazan; concurrencia con dos descuentos coherentes y distintos deja una aplicación y un conflicto.
- Fixtures sintéticos QA: qa-promotion-replay-a1f1e099-6fcf-4436-9cbb-75e0b7c5321a; snapshot promotion-application-df97cf01-723c-4e86-ae07-3a0ca027ec27. No se reactivó la campaña ni se generaron ventas/pagos.
- CUA volvió a comprobarse: solo IAB y MCP Apps, sin pestañas; Brave ausente. No hay nueva evidencia visual.
- git diff --check pasa tras limpiar el EOF del runner.
- Regresión/build 279 en ejecución, sesión 34812; servidor anterior 95022 detenido. No confundir este estado con local disponible.

Regresión 279 terminó con código 0 (tests, TypeScript, ESLint y build). Se reinicia el local con F80 incluido; Next confirma Ready en localhost:3000. La verificación visual continúa pendiente.


### F81 — Aplicación individual de promociones transaccional
- applyPromotion guardaba la aplicación y su auditoría en operaciones independientes. Se envolvió toda la operación en getDb().transaction; ambos inserts usan el mismo objeto transaccional.
- 280-promotion-transaction.log: 8/8 pruebas CP048. La prueba añadida verifica estructura de código; NO es una simulación de fallo de auditoría.
- TypeScript pasó. 281-promotion-transaction-replay.log: integración Neon pasó (1/1), incluyendo replay individual, rechazo de contexto ajeno y carrera de snapshots.
- Fixture QA retenida: qa-promotion-replay-a8507216-4dcf-4761-a8ec-a6776dcc8b6a. Campaña original comprobada INACTIVE; sin ventas/pagos ni activaciones.
- Búsqueda de consumidores: checkout/ventas usa recordPromotionalApplicationsInTransaction; no se encontró consumidor productivo de applyPromotion fuera de pruebas. El endpoint preview usa únicamente applyPromotionToUnitPrice. No se presenta este cambio como corrección visual o prueba de checkout completo.
- Pendiente: prueba de nueva aplicación individual con fallo forzado de auditoría y rollback, además de regresión/build posterior. Local mantiene build 279 (sesión 5477), aún sin F81.

### Regresión 282 y consolidación de cobertura
- pnpm test:all terminó con código 0: pruebas incluidas en el runner, TypeScript, ESLint y build.
- Local reiniciado con F81, Next confirmó Ready en localhost:3000.
- Matriz principal COBERTURA-ACTUAL.md actualizada al 9 octubre para reflejar evidencias 200–281 en Clientes, Pipeline, Operaciones, Precios, Promociones, Taxonomía y Configuración. Conserva explícitamente pendientes de navegador, roles, descargas y casos aún no ejecutados.
- Auditoría integral no completada; rollback individual con fallo de auditoría sigue sin prueba, aunque la transacción está implementada.

### F81 — Rollback individual verificado en Neon, evidencia 283
- Se añadió prueba gated QA_PROMOTION_REPLAY y protegida contra NODE_ENV=production al script de integración existente.
- Campaña temporal creada solo dentro de la transacción, sin commit ni visibilidad pública; no se activó la campaña original. La prueba intercepta únicamente el insert de auditoría para lanzar QA_FORCED_AUDIT_FAILURE, después de comprobar que la aplicación ya existe dentro de esa transacción real.
- Al finalizar el rollback, consultas independientes comprobaron cero aplicaciones y cero campañas para el identificador temporal qa-promotion-rollback-45943d66-f034-42fb-aefb-a0d80033e6b6.
- 283-promotion-rollback.log: 2/2 tests Neon pasaron (rollback y replay/carrera). TypeScript y ESLint dirigido pasaron. La inyección es un fallo controlado de la escritura de auditoría, no una caída real de PostgreSQL.
- Sin cambios adicionales de producción: build282 servido en localhost:3000, sesión12117, contiene la transacción F81 verificada.
- Este caso pendiente de F81 queda cubierto; continúan los pendientes integrales de aprobaciones/solapamientos/vencimiento, visual, roles y descargas.

### F82 — Solapamiento exclusivo por alcance
- Reproducido en 284-promotion-conflict-before.log: campaña general EXCLUSIVE aceptada ante campaña EXCLUSIVE por producto (Missing expected rejection).
- assertPromotionConflict ahora reconoce alcance general en cualquiera de los lados, coincidencia producto/producto o categoría/categoría y cruce producto/categoría con categoría real del producto.
- STACKABLE/BEST_VALUE mantienen la política existente; intervalos temporales siguen filtrándose por la consulta previa.
- 285-promotion-conflict-after.log: 3/3 pruebas, ambos sentidos de cruce, alcance general, alcance distinto y STACKABLE. Son tests de lógica con ejecutor simulado, no prueba HTTP/Neon.
- TypeScript y lint dirigido pasan; test añadido a runner. Sin mutaciones Neon en este turno.
- Pendientes: integración real de alcances, concurrencia de activaciones (no hay serialización nueva), regresión/build y visual. Local mantiene build282 sin F82, sesión12117.

### F82 — Integración de alcances reales en Neon (286)
- Nuevo promotion-conflict.integration.test.ts, gated QA_PROMOTION_CONFLICT=1 y prohibido NODE_ENV=production; agregado al runner como omitido por defecto.
- Intervalo2090 aislado comprobado antes de crear la campaña. Fixture solo dentro de una transacción real: asociaciones por producto/categoría QA, alcance general, exclusión de la propia campaña, STACKABLE y límites temporales sin solapamiento.
- 286-promotion-scope-neon.log pasó1/1. Cruces en ambos sentidos rechazados con PROMOTION_CONFLICT; campaña general rechazada ante producto y viceversa. Política acumulable y fecha inmediatamente posterior aceptadas.
- Rollback explícito; consulta exterior confirma cero campañas retenidas para qa-promotion-scope-d0b96e85-dcec-4217-8895-2fd53835604c. No se modificó campaña original ni producto/categoría del catálogo.
- TypeScript, ESLint dirigido y git diff --check pasan. No se considera probada la concurrencia de activaciones ni el uso del formulario autenticado.
- Pendientes: serialización/estado fresco en POST/PATCH/approval, regresión/build posterior a F82. Local sigue build282 sesión12117, sin F82 aún.

### F83 — Serialización de comprobaciones de activación
- assertPromotionConflict adquiere pg_advisory_xact_lock(hashtext('coldpower:promotion-activation')) antes de consultar campañas activas. POST/PATCH actuales llaman esta comprobación dentro de la misma transacción que persiste la activación; el bloqueo dura hasta commit/rollback.
- 287-promotion-lock.log: dos pruebas reales Neon pasan. El helper mantiene bloqueo; segunda conexión pg_try_advisory_xact_lock retornafalse, tras finalizar primera retornatrue. Integración de alcances también pasa y reviertefixture.
- Sin escrituras permanentes en estas pruebas. Tres tests lógicos y TypeScript pasaron; ESLint dirigido y diffcheck pasan.
- Alcance: probado bloqueo y alcance, NO dos activaciones HTTP simultáneas. PATCH aún lee snapshot y asociaciones fuera de la transacción; aprobación no comparte este bloqueo. No se consideran cubiertos conflictos con escrituras externas ni edición concurrente completa.
- Build posterior F82/F83 pendiente; local conserva build282 sesión12117. Revisión visual/roles/descargas pendiente.

### Regresión 288 — F82/F83 servidos
- pnpm test:all terminó código0 con pruebas del runner, TypeScript, ESLint y build. Integraciones gated tienen evidencia explícita en286/287; no inferir que se ejecutan por defecto.
- Local reiniciado con F82/F83; Next Ready en localhost:3000.
- Inventario CUA revisado otra vez: Brave ausente, solo IAB/MCP Apps sin pestañas. Validación visual personal pendiente.
- Revisión superficial de nombres en git status no muestra .env/secrets/credenciales/CSV/XLSX pendientes; NO constituye revisión completa de secretos o del diff.
- Pendientes de promociones: PATCH lee snapshot fuera de transacción, approval no comparte lock; dos activaciones HTTP reales sin comprobar. No declarar control de concurrencia integral.

### F84 — Estado fresco en mutaciones de promociones
- PATCH de promoción movió lectura de campaña/asociaciones y armado del input dentro de la transacción; adquiere lockPromotionMutation antes de leer y FOR UPDATE sobre campaña.
- POST y approval adquieren el mismo bloqueo global; approval también lee FOR UPDATE. Orden global→fila compatible entre mutaciones. Helper usa la misma clave PostgreSQL que F83.
- Promoción inexistente en PATCH lanza error de dominio404 para no devolver respuestaAPI como supuesto resultado de transacción.
- 289-promotion-mutation.log: 9/9 CP048; nueva prueba comprueba orden en código, NO sesiones ni solicitudes HTTP. TypeScript y ESLint dirigido pasan.
- Pendientes: integración propia del helper y edición/aprobación simultáneas, build/regresión posterior. Validación de asociaciones todavía usa conexión externa para lecturas de producto/categoría; no prometer inmunidad a cambios externos de taxonomía.
- Local mantiene build288 sesión85794, aún sin F84. Sin mutaciones de datos en este turno. Auditoría visual y descargas pendientes.

### F84 — Helper de mutaciones probado (290)
- La prueba de bloqueo usa ahora lockPromotionMutation en la primera transacción y assertPromotionConflict en la segunda tras liberación; demuestra que ambos comparten la clave PostgreSQL real.
- 290-promotion-mutation-lock.log pasó1/1, sin escrituras en tablas. Exclusión entre conexiones y liberación confirmadas.
- No equivale a prueba HTTP de edición/aprobación simultáneas; esa cobertura sigue pendiente.
- Regresión291 en curso, sesión25463. Servidor85794 detenido para build. No afirmar disponibilidad local durante esta operación.

Regresión291 terminó código0 (runner, TypeScript, ESLint y build). Local reiniciado con F84; Next Ready en localhost:3000. Persisten pruebas autenticadas simultáneas y revisión visual/descargas pendientes.


### Alcance de Pedidos revisado — evidencia292
- Se contrastaron order_items, order_status, updatePickedQuantity y changeOrderStatusInTransaction: existe pickedQuantity pero no deliveredQuantity por línea ni estado de entrega parcial.
- READY/READY_FOR_PICKUP exige picking completo y ausencia de incidentes bloqueantes. DELIVERED consume reservas completas; CANCELLED libera reservas activas y cancela pagos abiertos; con cobro confirmado exige reembolso antes de cancelar.
- La matriz decía entrega parcial como prueba pendiente. Se corrige: preparación parcial es función existente; entrega parcial es limitación funcional no implementada. No se redefine el objetivo global ni se declara Pedidos completo.
- 292-order-scope.log: pruebas de helpers de transición/picking y contrato de cancelación. No son prueba Neon de stock ni uso autenticado; estos siguen pendientes para los casos restantes.
- No se modificó código de producción, datos ni esquema en esta revisión. Local conserva build291 sesión6793.

### 9oct — Brave recuperado; CMS excluido por instrucción del usuario
- CMS fuera del trabajo desde ahora hasta orden expresa. No se abrió ni modificó en esta continuación.
- Brave Personal volvió a exponer pestaña375935591 de Pagos; acceso autenticado Superadmin confirmado por DOM. Auditoría visual puede continuar; el bloqueo de conexión previo ya no describe el estado actual.
- Vista Pagos de pedido QA F8A443 inspeccionada a viewport1920×1080 y tamaño habitual; override restablecido. Zoom100% todavía no confirmado. Tres registros: dos confirmados5+6PEN y uno cancelado; neto mostrado11, órdenesconciliadas1, pendientes0, tasa100%. No se hizo nueva mutación de pagos.
- Consola capturada: solo warningClerkdevelopment; sin errores en las entradas disponibles. No afirmar consola global limpia.
- Exportar reporte clicado desde UI: waitForEventdownload15s expiró, sin archivo obtenido. F33 permanece abierto; timeout no demuestra que el navegador bloqueara esta nueva solicitud. Pestaña interna de descargas no puede reclamarse con el controlador.
- No se certifica aún F49 (actualización tras mutación), móvil, teclado ni export real. Sigue pendiente prueba completa por módulo.

### F85 — Pagos autenticado: filtros pierden alcance de pedido
- BravePersonal Superadmin, pestaña375935591. Se usaron seis pestañas del detalle QA PAGO-29844E56: Resumen/Conciliación/Intentos/Eventos/Reembolsos/Historial. Conciliación esperado11/recibido11/reembolso0/neto11/diferencia0. Eventos y reembolsos muestran vacío explícito; historial e intentos tienen confirmación.
- Vista390×844 inspeccionada: detalle legible, pestañas se envuelven; Escape cerró modal (dialogs0). Tamaño restablecido. No se verificó foco completo ni zoom100% ni se mutaron pagos.
- F85 reproducido: al seleccionar EstadoConfirmado y MétodoTransferencia y pulsarAplicar, URL pasa de /admin/pagos?orderId=order-febb1535-046c-419d-9451-f1efc2b0c8a6 a /admin/pagos?query=&status=CONFIRMED&reconciliation=&method=TRANSFER&currency=&provider=&methodType=&customer=&order=&dateFrom=&dateTo=.
- LinkExportarReporte hereda URL filtrada sinorderId. El filtro de pedido seleccionado se pierde; una fila visible en esta prueba no demuestra que el alcance se conserve. Corrección pendiente con workflowproduct-design obligatorio.
- CMS excluido. F49 postmutación y F33 descarga siguen pendientes. No afirmar Pagos totalmente auditado.

### F85 — Corrección preparada de contexto en filtros
- Aplicado workflowproduct-design:image-to-code. Referencia: captura actual de Pagos en Brave, viewport solicitado1920×1080, filtradoConfirmado/Transferencia; no nuevos assets requeridos. Preflight sin contexto guardado.
- Decisión funcional: incluir inputs ocultos orderId/saleId/customerId/queue/pageSize al enviar el formulario, sin mantener page para reiniciar paginación.
- PaymentsControlCenter.tsx corregido. Prueba payments-filter-context.test.mjs pasa1/1; tsc/ESLint dirigido pasan. Test de estructura, no resultado de navegador posterior.
- Captura de referencia actual presenta recorte a la derecha; zoom/tamañoCSS real no comprobados. No emitir juicio de fidelidad con ese desajuste pendiente.
- Build y comparación posterior aún pendientes; local sigue build291 sesión6793, sin F85. Override de viewport restablecido. No cambio de datos/pagos ni CMS.
- final result: blocked (F85: falta build y comparación/uso posterior; auditoría global también pendiente).

### F85 — Build293 y comprobación autenticada posterior
- pnpm test:all terminó código0: runner, TypeScript, ESLint y build. Local reiniciado y listo con build293 en localhost:3000.
- En Brave Personal se abrió Pagos del pedido QA order-febb1535-046c-419d-9451-f1efc2b0c8a6; Estado Confirmado + Método Transferencia + Aplicar conservan orderId en la URL.
- El enlace Exportar reporte conserva el mismo orderId y filtros. Tabla muestra una transferencia QA confirmada de6PEN, PAGO-095F812E. Esto verifica el contexto del pedido y del enlace, no la descarga.
- Otros contextos saleId/customerId/queue/pageSize tienen guardia de código; falta replay autenticado específico. F33 descarga y F49 refresco tras mutación permanecen pendientes.
- CMS excluido por instrucción expresa. No se modificaron datos en esta comprobación. Comparación visual formal con zoom100% sigue pendiente; auditoría global incompleta.

### F86 — Corrección implementada; regresión294 en curso
- Workflow product-design:image-to-code leído con referencias; preflight sin contexto guardado. Captura de referencia actual Brave del estado vacío emitida en conversación y conservada en binding f86Reference. No nuevos assets para este cambio.
- Propuesta: conservar composición/tokens existentes del formulario y mostrar la selección aplicada aunque no haya facetas. Sin reconstruir la interfaz ni inventar opciones comerciales.
- Select de PaymentsControlCenter usa filterOptionsWithSelection: unión deduplicada de facetas y selección activa. Key name:selected sincroniza defaultValue con el cambio de URL.
- Dos tests del helper pasan (resultado vacío, selección existente/ausente/vacía, orden e inmutabilidad). Incluidos en runner. No mutaciones Neon ni CMS.
- Regresión294 sesión98927 sigue ejecutándose: runner completó, TypeScript pasó, ESLint en curso en última observación. Servidor78878 detenido para build; no afirmar disponibilidad local.
- Pendiente completar build, reiniciar y repetir estado vacío en Brave; comparación visual formal y zoom100% no verificados. F33/F49 siguen abiertos.
- final result: blocked

### F86 — Regresión294 y comprobación en Brave
- Regresión294 terminó código0 (runner, TypeScript, ESLint, build). Local listo con build294, servidor sesión2571.
- Brave autenticado: recarga deliberada del estado QA-INEXISTENTE-20261009. Estado presenta opción Confirmado seleccionada/valueCONFIRMED; Método Transferencia/valueTRANSFER. Segundo Aplicar mantiene query/status/method y orderId en URL.
- Comparación conjunta en herramienta de referencia f86Reference e implementación f86Implementation: mismos tokens, tarjetas, navegación, tipografía y contenido vacío. Cambio esperado: selects ahora muestran Confirmado/Transferencia, búsqueda se ajusta al mayor ancho de etiquetas. Sin assets nuevos.
- Capturas tienen altura distinta (referencia790 e implementación734); ancho1521. No constituye comparación formal1920×1080/zoom100%; QA global sigueblocked. No afirmar F33 ni F49 resueltos.
- Búsqueda de código identifica otros selects derivados de facetas en Pedidos/Clientes/Ventas. Son candidatos a probar, no defectos confirmados todavía.
- CMS excluido; sin mutaciones de datos.

### F87 — Corrección preparada de filtros de Pedidos
- Workflow image-to-code aplicado a referencia actual Brave f87Reference (captura emitida en conversación), búsqueda vacía con statusDELIVERED. Decisión: mantener disposición, tipografía, tokens y AdminSelect; completar facetas con selección vigente. Sin nuevos assets.
- OrdersControlCenter Select usa helper filterOptionsWithSelection. Mantiene valor aplicado aunque no haya facetas. Etiquetas usan mapa existente; no se inventa nombre de local si el mapa no lo contiene.
- Pruebas helper2/2 con DELIVERED añadido y ESLint dirigido pasan. No son comprobación posterior de UI.
- Build295 en curso sesión55568; servidor2571 detenido. Próximo paso: observar build, levantar local y replay de vacío/segundoAplicar en Brave. No afirmar disponibilidad ni F87 cerrado todavía.
- CMS excluido; sin mutaciones de datos. Validación visual formal1920×1080/zoom100% pendiente. final result: blocked

### F87 — Build295 y replay autenticado
- Build295 terminó código0. Local listo con Next16.2.9, sesión89446.
- Brave Personal: recarga deliberada de búsqueda QA-INEXISTENTE-20261009 con statusDELIVERED. Control Estado muestra Entregado; listbox contiene Estado y Entregado. Se seleccionó Entregado y pulsó Aplicar nuevamente: URL conserva statusDELIVERED y búsqueda, control sigueEntregado.
- Consola error consultada limit5 devuelve[]; no constituye garantía global de ausencia de errores. Sin mutaciones de pedidos/datos ni CMS.
- F87 corregido y verificado para estadoEntregado/resultado vacío/segundoenvío. Otros filtros, móvil y validación formal1920zoom100 siguen pendientes; auditoría global incompleta.
- Revisión source AdminSelect muestra estado local inicializado desde value sin sincronización posterior y navegación de opciones por botones sin manejo de flechas. Son candidatos de pruebas específicas, no cerrar accesibilidad ni sincronización completa con este replay.

### F88 — Navegación de teclado en AdminSelect
- Brave build295, selectorEstado de Pedidos: ArrowDown cerrado no abre (aria-expandedfalse/listboxes0); Enterabre pero foco permanece en disparador; ArrowDown abierto tampoco mueve foco. Escape cierra. Defecto confirmado en selector compartido.
- Workflow image-to-code aplicado a captura f88Reference actual del selector abierto. Propuesta conserva composición/tokens/icons existentes y añade manejo de foco/teclado, sin nuevos assets.
- AdminSelect implementa apertura por flechas/Home/End, foco inicial en selección, recorrido de opciones con flechas/Home/End, retorno a disparador al seleccionar/Escape; Tab cierra y deja navegación nativa desde disparador.
- ESLint dirigido y diffcheck pasan; falta prueba de teclado posterior real y regresión. Estado local/value no sincronizado aún sigue candidato separado.
- Regresión296 sesión78214 en curso; servidor89446 detenido. No declarar local disponible ni accesibilidad completa. CMS excluido; sin mutaciones de datos.
- final result: blocked

### F88 — Regresión296 y teclado comprobado en Brave
- Regresión296 terminó código0: runner/TypeScript/ESLint/build. Local listo con build296 sesión86221.
- Brave autenticado, EstadoPedidos del vacíoDELIVERED: ArrowDown abre aria-expandedtrue y foco roleoptionEntregado. ArrowUp mueve aEstado; End→Entregado; Home→Estado; Escape cierra y foco vuelve al disparadorEntregado.
- Enter abre y Enter enEntregado selecciona/cierra. ArrowDownabre; Tab desdeopción cierra y foco queda en disparadorEntrega siguiente. Casos reales de teclado pasan, sin submit ni mutaciones de datos.
- Alcance: probado selectorEstado de Pedidos con dos opciones; otros usos/móvil/listas largas/typeahead todavía pendientes. No declarar accesibilidad integral del sistema ni QAvisual formal1920zoom100.
- CMS excluido. Auditoría global continúa; F33/F49 siguen abiertos.

### F89 — Ventas: selección activa desaparece en vacío
- Brave Personal build296, EstadoConfirmada + búsquedaQA-INEXISTENTE-20261009 + Aplicar. URL/export mantienen statusCONFIRMED; disparadorEstado pierde etiquetaConfirmada y listbox soloEstado. Confirmado en uso.
- Cuatro gráficos muestran vacíos explícitos y métricas monetariasN/D; tabla No hay ventas con estos filtros,0a0. Sin mutaciones de ventas.
- Workflowimage-to-code aplicado a captura f89Reference del vacío. Propuesta conserva composición/tokens, añade selección activa a opciones mediante helper existente. SalesControlCenter FilterSelect corregido.
- ESLint dirigido y dos testshelper pasan. Build/replay posterior pendientes. Local conserva build296 sesión86221; F89 aún no servido. Se mantiene servidor para continuar auditando Clientes antes de reconstruir cambios juntos.
- TecladoArrowDown abrió listaEstado de Ventas en build296; no equivale a todo el módulo accesible. CMS excluido. final result: blocked

### F90 — Clientes pierde opción aplicada en vacío
- Brave build296, EstadoACTIVE y búsquedaQA-INEXISTENTE-20261009 enviada conEnter. URL/export mantienen statusACTIVE; selectEstado solo tiene opciónEstado seleccionada. Defecto confirmado.
- Captura f90Reference: vacío claro con Limpiarfiltros, tarjetas0; panelDistribuciónportipo dice Sinubicaciónregistrada (copy candidato incorrecto, pendiente revisión). No mutaciones de clientes.
- Workflowimage-to-code: referencia actual; propuesta mantiene layout/tokens y añade selección activa a facetas. SelectFilter CustomersControlCenter usa helper y keyname:active para sincronizar defaultValue conURL.
- ESLint dirigido y testshelper2/2 pasan. F89Ventas/F90Clientes pendientes de replay con build nuevo.
- Regresión297 en curso; servidor86221 detenido. CMS excluido. QAvisual formal y auditoría global pendientes. final result: blocked

### F89/F90 — Regresión297 y replay autenticado
- Regresión297 terminó código0 (runner, TypeScript, ESLint, build). Local listo build297 sesión45578.
- BravePersonalClientes: recarga del vacíoQA-INEXISTENTE-20261009 mantiene EstadoACTIVE/valueACTIVE. Enter en búsqueda conserva query/statusACTIVE enURL.
- BravePersonalVentas: ruta previamente reproducida de vacíostatusCONFIRMED; controlEstado muestraConfirmada. Aplicar mantiene query/statusCONFIRMED enURL.
- F89/F90 corregidos y verificados para estos casos; no implica todas facetas/roles/responsive completos. EtiquetaACTIVE enClientes sigue sin traducción (calidadcopy a revisar). F91texto gráfico sigue pendiente.
- Sin mutaciones de datos ni CMS. Auditoría global/descargas/validaciónvisual formal pendientes.

### F91 — Copy de gráficos y estados de Clientes corregido
- Workflowimage-to-code aplicado a referenciaf90Reference previamente capturada/inspeccionada. Cambio limitado a contenido: Distribuciónportipo vacío Sinclientes enestealcance; geográfica Sinubicaciones enestealcance. No se interpreta ausencia de resultados como ausencia de ubicación operativa.
- SelectEstado utiliza mapa statusLabels existente (Activo/Inactivo/Prospecto); valores enviados al backend conservan enums. Sin cambios de layout/tokens/assets ni datos/CMS.
- ESLint dirigido/diffcheck pasan. Build298 en curso; servidor45578 detenido. Replayvisual/copy posterior pendiente, no declarar F91cerrado aún.
- final result: blocked

### F91 — Build298 y copy comprobado
- Build298 terminó código0, local listo sesión21437. BravePersonal rutaClientes vacíoQA-INEXISTENTE/statusACTIVE.
- SelectEstado muestra Activo/valueACTIVE. DOM confirma una instancia Sinclientes enestealcance y una Sinubicaciones enestealcance; corresponden a gráficos tipo/geografía.
- F91copy corregido y comprobado en estado vacío. No garantiza distribución condatos/roles/móvil ni comparaciónformal1920zoom100. CMS excluido; sin mutaciones de datos.
- Matriz global revisada; persisten acciones funcionales/visuales por módulo, F33descargas/F49refrescoycron. No reducir objetivo a correcciones de filtros/copy.

### F92/F93 — Notificaciones: copy y espacio de filtros
- Workflowimage-to-code aplicado a capturaf92Reference de detalle QA enBravePersonal1521px. CopysScheduledreport/In-App confirmados visibles.
- notification-display añade SCHEDULED_REPORT→Reporteprogramado; AdminNotificationDetail canal→Interno. Sin modificarvalores/eventos/canales ni datos. ESLint y m10-06-final4/4 pasan; esos tests preexistentes no prueban nuevo label específicamente.
- Cambio aúnnoservido: localbuild298 sesión21437. Falta build/replay.
- F93: screenshotf92Reference muestra Filtrar parcialmente tapado por paneldetalle adyacente. Hallazgoresponsive moderado, verificar medidasCSS y corregir disposición antes de QA. No afirmar pantallavisualcompleta.
- CMSexcluido, sinmutaciones. final result: blocked

### F93 — Filtros de Notificaciones ajustados
- Brave mediciónDOM botónFiltrar: derecha774.84px; filaformulario derecha728.03px. Desbordamiento46.81px coincideconcapturaf92Reference.
- Workflowimage-to-code aplicado a referencia existente: conservar controles/tokens, permitirenvolturayencogimientoselects. NotificationsList fila flex-wrap; selects min-w-0/flex-1/basis-40. No assetsnuevos/datos/CMS.
- ESLint dirigido pasa. Build299 sesión41045 encurso, incluyeF92copy/F93. Servidor21437 detenido. Pendiente replaygeometría/filtrar/móvil/copy y comparaciónvisual formal.
- final result: blocked

### F92/F93 — Build299 y verificación posterior
- Build299 terminócódigo0; local listo sesión71192. BravePersonal pestaña649 recargada.
- Filtrar derecha728.02501297/fila728.02500916: diferencia0.000004px (redondeo), elimina desbordamiento46.81px previo. A390×844 botón346.40001297/fila346.40000725, dentrocontolerancia1px. Override reset.
- DOMdetalle confirma Interno1/Reporteprogramado2 (detalleyopciónfiltro). F92copy yF93geometría corregidos en casos medidos.
- Screenshotmóvil presenta recortelateral de encabezados/tarjetas y sidebar; faltacomprobar viewportCSS/scroll/zoom antesdeatribuircausa. No aprobarresponsiveglobal ni QAformal1920zoom100. Sinmutaciones/CMS.

### Notificaciones móvil — recorte investigado
- Brave override390×844: innerWidth390/clientWidth375/scrollWidth375/scrollX0; mainx0/right375.2. No overflow horizontaldocumento enmedición.
- DOMexpone Cerrar menu administrativo; menú estabaabierto al cambiarviewport. Cierre mediantecontrolvisible. Título x69.5/right359.2 y Filtrar x292.76/right346.4 dentroclient375. No cambio de código/datos.
- Screenshot inmediato tras cierre salió escalado/inadecuado paraQA (vista pequeñaenlienzo); no aprobarfidelidadmóvil conesa captura. Diferenciar overlayabierto de desbordamiento y repetir capturaestable antesdejuiciofinal.
- Override reset. Localbuild299 sesión71192; CMSexcluido; auditoríaglobalpendiente.

### F94 — Validación de filtros de Notificaciones
Referencia: Brave con rango invertido confundido con fallo de base. Corrección puntual conserva layout y muestra aviso accionable en bandeja; métricas independientes permanecen. Reproducción autenticada y recuperación al corregir Hasta aprobadas, consola sin errores. Build/TypeScript/ESLint aprobados. Captura1521px; comparación formal1920x1080/zoom100 pendiente. Resultado global: bloqueado para cierre visual completo, CMS excluido.

### F95 — Historial de Reportes
Referencia propia Brave tabla Reportes programados. Cambio solo de texto:traducción estados y singular/plural. Sin assets nuevos ni cambios de layout. ESLint aprobado; compilación y comparación visual posterior pendientes. Final result: blocked para cierre completo hasta comparación formal.

### F95 — Revisión posterior en Brave
Screenshottabla aplicada:Completada/Omitida y singular natural; misma estructura/colores/tipografía y sin error de consola. Compilación exit0. Comparación a1521px observada; viewportformal1920 y móvil pendientes. Resultado global permanece blocked para cierre completo.

### F96 — Alcance de tarjetas de ventas en Reportes
Referencia screenshotBrave superior con hoy0/mes2534 mostrandoigualdelta93.7% y tendencia30d. Solución:ventasdelperíodo usa rango; hoy conservaalcancediario y notaexplícita sincomparación ajena. ESLint aprobado; compilación y screenshotposterior pendientes. Final result: blocked para cierre global.

### F96 — Comprobación posterior
Braveautenticado:tarjeta30d9248 y mesactual2534, hoy0connotaLima. Captura1521px layoutpreservado, consola vacía y filtro realusado. Comparaciónformal1920/móvil pendiente. Resultado global blocked para cierrecompleto.

### F97 — Minigráfica de utilidad bruta
ReferenciaBrave tarjetaMargenN-D conseriecontinua. Se conservan dimensiones y estilo; ahora unidadmoneda coherenteconimporte y huecosdesconocidos. ESLint aprobado trasrepararcallbackinmutable; buildyQAposterior pendientes. Final result: blocked para cierrecompleto.

### F97 posterior y F98 alcancepedidos
Brave margenN-D sinserie suficiente, no cerosficticios, sinerroresconsola. F98 referenciatarjeta96Enelrango conseriepedidosventas:notaestadactual y retirada serieajena. ESLintaprobado, build/QAposteriorF98pendientes. Finalresult blocked para cierrecompleto.

### F98 — Comprobación en Brave
TarjetaPedidosactivos96 connotaEstadoactual sinfiltrofecha y sinserie ajena. Capturaposteriorrevisada sin desbordamientovisible y consola vacía. Buildaprobado. Formal1920/móvil y auditoríaglobalpendientes; finalresult blocked para cierrecompleto.

### Reportes — viewport principal y móvil observados
Captura autenticada1920x1080 CSS, visualViewport.scale1 y dpr≈1:tarjetas/gráficas alineadas sinoverflowdocumento. Mobile390x844:menúcerrado y filtrosabiertos, camposdentroancho; screenshotválida. Overridesreseteados. No zoomtoolbarverificado ni estadosinferiorescompletos. QA deestosalcancesobservados aprobada; finalresult global blocked por requisitosrestantes.

### F99 — Mensaje de rechazo en Configuración
Referencia Brave Branding[object Object] alcolorinválido. Cambiosolodeerrorlector, preservacomponente/estilo/dirty. ValorQA descartado; ESLintaprobado. Rebuildycomparaciónposteriorpendientes; finalresult blocked global.

## F100 — Historial de Configuración: carga y errores
- Referencia Brave autenticado: composición existente en dos columnas; entrada del historial muestra falso vacío antes de cargar versiones2/3. Sin cambios al CMS.
- Propuesta: conservar tarjetas, tipografía y columnas; anunciar Cargando historial con role=status, impedir actualización duplicada y ocultar vacío/instrucción de selección hasta respuesta válida. Errores de carga/restauración usan apiErrorMessage.
- ESLint aprobado; prueba de render real de React y dos pruebas helper aprobadas. Build73656 pendiente. Captura posterior y responsive pendientes; resultado global continúa blocked/incomplete.


### F100 comprobación posterior
- Build73656 exit0, servidor80580 Ready197ms. Brave recarga/Historial muestra Cargando historial sin falso vacío; termina en versiones2/3. Actualizar muestra carga conservando esas versiones. Captura posterior conserva dos columnas/alineación; consola10errores vacía.
- Verificación funcional de carga aprobada. Captura actual1536px, comparación formal1920/móvil/error/restauración no acreditada; resultado global incomplete. CMS excluido.


## F101 — Configuración teclado y revisión responsive
- Brave Historial1920x1080: client/scroll1920, scale1, composición2columnas sin desbordar; zoombarra noinspeccionado. Móvil390x844 client/scroll375; versiones apiladas y tabla con scroll local. Capturas observadas; viewport reseteado.
- Defecto confirmado ArrowLeft en tabHistorial no cambia foco ni selección. Ahora pestañas tienen rovingtabindex y ArrowLeft/Right/Home/End seleccionan y enfocan destino. Composición preservada, CMS excluido.
- ESLintexit0. Build57051 pendiente, prueba navegador posterior pendiente. Resultado global incomplete.


### F101 replay
- Build57051 exit0 y servidor96557 Ready193ms. Brave EmpresaArrowRight selecciona/enfocaLocales, un solo tabstop; Home vuelveEmpresa; End selecciona/enfocaHistorial. Consola10erroresvacía. Sin entradaCMS. Prueba teclado usada aprobada; todoConfig/erroresguardado/restauración siguenpendientes.


## F103 — Compras filtros vacíos
- Referencia screenshotBrave tabla0resultados y proveedorQA retenido, estadovisibleTodoslosestados aunqueURLDRAFT. Propuesta puntual conserva composición y muestraBorrador aplicado; monedatambiénretiene selección si facetas vacías.
- HelperfilterOptionsWithSelection aplicado.4pruebasexit0/lintaprobado; build73427 y comparaciónposteriorpendientes. No CMS. Resultadoglobalincomplete.


### F103 posterior
- Brave nueva compilación conserva Borrador/DRAFT en0órdenes y alvolverFiltrar. Consola10erroresvacía; build73427exit0. Verificaciónfuncionalestadoaprobada; moneda y comparaciónformalposteriorpendientes. Globalincomplete.


## F104 — Recepción actualiza detalle y abre recibo
- ReferenciaformularioBraveexistente, composicióndeformularioigual. Clienteabre reciboguardadoconcargadocumento preservandofiltros; invalidaciónservercomplementaria.
- Build42460exit0/lintaprobado, 8pruebasexit0. BraveQA217D4B dosentregas1unidad: primeraParcial2/1 y recibo8F7023; segundaRecibida2/2 y recibo525A31, sinrecargamanual. Selectorúltimoexcluyeordencompleta. Consola10erroresvacía.
- F104 funcionalaprobado; comparaciónformal1920/móvilrecibos y globalmódulospendientes. CMSexcluido; finalresultglobalincomplete.


## Inventario — revisión de datos y responsive parcial
- Brave filtradoQA Cusco fís7/res1/disp6, Kardex4entradas ycadena3→7 confirmada. Filtros concluyen1fila; noerrorconfirmadoenAplicartrastransición.
- Captura1920superior/tabla y390superior observadas; nooverflowglobal. Móviltabla/drawer y zoombarra100pendientes. No códigoeditadoenestaprueba. Globalincomplete, CMSexcluido.


## 2026-10-09 — F105: teclado en detalle de Inventario
- Implementada navegación ArrowRight/ArrowLeft con vuelta, Home/End y tabIndex roving en InventoryDetailDrawer.
- ESLint del componente y build de producción: exit 0. Servidor reiniciado con esta compilación.
- Brave autenticado: 1920×1080, Resumen → ArrowRight → Kardex seleccionado y enfocado; End → Configuración con única parada tabIndex 0. En 390×844, Home y ArrowLeft comprobados, Configuración seleccionada; consola sin errores.
- La barra móvil conserva desplazamiento horizontal; la captura muestra el último rótulo parcialmente visible. Revisar visibilidad completa del foco antes de aprobar toda la adaptación móvil.
- CMS excluido. Auditoría general continúa incompleta.

## 2026-10-09 — F105: visibilidad móvil del foco
- Recorte reproducido en Brave 390×844: Configuración enfocada con extremo derecho 396.67 px frente a 375 px de zona visible.
- Se añadió scrollIntoView nearest al foco de cada pestaña del detalle. Nueva compilación y ESLint exit 0; servidor listo.
- Uso real de End: scroll horizontal pasa de 12 a 33.6 px; rótulo Configuración completo en captura. Home devuelve foco a Resumen. Consola sin errores. Viewport restaurado.
- F105 corregido en el alcance probado. Sigue pendiente la auditoría general y revisar teclado de las pestañas de Operaciones de inventario, cuyo código no presenta roving ni manejador de flechas.
- CMS excluido. Final result global: incomplete.

## 2026-10-09 — F106: pestañas operativas de Inventario
- Brave reprodujo ArrowRight sin cambio en Movimientos y cinco paradas de Tab.
- Corregido roving, flechas con vuelta, Home/End y scroll nearest al foco; cambios de panel preservan limpieza de confirmación y mensajes del clic.
- Uso real: Transferencias muestra 1 traslado QA recibido; Reservas 33 con página 1/4; Mínimos muestra QA disponible 6/mínimo 2; Importaciones vacío sin lotes.
- Compilación/ESLint exit 0; 3 pruebas de contrato de Inventario aprobadas (no sustituyen prueba de teclado). Nueva compilación validada en Brave: ArrowRight abre Transferencias, End Importaciones, única parada Tab. Móvil 390×844 Home/ArrowLeft y Home/End; último tab dentro de barra y rótulo visible, menú móvil cerrado para captura. Consola sin errores.
- Auditoría global incompleta; CMS excluido. Servidor local activo.

## 2026-10-09 — F107: falso vacío de reservas en detalle (P2, pendiente)
- Filtro Consumida: URL reservationStatus=CONSUMED/reservationPage=1, 7 registros consumidos. Filtro Activa: 25 registros/3 páginas. Siguiente conserva ACTIVE, query QA y locationId, cambia reservationPage=2 y muestra página 2/3.
- Reproducción real: con ACTIVE/página 2 abrir QA-AUD-20261006 en Cusco y pestaña Reservas. Dice «No hay reservas recientes para este producto y local», mientras saldo reservado=1 y reserva activa del pedido order-febb1535-046c-419d-9451-f1efc2b0c8a6 fue comprobada en página 1.
- Causa verificada: InventoryDetailDrawer filtra data.operations.reservations, que solo contiene la página global actual. Necesita consulta propia por producto/local independiente del filtro/página global; no basta cambiar texto ni quitar paginación global.
- Movimientos y transferencias del detalle también dependen del listado global; revisar en la misma corrección.
- Consola sin errores. Sin mutaciones. CMS excluido; auditoría global incompleta.

## 2026-10-09 — F107 implementación en curso
Consulta dedicada GET /api/admin/inventario/reservas con inventory.view, producto/local obligatorios, orden estable y paginación de 10. Drawer carga datos independientes de estado/página global, muestra loading/error y páginas propias; remount por producto/local evita datos cruzados. ESLint dirigido exit 0 tras corregir estado de carga en acciones de paginado. Primera compilación exit 0, pero hubo dos ajustes posteriores durante su ejecución: nueva compilación lanzada para validar versión final. Falta prueba real Brave del caso ACTIVE/página global 2 y tests del endpoint. Movimientos/transferencias aún pendientes. CMS excluido, auditoría global incompleta.

## 2026-10-09 — F107 reservas verificadas
- Compilación final 66173 y ESLint dirigido exit 0; servidor reiniciado con esta versión.
- Brave reproduce URL reservationStatus=ACTIVE&reservationPage=2. Abrir detalle QA Cusco y Reservas muestra primero Cargando reservas; luego Activa 1u pedido order-febb1535 y Consumida 1u pedido order-0b82040b, independiente del filtro global.
- Captura móvil 390×844 muestra ambas tarjetas/referencias completas; drawer width=scrollWidth=375, sin desbordamiento general. Consola sin errores; viewport restaurado.
- Corregida la contradicción de reservas en el caso reproducido. Pendiente validar páginas propias con más de 10 reservas, errores/autorización del endpoint y consulta independiente de movimientos/transferencias. No declarar F107 completo en todo su alcance aún.
- Sin mutaciones. CMS excluido. Auditoría global incompleta.

## 2026-10-09 — F107 filtros y autorización
- Extraído parser real usado por GET reservas: trim producto/local obligatorios; página decimal positiva y safe integer; ignora estado/página global.
- Tres tests del parser exit 0, incorporados a test-all.mjs. ESLint dirigido y build final exit 0; servidor reiniciado listo.
- HTTP sin sesión a GET reservas retorna 403 INVENTORY_FORBIDDEN. No prueba roles autenticados.
- Intento lectura directa del endpoint inválido con sesión Brave bloqueado por navegador (ERR_BLOCKED_BY_CLIENT). No eludir bloqueo; 400 autenticado sigue pendiente, tests parser no sustituyen prueba HTTP.
- Pendientes paginación >10, error visual/rol y movimientos/transferencias independientes. CMS excluido; auditoría global incompleta.

## 2026-10-09 — F107 transferencias implementación
Brave con transferStatus=CANCELLED demuestra falso vacío de detalle QA pese a traslado recibido comprobado. Consulta dedicada por transferItems.productId y local origen/destino, unidades del producto (no total de todos los productos), orden estable y paginación10. Endpoint inventory.view + parser validado. Drawer independiente con carga/error y paginación. ESLint exit0. Tests filtros/summary:4pass1skip (integración persistida no ejecutada). Build en curso58115; validación Brave pendiente. CMS excluido/global incompleto.

## 2026-10-09 — F107 transferencias verificadas parcialmente
Build58115exit0 y servidor reiniciado. Brave con filtro global CANCELLED: detalle QA Cusco muestra carga y luego traslado transfer-ab6e8487 recibido, CP-CHI-DEV→CP-CUS-DEV,1unidad. Consola vacía. Falso vacío reproducido corregido. Pendientes paginación>10, aislamiento con otros productos/locales, responsive y movimientos independientes. CMS excluido; global incompleto.

## 2026-10-09 — F107 transferencias móvil y separación
- Brave 390×844, detalle QA Cusco: tarjeta Recibida, código largo en dos líneas, ruta CP-CHI-DEV→CP-CUS-DEV1unidad. Drawer clientWidth=scrollWidth375, sin desbordamiento global. Viewport restaurado.
- Mediante filtros reales cambiar a CP-REF-BIM-0432/Almacén Lima y abrir detalle Transferencias: carga y luego vacío, sin conservar traslado QA de otro producto/local. Consola sin errores. Sin mutaciones.
- Consulta actual verificada en archivo: productId en transferItems + local origen/destino, unidades de ese producto; orden/paginación10.
- Evidencia valida esos dos casos, no prueba todas combinaciones ni paginación>10. Pendientes movimientos independientes del detalle y resto de módulos/exports/regresión final. CMS excluido; auditoría global incompleta.

## 2026-10-09 — F107 actividad del detalle en curso
Brave CP-REF-BIM-0432/Lima: resumen sin actividad pese a último movimiento12set; Kardex confirma2movimientos (recepción+3 y saldo inicial+8). Causa: detalle filtraba los8movimientos globales. Consulta dedicada inventory.view por producto/local limitada a3, orden estable; resumen muestra carga/error y vacío solo tras éxito. ESLint dirigido exit0; build61473en curso. Pendiente repetir resumen en Brave nueva versión y contrastar fechas/unidades. Sin mutaciones/CMS excluido/global incompleto.

## 2026-10-09 — F107 actividad comprobada
- Build61473exit0; servidor reiniciado con versión nueva. Tres tests de filtros y tres contratos Inventario aprobados; son evidencia de sus alcances, no sustituyen lectura persistida.
- Brave CP-REF-BIM-0432/Lima: resumen carga y luego recepción+3 12set2026 7:05am y saldo inicial+8 15ago2026 7:20pm. Coinciden con Kardex observado (2movimientos). El falso vacío queda corregido para este caso.
- Móvil390×844: saldos8/1/7/mínimo10, estadoCrítico y ambas líneas completas; drawer width=scrollWidth375. Consola sin errores. Viewport restaurado, sin mutaciones.
- Pendientes pruebas del endpoint error/roles, más fixtures/paginación reservas y traslados, demás módulos/exports/regresión y revisión final. CMS excluido; auditoría global incompleta.

## 2026-10-09 — inbox de reporte comprobado / F108 pendiente
- Brave Notificaciones: aviso notification-65563942-8514-4c83-bdf1-bf1425b9316a «Reporte listo: QA AUDITORÍA — Ejecución y entrega interna» visible en bandeja y detalle, monto S/22, canal Interno, destinatario propio, estado No leído. Origen apunta Reportes con range=month/currency=PEN/customerIdQA. No se marcó leído ni se enviaron mensajes.
- Cierra la pendiente lectura visual de ese aviso QA; no acredita cron automático ni todos los reportes.
- F108: detalle indica Generada por aviso programado y Sin registro de auditoría asociado. Código getNotificationDetail usa scheduleId→notifications.schedule_sent para cualquier tipo, aunque reporting-service registra reports.schedule_run_* sobre report_schedule. Debe distinguir SCHEDULED_REPORT y enlazar auditoría de reportes, pendiente corrección y replay.
- Consola sin errores. Repo204entradas pendientes; commit/push y regresión final siguen pendientes. CMS excluido/global incompleto.

## 2026-10-09 — F108 corregido, replay parcial
getNotificationDetail distingue SCHEDULED_REPORT; recupera run por scheduleId+scheduledFor y auditoría reports.schedule_run_succeeded de report_schedule con metadata.runId igual. Evita asociar última ejecución ajena. Etiqueta reporte programado. ESLint/build1894exit0,5contratosnotificacionesaprobados (no cubren enlace nuevo). Brave registro65563942 trasreload: Generada por reporte programado y fecha08oct07:44, desaparece Sin registro de auditoría asociado; conserva estadoNo leído. Pendientes test específico de múltiples ejecuciones y responsive. Sin mutaciones/CMSexcluido/globalincompleto.

## 2026-10-09 — F108 responsive y foco
Brave390×844: detalle reporteQA título/mensaje/botónlectura ajustados, ID largo en2líneas, origen visible. Tab desde botónMarcarcomo leída llegaVerorigen confocovisible. documentclientWidth=scrollWidth375, consola vacía. Sin marcar leído ni mutaciones. Viewportrestaurado.
Intento pressTab enheading nofocusable falló controlador; no defecto producto. Se utilizó botón semántico.
Tests existentes de notification-rules/reportworker revisados: no prueban getNotificationDetail con dos ejecuciones; caso específico siguependiente, no declarar aprobada esa cobertura. CMSexcluido/globalincompleto.

## 2026-10-09 — F108 prueba persistida múltiples ejecuciones
- Nuevo scripts/notification-report-origin.integration.test.ts, opt-in QA_REPORT_ORIGIN=1, guardia no producción y referencia QA existente.
- Ejecución real Neon con env local:1testpass0skip,2470ms. Fixture exclusivamenteQA: programaciónCANCELLED,2runsSUCCEEDED sintéticos,2auditorías con runIddistinto y fechas01/02oct12:01Z,2avisosREAD. getNotificationDetail devuelve report/actioncorrecta/fecha correspondiente para cada aviso, no última ejecución ajena; restrictToRecipientId ajeno devuelve null.
- No ejecuta worker, no correos/pasarela ni nuevos accesos. Fixture cancelada y leída conservada como evidencia; no se alteraron datos operativos existentes ni preferencias.
- ESLint del testexit0, integrado test-all opt-in. Prueba de recuperación/replay cron distinta; no la acredita. CMSexcluido/globalincompleto.

## 2026-10-09 — Inicio: personalización y accesos, revisión parcial
- Brave autenticado: cambio de orden guardado (Módulos frecuentes antes de Pendientes), persistido al recargar. Se restauró exactamente Pendientes → Módulos frecuentes → Accesos rápidos y se verificó tras recarga. No se usó Restablecer ni se cambiaron otras preferencias.
- Captura y encabezados confirman el orden visual restaurado. No era defecto de orden: snapshot anterior se tomó antes de finalizar el refresco.
- F109 pendiente: acceso rápido «Nuevo cliente» navega a /admin/clientes y muestra listado; no abre formulario de creación. Se usó realmente el enlace; page.tsx no pasa intención de crear al componente. Revisar también demás accesos antes de corregir coherentemente.
- F110 pendiente: Actividad del equipo de Inicio muestra «receipt posted», «purchase created», «Purchase» y «Report»; traducciones incompletas visibles en Brave.
- F111 pendiente: filtro Tipo de cliente tiene dos opciones «Empresa» para COMPANY y EMPRESA; CustomersControlCenter.tsx confirma labels iguales aunque formulario distingue Empresa corporativa. Debe distinguirse sin migrar datos.
- «Ver guía completa» apunta a Operaciones; pendiente uso y revisión de intención, no se declara defecto funcional todavía.
- CMS excluido. Auditoría global incompleta; responsive/errores de Inicio, descargas, regresión y commit/push pendientes.

## 2026-10-09 — F110/F111 corrección de etiquetas, replay pendiente
- CustomersControlCenter distingue COMPANY «Empresa corporativa» de EMPRESA «Empresa», consistente con formulario. No altera tipos ni registros.
- audit-contract añade etiquetas purchase/report y acciones purchases.purchase_created/purchase_issued/purchase_cancelled/receipt_posted. La misma presentación compartida cubre Inicio y Auditoría; no se modificó CMS.
- Diseño: conservar composición existente; distinguir significado por texto, mantener tamaños/controles y navegación. Referencia interfaz real Brave del turno anterior; sin nuevos assets.
- ESLint ambos archivos aprobado; 4 assertions directas contra funciones reales comprueban creación/recepción/entidades. audit-contract.test.mjs1pass solo contrato append-only, no prueba traducciones.
- Build19119 en curso, compilado8.6s; no declarar TS/build ni replay visual aprobados hasta resultados. F109 acceso Nuevo cliente y demás accesos siguen pendientes. Global incompleto.

Build19119 terminado exit0 con TypeScript aprobado. Servidor58629 Ready195ms. Replay Brave: filtro muestra Empresa corporativa/Empresa distinguibles; Inicio muestra registró una recepción de compra/creó una orden de compra/Orden de compra con datos existentes. Consola vacía. Responsive y captura final de este cambio pendientes; global incompleto.

## 2026-10-09 — F109 Nuevo cliente: implementación, verificación en curso
- Inicio enlaza /admin/clientes?new=1. CustomersControlCenter inicia drawer create solamente canManage y sin customerId; page key diferencia intención para no reutilizar estado de lista cerrada.
- Cancelar/cerrar limpia intención new mediante replace conservando filtros. Abrir detalle tras crear elimina new; no se crean datos al navegar.
- Composición y formulario existentes se conservan; acceso directo reduce un clic y mantiene validaciones/duplicados/permisos. CMS excluido.
- ESLint aprobado. Build15253 compilado8.9s, TS en curso. Replay real y responsive pendientes; no declarar F109 cerrado todavía.

F109 replay 2026-10-09: build15253 exit0/TS aprobado; servidor57900 Ready186ms. Brave desde Inicio mediante enlace Nuevo cliente: URL?new=1, dialog Nuevo cliente visible, pasos Identidad/Contacto/Relación, inputs vacíos y Siguiente deshabilitado. Cancelar cierra dialog y después de navegación URL/admin/clientes sin new. No se creó registro. Consola vacía. Pendientes replay teclado/mobile/filtros y demás accesos; global incompleto/CMS excluido.

## 2026-10-09 — F109 móvil y ampliación de accesos
- Brave390×844: Nuevo cliente abre drawer con pasos y campos completos, botones Cancelar/Siguiente visibles; sin desbordamiento clientWidth=scrollWidth375. Tab desde select y Escape desde campo cierran correctamente. No datos creados; viewport restaurado. Captura inspeccionada.
- Nueva cotización usada realmente desde Inicio abre listado sin formulario. Se corrigió href a /admin/cotizaciones?new=1, intención existente QuotesWorkspace que verifica quotes.create. ESLint aprobado; build2353 en curso. Replay pendiente.
- Crear OC desde Inicio abre Compras al encabezado sin situarse en creación. Compras expone enlace #purchase-order-tools: pendiente ajustar acceso Inicio a ese ancla y probar.
- Global incompleto/CMS excluido. No afirmar todos los accesos corregidos.

F109 cotización: build2353 exit0/TS aprobado. Servidor58928 Ready202ms. Brave enlace Inicio Nueva cotización abre dialog Crear cotización, cliente/producto reales, impuestos Definir al enviar, Crear borrador deshabilitado vacío. Cancelar cierra, sin crear registro, consola vacía. Crear OC: enlace propio de Compras confirma URL#purchase-order-tools y formulario top0.14px tras navegación; acceso Inicio aún pendiente de apuntar ancla. Global incompleto.

## 2026-10-09 — F109 OC e inventario
- Crear OC Inicio apunta al ancla comprobada /admin/compras#purchase-order-tools.
- Ajustar inventario usado desde Inicio mostraba listado sin formulario. Ahora action=adjust abre AdjustmentDialog por intención inicial, con inventory.adjust verificado en servidor y cliente, key diferencia intención; cierre/éxito elimina action conservando filtros. No modifica stock al navegar.
- Generar reporte usado realmente abre Reportes con datos/filtros de análisis, sin crear programación ni exportar. No se tocó CMS.
- ESLint aprobado, build57897 en curso; replay pendiente. Diseño conserva formularios existentes y focaliza tarea, sin nuevos assets. Global incompleto.

F109 replay OC/inventario: build57897 exit0/TS aprobado, servidor70430 Ready202ms. Brave Ajustar inventario abre Registrar movimiento con Ajuste de entrada seleccionado, local/producto/cantidad vacíos, Confirmar movimiento deshabilitado; Cancelar cierra, no stock modificado, consola vacía.
Crear OC desde Inicio: URL ancla correcta pero NO desplaza al formulario en navegación Next (scroll96/formtop2889.74), captura confirma gráficos/listado. Enlace interno de Compras sí desplaza. Corrección href sola insuficiente; pendiente resolver navegación de ancla entre rutas y replay, F109 NO cerrado.
Intento ejecutar scripts/inventory-admin-ui-contract.test.mjs falló archivo inexistente; no se cuenta como test aprobado. ESLint/build sí aprobados. Global incompleto/CMS excluido.

## 2026-10-09 — F109 navegación de ancla OC
- El acceso rápido con hash usa ahora enlace nativo, para que el navegador resuelva sección tras cargar documento completo; demás accesos mantienen Link. Mantiene texto, estilos y permisos.
- ESLint aprobado, build20684 en curso. Pending replay real: corregir href solo no resolvió problema y no se acepta como cierre.
- Gitstatus208entradas; commit/push/regresión final todavía pendientes. No archivos CMS modificados en esta corrección. Global incompleto.

F109 replay enlace nativo: build20684exit0/servidor23760Ready201ms. Brave llega hash correcto pero formulario top2985.74/scroll0; screenshot confirma no funciona. No cerrar defecto. PurchasesOperations ahora al montar resuelve únicamente hash purchase-order-tools y canManage, scrollIntoView/focuspreventScroll; formulario tabIndex-1 y margen6rem para header. ESLint aprobado, build67651 vivo. Pendiente esperar build/restart/replay desktop/móvil/teclado. Sin datos/CMS modificados; global incompleto.

F109 build67651exit0/server56931Ready196ms. 2contratosinventario/compraspass (no validan ancla). Brave escritorio: formulario top96.14 con foco; 1920x1080 top137.5, Tab al botón Proveedor. Móvil390 mostró formulario fuera de vista(top6156.63), foco vacío; no aprobar móvil. Viewport restaurado. Se amplió effect a RAF y hashchange con cleanup; replay/build pendientes. F112 aviso dependencia registro confuso en formulario OC pese opciones existentes; pendiente inspección. CMS excluido/global incompleto.

## 2026-10-09 — F109 OC móvil verificado; F112 mensaje corregido
- Build94604exit0/TS aprobado, servidor3198Ready199ms. Brave390×844 desde Inicio Crear OC: formulario top95.83px, foco purchase-order-tools, Tab al botón Proveedor. Captura confirma campos y botones completos bajo header. clientWidth=scrollWidth375, consola vacía. Sin crear orden/datos; viewport restaurado.
- F109 navegación OC queda comprobada en escritorio1920 y móvil390 para camino Inicio→Crear OC; no acredita todos los estados/roles.
- F112 causa: page.tsx prefilledProducts=[] sin requestProductId; orderDependenciesReady usa resultados de búsqueda, no prueba existencia catálogo. Mensaje actualizado: si proveedor/local faltan pide registrarlos; en caso contrario pide buscar/seleccionar producto2caracteres. Sin cambio de validaciones ni datos.
- ESLint aprobado; este último mensaje requiere build y replay. Global incompleto/CMS excluido.

## 2026-10-09 — F112 avisos solicitud y orden
- Se extendió mensaje claro a solicitud: local inexistente pide registrarlo; opciones producto vacías con local disponible piden buscar SKU/nombre mínimo2caracteres. No se altera validación/búsqueda ni creación.
- ESLint aprobado;4contratoscompraspass (estructura/permisos/transacción, no validan mensajes renderizados). Build23501 en curso; servidor3198 todavía build anterior, no usar pantalla vieja como evidencia del ajuste.
- Pendiente replay búsquedaQA y aparición/desaparición de avisos; global incompleto/CMS excluido.

F112 replay2026-10-09: build23501exit0/TS aprobado, servidor3404Ready202ms. Brave OC vacía muestra busca/selecciona producto mínimo2caracteres. Buscar QA-AUD-20261006 devuelve opción QA real y desaparece aviso; Guardar/Emitir siguen deshabilitados sin demásdatos. Selector cerrado con Escape botón y búsqueda limpiada; no se guardó orden/datos, consola vacía. pressEscape sobre listboxdiv nofocusable falló herramienta; botón semántico funciona, no defecto producto. Pendiente solicitud/mobile y rama sin dependencias; global incompleto/CMS excluido.

## 2026-10-09 — F113 selector producto fuera de viewport móvil
- Brave390 solicitud: buscaQA devuelve referencia real y desaparece avisoF112, Guardar solicitud deshabilitado sinlocal. Captura dropdown Producto solicitado sale borde derecho, texto cortado.
- Causa AdminSelect absoluto min-w-full y anchura intrínseca de texto. Diseño conserva trigger/paleta/foco: panel w-full min-w-0 y opciones texto multilinea breakwords/overflow-wrap:anywhere. Cambio compartido para selectores administrativos.
- ESLint aprobado; build76468 en curso. Pending replay mismo390/popup abierto y teclado real sobre opciones. No datos creados, búsquedas limpiadas/viewport restaurado; CMS excluido/global incompleto.

F113 replay: build76468exit0/TS aprobado, servidor99429Ready190ms. Brave390 popupProducto solicitado abierto: rectleft49.6/right325.6/width276, scrollWidth274, dentroviewport375. Captura nombreQA completo2líneas. ArrowDown desde opciónplaceholder mueve foco a opciónQA; Escape cierra. Búsqueda limpiada sinselección/guardar, consola vacía, viewport restaurado. Snapshot inicial screenshot adelantado antespaint: comparación segunda captura popup abierto, no defecto adicional. Global incompleto/CMS excluido; revisar otros selectores compartidos1920 y estados largos.

## 2026-10-09 — F113 revisión selector compartido
- Brave1920×1080: Proveedor opciones reales visibles; EndfocoSamsung/Homeplaceholder/Tab siguienteLocal correcto. Local popupwidth775/scroll773, contenido completo; captura mismaresolución.
- Brave390×844: Proveedor popuprectleft49.6/right325.6, clientWidth=scrollWidth274; captura QAlabel completo. Escape cierra sin seleccionar; viewportrestaurado y consola vacía. Sin mutaciones.
- Amplía cobertura F113 a proveedor/local; no sustituye revisar consumidores del componente en otros módulos ni todos los labels. CMSexcluido/globalincompleto.

## 2026-10-09 — Notificaciones: preferencias reales y restauración
- Brave autenticado:14preferencias inicialeschecked. Stock bajo se desactivó y guardó; UI Guardando disabled→Preferencias guardadas. Reloadcheckedfalse comprobado mediante propiedadDOM.
- Se restauró Stock bajo acheckedtrue/Guardó/reloadpropertytrue. Otros13valores conservados. Sin avisos enviados ni estados de bandeja modificados.
- Móvil390×844: Tab desdeGuardar llega primercheckbox; screenshot texto/controles completos y foco visible. clientWidth=scrollWidth375, consola vacía; viewportrestaurado.
- Evidencia cubre preferencias personales de sesiónsuperadmin y persistencia/restauración, no filtrado de entrega de cada tipo ni roles ajenos/error de red. Global incompleto/CMS excluido.

## 2026-10-09 — Notificaciones búsqueda/vacío/fechas
- Brave: queryQA-SIN-RESULTADOS-20261009→0resultados/No hay notificaciones para este alcance/Mostrando0de0. Limpiar recupera40resultados.
- RangoDesde2026-10-10/Hasta2026-10-01→Corrige los filtros +rolealert explica Desde anterior/igualHasta +Consulta pendiente de corregir, sin listado engañoso. Limpiar recupera40; sin cambios de estados/avisos.
- Móvil390clientWidth=scrollWidth375, recuperaciónLimpiar real. Captura muestra paneldetallevacío/reglas; aviso completo quedó fuera de viewport, no contar como captura visual completa del error. Viewportrestaurado, consola vacía.
- FilldateDD/MM falló por inputtype date requiereISO herramienta; no defecto producto. Global incompleto/CMSexcluido.

## 2026-10-09 — F114 etiquetas de reglas y programaciones
- Brave Plantilla vacía Guardar enfocaNombre y no crea registro. Regla declarativa muestra códigos QUOTE_CREATED/INFO/WARNING/CRITICAL/Cooldown; se corrigieron etiquetas españolas con optionvalue original conservado. Intervalo mínimo entre avisos explica cooldown, sin alterarsegundos/validación.
- Programación vacía sin destinatarios mantieneProgramar deshabilitado. HistorialmuestraSENT/CANCELLED raw: pendiente traducción antes de cerrarF114.
- ESLint aprobado,3contratosnotificacionespass (no validanlabels). Build96156en curso; replay labels/selección valores/render móvil pendientes. Sinmutaciones, CMSexcluido/globalincompleto.

F114 parcial replay: build96156exit0/TS aprobado, server97895Ready222ms. Brave events etiquetas españolas; seleccionarTransferencia pendiente conservaTRANSFER_APPROVAL_PENDING y AdvertenciaconservaWARNING. DefaultsQUOTE_CREATED/INFO restaurados sin guardar. Móvil390 intervaloetiqueta2líneas legible y controles/rolesajustados, clientWidth=scrollWidth375, consola vacía; viewportrestaurado. Pendiente mejorarfilaEvento/Severidad2columnas que corta label largo y traducirestados programación. Global incompleto/CMSexcluido.

## 2026-10-09 — F114 responsive y estados
- Reglas Evento/Severidad y Condición/Operador, y programación fecha/enlace:1columna móvil y2desde sm, evita controles comprimidos según screenshot previo390.
- Historialschedule estados4enum confirmados operations-schema:Programado/Enviado/Cancelado/Fallido; valorespersistidos intactos. FechatoLocaleStringesPEAmerica/Lima; fila título multilinea y estado/fecha separado móvil, flexwrapacciones.
- ESLint aprobado/2contratosUIpass (no pruebanresponsive). Build65411en curso. Pendiente replay eventoslargos e historial390/1920, estadosfueraúltimos4no acreditados. CMSexcluido/globalincompleto.

F114responsive replay: build65411exit0/TS aprobado, server91831Ready197ms. Brave390eventoTransferencia pendiente de aprobación completamente visible en control276px/una columna; Tab severidadfocovisible. Defaultsrestaurados sin guardar. Programación390camposfecha/enlace1columna, historial4QAtítulos completosfechaestado debajo; Cancelado/Enviado visible con datos existentes, no rawSENT/CANCELLED. clientWidth=scrollWidth375, consola vacía, viewportrestaurado. Capturas comparadas. Programado/Fallido y ramaestado desconocido no usados en vivo; no crear automatización solo para colores. Global incompleto/CMSexcluido.

## 2026-10-09 — Regresión acumulada en curso
- corepack pnpm test:all sesión40803, logregresion-20261009-actual.log. Conteo TAPhastaahora514tests:486pass/0fail/28skip. Fasesestructuraleslegacy adicionales pasan; no equivalen a UI/funcionalidad completa.
- TypeScript --noEmit terminó y runner ya está en ESLint; buildfinal aún pendiente. No declarar regresión completa hastaexitcode final.
- gitdiff--checkexit0;209entradaslocales pendientes. IntegracionesQA opt-in omitidas no acreditadas por este run. CMS no editado ni usado en UI; runner contiene contratosestáticosglobales.
- Global incompleto: cobertura de roles/estados/descargas reales, flujospendientes y revisión visual final siguen abiertos; commit/push pendientes.

### Cierre de regresión 2026-10-09
El proceso pnpm test:all terminó con código 0. TAP: 514 pruebas, 486 aprobadas, 0 fallidas, 28 omitidas. TypeScript, ESLint completo y compilación Next completaron correctamente. Las integraciones omitidas y la cobertura funcional/visual pendiente no quedan acreditadas por este resultado. CMS excluido de cambios y uso.
### 2026-10-10 — F115/F116: Inicio y cotización móvil

- F115: se usó «Ver guía completa» y abrió Centro operativo; el nombre se corrigió a «Ver centro operativo». «Crea una cotización» ahora enlaza a ?new=1 y se verificó que abre Crear cotización directamente en Brave autenticado. Sin creación de registros.
- F116: a 390×844, una línea QA seleccionada medía 385.56 px dentro de un formulario de 320 px; Quitar quedaba fuera (derecha 392.76 px). Se preservaron tokens, tipografía e iconos existentes; la fila usa columnas limitadas, nombre completo y cantidad debajo en móvil, con acción de 44×44. En escritorio mantiene una sola fila.
- Comparación visual: capturas anterior y posterior emitidas juntas en el mismo resultado de herramienta, mismo cliente y producto QA y viewport. Después: fila 320 px, scroll interno 318 px, Quitar derecha 327.20 px; todo dentro del formulario. No hay imagen local guardada; no se inventa ruta de evidencia.
- Nombres accesibles de los buscadores Cliente y Agregar producto ya no cambian al aparecer resultados. Uso real: búsqueda y selección QA, cantidad 2, Tab a Quitar, Enter elimina la línea. No se guardó cotización. El borrador sin líneas sigue permitido por el contrato actual; enviar exige al menos un producto. No se presenta como fallo.
- Escritorio 1920×1080: captura real de la línea, controles visibles y consola sin errores. ESLint de ambos componentes, seis pruebas de contrato y build Next completaron con código 0. Estos contratos no reemplazan el uso real ni acreditan otros flujos.
- Ajustar inventario desde Inicio en móvil: abrió Registrar movimiento. Local Cusco y SKU QA devolvieron 6 disponibles. Salida de 7 mostró alerta y Confirmar deshabilitado; alerta y Cancelar completos tras navegación por Tab. Cancelar eliminó action=adjust y cerró diálogo. Sin movimiento ni cambio de saldo; consola sin errores, documento 375/375 px.
- Resultado de este alcance: pasado para recorte móvil, accesos corregidos y validación preventiva observada. Auditoría global: incompleta. CMS excluido.
- Pendientes adicionales observados: Cancelar nueva cotización mantiene ?new=1 y vuelve a abrir el formulario al recargar; búsqueda de cliente/producto no informa carga/error/vacío. Nuevo producto de Inicio aún enlaza al catálogo general. Continuar esos puntos y el resto de la cobertura previamente listada antes de cierre, commit y push.
### 2026-10-10 — F117: cerrar intención de nueva cotización

- Defecto confirmado: Cancelar dejaba ?new=1 y recargar reabría Crear cotización. QuotesWorkspace ahora limpia solo new con router.replace(scroll:false); el servidor diferencia creación/listado mediante key. Guardado usa navegación de cierre cuando corresponde y refresh en apertura manual. Permisos y API sin cambios.
- Brave autenticado: /admin/cotizaciones?new=1 → Cancelar → /admin/cotizaciones, diálogo 0; recargar conserva diálogo 0. Nueva cotización manual abre; Escape cierra. X desde ?new=1&status=DRAFT&page=2 conserva status=DRAFT&page=2 y elimina solo new. Consola sin errores. Sin creación de registros.
- ESLint de componente/página y seis contratos aprobados; build-20261010-quote-close.log terminado código 0, servidor62533 listo. Guardado exitoso con new=1 no se ejecutó en esta prueba y sigue pendiente como flujo específico.
- Exportación Reportes: primer intento no clicó por dos enlaces homónimos (problema de locator, no del producto). Segundo intento clicó el enlace principal y esperó download 15 segundos; no recibió evento ni archivo. La URL quedó /admin/reportes y consola sin errores. Eso NO demuestra descarga ni causa de bloqueo; continúa pendiente de evidencia del archivo/historial. No se eludió política del navegador ni se descargó mediante otro canal autenticado.
- Auditoría global incompleta. CMS excluido; siguen pendientes cobertura de estados/roles/descargas, resto de módulos, revisión final y commit/push main.
### 2026-10-10 — F118/F119: buscadores y editor de cotizaciones

- F118: Crear y Editar cotización ignoraban HTTP/errores y no anunciaban carga o búsqueda vacía. QuoteLookup valida HTTP y items; el hook identifica cada consulta/reintento, oculta resultados de consultas anteriores, espera 250 ms y cancela la petición anterior. No almacena ni modifica datos del catálogo. Estados: instrucciones de 2 caracteres, Buscando, sin coincidencias, error humano y Reintentar; resultados anunciados mediante status. Se eliminaron contenedores label que englobaban botones, conservando nombres accesibles explícitos.
- Brave autenticado 1920×1080: instrucciones iniciales, Buscando clientes/productos y estados vacíos realmente observados. Capturas antes/después se emitieron juntas; la captura inicial fue a tamaño nativo y la posterior a 1920×1080, por lo que no se afirma comparación de página completa a idéntico viewport. Se conservaron tokens/tipografía y la referencia de drawer existente.
- Error real controlado: servidor local detenido temporalmente mientras el formulario ya cargado seguía abierto; ambas consultas mostraron alertas y Reintentar. Captura 390×844 mostró mensajes completos (documento375/375px). Servidor restaurado y reintentos recuperaron 8 clientes QA y 1 producto QA; Tab desde Cliente enfocó el reintento y Enter funcionó. Sin creación de registros. Cambiar consulta ocultó inmediatamente la opción QA anterior; reducir a Q retiró resultados y mostró instrucciones.
- Editor del borrador COT-2026-C5C7EF: búsqueda vacía, fallo de conexión real, reintento por teclado y recuperación usados. Producto QA añadido temporalmente y eliminado por Enter desde Quitar, sin guardar el borrador. Se verificó el singular «1 producto encontrado».
- F119: la tarjeta del editor móvil medía359.08px y desbordaba el área útil335.2px, mostrando scrollbar horizontal. Se ajustaron límites mínimos y columnas del nombre/cantidad/quitar, manteniendo los campos de descuento existentes. Capturas anterior/posterior del mismo borrador, query y viewport390×844 emitidas juntas. Después: tarjeta335.2px, formulario clientWidth=scrollWidth375. Cantidad debajo, nombre completo y Quitar44×44; acciones Cancelar/Guardar visibles tras Tab. A1920×1080 conserva una fila y campos de descuento en dos columnas; foco Cantidad comprobado.
- Pruebas:3 nuevas (HTTP/contrato/signal, primer render de carga, vacío/error/reintento/consulta corta/singular),8 contratos existentes y ESLint aprobaron. Test nuevo incluido en test-all.mjs. Builds quote-lookup y quote-edit finalizaron código0. Servidor67349 listo; consola de Brave consultada sin errores, viewportrestaurado. No se ejecutó regresión global de nuevo después de estos cambios.
- Resultado del alcance usado: búsqueda/carga/vacío/fallo de red/reintento y recorte del editor comprobados. Pendiente: respuestas HTTP403/503 en la UI con roles reales, guardado completo y demás flujos. La prueba unitaria de HTTP no reemplaza esa cobertura.
- Observación pendiente de comprobar: /api/admin/precios/productos anuncia búsqueda por familia pero su where solo busca SKU/nombres/marca; no incluye families.name. «Capacitores» devuelve productos cuyo nombre contiene ese término, sin demostrar que encuentre los demás miembros de la familia. Revisar con fichas reales antes de cerrar la búsqueda por familia.
- Auditoría global incompleta. CMS excluido de uso/cambios; commit y push pendientes del cierre autorizado.
## F120 — Búsqueda por familia y categoría (10/10/2026)
- Confirmado en catálogo de Brave: CP-REF-CAP-0416 pertenece a Capacitores/Refrigeración, aunque su nombre comercial usa CAPACITOR singular.
- La API de búsqueda comercial solo comparaba SKU, nombres y marca. Se agregó familia y categoría al predicado parametrizado del servidor; se mantienen pricing.view, mínimo de 2 caracteres y límite de 20.
- Compilación de producción y ESLint de archivos afectados: correctos. Pruebas específicas del predicado: 2 aprobadas.
- Verificación real en Brave autenticado, Nueva cotización: Capacitores devuelve también CAPACITOR (SKU 0141–0156); Refrigeración devuelve aceites, acoples y otros productos sin esa palabra en el nombre; CP-REF-CAP-0416 devuelve el producto exacto. Consola capturada sin errores. Cancelado sin crear registros.
- Alcance pendiente: esta prueba no certifica todos los buscadores, roles ni la auditoría global. CMS excluido por orden del usuario. Exportaciones y demás pendientes previos siguen abiertos.
### 10/10/2026 — Regresión tras F120
pnpm test:all terminó con código 0. TAP agregado: 519 pruebas, 491 aprobadas, 0 fallidas y 28 omitidas. TypeScript, ESLint completo y build Next terminaron correctamente. Evidencia: registro temporal regression-20261010-f120.log. Las integraciones omitidas, descargas reales y cobertura funcional/visual restante siguen pendientes; este resultado no certifica cierre global. CMS excluido de uso y modificaciones.
### F121 — Guardado desde new=1 (10/10/2026)
Brave autenticado: creado borrador QA COT-2026-C87EED con cliente QA AUDITORÍA 2026-10-06 y producto QA-AUD-20261006. Tras guardar: diálogo cerrado, URL sin new=1, borradores 6→7 y registros 131→132. Recarga conserva diálogo cerrado y borrador recuperable mediante búsqueda QA. Detalle conserva SKU x1, total S/11 y nota QA AUDITORÍA 2026-10-10 — prueba de guardado desde acceso directo. Sin envío externo. Consola capturada sin errores. No se envió ni convirtió.
Discrepancia pendiente: se ejecutó fill de Vigencia 2026-10-15, pero no se inspeccionó el valor DOM antes de guardar; detalle persistido muestra vigencia vacía. Repetir entrada/valor y guardado para distinguir problema de interacción de fallo del sistema. No se certifica vigencia ni cierre global. CMS excluido.
### F121 — Aclaración de vigencia QA
En COT-2026-C87EED, fill del controlador mostró un valor DOM válido pero guardar conservó fecha vacía, incluso con Tab. Al cambiar la fecha mediante ArrowUp (entrada por teclado), el guardado persistió 16/10/2026; recargar y reabrir confirmó 16 oct. 2026. Impuestos Incluidos, producto y nota permanecen. Evidencia apunta a una limitación de fill del controlador sobre input date/estado React; no se atribuye al sistema un fallo de persistencia de vigencia basado en esa interacción. Consola sin errores. Borrador QA conservado, sin envío ni conversión. Auditoría global pendiente y CMS excluido.
### F122 — Pestañas de cotización QA y registro de envío
Brave autenticado, COT-2026-C87EED: usados Precios (sin versión enviada, PEN, impuesto incluido), Actividad (vacío explícito), Versiones (explica creación al enviar) e Historial (creación y tres ediciones, fechas Lima). Captura de historial inspeccionada; drawer clientWidth=scrollWidth760, sin recorte horizontal en viewport nativo. No certifica móvil ni viewport1920.
Enviar abre Registrar envío, canales WhatsApp/Correo/Teléfono/Presencial, destinatario/nota y confirmación obligatoria de mensaje previamente enviado; Guardar deshabilitado sin confirmar. Se canceló ese formulario, preservando Borrador. No se inventó un envío externo ni se congeló versión. Consola sin errores. Pendientes versiones enviadas/acciones con su contexto real, PDF y resto de auditoría. CMS excluido.
### F123 — PDF habilitado sin versión (abierto)
Brave, borrador COT-2026-C87EED: PDF navegó la pestaña del panel a /api/admin/cotizaciones/quote-6721e246-9f72-4cbd-b6b4-9d1135270400/pdf y mostró JSON QUOTE_VERSION_REQUIRED: La cotización todavía no tiene una versión enviada. No hubo descarga; el timeout del controlador no es la causa, la respuesta visible explica la ausencia. Captura real inspeccionada. El drawer renderiza enlace PDF incondicionalmente. Pendiente corregir disponibilidad/explicación para borradores y verificar PDF en versión enviada, escritorio/móvil/teclado. Panel recuperado con Atrás. CMS excluido.
### F123 — Corrección parcial verificada
QuotesWorkspace muestra enlace PDF solo si detail.versions contiene versiones; sin versiones muestra texto PDF / Disponible después de registrar el envío, manteniendo icono/tokens del drawer. ESLint y build Next correctos, servidor actualizado. Brave real, COT-2026-C87EED: explicación visible, enlaces PDF0, captura inspeccionada en viewport nativo. No se cambió API ni se creó envío. Pendientes: comparación1920/móvil/teclado y enlace/descarga real en cotización versionada. No certificar F123 completo ni auditoría global todavía. CMS excluido.
### F123 — Verificación responsive y versión existente
Brave390×844: explicación PDF completa, Editar visible; documento clientWidth=scrollWidth390. Captura inspeccionada. A1920×1080 el DOM ubica drawer1160–1920, width=scroll760; la captura del controlador muestra desplazamiento visual incompatible con esas medidas, por lo que no certifica comparación visual final de escritorio. Viewport restaurado.
COT-2026-4AA370 Convertida/versionada conserva enlace PDF. Click real y espera download15s no devolvieron archivo; la URL siguió en cotizaciones, sin errores de consola ni JSON. Descarga/contenido PDF permanecen sin acreditar; no atribuir causa al bloqueo organizacional solo por timeout. No se registraron envíos. CMS excluido.
### F124 — Oportunidad vinculada y nota interna QA
En Brave, Ver oportunidad desde COT-2026-C87EED abre OP-20261010-81F33B correcta (opportunity-24c1067f-7837-42ae-bd29-06e0518335b5). Cotizaciones expone enlace al mismo quoteId. Productos muestra Sin productos y encabezado Sin monto, aunque cotización contiene QA-AUD-20261006 x1 / S/11; investigar contrato/sincronización antes de declarar fallo.
Registrar actividad usado: tipo Nota, asunto QA AUDITORÍA — revisión interna de oportunidad, detalle explicita que no hubo comunicaciones externas. Guardado cerró formulario y Actividad mostró registro; recarga conserva la nota. Aging Sin contacto permanece (nota interna no acredita contacto). Consola sin errores. Defecto visual confirmado: tipo NOTE visible sin traducción; corrección pendiente. CMS excluido. Auditoría global incompleta.
### F124 — Evidencia del contrato de relación
quote-service.ensureOpportunity crea oportunidad QUOTING sin totalAmount ni opportunityItems. createAdminQuote enlaza quoteId y etapa en transacción pero no replica líneas/monto; updateAdminQuoteDraft tampoco sincroniza oportunidad. crm-repository lista opportunityItems independientes. quote-conversion-service actualiza/crea monto al convertir. Por tanto Sin monto/Sin productos observado proviene de separación real de modelos, no fallo de navegación. Pendiente definir presentación y sincronización segura del dato cotizado sin sobrescribir intención comercial de oportunidades preexistentes. No se modificó dato operativo ni contrato todavía; NOTE sin traducir sigue abierto.
### F124 — Etiquetas de actividad corregidas
PipelineWorkspace usa crmActivityLabel: CALL Llamada, WHATSAPP WhatsApp, EMAIL Correo, MEETING Reunión, TASK Tarea, NOTE Nota; desconocidos Actividad. Códigos persistidos intactos. Prueba de seis tipos/desconocido aprobada e incluida en test-all, ESLint y build correctos. Brave autenticado tras recarga: actividad QA aparece Nota · Jean · fecha Lima; captura estabilizada inspeccionada, consola sin errores. Se conservaron estilos/estructura del timeline. Cobertura móvil/1920 y sincronización oportunidad-cotización siguen pendientes; auditoría global incompleta. CMS excluido.
### F125 — Seguimiento QA usado
OP-20261010-81F33B: Nuevo seguimiento vacío no se guardó; formulario permaneció. Creado QA AUDITORÍA — revisar borrador internamente por Enter, fecha DOM confirmada13/10/2026 10:00 Lima (ArrowUp después de fill). Encabezado actualizó próxima acción/fecha. Reprogramar mostró acción/fecha existente; teclado cambió a14/10/2026 10:00 y guardó. Completar eliminó próxima acción/fecha; recarga confirma registro COMPLETED y acciones de pendiente retiradas. Sin comunicaciones externas ni cambio de contacto. Consola sin errores.
Defecto visual confirmado: estados PENDING y COMPLETED aparecen en inglés/código; corregir etiquetas y comprobar CANCELLED/OVERDUE según contrato. Cobertura móvil y cancelación siguen pendientes. CMS excluido; auditoría global incompleta.
### F125 — Etiquetas de seguimiento corregidas
Pipeline usa crmFollowupStatusLabel para presentar Pendiente/Completado/Cancelado/Vencido; código y condiciones de acciones intactos. Pruebas de etiquetas actividad/seguimiento2 aprobadas, ESLint y build correctos. Brave recargado OP-20261010-81F33B: Completado visible y sin acciones de pendiente; captura real inspeccionada y consola sin errores. Integraciones/otros estados reales y móvil siguen pendientes; auditoría global incompleta, CMS excluido.
### F125 — Cancelación y móvil comprobados
Brave390×844: Nuevo seguimiento QA AUDITORÍA — prueba de cancelación, fecha confirmada DOM14/10/2026 11:00 Lima por teclado. Formulario completo en captura. Enter guardó; Seguimientos mostró Pendiente. Cancelar por Enter dejó Cancelado y limpió próxima acción/fecha. Recarga conserva Cancelado y Completado previos, sin botones de pendiente. Captura móvil final inspeccionada: títulos ajustan líneas, etiquetas y footer completos; documento375/375 sin desbordamiento. Consola sin errores; viewportrestaurado. Sin comunicaciones externas. Vencido y otras variantes/roles continúan pendientes; auditoría global incompleta, CMS excluido.
### F124 — Navegación bidireccional confirmada
Desde pestaña Cotizaciones de OP-20261010-81F33B, enlace real abrió COT-2026-C87EED y URL quoteId=quote-6721e246-9f72-4cbd-b6b4-9d1135270400, con producto QA x1, S/11 y vigencia16/10/2026. Relación correcta en ambos sentidos; presentación adicional de datos cotizados requiere respetar permisos quotes.view además de crm.view, por lo que no se agregó lectura indiscriminada al detalle CRM. La separación de modelos sigue explícita en código; diseño informativo y pruebas de roles pendientes. Observación técnica: Timeline reutilizado por Historial usa tipo STAGE; etiqueta compartida requiere contemplarlo como cambio de etapa, pendiente comprobar estado real. CMS excluido; auditoría global incompleta.
### F126 — Cliente360: todas las secciones consultadas
Desde COT-2026-C87EED enlace Ver cliente abre cliente QA customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd. Brave: Resumen4cotizaciones/2oportunidades abiertas/2pedidos/2ventas/5pagos; Cotizaciones4 correctas (incluido borrador de hoy S/11); Oportunidades4 correctas,2SALE/2QUOTING; Actividad nota de hoy más3anteriores y3tareas; Ventas2 S/11; Pedidos PAID yDELIVERED; Pagos5 con cancelados/confirmados e importes6,5,11; Contactos yDirecciones vacíos explícitos; Notas preserva advertencia QA de no contactar. Consola sin errores. Primer locator Oportunidades ambiguo con operacionesCRM; corregido mediante regiónCliente360 (sin fallo del producto).
Defecto confirmado en varias secciones: códigos CONSUMIDOR/QUOTING/SALE/NOTE/MEETING/COMPLETED/CONFIRMED/PAID/DELIVERED/CANCELLED expuestos. Pendiente traducir por dominio (evitar CANCELLED compartido con género/contexto incorrecto), probar enlaces detallados, formularios de relación/roles/mobile. No cambios de datos en este alcance. CMS excluido; auditoría global incompleta.
### F126 — Traducción por dominio implementada
CustomerDetailPanel usa customerRelationLabel por relación; oportunidades reutilizan pipelineStageLabels, pedidos orderStatusLabels, actividades crmActivityLabel; ventas/pagos/cotizaciones mapas por dominio. Tipos Consumidor/Distribuidor/Técnico añadidos y COMPANY Empresa corporativa. STAGE Cambio de etapa añadido al Timeline compartido. Códigos DB intactos. Prueba9casos aprobada, ESLint y build correctos; prueba incluida en test-all. Brave pestaña separada tras detectar pestaña anterior enReportes: ResumenConsumidor, OportunidadesCotizando/Venta creada, ActividadNota/Reunión, TareasCompletado, VentasConfirmada, PedidosPagado/Entregado, PagosConfirmado/Cancelado comprobados con datos QA. Pendiente ajustar género de etiquetas de tareas (Completada) y verificar móvil/estados adicionales. Auditoría global incompleta, CMS excluido.
### F126 — Tareas y móvil
CustomerRelationLabel presenta tareas Completada/Cancelada/Vencida/Pendiente, sin usar género de seguimiento. Pruebas3 (etiquetas CRM yCliente360), ESLint y build correctos. Brave390×844 trasrecarga:3tareasQA Completada; captura scrollaTareas muestra títulos enteros y etiquetas dentrodelpanel. ActividadesNota/Reunión capturadas completas. Documento375/375, consola sin errores, viewportrestaurado. No escrituras DB. Restantes secciones móviles/roles/enlaces pendientes; CMS excluido, auditoría global incompleta.
### F127 — Contacto y dirección QA guardados
Cliente QA customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd enBrave: Agregar contacto vacío bloqueado por requiredNombre (validity.valueMissingtrue); creado QA AUDITORÍA — Contacto adicional20261010, cargoPrueba interna de formulario,emailqa.contacto.20261010@example.test, sin teléfono niWhatsApp/principal. EnterGuardó y recarga conserva contactoActivo/datos.
Agregar dirección vacío bloqueado por requiredDirección; tipoOtra, textoQA AUDITORÍA — Dirección de prueba20261010; no usar para entrega. Sin ubicación geográfica inventada ni principal. EnterGuardó; recarga conserva Otra/texto/Sin ubicación detallada. Consola sin errores. Defecto menor observado: eyebrow de ambos formularios dice Customer360° en inglés; corrección pendiente. No mensajes/envíos. Cobertura móvil/errorHTTP/roles siguenpendientes; CMS excluido, auditoría global incompleta.
### 2026-10-10 — QA móvil aplazado por instrucción de Jean
Jean ordenó dejar el QA móvil hasta el punto actual y retomarlo únicamente cuando lo indique. No se acredita cobertura móvil completa ni se seguirá probando móvil durante el cierre de escritorio. CMS continúa excluido de uso y cambios.
Último punto: F127, Cliente360 del cliente QA. Contacto y dirección creados y persistidos en escritorio. Dirección inspeccionada a 390×844: formulario y acciones completos, clientWidth=scrollWidth375; cancelado sin nueva escritura. Se abrió Agregar nota en móvil, pero su captura, validación y guardado no se completaron. Contacto móvil tampoco completado. Encabezado Customer 360° aún pendiente de corregir. Antes: F125 seguimiento creado/reprogramado/completado/cancelado y F126 actividades/tareas comprobados en móvil.
Retomar desde los tres formularios de Cliente360 (contacto/dirección/nota), restantes secciones/roles/errores y la cobertura móvil abierta en cada módulo. Esta pausa no impide completar funcionalidad y QA de escritorio; descargas reales, flujos operativos, revisión final, regresión y commit/push main siguen pendientes.
### F127 — Nota interna comprobada en escritorio tras aplazar móvil
Viewport móvil restablecido. Brave autenticado: Guardar nota vacía bloqueado por required (valueMissing=true). Nota QA AUDITORÍA 2026-10-10 — validación del guardado de nota interna en escritorio. Sin contacto externo; no usar comercialmente. guardada por Enter. Formulario cerró y recarga conserva texto íntegro en Notas, fecha Lima y Solo equipo interno; nota anterior intacta. Consola sin errores. Esto acredita guardado de nota en escritorio, no QA móvil ni variantes de errores/roles. No comunicación externa; CMS excluido. Cierre global sigue en curso.
### 2026-10-10 — Exportación pagos reintentada / F127 texto
Brave autenticado, control Exportar reporte de Pagos: waitForEvent download iniciado antes del clic, timeout15s sin evento ni archivo. URL permaneció /admin/pagos. Revisión de ruta actual: XLSX por defecto, MIME y Content-Disposition coldpower-pagos.xlsx presentes, CSV explícito con BOM/sep=,. Esto no acredita descarga ni permite atribuir causa; no se alteraron políticas del navegador. Descargas siguen abiertas.
F127: encabezado del compositor de contacto/dirección/nota cambiado de Customer 360° a Cliente 360°, sin cambios de estilo o contratos. ESLint componente exit0; build en sesión80325, log TEMP/build-20261010-customer-composer-es.log, todavía no terminal. Validación visual de escritorio tras reinicio pendiente; móvil aplazado por Jean. Auditoría global incompleta; CMS excluido.
### 2026-10-10 — F127 cierre de texto / F49 integración reejecutada
Build customer-composer-es sesión80325 terminal exit0. Servidor anterior66655 detenido solo después de ese resultado; nuevo60703 Ready378ms. Brave autenticado: Clientes → cliente QA → Notas → Agregar nota muestra CLIENTE360° en encabezado; captura real inspeccionada en escritorio nativo, formulario completo con textarea/Cancelar/Guardar. Cancelar por Enter cierra, diálogo0, consola sin errores. Sin nueva nota ni cambios de estilo. Captura emitida en herramienta, sin ruta local disponible. No acredita viewport1920 final ni móvil; este último aplazado por Jean.
Integración QA_REFUNDS=1 con Neon autorizada: scripts/refund-payment.integration.test.ts exit0,1test aprobado/0omitidos. Fixtures temporales qa-refund-f4cdead1-f017-45fd-8821-ed60ba88411b eliminadas por IDs exactos; auditoría append-only preservada. Prueba rechaza precisión superior a centavos/importes inválidos/exceso, replay devuelve mismo reembolso, key de otro pago o payload cambiado rechazada, competencia por saldo admite1/rechaza1, duplicado simultáneo genera1reembolso, ambos pagos completamente reembolsados y ledger22gross/22refunded/0net,5eventos de solicitud/confirmación. Log TEMP/qa-refunds-20261010-final.log. Sin dinero real. Esta integración no reemplaza flujo de reembolso manual en UI, aún pendiente.
Resultado del alcance F127 texto: pasado. Auditoría global incompleta; CMS excluido, QA móvil aplazado, exportaciones reales y resto de escritorio/roles/flujos/revisión final/commit/push main pendientes.
### 2026-10-10 — Precios y promociones: integraciones opt-in reales
Se ejecutaron tres archivos contra Neon QA autorizada: pricing-import.integration.test.ts (1 aprobado), promotion-lock.integration.test.ts (1 aprobado), promotion-replay.integration.test.ts (2 aprobados). Todos exit0,0fallos/0omitidos. No acredita UI ni roles de sesión reales; QA móvil aplazado y CMS excluido.
Precios: archivo con SKU inexistente rechaza atomicamente sin alterar precios anteriores; duplicados, precisión >2, fecha futura para importación, día imposible y año no bisiesto rechazados; fecha bisiesta válida aceptada; ADMIN sin costo bloqueado. Dos importaciones competidoras: fulfilled/rejected y solo1SPECIALactivo. Replay sin cambios/historiaextra; mismo archivo modificado actualiza a26 y agrega1historia; replayantiguo preserva26. RETAIL original preservado. Precio QA price-a07206d1-26e9-402a-94f6-ca78effdf4f5 archivado mediante servicio en finally; no precios de1348productos importados alterados. Log TEMP/qa-pricing-import-20261010.log.
Promociones: dos clientesDB; pg_try_advisory_xact_lock false mientras otra transacción mantiene bloqueo, true tras liberar. No campaña activada. Log TEMP/qa-promotion-lock-20261010.log.
Reversión: campaña temporal qa-promotion-rollback-b780ae3a-a7c7-4a22-9b7f-a71b6e5f0268 y aplicación vistas dentro de transacción; fallo de auditoría forzado deja0campañas/0aplicaciones persistidas de esa fixture.
Replay: campañaQA existente INACTIVE conservada. Aplicaciones simuladas contextQA_AUDITORIA qa-promotion-replay-458e284a-e103-43ee-9cb2-aabf7a2a401c preservadas como evidencia. Replay conservaIDs; cambiar campaña/producto/contexto/base rechazado; snapshotrepetido devuelve mismoID; pasos alterados rechazados; carreraspayloadsdiferentes fulfilled/rejected y1fila. Snapshot promotion-application-c171a12d-82aa-4c6c-aa1b-22ef18214a69, race promotion-application-d1638a53-22bf-4689-9371-1d7b4cdc92f2. Sin venta, envío externo ni modificación de campaña pausada. Log TEMP/qa-promotion-replay-20261010.log.
Cobertura backend específica acreditada. Cierre global sigue pendiente de flujosUI/roles/descargas/revisión/regresión/commitpush. No declarar sistema completo por estas cuatro pruebas.
### F128 — Menú público: estado de familias y navegación real
Brave escritorio, tienda → Todas las categorías: modal desplegó27categorías; Refrigeración mostró familias y tipos (Aceite, Acople, Capacitor, etc.), no solo tarjetasvacías. Enlace Capacitor clicado desde menú: /catalogo?familia=refrigeracion-capacitores&tipo=Capacitor, filtrosactivos FamiliaCapacitores/TipoCapacitor,1referenciaCP-REF-CAP-0412. Modal cerró y consola sin errores. Captura final1920 todavía pendiente; móvil aplazado.
Defecto de selección confirmado en código: loadNavigationFamilies usaba getCatalogFamilies(undefined,false), consulta administrativa que permiteinactivas. Cambiado a getCatalogFamilies() (pública, familiaactiva+padreactivo), conserva todas las familias activas incluso sin productos publicados. No cambios de esquema/datos/catalogoimportado/CMS/diseño. DatosQA actuales171familias todasactivas, por tanto no se afirma haber observado una inactiva real enUI.
Integración QA_FAMILY_STATUS=1 lecturaNeon exit0:171públicas/171administrativas/0inactivasactuales. FixtureCTE sinwrites verifica1visible de4 frente a familia inactiva/padre inactivo/huérfana. Dos contratos categoría-tipo/loader públicos aprobados. Build en sesión28371, logTEMP/build-20261010-public-families.log, aún no terminal; reinicio y verificación del código nuevo pendientes. Auditoría global incompleta; móvil aplazado/CMS excluido.
### F128 — Compilación y menú actualizado comprobados
Build public-families sesión28371 exit0 (incluye ESLintlayout). Servidor60703 detenido después de exit0, nuevo57434 Ready376ms. Brave misma sesión, reloadtienda y menú: Otros electrodomésticos muestra4familias y6tipos reales (Limpiadora a vapor/Motor/Centrifugador/Deshilachador/Olla/Termómetro). Captura estabilizada inspeccionada en escritorio nativo; primera captura inmediata fueestadoanteriorRefrigeración y no se usa como prueba de selección. Consola sin errores. Antes de reload, Escape comprobado: panel0, focoTodas las categorías, overflowbody restaurado. Sin escriturasDB ni ediciónCMS. QA móvil aplazado; visual1920final global pendiente.
Resultado F128 selecciónpública/uso de tipos: pasado en alcance descrito; categorías/familias actuales todasactivas, exclusioninactiva acreditada porCTElectura+contratodeloader, no fixtureUIpersistida. Auditoría global sigue incompleta. Pendiente directo detectado: Inicio Nuevo producto enlaza catálogo general, ProductCreateForm no acepta intenciónURL; requiere resolver acceso directo y cierre sin reapertura como cotizaciones.
### F129 — Inicio: intención de creación de producto implementada, QA pendiente
Nuevo producto de Inicio antes enlazaba /admin/catalogo sinabrirformulario. Referencia actual capturada en Brave escritorio: Crear producto manual completo con SKU/nombre/categoría/familia/marca/tipo y Cancelar/Crear; diseño preservado. Se cambió enlace a /admin/catalogo?new=1. AdminProductCatalog transmite initialOpen al compositor, keydiferenciada para nuevas navegaciones, con canCreatefalse no abre. Cancelar/X limpian solo new mediante router.replace(scrollfalse), preservan filtros. Guardado exitoso limpia intención en callback de catálogo; apertura manual conserva refresh. Sin cambios API/DB ni creación de producto en este alcance.
ESLint3componentes exit0, pruebaSSR intención+sinpermiso+manual aprobada e incluida en test-all. Build sesión42023, logTEMP/build-20261010-product-intent.log todavía en curso. Reinicio y uso real de Inicio/cancelación/recarga/guardado pendientes; no considerarF129completo por pruebaSSR. Móvil aplazado/CMS excluido; auditoría global incompleta.
### F129 — Fallo terminal de compilación, reintento activo
Sesión42023 terminó exit1: Turbopack no resolvió @vercel/turbopack-next/internal/font/google/font en IBM Plex Sans, detalle next/font/google queries have exactly one entry. No se reinició servidor57434 tras fallo; no atribuirlo al código de formulario sin evidencia. Reintento sesión87218, logTEMP/build-20261010-product-intent-retry.log en curso; no tratar timeoutobservación como fin. QAUI nueva intención pendiente. CMS excluido/móvil aplazado; objetivo global activo.
### F129 — Compilación recuperada y apertura/cierre reales
Reintento87218 terminó exit0; no nueva modificación de fuente tras fallofont. Servidor57434 detenido solo tras terminal, nuevo70603 Ready384ms. Brave autenticado: Inicio personalizado no muestraNuevo producto entre accesosrápidos (selecciónusuario); no se modificaron preferencias ni se acredita clicInicioactual. Ruta exacta implementada /admin/catalogo?new=1 abrióCrear producto manual. Cancelar porEnter cerró y URL/admin/catalogo; reload conserva0diálogos. Nuevo producto manual abrió formulario y Xcerró, captura desktopnativa confirma diseño/campos/accionespreservados; consola sin errores. ?new=1&query=QA&page=2 → X conservaquery=QA&page=2 y elimina solo new,0diálogos. Sin producto creado ni catálogo1348alterado. Guardado desdeintención y permisosdesesiónreales siguenpendientes; SSRsinpermiso no reemplaza UIroles.
Resultadoapertura/cierreF129: pasado en alcance usado. QA móvil aplazado yCMSexcluido; auditoría global incompleta. Observación nueva Inicioactividad: entityLabel Promotion Application/Pricing Import y acción QA promotion replay fixture sinlocalizar, confirmadoDOM con eventosQAactuales; pendiente etiquetas por dominio sin alterar eventos.
### F129 — Guardado por intención y SKU duplicado usados en Brave
/admin/catalogo?new=1: creado QA-AUD-CREATE-20261010, nombreQA AUDITORÍA — Prueba de acceso directo20261010, categoríaexistenteUso general/familiaOtros, sinmarca/tipo/precio/stock/datos técnicos. Crear porEnter cerró creación, eliminónew y abrióficha delproducto Borrador/MANUAL. Reload mantiene0creación y URL/admin/catalogo; búsquedaSKU devuelve1registro con nombreoriginal, Borrador, Sinprecio,Stockdesconocido. Referencias1350=1348importadas+2QAmanuales; no se alteraron identidades de importados. FixturepermaneceDRAFT/no publicada.
Aperturamanual con mismoSKU y nombreintento duplicado: backendrechazó, alerta Ya existe un producto con este SKU. Usa un identificador único. Formulario permanece convaloresyacciones, captura desktopnativa completa inspeccionada. Cancelar yreload:1filaSKU, nombreoriginalpreservado, sinsegundaregistro. Consola consultada trasprimer guardado sinerrores; no se afirma ausenciaerrorconsola409delrechazo posterior. Sin publicación/fondos/stock/CMS. Permisosdesesiónotros y QA1920global pendientes; móvilaplazado.
ResultadoF129crear/cerrar/persistencia/duplicado: pasado en alcance descrito. EnlaceInicioactual no clicado porque preferenciausuario ocultaNuevo producto; enlacecódigo+intenciónservidor/UI comprobados. Auditoría global incompleta.
### F130 — Etiquetas de actividad de Inicio/Auditoría
Defecto confirmado anteriormente enDOMInicio con eventosQA: Promotion Application/Pricing Import y promotion replay fixture. audit-contract compartido ahora presenta Aplicación de promoción/Importación de precios y Registró una prueba QA de reintento de promoción; operaciones-dashboard usa estefallback para entidades/acciones. CódigosDB y evidencia append-only intactos, no se oculta origenQA. No cambios de estilo niCMS.
Cuatro pruebas cp043-audit aprobadas, incluido nuevo caso de etiquetas; ESLint audit-contract correcto. gitdiff--checkexit0 (soloavisosCRLF). Build80576 activo, logTEMP/build-20261010-audit-labels.log. Reinicio yverificaciónInicio/Auditoría de estasetiquetas aúnpendientes; auditoría global incompleta, móvil aplazado/CMS excluido.
### F130 — Verificación real y regresión acumulada activa
Build80576 exit0. Servidor70603 detenido solo tras terminal; nuevo41047 Ready391ms. Brave: InicioActividad del equipo muestra Aplicación de promoción/Importación de precios y Sistema registró una prueba qa de reintento de promoción; códigos persistidos intactos. Auditoría?entityType=pricing_import devuelve12eventos, todosconObjetoImportación de precios y acción Aplicó una importación de precios. Consola sin errores; no escrituras de negocio en este alcance. Verificación desktopnativo, no acredita QA1920final ni móvil.
Regresión pnpmtest:all iniciada sesión64723, logTEMP/regression-20261010-current.log, aún activa; no contar como pasada hastaexit0. Incluye contratosestáticosCMS preexistentes sin usoUI/ediciónCMS; móvilaplazado porJean. F130 etiquetas en alcanceusado pasado, cierre global pendiente de flujosUI/roles/descargas/restomodulos/revisión/commitpush.
### F131 — Teclado de Crear producto manual: defecto real abierto
Brave autenticado escritorio /admin/catalogo?new=1: apertura mantiene document.activeElementBODY, sinfoco inicial. Escape desdeCancelar deja diálogoabierto1. TabdesdeCrear producto enfocaImportar fuera deldialog (closestroleDialogfalse), pese aaria-modaltrue. Sin guardados/escrituras. Cancelar cierra normalmente. Requiere foco inicialSKU, contenciónTab/ShiftTab, Escape yrestauraciónfoco altrigger; conservar formato visual ycontratoscanCreate/new. No corregido aún: regresión64723 estáactiva, TypeScriptterminó yESLinten curso; evitar modificarfuente duranteelrun. CMSexcluido/móvilaplazado; auditoríaglobalincompleta.
### 2026-10-10 — Regresión acumulada: fases finales verificadas en curso
Sesión64723 continúaactiva, no reiniciada. Logregression-20261010-current.log:525testsTAP/497pass/0fail/28skipped (conteos sumados de bloques), contratoslegacyterminados, TypeScript--noEmit yESLintglobal terminaroncorrectamente (runner llegó a siguientecomando). Nextbuildfinal compiló13.9s y ejecutaTypeScript; exitcodefinal todavía pendiente. No afirmarregresióncompleta ni acreditar integracionesomitidasporconteo. F131tecladodeproductoseguiráabierto hasta correcciónyQA; CMSexcluido/móvilaplazado. No cambiosfuente durantelaejecución para preservaralcance del resultado.

### 2026-10-10 — QA móvil suspendido por instrucción de Jean
La revisión móvil se detiene en F127: formulario de dirección del cliente a 390 px, ancho útil y scroll de 375 px, cancelación comprobada. La nota estaba abierta y no se verificó en móvil; contacto adicional en móvil también queda pendiente. Las verificaciones posteriores se realizan en escritorio. Se retomará la revisión móvil únicamente cuando Jean lo indique. CMS sigue excluido de uso y cambios.

### 2026-10-10 — Regresión acumulada terminada y F131 en corrección
La sesión 64723 terminó con exit 0: 525 pruebas, 497 aprobadas, 0 fallos y 28 omitidas. TypeScript, ESLint y Next build terminaron correctamente. Este resultado corresponde a la fuente anterior a F131 y no acredita los flujos de interfaz o descargas pendientes.
F131: ProductCreateForm incorpora foco inicial en SKU, contención de Tab/Shift+Tab, cierre con Escape y restauración del foco. El diseño permanece igual. ESLint del componente pasó y la prueba de intención existente pasó. Build de la corrección en sesión 53482 todavía activo; uso real en Brave pendiente. No declarar F131 resuelto ni el sistema completo hasta verificarlo.

### F131 — Tab y Escape comprobados; restauración por URL en segunda corrección
Build 53482 exit 0; servidor 73407 listo. Brave autenticado: apertura por new=1 enfoca SKU; Tab desde Crear producto enfoca Cerrar dentro del modal; Shift+Tab desde Cerrar enfoca Crear producto dentro del modal. Escape cierra el formulario y elimina new. Captura de escritorio nativo inspeccionada: campos y acciones completos, diseño preservado.
Se detectó que la restauración de foco no persistía después de la navegación que cambia la key del compositor: terminaba en BODY. Se agregó restauración en AdminProductCatalog tras quitar la intención, solo para cancelación/cierre, sin interferir con apertura de la ficha tras guardar. Build 38867 en curso; ESLint 90012 todavía pendiente de salida terminal. No se hicieron guardados de negocio. F131 todavía no cerrado. CMS excluido y QA móvil aplazado por Jean.

### F131 — Corrección de teclado verificada en escritorio
Build 38867 exit 0, ESLint de ambos componentes exit 0, prueba SSR de intención aprobada. Servidor 41435 listo. Brave: Escape desde new=1 cierra, quita new y devuelve foco a Nuevo producto (BUTTON, trigger=true); Enter desde ese botón abre el formulario manual; Cancelar manual devuelve foco al mismo botón. Tab y Shift+Tab ya comprobados en la compilación anterior, código de contención sin cambios. Sin guardados ni alteración del catálogo. Consola solo avisos de Clerk con claves de desarrollo, sin errores de aplicación en el alcance. F131 pasa el alcance de teclado descrito; comparación final 1920 pendiente, móvil aplazado.

### F132 — Descarga de Pagos: enlace nativo implementado, verificación pendiente
Brave en Pagos confirmó el botón Exportar reporte con href=/api/admin/pagos/export? y download ausente. Captura del módulo inspeccionada antes del cambio. El componente usaba Link de Next.js para un endpoint de archivo; se sustituyó ese único enlace por a con download=coldpower-pagos.xlsx, conservando filtros y clases. No se atribuye a esto el bloqueo por organización de la captura del usuario sin una nueva descarga real.
18 pruebas cp040-payments aprobadas, incluida descarga nativa y conservación de queryString. ESLint 96895 pendiente de terminal; build 90409 activo. Descarga real y contenido del XLSX todavía no acreditados. No cambios de políticas de seguridad, permisos, datos de pagos ni CMS. Auditoría global incompleta; QA móvil aplazado por Jean.

### F132 — Build y enlace verificados; descarga sigue sin acreditar
Build 90409 exit 0; ESLint 96895 exit 0. Servidor actualizado 22748 listo en 394 ms. Brave tras reload muestra download=coldpower-pagos.xlsx. Clic real: no evento download en 15 s y la URL permanece /admin/pagos. Revisión de Downloads: ningún archivo nuevo del intento; el más reciente coldpower-pagos (2).xlsx es de las 15:41:51, anterior a esta prueba. No se declara descarga exitosa ni contenido verificado.
Intento de leer brave://downloads/ rechazado por la política de la herramienta: solo admite http/https. No se intentó evadir esa restricción ni cambiar políticas de seguridad. El bloqueo por organización informado por Jean queda abierto; esta corrección del enlace no prueba resolverlo. Clientes y Ventas todavía contienen Link hacia sus endpoints de exportación; revisar y comprobar sus descargas pendientes. QA móvil permanece aplazado y CMS excluido.

### 2026-10-10 — Continuación: progreso confirmado, escritorio activo
El turno anterior produjo cambios de fuente y evidencia real: F131 quedó comprobado por teclado en Brave y F132 cambió a descarga nativa. Se clasifica como progreso; el objetivo completo sigue abierto.

### F133 — Clientes/Ventas: exportación nativa y nombres de canales
Brave autenticado confirmó download ausente en ambos enlaces de exportación. Se inspeccionaron capturas de escritorio de los dos módulos. Se sustituyeron únicamente los Link de exportación por enlaces a con download; filtros, permisos y clases preservados. El nombre del archivo se obtiene del Content-Disposition de cada endpoint.
Ventas mostraba TELEFONO como código visible en gráfico y tabla. Se agregaron etiquetas Teléfono, Tienda, Referido, Cliente recurrente y Otro para los códigos del flujo comercial. Códigos persistidos intactos; sin escrituras de negocio.
16 pruebas de contratos Clientes/Ventas aprobadas y ESLint de ambos componentes exit 0. Build 5153 activo: compiló en 14.1 s, TypeScript en curso. Reinicio, capturas de la versión nueva, filtros y descargas reales pendientes. No atribuir el bloqueo por organización a estos enlaces sin evidencia posterior. CMS excluido; QA móvil aplazado por Jean en F127, solo se retoma por instrucción suya.

### F133 — Build y presentación real verificados; archivos no acreditados
Build 5153 exit 0; servidor 92466 listo en 500 ms. Brave tras reload: Ventas muestra Teléfono en gráfico y tabla, 13 coincidencias visibles/DOM; captura de escritorio inspeccionada. Clientes y Ventas tienen download presente con sus href de filtros. Un clic real en cada Exportar esperó 15 s sin evento de descarga, conservó URL del módulo. Downloads no contiene archivos nuevos de esos intentos; consola de Clientes sin errores. El clic manual solicitado a Jean está pendiente para distinguir controlador/bloqueo del navegador. No declarar exportaciones aprobadas ni contenido de archivos verificado.

### F134 — Reembolso manual QA: parcial persistido y defecto de historial
Nueva fixture reutilizable scripts/qa-refund-ui-fixture.ts, guardada por QA_REFUND_UI=1 y prohibida en NODE_ENV=production. Solo usa cliente QA autorizado; venta/pedido/pago simulados, sin productos, stock, entrega ni dinero real. IDs qa-refund-ui-20261010-sale/order/payment; códigos QA-REFUND-UI-20261010 y QA-PED-REFUND-UI-20261010. La primera transacción falló por snapshot de teléfono obligatorio y se revirtió; se agregó el teléfono de prueba ya usado por la fixture QA y el reintento creó la transacción completa. Sin modificación de pagos operativos existentes.
Brave /admin/pagos?paymentId=qa-refund-ui-20261010-payment: muestra Confirmado, Efectivo/Manual, original S/ 11.00 y enlaces correctos a la fixture. Sin motivo, Solicitar devolución está deshabilitado. Intento 1.001 con motivo QA rechaza con mensaje de máximo dos decimales. Intento 3.00 confirmado: aparece saldo pendiente S/ 3.00 y un reembolso SUCCEEDED; reload conserva el registro. Devolución total restante todavía no usada.
Defecto visible confirmado en pestaña Reembolsos: Succeeded y fecha, sin monto ni motivo. Captura de escritorio inspeccionada. Corrección en PaymentsControlCenter: SUCCEEDED=Confirmado, FAILED=Fallido; historial de Reembolsos muestra monto en moneda del registro y motivo persistido. Sin cambios de pagos/refunds backend. Dos contratos de UI aprobados. ESLint 28280 y build 70400 todavía activos; verificación de la versión nueva pendiente. Fixture permanece disponible para terminar el flujo UI. CMS excluido, móvil aplazado en F127 por Jean.

### F134 — Reembolso parcial y total usados, persistencia y presentación comprobadas
Build 70400 exit 0, ESLint 28280 exit 0; servidor 70138 listo en 379 ms. Fixture reutilizada sin escrituras adicionales: primero CONFIRMED, al finalizar REFUNDED; guardas y ESLint del script aprobados. La fixture sigue disponible como evidencia QA; ningún pago operativo reembolsado.
Brave en el pago QA: 9.00 después de devolver 3.00 rechaza «El monto supera el saldo disponible para reembolso». Monto vacío devuelve exactamente los 8.00 restantes, sin duplicar la devolución previa. Estado final Reembolsado; ya no aparece el formulario Solicitar devolución. Reembolsos muestra dos registros confirmados: S/ 8.00 y S/ 3.00, con sus motivos QA. Reload conserva ambos y el estado. Conciliación: esperado 11.00, recibido 11.00, reembolsado 11.00, neto 0.00, diferencia -11.00. Historial: Confirmado → Reembolsado. No se registró un cobro nuevo aunque el formulario manual ofrece saldo pendiente del pedido; esa oferta refleja su saldo neto, no prueba reembolso pendiente.
Referencia y corrección visual inspeccionadas. Viewport de escritorio configurado 1920×1080, DPR aproximado 1; tras reload se reaplicó el override para estabilizar captura que inicialmente estaba recortada. Captura estabilizada muestra los dos registros completos, sin recorte de acciones o contenido del panel. Esto acredita F134 a esa resolución, no todos los módulos ni QA móvil. La herramienta no devolvió ruta local de captura; no se inventa enlace de imagen.
F49 de devolución manual UI y F134 de detalle de historial pasan en este alcance de fixture manual y rol Superadmin. Pasarela externa, otros roles y demás estados no se acreditan por esta prueba. CMS excluido y móvil aplazado por Jean. Pendiente visual detectado: opciones TRANSFER/CASH/DEPOSIT en el formulario manual todavía se muestran como códigos internos; revisar en el siguiente alcance. Descargas de módulos y cierre global siguen pendientes.

### F135 — Pago manual: nombres, referencia y precisión decimal
Brave en la fixture qa-refund-ui-20261010-payment reembolsada: formulario manual muestra TRANSFER/CASH/DEPOSIT; referencia se anuncia opcional incluso para transferencia, que el servidor exige. Captura de escritorio inspeccionada. Con monto 1.001 y motivo QA, Confirmar queda habilitado (sin clic ni cobro); el código enviaba numericAmount.toFixed(2), redondeando el dato.
ManualPaymentControl usa ahora paymentMethodLabel para Transferencia/Efectivo/Depósito. Referencia se anuncia obligatoria y bloquea Confirmar para TRANSFER/DEPOSIT cuando está vacía; opcional para CASH. Validación compartida isValidManualPaymentAmount exige representación decimal positiva de hasta dos decimales y respeta saldo máximo del formulario. Backend usa esa validación en lugar de comparar amount*100 exactamente, evitando rechazar valores normales por error binario (14.49).
21 pruebas sales-validation/cp040 aprobadas, incluidos 1.01/14.49/0.01, tipos inválidos, notación científica textual, tres decimales y saldo máximo. ESLint de componente/validación exit 0. Build 44363 activo; verificación de la nueva interfaz todavía pendiente. No se confirmó pago en esta prueba, no se modificaron pedidos/pagos operativos, CMS excluido y móvil aplazado por Jean.
Se clasifica el turno anterior como progreso por F133 y F134 verificados. Objetivo completo sigue abierto: descargas reales, roles, demás flujos/estados y revisión final de escritorio no se sustituyen por pruebas de este formulario.

### F135 — Compilación, uso real y protección de cobros comprobados
Build 44363 exit 0; servidor 14735 listo en 398 ms. Brave autenticado: métodos Transferencia/Efectivo/Depósito visibles. 1.001 con motivo y referencia bloquea Confirmar y muestra instrucción de máximo dos decimales. 1.01 con referencia habilita; quitarla bloquea Transferencia. Efectivo sin referencia habilita; Depósito sin referencia bloquea y anuncia Referencia obligatoria. 11.01 sobre saldo 11.00 bloquea. No se pulsó Confirmar ni se creó cobro en estas comprobaciones. Captura estabilizada a 1920×1080 inspeccionada: formulario y texto de error completos; consola sin errores. Móvil no revisado por instrucción de Jean.
Integración QA_PAYMENT_GUARD=1 en sesión 28960 terminó exit 0: 1 prueba aprobada, sin fallos/omitidos. Comprueba saldo, concurrencia, replay y bloqueo de cobros manuales cuando hay proveedor pendiente, incluso configuración parcial e intentos previos. Proveedor sintético sin llamadas externas; fixture temporal exacta retirada por finally, auditoría append-only preservada. Esto no acredita pasarela real ni otros roles. F135 pasa en el alcance descrito.

### 2026-10-10 — Revisión visual de escritorio: Inicio y Dashboard, conexión de Brave perdida
Inicio observado a 1920×1080: encabezado, cuatro métricas, pendientes, módulos, acciones rápidas, actividad, resumen y recientes completos; scrollWidth 1905 <= viewport 1920, sin desbordamiento horizontal. Las preferencias de Jean se conservaron. Actividad muestra exportación de clientes, evidencia de ejecución del endpoint; no prueba recepción del archivo por el navegador.
Dashboard observado a 1920×1080: cinco métricas, alertas, gráfico principal, estado del negocio y pipeline completos; scrollWidth 1905 <= 1920. Margen agregado N/D por costo histórico incompleto, sin inventar dato. Se detectó duplicación de flechas en comparaciones: Delta renderiza icono y formatPeriodDelta.label también contiene flecha (confirmado en fuente). Corrección pendiente; no se modificó el cálculo ni la interfaz en este alcance.
Antes de usar filtros/agrupación, la herramienta respondió Browser is not available: 3. Inventario de superficies confirmó que Brave ya no está conectado: solo IAB y MCP Apps, ambos sin pestañas. Se consultó recuperación documentada y se pidió reconectar Brave. No se sustituyó la sesión personal por otro navegador ni se intentó eludir la restricción previa de brave://downloads. Verificación de filtros, resto del Dashboard y otros 18 módulos a resolución principal sigue pendiente. CMS excluido; QA móvil aplazado en F127. Objetivo global activo, sin declarar bloqueo general ni completitud.

### 2026-10-10 — Alcance solicitado por Jean y regresión final acumulada
QA móvil permanece detenido exactamente en F127. Pendientes de móvil conservados en esta auditoría; se retomará únicamente cuando Jean lo indique. Continúa el alcance de escritorio del resto del sistema. CMS excluido hasta instrucción expresa.
Regresión 51485 terminó exit 0: 530 pruebas, 502 aprobadas, 0 fallos y 28 omitidas; TypeScript, ESLint y build aprobados. Servidor 48724 listo en 229 ms con esa compilación. Esta regresión corresponde a la fuente anterior a F136; no acredita descargas reales, otros roles ni flujos de UI pendientes.
Revisión de preparación de commit: búsqueda acotada de patrones de credenciales en 231 archivos de texto modificados/no rastreados. Cuatro URI en pruebas de validación de conexión eran entradas del parser; se normalizaron a valores sintéticos fixture:example, preservando hosts y guardas. cp048-promotions: 9 aprobadas, sin fallos/omitidos tras el cambio. No se cambiaron credenciales de ejecución ni archivos de entorno. El análisis por patrones no sustituye una certificación de seguridad.

### F136 — Dashboard: comparación con flecha duplicada, corrección en fuente
Defecto observado previamente en Brave a 1920×1080 y confirmado en Delta: icono y etiqueta contenían una flecha cada uno. Se retiró el icono redundante de Delta; se conserva la flecha de la etiqueta, colores y cálculos originales. No se alteraron otras tendencias sin observación suficiente. ESLint del componente exit 0; 4 pruebas cp031-dashboard-data aprobadas. Build 88016 en curso. Verificación visual posterior y demás estados del Dashboard pendientes.
Inventario de navegadores en esta continuación vuelve a mostrar solamente IAB y MCP Apps sin pestañas; Brave sigue ausente. La solicitud de reconexión anterior continúa pendiente. No se cambia de navegador ni se afirma haber usado los módulos faltantes. Descargas reales y cierre completo permanecen abiertos; commit/push autorizado todavía pendiente.

### F136 — Build terminado y local actualizado
Build 88016 terminó exit 0. Servidor anterior 48724 detenido por su sesión conocida; nuevo servidor 69719 listo en 887 ms, http://localhost:3000. Corrección de flecha en fuente compilada; comprobación visual posterior sigue pendiente de Brave. No se declara F136 visualmente aprobado ni el sistema completo. QA móvil permanece pausado en F127 y CMS excluido.

### F137 — Exportaciones nativas de Pedidos y Compras
Continuación clasificada como progreso: F136 compilado y servidor actualizado en el turno anterior. Brave permanece ausente en inventario actual; solicitud de reconexión pendiente, sin sustituir navegador.
Revisión de fuente de enlaces de exportación detectó dos Link de Next.js restantes en OrdersControlCenter y AdminPurchasesModule. Se sustituyeron únicamente esos enlaces por a con download, preservando queryString, clases y contenido. Endpoints mantienen nombre de archivo por Content-Disposition. No se atribuye a estos enlaces el bloqueo por organización ni se acredita descarga real.
ESLint de ambos componentes exit 0. Sesión 34928 terminó exit 0: 25 pruebas dirigidas aprobadas, sin fallos/omitidos; contrato de enlaces ahora cubre Ventas/Clientes/Pedidos/Compras. Pruebas de workbook verifican tipos de SKU/texto/números, ausencia de fórmulas en cadenas, permisos, formatos y filtros en alcance de unidad/fuente; no reemplazan descarga/apertura real en Brave. Build posterior en curso. No escrituras de negocio. CMS excluido; móvil pausado en F127, solo retomar por instrucción de Jean. Cierre global, descargas y commit/push pendientes.

### F137 — Compilación terminada y local actualizado
Build 18794 exit 0, incluido TypeScript y generación de páginas. Servidor 69719 detenido mediante su sesión conocida; nuevo servidor 2857 listo en 200 ms con la versión compilada. Pedidos y Compras responden en fuente con Content-Disposition attachment de nombre XLSX, MIME XLSX y no-store. Estos contratos no prueban recepción del archivo por Brave. Validación visual y descarga pendientes; objetivo completo activo. CMS excluido, móvil pausado en F127.

### 2026-10-10 — Bloqueo de cierre: Brave no conectado
El turno anterior produjo progreso concreto: F137 corregido, 25 pruebas y ESLint aprobados, build exit 0 y local actualizado. En esta continuación se revalidó inventario: Brave sigue ausente; únicamente IAB y MCP Apps, sin pestañas. La misma falta de conexión se ha confirmado en tres turnos consecutivos. Servidor 2857 sigue activo; git diff --check exit 0. No hay build pendiente que justifique espera adicional.
Las siguientes verificaciones exigidas son uso real de escritorio, capturas de las correcciones y descargas/apertura real en la sesión Brave personal. Los cambios de fuente de los defectos ya confirmados están compilados; no se sustituyen esas verificaciones por más contratos ni se introducen cambios visuales sin observación. Se requiere reconectar Brave mediante su extensión de Codex para continuar. Se registra el objetivo bloqueado por esta dependencia externa, no completo.
Pendientes conservados: revisión final de todos los módulos/estados de escritorio, descargas, roles autorizados y cierre de auditoría; commit/push previamente autorizado continúa pendiente. QA móvil detenido en F127 y solo se retoma por indicación de Jean. CMS excluido. Local sigue disponible en http://localhost:3000.

### 2026-10-10 — Brave reconectado, escritorio retomado
Inventario actual muestra Brave Personal id4 con nueva instancia de extensión. Se seleccionó esa sesión y se abrió una pestaña QA propia, sin tocar la pestaña YouTube del usuario. Local autentica Superadmin. La condición de desconexión anterior está resuelta. CMS excluido y móvil detenido en F127 por Jean.
F136 verificado visualmente en captura estabilizada 1920×1080: comparaciones muestran una sola flecha, tarjetas/gráficos completos. Agrupar ventas → Semanal actualiza URL range=month&granularity=week, etiqueta Semanal y tabla a cinco semanas (2101,2238,2375,0,2545); la primera lectura antes de terminar navegación era antigua, no se clasificó como defecto.
Clientes Exportar: clic nativo y downloadMedia documentado esperan 15 s cada uno sin archivo/evento. Downloads no muestra clientes XLSX nuevo. Aparece coldpower-pagos (3).xlsx de 16:12:46 anterior a esta sesión; no se atribuye a estos intentos ni acredita Clientes. Bloqueo/recepción real de exportación sigue abierto.

### F138 — Actividad de Dashboard: ID de pago confundido con ID de pedido
Uso real del enlace Confirmó un reembolso sobre fixture qa-refund-ui-20261010-payment navega a /admin/pagos?orderId=qa-refund-ui-20261010-payment y muestra cero pagos. Captura inspeccionada. Fuente dashboardActivityHref confirma confusión de parámetro. Se cambió únicamente payment a paymentId conservando encodeURIComponent; sin cambios de datos, estado de pagos o estilo.
Cinco pruebas cp031-dashboard-data aprobadas, incluida regresión del enlace; ESLint exit 0. Build 13324 exit 0; servidor 2857 detenido por su sesión conocida, nuevo servidor 45751 Ready163 ms. Brave tras navegación nueva confirma href paymentId correcto; clic abre Detalle y conciliación del pago PAGO-20261010, cliente QA, pedido QA-PED-REFUND-UI-20261010 y estado Reembolsado. Captura a1920 inspeccionada; no cobros ni reembolsos nuevos. F138 aprobado en alcance fixture existente y Superadmin. Otras entidades de actividad todavía requieren revisión. Auditoría completa, archivos y commit/push siguen pendientes.

### F139 — Dashboard Hoy falla por vendedor ausente
Turno anterior produjo progreso: F138 usado/corregido/verificado, Brave reconectado. Esta continuación usa período Hoy desde selector real (opciones Hoy/Ayer/7d/30d/Mes actual/anterior/Año/Personalizado). URL range=today y página Dashboard no disponible. Captura 1920×1080 inspeccionada. Consola digest3756756112; servidor45751 confirma TypeError Cannot read properties of null (reading trim), map de vendedores en chunk SSR. No se trató el primer timeout durante navegación como diagnóstico; el error se confirmó posteriormente en página/servidor/fuente.
Consulta topSellers LEFT JOIN devuelve nombre nulo para ventas sin sellerId: coalesce(users.name,users.email) tampoco cubre ausencia de usuario. sellerInitials intenta trim de null. Se corrigió la expresión de presentación SQL con nullif(trim(name),'')/email y fallback Sin vendedor asignado. Mantiene LEFT JOIN, vendedor id nulo, importes/grupos y ninguna escritura de datos. No se ocultan ventas ni se inventa vendedor.
Seis pruebas cp031-dashboard-data aprobadas, sin fallos/omitidos; nueva regresión de fuente cubre fallback y permanencia LEFT JOIN. ESLint operations-dashboard exit0. Build66259 activo, compiló11.5s y TypeScript pendiente. Verificación posterior en Brave todavía necesaria; F139 no se declara cerrado. CMS excluido, móvil pausado en F127. Resto del objetivo, descargas y commit/push pendientes.

### 2026-10-10 — Rectificación de descargas y control nativo
Jean aportó captura del diálogo localhost:3000 desea guardar para clientes-2026-10-11.xlsx y precisó que debe pulsarse Guardar. Esa evidencia corrige la interpretación de los timeouts: prueban ausencia de evento/archivo en esos intentos, no fallo del endpoint ni bloqueo por organización. La captura anterior de export bloqueado por organización es un caso separado todavía sin explicación confirmada.
Se leyó habilidad Computer Use y sus guías/API/confirmaciones. Inicialización @oai/sky exitosa; inventario devolvió ventana Brave329542. get_window_state fue detenido por política del controlador porque no pudo determinar URL actual con confianza suficiente; se paró inmediatamente, sin entrada de teclado/clic ni método alternativo. No se pulsó Guardar automáticamente ni se cambió la política del navegador. La habilidad existe, pero esa ejecución estuvo impedida; no declarar automatización nativa aprobada.
Esta continuación detecta archivo real Downloads/clientes-2026-10-11.xlsx,82751bytes,modificado22:32:17. Extracción de solo lectura con Python empaquetado ZIP/XML: hoja Clientes,rangoA1:S77,76registros,19columnas,autofiltroA1:S77,0fórmulas,0celdaserror; filasQA3–15 presentes. El contenido ya está descargado y estructurado, no en una sola columna como CSV original. No se modificó archivo ni se abrió/renderizó Excel; revisión visual y comparación exacta contra datos de pantalla/DB todavía pendientes. No atribuir el guardado a la automatización.

### F139 — Compilación y uso real de Hoy aprobados
Build66259 terminóexit0 (observado terminal antes de interrupción nativa). Servidor45751 detenido por sesión conocida;88100 Ready198ms con corrección. PestañaQA anterior ya no existe; se creó375935925 en mismoBravePersonalid4,sin cambiar navegador. /admin/dashboard?range=today carga Dashboard ejecutivo,selectorHoy,ventaS/11 y fila Sin vendedor asignado/S/11/0cotizaciones/N/D. Captura1920×1080 inspeccionada; metadatawidth1920,height1080,DPRaprox1,scrollWidth1905. Sin escritura de datos. F139 aprobado en caso reproducido.
Uso real filtros: Hoy+cliente QA AUDITORÍA2026-10-06 aplica customerId=customer-fa428e1e-cb3a-40ac-86ea-ac3fceb38acd; se conserva Hoy,chipcliente y encabezados/gráficos. ExportarExcelhref conserva range/customerId/format=xlsx. No se intentó descarga adicional que dejase otro diálogo nativo abierto.
PendienteF140: enlaces de puntos del gráfico de ventas llevan solamente createdFrom/createdTo y omiten customerId activo (observaciónDOM). Revisar conservación de contexto y período diario/semanal/mensual antes de corregir; todavía sin uso del enlace ni clasificación final. Resto delDashboard/módulos/archivos/roles y commitpush pendientes. CMS excluido,móvilpausadoF127. Turno con progreso por evidencia de archivo y F139 usado.

## F140 — Alcance de ventas al navegar desde Dashboard (en verificación)
Se reprodujo que pulsar un punto del gráfico perdía el filtro de cliente; además, el enlace solo enviaba un día para agrupaciones semanales/mensuales. Se implementó un intervalo exacto, limitado al período visible, y se reutilizan las condiciones de consulta del Dashboard en listado, métricas y exportación de Ventas. Incluye cliente, vendedor, producto, categoría, familia, marca, canal, sede y estado del pedido.
La regresión completa terminó con código 0, incluyendo TypeScript, ESLint y compilación. Después se añadió un aviso visible del alcance, conservación del alcance al buscar y se evitó abrir automáticamente una venta individual desde un punto agregado. Esta última mejora requiere compilación y comprobación en Brave. F140 permanece abierto; no se declara verificación visual ni descarga completadas.
QA móvil continúa detenido en F127 hasta instrucción de Jean. CMS excluido.

F140: compilación final exit 0; servidor reiniciado Ready 218 ms. Brave Superadmin: clic real en punto 00:00 conserva cliente QA e intervalo 00:00–01:00 Lima; aviso visible, cero diálogos automáticos y enlace Exportar conserva dashboardScope. Aplicar búsqueda QA conserva alcance en URL y aviso. Verificación horaria y búsqueda aprobadas; visual 1920 y comprobación real de puntos semanal/mensual y XLSX filtrado siguen pendientes.

F140 — comprobación adicional en Brave: clic semanal 14/09/2026 abre intervalo 14–21 septiembre (fin excluido); primer punto parcial limita inicio a 11 septiembre. Clic mensual febrero abre 01/02–01/03, muestra cuatro ventas de fechas distintas y monto S/ 3,734. Screenshot de escritorio 1920×1080: aviso, gráficos, filtros y tabla legibles sin superposición en el área observada. Ver todas las ventas elimina dashboardScope y aviso, URL /admin/ventas. Viewport restaurado. Pendiente: archivo exportado filtrado y cobertura de combinaciones de filtros/roles; no se declara auditoría global completada.

Notificaciones — comprobación visual/persistencia Brave Superadmin: aviso QA notification-2b917451-c293-4b30-ac6f-b71eab3fb5d8 marcado leído desde detalle, campana baja29→28, estado Leído y evento de trazabilidad aparecen. Tras recargar la fila conserva Leída; el detalle selecciona otro aviso por defecto, por eso se abrió de nuevo el ID concreto. Restaurado No leído, campana29 y botón Marcar como leída. No mensajes externos ni preferencias modificadas. Pendientes: filtros/paginación completos y formularios de gestión en UI; no se certifica cron.

F141 — Notificaciones ocultaba reglas/plantillas: Brave muestra contador7 pero solo6 reglas y5 plantillas. Fuente confirma slice(0,6)/slice(0,5) sin enlace ni paginación. Eliminados cortes para mostrar todos los registros; ESLint aprobado. Pendiente build y verificación visual del cambio. Cobertura adicional UI: búsqueda aviso manual produce2 resultados; combinar Leídas produce0 con mensaje vacío y sin detalle obsoleto; Limpiar restaura bandeja; Siguiente abrepage2 con15 de40 y sin Siguiente. Sin cambios de preferencias/reglas/envíos.

F141 verificación posterior: build final exit0 (TypeScript30.7s), local reiniciado Ready164ms. Brave recarga Notificaciones y muestra las7 reglas incl. Pago confirmado, y las7 plantillas incl. Seguimiento de cotización y Pago confirmado antes ocultas. Sin cambios de reglas ni envíos. Comprobación visual completa de altura/listas y teclado aún pendiente; corrección de cobertura renderizada comprobada.

Notificaciones — formulario Plantilla usado en Brave: Guardar vacío mantiene formulario y enfoca Nombre de plantilla; tres campos requeridos se identifican inválidos. Se creó QA AUDITORÍA — Plantilla UI 20261010, título QA AUDITORÍA {{entity.code}}, cuerpo Aviso de prueba interno: {{entity.status}}., ruta /admin/notificaciones. UI confirma Guardado en la base de datos y8 plantillas persistidas; recarga conserva encabezado de plantilla. No envío, regla ni programación creada, sin modificación de preferencias. Formulario Regla declarativa inspeccionado: condiciones, severidad, plantilla y audiencia disponibles; no se creó regla activa. Pendientes: errores de variables/rutas, gestión de plantillas existentes y visual completa de los formularios.

F142 — Gestión de Notificaciones pierde mensajes de validación: Brave envío de plantilla QA con {{variable.inexistente}} muestra genérico No se pudo guardar; contador permanece8. API usa error estructurado {code,message,details}; send() solo aceptaba string. Ahora reutiliza apiErrorMessage, compatible con ambos formatos, para mostrar la variable no permitida y demás errores sin perder campos. ESLint aprobado; prueba del helper ejecutada. Pendiente build y reproducción visual posterior; no plantilla inválida persistida ni envío realizado.

F142 verificado Brave: build exit0, TypeScript30.4s, local Ready213ms. Repetición del envío con {{variable.inexistente}} muestra La plantilla contiene una variable no permitida. Formulario sigue abierto; no se registra plantilla inválida. Comprobación puntual aprobada; gestión de existentes y restantes flujos siguen pendientes.

F143 — Edición de plantillas ausente en UI: formulario solo creaba plantillas aunque POST acepta id para actualizar. Añadido selector Plantilla a editar con todas las existentes/nueva, precarga de nombre/título/cuerpo/ruta, envío del id y checkbox Plantilla habilitada conservando estado existente. Guardado de edición mantiene campos; alta conserva reset. ESLint y TypeScript aprobados antes del último ajuste de reset; pendiente repetir lint/build y prueba UI sobre plantilla QA recién creada, incluyendo deshabilitar/restaurar sin mensajes externos. No se modificaron plantillas existentes todavía.

F143 verificado en Brave: ESLint/build exit0, TypeScript30.1s, local Ready216ms. Selector QA precarga nombre/título/cuerpo/ruta y estado habilitado. Editar cuerpo y deshabilitar confirma guardado; recarga y selección verifican cuerpo nuevo y enabled=false. Se restaura cuerpo original y habilitada, guardado confirmado. Contador8 sin nueva plantilla. Solo plantilla QA, sin reglas/envíos externos. Pendiente visual1920/teclado y verificación de restauración tras recarga; objetivo global abierto.

F143 cierre ampliado: Brave tras recarga confirma cuerpo original y enabled=true. Selector→Tab enfoca Nombre de plantilla. Screenshot1920×1080 revisado: campos legibles, foco visible, sin superposición en editor observado; viewport restaurado. F144 — Programaciones ocultas: pestaña Programación muestra4 registros aunque backend entrega lista hasta200; fuente schedules.slice(0,4), sin navegación al resto. Cambiado a schedules.map para permitir ver/gestionar todos los cargados. ESLint aprobado; pendiente build y verificar todos los registros en navegador. No programación creada/cancelada ni preferencia modificada.

F144 verificado Brave: build exit0, TypeScript30.8s, local Ready227ms. Pestaña Programación muestra8 registros, incluidos quinto QA cancelado, renovación Enviado, auditoría trimestral Fallido y corte Enviado antes ocultos. Sin creación/cancelación de programaciones. UI de estados y lista completa cargada comprobadas; cron y formularios con persistencia aún pendientes.

Clientes360 — vínculos usados en Brave: customerId QA abre drawer correcto (resumen4 cotizaciones/2 oportunidades abiertas/3 pedidos/3 ventas/6 pagos). Pestaña Cotizaciones muestra4 relacionadas; clic COT-2026-C87EED abre quote-6721e246 y su cliente/total11PEN correctos. Ver cliente regresa a360. Oportunidades muestra4 relacionadas (2abiertas y2venta creada); clic OP-20261010-81F33B abre Pipeline/opportunity-24c1067f, clienteQA y etapa Cotizando correctos. Sin envío/edición. Pendientes vínculos Ventas/Pedidos/Pagos, estados y permisos; no se declara360 completo.

Clientes360→Ventas→Pedidos→Pagos usado Brave: pestaña Ventas muestra3 relaciones; VTA-3EE6174C-E abre sale-67dec2d4 correcto, clienteQA, Confirmada11PEN/saldo0, cotizaciónCOT-2026-2CC0B4. Ver pedido ORD-20261008-DF4F86 abre order-0b82040b, Entregado/RecojoSucursalCusco y Conciliado11. Gestionar pago conserva orderId: bandeja2 registros, placeholderPAGO-64CB0751Cancelado y PAGO-2C1DD4F9ConfirmadoCASH11, monto confirmado11,1ordenconciliada100%,0pendientes, sin resolución pendiente. No mutaciones/pago/reembolso. Verificado vínculo comercial en cadena; pendientes enlaces directos360→Pedidos/Pagos y demás acciones/roles.

F145 — Código de pago inconsistente en Cliente360: link QA muestra PAGO-PAYMENT y destino muestra PAGO-20261010. customer-repository usaba último segmento UUID completo en helper propio, mientras Pagos usa paymentCode compartido. Reemplazado por helper compartido sin cambiar ID/enlace/estado. Pendiente build/UI. Enlaces directos360→PedidoORD-F8A443 y→PagoQA refund usados: pedidoQA Conciliado11/Por preparar, pagoQA Reembolsado correcto; ninguna mutación.

F145 verificado Brave: build exit0, TypeScript31s, local Ready206ms. Cliente360Pagos muestraPAGO-20261010 mismo código quePagos; demás códigos usan8hex compartidos. Paginación real:6 relacionados,5 enpágina1; Siguiente muestraPAGO-2C1DD4F9Confirmado11PEN enpágina2de2. No pagos ocultos por recorte: hay paginación funcional. Sin mutaciones.

F146 — Fusión conserva vista previa obsoleta: Brave principalQA20261006/secundarioQAContacto→Ver impacto→motivo habilita Confirmar; cambiar aQAAdjunto mantiene impacto y confirmación habilitados. No se pulsó Confirmar. Corregido setter: invalida preview/aviso al cambiar selección y vacía secundario si igual alprincipal. Selectores deshabilitados durante petición para evitar cambio mientras se calcula impacto. ESLint aprobado. Pendiente build y reproducciónUI; no clientes fusionados/alterados. Guardias vacíos bloquean Impacto/Confirmar y principal se excluye de opciones secundarias, comprobadas.

F146 verificado Brave: build exit0, TypeScript30.8s/localReady220ms. Vista previaQAContacto+motivo habilita Confirmar; cambiar secundarioQAAdjunto borra Se moverán y deshabilita Confirmar. Cambiar principal al mismoQAAdjunto vacía secundario y bloquea Ver impacto. Prueba cancelada sin fusión/mutación. Comprobación de guardias UI aprobada; flujo de fusión final de fixtures exclusivos y visual completa siguen pendientes.

Clientes alta — validaciones UI Brave: identidad corporativa vacía bloquea Siguiente. ConsumidorQA con nombre permite etapaContacto. Correo inválido al avanzar muestra El correo electrónico no es válido y conserva etapa. Correo delQA existente→Relación→Revisar duplicados muestra clienteQA/Email y Motivo obligatorio para crear de todos modos; Crear cliente deshabilitado. Prueba cancelada sin alta. Regresión completaF146 iniciada sesión15631; pendiente resultado terminal.

Clientes Desactivar — UI Brave: sin motivo bloqueado; motivoQA en clienteprincipal con relaciones devuelve409 y muestra operaciones abiertas (oportunidades4/cotizaciones2/pedidos2), exige Entiendo el impacto para forzar. No se marcó checkbox ni forzó; cancelado sin mutación. Hay diferencia respecto resumen360(2oportunidades abiertas), pendiente comparar criterios; no se cambia regla sin entenderla. RegresiónF146 sesión15631 terminó exit0, pruebas/TypeScript/ESLint/build aprobados. Resultado posterior aF146; no certifica roles/descargas ni auditoría global.

F147 — Claridad de alcance en impacto de desactivación: inspección authoritative confirma resumen360 usa activeCommercialStages(NEW…ACCEPTED); protección de desactivación incluye ademásSALE/PAYMENT_PENDING/PAID/PREPARING. Diferencia2vs4 no prueba error de suma, son criterios distintos. Texto cambiado a Oportunidades comerciales y de posventa para expresar alcance y conservar protección. ESLint ejecutado; pendiente build/UI. No cambio de estados/counts ni DB. RegresiónF146 fue previa a esta aclaración.

F148 — Impacto de fusión mostrado con claves internas inglesas (CONTACTS/ADDRESSES/OPPORTUNITIES/etc), observado en pruebaF146. Añadidas etiquetas españolas Contactos/Direcciones/Oportunidades/Cotizaciones/Ventas/Pedidos/Actividades/Tareas/Notas/Adjuntos y tipografía10px con salto de palabras. Sin cambio de cantidades/operación. Pendiente build/visual conjuntaF147/F148.

F147/F148 — build sesión20203 terminó exit0; servidor2854 listo. F148 comprobado en Brave1920×1080: los diez tipos de relación de la vista previa de fusión aparecen en español y son legibles; no se ejecutó fusión. F147 reproducción posterior en Brave: desactivación sin forzar devuelve protección por operaciones abiertas y muestra Oportunidades comerciales y de posventa:4, cotizaciones:2, pedidos:2. Cancelado sin cambio de estado. Viewport restaurado. Regresión general previaF146:502 aprobadas/28 omitidas/0 fallos; no cubre todavía todos los roles y flujos.

Descarga/Guardar — intento nativo autorizado por Jean detenido por Computer Use: no pudo verificar la URL actual de Brave para aplicar su política. No se pulsó Guardar ni se certificó una nueva descarga. La existencia del XLSX de Clientes previamente inspeccionado no demuestra que el agente haya completado ese diálogo. Pendiente Guardar y validación del archivo de cada exportación; no atribuir timeout del diálogo a fallo del endpoint. QA móvil permanece detenido enF127 y CMS excluido.

F149 — Kardex global: prueba real Brave muestra movimientos Venta/Reserva/Liberación/Traslado, pero filtro Tipo de movimiento solo ofrece seis tipos manuales. Fuente reutiliza movementTypes del formulario de alta. Corregido únicamente selector del historial usando inventoryMovementTypes e inventoryMovementLabels compartidos (once tipos); formulario manual conserva seis tipos autorizados. ESLint/build iniciados sesión59220, resultado pendiente; verificación UI posterior pendiente. No movimientos ni existencias modificados.

F149 verificado: ESLint y build59220 exit0 (TypeScript31.7s); servidor92684 Ready200ms. Brave tras recarga ofrece once tipos. Seleccionar Reserva devuelve exactamente3 movimientos Reserva, incluidos pedidos QA; Entrada por traslado devuelve238 registros paginados(25,página1de10). Filtro Usuario inexistente devuelve0, mensaje vacío y página1de1 sin registros obsoletos. No cambios en existencias. Corrección funcional comprobada; visual completa1920 y restantes filtros/paginación aún pendientes. Se continúa en Compras.

Compras — filtros reales Brave: proveedorQA20261006+Recibida devuelve5 órdenes, todas del proveedor/estado correctos; enlace Exportar conserva ambos filtros. Abrir OC217D4B conserva filtros y muestra2pedidas/2recibidas, dos recepcionesREC525A31/REC8F7023 y productoQA correcto. Sin emisión/recepción nueva. Archivo exportado no descargado en esta comprobación.

F150 — Ver todos en Scorecard apunta a suppliers-panel, pero panelProveedores solo muestra6 de19 proveedores cargados; fuente confirma suppliers.slice(0,6) sin paginación/enlace al resto. Eliminado recorte para abrir ficha de todos los proveedores cargados. ESLint/build iniciados sesión43008; resultado y visual posteriores pendientes. No proveedores ni OC alterados.

Compras recepción — Brave clic REC525A31 abre ficha Registrada, producto/SKUQA y1 unidad recibida; OC217D4B conserva total2/2 con dos entregas. Sin nueva recepción/mutación. BuildF15043008 sigue pendiente de resultado terminal; ficha conservada para continuar.

F150 verificado render/navegación: ESLint/build43008 exit0; servidor2602 Ready184ms. Brave tras recarga panelsuppliers-panel contiene19 enlaces, antes6. Clic séptimo proveedorQA8727 abre ficha correcta/Inactivo,0órdenes abiertas, productoQA ycontactoQA. Sin mensajes ni ediciones. CrearOC desde esa ficha abre formulario sin proveedor seleccionado y EmitirOC deshabilitado; no demuestra por sí solo guardia completa (faltanlocal/producto), pendiente comprobar selección/validación específica. Lista completa funcional; visual1920 y restantesacciones pendientes. No certificación global.

Compras proveedor inactivo — selector real de OC abierto en Brave: ofrece solo LG/Mabe/QAprincipal/Samsung(los4activos); excluye QA8727inactivo y restantesinactivos. Enlace desde ficha inactiva no preselecciona proveedor inválido. Guardia de selección UI comprobada; defensaAPI y emisión con rol pertinente no certificadas por esta observación. Sin alta/edición/stock.

Compras validaciones reales Brave: Guardar proveedor vacío enfoca Nombre comercial requerido; nombreQA+correo inválido enfoca Correo y mantiene input inválido, sin alta. Campos limpiados. Búsqueda SKUQA en solicitud ofrece producto correcto; seleccionarlo y cambiar búsqueda a SKU inexistente vacía selector, muestra instrucción para seleccionar producto y mantiene Guardar solicitud deshabilitado. No selección obsoleta/alta/OC/recepción/stock. Visual escritorio aún pendiente.

Compras visual1920×1080: screenshot real del anclaCrearOC revisado; campos/botones completos sin superposición en área observada. Se observa espacio en blanco grande a derecha del formularioOC, por distribución desigual de columnas; oportunidad de mejora visual pendiente, no bloquea uso. Recepción empieza debajo y exige scroll normal. Viewport restaurado. No se certifica visual de todo el módulo a partir de esta captura.

F151 — mejora visual Compras: captura1920 mostró OC en media columna y gran espacio vacío al lado. FormularioOC ahora ocupa ambas columnas desde lg, manteniendo ordenSolicitud→Proveedor→OC→Recepción y formularios/permisos sin cambios. ESLint/build iniciados sesión17452; pendiente resultado terminal y captura posterior. No cambio de datos/operaciones. El ancho de campos será revisado en la comprobación; no se declara mejora visual verificada todavía.

F151 comprobación posterior: ESLint/build17452 exit0; servidor15699 Ready168ms. Brave1920×1080 muestraOC ocupando ancho completo, elimina hueco lateral anterior; foco de anclaCrearOC visible y recepción debajo sin superposición. Campos largos aún usan una columna; pendiente optimizar agrupación de proveedor/local/producto/moneda/fecha para reducir recorrido visual. Viewport restaurado. Recepción búsquedaOCinexistente ofrece solo placeholder y Registrarrecepción deshabilitado; búsqueda restaurada sin registro/stock. No auditoría global completa.

F151 ampliación — camposOC agrupados en cuadrícula de2 columnas desde lg: proveedor/local, búsqueda/producto, cantidad-costo/moneda; entregaesperada ocupa ambas. ConservaordenDOM, validaciones y nombres. ESLint/build sesión37690 en ejecución, verificación visual posterior pendiente. Inspección de fichaProveedor revela además contador etiquetado Productos activos que usa detail.products.length (referencias compradas, sin criterioestado); candidato a aclarar tras confirmar consulta. No edición de ficha durante build.

F151 agrupación verificada: build37690exit0/servidor20828Ready185ms. Screenshot Brave1920 muestra proveedor/local y búsqueda/producto pareados, cantidad/costo/moneda agrupados, entregaesperada abajo; sin superposición, foco búsqueda visible. Viewportrestaurado. ClicCrearOC con hashyaigual trasrecarga no desplazó en comprobación; clicinput enfoca/desplaza correcto, investigar comportamientoancla por separado.

F152 — fichaProveedor contador Productos activos usa referencias de compras selectDistinctSKU/nombre(limit200), sinestado producto; confirmadofuente yUIQA draft. Etiqueta corregida a Referencias en compras conservando cantidad/consulta. ESLint aprobado; build/UIposterior pendiente. No datos modificados.

F152 build82881exit0/TS31.8s; etiqueta aún pendiente de verificaciónUI conservidoractualizado.

F153 — Brave reproducción: URLya#purchase-order-tools→clicCrearOC deja formtop3277px fuera deviewport ysin foco. Fuente solo escucha hashchange, que no ocurre sihashigual. Añadido listenerclick para eseancla cuandohashyaigual: previenedefault y ejecuta scroll/focus existentes; ignora modificadores/clicnoizquierdo, limpiezaenunmount. ESLint/build sesión47183 iniciados; terminal/UIpendientes. No datos ni operaciones alterados.

F152 verificado Brave trasbuild47183exit0/servidor73336Ready213ms: fichaProveedor muestra Referencias en compras,0 en fixture sincompras. F153 comprobación posterior contradiceprimerfix: clicrepetido sigueformtop3277/focovacío. NextLink previene clic antes del listenerbubble. Listener cambiado a fasecapture para tratar anclaigual antes deNextLink; limpiezausa mismacapture. Pendiente lint/build/reprueba. No cerrarF153todavía. Hallazgo adicional fuente/Brave: Ver todas delproveedor filtraquerynombre, yexisten nombresQAduplicados; requierealcance supplierId para evitar mezcla, pendientevalidar/fijar.

F153 build26295exit0 (incluyefasecapture). Servidor aún73336buildanterior; pendiente reiniciar yverificarscroll/focus. Alcance proveedor: fuente purchases-repository permite supplierIdexacto mientras enlaceVerTodas ficha usaquerynombre; DOMlista confirma dosIDs con mismonombreQA. NavegaciónVerTodas no completó comprobación (locator proveedor timeout), no se afirma mezcla real observada. Correcciónenlace pendientetrassiguienteverificación. No cambiosDB.

F153 verificado Brave: servidor74812Ready208ms conbuild26295. ClicrepetidoCrearOC conhashigual enfoca purchase-order-tools; mediciónposterior alscroll suave formtop96.3px/viewport798, dentrodepantalla. Primera medicióninmediata conservabatop3277duranteanimación; no confundir confallo. Sinmutaciones. F154 — VerTodas proveedor ahora usa supplierIdexacto en lugarquerynombre, evitandoalcance ambiguo dehomónimos. ESLint/build15852iniciados; resultado/UIpendientes. Sin cambioDB/estados.

F154 verificado Brave: build15852exit0/servidor97413Ready217ms. FichaQA homónimoVerTodas hrefsupplierIdexacto; clic abre /admin/compras?supplierId=supplier-3d7f6a38-d3bf-4d83-8bf8-92123ceeedc8 yselectproveedorvalueigual. Sinmezclapornombre ni datosmutados. Intentopaginaciónsolicitudes durantebuild no concluyó navegación; pendiente repetir conservidorestabilizado, no seafirmafallo. EvitarQA navegación mientrasbuildreescribe .next.

Compras solicitudesBrave: paginaciónreal12→5enpágina2/2enpágina3, registrosdistintos; solicitudQAconvertidaA69DB8muestraSKUQA/cantidad1 ySinaccionesdisponibles. Verpendientesdevuelve1SCDEV002Enrevisión, pero mantiene requestIdQAconvertida ysu detalleabierto. F155: enlaceVerpendientes ahora limpia requestId/purchaseId/receiptId, conserva demásfiltros yreiniciapágina1. ESLint/build88239iniciados, resultado/UIpendientes. Sin cambios en solicitudes/OC/stock. ÚltimopaginadorSiguiente sigueenlacea mismapágina3(no avanza); candidata mejora accesibilidad pendiente, no pérdida de registros.

F155 verificado: build88239exit0, servidor53279Ready211ms. Brave recarga caso conrequestIdQAconvertida; enlaceVerpendientes yaomite requestId/purchaseId/receiptId. ClicconservasupplierId/requestStatusSUBMITTED/página1 ydesapareceheadingSolicitudanterior. Sinmodificarregistros. Paginación/estadosUIparciales comprobados, permisos/accionespersistentes/exportaciones/visualglobal aún pendientes.

F156 — Paginación de solicitudes: Anterior en primera página y Siguiente en última enlazaban a la misma página. Ahora se muestran deshabilitados (aria-disabled, sin href ni foco); corregido singular 1 solicitud. ESLint/build40620 exit0. Verificación posterior en Brave pendiente. Sin cambios de registros. Guardar nativo y validación de exportaciones siguen pendientes por limitación del controlador; CMS excluido y móvil detenido en F127 hasta orden de Jean.

F156 verificado en Brave con servidor47016 Ready202ms: primera página Anterior es SPAN aria-disabled=true sin href; avance real a páginas2 y3; última página Siguiente es SPAN aria-disabled=true sin href/tabindex. Vista filtrada muestra 1 solicitud. Sin mutaciones. Guardar nativo de exportación continúa pendiente: no se declara descarga completa solo porque aparezca el diálogo.

F157 — Trazabilidad Compras: solicitud convertida tenía convertedPurchaseId persistido pero no enlace a OC; añadido Ver orden de compra creada usando navegación compartida y preservando contexto. F158 — Ficha proveedor: referencias recortadas a6 y Ver catálogo buscaba solo primerSKU; lista ahora muestra referencias cargadas y enlace abre catálogo general. Recepción enlazaba purchaseId en vez de receiptId; corregido a ficha exacta. Badge90d sin filtro temporal de consulta corregido a Últimas5. Consulta de ficha conserva límites200, no se afirma cobertura ilimitada. ESLint/build54126 en ejecución; verificaciónUI pendiente. Sin datos/stock modificados.

F157 verificado: ESLint/build54126 exit0; servidor7201 Ready213ms. Brave solicitud SOL-A69DB8→Ver orden de compra creada→Orden OC-20261007-039FDA, conserva solicitud/contexto. F158 verificado parcial: fichaQA muestra Ver catálogo /admin/catalogo, Últimas5 y enlaces receiptId. Clic REC525A31 abre recepción exacta Registrada con SKUQA/1unidad y OC217D4B. Fixture solo1referencia: no prueba visual de más6; eliminaciónrecorte confirmadafuente. Consola observada solo avisoClerk de clavesdesarrollo, sinerrorapp. Nuevo hallazgoUI: Crear la primera OC aparece aunque proveedor tiene5recibidas; pendiente aclarar etiqueta. NoDBmutado; móvil/CMSexcluidos. Regresión completa posterior pendiente.

Compras visual1920 revisado: tarjetas, gráficas y tabla sin superposición en captura observada; viewport restaurado. No captura de recepción específica (scroll no asentado), no certificarla visualmente. Candidato F159 confirmado fuente/UI: KPI Proveedores con incidencias=8 cuenta OC de proveedores inactivos en todos los estados, pero subtítulo dice OC abiertas; scorecard1 tiene otro alcance. Serie Órdenes abiertas cuenta todas las OC creadas sin filtrostatus; series recepciones/solicitudes tampoco filtran estado del KPI. Requiere alinear etiquetas/series/alcance, pendiente tras terminar regresión45874. No mutaciones.

Regresión F158 completa: sesión45874 terminal exit0. 530 pruebasTAP:502 aprobadas,28 omitidas,0 fallos; contratosporfase,TypeScript,ESLint ybuild final correctos. No sustituye pruebas de roles/descargas/visual pendientes. F159 sigue candidato sin edición. Próximo trabajo: alinear KPI/seriesCompras, revisar etiqueta primeraOC y seguir coberturaescritorio. Commit/push aún pendientes.

F159 — Alineación KPI/seriesCompras: abiertas filtraDRAFT/PENDING/PARTIAL_RECEIVED; recepciones ahora cuentaOC PENDING/PARTIAL_RECEIVED porcreación ycon filtrosOC, no recepcionesregistradas; solicitudesfiltraSUBMITTED. AriaLabel explica estadoactual porfechacreación14d, no saldo históricodiario. KPIincidencias renombrado OC con proveedor inactivo/Todos los estados del alcance, ajustado alcountOCreal; scorecardconservaotrocriterio. PrimeraOC condicional a comprasexistentes→CrearotraOC. ESLint/build8536 enejecución; UI/resultado pendientes. PersistedDBsin cambios. Filtrofechas de series mantieneventana14d independiente (fuenteexistente), requiere revisiónalcance posterior.

F159 verificado parcial: ESLint/build8536 exit0; servidor62209 Ready201ms. Prueba readonly getPurchasesKpiSeries proveedorQA: sumabiertas=0,pendientesrecepción=0,incidencia=0,solicitudes14puntos; sinDBmutación. Brave muestra OC con proveedor inactivo8/Todos los estados y ariaLabels porcreación; fichaQA conhistorial muestra CrearotraOC/enlacecorrecto. DiezcontratosdirigidosCompras aprobados exit0 (no sustituyen pruebaSQL). Pendientes específicos: where series elimina filtrosfechas elegidos; cero etiqueta sinsériehistóricacomparable aunque datosson0reales. Próximoajusteambos. TabQA375935939 marcadaHandoff. QAvisualglobal/roles/exportGuardar siguenpendientes; goalactivo.

F160 — SeriesCompras conservan createdFrom/createdTo del filtro y ventana14d; ariaLabel distingue cerosreales, describe filtrosseleccionados excepto solicitudes (lista independiente). PruebaSQL readonly: gastoQA positivo sinfiltro; fechas2099 excluyen gasto/OCseries, pass. ESLint/build72783 enejecución; UIpendiente. Detectadoestadoadicional: serie spendnull cuando0monedas muestra notaMultimoneda, aunque faltandatos; pendiente corregir trasbuild. Sinmutaciones.

F160 ampliación: build72783 exit0. Serie spend con0monedas ahora devuelve14ceros (null reservadoa>1moneda), evita avisoMultimoneda cuando no hay OC. PruebaSQLreadonly actualizada vuelve a pasar: fechasfuturas excluyentodassériesOC/gasto0. ESLint/buildfinal53483 enejecución; UI posteriorpendiente. SinDBmutaciones. Gitestado237archivos pendientes, commit/push aúnnoejecutados.

F160 verificado: buildfinal53483 exit0; servidor73820 Ready199ms. Brave proveedorQA+fechas2099 muestra estadoNoHayOC, cinco ariaLabels porfecha/filtros con todosvalorescero; avisoMultimoneda count0; consolaerroresvacía. SQLreadonly gastoQA positivo sinfiltro yseriesOC/gasto0confechasfuera, aprobado. Solicitudesmantienenalcanceglobal independiente explícitoenariaLabel. No datosmodificados. RegresióncompletaF158502/28 anteriorF159/F160; testsdirigidosF15910pasaron. PendientesglobalesexportGuardar/roles/accionesvisual/commitpush; próxima revisiónInventario importación/filtros/1920. CMSexcluido,móvilF127detenido.

Inventario Brave: búsquedaSKUQA+localCusco devuelve1saldo físico7/reservado1/disponible6/mínimo2, correcto. Importaciones0 muestrahistorialvacío y mensajevistaprevia/confirmación; fuente confirmaCLI scripts/import-stock.ts/planStockImport pero sinAPI/formularioInventario. FlujoimportaciónUI noimplementado/noaprobado, pendiente desarrollar/validar. F161: selectorFamilia170opciones conhomónimos sincategoría confirmadoDOM; añadido nombre·categoría ychipactivo mismoformato conservandoID/opciones. ESLint/build46231 enejecución, UIposteriorpendiente. Sin stock nireservasmutados. CMSexcluido,móvilF127detenido.

Importaciónstock: lecturaCLI confirma incluso --apply solo guarda loteREADY_FOR_TRANSACTION con applied:false; NO aplica saldos. PlanstockvalidaSKU/cantidad/duplicados pero transacciónubicaciones/permisos noimplementada. Brecha funcionalconfirmada: importaciónstock necesita servicio/API/UItransaccionales y pruebas, no basta añadirenlacealCLI. NoejecutadoCLI/nuevolote ni stockmutado.

F161 verificado: ESLint/build46231exit0,servidor21354Ready191ms. Brave Familias muestra nombres·categoría,selecciónCapacitores·Refrigeración+SKUQA+Cusco conserva1saldo7/1/6/2 ychipactivo Familia:Capacitores·Refrigeración. TrespruebasplanStockImport aprobadas(noimplementacióntransaccional). Importacióncompleta siguependiente servicio/API/UI; CLIapplied:false confirmadofuente. SinDB/stockmutado. QAescritorio restantesfiltros/historial/roles/visual1920pendientes.

F162 — Importacióninicialstock implementaciónenprogreso: parserCSV/XLSX/XLS(5MB,1–1000filas,aliasesacentos,columnasobligatoriasúnicas,formula rechazadas), servicio preview/aplicación yPOST/api/admin/inventario/import coninventory.adjust. Lotehashcontenido normalizado+lockadvisory, movimientossalarios/Kardex/audit transacciónúnica; wrapperbloquea saldo yrechaza existencias/reservas/saldoinicial. Seispruebasparser/plan aprobadas; previewreadonlySQLrechaza saldoQAexistente/localinexistente. ESLint aprobado/build21010enTypeScript; terminalpendiente. NOseaplicóstock. UI/CLIunificado/pruebasatomicidadconcurrenciareplay/roles/formulas/binariosyvisualtodavíapendientes. Previewporfila consultaDB(optimizarbatchantesde1000); límite!ref antesdematrizpendiente. No declararF162completo.

F162 progreso: backendbuild21010exit0. Preview optimizado a2consultas masivas balances/openings, límite!ref1000filas/101columnas antesdeconvertirmatriz. AñadidoStockImportDialog ybotónImportarstock solo canAdjust:archivo→validar→tablaerrores/filas→confirmar→resultado/refresh; changingfileinvalidapreview, busybloqueacierre/file. APIpermiso inventory.adjust. ESLint aprobado/buildUI40979enejecución. Faltan resultado terminal, QArealBravearchivo,atomicidad/replay/concurrencia/roles,CLIusarservicioreal ypruebasbinarios/formulas. NOseimportóstock todavía. Servidor21354 siguebuildF161; reiniciar trasterminal antesUI. No cerrarF162.

F162 verificación: buildUI40979exit0; servidor69431Ready197ms. Brave abreImportarstockinicial yValidararchivo disabledsinfile. CargaQA setFiles bloqueadapor extensiónsinAllowaccessfileURLs; preguntaJean pendiente(permitir o cargarmanualexisting.csv), no bypass. Integración28976exit0:1testaprueba atomicrollback(mixedQAprimero/baselineprincipalintacto),dobleconfirmaciónconcurrente1movimiento/replay,renombradoidem,guardiarolREPORTES,cambioarchivo,restituciónstockQA2→0conADJOUT/audit. Fixtureproducto product-000-qa-stock-3e69efbb-cd55-411f-aeb5-e42f4c253ae6 quedaDRAFT; SKUigualsinproductprefix;saldoTrujillo0,localPiura libreparaQAUIarchivoTemp/coldpower-qa-stock-valid.csv. CSVexisting noaplicado. CLIunificado preview/applyconusuarioactivo/permiso/hash, dryrunrealrechazasaldoexistente; sietepruebasparser+planpasaroninclXLSXtext001 yformulas. AñadidoguaridaenteroPGytest(8total+integrationomitidaendefaultrunner),quantitiesconteofilasconsistenteCLI. Regresión78483en ejecución; terminalpendiente. NOcertificarUIpersistenciavisual/rolesreales/CLIapply hasta pruebas. CMSexcluido,móvilF127detenido.

## F162 — continuación: regresión y mensajes de error (11/10/2026)
- Regresión completa sesión 78483: exit 0; 540 casos TAP, 511 aprobados, 29 omitidos, 0 fallos. Contratos, TypeScript, ESLint y build completados. Incluye un caso de stock repetido en dos grupos; cantidades son ejecuciones TAP, no casos únicos.
- Corrección posterior: API de importación limita mensajes públicos a validaciones reconocidas. Errores SQL, del parser o internos reciben un mensaje genérico. Prueba dirigida stock-import-error.test.ts: 1 aprobada, 0 fallos; incorporada al runner completo. El build anterior no certifica esta corrección posterior.
- Pendiente F162: carga real de archivo en Brave, confirmación UI, CLI apply y revisión de trazabilidad. Sigue pendiente respuesta sobre cargar manualmente el CSV QA o habilitar personalmente el permiso de archivos de la extensión. No se ha eludido esa restricción.
- CMS excluido; móvil detenido en F127 hasta indicación de Jean. Guardar nativo de exportaciones y auditoría integral aún pendientes. No se declara cierre del sistema.
## F163 — trazabilidad de importaciones (11/10/2026)
- Kardex: referencias stock_import ahora enlazan a Inventario > Importaciones con importBatchId exacto y codificado.
- Consulta protegida inventory.view filtra por ese ID en base de datos; permite acceder a un lote antiguo aunque no esté entre los últimos ocho. Un ID inexistente muestra mensaje específico.
- Tarjetas de lote ajustan cadenas largas (hash) al ancho disponible mediante min-w-0 y break-all.
- Pruebas dirigidas inventory-reference y stock-import-error: 4 aprobadas, 0 fallos. Verificación TypeScript sesión 63138 pendiente de resultado terminal; UI y build de estos cambios todavía pendientes.
F163: TypeScript sesión 63138 terminó exit 0, sin diagnósticos. Se mantienen pendientes build y comprobación visual.

## F163 — verificación de lote en escritorio y mejoras posteriores
- Build sesión 25989: exit 0. Servidor reiniciado con ese build, sesión 71315 Ready.
- Consulta de solo lectura real: recuperó exactamente lote stock-import-076c8b91b978eac8390688820f806b491f84aba4b7920958b4cab0193d78a3eb; ID inexistente produjo cero lotes.
- Brave pestaña 375935943: Importaciones seleccionado, lote QA AUDITORÍA.csv visible, Aplicado, una fila; tarjeta sin desbordamiento en captura del viewport de escritorio. Consola: cero errores capturados. No prueba universal de todos los anchos.
- Correcciones posteriores a esta comprobación: singular fila/coincidente y enlace Ver últimas importaciones para salir del lote exacto. Requieren nuevo build y comprobación UI.
- Formulario original de carga sigue sin archivo, conservado para respuesta humana. La aplicación de stock desde UI no está certificada. CMS excluido y móvil F127 suspendido por instrucción humana.
## F163 — cierre de ajustes de navegación, no cierre integral
- Pestaña Operaciones se reinicializa cuando cambia tab en URL, evitando conservar una selección distinta al destino; sin reiniciar por paginación del mismo tab.
- inventory-reference.test.ts: 4 casos aprobados. Build final sesión 50696 exit 0. Servidor actual sesión 24728 Ready con ese build.
- Brave 375935945: singular visible «1 fila · 1 coincidente». Clic real Ver últimas importaciones terminó en /admin/inventario?tab=imports#inventory-operations; desapareció enlace de retorno y mantuvo lista Importaciones. Cero errores de consola capturados.
- CLI dry-run archivo válido QA Piura: canApply true, una fila, cero errores, applied false, exit 0. No aplicó stock ni consumió fixture reservado para prueba UI.
- F162 carga/confirmación UI y CLI apply siguen pendientes. Descargas Guardar y demás cobertura integral siguen pendientes; CMS excluido, móvil F127 aplazado.
## F162 — CLI apply real e idempotencia (11/10/2026)
- Script temporal coldpower-f162-cli-replay.ts ejecutó CLI real --apply con actor activo del lote QA y fingerprint original; exit 0, applied true/replayed true. Comparación completa antes/después del producto QA: balances y movimientos iguales, sin duplicación.
- Script temporal coldpower-f162-cli-apply.ts ejecutó CLI real para una unidad del producto QA exclusivo en CP-CHI-DEV. Lote stock-import-89b3b93546e801e55776549c5d48807be2c86dde2e7d34a7955ff9792fdabc8c; applied true/replayed false; saldo físico 1/reservado 0; un movimiento con referencia de lote y actor correctos.
- Restauración controlada mediante ADJUSTMENT_OUT con motivo QA e idempotencyKey; pendiente resultado terminal de sesión 4848 al redactar este registro. No eliminación de historial. Fixture Piura sigue disponible para UI; stock principal Cusco no se modifica.
- F162 aún no cerrado: cargar archivo/validar/confirmar por interfaz y permisos HTTP reales siguen pendientes. CMS excluido, móvil F127 aplazado; audit completo/exportaciones siguen pendientes.
F162: sesión 4848 terminó exit 0. Restauración comprobada: físico 0/reservado 0, historial conservado. La nota de resultado pendiente anterior queda resuelta.

## F164 — cantidades booleanas y acceso HTTP a stock inicial (11/10/2026)
- POST real a /api/admin/inventario/import sin cookie/sesión: HTTP 403, STOCK_IMPORT_FORBIDDEN; respuesta sin detalles internos. No certifica roles autenticados distintos.
- Hallazgo reproducido: una celda Excel booleana true llegaba al plan y Number(true) la convertía en una unidad. Corregido: solo number/string se convierten; booleanos, arrays, objetos, null y undefined se rechazan.
- XLSX binario creado en prueba con cantidad true confirma que el parser conserva el booleano y el plan actualizado lo rechaza. Valores numéricos 1 y texto «1»/« 2 » siguen aceptados.
- 11 pruebas dirigidas stock-import, stock-import-file y stock-import-error aprobadas; cero fallos. No modifica DB. Build del último cambio pendiente. CMS excluido, móvil F127 aplazado; cobertura integral sigue abierta.
## F165 — XLS y guardas CLI; build F164 resuelto (11/10/2026)
- Build F164 sesión 40323 terminó exit 0; localhost reiniciado sesión 40640 Ready con validación actualizada de cantidades.
- XLS binario OLE real generado y leído: SKU textual 001 conservado, local CP-CHI-DEV y cantidad numérica 2 correctos. Se incorporó caso permanente al stock-import-file.test.ts; 6 casos del archivo aprobados, 0 fallos. Caso de fórmula verificado en XLSX; no se extrapola a XLS.
- CLI --apply sin actor-id ni confirm-fingerprint: exit 1 esperado, explicación accionable, no llega a aplicación. Prueba no alteró DB.
- La importación usa la primera hoja; falta explicitarlo en formulario y comprobar libros con varias hojas. Carga real UI/roles HTTP autenticados, descargas Guardar y cobertura integral siguen pendientes. CMS excluido y móvil F127 aplazado.
## F166 — claridad de la vista previa y libros con varias hojas (11/10/2026)
- Formulario informa que Excel procesa únicamente la primera hoja. Prueba real con libros XLSX y XLS de dos hojas confirma que solo importa FIRST/cantidad1, nunca SECOND/cantidad99.
- Resumen cambia «filas válidas» por «filas identificadas»: las filas con SKU encontrado pueden tener errores posteriores de local/saldo. Confirmar sigue dependiendo de canApply, sin cambio de autorización.
- Singular corregido en resumen (fila identificada/error) y éxito (fila). No se afirma aplicación UI.
- stock-import-file.test.ts: 7 aprobadas/0 fallos. ESLint de StockImportDialog y plan de stock: exit 0 sin diagnósticos. Build/UI de este texto pendientes.
- CMS excluido, móvil F127 aplazado. Carga real de archivo, confirmación UI, roles HTTP autenticados y Guardar nativo siguen pendientes; auditoría integral abierta.
F166 regresión: primera ejecución completa terminó exit 1 en admin-inventory-ui-contract.test.mjs porque regex exigía getInventoryAdminPage(filters) sin segundo parámetro. Contrato actualizado para exigir precisamente incomingParams.get("importBatchId") || undefined; permisos y otros asserts conservados. Prueba dirigida pasó 1/1. Reejecución completa sesión 24806 en curso, log coldpower-f166-regression-retry.log. No se declara regresión verde hasta resultado terminal.
## F166 — regresión final y comprobación de formulario
- Regresión sesión 24806 exit 0: 547 ejecuciones TAP, 518 aprobadas/29 omitidas/0 fallos; contratos, TypeScript, ESLint y build correctos. Incluye ejecuciones repetidas de tests; no implica cobertura UI integral.
- Servidor reiniciado sesión 81659 Ready con build actual.
- Brave pestaña 375935947: aviso primera hoja visible; Validar archivo deshabilitado sin selección; Escape cierra dialog (count0). No se seleccionó archivo ni se confirmó importación.
- Encabezado de COBERTURA-ACTUAL actualizado con estos resultados, servidor y limitaciones actuales. Matriz histórica y registros conservados.
- Carga manual de archivo y Guardar nativo pendientes. CMS excluido; móvil F127 aplazado. Auditoría global continúa abierta.
## F167 — estados de importes en Precios (11/10/2026)
- Brave 375935949, producto QA-AUD-20261006: minorista S/11, especial S/22, indicador promociones activas0 y estado global Vigente. La celda especial mostraba importe sin su estado propio, pudiendo confundirse con una oferta vigente.
- PriceCell ahora indica Inactivo/Vencido/Programado/Archivado junto al importe cuando no es vigente; conserva importe histórico y permisos. No se activa la promoción QA ni se modifica precio/DB.
- Prueba SSR cubre cuatro estados, importe conservado, vigente sin aviso falso y ausencia de precio; 1 caso aprobado. Incorporada a runner completo. Build y UI posterior pendientes.
- Se mantiene pendiente auditoría del flujo de aprobación de precios; no se declara módulo terminado. CMS excluido y móvil F127 aplazado.
## F167 — verificación en Brave del importe archivado
- Build sesión 43641 exit 0. Servidor reiniciado sesión 9123 Ready con este build.
- Brave 375935952: tabla QA muestra especial S/22 con Archivado; detalle abierto por botón real confirma ESPECIAL S/22 Archivado y MINORISTA S/11 Vigente ahora. Cero errores capturados de consola. No mutación de precios/promociones.
- Inspección aclara alcance: regla de umbral de aprobación está en descuentos/cotizaciones (quote-pricing), no se encontró una bandeja independiente de aprobación en CRUD de Precios. La auditoría de ese flujo debe seguir su módulo real; no se certifica por esta prueba visual.
- Próximos defectos visuales pendientes observados: «1 productos» y paginación extrema con anchors que solo tienen pointer-events-none (siguen navegables por teclado). Filtros inválidos en página se restablecen silenciosamente mientras enlace export conserva query original; pendiente reproducción específica.
- CMS excluido, móvil F127 aplazado; cierre integral, descargas y commit/push todavía pendientes.
## F168 — paginación accesible de Precios (11/10/2026)
- Sustituidos anchors extremos deshabilitados solo con CSS por spans aria-disabled true, sin href ni tabindex. Solo páginas disponibles conservan enlaces con filtros; nueva navegación Paginación de precios.
- Texto del alcance: singular 1 producto; plural conservado para otros totales.
- Prueba SSR cubre una página sin enlaces/foco, primera con siguiente, última con anterior y página intermedia con ambos. Junto a celda de precios: 2 aprobadas/0 fallos. ESLint de workspace/pager exit 0. Runner incluye prueba nueva.
- Build y comprobación real por teclado en Brave pendientes. No mutación de datos. CMS excluido, móvil F127 aplazado; auditoría integral sigue abierta.
## F168 — verificación escritorio; F169 reproducido
- Build F168 sesión 92722 exit 0; servidor85553 Ready con ese build.
- Brave375935954, QA-AUD-20261006: «1 producto en este alcance» visible; nav Paginación de precios 1/1 tiene dos aria-disabled, cero links/cero focusables. Tab desde último botón de detalle no enfoca extremos; foco BODY al finalizar controles. No se certifican otras páginas aún.
- F169 reproducción real: /admin/precios?query=QA-AUD-20261006&effectiveStatus=QA_INVALID. La página restablece filtros a vacío sin aviso, input pierde QA, muestra1.351productos; Exportar conserva queryQA y effectiveStatusQA_INVALID. Código export parsePricingFilters rechaza ese estado. No se hizo descarga ni mutación.
- F169 requiere aviso de restablecimiento y enlace export derivado del alcance efectivamente mostrado; pendiente corrección/QA. CMS excluido, móvil F127 aplazado, auditoría global abierta.
## F169 — coherencia de filtros y exportación de Precios
- Página usa resolvePricingPageFilters para validar alcance y construir Exportar desde filtros normalizados. Ya no conserva parámetros originales inválidos/ajenos en descarga.
- Solo PricingInvalidFilterError provoca restablecimiento; otros errores se propagan. Aviso accesible role alert explica lista/exportación sin filtros cuando se restablece. Se conserva política actual de restablecer todos los criterios, ahora explícita.
- Dos pruebas aprobadas: filtro inválido muestra aviso/export sin query; filtro válido conserva búsqueda recortada, booleano false, primera repetición y equivalencia parseada de export. ESLint de helper/página/workspace exit0.
- Runner incorpora casos. Build/Brave posterior aún pendientes; no se descargó archivo ni se modificó DB. CMS excluido, móvil F127 aplazado, cierre integral pendiente.
## F169 verificado; F170 fechas imposibles en filtros
- Regresión F169 sesión13924 exit0:551 ejecuciones TAP,522aprobadas/29omitidas/0fallos; contratos/TypeScript/ESLint/build completos. Servidor62168 Ready con ese build.
- Brave375935956: aviso de restablecimiento visible y Exportar=/api/admin/precios/export sin parámetros inválidos; consola0errores. No descarga realizada.
- F170 reproducción helper real aceptó2026-02-30 y2026-99-99 sin aviso. optionalDate ahora valida fecha civil mediante roundtripUTC; aplicado a filtros lista y historial. Rechaza día/mes inexistente y29feb no bisiesto, acepta29feb2024 y30abr2026.
-12pruebas dirigidas de contrato/dominio/filtros aprobadas,0fallos. F170 posterior a regresión/buildF169; build/UI nuevos pendientes. No modificación DB. CMS excluido/móvilF127aplazado/cierreintegralpendiente.
## F170 verificado; F171 revisión masiva desde Brave
- Build70720exit0; servidor20525Ready con validación actual de fechas. Brave375935958, updatedFrom2026-02-30: aviso de restablecimiento visible, Exportar sin filtros inválidos, cero errores consola. Historial no se probó visualmente aún.
- Uso real Actualización masiva con un único producto QA: seleccionó QA-AUD-20261006, minorista PEN, fijar12, motivoQA; Revisar devuelve válido1/bloqueado0/cambio1,11.00→12.00, habilitaAplicar. Cambiar importe a13 elimina revisión y deshabilitaAplicar. No se pulsóAplicar; prueba no persiste precios.
- Hallazgos pendientesF171: singular «1 productos en alcance visible»; texto «Un request transaccional» expone implementación; cada llamada run genera nuevo idempotencyKey incluso al reintentar apply, debilitando deduplicación tras respuesta perdida. Último punto es evidencia de código, no duplicación reproducida.
- Aplicación/restauración porUI y escenarios masivos restantes siguen pendientes. CMS excluido, móvilF127aplazado; cobertura integral no terminada.
## F171 — reintento masivo en cliente y nuevos límites de servidor
- Cliente conserva idempotencyKey del mismo payload tras fallo, genera otra para payload distinto o nueva operación tras éxito. Ref running evita dos envíos simultáneos antes de que React actualice busy. Preflight no crea clave de aplicación.
- Texto singular del alcance y explicación comercial sustituyen «request transaccional».
- Prueba helper reintento/mutación/nueva operación aprobada1/1; ESLint pasó (comando ya alcanzó TypeScript). tsc sesión21606 pendiente, build/UI pendientes. No aplicación de precios realizada.
- Inspección servidor applyBulkPrice: guarda clave en registro mutable productPrices y la sustituye en siguientes cambios; replay tardío podría perder deduplicación. Lectura/comprobación de currentPriceId no usa for update; solicitudes concurrentes requieren reproducción. Retorno idempotent:applied===preview.selected también es true en aplicación inicial exitosa. Son hallazgos de código por verificar/corregir; protección integral no certificada.
- CMS excluido, móvilF127aplazado; auditoría abierta.
F171: TypeScript sesión21606 terminó exit0 sin diagnósticos. Build/UI y verificación de servidor continúan pendientes.

### F172 — Guardar del diálogo nativo de descarga
El usuario exige completar la exportación pulsando Guardar en Brave, verificar el archivo local y abrirlo. La captura muestra clientes-2026-10-11.xlsx, pero no demuestra que la descarga terminara. La inspección actual con Computer Use no encontró un diálogo Guardar abierto; solo una ventana Brave con una búsqueda de Google. Esta comprobación permanece pendiente y no cuenta como exportación verificada. CMS excluido y QA móvil detenido en F127 por orden del usuario.

### F173 — Reintentos de precios masivos
Reproducción real en producto QA dedicado: la aplicación inicial devolvía idempotent=true y un reintento antiguo revertía el importe posterior de 13 a 12. Corregido mediante registro duradero de firma y resultado en auditoría, bloqueo transaccional por solicitud y producto, y lectura del precio con bloqueo de actualización. La repetición conserva 13, una clave con importe diferente se rechaza y repetir un archivo ya aplicado devuelve el resultado previo sin fallar por falta de precio vigente. Prueba QA integration PASS; TypeScript PASS y ESLint PASS. Precio QA archivado al finalizar. Falta compilación, regresión completa y comprobación de aplicación masiva desde Brave. No implica cierre del módulo ni del sistema. Guardar nativo continúa pendiente, CMS excluido y móvil detenido en F127.

### F174 — Concurrencia masiva y regresión
Dos aplicaciones simultáneas con la misma clave: exactamente una aplicación nueva y una repetición reconocida, integración Neon QA PASS. La API comunica conflicto de idempotencia con HTTP 409 y explicación específica. Añadida la prueba al runner general (omitida si no se habilita QA_PRICING_BULK). Regresión sesión 65050: 554 ejecuciones TAP, 524 aprobadas, 30 omitidas, cero fallos; TypeScript y ESLint completados. Compilación de producción aún activa al registrar esta entrada, no se declara finalizada. Log: coldpower-regression-f174.log en TEMP. La pestaña previa de carga manual ya no está abierta en Brave; esa comprobación sigue pendiente. Guardar nativo pendiente, CMS excluido y móvil detenido en F127.

### F175 — Compilación y validación adicional masiva
El log F174 termina con generación completa de rutas y BUILD_ID actualizado; el handle de sesión ya no existe. No se conserva exit code del proceso, por lo que no se inventa. Servidor local iniciado nuevamente, sesión 72406 Ready. Brave no aparece entre los navegadores conectados; prueba UI pendiente. Corregida revisión de producto inexistente (bloqueado antes de aplicar) y unificado bloqueo transaccional masivo con el par producto/tipo de edición individual. Integración QA sesión 99495 exit 0 y TypeScript exit 0 después de estos cambios. Se conserva precio QA archivado. Estos cambios posteriores requieren nueva compilación; el servidor actual sirve F174. CMS excluido y móvil F127 detenido.

### F176 — Compilación verificada y selección durante revisión
Compilación sesión 74503 exit 0, incluye F175. Se encontró en código que las casillas permitían modificar selección mientras la revisión estaba en curso; ahora ambas casillas (página y producto) se deshabilitan mientras busy=true. Corregido mensaje singular de producto actualizado. ESLint componente exit 0. Esta modificación UI posterior aún requiere compilar y usar en Brave; no se considera verificación visual. Brave sigue sin aparecer entre navegadores conectados. Servidor reiniciado sobre build F175. Guardar nativo e importación UI pendientes. CMS excluido y móvil detenido en F127.

### F177 — Aplicación ligada a la revisión previa
El servidor recalculaba la operación masiva al aplicar sin comparar con el resultado presentado. Añadida huella de revisión calculada con operación, condiciones y precios actuales; API exige revisión válida y transacción compara bajo bloqueo. Precio cambiado devuelve BULK_STALE_PREFLIGHT 409. Repetición ya aplicada se reconoce antes de comparar la huella, conservando idempotencia. Integración QA verifica revisión obsoleta rechazada, revisión vigente aplicada y repetida, solicitud simultánea y archivo repetido. TypeScript sesión 56245 exit 0 y ESLint exit 0. Cambios aún sin nueva compilación ni UI Brave; no se declara verificación visual ni sistema completo. CMS excluido, móvil detenido F127 y Guardar nativo pendiente.

### F178 — Regresión final de precios y alcance de proveedores
Runner general sesión 54571 actualmente vivo: 554 ejecuciones TAP, 524 pass, 30 skipped, cero fail. TypeScript y ESLint del runner completados; Next compiló código y está terminando etapas de build. Log coldpower-regression-f178.log. Matriz COBERTURA-ACTUAL actualizada para distinguir build servido, modificaciones posteriores y móvil diferido. Revisión de Compras: getSupplierDetail limita compras y recepciones a 200 y usa esas listas para indicadores; puede omitir historial e indicadores en proveedores con más registros. Hallazgo de código, aún sin reproducción ni corrección. Se mantiene pendiente completar pruebas visuales/descargas en Brave, CMS excluido y móvil F127 detenido. No se declara completo el sistema.

F178 completada: sesión 54571 exit 0; tests, TypeScript, ESLint y build PASS. Servidor reiniciado sesión 64594 Ready con F176/F177 incluidos. La cobertura del navegador no se infiere de esa compilación; Brave y Guardar siguen pendientes.

### F179 — Indicadores completos del proveedor
Se confirmó que getSupplierDetail calculaba rendimiento a partir de listas limitadas a 200. Ahora calcula agregados SQL sobre todo el historial: órdenes abiertas/recibidas, cumplimiento de entrega, cantidades y plazo medio. Última recepción agregada por orden evita duplicar métricas. Importes abiertos agrupados por moneda; tarjeta deja de sumar PEN y USD y admite ajuste de línea. Integración solo lectura del proveedor QA: 6 compras, 7 recepciones, 5 completadas; indicadores comparados con lectura completa independiente, PASS. TypeScript exit 0; prueba incorporada al runner opt-in QA_SUPPLIER_PERFORMANCE. No se creó historial masivo >200 ni se verificó visual en Brave. Listas siguen limitadas a 200/100; paginación e indicación de alcance siguen pendientes. Cambios no compilados todavía; local sirve F178. CMS excluido y móvil F127 detenido.

### F180 — Historial de recepciones y documentos del proveedor
Listas paginadas desde servidor: 5 recepciones y 4 documentos por página, conteo total y página limitada al rango válido; orden estable por fecha e ID. Anterior/Siguiente conservan la página de la otra lista y navegan a su sección. Se retiraron cortes slice ocultos en UI. Integración QA solo lectura: 7 recepciones, dos páginas disjuntas, página excesiva corregida y métricas idénticas entre páginas, PASS. TypeScript sesión 6631 exit 0 y ESLint exit 0. Productos y órdenes siguen con límite 200 y requieren cobertura posterior; no se declara paginación completa del proveedor. Compilación y prueba visual de F179/F180 pendientes. CMS excluido y móvil detenido en F127.

### F181 — Paginación de productos y órdenes abiertas
Añadidas páginas de 20 productos/órdenes abiertas, conteos totales y orden estable. La consulta de órdenes filtra abiertas antes de paginar para no ocultarlas tras compras cerradas. Productos agrupados por SKU para evitar claves y referencias duplicadas al variar el nombre de snapshot. Los cuatro controles conservan páginas de otras listas. Última OC y total de compras provienen del agregado completo, sin depender de la página. Integración QA solo lectura PASS; comprueba conteos, unicidad de SKU, filtro de abiertas y métricas independientes de página. El proveedor QA tiene 0 órdenes abiertas; navegación de órdenes/productos con más de 20 filas aún no reproducida. TypeScript sesión 92350 exit 0, ESLint exit 0. Compilación/regresión y uso visual pendientes. No certifica auditoría completa; CMS excluido y móvil F127 detenido.

### F182 — Puertas de calidad y revisión del detalle proveedor
Regresión F181 sesión 97352 viva: 555 ejecuciones TAP, 524 aprobadas, 31 omitidas, cero fallos; TypeScript/ESLint del runner superados y build iniciado. git diff --check exit 0, solo avisos CRLF. Brave no está conectado; solicitada reconexión para pruebas visuales y Guardar. Revisión de código encontró dos pendientes: recepciones canceladas usan indicador verde y getError del detalle proveedor no interpreta el contrato actual error.message, mostrando fallback genérico. Correcciones pendientes de terminar build antes de editar fuentes. No se declara completo el módulo ni el sistema; CMS excluido y móvil F127 detenido.

### F183 — Presentación de recepciones y errores
Regresión F181 sesión 97352 exit 0: 555 ejecuciones TAP, 524 pass, 31 skipped, cero fallos; contratos, TypeScript, ESLint y build PASS. Local reiniciado sesión 69687 sobre F181. Cambios posteriores F183: indicador de recepción cancelada rojo, registrada verde y estado desconocido neutro; texto acompaña al color. Detalle proveedor interpreta error.message del contrato actual y mantiene compatibilidad legacy mediante apiErrorMessage. Tres pruebas dirigidas PASS y ESLint PASS. F183 aún sin recompilar ni verificar en Brave. CMS excluido y móvil detenido F127, descargas Guardar y auditoría integral pendientes.

### F184 — Puntualidad con fechas válidas
Detalle y resumen general de Compras usaban última recepción sin excluir CANCELLED y dividían puntualidad por todas las órdenes RECEIVED, incluyendo aquellas sin fecha esperada/recepción. Ahora última recepción solo POSTED y denominador solo órdenes con ambas fechas; sin datos suficientes devuelve null y muestra Sin fechas. UI expone número evaluado y total recibido. Integración QA solo lectura PASS contra cálculo independiente; TypeScript sesión 11947 exit 0 y ESLint exit 0 antes del último texto/nota del resumen. Falta prueba de fixture con cancelación explícita, lint/TS de la nota final, compilación y navegador. No se declara cerrado el módulo. CMS excluido, móvil F127 detenido y Guardar pendiente.

### F185 — Costos decimales rechazados
Reproducción directa del validador validatePurchaseRequestConversionItems, sin escritura DB: costos 4.10, 0.29 y 10.20 fueron rechazados pese a tener dos decimales; 4.101 fue rechazado correctamente. positiveMoney compara Math.round(amount*100) con amount*100, sensible a representación binaria. Afecta también validatePurchaseInput. Corrección pendiente al terminar regresión actual sesión 66733; no se editan fuentes mientras corre. El nuevo caso no está cubierto por pruebas previas con costo 5.00. CMS excluido, móvil F127 detenido y Brave/Guardar pendientes.

### F186 — Costos exactos de compras
Regresión F185 sesión 66733 exit 0, incluye F183/F184; no incluye cambio posterior F186. Corregido positiveMoney mediante centavos BigInt y validación explícita de texto/número: valores 4.10, 0.29, 10.20 ahora válidos; no acepta >2 decimales, booleanos, objetos, hex/exponente textual, cero o fuera de numeric(14,2). Dos pruebas PASS cubren conversión y alta de OC, normalización y límites. Añadidas al runner. Falta integración de creación con costos fraccionarios, nueva compilación y uso real en Brave. CMS excluido, móvil F127 detenido; Guardar y auditoría integral siguen pendientes.

### F187 — Costo fraccionario persistido y flujo QA
Integración purchases-workflow sesión 41621 exit 0 con costo 4.10 y cantidad 2: unitCost persistido 4.10, subtotal 8.20. Dos altas simultáneas producen una compra y un replay; emisión y cancelación correctas, solicitudes rechazo/cancelación correctas, inventario idéntico antes/después. Fixture purchase-a1cdcbba-62bb-4243-a270-b5e844b3e4f0 CANCELLED; proveedor supplier-be8dc56d-a3b0-464e-93d8-27daf253a77e INACTIVE al finalizar, auditoría conservada. No se invocó recepción ni comunicación externa. Falta UI Brave, compilación posterior y cierre integral. CMS excluido, móvil F127 detenido y Guardar pendiente.

### F188 — Enlaces del proveedor y regresión posterior
Inspección de contratos y destinos: query del catálogo, supplierId de compras, orderSupplierId de alta, purchaseId y receiptId son parámetros aceptados por páginas/rutas actuales. Evidencia estática; no sustituye navegación Brave. Regresión sesión 23805 viva: 558 ejecuciones TAP, 527 pass, 31 skipped, cero fail; TypeScript y ESLint del runner superados; build compiló código y sigue en TypeScript. No se declara terminada hasta exit code. Log coldpower-regression-f187.log. CMS excluido, móvil F127 detenido; auditoría integral y Guardar pendientes.

### F189 — Fechas reales en filtros de Compras
Regresión F187 sesión 23805 exit 0: 558 TAP, 527 pass, 31 skipped, cero fallos, contratos/TypeScript/ESLint/build aprobados. Servidor reiniciado sesión 44256 Ready. Reproducción posterior: parsePurchasesFilters aceptaba 2026-02-30 y 2026-99-99. Validación ahora exige fecha civil real por round-trip UTC; prueba cubre los cuatro campos, año bisiesto, febrero y abril. Tres pruebas dirigidas (fechas + costos) PASS; F189 aún sin compilar. Pendiente revisar aviso de filtros inválidos y coherencia lista/exportación en página y Brave; no se declara todo Compras verificado. CMS excluido y móvil F127 detenido, Guardar pendiente.

### F190 — Alcance coherente de Compras y exportación
Con filtro inválido, página restablecía purchaseFilters pero exportación/navegación recibían query original. Helper nuevo normaliza filtros y conserva parámetros de detalle/solicitudes solo en navegación; exportación contiene únicamente filtros efectivos. Aviso explica restablecimiento y alcance compartido. Tres pruebas dirigidas (resolver y fechas) PASS, TypeScript sesión 80822 exit 0 y ESLint exit 0. Contrato UI actualizado para comprobar cableado del helper y exportHref normalizado, no relajar cobertura. Falta compilación/regresión completa y uso en Brave. CMS excluido, móvil detenido F127 y Guardar pendiente.

### F191/F192 — Contratos de exportación y errores entre módulos
Regresión F191 sesión 46323 exit 1 por contrato antiguo de enlace exportador Compras (exigía queryString sin validar), no por fallo runtime. Actualizado contrato para comprobar exportHref normalizado, cableado de página y conservación de filtros válidos; cuatro contratos dirigidos PASS. Inicio personalización, Taxonomía e invitación Usuarios ahora leen error.message con apiErrorMessage. Invitación captura fallo de red y aconseja revisar lista antes de reintentar para no asumir que no hubo envío. No se envió ninguna invitación ni se concedieron accesos. TypeScript y ESLint PASS. Regresión completa y build posteriores pendientes, uso visual también. Brave sigue sin conexión en inventario; petición de reconexión pendiente. CMS excluido y móvil F127 detenido; Guardar pendiente y objetivo integral abierto.

### F193 — Errores de prueba de integraciones visibles
Revisión del componente activo de Configuración: TestIntegrationsButton compacto no renderiza estado error; IntegrationRowMenu solo refresca en response.ok, omite mensaje no-ok y no captura fallo de red. Ambos pendientes de corrección tras finalizar regresión F192 sesión 86291 actualmente viva (build iniciado). CompanySettingsForm no tiene consumidores encontrados, no se prioriza como formulario vigente. Opciones de recepción de Compras aún leen solo error textual y omiten error.message. Hallazgos de código, no uso visual. CMS excluido, móvil detenido F127 y Guardar pendiente.

### F194 — Errores visibles de integraciones y opciones de recepción
Regresión F192 sesión 86291 exit 0. F194 posterior: controles de integración usan petición común con contrato error.message, fallback de respuesta no JSON y error de red. Botón compacto y menú renderizan role=alert, en vez de ocultar fallo. Opciones de recepción de Compras también leen error.message. Dos pruebas de petición con fetch simulado PASS: 403 estructurado, 503 sin JSON, red, respuesta inválida y POST correcto con clave codificada. No se invocaron servicios externos ni se probó la UI en Brave. F194 sin compilar, regresión posterior pendiente; CMS excluido y móvil F127 detenido, Guardar pendiente.

### F195 — Accesibilidad de controles vigentes de integración
Se comprobó que IntegrationRowMenu procede de plantilla antigua y no aparece en la página vigente de Configuración; no se da por probado ni se prioriza como flujo actual. TestIntegrationsButton activo agrega foco visible, aria-busy, texto Probando en versión compacta y asociación aria-describedby al error con ID estable. TypeScript y ESLint PASS. Comprobación por código, falta teclado/lector/visual en Brave. F194/F195 requieren build y regresión posterior. CMS excluido y móvil F127 detenido, Guardar pendiente; objetivo integral abierto.

### F196 — Recuperación de Usuarios ante fallo de red
Revisión de UserRoleControl y StaffInvitationActions: callbacks async de startTransition hacen fetch sin catch, dejando fallos de red sin mensaje de recuperación. Además, mensaje de error de invitaciones usa color de éxito azul. Correcciones pendientes hasta finalizar regresión actual sesión 58144, viva y en build. No se cambiaron roles ni se cancelaron/reenviaron invitaciones. CMS excluido y móvil F127 detenido; Brave/Guardar y auditoría integral pendientes.

### F197 — Usuarios recupera fallos de red
Regresión F195 sesión 58144 exit 0. UserRoleControl y StaffInvitationActions ahora capturan fallos de red, presentan alerta que pide consultar estado antes de reintentar; confirmación de rol se cierra ante resultado incierto, no hay reintento automático. Mensaje de invitación usa rojo en error y azul en éxito. Se conservan las confirmaciones existentes. TypeScript y ESLint PASS, 3 contratos Usuarios PASS (fuente, no uso de navegador). No se modificaron roles/estados ni se enviaron/cancelaron invitaciones. Local reiniciado sobre build F195; F197 posterior sin compilar. CMS excluido, móvil F127 detenido y Guardar pendiente; auditoría integral abierta.

### F198/F199 — Brave reconectado y Guardar bloqueado por controlador
Regresión F198 sesión 25746 exit 0: 564 TAP, 533 pass, 31 skipped, cero fail; contratos, TypeScript, ESLint y build PASS. Servidor actual sesión 9744 Ready. Brave Personal se reconectó al abrir aplicación y Jean confirmó conexión; controlador navegador ID4. Configuración Integraciones renderizada, consola error vacía, flechas derecha/izquierda cambian pestañas con roving tabindex; Tab enfoca Probar integración con outline visible y aria-busy=false. Integraciones muestran cinco servicios sin configurar; no se inventaron credenciales ni se ejecutaron pruebas externas. Clientes muestra 76 registros; se pulsó Exportar. Captura nativa Windows fue detenida por política porque no pudo determinar URL de Brave con confianza; se obedeció stop del turno. No se pulsó Guardar ni se certifica descarga. Móvil detenido F127, CMS excluido; auditoría integral abierta.

### F200 — Alternativa admitida de descarga autónoma
Jean exige pulsar Guardar y autonomía. Se probó API documentada de Brave: locator Exportar.downloadMedia(timeoutMs=20000) en Clientes autenticado, tab 375936176; timeout sin ruta devuelta. Inspección de Descargas encuentra únicamente clientes-2026-10-11.xlsx antiguo, ningún archivo nuevo. No se declara descarga completada ni clic Guardar. El control nativo tiene bloqueo de política por URL no verificable; no se eludió con otra tecnología. Tab de Clientes conservada como handoff para exportación pendiente. Otras pruebas del sistema pueden continuar por navegador; objetivo global activo, CMS excluido y móvil F127 detenido.

### F201 — Proveedor usado en Brave y centavos visibles
Brave tab375936177: se abrió proveedor QA activo desde Compras, se navegó a segunda página de recepciones (2 registros restantes de 7), consola sin errores. Pantalla muestra Sin fechas, 0 evaluadas/5 recibidas y rendimiento completo. Se encontraron 1 productos, título de sección bajo cabecera fija al navegar y listado monetario con redondeo (subtotal QA8.20 mostrado8). Corregidos singular, scroll-mt-24 en títulos y formato monetario con dos decimales. Texto de órdenes abiertas describe pendientes/fechas sin afirmar deuda. Prueba monetaria PASS. Cambios posteriores aún sin build ni verificación visual posterior; no se declara cerrado. Guardar sigue impedido por controlador, CMS excluido y móvil detenido F127.

### F202 — Revisión transversal de precisión monetaria
F201 regresión sesión 2720 actualmente viva, Next compiló código y sigue etapas de build. Reportes usa maximumFractionDigits0 en dinero de tablas (total/utilidad/ingresos), hallazgo de código pendiente de corrección y UI. AdminTanda2Workspaces también tiene helper de dinero con0 decimales; se requiere analizar consumidores activos antes de cambiarlo por exclusión de CMS. Proveedor en Brave actual medido en viewport1536x798 y scroll-margin0 en heading Recepciones del build servido, no se certifica1920x1080 ni corrección CSS hasta nuevo build. CMS excluido, móvil F127 detenido y Guardar pendiente.

F202 actualización: regresión sesión 2720 exit 0, servidor reiniciado sesión25878 Ready. Brave tras reload muestra 1 producto; heading Recepciones scroll-margin96px. Clic Anterior desde página2 retorna página1 de2 y título a95.6px, visible bajo cabecera; ajuste de ancla verificado. Formato de importe8.20 en tabla aún pendiente de comprobar en navegador. Reportes redondeado pendiente. No implica cierre global.

### F203 — Precisión monetaria en Reportes, Inicio y Dashboard
Brave fila OC-20261011-14C068 muestra S/8.20, ajuste de Compras verificado visualmente. Reportes abierto, pestañas Ventas/Inventario/Clientes y consola sin errores. Helpers de Reportes y plantilla financiera compartida redondeaban dinero a0decimales; ahora usan formatAdminMoney con dos decimales y N/D para datos ausentes/no finitos. Compras reutiliza el mismo formato. Se comprobó que CMS no invoca money y no se modificó su componente. Tres pruebas monetarias PASS, ESLint PASS; verificación visual de nuevos importes en Reportes/Inicio/Dashboard pendiente de build. No se declara cierre global; CMS excluido, móvil F127 detenido y Guardar pendiente.

### F204 — Reportes conserva otro formato de KPI
Revisión de filtros: parseDashboardFilters valida fecha civil por round-trip y Reportes deriva ese contrato. No se declara probado todo el filtro custom. Se encontró formato adicional en src/app/admin/reportes/page.tsx: formatMoney de tarjetas KPI aún usa maximumFractionDigits0, independiente del helper corregido F203. Pendiente migrar al formato compartido después del build vivo sesión96738. No se declara corregido Reportes en su totalidad ni se toma tests estrechos como certificación visual. CMS excluido, móvil F127 detenido y Guardar pendiente.

F204 actualización: regresión F203 sesión96738 exit0. Las tarjetas superiores de Reportes también migradas a formatAdminMoney; ESLint PASS y TypeScript dirigido completado. Falta compilar ajuste adicional, reiniciar local y revisar visualmente Inicio/Dashboard/Reportes. No se declara cierre integral.

### F205 — Verificación de Reportes y bloqueo nativo confirmado
Build F204 sesión3490 exit0 y git diff --check exit0 después de retirar línea vacía al final de Reportes. Local reiniciado sesión58099. Brave Reportes mostró tarjetas y detalle con centavos: ventas2649.00, período9807.00, ticket1401.00 y utilidad1006.62; consola sin errores. No se certifican todavía Inicio/Dashboard ni todas las pestañas mediante este resultado. Nuevo intento nativo de Guardar: ventana Brave329388 encontrada, pero get_window_state volvió a detener Computer Use por URL no verificable; se obedeció fin del turno. Ningún clic Guardar ni archivo nuevo confirmado.

### F206 — Precisión en tabla accesible del gráfico
AdminCharts tenía formato monetario por defecto de0decimales en descripción para lector y tabla accesible, aunque tooltip usaba2. Se reemplazó por formatAdminMoney compartido; ejes compactos conservados. Cinco pruebas de formato y geometría PASS, ESLint PASS. Falta build y comprobación renderizada de esta modificación; no se declara cerrado. CMS excluido, móvil detenido F127 y descarga nativa pendiente. Auditoría integral activa.
### F207 — F206 compilado y usado en Brave
Build sesión85655 exit0. Local reiniciado sesión24407 Ready174ms. Reportes tabla accesible real muestra actual y anterior con2decimales; pestañas Inventario y Clientes pulsadas, aria-selected de Inventario true, panel visible verificado: críticos4/agotados2/sin registro8/reservadas49/locales6; Clientes nuevos1/recurrentes4/activos54. Dashboard abierto por navegación: ventas9807.00/cobrado9785.00/ticket1401.00 y series accesibles2decimales; consola error vacía. Inicio abierto y captura revisada, contenido significativo y consola error vacía; Inicio vigente no contiene importes monetarios, no se atribuye comprobación de centavos inexistente. Capturas normales1536x798 con scroll conservado; no certifican1920x1080 ni todo el módulo. Hallazgo siguiente: filtro Familia de Reportes muestra nombres repetidos sin categoría (Otros/Motores/Filtros), fuente mapea row.name únicamente pese a disponer categoryId y catálogo de categorías. Corrección pendiente. CMS excluido, móvil detenido F127, Guardar pendiente y objetivo integral abierto.
### F208 — Familia identificada por categoría y filtro usado
Reportes ahora usa familyFilterOptions: cada opción conserva ID y agrega categoría. No se deduplican familias distintas; categoría ausente muestra su ID sin inventar nombre. Cuatro pruebas de opciones PASS, ESLint/TypeScript PASS y contrato de filtros PASS. Build sesión2097 exit0; local reiniciado48474 Ready174ms. Brave opciones reales Motores de Lavadoras/Licuadoras/Otros electrodomésticos diferenciadas. Se seleccionó Motores · Otros electrodomésticos y se pulsó Aplicar filtros avanzados: URL familyId=family-otros-electrodomesticos-motores, opción seleccionada conservada y resultados0 con consola sin errores. getByLabel exacto no resuelve selector cuyo texto del label concatena las opciones; acción realizada por selector name derivado de DOM. Captura del resultado vacío descubre eje monetario con etiquetas repetidas S/1/S/1/S/1/S/0/S/0 por redondeo de dominio0..1; siguiente corrección pendiente. También Productos más vendidos no ofrece mensaje vacío. No se certifica cierre global. CMS excluido, móvil detenido F127 y Guardar pendiente.
### F209 — Eje monetario y productos vacíos
Se corrigió formatSalesAxisValue: valores menores de1000 conservan hasta2decimales, por lo que dominio0..1 tiene etiquetas1/0.75/0.5/0.25/0 distintas; k/M continúan compactos. Valores no finitos/moneda ausente muestran N/D. Dos pruebas de etiquetas y tres de geometría PASS, ESLint/TypeScript PASS. Productos más vendidos diferencia falta de datos y ausencia de ventas filtradas mediante mensaje explícito. Build sesión76774 iniciada, todavía pendiente; no se certifica render corregido. CMS excluido, móvil detenido F127 y Guardar pendiente.
### F210 — Estado vacío comprobado en Brave
Build F209 sesión76774 exit0; servidor33633 Ready203ms. Brave Reportes mismo filtro Motores · Otros electrodomésticos: gráfico muestra S/1, S/0.75, S/0.5, S/0.25, S/0 distintos; Productos más vendidos muestra Sin productos con ventas en los filtros seleccionados. Captura1536x798 revisada sin superposición en ese estado, consola error vacía. git diff --check exit0. No se probaron todos los filtros/datos/roles ni se declara auditoría completa. CMS excluido, móvil F127 detenido y Guardar nativo pendiente.
### F211 — Aplicación masiva real de Precios en Brave
Búsqueda enviada con Enter SKU QA-AUD-20261006, alcance1. Actualización masiva Precio especial PEN12.29 y motivo QA. Revisar devolvió1válido/0bloqueados/1cambio. Modificar a13.29 deshabilitó Aplicar; devolver12.29 y revisar permitió aplicar. Durante solicitud checkbox/formulario bloqueados. Éxito1producto, selección limpia, historial54→55. Después se revisó y aplicó Archivar tipo para el especial QA; historial56, promociones activas0. Tabla muestra minorista original11.00 vigente. Historial real confirma creación —→12.29 y archivo12.29→12.29 con motivos F211, ambas operaciones por Jean. Consola error vacía. No se alteraron productos reales ni minorista QA, especial QA quedó archivado con traza. Tabla muestra especial archivado22.00 antiguo en vez del recién archivado12.29; candidato a mejora pendiente de contrastar resolvePricingStates y criterio de prioridad/fechas, no se afirma pérdida de persistencia. CMS excluido, móvil detenido F127 y Guardar pendiente. Auditoría integral abierta.
### F212 — Prioridad del precio histórico corregida
resolvePricingStates ordenaba todos los registros por validFrom al no haber vigente; podía mostrar un archivado antiguo programado para fecha lejana. Ahora conserva prioridad de vigente, luego registro ACTIVE/active, y finalmente histórico por updatedAt con fallback validFrom y desempate ID. Prueba reproduce archivado futuro antiguo versus archivado reciente, conserva vigente/programado y verifica entrada no mutada. Cinco pruebas de dominio/celda PASS, ESLint/TypeScript PASS. No se modificó DB en esta etapa. Suite test:all iniciada sesión pendiente en coldpower-tests-f212.log; build y comprobación de tabla QA en Brave pendientes. CMS excluido, móvil detenido F127 y Guardar pendiente.
### F213 — Regresión completa y precio histórico verificado
Suite test:all F212 sesión75746 exit0, log coldpower-tests-f212.log:575ejecuciones TAP/544pass/31skipped/0fail (incluye repeticiones de grupos; no certifica flujos UI omitidos). TypeScript, ESLint y build integrados PASS. Local reiniciado94991 Ready165ms. Brave tras reload tabla QA muestra especial12.29 Archivado y minorista11.00 Vigente; captura1536x798 y consola error vacía. Corrige representación histórica, sin nuevas mutaciones DB. Cobertura siguiente: mensaje de carga masiva sigue diciendo Revisando durante Aplicar y preflight no muestra moneda junto a importes; mejoras pendientes. Guardar nativo/exportaciones, roles y flujos restantes siguen pendientes; CMS excluido y móvil detenido F127. Objetivo integral abierto.
### F214 — Carga y moneda de revisión masiva
BulkPricingWorkspace sustituye busy boolean por pendingMode derivado: Revisando solo en preflight y Aplicando en apply; controles mantienen bloqueo. Revisión muestra currentAmount/currentCurrency y newAmount/newCurrency con formatAdminMoney, conservando — para inexistente y N/D para moneda inválida/ausente. Primera edición omitió import y busy derivado: TypeScript lo rechazó; build2969 detenido antes de reparar. Reparación aplicada, TypeScript/ESLint exit0; tres pruebas de formato/idempotency PASS. Build reparado sesión17860 en curso, coldpower-build-f214-repair.log. Falta verificar UI y nueva regresión final. CMS excluido, móvil F127 detenido y Guardar pendiente. Auditoría integral abierta.
### F215 — Revisión masiva con monedas y regla inválida usadas en Brave
Build reparado F214 sesión17860 exit0. Servidor97324 Ready219ms. Brave preflight QA minorista11.00→11.29 muestra ambos en PEN, Revisando durante petición y controles bloqueados; segunda revisión USD distingue S/11.00 de USD11.29. No se aplicó cambio minorista. Aplicando aún no observado en operación real posterior aF214. Descuentos: regla QA52c80b49... inactiva abierta, máximo10/aprobación5; cambiar aprobación15 y Guardar con motivo QA devolvió alerta La aprobación debe ser igual o inferior al máximo permitido. Modal cerrado, lista conserva10/5/Inactiva. No se activó ni modificó regla. Consola revisión masiva error vacía. Código editor omite fechas de vigencia al actualizar; servicio parseDates podría sustituirlas, candidato pendiente de verificar. CMS excluido, móvil F127 detenido, Guardar nativo pendiente y auditoría integral abierta.
### F216 — Editar descuento conserva vigencia omitida
Error confirmado en código: updateDiscountRule parseDates antes de cargar estado convertía undefined a null; editor omite fechas y podía borrar ambas. Ahora resuelve campos omitidos desde fila bloqueada FOR UPDATE, valida ventana resultante y conserva eliminación solo con null/valor vacío explícito. Integración Neon QA_DISCOUNT_WORKFLOW=1 PASS: regla479a9967-ff19-4772-aed2-43826d45ff68 futura, pausa concurrente una auditoría, edición concurrente12/6 sin fechas conserva2035→2036 y estado INACTIVE, fin anterior a inicio rechazado, null fin lo borra preservando inicio. Cleanup mantiene INACTIVE y trazabilidad. ESLint/TypeScript PASS; build iniciado en coldpower-build-f216.log, pendiente reinicio y UI. No se alteraron reglas reales. CMS excluido, móvil F127 detenido, Guardar nativo pendiente, objetivo integral abierto.
### F217 — Edición de regla QA desde Brave conserva fecha
Build F216 sesión35838 exit0, local reiniciado71447 Ready163ms. Antes DB regla479a9967... QA c1db3b55... INACTIVE, validFrom2035-01-01T05:00:00Z, validUntilnull, máximo12. Brave Descuentos abre esa regla y guarda máximo13/motivoF217; toast guardada y auditada, tarjeta13/6/Inactiva, consola error vacía. Inspección DB posterior confirma máximo13 y mismafecha2035-01-01T05:00:00Z/finnull/INACTIVE. QA autorizada, no reglas reales. Script inicial inline de consulta falló por quoting sin ejecutar DB; reemplazado por scriptTEMP readonly y resultado comprobado. No certifica todas las ventanas/activaciones/aprobaciones de descuento. CMS excluido, móvil F127 detenido, Guardar nativo pendiente y auditoría integral abierta.
### F218 — Filtro inválido de Compras usado y KPI recortado
Brave Compras con createdFrom=2026-02-30 y queryQA: alerta explícita de filtros restablecidos,22filas más cabecera, exportHref/api/admin/compras/export sin filtros inválidos, consola error vacía. Captura1536x798 encontró Gasto del período recortado PEN S/3,4... y títulos/notas truncados. KPI cambia distribución: título junto al icono puede envolver, importe usa ancho completo debajo y notas sin truncate. ESLint/TypeScript PASS; build iniciado coldpower-build-f218.log, falta revisión visual posterior. No se descargó export ni se alteró DB. CMS excluido, móvil F127 detenido, Guardar nativo pendiente y auditoría integral abierta.
### F219 — KPI de Compras verificado y borrador decimal real
Build F218 sesión63194 exit0; servidor58931 Ready176ms. Brave captura muestra gasto PEN S/3493.20 completo y títulos sin truncate; consola error vacía. Se creó borrador QA proveedorc5db... Piura, productoexclusivoqa-stock3e69..., qty2/costo4.10: OC-20261013-3ACC00 idpurchase-be9a5c1a-e1b6-4410-a301-6bc68ed05976, subtotal8.20 en tabla. No se emitió ni recibió stock. Cancelar requirió motivo; tras enviarlo pantalla confirmó OC cancelada pero tabla/detalle conservaron Borrador incluso observación posterior. Reload mostró Cancelada, confirma persistencia y fallo de actualización inmediata de UI. Siguiente corrección pendiente. Fecha códigoOC13oct frente a lista12oct (Lima) es candidato de zona horaria pendiente de evaluar. CMS excluido, móvil F127 detenido, Guardar nativo pendiente y auditoría integral abierta.
### F220 — Controles de OC confirman estado y esperan refresh
PurchaseActions ya llama router.refresh y API ya revalidatePath (fuente7oct, build posterior); no se atribuye causa a falta de esas llamadas. Se observó enF219 persistencia correcta pero vista anterior. Cambio cliente toma status de respuesta real, oculta controles tras CANCELLED/RECEIVED, bloqueo con useTransition durante refresh y guardia ref contra concurrencia; motivo bloqueado durante procesamiento. Componente keyed porID/estado para evitar mezcla entre órdenes. Intento inicial effect setState rechazado por ESLint, reemplazado por key y estado local sin effect. ESLint/TypeScript PASS. Falta build y reproducir emisión/cancelación QA para verificar lista/detalle; no se declara corregido toda la actualización visual. Build coldpower-build-f220.log iniciado. CMS excluido, móvil F127 detenido, Guardar nativo pendiente y auditoría integral abierta.
### F221 — F220 compilado; refresh sigue pendiente en uso real
Build74935 exit0; servidor13655 Ready241ms. Nueva OCQA-20261013-6954A8 idpurchase-f906a32f-0c54-45be-b624-734e67b4562a, proveedorQA/Piura/productoQA/qty1/costo0.29. Crear confirma guardado pero lista anterior hasta reload. Emisión real confirma OC emitida y estado local oculta emisión; router.refresh en transición queda pendiente, motivo cancelación bloqueado y tabla Borrador, sin errores consola. F220 no cierra fallo de actualización: bloqueo persistente reproducido, no se declara solución completa. Reload mostró Pendiente; cancelación con motivo QA y reload muestra Cancelada. No se recibió stock, QA cerrado con traza. Siguiente diagnosticar respuesta RSC pendiente y ajustar recuperación sin bloqueo indefinido. CódigoOC usaUTC por diseño mientras fecha presentada Lima; diferencia calendaria documentada, no prueba de corrupción. CMS excluido, móvilF127 detenido, Guardar nativo pendiente, objetivointegral abierto.
### F222 — Diagnóstico RSC y precargas de Compras
Pestaña dedicada375936186/capacidadCDP documentada Network.enable, observación metadatos sin headers/body/credenciales. Clic detalleQA devuelve200 text/x-component, al mismo tiempo docenas de precargas de órdenes/proveedores/solicitudes y variosERR_ABORTED incluyendo petición de detalle inicial; navegación a detalle acaba visible. Evidencia de exceso de precargas, no prueba definitiva de causa del refresh. AdminPurchasesModule desactiva prefetch en sus links conservando navegación explícita; reduce consultas costosas por opciones solo visibles. ESLint/TypeScript PASS, build iniciado coldpower-build-f222.log. Falta comparar red y repetir actualización QA, no se declara corregido refresh. No DB modificada. CMS excluido, móvilF127 detenido, Guardar nativo pendiente y objetivointegral abierto.
F222 precisión: TypeScript dirigido sesión90372 seguía vivo al registrar el primer texto; su PASS todavía no está confirmado. ESLint concluyó antes. Se conserva pendiente hasta exit code.

### F223 — Precargas del listado reducidas; navegación general pendiente
BuildF2229655exit0; servidor97264Ready630ms. CapturaCDP trasreload/clic detalle muestra reducción de solicitudes Compras, pero sidebar sigue precargando módulos generales; petición detalle200 luegoERR_ABORTED. No se demuestra causa definitiva ni refresh corregido. Se desactiva prefetch enLinksAdminShell para evitar consultar todos losmódulos por entrar auno, navegaciónexplícita intacta. ESLintPASS; TypeScript/build/regresiónposteriores pendientes. CDPNetworkdisabled alterminar, ninguna mutaciónDB. Primera salida metadatos incluyóURLsexternasClerk; salidas posteriores filtradaslocalhost/pathsinquery para evitar datos deautenticación. CMSnooperado, móvilF127detenido, Guardarpendiente, objetivo abierto.
### F224 — Precarga general eliminada y navegación explícita probada
Build75575exit0; servidor99070Ready222ms. Tres contratos navegación/admin/ComprasPASS. BraveCDP clicdetalleQAobservado produce una petición/admin/compras, respuesta200 yERR_ABORTED, URLdetalle cambia correctamente. No hay ráfaga deprecargas otrosmódulos/filas enesaacción. Captura despuésreloadsinrequestsno seusa como prueba principal. ERR_ABORTED puedeocurrir ennavegación que sícompleta; no seatribuye causaúnica refresh. Consolaerrorvacía, Networkdisabled. Falta observar actualizaciónpostmutación conprecargasdeshabilitadas. SinDBmutada. F222TypeScript90372exit0confirmado. CMSexcluido, móvilF127detenido, Guardarpendiente, auditoríaintegralabierta.
### F225 — Mutación confirma fallo RSC; recarga completa implementada
FixtureQA DRAFT creada servicio conclaveqa-auditoria-f225-refresh: purchase-b1af0825-afc4-4db3-bc38-8195a857d1cc OC20261013BACAA5 qty1/costo0.29, sinrecepción. BravecancelPATCH200 terminado, refreshRSC200 luegoERR_ABORTED, tablaBorrador/statusOCcancelada; bodyRSCno disponible. ReloadconfirmaCancelada, QA cerrada. Sinprecargas noresuelveincidencia. PurchaseActions y PurchasesOperations pasan arecargacompleta tras éxito demutación, conservandoURLy estadoDB; elimina transiciónindefinida. Se mantieneconfirmaciónstatus servidor/refguardia. Es recarga de página con sus formularios, noSPArefresh; falta probarresultado realdespuésbuild. ESLintPASS, TypeScriptdirigido ejecutado; buildcoldpower-build-f225.log iniciado. RequestActions aúnrouter.refresh pendiente evaluar. CMSexcluido,móvilF127detenido,Guardarnativo pendiente,objetivoabierto.
### F226 — Actualización de creación/emisión/cancelación comprobada
BuildF22516461exit0; servidor83683Ready215ms;7contratosComprasPASS. Brave crea borradorQA proveedorc5db/Piura/productoexclusivoqa-stock/qty1/costo0.31: OC20261013-6B1301 idpurchase-a28a9992-9372-4ac4-8d6e-5ea577190bcf aparece automáticamente enlista, sinreloadmanual. Abrir detalle porLink necesitó esperar navegación/hidratación; primerintentonoavanzó, verificadohref y segundo cliccompletó. Emitir reflejaPendiente y motivocancelaciónhabilitado automáticamente. Cancelar conmotivoF226 reflejaCancelada enlista/detalle,0botonescancelar, consolaerrorvacía ycaptura1536x798. Recarga completa traséxito resuelveflujoprobado; conservaURL/scrollnormalbrowser, reiniciaformularios. No se recibióstock(0recibido). No secertificanRecepciones/RequestActionsconestaprueba; RequestActions sigue refreshpendiente. CMSexcluido,móvilF127detenido,Guardarnativopendiente,objetivointegralabierto.
### F227 — Solicitudes actualizan y bloquean doble envío
PurchaseRequestActions mantenía router.refresh en transición/conversión, mismo mecanismo que falló enórdenes. Cambiado recarga completa al éxito y guardia ref común para impedir dos peticiones simultáneas; validacionesprevias conservadas. Lista solicitudes singular1línea/pluralvariaslíneas. Seiscomprobacionesdirigidas(costos,feedback,contratoUI)PASS y ESLint/TypeScriptPASS. Falta build y uso real de envío/aprobación/conversión QA enBrave, no se certifica por prueba demecanismo enórdenes. Buildcoldpower-build-f227.log iniciado. CMSexcluido,móvilF127detenido,Guardarnativo pendiente,objetivoabierto.
### F228 — Envío/aprobación/conversión usados en Brave
BuildF22718657exit0; servidor17131Ready204ms. FixtureDRAFTQAservicio conidempotencyqa-auditoria-f228-request: solicitud-a55dc576-5745-41bc-8f77-abf036ffaa2e SOL20261013-7E5C61,productoexclusivoqa-stock/Cusco/qty1. Brave Enviar aaprobación→Enrevisión, Aprobar→Aprobada; ambasactualizan automáticamente. Conversión proveedorQA/costo4.10→OC20261013-89DCC4 idpurchase-7910f9be-b378-4974-9a07-2bdc407270ae Pendiente/subtotal4.10, solicitudConvertida,0botonesConvertir. Se cancelaOCmotivoF228, lista/detalleCanceladaautomáticamente,0recibido y consolaerrorvacía/captura1536x798. Singular1líneaverificado. No se recibióinventario ni enviaronmensajesexternos. No certifica todosroles,rechazos,recepciones niarchivosexportados. CMSexcluido,móvilF127detenido,Guardarnativopendiente,objetivointegralabierto.
## F229 — Usuarios: selección explícita del rol, paginación y títulos
- Evidencia inicial en Brave: el formulario elegía Superadmin por defecto, las dos flechas enlazaban a la misma página cuando solo había una y «Invitaciones pendientes» aparecía recortado en escritorio.
- Corrección: el rol inicia vacío con «Selecciona un rol»; el envío valida que se eligió un rol permitido antes de llamar a la API y vuelve a vacío tras un envío correcto. No se enviaron invitaciones ni se cambiaron permisos.
- La paginación usa elementos inactivos sin enlace en los límites y señala la página actual. Los títulos de indicadores permiten salto de línea.
- Cinco contratos de Usuarios aprobados. Build y comprobación visual de esta versión pendientes al registrar esta entrada.
- Descarga nativa: nuevo intento de lectura de Brave rechazado por el controlador porque no pudo verificar su URL. No se pulsó Guardar ni se certificó una descarga nueva.
- CMS excluido por orden de Jean. QA móvil permanece detenido en F127 y solo se retomará cuando Jean lo indique.
## F230 — Usuarios: página fuera de rango
- Reproducción en Brave con page=999: tabla vacía y resumen «Mostrando 0 a 22 de 22 usuarios». La consulta usaba el desplazamiento de la página solicitada antes de ajustarla al total.
- getUserPage ahora cuenta, ajusta la página y después consulta sus filas. La vista recibe la página y tamaño efectivos del backend.
- Verificación directa de solo lectura contra la base de pruebas: 22 usuarios; page=999 devuelve página 1 y 22 filas; pageSize=5 devuelve página 5 de 5 y 2 filas; búsqueda sin coincidencias devuelve página 1 y 0 filas. Sin mutaciones.
- Seis contratos de Usuarios aprobados. Regresión completa en curso; comprobación final en Brave pendiente.
- F229: build finalizado correctamente y servidor reconstruido. En Brave se comprobó rol «Selecciona un rol», rechazo local del envío sin rol, flechas sin enlace y aria-current en página 1. No se enviaron invitaciones ni se modificaron roles. Consola sin errores; advertencia de Clerk por claves de desarrollo.
### Cierre de comprobaciones F229/F230
- Regresión integral sesión73993 exit0: 578 ejecuciones TAP, 547 aprobadas, 31 omitidas, 0 fallidas; contratos, TypeScript, ESLint y build correctos. Algunos grupos repiten casos.
- Servidor reconstruido sesión48195, Ready261ms, localhost:3000.
- Brave con page=999: la tabla vuelve a mostrar registros y el pie indica «Mostrando 1 a 22 de 22 usuarios». Ambas flechas quedan inactivas y el rol inicial es «Selecciona un rol». Captura del escritorio confirma «Invitaciones pendientes» completo, en dos líneas.
- Sin envío de invitaciones, cambios de roles o escrituras a usuarios. La auditoría completa continúa pendiente; CMS excluido y móvil detenido en F127.
## F231 — Usuarios: filtros efectivos, fechas y mensajes de carga
- Reproducción en Brave con status=UNKNOWN: lista de 22 usuarios sin filtros, enlace de exportación conserva status=UNKNOWN y aviso incorrecto «Clerk no respondió».
- Corrección: resolver único de filtros para la lista y la exportación; filtros inválidos se restablecen con aviso específico, se eliminan page/pageSize/userId del alcance exportado. Se valida el rol y que las cuatro fechas de filtro existan realmente en el calendario (incluidos años bisiestos).
- Los errores de base y de invitaciones se presentan separados. Un fallo de carga indica N/D en sus métricas, evita mostrar una ausencia falsa de invitaciones y oculta el resumen paginado si no se pudo consultar la base. «Roles en la matriz» describe la matriz resumida de cinco roles.
- Doce pruebas dirigidas aprobadas (cinco CP044 y siete contratos CP028). Build y revisión final de esta versión en Brave pendientes al registrar esta entrada.
- No se modificaron usuarios ni invitaciones. CMS excluido; QA móvil permanece detenido en F127. Guardar nativo sigue pendiente por bloqueo del controlador.
### F231 — Verificación en Brave
- Build sesión31977 exit0; ESLint sesión30398 exit0; servidor81466 Ready295ms.
- status=UNKNOWN muestra aviso de filtros restablecidos y exportación /api/admin/usuarios/export; desaparece el aviso falso de Clerk. Tabla con 22 usuarios.
- Filtro Ventas aplicado mediante selector y botón Aplicar: 3 usuarios, todos de Ventas, exportación conserva role=VENTAS. Sin mutaciones.

## F232 — Usuarios: selector estable de roles
- El selector se construía con los roles de las filas de la página actual. Tras filtrar Ventas perdía los demás roles y podía perderlos también en páginas sin resultados.
- Ahora usa el catálogo completo de roles soportados, con sus etiquetas, independiente de las filas visibles. No cambia permisos ni asignaciones.
- La búsqueda anuncia nombre, correo o teléfono, que son campos consultados; el rol se filtra en su selector dedicado.
- Ocho contratos CP028 aprobados. Build y comprobación visual en curso. La regresión integral más reciente sigue siendo F230; F231/F232 son posteriores.
### F232 — Cierre de comprobaciones
- Build sesión63404 exit0, ESLint sin errores, servidor78630 Ready240ms.
- Render directo: errores de base muestran cuatro métricas N/D y no un resumen de cero registros; fallo de Clerk muestra invitaciones no disponibles; ausencia real muestra los estados vacíos correspondientes. Comprobación aprobada, sin mutaciones.
- Brave: tras filtrar Ventas siguen disponibles 12 opciones (Todos más 11 roles, incluido Administrador legacy). Filtro Compras con búsqueda sin coincidencias conserva las 12 opciones y muestra 0 a 0 de 0; exportación conserva query y role=COMPRAS. Al restablecer campos vuelven los 22 usuarios y exportación sin filtros. Consola sin errores.
- Trece pruebas dirigidas aprobadas (cinco CP044 y ocho CP028), además de render y build. Última regresión integral F230; hay cambios F231/F232 posteriores y aún se requiere la regresión integral final.
- No se enviaron invitaciones, modificaron permisos ni descargaron archivos nuevos. La auditoría general continúa. CMS excluido y móvil detenido en F127.
## F233 — Auditoría: búsqueda del actor, IP y correlación
- Reproducción en Brave: el actor Jean aparece en las filas, pero buscar Jean mediante el campo y Aplicar produce cero resultados. El placeholder anuncia actor, IP y correlación; el backend solo consultaba el ID del actor y no los otros campos.
- Corrección: búsqueda parametrizada por nombre/correo del actor mediante EXISTS (sin duplicar eventos por un join), correlationId y requestId, e IP/correlación almacenadas en metadata. Se conservan los campos ya consultados y la presentación que redacta datos según permisos.
- Cinco pruebas CP043 aprobadas y ESLint sin errores.
- Verificación de solo lectura contra la base: búsqueda Jean encuentra 1.954 eventos; correlación de un registro existente encuentra ocho eventos; IP de un registro existente encuentra 215. Los valores privados no se imprimieron; no se crearon ni alteraron eventos.
- Build y comprobación final en Brave pendientes al registrar esta entrada. No se declara completa Auditoría: quedan detalle/pestañas, paginación, filtros guardados, exportación y casos de error por verificar.
- CMS excluido y móvil detenido en F127. Descarga nativa Guardar pendiente por bloqueo del controlador.
### F233 — Cierre de comprobaciones
- Build sesión40885 exit0; servidor87884 Ready237ms. Cinco pruebas dirigidas y ESLint correctos.
- Brave: la misma búsqueda Jean devuelve 1.954 eventos en lugar de cero. Se abrió el primer evento visible de la fixture anual de Productos, se usaron Información, Cambios y Relacionado, se abrió otro evento relacionado y se cerró el detalle. Las pestañas conservan query=Jean y el ID seleccionado; Cambios presenta fixture y month, Relacionado presenta cinco enlaces. Sin errores de consola.
- Las fechas futuras mostradas pertenecen a la fixture de historia anual ya existente; no se alteraron ni generaron en esta comprobación. No se operó CMS.
- Pendientes específicos de Auditoría: paginación fuera de rango y límites, errores de filtros/lista/exportación, filtros guardados y descarga real. El backend ajusta el número de página después de consultar el desplazamiento: requiere reproducir y corregir, igual que se hizo con Usuarios.
- Regresión integral final pendiente tras F231/F232/F233. Guardar, resto de módulos/estados/roles y commit/push siguen pendientes.
## F234 — Auditoría: paginación fuera de rango y límites
- Brave con query=Jean&page=999: tabla vacía aunque el registro indica 1.954 resultados y la flecha siguiente enlaza a página 79.
- Corrección: el backend cuenta y ajusta la página antes de consultar las filas; navegación con aria-label, página actual marcada con aria-current y elementos sin enlace/aria-disabled en los extremos.
- Seis contratos CP043 aprobados y ESLint sin errores. Build y comprobación final en Brave en curso. No se modificaron eventos de auditoría.
- CMS excluido y móvil detenido en F127. Guardar nativo y cierre general siguen pendientes.
### F234 — Cierre de comprobaciones
- Build sesión61230 exit0, ESLint sin errores, servidor28116 Ready242ms.
- Base de pruebas, solo lectura: query=Jean&page=999 devuelve página79 de79 y4 eventos; búsqueda sin coincidencias devuelve página1 y0 filas.
- Brave: page=999 muestra los4 eventos y Siguiente inactivo. Una pestaña recuperada de página78 avanzó mediante Siguiente a página79,4 filas; primera página muestra25 filas y Anterior inactivo. Página actual marcada correctamente.
- Guardar filtro QA: el diálogo prompt abrió, aceptar el nombre dio timeout y la pestaña quedó sin responder a captura. Comprobación de solo lectura: cero filtros llamados «QA AUDITORÍA — Jean F234». No se reintentó el envío ni se declaró éxito. Se recuperó otra pestaña para continuar la paginación. Este guardado sigue pendiente de corrección/verificación; no equivale al Guardar nativo de descargas.
- Regresión integral final pendiente tras F231-F234. CMS excluido; móvil detenido en F127. Quedan filtros guardados, exportaciones y restantes estados/roles de los módulos, revisión final del diff y commit/push.
## F235 — Auditoría: formulario de guardado de filtros
- Se sustituye window.prompt de Guardar filtro por un formulario visible dentro del panel, con nombre requerido (máximo80), Cancelar, Escape, foco al abrir y retorno al botón al cerrar.
- Mensajes de éxito/errores de API y conexión; conserva el nombre ante error y aconseja comprobar la lista antes de reintentar cuando el resultado es incierto. Guardia por referencia contra envíos simultáneos y controles desactivados durante el envío.
- Siete pruebas CP043 y ESLint aprobados. Build y uso real de guardar/aplicar en Brave pendientes al registrar esta entrada. Eliminar filtros todavía usa confirmación nativa y necesita revisión.
- No se cambia el flujo Guardar nativo de descargas, que permanece bloqueado por el controlador. CMS excluido; móvil detenido en F127.
### F235 — Cierre de comprobaciones
- Build sesión66123 exit0; servidor19002 Ready234ms. Siete pruebas CP043 y ESLint correctos.
- Brave: abrió el formulario, guardó «QA AUDITORÍA — Jean F235», mostró mensaje de éxito y apareció en Más filtros sin recarga manual. Se limpió la búsqueda y se aplicó el filtro guardado: URL query=Jean, campo Jean y1.954 resultados.
- Escape cierra el formulario. Guardar un nombre QA sin criterios presenta «Los criterios del filtro no son válidos», conserva el nombre y permite Cancelar; no se certifica creación para ese caso.
- Base, solo lectura: existe exactamente un filtro «QA AUDITORÍA — Jean F235» con {query:Jean}. Se conserva para trazabilidad y prueba posterior; no se alteraron registros de auditoría.
- Esta corrección resuelve Guardar filtro dentro de Auditoría. Guardar nativo de descargas sigue pendiente por el bloqueo del controlador.
- Pendientes: eliminación/errores de filtros guardados, estados de carga y filtros inválidos en Auditoría, exportaciones reales, restantes flujos/roles y revisión integral/commit/push. CMS excluido y móvil detenido en F127.
## F236 — Auditoría: filtros inválidos y datos no disponibles
- Reproducción en Brave: dateFrom=2026-02-30 produce aviso de fallo de conexión, tabla vacía y enlace de exportación con la misma fecha inválida.
- Resolver único: filtros inválidos se restablecen con aviso específico y lista/exportación sin filtros; base de navegación elimina eventId/tab/page, normaliza q a query y conserva pageSize solo para navegar. El detalle conserva su selección aparte.
- Fallos de consulta: indicadores N/D, comparación no disponible, sin sparklines ni gráfico de cero ficticio, registro/resultados no disponibles y aviso específico para alertas. Se modifica el encabezado para describir la consulta del historial sin prometer garantizar seguridad.
- Nueve pruebas CP043 y ESLint aprobados. Build y comprobación del filtro inválido en Brave pendientes al registrar esta entrada. No se simularon fallos reales de Neon.
- CMS excluido y móvil detenido en F127. Guardar nativo de descargas y cierre general siguen pendientes.
### F236 — Cierre de comprobaciones
- Build sesión67264 exit0, ESLint correcto, servidor76941 Ready239ms.
- Brave con la misma fecha imposible: aviso específico de filtros restablecidos, 25 eventos visibles en la primera página y exportación /api/admin/auditoria/export sin fecha inválida. Captura de escritorio confirma aviso y contenido recuperado.
- Los estados de fallo de consulta se comprobaron por contratos/código y build; no se provocó una caída de Neon. Nueve pruebas CP043 aprobadas. No se modificaron datos.
- Regresión integral final pendiente después de F231-F236. Quedan eliminación y fallos de filtros guardados, estados de detalle/relacionados, exportación real y restantes comprobaciones de todos los módulos. CMS excluido; QA móvil detenido en F127.
## F237 — Auditoría: detalle inexistente y consultas auxiliares
- Reproducción en Brave con eventId=qa-f237-no-existe: el panel indicaba Selecciona un evento y no informaba que el ID solicitado no existe.
- Se separan detalle inexistente de fallo de consulta, con aviso y enlace Volver al registro que conserva filtros. Fallos de eventos relacionados muestran N/D y aviso, y fallos de filtros guardados muestran indisponibilidad en vez de ausencia falsa.
- Primera implementación: diez pruebas aprobadas, pero ESLint rechazó una asignación dentro de la promesa. Se detuvo el build y se corrigió para devolver resultados/error inmutables por consulta. ESLint posterior aprobado; pruebas/build final y comprobación en Brave en curso.
- No se alteraron datos. CMS excluido y móvil detenido en F127; Guardar nativo y cierre general pendientes.
### F237 — Cierre de comprobaciones
- Diez pruebas CP043 aprobadas tras corregir ESLint; build final sesión43469 exit0; servidor54098 Ready299ms.
- Render directo con contexto de navegación: evento inexistente muestra aviso y Volver al registro, sin Selecciona un evento; fallo de carga muestra seis métricas N/D; fallo de relacionados muestra aviso y (N/D), sin Sin eventos relacionados. Sin consultas ni mutaciones.
- Brave: el mismo ID inexistente muestra «El evento solicitado no existe» y enlace /admin/auditoria. Se pulsó Volver al registro y desapareció el aviso. Captura de escritorio revisada.
- Errores de consultas auxiliares: código/contratos/render comprobados, sin provocar caída real de Neon. No se modificaron datos ni permisos.
- Regresión integral final pendiente tras F231-F237. Eliminación de filtros guardados, exportaciones reales y restantes flujos/roles de los módulos continúan pendientes. CMS excluido; móvil detenido en F127.
## F238 — Regresión integral y revisión de código
- Se verificó que el servidor previo no conservaba sesión ni listener en3000; se inició la regresión sin duplicar servidor.
- Regresión completa sesión12160 exit0:588 ejecuciones TAP,557 aprobadas,31 omitidas,0 fallidas, contratos adicionales, TypeScript, ESLint y build correctos. Algunos grupos repiten casos; no son588 pruebas únicas.
- Git fetch origin main correcto: HEAD y origin/main en00c85c0,0commits de diferencia.170 archivos modificados y133 nuevos pendientes; no se hizo commit/push.
- Se aplica skill requesting-code-review con revisiones de solo lectura separadas para backend comercial, infraestructura/inventario y frontend. Sin nuevas ediciones mientras corrieron suite/revisión.
- Infraestructura/inventario: revisión final sin nuevos defectos confirmados. Hallazgo preliminar sobre segunda apertura con saldo cero retirado tras leer el guard existente bajo bloqueo; no se cambió código por ese reporte.
- Backend comercial señaló para validar replay de updatePrice sin validFrom y promociones apilables con segundo paso de base cero. Frontend y revisión comercial siguen en curso. No se declara listo para publicar antes de cerrar hallazgos importantes.
- Regresión verde no sustituye pendientes de QA manual, roles reales y descargas. CMS excluido; móvil detenido en F127; Guardar nativo pendiente.
## F239 — Correcciones tras revisión de código
- Revisión comercial confirmó dos defectos: replay de updatePrice con fecha de inicio omitida y paso de promoción con base cero. Frontend confirmó pérdida de filtros al abrir recepción de Compras.
- Hallazgo de Reportes retirado por su revisor: el guard existente oculta resúmenes ante error. Se revirtió el cambio de number() y se añadió prueba SSR que demuestra el guard. Hallazgo de segunda apertura de inventario también retirado; no se modificó ese código.
- Precios: el replay reutiliza la fecha efectiva original en ISO con milisegundos. Primera prueba detectó pérdida de milisegundos al convertir Date a texto; corregido y repetido. QA_PRICING_WORKFLOW real aprobado, conserva historial en replay y rechaza otra fecha explícita. Los precios sintéticos quedan archivados por limpieza existente, minorista QA se conserva.
- Promociones: acepta base cero y sigue rechazando negativas/no finitas; QA_PROMOTION_REPLAY real pasa cadena11→0→0 y repetición dentro de una transacción revertida. Campaña temporal inactiva no persistida; dos pruebas de integración aprobadas.
- Compras: enlace de recepción conserva queryString y sustituye purchaseId/receiptId. Prueba de proveedor, fecha, moneda, búsqueda y página aprobada. Seis pruebas de navegación/render aprobadas y ESLint correcto.
- Revisores revalidan correcciones de solo lectura. Regresión integral F239 en curso; verificación de navegación de recepción en Brave pendiente. No se hizo commit/push todavía.
- CMS excluido, móvil detenido en F127. Exportaciones reales/Guardar nativo y resto de cobertura manual continúan pendientes.
### F239 — Cierre técnico de esta revisión
- Regresión completa sesión98341 exit0:590 ejecuciones TAP,559 aprobadas,31 omitidas,0 fallidas; contratos, TypeScript, ESLint y build correctos. Grupos repetidos no equivalen a590 casos únicos. Integraciones QA de precios y promociones ejecutadas aparte y aprobadas.
- Revisores confirmaron cierre de los tres defectos reales. Dos reportes preliminares retirados con evidencia (inventario protegido y Reportes con guard de error). No hay hallazgos confirmados pendientes en el alcance de revisión estática.
- Servidor51531 Ready234ms. La conexión de Brave se reinició: se recuperó el mismo perfil Personal/extensionInstanceId, ahora browser3.
- Brave: OC-20261009-217D4B y REC-20261009-525A31 conservan status=RECEIVED, proveedorQA y createdFrom=2026-10-01; recepción Registrada,SKUQA y1unidad. Exportación conserva los filtros. Primer clic no cambió la selección; se inspeccionó el enlace y el siguiente clic completó la navegación. Consola sin errores. Sin recepción nueva ni cambio de inventario.
- Se prepara commit/push a main de los cambios revisados conforme a autorización de Jean. No se declara QA completo: permanecen las exportaciones reales/Guardar nativo, roles reales y acciones/estados restantes, cobertura visual integral y cron/configuración externa que requieren evidencia adicional. CMS excluido y móvil detenido en F127 hasta nueva orden.
## Publicación de los cambios revisados — 13 octubre 2026
- Código y auditoría publicados en main mediante commit65a0a7c (303archivos;8.906inserciones y1.267eliminaciones). Push origin main confirmado, sin force; HEAD y origin/main sincronizados, workspace limpio después del push.
- Regresión integral F239:559aprobadas,31omitidas,0fallidas; TypeScript, ESLint, contratos y build correctos. Integraciones adicionales de precios/promociones QA aprobadas y hallazgos estáticos revalidados. Corrección final posterior al build únicamente elimina una línea vacía al final de purchases-navigation; lógica intacta.
- Servidor local51531 levantado, Ready234ms. Commit/push previamente solicitados por Jean cumplidos para este conjunto.
- La publicación no declara finalizada la auditoría operativa. Guardar nativo/archivos descargados abiertos, roles reales y acciones/estados restantes, cobertura visual de escritorio y condiciones externas pendientes siguen en la matriz. CMS excluido; móvil detenido en F127 y retomable solo por orden de Jean.
## F240 — Cotizaciones: presentación y nueva revisión QA
- Brave buscó COT-2026-C87EED, ligada a OP-20261010-81F33B y cliente/producto QA. Borrador original:1unidad,11PEN, vigencia16/10/2026. Versiones sin snapshot indicaba que se generan al registrar envío.
- Se registró presentación interna simulada con canal Presencial y nota explícita QA F240 sin envío/contacto externo. sendQuote solo registra versión/estado/actividad en esta ruta; no envía correo automáticamente. Estado pasó a Enviada y Versiones mostró v1/11PEN.
- Nueva versión volvió a Borrador para revisar propuesta. Hallazgo visual: encabezado seguía v1 y PDF sin número, aunque el PDF es el snapshot anterior y la próxima revisión será v2.
- Corrección: encabezado «Borrador de v2», PDF numerado según última versión registrada y texto aclaratorio de que el borrador todavía no tiene PDF. Primer borrador se presenta como Borrador de v1; sin snapshot en otros estados no se inventa una versión.
- Dos pruebas de etiquetas y ESLint aprobados; build y comprobación visual en curso. Registro QA retenido en borrador para continuar edición/reenvío; no hay venta, pago ni movimiento de stock nuevo.
- CMS excluido y móvil detenido en F127. Guardar nativo y demás cobertura manual pendientes; main publicado hasta276c04d, cambios F240 todavía locales.
### F240 — Ampliación de versiones y etiquetas
- Build inicial28375 exit0; servidor30123 Ready196ms. Brave confirmó «Borrador de v2», PDF v1 y aclaración de que el borrador no tiene PDF.
- Segunda presentación interna simulada QA: estado Enviada, versión v2, PDF v2 y dos snapshots de11PEN. v1 anterior se conservó. Sin envío/contacto externo, venta, pago o movimiento de inventario.
- Hallazgos visuales adicionales comprobados: SUPERSEDED sin traducción y «1 productos»/«1 líneas». Corrección: Reemplazada y singular de producto/línea. Tres pruebas y ESLint pasaron; build intermedio98271 exit0.
- Revisión de ruta PDF: prioriza acceptedVersionId sobre la última versión registrada. Etiqueta ahora usa la misma prioridad, con prueba para aceptada anterior/última/ausencia de versión. No cambió la generación ni se certificó descarga real.
- Regresión integral F240 sesión41706 en curso con los cambios finales; verificación visual final y commit/push de F240 pendientes. Main remoto hasta276c04d.
### F240 — Cierre de validación
- Regresión integral sesión41706 exit0:593 ejecuciones TAP,562aprobadas,31omitidas,0fallidas; contratos, TypeScript, ESLint y build correctos. Grupos repetidos no son casos únicos.
- Servidor41327 Ready229ms. Brave: v2 Enviada, PDF v2; v1 Reemplazada; ambas1producto y11PEN. Singular de líneas corregido. Se abrió la oportunidad enlazada: OP-20261010-81F33B en Cotización enviada; vínculo de regreso conserva quote-6721e246-9f72-4cbd-b6b4-9d1135270400. Consola sin errores.
- Observación pendiente: Pipeline sigue indicando Aging/Sin contacto y Contacto más reciente/Sin fecha pese a actividad de presentación registrada; se investigará el contrato de contacto antes de afirmar un defecto o actualizar fechas. No se hizo contacto externo.
- QA conservada en Enviada con versión actual2 para continuar respuesta/aceptación y flujo comercial. No se generó venta ni movió stock. PDF real/descarga no certificados.
- Revisión estática final del pequeño cambio UI en curso antes de publicar. CMS excluido y móvil detenido en F127. Resto de cobertura permanece abierto.
## F241 — Coherencia de contacto y bloqueo de Guardar
- Publicación F240 confirmada: commit 8b77882 en main y origin/main; árbol limpio al iniciar esta revisión. Regresión F240: 562 aprobadas, 31 omitidas, 0 fallidas.
- Nuevo intento de Computer Use: Brave encontrado como ventana 327748. get_window_state detuvo el control porque no pudo verificar la URL con suficiente confianza. No se pulsó Guardar y no se certificó ninguna descarga. No se usaron mecanismos alternativos para eludir el bloqueo.
- Hallazgo confirmado por contrato: crm-validation define CALL, WHATSAPP, EMAIL y MEETING como contacto. createActivity actualiza customers.lastActivityAt y opportunities.lastContactAt para esos tipos. sendQuote inserta los mismos tipos directamente, pero no actualiza ninguna de esas fechas; syncOpportunityStage solo actualiza etapa y updatedAt. Pipeline presenta lastContactAt y puede mostrar Sin contacto después de registrar una presentación.
- Corrección y regresión del hallazgo de contacto pendientes. No se modificaron fechas históricas ni se atribuyó contacto externo a la presentación QA simulada.
- Auditoría del sistema sigue abierta. CMS excluido. QA móvil detenida en F127 hasta orden de Jean. Guardar nativo y cobertura manual restante pendientes.
### F241 — Corrección de contacto aplicada
- Nuevo helper recordCrmContact compartido por createActivity y sendQuote, dentro de sus transacciones. Actualiza contacto de cliente y oportunidad con greatest en SQL, evitando retroceder por actividades anteriores y conservando atomicidad.
- Integración real autorizada en Neon aprobada: cliente/oportunidad QA, fechas inicialmente nulas, contacto reciente y luego anterior, ambas conservan la fecha reciente con milisegundos. Transacción revertida deliberadamente; sin modificación persistente de fixtures.
- Tres pruebas de contrato aprobadas. TypeScript inicial aprobado. ESLint/TypeScript finales, regresión integral y verificación del flujo en Brave pendientes de cierre; no se declara corrección desplegada todavía.
- Sin reconstrucción histórica de contactos. CMS excluido y móvil detenido en F127. Guardar nativo continúa pendiente.
### F241 — Regresión y revisión independiente
- Regresión integral sesión 98950 verificada activa: pruebas TAP suman 595 ejecuciones, 563 aprobadas, 32 omitidas, 0 fallidas; algunas agrupaciones repiten casos. La integración nueva se ejecutó por separado con QA_CRM_CONTACT=1 y pasó; el runner normal la omite deliberadamente.
- TypeScript y ESLint terminaron correctamente en la regresión. Next build compiló y sigue en su etapa de TypeScript; no se declara build final aprobado hasta salida terminal.
- Revisor independiente aprobó el parche de forma limitada sin defectos accionables. Confirma semántica SQL para NULL/contacto anterior y atomicidad. La prueba no ejecuta dos transacciones concurrentes ni sendQuote completo; verificación real en Brave pendiente después del build.
- Servidor local anterior detenido de forma controlada para reconstruir. No reiniciar mientras sesión 98950 siga activa. Código no publicado todavía.
### F241 — Cierre de validación de contacto
- Regresión integral sesión 98950 exit 0: 595 ejecuciones TAP, 563 aprobadas, 32 omitidas, 0 fallidas; contratos, TypeScript, ESLint y Next build correctos. Integración real QA de contacto aprobada aparte. Servidor 88551 Ready 221 ms.
- Brave creó revisión v3 de COT-2026-C87EED y registró presentación Presencial simulada con nota QA F241 explícita sin envío/contacto externo. Estado Enviada, PDF v3, total 11 PEN; no venta/pago/movimiento de stock.
- Desde la cotización se abrió OP-20261010-81F33B: Aging 0 días y Contacto más reciente 13 oct. 2026, 1:22 p. m. Captura visual inspeccionada; consola sin errores. Hallazgo de contacto resuelto para nuevos registros; no reconstrucción histórica.
- Revisor independiente sin defectos accionables. Publicación de esta corrección autorizada por Jean. Sigue pendiente la cobertura integral del sistema, las descargas reales y Guardar nativo. CMS excluido y móvil detenido en F127.
- Observación visual adicional para seguimiento: Ruta de una cotización muestra «1 registros» cuando el conteo es uno. No impide operar; corrección pendiente.
## F242 — Respuesta y conversión comercial QA
- Main publicado hasta ebdb376, árbol limpio al iniciar. Local 88551 con build F241 validado.
- Brave abrió respuesta de COT-2026-C87EED v3. Rechazada sin motivo fue detenida por validación HTML: required=true, valueMissing=true, valid=false; no se registró rechazo.
- Aceptación Presencial simulada con nota QA F242 sin contacto/compromiso externo: estado Aceptada, snapshot aceptado quote-version-a437805e-1112-42fc-baa4-5d45b355a6d9, PDF v3 y total 11 PEN. Habilitó Convertir en venta.
- Conversión: local por defecto Almacén Lima, recojo, snapshot correcto 1 unidad/11 PEN. Confirmar venta devolvió INVENTORY_UNKNOWN porque QA-AUD-20261006 no tiene saldo cuantitativo en Lima; controles se rehabilitaron y formulario conserva datos.
- Lectura directa de Neon confirma cotización ACCEPTED v3, 0 ventas y 0 pedidos para opportunity-24c1067f-7837-42ae-bd29-06e0518335b5. La comprobación de saldo en servicio antecede altas/reservas dentro de la transacción. Sin conversión parcial.
- Pendiente completar conversión en local con saldo QA verificado y continuar pedido/pago/operaciones. No inventar stock para superar la validación. Captura del error inspeccionada. Mejora visual pendiente: quitar código técnico INVENTORY_UNKNOWN de mensaje visible conservando motivo; «1 registros» ya registrado en F241.
- CMS excluido. Móvil detenido en F127 hasta orden de Jean. Guardar nativo y demás cobertura abierta.
## F243 — Conversión con stock confirmado y trazabilidad
- Lectura Neon previa: producto QA-AUD-20261006 en Chiclayo físico 1/reservado 0; Cusco físico 7/reservado 1. No se inventó saldo. Brave cambió el local de Lima a Chiclayo y confirmó la conversión.
- Resultado persistido: cotización CONVERTED v3, una venta y un pedido ligados a la oportunidad QA. Venta sale-d39c638d-c21c-47af-a664-ff7505f9f799 (VTA-21091B84-E), pedido order-2c326391-365e-466f-ad47-ce0a31211d3d (ORD-20261013-B49BD2), pago payment-2823dc57-1376-4936-aef7-28b57e3bd00d pendiente.
- Reserva reservation-37058137-f53c-4a8a-bc88-856ad1ee52e5 activa por una unidad en Chiclayo. Saldo posterior físico 1/reservado 1; Cusco sigue 7/1. Reserva QA retenida para continuar flujo y liberar o restaurar al cierre de la prueba.
- Brave usó vínculos Cotización → Venta → Pedido. Venta Confirmada, 11 PEN, subtotal 11, descuento 0, saldo 11; snapshot SKU QA, una unidad a 11. Pedido pendiente de pago, recojo Chiclayo; preparación solicitado 1/preparado 0 y reserva activa visible. No permite preparar desde esta pestaña antes de pagar.
- Pedido muestra advertencia de IGV sin configurar; no se inventó porcentaje tributario. Cobro real no realizado, entrega no ejecutada. Pendiente pago de prueba, preparación/entrega y cierre/restauración QA.
- Observación visual adicional: reserva muestra «1 unidades»; corregir singular junto con «1 registros». CMS excluido, móvil detenido en F127, Guardar nativo pendiente.
## F244 — Cobro y preparación QA
- Brave confirmó cobro manual simulado de 11 PEN, Efectivo, referencia QA-F244-SIMULADO-11PEN y motivo explícito sin dinero real. Nuevo pago payment-bf775356-52ae-4eec-ab82-a56011bbdc0b Confirmado/Conciliado; provisional payment-2823dc57-1376-4936-aef7-28b57e3bd00d Cancelado/Conciliado. Pendientes de esta orden: 0.
- Pedido ORD-20261013-B49BD2 pasó a Por preparar y Cobro Conciliado; iniciar preparación funcionó y mostró En preparación. Cancelación requiere gestionar reembolso antes, conforme a cobro confirmado.
- Pestaña Preparación: +1 preparado actualizó solicitado 1/preparado 1, botón quedó deshabilitado al completar cantidad. Saldo QA Chiclayo sigue físico 1/reservado 1; Cusco 7/1 intacto.
- Listo para recojo habilitado tras completar preparación; acción enviada, comprobación final de estado pendiente en esta entrada. No entrega ni consumo de reserva todavía. Continuar entrega simulada y cierre/restauración QA; pago y reserva de prueba permanecen trazables.
- UX observada: tras confirmar manual, el detalle sigue mostrando el pago provisional Cancelado en vez del nuevo Confirmado; tabla sí muestra ambos correctamente. Evaluar mejora de navegación, no confundir con fallo del cobro.
- CMS excluido, móvil detenido F127, Guardar nativo pendiente. No cambios al porcentaje tributario ni pagos externos.
- F244 comprobación final Brave: pedido Listo para recojo, Cobro Conciliado, receptor opcional y Confirmar entrega habilitado. Entrega aún no ejecutada.

## F245 — Entrega simulada y restauración de stock QA
- Brave confirmó entrega de ORD-20261013-B49BD2 con receptor «QA AUDITORÍA F245 — entrega simulada, sin retiro físico». Estado Entregado, cobro Conciliado. Saldo Neon Chiclayo pasó físico 1/reservado 1 a 0/0; Cusco sigue 7/1.
- Restauración por UI Inventario → Ajustar inventario: Chiclayo, SKU QA-AUD-20261006, Ajuste de entrada, cantidad 1, motivo explícito QA F245 y notas vinculadas al pedido/saldo previo. Confirmar movimiento cerró diálogo; motivo visible en Kardex.
- Lectura Neon posterior confirma stock restaurado a Chiclayo físico 1/reservado 0; Cusco 7/1 intacto. No duplicar ajuste. Entrega consumida y ajuste compensatorio conservan trazabilidad; no retiro físico ni dinero real.
- Flujo QA cubierto en Brave: versión enviada → aceptación → conversión → pago manual conciliado → preparación de una unidad → listo para recojo → entrega. Registros retenidos: venta sale-d39c638d-c21c-47af-a664-ff7505f9f799, pedido order-2c326391-365e-466f-ad47-ce0a31211d3d, pago confirmado payment-bf775356-52ae-4eec-ab82-a56011bbdc0b. No se declara completa la auditoría de todos los módulos ni la variante delivery/shipping.
- Mejora visual pendiente: pestaña Entrega de recojo ya entregado sigue diciendo «Aún no hay una guía registrada» y explica picking; debería mostrar evidencia de recojo/entrega según método y estado. Restauración también mostró «1 unidades», ampliar corrección de singular.
- CMS excluido; móvil detenido F127 hasta orden de Jean. Guardar nativo y demás cobertura pendiente. Servidor local permanece levantado.
## F246 — Textos visuales de flujo comercial e inventario
- Corrección local de singular: conteos de bandeja/ruta de Cotizaciones usan registro/registros; reserva en Pedidos usa unidad/unidades; vista previa de ajuste de Inventario usa unidad/unidades.
- Entrega sin guía distingue PICKUP: si DELIVERED indica recojo completado y remite al historial; si pendiente explica pago/preparación necesarios. Otros métodos conservan mensaje de guía.
- TypeScript y ESLint dirigidos aprobados. Validación visual con nuevo build, revisión y publicación pendientes. No cambió lógica de cobro, entrega ni saldo.
- Stock QA ya restaurado según F245, no repetir movimiento. CMS excluido y móvil detenido F127. Auditoría integral y Guardar nativo siguen abiertos.
### F246 — Build y corrección tras revisión
- Build inicial sesión 8642 exit 0. Revisor detectó que mensaje PICKUP pendiente afirmaba pago obligatorio aunque el servicio admite recorrido desde RECEIVED; también aplicaba mensaje de preparación a CANCELLED.
- Corrección: entregado indica completado/historial; cancelado indica sin recojo pendiente; READY_FOR_PICKUP indica listo y registrar recepción; demás indica completar preparación/resolver bloqueantes. Eliminada condición de pago no garantizada.
- ESLint y TypeScript posteriores sesión 28355 exit 0. Build final sesión 53328 iniciado con código corregido; no modificar fuentes ni levantar servidor hasta resultado terminal. Revalidación del revisor y visual en Brave pendientes. No publicado todavía.
### F246 — Validación final y publicación
- Build final sesión 53328 exit 0, servidor 70217 Ready 223 ms. Revisor revalidó P2 corregido y no encontró defectos adicionales.
- Brave en pedido entregado ORD-20261013-B49BD2: Entrega muestra «Recojo completado en el local. Consulta el historial para ver el registro de entrega»; Preparación muestra reserva Consumida y «1 unidad». Cotizaciones muestra Enviadas «1 registro» y mantiene plural para 2/6/9/11.
- TypeScript, ESLint y tres contratos dirigidos aprobados; no nueva regresión integral en este cambio de textos (última integral F241). Vista previa de ajuste modificada, aún sin comprobación visual específica posterior al build; ramas cancelado/listo de nuevo mensaje solo revisadas estáticamente.
- Se publica corrección de textos y evidencia F242–F246 conforme a autorización. Auditoría operativa integral sigue abierta; CMS excluido, móvil detenido F127 y Guardar nativo pendiente.
## F247 — Navegación tras confirmar pago manual
- Hallazgo F244 confirmado en código: API manual devuelve result.payment, pero ManualPaymentControl descartaba ese ID y PaymentsControlCenter recargaba el provisional. Tras cobro total este queda Cancelado, confundiendo el resultado visible.
- Corrección local: callback recibe ID del pago devuelto; drawer selecciona el confirmado y refresca bandeja. Si falta ID o coincide conserva recarga del detalle. No cambia registro financiero ni idempotencia del backend.
- TypeScript y ESLint dirigidos sesión 81681 exit 0. CP040 18 pruebas y dos contratos de panel (3 pruebas) aprobados; contrato actualizado para nueva navegación. Build, prueba real en Brave, revisión y publicación pendientes. No se hizo otro cobro QA en esta fase.
- CMS excluido, móvil detenido F127, Guardar nativo y cobertura restante pendientes. Stock restaurado F245 no debe ajustarse de nuevo.
### F247 — Revisión y regresión en curso
- Revisor independiente aprobó de forma limitada: cambiar detailId y key carga pago nuevo; refresco conserva estado. Sin defectos accionables; contrato no prueba navegación real.
- Regresión integral sesión 36234 verificada activa: TAP suma 595 ejecuciones, 563 aprobadas, 32 omitidas, 0 fallidas; TypeScript finalizado y ESLint en curso. Build aún no iniciado en el último log. No editar fuentes durante ejecución.
- Lectura Neon para cliente QA principal encontró 0 pedidos PAYMENT_PENDING con pagos PENDING. No reutilizar pedido entregado/pagado para confirmar otro cobro. Validación real requerirá fixture QA nuevo, saldo verificado y cierre compensatorio.
- Servidor 70217 detenido de forma controlada para reconstruir; levantar al finalizar regresión. Cambios F247 locales aún sin publicación. CMS excluido, móvil detenido F127 y Guardar nativo pendiente.
## F248 — Validación real de navegación de pago
- Regresión integral F247 sesión 36234 exit 0: 595 ejecuciones TAP, 563 aprobadas, 32 omitidas, 0 fallidas; contratos, TypeScript, ESLint y build correctos. Local sesión 11644 Ready 211 ms.
- Fixture de venta directa por servicio con actor QA autorizado, clave qa-f248-manual-navigation-20261013, cliente/producto QA y saldo Chiclayo verificado 1/0. Pedido order-8752425b-c322-4cb2-8928-08e218eafc64, ORD-20261013-006CEC; venta sale-10117c55-3f9a-4a83-a2a0-04913c9d8f1e. Provisional payment-85f31d4b-3a10-4efd-97ab-a5f581e05120.
- Brave tab nuevo 375936322 (paymentCheck248), mismo browser3. Confirmó pago manual simulado 11 PEN Efectivo, referencia QA-F248-NAVEGACION-SIMULADA, motivo explícito sin dinero real. Drawer cambió automáticamente a PAGO-1A8F0DBB Confirmado y referencia correcta; flujo principal de corrección comprobado.
- Hallazgo restante: URL conserva paymentId del provisional, así que recarga puede perder selección del confirmado. Corregir enlace/URL antes de publicar. No declarar navegación persistente completa.
- QA nueva retenida pagada pendiente de reembolso/cancelación compensatoria. Stock Chiclayo físico 1/reservado 1, Cusco 7/1. No repetir creación ni cobro; cerrar desde pago confirmado y liberar reserva por cancelación del pedido. No entrega adicional.
- Cambios F247 aún locales. CMS excluido, móvil detenido F127 y Guardar nativo pendiente.
## F249 — Persistencia de selección y cierre QA
- Corrección local adicional de F247: al recibir pago confirmado cambia paymentId en URL usando replaceState y conserva filtros, estado de navegación y hash. TypeScript/ESLint dirigidos pasaron antes del ajuste final de conservación state/hash; rebuild y verificación de recarga pendientes.
- Brave reembolsó íntegramente cobro simulado F248; pago payment-91f875ca-ad61-4565-b30c-22101a8f0dbb mostró Reembolsado. Pedido PAID no mostró Cancelar pedido en resumen; se usó Ver venta → motivo QA F249 → Cancelar venta.
- Venta sale-10117c55-3f9a-4a83-a2a0-04913c9d8f1e mostró Cancelada. Saldo Neon Chiclayo volvió a físico 1/reservado 0; Cusco sigue 7/1. No repetir reembolso ni restauración. Registros preservados para trazabilidad, sin dinero real.
- Observación para evaluar: pedido reembolsado en estado PAID solo habilita Iniciar preparación y obliga ir a venta para cancelar; no se afirma defecto de backend sin revisar transición.
- Cambio de URL todavía local, no publicado. Servidor11644 sirve build anterior a esta corrección adicional. CMS excluido, móvil detenido F127, Guardar nativo y cobertura integral abiertos.
## F250 — Validación del estado de navegación Next
- TypeScript, ESLint y CP040 18 pruebas sesión4279 exit0. Build12641 iniciado pero detenido con Ctrl-C después de detectar problema real en revisión; no se declara build aprobado.
- Evidencia local Next app-router.js:268–278: data.__NA evita applyUrlFromHistoryPushReplace. Pasar window.history.state a replaceState conserva URL interna antigua y refresh puede revertir el ID.
- Corrección posterior a detener build: replaceState(null,...) permite al parche Next copiar el estado interno y sincronizar URL. Conserva construcción de filtros/hash. Rebuild, revalidación y prueba real de recarga todavía pendientes. Servidor detenido.
- Caso QA F248 ya reembolsado y venta cancelada según F249; stock Chiclayo1/0 restaurado, no repetir restauración. CMS excluido, móvil detenido F127, Guardar nativo pendiente.
### F250 — Revalidación de URL y build en curso
- Revisor revalidó replaceState(null,...) contra el parche local Next: sincroniza URL y copia estado interno; filtros/hash conservados, sin defectos adicionales.
- Build sesión51608 verificada activa: compilación9.5s aprobada, etapa TypeScript en curso. No nuevo servidor ni mutaciones QA mientras se reconstruye.
- Script fixture F251 preparado en TEMP con clave propia para prueba de URL/recarga; aún no ejecutado ni creado otro pedido. F248 permanece cerrado/reembolsado, saldo QA restaurado.
- F247–F250 aún locales sin publicar. Próximo paso esperar salida terminal51608, levantar local y probar confirmación con URL nueva y recarga, luego cerrar QA y publicar.
## F251 — Cierre de navegación persistente de pago
- Build final51608 exit0, servidor28104 Ready202ms. Revisor aprobó replaceState(null) y sincronización Next. Última integral F247 563 aprobadas/32 omitidas/0 fallidas; CP040 dirigido18 aprobadas y TypeScript/ESLint finales correctos antes build.
- Fixture QA nuevo por servicio: pedido order-656f8bb9-8f3d-48dc-a5aa-a9aa34e5ca21 (ORD-20261013-74BD35), venta sale-0e965445-a762-403c-945b-f03c2ed2f047. Confirmación en Brave cambió automáticamente provisional payment-27ae012d-f0de-4603-932f-0b4b43eca8b0 a payment-b49706a6-25a6-4889-9e23-7740a631b8bf, Confirmado, referencia QA-F251-URL-SIMULADA.
- URL cambió al ID nuevo conservando orderId. Recarga real de Brave mantuvo mismo pago Confirmado y referencia correcta. Corrección de navegación y persistencia comprobada; no mock de respuesta ni dinero real.
- Cierre QA en Brave: devolución total mostró Reembolsado; cancelar venta con motivo QA mostró Cancelada. Neon confirma Chiclayo físico1/reservado0, Cusco7/1. No repetir restauración ni reembolso. Historial preservado.
- Publicación autorizada de F247–F251 y auditoría. Observación pendiente aparte: enlace Gestionar cobros de algunas ventas puede seleccionar provisional al mostrar historial reembolsado; revisar criterio de selección sin confundir con corrección del formulario manual.
- Auditoría integral sigue abierta. CMS excluido, móvil detenidoF127, Guardar nativo pendiente.
## F252 — Cobros desde Ventas
- Hallazgo confirmado: detalle de Venta usa payments[0] para Gestionar cobros, mientras consulta ordena solo por fecha de pedido, sin orden de pagos del mismo pedido. Puede abrir provisional Cancelado en vez del cobro confirmado/reembolsado.
- Corrección local: Gestionar cobros navega a /admin/pagos?saleId=venta para mostrar todos los cobros y sus estados. El repositorio de pagos aplica saleId; enlaces individuales de pestaña Cobros conservan ID específico.
- TypeScript y ESLint sesión14281 exit0. Diecisiete contratos existentes aprobados y nuevo contrato de alcance de venta añadido/aprobado. Rebuild y navegación real en Brave pendientes; no publicado todavía.
- No se crearon pagos ni reservas nuevas. Casos F248/F251 cerrados y saldos QA restaurados. CMS excluido, móvil detenido F127 y Guardar nativo pendiente.
### F252 — Revisión y consulta persistida
- Revisor aprobó enlace a pagos por saleId, permisos payments.view y conservación del alcance en filtros/exportación; sin defectos accionables.
- Consulta real getPaymentsPage filtrada por venta QA F251 devolvió exactamente dos items: pago REFUNDED y provisional CANCELLED. Primer script temporal usó propiedad rows inexistente y falló; corregido a items según contrato, lectura posterior aprobada. No defecto del sistema ni mutación de datos.
- Build sesión29153 verificada activa, compilación9.5s correcta y TypeScript en curso. Servidor28104 detenido controladamente. Esperar salida terminal, levantar local y probar enlace en Brave antes publicar.
- Main hasta49d59e6, cambios F252 locales. CMS excluido, móvil detenidoF127, Guardar nativo pendiente.
### F252 — Cierre visual y publicación
- Build29153 exit0, servidor77227 Ready235ms. Brave abrió Venta QA F251 y usó Gestionar cobros: URL /admin/pagos?saleId=sale-0e965445-a762-403c-945b-f03c2ed2f047; tabla muestra exactamente el pago Reembolsado y provisional Cancelado del mismo pedido ORD-20261013-74BD35.
- Sin nuevo cobro, reserva ni cambio de saldo. Revisión y pruebas dirigidas aprobadas. Se publica corrección de enlace y auditoría conforme a autorización de Jean.
- Auditoría integral abierta. CMS excluido, móvil detenidoF127, Guardar nativo y demás cobertura pendientes.
## F253 — Eliminar filtros guardados de Auditoría
- Hallazgo confirmado: SavedFiltersMenu dependía de window.confirm; fetch DELETE sin catch ni error visible, HTTP fallido ignorado. El usuario podía no saber si la eliminación ocurrió.
- Corrección local: confirmación visible identifica filtro y aclara que registros de auditoría se conservan; Cancelar y Confirmar eliminación; errores API/red visibles, bloqueo inmediato por ref y controles deshabilitados durante envío. Sin reintento automático ante resultado incierto.
- TypeScript y ESLint sesión7998 exit0. CP043 11 pruebas aprobadas, incluida nueva guardia estructural. Build, revisión y comprobación en Brave pendientes; no se eliminó ningún filtro durante esta fase. CMS excluido, móvil detenidoF127, Guardar nativo pendiente.
### F253 — Revisión de confirmación y build en curso
- Revisor sin defectos bloqueantes: confirma guard de duplicados, errores HTTP/red preservan confirmación, éxito limpia y refresca. Señaló mejora de accesibilidad: foco en Cancelar y Escape para cerrar; pendiente después del build.
- Build97368 verificada activa: compilación9.9s aprobada, TypeScript en curso. No editar fuentes mientras sigue activo. Servidor77227 detenido de forma controlada.
- Comprobación Brave pendiente: apertura y Cancelar sin borrar filtro QA existente. No se ha confirmado eliminación real. CMS excluido, móvil detenidoF127 y Guardar nativo pendiente.
- F253 build inicial97368 exit0. Después se añadió autoFocus en Cancelar y Escape para cerrar únicamente sin envío pendiente. ESLint/TypeScript finales sesión16876 verificados; nuevo build y prueba de teclado en Brave todavía pendientes. Local sigue detenido durante esta reconstrucción.

### F253 — Regresión integral y revisión de propietario
- Revisor revalidó foco Cancelar/Escape sin envío activo y no encontró defectos adicionales. Lectura backend confirma DELETE exige propietario e ID; no elimina auditLogs.
- Regresión sesión25789 verificada activa: 597 ejecuciones TAP,565 aprobadas,32 omitidas,0 fallidas (agrupaciones repiten casos). TypeScript terminó; ESLint en curso antes del build. No declarar resultado integral aprobado hasta salida terminal.
- No fuentes modificadas durante regresión. Local sigue detenido; levantar solo al terminar. Verificación Brave de abrir/cancelar/Escape pendiente, sin borrado real ejecutado.
- Main hastaa4b5e3a; corrección F253 local. Auditoría integral abierta, CMS excluido, móvil detenidoF127 y Guardar nativo pendiente.
- F253 continuación: sesión25789 sigue activa; pruebas, TypeScript y ESLint correctos; Next compiló10s y sigue validando tipos. Resumen vigente de cobertura actualizado hastaF253/maina4b5e3a para eliminar cabecera obsoleta. No reiniciar build ni levantar servidor antes de salida terminal.

### F253 — Cierre de validación de confirmación
- Regresión25789 exit0:597 ejecuciones TAP,565 aprobadas,32 omitidas,0 fallidas; contratos,TypeScript,ESLint y build correctos. Local63450 Ready236ms.
- Brave tab375936331 auditCheck253: Más filtros → Eliminar filtro QA AUDITORÍA — Jean F235 abre confirmación visible e identifica nombre. document.activeElement confirma foco Cancelar. Escape cerró región; segunda apertura y Cancelar también cerró; link QA permanece exactamente1. Consola sin errores.
- No DELETE real ejecutado ni errores de red provocados; esas ramas están implementadas/revisadas estáticamente, no afirmar prueba manual completa de eliminación. No se borraron eventos de auditoría.
- Se publica mejora de confirmación/errores/teclado y evidencia conforme a autorización. Auditoría integral sigue abierta, CMS excluido,móvil detenidoF127,Guardar nativo pendiente.
## F254 — Bandeja de Notificaciones usada en Brave
- Browser3,tab375936333 notificationsCheck254. Búsqueda ORD-20261013-74BD35 devuelve2 avisos QA (pedido y pago). Detalle automático de pago conserva origen payment-b49706a6-25a6-4889-9e23-7740a631b8bf.
- Marcar como leída actualizó lista y detalle; restaurar como no leída confirmó ambos en estado original. Filtro Pago aprobado junto con búsqueda devuelve exactamente1 aviso y conserva query/type al detalle. No envío manual, activación de reglas ni cambios de preferencias.
- Hallazgos visuales comprobados: «1 resultados» y trazabilidad «1 registros». Corrección local singular resultado/registro en NotificationsList y AdminNotificationDetail. ESLint/TypeScript sesión85157 verificados; build y comprobación visual posterior pendientes. No publicado aún.
- Automatizaciones, programaciones y preferencias requieren cobertura restante; no se enviaron mensajes a otros usuarios. CMS excluido,móvil detenidoF127,Guardar nativo pendiente.
### F254 — Pruebas dirigidas y revisión
- CP046 cuatro pruebas y contratos UI dos pruebas aprobados. Revisor confirma conteos numéricos y singular solo para1, sin cambios de filtros/datos/navegación.
- Build42277 verificada activa: compilación9.5s correcta, TypeScript en curso. Servidor63450 detenido. No modificar fuentes ni iniciar otro build; esperar salida terminal y levantar local.
- Prueba visual posterior a build pendiente para «1 resultado» y «1 registro». Estado de lectura QA restaurado a No leída según F254; no repetir mutaciones ni enviar avisos.
- Corrección local aún no publicada. CMS excluido,móvil detenidoF127,Guardar nativo pendiente.
- F254 cierre: build42277 exit0, local35818 Ready214ms. Brave recarga filtro QA y muestra1resultado/1registro; consola sin errores. Pruebas dirigidas y revisión aprobadas. Se publica corrección de textos; auditoría integral continúa abierta.

## F255 — Estados vacíos y filtros inválidos de Notificaciones
- Brave browser3/tab375936335 notificationErrors255. Búsqueda QA-F255-SIN-RESULTADOS-8CCB mostró0resultados, aviso «No hay notificaciones para este alcance», Mostrando0de0 y detalle sin selección.
- Rango Desde20/10/2026/Hasta01/10/2026 mostró «Corrige los filtros» y alerta explícita Desde anterior/igual a Hasta. No se presentó como ausencia real. Campos input type=date requieren valores ISO en controlador; primer intento DD/MM falló en herramienta, corregido sin defecto del sistema.
- Limpiar recuperó50resultados, búsqueda vacía/tipos por defecto y consola sin errores. Sin mutaciones de lectura, preferencias, reglas ni envíos en esta fase.
- No nuevos defectos confirmados en estas rutas. Queda cobertura de acciones/programaciones/preferencias y visual integral. CMS excluido,móvil detenidoF127,Guardar nativo pendiente. Main87f77d7,local35818.
## F256 — Configuración empresarial y faltantes reales
- Brave browser3/tab375936337 configurationCheck256 recorrió Empresa,Locales,Series y documentos,Precios e IGV,Integraciones,Historial,Branding y Legal. Solo lectura: no guardar/restaurar/publicar ni probar servicios externos.
- Datos visibles: Empresa0/6,6locales activos,0series activas,IGV sin configurar,0/5integraciones. API externa,SMTP,pasarela,SUNAT yWhatsApp señalan variables necesarias ausentes. No inventar datos empresariales/tributarios/credenciales para aparentar completitud.
- Historial cargó versiones2/3 y diff de logoMediaId; branding sin assets asociados y legal sin enlaces. Son faltantes de configuración que requieren datos aprobados y conexiones reales, no errores automáticamente del software.
- Defecto visual confirmado: tipos de local STORE/WAREHOUSE sin traducción. Corrección local muestra Tienda,Almacén,Tienda y almacén para enum conocido y fallback Tipo no clasificado. TypeScript/ESLint sesión12793 verificados; pruebas/build/validación visual pendientes antes publicar.
- Sin tocar CMS; Legal/Branding de Configuración solo inspeccionados. Móvil detenidoF127,Guardar nativo y cobertura integral pendientes.
### F256 — Pruebas, revisión y datos faltantes
- Ocho pruebas dirigidas CP045/restauración aprobadas. Revisor confirma etiquetas de los tres valores del enum y fallback, sin cambio de persistencia/reglas.
- Build95751 verificada activa: compilación9.7s correcta,TypeScript en curso. Servidor35818 detenido. No editar fuente mientras está activo; prueba Brave/publicación pendientes.
- Se solicitó información faltante a Jean: razón social,RUC,dirección fiscal,correo de ventas,series y modalidad deIGV aprobadas o documento de referencia. Respuesta pendiente; no completar datos reales por suposición. El resto de auditoría continúa independiente.
- CMS excluido,móvil detenidoF127,Guardar nativo pendiente. Main87f77d7,correcciónF256 local.
- F256 cierrevisual: build95751 exit0,local84046 Ready224ms. Brave recargó Configuración y Locales muestra5Tiendas/1Almacén en español. No se cambiaron datos. Se publica corrección; datos empresariales aprobados siguen pendientes de Jean.

## F257 — Taxonomía: árbol, familia y cancelación
- Brave browser3/tab375936339 taxonomyCheck257. Datos visibles27categorías activas,171familias,61marcas,745productos sin marca y1332en revisión. Refrigeración seleccionada y45familias visibles; Capacitores118productos,1publicado,115en revisión, padre Refrigeración.
- Se usó selección de familia y Ver relación editorial. Este último solo muestra mensaje «Mover familia se ejecuta desde la ficha con validación de categoría padre»; no abre relación. Revisar coherencia entre acción y resultado, aún sin corrección.
- Desactivar abrió diálogo de impacto con nombre/cantidad; Cancelar cerró sin modificar familia. No se confirmó desactivación de catálogo real. Búsqueda inexistente mostró «No hay coincidencias en la taxonomía actual» y conservó selección previa.
- Defecto visual confirmado:1productos en aviso y confirmación de desactivación. Cobertura de marcas del panel usa marcas globales (Alfa,Bosch,etc. y60), no se verifica relación específica con familia seleccionada; revisar alcance antes de corregir.
- Sin mutaciones de catálogo. Auditoría integral abierta,CMS excluido,móvil detenidoF127,Guardar nativo pendiente. Configuración real pendiente de respuesta de Jean.
## F258 — Relación editorial real y singular de impacto
- Contrato inspeccionado: TaxonomyItem conserva categoryId/categoryName y árboles de categorías/familias. Acción anterior Ver relación editorial solo generaba instrucción genérica; reemplazada por AdminDrawer de relación con nombre,padre o familias vinculadas,estado y conteo asociado. Permite seleccionar padre/hija sin mutación.
- Aviso y confirmación de desactivación muestran singular «producto publicado relacionado» cuando conteo1. Primer apply_patch de inserción falló por línea compacta, luego inserción por marcador exacto; no parche incompleto declarado final.
- TypeScript/ESLint sesión17863 verificados. Tests/revisión/build y Brave pendientes antes publicar. Cobertura de marcas global bajo nodo sigue pendiente de corregir con relaciones reales; no se cambió a un texto que aparente cobertura específica.
- Sin modificación de taxonomía persistida. CMS excluido,móvil detenidoF127,Guardar nativo pendiente y datos empresariales esperando respuesta de Jean.

## F259 — Cobertura de marcas por nodo
- Hallazgo: el detalle mostraba tres marcas globales ajenas al nodo seleccionado.
- Corrección local: agrupación de todos los productos por nodo y marca efectivos, respetando prioridad editorial; todas las marcas relacionadas visibles con sus cantidades.
- TypeScript, ESLint, dos contratos dirigidos y revisión independiente aprobados.
- Build en curso (sesión 85613); comprobación manual en Brave y publicación pendientes. Sin cambios de datos. CMS excluido y móvil detenido en F127.

- Cierre F258/F259: builds 85613 y 40472 aprobados. Cinco contratos dirigidos aprobados. Brave verificó Refrigeración (35 marcas), Capacitores (9 marcas), navegación padre/hija y panel editorial. Singular de marcas corregido y comprobado. Sin errores de consola; advertencias de Clerk por claves de desarrollo. QA sin mutaciones de catálogo.

## F260 — Clientes: alta, desactivación y previsualización de fusión
- Brave: alta de «QA AUDITORÍA F260 — estado recuperable», correo qa.f260.estado@example.test, tras revisión de duplicados. Identificador customer-59514bd5-ab40-4110-8de1-450866489aef. Sin documentos, contactos, pedidos ni oportunidades.
- Ficha 360° abrió correctamente. Desactivación con motivo persistió INACTIVE; historial conservado. Este registro QA permanece inactivo para verificar la recuperación al corregirla.
- Hallazgo confirmado: no hay acción Reactivar; edición no incluye estado y API de estado solo acepta INACTIVE. Pendiente implementar recuperación con motivo, permiso customers.manage y prohibición para clientes fusionados.
- Previsualización de fusión QA AUDITORÍA 2026-10-06 ← QA Contacto ColdPower aprobada: una oportunidad y una actividad, demás contadores cero. Cancelada, sin ejecutar fusión.
- Otros hallazgos visuales/de alcance: «1 resultados» y «1 clientes»; tarjetas de métricas llevan enlaces que eliminan la búsqueda actual, aunque sus cifras pertenecen al alcance filtrado. Pendiente corregir y verificar.
- Búsqueda F260 devolvió solo el cliente QA inactivo; consola sin errores. No se enviaron mensajes ni cambiaron clientes reales. CMS excluido; móvil detenido en F127.

## F261 — Datos empresariales proporcionados y alcance de métricas de Clientes
- Jean proporcionó RUC 20604067422, dirección JIRON PARURO 1280, TIENDA 111 e IGV 18%. Pendientes razón social, series y modalidad de inclusión del IGV. Correo de ventas pendiente; solicitado momento del recordatorio. No guardados todavía para evitar una configuración parcial sin modalidad aprobada.
- Corrección local de Clientes: enlaces de métricas conservan filtros y reinician página; singular de resultados y paginación. Validación pendiente. Recuperación de clientes F260 sigue pendiente.

- Aclaración de Jean: precios incluyen IGV 18%; correo de ventas sigue pendiente. 20604067422 es RUC, no nombre legal; razón social aún sin confirmar.
- Revisión F261 detectó conflicto de filtros status INACTIVE / opportunity NONE frente a tarjetas ACTIVE / OPEN; ajuste local impide navegación cuando contradicen el alcance. Build 72064 descartado; nueva validación pendiente.

### F261 — Corrección de tarjetas incompatibles
- Revisión adicional mostró que aria-disabled sobre Link no impedía abrir otra pestaña. Tarjetas incompatibles ahora son contenedores div sin href; enlaces habilitados conservan alcance.
- TypeScript, ESLint y siete contratos dirigidos aprobados. Revisión final sin defectos adicionales. Build 43291 cancelado antes del ajuste; nuevo build 11048 en curso. Verificación Brave y publicación pendientes.

- Cierre F261: build11048 exit0, servidor31830 activo. Brave verificó 1 resultado/1 cliente, tarjeta Clientes activos sin enlace bajo status INACTIVE y clic Por atender preserva búsqueda F260 y estado; consola sin errores. Se publica corrección. F260 recuperación pendiente y QA continúa inactivo.


## F262 — Recuperación de clientes inactivos
- Implementación local: acción Reactivar muestra destino Activo y solicita motivo. API exige customers.manage; transacción bloquea cliente, rechaza fusionados y prospectos, permite INACTIVE→ACTIVE e idempotencia ACTIVE. Cambio y auditoría se guardan juntos.
- CustomerListItem expone canonicalCustomerId ya enviado por el repositorio para ocultar acción en fusionados.
- TypeScript, ESLint, siete contratos existentes y dos pruebas nuevas de guardas aprobados; revisión estática sin defectos. Build29091 en curso. Prueba real UI del cliente QA F260 y publicación pendientes.
- Ninguna reactivación persistida todavía; QA F260 sigue INACTIVE. CMS excluido, móvil F127 detenido.

- Cierre F262: build29091 exit0; servidor56420 activo. Brave ejecutó reactivación QA con motivo obligatorio, el cliente salió del alcance INACTIVE y persistió ACTIVE tras recarga. Consola sin errores.
- Lectura de DB confirmó audit-2474b3df-88c4-4bcf-a836-4df8793fc52e, customer.status_changed, INACTIVE→ACTIVE y motivo F262. Registro QA retenido activo para trazabilidad. No clientes reales modificados.
- Dos pruebas de guardas incorporadas al runner general; runner comprobado sintácticamente. Se publica corrección y evidencia. No equivale a cierre de auditoría integral.
