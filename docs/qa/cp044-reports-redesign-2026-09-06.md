# CP-044 — Reportes — QA

## Evidencia

- Ruta local validada en Brave: `/admin/reportes` en el viewport de escritorio disponible; la comprobación exacta de 390×844 y 768×900 queda pendiente por la limitación de viewport de esta sesión.
- Se verifican seis KPI, rangos hoy/ayer/7 días/30 días/mes actual/mes anterior/año/personalizado, filtros de moneda PEN/USD y estados `N/D` sin denominador.
- No se muestran insights, CTR ni benchmarks inventados; gráficos y tablas solo reflejan la consulta disponible. Exportación y permisos se mantienen server-side.

## Bloqueos

- El snapshot de reportes pasa por una fachada de reporting validada; sus series actuales reutilizan el read model operativo hasta que exista un modelo analítico independiente con definiciones aprobadas.
- La programación de reportes persiste frecuencia, filtros, destinatarios internos, próxima ejecución e historial de runs; el worker de ejecución aún se muestra como pendiente.
- El remoto `dev.coldpower.pe` sigue desactualizado y la fuente canónica de inventario no está disponible.

## Verificación automatizada

Contrato y runtime CP042, contratos/runtimes CP041–CP050, `tsc`, `lint` y `build`: PASS. `test:inventory`: BLOQUEADA por workbook ausente.

final result: verified locally; remote preview and canonical inventory source pending
