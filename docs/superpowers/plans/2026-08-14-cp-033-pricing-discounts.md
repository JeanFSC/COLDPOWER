# CP-033 — Precios y descuentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar un módulo administrativo de precios y descuentos real, paginado, filtrable, auditable y seguro por rol sin rediseñar la UI existente.

**Architecture:** Centralizar contratos y filtros en `pricing-contract.ts`, concentrar lecturas y métricas en `pricing-repository.ts` y mutaciones en un servicio transaccional. Las rutas sólo autentican, validan el request y adaptan respuestas HTTP; la página conserva sus componentes visuales y los conecta a datos paginados.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, PostgreSQL/Neon, Clerk/RBAC existente, Node test runner y `tsx`.

## Global Constraints

- No eliminar ni rediseñar cards, tabla, botones o rutas existentes.
- Mantener `pricing.view`, `pricing.edit`, `pricing.cost.view` y agregar/usar `pricing.discount.manage` sólo para roles de gestión.
- No exponer COST, margen ni datos equivalentes a roles sin permiso.
- Una referencia sin precio devuelve `price: null`; no se inventan valores.
- Historial y auditoría son append-only; archivado significa desactivar.
- Todas las listas usan `{ items, page, pageSize, totalItems, totalPages }`.

### Task 1: Contratos y permisos

**Files:** create `src/lib/pricing-contract.ts`, modify `src/lib/roles.ts`, test `scripts/cp033-pricing.test.ts`.

- [ ] Escribir pruebas de filtros, estados, rangos y matriz de permisos.
- [ ] Ejecutarlas en rojo.
- [ ] Implementar parser y permiso de descuentos.
- [ ] Ejecutar pruebas en verde.

### Task 2: Listado paginado y métricas

**Files:** modify `src/lib/pricing-repository.ts`, `src/app/api/admin/precios/route.ts`, `src/app/admin/precios/page.tsx`.

- [ ] Probar contrato de respuesta y presencia de productos sin precio.
- [ ] Implementar consultas filtradas, métricas globales y facetas.
- [ ] Mantener aliases antiguos donde la UI actual los necesite.

### Task 3: Mutaciones e historial

**Files:** create `src/lib/pricing-service.ts`, modify price routes and repository.

- [ ] Probar creación, actualización, solapamientos, idempotencia y archivado.
- [ ] Implementar transacciones con historial y auditoría.
- [ ] Proteger COST antes de insertar o serializar.

### Task 4: Descuentos y exportación

**Files:** modify `src/app/api/admin/descuentos/route.ts`, create `src/app/api/admin/precios/export/route.ts`, `src/lib/pricing-export.ts`.

- [ ] Probar CRUD de reglas, vigencia, límites, RBAC y CSV filtrado.
- [ ] Implementar cambios de estado idempotentes y auditoría de exportación.

### Task 5: Historial y conexión no visual

**Files:** modify `src/app/api/admin/precios/historial/route.ts`, `src/components/admin/PricingOperations.tsx`, `src/components/admin/AdminCategoryViews.tsx` only for data/handlers, and `src/app/admin/precios/page.tsx`.

- [ ] Probar filtros de historial y navegación de páginas.
- [ ] Conectar controles existentes a URLs/acciones reales sin cambiar clases ni estructura visual.

### Task 6: Migración y QA

**Files:** schema/indexes, migration, docs and package scripts.

- [ ] Agregar índices aditivos para precio/historial/filtros.
- [ ] Ejecutar CP-033, CP-030, TypeScript, lint y build.
- [ ] Ejecutar smoke runtime contra `.env.local` sin imprimir secretos.
