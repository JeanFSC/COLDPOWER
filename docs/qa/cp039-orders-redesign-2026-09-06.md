# CP-039 — Gestión de pedidos

Fecha: 2026-09-06  
Entorno: `https://dev.coldpower.pe` en la sesión autenticada del usuario  
Script de arranque: `ops/start-public.ps1`

Base SHA: `df60352` (working tree con cambios no commiteados de CP037–CP040).

## Artefactos

- UI: `src/components/admin/OrdersControlCenter.tsx`.
- Página y API: `src/app/admin/pedidos/`, `src/app/api/admin/pedidos/`.
- Datos y fulfillment: `src/lib/orders-repository.ts`, `src/lib/order-fulfillment-service.ts`.
- Idempotencia de estados: `drizzle/0041_cp039_order_status_idempotency.sql`, `src/lib/sales-service.ts` y `src/app/api/admin/pedidos/[id]/route.ts`.

## Resultado ejecutivo

El centro `/admin/pedidos` carga con datos reales. Los cinco KPI observados fueron:

| KPI | Valor observado |
| --- | ---: |
| Pedidos activos | 67 |
| En preparación | 14 |
| Listos | 13 |
| En tránsito | 13 |
| Pendientes | 14 |

## Cambios verificados

- Filtros URL/server-side de búsqueda, cliente, vendedor, estado logístico, método de entrega, local, moneda, incidencia abierta, fechas y conciliación de pago.
- Tabla paginada con pedido, cliente, productos preparados/solicitados, total, estado logístico, atención, entrega, pago y local.
- Drawer probado con las pestañas Resumen, Productos, Preparación, Entrega, Pago e Historial.
- Picking usa `pickedQuantity` y limita el avance a la cantidad solicitada; la barra de picking deriva de cantidades reales.
- Las transiciones dependen del método de entrega y del estado; cancelación exige motivo y respeta la condición de pagos/reservas.
- Incidencias se registran mediante entidad propia, pueden asociarse a una línea, marcarse como bloqueadoras y resolverse desde el drawer; no editan stock directamente.
- Pago y logística permanecen separados, con enlace a Pagos.
- Se eliminó la barra KPI arbitraria que multiplicaba el valor por una constante visual.
- Las cuatro colas operativas se calculan con consultas server-side independientes y devuelven hasta cinco pedidos del alcance filtrado, no solo de la página visible.
- La exportación filtrada incluye productos preparados, pago, atención, entrega, local y vendedor, no solo los campos básicos del pedido.
- La navegación al módulo dispone de un `loading.tsx` estructural con skeleton para encabezado, KPI, colas, filtros y tabla.
- El segmento dispone de `error.tsx` con alerta accionable, reintento y mensaje seguro que no expone detalles internos.

## Pruebas

- `corepack pnpm test:cp039-orders`: 11/11 PASS (contrato de pedidos, incidencias, exportación, estados de carga/error, recepción parcial/idempotencia, state machine por entrega, validación de picking y guardia de moneda).
- Migración `0041_cp039_order_status_idempotency.sql`: aplicada y verificada en PostgreSQL (`order_status_history.idempotency_key`).
- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm lint`: 0 errores; quedan 14 warnings preexistentes en otros archivos.
- `corepack pnpm test:all`: los bloques previos pasan (69/69, 47/47, 26/26 y 13/13); la fase de inventario queda en 19/20 por el archivo canónico ausente `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`.
- Auditoría PostgreSQL de solo lectura: 120 pedidos con 120 líneas, 0 diferencias de moneda venta–pedido–línea–pago, 0 pedidos sin líneas, 0 ventas sin líneas y 0 pagos sin historial; migración más reciente registrada: 44.
- `git diff --check`: sin errores de whitespace; solo avisos LF/CRLF de Git.

## Evidencia de navegador

En Brave se abrió un pedido real `PED-DEV-001` y se comprobaron el resumen, las pestañas Resumen, Productos, Preparación y Entrega, además de picking basado en cantidades reales, sin ejecutar transiciones. El viewport disponible mostró la tabla desktop; la matriz exacta 1440x900, 1024x768, 768x900 y 390x844 no se declara como captura independiente porque esta sesión no permite cambiar programáticamente el viewport. La estructura responsive cubre el paso a tarjetas y el reflujo de filtros.

Las capturas se inspeccionaron durante esta ejecución mediante CUA. Esta API no exporta los bytes como archivos persistentes, por lo que no se fabricaron PNG falsos ni se declara la existencia de `cp039-*.png` en el repositorio.

## Observaciones pendientes

- La prueba de cola global se ejecutó contra PostgreSQL y devolvió `prepare=5`, `dispatch=5`, `pickup=0` e `incidents=0` en la primera página de datos.
- La cobertura de dominio ya valida picking parcial/completo, límites, pickup/delivery/shipping, SHIPPED y transiciones cerradas sin mutar producción. La ejecución de fixtures de mutación sobre órdenes reales (picking, incidencia, cancelación pagada y entrega) sigue pendiente de un entorno aislado/autorizado.
- La comprobación autenticada del endpoint público sirvió el nuevo skeleton de carga y luego el dashboard actualizado; no se ejecutó `ops/start-public.ps1` ni se añadió supervisión automática.
- Si se requieren archivos PNG versionados como entregable, falta exportarlos desde una herramienta de captura que permita guardar la evidencia; la revisión responsive exacta por viewport sigue pendiente.
