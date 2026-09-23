# Auditoría Ventas, Pedidos y Pagos — 2026-09-22

> Auditoría de código (lectura) en HEAD `4260869`, contra GOAL-IMPECABLE §4 y los P1 abiertos de `docs/qa/audit-tanda2-visual-accesibilidad-logica-2026-09-06.md`.
> Estado: **O1 corregido** (reservas de pedidos pagados ya no vencen: `markOrderPaid` y `registerManualPayment`). **G1 verificado por Claude** (pago tardío queda CANCELLED e irrecuperable).

Tests (solo lectura): cp037-sales 8/8, cp038-orders 8/8, cp039-fulfillment + cp040-payments 13/13, sales-route-contract 5/5, cp027-payments-panel 1/1, **admin-payments-ui-contract 0/1**, **admin-sales-ui-contract 1/2**, admin-orders-ui-contract 1/1 (valida componente muerto). Ninguno `admin-*-ui-contract` está en `test-all.mjs`. Fallan porque verifican `PaymentActions`/`SalesActions`/`OrderStatusControl`, que ya no se importan.

# Auditoría Ventas
Ruta: /admin/ventas · SalesControlCenter · sales-repository, sales-contract, api/admin/ventas/** · Tablas: sales, sale_items, orders, payments, payment_refunds, audit_logs

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| V1 | P1 | Datos | SalesControlCenter.tsx:396-397 | "Pendiente S/ 0.00" en venta impaga (abierto desde tanda2). | "Saldo S/ X" o "Recibido S/ 0 de S/ Y". |
| V2 | P1 | Datos | api/admin/ventas/[id]/route.ts:34 | Anular solo bloquea con pago CONFIRMED; con APPROVED se anula con dinero recibido. | Guard compartido CONFIRMED/APPROVED. |
| V3 | P2 | Datos | api/admin/ventas/[id]/route.ts:32,39,43 | Anula desde READY/IN_TRANSIT/SHIPPED saltándose la máquina de estados; libera reservas sin mirar estado; deja UNDER_REVIEW vivo. | Pasar por `changeOrderStatus`; cancelar pagos PENDING y UNDER_REVIEW. |
| V4 | P2 | Función | SalesControlCenter.tsx; SalesActions.tsx | Ninguna UI llama al PATCH de anulación. | "Anular venta" en el drawer con `sales.cancel` y motivo. |
| V5 | P2 | Datos | sales-repository.ts:564,1082 | Historial vacío: la creación se audita como `order`/`quote`; acciones crudas. | Incluir eventos de `order` y `quote`, etiquetas en español. |
| V6 | P2 | Datos | SalesControlCenter.tsx:772,845,1049 | Fecha de factura en UTC → +5 h; placeholder `aaaa-mm-ddT--:--`. | Hora local Lima y campo de fecha del kit. |
| V7 | P2 | UI | SalesControlCenter.tsx:191-194 | Chip "Últimos 30 días" sin filtro real. | Filtro real o quitar chip. |
| V8 | P2 | Datos | SalesControlCenter.tsx:170-174 | Dona usa solo la primera moneda. | Una por moneda o selector. |
| V9 | P2 | Enlaces | SalesControlCenter.tsx:376,384-392,445,448,1097,1099 | Compras web rotuladas "Venta directa"; cotización/pedido sin links; colas sin filtro. | Links con filtro; origen desde `channel`. |
| V10 | P3 | A11y | SalesControlCenter.tsx:364 | Cabecera de acciones vacía. | "Acciones". |
| V11 | P2 | Tests | admin-sales-ui-contract.test.mjs:13 | Falla (componente muerto) y no está en test-all. | Reescribir contra SalesControlCenter. |

## Criterio de aceptación
VTA-DEV-024 muestra "Saldo S/ 2,532.00"; anular con pago APPROVED → 409; historial con evento de creación; fecha 10:00 sigue 10:00; IDs enlazados; contrato UI en `test:all`.

---

# Auditoría Pedidos
Ruta: /admin/pedidos · OrdersControlCenter · orders-repository, orders-contract, sales-service.changeOrderStatus, order-fulfillment-service, shipment-service · Tablas: orders, order_items, order_status_history, order_incidents, inventory_reservations, shipments

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| O1 | P0 ✅ | Datos | sales-service.ts:126; inventory.ts:99-102; payment-service.ts:123 | Reservas de pedidos pagados vencían → sobreventa y entrega fallida. | **Corregido**: `expiresAt=null` al pagar (webhook y manual). |
| O2 | P1 | Datos | OrdersControlCenter.tsx:846 | Historial muestra "undefined" (`row.status` vs `toStatus`). | `from → to`, nota y actor. |
| O3 | P1 | Datos | scripts/seed-dev-mock.ts:389,395-397 | Fixture de demo produce estados imposibles ("Entregado 0/1", "Pendiente de pago + Conciliado"). Rompe regla 7. | Fixture coherente con la máquina de estados. |
| O4 | P1 | Función | roles.ts:53 | ALMACEN sin `orders.view`/`orders.manage`. | Ver y preparar pedidos, sin acceso a pagos. |
| O5 | P2 | Datos | OrdersControlCenter.tsx:797-798 | "Reserva activa" aunque esté consumida/vencida. | Estado real. |
| O6 | P2 | UI | OrdersControlCenter.tsx:41-42,50,355,761,853 | "Pagado" en columna logística; "Pendiente" ambiguo. | PAID → "Por preparar"; cobro "Sin cobro". |
| O7 | P2 | Función | OrdersControlCenter.tsx:152 | "Preparar pedido" puede abrir uno entregado. | Cola filtrada o botón deshabilitado. |
| O8 | P2 | Datos | sales-service.ts:125; OrdersControlCenter.tsx:342 | Venta directa con cliente con cuenta → "Compra web". | Origen desde `sale.channel`. |
| O9 | P2 | Datos | sales-service.ts:230-246 | Anulación admin no cancela pagos PENDING/UNDER_REVIEW. | Cancelarlos en la misma transacción. |
| O10 | P2 | Enlaces | OrdersControlCenter.tsx:346,758,838,913; orders-repository.ts:147-152 | Cliente/venta/cotización sin links; "Gestionar pago" sin `orderId`; sin guía de envío. | Links con filtro; transportista y guía en Entrega. |
| O11 | P3 | Función | OrdersControlCenter.tsx:907; shipment-service.ts:48 | "Avanzar seguimiento" visible sin proveedor mock → 404. | Solo con mock activo. |
| O12 | P3 | A11y | OrdersControlCenter.tsx:240 | Cabecera de acciones vacía. | "Acciones". |
| O13 | P3 | Rendimiento | api/admin/pedidos/export/route.ts:16-17 | Export llama `getOrdersPage` completo cada 100 filas. | Consulta solo-lista. |
| O14 | P2 | Tests | admin-orders-ui-contract.test.mjs:11 | Valida `OrderStatusControl` muerto. | Test de OrdersControlCenter. |

## Criterio de aceptación
ALMACEN: pick +1, listo, entrega. Pedido web pagado tras `paymentDueAt` sigue reservado tras expirar y se entrega (smoke cp060 ✅). Sin "undefined". Tras re-seed: 0 entregados con picking pendiente y 0 PAYMENT_PENDING+MATCH.

---

# Auditoría Pagos
Ruta: /admin/pagos · PaymentsControlCenter, ManualPaymentControl · payments-repository, payment-service, payments-contract, sales-service.registerManualPayment · Tablas: payments, payment_attempts, payment_events, payment_status_history, payment_refunds

## Hallazgos
| # | Sev | Área | Archivo:línea | Qué pasa | Qué debería pasar |
|---|---|---|---|---|---|
| G1 | P0 | Datos | payment-service.ts:197-202,226; payments-repository.ts:11,45-48,61-64 | Aprobación tardía sobre pago CANCELLED: el pago sigue CANCELLED, no aparece en ninguna cola ni total y `refundPayment` lo rechaza. **Dinero recibido invisible e irreembolsable.** | Registrar CONFIRMED con marca "requiere reembolso", cola "Por reembolsar", notificación con deep-link. |
| G2 | P1 | Datos | payments-repository.ts:107-111,126; PaymentsControlCenter.tsx:239-246 | Tasa de conciliación 100% con 30 pendientes; cancelado+pagado sale "Conciliado". | "30 de 60"; cancelado+pagado = "Por reembolsar". |
| G3 | P1 | Datos | payment-service.ts:118; sales-service.ts:282; payments-repository.ts:11,19 | Ledger inconsistente con REFUNDED: tras reembolso total + pago nuevo, el pedido nunca pasa a PAID. | Una función de ledger compartida. |
| G4 | P1 | Función | payment-service.ts:138; PaymentsControlCenter.tsx:727-728,893; sales-service.ts:231-232 | Pagos manuales no se pueden reembolsar (503) y bloquean anular el pedido. | "Registrar devolución manual"; ocultar reembolso de proveedor. |
| G5 | P2 | Función | PaymentsControlCenter.tsx:774; payment-service.ts:132-134 | Clave de reembolso fija → no se puede reintentar tras FAILED. | Clave por intento; reintentar si FAILED. |
| G6 | P2 | Datos | PaymentsControlCenter.tsx:932 | Historial lee `row.status` → "Registro"; enums crudos. | `from → to` en español. |
| G7 | P2 | Función/UI | PaymentsControlCenter.tsx:885; ManualPaymentControl.tsx:74-113 | Pago manual ofrecido en pedidos cancelados/entregados o con pago de proveedor pendiente; monto fijo; tokens de tienda. | Condicionar por estado, avisar, monto editable, kit admin. |
| G8 | P2 | Datos | PaymentsControlCenter.tsx:139,154,162 | KPI "últimos 14 días" es histórico; moneda duplicada; unidades mezcladas. | Copy y unidades coherentes. |
| G9 | P2 | Enlaces | PaymentsControlCenter.tsx:640,817-819 | Cliente/pedido/venta sin links. | Links con filtro. |
| G10 | P3 | A11y | PaymentsControlCenter.tsx:378 | Cabecera vacía. | "Acciones". |
| G11 | P2 | Tests | admin-payments-ui-contract.test.mjs:10-20 | Falla (valida `PaymentActions` muerto). | Reescribir contra PaymentsControlCenter; borrar muertos; enganchar. |

## Criterio de aceptación
GERENCIA: webhook mock aprueba pago de pedido vencido → aparece en "Por reembolsar", se reembolsa, la notificación lo abre filtrado. KPI con numerador/denominador. Pedido pagado manual: registrar devolución y anular. Reembolso reintentable. Contrato UI de Pagos en `test:all`.

## Orden de corrección sugerido (bloque comercial)
1. G1 + O9 + V2/V3 (dinero y anulaciones). 2. G3 ledger único, G2. 3. G4, G5. 4. O2, O4, O3 fixture. 5. V1, V5, V6, O5–O8, G6–G8. 6. Enlaces V9, O10, G9. 7. Tests V11, O14, G11 y a11y.
