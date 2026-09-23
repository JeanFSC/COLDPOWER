# Brief 10 — Clientes, CRM, Operaciones y Promociones (Codex)

Lee completos `AGENTS.md`, `docs/goal/GOAL-IMPECABLE.md`, `docs/goal/audits/clientes-crm-cotizaciones.md` (secciones Clientes y Pipeline/CRM), `docs/goal/audits/operaciones-promociones.md` y `docs/goal/usabilidad-escenarios.md` (B1, B2.1, C1, C8). Rama `codex/goal-impecable`.

Ya hechos (no rehacer): deep-links `opportunityId`/`taskId` del pipeline (P1), búsqueda (P4, C8), promociones P0 #1 y #2, enlaces comerciales del 360 si ya existen (verifica).

## Alcance — cierra todo lo pendiente de esas auditorías
- **Clientes**: C1 (dedupe de leads web por userId → documento → teléfono/email normalizados, dentro de la transacción), C2, C3 (fusión completa y sin cadenas), C4 (360 con enlaces, montos y códigos), C5 (retirar UI legacy `view=clientes`), C6, C7, C9.
- **CRM**: P2 (agenda única crm_tasks + opportunity_followups), P3 (fechas en hora Lima, sin corrimiento de +5 h), P5, P6 (enviar/aceptar/rechazar cotización actualiza oportunidad y etapa en la misma transacción), P7, P8, P9 (borrar código muerto; formularios al lenguaje del admin, sin "Guardado en Neon"), P10, P11.
- **Operaciones**: #1–#14 (reconciliación automática de work items al cerrar su fuente, resolver al completar la tarea en CRM, enlaces, sync fuera del render, rendimiento, permisos por equipo, error.tsx, tokens/tamaños, tests cp049).
- **Promociones**: #3 (precio con promoción visible igual en ficha, carrito y checkout con UNA función de precio compartida de solo lectura), #4 (aprobar/rechazar y preview en la UI), #5–#15.

## Límites (tareas paralelas)
Otra tarea trabaja en Catálogo/Taxonomía/Precios (`admin/catalogo`, `taxonomia`, `precios`, `catalog-admin-service`, `taxonomy-admin`, `pricing-repository`) y otra en la función de imagen de producto (`product-image.ts`, `ProductMedia`, `ProductGallery`, `CartPageView`, home): **no toques esos archivos**. Si la promoción necesita mostrarse en la ficha/carrito, hazlo en `TransactionBox`/servicio de carrito y reporta cualquier toque a archivos compartidos. `scripts/test-all.mjs`: solo agregar.

## Verificación
Sin commit. Tests con `--test-timeout=60000`, sin `*:runtime` ni servidores, aborta comandos > 3 min. Migraciones: genera, no apliques. Al final `tsc`, lint de tus archivos, `node scripts/test-all.mjs`. Reporta hallazgos cerrados por número, pendientes, archivos, migraciones y riesgos.
