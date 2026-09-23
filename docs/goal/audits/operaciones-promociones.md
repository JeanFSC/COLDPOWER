# Auditoría Operaciones y Promociones — 2026-09-22

> Auditoría de código (lectura) contra GOAL-IMPECABLE §4. Críticos: **Promociones #1** (una promoción rechazada se sigue aplicando en el checkout) y **#2** (un precio especial mayor al de lista rompe la cuadratura de la venta).

# Auditoría Operaciones
Rutas: /admin/operaciones, /api/admin/operaciones, [id], export · Componentes: OperationsCenter (+ .module.css), OperationsWorkItemAction · Servicios: operations-workspace.ts, operations-work-items-service.ts, operations-day-summary.ts, operations-contract.ts · Tablas: operations_work_items(+history), audit_logs, crm_tasks

## Tarea del usuario
El líder de operaciones o ventas abre la cola del día, toma una tarea, la reasigna, salta al módulo dueño y la cierra. Gerencia mira carga del equipo, vencidos y hoy vs ayer.

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| 1 | P1 | Datos | operations-work-items-service.ts:104-134; operations-workspace.ts:971 | Los ítems se crean al leer la página y nunca pasan a STALE/RESOLVED cuando la fuente sale de su cola. Infla pendientes, vencidos y carga del equipo. | Reconciliar: cerrar ítems cuya fuente ya no está en la proyección, o cerrar desde el dominio al cambiar estado. |
| 2 | P1 | Datos | operations-work-items-service.ts:290-298 | Completar la tarea en CRM no cierra el ítem. | Resolver el ítem en la misma transacción. |
| 3 | P1 | Enlaces | operations-workspace.ts:152,162,167,172,177,224 | Links a CRM con `opportunityId/taskId/action` que CRM ignora. | Abrir el drawer correcto. |
| 4 | P1 | Enlaces | operations-workspace.ts:139-147,185-214 | `quoteId`, `orderId`, `action` no los lee ningún módulo. | Abrir el registro con la acción. |
| 5 | P2 | Función | operations-workspace.ts:228-229; OperationsCenter.tsx:581,1573 | "Resolver tarea" apunta a un GET de API y la UI la filtra: acción muerta. | Usar el PATCH `resolve` existente. |
| 6 | P2 | Rendimiento | operaciones/page.tsx:57; operations-workspace.ts:872-888,971 | Cada GET escribe en BD (hasta 5×1000 filas upsert) + 4 lecturas extra. | Sincronizar fuera de la lectura (eventos/job o `after()`). |
| 7 | P2 | Rendimiento | operations-workspace.ts:996 | `loadTeamLoad` secuencial. | En paralelo. |
| 8 | P2 | Rendimiento | operations-workspace.ts:1024-1030 | Export recalcula todo por cola (5×). | Loader por cola sin upsert. |
| 9 | P2 | Roles | api/admin/operaciones/[id]/route.ts:6; OperationsCenter.tsx:1228 | Cualquiera con `operations.view` "toma" trabajo de cualquier equipo. | Permiso por equipo/fuente en UI y API. |
| 10 | P2 | Datos | operations-workspace.ts:896-902; operations-schema.ts:6 | TRANSFER, PAYMENT, PURCHASE en el enum pero nunca se generan; incidencias y reservas tampoco. | Proyectarlos o quitarlos. |
| 11 | P2 | Estados | admin/operaciones/ (sin error.tsx); page.tsx:61-73 | Lecturas sin `.catch`; sin reintentar. | `error.tsx` con `AdminSegmentError`. |
| 12 | P3 | UI | OperationsCenter.module.css (82 hex, 21 reglas a 8–9 px); OperationsWorkItemAction.tsx:66-138 | Hex sueltos y texto ilegible. | Tokens, ≥ 11–12 px. |
| 13 | P3 | Función | OperationsWorkItemAction.tsx:42 | `payload.error` es objeto: el mensaje real no llega. | `payload.error.message`. |
| 14 | P2 | Tests | test-all.mjs | cp049-operations, cp049-runtime-data, operations-comparison fuera. | Enganchar + test de ciclo de vida. |

