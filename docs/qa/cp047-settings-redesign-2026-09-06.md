# CP-047 — Configuración — QA

## Evidencia

- Ruta local validada en Brave: `/admin/configuracion`, con formulario estructurado y responsive.
- La pantalla separa información empresarial, locales, operación, precios, integraciones, branding y políticas; no expone JSON crudo. Redes y enlaces legales usan filas controladas; dirty state, descartar y guardado respetan la persistencia.
- `locations` es la autoridad operativa: la pantalla lo muestra en solo lectura y enlaza a Inventario, evitando competir con el JSON legado de `company_settings`.

## Bloqueos

- No existe una fuente persistida de health check de integraciones ni CRUD completo de desactivación de locales para implementar esos estados con fidelidad; se muestran `N/D`.
- El remoto está desactualizado y el workbook canónico de inventario no está presente.

## Verificación automatizada

Contrato/runtime CP045, contratos/runtimes CP041–CP050, `tsc`, `lint` y `build`: PASS. `test:inventory`: BLOQUEADA por workbook ausente.

final result: blocked
