# Auditoría Catálogo, Taxonomía y Precios — 2026-09-23

Ruta(s): `/admin/catalogo`, `/admin/catalogo/[id]`, `/admin/taxonomia`, `/admin/precios`; `/api/admin/catalogo/**`, `/api/admin/taxonomia/**`, `/api/admin/precios/**`, `/api/admin/media/**`, `/api/media/[id]`.

Componentes: `AdminProductCatalog`, `ProductCommercialEditor`, `PricingWorkspace`, `TaxonomyManager`, `MediaLibrary`, `MediaSlotAssociator`.

Servicios: `catalog-admin-service`, `catalog-product-service`, `taxonomy-admin`, `pricing-repository`, `pricing-service`, `retail-price`, `media-repository`, `publication-service`.

Tablas: `products`, `categories`, `families`, `brands`, `product_prices`, `price_history`, `media_assets`, `media_asset_usages`, `inventory_balances`, `audit_logs`.

Roles: `SUPERADMIN`, `JEFATURA`, `ADMIN`, `GERENCIA`, `OPERACIONES_VENTAS`, `VENTAS`, `ALMACEN`, `COMPRAS`, `REPORTES`.

## Tarea del usuario

Un encargado de catálogo debe poder mantener la identidad fuente inmutable, editar la taxonomía editorial respetando `categoría → familia → producto`, publicar únicamente fichas aptas, asociar una foto persistida que llegue a la tienda, administrar precios con vigencia e historial, y navegar a inventario, precios y promociones sin encontrar acciones que su rol no puede ejecutar. Un RETAIL vigente y activo debe ser exactamente el precio que la tienda muestra y cobra.

## Hallazgos

| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| CAT-01 | P0 | Data/Function | `src/lib/retail-price.ts:18-25` | El precio usado por carrito y venta filtra `priceType`, ventana de vigencia y `active`, pero no `status = ACTIVE`; un registro INACTIVE con `active=true` puede volver comprable/cobrable un producto. | La fuente de precio comercial debe aceptar únicamente RETAIL con estado ACTIVE, activo y vigente. |
| CAT-02 | P1 | Security/Function | `src/app/api/admin/taxonomia/route.ts:8`, `src/app/api/admin/taxonomia/[entity]/[id]/route.ts:9`, `src/app/api/admin/taxonomia/export/route.ts:6`, `src/app/admin/taxonomia/page.tsx:7` | El fallback desde `catalog.*.manage` a `catalog.product.edit` hace que VENTAS pueda consultar o mutar taxonomía; además la página sólo exige edición de producto. UI y API no comparten `requireTaxonomyAccess` estricto. | Cada entidad debe exigir su permiso propio (`category`, `family` o `brand` manage) tanto en página como en API/exportación. |
| CAT-03 | P1 | Data/Function | `src/app/api/admin/catalogo/[id]/route.ts:47-56` | El editor acepta IDs editoriales inexistentes/inactivos y una familia cuyo padre no corresponde a la categoría efectiva. | Validar dentro de la transacción existencia/actividad y la relación padre antes de guardar; conservar SKU y taxonomía fuente inmutables. |
| CAT-04 | P1 | Function/Links | `src/components/admin/PricingWorkspace.tsx:164`, `src/app/api/admin/precios/reemplazar/route.ts` | El modo de reemplazo envía `id`, pero la API lee `priceId`; el flujo visible falla al guardar una sustitución programada. | Enviar el contrato real `priceId` y mantener la creación transaccional del nuevo precio/historial. |
| CAT-05 | P1 | Security/Function | `src/app/api/admin/catalogo/[id]/route.ts:27-28`, `src/lib/catalog-admin-service.ts:854-868` | El detalle sólo carga precios si el actor tiene simultáneamente coste y margen; a la vez, al habilitarlo devuelve también COST sin separar visibilidad, mientras la UI usa `pricing.view`. | `pricing.view` debe recibir precios comerciales; COST sólo con `pricing.cost.view`, y margen no debe ser requisito para ver RETAIL. |
| CAT-06 | P1 | Function/Permissions | `src/app/admin/catalogo/[id]/page.tsx:20-35`, `src/components/admin/ProductCommercialEditor.tsx:20-58` | VENTAS entra por `catalog.product.edit` y ve formularios de precio/stock aunque carece de `pricing.edit` e `inventory.adjust`; las APIs los rechazan después de la interacción. | La UI debe ocultar o deshabilitar cada flujo con el mismo permiso que la API y mostrar un estado honesto. |
| CAT-07 | P2 | Data/Function | `src/lib/taxonomy-admin.ts:22-28` | Conteos, publicados y detalle de taxonomía usan sólo relaciones fuente; después de una asignación editorial muestran cifras y productos distintos del catálogo efectivo. | Consultar las relaciones editoriales efectivas, con fallback a fuente sólo cuando el override es NULL. |
| CAT-08 | P2 | Function/Performance | `src/lib/pricing-repository.ts:66-68`, `131-165` | Filtros, facetas y métricas de precios mezclan relaciones fuente y editoriales; una ficha re-clasificada puede quedar fuera de la búsqueda/faceta correcta. | Usar los mismos joins efectivos de catálogo en listado, filtros, facetas y métricas. |
| CAT-09 | P2 | Function/UI | `src/components/admin/AdminProductCatalog.tsx:1432-1470` | “Asignar categoría”, “Asignar marca” y “Editar atributos” aparecen como operaciones masivas, aunque no existe endpoint persistente; sólo abren una ficha o informan después. | No ofrecer botones activos para acciones no disponibles; dejar claro que se ejecutan desde la ficha y reservar las acciones masivas para flujos persistentes. |
| CAT-10 | P1 | Function/Links | `src/components/admin/AdminProductCatalog.tsx:964-1001`, `src/app/api/admin/catalogo/[id]/media/route.ts:9-28` | El backend puede asociar media y la tienda la lee, pero la ficha sólo lista assets y remite a Media Library; no hay subida/asociación directa para completar C10/B7.3. | Desde la ficha, un usuario autorizado debe subir una imagen, asociarla como `primary` de forma persistida y verla inmediatamente en el estado de la ficha; la URL pública debe seguir siendo `/api/media/[id]`. |
| CAT-11 | P2 | Data/Function | `src/lib/catalog-admin-service.ts:839-853`, `src/app/api/admin/catalogo/[id]/media/route.ts:16-25` | Se pueden asociar varios assets al slot `primary`; el detalle/listado toma el primero por orden, por lo que “imagen principal” no es determinista si se cargan varias. | Mantener un único primary por producto o normalizar la asociación al reemplazar el anterior, con auditoría. |

