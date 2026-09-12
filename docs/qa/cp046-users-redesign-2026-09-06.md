# CP-046 — Usuarios y permisos — QA

## Evidencia

- Ruta local validada en Brave: `/admin/usuarios` en desktop; la matriz mobile exacta queda pendiente por la limitación de viewport de esta sesión.
- Listado paginado, búsqueda/filtros, estado, último acceso, sync Clerk, invitaciones, cambios de rol/estado y matriz efectiva de permisos están conectados a datos reales y RBAC.
- Se comprobó la matriz por rol y la protección del último SUPERADMIN/autobloqueo; exportación y auditoría usan APIs existentes.

## Bloqueos

- El preview remoto `dev.coldpower.pe` no contiene la implementación local actual.
- El control global de inventario sigue bloqueado por ausencia del workbook canónico.

## Verificación automatizada

Contrato/runtime CP044, contratos/runtimes CP041–CP050, `tsc`, `lint` y `build`: PASS. `test:inventory`: BLOQUEADA por fuente canónica ausente.

final result: blocked
