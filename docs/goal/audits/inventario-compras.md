# Auditoría Inventario y Compras/Proveedores — 2026-09-22

> Auditoría de código (lectura) contra GOAL-IMPECABLE §4. Verificada por Claude (tech lead) en los P0.
> Estado: **Inventario #1 corregido** (`markOrderPaid` y `registerManualPayment` limpian `expiresAt` de reservas de pedidos pagados; smoke cp060 lo verifica).

# Auditoría Inventario
Ruta: /admin/inventario · Componentes: InventoryAdminWorkspace.tsx (3807 líneas), app/admin/inventario/{page,loading,error}.tsx · Servicios: inventory-admin-service.ts, inventory-admin-contract.ts, inventory.ts, inventory-transaction.ts, inventory-domain.ts, api/admin/inventario/** · Tablas: inventory_balances, inventory_movements, inventory_reservations, transfers, transfer_items, inventory_import_batches, locations · Roles: ALMACEN (view/adjust/transfer/reserve/kardex), COMPRAS y VENTAS (view), GERENCIA/ADMIN (todo)

## Tarea del usuario
- **Almacén:** críticos del local, recibir/enviar traslados, liberar reservas vencidas, ajustes por conteo.
- **Compras:** ver bajo mínimo → crear solicitud.
- **Gerencia:** stock disponible y crítico por local.
- **Siguiente acción obvia:** "ver críticos" y "recibir traslado". Hoy no está a un clic y los filtros de la URL se pierden.

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| 1 | P0 ✅ | Datos | inventory.ts:97-108; sales-service.ts:126 | Las reservas de pedido web vencían con `paymentDueAt` aunque el pedido ya estuviera pagado. Luego la entrega fallaba. | **Corregido:** al pagar, `expiresAt=null`. |
| 2 | P0 | Datos | InventoryAdminWorkspace.tsx:2139-2172; api/.../reservas/[id]/liberar/route.ts:9, consumir/route.ts:9 | Liberar/Consumir aparecen para reservas `referenceType="order"`. Se descuadra el pedido. | Las reservas de pedido se operan solo desde Pedidos; la API rechaza `order` fuera de sales-service. |
| 3 | P1 | Función | inventory-admin-service.ts:457,480 (limit 8); Workspace:1829-1831 | Traslados y reservas: solo 8, sin paginación; contadores falsos. | Paginado en servidor, filtro por estado, contadores reales. |
| 4 | P1 | Enlaces | inventory-admin-contract.ts:98-124 | No lee `productId` ni `critical`. Catálogo, Dashboard y Operaciones enlazan a una vista sin filtrar. | Soportar ambos y mostrarlos como chips. |
| 5 | P1 | Enlaces | Workspace (sin `<Link>`); 710,1732,1943,2123,3429; service:179-192 | SKU y referencias (pedido/compra/traslado) son texto; `purchase_receipt` sin etiqueta; sin CTA "Crear solicitud de compra". | IDs enlazados al módulo dueño; CTA a compras prellenada. |
| 6 | P1 | Datos | api/admin/inventario/transferencias/route.ts:27-31,48 | Un reintento idempotente responde 201 con un `transferId` que no existe. | Devolver el id existente con 200. |
| 7 | P1 | Función | inventory.ts:97; reservas/expirar/route.ts:6 | La expiración solo corre por POST manual; sin cron ni botón. | Job programado (junto al cron de pedidos) + botón con `inventory.reserve`. |
| 8 | P2 | Datos | Workspace:341,352 | Idempotency-Key nueva en cada llamada. | Clave estable por formulario. |
| 9 | P2 | Función | transferencias/route.ts:36; [id]/route.ts:22-34; inventory-workflow.ts:24-30 | `requestedBy:null`; "requiere aprobación" sin paso de aprobación; link sin filtro. | Registrar actor; definir aprobación o cambiar el texto; link `?tab=transfers&transferId=`. |
| 10 | P2 | Estados | page.tsx:26; contract:73,88,94,105 | Un parámetro inválido lanza la pantalla de "error de PostgreSQL". | Ignorar/normalizar y avisar. |
| 11 | P2 | UI | error.tsx:8-9; loading.tsx:5-10 | Markup propio con hex. | `AdminSegmentError` y skeleton del kit. |
| 12 | P2 | A11y | Workspace (35× `text-[8px]`, 70× `text-[9px]`) | Acciones a 8–9 px. | ≥ 11–12 px y área táctil ≥ 32 px. |
| 13 | P2 | Función | service:120-131,592 | Filtros SIN_SALDO y BAJO siempre vacíos. | Quitarlos de los facets hasta tener umbral. |
| 14 | P2 | Enlaces | Workspace:2817 | Tarjeta "Saldos críticos" no clicable. | Enlazar a `?status=CRITICO`. |
| 15 | P3 | Rendimiento | service:194-223,527-542 | 3 subconsultas correlacionadas por fila, 3 rondas secuenciales. | LATERAL join, paralelizar media. |
| 16 | P3 | Rendimiento | service:765-773 | Export del Kardex en bucle secuencial. | Una consulta en streaming. |
| 17 | P3 | Datos | contract:137-138 | Fechas del Kardex sin validar → 500. | `parseDate`. |
| 18 | P2 | Tests | scripts/test-all.mjs:6-10 | admin-inventory-ui-contract, cp030-transfer-workflow, cp030-inventory-unknown, cp033-inventory-contract, cp033-inventory-ui-contract no corren. | Tests de comportamiento en `test:all`. |

## Plan de corrección
1. #2 (rutas de reservas rechazan `order`; UI oculta acciones).
2. #6, #8 idempotencia.
3. #3, #7 listas paginadas + expiración programada.
4. #4, #5, #14 filtros y enlaces.
5. #9–#13 textos, error.tsx, tipografía.
6. #15–#18 rendimiento y tests.

## Criterio de aceptación
- ALMACEN 1920/390: `?critical=true` y `?productId=X` filtran; recibe el traslado nº 9+; doble envío = un movimiento; no hay consumir/liberar en reservas de pedido.
- Pedido pagado tras `paymentDueAt` sigue reservado después de expirar y se puede entregar. (Cubierto por smoke cp060.)
- COMPRAS: desde un crítico, "Crear solicitud" abre compras con el producto.
- URL inválida → aviso, no error de BD. `tsc`, `lint`, `test:all` verdes, consola limpia.

---

# Auditoría Compras/Proveedores
Rutas: /admin/compras, /admin/compras/proveedores/[id] · Componentes: AdminPurchasesModule, PurchasesOperations, PurchaseActions, PurchaseRequestActions · Servicios: purchases-service.ts, purchases-repository.ts, purchases-validation.ts, purchases-contract.ts · Tablas: suppliers, purchase_requests(+items), purchases, purchase_items, purchase_receipts(+items), import_documents · Roles: COMPRAS (view/manage/receive), GERENCIA/ADMIN/OPERACIONES_VENTAS (view/receive; approve solo GERENCIA), ALMACEN (ninguno)

## Tarea del usuario
Compras aprueba/convierte solicitudes en OC, emite y sigue retrasos. Almacén registra la recepción. Gerencia aprueba y mira gasto. Siguiente acción: "Registrar recepción" y "Aprobar solicitud"; hoy los tres botones van al mismo ancla.

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| 1 | P0 | Datos | purchases-service.ts:581 | Una OC en DRAFT se puede recibir y suma stock (verificado). | Solo PENDING y PARTIAL_RECEIVED. |
| 2 | P0 | Datos | PurchaseRequestActions.tsx:54,72-76 | Convertir aplica un único `unitCost` a todas las líneas: subtotal inventado. | Costo por línea (o último costo del proveedor), validado. |
| 3 | P1 | Datos | purchases-repository.ts:448,466; AdminPurchasesModule.tsx:163,237,249,273 | Suma PEN + USD y formatea con la moneda de la primera fila. | Agrupar por moneda. |
| 4 | P1 | Función | roles.ts:54; AdminPurchasesModule.tsx:177,487 | ALMACEN no puede recibir; el formulario se oculta con `canManage` aunque GERENCIA/ADMIN tengan `receive`. | Recepción condicionada a `purchases.receive`; dar receive a ALMACEN. |
| 5 | P1 | Función | AdminPurchasesModule.tsx:417-423,462; solicitudes/[id]/route.ts:24; compras/[id]/route.ts:6 | Botones visibles sin permiso → 403. | Pasar `canApprove`/`canManage`. |
| 6 | P1 | Datos | PurchasesOperations.tsx:29-34,640-650 | Recepción sin Idempotency-Key. | Clave estable por formulario. |
| 7 | P1 | Función | PurchasesOperations.tsx:134,287-293,650; compras/page.tsx:133-134 | Recepción de un producto por vez, buscando en todo el catálogo; OC pendientes solo de la página actual. | Elegir OC → sus líneas con pendiente, multi-línea, búsqueda en servidor. |
| 8 | P1 | Estados | src/app/admin/compras/ (sin error.tsx); page.tsx:40 | Filtro inválido o caída de BD cae al boundary raíz. | `error.tsx` con `AdminSegmentError`; filtros inválidos avisados. |
| 9 | P2 | Enlaces | AdminPurchasesModule.tsx:334,440-452,460; proveedores/[id]/page.tsx:40 | Proveedor, SKU, OC y recepciones sin links. | IDs enlazados con filtro. |
| 10 | P2 | UI | AdminPurchasesModule.tsx:179-190 | Tres botones al mismo `#purchase-tools`. | Cada botón a su paso/drawer. |
| 11 | P2 | Función | AdminPurchasesModule.tsx:365-369; page.tsx:61-65 | Carga 25 solicitudes, muestra 5, sin paginación; "Ver pendientes" borra filtros. | Paginación; respetar query. |
| 12 | P2 | UI | proveedores/[id]/page.tsx:40; AdminPurchasesModule.tsx:387 | Enums crudos. | Etiquetas en español con StatusBadge. |
| 13 | P2 | Estados | proveedores/[id]/page.tsx:38 | Proveedor inexistente → 200; sin loading. | `notFound()` + skeleton. |
| 14 | P2 | UI | proveedores/[id]/page.tsx:28-40; PurchaseActions.tsx; PurchaseRequestActions.tsx; AdminPurchasesModule.tsx | Hex sueltos. | Tokens y kit. |
| 15 | P2 | Rendimiento | page.tsx:70; purchases-repository.ts:484-487,533 | Scorecard dos veces por carga, sin límite. | Una vez, agregado en SQL. |
| 16 | P3 | Datos | purchases-repository.ts:532 | "Pendientes de aprobación" incluye APPROVED. | Solo SUBMITTED. |
| 17 | P3 | Datos | purchases-repository.ts:428-432,499-501 | "Incidencias" = OC abiertas de proveedor inactivo. | Renombrar o definir. |
| 18 | P3 | UI | PurchasesOperations.tsx:711-714 | Copy técnico "Genera `PURCHASE_RECEIPT`". | Copy de negocio. |
| 19 | P3 | Datos | purchases-service.ts:560-573 | Clave reutilizada en otra OC devuelve la recepción ajena. | Verificar `purchaseId`. |
| 20 | P2 | Tests | test-all.mjs | admin-purchases-ui-empty-states fuera; idempotencia solo en runtime; cp039 es regex. | Tests de servicio en `test:all`. |

## Plan de corrección
1. #1, #6, #19 servicio + post idempotente. 2. #2 costo por línea. 3. #4, #5 roles y permisos en UI. 4. #7, #10, #11 recepción por líneas de OC. 5. #3, #15, #16 repository. 6. #8, #12–#14 estados y UI. 7. #9, #18, #20 enlaces, copy, tests.

## Criterio de aceptación
- COMPRAS: convierte solicitud de 2 SKU con costos distintos → subtotal correcto; no ve "Aprobar".
- GERENCIA: aprueba; no ve "Emitir/Cancelar"; gasto separado por moneda.
- ALMACEN/GERENCIA: recibe OC PENDING por líneas; reintento no duplica stock; OC DRAFT rechazada.
- `?status=foo` → aviso; caída de BD → `AdminSegmentError`; proveedor inexistente → 404. Todos los códigos son links.
