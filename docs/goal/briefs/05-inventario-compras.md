# Brief 05 — Inventario y Compras (Codex)

Lee completos `docs/goal/GOAL-IMPECABLE.md`, `AGENTS.md`, `docs/goal/audits/inventario-compras.md` y `docs/goal/usabilidad-escenarios.md` (escenarios B3, B4, C7). Rama `codex/goal-impecable`.

## Trabajo en paralelo — límites de archivos
Otras tareas de Codex trabajan a la vez: diseño de tienda (`docs/goal/designs/tienda/`), bloque comercial (`OrdersControlCenter`, `PaymentsControlCenter`, `SalesControlCenter`, `QuotesWorkspace`, `sales-*`, `payment*`, `quote*`) y Gestión (reportes, notificaciones, auditoría, usuarios, configuración). **No toques esos archivos.** Si necesitas cambiar un archivo compartido (`src/lib/roles.ts`, `src/components/admin/AdminShell.tsx`, `src/app/admin/layout.tsx`, `src/lib/notifications-service.ts`), haz el cambio mínimo y repórtalo explícitamente. En `scripts/test-all.mjs` solo agrega líneas, no reordenes.

## Alcance
Cierra todos los hallazgos pendientes de la auditoría (Inventario #3–#18; Compras #3–#20; ya están hechos Inventario #1 y #2 y Compras #1 y #2). Prioridad:
1. Datos/dinero: Compras #6 idempotencia de recepción, #19, #3 moneda, #16; Inventario #6, #8.
2. Función: Inventario #3 listas paginadas, #7 expiración programada (reutiliza el cron `/api/internal/cron/…` existente con `CRON_SECRET`, nunca reservas de pedido), #13; Compras #4 (ALMACEN recibe), #5 permisos en UI, #7 recepción por líneas de OC, #10, #11.
3. Enlaces y filtros: Inventario #4 (`productId`, `critical=true`), #5, #14; Compras #9 (todo ID enlazado al módulo dueño, filtrado).
4. Estados y UI: Inventario #10, #11, #12 (≥ 11–12 px); Compras #8, #12, #13, #14, #18 — usando el lenguaje visual actual del admin (slate/blue-600) y sin paneles estirados sin contenido.
5. Rendimiento: Inventario #15, #16, #17; Compras #15.
6. Tests de comportamiento en `test:all` (Inventario #18, Compras #20).

Los cambios visuales son ajustes dentro del diseño vigente (no rediseño); si algo requiere rediseño, descríbelo en tu reporte.

## Verificación y reglas
Sin commit. Tests de a uno con `--test-timeout=60000`, sin `*:runtime` ni servidores, aborta comandos > 3 min. Si modificas el esquema, genera la migración con `corepack pnpm db:generate` pero **no** la apliques. Al final: `tsc --noEmit`, lint de tus archivos, `node scripts/test-all.mjs`. Reporta hallazgos cerrados por número, pendientes, archivos cambiados, migraciones y riesgos.
