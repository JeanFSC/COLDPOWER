# ColdPower RC2 — reporte de consolidación y regresión

Fecha: 2026-08-16
Responsable: Codex2 — release, backend, base de datos e integración
Rama: `release/coldpower-v1.0-rc2`

## 1. Identidad de las ramas y SHAs

- RC1 congelada: `bf572060ff2efade5ea0fbaec7542f97d12da1c5`.
- UI final integrada: `de61a3f778ecd7ce94d447c4ee21f2e3c189297a`.
- Rama UI publicada en GitHub: `origin/ui/coldpower-v1.0-final-pass`.
- Backend revisado, sin mergear: `d18b9fd367199fcb388d5d474bf3bf5c757e4180` (`fix/cp029-be-blockers`).
- RC2 antes de este reporte: `d2083763d14440e5d9351fd6335fe1aa9e93d358`.

La UI desciende de RC1. RC1 no fue modificada, no se mergeó `main` y no se desplegó producción.

## 2. Auditoría del diff UI

El diff de la UI contiene únicamente:

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
- `docs/qa/ui-final-production-pass-2026-08-16.md`
- `docs/superpowers/plans/2026-08-16-cp030-rc2-consolidation.md`

No migraciones, schema, DB, RBAC, Clerk backend, webhook, inventario, pricing, datos ficticios ni secretos fueron incluidos en el pase UI.

## 3. Qué se tomó y qué se excluyó de CP-029-BE

Se tomó manualmente solo:

- `scripts/cp029-be-contract.test.ts`.
- El script `test:cp029:runtime` en `package.json`.

El contrato es read-only: compara agregados directos de PostgreSQL contra `getAdminCatalogPage`, comprueba SKU únicos y el total de páginas.

Se excluyeron todos los cambios del bypass y los cambios asociados de `src/lib/auth.ts`, `src/proxy.ts`, `src/lib/dev-auth-bypass.ts`, `.env.example`, `scripts/dev-auth-bypass.test.ts` y `scripts/test-all.mjs` de esa rama.

Búsqueda en el código productivo de RC2: 0 usos de `CP_DEV_AUTH_BYPASS`, `CP_DEV_AUTH_USER_ID`, `CP_DEV_AUTH_ALLOWED_HOSTS` y `dev-auth-bypass`.

## 4. Catálogo y PostgreSQL

Consulta read-only contra PostgreSQL y contrato CP-029:

| Métrica | Resultado |
| --- | ---: |
| Productos totales | 1,348 |
| SKU únicos | 1,348 |
| Publicados | 4 |
| REVIEW | 1,344 |
| Requieren revisión | 57 |
| Duplicados editoriales pendientes | 62 |
| Grupos de SKU duplicados exactos | 0 |
| Categorías | 27 |
| Marcas | 60 |
| Familias | 171 |

La auditoría contra el Excel devolvió 1,348 filas fuente, 1,348 almacenadas, cero SKU faltantes, cero inesperados, cero duplicados y cero diferencias de campos.

Migraciones: existen 33 archivos SQL y la consulta read-only a `drizzle.__drizzle_migrations` devolvió 33 migraciones aplicadas.

## 5. KPI y paginación de `/admin/catalogo`

El contrato de UI pasó con los KPI globales `1348`, `4`, `1344`, `62` y `57`, independientes de las 48 filas visibles.

La paginación conserva los filtros y cambia solamente `page`; el test de render verificó la navegación a página 2 conservando `publicationStatus=review`.

La lógica server-side solicita las colas globales sin heredar filtros ni página. La reproducción visual autenticada del route admin queda pendiente del OTP indicado en la sección Clerk.

## 6. Clerk real, webhook y RBAC

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: presente con prefijo de desarrollo.
- `CLERK_SECRET_KEY`: presente con prefijo de desarrollo.
- `CLERK_WEBHOOK_SECRET`: presente; el valor no se mostró.
- No se copiaron secretos a Git.
- No hay advertencia de claves desparejadas; la consola solo mostró la advertencia normal de usar claves Clerk de desarrollo y la sugerencia de autocomplete del formulario.
- Ruta canónica intacta: `/api/webhooks/clerk`.
- La firma usa `authConfig.webhookSecret`, cargado desde `CLERK_WEBHOOK_SECRET`.

