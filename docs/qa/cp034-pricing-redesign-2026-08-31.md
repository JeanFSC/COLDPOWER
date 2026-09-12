# CP-034 — QA de rediseño de Precios

Fecha: 2026-08-31  
Ruta: `/admin/precios`  
Referencia: `C:\Users\jean_\.codex\attachments\22f89b90-7c79-4c75-9031-ad6023fb25af\image-1.png`  
Referencia visual generada con ImageGen: `C:\Users\jean_\.codex\generated_images\01a05962-ce42-7840-b13c-e736ef9a99e6\exec-7da9236a-4652-4f6a-88ca-c3ddcc3c81a5.png`

## Resumen

Se implementó el workspace de precios con cuatro KPIs canónicos, barra de filtros refinables, chips de filtros activos, tabla server-side, rail operativo, drawer responsive de detalle, editor sin `window.prompt()`, búsqueda remota de productos, historial, estados de carga/error y exportación del alcance completo. La semántica de precio minorista vigente, precio especial, cantidad mayorista y umbral de aprobación quedó centralizada.

La verificación visual e interactiva se realizó en el Brave externo del usuario, con sesiones activas en `localhost:3000` y `dev.coldpower.pe`. Se comprobó el estado inicial, el panel de filtros, el flujo de importación, la pestaña de actualización masiva, el responsive móvil y la consola; no se observaron errores propios del módulo.

## Matriz de 56 requisitos

| # | Requisito | Estado | Evidencia / nota |
|---:|---|---|---|
| 1 | Referencia visual seleccionada | PASS | Fuente adjunta y preview generado con ImageGen.
| 2 | Header de Gestión de precios | PASS | `PricingWorkspace.tsx`.
| 3 | CTA Importar lista | PASS | Abre `PricingImportDialog` y permite revisar/aplicar XLSX o CSV.
| 4 | CTA Nuevo precio | PASS | Abre editor controlado.
| 5 | KPI Con precio minorista | PASS | Usa RETAIL vigente, no cualquier precio.
| 6 | KPI Sin precio | PASS | Complemento del alcance total contra RETAIL vigente.
| 7 | KPI Mayorista configurado | PASS | Requiere cantidad mínima positiva.
| 8 | KPI Promociones activas | PASS | Cuenta SPECIAL vigente ahora.
| 9 | Fórmulas de vigencia efectiva | PASS | `pricing-domain.ts` y repositorio.
| 10 | KPIs independientes de paginación | PASS | Consulta de métricas separada de `page/pageSize`.
| 11 | KPIs respetan alcance de búsqueda/taxonomía | PASS | Scope base server-side.
| 12 | Búsqueda SKU/nombre/marca/familia | PASS | `productConditions` y combobox remoto.
| 13 | Paginación server-side | PASS | `limit(pageSize)` y `offset`.
| 14 | Selector 12/25/50/100 | PASS | Selector visible junto a la tabla y persistido en URL.
| 15 | Categoría, familia y marca | PASS | Filtros avanzados con facets reales.
| 16 | Etiquetas humanas de tipo | PASS | `pricingTypeLabels`.
| 17 | Etiquetas humanas de estado | PASS | `pricingStatusLabels`.
| 18 | Moneda, cobertura, mayorista, promoción y vigencias | PASS | Panel Más filtros.
| 19 | Chips de filtros activos | PASS | Cada chip se puede retirar individualmente.
| 20 | Estado de filtros en URL | PASS | `parsePricingFilters` y navegación compartible.
| 21 | Columnas SKU, precios, estado y actualización | PASS | Tabla responsive con scroll contenido.
| 22 | Estado por RETAIL vigente | PASS | Current/Scheduled/Expired/Inactive/Archived/Missing.
| 23 | Drawer de detalle de producto | PASS | Drawer desktop/mobile con tarjetas por tipo.
| 24 | Drawer full-screen en móvil | PASS | `AdminDrawer` adapta el panel bajo `sm`.
| 25 | Tarjetas retail/wholesale/minimum/special | PASS | Valores explícitos por tipo.
| 26 | Tabs Precios, masiva, descuentos e historial | PASS | Navegación de workspace implementada.
| 27 | Editor profesional sin prompt | PASS | Formulario con vigencia, tipo, moneda, cantidad y motivo.
| 28 | Combobox remoto | PASS | `/api/admin/precios/productos`, máximo 20 resultados.
| 29 | PEN/USD sin FX implícito | PASS | Select controlado y validación de backend.
| 30 | Motivo obligatorio | PASS | Validación client/server y archivado.
| 31 | Preview de deltas antes de guardar | PASS | El editor muestra importe de referencia y variación porcentual calculada.
| 32 | Fechas America/Lima | PASS | Render y parseo de `datetime-local` con offset `-05:00`.
| 33 | Prevención de solapes | PASS | Servicio transaccional e intervalos semiabiertos.
| 34 | Reemplazo programado atómico | PASS | `schedulePriceReplacement` y endpoint dedicado.
| 35 | Archivado con confirmación y motivo | PASS | Modal propio, sin `window.prompt()`.
| 36 | Refresh sin recarga global | PASS | `router.refresh()` tras mutaciones.
| 37 | Rail de cobertura | PASS | Porcentaje RETAIL vigente / catálogo.
| 38 | Rail de vigencias y control | PASS | Programados, vencimientos, vigentes e historial.
| 39 | Sin duplicar KPIs en el rail | PASS | El rail no repite mayorista/promociones.
| 40 | RBAC de COST | PASS | Costos se omiten sin `pricing.cost.view/edit`.
| 41 | RBAC de margen/multimoneda | PASS | El drawer presenta margen solo con permiso y compara costos/minorista en la misma moneda.
| 42 | Semántica de descuentos | PASS | `approvalAbovePercentage <= maxPercentage`.
| 43 | Edición de reglas en drawer | PASS | Crear y editar usan drawer, validación, motivo y servicio transaccional.
| 44 | Historial con actor legible | PASS | Nombre/email del actor, no solo ID.
| 45 | Exportación del alcance completo | PASS | `getPricingExportData` recorre todas las páginas filtradas.
| 46 | Nombre de exportación fechado | PASS | `coldpower-precios-YYYY-MM-DD.csv`.
| 47 | Exportación sin COST no autorizado | PASS | Máscara en `toPricingCsv`.
| 48 | Importación XLSX/CSV dry-run | PASS | Endpoint `/api/admin/precios/import` valida filas, SKU, moneda, ceros, permisos y conflictos.
| 49 | Actualización masiva transaccional | PASS | Endpoint único con preflight, máximo 100 seleccionados, motivo, porcentaje y transacción.
| 50 | Storefront solo RETAIL autoritativo | PASS | Resolución pública existente separada de SPECIAL/COST.
| 51 | Contrato explícito por tipo | PASS | `pricing` contiene retail/wholesale/minimum/special y cost protegido.
| 52 | Loading skeleton | PASS | `admin/precios/loading.tsx`.
| 53 | Error con reintento | PASS | `admin/precios/error.tsx`.
| 54 | Responsive 1440/1024/768/390 | PASS | Verificado en Brave a 1920, 1440, 1024, 768 y 390; `bodyWidth` no excede el viewport y el layout colapsa correctamente.
| 55 | Tests y lint focalizados | PASS | ESLint focalizado y tests de precios/dominio pasan; las comprobaciones globales de TypeScript, lint y build siguen encontrando contratos preexistentes de cotizaciones/pipeline fuera de CP-034.
| 56 | QA visual en navegador del usuario | PASS | Brave externo verificado en local y dev; consola sin errores propios del módulo.

