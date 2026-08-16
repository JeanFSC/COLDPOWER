# CP-029-FE — UI final production pass

Fecha: 2026-08-16
Base: `release/coldpower-v1.0-rc1`
SHA base: `bf572060ff2efade5ea0fbaec7542f97d12da1c5`
Rama de trabajo: `ui/coldpower-v1.0-final-pass`

## Resultado de esta iteración

Se corrigió la presentación de `/admin/catalogo` para que las tarjetas de resumen utilicen las métricas globales del contrato actual de catálogo. Las filas siguen viniendo de la consulta paginada existente, por lo que filtros, página actual y edición editorial no se alteran.

También se conectó el paginador visible de `ProductWorkspace` con la página server-side. Los enlaces conservan los filtros existentes y solo reemplazan `page`.

La capa visual distingue ahora:

- `En revisión`: estado editorial `REVIEW` global.
- `Requieren revisión`: cola especial global.
- `Duplicados editoriales pendientes`: duplicados con decisión editorial pendiente.
- `SKU duplicados exactos`: no se presenta como duplicados editoriales.

No se hardcodearon valores de producción.

## Contrato global consumido

La página solicita `getAdminCatalogPage({ page: 1, pageSize: 1 })` únicamente para leer `queues`. Esto mantiene los KPI fuera de los filtros y de las filas de la página actual.

La entrega de Codex2 reporta los valores reales globales:

| Métrica | Valor |
| --- | ---: |
| Total | 1,348 |
| Publicados | 4 |
| En revisión | 1,344 |
| Borradores | 0 |
| Ocultos | 0 |
| Requieren revisión | 57 |
| Duplicados editoriales pendientes | 62 |
| SKU duplicados exactos | 0 |
| Marcas | 60 |
| Categorías | 27 |

Se repitió una consulta read-only contra el entorno local real. Página 1 y página 2 devolvieron 48 filas y exactamente las mismas `queues`; el filtro `publicationStatus=review` devolvió 1,344 resultados, pero mantuvo las mismas métricas globales. La renderización server-side de esas 48 filas reales produjo en la UI `1,348`, `4`, `1,344`, `62` y la cola separada `57`.

## Correcciones adicionales del pase visual

- El comparador ahora se monta directamente dentro de `CompareProvider`, por lo que reacciona a cambios de selección.
- El botón “Comparar” del header navega a `/comparar`.
- La barra del comparador se oculta en rutas `/admin`.
- El shell administrativo usa `min-w-0` y `overflow-x-clip` para evitar overflow producido por el sidebar móvil y los grids.
- Los paneles administrativos permiten que las tablas permanezcan desplazables sin imponer su ancho al layout.
- Las miniestadísticas del dashboard de gerencia se apilan en móvil.
- Se reemplazó el fallback empresarial incorrecto `ColdPower S.A.C.` por `C&J COLD IMPORT PERÚ E.I.R.L.`.

## Evidencia

- [Comparador público después del ajuste](../../output/playwright/cp029-compare-global-after.png): barra visible con dos productos seleccionados y enlace del header a `/comparar`.
- [Catálogo real desktop](../../output/playwright/cp029-catalog-real-data-1440.png): KPI globales visibles con datos reales.
- [Catálogo real móvil](../../output/playwright/cp029-catalog-real-data-390.png): tarjetas apiladas y sin overflow horizontal.
- [Home público desktop del baseline](../../output/playwright/cp029-public-home-desktop-1440css.png).
- [Catálogo admin baseline previo al ajuste](../../output/playwright/cp029-admin-admin-catalogo.png). Sirve para comparar el defecto original `0/48/2`; no se considera evidencia final de los KPI.

El harness visual del componente real midió `scrollWidth === innerWidth` en 390, 768, 1024 y 1440 px. Los screenshots desktop y móvil fueron inspeccionados visualmente.

La nueva sesión Playwright no tenía una sesión Clerk reutilizable. Al abrir `/admin/catalogo`, el flujo redirigió correctamente a `/sign-in`. El entorno también reportó el warning de Clerk sobre claves de desarrollo desparejadas y refresh infinito. Por eso la verificación visual autenticada final de los KPI admin debe repetirse con una sesión `SUPERADMIN` real; no se inventa esa evidencia.

## Verificaciones ejecutadas

- `pnpm test:cp029-ui`: pasó.
- Regresión TSX de `ProductWorkspace` con 48 filas y métricas globales independientes: pasó para `1348`, `4`, `1344`, `62` y `57`.
- Regresión TSX de navegación: el enlace de página 2 conserva `publicationStatus=review` y cambia únicamente `page`.
- `pnpm exec tsc --noEmit`: pasó.
- `pnpm test:all`: pasó.
- `pnpm lint`: 0 errores, 17 warnings preexistentes del baseline RC1.
- `pnpm build`: pasó.
- `git diff --check`: sin errores de whitespace.

## Archivos modificados

- `src/app/admin/catalogo/page.tsx`
- `src/components/admin/AdminCategoryViews.tsx`
- `src/components/admin/AdminDashboardView.tsx`
- `src/components/admin/AdminShell.tsx`
- `src/components/catalog/CompareBar.tsx`
- `src/components/layout/Header.tsx`
- `src/app/layout.tsx`
- `scripts/cp029-catalog-metrics-ui.test.mjs`
- `scripts/cp029-catalog-metrics-render.test.tsx`
- `package.json`

No se modificaron PostgreSQL, Drizzle, migraciones, rutas API ni lógica de negocio.
