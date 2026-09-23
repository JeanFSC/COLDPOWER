# Brief 06 — Gestión: Reportes, Notificaciones, Auditoría, Usuarios, Configuración (Codex)

Lee completos `docs/goal/GOAL-IMPECABLE.md`, `AGENTS.md`, `docs/goal/audits/gestion.md` y `docs/goal/usabilidad-escenarios.md` (escenarios B2, B6, B7). Rama `codex/goal-impecable`.

## Trabajo en paralelo — límites de archivos
Otras tareas de Codex trabajan a la vez: diseño de tienda, bloque comercial (`OrdersControlCenter`, `PaymentsControlCenter`, `SalesControlCenter`, `QuotesWorkspace`, `sales-*`, `payment*`, `quote*`) e Inventario/Compras (`inventory*`, `Inventory*`, `purchases*`, `Purchase*`, `admin/compras`, `admin/inventario`). **No toques esos archivos.** En notificaciones (N1) los deep-links de pedidos/pagos/cotizaciones ya se hicieron en el bloque comercial: solo completa los que falten fuera de esos archivos, o repórtalos. Cambios en archivos compartidos (`roles.ts`, `AdminShell.tsx`, `admin/layout.tsx`): mínimos y reportados. En `scripts/test-all.mjs` solo agrega líneas.

## Alcance
Ya hechos: A1, U1, R2/A5/U6 (menú por permisos), error.tsx de los cinco módulos. Cierra el resto:
1. Seguridad: A2 (sanitizar al leer; verifica lo ya hecho), A3, A7 (CSV sin inyección de fórmulas en auditoría y usuarios), N6, U2, U3 (confirmación con impacto antes de cambiar rol/estado), U4, U5.
2. Función: R1 (runner real de reportes programados: ruta cron protegida con `CRON_SECRET` que ejecuta los vencidos con `FOR UPDATE`, registra la corrida, notifica y avanza `nextRunAt`), N2 (destinatarios por permiso), N3 (preferencias respetadas + UI), N4, N5 (procesamiento fuera del render), N7, C1 (auditar series), C3 (UI de historial con diff y restaurar con confirmación), C4, C5, U8, R5.
3. Enlaces: R3, A4, U7, C2 (decide: conectar series a la numeración o rotular "sin uso" honestamente; documenta la decisión).
4. Rendimiento y UI: A6, C6, R7, C7, C8, A8, R6, U9 — dentro del lenguaje visual actual del admin, sin paneles estirados sin contenido.
5. Tests de comportamiento en `test:all` (R8 y cp042–cp046).

## Verificación y reglas
Sin commit. Tests de a uno con `--test-timeout=60000`, sin `*:runtime` ni servidores, aborta comandos > 3 min. Migraciones: genera con `db:generate`, **no** apliques. Al final: `tsc --noEmit`, lint de tus archivos, `node scripts/test-all.mjs`. Reporta hallazgos cerrados por número, pendientes, archivos, migraciones y riesgos.