## Verificación ejecutada

- `corepack pnpm exec tsc --noEmit` — PARTIAL; errores preexistentes fuera de CP-034 en `quote-repository`/contratos de cotizaciones y pipeline.
- `corepack pnpm exec eslint src/components/admin/PricingWorkspace.tsx src/components/admin/BulkPricingWorkspace.tsx src/components/admin/PricingImportDialog.tsx src/app/admin/precios src/app/api/admin/precios src/lib/pricing-contract.ts src/lib/pricing-domain.ts src/lib/pricing-repository.ts src/lib/pricing-service.ts src/lib/pricing-validation.ts src/lib/pricing-export.ts src/lib/pricing-bulk-service.ts src/lib/pricing-import-service.ts` — PASS.
- `corepack pnpm exec tsx --test scripts/pricing-validation.test.ts scripts/cp033-pricing.test.ts scripts/cp034-pricing-domain.test.ts` — PASS, 11/11.
- `node --test scripts/cp033-pricing-route.test.mjs` — PASS, 5/5.
- `corepack pnpm build` — PARTIAL; las rutas de CP-034 compilan antes de que la comprobación global se detenga por un error preexistente en `src/lib/quote-service.ts`.
- `GET http://localhost:3001/admin/precios?pricingCoverage=MISSING&hasWholesale=false&currency=PEN` — HTTP 200; filtros y estado Sin precio presentes.
- `GET http://localhost:3001/api/admin/precios/productos?q=comp` — HTTP 200; resultados reales server-side.
- `corepack pnpm lint` — BLOCKED por errores preexistentes fuera del alcance de CP-034; el lint focalizado de este ticket pasa.
