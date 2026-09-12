# CP-038 — Gestión de ventas

Fecha: 2026-09-06  
Entorno: `https://dev.coldpower.pe` en la sesión autenticada del usuario  
Script de arranque: `ops/start-public.ps1`

Base SHA: `df60352` (working tree con cambios no commiteados de CP037–CP040).

## Artefactos

- UI: `src/components/admin/SalesControlCenter.tsx`.
- Página y API: `src/app/admin/ventas/`, `src/app/api/admin/ventas/`.
- Datos y reglas: `src/lib/sales-repository.ts`, `src/lib/sales-service.ts`, `src/lib/sales-validation.ts`.

## Resultado ejecutivo

El centro `/admin/ventas` carga con datos reales y sus cinco KPI son server-side. En el alcance completo observado:

| KPI | Valor observado |
| --- | ---: |
| Ventas confirmadas | 120 |
| Monto vendido | S/ 313,960.00 PEN |
| Cobrado | S/ 55,260.00 PEN, neto de pagos confirmados |
| Ticket promedio | S/ 2,616.33 PEN |
| Alertas | 10 |

La agregación monetaria conserva las monedas separadas; no se consolida PEN con USD.

## Cambios verificados

- Búsqueda server-side probada con `CP-COT-DEV-001`: devolvió una venta real y sus documentos relacionados. El repositorio también contempla código de venta, cliente, cotización, pedido y referencia de factura externa.
- El KPI de alertas se calcula sobre todo el resultado filtrado, no sobre las 25 filas de la página.
- Las colas de Cobros pendientes, Facturación y Validación se calculan con consultas server-side independientes y devuelven hasta cinco casos del alcance filtrado, aunque no estén en la página visible.
- Se eliminaron barras KPI con anchos arbitrarios; la línea inferior es decorativa y no comunica una magnitud inventada.
- Drawer de venta con las pestañas Resumen, Productos, Cobros, Pedido, Facturación e Historial.
- Resumen probado con cliente y vendedor humanos, cotización, oportunidad, fecha, subtotal, descuento y saldo.
- Cobros muestra esperado, recibido bruto, reembolsado, neto, saldo y diferencia; los reembolsos exitosos se descuentan desde la fuente persistente por pago.
- Productos usa snapshots de venta y el pedido mantiene enlace al módulo correspondiente.
- Facturación registra únicamente estado, referencia, fecha y nota externa; no genera una factura fiscal ficticia y valida la fecha antes de persistir.
- La exportación filtrada incluye documentos relacionados, estado de cobro, vendedor, recibido, reembolsado y diferencia, además de los datos comerciales de la venta.
- Venta directa y conversión desde cotización permanecen protegidas por sus servicios transaccionales y permisos.
- La navegación al módulo dispone de un `loading.tsx` estructural con skeleton para encabezado, KPI, analítica, filtros y tabla.
- El segmento dispone de `error.tsx` con alerta accionable, reintento y mensaje seguro que no expone detalles internos.

## Pruebas

- `corepack pnpm test:cp038-sales`: 8/8 PASS, incluyendo la guardia de moneda, RBAC financiero, columnas de exportación y estados de carga/error.
- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm lint`: 0 errores; quedan 14 warnings preexistentes en otros archivos.
- `corepack pnpm test:all`: los bloques previos pasan (69/69, 47/47, 26/26 y 13/13); la fase de inventario queda en 19/20 por el archivo canónico ausente `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`.
- Auditoría PostgreSQL de solo lectura: 120 ventas con 120 líneas, 0 diferencias de moneda entre ventas y líneas/pagos, 0 ventas sin líneas y 585 auditorías; migración más reciente registrada: 44.
- `git diff --check`: sin errores de whitespace; solo avisos LF/CRLF de Git.

## Evidencia de navegador

En Brave se verificaron la página, el filtro por cotización, el drawer y las pestañas Resumen, Cobros y Facturación sin mutar datos. El viewport disponible mostró KPI y analítica en escritorio; la matriz exacta 1440x900, 1024x768, 768x900 y 390x844 no se declara como captura independiente porque esta sesión no permite cambiar programáticamente el viewport. Los contratos y clases responsive cubren el reflujo de controles y tarjetas móviles.

Las capturas se inspeccionaron durante esta ejecución mediante CUA. Esta API no exporta los bytes como archivos persistentes, por lo que no se fabricaron PNG falsos ni se declara la existencia de `cp038-*.png` en el repositorio.

## Observaciones pendientes

- La prueba de cola global se ejecutó contra PostgreSQL y devolvió `pending=5`, `invoices=5` y `alerts=5` en la primera página de datos.
- Los filtros avanzados de vendedor, cliente, conciliación de cobro, estado de pago, facturación y fechas se aplican también a KPI, analítica y colas, no solo a las 25 filas visibles.
- La prueba de margen queda condicionada a que existan datos de costo y permiso `pricing.margin.view`; no se muestra margen inventado.
- Si se requieren archivos PNG versionados como entregable, falta exportarlos desde una herramienta de captura que permita guardar la evidencia; la revisión responsive exacta por viewport sigue pendiente.
