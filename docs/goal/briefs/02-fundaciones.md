# Brief 02 — Fundaciones del admin (Codex)

Lee completo `docs/goal/GOAL-IMPECABLE.md` y `AGENTS.md`. Rama `codex/goal-impecable`. No toques `design-qa.md`, `eslint.config.mjs` ni el home público (otra sesión).

## Parte 1 — Auditoría rápida (escribe `docs/goal/audits/fundaciones.md`, formato §5)
Verifica con archivo:línea antes de corregir. Hallazgos ya conocidos (confírmalos):
- `src/app/admin/page.tsx` exige `dashboard.view`: ADMIN, VENTAS, ALMACEN, COMPRAS, REPORTES, OPERACIONES_VENTAS rebotan al home público.
- `src/lib/auth.ts` `requirePermission` redirige a `/` en vez de 403.
- `src/app/admin/layout.tsx`: REPORTES no ve Reportes/Auditoría; GERENCIA con `users.view`/`audit.view` pero el menú los oculta; Promociones y Taxonomía fuera del menú; la campana se muestra a roles sin `notifications.view`.
- Enlaces rotos: `api/admin/busqueda/route.ts` (~84 cliente → `?query=`, ~86 oportunidad → `/admin/oportunidades` inexistente).
- Módulos sin `error.tsx`: auditoria, catalogo, cms, compras, configuracion, inicio, notificaciones, operaciones, promociones, reportes, taxonomia, usuarios.
- Componentes muertos: AdminDashboardView, CatalogPublicationControl, CrmPipeline, InventoryActions, InventoryOperations, OrderStatusControl, PaymentActions, PricingOperations, ProductEditorialForm, QuoteStatusControl, SalesActions, TransferStatusControl, y PipelineWorkspace/QuotesWorkspace/SalesWorkspace/CustomersWorkspace dentro de AdminCategoryViews.tsx (verifica 0 imports).
- Tests huérfanos (no están en package.json ni `scripts/test-all.mjs`).
- IBM Plex no se carga (`src/app/layout.tsx`, `globals.css`).

## Parte 2 — Implementación (lógica; sin rediseño visual)
1. **Landing por rol**: `/admin` redirige a la primera ruta permitida para el rol (Inicio si tiene permiso; si no, su módulo principal). Test por cada rol de `src/lib/roles.ts`.
2. **403**: `requirePermission` muestra una página "Sin acceso" dentro del shell admin (usa `forbidden()` de Next 16 si aplica — lee `node_modules/next/dist/docs/` — o una ruta `/admin/sin-acceso`), con enlace a su landing. Nunca redirige al home público.
3. **Menú por permisos**: un solo arreglo de ítems con `permission` por ítem, agrupados en secciones **Comercial** (Clientes, Pipeline, Cotizaciones, Ventas, Pedidos, Pagos), **Operación** (Operaciones, Inventario, Compras), **Catálogo** (Productos, Taxonomía, Precios, Promociones), **Gestión** (Inicio, Dashboard, Reportes, Notificaciones, Auditoría, Usuarios, Configuración). Se muestra cada ítem si y solo si `can(role, permission)` (y no está en `hidden-admin-modules`). Elimina managementLinks/operationsLinks. Campana solo con `notifications.view`. Test: para cada rol, cada ítem visible es accesible (página no rechaza) y cada página permitida aparece en el menú.
4. **Enlaces de búsqueda**: cliente → `/admin/clientes?customerId=`; oportunidad → `/admin/crm?view=pipeline&opportunityId=`.
5. **error.tsx** con `AdminSegmentError` en los 12 módulos que faltan.
6. **Limpieza**: borra componentes muertos y reescribe o borra los tests que solo validaban esos archivos. Engancha a `test:all` todo test vivo huérfano que pase; los que fallen por código real, repórtalos (no los borres).
7. **Fuente**: IBM Plex Sans (400/500/600/700) y Plex Mono con `next/font/google`, variables CSS conectadas a `--font-sans/--font-display/--font-mono` en `globals.css`. Corrige la regex falsa de `scripts/phase16-navigation-design.test.mjs` para exigir `next/font`.

## Verificación que debes correr
`corepack pnpm exec tsc --noEmit`, `corepack pnpm lint` (errores solo en tus archivos), `node scripts/test-all.mjs` o los tests afectados. NO hagas commit. Reporta archivos cambiados, hallazgos cerrados, tests y riesgos.
