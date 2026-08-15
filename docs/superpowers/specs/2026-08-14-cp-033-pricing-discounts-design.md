# CP-033 — Diseño de precios y descuentos

## Objetivo

Convertir el módulo administrativo de precios en una lectura y escritura
real sobre PostgreSQL, conservando la estructura visual actual y protegiendo
costos, márgenes y reglas de descuento mediante RBAC server-side.

## Diseño aprobado

El listado será producto-céntrico: cada producto aparece una vez aunque no
tenga precios, y expone `price: null` cuando no existe un precio visible. Los
filtros de producto y precio se aplican antes de paginar. Las métricas y
facetas se calculan sobre ese mismo conjunto filtrado, nunca sobre las filas de
la página actual.

Las rutas HTTP validarán los parámetros y permisos sin redireccionar. Los
errores usarán `{ error: { code, message, details } }`. El servicio de
mutaciones recibirá un actor, validará producto, monto, moneda y ventana de
vigencia, cerrará o rechazará solapamientos y escribirá precio, historial y
auditoría dentro de una transacción.

Los costos se filtran en la consulta/DTO y no sólo en la vista. Un actor sin
`pricing.cost.view` no recibe filas COST, importes COST, márgenes ni columnas
equivalentes en el CSV. `pricing.discount.manage` se asigna únicamente a
SUPERADMIN, GERENCIA y JEFATURA; `pricing.edit` se conserva para las
operaciones de precio existentes.

Las reglas de descuento se gestionan con creación, actualización y cambio de
estado idempotente. Sus porcentajes se validan contra 0–100 y la aprobación no
puede estar por debajo del máximo permitido. La desactivación de precios es
un archivado lógico; el historial es append-only.

## Contratos

- `GET /api/admin/precios`: `{ items, page, pageSize, totalItems, totalPages, metrics, facets }`.
- `POST /api/admin/precios`: crea un precio y su historial/auditoría.
- `PATCH /api/admin/precios/:id`: actualiza una ventana/precio mediante una nueva versión histórica.
- `DELETE /api/admin/precios/:id`: archiva, no elimina físicamente.
- `GET /api/admin/precios/historial`: lista paginada con producto, SKU, actor, tipo, fechas y valores.
- `GET /api/admin/precios/export`: CSV filtrado y auditado.
- `GET/POST/PATCH /api/admin/descuentos`: CRUD de reglas y estados.

## Verificación

Las pruebas cubren filtros combinados, paginación, productos sin precio,
vigencias, solapamientos, archivado, historial, descuentos, exportación,
ocultamiento de COST, auditoría y RBAC. La UI no elimina ni rediseña cards,
tablas, botones o rutas existentes; sólo recibe datos y URLs reales.
