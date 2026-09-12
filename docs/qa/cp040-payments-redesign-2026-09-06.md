# CP-040 — Gestión de pagos

Fecha: 2026-09-06  
Entorno: `https://dev.coldpower.pe` en la sesión autenticada del usuario  
Script de arranque: `ops/start-public.ps1`

Base SHA: `df60352` (working tree con cambios no commiteados de CP037–CP040).

## Artefactos

- UI: `src/components/admin/PaymentsControlCenter.tsx`.
- Página y API: `src/app/admin/pagos/`, `src/app/api/admin/pagos/`.
- Datos y reglas: `src/lib/payments-repository.ts`, `src/lib/payment-service.ts`.

## Resultado ejecutivo

El centro `/admin/pagos` carga desde PostgreSQL con los cinco KPI requeridos:

| KPI | Valor observado |
| --- | ---: |
| Monto confirmado | S/ 55,260.00 PEN, neto de reembolsos exitosos |
| Órdenes conciliadas | 30 |
| Pendientes | 30 |
| Observados | 0 |
| Tasa de conciliación | 100% sobre 30 órdenes con pago neto |

La moneda está separada y los pagos pendientes/no confirmados no se suman al monto confirmado.

## Cambios verificados

- Filtros URL/server-side de búsqueda, estado, conciliación, método/tipo, proveedor, cliente, pedido, moneda y fechas.
- Tabla paginada con pago legible, cliente, pedido enlazado, monto, método, estado, conciliación, referencia y fecha.
- Drawer probado con Resumen, Conciliación, Intentos, Eventos, Reembolsos e Historial.
- Conciliación muestra esperado, recibido bruto, reembolsado, neto y diferencia.
- El drawer conserva actualización de proveedor cuando existe proveedor/referencia, pago manual sujeto a permiso y reembolso sujeto a saldo/motivo/idempotencia.
- La cola está separada en Pendientes, Con diferencia, Errores de proveedor y Reembolsos; cada caso muestra pago, cliente, pedido, esperado, neto, diferencia y estado/reason, con CTA “Ver todos”.
- Las cuatro colas se calculan con consultas server-side independientes y devuelven hasta cinco pagos del alcance filtrado, sin depender de la página visible.
- Se usan etiquetas humanas en estados y métodos; no se editan montos confirmados.
- La exportación financiera incluye esperado, neto recibido, diferencia y estado de conciliación por pago.
- La navegación al módulo dispone de un `loading.tsx` estructural con skeleton para encabezado, KPI, colas, filtros y tabla.
- El segmento dispone de `error.tsx` con alerta accionable, reintento y mensaje seguro que no expone detalles internos.

## Pruebas

- `corepack pnpm test:cp040-payments`: 10/10 PASS (ledger de múltiples cobros, parcial, sobrepago, reembolsos parcial/full/pending, guardia de moneda, exportación financiera y estados de carga/error).
- `corepack pnpm exec tsc --noEmit`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm lint`: 0 errores; quedan 14 warnings preexistentes en otros archivos.
- `corepack pnpm test:all`: los bloques previos pasan (69/69, 47/47, 26/26 y 13/13); la fase de inventario queda en 19/20 por el archivo canónico ausente `INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`.
- Auditoría PostgreSQL de solo lectura: 60 pagos, 0 reembolsos, 0 diferencias de moneda, 0 pagos sin historial y 585 auditorías; migración más reciente registrada: 44.
- `git diff --check`: sin errores de whitespace; solo avisos LF/CRLF de Git.

## Evidencia de navegador

En Brave se abrió el pago real `PAGO-001`/`DEV-PAY-001` y se comprobaron el resumen, las seis pestañas, la conciliación y los controles condicionados sin ejecutar refresh, pago manual ni reembolso. El viewport disponible mostró métricas legibles en escritorio; la matriz exacta 1440x900, 1024x768, 768x900 y 390x844 no se declara como captura independiente porque esta sesión no permite cambiar programáticamente el viewport. Los contratos y clases responsive cubren el paso de KPI a tarjetas móviles.

Las capturas se inspeccionaron durante esta ejecución mediante CUA. Esta API no exporta los bytes como archivos persistentes, por lo que no se fabricaron PNG falsos ni se declara la existencia de `cp040-*.png` en el repositorio.

## Observaciones pendientes

- La prueba de cola global se ejecutó contra PostgreSQL y devolvió `pending=5`, `difference=0`, `providerErrors=0` y `refunds=0` en la primera página de datos.
- La cobertura de dominio ya valida que PENDING/REJECTED no suman, los reembolsos solo descuentan al estar SUCCEEDED y la idempotencia queda preservada. La ejecución de refresh/provider/error/refund contra fixtures mutantes sigue pendiente de un entorno financiero aislado/autorizado; esta ronda no cambió datos reales.
- Si se requieren archivos PNG versionados como entregable, falta exportarlos desde una herramienta de captura que permita guardar la evidencia; la revisión responsive exacta por viewport sigue pendiente.
