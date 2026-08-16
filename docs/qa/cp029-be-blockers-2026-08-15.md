# CP-029 — Auditoría backend, base de datos, Auth y RBAC

Fecha: 2026-08-15  
Rama: `fix/cp029-be-blockers`  
Base protegida: `release/coldpower-v1.0-rc1` en `bf572060ff2efade5ea0fbaec7542f97d12da1c5`

## Alcance y guardas

La auditoría se ejecutó contra el entorno local de desarrollo y el hostname público de desarrollo. No se modificó `release/coldpower-v1.0-rc1`, no se tocaron Cloudflare/DNS/secretos y no se agregaron productos, precios, stock, ventas, clientes, órdenes, cotizaciones, pagos ni usuarios de prueba. Tampoco se modificaron componentes, páginas ni estilos del frontend.

El único cambio funcional de esta rama es una prueba de regresión de contrato para reconciliar las colas globales del catálogo con PostgreSQL. El resto son documentación y evidencia.

## Hallazgo principal: catálogo

La base PostgreSQL contiene 1,348 productos. La conciliación directa y el servicio administrativo devuelven los mismos valores:

| Métrica | PostgreSQL | Servicio/API |
|---|---:|---:|
| Total | 1,348 | 1,348 |
| Publicados | 4 | 4 |
| En revisión | 1,344 | 1,344 |
| Borrador | 0 | 0 |
| Ocultos | 0 | 0 |
| Requieren revisión | 57 | 57 |
| Duplicados editoriales pendientes | 62 | 62 |
| Marcas | 60 | 60 |
| Categorías | 27 | 27 |

Invariantes verificadas:

- 1,348 SKU distintos; no hay grupos de SKU duplicados exactos.
- Los 62 duplicados corresponden a la cola editorial pendiente: `canonical_product_id IS NULL`, `possible_duplicate = true` y `duplicate_decision = 'pending'`.
- No se encontraron grupos pendientes de duplicado exacto por SKU.
- La primera página de 48 filas contiene 0 publicados, 48 en revisión y 2 posibles duplicados; eso no representa el total global.

### Causa de la discrepancia visual

`GET /api/admin/catalogo` usa `getAdminCatalogPage`, que calcula las colas globales con consultas separadas y devuelve HTTP 200 con los 1,348 productos y sus métricas correctas.

La página server-side `/admin/catalogo` todavía obtiene las filas mediante el servicio legacy `getAdminCatalog` y las entrega a `ProductWorkspace`. Ese componente calcula sus tarjetas a partir de las filas de la página actual; por eso visualmente puede mostrar 0 publicados, 48 en revisión y 2 duplicados aunque el backend tenga los totales globales anteriores. La lista paginada, los filtros y la API no tienen el fallo observado.

Conclusión: el bloqueo visual es de presentación/consumo de métricas en frontend, no de PostgreSQL ni del contrato backend. Se deja como handoff para Codex1; no se tocó UI en esta rama.

Antes/Después:

- Antes: la UI observada mostraba contadores calculados sobre la página actual.
- Después de la verificación backend: PostgreSQL, servicio y API siguen alineados; no fue necesario alterar sus valores ni crear datos para compensar la UI.

## Base de datos y entorno

Variables requeridas presentes en `.env.local` sin imprimir valores: `DATABASE_URL`, claves de Clerk y `CLERK_WEBHOOK_SECRET`. `NEXT_PUBLIC_SITE_URL` no está definido; `siteConfig.siteUrl` mantiene fallback a `https://coldpower.pe`, pero no se encontró uso activo de esa propiedad en la lógica auditada. No se encontró lógica de negocio condicionada por `dev.coldpower.pe` o `localhost:3000`.

La misma base lógica de desarrollo fue usada por el servicio y por las comprobaciones de ambos hosts. No se encontraron campos de tenant/empresa en el modelo de productos ni un campo de borrado lógico de producto aplicable a este catálogo.

## Clerk, sesión y RBAC

La cuenta `xslync@gmail.com` existe una sola vez en `users`, está `ACTIVE`, tiene `role_code = SUPERADMIN` y `clerk_sync_status = SYNCED`. El vínculo interno se conserva mediante el ID de usuario de Clerk; no existe un duplicado por correo.

La resolución de autorización usa el usuario autenticado de Clerk, su registro interno, el rol activo y `can(permission)`. Las rutas administrativas mantienen el contrato de denegación HTTP 403; las rutas de cuenta sin autenticación mantienen HTTP 401. Los contratos estáticos CP-028/CP-031 y `rbac-admin-route-contract` pasan. No se creó una cuenta adicional para probar un rol no autorizado.

