# Plan: CP-025 — estabilización del núcleo ColdPower + gobierno de catálogo + inventario

> **Para el agente que ejecuta:** usar `test-driven-development`, `verification-before-completion` y mantener `.env.local` fuera de cualquier salida o commit.

**Objetivo:** convertir el catálogo importado en una base editorial pública controlada y dejar una fundación de inventario honesta, auditable y lista para datos reales, sin repetir la migración de los 1,348 productos.

**Restricciones:** conservar cambios previos del worktree; no resetear, borrar ni commitear/pushear sin autorización; no inventar stock, ubicación, precio o datos comerciales; usar Neon como fuente de verdad.

## Tareas exactas

### 1. Línea base, diseño y respaldo

- Verificar `AGENTS.md`, migraciones, pruebas, estado de Neon y que existan exactamente 1,348 SKU únicos.
- Guardar diseño en `docs/superpowers/specs/2026-08-11-cp-025-core-governance-inventory-design.md`.
- Crear `scripts/backup-database.ts` y `db:backup`; probar formato, ausencia de secretos y conteos; ejecutar antes de migrar.
- Registrar rollback y evidencia en `docs/migrations/` sin exponer `DATABASE_URL`.

### 2. Gobierno editorial y disponibilidad

- Escribir primero pruebas de estados, bloqueos y regresión de `CP-REF-OTR-0435`.
- Agregar enums/campos Drizzle para publicación, descripción editorial, actor/fecha/nota y disponibilidad `unknown/in_stock/low_stock/out_of_stock/on_request`.
- Implementar servicio de publicación con roles y bloqueos; registrar auditoría; impedir borrado físico.
- Ajustar repositorios, APIs públicas, homepage, PDP, búsqueda, recomendaciones y sitemap para filtrar publicaciones válidas.
- Cambiar el modelo visual a `unknown`/`Consultar disponibilidad`; no inferir `Bajo pedido` desde ausencia de stock.

### 3. Panel administrativo de catálogo

- Probar filtros por SKU, nombre, categoría, familia, marca, publicación, revisión, duplicado, confianza y origen.
- Implementar colas Published/Drafts/Review/Hidden/Possible duplicates y acciones autorizadas.
- Implementar vista de duplicados lado a lado con decisión pendiente/diferente/confirmada/conservar ambos y campos de preparación canónica.
- Verificar que no haya eliminación física y que cada decisión tenga auditoría.

### 4. Configuración empresarial y RBAC

- Crear configuración centralizada nullable y retirar valores fake visibles; ocultar campos faltantes.
- Ampliar roles a `SUPERADMIN`, `JEFATURA`, `VENTAS`, `ALMACEN`, `COMPRAS`, `REPORTES` manteniendo compatibilidad interna donde sea necesario.
- Probar permisos: publicación editorial solo autorizados; ventas no ajusta stock; almacén opera inventario; reportes solo lectura.

### 5. Cotizaciones y auditoría

- Añadir regresiones E2E para producto/carro/formulario/POST/quote_items/snapshots/tracking, múltiples productos, cotización sin producto, validación, rate limit y fallo de DB sin falso éxito.
- Mantener la transacción existente; agregar auditoría de cambios administrativos relevantes.

### 6. Fundación de inventario

- Escribir pruebas de invariantes antes de implementar servicios.
- Crear ubicaciones sin inventar nombres/direcciones, balances únicos, movimientos/kardex, lotes de importación, transferencias y reservas.
- Implementar ajustes, reservas/liberación/consumo y recepción de transferencias de forma transaccional y segura ante concurrencia.
- Crear parser/reporte `import:stock --file ... --dry-run/--apply`; exigir SKU exacto y ubicación/cantidad real; no aplicar con el archivo actual porque no contiene esos datos.
- Agregar UI administrativa mínima y auditoría de operaciones.

### 7. Migración y verificación

- Generar migración Drizzle, inspeccionarla y aplicar solo después del respaldo.
- Ejecutar `test:all`, typecheck, lint, build, pruebas CP-025, QA de datos, rutas, responsive, consola y reinicio completo contra Neon.
- Verificar conteos editoriales, exclusión de `CP-REF-OTR-0435`, persistencia de cotizaciones, integridad taxonomy y ausencia de valores fake.
- Documentar archivos, riesgos, rollback, pendientes comerciales y siguiente ticket.

## Comandos de aceptación

```powershell
corepack pnpm db:backup
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm test:cp025
corepack pnpm test:all
corepack pnpm qa:inventory-db
corepack pnpm qa:inventory-data
```

No se marca terminado hasta que todos los comandos aplicables tengan salida fresca y se revise visualmente el catálogo/panel en localhost.
