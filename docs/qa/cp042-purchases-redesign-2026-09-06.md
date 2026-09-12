# CP-042 — Compras — QA

## Evidencia

- Ruta local validada en Brave: `/admin/compras` en el viewport de escritorio disponible; los breakpoints responsive quedan implementados pero la matriz exacta mobile no se pudo certificar en esta sesión.
- La pantalla consume proveedores, órdenes de compra, recepciones y documentos persistidos; el buscador de productos es remoto y no precarga 2.000 registros.
- Se mantienen estados vacíos honestos para solicitudes, alertas y métricas sin fuente; no se inventan proveedores, costos ni recepciones.

## Límites verificados

- Las solicitudes de compra, aprobación, conversión solicitud→OC, entrega esperada, recepción, documentos y auditoría usan entidades persistidas y servicios transaccionales.
- El cálculo de landed cost y performance histórica permanece `N/D` cuando faltan método de asignación, unidades comparables o snapshots confiables; no se inventan valores.
- El workbook canónico de inventario está ausente y el dominio remoto continúa desactualizado en `dev.coldpower.pe`.

## Verificación automatizada

Contratos CP041–CP050, runtime CP041–CP050, `tsc`, `lint` y `build`: PASS. `test:inventory`: BLOQUEADA por fuente externa ausente.

final result: verified locally; external inventory source and remote preview pending