`test:cp050:runtime` pasó el flujo firmado del webhook en localhost y `dev.coldpower.pe`: `user.created`, reintento idempotente, concurrencia, evento fuera de orden, `user.updated`, `user.deleted`, firma inválida y payload inválido.

RBAC y protección no autenticada:

- `test:phase11`: exit 0.
- Los contratos RBAC incluidos en `test:all`: pasaron.
- Las nueve rutas admin probadas en `dev.coldpower.pe` devolvieron `307` sin sesión.
- PostgreSQL confirma para `xslync@gmail.com`: `roleCode=SUPERADMIN`, `status=ACTIVE`, sin duplicar usuario.

Estado de login real: Clerk llegó correctamente a la pantalla OTP para `xslync@gmail.com`, pero el código no fue introducido. Por eso todavía no se afirma como verificado el acceso visual a `/auth/after-sign-in`, `/admin/dashboard`, refresh, logout/login ni las nueve pantallas admin con sesión SUPERADMIN.

## 7. Suite de pruebas RC2

- `corepack pnpm test:all`: PASS; 67 pruebas Node, bloque TypeScript, fases existentes, TypeScript, lint y build.
- `corepack pnpm test:cp029-ui`: PASS; prueba estructural y dos pruebas de render.
- `corepack pnpm test:cp029:runtime`: PASS; contrato servicio vs PostgreSQL.
- `corepack pnpm test:cp050`: PASS.
- `corepack pnpm test:cp050:runtime`: PASS.
- `corepack pnpm test:phase11`: PASS.
- TypeScript: PASS.
- Build Next.js: PASS.
- Lint: 0 errores y 17 warnings baseline ya existentes; no se agregaron warnings nuevos.
- `git diff --check`: PASS después de retirar la instrumentación temporal de QA.

## 8. Runtime

| URL | Resultado |
| --- | --- |
| `http://localhost:3000/` | HTTP 200 |
| `http://localhost:3000/api/health` | HTTP 200 |
| `http://localhost:3000/catalogo` | HTTP 200 |
| `http://localhost:3000/comparar` | HTTP 200 |
| `http://localhost:3000/cotizacion` | HTTP 200 |
| `http://localhost:3000/admin/dashboard` sin sesión | HTTP 307 |
| `http://localhost:3000/api/admin/catalogo` sin sesión | HTTP 403 |
| `https://dev.coldpower.pe/` | HTTP 200 |
| `https://dev.coldpower.pe/api/health` | HTTP 200 |
| `https://dev.coldpower.pe/admin/dashboard` sin sesión | HTTP 307 |

El webhook runtime verificó ambos orígenes. No se utilizó bypass para las pruebas autenticadas; la única parte autenticada pendiente es la continuación manual del OTP.

## 9. Estado de no regresión y límites de alcance

CRM, inventario, cotizaciones, pricing, CMS, RBAC y webhook permanecen heredados de RC1 y sus contratos/regresiones pasaron. No se ejecutaron migraciones destructivas.

Este ticket no desplegó `coldpower.pe`, no migró Neon, no configuró Hetzner, no modificó Cloudflare/DNS, no creó Clerk Production, no implementó SUNAT ni pagos, no publicó 1,344 productos, no inventó precios/stock y no hizo merge a `main`.

## 10. Bloqueador restante

RC2 está técnicamente consolidada, pero el cierre de la auditoría P0 queda pendiente de que el propietario introduzca el OTP en el navegador abierto. Tras ese paso se debe verificar `/auth/after-sign-in`, SUPERADMIN visible, refresh estable, logout/login y acceso a todas las rutas admin. No se debe sustituir ese paso con bypass.
