# CP-050 — Centro operativo — QA

## Evidencia

- Ruta local validada en Brave: `/admin/operaciones`, con selección real `?queue=orders`, tabs con conteos, tabla paginada, deep links, rail de alertas y estados honestos.
- Las colas se calculan desde dominios reales de CRM, cotizaciones, pedidos, inventario y tareas; la vista no presenta carga de equipo como rating ni agrega información financiera.
- `operations_work_items` persiste asignación, equipo, urgencia, vencimiento, historial, toma, reasignación y resolución de seguimientos en una transacción con el dominio CRM. La carga por equipo usa esa fuente persistida.
- Exportación, RBAC, filtros server-side, reconciliación de pagos, bloqueos y transferencias fueron verificados; la vista desktop y la consola local quedaron estables. La matriz responsive exacta queda pendiente por la limitación de viewport de esta sesión.

## Límites verificados

- No existe una política SLA persistida para prometer tiempos de atención; la UI muestra edad del pedido o `N/D · sin política SLA` según la fuente disponible.
- El remoto no refleja esta versión y la suite global de inventario requiere un workbook canónico ausente.

## Verificación automatizada

Contrato/runtime CP049, transacciones/runtime CP050, contratos/runtimes CP041–CP050, `tsc`, `lint` y `build`: PASS. `test:inventory`: BLOQUEADA por archivo externo ausente.

final result: verified locally; remote preview, responsive matrix and canonical inventory source pending
