# Runbook: migración e importación del catálogo persistente

Este procedimiento aplica el esquema reproducible, importa las 1,348 filas de `IMPORT_PRODUCTOS` y valida el resultado en PostgreSQL/Neon. No usa Excel en runtime ni usa `db:push`.

## Precondiciones

- `DATABASE_URL` apunta a la base PostgreSQL/Neon de ColdPower correcta.
- El archivo de origen es `../INVENTARIO CATALOGO/ColdPower_Inventario_Final_Validado.xlsx`.
- No se han cambiado ni reordenado las hojas de auditoría; solo se importa `IMPORT_PRODUCTOS`.

## Ejecución

```bash
corepack pnpm test:inventory
corepack pnpm db:migrate
corepack pnpm import:inventory -- "..\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx"
corepack pnpm import:inventory --apply -- "..\INVENTARIO CATALOGO\ColdPower_Inventario_Final_Validado.xlsx"
corepack pnpm qa:inventory-db
```

La primera ejecución sin `--apply` valida la forma, conteo y SKU del Excel sin escribir. La ejecución con `--apply` debe informar 1,348 filas leídas y cero errores. El QA valida conteo, SKU único, dimensiones y categorías requeridas.

## Slugs canónicos

Los nuevos productos usan `nombre_normalizado` como slug canónico. Solo los 12 grupos de colisión del libro requieren un sufijo estable basado en SKU.

Si la base fue importada con una versión anterior que añadía el SKU a todos los slugs, ejecuta primero el modo de revisión y después la aplicación:

```bash
corepack pnpm db:rebuild-product-slugs
corepack pnpm db:rebuild-product-slugs --apply
```

La operación es transaccional: reserva slugs temporales para no violar la restricción única, aplica los slugs nuevos y actualiza `quotes.product_slug` cuando corresponda. El reporte queda en `tmp/product-slug-rebuild-latest.json`.

## Idempotencia y reinicio

1. Ejecuta por segunda vez el mismo comando `import:inventory --apply`.
2. Confirma que `inserted` sea `0`, que `updated` refleje los SKU existentes y que no haya errores.
3. Ejecuta `corepack pnpm qa:inventory-db` nuevamente.
4. Reinicia la aplicación (`corepack pnpm start` en un build actualizado) y repite el QA y las comprobaciones HTTP de catálogo, búsqueda, categorías, ficha y cotización.

Los reportes locales quedan en `tmp/inventory-import-latest.json`, `tmp/product-slug-rebuild-latest.json` y `tmp/inventory-qa-latest.json`; son evidencia operativa, no credenciales.

## Rollback

Las migraciones son aditivas y no eliminan tablas existentes. Antes de aplicar a un entorno con datos reales, toma un backup lógico de PostgreSQL. La reconstrucción de slugs se revierte íntegramente si falla dentro de la transacción. Para volver al catálogo provisional solo en desarrollo, restaura los archivos archivados en `docs/migrations/legacy-backup/2026-08-11/` y revierte el despliegue de la aplicación; nunca se deben borrar productos persistentes para esa reversión sin una copia de seguridad y una decisión explícita.

El catálogo legacy archivado no puede volver a ser una fuente runtime mientras el catálogo persistente esté activo.