## Plan de corrección (orden, archivos)

1. Corregir el contrato de precio RETAIL que usan carrito/ventas y agregar una regresión.
2. Centralizar `requireTaxonomyAccess`, eliminar el fallback, corregir la página/exportación y validar la jerarquía editorial en transacción.
3. Hacer que taxonomía y precios consuman joins editoriales efectivos.
4. Corregir el contrato `priceId` del reemplazo y separar visibilidad comercial/coste en el detalle de catálogo.
5. Alinear `ProductCommercialEditor` con `pricing.edit` e `inventory.adjust`.
6. Marcar como no disponibles las operaciones masivas sin endpoint persistente.
7. Añadir subida y asociación de foto desde la ficha, sin modificar `product-image.ts`, `ProductMedia`, `ProductGallery`, `CartPageView` ni home.
8. Normalizar el slot `primary` al asociar media y cubrir contratos; no se requiere migración si la unicidad se garantiza en la mutación transaccional.

## Criterio de aceptación (browser role)

- `SUPERADMIN`/`JEFATURA`: en 1920×1080 y 390 px pueden crear/editar taxonomía, editar ficha, subir y asociar foto primaria, publicar después del preflight, crear/editar/reemplazar precios y navegar a inventario; la ficha muestra estados vacío, carga, error y éxito.
- `VENTAS`: puede consultar/editar lo autorizado en catálogo, pero no ve acciones de taxonomía, precio ni ajuste de stock que la API vaya a rechazar; no puede publicar.
- `COMPRAS`: puede consultar precios autorizados sin recibir COST si no tiene `pricing.cost.view` y no recibe margen por accidente.
- Un RETAIL INACTIVE, futuro o vencido no aparece como precio comprable en catálogo público, carrito ni checkout; sólo un RETAIL ACTIVE dentro de su ventana lo hace.
- Los filtros de taxonomía/precios y sus conteos siguen la clasificación editorial efectiva; SKU, IDs fuente y auditoría permanecen intactos.
- Las operaciones masivas sin persistencia no se presentan como ejecutables; precios/inventario conservan sus enlaces de módulo.
- La foto asociada se sirve desde `/api/media/[id]`, queda auditada y aparece en la tienda; no se usan placeholders para declarar éxito.

## Estado inicial de verificación

- Contratos estáticos del módulo: 19/19 pasaron.
- Tests de dominio/listado: 16/19 pasaron; 3 tests runtime no pudieron abrir la base porque el comando inicial no inyectó `DATABASE_URL`. `.env.local` sí está configurado; se repetirá la verificación con ese entorno sin imprimir secretos.
- No se aplicarán migraciones ni se iniciarán servidores durante la verificación del ticket.

## Estado de cierre

- CAT-01 a CAT-11: corregidos en código y cubiertos por contratos/regresiones del alcance.
- Evidencia focalizada final: 20/20 contratos estáticos, 14/14 tests de dominio y 6/6 tests runtime con `DATABASE_URL` cargado desde `.env.local`.
- `tsc --noEmit` y lint dirigido del alcance pasaron en una ejecución estable. El lint global pasa sin errores y conserva warnings preexistentes en archivos fuera del alcance.
- Validación browser autenticada en Brave: catálogo real de 1.348 productos, taxonomía, precios paginados, acciones masivas honestamente deshabilitadas, multimedia y estado vacío comercial.
- Pendiente de evidencia manual: upload real de un archivo y comprobación en tienda, porque implican transmitir un archivo y modificar datos persistentes; también viewport de 390 px y roles distintos a `SUPERADMIN` en la sesión conectada.
- `tsc`/build final pueden quedar afectados por cambios concurrentes fuera de este brief (`src/lib/operations-work-items-service.ts` y `src/lib/product-image.ts`); no se modificaron. La suite global se detuvo en contratos concurrentes de Home antes de ejecutar sus fases posteriores.