## Criterio de aceptación
VENTAS toma un seguimiento, lo completa en CRM y desaparece de Operaciones ("Resueltas hoy"). Pedido entregado → su ítem sale de la cola y de la carga. Cada "Abrir" abre el registro. ALMACEN no toma una cotización (403 UI y API). Falla de BD → error.tsx con reintentar. cp049 en `test:all`.

---

# Auditoría Promociones
Rutas: /admin/promociones, /api/admin/promociones, [id], [id]/approval, [id]/preview, export · Componentes: PromotionForm, PromotionStatusControl · Servicios: promotion-repository.ts, promotion-service.ts, operations-validation.ts, sales-service.ts · Tablas: promotions, promotion_products, promotion_categories, promotion_applications, discount_rules

## Tarea del usuario
Gerencia y ventas crean una campaña (% , monto o precio especial) por producto o categoría, la aprueban si supera el umbral, la activan y verifican que afecta compras reales.

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| 1 | P0 | Datos | promotion-service.ts:18; [id]/approval/route.ts:20 | El checkout toma promociones por `status=ACTIVE` y fechas, ignorando `approvalStatus`: una promoción RECHAZADA activa se aplica a pedidos reales. | Rechazar desactiva; el checkout filtra `approvalStatus IN (APPROVED, NOT_REQUIRED)`. |
| 2 | P0 | Datos | promotion-service.ts:55; sales-service.ts:50,120 | `SPECIAL_PRICE` sin tope: si es mayor al precio base, las líneas suben pero el total no → la venta no cuadra. | `min(value, base)` o rechazar; test "suma de líneas = total". |
| 3 | P1 | Datos | shopping-cart-service.ts:184 | El carrito y la ficha muestran precio sin promoción; el checkout cobra otro. | Misma función de precio (solo lectura) en carrito, ficha y checkout. |
| 4 | P1 | Función | [id]/approval y [id]/preview sin UI; page.tsx:20 | Un % sobre el umbral nunca se puede activar (no hay botón de aprobar); preview sin uso. | Columna de aprobación, Aprobar/Rechazar con `pricing.discount.approve`, preview con precio real. |
| 5 | P1 | Estados | PromotionStatusControl.tsx:7 | Sin catch: un 409 falla en silencio. | Mostrar `error.message`. |
| 6 | P2 | Función | PromotionForm.tsx:6 | Errores "[object Object]". | `result.error?.message`. |
| 7 | P2 | Función | PromotionForm.tsx:6 | IDs a mano separados por coma; sin editar ni detalle. | Pickers con búsqueda + drawer de edición. |
| 8 | P2 | Datos | PromotionForm.tsx:6; operations-validation.ts:12,16 | Fechas sin zona → ventana corrida 5 h. | Enviar con −05:00. |
| 9 | P2 | Roles | promociones/page.tsx:19-20; export/route.ts:14 | "Exportar" visible sin permiso → 403. | Ocultar según `promotions.export`. |
| 10 | P2 | Enlaces | admin/layout.tsx:10-40 | Fuera del menú; sin enlaces Precios ↔ Promociones. | En el grupo de Precios. |
| 11 | P2 | UI | page.tsx:20; PromotionForm.tsx:6 | Tokens de tienda, enums crudos, sin filtros, tabla sin móvil. | Kit admin, etiquetas en español. |
| 12 | P2 | Estados | admin/promociones/ (sin error.tsx); loading.tsx:6-16 | Sin reintentar; hex en skeleton. | `error.tsx` y tokens. |
| 13 | P2 | Rendimiento | sales-service.ts:48-49; promotion-service.ts:15-45 | 6–8 consultas secuenciales por línea dentro de la transacción. | Cargar candidatos una vez por checkout. |
| 14 | P2 | Tests | test-all.mjs; cp048-promotions.test.ts:29-47 | cp048 fuera y basado en strings. | Tests de comportamiento en `test:all`. |
| 15 | P3 | Datos | approval/route.ts:17-20 | El mismo usuario crea y aprueba. | Bloquear autoaprobación. |

## Criterio de aceptación
GERENCIA crea 30 % para una categoría, la aprueba y activa: carrito y ficha muestran el precio con descuento y el total del pedido = suma de líneas. Rechazada → siguiente checkout cobra el base. Precio especial > base rechazado. ADMIN: 409 legible, sin botón exportar. cp048 en `test:all`.