Prueba de sesión real realizada en `https://dev.coldpower.pe`:

- La sesión autenticada abrió `/admin/dashboard` y mostró `SUPERADMIN / Superadministrador`.
- Se abrió el menú de usuario y se ejecutó `Sign out`.
- Clerk cerró la sesión y devolvió el navegador al origen público; el acceso protegido volvió a la pantalla de inicio de sesión.
- El reingreso quedó en el paso de código de verificación de Clerk. El código debe introducirse directamente en el navegador; no se evade MFA/OTP ni se registra el código en este informe.

## Webhook de Clerk

Ruta canónica: `POST /api/webhooks/clerk`.

La firma se valida exclusivamente con `CLERK_WEBHOOK_SECRET`, leído a través de `authConfig.webhookSecret`. No hay dominio hardcodeado dentro del webhook. Las pruebas runtime CP-050 verifican `user.created`, `user.updated`, `user.deleted`, firma inválida, payload inválido, idempotencia y eventos fuera de orden. Todas pasan; los eventos repetidos no crean usuarios duplicados y la sincronización se mantiene transaccional.

## Hosts y HTTP

| Comprobación | `http://localhost:3000` | `https://dev.coldpower.pe` |
|---|---:|---:|
| `GET /` | 200 | 200 |
| `GET /api/health` | 200 | 200 |
| `GET /api/admin/catalogo` sin sesión | 403 `CATALOG_FORBIDDEN` | 403 `CATALOG_FORBIDDEN` |
| `GET /sign-in?redirect_url=/admin/dashboard` | 200 | 200 |

El proxy conserva el hostname y el protocolo reenviado para los redirects de Clerk. `next.config.ts` permite `dev.coldpower.pe`; no se detectó una diferencia de código entre ambos hosts. Una sesión de Clerk en `dev.coldpower.pe` no debe asumirse disponible en `localhost:3000`, porque las cookies son específicas del origen. Esto explica diferencias de sesión/localStorage, no duplicación de datos ni entornos.

Con la sesión autenticada se verificaron como HTTP 200 las páginas `/admin/dashboard`, `/admin/catalogo`, `/admin/inventario`, `/admin/precios`, `/admin/crm?view=clientes`, `/admin/cotizaciones`, `/admin/reportes`, `/admin/usuarios` y `/admin/configuracion`. También respondieron 200 las APIs administrativas de dashboard, catálogo, precios, clientes, cotizaciones, reportes, usuarios y configuración. No existe una ruta base `GET /api/admin/inventario`; el inventario expone rutas específicas de locales, mínimos, ajustes, reservas y transferencias.

## Pruebas ejecutadas

Pasaron:

- `corepack pnpm test:cp025`
- `corepack pnpm test:cp031`
- `corepack pnpm test:cp050`
- `corepack pnpm test:cp050:runtime`
- `corepack pnpm test:cp029:runtime`
- `corepack pnpm test:all`
- `corepack pnpm exec tsc --noEmit`
- `corepack pnpm exec eslint` — 0 errores y 17 warnings preexistentes fuera de este cambio
- `corepack pnpm build`

La prueba nueva `scripts/cp029-be-contract.test.ts` compara las colas del servicio con SQL directo, valida paginación global, unicidad de SKU y ausencia de grupos exactos duplicados. Es de solo lectura.

## Archivos modificados

- `package.json`: agrega el script `test:cp029:runtime`.
- `scripts/cp029-be-contract.test.ts`: prueba runtime de conciliación PostgreSQL/servicio.
- `docs/superpowers/specs/2026-08-15-cp029-be-blockers-design.md`: alcance aprobado.
- `docs/superpowers/plans/2026-08-15-cp029-be-blockers.md`: plan de ejecución.
- `docs/qa/cp029-be-blockers-2026-08-15.md`: este reporte.

No se modificaron archivos de UI, middleware de infraestructura, DNS, Cloudflare ni secretos.

## Pendientes explícitos

1. Codex1 debe cambiar el consumo de las métricas globales en `ProductWorkspace`/la página de catálogo para que las tarjetas no se calculen desde la página actual.
2. Completar el código de verificación de Clerk en el navegador persistente y confirmar el redirect posterior al dashboard con `SUPERADMIN` conservado. El logout y la protección de rutas ya fueron comprobados.

