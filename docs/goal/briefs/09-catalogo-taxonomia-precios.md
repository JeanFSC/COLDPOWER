# Brief 09 — Catálogo, Taxonomía y Precios (admin) — auditar y corregir (Codex)

Lee completos `AGENTS.md`, `docs/goal/GOAL-IMPECABLE.md` (§4, §5, §9) y `docs/goal/usabilidad-escenarios.md` (B2, B7.3, C8, C10). Rama `codex/goal-impecable`.

## Parte 1 — Auditoría (escribe `docs/goal/audits/catalogo-taxonomia-precios.md`, formato §5)
Módulos: `/admin/catalogo`, `/admin/catalogo/[id]`, `/admin/taxonomia`, `/admin/precios` (+ `api/admin/catalogo/**`, `taxonomia/**`, `precios/**`, `catalog-admin-service.ts`, `taxonomy-admin.ts`, `pricing-repository.ts`, `retail-price.ts`). Revisa con criterio de encargado de catálogo y gerencia: publicar/despublicar, **subida de foto de producto de punta a punta hasta la tienda** (`media-repository`, `/api/media/[id]`, `ProductMedia`), acciones masivas "aún no está disponible", precios (crear/editar/historial/aprobación) y cómo un precio RETAIL activo vuelve comprable un producto en la tienda, enlaces entre catálogo↔inventario↔precios↔promociones, permisos UI=API (`requireTaxonomyAccess` propio), estados, rendimiento, tests.

## Parte 2 — Corrección
Cierra P0/P1/P2 de tu auditoría. Reglas AGENTS.md del catálogo: SKU inmutable, jerarquía categoría→familia→producto, nunca inventar datos. Cambios visuales solo dentro del lenguaje actual del admin (slate/blue-600), sin paneles estirados sin contenido.

## Límites (tareas paralelas)
Otra tarea arregla la función de imagen de producto (`src/lib/product-image.ts`, `ProductMedia`, `ProductGallery`, `CartPageView`, home): **no toques esos archivos**; si necesitas la función, impórtala cuando exista o repórtalo. Otra tarea trabaja en CRM/Clientes/Operaciones/Promociones: no toques sus archivos. Cambios en archivos compartidos (`roles.ts`, `AdminShell.tsx`, `admin/layout.tsx`, `scripts/test-all.mjs`): mínimos, solo agregar, y reportados.

## Verificación
Sin commit. Tests con `--test-timeout=60000`, sin `*:runtime` ni servidores, aborta comandos > 3 min. Migraciones: genera, no apliques. Al final `tsc`, lint de tus archivos, `node scripts/test-all.mjs`. Reporta hallazgos cerrados, pendientes, archivos, migraciones y riesgos.
