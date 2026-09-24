# C — QA final local de recorridos integrados

Fecha: 2026-09-24  
Base y servidor: PostgreSQL 18 local en `127.0.0.1:5433`, `.env.localdb`; build servido en `3003`.  
Objetivo: comprobar que el resultado que dispara el cliente coincide con lo que persiste y ve el personal.

## Evidencia transversal

El recorrido ejecutado de compra con delivery generó el pedido `ORD-20260924-C46B01`. La verificación SQL final registró:

```text
status=DELIVERED, total=120.00 PEN, payment_status=CONFIRMED
shipment_status=DELIVERED, tracking=CP-TRK-B8BB1A532A
picked_quantity=1, reservation_status=CONSUMED, quantity=1
on_hand=1312, reserved=0
```

Los invariantes revisados después del flujo quedaron en cero: inventario negativo/sobre-reservado, reservas activas no positivas, totales de líneas inconsistentes, pagos sin historia, pedidos sin historia, eventos duplicados y cantidades de carrito inválidas. La evidencia visual final es [`qa-final-c2-delivered-1920x1080.png`](capturas/qa-final-c2-delivered-1920x1080.png).

## Escenarios C

| Escenario | Resultado | Cliente ↔ sistema y evidencia | Factores D cubiertos | Severidad / archivo:línea |
|---|---|---|---|---|
| C1 Cotización web → venta | ❌ | Cliente creó una cotización persistida con tracking; no se completó aceptación, conversión de VENTAS, pedido y pago manual en el mismo recorrido. Capturas de contexto: [`qa-final-a1-1-producto-6871-390x844.png`](capturas/qa-final-a1-1-producto-6871-390x844.png), [`qa-final-b1-quotes-superadmin-1920x1080.png`](capturas/qa-final-b1-quotes-superadmin-1920x1080.png). | Anónimo; cotización; RBAC; estados; dinero; auditoría. | P1 cobertura pendiente; —. |
| C2 Compra online con delivery | ✅ | Cliente agregó producto con precio, pagó mock; staff avanzó preparación, picking, listo, shipment, seguimiento y entrega; cliente vio timeline, guía y receptor. Captura: [`qa-final-c2-delivered-1920x1080.png`](capturas/qa-final-c2-delivered-1920x1080.png). | Cliente/staff; reserva; dinero; transiciones; shipment; Lima; SQL. | —; verificación final incluida arriba. |
| C3 Pago rechazado y vencimiento | ❌ | No se ejecutó rechazo, vencimiento, liberación, aprobación tardía ni reembolso. | Pago; tiempo 30 min; stock; reembolso; idempotencia. | P1 cobertura financiera pendiente; —. |
| C4 Envío a provincia | ❌ | No se completó compra con agencia, incidencia de faltante y resolución. | Provincia; agencia; incidencia; permisos; stock. | P1 cobertura logística pendiente; —. |
| C5 Recojo en tienda | ❌ | No se ejecutó modalidad PICKUP ni registro del receptor en local. | Pickup; local; receptor; estados; fecha/hora. | P1 cobertura logística pendiente; —. |
| C6 Cliente recurrente | ❌ | Se comprobó historial y acceso a repetición, pero no se repitió el pedido cruzándolo con Customer 360 y pagos desde staff. Captura: [`qa-final-a3-account-1920x1080.png`](capturas/qa-final-a3-account-1920x1080.png). | Historial; cliente 360; links; persistencia; volumen. | P2 cobertura pendiente; —. |
| C7 Stock agotado concurrente | ❌ | No se ejecutó la carrera de dos clientes sobre la última unidad ni la alerta/OC posterior. | Concurrencia; última unidad; reserva; alerta; compras. | P1 cobertura de concurrencia pendiente; —. |
| C8 Promoción | ❌ | No se creó/aprobó/rechazó una promoción y no se comparó ficha, carrito y pedido. | GERENCIA; precio; descuento; moneda; consistencia. | P1 cobertura financiera pendiente; —. |
| C9 Devolución/anulación | ❌ | No se ejecutó anulación después de pago, bloqueo por dinero, devolución y cancelación final. | Dinero; cancelación; devolución; auditoría; idempotencia. | P1 cobertura financiera pendiente; —. |
| C10 Producto nuevo | ❌ | No se creó un producto con foto/precio/stock, se publicó y se buscó desde la tienda. CMS oculto no fue tocado. | SUPERADMIN; media; publicación; caché; búsqueda; stock. | P1 cobertura de catálogo pendiente; —. |

## Secuencia y seguridad

La secuencia C2 no permitió saltar directamente a entrega: preparación, picking, listo, shipment y seguimiento quedaron registrados. El pedido no se entregó con reserva activa. Los tests de dominio también cubrieron transiciones inválidas e idempotencia, pero eso no reemplaza ejecutar cada recorrido de usuario C3–C10 en navegador.

No se probaron en esta pasada sesión expirada a mitad del checkout, carrito invitado → login con fusión, webhook repetido/fuera de orden, pago tardío tras cancelación, dos pestañas editando, última unidad concurrente, devoluciones, promociones, agencia ni pickup.

## Resultado global C

C2 queda aprobado con evidencia cliente → sistema → cliente y consulta SQL. C1 y C3–C10 permanecen ❌ por falta de recorrido completo, no porque se haya demostrado un fallo en todos ellos. El siguiente bloque de QA debe priorizar C1, C3, C7, C8 y C9 por riesgo de dinero, stock y consistencia.
